"""Calibrated sensitive-data detector.

Owner pair: Bharadhwaj M, SN Arun Vijay (AI/ML).

Each recogniser proposes candidate spans with evidence (checksum result, context
classifier score, NER marginal, nearby keywords). A per-type logistic regression turns
the evidence into a score, and isotonic regression (Zadrozny & Elkan 2002) maps the
score to a calibrated probability, fitted on a split the models never saw. "p=0.9"
then means about 9 in 10 such findings are real, which is what lets the firewall pick
block / tokenise / alert thresholds per channel instead of trusting a regex hit.
"""
import math
import os
import re
import sys
from dataclasses import dataclass, field

import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from aran_core import luhn_valid, verhoeff_valid  # noqa: E402

from .context_clf import UPI_REGISTRY, candidates  # noqa: E402

AADHAAR = re.compile(r"(?<![\d.])([2-9]\d{3})[ -]?(\d{4})[ -]?(\d{4})(?![\d.])")
CARD = re.compile(r"(?<![\d.])(\d(?:[ -]?\d){12,18})(?![\d.])")
MOBILE = re.compile(r"(?<![\w.])(?:\+91[ -]?)?[6-9]\d{9}(?![\d.])")
PAN = re.compile(r"(?<![A-Z0-9])[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z](?![A-Z0-9])")
IIN = re.compile(r"^(4|5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720|60|65|81|82|508|3[47]|35)")
KEYWORDS = {
    "AADHAAR": r"aadhaa?r|uid|kyc|आधार",
    "CARD": r"card|pan\b|cc|debit|credit|chargeback|कार्ड",
    "MOBILE": r"mobile|phone|call|sms|number|ivr|whatsapp|मोबाइल|फ़ोन|फोन|naya number",
    "PAN": r"\bpan\b|income tax|पैन",
}
CALENDAR = re.compile(r"\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|"
                      r"saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|"
                      r"april|june|july|august|september|october|november|december)\b", re.I)
PERSON_CUE = re.compile(r"(customer|cust|name|holder|payer|payee|applicant|dear|for|by|from|shri|smt|mr|mrs|ms|"
                        r"ग्राहक|नाम|जी|ji|bhai|madam|sir)\W*$", re.I)
ADDR_CUE = re.compile(r"(address|addr|residing at|at|pickup|dispatch|पता|ghar)\W*$", re.I)
TYPES = ["AADHAAR", "CARD", "MOBILE", "PAN", "OTP", "UPI", "PER", "ADDR"]


@dataclass
class Finding:
    type: str
    start: int
    end: int
    p: float = 0.0
    evidence: dict = field(default_factory=dict)


def _kw(text, s, e, typ):
    rx = KEYWORDS.get(typ)
    return float(bool(rx and re.search(rx, text[max(0, s - 40):e + 20], re.I)))


def _logit(p):
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


class Detector:
    def __init__(self, ner=None, otp_clf=None, upi_clf=None):
        self.ner, self.otp_clf, self.upi_clf = ner, otp_clf, upi_clf
        self.stack, self.iso = {}, {}

    # ------------------------------------------------------------ candidate proposal
    def propose(self, text):
        out = []
        for m in AADHAAR.finditer(text):
            d = "".join(m.groups())
            out.append(Finding("AADHAAR", m.start(), m.end(),
                               evidence=dict(checksum=float(verhoeff_valid(d)), kw=_kw(text, m.start(), m.end(), "AADHAAR"))))
        for m in CARD.finditer(text):
            d = re.sub(r"[ -]", "", m.group(1))
            out.append(Finding("CARD", m.start(), m.end(),
                               evidence=dict(checksum=float(luhn_valid(d)), iin=float(bool(IIN.match(d))),
                                             len16=float(len(d) == 16), kw=_kw(text, m.start(), m.end(), "CARD"))))
        for m in MOBILE.finditer(text):
            out.append(Finding("MOBILE", m.start(), m.end(),
                               evidence=dict(plus91=float(m.group().startswith("+91")), kw=_kw(text, m.start(), m.end(), "MOBILE"))))
        for m in PAN.finditer(text):
            out.append(Finding("PAN", m.start(), m.end(), evidence=dict(kw=_kw(text, m.start(), m.end(), "PAN"))))
        for kind, clf, typ in (("otp", self.otp_clf, "OTP"), ("upi", self.upi_clf, "UPI")):
            spans = list(candidates(text, kind))
            if spans and clf is not None:
                for (s, e), z in zip(spans, clf.decision([(text, s, e) for s, e in spans])):
                    ev = dict(ctx=float(z))
                    if typ == "UPI":
                        handle = text[s:e].partition("@")[2].lower()
                        ev.update(registry=float(handle in UPI_REGISTRY), hdot=float("." in handle))
                    out.append(Finding(typ, s, e, evidence=ev))
        if self.ner is not None:
            for s, e, typ, p in self.ner.entities(text):
                if typ in ("PER", "ADDR"):
                    span, left = text[s:e], text[max(0, s - 24):s]
                    words = span.split()
                    ev = dict(ner=_logit(p), ntok=min(len(words), 8) / 8, digit=float(any(c.isdigit() for c in span)),
                              calendar=float(bool(CALENDAR.search(span))),
                              title=sum(w[:1].isupper() for w in words) / len(words),
                              deva=float(bool(re.search(r"[\u0900-\u097F]", span))),
                              cue=float(bool((PERSON_CUE if typ == "PER" else ADDR_CUE).search(left))))
                    if typ == "ADDR":
                        ev["pin"] = float(bool(re.search(r"\b[1-9]\d{5}\b", span)))
                        ev["comma"] = float("," in span)
                    out.append(Finding(typ, s, e, evidence=ev))
        return out

    @staticmethod
    def _vec(f):
        return [f.evidence[k] for k in sorted(f.evidence)]

    # ------------------------------------------------------------ training
    def fit_stack(self, findings, labels):
        """findings: list of Finding, labels: 0/1. Fits per-type logistic stackers."""
        for typ in TYPES:
            idx = [i for i, f in enumerate(findings) if f.type == typ]
            ys = [labels[i] for i in idx]
            if len(set(ys)) < 2:
                continue
            X = np.array([self._vec(findings[i]) for i in idx])
            self.stack[typ] = LogisticRegression(C=10.0, max_iter=1000).fit(X, ys)

    def raw_score(self, f):
        m = self.stack.get(f.type)
        if m is None:
            return 0.5
        return float(m.predict_proba(np.array([self._vec(f)]))[0, 1])

    def fit_calibration(self, findings, labels):
        for typ in TYPES:
            idx = [i for i, f in enumerate(findings) if f.type == typ]
            ys = [labels[i] for i in idx]
            if len(set(ys)) < 2:
                continue
            s = [self.raw_score(findings[i]) for i in idx]
            self.iso[typ] = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(s, ys)

    def calibrated(self, f):
        # Hard gate from the Aran design (Theorem 1): a 12-digit or card-length number that
        # fails its checksum is either an Aran token or not an identifier, never a leak.
        if f.type in ("AADHAAR", "CARD") and f.evidence.get("checksum") == 0.0:
            return 0.0
        s = self.raw_score(f)
        iso = self.iso.get(f.type)
        return float(iso.predict([s])[0]) if iso is not None else s

    # ------------------------------------------------------------ inference
    def scan(self, text, threshold=0.5):
        found = []
        for f in self.propose(text):
            f.p = self.calibrated(f)
            if f.p >= threshold:
                found.append(f)
        # overlapping findings: keep the most probable, then the longest
        found.sort(key=lambda f: (-f.p, -(f.end - f.start)))
        kept = []
        for f in found:
            if all(f.end <= k.start or f.start >= k.end for k in kept):
                kept.append(f)
        return sorted(kept, key=lambda f: f.start)


def label_findings(findings, gold_spans):
    """A finding is correct if it overlaps a gold span of the same type."""
    return [int(any(t == f.type and f.start < b and f.end > a for a, b, t in gold_spans)) for f in findings]


def ece(p, y, bins=10):
    p, y = np.asarray(p), np.asarray(y)
    tot = 0.0
    for b in range(bins):
        lo, hi = b / bins, (b + 1) / bins
        m = (p >= lo) & ((p < hi) if b < bins - 1 else (p <= hi))
        if m.any():
            tot += m.mean() * abs(p[m].mean() - y[m].mean())
    return float(tot)


def reliability(p, y, bins=10):
    p, y = np.asarray(p), np.asarray(y)
    rows = []
    for b in range(bins):
        lo, hi = b / bins, (b + 1) / bins
        m = (p >= lo) & ((p < hi) if b < bins - 1 else (p <= hi))
        if m.any():
            rows.append(dict(bin=f"{lo:.1f}-{hi:.1f}", n=int(m.sum()), mean_p=round(float(p[m].mean()), 3),
                             frac_true=round(float(y[m].mean()), 3)))
    return rows
