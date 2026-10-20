// Where AI helps: a child learning "dog" from examples, a CRF labelling each word while looking at its neighbours,
// three ways of typing a name, and a character window telling an OTP from a port number.
scene('ai', X => {
  // world regions (camera pans between them)
  const R = { a: [0, 0], dogs: [2000, 0], ner: [0, 1100], lap: [2000, 1100], lang: [4000, 1100], ctx: [4000, 0], own: [6000, 0] };
  const cx = r => R[r][0] + 960, cy = r => R[r][1] + 540;
  X.cam([
    { x: 560, y: 500, s: 1.25 },
    { k: 0, f: 0.45, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 3, x: cx('dogs'), y: cy('dogs'), s: 1, len: 1.8 },
    { k: 3, f: 0.05, d: 1.9, x: 2560, y: 600, s: 1.25, len: 1.4 },
    { k: 3, f: 0.6, x: cx('dogs'), y: cy('dogs'), s: 1, len: 1.6 },
    { k: 5, x: cx('ner'), y: cy('ner'), s: 1, len: 1.8 },
    { k: 7, x: 720, y: 1520, s: 1.3, len: 1.2 },
    { k: 7, f: 0.48, x: 1200, y: 1520, s: 1.3, len: 1.2 },
    { k: 7, f: 0.86, x: 960, y: 1600, s: 1.02, len: 1.2 },
    { k: 8, x: cx('lap'), y: cy('lap'), s: 1, len: 1.8 },
    { k: 9, x: cx('lang'), y: cy('lang'), s: 1, len: 1.8 },
    { k: 10, x: cx('ctx'), y: cy('ctx'), s: 1, len: 1.8 },
    { k: 11, x: cx('own'), y: cy('own'), s: 1, len: 1.8 }
  ]);

  // ---------- region a: details with and without a check digit (cues 0-2) ----------
  const left = X.g();
  X.rect(120, 220, 800, 360, { parent: left, fill: C.card, r: 20, shadow: true });
  X.text(165, 285, 'Aadhaar number', { parent: left, size: 36, serif: true, w: 600 });
  const aad = X.digits(520, 320, '234567890124', { parent: left, groups: [4, 4, 4], cw: 50, ch: 70, size: 36, gap: 5, groupGap: 16 });
  aad.paint(11, C.ochreL, C.ochre);
  X.icon('lock', aad.cells[11].cx, 470, 0.5, { parent: left, color: C.ochre });
  X.text(aad.cells[11].cx - 46, 505, 'check digit', { parent: left, size: 28, fill: C.ochre, w: 600, anchor: 'end' });
  X.mark(250, 490, true, { parent: left, s: 30 });
  X.show(left, 0, { type: 'up', out: 2 });

  const right = X.g();
  X.rect(1000, 220, 800, 360, { parent: right, fill: C.card, r: 20, shadow: true });
  X.text(1045, 285, 'Name and address', { parent: right, size: 36, serif: true, w: 600 });
  X.chip(1250, 360, 'Ravi Kumar', { parent: right, size: 34, color: C.ink });
  X.chip(1340, 450, '12 Gandhi Street, Madurai', { parent: right, size: 32, color: C.ink });
  X.text(1045, 545, 'no check digit, no fixed shape', { parent: right, size: 28, fill: C.red, w: 600 });
  const q1 = X.g(right); X.circle(1720, 360, 28, { parent: q1, fill: C.redL, stroke: C.red, sw: 3 }); X.text(1720, 372, '?', { parent: q1, size: 34, w: 800, anchor: 'middle', fill: C.red });
  const q2 = X.g(right); X.circle(1720, 450, 28, { parent: q2, fill: C.redL, stroke: C.red, sw: 3 }); X.text(1720, 462, '?', { parent: q2, size: 34, w: 800, anchor: 'middle', fill: C.red });
  X.bob(q1, { amp: 5, per: 1.4 }); X.bob(q2, { amp: 5, per: 1.4, ph: 1.5 });
  X.show(right, 0, { f: 0.45, type: 'left', out: 2 });

  // cue 1: maths machine cannot decide; AI appears
  const mach = X.g();
  X.rect(480, 650, 360, 230, { parent: mach, fill: C.sand, r: 22 });
  const g1 = X.icon('gear', 600, 740, 0.9, { parent: mach });
  const g2 = X.icon('gear', 720, 740, 0.65, { parent: mach, fill: C.ochreL });
  X.spin(g1.mid, 600, 740, { speed: 50 }); X.spin(g2.mid, 720, 740, { speed: -70 });
  X.text(660, 850, 'maths', { parent: mach, size: 28, anchor: 'middle', w: 600, fill: C.ink2 });
  X.show(mach, 1, { type: 'pop', out: 2 });
  const fly = X.g(); X.chip(0, 0, 'Ravi Kumar', { parent: fly, size: 26 });
  X.show(fly, 1, { f: 0.08, type: 'fade', len: 0.2, out: 1, outf: 0.36, outLen: 0.15 });
  X.travel(fly, spline([[1250, 360], [1000, 520], [760, 650], [660, 740]]), 1, { f0: 0.08, f1: 0.36 });
  const qq = X.g(); X.text(0, 30, '?', { parent: qq, size: 110, w: 800, anchor: 'middle', fill: C.red });
  const qqw = X.g(); qqw.appendChild(qq); qq.setAttribute('transform', 'translate(320 770)');
  X.show(qqw, 1, { f: 0.36, type: 'pop', out: 2 });
  const qsh = X.g(); qsh.appendChild(qqw); X.shake(qsh, 1, { f: 0.42, amp: 12, len: 0.8 });
  const brainG = X.g();
  const brainI = X.icon('brain', 1300, 765, 1.25, { parent: brainG, color: C.plum });
  X.text(1450, 760, 'AI', { parent: brainG, size: 72, w: 700, serif: true, fill: C.plum });
  X.text(1450, 806, 'artificial intelligence', { parent: brainG, size: 28, fill: C.ink2 });
  X.show(brainG, 1, { f: 0.55, type: 'pop', out: 2 });
  X.pulse(brainI.mid, 1300, 765, [1], { f: 0.7, amt: 0.15 });
  const toBrain = X.arrow(870, 765, 1200, 765, { color: C.plum, bend: -0.15 });
  X.show(toBrain, 1, { f: 0.6, type: 'draw', out: 2 });
  X.term(1, 'AI (artificial intelligence)', 'Computer programs that make good guesses in\nsituations where there is no exact rule.', { f: 0.55, until: 2, outf: 0.3 });

  // cue 2: rules vs examples
  const rules = X.g();
  X.rect(160, 230, 700, 600, { parent: rules, fill: C.card, r: 20, shadow: true });
  X.text(510, 300, 'Given rules', { parent: rules, size: 36, serif: true, anchor: 'middle', w: 600 });
  ['if the word is "Mr" ...', 'if it ends in "Street" ...', 'if ... and if ... unless ...', 'if ... if ... if ...'].forEach((s, i) => X.text(220, 390 + i * 80, s, { parent: rules, size: 30, mono: true, fill: C.ink3 }));
  const strike = X.path('M200,800 L820,270', { parent: rules, color: C.red, sw: 8 });
  X.show(rules, 2, { type: 'up', out: 3 });
  X.show(strike, 2, { f: 0.35, type: 'draw' });
  const ex = X.g();
  X.rect(1060, 230, 700, 600, { parent: ex, fill: C.plumL, stroke: C.plum, r: 20, shadow: true });
  X.text(1410, 300, 'Learns from examples', { parent: ex, size: 36, serif: true, anchor: 'middle', w: 600, fill: C.plum });
  X.icon('brain', 1410, 640, 1.1, { parent: ex, color: C.plum, fill: C.card });
  X.show(ex, 2, { f: 0.4, type: 'left', out: 3 });
  const exSp = spline([[1100, 400], [1250, 380], [1410, 460], [1410, 600]]);
  X.stream(exSp, { n: 6, speed: 0.35, k0: 2, f0: 0.5, k1: 3, make: (g, i) => { const e = E('g', null, g); E('rect', { x: -30, y: -20, width: 60, height: 40, rx: 6, fill: C.card, stroke: C.plum, 'stroke-width': 3 }, e); E('line', { x1: -18, y1: -4, x2: 18, y2: -4, stroke: C.ink3, 'stroke-width': 4 }, e); E('line', { x1: -18, y1: 8, x2: 8, y2: 8, stroke: C.ink3, 'stroke-width': 4 }, e); return e; } });
  const exSp2 = spline([[1720, 400], [1570, 380], [1410, 460], [1410, 600]]);
  X.stream(exSp2, { n: 6, speed: 0.3, k0: 2, f0: 0.55, k1: 3, make: (g) => { const e = E('g', null, g); E('rect', { x: -30, y: -20, width: 60, height: 40, rx: 6, fill: C.card, stroke: C.plum, 'stroke-width': 3 }, e); E('circle', { cx: 0, cy: 0, r: 9, fill: C.ochre }, e); return e; } });
  X.term(2, 'Machine learning', 'A program that learns patterns from many examples,\ninstead of following rules a person wrote.', { f: 0.15, until: 3 });

  // ---------- region dogs: a child learns "dog" (cues 3-4) ----------
  const [dx, dy] = R.dogs;
  const kid = X.person(dx + 330, dy + 880, { shirt: C.green, skin: C.skin[3], s: 0.78, ph: 0.6 });
  X.show(kid, 3, { type: 'up' });
  X.each(() => { kid.mood(X.t > X.at(3, 0.7) ? 'happy' : 'neutral'); });
  const dogCols = [C.ochre, C.ink2, C.skin[0], C.sand, C.ink, C.skin[3], C.ochre, C.sand, C.skin[1], C.ink2, C.skin[2], C.ochreL];
  const drawDog = (p, col, v) => {
    const g = E('g', { transform: `scale(${v.flip ? -v.s : v.s},${v.s})` }, p);
    E('path', { d: 'M-32,-6 Q-52,-22 -50,-40', fill: 'none', stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    E('path', { d: 'M-32,-6 Q-52,-22 -50,-40', fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    for (const lx of [-24, -10, 12, 26]) E('rect', { x: lx - 5, y: 4, width: 11, height: 30, rx: 5, fill: col, stroke: C.ink, 'stroke-width': 2.5 }, g);
    E('ellipse', { cx: 0, cy: 0, rx: 38, ry: 21, fill: col, stroke: C.ink, 'stroke-width': 3 }, g);
    if (v.spot) E('circle', { cx: -8, cy: -4, r: 9, fill: C.card, opacity: 0.7 }, g);
    E('circle', { cx: 38, cy: -22, r: 18, fill: col, stroke: C.ink, 'stroke-width': 3 }, g);
    E('ellipse', { cx: 54, cy: -16, rx: 11, ry: 8, fill: col, stroke: C.ink, 'stroke-width': 3 }, g);
    E('circle', { cx: 63, cy: -18, r: 3.5, fill: C.ink }, g);
    E('circle', { cx: 42, cy: -27, r: 3, fill: C.ink }, g);
    if (v.pointy) E('path', { d: 'M26,-34 L30,-54 L40,-38 Z', fill: col, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
    else E('path', { d: 'M28,-36 Q20,-30 24,-12 Q32,-16 34,-36 Z', fill: C.ink2, stroke: C.ink, 'stroke-width': 2.5 }, g);
  };
  const frames = [];
  const r1 = rng(11);
  for (let i = 0; i < 12; i++) {
    const fx = dx + 820 + (i % 4) * 270, fy = dy + 245 + Math.floor(i / 4) * 160;
    const w = X.g(); const inner = X.g(w);
    X.rect(-100, -70, 200, 140, { parent: inner, fill: C.card, r: 12, shadow: 5 });
    const dg = E('g', { transform: `translate(${-6 + r1() * 12} 4)` }, inner);
    const lab = X.g(inner); E('rect', { x: -90, y: 38, width: 180, height: 26, rx: 4, fill: C.greenL }, lab); X.text(0, 58, 'dog', { parent: lab, size: 22, w: 700, anchor: 'middle', fill: C.green });
    drawDog(dg, dogCols[i], { s: 0.85 + r1() * 0.4, flip: r1() < 0.4, spot: r1() < 0.4, pointy: r1() < 0.5 });
    X.show(w, 3, { f: 0.08 + i * 0.045, type: 'pop', len: 0.5 });
    frames.push({ w, inner, fx, fy, lab, ph: r1() * 6 });
  }
  // the box the examples fly into
  const tbox = X.g();
  X.rect(dx + 720, dy + 660, 1080, 250, { parent: tbox, fill: C.blueL, stroke: C.blue, r: 18, shadow: true });
  X.text(dx + 760, dy + 712, 'Training data', { parent: tbox, size: 38, serif: true, w: 600, fill: C.blue });
  X.text(dx + 1760, dy + 712, 'each example has the right answer', { parent: tbox, size: 26, anchor: 'end', fill: C.ink2 });
  X.show(tbox, 4, { type: 'up' });
  frames.forEach(f => X.root.appendChild(f.w));
  X.each(t => {
    frames.forEach((fr, i) => {
      const p = ease(X.L(4, 0.35 + i * 0.03, 0.62 + i * 0.03));
      const x = lerp(fr.fx, dx + 840 + i * 78, p), y = lerp(fr.fy, dy + 815 + (i % 2) * 14, p), s = lerp(1, 0.5, p);
      fr.lab.style.opacity = X.P(4, 0.05 + i * 0.02, 0, 0.3);
      const bob = (1 - p) * 4 * Math.sin(t * 1.6 + fr.ph);
      fr.inner.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + bob).toFixed(1)}) scale(${s.toFixed(3)})`);
          });
  });
  // gaze line from the child to the newest picture
  const gaze = E('line', { stroke: C.ochre, 'stroke-width': 3, 'stroke-dasharray': '6 10', 'stroke-linecap': 'round' }, X.root);
  X.each(t => {
    const p = X.L(3, 0.08, 0.62);
    const on = t > X.at(3, 0.08) && t < X.at(4, 0.2);
    gaze.style.display = on ? '' : 'none';
    if (!on) return;
    const i = Math.min(11, Math.floor(p * 12));
    const f = frames[i];
    gaze.setAttribute('x1', dx + 350); gaze.setAttribute('y1', dy + 880 - 204 * 0.78);
    gaze.setAttribute('x2', f.fx - 100); gaze.setAttribute('y2', f.fy);
  });
  // thought bubble: "?" then the idea of a dog
  const bub = X.g();
  E('circle', { cx: dx + 380, cy: dy + 640, r: 9, fill: C.card, stroke: C.line, 'stroke-width': 2 }, bub);
  E('circle', { cx: dx + 405, cy: dy + 600, r: 14, fill: C.card, stroke: C.line, 'stroke-width': 2 }, bub);
  E('ellipse', { cx: dx + 470, cy: dy + 500, rx: 120, ry: 80, fill: C.card, stroke: C.line, 'stroke-width': 2.5 }, bub);
  const bq = X.text(dx + 470, dy + 525, '?', { parent: bub, size: 72, w: 800, anchor: 'middle', fill: C.ink3 });
  const bd = E('g', { transform: `translate(${dx + 462} ${dy + 506})` }, bub); drawDog(bd, C.ochre, { s: 0.9, pointy: true });
  const bl = X.text(dx + 470, dy + 562, 'dog!', { parent: bub, size: 26, w: 700, anchor: 'middle', fill: C.green });
  X.show(bub, 3, { f: 0.1, type: 'pop' });
  X.each(() => { const s = X.t > X.at(3, 0.7); bq.style.opacity = s ? 0 : 1; bd.style.opacity = s ? 1 : 0; bl.style.opacity = s ? 1 : 0; });
  const noRule = X.g();
  X.rect(dx + 120, dy + 180, 420, 90, { parent: noRule, fill: C.redL, stroke: C.red, r: 14 });
  X.text(dx + 330, dy + 236, 'no rule book', { parent: noRule, size: 30, anchor: 'middle', w: 700, fill: C.red });
  X.show(noRule, 3, { f: 0.4, type: 'down', out: 4 });
  X.term(4, 'Training data', 'The examples a program learns from, each one\nmarked with the right answer.', { until: 5 });

  // ---------- region ner: labelling each word (cues 5-7) ----------
  const [nx, ny] = R.ner;
  const words = ['Payment', 'from', 'Mr', 'Ravi', 'Kumar,', '12', 'Gandhi', 'Street,', 'Madurai'];
  const tags = ['O', 'O', 'O', 'NAME', 'NAME', 'ADDRESS', 'ADDRESS', 'ADDRESS', 'ADDRESS'];
  const tcol = t => t === 'NAME' ? [C.plum, C.plumL] : t === 'ADDRESS' ? [C.teal, C.tealL] : [C.ink3, C.paper];
  const size = 46, wy = ny + 430, wh = 88;
  const widths = words.map(w => w.length * size * 0.56 + 34);
  const total = widths.reduce((a, b) => a + b, 0) + 16 * (words.length - 1);
  let xx = nx + 960 - total / 2;
  const W = words.map((w, i) => {
    const x = xx; xx += widths[i] + 16;
    const g = X.g();
    const b = X.rect(x, wy, widths[i], wh, { parent: g, r: 12, fill: C.card, shadow: 4 });
    X.text(x + widths[i] / 2, wy + 60, w, { parent: g, size, anchor: 'middle', w: 600 });
    X.show(g, 5, { f: 0.02 + i * 0.035, type: 'up', len: 0.5 });
    const tg = X.g();
    const [c1, c2] = tcol(tags[i]);
    X.chip(x + widths[i] / 2, wy + wh + 60, tags[i], { parent: tg, size: tags[i] === 'ADDRESS' ? 24 : 26, color: c1, fill: c2, mono: true });
    E('line', { x1: x + widths[i] / 2, y1: wy + wh + 6, x2: x + widths[i] / 2, y2: wy + wh + 34, stroke: c1, 'stroke-width': 3 }, tg);
    return { b, x, cx: x + widths[i] / 2, w: widths[i], tg };
  });
  const head = X.text(nx + 960, ny + 250, 'Find the names of people and places', { size: 44, serif: true, anchor: 'middle', w: 600 });
  X.show(head, 5, { f: 0.3, type: 'down', out: 6 });
  const head2 = X.text(nx + 960, ny + 250, 'Label each word, looking at its neighbours', { size: 44, serif: true, anchor: 'middle', w: 600 });
  X.show(head2, 6, { f: 0.1, type: 'down', out: 7 });
  const mag = X.icon('magnifier', 0, 0, 0.8, { color: C.ink });
  X.show(mag, 5, { f: 0.35, type: 'fade', out: 6 });
  X.each(() => {
    const p = X.L(5, 0.38, 0.85);
    const x = lerp(W[0].cx, W[8].cx, p);
    mag.mid.setAttribute('transform', `translate(${x.toFixed(1)} ${wy - 70 + 8 * Math.sin(p * 20)})`);
    // colour the words: during cue 5 the sweep marks names and places
    const cur = X.t >= X.at(6) ? -1 : Math.floor(p * 9.4);
    W.forEach((w, i) => {
      const done = X.t >= X.at(6) ? (X.t >= X.at(7) || crfIdx() >= i) : (X.t > X.at(5, 0.38) && cur >= i);
      const [c1, c2] = tcol(tags[i]);
      w.b.r.setAttribute('fill', done && tags[i] !== 'O' ? c2 : C.card);
      w.b.r.setAttribute('stroke', done && tags[i] !== 'O' ? c1 : C.line);
      w.tg.style.opacity = (X.t >= X.at(7) || (X.t >= X.at(6) && crfIdx() >= i)) ? 1 : 0;
    });
  });
  const crfIdx = () => Math.min(8, Math.floor(X.L(6, 0.12, 0.92) * 9));
  // the focus box and neighbour arcs during cue 6
  const focus = E('rect', { height: wh + 16, rx: 16, fill: 'none', stroke: C.ochre, 'stroke-width': 5 }, X.root);
  const arcL = E('path', { fill: 'none', stroke: C.ochre, 'stroke-width': 4, 'stroke-dasharray': '8 8', 'stroke-linecap': 'round' }, X.root);
  const arcR = E('path', { fill: 'none', stroke: C.ochre, 'stroke-width': 4, 'stroke-dasharray': '8 8', 'stroke-linecap': 'round' }, X.root);
  const dotL = E('circle', { r: 8, fill: C.ochre }, X.root), dotR = E('circle', { r: 8, fill: C.ochre }, X.root);
  X.each(t => {
    const on = t > X.at(6, 0.12) && t < X.at(7);
    for (const e of [focus, arcL, arcR, dotL, dotR]) e.style.display = on ? '' : 'none';
    if (!on) return;
    const i = crfIdx(), w = W[i];
    focus.setAttribute('x', w.x - 8); focus.setAttribute('y', wy - 8); focus.setAttribute('width', w.w + 16);
    const arc = (el, dot, j) => {
      if (j < 0 || j > 8) { el.style.display = 'none'; dot.style.display = 'none'; return; }
      const a = W[j];
      el.setAttribute('d', `M${a.cx},${wy - 6} Q${(a.cx + w.cx) / 2},${wy - 90} ${w.cx},${wy - 12}`);
      el.style.strokeDashoffset = -t * 30;
      dot.setAttribute('cx', a.cx); dot.setAttribute('cy', wy - 6);
    };
    arc(arcL, dotL, i - 1); arc(arcR, dotR, i + 1);
  });
  // cue 7: two learned hints
  const h1 = X.arrow(W[2].cx, wy - 8, W[3].cx, wy - 10, { color: C.plum, bend: -0.45, sw: 5 });
  X.show(h1, 7, { f: 0.05, type: 'draw' });
  const c1 = X.g();
  X.rect(W[2].cx - 230, ny + 190, 460, 110, { parent: c1, fill: C.plumL, stroke: C.plum, r: 16 });
  X.text(W[2].cx, ny + 236, 'comes after "Mr"', { parent: c1, size: 28, anchor: 'middle', w: 600, fill: C.ink });
  X.text(W[2].cx, ny + 280, 'probably a NAME', { parent: c1, size: 32, anchor: 'middle', w: 700, fill: C.plum });
  X.show(c1, 7, { f: 0.12, type: 'down' });
  const h2 = X.arrow(W[7].cx, wy - 8, W[6].cx, wy - 10, { color: C.teal, bend: 0.45, sw: 5 });
  X.show(h2, 7, { f: 0.55, type: 'draw' });
  const c2 = X.g();
  X.rect(W[6].cx - 230, ny + 190, 460, 110, { parent: c2, fill: C.tealL, stroke: C.teal, r: 16 });
  X.text(W[6].cx, ny + 236, 'comes before "Street"', { parent: c2, size: 28, anchor: 'middle', w: 600, fill: C.ink });
  X.text(W[6].cx, ny + 280, 'probably an ADDRESS', { parent: c2, size: 32, anchor: 'middle', w: 700, fill: C.teal });
  X.show(c2, 7, { f: 0.6, type: 'down' });
  X.term(5, 'Model', 'What a program has learned, saved as a file.\nIt uses it to make guesses on new text.', { until: 5, outf: 0.4 });
  X.term(5, 'NER (named entity recognition)', 'Finding the names of people, places and\norganisations inside ordinary text.', { f: 0.42, until: 6 });
  X.term(6, 'CRF (conditional random field)', 'A small AI model that labels a whole row of words,\nchoosing each label with its neighbours in mind.', { until: 7 });
  const legend = X.g();
  X.text(nx + 960, ny + 760, 'NAME = person      ADDRESS = place      O = nothing sensitive', { parent: legend, size: 32, anchor: 'middle', fill: C.ink2 });
  X.show(legend, 6, { f: 0.5, type: 'up' });

  // ---------- region lap: small and fast (cue 8) ----------
  const [lx, ly] = R.lap;
  const lapG = X.g();
  X.icon('laptop', lx + 760, ly + 560, 3.3, { parent: lapG, color: C.ink, fill: C.blueL });
  X.chip(lx + 760, ly + 525, 'NER model', { parent: lapG, size: 34, color: C.plum, fill: C.plumL });
  X.text(lx + 760, ly + 750, 'a normal laptop', { parent: lapG, size: 34, anchor: 'middle', fill: C.ink2 });
  X.show(lapG, 8, { type: 'pop' });
  const lt = X.text(lx + 960, ly + 230, 'Small and fast', { size: 46, serif: true, anchor: 'middle', w: 600 });
  X.show(lt, 8, { f: 0.05, type: 'down' });
  const inSp = spline([[lx + 120, ly + 400], [lx + 350, ly + 450], [lx + 600, ly + 520]]);
  const outSp = spline([[lx + 920, ly + 520], [lx + 1080, ly + 460], [lx + 1230, ly + 400]]);
  X.stream(inSp, { n: 4, speed: 0.55, k0: 8, f0: 0.15, make: g => { const e = E('g', null, g); E('rect', { x: -40, y: -18, width: 80, height: 36, rx: 6, fill: C.card, stroke: C.line, 'stroke-width': 2 }, e); E('line', { x1: -28, y1: 0, x2: 28, y2: 0, stroke: C.ink3, 'stroke-width': 5, 'stroke-linecap': 'round' }, e); return e; } });
  X.stream(outSp, { n: 4, speed: 0.55, k0: 8, f0: 0.2, make: g => { const e = E('g', null, g); E('rect', { x: -40, y: -18, width: 80, height: 36, rx: 6, fill: C.card, stroke: C.plum, 'stroke-width': 2 }, e); E('line', { x1: -28, y1: 0, x2: -4, y2: 0, stroke: C.ink3, 'stroke-width': 5, 'stroke-linecap': 'round' }, e); E('rect', { x: 2, y: -7, width: 28, height: 14, rx: 4, fill: C.plum }, e); return e; } });
  const rig = X.g();
  X.rect(lx + 1300, ly + 330, 400, 440, { parent: rig, fill: C.paper, stroke: C.line, r: 18, dash: '10 8' });
  for (let i = 0; i < 3; i++) X.icon('server', lx + 1440, ly + 400 + i * 110, 0.8, { parent: rig, color: C.ink3 });
  for (let i = 0; i < 3; i++) X.icon('coin', lx + 1615, ly + 410 + i * 110, 0.55, { parent: rig, color: C.ink3 });
  X.text(lx + 1500, ly + 830, 'no expensive hardware', { parent: rig, size: 32, anchor: 'middle', w: 600, fill: C.ink2 });
  X.show(rig, 8, { f: 0.45, type: 'left' });
  const rigX = X.path(`M${lx + 1320},${ly + 750} L${lx + 1680},${ly + 350} M${lx + 1320},${ly + 350} L${lx + 1680},${ly + 750}`, { color: C.red, sw: 8 });
  X.show(rigX, 8, { f: 0.65, type: 'draw' });

  // ---------- region lang: English, Hindi, Hinglish (cue 9) ----------
  const [gx, gy] = R.lang;
  const lines = [
    ['English', ['Payment from ', 'Ravi Kumar', ' received'], 0],
    ['Hindi', ['', 'रवि कुमार', ' ने भुगतान किया'], 1],
    ['Hinglish', ['', 'Ravi Kumar', ' ne payment kar diya'], 2]
  ];
  const typer = X.person(gx + 220, gy + 860, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 0.85 });
  X.show(typer, 9, { type: 'up' });
  X.talk(typer, [9]);
  const tph = X.icon('phone', gx + 300, gy + 640, 0.6);
  X.show(tph, 9, { type: 'pop' });
  X.each(() => { if (X.t > X.at(9)) X.arms(typer, 8, 55); else X.arms(typer, 8, -8); });
  lines.forEach(([lang, parts, i]) => {
    const y = gy + 300 + i * 200;
    const g = X.g();
    const sz = 46, deva = i === 1;
    const estA = parts[0].length * sz * 0.52, nameW = deva ? 240 : 270, estC = parts[2].length * sz * (deva ? 0.5 : 0.52);
    const bx = gx + 470;
    const bw = 40 + estA + nameW + estC + 60;
    X.rect(bx, y - 64, bw, 112, { parent: g, fill: C.card, r: 24, shadow: true });
    E('path', { d: `M${bx + 4},${y + 8} L${bx - 28},${y + 38} L${bx + 4},${y + 30} Z`, fill: C.card, stroke: C.line, 'stroke-width': 2 }, g);
    X.text(bx + 10, y - 80, lang, { parent: g, size: 28, w: 700, fill: C.ochre });
    const nx0 = bx + 40 + estA;
    if (parts[0]) X.text(nx0 - 8, y + 6, parts[0].trim(), { parent: g, size: sz, anchor: 'end' });
    const hl = E('rect', { x: nx0, y: y - 44, width: nameW, height: 68, rx: 12, fill: C.plumL, stroke: C.plum, 'stroke-width': 3 }, g);
    X.text(nx0 + nameW / 2, y + 6, parts[1], { parent: g, size: sz, anchor: 'middle', w: 700, fill: C.plum });
    X.text(nx0 + nameW + 12, y + 6, parts[2].trim(), { parent: g, size: sz });
    const tag = X.chip(nx0 + nameW / 2, y + 72, 'NAME', { parent: g, size: 22, mono: true, color: C.plum, fill: C.card });
    X.show(g, 9, { f: 0.05 + i * 0.22, type: 'left' });
    X.each(() => { const on = X.t > X.at(9, 0.2 + i * 0.22); hl.style.opacity = on ? 1 : 0; tag.style.opacity = on ? 1 : 0; });
    const ar = X.arrow(bx + bw + 24, y - 8, gx + 1570, gy + 500 + (i - 1) * 50, { color: C.plum, sw: 4, bend: (i - 1) * -0.12 });
    X.show(ar, 9, { f: 0.24 + i * 0.22, type: 'draw' });
  });
  const lb = X.g();
  const lbI = X.icon('brain', gx + 1660, gy + 500, 1.15, { parent: lb, color: C.plum });
  X.text(gx + 1660, gy + 630, 'one model', { parent: lb, size: 32, anchor: 'middle', w: 700, fill: C.plum });
  X.text(gx + 1660, gy + 670, 'reads all three', { parent: lb, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(lb, 9, { f: 0.15, type: 'pop' });
  X.pulse(lbI.mid, gx + 1660, gy + 500, 9, { f: 0.75, amt: 0.14 });
  X.term(9, 'Hinglish', 'Hindi and English mixed in one sentence,\noften typed in English letters.', { f: 0.4, until: 10 });

  // ---------- region ctx: characters around a number (cue 10) ----------
  const [ox, oy] = R.ctx;
  const t10 = X.text(ox + 120, oy + 220, 'Same-looking value, different meaning', { size: 42, serif: true, w: 600 });
  X.show(t10, 10, { type: 'down' });
  const msz = 46, cw = msz * 0.602;
  const rows = [
    ['Your OTP is 482913', 12, 6, 'OTP: hide it', C.red, C.redL, 0.06, 'lock'],
    ['Server port 48291 open', 12, 5, 'port number: leave it', C.green, C.greenL, 0.22, 'unlock'],
    ['Pay to ravi@oksbi', 7, 10, 'UPI ID: hide it', C.red, C.redL, 0.55, 'lock'],
    ['Mail help@example.com', 5, 16, 'email address', C.blue, C.blueL, 0.7, 'envelope']
  ];
  rows.forEach(([str, s0, n, verdict, col, colL, f, ic], i) => {
    const y = oy + 340 + i * 145 + (i >= 2 ? 40 : 0);
    const x0 = ox + 150;
    const g = X.g();
    X.rect(x0 - 24, y - 58, str.length * cw + 48, 92, { parent: g, fill: C.card, r: 12, shadow: 4 });
    const win = E('rect', { y: y - 50, height: 74, rx: 8, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 3 }, g);
    E('rect', { x: x0 + s0 * cw - 3, y: y - 50, width: n * cw + 6, height: 74, rx: 8, fill: 'none', stroke: C.ink, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, g);
    X.text(x0, y + 2, str, { parent: g, size: msz, mono: true, w: 500 });
    X.show(g, 10, { f, type: 'left' });
    // the reading window grows outwards from the value to the characters around it
    X.each(() => {
      const p = ease(X.L(10, f + 0.03, f + 0.12));
      const a = Math.max(0, s0 - p * Math.min(s0, 7)), b = s0 + n + p * Math.min(str.length - s0 - n, 5);
      win.setAttribute('x', x0 + a * cw - 3); win.setAttribute('width', Math.max(0, (b - a) * cw + 6));
      win.style.opacity = p > 0 ? 1 : 0;
    });
    const v = X.g();
    const vx = ox + 1320;
    X.arrow(ox + 150 + str.length * cw + 50, y - 14, vx - 30, y - 14, { parent: v, color: col, sw: 4 });
    X.rect(vx, y - 58, 450, 88, { parent: v, fill: colL, stroke: col, r: 44 });
    X.icon(ic, vx + 52, y - 12, 0.42, { parent: v, color: col });
    X.text(vx + 100, y - 2, verdict, { parent: v, size: 30, w: 700, fill: col });
    X.show(v, 10, { f: f + 0.12, type: 'left' });
  });
  X.term(10, 'OTP and port number', 'OTP: a one-time code sent to your phone (private).\nPort: a number for a computer\'s doorway (harmless).', { f: 0.08, until: 10, outf: 0.5 });
  X.term(10, 'UPI ID and email address', 'UPI ID: your payment address, like ravi@oksbi.\nEmail address: where mail is sent. Both have an @.', { f: 0.52, until: 11 });

  // ---------- region own: maths vs AI, and who owns it (cue 11) ----------
  const [wx0, wy0] = R.own;
  const mb = X.g();
  X.rect(wx0 + 160, wy0 + 200, 740, 400, { parent: mb, fill: C.tealL, stroke: C.teal, r: 20, shadow: true });
  X.text(wx0 + 530, wy0 + 268, 'Maths: a sure answer', { parent: mb, size: 36, serif: true, anchor: 'middle', w: 600, fill: C.teal });
  ['Aadhaar check digit', 'Card check digit', 'Aran\'s own tokens'].forEach((s, i) => { X.mark(wx0 + 240, wy0 + 345 + i * 80, true, { parent: mb, s: 20 }); X.text(wx0 + 280, wy0 + 356 + i * 80, s, { parent: mb, size: 30 }); });
  X.show(mb, 11, { type: 'up' });
  const ab = X.g();
  X.rect(wx0 + 1020, wy0 + 200, 740, 400, { parent: ab, fill: C.plumL, stroke: C.plum, r: 20, shadow: true });
  X.text(wx0 + 1390, wy0 + 268, 'AI: only where maths can\'t', { parent: ab, size: 36, serif: true, anchor: 'middle', w: 600, fill: C.plum });
  ['Names and addresses', 'OTP or port number?', 'UPI ID or email?'].forEach((s, i) => { X.icon('brain', wx0 + 1100, wy0 + 345 + i * 80, 0.3, { parent: ab, color: C.plum, fill: C.card }); X.text(wx0 + 1140, wy0 + 356 + i * 80, s, { parent: ab, size: 30 }); });
  X.show(ab, 11, { f: 0.15, type: 'up' });
  const arun = X.person(wx0 + 800, wy0 + 885, { shirt: C.green, skin: C.skin[0], s: 0.8, name: 'Arun', ph: 1 });
  const bha = X.person(wx0 + 1120, wy0 + 885, { shirt: C.ink2, skin: C.skin[2], s: 0.8, name: 'Bharadhwaj', glasses: false, ph: 2 });
  X.show(arun, 11, { f: 0.55, type: 'up' }); X.show(bha, 11, { f: 0.62, type: 'up' });
  X.each(() => { X.arms(arun, 8, -8); X.arms(bha, 8, -8); });
  X.wave(arun, 11, { f: 0.7, len: 1.6 }); X.wave(bha, 11, { f: 0.75, len: 1.6 });
  X.each(() => { arun.mood(X.t > X.at(11, 0.6) ? 'happy' : 'neutral'); bha.mood(X.t > X.at(11, 0.6) ? 'happy' : 'neutral'); });
  const team = X.chip(wx0 + 960, wy0 + 645, 'the AI pair', { size: 26, color: C.plum, fill: C.card });
  X.show(team, 11, { f: 0.6, type: 'pop' });

  X.recap(12, ['AI learns from examples, not from rules', 'It finds names and addresses in text', 'It tells OTPs and UPI IDs from look-alikes']);
});
