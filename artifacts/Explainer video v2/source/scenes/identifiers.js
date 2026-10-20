// The identifiers Aran protects, one at a time on a big card, each with its anatomy animated.
scene('identifiers', X => {
  X.cam([{ x: 620, y: 500, s: 1.2 }, { k: 1, x: 960, y: 530, s: 1.0, len: 1.6 }, { k: 2, f: 0.1, x: 1220, y: 520, s: 1.16 },
    { k: 3, x: 960, y: 530, s: 1.0 }, { k: 6, x: 1120, y: 540, s: 1.08 }, { k: 7, x: 960, y: 530, s: 1.0 },
    { k: 9, x: 1130, y: 600, s: 1.08 }, { k: 10, x: 960, y: 530, s: 1.0 }, { k: 12, f: 0.1, x: 1110, y: 560, s: 1.06 }]);
  const CX = 1127; // card centre

  // ---- the rail: six kinds of detail
  const railItems = ['Aadhaar', 'PAN', 'Card number', 'UPI ID', 'OTP', 'Mobile, name, address'];
  const rail = railItems.map((lab, i) => {
    const y = 200 + i * 112;
    const g = X.g();
    const r = X.rect(60, y, 345, 84, { parent: g, r: 16, shadow: true });
    const c = E('circle', { cx: 104, cy: y + 42, r: 22, fill: C.sand, stroke: C.line, 'stroke-width': 2 }, g);
    const n = X.text(104, y + 51, String(i + 1), { parent: g, size: 24, anchor: 'middle', w: 700, fill: C.ink2 });
    X.text(142, y + 51, lab, { parent: g, size: 23, w: 600 });
    X.show(g, 0, { f: 0.12 + i * 0.12, type: 'left' });
    return { r, c, n };
  });
  const segOf = t => (t < X.at(1) ? -1 : t < X.at(3) ? 0 : t < X.at(5) ? 1 : t < X.at(7) ? 2 : t < X.at(8) ? 3 : t < X.at(10) ? 4 : t < X.at(11) ? 5 : 6);
  X.each(t => {
    const cur = segOf(t);
    rail.forEach((it, i) => {
      const on = i === cur, done = i < cur;
      it.r.r.setAttribute('fill', on ? C.ochreL : C.card);
      it.r.r.setAttribute('stroke', on ? C.ochre : C.line);
      it.r.r.setAttribute('stroke-width', on ? 4 : 2);
      it.c.setAttribute('fill', done ? C.greenL : on ? C.ochre : C.sand);
      it.c.setAttribute('stroke', done ? C.green : on ? C.ochre : C.line);
      it.n.t.setAttribute('fill', done ? C.green : on ? C.card : C.ink2);
    });
  });
  // a magnifier tours the rail during cue 0
  const mag = X.icon('magnifier', 0, 0, 0.5);
  X.show(X.wrap(mag), 0, { f: 0.1, type: 'fade', out: 1, outLen: 0.4 });
  X.each(t => { const p = X.L(0, 0.1, 0.95); const y = 240 + p * 560 + 6 * Math.sin(t * 5); mag.mid.setAttribute('transform', `translate(${430 + 10 * Math.sin(t * 3)} ${y.toFixed(1)})`); });
  const intro = X.text(760, 520, 'six kinds of\nprivate detail', { size: 44, serif: true, w: 600, fill: C.ink2 });
  X.show(intro, 0, { f: 0.3, type: 'up', out: 1, outLen: 0.4 });

  // ---- the big card frame
  const frame = X.rect(432, 180, 1390, 700, { r: 26, shadow: 8 });
  X.show(frame, 1, { type: 'pop', len: 0.6 });
  const header = (g, title, sub, icon, iconOpt) => {
    X.text(480, 268, title, { parent: g, size: 52, serif: true, w: 600 });
    X.text(482, 314, sub, { parent: g, size: 28, fill: C.ink2 });
    const ic = X.icon(icon, 1700, 262, 0.8, Object.assign({ parent: g }, iconOpt || {}));
    X.bob(ic.mid, { amp: 5, per: 2.8 });
  };
  const brace = (g, x0, x1, y, col, label, k, f, size = 28) => {
    const b = X.path(`M${x0},${y} Q${x0},${y + 18} ${x0 + 18},${y + 18} L${x1 - 18},${y + 18} Q${x1},${y + 18} ${x1},${y}`, { parent: g, color: col, sw: 4 });
    X.show(b, k, { f, type: 'draw', len: 0.6 });
    const t = X.text((x0 + x1) / 2, y + 60, label, { parent: g, size, anchor: 'middle', fill: col, w: 600 });
    X.show(t, k, { f: f + 0.05, type: 'up' });
    return t;
  };

  // ---- 1 Aadhaar (cues 1, 2)
  const A = X.g();
  X.show(A, 1, { type: 'up', out: 3, outLen: 0.4 });
  header(A, 'Aadhaar', "India's national identity number", 'idcard', { accent: C.ochreL });
  const ad = X.digits(CX, 400, '234567890124', { groups: [4, 4, 4], cw: 84, ch: 110, size: 62, gap: 10, groupGap: 40, parent: A });
  ad.cells.forEach((c, i) => X.show(c.g, 1, { f: 0.2 + i * 0.04, type: 'pop', len: 0.4 }));
  const adCnt = X.text(CX, 600, '', { parent: A, size: 34, anchor: 'middle', w: 600, fill: C.ink2 });
  X.each(t => { const n = Math.max(0, Math.min(12, Math.floor(X.L(1, 0.2, 0.68) * 12 + (t > X.at(1, 0.2) ? 1 : 0)))); adCnt.set(n ? n + (n === 12 ? ' digits' : '') : ''); });
  const adBr = X.path(`M${ad.x0},532 Q${ad.x0},550 ${ad.x0 + 18},550 L${ad.x0 + ad.total - 18},550 Q${ad.x0 + ad.total},550 ${ad.x0 + ad.total},532`, { parent: A, color: C.ink3, sw: 3 });
  X.show(adBr, 1, { f: 0.7, type: 'draw' });
  const last = ad.cells[11];
  X.each(t => { const on = t > X.at(2, 0.05); ad.paint(11, on ? C.ochreL : C.card, on ? C.ochre : C.line, on ? C.ochre : C.ink); last.r.setAttribute('stroke-width', on ? 5 : 2); });
  const ring = E('rect', { x: last.x - 9, y: 391, width: last.w + 18, height: 128, rx: 16, fill: 'none', stroke: C.ochre, 'stroke-width': 4 }, A);
  X.each(t => { const p = X.on(2, 3) ? (t - X.at(2, 0.05)) : -1; const a = p > 0 ? 0.25 + 0.75 * Math.abs(Math.sin(p * 2.6)) : 0; ring.setAttribute('opacity', a.toFixed(2)); const s = p > 0 ? 1 + 0.06 * Math.abs(Math.sin(p * 2.6)) : 1; ring.setAttribute('transform', `translate(${last.cx} 455) scale(${s.toFixed(3)}) translate(${-last.cx} -455)`); });
  const ptr = X.g(A); const ptrIn = X.g(ptr);
  E('path', { d: `M${last.cx - 18},${340} L${last.cx + 18},${340} L${last.cx},${370} Z`, fill: C.ochre }, ptrIn);
  X.show(ptr, 2, { f: 0.08, type: 'down' });
  X.bob(ptrIn, { amp: 7, per: 1.1 });
  const keyG = X.g(A);
  X.icon('key', 1290, 700, 0.8, { parent: keyG });
  X.text(1380, 690, 'remember this digit:', { parent: keyG, size: 30, fill: C.ochre, w: 700 });
  X.text(1380, 730, 'it is the key to the project', { parent: keyG, size: 26, fill: C.ink2 });
  X.show(keyG, 2, { f: 0.35, type: 'up' });
  X.term(1, 'Aadhaar', "India's 12-digit national identity number,\ngiven to every resident.", { until: 3 });

  // ---- 2 PAN (cues 3, 4)
  const Pg = X.g();
  X.show(Pg, 3, { type: 'up', out: 5, outLen: 0.4 });
  header(Pg, 'PAN', 'Permanent Account Number · used for income tax', 'idcard', { accent: C.plumL, fill: C.paper });
  const pan = X.digits(CX, 400, 'ABCPK1234L', { groups: [5, 4, 1], cw: 96, ch: 120, size: 64, gap: 10, groupGap: 44, parent: Pg });
  pan.cells.forEach((c, i) => X.show(c.g, 3, { f: 0.25 + i * 0.05, type: 'pop', len: 0.4 }));
  const pcol = [C.blue, C.teal, C.plum], pfill = [C.blueL, C.tealL, C.plumL];
  X.each(t => {
    for (let i = 0; i < 10; i++) {
      const gi = i < 5 ? 0 : i < 9 ? 1 : 2;
      const on = t > X.at(4, [0.18, 0.45, 0.72][gi]);
      pan.paint(i, on ? pfill[gi] : C.card, on ? pcol[gi] : C.line, on ? pcol[gi] : C.ink);
    }
  });
  const pc = pan.cells;
  brace(Pg, pc[0].x, pc[4].x + pc[4].w, 545, C.blue, '5 letters', 4, 0.18);
  brace(Pg, pc[5].x, pc[8].x + pc[8].w, 545, C.teal, '4 digits', 4, 0.45);
  brace(Pg, pc[9].x - 14, pc[9].x + pc[9].w + 14, 545, C.plum, '1 letter', 4, 0.72);
  const pTen = X.chip(CX, 730, '10 characters', { size: 30, parent: Pg, fill: C.paper });
  X.show(pTen, 4, { f: 0.05, type: 'pop' });
  X.term(3, 'PAN', 'Permanent Account Number: a 10-character\nnumber for paying income tax.', { until: 5 });

  // ---- 3 Payment card (cues 5, 6)
  const Cg = X.g();
  X.show(Cg, 5, { type: 'up', out: 7, outLen: 0.4 });
  header(Cg, 'Payment card number', 'on a debit or credit card', 'card');
  const cd = X.digits(CX, 410, '••••••••••••••••', { groups: [4, 4, 4, 4], cw: 62, ch: 96, size: 46, gap: 7, groupGap: 30, parent: Cg });
  cd.cells.forEach((c, i) => X.show(c.g, 5, { f: 0.25 + i * 0.03, type: 'pop', len: 0.35 }));
  const cdCnt = X.text(CX, 570, '', { parent: Cg, size: 32, anchor: 'middle', w: 600, fill: C.ink2 });
  X.each(t => { if (t < X.at(6)) { const n = Math.min(16, Math.floor(X.L(5, 0.25, 0.75) * 16 + (t > X.at(5, 0.25) ? 1 : 0))); cdCnt.set(n ? n + (n === 16 ? ' digits, usually' : '') : ''); } else cdCnt.set(''); });
  X.each(t => {
    for (let i = 0; i < 16; i++) {
      const iss = i < 6 ? t > X.at(6, 0.1 + i * 0.03) : (i < 8 ? t > X.at(6, 0.3) : false);
      const lastOn = i === 15 && t > X.at(6, 0.65);
      if (lastOn) cd.paint(i, C.ochreL, C.ochre, C.ochre);
      else if (iss) cd.paint(i, i < 6 ? C.blueL : C.paper, C.blue, C.blue);
      else cd.paint(i, C.card, C.line, C.ink);
      cd.cells[i].r.setAttribute('stroke-dasharray', iss && i >= 6 ? '6 5' : 'none');
    }
  });
  const cc = cd.cells;
  const issG = X.g(Cg);
  const issBr = X.path(`M${cc[0].x},${560} Q${cc[0].x},${578} ${cc[0].x + 18},${578} L${cc[7].x + cc[7].w - 18},${578} Q${cc[7].x + cc[7].w},${578} ${cc[7].x + cc[7].w},${560}`, { parent: issG, color: C.blue, sw: 4 });
  X.show(issBr, 6, { f: 0.15, type: 'draw' });
  const issT = X.g(issG);
  X.icon('bank', cc[3].cx + 20, 680, 0.6, { parent: issT });
  X.text(cc[3].cx + 90, 668, 'first 6 to 8 digits:', { parent: issT, size: 28, fill: C.blue, w: 700 });
  X.text(cc[3].cx + 90, 706, 'the bank that issued the card', { parent: issT, size: 26, fill: C.ink2 });
  X.show(issT, 6, { f: 0.22, type: 'up' });
  const cdPtr = X.g(Cg); const cdPtrIn = X.g(cdPtr);
  E('path', { d: `M${cc[15].cx - 16},548 L${cc[15].cx + 16},548 L${cc[15].cx},520 Z`, fill: C.ochre }, cdPtrIn);
  X.text(cc[15].cx, 584, 'special', { parent: cdPtrIn, size: 26, anchor: 'middle', fill: C.ochre, w: 700 });
  X.show(cdPtr, 6, { f: 0.65, type: 'up' });
  X.bob(cdPtrIn, { amp: 6, per: 1.1 });
  X.term(5, 'Card number', 'The long number on a debit or credit card\nthat identifies the card and its bank.', { until: 6 });
  X.term(6, 'Issuer', 'The bank that gave out the card.\nThe first digits say which bank it is.', { f: 0.15, until: 7 });

  // ---- 4 UPI ID (cue 7, long)
  const U = X.g();
  X.show(U, 7, { type: 'up', out: 8, outLen: 0.4 });
  header(U, 'UPI ID', 'an address for paying with a phone app', 'phone');
  const uPhone = X.g(U);
  X.icon('phone', 600, 560, 1.5, { parent: uPhone, screen: C.greenL });
  X.text(600, 500, 'Pay', { parent: uPhone, size: 26, anchor: 'middle', w: 700, fill: C.green });
  X.text(600, 545, '₹ 500', { parent: uPhone, size: 26, anchor: 'middle', w: 700 });
  X.show(uPhone, 7, { f: 0.05, type: 'left' });
  const uBank = X.g(U);
  X.icon('bank', 1640, 560, 0.85, { parent: uBank });
  X.text(1640, 650, "Ravi's account", { parent: uBank, size: 26, anchor: 'middle', fill: C.ink2 });
  X.show(uBank, 7, { f: 0.08, type: 'right' });
  const coinSp = spline([[680, 600], [900, 700], [1300, 720], [1560, 600]]);
  const coinPath = X.path(coinSp.d, { parent: U, color: C.line, sw: 3, dash: '3 12' });
  X.show(coinPath, 7, { f: 0.1, type: 'fade' });
  X.stream(coinSp, { parent: U, n: 3, speed: 0.3, k0: 7, f0: 0.12, make: (g) => { const c = X.g(g); X.icon('coin', 0, 0, 0.36, { parent: c }); return c; } });
  const uid = X.g(U);
  X.text(CX - 130, 470, 'ravi', { parent: uid, size: 76, mono: true, w: 700, anchor: 'end', fill: C.ink });
  X.text(CX - 130, 470, '@oksbi', { parent: uid, size: 76, mono: true, w: 700, fill: C.teal });
  X.show(uid, 7, { f: 0.22, type: 'pop' });
  // 'ravi' = 4 chars x 45.8 px; '@oksbi' = 6 chars
  const cw76 = 76 * 0.602;
  const ux0 = CX - 130 - 4 * cw76, ux1 = CX - 130, ux2 = CX - 130 + 6 * cw76;
  brace(U, ux0, ux1 - 8, 492, C.ink2, 'who', 7, 0.5, 26);
  brace(U, ux1 + 8, ux2, 492, C.teal, 'which bank app', 7, 0.58, 26);
  const emailG = X.g(U);
  X.icon('envelope', 840, 800, 0.55, { parent: emailG });
  X.text(890, 811, 'looks like an email address: name @ provider', { parent: emailG, size: 28, fill: C.ink2 });
  X.show(emailG, 7, { f: 0.72, type: 'up' });
  X.term(7, 'UPI ID', 'Unified Payments Interface ID: the address\nyou pay to with a phone payment app.', { until: 8 });

  // ---- 5 OTP (cues 8, 9)
  const O = X.g();
  X.show(O, 8, { type: 'up', out: 10, outLen: 0.4 });
  header(O, 'OTP', 'One-Time Password, sent by SMS', 'chat', { fill: C.ochreL });
  const oPh = X.g(O); X.icon('phone', 560, 450, 1.0, { parent: oPh });
  X.show(oPh, 8, { f: 0.05, type: 'left' });
  const sms = X.g(O);
  X.rect(660, 360, 880, 160, { parent: sms, fill: C.ochreL, stroke: C.ochre, r: 24, shadow: true });
  E('path', { d: 'M664,470 L626,492 L664,500 Z', fill: C.ochreL, stroke: C.ochre, 'stroke-width': 2 }, sms);
  X.text(700, 410, 'SMS from your bank', { parent: sms, size: 24, fill: C.ink2, w: 600 });
  X.text(700, 472, 'Your OTP is', { parent: sms, size: 32, w: 600 });
  const otp = X.digits(920, 425, '482913', { anchor: 'start', cw: 70, ch: 84, size: 50, gap: 10, parent: sms, fill: C.card });
  X.show(sms, 8, { f: 0.12, type: 'right' });
  const clipId = 'otpclip_ids';
  const cp = E('clipPath', { id: clipId }, O);
  otp.cells.forEach(c => E('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 10 }, cp));
  otp.cells.forEach(c => { const w = E('g', { 'clip-path': `url(#${clipId})` }, c.g); w.appendChild(c.t); c.t2 = c.t.cloneNode(true); w.appendChild(c.t2); });
  const OTP = '482913';
  X.each(t => {
    otp.cells.forEach((c, i) => {
      const settle = X.at(8, 0.4 + i * 0.08);
      if (t < settle) {
        const sp = (t - X.at(8)) * 14 + i * 0.37;
        const dg = n => ((n * 7 + i * 3) % 10 + 10) % 10;
        const fr = sp % 1;
        c.t.textContent = String(dg(Math.floor(sp)));
        c.t2.textContent = String(dg(Math.floor(sp) + 1));
        c.t.setAttribute('transform', `translate(0 ${(fr * 84).toFixed(1)})`);
        c.t2.setAttribute('transform', `translate(0 ${(fr * 84 - 84).toFixed(1)})`);
        c.t2.style.display = '';
      } else {
        const b = clamp((t - settle) / 0.25);
        c.t.textContent = OTP[i];
        c.t2.style.display = 'none';
        c.t.setAttribute('transform', `translate(0 ${((1 - easeBack(b)) * -30).toFixed(1)})`);
      }
    });
  });
  const rnd = X.chip(1100, 600, '6 random digits · used once', { size: 28, parent: O, fill: C.paper });
  X.show(rnd, 8, { f: 0.85, type: 'pop', out: 9, outLen: 0.4 });
  X.term(8, 'OTP', 'One-time password: a short code sent by SMS,\nvalid for one login or payment only.', { until: 9 });
  // cue 9: six-digit numbers everywhere: which one is the OTP?
  const lines = [DATA.log[0][1].slice(0, 56), DATA.log[1][1].slice(0, 56), 'notify sms queued, msg: your code is 482913', DATA.log[3][1].slice(0, 56)];
  const TB = X.g(O);
  const fs = 25, cw = fs * 0.602, lx = 520, ly0 = 582;
  lines.forEach((ln, i) => {
    X.text(lx, ly0 + i * 70, ln, { parent: TB, size: fs, mono: true, fill: C.ink2, w: 500 });
    const re = /(^|[^0-9])([0-9]{6})(?![0-9])/g; let m;
    while ((m = re.exec(ln))) {
      const s = m.index + m[1].length;
      const bx = E('rect', { x: lx + s * cw - 4, y: ly0 + i * 70 - 28, width: 6 * cw + 8, height: 38, rx: 6, fill: 'none', stroke: C.ochre, 'stroke-width': 3, 'stroke-dasharray': '6 4' }, TB);
      const q = X.text(lx + s * cw + 3 * cw, ly0 + i * 70 - 34, '?', { parent: TB, size: 26, anchor: 'middle', fill: C.ochre, w: 700 });
      const tq = X.at(9, 0.25 + i * 0.1);
      X.each(t => { const a = clamp((t - tq) / 0.3); bx.setAttribute('opacity', a); q.setAttribute('opacity', a); });
    }
  });
  X.show(TB, 9, { type: 'fade' });
  const tbMag = X.icon('magnifier', 0, 0, 0.45, { parent: TB });
  X.each(t => { const p = X.L(9, 0.15, 0.95); const x = 760 + 360 * Math.sin(p * 7); const y = 582 + p * 210 - 30; tbMag.mid.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); });
  const hard = X.chip(CX, 852, 'no pattern, no check digit: the hardest to find', { size: 26, parent: TB, color: C.red, fill: C.redL, stroke: C.red });
  X.show(hard, 9, { f: 0.6, type: 'pop' });

  // ---- 6 mobile, name, address (cue 10)
  const M = X.g();
  X.show(M, 10, { type: 'up', out: 11, outLen: 0.4 });
  header(M, 'Mobile · name · address', 'everyday details that point to a person', 'person');
  [['phone', '98765 43210', true], ['person', 'Ravi Kumar', false], ['building', '12 Gandhi St, Madurai', false]].forEach(([ic, val, mono], i) => {
    const y = 430 + i * 140;
    const g = X.g(M);
    X.rect(640, y - 55, 960, 110, { parent: g, r: 55, shadow: true });
    X.icon(ic, 720, y, 0.55, { parent: g });
    X.text(800, y + 16, val, { parent: g, size: 44, mono, w: 600, serif: !mono });
    X.show(g, 10, { f: 0.08 + i * 0.2, type: 'left' });
  });

  // ---- made-up numbers stamp (cues 11, 12)
  const mini = X.g();
  [['2345 6789 0124', 330], ['ABCPK1234L', 430], ['ravi@oksbi', 530], ['482913', 630], ['98765 43210', 730]].forEach(([v, y], i) => {
    const c = X.chip(CX + (i % 2 ? 260 : -260), y, v, { size: 30, mono: true, parent: mini, fill: C.paper });
    X.show(c, 11, { f: i * 0.06, type: 'pop', out: 12, outLen: 0.5 });
  });
  const stamp = X.g(); const stIn = X.g(stamp);
  X.rect(-430, -85, 860, 170, { parent: stIn, fill: C.card, stroke: C.red, sw: 8, r: 18 });
  X.rect(-412, -67, 824, 134, { parent: stIn, fill: 'none', stroke: C.red, sw: 3, r: 12 });
  X.text(0, 6, 'MADE-UP NUMBERS', { parent: stIn, size: 72, anchor: 'middle', w: 800, fill: C.red, ls: 4 });
  X.text(0, 50, 'generated by a computer', { parent: stIn, size: 28, anchor: 'middle', fill: C.ink2 });
  X.show(stamp, 11, { f: 0.35, type: 'pop', len: 0.5 });
  X.each(t => {
    const up = X.P(12, 0, 0, 0.8);
    const y = lerp(530, 330, up), s = lerp(1, 0.78, up);
    stIn.setAttribute('transform', `translate(${CX} ${y.toFixed(1)}) rotate(-6) scale(${s.toFixed(3)})`);
  });
  const promise = [[true, 'They follow all the rules of real numbers'], [true, 'They belong to nobody'], [false, "A real person's number on screen would be a leak"]];
  promise.forEach(([ok, txt], i) => {
    const g = X.g();
    const y = 530 + i * 105;
    X.mark(620, y, ok, { parent: g, s: 30 });
    X.text(675, y + 12, txt, { parent: g, size: 34, w: 500 });
    X.show(g, 12, { f: 0.15 + i * 0.25, type: 'left' });
  });

  X.recap(13, ['Aadhaar, PAN, card numbers and UPI IDs', 'OTPs, mobile numbers, names and addresses', 'Aadhaar and card numbers: a special last digit']);
});
