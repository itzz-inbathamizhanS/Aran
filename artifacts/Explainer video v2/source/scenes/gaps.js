// Six gaps: a brick wall loses six patches of bricks, one per gap; each hole shows a small moving picture.
scene('gaps', X => {
  const HX = [560, 1000, 1440];
  const R0 = 200, BH = 44, BW = 100, WX0 = 260, WX1 = 1740, ROWS = 16;
  const holes = [];
  for (let i = 0; i < 6; i++) {
    const top = i < 3;
    holes.push({ i, k: i + 1, cx: HX[i % 3], rows: top ? [2, 6] : [9, 13], cy: top ? 398 : 706, py: top ? 545 : 852 });
  }
  X.cam([{ x: 960, y: 560, s: 0.98 }, { k: 0, f: 0.2, x: 990, y: 540, s: 1.04, len: 3 },
    ...holes.map(h => ({ k: h.k, x: h.cx, y: h.cy + 20, s: 1.42, len: 1.5 })),
    { k: 7, x: 960, y: 540, s: 1, len: 1.8 }]);

  // ---------- wall ----------
  const wall = X.g();
  const holeBg = X.g(wall);          // light behind removed bricks
  const content = X.g(wall);         // pictures inside the holes
  const bricks = X.g(wall);          // static bricks
  const falling = X.g(wall);         // bricks that drop out
  E('rect', { x: WX0 - 6, y: R0 - 6, width: WX1 - WX0 + 12, height: ROWS * BH + 12, rx: 8, fill: C.line }, holeBg);
  const fallers = [];
  const rr = rng(19);
  for (let r = 0; r < ROWS; r++) {
    const y = R0 + r * BH;
    for (let x = WX0 - (r % 2 ? BW / 2 : 0); x < WX1; x += BW) {
      const x0 = Math.max(WX0, x), x1 = Math.min(WX1, x + BW - 4);
      if (x1 - x0 < 10) continue;
      const bx = (x0 + x1) / 2;
      let hole = null;
      for (const h of holes) {
        if (r < h.rows[0] || r > h.rows[1]) continue;
        const hw = (r === h.rows[0] || r === h.rows[1]) ? 120 : 172;
        if (x1 > h.cx - hw && x0 < h.cx + hw) hole = h;
      }
      const shade = rr() < 0.25 ? C.shadow : C.sand;
      if (hole) {
        E('rect', { x: x0 - 2, y: y - 2, width: x1 - x0 + 8, height: BH + 2, fill: C.paper }, holeBg);
        const b = E('rect', { x: x0, y: y + 2, width: x1 - x0, height: BH - 6, rx: 4, fill: shade, stroke: C.line, 'stroke-width': 2 }, falling);
        fallers.push({ b, h: hole, cx: bx, cy: y + BH / 2, d: rr() * 0.4, rot: (rr() - 0.5) * 140, vx: (rr() - 0.5) * 120 });
      } else {
        E('rect', { x: x0, y: y + 2, width: x1 - x0, height: BH - 6, rx: 4, fill: shade, stroke: C.line, 'stroke-width': 2 }, bricks);
      }
    }
  }
  X.show(wall, 0, { type: 'up', len: 0.9 });
  X.each(t => {
    for (const f of fallers) {
      const dt = t - X.at(f.h.k, 0.03, f.d);
      if (dt <= 0) { f.b.style.display = ''; f.b.removeAttribute('transform'); f.b.style.opacity = 1; continue; }
      if (dt > 1.3) { f.b.style.display = 'none'; continue; }
      f.b.style.display = '';
      f.b.setAttribute('transform', `translate(${(f.vx * dt).toFixed(1)} ${(40 * dt + 520 * dt * dt).toFixed(1)}) rotate(${(f.rot * dt).toFixed(1)} ${f.cx} ${f.cy})`);
      f.b.style.opacity = 1 - clamp((dt - 0.8) / 0.5);
    }
  });
  // dashed hint outlines before each hole opens
  holes.forEach(h => {
    const o = X.rect(h.cx - 170, h.cy - 104, 340, 208, { fill: 'none', stroke: C.red, sw: 4, dash: '14 10', r: 40 });
    X.show(X.wrap(o), 0, { f: 0.25 + h.i * 0.06, type: 'pop', out: h.k, outLen: 0.3 });
    X.pulse(o, h.cx, h.cy, [0], { f: 0.5 + h.i * 0.05, amt: 0.06 });
  });
  X.term(0, 'Gap', 'A problem that the tools banks already use\nleave open: nobody had closed it yet.', { until: 1 });

  // counter chip above the wall
  const cnt = X.g();
  X.rect(760, 128, 400, 56, { parent: cnt, fill: C.card, stroke: C.red, r: 28 });
  const cntT = X.text(960, 167, '', { parent: cnt, size: 30, anchor: 'middle', w: 600, fill: C.red });
  X.show(cnt, 0, { f: 0.15, type: 'down', out: 1, outLen: 0.4 });
  X.each(t => { const n = Math.round(6 * X.L(0, 0.25, 0.6)); cntT.set(`gaps found: ${n} of 6`); });

  // ---------- pictures ----------
  const pic = h => X.g(content);
  // 1. alarm bell ringing too much
  {
    const h = holes[0], g = pic(h);
    const bell = E('g', null, g);
    const bi = E('g', null, bell);
    E('path', { d: 'M-46,30 Q-46,-40 0,-44 Q46,-40 46,30 L58,44 L-58,44 Z', fill: C.ochreL, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, bi);
    E('circle', { cx: 0, cy: -50, r: 8, fill: C.ink }, bi);
    E('circle', { cx: 0, cy: 54, r: 10, fill: C.ink }, bi);
    const rings = E('g', null, bell);
    for (const s of [1, -1]) for (const k of [0, 1]) E('path', { d: `M${s * (70 + k * 18)},-24 Q${s * (84 + k * 18)},0 ${s * (70 + k * 18)},24`, fill: 'none', stroke: C.red, 'stroke-width': 5, 'stroke-linecap': 'round' }, rings);
    const al = [];
    [[110, -60], [150, 10], [100, 70], [-125, -62], [-140, 30]].forEach(([dx, dy], j) => {
      const a = E('g', null, g);
      const ic = X.icon('alert', 0, 0, 0.3, { parent: a });
      al.push({ a, dx, dy, ph: j * 0.37 });
    });
    X.each(t => {
      const on = t > X.at(1, 0.2);
      const sw = on ? 16 * Math.sin(t * 20) : 0;
      bell.setAttribute('transform', `translate(${h.cx - 10} ${h.cy}) `);
      bi.setAttribute('transform', `rotate(${sw.toFixed(1)} 0 -50)`);
      rings.style.opacity = on ? (0.5 + 0.5 * Math.sin(t * 14)).toFixed(2) : 0;
      al.forEach(o => {
        const u = ((t * 0.9 + o.ph) % 1);
        o.a.setAttribute('transform', `translate(${h.cx - 10 + o.dx} ${h.cy + o.dy}) scale(${(0.7 + 0.5 * easeOut(clamp(u * 3))).toFixed(2)})`);
        o.a.style.opacity = on ? (u < 0.8 ? 1 : (1 - u) * 5).toFixed(2) : 0;
      });
    });
  }
  // 2. two look-alike numbers and a question mark
  {
    const h = holes[1], g = pic(h);
    const a = E('g', null, g), b = E('g', null, g);
    const card = (p, s, col) => { X.rect(-130, -24, 260, 48, { parent: p, fill: C.card, stroke: col, r: 10 }); X.text(0, 10, s, { parent: p, size: 27, anchor: 'middle', mono: true, w: 600 }); };
    card(a, '0982 6158 6412', C.line); card(b, '2345 6789 0124', C.line);
    const q = X.text(h.cx + 130, h.cy + 30, '?', { parent: g, size: 96, anchor: 'middle', w: 800, fill: C.ochre, serif: true });
    X.bob(q, { amp: 8, per: 1.4 });
    X.each(t => {
      const u = (t * 0.35) % 2, s = ease(clamp((u % 1) * 2.5)), up = u < 1 ? s : 1 - s;
      const ya = lerp(-40, 40, up), yb = lerp(40, -40, up);
      const xo = 18 * Math.sin(Math.PI * s);
      a.setAttribute('transform', `translate(${h.cx - 40 - xo} ${h.cy + ya})`);
      b.setAttribute('transform', `translate(${h.cx - 40 + xo} ${h.cy + yb})`);
    });
  }
  // 3. a mask with digits leaking out
  {
    const h = holes[2], g = pic(h);
    const m = E('g', { transform: `translate(${h.cx - 30} ${h.cy - 40})` }, g);
    E('path', { d: 'M-100,-22 Q-64,-54 0,-32 Q64,-54 100,-22 Q106,22 66,32 Q32,36 0,12 Q-32,36 -66,32 Q-106,22 -100,-22 Z', fill: C.plumL, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, m);
    E('ellipse', { cx: -46, cy: -6, rx: 24, ry: 13, fill: C.paper, stroke: C.ink, 'stroke-width': 4 }, m);
    E('ellipse', { cx: 46, cy: -6, rx: 24, ry: 13, fill: C.paper, stroke: C.ink, 'stroke-width': 4 }, m);
    const drops = [];
    '0124'.split('').forEach((d, j) => {
      const tg = E('text', { 'font-size': 30, 'font-weight': 700, fill: C.red, 'text-anchor': 'middle', 'font-family': F.mono }, g); tg.textContent = d;
      drops.push({ tg, x: h.cx - 90 + j * 40, ph: j * 0.27 });
    });
    // gauge with a question mark: nobody measures
    const gx = h.cx + 118, gy = h.cy + 10;
    E('rect', { x: gx - 16, y: gy - 70, width: 32, height: 140, rx: 8, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, g);
    for (let j = 0; j < 5; j++) E('line', { x1: gx - 16, y1: gy - 50 + j * 25, x2: gx - 2, y2: gy - 50 + j * 25, stroke: C.ink2, 'stroke-width': 3 }, g);
    const gq = X.text(gx, gy + 16, '?', { parent: g, size: 44, anchor: 'middle', w: 800, fill: C.ochre });
    X.each(t => {
      drops.forEach(o => {
        const u = (t * 0.6 + o.ph) % 1;
        o.tg.setAttribute('x', o.x); o.tg.setAttribute('y', (h.cy - 10 + u * 110).toFixed(1));
        o.tg.setAttribute('opacity', Math.min(1, u * 6, (1 - u) * 4).toFixed(2));
      });
      gq.t.setAttribute('opacity', (0.55 + 0.45 * Math.sin(t * 4)).toFixed(2));
    });
  }
  // 4. a leaked file and three possible sources
  {
    const h = holes[3], g = pic(h);
    X.icon('cloud', h.cx + 85, h.cy - 20, 0.95, { parent: g });
    X.icon('file', h.cx + 85, h.cy - 14, 0.38, { parent: g, fill: C.redL });
    const srcs = [-62, 0, 62].map((dy, j) => {
      X.icon('server', h.cx - 120, h.cy + dy, 0.34, { parent: g });
      const ln = E('path', { d: `M${h.cx - 95},${h.cy + dy} Q${h.cx - 20},${h.cy + dy * 0.4} ${h.cx + 30},${h.cy - 10}`, fill: 'none', stroke: C.ink3, 'stroke-width': 4, 'stroke-dasharray': '8 8' }, g);
      return ln;
    });
    const q = X.text(h.cx + 85, h.cy + 82, '?', { parent: g, size: 58, anchor: 'middle', w: 800, fill: C.red });
    X.each(t => {
      const cur = Math.floor(t * 1.4) % 3;
      srcs.forEach((ln, j) => { ln.setAttribute('stroke', j === cur ? C.red : C.ink3); ln.setAttribute('stroke-dashoffset', (-t * 40).toFixed(1)); });
      q.setAttribute('transform', `translate(0 ${(5 * Math.sin(t * 3)).toFixed(1)})`);
    });
  }
  // 5. an eraser that cannot reach the copies
  {
    const h = holes[4], g = pic(h);
    X.rect(h.cx - 150, h.cy - 70, 136, 60, { parent: g, fill: C.card, stroke: C.line, r: 8 });
    const nameT = X.text(h.cx - 82, h.cy - 32, 'Ravi Kumar', { parent: g, size: 22, anchor: 'middle', w: 600 });
    E('line', { x1: h.cx + 2, y1: h.cy - 95, x2: h.cx + 2, y2: h.cy + 95, stroke: C.red, 'stroke-width': 4, 'stroke-dasharray': '10 8' }, g);
    [['log', -60], ['db', 0], ['building', 60]].forEach(([n, dy], j) => {
      const ic = X.icon(n, h.cx + 100, h.cy + dy, 0.36, { parent: g });
      X.bob(ic.mid, { amp: 3, per: 2, ph: j });
    });
    const er = E('g', null, g);
    E('rect', { x: -40, y: -22, width: 80, height: 44, rx: 8, fill: C.redL, stroke: C.ink, 'stroke-width': 4 }, er);
    E('rect', { x: 8, y: -22, width: 32, height: 44, rx: 6, fill: C.blueL, stroke: C.ink, 'stroke-width': 4 }, er);
    X.each(t => {
      const u = (t * 0.4) % 1;
      let x, y = h.cy + 40;
      if (u < 0.6) x = h.cx - 92 + 40 * Math.sin(u / 0.6 * Math.PI * 4);
      else { const v = (u - 0.6) / 0.4; x = h.cx - 92 + 54 * Math.sin(v * Math.PI); }
      er.setAttribute('transform', `translate(${x.toFixed(1)} ${y}) rotate(-12)`);
      nameT.t.setAttribute('opacity', (0.55 + 0.25 * Math.sin(t * 2.5)).toFixed(2));
    });
  }
  // 6. an OTP with no pattern
  {
    const h = holes[5], g = pic(h);
    X.icon('phone', h.cx - 132, h.cy, 0.8, { parent: g });
    const otp = X.digits(h.cx + 28, h.cy - 66, '482913', { parent: g, cw: 34, ch: 48, size: 26, gap: 5, fill: C.ochreL });
    const die = E('g', null, g);
    E('rect', { x: -28, y: -28, width: 56, height: 56, rx: 10, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, die);
    for (const [px, py] of [[-12, -12], [12, 12], [0, 0], [12, -12], [-12, 12]]) E('circle', { cx: px, cy: py, r: 5, fill: C.ink }, die);
    const mg = E('g', null, g); X.icon('magnifier', 0, 0, 0.42, { parent: mg });
    const nq = X.text(h.cx + 105, h.cy + 64, 'no pattern', { parent: g, size: 24, anchor: 'middle', w: 600, fill: C.red });
    X.each(t => {
      die.setAttribute('transform', `translate(${h.cx + 0} ${h.cy + 50}) rotate(${(t * 90) % 360})`);
      const u = (t * 0.5) % 1;
      mg.setAttribute('transform', `translate(${(h.cx - 40 + 190 * Math.sin(u * Math.PI)).toFixed(1)} ${h.cy - 20})`);
      nq.t.setAttribute('opacity', (0.6 + 0.4 * Math.sin(t * 3)).toFixed(2));
    });
  }

  // ---------- plaques under each hole ----------
  const names = ['False alarms', 'Look-alike leaks', 'Leaky masks', 'Unknown leakers', 'Erasure misses copies', 'OTPs: no structure'];
  holes.forEach(h => {
    const ch = X.chip(h.cx, h.py, `${h.i + 1}  ${names[h.i]}`, { size: 26, color: C.red, fill: C.card, shadow: true });
    X.show(ch, h.k, { f: 0.35, type: 'pop' });
    h.chip = ch;
  });
  X.term(1, 'False alarm', 'A warning about something that is not\nreally a problem, like a burnt-toast smoke alarm.', { until: 2 });
  X.term(3, 'Mask', 'Hiding most of a number with X marks,\nlike XXXX XXXX 0124.', { until: 4 });
  X.term(5, 'Erasure', 'Deleting a customer\'s data when they ask,\nor when the bank no longer needs it.', { until: 6 });
  X.term(6, 'OTP', 'One-Time Password: a short code sent by SMS\nthat works only once.', { until: 7 });

  // ---------- security officer watching ----------
  const off = X.person(150, 880, { shirt: C.ink, skin: C.skin[0], badge: true, s: 0.85, name: 'officer' });
  X.show(off, 0, { f: 0.3, type: 'right' });
  X.each(t => {
    let k = -1; holes.forEach(h => { if (t >= X.at(h.k)) k = h.i; });
    const pointing = k >= 0 && t < X.at(7);
    const ang = k < 0 ? 0 : (k < 3 ? 115 : 80);
    const p = pointing ? X.P(holes[k].k, 0, 0, 0.5) : 0;
    X.arms(off, 8, lerp(-8, ang, p));
    off.mood(t > X.at(7) ? 'happy' : (k === 0 ? 'shock' : (k > 0 ? 'sad' : 'neutral')));
  });

  // ---------- each gap becomes an idea ----------
  holes.forEach(h => {
    const b = X.g();
    const ic = X.icon('bulb', h.cx + 150, h.cy - 92, 0.62, { parent: b });
    X.show(b, 7, { f: 0.15 + h.i * 0.1, type: 'pop' });
    X.bob(ic.mid, { amp: 5, per: 1.8, ph: h.i });
  });
  const rib = X.g();
  X.rect(660, 126, 600, 60, { parent: rib, fill: C.ochreL, stroke: C.ochre, r: 30 });
  X.text(960, 167, 'each gap  →  one of Aran\'s ideas', { parent: rib, size: 30, anchor: 'middle', w: 600, serif: true });
  X.show(rib, 7, { f: 0.1, type: 'down' });

  X.recap(8, ['Six gaps that existing tools leave open', 'False alarms, look-alike leaks, leaky masks', 'Unknown leakers, erasure misses copies', 'OTPs have no structure to check']);
});
