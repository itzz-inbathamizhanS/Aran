// ============================== DETECT (M2)
scene('detect', X => {
  const D = window.DATA;
  const A = X.g();
  X.text(960, 200, 'log line:  "Your OTP is 482913 (trace 4bf92f)"', { size: 34, w: 500, mono: true, anchor: 'middle', fill: C.muted, parent: A });
  X.box(780, 360, 360, 130, { label: '482913', mono: true, size: 64, color: C.text, stroke: C.amber, parent: A });
  const clues = [['the word "OTP" right before', 400, 300], ['exactly 6 digits', 1520, 300], ['issued in this request?', 400, 560], ['inside a "phone" field?', 1520, 560]];
  clues.forEach(([c, x, y], i) => {
    const g = X.chip(x, y, c, { size: 26, color: C.blue });
    X.show(g, 0, { f: 0.25 + i * 0.15, type: 'pop', out: 1 });
  });
  X.text(960, 700, 'each clue is a piece of evidence', { size: 34, w: 600, fill: C.amber, anchor: 'middle', parent: A });
  X.show(A, 0, { type: 'fade', out: 1 });
  // likelihood ratio
  const B = X.g();
  const beam = E('g', null, B);
  E('line', { x1: 960, y1: 330, x2: 960, y2: 620, stroke: C.muted, 'stroke-width': 6 }, B);
  E('path', { d: 'M900,640 L1020,640 L960,600 Z', fill: C.muted }, B);
  const bar = E('g', null, beam);
  E('line', { x1: 560, y1: 330, x2: 1360, y2: 330, stroke: C.text, 'stroke-width': 6, 'stroke-linecap': 'round' }, bar);
  E('rect', { x: 460, y: 380, width: 200, height: 90, rx: 12, fill: '#0f2b20', stroke: C.green, 'stroke-width': 3 }, bar);
  E('rect', { x: 1260, y: 380, width: 200, height: 90, rx: 12, fill: '#2a1320', stroke: C.red, 'stroke-width': 3 }, bar);
  E('line', { x1: 560, y1: 330, x2: 560, y2: 380, stroke: C.text, 'stroke-width': 3 }, bar);
  E('line', { x1: 1360, y1: 330, x2: 1360, y2: 380, stroke: C.text, 'stroke-width': 3 }, bar);
  const tA = E('text', { x: 560, y: 436, 'font-size': 30, 'font-weight': 700, fill: C.green, 'text-anchor': 'middle', 'font-family': 'Inter' }, bar); tA.textContent = 'if real';
  const tB = E('text', { x: 1360, y: 436, 'font-size': 30, 'font-weight': 700, fill: C.red, 'text-anchor': 'middle', 'font-family': 'Inter' }, bar); tB.textContent = 'if noise';
  X.text(960, 740, 'likelihood ratio = how likely the clue is if real ÷ if noise', { size: 34, w: 600, anchor: 'middle', parent: B });
  X.show(B, 1, { type: 'pop', out: 2 });
  X.term(1, 'Likelihood ratio', 'how much more likely a clue is if the value is real', { until: 2 });
  X.each(t => { const p = X.P(1, 0.3, 0, 1.2); bar.setAttribute('transform', `rotate(${-12 * p} 960 330)`); });
  // checksum x10
  const Cg = X.g();
  X.text(500, 200, '10 random 12-digit numbers', { size: 30, w: 600, fill: C.muted, anchor: 'middle', parent: Cg });
  const rnd = ['583920174652', '201948573620', '774829105539', '308817462906', '649203817745', '918273645506', '440958271633', '127364958800', '836451029374', '562019384721'];
  rnd.forEach((n, i) => {
    const y = 240 + i * 58;
    X.text(330, y + 32, n, { size: 30, mono: true, parent: Cg, fill: i === 6 ? C.text : C.dim });
    X.mark(680, y + 22, i === 6, { parent: Cg, s: 17 });
  });
  X.text(1350, 330, 'Real numbers: always pass', { size: 40, w: 700, anchor: 'middle', fill: C.green, parent: Cg });
  X.text(1350, 410, 'Random digits: 1 time in 10', { size: 40, w: 700, anchor: 'middle', fill: C.muted, parent: Cg });
  X.text(1350, 560, '× 10', { size: 120, w: 800, anchor: 'middle', fill: C.amber, parent: Cg });
  X.text(1350, 640, 'evidence from one checksum pass', { size: 30, w: 500, anchor: 'middle', parent: Cg });
  X.show(Cg, 2, { type: 'up', out: 3 });
  // Bayes gauge
  const G = X.g();
  const gx = 1350, gy = 600, gr = 260;
  E('path', { d: `M${gx - gr},${gy} A${gr},${gr} 0 0 1 ${gx + gr},${gy}`, fill: 'none', stroke: C.panel2, 'stroke-width': 40 }, G);
  const arc = E('path', { d: `M${gx - gr},${gy} A${gr},${gr} 0 0 1 ${gx + gr},${gy}`, fill: 'none', stroke: C.teal, 'stroke-width': 40, pathLength: 1 }, G);
  arc.style.strokeDasharray = '1'; arc.style.strokeDashoffset = 1;
  const needle = E('line', { x1: gx, y1: gy, x2: gx - gr + 30, y2: gy, stroke: C.text, 'stroke-width': 8, 'stroke-linecap': 'round' }, G);
  const pv = X.text(gx, gy + 90, '', { size: 64, w: 800, anchor: 'middle', parent: G });
  X.text(gx, gy + 140, 'probability it is sensitive', { size: 28, w: 500, anchor: 'middle', fill: C.muted, parent: G });
  const thr = E('g', { opacity: 0 }, G);
  const ta = Math.PI * (1 - 0.7);
  E('line', { x1: gx + (gr - 50) * Math.cos(ta), y1: gy - (gr - 50) * Math.sin(ta), x2: gx + (gr + 50) * Math.cos(ta), y2: gy - (gr + 50) * Math.sin(ta), stroke: C.amber, 'stroke-width': 6 }, thr);
  const tt = E('text', { x: gx + (gr + 60) * Math.cos(ta), y: gy - (gr + 60) * Math.sin(ta), 'font-size': 28, 'font-weight': 700, fill: C.amber, 'font-family': 'Inter' }, thr); tt.textContent = 'threshold';
  const sens = X.text(gx, 290, 'SENSITIVE', { size: 46, w: 800, anchor: 'middle', fill: C.red, parent: G });
  X.show(sens, 4, { f: 0.4, type: 'pop', out: 5 });
  const mults = [['start: a small guess', '1%'], ['× 10   checksum passes', ''], ['× 30   word "OTP" before', ''], ['× 50   in the issued-OTP registry', '']];
  mults.forEach(([s], i) => { const g = X.text(140, 330 + i * 90, s, { size: 34, w: 600, fill: i ? C.amber : C.muted, parent: G }); X.show(g, 3, { f: 0.1 + i * 0.2, type: 'left', out: 5 }); });
  const per = X.text(140, 720, 'each sink can set its own threshold', { size: 32, w: 600, fill: C.amber, parent: G });
  X.show(per, 4, { f: 0.5, out: 5 });
  X.show(G, 3, { type: 'fade', out: 5 });
  X.term(3, "Bayes' rule", 'update a probability as evidence arrives', { until: 4 });
  X.term(4, 'Threshold', 'the score above which a value counts as sensitive', { until: 5 });
  X.each(t => {
    const u = X.L(3, 0.1, 0.9) * 3; let odds = 0.01 / 0.99;
    const fac = [10, 30, 50];
    for (let i = 0; i < 3; i++) odds *= Math.pow(fac[i], clamp(u - i));
    const prob = odds / (1 + odds);
    const a = Math.PI * (1 - prob);
    needle.setAttribute('x2', gx + (gr - 30) * Math.cos(a)); needle.setAttribute('y2', gy - (gr - 30) * Math.sin(a));
    arc.style.strokeDashoffset = 1 - prob;
    arc.setAttribute('stroke', X.t > X.at(4, 0.3) ? C.red : C.teal);
    pv.set((prob * 100).toFixed(prob > 0.99 ? 1 : 0) + '%');
    thr.setAttribute('opacity', X.P(4));
  });
  // calibration
  const K = X.g();
  const ox = 560, oy = 800, sz = 560;
  E('line', { x1: ox, y1: oy, x2: ox + sz, y2: oy, stroke: C.muted, 'stroke-width': 3 }, K);
  E('line', { x1: ox, y1: oy, x2: ox, y2: oy - sz, stroke: C.muted, 'stroke-width': 3 }, K);
  E('line', { x1: ox, y1: oy, x2: ox + sz, y2: oy - sz, stroke: C.teal, 'stroke-width': 3, 'stroke-dasharray': '10 8' }, K);
  X.text(ox + sz / 2, oy + 50, 'how sure the detector says it is', { size: 26, w: 500, anchor: 'middle', fill: C.muted, parent: K });
  const yl = X.text(ox - 30, oy - sz / 2, 'how often it is right', { size: 26, w: 500, anchor: 'middle', fill: C.muted, parent: K });
  yl.t.setAttribute('transform', `rotate(-90 ${ox - 30} ${oy - sz / 2})`);
  [0.1, 0.3, 0.5, 0.7, 0.9].forEach((v, i) => X.circle(ox + v * sz, oy - (v + [0.02, -0.03, 0.01, 0.02, -0.01][i]) * sz, 12, { fill: C.teal, parent: K }));
  X.circle(ox + 0.9 * sz, oy - 0.89 * sz, 26, { stroke: C.amber, sw: 4, parent: K });
  X.text(ox + 0.9 * sz - 40, oy - 0.89 * sz - 40, '"90% sure" → right 90%', { size: 32, w: 700, anchor: 'end', fill: C.amber, parent: K });
  X.text(1450, 420, 'Calibration error', { size: 34, w: 600, anchor: 'middle', fill: C.muted, parent: K });
  X.text(1450, 520, '0.0065', { size: 90, w: 800, anchor: 'middle', fill: C.teal, parent: K });
  X.text(1450, 580, '(0 would be perfect)', { size: 28, w: 500, anchor: 'middle', fill: C.muted, parent: K });
  X.show(K, 5, { type: 'up', out: 6 });
  X.term(5, 'Calibration', '"90% sure" is right 90% of the time', { until: 6 });
  // what the bank owns
  const O = X.g();
  X.icon('bank', 960, 400, 1.6, { parent: O, color: C.blue });
  X.text(960, 580, 'the strongest clues come from what the bank already owns', { size: 38, w: 600, anchor: 'middle', parent: O });
  X.text(960, 650, 'its own customers · the OTPs it issued', { size: 34, w: 500, anchor: 'middle', fill: C.amber, parent: O });
  X.show(O, 6, { type: 'pop', out: 7 });
  // hash
  const H = X.g();
  X.box(140, 250, 420, 100, { label: '2345 6789 0124', mono: true, size: 38, parent: H });
  X.box(140, 430, 420, 100, { label: '2345 6789 0125', mono: true, size: 38, parent: H });
  X.text(140 + 420 - 20, 520 - 8, '', { parent: H });
  X.arrow(580, 300, 760, 360, { parent: H }); X.arrow(580, 480, 760, 420, { parent: H });
  X.box(780, 300, 320, 180, { label: 'hash', size: 48, stroke: C.blue, color: C.blue, parent: H });
  X.arrow(1120, 360, 1290, 300, { parent: H, color: C.blue }); X.arrow(1120, 420, 1290, 480, { parent: H, color: C.blue });
  X.box(1300, 250, 480, 100, { label: D.h1, mono: true, size: 36, color: C.blue, parent: H });
  X.box(1300, 430, 480, 100, { label: D.h2, mono: true, size: 36, color: C.pink, parent: H });
  X.text(960, 610, 'one digit changed → a completely different fingerprint', { size: 32, w: 600, anchor: 'middle', parent: H });
  const back = X.g(H);
  X.arrow(1300, 690, 600, 690, { parent: back, color: C.red, sw: 4 });
  X.mark(950, 690, false, { parent: back, s: 28 });
  X.text(950, 760, 'cannot go backwards', { size: 30, w: 700, anchor: 'middle', fill: C.red, parent: back });
  X.show(back, 7, { f: 0.6, type: 'fade' });
  X.show(H, 7, { type: 'up', out: 9 });
  X.term(7, 'Hash', 'a one-way fingerprint of data', { until: 8 });
  const HM = X.g();
  X.icon('key', 940, 200, 0.8, { parent: HM, color: C.amber });
  X.arrow(940, 225, 940, 295, { parent: HM, color: C.amber, sw: 3 });
  X.text(1010, 210, 'secret key → H-MAC', { size: 30, w: 700, fill: C.amber, parent: HM });
  X.show(HM, 8, { type: 'down', out: 9 });
  X.term(8, 'HMAC', 'a hash that needs a secret key', { until: 9 });
  // cuckoo filter
  const Q = X.g();
  X.text(960, 200, "the bank's own customers, stored only as fingerprints", { size: 34, w: 600, anchor: 'middle', parent: Q });
  const fps = ['5ca6', '91e0', '', '0b7d', '7f22', '', 'c3a9', '2e18', '', 'a40f', '66b1', '', 'd95c', '18e7', '4c03', ''];
  const slots = [];
  fps.forEach((f, i) => {
    const x = 330 + (i % 8) * 160, y = 280 + Math.floor(i / 8) * 130;
    const r = X.box(x, y, 140, 100, { label: f, mono: true, size: 32, color: C.text, parent: Q });
    slots.push(r);
  });
  const qy = X.chip(960, 620, 'lookup  234567890124  →  fingerprint 5ca6', { size: 30, mono: true, color: C.amber });
  X.show(qy, 9, { f: 0.3, type: 'pop', out: 10 });
  const seen = X.text(960, 720, '✓ seen before: one of our customers', { size: 36, w: 700, anchor: 'middle', fill: C.green, parent: Q });
  X.show(seen, 9, { f: 0.5, type: 'pop' });
  const del = X.text(960, 800, 'and entries can be deleted when a customer is erased', { size: 30, w: 600, anchor: 'middle', fill: C.muted, parent: Q });
  X.show(del, 9, { f: 0.75 });
  X.show(Q, 9, { type: 'fade', out: 10 });
  X.term(9, 'Cuckoo filter', 'a compact "have I seen this?" table that can delete', { until: 10 });
  X.each(t => {
    const hit = X.t > X.at(9, 0.45);
    slots[0].r.setAttribute('stroke', hit ? C.green : C.line); slots[0].r.setAttribute('stroke-width', hit ? 5 : 2);
    const gone = X.t > X.at(9, 0.8);
    slots[10].t.set(gone ? '' : '66b1'); slots[10].r.setAttribute('stroke', X.t > X.at(9, 0.75) && !gone ? C.red : C.line);
  });
  // OTP registry
  const R = X.g();
  X.box(200, 300, 380, 120, { label: 'OTP 482913', mono: true, size: 40, color: C.red, stroke: C.red, parent: R });
  X.text(390, 470, '+', { size: 60, w: 700, anchor: 'middle', parent: R });
  X.box(200, 500, 380, 120, { label: 'trace 4bf92f', sub: 'the exact request', mono: true, size: 38, color: C.blue, stroke: C.blue, parent: R });
  X.arrow(600, 460, 800, 460, { parent: R });
  X.box(820, 390, 400, 140, { label: 'H-MAC', sub: 'remembered by Aran', size: 40, stroke: C.amber, color: C.amber, parent: R });
  X.icon('clock', 1440, 460, 0.9, { parent: R, color: C.muted });
  X.text(1440, 580, 'expires in minutes', { size: 30, w: 600, anchor: 'middle', fill: C.muted, parent: R });
  X.show(R, 10, { type: 'up', out: 11 });
  const S = X.g();
  X.box(200, 280, 700, 380, { label: '7%', sub: 'a random 6-digit number\nmatches one of 70,000 live OTPs', size: 120, subSize: 30, color: C.red, stroke: C.red, parent: S });
  X.box(1020, 280, 700, 380, { label: '1 in 1,000,000', sub: 'when the OTP must match\nits own request', size: 76, subSize: 30, color: C.green, stroke: C.green, parent: S });
  X.text(550, 250, 'without the binding', { size: 30, w: 600, anchor: 'middle', fill: C.muted, parent: S });
  X.text(1370, 250, 'with the binding', { size: 30, w: 600, anchor: 'middle', fill: C.muted, parent: S });
  X.show(S, 11, { type: 'pop', out: 12 });
  const Z = X.g();
  X.text(960, 260, 'False alarms on 16,000 real log lines', { size: 38, w: 700, anchor: 'middle', parent: Z });
  const z1 = X.rect(300, 340, 10, 110, { parent: Z, fill: C.red, stroke: 'none' });
  const z2 = X.rect(300, 540, 10, 110, { parent: Z, fill: C.teal, stroke: 'none' });
  X.text(290, 410, 'regex', { size: 32, w: 600, anchor: 'end', parent: Z });
  X.text(290, 610, 'Aran', { size: 32, w: 600, anchor: 'end', parent: Z });
  const zv1 = X.text(0, 412, '', { size: 44, w: 800, fill: C.red, parent: Z });
  const zv2 = X.text(0, 612, '', { size: 44, w: 800, fill: C.teal, parent: Z });
  X.show(Z, 12, { type: 'fade' });
  X.each(t => {
    const p = X.P(12, 0.1, 0, 1.4);
    const w1 = 10 + 1300 * p, w2 = 10 + 1300 * (60 / 2506) * p;
    z1.r.setAttribute('width', w1); z2.r.setAttribute('width', w2);
    zv1.t.setAttribute('x', 320 + w1); zv2.t.setAttribute('x', 320 + w2);
    zv1.set(fmt(2506 * p)); zv2.set(fmt(60 * p));
  });
});

// ============================== AI
scene('ai', X => {
  const A = X.g();
  X.chip(560, 330, 'Ravi Kumar', { size: 44, parent: A });
  X.chip(560, 470, '12 Gandhi Street, Madurai', { size: 36, parent: A });
  X.text(560, 600, 'no check digit, no fixed shape', { size: 32, w: 600, anchor: 'middle', fill: C.red, parent: A });
  X.arrow(900, 400, 1150, 400, { parent: A, color: C.violet });
  X.icon('brain', 1350, 400, 1.6, { parent: A, color: C.violet });
  X.text(1350, 560, 'AI', { size: 54, w: 800, anchor: 'middle', fill: C.violet, parent: A });
  X.show(A, 0, { type: 'up', out: 1 });
  const B = X.g();
  X.rect(160, 230, 680, 460, { parent: B, stroke: C.dim });
  X.text(500, 300, 'Given rules', { size: 38, w: 700, anchor: 'middle', fill: C.muted, parent: B });
  ['if word = "Mr" then name', 'if ends in "Street" …', 'if … if … if …'].forEach((s, i) => X.text(220, 390 + i * 70, s, { size: 30, mono: true, fill: C.dim, parent: B }));
  E('line', { x1: 200, y1: 640, x2: 800, y2: 260, stroke: C.red, 'stroke-width': 6 }, B);
  X.rect(1080, 230, 680, 460, { parent: B, stroke: C.violet });
  X.text(1420, 300, 'Learns from examples', { size: 38, w: 700, anchor: 'middle', fill: C.violet, parent: B });
  for (let i = 0; i < 12; i++) X.rect(1140 + (i % 4) * 150, 350 + Math.floor(i / 4) * 95, 120, 70, { parent: B, fill: C.panel2, stroke: i % 3 ? C.line : C.violet, r: 8 });
  X.show(B, 1, { type: 'up', out: 2 });
  X.term(1, 'Machine learning', 'learning patterns from examples, not rules', { until: 2 });
  const Cg = X.g();
  for (let i = 0; i < 18; i++) X.rect(200 + (i % 6) * 95, 300 + Math.floor(i / 6) * 95, 75, 75, { parent: Cg, fill: '#10233f', stroke: C.blue, r: 8 });
  X.text(485, 640, 'training data: teaches', { size: 32, w: 700, anchor: 'middle', fill: C.blue, parent: Cg });
  E('line', { x1: 860, y1: 250, x2: 860, y2: 700, stroke: C.amber, 'stroke-width': 8 }, Cg);
  X.text(860, 230, 'kept apart', { size: 26, w: 700, anchor: 'middle', fill: C.amber, parent: Cg });
  for (let i = 0; i < 6; i++) X.rect(960 + (i % 3) * 95, 350 + Math.floor(i / 3) * 95, 75, 75, { parent: Cg, fill: '#0f2b20', stroke: C.green, r: 8 });
  X.text(1100, 640, 'test data: checks', { size: 32, w: 700, anchor: 'middle', fill: C.green, parent: Cg });
  X.text(1550, 420, '8 log systems', { size: 34, w: 700, anchor: 'middle', fill: C.blue, parent: Cg });
  X.text(1550, 470, 'to learn', { size: 28, w: 500, anchor: 'middle', fill: C.muted, parent: Cg });
  X.text(1550, 560, '8 other systems', { size: 34, w: 700, anchor: 'middle', fill: C.green, parent: Cg });
  X.text(1550, 610, 'never seen, to test', { size: 28, w: 500, anchor: 'middle', fill: C.muted, parent: Cg });
  X.show(Cg, 2, { type: 'up', out: 3 });
  X.term(2, 'Training / test data', 'one set teaches, a separate set checks', { until: 3 });
  // NER
  const words = ['Loan', 'approved', 'for', 'Ravi', 'Kumar', 'of', '12', 'Gandhi', 'Street,', 'Madurai'];
  const labs = ['O', 'O', 'O', 'B-PER', 'I-PER', 'O', 'B-ADDR', 'I-ADDR', 'I-ADDR', 'I-ADDR'];
  const N = X.g();
  const wx = []; let x = 120;
  const boxes = words.map((w, i) => { const wd = w.length * 21 + 40; const b = X.rect(x, 330, wd, 80, { parent: N, r: 10 }); X.text(x + wd / 2, 383, w, { size: 34, w: 600, anchor: 'middle', parent: N }); wx.push(x + wd / 2); x += wd + 14; return b; });
  const tags = labs.map((l, i) => X.text(wx[i], 470, l, { size: 24, w: 700, anchor: 'middle', mono: true, fill: l === 'O' ? C.dim : l.includes('PER') ? C.pink : C.teal, parent: N }));
  X.show(N, 3, { type: 'fade', out: 5 });
  X.term(3, 'NER', 'named entity recognition: finds names and places', { until: 4 });
  const leg = X.g(N);
  X.text(120, 600, 'PER = person', { size: 30, w: 700, fill: C.pink, parent: leg });
  X.text(420, 600, 'ADDR = address', { size: 30, w: 700, fill: C.teal, parent: leg });
  X.text(780, 600, 'O = nothing sensitive', { size: 30, w: 700, fill: C.dim, parent: leg });
  const arcs = X.g(N);
  for (let i = 0; i < words.length - 1; i++) E('path', { d: `M${wx[i]},495 Q${(wx[i] + wx[i + 1]) / 2},545 ${wx[i + 1]},495`, fill: 'none', stroke: C.amber, 'stroke-width': 3 }, arcs);
  X.show(arcs, 4, { f: 0.2, type: 'fade' });
  const crf = X.text(120, 700, 'C R F: each label also looks at its neighbours · runs on a laptop, no GPU', { size: 30, w: 600, fill: C.amber, parent: N });
  X.show(crf, 4, { f: 0.3 });
  X.term(4, 'CRF', 'a fast model that labels each word using its neighbours', { until: 5 });
  X.each(t => {
    const p = X.L(3, 0.15, 0.9);
    boxes.forEach((b, i) => {
      const on = p * words.length > i && labs[i] !== 'O';
      b.r.setAttribute('stroke', on ? (labs[i].includes('PER') ? C.pink : C.teal) : C.line);
      b.r.setAttribute('fill', on ? (labs[i].includes('PER') ? '#331a2c' : '#0f2b2b') : C.panel);
      tags[i].style.opacity = p * words.length > i ? 1 : 0;
    });
  });
  // languages
  const Lg = X.g();
  const langs = [['English', 'Loan approved for ', 'Ravi Kumar', ''], ['Hindi', '', 'रवि कुमार', ' का लोन मंज़ूर हुआ'], ['Hinglish', '', 'Ravi Kumar', ' ka loan approve ho gaya']];
  langs.forEach(([l, a, n, b], i) => {
    const y = 300 + i * 150;
    const g = X.g(Lg);
    X.text(160, y, l, { size: 32, w: 700, fill: C.muted, parent: g });
    const t = E('text', { x: 420, y, 'font-size': 44, 'font-weight': 600, fill: C.text, 'font-family': 'Inter, Noto Sans Devanagari' }, g);
    const s1 = E('tspan', null, t); s1.textContent = a;
    const s2 = E('tspan', { fill: C.pink, 'font-weight': 800 }, t); s2.textContent = n;
    const s3 = E('tspan', null, t); s3.textContent = b;
    X.show(g, 5, { f: i * 0.25, type: 'left' });
  });
  X.show(Lg, 5, { type: 'fade', out: 6 });
  // char n-grams
  const Ng = X.g();
  X.text(160, 260, 'Your OTP is 482913', { size: 44, mono: true, parent: Ng });
  X.text(160, 560, 'port 482913 open', { size: 44, mono: true, parent: Ng });
  ['ot', 'tp', 'otp', 'is'].forEach((s, i) => X.chip(220 + i * 130, 340, s, { size: 30, mono: true, color: C.amber, parent: Ng, width: 110 }));
  ['po', 'or', 'rt', 'port'].forEach((s, i) => X.chip(220 + i * 130, 640, s, { size: 30, mono: true, color: C.blue, parent: Ng, width: 110 }));
  X.arrow(780, 300, 1080, 300, { parent: Ng }); X.arrow(780, 600, 1080, 600, { parent: Ng });
  X.box(1100, 230, 620, 140, { label: 'OTP  ✓', sub: 'protect it', size: 48, stroke: C.red, color: C.red, parent: Ng });
  X.box(1100, 530, 620, 140, { label: 'not an OTP', sub: 'leave it alone', size: 48, stroke: C.green, color: C.green, parent: Ng });
  X.show(Ng, 6, { type: 'up', out: 7 });
  X.term(6, 'Character n-grams', 'small slices of letters, like "ot", "tp", "otp"', { until: 7 });
  // precision / recall
  const PR = X.g();
  E('ellipse', { cx: 560, cy: 465, rx: 330, ry: 150, fill: 'rgba(251,191,36,0.06)', stroke: C.amber, 'stroke-width': 4, 'stroke-dasharray': '12 8' }, PR);
  X.text(560, 290, 'flagged by the detector', { size: 30, w: 700, anchor: 'middle', fill: C.amber, parent: PR });
  const red = [[380, 420], [460, 420], [540, 420], [620, 420], [380, 510], [460, 510], [540, 510], [620, 510], [180, 720], [1000, 330]];
  const grey = [[720, 420], [720, 510], [150, 330], [230, 250], [960, 720], [1020, 600], [320, 760], [820, 760], [120, 520], [1030, 460], [640, 770], [480, 780]];
  red.forEach(([x, y]) => X.circle(x, y, 20, { fill: C.red, parent: PR }));
  grey.forEach(([x, y]) => X.circle(x, y, 20, { fill: C.dim, parent: PR }));
  X.text(1220, 380, 'Precision = 8 / 10', { size: 44, w: 800, fill: C.amber, parent: PR });
  X.text(1220, 425, 'of what was flagged, how much was real?', { size: 26, w: 500, fill: C.muted, parent: PR });
  X.text(1220, 560, 'Recall = 8 / 10', { size: 44, w: 800, fill: C.red, parent: PR });
  X.text(1220, 605, 'of what was real, how much was flagged?', { size: 26, w: 500, fill: C.muted, parent: PR });
  X.circle(1235, 700, 14, { fill: C.red, parent: PR }); X.text(1260, 710, 'real sensitive value', { size: 26, w: 500, parent: PR });
  X.circle(1235, 750, 14, { fill: C.dim, parent: PR }); X.text(1260, 760, 'harmless', { size: 26, w: 500, parent: PR });
  X.show(PR, 7, { type: 'fade', out: 8 });
  X.term(7, 'Precision · Recall', 'how much flagged was real · how much real was flagged', { until: 8 });
  const M = X.g();
  X.rect(160, 230, 760, 470, { parent: M, stroke: C.teal });
  X.text(540, 300, 'Maths: exact answers', { size: 40, w: 800, anchor: 'middle', fill: C.teal, parent: M });
  ['Aadhaar · Verhoeff', 'Card · Luhn', 'Tokens that always fail'].forEach((s, i) => X.text(540, 390 + i * 70, s, { size: 34, w: 600, anchor: 'middle', parent: M }));
  X.rect(1000, 230, 760, 470, { parent: M, stroke: C.violet });
  X.text(1380, 300, 'AI: where maths cannot reach', { size: 40, w: 800, anchor: 'middle', fill: C.violet, parent: M });
  ['Names and addresses', 'OTP and UPI context', 'Calibrated probabilities'].forEach((s, i) => X.text(1380, 390 + i * 70, s, { size: 34, w: 600, anchor: 'middle', parent: M }));
  X.text(960, 790, 'AI / ML pair: SN Arun Vijay · Bharadhwaj M', { size: 34, w: 700, anchor: 'middle', fill: C.violet, parent: M });
  X.show(M, 8, { type: 'pop' });
});

// ============================== NORMALISER
scene('normaliser', X => {
  const dis = [['Tamil digits', '௨௩௪௫ ௬௭௮௯ ௦௧௨௪'], ['Hindi digits', '२३४५ ६७८९ ०१२४'], ['dots', '2345.6789.0124'], ['spaces', '2 3 4 5 6 7 8 9 0 1 2 4'], ['invisible characters', '2345·6789·0124'], ['web escapes', '%32%33%34%35%36…'], ['base64', 'MjM0NTY3ODkwMTI0']];
  const A = X.g();
  const rows = dis.map(([k, v], i) => {
    const y = 180 + i * 88;
    const g = X.g(A);
    X.text(110, y + 45, k, { size: 26, w: 600, fill: C.muted, parent: g });
    const b = X.rect(390, y, 560, 70, { parent: g, r: 10 });
    X.text(670, y + 47, v, { size: 32, w: 600, anchor: 'middle', parent: g, family: k.includes('Tamil') ? 'Noto Sans Tamil' : k.includes('Hindi') ? 'Noto Sans Devanagari' : 'DejaVu Sans Mono' });
    const m = X.mark(1000, y + 35, true, { parent: g, s: 22 });
    X.show(g, 0, { f: 0.05 + i * 0.12, type: 'left' });
    return { b, m, y };
  });
  X.show(A, 0, { type: 'fade', out: 3 });
  const F = X.g();
  E('path', { d: 'M1060,200 L1300,380 L1300,500 L1060,780 Z', fill: '#121e36', stroke: C.teal, 'stroke-width': 4 }, F);
  X.text(1180, 500, 'normaliser', { size: 32, w: 800, anchor: 'middle', fill: C.teal, parent: F });
  X.arrow(1310, 440, 1420, 440, { parent: F, color: C.teal });
  X.box(1430, 390, 420, 100, { label: '234567890124', mono: true, size: 40, color: C.teal, stroke: C.teal, parent: F });
  X.text(1640, 540, '12 disguises undone', { size: 30, w: 700, anchor: 'middle', parent: F });
  X.show(F, 1, { type: 'pop', out: 3 });
  X.term(1, 'Normaliser', 'undoes disguises before detection', { until: 2 });
  X.each(t => rows.forEach((r, i) => { const on = X.L(1, 0.2, 0.9) * rows.length > i; r.m.style.opacity = on ? 1 : 0; r.b.r.setAttribute('stroke', on ? C.teal : C.line); }));
  const Bp = X.g();
  X.text(1450, 640, 'hidden identifiers caught', { size: 28, w: 600, anchor: 'middle', fill: C.muted, parent: Bp });
  const bpv = X.text(1450, 740, '', { size: 96, w: 800, anchor: 'middle', fill: C.teal, parent: Bp });
  X.show(Bp, 2, { type: 'pop', out: 3 });
  X.each(t => { const p = X.P(2, 0.2, 0, 1.5); bpv.set((8.3 + (100 - 8.3) * p).toFixed(1) + '%'); });
  // typo
  const T = X.g();
  X.text(960, 200, 'A real Aadhaar typed with one mistake', { size: 36, w: 600, anchor: 'middle', fill: C.muted, parent: T });
  const ty = X.digits(860, 240, '234567880124', { cw: 62, ch: 84, size: 44, gap: 7, parent: T });
  ty.paint(7, '#2a1320', C.red, C.red);
  X.mark(1340, 282, false, { parent: T, s: 36 });
  X.text(1400, 295, 'fails Verhoeff, like a token', { size: 30, w: 700, fill: C.red, parent: T });
  X.show(T, 3, { type: 'up', out: 6 });
  const R = X.g();
  const cands = [];
  for (let i = 0; i < 24; i++) {
    const x = 170 + (i % 6) * 270, y = 420 + Math.floor(i / 6) * 70;
    let s = '234567880124'.split('');
    if (i === 13) s = '234567890124'.split(''); else { const pos = i % 12; s[pos] = String((+s[pos] + 1 + Math.floor(i / 12) * 4) % 10); }
    cands.push(X.text(x, y, s.join(''), { size: 28, mono: true, fill: C.dim, parent: R }));
  }
  X.text(960, 750, '108 one-digit edits + 11 neighbour swaps, each checked against the customer registry', { size: 30, w: 600, anchor: 'middle', fill: C.muted, parent: R });
  X.show(R, 4, { type: 'fade', out: 5 });
  X.term(4, 'Typo repair', 'try every one-digit fix; keep the one that is a real customer', { until: 5 });
  X.each(t => {
    const p = X.L(4, 0.1, 0.8);
    cands.forEach((c, i) => {
      const lit = Math.floor(p * 24) === i;
      const found = X.t > X.at(4, 0.8) && i === 13;
      c.t.setAttribute('fill', found ? C.green : lit ? C.amber : (p * 24 > i ? '#3c4763' : C.dim));
      c.t.setAttribute('font-weight', found ? 800 : 400);
    });
  });
  const Rs = X.g();
  X.box(260, 440, 640, 300, { label: '99.2%', sub: 'one-typo identifiers caught (was 0%)', size: 110, subSize: 30, color: C.green, stroke: C.green, parent: Rs });
  X.box(1020, 440, 640, 300, { label: '0', sub: 'tokens mistaken for typos', size: 110, subSize: 30, color: C.teal, stroke: C.teal, parent: Rs });
  X.show(Rs, 5, { type: 'pop', out: 6 });
  // red team
  const RT = X.g();
  X.text(960, 210, 'Red team: 26 hiding tricks', { size: 40, w: 700, anchor: 'middle', parent: RT });
  const tiles = [];
  for (let i = 0; i < 26; i++) tiles.push(X.rect(250 + (i % 9) * 160, 270 + Math.floor(i / 9) * 150, 130, 120, { parent: RT, fill: '#2a1320', stroke: C.red, r: 12 }));
  const rtv = X.text(960, 780, '', { size: 44, w: 800, anchor: 'middle', fill: C.teal, parent: RT });
  X.show(RT, 6, { type: 'fade' });
  X.term(6, 'Red team', 'attacking your own system on purpose');
  X.each(t => {
    const p = X.L(6, 0.25, 0.9); let n = 0;
    tiles.forEach((tl, i) => { const open = [5, 11, 19, 24].includes(i); const on = !open && p * 26 > i; if (on) n++; tl.r.setAttribute('fill', on ? '#0f2b2b' : open && p > 0.95 ? '#33270a' : '#2a1320'); tl.r.setAttribute('stroke', on ? C.teal : open && p > 0.95 ? C.amber : C.red); });
    rtv.set(X.t > X.at(6, 0.25) ? `${n} of 26 fully caught` + (p > 0.95 ? ' · 4 left open on purpose' : '') : '');
  });
});

// ============================== LEDGER (M4)
scene('ledger', X => {
  const A = X.g();
  const sw = [];
  for (let i = 0; i < 10; i++) { const c = X.circle(330 + i * 140, 330, 46, { fill: C.panel2, stroke: C.line, sw: 4, parent: A }); sw.push(c); }
  const lb = X.text(960, 470, '', { size: 46, w: 700, anchor: 'middle', parent: A });
  X.text(960, 540, 'each bit = one yes/no answer · each bit doubles the possibilities', { size: 30, w: 500, anchor: 'middle', fill: C.muted, parent: A });
  X.show(A, 0, { type: 'fade', out: 2 });
  X.term(0, 'Bit', 'one yes-or-no answer', { until: 1 });
  X.each(t => {
    const n = Math.min(10, Math.floor(X.L(0, 0.3, 0.95) * 10.99));
    sw.forEach((c, i) => { c.c.setAttribute('fill', i < n ? '#33270a' : C.panel2); c.c.setAttribute('stroke', i < n ? C.amber : C.line); });
    lb.set(n === 0 ? '' : `${n} bit${n > 1 ? 's' : ''} = ${fmt(Math.pow(2, n))} possibilities`);
  });
  const B = X.g();
  X.text(960, 660, '1,000 candidates ≈ 10 bits: a computer tries them all in a blink', { size: 34, w: 600, anchor: 'middle', fill: C.red, parent: B });
  const pb = X.rect(460, 720, 10, 40, { parent: B, fill: C.red, stroke: 'none', r: 6 });
  X.rect(460, 720, 1000, 40, { parent: B, fill: 'none', r: 6 });
  X.show(B, 1, { type: 'up', out: 2 });
  X.each(t => pb.r.setAttribute('width', 10 + 990 * X.P(1, 0.4, 0, 0.8)));
  const Cg = X.g();
  X.text(960, 210, 'Min-entropy: how hard is the best single guess?', { size: 38, w: 700, anchor: 'middle', parent: Cg });
  [['10 bits', '1,000 candidates', 'guessed instantly', C.red, 0.2], ['20 bits', '≈ 1 million candidates', 'Aran\'s minimum', C.amber, 0.5], ['40 bits', 'a full random 12-digit number', 'very hard', C.green, 1]].forEach(([b, c, n, col, w], i) => {
    const y = 290 + i * 160;
    X.rect(200, y, 1400 * w, 110, { parent: Cg, fill: col, stroke: 'none', r: 12, sw: 0 }).style.opacity = 0.25;
    X.text(230, y + 70, b, { size: 44, w: 800, fill: col, parent: Cg });
    X.text(500, y + 70, c + '  ·  ' + n, { size: 32, w: 600, parent: Cg });
  });
  X.show(Cg, 2, { type: 'up', out: 3 });
  X.term(2, 'Min-entropy', 'how hard the best single guess is, in bits', { until: 3 });
  // card mask
  const D = X.g();
  X.text(960, 210, 'A card shown as first 8 + last 4', { size: 36, w: 600, anchor: 'middle', fill: C.muted, parent: D });
  const md = X.digits(960, 250, '65215300????3458', { cw: 62, ch: 84, size: 42, gap: 6, groups: [4, 4, 4], groupGap: 22, parent: D });
  for (let i = 8; i < 12; i++) md.paint(i, '#2a1320', C.red, C.red);
  X.text(960, 430, '4 hidden digits, and the check digit rules out 9 in 10 guesses', { size: 32, w: 600, anchor: 'middle', parent: D });
  X.text(960, 560, '1,000 candidates  =  10 bits', { size: 70, w: 800, anchor: 'middle', fill: C.red, parent: D });
  X.show(D, 3, { type: 'up', out: 4 });
  // join
  const J = X.g();
  X.rect(130, 190, 1660, 420, { parent: J, fill: 'none', stroke: C.amber, dash: '14 10', sw: 3 });
  const tdl = X.text(160, 235, 'trust domain: everything Vendor X can join', { size: 28, w: 700, fill: C.amber, parent: J });
  X.show(tdl, 6, { type: 'fade' });
  X.text(450, 280, 'Vendor X · system A', { size: 30, w: 700, anchor: 'middle', parent: J });
  X.digits(450, 310, '652153XXXXXXXXXX', { cw: 30, ch: 50, size: 24, gap: 3, groups: [4, 4, 4], groupGap: 10, parent: J });
  X.text(450, 410, 'sees the first 6', { size: 26, w: 600, anchor: 'middle', fill: C.muted, parent: J });
  X.text(1470, 280, 'Vendor X · system B', { size: 30, w: 700, anchor: 'middle', parent: J });
  X.digits(1470, 310, 'XXXXXXXXXXXX3458', { cw: 30, ch: 50, size: 24, gap: 3, groups: [4, 4, 4], groupGap: 10, parent: J });
  X.text(1470, 410, 'sees the last 4', { size: 26, w: 600, anchor: 'middle', fill: C.muted, parent: J });
  X.show(J, 4, { type: 'fade', out: 7 });
  const jn = X.g();
  X.arrow(600, 430, 860, 520, { parent: jn, color: C.red }); X.arrow(1320, 430, 1060, 520, { parent: jn, color: C.red });
  X.digits(960, 520, '652153XXXXXX3458', { cw: 30, ch: 50, size: 24, gap: 3, groups: [4, 4, 4], groupGap: 10, parent: jn, color: C.red, stroke: C.red });
  X.show(jn, 5, { type: 'draw', out: 7 });
  const jv = X.text(960, 700, '100,000 candidates  ≈ 16.6 bits', { size: 56, w: 800, anchor: 'middle', fill: C.red });
  X.show(jv, 5, { f: 0.3, type: 'pop', out: 6 });
  const led = X.g();
  X.rect(560, 640, 800, 200, { parent: led, stroke: C.teal, fill: '#0e2224' });
  X.text(600, 690, 'Ledger for Vendor X', { size: 30, w: 800, fill: C.teal, parent: led });
  X.text(600, 740, '✓ system A has seen: first 6 digits', { size: 28, w: 500, parent: led });
  X.text(600, 790, '? system B asks for: last 4 digits', { size: 28, w: 500, parent: led });
  X.show(led, 6, { type: 'up', out: 7 });
  X.term(6, 'Trust domain', 'all systems that can join their data', { until: 7 });
  // refuse
  const Rf = X.g();
  X.text(960, 210, 'The rule: never let a customer fall below 20 bits', { size: 38, w: 700, anchor: 'middle', parent: Rf });
  X.box(260, 300, 620, 300, { label: 'Ask: last 4 digits', sub: 'would leave 16.6 bits', size: 44, color: C.red, stroke: C.red, parent: Rf });
  X.mark(570, 680, false, { parent: Rf, s: 40 });
  X.text(570, 770, 'refused', { size: 40, w: 800, anchor: 'middle', fill: C.red, parent: Rf });
  X.arrow(900, 450, 1020, 450, { parent: Rf, color: C.teal });
  X.box(1040, 300, 620, 300, { label: 'Send a token instead', sub: 'the vendor\'s systems still work', size: 44, color: C.teal, stroke: C.teal, parent: Rf });
  X.show(Rf, 7, { type: 'up', out: 8 });
  const Z = X.g();
  X.text(960, 260, 'customers a vendor could narrow below 20 bits by joining', { size: 34, w: 600, anchor: 'middle', fill: C.muted, parent: Z });
  const zv = X.text(960, 480, '', { size: 160, w: 800, anchor: 'middle', parent: Z });
  X.text(960, 580, 'without the ledger 14,175  →  with the ledger 0', { size: 38, w: 700, anchor: 'middle', parent: Z });
  X.show(Z, 8, { type: 'pop' });
  X.each(t => { const p = X.P(8, 0.4, 0, 1.6); zv.set(fmt(14175 * (1 - p))); zv.t.setAttribute('fill', p > 0.99 ? C.green : C.red); });
});

// ============================== ERASURE (M5)
scene('erasure', X => {
  const D = window.DATA.merkle;
  const places = [['log', 'Log files', 300], ['db', 'Backups', 700], ['server', 'Vendor systems', 1100], ['brain', 'AI caches', 1500]];
  const A = X.g();
  const copies = places.map(([ic, n, x]) => {
    const g = X.g(A);
    X.icon(ic, x + 60, 300, 0.9, { parent: g, color: C.muted });
    X.text(x + 60, 410, n, { size: 30, w: 600, anchor: 'middle', parent: g });
    const tk = X.chip(x + 60, 470, '7319 0484 2216', { size: 24, mono: true, color: C.red, parent: g });
    return tk;
  });
  X.show(A, 0, { type: 'fade', out: 1 });
  X.term(0, 'Right to erasure', 'a person can ask for their data to be deleted', { until: 1 });
  // vault
  const V = X.g();
  X.rect(200, 220, 900, 360, { parent: V, stroke: C.blue });
  X.icon('lock', 1180, 400, 1.3, { parent: V, color: C.blue });
  X.text(260, 280, 'token', { size: 28, w: 700, fill: C.muted, parent: V });
  X.text(700, 280, 'real value (encrypted)', { size: 28, w: 700, fill: C.muted, parent: V });
  [['7319 0484 2216', '▒▒▒▒ ▒▒▒▒ ▒▒▒▒'], ['5520 9187 0043', '▒▒▒▒ ▒▒▒▒ ▒▒▒▒'], ['8846 1302 7759', '▒▒▒▒ ▒▒▒▒ ▒▒▒▒']].forEach(([a, b], i) => {
    X.text(260, 350 + i * 70, a, { size: 32, mono: true, fill: C.teal, parent: V });
    X.text(700, 350 + i * 70, b, { size: 32, mono: true, fill: C.blue, parent: V });
  });
  X.text(1180, 520, 'the vault', { size: 32, w: 700, anchor: 'middle', fill: C.blue, parent: V });
  X.show(V, 1, { type: 'up', out: 2 });
  X.term(1, 'Vault', 'a locked table linking random tokens to real values', { until: 2 });
  // keys
  const K = X.g();
  const kn = ['Servicing', 'Marketing', 'Loans', 'KYC'];
  const keys = kn.map((n, i) => {
    const g = X.g(K);
    X.icon('key', 320 + i * 430, 330, 1.2, { parent: g, color: C.amber });
    X.text(320 + i * 430, 440, n, { size: 34, w: 700, anchor: 'middle', parent: g });
    X.show(g, 2, { f: 0.2 + i * 0.15, type: 'pop' });
    return g;
  });
  X.text(960, 210, "Ravi's keys: one per purpose", { size: 34, w: 600, anchor: 'middle', fill: C.muted, parent: K });
  X.show(K, 2, { type: 'fade', out: 5 });
  // shred loans key: fragments
  const frag = X.g();
  const fr = [];
  for (let i = 0; i < 12; i++) fr.push(E('rect', { x: 0, y: 0, width: 18, height: 10, fill: C.amber }, frag));
  const gone = X.g();
  X.text(1180, 560, 'every copy of the loans tokens: meaningless', { size: 32, w: 700, anchor: 'middle', fill: C.muted, parent: gone });
  ['Log files', 'Backups', 'Vendor', 'AI cache'].forEach((n, i) => X.chip(800 + i * 250, 640, n + ' ✗', { size: 24, color: C.dim, parent: gone, width: 220 }));
  X.show(gone, 3, { f: 0.4, type: 'up', out: 4 });
  X.term(3, 'Crypto-shredding', 'destroy the key, and every copy becomes unreadable', { until: 4 });
  X.each(t => {
    const p = X.P(3, 0.15, 0, 1.0);
    keys[2].style.opacity = X.t > X.at(3, 0.15) ? (1 - p) * (keys[2].style.opacity || 1) : keys[2].style.opacity;
    fr.forEach((r, i) => {
      const a = i * 0.52, d = 40 + 260 * p;
      r.setAttribute('x', 1180 + Math.cos(a) * d); r.setAttribute('y', 330 + Math.sin(a) * d * 0.7 + 200 * p * p);
      r.setAttribute('opacity', X.t > X.at(3, 0.15) && X.t < X.at(4) ? (1 - p) : 0);
      r.setAttribute('transform', `rotate(${i * 40 + 300 * p} ${1180 + Math.cos(a) * d} ${330 + Math.sin(a) * d * 0.7})`);
    });
  });
  // KYC legal hold
  const KY = X.g();
  X.icon('lock', 1610, 300, 0.7, { parent: KY, color: C.red });
  X.box(500, 540, 520, 120, { label: '"Erase my KYC data"', size: 34, parent: KY });
  const ref = X.box(1100, 540, 640, 120, { label: 'Refused: legal hold (423 Locked)', size: 32, color: C.red, stroke: C.red, parent: KY });
  X.show(ref, 4, { f: 0.3, type: 'pop' });
  const clk = X.text(960, 760, '', { size: 34, w: 700, anchor: 'middle', fill: C.amber, parent: KY });
  X.show(KY, 4, { type: 'fade', out: 5 });
  X.term(4, 'Legal hold', 'data the law says must be kept for a time', { until: 5 });
  X.each(t => {
    if (X.t < X.at(4)) return;
    const p = X.L(4, 0.6, 1);
    clk.set(p <= 0 ? '' : p < 1 ? `retention period running… year ${1 + Math.floor(p * 5)}` : 'retention ended → KYC key destroyed automatically');
    if (X.t > X.at(4, 0.98)) keys[3].style.opacity = 0.15;
  });
  // theorem 3
  const th = X.g();
  X.rect(260, 260, 1400, 380, { parent: th, stroke: C.teal, sw: 4, fill: '#0e2224' });
  X.text(960, 350, 'THEOREM 3 · erasure by key destruction', { size: 34, w: 800, fill: C.teal, anchor: 'middle', ls: 2, parent: th });
  X.text(960, 450, 'Once the key is destroyed, every copy of the token', { size: 44, w: 600, anchor: 'middle', parent: th });
  X.text(960, 520, 'reveals nothing about the customer.', { size: 44, w: 600, anchor: 'middle', parent: th });
  X.text(960, 590, 'Why: the token was random; its only link was the vault entry, now unreadable.', { size: 26, w: 500, fill: C.muted, anchor: 'middle', parent: th });
  X.show(th, 5, { type: 'pop', out: 6 });
  // Merkle tree
  const M = X.g();
  const lx = [330, 750, 1170, 1590], ly = 640, my = 470, ry = 300;
  const nodes = {};
  const node = (id, x, y, label, w = 220) => { const b = X.box(x - w / 2, y - 40, w, 80, { label, mono: true, size: 30, parent: M }); nodes[id] = b; return b; };
  D.leaves.forEach((l, i) => { X.text(lx[i], 760, l, { size: 24, w: 600, anchor: 'middle', fill: C.muted, parent: M }); X.arrow(lx[i], 730, lx[i], 690, { parent: M, sw: 3, head: 12 }); });
  D.L.forEach((h, i) => node('L' + i, lx[i], ly, h));
  node('n12', 540, my, D.n12); node('n34', 1380, my, D.n34);
  node('root', 960, ry, D.root, 260);
  [[0, 540], [1, 540], [2, 1380], [3, 1380]].forEach(([i, x]) => E('line', { x1: lx[i], y1: ly - 40, x2: x, y2: my + 40, stroke: C.line, 'stroke-width': 3 }, M));
  E('line', { x1: 540, y1: my - 40, x2: 960, y2: ry + 40, stroke: C.line, 'stroke-width': 3 }, M);
  E('line', { x1: 1380, y1: my - 40, x2: 960, y2: ry + 40, stroke: C.line, 'stroke-width': 3 }, M);
  X.text(960, 225, 'root', { size: 30, w: 800, anchor: 'middle', fill: C.amber, parent: M });
  X.show(M, 6, { type: 'fade', out: 10 });
  X.term(6, 'Merkle tree', 'hashes of hashes, up to one root', { until: 7 });
  X.each(t => {
    const p = X.L(6, 0.1, 0.9);
    const lvl = { L0: 0, L1: 0, L2: 0, L3: 0, n12: 1, n34: 1, root: 2 };
    for (const id in nodes) nodes[id].style.opacity = X.t < X.at(7) ? (p * 3 > lvl[id] ? 1 : 0.08) : 1;
    const tam = X.t > X.at(7, 0.2) && X.t < X.at(8);
    nodes.L2.t.set(tam ? D.L3b : D.L[2]); nodes.n34.t.set(tam ? D.n34b : D.n34); nodes.root.t.set(tam ? D.rootb : D.root);
    ['L2', 'n34', 'root'].forEach(id => { nodes[id].r.setAttribute('stroke', tam ? C.red : C.line); nodes[id].t.t.setAttribute('fill', tam ? C.red : C.text); });
    const pr = X.t > X.at(8) && X.t < X.at(10);
    nodes.L0.r.setAttribute('stroke', pr ? C.green : (tam ? C.line : C.line));
    ['L1', 'n34'].forEach(id => { if (pr) { nodes[id].r.setAttribute('stroke', C.amber); nodes[id].r.setAttribute('stroke-width', 5); } else if (!tam) { nodes[id].r.setAttribute('stroke-width', 2); } });
    if (pr && X.t > X.at(8, 0.6)) nodes.root.r.setAttribute('stroke', C.green);
  });
  const tm = X.text(960, 850 - 20, 'one record changed → the root changes', { size: 30, w: 700, anchor: 'middle', fill: C.red });
  X.show(tm, 7, { f: 0.25, out: 8 });
  const ip = X.text(960, 830, 'receipt = your record + 2 sibling hashes → rebuild the root ✓', { size: 30, w: 700, anchor: 'middle', fill: C.green });
  X.show(ip, 8, { f: 0.2, out: 9 });
  X.term(8, 'Inclusion proof', 'the few hashes that prove a record is in the tree', { until: 9 });
  // signature (on top of faded tree)
  const S = X.g();
  X.rect(140, 180, 1640, 680, { parent: S, fill: C.bg, stroke: 'none' });
  X.icon('file', 330, 420, 1.6, { parent: S, color: C.text });
  X.text(330, 580, 'erasure receipt', { size: 30, w: 700, anchor: 'middle', parent: S });
  X.icon('key', 640, 300, 0.9, { parent: S, color: C.red });
  X.text(640, 370, 'private key (bank)', { size: 26, w: 700, anchor: 'middle', fill: C.red, parent: S });
  X.arrow(470, 420, 800, 420, { parent: S });
  X.box(820, 360, 300, 120, { label: 'signature', size: 36, stroke: C.amber, color: C.amber, parent: S });
  X.arrow(1140, 420, 1320, 420, { parent: S });
  X.icon('key', 1450, 300, 0.9, { parent: S, color: C.green });
  X.text(1450, 370, 'public key (anyone)', { size: 26, w: 700, anchor: 'middle', fill: C.green, parent: S });
  X.mark(1450, 460, true, { parent: S, s: 40 });
  X.text(1450, 540, 'genuine', { size: 30, w: 700, anchor: 'middle', fill: C.green, parent: S });
  X.mark(1650, 460, false, { parent: S, s: 40 });
  X.text(1650, 540, 'forged', { size: 30, w: 700, anchor: 'middle', fill: C.red, parent: S });
  X.text(960, 700, 'signed twice: Ed25519 and the post-quantum ML-DSA', { size: 30, w: 600, anchor: 'middle', fill: C.muted, parent: S });
  X.show(S, 9, { type: 'fade', out: 10 });
  X.term(9, 'Digital signature', 'proof, made with a private key, that a document is genuine', { until: 10 });
  const P = X.g();
  X.icon('phone', 960, 430, 2.4, { parent: P, color: C.text });
  X.mark(960, 420, true, { parent: P, s: 44 });
  X.text(960, 650, 'receipt verified on the customer\'s own phone', { size: 36, w: 700, anchor: 'middle', fill: C.green, parent: P });
  X.show(P, 10, { type: 'pop' });
});

// ============================== IMMUNE
scene('immune', X => {
  const A = X.g();
  X.icon('clock', 380, 380, 1.4, { parent: A, color: C.amber });
  X.text(380, 520, '2:00 AM', { size: 48, w: 800, anchor: 'middle', fill: C.amber, parent: A });
  X.icon('person', 800, 380, 1.4, { parent: A, color: C.red });
  X.text(800, 520, 'a staff account', { size: 30, w: 600, anchor: 'middle', parent: A });
  const dn = X.text(1350, 380, '0', { size: 96, w: 800, anchor: 'middle', fill: C.red, parent: A });
  X.text(1350, 450, 'records detokenised', { size: 32, w: 600, anchor: 'middle', parent: A });
  X.text(1350, 520, 'each single call looks allowed ✓', { size: 28, w: 500, anchor: 'middle', fill: C.muted, parent: A });
  X.show(A, 0, { type: 'fade', out: 1 });
  X.each(t => dn.set(fmt(3000 * X.L(0, 0.2, 0.9))));
  // thymus
  const T = X.g();
  E('ellipse', { cx: 960, cy: 470, rx: 300, ry: 220, fill: '#151f38', stroke: C.violet, 'stroke-width': 4 }, T);
  X.text(960, 230, 'thymus', { size: 34, w: 800, anchor: 'middle', fill: C.violet, parent: T });
  const selfs = [[900, 420], [1010, 520], [960, 380]];
  selfs.forEach(([x, y]) => E('rect', { x: x - 22, y: y - 22, width: 44, height: 44, rx: 6, fill: C.green, opacity: 0.8 }, T));
  X.text(960, 750, 'cells that attack the body itself are destroyed; the rest go to work', { size: 30, w: 600, anchor: 'middle', parent: T });
  const cells = [];
  for (let i = 0; i < 9; i++) { const c = E('circle', { r: 20, fill: C.blue }, T); const x = E('text', { 'font-size': 44, 'font-weight': 800, fill: C.red, 'text-anchor': 'middle', 'font-family': 'Inter' }, T); x.textContent = '✗'; cells.push({ c, x, bad: [1, 4, 7].includes(i), k: i }); }
  X.show(T, 1, { type: 'fade', out: 3 });
  X.term(1, 'Thymus', 'the organ that trains immune cells', { until: 2 });
  X.each(t => {
    const u = X.L(1, 0.1, 1) * 1.0 + X.L(2) * 1.0;
    cells.forEach(cl => {
      const s = clamp(u * 1.4 - cl.k * 0.08, 0, 1);
      const y0 = 330 + (cl.k % 3) * 120;
      let x = lerp(560, 1400, s);
      if (cl.bad && s > 0.45) x = lerp(560, 1400, 0.45);
      cl.c.setAttribute('cx', x); cl.c.setAttribute('cy', y0);
      cl.c.setAttribute('opacity', s <= 0 ? 0 : cl.bad && s > 0.55 ? 0.15 : 1);
      cl.x.setAttribute('x', x); cl.x.setAttribute('y', y0 + 15); cl.x.setAttribute('opacity', cl.bad && s > 0.5 ? 1 : 0);
      cl.c.setAttribute('fill', cl.bad && s > 0.45 ? C.red : C.blue);
    });
  });
  const NS2 = X.chip(960, 840, 'negative selection: delete what attacks "self", keep the rest', { size: 28, color: C.amber });
  X.show(NS2, 2, { type: 'up', out: 3 });
  X.term(2, 'Negative selection', 'delete what matches "self", keep the rest', { until: 3 });
  // features -> plane
  const F = X.g();
  X.text(420, 200, 'one data flow', { size: 30, w: 700, anchor: 'middle', fill: C.muted, parent: F });
  const feats = [['volume', 0.6], ['hour', 0.3], ['raw share', 0.15], ['detokenise rate', 0.2], ['… 3 more', 0.45]];
  feats.forEach(([n, v], i) => {
    const y = 250 + i * 95;
    X.text(160, y + 40, n, { size: 26, w: 600, parent: F });
    X.rect(400, y + 10, 400 * v + 10, 44, { parent: F, fill: C.blue, stroke: 'none', r: 8 });
  });
  X.text(420, 760, '7 numbers → one point in space', { size: 30, w: 700, anchor: 'middle', fill: C.amber, parent: F });
  X.show(F, 3, { type: 'left', out: 6 });
  X.term(3, 'Feature space', 'each flow becomes a point; similar flows sit close', { until: 4 });
  const Pl = X.g();
  X.rect(980, 170, 840, 640, { parent: Pl, fill: '#0d1528' });
  const cp = E('clipPath', { id: 'plclip' }, Pl); E('rect', { x: 982, y: 172, width: 836, height: 636 }, cp);
  const PlIn = E('g', { 'clip-path': 'url(#plclip)' }, Pl);
  const rnd = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
  const selfPts = [];
  for (let i = 0; i < 60; i++) { const a = rnd(i, 1) * Math.PI * 2, r = Math.sqrt(rnd(i, 2)) * 130; selfPts.push([1300 + Math.cos(a) * r * 1.3, 500 + Math.sin(a) * r]); }
  const sp = selfPts.map(([x, y]) => E('circle', { cx: x, cy: y, r: 7, fill: C.green, opacity: 0 }, Pl));
  const selfLbl = X.text(1300, 690, 'self: normal flows', { size: 28, w: 700, anchor: 'middle', fill: C.green, parent: Pl });
  X.show(selfLbl, 4, { f: 0.3 });
  X.show(Pl, 3, { f: 0.4, type: 'fade' });
  X.each(t => { const p = X.L(4, 0, 0.6); sp.forEach((c, i) => c.setAttribute('opacity', p * 60 > i ? 0.9 : 0)); });
  // detectors
  const dets = [];
  for (let i = 0; i < 26; i++) {
    const x = 1010 + rnd(i, 3) * 780, y = 200 + rnd(i, 4) * 580, r = 30 + rnd(i, 5) * 70;
    const dx = (x - 1300) / 1.3, dy = y - 500; const dist = Math.sqrt(dx * dx + dy * dy);
    const bad = dist < r + 135;
    dets.push({ c: E('circle', { cx: x, cy: y, r, fill: C.violet, 'fill-opacity': 0.12, stroke: C.violet, 'stroke-width': 2, opacity: 0 }, PlIn), bad, k: i });
  }
  X.term(5, 'Detectors', 'random circles that survive only if they avoid "self"', { until: 6 });
  X.each(t => {
    const p = X.L(5, 0, 0.5), q = X.L(5, 0.55, 0.95);
    dets.forEach(d => {
      let o = p * 26 > d.k ? 1 : 0;
      if (d.bad) { o *= 1 - clamp(q * 26 - d.k); d.c.setAttribute('stroke', q > 0 ? C.red : C.violet); }
      d.c.setAttribute('opacity', o);
    });
  });
  // insider
  const ins = X.g(Pl);
  const ix = 1010 + rnd(2, 3) * 780, iy = 200 + rnd(2, 4) * 580;
  const target = dets.find(d => !d.bad);
  const tx = +target.c.getAttribute('cx'), ty = +target.c.getAttribute('cy');
  X.circle(tx, ty, 13, { fill: C.red, parent: ins });
  const ring = X.circle(tx, ty, 30, { stroke: C.red, sw: 4, parent: ins });
  X.text(tx, ty - 45, '2 AM insider', { size: 26, w: 800, anchor: 'middle', fill: C.red, parent: ins });
  X.show(ins, 6, { type: 'pop', out: 7 });
  const al = X.g();
  X.icon('alert', 420, 450, 1.6, { parent: al, color: C.red });
  X.text(420, 620, 'ALERT', { size: 64, w: 800, anchor: 'middle', fill: C.red, parent: al });
  X.show(al, 6, { f: 0.35, type: 'pop', out: 7 });
  X.each(t => { const ph = (X.t * 1.5) % 1; ring.c.setAttribute('r', 20 + 40 * ph); ring.c.setAttribute('opacity', 1 - ph); });
  X.show(Pl, 3, { f: 0.4, type: 'fade', out: 7 });
  // results
  const R = X.g();
  X.text(960, 210, 'Six simulated attack types caught', { size: 38, w: 700, anchor: 'middle', parent: R });
  const bars = [['Immune layer', 100, C.teal, '100%  (0.6% false alarms)'], ['Static rules', 90, C.blue, '90%'], ['Isolation Forest', 20, C.muted, '20%']];
  const bs = bars.map(([n, v, col, l], i) => {
    const y = 300 + i * 150;
    X.text(150, y + 60, n, { size: 32, w: 700, parent: R });
    const b = X.rect(480, y + 10, 10, 80, { parent: R, fill: col, stroke: 'none', r: 10 });
    const lt = X.text(0, y + 64, l, { size: 32, w: 800, fill: col, parent: R });
    return { b, v, lt };
  });
  X.show(R, 7, { type: 'fade', out: 8 });
  X.each(t => { const p = X.P(7, 0.2, 0, 1.2); bs.forEach(k => { const w = 10 + 9 * k.v * p; k.b.r.setAttribute('width', w); k.lt.t.setAttribute('x', 500 + w); }); });
  const Mm = X.g();
  X.text(960, 230, 'Immune memory', { size: 40, w: 800, anchor: 'middle', fill: C.violet, parent: Mm });
  X.text(560, 330, 'first time', { size: 32, w: 600, anchor: 'middle', fill: C.muted, parent: Mm });
  X.text(560, 470, '0.37', { size: 110, w: 800, anchor: 'middle', parent: Mm });
  X.arrow(800, 430, 1100, 430, { parent: Mm, color: C.violet });
  X.text(1360, 330, 'repeat attack', { size: 32, w: 600, anchor: 'middle', fill: C.muted, parent: Mm });
  X.text(1360, 470, '0.71', { size: 110, w: 800, anchor: 'middle', fill: C.red, parent: Mm });
  X.text(960, 600, 'alarm score: it reacts faster the second time', { size: 32, w: 600, anchor: 'middle', parent: Mm });
  X.show(Mm, 8, { type: 'pop', out: 9 });
  const Ow = X.g();
  X.text(960, 400, 'The biology plan', { size: 64, w: 800, anchor: 'middle', fill: C.violet, parent: Ow });
  X.text(960, 490, 'owned by the cybersecurity pair', { size: 36, w: 600, anchor: 'middle', parent: Ow });
  X.text(960, 560, 'Inbathamizhan S · Aasif Ahmed A', { size: 36, w: 700, anchor: 'middle', fill: C.amber, parent: Ow });
  X.show(Ow, 9, { type: 'pop' });
});
