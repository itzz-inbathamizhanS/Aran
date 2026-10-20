// An immune system for data: the 2 a.m. insider, the body's thymus, negative selection on a plane of flows.
scene('immune', X => {
  const R = rng(38);
  // ---------- local helpers ----------
  // an immune cell: a circle with little spikes, drawn around (0,0)
  const cell = (parent, o = {}) => {
    const g = E('g', null, parent);
    const r = o.r || 16, col = o.stroke || C.blue;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      E('line', { x1: Math.cos(a) * r, y1: Math.sin(a) * r, x2: Math.cos(a) * (r + 9), y2: Math.sin(a) * (r + 9), stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
      E('circle', { cx: Math.cos(a) * (r + 10), cy: Math.sin(a) * (r + 10), r: 3.2, fill: col }, g);
    }
    g.body = E('circle', { cx: 0, cy: 0, r, fill: o.fill || C.blueL, stroke: col, 'stroke-width': 3 }, g);
    E('circle', { cx: -r * 0.25, cy: -r * 0.2, r: r * 0.32, fill: col, opacity: 0.55 }, g);
    return g;
  };
  // a "self" body cell: a soft green square
  const selfCell = (parent, x, y, s = 1) => {
    const g = E('g', { transform: `translate(${x},${y}) scale(${s})` }, parent);
    E('rect', { x: -18, y: -18, width: 36, height: 36, rx: 9, fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, g);
    E('circle', { cx: 0, cy: 0, r: 6, fill: C.green }, g);
    return g;
  };
  const place = (el, x, y, s = 1, op = 1) => { el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); el.setAttribute('opacity', op.toFixed(3)); };

  // ================= Panel A: the 2 a.m. insider (centre 960,540) =================
  // night window
  const win = X.g();
  X.rect(150, 170, 230, 170, { parent: win, fill: C.blueL, stroke: C.ink2, r: 8, sw: 4 });
  E('line', { x1: 265, y1: 170, x2: 265, y2: 340, stroke: C.ink2, 'stroke-width': 4 }, win);
  E('path', { d: 'M215,215 a26,26 0 1,0 26,34 a20,20 0 1,1 -26,-34 Z', fill: C.ochre }, win);
  for (const [sx, sy] of [[310, 205], [345, 260], [180, 300], [300, 300]]) E('circle', { cx: sx, cy: sy, r: 3.5, fill: C.ink2 }, win);
  X.show(win, 0, { type: 'fade' });
  // wall clock showing 2:00
  const clk = X.g();
  E('circle', { cx: 520, cy: 255, r: 72, fill: C.card, stroke: C.ink, 'stroke-width': 6 }, clk);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; E('line', { x1: 520 + Math.sin(a) * 58, y1: 255 - Math.cos(a) * 58, x2: 520 + Math.sin(a) * 66, y2: 255 - Math.cos(a) * 66, stroke: C.ink2, 'stroke-width': 3 }, clk); }
  const minH = E('line', { x1: 520, y1: 255, x2: 520, y2: 197, stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, clk);
  const hrH = E('line', { x1: 520, y1: 255, x2: 520, y2: 220, stroke: C.red, 'stroke-width': 7, 'stroke-linecap': 'round' }, clk);
  E('circle', { cx: 520, cy: 255, r: 6, fill: C.ink }, clk);
  X.text(520, 370, '2:00 a.m.', { parent: clk, size: 34, anchor: 'middle', serif: true, w: 700, fill: C.red });
  X.show(clk, 1, { type: 'pop' });
  X.each(t => {
    // hands sweep from 11 p.m. to 2:00 during line 1
    const p = X.P(1, 0, 0, 1.6);
    const hr = lerp(-1, 2, p); // hours past midnight
    minH.setAttribute('transform', `rotate(${(hr * 360) % 360} 520 255)`);
    hrH.setAttribute('transform', `rotate(${hr * 30} 520 255)`);
  });
  // insider behind a desk
  const ins = X.person(560, 790, { shirt: C.ochre, glasses: true, skin: C.skin[0], s: 1.1, name: '' });
  X.show(ins, 0, { type: 'up' });
  const desk = X.g();
  X.rect(330, 690, 600, 26, { parent: desk, fill: C.sand, stroke: C.ink2, r: 6, sw: 3 });
  X.rect(360, 716, 22, 190, { parent: desk, fill: C.sand, stroke: C.ink2, r: 4, sw: 3 });
  X.rect(878, 716, 22, 190, { parent: desk, fill: C.sand, stroke: C.ink2, r: 4, sw: 3 });
  X.rect(330, 716, 600, 90, { parent: desk, fill: C.paper, stroke: C.ink2, r: 4, sw: 3 });
  X.show(desk, 0, { type: 'fade' });
  const lap = X.icon('laptop', 760, 652, 0.95, { fill: C.blueL });
  X.show(lap, 0, { type: 'up', f: 0.2 });
  const badge = X.chip(560, 880, 'trusted staff · real login', { size: 24, color: C.green, fill: C.greenL });
  X.show(badge, 0, { f: 0.5, type: 'up' });
  X.each(t => {
    const typing = t > X.at(1, 0.15);
    const a = typing ? 34 + 6 * Math.sin(t * 14) : 8;
    const b = typing ? 40 + 6 * Math.sin(t * 14 + 1.7) : 8;
    X.arms(ins, -a * 0.3, b);
  });
  X.term(0, 'Insider', 'Someone inside the bank who already has access,\nlike a staff member with a real login.', { until: 2 });
  // the "perfect detector" scans and finds nothing wrong
  const mag = X.icon('magnifier', 0, 0, 0.55);
  const magW = X.wrap(mag);
  X.show(magW, 0, { f: 0.2, type: 'fade', out: 1, outf: 0.2 });
  X.each(t => { mag.mid.setAttribute('transform', `translate(${(1000 + 90 * Math.sin(t * 2.2)).toFixed(1)} ${(470 + 20 * Math.cos(t * 3)).toFixed(1)})`); });
  const fine = X.chip(1080, 360, 'detector: each request is allowed', { size: 24, color: C.green, fill: C.greenL });
  X.show(fine, 0, { f: 0.45, type: 'pop', out: 1, outf: 0.25 });
  // token vault server and the stream of swap-back requests
  const vault = X.g();
  X.icon('server', 1520, 400, 1.15, { parent: vault });
  X.text(1520, 510, 'Token vault', { parent: vault, size: 30, anchor: 'middle', serif: true, w: 700 });
  X.text(1520, 544, 'swaps tokens back to real numbers', { parent: vault, size: 22, anchor: 'middle', fill: C.ink2 });
  X.show(vault, 1, { type: 'left' });
  const reqSp = spline([[830, 620], [1050, 520], [1250, 470], [1440, 420]]);
  const reqPath = X.path(reqSp.d, { color: C.line, sw: 3, dash: '2 12' });
  X.show(reqPath, 1, { f: 0.2, type: 'fade' });
  const ticks = [];
  X.stream(reqSp, {
    n: 7, speed: 0.55, k0: 1, f0: 0.25,
    make: (g, i) => {
      const d = E('g', null, g);
      E('rect', { x: -22, y: -15, width: 44, height: 30, rx: 5, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 2.5 }, d);
      E('line', { x1: -13, y1: -4, x2: 13, y2: -4, stroke: C.ochre, 'stroke-width': 3 }, d);
      E('line', { x1: -13, y1: 5, x2: 6, y2: 5, stroke: C.ochre, 'stroke-width': 3 }, d);
      const tk = E('g', null, d);
      E('circle', { cx: 18, cy: -16, r: 10, fill: C.greenL, stroke: C.green, 'stroke-width': 2 }, tk);
      E('path', { d: 'M13,-16 L17,-12 L24,-20', fill: 'none', stroke: C.green, 'stroke-width': 3, 'stroke-linecap': 'round' }, tk);
      ticks.push(tk);
      return d;
    }
  });
  X.each(t => { const on = t > X.at(2, 0); ticks.forEach(tk => tk.setAttribute('opacity', on ? 1 : 0)); });
  const cntBox = X.g();
  X.rect(1340, 580, 360, 92, { parent: cntBox, fill: C.redL, stroke: C.red, r: 14 });
  const cnt = X.text(1520, 628, '0', { parent: cntBox, size: 40, anchor: 'middle', w: 700, fill: C.red, mono: true });
  X.text(1520, 660, 'tokens swapped back tonight', { parent: cntBox, size: 20, anchor: 'middle', fill: C.ink2 });
  X.show(cntBox, 1, { f: 0.3, type: 'up' });
  X.count(cnt, 0, 3000, 1, { f0: 0.3, f1: 1 });
  // pattern chart: requests per hour, with the 2 a.m. spike
  const chart = X.g();
  X.rect(1080, 700, 760, 210, { parent: chart, fill: C.card, r: 12 });
  X.text(1110, 738, 'requests per hour, one day', { parent: chart, size: 22, fill: C.ink2 });
  const day = [1, 1, 22, 1, 1, 1, 2, 3, 5, 7, 8, 8, 7, 8, 8, 7, 7, 6, 4, 3, 2, 2, 1, 1];
  const bars = day.map((v, h) => {
    const r = E('rect', { x: 1112 + h * 29, y: 890, width: 20, height: 0, rx: 3, fill: h === 2 ? C.red : C.blue }, chart);
    return { r, v, h };
  });
  X.text(1170, 760, '2 a.m.', { parent: chart, size: 22, fill: C.red, w: 700 });
  X.each(() => {
    const p = X.P(2, 0.3, 0, 1.2);
    bars.forEach(b => { const hh = (b.h === 2 ? 118 : b.v * 9) * p; b.r.setAttribute('height', hh.toFixed(1)); b.r.setAttribute('y', (890 - hh).toFixed(1)); });
  });
  X.show(chart, 2, { f: 0.25, type: 'up' });
  const strange = X.chip(1500, 760, 'only the pattern is strange', { size: 24, color: C.red, fill: C.redL });
  X.show(strange, 2, { f: 0.5, type: 'pop' });
  const bio = X.g();
  X.rect(1120, 180, 420, 70, { parent: bio, fill: C.plumL, stroke: C.plum, r: 35 });
  X.icon('bulb', 1170, 216, 0.45, { parent: bio, fill: C.ochreL });
  X.text(1350, 226, 'an idea from biology', { parent: bio, size: 28, anchor: 'middle', w: 600, fill: C.plum });
  X.show(bio, 2, { f: 0.72, type: 'down' });

  // ================= Panel B: the body (centre 3000,540) =================
  const BX = 2700;
  const bodyG = X.g();
  const bodyPath = `M${BX},180 a62,62 0 1,1 -0.1,0 Z M${BX - 34},300 L${BX + 34},300 L${BX + 36},322 Q${BX + 130},330 ${BX + 150},380 L${BX + 190},600 Q${BX + 196},625 ${BX + 170},628 L${BX + 150},628 L${BX + 118},440 L${BX + 112},640 L${BX + 102},890 L${BX + 30},890 L${BX},650 L${BX - 30},890 L${BX - 102},890 L${BX - 112},640 L${BX - 118},440 L${BX - 150},628 L${BX - 170},628 Q${BX - 196},625 ${BX - 190},600 L${BX - 150},380 Q${BX - 130},330 ${BX - 36},322 Z`;
  E('path', { d: bodyPath, fill: C.paper, stroke: C.ink2, 'stroke-width': 5, 'stroke-linejoin': 'round' }, bodyG);
  // self cells inside the body
  const selfSpots = [[BX - 60, 520], [BX + 50, 560], [BX - 20, 610], [BX + 70, 470], [BX - 80, 700], [BX + 60, 760], [BX - 40, 820], [BX + 20, 680]];
  selfSpots.forEach(([x, y]) => selfCell(bodyG, x, y, 0.85));
  // thymus: two lobes in the chest
  const thy = E('g', null, bodyG);
  E('path', { d: `M${BX - 4},372 Q${BX - 46},366 ${BX - 42},410 Q${BX - 38},452 ${BX - 6},440 Z`, fill: C.plumL, stroke: C.plum, 'stroke-width': 3.5 }, thy);
  E('path', { d: `M${BX + 4},372 Q${BX + 46},366 ${BX + 42},410 Q${BX + 38},452 ${BX + 6},440 Z`, fill: C.plumL, stroke: C.plum, 'stroke-width': 3.5 }, thy);
  X.show(bodyG, 3, { type: 'fade', len: 1 });
  const selfLab = X.g();
  X.chip(BX - 280, 640, 'self: your own cells', { parent: selfLab, size: 24, color: C.green, fill: C.greenL });
  X.arrow(BX - 170, 655, BX - 92, 690, { parent: selfLab, color: C.green, sw: 3, head: 14 });
  X.show(selfLab, 3, { f: 0.55, type: 'left' });
  // immune cells patrolling the body
  const patrol = X.g();
  const pcells = [];
  for (let i = 0; i < 6; i++) { const c = cell(patrol, { r: 13 }); pcells.push({ c, x: BX + (R() - 0.5) * 180, y: 470 + R() * 380, ph: R() * 6 }); }
  X.show(patrol, 3, { f: 0.2, type: 'fade' });
  X.each(t => { pcells.forEach(p => place(p.c, p.x + 26 * Math.sin(t * 0.9 + p.ph), p.y + 20 * Math.cos(t * 0.7 + p.ph))); });
  const immLab = X.chip(BX - 280, 300, 'immune cells', { size: 24, color: C.blue, fill: C.blueL });
  X.show(immLab, 3, { f: 0.15, type: 'right' });
  X.term(3, 'Immune system', 'Your body\'s defence force: cells that find and\ndestroy germs that do not belong to you.', { until: 4 });
  X.term(3, 'Self', 'Everything that belongs to your own body.\nFor Aran: normal, everyday data flows.', { f: 0.55, until: 4, color: C.green });
  // thymus label + magnified test room
  const thyLab = X.g();
  X.text(BX - 215, 420, 'thymus', { parent: thyLab, size: 30, w: 700, fill: C.plum, serif: true, anchor: 'end' });
  E('line', { x1: BX - 205, y1: 410, x2: BX - 50, y2: 410, stroke: C.plum, 'stroke-width': 3 }, thyLab);
  X.show(thyLab, 4, { type: 'fade' });
  const lens = X.g();
  E('line', { x1: BX + 44, y1: 390, x2: 3080, y2: 260, stroke: C.plum, 'stroke-width': 2.5, 'stroke-dasharray': '6 8' }, lens);
  E('line', { x1: BX + 44, y1: 420, x2: 3080, y2: 840, stroke: C.plum, 'stroke-width': 2.5, 'stroke-dasharray': '6 8' }, lens);
  X.rect(3060, 220, 720, 640, { parent: lens, fill: C.card, stroke: C.plum, r: 30, sw: 4 });
  X.text(3420, 272, 'Inside the thymus: every new cell is tested', { parent: lens, size: 26, anchor: 'middle', w: 600, fill: C.plum });
  // conveyor
  E('rect', { x: 3100, y: 556, width: 640, height: 14, rx: 7, fill: C.sand }, lens);
  // test station: a self shape the cell must not grab
  X.rect(3350, 330, 140, 110, { parent: lens, fill: C.paper, stroke: C.line, r: 14 });
  selfCell(lens, 3420, 385, 1.3);
  X.text(3335, 395, 'self', { parent: lens, size: 26, anchor: 'end', fill: C.green, w: 700 });
  const binIcon = X.icon('trash', 3420, 700, 0.6, { parent: lens, fill: C.redL });
  X.text(3480, 712, 'removed', { parent: lens, size: 22, fill: C.red, w: 600 });
  X.text(3700, 620, 'survives', { parent: lens, size: 22, fill: C.green, w: 600, anchor: 'end' });
  X.show(lens, 4, { f: 0.08, type: 'pop' });
  const testCells = [];
  const bad = [1, 4, 6];
  for (let i = 0; i < 8; i++) {
    const c = cell(lens, { r: 18 });
    const cross = E('path', { d: 'M-14,-14 L14,14 M14,-14 L-14,14', stroke: C.red, 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0 }, c);
    testCells.push({ c, cross, bad: bad.includes(i), i });
  }
  X.each(t => {
    const t0 = X.at(4, 0.15);
    testCells.forEach(tc => {
      const u = t - t0 - tc.i * 1.05; // seconds since this cell entered
      if (u < 0 || t < X.at(4, 0.1)) { place(tc.c, 3120, 528, 1, 0); return; }
      let x, y = 528, op = 1, s = 1;
      if (u < 0.9) x = lerp(3120, 3420, ease(u / 0.9));
      else if (u < 1.5) { x = 3420; y = 528 - 72 * Math.sin(clamp((u - 0.9) / 0.6) * Math.PI); }
      else if (tc.bad) { x = 3420; const q = clamp((u - 1.5) / 0.7); y = lerp(528, 680, ease(q)); s = 1 - 0.6 * q; op = 1 - q; }
      else { const q = clamp((u - 1.5) / 0.9); x = lerp(3420, 3720, ease(q)); op = 1 - clamp((u - 2.2) / 0.3); }
      const binding = tc.bad && u > 1.0;
      tc.c.body.setAttribute('fill', binding ? C.redL : (u > 1.4 && !tc.bad ? C.greenL : C.blueL));
      tc.cross.setAttribute('opacity', binding ? 1 : 0);
      place(tc.c, x, y, s, op);
    });
  });
  X.term(4, 'Thymus', 'A small organ in your chest where new immune\ncells are tested before they go to work.', { until: 5, color: C.plum });
  // line 5: survivors leave and attack a germ (foreign)
  const germ = X.g();
  const germIn = E('g', null, germ);
  E('path', { d: 'M0,-34 L10,-22 L28,-26 L24,-8 L38,4 L22,12 L24,30 L6,24 L-6,38 L-12,20 L-32,24 L-24,6 L-38,-6 L-20,-14 L-22,-32 L-6,-22 Z', fill: C.redL, stroke: C.red, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, germIn);
  E('circle', { cx: -6, cy: 0, r: 6, fill: C.red }, germIn); E('circle', { cx: 10, cy: 6, r: 4, fill: C.red }, germIn);
  const gx = BX + 40, gy = 560;
  const germLab = X.chip(BX - 280, 520, 'germ: not self', { size: 24, color: C.red, fill: C.redL });
  X.show(germLab, 5, { f: 0.45, type: 'right', out: 6 });
  X.show(germ, 5, { f: 0.3, type: 'pop' });
  const hunters = [];
  for (let i = 0; i < 5; i++) { const c = cell(X.g(), { r: 13, fill: C.greenL, stroke: C.green }); hunters.push({ c, a: i * 1.25 + 0.4 }); }
  X.each(t => {
    const p = X.P(5, 0.4, 0, 2.2), kill = X.P(5, 0.75, 0, 0.8);
    germIn.setAttribute('transform', `translate(${gx} ${gy}) rotate(${(t * 20) % 360}) scale(${(1 - 0.9 * kill).toFixed(3)})`);
    hunters.forEach(h => {
      const sx = 3720 - 40 * Math.cos(h.a), sy = 620 + 120 * Math.sin(h.a);
      const ex = gx + 46 * Math.cos(h.a), ey = gy + 46 * Math.sin(h.a);
      const on = t > X.at(5, 0.4) && t < X.at(6, 0.2);
      place(h.c, lerp(sx, ex, p), lerp(sy, ey, p), 1, on ? 1 : 0);
    });
  });
  const nsBox = X.g();
  X.rect(3110, 770, 620, 70, { parent: nsBox, fill: C.ochreL, stroke: C.ochre, r: 35 });
  X.text(3420, 815, 'keep only cells that ignore self', { parent: nsBox, size: 30, anchor: 'middle', w: 600 });
  X.show(nsBox, 5, { f: 0.1, type: 'up' });
  X.term(5, 'Negative selection', 'Test new detectors against what is normal,\nand throw away any that react to it.', { f: 0.55, until: 6 });

  // ================= Panel C: flows as dots (centre 5000,540) =================
  const card = X.g();
  X.rect(4090, 190, 520, 720, { parent: card, fill: C.card, r: 18, shadow: true });
  X.text(4350, 240, 'One data flow = 7 numbers', { parent: card, size: 28, anchor: 'middle', serif: true, w: 700 });
  const feats = [['how much data', 0.55], ['share of real numbers', 0.12], ['how unusual the hour', 0.2], ['new destination?', 0.05], ['new kind of data?', 0.05], ['tokens swapped back', 0.18], ['customers touched', 0.35]];
  const fb = feats.map(([n, v], i) => {
    const y = 300 + i * 84;
    X.text(4120, y + 10, n, { parent: card, size: 23, fill: C.ink2 });
    E('rect', { x: 4120, y: y + 24, width: 460, height: 22, rx: 8, fill: C.sand }, card);
    const r = E('rect', { x: 4120, y: y + 24, width: 0, height: 22, rx: 8, fill: C.blue }, card);
    return { r, v, i };
  });
  X.each(() => fb.forEach(b => b.r.setAttribute('width', (460 * b.v * X.P(6, 0.25 + b.i * 0.07, 0, 0.6)).toFixed(1))));
  X.show(card, 6, { type: 'left' });
  X.term(6, 'Data flow', 'Data moving from one system to another,\nlike the bank app sending to the loan vendor.', { until: 7, color: C.blue });
  const plane = X.g();
  X.rect(4700, 170, 1160, 740, { parent: plane, fill: C.card, r: 18 });
  E('line', { x1: 4740, y1: 870, x2: 5820, y2: 870, stroke: C.line, 'stroke-width': 3 }, plane);
  E('line', { x1: 4740, y1: 870, x2: 4740, y2: 210, stroke: C.line, 'stroke-width': 3 }, plane);
  X.text(5820, 205, 'each dot = one flow', { parent: plane, size: 22, anchor: 'end', fill: C.ink3 });
  X.show(plane, 6, { f: 0.6, type: 'fade' });
  const flyDot = X.g();
  E('circle', { cx: 0, cy: 0, r: 11, fill: C.blue, stroke: C.card, 'stroke-width': 2 }, flyDot);
  X.show(flyDot, 6, { f: 0.75, type: 'fade', len: 0.2, out: 7, outf: 0.2, outLen: 0.2 });
  X.travel(flyDot, spline([[4600, 560], [4800, 470], [5160, 540]]), 6, { f0: 0.78, f1: 1 });
  const SCX = 5180, SCY = 560;
  const selfPts = [];
  for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()); selfPts.push([SCX + Math.cos(a) * r * 170, SCY + Math.sin(a) * r * 120]); }
  const selfDots = selfPts.map(([x, y]) => E('circle', { cx: x, cy: y, r: 8, fill: C.green, opacity: 0 }, plane));
  X.each(t => {
    const p = X.L(7, 0, 0.55);
    selfDots.forEach((c, i) => { const on = p * 70 > i; c.setAttribute('opacity', on ? 0.85 : 0); if (on) c.setAttribute('transform', `translate(${(3 * Math.sin(t * 1.3 + i)).toFixed(1)} ${(3 * Math.cos(t * 1.1 + i)).toFixed(1)})`); });
  });
  const selfRing = X.g();
  E('ellipse', { cx: SCX, cy: SCY, rx: 200, ry: 150, fill: 'none', stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '10 10' }, selfRing);
  X.chip(SCX, SCY + 190, 'self: normal flows', { parent: selfRing, size: 26, color: C.green, fill: C.greenL });
  X.show(selfRing, 7, { f: 0.5, type: 'pop' });
  X.term(7, 'Self (for data)', 'The cluster of normal flows. Aran learns\nwhat it looks like from ordinary days.', { until: 8, color: C.green });
  // detectors
  const dets = [];
  const R2 = rng(7);
  while (dets.length < 30) {
    const r = 38 + R2() * 62;
    const x = 4740 + r + R2() * (1080 - 2 * r), y = 210 + r + R2() * (650 - 2 * r);
    const dx = (x - SCX) / 200, dy = (y - SCY) / 150;
    const dd = Math.hypot(x - SCX, y - SCY);
    const hit = Math.hypot(dx, dy) < 1 + r / 160;
    const c = E('circle', { cx: x, cy: y, r, fill: C.plumL, 'fill-opacity': 0.55, stroke: C.plum, 'stroke-width': 3, opacity: 0 }, plane);
    dets.push({ c, x, y, r, hit, i: dets.length, dd });
  }
  X.each(t => {
    const p = X.L(8, 0.02, 0.4), q = X.L(8, 0.48, 0.9);
    dets.forEach(d => {
      let op = p * 30 > d.i ? 1 : 0;
      let s = 1;
      if (d.hit) {
        const k = clamp(q * 30 - d.i * 0.6);
        if (q > 0) { d.c.setAttribute('stroke', C.red); d.c.setAttribute('fill', C.redL); }
        else { d.c.setAttribute('stroke', C.plum); d.c.setAttribute('fill', C.plumL); }
        s = 1 + 0.25 * Math.sin(k * Math.PI) - k * 0.6; op *= 1 - k;
      }
      d.c.setAttribute('opacity', op.toFixed(2));
      d.c.setAttribute('transform', `translate(${d.x} ${d.y}) scale(${Math.max(0.01, s).toFixed(3)}) translate(${-d.x} ${-d.y})`);
    });
  });
  const detLab = X.g();
  X.chip(5280, 220, 'touches self: removed', { parent: detLab, size: 22, color: C.red, fill: C.redL });
  X.show(detLab, 8, { f: 0.5, type: 'down', out: 9 });
  X.term(8, 'Detector', 'A random trip-wire circle. It is kept only if\nnormal flows never touch it.', { until: 9, color: C.plum });
  // the insider's flow drifts into a surviving detector
  const keep = dets.filter(d => !d.hit);
  let target = keep[0];
  keep.forEach(d => { if (Math.abs(d.y - SCY) + Math.abs(d.x - 5450) * 0.4 < Math.abs(target.y - SCY) + Math.abs(target.x - 5450) * 0.4 && d.r > 50) target = d; });
  const insDot = X.g();
  E('circle', { cx: 0, cy: 0, r: 13, fill: C.ochre, stroke: C.ink, 'stroke-width': 3 }, insDot);
  const insLab = E('text', { x: 0, y: -24, 'font-size': 24, 'font-weight': 700, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.sans }, insDot);
  insLab.textContent = '2 a.m. flow';
  const insW = X.wrap(insDot);
  X.show(insW, 9, { f: 0.08, type: 'fade' });
  X.travel(insDot, spline([[SCX + 150, SCY - 40], [lerp(SCX + 150, target.x, 0.5), lerp(SCY - 40, target.y, 0.5) - 40], [target.x, target.y]]), 9, { f0: 0.12, f1: 0.5 });
  const hitRing = E('circle', { cx: target.x, cy: target.y, r: target.r, fill: 'none', stroke: C.red, 'stroke-width': 5, opacity: 0 }, plane);
  X.each(t => {
    const on = t > X.at(9, 0.5);
    target.c.setAttribute('fill', on ? C.redL : C.plumL);
    target.c.setAttribute('stroke', on ? C.red : C.plum);
    const ph = ((t - X.at(9, 0.5)) * 1.2) % 1;
    hitRing.setAttribute('r', (target.r * (1 + 0.6 * ph)).toFixed(1));
    hitRing.setAttribute('opacity', on ? (1 - ph).toFixed(2) : 0);
  });
  const ax = target.x - 115, ay = target.y - target.r - 150;
  const alertG = X.g();
  const alertIn = X.g(alertG);
  X.rect(ax, ay, 230, 100, { parent: alertIn, fill: C.redL, stroke: C.red, r: 16, sw: 3 });
  X.icon('alert', ax + 52, ay + 52, 0.48, { parent: alertIn });
  X.text(ax + 150, ay + 62, 'ALERT', { parent: alertIn, size: 32, anchor: 'middle', w: 800, fill: C.red });
  X.show(alertG, 9, { f: 0.55, type: 'pop' });
  X.shake(alertIn, 9, { f: 0.62, amp: 8 });

  // ================= Panel D: results (centre 7000,540) =================
  const res = X.g();
  X.text(7000, 200, 'Six kinds of simulated attack', { parent: res, size: 40, anchor: 'middle', serif: true, w: 700 });
  const attacks = ['bulk export at 2 a.m.', 'Aadhaar pasted into AI', 'debug log left on', 'a never-seen destination', 'insider swaps at night', 'the same attack again'];
  const atkTicks = [];
  attacks.forEach((a, i) => {
    const x = 6170 + (i % 3) * 560, y = 250 + Math.floor(i / 3) * 74;
    const g = X.g(res);
    X.rect(x, y, 520, 58, { parent: g, fill: C.card, r: 29 });
    X.text(x + 30, y + 38, a, { parent: g, size: 24, fill: C.ink });
    const m = X.mark(x + 486, y + 29, true, { parent: g, s: 18 });
    atkTicks.push(X.show(m, 10, { f: 0.35 + i * 0.08, type: 'pop' }));
  });
  X.show(res, 10, { type: 'fade' });
  const barRows = [['Immune layer', 1, C.teal, '6 of 6 caught (100%)', 10], ['Isolation Forest', 0.2, C.ink3, '20%', 11]];
  barRows.forEach(([n, v, col, lab, k], i) => {
    const y = 460 + i * 150;
    const g = X.g();
    X.text(6180, y + 50, n, { parent: g, size: 32, w: 700, serif: true });
    X.bar(6560, y + 10, 1100, 64, v, k, { parent: g, color: col, f0: 0.2, f1: 0.7 });
    const lt = X.text(6560 + 1100 * v + (v < 0.5 ? 24 : -24), y + 54, lab, { parent: g, size: 30, w: 700, fill: v < 0.5 ? C.ink2 : C.card, anchor: v < 0.5 ? 'start' : 'end' });
    X.show(lt, k, { f: 0.65, type: 'fade' });
    X.show(g, k, { type: 'up' });
  });
  const fa = X.g();
  X.rect(6560, 760, 560, 70, { parent: fa, fill: C.greenL, stroke: C.green, r: 35 });
  X.text(6840, 806, 'false alarms: only 0.6%', { parent: fa, size: 28, anchor: 'middle', w: 700, fill: C.green });
  X.show(fa, 10, { f: 0.75, type: 'up' });
  X.term(11, 'Isolation Forest', 'A standard computer method for spotting odd\ndata points, used here for a fair comparison.', { until: 12, color: C.ink2 });

  // ================= Panel E: memory (centre 9000,540) =================
  const mem = X.g();
  X.text(9000, 200, 'Immune memory: the second time, it reacts harder', { parent: mem, size: 36, anchor: 'middle', serif: true, w: 700 });
  X.show(mem, 12, { type: 'fade' });
  const tracks = [['first time', 0.37, 760], ['same attack again', 0.71, 460]];
  tracks.forEach(([n, v, alertX], i) => {
    const y = 330 + i * 270;
    const g = X.g();
    X.text(8180, y, n, { parent: g, size: 28, w: 700, fill: C.ink2 });
    // score meter
    E('rect', { x: 8180, y: y + 30, width: 760, height: 46, rx: 12, fill: C.sand }, g);
    const fill = E('rect', { x: 8180, y: y + 30, width: 0, height: 46, rx: 12, fill: i ? C.red : C.ochre }, g);
    const sc = X.text(8960, y + 66, '0.00', { parent: g, size: 36, w: 700, mono: true, fill: i ? C.red : C.ochre });
    X.each(() => { const p = X.P(12, 0.1 + i * 0.35, 0, 1.4); fill.setAttribute('width', (760 * v * p).toFixed(1)); sc.set((v * p).toFixed(2)); });
    // timeline: when the alert rings
    E('line', { x1: 9180, y1: y + 53, x2: 9820, y2: y + 53, stroke: C.line, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    const dot = E('circle', { cx: 9180, cy: y + 53, r: 12, fill: C.ink2 }, g);
    const bell = X.icon('alert', 9180 + alertX * 0.6, y + 20, 0.42, { parent: g });
    X.each(t => {
      const p = X.L(12, 0.15 + i * 0.35, 0.45 + i * 0.35);
      const x = 9180 + 600 * p;
      dot.setAttribute('cx', x.toFixed(1));
      bell.style.opacity = x >= 9180 + alertX * 0.6 ? 1 : 0;
    });
    const bl = X.text(9180 + alertX * 0.6, y + 120, i ? 'alert sooner' : 'alert', { parent: bell, size: 24, anchor: 'middle', fill: C.red, w: 700 });
    X.show(g, 12, { f: i * 0.35, type: 'left' });
  });
  const memNote = X.chip(9000, 860, 'it remembers attacks it has seen', { size: 28, color: C.plum, fill: C.plumL });
  X.show(memNote, 12, { f: 0.75, type: 'up' });

  // ================= Panel F: owners (centre 11000,540) =================
  const own = X.g();
  X.icon('shield', 11000, 330, 1.3, { parent: own, fill: C.tealL });
  X.text(11000, 500, 'Cybersecurity pair', { parent: own, size: 40, anchor: 'middle', serif: true, w: 700 });
  X.show(own, 13, { type: 'pop' });
  const pA = X.person(10620, 840, { shirt: C.green, skin: C.skin[0], s: 1, name: 'Inbathamizhan' });
  const pB = X.person(11380, 840, { shirt: C.ink2, skin: C.skin[3], s: 1, name: 'Aasif', ph: 1.3 });
  X.show(pA, 13, { f: 0.2, type: 'up' }); X.show(pB, 13, { f: 0.35, type: 'up' });
  X.wave(pA, 13, { f: 0.4, len: 1.6 }); X.wave(pB, 13, { f: 0.55, len: 1.6 });
  X.each(() => { const h = X.t > X.at(13, 0.3); pA.mood(h ? 'happy' : 'neutral'); pB.mood(h ? 'happy' : 'neutral'); });
  X.recap(14, ['Learns what normal flows look like', 'Keeps only detectors that ignore normal', 'Raises an alert when something strange appears']);

  // ---------- camera ----------
  const tz = { x: 5290, y: 545 };
  X.cam([
    { x: 640, y: 560, s: 1.3 },
    { k: 0, f: 0.45, x: 800, y: 560, s: 1.12, len: 2 },
    { k: 1, f: 0.1, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 2, f: 0.3, x: 1420, y: 620, s: 1.3, len: 1.4 },
    { k: 2, f: 0.75, x: 1200, y: 540, s: 1.05, len: 1.2 },
    { k: 3, x: 2980, y: 540, s: 1.05, len: 2 },
    { k: 4, x: 3100, y: 540, s: 1.05, len: 1.4 },
    { k: 6, x: 4640, y: 550, s: 1.12, len: 2 },
    { k: 7, x: 5000, y: 540, s: 1, len: 1.4 },
    { k: 9, f: 0.25, x: tz.x, y: tz.y, s: 1.15, len: 1.6 },
    { k: 10, x: 7000, y: 540, s: 1, len: 2 },
    { k: 12, x: 9000, y: 540, s: 1, len: 2 },
    { k: 13, x: 11000, y: 560, s: 1.05, len: 2 }
  ]);
});
