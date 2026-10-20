// Real leaks in India: six story cards along a road of years; each one came through a side door.
scene('leaks', X => {
  const OX = i => 2000 * i; // card i (1..6) lives at x OX(i)..OX(i)+1920
  const cards = [
    { k: 1, k2: 2, year: '2016', who: 'Hitachi Payment Services', role: 'runs ATM networks for banks', lit: [2, 0.7] },
    { k: 3, k2: 4, year: '2019', who: 'SBI', role: 'India\'s largest bank\nreported by TechCrunch', lit: [4, 0.75] },
    { k: 5, k2: 6, year: '2020', who: 'Juspay', role: 'processes card payments\nfor many apps', lit: [5, 0.85] },
    { k: 8, k2: 9, year: '2021', who: 'SITA  →  Air India', role: 'SITA: a vendor running\npassenger systems for airlines', lit: [9, 0.55] },
    { k: 10, k2: 10, year: '2023', who: 'Telegram bot', role: 'data linked to COVID\nvaccination sign-ups', lit: [10, 0.8] },
    { k: 11, k2: 11, year: '2024', who: 'Star Health', role: 'an insurance company', lit: [11, 0.8] }
  ];
  const keys = [{ x: 960, y: 560, s: 1.05 }];
  cards.forEach((c, i) => {
    keys.push({ k: c.k, x: OX(i + 1) + 960, y: 560, s: 1, len: 1.9 });
    if (c.k2 !== c.k) keys.push({ k: c.k2, f: 0.05, x: OX(i + 1) + 990, y: 556, s: 1.05 });
  });
  keys.splice(7, 0, { k: 7, x: OX(3) + 980, y: 556, s: 1.03 });
  keys.push({ k: 12, x: OX(6) + 960, y: 560, s: 0.92 });
  X.cam(keys);

  // ---------- the timeline across the top (fixed, outside the camera) ----------
  const fixed = E('g', null, X.root.parentNode);
  E('rect', { x: 0, y: 112, width: 1920, height: 126, fill: C.bg, opacity: 0.96 }, fixed);
  const tl = X.g(fixed);
  const TX = i => 260 + i * 280;
  E('line', { x1: TX(0) - 60, y1: 172, x2: TX(5) + 60, y2: 172, stroke: C.line, 'stroke-width': 6, 'stroke-linecap': 'round' }, tl);
  const prog = E('line', { x1: TX(0) - 60, y1: 172, x2: TX(0) - 60, y2: 172, stroke: C.ochre, 'stroke-width': 6, 'stroke-linecap': 'round' }, tl);
  const tdots = cards.map((c, i) => {
    const d = E('circle', { cx: TX(i), cy: 172, r: 13, fill: C.card, stroke: C.ink3, 'stroke-width': 4 }, tl);
    const t = E('text', { x: TX(i), y: 220, 'font-size': 26, 'font-weight': 700, fill: C.ink3, 'text-anchor': 'middle', 'font-family': F.sans }, tl);
    t.textContent = c.year;
    return [d, t];
  });
  X.show(tl, 0, { f: 0.1, type: 'fade', len: 1 });
  X.each(t => {
    let reach = TX(0) - 60;
    cards.forEach((c, i) => {
      const p = X.P(c.k, 0.02, 0, 0.8);
      if (p > 0) reach = lerp(i === 0 ? TX(0) - 60 : TX(i - 1), TX(i), p);
      const on = p > 0.5, cur = on && (i === 5 || t < X.at(cards[i + 1].k));
      tdots[i][0].setAttribute('fill', on ? (cur ? C.ochre : C.ochreL) : C.card);
      tdots[i][0].setAttribute('stroke', on ? C.ochre : C.ink3);
      tdots[i][0].setAttribute('r', cur ? 16 : 13);
      tdots[i][1].setAttribute('fill', on ? C.ink : C.ink3);
    });
    prog.setAttribute('x2', reach.toFixed(1));
  });

  // ---------- helpers ----------
  const door = (x, y, lit) => {
    const g = X.g();
    const rays = E('g', { opacity: 0 }, g);
    for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; E('line', { x1: x + Math.cos(an) * 66, y1: y + Math.sin(an) * 72, x2: x + Math.cos(an) * 86, y2: y + Math.sin(an) * 94, stroke: C.ochre, 'stroke-width': 5, 'stroke-linecap': 'round' }, rays); }
    const frame = E('rect', { x: x - 38, y: y - 58, width: 76, height: 116, rx: 6, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, g);
    const gap = E('rect', { x: x - 30, y: y - 50, width: 60, height: 100, fill: C.ink3 }, g);
    E('path', { d: `M${x - 30},${y - 50} L${x + 6},${y - 42} L${x + 6},${y + 58} L${x - 30},${y + 50} Z`, fill: C.card, stroke: C.ink, 'stroke-width': 3 }, g);
    E('circle', { cx: x - 2, cy: y + 6, r: 4, fill: C.ink }, g);
    const lab = E('text', { x: x + 98, y: y + 10, 'font-size': 28, 'font-weight': 600, fill: C.ink3, 'font-family': F.sans }, g); lab.textContent = 'side door';
    X.each(t => {
      const p = clamp((t - X.at(lit[0], lit[1])) / 0.5);
      gap.setAttribute('fill', p > 0 ? C.ochre : C.ink3);
      frame.setAttribute('fill', p > 0 ? C.ochreL : C.sand);
      lab.setAttribute('fill', p > 0 ? C.ochre : C.ink3);
      rays.setAttribute('opacity', (p * (0.6 + 0.4 * Math.sin(t * 6))).toFixed(2));
    });
    return g;
  };
  const blur = s => s; // block characters (█) in mono text stand in for real data
  const atm = (x, y, parent) => {
    const g = E('g', null, parent);
    E('rect', { x: x - 60, y: y - 90, width: 120, height: 180, rx: 10, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, g);
    const scr = E('rect', { x: x - 42, y: y - 72, width: 84, height: 52, rx: 4, fill: C.blueL, stroke: C.ink, 'stroke-width': 3 }, g);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) E('rect', { x: x - 30 + c * 22, y: y - 6 + r * 20, width: 16, height: 14, rx: 3, fill: C.card, stroke: C.ink2, 'stroke-width': 2 }, g);
    E('rect', { x: x - 34, y: y + 52, width: 68, height: 10, rx: 4, fill: C.ink }, g);
    g.scr = scr; return g;
  };
  const cardShape = (pg, s = 1) => { const q = E('g', null, pg); const i = E('g', { transform: `scale(${s})` }, q); E('rect', { x: -26, y: -17, width: 52, height: 34, rx: 5, fill: C.blue, stroke: C.ink, 'stroke-width': 2 }, i); E('rect', { x: -18, y: -7, width: 12, height: 9, rx: 2, fill: C.ochre }, i); return q; };
  const globe = (x, y, parent) => {
    const g = E('g', null, parent);
    E('circle', { cx: x, cy: y, r: 50, fill: C.blueL, stroke: C.ink, 'stroke-width': 4 }, g);
    E('ellipse', { cx: x, cy: y, rx: 22, ry: 50, fill: 'none', stroke: C.ink, 'stroke-width': 3 }, g);
    E('path', { d: `M${x - 50},${y} L${x + 50},${y} M${x - 44},${y - 24} L${x + 44},${y - 24} M${x - 44},${y + 24} L${x + 44},${y + 24}`, stroke: C.ink, 'stroke-width': 3 }, g);
    return g;
  };

  // ---------- intro ----------
  const it = X.text(960, 400, 'Real leaks in India', { size: 76, anchor: 'middle', serif: true, w: 600 });
  X.show(it, 0, { f: 0.05, type: 'up' });
  const it2 = X.text(960, 465, 'one case at a time', { size: 32, anchor: 'middle', fill: C.ink2 });
  X.show(it2, 0, { f: 0.2, type: 'up' });
  cards.forEach((c, i) => {
    const x = 960 + (i - 2.5) * 250, g = X.g();
    E('path', { d: `M${x - 100},560 L${x - 40},560 L${x - 28},580 L${x + 100},580 L${x + 100},740 L${x - 100},740 Z`, fill: [C.ochreL, C.blueL, C.plumL, C.tealL, C.redL, C.greenL][i], stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    X.text(x, 680, c.year, { parent: g, size: 46, anchor: 'middle', serif: true, w: 700 });
    X.show(g, 0, { f: 0.3 + i * 0.08, type: 'up', dist: 50 });
    X.bob(g, { amp: 6, per: 2.6, ph: i });
  });

  // ---------- story cards (shared frame) ----------
  const L = cards.map((c, i) => {
    const ox = OX(i + 1);
    const g = X.g();
    X.rect(ox + 100, 262, 1720, 642, { parent: g, fill: C.card, stroke: C.line, sw: 2, r: 22, shadow: 8 });
    E('line', { x1: ox + 600, y1: 296, x2: ox + 600, y2: 870, stroke: C.line, 'stroke-width': 2 }, g);
    X.show(g, c.k, { type: 'fade', len: 0.6 });
    const yr = X.text(ox + 150, 400, c.year, { size: 124, serif: true, fill: C.ochre, w: 700 });
    X.show(yr, c.k, { f: 0.02, type: 'up' });
    const who = X.text(ox + 152, 460, c.who, { size: c.who.length > 16 ? 30 : 36, serif: true, w: 600 });
    X.show(who, c.k, { f: 0.12, type: 'up' });
    const role = X.text(ox + 152, 502, c.role, { size: 24, fill: C.ink2, lh: 31 });
    X.show(role, c.k, { f: 0.2, type: 'up' });
    const dr = door(ox + 196, 805, c.lit);
    X.show(dr, c.k, { f: 0.3, type: 'fade' });
    return { ox };
  });
  const stat = (i, k, f0, to, cap, color) => {
    const ox = L[i].ox;
    const s = X.text(ox + 150, 670, '', { size: typeof to === 'number' ? 58 : 46, serif: true, w: 700, fill: color || C.ink });
    if (typeof to === 'number') X.count(s, 0, to, k, { f0, f1: f0 + 0.2, fmt: v => v.toFixed(1).replace(/\.0$/, ''), post: ' million' });
    else s.set(to);
    X.show(s, k, { f: f0, type: 'up' });
    const c = X.text(ox + 152, 708, cap, { size: 24, fill: C.ink2 });
    X.show(c, k, { f: f0 + 0.05, type: 'up' });
  };

  // ---------- 1. 2016: malware in the ATM network ----------
  {
    const ox = L[0].ox, k = 1;
    X.term(k, 'Malware', 'Harmful software, made to secretly damage\na computer system or steal from it.', { f: 0.25, until: 3 });
    const pic = X.g();
    const srv = X.icon('server', ox + 1000, 400, 1.0, { parent: pic });
    X.text(ox + 920, 392, 'ATM network\nsystems', { parent: pic, size: 24, fill: C.ink2, lh: 30, anchor: 'end' });
    const atms = [ox + 760, ox + 1000, ox + 1240].map(x => {
      E('path', { d: `M${x},630 Q${x},540 ${ox + 1000},${460}`, fill: 'none', stroke: C.line, 'stroke-width': 4 }, pic);
      return atm(x, 720, pic);
    });
    X.show(pic, k, { f: 0.1, type: 'fade' });
    const sick = X.rect(ox + 935, 335, 130, 130, { fill: 'none', stroke: C.red, sw: 5, r: 14, dash: '12 8' });
    X.show(sick, k, { f: 0.56, type: 'pop' });
    X.shake(srv.mid, k, { f: 0.55, len: 0.8, amp: 8 });
    const bug = X.g(); const bi = E('g', null, bug);
    E('ellipse', { cx: 0, cy: 0, rx: 20, ry: 14, fill: C.red, stroke: C.ink, 'stroke-width': 3 }, bi);
    E('circle', { cx: 20, cy: 0, r: 8, fill: C.ink }, bi);
    E('path', { d: 'M-8,-13 L-12,-24 M5,-13 L7,-24 M-8,13 L-12,24 M5,13 L7,24', stroke: C.ink, 'stroke-width': 3, fill: 'none' }, bi);
    X.show(X.wrap(bug), k, { f: 0.28, type: 'fade', len: 0.3 });
    X.travel(bug, spline([[ox + 650, 320], [ox + 820, 300], [ox + 975, 382]]), k, { f0: 0.3, f1: 0.55, rotate: true });
    const crook = X.person(ox + 1640, 860, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.85 });
    X.show(crook, k, { f: 0.6, type: 'right' });
    X.stream(spline([[ox + 1065, 400], [ox + 1350, 480], [ox + 1590, 650]]), { n: 5, speed: 0.35, k0: k, f0: 0.62, make: pg => cardShape(pg, 0.9) });
    stat(0, k, 0.5, 3.2, 'debit cards exposed');
    // consequences
    atms.forEach((a, j) => {
      X.each(t => a.scr.setAttribute('fill', t > X.at(2, 0.1 + j * 0.08) ? C.redL : C.blueL));
      const m = X.mark(atms[j] ? [ox + 760, ox + 1000, ox + 1240][j] : 0, 674, false, { s: 20 });
      X.show(m, 2, { f: 0.1 + j * 0.08, type: 'pop' });
      const nc = X.g(); cardShape(nc, 1); nc.setAttribute('transform', `translate(${[ox + 760, ox + 1000, ox + 1240][j] + 74} 600)`);
      const ncw = X.wrap(nc); X.show(ncw, 2, { f: 0.35 + j * 0.08, type: 'down' });
    });
    const ch = X.chip(ox + 1000, 860, 'cards blocked and replaced', { size: 24, color: C.red, fill: C.redL, stroke: C.red });
    X.show(ch, 2, { f: 0.3, type: 'up' });
    const gl = X.g(); globe(ox + 1640, 350, gl); X.text(ox + 1640, 442, 'money taken abroad', { parent: gl, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(gl, 2, { f: 0.55, type: 'pop' });
    const coin = X.g(); X.icon('coin', 0, 0, 0.4, { parent: coin });
    X.show(X.wrap(coin), 2, { f: 0.6, type: 'fade', len: 0.2, out: 2, outf: 0.92, outLen: 0.2 });
    X.travel(coin, spline([[ox + 1240, 640], [ox + 1420, 420], [ox + 1600, 360]]), 2, { f0: 0.62, f1: 0.9 });
  }

  // ---------- 2. 2019: an open server ----------
  {
    const ox = L[1].ox, k = 3;
    X.term(k, 'Open server', 'A server anyone on the internet can reach,\nbecause no password protects it.', { f: 0.4, until: 5 });
    const pic = X.g();
    X.icon('server', ox + 930, 600, 1.5, { parent: pic });
    X.icon('cloud', ox + 1430, 380, 1.3, { parent: pic });
    X.text(ox + 1430, 470, 'the internet', { parent: pic, size: 26, anchor: 'middle', fill: C.ink2 });
    E('path', { d: `M${ox + 1010},540 Q${ox + 1150},360 ${ox + 1340},390`, fill: 'none', stroke: C.ink3, 'stroke-width': 4, 'stroke-dasharray': '10 10' }, pic);
    X.show(pic, k, { f: 0.15, type: 'fade' });
    const pl = X.g();
    E('path', { d: `M${ox + 690},450 L${ox + 690},425 Q${ox + 690},395 ${ox + 720},395 Q${ox + 750},395 ${ox + 750},425 L${ox + 750},450`, fill: 'none', stroke: C.ink3, 'stroke-width': 6, 'stroke-dasharray': '8 6' }, pl);
    E('rect', { x: ox + 672, y: 448, width: 96, height: 72, rx: 10, fill: 'none', stroke: C.ink3, 'stroke-width': 5, 'stroke-dasharray': '10 7' }, pl);
    X.mark(ox + 760, 520, false, { parent: pl, s: 22 });
    X.text(ox + 720, 575, 'no password', { parent: pl, size: 24, anchor: 'middle', fill: C.red, w: 700 });
    X.show(pl, k, { f: 0.5, type: 'pop' });
    stat(1, k, 0.55, 'No password', 'server left open on the internet', C.red);
    [[ox + 1620, 330], [ox + 1700, 430], [ox + 1260, 300]].forEach(([x, y], j) => {
      const p = X.icon('person', x, y, 0.42, { fill: C.sand });
      X.show(p, k, { f: 0.7 + j * 0.06, type: 'pop' });
      X.bob(p.mid, { amp: 4, per: 1.8, ph: j });
    });
    const mg = X.icon('magnifier', ox + 1700, 520, 0.42);
    X.show(mg, 4, { f: 0.7, type: 'pop' });
    X.bob(mg.mid, { amp: 6, per: 1.4 });
    const msgs = ['Phone: █████ █████', 'A/c: XXXX ████', 'Balance: ₹ █████', 'Phone: █████ █████', 'A/c: XXXX ████', 'Balance: ₹ █████', 'Phone: █████ █████', 'Balance: ₹ █████'];
    msgs.forEach((m, j) => {
      const g = X.g(); const gi = E('g', null, g);
      E('rect', { x: -150, y: -24, width: 300, height: 48, rx: 14, fill: C.blueL, stroke: C.blue, 'stroke-width': 3 }, gi);
      const t = E('text', { x: -132, y: 9, 'font-size': 22, 'font-weight': 600, fill: C.ink, 'font-family': F.mono }, gi); t.textContent = blur(m);
      const tx = ox + (j % 2 ? 1615 : 1295), ty = 610 + Math.floor(j / 2) * 64;
      X.show(X.wrap(g), 4, { f: 0.08 + j * 0.06, type: 'fade', len: 0.2 });
      X.travel(g, spline([[ox + 930, 560], [lerp(ox + 930, tx, 0.5), 490], [tx, ty]]), 4, { f0: 0.08 + j * 0.06, f1: 0.2 + j * 0.06 });
    });
    const core = X.chip(ox + 860, 730, 'SBI: core systems not breached', { size: 22, fill: C.greenL, color: C.green, stroke: C.green });
    X.show(core, 4, { f: 0.5, type: 'up' });
    const rd = X.chip(ox + 860, 800, 'but anyone could read the messages', { size: 22, fill: C.redL, color: C.red, stroke: C.red });
    X.show(rd, 4, { f: 0.72, type: 'up' });
  }

  // ---------- 3. 2020: payment company, dark web, masked data ----------
  {
    const ox = L[2].ox, k = 5;
    const pic = X.g();
    X.rect(ox + 740, 360, 240, 150, { parent: pic, fill: C.blueL, stroke: C.ink, sw: 4, r: 16, shadow: true });
    const gear = X.icon('gear', ox + 810, 435, 0.7, { parent: pic });
    X.spin(gear.mid, ox + 810, 435, { speed: 50 });
    X.icon('card', ox + 910, 435, 0.42, { parent: pic });
    X.text(ox + 860, 545, 'payment system', { parent: pic, size: 24, anchor: 'middle', fill: C.ink2 });
    [300, 435, 570].forEach((y, j) => { X.icon('phone', ox + 650, y, 0.42, { parent: pic }); });
    X.show(pic, k, { f: 0.1, type: 'fade' });
    [300, 435, 570].forEach((y, j) => X.stream(spline([[ox + 670, y], [ox + 740, lerp(y, 435, 0.5)]]), { n: 2, speed: 0.6, r: 6, color: C.blue, k0: k }));
    const crook = X.g();
    const cp = X.person(0, 0, { parent: crook, hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.75 });
    X.show(cp, k, { f: 0.25, type: 'fade' });
    X.travel(crook, spline([[ox + 1250, 600], [ox + 1150, 610], [ox + 1040, 600]]), k, { f0: 0.25, f1: 0.45 });
    // iceberg: the dark web
    const ice = X.g();
    E('rect', { x: ox + 1150, y: 640, width: 640, height: 240, rx: 12, fill: C.blueL }, ice);
    E('path', { d: `M${ox + 1420},640 L${ox + 1460},570 L${ox + 1500},590 L${ox + 1540},640 Z`, fill: C.card, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, ice);
    const deep = E('path', { d: `M${ox + 1420},640 L${ox + 1540},640 L${ox + 1690},720 L${ox + 1650},850 L${ox + 1300},860 L${ox + 1250},730 Z`, fill: C.paper, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, ice);
    E('path', { d: `M${ox + 1150},640 Q${ox + 1230},628 ${ox + 1310},640 T${ox + 1470},640 T${ox + 1630},640 T${ox + 1790},640`, fill: 'none', stroke: C.blue, 'stroke-width': 4 }, ice);
    X.text(ox + 1590, 600, 'normal web', { parent: ice, size: 22, fill: C.ink2 });
    X.show(ice, k, { f: 0.5, type: 'fade' });
    const tags = X.g();
    [[ox + 1380, 720], [ox + 1560, 760]].forEach(([x, y]) => X.chip(x, y, 'for sale', { parent: tags, size: 22, color: C.red, fill: C.redL, stroke: C.red }));
    X.text(ox + 1470, 830, 'dark web', { parent: tags, size: 30, anchor: 'middle', serif: true, w: 700 });
    X.show(tags, k, { f: 0.7, type: 'pop' });
    X.stream(spline([[ox + 980, 470], [ox + 1150, 560], [ox + 1350, 760]]), { n: 4, speed: 0.4, k0: k, f0: 0.55, make: pg => { const q = E('g', null, pg); X.icon('db', 0, 0, 0.26, { parent: q }); return q; } });
    stat(2, k, 0.55, 35, 'accounts, data for sale');
    X.term(6, 'Dark web', 'A hidden part of the internet that normal search\ncannot find. Stolen data is bought and sold there.', { until: 7 });
    X.each(t => deep.setAttribute('fill', t > X.at(6, 0.1) && Math.sin((t - X.at(6)) * 4) > 0 && t < X.at(7) ? C.ochreL : C.paper));
    [[ox + 1330, 800], [ox + 1620, 820]].forEach(([x, y], j) => { const b = X.person(x, y, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.3, ph: j }); X.show(b, 6, { f: 0.3 + j * 0.15, type: 'up' }); });
    // masked data still points to a person
    X.term(7, 'Masked data', 'Data with most characters hidden by dots or X\'s,\nso only a small part can still be read.', { until: 8 });
    const mk = X.g();
    X.rect(ox + 1140, 290, 650, 250, { parent: mk, fill: C.paper, stroke: C.line, r: 14 });
    const rows = [['card', '•••• •••• •••• ••••', C.ochre], ['email', '████@████', C.blue], ['phone', '█████ █████', C.teal]];
    rows.forEach(([lab, val, col], j) => {
      const y = 345 + j * 70;
      X.text(ox + 1165, y + 8, lab, { parent: mk, size: 22, fill: C.ink3 });
      X.text(ox + 1250, y + 9, val, { parent: mk, size: 24, mono: true, fill: col, w: 600 });
      E('path', { d: `M${ox + 1580},${y} Q${ox + 1640},${y} ${ox + 1680},415`, fill: 'none', stroke: col, 'stroke-width': 4 }, mk);
    });
    X.icon('person', ox + 1725, 412, 0.5, { parent: mk, fill: C.redL });
    X.text(ox + 1725, 500, 'a real person', { parent: mk, size: 22, anchor: 'middle', fill: C.red, w: 700 });
    X.show(mk, 7, { f: 0.05, type: 'pop' });
    const jn = X.chip(ox + 920, 650, 'joined together, they point to someone', { size: 22, fill: C.redL, color: C.red, stroke: C.red });
    X.show(jn, 7, { f: 0.55, type: 'up' });
  }

  // ---------- 4. 2021: the vendor's door ----------
  {
    const ox = L[3].ox, k = 8;
    const pic = X.g();
    X.icon('building', ox + 800, 560, 1.4, { parent: pic, fill: C.blueL });
    X.text(ox + 800, 680, 'Air India', { parent: pic, size: 30, anchor: 'middle', serif: true, w: 600 });
    X.icon('building', ox + 1330, 560, 1.2, { parent: pic, fill: C.plumL });
    X.text(ox + 1330, 670, 'SITA (vendor)', { parent: pic, size: 28, anchor: 'middle', serif: true, w: 600 });
    E('line', { x1: ox + 880, y1: 520, x2: ox + 1260, y2: 520, stroke: C.line, 'stroke-width': 10, 'stroke-linecap': 'round' }, pic);
    X.show(pic, k, { f: 0.1, type: 'fade' });
    X.stream(spline([[ox + 880, 520], [ox + 1260, 520]]), { n: 4, speed: 0.4, k0: k, f0: 0.15, make: pg => { const q = E('g', null, pg); X.icon('idcard', 0, 0, 0.26, { parent: q }); return q; } });
    const crook = X.g();
    const cp = X.person(0, 0, { parent: crook, hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.8 });
    X.show(cp, k, { f: 0.3, type: 'fade' });
    X.travel(crook, spline([[ox + 1780, 870], [ox + 1650, 865], [ox + 1530, 860]]), k, { f0: 0.3, f1: 0.5 });
    const crack = X.path(`M${ox + 1320},${600} L${ox + 1345},${620} L${ox + 1318},${640} L${ox + 1345},${662}`, { color: C.red, sw: 6 });
    X.show(crack, k, { f: 0.5, type: 'draw', len: 0.4 });
    const vb = X.rect(ox + 1255, 480, 150, 165, { fill: 'none', stroke: C.red, sw: 5, dash: '12 8', r: 10 });
    X.show(vb, k, { f: 0.52, type: 'pop' });
    X.stream(spline([[ox + 1400, 620], [ox + 1470, 680], [ox + 1520, 750]]), { n: 3, speed: 0.4, k0: k, f0: 0.6, make: pg => cardShape(pg, 0.8) });
    stat(3, k, 0.6, 4.5, 'passengers\' data stolen');
    const pp = X.chip(ox + 1080, 780, 'passport and credit card details', { size: 22 });
    X.show(pp, k, { f: 0.75, type: 'up' });
    // side door
    const own = X.chip(ox + 800, 400, 'own systems not broken into', { size: 22, fill: C.greenL, color: C.green, stroke: C.green });
    X.show(own, 9, { f: 0.05, type: 'down' });
    const lk = X.icon('lock', ox + 700, 620, 0.36, { fill: C.greenL });
    X.show(lk, 9, { f: 0.1, type: 'pop' });
    const arr = X.arrow(ox + 1440, 690, ox + 890, 600, { color: C.ochre, sw: 7, bend: -0.35, head: 26 });
    X.show(arr, 9, { f: 0.4, type: 'draw', len: 1 });
    const sdl = X.text(ox + 1150, 905 - 40, 'the way in: a side door', { size: 32, anchor: 'middle', serif: true, fill: C.ochre, w: 700 });
    X.show(sdl, 9, { f: 0.6, type: 'up' });
    X.term(9, 'Side door', 'A way in that nobody guards, because it is not\nthe main system: a vendor, a log, a chatbot.', { f: 0.5, until: 10 });
  }

  // ---------- 5. 2023: a chat bot that answers with people's details ----------
  {
    const ox = L[4].ox, k = 10;
    X.term(k, 'Telegram bot', 'An automatic account in the Telegram chat app\nthat replies to messages by itself.', { f: 0.1, until: 11 });
    const w = X.g();
    X.rect(ox + 660, 290, 620, 580, { parent: w, fill: C.paper, stroke: C.ink, sw: 4, r: 18, shadow: true });
    E('rect', { x: ox + 660, y: 290, width: 620, height: 64, rx: 18, fill: C.plum }, w);
    E('rect', { x: ox + 660, y: 330, width: 620, height: 24, fill: C.plum }, w);
    X.icon('chat', ox + 705, 322, 0.3, { parent: w, fill: C.plumL, color: C.card });
    X.text(ox + 745, 332, 'Telegram bot', { parent: w, size: 26, fill: C.card, w: 700 });
    X.show(w, k, { f: 0.05, type: 'pop' });
    const ub = X.g();
    X.rect(ox + 960, 390, 290, 56, { parent: ub, fill: C.blueL, stroke: C.blue, r: 16 });
    const ut = X.text(ox + 985, 427, '', { parent: ub, size: 24, mono: true, w: 600 });
    X.type(ut, '█████ █████', k, { f0: 0.25, f1: 0.38 });
    X.show(ub, k, { f: 0.22, type: 'left' });
    const bb = X.g();
    X.rect(ox + 690, 480, 470, 200, { parent: bb, fill: C.card, stroke: C.plum, r: 16 });
    [['Name:', '████████'], ['Aadhaar:', '████ ████ ████'], ['PAN:', '██████████']].forEach(([a, b], j) => {
      X.text(ox + 712, 530 + j * 56, a, { parent: bb, size: 24, fill: C.ink2, w: 600 });
      const v = X.text(ox + 850, 530 + j * 56, '', { parent: bb, size: 24, mono: true, fill: C.red, w: 600 });
      X.type(v, b, k, { f0: 0.45 + j * 0.06, f1: 0.52 + j * 0.06 });
    });
    X.show(bb, k, { f: 0.42, type: 'right' });
    const db = X.g();
    X.icon('db', ox + 1560, 430, 0.9, { parent: db, fill: C.tealL });
    X.text(ox + 1560, 530, 'vaccination\nsign-up records', { parent: db, size: 24, anchor: 'middle', fill: C.ink2, lh: 30 });
    X.show(db, k, { f: 0.3, type: 'pop' });
    X.stream(spline([[ox + 1500, 440], [ox + 1380, 470], [ox + 1170, 560]]), { n: 4, speed: 0.5, r: 8, color: C.teal, k0: k, f0: 0.4 });
    const typer = X.person(ox + 1560, 870, { shirt: C.ink2, skin: C.skin[2], s: 0.75 });
    X.show(typer, k, { f: 0.15, type: 'up' });
    X.each(() => X.arms(typer, 8, lerp(-8, 70, X.P(k, 0.2)) + 8 * Math.sin(X.t * 14) * (X.on(k) && X.t < X.at(k, 0.4) ? 1 : 0)));
    const ph = X.icon('phone', ox + 1500, 760, 0.35);
    X.show(ph, k, { f: 0.2, type: 'pop' });
    stat(4, k, 0.6, 'Any phone no.', 'gave back name, Aadhaar, PAN', C.red);
  }

  // ---------- 6. 2024: data sold through chatbots ----------
  {
    const ox = L[5].ox, k = 11;
    [ox + 660, ox + 1240].forEach((x, b) => {
      const g = X.g();
      X.rect(x, 290, 540, 380, { parent: g, fill: C.paper, stroke: C.ink, sw: 4, r: 16, shadow: true });
      E('rect', { x, y: 290, width: 540, height: 54, rx: 16, fill: C.plum }, g);
      E('rect', { x, y: 324, width: 540, height: 20, fill: C.plum }, g);
      X.text(x + 26, 327, 'chatbot ' + (b + 1), { parent: g, size: 24, fill: C.card, w: 700 });
      X.show(g, k, { f: 0.05 + b * 0.1, type: 'pop' });
      ['names', 'phone numbers', 'addresses', 'tax numbers', 'medical reports'].forEach((r, j) => {
        const row = X.g();
        X.text(x + 26, 392 + j * 56, r, { parent: row, size: 24, fill: C.ink, w: 600 });
        X.text(x + 260, 392 + j * 56, '████████', { parent: row, size: 24, mono: true, fill: C.red });
        X.show(row, k, { f: 0.15 + b * 0.05 + j * 0.07, type: 'left' });
      });
    });
    const rep = X.g();
    X.icon('file', ox + 760, 780, 0.75, { parent: rep, fill: C.card });
    E('path', { d: `M${ox + 760},760 L${ox + 760},800 M${ox + 740},780 L${ox + 780},780`, stroke: C.red, 'stroke-width': 8, 'stroke-linecap': 'round' }, rep);
    X.text(ox + 820, 790, 'medical reports, for sale', { parent: rep, size: 26, fill: C.red, w: 600 });
    X.show(rep, k, { f: 0.5, type: 'up' });
    [ox + 1480, ox + 1620].forEach((x, j) => { const b = X.person(x, 880, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.6, ph: j }); X.show(b, k, { f: 0.55 + j * 0.08, type: 'up' }); });
    X.stream(spline([[ox + 1450, 760], [ox + 1350, 720], [ox + 1250, 680]]), { n: 3, speed: 0.5, k0: k, f0: 0.6, make: pg => { const q = E('g', null, pg); X.icon('coin', 0, 0, 0.3, { parent: q }); return q; } });
    stat(5, k, 0.4, 31, 'customers\' data sold');
  }

  X.recap(12, ['Leaked in India: cards, bank messages, passports', 'and Aadhaar numbers and health records', 'Again and again: through a side door']);
});
