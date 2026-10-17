# 1. percyjackson.framer.media — "Percy Jackson, Brand Designer & Creative Art Director"

**What it is:** a paid **Framer portfolio template** (the footer has "Get Template" and a "Made in Framer" badge, and the meta description reads "A premium portfolio template for brand designers…"). The name, bio and case studies are placeholder content. Treat it as a layout and typography reference, not a unique design.
**Stack:** Framer (hosted). Scripts are `framerusercontent.com/sites/…/script_main.*.mjs` plus Framer analytics. No WebGL and no `<canvas>`. **No 3D.**
**Pages (6, all checked):** `/`, `/about-me`, `/404`, and 4 case studies `/projects/noire-atelier`, `/projects/ember-co.`, `/projects/flux-studios`, `/projects/wilder-collective`.

## Design tokens (measured from the live DOM)
| Token | Value |
|---|---|
| Page background | `#000` (body), cards on `#1A1A1A`, white panels `#FFF` |
| Text | `#FAFAFA` (main), `#000` (on white pills and buttons), `#ABABAB` (muted) |
| Fonts | **Inter Display** 500 and 700 (nearly everything), Inter 400 and 700 (small bits). Framer serves them as self-hosted woff2. |
| Hero name | 160px / 700 / line-height 0.8–0.9 / letter-spacing -3.2px (-0.02em), all caps, two lines "PERCY" and "JACKSON" (scales down to about 125px on narrower screens) |
| H2 | 40px / 600 / lh 48 / -0.8px |
| Large body | 24px / 500; 20px / 500 / lh 24 / -0.4px; 18px / 500 |
| UI text | 14px / 500 / lh 16.8 (nav, badges, labels); 12px / 400 and 10px / 400 (tiny captions) |
| Radius | pills and buttons fully rounded; custom cursor dot `border-radius:180px` |

## Home page `/` — section by section (heights at 1024×768)
1. **Hero** (768px, `Hero section`).
   - Top bar: logo "PERCY JACKSON", nav links with tiny superscript index numbers (`/About me ¹`, `/Work ⁰²`, `/Services ⁰³`), and a white pill button **"Contact Now ↗"** (links to Calendly).
   - Under that: a bullet list of three disciplines (BRAND SYSTEMS / VISUAL IDENTITY / PRODUCT DESIGN).
   - A line "/Based in London, UK." with a **live clock pill** (shows 8:39 PM and "(GMT+0)").
   - Giant stacked name "PERCY / JACKSON" with an arrow glyph at the end of the second line.
   - Tagline with emphasised words: "I design **conversion-focused** websites that drive results. Helping **ambitious** brands stand out and **connect**."
2. **Video section** (572px). A full-width autoplay, muted, looping MP4 (`gxybd2yBLBRv3ATlrNF36QPi9k4.mp4`, with a poster frame). The footage itself is an ASCII or dithered monochrome animation, so the "ASCII look" is baked into the video and is not a shader.
3. **Selected Works** (2111px, `Works section`). Label "SELECTED WORKS", then 4 cards stacked vertically (about 440px pitch, each image about 475×374). Each card has a title (NOIRE ATELIER, EMBER & CO., FLUX STUDIOS, WILDER COLLECTIVE), a one-line description and 3 outline "badge" tags. Cards use separate Desktop and Tablet variants, and `Work Image` and `Image container` layers (image hover reveal).
4. **My Services** (1056px). "/What I do", 4 numbered rows 01–04: Brand Identity Systems / Creative Direction / Digital Product Design / Packaging & Print.
5. **About** (1111px). "ABOUT PERCY / How I Work", 3 paragraphs and a portrait (cropped, 493×754), then a big "Contact Now" CTA.
6. **Footer** with "Created by", the Framer template link, socials (Behance, Instagram, Dribbble, LinkedIn, X) and `mailto:`.
- **Extras:** a custom **cursor** element (a small `#FAFAFA` circle that follows the mouse), plus a floating "Patrick Jane" promo card and "Made in Framer" badge bottom-right (Framer's template promotion, not part of the design).

**Smooth scroll:** the page has Framer's own smooth-scroll behaviour. `lenis` appears in the HTML, so it runs via Framer's integrated scroller.

## Sub-pages
- **/about-me:** "ABOUT PERCY / Brand designer and creative art director based in London." Three numbered blocks:
  - (01) How I think: "Design That Works Hard".
  - (02) How I started: "From Buildings to Brands" (studied architecture at UCL, a café logo changed everything, studio in Shoreditch).
  - (03) Outside work: "What Keeps Me Inspired".
  - "MY EXPERIENCE" timeline: Freelance 2019–now (Brand designer & Creative art director); Axionizy 2016–2019 (Senior brand designer, clients Axenly / WeTransfer / V&A); Katrexy 2014–2016 (Mid-weight designer); Plysero 2012–2014 (Junior designer).
- **Case-study template** (identical for all 4): Back link; big title; one-line summary; 3 tag badges; meta rows **Year / Client**; then Overview, Scope, Tools used, Timeline; "More projects" shows the other 3 titles. Content:

| Project | Tags | Year | Client | Timeline | Tools |
|---|---|---|---|---|---|
| Noire Atelier | Luxury, Fashion, Branding | 2023 | Luxury Fashion House | 12 weeks | Figma, Illustrator, InDesign |
| Ember & Co. | F&B, Packaging, Identity | 2022 | Artisan Bakery | 10 weeks | Procreate, Illustrator, Figma |
| Flux Studios | Tech, AI, Digital | 2024 | AI Creative Platform | 16 weeks | Figma, Framer, After Effects |
| Wilder Collective | Outdoor, Lifestyle, Strategy | 2023 | Outdoor Lifestyle Brand | 14 weeks | Figma, Illustrator, Lightroom |

- **/404:** huge "404", "LOST?", "This page doesn't exist. Let's get you somewhere that does." plus a Back to Home button.

## Assets (all on framerusercontent.com)
Work images: `O9pZw0ExMwFdOGniE63Ij0wFM4I.jpeg`, `PPvhIo9ycyen9fzyXYQ7TqMAAOQ.png`, `t7GdtJN18vA4GDhQHqvQWg7Px6I.png`, `7qTAc7lX2aklwFDN5rE6Uo2E88.jpeg`; about portrait `NC90ilEIwy4CjNRAoOmZNrJF4.png`; hero video `assets/gxybd2yBLBRv3ATlrNF36QPi9k4.mp4`.

## Takeaways for your build
Pure typography-led brutalism: one font, black and white, enormous stacked name, a live clock, a video interlude, and a vertical stack of work cards. Easy to rebuild in plain HTML, CSS and GSAP, or in Framer.
