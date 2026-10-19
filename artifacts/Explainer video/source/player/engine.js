// Deterministic animation engine: every frame is a pure function of time t.
const NS = 'http://www.w3.org/2000/svg';
const C = {
  bg: '#0b1220', panel: '#121b2e', panel2: '#1a2540', line: '#2b3b5c', text: '#e9eef8', muted: '#93a1bb',
  dim: '#5b6885', teal: '#2dd4bf', red: '#f87171', amber: '#fbbf24', blue: '#60a5fa', violet: '#a78bfa',
  green: '#4ade80', pink: '#f472b6', orange: '#fb923c'
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = p => 1 - Math.pow(1 - p, 3);
const fmt = n => Math.round(n).toLocaleString('en-US');

function E(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const SCENES = {};
function scene(id, build) { SCENES[id] = build; }

function makeCtx(root, cues, dur) {
  const anims = [], fns = [];
  const X = { root, cues, dur, t: 0 };
  X.at = (k, f = 0, d = 0) => {
    if (k >= cues.length) return dur - 0.5 + d;
    const c = cues[k];
    return c.t + f * c.d + d;
  };
  X.P = (k, f = 0, d = 0, len = 0.7) => ease(clamp((X.t - X.at(k, f, d)) / len));
  X.L = (k, f0 = 0, f1 = 1) => { // linear progress through part of cue k's speech
    const c = cues[Math.min(k, cues.length - 1)];
    return clamp((X.t - (c.t + f0 * c.d)) / Math.max(0.01, (f1 - f0) * c.d));
  };
  X.g = (parent) => E('g', null, parent || root);
  X.show = (el, k, o = {}) => {
    anims.push({ el, k, f: o.f || 0, d: o.d || 0, len: o.len || 0.7, type: o.type || 'up',
      out: o.out, outf: o.outf || 0, outd: o.outd || 0, outLen: o.outLen || 0.5, dist: o.dist || 28, op: o.op == null ? 1 : o.op });
    el.style.opacity = 0;
    el.classList.add('an');
    return el;
  };
  X.each = fn => fns.push(fn);
  X.update = t => {
    X.t = t;
    for (const a of anims) {
      const ti = X.at(a.k, a.f, a.d);
      let p = ease(clamp((t - ti) / a.len));
      let q = 1;
      if (a.out != null) q = 1 - ease(clamp((t - X.at(a.out, a.outf, a.outd)) / a.outLen));
      const el = a.el;
      if (a.type === 'draw') {
        el.style.opacity = (p > 0 ? 1 : 0) * q * a.op;
        const paths = el._paths || [];
        for (const pth of paths) pth.style.strokeDashoffset = 1 - p;
        if (el._head) el._head.style.opacity = p > 0.95 ? 1 : 0;
        continue;
      }
      el.style.opacity = p * q * a.op;
      let tr = '';
      if (a.type === 'up') tr = `translateY(${(1 - p) * a.dist}px)`;
      else if (a.type === 'down') tr = `translateY(${-(1 - p) * a.dist}px)`;
      else if (a.type === 'left') tr = `translateX(${-(1 - p) * a.dist * 1.5}px)`;
      else if (a.type === 'right') tr = `translateX(${(1 - p) * a.dist * 1.5}px)`;
      else if (a.type === 'pop') tr = `scale(${0.6 + 0.4 * easeOut(p)})`;
      if (tr !== el._tr) { el.style.transform = tr; el._tr = tr; }
      el.style.visibility = p * q <= 0.001 ? 'hidden' : 'visible';
    }
    for (const fn of fns) fn(t);
  };

  // ---------- builders (absolute coordinates) ----------
  X.text = (x, y, str, o = {}) => {
    const g = X.g(o.parent);
    const size = o.size || 32;
    const t = E('text', {
      x, y, 'font-size': size, 'font-weight': o.w || 500, fill: o.fill || C.text,
      'text-anchor': o.anchor || 'start', 'font-family': o.mono ? 'DejaVu Sans Mono, monospace' : (o.family || 'Inter, Noto Sans Tamil, Noto Sans Devanagari, sans-serif'),
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
    g.r = E('rect', { x, y, width: w, height: h, rx: o.r == null ? 16 : o.r, fill: o.fill || C.panel,
      stroke: o.stroke || C.line, 'stroke-width': o.sw == null ? 2 : o.sw }, g);
    if (o.dash) g.r.setAttribute('stroke-dasharray', o.dash);
    return g;
  };
  X.box = (x, y, w, h, o = {}) => {
    const g = X.rect(x, y, w, h, o);
    const size = o.size || 30;
    const lines = (o.label || '').split('\n').length;
    if (o.label != null) {
      const ty = o.sub ? y + h / 2 - 4 : y + h / 2 + size * 0.35 - (lines - 1) * size * 0.65;
      g.t = X.text(x + w / 2, ty, o.label, { size, w: o.w || 600, fill: o.color || C.text, anchor: 'middle', parent: g, mono: o.mono, lh: size * 1.3 });
    }
    if (o.sub) g.s = X.text(x + w / 2, y + h / 2 + (o.subSize || 22) + 6, o.sub, { size: o.subSize || 22, w: 400, fill: o.subColor || C.muted, anchor: 'middle', parent: g, lh: (o.subSize || 22) * 1.3 });
    return g;
  };
  X.chip = (x, y, str, o = {}) => {
    const size = o.size || 24;
    const w = o.width || (str.length * size * (o.mono ? 0.62 : 0.56) + size * 1.4);
    const h = size * 1.75;
    const g = X.rect(x - w / 2, y - h / 2, w, h, { r: h / 2, fill: o.fill || C.panel2, stroke: o.stroke || o.color || C.line, sw: o.sw || 2, parent: o.parent });
    g.t = X.text(x, y + size * 0.36, str, { size, w: o.w || 600, fill: o.color || C.text, anchor: 'middle', parent: g, mono: o.mono });
    g.w = w;
    return g;
  };
  X.line = (x1, y1, x2, y2, o = {}) => {
    const g = X.g(o.parent);
    E('line', { x1, y1, x2, y2, stroke: o.color || C.line, 'stroke-width': o.sw || 3, 'stroke-dasharray': o.dash || 'none', 'stroke-linecap': 'round' }, g);
    return g;
  };
  X.path = (d, o = {}) => {
    const g = X.g(o.parent);
    const p = E('path', { d, fill: o.fill || 'none', stroke: o.color || C.muted, 'stroke-width': o.sw || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 }, g);
    p.style.strokeDasharray = o.dash ? o.dash : 1;
    g._paths = [p]; g.p = p;
    return g;
  };
  X.arrow = (x1, y1, x2, y2, o = {}) => {
    const g = X.g(o.parent);
    const color = o.color || C.muted;
    let d;
    if (o.bend) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
      const cx = mx - dy * o.bend, cy = my + dx * o.bend;
      d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
    } else d = `M${x1},${y1} L${x2},${y2}`;
    const p = E('path', { d, fill: 'none', stroke: color, 'stroke-width': o.sw || 4, 'stroke-linecap': 'round', pathLength: 1 }, g);
    p.style.strokeDasharray = 1;
    // arrow head (tangent at the end)
    let ang = Math.atan2(y2 - y1, x2 - x1);
    if (o.bend) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const cx = mx - (y2 - y1) * o.bend, cy = my + (x2 - x1) * o.bend; ang = Math.atan2(y2 - cy, x2 - cx); }
    const hs = o.head || 20;
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
      extra.push(acc);
      cnt++;
      if (groups && gi < groups.length && cnt === groups[gi]) { acc += o.groupGap || 22; gi++; cnt = 0; }
    }
    const total = n * cw + (n - 1) * gap + extra[n - 1];
    const x0 = (o.anchor === 'start') ? cx : cx - total / 2;
    g.cells = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (cw + gap) + extra[i];
      const cg = E('g', null, g);
      const r = E('rect', { x, y, width: cw, height: ch, rx: 10, fill: o.fill || C.panel2, stroke: o.stroke || C.line, 'stroke-width': 2 }, cg);
      const t = E('text', { x: x + cw / 2, y: y + ch / 2 + size * 0.36, 'font-size': size, 'font-weight': 600, fill: o.color || C.text, 'text-anchor': 'middle', 'font-family': 'DejaVu Sans Mono, monospace' }, cg);
      t.textContent = str[i];
      g.cells.push({ g: cg, r, t, x, cx: x + cw / 2, y, w: cw, h: ch });
    }
    g.x0 = x0; g.total = total;
    g.set = s => { for (let i = 0; i < n; i++) if (g.cells[i].t.textContent !== s[i]) g.cells[i].t.textContent = s[i] || ''; };
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
  X.mark = (x, y, ok, o = {}) => { // check or cross in a circle
    const g = X.g(o.parent);
    const s = o.s || 30, col = ok ? (o.color || C.green) : (o.color || C.red);
    E('circle', { cx: x, cy: y, r: s, fill: col, opacity: 0.18 }, g);
    E('circle', { cx: x, cy: y, r: s, fill: 'none', stroke: col, 'stroke-width': 3 }, g);
    const k = s * 0.45;
    if (ok) E('path', { d: `M${x - k},${y} L${x - k * 0.25},${y + k * 0.75} L${x + k},${y - k * 0.7}`, fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    else E('path', { d: `M${x - k},${y - k} L${x + k},${y + k} M${x + k},${y - k} L${x - k},${y + k}`, fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    return g;
  };
  X.icon = (name, x, y, s = 1, o = {}) => {
    const outer = X.g(o.parent);
    const g = E('g', { transform: `translate(${x},${y}) scale(${s})` }, outer);
    ICONS[name](g, o.color || C.text, o);
    return outer;
  };
  X.term = (k, word, meaning, o = {}) => {
    const g = X.g(TERMLAYER);
    const w = 700, h = 84, x = 1920 - 60 - w, y = 18;
    E('rect', { x, y, width: w, height: h, rx: 14, fill: '#152039', stroke: C.amber, 'stroke-width': 2 }, g);
    const t1 = E('text', { x: x + 24, y: y + 36, 'font-size': 26, 'font-weight': 700, fill: C.amber, 'font-family': 'Inter, sans-serif' }, g);
    t1.textContent = word;
    const t2 = E('text', { x: x + 24, y: y + 68, 'font-size': 22, 'font-weight': 400, fill: C.text, 'font-family': 'Inter, sans-serif' }, g);
    t2.textContent = meaning;
    X.show(g, k, { f: o.f || 0, type: 'down', out: o.until == null ? k + 1 : o.until, outf: o.outf || 0, dist: 14 });
    return g;
  };
  return X;
}

// ---------- icons (drawn around 0,0, roughly 100x100) ----------
const ICONS = {
  bank(g, c) {
    E('path', { d: 'M-60,-20 L0,-60 L60,-20 Z', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    for (const x of [-42, -14, 14, 42]) E('rect', { x: x - 7, y: -14, width: 14, height: 48, fill: c, opacity: 0.85 }, g);
    E('rect', { x: -64, y: 38, width: 128, height: 10, rx: 3, fill: c }, g);
  },
  phone(g, c) {
    E('rect', { x: -32, y: -56, width: 64, height: 112, rx: 12, fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('line', { x1: -10, y1: 44, x2: 10, y2: 44, stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  },
  server(g, c) {
    for (const y of [-48, -12, 24]) { E('rect', { x: -50, y, width: 100, height: 30, rx: 6, fill: 'none', stroke: c, 'stroke-width': 4 }, g); E('circle', { cx: 34, cy: y + 15, r: 4, fill: c }, g); }
  },
  log(g, c) {
    E('path', { d: 'M-40,-52 L20,-52 L44,-28 L44,56 L-40,56 Z', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    for (const y of [-20, 0, 20, 38]) E('line', { x1: -26, y1: y, x2: 30, y2: y, stroke: c, 'stroke-width': 4, opacity: 0.7 }, g);
  },
  cloud(g, c) {
    E('path', { d: 'M-50,30 Q-75,30 -70,5 Q-68,-18 -42,-16 Q-36,-46 -4,-44 Q24,-44 30,-18 Q62,-22 64,8 Q66,30 42,30 Z', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  },
  person(g, c) {
    E('circle', { cx: 0, cy: -26, r: 22, fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-42,50 Q-42,6 0,6 Q42,6 42,50', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  },
  key(g, c) {
    E('circle', { cx: -26, cy: 0, r: 20, fill: 'none', stroke: c, 'stroke-width': 6 }, g);
    E('path', { d: 'M-6,0 L48,0 M30,0 L30,16 M42,0 L42,12', fill: 'none', stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
  },
  lock(g, c) {
    E('rect', { x: -34, y: -6, width: 68, height: 54, rx: 8, fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-20,-6 L-20,-26 Q-20,-46 0,-46 Q20,-46 20,-26 L20,-6', fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('circle', { cx: 0, cy: 18, r: 6, fill: c }, g);
  },
  file(g, c) {
    E('path', { d: 'M-36,-50 L16,-50 L40,-26 L40,50 L-36,50 Z', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    E('path', { d: 'M16,-50 L16,-26 L40,-26', fill: 'none', stroke: c, 'stroke-width': 4 }, g);
  },
  db(g, c) {
    E('ellipse', { cx: 0, cy: -36, rx: 44, ry: 14, fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-44,-36 L-44,36 Q0,58 44,36 L44,-36', fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-44,0 Q0,22 44,0', fill: 'none', stroke: c, 'stroke-width': 4, opacity: 0.7 }, g);
  },
  shield(g, c) {
    E('path', { d: 'M0,-56 L46,-38 L46,4 Q46,40 0,58 Q-46,40 -46,4 L-46,-38 Z', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  },
  clock(g, c) {
    E('circle', { cx: 0, cy: 0, r: 46, fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M0,0 L0,-30 M0,0 L-22,-12', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  },
  chat(g, c) {
    E('path', { d: 'M-52,-40 L52,-40 Q60,-40 60,-32 L60,22 Q60,30 52,30 L-10,30 L-32,50 L-30,30 L-52,30 Q-60,30 -60,22 L-60,-32 Q-60,-40 -52,-40 Z', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    for (const x of [-24, 0, 24]) E('circle', { cx: x, cy: -5, r: 6, fill: c }, g);
  },
  laptop(g, c) {
    E('rect', { x: -48, y: -40, width: 96, height: 64, rx: 6, fill: 'none', stroke: c, 'stroke-width': 5 }, g);
    E('path', { d: 'M-64,36 L64,36 L54,24 L-54,24 Z', fill: c, opacity: 0.8 }, g);
  },
  send(g, c) {
    E('path', { d: 'M-50,0 L50,-40 L28,44 L6,10 Z M6,10 L50,-40', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  },
  alert(g, c) {
    E('path', { d: 'M0,-52 L56,46 L-56,46 Z', fill: 'none', stroke: c, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
    E('line', { x1: 0, y1: -14, x2: 0, y2: 16, stroke: c, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    E('circle', { cx: 0, cy: 32, r: 5, fill: c }, g);
  },
  brain(g, c) {
    E('path', { d: 'M0,-48 Q-30,-56 -40,-30 Q-62,-24 -54,2 Q-64,26 -40,36 Q-30,56 0,46 Q30,56 40,36 Q64,26 54,2 Q62,-24 40,-30 Q30,-56 0,-48 Z M0,-48 L0,46', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    E('path', { d: 'M-34,-8 Q-18,-2 -22,16 M34,-8 Q18,-2 22,16', fill: 'none', stroke: c, 'stroke-width': 4 }, g);
  },
  atom(g, c) {
    for (const r of [0, 60, 120]) E('ellipse', { cx: 0, cy: 0, rx: 56, ry: 20, fill: 'none', stroke: c, 'stroke-width': 4, transform: `rotate(${r})` }, g);
    E('circle', { cx: 0, cy: 0, r: 9, fill: c }, g);
  },
  gear(g, c) {
    E('circle', { cx: 0, cy: 0, r: 30, fill: 'none', stroke: c, 'stroke-width': 8, 'stroke-dasharray': '12 8' }, g);
    E('circle', { cx: 0, cy: 0, r: 12, fill: c }, g);
  },
  qr(g, c) {
    E('rect', { x: -40, y: -40, width: 80, height: 80, fill: 'none', stroke: c, 'stroke-width': 4 }, g);
    const cells = [[0, 0], [1, 2], [2, 1], [3, 3], [0, 3], [3, 0], [2, 2], [1, 0], [4, 4], [4, 1], [1, 4]];
    for (const [i, j] of cells) E('rect', { x: -34 + i * 14, y: -34 + j * 14, width: 11, height: 11, fill: c }, g);
  }
};

// ---------- global player ----------
let TERMLAYER, BUILT = [], CUR = -1, SUB, SUBTXT, HDR_LABEL, HDR_TITLE, BAR;
function init() {
  const svg = document.getElementById('stage');
  const T = window.TIMING;
  // header
  HDR_LABEL = E('text', { x: 64, y: 50, 'font-size': 22, 'font-weight': 700, fill: C.amber, 'letter-spacing': 3, 'font-family': 'Inter, sans-serif' }, svg);
  HDR_TITLE = E('text', { x: 64, y: 92, 'font-size': 38, 'font-weight': 700, fill: C.text, 'font-family': 'Inter, sans-serif' }, svg);
  E('line', { x1: 64, y1: 116, x2: 1856, y2: 116, stroke: C.line, 'stroke-width': 1.5 }, svg);
  const content = E('g', null, svg);
  TERMLAYER = E('g', null, svg);
  // progress bar
  E('rect', { x: 0, y: 1074, width: 1920, height: 6, fill: '#16203a' }, svg);
  BAR = E('rect', { x: 0, y: 1074, width: 0, height: 6, fill: C.teal }, svg);
  for (const s of T.scenes) E('rect', { x: 1920 * s.start / T.total - 1, y: 1072, width: 2, height: 8, fill: C.dim }, svg);
  for (const s of T.scenes) {
    const root = E('g', null, content);
    const termRoot = E('g', null, TERMLAYER);
    const saved = TERMLAYER; TERMLAYER = termRoot;
    const cues = s.cues.map(c => ({ t: c.t - s.start, d: c.d, text: c.text }));
    const X = makeCtx(root, cues, s.end - s.start);
    (SCENES[s.id] || (X => X.text(960, 500, s.title, { anchor: 'middle', size: 60 })))(X);
    TERMLAYER = saved;
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
    HDR_LABEL.textContent = b.s.label.toUpperCase(); HDR_TITLE.textContent = b.s.title;
    CUR = i;
  }
  const lt = t - b.s.start;
  const fade = Math.min(1, lt / 0.45, (b.s.end - t) / 0.35);
  b.root.style.opacity = clamp(fade);
  b.termRoot.style.opacity = clamp(fade);
  HDR_TITLE.style.opacity = HDR_LABEL.style.opacity = clamp(Math.min(1, lt / 0.45, (b.s.end - t) / 0.35));
  b.X.update(lt);
  BAR.setAttribute('width', 1920 * t / T.total);
  // subtitles
  let txt = '', op = 0;
  for (const c of b.s.cues) {
    if (t >= c.t - 0.1 && t <= c.t + c.d + 0.35) { txt = c.text; op = clamp(Math.min((t - c.t + 0.1) / 0.15, (c.t + c.d + 0.35 - t) / 0.15)); break; }
  }
  if (SUBTXT.textContent !== txt) SUBTXT.textContent = txt;
  SUB.style.opacity = txt ? op : 0;
}
window.seek = seek;
