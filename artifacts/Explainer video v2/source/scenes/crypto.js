// Locks, keys and fingerprints: encryption as a locked box, a key as a very long number, a hash as a one-way fingerprint machine.
scene('crypto', X => {
  // ---- local helpers ----
  const tf = (el, x, y, s = 1, r = 0) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(1)})` : ''}`);
  const GLY = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz0123456789#%&@$*+=?';
  const scr = (str, p, bucket, seed) => str.split('').map((ch, i) => {
    if (ch === ' ' || (i + 0.5) / str.length >= p) return ch;
    const r = rng(seed + i * 131 + bucket * 7919); return GLY[Math.floor(r() * GLY.length)];
  }).join('');
  // fingerprint drawn around (0,0), about 120 x 150
  const fingerprint = (parent, color = C.ink) => {
    const g = E('g', null, parent);
    E('ellipse', { cx: 0, cy: 0, rx: 58, ry: 74, fill: C.ochreL, stroke: color, 'stroke-width': 5 }, g);
    const arcs = [[10, 0.2, 2.9], [20, -0.4, 3.6], [30, 0.5, 4.2], [40, -0.9, 3.2], [49, 3.6, 5.9], [40, 3.9, 5.6], [20, 3.9, 5.3]];
    arcs.forEach(([r, a0, a1]) => {
      const ry = r * 1.28, x0 = r * Math.cos(a0), y0 = ry * Math.sin(a0), x1 = r * Math.cos(a1), y1 = ry * Math.sin(a1);
      E('path', { d: `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${ry} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`, fill: 'none', stroke: color, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, g);
    });
    return g;
  };

  X.cam([{ x: 960, y: 520, s: 1.12 },
    { k: 1, x: 960, y: 540, s: 1 },
    { k: 2, f: 0.05, x: 960, y: 570, s: 1.02 },
    { k: 3, f: 0.1, x: 960, y: 560, s: 1 },
    { k: 4, x: 2880, y: 540, s: 1, len: 1.6 },
    { k: 5, x: 4800, y: 520, s: 1.05, len: 1.6 },
    { k: 7, x: 4800, y: 610, s: 0.98 },
    { k: 8, x: 4800, y: 1470, s: 1, len: 1.3 }]);

  // ================= cue 0: three words =================
  const head = X.text(960, 300, 'Three more words', { anchor: 'middle', size: 50, serif: true, w: 600 });
  X.show(head, 0, { type: 'down', out: 1, outLen: 0.4 });
  const words = [['Encryption', 'lock', 0.6], ['Key', 'key', 0.75], ['Hash', 'fp', 0.88]];
  words.forEach(([w, ic, f], i) => {
    const cx = 560 + i * 400;
    const slot = X.rect(cx - 160, 370, 320, 280, { fill: 'none', stroke: C.line, dash: '10 10', r: 22 });
    X.show(slot, 0, { f: 0.1 + i * 0.08, type: 'fade', out: 1, outLen: 0.4 });
    const card = X.g();
    X.rect(cx - 160, 370, 320, 280, { parent: card, fill: C.card, r: 22, shadow: true });
    const icG = X.g(card); const icIn = X.g(icG);
    if (ic === 'fp') { const fp = fingerprint(icIn); tf(fp, cx, 475, 0.75); }
    else X.icon(ic, cx, 480, ic === 'key' ? 1.3 : 1.15, { parent: icIn });
    X.bob(icIn, { amp: 6, per: 2.4, ph: i * 1.3 });
    X.text(cx, 610, w, { parent: card, anchor: 'middle', size: 42, serif: true, w: 600 });
    X.show(card, 0, { f, type: 'pop', out: 1, outLen: 0.4 });
  });

  // ================= cue 1: encryption scrambles =================
  const plainA = 'Ravi Kumar', plainB = '2345 6789 0124';
  const pc = X.g();
  X.rect(200, 190, 520, 190, { parent: pc, fill: C.card, r: 16, shadow: true });
  X.text(232, 262, plainA, { parent: pc, size: 36, w: 600 });
  X.text(232, 330, plainB, { parent: pc, size: 34, mono: true, w: 600 });
  X.show(pc, 1, { type: 'left' });
  const lab1 = X.text(460, 430, 'readable', { anchor: 'middle', size: 28, fill: C.green, w: 600 });
  X.show(lab1, 1, { f: 0.1, type: 'up' });
  const flow = spline([[730, 285], [960, 285], [1190, 285]]);
  const flowLn = X.path(flow.d, { color: C.line, sw: 3, dash: '2 12' });
  X.show(flowLn, 1, { f: 0.15, type: 'fade' });
  X.stream(flow, { n: 4, speed: 0.35, r: 8, color: C.ochre, k0: 1, f0: 0.2 });
  const lockMid = X.icon('lock', 960, 282, 0.95, { fill: C.ochreL });
  X.show(lockMid, 1, { f: 0.15, type: 'pop' });
  X.pulse(lockMid.mid, 960, 282, [1, 2], { f: 0.35, amt: 0.15 });
  const encLab = X.text(960, 400, 'encryption', { anchor: 'middle', size: 28, fill: C.ochre, w: 700 });
  X.show(encLab, 1, { f: 0.2, type: 'up' });
  const sc = X.g();
  X.rect(1200, 190, 520, 190, { parent: sc, fill: C.redL, stroke: C.red, r: 16, shadow: true });
  const sA = X.text(1232, 262, plainA, { parent: sc, size: 36, w: 600, mono: true });
  const sB = X.text(1232, 330, plainB, { parent: sc, size: 34, mono: true, w: 600 });
  X.show(sc, 1, { f: 0.3, type: 'right' });
  const lab2 = X.text(1460, 430, 'scrambled', { anchor: 'middle', size: 28, fill: C.red, w: 600 });
  X.show(lab2, 1, { f: 0.5, type: 'up', out: 3, outf: 0.7, outLen: 0.3 });
  const lab3 = X.text(1460, 430, 'useless without the key', { anchor: 'middle', size: 28, fill: C.red, w: 700 });
  X.show(lab3, 3, { f: 0.75, type: 'up' });
  X.each(t => {
    const p = X.L(1, 0.35, 0.85);
    const bucket = Math.floor(Math.min(t, X.at(1, 0.9)) * 9);
    sA.set(scr(plainA, p, bucket, 11)); sB.set(scr(plainB, p, bucket, 57));
  });
  X.term(1, 'Encryption', 'Scrambling data so that only someone with the\nright key can turn it back into readable text.', { until: 3 });

  // ================= cue 2: letter in a locked box =================
  // the letter (drawn before the box so it disappears inside)
  const letterW = X.g(); const letter = X.g(letterW);
  E('rect', { x: -62, y: -78, width: 124, height: 156, rx: 6, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, letter);
  for (let i = 0; i < 6; i++) E('line', { x1: -42, y1: -50 + i * 22, x2: i === 5 ? 10 : 42, y2: -50 + i * 22, stroke: C.ink2, 'stroke-width': 4, 'stroke-linecap': 'round' }, letter);
  X.show(letterW, 2, { type: 'fade', len: 0.3 });
  const inPath = spline([[470, 560], [680, 430], [900, 470], [960, 560], [960, 720]]);
  const outPath = spline([[960, 720], [960, 600], [960, 520]]);
  X.each(t => {
    let x, y, s = 1, op = 1;
    if (t < X.at(3)) {
      const p = ease(X.L(2, 0.05, 0.3)); [x, y] = inPath.at(p);
      op = p > 0.97 ? 0 : 1;
    } else {
      const p = ease(X.L(3, 0.45, 0.7)); [x, y] = outPath.at(p); s = 1 + 0.15 * p; op = p > 0.02 ? 1 : 0;
    }
    tf(letter, x, y, s); letter.setAttribute('opacity', op);
  });
  const box = X.g();
  const lid = X.g(box);
  E('rect', { x: 796, y: 584, width: 328, height: 38, rx: 8, fill: C.sand, stroke: C.ink, 'stroke-width': 5 }, lid);
  E('rect', { x: 930, y: 612, width: 60, height: 14, rx: 4, fill: C.ink2 }, lid);
  E('rect', { x: 806, y: 620, width: 308, height: 210, rx: 10, fill: C.sand, stroke: C.ink, 'stroke-width': 5 }, box);
  E('line', { x1: 806, y1: 670, x2: 1114, y2: 670, stroke: C.ink, 'stroke-width': 3, opacity: 0.35 }, box);
  E('line', { x1: 806, y1: 780, x2: 1114, y2: 780, stroke: C.ink, 'stroke-width': 3, opacity: 0.35 }, box);
  const shackle = E('path', { d: 'M938,700 L938,684 Q938,660 960,660 Q982,660 982,684 L982,700', fill: 'none', stroke: C.ink, 'stroke-width': 9, 'stroke-linecap': 'round' }, box);
  E('rect', { x: 920, y: 698, width: 80, height: 62, rx: 10, fill: C.ochreL, stroke: C.ink, 'stroke-width': 5 }, box);
  E('circle', { cx: 960, cy: 722, r: 8, fill: C.ink }, box); E('rect', { x: 957, y: 724, width: 6, height: 18, fill: C.ink }, box);
  X.show(X.wrap(box), 2, { type: 'up' });
  X.each(t => {
    // lid: open, closes after the letter drops in, reopens when the key turns
    const close = X.P(2, 0.3, 0, 0.6), reopen = X.P(3, 0.38, 0, 0.6);
    const a = -115 * (1 - close) + -115 * reopen;
    lid.setAttribute('transform', `rotate(${a.toFixed(1)} 796 620)`);
    const up = (1 - X.P(2, 0.36, 0, 0.4)) * (t < X.at(3) ? 1 : 0) + (t >= X.at(3) ? X.P(3, 0.3, 0, 0.4) : 0);
    shackle.setAttribute('transform', `translate(0 ${(-22 * up).toFixed(1)})`);
  });
  const boxLab = X.text(960, 880, 'locked box', { anchor: 'middle', size: 28, fill: C.ink2, w: 600 });
  X.show(boxLab, 2, { f: 0.4, type: 'up' });
  // onlookers: they can see the box, not the letter
  [[430, 0.3], [1490, 2.1]].forEach(([x, ph], i) => {
    const p = X.person(x, 900, { shirt: i ? C.teal : C.plum, skin: C.skin[i ? 0 : 2], long: !i, s: 0.82, ph });
    X.show(p, 2, { f: 0.5 + i * 0.06, type: i ? 'right' : 'left', out: 3, outLen: 0.4 });
    X.each(() => { const q = X.P(2, 0.62, 0, 0.5); X.arms(p, i ? 8 : lerp(8, 40, q), i ? lerp(-8, 40, q) : -8); });
    const bub = X.g();
    X.circle(x + (i ? -70 : 70), 660, 34, { parent: bub, fill: C.card, stroke: C.line, sw: 2.5 });
    X.text(x + (i ? -70 : 70), 675, '?', { parent: bub, anchor: 'middle', size: 44, w: 700, fill: C.ink2 });
    X.show(bub, 2, { f: 0.7 + i * 0.05, type: 'pop', out: 3, outLen: 0.4 });
  });

  // ================= cue 3: the key opens it =================
  const keyW = X.g(); const key = X.g(keyW);
  E('circle', { cx: 0, cy: 0, r: 40, fill: C.blueL, stroke: C.ink, 'stroke-width': 6 }, key);
  E('circle', { cx: 0, cy: 0, r: 12, fill: C.bg, stroke: C.ink, 'stroke-width': 4 }, key);
  E('rect', { x: -210, y: -12, width: 172, height: 24, rx: 6, fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, key);
  E('path', { d: 'M-190,12 L-190,38 L-172,38 L-172,12 M-155,12 L-155,30 L-138,30 L-138,12', fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, key);
  X.show(keyW, 3, { type: 'fade', len: 0.3, out: 4, outLen: 0.4 });
  X.each(() => {
    const p = X.P(3, 0.02, 0, 1.1);
    const turn = X.P(3, 0.24, 0, 0.4);
    key.setAttribute('transform', `translate(${lerp(1700, 1180, p).toFixed(1)} 728) scale(1 ${(1 - 0.6 * Math.sin(turn * Math.PI)).toFixed(3)})`);
  });
  const keyLab = X.text(1260, 800, 'key', { anchor: 'middle', size: 30, fill: C.blue, w: 700, serif: true });
  X.show(keyLab, 3, { f: 0.15, type: 'up', out: 4, outLen: 0.3 });
  const okL = X.mark(1110, 470, true, { s: 28 });
  X.show(okL, 3, { f: 0.72, type: 'pop', out: 4, outLen: 0.3 });
  X.term(3, 'Key', 'The secret that locks and unlocks scrambled data.\nIn computers: a very long secret number.', { until: 5 });

  // ================= cue 4: a key is a very long number =================
  const rk = rng(4242); let digs = '';
  for (let i = 0; i < 66; i++) { digs += Math.floor(rk() * 10); if (i % 6 === 5 && i < 65) digs += ' '; }
  const bigKey = X.g();
  E('circle', { cx: 2110, cy: 300, r: 58, fill: C.blueL, stroke: C.ink, 'stroke-width': 7 }, bigKey);
  E('circle', { cx: 2110, cy: 300, r: 18, fill: C.bg, stroke: C.ink, 'stroke-width': 5 }, bigKey);
  E('rect', { x: 2166, y: 274, width: 1500, height: 52, rx: 10, fill: C.blueL, stroke: C.ink, 'stroke-width': 6 }, bigKey);
  E('path', { d: 'M3560,326 L3560,368 L3590,368 L3590,326 M3616,326 L3616,356 L3644,356 L3644,326', fill: C.blueL, stroke: C.ink, 'stroke-width': 6 }, bigKey);
  const keyDigits = X.text(2196, 311, '', { parent: bigKey, size: 26, mono: true, w: 600, ls: 0.5 });
  X.type(keyDigits, digs, 4, { f0: 0.05, f1: 0.4 });
  X.show(bigKey, 4, { type: 'left', len: 0.9 });
  const kLab = X.text(2880, 420, 'a key: a secret number, dozens of digits long', { anchor: 'middle', size: 30, fill: C.ink2, w: 500 });
  X.show(kLab, 4, { f: 0.15, type: 'up' });
  const att = X.person(2130, 830, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.95, ph: 1.1 });
  X.show(att, 4, { f: 0.3, type: 'left' });
  X.each(t => { if (X.t > X.at(4, 0.3)) X.arms(att, 30 + 10 * Math.sin(t * 9), 30 + 10 * Math.sin(t * 9 + 2)); });
  const lap = X.icon('laptop', 2215, 700, 0.7);
  X.show(lap, 4, { f: 0.32, type: 'pop' });
  const ctr = X.g();
  X.rect(2320, 470, 680, 150, { parent: ctr, fill: C.card, r: 18, shadow: true });
  X.text(2350, 510, 'guesses tried so far', { parent: ctr, size: 26, fill: C.ink2, w: 600 });
  const ctrN = X.text(2350, 588, '0', { parent: ctr, size: 46, mono: true, w: 700 });
  X.count(ctrN, 0, 4.2e15, 4, { f0: 0.35, f1: 1 });
  X.show(ctr, 4, { f: 0.35, type: 'pop' });
  const clk = X.g();
  E('circle', { cx: 3270, cy: 545, r: 72, fill: C.card, stroke: C.ink, 'stroke-width': 6 }, clk);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; E('line', { x1: 3270 + 58 * Math.cos(a), y1: 545 + 58 * Math.sin(a), x2: 3270 + 66 * Math.cos(a), y2: 545 + 66 * Math.sin(a), stroke: C.ink, 'stroke-width': 4 }, clk); }
  const hm = E('line', { x1: 3270, y1: 545, x2: 3270, y2: 488, stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, clk);
  const hh = E('line', { x1: 3270, y1: 545, x2: 3305, y2: 545, stroke: C.red, 'stroke-width': 7, 'stroke-linecap': 'round' }, clk);
  X.each(t => { const u = Math.max(0, t - X.at(4, 0.35)); hm.setAttribute('transform', `rotate(${(u * 900) % 360} 3270 545)`); hh.setAttribute('transform', `rotate(${(u * 75) % 360} 3270 545)`); });
  E('circle', { cx: 3270, cy: 545, r: 8, fill: C.ink }, clk);
  X.text(3270, 660, 'years rushing by', { parent: clk, anchor: 'middle', size: 24, fill: C.ink2 });
  X.show(clk, 4, { f: 0.4, type: 'pop' });
  const b1l = X.text(2320, 690, 'age of the universe: 13.8 billion years', { size: 26, fill: C.ink2, w: 600 });
  X.show(b1l, 4, { f: 0.55, type: 'up' });
  X.bar(2320, 704, 560, 30, 1, 4, { color: C.blue, f0: 0.55, f1: 0.7, track: C.bg });
  const b2l = X.text(2320, 790, 'time to guess the key', { size: 26, fill: C.ochre, w: 700 });
  X.show(b2l, 4, { f: 0.68, type: 'up' });
  X.bar(2320, 804, 1260, 30, 1, 4, { color: C.ochre, f0: 0.7, f1: 0.95, track: C.bg });
  const more = X.arrow(3600, 819, 3720, 819, { color: C.ochre, sw: 6, head: 22 });
  X.show(more, 4, { f: 0.93, type: 'draw', len: 0.4 });

  // ================= cue 5-7: hash = fingerprint machine =================
  const mach = X.g();
  X.rect(4630, 350, 340, 230, { parent: mach, fill: C.sand, r: 26, shadow: true, stroke: C.ink, sw: 4 });
  E('rect', { x: 4614, y: 440, width: 20, height: 60, rx: 4, fill: C.ink }, mach);
  E('rect', { x: 4966, y: 440, width: 20, height: 60, rx: 4, fill: C.ink }, mach);
  const g1 = X.icon('gear', 4690, 540, 0.42, { parent: mach }); X.spin(g1.mid, 4690, 540, { speed: 120 });
  const g2 = X.icon('gear', 4910, 540, 0.42, { parent: mach }); X.spin(g2.mid, 4910, 540, { speed: -120 });
  X.text(4800, 630, 'hash', { parent: mach, anchor: 'middle', size: 34, serif: true, w: 600 });
  X.show(mach, 6, { type: 'pop' });
  const fpW = X.g(); const fpIn = X.g(fpW); fingerprint(fpIn);
  X.show(fpW, 5, { f: 0.05, type: 'fade' });
  X.each(t => {
    const p = X.P(6, 0, 0, 0.9);
    const wob = (1 - p) * 0.03 * Math.sin(t * 3);
    tf(fpIn, lerp(4800, 4800, p), lerp(470, 450, p), lerp(2.2, 0.85, p) * (1 + wob));
  });
  const fpLab = X.text(4800, 720, 'a fingerprint for data', { anchor: 'middle', size: 36, serif: true, w: 600 });
  X.show(fpLab, 5, { f: 0.3, type: 'up', out: 6, outLen: 0.4 });
  X.term(5, 'Hash', 'A short code calculated from any data, like a\nfingerprint. It cannot be turned back into the data.', { until: 7 });
  // run 1
  const mkChip = (str, x, y, o = {}) => { const w = X.g(); const inner = X.g(w); X.chip(0, 0, str, Object.assign({ mono: true, size: 28, parent: inner, shadow: true }, o)); return { w, inner }; };
  const inC = mkChip(DATA.h1 ? '234567890124' : '', 0, 0, { fill: C.card });
  X.show(inC.w, 6, { f: 0.08, type: 'fade', len: 0.3 });
  X.each(() => {
    const p = ease(X.L(6, 0.15, 0.42));
    tf(inC.inner, lerp(4250, 4610, p), 470, lerp(1, 0.4, Math.max(0, (p - 0.75) / 0.25)));
    inC.inner.setAttribute('opacity', p > 0.99 ? 0 : 1);
  });
  const outC = mkChip(DATA.h1, 0, 0, { fill: C.ochreL, stroke: C.ochre });
  X.show(outC.w, 6, { f: 0.5, type: 'fade', len: 0.2 });
  X.each(() => {
    const p = ease(X.L(6, 0.5, 0.8));
    tf(outC.inner, lerp(4990, 5340, p), 470, lerp(0.4, 1, Math.min(1, p / 0.3)));
  });
  X.pulse(mach, 4800, 465, 6, { f: 0.42, amt: 0.06 });
  const inLab = X.text(4250, 418, 'any text', { anchor: 'middle', size: 26, fill: C.ink2, w: 600 });
  X.show(inLab, 6, { f: 0.1, type: 'up', out: 7, outf: 0.55 });
  const outLab = X.text(5340, 418, 'short code', { anchor: 'middle', size: 26, fill: C.ochre, w: 700 });
  X.show(outLab, 6, { f: 0.7, type: 'up', out: 7, outf: 0.55 });
  // rows: same text -> same code; one digit changed -> totally different code
  const row = (y, k, f, inStr, outStr, bad) => {
    const g = X.g();
    const ic = X.chip(4300, y, inStr, { mono: true, size: 28, parent: g, fill: C.card });
    if (bad) { const t = ic.t.t; while (t.firstChild) t.removeChild(t.firstChild); E('tspan', null, t).textContent = inStr.slice(0, -1); E('tspan', { fill: C.red, 'font-weight': 800 }, t).textContent = inStr.slice(-1); }
    const ar = X.arrow(4490, y, 4700, y, { color: C.ink2, sw: 4, parent: g });
    const fpS = X.g(g); tf(fingerprint(fpS), 4770, y, 0.36);
    X.arrow(4830, y, 5060, y, { color: C.ink2, sw: 4, parent: g });
    const oc = X.chip(5250, y, outStr, { mono: true, size: 28, parent: g, fill: bad ? C.redL : C.ochreL, stroke: bad ? C.red : C.ochre, color: bad ? C.red : C.ink });
    X.show(g, k, { f, type: 'up' });
    const m = X.mark(5470, y, !bad, { s: 26 });
    X.show(m, k, { f: f + 0.12, type: 'pop' });
    const wl = X.text(5510, y + 9, bad ? 'all new' : 'same', { size: 26, fill: bad ? C.red : C.green, w: 700 });
    X.show(wl, k, { f: f + 0.14, type: 'up' });
    return { g, oc };
  };
  const rB = row(720, 7, 0.02, '234567890124', DATA.h1, false);
  const rC = row(840, 7, 0.28, '234567890125', DATA.h2, true);
  X.pulse(rC.oc, 5250, 840, 7, { f: 0.38, amt: 0.1 });
  const back = X.arrow(5300, 400, 4300, 400, { color: C.red, sw: 5, bend: 0.22, head: 22 });
  X.show(back, 7, { f: 0.62, type: 'draw', len: 0.9 });
  const backX = X.mark(4800, 290, false, { s: 30 });
  X.show(backX, 7, { f: 0.78, type: 'pop' });
  const backL = X.text(4800, 230, 'cannot rebuild the text', { anchor: 'middle', size: 28, fill: C.red, w: 700 });
  X.show(backL, 7, { f: 0.8, type: 'up' });

  // ================= cue 8: the meat grinder =================
  const gr = X.g();
  E('path', { d: 'M4690,1250 L4910,1250 L4860,1350 L4740,1350 Z', fill: C.sand, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, gr);
  E('rect', { x: 4790, y: 1460, width: 80, height: 110, fill: C.ink2 }, gr);
  E('rect', { x: 4700, y: 1560, width: 260, height: 22, rx: 8, fill: C.ink }, gr);
  E('rect', { x: 4660, y: 1345, width: 340, height: 120, rx: 40, fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, gr);
  E('rect', { x: 4996, y: 1338, width: 26, height: 134, rx: 6, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, gr);
  for (let i = 0; i < 4; i++) E('circle', { cx: 5009, cy: 1362 + i * 28, r: 5, fill: C.ink }, gr);
  const crank = X.g(gr);
  E('line', { x1: 4660, y1: 1405, x2: 4580, y2: 1405, stroke: C.ink, 'stroke-width': 10, 'stroke-linecap': 'round' }, crank);
  E('rect', { x: 4566, y: 1405, width: 26, height: 60, rx: 10, fill: C.red, stroke: C.ink, 'stroke-width': 4 }, crank);
  E('circle', { cx: 4660, cy: 1405, r: 14, fill: C.ink }, gr);
  X.each(t => crank.setAttribute('transform', `rotate(${((t - X.at(8)) * 220).toFixed(1)} 4660 1405)`));
  X.show(X.wrap(gr), 8, { type: 'pop' });
  // chunks of "text" falling into the hopper
  const chunks = X.g();
  const letters = ['R', 'a', 'v', 'i', 'K'];
  const ch = letters.map(l => { const c = E('g', null, chunks); E('rect', { x: -26, y: -24, width: 52, height: 48, rx: 14, fill: C.redL, stroke: C.red, 'stroke-width': 4 }, c); const tt = E('text', { x: 0, y: 11, 'font-size': 30, 'font-weight': 700, fill: C.red, 'text-anchor': 'middle', 'font-family': F.mono }, c); tt.textContent = l; return c; });
  X.show(chunks, 8, { f: 0.05, type: 'fade' });
  X.each(t => {
    ch.forEach((c, i) => {
      const u = ((t * 0.55) + i / ch.length) % 1;
      const x = 4800 + (i % 2 ? 30 : -30) * (1 - u), y = lerp(1160, 1330, u);
      c.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(u * 120 + i * 40).toFixed(1)}) scale(${(1 - 0.5 * Math.max(0, u - 0.7) / 0.3).toFixed(3)})`);
      c.setAttribute('opacity', Math.min(1, u / 0.1, (1 - u) / 0.12).toFixed(2));
    });
  });
  // mince strands coming out into a bowl
  const strands = X.g();
  const st = [0, 1, 2, 3, 4, 5].map(i => E('path', { d: 'M0,0 q6,8 0,16 q-6,8 0,16', fill: 'none', stroke: C.red, 'stroke-width': 7, 'stroke-linecap': 'round' }, strands));
  X.show(strands, 8, { f: 0.15, type: 'fade' });
  X.each(t => {
    st.forEach((s, i) => {
      const u = ((t * 0.7) + i / st.length) % 1;
      const x = 5030 + 120 * Math.min(1, u * 2.2) + (i - 2.5) * 6, y = 1360 + (i % 4) * 28 + 140 * u * u;
      s.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      s.setAttribute('opacity', Math.min(1, (1 - u) / 0.15).toFixed(2));
    });
  });
  const bowl = X.g();
  E('path', { d: 'M5080,1520 L5300,1520 Q5290,1590 5190,1590 Q5090,1590 5080,1520 Z', fill: C.ochreL, stroke: C.ink, 'stroke-width': 5 }, bowl);
  E('path', { d: 'M5110,1520 Q5150,1490 5190,1505 Q5230,1488 5270,1520', fill: C.redL, stroke: C.red, 'stroke-width': 4 }, bowl);
  X.show(bowl, 8, { f: 0.1, type: 'up' });
  const fwd = X.arrow(4440, 1115, 5200, 1115, { color: C.green, sw: 6, head: 24 });
  X.show(fwd, 8, { f: 0.2, type: 'draw', len: 0.7 });
  const fwdL = X.text(5040, 1090, 'grinding: easy', { anchor: 'middle', size: 32, fill: C.green, w: 700 });
  X.show(fwdL, 8, { f: 0.25, type: 'up' });
  const bwd = X.arrow(5200, 1680, 4440, 1680, { color: C.red, sw: 6, head: 24 });
  X.show(bwd, 8, { f: 0.55, type: 'draw', len: 0.7 });
  const bwdX = X.mark(4820, 1680, false, { s: 30 });
  X.show(bwdX, 8, { f: 0.7, type: 'pop' });
  const bwdL = X.text(4820, 1750, 'un-grinding: impossible', { anchor: 'middle', size: 32, fill: C.red, w: 700 });
  X.show(bwdL, 8, { f: 0.65, type: 'up' });
  const tl = X.text(4470, 1300, 'text', { anchor: 'middle', size: 30, fill: C.ink2, w: 600 });
  X.show(tl, 8, { f: 0.1, type: 'up' });
  const fl = X.text(5190, 1640, 'fingerprint', { anchor: 'middle', size: 28, fill: C.ink2, w: 600 });
  X.show(fl, 8, { f: 0.2, type: 'up' });

  X.recap(9, ['Encryption locks data in a box', 'A key opens the box', 'A hash is a one-way fingerprint']);
});
