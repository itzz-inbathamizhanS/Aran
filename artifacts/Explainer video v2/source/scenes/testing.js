// Testing honestly: three trays (Real, Generated, Simulated) filling as spoken,
// then a "run again, same numbers" loop and nineteen experiment cards flipping.
scene('testing', X => {
  const DY = 1100; // second area below
  X.cam([
    { x: 960, y: 560, s: 1.2 },
    { k: 0, f: 0.35, x: 960, y: 560, s: 1, len: 1.6 },
    { k: 1, x: 420, y: 620, s: 1.4 },
    { k: 2, x: 960, y: 620, s: 1.4 },
    { k: 3, x: 1500, y: 620, s: 1.4 },
    { k: 4, f: 0.6, x: 960, y: 560, s: 1, len: 1.6 },
    { k: 5, x: 960, y: 1420, s: 1, len: 1.8 },
    { k: 6, x: 960, y: 2000, s: 1, len: 1.6 }
  ]);
  const T = [
    { cx: 380, name: 'Real', col: C.green, fl: C.greenL, f: 0.4 },
    { cx: 960, name: 'Generated', col: C.blue, fl: C.blueL, f: 0.6 },
    { cx: 1540, name: 'Simulated', col: C.plum, fl: C.plumL, f: 0.8 }
  ];
  T.forEach(t => {
    const g = X.g();
    X.path(`M${t.cx - 250},560 L${t.cx - 250},860 Q${t.cx - 250},880 ${t.cx - 230},880 L${t.cx + 230},880 Q${t.cx + 250},880 ${t.cx + 250},860 L${t.cx + 250},560`, { parent: g, color: t.col, sw: 6, fill: t.fl }).p.style.strokeDasharray = 'none';
    X.chip(t.cx, 500, t.name, { parent: g, size: 34, color: t.col, fill: C.card, shadow: 4, width: 260 });
    X.show(g, 0, { f: t.f, type: 'pop' });
  });
  X.term(0, 'Simulated', 'Made by a computer program that copies\nhow the real thing behaves.', { f: 0.75, until: 1 });

  // an item card drawn around (0,0), dropping into a tray
  const drop = (k, f, x, y, w, h, build, col) => {
    const outer = X.g();
    const inner = X.g(outer);
    X.rect(-w / 2, -h / 2, w, h, { parent: inner, fill: C.card, stroke: col, sw: 3, r: 12, shadow: 4 });
    build(inner, w, h);
    X.show(outer, k, { f, type: 'down', dist: 260, len: 0.7 });
    inner.setAttribute('transform', `translate(${x} ${y})`);
    return inner;
  };
  // REAL
  const real = [
    ['log', 'Loghub logs', '32,000 lines, 16 systems', 0.08],
    ['person', 'Name collections', 'English, Hindi, Hinglish', 0.45],
    ['chat', 'Text messages', 'real public SMS', 0.75]
  ];
  real.forEach(([ic, h, s, f], i) => drop(1, f, 380, 615 + i * 92, 450, 80, g => {
    const icg = X.icon(ic, -185, 0, 0.4, { parent: g, color: C.green });
    X.bob(icg.mid, { amp: 3, per: 1.7, ph: i });
    X.text(-140, -6, h, { parent: g, size: 25, w: 700 });
    X.text(-140, 24, s, { parent: g, size: 22, fill: C.ink2 });
  }, C.green));
  const lines = X.text(250, 455, '', { size: 26, w: 700, fill: C.green });
  X.count(lines, 0, 32000, 1, { f0: 0.1, f1: 0.4, post: ' real log lines' });
  X.show(lines, 1, { f: 0.08, type: 'fade', out: 2 });
  X.term(1, 'Loghub', 'A free public collection of real log files\nfrom real computer systems.', { until: 2 });

  // GENERATED
  const gen = [['2345 6789 0124', 'Aadhaar'], ['7992 7398 713', 'card'], ['ABCPK1234L', 'PAN'], ['98765 43210', 'mobile'], ['482913', 'OTP'], ['ravi@oksbi', 'UPI']];
  gen.forEach(([v, lab], i) => {
    const x = i % 2 ? 1082 : 838, y = 600 + Math.floor(i / 2) * 76;
    drop(2, 0.05 + i * 0.07, x, y, 230, 64, g => {
      X.text(0, -4, v, { parent: g, size: 22, w: 600, mono: true, anchor: 'middle' });
      X.text(0, 22, lab, { parent: g, size: 22, fill: C.ink3, anchor: 'middle' });
    }, C.blue);
  });
  const rule = X.g();
  X.mark(738, 836, true, { parent: rule, s: 18 });
  X.text(762, 844, 'follows every rule', { parent: rule, size: 22, w: 600, fill: C.green });
  X.show(rule, 2, { f: 0.5, type: 'fade' });
  // the "belongs to no one" tag, swinging on a string
  const tagO = X.g(); const tag = X.g(tagO);
  X.line(0, -40, 0, 0, { parent: tag, color: C.ink2, sw: 3 });
  X.path('M-110,0 L90,0 L115,26 L90,52 L-110,52 Z', { parent: tag, color: C.ochre, sw: 3, fill: C.ochreL }).p.style.strokeDasharray = 'none';
  X.circle(96, 26, 6, { parent: tag, fill: C.card, stroke: C.ochre });
  X.text(-6, 34, 'belongs to no one', { parent: tag, size: 22, w: 700, anchor: 'middle', fill: C.ochre });
  X.show(tagO, 2, { f: 0.72, type: 'pop' });
  X.each(t => tag.setAttribute('transform', `translate(1150 ${820}) rotate(${(6 * Math.sin(t * 2.4)).toFixed(2)} 0 -40)`));
  X.term(2, 'Generated data', 'Made-up values that follow every real rule,\nbut belong to no real person.', { until: 3 });

  // SIMULATED: bank flows
  drop(3, 0.08, 1540, 645, 450, 140, (g, w) => {
    X.icon('bank', -160, -10, 0.45, { parent: g, color: C.plum });
    const nodes = [[-90, -40], [20, -18], [130, -44]];
    nodes.forEach(([x, y]) => X.circle(x, y, 15, { parent: g, fill: C.plumL, stroke: C.plum, sw: 3 }));
    const sp = X.spline([[-130, -18], [-90, -40], [20, -18], [130, -44], [190, -30]]);
    X.path(sp.d, { parent: g, color: C.plum, sw: 2, dash: '6 6' });
    X.stream(sp, { parent: g, n: 4, speed: 0.4, r: 6, color: C.plum, k0: 3 });
    X.text(-110, 26, 'Bank data flows', { parent: g, size: 25, w: 700 });
    X.text(-110, 54, 'no bank publishes them', { parent: g, size: 22, fill: C.ink2 });
  }, C.plum);
  X.term(3, 'Data flow', 'The path data takes from one system\nto another inside a bank.', { until: 4 });
  // SIMULATED: quantum attack
  drop(4, 0.05, 1540, 800, 450, 140, g => {
    const at = X.icon('atom', -160, -8, 0.6, { parent: g, color: C.plum });
    X.spin(at.mid, -160, -8, { speed: 60 });
    X.text(-90, -12, 'Quantum attack', { parent: g, size: 26, w: 700 });
    X.text(-90, 18, 'no big enough quantum', { parent: g, size: 22, fill: C.ink2 });
    X.text(-90, 44, 'computer exists yet', { parent: g, size: 22, fill: C.ink2 });
  }, C.plum);
  X.term(4, 'Quantum computer', 'A new kind of computer that could one day\nbreak some of today\'s locks.', { until: 5 });

  // ---------------- run again, same numbers ----------------
  const L = X.g();
  X.text(960, DY + 230, 'Anyone can run it again', { parent: L, size: 40, w: 700, anchor: 'middle', serif: true });
  X.icon('file', 520, DY + 380, 1.1, { parent: L, color: C.ink2 });
  X.text(520, DY + 392, '</>', { parent: L, size: 30, w: 700, anchor: 'middle', mono: true, fill: C.blue });
  X.text(520, DY + 480, 'script', { parent: L, size: 28, anchor: 'middle', fill: C.ink2 });
  const play = X.g(L);
  X.circle(880, DY + 380, 62, { parent: play, fill: C.greenL, stroke: C.green, sw: 5 });
  E('path', { d: `M862,${DY + 350} L908,${DY + 380} L862,${DY + 410} Z`, fill: C.green }, play);
  X.pulse(play, 880, DY + 380, [5], { f: 0.25, amt: 0.15 });
  X.text(880, DY + 480, 'run', { parent: L, size: 28, anchor: 'middle', fill: C.ink2 });
  X.rect(1170, DY + 300, 300, 160, { parent: L, fill: C.card, stroke: C.blue, sw: 4, r: 16, shadow: true });
  X.text(1320, DY + 345, 'result', { parent: L, size: 24, anchor: 'middle', fill: C.ink2 });
  X.text(1320, DY + 420, '91.0%', { parent: L, size: 60, w: 700, anchor: 'middle', serif: true, fill: C.blue });
  const runN = X.text(1320, DY + 500, '', { parent: L, size: 26, w: 600, anchor: 'middle', fill: C.green });
  X.arrow(600, DY + 380, 805, DY + 380, { parent: L, color: C.ink2 });
  X.arrow(955, DY + 380, 1160, DY + 380, { parent: L, color: C.ink2 });
  const loop = X.spline([[1320, DY + 470], [1320, DY + 570], [920, DY + 600], [520, DY + 560], [520, DY + 460]]);
  X.path(loop.d, { parent: L, color: C.ochre, sw: 4, dash: '10 8' });
  X.text(920, DY + 640, 'run again → same numbers', { parent: L, size: 30, w: 700, anchor: 'middle', fill: C.ochre });
  const ball = E('circle', { r: 13, fill: C.ochre }, L);
  X.each(t => {
    const u = (Math.max(0, t - X.at(5)) % 2.4) / 2.4;
    const [x, y] = loop.at(u);
    ball.setAttribute('cx', x.toFixed(1)); ball.setAttribute('cy', y.toFixed(1));
    runN.set('run ' + (1 + Math.floor(Math.max(0, t - X.at(5)) / 2.4)) + ': same');
  });
  X.show(L, 5, { type: 'fade', len: 0.8 });
  X.term(5, 'Script', 'A small program that does all the steps,\nthe same way every time.', { until: 6 });
  const anyone = X.person(220, DY + 620, { shirt: C.ink2, skin: C.skin[3], name: 'anyone', s: 0.9 });
  X.show(anyone, 5, { f: 0.2, type: 'right' });
  X.each(t => { if (X.t > X.at(5)) X.arms(anyone, 8, 70 + 15 * Math.sin(t * 3)); anyone.mood('happy'); });

  // ---------------- nineteen experiments ----------------
  const head = X.text(960, DY + 800, '', { size: 40, w: 700, anchor: 'middle', serif: true });
  const cards = [];
  for (let i = 0; i < 19; i++) {
    const row = i < 10 ? 0 : 1, col = row ? i - 10 : i;
    const n = row ? 9 : 10;
    const x = 960 + (col - (n - 1) / 2) * 162, y = DY + 960 + row * 210;
    const g = X.g();
    const back = X.g(g), front = X.g(g);
    X.rect(x - 70, y - 90, 140, 180, { parent: back, fill: C.ochreL, stroke: C.ochre, sw: 3, r: 14 });
    X.text(x, y + 14, '?', { parent: back, size: 44, w: 700, anchor: 'middle', fill: C.ochre, serif: true });
    X.rect(x - 70, y - 90, 140, 180, { parent: front, fill: C.card, stroke: C.blue, sw: 3, r: 14 });
    X.text(x, y + 12, 'E' + (i + 1), { parent: front, size: 44, w: 700, anchor: 'middle', serif: true, fill: C.blue });
    X.rect(x - 40, y + 46, 80, 10, { parent: front, fill: [C.green, C.blue, C.plum, C.ochre, C.teal][i % 5], stroke: 'none', r: 5 });
    cards.push({ g, back, front, x, y, f: 0.06 + i * 0.033 });
  }
  X.each(t => {
    head.set(X.t > X.at(6) ? 'Nineteen experiments, E1 to E19' : '');
    cards.forEach(c => {
      const u = X.L(6, c.f, c.f + 0.06);
      const sx = Math.abs(Math.cos(u * Math.PI));
      c.back.style.display = u < 0.5 ? '' : 'none';
      c.front.style.display = u < 0.5 ? 'none' : '';
      c.g.setAttribute('transform', `translate(${c.x} 0) scale(${sx.toFixed(3)} 1) translate(${-c.x} 0)`);
      c.g.style.opacity = X.t > X.at(5, 0.6) ? 1 : 0;
    });
  });
  X.term(6, 'Experiment', 'One careful test that answers\none clear question.', { until: 7 });

  X.recap(7, ['Real logs, names and messages', 'Made-up numbers that belong to no one', 'Every result can be checked again']);
});
