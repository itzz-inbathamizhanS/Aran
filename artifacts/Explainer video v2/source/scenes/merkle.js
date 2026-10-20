// Proof that erasure happened: a Merkle tree of erasure records built bottom-up (real hashes from DATA.merkle),
// a secret edit rippling to the root in red, Ravi's receipt with the proof path, a wax-seal signature, and his phone checking it.
scene('merkle', X => {
  const D = window.DATA.merkle;
  const B = [2000, 0];
  X.cam([
    { x: B[0] + 800, y: 560, s: 1.1 },
    { k: 1, x: B[0] + 960, y: 540, s: 1, len: 1.4 },
    { k: 2, x: 960, y: 540, s: 1, len: 1.8 },
    { k: 6, x: 860, y: 520, s: 1.12, len: 1.2 },
    { k: 7, x: 960, y: 540, s: 1, len: 1.2 },
    { k: 9, x: 1400, y: 500, s: 1.2, len: 1.4 },
    { k: 10, x: B[0] + 960, y: 540, s: 1, len: 1.8 }
  ]);

  // ---------- region B: Ravi gets a receipt (cues 0-1, and the phone at cue 10) ----------
  const ravi = X.person(B[0] + 330, 880, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1.05 });
  X.show(ravi, 0, { type: 'up' });
  X.each(() => { ravi.mood(X.t > X.at(0, 0.6) && X.t < X.at(1) || X.t > X.at(10, 0.7) ? 'happy' : 'neutral'); X.arms(ravi, 8, X.t > X.at(10) ? 60 : -8); });
  const bank = X.g();
  X.icon('bank', B[0] + 1660, 400, 1.3, { parent: bank });
  X.text(B[0] + 1660, 520, 'Bank', { parent: bank, size: 30, anchor: 'middle', w: 700, fill: C.ink2 });
  X.show(bank, 0, { f: 0.05, type: 'pop', out: 2 });
  const rc = X.g(); const rcIn = X.g(rc);
  E('path', { d: 'M-120,-160 L120,-160 L120,150 L100,170 L80,150 L60,170 L40,150 L20,170 L0,150 L-20,170 L-40,150 L-60,170 L-80,150 L-100,170 L-120,150 Z', fill: C.card, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, rcIn);
  X.text(0, -112, 'Erasure receipt', { parent: rcIn, size: 26, anchor: 'middle', serif: true, w: 700 });
  for (let i = 0; i < 5; i++) E('line', { x1: -90, y1: -60 + i * 40, x2: i % 2 ? 50 : 90, y2: -60 + i * 40, stroke: C.line, 'stroke-width': 6, 'stroke-linecap': 'round' }, rcIn);
  X.show(rc, 0, { f: 0.3, type: 'fade', out: 2 });
  X.travel(rcIn, spline([[B[0] + 1660, 400], [B[0] + 1150, 260], [B[0] + 700, 480]]), 0, { f0: 0.3, f1: 0.75 });
  // cue 1: someone could secretly change the records
  const book = X.g();
  X.rect(B[0] + 900, 600, 520, 260, { parent: book, fill: C.plumL, stroke: C.plum, r: 14, sw: 3 });
  E('line', { x1: B[0] + 1160, y1: 600, x2: B[0] + 1160, y2: 860, stroke: C.plum, 'stroke-width': 4 }, book);
  X.text(B[0] + 1160, 640, 'erasure records', { parent: book, size: 26, anchor: 'middle', w: 700, fill: C.plum });
  for (let i = 0; i < 4; i++) for (const x of [B[0] + 930, B[0] + 1190]) E('line', { x1: x, y1: 690 + i * 42, x2: x + 200, y2: 690 + i * 42, stroke: C.line, 'stroke-width': 5, 'stroke-linecap': 'round' }, book);
  X.show(book, 1, { type: 'up', out: 2 });
  const sneak = X.person(B[0] + 1640, 880, { shirt: C.ochre, glasses: true, skin: C.skin[0], s: 0.9 });
  X.show(sneak, 1, { f: 0.1, type: 'left', out: 2 });
  X.each(() => { X.arms(sneak, lerp(8, 70, X.P(1, 0.2, 0, 0.6)), -8); });
  const q = X.chip(B[0] + 1300, 540, 'a secret change?', { size: 28, color: C.red, fill: C.redL });
  X.show(q, 1, { f: 0.25, type: 'pop', out: 2 });
  const mini = X.g();
  const mt = [[B[0] + 1160, 210], [B[0] + 1080, 290], [B[0] + 1240, 290], [B[0] + 1040, 370], [B[0] + 1120, 370], [B[0] + 1200, 370], [B[0] + 1280, 370]];
  [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]].forEach(([a, b]) => E('line', { x1: mt[a][0], y1: mt[a][1], x2: mt[b][0], y2: mt[b][1], stroke: C.green, 'stroke-width': 4 }, mini));
  mt.forEach(([x, y], i) => E('circle', { cx: x, cy: y, r: i ? 16 : 22, fill: i ? C.greenL : C.ochreL, stroke: C.ink, 'stroke-width': 3 }, mini));
  X.text(B[0] + 1310, 300, 'Merkle tree', { parent: mini, size: 40, serif: true, w: 700, fill: C.green });
  X.show(mini, 1, { f: 0.6, type: 'pop', out: 2 });
  X.term(1, 'Merkle tree', 'A tree of fingerprints: each one is made from the\ntwo below it, up to a single fingerprint at the top.', { f: 0.6, until: 2 });

  // ---------- region A: the tree (cues 2-9) ----------
  const LX = [250, 560, 870, 1180], LY = 610, NY = 440, RY = 270, RX = 715, NX = [405, 1025], CY = 790;
  const fingerprint = (p, x, y, s, col) => {
    const g = E('g', { transform: `translate(${x} ${y}) scale(${s})` }, p);
    for (let i = 0; i < 5; i++) E('path', { d: `M${-8 - i * 6},${10} A${8 + i * 6},${12 + i * 7} 0 0 1 ${8 + i * 6},${10}`, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    return g;
  };
  // edges
  const edge = (x1, y1, x2, y2, k, f) => { const e = X.path(`M${x1},${y1} L${x2},${y2}`, { color: C.line, sw: 4 }); X.show(e, k, { f, type: 'draw', len: 0.5 }); return e; };
  const eL = LX.map((x, i) => edge(x, LY - 36, NX[i >> 1], NY + 36, 3, 0.05 + 0.1 * (i >> 1)));
  const eN = NX.map((x, i) => edge(x, NY - 36, RX, RY + 36, 4, 0.1));
  const eR = LX.map((x, i) => edge(x, CY - 50, x, LY + 36, 2, 0.4 + i * 0.05));
  // records
  const recs = D.leaves.map((s, i) => {
    const g = X.g();
    const r = X.rect(LX[i] - 148, CY - 50, 296, 108, { parent: g, fill: C.card, r: 14, shadow: true });
    X.text(LX[i], CY - 12, 'record ' + (i + 1), { parent: g, size: 22, anchor: 'middle', fill: C.ink3, w: 600 });
    const tt = X.text(LX[i], CY + 30, s, { parent: g, size: 23, anchor: 'middle', w: 600 });
    X.show(g, 2, { f: 0.05 + i * 0.07, type: 'up' });
    return { g, r, tt };
  });
  // fingerprints float up from each record into the leaf boxes
  LX.forEach((x, i) => {
    const fpG = X.g(); const fpIn = X.g(fpG); fingerprint(fpIn, 0, 0, 1.4, C.teal);
    X.show(fpG, 2, { f: 0.35 + i * 0.05, type: 'fade', len: 0.2, out: 2, outf: 0.62 + i * 0.05, outLen: 0.2 });
    X.travel(fpIn, spline([[x, CY - 40], [x + 20, (CY + LY) / 2], [x, LY]]), 2, { f0: 0.35 + i * 0.05, f1: 0.6 + i * 0.05 });
  });
  const node = (x, y, label, k, f, w = 200) => {
    const g = X.g();
    const b = X.box(x - w / 2, y - 36, w, 72, { parent: g, label, mono: true, size: 32, fill: C.card });
    X.show(g, k, { f, type: 'pop' });
    return b;
  };
  const L = D.L.map((h, i) => node(LX[i], LY, h, 2, 0.6 + i * 0.05));
  const N = [node(NX[0], NY, D.n12, 3, 0.35), node(NX[1], NY, D.n34, 3, 0.5)];
  const ROOT = node(RX, RY, D.root, 4, 0.3, 240);
  X.term(2, 'Hash (fingerprint)', 'A short code worked out from any data.\nChange the data even slightly and the code changes.', { f: 0.4, until: 3 });
  // joining: two little copies fly up and merge
  const joinFly = (from, to, k, f, txt) => {
    const g = X.g(); const inn = X.g(g);
    X.chip(0, 0, txt, { parent: inn, size: 22, mono: true, color: C.teal, fill: C.tealL });
    X.show(g, k, { f, type: 'fade', len: 0.2, out: k, outf: f + 0.3, outLen: 0.2 });
    X.travel(inn, spline([from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 20], to]), k, { f0: f, f1: f + 0.28 });
  };
  [0, 1, 2, 3].forEach(i => joinFly([LX[i], LY - 40], [NX[i >> 1], NY], 3, 0.05 + (i >> 1) * 0.15, D.L[i]));
  joinFly([NX[0], NY - 40], [RX, RY], 4, 0.02, D.n12); joinFly([NX[1], NY - 40], [RX, RY], 4, 0.02, D.n34);
  const plus = X.g();
  X.text(NX[0], NY + 92, 'two joined, new fingerprint', { parent: plus, size: 22, anchor: 'middle', fill: C.ink2 });
  X.text(NX[1], NY + 92, 'two joined, new fingerprint', { parent: plus, size: 22, anchor: 'middle', fill: C.ink2 });
  X.show(plus, 3, { f: 0.6, type: 'fade', out: 4 });
  const rootL = X.text(RX, RY - 56, 'the root', { size: 32, serif: true, anchor: 'middle', w: 700, fill: C.ochre });
  X.show(rootL, 4, { f: 0.5, type: 'down' });
  X.term(4, 'Root', 'The single fingerprint at the top of the tree.\nIt depends on every record below it.', { f: 0.5, until: 5 });
  // the published root board on the right
  const board = X.g();
  X.rect(1380, 220, 470, 220, { parent: board, fill: C.card, r: 18, shadow: true });
  X.text(1410, 270, 'Root the bank published', { parent: board, size: 26, fill: C.ink2 });
  X.text(1615, 350, D.root, { parent: board, size: 54, anchor: 'middle', mono: true, w: 700, fill: C.green });
  X.text(1615, 410, 'a copy anyone can see', { parent: board, size: 22, anchor: 'middle', fill: C.ink3 });
  X.show(board, 4, { f: 0.65, type: 'left', out: 8 });
  const pubA = X.arrow(RX + 130, RY, 1370, 320, { color: C.green, bend: -0.1 });
  X.show(pubA, 4, { f: 0.65, type: 'draw', out: 5 });

  // ---------- tampering (cues 5-7) ----------
  const ins = X.person(1290, 930, { shirt: C.ochre, glasses: true, skin: C.skin[0], s: 0.72 });
  X.show(ins, 5, { type: 'left', out: 8 });
  X.each(() => { X.arms(ins, lerp(8, 80, X.P(5, 0.15, 0, 0.6)), -8); });
  const pen = X.g(); const penIn = X.g(pen);
  E('rect', { x: -9, y: -95, width: 18, height: 84, rx: 5, fill: C.ochre, stroke: C.ink, 'stroke-width': 2 }, penIn);
  E('path', { d: 'M-9,-11 L9,-11 L0,8 Z', fill: C.ink }, penIn);
  X.show(pen, 5, { f: 0.15, type: 'fade', out: 6 });
  X.each(t => {
    const p = ease(X.L(5, 0.15, 0.5));
    const x = lerp(1250, LX[2] + 40, p) + (p >= 1 ? 30 * Math.sin(t * 18) : 0), y = lerp(760, CY + 20, p);
    penIn.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(30)`);
  });
  const tam = () => X.t > X.at(5, 0.55) && X.t < X.at(8);
  const red = id => tam() && X.t > X.at(6, id);
  const editL = X.chip(LX[2], CY + 85, 'secretly edited', { size: 22, color: C.red, fill: C.redL });
  X.show(editL, 5, { f: 0.6, type: 'pop', out: 8 });
  const paint = (b, col, w) => { b.r.setAttribute('stroke', col); b.r.setAttribute('stroke-width', w); b.t.t.setAttribute('fill', col === C.line ? C.ink : col); };
  const proofPath = () => X.t > X.at(8, 0.15) && X.t < X.at(10);
  X.each(t => {
    const T = tam();
    recs[2].r.r.setAttribute('stroke', T ? C.red : C.line);
    recs[2].tt.set(T ? 'erase Asha / l0ans' : D.leaves[2]);
    recs[2].tt.t.setAttribute('fill', T ? C.red : C.ink);
    const rL = red(0.05), rN = red(0.35), rR = red(0.65);
    L[2].t.set(rL ? D.L3b : D.L[2]); N[1].t.set(rN ? D.n34b : D.n34); ROOT.t.set(rR ? D.rootb : D.root);
    // default look
    L.forEach(b => paint(b, C.line, 2)); N.forEach(b => paint(b, C.line, 2)); paint(ROOT, C.line, 2);
    [...eL, ...eN].forEach(e => e.p.setAttribute('stroke', C.line));
    if (rL) { paint(L[2], C.red, 4); eL[2].p.setAttribute('stroke', C.red); }
    if (rN) { paint(N[1], C.red, 4); eN[1].p.setAttribute('stroke', C.red); }
    if (rR) paint(ROOT, C.red, 5);
    if (proofPath()) {
      paint(L[0], C.green, 5); eL[0].p.setAttribute('stroke', C.green);
      if (X.t > X.at(8, 0.35)) { paint(L[1], C.ochre, 5); }
      if (X.t > X.at(8, 0.5)) { paint(N[0], C.green, 5); eN[0].p.setAttribute('stroke', C.green); eL[1].p.setAttribute('stroke', C.ochre); }
      if (X.t > X.at(8, 0.6)) { paint(N[1], C.ochre, 5); }
      if (X.t > X.at(8, 0.75)) { paint(ROOT, C.green, 5); eN[1].p.setAttribute('stroke', C.ochre); }
      recs[0].r.r.setAttribute('stroke', C.green); recs[0].r.r.setAttribute('stroke-width', 4);
    } else { recs[0].r.r.setAttribute('stroke', C.line); recs[0].r.r.setAttribute('stroke-width', 2); }
  });
  X.pulse(L[2], LX[2], LY, 6, { f: 0.05 });
  X.pulse(N[1], NX[1], NY, 6, { f: 0.35 });
  X.pulse(ROOT, RX, RY, [6, 8], { f: 0.65, amt: 0.15 });
  const steps = [['its fingerprint changes', LX[2], LY + 80, 0.08, 'middle'], ['so the one above changes', NX[1], NY + 80, 0.38, 'middle'], ['and so does the root', RX + 140, RY + 10, 0.68, 'start']];
  steps.forEach(([s, x, y, f, an]) => { const tx = X.text(x, y, s, { size: 24, w: 700, fill: C.red, anchor: an }); X.show(tx, 6, { f, type: 'left', out: 8 }); });
  // cue 7: compare with the published root
  const now = X.g();
  X.rect(1380, 470, 470, 200, { parent: now, fill: C.redL, stroke: C.red, r: 18 });
  X.text(1410, 515, 'Root right now', { parent: now, size: 26, fill: C.ink2 });
  X.text(1615, 595, D.rootb, { parent: now, size: 54, anchor: 'middle', mono: true, w: 700, fill: C.red });
  X.show(now, 7, { type: 'left', out: 8 });
  const neq = X.text(1615, 462, '≠', { size: 60, w: 700, anchor: 'middle', fill: C.red });
  X.show(neq, 7, { f: 0.2, type: 'pop', out: 8 });
  const spot = X.g();
  X.rect(1380, 700, 470, 90, { parent: spot, fill: C.red, stroke: C.red, r: 45 });
  X.icon('alert', 1440, 745, 0.4, { parent: spot, color: C.card, fill: C.red });
  X.text(1480, 757, 'cheating spotted', { parent: spot, size: 32, w: 700, fill: C.card });
  X.show(spot, 7, { f: 0.4, type: 'pop', out: 8 });
  X.each(() => ins.mood(X.t > X.at(7, 0.4) ? 'shock' : 'neutral'));

  // ---------- Ravi's receipt with the proof (cues 8-9) ----------
  const rcp = X.g();
  E('path', { d: 'M1360,190 L1860,190 L1860,800 L1840,820 L1820,800 L1800,820 L1780,800 L1760,820 L1740,800 L1720,820 L1700,800 L1680,820 L1660,800 L1640,820 L1620,800 L1600,820 L1580,800 L1560,820 L1540,800 L1520,820 L1500,800 L1480,820 L1460,800 L1440,820 L1420,800 L1400,820 L1380,800 L1360,820 Z', fill: C.card, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, rcp);
  X.text(1610, 250, 'Ravi\'s erasure receipt', { parent: rcp, size: 30, serif: true, anchor: 'middle', w: 700 });
  X.text(1395, 310, 'your record', { parent: rcp, size: 22, fill: C.ink3, w: 600 });
  X.text(1395, 348, D.leaves[0], { parent: rcp, size: 28, w: 600, fill: C.green });
  X.text(1395, 410, 'proof: the fingerprints you need', { parent: rcp, size: 22, fill: C.ink3, w: 600 });
  X.chip(1490, 456, D.L[1], { parent: rcp, size: 26, mono: true, color: C.ochre, fill: C.ochreL });
  X.chip(1680, 456, D.n34, { parent: rcp, size: 26, mono: true, color: C.ochre, fill: C.ochreL });
  X.text(1395, 530, 'root', { parent: rcp, size: 22, fill: C.ink3, w: 600 });
  X.text(1395, 574, D.root, { parent: rcp, size: 34, mono: true, w: 700, fill: C.green });
  X.show(rcp, 8, { f: 0.1, type: 'left' });
  X.term(8, 'Proof', 'The few fingerprints needed to rebuild the root\nfrom one record, showing it is in the tree.', { f: 0.4, until: 9 });
  const back = X.chip(RX, 150 + 0, 'records back to the truth', { size: 24, color: C.green, fill: C.greenL });
  X.show(back, 8, { type: 'pop', out: 8, outf: 0.5 });
  // the wax seal
  const seal = X.g(); const sealIn = X.g(seal);
  let sd = '';
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 66 : 74; sd += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1); }
  E('path', { d: sd + 'Z', fill: C.red, stroke: C.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, sealIn);
  E('circle', { r: 50, fill: 'none', stroke: C.redL, 'stroke-width': 3 }, sealIn);
  X.icon('bank', 0, 0, 0.5, { parent: sealIn, color: C.redL, fill: C.red, fill2: C.red });
  X.show(seal, 9, { f: 0.15, type: 'fade', len: 0.2 });
  X.each(() => {
    const p = X.L(9, 0.15, 0.32);
    const s = lerp(2.4, 1, easeOut(p)), r = lerp(-30, -12, p);
    sealIn.setAttribute('transform', `translate(1772 560) rotate(${r.toFixed(1)}) scale(${s.toFixed(3)})`);
  });
  const signed = X.text(1395, 680, 'signed by the bank', { size: 26, w: 700, fill: C.red });
  X.show(signed, 9, { f: 0.35, type: 'up' });
  const only = X.g();
  X.icon('lock', 1412, 718, 0.3, { parent: only, color: C.red });
  X.text(1440, 728, 'only the bank can make it', { parent: only, size: 24, w: 700, fill: C.red });
  X.show(only, 9, { f: 0.45, type: 'up' });
  const any = X.g();
  X.icon('magnifier', 1412, 765, 0.26, { parent: any, color: C.green });
  X.text(1440, 775, 'anyone can check it', { parent: any, size: 24, w: 700, fill: C.green });
  X.show(any, 9, { f: 0.62, type: 'up' });
  X.term(9, 'Digital signature', 'A mathematical seal: only the holder of a secret\nkey can make it, anyone can check it is genuine.', { f: 0.3, until: 10 });

  // ---------- Ravi's phone checks it (cue 10) ----------
  const ph = X.g();
  X.rect(B[0] + 760, 170, 470, 760, { parent: ph, fill: C.ink, stroke: C.ink, r: 48 });
  X.rect(B[0] + 785, 230, 420, 620, { parent: ph, fill: C.card, stroke: C.ink, r: 12 });
  E('circle', { cx: B[0] + 995, cy: 890, r: 14, fill: C.ink2 }, ph);
  X.text(B[0] + 995, 290, 'Checking receipt', { parent: ph, size: 30, serif: true, anchor: 'middle', w: 700 });
  X.show(ph, 10, { type: 'up' });
  const checks = ['rebuild root from my record', 'root matches ' + D.root, 'bank signature is genuine'];
  checks.forEach((s, i) => {
    const y = 380 + i * 110;
    const g = X.g();
    X.mark(B[0] + 830, y - 10, true, { parent: g, s: 22 });
    X.text(B[0] + 866, y, s, { parent: g, size: 24, w: 600 });
    X.show(g, 10, { f: 0.15 + i * 0.15, type: 'left' });
  });
  const bigT = X.mark(B[0] + 995, 740, true, { s: 70 });
  X.show(bigT, 10, { f: 0.65, type: 'pop' });
  const spin = X.g(); const spinIn = E('path', { d: `M${B[0] + 995},${670} a70,70 0 0,1 70,70`, fill: 'none', stroke: C.green, 'stroke-width': 8, 'stroke-linecap': 'round' }, spin);
  X.show(spin, 10, { f: 0.1, type: 'fade', out: 10, outf: 0.62, outLen: 0.2 });
  X.spin(spinIn, B[0] + 995, 740, { speed: 400 });
  const noTrust = X.chip(B[0] + 1500, 560, 'no need to trust anyone', { size: 28, color: C.green, fill: C.greenL });
  X.show(noTrust, 10, { f: 0.7, type: 'pop' });

  X.recap(11, ['A Merkle tree joins fingerprints up to one root', 'Any change to a record changes the root', 'Ravi\'s signed receipt proves his erasure']);
});
