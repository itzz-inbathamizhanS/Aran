// What the law says: the DPDP Act on a balance, the ₹250 crore fine, erasure chasing copies that multiply, the start date and the RBI.
scene('law', X => {
  const BX = 2200, CX = 4400;
  X.cam([
    { x: 960, y: 560, s: 1.06 },
    { k: 1, x: 960, y: 560, s: 1 },
    { k: 2, f: 0.05, x: 1180, y: 590, s: 1.12 },
    { k: 3, x: BX + 960, y: 560, s: 1, len: 2 },
    { k: 4, x: BX + 820, y: 580, s: 1.08 },
    { k: 5, x: BX + 1000, y: 560, s: 0.98 },
    { k: 6, x: CX + 700, y: 560, s: 1.12, len: 2 },
    { k: 7, x: CX + 1080, y: 560, s: 1.04 }
  ]);

  // ---------------- A: the act on a balance ----------------
  X.term(0, 'DPDP Act', 'India\'s Digital Personal Data Protection Act,\npassed in 2023. It protects people\'s data.', { f: 0.4, until: 1 });
  const PX = 520, PY = 380;
  const sc = X.g();
  E('rect', { x: PX - 12, y: PY, width: 24, height: 430, rx: 8, fill: C.ink2 }, sc);
  E('path', { d: `M${PX - 130},${PY + 450} L${PX + 130},${PY + 450} L${PX + 90},${PY + 420} L${PX - 90},${PY + 420} Z`, fill: C.ink }, sc);
  const beam = E('g', null, sc);
  E('rect', { x: PX - 250, y: PY - 10, width: 500, height: 20, rx: 10, fill: C.ink }, beam);
  E('circle', { cx: PX, cy: PY, r: 22, fill: C.ochre, stroke: C.ink, 'stroke-width': 5 }, beam);
  const pans = [-1, 1].map(sd => {
    const pg = E('g', null, sc);
    E('path', { d: `M0,0 L-80,170 M0,0 L80,170`, stroke: C.ink2, 'stroke-width': 4, fill: 'none' }, pg);
    E('path', { d: 'M-110,170 Q0,240 110,170 Z', fill: C.ochreL, stroke: C.ink, 'stroke-width': 5 }, pg);
    const cont = E('g', null, pg);
    return { pg, cont, sd };
  });
  X.icon('idcard', 0, 128, 0.75, { parent: pans[0].cont });
  X.icon('building', 0, 112, 0.6, { parent: pans[1].cont, fill: C.blueL });
  X.show(sc, 0, { type: 'up' });
  const coins = [];
  for (let i = 0; i < 6; i++) { const c = X.icon('coin', 0, 140 - i * 18, 0.45, { parent: pans[1].cont }); c.style.opacity = 0; coins.push(c); }
  X.each(t => {
    const fineP = X.P(2, 0.4, 0, 1.2);
    const ang = 6 * Math.sin(t * 0.9) * (1 - fineP) + 14 * fineP;
    beam.setAttribute('transform', `rotate(${ang.toFixed(2)} ${PX} ${PY})`);
    pans.forEach(p => {
      const r = ang * Math.PI / 180, x = PX + p.sd * 240 * Math.cos(r), y = PY + p.sd * 240 * Math.sin(r);
      p.pg.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
    coins.forEach((c, i) => { c.style.opacity = t > X.at(2, 0.4 + i * 0.07) ? 1 : 0; c.inner.parentNode.parentNode.style.display = ''; });
    pans[1].cont.querySelector('g').style.opacity = t > X.at(2, 0.4) ? 0 : 1;
  });
  // the law as a document
  const doc = X.g();
  X.rect(1180, 270, 560, 530, { parent: doc, fill: C.card, stroke: C.ink, sw: 4, r: 10, shadow: true });
  X.text(1460, 330, 'Digital Personal Data', { parent: doc, size: 36, anchor: 'middle', serif: true, w: 700 });
  X.text(1460, 376, 'Protection Act, 2023', { parent: doc, size: 36, anchor: 'middle', serif: true, w: 700 });
  E('line', { x1: 1240, y1: 400, x2: 1680, y2: 400, stroke: C.line, 'stroke-width': 3 }, doc);
  X.show(doc, 0, { f: 0.15, type: 'pop' });
  const chipA = X.chip(1460, 440, 'DPDP Act', { size: 26, color: C.ochre, fill: C.ochreL, stroke: C.ochre });
  X.show(chipA, 0, { f: 0.5, type: 'pop' });
  for (let i = 0; i < 6; i++) {
    const b = X.rect(1230, 490 + i * 42, [440, 380, 420, 300, 410, 360][i], 12, { fill: C.sand, stroke: 'none', r: 6 });
    X.show(b, 0, { f: 0.3 + i * 0.07, type: 'grow' });
  }
  const hl = X.g();
  X.rect(1210, 518, 500, 74, { parent: hl, fill: C.tealL, stroke: C.teal, sw: 3, r: 10 });
  X.text(1460, 548, 'protect personal data with', { parent: hl, size: 24, anchor: 'middle', w: 600 });
  X.text(1460, 578, 'reasonable safeguards', { parent: hl, size: 24, anchor: 'middle', w: 700, fill: C.teal });
  X.show(hl, 1, { f: 0.1, type: 'grow' });
  X.term(1, 'Safeguards', 'Sensible protections, like locks, passwords and\nrules about who may look, that keep data safe.', { f: 0.4, until: 2 });
  // safeguards circle the data pan
  const guards = ['lock', 'key', 'shield'].map((nm, i) => { const g = X.icon(nm, 0, 0, 0.42, { fill: C.tealL }); X.show(g, 1, { f: 0.35 + i * 0.1, type: 'pop', out: 2, outf: 0.3 }); return g; });
  X.each(t => guards.forEach((g, i) => {
    const r = X.on(0) ? (6 * Math.sin(t * 0.9)) * Math.PI / 180 : 0;
    const cx = PX - 240 * Math.cos(r), cy = PY - 240 * Math.sin(r) + 140;
    const a = t * 1.2 + i * 2.1;
    g.mid.setAttribute('transform', `translate(${(cx + 150 * Math.cos(a)).toFixed(1)} ${(cy + 80 * Math.sin(a)).toFixed(1)})`);
  }));
  // the fine
  const fineG = X.g();
  X.rect(1180, 690, 560, 150, { parent: fineG, fill: C.redL, stroke: C.red, sw: 4, r: 16, shadow: true });
  X.text(1460, 732, 'fine for failing to protect data: up to', { parent: fineG, size: 24, anchor: 'middle', fill: C.ink2 });
  const amt = X.text(1460, 812, '', { parent: fineG, size: 64, anchor: 'middle', serif: true, w: 700, fill: C.red });
  X.count(amt, 0, 250, 2, { f0: 0.3, f1: 0.8, fmt: v => Math.round(v), pre: '₹', post: ' crore' });
  X.show(fineG, 2, { f: 0.2, type: 'up' });

  // ---------------- B: the right to erasure ----------------
  const ravi = X.person(BX + 200, 850, { shirt: C.blue, skin: C.skin[1], name: 'Ravi' });
  X.show(ravi, 3, { type: 'up' });
  X.talk(ravi, [4], { base: 'neutral' });
  X.point(ravi, 4, 70, { f: 0.1, until: 5 });
  const rc = X.g();
  X.rect(BX + 340, 270, 500, 300, { parent: rc, fill: C.card, stroke: C.ink, sw: 3, r: 16, shadow: true });
  X.text(BX + 370, 320, 'Your rights', { parent: rc, size: 34, serif: true, w: 700 });
  ['Right to know', 'Right to correct', 'Right to erasure'].forEach((r, i) => {
    X.mark(BX + 392, 380 + i * 60, true, { parent: rc, s: 18 });
    X.text(BX + 424, 389 + i * 60, r, { parent: rc, size: 28, w: i === 2 ? 700 : 500, fill: i === 2 ? C.ink : C.ink2 });
  });
  X.show(rc, 3, { f: 0.1, type: 'pop' });
  const er = X.rect(BX + 365, 478, 450, 66, { fill: 'none', stroke: C.ochre, sw: 5, r: 12 });
  X.show(er, 3, { f: 0.6, type: 'pop' });
  X.term(3, 'Erasure', 'Deleting your personal data for good,\nwhen you ask and it is no longer needed.', { f: 0.6, until: 5 });
  // the company database with Ravi's row
  const dbG = X.g();
  X.icon('db', BX + 1040, 470, 1.1, { parent: dbG });
  X.text(BX + 1040, 580, 'company database', { parent: dbG, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(dbG, 4, { type: 'pop' });
  const row = X.g();
  X.rect(BX + 900, 620, 280, 50, { parent: row, fill: C.blueL, stroke: C.blue, r: 10 });
  X.text(BX + 1040, 654, 'Ravi Kumar ·····', { parent: row, size: 24, anchor: 'middle', w: 600 });
  X.show(row, 4, { f: 0.1, type: 'up' });
  X.each(t => { const p = X.P(4, 0.62, 0, 0.6); row.style.opacity = t > X.at(4, 0.1) ? 1 - p : 0; });
  const req = X.g(); const rqi = E('g', null, req);
  X.icon('envelope', 0, 0, 0.6, { parent: rqi });
  X.chip(0, -52, 'Delete my data', { parent: rqi, size: 22, color: C.red, fill: C.card, stroke: C.red });
  X.show(X.wrap(req), 4, { f: 0.15, type: 'fade', len: 0.3, out: 4, outf: 0.62, outLen: 0.3 });
  X.travel(req, spline([[BX + 320, 600], [BX + 650, 470], [BX + 960, 640]]), 4, { f0: 0.18, f1: 0.55 });
  const tr = X.icon('trash', BX + 1250, 650, 0.5);
  X.show(tr, 4, { f: 0.55, type: 'pop' });
  X.shake(tr.mid, 4, { f: 0.65 });
  const easy = X.chip(BX + 1040, 750, 'one database: easy', { size: 26, color: C.green, fill: C.greenL, stroke: C.green });
  X.show(easy, 4, { f: 0.7, type: 'up' });
  // copies multiply faster than the delete request can chase them
  const slots = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) slots.push([BX + 1400 + c * 125 + (r % 2) * 30, 300 + r * 122]);
  const order = [5, 10, 2, 13, 7, 16, 0, 11, 18, 3, 8, 15, 1, 19, 6, 12, 4, 17, 9, 14];
  const icons = ['log', 'db', 'building', 'chat'];
  const cps = order.map((si, j) => {
    const [x, y] = slots[si];
    const g = X.g(); X.icon(icons[j % 4], x, y, 0.4, { parent: g, fill: [C.card, C.blueL, C.plumL, C.tealL][j % 4] });
    const tApp = 0.04 + 0.86 * Math.pow(j / 19, 0.7);
    return { g, x, y, tApp, tDel: null };
  });
  const victims = [0, 1, 2, 4, 6];
  victims.forEach((v, i) => { cps[v].tDel = 0.2 + i * 0.16; });
  const hunter = X.g(); const hi = E('g', null, hunter);
  X.icon('trash', 0, 0, 0.45, { parent: hi, fill: C.redL });
  X.chip(0, -50, 'delete', { parent: hi, size: 20, color: C.red, fill: C.card, stroke: C.red });
  X.show(X.wrap(hunter), 5, { f: 0.1, type: 'fade' });
  const cntC = X.text(BX + 1640, 940 - 20, '', { size: 28, anchor: 'middle', fill: C.red, w: 700 });
  X.show(cntC, 5, { f: 0.1, type: 'fade' });
  X.each(t => {
    let alive = 0, deleted = 0;
    cps.forEach(c => {
      const a = clamp((t - X.at(5, c.tApp)) / 0.35);
      const d = c.tDel != null ? clamp((t - X.at(5, c.tDel)) / 0.4) : 0;
      c.g.style.opacity = (a * (1 - d)).toFixed(2);
      c.g.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${(a < 1 ? 0.4 + 0.6 * easeBack(a) : 1) * (1 - 0.5 * d)}) translate(${-c.x} ${-c.y})`);
      if (a > 0.5 && d < 1) alive++;
      if (d >= 1) deleted++;
    });
    cntC.set(`copies: ${alive}    deleted: ${deleted}`);
    // the hunter hops from victim to victim
    let hx = BX + 1250, hy = 650;
    victims.forEach((v, i) => {
      const c = cps[v], p = ease(clamp((t - X.at(5, c.tDel - 0.12)) / 0.9));
      if (p > 0) { hx = lerp(hx, c.x - 10, p); hy = lerp(hy, c.y + 70, p); }
    });
    hunter.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
  });
  const hard = X.chip(BX + 1040, 820, 'every copy: very hard', { size: 26, color: C.red, fill: C.redL, stroke: C.red });
  X.show(hard, 5, { f: 0.6, type: 'up' });

  // ---------------- C: the start date and the RBI ----------------
  const cal = X.g();
  X.rect(CX + 400, 300, 380, 430, { parent: cal, fill: C.card, stroke: C.ink, sw: 4, r: 16, shadow: true });
  E('rect', { x: CX + 400, y: 300, width: 380, height: 100, rx: 16, fill: C.red }, cal);
  E('rect', { x: CX + 400, y: 370, width: 380, height: 30, fill: C.red }, cal);
  for (const x of [CX + 480, CX + 700]) E('rect', { x: x - 8, y: 280, width: 16, height: 44, rx: 8, fill: C.ink }, cal);
  const mon = X.text(CX + 590, 372, 'MAY', { parent: cal, size: 50, anchor: 'middle', fill: C.card, w: 700, ls: 4 });
  const day = X.text(CX + 590, 580, '13', { parent: cal, size: 170, anchor: 'middle', serif: true, w: 700 });
  const yr = X.text(CX + 590, 680, '2027', { parent: cal, size: 50, anchor: 'middle', fill: C.ink2, w: 700 });
  X.show(cal, 6, { type: 'pop' });
  const months = ['NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY'];
  X.each(t => {
    const p = X.L(6, 0.05, 0.45);
    const i = Math.min(months.length - 1, Math.floor(p * months.length));
    mon.set(months[i]); yr.set(i < 2 ? '2026' : '2027'); day.set(p < 1 ? String(1 + ((i * 7) % 28)) : '13');
  });
  X.pulse(cal, CX + 590, 515, 6, { f: 0.5, amt: 0.08 });
  const cl = X.text(CX + 590, 800, 'the detailed rules start applying', { size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(cl, 6, { f: 0.5, type: 'up' });
  const road = X.g();
  E('line', { x1: CX + 880, y1: 520, x2: CX + 1330, y2: 520, stroke: C.line, 'stroke-width': 8, 'stroke-linecap': 'round' }, road);
  [[CX + 880, '2023', 'law passed', C.ink2], [CX + 1330, '13 May 2027', 'rules apply', C.red]].forEach(([x, a, b, col]) => {
    E('circle', { cx: x, cy: 520, r: 16, fill: C.card, stroke: col, 'stroke-width': 5 }, road);
    X.text(x, 480, a, { parent: road, size: 28, anchor: 'middle', w: 700, fill: col });
    X.text(x, 575, b, { parent: road, size: 24, anchor: 'middle', fill: C.ink2 });
  });
  const walker = E('circle', { r: 12, fill: C.ochre }, road);
  X.each(t => { const p = ease(X.L(6, 0.2, 0.8)); walker.setAttribute('cx', lerp(CX + 880, CX + 1330, p).toFixed(1)); walker.setAttribute('cy', 520); });
  X.show(road, 6, { f: 0.15, type: 'fade', out: 7, outLen: 0.5 });
  // the RBI watches the banks and their AI tools
  X.term(7, 'RBI', 'The Reserve Bank of India: the central bank that\nsets the rules all Indian banks must follow.', { f: 0.15, until: 8 });
  const rbi = X.g();
  X.icon('bank', CX + 1300, 360, 1.2, { parent: rbi, fill: C.ochre });
  X.text(CX + 1300, 460, 'Reserve Bank of India (RBI)', { parent: rbi, size: 28, anchor: 'middle', serif: true, w: 700 });
  X.show(rbi, 7, { type: 'down' });
  const banks = [CX + 1050, CX + 1300, CX + 1550];
  banks.forEach((x, i) => {
    const g = X.g();
    X.icon('bank', x, 590, 0.6, { parent: g });
    const ln = X.path(`M${CX + 1300},480 L${x},545`, { color: C.ochre, sw: 4 });
    X.show(ln, 7, { f: 0.15 + i * 0.05, type: 'draw' });
    X.show(g, 7, { f: 0.15 + i * 0.05, type: 'up' });
  });
  const ai = X.g();
  X.icon('chat', CX + 1760, 800, 0.7, { parent: ai, fill: C.plumL });
  X.text(CX + 1760, 880, 'AI tools', { parent: ai, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(ai, 7, { f: 0.45, type: 'pop' });
  const gate = X.g();
  X.icon('shield', CX + 1450, 790, 0.7, { parent: gate, check: true });
  X.text(CX + 1450, 880, 'control what is sent', { parent: gate, size: 24, anchor: 'middle', fill: C.teal, w: 600 });
  X.show(gate, 7, { f: 0.55, type: 'pop' });
  const toGate = spline([[CX + 1100, 640], [CX + 1250, 770], [CX + 1400, 790]]);
  X.show(X.path(toGate.d, { color: C.line, sw: 3 }), 7, { f: 0.5, type: 'draw' });
  X.stream(toGate, { n: 4, speed: 0.4, r: 9, colors: [C.red, C.red, C.green], k0: 7, f0: 0.5 });
  X.stream(spline([[CX + 1500, 790], [CX + 1690, 795]]), { n: 2, speed: 0.4, r: 9, color: C.green, k0: 7, f0: 0.6 });

  X.recap(8, ['DPDP Act: safeguards are required', 'Fines of up to ₹250 crore', 'People can ask for their data to be erased', 'Copies make erasure very hard']);
});
