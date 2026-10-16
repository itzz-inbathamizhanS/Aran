# Aran: building the frontend with Claude Design

A step-by-step guide for the team. Read Part 1 once, then follow Part 2 in order. Part 3 and Part 4 are copy-paste prompts.

## What we are building

Two screens, made in this order:

| # | Screen | Purpose | Who sees it | Prompt |
|---|---|---|---|---|
| 1 | **Live console** (already built and running in `app/`; Claude Design restyles it) | Shows Aran working: a request goes in, sensitive values come out as tokens, alerts fire, a leak is traced, a customer is erased with a receipt | Judges during the live demo | Part 3 below (new) |
| 2 | **Showcase website** (landing page) | Explains the problem, the core idea, results and the team in under 2 minutes | Judges before and after the demo, anyone with the link | [Website design prompt](../website/Aran-Website-Design-System-Prompt.md) (already written) |

Build the dashboard first. A judge's first question is "can I see it running?" (roadmap item 1), and the website reuses the same design system, so it gets faster once the dashboard exists.

---

## Part 1: beginner basics (read once, 15 minutes)

**Claude Design** is Anthropic's design tool at claude.ai. You describe a screen in plain words, it draws it as a working prototype (real HTML, clickable), and you refine it by chatting or by commenting directly on parts of the design. When it looks right, you export it or hand it off to Claude Code, which turns it into code in our repo.

Words you will meet:

| Word | Meaning | Aran example |
|---|---|---|
| **Design system** | The shared rulebook: colours, fonts, spacing, and reusable components. Every screen is built from it so everything looks like one product | Teal-navy brand, green = real, amber = token, red = leak |
| **Design token** | One named value in the design system | `--token: #C77D12` (amber) |
| **Component** | A reusable piece of UI with its states (normal, hover, disabled) | The identifier strip that highlights the check digit |
| **Prototype** | A clickable mock. Looks real, but data is fake and nothing is connected to a server | The dashboard with sample log lines |
| **Mock data** | Made-up but realistic data shown in a prototype | Generated 12-digit numbers that pass or fail Verhoeff |
| **Handoff** | Passing the finished design to developers (here, Claude Code) with enough detail to build it | Export bundle, then "build this in `frontend/`" |
| **API contract** | The list of endpoints and JSON shapes the frontend expects from the backend | `POST /demo/request` returns before, after, tokens, alerts |
| **Responsive** | The layout adapts to laptop, tablet and phone widths | Tables scroll inside their box on a phone |

Three rules that save the most time:

1. **Design system first, screens second.** If you skip it, every screen picks its own colours and you spend a day fixing them.
2. **One change per message.** "Make the alert panel narrower and move the receipt to the right" works better as two messages.
3. **Never use a real Aadhaar, PAN or card number**, even in mock data. Use generated numbers only.

---

## Part 2: step by step

### Step 0. Before you open Claude Design (everyone, 10 min)
- Read the [roadmap](../../docs/research/aran-roadmap.md) Tier 1, item 1, so you know what the dashboard must show.
- Agree on the demo story (Part 3 lists it). The design follows the story, not the other way round.

### Step 1. Open Claude Design and start a project (lead)
1. Go to claude.ai and open **Design** from the left sidebar (or claude.ai/design).
2. Create a new project named **Aran**.
3. If it offers to set up a design system from a codebase or files, point it at the repo `itzz-inbathamizhans/aran` or upload `README.md` and the website prompt file. It reads our colours and wording from them. If not offered, Step 2 covers it.

### Step 2. Create the design system (lead + one AI/ML member)
1. Paste **Prompt A** from Part 3.
2. Check the result against this list before moving on:
   - Green, amber and red are used only for real, token and leak. Nowhere else.
   - Numbers use the monospace font and line up in columns.
   - Both light and dark themes exist.
   - The identifier strip shows the check digit highlighted in all three variants.
3. Fix anything wrong with short follow-up messages, for example: "The amber token colour is too close to the red leak colour in dark mode; make them easier to tell apart."

### Step 3. Build the dashboard screens (both pairs, in parallel)
Paste **Prompt B** from Part 3. Then split the review:

| Pair | Reviews and refines |
|---|---|
| Inbathamizhan, Aasif | Live traffic, Leak trace, Erasure and receipt, Settings (sinks and keys) |
| Bharadhwaj, Arun | Detector scores panel, Immune alerts, Results page |

Use inline comments on the canvas for small fixes ("this label is unclear"), and the chat for layout changes.

### Step 4. Make it clickable for the demo (lead)
Ask: "Wire the demo flow so I can click through it in order: send sample request, see tokens, open alert, trace the leaked dump, erase customer, see receipt." Then click through it yourself as if you were presenting. Time it; it should take under 3 minutes.

### Step 5. Build the showcase website (any member, after the dashboard)
Paste the [website prompt](../website/Aran-Website-Design-System-Prompt.md), adding one line at the top: "Reuse the Aran design system already in this project." Add a section "See it live" with a screenshot of the dashboard and a button "Open the demo".

### Step 6. Review before handoff (everyone, 20 min)
- Accessibility: tab through every screen with the keyboard; every button must show a focus ring.
- Phone width: open the preview at about 390 px wide; nothing should scroll sideways.
- Numbers: every statistic matches the README exactly. Do not round.
- Wording: short sentences, no hype words.

### Step 7. Export and hand off to code (lead)
1. Use **Export / Handoff to Claude Code** (or export as HTML if that is the option shown).
2. Save the export into the repo under `frontend/design-export/` and commit it.
3. In a new thread, ask: "Restyle the live console in `app/web` to match the Claude Design export in `frontend/design-export/`, keeping every API call." Learn 11 section 9 explains how.
4. The console is hosted as one service (frontend and API together) from the repo's `Dockerfile`.

---

## Part 3: prompts to paste into Claude Design

### Prompt A: design system

```text
Create the design system for "Aran", an algebraic data-flow firewall for Indian banks (Tamil அரண், "fortress"). It will be used for a live demo dashboard and a showcase website. Build tokens, type scale and components only; no full pages yet.

Tone: calm, precise, institutional. A bank vault crossed with a research paper. No hacker imagery, padlocks, matrix rain or glowing effects.

Colours, light theme: bg #F7F8FA, surface #FFFFFF, surface-2 #EEF1F5, border #D9DEE5, text #0E1726, text-2 #4A5568, brand #0B3D5C, accent #1F8A8A, real #1E8E5A, token #C77D12, leak #C2362F, info #3B6FD8.
Colours, dark theme: bg #0A1220, surface #111C2E, surface-2 #17243A, border #24344D, text #E8EEF6, text-2 #A3B1C4, brand #7FC4D9, accent #3BB7B0, real #3CC487, token #F0A93B, leak #F06A62, info #7CA2F2.
Meaning rule: real (green), token (amber) and leak (red) are semantic only, always paired with an icon or label, never decoration.

Type: Space Grotesk for headings, Inter for body (16px, line-height 1.6), JetBrains Mono with tabular figures for every number, identifier, token and log line.
Spacing 4px base; radius 6 / 10 / 16; flat with 1px borders, one soft hover shadow. Motion 150ms hover, 400ms reveal, none under prefers-reduced-motion. WCAG 2.1 AA in both themes.

Components, each with states and both themes:
1. Identifier strip: monospace digit cells, last (check) digit highlighted. Variants: real (green, check mark, "passes Verhoeff"), token (amber, slash mark, "fails Verhoeff"), leaked (red outline).
2. Log line viewer: one log line in mono with inline highlights on detected values; a "before" and "after" variant where after shows typed tokens such as <AADHAAR_3> or a checksum-failing token.
3. Finding chip: type (Aadhaar, PAN, Card, UPI, Mobile, OTP, Name, Address) + confidence as a percent.
4. Confidence bar: 0 to 100% with the decision threshold marked.
5. Stat tile: big mono number, label, optional delta.
6. Alert row: severity dot, time, flow (source -> sink), reason, "Investigate" button.
7. Sink badge: destination name (Log platform, CRM, Vendor, LLM provider) with an icon.
8. Receipt card: customer ref, purpose, keys destroyed, Merkle root (mono, truncated with copy button), signed time, "Verify" button.
9. Buttons (primary, secondary, ghost, danger), inputs, textarea for pasted dumps, tabs, toggle, table, empty state, loading skeleton, toast.
10. App shell: left sidebar nav, top bar with environment label "DEMO · generated data only", theme toggle.
```

### Prompt B: demo dashboard

```text
Using the Aran design system in this project, design the "Aran Console", a live dashboard for hackathon judges. Desktop-first at 1440px, usable at 1024px and 390px. Dark theme by default. This is a visual design for an app that already works: every value comes from a live API, so use realistic placeholder values only to show layout, and design empty, loading and error states for every panel. A permanent banner says "Live · identifiers are generated, never real people".

Demo story the screens must support, in this order:
1. A sample bank API request with an Aadhaar, PAN, card, UPI ID and OTP goes through Aran.
2. The judge sees before and after: every sensitive value replaced by a token before it reaches the log platform.
3. The detector shows why each value was caught, with a calibrated confidence.
4. The immune layer raises an alert on an unusual data flow.
5. A leaked dump of tokens is pasted in, and Aran names the sink that leaked it.
6. A customer is erased: their key is destroyed and a signed receipt appears.

Screens (left sidebar order):

1. Overview: stat tiles (requests protected, values tokenised, alerts today, p95 added latency in ms), a small flow diagram (4 gates: APIs, Logs, Exports, AI tools -> Detect -> Tokenise per sink -> Ledger -> sinks), and the 5 latest alerts.

2. Live traffic: a "Send sample request" button and a request picker (Loan API, KYC upload, Call-centre note in Hinglish, Payment callback). Split view: left "Before" raw JSON/log, right "After" protected version, with findings highlighted and linked line to line. Below, a findings table: type, original (masked), token, sink, confidence, rule or model that fired. Show latency for the request.

3. Detector: for a selected finding, a breakdown card of the evidence (checksum result, context words, own-customer registry hit, OTP registry hit, NER score) feeding a confidence bar with threshold. A small chart of precision and recall per type.

4. Immune alerts: alert list with severity, a detail panel showing the flow (source system -> sink), what is unusual compared to normal ("self"), and buttons Confirm / Mark as normal.

5. Leak trace: a textarea "Paste a leaked dump", a "Trace" button, then a result card: most likely sink, likelihood, number of matching tokens, and a ranked bar list of the other sinks. Include an example dump button.

6. Erasure: search a customer by reference, list their purposes (KYC, Loans, Marketing) with key status, "Erase for purpose" (danger button with confirm dialog). Result: receipt card with keys destroyed, Merkle root, signature time, and a note that tokens in old logs can no longer be reversed. Show the KYC time-lock as a disabled option with an explanation.

7. Results: the real experiment numbers as tables, exactly: OTP false alarms 67,481 vs 6; card false alarms 6,086 vs 81; Aadhaar false alarms 366 vs 4; tokens wrongly flagged 0 of 20,000; leaked dumps traced to the right sink 100% across 40 sinks; sensitive values removed 46.1% (regex) vs 83.5% (Aran); clean lines wrongly changed 2,357 (15.8%) vs 122 (0.8%). Tested on 32,000 real Loghub log lines.

8. Settings: sinks list with per-sink key IDs, leakage budget per sink group in bits, theme.

Make the demo flow clickable in the story order above. Empty, loading and error states for every screen. The Results numbers above are the current values of experiment files and may change when the experiments are re-run, so treat them as layout examples.
```

---

## Part 4: the live API the console uses

The console is already built and running on real data (`app/` in the repo; see [Learn 11](../../docs/learning/11-frontend-basics.md)). Claude Design is now for the look only: every number, token, alert and receipt comes from these endpoints, which run Aran's real code.

| Method and path | Sends | Returns |
|---|---|---|
| `GET /api/stats` | | live counters: requests, values protected, p50 and p95 latency, alerts, tokens, keys destroyed |
| `GET /api/config` | | sinks with purpose and threshold, sample request types, drills, the receipt public key |
| `POST /api/sample` | `{kind, who}` | one bank request built for an enrolled customer or a stranger, run through the firewall |
| `POST /api/process` | `{text, source, sink}` | any text run through the firewall: before, after, latency, findings with evidence |
| `GET /api/events` | | recent requests |
| `GET/POST /api/customers` | | generated customers with masked identifiers and per-purpose key status |
| `POST /api/erase` | `{customer_ref, purpose}` | signed Merkle erasure receipt, or 423 when the purpose is retention-locked |
| `POST /api/receipts/verify` | a receipt | signature and inclusion check |
| `POST /api/detokenise` | `{token, caller}` | the value, or "erased" after key destruction |
| `GET /api/leaked-dump?sink=` | | the last lines a sink really stored |
| `POST /api/trace` | `{dump}` | ranked sinks with per-value evidence |
| `GET /api/immune`, `POST /api/immune/learn`, `POST /api/drills/{kind}` | | immune state, learning, alerts from live flow windows |
| `GET /api/results`, `POST /api/jobs/tests` | | experiment result files; runs the test suite on the server |

## Who does what

| Step | Owner | Output |
|---|---|---|
| 1 to 2 Design system | Inbathamizhan (lead), Bharadhwaj | Design system in Claude Design |
| 3 Dashboard screens | Both pairs, split as in Step 3 | 8 screens |
| 4 Clickable demo flow | Inbathamizhan | Clickable prototype, under 3 minutes |
| 5 Website | Arun or Aasif | Landing page |
| 6 Review | Everyone | Fix list |
| 7 Export | Inbathamizhan | `frontend/design-export/` in the repo |

## What is built and what is next

Built and live: the API server on the real firewall, crypto-shredding with Merkle receipts (roadmap item 4), and the console (roadmap item 1), on top of the normaliser and registries (items 2 and 5).

Still to build: mobile and OTP recall fixes (item 3), the AI gateway for LLM prompts (item 6), the leakage ledger at runtime (M4), and restyling the console from your Claude Design references.
