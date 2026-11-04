# aran_edge: run the firewall inside your own network

Aran Cloud can clean the traffic of a route for you. Some banks do not want raw customer data to leave their network
at all. For them there is the **edge**: a small program you run on your own servers. It does the same job as a Cloud
route, but:

- the cleaning is done by **your own Aran core** (`ARAN_CORE_URL`), so raw identifiers never travel to Aran Cloud;
- Aran Cloud only sends the edge its **settings** (which routes and policies exist) and receives **counts** back
  (how many calls, how many identifiers were protected). Never a value, never a request body.

```
 your app ──► edge (your network) ──► upstream vendor
                │   ▲
   local core ◄─┘   │ signed settings  (Cloud → edge, every minute)
                    │ counts only      (edge → Cloud, every minute)
               Aran Cloud
```

## What you need

- Python 3.11 or newer (or Docker).
- A running Aran core you can reach (the demo stack has one on port 8000: `bash scripts/run_demo.sh`).
- An Aran Cloud workspace with at least one **route** (Dashboard, Routes tab).

## Run it in five steps

1. **Make an edge key.** In Aran Cloud, create a key with only the `edge` scope. Use one key per edge.

   ```bash
   curl -X POST http://127.0.0.1:8100/v1/keys -H "X-API-Key: <your admin key>" \
     -H "Content-Type: application/json" -d '{"label": "branch-edge", "scopes": ["edge"]}'
   ```

   Copy the `api_key` from the answer. It is shown once.

2. **Fetch Cloud's public key and pin it.** The edge only accepts settings signed by this key.

   ```bash
   curl http://127.0.0.1:8100/v1/edge/public-key
   ```

   Copy the `public_key` value. Pinning is required: without `ARAN_EDGE_PUBLIC_KEY` the edge refuses to register.
   (For a quick local try only, `ARAN_EDGE_TRUST_ON_FIRST_USE=1` makes the edge trust the key Cloud sends on its very
   first start and remember it. Anyone who can sit between the edge and Cloud on that first call could hand it their
   own key, so do not use this in production.)

3. **Set the environment.**

   ```bash
   export ARAN_CLOUD_URL=http://127.0.0.1:8100
   export ARAN_CORE_URL=http://127.0.0.1:8000
   export ARAN_EDGE_KEY=<the edge key from step 1>
   export ARAN_EDGE_PUBLIC_KEY=<the public key from step 2>
   export ARAN_EDGE_LOCAL_KEY=<a password of your choice; your apps send it as X-API-Key>
   export ARAN_INTERNAL_SECRET=<same value the core uses, if the core has one>
   ```

4. **Start the edge.** From the repository root:

   ```bash
   .venv/bin/python -m uvicorn aran_edge.edge:app --port 8200
   ```

   It registers itself, downloads its signed settings and starts serving. Check it:

   ```bash
   curl -H "X-API-Key: $ARAN_EDGE_LOCAL_KEY" http://127.0.0.1:8200/edge/status
   ```

5. **Send traffic through it.** Use the route's name from Cloud (for example `analytics`):

   ```bash
   curl -X POST http://127.0.0.1:8200/fw/analytics/ingest \
     -H "X-API-Key: $ARAN_EDGE_LOCAL_KEY" -H "Content-Type: application/json" \
     -d '{"note": "aadhaar 2490 1748 7341"}'
   ```

   Open the Cloud dashboard, Routes tab, **Data planes**: your edge appears with its last report and the settings
   version it has applied.

### With Docker

```bash
docker compose --profile edge up edge        # uses the main image, talks to the compose core and cloud
docker build -f aran_edge/Dockerfile -t aran-edge .   # a small stand-alone image, if you run only the edge
```

Put `ARAN_EDGE_KEY`, `ARAN_EDGE_PUBLIC_KEY` and `ARAN_EDGE_LOCAL_KEY` in `.env.local` (or export them) first.

## What the edge does and does not do

| | |
|---|---|
| Cleans path, query and body | Same code as Cloud (`aran_cloud/fw_core.py`): JSON, text, NDJSON and form bodies; 415 for other types in enforce mode |
| Monitor mode | Forwards the original request, counts what it would have protected |
| Enforce mode | Forwards the cleaned request; a `block` rule answers 403 |
| Core not reachable | The route's `fail_mode`: `hold` (masked copy queued), `open`, `closed` |
| Upstream not reachable | The cleaned body waits in the edge's own SQLite outbox and is retried |
| Settings | Signed with Ed25519, valid 10 minutes, refreshed every minute |
| Report to Cloud | `route_id`, `window_start`, `calls`, `protected`, `blocked`, `held`, `p50_ms`, `p95_ms`, applied version. Cloud rejects anything else |

Not done at the edge: webhooks, the SIEM export, spike alerts and the config audit stay in Cloud (they work from
the counts Cloud receives). Tokens made by the edge's core belong to your core; Cloud's trace and detokenise do not
see them.

### Why the edge refuses some settings

The edge applies a new config only when **all** of these hold, and otherwise keeps the last good one:

- the Ed25519 signature matches (unsigned or edited settings are refused);
- it is for this tenant and this edge;
- it has not expired (settings live 10 minutes; after that the edge answers 503 until it gets fresh ones);
- its version is not older than the applied one (an old, genuinely signed copy cannot be replayed).

If Cloud is unreachable the edge keeps serving on the last good settings until they expire, so plan for Cloud being
reachable at least every few minutes. After a restart the edge re-checks the saved settings the same way.

## Settings (environment)

| Variable | Default | Meaning |
|---|---|---|
| `ARAN_EDGE_KEY` | required | Cloud key with the `edge` scope |
| `ARAN_CLOUD_URL` | `http://127.0.0.1:8100` | Aran Cloud |
| `ARAN_CORE_URL` | `http://127.0.0.1:8000` | your local core |
| `ARAN_EDGE_PUBLIC_KEY` | none (required) | Cloud's Ed25519 public key (base64), pinned |
| `ARAN_EDGE_TRUST_ON_FIRST_USE` | `0` | `1` lets the edge learn the key from Cloud on first start (local tries only, not safe in production) |
| `ARAN_EDGE_LOCAL_KEY` | made and printed on first start | what your apps send as `X-API-Key` |
| `ARAN_EDGE_DB` | `edge.db` | SQLite file: identity, last good config, outbox |
| `ARAN_EDGE_NAME` | `edge` | name shown in the dashboard |
| `ARAN_EDGE_POLL_S` / `ARAN_EDGE_REPORT_S` | 60 / 60 | how often to pull settings / send counts |
| `ARAN_EDGE_ALLOW_PRIVATE_UPSTREAMS` | off | allow upstreams on private addresses (the metadata address and the core's port are never allowed) |
| `ARAN_EDGE_CORE_TIMEOUT_MS` | 300 | how long to wait for the core before the fail mode applies |

## Tests

With the demo stack running:

```bash
set -a && . ./.env.local && set +a
.venv/bin/python -m pytest -p no:cacheprovider aran_edge
```

