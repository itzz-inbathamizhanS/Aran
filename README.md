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

On top of these sit an AI layer and a bio-inspired immune layer, reported in [AI and immune layers](docs/research/ai-and-immune-layers.md):

| Layer | What it does | Owner pair |
| --- | --- | --- |
| NER (names and addresses) | CRF model for English, Hindi and Hinglish log text | Bharadhwaj, Arun |
| OTP and UPI context classifier | Tells OTPs from ports and order numbers, and UPI IDs from e-mails and user@host strings | Bharadhwaj, Arun |
| Calibrated detector (M2) | Fuses checksum, context and NER evidence into one calibrated probability per finding | Bharadhwaj, Arun |
| Artificial immune system | Negative selection learns normal data flows and flags non-self flows, with immune memory | Inbathamizhan, Aasif |
| Firewall wiring | Detect, tokenise or destroy, count flows, alert | Inbathamizhan, Aasif |
| Normaliser | Undoes URL, JSON and HTML escapes, Devanagari, Tamil and full-width digits, separators, zero-width characters, split fields and base64 before detection | Inbathamizhan, Aasif |
| Own-customer and OTP registries | HMAC entries in a cuckoo filter for the bank's own identifiers; OTPs bound to the trace that issued them; typo repair against the registry | Inbathamizhan, Aasif (registries), Bharadhwaj, Arun (detector evidence) |

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

### AI and immune layers (E5 to E9)

Tested on 16,000 real log lines from 8 Loghub systems the models never saw, with 1,895 generated sensitive values injected into 1,110 of them. Full tables in [AI and immune layers](docs/research/ai-and-immune-layers.md).

| Test | Prototype regex | Aran with AI layers |
| --- | --- | --- |
| Sensitive values removed by the firewall | 46.1% | 83.5% |
| Names and addresses removed | 0% | 74% and 90% |
| Clean real lines wrongly changed or flagged | 2,357 (15.8%) | 122 (0.8%) |
| False alarms on real logs (all types) | 2,506 | 60 |
| Tokens re-detected as real Aadhaar or card numbers | | 0 |
| NER person F1: CoNLL English / HiNER Hindi / Hinglish tweets | | 0.85 / 0.76 / 0.69 |
| Calibration error of the detector (ECE) | | 0.015 |
| Simulated data-flow attacks caught by the immune layer (6 scenarios) | static rules 90%, Isolation Forest 20% | 100%, at 0.6% false alarms |

Weak spots, stated plainly: mobiles with no cue word (68% recall), English OTPs next to transaction words (80%), and line-level anomalies on real BGL logs, where the immune layer did worse than a severity rule.

### Normaliser, registries and typo repair (E10 to E12)

Same 16,000 real lines as E9. Full tables in [Normaliser, registries and typo repair](docs/research/normaliser-and-registries.md).

| Test | Before | After |
| --- | --- | --- |
| Sensitive values removed by the firewall | 83.5% | 89.7% |
| Mobiles with no cue word removed | 69.8% | 100% (94.2% at 70% registry coverage) |
| OTPs removed | 79.4% | 100% (trace-bound OTP registry, with 70,000 other live OTPs) |
| Identifiers hidden 12 ways (Devanagari or Tamil digits, URL or JSON escapes, separators, base64, split fields) | 8.3% | 100% |
| Aadhaar and card numbers with one typo | 0% | 99.2% |
| Clean real lines wrongly changed | 122 | 122 |
| Tokens wrongly flagged | 0 | 0 |

The mobile and OTP weak spots are closed for a bank that registers its own customers and logs a trace ID. Names (74%) and addresses (90%) are unchanged.

## Live console

`app/` is a working website that runs Aran's real code: send a bank request and watch it get protected, see why each value was caught, trace a leaked dump to the sink that leaked it, erase a customer's purpose key and verify the signed Merkle receipt, teach the immune layer normal traffic (real Loghub logs replayed) and run attack drills, and run the test suite on the server. No value on it is hard-coded; only the customers' identifiers are generated, because real ones must never be used.

| Part | What it is |
| --- | --- |
| `app/server/engine.py` | Detector + normaliser + registries + firewall in vault mode + purpose vault + immune layer on live flow windows + real-log replay |
| `app/server/main.py` | FastAPI routes the console calls (`/api/...`; interactive docs at `/docs`) |
| `app/server/build_models.py` | Trains the detector once (same training as E5 to E7) and saves `app/server/models/detector.pkl` |
| `research/firewall/shredder.py` | Purpose-bound crypto-shredding (M5): per-customer per-purpose AES-256-GCM keys, vault tokens that fail their checksum, RFC 6962 Merkle log, Ed25519-signed erasure receipts, KYC retention lock. Tests in `research/test_shredder.py` |
| `app/web/` | React + Vite frontend, seven pages |
| `Dockerfile` | Builds the frontend and serves everything from one container |

Run it locally (details in [Learn 11](docs/learning/11-frontend-basics.md)):

```
cd research && ./fetch_data.sh && cd ..
pip install -r app/server/requirements.txt
cd app/server && uvicorn main:app --port 8000       # API + built frontend
cd app/web && npm install && npm run dev            # frontend with live reload on :5173
```

## Repository layout

```
docs/
  research/        Research document, AI and immune layers report, roadmap
  learning/        Eleven beginner learning docs (Markdown, open in Obsidian or GitHub)
artifacts/
  learning/        PDF copies of the learning docs, for printing or offline reading
  website/         Website design-system prompt
  Frontend with Claude Design/  Frontend guide and dashboard prompts
  research/        PDF results reports
app/
  server/          FastAPI server running the real firewall, vault and immune layer
  web/             React console (seven pages)
notes/             Obsidian notes: threads, daily notes, artifacts and branches indexes
templates/         Obsidian templates
research/
  aran_core.py     Verhoeff, Luhn, NIST SP 800-38G FF1, checksum-complement tokens, min-entropy counting
  test_core.py     Tests, including the NIST FF1 sample vectors
  experiment.py    Experiments E1 to E4 on real logs
  results.json     Raw results
  fetch_data.sh    Downloads the Loghub samples
  synth.py         Generated test identifiers and bank log lines (checksum-valid, belong to no one)
  ai/              NER, OTP/UPI context classifier, calibrated detector (Bharadhwaj, Arun)
  immune/          Artificial immune system and data-flow simulation (Inbathamizhan, Aasif)
  firewall/        The wired firewall, normaliser, customer and OTP registries (Inbathamizhan, Aasif)
  experiment_ai.py Experiments E5 to E9
  results_ai.json  Raw results
  test_ai.py       Tests for the AI, immune and firewall layers
  fetch_ai_data.sh Downloads CoNLL-2003, HiNER, Hinglish NER, UCI SMS and labelled BGL logs
  experiment_registry.py  Experiments E10 to E12 (normaliser, registries, typo repair)
  results_registry.json   Raw results
  test_registry.py        Tests for the normaliser and registries
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

# AI and immune layers
pip install scikit-learn sklearn-crfsuite
./fetch_ai_data.sh
python -m pytest test_ai.py
python experiment_ai.py                             # about 20 minutes

# Normaliser and registries
python -m pytest test_registry.py
python experiment_registry.py                       # about 15 minutes after experiment_ai.py
```

Step-by-step Windows setup, with fixes for common errors, is in [Learn 1](docs/learning/01-python-and-tools.md).

## Documents

- [Research document](docs/research/aran-research.md): problem analysis, baseline, literature survey, research gaps, novel design with theorems, critical review, results, plan and sources.
- [AI and immune layers](docs/research/ai-and-immune-layers.md): NER, OTP/UPI classifier, calibrated detector, artificial immune system and firewall wiring, with results on real data and the weak spots.
- [Normaliser, registries and typo repair](docs/research/normaliser-and-registries.md): roadmap items 2 and 5, built and measured (E10 to E12). [PDF](artifacts/research/Aran%20-%20Normaliser%20Registries%20and%20Typo%20Repair.pdf)
- [Roadmap: what to research and build next](docs/research/aran-roadmap.md): what is designed but not yet built, and a prioritised list of 13 additions with effort, owners and the learning docs to read first.

### Learning path for the team

The team is new to this technology, so read these in order before starting any build task. Each doc starts from zero, explains every idea in plain words, works through examples taken from Aran's own code and data (every number in them was checked by running the code), and ends with practice tasks and free further reading.

| # | Doc | Who | Time | What you will be able to do | PDF |
| --- | --- | --- | --- | --- | --- |
| 1 | [Python and Tools](docs/learning/01-python-and-tools.md) | Everyone, first | ~6 h | Set up the repo on Windows, use git as a team, read every file in `research/`, write a regex detector with tests | [PDF](artifacts/learning/Aran%20Learn%201%20-%20Python%20and%20Tools.pdf) |
| 2 | [Indian Identifiers and Check Digits](docs/learning/02-identifiers-and-check-digits.md) | Everyone | ~5 h | Explain the shape of Aadhaar, card, PAN, UPI and OTP; run Luhn and Verhoeff by hand; explain why Aran tokens can never pass the checksum | [PDF](artifacts/learning/Aran%20Learn%202%20-%20Indian%20Identifiers%20and%20Check%20Digits.pdf) |
| 3 | [Cryptography Basics](docs/learning/03-cryptography-basics.md) | Inbathamizhan, Aasif (everyone reads section 4) | ~7 h | Use AES-GCM and HMAC correctly, explain FF1 through a worked Feistel example, build a Merkle tree, explain crypto-shredding with purpose-bound keys | [PDF](artifacts/learning/Aran%20Learn%203%20-%20Cryptography%20Basics.pdf) |
| 4 | [Probability for Detection](docs/learning/04-probability-for-detection.md) | Everyone | ~6 h | Compute precision and recall, combine evidence with Bayes' rule, size a Bloom filter, apply the birthday bound, measure mask leakage in bits | [PDF](artifacts/learning/Aran%20Learn%204%20-%20Probability%20for%20Detection.pdf) |
| 5 | [AI and NLP for Detection](docs/learning/05-ai-and-nlp.md) | Bharadhwaj, Arun | ~8 h | Train and score a CRF name finder, build a character n-gram OTP classifier, calibrate its probabilities | [PDF](artifacts/learning/Aran%20Learn%205%20-%20AI%20and%20NLP%20for%20Detection.pdf) |
| 6 | [Artificial Immune Systems](docs/learning/06-artificial-immune-systems.md) | Inbathamizhan, Aasif | ~6 h | Turn data flows into feature points, implement negative selection, tune it and compare it with Isolation Forest | [PDF](artifacts/learning/Aran%20Learn%206%20-%20Artificial%20Immune%20Systems.pdf) |
| 7 | [Data-Protection Law Basics](docs/learning/07-data-protection-law.md) | Everyone | ~4 h | Map each Aran mechanism to DPDP, CERT-In, UIDAI, RBI and PCI DSS duties, walk through a breach and an erasure request, answer judges' questions | [PDF](artifacts/learning/Aran%20Learn%207%20-%20Data-Protection%20Law%20Basics.pdf) |
| 8 | [Web APIs and Proxies](docs/learning/08-web-apis-and-proxies.md) | Everyone (roadmap items 1 and 6) | ~6 h | Explain HTTP and JSON, build an API with FastAPI, build a reverse proxy that tokenises Aadhaar in responses, build an AI gateway that hides identifiers from a chatbot | [PDF](artifacts/learning/Aran%20Learn%208%20-%20Web%20APIs%20and%20Proxies.pdf) |
| 9 | [Transformers and Zero-Shot NER](docs/learning/09-transformers-and-zero-shot-ner.md) | Bharadhwaj, Arun (roadmap items 7 and 8) | ~8 h | Explain embeddings, subword tokenisation and attention, fine-tune for NER, use GLiNER and IndicNER, speed up with a cascade and distillation | [PDF](artifacts/learning/Aran%20Learn%209%20-%20Transformers%20and%20Zero-Shot%20NER.pdf) |
| 10 | [OCR Basics](docs/learning/10-ocr-basics.md) | Bharadhwaj, Arun (roadmap item 10) | ~5 h | Read ID card images with Tesseract, use Verhoeff to catch misreads, measure OCR accuracy, mask the first 8 Aadhaar digits on the image | [PDF](artifacts/learning/Aran%20Learn%2010%20-%20OCR%20Basics.pdf) |
| 11 | [Frontend Basics](docs/learning/11-frontend-basics.md) | Everyone (the live console) | ~5 h | Explain HTML, CSS and JavaScript, build React components with state and effects, call the Aran API with fetch, run the console locally and add a panel to it | [PDF](artifacts/learning/Aran%20Learn%2011%20-%20Frontend%20Basics.pdf) |

## Artifacts

- [Learning docs as PDFs](artifacts/learning/): print-ready copies of the learning docs above.
- [Normaliser, registries and typo repair (PDF)](artifacts/research/Aran%20-%20Normaliser%20Registries%20and%20Typo%20Repair.pdf): results report for roadmap items 2 and 5.
- [Website design-system prompt for the website design tool](artifacts/website/Aran-Website-Design-System-Prompt.md): brand, colours, typography, components and page content for the Aran website.
- [Frontend guide with Claude Design](artifacts/Frontend%20with%20Claude%20Design/Aran%20-%20Frontend%20Guide%20with%20Claude%20Design.md): step-by-step guide, design-system and console prompts for restyling the live console, and the live API it uses.
- [Artifacts index](artifacts/README.md): every artifact by thread, with live links. Older Markdown and PDF copies of the first docs are in [artifacts/Data-flow firewall research](artifacts/Data-flow%20firewall%20research/).
- [Obsidian vault home](Home.md): open the repo folder as a vault; thread notes are in [notes/threads](notes/threads/), indexed in [notes/Threads.md](notes/Threads.md).

## Regulations addressed

DPDP Act 2023 and DPDP Rules 2025 (safeguards, 72-hour breach report, erasure), CERT-In Directions 2022 (6-hour reporting, 180-day logs), UIDAI Aadhaar Data Vault, RBI payment data and card tokenisation rules, and PCI DSS. Treating crypto-shredding as DPDP erasure still needs legal confirmation.
