# Aran as a Firewall as a Service: Plan

**Read first:** [Learn 30 Firewall as a Service](../../docs/learning/30-firewall-as-a-service.md), then Learn 26 (SaaS) and Learn 8 (proxies).

## 1. The answer in one paragraph

Aran Cloud is already most of a SaaS: workspaces, scoped keys, rate limits, `/v1/protect`, `/v1/transactions/protect`, `/v1/gateway`, metering, plans, team roles, audit and a live dashboard (`aran_cloud/main.py`). What stops it being a **firewall as a service** is that a bank must *call* Aran from its own code through the SDK. A firewall sits *in the path* instead. So the work is: give each bank **routes** (a URL on Aran that forwards to their real destination after cleaning the data), **policies** they edit on the dashboard, **monitor mode**, **alerts out** to their security team, and later a **data plane they can run inside their own network** so raw data never leaves the bank.

## 2. What exists and what is missing

| Firewall-as-a-service part | Aran today | Missing |
|---|---|---|
| Tenants, keys, scopes, rate limits | Yes (workspaces, hashed keys) | mTLS per route |
| Inspect and clean content | Yes (core detector, tokens, vault) | Bare 14-digit account numbers (bank-side guard covers it) |
| **In-path insertion** | Only SDK calls and an AI gateway for staff chat | **Routes: reverse proxy to the bank's real upstream** |
| Policies | Fixed behaviour per sink | **Per-tenant rules: route, type, action, versioned** |
| Safe rollout | None | **Monitor mode, then enforce** |
| Failure behaviour | Bank-side outbox and breaker | Per-route fail-open, fail-closed or hold |
| Alerts out | Dashboard only | **Webhooks and SIEM export** |
| Dashboard | 8 tabs, live stream | Routes tab, Policies tab, Blocks feed |
| Data residency | One shared cloud | **Self-hosted data plane** (Docker) with cloud control plane |
| Production base | SQLite, one Render service | Postgres, more than one instance, custom domains, billing |

## 3. Target shape

```
 Bank B apps                 Aran data plane (cloud, or inside the bank)        Real destinations
 ┌───────────┐  log line     ┌─────────────────────────────────────┐            ┌────────────────┐
 │ core bank │──────────────►│ /fw/{route}/...                     │──tokens───►│ log store      │
 │ fraud app │──────────────►│  1 find tenant + route + policy     │──tokens───►│ fraud vendor   │
 │ chat bot  │──base_url────►│  2 detect + tokenise / mask / block │──tokens───►│ AI model       │
 └───────────┘               │  3 forward, or hold, per fail mode  │            └────────────────┘
                             │  4 count + audit, alert on block    │
                             └──────────────┬──────────────────────┘
                                            │ counts only, signed rules down
                             ┌──────────────▼──────────────────────┐
                             │ Aran Cloud control plane            │
                             │ routes · policies · keys · team     │
                             │ dashboard · audit · webhooks · plan │
                             └─────────────────────────────────────┘
```

## 4. Build plan in phases

| Phase | What we build | Where | Who | Size |
|---|---|---|---|---|
| **1. Routes (reverse proxy)** | `routes` table (tenant, name, upstream URL, content type, fail mode, policy). Catch-all `/fw/{route}/{path}` that reads JSON, text or form bodies, cleans every string with the core, forwards with the same headers (minus the Aran key) and returns the upstream answer. Usage and audit rows per call. Dashboard **Routes** tab with "copy this URL". Bank B sends its analytics copy through a route instead of the SDK, and Side by side shows it | `aran_cloud/main.py`, `demo_bank`, dashboard | Inbathamizhan, Aasif | 1 to 2 weeks |
| **2. Policies and monitor mode** | `policies` table with rules (type, action: tokenise, mask, block, allow, alert), versions and rollback. Monitor mode records "would have done" without changing data. **Policies** tab with a test box | Cloud + dashboard | Aasif, Arun | 1 week |
| **3. Alerts out** | Signed webhooks (HMAC header, retries) on block and spike; a CEF / JSON export for SIEM tools; immune-layer alerts sent the same way | Cloud | Aasif | 1 week |
| **4. Drop-in AI gateway** | An endpoint that accepts the same request format as common AI chat APIs, so a bank changes only `base_url`. Prompts cleaned before they leave, answers restored for the allowed role | Cloud, `app/server` gateway | Arun, Bharadhwaj | 1 week |
| **5. Self-hosted data plane** | One Docker image (core + proxy) that pulls signed policies from the cloud, keeps vault keys inside the bank and sends only counts. Answers the RBI localisation question | `Dockerfile`, new `aran_edge/` | Aasif, Inbathamizhan | 2 weeks |
| **6. Production base** | Postgres instead of SQLite, two instances behind a load balancer, per-tenant hostnames (`bankb.fw.aran.cloud`) with TLS, mTLS option, status page, real billing per million messages | deploy, Cloud | everyone | 2 to 3 weeks |

Forward proxy with TLS inspection is left out on purpose: it needs every bank server to trust Aran's certificate, which banks rarely allow for a vendor.

## 5. Rules every phase keeps

1. **The payment never waits.** Routes are for copies, not for the ledger or the payment rail.
2. **Monitor first.** A new route starts in monitor mode; the bank flips it to enforce.
3. **Never store raw.** Routes keep only protected text and counts, the same as `/v1/transactions/protect`.
4. **Tenant from the key, not the URL.** A route name alone never selects a tenant; the key must match the route's tenant.
5. **Block upstreams we should not reach.** Upstream URLs are checked at save time and at call time so a route cannot point at Aran's own internal addresses (SSRF).
6. **Measure honestly.** Each phase adds tests and real numbers on the dashboard, no demo numbers on real pages.

## 6. Recommended first step

Build **phase 1** now. It is the smallest change that makes Aran behave like a firewall in the path, it reuses the core, metering, audit and dashboard that already work, and it gives a clear live demo: change one URL in Bank B, and the analytics vendor starts receiving tokens instead of Aadhaar and PAN numbers.
