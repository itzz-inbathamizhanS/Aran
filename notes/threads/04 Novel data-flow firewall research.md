---
tags: [thread, aran, research]
date: 2026-10-15
status: in progress
---
# Novel data-flow firewall research

**Prompt (clean):** analyze the problem (AI data-flow firewall for banks detecting Aadhaar, PAN, card numbers, UPI IDs, OTPs; mask/encrypt; trace leaks; DPDP erasure), do a literature survey, find research gaps, build a novel maths/science-grounded solution, then review it. Use the right model per step.

- Research doc: https://claude.ai/code/artifact/b9979855-1cbe-4136-85b0-306318d3c15f
- Prototype on branch `claude/project-thread-wm33w9` (folder `research/`). See [[Branches]].
- Key result: detection by checksum (Verhoeff for Aadhaar, Luhn for cards). On 32,000 real Loghub log lines, 0 of 20,000 ordinary tokens were flagged, and all 20,000 real-format numbers were caught.
- Models: opus tier for every step.

## Follow-ups (2026-10-16)
- **Does it use AI?** Partly. The checksum, tokens, leak tracing and erasure are pure maths on purpose. AI is used for the calibrated detector, NER for names and addresses, and guarding prompts sent to AI tools. The AI parts are not built yet.
- **Team:** Inbathamizhan S (lead) and Aasif Ahmed A (cyber security); SN Arun Vijay and Bharadhwaj M (AI/ML). Students at KARE.
- **Plan split:** AI/ML pair owns NER and the OTP/UPI context classifier; cyber pair owns the immune-system flow detector and wiring into the firewall.
- **Rule:** before any new plan, write beginner learning docs (one per topic) and save them locally for the team.
- **Learning docs written:** [[Aran Learn 1 - Python and Tools]], [[Aran Learn 2 - Indian Identifiers and Check Digits]], [[Aran Learn 3 - Cryptography Basics]], [[Aran Learn 4 - Probability for Detection]], [[Aran Learn 5 - AI and NLP for Detection]], [[Aran Learn 6 - Artificial Immune Systems]]. Learn 7 (data-protection law) is still being written.
- The paused build moved to [[10 Build AI and immune layers]].

Back to [[Threads]]
