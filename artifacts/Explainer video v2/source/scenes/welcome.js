// Title card: Aran = fortress (அரண்), the four builders, how the video works, six parts as stepping stones.
scene('welcome', X => {
  const BX = 2300, CX = 4600, DY = 1200; // world regions: A title (x 0..1920), B team, C how-to-watch, D six parts (below C)
  X.cam([
    { x: 560, y: 520, s: 1.5 },
    { k: 1, f: 0.12, x: 960, y: 560, s: 1, len: 1.8 },
    { k: 2, x: 1340, y: 590, s: 1.22 },
    { k: 3, x: BX + 960, y: 540, s: 1, len: 2.2 },
    { k: 4, x: BX + 740, y: 560, s: 1.1 },
    { k: 5, x: BX + 1180, y: 560, s: 1.1 },
    { k: 6, x: CX + 700, y: 540, s: 1.15, len: 2.2 },
    { k: 7, x: CX + 960, y: 540, s: 1 },
    { k: 10, x: CX + 960, y: DY + 520, s: 1, len: 1.8 },
    { k: 12, x: CX + 520, y: DY + 600, s: 1.4, len: 1.8 }
  ]);

  // ---------------- A: the name ----------------
  const title = X.text(560, 470, 'Aran', { size: 190, anchor: 'middle', serif: true, w: 600 });
  X.show(title, 0, { type: 'up', len: 1.1, out: 2, outLen: 0.6 });
  const ul = X.path('M380,510 Q560,530 740,505', { color: C.ochre, sw: 7 });
  X.show(ul, 0, { f: 0.35, type: 'draw', len: 1, out: 2, outLen: 0.6 });
  const sub0 = X.text(560, 580, 'a data firewall for Indian banks', { size: 30, anchor: 'middle', fill: C.ink2 });
  X.show(sub0, 0, { f: 0.55, type: 'up', out: 1, outLen: 0.4 });
  const tamil = X.text(560, 620, 'அரண்', { size: 96, anchor: 'middle', fill: C.ochre, w: 700 });
  X.show(tamil, 1, { f: 0.05, type: 'up', len: 0.9, out: 2, outLen: 0.6 });
  const means = X.text(560, 700, 'means  "a fortress"', { size: 36, anchor: 'middle', fill: C.ink2, italic: true });
  X.show(means, 1, { f: 0.45, type: 'up', out: 2, outLen: 0.6 });

  // the fortress builds itself, rising from the ground line
  const GY = 800;
  const ground = X.path(`M960,${GY} L1720,${GY}`, { color: C.ink, sw: 5 });
  X.show(ground, 1, { f: 0.22, type: 'draw', len: 0.8 });
  const merlons = (g, x0, x1, y, w = 24, gap = 18) => { for (let x = x0; x + w <= x1 + 0.1; x += w + gap) E('rect', { x, y: y - 26, width: w, height: 28, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, g); };
  const piece = (f, draw) => { const g = X.g(); draw(g); g.style.opacity = 0; return { g, f }; };
  const pieces = [
    piece(0.28, g => { E('rect', { x: 1080, y: 520, width: 110, height: GY - 520, fill: C.sand, stroke: C.ink, 'stroke-width': 5 }, g); merlons(g, 1080, 1190, 520, 26, 16); E('rect', { x: 1128, y: 570, width: 14, height: 40, rx: 7, fill: C.ink }, g); }),
    piece(0.36, g => { E('rect', { x: 1490, y: 520, width: 110, height: GY - 520, fill: C.sand, stroke: C.ink, 'stroke-width': 5 }, g); merlons(g, 1490, 1600, 520, 26, 16); E('rect', { x: 1538, y: 570, width: 14, height: 40, rx: 7, fill: C.ink }, g); }),
    piece(0.46, g => { E('rect', { x: 1190, y: 600, width: 300, height: GY - 600, fill: C.ochreL, stroke: C.ink, 'stroke-width': 5 }, g); merlons(g, 1196, 1490, 600, 24, 16); }),
    piece(0.6, g => { E('path', { d: `M1295,${GY} L1295,722 A45,45 0 0 1 1385,722 L1385,${GY} Z`, fill: C.ink2, stroke: C.ink, 'stroke-width': 4 }, g); E('line', { x1: 1340, y1: 680, x2: 1340, y2: GY, stroke: C.ink, 'stroke-width': 3 }, g); })
  ];
  X.each(t => {
    for (const p of pieces) {
      const q = easeOut(clamp((t - X.at(1, p.f)) / 0.9));
      p.g.style.opacity = q > 0 ? 1 : 0;
      p.g.setAttribute('transform', `translate(0 ${GY}) scale(1 ${Math.max(0.001, q).toFixed(3)}) translate(0 ${-GY})`);
    }
  });
  const bricks = X.path('M1190,650 L1295,650 M1385,650 L1490,650 M1190,700 L1295,700 M1385,700 L1490,700 M1240,600 L1240,650 M1440,600 L1440,650 M1215,650 L1215,700 M1465,650 L1465,700 M1080,600 L1190,600 M1490,600 L1600,600 M1080,690 L1190,690 M1490,690 L1600,690', { color: C.ink2, sw: 3 });
  X.show(bricks, 1, { f: 0.72, type: 'draw', len: 1.2 });
  [1135, 1545].forEach((x, i) => { const sh = X.icon('shield', x, 745, 0.42, { check: true }); X.show(sh, 1, { f: 0.8 + i * 0.05, type: 'pop' }); });

  // what it protects: private details, safe under a dome; threats bounce off
  const dome = X.g(); E('path', { d: 'M845,800 A495,495 0 0 1 1835,800', fill: 'none', stroke: C.teal, 'stroke-width': 5, 'stroke-dasharray': '16 12' }, dome);
  X.show(dome, 2, { f: 0.05, type: 'fade', len: 0.8 });
  const details = [[1340, 375, '2345 6789 0124', true], [1145, 450, 'Ravi Kumar', false], [1535, 450, '98765 43210', true], [1340, 520, 'ABCPK1234L', true]];
  details.forEach(([x, y, s, mono], i) => {
    const c = X.chip(x, y, s, { size: 24, mono, fill: C.tealL, color: C.ink, stroke: C.teal });
    X.show(c, 2, { f: 0.2 + i * 0.1, type: 'pop' });
    X.bob(c, { amp: 5, per: 2.4, ph: i * 1.3 });
  });
  const prot = X.text(1340, 880, 'customers\' private details, kept safe', { size: 28, anchor: 'middle', fill: C.teal, w: 600 });
  X.show(prot, 2, { f: 0.55, type: 'up' });
  const threats = [];
  for (let i = 0; i < 6; i++) threats.push(E('circle', { r: 11, fill: C.red, opacity: 0 }, X.g()));
  X.each(t => {
    const t0 = X.at(2, 0.3), t1 = X.at(3, 0.3);
    threats.forEach((d, i) => {
      if (t < t0 || t > t1) { d.setAttribute('opacity', 0); return; }
      const per = 2.2, u = ((t - t0) / per + i / 6) % 1;
      const a = (-118 + i * 19) * Math.PI / 180;
      const r = u < 0.5 ? lerp(760, 505, u / 0.5) : lerp(505, 660, (u - 0.5) / 0.5);
      d.setAttribute('cx', (1340 + r * Math.cos(a)).toFixed(1));
      d.setAttribute('cy', (800 + r * Math.sin(a)).toFixed(1));
      d.setAttribute('opacity', (u < 0.5 ? clamp(u * 6) : clamp((1 - u) * 2.2)).toFixed(2));
    });
  });

  // ---------------- B: the team ----------------
  const kare = X.g();
  X.text(BX + 960, 230, 'Built by four students', { parent: kare, size: 56, anchor: 'middle', serif: true, w: 600 });
  X.icon('building', BX + 470, 280, 0.42, { parent: kare });
  X.text(BX + 980, 294, 'Kalasalingam Academy of Research and Education (KARE)', { parent: kare, size: 30, anchor: 'middle', fill: C.ink2 });
  X.show(kare, 3, { type: 'down' });
  const team = [
    { x: BX + 460, name: 'Inbathamizhan S', shirt: C.green, skin: C.skin[0] },
    { x: BX + 710, name: 'Aasif Ahmed A', shirt: C.red, skin: C.skin[3] },
    { x: BX + 1210, name: 'SN Arun Vijay', shirt: C.plum, skin: C.skin[2] },
    { x: BX + 1460, name: 'Bharadhwaj M', shirt: C.teal, skin: C.skin[1], glasses: true }
  ];
  const ppl = team.map((m, i) => {
    const p = X.person(m.x, 790, { shirt: m.shirt, skin: m.skin, glasses: m.glasses, name: m.name, ph: i * 0.9 });
    X.show(p, 3, { f: 0.3 + i * 0.12, type: 'up', dist: 50 });
    p.mood('happy');
    return p;
  });
  X.wave(ppl[0], 4, { f: 0.15, len: 1.8 });
  X.wave(ppl[1], 4, { f: 0.6, len: 1.6 });
  X.wave(ppl[2], 5, { f: 0.1, len: 1.6 });
  X.wave(ppl[3], 5, { f: 0.45, len: 1.6 });
  const pair = (cx, k, label, icon, color, fill) => {
    const g = X.g();
    const ic = X.icon(icon, cx, 350, 0.55, { parent: g, fill });
    X.chip(cx, 440, label, { parent: g, size: 28, color, stroke: color, fill: C.card });
    E('path', { d: `M${cx - 150},515 L${cx - 150},500 L${cx + 150},500 L${cx + 150},515`, fill: 'none', stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    X.show(g, k, { f: 0.08, type: 'down' });
    X.pulse(ic.mid, cx, 350, k, { f: 0.3, amt: 0.25 });
  };
  pair(BX + 585, 4, 'Cybersecurity', 'shield', C.teal, C.tealL);
  pair(BX + 1335, 5, 'AI and machine learning', 'brain', C.plum, C.plumL);
  const lead = X.chip(BX + 460, 872, 'project lead', { size: 22, color: C.ochre, fill: C.ochreL, stroke: C.ochre });
  X.show(lead, 4, { f: 0.3, type: 'pop' });

  // ---------------- C: how to watch ----------------
  const viewer = X.person(CX + 330, 840, { shirt: C.blue, skin: C.skin[1], s: 0.95, name: 'you' });
  X.show(viewer, 6, { type: 'up' });
  X.each(() => viewer.mood(X.t > X.at(6, 0.3) ? 'happy' : 'neutral'));
  ['No computer knowledge needed', 'No security knowledge needed'].forEach((s, i) => {
    const g = X.g();
    X.mark(CX + 115, 410 + i * 72, true, { parent: g, s: 22 });
    X.chip(CX + 360, 410 + i * 72, s, { parent: g, size: 24 });
    X.show(g, 6, { f: 0.25 + i * 0.25, type: 'left' });
  });
  // a little screen that shows where things appear
  const scr = X.g();
  X.rect(CX + 560, 270, 800, 450, { parent: scr, fill: C.paper, stroke: C.ink, sw: 6, r: 18, shadow: true });
  E('path', { d: `M${CX + 920},720 L${CX + 900},780 L${CX + 1020},780 L${CX + 1000},720 Z`, fill: C.ink2 }, scr);
  E('rect', { x: CX + 860, y: 776, width: 200, height: 12, rx: 6, fill: C.ink }, scr);
  E('rect', { x: CX + 600, y: 296, width: 120, height: 10, rx: 5, fill: C.ochre }, scr);
  E('rect', { x: CX + 600, y: 316, width: 220, height: 14, rx: 7, fill: C.ink2 }, scr);
  X.icon('shield', CX + 900, 500, 0.9, { parent: scr, check: true });
  X.icon('bank', CX + 1080, 510, 0.6, { parent: scr });
  X.show(scr, 6, { f: 0.2, type: 'pop' });
  const mini = X.g();
  E('rect', { x: CX + 1170, y: 290, width: 170, height: 56, rx: 6, fill: C.card, stroke: C.ochre, 'stroke-width': 3 }, mini);
  E('rect', { x: CX + 1170, y: 290, width: 7, height: 56, fill: C.ochre }, mini);
  E('rect', { x: CX + 1188, y: 302, width: 70, height: 9, rx: 4, fill: C.ink }, mini);
  E('rect', { x: CX + 1188, y: 322, width: 130, height: 7, rx: 3, fill: C.ink3 }, mini);
  X.show(mini, 6, { f: 0.4, type: 'fade' });
  X.pulse(mini, CX + 1255, 318, [7, 8], { f: 0.15, amt: 0.25, len: 1 });
  const minisub = X.g();
  E('rect', { x: CX + 720, y: 664, width: 480, height: 36, rx: 8, fill: C.card, stroke: C.ink2, 'stroke-width': 3 }, minisub);
  E('rect', { x: CX + 760, y: 677, width: 400, height: 10, rx: 5, fill: C.ink2 }, minisub);
  X.show(minisub, 6, { f: 0.45, type: 'fade' });
  X.pulse(minisub, CX + 960, 682, 9, { f: 0.1, amt: 0.2, len: 1 });
  // where the real word card will appear
  const slot = X.rect(CX + 1152, 20, 720, 118, { fill: 'none', stroke: C.ochre, sw: 4, dash: '16 12', r: 12 });
  X.show(slot, 7, { f: 0.35, type: 'fade', out: 8, outf: 0.1, outLen: 0.3 });
  const a1 = X.arrow(CX + 1290, 282, CX + 1390, 152, { color: C.ochre, sw: 5 });
  X.show(a1, 7, { f: 0.3, type: 'draw', out: 10 });
  const l1 = X.text(CX + 1410, 236, 'word cards appear here', { size: 28, fill: C.ochre, w: 600 });
  X.show(l1, 7, { f: 0.45, type: 'up', out: 10 });
  X.term(8, 'Word card', 'A small card like this one. It explains a new word\nin plain, everyday language, the moment you hear it.', { until: 10 });
  const a2 = X.arrow(CX + 1180, 716, CX + 1290, 900, { color: C.blue, sw: 5 });
  X.show(a2, 9, { f: 0.15, type: 'draw' });
  const l2 = X.text(CX + 1320, 830, 'every spoken word\nis written here', { size: 28, fill: C.blue, w: 600 });
  X.show(l2, 9, { f: 0.3, type: 'up' });

  // ---------------- D: six parts as stepping stones ----------------
  const parts = ['The problem', 'Basic words', 'Why simple fails', 'How Aran works', 'Built and tested', 'Results'];
  const st = parts.map((_, i) => [CX + 260 + i * 280, DY + 720 - 60 * Math.sin(i / 5 * Math.PI)]);
  const hd = X.text(CX + 960, DY + 290, 'Six parts', { size: 60, anchor: 'middle', serif: true, w: 600 });
  X.show(hd, 10, { f: 0.1, type: 'down', out: 12, outLen: 0.4 });
  const water = X.path(`M${CX + 60},${DY + 800} Q${CX + 960},${DY + 640} ${CX + 1860},${DY + 800}`, { color: C.blueL, sw: 70 });
  X.show(water, 10, { f: 0.05, type: 'fade' });
  st.forEach(([x, y], i) => {
    const g = X.g();
    E('ellipse', { cx: x + 5, cy: y + 7, rx: 112, ry: 36, fill: C.shadow }, g);
    const e = E('ellipse', { cx: x, cy: y, rx: 112, ry: 36, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, g);
    X.text(x, y + 14, String(i + 1), { parent: g, size: 40, anchor: 'middle', serif: true, w: 700 });
    X.text(x, y + 82, parts[i], { parent: g, size: 26, anchor: 'middle', fill: C.ink2 });
    X.show(g, 10, { f: 0.15 + i * 0.1, type: 'up', dist: 40 });
    if (i === 0) X.each(() => e.setAttribute('fill', X.t > X.at(12, 0.4) ? C.ochreL : C.sand));
  });
  const pause = X.g();
  E('circle', { cx: CX + 1480, cy: DY + 290, r: 46, fill: C.card, stroke: C.ink, 'stroke-width': 5 }, pause);
  E('rect', { x: CX + 1462, y: DY + 266, width: 12, height: 48, rx: 3, fill: C.ink }, pause);
  E('rect', { x: CX + 1487, y: DY + 266, width: 12, height: 48, rx: 3, fill: C.ink }, pause);
  X.text(CX + 1545, DY + 300, 'pause any time', { parent: pause, size: 28, fill: C.ink2 });
  X.show(pause, 10, { f: 0.7, type: 'pop', out: 12, outLen: 0.4 });
  // a recap card waiting above every stone
  st.forEach(([x, y], i) => {
    const g = X.g();
    E('rect', { x: x - 58, y: y - 160, width: 116, height: 86, rx: 10, fill: C.card, stroke: C.line, 'stroke-width': 2 }, g);
    for (let j = 0; j < 3; j++) {
      E('circle', { cx: x - 36, cy: y - 136 + j * 22, r: 7, fill: C.greenL, stroke: C.green, 'stroke-width': 2 }, g);
      E('rect', { x: x - 22, y: y - 140 + j * 22, width: 62, height: 8, rx: 4, fill: C.ink3 }, g);
    }
    X.show(g, 11, { f: 0.2 + i * 0.1, type: 'pop', out: 12, outLen: 0.4 });
  });
  const rl = X.text(CX + 960, DY + 380, 'a short recap after every chapter', { size: 30, anchor: 'middle', fill: C.green });
  X.show(rl, 11, { f: 0.1, type: 'up', out: 12, outLen: 0.4 });
  // Ravi steps onto stone 1
  const rw = X.g();
  const ravi = X.person(0, 0, { parent: rw, shirt: C.blue, skin: C.skin[1], s: 0.75 });
  X.show(ravi, 12, { type: 'fade', len: 0.3 });
  X.each(t => {
    const p = ease(X.L(12, 0.05, 0.75));
    const x = lerp(CX - 40, st[0][0] - 48, p);
    const hop = p > 0 && p < 1 ? -Math.abs(Math.sin(p * Math.PI * 5)) * 14 : 0;
    const y = lerp(st[0][1] + 30, st[0][1] - 8, p) + hop;
    rw.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const sw = p > 0 && p < 1 ? 25 * Math.sin(p * Math.PI * 10) : 0;
    if (p < 1) X.arms(ravi, 8 + sw, -8 - sw); else X.arms(ravi, 8, lerp(-8, 140, X.P(12, 0.8, 0, 0.4)));
    ravi.mood(p >= 1 ? 'happy' : 'neutral');
  });
});
