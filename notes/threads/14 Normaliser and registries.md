---
tags: [thread, aran, build]
date: 2026-10-16
status: done
---
# Normaliser and registries

Built roadmap items 5 and 2 from [[12 Next features for Aran]] (commit `3944f75`).

- Normaliser: `research/firewall/normalise.py` (URL/base64/JSON escapes, Devanagari/Tamil/full-width digits, separators, split fields).
- Own-customer registry (HMAC in a cuckoo filter), trace-bound OTP registry, typo repair: `research/firewall/registry.py`.
- Registry evidence added to the calibrated detector; tests in `research/test_registry.py`; experiments E10 to E12.

Headline results (16,000 unseen real log lines, 1,895 injected values):
- All sensitive values removed: 83.5% → **89.7%**
- Mobiles: 69.8% → **100%** (94.2% if only 70% are own customers)
- OTPs: 79.4% → **100%**
- Identifiers hidden 12 ways: 8.3% → **100%**

Report: `docs/research/normaliser-and-registries.md`, PDF in `artifacts/research/`.

Back to [[Threads]]
