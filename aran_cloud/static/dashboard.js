/* Aran Cloud workspace dashboard. No inline script on the page (CSP script-src 'self'): all of it is here.
   The key comes in the URL fragment (#key=...) and is kept in sessionStorage by the shared kit.
   Numbers come from the Aran Cloud API only: /v1/counters, /v1/metrics, /v1/transactions, /v1/slo, /v1/usage,
   /v1/keys, /v1/team, /v1/plan, /v1/settings, /v1/audit and /v1/dashboard. A live feed arrives over /v1/stream
   (Server-Sent Events, opened with a short-lived token because EventSource cannot send the X-API-Key header);
   every view also polls, so a dropped stream only makes it a few seconds slower.
   Honesty rules (Learn 28): every number names its window, counts start at 0, "no data" is not "0%",
   freshness is shown, colour always comes with a word or a symbol, one workspace only. */
(function (A) {
  'use strict';
  const K = A.kit, U = A.ui, $ = U.$, $$ = U.$$, esc = K.esc, fmt = U.fmt;

  const VIEWS = [
    ['overview', 'Overview', 'Is Aran working, is it protecting us, is it slowing payments? This workspace only.'],
    ['transactions', 'Transactions', 'Every payment copy sent through Aran, newest first. The cloud keeps the protected text and the counts, never the original values.'],
    ['datamap', 'Data map', 'Where identifiers go: the systems that call Aran, Aran itself, and the destinations that receive tokens.'],
    ['performance', 'Performance', 'How much time Aran adds to a payment, against the latency budget and the service objective.'],
    ['compliance', 'Compliance', 'Erasure receipts, who read real values back, and proof that the audit log was not edited.'],
    ['keys', 'Keys and team', 'Scoped keys for each system and the people who can use the workspace. Secrets are shown once and stored only as SHA-256 hashes.'],
    ['usage', 'Usage and plan', 'This month against the plan. Limits are soft: going over is flagged, a payment is never refused.'],
    ['settings', 'Settings', 'Region, the latency budget and what happens to a copy when Aran does not answer in time.'],
  ];
  const ALIAS = { summary: 'overview', audit: 'compliance', trace: 'compliance', receipts: 'compliance' };
  const WINS = { '1h': ['Last hour', '1m'], '24h': ['Last 24 hours', '5m'], '7d': ['Last 7 days', '1h'] };
  const MAP_STEP = { '1h': '5m', '24h': '1h', '7d': '1h' };
  const WIN_NAME = { '1h': 'last hour', '24h': 'last 24 hours', '7d': 'last 7 days' };

  K.shell({ app: 'cloud', page: 'dashboard', brand: 'Aran Cloud', env: 'Aran Cloud preview · this dashboard shows your workspace only' });
  $('#nav').innerHTML = VIEWS.map(([id, l]) => `<a class="tab" role="tab" href="#${id}" data-v="${id}">${l}</a>`).join('');

  /* ---------------------------------------------------------------- state */
  let key = K.takeKeyFromHash('aran_dashboard_key') || K.store.get('aran_dashboard_key');
  const adminKey = () => K.store.get('aran_admin_key');
  const S = {
    counters: null, m1h: null, mwin: null, win: '1h', txns: [], ftx: null, maxId: 0, keys: null, slo: null, settings: null, usage: null,
    team: null, dash: null, audit: null, lastOk: 0, err: '', stream: 'off', filters: { q: '', rail: '', sink: '' }, sel: null, paused: false,
    fresh: {}, txLimit: 50, tick: 0, sinks: [],
  };
  let timer = null, es = null, esTimer = null, esRetry = 0, painted = null, wsName = '';

  /* ---------------------------------------------------------------- small helpers */
  const ms = (v) => (v == null ? '–' : (v < 10 ? v.toFixed(1) : Math.round(v)) + ' ms');
  const pct = (c) => (c == null ? '–' : (c >= 1 ? '100' : (Math.floor(c * 1000) / 10).toString()) + '%');
  const hhmm = (t) => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dmon = (t) => new Date(t * 1000).toLocaleDateString([], { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const rupees = (p) => (p == null ? '–' : '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const ago = (t) => { const s = Math.max(0, Math.round(Date.now() / 1000 - t)); return s < 5 ? 'just now' : s < 60 ? s + ' s ago' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  const view = () => { const v = location.hash.slice(1).split('&')[0]; const r = ALIAS[v] || v; return VIEWS.some((x) => x[0] === r) ? r : 'overview'; };
  const set = (id, html) => U.patch($('#' + id), html);
  const noData = (msg) => `<p class="dx-empty muted small">${esc(msg || 'No transactions yet')}</p>`;
  const typeChips = (bt) => Object.entries(bt || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="pill tok">${esc(k)} ${fmt(v)}</span>`).join(' ');
  const rank = (obj, empty, valFn) => {
    const e = Object.entries(obj || {}).sort((a, b) => (b[1].n != null ? b[1].n : b[1]) - (a[1].n != null ? a[1].n : a[1]));
    if (!e.length) return noData(empty);
    const val = (x) => (x.n != null ? x.n : x), m = Math.max(...e.map((x) => val(x[1])), 1);
    return e.map(([k, v], i) => U.rankRow(`<span class="mono small">${esc(k)}</span>`, val(v) / m, valFn ? valFn(v) : fmt(val(v)), i)).join('');
  };
  const progress = (p, label) => `<div class="bar" role="img" aria-label="${esc(label)}"><i style="width:${Math.max(p > 0 ? 1 : 0, Math.min(100, p * 100))}%"></i></div>`;
  const statusPill = (state, text) => U.pill((state === 'ok' ? '✓ ' : state === 'warn' ? '▲ ' : state === 'bad' ? '✗ ' : '– ') + esc(text), state === 'ok' ? 'ok' : state === 'warn' ? 'warn' : state === 'bad' ? 'danger' : '');

  /* ---------------------------------------------------------------- talking to the API */
  const stopAll = () => { clearInterval(timer); timer = null; closeStream(); clearTimeout(esTimer); };
  const get = async (path) => {
    try { const d = await K.api(path, { key }); S.lastOk = Date.now(); S.err = ''; return d; }
    catch (e) {
      if (e.status === 401) { stopAll(); gate('That key was not accepted.'); }
      S.err = e.status === 429 ? 'Rate limit reached, slowing down.' : e.status === 403 ? 'This key cannot read the dashboard (it needs the dashboard scope).' : (e.message || 'Cannot reach Aran Cloud');
      throw e;
    }
  };
  const needAdmin = (box) => new Promise((resolve) => {
    const have = adminKey(); if (have) return resolve(have);
    box.innerHTML = `<div class="card kit-gap-s"><div class="label">This needs a key with more scopes</div><form class="kit-inline" data-admin><label class="field">Admin key<input class="mono" autocomplete="off" placeholder="aran_live_…" required></label><button class="btn sm" type="submit"><span>Use key</span></button></form></div>`;
    $('[data-admin]', box).onsubmit = (e) => { e.preventDefault(); const v = $('input', e.target).value.trim(); K.store.set('aran_admin_key', v); box.innerHTML = ''; resolve(v); };
  });
  const call = async (path, o, box) => {
    try { return await K.api(path, Object.assign({ key }, o)); }
    catch (err) {
      if (err.status === 403 && box) { const k = await needAdmin(box); try { return await K.api(path, Object.assign({}, o, { key: k })); } catch (e2) { if (e2.status === 401 || e2.status === 403) K.store.set('aran_admin_key', ''); throw e2; } }
      throw err;
    }
  };

  /* ---------------------------------------------------------------- key gate, health, freshness */
  const gate = (msg) => {
    $('#title').textContent = 'Open your dashboard'; $('#lede').textContent = 'Paste the dashboard key (or the admin key) you got when the workspace was created.';
    $('#nav').classList.add('hidden'); $('#status-bar').classList.add('hidden');
    $('#body').innerHTML = `<div class="card plus kit-gate">${msg ? U.note('err', esc(msg)) : ''}<form class="kit-form" id="gate"><label class="field">API key<input id="gate-key" class="mono" autocomplete="off" required placeholder="aran_live_…"></label><button class="btn" type="submit"><span>Open dashboard</span><span class="arr">→</span></button></form><p class="small muted kit-gap-s">No workspace yet? <a href="/" style="text-decoration:underline">Create one</a>.</p></div>`;
    $('#gate').onsubmit = (e) => { e.preventDefault(); key = $('#gate-key').value.trim(); K.store.set('aran_dashboard_key', key); $('#nav').classList.remove('hidden'); $('#status-bar').classList.remove('hidden'); start(); };
  };
  $('#switch-key').onclick = () => { K.store.set('aran_dashboard_key', ''); K.store.set('aran_admin_key', ''); key = ''; stopAll(); gate(); };
  const health = async () => { const el = $('#health'); try { const h = await K.api('/v1/health'); const ok = h.core || h.core_ready; el.className = 'kit-dot ' + (ok ? 'ok' : 'bad'); el.lastElementChild.textContent = ok ? 'Core online' : 'Core degraded'; } catch (e) { el.className = 'kit-dot bad'; el.lastElementChild.textContent = 'Offline'; } };

  function renderStatus() {
    const pill = $('#stream-pill'), up = $('#updated'); if (!pill || !up) return;
    const st = S.stream;
    pill.className = 'pill ' + (st === 'live' ? 'ok live' : st === 'off' ? '' : 'warn');
    pill.textContent = st === 'live' ? 'Live' : st === 'polling' ? '▲ Polling every 5 s' : st === 'reconnecting' ? '▲ Reconnecting' : st === 'paused' ? 'Paused (tab hidden)' : 'Connecting';
    if (!S.lastOk) { up.textContent = S.err ? '✗ ' + S.err : 'Loading…'; up.className = 'small ' + (S.err ? 'dx-bad' : 'muted'); return; }
    const sec = Math.round((Date.now() - S.lastOk) / 1000);
    if (sec > 15) { up.textContent = `✗ Cannot reach Aran Cloud. These numbers are from ${sec < 90 ? sec + ' s' : Math.round(sec / 60) + ' min'} ago.`; up.className = 'small dx-bad'; }
    else { up.textContent = sec < 2 ? 'Updated just now' : `Updated ${sec} s ago`; up.className = 'small muted'; }
  }
  setInterval(renderStatus, 1000);

  /* ---------------------------------------------------------------- charts (inline SVG, y-axis from 0) */
  const niceMax = (v) => { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p; return 10 * p; };
  const xlabels = (b, xf, suffix) => { const n = b.length; return `<text class="ax" x="44" y="184">${esc(xf(b[0].t))}</text>${n > 4 ? `<text class="ax" x="${(44 + 792) / 2}" y="184" text-anchor="middle">${esc(xf(b[Math.floor(n / 2)].t))}</text>` : ''}<text class="ax" x="792" y="184" text-anchor="end">${esc(xf(b[n - 1].t))}${suffix == null ? ' (now, in progress)' : suffix}</text>`; };
  /* stacked bars: o.series = [{key, cls}] bottom to top; o.tip(bucket) the hover/aria text; buckets flagged partial are drawn dashed */
  function barChart(b, o) {
    const W = 800, H = 190, L = 44, R = 8, T = 12, B2 = 26, n = b.length, slot = (W - L - R) / n, bw = Math.max(1.5, slot - (n > 100 ? 0.6 : 3));
    const tot = (x) => o.series.reduce((a, s) => a + (x[s.key] || 0), 0), max = niceMax(Math.max(0, ...b.map(tot)));
    const y = (v) => T + (H - T - B2) * (1 - v / max), base = H - B2;
    const bars = b.map((x, i) => {
      const bx = L + i * slot + (slot - bw) / 2; let acc = 0, g = '';
      o.series.forEach((s, si) => { const v = x[s.key] || 0; if (v <= 0) return; const y1 = y(acc), y0 = y(acc + v); g += `<rect class="${s.cls}${x.partial ? ' part' : ''}" x="${bx.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, y1 - y0 - (si ? 1 : 0)).toFixed(1)}"/>`; acc += v; });
      return `<g>${g}<rect class="hit" x="${(L + i * slot).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${H - T - B2}" data-tip="${esc(o.tip(x))}"/></g>`;
    }).join('');
    const rows = b.filter((x) => tot(x) > 0 || x.transactions > 0).slice(-60).map((x) => `<tr><td>${esc(o.xf(x.t))}</td><td>${esc(o.tip(x))}</td></tr>`).join('') || '<tr><td colspan="2">No transactions yet</td></tr>';
    return `<div class="mchart"><div class="mchart-legend" aria-hidden="true">${o.series.map((s) => `<span><i class="${s.cls}"></i>${esc(s.label)}</span>`).join('')}<span class="dx-key-part">▭ dashed = still counting</span></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(o.aria)}; a table follows"><line class="g" x1="${L}" x2="${W - R}" y1="${y(max)}" y2="${y(max)}"/><line class="g" x1="${L}" x2="${W - R}" y1="${y(max / 2)}" y2="${y(max / 2)}"/><line class="g0" x1="${L}" x2="${W - R}" y1="${base}" y2="${base}"/><text class="ax" x="${L - 6}" y="${y(max) + 4}" text-anchor="end">${fmt(max)}</text><text class="ax" x="${L - 6}" y="${base + 4}" text-anchor="end">0</text>${bars}${xlabels(b, o.xf, o.suffix)}</svg><div class="mchart-tip" hidden></div><div class="sr-only"><table><caption>${esc(o.aria)}</caption><thead><tr><th>When</th><th>Values</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  /* p50 and p95 lines against a dashed budget line; a gap where a bucket had no transactions; a triangle where p95 broke the budget */
  function lineChart(b, o) {
    const W = 800, H = 200, L = 44, R = 8, T = 12, B2 = 26, n = b.length, slot = (W - L - R) / n;
    const hi = Math.max(o.budget * 1.25, ...b.map((x) => x.p95_ms || 0)), max = niceMax(hi * 1.05);
    const x = (i) => L + i * slot + slot / 2, y = (v) => T + (H - T - B2) * (1 - v / max), base = H - B2;
    const path = (k) => { let d = '', pen = false; b.forEach((q, i) => { const v = q[k]; if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true; }); return d; };
    const dots = (k, cls) => b.map((q, i) => { const v = q[k]; if (v == null) return ''; const lone = (i === 0 || b[i - 1][k] == null) && (i === n - 1 || b[i + 1][k] == null); return n <= 72 || lone ? `<circle class="${cls}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6"/>` : ''; }).join('');
    const over = b.map((q, i) => (q.p95_ms != null && q.p95_ms > o.budget ? `<path class="dx-over" d="M${x(i).toFixed(1)} ${(y(q.p95_ms) - 9).toFixed(1)} l4.5 8 h-9z"/>` : '')).join('');
    const hits = b.map((q, i) => `<g><rect class="hit" x="${(L + i * slot).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${H - T - B2}" data-tip="${esc(o.tip(q))}"/></g>`).join('');
    const rows = b.filter((q) => q.transactions).slice(-40).map((q) => `<tr><td>${esc(o.xf(q.t))}</td><td>${esc(o.tip(q))}</td></tr>`).join('') || '<tr><td colspan="2">No transactions yet</td></tr>';
    const xl = `<text class="ax" x="${L}" y="${H - 6}">${esc(o.xf(b[0].t))}</text><text class="ax" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xf(b[Math.floor(n / 2)].t))}</text><text class="ax" x="${W - R}" y="${H - 6}" text-anchor="end">${esc(o.xf(b[n - 1].t))} (now, in progress)</text>`;
    return `<div class="mchart"><div class="mchart-legend" aria-hidden="true"><span><i class="dx-sw-p50"></i>p50 (typical)</span><span><i class="dx-sw-p95"></i>p95 (slow tail)</span><span><i class="dx-sw-bud"></i>budget ${esc(String(o.budget))} ms</span><span class="dx-over-key">▲ p95 over budget</span></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(o.aria)}; a table follows"><line class="g" x1="${L}" x2="${W - R}" y1="${y(max)}" y2="${y(max)}"/><line class="g0" x1="${L}" x2="${W - R}" y1="${base}" y2="${base}"/><line class="dx-budget" x1="${L}" x2="${W - R}" y1="${y(o.budget)}" y2="${y(o.budget)}"/><text class="ax" x="${L - 6}" y="${y(max) + 4}" text-anchor="end">${max} ms</text><text class="ax" x="${L - 6}" y="${base + 4}" text-anchor="end">0</text><text class="ax dx-budget-t" x="${W - R}" y="${y(o.budget) - 4}" text-anchor="end">budget ${esc(String(o.budget))} ms</text><path class="dx-p50" d="${path('p50_ms')}"/><path class="dx-p95" d="${path('p95_ms')}"/>${dots('p50_ms', 'dx-d50')}${dots('p95_ms', 'dx-d95')}${over}${hits}${xl}</svg><div class="mchart-tip" hidden></div><div class="sr-only"><table><caption>${esc(o.aria)}</caption><thead><tr><th>When</th><th>Latency</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  const valueChart = (m, name, xf) => barChart(m.buckets, {
    series: [{ key: 'protected', cls: 'pr', label: 'Protected' }, { key: 'raw', cls: 'rw', label: 'Left raw' }], xf,
    tip: (x) => `${xf(x.t)} · ${x.transactions} transaction${x.transactions === 1 ? '' : 's'} · ${x.protected} protected · ${x.raw} left raw${x.partial ? ' · still counting' : ''}`,
    aria: `Values protected and left raw per ${m.step === '1m' ? 'minute' : m.step === '5m' ? '5 minutes' : 'hour'}, ${name}: ${fmt(m.totals.protected)} protected, ${fmt(m.totals.raw)} left raw`,
  });
  const latencyChart = (m, budget, name, xf) => lineChart(m.buckets, {
    budget, xf,
    tip: (x) => (x.transactions ? `${xf(x.t)} · p50 ${ms(x.p50_ms)} · p95 ${ms(x.p95_ms)}${x.p95_ms > budget ? ' · ✗ over budget' : ' · ✓ within budget'} · ${x.transactions} transaction${x.transactions === 1 ? '' : 's'}${x.partial ? ' · still counting' : ''}` : `${xf(x.t)} · no transactions`),
    aria: `p50 and p95 added latency per bucket against a ${budget} ms budget, ${name}`,
  });
  const xfFor = (win) => (win === '7d' ? (t) => dmon(t) + ' ' + hhmm(t) : win === '24h' ? hhmm : hhmm);

  /* ---------------------------------------------------------------- loaders (each fills S and returns a promise) */
  const loadCounters = () => get('/v1/counters').then((d) => { S.counters = d; });
  const loadM1h = () => get('/v1/metrics?window=1h&step=1m').then((d) => { S.m1h = d; S.sinks = Object.keys(d.by_sink || {}); });
  const loadWin = (step) => get(`/v1/metrics?window=${S.win}&step=${step(S.win)}`).then((d) => { S.mwin = d; });
  const loadSlo = () => get('/v1/slo').then((d) => { S.slo = d; });
  const loadKeys = () => get('/v1/keys').then((d) => { S.keys = d.keys; });
  const mergeTx = (rows) => {
    let added = 0;
    rows.slice().reverse().forEach((t) => { if (!S.txns.some((x) => x.id === t.id)) { S.txns.unshift(t); added++; } });
    S.txns.sort((a, b) => b.id - a.id); S.txns = S.txns.slice(0, 200);
    return added;
  };
  const filtersOn = () => !!(S.filters.q || S.filters.rail || S.filters.sink);
  const loadTxns = async () => {
    if (filtersOn()) {
      const f = S.filters, qs = new URLSearchParams({ limit: '100' }); if (f.q) qs.set('q', f.q); if (f.rail) qs.set('rail', f.rail); if (f.sink) qs.set('sink', f.sink);
      const d = await get('/v1/transactions?' + qs); S.ftx = d.transactions; S.maxId = Math.max(S.maxId, d.max_id); return;
    }
    S.ftx = null;
    const d = await get(`/v1/transactions?limit=${S.maxId ? 100 : 200}${S.maxId ? '&since_id=' + S.maxId : ''}`);
    mergeTx(d.transactions); S.maxId = Math.max(S.maxId, d.max_id);
  };

  /* ---------------------------------------------------------------- live stream */
  function closeStream() { if (es) { es.close(); es = null; } }
  async function openStream() {
    closeStream(); clearTimeout(esTimer); if (!key || document.hidden) return;
    try {
      const t = await K.api('/v1/stream/token', { method: 'POST', key });
      es = new EventSource('/v1/stream?token=' + encodeURIComponent(t.token));
      es.addEventListener('open', () => { S.stream = 'live'; esRetry = 0; renderStatus(); });
      es.addEventListener('txn', (e) => onTxn(JSON.parse(e.data)));
      es.addEventListener('counters', (e) => { S.counters = JSON.parse(e.data); S.lastOk = Date.now(); paintLive(); });
      es.addEventListener('closed', () => { closeStream(); S.stream = 'polling'; renderStatus(); });
      es.onerror = () => { closeStream(); esRetry++; S.stream = esRetry > 3 ? 'polling' : 'reconnecting'; renderStatus(); esTimer = setTimeout(openStream, Math.min(30000, 2000 * esRetry)); };
    } catch (e) { S.stream = 'polling'; renderStatus(); esTimer = setTimeout(openStream, 15000); }
  }
  const matches = (t) => { const f = S.filters; return (!f.rail || t.rail === f.rail) && (!f.sink || t.sink === f.sink) && (!f.q || t.txn_id.toLowerCase().includes(f.q.toLowerCase())); };
  function onTxn(t) {
    if (S.txns.some((x) => x.id === t.id)) return;
    if (S.paused && view() === 'transactions') { S.pending = (S.pending || []).concat(t); paintLive(); return; }
    mergeTx([t]); S.maxId = Math.max(S.maxId, t.id); S.fresh[t.id] = Date.now();
    if (S.ftx && matches(t) && !S.ftx.some((x) => x.id === t.id)) S.ftx.unshift(t);
    const c = S.counters; if (c) { c.transactions_today++; c.found_today += t.found; c.protected_today += t.protected; c.raw_today += t.raw; c.coverage_today = c.found_today ? c.protected_today / c.found_today : null; c.transactions_stored++; if (t.demo) c.demo_today++; }
    S.lastOk = Date.now(); paintLive();
  }
  let raf = 0;
  function paintLive() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const v = view(); if (V[v] && V[v].paint && painted === v) V[v].paint(); renderStatus(); }); }

  /* ---------------------------------------------------------------- views: each has shell() painted once, load() and paint() */
  const V = {};
  const tile = (label, value, note, tone) => U.stat(label, value, note, { tone: tone || '' });

  /* ---- Overview ---- */
  V.overview = {
    shell: () => `<div class="grid g4" id="ov-tiles">${U.skeleton(120)}</div><div id="ov-empty"></div>
      <section class="card kit-gap-s"><div class="between"><h2 class="h3">Values per minute, last 60 minutes</h2><span class="small muted" id="ov-chart-note"></span></div><div id="ov-chart">${U.skeleton(190)}</div></section>
      <div class="grid g2 kit-gap-s"><section class="card"><div class="between"><h2 class="h3">Latest transactions</h2><a class="btn ghost sm" href="#transactions"><span>See all</span></a></div><div id="ov-latest" class="kit-scroll">${U.skeleton(160)}</div></section>
      <section class="card"><h2 class="h3">Connected systems</h2><p class="small muted">Keys by when they last called Aran. Last 5 minutes counts as active.</p><div id="ov-systems">${U.skeleton(160)}</div></section></div>`,
    load: () => {
      const j = [loadCounters(), loadM1h(), loadTxns()];
      if (S.tick % 3 === 0 || !S.keys) j.push(loadKeys());
      if (S.tick % 3 === 0 || !S.slo) j.push(loadSlo());
      return j;
    },
    paint: () => {
      const c = S.counters, m = S.m1h, slo = S.slo, budget = (slo && slo.budget_ms) || (c && c.budget_ms) || 10;
      if (c) {
        const p95 = c.p95_ms_last_hour, covTone = c.raw_today ? 'danger' : '';
        const p95state = p95 == null ? '' : p95 > budget ? 'danger' : p95 > budget * 0.8 ? 'warn' : '';
        const p95note = p95 == null ? 'No transactions in the last hour' : p95 > budget ? `✗ over the ${budget} ms budget` : p95 > budget * 0.8 ? `▲ close to the ${budget} ms budget` : `✓ within the ${budget} ms budget`;
        set('ov-tiles', tile('Transactions today', fmt(c.transactions_today), 'India time, since midnight' + (c.demo_today ? ` · ${fmt(c.demo_today)} are demo data` : '')) +
          tile('Values protected today', fmt(c.protected_today), c.found_today ? `of ${fmt(c.found_today)} found, India time` : 'No identifiers found yet today') +
          tile('Coverage today', c.found_today ? pct(c.coverage_today) : '–', !c.found_today ? 'Nothing to cover yet' : c.raw_today ? `✗ ${fmt(c.raw_today)} value${c.raw_today === 1 ? '' : 's'} left raw` : '✓ every value found was protected', covTone) +
          tile('p95 added latency, last hour', ms(p95), p95note, p95state));
        set('ov-empty', c.transactions_stored === 0 ? `<div class="card kit-empty kit-gap-s"><h2 class="h3">No transactions yet</h2><p class="muted">Counts start at 0. Send one from your system with the SDK, or fill this dashboard with generated demo data.</p><pre class="kit-code" style="text-align:left;max-width:640px;margin:0 auto var(--space-4)">client.protect_transactions([{"txn_id": "TXN-1", "rail": "UPI", "sink": "txn-log",\n  "fields": {"payee": "ravi@okicici", "remarks": "rent"}}])</pre><div class="kit-row" style="justify-content:center"><button class="btn" data-act="seed"><span>Add demo transactions</span><span class="arr">→</span></button><a class="btn secondary" href="/connect"><span>Quick connect</span></a></div><div data-seed-out></div></div>` : '');
      }
      if (m) {
        set('ov-chart', valueChart(m, 'last 60 minutes', hhmm)); U.keepTip();
        set('ov-chart-note', m.totals.demo_transactions ? `Includes ${fmt(m.totals.demo_transactions)} demo transactions` : `${fmt(m.totals.transactions)} transactions in this window`);
      }
      set('ov-latest', S.txns.length ? latestTable(S.txns.slice(0, 8)) : noData('No transactions yet'));
      set('ov-systems', systemsList());
    },
  };
  const tokenPreview = (t, n) => {
    const parts = Object.entries(t.fields || {}).filter(([, v]) => v).sort((a, b) => ((t.detail[b[0]] || {}).protected > 0) - ((t.detail[a[0]] || {}).protected > 0)).slice(0, n || 2).map(([k, v]) => { const hit = (t.detail[k] && t.detail[k].protected) > 0; const s = String(v).length > 30 ? String(v).slice(0, 30) + '…' : String(v); return `<span class="dx-fld"><span class="muted">${esc(k)}</span> ${hit ? `<mark class="m-token">${esc(s)}</mark>` : `<span class="mono">${esc(s)}</span>`}</span>`; });
    return parts.join('') || '<span class="muted">–</span>';
  };
  const valuePills = (t) => U.pill(`${t.protected}/${t.found} protected`, t.found ? 'tok' : '') + (t.raw ? ' ' + U.pill(`✗ ${t.raw} raw`, 'danger') : '');
  const latestTable = (rows) => `<table class="tbl dense"><thead><tr><th>Time</th><th>Transaction</th><th>After Aran</th><th>Values</th></tr></thead><tbody>${rows.map((t) => `<tr><td class="mono">${hhmm(t.at)}</td><td><a class="mono dx-lnk" href="#transactions&id=${t.id}" data-open="${t.id}">${esc(t.txn_id)}</a><div class="small muted">${esc(t.rail)} → ${esc(t.sink)}${t.demo ? ' · demo' : ''}</div></td><td class="dx-prev">${tokenPreview(t, 1)}</td><td>${valuePills(t)}</td></tr>`).join('')}</tbody></table>`;
  const systemsList = () => {
    if (!S.keys) return U.skeleton(120);
    const mine = key.slice(0, 14), live = S.keys.filter((k) => !k.revoked);
    if (!live.length) return noData('No keys yet');
    return live.map((k) => {
      const age = k.last_used_epoch ? Date.now() / 1000 - k.last_used_epoch : null;
      const st = age == null ? ['Never used', ''] : age < 300 ? ['● Active', 'ok'] : age < 86400 ? ['○ Idle', 'warn'] : ['○ Quiet', ''];
      return `<div class="dx-sys"><div><b>${esc(k.label || 'API key')}</b>${k.prefix === mine ? ' <span class="pill info">this dashboard</span>' : ''}<div class="small muted mono">${esc(k.prefix)}… · ${k.scopes.map(esc).join(', ')}</div></div><div class="dx-sys-r">${U.pill(st[0], st[1])}<div class="small muted">${k.last_used_epoch ? 'last call ' + ago(k.last_used_epoch) : 'no calls yet'}</div></div></div>`;
    }).join('');
  };

  /* ---- Transactions ---- */
  V.transactions = {
    shell: () => `<section class="card hidden" id="tx-detail" aria-live="polite"></section><section class="card kit-gap-s"><form class="dx-filters" id="tx-filters" role="search" aria-label="Filter transactions">
        <label class="field">Search transaction id<input id="f-q" type="search" autocomplete="off" placeholder="TXN-B-0001" value="${esc(S.filters.q)}"></label>
        <label class="field">Rail<select id="f-rail"><option value="">All rails</option>${['UPI', 'IMPS', 'NEFT', 'RTGS', 'CARD', 'OTHER'].map((r) => `<option ${S.filters.rail === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        <label class="field">Destination<select id="f-sink"><option value="">All destinations</option></select></label>
        <div class="dx-filter-btns"><button class="btn secondary sm" type="button" data-act="pause" id="pause-btn" aria-pressed="false"><span>Pause live feed</span></button><button class="btn ghost sm" type="button" data-act="clear"><span>Clear filters</span></button></div>
      </form><div class="small muted" id="tx-count" role="status"></div><div class="kit-scroll kit-gap-s" id="tx-list">${U.skeleton(220)}</div></section>`,
    load: () => [loadCounters(), loadM1h(), loadTxns()],
    paint: () => {
      const sel = $('#f-sink');
      if (sel && sel.options.length - 1 !== S.sinks.length) sel.innerHTML = `<option value="">All destinations</option>` + S.sinks.map((s) => `<option ${S.filters.sink === s ? 'selected' : ''}>${esc(s)}</option>`).join('');
      const all = S.ftx || S.txns, rows = all.slice(0, S.txLimit), active = filtersOn();
      const pend = (S.pending || []).length;
      $('#pause-btn') && ($('#pause-btn').innerHTML = `<span>${S.paused ? 'Resume live feed' + (pend ? ` (${pend} new)` : '') : 'Pause live feed'}</span>`, $('#pause-btn').setAttribute('aria-pressed', S.paused));
      set('tx-count', S.paused ? 'Live feed paused. New transactions wait until you resume.' : active ? `${rows.length} match${rows.length === 1 ? '' : 'es'} (newest 100 shown) · filters are on` : `${fmt(S.counters ? S.counters.transactions_stored : rows.length)} transactions stored · showing ${rows.length} of the newest ${all.length}`);
      set('tx-list', !rows.length ? (active ? noData('No transactions match these filters') : noData('No transactions yet')) :
        `<table class="tbl dense"><thead><tr><th>Time</th><th>Transaction</th><th>Rail</th><th>Destination</th><th>After Aran</th><th>Values</th><th class="num">Added</th></tr></thead><tbody>${rows.map((t) => `<tr class="${S.sel === t.id ? 'sel' : ''}"><td class="mono">${hhmm(t.at)}</td><td><button class="dx-lnk mono" data-open="${t.id}" aria-label="Show fields of ${esc(t.txn_id)}">${esc(t.txn_id)}</button>${S.fresh[t.id] && Date.now() - S.fresh[t.id] < 5000 ? ' <span class="pill ok">new</span>' : ''}${t.demo ? ' <span class="pill">demo</span>' : ''}</td><td>${esc(t.rail)}</td><td>${esc(t.sink)}</td><td class="dx-prev">${tokenPreview(t, 2)}</td><td>${valuePills(t)}</td><td class="num mono">${ms(t.latency_ms)}</td></tr>`).join('')}</tbody></table>${all.length > rows.length ? `<div class="kit-row kit-gap-s"><button class="btn secondary sm" data-act="more"><span>Show 50 more</span></button></div>` : ''}`);
      const t = rows.concat(S.txns).find((x) => x.id === S.sel);
      set('tx-detail', t ? detailCard(t) : `<h2 class="h3">Transaction detail</h2><p class="muted small">Choose a transaction above to see each field before and after Aran.</p>`);
      $('#tx-detail').classList.toggle('hidden', !t);
    },
  };
  const detailCard = (t) => {
    const names = Object.keys(t.fields || {});
    return `<div class="between"><h2 class="h3">${esc(t.txn_id)}</h2><button class="btn ghost sm" data-act="close-detail"><span>Close</span></button></div>
      <dl class="kit-kv"><dt>Rail</dt><dd>${esc(t.rail)}</dd><dt>Destination</dt><dd>${esc(t.sink)} <span class="muted">(${esc(t.purpose || 'Service')})</span></dd><dt>Amount</dt><dd>${rupees(t.amount_paise)}</dd><dt>Customer ref</dt><dd class="mono">${esc(t.customer_ref || '–')}</dd><dt>Sent by</dt><dd>${esc(t.source || '–')}</dd><dt>When</dt><dd>${new Date(t.at * 1000).toLocaleString()}${t.demo ? ' · <span class="pill">demo data</span>' : ''}</dd><dt>Added latency</dt><dd class="mono">${ms(t.latency_ms)}</dd></dl>
      ${U.note('info', 'The cloud does not keep the original values, so there is no “before” text here. Instead each field shows how many identifiers Aran found in it, and what the field became.')}
      <div class="kit-scroll kit-gap-s"><table class="tbl dense"><thead><tr><th>Field</th><th>Before (what Aran found)</th><th aria-hidden="true"></th><th>After (what was stored)</th></tr></thead><tbody>${names.map((n) => { const d = t.detail[n] || { found: 0, protected: 0, types: {} }; const left = d.found - d.protected; return `<tr><td class="mono">${esc(n)}</td><td>${d.found ? `${fmt(d.found)} identifier${d.found === 1 ? '' : 's'} found ${typeChips(d.types)}${left ? ' ' + U.pill('✗ ' + left + ' left raw', 'danger') : ''}` : '<span class="muted">nothing to protect</span>'}</td><td aria-hidden="true">→</td><td>${d.protected ? `<mark class="m-token">${esc(t.fields[n])}</mark>` : `<span class="mono">${esc(t.fields[n])}</span>`}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">This transaction had no fields.</td></tr>'}</tbody></table></div>
      <div class="kit-row kit-gap-s">${valuePills(t)}${typeChips(t.by_type)}</div>`;
  };

  /* ---- Data map ---- */
  V.datamap = {
    shell: () => `<div class="between"><div class="chips" role="group" aria-label="Window">${winChips()}</div><span class="small muted" id="map-note"></span></div>
      <div class="dx-map kit-gap-s" id="map">${U.skeleton(260)}</div>
      <div class="grid g2 kit-gap-s"><section class="card"><h2 class="h3" id="map-rail-h">Transactions by rail</h2><div id="map-rail"></div></section><section class="card"><h2 class="h3" id="map-type-h">Values protected by type</h2><div id="map-type"></div></section></div>`,
    load: () => [loadCounters(), loadWin(() => MAP_STEP[S.win])],
    paint: () => {
      const m = S.mwin; if (!m) return; const w = WIN_NAME[S.win];
      set('map-note', m.totals.demo_transactions ? `${WINS[S.win][0]} · includes ${fmt(m.totals.demo_transactions)} demo transactions` : WINS[S.win][0]);
      const src = Object.entries(m.by_source || {}).sort((a, b) => b[1].transactions - a[1].transactions);
      const dst = Object.entries(m.by_sink || {}).sort((a, b) => b[1].transactions - a[1].transactions), t = m.totals;
      set('map', `<section class="card dx-col"><h2 class="h3">Systems <span class="small muted">(${esc(w)})</span></h2>${src.length ? src.map(([k, v]) => `<div class="dx-node"><b>${esc(k)}</b><div class="small muted">${fmt(v.transactions)} transaction${v.transactions === 1 ? '' : 's'} sent</div></div>`).join('') : noData('No transactions yet')}<p class="small muted">A system is the key a call used.</p></section>
        <div class="dx-arrow" aria-hidden="true">→</div>
        <section class="card dx-col dx-aran"><h2 class="h3">Aran <span class="small muted">(${esc(w)})</span></h2><div class="dx-node"><b>${fmt(t.transactions)}</b> transactions</div><div class="dx-node"><b>${fmt(t.protected)}</b> values tokenised</div><div class="dx-node">${t.raw ? U.pill('✗ ' + fmt(t.raw) + ' passed raw', 'danger') : U.pill('✓ 0 passed raw', 'ok')}</div><div class="dx-node small muted">coverage ${pct(t.coverage)} · p95 ${ms(t.p95_ms)}</div></section>
        <div class="dx-arrow" aria-hidden="true">→</div>
        <section class="card dx-col"><h2 class="h3">Destinations <span class="small muted">(${esc(w)})</span></h2>${dst.length ? dst.map(([k, v]) => `<div class="dx-node"><div class="between"><b>${esc(k)}</b><span class="small mono">${fmt(v.transactions)} tx</span></div><div class="small">${fmt(v.protected)} tokenised${v.raw ? ' ' + U.pill('✗ ' + v.raw + ' raw', 'danger') : ''}</div><div class="kit-row" style="gap:6px;margin-top:6px">${typeChips(v.by_type) || '<span class="small muted">no identifiers</span>'}</div></div>`).join('') : noData('No transactions yet')}<p class="small muted">Destinations receive tokens, not the original values.</p></section>`);
      set('map-rail-h', `Transactions by rail <span class="small muted">(${esc(w)})</span>`);
      set('map-type-h', `Values protected by type <span class="small muted">(${esc(w)})</span>`);
      set('map-rail', rank(Object.fromEntries(Object.entries(m.by_rail).map(([k, v]) => [k, { n: v.transactions }])), 'No transactions yet'));
      set('map-type', rank(m.by_type, 'No identifiers found yet'));
    },
  };
  const winChips = () => Object.entries(WINS).map(([w, [l]]) => `<button class="chip ${S.win === w ? 'on' : ''}" data-win="${w}" aria-pressed="${S.win === w}">${l}</button>`).join('');

  /* ---- Performance ---- */
  V.performance = {
    shell: () => `<div class="between"><div class="chips" role="group" aria-label="Window">${winChips()}</div><span class="small muted" id="perf-note"></span></div>
      <div class="grid g4 kit-gap-s" id="perf-tiles">${U.skeleton(120)}</div>
      <section class="card kit-gap-s"><h2 class="h3" id="perf-h">Added latency per minute</h2><div id="perf-chart">${U.skeleton(200)}</div></section>
      <div class="grid g2 kit-gap-s"><section class="card"><h2 class="h3">Service objective, this month</h2><div id="perf-slo">${U.skeleton(140)}</div></section><section class="card"><h2 class="h3" id="perf-vol-h">Transactions per minute</h2><div id="perf-vol"></div></section></div>`,
    load: () => [loadCounters(), loadWin((w) => WINS[w][1]), loadSlo()],
    paint: () => {
      const m = S.mwin, slo = S.slo; if (!m || !slo) return; const budget = slo.budget_ms, t = m.totals, w = WIN_NAME[S.win], xf = xfFor(S.win);
      const unit = m.step === '1m' ? 'minute' : m.step === '5m' ? '5 minutes' : 'hour';
      const bad = m.buckets.filter((b) => b.p95_ms != null && b.p95_ms > budget).length, perMin = t.transactions / ((m.to - m.from) / 60);
      set('perf-note', WINS[S.win][0] + (t.demo_transactions ? ` · includes ${fmt(t.demo_transactions)} demo transactions` : ''));
      set('perf-tiles', tile(`p50 latency, ${w}`, ms(t.p50_ms), t.transactions ? 'a typical transaction' : 'No transactions yet') +
        tile(`p95 latency, ${w}`, ms(t.p95_ms), t.p95_ms == null ? 'No transactions yet' : t.p95_ms > budget ? `✗ over the ${budget} ms budget` : `✓ within the ${budget} ms budget`, t.p95_ms != null && t.p95_ms > budget ? 'danger' : '') +
        tile(`Error rate, ${w}`, t.transactions || t.errors ? pct(t.error_rate) : '–', t.errors ? `✗ ${fmt(t.errors)} failed call${t.errors === 1 ? '' : 's'}` : t.transactions ? '✓ no failed calls' : 'No transactions yet', t.errors ? 'danger' : '') +
        tile(`Throughput, ${w}`, t.transactions ? (perMin < 10 ? perMin.toFixed(1) : Math.round(perMin)) + '/min' : '0/min', `${fmt(t.transactions)} transactions · ${bad} ${unit}${bad === 1 ? '' : 's'} over budget`));
      set('perf-h', `Added latency per ${unit}, ${w}`);
      set('perf-chart', latencyChart(m, budget, w, xf)); U.keepTip();
      set('perf-vol-h', `Transactions per ${unit}, ${w}`);
      set('perf-vol', barChart(m.buckets, { series: [{ key: 'transactions', cls: 'pr', label: 'Transactions' }], xf, tip: (x) => `${xf(x.t)} · ${x.transactions} transaction${x.transactions === 1 ? '' : 's'}${x.errors ? ' · ' + x.errors + ' failed' : ''}${x.partial ? ' · still counting' : ''}`, aria: `Transactions per ${unit}, ${w}: ${fmt(t.transactions)}` }));
      const st = slo.status, tone = { ok: 'ok', at_risk: 'warn', breached: 'bad', no_data: '' }[st];
      const word = { ok: 'Within the objective', at_risk: 'Error budget at risk', breached: 'Objective missed', no_data: 'No data yet' }[st];
      set('perf-slo', `<div class="kit-row">${statusPill(tone || 'none', word)}</div><dl class="kit-kv kit-gap-s"><dt>Objective</dt><dd>p95 under ${slo.budget_ms} ms in ${slo.target_percent}% of minutes with traffic</dd><dt>Good minutes</dt><dd>${fmt(slo.good_minutes)} of ${fmt(slo.active_minutes)} (${slo.good_percent == null ? 'no data yet' : slo.good_percent + '%'}) · ${esc(slo.window)}</dd><dt>Bad minutes</dt><dd>${fmt(slo.bad_minutes)}</dd><dt>Error budget</dt><dd>${slo.error_budget_left_minutes} of ${slo.error_budget_minutes} minutes left ${slo.error_budget_left_percent == null ? '' : '(' + slo.error_budget_left_percent + '%)'}</dd></dl>${progress((slo.error_budget_left_percent || 0) / 100, 'error budget left ' + (slo.error_budget_left_percent || 0) + ' percent')}<p class="small muted">Only closed minutes with at least one transaction count. Change the budget in Settings.</p>`);
    },
  };

  /* ---- Compliance ---- */
  V.compliance = {
    shell: () => `<div class="grid g2"><section class="card"><div class="between"><h2 class="h3">Audit log proof</h2><button class="btn secondary sm" data-act="verify"><span>Verify the chain</span></button></div><p class="small muted">Every attempt to read a real value back is hash-chained. Any edit to an old row breaks the chain.</p><div id="verify-out" role="status"></div><h3 class="h3 kit-gap-s" style="font-size:1rem">Real values read back, by key</h3><div id="reads"></div></section>
      <section class="card"><h2 class="h3">Erasure receipts</h2><div id="receipts" class="kit-scroll">${U.skeleton(120)}</div><p class="small muted">Retention locks are planned, not built in this preview.</p></section></div>
      <section class="card danger kit-gap-s"><h2 class="h3">Erase a customer</h2><p class="small muted">Shreds the purpose key. Every token made under it stops resolving for good, in every copy, and Aran signs a receipt (DPDP Act s.12).</p><form class="dx-erase" id="erase-form"><label class="field">Customer ref<input id="er-ref" class="mono" placeholder="CUST-B0001" autocomplete="off"></label><label class="field">Purpose<select id="er-p"><option>KYC</option><option>Service</option><option>Marketing</option><option>Loans</option></select></label><button class="btn danger" type="submit"><span>Shred purpose key</span></button></form><div id="er-out"></div></section>
      <section class="card kit-gap-s"><div class="between"><h2 class="h3">Detokenise attempts</h2><span class="small muted">latest 25</span></div><div class="kit-scroll" id="audit">${U.skeleton(140)}</div></section>
      <section class="card kit-gap-s"><h2 class="h3">Leak trace</h2><p class="small muted">Paste a leaked dump. Only tokens this workspace issued are traced back to the destination they were sent to.</p><label class="field">Leaked dump<textarea id="dump" class="mono" rows="5" placeholder="Paste rows from a leaked table, a log file or a chat export"></textarea></label><div class="kit-row kit-gap-s"><button class="btn" data-act="trace"><span>Trace the leak</span><span class="arr">→</span></button></div><div id="trace-out"></div></section>`,
    load: () => [get('/v1/dashboard').then((d) => { S.dash = d; }), get('/v1/audit').then((d) => { S.audit = d.audit; })],
    paint: () => {
      if (S.dash) set('receipts', S.dash.receipts.length ? `<table class="tbl dense"><thead><tr><th>Time</th><th>Customer</th><th>Purpose</th><th>Status</th></tr></thead><tbody>${S.dash.receipts.slice(0, 10).map((r) => `<tr><td class="mono">${K.time(r.at)}</td><td class="mono">${esc(r.customer_ref)}</td><td>${esc(r.purpose)}</td><td>${U.pill(r.verified ? '✓ verified' : '▲ unverified', r.verified ? 'ok' : 'warn')}</td></tr>`).join('')}</tbody></table><p class="small muted">${fmt(S.dash.receipts.length)} receipts in total. Algorithm: Ed25519 + ML-DSA-65.</p>` : noData('No erasures yet'));
      if (S.audit) {
        const by = {}; S.audit.filter((a) => a.result === 'ok').forEach((a) => { by[a.key_label || 'unknown key'] = (by[a.key_label || 'unknown key'] || 0) + 1; });
        set('reads', Object.keys(by).length ? rank(by, '', (v) => fmt(v) + ' reads') + `<p class="small muted">Counted from the latest ${S.audit.length} attempts.</p>` : noData('No real values were read back yet'));
        set('audit', S.audit.length ? `<table class="tbl dense"><thead><tr><th>Time</th><th>Key</th><th>Token</th><th>Purpose</th><th>Result</th><th>Entry hash</th></tr></thead><tbody>${S.audit.slice(0, 25).map((r) => `<tr><td class="mono">${esc(r.created_at || K.time(r.at))}</td><td>${esc(r.key_label || '–')}</td><td><mark class="m-token">${esc(r.token)}</mark></td><td>${esc(r.purpose || '–')}</td><td>${U.pill(r.result === 'ok' ? 'read ok' : '✗ ' + esc(r.result), r.result === 'ok' ? 'ok' : 'danger')}</td><td class="mono">${esc((r.entry_hash || '').slice(0, 16))}…</td></tr>`).join('')}</tbody></table>` : noData('No detokenise attempts yet'));
      }
    },
    once: true,
  };

  /* ---- Keys and team ---- */
  V.keys = {
    shell: () => `<section class="card"><h2 class="h3">Workspace keys</h2><div class="kit-scroll kit-gap-s" id="keys">${U.skeleton(140)}</div></section>
      <section class="card kit-gap-s"><h2 class="h3">Mint a scoped key</h2><div class="kit-cols-4" style="grid-template-columns:1.2fr 2fr auto"><label class="field">Label<input id="mk-l" value="Application service key"></label><div class="field">Scopes<div class="kit-row" id="mk-s" style="margin:0">${['protect', 'gateway', 'trace', 'detokenise', 'erase', 'verify', 'dashboard', 'admin'].map((s) => `<label class="chip dx-chk"><input type="checkbox" value="${s}" ${s === 'protect' || s === 'dashboard' ? 'checked' : ''}> ${s}</label>`).join('')}</div></div><button class="btn" data-act="mint"><span>Mint key</span></button></div><div id="mk-out"></div></section>
      <section class="card kit-gap-s"><h2 class="h3">Team</h2><p class="small muted">Roles decide the scopes of the key issued to a person: admin (everything), security (dashboard, trace, detokenise, erase, verify), auditor (dashboard, verify), developer (protect, gateway, dashboard). Reading the team needs an admin key.</p><div id="team-box"><div id="team">${U.skeleton(100)}</div></div>
        <form class="dx-team-add" id="team-form"><label class="field">Email<input id="tm-email" type="email" required placeholder="name@bank.example" autocomplete="off"></label><label class="field">Role<select id="tm-role"><option>admin</option><option>security</option><option>auditor</option><option selected>developer</option></select></label><label class="chip dx-chk"><input id="tm-key" type="checkbox"> issue a key</label><button class="btn" type="submit"><span>Add person</span></button></form><div id="tm-out"></div></section>`,
    load: () => [loadKeys()],
    paint: () => {
      if (S.keys) set('keys', `<table class="tbl dense"><thead><tr><th>Prefix</th><th>Label</th><th>Scopes</th><th>Created</th><th>Last used</th><th>Status</th><th></th></tr></thead><tbody>${S.keys.map((k) => `<tr><td class="mono">${esc(k.prefix)}…</td><td>${esc(k.label || 'API key')}</td><td>${k.scopes.map((s) => U.pill(esc(s), s === 'admin' ? 'warn' : '')).join(' ')}</td><td class="mono">${esc(k.created)}</td><td class="mono">${k.last_used_epoch ? ago(k.last_used_epoch) : '–'}</td><td>${U.pill(k.revoked ? '✗ revoked' : '● active', k.revoked ? 'danger' : 'ok')}</td><td>${k.revoked ? '' : `<button class="btn ghost sm" data-revoke="${k.id}"><span>Revoke</span></button>`}</td></tr>`).join('')}</tbody></table><div id="rv-out"></div>`);
    },
    once: true,
  };
  const loadTeam = async () => {
    const box = $('#team-box'); if (!box) return;
    if (!adminKey()) { await needAdmin($('#tm-out')); }
    try { const d = await call('/v1/team', {}, $('#tm-out')); S.team = d; paintTeam(); }
    catch (e) { set('team', U.note('err', esc(e.message))); }
  };
  const paintTeam = () => {
    if (!S.team) return;
    set('team', `<div class="kit-scroll"><table class="tbl dense"><thead><tr><th>Person</th><th>Role</th><th>Scopes</th><th>Added</th><th></th></tr></thead><tbody>${S.team.members.map((m) => `<tr><td>${esc(m.email)}${m.owner ? ' <span class="pill info">owner</span>' : ''}</td><td>${U.pill(esc(m.role), m.role === 'admin' ? 'warn' : '')}</td><td class="small">${m.scopes.map(esc).join(', ')}</td><td class="mono">${esc(m.created_at || '–')}</td><td>${m.owner ? '' : `<button class="btn ghost sm" data-rm="${m.id}" aria-label="Remove ${esc(m.email)}"><span>Remove</span></button>`}</td></tr>`).join('')}</tbody></table></div>`);
  };

  /* ---- Usage and plan ---- */
  V.usage = {
    shell: () => `<div class="grid g3" id="us-tiles">${U.skeleton(120)}</div><div id="us-flag"></div>
      <section class="card kit-gap-s"><h2 class="h3" id="us-h">Calls per day</h2><div id="us-chart">${U.skeleton(190)}</div></section>
      <section class="card kit-gap-s"><h2 class="h3">Plan</h2><div class="grid g3" id="us-plans"></div><div id="plan-out"></div></section>
      <section class="card kit-gap-s"><h2 class="h3">Invoice preview</h2><div id="us-invoice"></div></section>`,
    load: () => [loadCounters(), get('/v1/usage').then((d) => { S.usage = d; })],
    paint: () => {
      const u = S.usage; if (!u) return;
      set('us-tiles', tile(`Calls ${u.month}`, fmt(u.used), `of ${fmt(u.limit)} on ${u.plan_label}, India time`, u.over_limit ? 'danger' : '') + tile('Plan used', u.used ? u.percent + '%' : '0%', u.over_limit ? '▲ over the plan limit' : '✓ within the plan limit', u.over_limit ? 'danger' : '') + tile(`Transactions ${u.month}`, fmt(u.transactions_this_month), 'protected transactions, a part of the calls'));
      set('us-flag', u.over_limit ? U.note('err', `▲ This workspace is over its ${u.plan_label} limit (${fmt(u.used)} of ${fmt(u.limit)} calls). Nothing is blocked: the limit is soft and calls still go through. Switch plan below.`) : '');
      const days = u.per_day.map((d, i) => ({ t: new Date(d.date + 'T00:00:00+05:30').getTime() / 1000, calls: d.calls, partial: d.date === u.per_day.filter((x) => !x.future).slice(-1)[0].date, date: d.date, future: d.future }));
      set('us-h', `Calls per day, ${u.month} (India time)`);
      set('us-chart', barChart(days.map((d) => Object.assign({}, d, { transactions: d.calls })), { series: [{ key: 'calls', cls: 'pr', label: 'Calls' }], xf: dmon, suffix: '', tip: (d) => `${d.date} · ${fmt(d.calls)} call${d.calls === 1 ? '' : 's'}${d.future ? ' · not yet' : d.partial ? ' · today, still counting' : ''}`, aria: `Calls per day in ${u.month}: ${fmt(u.used)} in total` }));
      set('us-plans', Object.entries(u.plans).map(([k, p]) => `<div class="card flat dx-plan ${u.plan === k ? 'cur' : ''}"><div class="between"><b>${esc(p.label)}</b>${u.plan === k ? U.pill('✓ current', 'ok') : ''}</div><div class="mono">${p.price_inr ? inr(p.price_inr) + ' / month' : 'Free'}</div><p class="small muted">${fmt(p.monthly_limit)} calls a month. ${esc(p.blurb)}</p><button class="btn ${u.plan === k ? 'ghost' : 'secondary'} sm" data-plan="${k}" ${u.plan === k ? 'disabled aria-disabled="true"' : ''}><span>${u.plan === k ? 'Current plan' : 'Switch to ' + esc(p.label)}</span></button></div>`).join(''));
      const iv = u.invoice_preview;
      set('us-invoice', `<table class="tbl dense"><tbody><tr><td>${esc(u.plan_label)} plan, ${esc(u.month)}</td><td class="num mono">${inr(iv.base)}</td></tr><tr><td>Included calls</td><td class="num mono">${fmt(iv.included_calls)}</td></tr><tr><td>Calls over the limit</td><td class="num mono">${fmt(iv.extra_calls)}</td></tr><tr><td>Charge for calls over the limit</td><td class="num mono">${inr(iv.extra_charge)}</td></tr><tr><td><b>Total so far</b></td><td class="num mono"><b>${inr(iv.total)}</b></td></tr></tbody></table><p class="small muted">${esc(iv.rule)} ${esc(iv.note)}</p>`);
    },
    once: true,
  };

  /* ---- Settings ---- */
  V.settings = {
    shell: () => `<div id="st-body">${U.skeleton(260)}</div>`,
    load: () => [get('/v1/settings').then((d) => { S.settings = d; })],
    paint: () => {
      const s = S.settings; if (!s || $('#st-form')) return;
      $('#st-body').innerHTML = `<form id="st-form" class="kit-form"><section class="card"><h2 class="h3">Region</h2><p><b>India</b> ${U.pill('fixed', '')}</p><p class="small muted">Data for this workspace belongs in an India region. This preview keeps it on the server it runs on; a paid product would use a managed database in India.</p></section>
        <section class="card"><h2 class="h3">Latency budget</h2><p class="small muted">How much time Aran may add to one transaction. A minute where p95 goes over this counts against the service objective.</p><div class="dx-set-row"><label class="field">Budget in milliseconds<input id="st-budget" type="number" min="0.5" max="1000" step="0.5" value="${esc(String(s.budget_ms))}"></label><label class="field">Objective: share of good minutes (%)<input id="st-target" type="number" min="90" max="99.999" step="0.1" value="${esc(String(s.slo_target))}"></label></div></section>
        <fieldset class="card dx-fs"><legend class="h3">If Aran does not answer in time</legend><p class="small muted">What your system does with the copies (log, fraud tool, analytics, chat) when this budget is missed. The payment itself never waits.</p>${Object.entries(s.fail_safe_modes).map(([k, d]) => `<label class="dx-radio"><input type="radio" name="fs" value="${k}" ${s.fail_safe === k ? 'checked' : ''}><span><b>${esc(k.replace(/_/g, ' '))}</b><span class="small muted">${esc(d)}</span></span></label>`).join('')}<p class="small muted">Saved with the workspace so your bank service can read it from GET /v1/settings.</p></fieldset>
        <section class="card"><h2 class="h3">Webhooks</h2><p class="small muted">Not built in this preview.</p></section>
        <div class="kit-row"><button class="btn" type="submit"><span>Save settings</span></button><span id="st-out" role="status"></span></div></form>`;
    },
    once: true,
  };

  /* ---------------------------------------------------------------- router and shell painting */
  function enter(fresh) {
    const v = view(), meta = VIEWS.find((x) => x[0] === v);
    $$('#nav .tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.v === v));
    if (painted !== v || fresh) {
      document.title = meta[1] + ' · Aran Cloud';
      $('#title').textContent = meta[1]; $('#lede').textContent = meta[2]; $('#eyebrow').textContent = 'Workspace dashboard · ' + meta[1].toLowerCase();
      S.mwin = null; S.loadedOnce = null; S.pending = [];
      $('#body').innerHTML = V[v].shell(); painted = v; wire(v);
      const id = new URLSearchParams(location.hash.split('&').slice(1).join('&')).get('id'); if (id && v === 'transactions') S.sel = Number(id);
      refresh();
    }
  }
  async function refresh(auto) {
    const v = view(); if (!key || !V[v]) return;
    if (auto && V[v].once && S.loadedOnce === v) return;   /* forms and heavy reads load on entry and after an action, not every 5 s */
    const jobs = V[v].load();
    paintLive();
    await Promise.allSettled(jobs);
    if (V[v].once) S.loadedOnce = v;
    S.tick++; if (view() === v) { V[v].paint && V[v].paint(); renderStatus(); }
    if (v === 'keys' && !S.team && !S.teamLoading) { S.teamLoading = true; loadTeam().finally(() => { S.teamLoading = false; }); }
  }
  window.addEventListener('hashchange', () => { enter(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { closeStream(); S.stream = 'paused'; renderStatus(); } else if (key) { S.stream = 'reconnecting'; openStream(); refresh(); } });

  function start() {
    stopAll(); S.lastOk = 0; S.err = ''; S.txns = []; S.ftx = null; S.maxId = 0; S.keys = null; S.slo = null; S.team = null; S.tick = 0; painted = null;
    get('/v1/counters').then((d) => { S.counters = d; }).catch(() => {});
    get('/v1/dashboard').then((d) => { wsName = d.tenant.name + ' · ' + d.tenant.id; $('#ws').textContent = wsName; }).catch(() => {});
    enter(true); openStream();
    timer = setInterval(() => { if (!document.hidden) refresh(true); }, 5000);
  }

  /* ---------------------------------------------------------------- actions (one delegated listener, no inline handlers) */
  function wire() {}
  const body = $('#body');
  let ftimer = 0;
  const readFilters = () => { S.filters = { q: ($('#f-q') || {}).value.trim(), rail: ($('#f-rail') || {}).value, sink: ($('#f-sink') || {}).value }; clearTimeout(ftimer); ftimer = setTimeout(() => { loadTxns().then(() => V.transactions.paint()).catch(() => {}); }, 250); };
  body.addEventListener('input', (e) => { if (e.target.closest('#tx-filters')) readFilters(); });
  body.addEventListener('change', (e) => { if (e.target.closest('#tx-filters')) readFilters(); });
  body.addEventListener('submit', async (e) => {
    const f = e.target; e.preventDefault();
    if (f.id === 'tx-filters') return;
    const btn = $('button[type=submit]', f);
    if (f.id === 'erase-form') return K.busy(btn, async () => {
      const out = $('#er-out'), ref = $('#er-ref').value.trim(), purpose = $('#er-p').value;
      if (!ref) { out.innerHTML = U.note('err', 'Enter a customer ref.'); return; }
      if (!(await U.confirm({ title: `Erase ${ref} for ${purpose}?`, body: 'The purpose key is destroyed. Tokens made under it can never be turned back into the real values.', confirmLabel: 'Shred key' }))) return;
      try { const r = await call('/v1/erase', { body: { customer_ref: ref, purpose } }, out); out.innerHTML = U.verdict(true, 'Purpose key shredded. Receipt signed and added to the log.') + `<pre class="logline out kit-gap-s">${esc(JSON.stringify(r, null, 2))}</pre>`; refresh(); }
      catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
    });
    if (f.id === 'team-form') return K.busy(btn, async () => {
      const out = $('#tm-out');
      try {
        const r = await call('/v1/team', { body: { email: $('#tm-email').value.trim(), role: $('#tm-role').value, issue_key: $('#tm-key').checked } }, out);
        out.innerHTML = U.note('ok', `${esc(r.email)} added as ${esc(r.role)}.`) + (r.api_key ? `<div class="kit-key kit-gap-s"><code>${esc(r.api_key)}</code><button class="btn secondary sm" data-copy="${esc(r.api_key)}"><span>Copy</span></button></div><p class="small muted">Copy it now, it is not shown again.</p>` : '');
        $('#tm-email').value = ''; loadTeam();
      } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
    });
    if (f.id === 'st-form') return K.busy(btn, async () => {
      const out = $('#st-out'), fs = ($('input[name=fs]:checked', f) || {}).value;
      try {
        await call('/v1/slo', { method: 'PUT', body: { budget_ms: Number($('#st-budget').value), target_percent: Number($('#st-target').value) } }, out);
        await call('/v1/settings', { method: 'PUT', body: { fail_safe: fs } }, out);
        out.innerHTML = U.pill('✓ saved', 'ok'); U.toast('Settings saved'); S.slo = null; S.settings = null; V.settings.load()[0].then(() => { $('#st-form').remove(); V.settings.paint(); });
      } catch (err) { out.innerHTML = U.pill('✗ ' + esc(err.message), 'danger'); }
    });
  });
  body.addEventListener('click', async (e) => {
    const t = e.target;
    const win = t.closest('[data-win]'); if (win) { S.win = win.dataset.win; S.mwin = null; $$('[data-win]').forEach((b) => { b.classList.toggle('on', b.dataset.win === S.win); b.setAttribute('aria-pressed', b.dataset.win === S.win); }); refresh(); return; }
    const open = t.closest('[data-open]'); if (open) { if (view() === 'overview') return; e.preventDefault(); S.sel = Number(open.dataset.open); V.transactions.paint(); const d = $('#tx-detail'); d && d.scrollIntoView({ block: 'nearest' }); return; }
    const cp = t.closest('[data-copy]'); if (cp) { K.copy(cp.dataset.copy, cp); return; }
    const rm = t.closest('[data-rm]'); if (rm) {
      if (!(await U.confirm({ title: 'Remove this person?', body: 'Their key, if one was issued, is revoked at once.', confirmLabel: 'Remove' }))) return;
      try { await call('/v1/team/' + rm.dataset.rm, { method: 'DELETE' }, $('#tm-out')); U.toast('Person removed'); loadTeam(); loadKeys().then(() => V.keys.paint()); } catch (err) { $('#tm-out').innerHTML = U.note('err', esc(err.message)); }
      return;
    }
    const rv = t.closest('[data-revoke]'); if (rv) {
      if (!(await U.confirm({ title: 'Revoke this key?', body: 'Apps using it stop working at once. This cannot be undone.', confirmLabel: 'Revoke key' }))) return;
      const out = $('#rv-out'); try { await call('/v1/keys/' + rv.dataset.revoke, { method: 'DELETE' }, out); U.toast('Key revoked'); loadKeys().then(() => V.keys.paint()); } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
      return;
    }
    const pl = t.closest('[data-plan]'); if (pl) {
      const name = pl.dataset.plan; if (!(await U.confirm({ title: `Switch to the ${name} plan?`, body: 'Limits are soft: no payment is ever refused for quota. The invoice preview updates at once.', confirmLabel: 'Switch plan' }))) return;
      const out = $('#plan-out'); try { await call('/v1/plan', { body: { plan: name } }, out); U.toast('Plan changed'); S.usage = null; refresh(); } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
      return;
    }
    const act = t.closest('[data-act]'); if (!act) return; const a = act.dataset.act;
    if (a === 'seed') return K.busy(act, async () => {
      const out = $('[data-seed-out]');
      try { const r = await call('/v1/demo/seed', { method: 'POST', body: {} }, out); U.toast(r.demo_transactions ? `${r.demo_transactions} demo transactions added` : 'Demo mode is off on this server: no demo transactions'); S.maxId = 0; S.txns = []; refresh(); }
      catch (err) { out && (out.innerHTML = U.note('err', esc(err.message))); }
    });
    if (a === 'more') { S.txLimit += 50; V.transactions.paint(); return; }
    if (a === 'pause') { S.paused = !S.paused; if (!S.paused) { const p = S.pending || []; S.pending = []; mergeTx(p); } V.transactions.paint(); return; }
    if (a === 'clear') { S.filters = { q: '', rail: '', sink: '' }; ['f-q', 'f-rail', 'f-sink'].forEach((id) => { const el = $('#' + id); if (el) el.value = ''; }); S.ftx = null; V.transactions.paint(); return; }
    if (a === 'close-detail') { S.sel = null; V.transactions.paint(); return; }
    if (a === 'verify') return K.busy(act, async () => { try { const r = await get('/v1/audit/verify'); set('verify-out', r.valid ? U.verdict(true, `Chain valid · ${fmt(r.total_rows)} rows checked`) : U.verdict(false, 'Tampered: ' + esc(r.error || ''))); } catch (err) { set('verify-out', U.note('err', esc(err.message))); } });
    if (a === 'mint') return K.busy(act, async () => {
      const out = $('#mk-out'), scopes = $$('#mk-s input:checked').map((i) => i.value);
      try { const r = await call('/v1/keys', { body: { label: $('#mk-l').value.trim() || 'API key', scopes } }, out); out.innerHTML = U.note('ok', 'Key minted. Copy it now, it is not shown again.') + `<div class="kit-key kit-gap-s"><code>${esc(r.api_key)}</code><button class="btn secondary sm" data-copy="${esc(r.api_key)}"><span>Copy</span></button></div>`; loadKeys().then(() => V.keys.paint()); }
      catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
    });
    if (a === 'trace') return K.busy(act, async () => {
      const out = $('#trace-out'), dump = $('#dump').value.trim(); if (!dump) { out.innerHTML = U.note('err', 'Paste a dump first.'); return; }
      try {
        const r = await call('/v1/trace', { body: { dump } }, out);
        out.innerHTML = `${r.top ? U.verdict(true, `Most tokens trace back to <b>${esc(r.top.sink)}</b> (${Math.round(r.top.share * 100)}% of matched tokens).`) : U.verdict(false, 'No token in this dump was issued by this workspace.')}<div class="kit-row kit-gap-s">${U.pill(r.candidates + ' candidates', '')}${U.pill(r.matched + ' matched', 'tok')}${U.pill(r.raw_identifiers_in_dump + ' raw identifiers', r.raw_identifiers_in_dump ? 'danger' : 'ok')}</div>${r.ranking.length ? `<div class="kit-gap-s">${r.ranking.map((x, i) => U.rankRow(esc(x.sink), x.share, x.tokens + ' tokens', i)).join('')}</div>` : ''}`;
      } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
    });
  });

  health(); setInterval(health, 10000);
  if (!key) gate(); else start();
})(window.ARAN);
