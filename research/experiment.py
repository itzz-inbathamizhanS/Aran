"""Experiments for the Aran research note.

E1  False alarms of pattern detectors vs checksum-certified detectors on real,
    public, unsanitised production logs (Loghub 2k samples, 16 systems).
    These logs contain no Indian identifiers, so every hit is a false alarm.
E2  Separability: checksum-complement tokens injected into the same logs are
    never flagged, real-shaped identifiers always are.
E3  Leak attribution with per-sink tokens: a leaked dump is traced to its sink.
E4  Min-entropy left by common masking formats (exact counts).
"""
import glob
import json
import math
import os
import random
import re
import secrets

from aran_core import (FF1, cc_token_aadhaar, count_luhn_completions,
                       count_verhoeff_completions, luhn_check_digit, luhn_valid,
                       verhoeff_check_digit, verhoeff_valid)

HERE = os.path.dirname(__file__)
LOGS = sorted(glob.glob(os.path.join(HERE, "data", "*_2k.log")))

AADHAAR = re.compile(r"(?<![\d.])([2-9]\d{3})[ -]?(\d{4})[ -]?(\d{4})(?![\d.])")
CARD = re.compile(r"(?<![\d.])(\d(?:[ -]?\d){12,18})(?![\d.])")
OTP = re.compile(r"(?<![\d.])\d{4,8}(?![\d.])")
OTP_CTX = re.compile(r"(otp|one[- ]time|passcode|verification code)", re.I)
MOBILE = re.compile(r"(?<![\d.])(?:\+91[ -]?)?[6-9]\d{9}(?![\d.])")
PAN = re.compile(r"(?<![A-Z0-9])[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z](?![A-Z0-9])")
IIN = re.compile(r"^(4|5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720|60|65|81|82|508|3[47]|35)")


def scan(lines):
    c = dict(lines=len(lines), aadhaar_regex=0, aadhaar_verhoeff=0, card_regex=0,
             card_luhn=0, card_luhn_iin=0, otp_regex=0, otp_context=0, mobile_regex=0, pan_regex=0)
    for ln in lines:
        for m in AADHAAR.finditer(ln):
            c["aadhaar_regex"] += 1
            if verhoeff_valid("".join(m.groups())):
                c["aadhaar_verhoeff"] += 1
        for m in CARD.finditer(ln):
            d = re.sub(r"[ -]", "", m.group(1))
            c["card_regex"] += 1
            if luhn_valid(d):
                c["card_luhn"] += 1
                if IIN.match(d):
                    c["card_luhn_iin"] += 1
        n_otp = len(OTP.findall(ln))
        c["otp_regex"] += n_otp
        if n_otp and OTP_CTX.search(ln):
            c["otp_context"] += n_otp
        c["mobile_regex"] += len(MOBILE.findall(ln))
        c["pan_regex"] += len(PAN.findall(ln))
    return c


def e1():
    per = {}
    total = None
    for f in LOGS:
        with open(f, errors="replace") as fh:
            lines = fh.read().splitlines()
        r = scan(lines)
        per[os.path.basename(f).replace("_2k.log", "")] = r
        total = r if total is None else {k: total[k] + r[k] for k in r}
    return per, total


def rand_aadhaar():
    body = str(2 + secrets.randbelow(8)) + "".join(secrets.choice("0123456789") for _ in range(10))
    return body + verhoeff_check_digit(body)


def e2(n=20000):
    key = secrets.token_bytes(16)
    ff1 = FF1(key)
    with open(LOGS[0], errors="replace") as fh:
        templates = fh.read().splitlines()
    real_flagged = token_flagged = 0
    for _ in range(n):
        a = rand_aadhaar()
        t = cc_token_aadhaar(ff1, key, a, "log-platform")
        base = random.choice(templates)
        if any(verhoeff_valid("".join(m.groups())) for m in AADHAAR.finditer(base + " uid=" + a)):
            real_flagged += 1
        if any(verhoeff_valid("".join(m.groups())) for m in AADHAAR.finditer(base + " uid=" + t)):
            token_flagged += 1
    return dict(injected=n, real_flagged=real_flagged, token_flagged=token_flagged)


def e3(customers=20000, sinks=40, dump_sizes=(1, 2, 5, 50), trials=200):
    key = secrets.token_bytes(16)
    ff1 = FF1(key)
    ids = [rand_aadhaar() for _ in range(customers)]
    names = [f"sink-{i:02d}" for i in range(sinks)]
    index = {}
    for s in names:
        for a in ids:
            index[cc_token_aadhaar(ff1, key, a, s)] = s
    collisions = customers * sinks - len(index)
    out = {"customers": customers, "sinks": sinks, "token_collisions": collisions}
    for k in dump_sizes:
        correct = 0
        for _ in range(trials):
            src = random.choice(names)
            dump = [cc_token_aadhaar(ff1, key, a, src) for a in random.sample(ids, k)]
            votes = {}
            for t in dump:
                votes[index.get(t)] = votes.get(index.get(t), 0) + 1
            if max(votes, key=votes.get) == src:
                correct += 1
        out[f"dump_{k}_accuracy"] = correct / trials
    return out


def e4():
    rows = []

    def add(name, total, remaining):
        rows.append(dict(mask=name, candidates=remaining, bits_left=round(math.log2(remaining), 2),
                         bits_leaked=round(math.log2(total) - math.log2(remaining), 2)))

    aad_total = count_verhoeff_completions({})
    ex = rand_aadhaar()
    last4 = {i: int(ex[i]) for i in range(8, 12)}
    add("Aadhaar, last 4 shown (UIDAI masked Aadhaar)", aad_total, count_verhoeff_completions(last4))
    first4last4 = {**{i: int(ex[i]) for i in range(4)}, **last4}
    add("Aadhaar, first 4 and last 4 shown", aad_total, count_verhoeff_completions(first4last4))
    card_total = 10 ** 15  # Luhn-valid 16-digit numbers
    c = "6521" + "".join(secrets.choice("0123456789") for _ in range(11))
    c += luhn_check_digit(c)
    add("Card 16-digit, last 4 shown", card_total, count_luhn_completions({i: int(c[i]) for i in range(12, 16)}))
    add("Card 16-digit, first 6 and last 4 shown (PCI common format)", card_total,
        count_luhn_completions({**{i: int(c[i]) for i in range(6)}, **{i: int(c[i]) for i in range(12, 16)}}))
    add("Card 16-digit, first 8 and last 4 shown (8-digit BIN)", card_total,
        count_luhn_completions({**{i: int(c[i]) for i in range(8)}, **{i: int(c[i]) for i in range(12, 16)}}))
    add("Mobile, last 4 shown", 4 * 10 ** 9, 4 * 10 ** 5)
    return rows


if __name__ == "__main__":
    random.seed(7)
    per, total = e1()
    res = {"e1_per_system": per, "e1_total": total, "e2": e2(), "e3": e3(), "e4": e4()}
    with open(os.path.join(HERE, "results.json"), "w") as fh:
        json.dump(res, fh, indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "e1_per_system"}, indent=1))
