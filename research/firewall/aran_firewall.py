"""Aran inline firewall: detector + tokeniser + immune flow monitor, wired together.

Owner pair: Inbathamizhan S, Aasif Ahmed A (cyber security).

For every line headed to a sink (log platform, LLM gateway, vendor, ...):
  1. the calibrated detector finds sensitive spans with probabilities;
  2. spans at or above the sink's threshold are replaced: Aadhaar and card numbers by
     checksum-complement tokens (vaultless FF1, always fail the checksum, so a token is
     never mistaken for a real number and names the sink it was issued to), OTPs are
     destroyed, other types become keyed per-sink pseudonyms;
  3. per (source, sink, hour) the firewall keeps flow counts and hands each finished
     hour to the artificial immune system, which raises an alert for non-self flows.
"""
import hashlib
import hmac
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from aran_core import FF1, cc_token_aadhaar, luhn_check_digit  # noqa: E402


def cc_token_card(ff1, key, card, sink):
    """Card counterpart of cc_token_aadhaar: FF1 on the first 15 digits, then a check
    digit that is deliberately wrong by a keyed non-zero offset, so it always fails Luhn."""
    body = ff1.encrypt(card[:15], sink.encode())
    off = 1 + hmac.new(key, b"card|" + sink.encode(), hashlib.sha256).digest()[0] % 9
    return body + str((int(luhn_check_digit(body)) + off) % 10)


class AranFirewall:
    def __init__(self, detector, key, ais=None, featurizer=None, thresholds=None):
        self.det, self.key, self.ff1 = detector, key, FF1(key)
        self.ais, self.feat = ais, featurizer
        self.thresholds = thresholds or {}
        self.flows = defaultdict(lambda: dict(n=0, raw=0, classes=set(), detok=0))

    def _pseudo(self, typ, value, sink):
        h = hmac.new(self.key, f"{typ}|{sink}|{value}".encode(), hashlib.sha256).hexdigest()[:10]
        return f"<{typ}:{h}>"

    def _replace(self, f, value, sink):
        digits = re.sub(r"\D", "", value)
        if f.type == "AADHAAR" and len(digits) == 12:
            return cc_token_aadhaar(self.ff1, self.key, digits, sink)
        if f.type == "CARD" and len(digits) == 16:
            return cc_token_card(self.ff1, self.key, digits, sink)
        if f.type == "OTP":
            return "<OTP:destroyed>"
        return self._pseudo(f.type, value, sink)

    def process(self, line, src, sink, hour=0):
        """Returns (clean_line, findings). Findings below threshold pass through raw and are
        counted as raw in the flow record, so the immune layer still sees them."""
        t = self.thresholds.get(sink, 0.5)
        findings = self.det.scan(line, threshold=min(t, 0.2))
        out, last = [], 0
        raw = 0
        for f in findings:
            if f.p >= t:
                out.append(line[last:f.start]); out.append(self._replace(f, line[f.start:f.end], sink)); last = f.end
            else:
                raw += 1
        out.append(line[last:])
        if findings:
            fl = self.flows[(src, sink, hour)]
            fl["n"] += 1; fl["raw"] += int(raw > 0); fl["classes"] |= {f.type for f in findings}
        return "".join(out), findings

    def flow_records(self):
        recs = []
        for (src, sink, hour), fl in self.flows.items():
            recs.append(dict(day=0, hour=hour, src=src, sink=sink, classes=set(fl["classes"]), n=fl["n"],
                             raw_frac=fl["raw"] / fl["n"], detok_rate=fl["detok"] / fl["n"], cust_ratio=0.85, label=0, attack=None))
        return recs

    def immune_alerts(self):
        if self.ais is None or not self.flows:
            return []
        recs = self.flow_records()
        scores = self.ais.score(self.feat.transform(recs))
        return [(r, float(s)) for r, s in zip(recs, scores) if s > 0]
