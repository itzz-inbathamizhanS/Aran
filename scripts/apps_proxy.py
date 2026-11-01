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
        return JSONResponse({"detail": f"{app} is starting, try again in a few seconds."}, status_code=503)
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
