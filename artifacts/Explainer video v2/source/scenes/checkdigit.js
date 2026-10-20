// Check digits as a lock and key: the last digit is the lock, the other eleven are the key.
scene('checkdigit', X => {
  X.cam([{ x: 960, y: 420, s: 1.12 }, { k: 3, x: 960, y: 560, s: 1, len: 1.6 }, { k: 5, x: 960, y: 520, s: 1.02 }]);
  const good = '234567890124', bad = '234561890124';
  const row = X.digits(960, 190, good, { groups: [4, 4, 4], cw: 70, ch: 92, size: 50, gap: 8, groupGap: 30 });
  X.show(row, 0, { type: 'up' });
  const last = row.cells[11];
  X.each(() => {
    const on = X.t > X.at(0, 0.4);
    row.paint(11, on ? C.ochreL : C.card, on ? C.ochre : C.line);
    const typo = X.t > X.at(5, 0.5);
    row.set(typo ? bad : good);
    row.paint(5, typo ? C.redL : C.card, typo ? C.red : C.line, typo ? C.red : C.ink);
  });
  // bouncing pointer above the last digit
  const ptr = X.g();
  E('path', { d: `M${last.cx - 16},150 L${last.cx + 16},150 L${last.cx},176 Z`, fill: C.ochre }, ptr);
  X.show(X.wrap(ptr), 0, { f: 0.4, type: 'down', out: 3 });
  X.bob(ptr, { amp: 7, per: 1.1 });
  const lab = X.text(last.x + last.w + 22, 248, 'check digit', { size: 30, fill: C.ochre, w: 700 });
  X.show(lab, 2, { type: 'up' });
  const brace = X.path(`M${row.cells[0].x},300 Q${row.cells[0].x},318 ${row.cells[0].x + 20},318 L${row.cells[10].x + 50},318 Q${row.cells[10].x + 70},318 ${row.cells[10].x + 70},300`, { color: C.ink3, sw: 3 });
  X.show(brace, 1, { type: 'draw' });
  const bl = X.text((row.cells[0].x + row.cells[10].x + 70) / 2, 352, 'the other eleven digits', { anchor: 'middle', size: 24, fill: C.ink2 });
  X.show(bl, 1, { f: 0.3, type: 'up' });

  // recipe machine: digits flow in, the check digit comes out
  const mach = X.g();
  X.rect(820, 430, 280, 150, { parent: mach, fill: C.sand, r: 20 });
  X.text(960, 560, 'fixed recipe', { parent: mach, size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  const gear1 = X.icon('gear', 920, 495, 0.75, { parent: mach });
  const gear2 = X.icon('gear', 1000, 495, 0.55, { parent: mach, fill: C.ochreL });
  X.spin(gear1.mid, 920, 495, { speed: 60 });
  X.spin(gear2.mid, 1000, 495, { speed: -80 });
  X.show(X.wrap(mach), 1, { type: 'pop', out: 3, outLen: 0.6 });
  for (let i = 0; i < 11; i++) {
    const c = row.cells[i];
    const sp = spline([[c.cx, 290], [lerp(c.cx, 960, 0.5), 380], [960, 440]]);
    const dot = X.g(); E('text', { x: 0, y: 10, 'font-size': 28, 'font-weight': 700, fill: C.blue, 'text-anchor': 'middle', 'font-family': F.mono }, dot).textContent = good[i];
    X.show(dot, 1, { f: 0.1 + i * 0.03, type: 'fade', len: 0.2, out: 1, outf: 0.45 + i * 0.03, outLen: 0.15 });
    X.travel(dot, sp, 1, { f0: 0.1 + i * 0.03, f1: 0.45 + i * 0.03 });
  }
  const outD = X.g(); E('text', { x: 0, y: 12, 'font-size': 40, 'font-weight': 700, fill: C.ochre, 'text-anchor': 'middle', 'font-family': F.mono }, outD).textContent = '4';
  X.show(outD, 1, { f: 0.6, type: 'fade', len: 0.2, out: 2, outf: 0.3, outLen: 0.2 });
  X.travel(outD, spline([[1100, 500], [1300, 420], [last.cx, 300]]), 1, { f0: 0.62, f1: 0.95 });
  X.term(2, 'Check digit', 'One extra digit calculated from all the other digits,\nadded at the end to catch mistakes.', { until: 4 });

  // lock and key
  const keyG = X.g();
  const keyInner = X.g(keyG);
  E('circle', { cx: 0, cy: 0, r: 46, fill: C.blueL, stroke: C.ink, 'stroke-width': 6 }, keyInner);
  E('circle', { cx: 0, cy: 0, r: 14, fill: C.bg, stroke: C.ink, 'stroke-width': 4 }, keyInner);
  E('rect', { x: 42, y: -14, width: 330, height: 28, rx: 8, fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, keyInner);
  E('path', { d: 'M300,14 L300,44 L322,44 L322,14 M340,14 L340,36 L360,36 L360,14', fill: C.blueL, stroke: C.ink, 'stroke-width': 5 }, keyInner);
  const keyTxt = E('text', { x: 196, y: 9, 'font-size': 27, 'font-weight': 700, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.mono, 'letter-spacing': 1 }, keyInner);
  X.show(keyG, 3, { type: 'left' });
  const lockG = X.g();
  const shackle = E('path', { d: 'M-50,-40 L-50,-90 Q-50,-140 0,-140 Q50,-140 50,-90 L50,-40', fill: 'none', stroke: C.ink, 'stroke-width': 14, 'stroke-linecap': 'round' }, lockG);
  E('rect', { x: -80, y: -44, width: 160, height: 130, rx: 18, fill: C.ochreL, stroke: C.ink, 'stroke-width': 6 }, lockG);
  E('text', { x: 0, y: 40, 'font-size': 68, 'font-weight': 700, fill: C.ochre, 'text-anchor': 'middle', 'font-family': F.mono }, lockG).textContent = '4';
  const lockW = X.wrap(lockG);
  lockG.setAttribute('transform', 'translate(1330,700)');
  X.show(lockW, 3, { f: 0.4, type: 'pop' });
  const kl = X.text(560, 860, 'key: the first eleven digits', { anchor: 'middle', size: 24, fill: C.ink2 });
  const ll = X.text(1330, 860, 'lock: the check digit', { anchor: 'middle', size: 24, fill: C.ink2 });
  X.show(kl, 3, { f: 0.3, type: 'up' }); X.show(ll, 3, { f: 0.5, type: 'up' });
  const okMark = X.mark(1520, 600, true, { s: 34 });
  X.show(okMark, 4, { f: 0.55, type: 'pop', out: 5, outf: 0.3 });
  const noMark = X.mark(1520, 600, false, { s: 34 });
  X.show(noMark, 6, { f: 0.5, type: 'pop' });
  X.each(t => {
    const typo = t > X.at(5, 0.5);
    keyTxt.textContent = (typo ? bad : good).slice(0, 11);
    keyTxt.setAttribute('fill', typo ? C.red : C.ink);
    // slide the key into the lock during line 4, back out before line 6, try again during line 6
    let x = 360;
    if (t < X.at(5)) x = lerp(360, 760, X.P(4, 0, 0, 1.2));
    else if (t < X.at(6)) x = lerp(760, 360, X.P(5, 0, 0, 0.8));
    else x = lerp(360, 740, X.P(6, 0, 0, 1.0));
    let jig = 0;
    if (t > X.at(6, 0.35) && t < X.at(6, 0.35) + 0.8) jig = 8 * Math.sin((t - X.at(6, 0.35)) * 40);
    keyInner.setAttribute('transform', `translate(${x + jig} 700)`);
    // shackle lifts when the right key turns
    const open = t < X.at(5) ? X.P(4, 0.45, 0, 0.5) : 1 - X.P(5, 0, 0, 0.4);
    shackle.setAttribute('transform', `translate(0 ${(-38 * open).toFixed(1)})`);
  });

  // the clerk who makes a typo
  const clerk = X.person(150, 930, { shirt: C.plum, skin: C.skin[2], long: true, s: 0.8, name: '' });
  X.show(clerk, 5, { type: 'right', out: 8 });
  X.talk(clerk, [5]);
  // the computer's message
  const msg = X.g();
  X.rect(1180, 380, 600, 110, { parent: msg, fill: C.redL, stroke: C.red, r: 16 });
  X.text(1480, 428, 'This number is not valid.', { parent: msg, size: 30, anchor: 'middle', w: 700, fill: C.red });
  X.text(1480, 466, 'Please check and type it again.', { parent: msg, size: 23, anchor: 'middle', fill: C.ink2 });
  X.show(msg, 7, { type: 'down' });
  X.recap(9, ['The check digit is a lock', 'The other eleven digits are the key', 'One wrong digit: the lock stays shut']);
  X.term(8, 'Checksum', 'Testing a number by redoing the check-digit\nrecipe and seeing if the answer matches.', { until: 9 });
});
