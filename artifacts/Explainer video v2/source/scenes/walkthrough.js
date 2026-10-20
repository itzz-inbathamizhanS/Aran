// Ravi's request, start to finish: one message travels through Aran's five stages, the camera following it.
scene('walkthrough', X => {
  const ST = [1700, 3400, 5100, 6800, 8500];   // stage centres
  const VX = 10400;                             // vendor
  const LX = 13000;                             // the "later" vignettes
  const CY = 520;                               // card centre y
  const names = ['Normalise', 'Detect', 'Decide', 'Protect', 'Record'];
  const icons = ['gear', 'magnifier', 'scale', 'shield', 'log'];
  const caps = ['wipe disguises', 'find every detail', 'check the ledger', 'swap and remove', 'remember the flow'];

  // ---------- conveyor ----------
  const belt = X.g();
  E('rect', { x: 500, y: 772, width: 10400, height: 22, rx: 11, fill: C.sand, stroke: C.line, 'stroke-width': 2 }, belt);
  const dash = E('line', { x1: 510, y1: 783, x2: 10890, y2: 783, stroke: C.ink3, 'stroke-width': 4, 'stroke-dasharray': '18 22' }, belt);
  X.each(t => dash.setAttribute('stroke-dashoffset', (-t * 60).toFixed(1)));

  // ---------- Ravi ----------
  const ravi = X.person(330, 800, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1.05 });
  X.show(ravi, 0, { type: 'up' });
  X.wave(ravi, 0, { f: 0.2, len: 1.8 });
  const phone = X.icon('phone', 450, 600, 0.7);
  X.show(phone, 0, { f: 0.1, type: 'pop' });
  X.each(t => { if (t > X.at(0, 0.2) + 2.2) X.arms(ravi, 8, 55); ravi.mood(t > X.at(8) ? 'happy' : 'neutral'); });

  // ---------- stations ----------
  ST.forEach((x, i) => {
    const g = X.g();
    X.rect(x - 360, 280, 720, 480, { parent: g, fill: 'none', stroke: C.teal, r: 24, sw: 3, dash: '12 10' });
    X.rect(x - 150, 205, 300, 60, { parent: g, fill: C.teal, stroke: C.teal, r: 30 });
    X.text(x, 246, (i + 1) + ' · ' + names[i], { parent: g, size: 30, anchor: 'middle', w: 700, fill: C.card });
    const ic = X.icon(icons[i], x - 520, 470, 0.95, { parent: g, check: true, fill: i === 0 ? C.tealL : undefined });
    if (i === 0) X.spin(ic.mid, x - 520, 470, { speed: 90 });
    else X.bob(ic.mid, { amp: 6, per: 2.4, ph: i });
    X.text(x - 520, 590, caps[i], { parent: g, size: 24, anchor: 'middle', fill: C.teal, w: 700 });
    X.show(g, i + 2, { type: 'down' });
  });
  const aranLab = X.chip(900, 860, 'Aran: five steps in a fraction of a second', { size: 26, color: C.teal, fill: C.tealL });
  X.show(aranLab, 1, { f: 0.7, type: 'up', out: 3 });

  // ---------- the message card ----------
  const card = X.g();
  const cardIn = X.g(card);
  X.rect(-320, -200, 640, 400, { parent: cardIn, fill: C.card, r: 16, shadow: true, sw: 3 });
  X.text(-295, -152, 'Loan request', { parent: cardIn, size: 30, serif: true, w: 700 });
  X.text(295, -152, 'to: loan vendor', { parent: cardIn, size: 24, anchor: 'end', fill: C.plum, w: 700 });
  E('line', { x1: -300, y1: -132, x2: 300, y2: -132, stroke: C.line, 'stroke-width': 2 }, cardIn);
  const labs = ['name', 'Aadhaar', 'PAN', 'mobile', 'address', 'OTP'];
  const probs = ['0.97', '0.99', '0.99', '0.98', '0.94', '0.99'];
  const rows = labs.map((l, i) => {
    const y = -88 + i * 55;
    const r = X.g(cardIn);
    const hl = E('rect', { x: -168, y: y - 30, width: 410, height: 42, rx: 8, fill: C.ochreL, opacity: 0 }, r);
    X.text(-295, y, l, { parent: r, size: 22, fill: C.ink3 });
    const v = X.text(-155, y, '', { parent: r, size: 26, mono: true, w: 600 });
    const chip = X.chip(282, y - 9, probs[i], { parent: r, size: 20, color: C.ochre, fill: C.ochreL, width: 70 });
    X.show(chip, 3, { f: 0.25 + i * 0.09, type: 'pop', out: 5 });
    X.show(r, 1, { f: 0.08 + i * 0.1, type: 'left' });
    return { hl, v, i };
  });
  X.show(card, 0, { f: 0.4, type: 'pop' });
  const pos = [900, 900, ST[0], ST[1], ST[2], ST[3], ST[3], ST[4], VX - 350];
  X.each(t => {
    let k = 0;
    for (let j = 0; j < pos.length; j++) if (t >= X.at(j)) k = j;
    const prev = pos[Math.max(0, k - 1)], p = ease(clamp((t - X.at(k)) / 1.5));
    const x = lerp(prev, pos[k], p);
    const lift = 18 * Math.sin(p * Math.PI);
    cardIn.setAttribute('transform', `translate(${x.toFixed(1)} ${(CY - lift).toFixed(1)})`);
    // values through the stages
    const A = X.at.bind(X);
    const val = [
      t < A(6, 0.2) ? 'Ravi Kumar' : '<PER:219779fa46>',
      t < A(2, 0.45) ? '2345.6789.O124' : (t < A(5, 0.4) ? '2345 6789 0124' : '0982 6158 6412'),
      t < A(6, 0.27) ? 'ABCPK1234L' : '<PAN:77816c3651>',
      t < A(2, 0.5) ? '98765-43210' : (t < A(6, 0.34) ? '98765 43210' : '<MOBILE:5c1e…>'),
      t < A(6, 0.41) ? '12 Gandhi St, Madurai' : '<ADDR:a07b…>',
      t < A(6, 0.55) ? '482913' : '[removed]'
    ];
    const changed = [t >= A(6, 0.2), t >= A(5, 0.4), t >= A(6, 0.27), t >= A(6, 0.34), t >= A(6, 0.41), t >= A(6, 0.55)];
    const disguised = [false, t < A(2, 0.45), false, t < A(2, 0.5), false, false];
    rows.forEach((r, i) => {
      // typing in during line 1
      const tp = X.L(1, 0.08 + i * 0.1, 0.25 + i * 0.1);
      const s = val[i];
      r.v.set(t < A(2) ? s.slice(0, Math.round(tp * s.length)) : s);
      r.v.t.setAttribute('fill', i === 5 && changed[5] ? C.ink3 : (changed[i] ? C.teal : (disguised[i] && t > A(2) ? C.red : C.ink)));
      const hlOn = t > A(3, 0.2 + i * 0.09) && t < A(5);
      r.hl.setAttribute('opacity', hlOn ? 1 : 0);
    });
  });

  // ---------- stage 1: normalise ----------
  const wipe = X.g();
  E('rect', { x: -330, y: -12, width: 660, height: 24, rx: 12, fill: C.tealL, stroke: C.teal, 'stroke-width': 3 }, wipe);
  X.show(wipe, 2, { f: 0.25, type: 'fade', len: 0.2, out: 2, outf: 0.7, outLen: 0.2 });
  X.each(() => { const p = ease(X.L(2, 0.28, 0.65)); wipe.setAttribute('transform', `translate(${ST[0]} ${lerp(CY - 140, CY + 190, p).toFixed(1)})`); });
  const n1 = X.g();
  [['dots', 'spaces'], ['letter O', 'zero'], ['dashes', 'spaces']].forEach(([a, b], i) => {
    const y = 380 + i * 90;
    const r = X.g(n1);
    X.text(ST[0] + 380, y, a, { parent: r, size: 24, fill: C.red, w: 700 });
    X.text(ST[0] + 380, y + 32, '→ ' + b, { parent: r, size: 24, fill: C.teal, w: 700 });
    X.show(r, 2, { f: 0.35 + i * 0.12, type: 'left' });
  });
  X.term(2, 'Normalise', 'Clean up a message so tricks like dots, dashes\nor look-alike letters are undone.', { until: 3, color: C.teal });

  // ---------- stage 2: detect ----------
  const mag = X.icon('magnifier', 0, 0, 0.5);
  X.show(X.wrap(mag), 3, { f: 0.15, type: 'fade', out: 3, outf: 0.85 });
  X.each(() => { const p = X.L(3, 0.2, 0.8); mag.mid.setAttribute('transform', `translate(${ST[1] + 120 + 60 * Math.sin(p * 18)} ${lerp(CY - 110, CY + 180, p).toFixed(1)})`); });
  const n2 = X.g();
  ['check digits', 'fingerprints', 'AI models'].forEach((s, i) => {
    const r = X.g(n2);
    X.chip(ST[1] + 490, 400 + i * 90, s, { parent: r, size: 22, color: C.blue, fill: C.blueL });
    X.show(r, 3, { f: 0.1 + i * 0.1, type: 'left' });
  });
  const prL = X.text(ST[1] + 490, 680, 'each with a\nprobability', { size: 22, anchor: 'middle', fill: C.ochre, w: 700 });
  X.show(prL, 3, { f: 0.6, type: 'up' });
  X.term(3, 'Probability', 'How sure Aran is that something is a real detail:\nfrom 0 (not at all) to 1 (certain).', { until: 4, color: C.ochre });

  // ---------- stage 3: decide (leakage ledger) ----------
  const led = X.g();
  X.rect(ST[2] + 370, 330, 260, 380, { parent: led, fill: C.paper, stroke: C.ink2, r: 10, sw: 3 });
  X.text(ST[2] + 500, 370, 'Ledger', { parent: led, size: 28, anchor: 'middle', serif: true, w: 700 });
  X.text(ST[2] + 500, 402, 'vendor · Ravi', { parent: led, size: 22, anchor: 'middle', fill: C.ink2 });
  X.text(ST[2] + 390, 450, 'already seen:', { parent: led, size: 22, fill: C.ink2 });
  E('rect', { x: ST[2] + 390, y: 466, width: 220, height: 24, rx: 8, fill: C.sand }, led);
  const ledBar = E('rect', { x: ST[2] + 390, y: 466, width: 0, height: 24, rx: 8, fill: C.green }, led);
  X.each(() => ledBar.setAttribute('width', (220 * 0.22 * X.P(4, 0.3, 0, 1)).toFixed(1)));
  X.text(ST[2] + 390, 530, 'nothing adds up', { parent: led, size: 22, fill: C.ink2 });
  X.text(ST[2] + 390, 560, 'to a full number', { parent: led, size: 22, fill: C.ink2 });
  const okSend = X.mark(ST[2] + 500, 640, true, { s: 30 });
  led.appendChild(okSend);
  X.show(okSend, 4, { f: 0.6, type: 'pop' });
  X.show(led, 4, { f: 0.15, type: 'left' });
  X.term(4, 'Leakage ledger', 'A running record of what each destination\nhas already seen about each customer.', { until: 5, color: C.green });

  // ---------- stage 4: protect ----------
  const tok = X.g();
  X.icon('key', ST[3] + 500, 380, 0.7, { parent: tok });
  X.text(ST[3] + 500, 450, 'made only for', { parent: tok, size: 22, anchor: 'middle', fill: C.ink2 });
  X.text(ST[3] + 500, 480, 'the loan vendor', { parent: tok, size: 22, anchor: 'middle', w: 700, fill: C.plum });
  X.show(tok, 5, { f: 0.2, type: 'left', out: 6, outf: 0.4 });
  const fail = X.g();
  X.mark(ST[3] + 440, 600, false, { parent: fail, s: 24 });
  X.text(ST[3] + 476, 596, 'fails the', { parent: fail, size: 22, fill: C.red, w: 700 });
  X.text(ST[3] + 476, 624, 'check digit', { parent: fail, size: 22, fill: C.red, w: 700 });
  X.text(ST[3] + 500, 670, 'on purpose', { parent: fail, size: 22, anchor: 'middle', fill: C.ink2 });
  X.show(fail, 5, { f: 0.6, type: 'pop', out: 6, outf: 0.4 });
  X.term(5, 'Token', 'A look-alike number that stands in for the real\none, made for one destination only.', { until: 6, color: C.plum });
  // labels and the shredder
  const shred = X.g();
  X.rect(ST[3] + 410, 420, 180, 120, { parent: shred, fill: C.ink2, stroke: C.ink, r: 12, sw: 3 });
  E('rect', { x: ST[3] + 430, y: 412, width: 140, height: 12, rx: 4, fill: C.ink }, shred);
  X.text(ST[3] + 500, 490, 'shredder', { parent: shred, size: 22, anchor: 'middle', fill: C.card, w: 700 });
  const strips = [];
  for (let i = 0; i < 6; i++) strips.push(E('rect', { x: ST[3] + 428 + i * 24, y: 540, width: 14, height: 0, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 1.5 }, shred));
  X.show(shred, 6, { f: 0.4, type: 'pop' });
  const otpStrip = X.g();
  E('rect', { x: -60, y: -20, width: 120, height: 40, rx: 6, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 2.5 }, otpStrip);
  const ot = E('text', { x: 0, y: 9, 'font-size': 24, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': F.mono, fill: C.ink }, otpStrip); ot.textContent = '482913';
  X.show(X.wrap(otpStrip), 6, { f: 0.55, type: 'fade', len: 0.15, out: 6, outf: 0.78, outLen: 0.15 });
  X.travel(otpStrip, spline([[ST[3] - 60, CY + 187], [ST[3] + 300, CY + 120], [ST[3] + 500, 400]]), 6, { f0: 0.56, f1: 0.78 });
  X.each(() => { const p = X.L(6, 0.78, 0.95); strips.forEach((s, i) => s.setAttribute('height', (110 * p * (0.7 + 0.3 * Math.sin(i * 1.7) ** 2)).toFixed(1))); });
  const nb = X.chip(ST[3], 860, 'nobody downstream needs the OTP', { size: 24, color: C.ink2, fill: C.card });
  X.show(nb, 6, { f: 0.7, type: 'up' });
  X.term(6, 'Keyed label', 'A stand-in made with a secret key, like <PER:…>.\nThe same value always gets the same label.', { until: 7, color: C.teal });

  // ---------- stage 5: record ----------
  const pl = X.g();
  X.rect(ST[4] + 370, 330, 260, 300, { parent: pl, fill: C.card, r: 12 });
  const R = rng(41);
  for (let i = 0; i < 26; i++) { const a = R() * 6.283, r = Math.sqrt(R()); E('circle', { cx: ST[4] + 480 + Math.cos(a) * r * 60, cy: 470 + Math.sin(a) * r * 50, r: 6, fill: C.green, opacity: 0.85 }, pl); }
  E('ellipse', { cx: ST[4] + 480, cy: 470, rx: 74, ry: 62, fill: 'none', stroke: C.green, 'stroke-width': 2.5, 'stroke-dasharray': '6 6' }, pl);
  X.text(ST[4] + 500, 600, 'normal traffic', { parent: pl, size: 22, anchor: 'middle', fill: C.green, w: 700 });
  X.show(pl, 7, { f: 0.1, type: 'left' });
  const nd = X.g(); E('circle', { cx: 0, cy: 0, r: 9, fill: C.blue, stroke: C.card, 'stroke-width': 2 }, nd);
  X.show(X.wrap(nd), 7, { f: 0.35, type: 'fade', len: 0.2 });
  X.travel(nd, spline([[ST[4] + 300, CY], [ST[4] + 400, 420], [ST[4] + 495, 478]]), 7, { f0: 0.38, f1: 0.75 });
  X.term(7, 'Immune layer', 'The part of Aran that learns normal traffic\nand raises an alert when something is strange.', { until: 8, color: C.plum });

  // ---------- the vendor ----------
  const vend = X.g();
  X.icon('building', VX + 250, 300, 0.95, { parent: vend });
  X.text(VX + 250, 400, 'Loan vendor', { parent: vend, size: 30, anchor: 'middle', serif: true, w: 700 });
  X.show(vend, 8, { type: 'fade' });
  const vs = X.person(VX + 650, 800, { shirt: C.teal, skin: C.skin[0], s: 0.95 });
  X.show(vs, 8, { f: 0.1, type: 'up' });
  X.each(t => vs.mood(t > X.at(8, 0.5) ? 'happy' : 'neutral'));
  const app = X.g();
  X.rect(VX + 80, 450, 440, 260, { parent: app, fill: C.card, stroke: C.ink2, r: 14, sw: 3 });
  E('rect', { x: VX + 80, y: 450, width: 440, height: 46, rx: 14, fill: C.tealL }, app);
  X.text(VX + 100, 482, 'Credit check app', { parent: app, size: 24, w: 700, fill: C.teal });
  ['ID number format', 'PAN format', 'request processed'].forEach((s, i) => {
    const r = X.g(app);
    X.text(VX + 105, 545 + i * 56, s, { parent: r, size: 24 });
    X.mark(VX + 480, 537 + i * 56, true, { parent: r, s: 16 });
    X.show(r, 8, { f: 0.3 + i * 0.1, type: 'left' });
  });
  X.show(app, 8, { f: 0.2, type: 'up' });
  const harm = X.chip(VX + 300, 860, 'nothing that can hurt Ravi', { size: 26, color: C.green, fill: C.greenL });
  X.show(harm, 8, { f: 0.7, type: 'up' });

  // ---------- later: three vignettes ----------
  const lt = X.text(LX, 200, 'Later...', { size: 40, anchor: 'middle', serif: true, w: 700, fill: C.ink2 });
  X.show(lt, 9, { type: 'down' });
  const panel = (cx, k, title, color) => {
    const g = X.g();
    X.rect(cx - 280, 250, 560, 620, { parent: g, fill: C.card, stroke: color, r: 20, sw: 3 });
    X.text(cx, 304, title, { parent: g, size: 28, anchor: 'middle', w: 700, serif: true });
    X.show(g, k, { type: 'up' });
    return g;
  };
  // 1. vendor leak -> trace names the vendor
  const P1 = panel(LX - 600, 9, 'If the vendor leaks', C.ochre);
  X.icon('file', LX - 680, 450, 0.9, { parent: P1 });
  X.text(LX - 600, 590, '0982 6158 6412', { parent: P1, size: 28, anchor: 'middle', mono: true, w: 700, fill: C.plum });
  const m1 = X.icon('magnifier', LX - 520, 440, 0.7, { parent: P1 });
  X.each(t => m1.mid.setAttribute('transform', `translate(${(14 * Math.sin(t * 3)).toFixed(1)} ${(10 * Math.cos(t * 2.4)).toFixed(1)})`));
  const tr = X.g(P1);
  X.rect(LX - 830, 660, 460, 130, { parent: tr, fill: C.ochreL, stroke: C.ochre, r: 14 });
  X.text(LX - 600, 712, 'this token was made for:', { parent: tr, size: 22, anchor: 'middle', fill: C.ink2 });
  X.text(LX - 600, 760, 'the loan vendor', { parent: tr, size: 32, anchor: 'middle', w: 800, fill: C.ochre });
  X.show(tr, 9, { f: 0.45, type: 'pop' });
  // 2. erasure -> keys destroyed + signed receipt
  const P2 = panel(LX, 10, 'If Ravi asks for erasure', C.teal);
  const keys = [0, 1, 2].map(i => { const k = X.icon('key', LX - 150 + i * 70, 400, 0.5, { parent: P2 }); return k; });
  X.icon('trash', LX - 80, 560, 0.75, { parent: P2, fill: C.sand });
  X.each(() => keys.forEach((k, i) => {
    const p = X.P(10, 0.15 + i * 0.1, 0, 0.6);
    k.mid.setAttribute('transform', `translate(${((-80) - (-150 + i * 70)) * p} ${150 * p})`);
    k.style.opacity = (1 - clamp((p - 0.75) / 0.25)).toFixed(2);
  }));
  const rcpt = X.g(P2);
  X.rect(LX + 70, 360, 170, 230, { parent: rcpt, fill: C.paper, stroke: C.ink2, r: 6, sw: 2.5 });
  X.text(LX + 155, 398, 'Receipt', { parent: rcpt, size: 24, anchor: 'middle', serif: true, w: 700 });
  for (let i = 0; i < 3; i++) E('line', { x1: LX + 90, y1: 425 + i * 26, x2: LX + 220, y2: 425 + i * 26, stroke: C.line, 'stroke-width': 6, 'stroke-linecap': 'round' }, rcpt);
  X.path(`M${LX + 92},${545} q15,-30 30,0 t30,0 t30,0`, { parent: rcpt, color: C.blue, sw: 3 }).p.style.strokeDasharray = 'none';
  X.show(rcpt, 10, { f: 0.5, type: 'pop' });
  const sgn = X.chip(LX, 700, 'keys destroyed', { size: 26, color: C.teal, fill: C.tealL });
  X.show(sgn, 10, { f: 0.45, type: 'up' });
  const sgn2 = X.chip(LX, 780, 'signed receipt', { size: 26, color: C.blue, fill: C.blueL });
  X.show(sgn2, 10, { f: 0.65, type: 'up' });
  // 3. insider -> alert
  const P3 = panel(LX + 600, 11, 'If an insider misbehaves', C.red);
  const insP = X.person(LX + 520, 740, { shirt: C.ochre, glasses: true, skin: C.skin[0], s: 0.85 });
  P3.appendChild(insP);
  const clk = X.icon('clock', LX + 720, 400, 0.6, { parent: P3 });
  X.text(LX + 720, 480, '2 a.m.', { parent: P3, size: 26, anchor: 'middle', w: 700, fill: C.red });
  const al = X.icon('alert', LX + 720, 610, 0.85, { parent: P3 });
  X.pulse(al.mid, LX + 720, 610, [11], { f: 0.4, amt: 0.3 });
  X.text(LX + 720, 700, 'alert!', { parent: P3, size: 30, anchor: 'middle', w: 800, fill: C.red });
  void clk;
  X.each(t => insP.mood(t > X.at(11, 0.4) ? 'shock' : 'neutral'));

  X.recap(12, ['Normalise, detect, decide, protect, record', 'Five steps for every single message', 'All in a fraction of a second']);

  X.cam([
    { x: 640, y: 520, s: 1.12 },
    { k: 1, x: 900, y: 520, s: 1.05, len: 1.4 },
    { k: 2, x: ST[0], y: 540, s: 1, len: 1.6 },
    { k: 3, x: ST[1], y: 540, s: 1, len: 1.8 },
    { k: 4, x: ST[2], y: 540, s: 1, len: 1.6 },
    { k: 5, x: ST[3], y: 540, s: 1, len: 1.6 },
    { k: 7, x: ST[4], y: 540, s: 1, len: 1.6 },
    { k: 8, x: VX + 150, y: 540, s: 1, len: 2 },
    { k: 9, x: LX, y: 560, s: 1, len: 1.8 }
  ]);
});
