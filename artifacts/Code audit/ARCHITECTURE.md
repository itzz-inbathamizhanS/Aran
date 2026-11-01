# Aran architecture (as audited on 1 November 2026)

Aran is a data-flow firewall for Indian banks. It finds Aadhaar, PAN, card numbers, UPI IDs, mobile numbers, OTPs and names in text, replaces them with tokens before the text is stored or shared, traces leaks back to the system that leaked them, and erases a customer's data on request with a signed receipt.

## The four services

| Service | Code | Port (local) | What it does | Data it keeps |
| --- | --- | --- | --- | --- |
| Aran core and console | `app/server` (FastAPI) plus `app/ui` (static site) and `app/web` (React, served at `/classic`) | 8000 | The real firewall engine: detection, tokens, vault, erasure, trace, immune layer, tour and demo endpoints | In memory, or SQLite (`ARAN_STORE`) with keys encrypted under `ARAN_MASTER_KEY` |
| Aran Cloud | `aran_cloud/main.py` (FastAPI) | 8100 | Multi-tenant SaaS front door: workspaces, scoped API keys, metering, audit, dashboards. Forwards real work to the core | SQLite `cloud.db` (tenants, keys as SHA-256 hashes, usage, tokens per tenant, receipts, hash-chained detokenise audit, transactions) |
| Bank A (legacy) | `demo_bank/app.py` with `BANK_MODE=legacy` | 9001 | A demo bank that stores raw identifiers, to show the problem | SQLite (customers, logs, chats, accounts, transactions, sink copies) |
| Bank B (with Aran) | same code with `BANK_MODE=aran` | 9002 | The same bank calling Aran Cloud through the Python SDK, so it only stores tokens | SQLite, same tables, tokens instead of raw values |

The Python SDK (`aran_sdk/aran.py`) wraps the Cloud API with typed errors and retries.

## How a request flows

```
Bank B  --X-API-Key-->  Aran Cloud  --X-Aran-Internal-->  Aran core
                         | checks key scope, rate limit,          | detects, tokenises, signs receipts
                         | namespaces customer_ref per tenant     |
                         | meters usage, writes audit             |
```

* The core locks every `/api/*` route except `/api/health` behind the shared `ARAN_INTERNAL_SECRET` header, unless `ARAN_CONSOLE_OPEN=1` (only for a core that listens on 127.0.0.1).
* Aran Cloud authenticates callers with `X-API-Key`. Keys are stored only as SHA-256 hashes and carry scopes (`admin`, `protect`, `gateway`, `trace`, `detokenise`, `erase`, `verify`, `dashboard`).
* Each tenant's customer references are prefixed with the tenant id before they reach the core, so one tenant can never erase or read another's customers. Detokenise answers only for tokens recorded against the calling tenant.
* Browsers use the dashboard with a key held in the URL fragment and sessionStorage; the live stream uses a short-lived signed token because `EventSource` cannot send headers.

## Research code used by the core

`research/` holds the mechanisms the core imports: `aran_core.py` (Verhoeff, Luhn, FF1), `firewall/` (normaliser, registries, purpose vault and shredder, store, ledger), `ai/` (CRF NER, context classifier, calibrated detector), `immune/` (negative selection), `gateway/` (AI gateway), `pqc/` (hybrid post-quantum signatures). Experiments (`experiment*.py`) and their tests live next to them and run on the public Loghub logs fetched by `research/fetch_data.sh`.

## Front ends

* `app/ui`: the main console (plain JavaScript modules, strict CSP, no inline script). `app/ui/kit` is shared with the Cloud and bank pages, served at `/aran`.
* `app/web`: the earlier React and three.js console, built with Vite into `app/web/dist`.
* `aran_cloud/static`: landing, connect and dashboard pages. `demo_bank/static`: bank pages and the side-by-side compare page (which frames both banks).

## Deployment

* `Dockerfile` builds one image for every service; `docker-compose.yml` runs core, cloud, Bank A and Bank B with shared generated secrets.
* Hosted: the core and console on Render (`aran-console`), the cloud and banks in one Render service behind `scripts/apps_proxy.py` (`aran-apps`), and static front ends on Vercel (`deploy/vercel`). A GitHub Actions job keeps the free services awake until 19 November 2026.

## Languages and versions

Python 3.13 (FastAPI 0.143, Pydantic 2.13, cryptography 50, scikit-learn 1.9, sklearn-crfsuite, numpy 2.5, Pillow 13.0 after this audit). JavaScript: React 18.3, three.js 0.169, Vite 5.4.21 after this audit. No database server: every store is SQLite in WAL mode.
