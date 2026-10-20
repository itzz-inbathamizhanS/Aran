// How sure are we? A 0-100% scale, the weather forecaster with 7 rainy days out of 10, a track record that matches
// (calibration), and a needle that moves with new evidence: dark clouds up, clear sky down, then Aran's own guesses.
scene('probability', X => {
  const tf = (el, x, y, s = 1, r = 0) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(1)})` : ''}`);
  // a cloud with falling rain drawn into parent at (x, y)
  const rainCloud = (parent, x, y, s, dark, seed) => {
    const g = E('g', null, parent);
    const drops = E('g', null, g);
    const ds = [-30, -5, 20, 42].map(dx => E('line', { x1: 0, y1: 0, x2: -4 * s, y2: 16 * s, stroke: C.blue, 'stroke-width': 4 * Math.max(0.7, s), 'stroke-linecap': 'round', 'data-dx': dx }, drops));
    X.icon('cloud', x, y, s, { parent: g, fill: dark ? C.ink3 : C.blueL });
    X.each(t => ds.forEach((d, i) => {
      const u = ((t * 1.3) + i * 0.27 + seed * 0.13) % 1;
      d.setAttribute('transform', `translate(${(x + (+d.getAttribute('data-dx')) * s - 4 * s * u).toFixed(1)} ${(y + 30 * s + 50 * s * u).toFixed(1)})`);
      d.setAttribute('opacity', Math.min(1, (1 - u) / 0.3).toFixed(2));
    }));
    return g;
  };
  const sun = (parent, x, y, s) => {
    const g = E('g', null, parent); const rays = E('g', null, g);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; E('line', { x1: x + 46 * s * Math.cos(a), y1: y + 46 * s * Math.sin(a), x2: x + 64 * s * Math.cos(a), y2: y + 64 * s * Math.sin(a), stroke: C.ochre, 'stroke-width': 6 * s, 'stroke-linecap': 'round' }, rays); }
    E('circle', { cx: x, cy: y, r: 34 * s, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 5 * s }, g);
    X.spin(rays, x, y, { speed: 14 });
    return g;
  };
  // semicircle gauge: returns { g, set(p, label) }
  const gauge = (cx, cy, r, o = {}) => {
    const g = X.g();
    const pt = p => [cx + r * Math.cos(Math.PI + p * Math.PI), cy + r * Math.sin(Math.PI + p * Math.PI)];
    const [x0, y0] = pt(0), [x1, y1] = pt(1);
    E('path', { d: `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`, fill: 'none', stroke: C.sand, 'stroke-width': 34, 'stroke-linecap': 'round' }, g);
    const fill = E('path', { d: '', fill: 'none', stroke: o.color || C.blue, 'stroke-width': 34, 'stroke-linecap': 'round' }, g);
    for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; E('line', { x1: cx + (r - 30) * Math.cos(a), y1: cy + (r - 30) * Math.sin(a), x2: cx + (r - 44) * Math.cos(a), y2: cy + (r - 44) * Math.sin(a), stroke: C.ink3, 'stroke-width': 3 }, g); }
    const needle = E('g', null, g);
    E('path', { d: `M${cx - 10},${cy} L${cx},${cy - r + 52} L${cx + 10},${cy} Z`, fill: C.ink }, needle);
    E('circle', { cx, cy, r: 16, fill: C.ink }, g);
    X.text(x0, cy + 46, o.lo || '0%', { parent: g, anchor: 'middle', size: 26, fill: C.ink2, w: 600 });
    X.text(x1, cy + 46, o.hi || '100%', { parent: g, anchor: 'middle', size: 26, fill: C.ink2, w: 600 });
    const val = X.text(cx, cy + 90, '', { parent: g, anchor: 'middle', size: o.valSize || 54, w: 700, serif: true });
    const set = (p, label) => {
      p = clamp(p);
      const [ex, ey] = pt(Math.max(0.002, p));
      fill.setAttribute('d', `M${x0},${y0} A${r},${r} 0 0 1 ${ex.toFixed(1)},${ey.toFixed(1)}`);
      needle.setAttribute('transform', `rotate(${(-90 + p * 180).toFixed(2)} ${cx} ${cy})`);
      val.set(label != null ? label : Math.round(p * 100) + '%');
    };
    return { g, set, val };
  };

  X.cam([{ x: 960, y: 500, s: 1.1 },
    { k: 1, x: 960, y: 540, s: 1 },
    { k: 2, x: 2880, y: 540, s: 1, len: 1.6 },
    { k: 3, x: 4800, y: 540, s: 1, len: 1.5 },
    { k: 4, x: 4800, y: 520, s: 1.04 },
    { k: 5, x: 6720, y: 540, s: 1, len: 1.5 },
    { k: 7, x: 8640, y: 540, s: 1, len: 1.5 }]);

  // ================= cue 0: how sure is Aran? =================
  const line = 'INFO request from user ravi, id 2345 6789 0124, status ok';
  const logG = X.g();
  X.rect(250, 210, 1420, 90, { parent: logG, fill: C.card, r: 14, shadow: true });
  const cw = 30 * 0.602, lx = 280, i0 = line.indexOf('2345');
  E('rect', { x: lx + i0 * cw - 6, y: 228, width: 14 * cw + 12, height: 54, rx: 8, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 3 }, logG);
  X.text(lx, 266, line, { parent: logG, size: 30, mono: true, w: 500 });
  X.show(logG, 0, { type: 'down' });
  const aran = X.g();
  const sh = X.icon('shield', 470, 520, 1.3, { parent: aran, check: true });
  X.text(470, 640, 'Aran', { parent: aran, anchor: 'middle', size: 34, serif: true, w: 600 });
  X.show(aran, 0, { f: 0.15, type: 'pop' });
  X.bob(sh.mid, { amp: 6, per: 2.4 });
  const bub = X.g();
  X.rect(660, 420, 760, 160, { parent: bub, fill: C.card, r: 24, shadow: true });
  E('path', { d: 'M664,520 L600,560 L670,480 Z', fill: C.card, stroke: C.line, 'stroke-width': 2 }, bub);
  X.text(1040, 488, 'Is this an Aadhaar number?', { parent: bub, anchor: 'middle', size: 34, w: 600 });
  X.text(1040, 545, 'How sure am I?', { parent: bub, anchor: 'middle', size: 34, w: 700, fill: C.ochre });
  X.show(bub, 0, { f: 0.3, type: 'pop' });
  const ptr = X.arrow(lx + (i0 + 7) * cw, 360, lx + (i0 + 7) * cw, 312, { color: C.ochre, sw: 5 });
  X.show(ptr, 0, { f: 0.1, type: 'draw' });
  X.term(0, 'Probability', 'A number from 0% to 100% that says\nhow likely something is.', { f: 0.6, until: 2 });

  // ================= cue 1: the 0..100% scale =================
  const scale = X.g();
  E('rect', { x: 360, y: 752, width: 1200, height: 18, rx: 9, fill: C.sand }, scale);
  [[0, '0%', 'impossible'], [0.5, '50%', 'coin toss'], [1, '100%', 'certain']].forEach(([p, a, b]) => {
    const x = 360 + p * 1200;
    E('line', { x1: x, y1: 740, x2: x, y2: 782, stroke: C.ink2, 'stroke-width': 4 }, scale);
    X.text(x, 822, a, { parent: scale, anchor: 'middle', size: 30, w: 700 });
    X.text(x, 858, b, { parent: scale, anchor: 'middle', size: 24, fill: C.ink2 });
  });
  const fillBar = E('rect', { x: 360, y: 752, width: 0, height: 18, rx: 9, fill: C.blue }, scale);
  const mk = E('g', null, scale);
  E('path', { d: 'M-18,-34 L18,-34 L0,-6 Z', fill: C.ink }, mk);
  const mkT = X.text(0, -48, '', { parent: mk, anchor: 'middle', size: 30, w: 700, fill: C.blue });
  X.show(scale, 1, { type: 'up' });
  X.each(() => {
    const a = ease(X.L(1, 0.15, 0.45)), b = ease(X.L(1, 0.5, 0.8));
    const p = a * (1 - b) + 0.5 * b;
    const x = 360 + p * 1200;
    mk.setAttribute('transform', `translate(${x.toFixed(1)} 752)`);
    fillBar.setAttribute('width', (p * 1200).toFixed(1));
    mkT.set(Math.round(p * 100) + '%');
  });

  // ================= cue 2: the weather forecast =================
  const fc = X.person(2130, 540, { shirt: C.blue, skin: C.skin[1], tie: C.red, s: 0.95, name: 'Forecaster', ph: 0.5 });
  X.show(fc, 2, { type: 'left' });
  X.point(fc, 2, 70, { f: 0.1 });
  X.talk(fc, [2, 3]);
  const board = X.g();
  X.rect(2260, 170, 700, 350, { parent: board, fill: C.card, r: 22, shadow: true });
  X.text(2300, 228, 'Tomorrow', { parent: board, size: 32, serif: true, w: 600, fill: C.ink2 });
  rainCloud(board, 2440, 370, 1.25, false, 0);
  X.text(2800, 410, '70%', { parent: board, anchor: 'middle', size: 120, serif: true, w: 700, fill: C.blue });
  X.text(2800, 470, 'chance of rain', { parent: board, anchor: 'middle', size: 30, fill: C.ink2, w: 600 });
  X.show(board, 2, { f: 0.05, type: 'pop' });
  const rainy = [1, 1, 0, 1, 1, 1, 0, 1, 0, 1];
  const tiles = [];
  rainy.forEach((r, i) => {
    const x0 = 2240 + i * 152, g = X.g();
    const box = X.rect(x0, 600, 136, 170, { parent: g, fill: C.card, r: 14 });
    X.text(x0 + 68, 636, 'day ' + (i + 1), { parent: g, anchor: 'middle', size: 22, fill: C.ink2, w: 600 });
    if (r) rainCloud(g, x0 + 68, 690, 0.6, false, i);
    else { rainCloud(g, x0 + 54, 702, 0.45, false, i).style.display = 'none'; sun(g, x0 + 68, 700, 0.6); }
    X.show(g, 2, { f: 0.42 + i * 0.035, type: 'up' });
    tiles.push({ box, r });
  });
  X.each(() => {
    const hl = X.t > X.at(2, 0.85);
    tiles.forEach(tl => { tl.box.r.setAttribute('stroke', hl && tl.r ? C.blue : C.line); tl.box.r.setAttribute('stroke-width', hl && tl.r ? 4 : 2); tl.box.r.setAttribute('fill', hl && tl.r ? C.blueL : C.card); });
  });
  const seven = X.g();
  X.text(3400, 320, 'On days like this:', { parent: seven, anchor: 'middle', size: 34, w: 600, fill: C.ink2 });
  const sevenN = X.text(3400, 400, '', { parent: seven, anchor: 'middle', size: 50, w: 700, serif: true, fill: C.blue });
  X.show(seven, 2, { f: 0.5, type: 'up' });
  X.each(() => { const n = rainy.slice(0, Math.round(X.L(2, 0.42, 0.8) * 10)).reduce((a, b) => a + b, 0); sevenN.set(`rain on ${n} of 10 days`); });

  // ================= cue 3-4: an honest track record =================
  const ox = 4180, oy = 800, PW = 620, PH = 540;
  const chart = X.g();
  E('line', { x1: ox, y1: oy, x2: ox + PW, y2: oy, stroke: C.ink, 'stroke-width': 4 }, chart);
  E('line', { x1: ox, y1: oy, x2: ox, y2: oy - PH, stroke: C.ink, 'stroke-width': 4 }, chart);
  for (const p of [0.5, 1]) {
    E('line', { x1: ox + p * PW, y1: oy, x2: ox + p * PW, y2: oy - PH, stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '6 8' }, chart);
    E('line', { x1: ox, y1: oy - p * PH, x2: ox + PW, y2: oy - p * PH, stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '6 8' }, chart);
    X.text(ox + p * PW, oy + 34, Math.round(p * 100) + '%', { parent: chart, anchor: 'middle', size: 24, fill: C.ink2 });
    X.text(ox - 14, oy - p * PH + 8, Math.round(p * 100) + '%', { parent: chart, anchor: 'end', size: 24, fill: C.ink2 });
  }
  X.text(ox + PW / 2, oy + 76, 'what the forecaster said', { parent: chart, anchor: 'middle', size: 28, w: 600 });
  const yl = X.text(0, 0, 'how often it really rained', { parent: chart, anchor: 'middle', size: 28, w: 600 });
  yl.t.setAttribute('transform', `translate(${ox - 92} ${oy - PH / 2}) rotate(-90)`);
  X.show(chart, 3, { type: 'fade' });
  const said = [0.1, 0.3, 0.5, 0.7, 0.9];
  const dots = said.map((p, i) => {
    const g = X.g(); const inner = X.g(g);
    E('circle', { cx: ox + p * PW, cy: oy - p * PH, r: p === 0.7 ? 18 : 14, fill: p === 0.7 ? C.blue : C.card, stroke: C.blue, 'stroke-width': 4 }, inner);
    X.show(g, 3, { f: 0.45 + i * 0.08, type: 'pop' });
    return inner;
  });
  dots.forEach((d, i) => X.pulse(d, ox + said[i] * PW, oy - said[i] * PH, 4, { f: 0.3 + i * 0.06, amt: 0.3 }));
  // the 70% days, checked
  const rec = X.g();
  X.rect(4960, 230, 720, 330, { parent: rec, fill: C.card, r: 20, shadow: true });
  X.text(5000, 290, 'Every time she said 70%:', { parent: rec, size: 30, w: 600 });
  for (let i = 0; i < 10; i++) {
    const x = 5000 + i * 64, rr = i < 7;
    E('rect', { x, y: 330, width: 52, height: 52, rx: 10, fill: C.sand }, rec);
    const f = E('rect', { x, y: 330, width: 52, height: 52, rx: 10, fill: C.blue, opacity: 0 }, rec);
    X.each(() => f.setAttribute('opacity', rr ? X.P(3, 0.12 + i * 0.03, 0, 0.3) : 0));
  }
  const recT = X.text(5000, 440, 'it rained 7 times out of 10', { parent: rec, size: 30, w: 700, fill: C.blue });
  X.mark(5600, 430, true, { parent: rec, s: 28 });
  X.text(5000, 510, 'what she says = what happens', { parent: rec, size: 28, fill: C.green, w: 700 });
  X.show(rec, 3, { f: 0.05, type: 'left' });
  const lnk = X.arrow(4960, 500, ox + 0.7 * PW + 24, oy - 0.7 * PH + 6, { color: C.blue, sw: 4, bend: -0.2 });
  X.show(lnk, 3, { f: 0.75, type: 'draw' });
  const diag = X.path(`M${ox},${oy} L${ox + PW},${oy - PH}`, { color: C.green, sw: 5 });
  X.show(diag, 4, { f: 0.05, type: 'draw', len: 1 });
  const cal = X.g();
  X.chip(4390, 290, 'calibrated = honest', { parent: cal, size: 30, color: C.green, fill: C.greenL, shadow: true });
  X.show(cal, 4, { f: 0.4, type: 'pop' });
  X.term(4, 'Calibrated', 'When a "70% sure" really comes true about\n70% of the time. The numbers can be trusted.', { f: 0.3, until: 5, color: C.green });

  // ================= cue 5-6: new evidence moves the needle =================
  const sky = X.g();
  X.rect(5940, 200, 860, 560, { parent: sky, fill: C.blueL, r: 24, stroke: C.ink2, sw: 3 });
  E('rect', { x: 5942, y: 680, width: 856, height: 78, rx: 0, fill: C.greenL }, sky);
  E('path', { d: 'M5940,690 Q6180,650 6400,690 T6800,690', fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, sky);
  X.icon('building', 6620, 640, 0.7, { parent: sky });
  X.show(sky, 5, { type: 'fade' });
  const lightC = X.g(); X.icon('cloud', 6200, 330, 0.9, { parent: lightC, fill: C.card }); X.icon('cloud', 6560, 300, 0.7, { parent: lightC, fill: C.card });
  X.show(lightC, 5, { f: 0.1, type: 'fade', out: 6, outLen: 0.6 });
  X.bob(lightC.firstChild.mid || lightC, { amp: 0, ampX: 10, per: 4 });
  const darkW = X.g(); const dark = X.g(darkW);
  rainCloud(dark, 6150, 330, 1.4, true, 1); rainCloud(dark, 6420, 300, 1.2, true, 2); rainCloud(dark, 6590, 360, 1.1, true, 3);
  X.show(darkW, 6, { f: 0.05, type: 'fade', len: 0.3 });
  const sunW = X.g(); const sunIn = X.g(sunW); sun(sunIn, 0, 0, 1.5);
  X.show(sunW, 6, { f: 0.58, type: 'fade' });
  X.each(() => {
    const inn = ease(X.L(6, 0.05, 0.3)), outp = ease(X.L(6, 0.52, 0.64));
    dark.setAttribute('transform', `translate(${lerp(-160, 0, inn) + 60 * outp} 0)`);
    dark.style.opacity = (inn * (1 - outp)).toFixed(3);
    dark.setAttribute('opacity', (1 - outp).toFixed(2));
    tf(sunIn, 6370, lerp(560, 360, ease(X.L(6, 0.58, 0.8))));
  });
  const gg = gauge(7300, 610, 270);
  const gT = X.text(7300, 280, 'chance of rain', { parent: gg.g, anchor: 'middle', size: 34, serif: true, w: 600 });
  X.show(gg.g, 5, { f: 0.05, type: 'pop' });
  X.each(() => {
    const p = 0.5 * ease(X.L(5, 0.1, 0.5)) + 0.35 * ease(X.L(6, 0.15, 0.4)) - 0.7 * ease(X.L(6, 0.6, 0.85));
    gg.set(p);
  });
  const upC = X.g(); X.chip(7300, 800, 'dark clouds: the guess goes up', { parent: upC, size: 28, color: C.blue, fill: C.blueL });
  X.show(upC, 6, { f: 0.25, type: 'pop', out: 6, outf: 0.55, outLen: 0.3 });
  const dnC = X.g(); X.chip(7300, 800, 'clear sky: the guess goes down', { parent: dnC, size: 28, color: C.ochre, fill: C.ochreL });
  X.show(dnC, 6, { f: 0.7, type: 'pop' });
  const newE = X.g(); X.chip(6370, 820, 'something new is seen', { parent: newE, size: 28, color: C.ink2, fill: C.card });
  X.show(newE, 5, { f: 0.35, type: 'pop', out: 7 });

  // ================= cue 7: Aran updates its guess =================
  const num = X.digits(8250, 200, '234567890124', { groups: [4, 4, 4], cw: 50, ch: 68, size: 36, gap: 6, groupGap: 22 });
  X.show(num, 7, { type: 'down' });
  const q7 = X.text(8250, 330, 'Is this an Aadhaar number?', { anchor: 'middle', size: 32, w: 600, fill: C.ink2 });
  X.show(q7, 7, { f: 0.05, type: 'up' });
  const evid = [['valid check digit', 0.18], ['the word "Aadhaar" nearby', 0.42], ['not part of a time or a size', 0.64]];
  evid.forEach(([s, f], i) => {
    const w = X.g(); const inner = X.g(w);
    X.chip(0, 0, '+  ' + s, { parent: inner, size: 28, color: C.green, fill: C.greenL, shadow: true });
    X.show(w, 7, { f, type: 'fade', len: 0.3 });
    X.each(() => { const p = ease(X.L(7, f, f + 0.12)); tf(inner, lerp(7700, 8250, p), 440 + i * 100); });
  });
  const g2 = gauge(9200, 640, 240, { lo: 'unsure', hi: 'sure', valSize: 40, color: C.green });
  X.text(9200, 330, 'Aran\'s guess', { parent: g2.g, anchor: 'middle', size: 34, serif: true, w: 600 });
  X.show(g2.g, 7, { f: 0.05, type: 'pop' });
  X.each(() => {
    const p = 0.3 + 0.25 * ease(X.L(7, 0.25, 0.35)) + 0.22 * ease(X.L(7, 0.5, 0.6)) + 0.16 * ease(X.L(7, 0.72, 0.82));
    g2.set(p, p < 0.45 ? 'not sure yet' : p < 0.7 ? 'likely' : 'very likely');
  });
  X.term(7, 'Updating', 'Changing a guess when new evidence arrives:\nup when it supports, down when it does not.', { f: 0.2, until: 8 });

  X.recap(8, ['Probability says how likely something is', 'Calibrated means honest', 'New evidence changes the guess']);
});
