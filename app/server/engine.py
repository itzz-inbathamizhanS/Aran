"""The live Aran engine behind the console.

Everything here runs the research code in research/ for real: the calibrated detector
with the normaliser and both registries, the firewall in vault mode, the purpose vault
with Merkle receipts, and the artificial immune system learning this server's own
traffic. No result is hard-coded; every number the console shows is counted here.

The only generated inputs are identifiers: customers are created with checksum-valid
numbers that belong to no real person, because real Aadhaar, PAN or card numbers must
never be used outside a bank.
"""
import glob
import json
import os
import pickle
import random
import re
import secrets
import subprocess
import sys
import threading
import time
from collections import defaultdict, deque

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.abspath(os.path.join(HERE, "..", "..", "research"))
sys.path.insert(0, RESEARCH)

import synth  # noqa: E402
from ai.detector import Detector  # noqa: E402
from aran_core import FF1, _offset, luhn_check_digit, verhoeff_check_digit  # noqa: E402
from firewall.aran_firewall import card_offset  # noqa: E402
from firewall.normalise import Normaliser  # noqa: E402
from firewall.registry import CustomerRegistry, OtpRegistry, canonical  # noqa: E402
from firewall.shredder import PURPOSES, Erased, PurposeFirewall, PurposeVault, verify_receipt  # noqa: E402
from immune.ais import tune_self_radius  # noqa: E402
from immune.flows import FlowFeaturizer  # noqa: E402

MODELS = os.environ.get("ARAN_MODELS", os.path.join(HERE, "models", "detector.pkl"))
LOGS_DIR = os.environ.get("ARAN_LOGS", os.path.join(RESEARCH, "data"))
WINDOW = float(os.environ.get("ARAN_WINDOW_SECONDS", "30"))

# sink -> (purpose its data serves, detection threshold)
SINKS = {
    "log-platform": ("Service", 0.5),
    "crm-notes": ("Service", 0.5),
    "loan-vendor": ("Loans", 0.5),
    "llm-gateway": ("Service", 0.3),
    "marketing-cloud": ("Marketing", 0.5),
    "kyc-archive": ("KYC", 0.5),
}
# normal traffic the replay sends: (source system, sink, Loghub systems whose real lines it carries)
REPLAY_PAIRS = [
    ("core-banking", "log-platform", ["HDFS", "Hadoop", "Spark", "Zookeeper"]),
    ("mobile-app", "log-platform", ["Android", "HealthApp"]),
    ("call-centre", "crm-notes", ["Windows", "Mac"]),
    ("loan-origination", "loan-vendor", ["OpenStack", "Apache"]),
    ("employee-desktop", "llm-gateway", ["Linux", "OpenSSH"]),
]
SAMPLES = {
    "loan": "Loan application API",
    "kyc": "KYC upload API",
    "callnote": "Call-centre note",
    "payment": "Payment callback",
    "otp": "Login with OTP",
    "chatbot": "Prompt to an AI assistant",
}
SAMPLE_SINK = {"loan": "loan-vendor", "kyc": "kyc-archive", "callnote": "crm-notes", "payment": "log-platform",
               "otp": "log-platform", "chatbot": "llm-gateway"}
SAMPLE_SOURCE = {"loan": "loan-origination", "kyc": "onboarding", "callnote": "call-centre", "payment": "upi-switch",
                 "otp": "mobile-app", "chatbot": "employee-desktop"}
ID_RX = re.compile(r"(?<![0-9A-Za-z])(\d{16}|\d{12})(?![0-9A-Za-z])")
PSEUDO_RX = re.compile(r"<(?!OTP:destroyed)[A-Z]+:[0-9a-z\-]+>")


def _p95(xs):
    return round(float(np.percentile(xs, 95)), 1) if xs else None


class Engine:
    def __init__(self, n_customers=25, seed=None):
        t0 = time.time()
        with open(MODELS, "rb") as fh:
            base = pickle.load(fh)
        self.key = secrets.token_bytes(16)
        self.registry = CustomerRegistry(secrets.token_bytes(32), capacity=100_000)
        self.otp_registry = OtpRegistry(secrets.token_bytes(32), ttl=300.0)
        self.det = Detector(base.ner, base.otp_clf, base.upi_clf, normaliser=Normaliser(),
                            registry=self.registry, otp_registry=self.otp_registry)
        self.det.stack, self.det.iso = base.stack, base.iso
        self.vault = PurposeVault()
        self.fw = _IndexingFirewall(self.det, self.key, self.vault, {s: p for s, (p, _) in SINKS.items()},
                                    thresholds={s: t for s, (_, t) in SINKS.items()})
        self.ff1 = FF1(self.key)
        self.lock = threading.RLock()
        self.rand = random.Random(seed if seed is not None else secrets.randbits(64))
        self.started = time.time()
        self.customers = {}
        self.events = deque(maxlen=300)
        self.sink_store = defaultdict(lambda: deque(maxlen=500))  # what each sink actually received
        self.latency_ms = deque(maxlen=2000)
        self.counts = defaultdict(int)
        self.by_type = defaultdict(int)
        self.bypass = set()   # sinks the operator switched to monitor-only (values pass raw)
        self.immune = Immune(self)
        self.replay = Replay(self)
        self.jobs = {}
        for _ in range(n_customers):
            self.add_customer()
        self.load_seconds = round(time.time() - t0, 1)

    # ------------------------------------------------------------ customers
    def add_customer(self, name=None):
        r = self.rand
        with self.lock:
            ref = f"CUST-{len(self.customers) + 1:04d}"
            aad = re.sub(r"\D", "", synth.gen_aadhaar(r))
            card = re.sub(r"\D", "", synth.gen_card(r))
            mob = re.sub(r"\D", "", synth.gen_mobile(r))[-10:]
            pan = synth.gen_pan(r)
            ids = dict(AADHAAR=aad, CARD=card, MOBILE=mob, PAN=pan)
            for t, v in ids.items():
                self.registry.add(t, v)
            name = name or synth.gen_name(r, "test")
            upi = name.split()[0].lower() + str(r.randint(10, 99)) + "@" + r.choice(synth.SPLITS["upi"]["test"])
            # KYC records are kept for 5 years after the relationship ends (PMLA rules)
            self.vault.enroll(ref, dict(ids, UPI=upi), retain={"KYC": time.time() + 5 * 365 * 86400})
            self.customers[ref] = dict(ref=ref, name=name, upi=upi, created=time.time(), **ids)
            return self.customers[ref]

    def customer_view(self, ref):
        c = self.customers[ref]
        masked = dict(AADHAAR="XXXX XXXX " + c["AADHAAR"][-4:], CARD="XXXX XXXX XXXX " + c["CARD"][-4:],
                      MOBILE="XXXXXX" + c["MOBILE"][-4:], PAN=c["PAN"][:2] + "XXXXXX" + c["PAN"][-2:])
        return dict(ref=ref, name=c["name"], masked=masked, keys=self.vault.key_status(ref))

    # ------------------------------------------------------------ requests
    def sample(self, kind, who="customer"):
        """A bank request of the given kind, filled with a real enrolled customer's
        identifiers ("customer") or with a stranger's freshly generated ones."""
        r = self.rand
        if who == "customer" and self.customers:
            c = self.customers[r.choice(sorted(self.customers))]
        else:
            c = dict(name=synth.gen_name(r, "test"), AADHAAR=re.sub(r"\D", "", synth.gen_aadhaar(r)),
                     CARD=re.sub(r"\D", "", synth.gen_card(r)), MOBILE=re.sub(r"\D", "", synth.gen_mobile(r))[-10:],
                     PAN=synth.gen_pan(r), upi=synth.gen_upi(r, "test"))
        addr = synth.gen_address(r, "test")
        trace = "%032x" % r.getrandbits(128)
        a = c["AADHAAR"]
        if kind == "loan":
            text = json.dumps(dict(applicant=c["name"], pan=c["PAN"], aadhaar=f"{a[:4]} {a[4:8]} {a[8:]}",
                                   mobile="+91" + c["MOBILE"], address=addr, amount=r.randint(50, 900) * 1000), ensure_ascii=False)
        elif kind == "kyc":
            text = (f"POST /kyc/v2/verify status=200 customer={c['name']} doc=aadhaar uid={a} "
                    f"pan={c['PAN']} addr=\"{addr}\"")
        elif kind == "callnote":
            text = (f"Customer {c['name']} called from {c['MOBILE']}, card {c['CARD'][:4]}-{c['CARD'][4:8]}-"
                    f"{c['CARD'][8:12]}-{c['CARD'][12:]} block karna hai, address {addr} pe naya card bhejo")
        elif kind == "payment":
            text = json.dumps(dict(event="payment.captured", vpa=c["upi"], payer_mobile=c["MOBILE"],
                                   utr="UTR" + "".join(r.choice("0123456789") for _ in range(12)),
                                   amount=f"{r.randint(10, 9999)}.00"))
        elif kind == "otp":
            otp = "".join(r.choice("0123456789") for _ in range(6))
            self.otp_registry.issue(otp, trace)  # the auth service issued this OTP on this trace
            text = f"auth-svc INFO login challenge sent mobile={c['MOBILE']} code {otp} trace={trace[:8]}"
        elif kind == "chatbot":
            text = (f"Summarise this complaint: {c['name']} (Aadhaar {a}, PAN {c['PAN']}) says the debit on card "
                    f"{c['CARD']} was not authorised. Reply politely.")
        else:
            raise KeyError(kind)
        return dict(text=text, sink=SAMPLE_SINK[kind], source=SAMPLE_SOURCE[kind], trace_id=trace)

    def process(self, text, source, sink, trace_id=None, record=True):
        if sink not in SINKS and not re.fullmatch(r"[a-z0-9][a-z0-9.\-]{1,60}", sink):
            raise ValueError("sink names are lower-case letters, digits, dots and dashes")
        with self.lock:
            t0 = time.perf_counter()
            if sink in self.bypass:
                fs = self.det.scan(text, threshold=0.2, trace_id=trace_id)
                out, issued = text, []
                for f in fs:
                    f.meta["passed_raw"] = True
            else:
                self.fw.issued_now = []
                out, fs = self.fw.process(text, src=source, sink=sink, trace_id=trace_id)
                issued = self.fw.issued_now
            ms = (time.perf_counter() - t0) * 1000
            thr = SINKS.get(sink, ("", 0.5))[1]
            findings = []
            for f in sorted(fs, key=lambda f: f.start):
                protected = f.p >= thr and not f.meta.get("passed_raw")
                findings.append(dict(type=f.type, start=f.start, end=f.end, p=round(f.p, 4), protected=protected,
                                     evidence={k: round(v, 3) for k, v in f.evidence.items()},
                                     registry=f.meta.get("registry"), repaired=bool(f.meta.get("repaired"))))
            for tok, typ, value in issued:
                for fd in findings:
                    if fd.get("token") is None and fd["type"] == typ and fd["protected"]:
                        fd["token"] = tok
                        break
            raw_left = sum(1 for f in findings if not f["protected"])
            owners = {self.vault.owner_of(f["type"], text[f["start"]:f["end"]]) for f in findings}
            owners.discard(None)
            self.immune.observe(source, sink, len(findings), raw_left, {f["type"] for f in findings}, len(owners))
            if record:
                self.latency_ms.append(ms)
                self.counts["requests"] += 1
                self.counts["values_protected"] += len(findings) - raw_left
                self.counts["values_raw"] += raw_left
                for f in findings:
                    self.by_type[f["type"]] += 1
            ev = dict(id=secrets.token_hex(6), at=time.time(), source=source, sink=sink, before=text, after=out,
                      latency_ms=round(ms, 2), findings=findings, bypass=sink in self.bypass, trace_id=trace_id)
            self.sink_store[sink].append(out)
            if record:
                self.events.appendleft(ev)
            return ev

    # ------------------------------------------------------------ detokenise, erase
    def detokenise(self, token, caller):
        with self.lock:
            e = self.vault.vault.get(token)
            if e is not None:
                self.immune.observe_detok(caller, e["sink"])
            try:
                return dict(token=token, value=self.vault.detokenise(token, caller), status="ok")
            except Erased as err:
                return dict(token=token, value=None, status="erased", reason=str(err))
            except KeyError:
                return dict(token=token, value=None, status="unknown",
                            reason="Not a vault token. Vaultless FF1 tokens are reversed only inside the bank's key boundary.")

    def erase(self, ref, purpose):
        with self.lock:
            receipt = self.vault.erase(ref, purpose)
            if purpose == "KYC" or all(not k["alive"] for k in self.vault.key_status(ref)):
                for t in ("AADHAAR", "CARD", "MOBILE", "PAN"):
                    self.registry.remove(t, self.customers[ref][t])
            return receipt

    # ------------------------------------------------------------ leak trace
    def _ff1_sink(self, digits):
        """Which known sink a vaultless token was issued to, checked cryptographically:
        the wrong check digit must match the sink's keyed offset and the decrypted body
        must be a registered customer."""
        for sink in list(SINKS) + sorted(self.fw.sinks - set(SINKS)):
            body = digits[:-1]
            if len(digits) == 12:
                if int(digits[-1]) != (int(verhoeff_check_digit(body)) + _offset(self.key, sink)) % 10:
                    continue
                real = self.ff1.decrypt(body, sink.encode()); real += verhoeff_check_digit(real); typ = "AADHAAR"
            else:
                if int(digits[-1]) != (int(luhn_check_digit(body)) + card_offset(self.key, sink)) % 10:
                    continue
                real = self.ff1.decrypt(digits[:15], sink.encode()); real += luhn_check_digit(real); typ = "CARD"
            if self.registry.contains(typ, real):
                return sink
        return None

    def trace(self, dump):
        with self.lock:
            votes, items = defaultdict(int), []
            cands = [m.group(1) for m in ID_RX.finditer(dump)] + PSEUDO_RX.findall(dump)
            for c in cands:
                how, sink = None, None
                if c in self.vault.vault:
                    how, sink = "vault", self.vault.vault[c]["sink"]
                elif c in self.fw.index:
                    how, sink = "issued-token index", self.fw.index[c]
                elif c.isdigit():
                    sink = self._ff1_sink(c)
                    how = "FF1 offset + registry" if sink else None
                if sink:
                    votes[sink] += 1
                items.append(dict(value=c, sink=sink, how=how))
            raw = [dict(type=f.type, p=round(f.p, 3)) for f in self.det.scan(dump) if f.type in ("AADHAAR", "CARD")]
            total = sum(votes.values())
            ranking = sorted(({"sink": s, "tokens": n, "share": round(n / total, 4)} for s, n in votes.items()),
                             key=lambda x: -x["tokens"])
            return dict(candidates=len(cands), matched=total, ranking=ranking, top=ranking[0] if ranking else None,
                        items=items[:200], raw_identifiers_in_dump=len(raw))

    def leaked_dump(self, sink, lines=20):
        """What a breach of this sink would expose: the last lines the sink really stored."""
        with self.lock:
            got = list(self.sink_store.get(sink, []))[:lines]
            return "\n".join(got)

    # ------------------------------------------------------------ stats
    def stats(self):
        with self.lock:
            return dict(requests=self.counts["requests"], values_protected=self.counts["values_protected"],
                        values_passed_raw=self.counts["values_raw"], by_type=dict(self.by_type),
                        p50_ms=round(float(np.median(self.latency_ms)), 1) if self.latency_ms else None,
                        p95_ms=_p95(list(self.latency_ms)), alerts=len(self.immune.alerts),
                        open_alerts=sum(1 for a in self.immune.alerts if a["label"] is None),
                        customers=len(self.customers), tokens_issued=len(self.fw.index) + len(self.vault.vault),
                        vault_tokens=len(self.vault.vault), keys_destroyed=len(self.vault.destroyed),
                        merkle_size=len(self.vault.log.leaves), uptime_s=round(time.time() - self.started),
                        immune=self.immune.state, replay=self.replay.status(), model_load_seconds=self.load_seconds)


class _IndexingFirewall(PurposeFirewall):
    """Records every token it issues, so a leaked dump can be traced back."""

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.index, self.issued_now = {}, []

    def _replace(self, f, value, sink):
        tok = super()._replace(f, value, sink)
        if tok not in ("<OTP:destroyed>",) and "withheld" not in tok:
            self.index[tok] = sink
        self.issued_now.append((tok, f.type, value))
        return tok


# ---------------------------------------------------------------- immune layer on live traffic
class Immune:
    """Learns 'self' from this server's own flow windows, then scores each new window.

    A flow record is one (source, sink, window) with the number of messages that carried
    sensitive values, the fraction left raw, the data classes, the detokenisation rate
    and the customer ratio, counted from real traffic through the firewall."""

    def __init__(self, eng):
        self.eng = eng
        self.cur = {}
        self.closed = deque(maxlen=5000)
        self.alerts = []
        self.state = dict(mode="idle", learned_records=0, self_radius=None, detectors=0, val_fpr=None,
                          learn_until=None, window_seconds=WINDOW)
        self.feat = self.ais = None
        self.learn_from = None

    def _win(self):
        return int(time.time() // WINDOW)

    def _rec(self, src, sink):
        w = self._win()
        k = (src, sink, w)
        if k not in self.cur:
            self.cur[k] = dict(src=src, sink=sink, window=w, n=0, raw=0, classes=set(), detok=0, owners=0)
        return self.cur[k]

    def observe(self, src, sink, n_findings, raw_left, classes, owners):
        if not n_findings:
            return
        r = self._rec(src, sink)
        r["n"] += 1; r["raw"] += int(raw_left > 0); r["classes"] |= classes; r["owners"] += owners

    def observe_detok(self, caller, sink):
        self._rec(caller, sink)["detok"] += 1

    @staticmethod
    def as_flow(r):
        n = max(r["n"], 1)
        hour = time.localtime(r["window"] * WINDOW).tm_hour
        return dict(day=0, hour=hour, src=r["src"], sink=r["sink"], classes=set(r["classes"]), n=n,
                    raw_frac=r["raw"] / n, detok_rate=r["detok"] / n, cust_ratio=min(1.0, r["owners"] / n), label=0, attack=None)

    def tick(self):
        """Close finished windows; learn or score them."""
        with self.eng.lock:
            w = self._win()
            done = [k for k in self.cur if k[2] < w]
            recs = [self.cur.pop(k) for k in done]
            for r in recs:
                self.closed.append(r)
            if self.state["mode"] == "learning" and time.time() >= self.state["learn_until"]:
                self._fit()
            elif self.state["mode"] == "watching":
                for r in recs:
                    self._score(r)

    def start_learning(self, seconds):
        with self.eng.lock:
            self.learn_from = self._win()
            self.state.update(mode="learning", learn_until=time.time() + seconds, learned_records=0)

    def _fit(self):
        self_recs = [self.as_flow(r) for r in self.closed if r["window"] >= self.learn_from]
        if len(self_recs) < 10:
            self.state.update(mode="idle", error=f"only {len(self_recs)} flow windows seen; keep normal traffic running and learn again")
            return
        self.feat = FlowFeaturizer().fit(self_recs)
        X = self.feat.transform(self_recs)
        tr, va = X[0::2], X[1::2]
        rs, fpr, self.ais = tune_self_radius(tr, va, target_fpr=0.05)
        self.state.update(mode="watching", learned_records=len(self_recs), self_radius=rs, detectors=len(self.ais.C),
                          val_fpr=round(fpr, 4), learn_until=None, error=None,
                          pairs=sorted({f"{x['src']} -> {x['sink']}" for x in self_recs}))

    def _score(self, r):
        rec = self.as_flow(r)
        x = self.feat.transform([rec])
        s = float(self.ais.score(x)[0])
        if s <= 0:
            return
        names = FlowFeaturizer.names
        why = []
        f = dict(zip(names, x[0]))
        if f["pair_novel"] > 0: why.append("source and sink never seen together while learning")
        if abs(f["volume_z"]) > 2: why.append(f"volume {rec['n']} messages is {f['volume_z']:+.1f} sd from normal")
        if f["raw_frac_z"] > 2: why.append(f"{rec['raw_frac']:.0%} of messages left raw")
        if f["class_novel"] > 0: why.append("new data classes: " + ", ".join(sorted(rec["classes"])))
        if f["detok_log"] > 1: why.append(f"detokenisation rate {rec['detok_rate']:.2f} per message")
        if f["hour_distance"] > 0.1 and not f["pair_novel"]: why.append("outside the hours this flow normally runs")
        self.alerts.insert(0, dict(id=secrets.token_hex(5), at=r["window"] * WINDOW, src=rec["src"], sink=rec["sink"],
                                   score=round(s, 4), n=rec["n"], raw_frac=round(rec["raw_frac"], 3),
                                   detok_rate=round(rec["detok_rate"], 3), classes=sorted(rec["classes"]),
                                   features={k: round(float(v), 3) for k, v in f.items()},
                                   reasons=why or ["outside the learned self region"], label=None, _x=x[0].tolist()))

    def label(self, alert_id, label):
        with self.eng.lock:
            a = next(a for a in self.alerts if a["id"] == alert_id)
            x = np.array(a["_x"])
            if label == "attack":
                self.ais.confirm_attack(x)   # immune memory: similar flows score higher next time
            else:
                self.ais.confirm_false_alarm(x)  # self-tolerance: drop detectors covering this flow
            a["label"] = label
            self.state["detectors"] = len(self.ais.C)
            return a


# ---------------------------------------------------------------- replay of real logs
class Replay:
    """Streams real production log lines (Loghub, 16 systems) through the firewall as the
    bank's normal traffic. About one line in ten carries a bank event for an enrolled
    customer, as in experiment E9."""

    def __init__(self, eng):
        self.eng = eng
        self.logs = {}
        for f in sorted(glob.glob(os.path.join(LOGS_DIR, "*_2k.log"))):
            self.logs[os.path.basename(f)[:-7]] = open(f, errors="replace").read().splitlines()
        self.running = False
        self.rate = 1.0
        self.sent = 0
        self.thread = None

    def status(self):
        return dict(running=self.running, lines_per_second_per_flow=self.rate, lines_sent=self.sent,
                    flows=[f"{s} -> {k}" for s, k, _ in REPLAY_PAIRS], log_systems=len(self.logs))

    def start(self, rate=1.0):
        if not self.logs:
            raise RuntimeError("no Loghub logs found; run research/fetch_data.sh")
        self.rate = max(0.2, min(float(rate), 5.0))
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run, daemon=True)
            self.thread.start()

    def stop(self):
        self.running = False

    def _line(self, systems):
        r = self.eng.rand
        sysname = r.choice([s for s in systems if s in self.logs] or sorted(self.logs))
        ln = r.choice(self.logs[sysname])
        if r.random() < 0.1:
            text = synth.make_line(r, *r.choice(synth.TEMPLATES["test"]), "test")[0]
            if r.random() < 0.7 and self.eng.customers:
                c = self.eng.customers[r.choice(sorted(self.eng.customers))]
                text += f" aadhaar={c['AADHAAR']} mobile={c['MOBILE']}"
            ln = ln + " | " + text
        return ln

    def _run(self):
        nxt = time.time()
        while self.running:
            for src, sink, systems in REPLAY_PAIRS:
                k = np.random.poisson(self.rate)
                for _ in range(k):
                    self.eng.process(self._line(systems), src, sink, record=True)
                    self.sent += 1
            nxt += 1.0
            time.sleep(max(0.0, nxt - time.time()))


# ---------------------------------------------------------------- drills: real actions, judged live
def drill(eng, kind):
    """Runs a real action against the live firewall. The immune layer is not told; it has
    to notice the resulting flow window on its own."""
    r = eng.rand
    if kind == "new-sink":
        for _ in range(30):
            s = eng.sample(r.choice(["callnote", "loan"]))
            eng.process(s["text"], "call-centre", "paste-site.example", record=True)
        return "Sent 30 customer records from the call centre to paste-site.example, a sink never seen before."
    if kind == "bulk-export":
        for _ in range(250):
            s = eng.sample("loan")
            eng.process(s["text"], "loan-origination", "loan-vendor", record=True)
        return "Exported 250 loan applications to the loan vendor in one window."
    if kind == "detok-spike":
        toks = [t for t, e in eng.vault.vault.items() if e["sink"] == "crm-notes"][:60]
        if not toks:
            return "No crm-notes vault tokens yet; send some call-centre notes first."
        for t in toks:
            eng.detokenise(t, "call-centre")
        for _ in range(5):
            s = eng.sample("callnote")
            eng.process(s["text"], "call-centre", "crm-notes", record=True)
        return f"The call centre detokenised {len(toks)} customer tokens from crm-notes."
    if kind == "bypass":
        eng.bypass.add("log-platform")
        try:
            for _ in range(40):
                s = eng.sample("payment")
                eng.process(s["text"], "upi-switch", "log-platform", record=True)
        finally:
            eng.bypass.discard("log-platform")
        return "Switched log-platform to monitor-only and sent 40 payment callbacks; values went through raw."
    raise KeyError(kind)


# ---------------------------------------------------------------- results and test runs
RESULT_FILES = {"E1-E4 core": "results.json", "E5-E9 AI and immune": "results_ai.json",
                "E10-E12 normaliser and registries": "results_registry.json"}


def results():
    out = {}
    for name, f in RESULT_FILES.items():
        p = os.path.join(RESEARCH, f)
        if os.path.exists(p):
            out[name] = dict(file=f"research/{f}", modified=os.path.getmtime(p), data=json.load(open(p)))
    return out


def run_job(eng, name, cmd, timeout=900):
    job = dict(name=name, cmd=" ".join(cmd), started=time.time(), finished=None, returncode=None, output="")
    eng.jobs[name] = job

    def go():
        try:
            p = subprocess.run(cmd, cwd=RESEARCH, capture_output=True, text=True, timeout=timeout)
            job.update(output=(p.stdout + p.stderr)[-20000:], returncode=p.returncode)
        except subprocess.TimeoutExpired as e:
            job.update(output=f"timed out after {timeout}s\n{(e.stdout or '')[-5000:]}", returncode=-1)
        job["finished"] = time.time()

    threading.Thread(target=go, daemon=True).start()
    return job
