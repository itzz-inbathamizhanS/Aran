// Signatures anyone can check: the king's wax seal, a private key in the pocket, public keys for everyone,
// signing an erasure receipt, checking it, and one changed letter breaking the check.
scene('signatures', X => {
  const tf = (el, x, y, s = 1, r = 0) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(1)})` : ''}`);
  // key drawn around (0,0), about 240 wide
  const drawKey = (parent, fill) => {
    const g = E('g', null, parent);
    E('rect', { x: -70, y: -12, width: 180, height: 24, rx: 6, fill, stroke: C.ink, 'stroke-width': 5 }, g);
    E('path', { d: 'M70,12 L70,40 L88,40 L88,12 M100,12 L100,32 L116,32 L116,12', fill, stroke: C.ink, 'stroke-width': 5 }, g);
    E('circle', { cx: -88, cy: 0, r: 34, fill, stroke: C.ink, 'stroke-width': 6 }, g);
    E('circle', { cx: -88, cy: 0, r: 10, fill: C.bg, stroke: C.ink, 'stroke-width': 4 }, g);
    return g;
  };
  // wax seal around (0,0), radius ~46
  const drawSeal = (parent, emblem = 'crown') => {
    const g = E('g', null, parent);
    let d = '';
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 42 : 47; d += (i ? 'L' : 'M') + (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1); }
    E('path', { d: d + 'Z', fill: C.red, stroke: C.ink, 'stroke-width': 2 }, g);
    E('circle', { cx: 0, cy: 0, r: 30, fill: 'none', stroke: C.redL, 'stroke-width': 3 }, g);
    if (emblem === 'crown') E('path', { d: 'M-18,10 L-18,-12 L-9,-2 L0,-16 L9,-2 L18,-12 L18,10 Z', fill: C.redL }, g);
    else { E('circle', { cx: -8, cy: 0, r: 9, fill: 'none', stroke: C.redL, 'stroke-width': 4 }, g); E('path', { d: 'M1,0 L20,0 M14,0 L14,8', fill: 'none', stroke: C.redL, 'stroke-width': 4, 'stroke-linecap': 'round' }, g); }
    return g;
  };
  const fingerprint = parent => {
    const g = E('g', null, parent);
    E('ellipse', { cx: 0, cy: 0, rx: 58, ry: 74, fill: C.ochreL, stroke: C.ink, 'stroke-width': 5 }, g);
    [[10, 0.2, 2.9], [20, -0.4, 3.6], [30, 0.5, 4.2], [40, -0.9, 3.2], [49, 3.6, 5.9], [40, 3.9, 5.6], [20, 3.9, 5.3]].forEach(([r, a0, a1]) => {
      const ry = r * 1.28;
      E('path', { d: `M${(r * Math.cos(a0)).toFixed(1)},${(ry * Math.sin(a0)).toFixed(1)} A${r},${ry} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${(r * Math.cos(a1)).toFixed(1)},${(ry * Math.sin(a1)).toFixed(1)}`, fill: 'none', stroke: C.ink, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, g);
    });
    return g;
  };

  X.cam([{ x: 960, y: 520, s: 1.12 },
    { k: 1, x: 860, y: 560, s: 1.04 },
    { k: 1, f: 0.52, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 2, x: 2880, y: 540, s: 1, len: 1.6 },
    { k: 5, x: 4800, y: 520, s: 1, len: 1.6 },
    { k: 6, f: 0.45, x: 4800, y: 500, s: 1.08 },
    { k: 7, x: 4800, y: 540, s: 1 },
    { k: 8, x: 6720, y: 540, s: 1, len: 1.6 }]);

  // ================= cue 0: hash + keys = digital signature =================
  const formula = X.g();
  const parts = [];
  const fpG = X.g(formula); const fpIn = X.g(fpG); tf(fingerprint(fpIn), 560, 500, 1.0); parts.push(fpG);
  X.text(560, 640, 'hash', { parent: fpG, anchor: 'middle', size: 32, fill: C.ink2, w: 600 });
  const plus = X.text(760, 522, '+', { parent: formula, anchor: 'middle', size: 80, fill: C.ink3, w: 400 }); parts.push(plus);
  const kG = X.g(formula); const kIn = X.g(kG); tf(drawKey(kIn, C.blueL), 960, 500, 0.9); parts.push(kG);
  X.text(960, 640, 'keys', { parent: kG, anchor: 'middle', size: 32, fill: C.ink2, w: 600 });
  const eq = X.text(1160, 522, '=', { parent: formula, anchor: 'middle', size: 80, fill: C.ink3, w: 400 }); parts.push(eq);
  const sG = X.g(formula); const sIn = X.g(sG); drawSeal(sIn, 'key'); parts.push(sG);
  X.text(1370, 640, 'digital signature', { parent: sG, anchor: 'middle', size: 32, fill: C.red, w: 700 });
  parts.forEach((p, i) => X.show(p, 0, { f: 0.1 + i * 0.12, type: 'pop', out: 1, outLen: 0.4 }));
  X.each(t => { tf(sIn, 1370, 500, 1.6 * (1 + 0.04 * Math.sin(t * 3))); });
  X.bob(fpIn, { amp: 5, per: 2.3 }); X.bob(kIn, { amp: 5, per: 2.3, ph: 1.5 });
  X.term(0, 'Digital signature', 'A short code made with a secret key that proves\nwho made a document and that nobody changed it.', { f: 0.55, until: 2 });

  // ================= cue 1: the king's wax seal =================
  const letter = X.g();
  X.rect(740, 230, 420, 490, { parent: letter, fill: C.ochreL, stroke: C.ochre, r: 8, shadow: true });
  X.text(950, 300, 'Royal letter', { parent: letter, anchor: 'middle', size: 36, serif: true, w: 600 });
  for (let i = 0; i < 6; i++) E('line', { x1: 790, y1: 360 + i * 38, x2: i === 5 ? 960 : 1110, y2: 360 + i * 38, stroke: C.ink3, 'stroke-width': 5, 'stroke-linecap': 'round' }, letter);
  X.show(letter, 1, { type: 'up' });
  const sealW = X.g(); const sealIn = X.g(sealW); drawSeal(sealIn, 'crown');
  X.show(sealW, 1, { f: 0.31, type: 'fade', len: 0.15 });
  X.each(() => { const p = X.P(1, 0.31, 0, 0.4); tf(sealIn, 1060, 640, 0.7 + 0.3 * easeBack(p)); });
  const king = X.person(470, 850, { shirt: C.plum, skin: C.skin[0], s: 1.15, name: 'King' });
  E('path', { d: 'M-30,-232 L-32,-266 L-15,-248 L0,-272 L15,-248 L32,-266 L30,-232 Z', fill: C.ochre, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, king.body);
  E('path', { d: 'M-38,-150 L-50,-20 L50,-20 L38,-150 Z', fill: C.plum, opacity: 0.5 }, king.body);
  X.show(king, 1, { type: 'left' });
  X.each(() => {
    const out = X.P(1, 0.18, 0, 0.4) * (1 - X.P(1, 0.42, 0, 0.4));
    X.arms(king, 8, lerp(-8, 70, out));
    king.mood(X.t > X.at(1, 0.35) ? 'happy' : 'neutral');
  });
  // the stamp travels from the king's hand to the letter, presses, and goes back
  const stampW = X.g(); const stamp = X.g(stampW);
  E('rect', { x: -14, y: -86, width: 28, height: 56, rx: 10, fill: C.ochre, stroke: C.ink, 'stroke-width': 4 }, stamp);
  E('circle', { cx: 0, cy: -92, r: 16, fill: C.ochre, stroke: C.ink, 'stroke-width': 4 }, stamp);
  E('rect', { x: -40, y: -32, width: 80, height: 32, rx: 6, fill: C.red, stroke: C.ink, 'stroke-width': 4 }, stamp);
  X.show(stampW, 1, { f: 0.12, type: 'fade', len: 0.3 });
  const stPath = spline([[580, 610], [800, 420], [1060, 560]]);
  X.each(() => {
    const go = ease(X.L(1, 0.18, 0.28)), back = ease(X.L(1, 0.36, 0.46));
    let [x, y] = stPath.at(go * (1 - back));
    const press = Math.sin(clamp((X.t - X.at(1, 0.28)) / (X.at(1, 0.36) - X.at(1, 0.28))) * Math.PI);
    y += press * 50;
    tf(stamp, x, y);
  });
  const only = X.g();
  X.chip(470, 440, 'only the king has the seal', { parent: only, size: 26, color: C.plum, fill: C.plumL });
  X.show(only, 1, { f: 0.36, type: 'pop', out: 2, outLen: 0.3 });
  // anyone can look at the seal and know the letter is real
  [[1400, 1], [1580, 3], [1760, 0]].forEach(([x, sk], i) => {
    const p = X.person(x, 880, { shirt: [C.teal, C.blue, C.green][i], skin: C.skin[sk], long: i === 1, s: 0.78, ph: i * 1.7 });
    X.show(p, 1, { f: 0.55 + i * 0.05, type: 'right' });
    X.point(p, 1, 75, { f: 0.62 + i * 0.03 });
    X.each(() => p.mood(X.t > X.at(1, 0.8 + i * 0.04) ? 'happy' : 'neutral'));
    const m = X.mark(x, 640, true, { s: 26 });
    X.show(m, 1, { f: 0.8 + i * 0.04, type: 'pop' });
  });
  const anyL = X.text(1580, 560, 'anyone can check it', { anchor: 'middle', size: 28, fill: C.green, w: 700 });
  X.show(anyL, 1, { f: 0.72, type: 'up' });

  // ================= cue 2-4: a pair of keys =================
  const privW = X.g(); const priv = X.g(privW); drawKey(priv, C.redL);
  const pubW = X.g(); const pub = X.g(pubW); drawKey(pub, C.blueL);
  X.show(privW, 2, { f: 0.1, type: 'fade' });
  X.show(pubW, 2, { f: 0.25, type: 'fade' });
  const pairLn = X.path('M2720,330 Q2860,250 3000,330', { color: C.ink3, sw: 4, dash: '4 12' });
  X.show(pairLn, 2, { f: 0.4, type: 'fade', out: 3, outLen: 0.4 });
  const pairL = X.text(2860, 250, 'a matched pair', { anchor: 'middle', size: 28, fill: C.ink2, w: 600 });
  X.show(pairL, 2, { f: 0.45, type: 'up', out: 3, outLen: 0.4 });
  const privL = X.text(2520, 440, 'private key', { anchor: 'middle', size: 34, fill: C.red, w: 700, serif: true });
  X.show(privL, 2, { f: 0.2, type: 'up', out: 3, outf: 0.55 });
  const pubL = X.text(3200, 440, 'public key', { anchor: 'middle', size: 34, fill: C.blue, w: 700, serif: true });
  X.show(pubL, 2, { f: 0.35, type: 'up' });
  X.term(2, 'Key pair', 'Two keys made together. One is kept secret,\nthe other is shared. They only work as a pair.', { until: 3 });
  // the owner who keeps the private key in a pocket
  const owner = X.person(2470, 880, { shirt: C.plum, skin: C.skin[2], long: true, s: 1.0, name: 'Owner' });
  const pocket = E('path', { d: 'M8,-132 L30,-132 L30,-110 Q19,-102 8,-110 Z', fill: C.ink, opacity: 0.35 }, owner.body);
  X.show(owner, 3, { type: 'left' });
  X.each(() => {
    const p = ease(X.L(3, 0.1, 0.55));
    const s = lerp(1, 0.22, p);
    // pocket is at about (2470+19, 880-120) in world coords
    tf(priv, lerp(2520, 2489, p), lerp(330, 760, p), s * 1.5, lerp(0, -70, p));
    priv.setAttribute('opacity', p > 0.97 ? 0 : 1);
    X.arms(owner, 8, lerp(-8, 30, X.P(3, 0.4, 0, 0.4)) * (1 - X.P(3, 0.7, 0, 0.4)) + -8 * X.P(3, 0.7, 0, 0.4));
  });
  const secretChip = X.g();
  X.chip(2470, 560, 'kept secret, like the seal', { parent: secretChip, size: 26, color: C.red, fill: C.redL });
  X.show(secretChip, 3, { f: 0.6, type: 'pop' });
  X.term(3, 'Private key', 'The secret half of the pair. Only its owner has it,\nand it is used to sign.', { until: 4, color: C.red });
  // copies of the public key handed to everyone
  X.each(() => tf(pub, 3200, 330 + 4 * Math.sin(X.t * 2), 1.5));
  const folks = [2960, 3160, 3360, 3560];
  folks.forEach((x, i) => {
    const p = X.person(x, 880, { shirt: [C.teal, C.blue, C.green, C.ochre][i], skin: C.skin[(i + 1) % 4], long: i % 2 === 1, s: 0.72, ph: i });
    X.show(p, 4, { f: 0.05 + i * 0.05, type: 'up' });
    X.each(() => { X.arms(p, 8, lerp(-8, 50, X.P(4, 0.3 + i * 0.1, 0, 0.4))); p.mood(X.t > X.at(4, 0.4 + i * 0.1) ? 'happy' : 'neutral'); });
    const cW = X.g(); const cIn = X.g(cW); drawKey(cIn, C.blueL);
    X.show(cW, 4, { f: 0.2 + i * 0.1, type: 'fade', len: 0.2 });
    const sp = spline([[3200, 330], [lerp(3200, x, 0.5), 470], [x + 50, 700]]);
    X.each(() => { const q = ease(X.L(4, 0.2 + i * 0.1, 0.4 + i * 0.1)); const [px, py] = sp.at(q); tf(cIn, px, py, lerp(0.8, 0.32, q), -40 * q); });
  });
  const shareChip = X.g();
  X.chip(3260, 520, 'copies for everyone', { parent: shareChip, size: 26, color: C.blue, fill: C.blueL });
  X.show(shareChip, 4, { f: 0.65, type: 'pop' });
  X.term(4, 'Public key', 'The shared half of the pair. Anyone can have a copy,\nand it is used to check a signature.', { until: 5, color: C.blue });

  // ================= cue 5-7: sign, check, tamper =================
  const docW = X.g(); const doc = X.g(docW);
  X.rect(4280, 200, 440, 440, { parent: doc, fill: C.card, r: 12, shadow: true });
  X.text(4500, 262, 'Erasure receipt', { parent: doc, anchor: 'middle', size: 36, serif: true, w: 600 });
  X.text(4320, 330, 'All copies of Ravi\'s', { parent: doc, size: 30, w: 500 });
  const l2 = X.text(4320, 374, '', { parent: doc, size: 30, w: 500 });
  while (l2.t.firstChild) l2.t.removeChild(l2.t.firstChild);
  E('tspan', null, l2.t).textContent = 'data are no';
  const chg = E('tspan', null, l2.t); chg.textContent = 'w';
  E('tspan', null, l2.t).textContent = ' erased.';
  for (let i = 0; i < 3; i++) E('line', { x1: 4320, y1: 430 + i * 34, x2: i === 2 ? 4480 : 4680, y2: 430 + i * 34, stroke: C.line, 'stroke-width': 5, 'stroke-linecap': 'round' }, doc);
  X.show(docW, 5, { type: 'up' });
  const dSealW = X.g(); const dSeal = X.g(dSealW); drawSeal(dSeal, 'key');
  X.show(dSealW, 5, { f: 0.55, type: 'fade', len: 0.15 });
  X.each(() => tf(dSeal, 4630, 570, 0.6 + 0.4 * easeBack(X.P(5, 0.55, 0, 0.4))));
  const sKeyW = X.g(); const sKey = X.g(sKeyW); drawKey(sKey, C.redL);
  X.show(sKeyW, 5, { f: 0.15, type: 'fade', len: 0.3, out: 5, outf: 0.6, outLen: 0.3 });
  const signPath = spline([[4000, 760], [4300, 720], [4560, 600]]);
  X.each(() => { const q = ease(X.L(5, 0.2, 0.52)); const [x, y] = signPath.at(q); tf(sKey, x + 90, y, 0.7, -20 * q); });
  const sigLab = X.g();
  X.arrow(4870, 640, 4690, 585, { parent: sigLab, color: C.red, sw: 4 });
  X.text(4880, 655, 'signature', { parent: sigLab, size: 30, fill: C.red, w: 700 });
  X.show(sigLab, 5, { f: 0.7, type: 'left' });
  X.term(5, 'Signing', 'Using the private key to make a short seal\nthat fits only this exact document.', { until: 6, color: C.red });
  // the checker: Asha with a public key
  const asha = X.person(5420, 880, { shirt: C.teal, skin: C.skin[3], long: true, s: 0.95, name: 'Asha', ph: 0.7 });
  X.show(asha, 6, { type: 'right' });
  const aKeyW = X.g(); const aKey = X.g(aKeyW); drawKey(aKey, C.blueL);
  X.show(aKeyW, 6, { f: 0.05, type: 'fade', out: 7, outLen: 0.4 });
  X.each(t => { tf(aKey, 5230, 700 + 4 * Math.sin(t * 2.4), 0.55, -15); X.arms(asha, 8, lerp(-8, 55, X.P(6, 0.05, 0, 0.4))); });
  const mag = X.icon('magnifier', 0, 0, 0.75);
  X.show(mag, 6, { f: 0.08, type: 'fade', out: 7, outLen: 0.3 });
  X.each(t => {
    const u = X.L(6, 0.1, 0.4), u2 = X.L(6, 0.6, 0.72);
    const tt = u < 1 ? u : u2;
    const x = 4380 + 300 * (0.5 - 0.5 * Math.cos(tt * Math.PI * 3)), y = u < 1 ? lerp(320, 560, u) : 372;
    mag.mid.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  });
  const pass = X.g();
  X.rect(4800, 290, 300, 80, { parent: pass, fill: C.greenL, stroke: C.green, r: 40 });
  X.mark(4848, 330, true, { parent: pass, s: 24 });
  X.text(4890, 341, 'check passes', { parent: pass, size: 28, fill: C.green, w: 700 });
  X.show(pass, 6, { f: 0.4, type: 'pop', out: 6, outf: 0.6, outLen: 0.3 });
  const fail = X.g();
  X.rect(4800, 290, 300, 80, { parent: fail, fill: C.redL, stroke: C.red, r: 40 });
  X.mark(4848, 330, false, { parent: fail, s: 24 });
  X.text(4890, 341, 'check fails', { parent: fail, size: 28, fill: C.red, w: 700 });
  X.show(fail, 6, { f: 0.75, type: 'pop', out: 7, outLen: 0.3 });
  const pass2 = X.g();
  X.rect(4800, 290, 300, 80, { parent: pass2, fill: C.greenL, stroke: C.green, r: 40 });
  X.mark(4848, 330, true, { parent: pass2, s: 24 });
  X.text(4890, 341, 'check passes', { parent: pass2, size: 28, fill: C.green, w: 700 });
  X.show(pass2, 7, { f: 0.1, type: 'pop', out: 8 });
  const oneL = X.text(4800, 420, 'one letter changed: now → not', { size: 26, fill: C.red, w: 700 });
  X.show(oneL, 6, { f: 0.62, type: 'up', out: 7, outLen: 0.3 });
  X.each(t => {
    const bad = t > X.at(6, 0.6) && t < X.at(7, 0.05);
    chg.textContent = bad ? 't' : 'w';
    chg.setAttribute('fill', bad ? C.red : C.ink);
    chg.setAttribute('font-weight', bad ? 800 : 500);
    asha.mood(t > X.at(6, 0.75) && t < X.at(7) ? 'shock' : (t > X.at(6, 0.4) ? 'happy' : 'neutral'));
  });
  X.shake(doc, 6, { f: 0.62 });
  const pkL = X.text(5230, 640, 'public key', { anchor: 'middle', size: 24, fill: C.blue, w: 700 });
  X.show(pkL, 6, { f: 0.1, type: 'up', out: 7, outLen: 0.4 });
  // two things proven
  const proofs = [['person', 'who made it'], ['file', 'nobody changed it']];
  proofs.forEach(([ic, txt], i) => {
    const g = X.g();
    const x0 = 4080 + i * 560;
    X.rect(x0, 700, 520, 110, { parent: g, fill: C.card, r: 18, shadow: true });
    X.icon(ic, x0 + 62, 755, 0.6, { parent: g });
    X.text(x0 + 120, 768, txt, { parent: g, size: 32, w: 600 });
    X.mark(x0 + 472, 755, true, { parent: g, s: 26 });
    X.show(g, 7, { f: 0.3 + i * 0.25, type: 'up' });
  });

  // ================= cue 8: erasure receipts in Aran =================
  const bankG = X.g();
  X.icon('bank', 6000, 470, 1.4, { parent: bankG });
  X.text(6000, 600, 'Bank', { parent: bankG, anchor: 'middle', size: 32, serif: true, w: 600 });
  X.show(bankG, 8, { type: 'left' });
  const ravi = X.person(6700, 880, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1.05 });
  X.show(ravi, 8, { f: 0.05, type: 'up' });
  const rcW = X.g(); const rc = X.g(rcW);
  E('rect', { x: -70, y: -90, width: 140, height: 180, rx: 8, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, rc);
  for (let i = 0; i < 4; i++) E('line', { x1: -48, y1: -58 + i * 24, x2: 48, y2: -58 + i * 24, stroke: C.ink3, 'stroke-width': 5, 'stroke-linecap': 'round' }, rc);
  const rs = E('g', { transform: 'translate(36,52) scale(0.5)' }, rc); drawSeal(rs, 'key');
  X.show(rcW, 8, { f: 0.1, type: 'fade', len: 0.2 });
  const rcPath = spline([[6120, 470], [6450, 330], [6820, 650]]);
  X.each(() => {
    const q = ease(X.L(8, 0.12, 0.42)), lift = X.P(8, 0.55, 0, 0.5);
    const [x, y] = rcPath.at(q);
    tf(rc, x - 30 * lift, y - 80 * lift, lerp(0.7, 1, q));
    X.arms(ravi, 8, lerp(-8, 100, X.P(8, 0.36, 0, 0.4)) + 50 * lift);
    ravi.mood(X.t > X.at(8, 0.45) ? 'happy' : 'neutral');
  });
  const rcL = X.text(6800, 430, 'signed erasure receipt', { anchor: 'middle', size: 28, fill: C.ink2, w: 600 });
  X.show(rcL, 8, { f: 0.2, type: 'up' });
  const law = X.g();
  X.icon('scale', 7300, 480, 1.3, { parent: law });
  X.text(7300, 610, 'proof', { parent: law, anchor: 'middle', size: 32, serif: true, w: 600 });
  X.show(law, 8, { f: 0.6, type: 'pop' });
  const lawM = X.mark(7420, 380, true, { s: 30 });
  X.show(lawM, 8, { f: 0.75, type: 'pop' });
  X.term(8, 'Erasure receipt', 'A signed note from the bank saying a customer\'s\ndata was deleted. Anyone can check it.', { until: 9 });

  X.recap(9, ['A private key signs', 'A public key checks', 'Signature: who made it, and nobody changed it']);
});
