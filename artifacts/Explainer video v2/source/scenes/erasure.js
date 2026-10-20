// Deleting every copy at once: a vault of small locked drawers, one key per customer per purpose,
// destroying Ravi's keys greys out every copy, the safe with a lost key, and the KYC key's time lock.
scene('erasure', X => {
  const R = { a: [0, 0], vault: [2000, 0], safe: [0, 1100], kyc: [2000, 1100], thm: [4000, 1100] };
  const cx = r => R[r][0] + 960, cy = r => R[r][1] + 540;
  X.cam([
    { x: 760, y: 560, s: 1.2 },
    { k: 0, f: 0.4, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 2, x: 2000 + 760, y: 540, s: 1.15, len: 1.8 },
    { k: 3, x: cx('vault'), y: cy('vault'), s: 1, len: 1.4 },
    { k: 5, x: 2000 + 1100, y: 540, s: 1.08, len: 1.2 },
    { k: 6, x: cx('vault'), y: cy('vault'), s: 1, len: 1.2 },
    { k: 7, x: cx('safe'), y: cy('safe'), s: 1, len: 1.8 },
    { k: 8, x: cx('kyc'), y: cy('kyc'), s: 1, len: 1.8 },
    { k: 10, x: 2000 + 900, y: 1100 + 520, s: 1.1, len: 1.2 },
    { k: 11, x: cx('thm'), y: cy('thm'), s: 1, len: 1.8 }
  ]);
  // key fragments flying apart (a key "crumbling") at cue k, fraction f
  const crumble = (x, y, k, f, col) => {
    const g = E('g', null, X.root);
    const r = rng(Math.round(x * 7 + y));
    const bits = [];
    for (let i = 0; i < 14; i++) bits.push({ e: E('rect', { width: 10 + r() * 14, height: 6 + r() * 10, rx: 2, fill: col, stroke: C.ink, 'stroke-width': 1.5 }, g), a: r() * Math.PI * 2, v: 60 + r() * 140, sp: (r() - 0.5) * 720, ox: (r() - 0.5) * 90, oy: (r() - 0.5) * 30 });
    X.each(t => {
      const t0 = X.at(k, f), u = (t - t0) / 1.4;
      g.style.display = u > 0 && u < 1 ? '' : 'none';
      if (!(u > 0 && u < 1)) return;
      bits.forEach(b => {
        const px = x + b.ox + Math.cos(b.a) * b.v * u, py = y + b.oy + Math.sin(b.a) * b.v * u * 0.6 + 260 * u * u;
        b.e.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(b.sp * u).toFixed(0)})`);
        b.e.setAttribute('opacity', (1 - u).toFixed(2));
      });
    });
  };
  const TOK = { crm: '2498 2684 6187', loan: '0982 6158 6412', log: '0196 3809 2692' };

  // ---------- region a: copies everywhere (cues 0-1) ----------
  const ravi = X.person(300, 860, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1.05 });
  X.show(ravi, 0, { type: 'up' });
  X.talk(ravi, [0], { base: 'neutral' });
  const say = X.g();
  X.rect(120, 340, 400, 110, { parent: say, fill: C.card, r: 22, shadow: true });
  E('path', { d: 'M280,448 L300,500 L320,448 Z', fill: C.card, stroke: C.line, 'stroke-width': 2 }, say);
  E('rect', { x: 281, y: 444, width: 38, height: 8, fill: C.card }, say);
  X.text(320, 388, 'Please erase', { parent: say, size: 30, anchor: 'middle', w: 600 });
  X.text(320, 426, 'my data', { parent: say, size: 30, anchor: 'middle', w: 600 });
  X.show(say, 0, { f: 0.15, type: 'pop', out: 2 });
  X.term(0, 'Right to erasure', 'The law lets a person ask a company\nto delete their personal data.', { f: 0.2, until: 1 });
  const copies = [
    ['log', 'Log file', TOK.log, 860, 330], ['db', 'Backup', TOK.log, 1440, 330],
    ['building', 'Loan vendor', TOK.loan, 860, 660], ['laptop', 'CRM', TOK.crm, 1440, 660]
  ];
  copies.forEach(([ic, lab, tok, x, y], i) => {
    const g = X.g();
    const I = X.icon(ic, x, y - 30, 0.8, { parent: g });
    X.text(x, y + 50, lab, { parent: g, size: 28, anchor: 'middle', w: 700 });
    X.chip(x, y + 100, tok, { parent: g, size: 26, mono: true, color: C.blue, fill: C.blueL });
    X.show(g, 0, { f: 0.35 + i * 0.1, type: 'pop' });
    X.bob(I.mid, { amp: 4, per: 2.4, ph: i });
  });
  // the clerk chasing copies, never finishing
  const chaser = X.person(0, 0, { shirt: C.plum, skin: C.skin[2], long: true, s: 0.7 });
  const chW = X.wrap(chaser);
  X.show(chW, 1, { type: 'fade', out: 2 });
  const loop = spline([[1150, 900], [700, 820], [700, 500], [1150, 500], [1600, 500], [1600, 820], [1150, 900]]);
  X.travel(chaser, loop, 1, { linear: true, f0: 0, f1: 1 });
  X.each(t => { X.arms(chaser, 30 + 20 * Math.sin(t * 12), 30 - 20 * Math.sin(t * 12)); chaser.mood('sad'); });
  const chase = X.g();
  X.rect(980, 180, 340, 70, { parent: chase, fill: C.redL, stroke: C.red, r: 35 });
  X.text(1150, 226, 'chase every copy?', { parent: chase, size: 28, anchor: 'middle', w: 700, fill: C.red });
  X.show(chase, 1, { type: 'down', out: 2 });
  const chX = X.path('M990,190 L1310,240', { color: C.red, sw: 6 });
  X.show(chX, 1, { f: 0.3, type: 'draw', out: 2 });
  const dk = X.g();
  X.rect(990, 410, 320, 170, { parent: dk, fill: C.greenL, stroke: C.green, r: 20, shadow: true });
  const dkI = X.icon('key', 1150, 470, 0.9, { parent: dk, color: C.ink });
  X.text(1150, 555, 'destroy the key', { parent: dk, size: 30, anchor: 'middle', w: 700, fill: C.green });
  X.show(dk, 1, { f: 0.5, type: 'pop', out: 2 });
  X.pulse(dkI.mid, 1150, 470, 1, { f: 0.7 });

  // ---------- region vault (cues 2-6) ----------
  const [vx, vy] = R.vault;
  const vault = X.g();
  X.rect(vx + 110, vy + 180, 720, 700, { parent: vault, fill: C.ink2, stroke: C.ink, r: 26, sw: 4, shadow: true });
  X.text(vx + 470, vy + 240, 'The vault', { parent: vault, size: 40, serif: true, anchor: 'middle', w: 600, fill: C.card });
  X.show(vault, 2, { type: 'pop' });
  const owners = ['Asha', 'Vel', '', 'Ravi', 'Asha', 'Vel', '', 'Ravi', 'Asha', 'Vel', '', 'Ravi', 'Asha', 'Vel', '', 'Ravi'];
  const purp = ['servicing', 'marketing', 'loans', 'KYC'];
  const ocol = { Ravi: [C.blue, C.blueL], Asha: [C.plum, C.plumL], Vel: [C.teal, C.tealL] };
  const drawers = [];
  for (let i = 0; i < 20; i++) {
    const c = i % 4, r = Math.floor(i / 4);
    const x = vx + 140 + c * 168, y = vy + 280 + r * 116;
    const w = X.g(); const inner = X.g(w);
    const box = X.rect(x, y, 156, 104, { parent: inner, fill: C.sand, stroke: C.ink, r: 8, sw: 2 });
    E('rect', { x: x + 58, y: y + 70, width: 40, height: 10, rx: 5, fill: C.ink2 }, inner);
    X.icon('lock', x + 132, y + 22, 0.24, { parent: inner, color: C.ink });
    const lab = X.text(x + 10, y + 34, owners[i] || '', { parent: inner, size: 22, w: 700, fill: C.ink });
    const lab2 = X.text(x + 10, y + 60, owners[i] ? purp[Math.floor(i / 4)] : '', { parent: inner, size: 22, fill: C.ink2 });
    X.show(w, 2, { f: 0.05 + i * 0.015, type: 'fade', len: 0.4 });
    drawers.push({ inner, box, lab, lab2, x, y, i });
  }
  X.each(t => drawers.forEach(d => {
    const o = owners[d.i];
    const colored = o && t > X.at(3, 0.1);
    const dead = o === 'Ravi' && ((d.i < 12 && t > X.at(5, 0.35)) || (d.i === 15 && t > X.at(10, 0.6)));
    d.box.r.setAttribute('fill', dead ? C.paper : colored ? ocol[o][1] : C.sand);
    d.box.r.setAttribute('stroke', dead ? C.ink3 : colored ? ocol[o][0] : C.ink);
    d.lab.style.opacity = d.lab2.style.opacity = colored ? (dead ? 0.35 : 1) : 0;
    // drawer 0 slides out during cue 2
    const out = d.i === 3 ? X.P(2, 0.35, 0, 0.6) * (1 - X.P(3, 0, 0, 0.5)) : 0;
    d.inner.setAttribute('transform', `translate(${(out * 40).toFixed(1)} ${(out * -10).toFixed(1)})`);
  }));
  const peek = X.g();
  X.rect(vx + 880, vy + 250, 600, 210, { parent: peek, fill: C.card, r: 18, shadow: true });
  X.text(vx + 910, vy + 300, 'inside one drawer', { parent: peek, size: 26, fill: C.ink2 });
  X.chip(vx + 1030, vy + 370, TOK.crm, { parent: peek, size: 26, mono: true, color: C.blue, fill: C.blueL });
  X.arrow(vx + 1150, vy + 370, vx + 1240, vy + 370, { parent: peek, color: C.ink2, sw: 3 });
  X.chip(vx + 1360, vy + 370, '2345 6789 0124', { parent: peek, size: 26, mono: true, color: C.ink, fill: C.ochreL });
  X.text(vx + 1030, vy + 430, 'token', { parent: peek, size: 24, anchor: 'middle', fill: C.ink2 });
  X.text(vx + 1360, vy + 430, 'real value', { parent: peek, size: 24, anchor: 'middle', fill: C.ink2 });
  X.show(peek, 2, { f: 0.45, type: 'left', out: 3 });
  X.term(2, 'Vault', 'A protected table that links each token\nback to the real value it stands for.', { f: 0.1, until: 3 });
  // Ravi's keys
  const keyH = X.text(vx + 1100, vy + 220, 'Ravi\'s keys', { size: 36, serif: true, anchor: 'middle', w: 600, fill: C.blue });
  X.show(keyH, 3, { f: 0.3, type: 'down' });
  const kIcons = ['gear', 'envelope', 'coin', 'idcard'];
  const keys = purp.map((p, i) => {
    const y = vy + 332 + i * 116;
    const g = X.g();
    const K = X.icon('key', vx + 1020, y, 0.9, { parent: g, color: C.ink, fill: C.blueL });
    X.show(g, 3, { f: 0.35 + i * 0.12, type: 'pop' });
    const lg = X.g();
    X.icon(kIcons[i], vx + 1140, y, 0.36, { parent: lg, color: C.ink2 });
    X.text(vx + 1185, y + 10, p === 'KYC' ? 'KYC' : p[0].toUpperCase() + p.slice(1), { parent: lg, size: 30, w: 700 });
    X.show(lg, 4, { f: 0.1 + i * 0.16, type: 'left' });
    // a thin line from key to Ravi's drawer
    const d = drawers[i * 4 + 3];
    const ln = X.path(`M${vx + 972},${y} L${d.x + 160},${d.y + 52}`, { color: C.blue, sw: 3, dash: '5 6' });
    X.show(ln, 3, { f: 0.4 + i * 0.12, type: 'fade' });
    return { g, K, y, ln };
  });
  X.each(() => keys.forEach((k, i) => {
    const gone = (i < 3 && X.t > X.at(5, 0.25)) || (i === 3 && X.t > X.at(10, 0.55));
    k.K.mid.setAttribute('opacity', gone ? 0 : 1);
    k.ln.style.visibility = gone ? 'hidden' : '';
  }));
  for (let i = 0; i < 3; i++) crumble(vx + 1020, vy + 332 + i * 116, 5, 0.25 + i * 0.04, C.blueL);
  X.term(3, 'Key', 'A secret code that locks and unlocks data.\nWithout the key, the locked data is unreadable.', { f: 0.2, until: 4 });
  X.term(4, 'Purpose', 'The reason the bank holds the data,\nlike running your account or giving a loan.', { f: 0.05, until: 4, outf: 0.6 });
  X.term(4, 'KYC (know your customer)', 'The identity checks a bank must do and keep\nrecords of, by law.', { f: 0.62, until: 5 });
  const perCust = X.chip(vx + 1150, vy + 850, 'one key per customer, per purpose', { size: 26, color: C.ink, fill: C.card });
  X.show(perCust, 3, { f: 0.6, type: 'up', out: 5 });
  // copies of Ravi's tokens, linked to the vault
  const cps = [['log', 'Log file', TOK.log], ['db', 'Backup', TOK.log], ['building', 'Vendor', TOK.loan], ['laptop', 'CRM', TOK.crm]];
  const cpG = cps.map(([ic, lab, tok], i) => {
    const y = vy + 290 + i * 160;
    const g = X.g();
    X.icon(ic, vx + 1450, y, 0.55, { parent: g, color: C.ink });
    X.text(vx + 1520, y - 10, lab, { parent: g, size: 26, w: 700 });
    const ch = X.chip(vx + 1650, y + 34, tok, { parent: g, size: 24, mono: true, color: C.blue, fill: C.blueL });
    X.show(g, 5, { f: 0.05 + i * 0.08, type: 'left' });
    const nul = X.g(); X.text(vx + 1650, y + 88, 'points to nothing', { parent: nul, size: 22, anchor: 'middle', w: 700, fill: C.red });
    return { g, ch, nul };
  });
  X.each(() => {
    const grey = X.P(6, 0.3, 0, 0.5);
    cpG.forEach(c => {
      c.g.style.filter = grey > 0 ? `grayscale(${grey})` : '';
      c.ch.r.setAttribute('fill', grey > 0.5 ? C.paper : C.blueL); c.ch.r.setAttribute('stroke', grey > 0.5 ? C.ink3 : C.blue);
      c.ch.t.t.setAttribute('fill', grey > 0.5 ? C.ink3 : C.blue);
      c.nul.style.opacity = X.P(6, 0.45, 0, 0.5);
    });
  });
  const flash = E('rect', { x: vx + 1380, y: vy + 200, width: 520, height: 680, rx: 20, fill: C.redL }, X.root);
  X.root.insertBefore(flash, cpG[0].g);
  X.each(() => { const u = clamp((X.t - X.at(6, 0.3)) / 0.8); flash.style.opacity = u > 0 && u < 1 ? (0.8 * Math.sin(u * Math.PI)).toFixed(2) : 0; });
  const req = X.chip(vx + 1150, vy + 850, 'Ravi asks for erasure', { size: 26, color: C.blue, fill: C.card });
  X.show(req, 5, { type: 'up', out: 7 });
  const inst = X.chip(vx + 1650, vy + 850, 'all at once', { size: 26, color: C.red, fill: C.redL });
  X.show(inst, 6, { f: 0.35, type: 'pop', out: 7 });

  // ---------- region safe: crypto-shredding (cue 7) ----------
  const [sx, sy] = R.safe;
  const safe = X.g();
  X.rect(sx + 260, sy + 260, 560, 560, { parent: safe, fill: C.ink2, stroke: C.ink, r: 30, sw: 5, shadow: true });
  X.rect(sx + 300, sy + 300, 480, 480, { parent: safe, fill: C.sand, stroke: C.ink, r: 18, sw: 3 });
  E('circle', { cx: sx + 540, cy: sy + 540, r: 90, fill: C.card, stroke: C.ink, 'stroke-width': 5 }, safe);
  E('path', { d: `M${sx + 530},${sy + 520} a12,12 0 1,1 20,0 L${sx + 548},${sy + 570} L${sx + 532},${sy + 570} Z`, fill: C.ink }, safe);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; E('line', { x1: sx + 540 + Math.cos(a) * 76, y1: sy + 540 + Math.sin(a) * 76, x2: sx + 540 + Math.cos(a) * 88, y2: sy + 540 + Math.sin(a) * 88, stroke: C.ink2, 'stroke-width': 3 }, safe); }
  X.show(safe, 7, { type: 'pop' });
  const safeS = X.g(); safeS.appendChild(safe); X.shake(safeS, 7, { f: 0.75, amp: 8, len: 1 });
  const sKey = X.icon('key', sx + 1000, sy + 540, 1.4, { color: C.ink, fill: C.ochreL });
  X.show(sKey, 7, { f: 0.05, type: 'left' });
  X.each(() => { sKey.mid.setAttribute('opacity', X.t > X.at(7, 0.3) ? 0 : 1); });
  crumble(sx + 1000, sy + 540, 7, 0.3, C.ochreL);
  const thief = X.person(sx + 160, sy + 870, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.8 });
  X.show(thief, 7, { f: 0.6, type: 'right' });
  X.each(() => { if (X.t > X.at(7, 0.65)) X.arms(thief, 8, 70 + 10 * Math.sin(X.t * 16)); else X.arms(thief, 8, -8); thief.mood(X.t > X.at(7, 0.85) ? 'sad' : 'neutral'); });
  const cap1 = X.text(sx + 540, sy + 220, 'the safe still exists...', { size: 32, anchor: 'middle', w: 600, fill: C.ink2 });
  X.show(cap1, 7, { f: 0.45, type: 'down' });
  const cap2 = X.chip(sx + 540, sy + 880, 'nobody can ever open it', { size: 28, color: C.red, fill: C.redL });
  X.show(cap2, 7, { f: 0.8, type: 'pop' });
  const real = X.g();
  X.rect(sx + 1240, sy + 330, 560, 420, { parent: real, fill: C.card, r: 22, shadow: true });
  X.text(sx + 1520, sy + 390, 'in Aran', { parent: real, size: 30, serif: true, anchor: 'middle', w: 600, fill: C.ink2 });
  X.chip(sx + 1520, sy + 480, TOK.crm, { parent: real, size: 30, mono: true, color: C.ink3, fill: C.paper });
  X.text(sx + 1520, sy + 580, 'key destroyed:', { parent: real, size: 28, anchor: 'middle', fill: C.ink2 });
  X.text(sx + 1520, sy + 630, 'the token means nothing', { parent: real, size: 30, anchor: 'middle', w: 700, fill: C.red });
  X.show(real, 7, { f: 0.5, type: 'left' });
  X.term(7, 'Crypto-shredding', 'Deleting data by destroying its key, so every\ncopy, wherever it is, can never be read again.', { f: 0.1, until: 8 });

  // ---------- region kyc: kept by law, time-locked (cues 8-10) ----------
  const [kx, ky] = R.kyc;
  const law = X.g();
  X.icon('scale', kx + 250, ky + 420, 1.4, { parent: law, color: C.ink });
  X.text(kx + 250, ky + 560, 'the law', { parent: law, size: 30, anchor: 'middle', w: 700 });
  X.show(law, 8, { type: 'up' });
  const lawT = X.g();
  X.rect(kx + 100, ky + 610, 320, 120, { parent: lawT, fill: C.ochreL, stroke: C.ochre, r: 16 });
  X.text(kx + 260, ky + 660, 'keep KYC records', { parent: lawT, size: 26, anchor: 'middle', w: 700 });
  X.text(kx + 260, ky + 700, 'for some years', { parent: lawT, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(lawT, 8, { f: 0.4, type: 'up' });
  // the KYC key inside a glass case with a clock
  const caseG = X.g();
  X.rect(kx + 560, ky + 300, 420, 360, { parent: caseG, fill: C.blueL, stroke: C.blue, r: 20, sw: 4 });
  E('path', { d: `M${kx + 590},${ky + 330} L${kx + 640},${ky + 330} L${kx + 590},${ky + 380} Z`, fill: C.card, opacity: 0.7 }, caseG);
  X.show(caseG, 9, { type: 'pop' });
  const kycKey = X.icon('key', kx + 770, ky + 560, 1.2, { color: C.ink, fill: C.blueL });
  X.show(kycKey, 8, { f: 0.2, type: 'pop' });
  const kycl = X.text(kx + 770, ky + 720, 'Ravi\'s KYC key', { size: 28, anchor: 'middle', w: 700, fill: C.blue });
  X.show(kycl, 8, { f: 0.25, type: 'up' });
  X.each(() => kycKey.mid.setAttribute('opacity', X.t > X.at(10, 0.55) ? 0 : 1));
  crumble(kx + 770, ky + 560, 10, 0.55, C.blueL);
  const clock = X.g();
  E('circle', { cx: kx + 770, cy: ky + 410, r: 74, fill: C.card, stroke: C.ink, 'stroke-width': 5 }, clock);
  const ring = E('path', { fill: 'none', stroke: C.ochre, 'stroke-width': 12, 'stroke-linecap': 'round' }, clock);
  const hand = E('line', { x1: kx + 770, y1: ky + 410, x2: kx + 770, y2: ky + 350, stroke: C.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, clock);
  E('circle', { cx: kx + 770, cy: ky + 410, r: 7, fill: C.ink }, clock);
  X.show(clock, 9, { f: 0.1, type: 'pop' });
  X.each(t => {
    // time passes slowly during cue 9, then races to the end during cue 10
    const p = t < X.at(10) ? 0.15 * X.L(9, 0.1, 1) : lerp(0.15, 1, ease(X.L(10, 0.05, 0.5)));
    const a = p * 2 * Math.PI;
    hand.setAttribute('x2', kx + 770 + Math.sin(a * 6) * 56); hand.setAttribute('y2', ky + 410 - Math.cos(a * 6) * 56);
    const r = 64, x0 = kx + 770, y0 = ky + 410 - r, x1 = kx + 770 + Math.sin(a) * r, y1 = ky + 410 - Math.cos(a) * r;
    ring.setAttribute('d', p <= 0.001 ? '' : p >= 0.999 ? `M${x0},${y0} A${r},${r} 0 1,1 ${x0 - 0.01},${y0}` : `M${x0},${y0} A${r},${r} 0 ${a > Math.PI ? 1 : 0},1 ${x1.toFixed(1)},${y1.toFixed(1)}`);
    ring.setAttribute('stroke', p >= 0.999 ? C.green : C.ochre);
  });
  X.term(9, 'Time lock', 'A rule that stops a key being destroyed\nbefore a set date.', { f: 0.1, until: 10 });
  const rv = X.person(kx + 1700, ky + 880, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 0.95 });
  X.show(rv, 9, { f: 0.2, type: 'left' });
  X.talk(rv, [9], { base: 'neutral' });
  const ask = X.g();
  X.rect(kx + 1200, ky + 560, 420, 90, { parent: ask, fill: C.card, r: 20, shadow: true });
  E('path', { d: `M${kx + 1600},${ky + 590} L${kx + 1650},${ky + 640} L${kx + 1600},${ky + 625} Z`, fill: C.card, stroke: C.line, 'stroke-width': 2 }, ask);
  X.text(kx + 1410, ky + 617, 'Erase my KYC data', { parent: ask, size: 30, anchor: 'middle', w: 600 });
  X.show(ask, 9, { f: 0.3, type: 'left', out: 10 });
  const resp = X.g();
  X.rect(kx + 1060, ky + 300, 560, 200, { parent: resp, fill: C.redL, stroke: C.red, r: 18, sw: 3 });
  X.text(kx + 1090, ky + 350, '423 Locked: legal hold', { parent: resp, size: 32, w: 700, fill: C.red, mono: true });
  X.text(kx + 1090, ky + 400, 'Sorry, the law says we must keep this', { parent: resp, size: 26, fill: C.ink });
  X.text(kx + 1090, ky + 440, 'for now. It will be erased automatically', { parent: resp, size: 26, fill: C.ink });
  X.text(kx + 1090, ky + 480, 'when the legal period ends.', { parent: resp, size: 26, fill: C.ink });
  X.show(resp, 9, { f: 0.55, type: 'pop', out: 10 });
  const arrR = X.arrow(kx + 990, ky + 400, kx + 1050, ky + 400, { color: C.red });
  X.show(arrR, 9, { f: 0.55, type: 'draw', out: 10 });
  const done = X.g();
  X.rect(kx + 1060, ky + 300, 560, 130, { parent: done, fill: C.greenL, stroke: C.green, r: 18, sw: 3 });
  X.text(kx + 1090, ky + 352, 'Legal period over', { parent: done, size: 32, w: 700, fill: C.green });
  X.text(kx + 1090, ky + 398, 'KYC key destroyed automatically', { parent: done, size: 26, fill: C.ink });
  X.show(done, 10, { f: 0.6, type: 'pop' });
  X.each(() => rv.mood(X.t > X.at(10, 0.6) ? 'happy' : 'neutral'));

  // ---------- region thm: Theorem 3 (cue 11) ----------
  const [tx, ty] = R.thm;
  const card = X.g();
  X.rect(tx + 160, ty + 220, 1000, 560, { parent: card, fill: C.card, r: 22, shadow: true, stroke: C.teal, sw: 3 });
  E('rect', { x: tx + 160, y: ty + 220, width: 1000, height: 90, rx: 22, fill: C.tealL }, card);
  E('rect', { x: tx + 160, y: ty + 280, width: 1000, height: 30, fill: C.tealL }, card);
  X.text(tx + 210, ty + 282, 'Theorem 3', { parent: card, size: 44, serif: true, w: 700, fill: C.teal });
  X.text(tx + 210, ty + 390, 'Once a key is destroyed, the tokens', { parent: card, size: 38, w: 600 });
  X.text(tx + 210, ty + 440, 'it locked reveal nothing about Ravi.', { parent: card, size: 38, w: 600 });
  X.text(tx + 210, ty + 530, 'Why: each token was random. Its only link', { parent: card, size: 28, fill: C.ink2 });
  X.text(tx + 210, ty + 570, 'to Ravi was the vault entry, now unreadable.', { parent: card, size: 28, fill: C.ink2 });
  const pr = X.g();
  X.mark(tx + 240, ty + 690, true, { parent: pr, s: 28 });
  X.text(tx + 285, ty + 702, 'proved by the team', { parent: pr, size: 30, w: 700, fill: C.green });
  X.show(card, 11, { type: 'up' });
  X.show(pr, 11, { f: 0.5, type: 'pop' });
  [TOK.crm, TOK.loan, TOK.log].forEach((tok, i) => {
    const g = X.g();
    X.chip(tx + 1500, ty + 330 + i * 140, tok, { parent: g, size: 28, mono: true, color: C.ink3, fill: C.paper });
    X.text(tx + 1740, ty + 342 + i * 140, '?', { parent: g, size: 44, w: 800, fill: C.ink3 });
    X.show(g, 11, { f: 0.2 + i * 0.08, type: 'left' });
  });
  const mag = X.icon('magnifier', 0, 0, 0.8, { color: C.ink });
  X.show(mag, 11, { f: 0.3, type: 'fade' });
  X.each(t => { const p = X.L(11, 0.3, 1); mag.mid.setAttribute('transform', `translate(${(tx + 1500 + 120 * Math.sin(p * 9)).toFixed(1)} ${(ty + 330 + 280 * (0.5 - 0.5 * Math.cos(p * 5))).toFixed(1)})`); });
  X.term(11, 'Theorem', 'A statement proved true with maths,\nstep by step, so it holds every time.', { f: 0.55, until: 12 });

  X.recap(12, ['Each customer has a key per purpose', 'Destroying the keys erases every copy at once', 'Keys the law requires are time-locked']);
});
