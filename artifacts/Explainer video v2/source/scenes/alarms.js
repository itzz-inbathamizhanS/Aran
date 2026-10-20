// False alarms and misses: a kitchen smoke alarm that rings for toast and sleeps through a fire,
// a leak that slips through, the annoyed cook who switches it off, and the 2 x 2 grid.
scene('alarms', X => {
  const tf = (el, x, y, s = 1, r = 0) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(1)})` : ''}`);
  const span = (k0, f0, k1, f1) => X.t >= X.at(k0, f0) && X.t < X.at(k1, f1);
  // small drawings around (0,0)
  const flame = (parent, s = 1) => {
    const g = E('g', null, parent);
    E('path', { d: `M${-30 * s},0 Q${-36 * s},${-44 * s} 0,${-96 * s} Q${36 * s},${-44 * s} ${30 * s},0 Z`, fill: C.red }, g);
    E('path', { d: `M${-16 * s},0 Q${-18 * s},${-26 * s} 0,${-54 * s} Q${18 * s},${-26 * s} ${16 * s},0 Z`, fill: C.ochre }, g);
    return g;
  };
  const toast = (parent, s = 1) => {
    const g = E('g', null, parent);
    E('path', { d: `M${-26 * s},${24 * s} L${-26 * s},${-10 * s} Q${-34 * s},${-34 * s} 0,${-34 * s} Q${34 * s},${-34 * s} ${26 * s},${-10 * s} L${26 * s},${24 * s} Z`, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 4 }, g);
    return g;
  };
  const miniAlarm = (parent, x, y, ringing) => {
    const g = E('g', null, parent);
    E('ellipse', { cx: x, cy: y, rx: 40, ry: 15, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, g);
    E('circle', { cx: x, cy: y + 2, r: 5, fill: ringing ? C.red : C.ink3 }, g);
    if (ringing) for (const sd of [-1, 1]) E('path', { d: `M${x + sd * 52},${y - 14} Q${x + sd * 64},${y} ${x + sd * 52},${y + 14}`, fill: 'none', stroke: C.red, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    return g;
  };

  X.cam([{ x: 960, y: 520, s: 1.08 },
    { k: 1, x: 960, y: 540, s: 1 },
    { k: 2, f: 0.15, x: 820, y: 500, s: 1.1 },
    { k: 3, x: 1060, y: 500, s: 1.1 },
    { k: 4, x: 2880, y: 540, s: 1, len: 1.5 },
    { k: 5, x: 4800, y: 540, s: 1, len: 1.5 },
    { k: 6, x: 960, y: 540, s: 1, len: 1.7 },
    { k: 6, f: 0.62, x: 1000, y: 500, s: 1.08 },
    { k: 7, x: 2880, y: 540, s: 1, len: 1.6 }]);

  // ================= cue 0: a detector, two kinds of mistakes =================
  const intro = X.g();
  const belt = spline([[260, 420], [1660, 420]]);
  X.path(belt.d, { parent: intro, color: C.line, sw: 30 });
  X.stream(belt, { n: 9, speed: 0.12, r: 11, colors: [C.blue, C.blue, C.red, C.blue, C.blue, C.blue, C.red, C.blue, C.blue], k0: 0, k1: 1, parent: intro });
  E('rect', { x: 900, y: 320, width: 120, height: 200, rx: 14, fill: C.sand, stroke: C.ink, 'stroke-width': 5, opacity: 0.92 }, intro);
  X.icon('magnifier', 965, 260, 0.7, { parent: intro });
  X.text(960, 580, 'detector', { parent: intro, anchor: 'middle', size: 32, serif: true, w: 600 });
  X.show(intro, 0, { type: 'fade', out: 1, outLen: 0.4 });
  ['mistake 1', 'mistake 2'].forEach((s, i) => {
    const c = X.g();
    X.rect(560 + i * 520, 650, 280, 150, { parent: c, fill: C.card, r: 18, shadow: true, dash: '8 8' });
    X.text(700 + i * 520, 712, s, { parent: c, anchor: 'middle', size: 30, w: 600, fill: C.ink2 });
    X.text(700 + i * 520, 772, '?', { parent: c, anchor: 'middle', size: 50, w: 700, fill: C.ochre });
    X.show(c, 0, { f: 0.45 + i * 0.15, type: 'pop', out: 1, outLen: 0.4 });
  });
  X.term(0, 'Detector', 'A program that looks at data and raises an alarm\nwhen it thinks it has found something.', { until: 1, f: 0.2 });

  // ================= the kitchen =================
  const kit = X.g();
  E('rect', { x: 160, y: 150, width: 1600, height: 740, rx: 10, fill: C.paper, stroke: C.line, 'stroke-width': 3 }, kit);
  E('rect', { x: 1380, y: 250, width: 300, height: 220, rx: 8, fill: C.blueL, stroke: C.ink2, 'stroke-width': 4 }, kit);
  E('line', { x1: 1530, y1: 250, x2: 1530, y2: 470, stroke: C.ink2, 'stroke-width': 4 }, kit);
  E('line', { x1: 1380, y1: 360, x2: 1680, y2: 360, stroke: C.ink2, 'stroke-width': 4 }, kit);
  E('rect', { x: 280, y: 640, width: 1060, height: 34, rx: 6, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, kit);
  E('rect', { x: 300, y: 674, width: 1020, height: 210, fill: C.card, stroke: C.ink2, 'stroke-width': 3 }, kit);
  for (let i = 0; i < 4; i++) { E('rect', { x: 316 + i * 252, y: 690, width: 236, height: 180, rx: 6, fill: 'none', stroke: C.line, 'stroke-width': 3 }, kit); E('rect', { x: 420 + i * 252, y: 712, width: 28, height: 8, rx: 4, fill: C.ink3 }, kit); }
  // toaster
  E('rect', { x: 430, y: 548, width: 190, height: 94, rx: 22, fill: C.card, stroke: C.ink, 'stroke-width': 5 }, kit);
  E('rect', { x: 470, y: 540, width: 46, height: 12, rx: 4, fill: C.ink }, kit);
  E('rect', { x: 534, y: 540, width: 46, height: 12, rx: 4, fill: C.ink }, kit);
  // stove and pan
  E('rect', { x: 960, y: 626, width: 300, height: 16, rx: 4, fill: C.ink }, kit);
  E('path', { d: 'M1010,596 L1190,596 L1176,626 L1024,626 Z', fill: C.ink2, stroke: C.ink, 'stroke-width': 4 }, kit);
  E('line', { x1: 1190, y1: 604, x2: 1280, y2: 590, stroke: C.ink, 'stroke-width': 10, 'stroke-linecap': 'round' }, kit);
  X.show(kit, 1, { type: 'fade', len: 0.6 });
  // toast that pops up
  const toastW = X.g(); const toastIn = X.g(toastW);
  const tA = toast(toastIn, 0.9); tA.setAttribute('transform', 'translate(493,540)');
  const tB = toast(toastIn, 0.9); tB.setAttribute('transform', 'translate(557,540)');
  X.show(toastW, 2, { type: 'fade', len: 0.2 });
  X.each(() => {
    const up = X.P(2, 0.05, 0, 0.3) * 20 + X.P(6, 0.02, 0, 0.3) * 0;
    toastIn.setAttribute('transform', `translate(0 ${(-up).toFixed(1)})`);
    const burnt = X.P(2, 0.1, 0, 1.5);
    for (const tt of [tA, tB]) tt.firstChild.setAttribute('fill', burnt > 0.5 ? C.sand : C.ochreL);
  });
  // smoke puffs: toast smoke (light) and fire smoke (dark)
  const puffs = (n, x0, y0, rise, color, seed, onFn) => {
    const g = X.g(); const r = rng(seed);
    const ps = [];
    for (let i = 0; i < n; i++) ps.push({ c: E('circle', { r: 20, fill: color }, g), ph: i / n, dx: (r() - 0.5) * 70, w: 0.5 + r() });
    X.each(t => {
      const amt = onFn(t);
      g.style.display = amt > 0.01 ? '' : 'none';
      if (amt <= 0.01) return;
      ps.forEach(p => {
        const u = ((t * 0.32) + p.ph) % 1;
        const x = x0 + p.dx * u + 18 * Math.sin(t * 1.3 + p.ph * 6), y = y0 - rise * u;
        p.c.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.6 + 1.6 * u * p.w).toFixed(3)})`);
        p.c.setAttribute('opacity', (amt * 0.55 * Math.min(1, u / 0.1, (1 - u) / 0.3)).toFixed(3));
      });
    });
    return g;
  };
  const toastOn = t => (span(2, 0.1, 3, 0) ? 1 : 0) + (span(6, 0, 6, 0.55) ? 1 : 0);
  puffs(8, 525, 520, 300, C.ink3, 5, toastOn);
  const fireOn = t => (span(3, 0.1, 4, 0) || span(6, 0.68, 7, 0)) ? 1 : 0;
  puffs(10, 1100, 520, 330, C.ink2, 9, fireOn);
  // flames in the pan
  const fl = X.g();
  const flames = [-50, 0, 50].map((dx, i) => { const g = flame(fl, i === 1 ? 1.1 : 0.8); return { g, dx, i }; });
  X.each(t => {
    const on = fireOn(t);
    fl.style.display = on ? '' : 'none';
    if (!on) return;
    const grow = Math.min(X.P(3, 0.1, 0, 0.8) * (t < X.at(4) ? 1 : 0) + X.P(6, 0.68, 0, 0.8) * (t >= X.at(6) ? 1 : 0), 1);
    flames.forEach(f => f.g.setAttribute('transform', `translate(${1100 + f.dx} 598) scale(${(grow * (0.9 + 0.12 * Math.sin(t * 13 + f.i * 2))).toFixed(3)} ${(grow * (0.85 + 0.2 * Math.sin(t * 17 + f.i))).toFixed(3)})`));
  });
  // the smoke alarm on the ceiling
  const alW = X.g(); const al = X.g(alW);
  E('rect', { x: 890, y: 150, width: 140, height: 18, rx: 4, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, al);
  E('path', { d: 'M900,168 L1020,168 Q1016,206 960,208 Q904,206 900,168 Z', fill: C.card, stroke: C.ink, 'stroke-width': 5 }, al);
  const led = E('circle', { cx: 960, cy: 190, r: 7, fill: C.green }, al);
  const waves = X.g(al);
  for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) E('path', { d: `M${960 + sd * (78 + j * 22)},${168} Q${960 + sd * (92 + j * 26)},${192} ${960 + sd * (78 + j * 22)},${216}`, fill: 'none', stroke: C.red, 'stroke-width': 5, 'stroke-linecap': 'round', 'data-j': j }, waves);
  const beep = X.text(960, 262, 'BEEP! BEEP!', { parent: al, anchor: 'middle', size: 34, w: 800, fill: C.red });
  const zz = X.text(1050, 240, 'z z z', { parent: al, size: 30, w: 700, fill: C.ink3, italic: true });
  X.show(alW, 1, { f: 0.1, type: 'down' });
  const ringing = t => span(2, 0.25, 3, 0) || (span(6, 0.0, 6, 0.5) && Math.sin((t - X.at(6)) * 4) > -0.3);
  const offNow = t => t >= X.at(6, 0.5);
  X.each(t => {
    const r = ringing(t);
    led.setAttribute('fill', offNow(t) ? C.ink3 : (r ? (Math.sin(t * 20) > 0 ? C.red : C.redL) : C.green));
    waves.style.display = r ? '' : 'none';
    if (r) [...waves.children].forEach(w => w.setAttribute('opacity', (0.4 + 0.6 * Math.max(0, Math.sin(t * 9 - (+w.getAttribute('data-j')) * 1.2))).toFixed(2)));
    beep.style.display = r ? '' : 'none';
    beep.setAttribute('transform', `translate(0 ${(3 * Math.sin(t * 25)).toFixed(1)})`);
    zz.style.display = (span(3, 0.2, 4, 0) || span(6, 0.7, 7, 0)) ? '' : 'none';
    zz.setAttribute('transform', `translate(${(6 * Math.sin(t * 2)).toFixed(1)} ${(-6 * ((t * 0.8) % 1)).toFixed(1)})`);
    al.setAttribute('transform', r ? `translate(${(4 * Math.sin(t * 50)).toFixed(1)} 0)` : '');
  });
  // labels under the alarm
  const lbl = (str, k, f, out, color, fill) => { const g = X.g(); X.chip(960, 330, str, { parent: g, size: 30, color, fill, shadow: true }); X.show(g, k, { f, type: 'pop', out, outLen: 0.3 }); return g; };
  lbl('false alarm', 2, 0.42, 3, C.ochre, C.ochreL);
  lbl('miss', 3, 0.42, 4, C.red, C.redL);
  lbl('switched off', 6, 0.55, 7, C.ink2, C.card);
  X.term(2, 'False positive', 'A false alarm: the detector rings,\nbut nothing was really wrong.', { f: 0.5, until: 3, color: C.ochre });
  X.term(3, 'False negative', 'A miss: something really was wrong,\nbut the detector stayed quiet.', { f: 0.5, until: 4, color: C.red });
  // the cook during the toast (annoyed, covers ears)
  const cook = X.person(760, 900, { shirt: C.green, skin: C.skin[2], s: 1.05, ph: 0.4 });
  X.show(cook, 2, { f: 0.05, type: 'left', out: 3, outLen: 0.4 });
  X.each(t => {
    const ears = X.P(2, 0.3, 0, 0.4);
    X.arms(cook, lerp(8, 160, ears), lerp(-8, 160, ears));
    cook.mood(t > X.at(2, 0.3) ? 'sad' : 'happy');
  });
  // the same cook later: walks under the alarm and switches it off
  const cook2 = X.person(700, 900, { shirt: C.green, skin: C.skin[2], s: 1.05, ph: 0.4 });
  X.show(cook2, 6, { f: 0.0, type: 'left' });
  const pole = E('g', null, cook2.armR);
  E('line', { x1: 1, y1: 40, x2: 1, y2: 540, stroke: C.ochre, 'stroke-width': 9, 'stroke-linecap': 'round' }, pole);
  E('rect', { x: -14, y: 530, width: 30, height: 16, rx: 4, fill: C.ink2 }, pole);
  X.each(t => {
    const walk = X.P(6, 0.18, 0, 1.2);
    const x = lerp(700, 960, walk);
    cook2.g.setAttribute('transform', `translate(${x.toFixed(1)} ${(900 - 6 * Math.abs(Math.sin(walk * Math.PI * 4))).toFixed(1)}) scale(1.05)`);
    const reach = X.P(6, 0.38, 0, 0.4) * (1 - X.P(6, 0.6, 0, 0.5));
    const cover = (1 - X.P(6, 0.15, 0, 0.3)) * (t > X.at(6) ? 1 : 0);
    X.arms(cook2, lerp(8, 160, cover), Math.max(lerp(-8, 160, cover), lerp(-8, 172, reach)));
    pole.style.display = reach > 0.25 ? '' : 'none';
    cook2.mood(t > X.at(6, 0.75) ? 'shock' : (t > X.at(6, 0.55) ? 'neutral' : 'sad'));
  });
  const offX = X.mark(1080, 185, false, { s: 30 });
  X.show(offX, 6, { f: 0.52, type: 'pop', out: 7 });
  const missAll = X.g();
  X.rect(1300, 520, 420, 100, { parent: missAll, fill: C.redL, stroke: C.red, r: 18, shadow: true });
  X.text(1510, 562, 'alarm off:', { parent: missAll, anchor: 'middle', size: 28, fill: C.red, w: 700 });
  X.text(1510, 600, 'every real fire is missed', { parent: missAll, anchor: 'middle', size: 28, fill: C.red, w: 700 });
  X.show(missAll, 6, { f: 0.78, type: 'right' });

  // ================= cue 4 + 7: the 2 x 2 grid =================
  const cols = [2480, 2900], rows = [425, 635];
  const hdr = X.g();
  miniAlarm(hdr, cols[0], 225, true); miniAlarm(hdr, cols[1], 225, false);
  X.text(cols[0], 300, 'alarm rings', { parent: hdr, anchor: 'middle', size: 30, w: 700 });
  X.text(cols[1], 300, 'alarm quiet', { parent: hdr, anchor: 'middle', size: 30, w: 700 });
  const fh = X.g(hdr); tf(flame(fh, 0.55), 2030, rows[0] + 22);
  const th = X.g(hdr); tf(toast(th, 1), 2030, rows[1] + 4);
  X.text(2255, rows[0] + 10, 'real fire', { parent: hdr, anchor: 'end', size: 30, w: 700 });
  X.text(2255, rows[1] + 10, 'no fire', { parent: hdr, anchor: 'end', size: 30, w: 700 });
  X.show(hdr, 4, { type: 'fade' });
  for (const cx of cols) for (const cy of rows) {
    const e = X.rect(cx - 200, cy - 95, 400, 190, { fill: 'none', stroke: C.line, dash: '10 10', r: 18 });
    X.show(e, 4, { f: 0.05, type: 'fade' });
  }
  const cell = (ci, ri, title, sub, ok, color, fill, k, f, iconFn) => {
    const g = X.g(); const inner = X.g(g);
    const x0 = cols[ci] - 200, y0 = rows[ri] - 95;
    X.rect(x0, y0, 400, 190, { parent: inner, fill, stroke: color, r: 18, sw: 3 });
    X.mark(x0 + 52, y0 + 95, ok, { parent: inner, s: 28 });
    X.text(x0 + 98, y0 + 92, title, { parent: inner, size: 32, w: 700, fill: color });
    X.text(x0 + 98, y0 + 130, sub, { parent: inner, size: 24, fill: C.ink2 });
    if (iconFn) { const ig = X.g(inner); tf(iconFn(ig), x0 + 345, y0 + 70); }
    X.show(g, k, { f, type: 'pop' });
    return inner;
  };
  const fa = cell(0, 1, 'false alarm', 'false positive', false, C.ochre, C.ochreL, 4, 0.12, g => toast(g, 0.9));
  const ms = cell(1, 0, 'miss', 'false negative', false, C.red, C.redL, 4, 0.3, g => flame(g, 0.5));
  X.pulse(fa, cols[0], rows[1], [4, 6], { f: 0.6, amt: 0.06 });
  X.pulse(ms, cols[1], rows[0], [4, 5], { f: 0.7, amt: 0.06 });
  cell(0, 0, 'caught it', 'correct', true, C.green, C.greenL, 7, 0.08);
  cell(1, 1, 'all quiet', 'correct', true, C.green, C.greenL, 7, 0.2);
  const both = X.text(2690, 840, 'both mistakes are bad', { anchor: 'middle', size: 32, serif: true, w: 600, fill: C.red });
  X.show(both, 4, { f: 0.5, type: 'up', out: 7, outLen: 0.4 });
  // meters for a good detector
  const meters = X.g();
  const base = 730, H = 380;
  [[3330, 0.99, C.green, 'nearly all', 'real leaks\ncaught'], [3600, 0.03, C.ochre, 'very rare', 'false\nalarms']].forEach(([x, v, col, top, lab], i) => {
    E('rect', { x: x - 60, y: base - H, width: 120, height: H, rx: 10, fill: C.sand }, meters);
    const r = E('rect', { x: x - 60, y: base, width: 120, height: 0, rx: 10, fill: col }, meters);
    const vt = X.text(x, base - H - 18, top, { parent: meters, anchor: 'middle', size: 28, w: 700, fill: col });
    X.text(x, base + 40, lab, { parent: meters, anchor: 'middle', size: 26, fill: C.ink2, w: 600 });
    X.each(() => { const p = ease(X.L(7, 0.35 + i * 0.2, 0.65 + i * 0.2)); const h = Math.max(4, H * v * p); r.setAttribute('y', base - h); r.setAttribute('height', h); vt.style.opacity = p; });
  });
  X.show(meters, 7, { f: 0.3, type: 'up' });
  const good = X.text(2690, 840, 'a good detector keeps both mistakes very low', { anchor: 'middle', size: 30, serif: true, w: 600, fill: C.green });
  X.show(good, 7, { f: 0.75, type: 'up' });

  // ================= cue 5: a miss lets a leak through =================
  const pipe = X.g();
  E('rect', { x: 3980, y: 490, width: 1640, height: 60, rx: 30, fill: C.blueL, stroke: C.ink2, 'stroke-width': 3 }, pipe);
  E('rect', { x: 4750, y: 400, width: 100, height: 240, rx: 14, fill: C.sand, stroke: C.ink, 'stroke-width': 5, opacity: 0.9 }, pipe);
  miniAlarm(pipe, 4800, 380, false);
  X.text(4800, 690, 'detector stays quiet', { parent: pipe, anchor: 'middle', size: 28, fill: C.ink2, w: 600 });
  X.text(4060, 460, 'data', { parent: pipe, anchor: 'middle', size: 28, fill: C.ink2, w: 600 });
  X.show(pipe, 5, { type: 'fade' });
  const pipeSp = spline([[3990, 520], [5610, 520]]);
  X.stream(pipeSp, { n: 8, speed: 0.25, r: 10, color: C.blue, k0: 5, k1: 6 });
  const leakW = X.g(); const leak = X.g(leakW);
  X.icon('envelope', 0, 0, 0.55, { parent: leak, fill: C.redL });
  X.show(leakW, 5, { f: 0.05, type: 'fade', len: 0.2 });
  const leakSp = spline([[3990, 520], [4800, 520], [5560, 520], [5640, 700]]);
  X.travel(leak, leakSp, 5, { f0: 0.05, f1: 0.85 });
  const thief = X.person(5680, 880, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.9 });
  X.show(thief, 5, { f: 0.2, type: 'right' });
  X.each(() => { X.arms(thief, lerp(8, 60, X.P(5, 0.6, 0, 0.4)), 8); thief.mood(X.t > X.at(5, 0.8) ? 'happy' : 'neutral'); });
  const missT = X.text(4800, 280, 'a miss: the real leak goes through', { anchor: 'middle', size: 38, serif: true, w: 600, fill: C.red });
  X.show(missT, 5, { f: 0.1, type: 'down' });

  X.recap(8, ['False positive: a false alarm', 'False negative: a miss', 'A good detector keeps both very low']);
});
