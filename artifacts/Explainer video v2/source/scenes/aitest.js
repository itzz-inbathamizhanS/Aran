// Testing AI fairly: homework vs a fair exam, train on 8 systems and test on 8 others behind a wall,
// and precision / recall as a fishing net (fish = really sensitive, boots = harmless things caught by mistake).
scene('aitest', X => {
  const R = { a: [0, 0], wall: [2000, 0], lake: [0, 1100], bars: [2000, 1100] };
  const cx = r => R[r][0] + 960, cy = r => R[r][1] + 540;
  X.cam([
    { x: 960, y: 480, s: 1.35 },
    { k: 1, x: 960, y: 540, s: 1, len: 1.5 },
    { k: 3, x: cx('wall'), y: cy('wall'), s: 1, len: 1.8 },
    { k: 5, x: cx('lake'), y: cy('lake'), s: 1, len: 1.8 },
    { k: 6, x: 1000, y: 1610, s: 1.05, len: 1.4 },
    { k: 7, x: cx('lake'), y: cy('lake'), s: 1, len: 1.4 },
    { k: 8, x: cx('bars'), y: cy('bars'), s: 1, len: 1.8 }
  ]);

  // ---------- cue 0: learned, or memorised? ----------
  const q = X.g();
  const br = X.icon('brain', 960, 470, 1.9, { parent: q, color: C.plum });
  X.text(960, 650, 'the AI model', { parent: q, size: 32, anchor: 'middle', fill: C.ink2 });
  X.pulse(br.mid, 960, 470, [0], { f: 0.15, amt: 0.1 });
  X.show(q, 0, { type: 'pop', out: 1 });
  const learned = X.g();
  X.rect(330, 400, 360, 140, { parent: learned, fill: C.greenL, stroke: C.green, r: 20, shadow: true });
  X.icon('bulb', 400, 470, 0.6, { parent: learned, color: C.green });
  X.text(450, 462, 'really', { parent: learned, size: 30, fill: C.ink2 });
  X.text(450, 502, 'learned?', { parent: learned, size: 36, w: 700, fill: C.green });
  X.show(learned, 0, { f: 0.3, type: 'right', out: 1 });
  const memo = X.g();
  X.rect(1230, 400, 380, 140, { parent: memo, fill: C.ochreL, stroke: C.ochre, r: 20, shadow: true });
  X.icon('file', 1300, 470, 0.55, { parent: memo, color: C.ochre });
  X.icon('file', 1316, 482, 0.55, { parent: memo, color: C.ochre });
  X.text(1360, 462, 'just', { parent: memo, size: 30, fill: C.ink2 });
  X.text(1360, 502, 'memorised?', { parent: memo, size: 36, w: 700, fill: C.ochre });
  X.show(memo, 0, { f: 0.55, type: 'left', out: 1 });
  const qm = X.text(960, 300, '?', { size: 90, w: 800, anchor: 'middle', fill: C.ink3 });
  X.show(qm, 0, { f: 0.7, type: 'pop', out: 1 });

  // ---------- cues 1-2: homework vs exam ----------
  const paper = (x, title, col) => {
    const g = X.g();
    X.rect(x, 210, 520, 500, { parent: g, fill: C.card, r: 10, shadow: true });
    E('rect', { x, y: 210, width: 520, height: 70, rx: 10, fill: col }, g);
    X.text(x + 260, 258, title, { parent: g, size: 36, serif: true, anchor: 'middle', w: 600, fill: C.card });
    for (let i = 0; i < 3; i++) E('line', { x1: x + 40, y1: 400 + i * 110, x2: x + 480, y2: 400 + i * 110, stroke: C.line, 'stroke-width': 2 }, g);
    return g;
  };
  const qs = ['7 + 5 = ?', '9 × 3 = ?', '12 − 4 = ?'], ans = ['12', '27', '8'], qs2 = ['8 + 6 = ?', '4 × 7 = ?', '15 − 9 = ?'];
  const hw = paper(200, 'Homework', C.blue);
  qs.forEach((s, i) => X.text(240, 380 + i * 110, (i + 1) + '.  ' + s, { parent: hw, size: 36, mono: true }));
  X.show(hw, 1, { type: 'right', out: 3 });
  const ex = paper(1200, 'Exam', C.plum);
  const exQ = qs.map((s, i) => X.text(1240, 380 + i * 110, (i + 1) + '.  ' + s, { parent: ex, size: 36, mono: true }));
  const exA = ans.map((s, i) => X.text(1640, 380 + i * 110, s, { parent: ex, size: 40, w: 700, fill: C.ochre, italic: true }));
  X.show(ex, 1, { f: 0.15, type: 'left', out: 3 });
  const same = [];
  for (let i = 0; i < 3; i++) {
    const a = X.path(`M${720},${368 + i * 110} C${900},${330 + i * 110} ${1040},${330 + i * 110} ${1190},${368 + i * 110}`, { color: C.ochre, sw: 3, dash: '8 8' });
    X.show(a, 1, { f: 0.3 + i * 0.06, type: 'fade', out: 2 });
    same.push(a);
  }
  const sameLab = X.chip(960, 290, 'same questions', { size: 26, color: C.ochre, fill: C.ochreL });
  X.show(sameLab, 1, { f: 0.35, type: 'pop', out: 2 });
  const stu = X.person(960, 900, { shirt: C.green, skin: C.skin[0], long: true, s: 0.9, ph: 0.3 });
  X.show(stu, 1, { f: 0.1, type: 'up', out: 3 });
  const memB = X.g();
  E('ellipse', { cx: 960, cy: 560, rx: 120, ry: 58, fill: C.card, stroke: C.line, 'stroke-width': 2.5 }, memB);
  E('circle', { cx: 955, cy: 640, r: 10, fill: C.card, stroke: C.line, 'stroke-width': 2 }, memB);
  const memT = X.text(960, 572, '12, 27, 8', { parent: memB, size: 32, anchor: 'middle', w: 700, mono: true, fill: C.ochre });
  X.show(memB, 1, { f: 0.5, type: 'pop', out: 3 });
  X.each(t => {
    const fair = t > X.at(2, 0.1);
    exQ.forEach((e, i) => { e.set((i + 1) + '.  ' + (fair ? qs2[i] : qs[i])); e.t.setAttribute('fill', fair ? C.green : C.ink); });
    exA.forEach((e, i) => { e.style.opacity = !fair && t > X.at(1, 0.55 + i * 0.08) ? 1 : 0; });
    memT.set(fair ? '?  ?  ?' : '12, 27, 8');
    stu.mood(fair ? 'shock' : t > X.at(1, 0.6) ? 'happy' : 'neutral');
  });
  const passT = X.chip(680, 800, 'passed from memory alone', { size: 26, color: C.ochre, fill: C.card });
  X.show(passT, 1, { f: 0.72, type: 'pop', out: 2 });
  const fairT = X.g();
  X.rect(1300, 730, 330, 80, { parent: fairT, fill: C.greenL, stroke: C.green, r: 40 });
  X.text(1465, 782, 'fair: new questions', { parent: fairT, size: 28, anchor: 'middle', w: 700, fill: C.green });
  X.show(fairT, 2, { f: 0.1, type: 'pop', out: 3 });
  const flip = X.g(); flip.appendChild(ex); X.shake(flip, 2, { f: 0.05, amp: 8, len: 0.5 });

  // ---------- cues 3-4: training data and test data, with a wall between ----------
  const [wx, wy] = R.wall;
  const zoneL = X.g();
  X.rect(wx + 100, wy + 200, 780, 690, { parent: zoneL, fill: C.blueL, stroke: C.blue, r: 22 });
  X.text(wx + 490, wy + 262, 'Training data', { parent: zoneL, size: 40, serif: true, anchor: 'middle', w: 600, fill: C.blue });
  X.text(wx + 490, wy + 302, 'the model learns from this', { parent: zoneL, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(zoneL, 3, { type: 'right' });
  const zoneR = X.g();
  X.rect(wx + 1040, wy + 200, 780, 690, { parent: zoneR, fill: C.greenL, stroke: C.green, r: 22 });
  X.text(wx + 1430, wy + 262, 'Test data', { parent: zoneR, size: 40, serif: true, anchor: 'middle', w: 600, fill: C.green });
  X.text(wx + 1430, wy + 302, 'kept hidden until the exam', { parent: zoneR, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(zoneR, 3, { f: 0.1, type: 'left' });
  // the wall rises between them
  const wall = X.g();
  E('rect', { x: wx + 916, y: wy + 190, width: 88, height: 710, rx: 6, fill: C.ochreL, stroke: C.ink2, 'stroke-width': 3 }, wall);
  for (let r = 1; r < 18; r++) E('line', { x1: wx + 916, y1: wy + 190 + r * 39.4, x2: wx + 1004, y2: wy + 190 + r * 39.4, stroke: C.ink2, 'stroke-width': 2 }, wall);
  for (let r = 0; r < 18; r++) { const xs = r % 2 ? [wx + 945, wx + 975] : [wx + 960]; for (const x of xs) E('line', { x1: x, y1: wy + 190 + r * 39.4, x2: x, y2: wy + 190 + (r + 1) * 39.4, stroke: C.ink2, 'stroke-width': 2 }, wall); }
  X.show(wall, 3, { f: 0.2, type: 'rise', len: 1.2 });
  [[wx + 490, C.blue, C.blueL], [wx + 1430, C.green, C.greenL]].forEach(([x, col, f], j) => {
    const st = X.g();
    for (let i = 0; i < 5; i++) X.icon('file', x - 80 + i * 40, wy + 560 + (i % 2) * 20, 0.9, { parent: st, color: col, fill: C.card });
    X.show(st, 3, { f: 0.3 + j * 0.15, type: 'up', out: 4, outLen: 0.4 });
  });
  // eight systems on each side
  const sysL = [], sysR = [];
  for (let i = 0; i < 8; i++) {
    const c = i % 4, r = Math.floor(i / 4);
    const gL = X.g(); const iL = X.icon('server', wx + 210 + c * 180, wy + 620 + r * 180, 0.7, { parent: gL, color: C.blue });
    X.show(gL, 4, { f: i * 0.03, type: 'pop' }); sysL.push(iL);
    const gR = X.g(); const iR = X.icon('server', wx + 1150 + c * 180, wy + 620 + r * 180, 0.7, { parent: gR, color: C.green });
    X.show(gR, 4, { f: 0.4 + i * 0.03, type: 'pop' }); sysR.push(gR);
    X.bob(iL.mid, { amp: 3, per: 2.4, ph: i });
  }
  const cntL = X.chip(wx + 490, wy + 360, '8 systems', { size: 30, color: C.blue, fill: C.card });
  X.show(cntL, 4, { f: 0.1, type: 'pop' });
  const cntR = X.chip(wx + 1430, wy + 360, '8 other systems, never seen', { size: 30, color: C.green, fill: C.card });
  X.show(cntR, 4, { f: 0.5, type: 'pop' });
  // logs from the left systems flow up into the model
  const model = X.g(); const mI = X.icon('brain', 0, 0, 0.75, { parent: model, color: C.plum });
  const modelW = X.wrap(model);
  X.show(modelW, 4, { f: 0.05, type: 'pop' });
  X.each(() => {
    const p = ease(X.L(4, 0.45, 0.62));
    const x = lerp(wx + 490, wx + 1430, p), y = wy + 460 - Math.sin(p * Math.PI) * 330;
    model.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  });
  for (let i = 0; i < 8; i++) {
    const c = i % 4, r = Math.floor(i / 4);
    const sp = spline([[wx + 210 + c * 180, wy + 580 + r * 180], [lerp(wx + 210 + c * 180, wx + 490, 0.5), wy + 500], [wx + 490, wy + 470]]);
    X.stream(sp, { n: 2, speed: 0.6, r: 7, color: C.blue, k0: 4, f0: 0.08, k1: 4, f1: 0.45 });
  }
  const ticks = [];
  for (let i = 0; i < 8; i++) {
    const c = i % 4, r = Math.floor(i / 4);
    const m = X.mark(wx + 1205 + c * 180, wy + 560 + r * 180, true, { s: 20 });
    X.show(m, 4, { f: 0.68 + i * 0.03, type: 'pop' });
  }
  X.term(3, 'Test data', 'Examples kept apart and never used for learning,\nso they can check the model fairly afterwards.', { until: 5 });

  // ---------- cues 5-7: the fishing net ----------
  const [lx, ly] = R.lake;
  const lake = X.g();
  X.rect(lx + 120, ly + 470, 1080, 420, { parent: lake, fill: C.blueL, stroke: C.blue, r: 24 });
  for (let i = 0; i < 6; i++) {
    const wv = X.path(`M${lx + 160 + i * 170},${ly + 500} q20,-14 40,0 t40,0`, { parent: lake, color: C.blue, sw: 3 });
    wv.p.style.strokeDasharray = 'none';
  }
  X.show(lake, 5, { type: 'fade' });
  const fishD = (p, col) => {
    E('path', { d: 'M-30,0 L-46,-14 L-46,14 Z', fill: col, stroke: C.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, p);
    E('ellipse', { cx: 0, cy: 0, rx: 32, ry: 16, fill: col, stroke: C.ink, 'stroke-width': 2.5 }, p);
    E('circle', { cx: 18, cy: -4, r: 3.5, fill: C.ink }, p);
  };
  const bootD = (p) => {
    E('path', { d: 'M-16,-30 L8,-30 L8,6 L30,10 Q36,12 36,20 L36,26 L-16,26 Z', fill: C.ink2, stroke: C.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, p);
    E('line', { x1: -16, y1: 18, x2: 36, y2: 18, stroke: C.ink3, 'stroke-width': 3 }, p);
  };
  // caught items: 8 fish + 2 boots inside the net zone; missed: 4 fish; plus 3 boots left on the bottom
  const NX = lx + 470;
  const caught = [], free = [];
  const rr = rng(5);
  for (let i = 0; i < 10; i++) {
    const boot = i === 3 || i === 8;
    const x = NX - 130 + (i % 5) * 65, y = ly + 600 + Math.floor(i / 5) * 80 + (rr() - 0.5) * 20;
    const g = E('g', null, X.root); const inner = E('g', null, g);
    if (boot) bootD(inner); else fishD(inner, i % 2 ? C.ochre : C.teal);
    caught.push({ g, inner, x, y, boot, ph: rr() * 6 });
  }
  const freeFish = [[lx + 820, ly + 600], [lx + 980, ly + 690], [lx + 860, ly + 790], [lx + 1080, ly + 560]];
  freeFish.forEach(([x, y], i) => { const g = E('g', null, X.root); const inner = E('g', null, g); fishD(inner, i % 2 ? C.teal : C.ochre); free.push({ g, inner, x, y, ph: i * 1.7 }); });
  const bootsLeft = [[lx + 220, ly + 850], [lx + 1000, ly + 850], [lx + 1140, ly + 840]];
  bootsLeft.forEach(([x, y]) => { const g = E('g', { transform: `translate(${x} ${y})` }, X.root); bootD(g); free.push({ g: null, el: g }); });
  const lakeItems = X.g(); // wrapper so the items fade in with the lake
  [...caught.map(c => c.g), ...free.map(f => f.g || f.el)].forEach(e => lakeItems.appendChild(e));
  X.show(lakeItems, 5, { f: 0.1, type: 'fade' });
  // the net
  const net = X.g(); const netIn = X.g(net);
  E('line', { x1: 0, y1: -420, x2: 0, y2: -150, stroke: C.ink, 'stroke-width': 4 }, netIn);
  E('path', { d: 'M-200,-150 L200,-150 L170,40 Q0,120 -170,40 Z', fill: 'rgba(31,41,51,0.04)', stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, netIn);
  for (let i = -3; i <= 3; i++) E('line', { x1: i * 50, y1: -150, x2: i * 42, y2: 70 - Math.abs(i) * 12, stroke: C.ink2, 'stroke-width': 2 }, netIn);
  for (let j = 0; j < 4; j++) E('line', { x1: -192 + j * 8, y1: -100 + j * 50, x2: 192 - j * 8, y2: -100 + j * 50, stroke: C.ink2, 'stroke-width': 2 }, netIn);
  E('rect', { x: -210, y: -160, width: 420, height: 16, rx: 8, fill: C.ochre, stroke: C.ink, 'stroke-width': 3 }, netIn);
  X.show(net, 5, { f: 0.15, type: 'down' });
  const netY = () => {
    const down = ease(X.L(5, 0.3, 0.6)), up = ease(X.L(6, 0.02, 0.22));
    return lerp(lerp(ly + 400, ly + 720, down), ly + 470, up);
  };
  X.each(t => {
    const y = netY();
    netIn.setAttribute('transform', `translate(${NX} ${y.toFixed(1)})`);
    const lifted = ease(X.L(6, 0.02, 0.22));
    caught.forEach((c, i) => {
      const sx = c.x + (1 - lifted) * 10 * Math.sin(t * 1.3 + c.ph);
      const sy = c.y - (ly + 720 - y) * lifted;
      c.g.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
    });
    free.forEach(f => { if (!f.g) return; f.g.setAttribute('transform', `translate(${(f.x + 30 * Math.sin(t * 0.7 + f.ph)).toFixed(1)} ${(f.y + 6 * Math.sin(t * 1.9 + f.ph)).toFixed(1)})`); f.inner.setAttribute('transform', Math.cos(t * 0.7 + f.ph) < 0 ? 'scale(-1,1)' : ''); });
  });
  // keep the net in front of the fish
  X.root.appendChild(net);
  // highlight rings: boots in the net (false alarms) at cue 6, free fish (misses) at cue 7
  const rings = [];
  caught.forEach((c, i) => { if (!c.boot) return; const r = E('circle', { r: 42, fill: 'none', stroke: C.red, 'stroke-width': 4, 'stroke-dasharray': '8 6' }, X.root); rings.push([r, c, 6]); });
  free.forEach(f => { if (!f.g) return; const r = E('circle', { r: 48, fill: 'none', stroke: C.red, 'stroke-width': 4, 'stroke-dasharray': '8 6' }, X.root); rings.push([r, f, 7]); });
  X.each(t => {
    rings.forEach(([r, it, k]) => {
      const on = X.t > X.at(k, 0.45) && X.t < X.at(k + 1);
      r.style.display = on ? '' : 'none';
      if (!on) return;
      const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(it.g.getAttribute('transform') || '');
      if (m) { r.setAttribute('cx', m[1]); r.setAttribute('cy', m[2]); }
      r.setAttribute('stroke-dashoffset', t * 20);
    });
  });
  const leg = X.g();
  const lf = E('g', { transform: `translate(${lx + 760} ${ly + 230})` }, leg); fishD(lf, C.teal);
  X.text(lx + 810, ly + 242, 'fish = really sensitive', { parent: leg, size: 28 });
  const lb = E('g', { transform: `translate(${lx + 760} ${ly + 310})` }, leg); bootD(lb);
  X.text(lx + 810, ly + 322, 'boot = harmless', { parent: leg, size: 28 });
  X.show(leg, 5, { f: 0.2, type: 'left' });
  // the score panel
  const pan = (k, y, title, q, num, den, col, lab1, lab2) => {
    const g = X.g();
    X.rect(lx + 1260, ly + y, 560, 300, { parent: g, fill: C.card, r: 20, shadow: true });
    X.text(lx + 1300, ly + y + 60, title, { parent: g, size: 40, serif: true, w: 600, fill: col });
    X.text(lx + 1300, ly + y + 104, q, { parent: g, size: 25, fill: C.ink2 });
    const big = X.text(lx + 1300, ly + y + 200, '', { parent: g, size: 64, w: 700, mono: true, fill: C.ink });
    X.text(lx + 1300, ly + y + 260, lab1, { parent: g, size: 26, fill: C.ink2 });
    X.text(lx + 1780, ly + y + 200, lab2, { parent: g, size: 44, w: 700, anchor: 'end', fill: col });
    X.show(g, k, { f: 0.1, type: 'left' });
    X.each(() => { const p = X.L(k, 0.3, 0.6); big.set(p <= 0 ? '' : `${Math.round(num * p)} / ${den}`); });
    return g;
  };
  pan(6, 170, 'Precision', 'of everything in the net, how much is fish?', 8, 10, C.blue, '8 fish, 2 boots in the net', '0.8');
  pan(7, 520, 'Recall', 'of all the fish, how many were caught?', 8, 12, C.teal, '8 caught, 4 still swimming', '0.67');
  X.term(5, 'Precision', 'Of everything the detector flagged,\nhow much was really sensitive?', { f: 0.5, until: 6, outf: 0.5 });
  X.term(6, 'False alarm', 'Something harmless flagged by mistake:\na boot in the net.', { f: 0.55, until: 7 });
  X.term(7, 'Recall', 'Of everything really sensitive,\nhow much did the detector catch?', { f: 0.1, until: 8 });
  const fa = X.chip(lx + 470, ly + 160, 'boots in the net = false alarms', { size: 28, color: C.red, fill: C.redL });
  X.show(fa, 6, { f: 0.5, type: 'pop', out: 7 });
  const ms = X.chip(lx + 960, ly + 440, 'fish left in the water = misses', { size: 28, color: C.red, fill: C.redL });
  X.show(ms, 7, { f: 0.5, type: 'pop', out: 8 });

  // ---------- cues 8-9: the real scores ----------
  const [bx, by] = R.bars;
  const panel = (x, title, sub, rows, k) => {
    const g = X.g();
    X.rect(x, by + 210, 820, 620, { parent: g, fill: C.card, r: 22, shadow: true });
    X.text(x + 50, by + 285, title, { parent: g, size: 44, serif: true, w: 600 });
    X.text(x + 50, by + 330, sub, { parent: g, size: 26, fill: C.ink2 });
    X.show(g, k, { type: 'up' });
    rows.forEach(([lab, val, col, f], i) => {
      const y = by + 420 + i * 170;
      const rg = X.g();
      X.text(x + 50, y, lab, { parent: rg, size: 32, w: 600 });
      X.bar(x + 50, y + 26, 560, 56, val, k, { color: col, f0: f, f1: f + 0.3, parent: rg });
      const v = X.text(x + 770, y + 68, '', { parent: rg, size: 48, w: 700, anchor: 'end', mono: true, fill: col });
      X.count(v, 0, val * 100, k, { f0: f, f1: f + 0.3, fmt: n => (n / 100).toFixed(2) });
      X.show(rg, k, { f: f - 0.05, type: 'fade' });
    });
    return g;
  };
  panel(bx + 120, 'OTP detector', 'tested on systems it had never seen', [['Precision: no false alarms', 1.0, C.blue, 0.2], ['Recall', 0.8, C.teal, 0.55]], 8);
  panel(bx + 980, 'Name finder', 'combined score (precision and recall)', [['English news text', 0.85, C.plum, 0.15], ['Hindi', 0.76, C.plum, 0.5]], 9);
  // tiny net reminders on the OTP panel
  const mini = X.g();
  const mf = E('g', { transform: `translate(${bx + 840} ${by + 280}) scale(0.8)` }, mini); fishD(mf, C.teal);
  X.mark(bx + 720, by + 280, true, { parent: mini, s: 22 });
  X.show(mini, 8, { f: 0.3, type: 'pop' });
  X.term(9, 'Combined score', 'One number that balances precision and recall.\n1.0 would be perfect.', { f: 0.1, until: 10 });

  X.recap(10, ['Test on unseen data, like a fair exam', 'Precision counts false alarms', 'Recall counts misses']);
});
