// Closing: the fortress and shield close around the customers; title, team and thanks.
scene('close', X => {
  X.cam([
    { x: 960, y: 520, s: 1.3 },
    { k: 0, f: 0.55, x: 960, y: 500, s: 1.12, len: 2.2 },
    { k: 1, x: 960, y: 520, s: 1, len: 1.8 },
    { k: 3, x: 960, y: 540, s: 0.97, len: 3 }
  ]);

  // ground
  const ground = X.line(120, 702, 1800, 702, { color: C.line, sw: 4 });
  X.show(ground, 0, { type: 'fade' });

  // fortress towers with waving flags
  [[430, C.teal], [1490, C.ochre]].forEach(([x, fc], i) => {
    const tw = X.g();
    const inner = E('g', null, tw);
    E('path', { d: `M${x - 62},700 L${x - 62},420 L${x - 62},392 L${x - 36},392 L${x - 36},410 L${x - 13},410 L${x - 13},392 L${x + 13},392 L${x + 13},410 L${x + 36},410 L${x + 36},392 L${x + 62},392 L${x + 62},700 Z`, fill: C.sand, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, inner);
    for (const yy of [470, 540]) E('rect', { x: x - 8, y: yy, width: 16, height: 34, rx: 8, fill: C.ink2 }, inner);
    E('path', { d: `M${x - 30},700 L${x - 30},632 Q${x - 30},604 ${x},604 Q${x + 30},604 ${x + 30},632 L${x + 30},700 Z`, fill: C.ink2 }, inner);
    E('line', { x1: x, y1: 392, x2: x, y2: 320, stroke: C.ink, 'stroke-width': 4 }, inner);
    const flag = E('path', { fill: fc, stroke: C.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, inner);
    X.each(t => {
      const w = 6 * Math.sin(t * 3 + i), w2 = 6 * Math.sin(t * 3 + i + 1.5);
      flag.setAttribute('d', `M${x},322 Q${x + 25},${322 + w} ${x + 50},${324 + w2} L${x + 50},${352 + w2} Q${x + 25},${350 + w} ${x},352 Z`);
      const p = X.P(0, 0.05 + i * 0.05, 0, 1.0);
      inner.setAttribute('transform', `translate(0 700) scale(1 ${Math.max(0.01, p).toFixed(3)}) translate(0 -700)`);
    });
    X.show(tw, 0, { f: 0.05 + i * 0.05, type: 'fade', len: 0.4 });
  });

  // "Aran" means fortress
  const mean = X.g();
  X.text(960, 205, 'அரண்  =  fortress', { parent: mean, size: 56, anchor: 'middle', w: 700, family: F.sans });
  X.show(mean, 0, { f: 0.02, type: 'down', out: 1, outLen: 0.5 });

  // the bank's work keeps flowing through the gates
  X.stream(X.spline([[60, 668], [960, 668], [1860, 668]]), { n: 14, speed: 0.07, r: 9, colors: [C.blue, C.teal, C.blue, C.ochre], k0: 0, f0: 0.28 });

  // shield closing around the customers
  const shD = 'M960,262 L1330,330 L1330,500 Q1330,640 960,712 Q590,640 590,500 L590,330 Z';
  const fill = X.path(shD, { color: 'none', fill: C.tealL });
  fill.p.style.strokeDasharray = 'none';
  X.show(fill, 0, { f: 0.7, type: 'fade', len: 1.2, op: 0.55 });
  const sh = X.path(shD, { color: C.teal, sw: 7 });
  X.show(sh, 0, { f: 0.55, type: 'draw', len: 1.6 });
  // a gentle ring that breathes outward from the shield
  const ring = X.g(); const ringP = E('path', { d: shD, fill: 'none', stroke: C.teal, 'stroke-width': 3 }, ring);
  X.each(t => {
    const on = t > X.at(0, 0.8);
    const p = ((t - X.at(0, 0.8)) / 3.2) % 1;
    ring.style.display = on ? '' : 'none';
    if (!on) return;
    const s = 1 + 0.12 * p;
    ring.setAttribute('transform', `translate(960 487) scale(${s.toFixed(4)}) translate(-960 -487)`);
    ringP.setAttribute('opacity', (0.6 * (1 - p)).toFixed(3));
  });

  // the customers
  const shirts = [C.blue, C.plum, C.ochre, C.teal, C.red, C.green, C.ink2];
  const ppl = shirts.map((sh2, i) => {
    const x = 690 + i * 90;
    const p = X.person(x, 615, { shirt: sh2, skin: C.skin[i % 4], long: i === 1 || i === 4, glasses: i === 5, s: 0.5, ph: i * 0.9 });
    X.show(p, 0, { f: 0.02 + i * 0.03, type: 'up' });
    return p;
  });
  X.each(() => ppl.forEach(p => { p.mood(X.t > X.at(0, 0.7) ? 'happy' : 'neutral'); X.arms(p, 8, -8); }));
  X.wave(ppl[0], 1, { f: 0.1, len: 2 });
  X.wave(ppl[3], 3, { f: 0, len: 2.4 });
  X.wave(ppl[6], 2, { f: 0.5, len: 2.2 });

  // title, team, thanks
  const title = X.text(960, 210, 'Aran: protection you can prove', { size: 76, serif: true, w: 600, anchor: 'middle' });
  X.show(title, 1, { type: 'up', len: 1 });
  const ul = X.path('M720,240 L1200,240', { color: C.ochre, sw: 5 });
  X.show(ul, 1, { f: 0.3, type: 'draw', len: 1 });
  const team = X.g();
  X.text(960, 774, 'Built by', { parent: team, size: 24, anchor: 'middle', fill: C.ink3 });
  X.text(960, 818, 'Inbathamizhan S  ·  Aasif Ahmed A  ·  SN Arun Vijay  ·  Bharadhwaj M', { parent: team, size: 32, anchor: 'middle', w: 600 });
  X.text(960, 862, 'at KARE', { parent: team, size: 28, anchor: 'middle', w: 700, fill: C.ochre });
  X.show(team, 2, { type: 'up', len: 1 });
  const ty = X.text(960, 922, 'Thank you for watching', { size: 44, serif: true, italic: true, w: 500, anchor: 'middle', fill: C.teal });
  X.show(ty, 3, { type: 'fade', len: 1.4 });
});
