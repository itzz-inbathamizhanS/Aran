// How FF1 scrambles digits into digits: normal encryption breaks a form, FF1 keeps the shape,
// and inside it a Feistel network shuffles two halves ten times (real rounds from DATA.rounds).
scene('ff1', X => {
  const R = window.DATA.rounds;
  const body = '23456789012';
  const aad = '234567890124', tok = '098261586412';
  X.cam([{ x: 960, y: 450, s: 1.1 }, { k: 1, x: 960, y: 540, s: 1 }, { k: 2, x: 960, y: 520, s: 1.02 },
    { k: 3, x: 960, y: 450, s: 1.08 }, { k: 4, x: 960, y: 520, s: 1 }, { k: 5, x: 780, y: 470, s: 1.12 },
    { k: 6, x: 960, y: 480, s: 1 }, { k: 7, x: 960, y: 560, s: 1.04 }, { k: 9, x: 960, y: 500, s: 1 },
    { k: 11, x: 960, y: 520, s: 1 }]);

  // a single character flying from one place to another while cue k plays
  const flyChar = (ch, from, to, k, f0, f1, o = {}) => {
    const g = X.g(o.parent);
    const t = E('text', { x: 0, y: (o.size || 30) * 0.36, 'font-size': o.size || 30, 'font-weight': 700, fill: o.color || C.blue, 'text-anchor': 'middle', 'font-family': F.mono }, g);
    t.textContent = ch;
    X.show(g, k, { f: f0, type: 'fade', len: 0.2, out: k, outf: f1, outLen: 0.2 });
    const mid = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - (o.lift || 60)];
    X.travel(g, spline([from, mid, to]), k, { f0, f1 });
    return g;
  };
  const gearsIn = (parent, x1, y1, x2, y2, s1 = 0.6, s2 = 0.45) => {
    const a = X.icon('gear', x1, y1, s1, { parent });
    const b = X.icon('gear', x2, y2, s2, { parent, fill: C.ochreL });
    X.spin(a.mid, x1, y1, { speed: 70 }); X.spin(b.mid, x2, y2, { speed: -95 });
  };

  // ---------- Stage A: encryption, AES (cues 0-1) ----------
  const A = X.g();
  X.show(A, 0, { type: 'fade', out: 2, outLen: 0.6 });
  const inRow = X.digits(440, 360, body, { cw: 42, ch: 60, size: 30, gap: 4, parent: A });
  X.text(440, 335, 'eleven digits in', { parent: A, size: 24, anchor: 'middle', fill: C.ink2 });
  const mach = X.g(A);
  X.rect(790, 290, 340, 200, { parent: mach, fill: C.sand, r: 24, shadow: true });
  gearsIn(mach, 900, 365, 1010, 375);
  const machLab = X.text(960, 465, 'encryption', { parent: mach, size: 26, anchor: 'middle', w: 600 });
  const outRow = X.digits(1480, 360, '???????????', { cw: 42, ch: 60, size: 30, gap: 4, parent: A, color: C.teal });
  X.text(1480, 335, 'eleven new digits out', { parent: A, size: 24, anchor: 'middle', fill: C.ink2 });
  X.arrow(700, 390, 780, 390, { parent: A, sw: 4 });
  X.arrow(1140, 390, 1220, 390, { parent: A, sw: 4, color: C.teal });
  const keyA = X.icon('key', 960, 600, 0.75, { parent: A });
  X.text(960, 660, 'secret key', { parent: A, size: 24, anchor: 'middle', fill: C.ink2 });
  const kArrow = X.arrow(960, 570, 960, 505, { parent: A, sw: 4, color: C.ochre });
  X.show(kArrow, 0, { f: 0.3, type: 'draw' });
  X.bob(keyA.mid, { amp: 5, per: 2.2 });
  for (let i = 0; i < 11; i++) {
    const c = inRow.cells[i];
    flyChar(body[i], [c.cx, 360], [960, 390], 0, 0.2 + i * 0.025, 0.5 + i * 0.025, { parent: A, size: 26, lift: 90 });
  }
  X.each(() => {
    const p = X.L(0, 0.55, 0.92);
    const n = Math.round(p * 11);
    let s = '';
    for (let i = 0; i < 11; i++) s += i < n ? R[10].join('')[i] : '?';
    outRow.set(s);
  });
  X.term(0, 'Encryption', 'Scrambling data with a secret key, so only\nsomeone with the key can unscramble it.', { until: 1 });
  // AES stamp + who uses it
  const aes = X.chip(960, 288, 'AES', { size: 34, color: C.blue, fill: C.blueL, parent: A, shadow: true });
  X.show(aes, 1, { f: 0.05, type: 'pop' });
  X.pulse(mach, 960, 390, 1, { f: 0.05, amt: 0.06 });
  const users = [['bank', 600, 'banks'], ['globe', 960, 'all over the world'], ['building', 1320, 'governments']];
  users.forEach(([ic, x, lab], i) => {
    const g = X.g(A);
    if (ic === 'globe') {
      const gg = X.g(g);
      E('circle', { cx: x, cy: 800, r: 52, fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, gg);
      E('ellipse', { cx: x, cy: 800, rx: 22, ry: 52, fill: 'none', stroke: C.ink, 'stroke-width': 3.5 }, gg);
      E('path', { d: `M${x - 52},800 L${x + 52},800 M${x - 44},772 L${x + 44},772 M${x - 44},828 L${x + 44},828`, stroke: C.ink, 'stroke-width': 3, fill: 'none' }, gg);
    } else X.icon(ic, x, 800, 0.7, { parent: g });
    X.text(x, 890, lab, { parent: g, size: 24, anchor: 'middle', fill: C.ink2 });
    X.show(g, 1, { f: 0.3 + i * 0.15, type: 'up' });
    if (ic !== 'globe') {
      const ln = X.path(`M${x},740 Q${(x + 960) / 2},640 ${x < 960 ? 820 : 1100},${500}`, { parent: A, color: C.line, sw: 3, dash: '3 10' });
      X.show(ln, 1, { f: 0.4 + i * 0.15, type: 'fade' });
    }
  });
  X.term(1, 'AES', 'The Advanced Encryption Standard: a scrambling\nrecipe trusted by banks and governments.', { until: 2 });

  // ---------- Stage B: normal encryption breaks the form (cue 2) ----------
  const B = X.g();
  X.show(B, 2, { type: 'fade', out: 3, outLen: 0.5 });
  X.digits(380, 190, aad, { groups: [4, 4, 4], cw: 40, ch: 56, size: 28, gap: 4, groupGap: 16, parent: B });
  X.arrow(672, 218, 752, 218, { parent: B, sw: 4 });
  const ne = X.box(762, 168, 300, 100, { parent: B, label: 'normal\nencryption', size: 26, fill: C.sand });
  X.arrow(1072, 218, 1132, 218, { parent: B, sw: 4, color: C.red });
  const junk = 'kX9#qP2$vL7@mR4!zT8&wE1%hB3^nD';
  const junkT = X.text(1142, 228, '', { parent: B, size: 26, mono: true, fill: C.red, w: 600 });
  X.type(junkT, junk, 2, { f0: 0.05, f1: 0.35, caret: false });
  X.text(1142, 280, '…a long mess of symbols', { parent: B, size: 24, fill: C.ink2 });
  const form = X.g(B);
  const formR = X.rect(560, 360, 800, 520, { parent: form, fill: C.card, r: 18, shadow: true });
  X.text(600, 420, 'Bank form: loan application', { parent: form, size: 30, serif: true, w: 600 });
  X.text(600, 478, 'Aadhaar number (12 digits)', { parent: form, size: 23, fill: C.ink3 });
  const slots = [];
  for (let i = 0; i < 12; i++) {
    const x = 600 + i * 50;
    const r = E('rect', { x, y: 494, width: 44, height: 56, rx: 7, fill: C.paper, stroke: C.line, 'stroke-width': 2 }, form);
    const t = E('text', { x: x + 22, y: 532, 'font-size': 28, 'font-weight': 600, fill: C.red, 'text-anchor': 'middle', 'font-family': F.mono }, form);
    slots.push({ r, t });
  }
  const spill = X.text(1205, 532, '', { parent: form, size: 28, mono: true, fill: C.red, w: 600 });
  const err = X.g(form);
  X.rect(600, 590, 720, 90, { parent: err, fill: C.redL, stroke: C.red, r: 14 });
  X.mark(650, 635, false, { parent: err, s: 24 });
  X.text(690, 645, 'Error: this is not a valid number', { parent: err, size: 28, fill: C.red, w: 600 });
  X.show(err, 2, { f: 0.72, type: 'pop' });
  const prog = X.g(form);
  const pg = X.icon('gear', 660, 780, 0.7, { parent: prog });
  X.text(720, 772, "The bank's program stops", { parent: prog, size: 26, fill: C.ink, w: 600 });
  X.text(720, 806, 'it expected digits, got symbols', { parent: prog, size: 22, fill: C.ink2 });
  X.show(prog, 2, { f: 0.8, type: 'up' });
  X.shake(pg.mid, 2, { f: 0.84, len: 1.4, amp: 8 });
  const pour = X.arrow(1300, 300, 1100, 470, { parent: B, color: C.red, sw: 4, bend: -0.2 });
  X.show(pour, 2, { f: 0.38, type: 'draw' });
  X.each(() => {
    const p = X.L(2, 0.42, 0.62);
    const n = Math.round(p * 12);
    slots.forEach((s, i) => { s.t.textContent = i < n ? junk[i] : ''; s.r.setAttribute('stroke', i < n ? C.red : C.line); });
    const q = X.L(2, 0.6, 0.72);
    spill.set(junk.slice(12, 12 + Math.round(q * 10)));
    const bad = X.t > X.at(2, 0.66);
    formR.r.setAttribute('stroke', bad ? C.red : C.line); formR.r.setAttribute('stroke-width', bad ? 4 : 2);
  });

  // ---------- Stage D: FF1 keeps digits as digits (cues 3-4) ----------
  const Dg = X.g();
  X.show(Dg, 3, { type: 'fade', out: 5, outLen: 0.6 });
  const m2 = X.g(Dg);
  X.rect(760, 270, 400, 210, { parent: m2, fill: C.tealL, stroke: C.teal, sw: 3, r: 26, shadow: true });
  X.text(960, 372, 'FF1', { parent: m2, size: 66, serif: true, anchor: 'middle', w: 700, fill: C.teal });
  X.text(960, 430, 'built on AES', { parent: m2, size: 24, anchor: 'middle', fill: C.ink2 });
  gearsIn(m2, 820, 320, 1105, 438, 0.42, 0.34);
  X.show(X.wrap(m2), 3, { type: 'pop' });
  const seal = X.g(Dg);
  const ring = X.circle(1250, 250, 70, { parent: seal, stroke: C.ochre, sw: 4, dash: '10 7' });
  X.circle(1250, 250, 58, { parent: seal, fill: C.ochreL, stroke: C.ochre, sw: 3 });
  X.text(1250, 250, 'NIST', { parent: seal, size: 30, anchor: 'middle', w: 800, fill: C.ink });
  X.text(1250, 278, 'approved', { parent: seal, size: 22, anchor: 'middle', fill: C.ink2 });
  X.spin(ring.c, 1250, 250, { speed: 25 });
  X.show(seal, 3, { f: 0.55, type: 'pop' });
  const in2 = X.digits(400, 560, aad, { groups: [4, 4, 4], cw: 38, ch: 54, size: 28, gap: 4, groupGap: 14, parent: Dg });
  const inL = X.text(400, 652, '12 digits in', { parent: Dg, size: 26, anchor: 'middle', w: 600 });
  const out2 = X.digits(1520, 560, '            ', { groups: [4, 4, 4], cw: 38, ch: 54, size: 28, gap: 4, groupGap: 14, parent: Dg, color: C.teal, stroke: C.teal });
  const outL = X.text(1520, 652, '12 digits out', { parent: Dg, size: 26, anchor: 'middle', w: 600, fill: C.teal });
  const ioA = X.path('M670,587 Q730,560 790,490', { parent: Dg, color: C.ink2, sw: 4 });
  const ioB = X.path('M1130,490 Q1190,560 1250,587', { parent: Dg, color: C.teal, sw: 4 });
  [in2, out2, ioA, ioB].forEach((g, i) => X.show(g, 4, { f: i * 0.05, type: i > 1 ? 'draw' : 'up' }));
  X.show(inL, 4, { f: 0.1 }); X.show(outL, 4, { f: 0.4 });
  for (let i = 0; i < 12; i++) flyChar(aad[i], [in2.cells[i].cx, 587], [960, 380], 4, 0.12 + i * 0.015, 0.36 + i * 0.015, { parent: Dg, size: 24, lift: 40 });
  const okForm = X.g(Dg);
  X.rect(620, 730, 680, 150, { parent: okForm, fill: C.card, r: 16, shadow: true });
  X.text(650, 772, 'Bank form: Aadhaar number', { parent: okForm, size: 23, fill: C.ink3 });
  const fs = X.digits(650, 790, '            ', { cw: 38, ch: 54, size: 28, gap: 6, anchor: 'start', parent: okForm, color: C.teal });
  const okT = X.mark(1220, 817, true, { parent: okForm, s: 30 });
  X.show(okForm, 4, { f: 0.55, type: 'up' });
  X.show(okT, 4, { f: 0.85, type: 'pop' });
  X.each(() => {
    const n = Math.round(X.L(4, 0.4, 0.62) * 12);
    out2.set(tok.slice(0, n).padEnd(12, ' '));
    const m = Math.round(X.L(4, 0.62, 0.84) * 12);
    fs.set(tok.slice(0, m).padEnd(12, ' '));
  });
  X.term(3, 'FF1', 'A method for scrambling numbers, built on AES,\nthat gives back a number of the same length.', { until: 3, outf: 0.5 });
  X.term(3, 'NIST', 'The American standards body that tests and\napproves methods like this one.', { f: 0.58, until: 4 });
  X.term(4, 'Format preserving', 'The scrambled result keeps the same shape:\ndigits stay digits, and the length stays the same.', { until: 5 });

  // ---------- Stage C: the Feistel network as a card shuffle (cues 5-11) ----------
  // deck of cards being shuffled (cue 5)
  const deck = X.g();
  X.show(deck, 5, { type: 'up', out: 6, outLen: 0.5 });
  const cards = [];
  for (let i = 0; i < 8; i++) {
    const g = X.g(deck);
    X.rect(-60, -85, 120, 170, { parent: g, fill: i % 2 ? C.blueL : C.plumL, stroke: C.ink2, r: 12 });
    E('rect', { x: -44, y: -69, width: 88, height: 138, rx: 8, fill: 'none', stroke: i % 2 ? C.blue : C.plum, 'stroke-width': 3, 'stroke-dasharray': '6 6' }, g);
    cards.push(g);
  }
  X.text(460, 790, 'a fixed, secret shuffle', { parent: deck, size: 28, anchor: 'middle', w: 600, fill: C.ink2 });
  X.icon('key', 690, 780, 0.45, { parent: deck });
  X.each(t => {
    const ph = (t * 0.6) % 1;
    cards.forEach((g, i) => {
      const half = i % 2;
      const split = Math.sin(Math.min(1, ph / 0.4) * Math.PI / 2) * (1 - clamp((ph - 0.55) / 0.35));
      const x = 460 + (half ? 1 : -1) * 150 * split;
      const y = 520 - i * 4 + (half ? -1 : 1) * 10 * split;
      const rot = (half ? 1 : -1) * 10 * split;
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1.35)`);
    });
  });
  X.term(5, 'Feistel network', 'A way to scramble by cutting the data in two\nand mixing the halves, round after round.', { until: 6 });

  // the number row that gets cut (cues 5-6)
  const rowW = X.g();
  X.show(rowW, 5, { f: 0.45, type: 'up', out: 7, outLen: 0.5 });
  const rowG = X.g(rowW);
  const row = X.digits(1180, 200, body, { cw: 50, ch: 70, size: 36, gap: 6, parent: rowG });
  X.each(() => {
    const p = X.P(6, 0.15, 0, 0.8);
    row.cells.forEach((c, i) => c.g.setAttribute('transform', `translate(${(i < 5 ? -1 : 1) * 30 * p} 0)`));
    for (let i = 0; i < 11; i++) row.paint(i, p > 0.5 ? (i < 5 ? C.blueL : C.plumL) : C.card, p > 0.5 ? (i < 5 ? C.blue : C.plum) : C.line);
  });
  const cutX = (row.cells[4].x + row.cells[4].w + row.cells[5].x) / 2;
  const cut = X.path(`M${cutX},180 L${cutX},295`, { color: C.red, sw: 4, dash: '8 8', parent: rowG });
  X.show(cut, 6, { type: 'fade', out: 7 });
  // when the deck is visible the row sits on the right; at cue 6 it glides to the centre
  X.each(() => { const p = X.P(6, 0, 0, 0.9); rowG.setAttribute('transform', `translate(${(-220 * p).toFixed(1)} 0)`); });

  // two card piles
  const LX = 560, RX = 1360, PY = 440;
  const makePile = (col, colL) => {
    const g = X.g();
    for (let j = 3; j >= 1; j--) E('rect', { x: -130 + j * 7, y: -65 + j * 7, width: 260, height: 130, rx: 14, fill: colL, stroke: col, 'stroke-width': 2 }, g);
    const top = E('rect', { x: -130, y: -65, width: 260, height: 130, rx: 14, fill: C.card, stroke: col, 'stroke-width': 3 }, g);
    const t = E('text', { x: 0, y: 19, 'font-size': 52, 'font-weight': 700, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.mono }, g);
    return { g, top, t };
  };
  const pilesW = X.g();
  X.show(pilesW, 6, { f: 0.45, type: 'up', out: 11, outLen: 0.5 });
  const labL = X.text(LX - 140, 545, 'left half', { parent: pilesW, size: 26, anchor: 'end', fill: C.ink2 });
  const labR = X.text(RX + 140, 545, 'right half', { parent: pilesW, size: 26, anchor: 'start', fill: C.ink2 });
  const PL = makePile(C.blue, C.blueL), PR = makePile(C.plum, C.plumL);
  pilesW.appendChild(PL.g); pilesW.appendChild(PR.g);
  const dropL = X.path(`M${row.cells[2].cx - 250},285 Q${LX - 40},320 ${LX},365`, { color: C.blue, sw: 3, dash: '2 9' });
  const dropR = X.path(`M${row.cells[8].cx - 190},285 Q${RX + 40},320 ${RX},365`, { color: C.plum, sw: 3, dash: '2 9' });
  X.show(dropL, 6, { f: 0.35, type: 'fade', out: 7 }); X.show(dropR, 6, { f: 0.35, type: 'fade', out: 7 });

  // mixer + key
  const mixG = X.g();
  X.show(mixG, 7, { type: 'up', out: 11, outLen: 0.5 });
  X.rect(860, 640, 200, 120, { parent: mixG, fill: C.sand, r: 20, shadow: true });
  const mg = X.icon('gear', 920, 700, 0.6, { parent: mixG });
  const mg2 = X.icon('gear', 1005, 700, 0.42, { parent: mixG, fill: C.ochreL });
  X.text(960, 795, 'mixer', { parent: mixG, size: 26, anchor: 'middle', w: 600 });
  const mk = X.icon('key', 1170, 790, 0.55, { parent: mixG });
  X.text(1170, 850, 'secret key', { parent: mixG, size: 22, anchor: 'middle', fill: C.ink2 });
  X.arrow(1120, 770, 1068, 730, { parent: mixG, color: C.ochre, sw: 4 });
  X.bob(mk.mid, { amp: 4, per: 1.8 });
  const spIn = spline([[RX, 510], [1260, 640], [1060, 690]]);
  const spOut = spline([[860, 690], [660, 640], [LX, 510]]);
  const pIn = X.path(spIn.d, { color: C.plum, sw: 4 });
  const pOut = X.path(spOut.d, { color: C.blue, sw: 4 });
  X.show(pIn, 7, { f: 0.1, type: 'draw', out: 11 }); X.show(pOut, 7, { f: 0.35, type: 'draw', out: 11 });
  const plus = X.g(); X.circle(690, 640, 26, { parent: plus, fill: C.card, stroke: C.blue, sw: 3 });
  X.text(690, 652, '+', { parent: plus, size: 38, anchor: 'middle', w: 700, fill: C.blue });
  X.show(plus, 7, { f: 0.45, type: 'pop', out: 11 });
  X.stream(spIn, { n: 4, speed: 0.6, r: 8, color: C.plum, k0: 7, f0: 0.15, k1: 11 });
  X.stream(spOut, { n: 4, speed: 0.6, r: 8, color: C.blue, k0: 7, f0: 0.4, k1: 11 });
  const mixLab = X.text(960, 610, '', { size: 24, anchor: 'middle', fill: C.ink2 });
  X.show(mixLab, 7, { f: 0.2, type: 'fade', out: 8 });
  mixLab.set('right half + key');

  // round counter
  const ctr = X.g();
  X.show(ctr, 9, { type: 'down', out: 11, outLen: 0.5 });
  X.rect(700, 150, 520, 74, { parent: ctr, fill: C.ochreL, stroke: C.ochre, r: 37 });
  const ctrT = X.text(960, 199, '', { parent: ctr, size: 34, anchor: 'middle', w: 700, serif: true });
  const dots = [];
  for (let i = 0; i < 10; i++) dots.push(X.circle(960 + (i - 4.5) * 34, 256, 10, { parent: ctr, fill: C.sand, stroke: C.ochre, sw: 2 }));
  X.term(9, 'Round', 'One pass of the shuffle: mix the right half\ninto the left half, then swap the halves.', { until: 10 });

  // the result after ten rounds and the reverse arrow (cue 10)
  const res = X.g();
  X.show(res, 10, { f: 0.05, type: 'pop', out: 10, outf: 0.5 });
  X.rect(560, 270, 800, 70, { parent: res, fill: C.card, r: 35, shadow: true });
  X.text(960, 316, 'after 10 rounds: looks completely random', { parent: res, size: 30, anchor: 'middle', w: 600 });
  const rev = X.g();
  X.show(rev, 10, { f: 0.45, type: 'fade', out: 11 });
  const revA = X.path('M668,160 A34,34 0 1,0 668,214', { parent: rev, color: C.green, sw: 6 });
  E('path', { d: 'M668,148 L684,162 L666,174 Z', fill: C.green }, rev);
  X.show(revA, 10, { f: 0.45, type: 'draw', len: 0.8 });
  X.text(1310, 197, 'with the key: run it backwards', { parent: rev, size: 28, w: 600, fill: C.green });
  const rk = X.icon('key', 1265, 186, 0.42, { parent: rev });
  X.bob(rk.mid, { amp: 4, per: 1.5 });

  // the Feistel state machine: rp = rounds completed (continuous)
  const rpAt = () => {
    const t = X.t;
    if (t < X.at(7, 0.2)) return 0;
    if (t < X.at(8)) return 0.45 * X.L(7, 0.2, 0.8);
    if (t < X.at(9)) return 0.45 + 0.55 * X.L(8, 0.05, 0.85);
    if (t < X.at(10)) return 1 + 9 * X.L(9, 0.12, 0.97);
    return 10 - 10 * X.L(10, 0.5, 0.97);
  };
  X.each(t => {
    const rp = rpAt();
    let L, Rv, sw = 0, flash = 0;
    if (rp >= 10) { L = R[10][0]; Rv = R[10][1]; }
    else {
      const r = Math.floor(rp) + 1, ph = rp - Math.floor(rp);
      L = ph >= 0.35 ? R[r][1] : R[r - 1][0];
      Rv = R[r - 1][1];
      sw = ease(clamp((ph - 0.45) / 0.5));
      flash = ph > 0.3 && ph < 0.5 ? 1 : 0;
    }
    const s = Math.sin(Math.PI * sw);
    PL.g.setAttribute('transform', `translate(${lerp(LX, RX, sw).toFixed(1)} ${(PY - 80 * s).toFixed(1)})`);
    PR.g.setAttribute('transform', `translate(${lerp(RX, LX, sw).toFixed(1)} ${(PY + 60 * s).toFixed(1)})`);
    if (PL.t.textContent !== L) PL.t.textContent = L;
    if (PR.t.textContent !== Rv) PR.t.textContent = Rv;
    PL.top.setAttribute('fill', flash ? C.ochreL : C.card);
    labL.style.opacity = labR.style.opacity = (1 - s).toFixed(2);
    // counter
    const back = t >= X.at(10);
    const r = Math.min(10, Math.max(1, Math.ceil(rp - 1e-6)));
    ctrT.set(back ? (rp < 0.02 ? 'Back to the start' : `Backwards: round ${r}`) : `Round ${Math.max(1, Math.min(10, Math.floor(rp + 0.55)))} of 10`);
    const done = back ? Math.ceil(rp - 1e-6) : Math.floor(rp + 0.55);
    dots.forEach((d, i) => d.c.setAttribute('fill', i < done ? C.ochre : C.sand));
    const act = X.t > X.at(7) && X.t < X.at(11);
    mg.mid.setAttribute('transform', `rotate(${act ? (t * 160) % 360 : 0} 920 700)`);
    mg2.mid.setAttribute('transform', `rotate(${act ? (-t * 220) % 360 : 0} 1005 700)`);
  });

  // ---------- Stage E: only the bank can go back (cue 11) ----------
  const Eg = X.g();
  X.show(Eg, 11, { f: 0.1, type: 'up' });
  X.text(470, 270, 'token', { parent: Eg, size: 26, anchor: 'middle', fill: C.ink2 });
  X.digits(470, 290, tok, { groups: [4, 4, 4], cw: 36, ch: 52, size: 26, gap: 4, groupGap: 14, parent: Eg, color: C.teal, stroke: C.teal });
  const bk = X.icon('bank', 960, 300, 0.85, { parent: Eg });
  const bkey = X.icon('key', 1050, 380, 0.42, { parent: Eg });
  X.bob(bkey.mid, { amp: 4, per: 1.6 });
  X.text(960, 420, 'the bank, with the key', { parent: Eg, size: 26, anchor: 'middle', w: 600 });
  const a1 = X.arrow(730, 316, 860, 316, { parent: Eg, sw: 4 }); X.show(a1, 11, { f: 0.25, type: 'draw' });
  const a2 = X.arrow(1060, 316, 1190, 316, { parent: Eg, sw: 4, color: C.green }); X.show(a2, 11, { f: 0.4, type: 'draw' });
  const realG = X.g(Eg);
  X.text(1450, 270, 'real number', { parent: realG, size: 26, anchor: 'middle', fill: C.green });
  X.digits(1450, 290, aad, { groups: [4, 4, 4], cw: 36, ch: 52, size: 26, gap: 4, groupGap: 14, parent: realG, fill: C.greenL, stroke: C.green });
  X.show(realG, 11, { f: 0.45, type: 'left' });
  const thief = X.person(560, 860, { hood: C.ink, shirt: C.ink2, skin: C.skin[3], s: 0.85 });
  X.show(thief, 11, { f: 0.55, type: 'right' });
  X.each(() => { if (X.t > X.at(11, 0.6)) thief.mood('sad'); });
  const noG = X.g(Eg);
  X.icon('lock', 900, 720, 0.8, { parent: noG });
  X.text(980, 712, 'anyone else: no key,', { parent: noG, size: 28, w: 600 });
  X.text(980, 750, 'no way back', { parent: noG, size: 28, w: 600, fill: C.red });
  X.show(noG, 11, { f: 0.65, type: 'up' });
  X.arrow(640, 700, 830, 715, { parent: noG, color: C.red, sw: 4, dash: '8 8' });

  X.recap(12, ['FF1 scrambles digits into digits, with a key', 'It shuffles two halves, ten times', 'With the key, it can always be reversed']);
});
