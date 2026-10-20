// Aran's big idea: a real Aadhaar always passes the check digit test; an Aran token always fails it, on purpose.
// The camera travels along a long sheet: A (idea, x~960) -> B (worked example, x~2960) -> C (rule, x~4960) -> D (test, x~6960).
scene('tokens', X => {
  const REAL = '234567890124', BODY = '23456789012', SCR = '09826158641';
  // values exactly as the narration says them (line 9): correct check digit 8, secret 4, written digit 2
  const TRUE_CD = '9', SECRET = 3, WRONG = String((+TRUE_CD + SECRET) % 10);
  const TOK = SCR + WRONG;
  const A = 0, B = 2000, Cx = 4000, D = 6000;

  X.cam([{ x: 960, y: 470, s: 1.2 }, { k: 1, x: 960, y: 500, s: 1.02 }, { k: 3, x: 960, y: 560, s: 1.0 },
    { k: 4, x: B + 960, y: 500, s: 1.05, len: 1.8 }, { k: 7, x: B + 960, y: 490, s: 1.06 }, { k: 8, x: B + 960, y: 495, s: 1.06 },
    { k: 9, x: B + 960, y: 560, s: 1.06 }, { k: 10, x: B + 1150, y: 690, s: 1.28 },
    { k: 11, x: Cx + 960, y: 520, s: 1.0, len: 1.8 }, { k: 12, x: Cx + 960, y: 560, s: 1.04 }, { k: 13, x: Cx + 960, y: 480, s: 1.0 },
    { k: 14, x: Cx + 960, y: 540, s: 0.98 }, { k: 15, x: D + 1000, y: 530, s: 1.0, len: 1.8 }, { k: 16, x: D + 1020, y: 540, s: 1.02 }]);

  // ---------- shared: key and lock (as in the check-digit chapter) ----------
  const makeKey = (str, fill, parent) => {
    const g = X.g(parent), inner = E('g', null, g);
    E('circle', { cx: 0, cy: 0, r: 40, fill, stroke: C.ink, 'stroke-width': 6 }, inner);
    E('circle', { cx: 0, cy: 0, r: 12, fill: C.bg, stroke: C.ink, 'stroke-width': 4 }, inner);
    E('rect', { x: 36, y: -15, width: 300, height: 30, rx: 8, fill, stroke: C.ink, 'stroke-width': 5 }, inner);
    E('path', { d: 'M268,15 L268,42 L288,42 L288,15 M306,15 L306,34 L324,34 L324,15', fill, stroke: C.ink, 'stroke-width': 5 }, inner);
    const t = E('text', { x: 180, y: 9, 'font-size': 25, 'font-weight': 700, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.mono }, inner);
    t.textContent = str;
    g.inner = inner;
    return g;
  };
  const makeLock = (cx, cy, digit, parent) => {
    const g = X.g(parent);
    const sh = E('path', { d: `M${cx - 44},${cy - 36} L${cx - 44},${cy - 80} Q${cx - 44},${cy - 124} ${cx},${cy - 124} Q${cx + 44},${cy - 124} ${cx + 44},${cy - 80} L${cx + 44},${cy - 36}`, fill: 'none', stroke: C.ink, 'stroke-width': 13, 'stroke-linecap': 'round' }, g);
    E('rect', { x: cx - 72, y: cy - 40, width: 144, height: 116, rx: 16, fill: C.ochreL, stroke: C.ink, 'stroke-width': 6 }, g);
    E('text', { x: cx, y: cy + 38, 'font-size': 60, 'font-weight': 700, fill: C.ochre, 'text-anchor': 'middle', 'font-family': F.mono }, g).textContent = digit;
    g.sh = sh;
    return g;
  };
  // animate a key into a lock during cue k: insert f0..f1, then open (fits) or jiggle (does not fit)
  const tryKey = (key, lock, x0, x1, y, k, f0, f1, fits) => {
    X.each(t => {
      let x = lerp(x0, x1, ease(X.L(k, f0, f1)));
      const tj = X.at(k, f1);
      let jig = 0;
      if (!fits && t > tj && t < tj + 1.0) jig = 9 * Math.sin((t - tj) * 40) * (1 - (t - tj));
      key.inner.setAttribute('transform', `translate(${(x + jig).toFixed(1)} ${y})`);
      const open = fits ? ease(clamp((t - tj) / 0.4)) : 0;
      lock.sh.setAttribute('transform', `translate(0 ${(-34 * open).toFixed(1)})`);
    });
  };

  // ================= A: the idea =================
  const idea = X.g();
  const rays = X.g(idea);
  for (let j = 0; j < 12; j++) { const a = j * Math.PI / 6; E('line', { x1: 960 + 150 * Math.cos(a), y1: 380 + 150 * Math.sin(a), x2: 960 + 200 * Math.cos(a), y2: 380 + 200 * Math.sin(a), stroke: C.ochre, 'stroke-width': 7, 'stroke-linecap': 'round' }, rays); }
  X.spin(rays, 960, 380, { speed: 14 });
  const bulb = X.icon('bulb', 960, 390, 2.2, { parent: idea, fill: C.ochreL });
  X.pulse(bulb.mid, 960, 390, [0], { f: 0.2, amt: 0.12, len: 1 });
  X.text(960, 650, 'Aran\'s key idea', { parent: idea, size: 56, anchor: 'middle', serif: true, w: 600 });
  const ch1 = X.chip(700, 730, 'simple', { size: 28, color: C.ink2, parent: idea });
  const ch2 = X.chip(1060, 730, 'never used this way before', { size: 28, color: C.ochre, parent: idea });
  X.show(ch1, 0, { f: 0.55, type: 'pop' }); X.show(ch2, 0, { f: 0.7, type: 'pop' });
  X.show(idea, 0, { type: 'pop', out: 1, outLen: 0.5 });

  // the card that flips: front = everyone, back = Aran
  const flip = X.g();
  const fin = X.g(flip);
  const front = X.g(fin), back = X.g(fin);
  X.rect(380, 200, 1160, 300, { parent: front, fill: C.card, stroke: C.line, r: 22, shadow: true });
  X.text(960, 262, 'Everyone', { parent: front, size: 42, anchor: 'middle', serif: true, w: 600 });
  X.text(960, 320, 'check digit  →  catches typing mistakes', { parent: front, size: 32, anchor: 'middle', w: 500 });
  const tr = X.digits(900, 360, '234561890124', { parent: front, groups: [4, 4, 4], cw: 44, ch: 60, size: 30, gap: 5, groupGap: 16 });
  tr.paint(5, C.redL, C.red, C.red);
  X.mark(1260, 390, false, { s: 28, parent: front });
  X.text(1300, 400, 'typo caught', { parent: front, size: 26, w: 600, fill: C.red });
  X.rect(380, 200, 1160, 300, { parent: back, fill: C.tealL, stroke: C.teal, r: 22, shadow: true, sw: 3 });
  X.text(960, 262, 'Aran', { parent: back, size: 42, anchor: 'middle', serif: true, w: 600, fill: C.teal });
  X.text(960, 320, 'check digit  →  marks every token', { parent: back, size: 32, anchor: 'middle', w: 500 });
  const br = X.digits(900, 360, TOK, { parent: back, groups: [4, 4, 4], cw: 44, ch: 60, size: 30, gap: 5, groupGap: 16, color: C.teal });
  br.paint(11, C.card, C.teal, C.teal);
  X.mark(1260, 390, false, { s: 28, parent: back, color: C.teal });
  X.text(1300, 400, 'fails on purpose', { parent: back, size: 26, w: 600, fill: C.teal });
  X.show(flip, 1, { type: 'up', out: 4, outLen: 0.5 });
  const uturn = X.g();
  E('path', { d: 'M1620,420 Q1700,420 1700,350 Q1700,280 1620,280', fill: 'none', stroke: C.ochre, 'stroke-width': 8, 'stroke-linecap': 'round' }, uturn);
  E('path', { d: 'M1640,258 L1612,280 L1640,302 Z', fill: C.ochre }, uturn);
  X.show(X.wrap(uturn), 2, { type: 'pop', out: 4 });
  X.pulse(uturn, 1660, 350, [2], { amt: 0.25, len: 1 });
  X.each(t => {
    const p = ease(X.L(2, 0.05, 0.75));
    const sx = Math.abs(Math.cos(Math.PI * p));
    fin.setAttribute('transform', `translate(960 350) scale(${Math.max(0.02, sx).toFixed(3)} 1) translate(-960 -350)`);
    front.style.display = p < 0.5 ? '' : 'none';
    back.style.display = p >= 0.5 ? '' : 'none';
  });
  const clerkA = X.person(190, 560, { shirt: C.plum, skin: C.skin[2], long: true, s: 0.85, name: 'clerk' });
  X.show(clerkA, 1, { f: 0.1, type: 'right', out: 2 });
  X.talk(clerkA, [1]);
  X.term(1, 'Check digit', 'The last digit, calculated from the others,\nadded to catch typing mistakes.', { until: 2 });

  // cue 3: real key fits, token key never fits
  const realKey = makeKey('23456789012', C.blueL), realLock = makeLock(800, 720, '4');
  const tokKey = makeKey('09826158641', C.tealL), tokLock = makeLock(1720, 720, WRONG);
  const kA = X.g(); kA.appendChild(realKey); kA.appendChild(realLock);
  const kB = X.g(); kB.appendChild(tokKey); kB.appendChild(tokLock);
  X.show(kA, 3, { type: 'up', out: 4, outLen: 0.4 });
  X.show(kB, 3, { f: 0.38, type: 'up', out: 4, outLen: 0.4 });
  tryKey(realKey, realLock, 90, 420, 720, 3, 0.04, 0.3, true);
  tryKey(tokKey, tokLock, 1000, 1340, 720, 3, 0.44, 0.72, false);
  const kmA = X.mark(900, 600, true, { s: 30 }), kmB = X.mark(1820, 600, false, { s: 30 });
  X.show(kmA, 3, { f: 0.32, type: 'pop', out: 4 }); X.show(kmB, 3, { f: 0.8, type: 'pop', out: 4 });
  const klA = X.text(470, 860, 'real Aadhaar: always passes', { size: 28, anchor: 'middle', w: 600, fill: C.blue });
  const klB = X.text(1390, 860, 'Aran token: always fails, on purpose', { size: 28, anchor: 'middle', w: 600, fill: C.teal });
  X.show(klA, 3, { f: 0.2, type: 'up', out: 4 }); X.show(klB, 3, { f: 0.7, type: 'up', out: 4 });
  X.term(3, 'Token', 'A stand-in number that replaces the real one,\nlike a cloakroom ticket for your coat.', { until: 4 });

  // ================= B: the worked example =================
  const RY = [190, 380, 570, 760];               // tops of the four digit rows
  const DX = B + 520;                              // left edge of the digit rows
  const rowOpt = { anchor: 'start', groups: [4, 4, 4], cw: 56, ch: 70, size: 36, gap: 8, groupGap: 20 };
  const badge = (j, title, sub, col) => {
    const g = X.g();
    X.rect(B + 120, RY[j] - 20, 360, 110, { parent: g, fill: C.card, stroke: col, r: 16, shadow: true, sw: 2.5 });
    E('rect', { x: B + 120, y: RY[j] - 20, width: 12, height: 110, rx: 5, fill: col }, g);
    X.text(B + 230, RY[j] + 26, title, { parent: g, size: 28, serif: true, w: 600 });
    X.text(B + 230, RY[j] + 62, sub, { parent: g, size: 22, fill: C.ink2 });
    return g;
  };
  // row 1: Ravi's Aadhaar
  const b1 = badge(0, 'Ravi\'s Aadhaar', 'made up, valid', C.blue);
  X.icon('person', B + 182, RY[0] + 36, 0.5, { parent: b1 });
  X.show(b1, 7, { type: 'right' });
  const r1 = X.digits(DX, RY[0], REAL, rowOpt);
  r1.paint(11, C.ochreL, C.ochre, C.ochre);
  r1.cells.forEach((c, i) => X.show(X.wrap(c.g), 7, { f: 0.52 + i * 0.035, type: 'pop', len: 0.35 }));
  const vend = X.g();
  X.chip(B + 1660, RY[0] + 35, '→ loan vendor', { size: 26, color: C.plum, fill: C.plumL, parent: vend });
  X.icon('building', B + 1660, RY[0] - 50, 0.5, { parent: vend });
  X.show(vend, 7, { f: 0.9, type: 'left' });
  // row 2: scramble
  const b2 = badge(1, '1  Scramble', 'the first 11 digits', C.teal);
  const gk = X.icon('key', B + 175, RY[1] + 36, 0.42, { parent: b2 }); X.spin(gk.mid, B + 175, RY[1] + 36, { speed: 50 });
  X.show(b2, 4, { f: 0.2, type: 'right' });
  const r2 = X.digits(DX, RY[1], '•••••••••••', Object.assign({}, rowOpt, { fill: C.tealL }));
  X.show(r2, 4, { f: 0.35, type: 'up' });
  X.term(4, 'Scramble', 'Mix the digits with a secret key, so they look\nrandom; only the bank\'s key can undo it.', { until: 5 });
  // row 3: correct check digit
  const b3 = badge(2, '2  Right check digit', 'for the new number', C.ochre);
  const pg = X.g(b3);
  E('polygon', { points: [0, 1, 2, 3, 4].map(k => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return `${(26 * Math.cos(a)).toFixed(1)},${(26 * Math.sin(a)).toFixed(1)}`; }).join(' '), fill: C.ochreL, stroke: C.ochre, 'stroke-width': 4 }, pg);
  X.each(t => pg.setAttribute('transform', `translate(${B + 175} ${RY[2] + 36}) rotate(${(t * 40) % 360})`));
  X.show(b3, 5, { f: 0.1, type: 'right' });
  const r3 = X.digits(DX, RY[2], '•••••••••••?', rowOpt);
  r3.paint(11, C.ochreL, C.ochre, C.ochre);
  X.show(r3, 5, { f: 0.3, type: 'up' });
  // row 4: add a secret amount
  const b4 = badge(3, '3  Add a secret', 'between 1 and 9', C.red);
  const dial = X.g(b4);
  E('circle', { cx: 0, cy: 0, r: 28, fill: C.redL, stroke: C.red, 'stroke-width': 4 }, dial);
  const dialT = E('text', { x: 0, y: 9, 'font-size': 24, 'font-weight': 700, fill: C.red, 'text-anchor': 'middle', 'font-family': F.mono }, dial);
  dial.setAttribute('transform', `translate(${B + 175} ${RY[3] + 36})`);
  X.show(b4, 6, { f: 0.05, type: 'right' });
  const r4 = X.digits(DX, RY[3], '•••••••••••?', rowOpt);
  r4.paint(11, C.redL, C.red, C.red);
  X.show(r4, 6, { f: 0.3, type: 'up' });
  const always = X.text(DX + 830, RY[3] + 46, 'last digit always wrong', { size: 26, w: 600, fill: C.red });
  X.show(always, 6, { f: 0.7, type: 'left', out: 9 });
  // down arrows between rows
  for (let j = 0; j < 3; j++) {
    const a = X.arrow(DX + 380, RY[j] + 80, DX + 380, RY[j + 1] - 8, { color: C.ink3, sw: 4, head: 14 });
    X.show(a, [8, 5, 6][j], { f: j === 0 ? 0.02 : 0.2, type: 'draw' });
  }
  // generic shuffling on row 2 during line 4, and the real scramble during line 8
  const settleF = j => 0.42 + j * 0.048 + (j >= 4 ? 0.02 : 0) + (j >= 8 ? 0.02 : 0);
  const flyers = [];
  for (let j = 0; j < 11; j++) {
    const g = X.g();
    E('rect', { x: -28, y: -35, width: 56, height: 70, rx: 10, fill: C.ochreL, stroke: C.teal, 'stroke-width': 3 }, g);
    const tx = E('text', { x: 0, y: 13, 'font-size': 36, 'font-weight': 700, fill: C.teal, 'text-anchor': 'middle', 'font-family': F.mono }, g);
    const a = r1.cells[j], b = r2.cells[(j * 7 + 3) % 11];
    flyers.push({ g, tx, sp: X.spline([[a.cx, a.y + 35], [lerp(a.cx, b.cx, 0.5) + 30, (a.y + b.y) / 2 + 35], [b.cx, b.y + 35]]), dst: (j * 7 + 3) % 11 });
  }
  X.each(t => {
    // line 4: row 2 flickers to show "scrambling" in general
    let s2 = '•••••••••••';
    if (t >= X.at(4, 0.5) && t < X.at(7)) { const q = Math.floor(t * 9); s2 = ''; for (let i = 0; i < 11; i++) s2 += String((q * 7 + i * 13 + i * i * 3) % 10); }
    // line 8: real digits fly down and settle into the scrambled ones
    if (t >= X.at(8)) {
      s2 = '';
      for (let i = 0; i < 11; i++) s2 += t >= X.at(8, settleF(i)) ? SCR[i] : ' ';
    }
    r2.set(s2);
    for (let i = 0; i < 11; i++) {
      const done = t >= X.at(8) && t >= X.at(8, settleF(i));
      r2.paint(i, done ? C.tealL : (t >= X.at(4, 0.5) && t < X.at(7) ? C.card : C.tealL), done ? C.teal : C.line, done ? C.teal : C.ink3);
    }
    flyers.forEach((o, j) => {
      const a = X.at(8, 0.04 + j * 0.02), b = X.at(8, 0.34 + j * 0.02);
      const end = X.at(8, settleF(o.dst));
      const on = t >= a && t < end;
      o.g.style.display = on ? '' : 'none';
      if (!on) return;
      const [x, y] = o.sp.at(ease(clamp((t - a) / (b - a))));
      o.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t < b ? 25 * Math.sin((t - a) * 9) : 0).toFixed(1)})`);
      o.tx.textContent = t < a + 0.25 ? BODY[j] : String((Math.floor(t * 14) * 3 + j * 7) % 10);
    });
    // row 3 and row 4
    const r3on = t >= X.at(9, 0.06);
    r3.set(r3on ? SCR + (t >= X.at(9, 0.3) ? TRUE_CD : '?') : '•••••••••••?');
    for (let i = 0; i < 11; i++) r3.paint(i, r3on ? C.card : C.card, r3on ? C.line : C.line, r3on ? C.ink : C.ink3);
    const r4on = t >= X.at(9, 0.55);
    r4.set(r4on ? SCR + WRONG : '•••••••••••?');
    const tokLit = t >= X.at(9, 0.66);
    for (let i = 0; i < 11; i++) r4.paint(i, tokLit ? C.tealL : C.card, tokLit ? C.teal : C.line, r4on ? C.ink : C.ink3);
    r4.paint(11, r4on ? C.redL : C.redL, C.red, C.red);
    // the secret dial: spins during line 6, lands on +4 in line 9
    let dv = '+?';
    if (t >= X.at(6, 0.3) && t < X.at(9, 0.4)) dv = '+' + (1 + (Math.floor(t * 6) % 9));
    if (t >= X.at(9, 0.4)) dv = '+' + SECRET;
    dialT.textContent = dv;
  });
  X.pulse(dial, B + 175, RY[3] + 36, [9], { f: 0.4, amt: 0.3 });
  const cdTag = X.text(DX + 830, RY[2] + 46, 'right digit: ' + TRUE_CD, { size: 28, w: 700, fill: C.ochre });
  X.show(cdTag, 9, { f: 0.3, type: 'left' });
  const sum = X.chip(DX + 1000, RY[3] - 40, `${TRUE_CD} + ${SECRET} = ${+TRUE_CD + SECRET}  →  writes ${WRONG}`, { size: 26, color: C.red, fill: C.card, shadow: true });
  X.show(sum, 9, { f: 0.45, type: 'pop' });
  const tokLab = X.chip(DX + 400, RY[3] + 120, `token  ${TOK.slice(0, 4)} ${TOK.slice(4, 8)} ${TOK.slice(8)}`, { size: 28, color: C.teal, fill: C.tealL, mono: true });
  X.show(tokLab, 9, { f: 0.68, type: 'up', out: 10, outf: 0.7 });
  X.term(9, 'Secret amount', 'A number from 1 to 9 that only Aran knows,\nadded to the check digit to break it.', { f: 0.4, until: 10 });

  // cue 10: run the check on the token
  const scan = X.g();
  E('rect', { x: -6, y: RY[3] - 18, width: 12, height: 106, rx: 6, fill: C.teal }, scan);
  X.each(t => {
    const on = t >= X.at(10, 0.04) && t < X.at(10, 0.5);
    scan.style.display = on ? '' : 'none';
    const x = lerp(r4.cells[0].x - 10, r4.cells[11].x + 66, ease(X.L(10, 0.04, 0.48)));
    scan.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
  });
  const fail = X.g();
  X.mark(DX + 870, RY[3] + 35, false, { s: 34, parent: fail });
  X.text(DX + 920, RY[3] + 48, 'check fails', { parent: fail, size: 32, w: 700, fill: C.red });
  X.show(fail, 10, { f: 0.5, type: 'pop' });
  const safe = X.g();
  X.rect(DX + 900, RY[3] + 90, 220, 80, { parent: safe, fill: C.greenL, stroke: C.green, r: 10, sw: 5 });
  X.text(DX + 1010, RY[3] + 146, 'SAFE', { parent: safe, size: 46, anchor: 'middle', w: 800, fill: C.green, ls: 4 });
  X.show(safe, 10, { f: 0.68, type: 'pop' });
  const tokFly = X.g();
  X.chip(0, 0, TOK.slice(0, 4) + ' ' + TOK.slice(4, 8) + ' ' + TOK.slice(8), { size: 22, mono: true, color: C.teal, fill: C.tealL, parent: tokFly });
  const flySp = X.spline([[DX + 400, RY[3] + 120], [DX + 1180, 470], [B + 1660, RY[0] + 90]]);
  X.each(t => { const on = t >= X.at(10, 0.6) && t < X.at(11); tokFly.style.display = on ? '' : 'none'; });
  X.travel(tokFly, flySp, 10, { f0: 0.6, f1: 0.98 });

  // ================= C: the rule =================
  const rkey = makeKey('23456789012', C.blueL), rlock = makeLock(Cx + 1150, 380, '4');
  const tkey = makeKey('09826158641', C.tealL), tlock = makeLock(Cx + 1150, 720, WRONG);
  const cA = X.g(); cA.appendChild(rkey); cA.appendChild(rlock);
  const cB = X.g(); cB.appendChild(tkey); cB.appendChild(tlock);
  X.text(Cx + 300, 250, 'real number', { parent: cA, size: 30, w: 700, fill: C.blue });
  X.text(Cx + 300, 590, 'Aran token', { parent: cB, size: 30, w: 700, fill: C.teal });
  X.show(cA, 11, { f: 0.15, type: 'up', out: 12, outLen: 0.5 });
  X.show(cB, 11, { f: 0.55, type: 'up', out: 12, outLen: 0.5 });
  tryKey(rkey, rlock, Cx + 360, Cx + 770, 380, 11, 0.25, 0.48, true);
  tryKey(tkey, tlock, Cx + 360, Cx + 770, 720, 11, 0.62, 0.86, false);
  const cmA = X.g(); X.mark(Cx + 1330, 340, true, { s: 34, parent: cmA }); X.text(Cx + 1380, 352, 'always fits', { parent: cmA, size: 34, w: 700, fill: C.green });
  const cmB = X.g(); X.mark(Cx + 1330, 680, false, { s: 34, parent: cmB }); X.text(Cx + 1380, 692, 'never fits', { parent: cmB, size: 34, w: 700, fill: C.red });
  X.show(cmA, 11, { f: 0.52, type: 'pop', out: 12, outLen: 0.5 }); X.show(cmB, 11, { f: 0.92, type: 'pop', out: 12, outLen: 0.5 });

  // cue 12: anyone, anywhere, one simple test
  const crowd = X.g();
  const cast = [[C.blue, C.skin[1], false, 'Ravi'], [C.plum, C.skin[2], true, 'clerk'], [C.ink, C.skin[0], false, 'officer'], [C.teal, C.skin[3], false, 'vendor']];
  const people = cast.map(([shirt, skin, long, name], j) => {
    const x = Cx + 420 + j * 360;
    const p = X.person(x, 800, { shirt, skin, long, name, s: 0.9, ph: j, parent: crowd, badge: name === 'officer' });
    const tst = X.g(crowd);
    const mg = X.icon('magnifier', x + 70, 470, 0.5, { parent: tst });
    X.show(tst, 12, { f: 0.35 + j * 0.1, type: 'pop' });
    X.bob(mg.mid, { amp: 6, per: 1.4, ph: j });
    return p;
  });
  X.each(t => people.forEach(p => { X.arms(p, 8, t > X.at(12, 0.3) ? 110 : -8); p.mood(t > X.at(12, 0.5) ? 'happy' : 'neutral'); }));
  const oneTest = X.text(Cx + 960, 280, 'one simple test, for anyone, anywhere', { size: 40, anchor: 'middle', serif: true, w: 600, parent: crowd });
  X.show(crowd, 12, { type: 'up', out: 13, outLen: 0.5 });

  // cue 13: the two signs
  const signs = [];
  [[Cx + 560, C.redL, C.red, 'PASSES the check', 'it is a real Aadhaar', 'EXPOSED', 'unlock', 0.02],
   [Cx + 1360, C.greenL, C.green, 'FAILS the check', 'it is an Aran token', 'SAFE', 'shield', 0.5]].forEach(([cx, fill, col, h1, h2, h3, ic, f]) => {
    const g = X.g(), sw = E('g', null, g);
    E('line', { x1: cx - 220, y1: 150, x2: cx - 220, y2: 230, stroke: C.ink2, 'stroke-width': 4 }, sw);
    E('line', { x1: cx + 220, y1: 150, x2: cx + 220, y2: 230, stroke: C.ink2, 'stroke-width': 4 }, sw);
    E('rect', { x: cx - 316, y: 236, width: 640, height: 400, rx: 22, fill: C.shadow }, sw);
    E('rect', { x: cx - 320, y: 230, width: 640, height: 400, rx: 22, fill, stroke: col, 'stroke-width': 6 }, sw);
    X.text(cx, 310, h1, { parent: sw, size: 44, anchor: 'middle', w: 800, fill: col, serif: true });
    X.text(cx, 372, h2, { parent: sw, size: 32, anchor: 'middle', w: 500 });
    X.icon(ic, cx - 150, 510, 0.9, { parent: sw, color: C.ink, check: ic === 'shield' });
    X.text(cx + 50, 530, h3, { parent: sw, size: 56, anchor: 'middle', w: 800, fill: col, ls: 3 });
    X.show(g, 13, { f, type: 'down', dist: 80 });
    signs.push({ sw, cx, f });
  });
  E('line', { x1: Cx + 180, y1: 150, x2: Cx + 1740, y2: 150, stroke: C.ink, 'stroke-width': 8, 'stroke-linecap': 'round' }, X.g());
  X.each(t => signs.forEach((s, j) => {
    const dt = t - X.at(13, s.f);
    let a = dt > 0 ? 7 * Math.exp(-dt * 1.4) * Math.sin(dt * 5) : 0;
    const ds = t - X.at(14, 0.3);
    if (ds > 0) a += 3 * Math.exp(-ds * 3) * Math.sin(ds * 18) * (j ? -1 : 1);
    s.sw.setAttribute('transform', `rotate(${a.toFixed(2)} ${s.cx} 150)`);
  }));
  X.term(13, 'Exposed', 'A real number sitting where it should not be:\nanyone who finds it can misuse it.', { until: 14 });

  // cue 14: Theorem 1 stamp
  const stampW = X.g(), stamp = X.g(stampW);
  E('rect', { x: Cx + 690, y: 690, width: 540, height: 150, rx: 14, fill: C.card, stroke: C.plum, 'stroke-width': 8 }, stamp);
  E('rect', { x: Cx + 704, y: 704, width: 512, height: 122, rx: 8, fill: 'none', stroke: C.plum, 'stroke-width': 3 }, stamp);
  X.text(Cx + 960, 770, 'THEOREM 1', { parent: stamp, size: 58, anchor: 'middle', w: 800, fill: C.plum, ls: 5, serif: true });
  X.text(Cx + 960, 812, 'proved: always true', { parent: stamp, size: 28, anchor: 'middle', w: 600, fill: C.plum });
  X.each(t => {
    const p = clamp((t - X.at(14, 0.22)) / 0.3);
    stampW.style.display = p > 0 ? '' : 'none';
    const s = lerp(2.4, 1, easeOut(p));
    stamp.setAttribute('transform', `translate(${Cx + 960} 765) rotate(-5) scale(${s.toFixed(3)}) translate(${-Cx - 960} -765)`);
    stamp.style.opacity = clamp(p * 3);
  });
  X.term(14, 'Theorem', 'A statement that has been proved,\nso it is always true, with no exceptions.', { until: 15 });

  // ================= D: the test =================
  const logG = X.g();
  X.rect(D + 100, 250, 900, 640, { parent: logG, fill: C.card, stroke: C.ink2, r: 16, shadow: true });
  E('rect', { x: D + 100, y: 250, width: 900, height: 56, rx: 14, fill: C.sand }, logG);
  X.text(D + 130, 288, 'real log files', { parent: logG, size: 26, w: 700 });
  for (let j = 0; j < 3; j++) E('circle', { cx: D + 930 + j * 22 - 44, cy: 278, r: 7, fill: C.line }, logG);
  const clip = E('clipPath', { id: 'tokLogClip' }, logG);
  E('rect', { x: D + 110, y: 312, width: 880, height: 568 }, clip);
  const lines = X.g(logG); lines.setAttribute('clip-path', 'url(#tokLogClip)');
  const toks = ['2498 2684 6187', '0982 6158 6412', '0196 3809 2692'];
  const NL = 24, LH = 40;
  const logRows = [];
  for (let i = 0; i < NL * 2; i++) {
    const ii = i % NL, src = (window.DATA && DATA.log && DATA.log.length) ? DATA.log[ii % DATA.log.length] : ['', 'log line'];
    const g = E('g', null, lines);
    const kind = ii % 3 === 0 ? 'tok' : (ii % 4 === 1 ? 'real' : '');
    const txt = E('text', { x: 0, y: 0, 'font-size': 22, fill: C.ink2, 'font-family': F.mono }, g);
    txt.textContent = String(src[1]).slice(0, kind ? 40 : 60);
    let chip = null, tag = null;
    if (kind) {
      chip = E('g', null, g);
      E('rect', { x: 548, y: -24, width: 214, height: 32, rx: 16, fill: kind === 'tok' ? C.tealL : C.redL, stroke: kind === 'tok' ? C.teal : C.red, 'stroke-width': 2 }, chip);
      E('text', { x: 655, y: -1, 'font-size': 22, 'font-weight': 700, fill: kind === 'tok' ? C.teal : C.red, 'text-anchor': 'middle', 'font-family': F.mono }, chip).textContent = kind === 'tok' ? toks[ii % 3 === 0 ? (ii / 3) % 3 : 0] : '2345 6789 0124';
      tag = E('g', null, g);
      E('circle', { cx: 790, cy: -8, r: 14, fill: kind === 'tok' ? C.greenL : C.redL, stroke: kind === 'tok' ? C.green : C.red, 'stroke-width': 3 }, tag);
      E('path', { d: kind === 'tok' ? 'M783,-8 L788,-2 L798,-15' : 'M784,-14 L796,-2 M796,-14 L784,-2', fill: 'none', stroke: kind === 'tok' ? C.green : C.red, 'stroke-width': 3, 'stroke-linecap': 'round' }, tag);
    }
    logRows.push({ g, i, kind, chip, tag });
  }
  X.show(logG, 15, { type: 'up' });
  X.each(t => {
    const off = (t * 34) % (NL * LH);
    logRows.forEach(r => {
      const y = 350 + r.i * LH - off;
      r.g.setAttribute('transform', `translate(${D + 130} ${y.toFixed(1)})`);
      if (r.kind === 'real') { const on = t >= X.at(16, 0.05); r.chip.style.display = on ? '' : 'none'; r.tag.style.display = t >= X.at(16, 0.3) ? '' : 'none'; }
      if (r.kind === 'tok') { r.chip.style.display = t >= X.at(15, 0.25) ? '' : 'none'; r.tag.style.display = t >= X.at(15, 0.7) ? '' : 'none'; }
    });
  });
  // tokens raining into the log
  const rain = [];
  for (let j = 0; j < 7; j++) {
    const g = X.g();
    E('rect', { x: -60, y: -16, width: 120, height: 32, rx: 16, fill: C.tealL, stroke: C.teal, 'stroke-width': 2 }, g);
    E('text', { x: 0, y: 7, 'font-size': 20, 'font-weight': 700, fill: C.teal, 'text-anchor': 'middle', 'font-family': F.sans }, g).textContent = 'token';
    rain.push({ g, x: D + 200 + j * 120, ph: j / 7, real: false });
  }
  for (let j = 0; j < 5; j++) {
    const g = X.g();
    E('rect', { x: -60, y: -16, width: 120, height: 32, rx: 16, fill: C.redL, stroke: C.red, 'stroke-width': 2 }, g);
    E('text', { x: 0, y: 7, 'font-size': 20, 'font-weight': 700, fill: C.red, 'text-anchor': 'middle', 'font-family': F.sans }, g).textContent = 'real';
    rain.push({ g, x: D + 260 + j * 150, ph: j / 5 + 0.1, real: true });
  }
  X.each(t => rain.forEach(r => {
    const on = t >= X.at(r.real ? 16 : 15, 0.1) && t < X.at(17);
    r.g.style.display = on ? '' : 'none';
    if (!on) return;
    const u = (t * 0.7 + r.ph) % 1;
    r.g.setAttribute('transform', `translate(${r.x} ${(140 + u * 100).toFixed(1)})`);
    r.g.style.opacity = Math.min(1, u * 5, (1 - u) * 4).toFixed(2);
  }));
  // counters
  const counter = (j, label, col, k, f0, f1, to, fixed) => {
    const y = 200 + j * 175;
    const g = X.g();
    X.rect(D + 1080, y, 760, 150, { parent: g, fill: C.card, stroke: col, r: 16, shadow: true, sw: 3 });
    X.text(D + 1110, y + 46, label, { parent: g, size: 28, w: 600, fill: C.ink2 });
    const n = X.text(D + 1110, y + 120, '0', { parent: g, size: 60, w: 800, fill: col, mono: true });
    if (fixed == null) X.count(n, 0, to, k, { f0, f1 }); else n.set(fixed);
    X.show(g, k, { f: Math.max(0, f0 - 0.08), type: 'left' });
    return g;
  };
  counter(0, 'Aran tokens hidden in real logs', C.teal, 15, 0.25, 0.6, 20000);
  const c2 = counter(1, 'mistaken for a real number', C.green, 15, 0.72, 0.8, 0, '0');
  X.mark(D + 1780, 200 + 175 + 90, true, { s: 32, parent: c2 });
  counter(2, 'real numbers mixed in', C.red, 16, 0.12, 0.45, 20000);
  const c4 = counter(3, 'real numbers caught', C.red, 16, 0.35, 0.85, 20000);
  const al = X.icon('alert', D + 1770, 200 + 3 * 175 + 82, 0.45, { parent: c4 });
  X.pulse(al.mid, D + 1770, 200 + 3 * 175 + 82, [16], { f: 0.85, amt: 0.25 });

  X.recap(17, ['Real numbers always pass the check', 'Aran tokens always fail it, on purpose', 'So protected and leaked numbers can be told apart']);
});
