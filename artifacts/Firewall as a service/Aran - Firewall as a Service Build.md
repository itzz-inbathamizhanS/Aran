# Aran as a Firewall as a Service: what we built

**Status:** built on the `FaaS` branch. All six phases are in the code, with tests and a security review.

**Read first:** [the plan](Aran%20-%20Firewall%20as%20a%20Service%20Plan.md) (why and what), then [Learn 30](Aran%20Learn%2030%20-%20Firewall%20as%20a%20Service.md) (the ideas in plain words), then this page.

**Related:** [security review](SECURITY_REVIEW.md) · [screenshots](.) (the folder with the PNG files) · [aran_edge README](../../aran_edge/README.md)

---

## 1. The idea in one paragraph

Before this work, a bank had to call Aran from its own code. Now a bank can send its data to an **Aran route**, a web address on Aran Cloud. Aran cleans the data using the same detector as before (tokens, masks, blocks), then forwards the cleaned copy to the bank's real destination, such as an analytics vendor or a log store. The bank changes one URL, and the vendor starts receiving tokens instead of Aadhaar or PAN numbers.

---

## 2. What each phase built

Each phase added endpoints (the URLs a program can call), database tables and a part of the dashboard.

### Phase 1: Routes (a reverse proxy)

- **Endpoints:** `POST /v1/routes`, `GET /v1/routes`, `GET /v1/routes/{id}`, `PATCH /v1/routes/{id}`, `DELETE /v1/routes/{id}`, `GET /v1/route-events`. The traffic URL is `/fw/<route>/<path>`.
- **Tables:** `routes`, `route_events` (one row per call, counts only), `route_outbox` (held copies waiting for the upstream).
- **Behaviour:** reads JSON, text, NDJSON and form bodies; cleans every string; forwards with the same headers, minus the Aran key; returns the upstream answer. Two modes: **monitor** (forward the original, only count) and **enforce** (forward the cleaned copy). A route can say what to do when Aran is down: `hold`, `open` or `closed`.
- **Dashboard:** **Routes** tab with a "Copy URL" button and a curl example.

### Phase 2: Policies and monitor mode

- **Endpoints:** `GET /v1/policies`, `POST /v1/policies` (each save makes a new version), `GET /v1/policies/{id}`, `POST /v1/policies/test` (shows what a policy would do to a text, stores nothing), `POST /v1/policies/{name}/rollback`, `GET /v1/config-audit`, `GET /v1/config-audit/verify`.
- **Tables:** `policies` (versioned rules), `config_audit` (a hash chain, so any edit to an old row breaks the chain).
- **Rules:** a list of `{"type": "PAN", "action": "block"}`. Types are AADHAAR, CARD, MOBILE, PAN, UPI, or `*` for all. Actions are tokenise, mask, block, allow, alert. The first matching rule wins. At most 50 rules.
- **Dashboard:** **Policies** tab with versions, "Used by", roll back, and a test box.

### Phase 3: Webhooks, spike alerts and SIEM export

- **Endpoints:** `POST/GET/PATCH/DELETE /v1/webhooks`, `POST /v1/webhooks/{id}/test`, `GET /v1/webhook-deliveries`, `GET /v1/events/export?format=json|cef`.
- **Tables:** `webhooks` (the secret is shown once), `webhook_deliveries`.
- **Behaviour:** each POST is signed with HMAC-SHA256 over the timestamp, a dot and the raw body (`X-Aran-Signature: sha256=...`). Failed deliveries are retried after 1 s, 5 s, 30 s, 2 min and 10 min. The SDK has `verify_webhook` to check a signature. Payloads hold identifier types and counts, never values.
- **Dashboard:** **Webhooks** tab with "Send test" and an add form. The SIEM export is shown there too.

### Phase 4: Drop-in AI gateway

- **Endpoints:** `POST /v1/ai/v1/messages` (same format as the common message API), `POST /v1/ai/v1/chat/completions` (the OpenAI chat format), `GET /v1/ai/stats`.
- **Behaviour:** prompts are cleaned before they go to a model. A bank changes only the base URL. With no provider key set, the gateway answers with a local echo, so it can be tried with no outside account. Answers are restored only for a role that is allowed to see them.
- **Dashboard:** an "AI gateway" card on the Routes tab, with the base URL and the last 24 hours.

### Phase 5: Self-hosted data plane (`aran_edge`)

- **Cloud endpoints:** `GET /v1/edge/public-key`, `POST /v1/edge/register`, `GET /v1/edge/config`, `POST /v1/edge/report`, `GET /v1/edges`.
- **Cloud tables:** `edges`, `edge_reports`, `edge_versions`, `edge_signing`.
- **The edge program:** a small service (`aran_edge/`) that runs inside the bank's network. It cleans traffic with the bank's own core, so raw values never leave the bank. Cloud sends signed settings (Ed25519, valid for 10 minutes). The edge sends back counts only: calls, protected, blocked, held, and timing.
- **Dashboard:** a **Data planes** section on the Routes tab, with status, last report, version applied and 24-hour counts.

### Phase 6: Production base

- **Database:** Postgres 16 is an option (`ARAN_CLOUD_DATABASE_URL`). A small adapter in `aran_cloud/db.py` turns the SQLite SQL into Postgres SQL. Background jobs (the sweepers) use leases, so only one instance runs each job.
- **Endpoints:** `GET /v1/status` and `GET /status` (a public health page with no customer data), `GET /v1/billing/preview`, `GET /v1/billing/invoices`, `POST /v1/billing/close-month` (operator token; closing a month twice gives the same invoice).
- **Tables:** `leases`, `invoices`.
- **Deployment:** `docker-compose.yml` has an `ha` profile: two Cloud instances on one Postgres, behind nginx. nginx gives each tenant a host name (`<route>.<tenant>.fw...`) and has an mTLS example in `deploy/nginx/aran-cloud.conf`. Client certificates can be required per route.
- **Dashboard:** **Usage and plan** tab with the invoice preview (marked "nothing is collected"), and the public `/status` page.

---

## 3. Try it in five steps

The stack must be running (Cloud on port 8100, the core on 8000). Start it with `bash scripts/run_demo.sh`.

**Step 1. Make a workspace.** Save the three keys from the answer. The admin key is shown once.

```bash
curl -X POST http://127.0.0.1:8100/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "My Bank", "email": "security@mybank.example"}'
```

**Step 2. Create a policy.** Block PAN numbers, tokenise Aadhaar, mask cards.

```bash
export ADMIN=<api_key from step 1>
curl -X POST http://127.0.0.1:8100/v1/policies \
  -H "X-API-Key: $ADMIN" -H "Content-Type: application/json" \
  -d '{"name": "analytics-policy", "rules": [
        {"type": "PAN", "action": "block"},
        {"type": "AADHAAR", "action": "tokenise"},
        {"type": "CARD", "action": "mask"}]}'
```

Copy the `id` of the answer (it starts with `pol_`).

**Step 3. Create a route.** It starts in monitor mode: calls are forwarded untouched and only counted. This example uses a local test address, which is allowed only in demo mode.

```bash
curl -X POST http://127.0.0.1:8100/v1/routes \
  -H "X-API-Key: $ADMIN" -H "Content-Type: application/json" \
  -d '{"name": "analytics", "upstream_url": "http://127.0.0.1:9100/ingest",
       "purpose": "Service", "fail_mode": "hold", "mode": "monitor",
       "policy_id": "<pol_ id from step 2>"}'
```

**Step 4. Send traffic through the route.** Your system uses this address instead of the vendor's.

```bash
curl -X POST http://127.0.0.1:8100/fw/analytics/ingest \
  -H "X-API-Key: $ADMIN" -H "Content-Type: application/json" \
  -d '{"customer": "Ravi Kumar", "aadhaar": "2490 1748 7341", "mobile": "9876543210"}'
```

Switch the route to enforce mode, then send a PAN number. The answer is `403`:

```bash
curl -X PATCH http://127.0.0.1:8100/v1/routes/<rt_ id> \
  -H "X-API-Key: $ADMIN" -H "Content-Type: application/json" -d '{"mode": "enforce"}'
curl -X POST http://127.0.0.1:8100/fw/analytics/ingest \
  -H "X-API-Key: $ADMIN" -H "Content-Type: application/json" -d '{"kyc": "PAN ABCPK1234F"}'
```

**Step 5. Look at the result.** Open the dashboard with your dashboard key, then check the route's events:

```bash
curl "http://127.0.0.1:8100/v1/route-events?limit=5" -H "X-API-Key: $ADMIN"
```

Open `http://127.0.0.1:8100/dashboard#key=<dashboard key>&tab=routes` in a browser. The Routes tab shows the calls, the protected count and the blocked count. The `/status` page at `http://127.0.0.1:8100/status` shows service health.

---

## 4. Test results

These are the results recorded for the build. The numbers come from the test runs done for the security review.

| Suite | Result | Notes |
|---|---|---|
| aran_cloud | 119 passed, 3 skipped, 2 failed | The 2 failures are `test_core_lockdown` and `test_rate_limits`. They come from the local setup (the core console is open and the signup limit is raised here), not from the new code. |
| aran_cloud on Postgres 16 | passed (no count recorded) | The Cloud suite was also run with `ARAN_CLOUD_DATABASE_URL` pointing at Postgres 16. The run's totals were not saved with the review. |
| aran_sdk | 13 passed | Includes `verify_webhook`. |
| demo_bank | 41 passed | Bank B's analytics copy goes through a route. |
| aran_edge | 25 passed | Signature checks, version rules, forwarding and reporting. |
| nginx mTLS | checked | Client certificate fingerprint passed through nginx; the plain listener clears the header. |

The security review also has 6 findings. Each has a fix and a regression test. See the [security review](SECURITY_REVIEW.md).

---

## 5. Screenshots

All taken at 1440 by 900, with the device scale set to 2. The demo workspace is "Riverside Co-operative Bank". One route, `analytics`, sends to a local test service. It was switched from monitor to enforce mode during the demo.

| File | What it shows |
|---|---|
| [01-routes.png](01-routes.png) | Routes tab: the `analytics` route in enforce mode, with calls, protected and held counts, and the "Add a route" form. |
| [02-policies.png](02-policies.png) | Policies tab: `analytics-policy` at version 2 of 2, its rules, and "Used by" the route. |
| [03-webhooks.png](03-webhooks.png) | Webhooks tab: one signed webhook with delivered and failed counts, and the add form. |
| [04-data-planes.png](04-data-planes.png) | Data planes section (Routes tab): the `branch-14-edge` edge, online, with its applied version and counts. |
| [05-usage-invoice.png](05-usage-invoice.png) | Usage and plan tab: calls this month, the plan, the invoice preview and the invoice from usage. Nothing is collected. |
| [06-status.png](06-status.png) | The public `/status` page: service health, with no customer data. |

---

## 6. What is left

- **No real payment provider.** Invoices are a record of what would be charged. Nothing is collected. A payment provider needs a contract and a decision on which one.
- **Real custom domains and TLS certificates** need a domain name that Aran controls. Per-tenant host names such as `bankb.fw.aran.cloud` are set up in nginx, but the certificates are not issued here.
- **The `ha` compose profile** (two Cloud instances, Postgres, nginx) was not run on this machine. It is written and the nginx file was checked, but the full profile needs a Docker host.
- **Remaining risks from the security review**, not changed in this work:
  - Headers are not cleaned when forwarded live. Only the body, path and query are. Callers should not put identifiers in headers.
  - Webhook secrets and a held request's upstream `Authorization` header are stored in plain text. Encrypting them needs a key decision.
  - Edge reports can be inflated by anyone holding the edge key. They are counts only, and a retried report may be counted twice.
  - Upstream and webhook calls ignore `HTTP(S)_PROXY`. A deployment that needs an egress proxy must do its own address filtering.
  - Demo mode (`ARAN_FAAS_ALLOW_PRIVATE_UPSTREAMS=1`) allows private addresses on purpose. Never set it in production.
  - The `X-Aran-Role` header on the AI gateway is chosen by the caller. It only puts back values from the same request.
  - Rate limits are kept in memory per instance. With two Cloud instances a key can get up to twice the limit.

