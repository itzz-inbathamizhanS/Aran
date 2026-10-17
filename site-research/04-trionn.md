# 4. trionn.com — "TRIONN | AI-Powered Creative Design & Development Studio" (Rajkot, India, est. 2012)

**What it is:** an agency site built as a **sound-and-WebGL playground**: interactive wireframe hero, a 3D-parallax lion on the About page, drag-to-identify team scanner, audio testimonials, and dozens of sound effects.
**Stack (verified from the bundles):**
- **Next.js** (Turbopack) + **Tailwind CSS** (class names like `h-dvh bg-[#C3C3C3] pt-25`).
- **Three.js** (core is bundled into a 515KB chunk) with custom GLSL `ShaderMaterial`s (uniforms such as `uTime`, `uCam`) and `WebGL2`; geometries used: Sphere, Plane, Cylinder, Extrude, plus custom BufferGeometry.
- **GSAP + ScrollTrigger + SplitText** (every heading is split into per-letter spans, which is why raw HTML shows one letter per line), **Lenis**, **Swiper**, `motion` (Framer Motion), Web Audio / `new Audio`.
- Assets are served from the same origin (`/images`, `/video`, `/audio`, `/assets`).
**Pages: 27, all fetched.** Sitemap has 6 (`/`, `/about`, `/services`, `/work`, `/contact`, `/trionn-story`). The 21 case studies at `/work/<slug>` are **not in the sitemap** but all return 200 (found from the Work page links). Text for every page is in `raw/trionn/`. The case-study copy is summarised below.

## Design tokens
| Token | Value |
|---|---|
| Background | `#040508` (near-black blue) |
| Text | `#d8d8d8` (main), `#c8c8c8` (names), `#434343` (muted, lines), `#fff` (highlight), `#000` on light panels |
| Accent | **`rgb(217,67,43)` ≈ `#D9432B`** (red-orange) |
| Light panel | `#C3C3C3` / `--pl-panel-gray:#c8c8c8` (hero behind the WebGL canvas) |
| Glass | `--glass-line:#ffffff2e`, `--ink-soft:#0a0a0a8c` |
| Fonts | **Familjen Grotesk** (variable; headings, 345 text nodes), **Neue Haas Display** Roman (body), **Martian Mono** Light (labels, 245), **PP Editorial New** Ultralight (editorial accents); also `Space Mono` and `Bebas Neue` for one "pl-" component |
| Type sizes | display 66.4px caps / -5.3px tracking; H2 46.5 / 41.5 / -2.8px; sub-head 39.9 caps -1.6; 23.3 / -0.93; body **16.6px**; labels 13.3px caps -0.8px; 15px caps -0.3px |
| Fluid sizing | `html{font-size:calc(1000vw / var(--size))}` with `--size:320` at mobile (changes by breakpoint), so every `rem` scales with the viewport |
| Easing | `--ease-soft: cubic-bezier(.22,1,.36,1)` |
| Team scanner tokens | `--ts-color-bg:#040508`, `--ts-color-hint`, `--ts-color-scan-id`, `--ts-color-detected` |

## Navigation and chrome
Top: "Inspire · Innovate · Impact", **Menu**, links Work / Services / About / Contact / "✦ The TRIONN name Story" (letters roll on hover, so labels are doubled in the DOM), "let's talk". Overlay menu shows Business enquiry (hello@trionn.com, +91 98241 82099), "Est. 2012 — 14+ years shaping digital direction", socials (LinkedIn, Facebook, Dribbble, Instagram). A footer **sound toggle** (`footer-sound.svg`). Every page ends with the same enquiry form: name, email, service (Website Design & Development, UI/UX Design, Web Development, Mobile App Design, Branding & Identity, AI-Powered Digital Product, Something Else), message (min 20 chars), budget ($5K–15K, $15K–30K, $30K–60K, $60K+, Not sure yet), "Send Inquiry" or "Book a 30-minute call" (Calendly `hello-trionn/30min`).

## Pages
### `/` Home (8,057px tall)
1. **Hero:** "Designed to mean something." plus "Discuss Your Project / Book a 30-minute call", on a light-grey (`#C3C3C3`) full-viewport panel with a **WebGL2 canvas** overlay (`absolute inset-0 pointer-events-none z-1`). Interaction copy: **"hold to blast — Dare ⚡ to touch the lines."** Audio: `hero-spark.mp3`, `woosh-loop.mp3`, `hover-beep.mp3`. Sub-line: "Websites, AI products, brands, and systems built for clarity, scale and impact."
2. **About strip:** "Trionn is an independent digital studio crafting meaningful brand experiences through strategy, design, and technology… longevity, clarity first, craft always, built to scale… make technology feel human." Link "more about us". Tagline "Focused vision. Measured execution. Inspire / innovate / Impact — ✦ From idea to outcome."
3. **Key facts:** "A snapshot of our experience and impact." Counters read "50+ projects completed", "1.5K+" (its label was lost in the text), "90% of our clients seek our services for a second project", "20+ our team members" and "our business partners" (the numbers animate as counters, so the extracted labels and values may be mis-paired). Videos: `homepage-services-video.mp4` (+`_m` mobile), `awards-card-video.mp4`.
4. **Featured & Awards:** "Featured on top design platforms worldwide" (award badges: Awwwards SOTD / Developer / Honors, CSSDA UI / UX / Innovation / SOTD, CSS Winner SOTD ×3, GSAP Site of the Week, Orpetron, Muzli, FWA, Codrops).
5. **Team:** "Different skills. One standard." A team video card (`team/rushi.mp4`).
6. "Let's build something great" form, footer.

### `/about`
"We are an independent digital studio built on clarity, thoughtful craft, and trust earned worldwide."
- **Lion block:** "Dare the Lion 🦁 — Drag the strips with sound on." Images `lion.jpg` and `lion-depth.jpg` (+ mobile versions) are a **colour image plus depth map**, which means a depth-displaced parallax or sliced "strips" effect in WebGL. Audio `lion-growl.mp3`, `thunder.mp3`, `curtain.mp3`, `hanging-lion.mp3`; videos `hanging-lion.mp4` (+ mobile).
- "At Trionn, we build teams around ideas…" "Est. 2012 — we've grown through experimentation, learning and refinement."
- **Our values (6):** Driven by excellence · Honesty and authenticity · Designs that last · Purposeful decisions · Creativity with impact · Experience and attitude.
- **Process (3 steps):** Understand · Design & Build · Refine & Evolve.
- **Founder:** Sunny Rathod, Founder & CEO, Awwwards Jury, "27+ yrs" of UI/UX, web and brand systems. Quote: "True growth is not about adding more, but about becoming more."
- **Team scanner:** "DRAG A MEMBER TO IDENTIFY" then "IDENTIFYING…" with scan ids (uses the `--ts-*` tokens).
- **Who we're not for** ("We don't do disposable design, endless revisions without direction…").
- **Awards:** Awwwards (SOTD 1×, Developer 1×, HM 4×), FWA of the day 1×, CSS Design Awards (SOTD 2×, Special Kudos 2×, UI/UX/INN 2×), Orpetron (SOTM 1×, SOTD 2×, Web design appreciation 2×), GSAP (SOTW 1×, SOTD 1×), CSS Winner SOTD 3×, Codrops featured 2×, Muzli honor 1×.
- **Brands partnered with:** Luxury Presence, Credible, Yellowtail, My Worker, CrissCross, Ockto, Technis, Ubiqu; more: Fiare Oy, Nettiauto, Budo Law, DAC Recruiting, Globalstar Interactive, RevNet, ROI High, Flow Row, Vendep Oy, Billionaire Suit, Berkley, Re.Events, Cirgo Bike, Julia Daviy, FieldBridge LLC, SoundBoard AI, Mizuno CGI, Joonko.
- **Client stories** with "▷ Listen to him!" audio buttons: Malte Kramer (Luxury Presence), Stephen Dash (Credible), Doug Petrie (Fast Resume), Jean-Baptiste Biolay (Technis), Zoltan Csonka (Ventigence). Photos `malte.webp`, `doug.webp`, `jean.webp`.
- **Culture gallery:** "Work hard. Play loud."

### `/services`
Six disciplines: **AI & Intelligent Automation** (AI experiences, n8n workflow automation, agents and assistants, semantic search, business automation); **Website & Mobile Design** (hi-fi web, mobile apps, responsive, UX/UI systems, motion-first interfaces, interactive storytelling); **Product Design** (strategy, interface, UX architecture, design system, prototyping, motion); **Web Development** (front and back end, headless CMS, **WebGL & Canvas**, **shader-based interactions**, GSAP motion systems, creative development); **WordPress Development**; **Branding**.
**Technology stack (full list):** OpenAI API/SDK; React, Next.js, JS ES6+, jQuery, Bootstrap, Tailwind, Sass, LESS; **GSAP, Framer Motion, Three.js, WebGL, HTML5 Canvas, Shaders**; PHP, Node.js, Express, Magento, WordPress, REST; MySQL, MongoDB, HubSpot CMS, Contentful, Sanity, Strapi, WooCommerce, Shopify; AWS, GCP, DigitalOcean; Git, GitHub, GitHub Actions, n8n; HubSpot and SendGrid email templates. The bundle also references a `services-orbit` asset set (`2–6.svg`, `vector-shape.svg`, `spark.mp3`, `woosh.mp3`), which suggests an orbiting-icons animation (inferred from the file names, not watched).

### `/work`
"Our work — a curated showcase of branding, digital products, websites, and mobile experiences." 21 projects (title, one-liner):
MyWorker AI (AI workforce platform) · Pulse Studio (motion-led studio site) · Loftloom (real estate) · DFZ Watch (luxury watches) · Domus Immobilien Kultur (real estate/architecture) · Revnet (hybrid cloud) · Finora (fintech) · Crowd Mouth (creator/fan platform) · Technis (AI spatial intelligence) · Enterra AI (enterprise AI support) · 8octa (data-analytics branding) · One.Dot (studio site) · iMusic (music app) · Techno (event tech) · Z1Flux Solar (solar manufacturing) · Novaglam (fashion e-commerce) · Reyden (industrial engineering) · Shore (finance app) · Stuffosome (luxury eyewear branding) · First Ground Coffee (coffee e-commerce) · Reelix (filmmaking studio). Hero images live at `/images/projects/<slug>/<slug>.jpg` (about 8–13 `.webp` per project). The bundle references `work-listing.mp3` (presumably played on this page).
**Case-study template** (`/work/<slug>`): "Back to work"; title; one-liner; 4 discipline tags; then the three tabs/sections **The challenge / Approach / Outcome**, "What we did" (4 bullets), an image gallery, and an external link (**View on Dribbble** / **View Demo**), Previous / Next. Disciplines by project: AI Product Design / UI/UX / Web Development / Interaction Design (MyWorker AI, DFZ, Reyden); UI/UX / Web / Frontend (Technis, Enterra AI); Brand Identity / Logo / Identity / Packaging (8octa, Stuffosome); Mobile App Design (Crowd Mouth, iMusic, Shore); E-commerce (Novaglam, First Ground Coffee); Creative Direction / Motion (Pulse Studio, Reelix).

### `/contact`
"Let's start something." Enquiry form, location "TRIONN Office No. 216 – 4Plus Complex, Sardar Nagar Main Road, Astron Chowk, Rajkot 360001, Gujarat, India", "Join us" (send a note and your work), and a **7-question FAQ** (kind of work, who they work with, how projects begin, agency partnerships, NDAs, pricing/payments = milestone-based with a deposit, availability = selective).

### `/trionn-story`
"The story behind the Trionn name and the meaning of its mascot." TRI = power of three, **Trimurti** (Brahma, Vishnu, Mahesh), "ONN" = "Om Namo Narayana", the mascot is a **three-headed lion** after Lord Narasimha. Assets: `name-story/trimurti-brahma.png`, `trimurti-vishnu.png`, `trimurti-shiva.png`, `narasimha-only.png`; sounds `name-story.mp3`, `name-story-spark.mp3`.

## Media inventory
- **Videos:** `awards-card-video(.mp4/_m.mp4)`, `awards-video.mp4`, `form-background-video.mp4`, `hanging-lion(.mp4/-mobile.mp4)`, `homepage-services-video(.mp4/_m.mp4)`, `team/rushi(.mp4/_m.mp4)`.
- **Audio:** `assets/glass-shatter.mp3`, `hero-spark.mp3`, `hover-beep.mp3`, `join-zoom.mp3`, `woosh-loop.mp3`; `audio/curtain.mp3`, `hanging-lion.mp3`, `lion-growl.mp3`, `name-story-spark.mp3`, `name-story.mp3`, `thunder.mp3`, `work-listing.mp3`; `services-orbit/spark.mp3`, `woosh.mp3`. (Roughly 14 distinct sounds.)

## What I could not fully decode
I confirmed that Three.js and shader code ship in the bundle and which assets and sounds exist, but I did not run the hero interaction frame by frame, so exact visuals of "hold to blast", the lion strips and the team scanner are described from copy, assets, and uniforms and not from watching them. Open the site, hold the mouse on the hero and drag on /about to see them.

## Takeaways for your build
Dark `#040508`, three-font system (grotesk, neo-grotesque, mono, plus a serif accent), SplitText letter animation, a WebGL hero with sound, a depth-map lion, and a scanner interaction. The distinctive part is **sound design**: roughly 14 effects tied to interactions and a global sound toggle.
