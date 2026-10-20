// What is personal data? Ravi and his data bubbles, a crowd narrowed down to one person, and a criminal misusing his details.
scene('personal', X => {
  // keyframed position for a person: keys [{k,f,x,y,s,len}] (first = start)
  const track = (p, keys, o = {}) => X.each(() => {
    let x = keys[0].x, y = keys[0].y, s = keys[0].s;
    for (const kf of keys.slice(1)) {
      const q = ease(clamp((X.t - X.at(kf.k, kf.f || 0)) / (kf.len || 1.2)));
      x = lerp(x, kf.x, q); y = lerp(y, kf.y, q); s = lerp(s, kf.s, q);
    }
    p.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(o.flip ? -s : s).toFixed(3)},${s.toFixed(3)})`);
  });
  const floaty = (k, o = {}) => { const outer = X.g(); const inner = X.g(outer); X.show(outer, k, o); X.bob(inner, { amp: o.amp || 6, per: o.per || 3.2, ph: o.ph || 0 }); return inner; };

  X.cam([{ x: 960, y: 520, s: 1.05 }, { k: 1, x: 960, y: 560, s: 1.0, len: 1.6 }, { k: 3, x: 1000, y: 560, s: 1.0 },
    { k: 4, f: 0.2, x: 990, y: 590, s: 1.04 }, { k: 5, x: 960, y: 560, s: 1.0 }, { k: 6, f: 0.5, x: 1000, y: 540, s: 1.04 }, { k: 7, x: 960, y: 540, s: 1.0 }]);

  // ---- cue 0: five basic words, one at a time
  const words = ['data', 'personal data', 'PII', 'sensitive', 'identifier'];
  const head0 = X.text(960, 330, 'Five basic words', { anchor: 'middle', size: 40, serif: true, w: 600 });
  X.show(head0, 0, { type: 'down', out: 1, outLen: 0.4 });
  words.forEach((w, i) => {
    const cx = 360 + i * 300;
    const g = floaty(0, { f: 0.15 + i * 0.13, type: 'pop', out: 1, outLen: 0.4, ph: i * 1.3, amp: 7 });
    X.box(cx - 130, 450, 260, 100, { parent: g, label: w, size: 32, serif: true, fill: i === 0 ? C.ochreL : C.card, stroke: i === 0 ? C.ochre : C.line });
    X.text(cx, 610, String(i + 1), { parent: g, anchor: 'middle', size: 28, fill: C.ink3, w: 600 });
  });

  // ---- Ravi
  const ravi = X.person(960, 860, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 1.1 });
  const ring = E('ellipse', { cx: 0, cy: 6, rx: 62, ry: 16, fill: 'none', stroke: C.ochre, 'stroke-width': 6, opacity: 0 }, null);
  ravi.g.insertBefore(ring, ravi.g.firstChild);
  const raviPhone = X.icon('phone', 74, -214, 0.36, { parent: ravi.body });
  raviPhone.style.display = 'none';
  X.show(ravi, 1, { type: 'up' });
  track(ravi, [{ x: 960, y: 860, s: 1.1 }, { k: 3, f: 0.05, x: 1270, y: 640, s: 0.55, len: 1.3 }, { k: 5, f: 0.05, x: 560, y: 860, s: 1.0, len: 1.4 },
    { k: 7, f: 0.0, x: 1230, y: 860, s: 0.95, len: 1.4 }]);
  X.wave(ravi, 1, { f: 0.05, len: 1.6 });
  X.each(t => {
    const call = t > X.at(6, 0.62) && t < X.at(7);
    raviPhone.style.display = call && t > X.at(6, 0.62) + 0.35 ? '' : 'none';
    if (call) X.arms(ravi, 8, lerp(-8, 150, clamp((t - X.at(6, 0.62)) / 0.4)));
    else if (t >= X.at(7)) X.arms(ravi, 8, lerp(150, -8, clamp((t - X.at(7)) / 0.4)));
    else if (t > X.at(2) && t < X.at(6, 0.62)) X.arms(ravi, 8, -8);
    ravi.mood(call ? (Math.sin(t * 9) > 0.6 ? 'shock' : 'sad') : (t > X.at(1) && t < X.at(3) ? 'happy' : 'neutral'));
    // ring under Ravi while in the crowd
    const r = (t > X.at(3, 0.3) && t < X.at(5)) ? 1 : 0;
    ring.setAttribute('opacity', r);
    ring.setAttribute('stroke', t > X.at(4) ? C.blue : C.ochre);
  });

  // ---- cue 1: data bubbles
  const bubLine = (x1, y1) => { const l = X.path(`M${x1},${y1} Q${(x1 + 960) / 2},${Math.min(y1, 560) + 120} 960,600`, { color: C.line, sw: 3, dash: '3 10' }); return l; };
  const nameB = floaty(1, { f: 0.25, type: 'pop', out: 3, outLen: 0.5, ph: 0.3 });
  X.text(560, 285, 'a name', { parent: nameB, anchor: 'middle', size: 24, fill: C.ink3 });
  X.box(400, 300, 320, 100, { parent: nameB, label: 'Ravi Kumar', size: 36, serif: true });
  const numB = floaty(1, { f: 0.5, type: 'pop', out: 3, outLen: 0.5, ph: 1.7 });
  X.text(1360, 285, 'a number', { parent: numB, anchor: 'middle', size: 24, fill: C.ink3 });
  X.box(1190, 300, 340, 100, { parent: numB, label: '98765 43210', size: 36, mono: true });
  const photoB = floaty(1, { f: 0.76, type: 'pop', out: 3, outLen: 0.5, ph: 3.1 });
  X.text(960, 195, 'a photo', { parent: photoB, anchor: 'middle', size: 24, fill: C.ink3 });
  X.rect(880, 212, 160, 180, { parent: photoB, fill: C.blueL, stroke: C.ink2, r: 10, shadow: true });
  E('path', { d: 'M905,392 Q905,330 960,330 Q1015,330 1015,392 Z', fill: C.blue }, photoB);
  E('circle', { cx: 960, cy: 290, r: 36, fill: C.skin[1] }, photoB);
  E('path', { d: 'M923,284 Q922,244 960,246 Q998,244 997,284 Q982,266 960,266 Q938,266 923,284 Z', fill: C.hair }, photoB);
  E('circle', { cx: 948, cy: 292, r: 4, fill: C.ink }, photoB); E('circle', { cx: 972, cy: 292, r: 4, fill: C.ink }, photoB);
  E('path', { d: 'M948,308 Q960,318 972,308', fill: 'none', stroke: C.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, photoB);
  [[560, 400, 0.25], [1360, 400, 0.5], [960, 392, 0.76]].forEach(([x, y, f]) => X.show(bubLine(x, y), 1, { f, type: 'draw', out: 3, outLen: 0.4 }));
  X.term(1, 'Data', 'Information. A name, a number and a photo\nare all data.', { until: 2 });

  // ---- cue 2: personal data boundary
  const bound = X.path('M330,250 Q330,170 410,170 L1510,170 Q1590,170 1590,250 L1590,840 Q1590,920 1510,920 L410,920 Q330,920 330,840 Z', { color: C.ochre, sw: 4, dash: '14 10' });
  X.show(bound, 2, { type: 'fade', out: 3, outLen: 0.4 });
  const bTab = X.chip(560, 170, 'personal data', { size: 28, color: C.ochre, fill: C.ochreL, stroke: C.ochre });
  X.show(bTab, 2, { f: 0.15, type: 'pop', out: 3, outLen: 0.4 });
  X.term(2, 'Personal data', 'Any information about a real, living person.', { until: 3 });

  // ---- cue 3: a crowd, narrowed down
  const r = rng(11);
  const shirts = [C.teal, C.plum, C.ochre, C.green, C.red, C.ink2, C.blue];
  const crowd = [];
  const madurai = new Set([1, 4, 6, 9, 12, 15, 17, 19]);
  let idx = 0;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
    if (row === 1 && col === 3) continue; // Ravi's place
    const x = 820 + col * 150 + (row % 2 ? 22 : -8), y = 450 + row * 190;
    const p = X.person(x, y, { shirt: shirts[Math.floor(r() * shirts.length)], skin: C.skin[Math.floor(r() * 4)], long: r() < 0.45, glasses: r() < 0.2, s: 0.55, ph: r() * 6 });
    const pr = E('ellipse', { cx: 0, cy: 6, rx: 62, ry: 16, fill: 'none', stroke: C.ochre, 'stroke-width': 6, opacity: 0 }, null);
    p.g.insertBefore(pr, p.g.firstChild);
    const w = X.wrap(p);
    X.show(w, 3, { f: 0.04 + idx * 0.012, type: 'pop', out: 5, outLen: 0.5 });
    crowd.push({ p, pr, m: madurai.has(idx) });
    idx++;
  }
  X.each(t => {
    const a = X.P(3, 0.32, 0, 0.6), b = X.P(4, 0.15, 0, 0.8);
    crowd.forEach(c => {
      const op = c.m ? lerp(1, 0.18, b) : lerp(1, 0.3, a) * lerp(1, 0.5, b);
      c.p.setAttribute('opacity', op.toFixed(3));
      c.pr.setAttribute('opacity', (c.m ? a * (1 - b) : 0).toFixed(3));
    });
  });
  const madG = X.g();
  X.text(360, 330, 'personal data', { parent: madG, anchor: 'middle', size: 26, fill: C.ochre, w: 700 });
  X.box(160, 350, 400, 96, { parent: madG, label: 'lives in Madurai', size: 32, fill: C.ochreL, stroke: C.ochre });
  X.text(360, 490, 'points to many people', { parent: madG, anchor: 'middle', size: 26, fill: C.ink2 });
  X.show(madG, 3, { f: 0.28, type: 'left', out: 5, outLen: 0.5 });
  const madA = X.arrow(575, 398, 760, 398, { color: C.ochre, sw: 4 });
  X.show(madA, 3, { f: 0.35, type: 'draw', out: 4, outLen: 0.4 });
  X.term(3, 'PII', 'Personally identifiable information: data that\npoints straight at one single person.', { f: 0.5, until: 5 });

  // ---- cue 4: Aadhaar points to exactly one
  const aadG = X.g();
  X.text(360, 570, 'PII', { parent: aadG, anchor: 'middle', size: 30, fill: C.blue, w: 700 });
  X.rect(130, 590, 460, 130, { parent: aadG, fill: C.blueL, stroke: C.blue, r: 16, shadow: true });
  X.icon('idcard', 210, 655, 0.6, { parent: aadG, accent: C.ochreL });
  X.text(280, 640, 'Aadhaar', { parent: aadG, size: 28, serif: true, w: 600 });
  X.text(280, 685, '2345 6789 0124', { parent: aadG, size: 30, mono: true, w: 600 });
  X.show(aadG, 4, { type: 'left', out: 5, outLen: 0.5 });
  const aadA = X.arrow(600, 640, 1205, 560, { color: C.blue, sw: 5, bend: -0.12 });
  X.show(aadA, 4, { f: 0.15, type: 'draw', len: 0.9, out: 5, outLen: 0.4 });
  const cntG = X.g();
  X.text(360, 790, 'people with this number', { parent: cntG, anchor: 'middle', size: 24, fill: C.ink2 });
  const cnt = X.text(360, 850, '', { parent: cntG, anchor: 'middle', size: 46, serif: true, w: 600, fill: C.blue });
  X.count(cnt, 1400000000, 1, 4, { f0: 0.25, f1: 0.8, fmt: n => fmt(Math.max(1, n)) });
  X.show(cntG, 4, { f: 0.2, type: 'up', out: 5, outLen: 0.5 });
  const one = X.chip(1270, 700, 'only one', { size: 26, color: C.blue, fill: C.blueL });
  X.show(one, 4, { f: 0.8, type: 'pop', out: 5, outLen: 0.4 });

  // ---- cue 5: sensitive
  const sens = [['Aadhaar', '2345 6789 0124', 360], ['Mobile', '98765 43210', 470]];
  sens.forEach(([lab, val, y], i) => {
    const g = floaty(5, { f: 0.25 + i * 0.12, type: 'left', out: 7, outLen: 0.5, ph: i * 2 });
    const box = X.rect(250, y - 40, 470, 80, { parent: g, fill: C.card, stroke: C.line, r: 40, shadow: true });
    X.text(290, y + 10, lab, { parent: g, size: 24, fill: C.ink2, w: 600 });
    X.text(420, y + 12, val, { parent: g, size: 30, mono: true, w: 600 });
    const tag = X.chip(760, y - 34, 'sensitive', { size: 22, color: C.red, fill: C.redL, stroke: C.red, parent: g });
    X.show(tag, 5, { f: 0.55 + i * 0.1, type: 'pop' });
    X.each(t => { const on = t > X.at(5, 0.55 + i * 0.1); box.r.setAttribute('stroke', on ? C.red : C.line); box.r.setAttribute('stroke-width', on ? 4 : 2); });
  });
  X.term(5, 'Sensitive', 'Data that could hurt the person\nif it fell into the wrong hands.', { until: 6 });

  // attacker (faces left)
  const att = X.person(1480, 860, { shirt: C.ink2, skin: C.skin[3], hood: C.ink, s: 1.0 });
  E('path', { d: 'M-24,-212 L24,-212 L22,-198 L4,-198 L0,-204 L-4,-198 L-22,-198 Z', fill: C.ink }, att.body);
  const attPhone = X.icon('phone', 74, -214, 0.36, { parent: att.body });
  track(att, [{ x: 1480, y: 860, s: 1 }], { flip: true });
  X.show(att, 5, { f: 0.45, type: 'right', out: 7, outLen: 0.5 });
  X.each(t => {
    const ph = t > X.at(6, 0.28);
    attPhone.style.display = t > X.at(6, 0.28) + 0.35 ? '' : 'none';
    X.arms(att, t > X.at(6, 0.05) ? 30 : 8, ph ? lerp(-8, 150, clamp((t - X.at(6, 0.28)) / 0.4)) : -8);
    att.mood(t > X.at(6) ? (X.on(6, 7) && Math.sin(t * 20) > 0 && t > X.at(6, 0.35) ? 'open' : 'happy') : 'neutral');
  });
  // ---- cue 6: the criminal copies the details and calls
  sens.forEach(([lab, val, y], i) => {
    const c = X.g(); X.chip(0, 0, val, { size: 22, mono: true, color: C.red, fill: C.redL, stroke: C.red, parent: c });
    X.show(c, 6, { f: 0.04 + i * 0.06, type: 'fade', len: 0.3, out: 7, outLen: 0.4 });
    X.travel(c, spline([[485, y], [900, y - 120 + i * 40], [1480, 500 + i * 64]]), 6, { f0: 0.04 + i * 0.06, f1: 0.3 + i * 0.06 });
  });
  const say1 = X.g();
  X.rect(980, 230, 560, 92, { parent: say1, fill: C.card, stroke: C.ink2, r: 18, shadow: true });
  E('path', { d: 'M1360,320 L1395,370 L1400,320 Z', fill: C.card, stroke: C.ink2, 'stroke-width': 2 }, say1);
  X.text(1260, 287, '"Hello, I am Ravi Kumar..."', { parent: say1, anchor: 'middle', size: 30, w: 500, italic: true });
  X.show(say1, 6, { f: 0.3, type: 'pop', out: 6, outf: 0.6, outLen: 0.3 });
  const say2 = X.g();
  X.rect(900, 230, 640, 92, { parent: say2, fill: C.redL, stroke: C.red, r: 18, shadow: true });
  E('path', { d: 'M1360,320 L1395,370 L1400,320 Z', fill: C.redL, stroke: C.red, 'stroke-width': 2 }, say2);
  X.text(1220, 287, '"Sir, I am from your bank. Tell me the OTP."', { parent: say2, anchor: 'middle', size: 27, w: 500, italic: true });
  X.show(say2, 6, { f: 0.62, type: 'pop', out: 7, outLen: 0.4 });
  const callSp = spline([[1400, 640], [1150, 520], [900, 520], [650, 640]]);
  X.stream(callSp, { n: 7, speed: 0.55, r: 7, color: C.red, k0: 6, f0: 0.62, k1: 7 });
  const rings = X.g();
  [24, 40, 56].forEach((rr, i) => {
    const a = E('path', { d: `M${560 + 90 + rr * 0.7},${646 - rr * 0.7} A${rr},${rr} 0 0 1 ${560 + 90 + rr * 0.7},${646 + rr * 0.7}`, fill: 'none', stroke: C.red, 'stroke-width': 4, 'stroke-linecap': 'round' }, rings);
    X.each(t => a.setAttribute('opacity', X.on(6, 7) && t > X.at(6, 0.62) ? (0.5 + 0.5 * Math.sin(t * 8 - i)).toFixed(2) : 0));
  });

  // ---- cue 7: identifiers point to one person or one account
  const ids = [['Aadhaar', '2345 6789 0124', 470, [1185, 640]], ['PAN', 'ABCPK1234L', 610, [1180, 700]], ['UPI ID', 'ravi@oksbi', 330, [1560, 420]]];
  ids.forEach(([lab, val, y, tgt], i) => {
    const g = X.g();
    X.rect(170, y - 50, 560, 100, { parent: g, fill: C.card, stroke: C.blue, r: 18, shadow: true });
    X.text(200, y + 10, lab, { parent: g, size: 26, fill: C.ink2, w: 600 });
    X.text(370, y + 12, val, { parent: g, size: 32, mono: true, w: 600 });
    X.show(g, 7, { f: 0.1 + i * 0.15, type: 'left' });
    const a = X.arrow(740, y, tgt[0], tgt[1], { color: C.blue, sw: 4, bend: i === 2 ? -0.05 : -0.08 });
    X.show(a, 7, { f: 0.2 + i * 0.15, type: 'draw', len: 0.8 });
  });
  const acct = X.g();
  X.icon('bank', 1660, 420, 0.75, { parent: acct });
  X.text(1660, 500, "Ravi's account", { parent: acct, anchor: 'middle', size: 26, fill: C.ink2 });
  X.show(acct, 7, { f: 0.45, type: 'pop' });
  X.term(7, 'Identifier', 'A number or code that points to one person,\nor one account.', { until: 8 });

  X.recap(8, ['Data is information', 'PII points to one real person', 'Identifiers like Aadhaar are very sensitive']);
});
