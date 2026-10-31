# Audit of the BanksAndCloud branch

Date: 31 Oct 2026. Branch `BanksAndCloud`, 6 commits by Arun Vijay (ArunvijaySNAV), last one at 11:03 IST on 31 Oct, compared with `main` at `3561eb7`. The branch is not merged, and nothing was changed on it.

## What the branch adds

- **Aran Cloud** (`aran_cloud/`): a multi-tenant layer in front of the core. It has workspaces, scoped API keys stored as SHA-256 hashes, per-tenant tokens, a detokenise audit log with a hash chain, a dashboard, and rate limits.
- **Demo bank** (`demo_bank/`): one bank app with two modes. "Legacy" stores raw identifiers, and "Aran" sends everything through Aran Cloud. There is a side-by-side compare page.
- **Python SDK** (`aran_sdk/`).
- **Persistence Lite** (`research/firewall/store.py`): a SQLite store for vault keys, the FF1 key, customer profiles and the Merkle log, encrypted under `ARAN_MASTER_KEY`. It is wired into `engine.py` and `shredder.py`.
- **Core changes** (`app/server`): an optional `X-Aran-Internal` shared secret, an optional `ARAN_ADMIN_TOKEN` for erase and jobs, `customer_ref` and `purpose` on `/api/process` with auto-enrolment, `/api/public-keys`, and immune learning that now starts automatically at startup.
- Scripts (`run_demo.sh`, `seed_demo.py`, `preflight.py`, smoke tests), `docker-compose.yml`, seven planning docs in `docs/`, and 85 design-skill files in `.agent/skills/`.

## Tests run

| Suite | Result |
|---|---|
| `research/test_*.py` (core, AI, next, PQC, registry, shredder) | 45 passed |
| `research/test_persistence.py` (new) | 12 passed |
| `app/server/test_standout.py` | 8 passed |
| `aran_cloud/test_cloud_security.py` and `aran_sdk/test_sdk.py` (new, run against a live core and cloud) | 11 passed |

Nothing that already worked on `main` is broken by the code changes.

## Must fix before merging

1. **The whole Python virtual environment is committed.** There are 9,640 files and 2.16 million lines under `.venv/` (271 MB). It was built on a Mac (`/Users/snarunvijay/...`, `darwin` binaries), so it does not even run on Linux or Windows. The new `.gitignore` lists `.venv/`, but the files were committed anyway. Once this is merged it stays in the git history for good and makes every clone slow, so remove it from the branch before merging.
2. **Local databases and build files are committed.** These are `aran_cloud/cloud.db` (46 test tenants and 103 API key hashes), `demo_bank/data_aran.db`, `demo_bank/data_legacy.db`, their `-wal`/`-shm` files, and `__pycache__/*.pyc`. The data is synthetic, but these are runtime files that change on every run, and the `.gitignore` already says to leave them out.
3. **Anyone can reset the rate limits.** `POST /v1/internal/reset-limiters` has no authentication, so any visitor can clear the signup and per-key limits. Put it behind the admin token or the internal secret, or only enable it in demo mode.
4. **The signup limit can be bypassed with a fake header.** `check_signup_rate_limit` trusts `X-Forwarded-For` directly. I created 7 workspaces in a row past the limit of 5 just by changing that header, and with `ARAN_DEMO_MODE=1` (the setting in `docker-compose.yml`) sending `X-Forwarded-For: 127.0.0.1` skips the limit entirely. Only trust the header from a known proxy.
5. **One bank can find out another bank's customers, or claim them first.** If Bank B sends an Aadhaar that Bank A already enrolled, Aran Cloud answers with `owner_conflict: true` and "identifier already enrolled elsewhere". I tested this live. It tells Bank B that this person banks with another Aran customer, which is exactly the kind of leak Aran exists to stop. The token is also issued under Bank A's owner, so Bank B cannot erase or detokenise its own record, and erasing Bank A's customer also wipes Bank B's copy. A bank could also "squat" on identifiers by sending them first. Each tenant's identifiers should be tokenised under its own namespace, with no cross-tenant signal in the response.
6. **`docker-compose.yml` does not work with the current `Dockerfile`.** The image never copies `aran_cloud/` or `demo_bank/` and does not install `requests`. The core command `uvicorn app.server.main:app` also fails, because `main.py` does `import engine` and the work directory is `/srv/app/server`. On top of that, the cloud volume is mounted at `/srv/aran_cloud` while the code writes `cloud.db` next to `main.py`, so cloud data would not persist. Compose also needs a `.env.local` file that only `run_demo.sh` creates.

## Should fix

7. **The admin token check fails open.** If `ARAN_ADMIN_TOKEN` is not set, `_check_admin` lets everyone erase, and the check uses `!=` instead of `hmac.compare_digest`. `/api/detokenise` on the core has no admin check at all, so it relies only on the optional internal secret. For anything beyond a local demo, refuse to start erase and detokenise without a token.
8. **Turning on the internal secret locks out the console.** The middleware blocks every path except `/api/health`, including `/` and the console's own `/api/*` calls from the browser. If `ARAN_INTERNAL_SECRET` is ever set on the Render site, the live console stops working. Either allow the UI paths through, or document that the core must sit behind the cloud.
9. **Any key can start the demo seeder.** `/v1/demo/seed` only needs a valid key, so a read-only dashboard key can launch a `seed_demo.py` subprocess that can run for up to 60 seconds for each request, which makes it easy to tie up the server. Require the admin scope, and only enable it in demo mode.
10. **CORS is wide open.** It uses `allow_origins=["*"]` together with `allow_credentials=True`. Keys travel in a header, so the risk is low today, but list the real origins.
11. **There is a hard-coded fallback key.** If workspace creation fails, `scripts/run_demo.sh` falls back to `aran_live_c245f4a39a4ad27b2cfe1d0fd4a57f20`. That key exists in no database, so the demo fails later with a confusing 401. It is better to stop with a clear error.
12. **Auto-enrolment on the core is open to any caller.** Any request with a new `customer_ref` creates vault keys, capped at 10,000. The cap is checked outside the engine lock, so parallel requests can go past it.
13. **The live site behaves differently now.** The immune layer starts learning and log replay starts by itself at startup. That is probably intended ("startup learning"), but it changes what visitors to aran-console.onrender.com see.

## Docs and project consistency

14. **`docs/saas_foundation_plan.md` has 23 broken links.** They point to `file:///Users/snarunvijay/...` paths on Arun's laptop. Change them to relative paths.
15. **`app/ui/README.md` says the `/classic` console was removed, but it was not.** `main.py` still serves it and the `Dockerfile` still builds it.
16. **None of the new parts are linked from the main `README.md`, the artifacts index or the vault.** That covers Aran Cloud, the demo bank, the SDK, persistence and the new docs.
17. **There is no beginner Learn doc for the new topics.** Multi-tenant SaaS, API keys and scopes, rate limiting and SQLite persistence are new to the team, and the project rule asks for one Learn doc per new topic.
18. **The commits are authored as ArunvijaySNAV, not "Inbathamizhan S".** That is fine for a teammate's branch, but if the project rule should apply to merged history, squash or re-author the commits when merging.
19. **`.agent/skills/` (85 files) and `docs/design_skills_inventory.md` (1,374 lines) are someone's local design-tool setup.** They are not part of Aran. I suggest leaving them out of `main`.
20. **Minor code issues.** There is a duplicated `return` line in `engine.py`'s customer view (dead code). The `run_demo.sh` logs go to `/tmp`, which does not exist on Windows.

## Suggested next step

Ask Arun to push a cleanup commit that covers items 1 to 6 and 14 at a minimum: remove `.venv`, the databases and the `.pyc` files from the branch, lock down the two cloud endpoints and the forwarded-header trust, fix tenant isolation, make compose build, and fix the links. Then re-run the four suites above and merge. The persistence store, the scoped keys, the audit chain and the bank compare demo are solid work and worth keeping.
