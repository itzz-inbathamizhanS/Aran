// How the research was done: a six-step staircase the researcher climbs, one step per spoken step,
// with a side panel showing each step: the real question, the baseline, ~40 sources, measuring, maths, and 11 patched cracks.
scene('research', X => {
  const tf = (el, x, y, s = 1, r = 0) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(1)})` : ''}`);
  const BASE = 900, SW = 210, SH = 90, SX = 560;
  const stepX = i => SX + i * SW, stepTop = i => 840 - i * SH;
  const stepCue = [1, 3, 4, 6, 7, 8];
  const names = ['Question', 'Baseline', 'Read', 'Measure', 'Maths', 'Attack'];
  const cols = [C.blue, C.teal, C.plum, C.ochre, C.green, C.red];
  const colsL = [C.blueL, C.tealL, C.plumL, C.ochreL, C.greenL, C.redL];

  X.cam([{ x: 1100, y: 600, s: 1.1 },
    { k: 0, f: 0.3, x: 960, y: 540, s: 1, len: 2 },
    { k: 1, x: 900, y: 540, s: 1.03 },
    { k: 2, x: 720, y: 470, s: 1.1 },
    { k: 3, x: 960, y: 540, s: 1 },
    { k: 5, x: 720, y: 480, s: 1.08 },
    { k: 6, x: 960, y: 540, s: 1 },
    { k: 7, x: 840, y: 500, s: 1.05 },
    { k: 8, x: 960, y: 510, s: 1.02 }]);

  // ---------------- step icons (drawn around 0,0) ----------------
  const drawIcon = (i, g) => {
    if (i === 0) { E('circle', { cx: 0, cy: 0, r: 34, fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, g); const t = E('text', { x: 0, y: 16, 'font-size': 46, 'font-weight': 800, fill: C.blue, 'text-anchor': 'middle', 'font-family': F.serif }, g); t.textContent = '?'; }
    if (i === 1) { E('rect', { x: -34, y: -4, width: 18, height: 34, fill: C.ink3 }, g); E('rect', { x: -8, y: -30, width: 18, height: 60, fill: C.teal }, g); E('rect', { x: 18, y: -18, width: 18, height: 48, fill: C.teal }, g); E('line', { x1: -42, y1: -4, x2: 44, y2: -4, stroke: C.ink, 'stroke-width': 4, 'stroke-dasharray': '6 5' }, g); E('line', { x1: -42, y1: 31, x2: 44, y2: 31, stroke: C.ink, 'stroke-width': 4 }, g); }
    if (i === 2) { [[-30, C.plum, -40], [-8, C.ochre, -34], [14, C.blue, -44]].forEach(([x, c, h]) => E('rect', { x, y: h, width: 20, height: -h + 30, rx: 3, fill: c, stroke: C.ink, 'stroke-width': 3 }, g)); E('path', { d: 'M36,30 L52,-30 L36,-34 L22,28 Z', fill: C.teal, stroke: C.ink, 'stroke-width': 3 }, g); }
    if (i === 3) { E('rect', { x: -46, y: -14, width: 92, height: 30, rx: 4, fill: C.ochreL, stroke: C.ink, 'stroke-width': 4 }, g); for (let j = 0; j < 9; j++) E('line', { x1: -38 + j * 10, y1: -14, x2: -38 + j * 10, y2: j % 2 ? -4 : 2, stroke: C.ink, 'stroke-width': 3 }, g); }
    if (i === 4) { E('rect', { x: -40, y: -32, width: 80, height: 64, rx: 10, fill: C.greenL, stroke: C.ink, 'stroke-width': 4 }, g); const t = E('text', { x: 0, y: 13, 'font-size': 38, 'font-weight': 700, fill: C.green, 'text-anchor': 'middle', 'font-family': F.serif, 'font-style': 'italic' }, g); t.textContent = 'f(x)'; t.setAttribute('font-size', 30); }
    if (i === 5) { E('circle', { cx: 0, cy: -8, r: 18, fill: C.skin[3] }, g); E('path', { d: 'M-24,-6 Q-26,-40 0,-40 Q26,-40 24,-6 L24,14 L16,12 Q18,-28 0,-28 Q-18,-28 -16,12 L-24,14 Z', fill: C.ink }, g); E('path', { d: 'M-30,36 Q-30,14 0,14 Q30,14 30,36 Z', fill: C.ink2 }, g); }
  };

  // ================= the staircase =================
  for (let i = 0; i < 6; i++) {
    const g = X.g();
    const x0 = stepX(i), top = stepTop(i);
    E('rect', { x: x0 + 5, y: top + 5, width: SW, height: BASE - top, fill: C.shadow }, g);
    E('rect', { x: x0, y: top, width: SW, height: BASE - top, fill: C.card, stroke: C.ink2, 'stroke-width': 3 }, g);
    E('rect', { x: x0, y: top, width: SW, height: 12, fill: cols[i] }, g);
    const t = E('text', { x: x0 + 16, y: top + 52, 'font-size': 26, 'font-weight': 700, fill: cols[i], 'font-family': F.sans }, g);
    t.textContent = (i + 1) + '  ' + names[i];
    X.show(g, 0, { f: 0.25 + i * 0.1, type: 'up' });
    // icon on the step, pops when its step is spoken
    const ig = X.g(); const pg = X.g(ig); const iIn = X.g(pg); drawIcon(i, iIn);
    X.show(ig, stepCue[i], { f: 0.05, type: 'pop' });
    X.each(t2 => tf(iIn, x0 + 160, top - 48 + 4 * Math.sin(t2 * 2 + i), 1));
    X.pulse(pg, x0 + 160, top - 48, stepCue[i], { f: 0.1, amt: 0.25 });
  }
  const ground = X.line(60, BASE, 1860, BASE, { color: C.ink2, sw: 4 });
  X.show(ground, 0, { type: 'fade' });
  const title = X.g();
  X.text(500, 300, 'Six steps', { parent: title, anchor: 'middle', size: 64, serif: true, w: 600 });
  X.text(500, 360, 'before building anything', { parent: title, anchor: 'middle', size: 32, fill: C.ink2 });
  X.show(title, 0, { type: 'down', out: 2, outLen: 0.4 });

  // ================= the climber =================
  const res = X.person(460, BASE, { shirt: C.teal, skin: C.skin[1], glasses: true, s: 0.72, ph: 0.3 });
  X.show(res, 0, { f: 0.1, type: 'left' });
  const posAt = j => j < 0 ? [460, BASE] : [stepX(j) + 62, stepTop(j)];
  X.each(t => {
    let j = -1;
    for (let i = 0; i < 6; i++) if (t >= X.at(stepCue[i])) j = i;
    let [x, y] = posAt(j);
    let lift = 0;
    if (j >= 0) {
      const p = clamp((t - X.at(stepCue[j])) / 0.7);
      const [px, py] = posAt(j - 1);
      x = lerp(px, x, ease(p)); y = lerp(py, y, ease(p));
      lift = Math.sin(p * Math.PI) * 40;
      X.arms(res, lerp(8, 50, Math.sin(p * Math.PI)), lerp(-8, 50, Math.sin(p * Math.PI)));
    }
    res.g.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - lift).toFixed(1)}) scale(0.72)`);
    res.mood(j === 5 && t > X.at(8, 0.85) ? 'happy' : 'neutral');
  });
  // flag at the top
  const flag = X.g();
  E('line', { x1: 1800, y1: 390, x2: 1800, y2: 270, stroke: C.ink, 'stroke-width': 5 }, flag);
  E('path', { d: 'M1800,272 L1850,288 L1800,306 Z', fill: C.ochre }, flag);
  X.show(flag, 8, { f: 0.9, type: 'pop' });

  // ================= side panels (upper left) =================
  const panel = (k, out, head, color) => {
    const g = X.g();
    X.rect(80, 170, 820, 390, { parent: g, fill: C.card, r: 22, shadow: true });
    E('rect', { x: 80, y: 170, width: 12, height: 390, rx: 5, fill: color }, g);
    X.text(120, 226, head, { parent: g, size: 34, serif: true, w: 600 });
    X.show(g, k, { f: 0.1, type: 'up', out, outLen: 0.4 });
    return g;
  };
  // step 1: the real question
  const p1 = panel(1, 3, 'The real question', C.blue);
  const notJust = X.g(p1);
  X.text(120, 290, 'Not just: "can we find numbers?"', { parent: notJust, size: 28, fill: C.ink3, w: 600 });
  const strike = X.line(116, 281, 560, 281, { parent: notJust, color: C.red, sw: 4 });
  X.show(strike, 1, { f: 0.65, type: 'grow' });
  [['db', 'Where is each customer\'s data?'], ['person', 'Who can read it?'], ['unlock', 'Which copy leaked?']].forEach(([ic, s], i) => {
    const g = X.g(p1);
    X.icon(ic, 150, 340 + i * 72, 0.36, { parent: g });
    X.text(200, 350 + i * 72, s, { parent: g, size: 30, w: 600 });
    X.show(g, 2, { f: 0.15 + i * 0.22, type: 'left' });
  });
  const cant = X.g(p1); X.chip(740, 515, 'a bank cannot prove it', { parent: cant, size: 24, color: C.red, fill: C.redL });
  X.show(cant, 2, { f: 0.85, type: 'pop' });
  // step 2: baseline
  const p2 = panel(3, 4, 'Baseline: the obvious solution first', C.teal);
  const bl = X.g(p2);
  X.rect(120, 270, 330, 110, { parent: bl, fill: C.ink, r: 14 });
  X.text(285, 337, '\\d{6}', { parent: bl, anchor: 'middle', size: 40, mono: true, w: 600, fill: C.plumL });
  X.text(285, 412, 'simple pattern search', { parent: bl, anchor: 'middle', size: 24, fill: C.ink2 });
  X.show(bl, 3, { f: 0.2, type: 'pop' });
  const barBase = X.bar(520, 300, 300, 40, 0.45, 3, { color: C.ink3, f0: 0.4, f1: 0.6, parent: p2 });
  X.show(X.wrap(barBase), 3, { f: 0.35, type: 'fade' });
  X.text(520, 290, 'baseline score', { parent: p2, size: 24, fill: C.ink2 });
  const barNew = X.bar(520, 400, 300, 40, 0.92, 3, { color: C.teal, f0: 0.7, f1: 0.95, parent: p2 });
  X.show(X.wrap(barNew), 3, { f: 0.65, type: 'fade' });
  const beatL = X.text(520, 390, 'something real to beat', { parent: p2, size: 24, fill: C.teal, w: 700 });
  X.show(beatL, 3, { f: 0.65, type: 'up' });
  X.term(3, 'Baseline', 'The simple, obvious solution, built first,\nso every new idea can be measured against it.', { f: 0.4, until: 4, color: C.teal });
  // step 3: literature survey, about 40 sources
  const p3 = panel(4, 6, 'Reading what others did', C.plum);
  [['scale', 'laws banks\nmust follow'], ['alert', 'real leaks'], ['file', 'research\npapers']].forEach(([ic, s], i) => {
    const g = X.g(p3);
    X.icon(ic, 170 + i * 150, 320, 0.5, { parent: g });
    X.text(170 + i * 150, 395, s, { parent: g, anchor: 'middle', size: 22, fill: C.ink2, w: 600 });
    X.show(g, 4, { f: 0.4 + i * 0.15, type: 'pop' });
  });
  const stack = X.g(p3);
  const sheets = [];
  for (let i = 0; i < 40; i++) {
    const r = rng(i + 7);
    const sh = E('g', null, stack);
    E('rect', { x: -70, y: -9, width: 140, height: 16, rx: 3, fill: [C.card, C.plumL, C.blueL, C.ochreL][i % 4], stroke: C.ink2, 'stroke-width': 2 }, sh);
    sheets.push({ sh, dx: (r() - 0.5) * 18, rot: (r() - 0.5) * 6 });
  }
  X.each(t => {
    const n = Math.round(X.L(5, 0.3, 0.85) * 40);
    sheets.forEach((s, i) => {
      const on = i < n;
      s.sh.style.display = on ? '' : 'none';
      if (!on) return;
      const age = clamp((t - X.at(5, 0.3 + 0.55 * i / 40)) / 0.25);
      const y = 520 - i * 6 - (1 - age) * 60;
      s.sh.setAttribute('transform', `translate(${(740 + s.dx).toFixed(1)} ${y.toFixed(1)}) rotate(${s.rot.toFixed(1)})`);
    });
  });
  const srcN = X.text(740, 245, '', { parent: p3, anchor: 'middle', size: 34, serif: true, w: 700, fill: C.plum });
  X.each(() => srcN.set(X.t < X.at(5, 0.3) ? '' : 'about ' + Math.round(X.L(5, 0.3, 0.85) * 40) + ' sources'));
  X.term(4, 'Literature survey', 'Reading what other people have already found,\nbefore you start building.', { f: 0.4, until: 5, color: C.plum });
  // step 4: measure
  const p4 = panel(6, 7, 'Measure, don\'t guess', C.ochre);
  const gs = X.g(p4);
  X.text(130, 300, 'guessing', { parent: gs, size: 30, w: 600, fill: C.ink3 });
  X.mark(330, 290, false, { parent: gs, s: 24 });
  X.show(gs, 6, { f: 0.15, type: 'left' });
  const ms = X.g(p4);
  X.text(130, 380, 'measuring on real data', { parent: ms, size: 30, w: 700, fill: C.ochre });
  X.mark(500, 370, true, { parent: ms, s: 24 });
  X.show(ms, 6, { f: 0.35, type: 'left' });
  const ruler = X.g(p4); const rIn = X.g(ruler);
  E('rect', { x: 0, y: 0, width: 600, height: 50, rx: 6, fill: C.ochreL, stroke: C.ink, 'stroke-width': 4 }, rIn);
  for (let j = 0; j <= 30; j++) E('line', { x1: 10 + j * 19.3, y1: 0, x2: 10 + j * 19.3, y2: j % 5 ? 14 : 26, stroke: C.ink, 'stroke-width': 3 }, rIn);
  X.show(ruler, 6, { f: 0.4, type: 'fade' });
  X.each(() => tf(rIn, lerp(-80, 140, ease(X.L(6, 0.4, 0.75))), 450));
  const gapsL = X.text(140, 540, 'weak spots found and measured', { parent: p4, size: 24, fill: C.ink2, w: 600 });
  X.show(gapsL, 6, { f: 0.7, type: 'up' });
  // step 5: maths fixes, proved
  const p5 = panel(7, 8, 'A piece of maths for each weak spot', C.green);
  [['checksums', 0.1], ['probability', 0.25], ['cryptography', 0.4]].forEach(([s, f], i) => {
    const y = 300 + i * 80;
    const gap = X.g(p5);
    const crack = `M150,${y - 22} L170,${y - 6} L156,${y + 6} L176,${y + 22}`;
    E('path', { d: crack, fill: 'none', stroke: C.red, 'stroke-width': 5, 'stroke-linejoin': 'round' }, gap);
    X.text(200, y + 9, 'weak spot ' + (i + 1), { parent: gap, size: 26, fill: C.red, w: 600 });
    X.show(gap, 7, { f, type: 'left' });
    const fixW = X.g(p5); const fix = X.g(fixW);
    X.chip(0, 0, s, { parent: fix, size: 26, color: C.green, fill: C.greenL, shadow: true });
    X.show(fixW, 7, { f: f + 0.15, type: 'fade', len: 0.3 });
    const w = s.length * 14.6 + 36;
    X.each(() => tf(fix, lerp(900, 420 + w / 2, ease(X.L(7, f + 0.15, f + 0.3))), y));
    const ok = X.mark(650 + w / 2 - 40, y, true, { parent: p5, s: 22 });
    X.show(ok, 7, { f: 0.7 + i * 0.06, type: 'pop' });
  });
  const prv = X.g(p5); X.chip(760, 520, 'proved to work', { parent: prv, size: 24, color: C.green, fill: C.greenL });
  X.show(prv, 7, { f: 0.75, type: 'pop' });
  X.term(7, 'Proof', 'A step-by-step argument that shows a method\nalways works, not just in the tests we tried.', { f: 0.55, until: 8, color: C.green });
  // step 6: attack your own design: 11 cracks patched
  const p6 = panel(8, null, 'Attack your own design', C.red);
  const wall = X.g(p6);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) E('rect', { x: 120 + c * 80 + (r % 2 ? 40 : 0) - (r % 2 && c === 5 ? 40 : 0), y: 270 + r * 60, width: r % 2 && c === 5 ? 40 : 76, height: 56, rx: 4, fill: C.sand, stroke: C.line, 'stroke-width': 2 }, wall);
  X.show(wall, 8, { f: 0.05, type: 'fade' });
  const rc = rng(31);
  let found = 0;
  const cracks = [];
  for (let i = 0; i < 11; i++) {
    const x = 140 + rc() * 400, y = 285 + rc() * 185;
    const d = `M${x.toFixed(0)},${y.toFixed(0)} l${(8 + rc() * 10).toFixed(0)},${(10 + rc() * 8).toFixed(0)} l${(-12 + rc() * 6).toFixed(0)},${(8 + rc() * 6).toFixed(0)} l${(10 + rc() * 8).toFixed(0)},${(10 + rc() * 6).toFixed(0)}`;
    const cg = E('g', null, p6);
    const ck = E('path', { d, fill: 'none', stroke: C.red, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cg);
    const patch = E('rect', { x: x - 12, y: y - 4, width: 46, height: 40, rx: 6, fill: C.greenL, stroke: C.green, 'stroke-width': 3, transform: `rotate(${((rc() - 0.5) * 20).toFixed(1)} ${x + 11} ${y + 16})` }, cg);
    cracks.push({ ck, patch, tc: 0.12 + i * 0.035, tp: 0.55 + i * 0.03 });
  }
  X.each(t => {
    let nf = 0;
    cracks.forEach(c => {
      const shown = t > X.at(8, c.tc); if (shown) nf++;
      c.ck.style.display = shown ? '' : 'none';
      const pp = clamp((t - X.at(8, c.tp)) / 0.25);
      c.patch.style.display = pp > 0 ? '' : 'none';
      c.patch.setAttribute('opacity', pp.toFixed(2));
    });
    found = nf;
  });
  const cnt = X.text(870, 320, '', { parent: p6, anchor: 'end', size: 30, w: 700, fill: C.red });
  const cnt2 = X.text(870, 360, '', { parent: p6, anchor: 'end', size: 26, w: 600, fill: C.ink2 });
  X.each(t => {
    const n = cracks.filter(c => t > X.at(8, c.tc)).length, f = cracks.filter(c => t > X.at(8, c.tp)).length;
    cnt.set(n ? n + ' weaknesses' : '');
    cnt2.set(n ? 'found' : '');
    if (f) { cnt2.set(f + ' fixed'); }
  });
  const hammer = X.g(p6); const hIn = X.g(hammer);
  E('rect', { x: -6, y: -10, width: 12, height: 90, rx: 4, fill: C.ochre, stroke: C.ink, 'stroke-width': 3 }, hIn);
  E('rect', { x: -30, y: -30, width: 60, height: 26, rx: 5, fill: C.ink2, stroke: C.ink, 'stroke-width': 3 }, hIn);
  X.show(hammer, 8, { f: 0.08, type: 'fade', out: 8, outf: 0.55, outLen: 0.3 });
  X.each(t => { const sw = Math.sin(t * 9); tf(hIn, 760 + 20 * Math.sin(t * 1.3), 460, 1, 30 * sw); });
  const into = X.g(p6); X.chip(720, 530, 'every fix is part of Aran', { parent: into, size: 22, color: C.green, fill: C.greenL });
  X.show(into, 8, { f: 0.85, type: 'pop' });

  X.recap(9, ['Ask the right question, and build a baseline', 'Read the research, and measure the gaps', 'Fix each gap with maths, then attack it']);
});
