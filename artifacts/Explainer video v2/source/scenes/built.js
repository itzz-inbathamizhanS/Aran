// How it was built: a 43-hour timeline with milestones dropping onto it, the rules board,
// a shelf of 21 learning documents, and the repository that remembers every saved version.
scene('built', X => {
  const H = 43, x0 = 150, x1 = 1770, TY = 250;
  const xt = h => x0 + (x1 - x0) * h / H;
  X.cam([
    { x: 960, y: 640, s: 1.3 },
    { k: 0, f: 0.55, x: 960, y: 540, s: 1, len: 2 },
    { k: 1, x: 930, y: 560, s: 1 },
    { k: 3, x: 990, y: 560, s: 1 },
    { k: 4, x: 960, y: 556, s: 1 },
    { k: 6, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 9, x: 990, y: 545, s: 1 },
    { k: 10, x: 960, y: 540, s: 1 }
  ]);

  // ---------------- the timeline (16 Oct 00:00 .. 17 Oct evening) ----------------
  const TL = X.g();
  X.rect(x0, TY - 8, x1 - x0, 16, { parent: TL, fill: C.sand, stroke: 'none', r: 8 });
  const fill = E('rect', { x: x0, y: TY - 8, width: 0, height: 16, rx: 8, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 2 }, TL);
  for (let h = 0; h <= 42; h += 6) X.line(xt(h), TY + 12, xt(h), TY + 24, { parent: TL, color: C.ink3, sw: 3 });
  X.line(xt(24), TY - 30, xt(24), TY + 24, { parent: TL, color: C.ink2, sw: 3 });
  X.text(x0, TY - 56, '16 Oct, 00:00', { parent: TL, size: 22, w: 600, fill: C.ink2 });
  X.text(xt(24), TY - 56, '17 Oct, 00:00', { parent: TL, size: 22, w: 600, fill: C.ink2, anchor: 'middle' });
  X.text(x1, TY - 56, '17 Oct, evening', { parent: TL, size: 22, w: 600, fill: C.ink2, anchor: 'end' });
  X.text(xt(11), TY - 56, 'about 43 hours', { parent: TL, size: 24, w: 700, fill: C.ochre, anchor: 'middle', serif: true });
  X.show(TL, 0, { type: 'down' });
  const lead0 = E('circle', { cx: x0, cy: TY, r: 13, fill: C.ochre, stroke: C.ink, 'stroke-width': 3 }, TL);
  X.each(() => {
    const p = ease(X.L(0, 0.12, 0.85));
    fill.setAttribute('width', (x1 - x0) * p);
    lead0.setAttribute('cx', x0 + (x1 - x0) * p);
    lead0.style.opacity = X.t < X.at(1) ? 1 : 0;
  });

  // ---------------- the 43-hour clock (cue 0) ----------------
  const CK = X.g();
  const cx = 960, cy = 640, R = 165;
  X.circle(cx + 7, cy + 7, R, { parent: CK, fill: C.shadow });
  X.circle(cx, cy, R, { parent: CK, fill: C.card, stroke: C.ink, sw: 6 });
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    X.line(cx + Math.sin(a) * (R - 14), cy - Math.cos(a) * (R - 14), cx + Math.sin(a) * (R - (i % 3 ? 26 : 40)), cy - Math.cos(a) * (R - (i % 3 ? 26 : 40)), { parent: CK, color: C.ink, sw: i % 3 ? 3 : 6 });
  }
  const hHand = E('line', { x1: cx, y1: cy, x2: cx, y2: cy - 90, stroke: C.ink, 'stroke-width': 12, 'stroke-linecap': 'round' }, CK);
  const mHand = E('line', { x1: cx, y1: cy, x2: cx, y2: cy - 135, stroke: C.ochre, 'stroke-width': 7, 'stroke-linecap': 'round' }, CK);
  E('circle', { cx, cy, r: 12, fill: C.ink }, CK);
  const dayT = X.text(1190, 600, '16 Oct', { parent: CK, size: 34, w: 600, fill: C.ink2, serif: true });
  const hrsT = X.text(1190, 690, '0 hours', { parent: CK, size: 66, w: 700, fill: C.ochre, serif: true });
  // sun / moon on the left
  const sun = X.g(CK);
  X.circle(730, 640, 40, { parent: sun, fill: C.ochreL, stroke: C.ochre, sw: 5 });
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; X.line(730 + Math.cos(a) * 54, 640 + Math.sin(a) * 54, 730 + Math.cos(a) * 70, 640 + Math.sin(a) * 70, { parent: sun, color: C.ochre, sw: 5 }); }
  const moon = X.path('M745,600 A44,44 0 1,0 745,680 A34,34 0 1,1 745,600 Z', { parent: CK, color: C.ink2, sw: 4, fill: C.blueL });
  moon.p.style.strokeDasharray = 'none';
  X.show(X.wrap(CK), 0, { type: 'pop', out: 1, outLen: 0.6 });
  X.each(() => {
    const hrs = 43 * ease(X.L(0, 0.12, 0.85));
    mHand.setAttribute('transform', `rotate(${(hrs * 360).toFixed(1)} ${cx} ${cy})`);
    hHand.setAttribute('transform', `rotate(${(hrs * 30).toFixed(1)} ${cx} ${cy})`);
    dayT.set(hrs < 24 ? '16 Oct' : '17 Oct');
    hrsT.set(Math.floor(hrs) + (Math.floor(hrs) === 1 ? ' hour' : ' hours'));
    const hod = hrs % 24, day = hod > 6 && hod < 18.5;
    sun.style.opacity = day ? 1 : 0; moon.style.opacity = day ? 0 : 1;
  });

  // ---------------- the team lead, present from the rules onwards ----------------
  const lead = X.person(250, 880, { shirt: C.green, skin: C.skin[1], name: 'Team lead', s: 0.95 });
  X.show(lead, 1, { type: 'right' });
  const desk = X.g();
  X.rect(335, 800, 200, 14, { parent: desk, fill: C.ink3, stroke: 'none', r: 4 });
  X.rect(350, 814, 12, 66, { parent: desk, fill: C.ink3, stroke: 'none', r: 3 });
  X.rect(508, 814, 12, 66, { parent: desk, fill: C.ink3, stroke: 'none', r: 3 });
  const lap = X.icon('laptop', 435, 764, 0.8, { parent: desk });
  X.show(desk, 2, { f: 0.02, type: 'up' });
  // card throws (cue 2) timing
  const throwF = [0.02, 0.36, 0.7];
  X.each(t => {
    let r = -8, l = 8;
    if (X.t >= X.at(1) && X.t < X.at(2)) r = lerp(-8, 70, X.P(1, 0.1, 0, 0.5));
    else if (X.t >= X.at(2) && X.t < X.at(3)) {
      r = 70;
      for (const f0 of throwF) { const u = X.L(2, f0, f0 + 0.2); if (u > 0 && u < 1) r = 70 + 70 * Math.sin(u * Math.PI); }
    } else if (X.t >= X.at(3) && X.t < X.at(4)) r = 55 + 25 * Math.sin(t * 3);
    else if (X.t >= X.at(4) && X.t < X.at(10)) { r = 62 + 10 * Math.sin(t * 13); l = 40 + 10 * Math.sin(t * 11 + 1); }
    else if (X.t >= X.at(10)) r = lerp(40, 85, X.P(10, 0.1, 0, 0.5));
    X.arms(lead, l, r);
    lead.mood(X.t > X.at(10, 0.6) ? 'happy' : 'neutral');
  });

  // ---------------- rules board (cues 1-2) ----------------
  const board = X.g();
  X.rect(520, 470, 940, 410, { parent: board, fill: C.sand, stroke: C.ochre, sw: 5, r: 18, shadow: true });
  X.text(990, 528, 'Working rules', { parent: board, size: 34, w: 700, anchor: 'middle', serif: true });
  X.show(board, 1, { type: 'up', out: 3 });
  const rules = [
    ['laptop', 'Work locally', 'on the laptop', C.blue],
    ['person', 'One name', 'every change saved\nunder the lead\'s name', C.green],
    ['file', 'Record everything', 'in notes', C.plum]
  ];
  rules.forEach(([ic, h, s, col], i) => {
    const outer = X.g();
    const inner = X.g(outer);
    X.rect(-140, -140, 280, 290, { parent: inner, fill: C.card, stroke: col, sw: 3, r: 12, shadow: 5 });
    X.circle(0, -122, 11, { parent: inner, fill: C.red, stroke: C.ink, sw: 2 });
    X.icon(ic, 0, -45, 0.72, { parent: inner, color: col });
    X.text(0, 52, h, { parent: inner, size: 28, w: 700, anchor: 'middle', serif: true });
    X.text(0, 90, s, { parent: inner, size: 22, fill: C.ink2, anchor: 'middle', lh: 28 });
    const tx = 690 + i * 300, ty = 715;
    const sp = X.spline([[320, 690], [lerp(320, tx, 0.5), 520], [tx, ty]]);
    X.travel(inner, sp, 2, { f0: throwF[i], f1: throwF[i] + 0.2 });
    X.show(outer, 2, { f: throwF[i], type: 'fade', len: 0.25, out: 3 });
  });
  X.term(2, 'Working locally', 'Keeping the code on your own computer,\nnot on a computer somewhere else.', { until: 3 });

  // ---------------- shelf of 21 learning documents (cue 3) ----------------
  const shelf = X.g();
  X.rect(620, 470, 740, 410, { parent: shelf, fill: C.sand, stroke: C.ink3, sw: 4, r: 10, shadow: true });
  for (const y of [600, 730, 860]) X.rect(632, y, 716, 12, { parent: shelf, fill: C.ink3, stroke: 'none', r: 3 });
  X.chip(990, 440, 'Before any new plan: learn first', { parent: shelf, size: 24, color: C.ochre, fill: C.ochreL });
  const cnt = X.text(1600, 690, '0', { parent: shelf, size: 120, w: 700, fill: C.ochre, anchor: 'middle', serif: true });
  X.text(1600, 750, 'learning documents,\none per topic', { parent: shelf, size: 28, anchor: 'middle', fill: C.ink2, lh: 36 });
  X.show(shelf, 3, { type: 'up', out: 4 });
  const bookCols = [C.blue, C.red, C.green, C.ochre, C.plum, C.teal, C.ink2];
  for (let i = 0; i < 21; i++) {
    const row = Math.floor(i / 7), col = i % 7;
    const bx = 688 + col * 90, by = 600 + row * 130 - 112;
    const b = X.g();
    X.rect(bx, by, 64, 112, { parent: b, fill: bookCols[(i * 3) % 7], stroke: C.ink, sw: 2, r: 5 });
    X.rect(bx + 6, by + 14, 52, 32, { parent: b, fill: C.card, stroke: 'none', r: 3 });
    X.text(bx + 32, by + 38, String(i + 1), { parent: b, size: 22, w: 700, anchor: 'middle', mono: true });
    X.show(b, 3, { f: 0.08 + i * 0.03, type: 'down', dist: 70, len: 0.45, out: 4 });
  }
  X.each(() => { const n = clamp(Math.floor((X.L(3, 0.08, 0.71)) * 21 + 0.001), 0, 21); cnt.set(String(X.t > X.at(3, 0.08) ? Math.max(1, n) : 0)); });
  X.term(3, 'Learning document', 'A short beginner guide to one topic, so\nanyone on the team can follow it.', { until: 4 });

  // ---------------- repository (cues 4-5) ----------------
  const repo = X.g();
  X.path('M640,580 L640,875 L1130,875 L1130,600 L840,600 L815,565 L660,565 Q640,565 640,580 Z', { parent: repo, color: C.ochre, sw: 5, fill: C.ochreL }).p.style.strokeDasharray = 'none';
  X.text(885, 740, 'Repository', { parent: repo, size: 40, w: 700, anchor: 'middle', serif: true });
  X.text(885, 785, 'one shared folder for code', { parent: repo, size: 24, anchor: 'middle', fill: C.ink2 });
  // main page with links
  X.rect(1300, 520, 300, 360, { parent: repo, fill: C.card, stroke: C.blue, sw: 3, r: 12, shadow: true });
  X.rect(1300, 520, 300, 54, { parent: repo, fill: C.blueL, stroke: C.blue, sw: 3, r: 12 });
  X.text(1450, 557, 'Main page', { parent: repo, size: 26, w: 700, anchor: 'middle', serif: true });
  const linkNames = ['results', 'experiments', 'learning docs'];
  linkNames.forEach((s, i) => {
    X.text(1330, 630 + i * 70, s, { parent: repo, size: 24, w: 600, fill: C.blue });
    X.line(1330, 638 + i * 70, 1330 + s.length * 13, 638 + i * 70, { parent: repo, color: C.blue, sw: 2 });
  });
  for (let i = 0; i < 4; i++) X.line(1330, 830 + (i % 2) * 22, 1560 - i * 30, 830 + (i % 2) * 22, { parent: repo, color: C.sand, sw: 8 });
  X.show(repo, 4, { type: 'up', out: 6 });
  linkNames.forEach((s, i) => {
    const a = X.arrow(1310, 625 + i * 70, 1140, 660 + i * 50, { color: C.blue, sw: 3, bend: 0.12, head: 14 });
    X.show(a, 4, { f: 0.55 + i * 0.1, type: 'draw', len: 0.6, out: 6 });
  });
  const files = X.stream(X.spline([[470, 730], [560, 600], [700, 640]]), {
    n: 4, speed: 0.45, k0: 4, f0: 0.1, k1: 6,
    make: (g) => { const e = E('g', null, g); E('rect', { x: -14, y: -18, width: 28, height: 36, rx: 3, fill: C.card, stroke: C.ink2, 'stroke-width': 2.5 }, e); E('line', { x1: -7, y1: -4, x2: 7, y2: -4, stroke: C.ink3, 'stroke-width': 2.5 }, e); E('line', { x1: -7, y1: 5, x2: 7, y2: 5, stroke: C.ink3, 'stroke-width': 2.5 }, e); return e; }
  });
  // saved versions, one after another
  const ver = X.g();
  X.line(660, 500, 1260, 500, { parent: ver, color: C.ink3, sw: 4 });
  X.text(660, 470, 'saved versions', { parent: ver, size: 22, w: 600, fill: C.ink2 });
  X.show(ver, 5, { type: 'fade', out: 6 });
  const vdots = [];
  for (let i = 0; i < 8; i++) {
    const g = X.g();
    const vx = 700 + i * 76;
    X.circle(vx, 500, 15, { parent: g, fill: i === 7 ? C.ochre : C.card, stroke: C.ink, sw: 3 });
    X.show(g, 5, { f: 0.04 + i * 0.07, type: 'pop', len: 0.4, out: 6 });
    vdots.push(vx);
  }
  const back = X.arrow(vdots[7], 478, vdots[2], 478, { color: C.plum, sw: 4, bend: -0.25 });
  X.show(back, 5, { f: 0.7, type: 'draw', len: 0.8, out: 6 });
  const ring = X.circle(vdots[2], 500, 24, { stroke: C.plum, sw: 4 });
  X.show(ring, 5, { f: 0.85, type: 'pop', out: 6 });
  X.term(4, 'Repository', 'A shared folder for code, kept online on GitHub,\nthat remembers every change ever made.', { until: 6 });

  // ---------------- milestones dropping onto the timeline (cues 6-10) ----------------
  const ROWY = { 1: 318, 2: 364, 3: 410 };
  const ms = [
    { k: 6, f: 0.05, h: 0.95, row: 3, txt: '00:57 · Research doc + first tests', col: C.blue },
    { k: 7, f: 0.03, h: 3.85, row: 2, txt: '03:51 · AI + immune layers', col: C.plum },
    { k: 7, f: 0.55, h: 5.43, row: 1, txt: '05:26 · Normaliser + bank lists', col: C.teal },
    { k: 8, f: 0.05, h: 17.45, row: 3, txt: '17:27 · Live website', col: C.green },
    { k: 9, f: 0.03, h: 18.15, h2: 20.17, row: 2, txt: '18:09 to 20:10 · Tour, 3D, ledger, gateway, red team, quantum', col: C.ochre },
    { k: 10, f: 0.05, h: 24.3, row: 1, txt: '17 Oct · The lead\'s own design goes live', col: C.red }
  ];
  ms.forEach(m => {
    const mx = xt(m.h), ry = ROWY[m.row];
    if (m.h2) {
      const span = X.rect(mx, TY - 8, xt(m.h2) - mx, 16, { fill: m.col, stroke: C.ink, sw: 2, r: 6 });
      X.show(span, m.k, { f: m.f + 0.05, type: 'grow' });
    }
    const pin = X.g();
    E('path', { d: `M${mx},${TY - 4} L${mx - 11},${TY - 26} A14,14 0 1,1 ${mx + 11},${TY - 26} Z`, fill: m.col, stroke: C.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, pin);
    E('circle', { cx: mx, cy: TY - 34, r: 5, fill: C.card }, pin);
    X.show(pin, m.k, { f: m.f, type: 'down', dist: 90, len: 0.6 });
    const lab = X.g();
    X.line(mx, TY + 14, mx, ry - 14, { parent: lab, color: m.col, sw: 2.5 });
    X.circle(mx, ry - 8, 6, { parent: lab, fill: m.col });
    X.text(mx + 14, ry, m.txt, { parent: lab, size: 24, w: 600, fill: C.ink });
    X.show(lab, m.k, { f: m.f + 0.08, type: 'fade' });
    // a ring that spreads out where the pin lands
    const rr = E('circle', { cx: mx, cy: TY, r: 10, fill: 'none', stroke: m.col, 'stroke-width': 3 }, X.g());
    X.each(t => {
      const u = clamp((t - X.at(m.k, m.f, 0.45)) / 0.9);
      rr.setAttribute('r', 10 + 40 * u);
      rr.style.opacity = u > 0 && u < 1 ? 1 - u : 0;
    });
  });
  // a darker bar that grows to the newest milestone
  const prog = E('rect', { x: x0, y: TY - 5, width: 0, height: 10, rx: 5, fill: C.ochre }, X.g());
  const progDot = E('circle', { cx: x0, cy: TY, r: 12, fill: C.ink, stroke: C.card, 'stroke-width': 3 }, X.g());
  X.each(t => {
    let x = x0;
    for (const m of ms) x = lerp(x, xt(m.h2 || m.h), ease(clamp((t - X.at(m.k, m.f)) / 0.8)));
    prog.setAttribute('width', x - x0);
    progDot.setAttribute('cx', x.toFixed(1));
    prog.style.opacity = progDot.style.opacity = t > X.at(6) ? 1 : 0;
  });

  // ---------------- stage pictures for each milestone ----------------
  // cue 6: research document -> first working version -> first tests on real logs
  const s6 = X.g();
  X.rect(570, 510, 190, 240, { parent: s6, fill: C.card, stroke: C.blue, sw: 3, r: 8, shadow: true });
  X.text(665, 552, 'Research', { parent: s6, size: 24, w: 700, anchor: 'middle', serif: true });
  const docLines = [];
  for (let i = 0; i < 6; i++) docLines.push(E('rect', { x: 592, y: 580 + i * 26, width: 0, height: 9, rx: 4, fill: C.ink3 }, s6));
  X.text(665, 805, 'Research document', { parent: s6, size: 26, w: 600, anchor: 'middle' });
  X.each(() => docLines.forEach((r, i) => r.setAttribute('width', (i === 5 ? 80 : 146) * ease(X.L(6, 0.05 + i * 0.05, 0.12 + i * 0.05)))));
  const a61 = X.arrow(790, 630, 920, 630, { color: C.ink2, parent: s6 });
  const g1 = X.icon('gear', 1035, 610, 1.15, { parent: s6, fill: C.blueL });
  const g2 = X.icon('gear', 1120, 680, 0.7, { parent: s6, fill: C.ochreL });
  X.spin(g1.mid, 1035, 610, { speed: 70 }); X.spin(g2.mid, 1120, 680, { speed: -110 });
  X.text(1060, 805, 'First working version', { parent: s6, size: 26, w: 600, anchor: 'middle' });
  const a62 = X.arrow(1200, 630, 1330, 630, { color: C.ink2, parent: s6 });
  X.rect(1360, 510, 400, 240, { parent: s6, fill: C.card, stroke: C.green, sw: 3, r: 10, shadow: true });
  const logClip = E('clipPath', { id: 'built-logclip' }, s6);
  E('rect', { x: 1370, y: 520, width: 380, height: 220 }, logClip);
  const logRows = X.g(s6); logRows.setAttribute('clip-path', 'url(#built-logclip)');
  const lr = rng(43);
  const rowEls = [];
  for (let i = 0; i < 10; i++) {
    const g = E('g', null, logRows);
    const w1 = 120 + lr() * 120;
    E('rect', { x: 1385, y: 0, width: w1, height: 10, rx: 4, fill: C.ink3 }, g);
    E('rect', { x: 1395 + w1, y: -2, width: 60, height: 14, rx: 4, fill: i % 3 === 0 ? C.redL : C.sand, stroke: i % 3 === 0 ? C.red : 'none', 'stroke-width': 2 }, g);
    E('circle', { cx: 1720, cy: 5, r: 10, fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, g);
    rowEls.push(g);
  }
  X.each(t => rowEls.forEach((g, i) => { const y = 530 + ((i * 24 - t * 30) % 240 + 240) % 240; g.setAttribute('transform', `translate(0 ${y.toFixed(1)})`); }));
  X.text(1560, 805, 'First tests on real logs', { parent: s6, size: 26, w: 600, anchor: 'middle' });
  X.show(s6, 6, { type: 'up', out: 7 });
  X.term(6, 'Test', 'A small check that the code gives\nthe right answer.', { until: 7 });

  // cue 7: the layers, one after another
  const s7 = X.g();
  const pipe = X.spline([[480, 740], [540, 650], [700, 650], [1800, 650]]);
  X.path(pipe.d, { parent: s7, color: C.sand, sw: 26 }).p.style.strokeDasharray = 'none';
  X.show(s7, 7, { type: 'fade', out: 8 });
  const stations = [
    ['brain', 'AI layer', C.plum, 0.03, 700],
    ['shield', 'Immune layer', C.teal, 0.2, 980],
    ['gear', 'Normaliser', C.blue, 0.55, 1260],
    ['db', 'Bank\'s own lists', C.ochre, 0.72, 1540]
  ];
  stations.forEach(([ic, name, col, f, sx]) => {
    const g = X.g();
    X.rect(sx - 105, 560, 210, 180, { parent: g, fill: C.card, stroke: col, sw: 4, r: 16, shadow: true });
    const icg = X.icon(ic, sx, 645, 0.8, { parent: g, color: col });
    if (ic === 'gear') X.spin(icg.mid, sx, 645, { speed: 60 }); else X.bob(icg.mid, { amp: 4, per: 1.8, ph: sx });
    X.text(sx, 790, name, { parent: g, size: 24, w: 700, anchor: 'middle' });
    X.show(g, 7, { f, type: 'pop', out: 8 });
  });
  const dots7 = X.g(s7);
  const dl = [];
  for (let i = 0; i < 9; i++) dl.push(E('circle', { r: 11, stroke: C.ink, 'stroke-width': 2 }, dots7));
  X.each(t => {
    let last = 480;
    for (const st of stations) if (t > X.at(7, st[3])) last = st[4] + 105;
    dl.forEach((d, i) => {
      const p = ((t * 0.12) + i / dl.length) % 1;
      const [x, y] = pipe.at(p);
      d.setAttribute('cx', x.toFixed(1)); d.setAttribute('cy', y.toFixed(1));
      d.setAttribute('fill', x > last && last > 480 ? C.green : C.red);
      d.style.opacity = Math.min(1, p / 0.05, (1 - p) / 0.05);
    });
  });
  X.term(7, 'AI layer · Immune layer', 'AI layer: a trained model that spots names.\nImmune layer: watches for strange data flows.', { until: 7, outf: 0.5 });
  X.term(7, 'Normaliser · bank lists', 'Normaliser: tidies text so numbers cannot hide.\nLists: the bank\'s own known values.', { f: 0.55, until: 8 });

  // cue 8: live website fed by the server
  const s8 = X.g();
  X.icon('server', 650, 640, 1.3, { parent: s8, led: C.green });
  X.text(650, 780, 'Server running\nthe real firewall', { parent: s8, size: 24, w: 600, anchor: 'middle', lh: 30 });
  X.rect(900, 480, 840, 400, { parent: s8, fill: C.card, stroke: C.ink2, sw: 3, r: 14, shadow: true });
  X.rect(900, 480, 840, 50, { parent: s8, fill: C.sand, stroke: C.ink2, sw: 3, r: 14 });
  [C.red, C.ochre, C.green].forEach((c, i) => X.circle(930 + i * 26, 505, 8, { parent: s8, fill: c }));
  X.rect(1020, 490, 480, 30, { parent: s8, fill: C.card, stroke: C.line, r: 15, sw: 2 });
  X.text(1040, 513, 'Aran console', { parent: s8, size: 22, fill: C.ink2 });
  const live = X.g(s8);
  X.rect(1600, 489, 110, 32, { parent: live, fill: C.redL, stroke: C.red, r: 16, sw: 2 });
  const liveDot = X.circle(1622, 505, 7, { parent: live, fill: C.red });
  X.text(1668, 514, 'LIVE', { parent: live, size: 22, w: 700, fill: C.red, anchor: 'middle' });
  X.each(t => { liveDot.style.opacity = (Math.sin(t * 6) > 0) ? 1 : 0.25; });
  const tiles8 = [['requests', 37], ['tokens made', 52], ['alerts', 0.6]];
  tiles8.forEach(([lab, rate], i) => {
    const tx = 930 + i * 265;
    X.rect(tx, 555, 245, 140, { parent: s8, fill: C.paper, stroke: C.line, r: 12 });
    X.text(tx + 20, 595, lab, { parent: s8, size: 22, fill: C.ink2 });
    const n = X.text(tx + 20, 665, '0', { parent: s8, size: 46, w: 700, mono: true, fill: [C.blue, C.green, C.red][i] });
    X.each(t => n.set(fmtUS(Math.max(0, (t - X.at(8, 0.1)) * rate))));
  });
  const bars8 = [];
  for (let i = 0; i < 14; i++) bars8.push(E('rect', { x: 940 + i * 55, y: 0, width: 36, height: 0, rx: 4, fill: i % 2 ? C.blueL : C.tealL, stroke: i % 2 ? C.blue : C.teal, 'stroke-width': 2 }, s8));
  X.each(t => bars8.forEach((b, i) => { const h = 40 + 60 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.8)); b.setAttribute('y', 860 - h); b.setAttribute('height', h); }));
  X.stream(X.spline([[730, 620], [820, 560], [900, 600]]), { parent: s8, n: 4, speed: 0.6, r: 9, colors: [C.blue, C.green, C.ochre] });
  X.show(s8, 8, { type: 'up', out: 9 });
  X.term(8, 'Live website', 'A real web page where every number is\nworked out by the real system, right now.', { until: 9 });

  // cue 9: six new features
  const feats = [
    ['laptop', 'Guided tour', '13 chapters', C.blue],
    ['cube', '3D scenes', 'turn and explore', C.plum],
    ['log', 'Leakage ledger', 'who could learn what', C.teal],
    ['chat', 'AI gateway', 'cleans AI requests', C.green],
    ['alert', 'Red teaming', 'friendly attacks', C.red],
    ['atom', 'Quantum safety', 'future-proof locks', C.ochre]
  ];
  feats.forEach(([ic, h, s, col], i) => {
    const r = Math.floor(i / 3), c = i % 3;
    const tx = 500 + c * 430, ty = 490 + r * 200;
    const g = X.g();
    X.rect(tx, ty, 400, 175, { parent: g, fill: C.card, stroke: col, sw: 3, r: 16, shadow: true });
    if (ic === 'cube') {
      const cube = E('path', { d: '', fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
      const V = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const d of [-1, 1]) V.push([a, b, d]);
      const Ed = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      const ccx = tx + 75, ccy = ty + 88;
      X.each(t => {
        const a = t * 0.9, b = 0.5;
        const P = V.map(([x, y, z]) => {
          const x1 = x * Math.cos(a) - z * Math.sin(a), z1 = x * Math.sin(a) + z * Math.cos(a);
          const y1 = y * Math.cos(b) - z1 * Math.sin(b);
          return [ccx + x1 * 30, ccy + y1 * 30];
        });
        cube.setAttribute('d', Ed.map(([p, q]) => `M${P[p][0].toFixed(1)},${P[p][1].toFixed(1)} L${P[q][0].toFixed(1)},${P[q][1].toFixed(1)}`).join(' '));
      });
    } else {
      const icg = X.icon(ic, tx + 75, ty + 88, 0.58, { parent: g, color: col });
      if (ic === 'atom') X.spin(icg.mid, tx + 75, ty + 88, { speed: 50 }); else X.bob(icg.mid, { amp: 4, per: 2, ph: i });
    }
    X.text(tx + 145, ty + 80, h, { parent: g, size: 28, w: 700, serif: true });
    X.text(tx + 145, ty + 120, s, { parent: g, size: 22, fill: C.ink2 });
    X.show(g, 9, { f: 0.03 + i * 0.13, type: 'pop', out: 10 });
  });
  X.term(9, 'Red teaming', 'Friendly attackers try hard to break the\nsystem, to find weak spots first.', { f: 0.4, until: 9, outf: 0.75 });
  X.term(9, 'Quantum safety', 'Locks that stay safe even against\nfuture quantum computers.', { f: 0.75, until: 10 });

  // cue 10: the lead's own design becomes the real website
  const s10 = X.g();
  X.rect(620, 480, 840, 400, { parent: s10, fill: C.card, stroke: C.ink2, sw: 3, r: 14, shadow: true });
  // old plain version
  X.rect(640, 500, 800, 50, { parent: s10, fill: C.sand, stroke: 'none', r: 8 });
  for (let i = 0; i < 3; i++) X.rect(660 + i * 260, 580, 240, 140, { parent: s10, fill: C.paper, stroke: C.line, r: 6, sw: 2, dash: '8 6' });
  for (let i = 0; i < 3; i++) X.rect(660, 750 + i * 36, 700 - i * 160, 16, { parent: s10, fill: C.sand, stroke: 'none', r: 6 });
  // new design, revealed by a wipe
  const wipe = E('clipPath', { id: 'built-wipe' }, s10);
  const wr = E('rect', { x: 620, y: 480, width: 0, height: 400 }, wipe);
  const nd = X.g(s10); nd.setAttribute('clip-path', 'url(#built-wipe)');
  X.rect(620, 480, 840, 400, { parent: nd, fill: C.paper, stroke: C.ink2, sw: 3, r: 14 });
  X.rect(620, 480, 840, 70, { parent: nd, fill: C.tealL, stroke: C.ink2, sw: 3, r: 14 });
  X.icon('shield', 668, 515, 0.38, { parent: nd, color: C.teal, check: true });
  X.text(705, 528, 'Aran', { parent: nd, size: 34, w: 700, serif: true, fill: C.teal });
  X.text(1430, 526, 'Tour   Demo   Results', { parent: nd, size: 22, w: 600, fill: C.ink2, anchor: 'end' });
  X.text(660, 610, 'A data firewall for banks', { parent: nd, size: 36, w: 700, serif: true });
  [[C.blueL, C.blue, 'lock'], [C.greenL, C.green, 'shield'], [C.ochreL, C.ochre, 'key']].forEach(([f, s, ic], i) => {
    X.rect(660 + i * 260, 650, 240, 200, { parent: nd, fill: f, stroke: s, r: 14, sw: 3 });
    X.icon(ic, 780 + i * 260, 740, 0.75, { parent: nd, color: s });
  });
  const edge = E('line', { x1: 0, y1: 482, x2: 0, y2: 878, stroke: C.ochre, 'stroke-width': 6 }, s10);
  X.each(() => {
    const p = ease(X.L(10, 0.15, 0.75));
    wr.setAttribute('width', 840 * p);
    edge.setAttribute('x1', 620 + 840 * p); edge.setAttribute('x2', 620 + 840 * p);
    edge.style.opacity = p > 0 && p < 1 ? 1 : 0;
  });
  X.text(1500, 640, 'The lead\'s own\ndesign became\nthe real website', { parent: s10, size: 28, w: 600, serif: true, lh: 38 });
  X.show(s10, 10, { type: 'up' });

  X.recap(11, ['Built in about 43 hours', 'Clear rules and 21 learning documents', 'Every result saved and linked']);
});
