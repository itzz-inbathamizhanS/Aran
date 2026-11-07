# 2026-10-16 0058 IST - Novel data-flow firewall research

## Prompt (clean)
Analyze the Aran problem statement (data-flow firewall for banks), give a baseline solution, do a literature survey on real sources, find research gaps, design a novel maths/science-grounded solution, review it critically, and use real data only.

## What was done
- Full research doc: problem analysis, baseline, literature survey (DPDP Act + Rules 2025, CERT-In, UIDAI ADV, PCI, NIST FF1, real breaches: 2016 debit cards, SBI Quick, Juspay, Star Health, Meta logs, Samsung ChatGPT), research gaps, novel design with 3 theorems and architecture diagram, critical review (11 attacks fixed), evaluation, plan, sources.
- Novel design: M1 checksum-complement tokens (always fail Verhoeff/Luhn, Theorem 1); M2 Bayesian evidence fusion + own-customer cuckoo registry + trace-bound OTP registry; M3 per-sink tokens for leak attribution (Theorem 2); M4 min-entropy leakage ledger; M5 purpose-bound crypto-shredding with Merkle erasure receipts (Theorem 3).
- Python prototype (FF1 passing NIST vectors, checksums, tokens, exact mask entropy); experiments on 32,000 real Loghub log lines.

## Output
- Doc: https://claude.ai/code/artifact/b9979855-1cbe-4136-85b0-306318d3c15f (repo copy: docs/research/aran-research.md)
- Key results: OTP false alarms 67,481 to 6; card 6,086 to 81; Aadhaar 366 to 4; tokens flagged 0/20,000; leak attribution 100% across 40 sinks.

## Decisions
- Real data = real public logs (Loghub) + real regulations/incidents; no real person's Aadhaar/PAN/card used; injected values are generated with valid checksums.
- DPDP-scope data uses vault-mode random tokens only (vaultless FF1 cannot be crypto-shredded).

## Open to-do (at the time)
- Legal sign-off that crypto-shredding counts as DPDP erasure.
- Port core to Rust; build Envoy/Vector/AI-gateway adapters.
