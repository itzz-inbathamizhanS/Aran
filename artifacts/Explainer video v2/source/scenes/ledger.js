// When masks leak: counting what is left (lock codes, bits as yes/no questions), the card mask, the jigsaw join,
// and the leakage ledger that refuses anything leaving fewer than about a million possibilities (20 bits).
scene('ledger', X => {
  const R = { a: [0, 0], lock: [2000, 0], bits: [2000, 1100], card: [0, 1100], jig: [4000, 0], led: [4000, 1100], zero: [6000, 1100] };
  const cx = r => R[r][0] + 960, cy = r => R[r][1] + 540;
  X.cam([
    { x: 760, y: 470, s: 1.3 },
    { k: 0, f: 0.75, x: 960, y: 540, s: 1, len: 1.5 },
    { k: 2, x: cx('lock'), y: cy('lock'), s: 1, len: 1.8 },
    { k: 3, x: cx('bits'), y: cy('bits'), s: 1, len: 1.8 },
    { k: 4, x: cx('card'), y: cy('card'), s: 1, len: 1.8 },
    { k: 5, x: cx('jig'), y: cy('jig'), s: 1.15, len: 2.2 },
    { k: 6, x: cx('jig'), y: cy('jig'), s: 1, len: 1.4 },
    { k: 8, x: 4000 + 760, y: 1100 + 540, s: 1.15, len: 1.8 },
    { k: 10, x: cx('led'), y: cy('led'), s: 1, len: 1.4 },
    { k: 12, x: cx('zero'), y: cy('zero'), s: 1, len: 1.8 }
  ]);
  const CARD = '1234567890123456';
  const cardRow = (cxx, y, show, o = {}) => {
    const d = X.digits(cxx, y, CARD, Object.assign({ groups: [4, 4, 4, 4], cw: 52, ch: 72, size: 36, gap: 5, groupGap: 20 }, o));
    for (let i = 0; i < 16; i++) if (!show(i)) { d.cells[i].t.textContent = ''; d.paint(i, o.hideFill || C.ink, o.hideStroke || C.ink); }
    return d;
  };

  // ---------- region a: the black marker, and leaks (cues 0-1) ----------
  const cardG = X.g();
  X.rect(220, 220, 1080, 400, { parent: cardG, fill: C.blueL, stroke: C.blue, r: 30, shadow: true, sw: 3 });
  E('rect', { x: 290, y: 290, width: 90, height: 66, rx: 10, fill: C.ochre }, cardG);
  X.text(1240, 330, 'BANK CARD', { parent: cardG, size: 28, w: 700, anchor: 'end', fill: C.blue, ls: 2 });
  const row0 = X.digits(760, 410, CARD, { parent: cardG, groups: [4, 4, 4, 4], cw: 52, ch: 72, size: 36, gap: 5, groupGap: 20 });
  X.text(290, 570, 'an example card number', { parent: cardG, size: 24, fill: C.ink2 });
  X.show(cardG, 0, { type: 'up' });
  const marker = X.g(); const mIn = X.g(marker);
  E('rect', { x: -16, y: -130, width: 32, height: 110, rx: 8, fill: C.ink, stroke: C.ink, 'stroke-width': 2 }, mIn);
  E('rect', { x: -12, y: -150, width: 24, height: 26, rx: 5, fill: C.ink2 }, mIn);
  E('path', { d: 'M-12,-22 L12,-22 L4,0 L-4,0 Z', fill: C.ink }, mIn);
  X.show(marker, 0, { f: 0.08, type: 'fade', out: 0, outf: 0.6 });
  X.each(t => {
    const p = X.L(0, 0.12, 0.45);
    const x = lerp(row0.cells[6].x - 10, row0.cells[11].x + 60, p);
    mIn.setAttribute('transform', `translate(${x.toFixed(1)} ${(450 + 8 * Math.sin(p * 30)).toFixed(1)}) rotate(20)`);
    for (let i = 6; i < 12; i++) {
      const done = t > X.at(0, 0.12) && x > row0.cells[i].x + 26;
      row0.paint(i, done ? C.ink : C.card, done ? C.ink : C.line);
    }
  });
  const safe = X.chip(760, 180 + 0, 'masked: looks safe', { size: 28, color: C.ink, fill: C.card });
  X.show(safe, 0, { f: 0.45, type: 'pop', out: 1 });
  // drips leaking from the black cells
  const drips = [];
  for (let i = 0; i < 6; i++) {
    const c = row0.cells[6 + i];
    const d = E('path', { d: 'M0,-12 Q10,4 0,10 Q-10,4 0,-12 Z', fill: C.red }, X.root);
    drips.push({ d, x: c.cx, y0: c.y + c.h, ph: i * 0.37 });
  }
  X.each(t => drips.forEach(dr => {
    const on = t > X.at(0, 0.7);
    dr.d.style.display = on ? '' : 'none'; if (!on) return;
    const u = ((t * 0.8 + dr.ph) % 1);
    dr.d.setAttribute('transform', `translate(${dr.x} ${(dr.y0 + 10 + u * 260).toFixed(1)})`);
    dr.d.setAttribute('opacity', (1 - u).toFixed(2));
  }));
  const leakL = X.chip(760, 690, 'but a mask can leak', { size: 30, color: C.red, fill: C.redL });
  X.show(leakL, 0, { f: 0.75, type: 'pop', out: 1 });
  // cue 1: count what is left
  const cnt = X.g();
  X.rect(1360, 220, 460, 660, { parent: cnt, fill: C.card, r: 22, shadow: true });
  X.text(1590, 280, 'possible numbers', { parent: cnt, size: 30, anchor: 'middle', w: 600 });
  X.text(1590, 318, 'still left', { parent: cnt, size: 30, anchor: 'middle', w: 600 });
  const dots = [];
  for (let i = 0; i < 80; i++) dots.push(X.circle(1415 + (i % 10) * 39, 380 + Math.floor(i / 10) * 39, 13, { parent: cnt, fill: C.blue }));
  const cv = X.text(1590, 820, '', { parent: cnt, size: 46, anchor: 'middle', w: 700, mono: true });
  X.show(cnt, 1, { type: 'left' });
  X.each(() => {
    const p = X.L(1, 0.35, 0.8);
    const keep = Math.round(lerp(80, 2, easeOut(p)));
    dots.forEach((d, i) => d.c.setAttribute('fill', i < keep ? C.blue : C.sand));
    cv.set(fmtUS(Math.pow(10, lerp(6, 3, easeOut(p)))));
    cv.t.setAttribute('fill', p > 0.95 ? C.red : C.ink);
  });
  const ruler = X.icon('magnifier', 1300, 760, 0.8, { color: C.ink });
  X.show(ruler, 1, { f: 0.2, type: 'pop', out: 2 });

  // ---------- region lock: guessing a lock code (cue 2) ----------
  const [lx, ly] = R.lock;
  const lockG = X.g();
  const shackle = E('path', { d: `M${lx + 480},${ly + 470} L${lx + 480},${ly + 360} Q${lx + 480},${ly + 250} ${lx + 600},${ly + 250} Q${lx + 720},${ly + 250} ${lx + 720},${ly + 360} L${lx + 720},${ly + 470}`, fill: 'none', stroke: C.ink, 'stroke-width': 26, 'stroke-linecap': 'round' }, lockG);
  X.rect(lx + 380, ly + 450, 440, 340, { parent: lockG, fill: C.ochreL, stroke: C.ink, r: 30, sw: 6 });
  const dials = X.digits(lx + 600, ly + 560, '000', { parent: lockG, cw: 84, ch: 110, size: 64, gap: 14 });
  X.text(lx + 600, ly + 740, '3-digit code', { parent: lockG, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(lockG, 2, { type: 'pop' });
  const lt = X.text(lx + 960, ly + 200, 'Only 1,000 possible codes', { size: 44, serif: true, anchor: 'middle', w: 600 });
  X.show(lt, 2, { f: 0.05, type: 'down' });
  const lap = X.g();
  X.icon('laptop', lx + 1300, ly + 470, 1.8, { parent: lap });
  const tried = X.text(lx + 1300, ly + 640, '', { parent: lap, size: 40, anchor: 'middle', w: 700, mono: true });
  X.text(lx + 1300, ly + 690, 'codes tried', { parent: lap, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(lap, 2, { f: 0.2, type: 'left' });
  const clk = X.g(); const clkI = X.icon('clock', lx + 1580, ly + 470, 0.9, { parent: clk });
  X.text(lx + 1580, ly + 570, '1 second', { parent: clk, size: 32, anchor: 'middle', w: 700 });
  X.show(clk, 2, { f: 0.3, type: 'pop' });
  X.spin(clkI.mid, lx + 1580, ly + 470, { speed: 240 });
  const arr = X.arrow(lx + 1180, ly + 560, lx + 860, ly + 610, { color: C.ochre, bend: -0.2 });
  X.show(arr, 2, { f: 0.3, type: 'draw' });
  X.each(t => {
    const p = X.L(2, 0.35, 0.62);
    const n = Math.floor(p * 738);
    dials.set(String(n).padStart(3, '0'));
    tried.set(fmtUS(Math.floor(p * 1000)));
    const open = X.P(2, 0.64, 0, 0.5);
    shackle.setAttribute('transform', `translate(0 ${(-50 * open).toFixed(1)})`);
    for (let i = 0; i < 3; i++) dials.paint(i, open > 0 ? C.redL : C.card, open > 0 ? C.red : C.line);
  });
  const opened = X.chip(lx + 600, ly + 860, 'open, in under a second', { size: 30, color: C.red, fill: C.redL });
  X.show(opened, 2, { f: 0.66, type: 'pop' });

  // ---------- region bits: 20 questions (cue 3) ----------
  const [bx, by] = R.bits;
  const bt = X.text(bx + 120, by + 220, 'Each yes-or-no question halves what is left', { size: 40, serif: true, w: 600 });
  X.show(bt, 3, { type: 'down' });
  const counts = [1000, 500, 250, 125, 63, 32, 16, 8, 4, 2, 1];
  const nodes = counts.map((n, i) => {
    const x = bx + 180 + i * 158, y = by + 320 + i * 50;
    const g = X.g();
    X.rect(x - 64, y - 30, 128, 60, { parent: g, fill: i === 10 ? C.greenL : C.card, stroke: i === 10 ? C.green : C.blue, r: 30 });
    X.text(x, y + 12, fmtUS(n), { parent: g, size: 30, w: 700, anchor: 'middle', mono: true, fill: i === 10 ? C.green : C.ink });
    // a shrinking bar for how many are left
    X.show(g, 3, { f: 0.08 + i * 0.07, type: 'pop', len: 0.4 });
    if (i > 0) {
      const q = X.g();
      const px = bx + 180 + (i - 0.5) * 158, py = by + 320 + (i - 1) * 50 - 8;
      X.text(px + 28, py, 'yes/no?', { parent: q, size: 22, anchor: 'middle', w: 700, fill: C.ochre });
      E('path', { d: `M${px - 16},${py + 26} L${px + 14},${py + 48}`, stroke: C.ochre, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, q);
      X.show(q, 3, { f: 0.05 + i * 0.07, type: 'fade', len: 0.3 });
    }
    return g;
  });
  const bitsT = X.text(bx + 160, by + 860, '', { size: 44, w: 700, fill: C.blue });
  X.each(() => { const n = Math.max(0, Math.min(10, Math.floor((X.L(3, 0.08, 0.78)) * 10.99))); bitsT.set(X.t > X.at(3, 0.12) ? `${n} question${n === 1 ? '' : 's'} = ${n} bit${n === 1 ? '' : 's'}` : ''); });
  const tenL = X.chip(bx + 1450, by + 330, '1,000 choices ≈ 10 bits', { size: 32, color: C.blue, fill: C.blueL });
  X.show(tenL, 3, { f: 0.82, type: 'pop' });
  X.term(3, 'Bit', 'One yes-or-no question. Every extra bit\ndoubles the number of possibilities.', { f: 0.1, until: 4 });

  // ---------- region card: first 8 + last 4 (cue 4) ----------
  const [kx, ky] = R.card;
  const ct = X.text(kx + 960, ky + 220, 'A card shown as the first 8 and the last 4 digits', { size: 40, serif: true, anchor: 'middle', w: 600 });
  X.show(ct, 4, { type: 'down' });
  const shown = i => i < 8 || i >= 12;
  const row4 = cardRow(kx + 960, ky + 300, shown, { cw: 62, ch: 86, size: 44, hideFill: C.ochreL, hideStroke: C.ochre, groupGap: 26 });
  X.show(row4, 4, { f: 0.05, type: 'up' });
  const rr4 = rng(4);
  X.each(t => {
    for (let i = 8; i < 12; i++) row4.cells[i].t.textContent = t > X.at(4, 0.2) ? String(Math.floor((t * 13 + i * 3.7) % 10)) : '';
  });
  const s1 = X.g();
  X.text(kx + 560, ky + 520, '4 hidden digits', { parent: s1, size: 32, anchor: 'middle', fill: C.ink2 });
  const v1 = X.text(kx + 560, ky + 600, '', { parent: s1, size: 64, anchor: 'middle', w: 700, mono: true });
  X.count(v1, 0, 10000, 4, { f0: 0.2, f1: 0.4 });
  X.show(s1, 4, { f: 0.2, type: 'up' });
  const a4 = X.arrow(kx + 800, ky + 570, kx + 1100, ky + 570, { color: C.ink2 });
  X.show(a4, 4, { f: 0.45, type: 'draw' });
  const a4l = X.text(kx + 950, ky + 530, 'check digit keeps 1 in 10', { size: 24, anchor: 'middle', fill: C.ink2 });
  X.show(a4l, 4, { f: 0.45, type: 'fade' });
  const s2 = X.g();
  X.text(kx + 1360, ky + 520, 'possible numbers left', { parent: s2, size: 32, anchor: 'middle', fill: C.ink2 });
  X.text(kx + 1360, ky + 600, '1,000', { parent: s2, size: 64, anchor: 'middle', w: 700, mono: true, fill: C.red });
  X.show(s2, 4, { f: 0.55, type: 'pop' });
  const few = X.g();
  X.rect(kx + 560, ky + 700, 800, 110, { parent: few, fill: C.redL, stroke: C.red, r: 20 });
  X.icon('unlock', kx + 640, ky + 760, 0.5, { parent: few, color: C.red });
  X.text(kx + 700, ky + 770, 'far too few: tried in a blink', { parent: few, size: 36, w: 700, fill: C.red });
  X.show(few, 4, { f: 0.7, type: 'up' });

  // ---------- region jig: joining pieces (cues 5-7) ----------
  const [jx, jy] = R.jig;
  // two jigsaw pieces snapping together
  const pzL = X.g(), pzR = X.g();
  E('path', { d: 'M-180,-110 L0,-110 L0,-40 A34,34 0 1 1 0,30 L0,110 L-180,110 Z', fill: C.blueL, stroke: C.blue, 'stroke-width': 5, 'stroke-linejoin': 'round' }, pzL);
  E('path', { d: 'M0,-110 L180,-110 L180,110 L0,110 L0,30 A34,34 0 1 0 0,-40 Z', fill: C.plumL, stroke: C.plum, 'stroke-width': 5, 'stroke-linejoin': 'round' }, pzR);
  const pzW = X.g(); pzW.appendChild(pzL); pzW.appendChild(pzR);
  X.show(pzW, 5, { type: 'pop', out: 6, outLen: 0.4 });
  X.each(() => {
    const p = ease(X.L(5, 0.2, 0.6));
    pzL.setAttribute('transform', `translate(${jx + 960 - 200 * (1 - p)} ${jy + 520}) rotate(${(-12 * (1 - p)).toFixed(1)})`);
    pzR.setAttribute('transform', `translate(${jx + 960 + 200 * (1 - p)} ${jy + 520 + 40 * (1 - p)}) rotate(${(10 * (1 - p)).toFixed(1)})`);
  });
  const clickT = X.text(jx + 960, jy + 760, 'pieces join', { size: 36, anchor: 'middle', w: 700, fill: C.ink2 });
  X.show(clickT, 5, { f: 0.6, type: 'pop', out: 6, outLen: 0.4 });
  // the vendor with two systems
  const ven = X.g();
  X.rect(jx + 100, jy + 180, 1720, 720, { parent: ven, fill: 'none', stroke: C.teal, r: 24, dash: '14 10', sw: 3 });
  X.icon('building', jx + 180, jy + 260, 0.5, { parent: ven, color: C.teal });
  X.text(jx + 230, jy + 270, 'one vendor, two systems', { parent: ven, size: 32, w: 700, fill: C.teal });
  X.show(ven, 6, { type: 'fade' });
  const sysA = X.g();
  X.icon('server', jx + 260, jy + 420, 0.75, { parent: sysA, color: C.blue });
  X.text(jx + 260, jy + 500, 'System A', { parent: sysA, size: 28, anchor: 'middle', w: 700, fill: C.blue });
  const rowA = cardRow(jx + 1020, jy + 380, i => i < 6, { parent: sysA, hideFill: C.sand, hideStroke: C.line });
  X.text(jx + 1020, jy + 500, 'sees the first 6 digits', { parent: sysA, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(sysA, 6, { f: 0.1, type: 'left' });
  const sysB = X.g();
  X.icon('server', jx + 260, jy + 660, 0.75, { parent: sysB, color: C.plum });
  X.text(jx + 260, jy + 740, 'System B', { parent: sysB, size: 28, anchor: 'middle', w: 700, fill: C.plum });
  X.text(jx + 1020, jy + 740, 'sees the last 4 digits', { parent: sysB, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(sysB, 6, { f: 0.55, type: 'left' });
  const rowBw = X.g(); const rowBin = X.g(rowBw);
  const rowB = cardRow(jx + 1020, jy + 620, i => i >= 12, { parent: rowBin, hideFill: 'none', hideStroke: C.line });
  for (let i = 0; i < 12; i++) rowB.cells[i].g.firstChild.setAttribute('fill', 'none');
  X.show(rowBw, 6, { f: 0.6, type: 'left' });
  const harmless = [X.chip(jx + 1640, jy + 416, 'harmless?', { size: 26, color: C.green, fill: C.greenL }), X.chip(jx + 1640, jy + 656, 'harmless?', { size: 26, color: C.green, fill: C.greenL })];
  harmless.forEach((h, i) => X.show(h, 7, { f: 0.02 + i * 0.08, type: 'pop', out: 7, outf: 0.4 }));
  X.each(() => {
    const p = ease(X.L(7, 0.35, 0.6));
    rowBin.setAttribute('transform', `translate(0 ${(-240 * p).toFixed(1)})`);
    for (let i = 0; i < 12; i++) rowB.cells[i].r.setAttribute('stroke-opacity', (1 - p).toFixed(2));
    for (let i = 6; i < 12; i++) rowA.paint(i, p > 0.98 ? C.redL : C.sand, p > 0.98 ? C.red : C.line);
  });
  const joinV = X.g();
  X.rect(jx + 560, jy + 560, 920, 120, { parent: joinV, fill: C.redL, stroke: C.red, r: 20 });
  const jvT = X.text(jx + 1020, jy + 638, '', { parent: joinV, size: 44, anchor: 'middle', w: 700, fill: C.red });
  X.count(jvT, 1000000, 100000, 7, { f0: 0.62, f1: 0.9, post: ' numbers left' });
  X.show(joinV, 7, { f: 0.6, type: 'pop' });

  // ---------- region led: the ledger and the gate (cues 8-11) ----------
  const [gx, gy] = R.led;
  const book = X.g();
  X.rect(gx + 140, gy + 230, 1000, 640, { parent: book, fill: C.plum, stroke: C.ink, r: 18, sw: 3 });
  X.rect(gx + 165, gy + 250, 470, 600, { parent: book, fill: C.card, stroke: C.line, r: 8 });
  X.rect(gx + 645, gy + 250, 470, 600, { parent: book, fill: C.card, stroke: C.line, r: 8 });
  E('line', { x1: gx + 640, y1: gy + 245, x2: gx + 640, y2: gy + 855, stroke: C.ink, 'stroke-width': 4 }, book);
  for (let i = 0; i < 9; i++) for (const px of [gx + 190, gx + 670]) E('line', { x1: px, y1: gy + 340 + i * 56, x2: px + 420, y2: gy + 340 + i * 56, stroke: C.blueL, 'stroke-width': 2 }, book);
  X.text(gx + 400, gy + 310, 'Leakage ledger', { parent: book, size: 36, serif: true, anchor: 'middle', w: 600, fill: C.plum });
  X.show(book, 8, { type: 'pop' });
  X.term(8, 'Ledger', 'A record book. Here: a list of what each group\nof systems has already seen.', { f: 0.3, until: 10 });
  const entries = [
    ['Group: Vendor X', 'systems A and B'],
    ['Ravi\'s card', 'first 6 digits seen'],
    ['Asha\'s card', 'last 4 digits seen'],
    ['Vel\'s card', 'nothing yet']
  ];
  entries.forEach(([a, b], i) => {
    const ta = X.text(gx + 195, gy + 390 + i * 112, '', { size: 28, w: 700, fill: C.ink });
    const tb = X.text(gx + 675, gy + 390 + i * 112, '', { size: 28, fill: C.ink2 });
    X.type(ta, a, 9, { f0: 0.08 + i * 0.2, f1: 0.18 + i * 0.2 });
    X.type(tb, b, 9, { f0: 0.12 + i * 0.2, f1: 0.25 + i * 0.2 });
  });
  const pen = X.g(); const penIn = X.g(pen);
  E('rect', { x: -8, y: -90, width: 16, height: 80, rx: 5, fill: C.ochre, stroke: C.ink, 'stroke-width': 2 }, penIn);
  E('path', { d: 'M-8,-10 L8,-10 L0,8 Z', fill: C.ink }, penIn);
  X.show(pen, 9, { type: 'fade', out: 10 });
  X.each(t => {
    const p = X.L(9, 0.08, 0.86), i = Math.min(3, Math.floor(p * 4)), u = (p * 4) % 1;
    const x = gx + 200 + u * 800, y = gy + 385 + i * 112;
    penIn.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + 4 * Math.sin(t * 25)).toFixed(1)}) rotate(25)`);
  });
  // the gate with the guard
  const gate = X.g();
  X.rect(gx + 1290, gy + 330, 40, 540, { parent: gate, fill: C.ink2, stroke: C.ink, r: 6 });
  X.rect(gx + 1690, gy + 330, 40, 540, { parent: gate, fill: C.ink2, stroke: C.ink, r: 6 });
  const bar = E('rect', { x: gx + 1330, y: gy + 560, width: 360, height: 30, rx: 10, fill: C.red, stroke: C.ink, 'stroke-width': 3 }, gate);
  X.text(gx + 1510, gy + 312, 'Aran\'s gate', { parent: gate, size: 30, anchor: 'middle', w: 700, fill: C.teal });
  X.show(gate, 10, { type: 'up' });
  const guard = X.person(gx + 1510, gy + 860, { shirt: C.ink, badge: true, skin: C.skin[0], s: 0.85 });
  X.show(guard, 10, { f: 0.1, type: 'up' });
  X.talk(guard, [11]);
  X.each(() => { X.arms(guard, 8, lerp(-8, 95, X.P(11, 0, 0, 0.4))); });
  const ledLink = X.arrow(gx + 1140, gy + 500, gx + 1280, gy + 500, { color: C.plum, sw: 4 });
  X.show(ledLink, 10, { f: 0.2, type: 'draw' });
  const req = X.g(); const reqIn = X.g(req);
  X.rect(-160, -40, 320, 80, { parent: reqIn, fill: C.plumL, stroke: C.plum, r: 14 });
  X.text(0, -6, 'System B asks', { parent: reqIn, size: 24, anchor: 'middle', w: 700, fill: C.plum });
  X.text(0, 26, 'for Ravi\'s last 4', { parent: reqIn, size: 24, anchor: 'middle', fill: C.ink });
  X.show(req, 10, { f: 0.05, type: 'fade', out: 11, outf: 0.3 });
  X.each(() => {
    const p = ease(X.L(10, 0.05, 0.3));
    reqIn.setAttribute('transform', `translate(${lerp(gx + 2050, gx + 1510, p).toFixed(1)} ${gy + 470})`);
  });
  const qCard = X.g();
  X.rect(gx + 140, gy + 150, 1000, 64, { parent: qCard, fill: C.ochreL, stroke: C.ochre, r: 32 });
  X.text(gx + 640, gy + 193, 'Would this leave fewer than ~1,000,000? (20 bits)', { parent: qCard, size: 28, anchor: 'middle', w: 700 });
  // a gauge: what would be left, against the 20-bit line
  const gauge = X.g();
  X.rect(gx + 1790, gy + 300, 70, 560, { parent: gauge, fill: C.card, r: 10 });
  E('line', { x1: gx + 1770, y1: gy + 440, x2: gx + 1880, y2: gy + 440, stroke: C.green, 'stroke-width': 5 }, gauge);
  X.text(gx + 1825, gy + 425, '20 bits', { parent: gauge, size: 22, anchor: 'middle', w: 700, fill: C.green });
  const lvl = E('rect', { x: gx + 1800, width: 50, rx: 6, fill: C.red }, gauge);
  X.text(gx + 1825, gy + 895, 'left', { parent: gauge, size: 22, anchor: 'middle', fill: C.ink2 });
  X.show(gauge, 10, { f: 0.45, type: 'up', out: 12 });
  X.each(() => { const p = X.P(10, 0.5, 0, 1.2); const h = 520 * lerp(0.95, 0.68, p); lvl.setAttribute('y', gy + 860 - h); lvl.setAttribute('height', h); lvl.setAttribute('fill', p > 0.5 ? C.red : C.green); });
  const ans = X.chip(gx + 1510, gy + 240, '100,000 left: below the line', { size: 24, color: C.red, fill: C.redL });
  X.show(ans, 10, { f: 0.75, type: 'pop', out: 11 });
  // cue 11: refused, show less or a token
  const stamp = X.g();
  X.rect(gx + 1340, gy + 190, 340, 80, { parent: stamp, fill: C.redL, stroke: C.red, r: 12, sw: 4 });
  X.text(gx + 1510, gy + 245, 'REFUSED', { parent: stamp, size: 40, anchor: 'middle', w: 800, fill: C.red, ls: 3 });
  const stW = X.wrap(stamp); X.show(stW, 11, { type: 'pop' });
  X.show(qCard, 10, { f: 0.3, type: 'down', out: 11 });
  const less = X.g();
  X.rect(gx + 140, gy + 130, 1000, 90, { parent: less, fill: C.greenL, stroke: C.green, r: 20 });
  X.text(gx + 180, gy + 188, 'shows less', { parent: less, size: 28, w: 700, fill: C.green });
  X.text(gx + 430, gy + 190, '●●●● ●●●● ●●●● ●●●●', { parent: less, size: 30, mono: true, fill: C.ink });
  X.text(gx + 900, gy + 188, 'or a token', { parent: less, size: 28, w: 700, fill: C.green });
  X.icon('key', gx + 1080, gy + 175, 0.4, { parent: less, color: C.green });
  X.show(less, 11, { f: 0.35, type: 'down', out: 12 });

  // ---------- region zero: 14,175 -> 0 (cue 12) ----------
  const [zx, zy] = R.zero;
  const zt = X.text(zx + 960, zy + 220, 'Customers who could be narrowed down by joining pieces', { size: 38, serif: true, anchor: 'middle', w: 600 });
  X.show(zt, 12, { type: 'down' });
  const crowd = [];
  for (let i = 0; i < 48; i++) {
    const x = zx + 220 + (i % 16) * 60, y = zy + 330 + Math.floor(i / 16) * 110;
    const g = X.g();
    const h = E('circle', { cx: x, cy: y, r: 16, fill: C.red }, g);
    const b = E('path', { d: `M${x - 22},${y + 58} Q${x - 22},${y + 22} ${x},${y + 22} Q${x + 22},${y + 22} ${x + 22},${y + 58} Z`, fill: C.red }, g);
    X.show(g, 12, { f: 0.02 + (i % 16) * 0.01, type: 'pop', len: 0.4 });
    crowd.push([h, b, i]);
  }
  const zl = X.text(zx + 1450, zy + 380, 'without the ledger', { size: 30, anchor: 'middle', fill: C.ink2 });
  const zv = X.text(zx + 1450, zy + 500, '', { size: 110, anchor: 'middle', w: 700, mono: true });
  const zl2 = X.text(zx + 1450, zy + 580, '', { size: 34, anchor: 'middle', w: 700 });
  X.show(zl, 12, { f: 0.1, type: 'fade' }); X.show(zv, 12, { f: 0.1, type: 'pop' }); X.show(zl2, 12, { f: 0.1, type: 'fade' });
  X.each(() => {
    const p = X.P(12, 0.5, 0, 1.6);
    zv.set(fmtUS(14175 * (1 - p)));
    zv.t.setAttribute('fill', p > 0.99 ? C.green : C.red);
    zl.set(p > 0.5 ? 'with the ledger' : 'without the ledger');
    zl2.set(p > 0.99 ? 'nobody' : 'customers');
    zl2.t.setAttribute('fill', p > 0.99 ? C.green : C.red);
    crowd.forEach(([h, b, i]) => { const on = p * 48 > (i * 7) % 48; const c = on ? C.green : C.red; h.setAttribute('fill', c); b.setAttribute('fill', c); });
  });
  const shieldZ = X.icon('shield', zx + 960, zy + 780, 0.8, { color: C.teal, check: true });
  X.show(shieldZ, 12, { f: 0.55, type: 'pop' });
  X.pulse(shieldZ.mid, zx + 960, zy + 780, 12, { f: 0.85 });

  X.recap(13, ['Masks leak, and joined pieces leak more', 'The ledger remembers what each group has seen', 'It refuses anything that leaves too few choices']);
});
