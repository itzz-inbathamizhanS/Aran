"""aran_cloud/fw_core.py: the pure parts of the firewall-as-a-service proxy.

No database, no web framework and no import of main. Cloud's proxy (faas.py) uses these helpers now,
and a self-hosted data plane can use the same ones later. Everything here works on text and bytes.

- parse_body / parse_path / parse_query turn a request into "units" (label + string value) and know how to
  put cleaned values back (a Body has .units and .rebuild(values)).
- clean_units sends the units through a protect function in as few calls as possible.
- mask_text is the plain regex masker used when the core cannot be reached.
- check_upstream_url is the SSRF guard (used when a route is saved and again on every call).
"""

import ipaddress
import json
import os
import re
import socket
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit

MAX_BODY_BYTES = 1024 * 1024            # a proxied request body may be 1 MB
FIELD_SEP = "\n␞\n"                # joins several values into one core call
MAX_JOIN_CHARS = 15000                  # the core accepts 20,000 characters per call
MAX_JSON_DEPTH = 40

# headers a proxy must not pass on, plus the ones Aran sets itself
HOP_BY_HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer",
              "transfer-encoding", "upgrade", "host", "content-length", "x-api-key", "accept-encoding"}
# headers kept when a body is queued for a later retry
QUEUE_HEADERS = {"content-type", "accept", "authorization"}

# addresses that are never a valid upstream, even for the local demo
ALWAYS_BLOCKED = {ipaddress.ip_address("169.254.169.254"), ipaddress.ip_address("fd00:ec2::254")}


class BodyError(ValueError):
    """The body cannot be read as its content type says (bad JSON, not UTF-8, too deep)."""


class UpstreamBlocked(ValueError):
    """The upstream URL is not allowed (the message says why, and never echoes a secret)."""


# ---------------------------------------------------------------- units
def label_of(name: str) -> str:
    """A field's name goes in front of its value as context for the detector; odd names become 'field'."""
    return name if re.fullmatch(r"[A-Za-z][A-Za-z0-9_ -]{0,40}", name or "") else ("field" if name else "")


class Body:
    """A request part read as units: .units is [(label, value)], .rebuild(values) gives the part back with
    each value replaced (same order, same length)."""

    def __init__(self, units: List[Tuple[str, str]], rebuild: Callable[[List[str]], Any]):
        self.units = units
        self.rebuild = rebuild


def _walk_json(holder: list, label0: str = "") -> Tuple[List[Tuple[str, str]], List[Tuple[Any, Any]]]:
    """Every string leaf of the JSON value in holder[0] (keys are left alone). Returns the units and where each
    one lives, so a cleaned value can be written back in place."""
    units: List[Tuple[str, str]] = []
    slots: List[Tuple[Any, Any]] = []
    stack = [(holder, 0, label0, 0)]
    # depth-first, in document order, without recursion
    while stack:
        parent, key, label, depth = stack.pop()
        node = parent[key]
        if depth > MAX_JSON_DEPTH:
            raise BodyError("JSON is nested too deeply")
        if isinstance(node, str):
            units.append((label_of(label), node))
            slots.append((parent, key))
        elif isinstance(node, dict):
            for k in reversed(list(node.keys())):
                stack.append((node, k, str(k), depth + 1))
        elif isinstance(node, list):
            for i in reversed(range(len(node))):
                stack.append((node, i, label, depth + 1))
    return units, slots


def _json_body(raw: str) -> Body:
    try:
        holder = [json.loads(raw)]
    except ValueError:
        raise BodyError("body is not valid JSON")
    except RecursionError:              # thousands of [ or { : refuse it instead of failing with a 500
        raise BodyError("JSON is nested too deeply")
    units, slots = _walk_json(holder)

    def rebuild(values: List[str]) -> str:
        for (parent, key), v in zip(slots, values):
            parent[key] = v
        return json.dumps(holder[0], ensure_ascii=False, separators=(",", ":"))
    return Body(units, rebuild)


def _ndjson_body(raw: str) -> Body:
    lines = raw.split("\n")
    parts: List[Tuple[str, Any]] = []    # ("json", (obj, slots, n)) | ("text", None) | ("blank", None)
    units: List[Tuple[str, str]] = []
    for ln in lines:
        if not ln.strip():
            parts.append(("blank", None))
            continue
        try:
            try:
                holder = [json.loads(ln)]
            except RecursionError:
                raise BodyError("JSON is nested too deeply")
            u, slots = _walk_json(holder)
            parts.append(("json", (holder, slots, len(u))))
            units.extend(u)
        except (ValueError, BodyError):
            parts.append(("text", None))
            units.append(("", ln))

    def rebuild(values: List[str]) -> str:
        out, pos = [], 0
        for (kind, info), ln in zip(parts, lines):
            if kind == "blank":
                out.append(ln)
            elif kind == "text":
                out.append(values[pos])
                pos += 1
            else:
                holder, slots, n = info
                for (parent, key), v in zip(slots, values[pos:pos + n]):
                    parent[key] = v
                pos += n
                out.append(json.dumps(holder[0], ensure_ascii=False, separators=(",", ":")))
        return "\n".join(out)
    return Body(units, rebuild)


def _form_body(raw: str) -> Body:
    pairs = parse_qsl(raw, keep_blank_values=True, encoding="utf-8", errors="strict")
    units = [(label_of(k), v) for k, v in pairs]

    def rebuild(values: List[str]) -> str:
        return urlencode([(k, v) for (k, _), v in zip(pairs, values)], quote_via=quote)
    return Body(units, rebuild)


def _text_body(raw: str) -> Body:
    return Body([("", raw)], lambda values: values[0])


def parse_body(content_type: str, raw: bytes) -> Optional[Body]:
    """The body as units, or None when the content type is not one we can clean (binary and the like).
    An empty body is a Body with no units. Raises BodyError for a body that does not match its type."""
    if not raw:
        return Body([], lambda values: b"")
    ct = (content_type or "").split(";")[0].strip().lower()
    kind = None
    if ct == "application/json" or ct.endswith("+json"):
        kind = _json_body
    elif ct in ("application/x-ndjson", "application/ndjson", "application/jsonl"):
        kind = _ndjson_body
    elif ct == "application/x-www-form-urlencoded":
        kind = _form_body
    elif ct.startswith("text/"):
        kind = _text_body
    if kind is None:
        return None
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise BodyError("body is not valid UTF-8")
    body = kind(text)
    inner = body.rebuild
    return Body(body.units, lambda values: inner(values).encode("utf-8"))


def parse_path(path: str) -> Body:
    """The path segments of a request (already percent-decoded by the web server) as units."""
    segs = path.split("/") if path else []
    return Body([("", s) for s in segs], lambda values: "/".join(quote(v, safe="@:.-_~") for v in values))


def parse_query(query: str) -> Body:
    """The values of a query string as units (names are left alone)."""
    pairs = parse_qsl(query or "", keep_blank_values=True)
    units = [(label_of(k), v) for k, v in pairs]
    return Body(units, lambda values: urlencode([(k, v) for (k, _), v in zip(pairs, values)], quote_via=quote))


# ---------------------------------------------------------------- cleaning
class CleanOut:
    def __init__(self, n: int):
        self.values: List[str] = [""] * n
        self.unit_findings: List[list] = [[] for _ in range(n)]   # per unit, offsets relative to the value
        self.findings: list = []                                  # every finding the core returned
        self.protected = 0
        self.unprotected = 0
        self.ignored = 0
        self.by_type: Dict[str, int] = {}
        self.latency_ms = 0.0
        self.core_calls = 0


def _split_value(value: str, limit: int) -> List[str]:
    """Cut a long value at whitespace so each piece fits one core call."""
    if len(value) <= limit:
        return [value]
    out, i = [], 0
    while i < len(value):
        j = min(len(value), i + limit)
        if j < len(value):
            k = max(value.rfind("\n", i, j), value.rfind(" ", i, j))
            if k > i:
                j = k + 1
        out.append(value[i:j])
        i = j
    return out


def clean_units(units: List[Tuple[str, str]], protect_fn: Callable[[str], dict],
                mapper: Callable = map, max_chars: int = MAX_JOIN_CHARS,
                postprocess: Optional[Callable[[str, str, list], str]] = None) -> CleanOut:
    """Cleans every unit with protect_fn(text) -> {"after", "findings", "protected", "unprotected", "ignored",
    "by_type", "latency_ms"}. Units are joined into as few calls as fit; if a joined answer does not split back
    cleanly each piece gets its own call. mapper lets the caller run the calls in parallel.
    postprocess(original, cleaned, findings) -> text is the hook a policy plugs into. It runs once per piece
    (a value is one piece unless it is very long); finding offsets are relative to that piece's original text."""
    out = CleanOut(len(units))
    pieces: List[Tuple[int, str, str]] = []            # (unit index, label, value piece)
    pieces_of: Dict[int, List[int]] = {}
    for i, (label, value) in enumerate(units):
        if not value or not value.strip():
            out.values[i] = value
            continue
        room = max(500, max_chars - len(label) - 8)
        for chunk in _split_value(value, room):
            pieces_of.setdefault(i, []).append(len(pieces))
            pieces.append((i, label, chunk))

    groups: List[List[int]] = []
    cur: List[int] = []
    size = 0
    for pi, (_, label, v) in enumerate(pieces):
        if FIELD_SEP in v or FIELD_SEP in label:
            groups.append([pi])
            continue
        n = len(v) + len(label) + 8
        if cur and size + n > max_chars:
            groups.append(cur)
            cur, size = [], 0
        cur.append(pi)
        size += n
    if cur:
        groups.append(cur)

    def pre(pi: int) -> str:
        label = pieces[pi][1]
        return f"{label}: " if label else ""

    def one(pi: int):
        text = pre(pi) + pieces[pi][2]
        r = protect_fn(text)
        after = r.get("after", "")
        p = pre(pi)
        val = after[len(p):] if p and after.startswith(p) else after
        fnd = []
        for f in r.get("findings", []):
            g = dict(f)
            if g.get("start") is not None:          # offsets are relative to the value, without the label prefix
                g["start"] = max(0, g["start"] - len(p))
                g["end"] = max(g["start"], (g.get("end") or g["start"]) - len(p))
            fnd.append(g)
        return [(pi, val, fnd, len(p))], r

    def run(group: List[int]):
        if len(group) == 1:
            return [one(group[0])]
        prefixes = [pre(pi) for pi in group]
        text = FIELD_SEP.join(p + pieces[pi][2] for p, pi in zip(prefixes, group))
        r = protect_fn(text)
        parts = r.get("after", "").split(FIELD_SEP)
        if len(parts) != len(group) or not all(pt.startswith(p) for pt, p in zip(parts, prefixes)):
            return [one(pi) for pi in group]      # do not guess: one call per piece
        res, start = [], 0
        spans = []
        for p, pi in zip(prefixes, group):
            spans.append((start, start + len(p) + len(pieces[pi][2])))
            start += len(p) + len(pieces[pi][2]) + len(FIELD_SEP)
        fnd = r.get("findings", [])
        for (pi, p, part, (lo, hi)) in zip(group, prefixes, parts, spans):
            mine = [f for f in fnd if f.get("start") is not None and lo <= f["start"] < hi]
            shifted = []
            for f in mine:
                g = dict(f)
                g["start"] = max(0, f["start"] - lo - len(p))
                g["end"] = max(g["start"], (f.get("end") or f["start"]) - lo - len(p))
                shifted.append(g)
            res.append((pi, part[len(p):], shifted, len(p)))
        return [(res, r)]

    piece_val: Dict[int, str] = {}
    piece_fnd: Dict[int, list] = {}
    for answers in mapper(run, groups):
        for res, r in answers:
            out.core_calls += 1
            out.protected += int(r.get("protected", 0))
            out.unprotected += int(r.get("unprotected", 0))
            out.ignored += int(r.get("ignored", 0))
            out.latency_ms += float(r.get("latency_ms") or 0)
            for k, n in (r.get("by_type") or {}).items():
                out.by_type[k] = out.by_type.get(k, 0) + n
            out.findings.extend(r.get("findings", []))
            for pi, val, fnd, _ in res:
                if postprocess:
                    val = postprocess(pieces[pi][2], val, fnd)
                piece_val[pi] = val
                piece_fnd[pi] = fnd

    for i, idxs in pieces_of.items():
        out.values[i] = "".join(piece_val.get(pi, pieces[pi][2]) for pi in idxs)
        for pi in idxs:
            out.unit_findings[i].extend(piece_fnd.get(pi, []))
    out.latency_ms = round(out.latency_ms, 2)
    return out


# ---------------------------------------------------------------- policies (pure rule matching and applying)
# the finding types the core reports; "*" matches any type
KNOWN_TYPES = ("AADHAAR", "CARD", "MOBILE", "PAN", "UPI")
ACTIONS = ("tokenise", "mask", "block", "allow", "alert")
DEFAULT_ACTION = "tokenise"
MAX_RULES = 50


def normalize_rules(rules: Any) -> List[Dict[str, str]]:
    """Checks a rule list ([{"type", "action"}], first match wins) and returns it cleaned. Raises ValueError."""
    if not isinstance(rules, list):
        raise ValueError("rules must be a list")
    if len(rules) > MAX_RULES:
        raise ValueError(f"at most {MAX_RULES} rules")
    out = []
    for i, r in enumerate(rules):
        if not isinstance(r, dict):
            raise ValueError(f"rule {i + 1} must be an object with 'type' and 'action'")
        t = str(r.get("type", "")).strip().upper()
        a = str(r.get("action", "")).strip().lower()
        if t != "*" and t not in KNOWN_TYPES:
            raise ValueError(f"rule {i + 1}: type must be one of {list(KNOWN_TYPES)} or '*'")
        if a not in ACTIONS:
            raise ValueError(f"rule {i + 1}: action must be one of {list(ACTIONS)}")
        out.append({"type": t, "action": a})
    return out


def action_for(rules: Optional[List[Dict[str, str]]], ftype: str) -> str:
    """The action of the first rule that matches this finding type (tokenise when none does)."""
    for r in rules or []:
        if r["type"] == "*" or r["type"] == ftype:
            return r["action"]
    return DEFAULT_ACTION


def mask_span(s: str) -> str:
    """Keep the last 4 letters or digits and hide the rest (separators stay): 6510 0737 -> XXXX 0737."""
    keep = 4
    n = sum(1 for c in s if c.isalnum())
    seen = 0
    out = []
    for c in s:
        if c.isalnum():
            seen += 1
            out.append(c if seen > n - keep else "X")
        else:
            out.append(c)
    return "".join(out)


def apply_policy(original: str, findings: list, rules: Optional[List[Dict[str, str]]]) -> Tuple[str, List[dict]]:
    """Rebuilds `original` with each protected finding handled by its rule. findings carry start, end, type, token
    (offsets are relative to `original`). Returns (text, decisions); a decision is {type, action, start, end}.
    tokenise and alert put the core's token in; mask keeps the last 4; allow leaves the original; block puts the
    token in too (the caller refuses the request, so the text is never forwarded). Findings the core did not protect
    are left alone. Nothing here stores or logs a value."""
    spans = []
    for f in findings or []:
        a, b = f.get("start"), f.get("end")
        if not f.get("protected") or a is None or b is None or not (0 <= a < b <= len(original)):
            continue
        spans.append((a, b, f))
    spans.sort(key=lambda x: x[0])
    out, pos, decisions = [], 0, []
    for a, b, f in spans:
        if a < pos:                                   # overlapping span: skip
            continue
        action = action_for(rules, f.get("type", ""))
        token = f.get("token")
        if action == "allow":
            rep = original[a:b]
        elif action == "mask" or not token:
            rep = mask_span(original[a:b])
        else:
            rep = token
        out.append(original[pos:a])
        out.append(rep)
        pos = b
        decisions.append({"type": f.get("type", ""), "action": action, "start": a, "end": b})
    out.append(original[pos:])
    return "".join(out), decisions


# ---------------------------------------------------------------- the plain masker (core unreachable)
_PAN = re.compile(r"\b[A-Za-z]{5}\d{4}[A-Za-z]\b")
_UPI = re.compile(r"\b[A-Za-z0-9._\-]{2,64}@[A-Za-z][A-Za-z0-9.\-]{1,30}\b")
_DIGITS = re.compile(r"(?<![\dA-Za-z])\d(?:[ \-]?\d){7,18}(?![\dA-Za-z])")


def mask_text(s: str) -> str:
    """Keep the last 4 digits of any identifier-shaped run: 5010 0234 5678 90 -> XXXXXXXXXX7890.
    Email and UPI ids keep only their domain; a PAN keeps its last 4 characters. Not detection, just a safe mask."""
    if not isinstance(s, str) or not s:
        return s
    s = _UPI.sub(lambda m: "XXXXXX@" + m.group(0).split("@", 1)[1], s)
    s = _PAN.sub(lambda m: "XXXXXX" + m.group(0)[-4:], s)

    def digits(m):
        d = re.sub(r"\D", "", m.group(0))
        return "X" * (len(d) - 4) + d[-4:]
    return _DIGITS.sub(digits, s)


# ---------------------------------------------------------------- SSRF guard
def _unmap(ip):
    return ip.ipv4_mapped if getattr(ip, "ipv4_mapped", None) else ip


def resolve_host(host: str) -> List[Any]:
    """All addresses a host name resolves to (an IP literal resolves to itself)."""
    try:
        return [_unmap(ipaddress.ip_address(host))]
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise UpstreamBlocked(f"cannot resolve host '{host}'")
    ips = []
    for info in infos:
        ip = _unmap(ipaddress.ip_address(info[4][0].split("%")[0]))
        if ip not in ips:
            ips.append(ip)
    if not ips:
        raise UpstreamBlocked(f"cannot resolve host '{host}'")
    return ips


def check_upstream_url(url: str, allow_private: bool = False, own: Iterable[Tuple[str, int]] = (),
                       own_ports: Iterable[int] = ()) -> List[str]:
    """Raises UpstreamBlocked unless url is a safe place to send traffic. Returns the addresses it resolved to.
    Always refused: other schemes than http/https, a user:password in the URL, the cloud metadata address,
    link-local, multicast, reserved and unspecified addresses, and Aran's own services (own = [(host, port)],
    own_ports = ports that Aran listens on, refused for any private or loopback address).
    Private and loopback addresses are refused unless allow_private is set (the local demo)."""
    try:
        u = urlsplit(url)
        port = u.port
    except ValueError:
        raise UpstreamBlocked("the URL is not valid")
    if u.scheme not in ("http", "https"):
        raise UpstreamBlocked("only http and https upstreams are allowed")
    host = (u.hostname or "").strip().lower()
    if not host:
        raise UpstreamBlocked("the URL has no host")
    if u.username or u.password:
        raise UpstreamBlocked("the URL must not contain a user name or password")
    if u.query or u.fragment:
        raise UpstreamBlocked("the upstream URL must not have a query string or fragment")
    port = port or (443 if u.scheme == "https" else 80)
    ips = resolve_host(host)
    own_set = {(h.lower(), int(p)) for h, p in own}
    for ip in ips:
        if ip in ALWAYS_BLOCKED:
            raise UpstreamBlocked("that address is a cloud metadata service and is never allowed")
        if ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            raise UpstreamBlocked(f"{ip} is not a routable address")
        private = ip.is_loopback or ip.is_private or not ip.is_global
        if (host, port) in own_set:
            raise UpstreamBlocked("that is one of Aran's own services")
        if private:
            if not allow_private:
                raise UpstreamBlocked(f"{ip} is a private or loopback address")
            if port in set(own_ports):
                raise UpstreamBlocked(f"port {port} is used by Aran itself")
    return [str(i) for i in ips]


# ---------------------------------------------------------------- pinned connections (DNS rebinding)
def pinned_request(method: str, url: str, ip: str, **kw):
    """requests.request(method, url, **kw), but the TCP connection goes to `ip`, the address check_upstream_url
    just approved, instead of resolving the name again (a DNS answer that changes between the check and the
    connection must not reach an internal address). The Host header, TLS SNI and certificate check still use the
    name in the URL. Proxy settings and .netrc from the environment are ignored for the same reason."""
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.connection import HTTPConnection, HTTPSConnection
    from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool

    def pin(base):
        class Pinned(base):
            def _new_conn(self):
                self._dns_host = ip          # connect here; self.host (the name) stays for Host, SNI and the cert
                return super()._new_conn()
        return Pinned

    class Adapter(HTTPAdapter):
        def init_poolmanager(self, *a, **k):
            super().init_poolmanager(*a, **k)
            self.poolmanager.pool_classes_by_scheme = {
                "http": type("PinnedPool", (HTTPConnectionPool,), {"ConnectionCls": pin(HTTPConnection)}),
                "https": type("PinnedTLSPool", (HTTPSConnectionPool,), {"ConnectionCls": pin(HTTPSConnection)}),
            }

    s = requests.Session()
    s.trust_env = False
    s.mount("http://", Adapter())
    s.mount("https://", Adapter())
    try:
        return s.request(method, url, **kw)
    finally:
        if not kw.get("stream"):
            s.close()


# ---------------------------------------------------------------- headers
def forward_headers(headers: Dict[str, str]) -> Dict[str, str]:
    """The request headers to send upstream: everything but hop-by-hop headers, the Aran key and Aran's own."""
    # headers named in Connection are hop-by-hop too (RFC 9110 7.6.1)
    listed = set()
    for k, v in headers.items():
        if k.lower() == "connection":
            listed |= {t.strip().lower() for t in v.split(",") if t.strip()}
    out = {}
    for k, v in headers.items():
        lk = k.lower()
        if lk in HOP_BY_HOP or lk in listed or lk == "proxy-connection" or lk.startswith("x-aran-"):
            continue
        out[k] = v
    return out


def queue_headers(headers: Dict[str, str]) -> Dict[str, str]:
    """The few headers worth keeping with a queued body. Headers are not cleaned by the core, so the values of
    custom x- headers are masked before they are stored (an identifier in a header must not land in the outbox)."""
    out = {}
    for k, v in headers.items():
        lk = k.lower()
        if lk in QUEUE_HEADERS:
            out[k] = v
        elif lk.startswith("x-") and not lk.startswith("x-aran-") and lk not in ("x-api-key", "x-client-cert-fingerprint"):
            out[k] = mask_text(v)
    return out


def safe_path(path: str) -> bool:
    """False for a path that tries to climb out of the upstream's base path."""
    segs = unquote(path).replace("\\", "/").split("/")
    return ".." not in segs and "\x00" not in path


# ---------------------------------------------------------------- cleaning a whole request
class CleanResult:
    """The outcome of cleaning one request: protected path, query and body, plus the counts."""

    def __init__(self):
        self.path = ""
        self.query = ""
        self.body: bytes = b""
        self.protected = 0
        self.unprotected = 0
        self.ignored = 0
        self.by_type: Dict[str, int] = {}
        self.findings: list = []
        self.latency_ms = 0.0
        self.supported = True       # False for a content type that cannot be cleaned
        self.actions: Dict[str, int] = {}     # policy decisions: action -> findings handled that way
        self.block_types: List[str] = []      # finding types whose rule is "block"
        self.alert_types: List[str] = []      # finding types whose rule is "alert"


class CleanFailed(Exception):
    """The core could not be reached (or was too slow) while cleaning."""


_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="fw-clean")
core_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="fw-core")


def core_budget_ms() -> float:
    try:
        return float(os.environ.get("ARAN_FAAS_CORE_TIMEOUT_MS", "300"))
    except ValueError:
        return 300.0


def clean_request(protect_fn: Callable[[str], dict], content_type: str, body: bytes, path: str, query: str,
                  policy: Any = None, parsed: Optional[tuple] = None) -> CleanResult:
    """Cleans the path, query and body of one request. protect_fn(text) calls the core and returns
    {"after", "findings", "protected", "unprotected", "ignored", "by_type", "latency_ms"}.
    Raises BodyError for a body that does not match its content type and CleanFailed when the core fails or is
    too slow. Writes nothing. `policy` is a normalised rule list (or None for the default, tokenise everything)."""
    res = CleanResult()
    if parsed is None:
        parsed = (parse_body(content_type, body), parse_path(path), parse_query(query))
    pbody, ppath, pquery = parsed
    if pbody is None:
        res.supported = False
        return res
    parts = [ppath, pquery, pbody]
    units = [u for p in parts for u in p.units]

    groups = max(1, sum(len(v) for _, v in units) // MAX_JOIN_CHARS + 1)
    budget = (core_budget_ms() + 25.0 * (groups - 1)) / 1000.0
    actions: Dict[str, int] = {}
    block_types: set = set()
    alert_types: set = set()

    def postprocess(original: str, cleaned: str, findings: list) -> str:
        text, decisions = apply_policy(original, findings, policy)
        for d in decisions:
            actions[d["action"]] = actions.get(d["action"], 0) + 1
            if d["action"] == "block":
                block_types.add(d["type"])
            elif d["action"] == "alert":
                alert_types.add(d["type"])
        return text

    if policy is None:
        postprocess = None
    fut = _pool.submit(clean_units, units, protect_fn, core_pool.map, MAX_JOIN_CHARS, postprocess)
    try:
        out = fut.result(timeout=budget)
    except FutureTimeout:
        fut.cancel()
        raise CleanFailed("the core did not answer within the budget")
    except BodyError:
        raise
    except Exception as err:
        raise CleanFailed(f"{err.__class__.__name__}")

    pos = 0
    rebuilt = []
    for p in parts:
        n = len(p.units)
        rebuilt.append(p.rebuild(out.values[pos:pos + n]))
        pos += n
    res.path, res.query, res.body = rebuilt
    res.protected, res.unprotected, res.ignored = out.protected, out.unprotected, out.ignored
    res.by_type, res.findings, res.latency_ms = out.by_type, out.findings, out.latency_ms
    if policy is not None:
        res.actions = actions
        res.block_types, res.alert_types = sorted(block_types), sorted(alert_types)
        # "protected" is what the policy changed in the request: allowed findings stay as they were
        res.protected = sum(n for a, n in actions.items() if a != "allow")
    return res


def mask_request(parsed: tuple) -> CleanResult:
    """The core is down: a masked copy of the request (last 4 digits only). Used by fail mode 'hold'."""
    pbody, ppath, pquery = parsed
    res = CleanResult()
    outs = []
    for p in (ppath, pquery, pbody):
        outs.append(p.rebuild([mask_text(v) for _, v in p.units]))
    res.path, res.query, res.body = outs
    return res


# ---------------------------------------------------------------- signed edge config (Ed25519)
# Cloud signs the config of a self-hosted data plane; the edge checks it with the public key.
# The signature covers the exact JSON text in envelope["payload"], so nothing is re-serialised before checking.
EDGE_CONFIG_TTL_S = 600          # a config is valid for 10 minutes
EDGE_SKEW_S = 60                 # clock difference tolerated on issued_at


class ConfigRejected(ValueError):
    """The edge refuses this config. The message says why (never contains config values)."""


def canonical_json(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def config_digest(routes: list, policies: list) -> str:
    import hashlib
    return hashlib.sha256(canonical_json({"routes": routes, "policies": policies}).encode()).hexdigest()


def key_fingerprint(public_raw: bytes) -> str:
    import hashlib
    return hashlib.sha256(public_raw).hexdigest()[:16]


def edge_public_raw(seed: bytes) -> bytes:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    return Ed25519PrivateKey.from_private_bytes(seed).public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw)


def sign_config(seed: bytes, payload: dict) -> dict:
    """Returns the envelope {"alg", "key_id", "payload" (JSON text), "signature" (base64)}."""
    import base64
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    text = canonical_json(payload)
    sig = Ed25519PrivateKey.from_private_bytes(seed).sign(text.encode())
    return {"alg": "Ed25519", "key_id": key_fingerprint(edge_public_raw(seed)), "payload": text,
            "signature": base64.b64encode(sig).decode()}


def verify_config(envelope: Any, public_raw: bytes, tenant_id: str, edge_id: Optional[str], current_version: int = 0,
                  current_digest: Optional[str] = None, now: Optional[float] = None) -> dict:
    """Checks an envelope and returns its payload. Raises ConfigRejected for: a missing or bad signature, a payload
    that is not valid, another tenant or edge, an expired config, a config issued in the future, a version older
    than the one applied, or the same version with different content."""
    import base64
    import time
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    if not isinstance(envelope, dict) or not envelope.get("signature") or not isinstance(envelope.get("payload"), str):
        raise ConfigRejected("config is not signed")
    try:
        sig = base64.b64decode(envelope["signature"], validate=True)
        Ed25519PublicKey.from_public_bytes(public_raw).verify(sig, envelope["payload"].encode())
    except (InvalidSignature, ValueError, TypeError):
        raise ConfigRejected("signature does not match")
    try:
        p = json.loads(envelope["payload"])
    except ValueError:
        raise ConfigRejected("payload is not JSON")
    if not isinstance(p, dict):
        raise ConfigRejected("payload is not an object")
    for k in ("tenant_id", "edge_id", "version", "issued_at", "expires_at", "routes", "policies"):
        if k not in p:
            raise ConfigRejected(f"payload lacks '{k}'")
    if not isinstance(p["version"], int) or isinstance(p["version"], bool):
        raise ConfigRejected("version is not a number")
    if p["tenant_id"] != tenant_id:
        raise ConfigRejected("config is for another tenant")
    if edge_id and p["edge_id"] != edge_id:
        raise ConfigRejected("config is for another edge")
    now = time.time() if now is None else now
    try:
        issued, expires = float(p["issued_at"]), float(p["expires_at"])
    except (TypeError, ValueError):
        raise ConfigRejected("bad timestamps")
    if expires <= now:
        raise ConfigRejected("config has expired")
    if issued > now + EDGE_SKEW_S:
        raise ConfigRejected("config is issued in the future")
    if p["version"] < current_version:
        raise ConfigRejected(f"version {p['version']} is older than the applied version {current_version}")
    if (p["version"] == current_version and current_digest
            and config_digest(p["routes"], p["policies"]) != current_digest):
        raise ConfigRejected("same version but different content")
    return p
