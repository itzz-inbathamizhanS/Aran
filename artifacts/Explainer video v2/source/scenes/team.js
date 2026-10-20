// The team: four people in two pairs; the parts each pair owns fly to them as tiles;
// the AI gateway is shared; learning documents and notes live in one shared cupboard.
scene('team', X => {
  X.cam([
    { x: 960, y: 520, s: 1.18 },
    { k: 0, f: 0.4, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 1, x: 480, y: 585, s: 1.22 },
    { k: 2, x: 1450, y: 585, s: 1.22, len: 1.6 },
    { k: 3, x: 960, y: 540, s: 1, len: 1.4 },
    { k: 4, x: 960, y: 600, s: 1.08 },
    { k: 5, x: 960, y: 545, s: 1.02 }
  ]);
  const FY = 600, S = 0.9;
  const ppl = [
    { x: 310, name: 'Inbathamizhan S', shirt: C.green, skin: C.skin[1], pair: 0 },
    { x: 540, name: 'Aasif Ahmed A', shirt: C.red, skin: C.skin[0], pair: 0 },
    { x: 1380, name: 'SN Arun Vijay', shirt: C.blue, skin: C.skin[2], pair: 1, glasses: true },
    { x: 1610, name: 'Bharadhwaj M', shirt: C.teal, skin: C.skin[3], pair: 1 }
  ];
  // pair outlines behind the people
  const pairBox = [[150, 270, 560, 395], [1220, 270, 560, 395]];
  pairBox.forEach(([x, y, w, h], i) => {
    const r = X.rect(x, y, w, h, { fill: i ? C.plumL : C.tealL, stroke: i ? C.plum : C.teal, sw: 3, r: 26, dash: '12 9' });
    X.show(r, 0, { f: 0.6, type: 'pop' });
  });
  const P = ppl.map((p, i) => {
    const o = X.person(p.x, FY, { shirt: p.shirt, skin: p.skin, name: p.name, s: S, glasses: p.glasses, ph: i * 1.3 });
    X.show(o, 0, { f: 0.05 + i * 0.1, type: 'up' });
    return o;
  });
  const plates = [
    X.chip(430, 300, 'Cybersecurity pair', { size: 28, color: C.teal, fill: C.card, shadow: 4 }),
    X.chip(1500, 300, 'AI and machine learning pair', { size: 28, color: C.plum, fill: C.card, shadow: 4 })
  ];
  X.show(plates[0], 1, { f: 0.28, type: 'down' });
  X.show(plates[1], 2, { f: 0.02, type: 'down' });
  const leadChip = X.chip(310, 352, 'Project lead', { size: 22, color: C.ochre, fill: C.ochreL });
  X.show(leadChip, 1, { f: 0.04, type: 'pop' });
  X.term(1, 'Cybersecurity', 'Keeping computers and data safe\nfrom attackers.', { f: 0.25, until: 2 });
  X.term(2, 'Machine learning', 'Teaching a computer with many examples,\ninstead of writing every rule by hand.', { until: 2, outf: 0.62 });
  X.term(2, 'Honest probabilities', 'The model says how sure it is,\nand that is exactly how often it is right.', { f: 0.66, until: 3 });

  // tiles that fly in to their owners
  const tile = (txt, x, y, w, col, k, f, from) => {
    const outer = X.g();
    const inner = X.g(outer);
    X.rect(-w / 2, -30, w, 60, { parent: inner, fill: C.card, stroke: col, sw: 3, r: 12, shadow: 4 });
    X.circle(-w / 2 + 22, 0, 7, { parent: inner, fill: col });
    X.text(10, 9, txt, { parent: inner, size: 24, w: 600, anchor: 'middle' });
    const sp = X.spline([from, [lerp(from[0], x, 0.5), Math.min(from[1], y) - 120], [x, y]]);
    X.travel(inner, sp, k, { f0: f, f1: f + 0.13 });
    X.show(outer, k, { f, type: 'fade', len: 0.2 });
    return outer;
  };
  const cyb = ['Tokens', 'Vault', 'Erasure', 'Leakage ledger', 'Immune layer', 'Quantum-safe locks'];
  cyb.forEach((s, i) => tile(s, i % 2 ? 590 : 290, 710 + Math.floor(i / 2) * 72, 280, C.teal, 1, 0.38 + i * 0.09, [960, 160]));
  const ai = ['Name finder', 'OTP and UPI model', 'Honest probabilities'];
  ai.forEach((s, i) => tile(s, 1495, 710 + i * 72, 380, C.plum, 2, 0.35 + i * 0.16, [960, 160]));

  // people react: arms up to catch the tiles
  X.each(t => {
    P.forEach((p, i) => {
      const k = p === P[0] || p === P[1] ? 1 : 2;
      let r = -8, l = 8;
      const catching = X.t > X.at(k, 0.36) && X.t < X.at(k, 0.95);
      if (catching) { r = 55 + 25 * Math.sin(t * 4 + i); l = 55 + 25 * Math.sin(t * 4 + i + 2); }
      if (X.t >= X.at(4) && X.t < X.at(6)) { r = 30 + 12 * Math.sin(t * 3 + i); }
      if (i === 0 && X.t > X.at(1) && X.t < X.at(1, 0.3)) r = lerp(-8, 140, X.P(1, 0.02, 0, 0.4));
      X.arms(p, l, r);
      p.mood(catching || X.t > X.at(5, 0.6) ? 'happy' : 'neutral');
    });
  });

  // AI gateway, shared by both pairs
  const gw = X.g();
  X.rect(820, 375, 280, 96, { parent: gw, fill: C.ochreL, stroke: C.ochre, sw: 4, r: 18, shadow: true });
  X.icon('chat', 875, 420, 0.48, { parent: gw, color: C.ochre });
  X.text(1000, 432, 'AI gateway', { parent: gw, size: 30, w: 700, anchor: 'middle', serif: true });
  X.show(gw, 3, { type: 'pop' });
  const lnL = X.spline([[720, 450], [770, 430], [818, 423]]), lnR = X.spline([[1220, 450], [1170, 430], [1102, 423]]);
  [lnL, lnR].forEach(sp => { const a = X.path(sp.d, { color: C.ochre, sw: 4 }); X.show(a, 3, { f: 0.2, type: 'draw' }); });
  X.stream(X.spline([[700, 470], [770, 432], [830, 423]]), { n: 3, speed: 0.5, r: 8, color: C.teal, k0: 3, f0: 0.3 });
  X.stream(X.spline([[1240, 470], [1170, 432], [1090, 423]]), { n: 3, speed: 0.5, r: 8, color: C.plum, k0: 3, f0: 0.3 });
  const both = X.text(960, 360, 'shared by both pairs', { size: 24, w: 600, anchor: 'middle', fill: C.ochre });
  X.show(both, 3, { f: 0.35, type: 'up' });
  X.term(3, 'AI gateway', 'A checkpoint that cleans every message before\nit goes to an outside AI company.', { until: 4 });

  // the shared cupboard
  const cup = X.g();
  X.rect(800, 520, 320, 380, { parent: cup, fill: C.sand, stroke: C.ink2, sw: 4, r: 10, shadow: true });
  X.text(960, 508, 'Shared cupboard', { parent: cup, size: 24, w: 700, anchor: 'middle', fill: C.ink2 });
  for (const y of [640, 760, 880]) X.rect(812, y, 296, 10, { parent: cup, fill: C.ink3, stroke: 'none', r: 3 });
  X.show(cup, 4, { type: 'pop' });
  const bookCols = [C.blue, C.red, C.green, C.ochre, C.plum, C.teal, C.ink2];
  for (let i = 0; i < 14; i++) {
    const row = Math.floor(i / 7), col = i % 7;
    const b = X.rect(826 + col * 40, 640 + row * 120 - 92, 30, 92, { fill: bookCols[(i * 3) % 7], stroke: C.ink, sw: 2, r: 4 });
    X.show(b, 4, { f: 0.1 + i * 0.025, type: 'down', dist: 40, len: 0.4 });
  }
  // notes go on the bottom shelf
  for (let i = 0; i < 5; i++) {
    const n = X.g();
    X.rect(830 + i * 54, 818, 44, 54, { parent: n, fill: C.card, stroke: C.ochre, sw: 2, r: 4 });
    X.line(838 + i * 54, 836, 866 + i * 54, 836, { parent: n, color: C.ink3, sw: 3 });
    X.line(838 + i * 54, 850, 860 + i * 54, 850, { parent: n, color: C.ink3, sw: 3 });
    X.show(n, 5, { f: 0.35 + i * 0.08, type: 'pop', len: 0.4 });
  }
  // doors swing open
  const doorL = E('rect', { x: 800, y: 520, width: 160, height: 380, rx: 8, fill: C.ochreL, stroke: C.ink2, 'stroke-width': 4 }, cup);
  const doorR = E('rect', { x: 960, y: 520, width: 160, height: 380, rx: 8, fill: C.ochreL, stroke: C.ink2, 'stroke-width': 4 }, cup);
  X.each(() => {
    const o = X.P(4, 0.02, 0, 0.8);
    doorL.setAttribute('transform', `translate(800 0) scale(${(1 - o * 0.9).toFixed(3)} 1) translate(-800 0)`);
    doorR.setAttribute('transform', `translate(1120 0) scale(${(1 - o * 0.9).toFixed(3)} 1) translate(-1120 0)`);
  });
  // a learning book flies from the cupboard to each person
  ppl.forEach((p, i) => {
    const outer = X.g(); const inner = X.g(outer);
    X.rect(-16, -22, 32, 44, { parent: inner, fill: bookCols[i + 1], stroke: C.ink, sw: 2, r: 4 });
    X.travel(inner, X.spline([[960, 600], [lerp(960, p.x, 0.5), 420], [p.x + 50, FY - 120]]), 4, { f0: 0.45 + i * 0.1, f1: 0.62 + i * 0.1 });
    X.show(outer, 4, { f: 0.45 + i * 0.1, type: 'fade', len: 0.2, out: 5, outf: 0.1 });
  });
  X.term(4, 'Learning document', 'A short beginner guide to one topic,\nso anyone can understand any part.', { until: 5 });
  // notes flow from everyone into the cupboard
  ppl.forEach((p, i) => {
    X.stream(X.spline([[p.x + 40, FY - 120], [lerp(p.x, 960, 0.5), 470], [960, 560]]), {
      n: 2, speed: 0.4, k0: 5, f0: 0.05 + i * 0.05, k1: 6,
      make: g => { const e = E('g', null, g); E('rect', { x: -12, y: -15, width: 24, height: 30, rx: 3, fill: C.card, stroke: C.ochre, 'stroke-width': 2.5 }, e); E('line', { x1: -6, y1: -3, x2: 6, y2: -3, stroke: C.ink3, 'stroke-width': 2.5 }, e); return e; }
    });
  });
  const saved = X.chip(960, 250, 'Saved in one place', { size: 24, color: C.green, fill: C.greenL });
  X.show(saved, 5, { f: 0.6, type: 'pop' });

  X.recap(6, ['Two pairs: cybersecurity, and AI', 'The AI gateway is shared', 'Shared learning documents and notes']);
});
