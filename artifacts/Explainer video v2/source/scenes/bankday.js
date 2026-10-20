// A day in the life of Ravi's data: one loan application becomes five copies in five places.
scene('bankday', X => {
  X.cam([{ x: 520, y: 560, s: 1.55 }, { k: 6, x: 960, y: 560, s: 1, len: 1.8 }]);
  // Ravi with the phone
  const ravi = X.person(300, 820, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1.1 });
  X.show(ravi, 0, { type: 'up' });
  X.wave(ravi, 0, { f: 0.2, len: 2.2 });
  X.each(() => { ravi.mood(X.t > X.at(4) && X.t < X.at(6) ? 'happy' : 'neutral'); });
  const phoneG = X.icon('phone', 420, 600, 0.9);
  X.show(phoneG, 1, { type: 'pop' });
  X.each(() => { if (X.t > X.at(1)) X.arms(ravi, 8, lerp(-8, 62, X.P(1, 0, 0, 0.5))); });

  // the form on the phone
  const form = X.rect(520, 330, 470, 470, { fill: C.card, r: 18 });
  X.show(form, 1, { f: 0.4, type: 'left', out: 6, outLen: 0.6 });
  const fields = [['Name', 'Ravi Kumar'], ['Aadhaar', '2345 6789 0124'], ['PAN', 'ABCPK1234L'], ['Mobile', '98765 43210'], ['Address', '12 Gandhi St, Madurai']];
  X.text(545, 372, 'Loan application', { parent: form, size: 26, w: 700, serif: true });
  fields.forEach(([lab, val], i) => {
    const y = 400 + i * 66;
    X.text(545, y + 20, lab, { parent: form, size: 18, fill: C.ink3, w: 600 });
    E('rect', { x: 545, y: y + 28, width: 420, height: 32, rx: 6, fill: C.paper, stroke: C.line, 'stroke-width': 1.5 }, form);
    const v = X.text(556, y + 52, '', { parent: form, size: 21, mono: i > 0 && i < 4, w: 500 });
    X.type(v, val, 2, { f0: i * 0.18, f1: i * 0.18 + 0.2 });
  });
  const otpRow = X.g(form);
  X.text(545, 750, 'OTP', { parent: otpRow, size: 18, fill: C.ink3, w: 600 });
  const otp = X.digits(700, 726, '482913', { anchor: 'start', cw: 34, ch: 44, size: 24, gap: 5, parent: otpRow, fill: C.ochreL });
  X.show(otpRow, 3, { type: 'up' });
  // the SMS bubble bringing the OTP
  const sms = X.g();
  X.rect(150, 300, 260, 70, { parent: sms, fill: C.ochreL, stroke: C.ochre, r: 16, shadow: true });
  X.text(280, 344, 'OTP: 482913', { parent: sms, size: 26, anchor: 'middle', mono: true, w: 600 });
  X.show(sms, 3, { type: 'down', out: 4, outLen: 0.4 });
  const apply = X.box(640, 800, 230, 64, { label: 'Apply', fill: C.green, stroke: C.green, color: C.card, size: 28, r: 32 });
  X.show(X.wrap(apply), 4, { type: 'pop', out: 6, outLen: 0.5 });
  X.pulse(apply, 755, 832, 4, { f: 0.3, amt: 0.12 });
  const tick = X.mark(1010, 832, true, { s: 26 });
  X.show(tick, 4, { f: 0.5, type: 'pop', out: 6 });

  // bank server in the middle
  const bank = X.g();
  X.icon('bank', 960, 520, 1.25, { parent: bank });
  X.text(960, 640, 'Bank servers', { parent: bank, size: 26, anchor: 'middle', w: 600, fill: C.ink2 });
  X.show(bank, 6, { type: 'pop' });
  X.term(6, 'Server', 'A powerful computer that runs the bank\'s apps\nand answers requests all day and night.', { until: 7 });

  // the message envelope: phone -> bank
  const env = X.g(); X.icon('envelope', 0, 0, 0.55, { parent: env });
  const toBank = spline([[430, 560], [620, 420], [840, 470], [900, 520]]);
  X.show(env, 6, { f: 0.1, type: 'fade', len: 0.3, out: 7, outLen: 0.3 });
  X.travel(env, toBank, 6, { f0: 0.15, f1: 0.75 });
  const pathBank = X.path(toBank.d, { color: C.line, sw: 3, dash: '2 12' });
  X.show(pathBank, 6, { type: 'fade' });

  // five places the copies go
  const sinks = [
    { k: 7, name: 'Log file', sub: 'notes for engineers', icon: 'log', y: 250, color: C.ink2, term: ['Log file', 'A diary a computer writes about everything it does,\nso engineers can find and fix problems later.'] },
    { k: 8, name: 'CRM', sub: 'customer screen for staff', icon: 'laptop', y: 425, color: C.blue, term: ['CRM', 'Customer Relationship Management: the screen\nbank staff use to look up a customer.'] },
    { k: 9, name: 'Loan vendor', sub: 'an outside company', icon: 'building', y: 600, color: C.plum, term: ['Vendor', 'An outside company the bank pays to do a job,\nlike checking a customer\'s credit history.'] },
    { k: 10, name: 'AI chatbot', sub: 'used by a staff member', icon: 'chat', y: 775, color: C.teal, term: ['AI chatbot', 'A computer program you type questions to,\nwhich writes answers like a person would.'] }
  ];
  sinks.forEach((s, i) => {
    const g = X.g();
    X.icon(s.icon, 1530, s.y, 0.62, { parent: g });
    X.text(1600, s.y - 4, s.name, { parent: g, size: 30, w: 700, serif: true });
    X.text(1600, s.y + 30, s.sub, { parent: g, size: 21, fill: C.ink2 });
    X.show(g, s.k, { type: 'left' });
    const sp = spline([[1030, 520], [1250, lerp(520, s.y, 0.4)], [1450, s.y]]);
    const ln = X.path(sp.d, { color: C.line, sw: 3 });
    X.show(ln, s.k, { type: 'draw', len: 0.8 });
    // a copy of the envelope flies there once
    const e2 = X.g(); X.icon('envelope', 0, 0, 0.4, { parent: e2 });
    X.show(e2, s.k, { f: 0.05, type: 'fade', len: 0.2, out: s.k, outf: 0.75, outLen: 0.2 });
    X.travel(e2, sp, s.k, { f0: 0.1, f1: 0.7 });
    // then a steady trickle of data keeps flowing
    X.stream(sp, { n: 3, speed: 0.28, r: 7, color: s.color, k0: s.k, f0: 0.8 });
    X.term(s.k, s.term[0], s.term[1], { until: s.k + 1 });
    // leak warning on each copy at the last line
    const warn = X.g(); X.icon('unlock', 1460, s.y - 46, 0.32, { parent: warn });
    X.show(warn, 12, { f: i * 0.12, type: 'pop' });
  });
  // the bank's own copy (the main database)
  const dbg = X.g(); X.icon('db', 960, 790, 0.62, { parent: dbg }); X.text(960, 870, 'Main database', { parent: dbg, size: 22, anchor: 'middle', fill: C.ink2 });
  X.show(dbg, 6, { f: 0.7, type: 'up' });
  const dbWarn = X.g(); X.icon('unlock', 1040, 760, 0.32, { parent: dbWarn }); X.show(dbWarn, 12, { f: 0.5, type: 'pop' });

  // counter
  const big = X.g();
  X.rect(560, 150, 800, 90, { parent: big, fill: C.ochreL, stroke: C.ochre, r: 45 });
  X.text(960, 208, '1 message  →  5 copies in 5 places', { parent: big, size: 38, anchor: 'middle', w: 700, serif: true });
  X.show(big, 11, { type: 'down' });
});
