# Firewall as a Service: security review

**Scope:** the FaaS branch (`git diff 1e69e6e..HEAD`): `aran_cloud/faas.py`, `fw_core.py`, `edge_plane.py`, `prod.py`,
`db.py`, the `main.py` changes, `aran_edge/edge.py`, the `demo_bank/bank_txn.py` changes, `deploy/nginx/aran-cloud.conf`
and `docker-compose.yml`.

**Result:** 6 problems found and fixed, each with a test. Severity: 1 high, 3 medium, 2 low.

---

## Findings and fixes

### 1. DNS rebinding could send proxied traffic and webhooks to internal addresses (High)

**What could happen.** Before every call, Cloud checks that the upstream name (or webhook URL) resolves to a safe
address. But the HTTP library then looked the name up **again** when it connected. Someone who controls a DNS name
can answer "a public address" to the check and "127.0.0.1" or "10.x.x.x" a moment later. The proxy, the webhook
sender and the self-hosted edge would then send requests (with the tenant's headers and body) to a service inside
Aran's own network. Proxy settings and `.netrc` from the environment were also used, and a proxy resolves the name
itself, which undoes the check in the same way.

**Fix.** New helper `fw_core.pinned_request()`. It connects to the exact address the check approved. The Host header,
the TLS name (SNI) and the certificate check still use the name from the URL, so HTTPS keeps working normally.
Environment proxies and `.netrc` are ignored for these calls. Used by `faas.forward()` (routes and the outbox
sweeper), `faas.send_webhook()` (deliveries and the test button) and `Edge.forward()`.

**Tests.** `test_forward_connects_to_the_checked_address_not_a_second_dns_answer`,
`test_webhook_connects_to_the_checked_address`, `test_pinned_request_ignores_proxy_environment` (aran_cloud),
`test_edge_forward_connects_to_the_checked_address` (aran_edge). The DNS is faked to answer a safe address first and an
unreachable one after; the call must succeed and DNS must be asked only once.

### 2. The edge trusted Cloud's signing key on first use by default (Medium)

**What could happen.** If `ARAN_EDGE_PUBLIC_KEY` was not set, the edge accepted whatever public key came back from
its first registration call and kept it for good. Anyone able to sit between the edge and Cloud on that first call
(for example on plain HTTP) could hand over their own key, and from then on sign configs that point routes at their
own servers.

**Fix.** Pinning is now the default. Without a pinned key, `register()` refuses with a clear message and stores
nothing. Learning the key on first use is possible only with `ARAN_EDGE_TRUST_ON_FIRST_USE=1`, and the edge prints a
warning when it does. README and the compose `edge` service now ask for `ARAN_EDGE_PUBLIC_KEY`.

**Tests.** `test_no_pinned_key_is_refused_by_default`, `test_trust_on_first_use_only_when_opted_in` (aran_edge).

### 3. With an "allow" rule, a held request stored raw identifiers in the outbox (Medium)

**What could happen.** A policy rule with action `allow` sends the original value to the upstream on purpose. When
the upstream was down (or answered 5xx) in enforce mode, that cleaned-but-allowed body was queued in `route_outbox`
(and the edge's outbox), so a raw card number or Aadhaar number sat in the database. That breaks the rule
"never store raw identifiers".

**Fix.** When a request had any `allow` decision, the outbox keeps a masked copy (last 4 digits only, the same copy
fail mode "hold" uses) instead of the cleaned body. Requests without `allow` still queue the protected body.

**Test.** `test_allow_rule_never_puts_raw_values_in_the_outbox` (aran_cloud): reads the outbox row and the whole
tenant DB text.

### 4. Custom request headers were stored raw in the outbox (Medium)

**What could happen.** Headers are not cleaned by the core. When a request was queued, custom `X-...` headers were
saved as they were, so a header like `X-Customer-Mobile: 98...` ended up in `route_outbox.headers_json`.

**Fix.** `fw_core.queue_headers()` masks the values of custom `X-` headers before they are stored (and never keeps
`X-Client-Cert-Fingerprint`, `X-Api-Key` or `X-Aran-*`).

**Test.** `test_queued_headers_do_not_keep_raw_identifiers` (aran_cloud).

### 5. Deeply nested JSON caused server errors (Low)

**What could happen.** A body of many thousands of `[` made Python's JSON reader raise `RecursionError`, which was not
caught: the proxy (JSON and NDJSON bodies) and the AI gateway answered 500, and the proxy left a database connection
open each time. In the AI gateway, `tool_result` blocks nested a few hundred deep hit the same limit in our own code.
Cheap to repeat, so a small denial of service.

**Fix.** `RecursionError` is treated as a bad body (400 in enforce mode, forwarded untouched in monitor mode; an
unreadable NDJSON line is cleaned as text). The AI gateway answers 400 for too-deep JSON and for content blocks nested
more than 20 levels.

**Test.** `test_deeply_nested_json_is_refused_not_a_server_error` (aran_cloud).

### 6. Headers named in `Connection` were forwarded upstream (Low)

**What could happen.** HTTP says any header listed in `Connection:` is for this hop only. The proxy removed the fixed
hop-by-hop list but not the listed ones (or `Proxy-Connection`), so a caller could push headers meant only for the
first hop to the upstream.

**Fix.** `fw_core.forward_headers()` also drops headers named in `Connection` and `Proxy-Connection`.

**Test.** `test_connection_listed_headers_are_not_forwarded` (aran_cloud).

---

## Checked and found fine

- **Tenant isolation.** Every route, policy, webhook, delivery, audit, export, edge and billing query filters on the
  tenant taken from the API key. `/fw/<name>` looks the route up by tenant and name together; another tenant's route
  gives the same 404 as a missing one. The `<route>.<slug>.fw...` host name is only an extra check: the slug header is
  removed from client requests and the key still decides the tenant. Attaching another tenant's policy to a route
  gives 404. Edge reports must name a route of the key's tenant.
- **Aran key never forwarded.** `X-Api-Key` and all `X-Aran-*` headers are stripped before the upstream call, Host and
  Content-Length are rebuilt, and `Set-Cookie` / hop-by-hop headers from the upstream are not passed back. The AI
  gateway builds its own upstream headers and never sends the caller's key.
- **SSRF address forms.** Decimal (`2130706433`), hex, octal, short (`127.1`), IPv4-mapped IPv6, NAT64 and `0` forms
  all resolve to an address that the check refuses. Metadata (169.254.169.254, fd00:ec2::254) is refused even in
  demo mode. Redirects are never followed. User:password in the URL is refused.
- **Raw identifiers elsewhere.** `route_events.path` is the cleaned path passed through the masker; the query is not
  logged. Webhook payloads, SIEM export (JSON and CEF), edge reports (a strict allow-list of numbers plus a route id),
  config audit details and error messages carry names, types and counts only.
- **Signatures.** Webhook HMAC uses `hmac.compare_digest` in the SDK's `verify_webhook`, with a timestamp check.
  Edge configs are Ed25519-signed over the exact payload text, bound to tenant and edge id, expire after 10 minutes,
  and an older version or same version with different content is refused (so a captured old config cannot be
  replayed over a newer one).
- **mTLS header.** `X-Client-Cert-Fingerprint` counts only when the feature is switched on and the direct peer is in
  `ARAN_TRUSTED_PROXIES`. Compose runs Cloud with `--no-proxy-headers`, so the peer address cannot be faked with
  `X-Forwarded-For`. nginx clears the header on the plain listener.
- **Webhook secret.** Returned only in the create answer; list, get, patch and the audit log never show it.
- **Admin-token endpoint.** `POST /v1/billing/close-month` uses the existing operator token check (constant-time
  compare, off when no token is set). The public status page shows no tenant data.
- **SQL injection in the Postgres adapter.** Values are always bound parameters; the translator only rewrites the
  fixed SQL text written in the code (placeholders outside quoted strings, `%` escaped). Column names in `UPDATE ... SET`
  come from fixed lists.
- **Other DoS limits.** Bodies over 1 MB are refused while streaming; upstream answers are capped at 5 MB; JSON depth
  is limited to 40 when walking; the masking regexes have bounded repeats (no catastrophic backtracking); policies
  have at most 50 rules.

## Remaining risks (not changed)

- **Headers are not cleaned when forwarded live.** Only the body, path and query go through the core. An identifier
  in a custom header reaches the upstream as it is (it is now masked only when stored). Callers should not put
  identifiers in headers.
- **Secrets at rest.** Webhook secrets and an upstream `Authorization` header kept with a held request are stored in
  plain text in the database. Encrypting them needs a key-management decision.
- **Edge reports can be inflated by a key holder.** Anyone with the edge key can send any counts, and a retried report
  may be counted twice. They are counts only, never data.
- **Egress proxies.** Upstream and webhook calls now ignore `HTTP(S)_PROXY`. A deployment that must go through an
  egress proxy needs that proxy to do its own address filtering.
- **Demo mode** (`ARAN_FAAS_ALLOW_PRIVATE_UPSTREAMS=1`) allows private and loopback upstreams by design, including
  6to4/Teredo forms of them. Never set it in production.
- **The OpenAI-format AI upstream** (`ARAN_AI_OPENAI_UPSTREAM`) is set by the operator, not a tenant, and still uses a
  normal connection.
- **`X-Aran-Role`** on the AI gateway is chosen by the caller. It only puts back values from the same request, so it
  shows the caller nothing they did not send.
- **Rate limits are per instance** (in memory): with two Cloud instances a key gets up to twice the limit.
- When no local key is set, the edge makes one on first start and prints it to its log.

## Test results after the fixes

| Suite | Result |
|---|---|
| aran_cloud | 119 passed, 3 skipped, 2 known failures (`test_core_lockdown`, `test_rate_limits`: local setup) |
| aran_sdk | 13 passed |
| demo_bank | 41 passed |
| aran_edge | 25 passed |
