# Aran UI design (frontend only, no backend)

A static HTML/CSS/JS design of the whole Aran console, built from `Aran - UI Design Spec.md`, in a **Trionn-style 3D look**: near-black `#040508`, mono labels, glass lines, rolling-letter links, GSAP word reveals, Lenis smooth scroll, a WebGL line-field hero with **hold-to-blast** and procedural sound.

No server and no build step. Every number and scene runs on mock data generated in the browser, so you can review the design on its own and hand it to Claude Code to wire to the real API.

## Open it

- Double-click `index.html` (all scripts are classic, so `file://` should work, but I only tested over http; it needs internet for the fonts, GSAP, Lenis and Three.js CDNs), or
- from `D:\Aran`: `python -m http.server 5190 --directory ui-design`, then open http://localhost:5190.

Routes (hash based, as in the spec): `#tour` and `#tour/0` to `#tour/12`, `#overview`, `#traffic`, `#customers`, `#trace`, `#immune`, `#results`, `#about`.
Design review boards: `#components` (C1 to C33 in every state), `#states` (empty, failing, locked, refused). Whole-app states: `?state=starting`, `?state=failed`, `?state=offline`.

## What is in the box

| Path | What |
| --- | --- |
| `css/tokens.css` | Every token from spec section 1 (colour, type, space, shape, depth, motion) for **dark (default) and light**. Change values here only. Remembered under `localStorage['aran-theme']`. |
| `css/style.css` | Shell, components C1 to C33, tour scenes, hero. Uses tokens only, no hard-coded colours. |
| `js/data.js` | Mock data layer (real Verhoeff and Luhn maths, token generation, detection of pasted text, customers, events, stats, results). |
| `js/ui.js` | The component library as functions that return HTML, plus roll text, word split, count-up, stepper, toast, confirm dialog. |
| `js/hero3d.js` | Three.js hero (lazy-loaded). Hover pushes the lines, hold pulls them in while a ring charges, release or a full ring fires a shockwave and particles. |
| `js/sound.js` | Web Audio sounds (hover tick, click, charge whoosh, blast, shatter, chime, error). Off until the top-bar toggle is pressed. |
| `js/tour.js` | Page 1: 13 chapters. `js/pages.js`: pages 2 to 8. `js/board.js`: review boards. `js/main.js`: shell and router. |

## Look and feel decisions

- **Shell:** the spec describes a sidebar; this design uses Trionn's pattern instead (fixed top bar, full-screen numbered menu with a live alert badge on "Immune layer", sound and theme toggles). All 8 nav items, hash routes, the environment strip and the footer links are kept.
- **Hero:** light grey panel `#c3c3c3` with ink lines (the one light surface on a dark site, as on the reference). The top bar switches to dark ink while it sits over it.
- **Meaning colours** (spec section 0): real data = amber, token = teal, leak = red-orange, always paired with an icon or word.
- **Accessibility:** focus rings, 44 px targets on phones, `prefers-reduced-motion` (no packet flights, shatters, count-ups; step scenes jump to the final frame), live regions on notes, skip link, tab/radio semantics.
- **Responsive:** phone under 760 px (menu, stacked grids, tour dropdown), tablet, desktop. No page-level sideways scroll was found on any route at 375 px.

## Wiring it to the API (for Claude Code)

Each live block carries a `data-api` attribute naming its endpoint. Replace the mock call in the matching function with `fetch('/api/…')`; the mock shapes in `data.js` match spec section 13.

| Screen | Mock function | Endpoint |
| --- | --- | --- |
| App shell, starting / failed | `main.js` (`startScreen`) | `GET /api/health` (poll 2 s until `ready`; show `error`) |
| Tour 1 pipeline | `A.sample`, `A.process` | `POST /api/tour/packet`, `POST /api/process` |
| Tour 3 false alarms | `A.falseAlarms` | `POST /api/tour/false-alarms` |
| Tour 4 check digits | `A.checksum` | `POST /api/tour/checksum`, `GET /api/tour/generate` |
| Tour 5 token forge | `A.buildToken` | `POST /api/tour/build-token` |
| Tour 6 finding data | `A.sample` | `POST /api/sample` |
| Tour 7 disguises | `A.evasion` | `POST /api/tour/evasion` |
| Tour 8 trace map | `A.tokens` | `POST /api/tour/tokens`, `POST /api/trace` |
| Tour 9 erasure | local state in `tour.js` | `POST /api/customers`, `/tour/customer-loan`, `/detokenise`, `/erase`, `/receipts/verify` |
| Tour 10 immune | `A.mountImmune` | `GET /api/tour/immune-radar` (poll 2 s), `POST /api/immune/learn`, `POST /api/drills/{kind}` |
| Tour 11 AI chatbots | `A.gateway` | `POST /api/tour/gateway` |
| Tour 12 evidence | `A.results` | `GET /api/results` |
| Overview | `A.stats`, `A.events` | `GET /api/stats` (3 s), `GET /api/events?limit=6` (3 s), `GET /api/immune` (4 s) |
| Live traffic | `A.sample`, `A.process` | `GET /api/config`, `POST /api/sample`, `POST /api/process`, `GET /api/events?limit=15` (4 s) |
| Customers | `A.customers`, `A.merkle` | `GET/POST /api/customers`, `GET /api/customers/{ref}`, `POST /api/erase`, `/detokenise`, `/receipts/verify`, `GET /api/merkle` |
| Leak trace | local matching in `pages.js` | `GET /api/leaked-dump`, `POST /api/trace` |
| Immune layer | local state in `pages.js` | `GET /api/immune` (2 s), `GET /api/stats`, `POST /api/immune/learn`, `/immune/alerts/{id}/label`, `/drills/{kind}`, `/replay/start`, `/replay/stop` |
| Results | `A.results`, simulated jobs | `GET /api/results`, `POST/GET /api/jobs/{name}` |
| How it works | static | none |

Things a real build must add that a static design cannot show: the 503 inline message (`detail` field into `U.note('err', …)`), polling and cleanup (every page's `mount` returns a cleanup function that is already called on route change), and replacing the Merkle chain demo in the erasure scenes with the receipt returned by `POST /api/erase`.

## Not covered

- Spec section 16 optional pages (leakage ledger, AI gateway console, post-quantum, settings, results E13 to E19) need new endpoints and are not designed here.
- The 3D hero needs WebGL; without it the grey panel and the headline still show.
- The hold-to-blast timing, sounds and scroll reveals were reviewed by reading the code and spot-checking frames; the review browser throttled animation frames, so check the feel in a normal browser window.
