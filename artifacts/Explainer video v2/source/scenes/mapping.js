// From gaps to ideas: six holes on the left; a matching patch (mechanism card) flies in from Aran on the right and seals each one.
scene('mapping', X => {
  const rows = [
    { gap: 'False alarms', icon: 'alert', mech: 'Detection as evidence', sub: 'check digits, clues and the bank\'s own lists', mi: 'magnifier' },
    { gap: 'Look-alike leaks', icon: 'idcard', mech: 'Tokens that always fail the check', sub: 'a token can never pass for a real number', mi: 'key' },
    { gap: 'Leaky masks', icon: 'unlock', mech: 'Leakage ledger', sub: 'counts how much each mask gives away', mi: 'log' },
    { gap: 'Unknown leakers', icon: 'file', mech: 'A different token for every destination', sub: 'a leaked token points to who leaked it', mi: 'building' },
    { gap: 'Erasure misses copies', icon: 'trash', mech: 'One key per customer, per purpose', sub: 'destroy the key, get a signed receipt', mi: 'key' },
    { gap: 'OTPs: no structure', icon: 'phone', mech: 'Remember every OTP sent', sub: 'each OTP tied to the request it answers', mi: 'clock' }
  ].map((r, i) => Object.assign(r, { i, k: i + 1, cy: 182 + i * 100 }));
  X.cam([{ x: 900, y: 500, s: 1.1 }, { k: 0, f: 0.3, x: 935, y: 510, s: 1.0, len: 2.5 },
    ...rows.map(r => ({ k: r.k, x: 935 + (r.i % 2 ? 8 : -8), y: 470 + r.i * 9, s: 1.03, len: 1.3 })),
    { k: 7, x: 935, y: 505, s: 0.99, len: 1.6 }]);

  // ---------- the wall with six holes ----------
  const wall = X.g();
  const patches = X.g(), labels = X.g();
  rows.forEach(r => {
    const y0 = r.cy - 48;
    X.rect(70, y0, 540, 96, { parent: wall, fill: C.sand, stroke: C.line, r: 6 });
    for (let j = 0; j < 2; j++) {
      E('line', { x1: 70, y1: y0 + 48, x2: 610, y2: y0 + 48, stroke: C.line, 'stroke-width': 2 }, wall);
      for (let x = 70 + (j ? 50 : 0) + 100; x < 610; x += 100) E('line', { x1: x, y1: y0 + j * 48, x2: x, y2: y0 + j * 48 + 48, stroke: C.line, 'stroke-width': 2 }, wall);
    }
    const hole = E('path', { d: `M110,${r.cy - 30} L180,${r.cy - 38} L300,${r.cy - 32} L420,${r.cy - 38} L560,${r.cy - 31} L566,${r.cy + 30} L440,${r.cy + 37} L300,${r.cy + 31} L170,${r.cy + 38} L104,${r.cy + 30} Z`, fill: C.paper, stroke: C.red, 'stroke-width': 3, 'stroke-dasharray': '10 7' }, wall);
    r.hole = hole;
    const lg = X.g(labels);
    X.icon(r.icon, 152, r.cy, 0.34, { parent: lg, color: C.red });
    r.lab = X.text(196, r.cy + 9, `${r.i + 1}  ${r.gap}`, { parent: lg, size: 26, w: 600, fill: C.red });
  });
  X.show(wall, 0, { type: 'left', len: 0.9 });
  X.show(labels, 0, { f: 0.1, type: 'left', len: 0.9 });

  // ---------- Aran, throwing patches ----------
  const aran = X.g();
  const sh = X.icon('shield', 1730, 470, 1.25, { parent: aran, check: true });
  X.text(1730, 580, 'Aran', { parent: aran, size: 34, anchor: 'middle', serif: true, w: 600 });
  X.show(aran, 0, { f: 0.25, type: 'pop' });
  X.bob(sh.mid, { amp: 6, per: 2.4 });
  X.term(0, 'Mechanism', 'One of Aran\'s main ideas: a working part\nthat closes one gap.', { until: 1 });

  // ---------- one card + one patch per row ----------
  rows.forEach(r => {
    const k = r.k;
    // the card is drawn around (0,0) and flies from the shield to its place
    const fly = X.g();
    const card = X.g(fly);
    X.rect(-400, -44, 800, 88, { parent: card, fill: C.card, stroke: C.green, r: 14, shadow: true, sw: 2.5 });
    E('rect', { x: -400, y: -44, width: 12, height: 88, rx: 5, fill: C.green }, card);
    X.text(-366, -6, r.mech, { parent: card, size: 28, serif: true, w: 600 });
    X.text(-366, 26, r.sub, { parent: card, size: 21, fill: C.ink2 });
    X.icon(r.mi, 345, 0, 0.42, { parent: card, color: C.green });
    const sp = X.spline([[1700, 470], [1500, lerp(470, r.cy, 0.3) - 80], [1240, r.cy - 20], [1080, r.cy]]);
    X.each(t => {
      const p = X.L(k, 0.08, 0.42), q = ease(p);
      const [x, y] = sp.at(q);
      const s = lerp(0.25, 1, q), rot = lerp(-14, 0, q);
      fly.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(3)})`);
      fly.style.display = t >= X.at(k, 0.08) ? '' : 'none';
    });
    // the patch slides from the card onto the hole and seals it
    const pg = X.g(patches);
    const pin = X.g(pg);
    E('rect', { x: -236, y: -42, width: 472, height: 84, rx: 12, fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, pin);
    E('rect', { x: -226, y: -32, width: 452, height: 64, rx: 8, fill: 'none', stroke: C.green, 'stroke-width': 2.5, 'stroke-dasharray': '9 7' }, pin);
    X.each(t => {
      const p = ease(X.L(k, 0.42, 0.62));
      const x = lerp(680, 336, p);
      pg.style.display = t >= X.at(k, 0.42) ? '' : 'none';
      pin.setAttribute('transform', `translate(${x.toFixed(1)} ${r.cy}) scale(${lerp(0.3, 1, p).toFixed(3)} 1)`);
      const sealed = t >= X.at(k, 0.62);
      r.hole.setAttribute('stroke', sealed ? C.green : C.red);
      r.hole.setAttribute('stroke-dasharray', sealed ? 'none' : '10 7');
      r.lab.t.setAttribute('fill', sealed ? C.ink : C.red);
    });
    const tick = X.mark(626, r.cy, true, { s: 20 });
    X.show(tick, k, { f: 0.64, type: 'pop' });
    X.pulse(pg, 336, r.cy, k, { f: 0.62, amt: 0.08, len: 0.6 });
  });
  X.term(1, 'Detection as evidence', 'Each clue adds weight, like evidence in court,\ninstead of one yes-or-no rule.', { until: 2 });
  X.term(3, 'Leakage ledger', 'A running record of how much each masked\nnumber has already given away.', { until: 4 });
  X.term(5, 'Signed receipt', 'Proof, sealed with a digital signature,\nthat the data really was erased.', { until: 6 });

  // ---------- extra layers on top ----------
  const extra = [['AI layer', 'brain', 0.38], ['Normaliser', 'gear', 0.48], ['Immune layer', 'shield', 0.57], ['AI gateway', 'chat', 0.71], ['Quantum-safe locks', 'lock', 0.86]];
  const exl = X.text(960, 768, 'Extra layers on top', { size: 28, anchor: 'middle', serif: true, w: 600, fill: C.ink2 });
  X.show(exl, 7, { f: 0.05, type: 'up' });
  extra.forEach(([name, ic, f], j) => {
    const x = 280 + j * 340;
    const g = X.g();
    X.rect(x - 158, 790, 316, 64, { parent: g, fill: C.ochreL, stroke: C.ochre, r: 32, shadow: true });
    const icn = X.icon(ic, x - 122, 822, 0.3, { parent: g, color: C.ink });
    X.text(x + 20, 830, name, { parent: g, size: 23, anchor: 'middle', w: 600 });
    X.show(g, 7, { f, type: 'down', dist: 60 });
    if (ic === 'gear') X.spin(icn.mid, x - 122, 822, { speed: 60 });
  });
  X.term(7, 'Normaliser', 'Cleans up tricky writing, like spaced-out\nor disguised digits, before checking.', { f: 0.45, until: 7, outf: 0.66 });
  X.term(7, 'AI gateway', 'A checkpoint for everything staff send\nto outside AI chatbots.', { f: 0.68, until: 7, outf: 0.84 });
  X.term(7, 'Quantum-safe', 'Locks built to stay safe even against\nfuture quantum computers.', { f: 0.86, until: 8 });

  X.recap(8, ['Six gaps, each closed by one mechanism', 'Evidence, failing tokens, a leakage ledger', 'A token per destination, a key per purpose, OTP memory', 'Extra layers on top, from AI to quantum-safe']);
});
