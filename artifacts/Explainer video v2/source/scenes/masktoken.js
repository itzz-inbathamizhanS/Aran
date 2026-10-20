// Masking (a black marker, gone forever) versus tokenisation (a cloakroom token you can swap back, with permission and a record).
scene('masktoken', X => {
  X.cam([{ x: 960, y: 480, s: 1.1 }, { k: 1, x: 960, y: 520, s: 1.0 }, { k: 2, f: 0.1, x: 960, y: 560, s: 1.05 }, { k: 3, x: 960, y: 560, s: 1.0 },
    { k: 4, x: 960, y: 480, s: 1.15, len: 1.0 }, { k: 5, x: 960, y: 560, s: 1.0 }, { k: 6, f: 0.5, x: 900, y: 560, s: 1.08 },
    { k: 7, x: 960, y: 500, s: 1.05 }, { k: 8, x: 960, y: 540, s: 1.0 }, { k: 9, x: 960, y: 560, s: 1.0 }, { k: 10, x: 1080, y: 520, s: 1.04 }]);
  const AAD = '234567890124', TOK = '249826846187';

  // ---- cue 0: two ways
  const way = (x, n, title, sub, col, colL) => {
    const g = X.g();
    X.rect(x, 300, 620, 260, { parent: g, fill: C.card, stroke: col, sw: 3, r: 22, shadow: 8 });
    E('circle', { cx: x + 70, cy: 380, r: 32, fill: colL, stroke: col, 'stroke-width': 3 }, g);
    X.text(x + 70, 391, String(n), { parent: g, size: 32, anchor: 'middle', w: 700, fill: col });
    X.text(x + 130, 395, title, { parent: g, size: 46, serif: true, w: 600 });
    X.text(x + 40, 480, sub, { parent: g, size: 28, fill: C.ink2 });
    return g;
  };
  const w1 = way(300, 1, 'Masking', 'cover the digits', C.ochre, C.ochreL);
  const w2 = way(1000, 2, 'Tokenisation', 'swap for a stand-in', C.teal, C.tealL);
  X.show(w1, 0, { f: 0.05, type: 'up', out: 1, outLen: 0.4 });
  X.show(w2, 0, { f: 0.15, type: 'up', op: 0.4, out: 1, outLen: 0.4 });
  X.pulse(w1, 610, 430, 0, { f: 0.7, amt: 0.06 });
  X.term(0, 'Masking', 'Covering part of a number so only a few\ndigits show, like XXXX XXXX 0124.', { f: 0.6, until: 2 });

  // ---- cue 1-3: the black marker
  const MK = X.g();
  X.show(MK, 1, { type: 'fade', out: 4, outLen: 0.5 });
  const row = X.digits(960, 300, AAD, { groups: [4, 4, 4], cw: 84, ch: 110, size: 62, gap: 10, groupGap: 40, parent: MK });
  const cells = row.cells;
  const bars = cells.slice(0, 8).map(c => E('rect', { x: c.x - 3, y: c.y - 3, width: 0, height: c.h + 6, rx: 8, fill: C.ink }, MK));
  const marker = X.g(MK); const mIn = X.g(marker);
  E('rect', { x: -14, y: -150, width: 28, height: 120, rx: 8, fill: C.ink, transform: 'rotate(18)' }, mIn);
  E('rect', { x: -14, y: -175, width: 28, height: 34, rx: 6, fill: C.ink3, transform: 'rotate(18)' }, mIn);
  E('path', { d: 'M-10,-32 L10,-32 L4,0 L-4,0 Z', fill: C.ink, transform: 'rotate(18)' }, mIn);
  const x0 = cells[0].x, x1 = cells[7].x + cells[7].w;
  X.each(t => {
    const p = X.L(1, 0.12, 0.6);
    const mx = lerp(x0 - 20, x1 + 10, p);
    const on = X.on(1, 4) && t > X.at(1, 0.05) && t < X.at(1, 0.75);
    marker.style.display = on ? '' : 'none';
    mIn.setAttribute('transform', `translate(${mx.toFixed(1)} ${(cells[0].y + 60 + 14 * Math.sin(p * 40)).toFixed(1)})`);
    bars.forEach((b, i) => { const c = cells[i]; b.setAttribute('width', clamp(mx - (c.x - 3), 0, c.w + 6).toFixed(1)); });
    const keep = t > X.at(1, 0.6);
    for (let i = 8; i < 12; i++) row.paint(i, keep ? C.ochreL : C.card, keep ? C.ochre : C.line);
  });
  const last4 = X.text(960, 470, 'only the last four digits still show', { parent: MK, size: 30, anchor: 'middle', fill: C.ochre, w: 700 });
  X.show(last4, 1, { f: 0.65, type: 'up' });
  // cue 2: the covered digits fall into the bin, gone forever
  const bin = X.icon('trash', 960, 760, 1.0, { parent: MK });
  X.show(X.wrap(bin), 2, { type: 'up', out: 3, outLen: 0.4 });
  cells.slice(0, 8).forEach((c, i) => {
    const d = X.g(MK);
    E('text', { x: 0, y: 18, 'font-size': 52, 'font-weight': 700, fill: C.ink3, 'text-anchor': 'middle', 'font-family': F.mono }, d).textContent = AAD[i];
    X.show(d, 2, { f: 0.1 + i * 0.04, type: 'fade', len: 0.2, out: 2, outf: 0.45 + i * 0.04, outLen: 0.2 });
    X.travel(d, spline([[c.cx, c.y + 60], [c.cx + (960 - c.cx) * 0.3, 560], [960, 730]]), 2, { f0: 0.1 + i * 0.04, f1: 0.45 + i * 0.04 });
  });
  const gone = X.chip(1320, 760, 'gone forever', { parent: MK, size: 30, color: C.red, fill: C.redL, stroke: C.red });
  X.show(gone, 2, { f: 0.55, type: 'pop', out: 3, outLen: 0.4 });
  const undo = X.g(MK);
  X.arrow(700, 790, 560, 650, { parent: undo, color: C.ink2, sw: 5, bend: 0.3 });
  X.text(560, 820, 'undo?', { parent: undo, size: 28, anchor: 'middle', fill: C.ink2, w: 600 });
  X.mark(520, 720, false, { parent: undo, s: 26 });
  X.show(undo, 2, { f: 0.7, type: 'fade', out: 3, outLen: 0.4 });
  // cue 3: the bank needs the full number to collect a loan payment
  const clerk = X.person(330, 880, { parent: MK, shirt: C.plum, skin: C.skin[2], long: true, s: 0.95 });
  X.show(clerk, 3, { type: 'right' });
  X.each(t => { if (t > X.at(3)) { clerk.mood('sad'); const a = X.P(3, 0.4, 0, 0.5); X.arms(clerk, lerp(8, 60, a), lerp(-8, 60, a)); } });
  const form = X.g(MK);
  X.rect(560, 560, 760, 300, { parent: form, fill: C.card, stroke: C.ink2, r: 16, shadow: true });
  X.text(600, 615, 'Collect loan payment', { parent: form, size: 34, serif: true, w: 600 });
  X.text(600, 680, 'Needs the full Aadhaar number:', { parent: form, size: 28, fill: C.ink2 });
  X.text(600, 750, '•••• •••• 0124', { parent: form, size: 40, mono: true, w: 600 });
  X.text(1000, 752, '? ? ?', { parent: form, size: 40, fill: C.red, w: 700 });
  X.text(600, 820, 'cannot continue', { parent: form, size: 28, fill: C.red, w: 700 });
  X.show(form, 3, { f: 0.15, type: 'up' });

  // ---- cue 4: the second way
  const t2 = way(650, 2, 'Tokenisation', 'swap for a stand-in', C.teal, C.tealL);
  X.show(t2, 4, { type: 'pop', out: 5, outLen: 0.4 });
  X.term(4, 'Tokenisation', 'Swapping a real value for a stand-in value\n(a token) that can be swapped back later.', { until: 6 });

  // ---- cue 5-6: the wedding-hall cloakroom
  const H = X.g();
  X.show(H, 5, { type: 'fade', out: 7, outLen: 0.6 });
  // garland
  const gar = X.g(H);
  let d = 'M120,170';
  for (let i = 0; i < 12; i++) d += ` Q${190 + i * 140},${250} ${260 + i * 140},170`;
  X.path(d, { parent: gar, color: C.green, sw: 5 });
  for (let i = 0; i < 12; i++) [0.25, 0.5, 0.75].forEach((u, j) => E('circle', { cx: 120 + i * 140 + 140 * u, cy: 170 + 160 * u * (1 - u), r: 11, fill: [C.ochre, C.red, C.plum][(i + j) % 3] }, gar));
  X.bob(gar, { amp: 3, per: 4 });
  X.text(300, 300, 'Wedding hall cloakroom', { parent: H, size: 32, serif: true, w: 600, fill: C.ink2 });
  // shelves
  X.rect(1300, 330, 460, 290, { parent: H, fill: C.sand, stroke: C.ink2, sw: 3, r: 8 });
  for (const y of [470, 610]) E('rect', { x: 1300, y: y - 8, width: 460, height: 10, fill: C.ink2 }, H);
  const bagShape = (g, col, num) => {
    E('path', { d: 'M-16,-30 Q-16,-48 0,-48 Q16,-48 16,-30', fill: 'none', stroke: C.ink, 'stroke-width': 5 }, g);
    E('rect', { x: -34, y: -32, width: 68, height: 56, rx: 10, fill: col, stroke: C.ink, 'stroke-width': 3 }, g);
    if (num) { E('rect', { x: -14, y: -12, width: 28, height: 20, rx: 4, fill: C.card, stroke: C.ink, 'stroke-width': 2 }, g); E('text', { x: 0, y: 4, 'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': F.sans, fill: C.ink }, g).textContent = num; }
  };
  [[1360, 436, C.teal, '12'], [1450, 436, C.ochre, '31'], [1360, 576, C.red, '08'], [1660, 576, C.green, '22'], [1660, 436, C.plum, '15']].forEach(([x, y, col, n]) => { const g = E('g', { transform: `translate(${x},${y})` }, H); bagShape(g, col, n); });
  const att = X.person(1150, 650, { parent: H, shirt: C.green, skin: C.skin[3], s: 0.9, ph: 1.5 });
  X.rect(940, 560, 420, 170, { parent: H, fill: C.ochreL, stroke: C.ink, sw: 4, r: 8 });
  X.text(1150, 660, 'Cloakroom', { parent: H, size: 32, anchor: 'middle', serif: true, w: 600 });
  const ravi = X.person(560, 880, { parent: H, shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1.0 });
  X.each(t => { X.arms(ravi, 8, t > X.at(5) ? 30 : -8); ravi.mood(t > X.at(6, 0.85) ? 'happy' : 'neutral'); X.arms(att, 8, (X.on(5, 7) && ((t > X.at(5, 0.15) && t < X.at(5, 0.75)) || (t > X.at(6, 0.45) && t < X.at(6, 0.75)))) ? 70 : -8); });
  // Ravi's bag: hand -> counter -> shelf, and back at cue 6
  const bag = X.g(H); bagShape(bag, C.blue, '');
  const hand = [632, 820], counter = [1000, 520], shelf = [1540, 436];
  const goSp = spline([hand, [800, 600], counter, [1300, 420], shelf]);
  const backSp = spline([shelf, [1300, 420], counter, [800, 600], hand]);
  X.each(t => {
    let pos;
    if (t < X.at(6, 0.5)) pos = goSp.at(ease(X.L(5, 0.15, 0.5)));
    else pos = backSp.at(ease(X.L(6, 0.5, 0.85)));
    bag.setAttribute('transform', `translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)})`);
  });
  const tagOnBag = X.g(H);
  X.each(() => { tagOnBag.style.display = X.t > X.at(5, 0.5) && X.t < X.at(6, 0.5) ? '' : 'none'; });
  E('rect', { x: shelf[0] - 14, y: shelf[1] - 12, width: 28, height: 20, rx: 4, fill: C.card, stroke: C.ink, 'stroke-width': 2 }, tagOnBag);
  E('text', { x: shelf[0], y: shelf[1] + 4, 'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': F.sans, fill: C.ink }, tagOnBag).textContent = '47';
  // the token: attendant -> Ravi, and back at cue 6
  const tokenShape = (g, n, s = 1) => {
    E('rect', { x: -40 * s, y: -26 * s, width: 80 * s, height: 52 * s, rx: 10 * s, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 4 }, g);
    E('circle', { cx: -26 * s, cy: 0, r: 5 * s, fill: C.ochre }, g);
    E('text', { x: 6 * s, y: 11 * s, 'font-size': 30 * s, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': F.mono, fill: C.ink }, g).textContent = n;
  };
  const tok = X.g(H); tokenShape(tok, '47');
  const tGo = spline([[1100, 540], [900, 560], [hand[0] + 10, hand[1] - 40]]), tBack = spline([[hand[0] + 10, hand[1] - 40], [900, 560], [1100, 540]]);
  X.each(t => {
    const vis = t > X.at(5, 0.55) && t < X.at(6, 0.6);
    tok.style.display = vis ? '' : 'none';
    const pos = t < X.at(6, 0.3) ? tGo.at(ease(X.L(5, 0.55, 0.75))) : tBack.at(ease(X.L(6, 0.3, 0.5)));
    tok.setAttribute('transform', `translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)})`);
  });
  const tokLab = X.chip(700, 560, 'token No. 47', { parent: H, size: 28, color: C.ochre, fill: C.ochreL, stroke: C.ochre });
  X.show(tokLab, 5, { f: 0.78, type: 'pop', out: 6, outf: 0.3, outLen: 0.3 });
  // cue 6: a thief with a token gets nothing
  const thief = X.person(170, 880, { parent: H, shirt: C.ink2, skin: C.skin[3], hood: C.ink, s: 0.85 });
  E('path', { d: 'M-24,-212 L24,-212 L22,-198 L4,-198 L0,-204 L-4,-198 L-22,-198 Z', fill: C.ink }, thief.body);
  X.show(thief, 6, { type: 'right', out: 7, outLen: 0.4 });
  X.each(t => X.arms(thief, 8, t > X.at(6, 0.1) ? 60 : -8));
  const thTok = X.g(H); const thIn = E('g', { transform: 'translate(262,790) scale(0.8)' }, thTok); tokenShape(thIn, '18');
  X.show(thTok, 6, { f: 0.1, type: 'pop', out: 7, outLen: 0.3 });
  const worth = X.g(H);
  X.rect(70, 420, 330, 110, { parent: worth, fill: C.card, stroke: C.ink2, r: 16, shadow: true });
  X.text(235, 465, 'just a number', { parent: worth, size: 28, anchor: 'middle', w: 600 });
  X.text(235, 505, 'worth nothing', { parent: worth, size: 28, anchor: 'middle', fill: C.red, w: 700 });
  X.show(worth, 6, { f: 0.2, type: 'pop', out: 7, outLen: 0.3 });
  const back = X.chip(800, 470, 'token in, bag back', { parent: H, size: 28, color: C.green, fill: C.greenL, stroke: C.green });
  X.show(back, 6, { f: 0.6, type: 'pop', out: 7, outLen: 0.3 });

  // ---- cue 7-8: the real thing: same shape
  const T = X.g();
  X.show(T, 7, { type: 'fade', out: 9, outLen: 0.6 });
  const vRow = X.digits(960, 250, AAD, { groups: [4, 4, 4], cw: 72, ch: 96, size: 52, gap: 8, groupGap: 34, parent: T, fill: C.redL, stroke: C.red });
  X.text(vRow.x0 - 30, 312, 'real', { parent: T, size: 28, anchor: 'end', fill: C.red, w: 700 });
  const tRow = X.digits(960, 520, AAD, { groups: [4, 4, 4], cw: 72, ch: 96, size: 52, gap: 8, groupGap: 34, parent: T });
  const tLab = X.text(tRow.x0 - 30, 582, 'token', { parent: T, size: 28, anchor: 'end', fill: C.green, w: 700 });
  X.show(tLab, 7, { f: 0.45, type: 'left' });
  const sh = X.g(T); X.icon('shield', 960, 430, 0.5, { parent: sh, check: true });
  X.text(1010, 440, 'Aran', { parent: sh, size: 28, serif: true, w: 600, fill: C.teal });
  X.show(sh, 7, { f: 0.1, type: 'pop' });
  const ar = X.arrow(900, 360, 900, 505, { parent: T, color: C.teal, sw: 5 });
  X.show(ar, 7, { f: 0.12, type: 'draw' });
  X.each(t => {
    tRow.cells.forEach((c, i) => {
      const settle = X.at(7, 0.25 + i * 0.035);
      const done = t >= settle;
      c.t.textContent = t < X.at(7, 0.12) ? AAD[i] : done ? TOK[i] : String((Math.floor(t * 16) * 7 + i * 3) % 10);
      tRow.paint(i, done ? C.greenL : C.card, done ? C.green : C.line, done ? C.green : C.ink2);
    });
  });
  const same = X.g(T);
  X.path(`M${tRow.x0},${640} Q${tRow.x0},${658} ${tRow.x0 + 18},${658} L${tRow.x0 + tRow.total - 18},${658} Q${tRow.x0 + tRow.total},${658} ${tRow.x0 + tRow.total},${640}`, { parent: same, color: C.ink3, sw: 3 });
  X.text(960, 700, '12 digits stay 12 digits: same shape', { parent: same, size: 30, anchor: 'middle', w: 600, fill: C.ink2 });
  X.show(same, 7, { f: 0.7, type: 'up', out: 8, outLen: 0.3 });
  X.term(7, 'Token', 'A stand-in value with the same shape as the real one.\nUseless on its own, like a cloakroom token.', { until: 9 });
  // cue 8: programs keep working with the token
  [['laptop', 'CRM screen', 560], ['file', 'Loan system', 1360]].forEach(([ic, lab, x], i) => {
    const g = X.g(T);
    X.rect(x - 230, 720, 460, 150, { parent: g, fill: C.card, stroke: C.ink2, r: 16, shadow: true });
    X.icon(ic, x - 165, 795, 0.5, { parent: g });
    X.text(x - 100, 775, lab, { parent: g, size: 28, w: 600 });
    X.text(x - 100, 825, '2498 2684 6187', { parent: g, size: 26, mono: true, fill: C.green, w: 600 });
    const gr = X.icon('gear', x + 180, 765, 0.32, { parent: g });
    X.spin(gr.mid, x + 180, 765, { speed: 120 });
    X.mark(x + 180, 830, true, { parent: g, s: 18 });
    X.show(g, 8, { f: 0.1 + i * 0.15, type: 'up' });
    const sp = spline([[960, 620], [lerp(960, x, 0.6), 680], [x, 720]]);
    X.stream(sp, { parent: T, n: 3, r: 7, speed: 0.6, color: C.green, k0: 8, f0: 0.2 });
  });

  // ---- cue 9-10: detokenising, with a record
  const V = X.g();
  X.show(V, 9, { type: 'fade' });
  const vault = X.g(V);
  X.rect(810, 420, 300, 230, { parent: vault, fill: C.tealL, stroke: C.teal, sw: 5, r: 18, shadow: true });
  X.icon('lock', 960, 520, 0.8, { parent: vault, fill: C.card });
  X.text(960, 625, 'Aran counter', { parent: vault, size: 28, anchor: 'middle', serif: true, w: 600, fill: C.teal });
  const asha = X.person(330, 880, { parent: V, shirt: C.plum, skin: C.skin[2], long: true, badge: true, s: 0.95 });
  X.text(330, 920, 'Asha, loans team', { parent: V, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  X.each(t => { if (t > X.at(9)) { X.arms(asha, 8, t < X.at(9, 0.5) ? 70 : -8); asha.mood(t > X.at(9, 0.6) ? 'happy' : 'neutral'); } });
  const perm = X.g(V); X.icon('key', 330, 560, 0.55, { parent: perm }); X.text(330, 520, 'has permission', { parent: perm, size: 24, anchor: 'middle', fill: C.green, w: 700 });
  X.show(perm, 9, { f: 0.1, type: 'pop' });
  const tIn = X.g(V); X.chip(0, 0, '2498 2684 6187', { parent: tIn, size: 26, mono: true, color: C.green, fill: C.greenL, stroke: C.green });
  X.show(tIn, 9, { f: 0.15, type: 'fade', len: 0.2, out: 9, outf: 0.42, outLen: 0.15 });
  X.travel(tIn, spline([[440, 700], [640, 600], [830, 530]]), 9, { f0: 0.15, f1: 0.42 });
  const vOut = X.g(V); X.chip(0, 0, '2345 6789 0124', { parent: vOut, size: 26, mono: true, color: C.red, fill: C.redL, stroke: C.red });
  X.show(vOut, 9, { f: 0.45, type: 'fade', len: 0.2 });
  X.travel(vOut, spline([[960, 680], [760, 760], [600, 720]]), 9, { f0: 0.45, f1: 0.7 });
  X.pulse(vault, 960, 535, 9, { f: 0.42, amt: 0.08 });
  const bagNote = X.g(V);
  X.rect(700, 250, 520, 70, { parent: bagNote, fill: C.ochreL, stroke: C.ochre, r: 35 });
  X.text(960, 295, 'like the counter giving the bag back', { parent: bagNote, size: 26, anchor: 'middle', w: 600 });
  X.show(bagNote, 9, { f: 0.55, type: 'down' });
  const ins = X.person(1560, 880, { parent: V, shirt: C.ochre, skin: C.skin[0], glasses: true, s: 0.85 });
  X.show(ins, 9, { f: 0.62, type: 'left', out: 10, outLen: 0.4 });
  X.each(t => { if (t > X.at(9, 0.62)) { X.arms(ins, 8, t < X.at(9, 0.85) ? 70 : -8); ins.mood(t > X.at(9, 0.8) ? 'sad' : 'neutral'); } });
  const deny = X.g(V);
  X.mark(1400, 560, false, { parent: deny, s: 30 });
  X.text(1400, 625, 'no permission', { parent: deny, size: 24, anchor: 'middle', fill: C.red, w: 700 });
  X.show(deny, 9, { f: 0.78, type: 'pop', out: 10, outLen: 0.3 });
  X.term(9, 'Detokenising', 'Swapping a token back for the real value.\nOnly systems with permission may do it.', { until: 10 });
  // cue 10: the record of who asked
  const book = X.g(V);
  X.rect(1240, 330, 620, 200, { parent: book, fill: C.card, stroke: C.ink2, r: 14, shadow: true });
  X.icon('log', 1290, 375, 0.35, { parent: book });
  X.text(1330, 385, 'Aran record', { parent: book, size: 28, serif: true, w: 600 });
  const l1 = X.text(1270, 445, '', { parent: book, size: 24, mono: true, w: 500 });
  const l2 = X.text(1270, 492, '', { parent: book, size: 24, mono: true, w: 700, fill: C.plum });
  X.type(l1, '10:42 detokenise 2498 2684 6187', 10, { f0: 0.1, f1: 0.5 });
  X.type(l2, 'asked by: Asha, loans team', 10, { f0: 0.5, f1: 0.85 });
  X.show(book, 10, { type: 'left' });

  X.recap(11, ['Masking covers digits forever', 'Tokenisation swaps a value for a look-alike', 'Swapped back only with permission and a record']);
});
