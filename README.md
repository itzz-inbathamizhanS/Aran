# Aran

> An algebraic data-flow firewall for Indian banks. It detects Aadhaar, PAN, card numbers, UPI IDs and OTPs in APIs, logs and AI tools, protects them before they are stored or shared, traces any leak back to its source, and supports DPDP-compliant erasure.

**Live site:** [aran-console.onrender.com](https://aran-console.onrender.com) (the full console and the real Aran server, redeployed from `main` on every push; the first visit after a quiet spell can take about a minute to wake up).

**New to Aran? Start here:** [The full project story, from zero to now](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.md) ([PDF](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.pdf)): every technical word explained, the research and papers used, how the solution was derived, what was built, every result, and what comes next.

**Prefer to watch?** [The full explainer course (76 min, 6 parts)](artifacts/Explainer%20video%20v2/README.md): Aran from zero in plain words, with an everyday example before every technical term, real leaks from India and the world, animated characters, and a recap after every chapter. Start with [Part 1: The problem](artifacts/Explainer%20video%20v2/Aran%20-%20Explainer%20Video%20v2%20-%20Part%201%20-%20The%20problem.mp4). Short on time? The [24-minute quick tour](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.mp4) ([subtitles](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.srt)). How they are made: [Learn 21](docs/learning/21-making-the-explainer-video.md).

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

## Live console

`app/` is a working website that runs Aran's real code. Its main console (at `/`) is the team's own design from `ui-design`, a Trionn-style dark 3D look with a hold-to-blast WebGL hero, smooth scroll, word reveals and optional sound, now wired so every number, token, receipt and alert comes from the live server; how each screen maps to its endpoint is in [app/ui/README.md](app/ui/README.md) and how the wiring works in [Learn 17](docs/learning/17-wiring-a-design-to-a-live-api.md). Screenshots: [artifacts/Live console (team design)](artifacts/Live%20console%20(team%20design)/). The earlier React console, with the 3D firewall and 3D immune scenes, stays at `/classic`. Both open on an **animated guided tour**: thirteen short chapters, each a moving picture of a real server response with only a headline and one line of text. Requests flow as packets through the firewall and come out as tokens; 300 real log lines light up as false alarms for plain filters but not for Aran; Verhoeff and Luhn maths runs digit by digit on a dial; a token is built through the ten real FF1 rounds and checked against what the live firewall issued; detection clues fill bars and swing a probability gauge; twelve disguises of one Aadhaar flip to caught; a leaked file travels to the dark web and a trace beam names its source; an erasure shatters the purpose key and your browser re-checks the Merkle receipt itself; the immune layer draws each traffic window on a radar against the normal range it learned, and drills show up as alerts; and an AI-chatbot chapter shows what the model provider sees (placeholders only) and what each staff role gets back. The rest of the console lets you send any request, trace any dump, erase customers, run attack drills and run the test suite. No value on it is hard-coded; only the customers' identifiers are generated, because real ones must never be used.

| Part | What it is |
| --- | --- |
| `app/server/engine.py` | Detector + normaliser + registries + firewall in vault mode + purpose vault + immune layer on live flow windows + real-log replay |
| `app/server/main.py` | FastAPI routes the console calls (`/api/...`; interactive docs at `/docs`) |
| `app/server/build_models.py` | Trains the detector once (same training as E5 to E7) and saves `app/server/models/detector.pkl` |
| `research/firewall/shredder.py` | Purpose-bound crypto-shredding (M5): per-customer per-purpose AES-256-GCM keys, vault tokens that fail their checksum, RFC 6962 Merkle log, erasure receipts signed with Ed25519 + ML-DSA-65 (post-quantum), KYC retention lock. Tests in `research/test_shredder.py` |
| `app/ui/` | Main console from the team's design: plain HTML, CSS and JavaScript, no build step; `js/data.js` is the live API layer, `js/tour.js` the 13-chapter tour, `js/pages.js` the seven console pages; GSAP, Lenis and three.js are vendored in `vendor/` |
| `app/web/` | Earlier React + Vite console at `/classic`: animated guided tour (`src/pages/Tour.jsx`, scenes in `src/viz.jsx`, 3D scenes in `src/three/`) plus seven console pages |
| `Dockerfile` | Builds the frontend and serves everything from one container |

**Demo features that make the console stand out** (ideas: [Standout frontend ideas](artifacts/Standout%20frontend%20ideas/Aran%20-%20Standout%20Frontend%20Ideas.md); screenshots: [artifacts/Standout features](artifacts/Standout%20features/)): **Beat the firewall** (`#arena-live`): judges scan a QR code and try, from their own phones, to type, paste or speak a hidden Aadhaar, card or mobile past the live firewall, scored honestly against a challenge number on a live board ([Learn 18](docs/learning/18-phone-arena-qr-and-speech.md)); **Without Aran / with Aran** (`#versus`): the same real requests play side by side, then one sink is breached: raw identifiers and the DPDP penalty on the left, tokens and a trace naming the leaking sink on the right; **Leakage ledger** (`#ledger`): first 6 digits to one Acme system and last 4 to another leave 100,000 candidates, and the ledger refuses the second disclosure; **Card photo scan** (`#scan`): Tesseract reads a sample ID card picture (or webcam photo) on the server and the identifiers are covered with tokens on the image; **Post-quantum** (`#quantum`): a live key backup wrapped with X25519 and with X25519 + ML-KEM-768, a simulated Shor attack opens only the classical one, plus Mosca's rule and the CBOM; **My data** (`#me`): the customer's own phone view of where their data went, with erasure and a receipt re-checked on the phone. The console also speaks **Tamil and Hindi** (top-bar switch; English stays the source and fallback, checked by `node app/ui/tools/check-i18n.js`, [Learn 19](docs/learning/19-translating-a-website.md)), and has a **presenter mode** (`?present=1`): a 3-minute path with clicker keys and an offline replay of recorded server answers if the server fails ([Learn 20](docs/learning/20-presenter-mode-and-offline-replay.md)).

The tour also has two 3D scenes built with three.js, both drawn from live server data and loaded only when opened: chapter 1 shows real requests flying from bank systems into the Aran shield and leaving as tokens (with a 2D map toggle, the default on phones), and chapter 10 shows the immune layer's real feature space in 3D, with the normal zone, the learned traffic, every detector cut to the unit cube, and the latest scored windows, on any three of its seven features. Screenshots: [artifacts/3D tour](artifacts/3D%20tour/). How it is built: [Learn 16](docs/learning/16-3d-graphics-with-threejs.md). Screenshots of the animated tour: [artifacts/Animated tour](artifacts/Animated%20tour/) (packets through the firewall, token rounds, false alarms, erasure receipt, immune radar, AI gateway). How the animations are built: [Learn 13](docs/learning/13-animation-and-visual-explainers.md). Set `ARAN_LLM_URL`, `ARAN_LLM_KEY` and `ARAN_LLM_MODEL` to point the AI-chatbot chapter at a real OpenAI-compatible model; without them it uses the gateway's echo stand-in and no data leaves the machine.

Run it locally (details in [Learn 11](docs/learning/11-frontend-basics.md)):

```
cd research && ./fetch_data.sh && cd ..
pip install -r app/server/requirements.txt
cd app/server && uvicorn main:app --port 8000       # API + console at http://localhost:8000
cd app/web && npm install && npm run build          # optional: the classic React console at /classic
```

## Aran Cloud and the demo banks

Aran also runs as a small product made of four services, all in the same Aran UI as the console: the **Aran core** (`app/server`, port 8000, the console at `/`), **Aran Cloud** (`aran_cloud/`, port 8100: workspaces, scoped API keys, metering, a dashboard and Quick connect), **Bank A** (`demo_bank/` in legacy mode, port 9001: stores and sends raw identifiers) and **Bank B** (`demo_bank/` in Aran mode, port 9002: everything goes through Aran Cloud), plus a **side-by-side page** (`:9002/compare`) that signs one customer up at both banks at once. Aran Cloud and the bank serve the console's own `app/ui` folder at `/aran`, so the tokens, components and the shared kit in `app/ui/kit/` are one copy for every app. The services come from Arun's BanksAndCloud work; the Aran UI and the wiring are on the `aran-ui-banks-cloud` branch. How it fits together: [Learn 23](docs/learning/23-one-ui-for-cloud-and-banks.md). Every page of every app sits in one menu drawn from `app/ui/kit/sitemap.js`: [Learn 24](docs/learning/24-site-structure-and-navigation.md). Screenshots: [artifacts/Aran UI integration](artifacts/Aran%20UI%20integration/).

```
python -m venv .venv && source .venv/bin/activate
pip install -r app/server/requirements.txt requests
./scripts/run_demo.sh      # starts all four and prints every address and the demo keys
```

## Repository layout

```
docs/
  research/        Research document, AI and immune layers report, roadmap
  learning/        Fifteen beginner learning docs (Markdown, open in Obsidian or GitHub)
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
  firewall/        The wired firewall, normaliser, customer and OTP registries, leakage ledger (Inbathamizhan, Aasif)
  gateway/         AI gateway for LLM prompts: placeholders, role-based detokenising, hash-chained audit log
  experiment_ai.py Experiments E5 to E9
  results_ai.json  Raw results
  test_ai.py       Tests for the AI, immune and firewall layers
  fetch_ai_data.sh Downloads CoNLL-2003, HiNER, Hinglish NER, UCI SMS and labelled BGL logs
  experiment_registry.py  Experiments E10 to E12 (normaliser, registries, typo repair)
  results_registry.json   Raw results
  test_registry.py        Tests for the normaliser and registries
  experiment_next.py      Experiments E13 to E16 (ledger, AI gateway, red team, speed) and E13b
  results_next.json       Raw results
  test_next.py            Tests for the ledger, AI gateway, red-team normaliser, NER gate and item 3 features
  pqc/             Post-quantum upgrade: hybrid signatures and key sealing (hybrid.py), CBOM scanner (cbom.py)
  experiment_pqc.py       Experiments E17 to E19 (un-erasure, cost, CBOM and Mosca table)
  results_pqc.json        Raw results
  test_pqc.py             Tests for the post-quantum upgrade
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

# Ledger, AI gateway, red team and speed
pip install fastapi httpx
python -m pytest test_next.py
python experiment_next.py                           # about 15 minutes after experiment_ai.py

# Post-quantum upgrade (needs cryptography 50 or newer)
python -m pytest test_pqc.py test_shredder.py
python experiment_pqc.py                            # about 1 minute
python -m pqc.cbom ..                               # cryptographic bill of materials
```

Step-by-step Windows setup, with fixes for common errors, is in [Learn 1](docs/learning/01-python-and-tools.md).

## Documents

- [Explainer video v2, the full course (76 min, 6 parts, 1080p)](artifacts/Explainer%20video%20v2/README.md): 61 animated chapters with voice-over and subtitles, plain words and everyday examples for every term, real incidents, a recap after every chapter. Source in [artifacts/Explainer video v2/source](artifacts/Explainer%20video%20v2/source/).
- [Explainer video v1, the quick tour (MP4, 24 min, 1080p)](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.mp4) with [English subtitles](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.srt): the whole project explained from zero with animation and voice-over. Source (script, voice and animation code) in [artifacts/Explainer video/source](artifacts/Explainer%20video/source/).
- [The full project story, from zero to now](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.md) ([PDF](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.pdf)): one long explainer for the whole team. A technical foundation (every term in plain words), the story in order from the first message, the research and how each paper was used, how the solution was derived, the architecture, every experiment (E1 to E19), the live console, what is not done, and how to explain Aran to judges.
- [Research document](docs/research/aran-research.md): problem analysis, baseline, literature survey, research gaps, novel design with theorems, critical review, results, plan and sources.
- [AI and immune layers](docs/research/ai-and-immune-layers.md): NER, OTP/UPI classifier, calibrated detector, artificial immune system and firewall wiring, with results on real data and the weak spots.
- [Normaliser, registries and typo repair](docs/research/normaliser-and-registries.md): roadmap items 2 and 5, built and measured (E10 to E12). [PDF](artifacts/research/Aran%20-%20Normaliser%20Registries%20and%20Typo%20Repair.pdf)
- [Ledger, AI gateway and red team](docs/research/ledger-gateway-redteam.md): roadmap items 3, 6 and 9, the M4 leakage ledger and a first speed-up, built and measured (E13 to E16). [PDF](artifacts/research/Aran%20-%20Ledger%20AI%20Gateway%20and%20Red%20Team.pdf)
- [Post-quantum upgrade](docs/research/post-quantum.md): what a quantum computer breaks in Aran, retroactive un-erasure (E17), hybrid receipts and key sealing, cost (E18), CBOM and Mosca priority table (E19), plan. [PDF](artifacts/research/Aran%20-%20Post-Quantum%20Upgrade.pdf)
- [Standout frontend ideas](artifacts/Standout%20frontend%20ideas/Aran%20-%20Standout%20Frontend%20Ideas.md): eight features that make the console stand out at a demo (judges attack it from their phones, a with/without Aran split screen, the leakage ledger page), top three first.
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

## Artifacts

- [Explainer video v2 (6 parts, MP4 and SRT)](artifacts/Explainer%20video%20v2/README.md): 76.6 minutes, 61 chapters, the full course from zero, with its [source](artifacts/Explainer%20video%20v2/source/).
- [Explainer video v1 (MP4)](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.mp4) and [subtitles (SRT)](artifacts/Explainer%20video/Aran%20-%20Explainer%20Video.srt): 24 minutes, 22 chapters, voice-over and animation for every technical word, with its [source](artifacts/Explainer%20video/source/).
- [Full project story (Markdown)](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.md) and [PDF](artifacts/Project%20Story/Aran%20-%20Full%20Project%20Story%20from%20Zero.pdf): the whole project from zero, for the team.
- [Learning docs as PDFs](artifacts/learning/): print-ready copies of the learning docs above.
- [Normaliser, registries and typo repair (PDF)](artifacts/research/Aran%20-%20Normaliser%20Registries%20and%20Typo%20Repair.pdf): results report for roadmap items 2 and 5.
- [Ledger, AI gateway and red team (PDF)](artifacts/research/Aran%20-%20Ledger%20AI%20Gateway%20and%20Red%20Team.pdf): results report for roadmap items 3, 6, 9 and M4, with Learn 12, also kept by thread in [artifacts/Ledger AI gateway and red team](artifacts/Ledger%20AI%20gateway%20and%20red%20team/).
- [Post-quantum upgrade (PDF)](artifacts/research/Aran%20-%20Post-Quantum%20Upgrade.pdf): results report for E17 to E19, with Learn 14, also kept by thread in [artifacts/Post-quantum cryptography](artifacts/Post-quantum%20cryptography/).
- [Website design-system prompt for the website design tool](artifacts/website/Aran-Website-Design-System-Prompt.md): brand, colours, typography, components and page content for the Aran website.
- [Frontend guide with Claude Design](artifacts/Frontend%20with%20Claude%20Design/Aran%20-%20Frontend%20Guide%20with%20Claude%20Design.md): step-by-step guide, design-system and console prompts for restyling the live console, and the live API it uses.
- [UI design spec](artifacts/UI%20design%20spec/Aran%20-%20UI%20Design%20Spec.md) ([PDF](artifacts/UI%20design%20spec/Aran%20-%20UI%20Design%20Spec.pdf)): every page of the console with its sections, content, components, data, animations, states and the API endpoint behind each element, with colour placeholders (`{primary-color}`, `{input-color}`, `{leak-color}`) to fill in for a new design. Read [Learn 15](docs/learning/15-ui-design-specs-and-tokens.md) first.
- [Design references](artifacts/UI%20design%20spec/Aran%20-%20Design%20References.md) ([PDF](artifacts/UI%20design%20spec/Aran%20-%20Design%20References.pdf)): real, human-designed sites to use as inspiration for the new UI, matched to each Aran page, with a checklist for avoiding generic AI-looking design.
- Style mockups of the Overview page in three directions from those references: [A calm dark](artifacts/UI%20design%20spec/mockup-a-calm-dark.png), [B bank light](artifacts/UI%20design%20spec/mockup-b-bank-light.png), [C live data](artifacts/UI%20design%20spec/mockup-c-live-data.png) (sample numbers, for picking a direction).
- [Aran UI integration](artifacts/Aran%20UI%20integration/): Aran Cloud (landing, Quick connect, dashboard), Bank A, Bank B and the side-by-side page rebuilt in the Aran UI and wired to the live services, with screenshots and [Learn 23](artifacts/Aran%20UI%20integration/Aran%20Learn%2023%20-%20One%20UI%20for%20the%20Console%2C%20Cloud%20and%20Banks.md) ([PDF](artifacts/Aran%20UI%20integration/Aran%20Learn%2023%20-%20One%20UI%20for%20the%20Console%2C%20Cloud%20and%20Banks.pdf)).
- [Site structure](artifacts/Site%20structure/): a full audit of the site flow and the fix. The site opens on Overview, one numbered and searchable menu holds all 23 pages of the console, the demo banks and Aran Cloud in one order (Start, Firewall console, Live demos, Demo banks, Aran Cloud, Design review), and the Cloud dashboard's "Overview" is now "Workspace summary". [Audit](artifacts/Site%20structure/Aran%20-%20Site%20Audit%20and%20Menu%20Order.md), screenshots and [Learn 24](artifacts/Site%20structure/Aran%20Learn%2024%20-%20Site%20Structure%20and%20Navigation.md) ([PDF](artifacts/Site%20structure/Aran%20Learn%2024%20-%20Site%20Structure%20and%20Navigation.pdf)).
- [BanksAndCloud branch audit](artifacts/Branch%20audits/Aran%20-%20BanksAndCloud%20Branch%20Audit.md): review of the Aran Cloud, demo bank, SDK and persistence branch against main, with test results and fixes needed before merging.
- [Artifacts index](artifacts/README.md): every artifact by thread, with live links. Older Markdown and PDF copies of the first docs are in [artifacts/Data-flow firewall research](artifacts/Data-flow%20firewall%20research/).
- [Obsidian vault home](Home.md): open the repo folder as a vault; thread notes are in [notes/threads](notes/threads/), indexed in [notes/Threads.md](notes/Threads.md).

## Regulations addressed

DPDP Act 2023 and DPDP Rules 2025 (safeguards, 72-hour breach report, erasure), CERT-In Directions 2022 (6-hour reporting, 180-day logs), UIDAI Aadhaar Data Vault, RBI payment data and card tokenisation rules, and PCI DSS. Treating crypto-shredding as DPDP erasure still needs legal confirmation. Post-quantum: NIST FIPS 203 and 204 (ML-KEM, ML-DSA), and India's DST quantum-safe task force report (February 2026: banking fully migrated by 2033, CBOMs from 2027 to 2028).
