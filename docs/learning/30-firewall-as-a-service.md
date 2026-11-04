# Aran Learn 30: Firewall as a Service (FWaaS)

**For:** everyone. Aasif first (security and network path), then Inbathamizhan (product and dashboard). **Time:** about 1 hour. **Before this:** Learn 8 (web APIs and proxies) and Learn 26 (SaaS and multi-tenancy).

Aran Cloud is already a SaaS: a bank signs up, gets a key and calls `/v1/protect`. A **firewall as a service** goes one step further. The bank does not call Aran from its code at all. It changes *where its data goes*, and Aran sits in the path, checks every message and lets only safe data through. This doc explains the words you need to understand that change.

## 1. What a firewall is, and what kind Aran is

A **firewall** stands between two places and decides what may pass.

| Kind | Looks at | Decides on | Example |
|---|---|---|---|
| Network firewall | IP address and port | allow or drop a connection | "only port 443 from the office" |
| Web application firewall (WAF) | HTTP requests coming **in** | block attacks such as SQL injection | Cloudflare WAF |
| **Data-flow firewall (Aran)** | the **content** of data going **out** to copies | tokenise, mask, block or alert on identifiers | Aadhaar in a log line becomes a token |

Aran is the third kind. It does not stop hackers at the door. It stops raw identifiers from leaking into logs, analytics, fraud tools and AI chat.

## 2. What "as a service" adds

**FWaaS** means the firewall runs in the provider's cloud, not on the customer's machines. Zscaler and Cloudflare sell firewalls this way.

| Firewall box in the bank | Firewall as a service |
|---|---|
| The bank buys and runs hardware | The provider runs it for every customer |
| Rules are typed on the box | Rules are set on a website and pushed everywhere |
| Logs stay on the box | Every decision shows on a shared dashboard |
| Upgrading means a site visit | The provider upgrades everyone at once |

## 3. How traffic gets into the firewall (insertion)

A firewall only works if data actually passes through it. Putting it in the path is called **insertion**. There are four common ways.

1. **Reverse proxy (front door).** The bank used to send logs to `logs.vendor.com`. Now it sends them to `bankb.fw.aran.cloud/logs`. Aran cleans the body and forwards it to `logs.vendor.com`. The bank only changes a URL.
2. **Drop-in API (base URL swap).** An app that calls an AI model changes `base_url` from the AI provider to Aran's gateway. Same request format, so no other code changes.
3. **Forward proxy.** The bank sets `HTTPS_PROXY=aran` on its servers, so all outgoing traffic flows through Aran. Reading HTTPS this way needs **TLS inspection**: the bank trusts Aran's certificate. It is powerful but heavy, so it comes last.
4. **Agent or sidecar.** A small Aran container runs next to the bank's app, inside the bank's network. Data never leaves the bank; only counts go to the cloud.

## 4. Control plane and data plane

Every FWaaS is split in two:

- The **control plane** is the website and API where rules, keys, teams and dashboards live. It is shared by all tenants.
- The **data plane** is the part that actually touches each message. It must be fast and close to the data.

Indian banks care about this split because of **RBI data localisation** and its **outsourcing rules**: raw customer data should stay in India, and the bank stays responsible for any vendor. A **hybrid** design keeps the data plane inside the bank (or in an Indian region) and runs only the control plane as shared SaaS.

## 5. Policies, modes and failure

- A **policy** is a list of rules: *on route X, for identifier type Y, do action Z* (tokenise, mask, block, allow, alert).
- **Monitor mode** (also called dry run) only reports what *would* have happened. Banks always start here so the firewall cannot break anything on day one.
- **Fail-open** means if Aran is down, data passes as before. **Fail-closed** means data is held. Aran's banks use a third choice already: hold the copy in an **outbox**, retry, and mask it if Aran never answers. The payment itself never waits.

## 6. What makes it safe to sell

| Need | What it means |
|---|---|
| Tenant isolation | One bank's routes, rules, tokens and logs are invisible to another (Learn 25) |
| mTLS | Both sides show a certificate, so only the real bank can use its route |
| Signed config | A data plane only accepts rules signed by the control plane |
| Audit trail | Every rule change and every block is recorded in the hash-chained audit |
| Webhooks and SIEM export | Alerts reach the bank's own security team (their SOC) |
| Status page and SLO | The bank can see uptime and latency promises being met |
| Laws | DPDP Act 2023 (Aran is a *data processor*), CERT-In 6-hour incident reporting, RBI outsourcing |

## 6b. Running it for real (the production base)

- **Database.** Aran Cloud keeps its data in a SQLite file by default. Set `ARAN_CLOUD_DATABASE_URL=postgresql://...` and it uses Postgres instead (`aran_cloud/db.py` translates the few SQLite-only statements). Install `psycopg[binary]` for that.
- **Two instances.** The `ha` compose profile starts Postgres, two Cloud instances and an nginx load balancer (`deploy/nginx/aran-cloud.conf`). The background jobs (retrying held requests, delivering webhooks) take a *lease*, a row with an expiry time in the database, so only one instance runs each job at a time. The rate limiter is in memory per instance, so with two instances a key can use up to twice its limit.
- **Host names.** `<route>.<tenant-slug>.fw.aran.local` is served as `/fw/<route>/...`. The Aran key still decides the tenant; the name in the host is only a check.
- **mTLS.** A route can set `require_client_cert` and a list of allowed certificate fingerprints. nginx checks the certificate (`ssl_verify_client`) and passes its fingerprint in `X-Client-Cert-Fingerprint`. Cloud believes that header only from a peer in `ARAN_TRUSTED_PROXIES`, and answers 403 on any mismatch.
- **Status.** `/status` (page) and `/v1/status` (JSON) show whether the core and database answer, how many held requests and webhooks wait, and availability and p95 of the last 24 hours. No tenant data is on them.
- **Billing.** `GET /v1/billing/preview` computes this month's invoice from the plan and usage. An operator closes a month with `POST /v1/billing/close-month`; closing twice returns the same invoice. No payment provider is connected: an invoice is only a record.

## 7. Practice

1. Draw your college's Wi-Fi: where would a network firewall sit, and where would Aran sit?
2. For Bank B's five copies (log, fraud, analytics, SMS, chat), pick one insertion method from section 3 for each and say why.
3. Write one policy rule in plain words for the support chat copy, and say whether it should fail open or closed.

## Words to remember

FWaaS, insertion, reverse proxy, forward proxy, TLS inspection, sidecar, control plane, data plane, policy, monitor mode, fail-open, fail-closed, mTLS, SIEM.

