---
tags: [thread, aran, build]
date: 2026-10-16
status: done
---
# Ledger, AI gateway and red team

"Continue all": built the roadmap items not covered by the live-console thread.

- Item 3, mobile and OTP fixes: new features in `research/ai/detector.py` and `research/ai/context_clf.py`, hard training lines in `research/synth.py`.
- M4 leakage ledger: `research/firewall/ledger.py`, wired into `AranFirewall(ledger=..., mask_policy=...)`.
- Item 6, AI gateway: `research/gateway/ai_gateway.py` (placeholders, role-based detokenising, hash-chained audit log, FastAPI router).
- Item 9, red team: 26 hiding tricks in `research/experiment_next.py`; two detector bugs fixed; number words, look-alike letters and double escapes added to the normaliser.
- Items 7 and 12, first step: cached NER features and a cheap NER gate.
- Learn 12 for the team; experiments E13 to E16; detector model for the live console rebuilt.

Headline results (real logs of 8 unseen systems):
- All sensitive values removed, no registries: 83.5% → **91.0%**
- Mobiles / OTPs: 69.8% / 79.4% → **100% / 100%** (on phrasings written after the fix: 100% / 84.7%, and 17% of "cheque no" numbers wrongly taken as mobiles)
- Identifiers a vendor can narrow below 20 bits by joining its systems: 14,175 → **0**
- Raw values reaching an LLM through the gateway: 100% → **7.8%** (names and addresses only); 0 of 5 attack types leaked
- Hiding tricks fully caught: 14 → **22 of 26**
- Speed: 274 → **654** lines per second

Report: `docs/research/ledger-gateway-redteam.md`, PDF in `artifacts/research/`; Learn 12 in `docs/learning/`.

Back to [[Threads]]
