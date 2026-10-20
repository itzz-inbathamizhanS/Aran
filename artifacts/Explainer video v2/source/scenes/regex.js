// The simple way: pattern search. Shapes of digits, the regex code, the Loghub test, a magnifier scanning real
// log lines where every 6-digit run lights up, 67,481 false OTP alarms, "otp" inside "hotplug", and Aran's 6.
scene('regex', X => {
  const tf = (el, x, y, s = 1, r = 0) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(1)})` : ''}`);

  X.cam([{ x: 960, y: 520, s: 1.08 },
    { k: 1, x: 960, y: 540, s: 1 },
    { k: 4, x: 2880, y: 540, s: 1, len: 1.6 },
    { k: 8, x: 4800, y: 540, s: 1, len: 1.6 },
    { k: 9, f: 0.05, x: 4800, y: 520, s: 1.04 },
    { k: 10, x: 6720, y: 540, s: 1, len: 1.5 },
    { k: 11, x: 8640, y: 540, s: 1, len: 1.5 }]);

  // ================= cue 0: searching a log =================
  const logIc = X.icon('log', 400, 540, 2.3);
  X.show(logIc, 0, { type: 'up' });
  const mg = X.icon('magnifier', 0, 0, 1.1);
  X.show(mg, 0, { f: 0.1, type: 'fade' });
  X.each(t => {
    const u = t * 0.9;
    mg.mid.setAttribute('transform', `translate(${(420 + 60 * Math.sin(u)).toFixed(1)} ${(520 + 70 * Math.sin(u * 0.7 + 1)).toFixed(1)})`);
  });
  const qs = X.g();
  X.chip(980, 330, 'Aadhaar?', { parent: qs, size: 34, color: C.blue, fill: C.blueL, shadow: true });
  X.chip(1300, 330, 'OTP?', { parent: qs, size: 34, color: C.plum, fill: C.plumL, shadow: true });
  X.show(qs, 0, { f: 0.15, type: 'pop', out: 1, outLen: 0.4 });
  const ps = X.text(1140, 520, 'pattern search', { anchor: 'middle', size: 64, serif: true, w: 600 });
  X.show(ps, 0, { f: 0.72, type: 'up', out: 1, outLen: 0.4 });
  X.term(0, 'Pattern search', 'Looking for text that has a certain shape,\nlike "six digits in a row", without understanding it.', { f: 0.7, until: 2 });

  // ================= cue 1-2: shapes =================
  const shapeRow = (y, str, label, k, chipStr, chipColor, chipFill, groups) => {
    const g = X.g();
    X.text(760, y - 20, label, { parent: g, size: 30, w: 700, fill: C.ink2 });
    const d = X.digits(760, y, str, { anchor: 'start', groups, cw: 50, ch: 70, size: 36, gap: 6, groupGap: 20, parent: g, fill: C.paper });
    d.cells.forEach(c => { c.r.setAttribute('stroke-dasharray', '6 6'); });
    X.show(g, k, { type: 'up' });
    X.each(() => {
      const n = Math.round(X.L(k, 0.3, 0.65) * str.length);
      d.set(str.slice(0, n).padEnd(str.length, ' '));
      d.cells.forEach((c, i) => { const on = i < n; c.r.setAttribute('fill', on ? chipFill : C.paper); c.r.setAttribute('stroke', on ? chipColor : C.line); c.r.setAttribute('stroke-dasharray', on ? 'none' : '6 6'); });
    });
    const last = d.cells[str.length - 1];
    const ch = X.g(); X.chip(last.x + last.w + 110, y + 35, chipStr, { parent: ch, size: 32, color: chipColor, fill: chipFill, shadow: true });
    X.show(ch, k, { f: 0.7, type: 'pop' });
    return g;
  };
  shapeRow(300, '234567890124', 'any 12 digits in a row', 1, 'Aadhaar?', C.blue, C.blueL, [4, 4, 4]);
  shapeRow(510, '482913', 'any 6 digits in a row', 2, 'OTP?', C.plum, C.plumL, null);
  // the regex code
  const code = X.g();
  X.rect(760, 690, 1000, 150, { parent: code, fill: C.ink, r: 18, stroke: C.ink, shadow: true });
  X.text(800, 752, 'Aadhaar:  \\d{12}', { parent: code, size: 40, mono: true, w: 600, fill: C.blueL });
  X.text(800, 810, 'OTP:      \\d{6}', { parent: code, size: 40, mono: true, w: 600, fill: C.plumL });
  X.text(1700, 752, '\\d = any digit', { parent: code, anchor: 'end', size: 26, fill: C.sand, w: 500 });
  X.text(1700, 810, '{6} = six times', { parent: code, anchor: 'end', size: 26, fill: C.sand, w: 500 });
  X.show(code, 3, { f: 0.1, type: 'up' });
  X.term(3, 'Regular expression (regex)', 'A short code that describes a text pattern,\nfor example \\d{6} means "any six digits in a row".', { f: 0.3, until: 4 });
  X.pulse(logIc.mid, 400, 540, 3, { f: 0.1, amt: 0.08 });

  // ================= cue 4-7: the honest test on Loghub =================
  const team = [2080, 2210, 2340].map((x, i) => {
    const p = X.person(x, 880, { shirt: [C.plum, C.teal, C.blue][i], skin: C.skin[(i + 2) % 4], long: i === 1, glasses: i === 2, s: 0.85, ph: i * 1.3 });
    X.show(p, 4, { f: 0.1 + i * 0.08, type: 'up' });
    X.each(() => p.mood(X.t > X.at(8, 0.4) && X.t < X.at(10) ? 'shock' : 'neutral'));
    return p;
  });
  X.point(team[2], 4, 70, { f: 0.5, until: 6 });
  const testC = X.g(); X.chip(2210, 560, 'test it on real data', { parent: testC, size: 28, color: C.ink, fill: C.card, shadow: true });
  X.show(testC, 4, { f: 0.4, type: 'pop', out: 7, outLen: 0.4 });
  const hub = X.g();
  X.rect(2560, 190, 880, 450, { parent: hub, fill: C.card, r: 22, shadow: true });
  X.text(3000, 258, 'Loghub', { parent: hub, anchor: 'middle', size: 48, serif: true, w: 600 });
  X.text(3000, 300, 'a public collection of real logs', { parent: hub, anchor: 'middle', size: 26, fill: C.ink2 });
  X.show(hub, 4, { f: 0.55, type: 'pop' });
  const sysIcons = ['server', 'phone', 'cloud', 'laptop', 'db', 'server', 'phone', 'gear', 'cloud', 'server', 'laptop', 'db', 'phone', 'server', 'gear', 'cloud'];
  const sysPos = [];
  sysIcons.forEach((nm, i) => {
    const x = 2645 + (i % 8) * 101, y = 390 + Math.floor(i / 8) * 130;
    const ic = X.icon(nm, x, y, 0.48);
    X.show(ic, 5, { f: 0.35 + i * 0.025, type: 'pop' });
    X.bob(ic.mid, { amp: 3, per: 2 + (i % 3) * 0.4, ph: i });
    sysPos.push([x, y]);
  });
  const cnt = X.g();
  const lines = X.text(2780, 720, '0', { parent: cnt, anchor: 'middle', size: 52, serif: true, w: 700 });
  X.text(2780, 760, 'log lines', { parent: cnt, anchor: 'middle', size: 26, fill: C.ink2 });
  const systems = X.text(3220, 720, '0', { parent: cnt, anchor: 'middle', size: 52, serif: true, w: 700 });
  X.text(3220, 760, 'different systems', { parent: cnt, anchor: 'middle', size: 26, fill: C.ink2 });
  X.count(lines, 0, 32000, 5, { f0: 0.4, f1: 0.8 });
  X.count(systems, 0, 16, 5, { f0: 0.55, f1: 0.85 });
  X.show(cnt, 5, { f: 0.35, type: 'up' });
  X.term(5, 'Loghub', 'A free, public collection of log files from real\ncomputer systems, used by researchers to test tools.', { f: 0.15, until: 6 });
  // where the logs come from
  [[0, 'supercomputer', 0.12, 40, -58], [6, 'phone', 0.3, 0, -58], [9, 'web server', 0.45, 0, 62]].forEach(([i, s, f, dx, dy]) => {
    const [x, y] = sysPos[i];
    const g = X.g(); X.chip(x + dx, y + dy, s, { parent: g, size: 22, color: C.ochre, fill: C.ochreL, shadow: true });
    X.show(g, 6, { f, type: 'pop', out: 7, outLen: 0.3 });
  });
  const none = X.g();
  X.rect(3480, 250, 340, 300, { parent: none, fill: C.greenL, stroke: C.green, r: 20, shadow: true });
  X.text(3650, 300, 'Indian identifiers', { parent: none, anchor: 'middle', size: 26, w: 700, fill: C.green });
  X.text(3650, 330, 'in these logs:', { parent: none, anchor: 'middle', size: 26, w: 700, fill: C.green });
  X.text(3650, 440, '0', { parent: none, anchor: 'middle', size: 110, serif: true, w: 700, fill: C.green });
  X.text(3650, 515, 'no Aadhaar, no OTP', { parent: none, anchor: 'middle', size: 24, fill: C.ink2, w: 600 });
  X.show(none, 6, { f: 0.6, type: 'pop' });
  const rule = X.g();
  X.rect(2560, 810, 1260, 90, { parent: rule, fill: C.ochreL, stroke: C.ochre, r: 45, shadow: true });
  X.icon('alert', 2630, 855, 0.42, { parent: rule, fill: C.ochreL, color: C.ochre });
  X.text(3220, 868, 'so any hit here must be a false alarm', { parent: rule, anchor: 'middle', size: 36, serif: true, w: 600, fill: C.ink });
  X.show(rule, 7, { f: 0.1, type: 'up' });

  // ================= cue 8-9: scanning the real log lines =================
  const LX = 4070, RH = 46, FS = 24, CW = FS * 0.602, WY0 = 196, WY1 = 640, SCAN = 430;
  const clipId = 'clip-regex-log';
  const defs = E('defs', null, X.root);
  const cp = E('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' }, defs);
  E('rect', { x: 4040, y: WY0, width: 1520, height: WY1 - WY0 }, cp);
  const panel = X.g();
  X.rect(4040, WY0, 1520, WY1 - WY0, { parent: panel, fill: C.card, r: 0, sw: 3 });
  const win = X.g(panel); win.setAttribute('clip-path', `url(#${clipId})`);
  const scroller = X.g(win);
  const rows = [];
  const copies = 6;
  for (let c = 0; c < copies; c++) DATA.log.forEach(([sys, ln], j) => {
    const i = rows.length, y = WY0 + 38 + i * RH;
    const rg = E('g', null, scroller);
    const ms = [];
    const re = /\d{6}/g; let m;
    while ((m = re.exec(ln))) {
      const r = E('rect', { x: LX + m.index * CW - 3, y: y - 25, width: 6 * CW + 6, height: 34, rx: 6, fill: C.redL, stroke: C.red, 'stroke-width': 2.5, opacity: 0 }, rg);
      ms.push({ r, idx: m.index, txt: m[0] });
    }
    const tx = E('text', { x: LX, y, 'font-size': FS, 'font-family': F.mono, fill: C.ink, 'font-weight': 500 }, rg);
    tx.textContent = ln;
    const st = E('text', { x: 5545, y, 'font-size': 20, 'font-family': F.sans, fill: C.ink3, 'text-anchor': 'end', 'font-weight': 600 }, rg);
    st.textContent = sys;
    rows.push({ y, ms, ln, lt: y < SCAN + 10 ? i * 0.12 : null });
  });
  // scrolling: steady during cue 8, easing to a stop early in cue 9
  const t0 = X.at(8, 0.08), tStop = X.at(9, 0.05), V = 70;
  const offAt = t => {
    if (t < t0) return 0;
    if (t < tStop) return (t - t0) * V;
    const extra = Math.min(t - tStop, 0.8);
    return (tStop - t0) * V + V * (extra - extra * extra / 1.6);
  };
  const finalOff = offAt(1e9);
  X.each(t => {
    const off = offAt(t);
    scroller.setAttribute('transform', `translate(0 ${(-off).toFixed(1)})`);
    rows.forEach(r => {
      const sy = r.y - off;
      const lit = (r.lt != null ? t > t0 + r.lt : sy < SCAN + 10 && t > t0) || t > X.at(9, 0.1);
      r.ms.forEach(m => m.r.setAttribute('opacity', lit ? 1 : 0));
    });
  });
  X.show(panel, 8, { type: 'fade' });
  // scan line + magnifier
  const scanG = X.g();
  E('line', { x1: 4040, y1: SCAN + 14, x2: 5560, y2: SCAN + 14, stroke: C.red, 'stroke-width': 3, 'stroke-dasharray': '10 8', opacity: 0.7 }, scanG);
  const lens = X.g(scanG);
  E('circle', { cx: 0, cy: 0, r: 46, fill: 'none', stroke: C.ink, 'stroke-width': 7 }, lens);
  E('line', { x1: 33, y1: 33, x2: 66, y2: 66, stroke: C.ink, 'stroke-width': 12, 'stroke-linecap': 'round' }, lens);
  X.each(t => { const u = (Math.sin(t * 1.4) + 1) / 2; tf(lens, lerp(4140, 5420, u), SCAN - 4); });
  X.show(scanG, 8, { f: 0.05, type: 'fade', out: 9, outf: 0.1 });
  const pat = X.g(); X.chip(4300, 160, 'OTP pattern:  \\d{6}', { parent: pat, size: 28, mono: true, color: C.plum, fill: C.plumL, shadow: true });
  X.show(pat, 8, { type: 'down' });
  // the counter
  const ctr = X.g();
  X.rect(4040, 680, 820, 180, { parent: ctr, fill: C.redL, stroke: C.red, r: 20, shadow: true });
  X.text(4080, 728, 'OTP pattern alarms on 32,000 lines', { parent: ctr, size: 28, w: 700, fill: C.red });
  const ctrN = X.text(4080, 812, '0', { parent: ctr, size: 72, serif: true, w: 700, fill: C.red });
  X.count(ctrN, 0, 67481, 8, { f0: 0.15, f1: 0.75 });
  const perL = X.text(4600, 812, '2+ per line', { parent: ctr, anchor: 'middle', size: 32, w: 700, fill: C.ink });
  X.show(perL, 8, { f: 0.85, type: 'pop' });
  X.show(ctr, 8, { f: 0.1, type: 'up' });
  X.shake(ctrN, 8, { f: 0.76, amp: 6 });
  // what it matched
  const what = X.g();
  X.rect(4920, 680, 640, 220, { parent: what, fill: C.card, r: 20, shadow: true });
  X.text(4950, 724, 'What it really matched:', { parent: what, size: 28, w: 700 });
  ['times', 'file sizes', 'block numbers', 'memory addresses'].forEach((s, i) => {
    const g = X.g(what);
    const x = 4960 + (i % 2) * 290, y = 772 + Math.floor(i / 2) * 64;
    X.chip(x + (s.length * 13 + 34) / 2 + 4, y, s, { parent: g, size: 24, color: C.red, fill: C.redL });
    X.show(g, 9, { f: 0.15 + i * 0.15, type: 'pop' });
  });
  X.show(what, 9, { f: 0.05, type: 'up' });
  // callouts on visible rows once the scroll stops
  const visible = rows.filter(r => r.y - finalOff > WY0 + 110 && r.y - finalOff < WY1 - 20);
  const pickT = visible.find(r => /^\d{6} \d{6}/.test(r.ln));
  const pickB = visible.find(r => r !== pickT && /blk_-?\d{6}/.test(r.ln) && r.ms.some(m => m.idx > 60));
  const callout = (row, mIdx, label, f) => {
    if (!row) return;
    const m = mIdx === 'last' ? row.ms[row.ms.length - 1] : row.ms[mIdx];
    if (!m) return;
    const x = LX + (m.idx + 3) * CW, y = row.y - finalOff - 44;
    const g = X.g();
    X.chip(x, y, label, { parent: g, size: 24, color: C.card, fill: C.red, stroke: C.red });
    X.show(g, 9, { f, type: 'pop' });
  };
  callout(pickT, 1, 'a time', 0.2);
  callout(pickB, 'last', 'a block number', 0.5);

  // ================= cue 10: hotplug =================
  const word = 'hotplug';
  const hp = X.digits(6720, 360, word, { cw: 120, ch: 150, size: 100, gap: 12, fill: C.card });
  hp.cells.forEach(c => c.t.setAttribute('font-family', F.sans));
  X.show(hp, 10, { type: 'up' });
  X.each(() => {
    const on = X.t > X.at(10, 0.35);
    [1, 2, 3].forEach(i => hp.paint(i, on ? C.redL : C.card, on ? C.red : C.line, on ? C.red : C.ink));
  });
  const br = X.path(`M${hp.cells[1].x},540 L${hp.cells[1].x},560 L${hp.cells[3].x + 120},560 L${hp.cells[3].x + 120},540`, { color: C.red, sw: 5 });
  X.show(br, 10, { f: 0.4, type: 'draw' });
  const otpC = X.g(); X.chip(hp.cells[2].cx, 620, 'OTP alarm!', { parent: otpC, size: 32, color: C.red, fill: C.redL, shadow: true });
  X.show(otpC, 10, { f: 0.5, type: 'pop' });
  X.pulse(otpC, hp.cells[2].cx, 620, 10, { f: 0.6, amt: 0.15 });
  const hpL = X.text(6720, 760, 'an ordinary computer word, not a one-time password', { anchor: 'middle', size: 30, fill: C.ink2, w: 500 });
  X.show(hpL, 10, { f: 0.7, type: 'up' });
  const mg2 = X.icon('magnifier', 0, 0, 1.0);
  X.show(mg2, 10, { f: 0.05, type: 'fade' });
  X.each(() => { const u = ease(X.L(10, 0.05, 0.35)); mg2.mid.setAttribute('transform', `translate(${lerp(hp.cells[0].cx, hp.cells[2].cx, u).toFixed(1)} ${(300 - 10 * Math.sin(X.t * 3)).toFixed(1)})`); });

  // ================= cue 11: 67,481 vs 6 =================
  const cmp = X.g();
  X.text(8640, 250, 'False alarms on the same 32,000 lines', { parent: cmp, anchor: 'middle', size: 40, serif: true, w: 600 });
  X.text(7840, 400, 'Simple pattern search', { parent: cmp, size: 32, w: 700 });
  X.text(7840, 640, 'Aran\'s checks', { parent: cmp, size: 32, w: 700 });
  X.show(cmp, 11, { type: 'fade' });
  const b1 = X.bar(7840, 420, 1300, 80, 1, 11, { color: C.red, f0: 0.1, f1: 0.45 });
  const b2 = X.g();
  E('rect', { x: 7840, y: 660, width: 1300, height: 80, rx: 10, fill: C.sand }, b2);
  E('rect', { x: 7840, y: 660, width: 8, height: 80, rx: 3, fill: C.green }, b2);
  X.show(b2, 11, { f: 0.45, type: 'fade' });
  X.show(b1, 11, { f: 0.05, type: 'fade' });
  const n1 = X.text(9120, 476, '0', { anchor: 'end', size: 52, serif: true, w: 700, fill: C.card });
  X.count(n1, 0, 67481, 11, { f0: 0.1, f1: 0.45 });
  X.show(n1, 11, { f: 0.15, type: 'fade' });
  const n2 = X.text(7880, 718, '6', { size: 56, serif: true, w: 700, fill: C.green });
  X.show(n2, 11, { f: 0.55, type: 'pop' });
  const tiny = X.text(7950, 712, 'just 6', { size: 34, w: 700, fill: C.green });
  X.show(tiny, 11, { f: 0.62, type: 'up' });
  const shieldA = X.icon('shield', 9240, 700, 0.6, { check: true });
  X.show(shieldA, 11, { f: 0.6, type: 'pop' });
  X.pulse(shieldA.mid, 9240, 700, 11, { f: 0.75, amt: 0.2 });

  X.recap(12, ['Pattern search looks only at the shape', '67,481 false OTP alarms on 32,000 real lines', 'Aran raised just 6']);
});
