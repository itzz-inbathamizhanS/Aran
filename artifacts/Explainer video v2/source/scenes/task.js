// The challenge: a brief written on a ticket, a bigger question, then Aran as a firewall for data (shield on a pipe swapping details for tokens).
scene('task', X => {
  const BX = 2200, PY = 1310;
  X.cam([
    { x: 900, y: 560, s: 1.05 },
    { k: 1, x: 960, y: 540, s: 1, len: 1.6 },
    { k: 3, x: 470, y: 610, s: 1.25 },
    { k: 4, f: 0.1, x: 960, y: 540, s: 1 },
    { k: 5, x: BX + 960, y: 540, s: 1, len: 2 },
    { k: 6, x: BX + 960, y: 560, s: 1.06 },
    { k: 7, x: BX + 960, y: PY, s: 1, len: 1.8 }
  ]);
  const mono = (x, y, str, o) => { const t = X.text(x, y, str, Object.assign({ size: 22, mono: true, w: 600 }, o)); t.t.style.whiteSpace = 'pre'; return t; };

  // ---------------- the brief ----------------
  const tk = X.g();
  X.rect(120, 150, 720, 760, { parent: tk, fill: C.card, stroke: C.ink, sw: 4, r: 18, shadow: 8 });
  E('rect', { x: 120, y: 150, width: 720, height: 70, rx: 18, fill: C.ochreL }, tk);
  E('rect', { x: 120, y: 200, width: 720, height: 20, fill: C.ochreL }, tk);
  E('line', { x1: 120, y1: 220, x2: 840, y2: 220, stroke: C.ink, 'stroke-width': 3, 'stroke-dasharray': '10 8' }, tk);
  X.text(155, 197, 'CHALLENGE BRIEF', { parent: tk, size: 26, fill: C.ochre, w: 700, ls: 3 });
  X.text(805, 197, 'for: team Aran', { parent: tk, size: 22, fill: C.ink2, anchor: 'end' });
  X.show(tk, 0, { type: 'left', len: 0.9 });
  const pen = X.g(); const pi = E('g', null, pen);
  E('path', { d: 'M0,0 L-14,-40 L60,-110 L74,-96 L0,0 Z', fill: C.ochre, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, pi);
  E('path', { d: 'M0,0 L-14,-40 L-4,-30 Z', fill: C.ink }, pi);
  X.show(X.wrap(pen), 0, { f: 0.3, type: 'fade', out: 5 });
  const title = X.text(155, 285, '', { size: 40, serif: true, w: 700 });
  X.type(title, 'The challenge', 0, { f0: 0.3, f1: 0.8 });
  const brief = [
    [1, 350, '1. Find sensitive customer data'],
    [1, 390, '    in a bank\'s API traffic and logs.'],
    [1, 445, '2. Protect it before it is stored'],
    [1, 485, '    or shared.']
  ];
  brief.forEach(([k, y, s], i) => { const t = X.text(155, y, '', { size: 28, w: 500 }); t.t.style.whiteSpace = 'pre'; X.type(t, s, k, { f0: 0.05 + i * 0.12, f1: 0.15 + i * 0.12 }); });
  const big = X.g();
  E('line', { x1: 155, y1: 530, x2: 805, y2: 530, stroke: C.line, 'stroke-width': 3 }, big);
  X.text(155, 585, 'A bigger question', { parent: big, size: 34, serif: true, fill: C.ochre, w: 700 });
  X.show(big, 3, { f: 0.1, type: 'up' });
  const qs = [['Where did each detail go?', 'magnifier'], ['Who could read it?', 'person'], ['Which copy leaked?', 'alert']];
  qs.forEach(([q, ic], i) => {
    const g = X.g();
    X.icon(ic, 180, 638 + i * 64, 0.3, { parent: g, fill: [C.blueL, C.ochreL, C.redL][i] });
    const t = X.text(220, 648 + i * 64, '', { parent: g, size: 28, w: 500 });
    X.type(t, q, 4, { f0: 0.1 + i * 0.22, f1: 0.25 + i * 0.22 });
    X.show(g, 4, { f: 0.08 + i * 0.22, type: 'fade', len: 0.3 });
  });
  // the pen follows the writing
  X.each(t => {
    let x = 160, y = 290;
    const marks = [[0, 0.3, 0.8, 155, 360, 285], ...brief.map(([k, y0, s], i) => [k, 0.05 + i * 0.12, 0.15 + i * 0.12, 155, 155 + s.length * 14.5, y0]), ...qs.map(([q], i) => [4, 0.1 + i * 0.22, 0.25 + i * 0.22, 220, 220 + q.length * 14.5, 648 + i * 64])];
    let writing = false;
    for (const [k, f0, f1, x0, x1, yy] of marks) {
      if (t >= X.at(k, f0)) { const p = X.L(k, f0, f1); x = lerp(x0, x1, p); y = yy; }
      if (t >= X.at(k, f0) - 0.4 && t <= X.at(k, f1) + 0.6) writing = true;
    }
    pi.setAttribute('opacity', writing ? 1 : 0);
    const wig = 4 * Math.sin(t * 30);
    pen.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + wig).toFixed(1)})`);
  });
  const stamp = X.g(); const si = E('g', { transform: 'rotate(-8 640 830)' }, stamp);
  E('rect', { x: 500, y: 790, width: 290, height: 80, rx: 12, fill: C.tealL, stroke: C.teal, 'stroke-width': 5 }, si);
  const st = E('text', { x: 645, y: 843, 'font-size': 36, 'font-weight': 700, fill: C.teal, 'text-anchor': 'middle', 'font-family': F.serif }, si); st.textContent = 'Answer: Aran';
  X.show(stamp, 5, { type: 'pop', len: 0.5 });

  // the team receives the brief
  const team = [[C.green, C.skin[0]], [C.red, C.skin[3]], [C.plum, C.skin[2]], [C.teal, C.skin[1]]].map(([sh, sk], i) => {
    const p = X.person(1180 + i * 150, 900, { shirt: sh, skin: sk, s: 0.62, glasses: i === 3, ph: i });
    X.show(p, 0, { f: 0.2 + i * 0.08, type: 'up' });
    return p;
  });
  X.each(t => team.forEach((p, i) => {
    p.mood(t > X.at(4, 0.9) ? 'happy' : (X.on(3, 5) ? 'open' : 'neutral'));
    const up = X.on(3, 4) ? 1 : 0;
    X.arms(p, 8, lerp(-8, 40, up * X.P(3, 0.1 + i * 0.05, 0, 0.4)));
  }));
  const tlab = X.text(1405, 960 - 30, 'the team', { size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(tlab, 0, { f: 0.5, type: 'fade' });

  // API traffic: bank programs sending messages to each other
  X.term(1, 'Sensitive data', 'Details that can hurt a person if they leak:\nAadhaar, PAN, phone or account numbers.', { until: 1, outf: 0.45 });
  X.term(1, 'API traffic', 'The messages bank programs send to each other,\nall day long, to get work done.', { f: 0.47, until: 3 });
  const api = X.g();
  X.icon('laptop', 1000, 340, 0.9, { parent: api });
  X.text(1000, 420, 'loan app', { parent: api, size: 26, anchor: 'middle', fill: C.ink2 });
  X.icon('server', 1720, 340, 0.85, { parent: api });
  X.text(1720, 420, 'credit check', { parent: api, size: 26, anchor: 'middle', fill: C.ink2 });
  E('path', { d: 'M1080,320 L1650,320 M1080,360 L1650,360', stroke: C.line, 'stroke-width': 4 }, api);
  E('path', { d: 'M1360,360 L1360,520', stroke: C.line, 'stroke-width': 4 }, api);
  X.icon('log', 1360, 590, 0.62, { parent: api });
  X.text(1430, 600, 'log', { parent: api, size: 26, fill: C.ink2 });
  X.show(api, 1, { f: 0.1, type: 'fade', out: 3, outLen: 0.5 });
  const env = (g, red) => { const q = E('g', null, g); X.icon('envelope', 0, 0, 0.32, { parent: q }); E('circle', { cx: 12, cy: 4, r: 7, fill: red ? C.red : C.blue }, q); return q; };
  const s1 = X.stream(spline([[1080, 320], [1650, 320]]), { n: 3, speed: 0.3, k0: 1, f0: 0.4, k1: 3, make: g => env(g, true) });
  const s2 = X.stream(spline([[1650, 360], [1080, 360]]), { n: 2, speed: 0.3, k0: 1, f0: 0.5, k1: 3, make: g => env(g, false) });
  X.stream(spline([[1360, 340], [1360, 540]]), { n: 2, speed: 0.4, k0: 1, f0: 0.7, k1: 3, make: g => env(g, true) });
  const lbl = X.chip(1360, 250, 'programs talking to each other', { size: 24, color: C.blue, fill: C.blueL, stroke: C.blue });
  X.show(lbl, 2, { f: 0.1, type: 'down', out: 3, outLen: 0.4 });
  const rd = X.chip(1360, 680, '2345 6789 0124', { size: 24, mono: true, color: C.red, fill: C.redL, stroke: C.red });
  X.show(rd, 1, { f: 0.8, type: 'pop', out: 3, outLen: 0.4 });

  // where did Ravi's details go?
  const trail = X.g();
  X.chip(1020, 330, 'Ravi\'s Aadhaar', { parent: trail, size: 24, color: C.red, fill: C.redL, stroke: C.red });
  const pl = [[1260, 560, 'log', 'log'], [1520, 330, 'building', 'vendor'], [1760, 560, 'chat', 'chatbot']];
  pl.forEach(([x, y, ic, name], i) => {
    X.icon(ic, x, y, 0.55, { parent: trail });
    X.text(x, y + 70, name, { parent: trail, size: 24, anchor: 'middle', fill: C.ink2 });
  });
  E('path', { d: 'M1100,350 Q1200,460 1230,520 M1300,530 Q1400,380 1470,340 M1570,350 Q1680,420 1730,520', fill: 'none', stroke: C.ink3, 'stroke-width': 4, 'stroke-dasharray': '6 12', 'stroke-linecap': 'round' }, trail);
  X.show(trail, 4, { f: 0.05, type: 'fade' });
  const qm = pl.map(([x, y], i) => { const q = X.text(x + 50, y - 40, '?', { size: 56, serif: true, fill: C.ochre, w: 700 }); X.show(q, 4, { f: 0.15 + i * 0.22, type: 'pop', out: 5 }); X.bob(q, { amp: 6, per: 1.6, ph: i }); return q; });
  const mg = X.icon('magnifier', 0, 0, 0.5);
  X.show(mg, 4, { f: 0.1, type: 'fade' });
  X.each(t => {
    const p = X.L(4, 0.1, 0.85), seg = Math.min(2, Math.floor(p * 3)), u = ease(clamp(p * 3 - seg));
    const a = seg === 0 ? [1020, 330] : pl[seg - 1], b = pl[seg];
    mg.mid.setAttribute('transform', `translate(${lerp(a[0], b[0], u).toFixed(1)} ${(lerp(a[1], b[1], u) - 20).toFixed(1)})`);
  });

  // ---------------- B: Aran, the firewall for data ----------------
  const sh = X.g(); const shi = E('g', null, sh);
  X.icon('shield', 0, 0, 2.2, { parent: shi, fill: C.tealL, color: C.teal });
  const shT = E('text', { x: 0, y: 16, 'font-size': 56, 'font-weight': 700, fill: C.teal, 'text-anchor': 'middle', 'font-family': F.serif }, shi); shT.textContent = 'Aran';
  X.show(X.wrap(sh), 5, { f: 0.1, type: 'pop', len: 0.8 });
  X.each(t => {
    const m = X.P(7, 0, 0, 1.4);
    const x = BX + 960, y = lerp(430, PY, m), s = lerp(1, 0.78, m) * (1 + 0.04 * Math.sin(t * 2.5));
    sh.setAttribute('transform', `translate(${x} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  });
  const ans = X.text(BX + 960, 245, 'the answer the team built', { size: 32, anchor: 'middle', fill: C.ink2, italic: true });
  X.show(ans, 5, { f: 0.3, type: 'down' });
  const sent = X.text(BX + 960, 700, '', { size: 64, anchor: 'middle', serif: true, w: 700 });
  X.type(sent, 'Aran is a firewall for data.', 6, { f0: 0.25, f1: 0.75 });
  const und = X.path(`M${BX + 650},730 L${BX + 1270},730`, { color: C.ochre, sw: 6 });
  X.show(und, 6, { f: 0.75, type: 'draw' });
  X.term(6, 'Firewall', 'A guard between computers that checks what\npasses through and blocks what is not allowed.', { f: 0.4, until: 7 });
  const icn = [['phone', BX + 380], ['bank', BX + 1540]].map(([n, x], i) => { const g = X.icon(n, x, 820, 0.6, { color: C.ink2 }); X.show(g, 6, { f: 0.3 + i * 0.1, type: 'up', out: 7 }); return g; });
  const wall = X.path(`M${BX + 520},820 L${BX + 1400},820`, { color: C.line, sw: 5 });
  X.show(wall, 6, { f: 0.35, type: 'draw', out: 7 });

  // the pipe
  const pipe = X.g();
  X.icon('laptop', BX + 140, PY, 0.8, { parent: pipe });
  X.text(BX + 140, PY + 80, 'bank app', { parent: pipe, size: 26, anchor: 'middle', fill: C.ink2 });
  E('rect', { x: BX + 230, y: PY - 34, width: 1250, height: 68, rx: 12, fill: C.blueL, stroke: C.ink, 'stroke-width': 4 }, pipe);
  X.show(pipe, 7, { type: 'fade', len: 0.8 });
  const dests = [['log platform', 'log', PY - 260, '0196 3809 2692'], ['CRM', 'laptop', PY, '2498 2684 6187'], ['loan vendor', 'building', PY + 260, '0982 6158 6412']];
  const dsp = dests.map(([name, ic, y], i) => {
    const g = X.g();
    X.icon(ic, BX + 1720, y, 0.6, { parent: g });
    X.text(BX + 1720, y + 75, name, { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(g, 7, { f: 0.15 + i * 0.05, type: 'left' });
    const sp = spline([[BX + 1040, PY], [BX + 1420, PY], [BX + 1560, lerp(PY, y, 0.8)], [BX + 1650, y]]);
    const ln = X.path(spline([[BX + 1480, PY], [BX + 1570, lerp(PY, y, 0.75)], [BX + 1650, y]]).d, { color: C.line, sw: 5 }); X.show(ln, 7, { f: 0.15 + i * 0.05, type: 'draw' });
    return sp;
  });
  const chip = (txt, col, fill) => { const g = X.g(); const r = E('rect', { x: -108, y: -19, width: 216, height: 38, rx: 19, fill, stroke: col, 'stroke-width': 3 }, g); const t = E('text', { x: 0, y: 8, 'font-size': 22, 'font-weight': 700, fill: col, 'text-anchor': 'middle', 'font-family': F.mono }, g); t.textContent = txt; g.style.opacity = 0; return g; };
  const reds = [0, 1, 2].map(() => chip('2345 6789 0124', C.red, C.redL));
  const greens = dests.map(d => chip(d[3], C.green, C.greenL));
  X.each(t => {
    const t0 = X.at(7, 0.25);
    [0, 1, 2].forEach(i => {
      const r = reds[i], gch = greens[i];
      if (t < t0) { r.style.opacity = 0; gch.style.opacity = 0; return; }
      const u = (((t - t0) / 3.6) + i / 3) % 1;
      const first = (t - t0) / 3.6 + i / 3 < 1 ? clamp(((t - t0) / 3.6 + i / 3) * 3) : 1;
      if (u < 0.5) {
        const p = u / 0.5, x = lerp(BX + 300, BX + 900, p);
        r.setAttribute('transform', `translate(${x.toFixed(1)} ${PY})`);
        r.style.opacity = Math.min(first, clamp(p * 8), clamp((1 - p) * 8)).toFixed(2); gch.style.opacity = 0;
      } else {
        const p = (u - 0.5) / 0.5, [x, y] = dsp[i].at(p * 0.74);
        gch.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        gch.style.opacity = Math.min(clamp(p * 8), clamp((1 - p) * 6)).toFixed(2); r.style.opacity = 0;
      }
    });
  });
  const l1 = X.text(BX + 560, PY + 95, 'real detail', { size: 28, anchor: 'middle', fill: C.red, w: 700 });
  X.show(l1, 7, { f: 0.35, type: 'up' });
  const l2 = X.text(BX + 1230, PY + 95, 'harmless look-alike', { size: 28, anchor: 'middle', fill: C.green, w: 700 });
  X.show(l2, 7, { f: 0.55, type: 'up' });
  const l3 = X.text(BX + 960, PY - 130, 'before anything is stored or shared', { size: 28, anchor: 'middle', fill: C.ink2, italic: true });
  X.show(l3, 7, { f: 0.7, type: 'down' });
  X.term(7, 'Token', 'A harmless look-alike that stands in for a real\ndetail, like a cloakroom token for your coat.', { f: 0.45, until: 8 });

  X.root.appendChild(sh.parentNode); // the shield sits on top of the pipe
  greens.forEach(g => X.root.appendChild(g)); reds.forEach(g => X.root.appendChild(g));
  X.recap(8, ['Find sensitive data in traffic and logs', 'Protect it before it is stored or shared', 'Be able to prove what happened']);
});
