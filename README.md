# Aran

> An algebraic data-flow firewall for Indian banks. It detects Aadhaar, PAN, card numbers, UPI IDs and OTPs in APIs, logs and AI tools, protects them before they are stored or shared, traces any leak back to its source, and supports DPDP-compliant erasure.

**Domain:** Banking, Financial Services & FinTech
**Team (KARE, Kalasalingam Academy of Research and Education):** Inbathamizhan S (lead, cybersecurity), Aasif Ahmed A (cybersecurity), Bharadhwaj M (AI/ML), SN Arun Vijay (AI/ML)

## Problem statement: Prevent Sensitive Data Leakage

Financial institutions handle large volumes of sensitive customer information across APIs, applications and system logs. Account numbers, card details, identity documents and personal contact information pass through many systems every day, and any of them can end up exposed in a request payload, a debug log or a shared report.

**Challenge:** create a solution that can identify sensitive customer information in API traffic and application logs and automatically protect or mask it before it is stored or shared.

**Technologies:** AI / NLP, Data Privacy, APIs, Cybersecurity, Cryptography

## The core idea

Aadhaar numbers carry a Verhoeff check digit and card numbers a Luhn check digit. Aran turns that check digit into a security invariant: real identifiers always pass their checksum, and Aran's tokens are built to always fail it. Any scanner can therefore prove whether a number it finds is protected or leaked. Attribution, leakage budgets and erasure are built on top of this fact.

| Mechanism | What it does | Theory it rests on |
| --- | --- | --- |
| M1. Checksum-complement tokens | Tokens keep the 12 or 16 digit shape but always fail Verhoeff or Luhn (Theorem 1: perfect separability) | Group theory (dihedral group D5), modular arithmetic, FF1 pseudorandom permutations |
| M2. Evidence-fusion detector | Calibrated probability per candidate from checksum, context, an own-customer registry and a trace-bound OTP registry | Bayes' rule, Neyman-Pearson lemma, Bloom and cuckoo filter bounds |
| M3. Per-sink tokens | Each destination gets its own tokens, so a leaked token names the system that leaked it (Theorem 2) | PRP families, birthday bound, maximum-likelihood source estimation |
| M4. Leakage ledger | Caps how many bits any group of destinations learns about one customer | Quantitative information flow (min-entropy) |
| M5. Purpose-bound crypto-shredding | One key per customer per purpose; destroying it erases every copy everywhere, with a signed receipt (Theorem 3) | Shannon perfect secrecy, Merkle transparency logs |

Planned additions (in progress): an NER model for names and addresses, a learned OTP context classifier, and a bio-inspired artificial immune system that flags unusual data flows.

## Results on real data

All tests ran on 32,000 real production log lines from 16 systems in the public [Loghub](https://github.com/logpai/loghub) dataset. These logs contain no Indian identifiers, so every hit is a false alarm. No real person's identifier is used anywhere; injected values are generated with valid checksums.

| Test | Plain pattern matching | Aran |
| --- | --- | --- |
| OTP false alarms | 67,481 | 6 with context rules; about 10^-6 per candidate with the trace-bound registry |
| Card false alarms | 6,086 | 81 with Luhn and issuer prefix (HDFS block IDs); removed by the own-customer registry |
| Aadhaar false alarms | 366 | 4 with Verhoeff |
| Tokens wrongly flagged (20,000 injected) | not separable | 0 |
| Leaked dumps traced to the right sink (40 sinks) | access logs only | 100% for dumps of 1, 2, 5 and 50 tokens |

Exact leakage left by common masks:

| Mask | Candidates left | Bits left |
| --- | --- | --- |
| Card 16-digit, last 4 shown | 100,000,000,000 | 36.5 |
| Aadhaar, last 4 shown | 8,000,000 | 22.9 |
| Card 16-digit, first 6 and last 4 | 100,000 | 16.6 |
| Card 16-digit, first 8 and last 4 | 1,000 | 10.0 |
| Aadhaar, first 4 and last 4 | 1,000 | 10.0 |

## Repository layout

```
research/
  aran_core.py     Verhoeff, Luhn, NIST SP 800-38G FF1, checksum-complement tokens, min-entropy counting
  test_core.py     Tests, including the NIST FF1 sample vectors
  experiment.py    Experiments E1 to E4 on real logs
  results.json     Raw results
  fetch_data.sh    Downloads the Loghub samples
```

## Run it

```
git clone https://github.com/itzz-inbathamizhans/aran.git
cd aran/research
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install cryptography numpy pytest
./fetch_data.sh                                     # Windows: run in Git Bash
python -m pytest test_core.py
python experiment.py                                # about 3 minutes
```

## Documents

The research document and the seven learning docs are kept in the team's shared working folder (`D:\Aran\artifacts`).

- **Research document:** problem analysis, baseline, literature survey, research gaps, novel design with theorems, critical review, results, plan and sources.

Learning docs, in reading order:

| # | Doc | For |
| --- | --- | --- |
| 1 | Python and Tools | Everyone, first |
| 2 | Indian Identifiers and Check Digits | Everyone |
| 3 | Cryptography Basics | Inbathamizhan, Aasif (everyone reads section 2) |
| 4 | Probability for Detection | Everyone |
| 5 | AI and NLP for Detection | Bharadhwaj, Arun |
| 6 | Artificial Immune Systems | Inbathamizhan, Aasif |
| 7 | Data-Protection Law Basics | Everyone |

## Regulations addressed

DPDP Act 2023 and DPDP Rules 2025 (safeguards, 72-hour breach report, erasure), CERT-In Directions 2022 (6-hour reporting, 180-day logs), UIDAI Aadhaar Data Vault, RBI payment data and card tokenisation rules, and PCI DSS. Treating crypto-shredding as DPDP erasure still needs legal confirmation.
