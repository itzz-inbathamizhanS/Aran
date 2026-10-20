// The plan: six parts as stops along a road; Ravi walks to each stop as it is spoken.
scene('plan', X => {
  const stops = [0, 1, 2, 3, 4, 5].map(i => 600 + i * 600);
  const roadY = x => 640 + 40 * Math.sin(x / 300);
  X.cam([
    { x: 1100, y: 610, s: 0.78 },
    ...stops.map((x, i) => ({ k: i + 1, x, y: 560, s: 1, len: 2 })),
    { k: 6, f: 0.45, x: 2100, y: 470, s: 0.5, len: 2 }
  ]);
  // road
  let d = ''; for (let x = -300; x <= 4000; x += 50) d += (d ? ' L' : 'M') + x + ',' + roadY(x).toFixed(1);
  const road = X.path(d, { color: C.sand, sw: 70 });
  X.show(road, 0, { type: 'draw', len: 2.5 });
  const edge = X.g(); E('path', { d, fill: 'none', stroke: C.card, 'stroke-width': 5, 'stroke-dasharray': '28 24' }, edge);
  X.show(edge, 0, { f: 0.5, type: 'fade', len: 1 });
  const head = X.text(330, 200, 'The plan', { size: 64, serif: true, anchor: 'middle', w: 600 });
  X.show(head, 0, { type: 'down', out: 2, outLen: 0.6 });
  const flag = X.g();
  E('line', { x1: 150, y1: roadY(150) - 10, x2: 150, y2: roadY(150) - 150, stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, flag);
  const cloth = E('path', { d: '', fill: C.green }, flag);
  X.text(150, roadY(150) + 70, 'start', { parent: flag, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(flag, 0, { f: 0.3, type: 'up' });
  X.each(t => { const w = 6 * Math.sin(t * 4); const y0 = roadY(150) - 150; cloth.setAttribute('d', `M150,${y0} Q185,${y0 + 8 + w} 220,${y0 + 4} L220,${y0 + 46} Q185,${y0 + 50 + w} 150,${y0 + 44} Z`); });

  // the six stops
  const parts = [
    ['The problem', 'how customer data leaks', ['bank', 'log', 'alert']],
    ['Basic words', 'one at a time, with examples', ['bulb', 'key', 'lock']],
    ['Why simple fails', 'and how the research was done', ['magnifier', 'file', 'brain']],
    ['How Aran works', 'step by step', ['shield', 'pipe', 'gear']],
    ['Built and tested', 'how it was made and checked', ['laptop', 'server', 'clock']],
    ['Results', 'weak spots and what comes next', ['file', 'alert', 'bulb']]
  ];
  parts.forEach(([title, sub, icons], i) => {
    const x = stops[i], k = i + 1, heart = i === 3;
    const g = X.g();
    E('rect', { x: x - 5, y: 420, width: 10, height: roadY(x) - 440, fill: C.ink2 }, g);
    X.rect(x - 220, 250, 440, 180, { parent: g, fill: heart ? C.ochreL : C.card, stroke: heart ? C.ochre : C.line, sw: heart ? 4 : 2, shadow: true, r: 16 });
    X.text(x, 296, 'PART ' + (i + 1), { parent: g, size: 24, anchor: 'middle', fill: C.ochre, w: 700, ls: 3 });
    X.text(x, 352, title, { parent: g, size: 44, anchor: 'middle', serif: true, w: 600 });
    X.text(x, 398, sub, { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(X.wrap(g), k, { f: 0.22, type: 'pop', len: 0.8 });
    const ring = X.circle(x, roadY(x), 20, { fill: C.card, stroke: C.ochre, sw: 4 });
    X.show(ring, 0, { f: 0.35 + i * 0.08, type: 'pop' });
    const num = X.text(x, roadY(x) + 62, String(i + 1), { size: 30, anchor: 'middle', fill: C.ochre, w: 700 });
    X.show(num, 0, { f: 0.4 + i * 0.08, type: 'up', out: k, outf: 0.3 });
    const dot = X.circle(x, roadY(x), 20, { fill: C.ochre, stroke: C.card, sw: 5 });
    X.show(dot, k, { f: 0.3, type: 'pop' });
    icons.forEach((nm, j) => {
      const ic = X.icon(nm, x - 140 + j * 140, 800, 0.55, { color: C.ink2 });
      X.show(ic, k, { f: 0.38 + j * 0.08, type: 'up' });
      X.bob(ic.mid, { amp: 5, per: 2.4, ph: i + j });
    });
    if (heart) {
      const hb = X.chip(x, 885, 'the heart of the video', { size: 24, color: C.ochre, fill: C.ochreL, stroke: C.ochre });
      X.show(hb, k, { f: 0.55, type: 'up' });
      X.pulse(g, x, 340, k, { f: 0.5, amt: 0.08, len: 1 });
    }
  });
  // overview title for the final pull-back
  const ov = X.text(2100, 30, 'Six parts, one road', { size: 110, anchor: 'middle', serif: true, w: 600 });
  X.show(ov, 6, { f: 0.55, type: 'down', len: 1 });

  // Ravi walks from stop to stop
  const rw = X.g();
  const ravi = X.person(0, 0, { parent: rw, shirt: C.blue, skin: C.skin[1], s: 0.85, name: 'Ravi' });
  const posAt = t => {
    let x = 80, moving = 0, ph = 0;
    for (let k = 1; k <= 6; k++) {
      const from = k === 1 ? 80 : stops[k - 2] - 95, to = stops[k - 1] - 95;
      const t0 = X.at(k, 0.02), t1 = X.at(k, 0.36);
      if (t >= t0) {
        const p = clamp((t - t0) / (t1 - t0));
        x = lerp(from, to, ease(p));
        if (p > 0 && p < 1) { moving = 1; ph = p * (to - from) / 55; }
      }
    }
    return [x, moving, ph];
  };
  X.show(ravi, 0, { f: 0.15, type: 'up' });
  X.each(t => {
    const [x, moving, ph] = posAt(t);
    const hop = moving ? -Math.abs(Math.sin(ph * Math.PI)) * 12 : 0;
    rw.setAttribute('transform', `translate(${x.toFixed(1)} ${(roadY(x) + 8 + hop).toFixed(1)})`);
    const sw = moving ? 28 * Math.sin(ph * Math.PI) : 0;
    if (moving) X.arms(ravi, 8 + sw, -8 - sw);
    else {
      // after arriving, point up at the sign
      let k = 0; for (let i = 1; i <= 6; i++) if (t > X.at(i, 0.36)) k = i;
      const a = k ? X.P(k, 0.36, 0, 0.5) * (1 - X.P(k, 0.8, 0, 0.5)) : 0;
      X.arms(ravi, 8, lerp(-8, 150, a));
    }
    ravi.mood(moving ? 'neutral' : 'happy');
  });
});
