"""Experiments for the normaliser and the registries (roadmap items 2 and 5), E10 to E12.

E10  Evasion: identifiers hidden 13 ways (other-script digits, escapes, separators,
     zero-width characters, base64, split fields) in TEST lines. Values removed, before
     and after the normaliser; real lines of unseen systems wrongly changed.
E11  Registries: the E9 firewall run (real logs of 8 unseen systems with generated
     identifiers injected) with the own-customer registry and the trace-bound OTP
     registry, at full and 70% registry coverage; card and Aadhaar false alarms on real
     logs with a neutral and a strict registry-miss rule; registry size and speed.
E12  Typo repair: identifiers with one wrong digit or one adjacent swap, caught with and
     without the registry; Aran tokens wrongly flagged with and without the own-token
     check, measured and projected to a bank with 10^8 registered identifiers.

Uses the same data, splits and trained models as experiment_ai.py (run that first, or
let this script train them; the NER models are cached in data/).
"""
import base64
import json
import os
import random
import re
import secrets
import sys
import time

import numpy as np

import experiment_ai as X
import synth
from ai.detector import Detector
from aran_core import luhn_valid, verhoeff_valid
from firewall.aran_firewall import AranFirewall
from firewall.normalise import Normaliser, b64_encode, canonical_view, collapse_separators
from firewall.registry import CustomerRegistry, OtpRegistry, canonical, typo_neighbours

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "results_registry.json")
R = {}
log = X.log
ID_TYPES = ("AADHAAR", "CARD", "MOBILE", "PAN")


def train():
    ner_fold, ner = X.e5()
    fold, final = X.e6()
    det = Detector(ner, final["otp"], final["upi"])
    X.e7(Detector(ner_fold, fold["otp"], fold["upi"]), det)
    return det


def clone(det, **kw):
    d = Detector(det.ner, det.otp_clf, det.upi_clf, **kw)
    d.stack, d.iso = det.stack, det.iso
    return d


def decoded_digits(text):
    """Digits a determined reader could recover: escapes and other scripts undone,
    separators inside identifiers dropped, base64 blobs decoded."""
    out = [text]
    for m in re.finditer(r"[A-Za-z0-9+/_\-]{16,}={0,2}", text):
        s = m.group().rstrip("=")
        for dec in (base64.b64decode, base64.urlsafe_b64decode):
            try:
                out.append(dec(s + "=" * (-len(s) % 4)).decode("utf-8"))
            except Exception:
                pass
    return " ".join(re.sub(r"\D", "", collapse_separators(*canonical_view(t))[0]) for t in out)


# ---------------------------------------------------------------- E10 evasion
DEVA, TAMIL, FULL = (str.maketrans("0123456789", x) for x in ("०१२३४५६७८९", "௦௧௨௩௪௫௬௭௮௯", "０１２３４５６７８９"))


def _groups(d):
    if len(d) == 10:
        return [d[:5], d[5:]]
    return [d[i:i + 4] for i in range(0, len(d), 4)]


TRICKS = {
    "plain (control)": lambda d, typ: d,
    "Devanagari digits": lambda d, typ: d.translate(DEVA),
    "Tamil digits": lambda d, typ: d.translate(TAMIL),
    "full-width digits": lambda d, typ: d.translate(FULL),
    "URL percent-encoding": lambda d, typ: "".join("%%%02X" % ord(c) for c in d),
    "JSON \\u escapes": lambda d, typ: "".join("\\u%04x" % ord(c) for c in d),
    "HTML entities": lambda d, typ: "".join("&#%d;" % ord(c) for c in d),
    "dots between groups": lambda d, typ: ".".join(_groups(d)),
    "underscores between groups": lambda d, typ: "_".join(_groups(d)),
    "space between every digit": lambda d, typ: " ".join(d),
    "zero-width space inside": lambda d, typ: d[:5] + "​" + d[5:],
    "split into fields": lambda d, typ: (d if typ == "MOBILE" else
                                         " ".join(f"{g}" if i == 0 else f"{typ.lower()}_p{i + 1}={g}"
                                                  for i, g in enumerate(_groups(d)))),
    "base64 of the line": None,  # applied to the whole line below
}


def e10(det, reg):
    rows = [x for x in X.TEST if any(t in ("AADHAAR", "CARD", "MOBILE") for _, _, t in x["spans"])][:700]
    conds = {"today (no normaliser)": clone(det),
             "normaliser": clone(det, normaliser=Normaliser()),
             "normaliser + registry": clone(det, normaliser=Normaliser(), registry=reg)}
    res = {}
    key = secrets.token_bytes(16)
    for cname, d in conds.items():
        fw = AranFirewall(d, key)
        by = {}
        t0, n = time.time(), 0
        for trick, fn in TRICKS.items():
            caught = total = 0
            for x in rows:
                text, vals = x["text"], []
                pieces, last = [], 0
                for a, b, typ in sorted(x["spans"]):
                    v = text[a:b]
                    if typ in ("AADHAAR", "CARD", "MOBILE"):
                        dgt = canonical(typ, v)
                        vals.append(dgt)
                        pieces += [text[last:a], fn(dgt, typ) if fn else v]
                    else:
                        pieces += [text[last:a], v]
                    last = b
                line = "".join(pieces) + text[last:]
                if fn is None:
                    line = "payload=" + b64_encode(line, "std", True)
                out, _ = fw.process(line, "app", "log-platform"); n += 1
                dd = decoded_digits(out)
                for v in vals:
                    total += 1
                    caught += v not in dd
            by[trick] = dict(removed=f"{caught}/{total}", rate=round(caught / total, 4))
        dt = time.time() - t0
        # real lines wrongly changed by this configuration
        changed = sum(fw.process(ln, "app", "log-platform")[0] != ln for ln in X.REAL2)
        res[cname] = dict(by_trick=by, hidden_values_removed=round(np.mean([v["rate"] for k, v in by.items() if k != "plain (control)"]), 4),
                          real_lines_changed=f"{changed}/{len(X.REAL2)}", lines_per_second=round(n / dt))
        log("E10", cname, res[cname]["hidden_values_removed"], res[cname]["real_lines_changed"])
    R["e10_evasion"] = dict(test_lines=len(rows), conditions=res,
                            judge="a value counts as removed if its digits no longer appear after undoing escapes, "
                                  "other scripts, separators and base64 on the output line")


# ---------------------------------------------------------------- E11 registries on the E9 run
def e9_lines():
    r = random.Random(11)
    lines = []
    for sysname in X.G2:
        for ln in X.LOGS[sysname]:
            if r.random() < 0.1:
                x = synth.make_line(r, *r.choice(synth.TEMPLATES["test"]), "test")
                off = len(ln) + 3
                lines.append((sysname, ln + " | " + x[0], len(ln), [(a + off, b + off, t, x[0][a:b]) for a, b, t in x[1]]))
            else:
                lines.append((sysname, ln, len(ln), []))
    return lines


def run_fw(det, lines, traces, key):
    fw = AranFirewall(det, key)
    t0 = time.time()
    outs = [fw.process(text, src="app-" + s, sink="log-platform", hour=i % 24, trace_id=traces[i])
            for i, (s, text, _, _) in enumerate(lines)]
    dt = time.time() - t0
    left, total, clean_types = {}, {}, {}
    changed_clean = 0
    for (s, text, plen, spans), (out, fs) in zip(lines, outs):
        if not spans:
            changed_clean += out != text
            for f in fs:
                if f.p >= 0.5:
                    clean_types[f.type] = clean_types.get(f.type, 0) + 1
        for a, b, typ, val in spans:
            total[typ] = total.get(typ, 0) + 1
            if val in out:
                left[typ] = left.get(typ, 0) + 1
    retok = sum(1 for out, _ in outs for f in det.scan(out) if f.type in ("AADHAAR", "CARD"))
    clean_n = sum(1 for x in lines if not x[3])
    return dict(leaks_left_by_type={t: f"{left.get(t, 0)}/{n}" for t, n in sorted(total.items())},
                recall_by_type={t: round(1 - left.get(t, 0) / n, 4) for t, n in sorted(total.items())},
                leak_recall=round(1 - sum(left.values()) / sum(total.values()), 4),
                clean_real_lines_changed=f"{changed_clean}/{clean_n}", clean_line_findings_by_type=clean_types,
                tokens_redetected_as_real_ids=retok, lines_per_second=round(len(lines) / dt))


def decoy_customers(reg, n, seed):
    r = random.Random(seed)
    for _ in range(n):
        reg.add("AADHAAR", synth.gen_aadhaar(r)); reg.add("CARD", synth.gen_card(r))
        reg.add("MOBILE", synth.gen_mobile(r)); reg.add("PAN", synth.gen_pan(r))


def e11(det):
    lines = e9_lines()
    r = random.Random(12)
    traces = ["%032x" % r.getrandbits(128) for _ in lines]
    key = secrets.token_bytes(16)
    ids = {(t, canonical(t, v)) for _, _, _, sp in lines for _, _, t, v in sp if t in ID_TYPES}
    res = dict(lines=len(lines), injected_identifiers=sum(len(x[3]) for x in lines), registered_injected_values=len(ids))
    log("E11 building registries")
    regs = {}
    t0 = time.time()
    for cov in (1.0, 0.7):
        reg = CustomerRegistry(key, capacity=4 * 200_000 + len(ids) + 1000)
        rr = random.Random(int(cov * 100))
        for t, v in sorted(ids):
            if rr.random() < cov:
                reg.add(t, v)
        decoy_customers(reg, 200_000, seed=13)
        regs[cov] = reg
    build_s = time.time() - t0
    otp = OtpRegistry(key, ttl=1e9)
    for (s, text, _, sp), tr in zip(lines, traces):
        for _, _, t, v in sp:
            if t == "OTP":
                otp.issue(v, tr)
    rd = random.Random(14)
    for _ in range(70_000):  # other customers' live OTPs, issued under other traces
        otp.issue(synth.gen_otp(rd), "%032x" % rd.getrandbits(128))
    conds = {
        "today (detector only)": (clone(det), [None] * len(lines)),
        "normaliser + registries, full coverage": (clone(det, normaliser=Normaliser(), registry=regs[1.0], otp_registry=otp), traces),
        "normaliser + registries, 70% coverage": (clone(det, normaliser=Normaliser(), registry=regs[0.7], otp_registry=otp), traces),
        "registries, strict miss rule": (clone(det, normaliser=Normaliser(), registry=regs[1.0], otp_registry=otp,
                                               miss_lr={"CARD": 0.05, "AADHAAR": 0.05}), traces),
    }
    for name, (d, tr) in conds.items():
        log("E11 run", name)
        res[name] = run_fw(d, lines, tr, key)
        log("E11", name, res[name]["leak_recall"], res[name]["recall_by_type"], res[name]["clean_real_lines_changed"])
    # card and Aadhaar false alarms on real logs of unseen systems
    fa = {}
    for name, d in (("detector only", clone(det)),
                    ("registry, neutral miss", clone(det, registry=regs[1.0])),
                    ("registry, strict miss", clone(det, registry=regs[1.0], miss_lr={"CARD": 0.05, "AADHAAR": 0.05}))):
        c = {"AADHAAR": 0, "CARD": 0, "MOBILE": 0}
        for ln in X.REAL2:
            for f in d.scan(ln):
                if f.type in c:
                    c[f.type] += 1
        fa[name] = c
    res["real_log_false_alarms_unseen_systems"] = dict(lines=len(X.REAL2), **fa)
    reg = regs[1.0]
    t0 = time.time()
    probe = random.Random(15)
    for _ in range(20_000):
        reg.contains("AADHAAR", synth.gen_aadhaar(probe))
    res["registry"] = dict(entries=reg.f.count, memory_mb=round(reg.f.nbytes() / 2 ** 20, 2),
                           false_positive_bound=reg.f.false_positive_bound(), build_seconds=round(build_s, 1),
                           lookup_microseconds=round((time.time() - t0) / 20_000 * 1e6, 1),
                           live_otps=len(otp.live))
    R["e11_registries"] = res


# ---------------------------------------------------------------- E12 typo repair
def typo(d, r):
    if r.random() < 0.5:
        i = r.randrange(len(d))
        return d[:i] + r.choice([c for c in "0123456789" if c != d[i]]) + d[i + 1:], "wrong digit"
    i = r.randrange(len(d) - 1)
    while d[i] == d[i + 1]:
        i = r.randrange(len(d) - 1)
    return d[:i] + d[i + 1] + d[i] + d[i + 2:], "adjacent swap"


def e12(det):
    key = secrets.token_bytes(16)
    r = random.Random(16)
    reg = CustomerRegistry(key, capacity=900_000)
    decoy_customers(reg, 200_000, seed=17)
    cases = []
    for _ in range(2000):
        typ = r.choice(["AADHAAR", "CARD"])
        d = canonical(typ, synth.gen_aadhaar(r) if typ == "AADHAAR" else synth.gen_card(r))
        reg.add(typ, d)
        bad, kind = typo(d, r)
        if (verhoeff_valid(bad) if typ == "AADHAAR" else luhn_valid(bad)):
            continue  # Luhn misses some swaps (09 <-> 90); not a typo the checksum can see
        word = "aadhaar" if typ == "AADHAAR" else "card"
        cases.append((typ, kind, bad, f"customer {word} {bad} updated"))
    res = dict(registered_identifiers=reg.f.count, cases=len(cases))
    for name, d in (("without registry", clone(det)), ("with registry", clone(det, registry=reg))):
        fw = AranFirewall(d, key)
        by = {}
        for typ, kind, bad, line in cases:
            out, _ = fw.process(line, "crm", "log-platform")
            k = f"{typ} {kind}"
            c, n = by.get(k, (0, 0))
            by[k] = (c + int(bad not in out), n + 1)
        res[name] = {k: f"{c}/{n}" for k, (c, n) in sorted(by.items())}
        res[name + "_rate"] = round(sum(c for c, n in by.values()) / len(cases), 4)
    # Aran tokens must not be flagged by typo repair
    d = clone(det, registry=reg)
    fw = AranFirewall(d, key, thresholds={f"sink-{i}": 0.5 for i in range(40)})
    toks, neigh = [], []
    rr = random.Random(18)
    for i in range(5000):
        typ = rr.choice(["AADHAAR", "CARD"])
        v = canonical(typ, synth.gen_aadhaar(rr) if typ == "AADHAAR" else synth.gen_card(rr))
        reg.add(typ, v)
        out, _ = fw.process(f"{typ.lower()} {v}", "crm", f"sink-{i % 40}")
        tok = re.search(r"\d{12,16}", out).group()
        toks.append((typ, tok)); neigh.append(len(typo_neighbours(tok, typ)))
    with_check = sum(1 for typ, t in toks if d.scan(f"{typ.lower()} {t}"))
    d.token_check = None
    without_check = sum(1 for typ, t in toks if d.scan(f"{typ.lower()} {t}"))
    m = float(np.mean(neigh))
    res["tokens"] = dict(tokens=len(toks), sinks=40, flagged_with_own_token_check=with_check,
                         flagged_without_check=without_check, mean_checksum_valid_neighbours=round(m, 2),
                         projected_flag_rate_without_check_at_1e8_ids=round(m * 1e8 / 9e10, 4),
                         note="A token has about m checksum-valid neighbours; with N registered numbers of that type in a "
                              "space of about 9e10 (Aadhaar), each is registered with probability N/9e10, so without the "
                              "own-token check about m*N/9e10 of tokens would be flagged as typos.")
    # typo repair on real logs: failing 12- and 16-digit numbers that hit the registry
    hits = sum(1 for ln in X.REAL2 for f in clone(det, registry=reg).scan(ln) if f.meta.get("registry") == "typo")
    res["real_log_typo_false_alarms"] = f"{hits} in {len(X.REAL2)} lines"
    R["e12_typo"] = res
    log("E12", res["without registry_rate"], res["with registry_rate"], res["tokens"])


if __name__ == "__main__":
    random.seed(7); np.random.seed(7)
    det = train()
    reg = CustomerRegistry(secrets.token_bytes(16), capacity=50_000)
    for x in X.TEST:
        for a, b, t in x["spans"]:
            if t in ID_TYPES:
                reg.add(t, x["text"][a:b])
    only = sys.argv[1:]  # e.g. "e10" to re-run one experiment and update its entry
    if only and os.path.exists(OUT):
        R.update(json.load(open(OUT)))
    for name, fn in (("e10", lambda: e10(det, reg)), ("e11", lambda: e11(det)), ("e12", lambda: e12(det))):
        if not only or name in only:
            fn()
    with open(OUT, "w") as fh:
        json.dump(R, fh, indent=1, ensure_ascii=False)
    log("done")
