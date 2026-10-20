// Finding data like a detective: clues with strengths, combined by Bayes' rule into one honest
// probability, compared with a threshold; calibration; false alarms 2,506 -> 60.
scene('detect', X => {
  X.cam([{ x: 960, y: 480, s: 1.08 }, { k: 1, x: 960, y: 520, s: 1 }, { k: 2, x: 760, y: 500, s: 1.1 },
    { k: 4, x: 960, y: 520, s: 1 }, { k: 5, x: 960, y: 540, s: 1 }, { k: 7, x: 960, y: 520, s: 1 },
    { k: 8, x: 1150, y: 520, s: 1.08 }, { k: 10, x: 960, y: 520, s: 1 }, { k: 11, x: 960, y: 540, s: 1 }]);
  const odds = p => p / (1 - p), prob = o => o / (1 + o);

  // ---------- Stage A: a stream of log lines with one suspicious number (cue 0) ----------
  const A = X.g();
  X.show(A, 0, { type: 'fade', out: 1, outLen: 0.6 });
  X.rect(250, 180, 1420, 560, { parent: A, fill: C.card, r: 16, shadow: true });
  E('rect', { x: 250, y: 180, width: 1420, height: 50, rx: 16, fill: C.sand }, A);
  E('rect', { x: 250, y: 214, width: 1420, height: 16, fill: C.sand }, A);
  X.text(280, 214, 'live log lines', { parent: A, size: 23, w: 700, fill: C.ink2 });
  const clip = E('clipPath', { id: 'detectClip' }, E('defs', null, A));
  E('rect', { x: 260, y: 236, width: 1400, height: 494 }, clip);
  const lg = X.g(A); lg.setAttribute('clip-path', 'url(#detectClip)');
  const scroll = X.g(lg);
  const L = window.DATA.log.map(r => r[1].slice(0, 78));
  const special = 'loan-svc INFO applicant id 2345 6789 0124 verified, kyc ok';
  const lines = [];
  for (let i = 0; i < 18; i++) lines.push(i === 12 ? special : L[i % L.length]);
  const hi = X.rect(270, 0, 1380, 40, { parent: scroll, fill: C.ochreL, stroke: C.ochre, r: 8 });
  hi.setAttribute('transform', 'translate(0 712)');
  lines.forEach((s, i) => X.text(285, 260 + i * 40, s, { parent: scroll, size: 22, mono: true, fill: i === 12 ? C.ink : C.ink2 }));
  X.each(() => {
    const p = ease(X.L(0, 0, 0.45));
    scroll.setAttribute('transform', `translate(0 ${(-260 * p).toFixed(1)})`);
    hi.r.style.opacity = X.t > X.at(0, 0.45) ? 1 : 0;
  });
  const q = X.chip(960, 790, 'Is 2345 6789 0124 an Aadhaar number?', { size: 30, color: C.ink, fill: C.ochreL, stroke: C.ochre, parent: A, shadow: true });
  X.show(q, 0, { f: 0.55, type: 'up' });
  const magA = X.icon('magnifier', 745, 490, 0.8, { parent: A });
  X.show(magA, 0, { f: 0.5, type: 'pop' });
  X.bob(magA.mid, { amp: 8, ampX: 30, per: 1.6 });

  // ---------- Stage B: the detective, clue board and balance (cues 1-4) ----------
  const B = X.g();
  X.show(B, 1, { type: 'fade', out: 5, outLen: 0.6 });
  const det = X.person(170, 880, { shirt: C.green, skin: C.skin[0], s: 1 });
  X.text(170, 575, 'Aran, the detective', { parent: B, size: 24, anchor: 'middle', w: 600, fill: C.ink2 });
  B.appendChild(det);
  E('path', { d: 'M-46,-226 L46,-226 L38,-236 L30,-262 Q0,-274 -30,-262 L-38,-236 Z', fill: C.ink2 }, det.body);
  const dmag = X.icon('magnifier', 274, 700, 0.5, { parent: B });
  X.each(t => { X.arms(det, 8, 110); dmag.mid.setAttribute('transform', `translate(0 ${(2.5 * Math.sin(t * 2.2)).toFixed(2)}) rotate(${(8 * Math.sin(t * 1.3)).toFixed(1)} 274 700)`); });
  X.talk(det, [2, 3, 4]);
  // board
  X.rect(340, 160, 760, 700, { parent: B, fill: C.ochreL, stroke: C.ochre, sw: 6, r: 12, shadow: true });
  const cand = X.g(B);
  X.rect(530, 200, 380, 90, { parent: cand, fill: C.card, r: 8, shadow: 4 });
  X.text(720, 258, '2345 6789 0124', { parent: cand, size: 36, mono: true, anchor: 'middle', w: 700 });
  E('circle', { cx: 720, cy: 208, r: 9, fill: C.red }, cand);
  const clues = [
    { x: 370, y: 380, t: ['Passes the', 'Verhoeff check'], w: 1.0 },
    { x: 740, y: 380, t: ['The word "Aadhaar"', 'just before it'], w: 0.75 },
    { x: 555, y: 600, t: ['Written in', 'groups of four'], w: 0.55 }
  ];
  clues.forEach((c, i) => {
    const g = X.g(B);
    const str = X.path(`M${c.x + 165},${c.y + 6} Q${(c.x + 165 + 720) / 2},${(c.y + 300) / 2 + 30} 720,295`, { parent: g, color: C.red, sw: 3 });
    X.rect(c.x, c.y, 330, 120, { parent: g, fill: C.card, r: 8, shadow: 4 });
    E('circle', { cx: c.x + 165, cy: c.y + 8, r: 9, fill: C.red }, g);
    X.text(c.x + 20, c.y + 46, 'Clue ' + (i + 1), { parent: g, size: 22, w: 700, fill: C.ochre });
    X.text(c.x + 20, c.y + 78, c.t[0], { parent: g, size: 24, w: 600 });
    X.text(c.x + 20, c.y + 106, c.t[1], { parent: g, size: 24, w: 600 });
    X.mark(c.x + 295, c.y + 40, true, { parent: g, s: 18 });
    X.show(g, 2 + i, { f: 0.1, type: 'pop' });
    X.show(str, 2 + i, { f: 0.3, type: 'draw' });
  });
  // clue 2 / 3 pictures
  const c2p = X.text(905, 545, 'Aadhaar: 2345 6789 0124', { parent: B, size: 22, mono: true, anchor: 'middle', fill: C.ink2 });
  X.show(c2p, 3, { f: 0.35, type: 'up' });
  // balance
  const bal = X.g(B);
  X.show(bal, 1, { f: 0.3, type: 'up' });
  const PX = 1480, PYv = 360, ARM = 220;
  E('rect', { x: PX - 8, y: PYv, width: 16, height: 470, fill: C.ink2 }, bal);
  E('path', { d: `M${PX - 110},850 L${PX + 110},850 L${PX + 70},826 L${PX - 70},826 Z`, fill: C.ink2 }, bal);
  const beam = E('g', null, bal);
  E('rect', { x: PX - ARM, y: PYv - 7, width: ARM * 2, height: 14, rx: 7, fill: C.ink }, beam);
  E('circle', { cx: PX, cy: PYv, r: 16, fill: C.ochre, stroke: C.ink, 'stroke-width': 4 }, bal);
  const pan = (col, colL, label) => {
    const g = E('g', null, bal);
    E('path', { d: 'M0,0 L-80,170 M0,0 L80,170', stroke: C.ink2, 'stroke-width': 3, fill: 'none' }, g);
    E('path', { d: 'M-100,170 L100,170 Q90,210 0,212 Q-90,210 -100,170 Z', fill: colL, stroke: col, 'stroke-width': 4 }, g);
    const t = E('text', { x: 0, y: 252, 'font-size': 24, 'font-weight': 700, fill: col, 'text-anchor': 'middle', 'font-family': F.sans }, g);
    t.textContent = label;
    return g;
  };
  const panL = pan(C.green, C.greenL, 'real Aadhaar'), panR = pan(C.ink3, C.card, 'random digits');
  const wts = clues.map((c, i) => {
    const g = E('g', null, panL);
    const w = [96, 74, 56][i], h = [64, 50, 40][i];
    const x = [-88, 10, -40][i], y = i === 2 ? 170 - 64 - h : 170 - h;
    E('rect', { x, y, width: w, height: h, rx: 6, fill: C.ochre, stroke: C.ink, 'stroke-width': 3 }, g);
    const tt = E('text', { x: x + w / 2, y: y + h / 2 + 9, 'font-size': 24, 'font-weight': 700, fill: C.card, 'text-anchor': 'middle', 'font-family': F.sans }, g);
    tt.textContent = String(i + 1);
    return g;
  });
  const wR = E('rect', { x: -22, y: 140, width: 44, height: 30, rx: 5, fill: C.sand, stroke: C.ink2, 'stroke-width': 3 }, panR);
  X.each(() => {
    const drops = [0, 1, 2].map(i => X.P(2 + i, 0.45, 0, 0.6));
    const ang = -(5 + 6 * drops[0] + 4 * drops[1] + 3 * drops[2]) + 5;
    const a = ang * Math.PI / 180;
    beam.setAttribute('transform', `rotate(${ang.toFixed(2)} ${PX} ${PYv})`);
    const lx = PX - ARM * Math.cos(a), ly = PYv - ARM * Math.sin(a), rx = PX + ARM * Math.cos(a), ry = PYv + ARM * Math.sin(a);
    panL.setAttribute('transform', `translate(${lx.toFixed(1)} ${ly.toFixed(1)})`);
    panR.setAttribute('transform', `translate(${rx.toFixed(1)} ${ry.toFixed(1)})`);
    wts.forEach((g, i) => { g.setAttribute('transform', `translate(0 ${(-260 * (1 - drops[i])).toFixed(1)})`); g.style.opacity = X.t > X.at(2 + i, 0.4) ? 1 : 0; });
  });
  X.term(2, 'Verhoeff check', 'The check-digit recipe used for Aadhaar numbers.\nEvery real Aadhaar number passes it.', { until: 3 });
  X.term(1, 'Clue', 'A small piece of evidence. One clue proves\nlittle; several together can be convincing.', { until: 2 });

  // ---------- Stage C: ten times more likely (cues 5-6) ----------
  const Cg = X.g();
  X.show(Cg, 5, { type: 'fade', out: 7, outLen: 0.6 });
  X.text(960, 200, 'Clue 1: does the number pass the check?', { parent: Cg, size: 34, anchor: 'middle', serif: true, w: 600 });
  const coinStack = (x, n, k, f0, label, sub, col) => {
    E('rect', { x: x - 150, y: 820, width: 300, height: 12, rx: 6, fill: C.line }, Cg);
    for (let i = 0; i < n; i++) {
      const g = X.g(Cg);
      E('ellipse', { cx: x, cy: 808 - i * 30 + 6, rx: 82, ry: 22, fill: C.ochre, stroke: C.ink, 'stroke-width': 3 }, g);
      E('ellipse', { cx: x, cy: 808 - i * 30, rx: 82, ry: 22, fill: C.ochreL, stroke: C.ink, 'stroke-width': 3 }, g);
      X.show(g, k, { f: f0 + i * 0.035, type: 'down', dist: 60, len: 0.4 });
    }
    X.text(x, 880, label, { parent: Cg, size: 28, anchor: 'middle', w: 700, fill: col });
    X.text(x, 915, sub, { parent: Cg, size: 22, anchor: 'middle', fill: C.ink2 });
  };
  coinStack(560, 10, 5, 0.2, 'real numbers', 'pass every time', C.green);
  coinStack(1360, 1, 5, 0.6, 'random digits', 'pass 1 time in 10', C.ink2);
  const ten = X.text(960, 560, '10×', { parent: Cg, size: 130, anchor: 'middle', serif: true, w: 700, fill: C.ochre });
  X.show(ten, 5, { f: 0.7, type: 'pop' });
  X.pulse(ten, 960, 520, 6, { f: 0.1, amt: 0.1 });
  X.text(960, 620, 'more likely, if the number is real', { parent: Cg, size: 26, anchor: 'middle', fill: C.ink2 }).style.opacity = 1;
  const lr = X.g(Cg);
  X.rect(700, 260, 520, 120, { parent: lr, fill: C.card, stroke: C.ochre, sw: 3, r: 16, shadow: true });
  X.text(960, 310, 'likelihood ratio', { parent: lr, size: 30, anchor: 'middle', serif: true, w: 700 });
  X.text(960, 356, '10 ÷ 1 = 10', { parent: lr, size: 30, anchor: 'middle', mono: true, w: 600, fill: C.ochre });
  X.show(lr, 6, { f: 0.15, type: 'down' });
  X.term(6, 'Likelihood ratio', 'How much more often a clue shows up when the\nvalue is real than when it is just random.', { until: 7 });

  // ---------- Stage D: Bayes' rule, the dial, the threshold (cues 7-9) ----------
  const Dg = X.g();
  X.show(Dg, 7, { type: 'fade', out: 10, outLen: 0.6 });
  const bx = X.g(Dg);
  X.rect(640, 380, 300, 170, { parent: bx, fill: C.plumL, stroke: C.plum, sw: 3, r: 20, shadow: true });
  X.text(790, 470, "Bayes' rule", { parent: bx, size: 36, anchor: 'middle', serif: true, w: 700, fill: C.plum });
  const bg1 = X.icon('gear', 700, 520, 0.3, { parent: bx }), bg2 = X.icon('gear', 880, 520, 0.3, { parent: bx, fill: C.ochreL });
  X.spin(bg1.mid, 700, 520, { speed: 90 }); X.spin(bg2.mid, 880, 520, { speed: -90 });
  const chips = ['Verhoeff: passes', 'word "Aadhaar"', 'groups of four'].map((s, i) => {
    const g = X.g(Dg);
    X.chip(0, 0, s, { size: 24, color: C.ochre, fill: C.card, parent: g, width: 270 });
    X.show(X.wrap(g), 7, { f: 0.05 + i * 0.05, type: 'fade' });
    const sp = spline([[300, 330 + i * 110], [520, 360 + i * 60], [700, 460]]);
    X.each(() => {
      const p = ease(X.L(7, 0.3 + i * 0.18, 0.5 + i * 0.18));
      const [x, y] = sp.at(p);
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 - 0.6 * p).toFixed(3)})`);
      g.style.opacity = p > 0.97 ? 0 : 1;
    });
    return g;
  });
  const arrD = X.arrow(950, 465, 1080, 520, { parent: Dg, sw: 5, color: C.plum });
  X.show(arrD, 7, { f: 0.85, type: 'draw' });
  // dial
  const GX = 1360, GY = 640, GR = 240;
  const arcD = `M${GX - GR},${GY} A${GR},${GR} 0 0 1 ${GX + GR},${GY}`;
  E('path', { d: arcD, fill: 'none', stroke: C.sand, 'stroke-width': 44 }, Dg);
  const fillA = E('path', { d: arcD, fill: 'none', stroke: C.teal, 'stroke-width': 44, pathLength: 1 }, Dg);
  fillA.style.strokeDasharray = 1;
  for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 - i / 10); E('line', { x1: GX + (GR + 26) * Math.cos(a), y1: GY - (GR + 26) * Math.sin(a), x2: GX + (GR + 38) * Math.cos(a), y2: GY - (GR + 38) * Math.sin(a), stroke: C.ink3, 'stroke-width': 3 }, Dg); }
  const needle = E('line', { x1: GX, y1: GY, x2: GX - GR + 40, y2: GY, stroke: C.ink, 'stroke-width': 9, 'stroke-linecap': 'round' }, Dg);
  E('circle', { cx: GX, cy: GY, r: 18, fill: C.ink }, Dg);
  const pv = X.text(GX, GY + 90, '', { parent: Dg, size: 70, anchor: 'middle', serif: true, w: 700 });
  X.text(GX, GY + 130, 'sure it is an Aadhaar', { parent: Dg, size: 26, anchor: 'middle', fill: C.ink2 });
  X.text(GX - GR - 10, GY + 40, '0%', { parent: Dg, size: 22, anchor: 'middle', fill: C.ink3 });
  X.text(GX + GR + 10, GY + 40, '100%', { parent: Dg, size: 22, anchor: 'middle', fill: C.ink3 });
  // threshold
  const TH = 0.8, ta = Math.PI * (1 - TH);
  const thr = X.g(Dg);
  E('line', { x1: GX + (GR - 50) * Math.cos(ta), y1: GY - (GR - 50) * Math.sin(ta), x2: GX + (GR + 60) * Math.cos(ta), y2: GY - (GR + 60) * Math.sin(ta), stroke: C.red, 'stroke-width': 6, 'stroke-dasharray': '10 6' }, thr);
  X.text(GX + (GR + 70) * Math.cos(ta), GY - (GR + 70) * Math.sin(ta) - 8, 'threshold', { parent: thr, size: 26, w: 700, fill: C.red });
  X.show(thr, 9, { f: 0.05, type: 'fade' });
  // the number, then protected
  const num = X.g(Dg);
  X.rect(600, 640, 380, 90, { parent: num, fill: C.card, r: 12, shadow: true });
  const numT = X.text(790, 698, '2345 6789 0124', { parent: num, size: 34, mono: true, anchor: 'middle', w: 700 });
  X.show(num, 7, { f: 0.1, type: 'up' });
  const prot = X.g(Dg);
  X.icon('lock', 1030, 690, 0.6, { parent: prot, fill: C.greenL });
  X.chip(790, 790, 'above the line: protected', { size: 26, color: C.green, fill: C.greenL, parent: prot });
  X.show(prot, 9, { f: 0.5, type: 'pop' });
  X.each(() => {
    // the probability: 1% start; each clue multiplies the odds (x10, x30, x10) -> 97%
    let o = odds(0.01);
    if (X.t >= X.at(8)) { const u = X.L(8, 0.05, 0.5) * 3; [10, 30, 10].forEach((m, i) => { o *= Math.pow(m, clamp(u - i)); }); }
    const p = prob(o);
    const a = Math.PI * (1 - p);
    needle.setAttribute('x2', GX + (GR - 40) * Math.cos(a)); needle.setAttribute('y2', GY - (GR - 40) * Math.sin(a));
    fillA.style.strokeDashoffset = 1 - p;
    pv.set(Math.round(p * 100) + '%');
    const above = X.t > X.at(9, 0.45);
    fillA.setAttribute('stroke', above ? C.green : C.teal);
    numT.t.setAttribute('fill', above ? C.green : C.ink);
  });
  X.term(7, "Bayes' rule", 'A rule from probability for combining many\nclues into one overall chance.', { until: 8 });
  X.term(8, 'Probability', 'How likely something is, from 0% (impossible)\nto 100% (certain).', { until: 9 });
  X.term(9, 'Threshold', 'A line chosen in advance: anything above it\ngets protected.', { until: 10 });

  // ---------- Stage E: calibration (cue 10) ----------
  const Eg = X.g();
  X.show(Eg, 10, { type: 'fade', out: 11, outLen: 0.6 });
  X.text(960, 200, 'When Aran says...', { parent: Eg, size: 34, anchor: 'middle', serif: true, w: 600 });
  [[0.5, 560], [0.7, 960], [0.9, 1360]].forEach(([pp, x], ci) => {
    const said = X.chip(x, 270, Math.round(pp * 100) + '% sure', { size: 30, color: C.ink, fill: C.ochreL, stroke: C.ochre, parent: Eg });
    X.show(said, 10, { f: 0.04 + ci * 0.06, type: 'down' });
    const dots = [];
    for (let i = 0; i < 10; i++) dots.push(E('circle', { cx: x - 100 + (i % 5) * 50, cy: 360 + Math.floor(i / 5) * 56, r: 19, fill: C.sand, stroke: C.line, 'stroke-width': 2 }, Eg));
    const res = X.text(x, 500, '', { parent: Eg, size: 28, anchor: 'middle', w: 700 });
    X.each(() => {
      const n = Math.floor(X.L(10, 0.12 + ci * 0.12, 0.45 + ci * 0.12) * 10.99);
      const right = Math.round(pp * 10);
      dots.forEach((d, i) => {
        const on = i < n, good = i < right;
        d.setAttribute('fill', !on ? C.sand : good ? C.green : C.redL);
        d.setAttribute('stroke', !on ? C.line : good ? C.green : C.red);
      });
      res.set(n >= 10 ? `right ${right} times in 10` : '');
      res.t.setAttribute('fill', C.green);
    });
  });
  const cl = X.g(Eg);
  X.icon('cloud', 520, 720, 0.8, { parent: cl });
  X.text(620, 712, 'Like a good weather forecast: "70% chance of rain"', { parent: cl, size: 28, w: 500 });
  X.text(620, 752, 'means rain on about 7 of 10 such days.', { parent: cl, size: 28, w: 500 });
  X.show(cl, 10, { f: 0.6, type: 'up' });
  X.term(10, 'Calibrated', 'Honest about how sure it is: when it says 90%,\nit is right about 90% of the time.', { f: 0.3, until: 11 });

  // ---------- Stage F: false alarms (cue 11) ----------
  const Fg = X.g();
  X.show(Fg, 11, { type: 'fade' });
  X.icon('log', 430, 250, 0.5, { parent: Fg });
  X.text(490, 262, 'Test: 16,000 real log lines', { parent: Fg, size: 34, serif: true, w: 600 });
  X.text(490, 300, 'false alarms = harmless numbers wrongly flagged', { parent: Fg, size: 24, fill: C.ink2 });
  X.text(560, 420, 'Pattern search', { parent: Fg, size: 30, anchor: 'end', w: 700 });
  X.text(560, 580, 'Aran', { parent: Fg, size: 30, anchor: 'end', w: 700 });
  const b1 = X.bar(590, 380, 1150, 60, 1, 11, { color: C.red, f0: 0.05, f1: 0.45, parent: Fg });
  const b2 = X.bar(590, 540, 1150, 60, 60 / 2506, 11, { color: C.green, f0: 0.45, f1: 0.7, parent: Fg });
  const v1 = X.text(1752, 422, '', { parent: Fg, size: 30, w: 700, fill: C.red });
  const v2 = X.text(640, 585, '', { parent: Fg, size: 34, w: 700, fill: C.green });
  X.count(v1, 0, 2506, 11, { f0: 0.05, f1: 0.45 });
  X.count(v2, 0, 60, 11, { f0: 0.45, f1: 0.7 });
  // little alarm bells for the false alarms
  for (let i = 0; i < 24; i++) {
    const a = X.icon('alert', 620 + (i % 12) * 92, 690 + Math.floor(i / 12) * 80, 0.32, { parent: Fg });
    X.show(a, 11, { f: 0.1 + i * 0.012, type: 'pop', out: 11, outf: 0.55 + i * 0.008 });
  }
  const fw = X.chip(960, 760, 'about 40 times fewer false alarms', { size: 32, color: C.green, fill: C.greenL, parent: Fg, shadow: true });
  X.show(fw, 11, { f: 0.75, type: 'pop' });
  X.term(11, 'False alarm', 'Flagging something as private when it is not:\nlike a smoke alarm going off for toast.', { until: 11, outf: 0.55 });
  X.term(11, 'Pattern search', 'Simply looking for the right shape, such as\nany twelve digits in a row.', { f: 0.62, until: 12 });

  X.recap(12, ['Aran gathers clues and weighs each one', 'They combine into one honest probability', 'Only values above the threshold are protected']);
});
