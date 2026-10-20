// The live demo: a browser window (the console) whose page changes with each line,
// with the people who use it standing on the right.
scene('console', X => {
  X.cam([
    { x: 760, y: 520, s: 1.25 },
    { k: 0, f: 0.4, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 2, x: 780, y: 560, s: 1.1 },
    { k: 3, x: 760, y: 545, s: 1.04 },
    { k: 4, x: 1000, y: 545, s: 1.02 },
    { k: 6, x: 960, y: 540, s: 1 },
    { k: 7, x: 760, y: 560, s: 1.1 },
    { k: 8, x: 960, y: 545, s: 1.02 },
    { k: 9, x: 960, y: 540, s: 1 }
  ]);
  const BX = 120, BY = 150, BW = 1260, BH = 760; // browser window
  const CX0 = BX + 20, CY0 = BY + 80, CW = BW - 40, CH = BH - 100; // content area
  const ccx = CX0 + CW / 2;

  // ---------------- the browser window ----------------
  const win = X.g();
  X.rect(BX, BY, BW, BH, { parent: win, fill: C.card, stroke: C.ink2, sw: 3, r: 16, shadow: 8 });
  X.rect(BX, BY, BW, 60, { parent: win, fill: C.sand, stroke: C.ink2, sw: 3, r: 16 });
  [C.red, C.ochre, C.green].forEach((c, i) => X.circle(BX + 30 + i * 28, BY + 30, 9, { parent: win, fill: c }));
  X.rect(BX + 130, BY + 13, 620, 34, { parent: win, fill: C.card, stroke: C.line, r: 17, sw: 2 });
  const addr = X.text(BX + 152, BY + 38, '', { parent: win, size: 22, fill: C.ink2 });
  X.type(addr, 'Aran console', 0, { f0: 0.2, f1: 0.6 });
  const live = X.g(win);
  X.rect(BX + BW - 150, BY + 14, 120, 32, { parent: live, fill: C.redL, stroke: C.red, r: 16, sw: 2 });
  const liveDot = X.circle(BX + BW - 126, BY + 30, 7, { parent: live, fill: C.red });
  X.text(BX + BW - 78, BY + 39, 'LIVE', { parent: live, size: 22, w: 700, fill: C.red, anchor: 'middle' });
  X.each(t => { liveDot.style.opacity = Math.sin(t * 6) > 0 ? 1 : 0.25; });
  X.show(win, 0, { type: 'pop', len: 0.8 });
  X.term(0, 'Console', 'A website that shows the system working live,\nand lets you try it yourself.', { f: 0.3, until: 1 });
  const page = (k, out) => { const g = X.g(); X.show(g, k, { type: 'fade', len: 0.5, out: out == null ? k + 1 : out, outLen: 0.35 }); return g; };
  const title = (g, s, y = CY0 + 50) => X.text(ccx, y, s, { parent: g, size: 36, w: 700, anchor: 'middle', serif: true });

  // ---------------- right column: Aran's real code ----------------
  const srv = X.g();
  X.icon('server', 1630, 420, 1.2, { parent: srv, led: C.green });
  X.text(1630, 540, 'Aran\'s real code,\nrunning right now', { parent: srv, size: 26, w: 600, anchor: 'middle', lh: 34 });
  const gS = X.icon('gear', 1700, 330, 0.5, { parent: srv, fill: C.ochreL });
  X.spin(gS.mid, 1700, 330, { speed: 90 });
  X.show(srv, 1, { type: 'left', out: 4 });
  X.stream(X.spline([[1560, 430], [1460, 380], [1385, 420]]), { n: 4, speed: 0.55, r: 9, colors: [C.blue, C.green, C.ochre, C.red], k0: 1, f0: 0.2, k1: 4 });

  // cue 0: home page of the console
  const p0 = page(0);
  title(p0, 'Aran console', CY0 + 120);
  X.icon('shield', ccx, CY0 + 300, 1.4, { parent: p0, color: C.teal, check: true });
  X.text(ccx, CY0 + 450, 'a data firewall for banks, running live', { parent: p0, size: 28, anchor: 'middle', fill: C.ink2 });

  // cue 1: four kinds of live output
  const p1 = page(1);
  title(p1, 'Nothing here is made up');
  const outs = [['Numbers', 'coin', C.blue], ['Tokens', 'key', C.green], ['Receipts', 'file', C.ochre], ['Alerts', 'alert', C.red]];
  outs.forEach(([s, ic, col], i) => {
    const g = X.g(p1);
    const x = CX0 + 40 + i * 295;
    X.rect(x, CY0 + 120, 265, 300, { parent: g, fill: C.paper, stroke: col, sw: 3, r: 16 });
    const icg = X.icon(ic, x + 132, CY0 + 240, 0.85, { parent: g, color: col });
    X.bob(icg.mid, { amp: 5, per: 2, ph: i });
    X.text(x + 132, CY0 + 370, s, { parent: g, size: 30, w: 700, anchor: 'middle' });
    X.show(g, 1, { f: 0.3 + i * 0.1, type: 'pop' });
  });
  const fromCode = X.text(ccx, CY0 + 520, 'every one comes from the real code, at that moment', { parent: p1, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(fromCode, 1, { f: 0.7, type: 'up' });

  // cue 2: guided tour, requests flying in and tokens coming out
  const p2 = page(2);
  title(p2, 'Guided tour');
  for (let i = 0; i < 13; i++) {
    const cxx = ccx - 6 * 70 + i * 70;
    const c = X.circle(cxx, CY0 + 110, 20, { parent: p2, fill: C.card, stroke: C.ink3, sw: 3 });
    X.text(cxx, CY0 + 118, String(i + 1), { parent: p2, size: 22, w: 700, anchor: 'middle', fill: C.ink2 });
    X.each(() => { const cur = Math.floor(X.L(2, 0.05, 0.95) * 13); c.c.setAttribute('fill', i <= cur && X.t > X.at(2) ? C.ochreL : C.card); c.c.setAttribute('stroke', i === cur ? C.ochre : C.ink3); });
  }
  const sh2 = X.icon('shield', ccx, CY0 + 360, 1.3, { parent: p2, color: C.teal });
  X.text(ccx, CY0 + 470, 'Aran', { parent: p2, size: 30, w: 700, anchor: 'middle', serif: true, fill: C.teal });
  X.pulse(sh2.mid, ccx, CY0 + 360, [2], { f: 0.3, amt: 0.1 });
  const reqs = [['Aadhaar 2345 6789 0124', 'Aadhaar 2498 2684 6187'], ['Mobile 98765 43210', 'Mobile token'], ['PAN ABCPK1234L', 'PAN token']];
  // one request at a time: raw chip flies in from the left, token chip flies out to the right
  const rawChip = X.g(p2), tokChip = X.g(p2);
  const rawT = X.chip(0, 0, reqs[0][0], { parent: rawChip, size: 24, mono: true, color: C.red, fill: C.redL, width: 380 });
  const tokT = X.chip(0, 0, reqs[0][1], { parent: tokChip, size: 24, mono: true, color: C.green, fill: C.greenL, width: 380 });
  X.each(t => {
    const on = X.t > X.at(2, 0.1) && X.t < X.at(3);
    rawChip.style.display = tokChip.style.display = on ? '' : 'none';
    if (!on) return;
    const per = 3.2, u = ((t - X.at(2, 0.1)) % per) / per, n = Math.floor((t - X.at(2, 0.1)) / per) % 3;
    rawT.t.set(reqs[n][0]); tokT.t.set(reqs[n][1]);
    const a = ease(clamp(u / 0.45)), b = ease(clamp((u - 0.5) / 0.45));
    rawChip.setAttribute('transform', `translate(${lerp(CX0 + 200, ccx - 150, a).toFixed(1)} ${(CY0 + 360 - 60 * Math.sin(a * Math.PI)).toFixed(1)})`);
    rawChip.style.opacity = u < 0.47 ? 1 : 0;
    tokChip.setAttribute('transform', `translate(${lerp(ccx + 150, CX0 + CW - 200, b).toFixed(1)} ${(CY0 + 360 - 60 * Math.sin(b * Math.PI)).toFixed(1)})`);
    tokChip.style.opacity = u > 0.5 ? 1 : 0;
  });
  X.text(ccx, CY0 + 590, 'real requests in, tokens out', { parent: p2, size: 28, anchor: 'middle', fill: C.ink2 });
  X.term(2, 'Request', 'A message sent to a computer,\nasking it to do something.', { until: 3 });

  // cue 3: Without Aran / With Aran
  const p3 = page(3);
  const half = CW / 2 - 10;
  [[CX0, 'Without Aran', C.red, C.redL, false], [CX0 + half + 20, 'With Aran', C.green, C.greenL, true]].forEach(([x, s, col, fl, safe], j) => {
    X.rect(x, CY0 + 10, half, CH - 30, { parent: p3, fill: fl, stroke: col, sw: 3, r: 16 });
    X.text(x + half / 2, CY0 + 70, s, { parent: p3, size: 36, w: 700, anchor: 'middle', serif: true, fill: col });
    X.icon(safe ? 'lock' : 'unlock', x + 70, CY0 + 60, 0.42, { parent: p3, color: col });
    X.text(x + 40, CY0 + 140, 'what the log file receives:', { parent: p3, size: 24, fill: C.ink2 });
    const rows = safe ? ['Aadhaar 2498 2684 6187', 'Mobile token', 'PAN token', 'Aadhaar 2498 2684 6187'] : ['Aadhaar 2345 6789 0124', 'Mobile 98765 43210', 'PAN ABCPK1234L', 'Aadhaar 2345 6789 0124'];
    rows.forEach((r, i) => {
      const g = X.g(p3);
      X.rect(x + 40, CY0 + 170 + i * 80, half - 80, 62, { parent: g, fill: C.card, stroke: col, sw: 2, r: 10 });
      X.text(x + 64, CY0 + 211 + i * 80, r, { parent: g, size: 26, mono: true, fill: col, w: 600 });
      X.show(g, 3, { f: 0.15 + i * 0.17, type: 'left' });
    });
    const m = X.mark(x + half - 70, CY0 + CH - 90, safe, { s: 32, parent: p3 });
    X.show(m, 3, { f: 0.85, type: 'pop' });
  });

  // ---------------- right column: the judge ----------------
  const judge = X.person(1640, 860, { shirt: C.ochre, skin: C.skin[0], tie: C.ink, name: 'Judge', s: 1 });
  X.show(judge, 4, { type: 'left', out: 7 });
  const jphone = X.g();
  const jp = X.icon('phone', 1560, 600, 0.55, { parent: jphone });
  X.show(jphone, 4, { f: 0.1, type: 'pop', out: 7 });
  X.each(() => { if (X.t > X.at(4) && X.t < X.at(7)) X.arms(judge, 8, 110); });
  X.talk(judge, [5], { base: 'happy' });

  // cue 4: QR code on the console page, scanned by the judge
  const p4 = page(4);
  title(p4, 'Beat the Firewall');
  X.text(ccx, CY0 + 105, 'scan to play on your own phone', { parent: p4, size: 26, anchor: 'middle', fill: C.ink2 });
  X.icon('qr', ccx, CY0 + 360, 3, { parent: p4 });
  const scan = E('rect', { x: ccx - 130, y: 0, width: 260, height: 6, rx: 3, fill: C.red }, p4);
  X.each(t => { const u = (t * 0.7) % 1; scan.setAttribute('y', (CY0 + 245 + 230 * (u < 0.5 ? u * 2 : 2 - u * 2)).toFixed(1)); });
  const beam = X.path(`M1530,580 L${ccx + 130},${CY0 + 250} M1530,620 L${ccx + 130},${CY0 + 470}`, { color: C.ochre, sw: 2, dash: '8 8' });
  X.show(beam, 4, { f: 0.3, type: 'fade', out: 5 });
  X.term(4, 'QR code', 'A square barcode that a phone camera\ncan read, to open a web page.', { until: 5 });

  // cue 5: the judge's phone trying to sneak an Aadhaar past Aran
  const p5 = page(5);
  X.text(CX0 + 300, CY0 + 50, 'Judge\'s phone', { parent: p5, size: 28, w: 700, anchor: 'middle', fill: C.ink2 });
  X.rect(CX0 + 150, CY0 + 80, 300, 560, { parent: p5, fill: C.ink, stroke: C.ink, r: 36 });
  X.rect(CX0 + 168, CY0 + 110, 264, 490, { parent: p5, fill: C.paper, stroke: 'none', r: 14 });
  X.text(CX0 + 300, CY0 + 160, 'Try to sneak it past', { parent: p5, size: 22, w: 700, anchor: 'middle' });
  X.rect(CX0 + 185, CY0 + 190, 230, 56, { parent: p5, fill: C.card, stroke: C.blue, r: 10, sw: 2 });
  const typed = X.text(CX0 + 198, CY0 + 226, '', { parent: p5, size: 23, mono: true, w: 600 });
  X.type(typed, '2345 6789 0124', 5, { f0: 0.05, f1: 0.35 });
  const ways = [['type', 0.05], ['paste', 0.4], ['speak', 0.6]];
  ways.forEach(([w, f], i) => {
    const c = X.chip(CX0 + 300, CY0 + 300 + i * 70, w, { parent: p5, size: 24, width: 170, color: C.ink2 });
    X.each(() => { const on = X.t > X.at(5, f) && X.t < X.at(5, f + 0.32); c.r.setAttribute('fill', on ? C.ochreL : C.card); c.r.setAttribute('stroke', on ? C.ochre : C.line); });
  });
  X.rect(CX0 + 210, CY0 + 520, 180, 52, { parent: p5, fill: C.blue, stroke: C.blue, r: 26 });
  X.text(CX0 + 300, CY0 + 554, 'Send', { parent: p5, size: 24, w: 700, anchor: 'middle', fill: C.card });
  const shot = X.g(p5);
  X.chip(0, 0, '2345 6789 0124', { parent: shot, size: 24, mono: true, color: C.red, fill: C.redL, width: 250 });
  X.travel(shot, X.spline([[CX0 + 450, CY0 + 545], [CX0 + 640, CY0 + 300], [CX0 + 830, CY0 + 330]]), 5, { f0: 0.72, f1: 0.88 });
  X.each(() => { shot.style.opacity = X.t > X.at(5, 0.72) && X.t < X.at(5, 0.9) ? 1 : 0; });
  const sh5 = X.icon('shield', CX0 + 900, CY0 + 330, 1.4, { parent: p5, color: C.teal });
  X.shake(sh5.mid, 5, { f: 0.88 });
  const caught = X.g(p5);
  X.chip(CX0 + 900, CY0 + 470, 'Caught!', { parent: caught, size: 30, color: C.green, fill: C.greenL });
  X.chip(CX0 + 900, CY0 + 545, 'token 2498 2684 6187', { parent: caught, size: 22, mono: true, color: C.green });
  X.show(caught, 5, { f: 0.9, type: 'pop' });

  // cue 6: the live scoreboard
  const p6 = page(6);
  title(p6, 'Live scoreboard');
  const hdrs = ['Attempt', 'How', 'Result'];
  hdrs.forEach((h, i) => X.text(CX0 + 120 + i * 380, CY0 + 120, h, { parent: p6, size: 24, w: 700, fill: C.ink2 }));
  X.line(CX0 + 100, CY0 + 140, CX0 + CW - 100, CY0 + 140, { parent: p6, color: C.line, sw: 3 });
  const att = [['Aadhaar', 'typed'], ['Card number', 'pasted'], ['Mobile number', 'spoken'], ['Aadhaar with dots', 'typed'], ['Mobile in words', 'spoken'], ['PAN', 'pasted']];
  att.forEach(([a, h], i) => {
    const g = X.g(p6);
    const y = CY0 + 190 + i * 70;
    X.rect(CX0 + 100, y - 40, CW - 200, 58, { parent: g, fill: i % 2 ? C.paper : C.card, stroke: 'none', r: 8 });
    X.text(CX0 + 120, y, a, { parent: g, size: 26, w: 600 });
    X.text(CX0 + 500, y, h, { parent: g, size: 26, fill: C.ink2 });
    X.mark(CX0 + 900, y - 10, true, { parent: g, s: 20 });
    X.text(CX0 + 935, y, 'caught', { parent: g, size: 26, w: 700, fill: C.green });
    X.show(g, 6, { f: 0.05 + i * 0.13, type: 'down', dist: 20 });
  });

  // cue 7: card scan, numbers get covered
  const p7 = page(7);
  title(p7, 'Card scan');
  const idc = X.g(p7);
  X.rect(ccx - 330, CY0 + 110, 660, 400, { parent: idc, fill: C.ochreL, stroke: C.ink2, sw: 4, r: 24 });
  X.text(ccx - 290, CY0 + 170, 'SAMPLE ID CARD', { parent: idc, size: 26, w: 700, fill: C.ochre });
  X.circle(ccx - 210, CY0 + 290, 70, { parent: idc, fill: C.card, stroke: C.ink2, sw: 3 });
  X.icon('person', ccx - 210, CY0 + 300, 0.9, { parent: idc, color: C.ink2 });
  X.text(ccx - 100, CY0 + 260, 'Ravi Kumar', { parent: idc, size: 32, w: 700 });
  X.text(ccx - 100, CY0 + 310, 'Madurai', { parent: idc, size: 26, fill: C.ink2 });
  X.text(ccx - 290, CY0 + 455, '2345 6789 0124', { parent: idc, size: 46, w: 700, mono: true });
  const cover = E('rect', { x: ccx - 298, y: CY0 + 408, width: 0, height: 64, rx: 8, fill: C.ink }, idc);
  const scan7 = E('rect', { x: ccx - 340, y: 0, width: 680, height: 8, rx: 4, fill: C.teal, opacity: 0.8 }, idc);
  X.each(() => {
    const u = X.L(7, 0.15, 0.55);
    scan7.setAttribute('y', (CY0 + 110 + 392 * u).toFixed(1));
    scan7.style.opacity = u > 0 && u < 1 ? 0.8 : 0;
    cover.setAttribute('width', (430 * ease(X.L(7, 0.6, 0.8))).toFixed(1));
  });
  const covered = X.chip(ccx, CY0 + 580, 'number found and covered', { parent: p7, size: 26, color: C.green, fill: C.greenL });
  X.show(covered, 7, { f: 0.8, type: 'pop' });
  const upl = X.g(); X.icon('idcard', 0, 0, 0.8, { parent: upl });
  X.travel(upl, X.spline([[1660, 500], [1500, 380], [1300, 420]]), 7, { f0: 0, f1: 0.15 });
  X.each(() => { upl.style.opacity = X.t > X.at(7) && X.t < X.at(7, 0.17) ? 1 : 0; });
  X.term(7, 'Card scan', 'The computer reads the numbers in a photo,\nthen covers them up.', { until: 8 });

  // ---------------- right column: Ravi on the phone (cue 8) ----------------
  const ravi = X.person(1640, 860, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1 });
  X.show(ravi, 8, { type: 'left', out: 9 });
  const rphone = X.icon('phone', 1560, 620, 0.5);
  X.show(rphone, 8, { f: 0.1, type: 'pop', out: 9 });
  X.each(() => { if (X.t > X.at(8) && X.t < X.at(9)) { X.arms(ravi, 8, 110); ravi.mood(X.t > X.at(8, 0.8) ? 'happy' : 'neutral'); } });
  // cue 8: My Data page on a phone
  const p8 = page(8);
  X.rect(ccx - 260, CY0 + 10, 520, 640, { parent: p8, fill: C.ink, stroke: C.ink, r: 40 });
  X.rect(ccx - 236, CY0 + 40, 472, 580, { parent: p8, fill: C.paper, stroke: 'none', r: 18 });
  X.text(ccx, CY0 + 95, 'My Data', { parent: p8, size: 36, w: 700, anchor: 'middle', serif: true });
  X.text(ccx, CY0 + 132, 'where your data went', { parent: p8, size: 22, anchor: 'middle', fill: C.ink2 });
  const dests = [['CRM', '2498 2684 6187', C.blue], ['Loan vendor', '0982 6158 6412', C.plum], ['Log platform', '0196 3809 2692', C.teal]];
  dests.forEach(([d, tok, col], i) => {
    const g = X.g(p8);
    const y = CY0 + 165 + i * 105;
    X.rect(ccx - 210, y, 420, 90, { parent: g, fill: C.card, stroke: col, sw: 3, r: 12 });
    X.text(ccx - 190, y + 38, d, { parent: g, size: 26, w: 700, fill: col });
    X.text(ccx - 190, y + 72, tok, { parent: g, size: 23, mono: true, fill: C.ink2 });
    X.show(g, 8, { f: 0.1 + i * 0.12, type: 'left' });
    const strike = E('line', { x1: ccx - 200, y1: y + 45, x2: ccx - 200, y2: y + 45, stroke: C.red, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    X.each(() => strike.setAttribute('x2', ccx - 200 + 400 * ease(X.L(8, 0.78 + i * 0.05, 0.86 + i * 0.05))));
  });
  const eb = X.g(p8);
  X.rect(ccx - 150, CY0 + 500, 300, 64, { parent: eb, fill: C.red, stroke: C.red, r: 32 });
  X.text(ccx, CY0 + 541, 'Erase my data', { parent: eb, size: 26, w: 700, anchor: 'middle', fill: C.card });
  X.pulse(eb, ccx, CY0 + 532, [8], { f: 0.62, amt: 0.12 });
  X.pulse(eb, ccx, CY0 + 532, [8], { f: 0.72, amt: -0.08, len: 0.4 });
  const rc = X.chip(ccx + 430, CY0 + 300, 'Erasure receipt', { parent: p8, size: 26, color: C.green, fill: C.greenL });
  X.show(rc, 8, { f: 0.9, type: 'pop' });
  X.term(8, 'Erasure', 'Deleting a customer\'s data for good,\nwhen they ask for it.', { f: 0.5, until: 9 });

  // cue 9: languages and presenter mode
  const p9 = page(9, 10);
  const langs = ['English', 'தமிழ்', 'हिन्दी'];
  const hello = ['Welcome to Aran', 'அரணுக்கு வரவேற்பு', 'अरण में स्वागत है'];
  langs.forEach((l, i) => {
    const c = X.chip(ccx - 230 + i * 230, CY0 + 70, l, { parent: p9, size: 28, width: 200 });
    X.each(t => { const cur = Math.floor(Math.max(0, t - X.at(9)) / 1.4) % 3; c.r.setAttribute('fill', cur === i ? C.ochreL : C.card); c.r.setAttribute('stroke', cur === i ? C.ochre : C.line); });
  });
  const hel = X.text(ccx, CY0 + 230, hello[0], { parent: p9, size: 54, w: 700, anchor: 'middle' });
  X.each(t => hel.set(hello[Math.floor(Math.max(0, t - X.at(9)) / 1.4) % 3]));
  // slides advancing with the clicker
  for (let i = 0; i < 3; i++) X.rect(ccx - 300 + i * 210, CY0 + 320, 180, 120, { parent: p9, fill: [C.blueL, C.greenL, C.plumL][i], stroke: [C.blue, C.green, C.plum][i], r: 12, sw: 3 });
  const slideN = X.text(ccx, CY0 + 520, 'Presenter mode: chapter 1', { parent: p9, size: 30, w: 600, anchor: 'middle', fill: C.ink2 });
  const sel = E('rect', { x: 0, y: CY0 + 312, width: 196, height: 136, rx: 16, fill: 'none', stroke: C.ochre, 'stroke-width': 6 }, p9);
  X.each(t => {
    const n = Math.floor(Math.max(0, t - X.at(9, 0.3)) / 1.6);
    sel.setAttribute('x', ccx - 308 + (n % 3) * 210);
    slideN.set('Presenter mode: chapter ' + (n + 1));
  });
  const pres = X.person(1640, 860, { shirt: C.green, skin: C.skin[1], name: 'Presenter', s: 1 });
  X.show(pres, 9, { type: 'left', out: 10 });
  const click = X.g();
  const clk = X.g(click);
  X.rect(1520, 610, 50, 90, { parent: clk, fill: C.ink2, stroke: C.ink, r: 14 });
  X.circle(1545, 640, 10, { parent: clk, fill: C.ochre });
  X.circle(1545, 672, 8, { parent: clk, fill: C.card });
  X.show(click, 9, { f: 0.1, type: 'pop', out: 10 });
  X.each(t => {
    if (X.t > X.at(9) && X.t < X.at(10)) X.arms(pres, 8, 100);
    const u = (Math.max(0, t - X.at(9, 0.3)) % 1.6) / 1.6;
    clk.setAttribute('transform', `translate(0 ${u < 0.1 ? 6 : 0})`);
  });
  X.term(9, 'Presenter mode', 'A screen setup for showing the demo\nto an audience, step by step.', { f: 0.45, until: 10 });

  X.recap(10, ['The console runs Aran\'s real code', 'Judges try to beat it from their phones', 'Card scan, My Data, three languages']);
});
