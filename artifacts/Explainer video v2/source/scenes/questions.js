// Questions people ask: a judge asks in chat bubbles, a team member answers, a small picture supports each answer.
// Answered questions shrink into a stack on the left.
scene('questions', X => {
  X.cam([
    { x: 1010, y: 480, s: 1.22 },
    { k: 0, f: 0.35, x: 960, y: 540, s: 1, len: 1.8 },
    { k: 2, x: 990, y: 520, s: 1.04 },
    { k: 4, x: 960, y: 545, s: 1 },
    { k: 6, x: 990, y: 515, s: 1.04 },
    { k: 8, x: 960, y: 540, s: 1 },
    { k: 9, f: 0.3, x: 985, y: 525, s: 1.03 }
  ]);

  // ---------- cast ----------
  const judge = X.person(320, 560, { shirt: C.ink2, skin: C.skin[2], glasses: true, tie: C.red, s: 0.95, ph: 0.4 });
  X.show(judge, 0, { type: 'right' });
  const desk = X.g();
  X.rect(190, 450, 260, 112, { parent: desk, fill: C.sand, stroke: C.ink, sw: 3, r: 8, shadow: true });
  X.text(320, 518, 'Judge', { parent: desk, size: 26, serif: true, w: 600, anchor: 'middle' });
  X.show(desk, 0, { type: 'right' });
  const mem = X.person(1700, 900, { shirt: C.green, skin: C.skin[1], s: 1.0, ph: 1.3 });
  X.show(mem, 0, { f: 0.1, type: 'left' });

  const Q = [
    { q: 'Is this just a pattern search?', a: 'No. Pattern search raised 67,481 false OTP alarms.\nAran raised 6.', qf: 0.33, s: 'Just pattern search?' },
    { q: 'Where is the AI?', a: 'In finding names and addresses, telling OTPs and UPI IDs\napart from look-alikes, and making every probability honest.', qf: 0.16, s: 'Where is the AI?' },
    { q: 'Did you use real customer data?', a: 'Never. The logs are real and public. Every identifier\nis made up, with valid check digits.', qf: 0.28, s: 'Real customer data?' },
    { q: 'Does tokenising break the bank\'s apps?', a: 'No. Tokens keep the exact shape, and allowed systems\ncan get the real value back.', qf: 0.3, s: 'Does it break apps?' },
    { q: 'What if someone hides the number?', a: 'Twelve kinds of disguise are fully caught,\nand 22 of 26 red team tricks.', qf: 0.32, s: 'Hidden numbers?' },
    { q: 'What if there is a typo?', a: 'Typo repair catches 99.2% of one-typo numbers.', qf: 0.38, s: 'Typos?' },
    { q: 'How can erasure be legal, if KYC records must be kept?', a: 'KYC keys are time-locked, and destroyed automatically\nwhen the legal period ends.', qf: 0.45, s: 'Erasure and KYC?' },
    { q: 'Is it fast enough?', a: 'Not yet, for a big bank. A faster version is planned.', qf: 0.3, s: 'Fast enough?' },
    { q: 'Is it a product?', a: 'Yes. A bank can install it on its own servers,\nor use it as a service.', qf: 0.22, s: 'A product?' }
  ];

  // who is talking and gesturing
  X.each(t => {
    let jT = false, mT = X.on(0, 1) && X.L(0) < 1, jA = 0, mA = 0;
    Q.forEach((o, i) => {
      const k = i + 1;
      if (X.on(k, k + 1)) {
        const f = X.L(k);
        if (f > 0 && f < o.qf) jT = true;
        if (f >= o.qf && f < 1) mT = true;
        jA = X.P(k, 0, 0, 0.4) * (1 - X.P(k, o.qf, 0, 0.4));
        mA = X.P(k, o.qf, 0, 0.5) * (1 - X.P(k, Math.min(0.95, o.qf + 0.45), 0, 0.5));
      }
    });
    judge.mood(jT ? (Math.sin(t * 22) > 0 ? 'open' : 'neutral') : 'neutral');
    mem.mood(mT ? (Math.sin(t * 21) > 0 ? 'open' : 'happy') : 'happy');
    X.arms(judge, 8, lerp(-8, 70, jA));
    X.arms(mem, lerp(8, 105, mA), -8);
  });

  // ---------- intro title ----------
  const intro = X.g();
  X.text(1000, 455, 'Questions & answers', { parent: intro, size: 60, serif: true, w: 600, anchor: 'middle' });
  X.text(1000, 515, 'short answers to what people often ask', { parent: intro, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(intro, 0, { f: 0.1, type: 'up', out: 1, outLen: 0.4 });
  const qm = [];
  for (let i = 0; i < 3; i++) {
    const g = X.g();
    E('circle', { cx: 760 + i * 240, cy: 600, r: 26, fill: [C.ochreL, C.blueL, C.plumL][i], stroke: C.ink, 'stroke-width': 3 }, g);
    X.text(760 + i * 240, 611, '?', { parent: g, size: 32, w: 800, anchor: 'middle' });
    X.show(X.wrap(g), 0, { f: 0.3 + i * 0.1, type: 'pop', out: 1, outLen: 0.4 });
    X.bob(g, { amp: 7, per: 1.8, ph: i * 1.3 });
  }

  // ---------- bubbles ----------
  const BX = 480, BY = 185, BW = 1000, BH = 130;
  Q.forEach((o, i) => {
    const k = i + 1;
    // question bubble from the judge
    const qw = X.g(); const qg = E('g', null, qw);
    E('rect', { x: BX + 6, y: BY + 6, width: BW, height: BH, rx: 26, fill: C.shadow }, qg);
    E('path', { d: `M${BX + 30},${BY + BH - 30} L${BX - 92},${BY + 168} L${BX + 60},${BY + BH - 6} Z`, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 3, 'stroke-linejoin': 'round' }, qg);
    E('rect', { x: BX, y: BY, width: BW, height: BH, rx: 26, fill: C.ochreL, stroke: C.ochre, 'stroke-width': 3 }, qg);
    E('rect', { x: BX + 22, y: BY + BH - 34, width: 60, height: 28, fill: C.ochreL }, qg);
    X.text(BX + 36, BY + 52, 'QUESTION ' + k, { parent: qg, size: 22, w: 700, fill: C.ochre, ls: 2 });
    X.text(BX + 36, BY + 100, o.q, { parent: qg, size: o.q.length > 45 ? 32 : 36, serif: true, w: 600 });
    X.show(qw, k, { type: 'pop', len: 0.6 });
    // shrink into the stack when the next question comes
    const sy = 600 + i * 34, sc = 0.41;
    X.each(t => {
      const p = X.P(k + 1, 0, 0, 0.8);
      const s = lerp(1, sc, p), tx = lerp(0, 70 - BX * sc, p), ty = lerp(0, sy - BY * sc, p);
      qg.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})`);
      qg.setAttribute('opacity', (1 - clamp(p * 1.3)).toFixed(2));
    });
    // the small card left in the stack
    const st = X.g();
    X.rect(70, sy, 410, 30, { parent: st, fill: C.card, stroke: C.line, r: 8, sw: 1.5 });
    E('rect', { x: 70, y: sy, width: 8, height: 30, rx: 3, fill: C.ochre }, st);
    X.text(92, sy + 23, k + '.  ' + o.s, { parent: st, size: 22, fill: C.ink2, w: 600 });
    X.show(st, k + 1, { f: 0, d: 0.5, type: 'left' });
    // answer bubble from the team member
    const ag = X.g();
    const AX = 520, AY = 640, AW = 980, AH = 160;
    E('rect', { x: AX + 6, y: AY + 6, width: AW, height: AH, rx: 26, fill: C.shadow }, ag);
    E('path', { d: `M${AX + AW - 30},${AY + 40} L${AX + AW + 96},${AY + 62} L${AX + AW - 30},${AY + 90} Z`, fill: C.greenL, stroke: C.green, 'stroke-width': 3, 'stroke-linejoin': 'round' }, ag);
    E('rect', { x: AX, y: AY, width: AW, height: AH, rx: 26, fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, ag);
    E('rect', { x: AX + AW - 34, y: AY + 34, width: 30, height: 62, fill: C.greenL }, ag);
    X.text(AX + 36, AY + 44, 'ANSWER', { parent: ag, size: 22, w: 700, fill: C.green, ls: 2 });
    X.text(AX + 36, AY + 88, o.a, { parent: ag, size: 28, w: 500, lh: 38 });
    X.show(ag, k, { f: o.qf, type: 'up', out: k + 1, outLen: 0.4 });
  });

  // ---------- supporting pictures (area x 520..1500, y 350..615) ----------
  const pic = (k, f) => { const g = X.g(); X.show(g, k, { f, type: 'fade', len: 0.5, out: k + 1, outLen: 0.4 }); return g; };

  // 1: 67,481 vs 6
  {
    const k = 1, f = Q[0].qf, g = pic(k, f);
    X.text(720, 380, 'Pattern search', { parent: g, size: 26, anchor: 'middle', w: 700, fill: C.red });
    X.text(1300, 380, 'Aran', { parent: g, size: 26, anchor: 'middle', w: 700, fill: C.green });
    const dots = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 22; c++) dots.push(E('circle', { cx: 580 + c * 13.5, cy: 410 + r * 18, r: 5, fill: C.red, opacity: 0 }, g));
    X.each(() => { const p = X.L(k, f + 0.05, f + 0.45); const n = Math.round(p * dots.length); dots.forEach((d, i) => d.setAttribute('opacity', i < n ? 0.85 : 0)); });
    const n1 = X.text(720, 600, '0', { parent: g, size: 52, serif: true, w: 700, anchor: 'middle', fill: C.red });
    X.count(n1, 0, 67481, k, { f0: f + 0.05, f1: f + 0.45 });
    const vs = X.text(1010, 500, 'vs', { parent: g, size: 40, serif: true, italic: true, anchor: 'middle', fill: C.ink3 });
    for (let i = 0; i < 6; i++) { const d = X.circle(1240 + (i % 3) * 60, 440 + Math.floor(i / 3) * 60, 18, { parent: g, fill: C.green }); X.show(d, k, { f: 0.72 + i * 0.03, type: 'pop' }); }
    const n2 = X.text(1300, 600, '6', { parent: g, size: 52, serif: true, w: 700, anchor: 'middle', fill: C.green });
    X.show(n2, k, { f: 0.72, type: 'pop' });
    X.term(k, 'Pattern search', 'Looking for any run of digits with the right shape,\nlike "any 6 digits must be an OTP".', { f: 0.3, until: k + 1 });
  }
  // 2: where is the AI
  {
    const k = 2, f = Q[1].qf, g = pic(k, f);
    const items = [[680, 'brain', 'names and\naddresses', 0.22], [1010, 'magnifier', 'OTP and UPI ID\nvs look-alikes', 0.45], [1340, null, 'honest\nprobability', 0.75]];
    items.forEach(([x, ic, lab, ff]) => {
      const it = X.g(g);
      if (ic) { const icn = X.icon(ic, x, 440, 0.75, { parent: it }); X.bob(icn.mid, { amp: 5, per: 2.2, ph: x }); }
      else {
        E('rect', { x: x - 80, y: 418, width: 160, height: 36, rx: 10, fill: C.card, stroke: C.ink, 'stroke-width': 3 }, it);
        const bar = E('rect', { x: x - 76, y: 422, width: 0, height: 28, rx: 7, fill: C.plum }, it);
        X.each(t => bar.setAttribute('width', (152 * (0.62 + 0.25 * X.P(k, ff, 0, 1.2) + 0.03 * Math.sin(t * 2))).toFixed(1)));
        X.text(x, 400, 'how sure?', { parent: it, size: 22, anchor: 'middle', fill: C.ink2 });
      }
      X.text(x, 540, lab, { parent: it, size: 24, anchor: 'middle', w: 600, lh: 30 });
      X.show(X.wrap(it), k, { f: ff, type: 'pop' });
    });
    X.term(k, 'UPI ID', 'An address for receiving money by phone,\nlike ravi@oksbi.', { f: 0.42, until: k, outf: 0.66 });
    X.term(k, 'Probability', 'A number from 0 to 1: how sure Aran is that\nsomething really is personal data.', { f: 0.68, until: k + 1 });
  }
  // 3: real data? never
  {
    const k = 3, f = Q[2].qf, g = pic(k, f);
    X.icon('log', 660, 455, 0.8, { parent: g });
    X.text(660, 560, 'real, public logs', { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    X.icon('idcard', 1010, 455, 1.1, { parent: g });
    X.text(1010, 560, 'identifiers', { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    const stamp = X.g(g);
    const si = E('g', { transform: 'rotate(-12 1010 455)' }, stamp);
    E('rect', { x: 910, y: 425, width: 200, height: 60, rx: 8, fill: C.card, stroke: C.red, 'stroke-width': 5, opacity: 0.95 }, si);
    X.text(1010, 467, 'MADE UP', { parent: si, size: 32, w: 800, anchor: 'middle', fill: C.red, ls: 2 });
    X.show(X.wrap(stamp), k, { f: 0.62, type: 'pop', len: 0.4 });
    const dg = X.digits(1340, 425, '234567890124', { groups: [4, 4, 4], cw: 22, ch: 38, size: 22, gap: 2, groupGap: 10, parent: g });
    dg.paint(11, C.greenL, C.green, C.green);
    const tk = X.mark(1340, 515, true, { parent: g, s: 22 });
    X.show(tk, k, { f: 0.85, type: 'pop' });
    X.text(1340, 575, 'valid check digit', { parent: g, size: 24, anchor: 'middle', fill: C.green, w: 600 });
    X.term(k, 'Identifier', 'A number that points to one person, like an\nAadhaar, PAN or mobile number.', { f: 0.5, until: k + 1 });
  }
  // 4: tokens keep the shape
  {
    const k = 4, f = Q[3].qf, g = pic(k, f);
    X.text(700, 400, 'real', { parent: g, size: 24, anchor: 'end', fill: C.ink2 });
    X.digits(1010, 368, '234567890124', { groups: [4, 4, 4], cw: 36, ch: 50, size: 28, gap: 4, groupGap: 18, parent: g });
    const tokG = X.g(g);
    const tl = X.text(700, 532, 'token', { parent: tokG, size: 24, anchor: 'end', fill: C.blue });
    const tok = X.digits(1010, 500, '249826846187', { groups: [4, 4, 4], cw: 36, ch: 50, size: 28, gap: 4, groupGap: 18, parent: tokG, fill: C.blueL, stroke: C.blue, color: C.blue });
    X.show(tokG, k, { f: f + 0.05, type: 'down' });
    const ar = X.arrow(1010, 425, 1010, 492, { color: C.ink3, sw: 4, head: 14, parent: g });
    X.show(ar, k, { f: f, type: 'draw' });
    const same = X.chip(1400, 470, 'same shape', { parent: g, size: 24, fill: C.greenL, color: C.green });
    X.show(same, k, { f: f + 0.2, type: 'pop' });
    // an allowed system turns the token back into the real value
    X.each(() => {
      const back = X.t > X.at(k, 0.8);
      tok.set(back ? '234567890124' : '249826846187');
      for (let i = 0; i < 12; i++) tok.paint(i, back ? C.tealL : C.blueL, back ? C.teal : C.blue, back ? C.teal : C.blue);
      tl.set(back ? 'unlocked' : 'token');
      tl.t.setAttribute('fill', back ? C.teal : C.blue);
    });
    const key = X.icon('key', 830, 592, 0.4, { parent: g });
    X.show(key, k, { f: 0.72, type: 'pop' });
    X.shake(key.mid, k, { f: 0.78, amp: 6 });
    const al = X.text(880, 600, 'allowed systems get the real value back', { parent: g, size: 22, fill: C.teal, w: 600 });
    X.show(al, k, { f: 0.75, type: 'up' });
    X.term(k, 'Tokenising', 'Swapping a real number for a look-alike stand-in\n(a token) that is useless to a thief.', { until: k + 1 });
  }
  // 5: twelve disguises
  {
    const k = 5, f = Q[4].qf, g = pic(k, f);
    const dis = ['98765-43210', '9876543210', '98765.43210', '(98765)43210', '+919876543210', '98765_43210', '987-654-3210', '9876 543 210', '98765/43210', '98765 432 10', '98765:43210', '98765,43210'];
    dis.forEach((d, i) => {
      const x = 640 + (i % 4) * 240, y = 385 + Math.floor(i / 4) * 54;
      const ch = X.chip(x, y, d, { parent: g, size: 21, mono: true, width: 214, fill: C.card });
      X.show(ch, k, { f: f + 0.02 + i * 0.02, type: 'pop' });
      const ok = X.circle(x + 98, y - 18, 11, { parent: g, fill: C.green });
      X.show(ok, k, { f: f + 0.28 + i * 0.015, type: 'pop' });
    });
    X.text(530, 584, 'Red team tricks caught', { parent: g, size: 24, w: 600, fill: C.ink2 });
    X.bar(810, 562, 440, 30, 22 / 26, k, { parent: g, color: C.green, f0: 0.7, f1: 0.92 });
    const c = X.text(1270, 586, '0 of 26', { parent: g, size: 26, w: 700, fill: C.green });
    X.count(c, 0, 22, k, { f0: 0.7, f1: 0.92, post: ' of 26' });
    X.term(k, 'Red team', 'Friendly attackers who try every trick to break\na system, so its weak spots are found first.', { f: 0.62, until: k + 1 });
  }
  // 6: typo repair 99.2%
  {
    const k = 6, f = Q[5].qf, g = pic(k, f);
    const dg = X.digits(1010, 372, '234561890124', { groups: [4, 4, 4], cw: 44, ch: 58, size: 32, gap: 5, groupGap: 20, parent: g });
    X.each(() => {
      const fixed = X.t > X.at(k, f + 0.25);
      dg.set(fixed ? '234567890124' : '234561890124');
      dg.paint(5, fixed ? C.greenL : C.redL, fixed ? C.green : C.red, fixed ? C.green : C.red);
    });
    const big = X.text(1010, 560, '0%', { parent: g, size: 84, serif: true, w: 700, anchor: 'middle', fill: C.green });
    X.count(big, 0, 99.2, k, { f0: f + 0.2, f1: 0.85, fmt: n => n.toFixed(1), post: '%' });
    X.text(1010, 604, 'of one-typo numbers caught', { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    X.term(k, 'Typo repair', 'Spotting a number even when one digit was typed\nwrong, by working back from the check digit.', { f: 0.35, until: k + 1 });
  }
  // 7: time-locked KYC keys
  {
    const k = 7, f = Q[6].qf, g = pic(k, f);
    X.icon('lock', 640, 470, 0.9, { parent: g, fill: C.ochreL });
    const ck = X.icon('clock', 680, 505, 0.42, { parent: g });
    X.spin(ck.inner.lastChild, 0, 0, { speed: 240 });
    X.text(640, 590, 'time lock', { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    X.text(1030, 420, 'legal keeping period', { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    X.bar(780, 440, 500, 26, 1, k, { parent: g, color: C.ochre, f0: f + 0.05, f1: 0.82 });
    X.icon('trash', 1390, 480, 0.8, { parent: g });
    const keyG = X.g(g);
    X.icon('key', 0, 0, 0.5, { parent: keyG });
    X.each(() => {
      const p = X.L(k, f + 0.05, 0.82), d = ease(X.L(k, 0.84, 0.96));
      const x = lerp(800, 1280, ease(p)) + d * 110, y = 520 - d * 70 + d * d * 30;
      keyG.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(d * 70).toFixed(1)})`);
      keyG.setAttribute('opacity', (1 - clamp((X.t - X.at(k, 0.96)) / 0.3)).toFixed(2));
    });
    const kl = X.text(1030, 590, 'KYC key', { parent: g, size: 24, anchor: 'middle', w: 700, fill: C.ochre });
    const dz = X.chip(1390, 590, 'destroyed', { parent: g, size: 22, fill: C.redL, color: C.red });
    X.show(dz, k, { f: 0.9, type: 'pop' });
    X.term(k, 'KYC', 'Know Your Customer: the ID checks and records\na bank must keep by law.', { f: 0.15, until: k, outf: 0.55 });
    X.term(k, 'Time lock', 'A key that cannot be destroyed before a set date,\nand is destroyed automatically on that date.', { f: 0.58, until: k + 1 });
  }
  // 8: speed
  {
    const k = 8, f = Q[7].qf, g = pic(k, f);
    const gx = 900, gy = 585, R = 150, MAX = 3000;
    const ang = v => Math.PI + Math.PI * v / MAX;
    const pt = (v, r) => [gx + r * Math.cos(ang(v)), gy + r * Math.sin(ang(v))];
    E('path', { d: `M${gx - R},${gy} A${R},${R} 0 0 1 ${gx + R},${gy}`, fill: 'none', stroke: C.sand, 'stroke-width': 30 }, g);
    const [ax, ay] = pt(1000, R);
    E('path', { d: `M${ax.toFixed(1)},${ay.toFixed(1)} A${R},${R} 0 0 1 ${gx + R},${gy}`, fill: 'none', stroke: C.green, 'stroke-width': 30, opacity: 0.75 }, g);
    for (let v = 0; v <= MAX; v += 500) { const [x1, y1] = pt(v, R - 24), [x2, y2] = pt(v, R + 18); E('line', { x1, y1, x2, y2, stroke: C.ink, 'stroke-width': 3 }, g); }
    const needle = E('g', null, g);
    E('path', { d: `M0,-8 L${R - 20},0 L0,8 Z`, fill: C.red }, needle);
    E('circle', { cx: gx, cy: gy, r: 14, fill: C.ink }, g);
    X.each(t => {
      const v = 654 * X.P(k, f, 0, 1.2) + 30 * Math.sin(t * 6);
      needle.setAttribute('transform', `translate(${gx} ${gy}) rotate(${(ang(Math.max(0, v)) * 180 / Math.PI).toFixed(2)})`);
    });
    X.text(1110, 440, 'Today: 654 lines a second', { parent: g, size: 28, w: 700, fill: C.red });
    const n2 = X.text(1110, 500, 'Big bank: thousands', { parent: g, size: 28, w: 700, fill: C.green });
    X.show(n2, k, { f: f + 0.15, type: 'up' });
    const n3 = X.chip(1250, 570, 'faster version planned', { parent: g, size: 24, fill: C.blueL, color: C.blue });
    X.show(n3, k, { f: 0.7, type: 'pop' });
  }
  // 9: a product
  {
    const k = 9, f = Q[8].qf, g = pic(k, f);
    const bx = X.g(g);
    E('rect', { x: 600, y: 410, width: 200, height: 130, rx: 6, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, bx);
    E('rect', { x: 594, y: 398, width: 212, height: 22, rx: 5, fill: C.ochre, stroke: C.ink, 'stroke-width': 4 }, bx);
    X.text(700, 492, 'Aran', { parent: bx, size: 40, serif: true, w: 700, anchor: 'middle' });
    X.bob(bx, { amp: 5, per: 2 });
    X.text(700, 595, 'the product', { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    const a1 = X.arrow(820, 470, 930, 470, { color: C.ink3, sw: 4, head: 14 }); g.appendChild(a1);
    X.show(a1, k, { f: 0.35, type: 'draw' });
    const b1 = X.g(g); X.icon('bank', 1040, 460, 0.8, { parent: b1 }); X.text(1040, 560, 'its own servers', { parent: b1, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(b1, k, { f: 0.4, type: 'pop' });
    const or = X.text(1180, 478, 'or', { parent: g, size: 30, serif: true, italic: true, anchor: 'middle', fill: C.ink3 });
    X.show(or, k, { f: 0.65, type: 'fade' });
    const c1 = X.g(g); const cl = X.icon('cloud', 1340, 460, 0.95, { parent: c1 }); X.text(1340, 560, 'as a service', { parent: c1, size: 24, anchor: 'middle', fill: C.ink2 });
    X.bob(cl.mid, { amp: 5, per: 2.4, ph: 1 });
    X.show(c1, k, { f: 0.72, type: 'pop' });
    X.term(k, 'As a service', 'Instead of installing it, a bank uses Aran\nover the internet, run by someone else.', { f: 0.68, until: k + 1 });
  }

  X.recap(10, ['Aran is not just pattern search', 'It never uses real people\'s data', 'It says plainly where it is still weak']);
});
