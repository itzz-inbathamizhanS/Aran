---
tags: [thread, aran, build, ai]
date: 2026-10-16
status: done
---
# Build AI and immune layers

**Prompt:** "in new thread run the paused job"

Resumed the build paused in [[04 Novel data-flow firewall research]] and merged it into `main` (commits `f8175a5`, `5f20681`).

- [x] NER for names and addresses (English, Hindi, Hinglish) — `research/ai/ner.py`
- [x] OTP/UPI context classifier and calibrated detector — `research/ai/context_clf.py`, `research/ai/detector.py`
- [x] Immune-system flow anomaly detector — `research/immune/ais.py`, `research/immune/flows.py`
- [x] Wired into the firewall and tested on real logs — `research/firewall/aran_firewall.py`, `research/experiment_ai.py`
- [x] Committed and pushed

Real data: CoNLL-2003, HiNER, Hinglish NER tweets, 32,000 Loghub lines (16 systems), UCI SMS ham, labelled BGL.
Report: `docs/research/ai-and-immune-layers.md` (numbers in `research/results_ai.json`).
Weak spots it left: mobiles with no cue word, OTPs next to transaction words (fixed later in [[14 Normaliser and registries]]).

Back to [[Threads]]
