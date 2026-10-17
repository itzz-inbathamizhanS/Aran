# 2. artemiilebedev.com — "Artemii Lebedev, Art Director & Designer" (starting at /information)

**What it is:** the portfolio of an award-winning independent designer. Almost everything on it is a **mono, all-caps, black and off-white** editorial UI, with a few heavy WebGL moments (an immersive 3D video carousel on the home page and cloth-like 3D ribbon badges in the menu).
**Stack (verified from the HTML and scripts):**
- **Webflow** (site id `6a1b2e526a4e9824d2a86727`; `webflow.*.js`, jQuery 3.5.1).
- **GSAP 3.12.7 + ScrollTrigger**, **Lenis 1.3.23** smooth scroll, **Three.js r160** (`cdn.jsdelivr.net/npm/three@0.160.0`), **hls.js 1.5.7** (adaptive video), Finsweet Attributes, Google WebFont Loader.
- Custom JavaScript is hosted as `.txt` files on the Webflow CDN (7 scripts, listed under "Custom scripts" below).

**Pages: 54, all fetched** (the full list is in `raw/artemiilebedev/`): `/`, `/information`, `/work`, `/archive`, `/alter-ego`, `/journal`, `/contact`, `/privacy-policy`, **38 case studies** under `/work/…` and **13 journal articles** under `/journal/…`.

## Design tokens
| Token | Value |
|---|---|
| CSS vars | `--black:#010101; --white:#f1f1f1` (body background `rgb(10,10,10)` = `#0a0a0a`, near-black) |
| Font | **Fragment Mono 400** only, loaded via WebFont Loader. Everything is `text-transform:uppercase`. |
| Micro text | 10.4px / 11.2px / 10.88px, line-height equals font-size, letter-spacing **-0.224px** (-0.02em) |
| Headline | 31px / **700** / lh 31px / -0.224px (e.g. the awards counts "×148") |
| Easing | menu `cubic-bezier(0.16,1,0.3,1)`; link duration 620ms; nav hover 900ms; menu badge fade 0.45s |
| Behance tile hover | `scale(1.035)`, frosted blur 14px, tint `rgba(120,120,125,.08)` |
| Hero reveal vars | `--hero-list-reveal`, `--hero-overlay-reveal`, `--glyph-morph`, `--hold-p`, `--line-fill` (animated by GSAP) |

## Global chrome (present on every page)
- "Skip to content" link, then logo "Artemii Lebedev — Art Director & Designer", a **Menu** button.
- The expanded menu panel (`.menu_expanded`) holds:
  - nav: Work / alter-ego / Journal / information / Archive / contact;
  - an **"expand"** area with "6 Ongoing Projects", "commissions" and `hello@artemiilebedev.com`;
  - **CURRENTLY BUILDING (2026):** EDGE Manufacturing (Industrial, "skip matrix" data intelligence), Nova (health & medicine), Vacuum Nerds (e-commerce), Kieran Clarke (stunt portfolio), Vivian Rosenthal (personal portfolio);
  - a **NEW 2026 interview** card, "Chasing the Feeling" (Mindsparkle Mag);
  - **LATEST ARTICLES** (5 dated links) and **LATEST ON BEHANCE** (10 dated links);
  - the sitemap and socials (Instagram, Behance, X, LinkedIn).
  - The `.badge_single` project badges inside this panel are rendered as scroll-reactive **WebGL ribbons** (see below).
- Footer: "make meaning, not noise.", location "serbia, belgrade & new york", a **live CEST clock** (`Europe/Belgrade`, ticks each second), and the hint **"PRESS ESC FOR EFFECTS (?)"**.

## Pages
### `/` Home
Hero uses the **immersive WebGL carousel** (see 3D section). After it comes "SELECTED WORK" with 8 projects: Ponder AI (Software 2026), Cantor8 (Business 2026), A Better Lou (Healthcare 2026), Frequency Breathwork (Wellness 2026), Goom Gum (Music 2025), Monolith Studio (Tattoo 2024), Hungry Tiger (Food & Drink 2025), OXI Instruments (Music Instruments 2025). Each project has a preview video and a name overlay.

### `/information`
- **AWARDS — "SELECTED ACHIEVEMENTS"**: ×148 total, Designer of the Year (CSSDA) ×2, Awwwards SOTD ×10, CSS Design Awards SOTD ×17, Awwwards HM ×36, Behance ×40, FWA ×3, Land Book ×23, Independent of the Year nominee ×3, Studio of the Year nominee (LE:MMA) ×1, MaxiBestOf ×5, Siteinspire ×3.
- **EXHIBITIONS — SOLO & GROUP:** NFT Paris (group, Paris 2024); Femme Futura (group, Toda Dubai 2023); Erarta Museum (solo, 2023); Metaverse (group, 2020).
- **PRESS — "INTERVIEWS, GUIDES AND MORE":** 9 linked articles (Reducing cognitive load in healthcare; Building the feeling; Translating the invisible rhythm; Behind The Banxhies; No visuals, no time, no problem; Inside Monolith Studio; How meaning shapes brands; Designer Spotlight; Careers in digital arts), linked to Codrops, Mindsparkle Mag, CommArts, Top Interactive Agencies and Digital Arts Blog.
- **Bio:** "Independent designer and art director working across digital experiences and visual systems. Over the past eight years the work has evolved between digital product thinking and artistic direction…"
- **Services:** Creative Direction, Web Design, Interaction Design, 3D & CGI, Webflow Development.
- **Collaborators:** Nnamdi Asomugha, Oscar Akermo, Jonah Bolden, Dallas Hart, Goom Gum, Matthew Adekponya, Okan Uckun, Emily Ruhl, OXI Instruments "and more…".

### `/work` — all 38 case studies (year, sector)
2026: 21 Oaks (Student Housing), Cantor8 (Blockchain Infrastructure), Ponder AI (AI), Haven Foods (Food Distribution), A Better Lou (Healthcare), Institute of Health (Education & Healthcare), Diamond Rose Sanctuary (Wellness), Frequency Breathwork (Wellness & Breathwork), OneTech (Industrial Manufacturing).
2025: Tensor Stax (SaaS), Amrit Palace (Hospitality), BRANT (Industrial Coatings), Hungry Tiger (Food & Drink), MyHealthPrac (Healthcare), OXI Instruments (Music Instruments), Altitude (Fintech), The Banshies (Performing Arts), Pasha INK (Tattoo & Art).
2024: Travel Next Level (Travel), Q Refinish (Automotive Coatings), Monolith Studio (Tattoo), Le Flair Studios (Fashion & E-Commerce), $Tyrel (Web3), Q Industrial (Industrial Manufacturing), Kieran Clarke (Film & Entertainment), Armur (Film & Entertainment).
2023: BONO Digital (Creative Agency), MAD Global (Marketing Agency), c23 Labs (Tattoo, Courses), The/ Thirty7 (Marketing Agency), AREA 369 (Hospitality). 2022: Oscar Akermo (Tattoo & Art).

**Case-study template** (`/work/<slug>`): month and year, project name, "about the project", "Project Context" (the challenge), **credits** (names and roles), **timeline** (e.g. 1.5 Months), **services** (e.g. Art Direction, Web Design, Motion, Creative Development), **DESTINATIONS** (live website, Behance case), **awards & recognitions** (Behance galleries, CSS Design Awards Special Kudos / Best UX / Best UI / Best Innovation), **special features** (Codrops, CSS Winner SOTD), then "more work" with 2 related projects. Some pages (e.g. Goom Gum) are visuals only.

### `/archive` — visual studies (about 40 items)
Athletic Studies, Memory and Form, Quiet Hours, Robotic, Nothing Breaks, Ferrari, furn objects, ATEEZ Mobile, CONTOUR, ECHO, ATEEZ, N.3., N.5., TensorStax, New Nature, Invoice, Camille Fournet, TIME Magazine, Cassian, Through the eyes of life, OVVO Eyewear, Sarah McColgan, AI Planner, The Symphony of Hues, Embracing the Unknown, Devourers, Vinyl (Aphex Twin), Swedish House Mafia, Salvator Ganacci, Translator WatchOS, K N TXT, Studio Bono, Into the Unknown, Jewellery, Oldschool Player, ANNA, Drumcode, Poster Collection (2023–2026).

### `/alter-ego` — music visuals (2024–2026)
11 pieces: A Capella, Rondo, Moonlight, Don't Wake Up, Desire, Spirit, Enough, Future Folk, Back & Drop, Demeter, Imagine. Live performance films with a "watch" link: Don't Wake Up (Switzerland), Desire (Miami), A Capella / Moonlight / Rondo (Soho Garden, Dubai), Spirit (Alees World, Tunisia).

### `/journal` — 13 articles
Cantor8: Making Infrastructure Visible (11.10.2026); Editing the Editor; Through the Years; Designing for Sound; Translating the invisible rhythm of breath…; Why the Second Year Was Harder Than the First; What I've learned after 50+ projects; Designer of the Year '24; A Microsite as a Playground; Designing Between Concept and Code; Reimagining film-production services; Bringing Tattoos into the Digital Era; The born of Le:mma Studio. Article template: tags, date, title, long body with subheads, share, next articles.

### `/contact`
Form: full name*, company, e-mail*, SERVICE REQUIRED* (Website Design & Development, e-Commerce, Brand Identity, Mobile Application, Music Visuals), timeline* (1–2 / 3–6 / 6–12 months, Flexible, Not sure yet), budget* (Under $10k, $10k–30k, $30k–50k, $50k+), "What Are We Building?*", privacy-policy checkbox, reCAPTCHA. States: "thanks! Inquiry received…" and an error message. Headline: "What's Next? The First Conversation."

### `/privacy-policy`: full legal text (about 7.3k characters).

## 3D, WebGL and interaction layer (read from the actual scripts)
1. **Immersive home carousel** (script `interactive-carousel`, v70). Three.js r160, `PerspectiveCamera` (fov 50, z 8), a `Group` of `PlaneGeometry` tiles, each 16:9 (height 2.25, gap 0.1) with a `VideoTexture` fed by **HLS** streams, a custom `ShaderMaterial` and a `Raycaster`.
   - Two modes, saved in `localStorage` (`home-hero-view-mode`): **carousel** and **fullscreen**. Mode changes run a morph with an intro (2.0s) and a video hand-off at 58%.
   - Interactions: scroll plus **drag** (sensitivity 0.012, lerp 0.1), a **warp** distortion proportional to velocity (`uWarpIntensity`), a **grayscale-to-colour** reveal (`uGray`), cover-fit uniforms, and a **press-and-hold (650ms)** ring to enter a project. A caption follows the cursor with lerp 0.16 (0.28 while dragging). Background colour 0x050505. Desktop only (≥992px, hover and fine pointer).
2. **Menu ribbon badges** (script `scroll-badges`, v20). Each badge SVG is turned into a texture on a subdivided plane (10×16 segments) with a custom vertex shader that makes it flutter like a ribbon driven by scroll velocity, with a wind gain and velocity decay 0.94. Max DPR 2. Desktop only.
3. **ESC effects overlay** (script `esc-effects`). Pressing **Esc** toggles a full-screen canvas overlay and cycles through 6 effects: **1** film grain (low-res noise), **2** rust pixel grid, **3** editorial grid aligned to the live layout columns, **4** cursor-reactive gradient, **5** infrared / thermal vision, **6** "bug lenses" (wandering magnifiers with agency memes). State is kept in `sessionStorage`. Disabled on touch devices and under `prefers-reduced-motion`.
4. **Link hover sound** (script `sound-hover`). A short UI "button" mp3 plays on every link hover through the Web Audio API (volume 0.25, one voice at a time). Desktop only and respects reduced motion.
5. **Live clock** (script `cest-times`): `Intl.DateTimeFormat` in `Europe/Belgrade`, updated on the second.
6. **Video decoder** (`decoder-video`): hls.js with capped buffers (12/24s on mobile, 20/40s on desktop), preloads a first frame for every carousel tile, up to 3 retries, mp4 fallback.
7. **Collapse script** (`collapse-script`, 88KB): bundles a Three.js reference and collapse/expand behaviour; I did not read it line by line.
All custom effects are gated behind `(min-width:768px) and (hover:hover) and (pointer:fine)` and `prefers-reduced-motion`.

## Takeaways for your build
Mono caps typography, near-black, tiny type, plus **three signature interactions**: the drag/warp video carousel, scroll-driven ribbon badges and the Esc effects overlay. All are built from standard libraries (Three, GSAP, Lenis, hls.js), so they can be rebuilt. Full copy of every page is in `raw/artemiilebedev/`.
