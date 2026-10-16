/* UI helpers and the component library (spec section 3, C1 to C33).
   Components are plain functions that return an HTML string, so the design can
   be read top to bottom and later ported to React with the same class names. */
window.ARAN = window.ARAN || {};
(function (A) {
  const U = (A.ui = {});
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.esc = esc;
  U.fmt = (n) => (n === null || n === undefined ? '–' : Number(n).toLocaleString('en-IN'));
  U.pct = (p) => (p * 100).toFixed(p >= 0.995 || p <= 0.005 ? 1 : 0) + '%';
  U.ago = (t) => { const s = Math.max(0, Math.round(Date.now() / 1000 - t)); return s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : Math.round(s / 3600) + 'h ago'; };
  U.$ = (s, r) => (r || document).querySelector(s);
  U.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  U.reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };

  /* rolling letters (C1 links / buttons) */
  const graphemes = (s) => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter().segment(s)].map((x) => x.segment) : [...s]); // keeps Tamil and Hindi vowel signs on their letter
  U.roll = (text, extra) => `<span class="roll"${extra || ''}>${graphemes(String(text)).map((c, i) => `<span class="rl" style="--i:${i}" data-c="${c === ' ' ? '&nbsp;' : esc(c)}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</span>`;

  /* split a heading into words for the GSAP reveal */
  U.split = (el) => {
    const t = el.textContent; el.setAttribute('aria-label', t); el.classList.add('split');
    el.innerHTML = t.split(' ').map((w) => `<span class="w" aria-hidden="true"><span>${esc(w)}</span></span>`).join(' ');
    return U.$$('.w > span', el);
  };
  U.revealHeading = (el, delay) => {
    if (!el) return; const w = U.split(el);
    if (U.reduced()) return;
    gsap.fromTo(w, { yPercent: 115, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.06, ease: 'power4.out', delay: delay || 0.05 });
  };
  U.reveal = (root) => {
    const items = U.$$('[data-reveal]', root); if (!items.length || U.reduced()) return;
    items.forEach((el) => gsap.set(el, { opacity: 0, y: 28 }));
    items.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }) }));
    ScrollTrigger.refresh();
  };

  /* C24 count-up */
  U.countUp = (el, to, o) => {
    o = o || {}; const fmt = o.format || ((v) => U.fmt(Math.round(v)));
    if (U.reduced()) { el.textContent = fmt(to); return; }
    const s = { v: 0 }; gsap.to(s, { v: to, duration: o.ms || 1.1, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(s.v)) });
  };
  U.runCounts = (root) => U.$$('[data-count]', root).forEach((el) => { const f = el.dataset.fmt; U.countUp(el, parseFloat(el.dataset.count), f === 'dec1' ? { format: (v) => v.toFixed(1) } : f === 'pct' ? { format: (v) => Math.round(v) + '%' } : f === 'dec' ? { format: (v) => v.toFixed(1) } : undefined); });
  /* live refresh: show the final value at once (no count-up replay every poll) */
  U.setCounts = (root) => U.$$('[data-count]', root).forEach((el) => { const v = parseFloat(el.dataset.count), f = el.dataset.fmt; el.textContent = f === 'dec1' || f === 'dec' ? v.toFixed(1) : f === 'pct' ? Math.round(v) + '%' : U.fmt(Math.round(v)); });

  /* C3 stat tile */
  U.stat = (label, value, note, o) => { o = o || {}; return `<div class="card stat ${o.tone || ''} ${o.loading ? 'loading' : ''} plus" ${o.bind ? `data-api="${o.bind}"` : ''}><div class="v">${o.count != null ? `<span data-count="${o.count}" ${o.fmt ? `data-fmt="${o.fmt}"` : ''}>0</span>${o.unit || ''}` : value}</div><div class="l">${label}</div>${note ? `<div class="n">${note}</div>` : ''}</div>`; };
  /* C5 pill, C6 chip */
  U.pill = (t, k) => `<span class="pill ${k || ''}">${t}</span>`;
  U.chip = (t, o) => (o && o.btn ? `<button class="chip ${o.on ? 'on' : ''} ${o.cls || ''}" ${o.attrs || ''}>${t}</button>` : `<span class="chip ${(o && o.cls) || ''}">${t}</span>`);
  /* C14 ID strip */
  U.idStrip = (digits, kind, label, big) => `<div class="idstrip ${kind} ${big ? 'big' : ''}"><div class="cells">${[...digits].map((c) => `<span>${c}</span>`).join('')}</div><div class="idcap">${kind === 'real' ? '✓ ' : kind === 'token' ? '⊘ ' : '! '}${label}</div></div>`;
  /* C12 marked text, C13 token text */
  U.marked = (text, findings, active) => {
    let out = '', last = 0;
    [...findings].sort((a, b) => a.start - b.start).forEach((f, i) => { if (f.start < last) return; out += esc(text.slice(last, f.start)) + `<mark class="${f.protected ? 'm-real' : 'm-raw'} ${active === i ? 'act' : ''}" data-i="${i}" tabindex="0" data-tip="${A.TYPE[f.type] || f.type} · ${U.pct(f.p)}">${esc(text.slice(f.start, f.end))}</mark>`; last = f.end; });
    return `<pre class="logline mono">${out + esc(text.slice(last))}</pre>`;
  };
  U.tokenText = (text, findings) => {
    const toks = [...new Set(findings.map((f) => f.token).filter(Boolean))]; let s = esc(text);
    toks.forEach((t) => { s = s.split(esc(t)).join(`<mark class="m-token">${esc(t)}</mark>`); });
    s = s.replace(/(&lt;[A-Z]+:withheld-erased&gt;|&lt;OTP:destroyed&gt;)/g, '<mark class="m-token">$1</mark>');
    return `<pre class="logline mono">${s}</pre>`;
  };
  /* C15 confidence bar, C16 gauge, C17 rank row */
  U.bar = (p, thr) => `<div class="bar" role="img" aria-label="confidence ${U.pct(p)}"><i style="width:${Math.max(1, p * 100)}%"></i>${thr != null ? `<span class="thr" style="left:${thr * 100}%" data-tip="threshold ${thr}"></span>` : ''}</div>`;
  U.gauge = (p, thr) => { const a = (v) => Math.PI * (1 - v), pt = (v, r) => [100 + r * Math.cos(a(v)), 100 - r * Math.sin(a(v))]; const arc = 251.3, [tx1, ty1] = pt(thr, 74), [tx2, ty2] = pt(thr, 92); return `<svg class="gauge" viewBox="0 0 200 118" role="img" aria-label="probability ${U.pct(p)}"><path class="bg" d="M 20 100 A 80 80 0 0 1 180 100"/><path class="fg" d="M 20 100 A 80 80 0 0 1 180 100" stroke-dasharray="${(arc * p).toFixed(1)} ${arc}"/><line class="thr" x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}"><title>threshold ${thr}</title></line><line class="needle" x1="100" y1="100" x2="100" y2="34" style="transform:rotate(${(p * 180 - 90).toFixed(1)}deg)"/><circle class="hub" cx="100" cy="100" r="5"/><text class="gt" x="100" y="86">${U.pct(p)}</text></svg>`; };
  U.rankRow = (label, share, val, i) => `<div class="rank"><span>${label}</span><div class="bar"><i style="width:${share * 100}%;animation-delay:${(i || 0) * 80}ms"></i></div><span class="val">${val}</span></div>`;
  /* C19 notes, C20 skeleton, C21 spinner, C22 disclosure, C25 verdict */
  U.note = (kind, msg) => `<div class="note ${kind}" role="${kind === 'err' ? 'alert' : 'status'}">${kind === 'ok' ? '✓ ' : ''}${msg}</div>`;
  U.skeleton = (h) => `<div class="skeleton" style="min-height:${h || 220}px" aria-hidden="true"></div>`;
  U.hood = (body) => `<details class="hood"><summary>Under the hood</summary><div class="body">${body}</div></details>`;
  U.verdict = (ok, html) => `<div class="verdict ${ok ? 'ok' : 'bad'}" role="status"><span>${ok ? '✓' : '✗'}</span><span>${html}</span></div>`;
  U.member = (i, n, r) => `<div class="member"><span class="avatar">${i}</span><div><b>${n}</b><div class="small muted">${r}</div></div></div>`;
  /* C28 key icon */
  U.keyIcon = (state) => { const shards = [[-30, -22, -40], [34, -26, 50], [-24, 26, 30], [38, 24, -60], [4, -36, 15]].map(([dx, dy, r], i) => `<rect class="shard" x="${14 + i * 8}" y="14" width="9" height="9" style="--dx:${dx}px;--dy:${dy}px;--r:${r}deg"/>`).join(''); return `<svg viewBox="0 0 64 40" aria-hidden="true">${state === 'gone' ? shards : '<circle class="kc" cx="14" cy="20" r="11"/><circle class="hole" cx="14" cy="20" r="4"/><rect class="kc" x="22" y="18" width="38" height="4"/><rect class="kc" x="46" y="22" width="4" height="8"/><rect class="kc" x="54" y="22" width="4" height="6"/>'}</svg>`; };

  /* C23 step controls (works with an object that has play/pause/back/forward/skip) */
  U.controls = (label) => `<div class="ctl"><button class="btn sm" data-c="play"><span>▶ ${label || 'Play'}</span></button><button class="btn secondary sm" data-c="back" aria-label="Back one step">‹</button><button class="btn secondary sm" data-c="fwd" aria-label="Forward one step">›</button><button class="btn ghost sm" data-c="skip">Skip to end</button><span class="count mono" data-c="count"></span></div>`;
  U.stepper = (root, total, ms, render, o) => {
    o = o || {}; let i = o.start || 0, timer = null, playing = false; const $ = (s) => U.$(`[data-c="${s}"]`, root);
    const draw = () => { render(i); const c = $('count'); if (c) c.textContent = `${Math.min(i + 1, total)}/${total}`; const p = $('play'); if (p) p.firstElementChild.textContent = playing ? '❚❚ Pause' : i >= total - 1 ? '↺ Replay' : '▶ ' + (o.label || 'Play'); };
    const stop = () => { clearInterval(timer); playing = false; draw(); };
    const play = () => { if (i >= total - 1) i = 0; playing = true; draw(); clearInterval(timer); timer = setInterval(() => { if (i >= total - 1) return stop(); i++; draw(); }, ms); };
    $('play').onclick = () => (playing ? stop() : play()); $('back').onclick = () => { stop(); i = Math.max(0, i - 1); draw(); }; $('fwd').onclick = () => { stop(); i = Math.min(total - 1, i + 1); draw(); }; $('skip').onclick = () => { stop(); i = total - 1; draw(); };
    if (U.reduced()) { i = total - 1; draw(); } else { draw(); if (o.auto !== false) setTimeout(play, 250); }
    return { stop, play, set: (n) => { i = n; draw(); }, destroy: () => clearInterval(timer) };
  };

  /* toast + C31 confirm dialog */
  U.toast = (msg) => { let t = U.$('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800); };
  U.confirm = ({ title, body, confirmLabel }) => new Promise((resolve) => {
    const back = U.html(`<div class="dialog-back open" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><div class="dialog"><h3 id="dlg-t">${title}</h3><p class="muted">${body}</p><div class="actions"><button class="btn secondary" data-a="no">Cancel</button><button class="btn danger" data-a="yes">${confirmLabel || 'Confirm'}</button></div></div></div>`);
    const done = (v) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') done(false); };
    back.onclick = (e) => { if (e.target === back) done(false); const a = e.target.closest('[data-a]'); if (a) done(a.dataset.a === 'yes'); };
    document.addEventListener('keydown', onKey); document.body.appendChild(back); U.$('[data-a="no"]', back).focus();
  });

  /* tabs (C7) wiring: [role=tablist] buttons toggle sibling [data-panel] */
  U.tabs = (root, onChange) => { U.$$('[role="tab"]', root).forEach((b) => (b.onclick = () => { U.$$('[role="tab"]', root).forEach((x) => x.setAttribute('aria-selected', x === b)); U.$$('[data-panel]', root).forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.tab)); onChange && onChange(b.dataset.tab); })); };

  /* page header pattern (spec 2.5) */
  U.phead = (eyebrow, title, lede) => `<header class="phead"><div class="eyebrow">${eyebrow}</div><h1 data-split>${title}</h1>${lede ? `<p class="lede" data-reveal>${lede}</p>` : ''}</header>`;
  U.btn = (label, o) => { o = o || {}; return `<button class="btn ${o.cls || ''}" ${o.attrs || ''}>${o.label !== false ? `<span>${label}</span>` : label}${o.arrow ? '<span class="arr">→</span>' : ''}</button>`; };

  /* download-safe SVG chip for the pipeline */
  U.svgChip = (cls, text, w) => `<g class="chip-svg ${cls}"><rect x="${-w / 2}" y="-11" width="${w}" height="22"/><text y="4">${esc(text)}</text></g>`;
})(window.ARAN);
