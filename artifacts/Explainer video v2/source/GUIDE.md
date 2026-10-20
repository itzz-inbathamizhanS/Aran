# How to draw a scene for the Aran explainer video (v2)

Folder: this `source/` folder (called V2 below).

## The video
A 76.6 minute animated explainer of "Aran", a data firewall for Indian banks, for viewers with NO technical background.
The viewer said the last version was too technical and hard to follow. So every scene must make the spoken line obvious
through a picture that moves: show the everyday example (waiter, cloakroom token, smoke alarm, lock and key...) and the
real thing side by side. Every technical word gets a plain-words card (`X.term`) AND a picture at the moment it is spoken.

Style: clean, flat, "paper" look (warm off-white background, ink text, a few calm colours). NO glow, NO neon, NO gradients,
NO dark backgrounds, NO emoji. Only colours from `C` in `player/engine.js`. Titles/labels of big things in serif (`serif: true`), body in sans.

## Files
- `script.txt`: the narration. `## id | label | title | flags` starts a scene; each following line is one spoken line (cue). Text after `||` is only the spoken form; the subtitle shows the text before it.
- `script.json`: the same, parsed (field `lines[k].text`).
- `timing.js`: `window.TIMING` with cue times, written by `tts.py` from the real voice. Scenes are timed by cue index, so they adapt automatically when a line is re-recorded. Never hard-code seconds.
- `player/engine.js`: the engine. READ IT FIRST (it is short).
- `scenes/<id>.js`: one file per scene: `scene('<id>', X => { ... });`. Examples to copy the style from: `scenes/bankday.js`, `scenes/checkdigit.js`.
- `data.js`: `window.DATA` with real computed values: `DATA.rounds` (the 10 real FF1 Feistel rounds for body 23456789012 with tweak "loan-vendor", ending at ['09826','158641']), `DATA.merkle` (leaves, L = leaf hashes, n12, n34, root, tampered L3b/n34b/rootb), `DATA.h1`/`h2` (SHA-256 prefixes of 234567890124 and 234567890125), `DATA.hm` (an HMAC prefix), `DATA.log` (36 real Loghub log lines with 6-digit runs, as [system, line]).
- The previous (dark) version of the video is in `../../Explainer video/source/player/scenes*.js`. Its maths and data are right (Luhn worked example, pentagon moves, Feistel rounds, Merkle tree, immune detectors, precision/recall dots): reuse ideas, but redraw in the new style with MUCH more motion and simpler pictures.

## Screen layout (1920 x 1080)
- Header (label + title) is drawn by the engine at y < 112 (not on `part`/`noheader` scenes).
- Subtitles cover the bottom band: roughly y > 955, centred, up to 1600 px wide. Keep everything important ABOVE y = 930.
- Word cards (`X.term`) appear top right: x 1150..1870, y 20..~200. Don't put important content there while a card shows.
- So the safe content area at camera scale 1 is x 60..1860, y 130..930. When you zoom the camera in (s > 1), check what is framed.

## Timing model
Cue k = line k of the scene (0-based). `X.at(k, f)` = scene time when line k is fraction f spoken.
- `X.show(el, k, {f, d, len, type, out, outf, dist, op})` — appear at cue k; types: up, down, left, right, pop, fade, draw (for X.path/X.arrow), grow (scaleX), rise (scaleY). `out: k2` hides it again at cue k2.
- `X.P(k, f, d, len)` eased 0..1 progress; `X.L(k, f0, f1)` linear progress through line k's speech; `X.on(k0, k1)`.
- `X.each(t => {...})` runs every frame (scene-local t). Use it for custom motion.
- `X.cam([{x, y, s}, {k, f, x, y, s, len}, ...])` camera: first key = starting framing; later keys glide (default 1.4 s) from cue k. The engine also adds a slow drift so nothing is ever frozen. Use 3–6 camera moves per scene: zoom in on the thing being explained, pull back to show context.

## Builders (all absolute coordinates; every builder takes `{parent}`)
`X.text(x,y,str,{size,w,fill,anchor,serif,mono,italic,lh})` (`\n` = new line; no auto-wrap: width ≈ 0.53 × size × characters for sans), returns group with `.set(str)`.
`X.rect(x,y,w,h,{fill,stroke,r,sw,dash,shadow})`, `X.box(x,y,w,h,{label,sub,size,fill,stroke,color,serif,mono})` (box has a flat offset shadow), `X.chip(x,y,str,{size,color,fill,mono})`,
`X.line`, `X.path(d,{color,sw,dash})`, `X.arrow(x1,y1,x2,y2,{color,sw,bend,head})`, `X.digits(cx,y,str,{groups,cw,ch,size,gap,anchor,fill})` (cells, `.set(str)`, `.paint(i,fill,stroke,color)`), `X.circle`, `X.mark(x,y,ok)` (tick/cross),
`X.icon(name,x,y,scale,{color,fill})` names: bank phone server log cloud person key lock unlock file db shield clock chat laptop envelope alert brain atom gear qr idcard card building trash magnifier scale bulb coin pipe.
`X.term(k, 'Word', 'plain meaning line 1\nline 2', {until})` word card. `X.recap(k, ['point 1','point 2','point 3'])` — the standard recap card; use it on every "Recap." line (keep each point under ~55 characters).
Characters: `X.person(x, feetY, {shirt, skin: C.skin[0..3], long, glasses, hood, tie, badge, name, s, ph})` — breathing + blinking built in; `.mood('happy'|'sad'|'shock'|'neutral')`, `X.talk(p, [cues])`, `X.wave(p, k)`, `X.point(p, k, angle, {until})`, `X.arms(p, left, right)`.
Recurring cast (keep consistent): Ravi (customer, shirt C.blue, skin C.skin[1]); bank clerk (shirt C.plum, skin C.skin[2], long hair); security officer (shirt C.ink, badge, skin C.skin[0]); attacker (hood C.ink, shirt C.ink2, skin C.skin[3]); vendor staff (shirt C.teal); insider (shirt C.ochre, glasses).
Motion helpers: `X.spline(points)` → `{d, at(p)}`; `X.travel(el, sp, k, {f0,f1,rotate})` moves a group drawn around (0,0) along a spline; `X.stream(sp, {n, speed, r, color, k0, k1})` endless flow of dots; `X.count(textGroup, from, to, k, {f0,f1,fmt,pre,post})`; `X.type(textGroup, str, k, {f0,f1})` typewriter; `X.bob(el, {amp, per, ph})`; `X.pulse(el, cx, cy, k)`; `X.shake(el, k)`; `X.spin(el, cx, cy, {speed})`; `X.bar(x,y,w,h,frac,k,{color})` growing bar; `rng(seed)` deterministic random.

## Rules that avoid bugs
1. `X.show` sets a CSS transform on its element. `travel/bob/pulse/shake/spin` set the SVG `transform` attribute. Never put both on the same element (the CSS one wins and the other breaks). Use `X.wrap(el)` to get a parent for X.show, or animate `icon.mid` (every X.icon has a free `.mid` group).
2. Never call getBBox/getTotalLength/getComputedTextLength (scenes are built while hidden). Compute positions yourself.
3. Never use Math.random or Date; use `rng(seed)`. A frame must depend only on time.
4. Every spoken line must cause a visible change (something appears, moves, highlights, counts or the camera moves), and something should be moving at all times (streams, bobbing, characters, counters).
5. Numbers: use the real values from the script and DATA. Identifiers are ONLY these generated ones: Aadhaar 2345 6789 0124 (valid Verhoeff), its tokens: CRM 2498 2684 6187, loan vendor 0982 6158 6412, log platform 0196 3809 2692; PAN ABCPK1234L; mobile 98765 43210; OTP 482913; UPI ravi@oksbi; card example body 7992739871 + check digit 3 (Luhn). Names: Ravi Kumar, Asha, Vel. Never invent other real-looking personal numbers.
6. Real company names appear only in the incident chapters, as text labels (no logos).
7. Text must fit its box; nothing may run off screen or overlap other text. Keep font sizes ≥ 22 px for labels, ≥ 28 for main text.

## Checking your work (required)
```
cd V2 && export NODE_PATH=$(npm root -g)
node snap.js shots/<id> <id>:0:0.85 <id>:1:0.85 ...        # one PNG per cue at 85% of the line; prints JS errors
python3 sheet9.py shots/<id>_sheet.jpg shots/<id>_<id>-0-0.85.png ...   # 3x3 contact sheet (9 images)
```
Look at the PNGs/contact sheets with the Read tool. Fix overlaps, cut-off text, empty-looking frames and errors. Also check a frame mid-way through a long line (frac 0.3) to see motion states. "no errors" must be printed.
When several people draw chapters at once, each edits only their own `scenes/<id>.js` files; changes to engine.js, player.html or script.txt go through one person, and anything missing from the engine is first written inside the scene file.
