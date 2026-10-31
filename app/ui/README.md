# Aran console (the team's design, wired to the live server)

This is Aran's main web console. It started as a static HTML/CSS/JS design (Trionn-style 3D look: near-black `#040508`, mono labels, glass lines, rolling-letter links, GSAP word reveals, Lenis smooth scroll, a WebGL line-field hero with **hold-to-blast** and procedural sound) and is now wired to the real Aran API: every number, token, receipt and alert on screen comes from the server.

There is no build step. The FastAPI server in `app/server` serves this folder at `/`.

## Open it

```bash
cd app/server
python -m uvicorn main:app --port 8000
```

Then open http://localhost:8000. While the models load you see the "Starting Aran" screen (it polls `GET /api/health` every 2 s and shows the load error if there is one); then the console opens. GSAP, Lenis and three.js are served from `vendor/`, so only the Google fonts need internet (the page falls back to system fonts without it).

Routes (hash based, as in the spec): `#tour` and `#tour/0` to `#tour/12`, `#overview`, `#traffic`, `#customers`, `#trace`, `#immune`, `#results`, `#about`. Demo pages: `#arena-live` (big screen with QR code), `#arena` (the judge's phone), `#versus`, `#ledger`, `#scan`, `#quantum`, `#me`. Presenter mode: `?present=1`.
Design review boards: `#components` (C1 to C33 in every state), `#states` (empty, failing, locked, refused). Whole-app state previews: `?state=starting`, `?state=failed`, `?state=offline`.

## What is in the box

| Path | What |
| --- | --- |
| `css/tokens.css` | Every token from spec section 1 (colour, type, space, shape, depth, motion) for **dark (default) and light**. Change values here only. Remembered under `localStorage['aran-theme']`. |
| `css/style.css` | Shell, components C1 to C33, tour scenes, hero. Uses tokens only, no hard-coded colours. |
| `js/data.js` | Live data layer: `A.api()` fetch helper, `A.boot()` (waits for the models), the live store refreshed by `A.poll()` (stats and events every 3 s, immune every 4 s, Merkle log and customers every 8 s) with `A.on()` subscriptions, one function per endpoint, and the in-browser RFC 9162 receipt check. |
| `js/ui.js` | The component library as functions that return HTML, plus roll text, word split, count-up, stepper, toast, confirm dialog. |
| `js/hero3d.js` | Three.js hero (lazy-loaded from `vendor/three.module.min.js`). Hover pushes the lines, hold pulls them in while a ring charges, release or a full ring fires a shockwave and particles. |
| `js/sound.js` | Web Audio sounds (hover tick, click, charge whoosh, blast, shatter, chime, error). Off until the top-bar toggle is pressed. |
| `js/tour.js` | Page 1: 13 chapters. `js/pages.js`: pages 2 to 8. `js/board.js`: review boards. `js/main.js`: shell and router. |
| `js/standout.js`, `css/standout.css` | Demo pages: phone arena and live board, without/with Aran, leakage ledger, card photo scan, post-quantum, the customer's own view. Server side: `app/server/standout.py` (tests: `app/server/test_standout.py`). |
| `kit/kit.js`, `kit/kit.css` | The shared kit for the other Aran apps (Aran Cloud on :8100, Bank A on :9001, Bank B on :9002). They serve this folder at `/aran` and load `css/tokens.css`, `css/style.css`, `js/ui.js` and the kit, so every app has the console's top bar, menu, theme, components and colours. `ARAN.kit.shell()` draws the chrome; `?embed=1` hides it inside the side-by-side iframes. See Learn 23. |
| `js/i18n.js` | Language switch (English, Tamil, Hindi) for the menu, top bar, page headings and tour chapters. English is the source text and the fallback. Check with `node tools/check-i18n.js` ([Learn 19](../../docs/learning/19-translating-a-website.md)). |
| `js/present.js`, `sw.js` | Presenter mode (`?present=1`): a fixed 3-minute path, PageDown/PageUp clicker keys, and offline replay of recorded server answers with a visible banner ([Learn 20](../../docs/learning/20-presenter-mode-and-offline-replay.md)). |

## Look and feel decisions

- **Shell:** the spec describes a sidebar; this design uses Trionn's pattern instead (fixed top bar, full-screen numbered menu with a live alert badge on "Immune layer", sound and theme toggles). All 8 nav items, hash routes, the environment strip and the footer links are kept.
- **Hero:** light grey panel `#c3c3c3` with ink lines (the one light surface on a dark site, as on the reference). The top bar switches to dark ink while it sits over it.
- **Meaning colours** (spec section 0): real data = amber, token = teal, leak = red-orange, always paired with an icon or word.
- **Accessibility:** focus rings, 44 px targets on phones, `prefers-reduced-motion` (no packet flights, shatters, count-ups; step scenes jump to the final frame), live regions on notes, skip link, tab/radio semantics.
- **Responsive:** phone under 760 px (menu, stacked grids, tour dropdown), tablet, desktop. No page-level sideways scroll was found on any route at 375 px.

## How each screen is wired

Each live block carries a `data-api` attribute naming its endpoint, and calls it through `js/data.js`.

| Screen | Endpoint |
| --- | --- |
| App shell, starting / failed | `GET /api/health` (poll 2 s until `ready`; shows `error`) |
| Tour 1 pipeline | `POST /api/tour/packet`, `POST /api/process` (your own message) |
| Tour 3 false alarms | `POST /api/tour/false-alarms` |
| Tour 4 check digits | `POST /api/tour/checksum`, `GET /api/tour/generate` |
| Tour 5 token forge | `POST /api/tour/build-token` (and shows whether the live firewall issued the same token) |
| Tour 6 finding data | `POST /api/sample` |
| Tour 7 disguises | `POST /api/tour/evasion` |
| Tour 8 trace map | `POST /api/tour/tokens`, then `POST /api/trace` on the text the leaked sink really stored |
| Tour 9 erasure | `POST /api/customers`, `/tour/customer-loan`, `/detokenise`, `/erase` (KYC is refused with 423), `/receipts/verify` (real and tampered copy), inclusion proof re-run in the browser |
| Tour 10 immune | `GET /api/tour/immune-radar` (poll 2 s), `GET /api/immune`, `POST /api/immune/learn`, `POST /api/drills/{kind}` |
| Tour 11 AI chatbots | `POST /api/tour/gateway` |
| Tour 12 evidence | `GET /api/results` |
| Overview | `GET /api/stats`, `GET /api/events`, `GET /api/immune` (re-drawn on every poll) |
| Live traffic | `GET /api/config`, `POST /api/sample`, `POST /api/process`, `GET /api/events` |
| Customers | `GET/POST /api/customers`, `GET /api/customers/{ref}`, `POST /api/erase`, `/detokenise`, `/receipts/verify`, `GET /api/merkle` |
| Leak trace | `GET /api/leaked-dump`, `POST /api/trace` |
| Immune layer | `GET /api/tour/immune-radar`, `GET /api/immune`, `GET /api/stats`, `POST /api/immune/learn`, `/immune/alerts/{id}/label`, `/drills/{kind}`, `/replay/start`, `/replay/stop` |
| Results | `GET /api/results`, `POST/GET /api/jobs/{name}` (real pytest and experiment runs) |
| How it works | static |
| Beat the firewall (`#arena`, `#arena-live`) | `GET/POST /api/arena/challenge`, `POST /api/arena/try`, `GET /api/arena/board` (poll 1.5 s), `POST /api/arena/reset`, `GET /api/arena/join`, `GET /api/qr` ([Learn 18](../../docs/learning/18-phone-arena-qr-and-speech.md)) |
| Without / with Aran | `POST /api/versus/run` (real samples through the live firewall, then `trace` on the breached sink) |
| Leakage ledger | `POST /api/ledger/disclose`, `GET /api/ledger/state`, `POST /api/ledger/reset` (research/firewall/ledger.py) |
| Card photo scan | `POST /api/ocr` (Tesseract on the server, then `process`; needs `pytesseract`, `pillow` and the Tesseract program, Learn 10) |
| Post-quantum | `POST /api/pqc/harvest` (classical vs hybrid key wrap under a simulated Shor attack), `GET /api/pqc/mosca`, `GET /api/pqc/receipt`, `GET /api/pqc/cbom` |
| My data (customer view) | `GET /api/customers/{ref}`, `POST /api/erase`, `POST /api/receipts/verify`, inclusion proof re-run in the browser |

Server errors (for example the 503 while models load, or the 423 KYC retention lock) are shown inline as notes, never swallowed.

## Not covered

- Spec section 16 optional pages still not designed: AI gateway console, settings, results E13 to E19. The leakage ledger and post-quantum pages now exist (`#ledger`, `#quantum`).
- The phone arena needs the server on the network (`--host 0.0.0.0`) and the phone on the same Wi-Fi or hotspot. Speech input needs https or localhost; on a phone over plain http, use the keyboard's microphone key.
- The 3D hero needs WebGL; without it the grey panel and the headline still show.
- The design-review boards (`#components`, `#states`) still use a few generated example values to show every component state; the eight real pages and the tour do not.
