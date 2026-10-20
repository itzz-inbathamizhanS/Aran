// A leaked file names its leaker: the check proves no real number leaked, the token's mark points
// to the loan vendor, Theorem 2 bounds the error (3 in a billion), and tests traced 100%.
scene('trace', X => {
  X.cam([{ x: 960, y: 520, s: 1.1 }, { k: 1, x: 960, y: 540, s: 1, len: 1.6 }, { k: 3, x: 960, y: 540, s: 1 },
    { k: 5, x: 960, y: 530, s: 1.02 }, { k: 6, x: 960, y: 500, s: 1 }, { k: 7, f: 0.45, x: 960, y: 600, s: 1.02 },
    { k: 8, x: 960, y: 540, s: 1 }]);

  // ---------- Stage 1: the phone, the file, the check and the trace (cues 0-5) ----------
  const S1 = X.g();
  X.show(S1, 0, { type: 'fade', out: 6, outLen: 0.6 });
  // attacker selling the file
  const att = X.person(620, 860, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.95 });
  S1.appendChild(att);
  const attW = X.wrap(att);
  X.show(attW, 0, { f: 0.1, type: 'right', out: 1, outLen: 0.5 });
  X.each(() => { att.mood(X.t > X.at(0, 0.5) ? 'happy' : 'neutral'); X.arms(att, 8, 40 + 8 * Math.sin(X.t * 5)); });
  // the phone (moves to the corner at cue 1)
  const phW = X.g(S1);
  const ph = X.g(phW);
  X.rect(770, 180, 380, 680, { parent: ph, fill: C.ink, stroke: C.ink, r: 40, shadow: true });
  X.rect(790, 210, 340, 610, { parent: ph, fill: C.paper, stroke: C.paper, r: 22 });
  E('rect', { x: 790, y: 210, width: 340, height: 80, rx: 22, fill: C.blueL }, ph);
  E('rect', { x: 790, y: 260, width: 340, height: 30, fill: C.blueL }, ph);
  E('circle', { cx: 830, cy: 250, r: 22, fill: C.blue }, ph);
  X.text(866, 244, 'bulk_data_deals', { parent: ph, size: 23, w: 700 });
  X.text(866, 272, 'channel · 3,214 members', { parent: ph, size: 22, fill: C.ink2 });
  const msgs = [
    { y: 310, h: 76, lines: ['FOR SALE: bank', 'customer file'], fill: C.card, bold: true },
    { y: 400, h: 96, file: true },
    { y: 510, h: 76, lines: ['50,000 rows. Price on', 'request. DM now.'], fill: C.card },
    { y: 600, h: 76, lines: ['Sample: 5 rows', 'attached above'], fill: C.card }
  ];
  msgs.forEach((mm, i) => {
    const g = X.g(ph);
    X.rect(806, mm.y, 300, mm.h, { parent: g, fill: mm.file ? C.redL : mm.fill, stroke: mm.file ? C.red : C.line, r: 14 });
    if (mm.file) {
      X.icon('file', 846, mm.y + 48, 0.5, { parent: g, fill: C.card });
      X.text(880, mm.y + 42, 'customers.csv', { parent: g, size: 23, w: 700 });
      X.text(880, mm.y + 72, '2.1 MB', { parent: g, size: 22, fill: C.ink2 });
    } else mm.lines.forEach((l, j) => X.text(822, mm.y + 32 + j * 28, l, { parent: g, size: 22, w: mm.bold ? 700 : 500 }));
    X.show(g, 0, { f: 0.15 + i * 0.17, type: 'up', len: 0.5 });
  });
  const typing = X.g(ph);
  X.rect(806, 700, 110, 50, { parent: typing, fill: C.card, r: 25 });
  const tdots = [0, 1, 2].map(i => E('circle', { cx: 836 + i * 25, cy: 725, r: 7, fill: C.ink3 }, typing));
  X.each(t => tdots.forEach((d, i) => d.setAttribute('cy', 725 - 6 * Math.max(0, Math.sin(t * 7 - i)))));
  X.each(() => {
    const p = X.P(1, 0, 0, 1.1);
    const s = lerp(1, 0.6, p), cx = lerp(960, 250, p), cy = lerp(520, 380, p);
    ph.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${s.toFixed(3)}) translate(-960 -520)`);
  });
  const alarm = X.icon('alert', 1260, 330, 0.6, { parent: S1 });
  X.show(alarm, 0, { f: 0.55, type: 'pop', out: 1 });
  X.pulse(alarm.mid, 1260, 330, 0, { f: 0.7, amt: 0.2 });

  // the security officer
  const off = X.person(250, 905, { shirt: C.ink, skin: C.skin[0], badge: true, s: 0.9, name: 'Security team' });
  S1.appendChild(off);
  const offW = X.wrap(off);
  X.show(offW, 1, { f: 0.3, type: 'left' });
  X.point(off, 2, 75, { f: 0.05, until: 3 });
  X.each(() => { off.mood(X.t > X.at(2, 0.7) ? 'happy' : X.t > X.at(1, 0.4) ? 'neutral' : 'neutral'); });

  // the leaked file as a table
  const tb = X.g(S1);
  X.show(tb, 1, { f: 0.4, type: 'left' });
  X.rect(470, 190, 600, 600, { parent: tb, fill: C.card, r: 16, shadow: true });
  E('rect', { x: 470, y: 190, width: 600, height: 70, rx: 16, fill: C.redL }, tb);
  E('rect', { x: 470, y: 240, width: 600, height: 20, fill: C.redL }, tb);
  X.icon('file', 510, 226, 0.36, { parent: tb, fill: C.card });
  X.text(540, 236, 'customers.csv  (leaked)', { parent: tb, size: 26, w: 700 });
  X.text(500, 296, 'Aadhaar column', { parent: tb, size: 22, fill: C.ink3 });
  const rowY = i => 320 + i * 86;
  const rowsR = [];
  for (let i = 0; i < 5; i++) {
    const y = rowY(i);
    const g = X.g(tb);
    const r = X.rect(495, y, 450, 66, { parent: g, fill: C.paper, r: 10 });
    if (i === 0) X.text(720, y + 44, '0982 6158 6412', { parent: g, size: 32, mono: true, anchor: 'middle', w: 600 });
    else for (let j = 0; j < 3; j++) E('rect', { x: 540 + j * 130, y: y + 22, width: 100, height: 22, rx: 8, fill: C.sand }, g);
    const x = X.mark(1005, y + 33, false, { parent: tb, s: 22 });
    X.show(x, 2, { f: 0.08 + i * 0.07, type: 'pop' });
    rowsR.push(r);
  }
  // the check digit test badge
  const chk = X.chip(770, 820, 'check digit test: every row fails', { size: 26, color: C.red, fill: C.redL, parent: S1 });
  X.show(chk, 2, { f: 0.1, type: 'up', out: 3 });
  const safe = X.g(S1);
  X.rect(500, 790, 540, 76, { parent: safe, fill: C.greenL, stroke: C.green, r: 38 });
  X.icon('shield', 545, 828, 0.4, { parent: safe, fill: C.card, color: C.green, check: true });
  X.text(800, 840, 'No real number was exposed', { parent: safe, size: 30, anchor: 'middle', w: 700, fill: C.green });
  X.show(safe, 2, { f: 0.6, type: 'pop' });
  X.term(2, 'Check digit test', 'Real Aadhaar numbers always pass it.\nAran tokens are built to always fail it.', { until: 3 });

  // destinations column
  const dest = [['laptop', 'CRM'], ['building', 'Loan vendor'], ['log', 'Log platform'], ['chat', 'AI chatbot']];
  const dg = dest.map(([ic, nm], i) => {
    const y = 270 + i * 150;
    const g = X.g(S1);
    const hl = X.rect(1370, y - 62, 470, 124, { parent: g, fill: C.ochreL, stroke: C.ochre, sw: 3, r: 16 });
    hl.style.opacity = 0;
    const ico = X.icon(ic, 1440, y, 0.5, { parent: g });
    X.text(1500, y + 10, nm, { parent: g, size: 30, w: 600, serif: true });
    const q = X.text(1800, y + 14, '?', { parent: g, size: 44, w: 800, anchor: 'middle', fill: C.ochre });
    X.show(q, 3, { f: 0.3 + i * 0.1, type: 'pop', out: 4, outLen: 0.3 });
    X.show(g, 1, { f: 0.6 + i * 0.08, type: 'right' });
    return { g, hl, y, ico };
  });
  const more = X.text(1500, 880, '+ 36 more destinations', { parent: S1, size: 26, fill: C.ink2 });
  X.show(more, 1, { f: 0.95, type: 'up' });
  // magnifier scanning the rows (cue 3)
  const mag = X.g(S1);
  X.icon('magnifier', 0, 0, 0.7, { parent: mag });
  X.show(mag, 3, { f: 0.05, type: 'fade', out: 4, outf: 0.3 });
  X.each(() => {
    const u = X.L(3, 0.05, 0.9);
    const i = Math.min(4, Math.floor(u * 5)), ph2 = u * 5 - i;
    const x = lerp(560, 900, ph2), y = rowY(i) + 33;
    mag.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + 10 * Math.sin(ph2 * Math.PI)).toFixed(1)})`);
  });
  X.term(3, 'Trace', 'Working out where a leaked token came from,\nusing the mark it carries.', { until: 4 });
  // the beam to the loan vendor (cue 4)
  const beamSp = spline([[1075, 420], [1220, 360], [1370, 420]]);
  const beam = X.path(beamSp.d, { parent: S1, color: C.ochre, sw: 10 });
  X.show(beam, 4, { f: 0.1, type: 'draw', len: 0.8 });
  X.stream(beamSp, { n: 4, speed: 0.7, r: 9, color: C.ochre, k0: 4, f0: 0.3, k1: 6, parent: S1 });
  const vtag = X.text(1500, 452, 'tokens made only for it', { parent: S1, size: 22, fill: C.ochre, w: 600 });
  X.show(vtag, 4, { f: 0.45, type: 'up' });
  X.each(t => {
    const on = X.t > X.at(4, 0.3);
    dg.forEach((d, i) => {
      d.hl.style.opacity = on && i === 1 ? 1 : 0;
      d.g.style.opacity = on && i !== 1 ? 0.35 : '';
    });
    more.style.opacity = on ? 0.35 : '';
    for (let i = 0; i < 5; i++) rowsR[i].r.setAttribute('fill', on ? C.ochreL : C.paper);
  });
  X.pulse(dg[1].ico.mid, 1440, 420, 4, { f: 0.35, amt: 0.25 });
  // the stamp on the file (cue 5)
  const stamp = X.g(S1);
  const st = X.g(stamp);
  X.rect(560, 470, 420, 110, { parent: st, fill: C.card, stroke: C.ochre, sw: 5, r: 10 });
  X.text(770, 515, 'SOURCE', { parent: st, size: 26, anchor: 'middle', w: 800, fill: C.ochre, ls: 4 });
  X.text(770, 560, 'the loan vendor', { parent: st, size: 36, anchor: 'middle', w: 700, serif: true, fill: C.ink });
  st.setAttribute('transform', 'rotate(-7 770 525)');
  X.show(stamp, 5, { f: 0.05, type: 'pop', len: 0.5 });

  // ---------- Stage 2: Theorem 2 (cues 6-7) ----------
  const T = X.g();
  X.show(T, 6, { type: 'down', out: 8, outLen: 0.5 });
  X.rect(500, 200, 920, 130, { parent: T, fill: C.card, stroke: C.ink2, r: 18, shadow: true });
  X.text(960, 262, 'Theorem 2', { parent: T, size: 50, anchor: 'middle', serif: true, w: 700 });
  X.text(960, 308, 'a guarantee proved with maths, not just tested', { parent: T, size: 24, anchor: 'middle', fill: C.ink2 });
  const sealG = X.g(T);
  const sr = X.circle(560, 265, 46, { parent: sealG, fill: C.ochreL, stroke: C.ochre, sw: 4, dash: '8 6' });
  X.spin(sr.c, 560, 265, { speed: 30 });
  X.mark(560, 265, true, { parent: sealG, s: 26 });
  [['Theorem 1: a token always fails the check', C.ink3], ['Theorem 2: a leaked file points to its source', C.ochre]].forEach(([str, col], i) => {
    const c = X.chip(960, 420 + i * 80, str, { size: 28, color: i ? C.ink : C.ink3, fill: i ? C.ochreL : C.card, stroke: col, parent: T });
    X.show(c, 6, { f: 0.3 + i * 0.25, type: 'up', out: 7, outLen: 0.4 });
  });
  X.term(6, 'Theorem', 'A statement proved true by careful reasoning,\nso it holds every time, not just in tests.', { until: 7 });
  // three tiles
  const tiles = X.g();
  X.show(tiles, 7, { type: 'fade', out: 8, outLen: 0.5 });
  const tileXs = [560, 960, 1360];
  const tileT = [['customers', C.blue], ['destinations', C.plum], ['leaked tokens', C.red]];
  const tileVal = [];
  tileXs.forEach((x, i) => {
    const g = X.g(tiles);
    X.rect(x - 175, 360, 350, 210, { parent: g, fill: C.card, r: 16, shadow: true });
    tileVal.push(X.text(x, 430, '', { parent: g, size: 50, anchor: 'middle', serif: true, w: 700, fill: tileT[i][1] }));
    X.text(x, 470, tileT[i][0], { parent: g, size: 26, anchor: 'middle', fill: C.ink2 });
    X.show(g, 7, { f: 0.02 + i * 0.1, type: 'up' });
  });
  X.count(tileVal[0], 0, 50000000, 7, { f0: 0.02, f1: 0.2 });
  X.count(tileVal[1], 0, 40, 7, { f0: 0.12, f1: 0.25 });
  X.count(tileVal[2], 0, 5, 7, { f0: 0.22, f1: 0.3 });
  // small pictures inside the tiles
  for (let i = 0; i < 12; i++) {
    const p = X.icon('person', 420 + i * 25, 530, 0.2, { parent: tiles, fill: C.blueL });
    X.show(p, 7, { f: 0.05 + i * 0.01, type: 'pop' });
  }
  for (let i = 0; i < 40; i++) {
    const r = X.rect(830 + (i % 10) * 26, 498 + Math.floor(i / 10) * 17, 20, 12, { parent: tiles, fill: C.plumL, stroke: C.plum, sw: 1.5, r: 3 });
    X.show(r, 7, { f: 0.13 + i * 0.003, type: 'pop', len: 0.3 });
  }
  for (let i = 0; i < 5; i++) {
    const c = X.rect(1236 + i * 52, 510, 42, 32, { parent: tiles, fill: C.redL, stroke: C.red, sw: 2, r: 6 });
    X.show(c, 7, { f: 0.23 + i * 0.02, type: 'pop' });
  }
  // the billion grid
  const bg = X.g();
  X.show(bg, 7, { f: 0.42, type: 'up', out: 8, outLen: 0.5 });
  const defs = E('defs', null, bg);
  const pat = E('pattern', { id: 'traceBillion', patternUnits: 'userSpaceOnUse', x: 960, y: 765, width: 40, height: 40 }, defs);
  const pr = E('rect', { x: 0, y: 0, width: 32, height: 32, rx: 4, fill: C.tealL, stroke: C.teal, 'stroke-width': 1 }, pat);
  E('rect', { x: 556, y: 631, width: 808, height: 280, rx: 18, fill: C.shadow }, bg);
  E('rect', { x: 550, y: 625, width: 808, height: 280, rx: 18, fill: C.card, stroke: C.line, 'stroke-width': 2 }, bg);
  E('rect', { x: 566, y: 641, width: 776, height: 248, fill: 'url(#traceBillion)' }, bg);
  const reds = [[700, 700], [1120, 670], [905, 830]].map(([x, y]) => {
    const r = E('rect', { x, y, width: 32, height: 32, fill: C.red }, bg);
    const ring = E('circle', { cx: x, cy: y, r: 22, fill: 'none', stroke: C.red, 'stroke-width': 4 }, bg);
    return { r, ring, x, y };
  });
  const capT = X.text(960, 612, '', { size: 30, anchor: 'middle', w: 700 });
  X.show(capT, 7, { f: 0.42, type: 'up', out: 8, outLen: 0.5 });
  const res = X.g();
  X.rect(1380, 660, 420, 220, { parent: res, fill: C.ochreL, stroke: C.ochre, r: 18, shadow: true });
  X.text(1590, 720, 'wrong place:', { parent: res, size: 28, anchor: 'middle', fill: C.ink2 });
  X.text(1590, 780, 'at most 3', { parent: res, size: 48, anchor: 'middle', serif: true, w: 700, fill: C.red });
  X.text(1590, 832, 'in a billion', { parent: res, size: 34, anchor: 'middle', serif: true, w: 600 });
  X.show(res, 7, { f: 0.62, type: 'left', out: 8, outLen: 0.5 });
  X.each(() => {
    const z = 3 * ease(X.L(7, 0.48, 0.92));   // zoom out by 10^z per side
    const W = 40 / Math.pow(10, z / 1.15);
    pat.setAttribute('width', W); pat.setAttribute('height', W);
    pr.setAttribute('width', W * 0.8); pr.setAttribute('height', W * 0.8); pr.setAttribute('rx', W * 0.1);
    pr.setAttribute('stroke-width', W > 6 ? 1 : 0);
    // shown tiles, as a count growing towards a billion
    const n = Math.min(1e9, Math.pow(10, 2.2 + 6.8 * ease(X.L(7, 0.48, 0.92))));
    capT.set(n >= 1e9 ? 'one billion tiles: 3 are red' : fmtUS(n) + ' tiles');
    reds.forEach(d => {
      const w = Math.max(3, W * 0.8);
      const x = d.x, y = d.y;
      d.r.setAttribute('x', x); d.r.setAttribute('y', y); d.r.setAttribute('width', w); d.r.setAttribute('height', w);
      d.ring.setAttribute('cx', x + w / 2); d.ring.setAttribute('cy', y + w / 2);
      d.ring.setAttribute('r', Math.max(14, w * 0.9));
      d.ring.style.opacity = W < 20 ? 1 : 0;
    });
  });

  // ---------- Stage 3: tests, 100 percent (cue 8) ----------
  const H = X.g();
  X.show(H, 8, { f: 0.1, type: 'up' });
  X.text(960, 210, 'In testing', { parent: H, size: 44, anchor: 'middle', serif: true, w: 700 });
  const ring = X.path('M960,390 A170,170 0 1,1 959.9,390', { parent: H, color: C.green, sw: 34 });
  E('circle', { cx: 960, cy: 560, r: 170, fill: 'none', stroke: C.greenL, 'stroke-width': 34 }, H).parentNode.insertBefore(H.lastChild, ring);
  X.show(ring, 8, { f: 0.2, type: 'draw', len: 2 });
  const pct = X.text(960, 585, '0%', { parent: H, size: 80, anchor: 'middle', serif: true, w: 700, fill: C.green });
  X.count(pct, 0, 100, 8, { f0: 0.2, f1: 0.55, post: '%' });
  X.text(960, 890, 'of leaked files traced to the right destination', { parent: H, size: 30, anchor: 'middle', w: 600 });
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4;
    const x = 960 + 400 * Math.cos(a), y = 560 + 235 * Math.sin(a);
    const g = X.g(H);
    X.icon('file', x, y, 0.4, { parent: g, fill: C.card });
    X.mark(x + 26, y + 18, true, { parent: g, s: 16 });
    X.show(g, 8, { f: 0.25 + i * 0.06, type: 'pop' });
  }

  X.recap(9, ['A failed check: no real number leaked', "The token's mark shows who leaked it", 'Wrong at most 3 times in a billion; 100% in tests']);
});
