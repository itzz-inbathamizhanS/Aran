// A normal firewall is a guard at a gate; Aran reads the letters and swaps the sensitive chips for tokens.
scene('firewall', X => {
  X.cam([{ x: 960, y: 560, s: 1.2 }, { k: 1, x: 960, y: 560, s: 1.0, len: 1.6 }, { k: 2, f: 0.55, x: 1250, y: 470, s: 1.2 },
    { k: 3, x: 960, y: 540, s: 1.0 }, { k: 4, x: 960, y: 480, s: 1.1 }, { k: 5, x: 960, y: 560, s: 1.0 },
    { k: 6, x: 960, y: 520, s: 1.05 }, { k: 7, x: 1100, y: 520, s: 1.05 }]);

  // walking helper: keys [{k, f, x}] -> x over time; faces the way it walks; hops while moving
  const walk = (p, y, s, keys, o = {}) => {
    const xAt = t => {
      let x = keys[0].x;
      for (const kf of keys.slice(1)) { const q = ease(clamp((t - X.at(kf.k, kf.f || 0)) / (kf.len || 1.6))); x = lerp(x, kf.x, q); }
      return x;
    };
    X.each(t => {
      const x = xAt(t), dx = x - xAt(t - 0.05);
      const moving = Math.abs(dx) > 0.3;
      if (moving) p._dir = dx > 0 ? 1 : -1;
      const dir = o.face && !moving ? o.face(t) : (p._dir || 1);
      const hop = moving ? Math.abs(Math.sin(t * 9)) * 7 : 0;
      p.g.setAttribute('transform', `translate(${x.toFixed(1)},${(y - hop).toFixed(1)}) scale(${dir * s},${s})`);
      if (o.carry) o.carry(x, y - hop, dir, t);
    });
  };

  // ---- cue 0: a brick wall
  const groundY = 770;
  const W = X.g();
  const gapBricks = X.g();
  for (let row = 0; row < 6; row++) {
    const y = groundY - 40 - row * 40;
    for (let i = 0; i < 14; i++) {
      const x = 400 + i * 80 + (row % 2 ? 40 : 0);
      if (x + 80 > 1530) continue;
      const inGap = x + 80 > 880 && x < 1040;
      const b = X.rect(x, y, 80, 40, { parent: inGap ? gapBricks : W, fill: row % 2 ? C.redL : C.ochreL, stroke: C.red, sw: 2, r: 3 });
      X.show(b, 0, { f: 0.05 + row * 0.1 + i * 0.008, type: 'down', len: 0.4, dist: 40 });
    }
  }
  X.show(X.wrap(gapBricks), 0, { type: 'fade', len: 0.1, out: 1, outf: 0.02, outLen: 0.5 });
  const fwL = X.text(960, 430, 'firewall', { size: 64, anchor: 'middle', serif: true, w: 600 });
  X.show(fwL, 0, { f: 0.4, type: 'up', out: 1, outLen: 0.4 });
  X.term(0, 'Firewall', 'A security system that decides which\nconnections may come in and which are stopped.', { until: 2 });
  const WG = X.g(); WG.appendChild(W); WG.appendChild(gapBricks.parentNode);
  X.show(WG, 0, { type: 'fade', len: 0.2, out: 3, outLen: 0.6 });

  // ---- cue 1-2: a guard at the gate
  const G = X.g();
  X.show(G, 1, { type: 'fade', out: 3, outLen: 0.6 });
  X.rect(850, groundY - 300, 40, 300, { parent: G, fill: C.sand, stroke: C.ink, sw: 4, r: 4 });
  X.rect(1030, groundY - 300, 40, 300, { parent: G, fill: C.sand, stroke: C.ink, sw: 4, r: 4 });
  E('line', { x1: 120, y1: groundY + 4, x2: 1800, y2: groundY + 4, stroke: C.line, 'stroke-width': 4 }, G);
  const guard = X.person(1140, groundY, { parent: G, shirt: C.ink, badge: true, skin: C.skin[0], s: 0.9 });
  walk(guard, groundY, 0.9, [{ x: 1140 }], { face: () => -1 });
  X.each(t => {
    const check = [[1, 0.3, 0.45], [1, 0.72, 0.9], [2, 0.12, 0.3]].some(([k, a, b]) => t > X.at(k, a) && t < X.at(k, b));
    X.arms(guard, 8, lerp(-8, 80, check ? 1 : 0));
    guard.mood(t > X.at(1, 0.75) && t < X.at(2) ? 'neutral' : 'happy');
  });
  // visitor 1 (vendor staff) is let in
  const v1 = X.person(150, groundY, { parent: G, shirt: C.teal, skin: C.skin[1], s: 0.85, ph: 1 });
  walk(v1, groundY, 0.85, [{ x: 150 }, { k: 1, f: 0.08, x: 760, len: 2.2 }, { k: 1, f: 0.45, x: 1650, len: 2.6 }]);
  const ok1 = X.mark(960, 400, true, { parent: G, s: 34 });
  X.show(ok1, 1, { f: 0.33, type: 'pop', out: 1, outf: 0.55, outLen: 0.3 });
  // attacker is stopped
  const att = X.person(120, groundY, { parent: G, shirt: C.ink2, skin: C.skin[3], hood: C.ink, s: 0.85 });
  E('path', { d: 'M-24,-212 L24,-212 L22,-198 L4,-198 L0,-204 L-4,-198 L-22,-198 Z', fill: C.ink }, att.body);
  walk(att, groundY, 0.85, [{ x: -100 }, { k: 1, f: 0.5, x: 760, len: 2.0 }, { k: 1, f: 0.88, x: 300, len: 1.4 }, { k: 2, f: 0.0, x: -150, len: 1.2 }]);
  const no1 = X.mark(960, 400, false, { parent: G, s: 34 });
  X.show(no1, 1, { f: 0.75, type: 'pop', out: 2, outLen: 0.3 });
  X.shake(no1, 1, { f: 0.8 });
  // visitor 2 (clerk) carries a letter: who is checked, what is not
  const env = X.g(G); X.icon('envelope', 0, 0, 0.42, { parent: env });
  const v2 = X.person(-120, groundY, { parent: G, shirt: C.plum, skin: C.skin[2], long: true, s: 0.85, ph: 2 });
  walk(v2, groundY, 0.85, [{ x: -120 }, { k: 1, f: 0.85, x: 760, len: 2.0 }, { k: 2, f: 0.35, x: 1500, len: 2.2 }], {
    carry: (x, y, dir, t) => { X.arms(v2, 8, 55); env.setAttribute('transform', `translate(${(x + dir * 95).toFixed(1)} ${(y - 118).toFixed(1)})`); }
  });
  const who = X.chip(960, 360, 'who: Asha, bank staff', { parent: G, size: 26, color: C.green, fill: C.greenL, stroke: C.green });
  X.show(who, 2, { f: 0.1, type: 'pop', out: 3, outLen: 0.4 });
  // the letter opens: nobody looked inside
  const open = X.g(G); const openIn = X.g(open);
  X.rect(1230, 240, 470, 230, { parent: openIn, fill: C.card, stroke: C.ink2, r: 12, shadow: true });
  X.text(1260, 290, 'inside the letter:', { parent: openIn, size: 26, fill: C.ink2 });
  X.chip(1465, 350, 'Aadhaar 2345 6789 0124', { parent: openIn, size: 26, mono: true, color: C.red, fill: C.redL, stroke: C.red });
  X.text(1465, 430, 'what: never checked', { parent: openIn, size: 28, anchor: 'middle', fill: C.red, w: 700 });
  X.show(open, 2, { f: 0.58, type: 'pop', out: 3, outLen: 0.4 });

  // ---- cue 3 onwards: Aran, the firewall for data
  const A = X.g();
  X.show(A, 3, { type: 'fade', len: 0.8 });
  const py = 700;
  X.rect(250, py - 26, 1420, 52, { parent: A, fill: C.blueL, stroke: C.ink2, sw: 3, r: 26 });
  const src = X.g(A); X.icon('server', 150, py, 0.8, { parent: src }); X.text(150, py + 90, 'bank programs', { parent: src, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  const snk = X.g(A); X.icon('log', 1760, py, 0.75, { parent: snk }); X.text(1760, py + 90, 'Log platform', { parent: snk, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  const gear = X.icon('gear', 1830, py - 70, 0.4, { parent: A });
  X.spin(gear.mid, 1830, py - 70, { speed: 90 });
  // the scanner
  const scan = X.g(A);
  X.rect(860, py - 110, 200, 220, { parent: scan, fill: C.tealL, stroke: C.teal, sw: 5, r: 20, shadow: true });
  X.icon('shield', 960, py - 30, 0.6, { parent: scan, check: true });
  X.text(960, py + 75, 'Aran', { parent: scan, size: 34, anchor: 'middle', serif: true, w: 600, fill: C.teal });
  X.show(scan, 3, { f: 0.2, type: 'pop' });
  X.term(3, 'Data firewall', 'A checkpoint that reads what is inside each\nmessage, not just who sent it.', { until: 5 });
  const mkEnv = (fill, chip) => g => { const e = X.g(g); X.icon('envelope', 0, 0, 0.4, { parent: e }); E('rect', { x: -14, y: -4, width: 28, height: 14, rx: 4, fill: chip, stroke: C.ink, 'stroke-width': 1.5 }, e); return e; };
  const inSp = spline([[260, py], [560, py], [860, py]]), outSp = spline([[1060, py], [1360, py], [1660, py]]);
  X.stream(inSp, { parent: A, n: 3, speed: 0.33, k0: 4, f0: 0.05, make: mkEnv(C.card, C.red) });
  // before cue 6 the leaving letters still carry red chips; afterwards green
  const outRed = X.stream(outSp, { parent: A, n: 3, speed: 0.33, k0: 4, f0: 0.05, k1: 6, f1: 0.4, make: mkEnv(C.card, C.red) });
  const outGreen = X.stream(outSp, { parent: A, n: 3, speed: 0.33, k0: 6, f0: 0.4, make: mkEnv(C.card, C.green) });
  // the letter being read
  const L = X.g(A); const Lin = X.g(L);
  X.rect(660, 200, 600, 320, { parent: Lin, fill: C.card, stroke: C.ink2, r: 14, shadow: true });
  X.text(700, 252, 'Loan application', { parent: Lin, size: 32, serif: true, w: 600 });
  X.text(700, 312, 'Amount', { parent: Lin, size: 26, fill: C.ink2 });
  X.text(850, 312, '₹ 50,000', { parent: Lin, size: 28, mono: true });
  X.text(700, 380, 'Aadhaar', { parent: Lin, size: 26, fill: C.ink2 });
  X.text(700, 448, 'Status', { parent: Lin, size: 26, fill: C.ink2 });
  X.text(850, 448, 'approved', { parent: Lin, size: 28, mono: true });
  const red = X.g(Lin); X.chip(1010, 371, '2345 6789 0124', { parent: red, size: 28, mono: true, color: C.red, fill: C.redL, stroke: C.red });
  const grn = X.g(Lin); X.chip(1010, 371, '0196 3809 2692', { parent: grn, size: 28, mono: true, color: C.green, fill: C.greenL, stroke: C.green });
  X.show(L, 4, { f: 0.1, type: 'up' });
  const beam = E('rect', { x: 668, y: 0, width: 584, height: 6, rx: 3, fill: C.teal, opacity: 0.6 }, Lin);
  X.each(t => {
    const on = X.on(4, 6, 0.5);
    beam.style.display = on ? '' : 'none';
    if (on) beam.setAttribute('y', (225 + ((t * 0.45) % 1) * 270).toFixed(1));
    // flip the chip from red to green at cue 6
    const p = clamp((t - X.at(6, 0.4)) / 0.5);
    const sy = p < 0.5 ? 1 - 2 * p : 2 * p - 1;
    red.style.display = p < 0.5 ? '' : 'none'; grn.style.display = p >= 0.5 ? '' : 'none';
    const g2 = p < 0.5 ? red : grn;
    g2.setAttribute('transform', `translate(0 371) scale(1 ${Math.max(0.02, sy).toFixed(3)}) translate(0 -371)`);
    // at cue 7 the whole letter rides on to the sink
    const m = ease(clamp((t - X.at(7, 0.05)) / 1.6));
    Lin.setAttribute('transform', `translate(${(m * 520).toFixed(1)} ${(m * 10).toFixed(1)})`);
  });
  const dash = X.path(`M960,520 L960,${py - 110}`, { parent: A, color: C.teal, sw: 3, dash: '4 8' });
  X.show(dash, 4, { f: 0.1, type: 'fade', out: 7, outLen: 0.4 });
  const sensL = X.chip(960, 568, 'sensitive detail found', { parent: A, size: 24, color: C.red, fill: C.redL, stroke: C.red });
  X.show(sensL, 6, { f: 0.05, type: 'pop', out: 6, outf: 0.5, outLen: 0.3 });
  const swapL = X.chip(960, 568, 'swapped for a safe look-alike', { parent: A, size: 24, color: C.green, fill: C.greenL, stroke: C.green });
  X.show(swapL, 6, { f: 0.55, type: 'pop', out: 7, outLen: 0.3 });
  // cue 5: never blocked
  const flowOn = X.g(A);
  X.rect(380, 820, 340, 60, { parent: flowOn, fill: C.greenL, stroke: C.green, r: 30 });
  X.text(550, 860, 'never blocked', { parent: flowOn, size: 28, anchor: 'middle', fill: C.green, w: 700 });
  X.show(flowOn, 5, { f: 0.1, type: 'pop' });
  const cnt = X.text(1360, 862, '', { parent: A, size: 28, anchor: 'middle', fill: C.ink2, w: 600 });
  X.each(t => cnt.set(t > X.at(5, 0.2) ? 'messages passed: ' + fmtUS((t - X.at(5, 0.2)) * 41) : ''));
  // cue 7: the sink gets what it needs, but nothing real
  const res = X.g(A);
  X.mark(1260, 575, true, { parent: res, s: 24 });
  X.text(1300, 585, 'works as before', { parent: res, size: 26, w: 600, fill: C.green });
  X.icon('lock', 1540, 568, 0.32, { parent: res });
  X.text(1580, 585, 'no real details', { parent: res, size: 26, w: 600, fill: C.teal });
  X.show(res, 7, { f: 0.45, type: 'up' });

  X.recap(8, ['A normal firewall stops connections', 'Aran lets messages through', 'but replaces the sensitive details inside']);
});
