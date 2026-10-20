// Copies everywhere: an ID photocopy you lose control of, then the same at bank scale (logs, reports, backups, vendors).
scene('copies', X => {
  const BX = 2200, CY = 1200, DX = 4400;
  X.cam([
    { x: 620, y: 600, s: 1.3 },
    { k: 1, x: 960, y: 560, s: 1, len: 1.6 },
    { k: 2, f: 0.05, x: 1330, y: 580, s: 1.12 },
    { k: 3, x: BX + 960, y: 540, s: 1, len: 2.2 },
    { k: 4, x: BX + 620, y: 560, s: 1.12 },
    { k: 5, x: BX + 960, y: 540, s: 1 },
    { k: 6, x: BX + 960, y: CY + 540, s: 1, len: 2 },
    { k: 7, x: DX + 900, y: CY + 540, s: 1.05, len: 2 },
    { k: 8, x: DX + 960, y: CY + 540, s: 1 },
    { k: 9, f: 0.1, x: DX + 960, y: CY + 520, s: 0.97 }
  ]);
  const copyShape = (parent, sc = 1) => {
    const g = E('g', null, parent);
    const i = E('g', { transform: `scale(${sc})` }, g);
    E('rect', { x: -56, y: -38, width: 112, height: 76, rx: 6, fill: C.paper, stroke: C.ink3, 'stroke-width': 3 }, i);
    E('circle', { cx: -28, cy: -4, r: 13, fill: C.sand, stroke: C.ink3, 'stroke-width': 2 }, i);
    for (const [y, w] of [[-14, 52], [0, 40], [14, 46]]) E('line', { x1: -6, y1: y, x2: -6 + w, y2: y, stroke: C.ink3, 'stroke-width': 4, 'stroke-linecap': 'round' }, i);
    return g;
  };

  // ---------------- A: the photocopy ----------------
  const ravi = X.person(220, 850, { shirt: C.blue, skin: C.skin[1], name: 'Ravi' });
  X.show(ravi, 0, { type: 'up' });
  X.each(t => {
    ravi.mood(t > X.at(1, 0.7) && t < X.at(3) ? 'sad' : 'neutral');
    if (t < X.at(1)) X.arms(ravi, 8, lerp(-8, 60, X.P(0, 0.05, 0, 0.5) * (1 - X.P(0, 0.35, 0, 0.5))));
    else X.arms(ravi, 8, lerp(-8, 40, X.P(1, 0, 0, 0.5) * (1 - X.P(1, 0.8, 0, 0.5))));
  });
  // photocopier
  const cop = X.g();
  X.rect(560, 560, 240, 200, { parent: cop, fill: C.sand, stroke: C.ink, sw: 5, r: 12, shadow: true });
  E('rect', { x: 548, y: 540, width: 264, height: 26, rx: 8, fill: C.ink2, stroke: C.ink, 'stroke-width': 4 }, cop);
  E('rect', { x: 800, y: 700, width: 70, height: 14, rx: 4, fill: C.ink2 }, cop);
  E('rect', { x: 590, y: 600, width: 120, height: 36, rx: 6, fill: C.blueL, stroke: C.ink, 'stroke-width': 3 }, cop);
  for (let i = 0; i < 3; i++) E('circle', { cx: 740 + i * 0, cy: 605 + i * 20, r: 7, fill: [C.green, C.ochre, C.red][i] }, cop);
  X.text(680, 800, 'photocopier', { parent: cop, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(cop, 0, { f: 0.1, type: 'pop' });
  const beam = E('rect', { x: 560, y: 548, width: 14, height: 12, fill: C.ochre, opacity: 0 }, X.g());
  X.each(t => {
    const on = t > X.at(0, 0.4) && t < X.at(0, 0.9);
    beam.setAttribute('opacity', on ? 0.9 : 0);
    if (on) beam.setAttribute('x', (566 + 220 * (0.5 + 0.5 * Math.sin((t - X.at(0, 0.4)) * 5))).toFixed(1));
  });
  // the original card goes in and comes back
  const orig = X.g(); const origI = X.icon('idcard', 0, 0, 0.75, { parent: orig });
  X.show(origI, 0, { type: 'pop' });
  X.each(t => {
    const a = X.P(0, 0.12, 0, 0.8), b = X.P(0, 0.85, 0, 0.6);
    const x = lerp(lerp(330, 680, a), 330, b), y = lerp(lerp(640, 520, a), 640, b);
    orig.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  });
  const lab0 = X.text(330, 590, 'your ID card', { size: 24, anchor: 'middle', fill: C.ink2 });
  X.show(lab0, 0, { f: 0.9, type: 'fade', out: 1, outLen: 0.3 });
  // three places
  const places = [[1040, 'Shop', 'Where is it kept?', 'file'], [1360, 'Hotel', 'Who looks at it?', 'magnifier'], [1680, 'SIM card seller', 'When is it thrown away?', 'trash']];
  const strings = [];
  places.forEach(([x, name, q, ic], j) => {
    const g = X.g();
    X.icon('building', x, 620, 0.95, { parent: g, fill: [C.ochreL, C.plumL, C.tealL][j] });
    X.text(x, 730, name, { parent: g, size: 30, anchor: 'middle', serif: true, w: 600 });
    X.show(g, 1, { f: j * 0.1, type: 'up' });
    const cp = X.g(); copyShape(cp, 0.55);
    const cpw = X.wrap(cp);
    X.show(cpw, 0, { f: 0.62 + j * 0.08, type: 'fade', len: 0.3 });
    const sp = spline([[870 - j * 6, 690 - j * 10], [lerp(870, x, 0.5), 470 - j * 30], [x, 668]]);
    X.travel(cp, sp, 1, { f0: 0.1 + j * 0.12, f1: 0.42 + j * 0.12 });
    const str = E('line', { stroke: C.ink3, 'stroke-width': 3, 'stroke-dasharray': '8 8' }, X.g());
    strings.push([str, sp, j]);
    const cut = X.mark(lerp(300, x, 0.86), 640, false, { s: 22 });
    X.show(cut, 1, { f: 0.75 + j * 0.05, type: 'pop', out: 2, outLen: 0.4 });
    const qc = X.chip(x, 450, q, { size: 23, fill: C.card });
    X.show(qc, 2, { f: 0.12 + j * 0.22, type: 'down' });
    const qm = X.text(x - 82, 590, '?', { size: 64, serif: true, fill: C.ochre, anchor: 'middle', w: 700 });
    X.show(qm, 2, { f: 0.12 + j * 0.22, type: 'pop' });
    X.bob(qm, { amp: 8, per: 1.8, ph: j });
    const ii = X.icon(ic, x + 84, 560, 0.4, { color: C.ink2 });
    X.show(ii, 2, { f: 0.2 + j * 0.22, type: 'pop' });
    X.bob(ii.mid, { amp: 5, per: 2.2, ph: j + 1 });
  });
  X.each(t => {
    for (const [str, sp, j] of strings) {
      const p = ease(X.L(1, 0.1 + j * 0.12, 0.42 + j * 0.12));
      const [x, y] = sp.at(p);
      const op = t < X.at(1, 0.1 + j * 0.12) ? 0 : 1 - X.P(1, 0.72 + j * 0.05, 0, 0.6);
      str.setAttribute('x1', 300); str.setAttribute('y1', 700); str.setAttribute('x2', x.toFixed(1)); str.setAttribute('y2', y.toFixed(1));
      str.setAttribute('opacity', op.toFixed(2));
    }
  });
  const lost = X.chip(560, 380, 'you lose control', { size: 26, color: C.red, fill: C.redL, stroke: C.red });
  X.show(lost, 1, { f: 0.78, type: 'pop', out: 2, outLen: 0.4 });

  // ---------------- B: the same at bank scale ----------------
  const ban = X.text(BX + 960, 215, 'The same thing, on a huge scale', { size: 50, anchor: 'middle', serif: true, w: 600 });
  X.show(ban, 3, { type: 'down', out: 4, outLen: 0.4 });
  const bank = X.g();
  X.icon('bank', BX + 760, 500, 1.45, { parent: bank });
  X.text(BX + 760, 620, 'Bank', { parent: bank, size: 34, anchor: 'middle', serif: true, w: 600 });
  X.show(bank, 3, { f: 0.05, type: 'pop' });
  // crowd of customers
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    const i = r * 7 + c;
    const p = X.icon('person', BX + 90 + c * 52, 330 + r * 62, 0.3, { fill: [C.blueL, C.ochreL, C.tealL, C.plumL][(r + c) % 4] });
    X.show(p, 4, { f: 0.02 + (i / 42) * 0.4, type: 'pop', len: 0.4 });
  }
  const cl = X.text(BX + 250, 750, 'millions of customers', { size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(cl, 4, { f: 0.3, type: 'up' });
  [360, 500, 640].forEach((y, i) => X.stream(spline([[BX + 440, y], [BX + 560, lerp(y, 500, 0.5)], [BX + 670, 500]]), { n: 6, speed: 0.6 + i * 0.07, r: 7, color: [C.blue, C.ochre, C.teal][i], k0: 4, f0: 0.45 }));
  const rl = X.text(BX + 760, 700, 'millions of requests\nevery single day', { size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(rl, 4, { f: 0.55, type: 'up' });
  X.term(4, 'Request', 'A message asking a computer to do something,\nlike "show my balance" or "send money".', { f: 0.3, until: 5 });
  // copies pile up around the bank, then fly to four places
  const dests = [['Logs', 'log', 300], ['Reports', 'file', 460], ['Backups', 'db', 620], ['Other companies', 'building', 780]];
  const piles = dests.map(([name, ic, y], d) => {
    const g = X.g();
    X.icon(ic, BX + 1290, y, 0.55, { parent: g });
    X.text(BX + 1360, y + 12, name, { parent: g, size: 32, serif: true, w: 600 });
    X.show(g, 5, { f: 0.05 + d * 0.1, type: 'left' });
    const ln = X.path(`M${BX + 880},500 C${BX + 1050},500 ${BX + 1080},${y} ${BX + 1220},${y}`, { color: C.line, sw: 3 });
    X.show(ln, 5, { f: 0.05 + d * 0.1, type: 'draw' });
    const pg = X.g(); const sheets = [];
    for (let s = 0; s < 10; s++) sheets.push(E('rect', { x: BX + 1680 + (s % 2) * 4, y: y + 30 - s * 8, width: 100, height: 14, rx: 3, fill: C.paper, stroke: C.ink3, 'stroke-width': 2 }, pg));
    return { sheets, y, n: 0 };
  });
  const rr = rng(11), many = [];
  for (let i = 0; i < 40; i++) {
    const a = (-200 + rr() * 220) * Math.PI / 180, rad = 200 + rr() * 130;
    const g = X.g(); copyShape(g, 0.32);
    many.push({ g, x0: BX + 760 + rad * Math.cos(a) * 1.0, y0: 480 + rad * Math.sin(a) * 0.8, d: i % 4, f0: 0.12 + (i / 40) * 0.6 });
    g.style.opacity = 0;
  }
  X.each(t => {
    piles.forEach(p => { p.n = 0; });
    for (const m of many) {
      const app = clamp((t - X.at(3, 0.1 + (m.f0 - 0.12) * 1.2)) / 0.3);
      const pf = piles[m.d];
      const tt = clamp((t - X.at(5, m.f0)) / 0.9), e = ease(tt);
      const x = lerp(m.x0, BX + 1730, e), y = lerp(m.y0, pf.y + 20, e) - Math.sin(e * Math.PI) * 60;
      const s = app < 1 ? 0.4 + 0.6 * easeBack(app) : 1;
      m.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
      m.g.style.opacity = tt >= 1 ? 0 : app;
      if (tt >= 1) pf.n++;
    }
    piles.forEach(p => p.sheets.forEach((r, s) => r.setAttribute('opacity', s < p.n ? 1 : 0)));
  });
  const many2 = X.text(BX + 760, 860, 'every request can leave copies', { size: 28, anchor: 'middle', fill: C.red });
  X.show(many2, 3, { f: 0.5, type: 'up', out: 4, outLen: 0.4 });

  // ---------------- C: backups ----------------
  X.term(6, 'Backup', 'A spare copy of data, kept in case something\nbreaks. Banks often keep backups for years.', { until: 7 });
  const bt = X.text(BX + 960, CY + 230, 'A backup is a spare copy', { size: 50, anchor: 'middle', serif: true, w: 600 });
  X.show(bt, 6, { type: 'down' });
  const srvW = X.g(); const srv = X.icon('server', BX + 380, CY + 560, 1.4, { parent: srvW });
  X.show(srvW, 6, { type: 'pop' });
  X.shake(srv.mid, 6, { f: 0.18, len: 0.9, amp: 12 });
  X.text(BX + 380, CY + 700, 'main computer', { parent: srvW, size: 26, anchor: 'middle', fill: C.ink2 });
  const crack = X.path(`M${BX + 330},${CY + 470} L${BX + 370},${CY + 520} L${BX + 345},${CY + 560} L${BX + 395},${CY + 610} L${BX + 375},${CY + 650}`, { color: C.red, sw: 6 });
  X.show(crack, 6, { f: 0.2, type: 'draw', len: 0.4, out: 6, outf: 0.55 });
  const brk = X.chip(BX + 380, CY + 380, 'it breaks!', { size: 26, color: C.red, fill: C.redL, stroke: C.red });
  X.show(brk, 6, { f: 0.2, type: 'pop', out: 6, outf: 0.5 });
  const fixd = X.chip(BX + 380, CY + 380, 'restored from backup', { size: 24, color: C.green, fill: C.greenL, stroke: C.green });
  X.show(fixd, 6, { f: 0.55, type: 'pop' });
  // shelves of yearly backups
  const sh = X.g();
  for (const y of [CY + 500, CY + 690]) E('rect', { x: BX + 820, y, width: 900, height: 14, rx: 4, fill: C.ink2 }, sh);
  X.show(sh, 6, { f: 0.05, type: 'fade' });
  for (let i = 0; i < 10; i++) {
    const x = BX + 850 + (i % 5) * 172, y = (i < 5 ? CY + 500 : CY + 690) - 96;
    const b = X.g();
    X.rect(x, y, 140, 92, { parent: b, fill: C.blueL, stroke: C.ink, sw: 3, r: 8 });
    X.text(x + 70, y + 40, 'Year ' + (i + 1), { parent: b, size: 24, anchor: 'middle', w: 600 });
    copyShape(E('g', { transform: `translate(${x + 70} ${y + 68})` }, b), 0.28);
    X.show(b, 6, { f: 0.35 + i * 0.055, type: 'pop', len: 0.4 });
  }
  const rs = X.g(); copyShape(rs, 0.4);
  X.show(X.wrap(rs), 6, { f: 0.4, type: 'fade', len: 0.2, out: 6, outf: 0.56, outLen: 0.2 });
  X.travel(rs, spline([[BX + 920, CY + 350], [BX + 650, CY + 330], [BX + 420, CY + 520]]), 6, { f0: 0.4, f1: 0.56 });
  const yl = X.text(BX + 1270, CY + 800, 'kept for years', { size: 32, anchor: 'middle', fill: C.blue, italic: true });
  X.show(yl, 6, { f: 0.7, type: 'up' });

  // ---------------- D: logs ----------------
  X.term(7, 'Log', 'A diary a program writes about what it does,\nline by line, so problems can be found later.', { until: 7, outf: 0.45 });
  X.term(7, 'Bug', 'A mistake in a program that makes it\ndo the wrong thing.', { f: 0.47, until: 8 });
  const dev = X.person(DX + 200, CY + 790, { shirt: C.green, skin: C.skin[0], name: 'programmer', s: 0.95 });
  X.show(dev, 7, { type: 'up' });
  X.talk(dev, [7]);
  X.each(() => { if (X.t > X.at(7)) X.arms(dev, 8 + 30 * X.P(7, 0.1), lerp(-8, 50, X.P(7, 0.1)) + 6 * Math.sin(X.t * 9) * (X.t < X.at(7, 0.5) ? 1 : 0)); });
  const lap = X.icon('laptop', DX + 300, CY + 640, 0.7);
  X.show(lap, 7, { type: 'pop' });
  const win = X.g();
  X.rect(DX + 470, CY + 290, 860, 420, { parent: win, fill: C.card, stroke: C.ink, sw: 4, r: 14, shadow: true });
  E('rect', { x: DX + 470, y: CY + 290, width: 860, height: 50, rx: 14, fill: C.sand }, win);
  for (let i = 0; i < 3; i++) E('circle', { cx: DX + 500 + i * 26, cy: CY + 315, r: 8, fill: [C.red, C.ochre, C.green][i] }, win);
  X.text(DX + 900, CY + 324, 'app.log', { parent: win, size: 24, anchor: 'middle', mono: true, fill: C.ink2 });
  X.show(win, 7, { f: 0.05, type: 'pop' });
  const lines = [
    '10:42:01 INFO  loan form opened',
    '10:42:03 DEBUG body={name: Ravi Kumar,',
    '   aadhaar: 2345 6789 0124,',
    '   pan: ABCPK1234L, mobile: 98765 43210}',
    '10:42:04 INFO  loan form saved',
    '10:42:05 WARN  slow reply from vendor'
  ];
  const CW = 22 * 0.602, LX = DX + 500;
  // red highlights behind private values: [line, startChar, length]
  const hi = [[1, 'Ravi Kumar'], [2, '2345 6789 0124'], [3, 'ABCPK1234L'], [3, '98765 43210']].map(([l, w]) => [l, lines[l].indexOf(w), w.length]);
  hi.forEach(([l, c, n], i) => {
    const r = X.rect(LX + c * CW - 4, CY + 370 + l * 52 - 26, n * CW + 8, 36, { fill: C.redL, stroke: C.red, sw: 2, r: 6 });
    X.show(r, 7, { f: 0.62 + i * 0.06, type: 'grow', len: 0.4 });
  });
  lines.forEach((s, i) => {
    const tg = X.text(LX, CY + 370 + i * 52, '', { size: 22, mono: true, fill: C.ink, w: 500 }); tg.t.style.whiteSpace = 'pre';
    X.type(tg, s, 7, { f0: 0.05 + i * 0.08, f1: 0.12 + i * 0.08 });
  });
  // a bug crawls through the log; a magnifier finds it
  const bug = X.g(); const bugI = E('g', null, bug);
  E('ellipse', { cx: 0, cy: 0, rx: 18, ry: 13, fill: C.red, stroke: C.ink, 'stroke-width': 3 }, bugI);
  E('circle', { cx: 18, cy: 0, r: 7, fill: C.ink }, bugI);
  E('path', { d: 'M-8,-12 L-12,-22 M4,-12 L6,-22 M-8,12 L-12,22 M4,12 L6,22', stroke: C.ink, 'stroke-width': 3, fill: 'none' }, bugI);
  X.show(X.wrap(bug), 7, { f: 0.1, type: 'fade', out: 7, outf: 0.55 });
  X.travel(bug, spline([[DX + 1300, CY + 660], [DX + 1100, CY + 600], [DX + 1000, CY + 650]]), 7, { f0: 0.1, f1: 0.4, rotate: true });
  const mag = X.icon('magnifier', DX + 1010, CY + 650, 0.6);
  X.show(mag, 7, { f: 0.35, type: 'pop', out: 7, outf: 0.55 });
  const wl = X.chip(DX + 900, CY + 770, 'whole messages, private details and all', { size: 26, color: C.red, fill: C.redL, stroke: C.red });
  X.show(wl, 7, { f: 0.75, type: 'up' });
  // logs are sent on
  X.term(8, 'Monitoring tool', 'A program that watches other programs all day\nand raises an alarm when something goes wrong.', { f: 0.3, until: 9 });
  const outs = [['Other teams', 'person', CY + 330], ['Monitoring tool', 'laptop', CY + 520], ['Outside company', 'building', CY + 710]];
  outs.forEach(([name, ic, y], i) => {
    const g = X.g();
    X.icon(ic, DX + 1500, y, 0.55, { parent: g, fill: [C.ochreL, C.blueL, C.plumL][i] });
    X.text(DX + 1560, y + 10, name, { parent: g, size: 28, serif: true, w: 600 });
    X.show(g, 8, { f: 0.08 + i * 0.22, type: 'left' });
    const sp = spline([[DX + 1335, CY + 500], [DX + 1390, lerp(CY + 500, y, 0.6)], [DX + 1440, y]]);
    const ln = X.path(sp.d, { color: C.line, sw: 3 }); X.show(ln, 8, { f: 0.08 + i * 0.22, type: 'draw' });
    X.stream(sp, { n: 2, speed: 0.45, k0: 8, f0: 0.15 + i * 0.22, make: (pg, j) => { const q = E('g', null, pg); E('rect', { x: -14, y: -18, width: 28, height: 36, rx: 3, fill: C.card, stroke: C.ink2, 'stroke-width': 3 }, q); E('rect', { x: -8, y: -6, width: 16, height: 6, fill: C.red }, q); return q; } });
    const ul = X.icon('unlock', DX + 1440, y - 46, 0.3);
    X.show(ul, 9, { f: 0.25 + i * 0.1, type: 'pop' });
  });
  const wu = X.icon('unlock', DX + 1300, CY + 300, 0.42);
  X.show(wu, 9, { f: 0.15, type: 'pop' });
  X.pulse(wu.mid, DX + 1300, CY + 300, 9, { f: 0.3, amt: 0.3 });
  const vault = X.g();
  X.icon('db', DX + 140, CY + 320, 0.5, { parent: vault });
  X.icon('lock', DX + 205, CY + 350, 0.32, { parent: vault, fill: C.greenL });
  X.text(DX + 160, CY + 410, 'main database:\nwell locked', { parent: vault, size: 24, anchor: 'middle', fill: C.green, w: 600 });
  X.show(vault, 9, { f: 0.1, type: 'pop' });
  const msg = X.g();
  X.rect(DX + 470, CY + 140, 980, 76, { parent: msg, fill: C.ochreL, stroke: C.ochre, r: 38 });
  X.text(DX + 960, CY + 190, 'Most private details  →  least protected places', { parent: msg, size: 34, anchor: 'middle', serif: true, w: 600 });
  X.show(msg, 9, { f: 0.05, type: 'down' });

  X.recap(10, ['One customer action makes many copies', 'Copies end up in logs, backups, vendors, chatbots', 'Logs are usually the least protected']);
});
