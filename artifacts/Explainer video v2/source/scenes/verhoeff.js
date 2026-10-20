// Verhoeff: typing mistakes, nets that catch them, and a pentagon whose turns and flips depend on order.
scene('verhoeff', X => {
  X.cam([{ x: 960, y: 500, s: 1.08 }, { k: 1, x: 780, y: 470, s: 1.08 }, { k: 2, x: 820, y: 470, s: 1.06 },
    { k: 3, x: 960, y: 640, s: 1.08 }, { k: 5, x: 960, y: 470, s: 1.15 }, { k: 6, f: 0.62, x: 960, y: 560, s: 1.0, len: 1.6 },
    { k: 7, x: 960, y: 480, s: 1.0 }, { k: 8, x: 960, y: 470, s: 1.08 }, { k: 9, x: 960, y: 520, s: 1.0 },
    { k: 10, x: 960, y: 520, s: 1.06 }, { k: 11, x: 960, y: 440, s: 1.1 }]);

  // a pentagon drawn around (0,0): marked corner (ochre) + an off-centre plum dot so flips are visible
  const pent = (r, o = {}) => {
    const outer = X.g(o.parent);
    const inner = E('g', null, outer);
    const pts = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    if (o.ghost) E('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: C.ink3, 'stroke-width': 3, 'stroke-dasharray': '8 8' }, outer);
    const poly = E('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: o.fill || C.tealL, stroke: C.teal, 'stroke-width': Math.max(3, r * 0.04), 'stroke-linejoin': 'round' }, inner);
    E('circle', { cx: pts[0][0], cy: pts[0][1], r: r * 0.13, fill: C.ochre, stroke: C.ink, 'stroke-width': Math.max(2, r * 0.02) }, inner);
    E('circle', { cx: pts[1][0] * 0.5, cy: pts[1][1] * 0.5, r: r * 0.08, fill: C.plum }, inner);
    outer.inner = inner; outer.poly = poly;
    return outer;
  };

  // ---------- cue 0: Aadhaar card and the mathematician ----------
  const intro = X.g();
  X.rect(250, 320, 560, 320, { parent: intro, fill: C.card, stroke: C.ink, r: 20, sw: 4, shadow: true });
  E('rect', { x: 250, y: 320, width: 560, height: 60, rx: 18, fill: C.ochreL }, intro);
  X.text(280, 362, 'Aadhaar', { parent: intro, size: 30, serif: true, w: 600 });
  X.icon('person', 340, 470, 0.8, { parent: intro });
  X.text(420, 470, 'Ravi Kumar', { parent: intro, size: 28, w: 600 });
  X.text(290, 590, '2345 6789 0124', { parent: intro, size: 44, mono: true, w: 600 });
  const board = X.g(intro);
  X.rect(1000, 290, 560, 360, { parent: board, fill: C.card, stroke: C.ink2, r: 10, sw: 5 });
  X.text(1280, 350, 'Verhoeff · 1969', { parent: board, size: 36, anchor: 'middle', serif: true, w: 600 });
  const doodle = X.path('M1280,400 L1356,455 L1327,545 L1233,545 L1204,455 Z', { color: C.teal, sw: 5 });
  board.appendChild(doodle);
  X.show(doodle, 0, { f: 0.4, type: 'draw', len: 1.6 });
  const math = X.person(1680, 860, { shirt: C.green, skin: C.skin[3], glasses: true, name: 'Dutch mathematician', s: 0.85, parent: intro });
  X.point(math, 0, 130, { f: 0.3 });
  X.show(intro, 0, { type: 'up', out: 1, outLen: 0.5 });
  X.term(0, 'Verhoeff', 'The check-digit recipe Aadhaar uses, named\nafter the Dutch mathematician who made it.', { until: 1 });

  // ---------- cue 1-2: the clerk and two typing mistakes ----------
  const clerk = X.person(190, 820, { shirt: C.plum, skin: C.skin[2], long: true, s: 1.0, name: 'clerk' });
  X.show(clerk, 1, { type: 'right', out: 3, outLen: 0.5 });
  const lap = X.icon('laptop', 360, 640, 1.1);
  X.show(lap, 1, { f: 0.1, type: 'pop', out: 3, outLen: 0.5 });
  X.each(t => { const typing = t > X.at(1) && t < X.at(3); X.arms(clerk, typing ? 40 + 8 * Math.sin(t * 18) : 8, typing ? 40 + 8 * Math.cos(t * 18) : -8); });
  const title = X.text(860, 200, 'Common typing mistakes', { size: 36, serif: true, w: 600, anchor: 'middle' });
  X.show(title, 1, { f: 0.3, type: 'down', out: 5 });
  const good = '234567890124';
  const lA = X.text(520, 282, '1  one wrong digit', { size: 28, w: 600, fill: C.red });
  const rA = X.digits(520, 300, good, { anchor: 'start', groups: [4, 4, 4], cw: 54, ch: 70, size: 36, gap: 6, groupGap: 20 });
  const lB = X.text(520, 442, '2  two neighbours swapped', { size: 28, w: 600, fill: C.red });
  const rB = X.digits(520, 460, good, { anchor: 'start', groups: [4, 4, 4], cw: 54, ch: 70, size: 36, gap: 6, groupGap: 20 });
  X.show(lA, 2, { f: 0.02, type: 'up', out: 5 }); X.show(lB, 2, { f: 0.32, type: 'up', out: 5 });
  for (const [r, f0] of [[rA, 0.08], [rB, 0.5]]) {
    X.show(X.wrap(r), 1, { type: 'fade', len: 0.2, out: 5 });
    r.cells.forEach((c, i) => X.show(X.wrap(c.g), 1, { f: f0 + i * 0.035, type: 'pop', len: 0.3 }));
  }
  const sw = X.text(1340, 515, '45  →  54', { size: 36, mono: true, w: 700, fill: C.red });
  X.show(sw, 2, { f: 0.62, type: 'left', out: 5 });
  X.each(t => {
    const typo = t > X.at(2, 0.2);
    rA.set(typo ? '234561890124' : good);
    rA.paint(5, typo ? C.redL : C.card, typo ? C.red : C.line, typo ? C.red : C.ink);
    const p = ease(X.L(2, 0.66, 0.86)), d = rB.cells[3].x - rB.cells[2].x;
    rB.cells[2].g.setAttribute('transform', `translate(${(d * p).toFixed(1)} ${(-50 * Math.sin(Math.PI * p)).toFixed(1)})`);
    rB.cells[3].g.setAttribute('transform', `translate(${(-d * p).toFixed(1)} ${(50 * Math.sin(Math.PI * p)).toFixed(1)})`);
    const done = p > 0.98;
    rB.paint(2, done ? C.redL : C.card, done ? C.red : C.line, done ? C.red : C.ink);
    rB.paint(3, done ? C.redL : C.card, done ? C.red : C.line, done ? C.red : C.ink);
  });
  X.each(t => clerk.mood(t > X.at(2, 0.2) && t < X.at(3) ? 'shock' : 'neutral'));

  // ---------- cue 3-4: two nets ----------
  const lane = (y, name, k, col, results) => {
    const g = X.g();
    X.chip(230, y, name, { size: 30, color: col, fill: C.card, shadow: true, parent: g });
    E('line', { x1: 360, y1: y, x2: 1640, y2: y, stroke: C.line, 'stroke-width': 3, 'stroke-dasharray': '4 12' }, g);
    // the net (with a hole for Luhn)
    const net = E('g', null, g);
    const hole = results[1] === false;
    const segs = hole ? [[y - 80, y + 4], [y + 56, y + 80]] : [[y - 80, y + 80]];
    for (const [a, b] of segs) {
      E('rect', { x: 1330, y: a, width: 40, height: b - a, rx: 6, fill: C.card, stroke: col, 'stroke-width': 4 }, net);
      for (let yy = a + 12; yy < b; yy += 14) E('line', { x1: 1330, y1: yy, x2: 1370, y2: yy, stroke: col, 'stroke-width': 2 }, net);
    }
    X.show(g, k, { type: 'up', out: 5, outLen: 0.4 });
    // two balls: wrong digit (top) and swap (bottom)
    [['wrong digit', y - 36, 0.08, results[0]], [k === 3 ? 'swap 09 → 90' : 'any swap', y + 30, 0.45, results[1]]].forEach(([lab, by, f0, caught]) => {
      const b = X.g();
      const bw = lab.length * 15 + 40;
      E('rect', { x: -bw / 2, y: -22, width: bw, height: 44, rx: 22, fill: C.redL, stroke: C.red, 'stroke-width': 3 }, b);
      E('text', { x: 0, y: 8, 'font-size': 24, 'font-weight': 600, fill: C.red, 'text-anchor': 'middle', 'font-family': F.sans }, b).textContent = lab;
      const stopX = 1330 - bw / 2 - 6, endX = caught ? stopX : 1560;
      X.each(t => {
        const p = X.L(k, f0, f0 + 0.32);
        const on = t >= X.at(k, f0) && t < X.at(5, 0, 0.4);
        b.style.display = on ? '' : 'none';
        let x = lerp(440, endX, ease(p));
        if (caught && p >= 1) x = stopX - 14 * Math.exp(-(t - X.at(k, f0 + 0.32)) * 5) * Math.abs(Math.sin((t - X.at(k, f0 + 0.32)) * 14));
        b.setAttribute('transform', `translate(${x.toFixed(1)} ${by})`);
      });
      const m = X.mark(caught ? 1420 : 1700, by, caught, { s: 22 });
      X.show(m, k, { f: f0 + 0.34, type: 'pop', out: 5 });
      const ml = X.text(caught ? 1452 : 1732, by + 9, caught ? 'caught' : 'missed', { size: 24, w: 700, fill: caught ? C.green : C.red, anchor: 'start' });
      X.show(ml, k, { f: f0 + 0.36, type: 'fade', out: 5 });
    });
    return g;
  };
  const luhnLane = lane(620, 'Luhn', 3, C.blue, [true, false]);
  const verLane = lane(810, 'Verhoeff', 4, C.teal, [true, true]);

  // ---------- cue 5-6: the pentagon and its ten moves ----------
  const big = pent(170);
  const bigW = X.wrap(big);
  X.show(bigW, 5, { f: 0.25, type: 'pop', out: 7, outLen: 0.4 });
  X.term(5, 'Pentagon', 'A flat shape with five equal sides\nand five corners.', { until: 6 });
  const moveLab = X.text(960, 690, '', { size: 34, anchor: 'middle', w: 600, fill: C.teal });
  X.show(moveLab, 6, { out: 7 });
  X.each(t => {
    let rot = 0, sx = 1, lab = '';
    if (t >= X.at(6)) {
      const u = X.L(6, 0.04, 0.36) * 5, st = Math.floor(u), fr = ease(clamp((u - st) * 1.4));
      rot = 72 * (Math.min(st, 5) + (st < 5 ? fr : 0));
      if (st < 5 && t < X.at(6, 0.36)) lab = `turn ${st + 1} of 5`;
      const v = X.L(6, 0.4, 0.62);
      if (v > 0) { sx = Math.cos(Math.PI * ease(v)); lab = 'flip it over'; }
      if (t > X.at(6, 0.64)) lab = '';
    }
    big.inner.setAttribute('transform', `translate(960 450) scale(${sx.toFixed(3)} 1) rotate(${rot.toFixed(1)})`);
    moveLab.set(lab);
  });
  const tiles = X.g();
  for (let j = 0; j < 10; j++) {
    const x = 300 + j * 146, tg = X.g(tiles);
    const p = pent(42, { parent: tg, fill: j < 5 ? C.tealL : C.plumL });
    p.inner.setAttribute('transform', `translate(${x} 800) ` + (j < 5 ? `rotate(${72 * j})` : `scale(-1 1) rotate(${72 * (j - 5)})`));
    X.text(x, 884, String(j), { parent: tg, size: 32, anchor: 'middle', w: 700, mono: true });
    X.show(tg, 6, { f: 0.66 + j * 0.028, type: 'pop', out: 7, outLen: 0.4 });
  }
  const br1 = X.text(300 + 2 * 146, 730, '5 turns', { size: 28, anchor: 'middle', w: 700, fill: C.teal });
  const br2 = X.text(300 + 7 * 146, 730, '5 flips', { size: 28, anchor: 'middle', w: 700, fill: C.plum });
  X.show(br1, 6, { f: 0.68, type: 'down', out: 7 }); X.show(br2, 6, { f: 0.82, type: 'down', out: 7 });
  const ten = X.chip(960, 640, '10 moves = 10 digits, 0 to 9', { size: 28, color: C.ink, fill: C.ochreL });
  X.show(ten, 6, { f: 0.88, type: 'pop', out: 7 });

  // ---------- cue 7-9: turn-then-flip vs flip-then-turn ----------
  const L = { cx: 560, cy: 470 }, Rr = { cx: 1360, cy: 470 };
  const pl = pent(140, { ghost: true }), pr = pent(140, { ghost: true });
  pl.setAttribute('transform', `translate(${L.cx} ${L.cy})`); pr.setAttribute('transform', `translate(${Rr.cx} ${Rr.cy})`);
  const plW = X.wrap(pl), prW = X.wrap(pr);
  X.show(plW, 7, { f: 0.3, type: 'pop', out: 10, outLen: 0.4 }); X.show(prW, 7, { f: 0.4, type: 'pop', out: 10, outLen: 0.4 });
  const hl = X.text(L.cx, 250, 'turn, then flip', { size: 36, anchor: 'middle', serif: true, w: 600 });
  const hr = X.text(Rr.cx, 250, 'flip, then turn', { size: 36, anchor: 'middle', serif: true, w: 600 });
  X.show(hl, 7, { f: 0.6, type: 'down', out: 10 }); X.show(hr, 7, { f: 0.75, type: 'down', out: 10 });
  const steps = [];
  [[L.cx, ['1 turn', '2 flip']], [Rr.cx, ['1 flip', '2 turn']]].forEach(([cx, labs], side) => {
    labs.forEach((s, j) => {
      const c = X.chip(cx - 90 + j * 180, 680, s, { size: 26, color: C.ink2, fill: C.card });
      X.show(c, 7, { f: 0.65 + side * 0.1, type: 'up', out: 10 });
      steps.push({ c, side, j });
    });
  });
  const neq = X.text(960, 500, '≠', { size: 130, anchor: 'middle', w: 700, fill: C.red });
  X.show(neq, 8, { f: 0.8, type: 'pop', out: 10 });
  const ringL = X.circle(L.cx + 140 * Math.cos(Math.PI * 1.1), L.cy + 140 * Math.sin(Math.PI * 1.1), 34, { stroke: C.red, sw: 5 });
  const ringR = X.circle(Rr.cx - 140 * Math.cos(Math.PI * 1.1), Rr.cy + 140 * Math.sin(Math.PI * 1.1), 34, { stroke: C.red, sw: 5 });
  X.show(ringL, 8, { f: 0.76, type: 'pop', out: 10 }); X.show(ringR, 8, { f: 0.76, type: 'pop', out: 10 });
  const diff = X.text(960, 790, 'same two moves, different end position', { size: 32, anchor: 'middle', w: 600, fill: C.red });
  X.show(diff, 8, { f: 0.85, type: 'up', out: 9 });
  X.each(t => {
    const a = ease(X.L(8, 0.1, 0.36)), b = ease(X.L(8, 0.44, 0.7));
    // left: rotate first, then flip  -> scale(sx) rotate(rot)
    pl.inner.setAttribute('transform', `scale(${(1 - 2 * b).toFixed(3)} 1) rotate(${(72 * a).toFixed(1)})`);
    // right: flip first, then rotate -> rotate(rot) scale(sx)
    pr.inner.setAttribute('transform', `rotate(${(72 * b).toFixed(1)}) scale(${(1 - 2 * a).toFixed(3)} 1)`);
    steps.forEach(s => {
      const lit = (s.j === 0 && t > X.at(8, 0.1)) || (s.j === 1 && t > X.at(8, 0.44));
      s.c.r.setAttribute('fill', lit ? C.ochreL : C.card);
      s.c.r.setAttribute('stroke', lit ? C.ochre : C.line);
    });
  });
  // cue 9: the swap is caught
  const swl = X.text(L.cx, 760, 'digits 4, then 5', { size: 28, anchor: 'middle', fill: C.ink2, w: 600 });
  const swr = X.text(Rr.cx, 760, 'digits 5, then 4', { size: 28, anchor: 'middle', fill: C.ink2, w: 600 });
  X.show(swl, 9, { f: 0.05, type: 'up', out: 10 }); X.show(swr, 9, { f: 0.12, type: 'up', out: 10 });
  const caught = X.g();
  X.rect(700, 820, 520, 76, { parent: caught, fill: C.greenL, stroke: C.green, r: 38, shadow: true });
  X.mark(752, 858, true, { s: 24, parent: caught });
  X.text(990, 870, 'the swap is caught', { parent: caught, size: 32, anchor: 'middle', w: 700, fill: C.green });
  X.show(caught, 9, { f: 0.55, type: 'up', out: 10 });

  // ---------- cue 10: the dihedral group ----------
  const ring = X.g();
  const ringIn = X.g(ring);
  for (let j = 0; j < 10; j++) {
    const a = -Math.PI / 2 + j * 2 * Math.PI / 10, x = 960 + 270 * Math.cos(a), y = 520 + 270 * Math.sin(a);
    const p = pent(44, { parent: ringIn, fill: j < 5 ? C.tealL : C.plumL });
    p.inner.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) ` + (j < 5 ? `rotate(${72 * j})` : `scale(-1 1) rotate(${72 * (j - 5)})`));
  }
  X.spin(ringIn, 960, 520, { speed: 12 });
  X.text(960, 512, 'dihedral', { parent: ring, size: 44, anchor: 'middle', serif: true, w: 600 });
  X.text(960, 562, 'group', { parent: ring, size: 44, anchor: 'middle', serif: true, w: 600 });
  X.show(ring, 10, { type: 'pop', out: 11, outLen: 0.4 });
  const note = X.g();
  X.rect(1380, 700, 320, 120, { parent: note, fill: C.ochreL, stroke: C.ochre, r: 6, shadow: true });
  X.text(1540, 752, 'no need to', { parent: note, size: 28, anchor: 'middle', w: 600 });
  X.text(1540, 792, 'remember the name', { parent: note, size: 28, anchor: 'middle', w: 600 });
  X.show(note, 10, { f: 0.6, type: 'pop', out: 11, outLen: 0.4 });
  X.term(10, 'Dihedral group', 'The family of all the ways to turn or flip\na shape so it lands back on its own outline.', { until: 11 });

  // ---------- cue 11: every real Aadhaar passes ----------
  const fin = X.g();
  const rowF = X.digits(960, 360, good, { parent: fin, groups: [4, 4, 4], cw: 88, ch: 110, size: 56, gap: 10, groupGap: 30 });
  X.show(fin, 11, { type: 'up' });
  const roller = pent(34, { fill: C.tealL });
  const passG = X.g();
  X.mark(760, 600, true, { s: 46, parent: passG });
  X.text(830, 618, 'passes the Verhoeff check', { parent: passG, size: 40, w: 700, fill: C.green });
  X.show(passG, 11, { f: 0.78, type: 'pop' });
  X.each(t => {
    const on = t >= X.at(11);
    roller.style.display = on ? '' : 'none';
    const p = X.L(11, 0.12, 0.74);
    const x0 = rowF.cells[0].cx, x1 = rowF.cells[11].cx;
    const x = lerp(x0, x1, p);
    roller.inner.setAttribute('transform', `translate(${x.toFixed(1)} 316) rotate(${((x - x0) * 180 / (Math.PI * 34)).toFixed(1)})`);
    rowF.cells.forEach((c, i) => {
      const done = on && x >= c.cx - 1 && p > 0;
      rowF.paint(i, done ? C.greenL : C.card, done ? C.green : C.line);
    });
  });
  X.term(11, 'Real Aadhaar', 'Every genuine Aadhaar number was made\nwith this recipe, so it always passes.', { until: 12 });

  X.recap(12, ['Verhoeff turns and flips a pentagon', 'The order of moves matters', 'So it catches every wrong digit and every swap', 'Every real Aadhaar passes it']);
});
