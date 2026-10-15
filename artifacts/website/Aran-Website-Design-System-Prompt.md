# Aran website: design-system prompt for Claude Design

Copy everything inside the block below and paste it into Claude Design as one prompt.

```text
Build a responsive, single-page marketing and showcase website for "Aran", plus the design system it uses. Create the design system first (tokens, type scale, components), then compose the page from those components only.

==================================================
1. WHAT ARAN IS
==================================================
Aran is an algebraic data-flow firewall for Indian banks. It detects Aadhaar, PAN, card numbers, UPI IDs and OTPs in API traffic, application logs, exports and AI tools, protects them before they are stored or shared, traces any leak back to the system that leaked it, and supports DPDP-compliant erasure.

Name: "Aran" comes from the Tamil word அரண் (aran), meaning fortress or rampart. The brand should feel like a calm, precise fortress around data, not an alarm siren.

Core idea (the hero message): every Aadhaar number carries a Verhoeff check digit and every card number a Luhn check digit. Real identifiers always pass their checksum. Aran's tokens keep the same 12 or 16 digit shape but are built to always FAIL it. So any scanner can prove whether a number it finds is protected or leaked. Attribution, leakage budgets and erasure are built on top of that one fact.

Team: students of KARE (Kalasalingam Academy of Research and Education).
- Inbathamizhan S, team lead, cybersecurity
- Aasif Ahmed A, cybersecurity
- SN Arun Vijay, AI/ML
- Bharadhwaj M, AI/ML
Domain: Banking, Financial Services and FinTech. Problem statement: "Prevent Sensitive Data Leakage".

==================================================
2. AUDIENCE AND TONE
==================================================
Primary: hackathon judges, who skim in under 2 minutes and need to see the problem, the novel idea, proof and the team.
Secondary: Indian bank CISOs, DPOs and compliance teams, who need trust, regulation coverage and evidence.

Tone: confident, exact, evidence-led, calm. Short sentences. Numbers over adjectives. No hype words ("revolutionary", "military-grade", "AI-powered magic"). No hackers in hoodies, padlock clip art, matrix rain or glowing skulls. Every claim on the page is backed by a number, a theorem name or a regulation.

Voice examples:
- "Real numbers pass the checksum. Our tokens never do."
- "A leaked token names the system that leaked it."
- "Destroy one key. Every copy is erased, with a signed receipt."

==================================================
3. VISUAL DIRECTION
==================================================
Concept: "Fortress of digits". Precise, mathematical, institutional. Think of a bank vault crossed with a research paper: generous whitespace, thin rules, monospaced digits, subtle grid lines, and data flowing through a few clear gates.

Signature motif: a 12-digit number shown in monospace, with its last (check) digit highlighted.
- Real identifier: check digit in green with a small check mark, label "passes Verhoeff, real".
- Aran token: same shape, check digit in amber with a small slash mark, label "fails Verhoeff, protected".
Use this motif in the hero, as a section divider, and in the favicon idea (a digit block with a notched corner like a rampart).

Secondary motif: a rampart line, a thin horizontal line with small square crenellations, used sparingly as a section divider and in the logo.

Imagery: no stock photos. Use diagrams, number strips, and simple line icons (1.5px stroke, rounded joins). Diagrams use the same tokens as the UI.

==================================================
4. DESIGN TOKENS
==================================================
Provide light and dark themes. Dark is the default for the hero; the rest of the page can switch with the user's system setting. All text must meet WCAG 2.1 AA contrast (4.5:1 body, 3:1 large text and UI).

Colours (light theme):
- --bg: #F7F8FA (page)
- --surface: #FFFFFF (cards)
- --surface-2: #EEF1F5 (insets, code)
- --border: #D9DEE5
- --text: #0E1726 (primary)
- --text-2: #4A5568 (secondary)
- --brand: #0B3D5C (deep vault teal-navy; headings accents, logo)
- --accent: #1F8A8A (teal; links, focus ring, primary buttons)
- --real / pass: #1E8E5A (green: "real identifier, checksum passes")
- --token / protected: #C77D12 (amber: "Aran token, checksum fails")
- --leak / danger: #C2362F (red: leaks, breaches, penalties)
- --info: #3B6FD8 (neutral highlights in charts)

Colours (dark theme):
- --bg: #0A1220
- --surface: #111C2E
- --surface-2: #17243A
- --border: #24344D
- --text: #E8EEF6
- --text-2: #A3B1C4
- --brand: #7FC4D9
- --accent: #3BB7B0
- --real: #3CC487
- --token: #F0A93B
- --leak: #F06A62
- --info: #7CA2F2

Meaning rule: green, amber and red are semantic and are used ONLY for real / protected / leaked. Never use them as decoration.

Typography:
- Headings: "Space Grotesk" (600, 700), tight letter-spacing (-0.01em).
- Body: "Inter" (400, 500), 16px base, line-height 1.6.
- Numbers, identifiers, tokens, code: "JetBrains Mono" (400, 600), tabular figures.
- Optional Tamil wordmark accent: "Noto Sans Tamil" for அரண் only.
- Type scale (desktop): Display 64/72, H1 48/56, H2 36/44, H3 24/32, Body-L 18/30, Body 16/26, Small 14/22, Caption 12/18 (uppercase, 0.08em tracking, for eyebrows and labels).
- Mobile: Display 40/48, H1 34/42, H2 28/36.

Spacing: 4px base. Scale 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Sections use 96px vertical padding on desktop, 64px on mobile.
Layout: 12-column grid, max content width 1200px, 24px gutters, minimum 16px side padding on mobile.
Radius: 6px (inputs, chips), 10px (cards), 16px (feature panels). Avoid pill-shaped everything.
Elevation: mostly flat with 1px borders; one soft shadow level for hovered cards (0 6px 24px rgba(10,18,32,0.08)).
Motion: 150ms ease-out for hover, 400ms for reveals; respect prefers-reduced-motion (no animation then). Allowed animation: digits in the hero "tokenising" one by one, flow dots moving along diagram lines. Nothing loops faster than once every 4 seconds.

==================================================
5. COMPONENTS (build each with states and both themes)
==================================================
1. Top nav: wordmark "Aran" + small rampart glyph, links (Problem, How it works, Results, Compliance, Team), primary button "Read the research", secondary "View on GitHub". Sticky, translucent surface with blur; collapses to a menu on mobile.
2. Buttons: primary (accent fill), secondary (outline), ghost (text). States: hover, focus-visible ring (2px accent, 2px offset), active, disabled.
3. Eyebrow label: caption style, accent colour, e.g. "THE CORE IDEA".
4. Identifier strip: monospace digit cells with the check-digit cell highlighted; variants "real" (green), "token" (amber), "leaked" (red outline). Has a small label underneath.
5. Stat card: big number (mono, 40px), short label, optional source line. Variants: neutral, success, danger.
6. Comparison bar / before-after row: "Plain pattern matching" vs "Aran" with the two values and a log-scale bar.
7. Mechanism card: code (M1 to M5), title, one-line plain explanation, "rests on" theory chips.
8. Chip / tag: for theories, regulations, tech (e.g. "Verhoeff", "FF1", "DPDP 2023").
9. Data table: zebra-free, thin row dividers, mono for numbers, right-aligned numerics, horizontal scroll on small screens.
10. Flow diagram block: four entry gates on the left, four inline steps in the middle, outputs on the right; lines in --border, moving dots in --accent, leaked path in --leak.
11. Incident card: year, organisation, what leaked, one-line lesson, link-out icon.
12. Timeline / roadmap step: number, title, short text, status dot (done, in progress, planned).
13. Team member card: initials avatar (no photos needed), name, role, focus area.
14. Callout: "Theorem" style box with a left rule in --brand, small caps label, one-sentence statement.
15. Footer: wordmark, one-line description, repo link, KARE credit, regulations list.

==================================================
6. PAGE SECTIONS AND CONTENT (in this order)
==================================================

[1] HERO (dark)
Eyebrow: "DATA-FLOW FIREWALL FOR INDIAN BANKS"
Headline: "Real numbers pass the checksum. Aran's tokens never do."
Sub: "Aran finds Aadhaar, PAN, card numbers, UPI IDs and OTPs in APIs, logs, exports and AI tools, protects them before they are stored or shared, and traces any leak back to the system that leaked it."
Buttons: "Read the research" (primary), "View on GitHub" (secondary).
Visual: two identifier strips stacked. Top: a generated 12-digit Aadhaar-shaped number, check digit green, "passes Verhoeff · real". Bottom: the same shape after tokenising, check digit amber, "fails Verhoeff · protected". Animate the top morphing into the bottom. Use clearly fake example digits.
Small trust row under it: "Built on NIST SP 800-38G FF1 · Tested on 32,000 real production log lines · DPDP Act 2023 aligned".

[2] THE PROBLEM
Eyebrow: "WHY THIS MATTERS"
Headline: "Sensitive data leaks through logs, vendors and AI tools, not just databases."
Three stat cards (danger variant):
- "Rs 40.9 crore" average cost of a data breach in Indian financial services (IBM, 2026).
- "Rs 250 crore" maximum DPDP penalty for failing reasonable security safeguards.
- "35 million" masked card records sold from Juspay; masked data still sells.
Incident cards (horizontal scroll on mobile):
- 2016, Indian debit cards: about 3.2 million cards via malware at a payment processor. Lesson: leaks happen outside the bank.
- 2019, SBI Quick server: SMS service logs exposed balances. Lesson: log stores leak.
- 2020, Juspay: 35 million masked card records, surfaced months later as a dark-web dump. Lesson: the first evidence is often the dump.
- 2024, Star Health: 31 million customers' records sold via Telegram bots. Lesson: the first question is "which system leaked it?"
- 2023, Samsung and ChatGPT: staff pasted code and notes into an AI tool. Lesson: AI tools are a new exit path classic DLP does not see.

[3] THE CORE IDEA
Eyebrow: "THE CORE IDEA"
Headline: "Turn the check digit into a security invariant."
Body: "Aadhaar uses the Verhoeff check digit and cards use Luhn. Aran's tokens keep the exact shape but are built to always fail the check. A number that passes is real; a number that fails is ours. Any scanner can tell them apart with certainty."
Theorem callout: "Theorem 1, perfect separability: no Aran token ever passes Verhoeff or Luhn, and every real identifier does."
Visual: a large real vs token comparison using the identifier strip, with the check-digit cell called out.

[4] HOW IT WORKS: FIVE MECHANISMS
Eyebrow: "HOW IT WORKS"
Headline: "Five mechanisms, each built on a named theory."
Mechanism cards:
- M1 Checksum-complement tokens. "Tokens keep the 12 or 16 digit shape but always fail Verhoeff or Luhn." Chips: Dihedral group D5, Modular arithmetic, FF1.
- M2 Evidence-fusion detector. "A calibrated probability for each candidate from the checksum, the context, the bank's own customer registry and a trace-bound OTP registry." Chips: Bayes' rule, Neyman-Pearson, Bloom and cuckoo filters.
- M3 Per-sink tokens. "Every destination gets its own tokens, so a leaked token names the system that leaked it." Chips: PRP families, Birthday bound, Maximum likelihood. Theorem 2.
- M4 Leakage ledger. "Caps how many bits any group of destinations can learn about one customer." Chips: Min-entropy, Quantitative information flow.
- M5 Purpose-bound crypto-shredding. "One key per customer per purpose; destroying it erases every copy everywhere, with a signed receipt." Chips: Shannon perfect secrecy, Merkle logs. Theorem 3.

[5] ARCHITECTURE
Eyebrow: "WHERE ARAN SITS"
Headline: "Four gates in, only tokens out."
Flow diagram: four choke points on the left (APIs, Application logs, Exports and reports, AI tools gateway) -> inline steps (Detect, Tokenise per sink, Check leakage budget, Record the flow) -> destinations on the right (log platform, CRM, vendors, LLM provider) receiving only tokens. Below it, an HSM / key vault box linked to "Erasure" and a red dashed "forensic path" from a leaked dump back to the sink that leaked it.
AI-tools sub-panel: "Prompts are tokenised before they reach the model, e.g. ⟨PAN_7⟩. The provider never sees a raw identifier, and anything it memorises is a token Aran can trace."

[6] RESULTS ON REAL DATA
Eyebrow: "EVIDENCE"
Headline: "Tested on 32,000 real production log lines from 16 systems."
Note: "Public Loghub dataset. These logs contain no Indian identifiers, so every hit is a false alarm. No real person's identifier is used; injected values are generated."
Before/after comparison rows (plain pattern matching vs Aran):
- OTP false alarms: 67,481 vs 6
- Card false alarms: 6,086 vs 81 (removed by the own-customer registry)
- Aadhaar false alarms: 366 vs 4
- Tokens wrongly flagged out of 20,000: not separable vs 0
- Leaked dumps traced to the right sink, 40 sinks: access logs only vs 100%
Second table, "What common masks still leave":
- Card, last 4 shown: 100,000,000,000 candidates, 36.5 bits
- Aadhaar, last 4 shown: 8,000,000 candidates, 22.9 bits
- Card, first 6 and last 4: 100,000 candidates, 16.6 bits
- Card, first 8 and last 4: 1,000 candidates, 10.0 bits
- Aadhaar, first 4 and last 4: 1,000 candidates, 10.0 bits
Caption: "A mask that leaves 10 bits leaves 1,000 guesses. Aran's ledger budgets this."

[7] COMPLIANCE
Eyebrow: "REGULATIONS ADDRESSED"
Headline: "Designed around Indian data law."
Grid of chips or small cards: DPDP Act 2023 and DPDP Rules 2025 (safeguards, 72-hour breach report, erasure), CERT-In Directions 2022 (6-hour reporting, 180-day logs), UIDAI Aadhaar Data Vault, RBI card tokenisation and payment data rules, PCI DSS.
Honest note in small text: "Treating crypto-shredding as DPDP erasure still needs legal confirmation."

[8] ROADMAP
Eyebrow: "WHAT'S NEXT"
Timeline:
- Done: Python research prototype with tests (Verhoeff, Luhn, FF1 NIST vectors, tokens, min-entropy).
- In progress: NER model for names and addresses; learned OTP context classifier; artificial immune system that flags unusual data flows.
- Planned: Rust core library; choke-point adapters (Envoy filter for APIs, Vector transform for logs, export scanner, OpenAI-compatible AI gateway); HSM-backed vault and erasure receipts; attribution service; evaluation at scale.

[9] TEAM
Eyebrow: "THE TEAM"
Headline: "Built at KARE."
Four team cards with initials avatars: Inbathamizhan S (Team lead, Cybersecurity), Aasif Ahmed A (Cybersecurity), SN Arun Vijay (AI/ML), Bharadhwaj M (AI/ML). Sub-line: "Kalasalingam Academy of Research and Education".

[10] CLOSING CTA
Headline: "A leaked number should name its source."
Buttons: "Read the research", "View on GitHub" (https://github.com/itzz-inbathamizhans/aran).

[11] FOOTER
Wordmark + அரண் accent, one-line description, links (Research, GitHub, Team), "Banking, Financial Services & FinTech · Prevent Sensitive Data Leakage".

==================================================
7. RULES
==================================================
- Fully responsive: 1440, 1024, 768 and 390 px. Tables scroll horizontally inside their own container; the page never scrolls sideways.
- Accessibility: WCAG 2.1 AA, visible focus states, semantic headings in order, alt text for diagrams, colour is never the only signal (pair green/amber/red with an icon or label).
- Never show a real Aadhaar, PAN or card number. Use obviously generated example digits.
- Keep every number exactly as written above; do not round or invent statistics.
- Deliver: the design system page (tokens, type, components with states) and the full landing page built from it.
```
