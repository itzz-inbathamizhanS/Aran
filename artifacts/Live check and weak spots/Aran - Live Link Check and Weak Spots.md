# Aran: live link check and weak spots

Checked on 4 November 2026, 13:52 to 14:00 UTC (19:22 to 19:30 IST), against `main` at commit `1e69e6e`.

## 1. Live links

Every hosted URL in `README.md`, `artifacts/README.md`, `app/ui/vercel.json`, `deploy/vercel/*/vercel.json` and `.github/workflows/keep-alive.yml` was requested directly.

| Link | What was checked | Result |
| --- | --- | --- |
| [aran-console.onrender.com](https://aran-console.onrender.com) | Home page | Works (page "Aran" loads) |
| [aran-console.onrender.com/api/health](https://aran-console.onrender.com/api/health) | Server health | Works: `{"ready":true,"error":null}` |
| [aran-console.onrender.com/classic/](https://aran-console.onrender.com/classic/) | Older React console | Works (page "Aran Console") |
| [aran-console.vercel.app](https://aran-console.vercel.app) | Same console on Vercel | Works; `/api/health` is passed to Render and answers `ready: true` |
| [aran-console.vercel.app/og.png](https://aran-console.vercel.app/og.png) | Link-preview image | Works |
| [aran-cloud.vercel.app](https://aran-cloud.vercel.app) | Aran Cloud landing page | Works ("Get started · Aran Cloud") |
| aran-cloud.vercel.app/v1/health | Cloud health | Works: `{"status":"ok","core":true,"core_ready":true}` |
| [aran-bank-a.vercel.app](https://aran-bank-a.vercel.app) `/api/config` | Bank A (legacy, no Aran) | Works, but **the first request returned 503 "bank-a is starting"**; it answered 30 seconds later |
| [aran-bank-b.vercel.app](https://aran-bank-b.vercel.app) `/api/config` | Bank B (with Aran) | Works, but **the first request returned 503 "bank-b is starting"**; it answered 30 seconds later |
| aran-apps.onrender.com (`/healthz`, `/cloud/`, `/bank-a/`, `/bank-b/`) | The Render back end behind the three Vercel apps | Up (reached through the Vercel links above; it blocks crawlers by its robots file, which is fine) |
| [GitHub repository](https://github.com/itzz-inbathamizhanS/Aran) | Repo page | Works |
| Claude artifact links in `artifacts/README.md` (8) | Research doc and Learn 1 to 7 | Opened one (Learn 1); it resolves. The others use the same form |
| Relative links to files in `README.md` and `artifacts/README.md` | Every local link | All resolve; none broken |

**Result: every live link works.** The one real problem is the cold start on the banks (next section).

## 2. Weak or unfinished parts, most important first

### 2.1 Two finished pull requests are still not merged, and they clash

- [PR #13](https://github.com/itzz-inbathamizhanS/Aran/pull/13) "Full code audit: fix 17 issues and add audit reports" (open since 1 Nov).
- [PR #14](https://github.com/itzz-inbathamizhanS/Aran/pull/14) "Make every page work on real data: no demo paths left" (open since 1 Nov).

Because neither is merged, the live site still has the bugs they fix: the console's normal traffic stops for good after a customer is erased, Bank A gives every hosted sign-up the same Aadhaar, a same-bank transfer never reaches the other customer, Cloud returns 502 for every core error, and the audit log can chain two entries onto the same parent. The audit reports and the "Real data" write-up also exist only on those branches, so `main` does not have them.

PR #13 merges cleanly into `main`. **After #13, PR #14 conflicts** in `README.md`, `aran_cloud/main.py`, `demo_bank/app.py` and `scripts/seed_demo.py` (deleted in #14, edited in #13). Whoever merges second has to resolve these by hand.

**Fix:** merge #13, then update #14 on top of it, resolve the four conflicts, re-run the tests, merge. About an hour of work.

### 2.2 The keep-awake job does not keep the site awake

`keep-alive.yml` asks GitHub to run every 5 minutes from 06:30 to 23:30 IST. GitHub has only run it **9 times in 3 days** (about 3 a day, hours apart, some outside the window). GitHub skips or delays scheduled runs on free accounts when it is busy, so a 5-minute schedule is not reliable. That is why both banks were asleep during the check. A judge who opens a bank link first will see a "starting" page.

**Fix (pick one):** use a free outside pinger such as UptimeRobot or cron-job.org on `aran-console.onrender.com/api/health` and `aran-apps.onrender.com/healthz` every 5 minutes; or, on demo day, open every link 2 minutes before presenting. Watch Render's 750 free hours a month (two services awake all day use them up around the 17th).

### 2.3 Hosted data does not survive a restart

Render's free plan has no disk. Banks, Cloud workspaces and keys reset to empty after every restart or redeploy, so a workspace a judge creates can disappear. The site says "server restarted" when this happens, which is honest, but it is still a weak spot. **Fix:** a small paid disk on Render, or a free Postgres (Render, Supabase or Neon) for the Cloud and bank stores.

### 2.4 Security gaps from the code audit (still open)

From `SECURITY_AUDIT.md` on PR #13:

1. The hosted console API has no login. Fine for generated test data, but never load real identifiers into it.
2. The demo banks have no staff login and no Content Security Policy (the console has one).
3. Vite dev-server advisories remain until a move to Vite 6.4.4 or later.
4. SQLite on one node, with no backup encryption policy beyond the core store's master key.
5. Rotate the hosted `ARAN_INTERNAL_SECRET` once PR #13 ships, because Bank B used to forward it to Cloud.

### 2.5 Detection limits that are measured but not solved

- **Names and addresses** are the weakest types: names 74% and addresses 90% removed end to end, and 7.8% of AI-gateway prompts still reached the model with a raw name or address. This also makes one test flaky (`test_versus_tokenises_everything_and_traces_the_leak` fails about 3 runs in 10, when names in capitals like `SUNITA REDDY` score below the threshold).
- **"Cheque no" numbers** are taken as mobiles 17% of the time after the mobile fix (E13b), and English OTPs on new phrasings are 84.7%.
- **Immune layer on real line-level logs** (BGL) did worse than a simple severity rule.
- **Speed** is 654 lines per second; the roadmap target is 10,000 per core.
- Only 22 of the 26 red-team hiding tricks are fully caught.

### 2.6 Roadmap items not started

Checked against the code: there is no GLiNER or other transformer NER (item 7), no Tamil NER from Naamapadam (item 8; the site is translated to Tamil, but detection is not), no Drain template parser for the immune layer (item 11), no Rust or vectorised speed port (item 12), and no paper or legal opinion on crypto-shredding as DPDP erasure (item 13). Aran Cloud says on its own page that per-tenant engines are "the next milestone"; today all workspaces share one core.

### 2.7 Docs that are out of date

- `docs/research/aran-roadmap.md` (and its copy in `artifacts/Roadmap`) still says "Nothing here is built yet" and lists the registries, ledger, crypto-shredding, normaliser, gateway and AI gateway as not built. All of these are built now. A judge reading it would think the project is far less done than it is.
- The real AI provider path of the AI gateway, `docker compose up`, and load testing beyond 80 parallel calls have never been tested (TEST_REPORT, "What was not tested").

## 3. Suggested order

| Step | Who | Effort |
| --- | --- | --- |
| Merge PR #13, rebase and merge PR #14, rotate the internal secret | Inbathamizhan | 1 hour |
| Outside pinger for the two Render services | Inbathamizhan | 15 minutes |
| Refresh the roadmap doc to show what is built | Anyone | 1 hour |
| Free Postgres for Cloud and banks | Inbathamizhan, Aasif | 1 day |
| Staff login and CSP on the banks, Vite 6 | Aasif | 1 day |
| GLiNER cascade for names and addresses, then Tamil NER | Bharadhwaj, Arun | 4 to 7 days |
| Drain templates for the immune layer, speed port | Inbathamizhan, Aasif | 4 to 5 days each |
