// Detokenising: a loan officer asks for the real number; a permission gate checks who and why,
// the vault opens, the value comes back, and the request is written into a log book.
scene('vault', X => {
  X.cam([{ x: 700, y: 540, s: 1.06 }, { k: 1, x: 960, y: 540, s: 1, len: 1.6 }, { k: 4, x: 960, y: 400, s: 1.1 },
    { k: 5, x: 960, y: 360, s: 1.15 }, { k: 6, x: 960, y: 540, s: 1, len: 1.2 }]);
  const PY = 640; // the path the requests travel along

  // Asha, the loan officer, and her screen
  const asha = X.person(190, 860, { shirt: C.plum, skin: C.skin[2], long: true, name: 'Asha, loan officer', s: 1 });
  X.show(asha, 0, { type: 'right' });
  X.talk(asha, [0]);
  X.each(() => { if (X.t > X.at(3, 0.8)) asha.mood('happy'); });
  X.point(asha, 2, 70, { f: 0.45, until: 3 });
  const scr = X.g();
  X.rect(300, 200, 400, 170, { parent: scr, fill: C.card, r: 16, shadow: true });
  E('rect', { x: 300, y: 200, width: 400, height: 46, rx: 16, fill: C.blueL }, scr);
  E('rect', { x: 300, y: 230, width: 400, height: 16, fill: C.blueL }, scr);
  X.text(322, 232, 'Loan desk · Ravi Kumar', { parent: scr, size: 22, w: 700 });
  X.text(322, 282, 'Aadhaar on file:', { parent: scr, size: 22, fill: C.ink2 });
  const scrVal = X.text(322, 330, '2498 2684 6187', { parent: scr, size: 30, mono: true, w: 600, fill: C.teal });
  const scrNote = X.text(600, 330, '(token)', { parent: scr, size: 22, fill: C.ink3 });
  X.show(scr, 0, { f: 0.1, type: 'down' });
  const bub = X.g();
  X.rect(300, 450, 420, 96, { parent: bub, fill: C.card, r: 20, shadow: true });
  E('path', { d: 'M330,544 L300,600 L370,544 Z', fill: C.card, stroke: C.line, 'stroke-width': 2 }, bub);
  X.text(510, 490, 'I need the real number', { parent: bub, size: 26, anchor: 'middle', w: 600 });
  X.text(510, 524, 'to confirm this loan.', { parent: bub, size: 26, anchor: 'middle', w: 600 });
  X.show(bub, 0, { f: 0.35, type: 'pop', out: 1, outf: 0.7 });
  X.each(() => {
    const real = X.t > X.at(3, 0.88);
    scrVal.set(real ? '2345 6789 0124' : '2498 2684 6187');
    scrVal.t.setAttribute('fill', real ? C.green : C.teal);
    scrNote.set(real ? 'real' : '(token)');
    scrNote.t.setAttribute('fill', real ? C.green : C.ink3);
  });

  // the vault
  const V = X.g();
  X.show(V, 0, { f: 0.5, type: 'left' });
  X.rect(1320, 380, 460, 460, { parent: V, fill: C.sand, stroke: C.ink, sw: 5, r: 26, shadow: true });
  X.text(1550, 880, 'the vault: real values', { parent: V, size: 26, anchor: 'middle', w: 600 });
  // inside (seen when the door opens)
  E('circle', { cx: 1550, cy: 610, r: 170, fill: C.paper, stroke: C.ink, 'stroke-width': 4 }, V);
  for (let r = 0; r < 3; r++) {
    E('line', { x1: 1410, y1: 560 + r * 70, x2: 1690, y2: 560 + r * 70, stroke: C.line, 'stroke-width': 4 }, V);
    for (let c = 0; c < 5; c++) E('rect', { x: 1425 + c * 54, y: 520 + r * 70, width: 40, height: 38, rx: 5, fill: r === 1 && c === 2 ? C.ochreL : C.card, stroke: r === 1 && c === 2 ? C.ochre : C.line, 'stroke-width': 2 }, V);
  }
  const door = X.g(V);
  E('circle', { cx: 1550, cy: 610, r: 172, fill: C.ochreL, stroke: C.ink, 'stroke-width': 6 }, door);
  E('circle', { cx: 1550, cy: 610, r: 130, fill: 'none', stroke: C.ochre, 'stroke-width': 4, 'stroke-dasharray': '10 10' }, door);
  const wheel = E('g', null, door);
  for (let i = 0; i < 3; i++) E('line', { x1: 1550 - 60 * Math.cos(i * Math.PI / 3), y1: 610 - 60 * Math.sin(i * Math.PI / 3), x2: 1550 + 60 * Math.cos(i * Math.PI / 3), y2: 610 + 60 * Math.sin(i * Math.PI / 3), stroke: C.ink, 'stroke-width': 9, 'stroke-linecap': 'round' }, wheel);
  E('circle', { cx: 1550, cy: 610, r: 20, fill: C.ink }, wheel);
  X.each(t => {
    const spinP = X.P(3, 0.3, 0, 0.6), open = X.P(3, 0.45, 0, 0.6) * (1 - X.P(4, 0.1, 0, 0.6));
    wheel.setAttribute('transform', `rotate(${(spinP * 180).toFixed(1)} 1550 610)`);
    const sx = 1 - 0.88 * open;
    door.setAttribute('transform', `translate(1378 0) scale(${sx.toFixed(3)} 1) translate(-1378 0)`);
  });
  X.term(3, 'Vault', "Aran's locked store of the real values. It only\nopens for requests that pass the check.", { until: 4 });

  // the permission gate
  const G = X.g();
  X.show(G, 1, { f: 0.2, type: 'up' });
  E('rect', { x: 1000, y: 500, width: 16, height: 280, rx: 6, fill: C.ink }, G);
  E('rect', { x: 1150, y: 500, width: 16, height: 280, rx: 6, fill: C.ink }, G);
  E('rect', { x: 990, y: 488, width: 186, height: 18, rx: 6, fill: C.ink }, G);
  const bars = X.g(G);
  for (let i = 0; i < 5; i++) E('rect', { x: 1028 + i * 26, y: 510, width: 10, height: 268, rx: 4, fill: C.ink2 }, bars);
  E('rect', { x: 1020, y: 630, width: 136, height: 12, rx: 4, fill: C.ink2 }, bars);
  const shieldG = X.icon('shield', 1083, 440, 0.42, { parent: G, check: false });
  const lamp = E('circle', { cx: 1180, cy: 470, r: 18, fill: C.sand, stroke: C.ink, 'stroke-width': 4 }, G);
  const lampRay = X.g(G);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; E('line', { x1: 1180 + 26 * Math.cos(a), y1: 470 + 26 * Math.sin(a), x2: 1180 + 40 * Math.cos(a), y2: 470 + 40 * Math.sin(a), stroke: C.red, 'stroke-width': 5, 'stroke-linecap': 'round' }, lampRay); }
  X.text(1083, 820, 'permission check', { parent: G, size: 26, anchor: 'middle', w: 600 });
  X.each(t => {
    const open = X.P(3, 0.15, 0, 0.6) * (1 - X.P(3, 0.9, 0, 0.5));
    bars.setAttribute('transform', `translate(0 ${(-250 * open).toFixed(1)})`);
    bars.style.opacity = 1 - 0.85 * open;
    const alarm = X.t > X.at(6, 0.35) && X.t < X.at(7);
    const on = alarm && Math.sin(t * 12) > 0;
    lamp.setAttribute('fill', on ? C.red : alarm ? C.redL : C.sand);
    lampRay.style.opacity = on ? 1 : 0;
  });
  X.term(1, 'Detokenising', 'Swapping a token back for the real value.\nOnly Aran can do it, and only when allowed.', { until: 2 });

  // detokenising sketch (cue 1): token -> vault -> real
  const sk = X.g();
  X.show(sk, 1, { f: 0.25, type: 'fade', out: 2, outLen: 0.4 });
  X.chip(820, 440, '2498 2684 6187', { size: 26, mono: true, color: C.teal, fill: C.tealL, parent: sk });
  X.arrow(820, 470, 820, 520, { parent: sk, sw: 4, color: C.ink2 });
  X.chip(820, 560, 'swap back', { size: 24, color: C.ink, parent: sk });
  X.arrow(820, 590, 820, 640, { parent: sk, sw: 4, color: C.ink2 });
  X.chip(820, 680, '2345 6789 0124', { size: 26, mono: true, color: C.green, fill: C.greenL, parent: sk });

  // request cards
  const reqCard = (lines, col, colL) => {
    const g = X.g();
    X.rect(-150, -70, 300, 140, { parent: g, fill: colL, stroke: col, sw: 3, r: 14, shadow: true });
    lines.forEach((l, i) => X.text(-130, -32 + i * 36, l, { parent: g, size: 22, w: i ? 500 : 700, fill: C.ink }));
    return g;
  };
  // a request with no permission bounces off
  const bad = reqCard(['Marketing app', 'no permission', 'no reason given'], C.ink3, C.card);
  X.show(X.wrap(bad), 2, { f: 0.05, type: 'fade', len: 0.3, out: 2, outf: 0.45, outLen: 0.3 });
  X.each(() => {
    const u = X.L(2, 0.05, 0.42);
    const x = u < 0.6 ? lerp(380, 830, ease(u / 0.6)) : lerp(830, 640, ease((u - 0.6) / 0.4));
    const jig = u > 0.58 && u < 0.7 ? 8 * Math.sin(X.t * 50) : 0;
    bad.setAttribute('transform', `translate(${(x + jig).toFixed(1)} ${PY})`);
  });
  const badX = X.mark(980, 420, false, { s: 28 });
  X.show(badX, 2, { f: 0.27, type: 'pop', out: 2, outf: 0.5 });
  // Asha's request: who + why
  const good = reqCard(['Loan desk app', 'ID: badge LD-07', 'why: confirm loan'], C.blue, C.blueL);
  const goodW = X.wrap(good);
  X.show(goodW, 2, { f: 0.5, type: 'fade', len: 0.3, out: 3, outf: 0.7, outLen: 0.3 });
  X.each(() => {
    let x = lerp(380, 830, ease(X.L(2, 0.5, 0.85)));
    if (X.t > X.at(3)) x = lerp(830, 1400, ease(X.L(3, 0.25, 0.65)));
    good.setAttribute('transform', `translate(${x.toFixed(1)} ${PY})`);
  });
  const idI = X.icon('idcard', 750, 495, 0.42, { color: C.ink });
  const whyI = X.chip(905, 495, 'reason', { size: 22, color: C.ink, fill: C.card });
  X.show(idI, 2, { f: 0.75, type: 'pop', out: 3, outf: 0.6 }); X.show(whyI, 2, { f: 0.85, type: 'pop', out: 3, outf: 0.6 });
  const t1 = X.mark(800, 470, true, { s: 18 }), t2 = X.mark(960, 470, true, { s: 18 });
  X.show(t1, 3, { f: 0.02, type: 'pop', out: 3, outf: 0.6 }); X.show(t2, 3, { f: 0.1, type: 'pop', out: 3, outf: 0.6 });
  X.term(2, 'Permission', 'Being allowed to do something. The bank decides\nwhich systems may ask for real numbers.', { until: 3 });
  // the real value flying back to Asha
  const back = X.g();
  X.chip(0, 0, '2345 6789 0124', { size: 26, mono: true, color: C.green, fill: C.greenL, parent: back });
  X.show(back, 3, { f: 0.62, type: 'fade', len: 0.2, out: 3, outf: 0.92, outLen: 0.2 });
  X.travel(back, spline([[1550, 600], [1200, 330], [800, 250], [520, 320]]), 3, { f0: 0.62, f1: 0.92 });

  // the log book (cues 4-5)
  const book = X.g();
  X.show(book, 4, { type: 'down' });
  X.rect(720, 140, 560, 260, { parent: book, fill: C.card, stroke: C.ink2, sw: 3, r: 12, shadow: true });
  E('line', { x1: 1000, y1: 146, x2: 1000, y2: 394, stroke: C.line, 'stroke-width': 3 }, book);
  X.text(745, 180, 'Request log', { parent: book, size: 26, serif: true, w: 700 });
  const lab = ['who', 'when', 'customer', 'why'], val = ['Loan desk (Asha)', '20 Oct, 10:42', 'Ravi Kumar', 'confirm loan'];
  const vals = [];
  lab.forEach((l, i) => {
    const y = 232 + i * 46;
    X.text(745, y, l + ':', { parent: book, size: 22, fill: C.ink3, w: 600 });
    vals.push(X.text(860, y, '', { parent: book, size: 22, w: 600 }));
    X.type(vals[i], val[i], 4, { f0: 0.15 + i * 0.18, f1: 0.3 + i * 0.18 });
  });
  for (let i = 0; i < 5; i++) E('line', { x1: 1020, y1: 192 + i * 46, x2: 1255, y2: 192 + i * 46, stroke: C.sand, 'stroke-width': 10, 'stroke-linecap': 'round' }, book);
  const pen = X.g(book);
  E('path', { d: 'M0,0 L-14,-40 L10,-48 Z', fill: C.ink }, pen);
  E('rect', { x: -14, y: -110, width: 24, height: 66, rx: 6, fill: C.ochre, transform: 'rotate(-16)' }, pen);
  X.each(t => {
    const u = clamp(X.L(4, 0.15, 0.87));
    const i = Math.min(3, Math.floor(u * 4)), ph = u * 4 - i;
    const n = val[i].length;
    pen.setAttribute('transform', `translate(${(860 + ph * n * 11.7).toFixed(1)} ${(232 + i * 46 + 2 * Math.sin(t * 30)).toFixed(1)})`);
    pen.style.opacity = X.t > X.at(4) && X.t < X.at(4, 0.95) ? 1 : 0;
  });
  X.term(4, 'Log', 'A written record, one line per event,\nsaying what happened and when.', { until: 5 });
  // cue 5: looking back at the record
  const lens = X.g();
  X.icon('magnifier', 0, 0, 0.6, { parent: lens });
  const lensW = X.wrap(lens);
  X.show(lensW, 5, { f: 0.1, type: 'pop', out: 6 });
  X.each(() => {
    const u = X.L(5, 0.1, 0.9);
    lens.setAttribute('transform', `translate(${(900 + 140 * Math.sin(u * Math.PI * 2)).toFixed(1)} ${(225 + 150 * u).toFixed(1)})`);
  });
  const sec = X.person(1370, 360, { shirt: C.ink, skin: C.skin[0], badge: true, s: 0.6 });
  X.show(sec, 5, { type: 'right', out: 6 });
  X.each(() => X.arms(sec, lerp(8, 80, X.P(5, 0.2)), 8));
  const who = X.chip(500, 432, 'exactly who looked at what', { size: 24, color: C.ink, fill: C.ochreL, stroke: C.ochre });
  X.show(who, 5, { f: 0.45, type: 'up', out: 6 });

  // cue 6: a sudden rush of requests -> alarm -> immune layer
  const rushSp = spline([[330, PY + 60], [600, PY - 20], [960, PY]]);
  X.stream(rushSp, { n: 14, speed: 0.9, k0: 6, f0: 0.1, k1: 7, make: (g, i) => {
    const d = E('g', null, g);
    E('rect', { x: -26, y: -18, width: 52, height: 36, rx: 6, fill: C.blueL, stroke: C.blue, 'stroke-width': 2 }, d);
    E('line', { x1: -16, y1: -4, x2: 16, y2: -4, stroke: C.blue, 'stroke-width': 3 }, d);
    E('line', { x1: -16, y1: 6, x2: 8, y2: 6, stroke: C.blue, 'stroke-width': 3 }, d);
    return d;
  } });
  const rushT = X.chip(560, 760, 'hundreds of requests a minute!', { size: 26, color: C.red, fill: C.redL, stroke: C.red });
  X.show(rushT, 6, { f: 0.2, type: 'up', out: 7 });
  const imm = X.g();
  X.rect(1270, 200, 560, 150, { parent: imm, fill: C.card, stroke: C.teal, sw: 3, r: 18, shadow: true });
  X.icon('shield', 1340, 275, 0.6, { parent: imm, fill: C.tealL, color: C.teal });
  X.text(1400, 262, 'Warning sent to the', { parent: imm, size: 26, w: 500 });
  X.text(1400, 300, 'immune layer', { parent: imm, size: 34, w: 700, serif: true, fill: C.teal });
  X.show(imm, 6, { f: 0.55, type: 'left', out: 7 });
  const ia = X.arrow(1200, 460, 1290, 360, { color: C.teal, sw: 4 });
  X.show(ia, 6, { f: 0.5, type: 'draw', out: 7 });
  X.shake(shieldG.mid, 6, { f: 0.35, len: 1.5, amp: 6 });
  X.term(6, 'Immune layer', "The part of Aran that spots unusual behaviour,\nlike the body's defences spot germs.", { f: 0.05, until: 7 });

  X.recap(7, ['Only allowed systems get the real number back', 'Each must say who it is, and why', 'Every request is written in the log']);
});
