// ============================== RESEARCH
scene('research', X => {
  const steps = ['Reframe', 'Baseline', 'Survey', 'Measure', 'Design\nfrom maths', 'Attack it'];
  const st = X.g();
  const nodes = [];
  X.line(260, 230, 1660, 230, { color: C.line, sw: 4, parent: st });
  steps.forEach((s, i) => {
    const x = 260 + i * 280;
    const c = X.circle(x, 230, 38, { fill: C.panel2, stroke: C.line, sw: 4, parent: st });
    const n = X.text(x, 243, String(i + 1), { size: 36, w: 800, anchor: 'middle', parent: st });
    X.text(x, 310, s, { size: 26, w: 600, anchor: 'middle', parent: st, fill: C.muted, lh: 30 });
    nodes.push({ c, n });
  });
  X.show(st, 0, { type: 'down', out: 7 });
  X.each(t => nodes.forEach((k, i) => {
    const on = X.t >= X.at(i + 1) - 0.2;
    k.c.c.setAttribute('stroke', on ? C.amber : C.line); k.c.c.setAttribute('fill', on ? '#3a2e0b' : C.panel2);
    k.n.t.setAttribute('fill', on ? C.amber : C.text);
  }));
  const panel = (k, build) => { const g = X.g(); build(g); X.show(g, k, { type: 'up', out: k + 1 }); return g; };
  panel(1, g => {
    X.rect(260, 400, 1400, 400, { parent: g, stroke: C.amber });
    X.text(320, 470, 'The real problem is not finding PII with regex.', { size: 40, w: 600, fill: C.muted, parent: g });
    X.text(320, 560, 'A bank cannot prove:', { size: 40, w: 700, parent: g });
    X.text(380, 625, '• where each customer\'s identifiers are', { size: 34, w: 500, parent: g });
    X.text(380, 680, '• who can read them in clear', { size: 34, w: 500, parent: g });
    X.text(380, 735, '• which copy leaked', { size: 34, w: 500, parent: g });
  });
  panel(2, g => {
    X.text(960, 440, 'The baseline most teams would build', { size: 34, w: 600, fill: C.muted, anchor: 'middle', parent: g });
    ['Detect\n(regex)', 'Redact\n(mask)', 'Audit\nlog'].forEach((s, i) => {
      X.box(380 + i * 440, 520, 300, 180, { label: s, size: 38, parent: g });
      if (i < 2) X.arrow(690 + i * 440, 610, 810 + i * 440, 610, { parent: g });
    });
    X.text(960, 780, 'the yardstick Aran must beat', { size: 30, w: 600, fill: C.amber, anchor: 'middle', parent: g });
  });
  panel(3, g => {
    const piles = [['Laws and rules', 'DPDP Act and Rules · RBI\nCERT-In · UIDAI · PCI DSS', C.amber],
      ['Real leaks', 'Debit cards 2016 · Juspay\nStar Health · Meta logs', C.red],
      ['Research papers', 'Luhn · Verhoeff · FF1\ntraitor tracing · Merkle logs\nimmune systems …', C.blue]];
    piles.forEach(([h, b, col], i) => {
      const x = 260 + i * 480;
      X.rect(x, 410, 440, 330, { parent: g, stroke: col });
      X.icon(i === 2 ? 'file' : i === 1 ? 'alert' : 'shield', x + 220, 490, 0.6, { parent: g, color: col });
      X.text(x + 220, 590, h, { size: 34, w: 700, anchor: 'middle', parent: g });
      X.text(x + 220, 640, b, { size: 24, w: 400, fill: C.muted, anchor: 'middle', parent: g, lh: 32 });
    });
    X.text(960, 800, 'about 40 sources', { size: 32, w: 700, fill: C.amber, anchor: 'middle', parent: g });
  });
  panel(4, g => {
    X.icon('log', 600, 600, 1.4, { parent: g, color: C.blue });
    X.arrow(720, 600, 880, 600, { parent: g });
    [0.9, 0.55, 0.3, 0.75].forEach((h, i) => X.rect(940 + i * 110, 760 - 300 * h, 80, 300 * h, { parent: g, fill: i === 0 ? C.red : C.blue, stroke: 'none', r: 6 }));
    X.text(1110, 820, 'measured on real data, not argued', { size: 30, w: 600, anchor: 'middle', fill: C.amber, parent: g });
  });
  panel(5, g => {
    X.box(330, 480, 340, 180, { label: 'A gap', size: 40, stroke: C.red, parent: g });
    X.arrow(690, 570, 790, 570, { parent: g });
    X.box(810, 480, 340, 180, { label: 'Maths', sub: 'checksums · probability\ncryptography', size: 40, stroke: C.blue, parent: g });
    X.arrow(1170, 570, 1270, 570, { parent: g });
    X.box(1290, 480, 340, 180, { label: 'Theorem', sub: 'proved, not hoped', size: 40, stroke: C.green, parent: g });
  });
  panel(6, g => {
    X.text(960, 450, 'The design was attacked on paper', { size: 36, w: 600, anchor: 'middle', parent: g });
    const sq = [];
    for (let i = 0; i < 11; i++) sq.push(X.rect(395 + i * 105, 520, 80, 80, { parent: g, fill: '#2a1320', stroke: C.red, r: 10 }));
    X.text(960, 690, '11 weaknesses found  →  11 fixes', { size: 40, w: 700, anchor: 'middle', fill: C.green, parent: g });
    X.each(t => sq.forEach((s, i) => { const on = X.L(6, 0.2, 0.9) * 11 > i; s.r.setAttribute('fill', on ? '#0f2b20' : '#2a1320'); s.r.setAttribute('stroke', on ? C.green : C.red); }));
  });
  // gaps
  const gt = X.text(960, 200, 'Six research gaps, measured', { size: 44, w: 700, anchor: 'middle' });
  X.show(gt, 7, { type: 'down' });
  const gaps = [['G1', 'Number detectors drown\nin false alarms', 'M2'], ['G2', 'Protected and leaked\nnumbers look the same', 'M1'],
    ['G3', 'Nobody measures what\na mask still reveals', 'M4'], ['G4', 'Nobody can say which\nsystem leaked', 'M3'],
    ['G5', 'Erasure cannot reach\nlogs, backups, vendors', 'M5'], ['G6', 'OTPs have\nno structure', 'M2']];
  const mnames = { M1: 'Tokens that always fail', M2: 'Evidence detector', M3: 'Tokens that name the leaker', M4: 'Leakage ledger', M5: 'Erasure with proof' };
  gaps.forEach(([id, txt, m], i) => {
    const x = 120 + (i % 3) * 570, y = 260 + Math.floor(i / 3) * 300;
    const g = X.g();
    X.rect(x, y, 530, 200, { parent: g, stroke: C.red });
    X.text(x + 28, y + 60, id, { size: 40, w: 800, fill: C.red, parent: g });
    X.text(x + 120, y + 60, txt, { size: 30, w: 600, parent: g, lh: 40 });
    X.show(g, 8 + Math.floor(i / 2), { f: (i % 2) * 0.45, type: 'pop' });
    const mc = X.chip(x + 265, y + 240, m + ' · ' + mnames[m], { size: 24, color: C.teal, parent: undefined });
    X.show(mc, 11, { f: 0.1 + i * 0.1, type: 'down' });
  });
});

// ============================== CHECK DIGIT
scene('checkdigit', X => {
  const A = X.g();
  const row = X.digits(960, 220, '234567890124', { cw: 70, ch: 90, size: 46, gap: 8, parent: A });
  row.paint(11, '#3a2e0b', C.amber, C.amber);
  const x0 = row.cells[0].x, x1 = row.cells[10].x + row.cells[10].w;
  E('path', { d: `M${x0},325 L${x0},340 L${x1},340 L${x1},325`, fill: 'none', stroke: C.muted, 'stroke-width': 3 }, A);
  X.text((x0 + x1) / 2, 380, 'calculated from all the other digits', { size: 28, w: 500, fill: C.muted, anchor: 'middle', parent: A });
  X.text(row.cells[11].cx, 380, 'check digit', { size: 28, w: 700, fill: C.amber, anchor: 'middle', parent: A });
  X.show(A, 0, { type: 'up', out: 2 });
  X.term(0, 'Check digit', 'one extra digit calculated from the others');
  const B = X.g();
  const r2 = X.digits(900, 470, '234567880124', { cw: 70, ch: 90, size: 46, gap: 8, parent: B });
  r2.paint(7, '#2a1320', C.red, C.red);
  X.mark(1450, 515, false, { parent: B });
  X.text(1500, 527, 'invalid', { size: 36, w: 700, fill: C.red, parent: B });
  X.text(r2.cells[7].cx, 610, 'one typo', { size: 28, w: 600, fill: C.red, anchor: 'middle', parent: B });
  X.show(B, 1, { type: 'up', out: 2 });
  X.term(1, 'Checksum', 'the test: does the check digit still match?', { until: 2 });
  // Luhn
  const L = X.g();
  X.text(960, 190, 'Luhn  ·  IBM  ·  1960  ·  used by card numbers', { size: 36, w: 700, fill: C.blue, anchor: 'middle', parent: L });
  const lr = X.digits(960, 240, '7992739871?', { cw: 84, ch: 100, size: 52, gap: 10, parent: L });
  lr.paint(10, '#3a2e0b', C.amber, C.amber);
  X.show(L, 2, { type: 'up', out: 7 });
  X.term(2, 'Luhn method', 'the check-digit method used by cards');
  const dbl = [9, 7, 5, 3, 1]; // positions doubled (from the right of the body)
  const vals = { 9: [2, 2], 7: [16, 7], 5: [6, 6], 3: [4, 4], 1: [18, 9] };
  const below = {};
  dbl.forEach((i, j) => {
    const t = X.text(lr.cells[i].cx, 430, '', { size: 44, w: 800, fill: C.amber, anchor: 'middle', parent: L });
    const m = X.text(lr.cells[i].cx, 480, '', { size: 26, w: 600, fill: C.red, anchor: 'middle', parent: L });
    below[i] = { t, m };
  });
  const sums = X.g(L);
  const s1 = X.text(960, 600, 'doubled:  2 + 7 + 6 + 4 + 9 = 28', { size: 38, w: 600, anchor: 'middle', parent: sums, fill: C.amber });
  const s2 = X.text(960, 660, 'the rest:  7 + 9 + 7 + 9 + 7 = 39', { size: 38, w: 600, anchor: 'middle', parent: sums });
  const s3 = X.text(960, 740, 'total = 67', { size: 52, w: 800, anchor: 'middle', parent: sums, fill: C.text });
  X.show(s1, 5, { f: 0.0 }); X.show(s2, 5, { f: 0.3 }); X.show(s3, 5, { f: 0.65, type: 'pop' });
  const fin = X.text(960, 830, '67 → 70   so the check digit is 3', { size: 42, w: 800, anchor: 'middle', fill: C.green, parent: L });
  X.show(fin, 6, { type: 'pop' });
  X.each(t => {
    const p3 = X.L(3, 0.35, 0.95);
    dbl.forEach((i, j) => {
      const on = X.t >= X.at(3) && p3 * 5 > j;
      lr.paint(i, on ? '#3a2e0b' : C.panel2, on ? C.amber : C.line, on ? C.amber : C.text);
      let v = '';
      if (on) v = String(vals[i][0]);
      if (on && X.t > X.at(4, 0.35) && vals[i][0] > 9) v = String(vals[i][1]);
      below[i].t.set(v);
      below[i].m.set(on && X.t > X.at(4, 0.1) && vals[i][0] > 9 ? (X.t > X.at(4, 0.35) ? vals[i][0] + ' − 9' : '− 9') : '');
    });
    const done = X.t > X.at(6, 0.4);
    lr.set(done ? '79927398713' : '7992739871?');
    lr.paint(10, done ? '#0f2b20' : '#3a2e0b', done ? C.green : C.amber, done ? C.green : C.amber);
  });
  // Verhoeff
  const V = X.text(960, 190, 'Verhoeff  ·  1969  ·  used by Aadhaar', { size: 40, w: 700, fill: C.teal, anchor: 'middle' });
  X.show(V, 7, { type: 'down', out: 10 });
  X.term(7, 'Verhoeff algorithm', 'a stronger check digit, used by Aadhaar', { until: 8 });
  const pent = (parent, cx, cy, r) => {
    const g = E('g', null, parent);
    const inner = E('g', null, g);
    const pts = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    E('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: '#0f2b2b', stroke: C.teal, 'stroke-width': 6, 'stroke-linejoin': 'round' }, inner);
    E('circle', { cx: pts[0][0], cy: pts[0][1], r: r * 0.12, fill: C.amber }, inner);
    E('circle', { cx: pts[1][0] * 0.55, cy: pts[1][1] * 0.55, r: r * 0.07, fill: C.pink }, inner);
    g.setT = (rot, sx, rotFirst) => inner.setAttribute('transform', `translate(${cx},${cy}) ` + (rotFirst ? `scale(${sx},1) rotate(${rot})` : `rotate(${rot}) scale(${sx},1)`));
    g.setT(0, 1, true);
    return g;
  };
  const P1 = X.g();
  const big = pent(P1, 960, 500, 170);
  const lab = X.text(960, 760, '', { size: 34, w: 600, anchor: 'middle', parent: P1 });
  X.text(960, 820, '5 rotations + 5 flips = 10 moves: the dihedral group', { size: 32, w: 700, anchor: 'middle', fill: C.teal, parent: P1 });
  X.show(P1, 8, { type: 'pop', out: 9 });
  X.term(8, 'Dihedral group', 'the 10 ways to rotate or flip a pentagon', { until: 9 });
  X.each(t => {
    const u = X.L(8, 0.05, 0.95) * 4;
    const st = Math.floor(u), fr = ease(u - st);
    // sequence: rotate, rotate, flip, rotate
    let rot = 0, sx = 1;
    const seq = ['r', 'r', 'f', 'r'];
    for (let i = 0; i < 4; i++) { const p = i < st ? 1 : i === st ? fr : 0; if (seq[i] === 'r') rot += 72 * p; else sx = 1 - 2 * p; }
    big.setT(rot, sx, false);
    lab.set(st >= 4 ? '' : seq[Math.min(st, 3)] === 'r' ? 'rotate by 72°' : 'flip');
  });
  const P2 = X.g();
  const pl = pent(P2, 560, 470, 120), pr = pent(P2, 1360, 470, 120);
  X.text(560, 660, 'rotate, then flip', { size: 34, w: 700, anchor: 'middle', parent: P2 });
  X.text(1360, 660, 'flip, then rotate', { size: 34, w: 700, anchor: 'middle', parent: P2 });
  const ne = X.text(960, 490, '≠', { size: 120, w: 800, anchor: 'middle', fill: C.amber, parent: P2 });
  X.text(960, 780, 'order matters, so swapped digits change the result', { size: 34, w: 600, anchor: 'middle', fill: C.amber, parent: P2 });
  X.show(P2, 9, { type: 'pop', out: 10 });
  X.each(t => {
    const a = ease(X.L(9, 0.2, 0.45)), b = ease(X.L(9, 0.45, 0.7));
    pl.setT(72 * a, 1 - 2 * b, true);  // rotate first, then flip
    pr.setT(72 * b, 1 - 2 * a, false); // flip first, then rotate
  });
  const R = X.g();
  const ex = [['One wrong digit', '234567890124', '234567880124', 7], ['Two neighbours swapped', '234567890124', '234567980124', 6]];
  ex.forEach(([h, a, b, k], i) => {
    const y = 230 + i * 220;
    X.text(160, y + 10, h, { size: 34, w: 700, parent: R });
    const d = X.digits(160, y + 40, b, { cw: 50, ch: 66, size: 34, gap: 6, parent: R, anchor: 'start' });
    d.paint(k, '#2a1320', C.red, C.red); if (i === 1) d.paint(k + 1, '#2a1320', C.red, C.red);
    X.mark(940, y + 73, false, { parent: R, s: 32 });
    X.text(995, y + 85, 'caught', { size: 36, w: 700, fill: C.red, parent: R });
  });
  const ok = X.g(R);
  X.digits(160, 710, '234567890124', { cw: 50, ch: 66, size: 34, gap: 6, parent: ok, anchor: 'start', stroke: C.green });
  X.mark(940, 743, true, { parent: ok, s: 32 });
  X.text(995, 755, 'a real Aadhaar always passes', { size: 36, w: 700, fill: C.green, parent: ok });
  X.text(160, 690, 'Real', { size: 34, w: 700, parent: ok });
  X.show(R, 10, { type: 'up' });
});

// ============================== TOKENS (M1)
scene('tokens', X => {
  const A = X.g();
  X.box(260, 260, 1400, 140, { label: 'Everyone:  check digit  →  catches typing mistakes', size: 42, color: C.muted, parent: A });
  const a2 = X.box(260, 480, 1400, 140, { label: 'Aran:  check digit  →  marks every token', size: 42, color: C.teal, stroke: C.teal, parent: A });
  X.show(a2, 0, { f: 0.5, type: 'pop' });
  X.show(A, 0, { type: 'up', out: 1 });
  const B = X.g();
  X.rect(260, 220, 640, 460, { parent: B, stroke: C.green });
  X.text(580, 300, 'REAL numbers', { size: 40, w: 800, fill: C.green, anchor: 'middle', parent: B });
  X.digits(580, 350, '234567890124', { cw: 40, ch: 56, size: 30, gap: 5, parent: B });
  X.mark(580, 540, true, { parent: B, s: 50 });
  X.text(580, 640, 'always pass', { size: 36, w: 700, anchor: 'middle', parent: B });
  X.rect(1020, 220, 640, 460, { parent: B, stroke: C.teal });
  X.text(1340, 300, 'ARAN tokens', { size: 40, w: 800, fill: C.teal, anchor: 'middle', parent: B });
  X.digits(1340, 350, '098261586412', { cw: 40, ch: 56, size: 30, gap: 5, parent: B, color: C.teal });
  X.mark(1340, 540, false, { parent: B, s: 50, color: C.teal });
  X.text(1340, 640, 'always fail, by design', { size: 36, w: 700, anchor: 'middle', parent: B });
  X.show(B, 1, { type: 'pop', out: 2 });
  // encryption
  const Cg = X.g();
  X.box(200, 400, 360, 120, { label: 'HELLO 2345', mono: true, size: 40, parent: Cg });
  X.arrow(580, 460, 760, 460, { parent: Cg });
  X.box(780, 360, 360, 200, { label: 'encrypt', size: 40, stroke: C.blue, parent: Cg });
  X.icon('key', 960, 640, 1, { parent: Cg, color: C.amber });
  X.text(960, 720, 'secret key', { size: 30, w: 700, fill: C.amber, anchor: 'middle', parent: Cg });
  X.arrow(960, 610, 960, 570, { parent: Cg, color: C.amber, sw: 3 });
  X.arrow(1160, 460, 1340, 460, { parent: Cg });
  const scr = X.box(1360, 400, 360, 120, { label: 'Q7#XP 8812', mono: true, size: 40, color: C.blue, parent: Cg });
  X.show(Cg, 2, { type: 'up', out: 3 });
  X.term(2, 'Encryption + key', 'scramble data; only the key unscrambles it');
  X.each(t => {
    if (X.t < X.at(2) || X.t > X.at(3)) return;
    const s = Math.floor(X.t * 8); const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ#@$%&0123456789';
    let o = ''; for (let i = 0; i < 10; i++) o += i === 5 ? ' ' : ch[(s * 31 + i * 17 + i * i) % ch.length];
    scr.t.set(X.L(2, 0, 0.6) < 1 ? o : 'Q7#XP 8812');
  });
  // FF1 with AES inside
  const F = X.g();
  X.rect(660, 280, 600, 380, { parent: F, stroke: C.teal, sw: 5, fill: '#0f2222' });
  X.text(960, 340, 'FF1', { size: 50, w: 800, fill: C.teal, anchor: 'middle', parent: F });
  X.box(760, 380, 400, 150, { label: 'AES', sub: 'the world\'s standard cipher', size: 52, stroke: C.blue, color: C.blue, parent: F });
  X.text(960, 620, 'approved by NIST (SP 800-38G)', { size: 26, w: 500, fill: C.muted, anchor: 'middle', parent: F });
  X.show(F, 3, { type: 'pop', out: 5 });
  X.term(3, 'AES · FF1', 'standard cipher · NIST method built on it', { until: 4 });
  const io = X.g();
  X.digits(330, 440, '234567890124', { cw: 34, ch: 52, size: 26, gap: 4, parent: io });
  X.arrow(545, 466, 650, 466, { parent: io });
  X.arrow(1270, 466, 1375, 466, { parent: io, color: C.teal });
  X.digits(1590, 440, '098261586412', { cw: 34, ch: 52, size: 26, gap: 4, parent: io, color: C.teal, stroke: C.teal });
  X.text(330, 545, '12 digits in', { size: 28, w: 600, anchor: 'middle', parent: io });
  X.text(1590, 545, '12 digits out', { size: 28, w: 600, anchor: 'middle', fill: C.teal, parent: io });
  X.show(io, 4, { type: 'fade', out: 5 });
  X.term(4, 'Format preserving', 'same length, digits stay digits', { until: 5 });
  // Feistel
  const R = window.DATA.rounds;
  const Fe = X.g();
  X.text(960, 190, 'Inside FF1: a Feistel network', { size: 40, w: 700, anchor: 'middle', parent: Fe });
  const lb = X.box(380, 260, 420, 110, { label: R[0][0], mono: true, size: 52, stroke: C.blue, color: C.blue, parent: Fe });
  const rb = X.box(1120, 260, 420, 110, { label: R[0][1], mono: true, size: 52, stroke: C.violet, color: C.violet, parent: Fe });
  X.text(590, 410, 'left half', { size: 26, w: 600, anchor: 'middle', fill: C.muted, parent: Fe });
  X.text(1330, 410, 'right half', { size: 26, w: 600, anchor: 'middle', fill: C.muted, parent: Fe });
  X.box(830, 470, 260, 120, { label: 'scramble', sub: 'uses AES + key', size: 34, stroke: C.amber, parent: Fe });
  X.arrow(1240, 380, 1100, 500, { parent: Fe, color: C.violet });
  X.arrow(820, 530, 640, 390, { parent: Fe, color: C.amber });
  const swp = X.text(960, 690, '', { size: 40, w: 800, anchor: 'middle', fill: C.teal, parent: Fe });
  X.text(960, 760, 'then swap the halves · 10 rounds · always reversible', { size: 30, w: 600, anchor: 'middle', fill: C.muted, parent: Fe });
  X.show(Fe, 5, { type: 'up', out: 6 });
  X.term(5, 'Feistel network', 'split, scramble one half, swap, repeat', { until: 6 });
  X.each(t => {
    if (X.t < X.at(5)) return;
    const k = Math.min(10, Math.floor(X.L(5, 0.3, 0.95) * 10.99));
    lb.t.set(R[k][0]); rb.t.set(R[k][1]);
    swp.set(k === 0 ? 'round 0 of 10' : `round ${k} of 10`);
  });
  // build the token
  const T = X.g();
  X.text(200, 230, 'Body: first 11 digits', { size: 30, w: 600, fill: C.muted, parent: T });
  X.digits(200, 260, '23456789012', { cw: 56, ch: 74, size: 38, gap: 6, parent: T, anchor: 'start' });
  X.arrow(930, 297, 1030, 297, { parent: T });
  X.box(1040, 247, 140, 100, { label: 'FF1', size: 36, stroke: C.teal, color: C.teal, parent: T });
  X.arrow(1190, 297, 1260, 297, { parent: T, color: C.teal });
  X.text(200, 470, 'Encrypted body + correct check digit', { size: 30, w: 600, fill: C.muted, parent: T });
  const tok = X.digits(200, 500, '098261586419', { cw: 56, ch: 74, size: 38, gap: 6, parent: T, anchor: 'start', color: C.teal });
  X.text(1450, 297 + 12, 'scrambled', { size: 30, w: 600, fill: C.teal, anchor: 'middle', parent: T });
  const cdl = X.text(tok.cells[11].cx, 630, 'correct = 9', { size: 30, w: 700, fill: C.green, anchor: 'middle', parent: T });
  X.show(T, 6, { type: 'up', out: 8 });
  const off = X.g();
  X.box(1000, 470, 380, 130, { label: '+ secret offset 3', sub: 'always between 1 and 9', size: 36, stroke: C.amber, color: C.amber, parent: off });
  X.mark(1520, 537, false, { parent: off, s: 44, color: C.teal });
  X.text(1520, 640, 'fails Verhoeff', { size: 32, w: 700, fill: C.teal, anchor: 'middle', parent: off });
  X.text(200, 760, 'The last digit is now always wrong:  9 + 3 → 2', { size: 40, w: 700, parent: off });
  X.show(off, 7, { type: 'pop', out: 8 });
  X.each(t => {
    const w = X.t > X.at(7, 0.35);
    tok.set(w ? '098261586412' : '098261586419');
    tok.paint(11, w ? '#2a1320' : '#0f2b20', w ? C.amber : C.green, w ? C.amber : C.green);
    cdl.set(w ? 'token digit = 2' : 'correct = 9');
  });
  const th = X.g();
  X.rect(260, 260, 1400, 420, { parent: th, stroke: C.teal, sw: 4, fill: '#0e2224' });
  X.text(960, 350, 'THEOREM 1 · perfect separability', { size: 34, w: 800, fill: C.teal, anchor: 'middle', ls: 2, parent: th });
  X.text(960, 450, 'Every real Aadhaar passes Verhoeff.', { size: 50, w: 700, anchor: 'middle', parent: th });
  X.text(960, 525, 'No Aran token ever does.', { size: 50, w: 700, anchor: 'middle', parent: th });
  X.text(960, 610, 'Why: only one last digit can pass; the token\'s is off by 1 to 9.', { size: 30, w: 500, fill: C.muted, anchor: 'middle', parent: th });
  X.show(th, 8, { type: 'pop', out: 9 });
  X.term(8, 'Theorem', 'a statement proven true by logic');
  // scanner stream
  const items = [['234567890124', 1], ['249826846187', 0], ['987789328793', 1], ['098261586412', 0], ['417421809677', 1], ['019638092692', 0], ['957938347012', 1], ['005082360695', 0]];
  const SC = X.g();
  X.rect(900, 215, 120, 600, { parent: SC, fill: '#16304a', stroke: C.blue, sw: 3 });
  X.text(960, 205, 'any scanner, anywhere', { size: 28, w: 600, anchor: 'middle', fill: C.blue, parent: SC });
  const its = items.map(([n, real], i) => {
    const g = E('g', null, SC);
    const r = E('rect', { x: 0, y: 0, width: 300, height: 58, rx: 10, fill: C.panel2, stroke: C.line, 'stroke-width': 2 }, g);
    const t = E('text', { x: 150, y: 40, 'font-size': 30, 'font-family': 'DejaVu Sans Mono', 'text-anchor': 'middle', fill: C.text, 'font-weight': 600 }, g); t.textContent = n;
    const l = E('text', { x: 320, y: 40, 'font-size': 28, 'font-weight': 800, 'font-family': 'Inter', fill: real ? C.red : C.teal, opacity: 0 }, g); l.textContent = real ? 'REAL · LEAK' : 'TOKEN · safe';
    return { g, r, l, real, k: i };
  });
  X.show(SC, 9, { type: 'fade', out: 10 });
  X.each(t => {
    const u = X.L(9, 0, 0.95);
    its.forEach(it => {
      const s = clamp(u * 2.2 - it.k * 0.16, 0, 1);
      const x = lerp(140, 1180, ease(s)), y = 232 + it.k * 72;
      it.g.setAttribute('transform', `translate(${x},${y})`);
      const past = x > 840;
      it.l.setAttribute('opacity', past ? 1 : 0);
      it.r.setAttribute('stroke', past ? (it.real ? C.red : C.teal) : C.line);
      it.g.setAttribute('opacity', s <= 0 ? 0 : 1);
    });
  });
  const E2 = X.g();
  X.text(960, 260, 'Test on real logs', { size: 38, w: 700, anchor: 'middle', fill: C.muted, parent: E2 });
  X.box(220, 330, 700, 300, { label: '0', sub: 'of 20,000 tokens flagged as real', size: 120, subSize: 32, color: C.teal, stroke: C.teal, parent: E2 });
  X.box(1000, 330, 700, 300, { label: '20,000', sub: 'of 20,000 real values caught', size: 110, subSize: 32, color: C.red, stroke: C.red, parent: E2 });
  X.show(E2, 10, { type: 'pop' });
});

// ============================== PER-SINK (M3)
scene('persink', X => {
  const A = X.g();
  X.box(760, 360, 400, 200, { label: 'FF1', size: 60, color: C.teal, stroke: C.teal, parent: A });
  X.icon('key', 960, 650, 0.8, { parent: A, color: C.amber });
  X.text(960, 720, 'same key', { size: 28, w: 700, fill: C.amber, anchor: 'middle', parent: A });
  X.arrow(960, 620, 960, 575, { parent: A, color: C.amber, sw: 3 });
  const tw = X.chip(960, 250, 'tweak', { size: 34, color: C.violet, parent: A });
  X.arrow(960, 285, 960, 345, { parent: A, color: C.violet, sw: 3 });
  X.show(A, 0, { type: 'pop', out: 2 });
  X.term(0, 'Tweak', 'an extra input that changes the output, not the key', { until: 2 });
  X.each(t => { const names = ['tweak', '"crm"', '"loan-vendor"', '"log-platform"']; const k = X.t < X.at(1) ? 0 : 1 + Math.floor(X.L(1, 0.2, 1) * 2.99); tw.t.set(names[k]); });
  // three tokens
  const B = X.g();
  X.text(260, 210, 'One customer', { size: 30, w: 600, fill: C.muted, parent: B });
  X.digits(260, 240, '234567890124', { cw: 44, ch: 62, size: 32, gap: 5, parent: B, anchor: 'start' });
  const sinks = [['CRM', '249826846187'], ['Loan vendor', '098261586412'], ['Log platform', '019638092692']];
  sinks.forEach(([s, tk], i) => {
    const y = 420 + i * 140;
    const g = X.g(B);
    X.arrow(560, 330, 760, y + 30, { parent: g, color: C.teal, sw: 3, bend: 0.1 });
    X.digits(780, y, tk, { cw: 44, ch: 62, size: 32, gap: 5, parent: g, anchor: 'start', color: C.teal, stroke: C.teal });
    X.text(1430, y + 42, '→ ' + s, { size: 36, w: 700, parent: g });
    X.show(g, 2, { f: 0.2 + i * 0.22, type: 'left' });
  });
  X.show(B, 2, { type: 'fade', out: 3 });
  // banknotes
  const N = X.g();
  const marks = [C.amber, C.pink, C.blue];
  ['Vendor A', 'Vendor B', 'Vendor C'].forEach((v, i) => {
    const x = 300 + i * 470;
    X.rect(x, 330, 380, 200, { parent: N, fill: '#173322', stroke: C.green, sw: 4, r: 12 });
    X.text(x + 190, 445, '₹ 500', { size: 54, w: 800, fill: C.green, anchor: 'middle', parent: N });
    X.circle(x + 330, 380, 22, { fill: marks[i], parent: N });
    X.text(x + 190, 590, v, { size: 32, w: 700, anchor: 'middle', parent: N });
  });
  X.text(960, 700, 'each copy is marked differently', { size: 36, w: 600, anchor: 'middle', fill: C.amber, parent: N });
  X.show(N, 3, { type: 'pop', out: 4 });
  // leak
  const L = X.g();
  X.rect(160, 260, 620, 420, { parent: L, stroke: C.red, fill: '#1f1420' });
  X.icon('send', 250, 330, 0.5, { parent: L, color: C.blue });
  X.text(300, 342, 'leaked_customers.csv', { size: 30, w: 700, parent: L });
  X.text(210, 430, 'name, aadhaar', { size: 26, mono: true, fill: C.muted, parent: L });
  X.text(210, 480, 'R. K..., 098261586412', { size: 28, mono: true, fill: C.text, parent: L });
  X.text(210, 530, 'S. M..., 467429862154', { size: 28, mono: true, fill: C.muted, parent: L });
  X.text(210, 580, '...', { size: 28, mono: true, fill: C.muted, parent: L });
  X.show(L, 4, { type: 'left', out: 7 });
  const chk = X.g();
  X.text(880, 360, 'Verhoeff check', { size: 30, w: 600, fill: C.muted, parent: chk });
  X.mark(920, 450, false, { parent: chk, s: 40, color: C.teal });
  X.text(980, 465, 'fails → it is a TOKEN', { size: 38, w: 800, fill: C.teal, parent: chk });
  X.show(chk, 5, { type: 'pop', out: 7 });
  const tr = X.g();
  X.arrow(780, 480, 1300, 620, { parent: tr, color: C.amber, sw: 6, bend: -0.15 });
  X.box(1300, 560, 460, 140, { label: 'Loan vendor', sub: 'only sink this token was issued to', size: 42, stroke: C.amber, color: C.amber, parent: tr });
  X.show(tr, 6, { type: 'draw', out: 7 });
  const tb = X.g(); X.rect(1300, 560, 460, 140, { parent: tb, stroke: C.amber, fill: 'none', sw: 6 });
  X.show(tb, 6, { f: 0.3, type: 'pop', out: 7 });
  X.term(6, 'Attribution', 'finding which system leaked', { until: 7 });
  const th = X.g();
  X.rect(260, 220, 1400, 520, { parent: th, stroke: C.teal, fill: '#0e2224', sw: 4 });
  X.text(960, 300, 'THEOREM 2 · attribution', { size: 34, w: 800, fill: C.teal, anchor: 'middle', ls: 2, parent: th });
  X.text(960, 380, '50 million customers · 40 sinks', { size: 40, w: 600, anchor: 'middle', parent: th });
  X.text(960, 460, 'a leaked dump of 5 tokens is traced to the wrong sink', { size: 36, w: 500, anchor: 'middle', fill: C.muted, parent: th });
  X.text(960, 560, 'at most 3 times in a billion', { size: 60, w: 800, anchor: 'middle', fill: C.amber, parent: th });
  const e3 = X.text(960, 680, 'In the test (E3): right sink 100% of the time', { size: 36, w: 700, anchor: 'middle', fill: C.green, parent: th });
  X.show(e3, 8, { type: 'pop' });
  X.show(th, 7, { type: 'pop', d: 0.3 });
});
