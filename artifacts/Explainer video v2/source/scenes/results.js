// The results: a growing bar chart of values removed (with a 100-dot picture of the hidden values),
// then a grid of headline tiles that each count to their number.
scene('results', X => {
  const OX = 2000; // tile grid lives to the right
  X.cam([
    { x: 1270, y: 500, s: 1.2 },
    { k: 0, f: 0.45, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 1, x: 560, y: 545, s: 1.12 },
    { k: 2, x: 960, y: 540, s: 1 },
    { k: 5, x: 1250, y: 545, s: 1.08 },
    { k: 6, x: OX + 960, y: 520, s: 1, len: 1.8 },
    { k: 12, x: OX + 960, y: 540, s: 0.98 }
  ]);

  // ---------------- left: the test set ----------------
  const lp = X.g();
  X.rect(110, 170, 540, 715, { parent: lp, fill: C.card, stroke: C.line, r: 18, shadow: true });
  X.icon('log', 175, 232, 0.45, { parent: lp, color: C.ink2 });
  X.text(220, 245, 'The test', { parent: lp, size: 36, w: 700, serif: true });
  X.show(lp, 1, { type: 'up' });
  const st1 = X.text(150, 310, '', { size: 30, w: 700, fill: C.blue });
  X.count(st1, 0, 16000, 1, { f0: 0.05, f1: 0.3, post: ' real log lines' });
  X.show(st1, 1, { f: 0.05, type: 'fade' });
  const st2 = X.text(150, 360, '8 systems never seen', { size: 30, w: 700, fill: C.plum });
  X.show(st2, 1, { f: 0.3, type: 'up' });
  const st3 = X.text(150, 410, '', { size: 30, w: 700, fill: C.red });
  X.count(st3, 0, 1895, 1, { f0: 0.6, f1: 0.85, post: ' hidden values' });
  X.show(st3, 1, { f: 0.6, type: 'fade' });
  const dots = [];
  const dg = X.g();
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) dots.push(E('circle', { cx: 190 + i * 42, cy: 465 + j * 38, r: 14, fill: C.redL, stroke: C.red, 'stroke-width': 2.5 }, dg));
  X.text(380, 862, 'each dot is about 19 hidden values', { parent: dg, size: 22, anchor: 'middle', fill: C.ink2 });
  X.show(dg, 1, { f: 0.65, type: 'fade' });
  X.term(1, 'Sensitive value', 'A piece of personal data, like an Aadhaar\nor mobile number, that must not leak.', { until: 2 });

  // ---------------- right: the bar chart ----------------
  const ch = X.g();
  const B0 = 800, HH = 540;
  X.text(760, 205, 'Sensitive values removed', { parent: ch, size: 34, w: 700, serif: true });
  [0, 25, 50, 75, 100].forEach(v => {
    const y = B0 - HH * v / 100;
    X.line(760, y, 1780, y, { parent: ch, color: v ? C.sand : C.ink2, sw: v ? 2 : 4 });
    X.text(745, y + 8, v + '%', { parent: ch, size: 22, anchor: 'end', fill: C.ink3 });
  });
  X.show(ch, 0, { f: 0.1, type: 'fade' });
  const big = X.text(1270, 520, 'The main result', { size: 64, w: 700, anchor: 'middle', serif: true, fill: C.ochre });
  X.show(big, 0, { type: 'pop', out: 1 });
  const bars = [
    { k: 2, v: 46.1, col: C.red, fl: C.redL, lab: 'Plain pattern\nsearch' },
    { k: 3, v: 83.5, col: C.blue, fl: C.blueL, lab: 'AI layers' },
    { k: 4, v: 89.7, col: C.plum, fl: C.plumL, lab: '+ normaliser\nand lists' },
    { k: 5, v: 91.0, col: C.green, fl: C.greenL, lab: '+ latest fixes' }
  ];
  bars.forEach((b, i) => {
    const x = 800 + i * 250;
    const g = X.g();
    b.r = E('rect', { x, y: B0, width: 170, height: 0, rx: 8, fill: b.fl, stroke: b.col, 'stroke-width': 4 }, g);
    b.t = X.text(x + 85, B0 - 20, '', { parent: g, size: 40, w: 700, anchor: 'middle', serif: true, fill: b.col });
    X.text(x + 85, 845, b.lab, { parent: g, size: 24, w: 600, anchor: 'middle', lh: 28 });
    X.show(g, b.k, { type: 'fade', len: 0.3 });
  });
  const noList = X.chip(1635, 238, 'without the bank\'s lists', { size: 22, color: C.green, fill: C.greenL });
  X.show(noList, 5, { f: 0.6, type: 'pop' });
  X.each(() => {
    let best = 0;
    bars.forEach(b => {
      const p = X.P(b.k, 0.1, 0, 1.3);
      const h = HH * b.v / 100 * p;
      b.r.setAttribute('y', B0 - h); b.r.setAttribute('height', h);
      b.t.t.setAttribute('y', B0 - h - 16);
      b.t.set(p > 0 ? (b.v * p).toFixed(1) + '%' : '');
      best = Math.max(best, b.v * p);
    });
    const n = Math.round(best);
    dots.forEach((d, i) => { const on = i < n; d.setAttribute('fill', on ? C.greenL : C.redL); d.setAttribute('stroke', on ? C.green : C.red); });
  });
  X.term(2, 'Pattern search', 'A fixed rule, like "twelve digits in a row",\nthat the computer looks for.', { until: 3 });
  X.term(3, 'AI layers', 'Trained models that read the words around\na number to judge if it is sensitive.', { until: 4 });
  X.term(4, 'Normaliser', 'Tidies text first, for example joining\nsplit-up digits, so numbers cannot hide.', { until: 5 });

  // ---------------- headline tiles ----------------
  const tiles = [
    { k: 6, cap: 'Aadhaar, card, PAN and UPI:\nsafe since the first AI version', col: C.green, ic: 'shield' },
    { k: 7, cap: 'False OTP alarms on\n32,000 real lines', col: C.ochre, ic: 'alert' },
    { k: 8, cap: 'Tokens wrongly\nflagged as real', col: C.blue, ic: 'key' },
    { k: 9, cap: 'Leaked files traced to\nthe right destination', col: C.plum, ic: 'magnifier' },
    { k: 10, cap: 'Customers narrowed down\nby joining systems', col: C.teal, ic: 'person' },
    { k: 11, cap: 'Raw details reaching\nan AI company', col: C.red, ic: 'cloud' }
  ];
  const slots = X.g();
  for (let i = 0; i < 6; i++) X.rect(OX + 120 + (i % 3) * 570, 190 + Math.floor(i / 3) * 340, 540, 300, { parent: slots, fill: 'none', stroke: C.line, sw: 3, r: 20, dash: '14 10' });
  X.show(slots, 6, { type: 'fade', len: 0.8 });
  tiles.forEach((tl, i) => {
    const tx = OX + 120 + (i % 3) * 570, ty = 190 + Math.floor(i / 3) * 340;
    const outer = X.g(); const g = X.g(outer);
    X.rect(tx, ty, 540, 300, { parent: g, fill: C.card, stroke: tl.col, sw: 4, r: 20, shadow: 8 });
    X.text(tx + 30, ty + 50, tl.cap, { parent: g, size: 24, w: 600, fill: C.ink2, lh: 30 });
    X.icon(tl.ic, tx + 480, ty + 60, 0.42, { parent: g, color: tl.col });
    const bigT = X.text(tx + 30, ty + 190, '', { parent: g, size: 76, w: 700, serif: true, fill: tl.col });
    const f0 = 0.12, f1 = 0.75;
    if (i === 0) {
      X.count(bigT, 0, 100, tl.k, { f0, f1, post: '%' });
      ['Aadhaar', 'Card', 'PAN', 'UPI'].forEach((s, j) => {
        const c = X.chip(tx + 90 + j * 122, ty + 255, s, { parent: g, size: 22, width: 114, color: C.green, fill: C.greenL });
        X.show(c, tl.k, { f: 0.3 + j * 0.12, type: 'pop' });
      });
    } else if (i === 1 || i === 4) {
      const from = i === 1 ? 67481 : 14175, to = i === 1 ? 6 : 0;
      X.count(bigT, from, to, tl.k, { f0, f1 });
      const bf = X.text(tx + 30, ty + 255, 'before: ' + fmtUS(from), { parent: g, size: 24, fill: C.ink3 });
      const sl = E('line', { x1: tx + 28, y1: ty + 247, x2: tx + 28, y2: ty + 247, stroke: C.red, 'stroke-width': 3 }, g);
      X.each(() => sl.setAttribute('x2', tx + 28 + (8 + fmtUS(from).length) * 13 * ease(X.L(tl.k, 0.75, 0.9))));
    } else if (i === 2) {
      X.count(bigT, 0, 20000, tl.k, { f0, f1, pre: '0 of ' });
      X.text(tx + 30, ty + 255, 'tokens checked, none mistaken', { parent: g, size: 24, fill: C.ink3 });
    } else if (i === 3) {
      X.count(bigT, 0, 100, tl.k, { f0, f1, post: '%' });
      X.text(tx + 30, ty + 255, 'every leak names its source', { parent: g, size: 24, fill: C.ink3 });
    } else {
      X.count(bigT, 100, 7.8, tl.k, { f0, f1, fmt: n => n.toFixed(1), post: '%' });
      X.rect(tx + 30, ty + 240, 480, 24, { parent: g, fill: C.sand, stroke: 'none', r: 10 });
      const br = E('rect', { x: tx + 30, y: ty + 240, width: 480, height: 24, rx: 10, fill: C.red }, g);
      X.each(() => br.setAttribute('width', 480 * lerp(1, 0.078, easeOut(X.L(tl.k, f0, f1)))));
    }
    X.show(outer, tl.k, { type: 'pop' });
    X.pulse(g, tx + 270, ty + 150, [tl.k], { f: 0.78, amt: 0.05 });
  });
  X.term(7, 'False alarm', 'When the system wrongly shouts "sensitive!"\nabout something harmless.', { until: 8 });
  X.term(10, 'Joining systems', 'Putting data from two places together\nto work out who a customer is.', { until: 11 });
  X.term(11, 'AI company', 'An outside firm whose AI model the bank\'s\nstaff send questions to.', { until: 12 });

  X.recap(12, ['Over 90% removed on unseen real logs', 'Very few false alarms', 'Every number type fully protected']);
});
