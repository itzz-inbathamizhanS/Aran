# Aran code audit report

**Date:** 1 November 2026. **Scope:** every source module in the repository (core, Aran Cloud, both demo banks, SDK, scripts, research code, console and React front ends, Docker and deploy config). Generated media, slide decks and documents under `artifacts/` were not audited as code.

**Companion documents:** [ARCHITECTURE.md](ARCHITECTURE.md) · [BUG_FIXES.md](BUG_FIXES.md) · [SECURITY_AUDIT.md](SECURITY_AUDIT.md) · [TEST_REPORT.md](TEST_REPORT.md)

## Overall health

The project is in good shape for a research prototype and demo. Access control, tenant isolation, key hashing, signed receipts, CSP on the main console and output escaping in the front ends were already done carefully, and the existing test suites are broad. The audit found **27 issues**: no critical ones, **2 high**, **10 medium** and **15 low**. **17 are fixed** (including one preventive hardening), **6 are open** (one flaky test caused by a model limit, one dev-only dependency that needs a major upgrade, and four small items) and **4 are accepted** demo trade-offs or scanner false positives.

Every functional bug fixed below was first reproduced against the original code (a second copy of `main` running on spare ports) and then shown fixed on the new code.

## How the audit was done

1. Read the structure, configs, Dockerfile, compose file, deploy files and workflows (see ARCHITECTURE.md).
2. Ran every existing test suite and smoke test to get a baseline.
3. Static analysis: `ruff` (pyflakes and bugbear rules), `bandit` (security), `pip-audit` and `npm audit` (dependencies), a secret pattern scan.
4. Manual review of the security-relevant code: the core's lock middleware and every route, the Cloud's key, scope, rate-limit, detokenise, erase, audit and metrics code, the banks' calls to Aran, the SDK, and every `innerHTML` sink in the front ends.
5. Live probing of the running stack with bad input (blank and huge names, non-ASCII headers, unknown customers, invalid references, oversize text, concurrent detokenise calls).
6. A headless browser pass over 17 pages and dashboard views, after planting `<img onerror>` payloads in workspace names, key labels, transactions and bank customer names.

## Issue register

Severity: CRITICAL, HIGH, MEDIUM, LOW. Status: Fixed, Hardened (preventive fix for a race that could not be reproduced), Open, Accepted (deliberate for the demo).

| ID | Where | Issue | Root cause | Sev | Impact | Fix | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | `demo_bank/app.py` `aran_headers` | Bank B sent the core's `ARAN_INTERNAL_SECRET` to Aran Cloud on every call | Headers built the same way for core and cloud targets | HIGH | Any cloud operator or log sees the one secret that unlocks the whole core API | Secret sent only to the core, API key only to the cloud | Fixed |
| A-02 | `app/server/main.py` `POST /api/customers`, `engine.py:181` | A blank or all-space name crashed with HTTP 500 | `name.split()[0]` on an empty split | HIGH | Any caller could trigger server errors on the console | Names are trimmed; blank becomes a generated name; max 80 characters | Fixed |
| A-03 | `app/server/main.py:58`, `aran_cloud/main.py:80` | A non-ASCII `X-Aran-Internal` or `X-Admin-Token` header returned 500 | `hmac.compare_digest` raises `TypeError` for non-ASCII `str` | MEDIUM | Unauthenticated callers could cause 500s and noisy logs | Compare bytes | Fixed |
| A-04 | `aran_cloud/main.py` `call_core` | Every core error became 502 Bad Gateway: unknown customer, invalid `customer_ref`, oversize text | Blanket mapping of `RequestException` to 502 | MEDIUM | Clients and the SDK cannot tell their own mistake from an outage; retries on non-retryable errors | Pass through 400, 404, 409, 422, 423; keep 502 for outages | Fixed |
| A-05 | `demo_bank/app.py` `call_aran` | Same 502 masking in the bank | Same pattern | LOW | Same, inside the demo bank | Same fix | Fixed |
| A-06 | `aran_cloud/main.py` `seed_demo_transactions` | Demo seed of 200 transactions showed 198 on the 1-hour dashboard; test failed | Seed spread over the last 59 minutes, but the 1 h chart starts at the first full 5-minute bucket (up to 5 minutes later) | MEDIUM | Dashboard total disagreed with the seed; `test_demo_seed_fills_the_dashboard_and_is_labelled` failed | Seed inside the last 54 minutes | Fixed |
| A-07 | `aran_cloud/main.py` `log_detokenise_audit` | Hash-chained audit read the previous hash before holding the write lock | Read then insert in a deferred transaction | MEDIUM | Two concurrent detokenise calls could chain onto the same row and break chain verification | `BEGIN IMMEDIATE` before reading the last hash | Hardened (80 concurrent calls kept the chain valid before and after) |
| A-08 | `aran_cloud/main.py` rate limiters | Per-key and per-IP limiter maps grew without bound | Entries were created for every key hash and IP and never removed | MEDIUM | Memory exhaustion by sending random keys | Sweep stale entries once 5,000 are tracked | Fixed |
| A-09 | `aran_cloud/main.py` models | No length or format limits on workspace name and email, protect text, detokenise token, key label and scope list | Missing `Field` constraints | MEDIUM | Huge values stored in the tenant DB and audit log; empty workspace names | Limits added (name 1-120, email pattern up to 254, text 20,000 like the core, token 200, label 1-80) | Fixed |
| A-10 | `scripts/run_demo.sh`, `scripts/seed_demo.py`, `demo_bank/names_experiment.py` | Hard-coded `aran_live_...` fallback keys | Fallback when signup fails | MEDIUM | Secrets-in-code pattern; keys exist in no DB so the demo fails later with a confusing 401 | Read `ARAN_API_KEY` from the environment or stop with a clear message; removed the dead DB read in `seed_demo.py` | Fixed |
| A-11 | `app/server/requirements.txt` | Pillow 12.3.0 has 39 published advisories | Old pin | MEDIUM | Image parsing in the card-scan endpoint | Pillow 13.0.0; `pip-audit` now reports none | Fixed |
| A-12 | `app/web/package.json` | Vite 5.4.11 and esbuild dev-server advisories | Old pin | LOW | Development server only; the production build is static files | Vite 5.4.21 (latest 5.x); the rest needs Vite 6.4.4+ | Open (major upgrade) |
| A-13 | `app/server/main.py` `_check_admin` | Admin token compared with `!=` | Not constant time | LOW | Timing side channel on the admin token | `hmac.compare_digest` | Fixed |
| A-14 | `app/server/main.py` `POST /api/customers` | No cap on console customers (the `/api/process` path is capped at 10,000) | Missing limit | LOW | Unbounded memory growth | Cap of 10,000 with HTTP 429 | Fixed |
| A-15 | `aran_cloud/main.py`, `demo_bank/app.py` CORS | `allow_origins=["*"]` with `allow_credentials=True` | Default copied from examples | LOW | Credentialed cross-site requests allowed in principle; nothing uses cookies | `allow_credentials=False` | Fixed |
| A-16 | Cloud and bank responses | No `X-Content-Type-Options` or `Referrer-Policy` on Cloud API, landing, connect and bank pages | Headers only on the core and the dashboard | LOW | MIME sniffing; full URLs in referrers | Both headers added on every response | Fixed |
| A-17 | Bank pages | No Content-Security-Policy on bank and compare pages | Pages still use inline scripts and are framed by the compare page | LOW | Weaker XSS defence in depth (output is escaped; the probe found no XSS) | Needs scripts moved out of the HTML first | Open |
| A-18 | `demo_bank/bank_txn.py:904` | Transaction search treated `%` and `_` as wildcards | Unescaped `LIKE` | LOW | Wrong search results | Escaped, as the Cloud already does | Fixed |
| A-19 | 19 Python files | 47 unused imports and f-strings without placeholders; dead code in `seed_demo.py` | Leftovers | LOW | Noise, slower reading | Removed with `ruff --fix`; re-exports that other modules use were kept (`engine.py`) | Fixed |
| A-20 | Tests and scripts | 8 unused local variables (ruff F841) | Leftovers in tests | LOW | None at run time | Left as is: changing tests without need | Open |
| A-21 | `app/server/test_standout.py::test_versus...` | Flaky: fails about 3 runs in 10, also on the original code | The NER model sometimes scores an upper-case or street name at p about 0.2, below the sink threshold, so it counts as "raw left" | MEDIUM | Red test runs; the demo can show "1 value left raw" | Not changed: the test states a real goal; fixing it means better name recall (see the roadmap), not a weaker test | Open |
| A-22 | Test setup | `run_demo.sh` stack makes two Cloud security tests and the SDK fixture fail | Tests need `ARAN_TRUSTED_PROXIES=127.0.0.1` (to fake client IPs) and a locked core, but the script opens the console and trusts no proxy | LOW | False failures for anyone running the suite | Documented in TEST_REPORT.md with the exact commands | Open (documented) |
| A-23 | Hosted console | If the hosted core runs with the console open, all `/api` routes, including detokenise, are public | The public console needs its API | MEDIUM | Anyone can read the synthetic demo customers' values | None: data is synthetic. Keep it that way in production | Accepted |
| A-24 | Demo bank APIs | No login on bank endpoints | Demo design | LOW | Anyone reaching the port can act as staff | Bound to 127.0.0.1 locally | Accepted |
| A-25 | `app/server/engine.py:91` | Models loaded with `pickle` | scikit-learn models | LOW | Code execution only if someone can replace the model file | File is shipped in the image, not uploaded | Accepted |
| A-26 | `app/web` build | One 706 kB chunk (three.js) | No code splitting | LOW | Slower first load of `/classic` | Lazy-load three.js | Open |
| A-27 | `aran_cloud/main.py`, `demo_bank/bank_txn.py`: SQL built with f-strings (bandit B608, 7 places) | Placeholders lists and column lists | All values are bound parameters; column names are constants | LOW | None found | Reviewed, no change | Accepted (false positive) |

## Totals

| Severity | Found | Fixed or hardened | Open | Accepted |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 2 | 2 | 0 | 0 |
| Medium | 10 | 8 | 1 (A-21) | 1 (A-23) |
| Low | 15 | 7 | 5 (A-12, A-17, A-20, A-22, A-26) | 3 (A-24, A-25, A-27) |
| **Total** | **27** | **17** | **6** | **4** |

## Production readiness

Ready as a **demo and research prototype**. Not yet production ready for a real bank: the demo banks have no login, the hosted console exposes its API for the walkthrough, SQLite is a single-node store, and the NER layer still misses some names. The security model of the Cloud (hashed scoped keys, tenant namespacing, rate limits, audit chain) is sound and was strengthened here.
