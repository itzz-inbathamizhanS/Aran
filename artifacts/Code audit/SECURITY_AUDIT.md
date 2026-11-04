# Security audit (OWASP Top 10 view)

**Date:** 1 November 2026. No real secrets appear in this report; demo keys printed by local runs were generated for the test run and exist only in the throwaway local database.

## Summary

The security design is strong for a prototype: the core is locked behind a shared secret, Aran Cloud uses hashed, scoped, revocable API keys with per-key and per-IP rate limits, tenants are isolated by namespacing, detokenise is scope-checked and written to a tamper-evident hash chain, receipts are signed (Ed25519 plus ML-DSA-65), and the console and dashboard run under a strict Content-Security-Policy. This audit fixed **one high** issue (a credential sent to the wrong service) and several medium and low hardening gaps. No injection, XSS or broken access control was found.

## Findings by category

| OWASP 2021 | What was checked | Result |
| --- | --- | --- |
| A01 Broken access control | Every Cloud route's scope dependency; tenant filtering in detokenise, trace, erase, keys, team, transactions and metrics; IDOR on `/v1/keys/{id}` and `/v1/team/{id}`; the core lock middleware; stream tokens | Sound. Every query filters on the caller's tenant; foreign tokens get the same "unknown" answer as fake ones. `test_tenant_a_cannot_read_tenant_b`, `test_scoped_api_keys_permissions` and `test_scopes_are_enforced` pass. Accepted risk: demo bank APIs have no login (A-24) |
| A02 Cryptographic failures | Key storage (SHA-256 of 128-bit random keys), master-key encryption of the core store, receipt signatures, constant-time comparisons | Fixed A-03 and A-13 (comparisons). Keys are high entropy, so unsalted SHA-256 is appropriate |
| A03 Injection | All SQL (bandit flagged 7 f-string queries); `LIKE` search; subprocess use; HTML output | No SQL injection: every value is a bound parameter. Fixed A-18 (unescaped `LIKE` wildcards). The demo seed's subprocess uses a fixed argument list. XSS: every `innerHTML` sink with user data goes through `esc()`; a headless browser probe with `<img onerror>` payloads in workspace names, key labels, transactions and bank customer names did not fire on any of 17 pages |
| A04 Insecure design | Over-sharing of secrets between services | **Fixed A-01 (HIGH):** Bank B sent the core's internal secret to Aran Cloud. Accepted A-23: the hosted console's API is public by design and serves only synthetic data |
| A05 Security misconfiguration | CORS, security headers, CSP, debug endpoints, docs | Fixed A-15 (credentialed wildcard CORS) and A-16 (nosniff, referrer policy). Open A-17: bank pages have no CSP yet (they use inline scripts and are framed by the compare page). Operator endpoint `/v1/internal/reset-limiters` is off unless `ARAN_ADMIN_TOKEN` is set |
| A06 Vulnerable components | `pip-audit`, `npm audit` | Fixed A-11 (Pillow 13.0.0, 0 advisories now). Partly fixed A-12: Vite 5.4.21; remaining advisories are dev-server only |
| A07 Identification and authentication | Key lifecycle, revocation, rate limits, signup limits, forwarded-for trust | Sound: `X-Forwarded-For` is trusted only from `ARAN_TRUSTED_PROXIES`. Fixed A-08 (limiter memory could be exhausted with random keys) |
| A08 Software and data integrity | Audit chain, Merkle log, receipts, pickle | Hardened A-07 (audit chain write lock). Accepted A-25 (pickle of shipped model files) |
| A09 Logging and monitoring | Detokenise audit, usage events, no plaintext in logs | Existing test `test_detokenise_audit_and_no_plaintext` passes; the persistence test scans DB, WAL and logs for raw identifiers and finds none |
| A10 SSRF | Outbound calls | Targets come only from server configuration (`ARAN_CORE_URL`, `ARAN_URL`), never from requests. The SDK's `urlopen` uses a configured base URL |

## Secrets scan

Pattern scan for API keys, cloud keys and tokens across the repository (excluding `node_modules` and `.git`). Found three hard-coded `aran_live_` fallback keys in scripts (A-10); they were never valid in any database and are now removed. `.env.local`, databases and `data/` are in `.gitignore`.

## Input validation added

Workspace name and email, protect text, detokenise token, key label and scope count in Aran Cloud (A-09); customer name and customer count in the core (A-02, A-14).

## Remaining risks

1. Hosted console API is open (synthetic data only). Do not load real identifiers into the hosted demo.
2. Demo banks have no authentication and no CSP.
3. Vite dev-server advisories until a move to Vite 6.4.4 or later.
4. SQLite single-node stores; no backup encryption policy beyond the master key for the core store.
5. Name detection is probabilistic: some names pass raw (see A-21).

## Recommendations

* Move bank page scripts into files and add a CSP like the console's.
* Add staff login to the demo banks before any public pilot.
* Upgrade to Vite 6 and lazy-load three.js in `app/web`.
* Rotate the hosted `ARAN_INTERNAL_SECRET` after this change ships, since Bank B previously forwarded it to the cloud (on the hosted service both run in one container, so exposure was internal, but rotation is cheap).
