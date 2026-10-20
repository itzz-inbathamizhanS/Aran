// What comes next: a two-lane road with milestone signs, then the product box, the bank, the service cloud and the calendar.
scene('next', X => {
  X.cam([
    { x: 760, y: 600, s: 1.15 },
    { k: 0, f: 0.3, x: 900, y: 590, s: 1.0, len: 1.4 },
    { k: 1, x: 1000, y: 440, s: 1.2 },
    { k: 2, x: 1000, y: 650, s: 1.2 },
    { k: 3, x: 2170, y: 600, s: 0.95, len: 1.8 },
    { k: 4, x: 4060, y: 520, s: 1.0, len: 2.0 },
    { k: 5, f: 0.18, x: 4620, y: 500, s: 0.85, len: 1.6 },
    { k: 6, x: 6060, y: 520, s: 1.2, len: 1.8 },
    { k: 7, x: 3000, y: 560, s: 0.32, len: 2.2 }
  ]);

  // ---------- the road ----------
  const road = X.g();
  E('rect', { x: -300, y: 470, width: 3400, height: 300, fill: C.sand }, road);
  E('line', { x1: -300, y1: 470, x2: 3100, y2: 470, stroke: C.ink3, 'stroke-width': 5 }, road);
  E('line', { x1: -300, y1: 770, x2: 3100, y2: 770, stroke: C.ink3, 'stroke-width': 5 }, road);
  const mid = E('line', { x1: -300, y1: 620, x2: 3100, y2: 620, stroke: C.card, 'stroke-width': 8, 'stroke-dasharray': '46 34' }, road);
  X.show(road, 0, { type: 'fade', len: 0.9 });
  X.each(t => mid.setAttribute('stroke-dashoffset', (t * 40).toFixed(1)));
  const today = X.chip(120, 620, 'Today', { size: 26, fill: C.card, color: C.ink, shadow: true });
  X.show(today, 0, { f: 0.2, type: 'pop' });
  for (let i = 0; i < 4; i++) for (const y of [545, 695]) {
    const ch = X.path(`M${560 + i * 70},${y - 26} L${590 + i * 70},${y} L${560 + i * 70},${y + 26}`, { color: C.card, sw: 10 });
    X.show(ch, 0, { f: 0.3 + i * 0.1, type: 'fade', len: 0.3 });
  }
  // lane labels
  const lab1 = X.g();
  X.chip(370, 322, 'Cybersecurity pair', { parent: lab1, size: 26, fill: C.tealL, color: C.teal });
  X.text(370, 386, 'Inbathamizhan & Aasif', { parent: lab1, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  X.show(lab1, 1, { type: 'down' });
  const lab2 = X.g();
  X.chip(370, 830, 'AI pair', { parent: lab2, size: 26, fill: C.plumL, color: C.plum });
  X.text(370, 890, 'Arun & Bharadhwaj', { parent: lab2, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  X.show(lab2, 2, { type: 'up' });

  // ---------- milestone signs ----------
  // a sign planted at cue k fraction f; base (where it stands) at baseY; board above or below
  const sign = (cx, k, f, text, icon, o) => {
    const outer = X.g();
    const inner = E('g', null, outer);
    const up = o.up, later = o.later;
    const by = up ? 300 : 790, bh = 116, base = up ? 474 : 912;
    if (up) E('rect', { x: cx - 7, y: by + bh, width: 14, height: base - by - bh, fill: C.ink2 }, inner);
    else { E('rect', { x: cx - 120, y: by + bh, width: 12, height: base - by - bh, fill: C.ink2 }, inner); E('rect', { x: cx + 108, y: by + bh, width: 12, height: base - by - bh, fill: C.ink2 }, inner); }
    const b = X.rect(cx - 170, by, 340, bh, { parent: inner, fill: later ? C.paper : C.card, stroke: o.color, sw: 3, r: 12, shadow: 5, dash: later ? '10 7' : null });
    X.icon(icon, cx - 118, by + bh / 2, 0.42, { parent: inner, fill: o.fill });
    X.text(cx - 70, by + 50, text, { parent: inner, size: 24, w: 600, lh: 31 });
    X.show(outer, k, { f, type: 'fade', len: 0.3 });
    X.each(() => {
      const p = clamp((X.t - X.at(k, f)) / 0.7);
      const s = p <= 0 ? 0.01 : (p >= 1 ? 1 : Math.max(0.01, easeBack(p)));
      inner.setAttribute('transform', `translate(0 ${base}) scale(1 ${s.toFixed(3)}) translate(0 ${-base})`);
    });
    return outer;
  };
  const upF = [0.3, 0.55, 0.8], loF = [0.3, 0.55, 0.82];
  const upX = [820, 1200, 1580];
  [['Vault survives\nrestarts', 'lock'], ['Tracer for leaked\nraw numbers', 'magnifier'], ['Quantum-safe\nconnections', 'atom']]
    .forEach(([s, ic], i) => sign(upX[i], 1, upF[i], s, ic, { up: true, color: C.teal, fill: C.tealL }));
  [['Fix the two\nnew mistakes', 'gear'], ['Transformer\nfor names', 'brain'], ['Test with a\nreal chatbot', 'chat']]
    .forEach(([s, ic], i) => sign(upX[i], 2, loF[i], s, ic, { up: false, color: C.plum, fill: C.plumL }));
  // later, further down the road
  const later = X.chip(1900, 620, 'Later', { size: 30, fill: C.ochreL, color: C.ochre, shadow: true });
  X.show(later, 3, { type: 'pop' });
  sign(2170, 3, 0.15, 'Tamil name\ndetection', 'person', { up: true, later: true, color: C.ochre, fill: C.ochreL });
  sign(2520, 3, 0.42, 'ID card photos,\nread properly', 'idcard', { up: false, later: true, color: C.ochre });
  sign(2870, 3, 0.72, 'Research\npaper', 'file', { up: true, later: true, color: C.ochre });

  // ---------- the two pairs walking their lanes ----------
  const walker = (shirt, skin, feet, k, xs, fs, ph, extra) => {
    const p = X.person(0, feet, Object.assign({ shirt, skin, s: 0.5, ph }, extra || {}));
    const w = X.wrap(p);
    X.show(w, k, { type: 'fade', len: 0.5 });
    X.each(t => {
      const f = X.L(k, 0, 1);
      let x = xs[0];
      for (let i = 0; i < fs.length - 1; i++) if (f >= fs[i]) x = lerp(xs[i], xs[i + 1], clamp((f - fs[i]) / (fs[i + 1] - fs[i])));
      const moving = f > fs[0] && f < fs[fs.length - 1];
      const hop = moving ? -Math.abs(Math.sin(t * 9 + ph)) * 5 : 0;
      p.setAttribute('transform', `translate(${x.toFixed(1)} ${hop.toFixed(1)})`);
      p.mood(X.t > X.at(k, 0.85) ? 'happy' : 'neutral');
    });
    return p;
  };
  const leadXs = (plants, end) => { const xs = [260], fs = [0.05]; plants.forEach((f, i) => { xs.push(upX[i] - 75); fs.push(f - 0.02); }); xs.push(end); fs.push(0.98); return [xs, fs]; };
  const [ux, uf] = leadXs(upF, 1760), [lx, lf] = leadXs(loF, 1760);
  const w1 = walker(C.green, C.skin[1], 605, 1, ux, uf, 0.3);
  const w2 = walker(C.red, C.skin[2], 605, 1, ux.map(x => x - 70), uf, 1.4);
  const w3 = walker(C.plum, C.skin[0], 755, 2, lx, lf, 0.8, { glasses: true });
  const w4 = walker(C.ink2, C.skin[3], 755, 2, lx.map(x => x - 70), lf, 2.1);
  // lead walker raises an arm as each sign is planted
  [[w1, 1, upF], [w3, 2, loF]].forEach(([w, k, fs]) => X.each(() => {
    let a = -8;
    fs.forEach(f => { const q = X.P(k, f - 0.03, 0, 0.3) * (1 - X.P(k, f + 0.05, 0, 0.4)); if (q > 0.001) a = lerp(-8, 140, q); });
    X.arms(w, 8, a);
  }));
  X.term(1, 'Vault', 'The locked store where Aran keeps the real\nnumbers and keys that sit behind the tokens.', { until: 1, outf: 0.45 });
  X.term(1, 'Quantum-safe', 'Locks that even a future quantum computer\ncould not break.', { f: 0.62, until: 2 });
  X.term(2, 'Transformer', 'The AI model behind modern chatbots: it reads\na whole sentence at once.', { f: 0.4, until: 2, outf: 0.74 });
  X.term(2, 'AI gateway', 'Aran\'s checkpoint that cleans what staff\ntype into AI chatbots before it leaves.', { f: 0.76, until: 3 });
  X.term(3, 'Research paper', 'A written report of the work, checked by other\nexperts and published for everyone to read.', { f: 0.7, until: 4 });

  // ---------- product: the box is assembled ----------
  const bank = X.g();
  X.icon('bank', 4470, 450, 2.0, { parent: bank });
  X.text(4470, 600, 'A bank\'s own servers', { parent: bank, size: 28, anchor: 'middle', w: 600, fill: C.ink2 });
  const srv = X.icon('server', 4700, 470, 0.7, { parent: bank });
  X.show(bank, 4, { f: 0.08, type: 'up' });
  const shield = X.icon('shield', 4600, 330, 0.55, { check: true, fill: C.greenL, color: C.green });
  X.show(shield, 5, { f: 0.16, type: 'pop' });
  X.bob(shield.mid, { amp: 5, per: 2.2 });

  const BX = 3950, BY = 600; // box centre
  const boxW = X.g(); const boxG = E('g', null, boxW);
  const flapL = E('path', { d: `M${BX - 120},${BY - 70} L${BX - 170},${BY - 120} L${BX - 60},${BY - 120} L${BX},${BY - 70} Z`, fill: C.ochreL, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, boxG);
  const flapR = E('path', { d: `M${BX},${BY - 70} L${BX + 60},${BY - 120} L${BX + 170},${BY - 120} L${BX + 120},${BY - 70} Z`, fill: C.ochreL, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, boxG);
  E('rect', { x: BX - 114, y: BY - 64, width: 240, height: 150, rx: 6, fill: C.shadow }, boxG);
  E('rect', { x: BX - 120, y: BY - 70, width: 240, height: 150, rx: 6, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, boxG);
  const lid = E('rect', { x: BX - 124, y: BY - 82, width: 248, height: 22, rx: 5, fill: C.ochre, stroke: C.ink, 'stroke-width': 4, opacity: 0 }, boxG);
  X.text(BX, BY + 6, 'Aran', { parent: boxG, size: 44, serif: true, w: 700, anchor: 'middle' });
  const slots = [0, 1, 2, 3].map(i => E('circle', { cx: BX - 51 + i * 34, cy: BY + 46, r: 10, fill: C.card, stroke: C.ink, 'stroke-width': 3 }, boxG));
  X.show(boxW, 4, { f: 0.05, type: 'pop' });
  const pieces = [['Gateway', 'shield', 0.52], ['Log cleaner', 'log', 0.64], ['AI gateway', 'chat', 0.76], ['Dashboard', 'laptop', 0.88]];
  const landT = [];
  pieces.forEach(([name, ic, f], i) => {
    const g = X.g();
    X.rect(-112, -36, 224, 72, { parent: g, fill: C.card, stroke: C.blue, sw: 3, r: 12, shadow: 4 });
    X.icon(ic, -76, 0, 0.36, { parent: g });
    X.text(-42, 9, name, { parent: g, size: 24, w: 600 });
    const y0 = 290 + i * 100;
    const t0 = X.at(4, f) + 0.5, t1 = t0 + 0.9;
    landT.push(t1);
    const w = X.wrap(g);
    X.show(w, 4, { f, type: 'fade', len: 0.35, out: 4, outf: f, outd: 1.35, outLen: 0.12 });
    X.travel(g, X.spline([[3600, y0], [3790, Math.min(y0, 420) - 40], [BX, BY - 80]]), 4, { t0, t1 });
  });
  X.each(t => {
    slots.forEach((c, i) => c.setAttribute('fill', t >= landT[i] ? C.blue : C.card));
    // flaps fold shut and the lid closes after the last piece lands
    const close = ease(clamp((t - landT[3] - 0.15) / 0.5));
    flapL.setAttribute('opacity', (1 - close).toFixed(2)); flapR.setAttribute('opacity', (1 - close).toFixed(2));
    lid.setAttribute('opacity', close.toFixed(2));
    // install: the box glides into the bank at the start of cue 5
    const ins = ease(clamp((t - X.at(5) - 0.2) / 1.2));
    let pop = 1;
    landT.forEach(lt => { const q = clamp((t - lt) / 0.4); if (q > 0 && q < 1) pop *= 1 + 0.08 * Math.sin(q * Math.PI); });
    const sc = lerp(1, 0.35, ins) * pop;
    const tx = lerp(BX, 4470, ins), ty = lerp(BY, 470, ins);
    boxG.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${sc.toFixed(3)}) translate(${-BX} ${-BY})`);
    boxG.setAttribute('opacity', (1 - clamp((t - X.at(5) - 1.2) / 0.4)).toFixed(2));
  });
  // a stream of the bank's data through the installed product
  X.term(4, 'Gateway', 'A checkpoint every message passes through,\nwhere Aran cleans it on the way.', { f: 0.5, until: 4, outf: 0.76 });
  X.term(4, 'Dashboard', 'A screen with charts showing what Aran\nhas found and protected.', { f: 0.86, until: 5 });

  // ---------- as a service ----------
  const svc = X.g();
  X.icon('cloud', 5000, 300, 1.5, { parent: svc });
  X.text(5000, 318, 'Aran', { parent: svc, size: 40, serif: true, w: 700, anchor: 'middle' });
  X.text(5000, 215, 'as a service', { parent: svc, size: 30, anchor: 'middle', fill: C.ink2, w: 600 });
  X.show(svc, 5, { f: 0.3, type: 'pop' });
  const small = [[4800, 640, 'bank', 'small bank'], [5000, 700, 'building', 'finance company'], [5200, 640, 'bank', 'small bank']];
  small.forEach(([x, y, ic, lab], i) => {
    const g = X.g();
    const ico = X.icon(ic, x, y, ic === 'bank' ? 0.6 : 0.5, { parent: g });
    X.text(x, y + 78, lab, { parent: g, size: 26, anchor: 'middle', fill: C.ink2, w: 600 });
    X.show(g, 5, { f: 0.42 + i * 0.1, type: 'up' });
    X.bob(ico.mid, { amp: 4, per: 2.5, ph: i });
    X.stream(X.spline([[x, y - 60], [lerp(x, 5000, 0.5), lerp(y - 60, 360, 0.5) + 10], [5000, 360]]), { n: 3, speed: 0.4, r: 7, color: C.teal, k0: 5, f0: 0.5 + i * 0.1 });
  });
  X.term(5, 'As a service', 'Instead of installing it, a small bank uses Aran\nover the internet, run by someone else.', { f: 0.2, until: 6 });

  // ---------- the timing is right ----------
  const hd = X.text(6040, 250, 'The timing is right', { size: 46, serif: true, w: 600, anchor: 'middle' });
  X.show(hd, 6, { type: 'down' });
  const cal = X.g();
  const CX = 5810;
  X.rect(CX - 160, 330, 320, 330, { parent: cal, fill: C.card, stroke: C.ink, sw: 4, r: 14, shadow: 6 });
  E('rect', { x: CX - 160, y: 330, width: 320, height: 80, rx: 14, fill: C.red }, cal);
  E('rect', { x: CX - 160, y: 380, width: 320, height: 30, fill: C.red }, cal);
  for (const dx of [-90, 90]) E('rect', { x: CX + dx - 8, y: 312, width: 16, height: 40, rx: 6, fill: C.ink }, cal);
  const page = E('g', null, cal);
  const mon = X.text(CX, 384, 'OCT 2026', { parent: cal, size: 34, w: 700, anchor: 'middle', fill: C.card });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) E('rect', { x: CX - 140 + c * 40, y: 428 + r * 44, width: 30, height: 32, rx: 5, fill: C.paper, stroke: C.line, 'stroke-width': 1.5 }, page);
  X.show(cal, 6, { f: 0.04, type: 'pop' });
  const months = ['OCT 2026', 'NOV 2026', 'DEC 2026', 'JAN 2027', 'FEB 2027', 'MAR 2027', 'APR 2027', 'MAY 2027'];
  X.each(() => {
    const p = X.L(6, 0.08, 0.42);
    const i = Math.min(7, Math.floor(p * 8));
    mon.set(months[i]);
    const fr = (p * 8) % 1;
    const flip = p >= 1 ? 1 : Math.abs(Math.cos(fr * Math.PI));
    page.setAttribute('transform', `translate(0 428) scale(1 ${Math.max(0.05, flip).toFixed(3)}) translate(0 -428)`);
  });
  const ring = X.rect(CX - 178, 316, 356, 110, { fill: 'none', stroke: C.ink, sw: 5, r: 20, dash: '14 8' });
  X.show(X.wrap(ring), 6, { f: 0.45, type: 'pop' });
  X.pulse(ring, CX, 372, 6, { f: 0.5, amt: 0.08, len: 1 });
  const dp = X.chip(CX, 712, 'DPDP rules begin', { size: 28, fill: C.redL, color: C.red });
  X.show(dp, 6, { f: 0.42, type: 'up' });
  // quantum-safe
  const qs = X.g();
  const atom = X.icon('atom', 6270, 470, 1.6, { parent: qs, color: C.ink3 });
  X.spin(atom.mid, 6270, 470, { speed: 25 });
  const lk = X.icon('lock', 6270, 490, 1.0, { parent: qs, fill: C.tealL });
  X.text(6270, 640, 'Banking roadmap:', { parent: qs, size: 28, anchor: 'middle', fill: C.ink2 });
  X.text(6270, 682, 'become quantum-safe', { parent: qs, size: 30, anchor: 'middle', w: 700, fill: C.teal });
  X.show(qs, 6, { f: 0.6, type: 'up' });
  X.term(6, 'DPDP rules', 'The rules under India\'s data protection law\n(the Digital Personal Data Protection Act).', { f: 0.15, until: 6, outf: 0.55 });
  X.term(6, 'Quantum-safe', 'Locks that even a future quantum computer\ncould not break.', { f: 0.62, until: 7 });

  X.recap(7, ['Fix the weak spots', 'Make it faster', 'Test it in the real world', 'Turn it into a product banks can install']);
});
