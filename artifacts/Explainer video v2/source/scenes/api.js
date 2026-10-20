// How bank programs talk: many programs, an API waiter carrying requests and replies, and a log diary that leaks a mobile number.
scene('api', X => {
  X.cam([{ x: 960, y: 540, s: 1.3 }, { k: 0, f: 0.3, x: 960, y: 540, s: 1.0, len: 1.8 }, { k: 2, x: 1000, y: 400, s: 1.25, len: 1.6 },
    { k: 3, x: 960, y: 560, s: 1.0, len: 1.6 }, { k: 4, x: 960, y: 700, s: 1.22 }, { k: 5, x: 960, y: 540, s: 1.0 },
    { k: 7, f: 0.15, x: 1180, y: 620, s: 1.3 }, { k: 8, x: 960, y: 540, s: 1.0 }]);

  // ---- cue 0-1: one bank, many programs
  const big = X.box(760, 440, 400, 180, { label: 'The bank', size: 48, serif: true, fill: C.ochreL, stroke: C.ochre });
  X.show(big, 0, { type: 'pop', out: 0, outf: 0.32, outLen: 0.4 });
  const progs = [['Mobile app', 'phone', 420, 330], ['Payments', 'coin', 960, 260], ['Loans', 'file', 1500, 330],
    ['Cards', 'card', 1500, 740], ['Core banking', 'bank', 960, 810], ['Fraud check', 'shield', 420, 740]];
  const P = progs.map(([lab, ic, x, y], i) => {
    const o = X.g(); const g = X.g(o);
    X.rect(x - 150, y - 55, 300, 110, { parent: g, r: 18, shadow: true });
    X.icon(ic, x - 95, y, 0.48, { parent: g });
    X.text(x - 45, y + 10, lab, { parent: g, size: 28, w: 600 });
    X.show(o, 0, { f: 0.34 + i * 0.06, type: 'pop', out: 2, outLen: 0.6 });
    X.bob(g, { amp: 4, per: 3 + i * 0.3, ph: i });
    return { x, y };
  });
  const links = [[0, 1], [0, 4], [1, 4], [2, 4], [3, 4], [5, 1], [3, 1], [0, 5], [2, 1]];
  links.forEach(([a, b], i) => {
    const A = P[a], B = P[b];
    const mx = (A.x + B.x) / 2 + (i % 2 ? 40 : -40), my = (A.y + B.y) / 2 + (i % 3 ? 30 : -30);
    const sp = spline([[A.x, A.y], [mx, my], [B.x, B.y]]);
    const back = spline([[B.x, B.y], [mx, my], [A.x, A.y]]);
    const ln = X.path(sp.d, { color: C.line, sw: 3 });
    X.show(ln, 0, { f: 0.5 + i * 0.03, type: 'draw', out: 2, outLen: 0.5 });
    // keep the line behind the boxes
    ln.parentNode.insertBefore(ln, ln.parentNode.firstChild);
    X.stream(sp, { n: 2, speed: 0.32 + (i % 3) * 0.05, r: 7, color: [C.blue, C.teal, C.plum][i % 3], k0: 0, f0: 0.7, k1: 2 });
    X.stream(back, { n: 2, speed: 0.27 + (i % 2) * 0.06, r: 7, color: C.ochre, k0: 0, f0: 0.8, k1: 2 });
    const tag = X.chip(mx, my, 'API', { size: 20, color: C.ochre, fill: C.ochreL, stroke: C.ochre });
    X.show(tag, 1, { f: 0.15 + i * 0.05, type: 'pop', out: 2, outLen: 0.4 });
  });
  X.term(0, 'Program', 'A set of instructions a computer follows,\nlike an app on your phone.', { f: 0.3, until: 1 });
  X.term(1, 'API', 'Application Programming Interface: the agreed\nway one program asks another for something.', { until: 3 });

  // ---- restaurant (cue 2 onwards)
  const R = X.g();
  X.show(R, 2, { type: 'fade', len: 0.8, out: 4, outLen: 0.6 });
  X.text(300, 190, 'In a restaurant', { parent: R, size: 30, serif: true, w: 600, fill: C.ink2 });
  // kitchen
  X.rect(1240, 220, 520, 290, { parent: R, fill: C.sand, stroke: C.line, r: 10 });
  X.text(1265, 258, 'kitchen', { parent: R, size: 26, fill: C.ink2, w: 600 });
  X.rect(1560, 420, 170, 90, { parent: R, fill: C.ink2, stroke: C.ink, r: 6 });
  E('path', { d: 'M1590,420 L1590,390 Q1645,370 1700,390 L1700,420 Z', fill: C.ink3, stroke: C.ink, 'stroke-width': 3 }, R);
  [0, 1, 2].forEach(i => { const st = X.path(`M${1615 + i * 30},380 q-10,-14 0,-28 q10,-14 0,-28`, { parent: R, color: C.ink3, sw: 3 }); X.bob(st, { amp: 5, per: 1.4, ph: i * 2 }); });
  const chef = X.person(1470, 505, { parent: R, shirt: C.card, skin: C.skin[2], s: 0.9, ph: 1 });
  E('path', { d: 'M-30,-236 Q-44,-268 -16,-272 Q-8,-296 14,-286 Q40,-292 38,-262 Q48,-244 30,-234 Z', fill: C.card, stroke: C.line, 'stroke-width': 3 }, chef.body);
  X.each(() => X.arms(chef, 8, X.on(2, 5) ? 40 + 25 * Math.sin(X.t * 4) : -8));
  // table and customer
  const cust = X.person(380, 505, { parent: R, shirt: C.green, skin: C.skin[0], s: 0.9 });
  X.talk(cust, [2], { base: 'happy' });
  X.rect(250, 395, 330, 18, { parent: R, fill: C.ochre, stroke: C.ink, sw: 2, r: 4 });
  X.rect(270, 413, 14, 92, { parent: R, fill: C.ink2, stroke: C.ink2, r: 3 });
  X.rect(546, 413, 14, 92, { parent: R, fill: C.ink2, stroke: C.ink2, r: 3 });
  X.text(380, 548, 'you', { parent: R, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  const order = X.g(R);
  X.rect(260, 200, 260, 64, { parent: order, fill: C.card, stroke: C.ink2, r: 16, shadow: true });
  X.text(390, 242, '"One dosa, please"', { parent: order, size: 24, anchor: 'middle', italic: true });
  X.show(order, 2, { f: 0.03, type: 'pop', out: 2, outf: 0.35, outLen: 0.3 });
  const tablePlate = X.g(R);
  E('ellipse', { cx: 470, cy: 390, rx: 52, ry: 12, fill: C.card, stroke: C.ink, 'stroke-width': 3 }, tablePlate);
  E('path', { d: 'M432,386 Q470,358 508,386 Z', fill: C.ochre }, tablePlate);

  // waiter walk cycle: u in 0..1 -> position and what is carried
  const cycle = (u, x0, x1) => {
    if (u < 0.08) return { x: x0, dir: 1, carry: 0, walk: 0 };
    if (u < 0.4) { const p = (u - 0.08) / 0.32; return { x: lerp(x0, x1, ease(p)), dir: 1, carry: 0, walk: p }; }
    if (u < 0.5) return { x: x1, dir: 1, carry: u < 0.44 ? 0 : (u < 0.47 ? -1 : 1), walk: 0 };
    if (u < 0.88) { const p = (u - 0.5) / 0.38; return { x: lerp(x1, x0, ease(p)), dir: -1, carry: 1, walk: p }; }
    return { x: x0, dir: -1, carry: u < 0.93 ? 1 : -1, walk: 0 };
  };
  const phaseR = t => (t < X.at(2) ? 0 : t < X.at(3) ? X.L(2, 0.2, 0.95) : t < X.at(4) ? X.L(3, 0.08, 0.92) : ((t - X.at(4)) * 0.28) % 1);
  const phaseA = t => (t < X.at(3) ? 0 : t < X.at(4) ? X.L(3, 0.08, 0.92) : ((t - X.at(4)) * 0.28) % 1);
  const walker = (parent, feetY, s, shirt, skin, items, phase, x0, x1, extra) => {
    const p = X.person(x0, feetY, { parent, shirt, skin, s, tie: C.red, ph: 2 });
    const carried = items.map(make => { const g = X.g(parent); make(g); return g; });
    X.each(t => {
      const c = cycle(phase(t), x0, x1);
      const hop = c.walk > 0 && c.walk < 1 ? Math.abs(Math.sin(c.walk * Math.PI * 7)) * 7 : 0;
      p.g.setAttribute('transform', `translate(${c.x.toFixed(1)},${(feetY - hop).toFixed(1)}) scale(${c.dir * s},${s})`);
      X.arms(p, 8, 62);
      const hx = c.x + c.dir * 104 * s, hy = feetY - hop - 128 * s;
      carried.forEach((g, i) => {
        const vis = c.carry === i;
        g.style.display = vis ? '' : 'none';
        if (vis) g.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
      });
      if (extra) extra(c, hop);
    });
    return p;
  };
  walker(R, 505, 0.9, C.ink, C.skin[1], [
    g => { X.rect(-26, -40, 52, 64, { parent: g, fill: C.card, stroke: C.ink2, r: 4 }); for (let i = 0; i < 3; i++) E('line', { x1: -16, y1: -24 + i * 14, x2: 16, y2: -24 + i * 14, stroke: C.ink3, 'stroke-width': 3 }, g); },
    g => { E('ellipse', { cx: 0, cy: -6, rx: 50, ry: 12, fill: C.card, stroke: C.ink, 'stroke-width': 3 }, g); E('path', { d: 'M-36,-10 Q0,-38 36,-10 Z', fill: C.ochre }, g); }
  ], phaseR, 640, 1300);
  X.each(t => { tablePlate.style.display = (t > X.at(2) && phaseR(t) > 0.92) || t > X.at(3, 0.95) ? '' : 'none'; });
  const wl = X.text(640, 548, 'waiter', { parent: R, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  X.show(wl, 2, { f: 0.1, type: 'up', out: 2, outf: 0.3, outLen: 0.3 });

  // ---- two programs and an API waiter (cue 3 onwards)
  const Q = X.g();
  X.show(Q, 3, { type: 'up', out: 5, outLen: 0.6 });
  E('line', { x1: 140, y1: 585, x2: 1780, y2: 585, stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '8 10' }, Q);
  X.text(150, 632, 'Between two programs', { parent: Q, size: 30, serif: true, w: 600, fill: C.ink2 });
  X.icon('phone', 380, 770, 1.15, { parent: Q });
  X.text(380, 880, 'phone app', { parent: Q, size: 26, anchor: 'middle', fill: C.ink2, w: 600 });
  X.icon('server', 1540, 770, 1.1, { parent: Q });
  X.text(1540, 880, 'bank server', { parent: Q, size: 26, anchor: 'middle', fill: C.ink2, w: 600 });
  const badge = X.g(Q);
  X.chip(0, 0, 'API', { size: 22, color: C.ochre, fill: C.ochreL, stroke: C.ochre, parent: badge });
  walker(Q, 880, 0.78, C.teal, C.skin[3], [
    g => { X.icon('envelope', 0, -14, 0.5, { parent: g }); X.chip(0, -66, 'request', { size: 20, color: C.blue, fill: C.blueL, stroke: C.blue, parent: g }); },
    g => { X.icon('envelope', 0, -14, 0.5, { parent: g, fill: C.greenL }); X.chip(0, -66, 'reply', { size: 20, color: C.green, fill: C.greenL, stroke: C.green, parent: g }); }
  ], phaseA, 520, 1380, (c, hop) => badge.setAttribute('transform', `translate(${c.x.toFixed(1)} ${(880 - hop - 0.78 * 290).toFixed(1)})`));
  X.term(3, 'Request and reply', 'A request asks another program for something.\nThe reply carries the answer back.', { f: 0.4, until: 4 });

  // ---- cue 4: API traffic
  const tr = X.g(Q);
  const go = spline([[470, 720], [960, 660], [1450, 720]]), ret = spline([[1450, 810], [960, 870], [470, 810]]);
  X.stream(go, { parent: tr, n: 5, speed: 0.42, k0: 4, k1: 5, make: g => { const e = X.g(g); X.icon('envelope', 0, 0, 0.26, { parent: e }); return e; } });
  X.stream(ret, { parent: tr, n: 5, speed: 0.38, k0: 4, k1: 5, make: g => { const e = X.g(g); X.icon('envelope', 0, 0, 0.26, { parent: e, fill: C.greenL }); return e; } });
  const cntG = X.g(Q);
  X.rect(760, 510, 400, 56, { parent: cntG, fill: C.ochreL, stroke: C.ochre, r: 28 });
  const cnt = X.text(960, 548, '', { parent: cntG, size: 28, anchor: 'middle', w: 700 });
  X.each(t => cnt.set('API traffic: ' + fmtUS(Math.max(0, (t - X.at(4)) * 1873)) + ' messages'));
  X.show(cntG, 4, { f: 0.1, type: 'pop' });
  X.term(4, 'API traffic', 'All the requests and replies flowing\nbetween programs, all day and night.', { until: 5 });

  // ---- cue 5 onwards: the log diary
  const D = X.g();
  X.show(D, 5, { type: 'up', len: 0.8 });
  const srv = X.icon('server', 330, 470, 1.1, { parent: D });
  X.text(330, 580, 'a program', { parent: D, size: 26, anchor: 'middle', fill: C.ink2, w: 600 });
  // notebook
  X.rect(660, 200, 1100, 660, { parent: D, fill: C.card, stroke: C.ink2, r: 16, shadow: 8 });
  for (let i = 0; i < 9; i++) E('circle', { cx: 700, cy: 250 + i * 70, r: 11, fill: C.bg, stroke: C.ink2, 'stroke-width': 3 }, D);
  for (let i = 0; i < 8; i++) E('line', { x1: 740, y1: 330 + i * 64, x2: 1730, y2: 330 + i * 64, stroke: C.sand, 'stroke-width': 2 }, D);
  X.text(760, 262, 'Log', { parent: D, size: 40, serif: true, w: 600 });
  X.text(870, 262, '(the program\'s diary)', { parent: D, size: 26, fill: C.ink3 });
  const dw = X.path('M420,470 Q560,380 700,420', { parent: D, color: C.line, sw: 3, dash: '3 10' });
  X.term(5, 'Log', 'A diary a program writes about itself:\none line for every event.', { until: 7 });
  // columns header
  const colX = [770, 960, 1240];
  const heads = [['time', C.blue], ['what happened', C.teal], ['details', C.plum]];
  heads.forEach(([h, col], i) => {
    const t = X.text(colX[i], 316, h, { parent: D, size: 24, fill: col, w: 700 });
    X.show(t, 6, { f: 0.25 + i * 0.17, type: 'up' });
    const u = X.line(colX[i], 324, colX[i] + [80, 190, 110][i], 324, { parent: D, color: col, sw: 4 });
    X.show(u, 6, { f: 0.27 + i * 0.17, type: 'grow' });
  });
  const L = [
    ['09:14:02', 'login ok', 'app=mobile', 5, 0.35, 0.75],
    ['09:14:05', 'balance shown', 'screen=home', 6, 0.05, 0.3],
    ['09:14:09', 'payment started', 'amount=500', 6, 0.55, 0.8],
    ['09:14:12', 'OTP sent', 'mobile=98765 43210', 7, 0.0, 0.35],
    ['09:14:20', 'payment ok', 'status=done', 8, 0.05, 0.3]
  ];
  const pen = X.g(D); const penIn = X.g(pen);
  E('path', { d: 'M0,0 L10,-30 L70,-100 L90,-82 L22,-12 Z', fill: C.ochre, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, penIn);
  E('path', { d: 'M0,0 L10,-30 L22,-12 Z', fill: C.ink }, penIn);
  X.show(pen, 5, { f: 0.3, type: 'fade' });
  const mobileLine = { y: 380 + 3 * 64 };
  const mx0 = colX[0] + 28 * 27 * 0.602 - 8, mw = 18 * 27 * 0.602 + 16;
  const hi = X.g(D);
  E('rect', { x: mx0, y: mobileLine.y - 32, width: mw, height: 44, rx: 8, fill: C.redL, stroke: C.red, 'stroke-width': 4 }, hi);
  X.show(hi, 7, { f: 0.3, type: 'grow' });
  L.forEach(([tm, what, det, k, f0, f1], i) => {
    const y = 380 + i * 64;
    const full = tm.padEnd(11) + what.padEnd(17) + det;
    const tg = X.text(colX[0], y, '', { parent: D, size: 27, mono: true, w: 500 });
    tg.t.style.whiteSpace = 'pre'; tg.t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    X.type(tg, full, k, { f0, f1 });
  });
  X.each(t => {
    // pen follows whichever line is being written
    let px = 1500, py = 420, act = false;
    L.forEach(([tm, what, det, k, f0, f1], i) => {
      if (t >= X.at(k, f0) && t <= X.at(k, f1) + 0.2) { const p = X.L(k, f0, f1); const n = 28 + det.length; px = colX[0] + p * n * 27 * 0.602; py = 380 + i * 64; act = true; }
    });
    penIn.setAttribute('transform', `translate(${px.toFixed(1)} ${(py + (act ? -4 * Math.abs(Math.sin(t * 18)) : 0)).toFixed(1)})`);
    srv.mid.setAttribute('transform', act ? `translate(0 ${(-3 * Math.abs(Math.sin(t * 9))).toFixed(1)})` : '');
  });
  // cue 7: the mobile number inside the log line
  const hiLab = X.g(D);
  X.icon('alert', mx0 + mw + 50, mobileLine.y - 12, 0.4, { parent: hiLab });
  X.text(mx0 + mw / 2, mobileLine.y + 56, "a customer's mobile number", { parent: hiLab, size: 26, anchor: 'middle', fill: C.red, w: 700 });
  X.show(hiLab, 7, { f: 0.45, type: 'up', out: 8, outLen: 0.4 });
  const mg = X.icon('magnifier', 0, 0, 0.6, { parent: D, fill: 'none' });
  X.show(X.wrap(mg), 7, { f: 0.05, type: 'fade', out: 8, outLen: 0.4 });
  X.each(t => { const p = ease(X.L(7, 0.05, 0.35)); mg.mid.setAttribute('transform', `translate(${lerp(1650, mx0 + mw / 2 + 40, p).toFixed(1)} ${(lerp(760, mobileLine.y + 10, p) + 4 * Math.sin(t * 3)).toFixed(1)})`); });

  // cue 8: useful, kept for years, read by many
  const eng = X.person(330, 860, { shirt: C.teal, skin: C.skin[0], glasses: true, s: 0.8 });
  X.show(eng, 8, { type: 'up' });
  X.point(eng, 8, 120, { f: 0.05 });
  const fix = X.g();
  X.icon('gear', 470, 680, 0.5, { parent: fix });
  X.text(470, 640, 'fixing a bug', { parent: fix, size: 24, anchor: 'middle', fill: C.teal, w: 700 });
  X.show(fix, 8, { f: 0.1, type: 'pop' });
  const yrs = ['2022', '2023', '2024', '2025', '2026'];
  const yg = X.g();
  yrs.forEach((y, i) => { const c = X.chip(780 + i * 130, 893, y, { size: 22, parent: yg, fill: C.sand }); X.show(c, 8, { f: 0.38 + i * 0.05, type: 'pop' }); });
  const kept = X.text(1450, 902, 'kept for years', { size: 28, fill: C.ink2, w: 700 });
  X.show(kept, 8, { f: 0.5, type: 'up' });
  for (let i = 0; i < 4; i++) {
    const rd = X.person(1820, 300 + i * 165, { shirt: [C.plum, C.blue, C.ochre, C.green][i], skin: C.skin[(i + 1) % 4], long: i % 2 === 0, s: 0.45, ph: i });
    X.show(X.wrap(rd), 8, { f: 0.65 + i * 0.06, type: 'left' });
  }
  const many = X.chip(1640, 160, 'read by many people', { size: 24, color: C.red, fill: C.redL, stroke: C.red });
  X.show(many, 8, { f: 0.75, type: 'pop' });
  X.each(t => { dw.style.opacity = t < X.at(8) ? 1 : 0; });

  X.recap(9, ['Programs talk through APIs, like waiters', 'Programs write logs, like diaries', "Both can carry customers' private details"]);
});
