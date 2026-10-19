// Scenes, one per chapter. Cue k = line k of that chapter's narration.

// moving dots along a set of paths (built from path elements)
function flowDots(X, paths, o = {}) {
  const layer = X.g(o.parent);
  const dots = [];
  paths.forEach((p, i) => {
    for (let j = 0; j < (o.n || 3); j++) {
      const d = E('circle', { r: o.r || 8, fill: o.color || C.red, opacity: 0 }, layer);
      dots.push({ d, p, ph: (j / (o.n || 3)) + i * 0.137 });
    }
  });
  X.each(t => {
    const on = o.when ? o.when(t) : 1;
    for (const k of dots) {
      if (on <= 0) { k.d.setAttribute('opacity', 0); continue; }
      const len = k.p.getTotalLength();
      const u = ((t * (o.speed || 0.25) + k.ph) % 1);
      const pt = k.p.getPointAtLength(u * len);
      k.d.setAttribute('cx', pt.x); k.d.setAttribute('cy', pt.y);
      const col = o.colorAt ? o.colorAt(t, u, pt) : (o.color || C.red);
      k.d.setAttribute('fill', col);
      k.d.setAttribute('opacity', on * Math.min(1, u * 8, (1 - u) * 8));
    }
  });
  return layer;
}

// ============================== INTRO
scene('intro', X => {
  const title = X.g();
  X.text(960, 400, 'Aran', { size: 170, w: 800, fill: C.teal, anchor: 'middle', parent: title, ls: 4 });
  X.text(960, 520, 'அரண்', { size: 84, w: 700, fill: C.amber, anchor: 'middle', parent: title, family: 'Noto Sans Tamil' });
  X.show(title, 0, { type: 'pop', out: 2 });
  const sub = X.text(960, 600, 'explained from zero', { size: 34, w: 400, fill: C.muted, anchor: 'middle' });
  X.show(sub, 0, { d: 0.6, out: 1 });
  const mean = X.text(960, 600, '= fortress, a protective wall', { size: 40, w: 600, fill: C.text, anchor: 'middle' });
  X.show(mean, 1, { f: 0.3, out: 2 });
  // brick wall builds
  const wall = X.g();
  const bricks = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
    const x = 690 + i * 60 - (r % 2) * 30, y = 760 - r * 34;
    if (x < 660 || x > 1220) continue;
    bricks.push(E('rect', { x, y, width: 56, height: 30, rx: 4, fill: C.amber, opacity: 0 }, wall));
  }
  X.show(wall, 1, { type: 'fade', len: 0.1, out: 2 });
  X.each(t => { const p = X.L(1, 0.3, 0.95); bricks.forEach((b, i) => b.setAttribute('opacity', p * bricks.length > i ? 0.85 : 0)); });
  // KARE
  const kare = X.g();
  X.icon('bank', 960, 330, 1.3, { parent: kare, color: C.blue });
  X.text(960, 480, 'Kalasalingam Academy of', { size: 46, w: 700, anchor: 'middle', parent: kare });
  X.text(960, 540, 'Research and Education (KARE)', { size: 46, w: 700, anchor: 'middle', parent: kare });
  X.show(kare, 2, { out: 3 });
  // team
  const team = [
    ['Inbathamizhan S', 'Lead · Cybersecurity', C.amber],
    ['Aasif Ahmed A', 'Cybersecurity', C.amber],
    ['SN Arun Vijay', 'AI / Machine learning', C.violet],
    ['Bharadhwaj M', 'AI / Machine learning', C.violet]];
  team.forEach(([n, r, col], i) => {
    const g = X.g();
    const x = 120 + i * 430;
    X.rect(x, 300, 390, 360, { parent: g, stroke: col, fill: C.panel });
    X.icon('person', x + 195, 420, 1.3, { parent: g, color: col });
    X.text(x + 195, 545, n, { size: 34, w: 700, anchor: 'middle', parent: g });
    X.text(x + 195, 595, r, { size: 26, w: 500, anchor: 'middle', fill: col, parent: g });
    X.show(g, 3, { f: [0.0, 0.25, 0.5, 0.75][i], type: 'pop', out: 4 });
  });
  // every word gets a picture
  const demo = X.g();
  X.chip(560, 400, 'Verhoeff', { size: 36, color: C.amber, parent: demo });
  X.chip(560, 620, 'Merkle tree', { size: 36, color: C.amber, parent: demo });
  X.show(demo, 4, { out: 5 });
  const a1 = X.arrow(720, 400, 1020, 400, { color: C.muted }); X.show(a1, 4, { f: 0.25, type: 'draw', out: 5 });
  const a2 = X.arrow(760, 620, 1020, 620, { color: C.muted }); X.show(a2, 4, { f: 0.35, type: 'draw', out: 5 });
  const pics = X.g();
  const pg = E('g', { transform: 'translate(1200,400)' }, pics);
  let pts = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; pts.push(`${80 * Math.cos(a)},${80 * Math.sin(a)}`); }
  E('polygon', { points: pts.join(' '), fill: 'none', stroke: C.teal, 'stroke-width': 5 }, pg);
  E('circle', { cx: 0, cy: -80, r: 11, fill: C.amber }, pg);
  const tg = E('g', { transform: 'translate(1200,620)' }, pics);
  E('path', { d: 'M0,-50 L-70,0 M0,-50 L70,0 M-70,0 L-105,50 M-70,0 L-35,50 M70,0 L35,50 M70,0 L105,50', stroke: C.teal, 'stroke-width': 4, fill: 'none' }, tg);
  for (const [x, y] of [[0, -50], [-70, 0], [70, 0], [-105, 50], [-35, 50], [35, 50], [105, 50]]) E('circle', { cx: x, cy: y, r: 12, fill: C.panel2, stroke: C.teal, 'stroke-width': 4 }, tg);
  X.show(pics, 4, { f: 0.45, type: 'pop', out: 5 });
  // roadmap
  const stops = ['The problem', 'The research', 'How Aran works', 'How it was built', 'Results', 'What comes next'];
  const road = X.path('M200,520 L1720,520', { color: C.line, sw: 6 });
  X.show(road, 5, { type: 'draw', len: 1.2 });
  stops.forEach((s, i) => {
    const x = 200 + i * 304;
    const g = X.g();
    X.circle(x, 520, 26, { fill: C.panel2, stroke: C.teal, sw: 5, parent: g });
    X.text(x, 531, String(i + 1), { size: 28, w: 700, anchor: 'middle', parent: g, fill: C.teal });
    X.text(x, i % 2 ? 610 : 460, s, { size: 30, w: 600, anchor: 'middle', parent: g });
    X.show(g, 5, { f: 0.1 + i * 0.13, type: 'pop' });
  });
});

// ============================== PROBLEM
scene('problem', X => {
  const A = X.g();
  X.icon('bank', 360, 500, 1.8, { parent: A, color: C.blue });
  X.text(360, 640, 'A bank', { size: 34, w: 700, anchor: 'middle', parent: A });
  X.show(A, 0, { type: 'pop', out: 2 });
  const dests = [['API calls between apps', 'server'], ['Log files', 'log'], ['Exports to other companies', 'file'], ['Support tools', 'chat'], ['AI chatbots', 'brain']];
  const paths = [];
  const B = X.g();
  dests.forEach(([n, ic], i) => {
    const y = 200 + i * 145;
    const pth = E('path', { d: `M470,500 C800,500 900,${y} 1250,${y}`, fill: 'none', stroke: C.line, 'stroke-width': 3 }, B);
    paths.push(pth);
    X.icon(ic, 1310, y, 0.55, { parent: B, color: C.text });
    X.text(1370, y + 11, n, { size: 32, w: 600, parent: B });
  });
  X.show(B, 1, { type: 'fade', out: 2 });
  flowDots(X, paths, { n: 3, speed: 0.22, when: t => X.P(1) * (1 - X.P(2, 0, 0, 0.5)) });
  // problem statement
  const ps = X.g();
  X.rect(260, 300, 1400, 400, { parent: ps, stroke: C.amber });
  X.text(960, 380, 'THE PROBLEM STATEMENT', { size: 26, w: 700, fill: C.amber, anchor: 'middle', ls: 3, parent: ps });
  X.text(960, 470, 'Find sensitive customer data in API traffic and logs,', { size: 44, w: 600, anchor: 'middle', parent: ps });
  X.text(960, 540, 'and protect it before it is stored or shared.', { size: 44, w: 600, anchor: 'middle', parent: ps });
  X.text(960, 630, 'Domain: Banking, Financial Services and FinTech', { size: 28, w: 400, fill: C.muted, anchor: 'middle', parent: ps });
  X.show(ps, 2, { type: 'pop', out: 3 });
  // leaks timeline
  const tl = X.line(160, 700, 1760, 700, { color: C.line, sw: 4 });
  X.show(tl, 3, { type: 'fade', out: 7 });
  const leaks = [
    ['2016', 'Debit cards', '≈3.2 million cards exposed via malware at a payment processor'],
    ['2020', 'Juspay', '35 million masked card records sold on the dark web'],
    ['2024', 'Star Health', 'Customer records sold through Telegram bots'],
    ['2024', 'Meta', '€91 million fine for passwords written into logs']];
  leaks.forEach(([yr, who, what], i) => {
    const x = 160 + i * 410;
    const g = X.g();
    X.rect(x, 250, 380, 380, { parent: g, stroke: C.red });
    X.text(x + 30, 320, yr, { size: 54, w: 800, fill: C.red, parent: g });
    X.text(x + 30, 380, who, { size: 36, w: 700, parent: g });
    const words = what.split(' '); let lines = [''], li = 0;
    for (const w of words) { if ((lines[li] + ' ' + w).length > 22) { lines.push(w); li++; } else lines[li] = (lines[li] + ' ' + w).trim(); }
    X.text(x + 30, 440, lines.join('\n'), { size: 28, w: 400, fill: C.muted, parent: g, lh: 38 });
    X.circle(x + 190, 700, 12, { fill: C.red, parent: g });
    X.show(g, 3 + i, { type: 'up', out: 7 });
  });
  // DPDP fine
  const fine = X.g();
  X.text(960, 330, 'DPDP Act 2023 · India', { size: 36, w: 600, fill: C.muted, anchor: 'middle', parent: fine });
  const big = X.text(960, 520, '₹0 crore', { size: 150, w: 800, fill: C.amber, anchor: 'middle', parent: fine });
  X.text(960, 620, 'maximum fine for failing to protect personal data', { size: 36, w: 500, anchor: 'middle', parent: fine });
  X.show(fine, 7, { type: 'pop' });
  X.each(t => big.set('₹' + fmt(250 * easeOut(X.L(7, 0.1, 0.7))) + ' crore'));
});

// ============================== IDENTIFIERS
scene('identifiers', X => {
  const pii = X.g();
  X.icon('person', 210, 190, 0.6, { parent: pii, color: C.amber });
  X.text(270, 182, 'PII', { size: 40, w: 800, fill: C.amber, parent: pii });
  X.text(360, 182, '= personally identifiable information: any data that points to one real person', { size: 30, w: 500, parent: pii });
  X.show(pii, 0, { type: 'left' });
  X.term(0, 'PII', 'any data that points to one real person');
  const W = 540, H = 300, xs = [100, 690, 1280], ys = [250, 575];
  const cards = [];
  const mk = (i, title) => {
    const g = X.g();
    const x = xs[i % 3], y = ys[Math.floor(i / 3)];
    const r = X.rect(x, y, W, H, { parent: g });
    X.text(x + 26, y + 50, title, { size: 32, w: 700, parent: g });
    cards.push({ g, r, x, y });
    X.show(g, i + 1, { type: 'pop' });
    return { g, x, y };
  };
  // 1 Aadhaar
  let c = mk(0, 'Aadhaar · 12 digits');
  const ad = X.digits(c.x + W / 2, c.y + 100, '234567890124', { cw: 34, ch: 54, size: 28, gap: 5, groups: [4, 4], groupGap: 14, parent: c.g });
  ad.paint(11, '#3a2e0b', C.amber, C.amber);
  X.arrow(ad.cells[11].cx, c.y + 230, ad.cells[11].cx, c.y + 165, { color: C.amber, parent: c.g, sw: 3, head: 12 });
  X.text(ad.cells[11].cx - 10, c.y + 262, 'check digit', { size: 26, w: 700, fill: C.amber, anchor: 'end', parent: c.g });
  // 2 PAN
  c = mk(1, 'PAN · income tax number');
  const pan = X.digits(c.x + W / 2, c.y + 100, 'ABCPK1234L', { cw: 40, ch: 56, size: 30, gap: 6, parent: c.g });
  const br = (i0, i1, label, col) => {
    const x0 = pan.cells[i0].x, x1 = pan.cells[i1].x + pan.cells[i1].w, y = c.y + 175;
    E('path', { d: `M${x0},${y} L${x0},${y + 12} L${x1},${y + 12} L${x1},${y}`, fill: 'none', stroke: col, 'stroke-width': 3 }, c.g);
    X.text((x0 + x1) / 2, y + 50, label, { size: 22, w: 600, fill: col, anchor: 'middle', parent: c.g });
  };
  for (let i = 0; i < 5; i++) pan.paint(i, null, C.blue); for (let i = 5; i < 9; i++) pan.paint(i, null, C.teal); pan.paint(9, null, C.violet);
  br(0, 4, '5 letters', C.blue); br(5, 8, '4 digits', C.teal); br(9, 9, '1 letter', C.violet);
  // 3 Card
  c = mk(2, 'Card · usually 16 digits');
  const cd = X.digits(c.x + W / 2, c.y + 100, '6521530000123458', { cw: 27, ch: 50, size: 24, gap: 4, groups: [4, 4, 4], groupGap: 10, parent: c.g });
  for (let i = 0; i < 6; i++) cd.paint(i, '#10233f', C.blue, C.blue);
  cd.paint(15, '#3a2e0b', C.amber, C.amber);
  X.text(cd.cells[0].x, c.y + 200, 'first 6–8: the issuing bank', { size: 24, w: 600, fill: C.blue, parent: c.g });
  X.text(cd.cells[15].x + cd.cells[15].w, c.y + 245, 'last: check digit', { size: 24, w: 600, fill: C.amber, anchor: 'end', parent: c.g });
  // 4 UPI
  c = mk(3, 'UPI ID · payment address');
  X.text(c.x + W / 2 - 150, c.y + 150, 'ravi', { size: 54, w: 700, mono: true, parent: c.g });
  X.text(c.x + W / 2 - 12, c.y + 150, '@oksbi', { size: 54, w: 700, mono: true, fill: C.teal, parent: c.g });
  X.text(c.x + W / 2, c.y + 230, 'looks just like an email address', { size: 26, w: 500, fill: C.muted, anchor: 'middle', parent: c.g });
  // 5 OTP
  c = mk(4, 'OTP · one-time password');
  const otp = X.digits(c.x + W / 2, c.y + 95, '482913', { cw: 54, ch: 70, size: 40, gap: 8, parent: c.g, color: C.red });
  X.text(c.x + W / 2, c.y + 235, 'random digits · no pattern · no check digit', { size: 25, w: 600, fill: C.red, anchor: 'middle', parent: c.g });
  X.text(c.x + W / 2, c.y + 272, 'the hardest thing to find', { size: 25, w: 500, fill: C.muted, anchor: 'middle', parent: c.g });
  X.each(t => { if (X.t > X.at(5) && X.t < X.at(6)) { const s = Math.floor(X.t * 6); otp.set(String(100000 + (s * 7919) % 900000)); } else otp.set('482913'); });
  // 6 mobile, name, address
  c = mk(5, 'Mobile · name · address');
  X.chip(c.x + W / 2, c.y + 110, '98765 43210', { size: 30, mono: true, color: C.text, parent: c.g });
  X.chip(c.x + W / 2, c.y + 180, 'Ravi Kumar', { size: 30, color: C.text, parent: c.g });
  X.chip(c.x + W / 2, c.y + 250, '12 Gandhi Street, Madurai', { size: 26, color: C.text, parent: c.g });
  X.each(t => cards.forEach((k, i) => {
    const active = X.t >= X.at(i + 1) && X.t < X.at(i + 2);
    k.r.r.setAttribute('stroke', active ? C.amber : C.line); k.r.r.setAttribute('stroke-width', active ? 4 : 2);
  }));
  // stamp
  const st = X.g();
  const sg = E('g', { transform: 'translate(960,560) rotate(-8)' }, st);
  E('rect', { x: -520, y: -70, width: 1040, height: 140, rx: 16, fill: '#0b1220', 'fill-opacity': 0.92, stroke: C.amber, 'stroke-width': 6 }, sg);
  const tt = E('text', { x: 0, y: -8, 'font-size': 52, 'font-weight': 800, fill: C.amber, 'text-anchor': 'middle', 'font-family': 'Inter', 'letter-spacing': 3 }, sg); tt.textContent = 'ALL EXAMPLES ARE GENERATED';
  const t2 = E('text', { x: 0, y: 46, 'font-size': 32, 'font-weight': 500, fill: C.text, 'text-anchor': 'middle', 'font-family': 'Inter' }, sg); t2.textContent = 'valid checksums · belong to no real person';
  X.show(st, 7, { type: 'pop', f: 0.1 });
});

// ============================== WORDS
scene('words', X => {
  const srcs = ['Mobile app', 'Core banking', 'Loan system'], sinks = ['Log platform', 'CRM', 'Vendor', 'AI provider'];
  const S = X.g(), K = X.g();
  X.text(230, 175, 'SOURCES', { size: 24, w: 700, fill: C.blue, anchor: 'middle', ls: 3, parent: S });
  X.text(1690, 175, 'SINKS', { size: 24, w: 700, fill: C.violet, anchor: 'middle', ls: 3, parent: K });
  srcs.forEach((s, i) => X.box(110, 205 + i * 115, 240, 80, { label: s, size: 26, stroke: C.blue, parent: S }));
  sinks.forEach((s, i) => X.box(1570, 195 + i * 88, 240, 70, { label: s, size: 26, stroke: C.violet, parent: K }));
  X.show(S, 0, { type: 'left' }); X.show(K, 0, { f: 0.45, type: 'right' });
  X.term(0, 'Source → Sink', 'where data comes from → where it ends up', { until: 1 });
  // paths via the gate
  const P = X.g();
  const pin = [], pout = [];
  srcs.forEach((s, i) => pin.push(E('path', { d: `M350,${245 + i * 115} C620,${245 + i * 115} 640,360 880,360`, fill: 'none', stroke: C.line, 'stroke-width': 3 }, P)));
  sinks.forEach((s, i) => pout.push(E('path', { d: `M1040,360 C1300,360 1300,${230 + i * 88} 1570,${230 + i * 88}`, fill: 'none', stroke: C.line, 'stroke-width': 3 }, P)));
  const mid = E('path', { d: 'M880,360 L1040,360', fill: 'none', stroke: C.line, 'stroke-width': 3 }, P);
  X.show(P, 1, { type: 'fade' });
  X.term(1, 'Data flow', 'data moving from a source to a sink', { until: 2 });
  const all = [];
  srcs.forEach((s, i) => sinks.forEach((k, j) => {
    if ((i + j) % 2 === 0 || j === i) { const d = pin[i].getAttribute('d') + ' L1040,360 ' + pout[j].getAttribute('d').replace('M1040,360', ''); all.push(E('path', { d, fill: 'none', stroke: 'none' }, P)); }
  }));
  flowDots(X, all, { n: 2, speed: 0.12, r: 9, when: t => X.P(1),
    colorAt: (t, u, pt) => (X.t > X.at(3) && pt.x > 1000) ? C.teal : C.red });
  // gate
  const gate = X.g();
  X.rect(880, 250, 160, 220, { parent: gate, fill: '#1b2440', stroke: C.amber, sw: 4 });
  X.text(960, 505, 'choke point', { size: 26, w: 700, fill: C.amber, anchor: 'middle', parent: gate });
  X.show(gate, 2, { type: 'pop', out: 3 });
  X.term(2, 'Choke point', 'one place every flow must pass through', { until: 3 });
  const fw = X.g();
  X.rect(880, 250, 160, 220, { parent: fw, fill: '#0f2b2b', stroke: C.teal, sw: 5 });
  X.icon('shield', 960, 345, 0.9, { parent: fw, color: C.teal });
  X.text(960, 352, 'Aran', { size: 28, w: 800, fill: C.teal, anchor: 'middle', parent: fw });
  X.text(960, 505, 'firewall for data', { size: 26, w: 700, fill: C.teal, anchor: 'middle', parent: fw });
  X.show(fw, 3, { type: 'pop' });
  X.term(3, 'Firewall (for data)', 'lets traffic pass, but changes the sensitive values', { until: 4 });
  // masking
  const dg = { cw: 25, ch: 46, size: 22, gap: 3, groups: [4, 4], groupGap: 10 };
  const mk = X.g();
  X.text(100, 600, 'Masking', { size: 32, w: 700, fill: C.amber, parent: mk });
  X.digits(280, 640, '234567890124', { ...dg, parent: mk });
  X.arrow(460, 663, 525, 663, { parent: mk, sw: 3, head: 14 });
  const m2 = X.digits(710, 640, 'XXXXXXXX0124', { ...dg, parent: mk });
  for (let i = 0; i < 8; i++) m2.paint(i, null, null, C.dim);
  X.text(495, 740, '✗  cannot be undone', { size: 26, w: 600, fill: C.red, anchor: 'middle', parent: mk });
  X.show(mk, 4, { type: 'up' });
  X.term(4, 'Masking', 'hide part of a value; it cannot be reversed', { until: 5 });
  // tokenisation
  const tk = X.g();
  X.text(990, 600, 'Tokenisation', { size: 32, w: 700, fill: C.teal, parent: tk });
  X.digits(1160, 640, '234567890124', { ...dg, parent: tk });
  X.arrow(1340, 663, 1405, 663, { parent: tk, sw: 3, head: 14, color: C.teal });
  X.digits(1590, 640, '098261586412', { ...dg, parent: tk, color: C.teal, stroke: C.teal });
  X.text(1590, 725, 'token: same 12-digit shape', { size: 24, w: 600, fill: C.teal, anchor: 'middle', parent: tk });
  X.show(tk, 5, { type: 'up' });
  X.term(5, 'Token', 'a stand-in with the same shape as the real value', { until: 6 });
  const dt = X.g();
  X.arrow(1590, 760, 1170, 760, { parent: dt, color: C.amber, bend: -0.12, sw: 3 });
  X.icon('lock', 1160, 830, 0.4, { parent: dt, color: C.amber });
  X.text(1200, 840, 'detokenise: allowed systems only · every call logged', { size: 24, w: 600, fill: C.amber, parent: dt });
  X.show(dt, 6, { type: 'draw' });
  X.term(6, 'Detokenise', 'swap a token back to the real value (logged)');
});

// ============================== REGEX
scene('regex', X => {
  const rg = X.g();
  X.box(560, 170, 800, 110, { label: 'regex:  [0-9]{6}', mono: true, size: 44, color: C.amber, stroke: C.amber, parent: rg });
  X.text(960, 330, '"any six digits in a row → call it an OTP"', { size: 32, w: 500, fill: C.muted, anchor: 'middle', parent: rg });
  X.show(rg, 0, { type: 'pop', out: 3 });
  X.term(0, 'Regex (regular expression)', 'a text pattern, like "six digits in a row"');
  const fp = X.g();
  X.rect(140, 400, 760, 360, { parent: fp, stroke: C.red });
  X.icon('alert', 260, 500, 0.8, { parent: fp, color: C.red });
  X.text(340, 490, 'FALSE POSITIVE', { size: 36, w: 800, fill: C.red, parent: fp });
  X.text(340, 530, '(false alarm)', { size: 28, w: 500, fill: C.muted, parent: fp });
  X.text(180, 630, 'block blk_', { size: 30, mono: true, fill: C.muted, parent: fp });
  X.text(375, 630, '475556', { size: 30, mono: true, fill: C.red, w: 800, parent: fp });
  X.text(180, 700, 'harmless number, flagged anyway', { size: 28, w: 500, parent: fp });
  X.show(fp, 1, { type: 'up', out: 3 });
  X.term(1, 'False positive', 'an alarm on something harmless', { until: 2 });
  const fn = X.g();
  X.rect(1020, 400, 760, 360, { parent: fn, stroke: C.violet });
  X.icon('clock', 1130, 500, 0.6, { parent: fn, color: C.violet });
  X.text(1210, 490, 'FALSE NEGATIVE', { size: 36, w: 800, fill: C.violet, parent: fn });
  X.text(1210, 530, '(a miss)', { size: 28, w: 500, fill: C.muted, parent: fn });
  X.text(1060, 630, 'your otp is 48 29 13', { size: 30, mono: true, fill: C.text, parent: fn });
  X.text(1060, 700, 'real secret, but split by spaces: missed', { size: 28, w: 500, parent: fn });
  X.show(fn, 2, { type: 'up', out: 3 });
  X.term(2, 'False negative', 'a real secret that was missed', { until: 3 });
  // Loghub
  const sys = ['HDFS', 'Hadoop', 'Spark', 'Zookeeper', 'BGL', 'HPC', 'Thunderbird', 'Windows', 'Linux', 'Mac', 'Android', 'HealthApp', 'Apache', 'OpenSSH', 'OpenStack', 'Proxifier'];
  const lh = X.g();
  X.text(100, 180, 'Loghub: 32,000 real log lines from 16 real systems', { size: 34, w: 700, parent: lh });
  sys.forEach((s, i) => X.chip(160 + (i % 8) * 222, 235 + Math.floor(i / 8) * 58, s, { size: 22, color: C.blue, width: 200, parent: lh }));
  X.show(lh, 3, { type: 'up', out: 7 });
  const none = X.g();
  X.box(1340, 360, 480, 130, { label: 'No Indian IDs inside', sub: 'so every hit is a false alarm', size: 32, stroke: C.amber, color: C.amber, parent: none });
  X.show(none, 4, { type: 'pop', out: 7 });
  // log wall
  const wall = X.g();
  X.rect(80, 340, 1220, 470, { parent: wall, fill: '#0a1020', r: 12 });
  const rows = [];
  const lines = window.DATA.log.slice(0, 12);
  lines.forEach(([s, l], i) => {
    const y = 380 + i * 36;
    const t = E('text', { x: 130, y, 'font-size': 19, 'font-family': 'DejaVu Sans Mono, monospace', fill: C.muted }, wall);
    const re = /(?<!\d)\d{6}(?!\d)/g; let last = 0, m; const hits = [];
    while ((m = re.exec(l))) {
      const a = E('tspan', null, t); a.textContent = l.slice(last, m.index);
      const h = E('tspan', { 'font-weight': 700 }, t); h.textContent = m[0]; hits.push(h); last = m.index + 6;
    }
    const z = E('tspan', null, t); z.textContent = l.slice(last);
    const dot = E('circle', { cx: 108, cy: y - 6, r: 7, fill: C.red, opacity: 0 }, wall);
    rows.push({ hits, dot });
  });
  X.show(wall, 5, { type: 'fade', out: 7 });
  const cnt = X.g();
  X.text(1570, 590, 'OTP-pattern alarms', { size: 28, w: 600, fill: C.muted, anchor: 'middle', parent: cnt });
  const num = X.text(1570, 680, '0', { size: 92, w: 800, fill: C.red, anchor: 'middle', parent: cnt });
  X.show(cnt, 5, { type: 'pop', out: 7 });
  X.each(t => {
    const p = X.L(5, 0.05, 0.9);
    rows.forEach((r, i) => { const on = p * rows.length > i; r.dot.setAttribute('opacity', on ? 1 : 0); r.hits.forEach(h => h.setAttribute('fill', on ? C.red : C.muted)); });
    num.set(fmt(67481 * easeOut(p)));
  });
  const hp = X.g();
  X.text(1570, 790, 'h', { size: 54, w: 700, mono: true, anchor: 'end', parent: hp });
  X.text(1570, 790, 'otp', { size: 54, w: 800, mono: true, fill: C.red, parent: hp });
  X.text(1670, 790, 'lug', { size: 54, w: 700, mono: true, parent: hp });
  X.show(hp, 6, { type: 'pop', out: 7 });
  // comparison bars
  const cmp = X.g();
  X.text(140, 330, 'False alarms on 32,000 real lines', { size: 36, w: 700, parent: cmp });
  X.text(140, 440, 'Plain OTP pattern', { size: 30, w: 600, fill: C.muted, parent: cmp });
  const b1 = X.rect(140, 460, 10, 70, { parent: cmp, fill: C.red, stroke: 'none', r: 8 });
  X.text(140, 620, "Aran's checks", { size: 30, w: 600, fill: C.muted, parent: cmp });
  const b2 = X.rect(140, 640, 10, 70, { parent: cmp, fill: C.teal, stroke: 'none', r: 8 });
  const v1 = X.text(0, 510, '67,481', { size: 40, w: 800, fill: C.red, parent: cmp });
  const v2 = X.text(170, 690, '6', { size: 40, w: 800, fill: C.teal, parent: cmp });
  X.show(cmp, 7, { type: 'fade', out: 8 });
  X.each(t => { const p = X.P(7, 0.15, 0, 1.2); const w = 10 + 1400 * p; b1.r.setAttribute('width', w); v1.t.setAttribute('x', 160 + w); b2.r.setAttribute('width', 10 + 0.12 * p); });
  // switched off
  const off = X.g();
  X.rect(700, 300, 220, 110, { parent: off, r: 55, fill: '#2a1320', stroke: C.red, sw: 4 });
  const knob = X.circle(755, 355, 40, { fill: C.red, parent: off });
  X.text(810, 470, 'detector switched OFF', { size: 34, w: 700, fill: C.red, anchor: 'middle', parent: off });
  X.icon('file', 640, 650, 0.8, { parent: off, color: C.red });
  X.text(700, 662, '→  real leaks go straight through', { size: 34, w: 600, parent: off });
  X.show(off, 8, { type: 'pop' });
});
