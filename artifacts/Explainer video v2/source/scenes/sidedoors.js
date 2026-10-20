// The same side doors around the world: a log with passwords, readable password stores, code pasted into a chatbot.
scene('sidedoors', X => {
  const OX = i => 2000 * i;
  const cards = [
    { k: 1, k2: 2, year: '2018', who: 'Twitter', role: 'a bug wrote passwords\ninto an internal log', lit: [1, 0.8] },
    { k: 3, k2: 4, year: '2019', who: 'Facebook', role: 'passwords readable inside\nits own systems', lit: [4, 0.45] },
    { k: 5, k2: 6, year: '2023', who: 'Samsung', role: 'engineers asked a chatbot\nfor help with secret code', lit: [6, 0.4] },
    { k: 7, k2: 7, year: 'Today', who: 'Banks', role: 'staff paste customer details\ninto chatbots', lit: [7, 0.7] }
  ];
  const keys = [{ x: 960, y: 560, s: 1.05 }];
  cards.forEach((c, i) => {
    keys.push({ k: c.k, x: OX(i + 1) + 960, y: 560, s: 1, len: 1.9 });
    if (c.k2 !== c.k) keys.push({ k: c.k2, f: 0.05, x: OX(i + 1) + 990, y: 556, s: 1.05 });
  });
  keys.push({ k: 8, x: OX(4) + 960, y: 560, s: 0.92 });
  X.cam(keys);

  // ---------- timeline (fixed) ----------
  const fixed = E('g', null, X.root.parentNode);
  E('rect', { x: 0, y: 112, width: 1920, height: 126, fill: C.bg, opacity: 0.96 }, fixed);
  const tl = X.g(fixed);
  const TX = i => 380 + i * 380;
  E('line', { x1: TX(0) - 80, y1: 172, x2: TX(3) + 80, y2: 172, stroke: C.line, 'stroke-width': 6, 'stroke-linecap': 'round' }, tl);
  const prog = E('line', { x1: TX(0) - 80, y1: 172, x2: TX(0) - 80, y2: 172, stroke: C.ochre, 'stroke-width': 6, 'stroke-linecap': 'round' }, tl);
  const tdots = cards.map((c, i) => {
    const d = E('circle', { cx: TX(i), cy: 172, r: 13, fill: C.card, stroke: C.ink3, 'stroke-width': 4 }, tl);
    const t = E('text', { x: TX(i), y: 220, 'font-size': 26, 'font-weight': 700, fill: C.ink3, 'text-anchor': 'middle', 'font-family': F.sans }, tl);
    t.textContent = c.year;
    return [d, t];
  });
  X.show(tl, 0, { f: 0.1, type: 'fade', len: 1 });
  X.each(t => {
    let reach = TX(0) - 80;
    cards.forEach((c, i) => {
      const p = X.P(c.k, 0.02, 0, 0.8);
      if (p > 0) reach = lerp(i === 0 ? TX(0) - 80 : TX(i - 1), TX(i), p);
      const on = p > 0.5, cur = on && (i === cards.length - 1 || t < X.at(cards[i + 1].k));
      tdots[i][0].setAttribute('fill', on ? (cur ? C.ochre : C.ochreL) : C.card);
      tdots[i][0].setAttribute('stroke', on ? C.ochre : C.ink3);
      tdots[i][0].setAttribute('r', cur ? 16 : 13);
      tdots[i][1].setAttribute('fill', on ? C.ink : C.ink3);
    });
    prog.setAttribute('x2', reach.toFixed(1));
  });

  // ---------- helpers ----------
  const door = (x, y, lit, s = 1, label = true) => {
    const g = X.g();
    const gi = E('g', { transform: `translate(${x} ${y}) scale(${s})` }, g);
    const rays = E('g', { opacity: 0 }, gi);
    for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; E('line', { x1: Math.cos(an) * 66, y1: Math.sin(an) * 72, x2: Math.cos(an) * 86, y2: Math.sin(an) * 94, stroke: C.ochre, 'stroke-width': 5, 'stroke-linecap': 'round' }, rays); }
    const frame = E('rect', { x: -38, y: -58, width: 76, height: 116, rx: 6, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, gi);
    const gap = E('rect', { x: -30, y: -50, width: 60, height: 100, fill: C.ink3 }, gi);
    E('path', { d: 'M-30,-50 L6,-42 L6,58 L-30,50 Z', fill: C.card, stroke: C.ink, 'stroke-width': 3 }, gi);
    E('circle', { cx: -2, cy: 6, r: 4, fill: C.ink }, gi);
    let lab = null;
    if (label) { lab = E('text', { x: 98, y: 10, 'font-size': 28, 'font-weight': 600, fill: C.ink3, 'font-family': F.sans }, gi); lab.textContent = 'side door'; }
    X.each(t => {
      const p = clamp((t - X.at(lit[0], lit[1])) / 0.5);
      gap.setAttribute('fill', p > 0 ? C.ochre : C.ink3);
      frame.setAttribute('fill', p > 0 ? C.ochreL : C.sand);
      if (lab) lab.setAttribute('fill', p > 0 ? C.ochre : C.ink3);
      rays.setAttribute('opacity', (p * (0.6 + 0.4 * Math.sin(t * 6))).toFixed(2));
    });
    return g;
  };
  const win = (x, y, w, h, title, color, parent) => {
    const g = X.g(parent);
    X.rect(x, y, w, h, { parent: g, fill: C.paper, stroke: C.ink, sw: 4, r: 16, shadow: true });
    E('rect', { x, y, width: w, height: 54, rx: 16, fill: color }, g);
    E('rect', { x, y: y + 34, width: w, height: 20, fill: color }, g);
    X.text(x + 24, y + 37, title, { parent: g, size: 24, fill: C.card, w: 700 });
    return g;
  };
  const monoText = (x, y, str, o = {}) => { const t = X.text(x, y, str, Object.assign({ size: 22, mono: true, w: 500 }, o)); t.t.style.whiteSpace = 'pre'; return t; };

  // ---------- intro ----------
  const it = X.text(960, 380, 'The same side doors, worldwide', { size: 68, anchor: 'middle', serif: true, w: 600 });
  X.show(it, 0, { f: 0.05, type: 'up' });
  const gl = X.g();
  E('circle', { cx: 960, cy: 650, r: 150, fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, gl);
  E('ellipse', { cx: 960, cy: 650, rx: 66, ry: 150, fill: 'none', stroke: C.ink, 'stroke-width': 4 }, gl);
  E('path', { d: 'M810,650 L1110,650 M826,580 L1094,580 M826,720 L1094,720', stroke: C.ink, 'stroke-width': 4 }, gl);
  X.show(gl, 0, { f: 0.1, type: 'pop' });
  [[600, 560], [1320, 560], [640, 780], [1280, 780]].forEach(([x, y], i) => {
    const b = X.icon('building', x, y, 0.7, { fill: [C.ochreL, C.plumL, C.tealL, C.greenL][i] });
    X.show(b, 0, { f: 0.25 + i * 0.08, type: 'up' });
    const d = door(x + (x < 960 ? -110 : 110), y + 10, [0, 0.55 + i * 0.08], 0.55, false);
    X.show(d, 0, { f: 0.3 + i * 0.08, type: 'pop' });
  });

  // ---------- card frames ----------
  const L = cards.map((c, i) => {
    const ox = OX(i + 1);
    const g = X.g();
    X.rect(ox + 100, 262, 1720, 642, { parent: g, fill: C.card, stroke: C.line, sw: 2, r: 22, shadow: 8 });
    E('line', { x1: ox + 600, y1: 296, x2: ox + 600, y2: 870, stroke: C.line, 'stroke-width': 2 }, g);
    X.show(g, c.k, { type: 'fade', len: 0.6 });
    const yr = X.text(ox + 150, 400, c.year, { size: 124, serif: true, fill: C.ochre, w: 700 });
    X.show(yr, c.k, { f: 0.02, type: 'up' });
    const who = X.text(ox + 152, 460, c.who, { size: 36, serif: true, w: 600 });
    X.show(who, c.k, { f: 0.12, type: 'up' });
    const role = X.text(ox + 152, 502, c.role, { size: 24, fill: C.ink2, lh: 31 });
    X.show(role, c.k, { f: 0.2, type: 'up' });
    const dr = door(ox + 196, 805, c.lit);
    X.show(dr, c.k, { f: 0.3, type: 'fade' });
    return { ox };
  });
  const stat = (i, k, f0, to, cap, o = {}) => {
    const ox = L[i].ox;
    const s = X.text(ox + 150, 650, '', { size: o.size || 58, serif: true, w: 700, fill: o.color || C.ink });
    if (typeof to === 'number') X.count(s, 0, to, k, { f0, f1: f0 + 0.25, fmt: v => Math.round(v), pre: o.pre || '', post: o.post || ' million' });
    else s.set(to);
    X.show(s, k, { f: f0, type: 'up' });
    const c = X.text(ox + 152, 690, cap, { size: 24, fill: C.ink2, lh: 30 });
    X.show(c, k, { f: f0 + 0.05, type: 'up' });
  };

  // ---------- 1. 2018: passwords in a log ----------
  {
    const ox = L[0].ox, k = 1;
    X.term(k, 'Plain text', 'Text stored exactly as typed, so anyone who\nopens the file can read it. Not scrambled.', { f: 0.45, until: 3 });
    const user = X.person(ox + 720, 880, { shirt: C.blue, skin: C.skin[1], s: 0.8 });
    X.show(user, k, { f: 0.1, type: 'up' });
    X.each(() => X.arms(user, 8, lerp(-8, 60, X.P(k, 0.12)) + 6 * Math.sin(X.t * 14) * (X.t > X.at(k, 0.12) && X.t < X.at(k, 0.35) ? 1 : 0)));
    const pw = X.g();
    X.rect(ox + 660, 330, 380, 70, { parent: pw, fill: C.card, stroke: C.ink, sw: 3, r: 10 });
    X.text(ox + 680, 375, 'Password', { parent: pw, size: 24, fill: C.ink3 });
    const dots = X.text(ox + 820, 378, '', { parent: pw, size: 30, mono: true, w: 700 });
    X.type(dots, '••••••••', k, { f0: 0.12, f1: 0.3 });
    X.show(pw, k, { f: 0.08, type: 'down' });
    // intended path: into the protection box
    const prot = X.g();
    X.rect(ox + 1300, 310, 330, 110, { parent: prot, fill: C.tealL, stroke: C.teal, sw: 4, r: 14 });
    X.icon('lock', ox + 1350, 368, 0.5, { parent: prot, fill: C.tealL });
    X.text(ox + 1395, 362, 'protection', { parent: prot, size: 26, w: 700, fill: C.teal });
    X.text(ox + 1395, 394, '(scrambled)', { parent: prot, size: 22, fill: C.ink2 });
    X.show(prot, k, { f: 0.2, type: 'pop' });
    const a1 = X.arrow(ox + 1050, 365, ox + 1290, 365, { color: C.teal, sw: 5 });
    X.show(a1, k, { f: 0.3, type: 'draw' });
    // but a bug writes it into the log first
    const lg = X.g();
    X.rect(ox + 1000, 520, 760, 290, { parent: lg, fill: C.paper, stroke: C.ink, sw: 4, r: 14, shadow: true });
    E('rect', { x: ox + 1000, y: 520, width: 760, height: 46, rx: 14, fill: C.sand }, lg);
    X.text(ox + 1380, 552, 'internal log', { parent: lg, size: 24, anchor: 'middle', mono: true, fill: C.ink2 });
    monoText(ox + 1025, 610, '09:14:02 INFO  login request', { parent: lg, fill: C.ink2 });
    monoText(ox + 1025, 700, '09:14:03 INFO  login ok', { parent: lg, fill: C.ink2 });
    monoText(ox + 1025, 745, '09:14:05 INFO  page loaded', { parent: lg, fill: C.ink2 });
    X.show(lg, k, { f: 0.35, type: 'up' });
    const hl = X.rect(ox + 1015, 627, 730, 42, { fill: C.redL, stroke: C.red, sw: 3, r: 8 });
    X.show(hl, k, { f: 0.62, type: 'grow' });
    const pline = X.g(); monoText(ox + 1025, 656, '09:14:02 DEBUG password=████████', { parent: pline, fill: C.red });
    X.show(pline, k, { f: 0.55, type: 'fade' });
    const ptx = X.chip(ox + 1580, 648, 'plain text', { size: 22, color: C.red, fill: C.card, stroke: C.red });
    X.show(ptx, k, { f: 0.7, type: 'pop' });
    const a2 = X.arrow(ox + 900, 405, ox + 1000, 600, { color: C.red, sw: 5, bend: 0.2 });
    X.show(a2, k, { f: 0.5, type: 'draw' });
    const bug = X.g(); const bi = E('g', null, bug);
    E('ellipse', { cx: 0, cy: 0, rx: 18, ry: 13, fill: C.red, stroke: C.ink, 'stroke-width': 3 }, bi);
    E('circle', { cx: 18, cy: 0, r: 7, fill: C.ink }, bi);
    E('path', { d: 'M-8,-12 L-12,-22 M4,-12 L6,-22 M-8,12 L-12,22 M4,12 L6,22', stroke: C.ink, 'stroke-width': 3, fill: 'none' }, bi);
    bug.setAttribute('transform', `translate(${ox + 905} 500)`);
    X.show(X.wrap(bug), k, { f: 0.45, type: 'pop' });
    X.bob(bi, { amp: 4, per: 0.8 });
    const bl = X.text(ox + 870, 545, 'a bug', { size: 24, anchor: 'end', fill: C.red, w: 700 });
    X.show(bl, k, { f: 0.5, type: 'fade' });
    // 330 million users asked to think about a new password
    stat(0, 2, 0.1, 330, 'users asked to think about\nchanging their passwords');
    for (let i = 0; i < 18; i++) {
      const p = X.icon('person', ox + 660 + (i % 9) * 38, 820 + Math.floor(i / 9) * 46 - 40, 0.22, { fill: [C.blueL, C.ochreL, C.tealL][i % 3] });
      X.show(p, 2, { f: 0.1 + i * 0.03, type: 'pop', len: 0.4 });
    }
    const nt = X.g();
    X.rect(ox + 640, 430, 400, 64, { parent: nt, fill: C.ochreL, stroke: C.ochre, r: 14, shadow: true });
    X.text(ox + 840, 470, 'Please change your password', { parent: nt, size: 23, anchor: 'middle', w: 600 });
    X.show(X.wrap(nt), 2, { f: 0.4, type: 'down' });
    X.shake(nt, 2, { f: 0.6, amp: 6 });
    X.each(() => { if (X.t > X.at(2)) user.style.display = 'none'; else user.style.display = ''; });
  }

  // ---------- 2. 2019: readable passwords, 2024 fine ----------
  {
    const ox = L[1].ox, k = 3;
    X.term(k, 'Internal systems', 'The computers a company uses only inside itself,\nnot meant for the public to see.', { f: 0.3, until: 4 });
    const pic = X.g();
    X.icon('server', ox + 740, 400, 1.0, { parent: pic });
    X.icon('server', ox + 740, 560, 1.0, { parent: pic });
    X.text(ox + 740, 660, 'internal systems', { parent: pic, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(pic, k, { f: 0.05, type: 'fade' });
    const tb = win(ox + 900, 300, 560, 380, 'stored passwords', C.blue);
    X.show(tb, k, { f: 0.15, type: 'pop' });
    for (let i = 0; i < 5; i++) {
      const row = X.g();
      monoText(ox + 925, 400 + i * 56, 'user ████   pw: ██████', { parent: row, size: 24, fill: C.ink });
      X.show(row, k, { f: 0.25 + i * 0.06, type: 'left' });
    }
    const eye = X.g();
    E('path', { d: `M${ox + 1500},470 Q${ox + 1560},420 ${ox + 1620},470 Q${ox + 1560},520 ${ox + 1500},470 Z`, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, eye);
    E('circle', { cx: ox + 1560, cy: 470, r: 14, fill: C.ink }, eye);
    X.text(ox + 1560, 545, 'readable', { parent: eye, size: 24, anchor: 'middle', fill: C.red, w: 700 });
    X.show(eye, k, { f: 0.55, type: 'pop' });
    stat(1, k, 0.35, 'Hundreds of millions', 'passwords in plain text', { size: 34 });
    const fine = X.g();
    X.rect(ox + 1080, 720, 640, 140, { parent: fine, fill: C.ochreL, stroke: C.ochre, sw: 4, r: 16 });
    X.icon('scale', ox + 1160, 790, 0.7, { parent: fine });
    X.text(ox + 1240, 770, '2024: Meta fined', { parent: fine, size: 28, w: 600 });
    const amt = X.text(ox + 1240, 830, '', { parent: fine, size: 44, serif: true, w: 700, fill: C.ochre });
    X.count(amt, 0, 91, k, { f0: 0.82, f1: 0.97, fmt: v => Math.round(v), pre: '€', post: ' million' });
    X.show(fine, k, { f: 0.78, type: 'up' });
    // no hacker needed
    const hk = X.g();
    X.person(ox + 760, 890, { parent: hk, hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.7 });
    X.mark(ox + 760, 790, false, { parent: hk, s: 56 });
    X.show(hk, 4, { f: 0.05, type: 'pop', out: 5 });
    const nh = X.chip(ox + 900, 712, 'no hacker needed', { size: 28, color: C.red, fill: C.redL, stroke: C.red });
    X.show(nh, 4, { f: 0.15, type: 'down' });
    const ul = X.icon('unlock', ox + 1430, 340, 0.4);
    X.show(ul, 4, { f: 0.4, type: 'pop' });
    X.pulse(ul.mid, ox + 1430, 340, 4, { f: 0.5, amt: 0.3 });
    const nb = X.text(ox + 1600, 615, 'nobody thought\nto protect it', { size: 26, anchor: 'middle', fill: C.ink2, italic: true });
    X.show(nb, 4, { f: 0.55, type: 'up', out: 5 });
  }

  // ---------- 3. 2023: secret code pasted into a chatbot ----------
  {
    const ox = L[2].ox, k = 5;
    X.term(k, 'Source code', 'The written instructions that make up a program.\nCompanies keep it secret.', { f: 0.3, until: 6 });
    const eng = X.person(ox + 720, 880, { shirt: C.teal, skin: C.skin[0], glasses: true, s: 0.8 });
    X.show(eng, k, { f: 0.05, type: 'up' });
    X.each(() => X.arms(eng, 8, lerp(-8, 55, X.P(k, 0.1)) + 6 * Math.sin(X.t * 13) * (X.on(k) && X.t < X.at(k, 0.6) ? 1 : 0)));
    const cw = win(ox + 640, 300, 480, 300, 'secret code', C.ink2);
    ['chip_tune(x):', '  key = ████████', '  mix(x, key)', '  return ██████'].forEach((ln, i) => monoText(ox + 665, 400 + i * 50, ln, { parent: cw, fill: i % 2 ? C.plum : C.ink }));
    X.show(cw, k, { f: 0.1, type: 'pop' });
    const ch = win(ox + 1240, 300, 520, 360, 'ChatGPT', C.green);
    X.show(ch, k, { f: 0.2, type: 'pop' });
    const ub = X.g();
    X.rect(ox + 1300, 380, 430, 150, { parent: ub, fill: C.blueL, stroke: C.blue, r: 14 });
    X.text(ox + 1320, 418, 'Please fix this:', { parent: ub, size: 22, fill: C.ink2 });
    ['chip_tune(x):', '  key = ████████', '  mix(x, key)'].forEach((ln, i) => monoText(ox + 1320, 452 + i * 30, ln, { parent: ub, size: 20 }));
    X.show(ub, k, { f: 0.62, type: 'up' });
    const pg = X.g(); const pi = E('g', null, pg);
    E('rect', { x: -60, y: -40, width: 120, height: 80, rx: 8, fill: C.paper, stroke: C.ink2, 'stroke-width': 3 }, pi);
    for (let i = 0; i < 3; i++) E('rect', { x: -44, y: -24 + i * 18, width: 88 - i * 16, height: 8, rx: 4, fill: C.plum }, pi);
    X.show(X.wrap(pg), k, { f: 0.38, type: 'fade', len: 0.2, out: k, outf: 0.62, outLen: 0.2 });
    X.travel(pg, spline([[ox + 880, 470], [ox + 1150, 380], [ox + 1450, 440]]), k, { f0: 0.4, f1: 0.62 });
    const pl = X.chip(ox + 1180, 640, 'pasted', { size: 24, color: C.ink2 });
    X.show(pl, k, { f: 0.45, type: 'pop', out: 6 });
    stat(2, k, 0.7, 'Secret code', 'given to a chatbot', { size: 50, color: C.red });
    // to an outside company, then a ban
    const cl = X.g();
    X.icon('cloud', ox + 1500, 790, 1.1, { parent: cl, fill: C.plumL });
    X.text(ox + 1500, 880, 'outside AI company', { parent: cl, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(cl, 6, { f: 0.05, type: 'pop' });
    X.stream(spline([[ox + 1500, 660], [ox + 1520, 710], [ox + 1500, 760]]), { n: 3, speed: 0.5, k0: 6, f0: 0.1, make: g => { const q = E('g', null, g); E('rect', { x: -14, y: -10, width: 28, height: 20, rx: 3, fill: C.paper, stroke: C.plum, 'stroke-width': 3 }, q); return q; } });
    const ban = X.g();
    X.icon('laptop', ox + 1000, 760, 0.9, { parent: ban });
    X.icon('chat', ox + 1000, 740, 0.32, { parent: ban, fill: C.plumL });
    E('circle', { cx: ox + 1000, cy: 745, r: 62, fill: 'none', stroke: C.red, 'stroke-width': 9 }, ban);
    E('line', { x1: ox + 956, y1: 789, x2: ox + 1044, y2: 701, stroke: C.red, 'stroke-width': 9 }, ban);
    X.text(ox + 1000, 860, 'AI tools banned on work devices', { parent: ban, size: 24, anchor: 'middle', fill: C.red, w: 700 });
    X.show(X.wrap(ban), 6, { f: 0.55, type: 'pop' });
  }

  // ---------- 4. today: banks ----------
  {
    const ox = L[3].ox, k = 7;
    const clerk = X.person(ox + 700, 880, { shirt: C.plum, skin: C.skin[2], long: true, s: 0.8 });
    X.show(clerk, k, { f: 0.05, type: 'up' });
    X.each(() => X.arms(clerk, 8, lerp(-8, 55, X.P(k, 0.1)) + 6 * Math.sin(X.t * 13) * (X.on(k) && X.t < X.at(k, 0.5) ? 1 : 0)));
    const note = X.g();
    X.rect(ox + 640, 310, 470, 230, { parent: note, fill: C.card, stroke: C.ink, sw: 3, r: 12, shadow: true });
    X.text(ox + 665, 352, 'customer details', { parent: note, size: 24, fill: C.ink3 });
    ['Ravi Kumar', '2345 6789 0124', '98765 43210'].forEach((v, i) => monoText(ox + 665, 400 + i * 46, v, { parent: note, size: 26, fill: C.red, w: 600 }));
    X.show(note, k, { f: 0.08, type: 'pop' });
    const ch = win(ox + 1240, 300, 520, 330, 'AI chatbot', C.teal);
    X.show(ch, k, { f: 0.15, type: 'pop' });
    const ub = X.g();
    X.rect(ox + 1300, 380, 430, 150, { parent: ub, fill: C.redL, stroke: C.red, r: 14 });
    X.text(ox + 1320, 418, 'Write a loan letter for:', { parent: ub, size: 22, fill: C.ink2 });
    ['Ravi Kumar, 2345 6789 0124', 'mobile 98765 43210'].forEach((v, i) => monoText(ox + 1320, 456 + i * 32, v, { parent: ub, size: 20, fill: C.red }));
    X.show(ub, k, { f: 0.45, type: 'up' });
    const pg = X.g(); const pi = E('g', null, pg);
    E('rect', { x: -60, y: -40, width: 120, height: 80, rx: 8, fill: C.paper, stroke: C.red, 'stroke-width': 3 }, pi);
    for (let i = 0; i < 3; i++) E('rect', { x: -44, y: -24 + i * 18, width: 88 - i * 16, height: 8, rx: 4, fill: C.red }, pi);
    X.show(X.wrap(pg), k, { f: 0.22, type: 'fade', len: 0.2, out: k, outf: 0.45, outLen: 0.2 });
    X.travel(pg, spline([[ox + 900, 450], [ox + 1150, 370], [ox + 1450, 440]]), k, { f0: 0.24, f1: 0.45 });
    const cl = X.g();
    X.icon('cloud', ox + 1500, 790, 1.1, { parent: cl, fill: C.plumL });
    X.text(ox + 1500, 880, 'outside AI company', { parent: cl, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(cl, k, { f: 0.5, type: 'pop' });
    X.stream(spline([[ox + 1500, 640], [ox + 1520, 700], [ox + 1500, 750]]), { n: 3, speed: 0.5, r: 8, color: C.red, k0: k, f0: 0.55 });
    const al = X.icon('alert', ox + 1080, 760, 0.7);
    X.show(al, k, { f: 0.6, type: 'pop' });
    X.pulse(al.mid, ox + 1080, 760, k, { f: 0.7, amt: 0.25 });
    stat(3, k, 0.5, 'Same risk', 'customer data leaves the bank', { size: 50, color: C.red });
  }

  X.recap(8, ['Logs are side doors', 'Internal systems are side doors', 'AI chatbots are side doors', 'Even at the world\'s biggest companies']);
});
