// Everything in ten points: ten tiles in a 2 x 5 grid light up one by one; the camera glides from tile to tile.
scene('recap', X => {
  const TW = 330, TH = 345;
  const pos = i => [85 + (i % 5) * 355, i < 5 ? 160 : 530];
  const ctr = i => [pos(i)[0] + TW / 2, pos(i)[1] + TH / 2];
  const Z = 1.9;
  const keys = [{ x: 960, y: 515, s: 1 }];
  for (let i = 0; i < 10; i++) keys.push({ k: i + 1, x: ctr(i)[0], y: ctr(i)[1], s: Z, len: 1.3 });
  keys.push({ k: 10, f: 0.62, x: 960, y: 515, s: 1, len: 1.6 });
  X.cam(keys);

  const cols = [C.red, C.ochre, C.teal, C.green, C.blue, C.plum, C.ochre, C.red, C.teal, C.blue];
  const lights = [C.redL, C.ochreL, C.tealL, C.greenL, C.blueL, C.plumL, C.ochreL, C.redL, C.tealL, C.blueL];
  const titles = ['Side doors', 'False alarms', 'Data firewall', 'Check digits', 'Own tokens', 'Detective', 'Leakage ledger', 'Key erasure', 'Immune layer', 'Quantum-safe'];
  const caps = ['Leaks via logs, vendors,\nbackups and AI chatbots', 'Pattern search drowns;\nAran raised just 6', 'Sits at choke points,\nswaps details for tokens', 'Real numbers pass,\ntokens always fail',
    'A leaked file names\nits leaker', 'Clues combine into an\nhonest probability', 'Pieces of a number can\'t\nbe joined together', 'Destroy keys: every copy\nerased, signed receipt',
    'Spots strange behaviour,\nlike an insider at 2 a.m.', 'Hybrid locks keep erasure\npermanent, even later'];

  // tiles: a dim placeholder, then the lit tile
  const T = [];
  for (let i = 0; i < 10; i++) {
    const [x0, y0] = pos(i), k = i + 1, cx = x0 + TW / 2, py = y0 + 170;
    const ph = X.g();
    X.rect(x0, y0, TW, TH, { parent: ph, fill: C.paper, stroke: C.line, dash: '10 8', r: 16 });
    E('circle', { cx: x0 + 44, cy: y0 + 46, r: 25, fill: C.sand }, ph);
    X.text(x0 + 44, y0 + 56, String(k), { parent: ph, size: 28, w: 700, anchor: 'middle', fill: C.ink3 });
    X.show(ph, 0, { f: 0.1 + i * 0.06, type: 'pop' });
    const lit = X.g();
    X.rect(x0, y0, TW, TH, { parent: lit, fill: C.card, stroke: cols[i], sw: 3, r: 16, shadow: 7 });
    E('circle', { cx: x0 + 44, cy: y0 + 46, r: 25, fill: cols[i] }, lit);
    X.text(x0 + 44, y0 + 56, String(k), { parent: lit, size: 28, w: 700, anchor: 'middle', fill: C.card });
    X.text(x0 + 82, y0 + 56, titles[i], { parent: lit, size: 28, serif: true, w: 600 });
    X.text(cx, y0 + 296, caps[i], { parent: lit, size: 22, anchor: 'middle', fill: C.ink2, lh: 29 });
    X.show(lit, k, { type: 'pop', len: 0.8 });
    T.push({ g: lit, x0, y0, cx, py, k, col: cols[i], light: lights[i] });
  }

  // 1: side doors
  {
    const { g, cx, py, k } = T[0];
    X.icon('bank', cx, py - 5, 0.55, { parent: g });
    [['log', -112, -52], ['building', 112, -52], ['db', -112, 58], ['chat', 112, 58]].forEach(([ic, dx, dy], j) => {
      const ico = X.icon(ic, cx + dx, py + dy, 0.3, { parent: g });
      X.bob(ico.mid, { amp: 3, per: 2, ph: j });
      X.stream(X.spline([[cx, py], [cx + dx * 0.55, py + dy * 0.55], [cx + dx * 0.78, py + dy * 0.78]]), { parent: g, n: 3, speed: 0.45, r: 5, color: C.red, k0: k });
    });
    X.term(k, 'Backup', 'A spare copy of the bank\'s data, kept in case\nthe main copy is lost.', { f: 0.55, until: k + 1 });
  }
  // 2: false alarms
  {
    const { g, cx, py, k } = T[1];
    const al = X.icon('alert', cx - 70, py - 52, 0.32, { parent: g });
    X.each(t => { const on = X.t > X.at(k); al.mid.setAttribute('transform', `translate(${on ? (3 * Math.sin(t * 30) * (Math.sin(t * 2) > 0 ? 1 : 0)).toFixed(1) : 0} 0)`); });
    X.icon('shield', cx + 85, py - 52, 0.32, { parent: g, check: true, fill: C.greenL, color: C.green });
    const n1 = X.text(cx - 70, py + 22, '0', { parent: g, size: 36, serif: true, w: 700, anchor: 'middle', fill: C.red });
    X.count(n1, 0, 67481, k, { f0: 0.3, f1: 0.7 });
    X.text(cx - 70, py + 56, 'pattern search', { parent: g, size: 22, anchor: 'middle', fill: C.ink3 });
    const n2 = X.text(cx + 85, py + 26, '6', { parent: g, size: 48, serif: true, w: 700, anchor: 'middle', fill: C.green });
    X.show(n2, k, { f: 0.8, type: 'pop' });
    X.text(cx + 85, py + 56, 'Aran', { parent: g, size: 22, anchor: 'middle', fill: C.ink3 });
    X.term(k, 'False alarm', 'When the system shouts "leak!" about\nsomething that is not personal data at all.', { f: 0.15, until: k + 1 });
  }
  // 3: firewall at a choke point
  {
    const { g, cx, py, k } = T[2];
    E('rect', { x: cx - 145, y: py - 22, width: 290, height: 44, rx: 10, fill: C.paper, stroke: C.ink, 'stroke-width': 4 }, g);
    X.stream(X.spline([[cx - 140, py], [cx - 40, py]]), { parent: g, n: 3, speed: 0.6, r: 8, color: C.red, k0: k });
    X.stream(X.spline([[cx + 40, py], [cx + 140, py]]), { parent: g, n: 3, speed: 0.6, r: 8, color: C.blue, k0: k });
    const sh = X.icon('shield', cx, py, 0.6, { parent: g, check: true });
    X.pulse(sh.mid, cx, py, k, { f: 0.4, amt: 0.15 });
    X.text(cx - 95, py - 44, 'real', { parent: g, size: 22, anchor: 'middle', fill: C.red });
    X.text(cx + 95, py - 44, 'token', { parent: g, size: 22, anchor: 'middle', fill: C.blue });
    X.text(cx, py + 72, 'choke point', { parent: g, size: 22, anchor: 'middle', fill: C.ink3 });
    X.term(k, 'Firewall', 'A guard at the door that checks everything\ngoing in and out.', { f: 0.08, until: k, outf: 0.38 });
    X.term(k, 'Choke point', 'A narrow spot that all the data must pass\nthrough, so one guard there sees it all.', { f: 0.4, until: k, outf: 0.64 });
    X.term(k, 'Token', 'A look-alike stand-in for a real number,\nuseless to a thief.', { f: 0.66, until: k + 1 });
  }
  // 4: check digits
  {
    const { g, cx, py, k } = T[3];
    X.text(cx - 125, py - 58, 'real', { parent: g, size: 22, fill: C.ink3 });
    X.text(cx - 125, py - 22, '2345 6789 0124', { parent: g, size: 22, mono: true, w: 600 });
    const m1 = X.mark(cx + 108, py - 30, true, { parent: g, s: 18 });
    X.show(m1, k, { f: 0.35, type: 'pop' });
    X.text(cx - 125, py + 22, 'token', { parent: g, size: 22, fill: C.blue });
    X.text(cx - 125, py + 58, '2498 2684 6187', { parent: g, size: 22, mono: true, w: 600, fill: C.blue });
    const m2 = X.mark(cx + 108, py + 50, false, { parent: g, s: 18 });
    X.show(m2, k, { f: 0.55, type: 'pop' });
    X.term(k, 'Check digit', 'One extra digit calculated from all the others,\nadded at the end to catch mistakes.', { f: 0.15, until: k + 1 });
  }
  // 5: every destination gets its own tokens
  {
    const { g, cx, py, k } = T[4];
    const rows = [['CRM', '2498 2684 6187', C.blue], ['Vendor', '0982 6158 6412', C.plum], ['Logs', '0196 3809 2692', C.teal]];
    const hl = E('rect', { x: cx - 152, y: py - 30, width: 304, height: 40, rx: 8, fill: C.redL, stroke: C.red, 'stroke-width': 2, opacity: 0 }, g);
    rows.forEach(([lab, tok, col], j) => {
      const y = py - 45 + j * 50;
      X.text(cx - 142, y, lab, { parent: g, size: 22, w: 600, fill: col });
      X.text(cx - 50, y, tok, { parent: g, size: 22, mono: true, w: 600, fill: col });
    });
    X.each(() => hl.setAttribute('opacity', X.P(k, 0.6, 0, 0.5)));
    const mg = X.icon('magnifier', 0, 0, 0.32, { parent: g });
    X.each(t => {
      const p = X.P(k, 0.6, 0, 0.6);
      const y = lerp(py - 50 + 50 * ((Math.sin(t * 1.5) + 1)), py - 10, p);
      mg.inner.setAttribute('transform', `translate(${cx + 125} ${y.toFixed(1)}) scale(0.32)`);
    });
    const lk = X.chip(cx, py + 82, 'leaker found', { parent: g, size: 22, fill: C.redL, color: C.red });
    X.show(lk, k, { f: 0.7, type: 'pop' });
  }
  // 6: detective
  {
    const { g, cx, py, k } = T[5];
    ['shape', 'check digit', 'nearby words'].forEach((c, j) => {
      const ch = X.chip(cx - 62, py - 52 + j * 50, c, { parent: g, size: 22, fill: C.paper, color: C.ink });
      X.show(ch, k, { f: 0.15 + j * 0.1, type: 'left' });
    });
    E('rect', { x: cx + 78, y: py - 60, width: 34, height: 130, rx: 8, fill: C.sand, stroke: C.ink, 'stroke-width': 3 }, g);
    const bar = E('rect', { x: cx + 82, y: py + 66, width: 26, height: 0, rx: 5, fill: C.plum }, g);
    X.each(t => { const h = 120 * (0.15 + 0.75 * X.P(k, 0.2, 0, 2.2)) + 3 * Math.sin(t * 2); bar.setAttribute('height', h.toFixed(1)); bar.setAttribute('y', (py + 66 - h).toFixed(1)); });
    X.text(cx + 95, py + 98, 'how sure', { parent: g, size: 22, anchor: 'middle', fill: C.ink3 });
    const br = X.icon('brain', cx + 140, py - 40, 0.26, { parent: g });
    X.show(br, k, { f: 0.75, type: 'pop' });
    X.term(k, 'Probability', 'A number from 0 to 1: how sure Aran is that\nsomething really is personal data.', { f: 0.35, until: k + 1 });
  }
  // 7: leakage ledger
  {
    const { g, cx, py, k } = T[6];
    E('rect', { x: cx - 150, y: py - 60, width: 100, height: 124, rx: 6, fill: C.ochreL, stroke: C.ink, 'stroke-width': 3 }, g);
    E('line', { x1: cx - 100, y1: py - 60, x2: cx - 100, y2: py + 64, stroke: C.ink, 'stroke-width': 2 }, g);
    for (let j = 0; j < 5; j++) { E('line', { x1: cx - 140, y1: py - 38 + j * 20, x2: cx - 108, y2: py - 38 + j * 20, stroke: C.ink3, 'stroke-width': 2 }, g); E('line', { x1: cx - 92, y1: py - 38 + j * 20, x2: cx - 60, y2: py - 38 + j * 20, stroke: C.ink3, 'stroke-width': 2 }, g); }
    const a = X.chip(0, 0, '98765', { parent: g, size: 22, mono: true, fill: C.card });
    const b = X.chip(0, 0, '43210', { parent: g, size: 22, mono: true, fill: C.card });
    E('line', { x1: cx - 20, y1: py, x2: cx + 150, y2: py, stroke: C.red, 'stroke-width': 5, 'stroke-dasharray': '10 6' }, g);
    const xm = X.mark(cx + 135, py, false, { parent: g, s: 15 });
    X.show(xm, k, { f: 0.4, type: 'pop' });
    X.each(t => {
      const bump = Math.abs(Math.sin(t * 2.2));
      a.setAttribute('transform', `translate(${cx + 50} ${(py - 58 + bump * 30).toFixed(1)})`);
      b.setAttribute('transform', `translate(${cx + 50} ${(py + 58 - bump * 30).toFixed(1)})`);
    });
    X.term(k, 'Leakage ledger', 'Aran\'s notebook of which pieces of a number have\nalready gone out, so they cannot be joined.', { f: 0.1, until: k + 1 });
  }
  // 8: key erasure with a signed receipt
  {
    const { g, cx, py, k } = T[7];
    X.icon('trash', cx - 110, py + 50, 0.42, { parent: g });
    const key = X.g(g); X.icon('key', 0, 0, 0.4, { parent: key });
    X.each(() => {
      const p = ease(X.L(k, 0.15, 0.4));
      key.setAttribute('transform', `translate(${(cx - 110).toFixed(1)} ${lerp(py - 60, py + 25, p).toFixed(1)}) rotate(${(p * 90).toFixed(1)})`);
      key.setAttribute('opacity', (1 - clamp((X.t - X.at(k, 0.4)) / 0.3)).toFixed(2));
    });
    [0, 1, 2].forEach(j => {
      const f = X.icon('file', cx + 2 + j * 52, py - 48, 0.34, { parent: g });
      const x = X.mark(cx + 18 + j * 52, py - 30, false, { parent: g, s: 11 });
      X.show(x, k, { f: 0.45 + j * 0.04, type: 'pop' });
      X.each(() => f.setAttribute('opacity', (1 - 0.6 * X.P(k, 0.45, 0, 0.5)).toFixed(2)));
    });
    const rc = X.g(g);
    X.rect(cx - 20, py + 10, 170, 80, { parent: rc, fill: C.paper, stroke: C.ink, sw: 2, r: 6 });
    X.text(cx - 6, py + 38, 'receipt', { parent: rc, size: 22, w: 600 });
    E('path', { d: `M${cx - 8},${py + 70} q12,-18 22,0 t22,0 t22,-6`, fill: 'none', stroke: C.blue, 'stroke-width': 3 }, rc);
    E('circle', { cx: cx + 118, cy: py + 58, r: 18, fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, rc);
    X.show(X.wrap(rc), k, { f: 0.7, type: 'pop' });
    X.term(k, 'Signed receipt', 'Proof, stamped with a digital signature,\nthat the keys were really destroyed.', { f: 0.6, until: k + 1 });
  }
  // 9: immune layer
  {
    const { g, cx, py, k } = T[8];
    const ccx = cx - 85, ccy = py - 15;
    E('circle', { cx: ccx, cy: ccy, r: 46, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, g);
    for (let h = 0; h < 12; h++) { const a = h * Math.PI / 6; E('line', { x1: ccx + 38 * Math.sin(a), y1: ccy - 38 * Math.cos(a), x2: ccx + 44 * Math.sin(a), y2: ccy - 44 * Math.cos(a), stroke: C.ink, 'stroke-width': 2 }, g); }
    E('line', { x1: ccx, y1: ccy, x2: ccx + 24 * Math.sin(Math.PI / 3), y2: ccy - 24 * Math.cos(Math.PI / 3), stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    const mh = E('line', { x1: ccx, y1: ccy, x2: ccx, y2: ccy - 34, stroke: C.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    X.each(t => mh.setAttribute('transform', `rotate(${((t * 20) % 360).toFixed(1)} ${ccx} ${ccy})`));
    X.text(ccx, py + 62, '2 a.m.', { parent: g, size: 24, w: 700, anchor: 'middle' });
    const ins = X.person(cx + 70, py + 82, { shirt: C.ochre, skin: C.skin[0], glasses: true, s: 0.55, parent: g, ph: 2 });
    X.each(() => ins.mood(X.t > X.at(k, 0.6) ? 'shock' : 'neutral'));
    const al = X.icon('alert', cx + 128, py - 52, 0.26, { parent: g });
    X.show(al, k, { f: 0.55, type: 'pop' });
    X.shake(al.mid, k, { f: 0.65, amp: 5, len: 1.2 });
    X.term(k, 'Immune layer', 'A part of Aran that learns normal behaviour and\nflags anything strange, like a body\'s immune system.', { f: 0.1, until: k + 1 });
  }
  // 10: hybrid quantum-safe locks
  {
    const { g, cx, py, k } = T[9];
    const at = X.icon('atom', cx + 70, py - 10, 0.85, { parent: g, color: C.ink3 });
    X.spin(at.mid, cx + 70, py - 10, { speed: 30 });
    X.icon('lock', cx - 70, py, 0.62, { parent: g, fill: C.tealL });
    X.icon('lock', cx + 70, py, 0.62, { parent: g, fill: C.plumL });
    X.text(cx, py + 12, '+', { parent: g, size: 40, serif: true, w: 700, anchor: 'middle' });
    X.text(cx - 70, py + 72, 'today', { parent: g, size: 22, anchor: 'middle', fill: C.ink3 });
    X.text(cx + 70, py + 72, 'quantum-safe', { parent: g, size: 22, anchor: 'middle', fill: C.ink3 });
    X.term(k, 'Hybrid, quantum-safe lock', 'Two locks in one: today\'s lock plus a new one\nthat future quantum computers cannot break.', { f: 0.05, until: k, outf: 0.6 });
  }
  // gentle life on all lit tiles once zoomed out
  const ring = X.rect(60, 135, 1800, 765, { fill: 'none', stroke: C.ochre, sw: 4, r: 24, dash: '16 10' });
  X.show(ring, 10, { f: 0.75, type: 'fade', len: 0.8 });
  X.each(t => ring.r.setAttribute('stroke-dashoffset', (-t * 30).toFixed(1)));
});
