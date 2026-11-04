# Bug fixes from the 1 November 2026 audit

Each entry gives the original problem, how it was reproduced, the root cause, the change, and how it was checked. "Old" means a second copy of `main` running on spare ports (core on 8002, Cloud on 8101); "new" means the fixed code. Issue IDs match [AUDIT_REPORT.md](AUDIT_REPORT.md).

## A-02: blank customer name crashed the console API (HIGH)
* **Reproduced:** `POST /api/customers {"name": "   "}` returned **500** on old.
* **Cause:** `engine.add_customer` builds a UPI id from `name.split()[0]`; an all-space name splits to nothing.
* **Fix (`app/server/main.py`):** the name is trimmed and collapsed; blank becomes `None`, so the engine generates a name. `name` is limited to 80 characters, and the route refuses new customers past 10,000 (A-14) with 429.
* **Checked:** new returns **200**. Core tests pass.

## A-03: non-ASCII auth header caused 500 (MEDIUM)
* **Reproduced:** `X-Aran-Internal: é` on `GET /api/stats` returned **500** on old (expected 401).
* **Cause:** `hmac.compare_digest` raises `TypeError` when a `str` holds non-ASCII characters.
* **Fix:** compare UTF-8 bytes in the core middleware, the core admin check and the Cloud's `require_admin_token`.
* **Checked:** new returns **401**; a valid secret still returns 200; `test_core_lockdown` passes against a locked core.

## A-04 and A-05: client errors reported as 502 Bad Gateway (MEDIUM, LOW)
* **Reproduced on old Cloud:** erase of an unknown customer, `customer_ref: "../x"`, and 30,000-character text all returned **502**.
* **Cause:** `call_core` (Cloud) and `call_aran` (bank) turned every `requests` exception into 502.
* **Fix:** keep the upstream status for 400, 404, 409, 422 and 423; 502 only for network failures and 5xx. The SDK already maps these codes to `AranError` with the right `status_code`.
* **Checked on new:** 404, 422 and 422. Cloud, SDK and bank suites and all three smoke tests pass.

## A-06: demo seed showed 198 of 200 transactions (MEDIUM)
* **Reproduced:** `aran_cloud/test_transactions.py::test_demo_seed_fills_the_dashboard_and_is_labelled` failed with `198 == 200`.
* **Cause:** the seed spread transactions from 59 minutes ago, but the 1 h, 5-minute chart starts at the first full bucket, which can be up to 5 minutes later than an hour ago.
* **Fix (`seed_demo_transactions`):** spread them over the last 54 minutes.
* **Checked:** the test passes.

## A-07: audit hash chain could fork under concurrency (MEDIUM, hardening)
* **Tried to reproduce:** 80 concurrent detokenise calls over 16 threads; `/v1/audit/verify` stayed valid on old and new, so the race was not hit in practice.
* **Cause:** `log_detokenise_audit` read the last hash before the connection held SQLite's write lock.
* **Fix:** start the write with `BEGIN IMMEDIATE` (or reuse the write lock already held by the caller's transaction) before reading the last hash.
* **Checked:** the same 80-call probe keeps the chain valid; `test_detokenise_audit_and_no_plaintext` (which tampers with a row and expects verification to fail) passes.

## A-08: rate-limiter memory grew without bound (MEDIUM)
* **Cause:** `defaultdict(deque)` entries were created for every key hash and IP, including random invalid keys, and never removed.
* **Fix:** `_sweep_stale` drops callers with no request inside the window once 5,000 are tracked.
* **Checked:** `test_rate_limits` (signup 429 with `Retry-After`, per-key limit) passes.

## A-09: missing input limits in Aran Cloud (MEDIUM)
* **Reproduced on old:** an empty workspace name and the email `nope` were accepted (**200**).
* **Fix:** `WorkspaceIn` name 1 to 120 characters, email `x@y` form up to 254; `ProtectIn.text` up to 20,000 (the core's own limit); `DetokeniseIn.token` up to 200; `KeyCreateIn.label` 1 to 80 and at most 8 scopes.
* **Checked on new:** 422 for the bad workspace and oversize text; all Cloud tests pass.

## A-01: core secret sent to Aran Cloud (HIGH, security)
* **Cause:** `aran_headers` in `demo_bank/app.py` always added `X-Aran-Internal` and the API key, whether the target was the core or the cloud.
* **Fix:** `_is_cloud(url)` decides; the internal secret goes only to the core (the direct sample fallback), the API key only to the cloud.
* **Checked:** bank tests (41), the bank end-to-end smoke test (9 steps) and the compare page all work.

## A-10: hard-coded API keys (MEDIUM)
* `scripts/run_demo.sh`, `scripts/seed_demo.py` and `demo_bank/names_experiment.py` now use `ARAN_API_KEY` from the environment, or stop with a clear message. The dead `cloud.db` read in `seed_demo.py` (it fetched a prefix and threw it away) was removed.

## A-11 and A-12: dependencies
* Pillow 12.3.0 to **13.0.0** (`pip-audit`: 39 advisories before, none after).
* Vite 5.4.11 to **5.4.21**; the production build still succeeds. Remaining Vite and esbuild advisories affect only the dev server and need Vite 6.4.4 or later.

## Smaller fixes
* **A-13:** constant-time admin token check in the core.
* **A-15:** `allow_credentials=False` in Cloud and bank CORS (keys travel in headers, no cookies are used).
* **A-16:** `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` on every Cloud and bank response. Frame headers were not added because the compare page frames both banks.
* **A-18:** bank transaction search escapes `%`, `_` and `\`.
* **A-19:** 47 unused imports and empty f-strings removed in 19 files. `app/server/engine.py` was left untouched because `main.py` uses names it re-exports (`E.PURPOSES`, `E.verify_receipt`, `E.BACKUP_POLICY_STATEMENT`).

## Files changed

`app/server/main.py`, `app/server/standout.py`, `app/server/requirements.txt`, `app/web/package.json`, `app/web/package-lock.json`, `aran_cloud/main.py`, `aran_cloud/test_cloud_security.py`, `aran_sdk/test_sdk.py`, `demo_bank/app.py`, `demo_bank/bank_txn.py`, `demo_bank/names_experiment.py`, `demo_bank/smoke_test.py`, `demo_bank/test_transactions.py`, `research/experiment_next.py`, `research/experiment_pqc.py`, `research/gateway/ai_gateway.py`, `research/test_persistence.py`, `scripts/preflight.py`, `scripts/run_demo.sh`, `scripts/seed_demo.py`, `scripts/smoke_test.py`. Test files changed only by removing unused imports. No files were deleted and no database was changed.
