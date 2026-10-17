# 3. dmcg.co — "The Design Office of David McGillivray" (brand and software design, New York)

**What it is:** a very quiet, video-first portfolio. No navigation chrome beyond "About / Contact / office@dmcg.co" and a "Projects / Catalog" switcher. The craft is in restraint: one typeface, tiny type, per-project background colours, and silent looping videos.
**Stack (verified):** **Next.js** (Turbopack build, Vercel deployment id `dpl_9cFX1CnkbdjomHx6jUdFmCy4L6BD`), **Sanity** CMS (project `g94oo1l2`, dataset `production`, about 260 CDN assets), the **`motion`** animation library. I scanned all 20 JS chunks for Three.js, WebGL, GLTF, GSAP and Lenis and found **none, so this site is not 3D**. All the visual richness is video (WebM/MP4) and CSS.
**Pages (12, all fetched):** `/`, `/about`, `/archive` (shown as "Catalog"), `/incubator` ("Think With Your Eyes"), and 8 case studies `/work/infinitemachine`, `archiv`, `tolan`, `hedroom`, `groth`, `americana`, `sandbar`, `evara`. Full copy is in `raw/dmcg/`.

## Design tokens (CSS custom properties read from `:root`)
| Token | Value |
|---|---|
| Typeface | **PP Neue Montreal Medium (500)**, self-hosted woff2, fallback Helvetica Neue / Arial. Only one weight is used everywhere. |
| Page colours | `--page-background` and `--page-foreground` **change per page**: home `#7b776d` / `#f6f6f6` (warm grey), other pages `#FFFFFF` / `#000000`; `--page-navigation-color:#f6f6f6`; `color-scheme: dark` on the home page |
| Spacing | `--site-edge: 2.2222vw` (side gutter), `--site-edge-top: 1.8519vw`, `--dock-centre: 2.338vw` |
| Shape | `--squircle-radius: 1` (rounded "squircle" tile corners) |
| Easing | `--archive-ease: cubic-bezier(.22, 1, .36, 1)` |
| Type scale | everything is **small and tracked out**: body 14px / 22px / +0.04em; navigation 14/16/0.04em; caption 11.2/16/0.045em; incubator intro 17.1/21.1/0.02em; incubator name 25px; incubator text 15/18/0.02em; details 12/16; **catalog labels `max(11px, 0.578947vw)`** |
| Text style | sentence case, 500 weight, no all-caps |

## Page by page
### `/` Home
- Text on the page is only: **"Brand & software design"**, **"Made in New York"**, and the sign-off **"The Design Office of David McGillivray"** (rendered as "The / Design Office / of David McGillivray").
- 8 **video tiles**, one per case study, absolutely positioned on a loose, scattered column (the sizes vary: for example 331, 373, 320 and 418px squares at the 478px viewport I measured), each a link to `/work/<slug>`. The videos are WebM hosted on Sanity and muted; `autoplay` and `loop` are off in the markup, so playback is driven by script (I did not trace the trigger).
- **Hover:** a label (`thumbnail-hover-label`) appears either on the cursor, in a dock, or as a control, and there are `browser-tint__edge` top/bottom elements (probably to colour the area under the mobile browser bars; not confirmed).
- Persistent captions (`studio-caption`): "Brand & software design" and "Made in New York"; a `home-edge` fade at the top and bottom.
- **Tile order:** Infinite Machine, Archiv, Tolan, Hedroom, Groth, Americana, Sandbar, Evara.

### `/about`
"Brand & software design — Made in New York." "The Design Office of David McGillivray is a creative studio working across brand and software, building coherent worlds for people inventing new things."
- **Approach:** fast move from conversation to design explorations; check-ins by meaningful progress, not milestones.
- **Technology:** uses AI and builds its own tools to speed up research, exploration and production; creative direction and judgment stay human.
- **Working Together (pricing, flat fee):** Brand from **$40k**, Web from **$30k**, Software from **$45k**. Fixed deliverables and timeframe agreed upfront.
- **About David McGillivray:** British-born designer in New York, studied at Brighton University, designed an experimental iPad app for Taschen (D&AD New Blood Graphite Pencil, 2011), moved to New York in 2011, independent since 2015 (tech, finance, fashion, publishing, Condé Nast editorial properties), adjunct professor at Parsons (interaction design), co-founded loungewear brand **Offhours** (2018), co-hosts the podcast **Works But Makes Noises**, opened the store **Corners** (2023, upstate New York).

### `/archive` — "Catalog"
"Catalog. 106 works across 3 types of work." A very dense image grid (107 images) with **filters All / Logo / Digital / Physical** and an **A–Z index**. Each image is a button ("Open Afina, Logos"). Brands catalogued (alphabetical, with the type of work shown): Afina, Americana, Antioch, Archiv, Backdrop, Clever, Corners, CPGD, Feast, Format, Groth, Hedroom, Highnote, Infinite Machine, Momentous, Nue Co, Oasis, Offhours, Petal, Sandbar, Stratus, Tolan, Universe, Usual (and more below the fold). Types: logos, app, web, print, objects.

### `/incubator` — "Think With Your Eyes"
The in-house incubator for independent, design-led ventures:
- **Corners** — retail store, open since 2023 (art and design objects, upstate NY).
- **Archiv** — iOS app, beta on TestFlight (photograph an object; it makes a clean archival image and researches it).
- **Hedroom** — web app, public beta (share music through customisable, **audio-reactive artifacts** in a personal Listening Room).
- **Soba** — macOS app, public beta (local-first Markdown notes with AI tools).

### Case studies (all follow one template: title, long editorial text interleaved with videos/images, then Twitter / LinkedIn / Email, `© 2015-2026 Studio DMCG Inc.`)
| Slug | Subject | Notes |
|---|---|---|
| infinitemachine | Infinite Machine, electric mobility (P1 scooter, Olto e-bike) | all web design since P1 launch; campaign-style pages, typography-first |
| archiv | Archiv iOS app | in-house; wordmark with heavy ligatures "carved in stone"; videos: collection, notification loop, photo-to-object, process indicator, onboarding trio |
| tolan | Tolan (Portola's AI alien companion) | identity, app icon, website, plus ongoing app design |
| hedroom | Hedroom™ | audio-reactive music artifacts, homepage "conveyor" of artifacts; videos hed01, hed02 |
| groth | Groth, architecture and product design studio | "bulbous" rounded wordmark; technical and friendly typography; logo animation video |
| americana | Americana, collectibles marketplace (NFC and blockchain provenance) | utilitarian identity, website and software |
| sandbar | Sandbar, Stream voice-first ring | editorial restrained web design; **Speak / Think / Go carousel uses blur to shift focus**; product page flows into the order flow; wave mark by Bodyshop |
| evara | Evara, wellness hardware (founder ex-SpaceX) | soft rounded wordmark, circle as "returning to centre"; custom **AI-assisted generative tool** makes abstracted nature imagery; pre-launch, so details withheld |

## Assets
Videos on `cdn.sanity.io/files/g94oo1l2/production/*.webm|mp4` (about 28 files, e.g. `grothlogoanimation-web.mp4`, `ARCHIV-collection-1080p-soft-shadow-web.mp4`, `grid-and-evara-showcase.webm`, `hed01new-web.mp4`). Images on the Sanity image CDN. Font: `/_next/static/media/PPNeueMontreal_Medium-s.p.*.woff2`.

## Takeaways for your build
Hierarchy through **colour per page, silence and spacing** rather than effects. A Next.js + Sanity + `motion` + muted-video recipe, no 3D. The 106-item catalog with filters is the one "system" piece worth copying.
