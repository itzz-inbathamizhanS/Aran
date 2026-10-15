# Aran: what to research and build next

This is a prioritised list of what Aran still needs, based on a read of the current code (`research/`), the two research documents, and recent outside work. **Update:** items 2 and 5 are now built and measured; see [Normaliser, registries and typo repair](normaliser-and-registries.md). The rest is not built yet. Per the team rule, each item names the learning docs to read before anyone starts on it.

## Where Aran stands today

Built and tested: checksum-complement tokens (M1), per-sink tokens and leak attribution on token dumps (M3), the calibrated detector with NER and the OTP/UPI classifier (M2, partly), the immune flow monitor, and a firewall that runs as a Python script over log files.

Designed in the [research document](aran-research.md) but not yet in code:

| Promised in the research doc | Status in `research/` |
| --- | --- |
| Own-customer registry (HMAC entries in a cuckoo filter) | **Built** (`firewall/registry.py`) |
| Trace-bound OTP registry (detect an OTP because it was issued, not by its shape) | **Built** (`firewall/registry.py`) |
| Leakage ledger (M4) that caps bits learned per customer | Only the offline bit counter exists; no runtime ledger |
| Purpose-bound crypto-shredding with Merkle erasure receipts (M5) | Not built |
| Typo repair (108 single-digit edits and 11 swaps checked against the registry) | **Built**, with an own-token check |
| Normaliser for URL, base64, JSON escapes and split fields | **Built** (`firewall/normalise.py`) |
| Choke points: API proxy, log transform, AI gateway | Not built. The firewall is a function called from an experiment script |

Measured weak spots ([AI and immune layers, section 7](ai-and-immune-layers.md)): mobiles with no cue word (68% recall), English OTPs next to transaction words (80%), names in English logs (87%), 299 lines per second, and the immune layer failing on line-level logs (AUROC 0.34 on BGL).

A judge's first question will be "can I see it running?" and the second "is everything in your slides actually implemented?" Today the honest answer to both is "partly". The list below fixes that first, then adds the pieces that make Aran stand out.

## The list, in priority order

Effort is in working days for the owning pair, assuming the learning docs are already done.

### Tier 1: needed before any demo

| # | Addition | Why it matters to judges and banks | Effort | Owners | Read first |
| --- | --- | --- | --- | --- | --- |
| 1 | **Live gateway and dashboard.** A small FastAPI reverse proxy that sits in front of a fake bank API, plus a log-shipping endpoint, both calling `AranFirewall`. A one-page dashboard shows each request before and after, the tokens issued per sink, immune alerts, and an erasure receipt. | Turns a research prototype into something a judge can click. It also proves the "inline, before anything is stored" claim with real latency numbers. | 5 | Inbathamizhan, Aasif (proxy, firewall wiring); Bharadhwaj, Arun (dashboard panels for detector scores and alerts) | Learn 1, Learn 8 |
| 2 | **Done.** **Own-customer registry and trace-bound OTP registry.** HMAC-keyed entries in a cuckoo filter for the bank's own Aadhaar, card and mobile numbers; an OTP registry keyed by trace ID with a short expiry. Feed both as evidence into the existing detector. | This is the design's real answer to both weak spots: a bare 10-digit number that is a known customer's mobile is caught with no cue word, and an OTP is caught because it was issued, not because of the words around it. It also removes the 81 HDFS block IDs that pass Luhn. | 3 | Inbathamizhan, Aasif (registries, HMAC keys); Bharadhwaj, Arun (add registry evidence to the detector and re-run E7 and E9) | Learn 3 (HMAC), Learn 4 (Bloom and cuckoo filters) |
| 3 | **Fix the two ML weak spots directly.** Mobiles: add Indian numbering features (starts with 6 to 9, field names like `mob`, `ph`, `contact` in JSON keys and `key=value` pairs). OTPs: add hard negatives such as "txn TXN123 is 482913" with OTP labels and "OTP" absent, and an "OTP word within N tokens beats txn word" feature. | Raises the two numbers judges will see in the weak-spot line, for banks that cannot share a customer registry. Target: mobile recall above 85% and English OTP recall above 92% with the false-alarm count on real logs kept at or below today's 60. | 2 | Bharadhwaj, Arun | Learn 4, Learn 5 |
| 4 | **Crypto-shredding with erasure receipts (M5).** Per-customer, per-purpose keys (a local software KMS is fine for the demo), vault-mode random tokens, key destruction, and a Merkle log that returns a signed inclusion proof as the receipt. Include the KYC time-lock. | DPDP erasure is the feature banks worry about most, and the DPDP Rules 2025 obligations take full effect in May 2027, so banks are buying for this now. A live "erase this customer, here is your receipt, the tokens in the logs are now dead" moment is the strongest demo in the project. | 4 | Inbathamizhan, Aasif | Learn 3 (sections on Merkle trees and crypto-shredding), Learn 7 |
| 5 | **Done.** **Normaliser and typo repair.** Decode URL, base64 and JSON escapes, join split numeric fields, map Devanagari and Tamil digits (०-९, ௦-௯) and full-width digits to ASCII, strip spaces and dashes inside numbers. Then the typo check against the registry. | Closes two High and Medium attacks from the research doc's own critical review. Evasion by encoding is the first thing a security judge will try. | 2 | Inbathamizhan, Aasif | Learn 1, Learn 2 |

### Tier 2: what makes Aran stand out

| # | Addition | Why it matters | Effort | Owners | Read first |
| --- | --- | --- | --- | --- | --- |
| 6 | **AI gateway for LLM prompts.** An OpenAI-compatible endpoint: typed tokens such as `<PAN_7>` go to the model, and the reply is detokenised only for the authorised user. Log every detokenise call per caller. | Banks are rolling out chatbots and copilots, and RBI's FREE-AI framework (August 2025) asks them to govern data going into AI. Raw Aadhaar in prompts was attack A2 in our own test. Few hackathon teams will have this. | 3 | Bharadhwaj, Arun (gateway and prompt handling); Inbathamizhan, Aasif (detokenise log and access control) | Learn 8, Learn 5 |
| 7 | **Transformer NER in a cascade.** Try an open PII model such as GLiNER-PII or GLiNER2-PII, or IndicNER, on names and addresses. Run it only on lines the cheap stages mark as free text, so speed does not collapse. | Name recall is 74% end to end. A zero-shot model also lets the team add new entity types (employer, nominee, IFSC branch name) without new training data. The cascade keeps the 299 lines per second figure from getting worse, and should raise it. | 4 | Bharadhwaj, Arun | Learn 5, Learn 9 |
| 8 | **Tamil (and other Indic) support.** Add Tamil to NER using the Naamapadam dataset (AI4Bharat, 11 Indian languages) and Tamil OTP and address phrasings to `synth.py`. | Hindi and Hinglish are covered, but a Tamil Nadu bank's call-centre notes and SMS logs are in Tamil and Tanglish. Local relevance is a strong point for a KARE team. | 3 | Bharadhwaj, Arun | Learn 5, Learn 9 |
| 9 | **Red-team evaluation.** A script that generates evasions (spacing, mixed scripts, encodings, split fields, look-alike tokens, prompt-injection attempts against the AI gateway) and reports catch rate per trick, before and after items 5 and 6. | Turns "we thought about attacks" into a measured table. Pairs well with the honest weak-spots style the team already uses. | 2 | Inbathamizhan, Aasif | Learn 2, Learn 3 |

### Tier 3: research for after the hackathon

| # | Addition | Why it matters | Effort | Owners | Read first |
| --- | --- | --- | --- | --- | --- |
| 10 | **KYC document images.** OCR on scanned Aadhaar and PAN cards found in uploads or tickets, with Verhoeff used to confirm the OCR read, then masking of the first 8 digits as UIDAI requires. Open tools exist to start from (for example openbharatocr). | Much leaked Aadhaar data is images, not text, and no text detector sees it. Verhoeff as an OCR error check is a neat reuse of Aran's core idea. | 5 | Bharadhwaj, Arun | Learn 10 |
| 11 | **Immune layer on templates, not lines.** Parse logs into templates first (the Drain algorithm), and add tolerance by affinity (delete detectors near a confirmed false alarm, not only those covering it). | Fixes the honest negative result on BGL, where unseen templates looked like attacks. | 4 | Inbathamizhan, Aasif | Learn 6 |
| 12 | **Speed.** Port the checksum, FF1 and regex stages to Rust or vectorised NumPy, as step 1 of the research doc's implementation plan. Target 10,000 lines per second per core. | A bank's log volume is millions of lines per hour; 299 lines per second will be the first technical objection. | 5 | Inbathamizhan, Aasif | Learn 1 |
| 13 | **Paper and legal review.** Write up Theorems 1 to 3 and E1 to E9 as a workshop paper, and get a short legal opinion on whether crypto-shredding counts as DPDP erasure. | The legal point is the one open question the research doc flags; a paper strengthens any later funding or incubation pitch. | ongoing | Inbathamizhan (lead), everyone contributes | Learn 7 |

## Suggested order

If the team has about two weeks before a demo: items 5 and 2 first (they make every later number better), then 3 and 4 in parallel (one per pair), then 1 to put it all on screen. Item 6 is the best single addition if there is a third week.

| Week | Cybersecurity pair (Inbathamizhan, Aasif) | AI/ML pair (Bharadhwaj, Arun) |
| --- | --- | --- |
| 1 | 5 Normaliser and typo repair, 2 Registries | 3 Mobile and OTP fixes, wire registry evidence into the detector |
| 2 | 4 Crypto-shredding and receipts, 1 Gateway | 1 Dashboard panels, re-run E7 and E9 and update the README tables |
| 3 (if time) | 9 Red-team table | 6 AI gateway, or 7 Transformer NER |

## Learning docs needed before building

Learn 1 to 7 already cover most of this. Three new beginner docs cover the rest:

- [Learn 8: Web APIs and Proxies](../learning/08-web-apis-and-proxies.md). HTTP, JSON, FastAPI, reverse proxies and the chat API format. Needed for items 1 and 6.
- [Learn 9: Transformers and Zero-Shot NER](../learning/09-transformers-and-zero-shot-ner.md). Embeddings, tokenisation of Indic scripts, attention, GLiNER and IndicNER, and distillation. Needed for items 7 and 8.
- [Learn 10: OCR Basics](../learning/10-ocr-basics.md). Tesseract, measuring OCR accuracy, Verhoeff as an OCR check, and masking on images. Needed for item 10.

## Sources

- DPDP Rules 2025 phased rollout: [AZB & Partners, November 2025](https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/), [PIB notification document](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf).
- Open PII models: [GLiNER-PII (Knowledgator)](https://huggingface.co/knowledgator/gliner-pii-base-v1.0), [NVIDIA GLiNER-PII model card](https://build.nvidia.com/nvidia/gliner-pii/modelcard), [GLiNER2-PII (Fastino Labs)](https://pioneer.ai/research/gliner2-pii-a-multilingual-model-for-personally-identifiable-information-extraction).
- PII leakage in LLMs: [Understanding PII Leakage in Large Language Models: A Systematic Survey, IJCAI 2025](https://www.ijcai.org/proceedings/2025/1156), [PII-Scope benchmark](https://arxiv.org/html/2410.06704v1).
- Indian ID document OCR: [openbharatocr on PyPI](https://pypi.org/project/openbharatocr/0.4.0b0).
- Naamapadam Indic NER dataset: Mhaske et al., ACL 2023 (AI4Bharat).
- Drain log parser: He et al., ICWS 2017. Loghub: Zhu et al., ISSRE 2023.
- RBI Framework for Responsible and Ethical Enablement of AI (FREE-AI), August 2025.
