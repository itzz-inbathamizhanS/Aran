# Aran Platform UI Plan: Structural Redesign

> **Document Status**: Complete Architecture Specification  
> **Target**: Aran Cloud (`aran_cloud/static/`) and Heritage Co-operative Bank Portal (`demo_bank/static/`)  
> **Constraints**: Zero changes to core detection/tokenisation engines (`research/`, `app/server/engine.py`, `app/server/main.py`). Zero behavioral regressions. Pure CSS and inline SVGs—no third-party JS, no chart libraries, no canvas, no external network calls.

---

## 1. Design System Architecture & Shared Foundations

### 1.1 Central Tokens (`tokens.css`) & Visual Hierarchy
Both **Aran Cloud** and **Heritage Bank** share a unified design token library (`aran_cloud/static/css/tokens.css` with a mirrored copy in `demo_bank/static/css/tokens.css`):

- **Strict Fixed Colour Semantics**:
  - `RED` (`--raw-red: #FCA5A5`, `--raw-red-bg: rgba(239, 68, 68, 0.16)`, `--raw-red-border: rgba(239, 68, 68, 0.45)`): **Strictly reserved for exposed raw PII and security breach disclosures**. Never used as a decorative brand accent.
  - `GREEN` (`--token-green: #4ADE80`, `--token-green-bg: rgba(34, 197, 94, 0.15)`, `--token-green-border: rgba(34, 197, 94, 0.45)`): **Strictly reserved for protected vault tokens and cryptographically valid post-quantum receipts**. Never used for generic success icons or badges.
  - `TEAL` (`--accent-teal: #2DD4BF`, `--accent-teal-hover: #14B8A6`, `--accent-teal-glow: rgba(45, 212, 191, 0.28)`, `--accent-teal-subtle: rgba(45, 212, 191, 0.12)`): **The sole UI accent color** across both products for navigation highlights, active tabs, buttons, focus rings, status indicators, and SVG chart geometry.
  - `NEUTRALS`: Base ground `--bg-deep: #070B14`, surface cards `--bg-card: #0F172A`, elevated panels `--bg-surface-elevated: #141E36`, hairlines `--border-card: #1E293B`, `--border-hairline: rgba(255, 255, 255, 0.07)`.
  - `TEXT CONTRAST`: Primary text `--text-primary: #F8FAFC` (17.5:1 on `#070B14`), muted labels `--text-muted: #CBD5E1` (10.7:1), high-contrast headings `--text-contrast: #FFFFFF` (21:1).

- **Projector Readiness (Auditorium & Venue Presentation)**:
  - Base body font: $\ge 18\text{px}$ (`1.125rem`).
  - Key numeric figures & counters: $\ge 22\text{px}$ (rendered at `26px` to `36px`).
  - Contrast ratio: $\ge 7:1$ across all tokens, raw data cells, and numeric meters.
  - **Projector Mode Toggle**: Top bar pill button stored in `sessionStorage` with safe `try/catch`. When enabled:
    - Sets `html.projector-mode, body.projector-mode`.
    - Forces solid pure black ground (`#000000`).
    - Disables all blur (`backdrop-filter: none !important; filter: none !important;`).
    - Thickens container borders to `2px solid #475569`.
    - Disables translucent alpha blends in cards.

- **Offline Independence**:
  - Embedded local `@font-face` fonts in `static/fonts/` (`Inter-Regular.woff2`, `Inter-Medium.woff2`, `Inter-SemiBold.woff2`, `JetBrainsMono-Regular.woff2`, `JetBrainsMono-Medium.woff2`).
  - Fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
  - Zero external CDN links or unpkg dependencies.

- **Motion Restraint**:
  - All transitions between `150ms` and `250ms` (`--motion-duration-default: 200ms`, `cubic-bezier(0.16, 1, 0.3, 1)`).
  - Wrapped under `@media (prefers-reduced-motion: no-preference)`.
  - Zero scroll hijacking, zero WebGL, zero canvas animation loops.

---

### 1.2 Design Skills Inventory & Application Matrix

| Installed Skill | Target Application in Aran Platform |
| :--- | :--- |
| **`css-border-gradient`** | Metric tiles, onboarding steps, API key reveal card, breach confirmation modals. |
| **`progressive-blur`** | Aran Cloud app shell top bar backdrop (strictly excluded from `compare.html`). |
| **`beautiful-shadows`** | Layered neutral 3-tier elevation (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) for cards, drawers, and modal overlays. |
| **`number-details`** | Architectural `01`–`06` section indices; monospace tabular metrics (`font-variant-numeric: tabular-nums`). |
| **`container-lines`** | Vertical boundary lines and corner square markers (`.corner-squares`) on main content rails. |
| **`beam-glow-states`** | Active sidebar items, live 2s polling indicator (`LIVE AUDIT`), active role switch in Heritage Bank. |
| **`split-layout-technical`** | Quick Connect / Integrations (docs left, code right); Bank console (form left, viewer right). |
| **`animation-systems`** | Drawer slide-in (200ms ease-out), tab switching, button active feedback without bouncy curves. |

#### Extended Inventory Skills Referenced
- **`landing-page`** (`design_skills/web-design/landing-page/`): Governs the public conversion structure: Hero (Outcome + Audience), 3-step "How it Works", 3 real integration points, honest DPDP compliance wording, and singular CTA.
- **`technical-wireframe-info-layout`** (`design_skills/web-design/technical-wireframe-info-layout/`): Diagnostic wireframe linework, hairline connectors, and mono metadata strips for the cryptographic receipt verification and exfiltration drill.
- **Custom Plain CSS Components** (no installed skill needed): Left sidebar app shell, responsive data table with side drawer, hand-crafted inline SVG charts (60-minute time series and horizontal distribution bars).

---

## 2. Product 1: Aran Cloud Architecture (`aran_cloud/static/`)

### 2.1 Universal Signed-In App Shell
All signed-in pages (`/dashboard#overview`, `...#traffic`, `...#trace`, `...#receipts`, `...#integrations`, `...#usage`) render inside a unified, responsive SaaS app shell:

```
+---------------------------------------------------------------------------------------------------------------+
| [⚡ ARAN CLOUD]  | Workspace: [Demo Bank Workspace v]  t_bedae522 | [PREVIEW] | [● Core OK] | [📺 Projector] [AG] |
+------------------+--------------------------------------------------------------------------------------------+
|  Overview        |                                                                                            |
|  Live traffic    |  PAGE TITLE                                                                                |
|  Trace a leak    |  Secondary explanatory subtitle describing the current scope                               |
|  Erasure/Receipts|                                                                                            |
|  Integrations    |  [ MAIN CONTENT CONTAINER (Container-Lines + Hairline Borders) ]                           |
|  Usage & plan    |                                                                                            |
|                  |                                                                                            |
| ---------------- |                                                                                            |
| [📖 Docs / API]  |                                                                                            |
| [⎋ Sign out]     |                                                                                            |
+------------------+--------------------------------------------------------------------------------------------+
| FOOTER: Aran Cloud (preview): separate keys, namespaces, metering and dashboards...                           |
+---------------------------------------------------------------------------------------------------------------+
```

- **Top Bar**:
  - Workspace selector dropdown showing tenant name and masked tenant ID (`t_...`).
  - `PREVIEW` badge (Teal subtle).
  - Live Health Pill: Real-time query to `/health` (`status == "ok"` and `core == true`) showing green or amber connection dot.
  - Projector Mode Toggle (`[ 📺 Projector Mode: OFF / ON ]`).
  - User avatar with workspace initials (e.g. `DB`).
- **Sidebar**:
  - Brand header with glowing lightning bolt mark.
  - 6 Navigation Links with SVG icons. Active state gets teal hairline indicator and subtle beam glow.
  - Supports browser history and back-forward navigation via clean hash routing (`#overview`, `#traffic`, `#trace`, `#receipts`, `#integrations`, `#usage`) or direct file routing.
  - Bottom utility rail: API documentation shortcut, key sign-out.

---

### 2.2 Cloud Page 1: Overview
**Purpose**: Executive security posture, live throughput, and distribution of protected identifiers.

#### ASCII Wireframe
```
+---------------------------------------------------------------------------------------------------------------+
| Overview                                                                               [↻ Refresh] [▶ Demo]   |
| Real-time security posture and tenant-isolated tokenisation telemetry                                         |
+---------------------------------------------------------------------------------------------------------------+
| [01] Protected IDs        | [02] Passed Unprotected    | [03] Inline Latency       | [04] Verified Receipts   |
| 1,420                     | 0                          | 0.81ms / 0.52ms           | 12                       |
| Aadhaar: 980 | Card: 440  | 0 not valid IDs (ignored)  | p95 / p50 deterministic   | Ed25519 + ML-DSA-65 PQ   |
+---------------------------------------------------------------------------------------------------------------+
| REQUESTS OVER TIME (LAST 60 MINUTES)                                                             [● Live 2s]  |
|  40 |            /\                                                                                           |
|  20 |     /\    /  \        /\__                                                                              |
|   0 +----+--\--/----+------/----+------------------------------------------------------------------------     |
|     14:00           14:15           14:30           14:45           15:00                                     |
+---------------------------------------------------------------+-----------------------------------------------+
| TOKENS BY DESTINATION SINK                                    | PROTECTED BY IDENTIFIER TYPE                  |
| kyc-archive       [==================================] 840    | Aadhaar (12-digit) [=====================] 980|
| crm-sync          [====================] 420                  | Credit Card (PAN)  [=============] 440        |
| credit-eval       [========] 160                              | Phone Number       [====] 80                  |
+---------------------------------------------------------------+-----------------------------------------------+
| RECENT FIREWALL ACTIVITY (LAST 8 EVENTS)                                                [View all in Traffic ->]
| Time     Endpoint     Sink         Protected        Customer Ref   Latency   Status                           |
| 14:52:10 /v1/protect  kyc-archive  2 protected (AA) CUST-8819      0.74ms    ✔ ok                             |
| 14:51:02 /v1/gateway  llm-openai   1 masked (<CD_1>)CUST-4102      1.12ms    ✔ ok                             |
+---------------------------------------------------------------------------------------------------------------+
```

#### Real API Endpoints & Fields
- `GET /v1/dashboard`:
  - `metrics.identifiers_protected` (Total count)
  - `metrics.passed_unprotected` (Real IDs leaked/unprotected)
  - `metrics.not_valid_ids_ignored` (Shape matches failing Verhoeff/Luhn checksums)
  - `metrics.p95_ms`, `metrics.p50_ms` (Latency)
  - `metrics.receipts_count` (Cryptographic receipts)
  - `metrics.destinations` (Dict of `{sink_name: count}`)
  - `metrics.by_type` (Dict of `{type_name: count}`)
  - `recent_activity` (Array of last 8 events: `at`, `endpoint`, `sink`, `protected_count`, `customer_ref`, `latency_ms`, `status`)
  - `usage_events` (Bucket timestamp `at` minute-by-minute across the past 60 minutes for the inline SVG curve).

#### Empty State
- **Condition**: `metrics.identifiers_protected == 0` and `metrics.requests_this_month == 0`.
- **Presentation**: Center card with a subtle dashed border (`--border-card`), an informational shield icon, title **"No Data Protected Yet"**, and copy: *"Your workspace is provisioned and listening. Send your first API call or simulate realistic banking workloads."*
- **Actions**:
  - Primary button: `[ ▶ Run Demo Traffic ]` (triggers real API call sequence via `scripts/seed_demo.py` runner).
  - Secondary button: `[ ⚡ Go to Quick Connect ]` (switches to Integrations tab).
- **Loading**: Skeleton shimmer blocks over the 4 tiles and SVG chart area.

---

### 2.3 Cloud Page 2: Live Traffic
**Purpose**: High-granularity audit trail with real-time filtering and side drawer payload inspection.

#### ASCII Wireframe
```
+---------------------------------------------------------------------------------------------------------------+
| Live Traffic Audit Log                                                            [Filter: All Sinks v]       |
| Complete stream of intercepted payloads and inline tokenisation decisions          [Filter: All Endpoints v]  |
+---------------------------------------------------------------------------------------------------------------+
| [ Search Customer Ref, Sink, or Endpoint...                                ]  [● Live Polling: Active]        |
+---------------------------------------------------------------------------------------------------------------+
| TIMESTAMP     ENDPOINT     SINK         PROTECTED     CUSTOMER REF  LATENCY  STATUS   INSPECT                 |
| 14:58:12.102  /v1/protect  kyc-archive  2 tokens      CUST-9921     0.78ms   ✔ ok     [ View Payload -> ]     |
| 14:57:44.890  /v1/gateway  ai-copilot   1 placeholder CUST-3184     1.24ms   ✔ ok     [ View Payload -> ]     |
| 14:56:01.230  /v1/trace    -            3 matched     -             0.45ms   ✔ ok     [ View Payload -> ]     |
+---------------------------------------------------------------------------------------------------------------+

+-- [INSPECTION SIDE DRAWER: Event #1042] ----------------------------------------------------------------------+
| Event Details                                                                                     [X Close]   |
| Endpoint: /v1/protect | Sink: kyc-archive | Latency: 0.78ms | Status: ok                                      |
| ------------------------------------------------------------------------------------------------------------- |
| CUSTOMER IDENTITY: CUST-9921 (Namespaced: t_bedae522_CUST-9921)                                              |
|                                                                                                               |
| INTERCEPTED OUTPUT (WHAT THE SINK RECEIVED):                                                                  |
| {                                                                                                             |
|   "name": "Arun Kumar",                                                                                       |
|   "aadhaar": "636997027873",  <-- [TOKEN GREEN: Deterministic Vault Token]                                    |
|   "card": "3871396607253226"  <-- [TOKEN GREEN: Erasable Token]                                               |
| }                                                                                                             |
|                                                                                                               |
| SECURITY FINDINGS:                                                                                            |
| - Aadhaar (12-digit): Valid Verhoeff checksum. Bound to purpose 'KYC'.                                        |
| - Credit Card (16-digit): Valid Luhn checksum. Bound to purpose 'KYC'.                                        |
| NOTE: In compliance with zero-raw-storage security rules, raw PII is never retained in server logs.           |
+---------------------------------------------------------------------------------------------------------------+
```

#### Real API Endpoints & Fields
- `GET /v1/dashboard`: `recent_activity` list.
- Filters executed client-side on:
  - `endpoint` (`/v1/protect`, `/v1/gateway`, `/v1/trace`, `/v1/erase`, `/v1/detokenise`)
  - `sink` (`kyc-archive`, `log-platform`, `crm-sync`, `credit-eval`, etc.)
  - `status` (`ok`, `erased`, `unknown`)
- Side drawer reads fields: `id`, `at`, `endpoint`, `sink`, `purpose`, `protected_count`, `unprotected_count`, `customer_ref`, `latency_ms`, `status`.

#### Empty State
- **Condition**: `recent_activity.length == 0`.
- **Presentation**: Center illustration with text: *"No events intercepted yet. Traffic from `/v1/protect` or `/v1/gateway` will appear here in real time."*
- **Action**: `[ Send a Test Request ]` button (navigates to Integrations).

---

### 2.4 Cloud Page 3: Trace a Leak
**Purpose**: Forensic exfiltration discovery: paste any suspect log or database dump to pinpoint the leaking sink.

#### ASCII Wireframe
```
+---------------------------------------------------------------------------------------------------------------+
| Trace a Leak                                                                                                  |
| Forensic reverse-mapping of leaked tokens back to the source destination sink and originating tenant          |
+---------------------------------------------------------------------------------------------------------------+
| PASTE EXFILTRATED DUMP OR LOG SNIPPET                                                                         |
| +-----------------------------------------------------------------------------------------------------------+ |
| | [2026-10-30 08:14:22] WARN customer sync failed: card=3871396607253226 aadhaar=636997027873             | |
| | payload={"account": "AC-49102", "token": "724142095473"}                                                  | |
| +-----------------------------------------------------------------------------------------------------------+ |
| [ 🔍 Trace Leaked Tokens ]                                                                                    |
+---------------------------------------------------------------------------------------------------------------+
| FORENSIC ATTRIBUTION REPORT                                                                                   |
|                                                                                                               |
| +-------------------------------------------------------+ +-------------------------------------------------+ |
| | LEAKING SINK IDENTIFIED                               | | TOKENS MATCHED IN DUMP                          | |
| | kyc-archive                                           | | 2 Vault Tokens (100% confidence)                | |
| | Primary breach origin                                 | | Owned by your tenant workspace                  | |
| +-------------------------------------------------------+ +-------------------------------------------------+ |
|                                                                                                               |
| ATTRIBUTION RANKING BY REVENUE/RISK:                                                                          |
| 1. kyc-archive      -- 2 matches (Score: 1.00)  [Likely Exfiltration Point]                                   |
| 2. crm-sync         -- 0 matches                                                                              |
| 3. analytics-lake   -- 0 matches                                                                              |
+---------------------------------------------------------------------------------------------------------------+
```

#### Real API Endpoints & Fields
- `POST /v1/trace`:
  - Request: `{"dump": "<textarea contents>"}`
  - Response fields read:
    - `matched`: Integer count of tokens belonging to this tenant identified in the dump.
    - `top`: String naming the most probable leaking sink (e.g. `"kyc-archive"`).
    - `ranking`: Array of `[sink_name, score]` pairs.
    - `how`: Explanation string (e.g. `"2 of 2 tokens in dump were issued to sink 'kyc-archive'"`).

#### Empty State
- **Condition**: No trace executed yet.
- **Presentation**: Placeholder cards showing the 3-step forensic process: *(1) Ingest dump $\rightarrow$ (2) Exact vault lookup $\rightarrow$ (3) Probabilistic sink attribution*. Includes a helper prompt: *"Click 'Load Sample Breach Dump' to test attribution."*

---

### 2.5 Cloud Page 4: Erasure & Receipts
**Purpose**: DPDP Act 2023 Section 12 cryptographic compliance: shred purpose keys and verify hybrid post-quantum Merkle receipts.

#### ASCII Wireframe
```
+---------------------------------------------------------------------------------------------------------------+
| Erasure & Cryptographic Receipts                                                                              |
| Irreversible purpose-key destruction with verifiable RFC 6962 post-quantum transparency logs                 |
+---------------------------------------------------------------------------------------------------------------+
| EXECUTE DPDP PURPOSE ERASURE                                                                                  |
| Customer Ref: [ CUST-SMK-001             ]   Purpose: [ KYC v ]   [ 🗑 Crypto-Shred Purpose Key ]              |
+---------------------------------------------------------------------------------------------------------------+
| VERIFIED ERASURE RECEIPTS TABLE                                                                               |
| CUSTOMER REF   PURPOSE DESTROYED   ALGORITHM           MERKLE LEAF ROOT          STATUS      VERIFICATION     |
| CUST-SMK-001   KYC (Destroyed)     Ed25519+ML-DSA-65   7a89f012cb34... (RFC6962) Valid       [ ✔ Verify Now ] |
| CUST-4490      Loans (Destroyed)   Ed25519+ML-DSA-65   1b45de88aa90... (RFC6962) Valid       [ ✔ Verify Now ] |
+---------------------------------------------------------------------------------------------------------------+

+-- [MODAL: Cryptographic Proof Verification] ------------------------------------------------------------------+
| Post-Quantum Receipt Proof: CUST-SMK-001                                                          [X Close]   |
| ------------------------------------------------------------------------------------------------------------- |
| STATUS: ✔ Cryptographically Verified (Signatures Valid & Log Inclusion Intact)                               |
|                                                                                                               |
| CLASSICAL SIGNATURE:  Ed25519 (256-bit)                ✔ PASSED                                               |
| QUANTUM SIGNATURE:    NIST FIPS 204 ML-DSA-65 (Dilithium) ✔ PASSED (Post-Quantum Secure)                     |
| MERKLE TREE ROOT:     0x7a89f012cb34eef1099238bc110a294819d084bc912348501239841029384102                    |
| LEAF POSITION:        Index #4 in Append-Only Transparency Ledger                                             |
|                                                                                                               |
| DETOKENISATION PROOF:                                                                                         |
| Calling /v1/detokenise for all tokens under this purpose now returns: "erased" (Plaintext unrecoverable).    |
+---------------------------------------------------------------------------------------------------------------+
```

#### Real API Endpoints & Fields
- Form Trigger: `POST /v1/erase`:
  - Request: `{"customer_ref": "...", "purpose": "KYC"}`
  - Response: `{status: "ok", receipt: {...}}`
- Receipts Table: `GET /v1/dashboard` $\rightarrow$ `receipts` list:
  - Fields: `customer_ref`, `purpose`, `alg`, `root`, `at`
- Verification Button: `POST /v1/receipts/verify`:
  - Request: full receipt dict
  - Response: `{"valid": true, "ed25519": true, "ml_dsa_65": true, "tree_size": 5, "root": "..."}`

#### Empty State
- **Condition**: `receipts.length == 0`.
- **Presentation**: Clean bordered box with: *"No customer purpose keys have been shredded yet. Use the form above to trigger a DPDP Section 12 erasure."*

---

### 2.6 Cloud Page 5: Integrations & API Keys
**Purpose**: Developer onboarding: API credential management, ready-to-run curl snippets, and live test execution.

#### ASCII Wireframe
```
+---------------------------------------------------------------------------------------------------------------+
| Integrations & API Credentials                                                                                |
| Connect your existing services, banking backends, and AI pipelines to the Aran Firewall                       |
+---------------------------------------------------------------------------------------------------------------+
| YOUR TENANT API KEY                                                                                           |
| Key: [ aran_live_5318bd**************************** ]  [ 👁 Reveal ]  [ 📋 Copy Key ]  [ ↻ Roll Key ]          |
| Warning: Keep your API key secret. It authenticates requests and isolates your vault namespace.               |
+---------------------------------------------------------------------------------------------------------------+
| INTEGRATION RECIPES                                                                                           |
| [ 1. Write Path (Protect) ]   [ 2. Log Pipeline (Redact) ]   [ 3. AI Gateway (LLM Chat) ]                     |
| ------------------------------------------------------------------------------------------------------------- |
| curl -X POST "http://localhost:8100/v1/protect" \                                                             |
|   -H "X-API-Key: $ARAN_API_KEY" \                                                                            |
|   -H "Content-Type: application/json" \                                                                       |
|   -d '{                                                                                                       |
|     "text": "Customer Aadhaar 351050574490 signed agreement",                                                 |
|     "customer_ref": "CUST-001",                                                                               |
|     "purpose": "KYC",                                                                                         |
|     "sink": "kyc-archive"                                                                                     |
|   }'                                                                                   [ 📋 Copy Snippet ]    |
|                                                                                                               |
| [ ⚡ Send Live Test Request ]                                                                                  |
|                                                                                                               |
| LIVE RESPONSE:                                                                                                |
| Status: 200 OK | Latency: 0.82ms                                                                              |
| {                                                                                                             |
|   "protected_text": "Customer Aadhaar 740891352101 signed agreement",                                        |
|   "tokens": ["740891352101"],                                                                                 |
|   "findings": [{"type": "Aadhaar", "protected": true, "erasable": true}]                                     |
| }                                                                                                             |
+---------------------------------------------------------------------------------------------------------------+
```

#### Real API Endpoints & Fields
- Local API key read from `localStorage.getItem('aran_api_key')`.
- Live test trigger calls `POST /v1/protect` with active API key and displays JSON response in tabular mono block.

---

### 2.7 Cloud Page 6: Usage & Plan
**Purpose**: Consumption metering, monthly quota progress, and daily volume distribution.

#### ASCII Wireframe
```
+---------------------------------------------------------------------------------------------------------------+
| Usage & Subscription Plan                                                                                     |
| Transparent volume metrics, quota consumption, and enterprise upgrade path                                   |
+---------------------------------------------------------------------------------------------------------------+
| MONTHLY QUOTA CONSUMPTION                                                                                     |
| 142 / 10,000 requests (1.4% consumed)                                                                         |
| [===----------------------------------------------------------------------------------------] 142 / 10,000    |
| Free Developer Tier: 10,000 requests/month. Resets automatically on the 1st of every month.                   |
+---------------------------------------------------------------------------------------------------------------+
| DAILY REQUEST VOLUME (LAST 14 DAYS)                                                                           |
|   40 |           |                                                                                            |
|   20 |     |     |     |           |                                                                          |
|    0 +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+---------------------     |
|       D-13  D-11  D-09  D-07  D-05  D-03  Today                                                           |
+---------------------------------------------------------------------------------------------------------------+
| CURRENT PLAN DETAILS                                                                                          |
| Plan Name: Free Developer Preview                                                                             |
| Rate Limit: 100 req/sec deterministic inline                                                                  |
| Post-Quantum Receipts: Included (Unlimited RFC 6962 verification)                                             |
| Vault Storage: In-Memory / SQLite preview (Dedicated KMS & HSM integration available on Enterprise)           |
+---------------------------------------------------------------------------------------------------------------+
```

---

### 2.8 Public Pages: Landing, Sign-up, Onboarding

#### Landing Page (`/`)
- **Structure** (following `landing-page` skill):
  1. **Hero**: Headline *"Zero-Exposure Financial Data Protection Without Architecture Changes"*. Subheadline explaining how Aran tokenises at the wire, detects PII inline, and provides post-quantum mathematical proof of erasure. Single Primary CTA: `[ Start Free Preview -> ]`.
  2. **How it Works (3 Steps)**:
     - `01`: Intercept at the API edge (`POST /v1/protect`).
     - `02`: Issue format-preserving vault tokens deterministic to customer & sink.
     - `03`: Crypto-shred purpose keys under DPDP Section 12 with Ed25519 + ML-DSA-65 signatures.
  3. **Three Integration Points**: Interactive cards showing Database Writes, Centralized Logs, and AI Prompts.
  4. **Compliance Truthfulness**: Clear disclaimer that Aran provides mathematical cryptographic shredding, without false "zero-knowledge" marketing claims.
  5. **CTA**: Instant workspace creation.

#### Sign-Up Page (`/` modal or standalone `#signup`)
- Form: Workspace / Bank Name, Admin Email.
- Submits to `POST /v1/workspaces`.
- Reveal Card (`css-border-gradient`): Displays generated Tenant ID (`t_...`) and Secret API Key (`aran_live_...`) with explicit warning: *"Save your API key now. For your security, the raw key is never stored on our servers and cannot be shown again."*

#### Onboarding Checklist (Shown upon first dashboard entry)
Dynamic checklist that checks real tenant data:
- [x] Step 1: Workspace created and API key generated.
- [ ] Step 2: Send your first protected request (Checks `requests_this_month > 0`).
- [ ] Step 3: Inspect token in the Live Traffic feed.
- [ ] Step 4: Verify cryptographic erasure in the Receipts ledger.

---

## 3. Product 2: The Banks ("Heritage Co-operative Bank")

### 3.1 Portal Concept & Shared Frame
Both **Bank A (Legacy, Port 9001)** and **Bank B (Aran Connected, Port 9002)** share the exact same banking portal codebase (`demo_bank/static/index.html` and `demo_bank/static/style.css`), themed as **Heritage Co-operative Bank**:

```
+---------------------------------------------------------------------------------------------------------------+
| [🏛 HERITAGE CO-OPERATIVE BANK] | Portal: Core Banking System (v4.2) | Mode: [BANK A: UNPROTECTED] / [BANK B]  |
+---------------------------------+-----------------------------------------------------------------------------+
|  Customers                      |                                                                             |
|  Register customer              |  PAGE TITLE                                                                 |
|  Staff AI assistant             |  Secondary subtitle                                                         |
|  Database inspector             |                                                                             |
|  Breach exfiltration drill      |  [ BANK APPLICATION VIEWPORT ]                                              |
|  DPDP Section 12 requests       |                                                                             |
+---------------------------------+-----------------------------------------------------------------------------+
| Active Role: [ Developer (Tokens) | Teller (Masked) | Compliance (Plaintext) ]                                 |
+---------------------------------------------------------------------------------------------------------------+
```

- **Top Status Banner**:
  - **Bank A**: Amber warning strip: `⚠️ UNPROTECTED: Raw PII stored in cleartext. Vulnerable to database breach.`
  - **Bank B**: Teal shield strip: `🛡️ ARAN SHIELD ON: Inline vault tokens active. Protected against exfiltration.` Includes direct link: `[ Open Aran Cloud Telemetry -> ]`.
- **Role Switcher**: Segmented control (`Developer` / `Teller` / `Compliance`) with disclaimer: *"Demo role switch for presentation only. Not real authentication."*

---

### 3.2 Bank Views Specification

#### View 1: Customers
- Clean data table of enrolled customers.
- **Bank A**: Displays raw 12-digit Aadhaar (`351050574490`) and raw 16-digit card numbers highlighted in **RED**.
- **Bank B**: Displays format-preserving vault tokens (`740891352101`) highlighted in **GREEN**.

#### View 2: Register Customer
- Sign-up form (Name, Mobile, Aadhaar, Card Number).
- Button: `[ 🎲 Insert Valid Sample ]` (queries Aran `/api/sample` for Verhoeff/Luhn checksum-valid data with warning *"Use sample data only"*).
- Instant Result Card:
  - Bank A shows raw stored values.
  - Bank B displays before-and-after comparison with green vault tokens.

#### View 3: Staff AI Assistant (Chatbot)
- Internal branch copilot chat interface.
- Staff query: *"Check loan eligibility for customer 351050574490"*.
- Side-by-Side "What the Provider Saw" Panel:
  - **Bank A**: Exposes raw Aadhaar `351050574490` directly to the third-party LLM.
  - **Bank B**: Intercepts PII, replaces it with placeholder `<AADHAAR_1>`, and shows the exact sanitized prompt transmitted to the provider.

#### View 4: Database Inspector
- Tabbed view inspecting SQLite tables:
  - Tab 1: `customers`
  - Tab 2: `logs` (Shows unredacted logs in Bank A; sanitized in Bank B)
  - Tab 3: `chat_history` (Shows leaked prompt in Bank A; placeholder in Bank B)

#### View 5: Breach Exfiltration Drill
- Button: `[ 🚨 Simulate Database Exfiltration ]`.
- Ingests raw SQL dump and submits to `/v1/trace`.
- **Bank A**: Firewall finds 0 vault tokens; flags raw Aadhaar numbers exposed in the dump.
- **Bank B**: Firewall matches 100% of tokens to sink `log-platform` / `database-backup` without exposing any real identity.

#### View 6: DPDP Section 12 Erasure
- Form to submit customer erasure request.
- **Bank A**: Deletes the customer row only. Explanatory notice highlights that residual copies remain in application logs, database backups, and AI chat transcripts.
- **Bank B**: Destroys the cryptographic purpose key in the Aran Vault. Detokenising the customer returns `"erased"` everywhere across logs, tables, and caches. Renders the hybrid post-quantum verification badge.

---

### 3.3 Side-by-Side Compare Portal (`compare.html`)
- Strict 50/50 dual-panel frame rendering Bank A on the left and Bank B on the right.
- Central hairline vertical divider (`container-lines`).
- Shared top control strip:
  - `[ 🎲 Register Sample Customer in Both ]`
  - `[ 💬 Send AI Query to Both ]`
  - `[ 🚨 Trigger Breach on Both ]`
  - `[ 🗑 Execute DPDP Erasure on Both ]`
- **Live Counter Strip**: Real-time ticker comparing `Raw PII Exposed (Bank A)` vs `Tokens Protected (Bank B)`.

---

## 4. Realistic Seed Data Specification (`scripts/seed_demo.py`)

A dedicated script generating authentic API traffic for demo readiness:
1. **Target**: Connects over real HTTP to Aran Core (`http://localhost:8000`), Aran Cloud (`http://localhost:8100`), and both Bank instances (9001 and 9002).
2. **Workload Volume**:
   - Registers **12 checksum-valid mock customers** in Bank A and Bank B (using names like *"Aarav Sharma"*, *"Priya Patel"*, *"Rohan Gupta"*).
   - Generates **40 realistic usage events** across varied sinks (`kyc-archive`, `crm-sync`, `credit-eval`, `log-platform`) and endpoints (`/v1/protect`, `/v1/gateway`, `/v1/trace`).
   - Executes **1 realistic DPDP Section 12 erasure** to generate verified post-quantum Merkle receipts.
3. **Trigger**: Accessible via the CLI (`python scripts/seed_demo.py`) and directly callable via the `[ ▶ Run Demo Traffic ]` button in the Aran Cloud Overview empty state.

---

## 5. Hand-Crafted Inline SVG Chart Specifications

### 5.1 60-Minute Throughput Line Chart
- **Dimensions**: ViewBox `0 0 800 160`, fluid width, responsive height.
- **Data Model**: Reads `usage_events` timestamps bucketed into 60 1-minute intervals.
- **Elements**:
  - Horizontal guide lines at 0, 20, 40 requests (`stroke: rgba(255,255,255,0.08)`, `stroke-width: 1`).
  - Path line (`fill: none`, `stroke: #2DD4BF`, `stroke-width: 2.5`, `stroke-linecap: round`).
  - Gradient fill area beneath the path (`linear-gradient(to bottom, rgba(45, 212, 191, 0.25), rgba(45, 212, 191, 0.0))`).
  - Hover / latest marker circle with animated CSS pulse dot.

### 5.2 Distribution Bar Charts (Sinks & Identifier Types)
- **Dimensions**: ViewBox `0 0 500 120`.
- **Elements**:
  - Background track rect (`fill: #080D1A`, `rx: 4`).
  - Active fill rect (`fill: #2DD4BF`, `rx: 4`, CSS transition width `200ms`).
  - Tabular monospace value and percentage label.

---

## 6. Implementation Steps & Verification Protocol

| Step | Scope | Verification Command | Gate Condition |
| :--- | :--- | :--- | :--- |
| **Step 1** | Finalize `docs/ui_plan.md` | `pytest Aran/research/test_*.py` | User approval of architecture plan |
| **Step 2** | `scripts/seed_demo.py` + Cloud App Shell & Overview Page | `python aran_cloud/smoke_test.py` | Working sidebar, line chart, seeded data |
| **Step 3** | Cloud Pages: Live Traffic, Trace, Receipts, Integrations, Usage | `python aran_cloud/smoke_test.py` | All 6 signed-in views functional |
| **Step 4** | Cloud Public Pages: Landing, Sign-up, Onboarding Checklist | `python aran_cloud/smoke_test.py` | Complete onboarding flow |
| **Step 5** | Heritage Bank Portal (Bank A & B) + Compare 50/50 Frame | `python demo_bank/smoke_test.py` | All 9 Bank smoke test steps pass |
| **Step 6** | Final Full Verification | Cloud + Bank smoke tests + 45 core tests | Zero regressions, clean projector test |

