# 5. vladprozapas.com — "3D Websites in WebGL and Three.js – Vladyslav Prozapas"

**What it is:** a single-page developer portfolio (about 26,700px tall at the narrow width I measured) that sells **3D, immersive websites**. It is itself WebGL: a scroll-driven **rocket** story in the intro, and layered shader backgrounds behind later sections. It also showcases two real 3D client sites as looping videos.
**Stack (verified from the HTML and lazy chunks):**
- **Next.js** (App Router, webpack) + **Tailwind CSS** (utility classes like `bg-void`, `text-text`, `max-lg:hidden`).
- **Lenis** smooth scroll + **GSAP ScrollTrigger** (pinned `sticky top-0 h-[100dvh]` stages).
- **Three.js** loaded lazily (about 12 extra chunks and 18KB `models/rocket/toy-rocket.glb`, **Draco-capable GLTFLoader**), custom **GLSL ShaderMaterials**, `InstancedMesh` and `InstancedBufferGeometry` particle systems, `Points`; **no postprocessing composer**. Procedural audio via `createBuffer` (Web Audio), toggled by a "Sound off/on" switch.
- It is not React Three Fiber on this site itself (R3F is what he used on a client project; see below).
**Pages:** only one (`/`, plus a 404). Sitemap contains just the home page. Section anchors: `#top`, `#work`, `#contact`. Full text is in `raw/vladprozapas/home.txt`.

## Design tokens
| Token | Value |
|---|---|
| Background | `rgb(9,8,10)` = `#09080A` ("void") |
| Text | `#ECEBEE` (main), `#B4B3BA`, `#C4C3C9`, `#8E8D93` (muted), `#4F4D53` (faint) |
| Accents | violet `#8B5CF6` (skip-link, glows `rgba(139,92,246,.26)`), warm orange `#A44C06` / `#EDB161` (rocket flame and highlights) |
| Font | **Archivo** only (wide variant used for display, uppercase with tracking); body 14px/21px, small caps labels 11px / 500 / +1.1 to +2.42px tracking uppercase; display 20–26px / 300 / +1.2–1.3px uppercase; 16px / 26.4 lead |
| Overlays | film **grain** layer (`.grain`, fixed), radial-gradient glows, `mask-image` fades between stages, `clip-path: inset()` wipes |
| Motion | `ticker-slide` keyframe (marquee), `prefers-reduced-motion` supported |

## Chrome and controls
Skip-to-content link; top **"Index"** menu; a **left progress rail** (dot nav with `data-rail-item`, scroll-spy); a floating **dock** (round "Get in touch" button with a pulse ring); a **sound corner** ("Sound off" switch); a custom **cursor**; "Skip intro" and "Scroll" hints; a **consent prompt** "Count this visit? Allow / Decline" (privacy-friendly analytics).

## Sections (top to bottom)
1. **01 Intro (pinned, scroll-scrubbed):** "Vladyslav Prozapas — Senior Software Engineer — 3D websites and web apps for brands, studios and agencies." A rocket model rises through four chapters, each a line of copy: **"Ideas become systems. / Written here, running in production."** → **"Complexity needs structure. / Clear boundaries, so every team ships on its own."** → **"Every millisecond matters. / Fast by design. Smooth by default."** → **"Then it has to fly. / Build. Ship. Measure. Improve."** The rocket shader uniforms (`uIgnite`, `uRise`, `uLand`, `uForm`, `uReach`, `uPitch`, `uSink`, `uWound`, `uPhase`) show ignite, rise, form, land phases with particle exhaust and a ground "wound" or impact effect.
2. **Hero statement:** "Websites you can walk into." / "3D and immersive websites in three.js for brands, studios and developers, and the web apps behind them. 10 years of shipping, and all of it runs on a phone." CTA "See the work".
3. **Areas of expertise (pinned, 7 cards, each with a stat):**
   - 3D and immersive websites: "9 floors in 360 for Nappy Boy. 14 hectares, live, for Royal Village."
   - Luxury design, built exactly: "This page. Resize the window and every headline keeps its lines."
   - Web apps of any complexity: "5 micro-frontends. 2 teams became 3, mid-migration."
   - Performance: "4 endpoints stitched client-side became 1 request per page."
   - Design systems: "20+ components. 2 teams consuming." (versioned npm package, Storybook, semver)
   - Accessibility and RTL: "1 whole app mirrored right to left" (React Aria).
   - Codebase audit: "63% off a client's monthly cloud bill, $1,940 down to $725, measured from the billing export."
4. **Projects (`#work`)**, each with a **Desktop / Phone** toggle that swaps the looping video (`/projects/{nb,rv,wd}-{desktop,mobile}.av1.mp4` + `.webm`, poster `.jpg`):
   - **Nappy Boy Network** (T-Pain's label; music and merch, US, 2026; Frontend Engineer): "A record label you walk around in. 9 floors, 1 elevator, and a checkout that never leaves the building." 9 floors on an elevator directory, each a 360° drag-to-look room with clickable hotspots (dean's desk at Wiscansin University, lobby check-in counter); the store is its own floor. Stack: React, Next.js, Strapi, **React Three Fiber, Three.js, GSAP, WebGL**.
   - **Royal Village** (property, Kyiv, 2026; Frontend Engineer): "A masterplan you can walk before it is built." A live plan of all **14 hectares**: turn it through the seasons, drop the infrastructure layer, pick a sector, open a house and step between floors. Stack: Vue, Nuxt, Strapi, GSAP, WebGL, SCSS.
   - **Wedes Digital Agency** (Rivne, 2016–2018; Frontend Developer): agency site with a particle field, client tiles, 4-step process and form. TypeScript, Stylus, BEM, Twig. (Live at wedes-art.com.)
   - **"The work I can't show"** (pinned, 3 sealed cards with blurred preview): C the Signs 2020–2025 (clinical platform, 4 apps), High-load platform 2026–now ($1,940 to $725), GMS 2025 (React Aria design system + Entra ID SSO).
5. **Experience / "Where the 10 years went" (2016 → Now):** horizontal timeline with year ticks, then a stacked "Next / previous" experience viewer with a progress counter (01/03…) and tech tickers: **Wedes** (2016–2018, Rivne), **SoftServe** (2018–2020; Farmers Edge), **C the Signs** (2020–2025; referral module, Rollbar to Slack to ticket, micro-frontends, design system), **Independent** (2026–now; motion for a digital agency in GSAP and WebGL, and the high-load platform), plus "Alongside" contracts (Grapes, GMS, Marema, Traivel, Scrupio, DRISoft, Migronis).
6. **Social proof:** "People I worked with / All 9 Upwork reviews", keyword chips (team 3 of 9, communicates 3 of 9, reliable 2 of 9, quick 3 of 9, best 2 of 9) and quotes from Serhii Povisenko, Dr Androulla Kolatsis, Swiat (SoftServe), Anton Povzun and Upwork clients.
7. **Contact (`#contact`):** "Tell me what you're building." Form (name, email, "what you are building", 0/4000 counter, honeypot "Leave this empty"), "What happens next" in 3 steps (you write, reply within 2 working days, scope and fixed price per stage on Upwork or direct), "Hire me on Upwork", LinkedIn, GitHub, Stack Overflow.

## Assets
`/models/rocket/toy-rocket.glb`; `/projects/{nb,rv,wd}-{desktop,mobile}.{av1.mp4,webm,jpg}`; `/projects/sealed-{cts,gms,highload}[-mobile].webp`; `/story/traivel-*.webp` (booking, expenses, flights, gallery, hotel, login, passenger, rooms, stays); `/contact/portrait.webp` and `portrait-rim.webp` (rim-lit portrait variant); Archivo woff2 files.

## What I inferred versus watched
The four intro chapter lines, the section list and all copy are read from the page. The rocket's behaviour (ignite, rise, land, exhaust particles) is **inferred from shader uniform names and the GLB name**; I did not watch the scroll-scrubbed animation play, so check it live before copying the timing.

## Where the real 3D sites are
Nappy Boy Network and Royal Village are client sites; this page does not link to live URLs, only to recorded video. Search for them by name if you want to explore the real scenes.

## Takeaways for your build
A scroll-pinned 3D intro with lazily loaded Three.js and a tiny GLB, light/dark glow layers, a sealed "work I can't show" pattern, and a desktop/phone preview toggle. Closest match to "3D site" among the five, and the most reproducible with GSAP + Three.js + Lenis.
