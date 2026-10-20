// Aran explainer v2 engine. Every frame is a pure function of time t: seek(t) draws it from scratch.
// Light "paper" look: warm off-white background, ink text, a few calm flat colours, no glow.
const NS = 'http://www.w3.org/2000/svg';
const C = {
  bg: '#F3EEE4', paper: '#FBF8F1', card: '#FFFDF8', sand: '#E8DECC', line: '#CDBFA9', shadow: '#D9CCB6',
  ink: '#1F2933', ink2: '#52606D', ink3: '#8C95A0',
  blue: '#2F5F8F', blueL: '#DCE6F0', red: '#B5462F', redL: '#F4DED6', green: '#4E7A39', greenL: '#E1EBD6',
  ochre: '#C2861B', ochreL: '#F6E8C9', plum: '#6D4E7C', plumL: '#EAE0EE', teal: '#2D7670', tealL: '#D8E9E6',
  skin: ['#8B5A3C', '#A9704A', '#6B4430', '#C08A62'], hair: '#2A211C'
};
const F = {
  sans: 'Inter, Noto Sans Tamil, Noto Sans Devanagari, sans-serif',
  serif: 'Fraunces, Source Serif 4, serif',
  mono: 'DejaVu Sans Mono, monospace'
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeBack = p => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const fmt = n => Math.round(n).toLocaleString('en-IN');
const fmtUS = n => Math.round(n).toLocaleString('en-US');
// deterministic random numbers (never use Math.random): const r = rng(7); r() -> 0..1
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

function E(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const SCENES = {};
function scene(id, build) { SCENES[id] = build; }

// Catmull-Rom spline through points; at(p) gives [x, y, angle] at fraction p of the length.
function spline(pts, tension = 0.5) {
  const P = pts.map(p => [p[0], p[1]]);
  const segs = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3];
    const c2 = [p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3];
    segs.push([p1, c1, c2, p2]);
  }
  const bez = (s, u) => {
    const v = 1 - u;
    return [v * v * v * s[0][0] + 3 * v * v * u * s[1][0] + 3 * v * u * u * s[2][0] + u * u * u * s[3][0],
      v * v * v * s[0][1] + 3 * v * v * u * s[1][1] + 3 * v * u * u * s[2][1] + u * u * u * s[3][1]];
  };
  // arc-length table
  const table = [[0, 0, 0]]; let L = 0, prev = P[0];
  segs.forEach((s, si) => { for (let j = 1; j <= 40; j++) { const q = bez(s, j / 40); L += Math.hypot(q[0] - prev[0], q[1] - prev[1]); table.push([L, si, j / 40]); prev = q; } });
  const d = 'M' + P[0].join(',') + segs.map(s => ` C${s[1].join(',')} ${s[2].join(',')} ${s[3].join(',')}`).join('');
  const at = p => {
    if (segs.length === 0) return [P[0][0], P[0][1], 0];
    const target = clamp(p) * L;
    let lo = 0, hi = table.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m][0] < target) lo = m; else hi = m; }
    const a = table[lo], b = table[hi];
    const f = b[0] > a[0] ? (target - a[0]) / (b[0] - a[0]) : 0;
    let si = b[1], u = b[2] - (1 - f) / 40; if (lo === 0) { si = 0; u = f / 40; }
    const q = bez(segs[si], clamp(u)), q2 = bez(segs[si], clamp(u + 0.01)), q1 = bez(segs[si], clamp(u - 0.01));
    return [q[0], q[1], Math.atan2(q2[1] - q1[1], q2[0] - q1[0])];
  };
  return { d, at, len: L, pts: P };
}

function makeCtx(root, cam, cues, dur, termRoot) {
  const anims = [], fns = [];
  const X = { root: cam, cues, dur, t: 0 };
  X.at = (k, f = 0, d = 0) => {
    if (k >= cues.length) return dur - 0.5 + d;
    if (k < 0) return d;
    const c = cues[k];
    return c.t + f * c.d + d;
  };
  X.P = (k, f = 0, d = 0, len = 0.7) => ease(clamp((X.t - X.at(k, f, d)) / len));
  X.L = (k, f0 = 0, f1 = 1) => {
    const c = cues[Math.min(k, cues.length - 1)];
    return clamp((X.t - (c.t + f0 * c.d)) / Math.max(0.01, (f1 - f0) * c.d));
  };
  X.on = (k0, k1, f1 = 0) => X.t >= X.at(k0) && (k1 == null || X.t < X.at(k1, f1)); // true while between cue k0 start and cue k1 (+f1)
  X.g = parent => E('g', null, parent || cam);
  X.wrap = el => { const w = E('g', null, el.parentNode); w.appendChild(el); return w; };
  X.show = (el, k, o = {}) => {
    anims.push({ el, k, f: o.f || 0, d: o.d || 0, len: o.len || 0.7, type: o.type || 'up',
      out: o.out, outf: o.outf || 0, outd: o.outd || 0, outLen: o.outLen || 0.5, dist: o.dist || 30, op: o.op == null ? 1 : o.op });
    el.style.opacity = 0;
    el.classList.add('an');
    return el;
  };
  X.each = fn => fns.push(fn);

  // camera: keys = [{k, f, d, x, y, s, len}] ; centre (x,y) shown at screen centre with zoom s
  let camKeys = null, drift = true;
  X.cam = (keys, o = {}) => { camKeys = keys; if (o.drift === false) drift = false; };
  X.noDrift = () => { drift = false; };
  const camAt = t => {
    let x = 960, y = 540, s = 1;
    if (camKeys) {
      for (const kf of camKeys) {
        const t0 = X.at(kf.k || 0, kf.f || 0, kf.d || 0);
        const p = (kf === camKeys[0] && kf.len == null) ? 1 : ease(clamp((t - t0) / (kf.len || 1.4))); // first key = starting framing
        x = lerp(x, kf.x ?? x, p); y = lerp(y, kf.y ?? y, p); s = lerp(s, kf.s ?? s, p);
      }
    }
    if (drift) { s *= 1 + 0.025 * clamp(t / Math.max(1, dur)); x += 6 * Math.sin(t * 0.21); y += 4 * Math.sin(t * 0.17 + 1); }
    return [x, y, s];
  };

  X.update = t => {
    X.t = t;
    const [cx, cy, cs] = camAt(t);
    cam.setAttribute('transform', `translate(960 540) scale(${cs.toFixed(5)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`);
    for (const a of anims) {
      const ti = X.at(a.k, a.f, a.d);
      const raw = clamp((t - ti) / a.len);
      let p = ease(raw);
      let q = 1;
      if (a.out != null) q = 1 - ease(clamp((t - X.at(a.out, a.outf, a.outd)) / a.outLen));
      const el = a.el;
      if (a.type === 'draw') {
        el.style.opacity = (p > 0 ? 1 : 0) * q * a.op;
        el.style.visibility = (p > 0 && q > 0.001) ? 'visible' : 'hidden';
        for (const pth of (el._paths || [])) pth.style.strokeDashoffset = 1 - p;
        if (el._head) el._head.style.opacity = p > 0.95 ? 1 : 0;
        continue;
      }
      el.style.opacity = (a.type === 'pop' ? clamp(raw * 2.5) : p) * q * a.op;
      let tr = '';
      if (a.type === 'up') tr = `translateY(${(1 - p) * a.dist}px)`;
      else if (a.type === 'down') tr = `translateY(${-(1 - p) * a.dist}px)`;
      else if (a.type === 'left') tr = `translateX(${-(1 - p) * a.dist * 1.5}px)`;
      else if (a.type === 'right') tr = `translateX(${(1 - p) * a.dist * 1.5}px)`;
      else if (a.type === 'pop') tr = `scale(${raw >= 1 ? 1 : 0.4 + 0.6 * easeBack(raw)})`;
      else if (a.type === 'grow') tr = `scaleX(${p})`;
      else if (a.type === 'rise') tr = `scaleY(${p})`;
      if (tr !== el._tr) { el.style.transform = tr; el._tr = tr; }
      el.style.visibility = p * q <= 0.001 ? 'hidden' : 'visible';
    }
    for (const fn of fns) fn(t);
  };

  // ---------------- builders ----------------
  X.text = (x, y, str, o = {}) => {
    const g = X.g(o.parent);
    const size = o.size || 32;
    const t = E('text', {
      x, y, 'font-size': size, 'font-weight': o.w || 500, fill: o.fill || C.ink,
      'text-anchor': o.anchor || 'start',
      'font-family': o.mono ? F.mono : (o.serif ? F.serif : (o.family || F.sans)),
      'letter-spacing': o.ls || 0
    }, g);
    if (o.italic) t.setAttribute('font-style', 'italic');
    g.t = t;
    g.set = s => {
      if (s === g._s) return; g._s = s;
      while (t.firstChild) t.removeChild(t.firstChild);
      String(s).split('\n').forEach((ln, i) => {
        const sp = E('tspan', i === 0 ? null : { x, dy: (o.lh || size * 1.3) }, t);
        sp.textContent = ln;
      });
    };
    g.set(str);
    return g;
  };
  X.rect = (x, y, w, h, o = {}) => {
    const g = X.g(o.parent);
    if (o.shadow) g.sh = E('rect', { x: x + (o.shadow === true ? 6 : o.shadow), y: y + (o.shadow === true ? 6 : o.shadow), width: w, height: h, rx: o.r == null ? 14 : o.r, fill: o.shadowFill || C.shadow }, g);
    g.r = E('rect', { x, y, width: w, height: h, rx: o.r == null ? 14 : o.r, fill: o.fill || C.card,
      stroke: o.stroke || C.line, 'stroke-width': o.sw == null ? 2 : o.sw }, g);
    if (o.dash) g.r.setAttribute('stroke-dasharray', o.dash);
    g.box = { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
    return g;
  };
  X.box = (x, y, w, h, o = {}) => {
    const g = X.rect(x, y, w, h, Object.assign({ shadow: true }, o));
    const size = o.size || 30;
    const lines = (o.label || '').split('\n').length;
    if (o.label != null) {
      const ty = o.sub ? y + h / 2 - 6 - (lines - 1) * size * 0.65 : y + h / 2 + size * 0.35 - (lines - 1) * size * 0.65;
      g.t = X.text(x + w / 2, ty, o.label, { size, w: o.w || 600, fill: o.color || C.ink, anchor: 'middle', parent: g, mono: o.mono, serif: o.serif, lh: size * 1.3 });
    }
    if (o.sub) g.s = X.text(x + w / 2, y + h / 2 + (o.subSize || 22) + 8, o.sub, { size: o.subSize || 22, w: 400, fill: o.subColor || C.ink2, anchor: 'middle', parent: g, lh: (o.subSize || 22) * 1.3 });
    return g;
  };
  X.chip = (x, y, str, o = {}) => {
    const size = o.size || 24;
    const w = o.width || (str.length * size * (o.mono ? 0.62 : 0.56) + size * 1.4);
    const h = size * 1.75;
    const g = X.rect(x - w / 2, y - h / 2, w, h, { r: h / 2, fill: o.fill || C.card, stroke: o.stroke || o.color || C.line, sw: o.sw || 2, parent: o.parent, shadow: o.shadow });
    g.t = X.text(x, y + size * 0.36, str, { size, w: o.w || 600, fill: o.color || C.ink, anchor: 'middle', parent: g, mono: o.mono });
    g.w = w;
    return g;
  };
  X.line = (x1, y1, x2, y2, o = {}) => {
    const g = X.g(o.parent);
    g.l = E('line', { x1, y1, x2, y2, stroke: o.color || C.line, 'stroke-width': o.sw || 3, 'stroke-dasharray': o.dash || 'none', 'stroke-linecap': 'round' }, g);
    return g;
  };
  X.path = (d, o = {}) => {
    const g = X.g(o.parent);
    const p = E('path', { d, fill: o.fill || 'none', stroke: o.color || C.ink2, 'stroke-width': o.sw || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 }, g);
    if (o.dash) p.setAttribute('stroke-dasharray', o.dash); else p.style.strokeDasharray = 1;
    g._paths = [p]; g.p = p;
    return g;
  };
  X.arrow = (x1, y1, x2, y2, o = {}) => {
    const g = X.g(o.parent);
    const color = o.color || C.ink2;
    let d, cx, cy;
    if (o.bend) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
      cx = mx - dy * o.bend; cy = my + dx * o.bend;
      d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
    } else d = `M${x1},${y1} L${x2},${y2}`;
    const p = E('path', { d, fill: 'none', stroke: color, 'stroke-width': o.sw || 4, 'stroke-linecap': 'round', pathLength: 1 }, g);
    p.style.strokeDasharray = 1;
    let ang = o.bend ? Math.atan2(y2 - cy, x2 - cx) : Math.atan2(y2 - y1, x2 - x1);
    const hs = o.head || 18;
    const head = E('path', { d: `M${x2},${y2} L${x2 - hs * Math.cos(ang - 0.45)},${y2 - hs * Math.sin(ang - 0.45)} L${x2 - hs * Math.cos(ang + 0.45)},${y2 - hs * Math.sin(ang + 0.45)} Z`, fill: color }, g);
    if (o.nohead) head.remove();
    g._paths = [p]; g._head = o.nohead ? null : head; g.p = p;
    return g;
  };
  X.digits = (cx, y, str, o = {}) => {
    const g = X.g(o.parent);
    const cw = o.cw || 54, ch = o.ch || 72, gap = o.gap || 6, size = o.size || 38, groups = o.groups || null;
    const n = str.length;
    const extra = [];
    let acc = 0, gi = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      extra.push(acc); cnt++;
      if (groups && gi < groups.length && cnt === groups[gi]) { acc += o.groupGap || 22; gi++; cnt = 0; }
    }
    const total = n * cw + (n - 1) * gap + extra[n - 1];
    const x0 = (o.anchor === 'start') ? cx : cx - total / 2;
    g.cells = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (cw + gap) + extra[i];
      const cg = E('g', null, g);
      E('rect', { x: x + 3, y: y + 4, width: cw, height: ch, rx: 10, fill: C.shadow }, cg);
      const r = E('rect', { x, y, width: cw, height: ch, rx: 10, fill: o.fill || C.card, stroke: o.stroke || C.line, 'stroke-width': 2 }, cg);
      const t = E('text', { x: x + cw / 2, y: y + ch / 2 + size * 0.36, 'font-size': size, 'font-weight': 600, fill: o.color || C.ink, 'text-anchor': 'middle', 'font-family': F.mono }, cg);
      t.textContent = str[i];
      g.cells.push({ g: cg, r, t, x, cx: x + cw / 2, y, w: cw, h: ch });
    }
    g.x0 = x0; g.total = total;
    g.set = s => { for (let i = 0; i < n; i++) if (g.cells[i].t.textContent !== (s[i] || '')) g.cells[i].t.textContent = s[i] || ''; };
    g.paint = (i, fill, stroke, color) => {
      const c = g.cells[i];
      if (fill) c.r.setAttribute('fill', fill);
      if (stroke) c.r.setAttribute('stroke', stroke);
      if (color) c.t.setAttribute('fill', color);
    };
    return g;
  };
  X.circle = (cx, cy, r, o = {}) => {
    const g = X.g(o.parent);
    g.c = E('circle', { cx, cy, r, fill: o.fill || 'none', stroke: o.stroke || 'none', 'stroke-width': o.sw || 2 }, g);
    if (o.dash) g.c.setAttribute('stroke-dasharray', o.dash);
    return g;
  };
  X.mark = (x, y, ok, o = {}) => {
    const g = X.g(o.parent);
    const s = o.s || 30, col = ok ? (o.color || C.green) : (o.color || C.red);
    E('circle', { cx: x, cy: y, r: s, fill: ok ? C.greenL : C.redL }, g);
    E('circle', { cx: x, cy: y, r: s, fill: 'none', stroke: col, 'stroke-width': 3 }, g);
    const k = s * 0.45;
    if (ok) E('path', { d: `M${x - k},${y} L${x - k * 0.25},${y + k * 0.75} L${x + k},${y - k * 0.7}`, fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    else E('path', { d: `M${x - k},${y - k} L${x + k},${y + k} M${x + k},${y - k} L${x - k},${y + k}`, fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    return g;
  };
  X.icon = (name, x, y, s = 1, o = {}) => {
    const outer = X.g(o.parent);          // use with X.show (CSS transform)
    const mid = E('g', null, outer);       // free for X.bob / X.pulse / X.shake / X.spin (attribute transform)
    const g = E('g', { transform: `translate(${x},${y}) scale(${s})` }, mid);
    ICONS[name](g, o.color || C.ink, o);
    outer.inner = g; outer.mid = mid; outer.cx = x; outer.cy = y;
    return outer;
  };
  // a plain-words card for a technical word, top right, shown from cue k until cue `until` (default k+2)
  X.term = (k, word, meaning, o = {}) => {
    const g = E('g', null, termRoot);
    const w = 720, x = 1920 - 48 - w, y = 20;
    const lines = String(meaning).split('\n');
    const h = 58 + lines.length * 30;
    E('rect', { x: x + 5, y: y + 5, width: w, height: h, rx: 12, fill: C.shadow }, g);
    E('rect', { x, y, width: w, height: h, rx: 12, fill: C.card, stroke: C.line, 'stroke-width': 2 }, g);
    E('rect', { x, y, width: 10, height: h, rx: 4, fill: o.color || C.ochre }, g);
    const t1 = E('text', { x: x + 30, y: y + 40, 'font-size': 28, 'font-weight': 700, fill: C.ink, 'font-family': F.serif }, g);
    t1.textContent = word;
    lines.forEach((ln, i) => {
      const t2 = E('text', { x: x + 30, y: y + 74 + i * 30, 'font-size': 23, 'font-weight': 400, fill: C.ink2, 'font-family': F.sans }, g);
      t2.textContent = ln;
    });
    X.show(g, k, { f: o.f || 0, type: 'down', out: o.until == null ? k + 2 : o.until, outf: o.outf || 0, dist: 14 });
    return g;
  };

  // ---------------- motion helpers ----------------
  X.spline = spline;
  // move el (drawn around 0,0) along spline sp while cue k plays from f0 to f1 (or between absolute scene times o.t0..o.t1)
  X.travel = (el, sp, k, o = {}) => {
    const f0 = o.f0 || 0, f1 = o.f1 == null ? 1 : o.f1;
    X.each(() => {
      let p;
      if (o.t0 != null) p = clamp((X.t - o.t0) / (o.t1 - o.t0));
      else p = X.L(k, f0, f1);
      p = o.linear ? p : ease(p);
      const [x, y, a] = sp.at(p);
      el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${o.rotate ? ` rotate(${(a * 180 / Math.PI).toFixed(1)})` : ''}`);
    });
    return el;
  };
  // a continuous stream of small packets along spline sp, visible between cue k0 and k1
  X.stream = (sp, o = {}) => {
    const g = X.g(o.parent);
    const n = o.n || 5, speed = o.speed || 0.22, r = o.r || 9;
    const dots = [];
    for (let i = 0; i < n; i++) {
      const d = o.make ? o.make(g, i) : E('circle', { r, fill: (o.colors ? o.colors[i % o.colors.length] : o.color) || C.blue }, g);
      dots.push(d);
    }
    X.each(t => {
      const on = (o.k0 == null || t >= X.at(o.k0, o.f0 || 0)) && (o.k1 == null || t < X.at(o.k1, o.f1 || 0));
      g.style.display = on ? '' : 'none';
      if (!on) return;
      dots.forEach((d, i) => {
        const p = ((t * speed) + i / n) % 1;
        const [x, y] = sp.at(p);
        const fade = Math.min(1, p / 0.08, (1 - p) / 0.08);
        d.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        d.setAttribute('opacity', fade.toFixed(2));
      });
    });
    return g;
  };
  // count a number up in text group tg during cue k (from f0 to f1)
  X.count = (tg, from, to, k, o = {}) => {
    const f = o.fmt || fmtUS;
    X.each(() => {
      const p = o.t0 != null ? clamp((X.t - o.t0) / (o.t1 - o.t0)) : X.L(k, o.f0 || 0, o.f1 == null ? 0.8 : o.f1);
      tg.set((o.pre || '') + f(lerp(from, to, easeOut(p))) + (o.post || ''));
    });
    return tg;
  };
  // typewriter: reveal str in text group tg during cue k
  X.type = (tg, str, k, o = {}) => {
    X.each(() => {
      const p = X.L(k, o.f0 || 0, o.f1 == null ? 0.7 : o.f1);
      const n = Math.round(p * str.length);
      tg.set(str.slice(0, n) + (n < str.length && n > 0 && o.caret !== false ? '|' : ''));
    });
    return tg;
  };
  // gentle idle floating of el (attribute transform), from cue k onwards
  X.bob = (el, o = {}) => {
    const amp = o.amp == null ? 6 : o.amp, per = o.per || 3, ph = o.ph || 0;
    X.each(t => {
      const y = amp * Math.sin((t / per) * 2 * Math.PI + ph);
      const x = (o.ampX || 0) * Math.sin((t / (per * 1.3)) * 2 * Math.PI + ph);
      el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    });
    return el;
  };
  // scale pulse around (cx, cy) at cue k (attribute transform): grows then settles
  X.pulse = (el, cx, cy, k, o = {}) => {
    const amt = o.amt || 0.18, len = o.len || 0.8;
    X.each(t => {
      let s = 1;
      for (const kk of [].concat(k)) {
        const p = clamp((t - X.at(kk, o.f || 0, o.d || 0)) / len);
        if (p > 0 && p < 1) s *= 1 + amt * Math.sin(p * Math.PI);
      }
      el.setAttribute('transform', `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`);
    });
    return el;
  };
  // shake horizontally at cue k (attribute transform)
  X.shake = (el, k, o = {}) => {
    const len = o.len || 0.6, amp = o.amp || 10;
    X.each(t => {
      const p = clamp((t - X.at(k, o.f || 0, o.d || 0)) / len);
      const x = p > 0 && p < 1 ? amp * Math.sin(p * Math.PI * 8) * (1 - p) : 0;
      el.setAttribute('transform', `translate(${x.toFixed(2)} 0)`);
    });
    return el;
  };
  // continuous rotation of el around (cx, cy)
  X.spin = (el, cx, cy, o = {}) => {
    const sp = o.speed || 20;
    X.each(t => el.setAttribute('transform', `rotate(${(t * sp) % 360} ${cx} ${cy})`));
    return el;
  };
  // horizontal bar that grows to fraction `frac` of width w during cue k
  X.bar = (x, y, w, h, frac, k, o = {}) => {
    const g = X.g(o.parent);
    E('rect', { x, y, width: w, height: h, rx: h / 2 > 10 ? 10 : h / 2, fill: o.track || C.sand }, g);
    const r = E('rect', { x, y, width: 0, height: h, rx: h / 2 > 10 ? 10 : h / 2, fill: o.color || C.blue }, g);
    X.each(() => { const p = ease(X.L(k, o.f0 || 0, o.f1 == null ? 0.6 : o.f1)); r.setAttribute('width', Math.max(0, w * frac * p)); });
    g.r = r;
    return g;
  };

  // ---------------- characters ----------------
  // flat person, feet at (x, y); scale s. Returns group with .armL .armR .mouth; use X.talk/X.wave to animate
  X.person = (x, y, o = {}) => {
    const s = o.s || 1;
    const outer = X.g(o.parent);
    const g = E('g', { transform: `translate(${x},${y}) scale(${s})` }, outer);
    const body = E('g', null, g); // bobbing part
    const skin = o.skin || C.skin[0], shirt = o.shirt || C.blue, pants = o.pants || C.ink;
    // legs
    E('rect', { x: -22, y: -78, width: 18, height: 78, rx: 8, fill: pants }, body);
    E('rect', { x: 4, y: -78, width: 18, height: 78, rx: 8, fill: pants }, body);
    E('rect', { x: -28, y: -6, width: 26, height: 10, rx: 5, fill: C.ink }, body);
    E('rect', { x: 2, y: -6, width: 26, height: 10, rx: 5, fill: C.ink }, body);
    // arms (rotate around the shoulders)
    const armL = E('g', null, body), armR = E('g', null, body);
    E('rect', { x: -9, y: 0, width: 16, height: 70, rx: 8, fill: shirt }, armL); E('circle', { cx: -1, cy: 72, r: 9, fill: skin }, armL);
    E('rect', { x: -7, y: 0, width: 16, height: 70, rx: 8, fill: shirt }, armR); E('circle', { cx: 1, cy: 72, r: 9, fill: skin }, armR);
    armL.setAttribute('transform', 'translate(-36,-150) rotate(8)'); armR.setAttribute('transform', 'translate(36,-150) rotate(-8)');
    // torso
    E('path', { d: 'M-38,-150 Q-38,-162 -26,-162 L26,-162 Q38,-162 38,-150 L34,-72 L-34,-72 Z', fill: shirt }, body);
    if (o.tie) E('path', { d: 'M0,-160 L-6,-150 L0,-110 L6,-150 Z', fill: o.tie }, body);
    if (o.badge) E('rect', { x: 12, y: -146, width: 16, height: 20, rx: 3, fill: C.card, stroke: C.line }, body);
    // head
    E('rect', { x: -9, y: -176, width: 18, height: 18, fill: skin }, body);
    E('circle', { cx: 0, cy: -204, r: 32, fill: skin }, body);
    if (o.hair !== false) {
      if (o.long) E('path', { d: 'M-34,-200 Q-38,-244 0,-240 Q38,-244 34,-200 L36,-160 L22,-168 L24,-206 Q0,-224 -24,-206 L-22,-168 L-36,-160 Z', fill: o.hairColor || C.hair }, body);
      else E('path', { d: 'M-33,-206 Q-34,-242 0,-240 Q34,-242 33,-206 Q20,-222 0,-220 Q-22,-222 -33,-206 Z', fill: o.hairColor || C.hair }, body);
    }
    const eyes = E('g', null, body);
    E('circle', { cx: -11, cy: -204, r: 3.6, fill: C.ink }, eyes); E('circle', { cx: 11, cy: -204, r: 3.6, fill: C.ink }, eyes);
    const mouth = E('path', { d: 'M-10,-188 Q0,-181 10,-188', fill: 'none', stroke: C.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, body);
    if (o.glasses) E('path', { d: 'M-22,-204 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M2,-204 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M-2,-204 L2,-204', fill: 'none', stroke: C.ink, 'stroke-width': 2.5 }, body);
    if (o.hood) E('path', { d: 'M-40,-196 Q-42,-252 0,-250 Q42,-252 40,-196 L40,-160 L28,-164 Q30,-230 0,-232 Q-30,-230 -28,-164 L-40,-160 Z', fill: o.hood }, body);
    if (o.name) {
      const nt = E('text', { x: 0, y: 40, 'font-size': 26, 'font-weight': 600, fill: C.ink2, 'text-anchor': 'middle', 'font-family': F.sans }, g);
      nt.textContent = o.name;
    }
    outer.body = body; outer.armL = armL; outer.armR = armR; outer.mouth = mouth; outer.eyes = eyes; outer.g = g;
    outer.pose = { armL: 8, armR: -8 };
    outer.mood = m => {
      const d = m === 'happy' ? 'M-12,-190 Q0,-176 12,-190' : m === 'sad' ? 'M-10,-182 Q0,-190 10,-182' : m === 'open' ? 'M-8,-188 Q0,-176 8,-188 Q0,-184 -8,-188' : m === 'shock' ? 'M-6,-186 a6,7 0 1,0 12,0 a6,7 0 1,0 -12,0' : 'M-10,-188 Q0,-181 10,-188';
      if (mouth._d !== d) { mouth.setAttribute('d', d); mouth._d = d; }
    };
    // idle: gentle breathing bob, blink
    X.each(t => {
      const ph = (o.ph || 0);
      body.setAttribute('transform', `translate(0 ${(2.5 * Math.sin(t * 2.2 + ph)).toFixed(2)})`);
      const blink = ((t + ph) % 3.7) < 0.12;
      eyes.setAttribute('transform', blink ? 'translate(0,-204) scale(1,0.15) translate(0,204)' : '');
    });
    return outer;
  };
  // set arm angles (degrees; 0 = straight down, positive = outwards/upwards for that side)
  X.arms = (p, l, r) => {
    p.armL.setAttribute('transform', `translate(-36,-150) rotate(${l})`);
    p.armR.setAttribute('transform', `translate(36,-150) rotate(${-r})`);
  };
  // person talks (mouth moves) during cues ks
  X.talk = (p, ks, o = {}) => {
    const list = [].concat(ks);
    X.each(t => {
      let on = false;
      for (const k of list) { const c = cues[k]; if (c && t >= c.t && t <= c.t + c.d) on = true; }
      if (on) p.mood(Math.sin(t * 22) > 0 ? 'open' : (o.base || 'neutral'));
      else if (o.base) p.mood(o.base);
    });
  };
  // wave the right arm during cue k
  X.wave = (p, k, o = {}) => {
    let raised = false;
    X.each(t => {
      const s = X.at(k, o.f || 0), e = s + (o.len || 2);
      if (t >= s && t <= e) { const u = (t - s) / (e - s); X.arms(p, 8, 150 + 20 * Math.sin(u * Math.PI * 6)); raised = true; }
      else if (t > e && t < e + 0.4) { X.arms(p, 8, lerp(150, -8, (t - e) / 0.4)); raised = true; }
      else if (raised) { X.arms(p, 8, -8); raised = false; }
    });
  };
  // point with the right arm (angle in degrees) from cue k to cue `until`
  X.point = (p, k, ang = 90, o = {}) => {
    X.each(() => {
      const a = X.P(k, o.f || 0, 0, 0.5) * (1 - (o.until != null ? X.P(o.until, o.uf || 0, 0, 0.5) : 0));
      X.arms(p, 8, lerp(-8, ang, a));
    });
  };
  // recap card at cue k: dims the scene and lists the points one by one, timed across the spoken line
  X.recap = (k, items, o = {}) => {
    const g = E('g', null, root);
    const dim = E('rect', { x: 0, y: 0, width: 1920, height: 1080, fill: C.bg, opacity: 0.88 }, g);
    const w = o.w || 1180, n = items.length, h = 150 + n * 92, x = 960 - w / 2, y = Math.max(140, 520 - h / 2);
    E('rect', { x: x + 8, y: y + 8, width: w, height: h, rx: 22, fill: C.shadow }, g);
    E('rect', { x, y, width: w, height: h, rx: 22, fill: C.card, stroke: C.line, 'stroke-width': 2 }, g);
    const tt = E('text', { x: x + 60, y: y + 78, 'font-size': 44, 'font-weight': 600, fill: C.ink, 'font-family': F.serif }, g); tt.textContent = 'Recap';
    E('rect', { x: x + 60, y: y + 96, width: 70, height: 5, rx: 2, fill: C.ochre }, g);
    const rows = items.map((it, i) => {
      const r = E('g', null, g);
      const cy = y + 160 + i * 92;
      E('circle', { cx: x + 82, cy: cy - 10, r: 20, fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, r);
      E('path', { d: `M${x + 72},${cy - 10} L${x + 79},${cy - 2} L${x + 93},${cy - 19}`, fill: 'none', stroke: C.green, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r);
      const t = E('text', { x: x + 124, y: cy, 'font-size': 33, 'font-weight': 500, fill: C.ink, 'font-family': F.sans }, r); t.textContent = it;
      return r;
    });
    X.each(t => {
      const p = clamp((t - X.at(k)) / 0.6);
      g.style.display = p > 0 ? '' : 'none';
      g.style.opacity = ease(p);
      rows.forEach((r, i) => {
        const q = ease(clamp((t - X.at(k, 0.12 + 0.8 * i / n)) / 0.5));
        r.style.opacity = q; r.setAttribute('transform', `translate(${((1 - q) * -30).toFixed(1)} 0)`);
      });
    });
    return g;
  };
  return X;
}

// ---------------- icons (drawn around 0,0, roughly 120 x 120, flat fill + ink outline) ----------------
const ICONS = {
  bank(g, c, o) {
    E('path', { d: 'M-66,-18 L0,-62 L66,-18 Z', fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    for (const x of [-42, -14, 14, 42]) E('rect', { x: x - 8, y: -12, width: 16, height: 48, fill: o.fill2 || C.card, stroke: c, 'stroke-width': 4 }, g);
    E('rect', { x: -70, y: 38, width: 140, height: 14, rx: 3, fill: c }, g);
  },
  phone(g, c, o) {
    E('rect', { x: -34, y: -60, width: 68, height: 120, rx: 12, fill: o.fill || C.card, stroke: c, 'stroke-width': 5 }, g);
    E('rect', { x: -24, y: -46, width: 48, height: 80, rx: 4, fill: o.screen || C.blueL }, g);
    E('circle', { cx: 0, cy: 46, r: 5, fill: c }, g);
  },
  server(g, c, o) {
    for (const y of [-52, -14, 24]) { E('rect', { x: -54, y, width: 108, height: 32, rx: 6, fill: o.fill || C.card, stroke: c, 'stroke-width': 4 }, g); E('circle', { cx: 36, cy: y + 16, r: 5, fill: o.led || C.green }, g); E('line', { x1: -38, y1: y + 16, x2: 10, y2: y + 16, stroke: c, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 }, g); }
  },
  log(g, c, o) {
    E('path', { d: 'M-42,-56 L20,-56 L46,-30 L46,58 L-42,58 Z', fill: o.fill || C.card, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    E('path', { d: 'M20,-56 L20,-30 L46,-30', fill: 'none', stroke: c, 'stroke-width': 4 }, g);
    for (const y of [-14, 6, 26, 42]) E('line', { x1: -28, y1: y, x2: 32, y2: y, stroke: c, 'stroke-width': 4, opacity: 0.55, 'stroke-linecap': 'round' }, g);
  },
  cloud(g, c, o) {
    E('path', { d: 'M-50,30 Q-75,30 -70,5 Q-68,-18 -42,-16 Q-36,-46 -4,-44 Q24,-44 30,-18 Q62,-22 64,8 Q66,30 42,30 Z', fill: o.fill || C.blueL, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  },
  person(g, c, o) {
    E('circle', { cx: 0, cy: -26, r: 22, fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-42,50 Q-42,6 0,6 Q42,6 42,50 Z', fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  },
  key(g, c, o) {
    E('circle', { cx: -26, cy: 0, r: 22, fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 6 }, g);
    E('circle', { cx: -26, cy: 0, r: 7, fill: c }, g);
    E('path', { d: 'M-4,0 L50,0 M32,0 L32,18 M44,0 L44,14', fill: 'none', stroke: c, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
  },
  lock(g, c, o) {
    E('path', { d: 'M-22,-6 L-22,-28 Q-22,-50 0,-50 Q22,-50 22,-28 L22,-6', fill: 'none', stroke: c, 'stroke-width': 7 }, g);
    E('rect', { x: -38, y: -8, width: 76, height: 60, rx: 10, fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 5 }, g);
    E('circle', { cx: 0, cy: 16, r: 8, fill: c }, g); E('rect', { x: -3, y: 18, width: 6, height: 16, fill: c }, g);
  },
  unlock(g, c, o) {
    E('path', { d: 'M-22,-6 L-22,-28 Q-22,-50 0,-50 Q22,-50 22,-34', fill: 'none', stroke: c, 'stroke-width': 7 }, g);
    E('rect', { x: -38, y: -8, width: 76, height: 60, rx: 10, fill: o.fill || C.redL, stroke: c, 'stroke-width': 5 }, g);
    E('circle', { cx: 0, cy: 16, r: 8, fill: c }, g);
  },
  file(g, c, o) {
    E('path', { d: 'M-38,-52 L16,-52 L42,-26 L42,52 L-38,52 Z', fill: o.fill || C.card, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    E('path', { d: 'M16,-52 L16,-26 L42,-26', fill: 'none', stroke: c, 'stroke-width': 4 }, g);
  },
  db(g, c, o) {
    E('path', { d: 'M-46,-38 L-46,38 Q0,62 46,38 L46,-38', fill: o.fill || C.blueL, stroke: c, 'stroke-width': 5 }, g);
    E('ellipse', { cx: 0, cy: -38, rx: 46, ry: 15, fill: o.fill2 || C.card, stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-46,0 Q0,24 46,0', fill: 'none', stroke: c, 'stroke-width': 4, opacity: 0.6 }, g);
  },
  shield(g, c, o) {
    E('path', { d: 'M0,-58 L48,-40 L48,4 Q48,42 0,60 Q-48,42 -48,4 L-48,-40 Z', fill: o.fill || C.tealL, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    if (o.check) E('path', { d: 'M-20,2 L-4,18 L22,-14', fill: 'none', stroke: c, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  },
  clock(g, c, o) {
    E('circle', { cx: 0, cy: 0, r: 48, fill: o.fill || C.card, stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M0,0 L0,-30 M0,0 L-22,-12', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  },
  chat(g, c, o) {
    E('path', { d: 'M-52,-40 L52,-40 Q60,-40 60,-32 L60,22 Q60,30 52,30 L-10,30 L-32,50 L-30,30 L-52,30 Q-60,30 -60,22 L-60,-32 Q-60,-40 -52,-40 Z', fill: o.fill || C.plumL, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    for (const x of [-24, 0, 24]) E('circle', { cx: x, cy: -5, r: 6, fill: c }, g);
  },
  laptop(g, c, o) {
    E('rect', { x: -50, y: -42, width: 100, height: 66, rx: 6, fill: o.fill || C.blueL, stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-66,36 L66,36 L56,24 L-56,24 Z', fill: c }, g);
  },
  envelope(g, c, o) {
    E('rect', { x: -52, y: -34, width: 104, height: 68, rx: 6, fill: o.fill || C.card, stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-50,-30 L0,8 L50,-30', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  },
  alert(g, c, o) {
    E('path', { d: 'M0,-54 L58,48 L-58,48 Z', fill: o.fill || C.redL, stroke: c, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
    E('line', { x1: 0, y1: -14, x2: 0, y2: 16, stroke: c, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    E('circle', { cx: 0, cy: 32, r: 5, fill: c }, g);
  },
  brain(g, c, o) {
    E('path', { d: 'M0,-48 Q-30,-56 -40,-30 Q-62,-24 -54,2 Q-64,26 -40,36 Q-30,56 0,46 Q30,56 40,36 Q64,26 54,2 Q62,-24 40,-30 Q30,-56 0,-48 Z', fill: o.fill || C.plumL, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    E('path', { d: 'M0,-48 L0,46 M-34,-8 Q-18,-2 -22,16 M34,-8 Q18,-2 22,16', fill: 'none', stroke: c, 'stroke-width': 4 }, g);
  },
  atom(g, c, o) {
    for (const r of [0, 60, 120]) E('ellipse', { cx: 0, cy: 0, rx: 56, ry: 20, fill: 'none', stroke: c, 'stroke-width': 4, transform: `rotate(${r})` }, g);
    E('circle', { cx: 0, cy: 0, r: 10, fill: o.fill || C.plum }, g);
  },
  gear(g, c, o) {
    E('circle', { cx: 0, cy: 0, r: 34, fill: o.fill || C.sand, stroke: c, 'stroke-width': 10, 'stroke-dasharray': '13 9' }, g);
    E('circle', { cx: 0, cy: 0, r: 12, fill: c }, g);
  },
  qr(g, c) {
    E('rect', { x: -40, y: -40, width: 80, height: 80, fill: C.card, stroke: c, 'stroke-width': 4 }, g);
    const cells = [[0, 0], [1, 2], [2, 1], [3, 3], [0, 3], [3, 0], [2, 2], [1, 0], [4, 4], [4, 1], [1, 4]];
    for (const [i, j] of cells) E('rect', { x: -34 + i * 14, y: -34 + j * 14, width: 11, height: 11, fill: c }, g);
  },
  idcard(g, c, o) {
    E('rect', { x: -70, y: -44, width: 140, height: 88, rx: 10, fill: o.fill || C.card, stroke: c, 'stroke-width': 5 }, g);
    E('circle', { cx: -38, cy: -6, r: 16, fill: o.accent || C.ochreL, stroke: c, 'stroke-width': 3 }, g);
    E('path', { d: 'M-60,26 Q-38,4 -16,26', fill: o.accent || C.ochreL, stroke: c, 'stroke-width': 3 }, g);
    for (const [y, w] of [[-18, 62], [0, 48], [18, 56]]) E('line', { x1: 0, y1: y, x2: w, y2: y, stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.6 }, g);
  },
  card(g, c, o) {
    E('rect', { x: -72, y: -46, width: 144, height: 92, rx: 12, fill: o.fill || C.blue, stroke: c, 'stroke-width': 4 }, g);
    E('rect', { x: -52, y: -18, width: 30, height: 22, rx: 4, fill: C.ochre }, g);
    E('line', { x1: -52, y1: 24, x2: 40, y2: 24, stroke: C.card, 'stroke-width': 6, 'stroke-dasharray': '14 8' }, g);
  },
  building(g, c, o) {
    E('rect', { x: -50, y: -60, width: 100, height: 120, rx: 4, fill: o.fill || C.sand, stroke: c, 'stroke-width': 5 }, g);
    for (const y of [-42, -14, 14]) for (const x of [-30, 0, 30]) E('rect', { x: x - 9, y, width: 18, height: 18, fill: C.card, stroke: c, 'stroke-width': 3 }, g);
    E('rect', { x: -12, y: 36, width: 24, height: 24, fill: c }, g);
  },
  trash(g, c, o) {
    E('path', { d: 'M-36,-30 L-28,52 L28,52 L36,-30 Z', fill: o.fill || C.sand, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    E('line', { x1: -46, y1: -32, x2: 46, y2: -32, stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
    E('path', { d: 'M-14,-32 L-14,-44 L14,-44 L14,-32', fill: 'none', stroke: c, 'stroke-width': 5 }, g);
  },
  magnifier(g, c, o) {
    E('circle', { cx: -10, cy: -10, r: 36, fill: o.fill || C.blueL, stroke: c, 'stroke-width': 7 }, g);
    E('line', { x1: 16, y1: 16, x2: 50, y2: 50, stroke: c, 'stroke-width': 12, 'stroke-linecap': 'round' }, g);
  },
  scale(g, c, o) { // law / justice
    E('line', { x1: 0, y1: -56, x2: 0, y2: 50, stroke: c, 'stroke-width': 6 }, g);
    E('line', { x1: -50, y1: -40, x2: 50, y2: -40, stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
    for (const x of [-50, 50]) E('path', { d: `M${x - 24},0 Q${x},24 ${x + 24},0 Z M${x - 24},0 L${x},-40 L${x + 24},0`, fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    E('rect', { x: -30, y: 46, width: 60, height: 10, rx: 4, fill: c }, g);
  },
  bulb(g, c, o) {
    E('path', { d: 'M-30,0 Q-40,-50 0,-54 Q40,-50 30,0 Q22,12 20,26 L-20,26 Q-22,12 -30,0 Z', fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    E('rect', { x: -18, y: 30, width: 36, height: 16, rx: 4, fill: c }, g);
  },
  coin(g, c, o) {
    E('circle', { cx: 0, cy: 0, r: 44, fill: o.fill || C.ochreL, stroke: c, 'stroke-width': 5 }, g);
    const t = E('text', { x: 0, y: 16, 'font-size': 46, 'font-weight': 700, fill: c, 'text-anchor': 'middle', 'font-family': F.sans }, g); t.textContent = '₹';
  },
  pipe(g, c, o) {
    E('rect', { x: -60, y: -18, width: 120, height: 36, rx: 6, fill: o.fill || C.blueL, stroke: c, 'stroke-width': 5 }, g);
  }
};

// ---------------- global player ----------------
let BUILT = [], CUR = -1, SUB, SUBTXT, HDR_LABEL, HDR_TITLE, HDR, BAR, PARTTXT;
function init() {
  const svg = document.getElementById('stage');
  const T = window.TIMING;
  E('rect', { x: 0, y: 0, width: 1920, height: 1080, fill: C.bg }, svg);
  const content = E('g', null, svg);
  // header strip (outside the camera)
  HDR = E('g', null, svg);
  E('rect', { x: 0, y: 0, width: 1920, height: 112, fill: C.bg, opacity: 0.94 }, HDR);
  HDR_LABEL = E('text', { x: 64, y: 46, 'font-size': 20, 'font-weight': 700, fill: C.ochre, 'letter-spacing': 3, 'font-family': F.sans }, HDR);
  HDR_TITLE = E('text', { x: 64, y: 88, 'font-size': 38, 'font-weight': 600, fill: C.ink, 'font-family': F.serif }, HDR);
  E('line', { x1: 64, y1: 110, x2: 1856, y2: 110, stroke: C.line, 'stroke-width': 1.5 }, HDR);
  const terms = E('g', null, svg);
  // progress bar
  E('rect', { x: 0, y: 1074, width: 1920, height: 6, fill: C.sand }, svg);
  BAR = E('rect', { x: 0, y: 1074, width: 0, height: 6, fill: C.ink2 }, svg);
  for (const s of T.scenes) if (s.part) E('rect', { x: 1920 * s.start / T.total - 1.5, y: 1070, width: 3, height: 10, fill: C.ochre }, svg);
  for (const s of T.scenes) {
    const root = E('g', null, content);
    const cam = E('g', null, root);
    const termRoot = E('g', null, terms);
    const cues = s.cues.map(c => ({ t: c.t - s.start, d: c.d, text: c.text }));
    const X = makeCtx(root, cam, cues, s.end - s.start, termRoot);
    X.scene = s;
    (SCENES[s.id] || (X => { X.text(960, 520, s.title, { anchor: 'middle', size: 64, serif: true, w: 600 }); X.text(960, 590, '(scene ' + s.id + ' not drawn yet)', { anchor: 'middle', size: 26, fill: C.ink3 }); }))(X);
    root.style.display = 'none'; termRoot.style.display = 'none';
    BUILT.push({ s, root, termRoot, X });
  }
  SUB = document.getElementById('sub'); SUBTXT = document.getElementById('subtxt');
}
function seek(t) {
  const T = window.TIMING;
  let i = T.scenes.findIndex(s => t >= s.start && t < s.end);
  if (i < 0) i = t < 0 ? 0 : T.scenes.length - 1;
  const b = BUILT[i];
  if (i !== CUR) {
    if (CUR >= 0) { BUILT[CUR].root.style.display = 'none'; BUILT[CUR].termRoot.style.display = 'none'; }
    b.root.style.display = ''; b.termRoot.style.display = '';
    HDR_LABEL.textContent = (b.s.label || '').toUpperCase(); HDR_TITLE.textContent = b.s.title;
    HDR.style.display = b.s.part || b.s.noHeader ? 'none' : '';
    CUR = i;
  }
  const lt = t - b.s.start;
  const fin = clamp(lt / 0.5), fout = clamp((b.s.end - t) / 0.4);
  const fade = Math.min(fin, fout);
  b.root.style.opacity = fade;
  b.root.style.transform = `translateY(${((1 - ease(fin)) * 14).toFixed(2)}px)`;
  b.termRoot.style.opacity = fade;
  HDR_TITLE.style.opacity = HDR_LABEL.style.opacity = fade;
  b.X.update(lt);
  BAR.setAttribute('width', 1920 * t / T.total);
  let txt = '', op = 0;
  for (const c of b.s.cues) {
    if (t >= c.t - 0.1 && t <= c.t + c.d + 0.4) { txt = c.text; op = clamp(Math.min((t - c.t + 0.1) / 0.15, (c.t + c.d + 0.4 - t) / 0.15)); break; }
  }
  if (SUBTXT.textContent !== txt) SUBTXT.textContent = txt;
  SUB.style.opacity = txt ? op : 0;
}
window.seek = seek;

// ---------------- shared part title card ----------------
function partScene(X, n, title, icons) {
  X.cam([{ x: 960, y: 540, s: 1.06 }, { k: 0, x: 960, y: 520, s: 1, len: 3 }]);
  const big = X.text(960, 430, 'Part ' + n, { anchor: 'middle', size: 54, w: 600, fill: C.ochre, serif: true, ls: 2 });
  X.show(big, 0, { type: 'down', len: 0.9 });
  const tt = X.text(960, 540, title, { anchor: 'middle', size: 84, w: 600, serif: true });
  X.show(tt, 0, { f: 0.15, type: 'up', len: 1 });
  const ln = X.path('M660,600 L1260,600', { color: C.ink2, sw: 3 });
  X.show(ln, 0, { f: 0.3, type: 'draw', len: 1.2 });
  // six dots: which part we are in
  for (let i = 1; i <= 6; i++) {
    const c = X.circle(960 + (i - 3.5) * 46, 680, i === n ? 11 : 8, { fill: i === n ? C.ochre : (i < n ? C.ink2 : C.sand) });
    X.show(c, 0, { f: 0.3 + i * 0.05, type: 'pop' });
  }
  (icons || []).forEach((name, i) => {
    const x = 960 + (i - (icons.length - 1) / 2) * 230;
    const ic = X.icon(name, x, 840, 0.7, { color: C.ink2 });
    X.show(ic, 0, { f: 0.5, d: i * 0.15, type: 'up' });
    X.bob(ic.mid, { amp: 5, per: 2.6, ph: i });
  });
}
