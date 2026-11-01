# Test report

**Date:** 1 November 2026. **Environment:** Linux container, Python 3.13.18, Node 22, Chromium (Playwright). All four services started with `scripts/run_demo.sh` (core 8000 with persistence, Cloud 8100, Bank A 9001, Bank B 9002). Real Loghub logs fetched with `research/fetch_data.sh`. Every result below was actually run; nothing is estimated.

## Results after the fixes

| Suite | Command | Before | After |
| --- | --- | --- | --- |
| Research (mechanisms, AI, immune, registry, persistence, PQC, gateway) | `cd research && PYTHONPATH=.:../app/server python -m pytest -q .` | 58 passed, 1 skipped | **59 passed** |
| Core demo endpoints | `python -m pytest -q app/server` | 12 passed | **12 passed**, but `test_versus...` is flaky (see below) |
| Aran Cloud (security, transactions, metrics, stream, team, SLO) | `python -m pytest -q aran_cloud` | 22 passed, 3 failed | **24 passed, 1 skipped**, plus `test_core_lockdown` passed against a locked core |
| Python SDK | `python -m pytest -q aran_sdk` | 2 passed, 9 errors (signup limit) | **11 passed** |
| Demo banks (payments, ledger, fraud desk, copies) | `python -m pytest -q demo_bank` | 41 passed | **41 passed** |
| Core smoke test | `python scripts/smoke_test.py` | 11 of 11 | **11 of 11** |
| Aran Cloud smoke test | `python aran_cloud/smoke_test.py` | not run | **12 of 12** |
| Banks end-to-end smoke test | `python demo_bank/smoke_test.py` | not run | **9 of 9** |
| React production build | `cd app/web && npm ci && npm run build` | built | **built** (one 706 kB chunk warning, A-26) |
| Browser pass (17 pages and dashboard views) | headless Chromium with XSS payloads planted | not run | **0 console errors, 0 page errors, XSS did not fire** |

**Totals after fixes:** 147 pytest tests passed plus the lockdown test (148), 1 skipped, 32 smoke-test steps passed, the build passed. The only red result is the flaky test below.

## How to run the Cloud and SDK tests correctly

Two Cloud tests and the SDK fixture need settings that `run_demo.sh` does not use (issue A-22):

* `test_rate_limits` and the SDK fixture send `X-Forwarded-For` to look like different clients. Aran Cloud believes that header only from a trusted proxy, so start it with `ARAN_TRUSTED_PROXIES=127.0.0.1`. Without it every signup counts against 127.0.0.1, the limit of 5 is hit, and the SDK tests fail with 429.
* `test_core_lockdown` expects the core to refuse calls without the secret. `run_demo.sh` opens the console's API (`ARAN_CONSOLE_OPEN=1`), so run this one test against a locked core:

```bash
export ARAN_TRUSTED_PROXIES=127.0.0.1 && bash scripts/run_demo.sh
set -a && . ./.env.local && set +a
(cd app/server && python -m uvicorn main:app --port 8001 &)     # a locked core, no ARAN_CONSOLE_OPEN
ARAN_CORE_URL=http://127.0.0.1:8001 python -m pytest -q aran_cloud/test_cloud_security.py -k lockdown
```

## Regression checks for each fix

The original code ran side by side on spare ports (core 8002, Cloud 8101) so each bug was seen failing first.

| Check | Original | Fixed |
| --- | --- | --- |
| `POST /api/customers {"name":"   "}` | 500 | 200 |
| `GET /api/stats` with `X-Aran-Internal: é` | 500 | 401 |
| `GET /api/stats` without the header (locked core) | 401 | 401 |
| Cloud: erase an unknown customer | 502 | 404 |
| Cloud: `customer_ref: "../x"` | 502 | 422 |
| Cloud: 30,000-character text | 502 | 422 |
| Cloud: empty workspace name, email `nope` | 200 (accepted) | 422 |
| Cloud: empty key label (valid admin key) | accepted (no limit in the model) | 422; a normal label still returns 200 |
| Cloud: 80 concurrent detokenise calls, then `/v1/audit/verify` | valid | valid |
| Demo seed: 200 transactions on the 1 h dashboard | 198 | 200 (test passes) |
| `pip-audit` on `app/server/requirements.txt` | 39 advisories (Pillow) | none |
| `npm audit` in `app/web` | 2 (dev server) | 2 (dev server; needs Vite 6) |

## Static analysis

* `ruff --select F,E9`: 56 findings before; 8 after (unused local variables in tests and scripts, A-20). No undefined names.
* `bandit -ll`: 12 medium findings, all reviewed. 7 were SQL built with f-strings where every value is bound (false positives), 1 pickle of shipped models (accepted), 4 `urlopen` calls to configured URLs (no request-controlled URL).

## Known flaky test (A-21)

`app/server/test_standout.py::test_versus_tokenises_everything_and_traces_the_leak` failed in about 3 of 10 runs on both the original and the fixed code. In 1,200 sampled requests, 39 left one value raw. In every case it was a name or street the NER model scored at p of about 0.2 (for example `SUNITA REDDY` in capitals, or `Park Avenue`), below the sink's threshold. Identifiers with check digits were always protected. This is a model recall limit, not a code bug; it was left open and not hidden.

## What was not tested

* The hosted Render and Vercel deployments (no deploy access from this audit).
* `docker compose up` (no Docker daemon in the audit container); the same commands were run directly.
* The real AI provider path of the AI gateway (needs an API key); the recorder upstream tests passed.
* Load and soak testing beyond the 80-call concurrency probe.
