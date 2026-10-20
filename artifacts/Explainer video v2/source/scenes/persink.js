// The tweak: the destination's name is fed into FF1, so every destination gets its own token,
// like police marking banknotes with different stamps.
scene('persink', X => {
  const aad = '234567890124';
  const S = [
    { name: 'CRM', tw: 'crm', tok: '249826846187', icon: 'laptop', col: C.blue, colL: C.blueL, shape: 'circle' },
    { name: 'Loan vendor', tw: 'loan-vendor', tok: '098261586412', icon: 'building', col: C.plum, colL: C.plumL, shape: 'tri' },
    { name: 'Log platform', tw: 'log-platform', tok: '019638092692', icon: 'log', col: C.teal, colL: C.tealL, shape: 'star' }
  ];
  X.cam([{ x: 960, y: 470, s: 1.12 }, { k: 1, x: 960, y: 540, s: 1 }, { k: 2, x: 940, y: 540, s: 1 },
    { k: 3, x: 1000, y: 520, s: 1.03 }, { k: 4, x: 960, y: 540, s: 1 }, { k: 5, x: 960, y: 520, s: 1.05 },
    { k: 6, x: 960, y: 560, s: 1 }]);
  // a stamp mark (circle / triangle / star) centred at x,y
  const mark = (x, y, r, shape, col, parent) => {
    const g = X.g(parent);
    if (shape === 'circle') E('circle', { cx: x, cy: y, r, fill: col }, g);
    else if (shape === 'tri') E('path', { d: `M${x},${y - r * 1.1} L${x + r * 1.05},${y + r * 0.75} L${x - r * 1.05},${y + r * 0.75} Z`, fill: col }, g);
    else {
      let d = '';
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.1; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1); }
      E('path', { d: d + 'Z', fill: col }, g);
    }
    return g;
  };
  const gears = (parent, x1, y1, x2, y2, s1, s2) => {
    const a = X.icon('gear', x1, y1, s1, { parent }), b = X.icon('gear', x2, y2, s2, { parent, fill: C.ochreL });
    X.spin(a.mid, x1, y1, { speed: 70 }); X.spin(b.mid, x2, y2, { speed: -95 });
  };

  // ---------- Stage 1: the tweak dial on the FF1 machine (cues 0-1) ----------
  const A = X.g();
  X.show(A, 0, { type: 'fade', out: 2, outLen: 0.6 });
  X.text(420, 405, "Ravi's Aadhaar (made up)", { parent: A, size: 24, anchor: 'middle', fill: C.ink2 });
  X.digits(420, 420, aad, { groups: [4, 4, 4], cw: 34, ch: 50, size: 26, gap: 4, groupGap: 14, parent: A });
  X.arrow(675, 445, 770, 455, { parent: A, sw: 4 });
  const m = X.g(A);
  X.rect(780, 390, 360, 170, { parent: m, fill: C.tealL, stroke: C.teal, sw: 3, r: 24, shadow: true });
  X.text(960, 490, 'FF1', { parent: m, size: 56, serif: true, anchor: 'middle', w: 700, fill: C.teal });
  gears(m, 835, 430, 1090, 520, 0.38, 0.3);
  // dial
  const dial = X.g(A);
  E('line', { x1: 960, y1: 360, x2: 960, y2: 392, stroke: C.ink, 'stroke-width': 6 }, dial);
  X.circle(960, 318, 50, { parent: dial, fill: C.card, stroke: C.plum, sw: 5 });
  for (let i = 0; i < 3; i++) { const a = (-150 + i * 60) * Math.PI / 180; E('circle', { cx: 960 + 38 * Math.cos(a), cy: 318 + 38 * Math.sin(a), r: 5, fill: S[i].col }, dial); }
  const needle = E('line', { x1: 960, y1: 318, x2: 960, y2: 282, stroke: C.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, dial);
  E('circle', { cx: 960, cy: 318, r: 8, fill: C.ink }, dial);
  const tag = X.chip(960, 228, 'tweak', { size: 28, color: C.plum, fill: C.plumL, parent: A, width: 300 });
  X.show(X.wrap(dial), 0, { f: 0.15, type: 'pop' });
  X.show(tag, 0, { f: 0.2, type: 'down' });
  // key stays the same
  const key = X.icon('key', 960, 660, 0.75, { parent: A });
  X.arrow(960, 628, 960, 572, { parent: A, sw: 4, color: C.ochre });
  const same = X.chip(960, 735, 'same key every time', { size: 24, color: C.ochre, fill: C.ochreL, parent: A });
  X.show(same, 0, { f: 0.55, type: 'up' });
  X.bob(key.mid, { amp: 4, per: 2 });
  X.arrow(1150, 475, 1240, 455, { parent: A, sw: 4, color: C.teal });
  X.text(1500, 405, 'token', { parent: A, size: 24, anchor: 'middle', fill: C.teal });
  const out = X.digits(1500, 420, S[0].tok, { groups: [4, 4, 4], cw: 34, ch: 50, size: 26, gap: 4, groupGap: 14, parent: A, color: C.teal, stroke: C.teal });
  // destination icons used as tweak names (cue 1)
  const dests = S.map((s, i) => {
    const g = X.g(A);
    const x = 600 + i * 360;
    X.icon(s.icon, x, 845, 0.55, { parent: g });
    X.text(x, 912, s.name, { parent: g, size: 24, anchor: 'middle', w: 600 });
    X.show(g, 1, { f: 0.05 + i * 0.1, type: 'up' });
    return { g, x };
  });
  // which tweak is selected over time
  const sel = () => {
    if (X.t < X.at(0, 0.35)) return -1;
    if (X.t < X.at(1)) return Math.min(2, Math.floor(X.L(0, 0.35, 0.95) * 3));
    return Math.min(2, Math.floor(X.L(1, 0.3, 0.95) * 3));
  };
  X.each(t => {
    const i = sel();
    const ang = i < 0 ? 0 : -60 + i * 60;
    const wob = i < 0 ? 18 * Math.sin(t * 2) : 0;
    needle.setAttribute('transform', `rotate(${ang + wob} 960 318)`);
    const named = X.t >= X.at(1, 0.3);
    tag.t.set(i < 0 ? 'tweak' : named ? 'tweak: ' + S[i].tw : 'tweak ' + (i + 1));
    out.set(S[Math.max(0, i)].tok);
    for (let j = 0; j < 12; j++) out.paint(j, i < 0 ? C.card : S[i].colL, i < 0 ? C.teal : S[i].col);
    dests.forEach((d, j) => { d.g.style.opacity = !named ? '' : (j === i ? 1 : 0.35); d.g.firstChild.setAttribute('transform', named && j === i ? `translate(0 ${(-8 * Math.abs(Math.sin(t * 4))).toFixed(1)})` : ''); });
  });
  X.term(0, 'Tweak', 'An extra label fed into FF1. Change the label\nand the result changes, with the same key.', { until: 1 });
  X.term(1, 'Destination', 'A place the data is sent to: a staff screen,\nan outside company, a log file...', { until: 2 });

  // ---------- Stage 2: one customer, three tokens (cues 2-4) ----------
  const B = X.g();
  X.show(B, 2, { type: 'fade', out: 5, outLen: 0.6 });
  const ravi = X.person(150, 860, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 0.95 });
  B.appendChild(ravi);
  X.each(() => { ravi.mood(X.t > X.at(4, 0.3) ? 'happy' : 'neutral'); });
  X.point(ravi, 3, 70, { f: 0.05, until: 4 });
  const card = X.g(B);
  X.rect(270, 395, 450, 150, { parent: card, fill: C.card, r: 16, shadow: true });
  X.text(292, 432, "Ravi's Aadhaar (made up)", { parent: card, size: 23, fill: C.ink2 });
  X.digits(495, 455, aad, { groups: [4, 4, 4], cw: 30, ch: 46, size: 24, gap: 3, groupGap: 12, parent: card });
  X.show(card, 3, { type: 'up' });
  const m2 = X.g(B);
  X.rect(770, 420, 170, 120, { parent: m2, fill: C.tealL, stroke: C.teal, sw: 3, r: 18, shadow: true });
  X.text(855, 495, 'FF1', { parent: m2, size: 40, serif: true, anchor: 'middle', w: 700, fill: C.teal });
  const tagB = X.chip(855, 380, 'tweak', { size: 22, color: C.plum, fill: C.plumL, parent: m2, width: 190 });
  X.show(m2, 2, { type: 'pop' });
  const a0 = X.arrow(725, 470, 762, 475, { parent: B, sw: 4 }); X.show(a0, 3, { f: 0.15, type: 'draw' });
  const rows = S.map((s, i) => {
    const yc = 253 + i * 220;
    const g = X.g(B);
    const sp = spline([[945, 480], [975, lerp(480, yc, 0.6)], [1005, yc]]);
    const ln = X.path(sp.d, { parent: g, color: s.col, sw: 4 });
    X.show(ln, 3, { f: 0.3 + i * 0.17, type: 'draw', len: 0.5 });
    const d = X.digits(1012, yc - 23, '            ', { groups: [4, 4, 4], cw: 30, ch: 46, size: 24, gap: 3, groupGap: 12, anchor: 'start', parent: g, color: s.col, stroke: s.col });
    X.show(d, 2, { f: 0.2 + i * 0.12, type: 'left' });
    const mk = mark(1455, yc, 15, s.shape, s.col, g);
    X.show(mk, 3, { f: 0.45 + i * 0.17, type: 'pop' });
    const dest = X.g(g);
    X.icon(s.icon, 1625, yc - 8, 0.55, { parent: dest });
    X.text(1625, yc + 62, s.name, { parent: dest, size: 24, anchor: 'middle', w: 600 });
    X.show(dest, 2, { f: 0.25 + i * 0.15, type: 'right' });
    // a copy flowing to its destination
    X.stream(spline([[1480, yc], [1530, yc - 18], [1572, yc - 8]]), { n: 2, speed: 0.7, r: 7, color: s.col, k0: 3, f0: 0.55 + i * 0.12, k1: 5 });
    const cross = X.mark(1455, yc + 48, false, { parent: g, s: 18 });
    X.show(cross, 4, { f: 0.05 + i * 0.08, type: 'pop' });
    const safe = X.g(g);
    X.icon('shield', 1770, yc - 10, 0.45, { parent: safe, fill: C.greenL, color: C.green, check: true });
    X.text(1770, yc + 50, 'safe', { parent: safe, size: 24, anchor: 'middle', w: 700, fill: C.green });
    X.show(safe, 4, { f: 0.3 + i * 0.08, type: 'pop' });
    X.each(() => {
      const n = Math.round(X.L(3, 0.35 + i * 0.17, 0.55 + i * 0.17) * 12);
      d.set(s.tok.slice(0, n).padEnd(12, n ? ' ' : '?'));
      if (X.t < X.at(3, 0.3)) d.set('????????????');
      const hi = X.t > X.at(4, 0.7);
      for (let j = 0; j < 12; j++) d.paint(j, hi ? s.colL : C.card);
    });
    return { d, yc };
  });
  X.each(() => {
    let i = Math.floor(X.L(3, 0.3, 0.81) * 3);
    if (X.t < X.at(3, 0.3)) i = -1;
    tagB.t.set(i < 0 ? 'tweak' : X.t > X.at(4) ? 'tweak' : S[Math.min(2, i)].tw);
  });
  const failT = X.g(B);
  X.rect(1080, 840, 700, 70, { parent: failT, fill: C.card, r: 35, shadow: true });
  X.text(1430, 885, 'all three fail the check, all safe, all different', { parent: failT, size: 26, anchor: 'middle', w: 600 });
  X.show(failT, 4, { f: 0.45, type: 'up' });

  // ---------- Stage 3: marked banknotes (cues 5-6) ----------
  const N = X.g();
  X.show(N, 5, { type: 'fade', len: 0.6 });
  const cop = X.person(230, 840, { shirt: C.ochre, skin: C.skin[2], badge: true, s: 0.95, name: 'Police officer' });
  N.appendChild(cop);
  E('path', { d: 'M-36,-226 Q-34,-262 0,-262 Q34,-262 36,-226 Z', fill: C.blue }, cop.body);
  E('rect', { x: -44, y: -232, width: 88, height: 10, rx: 5, fill: C.ink }, cop.body);
  X.each(() => {
    if (X.t < X.at(5)) return;
    const u = X.L(5, 0.2, 0.85);
    X.arms(cop, 8, lerp(-8, 85, clamp(u * 5)) + 6 * Math.sin(X.t * 6) * (u > 0 && u < 1 ? 1 : 0));
    cop.mood(X.t > X.at(5, 0.9) ? 'happy' : 'neutral');
  });
  X.rect(380, 520, 1440, 26, { parent: N, fill: C.sand, stroke: C.line, r: 8 });
  const notes = S.map((s, i) => {
    const cx = 640 + i * 420, cy = 410;
    const g = X.g(N);
    X.rect(cx - 150, cy - 85, 300, 170, { parent: g, fill: C.greenL, stroke: C.green, sw: 3, r: 10, shadow: true });
    E('rect', { x: cx - 136, y: cy - 71, width: 272, height: 142, rx: 6, fill: 'none', stroke: C.green, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, g);
    E('circle', { cx: cx - 80, cy, r: 38, fill: 'none', stroke: C.green, 'stroke-width': 3, opacity: 0.5 }, g);
    X.text(cx + 30, cy + 16, '₹500', { parent: g, size: 48, serif: true, anchor: 'middle', w: 700, fill: C.green });
    X.show(g, 5, { f: 0.05 + i * 0.07, type: 'down' });
    const mk = mark(cx + 108, cy - 46, 20, s.shape, s.col, g);
    X.show(mk, 5, { f: 0.35 + i * 0.213, type: 'pop', len: 0.4 });
    return { cx, cy, mk };
  });
  // the stamp moving from note to note
  const stamp = X.g(N);
  E('rect', { x: -12, y: -90, width: 24, height: 56, rx: 8, fill: C.ink2 }, stamp);
  E('circle', { cx: 0, cy: -96, r: 18, fill: C.ink }, stamp);
  E('rect', { x: -32, y: -36, width: 64, height: 30, rx: 6, fill: C.ink }, stamp);
  const stampW = X.wrap(stamp);
  X.show(stampW, 5, { f: 0.15, type: 'fade', out: 6, outLen: 0.4 });
  X.each(() => {
    const u = X.L(5, 0.2, 0.84) * 3;
    const i = Math.min(2, Math.floor(u)), ph = u - Math.floor(u);
    const x0 = i === 0 ? 420 : notes[i - 1].cx + 108, x1 = notes[i].cx + 108;
    const x = lerp(x0, x1, ease(clamp(ph / 0.5)));
    const press = ph > 0.5 ? Math.sin(clamp((ph - 0.5) / 0.4) * Math.PI) : 0;
    const y = notes[i].cy - 46 - 40 + 34 * press - (1 - press) * 30;
    stamp.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  });
  const lens = X.icon('magnifier', 1130, 330, 0.7, { parent: N });
  X.show(lens, 5, { f: 0.88, type: 'pop', out: 6, outLen: 0.4 });
  X.bob(lens.mid, { amp: 6, per: 1.4 });
  const recog = X.chip(1060, 230, 'recognised later by the mark', { size: 24, color: C.ink, parent: N });
  X.show(recog, 5, { f: 0.9, type: 'down', out: 6, outLen: 0.4 });
  // Aran does the same: each destination gets its marked token
  S.forEach((s, i) => {
    const cx = notes[i].cx;
    const g = X.g(N);
    const ar = X.arrow(cx, 600, cx, 650, { parent: g, sw: 4, color: s.col });
    X.icon(s.icon, cx - 120, 735, 0.5, { parent: g });
    X.text(cx - 120, 800, s.name, { parent: g, size: 22, anchor: 'middle', w: 600 });
    X.rect(cx - 50, 700, 210, 70, { parent: g, fill: s.colL, stroke: s.col, r: 12 });
    X.text(cx + 55, 732, s.tok.slice(0, 4) + ' ' + s.tok.slice(4, 8), { parent: g, size: 22, mono: true, anchor: 'middle', w: 600, fill: s.col });
    X.text(cx + 55, 758, s.tok.slice(8) + ' ', { parent: g, size: 22, mono: true, anchor: 'middle', w: 600, fill: s.col });
    mark(cx + 140, 700, 13, s.shape, s.col, g);
    X.show(g, 6, { f: 0.1 + i * 0.18, type: 'up' });
  });
  const own = X.chip(1100, 880, 'each destination: its own marked copy', { size: 28, color: C.ink, fill: C.card, shadow: true });
  X.show(own, 6, { f: 0.6, type: 'up' });

  X.recap(7, ['Each destination gets its own token', 'Same customer, a different token everywhere', 'Like marked banknotes']);
});
