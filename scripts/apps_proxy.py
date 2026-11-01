"""One public port for Aran Cloud, Bank A and Bank B (the hosted "aran-apps" service).

Render gives a service one port, so the three apps run on 8100, 9001 and 9002 inside the
container and this small proxy sends /cloud/..., /bank-a/... and /bank-b/... to them with the
prefix removed. Each app has its own Vercel front door that rewrites every path to its prefix
here, so in the browser each app still lives at the root of its own address.
Responses are streamed, so the cloud's live feed (Server-Sent Events) works through it."""
import os

import requests
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse, Response, StreamingResponse
from starlette.routing import Route

APPS = {"cloud": 8100, "bank-a": 9001, "bank-b": 9002}
HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers",
       "transfer-encoding", "upgrade", "host", "content-length", "content-encoding", "accept-encoding"}
FRONT = {"cloud": os.environ.get("ARAN_CLOUD_PUBLIC", ""), "bank-a": os.environ.get("ARAN_BANK_A_PUBLIC", ""),
         "bank-b": os.environ.get("ARAN_BANK_B_PUBLIC", "")}
session = requests.Session()
NAMES = {"cloud": "Aran Cloud", "bank-a": "Bank A", "bank-b": "Bank B"}
# shown while an app is still starting; it reloads itself every 5 seconds (no script, so it passes any CSP)
WAKING = ("""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="5"><title>Waking {app} · Aran</title><style>
:root{color-scheme:dark light}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#040508;color:#e8e8e3;
font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}@media (prefers-color-scheme:light){body{background:#f7f7f2;color:#111}}
main{max-width:460px;padding:24px;text-align:center}.s{width:28px;height:28px;margin:0 auto 20px;border:3px solid currentColor;
border-right-color:transparent;border-radius:50%;animation:r 1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.s{animation:none}}h1{font-size:22px;font-weight:600;margin:0 0 8px}p{opacity:.75;margin:0}</style></head>
<body><main><div class="s" role="status" aria-label="Loading"></div><h1>Waking {app}</h1><p>Free hosting puts the apps to sleep after
15 minutes without visitors. Starting takes 30 to 90 seconds; this page reloads by itself.</p></main></body></html>""")


def home(request: Request):
    rows = "".join(f'<li><a href="{FRONT[k] or "/" + k + "/"}">{k}</a></li>' for k in APPS)
    return HTMLResponse(f"<!doctype html><title>Aran apps</title><h1>Aran apps</h1><ul>{rows}</ul>")


def health(request: Request):
    up = {}
    for k, port in APPS.items():
        try:
            up[k] = session.get(f"http://127.0.0.1:{port}/", timeout=2).status_code < 500
        except requests.RequestException:
            up[k] = False
    return JSONResponse({"ok": all(up.values()), "apps": up}, status_code=200 if all(up.values()) else 503)


async def proxy(request: Request):
    app, rest = request.path_params["app"], request.path_params.get("rest", "")
    if app not in APPS:
        return JSONResponse({"detail": "Not found"}, status_code=404)
    url = f"http://127.0.0.1:{APPS[app]}/{rest}"
    if request.url.query:
        url += "?" + request.url.query
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP}
    peer = request.client.host if request.client else ""
    headers["x-forwarded-for"] = (request.headers.get("x-forwarded-for", "") + ", " + peer).strip(", ")
    body = await request.body()
    try:
        r = session.request(request.method, url, headers=headers, data=body or None, stream=True,
                            allow_redirects=False, timeout=(5, 300))
    except requests.RequestException:
        if request.method == "GET" and "text/html" in request.headers.get("accept", ""):
            return HTMLResponse(WAKING.replace("{app}", NAMES[app]), status_code=503, headers={"Retry-After": "5", "Cache-Control": "no-store"})
        return JSONResponse({"detail": f"{app} is starting, try again in a few seconds."}, status_code=503,
                            headers={"Retry-After": "5"})
    out = {k: v for k, v in r.headers.items() if k.lower() not in HOP}
    if r.headers.get("location", "").startswith("/"):
        out["location"] = r.headers["location"]  # the front door serves the app at its root
    if "text/event-stream" in r.headers.get("content-type", ""):
        out["x-accel-buffering"] = "no"
        return StreamingResponse(r.raw.stream(1024, decode_content=True), status_code=r.status_code, headers=out)
    data = r.content
    r.close()
    return Response(data, status_code=r.status_code, headers=out)


METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
app = Starlette(routes=[
    Route("/", home), Route("/healthz", health),
    Route("/{app}", proxy, methods=METHODS), Route("/{app}/{rest:path}", proxy, methods=METHODS),
])
