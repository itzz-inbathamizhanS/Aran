// The Luhn recipe on 7992739871: double every second digit from the right, fix numbers over nine, add up to 67, check digit 3 makes 70.
scene('luhn', X => {
  const body = '7992739871';
  const dbl = { 9: [2, 2], 7: [16, 7], 5: [6, 6], 3: [4, 4], 1: [18, 9] };   // index -> [doubled, after taking 9 away]
  const dOrder = [9, 7, 5, 3, 1];
  const dF = [0.31, 0.44, 0.575, 0.705, 0.86];                             // when each "The x becomes y" is spoken in line 3
  const finalVals = body.split('').map((c, i) => dbl[i] ? dbl[i][1] : +c); // 7 9 9 4 7 6 9 7 7 2 -> 67
  const running = []; finalVals.reduce((a, v, i) => (running[i] = a + v), 0);

  X.cam([{ x: 960, y: 520, s: 1.12 }, { k: 2, x: 960, y: 420, s: 1.05 }, { k: 3, x: 960, y: 350, s: 1.25 },
    { k: 5, x: 960, y: 500, s: 1.0 }, { k: 6, x: 1180, y: 520, s: 1.06 }, { k: 7, x: 960, y: 500, s: 1.0 }, { k: 8, x: 900, y: 520, s: 0.97 }]);

  // ---------- cue 0: a card and the recipe ----------
  const intro = X.g();
  const cardG = X.g(intro);
  X.rect(-250, -155, 500, 310, { parent: cardG, fill: C.blue, stroke: C.ink, r: 26, sw: 4, shadow: true });
  E('rect', { x: -190, y: -70, width: 74, height: 56, rx: 8, fill: C.ochre }, cardG);
  E('text', { x: -190, y: 60, 'font-size': 40, 'font-weight': 600, fill: C.card, 'font-family': F.mono }, cardG).textContent = '•••• •••• ••••';
  E('text', { x: -190, y: 116, 'font-size': 24, 'font-weight': 500, fill: C.blueL, 'font-family': F.sans }, cardG).textContent = 'RAVI KUMAR';
  X.each(t => cardG.setAttribute('transform', `translate(700 520) rotate(${(-6 + 3 * Math.sin(t * 0.9)).toFixed(2)})`));
  const recipe = X.g(intro);
  X.rect(1010, 330, 470, 360, { parent: recipe, fill: C.card, stroke: C.line, r: 16, shadow: true });
  X.text(1040, 390, 'Luhn recipe', { parent: recipe, size: 38, serif: true, w: 600 });
  ['1  double every second digit', '2  add everything up', '3  make it a round ten'].forEach((s, j) => {
    const ln = X.text(1040, 470 + j * 66, s, { parent: recipe, size: 27 });
    X.show(ln, 0, { f: 0.45 + j * 0.15, type: 'left' });
  });
  X.show(intro, 0, { type: 'up', out: 1, outLen: 0.5 });
  X.term(0, 'Luhn', 'The check-digit recipe used by payment cards,\nnamed after its inventor.', { until: 1 });

  // ---------- cue 1: patent 1960, cards around the world ----------
  const hist = X.g();
  X.rect(520, 330, 300, 380, { parent: hist, fill: C.card, stroke: C.line, r: 10, shadow: true });
  X.text(670, 390, 'Patent', { parent: hist, size: 36, serif: true, w: 600, anchor: 'middle' });
  for (let j = 0; j < 6; j++) E('line', { x1: 560, y1: 430 + j * 30, x2: 780 - (j % 2) * 50, y2: 430 + j * 30, stroke: C.line, 'stroke-width': 6, 'stroke-linecap': 'round' }, hist);
  const stamp = X.g(hist);
  E('circle', { cx: 670, cy: 640, r: 56, fill: C.redL, stroke: C.red, 'stroke-width': 5 }, stamp);
  E('text', { x: 670, y: 654, 'font-size': 40, 'font-weight': 700, fill: C.red, 'text-anchor': 'middle', 'font-family': F.sans }, stamp).textContent = '1960';
  X.show(X.wrap(stamp), 1, { f: 0.3, type: 'pop' });
  const globe = X.g(hist);
  E('circle', { cx: 1230, cy: 520, r: 140, fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, globe);
  const mer = E('g', null, globe);
  for (const rx of [50, 100]) E('ellipse', { cx: 1230, cy: 520, rx, ry: 140, fill: 'none', stroke: C.ink2, 'stroke-width': 3 }, mer);
  for (const y of [-70, 0, 70]) E('line', { x1: 1230 - Math.sqrt(140 * 140 - y * y), y1: 520 + y, x2: 1230 + Math.sqrt(140 * 140 - y * y), y2: 520 + y, stroke: C.ink2, 'stroke-width': 3 }, mer);
  const orb = [0, 1, 2, 3, 4].map(j => { const c = E('g', null, globe); E('rect', { x: -34, y: -22, width: 68, height: 44, rx: 7, fill: [C.ochre, C.teal, C.plum, C.green, C.red][j], stroke: C.ink, 'stroke-width': 3 }, c); E('rect', { x: -24, y: -8, width: 14, height: 11, rx: 2, fill: C.ochreL }, c); return c; });
  X.each(t => orb.forEach((c, j) => { const a = t * 0.8 + j * 2 * Math.PI / 5; c.setAttribute('transform', `translate(${(1230 + 200 * Math.cos(a)).toFixed(1)} ${(520 + 70 * Math.sin(a)).toFixed(1)})`); }));
  X.text(1230, 760, 'almost every payment card', { parent: hist, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(hist, 1, { type: 'up', out: 2, outLen: 0.5 });

  // ---------- the number ----------
  const row = X.digits(960, 190, body + '?', { cw: 88, ch: 108, size: 54, gap: 12 });
  const cells = row.cells;
  cells.forEach((c, i) => {
    const w = X.wrap(c.g);
    X.show(w, 2, { f: i < 10 ? (13 + i) / 23 : 0.97, type: 'pop', len: 0.4 });
  });
  const chkLab = X.text(cells[10].cx, 336, 'check digit', { size: 24, anchor: 'middle', fill: C.ochre, w: 600 });
  X.show(chkLab, 2, { f: 0.97, type: 'up', out: 3 });

  // pointer sweeping from the right, marking every second digit
  const ptr = X.g();
  E('path', { d: 'M0,-16 L-26,0 L0,16 Z', fill: C.ochre }, ptr);
  E('line', { x1: 0, y1: 0, x2: 40, y2: 0, stroke: C.ochre, 'stroke-width': 6, 'stroke-linecap': 'round' }, ptr);
  const dots = dOrder.map(i => { const d = X.circle(cells[i].cx, 316, 8, { fill: C.ochre }); return d; });
  X.each(t => {
    const p = X.L(3, 0.02, 0.26);
    const on = t >= X.at(3, 0.02) && t < X.at(3, 0.32);
    ptr.style.display = on ? '' : 'none';
    ptr.setAttribute('transform', `translate(${lerp(cells[9].cx + 60, cells[0].cx - 40, ease(p)).toFixed(1)} 330)`);
    dots.forEach((d, j) => {
      const x = lerp(cells[9].cx + 60, cells[0].cx - 40, ease(p));
      d.style.display = t >= X.at(3) && x <= cells[dOrder[j]].cx && t < X.at(5) ? '' : 'none';
    });
  });
  X.term(3, 'Every second digit', 'Counting from the right: skip one,\ndouble the next, skip one, double the next...', { until: 4 });

  // value boxes under each digit
  const vb = body.split('').map((ch, i) => {
    const c = cells[i];
    const g = X.g();
    const r = E('rect', { x: c.x, y: 350, width: c.w, height: 80, rx: 10, fill: dbl[i] ? C.ochreL : C.card, stroke: dbl[i] ? C.ochre : C.line, 'stroke-width': 2.5 }, g);
    const tx = E('text', { x: c.cx, y: 405, 'font-size': 44, 'font-weight': 700, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.mono }, g);
    const w = X.wrap(g);
    let k = 5, f = 0;
    if (dbl[i]) { k = 3; f = dF[dOrder.indexOf(i)]; } else { f = 0.01 + i * 0.012; }
    X.show(w, k, { f, type: dbl[i] ? 'pop' : 'down', len: 0.45, dist: 60 });
    return { g, r, tx, i, k, f };
  });
  // x2 badges between digit and its doubled value
  dOrder.forEach((i, j) => {
    const b = X.chip(cells[i].cx, 336, '×2', { size: 22, color: C.ochre, fill: C.card });
    X.show(b, 3, { f: dF[j] - 0.02, type: 'pop', out: 3, outf: dF[j] + 0.1, outLen: 0.3 });
  });
  // -9 badges on the two big ones
  const minus = {};
  [[7, 0.6], [1, 0.83]].forEach(([i, f]) => {
    const b = X.chip(cells[i].x + cells[i].w - 6, 350, '−9', { size: 22, color: C.red, fill: C.redL });
    X.show(b, 4, { f, type: 'pop', out: 5, outLen: 0.3 });
    minus[i] = f;
  });
  const rule = X.g();
  X.rect(720, 452, 480, 58, { parent: rule, fill: C.redL, stroke: C.red, r: 29 });
  X.text(960, 491, 'bigger than 9?  take 9 away', { parent: rule, size: 28, anchor: 'middle', w: 600, fill: C.red });
  X.show(rule, 4, { f: 0.08, type: 'up', out: 5, outLen: 0.4 });

  // ---------- the adding machine ----------
  const mach = X.g();
  E('path', { d: 'M790,500 L1130,500 L1040,560 L880,560 Z', fill: C.sand, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, mach);
  X.rect(700, 560, 520, 270, { parent: mach, fill: C.sand, stroke: C.ink, r: 22, sw: 4, shadow: true });
  X.rect(740, 590, 440, 120, { parent: mach, fill: C.card, stroke: C.ink, r: 12, sw: 3 });
  const disp = X.text(960, 672, '0', { parent: mach, size: 62, anchor: 'middle', mono: true, w: 700 });
  for (let j = 0; j < 6; j++) X.rect(746 + j * 72, 736, 60, 38, { parent: mach, fill: j === 5 ? C.ochreL : C.card, stroke: C.ink2, r: 8 });
  const g1 = X.icon('gear', 760, 800, 0.38, { parent: mach }); X.spin(g1.mid, 760, 800, { speed: 70 });
  const g2 = X.icon('gear', 1160, 800, 0.38, { parent: mach }); X.spin(g2.mid, 1160, 800, { speed: -70 });
  X.text(960, 812, 'adding machine', { parent: mach, size: 22, anchor: 'middle', fill: C.ink2 });
  X.show(X.wrap(mach), 5, { type: 'up', dist: 60 });
  const dispMark = { ok: X.mark(1240, 600, true, { s: 30 }), no: X.mark(1240, 600, false, { s: 30 }) };
  X.show(dispMark.ok, 7, { f: 0.08, type: 'pop', out: 7, outf: 0.6, outLen: 0.2 });
  X.show(dispMark.no, 7, { f: 0.68, type: 'pop', out: 8, outLen: 0.3 });
  const okAgain = X.mark(1240, 600, true, { s: 30 });
  X.show(okAgain, 8, { f: 0.1, type: 'pop' });

  // numbers dropping into the machine
  const dropF = i => 0.15 + i * 0.062;
  const flyers = finalVals.map((v, i) => {
    const g = X.g();
    E('circle', { cx: 0, cy: 0, r: 30, fill: dbl[i] ? C.ochreL : C.card, stroke: dbl[i] ? C.ochre : C.ink2, 'stroke-width': 3 }, g);
    E('text', { x: 0, y: 13, 'font-size': 36, 'font-weight': 700, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.mono }, g).textContent = v;
    const sp = X.spline([[cells[i].cx, 390], [lerp(cells[i].cx, 960, 0.6), 440], [960, 530]]);
    return { g, sp, i };
  });

  // ---------- the ruler 60..70 ----------
  const RX = u => 1330 + (u - 60) * 46;
  const rul = X.g();
  E('line', { x1: RX(60), y1: 700, x2: RX(70), y2: 700, stroke: C.ink, 'stroke-width': 4 }, rul);
  for (let u = 60; u <= 70; u++) {
    E('line', { x1: RX(u), y1: 700, x2: RX(u), y2: u % 5 === 0 ? 676 : 688, stroke: C.ink, 'stroke-width': 3 }, rul);
    if (u === 60 || u === 67 || u === 70) { const tl = E('text', { x: RX(u), y: 738, 'font-size': 26, 'font-weight': u === 60 ? 500 : 700, fill: u === 70 ? C.green : (u === 67 ? C.ochre : C.ink2), 'text-anchor': 'middle', 'font-family': F.mono }, rul); tl.textContent = u; }
  }
  X.text(RX(65), 790, 'next round ten', { parent: rul, size: 24, anchor: 'middle', fill: C.ink2 });
  X.show(rul, 6, { f: 0.05, type: 'left' });
  const marker = X.g();
  E('path', { d: `M${RX(67)},664 L${RX(67) - 13},640 L${RX(67) + 13},640 Z`, fill: C.ochre }, marker);
  X.show(X.wrap(marker), 6, { f: 0.25, type: 'down' });
  const hop = X.arrow(RX(67), 660, RX(70), 664, { color: C.green, sw: 5, bend: -0.45, head: 16 });
  X.show(hop, 6, { f: 0.62, type: 'draw', len: 0.8 });
  const plus3 = X.text(RX(68.5), 600, '+3', { size: 40, anchor: 'middle', w: 700, fill: C.green });
  X.show(plus3, 6, { f: 0.72, type: 'pop' });
  const three = X.g();
  E('text', { x: 0, y: 16, 'font-size': 46, 'font-weight': 700, fill: C.green, 'text-anchor': 'middle', 'font-family': F.mono }, three).textContent = '3';
  const threeSp = X.spline([[RX(68.5), 590], [1560, 420], [cells[10].cx, 250]]);

  X.each(t => {
    // value box texts
    vb.forEach(o => {
      const i = o.i;
      let s = body[i];
      if (dbl[i]) {
        s = String(dbl[i][0]);
        if (minus[i] != null && t >= X.at(4, minus[i] + 0.05)) s = String(dbl[i][1]);
      }
      o.tx.textContent = s;
      o.tx.setAttribute('font-size', s.length > 1 ? 40 : 44);
      const dropped = t >= X.at(5, dropF(i) + 0.03);
      o.g.style.opacity = dropped ? 0.4 : 1;
    });
    // highlight doubled digits in the row
    dOrder.forEach((i, j) => {
      const on = t >= X.at(3, dF[j] - 0.02);
      row.paint(i, on ? C.ochreL : C.card, on ? C.ochre : C.line);
    });
    // flyers into the hopper
    flyers.forEach(o => {
      const a = X.at(5, dropF(o.i)), b = a + 0.45;
      const on = t >= a && t <= b;
      o.g.style.display = on ? '' : 'none';
      if (on) { const [x, y] = o.sp.at(ease((t - a) / 0.45)); o.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${lerp(1, 0.6, (t - a) / 0.45).toFixed(2)})`); }
    });
    // the display
    let n = 0; flyers.forEach(o => { if (t >= X.at(5, dropF(o.i)) + 0.45) n = running[o.i]; });
    let txt = String(n), col = C.ink;
    if (t >= X.at(6, 0.72)) { txt = '67 + 3 = 70'; col = C.green; }
    if (t >= X.at(7)) { txt = 'total 70'; col = C.green; }
    const typo = t >= X.at(7, 0.55) && t < X.at(8, 0.05);
    if (typo) { txt = 'total 71'; col = C.red; }
    disp.set(txt); disp.t.setAttribute('fill', col);
    disp.t.setAttribute('font-size', txt.length > 6 ? 52 : 62);
    // the check digit: ? -> 3, and a typo in the fifth digit
    const done = t >= X.at(6, 0.98);
    row.set(body.slice(0, 4) + (typo ? '8' : body[4]) + body.slice(5) + (done ? '3' : '?'));
    row.paint(4, typo ? C.redL : C.card, typo ? C.red : C.line, typo ? C.red : C.ink);
    row.paint(10, done ? C.greenL : C.ochreL, done ? C.green : C.ochre, done ? C.green : C.ochre);
    if (vb[4]) vb[4].tx.textContent = typo ? '8' : '7';
    // the 3 flying up to the check cell
    const a3 = X.at(6, 0.8), b3 = X.at(6, 0.98);
    three.style.display = t >= a3 && t < b3 ? '' : 'none';
    const [x3, y3] = threeSp.at(ease(clamp((t - a3) / Math.max(0.01, b3 - a3))));
    three.setAttribute('transform', `translate(${x3.toFixed(1)} ${y3.toFixed(1)})`);
  });
  X.shake(mach, 7, { f: 0.6, amp: 8 });

  // ---------- cue 8: the finished card checks itself ----------
  const fin = X.g();
  X.rect(80, 520, 520, 300, { parent: fin, fill: C.blue, stroke: C.ink, r: 24, sw: 4, shadow: true });
  E('rect', { x: 120, y: 580, width: 70, height: 52, rx: 8, fill: C.ochre }, fin);
  E('text', { x: 120, y: 712, 'font-size': 40, 'font-weight': 600, fill: C.card, 'font-family': F.mono }, fin).textContent = '7992 7398 713';
  E('text', { x: 120, y: 770, 'font-size': 24, 'font-weight': 500, fill: C.blueL, 'font-family': F.sans }, fin).textContent = 'example card';
  X.mark(560, 560, true, { s: 32, parent: fin });
  X.show(fin, 8, { type: 'right' });

  X.recap(9, ['Double every second digit, from the right', 'Over nine? Take nine away. Then add it all up', 'The check digit makes the total a round ten']);
});
