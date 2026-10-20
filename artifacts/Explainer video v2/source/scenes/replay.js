// What if Aran had been there? A rewind through the real cases; each card flips to show the Aran part that would have helped.
scene('replay', X => {
  const CW = 440, CH = 560, CY = 520, SP = 520, X0 = 700;
  const cards = [
    { year: '2019', title: ['SBI'], icon: 'chat', front: ['A server holding customer', 'text messages was left', 'open, with no password.'],
      bicon: 'key', back: ['Account numbers in stored', 'copies would be tokens.', 'The ledger stops partial', 'numbers adding up.'], badge: 'tokens + leakage ledger' },
    { year: '2020', title: ['Juspay'], icon: 'card', front: ['Masked card data, joined', 'with emails and phones,', 'sold on the dark web.'],
      bicon: 'scale', back: ['The ledger counts exactly', 'this kind of joining. Card', 'tokens fail the Luhn check:', 'no real number left.'], badge: 'ledger + Luhn-failing tokens' },
    { year: '2021', title: ['SITA, for Air India'], icon: 'building', front: ['The airline\'s vendor was', 'attacked: data on 4.5', 'million passengers stolen.'],
      bicon: 'magnifier', back: ['The vendor would hold', 'tokens made only for it.', 'Stolen tokens are useless,', 'and the trace names it.'], badge: 'per-vendor tokens + trace' },
    { year: '2023 · 2024', title: ['Star Health and', 'vaccination data'], icon: 'file', front: ['Records sold through', 'Telegram bots.'],
      bicon: 'key', back: ['Buyers would get worthless', 'look-alikes. Each token', 'points back to the system', 'that leaked it.'], badge: 'tokens + trace' },
    { year: 'what if', title: ['An insider'], icon: 'person', front: ['A staff member pulls out', 'real records in bulk.'], dashed: true,
      bicon: 'alert', back: ['Every swap-back is logged', 'with a name, and the', 'immune layer flags', 'the unusual rush.'], badge: 'swap-back log + immune alert' },
    { year: '2018 · 2019', title: ['Twitter and', 'Facebook'], icon: 'log', front: ['Passwords written into', 'logs and internal systems', 'in plain text.'],
      bicon: 'log', back: ['Aran guards IDs and cards,', 'not passwords. But the', 'lesson is Aran\'s own: clean', 'data before the log stores it.'], badge: 'log cleaning' },
    { year: '2023', title: ['Samsung'], icon: 'chat', front: ['Staff pasted secret code', 'into an AI chatbot.'],
      bicon: 'shield', back: ['For a bank, the AI gateway', 'turns customer details', 'into placeholders before', 'anything leaves.'], badge: 'AI gateway' },
    { year: '2016', title: ['Hitachi Payment', 'Services'], icon: 'alert', front: ['Malware inside a payment', 'system exposed about 3.2', 'million debit cards.'],
      bicon: 'lock', back: ['Malware inside a system', 'that needs real numbers is', 'a different problem. Copies', 'outside it hold only tokens.'], badge: 'not what Aran stops', grey: true }
  ];
  const flips = [];
  cards.forEach((c, i) => {
    const cx = X0 + i * SP, x = cx - CW / 2, y = CY - CH / 2;
    const k = i + 1;
    const outer = X.g();
    const front = X.g(outer), back = X.g(outer);
    // front
    X.rect(x, y, CW, CH, { parent: front, fill: C.card, r: 18, shadow: true, sw: 3, dash: c.dashed ? '12 9' : null });
    E('rect', { x, y, width: CW, height: 64, rx: 18, fill: c.dashed ? C.ochre : C.ink2 }, front);
    E('rect', { x, y: y + 40, width: CW, height: 24, fill: c.dashed ? C.ochre : C.ink2 }, front);
    X.text(cx, y + 44, c.year, { parent: front, size: 30, anchor: 'middle', serif: true, w: 700, fill: C.card });
    X.icon(c.icon, cx, y + 150, 0.72, { parent: front, fill: c.icon === 'alert' ? C.redL : undefined });
    X.text(cx, y + 262, c.title.join('\n'), { parent: front, size: 32, anchor: 'middle', serif: true, w: 700, lh: 38 });
    const fy = y + 262 + (c.title.length - 1) * 38 + 62;
    X.text(cx, fy, c.front.join('\n'), { parent: front, size: 24, anchor: 'middle', fill: C.ink2, lh: 33 });
    // back
    const col = c.grey ? C.ink3 : C.green, colL = c.grey ? C.sand : C.greenL;
    X.rect(x, y, CW, CH, { parent: back, fill: C.card, stroke: col, r: 18, shadow: true, sw: 4 });
    E('rect', { x, y, width: CW, height: 64, rx: 18, fill: col }, back);
    E('rect', { x, y: y + 40, width: CW, height: 24, fill: col }, back);
    X.text(cx, y + 44, c.grey ? 'Honestly:' : 'With Aran', { parent: back, size: 30, anchor: 'middle', serif: true, w: 700, fill: C.card });
    const bi = X.icon(c.bicon, cx, y + 150, 0.72, { parent: back, fill: c.grey ? C.sand : (c.bicon === 'alert' ? C.redL : undefined), color: c.grey ? C.ink3 : C.ink, check: true });
    X.bob(bi.mid, { amp: 5, per: 2.4, ph: i });
    X.text(cx, y + 262, c.back.join('\n'), { parent: back, size: 24, anchor: 'middle', fill: C.ink, lh: 34 });
    const bw = c.badge.length * 22 * 0.58 + 84;
    const badge = X.g(back);
    X.rect(cx - bw / 2, y + CH - 92, bw, 56, { parent: badge, fill: colL, stroke: col, r: 28, sw: 3 });
    if (c.grey) E('circle', { cx: cx - bw / 2 + 30, cy: y + CH - 64, r: 9, fill: 'none', stroke: col, 'stroke-width': 3 }, badge);
    else E('path', { d: `M${cx - bw / 2 + 20},${y + CH - 64} l7,8 l13,-15`, fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, badge);
    X.text(cx + 16, y + CH - 56, c.badge, { parent: badge, size: 22, anchor: 'middle', w: 700, fill: c.grey ? C.ink2 : C.green });
    X.pulse(badge, cx, y + CH - 64, k, { f: 0.62, amt: 0.15 });
    X.show(outer, 0, { f: 0.1 + (7 - i) * 0.07, type: 'right', dist: 120, len: 0.6 });
    flips.push({ front, back, cx, k, f: i === 7 ? 0.3 : 0.4 });
  });
  X.each(() => flips.forEach(fl => {
    const p = X.P(fl.k, fl.f, 0, 0.9);
    const sx = Math.cos(Math.PI * p);
    const s = Math.max(0.02, Math.abs(sx)).toFixed(3);
    const tr = `translate(${fl.cx} 0) scale(${s} 1) translate(${-fl.cx} 0)`;
    fl.front.setAttribute('transform', tr); fl.back.setAttribute('transform', tr);
    fl.front.style.display = p < 0.5 ? '' : 'none';
    fl.back.style.display = p >= 0.5 ? '' : 'none';
  }));
  // a "spotlight" bar under the card being discussed
  const spot = X.g();
  const spotR = E('rect', { x: -CW / 2, y: CY + CH / 2 + 24, width: CW, height: 10, rx: 5, fill: C.ochre }, spot);
  X.show(spot, 1, { type: 'fade', out: 8, outf: 0.8 });
  X.each(t => {
    let i = 0;
    for (let k = 1; k <= 8; k++) if (t >= X.at(k)) i = k - 1;
    const prev = Math.max(0, i - 1), p = ease(clamp((t - X.at(i + 1)) / 1.2));
    spotR.setAttribute('transform', `translate(${lerp(X0 + prev * SP, X0 + i * SP, i === 0 ? 1 : p).toFixed(1)} 0)`);
  });

  // ---- rewind overlay (screen space) during line 0 ----
  const ov = E('g', null, X.root.parentNode);
  X.rect(700, 150, 520, 84, { parent: ov, fill: C.card, r: 42, shadow: true });
  const rw = E('g', null, ov);
  E('path', { d: 'M790,170 L750,192 L790,214 Z M830,170 L790,192 L830,214 Z', fill: C.ink }, rw);
  const yr = X.text(1010, 206, '2026', { parent: ov, size: 44, anchor: 'middle', serif: true, w: 700 });
  X.text(1150, 204, 'rewind', { parent: ov, size: 22, anchor: 'middle', fill: C.ink2, w: 700 });
  X.show(ov, 0, { type: 'down', out: 1, outLen: 0.6 });
  X.each(t => {
    const p = X.L(0, 0.1, 0.75);
    yr.set(String(Math.round(2026 - 10 * easeOut(p))));
    rw.setAttribute('transform', `translate(${(-8 * Math.abs(Math.sin(t * 6))).toFixed(1)} 0)`);
  });
  const q = X.text(X0 + 3.5 * SP, 1000, 'What would Aran have changed?', { size: 110, anchor: 'middle', serif: true, w: 700, fill: C.ink2 });
  X.show(q, 0, { f: 0.55, type: 'up', out: 1 });

  // ---- words ----
  X.term(1, 'Leakage ledger', 'A running record of what each destination has\nseen, so partial numbers cannot add up.', { until: 2, f: 0.45, color: C.green });
  X.term(2, 'Luhn check', 'The check-digit recipe for card numbers.\nAran\'s card tokens fail it on purpose.', { until: 3, f: 0.45, color: C.green });
  X.term(3, 'Trace', 'Reading a leaked token to find which\ndestination it was made for.', { until: 4, f: 0.45, color: C.green });
  X.term(5, 'Immune layer', 'The part of Aran that learns normal traffic\nand raises an alert when something is strange.', { until: 6, f: 0.45, color: C.plum });
  X.term(7, 'AI gateway', 'A gate that swaps details for placeholders\nbefore a prompt leaves the bank.', { until: 8, f: 0.45, color: C.teal });

  X.recap(9, ['Most leaks came through side doors Aran guards', 'Tokens, ledger, trace, immune layer, AI gateway', 'Where Aran cannot help, it says so plainly']);

  const cams = [{ x: X0 + 3.5 * SP, y: 560, s: 0.42 }];
  cards.forEach((c, i) => cams.push({ k: i + 1, x: X0 + i * SP, y: 540, s: 1.22, len: i === 0 ? 1.8 : 1.3 }));
  cams.push({ k: 8, f: 0.82, x: X0 + 3.5 * SP, y: 540, s: 0.44, len: 1.8 });
  X.cam(cams);
});
