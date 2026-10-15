"""Experiments for the AI and immune layers of Aran (E5 to E9).

E5  NER for names and addresses: CoNLL-2003 (English), HiNER (Hindi), Hinglish tweets,
    and generated bank log lines in all three languages with unseen templates and names;
    false alarms on real logs from systems the models never saw.
E6  OTP and UPI context classifiers vs the regex rules of the first prototype.
E7  Calibrated detector: calibration error before and after isotonic calibration,
    and false alarms on real logs vs the prototype's regex scan.
E8  Artificial immune system on bank data-flow telemetry with six exfiltration
    scenarios, vs Isolation Forest and static rules; immune memory and self-tolerance;
    plus a sanity check on labelled real BGL supercomputer logs.
E9  The wired firewall on real logs with generated identifiers injected: leaks left,
    real text wrongly changed, tokens never re-flagged, throughput.

Splits: models train on TRAIN templates/names and on real logs from 8 Loghub systems;
every test uses TEST templates/names and the other 8 systems.
"""
import csv
import glob
import json
import math
import os
import pickle
import random
import re
import secrets
import time

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import brier_score_loss, roc_auc_score

import synth
from ai import ner as nermod
from ai.context_clf import ContextClassifier, candidates, label_candidates, real_negatives
from ai.detector import (AADHAAR, CARD, MOBILE, PAN, TYPES, Detector, ece, label_findings, reliability)
from aran_core import luhn_valid, verhoeff_valid
from firewall.aran_firewall import AranFirewall
from immune.ais import VDetectorNSA, tune_self_radius
from immune.flows import FlowFeaturizer, inject_attacks, simulate

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
AI = os.path.join(DATA, "ai")
R = {}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


# ---------------------------------------------------------------- data
def load_logs():
    out = {}
    for f in sorted(glob.glob(os.path.join(DATA, "*_2k.log"))):
        out[os.path.basename(f).replace("_2k.log", "")] = open(f, errors="replace").read().splitlines()
    return out


def load_sms():
    rows = []
    with open(os.path.join(AI, "sms_spam.csv"), encoding="latin-1") as fh:
        for row in csv.reader(fh):
            if row and row[0] == "ham":
                rows.append(row[1])
    return rows[0::2], rows[1::2]


LOGS = load_logs()
SYSTEMS = sorted(LOGS)
G1, G2 = SYSTEMS[0::2], SYSTEMS[1::2]
REAL1 = [ln for s in G1 for ln in LOGS[s]]
REAL2 = [ln for s in G2 for ln in LOGS[s]]
SMS1, SMS2 = load_sms()
# Cross-fitting: "fold" models train on FIT phrasings only and score the CAL phrasings, which
# fits the stacker and the calibration on text those models never saw, as at test time.
# The "final" models then train on all TRAIN phrasings and reuse that calibration.
TRAIN_FIT = synth.make_train_corpus(8000, seed=1, part="fit")
TRAIN_CAL = synth.make_train_corpus(6000, seed=2, part="cal")
TRAIN_ALL = synth.make_train_corpus(10000, seed=4)
TEST = synth.make_corpus("test", 4000, seed=3)


# ---------------------------------------------------------------- E5 NER
def e5():
    log("E5 loading corpora")
    c = nermod.load_corpora(AI)
    synth_fit = [nermod.spans_to_bio(x["text"], x["spans"]) for x in TRAIN_FIT]
    synth_all = [nermod.spans_to_bio(x["text"], x["spans"]) for x in TRAIN_ALL]
    synth_te = [(x["lang"],) + nermod.spans_to_bio(x["text"], x["spans"]) for x in TEST]
    corpora_tr = c["conll_train"] + c["hiner_train"] + c["hinglish_train"]
    res = {"train_sentences": dict(conll=len(c["conll_train"]), hiner=len(c["hiner_train"]),
                                   hinglish=len(c["hinglish_train"]), synthetic_logs=len(synth_all))}
    models = {}
    for name, data in (("corpora_only", corpora_tr), ("fold", corpora_tr + synth_fit), ("corpora_plus_logs", corpora_tr + synth_all)):
        path = os.path.join(DATA, f"ner_{name}.pkl")
        if os.path.exists(path):
            models[name] = pickle.load(open(path, "rb"))
        else:
            log("E5 training", name, len(data))
            t = time.time()
            models[name] = nermod.NER().fit(data)
            res[f"train_seconds_{name}"] = round(time.time() - t)
            pickle.dump(models[name], open(path, "wb"))
    for name, m in models.items():
        if name == "fold":
            continue
        out = {}
        for key, types in (("conll_test", ["PER", "LOC", "ORG"]), ("hiner_test", ["PER", "LOC", "ORG"]),
                           ("hinglish_test", ["PER", "LOC", "ORG"])):
            sents = c[key]
            out[key] = nermod.entity_prf([t for _, t in sents], m.predict([w for w, _ in sents]), types)
        for lang in ("en", "hi", "hl"):
            ss = [(w, t) for l, w, t in synth_te if l == lang]
            out[f"bank_logs_test_{lang}"] = nermod.entity_prf([t for _, t in ss], m.predict([w for w, _ in ss]), ["PER", "ADDR"])
        res[name] = out
    m = models["corpora_plus_logs"]
    t = time.time()
    hits, ex = {"PER": 0, "ADDR": 0, "LOC": 0, "ORG": 0}, []
    for ln in REAL2:
        for s, e, typ, p in m.entities(ln):
            hits[typ] += 1
            if typ in ("PER", "ADDR") and len(ex) < 12 and p > 0.5:
                ex.append(dict(text=ln[s:e], type=typ, p=round(p, 3)))
    res["real_logs_unseen_systems"] = dict(lines=len(REAL2), entities=hits,
                                           per_or_addr_per_1000_lines=round(1000 * (hits["PER"] + hits["ADDR"]) / len(REAL2), 2),
                                           examples=ex, lines_per_second=round(len(REAL2) / (time.time() - t)))
    R["e5_ner"] = res
    return models["fold"], m


# ---------------------------------------------------------------- E6 context classifiers
OTP_CTX = re.compile(r"(otp|one[- ]time|passcode|verification code)", re.I)
VPA_RX = re.compile(r"[\w.\-]{2,64}@[A-Za-z][A-Za-z0-9.\-]{1,63}")


def _rate(pred, y):
    pred, y = np.asarray(pred), np.asarray(y)
    tp = int((pred & (y == 1)).sum()); fp = int((pred & (y == 0)).sum()); fn = int((~pred & (y == 1)).sum())
    pr = tp / (tp + fp) if tp + fp else 0.0
    rc = tp / (tp + fn) if tp + fn else 0.0
    return dict(precision=round(pr, 4), recall=round(rc, 4), f1=round(2 * pr * rc / (pr + rc), 4) if pr + rc else 0.0)


def e6():
    out, fold, final = {}, {}, {}
    for kind in ("otp", "upi"):
        neg = real_negatives(REAL1, kind) + real_negatives(SMS1, kind)
        fi, fy = label_candidates(TRAIN_FIT, kind)
        fold[kind] = ContextClassifier(kind).fit(fi + neg, fy + [0] * len(neg))
        it, y = label_candidates(TRAIN_ALL, kind)
        clf = final[kind] = ContextClassifier(kind).fit(it + neg, y + [0] * len(neg))
        ti, ty = label_candidates(TEST, kind)
        tn_logs = real_negatives(REAL2, kind)
        tn_sms = real_negatives(SMS2, kind)
        items, labels = ti + tn_logs + tn_sms, ty + [0] * (len(tn_logs) + len(tn_sms))
        p = clf.proba(items)
        if kind == "otp":
            base = np.array([bool(OTP_CTX.search(t[max(0, s - 40):e + 20])) for t, s, e in items])
        else:
            base = np.ones(len(items), bool)  # prototype: any VPA-shaped string
        pl = p[len(ti):len(ti) + len(tn_logs)]
        out[kind] = dict(
            train_candidates=len(it) + len(neg), test_candidates=len(items), test_positives=int(sum(ty)),
            auroc=round(roc_auc_score(labels, p), 4),
            classifier_at_0_5=_rate(p >= 0.5, labels), regex_baseline=_rate(base, labels),
            real_log_candidates_unseen_systems=len(tn_logs),
            real_log_false_alarms=dict(classifier=int((pl >= 0.5).sum()), regex=int(base[len(ti):len(ti) + len(tn_logs)].sum())),
            sms_false_alarms=dict(classifier=int((p[len(ti) + len(tn_logs):] >= 0.5).sum()), regex=int(base[len(ti) + len(tn_logs):].sum()),
                                  candidates=len(tn_sms)),
            by_language={lang: _rate(p[[i for i, (t, s, e) in enumerate(ti) if lang_of[t] == lang]] >= 0.5,
                                     [ty[i] for i, (t, s, e) in enumerate(ti) if lang_of[t] == lang]) for lang in ("en", "hi", "hl")},
        )
        log("E6", kind, out[kind]["auroc"], out[kind]["classifier_at_0_5"], out[kind]["regex_baseline"])
    R["e6_context"] = out
    return fold, final


lang_of = {x["text"]: x["lang"] for x in TEST}


# ---------------------------------------------------------------- E7 calibrated detector
def _findings(det, rows, lines):
    F, Y = [], []
    for r in rows:
        fs = det.propose(r["text"]); F += fs; Y += label_findings(fs, r["spans"])
    for ln in lines:
        fs = det.propose(ln); F += fs; Y += [0] * len(fs)
    return F, Y


def prototype_scan(text):
    """The first prototype's rules (experiment.py), returned as typed spans."""
    out = []
    for m in AADHAAR.finditer(text):
        if verhoeff_valid("".join(m.groups())):
            out.append(("AADHAAR", m.start(), m.end()))
    for m in CARD.finditer(text):
        if luhn_valid(re.sub(r"[ -]", "", m.group(1))):
            out.append(("CARD", m.start(), m.end()))
    if OTP_CTX.search(text):
        for s, e in candidates(text, "otp"):
            out.append(("OTP", s, e))
    for m in MOBILE.finditer(text):
        out.append(("MOBILE", m.start(), m.end()))
    for m in PAN.finditer(text):
        out.append(("PAN", m.start(), m.end()))
    for m in VPA_RX.finditer(text):
        out.append(("UPI", m.start(), m.end()))
    return out


def e7(det_fold, det):
    half = len(TRAIN_CAL) // 2
    F1, Y1 = _findings(det_fold, TRAIN_CAL[:half], REAL1[0::2] + SMS1[0::2])
    det_fold.fit_stack(F1, Y1)
    F2, Y2 = _findings(det_fold, TRAIN_CAL[half:], REAL1[1::2] + SMS1[1::2])
    det_fold.fit_calibration(F2, Y2)
    det.stack, det.iso = det_fold.stack, det_fold.iso
    FT, YT = _findings(det, TEST, REAL2 + SMS2)
    raw = np.array([det.raw_score(f) for f in FT]); cal = np.array([det.calibrated(f) for f in FT]); y = np.array(YT)
    per = {}
    for typ in TYPES:
        m = np.array([f.type == typ for f in FT])
        if m.sum() == 0 or len(set(y[m])) < 2:
            per[typ] = dict(candidates=int(m.sum()), positives=int(y[m].sum()))
            continue
        per[typ] = dict(candidates=int(m.sum()), positives=int(y[m].sum()), auroc=round(roc_auc_score(y[m], cal[m]), 4),
                        ece_before=round(ece(raw[m], y[m]), 4), ece_after=round(ece(cal[m], y[m]), 4),
                        brier_before=round(brier_score_loss(y[m], raw[m]), 4), brier_after=round(brier_score_loss(y[m], cal[m]), 4),
                        at_0_5=_rate(cal[m] >= 0.5, y[m]))
    # real-log false alarms on unseen systems: detector vs prototype regex rules
    det_fa, reg_fa = {t: 0 for t in TYPES}, {t: 0 for t in TYPES}
    for ln in REAL2:
        for f in det.scan(ln):
            det_fa[f.type] += 1
        for typ, _, _ in prototype_scan(ln):
            reg_fa[typ] += 1
    R["e7_detector"] = dict(per_type=per, overall=dict(ece_before=round(ece(raw, y), 4), ece_after=round(ece(cal, y), 4),
                                                       reliability_after=reliability(cal, y)),
                            real_log_false_alarms_unseen_systems=dict(lines=len(REAL2), detector=det_fa, prototype_regex=reg_fa,
                                                                      detector_total=sum(det_fa.values()), regex_total=sum(reg_fa.values())),
                            note="Test mix = generated TEST lines + real logs of 8 unseen systems + held-out real SMS; "
                                 "calibration holds for this mix, a bank must recalibrate on its own traffic.")
    log("E7", R["e7_detector"]["overall"]["ece_before"], R["e7_detector"]["overall"]["ece_after"], det_fa, reg_fa)


# ---------------------------------------------------------------- E8 immune system
def e8():
    tr, va, te = simulate(range(0, 14), 0), simulate(range(14, 18), 1), simulate(range(18, 30), 2)
    att = inject_attacks(range(18, 30))
    F = FlowFeaturizer().fit(tr)
    Xtr, Xva = F.transform(tr), F.transform(va)
    T = te + att
    X, y = F.transform(T), np.array([x["label"] for x in T])
    sweep = []
    for rs in (0.02, 0.03, 0.05, 0.08, 0.12):
        m = VDetectorNSA(self_radius=rs).fit(Xtr)
        p = m.predict(X)
        sweep.append(dict(self_radius=rs, detectors=len(m.C), val_fpr=round(float(m.predict(Xva).mean()), 4),
                          test_fpr=round(float(p[y == 0].mean()), 4), test_tpr=round(float(p[y == 1].mean()), 4)))
    rs, vfpr, ais = tune_self_radius(Xtr, Xva)
    s = ais.score(X); p = s > 0

    def per_attack(pred):
        d = {}
        for x, pp in zip(T, pred):
            if x["label"]:
                d.setdefault(x["attack"], []).append(bool(pp))
        return {k: f"{sum(v)}/{len(v)} records" for k, v in d.items()}

    iso = IsolationForest(random_state=0, contamination="auto").fit(Xtr)
    thr = np.quantile(-iso.score_samples(Xva), 0.98)  # same 2% validation false-alarm budget
    si = -iso.score_samples(X); pi = si > thr
    names = FlowFeaturizer.names
    rule = (X[:, names.index("raw_frac_z")] > 3) | (X[:, names.index("volume_z")] > 3) | (X[:, names.index("pair_novel")] > 0)
    res = dict(train_records=len(tr), val_records=len(va), test_records=len(T), attacks=int(y.sum()), sweep=sweep,
               chosen_self_radius=rs, detectors=len(ais.C),
               ais=dict(auroc=round(roc_auc_score(y, s), 4), fpr=round(float(p[y == 0].mean()), 4), tpr=round(float(p[y == 1].mean()), 4),
                        per_attack=per_attack(p)),
               isolation_forest=dict(auroc=round(roc_auc_score(y, si), 4), fpr=round(float(pi[y == 0].mean()), 4),
                                     tpr=round(float(pi[y == 1].mean()), 4), per_attack=per_attack(pi)),
               static_rules=dict(fpr=round(float(rule[y == 0].mean()), 4), tpr=round(float(rule[y == 1].mean()), 4), per_attack=per_attack(rule)))
    # immune memory: score of the repeat attack (A6) before and after A1 is confirmed
    i1 = next(i for i, x in enumerate(T) if x["attack"] and x["attack"].startswith("A1"))
    i6 = next(i for i, x in enumerate(T) if x["attack"] and x["attack"].startswith("A6"))
    before = float(ais.score(X[i6:i6 + 1])[0])
    ais.confirm_attack(X[i1])
    after = float(ais.score(X[i6:i6 + 1])[0])
    res["immune_memory"] = dict(a6_score_before=round(before, 4), a6_score_after_confirming_a1=round(after, 4), memory_detectors=len(ais.mem_C))
    # self-tolerance: analyst marks false alarms of days 18-23; measure days 24-29
    early = [i for i, x in enumerate(T) if x["label"] == 0 and x["day"] < 24]
    late = np.array([i for i, x in enumerate(T) if x["label"] == 0 and x["day"] >= 24])
    late_att = np.array([i for i, x in enumerate(T) if x["label"] == 1 and x["day"] >= 24])
    fpr_before = float((ais.score(X[late]) > 0).mean())
    fa = [i for i in early if ais.score(X[i:i + 1])[0] > 0]
    for i in fa:
        ais.confirm_false_alarm(X[i])
    res["self_tolerance"] = dict(false_alarms_marked=len(fa), later_fpr_before=round(fpr_before, 4),
                                 later_fpr_after=round(float((ais.score(X[late]) > 0).mean()), 4),
                                 later_attacks_still_caught=f"{int((ais.score(X[late_att]) > 0).sum())}/{len(late_att)}")
    res["bgl_real_logs"] = e8_bgl()
    R["e8_immune"] = res
    log("E8", res["ais"], res["isolation_forest"]["tpr"], res["static_rules"]["tpr"])
    return F, ais


def e8_bgl():
    """Real labelled logs: BGL supercomputer, 2,000 lines, 143 alert lines. Self = normal
    lines of the first half (time order); test = second half."""
    rows = list(csv.DictReader(open(os.path.join(AI, "BGL_2k_structured.csv"), errors="replace")))
    rows.sort(key=lambda x: int(x["LineId"]))
    lv = {"INFO": 0, "WARNING": 1, "ERROR": 2, "SEVERE": 3, "FAILURE": 4, "FATAL": 4}
    comp = {c: i for i, c in enumerate(sorted({x["Component"] for x in rows}))}
    half = len(rows) // 2
    train_norm = [x for x in rows[:half] if x["Label"] == "-"]
    cnt = {}
    for x in train_norm:
        cnt[x["EventId"]] = cnt.get(x["EventId"], 0) + 1
    last = {}

    def feats(x):
        t = int(x["Timestamp"]); g = t - last.get(x["Node"], t); last[x["Node"]] = t
        rar = -math.log((cnt.get(x["EventId"], 0) + 1) / (len(train_norm) + len(cnt) + 1))
        return [rar, lv.get(x["Level"], 2), comp[x["Component"]], math.log1p(max(g, 0))]

    allf = [feats(x) for x in rows]
    Xs = np.array([f for f, x in zip(allf[:half], rows[:half]) if x["Label"] == "-"])
    Xt = np.array(allf[half:]); yt = np.array([int(x["Label"] != "-") for x in rows[half:]])
    cut = int(0.8 * len(Xs))  # last 20% of normal training lines tune the self radius
    rs, _, m = tune_self_radius(Xs[:cut], Xs[cut:])
    s = m.score(Xt); p = s > 0
    iso = IsolationForest(random_state=0).fit(Xs[:cut]); si = -iso.score_samples(Xt)
    pi = si > np.quantile(-iso.score_samples(Xs[cut:]), 0.98)
    lvl = np.array([x["Level"] in ("FATAL", "FAILURE", "SEVERE") for x in rows[half:]])
    unseen = np.array([x["EventId"] not in cnt for x in rows[half:]])
    return dict(test_lines=len(yt), test_alerts=int(yt.sum()), chosen_self_radius=rs,
                normal_test_lines_with_unseen_template=int((unseen & (yt == 0)).sum()),
                ais=dict(auroc=round(roc_auc_score(yt, s), 4), **_rate(p, yt)),
                isolation_forest=dict(auroc=round(roc_auc_score(yt, si), 4), **_rate(pi, yt)),
                severity_rule=_rate(lvl, yt))


# ---------------------------------------------------------------- E9 firewall end to end
def e9(det, feat, ais):
    key = secrets.token_bytes(16)
    fw = AranFirewall(det, key)
    r = random.Random(11)
    lines, gold = [], []
    for sysname in G2:
        for ln in LOGS[sysname]:
            if r.random() < 0.1:
                x = synth.make_line(r, *r.choice(synth.TEMPLATES["test"]), "test")
                off = len(ln) + 3
                lines.append((sysname, ln + " | " + x[0], len(ln), [(a + off, b + off, t, x[0][a:b]) for a, b, t in x[1]]))
            else:
                lines.append((sysname, ln, len(ln), []))
    t0 = time.time()
    outs = [fw.process(text, src="app-" + s, sink="log-platform", hour=i % 24) for i, (s, text, _, _) in enumerate(lines)]
    dt = time.time() - t0
    left, total = {}, {}
    proto_left = {}
    changed_clean = changed_prefix = 0
    clean_types, retok_ex = {}, []
    for (s, text, plen, spans), (out, fs) in zip(lines, outs):
        if not spans:
            changed_clean += out != text
            for f in fs:
                if f.p >= 0.5:
                    clean_types[f.type] = clean_types.get(f.type, 0) + 1
        else:
            changed_prefix += not out.startswith(text[:plen])
        proto = prototype_scan(text)
        for a, b, typ, val in spans:
            total[typ] = total.get(typ, 0) + 1
            if val in out:
                left[typ] = left.get(typ, 0) + 1
            if not any(pa < b and pb > a for _, pa, pb in proto):
                proto_left[typ] = proto_left.get(typ, 0) + 1
    clean_n = sum(1 for x in lines if not x[3]); inj_n = len(lines) - clean_n
    # tokens must never be re-detected as real Aadhaar or card numbers
    retok = 0
    for out, _ in outs:
        for f in det.scan(out):
            if f.type in ("AADHAAR", "CARD"):
                retok += 1
                if len(retok_ex) < 5:
                    retok_ex.append(dict(text=out[max(0, f.start - 30):f.end + 10], type=f.type, p=round(f.p, 3), ev=f.evidence))
    proto_clean = sum(1 for s, text, plen, spans in lines if not spans and prototype_scan(text))
    R["e9_firewall"] = dict(
        lines=len(lines), lines_with_injected_identifiers=inj_n, injected_identifiers=sum(total.values()),
        leaks_left_by_type={t: f"{left.get(t, 0)}/{n}" for t, n in sorted(total.items())},
        leak_recall=round(1 - sum(left.values()) / sum(total.values()), 4),
        prototype_regex_recall=round(1 - sum(proto_left.values()) / sum(total.values()), 4),
        prototype_missed_by_type={t: f"{proto_left.get(t, 0)}/{n}" for t, n in sorted(total.items())},
        clean_real_lines_changed=f"{changed_clean}/{clean_n}", clean_line_findings_by_type=clean_types,
        redetected_examples=retok_ex, prototype_clean_lines_flagged=f"{proto_clean}/{clean_n}",
        real_prefix_changed_on_injected_lines=f"{changed_prefix}/{inj_n}",
        tokens_redetected_as_real_ids=retok, lines_per_second=round(len(lines) / dt),
        sample=[dict(before=text[-160:], after=out[-160:]) for (s, text, _, sp), (out, _) in zip(lines, outs) if sp][:6])
    log("E9", R["e9_firewall"]["leak_recall"], R["e9_firewall"]["clean_real_lines_changed"], R["e9_firewall"]["lines_per_second"])


if __name__ == "__main__":
    random.seed(7); np.random.seed(7)
    R["splits"] = dict(train_systems=G1, test_systems=G2, real_lines_train=len(REAL1), real_lines_test=len(REAL2),
                       sms_ham_train=len(SMS1), sms_ham_test=len(SMS2), synthetic_train=dict(fit=len(TRAIN_FIT), cal=len(TRAIN_CAL), all=len(TRAIN_ALL)), synthetic_test=len(TEST))
    ner_fold, ner = e5()
    fold, final = e6()
    det = Detector(ner, final["otp"], final["upi"])
    e7(Detector(ner_fold, fold["otp"], fold["upi"]), det)
    feat, ais = e8()
    e9(det, feat, ais)
    with open(os.path.join(HERE, "results_ai.json"), "w") as fh:
        json.dump(R, fh, indent=1, ensure_ascii=False)
    log("done")
