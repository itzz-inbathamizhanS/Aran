// Honest weak spots: a "to improve" board; sticky notes are pinned one by one while the camera visits each.
scene('limits', X => {
  // note slots (3 x 2), each 470 x 320
  const NW = 470, NH = 320;
  const slots = [[350, 235], [840, 235], [1330, 235], [350, 575], [840, 575], [1330, 575]];
  const ctr = i => [slots[i][0] + NW / 2, slots[i][1] + NH / 2];
  const Z = 1.55;
  X.cam([
    { x: 960, y: 540, s: 1 },
    { k: 1, x: ctr(0)[0], y: ctr(0)[1], s: Z },
    { k: 2, f: 0.05, x: 1080, y: 400, s: 1.2 },
    { k: 3, x: ctr(1)[0], y: ctr(1)[1], s: Z },
    { k: 4, x: ctr(2)[0], y: ctr(2)[1], s: Z },
    { k: 5, x: ctr(3)[0], y: ctr(3)[1], s: Z },
    { k: 6, x: ctr(4)[0], y: ctr(4)[1], s: Z },
    { k: 7, x: ctr(5)[0], y: ctr(5)[1], s: Z },
    { k: 8, x: 960, y: 535, s: 1, len: 1.8 }
  ]);

  // ---------- the board ----------
  const board = X.g();
  X.rect(320, 145, 1510, 775, { parent: board, fill: C.paper, stroke: C.line, sw: 3, r: 18, shadow: 8 });
  const bt = X.text(350, 207, '', { parent: board, size: 40, serif: true, w: 600 });
  X.type(bt, 'To improve', 0, { f0: 0.15, f1: 0.45 });
  X.text(1800, 205, 'still weak, said plainly', { parent: board, size: 24, anchor: 'end', fill: C.ink3, italic: true });
  X.show(board, 0, { type: 'fade', len: 0.8 });

  slots.forEach(([nx, ny], i) => {
    const ph = X.g();
    X.rect(nx + 8, ny + 8, NW - 16, NH - 16, { parent: ph, fill: 'none', stroke: C.line, dash: '10 9', r: 10 });
    X.text(nx + NW / 2, ny + NH / 2 + 22, '?', { parent: ph, size: 64, anchor: 'middle', serif: true, fill: C.line });
    X.show(ph, 0, { f: 0.35 + i * 0.07, type: 'pop' });
  });

  // the presenter who pins the notes
  const pres = X.person(170, 885, { shirt: C.green, skin: C.skin[1], s: 1.15, ph: 0.7 });
  X.show(pres, 0, { type: 'right' });
  X.each(() => pres.mood(X.on(1, 8) ? 'happy' : 'neutral'));
  X.talk(pres, [0, 8]);
  const noteCue = [1, 3, 4, 5, 6, 7];
  X.each(t => {
    // point at the note being pinned for the first ~45% of its line
    let ang = -8;
    noteCue.forEach((k, i) => {
      const [nx, ny] = ctr(i);
      const target = 90 + Math.atan2(712 - ny, nx - 211) * 180 / Math.PI;
      const a = X.P(k, 0, 0, 0.5) * (1 - X.P(k, 0.45, 0, 0.5));
      if (a > 0.001) ang = lerp(-8, target, a);
    });
    X.arms(pres, 8, ang);
  });

  // ---------- sticky note factory ----------
  const fills = [C.ochreL, C.redL, C.blueL, C.tealL, C.greenL, C.plumL];
  const rots = [-1.4, 1.1, -0.8, 1.3, -1.1, 0.8];
  const notes = slots.map(([nx, ny], i) => {
    const outer = X.g();
    const inner = E('g', null, outer);
    const cx = nx + NW / 2, cy = ny + NH / 2;
    X.rect(nx, ny, NW, NH, { parent: inner, fill: fills[i], stroke: C.line, sw: 2, r: 6, shadow: 7 });
    E('rect', { x: nx, y: ny, width: NW, height: 22, rx: 6, fill: C.card, opacity: 0.45 }, inner);
    E('circle', { cx, cy: ny + 14, r: 11, fill: C.red, stroke: C.ink, 'stroke-width': 2 }, inner);
    X.show(outer, noteCue[i], { type: 'down', dist: 60, len: 0.8 });
    X.each(t => {
      const a = rots[i] + 0.35 * Math.sin(t * 0.9 + i * 1.7);
      inner.setAttribute('transform', `rotate(${a.toFixed(2)} ${cx} ${cy})`);
    });
    return { g: inner, nx, ny, cx, cy };
  });
  const title = (n, str) => X.text(n.nx + 28, n.ny + 64, str, { parent: n.g, size: 32, serif: true, w: 600 });

  // ---------- note 1: names ----------
  {
    const n = notes[0], k = 1;
    title(n, 'Names');
    X.text(n.nx + 28, n.ny + 104, 'caught today', { parent: n.g, size: 22, fill: C.ink2 });
    X.bar(n.nx + 28, n.ny + 122, 320, 36, 0.77, k, { parent: n.g, color: C.ochre, track: C.card, f0: 0.15, f1: 0.45 });
    const pct = X.text(n.nx + 366, n.ny + 152, '0%', { parent: n.g, size: 36, serif: true, w: 700, fill: C.ochre });
    X.count(pct, 0, 77, k, { f0: 0.15, f1: 0.45, post: '%' });
    const chips = [['Ravi Kumar', 105, true], ['Asha', 240, true], ['Vel', 330, false]];
    chips.forEach(([s, x, ok], j) => {
      const ch = X.chip(n.nx + x, n.ny + 212, s, { parent: n.g, size: 22, fill: ok ? C.greenL : C.card, color: ok ? C.green : C.red });
      if (!ok) ch.r.setAttribute('stroke-dasharray', '6 5');
      X.show(ch, k, { f: 0.35 + j * 0.06, type: 'pop' });
    });
    const miss = X.mark(n.nx + 400, n.ny + 212, false, { parent: n.g, s: 16 });
    X.show(miss, k, { f: 0.55, type: 'pop' });
    const fix = X.chip(n.nx + 200, n.ny + 278, 'planned fix: transformer', { parent: n.g, size: 22, fill: C.plumL, color: C.plum });
    X.show(fix, k, { f: 0.72, type: 'up' });
    X.term(1, 'Transformer', 'A newer kind of AI model. It reads a whole\nsentence at once to understand its meaning.', { until: 3 });
  }

  // ---------- transformer explainer panel (cue 2, uses the empty space of notes 2 and 3) ----------
  {
    const k = 2;
    const pan = X.g();
    X.rect(835, 232, 975, 352, { parent: pan, fill: C.card, stroke: C.line, r: 16, shadow: true });
    X.text(865, 274, 'How a transformer reads', { parent: pan, size: 30, serif: true, w: 600 });
    X.show(pan, k, { type: 'up', out: 3, outLen: 0.6 });
    // robot reader (drawn around its head-top centre, then placed)
    const bot = X.g(pan);
    const botIn = E('g', null, bot);
    const botBody = E('g', { transform: 'translate(930 440) scale(0.7)' }, botIn);
    E('line', { x1: 0, y1: 0, x2: 0, y2: -22, stroke: C.ink, 'stroke-width': 5 }, botBody);
    E('circle', { cx: 0, cy: -28, r: 9, fill: C.ochre, stroke: C.ink, 'stroke-width': 4 }, botBody);
    E('rect', { x: -50, y: 0, width: 100, height: 78, rx: 18, fill: C.plumL, stroke: C.ink, 'stroke-width': 5 }, botBody);
    const eyes = E('g', null, botBody);
    E('circle', { cx: -20, cy: 33, r: 9, fill: C.ink }, eyes); E('circle', { cx: 20, cy: 33, r: 9, fill: C.ink }, eyes);
    E('path', { d: 'M-18,57 Q0,65 18,57', fill: 'none', stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, botBody);
    E('rect', { x: -58, y: 87, width: 116, height: 96, rx: 14, fill: C.plum, stroke: C.ink, 'stroke-width': 5 }, botBody);
    E('rect', { x: -30, y: 111, width: 60, height: 34, rx: 6, fill: C.plumL }, botBody);
    E('rect', { x: -35, y: 183, width: 22, height: 22, rx: 4, fill: C.ink }, botBody); E('rect', { x: 13, y: 183, width: 22, height: 22, rx: 4, fill: C.ink }, botBody);
    // the sentence
    const words = ['Ravi', 'Kumar', 'paid', 'Asha', '₹500', 'today'];
    let x = 1045;
    const W = words.map(w => {
      const ww = w.length * 26 * 0.56 + 30;
      const g = X.g(pan);
      const r = E('rect', { x, y: 300, width: ww, height: 50, rx: 10, fill: C.paper, stroke: C.line, 'stroke-width': 2 }, g);
      X.text(x + ww / 2, 334, w, { parent: g, size: 26, anchor: 'middle', w: 600 });
      const o = { r, cx: x + ww / 2, x, w: ww };
      x += ww + 14;
      return o;
    });
    // sight lines from the robot's eyes
    const lines = W.map(o => E('line', { x1: 930, y1: 452, x2: o.cx, y2: 352, stroke: C.plum, 'stroke-width': 3, 'stroke-dasharray': '6 6' }, pan));
    const lab = X.text(1045, 530, '', { parent: pan, size: 24, w: 600 });
    const nameChips = [X.chip((W[0].x + W[1].x + W[1].w) / 2, 392, 'name', { parent: pan, size: 22, fill: C.greenL, color: C.green }),
      X.chip(W[3].cx, 392, 'name', { parent: pan, size: 22, fill: C.greenL, color: C.green })];
    nameChips.forEach((c, j) => X.show(c, k, { f: 0.72 + j * 0.06, type: 'pop' }));
    const chatI = X.g(pan);
    X.icon('chat', 1725, 488, 0.42, { parent: chatI });
    X.text(1725, 556, 'in AI chatbots', { parent: chatI, size: 22, anchor: 'middle', fill: C.ink2 });
    X.show(chatI, k, { f: 0.08, type: 'pop' });
    X.each(t => {
      const p = X.L(k, 0.05, 0.42);
      const all = X.t >= X.at(k, 0.45);
      const cur = Math.min(5, Math.floor(p * 6));
      W.forEach((o, j) => {
        const lit = all || (p > 0 && p < 1 && j === cur);
        o.r.setAttribute('fill', lit ? (all ? C.plumL : C.ochreL) : C.paper);
        o.r.setAttribute('stroke', lit ? (all ? C.plum : C.ochre) : C.line);
        lines[j].setAttribute('opacity', all ? 0.9 : (lit ? 0.9 : 0));
        lines[j].setAttribute('stroke', all ? C.plum : C.ochre);
        lines[j].setAttribute('stroke-dashoffset', (-t * 30).toFixed(1));
      });
      lab.set(all ? 'Transformer: all words at once' : 'Older models: one word at a time');
      lab.t.setAttribute('fill', all ? C.plum : C.ink2);
      eyes.setAttribute('transform', `translate(${all ? 0 : lerp(-5, 7, p)} ${-4 + Math.sin(t * 3) * 1})`);
      botIn.setAttribute('transform', `translate(0 ${(3 * Math.sin(t * 2.4)).toFixed(2)})`);
    });
  }

  // ---------- note 2: two new mistakes ----------
  {
    const n = notes[1], k = 3;
    title(n, 'Two new mistakes');
    const sx = n.nx + 24, sy = n.ny + 86;
    const slip = X.g(n.g);
    X.rect(sx, sy, 422, 140, { parent: slip, fill: C.card, stroke: C.ink3, r: 8 });
    X.text(sx + 18, sy + 32, 'CHEQUE', { parent: slip, size: 22, w: 700, fill: C.ink3, ls: 3 });
    X.text(sx + 404, sy + 32, '₹ 5,000', { parent: slip, size: 22, anchor: 'end', w: 600 });
    X.text(sx + 18, sy + 72, 'Pay: Asha', { parent: slip, size: 22, fill: C.ink2 });
    E('line', { x1: sx + 130, y1: sy + 78, x2: sx + 404, y2: sy + 78, stroke: C.line, 'stroke-width': 2 }, slip);
    const hl = E('rect', { x: sx + 12, y: sy + 96, width: 234, height: 36, rx: 6, fill: C.redL, opacity: 0 }, slip);
    X.text(sx + 18, sy + 122, 'No. 98765 43210', { parent: slip, size: 24, mono: true, w: 600 });
    X.show(slip, k, { f: 0.1, type: 'left' });
    const tag = X.chip(sx + 338, sy + 115, 'Mobile?', { parent: n.g, size: 22, fill: C.redL, color: C.red });
    X.show(tag, k, { f: 0.38, type: 'pop' });
    X.each(() => hl.setAttribute('opacity', X.P(k, 0.35, 0, 0.4)));
    const cross = X.mark(sx + 405, sy + 92, false, { parent: n.g, s: 18 });
    X.show(cross, k, { f: 0.55, type: 'pop' });
    const l1 = X.text(n.nx + 28, n.ny + 264, 'Read as a mobile number.', { parent: n.g, size: 22, fill: C.ink2 });
    const l2 = X.text(n.nx + 28, n.ny + 298, 'Must be fixed.', { parent: n.g, size: 24, w: 700, fill: C.red });
    X.show(l1, k, { f: 0.45, type: 'up' }); X.show(l2, k, { f: 0.8, type: 'up' });
  }

  // ---------- note 3: speed ----------
  {
    const n = notes[2], k = 4;
    title(n, 'Speed');
    const gx = n.nx + 122, gy = n.ny + 238, R = 90, MAX = 3000;
    const gg = X.g(n.g);
    const ang = v => Math.PI + Math.PI * v / MAX;
    const pt = (v, r) => [gx + r * Math.cos(ang(v)), gy + r * Math.sin(ang(v))];
    E('path', { d: `M${gx - R},${gy} A${R},${R} 0 0 1 ${gx + R},${gy}`, fill: 'none', stroke: C.card, 'stroke-width': 22 }, gg);
    const [ax, ay] = pt(1000, R);
    E('path', { d: `M${ax.toFixed(1)},${ay.toFixed(1)} A${R},${R} 0 0 1 ${gx + R},${gy}`, fill: 'none', stroke: C.green, 'stroke-width': 22, opacity: 0.75 }, gg);
    for (let v = 0; v <= MAX; v += 500) { const [x1, y1] = pt(v, R - 18), [x2, y2] = pt(v, R + 14); E('line', { x1, y1, x2, y2, stroke: C.ink, 'stroke-width': 3 }, gg); }
    X.text(gx - R, gy + 34, '0', { parent: gg, size: 22, anchor: 'middle', fill: C.ink2 });
    X.text(gx + R, gy + 34, '3,000', { parent: gg, size: 22, anchor: 'middle', fill: C.ink2 });
    const needle = E('g', null, gg);
    E('path', { d: `M0,-6 L${R - 14},0 L0,6 Z`, fill: C.red }, needle);
    E('circle', { cx: 0, cy: 0, r: 11, fill: C.ink }, gg);
    X.show(gg, k, { f: 0.05, type: 'pop' });
    X.each(t => {
      const v = 654 * X.P(k, 0.1, 0, 1.4) + (X.t > X.at(k, 0.1) ? 25 * Math.sin(t * 7) : 0);
      needle.setAttribute('transform', `translate(${gx} ${gy}) rotate(${(ang(Math.max(0, v)) * 180 / Math.PI).toFixed(2)})`);
    });
    const num = X.text(n.nx + 276, n.ny + 140, '0', { parent: n.g, size: 46, serif: true, w: 700, fill: C.red });
    X.count(num, 0, 654, k, { f0: 0.1, f1: 0.35 });
    const s1 = X.text(n.nx + 276, n.ny + 172, 'lines per second', { parent: n.g, size: 21, fill: C.ink2 });
    X.show(s1, k, { f: 0.15, type: 'up' });
    const s2 = X.text(n.nx + 276, n.ny + 222, 'Big bank needs', { parent: n.g, size: 22, fill: C.ink2 });
    const s3 = X.text(n.nx + 276, n.ny + 258, 'thousands', { parent: n.g, size: 30, w: 700, fill: C.green });
    X.show(s2, k, { f: 0.45, type: 'up' }); X.show(s3, k, { f: 0.5, type: 'up' });
    const s4 = X.chip(n.nx + 235, n.ny + 296, 'faster version planned', { parent: n.g, size: 22, fill: C.card, color: C.blue });
    X.show(s4, k, { f: 0.8, type: 'up' });
    X.term(4, 'Log line', 'One entry in a computer\'s diary (its log file).\nA big bank writes thousands every second.', { until: 5 });
  }

  // ---------- note 4: real-world testing ----------
  {
    const n = notes[3], k = 5;
    title(n, 'Real-world testing');
    const fx = n.nx + 95, fy = n.ny + 215;
    const fl = X.g(n.g);
    E('path', { d: `M${fx - 18},${fy - 105} L${fx - 18},${fy - 50} L${fx - 62},${fy + 50} Q${fx - 68},${fy + 66} ${fx - 50},${fy + 66} L${fx + 50},${fy + 66} Q${fx + 68},${fy + 66} ${fx + 62},${fy + 50} L${fx + 18},${fy - 50} L${fx + 18},${fy - 105} Z`, fill: C.card, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, fl);
    E('path', { d: `M${fx - 42},${fy + 6} L${fx + 42},${fy + 6} L${fx + 60},${fy + 50} Q${fx + 64},${fy + 62} ${fx + 50},${fy + 62} L${fx - 50},${fy + 62} Q${fx - 64},${fy + 62} ${fx - 60},${fy + 50} Z`, fill: C.teal, opacity: 0.75 }, fl);
    E('line', { x1: fx - 28, y1: fy - 105, x2: fx + 28, y2: fy - 105, stroke: C.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, fl);
    const bub = [];
    for (let j = 0; j < 6; j++) bub.push(E('circle', { r: 5 + (j % 3) * 2, fill: C.tealL, stroke: C.teal, 'stroke-width': 2 }, fl));
    X.each(t => bub.forEach((b, j) => {
      const p = ((t * 0.35) + j / 6) % 1;
      b.setAttribute('cx', (fx + (j % 2 ? 14 : -16) + 6 * Math.sin(t * 3 + j)).toFixed(1));
      b.setAttribute('cy', (fy + 52 - p * 150).toFixed(1));
      b.setAttribute('opacity', Math.min(1, (1 - p) * 2.2).toFixed(2));
    }));
    X.show(fl, k, { f: 0.05, type: 'pop' });
    const a1 = X.text(n.nx + 190, n.ny + 118, 'Attacks: simulated', { parent: n.g, size: 22, w: 700 });
    const a2 = X.text(n.nx + 190, n.ny + 148, 'in a test lab', { parent: n.g, size: 22, fill: C.ink2 });
    X.show(a1, k, { f: 0.1, type: 'up' }); X.show(a2, k, { f: 0.2, type: 'up' });
    const ch = X.g(n.g);
    E('path', { d: `M${n.nx + 200},${n.ny + 212} L${n.nx + 252},${n.ny + 212} Q${n.nx + 260},${n.ny + 212} ${n.nx + 260},${n.ny + 220} L${n.nx + 260},${n.ny + 254} Q${n.nx + 260},${n.ny + 262} ${n.nx + 252},${n.ny + 262} L${n.nx + 222},${n.ny + 262} L${n.nx + 208},${n.ny + 276} L${n.nx + 208},${n.ny + 262} L${n.nx + 200},${n.ny + 262} Q${n.nx + 192},${n.ny + 262} ${n.nx + 192},${n.ny + 254} L${n.nx + 192},${n.ny + 220} Q${n.nx + 192},${n.ny + 212} ${n.nx + 200},${n.ny + 212} Z`, fill: C.plumL, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, ch);
    X.text(n.nx + 226, n.ny + 248, '?', { parent: ch, size: 30, w: 800, anchor: 'middle', fill: C.red });
    X.show(ch, k, { f: 0.5, type: 'pop' });
    const b1 = X.text(n.nx + 274, n.ny + 222, 'AI gateway:', { parent: n.g, size: 22, w: 700 });
    const b2 = X.text(n.nx + 274, n.ny + 252, 'no real chatbot', { parent: n.g, size: 22, fill: C.ink2 });
    const b3 = X.text(n.nx + 274, n.ny + 282, 'test yet', { parent: n.g, size: 22, fill: C.ink2 });
    [b1, b2, b3].forEach((b, j) => X.show(b, k, { f: 0.55 + j * 0.06, type: 'up' }));
    X.term(5, 'Simulated attack', 'A pretend attack run in a test lab,\nnot on a real bank.', { until: 5, outf: 0.5 });
    X.term(5, 'AI gateway', 'Aran\'s checkpoint that cleans what staff\ntype into AI chatbots before it leaves.', { f: 0.52, until: 6 });
  }

  // ---------- note 5: hiding tricks ----------
  {
    const n = notes[4], k = 6;
    title(n, 'Hiding tricks');
    const sq = [];
    for (let j = 0; j < 26; j++) {
      const col = j % 13, row = Math.floor(j / 13);
      const x = n.nx + 28 + col * 32, y = n.ny + 92 + row * 34;
      const open = j >= 22;
      const r = E('rect', { x, y, width: 26, height: 26, rx: 5, fill: C.card, stroke: C.line, 'stroke-width': 2 }, n.g);
      if (open) r.setAttribute('stroke-dasharray', '4 3');
      sq.push({ r, open });
    }
    X.each(() => sq.forEach((s, j) => {
      const on = X.t > X.at(k, 0.05 + j * 0.012);
      s.r.setAttribute('fill', on ? (s.open ? C.ochreL : C.green) : C.card);
      s.r.setAttribute('stroke', on ? (s.open ? C.ochre : C.green) : C.line);
    }));
    const c1 = X.text(n.nx + 28, n.ny + 200, '22 caught', { parent: n.g, size: 24, w: 700, fill: C.green });
    const c2 = X.text(n.nx + 170, n.ny + 200, '4 open, on purpose', { parent: n.g, size: 24, w: 700, fill: C.ochre });
    X.show(c1, k, { f: 0.3, type: 'up' }); X.show(c2, k, { f: 0.38, type: 'up' });
    const al = X.icon('alert', n.nx + 52, n.ny + 278, 0.34);
    n.g.appendChild(al);
    X.show(al, k, { f: 0.6, type: 'pop' });
    X.shake(al.mid, k, { f: 0.7, len: 1.2, amp: 6 });
    const d1 = X.text(n.nx + 96, n.ny + 270, 'Undoing them on every line', { parent: n.g, size: 22, fill: C.ink2 });
    const d2 = X.text(n.nx + 96, n.ny + 300, 'would cause false alarms', { parent: n.g, size: 22, w: 700, fill: C.red });
    X.show(d1, k, { f: 0.6, type: 'up' }); X.show(d2, k, { f: 0.72, type: 'up' });
    X.term(6, 'False alarm', 'When the system shouts "leak!" about\nsomething that is not personal data at all.', { until: 7 });
  }

  // ---------- note 6: legal question ----------
  {
    const n = notes[5], k = 7;
    title(n, 'Legal question');
    const sc = X.icon('scale', n.nx + 105, n.ny + 225, 0.95);
    n.g.appendChild(sc);
    X.show(sc, k, { f: 0.05, type: 'pop' });
    X.each(t => sc.mid.setAttribute('transform', `rotate(${(5 * Math.sin(t * 1.6)).toFixed(2)} ${n.nx + 105} ${n.ny + 225})`));
    const q = X.g(n.g);
    E('circle', { cx: n.nx + 175, cy: n.ny + 128, r: 24, fill: C.card, stroke: C.plum, 'stroke-width': 3 }, q);
    X.text(n.nx + 175, n.ny + 139, '?', { parent: q, size: 32, w: 800, anchor: 'middle', fill: C.plum });
    X.show(X.wrap(q), k, { f: 0.2, type: 'pop' });
    X.bob(q, { amp: 5, per: 1.6 });
    const key = X.icon('key', n.nx + 262, n.ny + 120, 0.42);
    n.g.appendChild(key);
    X.show(key, k, { f: 0.1, type: 'left' });
    const kx = X.mark(n.nx + 292, n.ny + 120, false, { parent: n.g, s: 14 });
    X.show(kx, k, { f: 0.28, type: 'pop' });
    const t1 = X.text(n.nx + 318, n.ny + 128, 'Destroy key', { parent: n.g, size: 22, fill: C.ink2 });
    X.show(t1, k, { f: 0.15, type: 'up' });
    const t2 = X.text(n.nx + 228, n.ny + 190, '= legal erasure?', { parent: n.g, size: 26, serif: true, w: 600 });
    X.show(t2, k, { f: 0.38, type: 'up' });
    const t3 = X.text(n.nx + 228, n.ny + 252, 'Needs a lawyer\'s', { parent: n.g, size: 22, fill: C.ink2 });
    const t4 = X.text(n.nx + 228, n.ny + 284, 'opinion', { parent: n.g, size: 26, w: 700, fill: C.plum });
    X.show(t3, k, { f: 0.65, type: 'up' }); X.show(t4, k, { f: 0.7, type: 'up' });
    X.term(7, 'Legal erasure', 'Deleting someone\'s data in the way the law\nrequires, so it can never come back.', { until: 8 });
  }

  X.recap(8, ['Names: about 77% caught today', 'Two new mistakes to fix', 'Speed: 654 lines a second, thousands needed', 'Real-world testing still to do']);
});
