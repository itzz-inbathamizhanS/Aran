# Site research: 5 reference sites

Collected 2026-10-16 with the in-app browser, `curl`, and a read of each site's own JS bundles. Written for a build that borrows from these sites.

| # | Site | Stack | Real 3D / WebGL? | Pages covered |
|---|---|---|---|---|
| 1 | [percyjackson.framer.media](01-percyjackson.md) | Framer template | No (plain MP4 video) | 6 of 6 |
| 2 | [artemiilebedev.com](02-artemiilebedev.md) (from /information) | Webflow + GSAP + Lenis + Three r160 + hls.js | **Yes**: WebGL video carousel and ribbon badges | 54 of 54 |
| 3 | [dmcg.co](03-dmcg.md) | Next.js + Sanity + motion | No (video only; no 3D libs in any chunk) | 12 of 12 |
| 4 | [trionn.com](04-trionn.md) | Next.js + Tailwind + Three.js + GSAP/SplitText + Lenis | **Yes**: WebGL2 hero, lion depth-map, 14+ sounds | 27 of 27 (6 in sitemap + 21 case studies found via links) |
| 5 | [vladprozapas.com](05-vladprozapas.md) | Next.js + Tailwind + Three.js (lazy) + GSAP + Lenis | **Yes**: scroll-driven rocket GLB, shader/particle backdrops | 1 of 1 (single page) |

`raw/` holds the extracted text of every page (Artemii 54 files, dmcg 12, Trionn 6 core pages, Vlad 1). Trionn's 21 case-study texts are summarised in `04-trionn.md`.

## The "3D" ones, ranked by how much real 3D they have
1. **trionn.com** - most WebGL surface (hero lines, lion depth parallax, team scanner), heavy on sound.
2. **vladprozapas.com** - a pinned 3D rocket scene with a tiny GLB, and the clearest model of "lazy-load Three.js after first paint".
3. **artemiilebedev.com** - WebGL used surgically: a drag/warp video-texture carousel and cloth-like ribbon badges, plus a 2D-canvas "Esc effects" overlay.
4. dmcg.co and the Percy Jackson template have **no** 3D. If you meant one of them to be 3D, tell me which part and I will re-check.

## Shared patterns worth reusing
- **Smooth scroll:** Lenis (Artemii, Trionn, Vlad, Framer's built-in on the template).
- **Motion:** GSAP + ScrollTrigger (Artemii, Trionn, Vlad); SplitText for per-letter headings (Trionn, Vlad); `motion` (dmcg).
- **Type:** one mono (Artemii: Fragment Mono caps), one grotesk (Percy: Inter Display; Vlad: Archivo; dmcg: PP Neue Montreal), or a 3-font system (Trionn: Familjen Grotesk, Neue Haas Display, Martian Mono, PP Editorial New).
- **Palette:** near-black base (`#0a0a0a`, `#040508`, `#09080A`, `#000`) with one accent or none; dmcg is the exception (warm grey, white).
- **Gating:** every heavy effect is desktop-only and `prefers-reduced-motion` aware (Artemii), or lazy-loaded (Vlad).
- **Live clock / location line** (Percy, Artemii).
- **Sound:** optional, with a visible toggle (Trionn, Vlad); hover sounds (Artemii).
- **Case-study template:** title, summary, meta rows (year, client, scope, tools, timeline), challenge / approach / outcome, related work.

## What I could not verify
- I did not capture reliable screenshots: the in-app browser pane rendered mostly black or very narrow frames on scroll-reveal pages, so visuals are described from the DOM, computed CSS and source, not from images. Anything marked "inferred" in the notes was not watched.
- Pixel measurements were taken at the pane's width (about 468-1024px). Desktop-width values may differ; typography tokens are the reliable part.
- Contact forms were not submitted (no data was sent to any site).
- Trionn's and Artemii's exact shader math, and Vlad's rocket timeline, were not reverse-engineered.
