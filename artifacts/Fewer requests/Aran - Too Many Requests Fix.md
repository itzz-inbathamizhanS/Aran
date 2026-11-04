# Aran: fixing "too many requests" on the live links

Date: 4 November 2026. Read [Learn 31](Aran%20Learn%2031%20-%20Polling%20and%20Rate%20Limits.md) first if polling is new to you.

## What was wrong

Every open page kept asking the server for fresh data on several fast timers, and every one of those calls went through Vercel to Render. The Render request log showed the console alone calling `/api/stats` and `/api/events` every 3 s, `/api/immune` every 4 s and `/api/merkle` plus `/api/customers` every 8 s, about **1.2 requests a second per open tab**, with no stop when the person walked away. The immune pages added a second 2 s poll on top. The bank pages (3 s and 4 s), the compare page (3 s) and the Cloud dashboard (5 s plus 10 s) did the same. The keep-awake job also pinged the four Vercel links every 5 minutes, which only added requests (Vercel never sleeps).

Vercel itself had no firewall rule blocking us, and the Aran Cloud rate limits were not hit in the last few days of Render logs, so the cause was plain volume.

## What changed

| Where | Before | After |
|---|---|---|
| Console background poll (`app/ui/js/data.js`) | 5 endpoints, every 3 to 8 s | 1 call to the new `GET /api/live` every 5 s; Merkle log and customers added every 20 s |
| Immune pages and tour radar | every 2 s | every 4 s |
| Phone arena board | every 1.5 s | every 3 s |
| Bank A / Bank B pages | 3 s and 4 s | 8 s and 15 s |
| Bank KYC list, compare page | 5 s, 3 s | 10 s, 8 s |
| Cloud dashboard refresh / health | 5 s / 10 s | 15 s / 30 s (the live stream still pushes new transactions at once) |
| Any tab hidden or untouched for 10 minutes | kept polling (hidden tabs stopped only on the console) | sends nothing; first touch refreshes at once |
| HTTP 429 answer | treated as a broken connection | poll waits for `Retry-After` (5 to 120 s) |
| Keep-awake job | pinged Render and Vercel | pings Render only |

New server endpoint: `GET /api/live?parts=stats,events,immune,merkle,customers` in `app/server/main.py`. Unknown parts get a 400.

## Checked

- In a real browser for 40 s on Overview: **8 requests** (all `/api/live`), down from about 47.
- On the Traffic page for 20 s: 4 requests.
- Idle for 15 s (idle window shortened for the test): **0 requests**; one call right after moving the mouse.
- Immune, Arena, Customers and Traffic pages open with no script errors; `test_standout.py` passes (12 tests).

Asset version bumped to `v=31` so browsers load the new scripts.
