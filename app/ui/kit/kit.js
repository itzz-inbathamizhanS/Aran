/* Aran kit: the console's top bar, menu, theme and helpers for the other Aran apps
   (Aran Cloud on :8100, Bank A on :9001, Bank B on :9002). Needs /aran/js/ui.js first.

   A page calls ARAN.kit.shell({ app: 'cloud', page: 'dashboard', env: '...' }) once.
   App addresses default to the same host on the standard ports; a server can override
   them by setting window.ARAN_LINKS before this script runs. */
window.ARAN = window.ARAN || {};
(function (A) {
  const U = A.ui, K = (A.kit = {});
  const esc = U.esc, $ = U.$, $$ = U.$$;
  K.esc = esc;

  /* ---- where the four apps live and the one site map (kit/sitemap.js) ---- */
  const S = A.site;
  K.links = S.links;

  /* ---- embedded inside the compare page: no chrome ---- */
  const qs = new URLSearchParams(location.search);
  if (qs.get('embed') === '1') document.documentElement.classList.add('embed');

  /* ---- theme, shared with the console (localStorage aran-theme) ---- */
  const setTheme = (t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('aran-theme', t); } catch (e) {}
    const i = $('#theme-i'), x = $('#theme-t');
    if (i) i.textContent = t === 'dark' ? '☀' : '☾';
    if (x) x.textContent = t === 'dark' ? 'Light' : 'Dark';
  };
  let th = 'dark'; try { th = localStorage.getItem('aran-theme') || 'dark'; } catch (e) {}
  document.documentElement.dataset.theme = th;

  const mark = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="var(--brand-fill-color)"/><path d="M6 24V12h4v-4h4v4h4v-4h4v4h4v12z" fill="var(--background-color)"/><rect x="21" y="18" width="5" height="6" fill="var(--token-color)"/></svg>`;

  /* ---- the shell: top bar, full-screen menu, app switcher ---- */
  K.shell = (o) => {
    o = o || {};
    const cur = o.page || o.app;
    let top = $('#topbar'); if (!top) { top = document.createElement('header'); top.className = 'topbar'; top.id = 'topbar'; document.body.prepend(top); }
    let menu = $('#menu'); if (!menu) { menu = document.createElement('nav'); menu.className = 'menu'; menu.id = 'menu'; menu.setAttribute('aria-label', 'Menu'); top.after(menu); }
    const here = S.find(cur), grp = here && here.group;
    top.innerHTML = `<a class="logo" href="${here ? here.page.href : S.links.console + '/'}" aria-label="${esc(o.brand || 'Aran')}, home">${mark}<span>${esc(o.brand || 'Aran')}</span><span class="tamil">அரண்</span></a><div class="env"><span class="long"><b>LIVE</b> · ${esc(o.env || 'every value comes from the Aran API · identifiers are generated, never real people')}</span><span class="short"><b>LIVE</b> · ${esc(o.envShort || 'generated IDs only')}</span></div><div class="tools">${o.tools || ''}<button class="pillbtn" id="theme" aria-label="Toggle theme"><span id="theme-i" aria-hidden="true"></span><span class="txt" id="theme-t"></span></button><button class="pillbtn solid menubtn rollhost" id="menubtn" aria-expanded="false" aria-controls="menu"><span class="ln" aria-hidden="true"></span>${U.roll('Menu')}</button></div>`;
    /* the full-screen menu: every page of every app, grouped and numbered in site order */
    menu.innerHTML = S.menuHTML(cur, { roll: U.roll, side: `<div><div class="label">Environment</div><p>Every number comes from the running Aran services. Identifiers are generated and belong to no one.</p></div>` });
    S.wireMenu(menu);
    /* the section bar: a way back to the console, then the pages of this section in order */
    if (!$('.kit-sub') && grp) {
      const sub = document.createElement('div'); sub.className = 'kit-sub';
      sub.innerHTML = `<nav class="kit-apps" aria-label="${esc(grp.label)}"><a href="${S.find(S.first).page.href}" class="back">← Console</a><span class="kit-sec">${esc(grp.label)}</span>${grp.pages.map((pg) => `<a href="${pg.href}" class="${pg.id === cur ? 'cur' : ''}" ${pg.id === cur ? 'aria-current="page"' : ''}>${esc(pg.label)}</a>`).join('')}</nav>`;
      menu.after(sub);
      /* on a phone the bar scrolls sideways: bring the current page into view */
      const bar = sub.firstElementChild, c = bar.querySelector('.cur');
      if (c && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = c.offsetLeft - (bar.clientWidth - c.offsetWidth) / 2;
    }
    const setMenu = (open) => { menu.classList.toggle('open', open); $('#menubtn').setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; };
    $('#menubtn').onclick = () => setMenu(!menu.classList.contains('open'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
    setTheme(document.documentElement.dataset.theme || 'dark');
    $('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    if (!$('.skip')) { const s = document.createElement('a'); s.className = 'skip'; s.href = '#view'; s.textContent = 'Skip to content'; document.body.prepend(s); }
  };

  /* ---- headings: the console's word reveal when GSAP is there, plain otherwise ---- */
  K.reveal = (root) => { const h = $('h1[data-split]', root); if (h && window.gsap) U.revealHeading(h); };

  /* ---- fetch helper: JSON in and out, readable errors ---- */
  K.api = async (url, o) => {
    o = o || {};
    const headers = Object.assign({}, o.body !== undefined ? { 'Content-Type': 'application/json' } : {}, o.key ? { 'X-API-Key': o.key } : {}, o.headers || {});
    const res = await fetch(url, { method: o.method || (o.body !== undefined ? 'POST' : 'GET'), headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
    let data = null; const txt = await res.text();
    try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = { detail: txt }; }
    if (!res.ok) { const err = new Error((data && (data.detail || data.message)) || `HTTP ${res.status}`); err.status = res.status; err.data = data; throw err; }
    return data;
  };

  /* ---- highlight: <TYPE:token> placeholders teal; 10 to 16 digit numbers red-orange (raw)
     or teal when the caller knows they are format-preserving tokens (digits: 'token') ---- */
  K.hl = (text, o) => {
    const dk = o && o.digits === 'token' ? 'm-token' : 'm-raw';
    let s = esc(text == null ? '' : text);
    s = s.replace(/&lt;[A-Za-z0-9_:\-]+&gt;/g, (m) => `<mark class="m-token">${m}</mark>`);
    s = s.replace(/(^|[^\w>])(\d{10,16})(?!\w)/g, (m, p, d) => `${p}<mark class="${dk}">${d}</mark>`);
    return s;
  };
  /* the original text with each finding marked (protected = amber real data, missed = red-orange) */
  K.marked = (text, findings) => {
    let out = '', last = 0;
    [...(findings || [])].filter((f) => f.start != null).sort((a, b) => a.start - b.start).forEach((f) => {
      if (f.start < last) return;
      out += esc(text.slice(last, f.start)) + `<mark class="${f.protected ? 'm-real' : 'm-raw'}" title="${esc(f.type)}">${esc(text.slice(f.start, f.end))}</mark>`; last = f.end;
    });
    return out + esc(text.slice(last));
  };
  /* the protected text with every issued token marked teal */
  K.tokened = (text, findings) => {
    let s = esc(text || '');
    [...new Set((findings || []).map((f) => f.token).filter(Boolean))].forEach((t) => { s = s.split(esc(t)).join(`<mark class="m-token">${esc(t)}</mark>`); });
    return s.replace(/&lt;[A-Z_]+(?:_\d+|:[^&]*)&gt;(?![^<]*<\/mark>)/g, (m) => `<mark class="m-token">${m}</mark>`);
  };
  K.cell = (val, isToken) => {
    if (val == null || val === '') return '<span class="muted">–</span>';
    const v = String(val);
    if (isToken || /^<.*>$/.test(v)) return `<mark class="m-token">${esc(v)}</mark>`;
    if (/^\d{10,16}$/.test(v)) return `<mark class="m-raw">${esc(v)}</mark>`;
    if (/^X+\d{2,4}$/.test(v)) return `<span class="mono">${esc(v)}</span>`;
    return esc(v);
  };

  /* ---- session-only key store (sessionStorage, guarded) ---- */
  K.store = {
    get: (k) => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch (e) {} },
  };
  /* a key handed over in the URL fragment (#key=...) is saved and removed from the address bar */
  K.takeKeyFromHash = (storeAs) => {
    const h = location.hash.replace(/^#/, ''); if (!h.includes('key=')) return '';
    const p = new URLSearchParams(h), k = (p.get('key') || '').trim();
    if (k) { K.store.set(storeAs, k); history.replaceState(null, '', location.pathname + location.search + (p.get('tab') ? '#' + p.get('tab') : '')); }
    return k;
  };

  K.copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); U.toast('Copied'); } catch (e) { U.toast('Copy failed, select the text instead'); }
    if (btn) { const t = btn.innerHTML; btn.innerHTML = '<span>Copied</span>'; setTimeout(() => (btn.innerHTML = t), 1400); }
  };
  K.busy = async (btn, fn) => { btn && btn.classList.add('busy'); btn && (btn.disabled = true); try { return await fn(); } finally { btn && btn.classList.remove('busy'); btn && (btn.disabled = false); } };
  K.time = (t) => (t ? new Date(t * 1000).toLocaleTimeString() : '–');
})(window.ARAN);
