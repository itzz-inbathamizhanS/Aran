// Data as water in pipes: sources, sinks, data flows, and a choke point guarded at the gate.
scene('flow', X => {
  X.cam([{ x: 975, y: 330, s: 1.2 }, { k: 1, x: 975, y: 360, s: 1.14 }, { k: 2, x: 960, y: 560, s: 1.0, len: 1.6 },
    { k: 4, x: 945, y: 580, s: 1.03 }, { k: 5, x: 960, y: 560, s: 0.97 }, { k: 6, x: 960, y: 560, s: 1.0 },
    { k: 7, f: 0.1, x: 980, y: 580, s: 1.3 }, { k: 8, f: 0.2, x: 960, y: 560, s: 1.0, len: 1.8 }]);

  // ---- cue 0-1: tap, pipe and sink
  const M = X.g();
  X.show(M, 0, { type: 'fade', out: 5, outLen: 0.6 });
  const pipeY = 320;
  X.rect(380, pipeY - 24, 1110, 48, { parent: M, fill: C.blueL, stroke: C.ink2, sw: 4, r: 8 });
  for (const x of [600, 900, 1200]) X.rect(x - 10, pipeY - 30, 20, 60, { parent: M, fill: C.sand, stroke: C.ink2, sw: 3, r: 4 });
  // tap (source)
  const tap = X.g(M);
  X.rect(250, 230, 70, 180, { parent: tap, fill: C.ink3, stroke: C.ink, sw: 4, r: 8 });
  X.rect(300, pipeY - 30, 90, 60, { parent: tap, fill: C.ink3, stroke: C.ink, sw: 4, r: 8 });
  E('rect', { x: 236, y: 206, width: 98, height: 22, rx: 8, fill: C.blue, stroke: C.ink, 'stroke-width': 4 }, tap);
  const handle = X.g(tap);
  E('rect', { x: 260, y: 196, width: 50, height: 14, rx: 6, fill: C.ink }, handle);
  X.spin(handle, 285, 203, { speed: 40 });
  // sink basin
  const sink = X.g(M);
  E('path', { d: 'M1500,300 L1710,300 L1680,420 L1530,420 Z', fill: C.card, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, sink);
  E('rect', { x: 1490, y: 290, width: 230, height: 16, rx: 6, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, sink);
  const level = E('rect', { x: 1532, y: 380, width: 146, height: 36, fill: C.blueL }, sink);
  X.each(t => { const h = 12 + 22 * clamp((t - X.at(0, 0.4)) / 12); level.setAttribute('y', (416 - h).toFixed(1)); level.setAttribute('height', h.toFixed(1)); });
  const pipeSp = spline([[330, pipeY], [900, pipeY], [1480, pipeY]]);
  X.stream(pipeSp, { parent: M, n: 9, speed: 0.3, r: 10, color: C.blue, k0: 0, f0: 0.2 });
  const drop = spline([[1490, pipeY], [1560, pipeY + 10], [1600, 390]]);
  X.stream(drop, { parent: M, n: 3, speed: 0.9, r: 8, color: C.blue, k0: 0, f0: 0.3 });
  const srcL = X.chip(285, 460, 'source', { size: 28, color: C.blue, fill: C.blueL, stroke: C.blue, parent: M });
  X.show(srcL, 1, { f: 0.1, type: 'pop' });
  const snkL = X.chip(1605, 460, 'sink', { size: 28, color: C.plum, fill: C.plumL, stroke: C.plum, parent: M });
  X.show(snkL, 1, { f: 0.5, type: 'pop' });
  const water = X.text(935, 250, 'water = data', { parent: M, size: 30, anchor: 'middle', serif: true, w: 600, fill: C.ink2 });
  X.show(water, 0, { f: 0.4, type: 'up' });

  // ---- cue 2-5: the real bank
  const B = X.g();
  X.show(B, 2, { type: 'fade', out: 6, outLen: 0.6 });
  const sources = [['Mobile app', 'phone', 560], ['Core banking', 'bank', 780]];
  const S = sources.map(([lab, ic, y], i) => {
    const g = X.g(B);
    X.rect(90, y - 62, 330, 124, { parent: g, fill: C.blueL, stroke: C.blue, r: 18, shadow: true });
    X.icon(ic, 160, y, 0.5, { parent: g });
    X.text(220, y + 10, lab, { parent: g, size: 28, w: 600 });
    X.show(g, 2, { f: 0.35 + i * 0.25, type: 'left' });
    return { x: 420, y };
  });
  const sinks = [['Log store', 'log', 470], ['CRM', 'laptop', 570], ['Vendor', 'building', 670], ['Backup', 'db', 770], ['AI company', 'chat', 870]];
  const sinkF = [0.22, 0.3, 0.38, 0.5, 0.62];
  const K = sinks.map(([lab, ic, y], i) => {
    const g = X.g(B);
    X.rect(1520, y - 44, 330, 88, { parent: g, fill: C.plumL, stroke: C.plum, r: 16, shadow: true });
    X.icon(ic, 1575, y, 0.36, { parent: g });
    X.text(1625, y + 10, lab, { parent: g, size: 28, w: 600 });
    X.show(g, 3, { f: sinkF[i], type: 'right' });
    return { x: 1520, y };
  });
  const pipeLayer = X.g(B); B.insertBefore(pipeLayer, B.firstChild);
  const flows = [];
  S.forEach((s, si) => K.forEach((k, ki) => {
    const sp = spline([[s.x, s.y], [s.x + 300, s.y], [k.x - 300, k.y], [k.x, k.y]]);
    const p = X.path(sp.d, { parent: pipeLayer, color: C.blueL, sw: 12 });
    X.show(p, 3, { f: sinkF[ki] + 0.04, type: 'draw', len: 0.9 });
    X.stream(sp, { parent: pipeLayer, n: 3, r: 6, speed: 0.22 + ((si + ki) % 3) * 0.04, color: C.blue, k0: 3, f0: sinkF[ki] + 0.12 });
    flows.push({ sp, si, ki });
  }));
  X.term(2, 'Source', 'Where data starts: an app, a form,\nor the bank\'s core banking system.', { until: 3 });
  X.term(3, 'Sink', 'Any place where data ends up and stays:\na log store, a CRM, a vendor, a backup...', { until: 4 });

  // ---- cue 4: one data flow highlighted
  const f0 = flows.find(f => f.si === 0 && f.ki === 0);
  const hl = X.path(f0.sp.d, { parent: B, color: C.ochre, sw: 14 });
  X.show(hl, 4, { f: 0.1, type: 'draw', len: 1.0, out: 5, outLen: 0.5 });
  X.stream(f0.sp, { parent: B, n: 4, r: 9, speed: 0.35, color: C.ink, k0: 4, f0: 0.3, k1: 5 });
  const dfl = X.chip(960, 455, 'a data flow', { size: 28, color: C.ochre, fill: C.ochreL, stroke: C.ochre, parent: B });
  X.show(dfl, 4, { f: 0.35, type: 'pop', out: 5, outLen: 0.4 });
  X.term(4, 'Data flow', 'The path data takes from a source to a sink.', { until: 5 });

  // ---- cue 5: thousands of pipes
  const many = X.g(B);
  const r = rng(5);
  for (let i = 0; i < 34; i++) {
    const y1 = 200 + r() * 700, y2 = 200 + r() * 700;
    const sp = spline([[440, y1], [800, lerp(y1, y2, 0.2) + (r() - 0.5) * 120], [1160, lerp(y1, y2, 0.8) + (r() - 0.5) * 120], [1500, y2]]);
    const p = X.path(sp.d, { parent: many, color: C.line, sw: 3 });
    X.show(p, 5, { f: 0.05 + i * 0.012, type: 'draw', len: 0.6 });
    X.stream(sp, { parent: many, n: 2, r: 4, speed: 0.3 + r() * 0.3, color: [C.blue, C.teal, C.plum, C.ochre][i % 4], k0: 5, f0: 0.3 });
  }
  many.parentNode.insertBefore(many, many.parentNode.firstChild);
  const cntG = X.g(B);
  X.rect(660, 150, 600, 64, { parent: cntG, fill: C.card, stroke: C.ink2, r: 32, shadow: true });
  const cnt = X.text(960, 193, '', { parent: cntG, size: 30, anchor: 'middle', w: 700 });
  X.count(cnt, 0, 3000000, 5, { f0: 0.15, f1: 0.95, post: '+ messages' });
  X.show(cntG, 5, { f: 0.1, type: 'down' });

  // ---- cue 6-8: many pipes through one gate
  const G = X.g();
  X.show(G, 6, { type: 'fade', len: 0.8 });
  const gx = 960, gy = 580;
  const left = [['phone', 300], ['laptop', 410], ['server', 520], ['bank', 630], ['phone', 740], ['server', 850]];
  const right = [['log', 330], ['laptop', 450], ['building', 570], ['db', 690], ['chat', 810]];
  const gPipes = X.g(G);
  const srcTicks = [];
  left.forEach(([ic, y], i) => {
    const g = X.g(G);
    X.icon(ic, 200, y, 0.4, { parent: g });
    X.show(g, 6, { f: 0.05 + i * 0.04, type: 'left' });
    const tk = X.mark(270, y - 30, true, { parent: G, s: 16 });
    X.show(tk, 8, { f: 0.55 + i * 0.04, type: 'pop' });
    srcTicks.push(tk);
  });
  right.forEach(([ic, y], i) => {
    const g = X.g(G);
    X.icon(ic, 1720, y, 0.4, { parent: g });
    X.show(g, 6, { f: 0.08 + i * 0.04, type: 'right' });
  });
  const srcLab = X.text(200, 242, 'sources', { parent: G, size: 26, anchor: 'middle', fill: C.blue, w: 700 });
  const snkLab = X.text(1720, 270, 'sinks', { parent: G, size: 26, anchor: 'middle', fill: C.plum, w: 700 });
  X.show(srcLab, 6, { f: 0.3, type: 'up' }); X.show(snkLab, 6, { f: 0.3, type: 'up' });
  left.forEach(([, y1], i) => {
    const sp = spline([[260, y1], [600, lerp(y1, gy, 0.7)], [gx, gy], [1320, lerp(gy, right[i % 5][1], 0.7)], [1660, right[i % 5][1]]]);
    const p = X.path(sp.d, { parent: gPipes, color: C.blueL, sw: 10 });
    X.show(p, 6, { f: 0.15 + i * 0.05, type: 'draw', len: 1.0 });
    X.stream(sp, { parent: gPipes, n: 4, r: 6, speed: 0.16 + (i % 3) * 0.03, color: [C.blue, C.teal, C.plum][i % 3], k0: 6, f0: 0.45 });
  });
  // the gate
  const gate = X.g(G);
  X.rect(gx - 85, gy - 110, 34, 230, { parent: gate, fill: C.sand, stroke: C.ink, sw: 4, r: 4 });
  X.rect(gx + 51, gy - 110, 34, 230, { parent: gate, fill: C.sand, stroke: C.ink, sw: 4, r: 4 });
  E('path', { d: `M${gx - 100},${gy - 110} Q${gx},${gy - 215} ${gx + 100},${gy - 110} Z`, fill: C.ochreL, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, gate);
  X.text(gx, gy - 128, 'main gate', { parent: gate, size: 22, anchor: 'middle', w: 700 });
  X.show(gate, 6, { f: 0.5, type: 'pop' });
  const cp = X.chip(gx, gy + 190, 'choke point', { size: 30, color: C.ochre, fill: C.ochreL, stroke: C.ochre, parent: G });
  X.show(cp, 7, { f: 0.2, type: 'pop' });
  X.term(7, 'Choke point', 'A spot that many data flows must pass through,\nlike the main gate of a building.', { until: 9 });
  // guard
  const guard = X.person(gx + 160, gy + 150, { parent: G, shirt: C.ink, badge: true, skin: C.skin[0], s: 0.75 });
  X.show(guard, 7, { f: 0.35, type: 'right' });
  X.point(guard, 8, 70, { f: 0.1 });
  const eye = X.icon('magnifier', gx + 50, gy - 20, 0.42, { parent: G, fill: 'none' });
  X.show(X.wrap(eye), 8, { f: 0.15, type: 'fade' });
  X.each(t => eye.mid.setAttribute('transform', `translate(${(8 * Math.sin(t * 2.4)).toFixed(1)} ${(30 * Math.sin(t * 1.3)).toFixed(1)})`));
  const okG = X.g(G);
  X.text(gx, gy + 280, 'watch everything, change no program', { parent: okG, size: 28, anchor: 'middle', fill: C.green, w: 700 });
  X.show(okG, 8, { f: 0.5, type: 'up' });

  X.recap(9, ['Data flows from sources to sinks', 'Choke points are where many flows meet', 'Guarding them protects everything downstream']);
});
