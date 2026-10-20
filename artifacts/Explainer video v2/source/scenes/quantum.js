// Ready for quantum computers: Shor breaks key exchange, Grover only weakens AES, harvest now / decrypt later, hybrid locks.
scene('quantum', X => {
  // ---------- local helpers ----------
  // padlock drawn around (0,0); returns {g, sh} where sh is the shackle (animate with setAttribute)
  const padlock = (parent, cx, cy, s, o = {}) => {
    const outer = E('g', { transform: `translate(${cx},${cy}) scale(${s})` }, parent);
    const sh = E('path', { d: 'M-40,-30 L-40,-75 Q-40,-118 0,-118 Q40,-118 40,-75 L40,-30', fill: 'none', stroke: C.ink, 'stroke-width': o.thick || 12, 'stroke-linecap': 'round' }, outer);
    const body = E('rect', { x: -66, y: -36, width: 132, height: 108, rx: 16, fill: o.fill || C.ochreL, stroke: C.ink, 'stroke-width': 6 }, outer);
    E('circle', { cx: 0, cy: 10, r: 11, fill: C.ink }, outer); E('rect', { x: -4, y: 12, width: 8, height: 26, fill: C.ink }, outer);
    return { g: outer, sh, body };
  };
  // a cryostat "chandelier" quantum computer, hanging from (cx, top)
  const cryostat = (parent, cx, top, s = 1) => {
    const g = E('g', { transform: `translate(${cx},${top}) scale(${s})` }, parent);
    E('rect', { x: -170, y: 0, width: 340, height: 22, rx: 6, fill: C.ink2 }, g);
    const tiers = [[60, 280], [170, 230], [280, 180], [390, 130]];
    let prevY = 22, prevW = 280;
    tiers.forEach(([y, w], i) => {
      for (const f of [-0.38, -0.12, 0.12, 0.38]) E('line', { x1: f * prevW, y1: prevY, x2: f * w, y2: y, stroke: C.ochre, 'stroke-width': 7 }, g);
      E('path', { d: `M${-w * 0.26},${prevY + 6} q12,${(y - prevY) / 4} 0,${(y - prevY) / 2} q-12,${(y - prevY) / 4} 0,${(y - prevY) / 2 - 8}`, fill: 'none', stroke: C.blue, 'stroke-width': 3.5 }, g);
      E('path', { d: `M${w * 0.26},${prevY + 6} q-12,${(y - prevY) / 4} 0,${(y - prevY) / 2} q12,${(y - prevY) / 4} 0,${(y - prevY) / 2 - 8}`, fill: 'none', stroke: C.blue, 'stroke-width': 3.5 }, g);
      E('rect', { x: -w / 2, y, width: w, height: 18, rx: 9, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 4 }, g);
      prevY = y + 18; prevW = w;
    });
    E('line', { x1: 0, y1: prevY, x2: 0, y2: prevY + 50, stroke: C.ochre, 'stroke-width': 8 }, g);
    E('rect', { x: -34, y: prevY + 48, width: 68, height: 30, rx: 6, fill: C.plumL, stroke: C.plum, 'stroke-width': 4 }, g);
    return g;
  };
  const beam = (x1, y1, x2, y2) => X.path(`M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - 120} ${x2},${y2}`, { color: C.plum, sw: 6, dash: '14 10' });
  const crackPath = (x, y, h) => `M${x - 8},${y} L${x + 10},${y + h * 0.3} L${x - 6},${y + h * 0.55} L${x + 12},${y + h}`;

  // ================= Panel A: the quantum computer (centre 960,540) =================
  const qc = X.g();
  const qcIn = X.g(qc);
  cryostat(qcIn, 560, 160, 1.0);
  X.show(qc, 0, { type: 'down', len: 1.2 });
  X.each(t => qcIn.setAttribute('transform', `rotate(${(1.2 * Math.sin(t * 1.1)).toFixed(2)} 560 160)`));
  const qcLab = X.g();
  X.text(560, 760, 'A quantum computer', { parent: qcLab, size: 34, anchor: 'middle', serif: true, w: 700 });
  X.chip(560, 820, 'big ones: still in the future', { parent: qcLab, size: 24, color: C.plum, fill: C.plumL });
  X.show(qcLab, 0, { f: 0.4, type: 'up' });
  X.term(0, 'Quantum computer', 'A new kind of computer built on the rules of tiny\nparticles. Big, powerful ones do not exist yet.', { until: 1, color: C.plum });
  // line 1: tiny particles + "certain problems, much faster"
  const atomG = X.g();
  const at = X.icon('atom', 1010, 300, 1.1, { color: C.plum });
  atomG.appendChild(at);
  X.spin(at.mid, 1010, 300, { speed: 40 });
  X.text(1010, 410, 'tiny particles', { parent: atomG, size: 26, anchor: 'middle', fill: C.plum, w: 700 });
  X.show(atomG, 1, { type: 'pop', out: 2, outf: 0.1 });
  const race = X.g();
  X.text(1180, 560, 'certain maths problems:', { parent: race, size: 26, fill: C.ink2, w: 700 });
  X.text(1180, 620, 'ordinary computer', { parent: race, size: 24 });
  X.text(1180, 720, 'quantum computer', { parent: race, size: 24, fill: C.plum });
  E('rect', { x: 1180, y: 636, width: 620, height: 30, rx: 10, fill: C.sand }, race);
  E('rect', { x: 1180, y: 736, width: 620, height: 30, rx: 10, fill: C.sand }, race);
  const slow = E('rect', { x: 1180, y: 636, width: 0, height: 30, rx: 10, fill: C.ink3 }, race);
  const fast = E('rect', { x: 1180, y: 736, width: 0, height: 30, rx: 10, fill: C.plum }, race);
  X.each(() => { slow.setAttribute('width', (620 * 0.12 * X.L(1, 0.3, 1)).toFixed(1)); fast.setAttribute('width', (620 * ease(X.L(1, 0.3, 0.6))).toFixed(1)); });
  const done = X.mark(1840, 751, true, { s: 20 });
  race.appendChild(done);
  X.show(done, 1, { f: 0.62, type: 'pop' });
  X.show(race, 1, { f: 0.2, type: 'left', out: 2, outf: 0.1 });
  // line 2: the locks of the internet
  const net = X.g();
  const sites = [['phone', 1150, 330], ['bank', 1500, 300], ['cloud', 1780, 360], ['laptop', 1300, 620], ['server', 1680, 640]];
  E('path', { d: 'M1150,330 L1500,300 L1780,360 L1680,640 L1300,620 Z M1150,330 L1680,640 M1500,300 L1300,620', fill: 'none', stroke: C.line, 'stroke-width': 4 }, net);
  const netLocks = [];
  sites.forEach(([ic, x, y], i) => {
    X.icon(ic, x, y, 0.62, { parent: net });
    const pl = padlock(net, x + 52, y + 32, 0.3, { fill: C.blueL, thick: 14 });
    netLocks.push({ pl, x: x + 52, y: y + 32, breaks: i % 2 === 0 });
  });
  X.text(1460, 790, 'the locks that protect the internet', { parent: net, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(net, 2, { type: 'fade' });
  const b0 = beam(700, 560, 1180, 380);
  X.show(b0, 2, { f: 0.45, type: 'draw', len: 0.8 });
  X.each(t => netLocks.forEach(n => {
    const o = n.breaks ? X.P(2, 0.6, 0, 0.6) : 0;
    n.pl.sh.setAttribute('transform', `translate(0 ${(-34 * o).toFixed(1)})`);
    n.pl.body.setAttribute('fill', o > 0.5 ? C.redL : C.blueL);
  }));

  // ================= Panel B: Shor and Grover (centre 3000,540) =================
  const qcB = X.g(); cryostat(qcB, 2200, 180, 0.6);
  X.text(2200, 560, "Shor's algorithm", { parent: qcB, size: 28, anchor: 'middle', serif: true, w: 700, fill: C.plum });
  X.show(qcB, 3, { type: 'down' });
  const shorLocks = [['key exchange', 'how computers agree on a key', 2620], ['signatures', 'how messages are signed', 2980]];
  const shL = shorLocks.map(([n, sub, x], i) => {
    const g = X.g();
    const pl = padlock(g, x, 470, 1, { fill: C.blueL });
    const cr = E('path', { d: crackPath(x, 440, 100), fill: 'none', stroke: C.red, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    X.text(x, 610, n, { parent: g, size: 30, anchor: 'middle', serif: true, w: 700 });
    X.text(x, 646, sub, { parent: g, size: 22, anchor: 'middle', fill: C.ink2 });
    X.show(g, 3, { f: 0.1 + i * 0.1, type: 'up' });
    const bm = beam(2260, 470, x - 70, 470);
    X.show(bm, 3, { f: 0.4 + i * 0.1, type: 'draw', len: 0.6 });
    return { pl, cr, i };
  });
  X.each(() => shL.forEach(s => {
    const o = X.P(3, 0.55 + s.i * 0.1, 0, 0.5);
    s.pl.sh.setAttribute('transform', `translate(0 ${(-40 * o).toFixed(1)}) rotate(${(-18 * o).toFixed(1)} 40 -30)`);
    s.pl.body.setAttribute('fill', o > 0.5 ? C.redL : C.blueL);
    s.cr.setAttribute('opacity', o > 0.5 ? 1 : 0);
  }));
  const brk = X.chip(2800, 740, 'broken', { size: 30, color: C.red, fill: C.redL });
  X.show(brk, 3, { f: 0.75, type: 'pop' });
  X.term(3, "Shor's algorithm", 'A quantum method that could break the maths behind\nagreeing on keys and signing messages.', { until: 4, color: C.plum });
  // Grover: AES-128 weakened, AES-256 thicker and still strong
  const div = X.line(3220, 220, 3220, 820, { color: C.line, sw: 3, dash: '8 10' });
  X.show(div, 4, { type: 'fade' });
  const grT = X.text(3620, 250, "Grover's algorithm only weakens", { size: 30, anchor: 'middle', serif: true, w: 700, fill: C.plum });
  X.show(grT, 4, { type: 'down' });
  const aes = [['AES-128', 3420, 128, 8, C.red], ['AES-256', 3820, 256, 16, C.green]];
  aes.forEach(([n, x, bits, thick, col], i) => {
    const g = X.g();
    const pl = padlock(g, x, 450, i ? 1.05 : 0.9, { fill: C.ochreL, thick });
    X.text(x, 600, n, { parent: g, size: 30, anchor: 'middle', mono: true, w: 700 });
    E('rect', { x: x - 150, y: 630, width: 300, height: 28, rx: 10, fill: C.sand }, g);
    const bar = E('rect', { x: x - 150, y: 630, width: 0, height: 28, rx: 10, fill: col }, g);
    const lab = X.text(x, 700, '', { parent: g, size: 24, anchor: 'middle', w: 700, fill: col });
    X.each(() => {
      const p = X.P(4, 0.3, 0, 1.2);
      const v = lerp(bits, bits / 2, p);
      bar.setAttribute('width', (300 * v / 256).toFixed(1));
      lab.set(Math.round(v) + '-bit strength' + (p > 0.98 ? (i ? ': still strong' : ': too weak') : ''));
      pl.body.setAttribute('fill', p > 0.9 && !i ? C.redL : C.ochreL);
    });
    X.show(g, 4, { f: 0.1 + i * 0.15, type: 'up' });
  });
  const mv = X.arrow(3520, 470, 3700, 470, { color: C.green, sw: 5 });
  X.show(mv, 4, { f: 0.75, type: 'draw' });
  const moved = X.chip(3620, 780, 'Aran moved to AES-256', { size: 28, color: C.green, fill: C.greenL });
  X.show(moved, 4, { f: 0.8, type: 'pop' });
  X.term(4, "Grover's algorithm", 'A quantum method that only weakens locks like AES.\nA longer key is enough to stay safe.', { until: 4, outf: 0.55, color: C.plum });
  X.term(4, 'AES-256', 'The standard lock for stored data, with a\n256-bit key: still strong against quantum.', { f: 0.58, until: 5 });

  // ================= Panel C: harvest now, decrypt later (centre 5000,540) =================
  const ph = X.icon('phone', 4280, 330, 0.8);
  const bk = X.icon('bank', 5720, 330, 0.9);
  const cTop = X.g(); cTop.appendChild(ph); cTop.appendChild(bk);
  X.text(4280, 430, 'customer', { parent: cTop, size: 24, anchor: 'middle', fill: C.ink2 });
  X.text(5720, 430, 'bank', { parent: cTop, size: 24, anchor: 'middle', fill: C.ink2 });
  X.show(cTop, 5, { type: 'fade' });
  const lineSp = spline([[4340, 330], [5000, 300], [5640, 330]]);
  const tl = X.path(lineSp.d, { color: C.line, sw: 4 });
  X.show(tl, 5, { type: 'draw' });
  X.stream(lineSp, {
    n: 6, speed: 0.3, k0: 5, f0: 0.1,
    make: (g) => { const d = E('g', null, g); E('rect', { x: -22, y: -16, width: 44, height: 32, rx: 6, fill: C.blueL, stroke: C.blue, 'stroke-width': 2.5 }, d); E('path', { d: 'M-7,-16 L-7,-24 Q-7,-31 0,-31 Q7,-31 7,-24 L7,-16', fill: 'none', stroke: C.blue, 'stroke-width': 3 }, d); return d; }
  });
  // attacker with a tape recorder copying traffic
  const atk = X.person(4560, 860, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.95 });
  X.show(atk, 5, { f: 0.15, type: 'left' });
  const rec = X.g();
  X.rect(4700, 600, 280, 150, { parent: rec, fill: C.sand, stroke: C.ink, r: 14, sw: 4 });
  const reels = [4775, 4905].map(x => {
    E('circle', { cx: x, cy: 660, r: 40, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, rec);
    const sp = E('g', null, rec);
    for (let a = 0; a < 3; a++) E('line', { x1: x, y1: 660, x2: x + 30 * Math.cos(a * 2.094), y2: 660 + 30 * Math.sin(a * 2.094), stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, sp);
    E('circle', { cx: x, cy: 660, r: 8, fill: C.ink }, rec);
    X.spin(sp, x, 660, { speed: 140 });
    return sp;
  });
  E('circle', { cx: 4950, cy: 725, r: 8, fill: C.red }, rec);
  X.text(4840, 735, 'REC', { parent: rec, size: 22, anchor: 'middle', w: 800, fill: C.red });
  X.show(rec, 5, { f: 0.25, type: 'pop' });
  const tap = X.arrow(4840, 320, 4840, 590, { color: C.red, sw: 4, dash: null });
  X.show(tap, 5, { f: 0.3, type: 'draw' });
  X.stream(spline([[4840, 330], [4840, 590]]), { n: 3, speed: 0.6, r: 7, color: C.red, k0: 5, f0: 0.4 });
  // shelf of tapes
  const shelf = X.g();
  E('rect', { x: 5100, y: 780, width: 520, height: 16, rx: 4, fill: C.ink2 }, shelf);
  X.text(5360, 830, 'kept for later', { parent: shelf, size: 24, anchor: 'middle', fill: C.ink2 });
  X.show(shelf, 5, { f: 0.4, type: 'fade' });
  const tapes = [];
  for (let i = 0; i < 6; i++) {
    const g = X.g(shelf);
    const x = 5120 + i * 82;
    X.rect(x, 680, 72, 100, { parent: g, fill: C.blueL, stroke: C.ink, r: 8, sw: 3 });
    E('circle', { cx: x + 22, cy: 715, r: 10, fill: C.card, stroke: C.ink, 'stroke-width': 2 }, g);
    E('circle', { cx: x + 50, cy: 715, r: 10, fill: C.card, stroke: C.ink, 'stroke-width': 2 }, g);
    const lk = E('g', null, g);
    const pl = padlock(lk, x + 36, 760, 0.16, { fill: C.blueL, thick: 16 });
    X.show(g, 5, { f: 0.45 + i * 0.08, type: 'down' });
    tapes.push({ pl, x });
  }
  // calendar flipping 2026 -> 2035
  const cal = X.g();
  X.rect(4900, 150, 200, 190, { parent: cal, fill: C.card, r: 12, shadow: true });
  E('rect', { x: 4900, y: 150, width: 200, height: 46, rx: 12, fill: C.red }, cal);
  E('rect', { x: 4900, y: 180, width: 200, height: 16, fill: C.red }, cal);
  X.text(5000, 182, 'YEAR', { parent: cal, size: 22, anchor: 'middle', w: 800, fill: C.card });
  const yrIn = X.g(cal);
  const yr = X.text(5000, 290, '2026', { parent: yrIn, size: 56, anchor: 'middle', serif: true, w: 700 });
  X.show(cal, 5, { f: 0.2, type: 'pop' });
  X.each(t => {
    const p = X.L(6, 0.05, 0.6);
    const n = Math.round(2026 + 9 * p);
    yr.set(String(n));
    const fl = (p > 0 && p < 1) ? Math.abs(Math.cos(p * 9 * Math.PI)) : 1;
    yrIn.setAttribute('transform', `translate(0 245) scale(1 ${Math.max(0.1, fl).toFixed(3)}) translate(0 -245)`);
  });
  const qcC = X.g(); cryostat(qcC, 5900, 470, 0.45);
  X.show(qcC, 6, { f: 0.55, type: 'down' });
  const bmC = beam(5880, 720, 5600, 700);
  X.show(bmC, 6, { f: 0.7, type: 'draw', len: 0.5 });
  X.each(() => tapes.forEach((tp, i) => {
    const o = X.P(6, 0.75 + i * 0.03, 0, 0.4);
    tp.pl.sh.setAttribute('transform', `translate(0 ${(-40 * o).toFixed(1)})`);
    tp.pl.body.setAttribute('fill', o > 0.5 ? C.redL : C.blueL);
  }));
  X.term(6, 'Harvest now, decrypt later', 'Recording locked data today, to unlock it\nyears later with a quantum computer.', { until: 7, color: C.red });

  // ================= Panel D: erased key comes back (centre 7000,540) =================
  const vault = X.box(6200, 300, 340, 170, { label: 'Vault', sub: 'holds Ravi\'s key', size: 36, serif: true, fill: C.card });
  const backup = X.box(7460, 300, 340, 170, { label: 'Backup site', sub: 'a spare copy', size: 36, serif: true, fill: C.card });
  X.show(vault, 7, { type: 'left' }); X.show(backup, 7, { type: 'right' });
  const vkey = X.icon('key', 6370, 540, 0.8);
  X.show(vkey, 7, { f: 0.1, type: 'pop' });
  const ex = X.arrow(6560, 385, 7440, 385, { color: C.blue, sw: 5 });
  X.show(ex, 7, { f: 0.15, type: 'draw' });
  const exL = X.text(7000, 360, "sent with today's key exchange", { size: 24, anchor: 'middle', fill: C.blue });
  X.show(exL, 7, { f: 0.2, type: 'fade' });
  const flyKey = X.g(); X.icon('key', 0, 0, 0.45, { parent: flyKey });
  X.show(flyKey, 7, { f: 0.15, type: 'fade', len: 0.2, out: 7, outf: 0.4, outLen: 0.2 });
  X.travel(flyKey, spline([[6580, 420], [7000, 430], [7420, 420]]), 7, { f0: 0.15, f1: 0.4 });
  const rec2 = X.g();
  X.rect(6900, 520, 200, 110, { parent: rec2, fill: C.blueL, stroke: C.ink, r: 10, sw: 3 });
  E('circle', { cx: 6955, cy: 565, r: 20, fill: C.card, stroke: C.ink, 'stroke-width': 3 }, rec2);
  E('circle', { cx: 7045, cy: 565, r: 20, fill: C.card, stroke: C.ink, 'stroke-width': 3 }, rec2);
  X.text(7000, 615, 'recording', { parent: rec2, size: 22, anchor: 'middle', w: 700, fill: C.red });
  X.show(rec2, 7, { f: 0.25, type: 'pop' });
  const tap2 = X.arrow(7000, 400, 7000, 512, { color: C.red, sw: 4 });
  X.show(tap2, 7, { f: 0.25, type: 'draw' });
  // erasure: the key in the vault is shredded
  const erase = X.g();
  X.icon('trash', 6370, 720, 0.7, { parent: erase, fill: C.sand });
  X.text(6370, 820, 'key destroyed: erased', { parent: erase, size: 24, anchor: 'middle', w: 700 });
  X.show(erase, 7, { f: 0.45, type: 'up' });
  X.each(() => {
    const p = X.P(7, 0.5, 0, 0.6);
    vkey.mid.setAttribute('transform', `translate(0 ${(150 * p).toFixed(1)}) rotate(${(70 * p).toFixed(1)} 6370 540)`);
    vkey.style.opacity = X.t < X.at(7, 0.1) ? 0 : (1 - clamp((X.P(7, 0.5, 0, 0.6) - 0.7) / 0.3)).toFixed(2);
  });
  // years later the recording is broken: the key returns
  const qcD = X.g(); cryostat(qcD, 7560, 560, 0.4);
  X.show(qcD, 7, { f: 0.7, type: 'down' });
  const back = X.g();
  X.icon('key', 7000, 760, 0.8, { parent: back, fill: C.redL });
  X.text(7000, 850, 'the key comes back', { parent: back, size: 28, anchor: 'middle', w: 700, fill: C.red });
  X.show(back, 7, { f: 0.85, type: 'pop' });
  const backArrow = X.arrow(7000, 640, 7000, 700, { color: C.red, sw: 4 });
  X.show(backArrow, 7, { f: 0.82, type: 'draw' });
  X.term(7, 'Backup', 'A spare copy kept in a second place,\nin case the first one is lost.', { until: 8, color: C.blue });

  // ================= Panel E: 100% came back (centre 9000,540) =================
  const cells = (x0, y0, parent) => {
    const arr = [];
    for (let i = 0; i < 20; i++) {
      const x = x0 + (i % 5) * 92, y = y0 + Math.floor(i / 5) * 92;
      arr.push(E('rect', { x, y, width: 78, height: 78, rx: 10, fill: C.sand, stroke: C.line, 'stroke-width': 2 }, parent));
    }
    return arr;
  };
  const E1 = X.g();
  X.text(9000, 220, 'Simulation: erased values, after a quantum break', { parent: E1, size: 36, anchor: 'middle', serif: true, w: 700 });
  const c1 = cells(8540, 300, E1);
  const pct1 = X.text(9000, 760, '0%', { parent: E1, size: 80, anchor: 'middle', w: 800, fill: C.red, serif: true });
  X.text(9000, 830, 'came back: the erasure is undone', { parent: E1, size: 30, anchor: 'middle', fill: C.ink2 });
  X.show(E1, 8, { type: 'fade' });
  X.each(() => {
    const p = X.L(8, 0.15, 0.7);
    c1.forEach((r, i) => { const on = p * 20 > i; r.setAttribute('fill', on ? C.redL : C.sand); r.setAttribute('stroke', on ? C.red : C.line); });
    pct1.set(Math.round(100 * p) + '%');
  });

  // ================= Panel F: hybrid door (centre 11000,540) =================
  const door = X.g();
  X.rect(10780, 200, 440, 640, { parent: door, fill: C.sand, stroke: C.ink, r: 10, sw: 6 });
  X.rect(10820, 240, 360, 260, { parent: door, fill: C.paper, stroke: C.ink2, r: 6, sw: 3 });
  X.rect(10820, 540, 360, 260, { parent: door, fill: C.paper, stroke: C.ink2, r: 6, sw: 3 });
  X.show(door, 9, { type: 'fade' });
  const oldL = padlock(X.g(), 10900, 520, 0.85, { fill: C.blueL });
  const newL = padlock(X.g(), 11100, 520, 0.85, { fill: C.tealL, thick: 16 });
  const lockG = X.g(); lockG.appendChild(oldL.g); const newW = E('g', null, lockG); newW.appendChild(newL.g);
  X.show(lockG, 9, { f: 0.15, type: 'pop' });
  const lbOld = X.text(10680, 520, "today's lock", { size: 26, anchor: 'end', fill: C.blue, w: 700 });
  const lbNew = X.text(11320, 520, 'quantum-safe lock', { size: 26, fill: C.teal, w: 700 });
  X.show(lbOld, 9, { f: 0.2, type: 'left' }); X.show(lbNew, 9, { f: 0.3, type: 'right' });
  const thief = X.person(10350, 860, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.9 });
  X.show(thief, 9, { f: 0.4, type: 'left' });
  X.each(t => thief.mood(t > X.at(9, 0.8) ? 'sad' : 'neutral'));
  const qcF = X.g(); cryostat(qcF, 10380, 170, 0.32);
  X.show(qcF, 9, { f: 0.45, type: 'down' });
  const bmF = beam(10420, 370, 10850, 480);
  X.show(bmF, 9, { f: 0.55, type: 'draw', len: 0.5 });
  const bmF2 = beam(10420, 370, 11040, 480);
  X.show(bmF2, 9, { f: 0.72, type: 'draw', len: 0.5, out: 10 });
  X.each(() => {
    const o = X.P(9, 0.65, 0, 0.5);
    oldL.sh.setAttribute('transform', `translate(0 ${(-38 * o).toFixed(1)})`);
    oldL.body.setAttribute('fill', o > 0.5 ? C.redL : C.blueL);
  });
  X.shake(newW, 9, { f: 0.78, amp: 6 });
  const holds = X.chip(11000, 140 + 740, 'the door stays shut', { size: 28, color: C.green, fill: C.greenL });
  X.show(holds, 9, { f: 0.85, type: 'pop', out: 10 });
  X.term(9, 'Hybrid cryptography', 'Using an old lock and a new quantum-safe lock\ntogether, so a thief must break both.', { until: 10, color: C.teal });
  // line 10: names of the locks
  const pairs = X.g();
  const rows = [['agree on keys', 'X25519', 'ML-KEM-768'], ['sign messages', 'Ed25519', 'ML-DSA-65']];
  rows.forEach(([what, a, b], i) => {
    const y = 300 + i * 220;
    const g = X.g(pairs);
    X.text(11850, y, what, { parent: g, size: 28, anchor: 'middle', fill: C.ink2, w: 700 });
    X.chip(11720, y + 70, a, { parent: g, size: 30, mono: true, color: C.blue, fill: C.blueL });
    X.text(11850, y + 82, '+', { parent: g, size: 40, anchor: 'middle', w: 800 });
    X.chip(12010, y + 70, b, { parent: g, size: 30, mono: true, color: C.teal, fill: C.tealL });
    X.show(g, 10, { f: 0.08 + i * 0.25, type: 'left' });
  });
  const stamp = X.g();
  const stIn = X.g(stamp);
  X.rect(11700, 760, 320, 80, { parent: stIn, fill: 'none', stroke: C.teal, r: 10, sw: 4 });
  X.text(11860, 812, 'standards, 2024', { parent: stIn, size: 30, anchor: 'middle', w: 800, fill: C.teal });
  stIn.setAttribute('transform', 'rotate(-6 11860 800)');
  X.show(stamp, 10, { f: 0.65, type: 'pop' });
  X.term(10, 'ML-KEM and ML-DSA', 'New quantum-safe methods for agreeing on keys\nand for signing, published as standards in 2024.', { until: 11, color: C.teal });

  // ================= Panel G: 100% vs 0% (centre 13300,540) =================
  const G1 = X.g();
  X.text(13300, 220, 'Erased values that came back', { parent: G1, size: 36, anchor: 'middle', serif: true, w: 700 });
  X.show(G1, 11, { type: 'down' });
  const L1 = X.g();
  X.text(12860, 300, "today's lock only", { parent: L1, size: 28, anchor: 'middle', fill: C.blue, w: 700 });
  const cl = cells(12650, 330, L1); cl.forEach(r => { r.setAttribute('fill', C.redL); r.setAttribute('stroke', C.red); });
  X.text(12860, 760, '100%', { parent: L1, size: 64, anchor: 'middle', w: 800, fill: C.red, serif: true });
  X.show(L1, 11, { type: 'left' });
  const L2 = X.g();
  X.text(13740, 300, 'hybrid locks', { parent: L2, size: 28, anchor: 'middle', fill: C.teal, w: 700 });
  const c2 = cells(13530, 330, L2);
  const pct2 = X.text(13740, 760, '0%', { parent: L2, size: 64, anchor: 'middle', w: 800, fill: C.green, serif: true });
  X.show(L2, 11, { f: 0.2, type: 'right' });
  X.each(t => { const sc = X.L(11, 0.3, 0.9); c2.forEach((r, i) => r.setAttribute('stroke', sc * 20 > i && sc * 20 < i + 2 ? C.teal : C.line)); });
  const stays = X.chip(13740, 840, 'erasure stays permanent', { size: 26, color: C.green, fill: C.greenL });
  X.show(stays, 11, { f: 0.7, type: 'up' });

  // ================= Panel H: the CBOM receipt (centre 15000,540) =================
  const printer = X.g();
  X.rect(14660, 170, 520, 90, { parent: printer, fill: C.ink2, stroke: C.ink, r: 16, sw: 3 });
  E('rect', { x: 14700, y: 240, width: 440, height: 14, rx: 4, fill: C.ink }, printer);
  E('circle', { cx: 15140, cy: 205, r: 9, fill: C.green }, printer);
  X.show(printer, 12, { type: 'down' });
  const paperClip = E('clipPath', { id: 'cbomclip' }, X.g());
  const clipR = E('rect', { x: 14700, y: 250, width: 440, height: 0 }, paperClip);
  const paper = X.g();
  paper.setAttribute('clip-path', 'url(#cbomclip)');
  X.rect(14710, 250, 420, 650, { parent: paper, fill: C.card, stroke: C.line, r: 0 });
  X.text(14920, 300, 'CBOM', { parent: paper, size: 36, anchor: 'middle', serif: true, w: 800 });
  X.text(14920, 334, 'every lock Aran uses', { parent: paper, size: 22, anchor: 'middle', fill: C.ink2 });
  E('line', { x1: 14730, y1: 352, x2: 15110, y2: 352, stroke: C.ink3, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, paper);
  const items = [['AES-256-GCM', 'vault entries'], ['FF1 on AES-256', 'tokens'], ['HMAC-SHA-256', 'keyed labels'], ['SHA-256', 'erasure log'], ['Ed25519 + ML-DSA-65', 'receipts'], ['X25519 + ML-KEM-768', 'key backups']];
  items.forEach(([a, b], i) => {
    const y = 396 + i * 80;
    X.text(14735, y, a, { parent: paper, size: 22, mono: true, w: 700 });
    X.text(14735, y + 30, b, { parent: paper, size: 22, fill: C.ink2 });
    X.mark(15095, y + 4, true, { parent: paper, s: 14 });
  });
  X.show(paper, 12, { type: 'fade', len: 0.2 });
  X.each(() => clipR.setAttribute('height', (650 * X.L(12, 0.05, 0.85)).toFixed(1)));
  const road = X.g();
  X.icon('file', 15500, 470, 0.9, { parent: road, fill: C.ochreL });
  X.text(15500, 580, "India's banking", { parent: road, size: 26, anchor: 'middle', w: 700 });
  X.text(15500, 614, 'roadmap asks for it', { parent: road, size: 26, anchor: 'middle', w: 700 });
  X.show(road, 12, { f: 0.7, type: 'left' });
  X.term(12, 'CBOM', 'Cryptography bill of materials: a list of every\nlock and key method a system uses.', { until: 13 });

  X.recap(13, ["Quantum could break today's key exchange", 'Recorded traffic could undo erasure', 'Aran uses hybrid locks: erasure stays permanent']);

  X.cam([
    { x: 620, y: 500, s: 1.18 },
    { k: 1, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 2, x: 1000, y: 520, s: 1.02, len: 1.2 },
    { k: 3, x: 2700, y: 520, s: 1.12, len: 2 },
    { k: 4, x: 3300, y: 520, s: 1.08, len: 1.6 },
    { k: 5, x: 5000, y: 540, s: 1, len: 2 },
    { k: 6, f: 0.5, x: 5150, y: 540, s: 1.0, len: 1.6 },
    { k: 7, x: 7000, y: 540, s: 1, len: 2 },
    { k: 8, x: 9000, y: 540, s: 1, len: 1.8 },
    { k: 9, x: 10900, y: 540, s: 1.05, len: 1.8 },
    { k: 10, x: 11400, y: 540, s: 1, len: 1.4 },
    { k: 11, x: 13300, y: 540, s: 1, len: 1.8 },
    { k: 12, x: 15050, y: 540, s: 1, len: 1.8 }
  ]);
});
