// What is truly new: a "seen before" shelf and a "new" shelf; each new piece is placed as it is
// spoken, then all pieces snap together into one shield.
scene('novelty', X => {
  X.cam([
    { x: 960, y: 470, s: 1.2 },
    { k: 0, f: 0.5, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 1, x: 560, y: 520, s: 1.2 },
    { k: 2, x: 760, y: 540, s: 1.05 },
    { k: 3, x: 1000, y: 540, s: 1 },
    { k: 6, x: 1180, y: 590, s: 1.08 },
    { k: 7, f: 0.6, x: 960, y: 575, s: 1.1, len: 1.6 }
  ]);
  const SNAP = 0.62; // fraction of line 7 when the pieces start to snap together

  // ---------------- cue 0: the question ----------------
  const q = X.g();
  X.text(960, 430, 'What is truly new?', { parent: q, size: 76, w: 700, anchor: 'middle', serif: true });
  const mag = X.icon('magnifier', 1330, 380, 0.9, { parent: q, color: C.ink2 });
  X.bob(mag.mid, { amp: 10, ampX: 18, per: 1.6 });
  const sc = X.icon('scale', 960, 640, 1.2, { parent: q, color: C.ochre });
  X.each(t => sc.mid.setAttribute('transform', `rotate(${(5 * Math.sin(t * 2)).toFixed(2)} 960 640)`));
  X.show(q, 0, { type: 'pop', out: 1, outLen: 0.5 });

  // ---------------- shelves ----------------
  const shelves = X.g();
  X.text(340, 290, 'Seen before', { parent: shelves, size: 36, w: 700, anchor: 'middle', serif: true, fill: C.ink2 });
  X.rect(120, 512, 440, 18, { parent: shelves, fill: C.ink3, stroke: 'none', r: 4 });
  X.show(shelves, 1, { type: 'up', out: 7, outf: SNAP, outLen: 0.6 });
  const shelvesN = X.g();
  X.text(1230, 290, 'New', { parent: shelvesN, size: 36, w: 700, anchor: 'middle', serif: true, fill: C.teal });
  X.rect(640, 512, 1180, 18, { parent: shelvesN, fill: C.ink3, stroke: 'none', r: 4 });
  X.rect(640, 822, 1180, 18, { parent: shelvesN, fill: C.ink3, stroke: 'none', r: 4 });
  X.show(shelvesN, 2, { type: 'up', out: 7, outf: SNAP, outLen: 0.6 });

  // ---------------- the pieces ----------------
  const pieces = [
    { k: 1, f: 0.1, slot: [340, 420], snap: [960, 372], ic: 'card', col: C.ink2, h: 'Luhn-failing tokens', s: 'already in some\nproducts', from: [-100, 300] },
    { k: 2, f: 0.15, slot: [840, 420], snap: [880, 458], ic: 'lock', col: C.teal, h: 'Theorem 1', s: 'protected or leaked:\nprovable for Aadhaar\nand cards' },
    { k: 3, f: 0.08, slot: [1230, 420], snap: [1040, 458], ic: 'magnifier', col: C.blue, h: 'Theorem 2', s: 'tokens name the\nleaker, with a proven\nerror rate' },
    { k: 4, f: 0.08, slot: [1620, 420], snap: [880, 551], ic: 'phone', col: C.ochre, h: 'OTP registry', s: 'each OTP tied to\nits own request' },
    { k: 5, f: 0.08, slot: [840, 730], snap: [1040, 551], ic: 'log', col: C.plum, h: 'Leakage ledger', s: 'counts what joined\nsystems can work out' },
    { k: 6, f: 0.08, slot: [1230, 730], snap: [880, 644], ic: 'key', col: C.green, h: 'Keys + Theorem 3', s: 'one key per purpose,\nsigned receipts,\nlegal time locks' },
    { k: 7, f: 0.05, slot: [1620, 730], snap: [1040, 644], ic: 'atom', col: C.red, h: 'Quantum finding', s: 'recorded traffic could\nundo erasure: plus\nthe hybrid fix' }
  ];
  pieces.forEach((p, i) => {
    const g = X.g();
    X.rect(-180, -90, 360, 180, { parent: g, fill: C.card, stroke: p.col, sw: 4, r: 16, shadow: 6 });
    const icg = X.icon(p.ic, -128, -8, 0.55, { parent: g, color: p.col });
    if (p.ic === 'atom') X.spin(icg.mid, -128, -8, { speed: 50 });
    X.text(-70, -42, p.h, { parent: g, size: 26, w: 700, serif: true, fill: i ? C.ink : C.ink2 });
    X.text(-70, -8, p.s, { parent: g, size: 22, fill: C.ink2, lh: 27 });
    const from = p.from || [960, 140];
    const sp = X.spline([from, [lerp(from[0], p.slot[0], 0.5), Math.min(from[1], p.slot[1]) - 80], p.slot]);
    X.each(t => {
      const t0 = X.at(p.k, p.f);
      if (t < t0) { g.style.display = 'none'; return; }
      g.style.display = '';
      const u = ease(clamp((t - t0) / 1.0));
      let [x, y] = sp.at(u);
      let s = lerp(0.5, 1, u), rot = (1 - u) * (i % 2 ? 8 : -8);
      // landing bounce
      const b = clamp((t - t0 - 1.0) / 0.4);
      if (b > 0 && b < 1) y -= 10 * Math.sin(b * Math.PI);
      const v = ease(clamp((t - X.at(7, SNAP + i * 0.025)) / 1.0));
      x = lerp(x, p.snap[0], v); y = lerp(y, p.snap[1], v); s = lerp(s, 0.42, v);
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(3)})`);
      g.style.opacity = clamp((t - t0) / 0.25);
    });
  });
  X.term(1, 'Luhn check', 'The check-digit recipe used on bank cards,\nto catch typing mistakes.', { f: 0.2, until: 2 });

  // Theorem 1 in action, under the "seen before" shelf
  const demo = X.g();
  X.text(340, 600, 'Theorem 1 in action', { parent: demo, size: 26, w: 700, anchor: 'middle', serif: true });
  const r1 = X.g(demo);
  X.chip(245, 660, '2498 2684 6187', { parent: r1, size: 24, mono: true, color: C.green, fill: C.greenL, width: 250 });
  X.mark(405, 660, true, { parent: r1, s: 20 });
  X.text(435, 668, 'protected', { parent: r1, size: 24, w: 700, fill: C.green });
  X.show(r1, 2, { f: 0.55, type: 'left' });
  const r2 = X.g(demo);
  X.chip(245, 740, '2345 6789 0124', { parent: r2, size: 24, mono: true, color: C.red, fill: C.redL, width: 250 });
  X.mark(405, 740, false, { parent: r2, s: 20 });
  X.text(435, 748, 'leaked!', { parent: r2, size: 24, w: 700, fill: C.red });
  X.show(r2, 2, { f: 0.72, type: 'left' });
  X.text(340, 810, 'tokens always fail the check;\nreal numbers pass it', { parent: demo, size: 22, anchor: 'middle', fill: C.ink2, lh: 28 });
  X.show(demo, 2, { f: 0.5, type: 'fade', out: 3, outf: 0.5 });
  const turn = X.arrow(525, 420, 655, 420, { color: C.teal, sw: 5 });
  X.show(turn, 2, { f: 0.1, type: 'draw', out: 7, outf: SNAP });
  const proven = X.text(590, 395, 'proven', { size: 22, w: 700, anchor: 'middle', fill: C.teal });
  X.show(proven, 2, { f: 0.2, type: 'fade', out: 7, outf: SNAP });
  X.term(2, 'Theorem', 'A statement proven true with careful maths,\nnot just tested a few times.', { until: 3 });
  X.term(3, 'Error rate', 'How often a method gets the answer wrong.', { until: 4 });
  X.term(4, 'OTP registry', 'A list that remembers which one-time code\nbelongs to which request.', { until: 5 });
  X.term(5, 'Leakage ledger', 'A running count of what someone could work\nout by joining data from many systems.', { until: 6 });
  X.term(6, 'Time lock', 'A rule that keeps data exactly as long as\nthe law says, and no longer.', { until: 7 });
  X.term(7, 'Hybrid fix', 'An old lock and a quantum-safe lock used\ntogether, so both must be broken.', { f: 0.3, until: 8 });

  // little spark when each new piece lands
  pieces.forEach(p => {
    const ring = E('circle', { cx: p.slot[0], cy: p.slot[1], r: 100, fill: 'none', stroke: p.col, 'stroke-width': 4 }, X.g());
    X.each(t => {
      const u = clamp((t - X.at(p.k, p.f, 1.0)) / 0.8);
      ring.setAttribute('r', (150 + 80 * u).toFixed(1));
      ring.style.opacity = u > 0 && u < 1 && t < X.at(7, SNAP) ? (1 - u) * 0.8 : 0;
    });
  });

  // ---------------- the shield they form ----------------
  const sh = X.path('M960,285 L1225,368 L1225,560 Q1225,775 960,880 Q695,775 695,560 L695,368 Z', { color: C.teal, sw: 8, fill: 'none' });
  X.show(sh, 7, { f: SNAP + 0.2, type: 'draw', len: 1.2 });
  const shFill = X.path('M960,285 L1225,368 L1225,560 Q1225,775 960,880 Q695,775 695,560 L695,368 Z', { color: 'none', sw: 0, fill: C.tealL });
  shFill.p.style.strokeDasharray = 'none';
  shFill.parentNode.insertBefore(shFill, shFill.parentNode.firstChild);
  X.show(shFill, 7, { f: SNAP + 0.3, type: 'fade', len: 1 });
  const ar = X.text(960, 790, 'Aran', { size: 44, w: 700, anchor: 'middle', serif: true, fill: C.teal });
  X.show(ar, 7, { f: SNAP + 0.3, type: 'pop' });
  const lt = X.text(390, 560, 'Single pieces:\nsome exist elsewhere', { size: 30, w: 600, anchor: 'middle', fill: C.ink2, lh: 40 });
  const rt = X.text(1530, 560, 'Together, with proofs\nand measurements: new', { size: 30, w: 700, anchor: 'middle', fill: C.teal, lh: 40 });
  X.show(lt, 7, { f: SNAP + 0.25, type: 'right' });
  X.show(rt, 7, { f: SNAP + 0.3, type: 'left' });

  X.recap(8, ['Some single pieces exist elsewhere', 'Putting them together is new', 'With proofs and measurements']);
});
