// Disguises and typos: one Aadhaar in many disguises, the normaliser as a wiper on a foggy window,
// typo repair trying every one-digit fix against the bank's customer fingerprints, and a red team's 26 tricks.
scene('normaliser', X => {
  const R = { a: [0, 0], win: [2000, 0], map: [4000, 0], bars: [4000, 1100], typo: [2000, 1100], red: [0, 1100] };
  const cx = r => R[r][0] + 960, cy = r => R[r][1] + 540;
  X.cam([
    { x: 960, y: 400, s: 1.3 },
    { k: 1, x: 960, y: 540, s: 1, len: 1.5 },
    { k: 4, x: cx('win'), y: cy('win'), s: 1, len: 1.8 },
    { k: 5, x: cx('map'), y: cy('map'), s: 1, len: 1.8 },
    { k: 6, x: cx('bars'), y: cy('bars'), s: 1, len: 1.8 },
    { k: 7, x: 2965, y: 1100 + 420, s: 1.13, len: 1.8 },
    { k: 8, x: cx('typo'), y: cy('typo'), s: 1, len: 1.4 },
    { k: 9, x: 3060, y: 1100 + 580, s: 1.12, len: 1.4 },
    { k: 10, x: cx('typo'), y: cy('typo'), s: 1, len: 1.4 },
    { k: 11, x: cx('red'), y: cy('red'), s: 1, len: 1.8 }
  ]);
  const PLAIN = '2345 6789 0124';
  const dis = [
    ['Tamil digits', '௨௩௪௫ ௬௭௮௯ ௦௧௨௪', 1, 0.08, 24, false],
    ['Hindi digits', '२३४५ ६७८९ ०१२४', 1, 0.28, 34, false],
    ['dots', '2345.6789.0124', 1, 0.55, 34, true],
    ['spaces', '2 3 4 5 6 7 8 9 0 1 2 4', 1, 0.75, 26, true],
    ['split into pieces', '2345 … 6789 … 0124', 2, 0.05, 30, true],
    ['web codes', '%32%33%34%35%36%37\n%38%39%30%31%32%34', 2, 0.3, 24, true],
    ['base64', 'MjM0NTY3ODkwMTI0', 2, 0.62, 32, true]
  ];
  // ---------- region a: the number and its disguises (cues 0-3) ----------
  const top = X.g();
  X.rect(560, 190, 800, 200, { parent: top, fill: C.card, r: 22, shadow: true });
  X.text(600, 236, 'Ravi\'s Aadhaar, as it appears in a message', { parent: top, size: 24, fill: C.ink2 });
  const topT = X.text(960, 330, PLAIN, { parent: top, size: 60, anchor: 'middle', mono: true, w: 600 });
  X.show(top, 0, { type: 'up' });
  const det = X.g(); const detS = X.g(det);
  const detI = X.icon('magnifier', 1500, 290, 0.9, { parent: detS, color: C.ink });
  X.text(1500, 380, 'detector', { parent: detS, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(det, 0, { f: 0.1, type: 'left' });
  X.bob(detI.mid, { amp: 6, per: 1.6 });
  const okM = X.mark(1590, 230, true, { s: 26 }), noM = X.mark(1590, 230, false, { s: 26 });
  X.each(t => {
    // which text the top card shows: plain -> each disguise as it is named -> plain again after the normaliser
    let s = PLAIN, col = C.ink, sz = 60;
    if (t > X.at(0, 0.5)) { s = dis[0][1]; }
    dis.forEach(d => { if (t > X.at(d[2], d[3])) { s = d[1].replace('\n', ''); } });
    if (t > X.at(3, 0.62)) { s = PLAIN; col = C.green; }
    if (s.length > 20) sz = 34; else if (s.length > 15) sz = 48;
    topT.set(s); topT.t.setAttribute('fill', col); topT.t.setAttribute('font-size', sz);
    const hidden = t > X.at(0, 0.5) && t < X.at(3, 0.62);
    okM.style.opacity = !hidden && t > X.at(0, 0.2) ? 1 : 0;
    noM.style.opacity = hidden ? 1 : 0;
  });
  X.shake(detS, 0, { f: 0.55, amp: 10 });
  const hideL = X.chip(960, 440, 'hidden: the detector misses it', { size: 26, color: C.red, fill: C.redL });
  X.show(hideL, 0, { f: 0.55, type: 'pop', out: 1, outf: 0.3 });
  // the disguise cards
  const machC = [960, 660];
  const cards = dis.map(([lab, str, k, f, sz, mono], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 115 + col * 430 + (row ? 215 : 0), y = 480 + row * 210;
    const w = X.g(); const inner = X.g(w);
    X.rect(x, y, 400, 180, { parent: inner, fill: C.card, r: 16, shadow: 5 });
    E('rect', { x, y, width: 400, height: 48, rx: 16, fill: C.ochreL }, inner);
    E('rect', { x, y: y + 30, width: 400, height: 18, fill: C.ochreL }, inner);
    X.text(x + 22, y + 34, lab, { parent: inner, size: 24, w: 700, fill: C.ochre });
    const lines = str.split('\n').length;
    X.text(x + 200, y + 125 - (lines - 1) * 16, str, { parent: inner, size: sz, anchor: 'middle', mono: mono, w: 600, lh: sz * 1.25 });
    X.show(w, k, { f, type: 'pop', out: 3, outf: 0.55, outLen: 0.3 });
    return { inner, cx: x + 200, cy: y + 90, i };
  });
  X.each(() => cards.forEach(c => {
    const p = ease(X.L(3, 0.12 + c.i * 0.03, 0.45 + c.i * 0.03));
    const tx = (machC[0] - c.cx) * p, ty = (machC[1] - c.cy) * p, s = 1 - 0.8 * p;
    c.inner.setAttribute('transform', `translate(${(c.cx + tx).toFixed(1)} ${(c.cy + ty).toFixed(1)}) scale(${s.toFixed(3)}) translate(${-c.cx} ${-c.cy})`);
  }));
  X.term(2, 'Base64', 'A way of writing any data using only letters,\ndigits and a few symbols. Easy to undo.', { f: 0.6, until: 3 });
  X.term(2, 'Web codes', 'Characters written as % and a number,\nthe way web addresses carry them.', { f: 0.3, until: 2, outf: 0.6 });
  // the normaliser machine
  const mach = X.g();
  E('path', { d: 'M700,520 L1220,520 L1100,620 L820,620 Z', fill: C.tealL, stroke: C.teal, 'stroke-width': 4, 'stroke-linejoin': 'round' }, mach);
  X.rect(780, 620, 360, 180, { parent: mach, fill: C.teal, stroke: C.teal, r: 18 });
  X.text(960, 680, 'Normaliser', { parent: mach, size: 38, serif: true, anchor: 'middle', w: 600, fill: C.card });
  const mg = X.icon('gear', 960, 745, 0.6, { parent: mach, fill: C.tealL, color: C.card });
  X.spin(mg.mid, 960, 745, { speed: 90 });
  const lights = [];
  for (let i = 0; i < 12; i++) lights.push(X.circle(745 + i * 39, 840, 13, { parent: mach, fill: C.sand, stroke: C.teal, sw: 2 }));
  X.text(960, 892, '12 kinds of disguise undone', { parent: mach, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(mach, 3, { type: 'pop', out: 4 });
  X.each(() => { const n = Math.floor(X.L(3, 0.2, 0.75) * 12.99); lights.forEach((l, i) => { l.c.setAttribute('fill', i < n ? C.green : C.sand); }); });
  const outA = X.arrow(1140, 600, 1300, 400, { color: C.green, bend: 0.2 });
  X.show(outA, 3, { f: 0.55, type: 'draw', out: 4 });
  X.term(3, 'Normaliser', 'A cleaner that turns every disguised number back\ninto plain digits, before anything else looks at it.', { f: 0.1, until: 4 });

  // ---------- region win: wiping the fog (cue 4) ----------
  const [wx, wy] = R.win;
  const winG = X.g();
  X.rect(wx + 420, wy + 190, 1080, 620, { parent: winG, fill: C.ink2, stroke: C.ink, r: 18 });
  X.rect(wx + 450, wy + 220, 1020, 560, { parent: winG, fill: C.blueL, stroke: C.ink, r: 6, sw: 3 });
  E('line', { x1: wx + 960, y1: wy + 220, x2: wx + 960, y2: wy + 780, stroke: C.ink, 'stroke-width': 10 }, winG);
  // the sign behind the glass
  X.rect(wx + 560, wy + 400, 800, 200, { parent: winG, fill: C.card, stroke: C.ink, r: 14, sw: 4 });
  X.text(wx + 960, wy + 470, 'Aadhaar', { parent: winG, size: 30, anchor: 'middle', fill: C.ink2, serif: true });
  X.text(wx + 960, wy + 545, PLAIN, { parent: winG, size: 60, anchor: 'middle', mono: true, w: 700 });
  const clip = E('clipPath', { id: 'normFogClip' }, winG); E('rect', { x: wx + 450, y: wy + 220, width: 1020, height: 560 }, clip);
  const fogG = E('g', { 'clip-path': 'url(#normFogClip)' }, winG);
  const fog = [];
  const fr = rng(31);
  for (let i = 0; i < 70; i++) {
    const x = wx + 470 + fr() * 980, y = wy + 240 + fr() * 520;
    fog.push({ c: E('circle', { cx: x, cy: y, r: 60 + fr() * 50, fill: C.paper, opacity: 0.85 }, fogG), x, y });
  }
  E('rect', { x: wx + 420, y: wy + 810, width: 1080, height: 26, rx: 6, fill: C.ink2 }, winG);
  X.show(winG, 4, { type: 'fade' });
  const wiper = X.g(); const wIn = X.g(wiper);
  X.rect(-30, -90, 60, 180, { parent: wIn, fill: C.ochre, stroke: C.ink, r: 14, sw: 3 });
  E('rect', { x: -10, y: -130, width: 20, height: 50, rx: 6, fill: C.ink2 }, wIn);
  X.show(wiper, 4, { f: 0.08, type: 'fade' });
  const wP = t => {
    const p = X.L(4, 0.12, 0.85);
    return [wx + 440 + p * 1040, wy + 500 + 200 * Math.sin(p * Math.PI * 6)];
  };
  X.each(t => {
    const [x, y] = wP(t);
    wIn.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(12 * Math.sin(t * 6)).toFixed(1)})`);
    const p = X.L(4, 0.12, 0.85);
    fog.forEach(f => { const passed = clamp((x - f.x + 60) / 120); f.c.setAttribute('opacity', (0.85 * (1 - passed)).toFixed(2)); });
    wiper.style.display = p >= 1 && t > X.at(4, 0.9) ? 'none' : '';
  });
  const wl = X.text(wx + 960, wy + 880, 'wipe first, then read', { size: 32, anchor: 'middle', fill: C.ink2, w: 600 });
  X.show(wl, 4, { f: 0.7, type: 'up' });

  // ---------- region map: remembering where each character came from (cue 5) ----------
  const [mx, my] = R.map;
  const mt = X.text(mx + 960, my + 220, 'Every clean digit remembers its place', { size: 40, serif: true, anchor: 'middle', w: 600 });
  X.show(mt, 5, { type: 'down' });
  const origG = X.g();
  X.text(mx + 200, my + 360, 'Original', { parent: origG, size: 26, fill: C.ink2, w: 700 });
  X.text(mx + 200, my + 420, 'Pay to', { parent: origG, size: 40 });
  const orig = X.digits(mx + 990, my + 368, '௨௩௪௫௬௭௮௯௦௧௨௪', { parent: origG, groups: [4, 4, 4], cw: 56, ch: 78, size: 38, gap: 6, groupGap: 22, fill: C.ochreL });
  X.text(orig.x0 + orig.total + 24, my + 420, 'today', { parent: origG, size: 40 });
  X.show(origG, 5, { f: 0.05, type: 'up' });
  const cleanG = X.g();
  X.text(mx + 200, my + 660, 'Cleaned', { parent: cleanG, size: 26, fill: C.ink2, w: 700 });
  X.text(mx + 200, my + 720, 'Pay to', { parent: cleanG, size: 40 });
  const clean = X.digits(mx + 990, my + 668, '234567890124', { parent: cleanG, groups: [4, 4, 4], cw: 56, ch: 78, size: 38, gap: 6, groupGap: 22 });
  X.text(clean.x0 + clean.total + 24, my + 720, 'today', { parent: cleanG, size: 40 });
  X.show(cleanG, 5, { f: 0.15, type: 'up' });
  for (let i = 0; i < 12; i++) {
    const a = orig.cells[i], b = clean.cells[i];
    const ln = X.path(`M${a.cx},${a.y + a.h + 6} L${b.cx},${b.y - 6}`, { color: C.teal, sw: 3 });
    X.show(ln, 5, { f: 0.2 + i * 0.02, type: 'draw', len: 0.4 });
  }
  const found = X.chip(clean.x0 + clean.total / 2, my + 800, 'found: an Aadhaar', { size: 26, color: C.red, fill: C.redL });
  X.show(found, 5, { f: 0.45, type: 'pop' });
  const tokT = X.chip(orig.x0 + orig.total / 2, my + 300, 'replaced in the original with a token', { size: 26, color: C.green, fill: C.greenL });
  X.show(tokT, 5, { f: 0.7, type: 'pop' });
  X.each(t => {
    const rep = t > X.at(5, 0.7);
    orig.set(rep ? '249826846187' : '௨௩௪௫௬௭௮௯௦௧௨௪');
    for (let i = 0; i < 12; i++) orig.paint(i, rep ? C.greenL : C.ochreL, rep ? C.green : C.line, rep ? C.green : C.ink);
  });

  // ---------- region bars: 8.3% -> 100% (cue 6) ----------
  const [bx, by] = R.bars;
  const bt = X.text(bx + 960, by + 230, 'Hidden numbers caught', { size: 44, serif: true, anchor: 'middle', w: 600 });
  X.show(bt, 6, { type: 'down' });
  const rowB = (y, lab, val, col, f, n) => {
    const g = X.g();
    X.text(bx + 200, y, lab, { parent: g, size: 32, w: 600 });
    X.bar(bx + 200, y + 24, 1220, 70, val, 6, { color: col, f0: f, f1: f + 0.3, parent: g });
    const v = X.text(bx + 1720, y + 76, '', { parent: g, size: 56, w: 700, anchor: 'end', fill: col });
    X.count(v, 0, val * 1000, 6, { f0: f, f1: f + 0.3, fmt: q => (q / 10).toFixed(q >= 999.5 ? 0 : 1) + '%' });
    // twelve little hidden numbers: how many were caught
    for (let i = 0; i < 12; i++) {
      const c = X.circle(bx + 215 + i * 50, y + 150, 16, { parent: g, fill: C.sand, stroke: C.line });
      X.each(() => { const on = X.t > X.at(6, f + 0.3) && i < n; c.c.setAttribute('fill', on ? col : C.sand); });
    }
    X.show(g, 6, { f: f - 0.05, type: 'fade' });
  };
  rowB(by + 340, 'Without the normaliser', 0.083, C.red, 0.1, 1);
  rowB(by + 600, 'With the normaliser and the bank\'s lists', 1.0, C.green, 0.5, 12);

  // ---------- region typo: one wrong digit (cues 7-10) ----------
  const [tx, ty] = R.typo;
  const clerk = X.person(tx + 190, ty + 560, { shirt: C.plum, skin: C.skin[2], long: true, s: 0.85, ph: 0.4 });
  X.show(clerk, 7, { type: 'right' });
  X.talk(clerk, [7]);
  X.each(() => { if (X.t > X.at(7)) X.arms(clerk, 8, 50 + 8 * Math.sin(X.t * 14)); else X.arms(clerk, 8, -8); clerk.mood(X.t > X.at(7, 0.3) && X.t < X.at(9) ? 'sad' : 'neutral'); });
  const kb = X.icon('laptop', tx + 330, ty + 520, 0.8);
  X.show(kb, 7, { type: 'pop' });
  const TYPO = '234567880124';
  const r1 = X.g();
  X.text(tx + 480, ty + 228, 'typed by the clerk', { parent: r1, size: 26, fill: C.ink2 });
  const typ = X.digits(tx + 480, ty + 250, TYPO, { parent: r1, anchor: 'start', groups: [4, 4, 4], cw: 54, ch: 76, size: 38, gap: 5, groupGap: 20 });
  typ.paint(7, C.redL, C.red, C.red);
  X.show(r1, 7, { f: 0.05, type: 'left' });
  const r2 = X.g();
  X.text(tx + 480, ty + 388, 'one of Aran\'s tokens', { parent: r2, size: 26, fill: C.ink2 });
  X.digits(tx + 480, ty + 410, '249826846187', { parent: r2, anchor: 'start', groups: [4, 4, 4], cw: 54, ch: 76, size: 38, gap: 5, groupGap: 20, fill: C.tealL });
  X.show(r2, 7, { f: 0.35, type: 'left' });
  const endX = tx + 480 + typ.total;
  const x1 = X.mark(endX + 60, ty + 288, false, { s: 28 }); X.show(x1, 7, { f: 0.25, type: 'pop' });
  const x2 = X.mark(endX + 60, ty + 448, false, { s: 28 }); X.show(x2, 7, { f: 0.45, type: 'pop', out: 10, outf: 0.3 });
  const fails = X.text(endX + 110, ty + 300, 'fails the check', { size: 28, fill: C.red, w: 600 });
  X.show(fails, 7, { f: 0.28, type: 'up' });
  const fails2 = X.text(endX + 110, ty + 460, 'fails the check too', { size: 28, fill: C.red, w: 600 });
  X.show(fails2, 7, { f: 0.48, type: 'up', out: 10, outf: 0.3 });
  const aran = X.g();
  const aI = X.icon('shield', tx + 1740, ty + 340, 0.9, { parent: aran, color: C.teal });
  X.text(tx + 1740, ty + 430, 'Aran', { parent: aran, size: 28, anchor: 'middle', w: 700, fill: C.teal });
  const aq = X.text(tx + 1740, ty + 250, '?', { parent: aran, size: 60, w: 800, anchor: 'middle', fill: C.red });
  X.show(aran, 7, { f: 0.6, type: 'pop' });
  X.each(() => { aq.style.opacity = X.t < X.at(8) ? 1 : 0; });
  X.term(7, 'Typo', 'A typing mistake, like pressing 8\ninstead of 9.', { f: 0.1, until: 8 });
  // candidates
  const HS = '9694b4787122a30f73582c972dbf67c82421ec728072ebb47e22f7fdcc896278246beff1ee96f739d2533fc500285cd759da72b82ebe8b6eeec0ddb359e04c28e264dc272fba304650d97504c1701557f8b6d665b2ab3fb430f97492dabbc007564d1fbec25cdd8ad6d27ad356a165c1562b15f9a05d4ee16e4568f79d30e6219daa1e727b8356be6583fc53a019133a03405e5e5743732364ae698286bce1b4ec57c321233fc4c8f931755acfb2008163a730c3ee70de1cfc3603086ed4bb9565eafcca179bbb3c4435df29053e901a1f011158d44d11e60c29c6980abe9c92af665d30f912c9b32b3968af90d0ed70b62e9c46919b980ecf8372af94522b1d4717217e875bcd63bcc89bb796a46293324c13de35b96ac68ebf77744607eae31b5ed6d25488b99937ba83645b8a2d67147eb40e247aed13362fe4f352e4a2c472bb84be1f0b41bf11920f923b208951bd36125d82ae53a0862f3dd22d7b37a67d33f3421cff4ab487651537b9363eff723202e56d59b18f72dc3ae7b008de95fc589c76a9e0c355da474b2ca8d55a24a9915ae389b630cfcab5bf29a531cefcd93dbc6ecb0bd413aaddfe5b3e18cc070a4f3717d188f2806a717bd0f1dbd0c7107296375ad8fc257990247794f5befcf2ce1bcf873dd1e20526c7b3';
  const cand = [];
  for (let i = 0; i < 12; i++) for (let d = 0; d < 10; d++) if (String(d) !== TYPO[i]) cand.push([TYPO.slice(0, i) + d + TYPO.slice(i + 1), [i]]);
  for (let i = 0; i < 11; i++) cand.push([TYPO.slice(0, i) + TYPO[i + 1] + TYPO[i] + TYPO.slice(i + 2), [i, i + 1]]);
  const MATCH = 71; // index of 234567890124
  const fan = X.g();
  X.rect(tx + 440, ty + 540, 860, 380, { parent: fan, fill: C.card, r: 18, shadow: true });
  X.text(tx + 470, ty + 585, 'every one-digit fix, every neighbour swap', { parent: fan, size: 26, fill: C.ink2 });
  const tried = X.text(tx + 1270, ty + 585, '', { parent: fan, size: 26, anchor: 'end', w: 700, fill: C.ochre });
  X.show(fan, 8, { type: 'up' });
  const rowsC = [];
  for (let r = -2; r <= 2; r++) {
    const t = E('text', { x: tx + 520, 'font-size': 36, 'font-weight': 600, 'font-family': F.mono, fill: C.ink }, fan);
    const sp = []; for (let i = 0; i < 12; i++) { const s = E('tspan', null, t); sp.push(s); }
    const hx = E('text', { x: tx + 1010, 'font-size': 28, 'font-family': F.mono, fill: C.ink3 }, fan);
    const mk = E('text', { x: tx + 1230, 'font-size': 34, 'font-weight': 700, 'font-family': F.sans, 'text-anchor': 'middle' }, fan);
    rowsC.push({ r, t, sp, hx, mk });
  }
  const hl = E('rect', { x: tx + 470, y: ty + 730, width: 800, height: 60, rx: 10, fill: 'none', stroke: C.ochre, 'stroke-width': 3 }, fan);
  fan.insertBefore(hl, rowsC[0].t);
  const qOf = () => {
    if (X.t < X.at(9)) return X.L(8, 0.15, 0.97) * (MATCH - 0.4);
    return lerp(MATCH - 0.4, MATCH, X.P(9, 0, 0, 0.6));
  };
  X.each(() => {
    const q = qOf(), base = Math.round(q);
    const matched = X.t > X.at(9, 0.12);
    rowsC.forEach(rw => {
      const idx = base + rw.r, o = idx - q;
      const y = ty + 770 + o * 58;
      const vis = idx >= 0 && idx < cand.length && Math.abs(o) <= 2.2;
      rw.t.style.display = rw.hx.style.display = rw.mk.style.display = vis ? '' : 'none';
      if (!vis) return;
      const [s, ch] = cand[idx];
      rw.t.setAttribute('y', y); rw.hx.setAttribute('y', y); rw.mk.setAttribute('y', y + 2);
      const isM = idx === MATCH && matched;
      rw.sp.forEach((sp, i) => { if (sp.textContent !== s[i]) sp.textContent = s[i]; sp.setAttribute('fill', isM ? C.green : ch.includes(i) ? C.ochre : C.ink); });
      rw.hx.textContent = HS.slice(idx * 8, idx * 8 + 8) + '…';
      rw.hx.setAttribute('fill', isM ? C.green : C.ink3);
      const done = idx < q - 0.5 || isM;
      rw.mk.textContent = !done ? '' : (isM ? '✓' : '✗');
      rw.mk.setAttribute('fill', isM ? C.green : C.red);
      const op = clamp(1 - Math.abs(o) * 0.3);
      rw.t.style.opacity = rw.hx.style.opacity = rw.mk.style.opacity = op;
    });
    hl.setAttribute('stroke', matched ? C.green : C.ochre);
    hl.setAttribute('fill', matched ? C.greenL : 'none');
    tried.set(`tried ${Math.min(cand.length, Math.round(q) + 1)} of ${cand.length}`);
  });
  // the fingerprint store
  const fpG = X.g();
  const dbI = X.icon('db', tx + 1560, ty + 700, 1.1, { parent: fpG, color: C.blue });
  X.text(tx + 1560, ty + 800, 'customer', { parent: fpG, size: 26, anchor: 'middle', fill: C.ink2 });
  X.text(tx + 1560, ty + 832, 'fingerprints', { parent: fpG, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(fpG, 8, { f: 0.2, type: 'left' });
  X.stream(spline([[tx + 1300, ty + 744], [tx + 1400, ty + 730], [tx + 1490, ty + 710]]), { n: 3, speed: 0.9, r: 7, color: C.ochre, k0: 8, f0: 0.2, k1: 9, f1: 0.1 });
  X.term(8, 'Fingerprint', 'A short code worked out from a number (a hash).\nThe bank can compare fingerprints without the numbers.', { f: 0.55, until: 9 });
  const fpM = X.chip(tx + 1560, ty + 580, '4607eae3… matches', { size: 26, color: C.green, fill: C.greenL, mono: true });
  X.show(fpM, 9, { f: 0.15, type: 'pop' });
  X.pulse(dbI.mid, tx + 1560, ty + 700, 9, { f: 0.15, amt: 0.15 });
  const big = X.g();
  X.rect(tx + 1380, ty + 860, 380, 64, { parent: big, fill: C.green, stroke: C.green, r: 32 });
  const bigT = X.text(tx + 1570, ty + 904, '', { parent: big, size: 32, anchor: 'middle', w: 700, fill: C.card });
  X.count(bigT, 0, 992, 9, { f0: 0.4, f1: 0.8, fmt: q => (q / 10).toFixed(1) + '% caught' });
  X.show(big, 9, { f: 0.35, type: 'pop' });
  X.each(() => { typ.set(X.t > X.at(9, 0.2) ? '234567890124' : TYPO); typ.paint(7, X.t > X.at(9, 0.2) ? C.greenL : C.redL, X.t > X.at(9, 0.2) ? C.green : C.red, X.t > X.at(9, 0.2) ? C.green : C.red); x1.style.display = X.t > X.at(9, 0.2) ? 'none' : ''; });
  const okTyp = X.mark(endX + 60, ty + 288, true, { s: 28 }); X.show(okTyp, 9, { f: 0.22, type: 'pop' });
  X.each(() => { fails.set(X.t > X.at(9, 0.22) ? 'a real customer: caught' : 'fails the check'); fails.t.setAttribute('fill', X.t > X.at(9, 0.22) ? C.green : C.red); });
  // cue 10: tokens are recognised and left alone
  const tokOk = X.g();
  X.rect(endX + 20, ty + 402, 400, 90, { parent: tokOk, fill: C.tealL, stroke: C.teal, r: 45 });
  X.icon('shield', endX + 70, ty + 445, 0.42, { parent: tokOk, color: C.teal, check: true });
  X.text(endX + 115, ty + 438, 'Aran\'s own token:', { parent: tokOk, size: 26, w: 700, fill: C.teal });
  X.text(endX + 115, ty + 472, 'never "repaired"', { parent: tokOk, size: 26, fill: C.ink2 });
  X.show(tokOk, 10, { f: 0.3, type: 'pop' });
  X.pulse(aI.mid, tx + 1740, ty + 340, 10, { f: 0.4 });

  // ---------- region red: 26 tricks (cue 11) ----------
  const [rx, ry] = R.red;
  const att = X.person(rx + 200, ry + 860, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.95 });
  X.show(att, 11, { type: 'right' });
  X.each(() => { if (X.t > X.at(11)) { const ph = (X.t * 2.2) % 1; X.arms(att, 8, ph < 0.5 ? lerp(20, 140, ph * 2) : lerp(140, 20, (ph - 0.5) * 2)); } else X.arms(att, 8, -8); att.mood(X.t > X.at(11, 0.75) ? 'sad' : 'neutral'); });
  const rt = X.text(rx + 1080, ry + 220, 'Red team: 26 hiding tricks', { size: 42, serif: true, anchor: 'middle', w: 600 });
  X.show(rt, 11, { type: 'down' });
  const OPEN = [5, 12, 19, 24];
  const trick = [];
  for (let i = 0; i < 26; i++) {
    const c = i % 9, r = Math.floor(i / 9);
    const x = rx + 520 + c * 140, y = ry + 300 + r * 165;
    const w = X.g();
    const rr = X.rect(x, y, 120, 140, { parent: w, fill: C.redL, stroke: C.red, r: 12, shadow: 4 });
    const qq = X.text(x + 60, y + 88, '?', { parent: w, size: 52, w: 800, anchor: 'middle', fill: C.red });
    X.show(w, 11, { f: 0.03 + i * 0.012, type: 'pop', len: 0.4 });
    trick.push({ rr, qq, open: OPEN.includes(i), i });
  }
  // a card flying from the attacker each beat
  const flyC = X.g(); const fIn = X.g(flyC);
  X.rect(-30, -36, 60, 72, { parent: fIn, fill: C.redL, stroke: C.red, r: 8 });
  X.show(flyC, 11, { type: 'fade', out: 11, outf: 0.35 });
  X.each(t => {
    const ph = (t * 2.2) % 1;
    const i = Math.floor(t * 2.2) % 26;
    const tgt = [rx + 580 + (i % 9) * 140, ry + 370 + Math.floor(i / 9) * 165];
    const x = lerp(rx + 260, tgt[0], ph), y = lerp(ry + 620, tgt[1], ph) - Math.sin(ph * Math.PI) * 120;
    fIn.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ph * 360).toFixed(0)})`);
  });
  const cnt = X.text(rx + 1080, ry + 870, '', { size: 40, anchor: 'middle', w: 700, fill: C.green });
  X.each(() => {
    const p = X.L(11, 0.4, 0.85);
    let n = 0;
    trick.forEach((tr, j) => {
      const order = j - OPEN.filter(o => o < j).length; // the 22 caught ones turn in order
      const on = !tr.open && p * 22 > order;
      if (on) n++;
      const flag = tr.open && X.t > X.at(11, 0.88);
      tr.rr.r.setAttribute('fill', on ? C.greenL : flag ? C.ochreL : C.redL);
      tr.rr.r.setAttribute('stroke', on ? C.green : flag ? C.ochre : C.red);
      tr.qq.set(on ? '✓' : '?');
      tr.qq.t.setAttribute('fill', on ? C.green : flag ? C.ochre : C.red);
    });
    cnt.set(X.t > X.at(11, 0.4) ? `${n} of 26 fully caught` : '');
  });
  const sh = X.icon('shield', rx + 800, ry + 855, 0.55, { color: C.teal, check: true });
  X.show(sh, 11, { f: 0.4, type: 'pop' });
  X.bob(sh.mid, { amp: 4, per: 2 });
  X.term(11, 'Red teaming', 'Attacking your own system on purpose, the way\na real attacker would, to find the weak spots.', { f: 0.4, until: 12 });

  X.recap(12, ['The normaliser wipes away disguises', 'Typo repair catches mistyped real numbers', 'Red teaming tests Aran like an attacker would']);
});
