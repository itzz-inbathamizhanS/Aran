// The bank's own lists: customers kept only as keyed fingerprints (HMAC) in a cuckoo filter,
// and OTPs remembered together with the trace number of their request.
scene('registry', X => {
  const D = window.DATA;
  X.cam([{ x: 960, y: 500, s: 1.06 }, { k: 1, x: 960, y: 540, s: 1 }, { k: 2, x: 1000, y: 540, s: 1.02 },
    { k: 3, x: 960, y: 520, s: 1 }, { k: 5, x: 960, y: 500, s: 1.05 }, { k: 6, x: 960, y: 560, s: 1 },
    { k: 7, x: 960, y: 520, s: 1.05 }, { k: 8, x: 960, y: 540, s: 1 }, { k: 9, x: 960, y: 520, s: 1 }]);
  const masked = '•••• •••• ••••';
  const people = [['Ravi Kumar', '2345 6789 0124'], ['Asha', masked], ['Vel', masked]];

  // ---------- Stage A: the customer list (cues 0-2) ----------
  const A = X.g();
  X.show(A, 0, { type: 'fade', out: 3, outLen: 0.6 });
  const wall = X.g(A);
  for (let r = 0; r < 12; r++) for (let c = 0; c < 9; c++) {
    const x = 230 + c * 74 + (r % 2 ? 37 : 0), y = 170 + r * 58;
    if (x > 860) continue;
    E('rect', { x, y, width: 68, height: 52, rx: 4, fill: C.redL, stroke: C.red, 'stroke-width': 1.5, opacity: 0.6 }, wall);
  }
  X.text(560, 905, 'inside the firewall', { parent: wall, size: 24, anchor: 'middle', fill: C.red, w: 600 });
  X.show(wall, 2, { type: 'fade' });
  const list = X.g(A);
  X.rect(300, 220, 520, 600, { parent: list, fill: C.card, r: 16, shadow: true });
  E('rect', { x: 300, y: 220, width: 520, height: 64, rx: 16, fill: C.blueL }, list);
  E('rect', { x: 300, y: 260, width: 520, height: 24, fill: C.blueL }, list);
  X.icon('bank', 345, 252, 0.3, { parent: list });
  X.text(380, 262, "The bank's customer list", { parent: list, size: 26, w: 700, serif: true });
  const rowHL = [];
  people.forEach(([n, v], i) => {
    const y = 310 + i * 76;
    rowHL.push(X.rect(320, y, 480, 64, { parent: list, fill: C.paper, r: 10 }));
    X.text(340, y + 41, n, { parent: list, size: 24, w: 600 });
    X.text(780, y + 41, v, { parent: list, size: 24, mono: true, anchor: 'end', w: 600, fill: i ? C.ink3 : C.ink });
  });
  for (let i = 0; i < 4; i++) {
    const y = 538 + i * 66;
    E('rect', { x: 320, y, width: 480, height: 52, rx: 10, fill: C.paper }, list);
    E('rect', { x: 340, y: y + 18, width: 130, height: 16, rx: 8, fill: C.sand }, list);
    E('rect', { x: 600, y: y + 18, width: 180, height: 16, rx: 8, fill: C.sand }, list);
  }
  X.show(list, 0, { type: 'up' });
  // strongest clue + big weight
  const sc = X.g(A);
  X.rect(1040, 260, 640, 130, { parent: sc, fill: C.card, stroke: C.ochre, sw: 4, r: 14, shadow: true });
  X.text(1070, 312, 'Strongest clue', { parent: sc, size: 24, w: 700, fill: C.ochre });
  X.text(1070, 356, "Is it on the bank's own list?", { parent: sc, size: 30, w: 600 });
  X.show(sc, 0, { f: 0.35, type: 'left' });
  const wt = X.g(A);
  E('path', { d: 'M1290,480 L1430,480 L1470,600 L1250,600 Z', fill: C.ochre, stroke: C.ink, 'stroke-width': 4 }, wt);
  E('rect', { x: 1335, y: 450, width: 50, height: 36, rx: 10, fill: 'none', stroke: C.ink, 'stroke-width': 6 }, wt);
  X.text(1360, 570, 'heavy', { parent: wt, size: 30, anchor: 'middle', w: 700, fill: C.card });
  const wtW = X.wrap(wt);
  X.show(wtW, 0, { f: 0.55, type: 'down', dist: 120, out: 1 });
  // cue 1: a number from a log line is looked up and matches Ravi
  const look = X.g(A);
  X.chip(0, 0, '2345 6789 0124', { size: 28, mono: true, color: C.ink, fill: C.ochreL, stroke: C.ochre, parent: look });
  X.show(look, 1, { f: 0.05, type: 'fade', len: 0.3, out: 2 });
  X.travel(look, spline([[1360, 500], [1100, 420], [900, 350], [700, 352]]), 1, { f0: 0.05, f1: 0.45 });
  const match = X.g(A);
  X.mark(860, 352, true, { parent: match, s: 26 });
  X.show(match, 1, { f: 0.45, type: 'pop', out: 2 });
  const real = X.g(A);
  X.rect(1060, 470, 560, 110, { parent: real, fill: C.greenL, stroke: C.green, sw: 3, r: 16 });
  X.text(1340, 518, 'one of our own customers:', { parent: real, size: 26, anchor: 'middle', w: 500 });
  X.text(1340, 558, 'almost certainly real', { parent: real, size: 30, anchor: 'middle', w: 700, fill: C.green });
  X.show(real, 1, { f: 0.55, type: 'pop', out: 2 });
  X.each(() => {
    const m = X.t > X.at(1, 0.45) && X.t < X.at(2);
    rowHL[0].r.setAttribute('fill', m ? C.greenL : C.paper);
    rowHL[0].r.setAttribute('stroke', m ? C.green : C.line);
  });
  // cue 2: the danger
  const thief = X.person(1240, 880, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.95 });
  A.appendChild(thief);
  X.show(X.wrap(thief), 2, { f: 0.2, type: 'right' });
  X.each(() => { if (X.t > X.at(2)) { X.arms(thief, 75 + 10 * Math.sin(X.t * 4), 8); thief.mood('happy'); } });
  for (let i = 0; i < 3; i++) {
    const pg = X.g(A);
    X.rect(-40, -50, 80, 100, { parent: pg, fill: C.card, stroke: C.red, sw: 3, r: 6 });
    for (let j = 0; j < 3; j++) E('line', { x1: -26, y1: -24 + j * 22, x2: 26, y2: -24 + j * 22, stroke: C.red, 'stroke-width': 4, opacity: 0.6 }, pg);
    X.show(pg, 2, { f: 0.4 + i * 0.1, type: 'fade', len: 0.2 });
    X.travel(pg, spline([[700, 500 + i * 40], [960, 420 + i * 30], [1010 + i * 55, 540 + i * 45]]), 2, { f0: 0.4 + i * 0.1, f1: 0.75 + i * 0.07, rotate: false });
  }
  const leakT = X.chip(1480, 450, 'a plain list could leak too', { size: 28, color: C.red, fill: C.redL, parent: A });
  X.show(leakT, 2, { f: 0.5, type: 'pop' });
  X.term(2, 'Firewall', 'A guard between the bank and the outside\nworld that checks what goes in and out.', { until: 3 });

  // ---------- Stage B: fingerprints with a hash, then HMAC (cues 3-4) ----------
  const B = X.g();
  X.show(B, 3, { type: 'fade', out: 5, outLen: 0.6 });
  const mach = X.g(B);
  X.rect(780, 330, 320, 220, { parent: mach, fill: C.sand, r: 24, shadow: true });
  // a fingerprint drawing
  const fp = E('g', null, mach);
  for (let i = 0; i < 5; i++) E('path', { d: `M${940 - 12 - i * 9},${430 + 20} Q${940 - 12 - i * 9},${430 - 30 - i * 8} 940,${430 - 30 - i * 8} Q${940 + 12 + i * 9},${430 - 30 - i * 8} ${940 + 12 + i * 9},${430 + 20}`, fill: 'none', stroke: C.ink2, 'stroke-width': 4, 'stroke-linecap': 'round' }, fp);
  const machLab = X.text(940, 520, 'hash', { parent: mach, size: 32, anchor: 'middle', serif: true, w: 700 });
  X.show(X.wrap(mach), 3, { type: 'pop' });
  const ins = people.map(([n, v], i) => {
    const y = 320 + i * 110;
    const g = X.g(B);
    X.rect(170, y, 440, 80, { parent: g, fill: C.card, r: 12, shadow: true });
    X.text(195, y + 50, n, { parent: g, size: 24, w: 600 });
    X.text(590, y + 50, v, { parent: g, size: 24, mono: true, anchor: 'end', w: 600, fill: i ? C.ink3 : C.ink });
    X.show(g, 3, { f: 0.05 + i * 0.08, type: 'left' });
    const a = X.arrow(620, y + 40, 770, 440, { parent: B, sw: 3, color: C.line });
    X.show(a, 3, { f: 0.25 + i * 0.05, type: 'draw' });
    return y;
  });
  const r6 = rng(31);
  const hex = () => { let s = ''; for (let i = 0; i < 16; i++) s += '0123456789abcdef'[Math.floor(r6() * 16)]; return s; };
  const plainFP = [D.h1, hex(), hex()], keyFP = [D.hm, hex(), hex()];
  const outs = ins.map((y, i) => {
    const g = X.g(B);
    X.rect(1230, y + 4, 420, 72, { parent: g, fill: C.tealL, stroke: C.teal, r: 12 });
    const t = X.text(1440, y + 51, '', { parent: g, size: 28, mono: true, anchor: 'middle', w: 600, fill: C.teal });
    X.show(g, 3, { f: 0.45 + i * 0.1, type: 'left' });
    const a = X.arrow(1110, 440, 1220, y + 40, { parent: B, sw: 3, color: C.teal });
    X.show(a, 3, { f: 0.4 + i * 0.1, type: 'draw' });
    return t;
  });
  X.text(1440, 300, 'fingerprints', { parent: B, size: 26, anchor: 'middle', w: 700, fill: C.teal });
  X.each(() => {
    const keyed = X.t > X.at(4, 0.4);
    outs.forEach((t, i) => t.set((keyed ? keyFP : plainFP)[i]));
    machLab.set(keyed ? 'HMAC' : 'hash');
  });
  X.pulse(mach, 940, 440, 4, { f: 0.38, amt: 0.08 });
  X.term(3, 'Hash', 'A recipe that turns any data into a short\nfingerprint. It cannot be turned back.', { until: 4 });
  const key = X.g(B);
  X.icon('key', 0, 0, 0.7, { parent: key });
  X.show(key, 4, { f: 0.05, type: 'fade', len: 0.3 });
  X.travel(key, spline([[940, 180], [960, 250], [940, 300]]), 4, { f0: 0.1, f1: 0.38 });
  const kl = X.text(1010, 250, 'secret key', { parent: B, size: 24, fill: C.ochre, w: 700 });
  X.show(kl, 4, { f: 0.2 });
  const noKey = X.g(B);
  X.rect(170, 690, 1480, 90, { parent: noKey, fill: C.redL, stroke: C.red, r: 16 });
  X.mark(225, 735, false, { parent: noKey, s: 24 });
  X.text(270, 746, 'Without the key, an outsider cannot make the same fingerprints', { parent: noKey, size: 28, w: 600, fill: C.red });
  X.show(noKey, 4, { f: 0.6, type: 'up' });
  X.term(4, 'HMAC', 'A hash that also needs a secret key, so only\nthe bank can make (or check) these fingerprints.', { until: 5 });

  // ---------- Stage C: the cuckoo filter (cues 5-6) ----------
  const Cg = X.g();
  X.show(Cg, 5, { type: 'fade', out: 7, outLen: 0.6 });
  const T0x = 520, T0y = 300, SW = 100, SH = 80;
  X.rect(T0x - 20, T0y - 20, 8 * SW + 30, 4 * SH + 30, { parent: Cg, fill: C.sand, r: 16, shadow: true });
  const r7 = rng(5);
  const slots = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    const x = T0x + c * SW, y = T0y + r * SH;
    const rr = E('rect', { x, y, width: SW - 10, height: SH - 10, rx: 8, fill: C.card, stroke: C.line, 'stroke-width': 2 }, Cg);
    const tt = E('text', { x: x + (SW - 10) / 2, y: y + 44, 'font-size': 24, 'font-weight': 600, fill: C.ink2, 'text-anchor': 'middle', 'font-family': F.mono }, Cg);
    const empty = [3, 9, 14, 20, 27, 30].includes(r * 8 + c);
    let s = ''; for (let i = 0; i < 4; i++) s += '0123456789abcdef'[Math.floor(r7() * 16)];
    tt.textContent = empty ? '' : s;
    slots.push({ rr, tt, x, y, s: empty ? '' : s });
  }
  const HIT = 13, ALT = 4, VEL = 22, MOVEFROM = 17, MOVETO = 20;
  slots[HIT].s = D.hm.slice(0, 4); slots[HIT].tt.textContent = slots[HIT].s;
  X.text(T0x + 4 * SW - 5, 690, 'cuckoo filter: a table of short fingerprints', { parent: Cg, size: 26, anchor: 'middle', fill: C.ink2 });
  // the cuckoo
  const bird = X.g(Cg);
  const bi = E('g', { transform: 'translate(1360 250)' }, bird);
  E('path', { d: 'M-40,10 L-95,30 L-88,14 L-100,8 Z', fill: C.ink2 }, bi);
  E('ellipse', { cx: 0, cy: 0, rx: 52, ry: 34, fill: C.blueL, stroke: C.ink, 'stroke-width': 4 }, bi);
  E('path', { d: 'M-20,-6 Q6,-30 30,-4', fill: 'none', stroke: C.ink2, 'stroke-width': 4 }, bi);
  E('circle', { cx: 44, cy: -30, r: 24, fill: C.blueL, stroke: C.ink, 'stroke-width': 4 }, bi);
  E('circle', { cx: 52, cy: -34, r: 4, fill: C.ink }, bi);
  E('path', { d: 'M66,-32 L88,-26 L66,-22 Z', fill: C.ochre, stroke: C.ink, 'stroke-width': 2 }, bi);
  E('path', { d: 'M-8,32 L-8,48 M12,32 L12,48', stroke: C.ochre, 'stroke-width': 5, 'stroke-linecap': 'round' }, bi);
  X.show(X.wrap(bird), 5, { f: 0.1, type: 'pop' });
  X.each(t => bi.setAttribute('transform', `translate(1360 ${(240 + 4 * Math.sin(t * 3)).toFixed(1)}) rotate(${(5 * Math.sin(t * 1.7)).toFixed(1)})`));
  // query
  const qg = X.g(Cg);
  X.chip(0, 0, 'seen 2345 6789 0124 before?', { size: 26, color: C.ink, fill: C.ochreL, stroke: C.ochre, parent: qg });
  X.show(qg, 5, { f: 0.3, type: 'fade', len: 0.3, out: 6 });
  X.travel(qg, spline([[300, 220], [600, 220], [960, 230]]), 5, { f0: 0.3, f1: 0.5 });
  const a1 = X.arrow(960, 250, slots[HIT].x + 45, slots[HIT].y, { parent: Cg, color: C.ochre, sw: 4 });
  const a2 = X.arrow(960, 250, slots[ALT].x + 45, slots[ALT].y, { parent: Cg, color: C.ochre, sw: 4, dash: '6 6' });
  X.show(a2, 5, { f: 0.52, type: 'draw', out: 6 }); X.show(a1, 5, { f: 0.56, type: 'draw', out: 6 });
  const yes = X.chip(1580, 470, 'Yes: seen before', { size: 28, color: C.green, fill: C.greenL, parent: Cg });
  X.show(yes, 5, { f: 0.7, type: 'pop', out: 6 });
  X.term(5, 'Cuckoo filter', 'A very compact table of fingerprints that answers\none question fast: have I seen this before?', { until: 6 });
  // a fingerprint hopping to another slot (how a cuckoo filter makes room)
  const hop = X.g(Cg);
  const hopT = E('text', { x: 0, y: 8, 'font-size': 24, 'font-weight': 600, fill: C.plum, 'text-anchor': 'middle', 'font-family': F.mono }, hop);
  hopT.textContent = slots[MOVEFROM].s;
  X.show(hop, 5, { f: 0.82, type: 'fade', len: 0.1, out: 5, outf: 0.99, outLen: 0.1 });
  X.travel(hop, spline([[slots[MOVEFROM].x + 45, slots[MOVEFROM].y + 36], [(slots[MOVEFROM].x + slots[MOVETO].x) / 2 + 45, slots[MOVEFROM].y - 40], [slots[MOVETO].x + 45, slots[MOVETO].y + 36]]), 5, { f0: 0.82, f1: 0.97 });
  // size facts and deletion (cue 6)
  const facts = X.g(Cg);
  X.rect(500, 740, 400, 110, { parent: facts, fill: C.card, r: 14, shadow: true });
  const cnt = X.text(700, 790, '', { parent: facts, size: 34, anchor: 'middle', serif: true, w: 700, fill: C.teal });
  X.text(700, 830, 'fingerprints', { parent: facts, size: 22, anchor: 'middle', fill: C.ink2 });
  X.count(cnt, 0, 800000, 6, { f0: 0.0, f1: 0.25 });
  E('path', { d: 'M960,740 L1080,740 L1110,770 L1110,850 L960,850 Z', fill: C.ochreL, stroke: C.ink, 'stroke-width': 4 }, facts);
  for (let i = 0; i < 4; i++) E('rect', { x: 975 + i * 26, y: 752, width: 14, height: 26, fill: C.ochre }, facts);
  X.text(1035, 830, '4 MB', { parent: facts, size: 30, anchor: 'middle', w: 800 });
  X.text(1140, 790, 'about the size of', { parent: facts, size: 22, fill: C.ink2 });
  X.text(1140, 820, 'one phone photo', { parent: facts, size: 22, fill: C.ink2 });
  X.show(facts, 6, { type: 'up' });
  const vel = X.person(240, 860, { shirt: C.teal, skin: C.skin[1], name: 'Vel leaves the bank', s: 0.85 });
  Cg.appendChild(vel);
  X.show(X.wrap(vel), 6, { f: 0.45, type: 'left' });
  X.wave(vel, 6, { f: 0.5, len: 1.6 });
  const bin = X.icon('trash', 1560, 640, 0.7, { parent: Cg });
  X.show(bin, 6, { f: 0.5, type: 'pop' });
  const del = X.g(Cg);
  const delT = E('text', { x: 0, y: 8, 'font-size': 24, 'font-weight': 600, fill: C.red, 'text-anchor': 'middle', 'font-family': F.mono }, del);
  delT.textContent = slots[VEL].s;
  X.show(del, 6, { f: 0.65, type: 'fade', len: 0.1, out: 6, outf: 0.88, outLen: 0.1 });
  X.travel(del, spline([[slots[VEL].x + 45, slots[VEL].y + 36], [1300, 520], [1560, 610]]), 6, { f0: 0.65, f1: 0.88 });
  X.term(6, 'Megabyte (MB)', 'A unit of computer storage. One phone photo\nis a few megabytes.', { until: 7 });
  X.each(() => {
    const moved = X.t > X.at(5, 0.97);
    slots[MOVEFROM].tt.textContent = moved ? '' : slots[MOVEFROM].s;
    slots[MOVETO].tt.textContent = moved ? slots[MOVEFROM].s : '';
    const hit = X.t > X.at(5, 0.62) && X.t < X.at(6);
    slots[HIT].rr.setAttribute('fill', hit ? C.greenL : C.card); slots[HIT].rr.setAttribute('stroke', hit ? C.green : C.line);
    const dl = X.t > X.at(6, 0.6);
    slots[VEL].rr.setAttribute('stroke', dl && X.t < X.at(6, 0.66) ? C.red : C.line);
    slots[VEL].tt.textContent = X.t > X.at(6, 0.66) ? '' : slots[VEL].s;
  });

  // ---------- Stage D: OTPs (cues 7-9) ----------
  const Dg = X.g();
  X.show(Dg, 7, { type: 'fade', out: 8, outLen: 0.5 });
  const ph = X.icon('phone', 520, 470, 2.2, { parent: Dg });
  const sms = X.g(Dg);
  X.rect(380, 330, 280, 110, { parent: sms, fill: C.ochreL, stroke: C.ochre, r: 16, shadow: true });
  X.text(520, 375, 'Your OTP is', { parent: sms, size: 24, anchor: 'middle', fill: C.ink2 });
  X.text(520, 418, '482913', { parent: sms, size: 36, anchor: 'middle', mono: true, w: 700 });
  X.show(sms, 7, { f: 0.1, type: 'down' });
  // dice: random
  const dice = [0, 1].map(i => {
    const g = X.g(Dg);
    const inner = E('g', null, g);
    E('rect', { x: -45, y: -45, width: 90, height: 90, rx: 16, fill: C.card, stroke: C.ink, 'stroke-width': 5 }, inner);
    const pips = [];
    for (let j = 0; j < 9; j++) pips.push(E('circle', { cx: -24 + (j % 3) * 24, cy: -24 + Math.floor(j / 3) * 24, r: 7, fill: C.ink }, inner));
    X.show(g, 7, { f: 0.3 + i * 0.1, type: 'pop' });
    return { g, inner, pips, i };
  });
  const PIP = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  X.each(t => dice.forEach(d => {
    const roll = Math.floor(t * 6);
    const v = 1 + Math.floor(rng(roll * 7 + d.i * 131)() * 6);
    d.pips.forEach((p, j) => p.style.display = PIP[v].includes(j) ? '' : 'none');
    d.inner.setAttribute('transform', `translate(${1040 + d.i * 150} ${470 + 10 * Math.sin(t * 6 + d.i)}) rotate(${(t * 90 + d.i * 40) % 360})`);
  }));
  const rnd = X.text(1115, 610, 'random: no pattern to look for', { parent: Dg, size: 28, anchor: 'middle', w: 600 });
  X.show(rnd, 7, { f: 0.5, type: 'up' });
  X.term(7, 'OTP', 'One-time password: a short code sent by SMS\nthat works once, for a few minutes.', { until: 8 });

  const Rg = X.g();
  X.show(Rg, 8, { type: 'fade', out: 9, outLen: 0.6 });
  const otpC = X.chip(520, 300, 'OTP 482913', { size: 32, mono: true, color: C.ink, fill: C.ochreL, stroke: C.ochre, parent: Rg });
  const reqC = X.g(Rg);
  X.rect(1080, 240, 420, 120, { parent: reqC, fill: C.blueL, stroke: C.blue, sw: 3, r: 14, shadow: true });
  X.text(1110, 285, 'login request', { parent: reqC, size: 24, w: 600, fill: C.ink2 });
  X.text(1110, 330, 'trace 4bf92f', { parent: reqC, size: 32, mono: true, w: 700, fill: C.blue });
  X.show(reqC, 8, { f: 0.1, type: 'left' });
  const tie = X.path('M650,300 C760,240 820,380 900,300 S1000,260 1075,300', { parent: Rg, color: C.red, sw: 5 });
  X.show(tie, 8, { f: 0.35, type: 'draw', len: 1 });
  const knot = X.circle(900, 300, 10, { parent: Rg, fill: C.red });
  X.show(knot, 8, { f: 0.55, type: 'pop' });
  const mem = X.g(Rg);
  X.rect(560, 470, 800, 250, { parent: mem, fill: C.card, stroke: C.teal, sw: 3, r: 20, shadow: true });
  X.icon('brain', 650, 595, 0.8, { parent: mem, fill: C.tealL });
  X.text(740, 540, "Aran's memory of live OTPs", { parent: mem, size: 28, w: 700, serif: true });
  X.text(740, 600, 'OTP 482913  +  trace 4bf92f', { parent: mem, size: 28, mono: true, w: 600, fill: C.teal });
  X.text(740, 650, 'kept only until the OTP expires', { parent: mem, size: 24, fill: C.ink2 });
  X.show(mem, 8, { f: 0.6, type: 'up' });
  X.pulse(otpC, 520, 300, 8, { f: 0.1, amt: 0.1 });
  X.term(8, 'Trace number', 'A unique label given to each request, so it can\nbe followed from start to finish.', { until: 9 });

  // cue 9: random guesses
  const G = X.g();
  X.show(G, 9, { type: 'fade' });
  const panel = (x0, title, col) => {
    X.rect(x0, 190, 720, 690, { parent: G, fill: C.card, r: 20, shadow: true });
    X.text(x0 + 360, 245, title, { parent: G, size: 32, anchor: 'middle', serif: true, w: 700, fill: col });
  };
  panel(170, 'Without the tie', C.red); panel(1030, 'With the tie', C.green);
  const guess = [X.text(530, 305, '', { parent: G, size: 28, mono: true, anchor: 'middle', w: 600 }), X.text(1390, 305, '', { parent: G, size: 28, mono: true, anchor: 'middle', w: 600 })];
  X.each(t => {
    const r = rng(Math.floor(t * 10));
    let s = ''; for (let i = 0; i < 6; i++) s += Math.floor(r() * 10);
    guess[0].set('random guess: ' + s); guess[1].set(s + ' + trace ??????');
  });
  const reds = [3, 17, 28, 46, 59, 71, 94];
  for (let i = 0; i < 100; i++) {
    const x = 340 + (i % 10) * 38, y = 345 + Math.floor(i / 10) * 38;
    const r = E('rect', { x, y, width: 32, height: 32, rx: 5, fill: C.sand, stroke: C.line, 'stroke-width': 1.5 }, G);
    if (reds.includes(i)) { r.setAttribute('fill', C.red); r.style.opacity = 0; X.each(() => { r.style.opacity = X.P(9, 0.12 + reds.indexOf(i) * 0.03, 0, 0.3); }); }
  }
  X.text(530, 795, 'matches some live OTP', { parent: G, size: 26, anchor: 'middle', fill: C.ink2 });
  const pr = X.text(530, 845, '', { parent: G, size: 40, anchor: 'middle', serif: true, w: 700, fill: C.red });
  X.count(pr, 0, 7, 9, { f0: 0.1, f1: 0.4, pre: 'about ', post: ' in 100' });
  const defs = E('defs', null, G);
  const pat = E('pattern', { id: 'registryMillion', patternUnits: 'userSpaceOnUse', x: 1200, y: 345, width: 38, height: 38 }, defs);
  const prr = E('rect', { x: 0, y: 0, width: 32, height: 32, rx: 5, fill: C.sand }, pat);
  E('rect', { x: 1200, y: 345, width: 380, height: 380, fill: 'url(#registryMillion)' }, G);
  const one = E('rect', { x: 1452, y: 470, width: 32, height: 32, fill: C.red }, G);
  const oneRing = E('circle', { cx: 1468, cy: 486, r: 22, fill: 'none', stroke: C.red, 'stroke-width': 4 }, G);
  X.each(() => {
    const z = ease(X.L(9, 0.45, 0.85));
    const W = 38 / Math.pow(10, 1.6 * z);
    pat.setAttribute('width', W); pat.setAttribute('height', W);
    prr.setAttribute('width', W * 0.84); prr.setAttribute('height', W * 0.84); prr.setAttribute('rx', W * 0.13);
    const w = Math.max(4, W * 0.84);
    one.setAttribute('width', w); one.setAttribute('height', w);
    oneRing.setAttribute('cx', 1452 + w / 2); oneRing.setAttribute('cy', 470 + w / 2);
    oneRing.style.opacity = z > 0.3 ? 1 : 0;
  });
  X.text(1390, 795, 'matches the OTP of that exact request', { parent: G, size: 26, anchor: 'middle', fill: C.ink2 });
  const pr2 = X.text(1390, 845, 'about 1 in a million', { parent: G, size: 40, anchor: 'middle', serif: true, w: 700, fill: C.green });
  X.show(pr2, 9, { f: 0.6, type: 'pop' });

  X.recap(10, ["Customers are checked against keyed fingerprints", 'Fingerprints live in a tiny cuckoo filter', 'Each OTP is remembered with its own request']);
});
