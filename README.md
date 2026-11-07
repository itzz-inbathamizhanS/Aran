# Aran

> An algebraic data-flow firewall for Indian banks. It detects Aadhaar, PAN, card numbers, UPI IDs and OTPs in APIs, logs and AI tools, protects them before they are stored or shared, traces any leak back to its source, and supports DPDP-compliant erasure.

**Domain:** Banking, Financial Services & FinTech
**Team (KARE, Kalasalingam Academy of Research and Education):** Inbathamizhan S (lead, cybersecurity), Aasif Ahmed A (cybersecurity), Bharadhwaj M (AI/ML), SN Arun Vijay (AI/ML)

## Try it live

Everything below runs from this `main` branch and redeploys on every push.

| What | Link | Runs on |
| --- | --- | --- |
| Firewall console (the main demo) | [aran-console.vercel.app](https://aran-console.vercel.app) | Vercel serves `app/ui`; every `/api` call goes to the Render server |
| Firewall console, direct | [aran-console.onrender.com](https://aran-console.onrender.com) | Render, from the `Dockerfile` |
| Aran Cloud (SaaS and firewall as a service) | [aran-cloud.vercel.app](https://aran-cloud.vercel.app) | Vercel front door to the Render `aran-apps` service |
| Bank A (legacy, stores raw identifiers) | [aran-bank-a.vercel.app](https://aran-bank-a.vercel.app) | same |
| Bank B (protected by Aran) | [aran-bank-b.vercel.app](https://aran-bank-b.vercel.app) | same |

The Render servers sleep when idle, so the first visit after a quiet spell can take about a minute. Until 19 Nov 2026 [a scheduled job](.github/workflows/keep-alive.yml) pings them every 5 minutes, 06:30 to 23:30 IST. How the front doors work: [deploy/vercel](deploy/vercel/README.md) and [docs/deploy.md](docs/deploy.md).

## Start here

- **Read:** [The full project story, from zero to now](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.md) ([PDF](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.pdf)). Every technical word explained, the research used, how the solution was derived, what was built and every result.
- **Pitch:** [The BuildX pitch deck (PowerPoint)](artifacts/Pitch%20deck/Aran%20-%20BuildX%20Pitch%20Deck.pptx) ([PDF](artifacts/Pitch%20deck/Aran%20-%20BuildX%20Pitch%20Deck.pdf)): 12 slides on the BuildX template: problem, solution, how it works, results, firewall as a service, live demo, market, roadmap and team (team Iravora Void, team ID BX-062).
- **Submit:** [BuildX Business Model Canvas (BX062_BMC.pdf)](artifacts/BuildX%20submission/BX062_BMC.pdf) ([preview](artifacts/BuildX%20submission/BX062_BMC-preview.png)) and [the pitch deck renamed for submission (BX062_Deck.pdf)](artifacts/BuildX%20submission/BX062_Deck.pdf). The canvas pitches Aran as a data-flow firewall for any organisation that holds personal data.
- **Watch:** [The full explainer course (76 min, 6 parts)](artifacts/Explainer%20video%20v2/README.md), starting with [Part 1: The problem](artifacts/Explainer%20video%20v2/Aran%20-%20Explainer%20Video%20v2%20-%20Part%201%20-%20The%20problem.mp4). Short on time? The [24-minute quick tour](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.mp4) ([subtitles](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.srt)).
- **Learn:** the [learning path](#learning-path-for-the-team) below, one beginner doc per topic.

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

### Mobile and OTP fixes, leakage ledger, AI gateway, red team and speed (E13 to E16)

Roadmap items 3, 6, 9, the M4 leakage ledger, and a first step on items 7 and 12. Full tables, and the two results that went the wrong way, in [Ledger, AI gateway and red team](docs/research/ledger-gateway-redteam.md).

| Test | Before | After |
| --- | --- | --- |
| Sensitive values removed, no registries (E9, 8 unseen real systems) | 83.5% | 91.0% |
| Mobiles with no cue word / OTPs next to transaction words, no registries | 69.8% / 79.4% | 100% / 100% |
| Same, on phrasings written after the fix (E13b) | 67.2% / 94.3% | 100% / 84.7% (17% of "cheque no" numbers taken as mobiles) |
| Clean real lines wrongly changed (14,890) | 122 | 150, or 130 with the NER gate |
| Identifiers a vendor can narrow to under 20 bits by joining its own systems (E13, 20,000 customers) | 14,175 | 0 (ledger shrinks 9.7% of masks) |
| Raw values reaching an LLM provider through the AI gateway (E14, 2,000 prompts) | 100% | 7.8%, all names or addresses; every number type 0% |
| Prompt-injection, planted-placeholder and conversation-hijack attacks that leaked a value | | 0 of 5 attack types |
| Hiding tricks fully caught, of 26 (E15 red team) | 14 | 22; two detector bugs found and fixed (a number before a full stop; mixed-script numbers crashed the detector) |
| Lines per second on the E9 run, same output (E16) | 274 | 654 |

### Post-quantum upgrade (E17 to E19)

Most of Aran is symmetric (FF1 on AES, AES-256-GCM, HMAC, SHA-256 Merkle log) and already quantum-safe. Three parts were not, and are now fixed with hybrid classical plus NIST post-quantum crypto. Full tables in [Post-quantum upgrade](docs/research/post-quantum.md); read [Learn 14](docs/learning/14-post-quantum-cryptography.md) first.

| Test | Before | After |
| --- | --- | --- |
| Erased values recovered after a (simulated) quantum break of X25519, from one recorded night of key backups (E17, 1,200 values) | 100% | 0% with X25519 + ML-KEM-768 sealing |
| Erasure receipts a quantum attacker can forge | Yes (Ed25519) | No: Ed25519 + ML-DSA-65, both required, downgrade blocked |
| FF1 key strength against Grover's algorithm (live console) | 64 bits | 128 bits (AES-256, checked on NIST FF1 samples 7 and 8) |
| Quantum-broken algorithms without a post-quantum partner (CBOM, E19) | Ed25519, 3 uses | 0 |
| Receipt size / verifications per second (E18) | 904 B / 5,657 | 8,155 B / 1,930 |

New finding: crypto-shredding (M5) only erases if the destroyed key never travelled under quantum-breakable key exchange; otherwise an attacker who recorded that traffic can un-erase the customer later. `python -m pqc.cbom` (from `research/`) writes a CycloneDX cryptographic bill of materials, which India's quantum-safe task force asks vendors for from 2027 to 2028.


## What is built

Aran has three parts that share one design system (`app/ui/kit/`) and one menu (`app/ui/kit/sitemap.js`).

| Part | Folder | Port | What it does |
| --- | --- | --- | --- |
| Aran core and console | `app/` | 8000 | The real firewall, vault and immune layer behind a FastAPI server, plus the console website |
| Aran Cloud | `aran_cloud/` | 8100 | The SaaS: workspaces, scoped API keys, rate limits, metering, plans, team roles, audit, dashboard, and the firewall-as-a-service features below |
| Demo banks | `demo_bank/` | 9001, 9002 | Bank A stores and sends raw identifiers; Bank B sends every copy through Aran Cloud. `:9002/compare` shows both side by side |
| Edge data plane | `aran_edge/` | | A self-hosted Docker image that cleans traffic inside a bank's own network and reports only counts to Cloud |
| SDK | `aran_sdk/` | | The small Python client the banks use to call Aran Cloud |

### The console

The console at `/` is the team's own design (source in `ui-design/`), wired so that every number, token, receipt and alert comes from the live server. No value on it is hard-coded; only the customers' identifiers are generated, because real ones must never be used. How each screen maps to its endpoint: [app/ui/README.md](app/ui/README.md) and [Learn 17](docs/learning/17-wiring-a-design-to-a-live-api.md).

- **Guided tour:** thirteen animated chapters, each drawn from a real server response: requests flowing through the firewall as packets, false alarms on 300 real log lines, Verhoeff and Luhn maths digit by digit, the ten FF1 rounds of a real token, twelve disguises of one Aadhaar, a leak traced back to its source, an erasure with a Merkle receipt your browser re-checks, the immune layer's radar, and what an AI model provider sees. Two chapters are 3D scenes built with three.js ([Learn 16](docs/learning/16-3d-graphics-with-threejs.md)).
- **Console pages:** send any request, trace any dump, erase customers, run attack drills and run the test suite.
- **Demo features:** Beat the firewall from your phone by QR code (`#arena-live`), Without Aran versus with Aran (`#versus`), the leakage ledger (`#ledger`), card photo scan with OCR (`#scan`), post-quantum keys (`#quantum`) and the customer's own view (`#me`). Ideas: [Standout frontend ideas](artifacts/Standout%20frontend%20ideas/Aran%20-%20Standout%20Frontend%20Ideas.md).
- **Tamil and Hindi** through the top-bar switch ([Learn 19](docs/learning/19-translating-a-website.md)), and a **presenter mode** (`?present=1`) with clicker keys and an offline replay ([Learn 20](docs/learning/20-presenter-mode-and-offline-replay.md)).
- The earlier React console (`app/web/`) stays at `/classic`.
- Set `ARAN_LLM_URL`, `ARAN_LLM_KEY` and `ARAN_LLM_MODEL` to point the AI chapter at a real OpenAI-compatible model; without them it uses an echo stand-in and no data leaves the machine.

| Core file | What it is |
| --- | --- |
| `app/server/engine.py` | Detector, normaliser, registries, firewall in vault mode, purpose vault, immune layer on live flow windows, real-log replay |
| `app/server/main.py` | The FastAPI routes the console calls (`/api/...`; interactive docs at `/docs`) |
| `app/server/build_models.py` | Trains the detector once and saves `app/server/models/detector.pkl` |
| `research/firewall/shredder.py` | Purpose-bound crypto-shredding (M5): per-customer per-purpose AES-256-GCM keys, RFC 6962 Merkle log, receipts signed with Ed25519 + ML-DSA-65 |

### Aran Cloud and the demo banks

A bank signs up on Aran Cloud, gets a scoped key and calls `/v1/protect` or `/v1/transactions/protect` through the SDK. Bank A and Bank B have accounts, payments on UPI, IMPS, NEFT and cards, a double-entry ledger and a fraud desk, and every copy Bank B makes (logs, fraud, analytics, SMS, chat) holds tokens instead of raw identifiers. The payment itself never waits for Aran. How it fits together: [Learn 23](docs/learning/23-one-ui-for-cloud-and-banks.md), [Learn 26](docs/learning/26-saas-and-multi-tenancy.md) and [Learn 27](docs/learning/27-bank-transactions-basics.md).

### Firewall as a service

Aran Cloud can also sit in the data path, so a bank changes a URL instead of its code ([Learn 30](docs/learning/30-firewall-as-a-service.md), [build write-up](artifacts/Firewall%20as%20a%20service/Aran%20-%20Firewall%20as%20a%20Service%20Build.md)).

| Feature | What it does |
| --- | --- |
| Routes (`/fw/<route>/...`) | A reverse proxy that cleans a request and forwards it to the bank's real destination. Starts in monitor mode (counts only), then switched to enforce. Fail open, closed or hold per route. Bank B's analytics copy uses one |
| Policies | Per identifier type: tokenise, mask, allow, alert or block. Every change is versioned, can be rolled back and is recorded in a hash-chained audit |
| Webhooks and SIEM export | HMAC-signed alerts to the bank's own systems; `/v1/events/export` gives JSON or CEF |
| AI gateway (`/v1/ai/...`) | Accepts the common chat API formats, so a bank changes only the base URL |
| Edge data plane | `aran_edge/` pulls Ed25519-signed config from Cloud and keeps raw data inside the bank (RBI localisation) |
| Production base | Postgres option, two instances behind nginx with leases (`ha` compose profile), mTLS per route, `/status` page, monthly invoices |

## Run it

All four services on your computer:

```
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r app/server/requirements.txt
./scripts/run_demo.sh      # starts all four and prints every address and the demo keys
```

Or with Docker, no Python setup needed ([Learn 25](docs/learning/25-accessibility-tenants-and-containers.md)):

```
docker compose up --build  # console :8000, Aran Cloud :8100, Bank A :9001, Bank B :9002
```

Only the core and console: `cd app/server && uvicorn main:app --port 8000`, then open http://localhost:8000 ([Learn 11](docs/learning/11-frontend-basics.md)).

Reproduce the research results (E1 to E19):

```
cd research
pip install cryptography numpy pytest scikit-learn sklearn-crfsuite fastapi httpx
./fetch_data.sh && ./fetch_ai_data.sh               # Windows: run in Git Bash
python -m pytest test_core.py test_ai.py test_registry.py test_next.py test_pqc.py test_shredder.py
python experiment.py            # E1 to E4, about 3 minutes
python experiment_ai.py         # E5 to E9, about 20 minutes
python experiment_registry.py   # E10 to E12, about 15 minutes, after experiment_ai.py
python experiment_next.py       # E13 to E16, about 15 minutes, after experiment_ai.py
python experiment_pqc.py        # E17 to E19, about 1 minute (needs cryptography 50 or newer)
python -m pqc.cbom ..           # cryptographic bill of materials
```

Step-by-step Windows setup, with fixes for common errors, is in [Learn 1](docs/learning/01-python-and-tools.md).

## Repository layout

```
app/
  server/          FastAPI server running the real firewall, vault and immune layer
  ui/              Main console (plain HTML, CSS, JS) and the shared kit used by every app
  web/             Earlier React console, served at /classic
aran_cloud/        Aran Cloud: workspaces, keys, routes, policies, webhooks, AI gateway, billing, /status
aran_edge/         Self-hosted data plane (one Docker image)
aran_sdk/          Python client for Aran Cloud
demo_bank/         Bank A (legacy) and Bank B (Aran) demo banks
research/          Core maths, AI, immune, firewall, gateway and post-quantum code, experiments E1 to E19 and their results
deploy/            nginx (load balancer, mTLS) and the Vercel front doors
scripts/           Start scripts (run_demo.sh, the Render entry apps_entry.sh), seeding and smoke tests
Dockerfile, docker-compose.yml   Container builds (profiles: edge, ha)
docs/
  research/        Research documents and the roadmap
  learning/        Beginner learning docs, one per topic
  brand.md, deploy.md
artifacts/         Write-ups, PDFs, screenshots and videos, indexed in artifacts/README.md
ui-design/         Source of the console design
Home.md, notes/, templates/, .obsidian/   The Obsidian vault
archive/           Old side projects and finished plans, kept for history (see archive/README.md)
```

The repo as it was before this cleanup is on the branch `Pre_copy_of_main` ([Learn 32](docs/learning/32-repo-structure-and-a-clean-main.md)).

## Documents

- [Research document](docs/research/aran-research.md): problem analysis, baseline, literature survey, research gaps, novel design with theorems, critical review, results, plan and sources.
- [AI and immune layers](docs/research/ai-and-immune-layers.md): NER, OTP/UPI classifier, calibrated detector, artificial immune system and firewall wiring, with results and weak spots.
- [Normaliser, registries and typo repair](docs/research/normaliser-and-registries.md) (E10 to E12, [PDF](artifacts/research/Aran%20-%20Normaliser%20Registries%20and%20Typo%20Repair.pdf)).
- [Ledger, AI gateway and red team](docs/research/ledger-gateway-redteam.md) (E13 to E16, [PDF](artifacts/research/Aran%20-%20Ledger%20AI%20Gateway%20and%20Red%20Team.pdf)).
- [Post-quantum upgrade](docs/research/post-quantum.md) (E17 to E19, [PDF](artifacts/research/Aran%20-%20Post-Quantum%20Upgrade.pdf)).
- [Roadmap: what to research and build next](docs/research/aran-roadmap.md).

### Learning path for the team

The team is new to this technology, so read these in order before starting any build task. Each doc starts from zero, explains every idea in plain words, works through examples from Aran's own code and data, and ends with practice tasks.

| # | Doc | Who | Time | What you will be able to do | PDF |
| --- | --- | --- | --- | --- | --- |
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
| 12 | [Leakage Ledger, AI Gateway and Red-Teaming](docs/learning/12-ledger-ai-gateway-and-red-teaming.md) | Everyone (roadmap items 3, 6, 9 and M4) | ~5 h | Add model features for hard cases, count what joined systems learn in bits, hide identifiers from a chatbot with role-based placeholders and a hash-chained audit log, red-team your own detector with a fair judge, speed a model up with caching and a cascade | [PDF](artifacts/learning/Aran%20Learn%2012%20-%20Leakage%20Ledger%20AI%20Gateway%20and%20Red-Teaming.pdf) |
| 13 | [Animation and Visual Explainers](docs/learning/13-animation-and-visual-explainers.md) | Everyone (the animated tour) | ~4 h | Draw with SVG, animate with CSS transitions, keyframes and `<animateMotion>`, tell a story step by step with React state, count-ups and radar charts, respect reduced motion, and only ever animate real server data | [PDF](artifacts/learning/Aran%20Learn%2013%20-%20Animation%20and%20Visual%20Explainers.pdf) |
| 14 | [Post-Quantum Cryptography](docs/learning/14-post-quantum-cryptography.md) | Inbathamizhan, Aasif (everyone reads sections 1 to 3) | ~5 h | Explain what Shor and Grover break, apply Mosca's inequality, run ML-KEM and ML-DSA in Python, explain hybrid key agreement and hybrid signatures and the downgrade trap, produce a CBOM | [PDF](artifacts/learning/Aran%20Learn%2014%20-%20Post-Quantum%20Cryptography.pdf) |
| 15 | [UI Design Specs and Design Tokens](docs/learning/15-ui-design-specs-and-tokens.md) | Everyone (the new UI design) | ~2 h | Read the UI design spec, use colour tokens like `{primary-color}` instead of fixed colours, design every state of a screen, bind each element to its API field, hand a design off to code | [PDF](artifacts/learning/Aran%20Learn%2015%20-%20UI%20Design%20Specs%20and%20Design%20Tokens.pdf) |
| 16 | [3D Graphics with three.js](docs/learning/16-3d-graphics-with-threejs.md) | Everyone (the 3D tour scenes) | ~4 h | Build a three.js scene, camera and renderer, add lights, meshes and labels, move objects along curves each frame, rotate with OrbitControls, project 7-D data into 3D honestly, clean up GPU memory, and keep phones and reduced motion working | [PDF](artifacts/learning/Aran%20Learn%2016%20-%203D%20Graphics%20with%20three.js.pdf) |
| 17 | [Wiring a Static Design to a Live API](docs/learning/17-wiring-a-design-to-a-live-api.md) | Everyone (the main console in `app/ui`) | ~3 h | Use `fetch`, promises and `await`, call the server through one API layer, keep a live store with polling and clean up timers, turn a synchronous mock into an async call with error handling, and never show invented numbers on a real page | [PDF](artifacts/learning/Aran%20Learn%2017%20-%20Wiring%20a%20Design%20to%20a%20Live%20API.pdf) |
| 18 | [Phones, QR Codes and Speech Input](docs/learning/18-phone-arena-qr-and-speech.md) | Everyone (the phone arena) | ~2 h | Let phones reach the laptop server, draw QR codes, poll a shared board, use browser speech recognition and its secure-context rule, score an attack honestly against a challenge | [PDF](artifacts/learning/Aran%20Learn%2018%20-%20Phones%20QR%20Codes%20and%20Speech%20Input.pdf) |
| 19 | [Translating a Website](docs/learning/19-translating-a-website.md) | Everyone, translators especially | ~1.5 h | Use English text as the translation key with fallback, handle Tamil and Hindi letters and fonts, run the check that keeps English complete and finds missing or stale lines | [PDF](artifacts/learning/Aran%20Learn%2019%20-%20Translating%20a%20Website.pdf) |
| 20 | [Presenter Mode and Offline Replay](docs/learning/20-presenter-mode-and-offline-replay.md) | Whoever presents | ~1 h | Run the 3-minute demo path with a clicker, record and replay server answers honestly, use localStorage and a service worker, follow the demo-day checklist | [PDF](artifacts/learning/Aran%20Learn%2020%20-%20Presenter%20Mode%20and%20Offline%20Replay.pdf) |
| 21 | [How the Explainer Video Is Made](docs/learning/21-making-the-explainer-video.md) | Anyone changing the video | ~1 h | Turn a script into a local neural voice-over, time every animation to the spoken line, draw a frame as a function of time with characters, camera moves and recaps, render with a headless browser and ffmpeg, split into parts, check frames and sync | [PDF](artifacts/learning/Aran%20Learn%2021%20-%20How%20the%20Explainer%20Video%20Is%20Made.pdf) |
| 22 | [Cybersecurity Concepts in Aran](docs/learning/22-cybersecurity-concepts-in-aran.md) | Everyone, read early (Aasif and Inbathamizhan first) | ~3 h | Name every security idea in Aran (CIA triad, threat model, defence in depth, least privilege, tokenisation and FF1, the check-digit invariant, AES-GCM and the HSM, DLP errors, HMAC registries, evasion, canary-style attribution, aggregation attacks in bits, crypto-shredding, Merkle receipts, hash-chained audit, anomaly detection and insider drills, RBAC and prompt injection, red-teaming, post-quantum and downgrade attacks, Indian law) and point to the exact file that uses it | [PDF](artifacts/learning/Aran%20Learn%2022%20-%20Cybersecurity%20Concepts%20in%20Aran.pdf) |
| 23 | [One UI for the Console, Aran Cloud and the Demo Banks](docs/learning/23-one-ui-for-cloud-and-banks.md) | Everyone who runs or changes Aran Cloud or the demo bank (Aasif first for keys and rate limits) | ~2 h | See how the four services fit together, share the console's design kit across apps with one static mount, keep tenants apart with namespaces, use API keys with scopes and least privilege, and make rate limits that a forged `X-Forwarded-For` header cannot bypass | [PDF](artifacts/learning/Aran%20Learn%2023%20-%20One%20UI%20for%20the%20Console%2C%20Cloud%20and%20Banks.pdf) |
| 24 | [Site Structure and Navigation](docs/learning/24-site-structure-and-navigation.md) | Everyone who adds a page or changes a menu | ~1 h | Plan pages, groups, names and order (information architecture), keep one site map that every menu reads, give each page a name that says what it covers, and add search to the menu | [PDF](artifacts/learning/Aran%20Learn%2024%20-%20Site%20Structure%20and%20Navigation.pdf) |
| 25 | [Accessibility, Tenant Isolation and Containers](docs/learning/25-accessibility-tenants-and-containers.md) | Everyone (Aasif first for tenant isolation) | ~1.5 h | Measure accessibility with axe-core and fix contrast and keyboard problems through design tokens, keep one bank from learning about another bank's customers with a tenant scope, and start the whole demo with one `docker compose up` | [PDF](artifacts/learning/Aran%20Learn%2025%20-%20Accessibility%2C%20Tenant%20Isolation%20and%20Containers.pdf) |
| 26 | [SaaS and Multi-Tenancy](docs/learning/26-saas-and-multi-tenancy.md) | Everyone (Aasif and Arun first) | ~1 h | What SaaS means, tenants and workspaces, API keys and scopes, metering, plans and soft limits, onboarding and what banks ask before they sign | [PDF](artifacts/learning/Aran%20Learn%2026%20-%20SaaS%20and%20Multi-Tenancy.pdf) |
| 27 | [Bank Transactions for Beginners](docs/learning/27-bank-transactions-basics.md) | Everyone (Arun and Bharadhwaj first) | ~1 h | The life of a payment on UPI, IMPS, NEFT, RTGS and cards, double-entry ledgers, idempotency, and where Aran sits without ever stopping a payment | [PDF](artifacts/learning/Aran%20Learn%2027%20-%20Bank%20Transactions%20for%20Beginners.pdf) |
| 28 | [Dashboards and Metrics](docs/learning/28-dashboards-and-metrics.md) | Everyone (Inbathamizhan first) | ~1 h | Counters, gauges, ratios and percentiles, time buckets, what the Aran Cloud dashboard should show, honest charts, SLOs and live updates | [PDF](artifacts/learning/Aran%20Learn%2028%20-%20Dashboards%20and%20Metrics.pdf) |
| 30 | [Firewall as a Service](docs/learning/30-firewall-as-a-service.md) | Everyone (Aasif first) | ~1 h | Data-flow firewall versus network firewall and WAF, how traffic gets into a firewall (reverse proxy, base URL swap, forward proxy, sidecar), control plane and data plane, RBI localisation, policies, monitor mode, fail-open and fail-closed | [Markdown](artifacts/Firewall%20as%20a%20service/Aran%20Learn%2030%20-%20Firewall%20as%20a%20Service.md) |
| 32 | [Repo Structure and a Clean Main Branch](docs/learning/32-repo-structure-and-a-clean-main.md) | Everyone | ~45 min | Know what each folder holds, why main shows only current facts, move instead of delete, find dead links, change main through a pull request | |

## Artifacts

Every artifact, by topic, is listed in the [artifacts index](artifacts/README.md). The main ones:

- [BuildX pitch deck](artifacts/Pitch%20deck/Aran%20-%20BuildX%20Pitch%20Deck.pptx) ([PDF](artifacts/Pitch%20deck/Aran%20-%20BuildX%20Pitch%20Deck.pdf)).
- [Full project story](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.md) ([PDF](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.pdf)).
- [Explainer video v2](artifacts/Explainer%20video%20v2/README.md) (76 min, 6 parts, with [source](artifacts/Explainer%20video%20v2/source/)) and [v1](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.mp4) (24 min, with [source](artifacts/Explainer%20video/source/)).
- [Firewall as a service](artifacts/Firewall%20as%20a%20service/): [plan](artifacts/Firewall%20as%20a%20service/Aran%20-%20Firewall%20as%20a%20Service%20Plan.md), [build write-up](artifacts/Firewall%20as%20a%20service/Aran%20-%20Firewall%20as%20a%20Service%20Build.md), [security review](artifacts/Firewall%20as%20a%20service/SECURITY_REVIEW.md) and screenshots.
- [SaaS for bank transactions](artifacts/SaaS%20platform/Aran%20-%20SaaS%20for%20Bank%20Transactions%20(Design).md): the design of the banks' payments, ledger and fraud desk, and the Cloud transaction API and dashboard.
- [Aran UI integration](artifacts/Aran%20UI%20integration/), [Site structure](artifacts/Site%20structure/) and [Site improvements](artifacts/Site%20improvements/Aran%20-%20Whole%20Site%20Improvements.md): one design for every app, one menu, and the accessibility, speed and phone fixes, with screenshots.
- [UI design spec](artifacts/UI%20design%20spec/Aran%20-%20UI%20Design%20Spec.md), [Live console screenshots](artifacts/Live%20console%20(team%20design)/), [Animated tour](artifacts/Animated%20tour/), [3D tour](artifacts/3D%20tour/) and [Standout features](artifacts/Standout%20features/).
- [Handoff pack](artifacts/Handoff%20pack/Aran%20-%20Handoff%20Pack.md) ([PDF](artifacts/Handoff%20pack/Aran%20-%20Handoff%20Pack.pdf)): everything a new teammate or Claude user needs to pick up Aran: state, branches, live links, rules, team, open items, plus copies of the Notion handoffs.
- [Main branch cleanup](artifacts/Main%20branch%20cleanup/Aran%20-%20Main%20Branch%20Cleanup.md): what moved to `archive/`, what stayed and why, and the links fixed.
- [BanksAndCloud branch audit](artifacts/Branch%20audits/Aran%20-%20BanksAndCloud%20Branch%20Audit.md).
- [Learning docs as PDFs](artifacts/learning/) and [results reports as PDFs](artifacts/research/).
- [Obsidian vault home](Home.md): open the repo folder as a vault; thread notes are in [notes/threads](notes/threads/).

## Regulations addressed

DPDP Act 2023 and DPDP Rules 2025 (safeguards, 72-hour breach report, erasure), CERT-In Directions 2022 (6-hour reporting, 180-day logs), UIDAI Aadhaar Data Vault, RBI payment data and card tokenisation rules, and PCI DSS. Treating crypto-shredding as DPDP erasure still needs legal confirmation. Post-quantum: NIST FIPS 203 and 204 (ML-KEM, ML-DSA), and India's DST quantum-safe task force report (February 2026: banking fully migrated by 2033, CBOMs from 2027 to 2028).

## License

Aran is released under the [MIT License](LICENSE). Copyright (c) 2026 Inbathamizhan S, Aasif Ahmed A, SN Arun Vijay and Bharadhwaj M (Team Iravora Void, KARE).
