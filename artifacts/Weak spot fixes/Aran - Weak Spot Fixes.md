# Aran: weak spot fixes (4 November 2026)

This follows the [live link check and weak spots](../Live%20check%20and%20weak%20spots/Aran%20-%20Live%20Link%20Check%20and%20Weak%20Spots.md) report. Everything below is on one branch and one pull request; nothing reaches the live site until that pull request is merged.

## What was fixed

| Weak spot (report section) | What changed | How it was checked |
| --- | --- | --- |
| 2.1 Two finished pull requests unmerged and clashing | The code audit fixes (PR #13) and the real-data work (PR #14) are combined here with their four conflicts resolved: the real-data version of `aran_cloud/main.py` and `demo_bank/app.py` (no demo seeding, fresh test identities), `scripts/seed_demo.py` deleted, both Learn docs kept in `README.md` | Full suite below |
| 2.5 Names and addresses, flaky test | The bank's customer names go into the keyed registry (lower-cased, so any letter case matches) and are removed on erasure. Name and address **fields** (`applicant`, `customer=`, `addr=` and so on) and free-text addresses ending in a PIN are taken as one whole finding | The flaky test now passes 250 runs in a row (it failed about 3 in 10). Customer names in capitals: 6 of 6 missed before, 0 of 6 now. On 3,000 synthetic log lines, addresses left raw went from 34 to 28 of 498, with no new false name or address findings |
| 2.4 No CSP on the demo banks | Both banks send the console's headers: CSP, `nosniff`, Referrer and Permissions policies, COOP. The side-by-side page frames both banks and calls Aran Cloud, so those origins are allowed; `ARAN_CONNECT_SRC` adds more | New test; headless Chromium on Bank A, Bank B and the side-by-side page with 0 console errors |
| New bug found while testing | Bank B's "Fill a test identity" made cards starting 56 to 59. They pass Luhn but belong to no card network, so Aran left them alone and **Bank B stored about one card in four raw**. Cards now start with 4 or 51 to 55 | The bank smoke test failed 3 times in 12 before, 22 of 22 passed after; 40 sign-ups at both banks then left no raw card in Bank B's database (`test_plaintext_scan_beyond_core_after_seed` passes) |
| 2.7 Roadmap out of date | `docs/research/aran-roadmap.md` and its copy in `artifacts/Roadmap` now open with a status table for all 14 items | Read against the code |

## Test results on the combined branch

| Suite | Result |
| --- | --- |
| Core (`app/server`) | 15 passed (3 new) |
| Aran Cloud | 24 passed, 1 skipped, plus the lockdown test against a locked core |
| Python SDK | 11 passed |
| Demo banks | 50 passed (2 new) |
| Research | 58 passed, 1 skipped; the persistence scan 12 of 12 with bank data present |
| Smoke tests | core 11 of 11, Cloud 12 of 12, banks 9 of 9 |

## Still open (needs a person or money)

1. **Merge the pull request**, then rotate the hosted `ARAN_INTERNAL_SECRET` on Render (Bank B used to forward it to Cloud). After merging, PRs #13, #14 and #15 can be closed.
2. **Keep-awake**: add a free outside pinger (UptimeRobot or cron-job.org) on `aran-console.onrender.com/api/health` and `aran-apps.onrender.com/healthz` every 5 minutes. This needs an account, so it is yours to set up.
3. **Hosted data resets on restart**: needs a Render disk or a free Postgres.
4. **Staff login on the banks, Vite 6 upgrade**: not done here.
5. **Names of strangers** in free text with no cue word: still a model problem (GLiNER, roadmap item 7).
