---
tags: [index, threads]
updated: 2026-10-19
---
# Threads

Every project thread for Aran, oldest first.

| # | Thread | Status |
|---|---|---|
| 1 | [[01 Create Aran repo]] | resolved |
| 2 | [[02 Aran local setup and README]] | review-ready |
| 3 | [[03 Second Brain project setup]] | done |
| 4 | [[04 Novel data-flow firewall research]] | in progress (learning docs) |
| 5 | [[05 Local workflow and Obsidian rules]] | done |
| 6 | [[06 Save every time]] | done |
| 7 | [[07 Save all threads]] | done |
| 8 | [[08 Save artifacts locally]] | done (hourly sync running) |
| 9 | [[09 Save all threads to Obsidian]] | done |
| 10 | [[10 Build AI and immune layers]] | done (merged to main) |
| 11 | [[11 Remember and save everything]] | done |
| 12 | [[12 Next features for Aran]] | done (roadmap) |
| 13 | [[13 Learning docs 8 to 10]] | done |
| 14 | [[14 Normaliser and registries]] | done (roadmap items 2, 5) |
| 15 | [[15 Sync GitHub Obsidian Notion]] | done |
| 16 | [[16 Ledger AI gateway and red team]] | done (roadmap items 3, 6, 9, M4; first step on 7, 12) |
| 17 | [[17 Post-quantum cryptography]] | done (roadmap item 14, E17 to E19, Learn 14) |
| 18 | [[18 UI design spec]] | done (full page-by-page design spec, Learn 15) |
| 19 | [[19 Full project story]] | done (one explainer of the whole project, Markdown and PDF) |

## Decisions
- All work happens locally in `D:\Aran`; nothing goes to GitHub until **save** or **push**.
- Commits are under Inbathamizhan S with no tool or assistant credits.
- Test data is checksum-valid but generated; no real people's IDs.
- Beginner learning docs come before every new plan.
- Every thread gets a note here; every artifact is saved to `artifacts/` as Markdown and PDF.
- Team: Inbathamizhan S (lead), Aasif Ahmed A (cyber); SN Arun Vijay, Bharadhwaj M (AI/ML).

## Open to-do
- [ ] Set the GitHub repo description.
- [x] Commit the untracked vault files on the next save.
- [x] Research prototype is on `main`.
- [x] Roadmap item 4: crypto-shredding with erasure receipts (live console thread).
- [x] Roadmap item 1: live gateway and dashboard (live console thread).
- [x] Roadmap items 3, 6, 9 and the M4 ledger ([[16 Ledger AI gateway and red team]]).
- [ ] Fix the two item 3 regressions found on unseen phrasings (OTP value before "PIN"; "cheque no" taken as a mobile).
- [ ] Run the AI gateway against a real model; transformer NER for names (item 7); vectorised speed-up (item 12).
- [ ] Items 8 (Tamil NER), 10 (OCR on KYC images), 11 (immune layer on templates).
- [ ] Get a legal view on crypto-shredding as DPDP erasure (roadmap item 13).
- [x] Post-quantum upgrade: hybrid receipts, hybrid key sealing, AES-256 FF1, CBOM ([[17 Post-quantum cryptography]]).
- [ ] Hybrid TLS (X25519MLKEM768) in front of the proxy and AI gateway; SLH-DSA on Merkle roots.
