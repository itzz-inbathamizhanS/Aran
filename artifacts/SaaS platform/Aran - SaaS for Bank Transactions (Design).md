# Aran as a SaaS for Bank Transactions: Design and Build Plan

**Status:** proposal, waiting for the team's OK. **Read first:** [Learn 26 SaaS and multi-tenancy](../../docs/learning/26-saas-and-multi-tenancy.md), [Learn 27 Bank transactions](../../docs/learning/27-bank-transactions-basics.md), [Learn 28 Dashboards and metrics](../../docs/learning/28-dashboards-and-metrics.md).

## 1. The goal in one paragraph

Turn Aran from a demo that one team runs into a **product banks subscribe to**. A bank signs up on Aran Cloud, gets keys, and sends every **transaction** (and every copy of it: logs, fraud tools, analytics, support and AI chat) through Aran. Aran tokenises the identifiers in milliseconds, never blocks a payment, meters the use, and shows the bank a live **dashboard** of what was protected, where it went, how fast it was and what it costs. **Bank A** (no Aran) and **Bank B** (on Aran) run the same payments side by side so anyone can see the difference.

## 2. What exists today, and the gap

| Part | Today | Gap for the SaaS |
|---|---|---|
| Aran core (`app/server`) | Detection, tokens, vault, erasure receipts, immune layer, console | Unchanged; it stays the engine behind Aran Cloud |
| Aran Cloud (`aran_cloud`) | Workspaces, hashed scoped keys, rate limits, `/v1/protect`, metering, a dashboard with totals, audit, receipts | No transaction API, no time-series metrics, no plans or team roles, dashboard shows totals only |
| Bank A / Bank B (`demo_bank`) | Customers, staff chat, breach dump, erase | **No accounts, no payments, no ledger** |
| Live site | Console on Render + Vercel | **Cloud and banks are not deployed**, so the SaaS can only be seen locally |

## 3. How it fits together

```
 Customer apps (simulated)                      Aran Cloud (SaaS, multi-tenant)
 ┌──────────────┐  ┌──────────────┐            ┌───────────────────────────────────────┐
 │  Bank A app  │  │  Bank B app  │            │  /v1/transactions/protect  (batch)     │
 └──────┬───────┘  └──────┬───────┘            │  /v1/protect /v1/gateway /v1/erase     │
        ▼                 ▼                    │  /v1/metrics  /v1/stream (live)        │
 ┌──────────────┐  ┌──────────────┐  SDK,     │  workspaces · keys · team · plans      │
 │ Bank A core  │  │ Bank B core  │──3 ms────►│  usage_events · txn_events · audit     │
 │ ledger, rails│  │ ledger, rails│ budget    └───────────────┬───────────────────────┘
 └──┬──┬──┬──┬──┘  └──┬──┬──┬──┬──┘                           │ engine calls
    ▼  ▼  ▼  ▼        ▼  ▼  ▼  ▼                               ▼
  log fraud analytics AI   (same sinks, but they get tokens)  Aran core (detector, vault, keys)
  RAW identities          TOKENS                              
```

**Rule for Bank B:** the money moves first. The ledger write and the rail call never wait on Aran. The copies (log, fraud, analytics, chat) go through Aran; if Aran does not answer within the budget, the copy is **held in an outbox** and sent once Aran answers, or sent masked if it never does. Bank B never writes a raw identifier to a copy.

## 4. The banks (Bank A and Bank B)

Both banks run the same code; `BANK_MODE` picks legacy or Aran, as today.

### New features

| Feature | Details |
|---|---|
| **Accounts** | Each customer gets a savings account (14-digit number, IFSC, opening balance, generated, belongs to no one) |
| **Payments** | UPI (to `name@bank`), IMPS / NEFT (account + IFSC), card (Luhn-valid card number). Amount, remarks, idempotency key |
| **Ledger** | Double-entry, add-only. Reversals for refunds. A balance check that the sum is zero |
| **Transaction states** | initiated → authorised → (held for fraud) → success / failed → reversed |
| **Rules** | Balance check, per-rail limits (UPI ₹1 lakh, IMPS ₹5 lakh, RTGS from ₹2 lakh), a simple fraud score (new payee, odd hour, large amount) |
| **Copies (sinks)** | Transaction log, fraud desk, analytics export, SMS text, support / AI chat. Bank A writes them raw; Bank B writes tokens |
| **Traffic generator** | "Run the day": N payments a minute between both banks' customers, so dashboards fill with real numbers |
| **Breach and erase** | The breach dump now includes the transaction log; erasing a Bank B customer destroys their key, the ledger keeps amounts, every copy becomes unreadable |

### Bank pages (same UI kit as today)

1. **Home**: balance, recent payments, "Send money".
2. **Send money**: rail picker (UPI / IMPS / NEFT / card), payee, amount, remarks; shows each step of the payment as it happens.
3. **Transactions**: the ledger with filters (rail, status, date), a payment's detail with its timeline.
4. **Fraud desk**: held payments to approve or decline. Bank A shows names and accounts; Bank B shows tokens and still counts repeats.
5. **Back office**: what each sink stored (log, analytics, SMS, chat), the breach dump, erase.
6. **Side by side** (existing `/compare`): the same payment in Bank A and Bank B, field by field.

## 5. Aran Cloud (the SaaS)

### New API

| Endpoint | Scope | Purpose |
|---|---|---|
| `POST /v1/transactions/protect` | `protect` | One or up to 500 transactions: structured fields (payer, payee, card, remarks) plus `sink`. Returns tokens per field, latency, and an idempotent result per `txn_id` |
| `GET /v1/metrics?window=1h&step=1m` | `dashboard` | Time buckets (filled with zero): transactions, values tokenised, raw passed, coverage, p50 / p95 latency, by rail, type and destination |
| `GET /v1/stream` | `dashboard` | Server-Sent Events: a live feed of protected transactions (tokens only) and counters |
| `GET /v1/usage` | `dashboard` | This month against the plan, per day |
| `GET/POST /v1/team` | `admin` | Invite people with roles (admin, security officer, auditor, developer) |
| `POST /v1/plan` | `admin` | Switch plan (Sandbox, Growth, Enterprise); limits are soft, a payment is never refused |
| `GET /v1/slo` | `dashboard` | The latency SLO, this month's good minutes and the error budget left |

Every query keeps `WHERE tenant_id = ?`; new tests in `test_cloud_security.py` prove Bank A's key cannot read Bank B's metrics, stream or team.

### Dashboard pages

| Page | Shows |
|---|---|
| **Overview** | Four tiles (transactions today, values protected, coverage, p95 added latency vs. budget), a live per-minute chart, the latest transactions with tokens, status of each connected system |
| **Transactions** | The live feed (SSE) and a searchable table by rail, status and destination; a transaction's detail shows each field before → after |
| **Data map** | Where identifiers go: systems → Aran → destinations, with counts by type (Aadhaar, PAN, UPI id, card, account) |
| **Performance** | p50 / p95 per minute against the budget, SLO and error budget, calls per minute, error rate |
| **Compliance** | Erasure receipts (verifiable), detokenise reads by person, audit chain check, retention locks |
| **Keys and team** | Keys per system with scopes, last used, revoke; people and roles |
| **Usage and plan** | This month against the plan, per-day chart, plan picker and an invoice preview |
| **Settings** | Region (India), latency budget, fail-safe mode for copies, webhooks |

Design rules from Learn 28: every number names its window, counts start at zero, empty states say so, freshness is shown, colour always has a word or icon with it, one tenant only.

## 6. Data model (new tables)

**Bank (`demo_bank`)**: `accounts(id, customer_ref, number, ifsc, balance_paise)`, `transactions(id, idem_key UNIQUE, payer_acct, payee, rail, amount_paise, remarks, status, risk, created_at)`, `ledger(id, txn_id, account, debit_paise, credit_paise, at)`, `sink_copies(id, txn_id, sink, body, at)`, `outbox(id, sink, payload, tries)`.

**Aran Cloud**: `txn_events(id, tenant_id, txn_id, rail, sink, found, protected, raw, by_type, latency_ms, at)` with an index on `(tenant_id, at)`, `metrics_minute(tenant_id, minute, rail, n, protected, raw, p50, p95)`, `members(id, tenant_id, email, role)`, `plans(tenant_id, plan, since)`.

Money is stored in **paise as integers**, never as floats.

## 7. Putting it online

The live site only has the core today. To show the SaaS, Aran Cloud and both banks must be online too. Options:

| Option | Cost | Notes |
|---|---|---|
| **A. One extra Render service** running Cloud + Bank A + Bank B in one container behind a small router (`/cloud`, `/bank-a`, `/bank-b`), recommended | Free plan | One more service to wake; Vercel links to it. Data resets on restart, as today |
| B. Three extra Render services | Free plan, three to wake | Cleaner separation, slower first visit |
| C. Keep them local only | None | Demo only on a laptop with `docker compose up` |

## 8. Build plan

| Phase | Work | Model | Est. usage |
|---|---|---|---|
| 0 | Learning docs 26–28 (done) and this design | opus | done |
| 1 | Banks: accounts, payments on four rails, ledger, idempotency, fraud score, sinks, outbox, traffic generator, tests | sonnet | medium |
| 2 | Aran Cloud: `/v1/transactions/protect`, `txn_events`, `/v1/metrics`, `/v1/stream`, usage, team, plans, SLO, isolation tests | sonnet | medium |
| 3 | Dashboard UI (8 pages) and bank UI (6 pages) in the shared kit, wired to the live API | sonnet | medium-high |
| 4 | Review: security (tenant isolation, never a raw value in a Bank B copy), latency budget, accessibility, phones | opus | low |
| 5 | Deploy option A, docs, screenshots, README, PRs | haiku / sonnet | low |

Usage numbers are estimates.

## 9. Honest limits

- No real money moves and nothing connects to NPCI or a card network; the rails are simulated with their real rules and formats.
- Every identifier is generated and belongs to no one.
- Free hosting sleeps and restarts, which resets demo data; a paying product would use a managed database (Postgres) and keep data in an India region.
- SSO, real billing and a dedicated database per bank are designed for but not built in this round.
