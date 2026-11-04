/* The Aran site map: every page of every Aran app, in one order, in one place.
   The console menu (js/main.js) and the menus of Aran Cloud and the demo banks (kit/kit.js)
   are both drawn from this list, so the order and the names can never drift apart.

   Order follows the story a visitor needs:
     1 Start          what Aran is: live overview, guided tour, how it works
     2 Firewall       the tools: send traffic, erase, trace, immune layer, evidence
     3 Try it live    the stand-out features
     4 Banks          the same bank with and without Aran
     5 Aran Cloud     Aran as a product for banks

   Groups marked local are only shown where those services run: on localhost, or when a
   server sets window.ARAN_LINKS, and on the hosted copies (HOSTED below). */
window.ARAN = window.ARAN || {};
(function (A) {
  const host = location.hostname || '127.0.0.1', proto = location.protocol === 'file:' ? 'http:' : location.protocol;
  const at = (port) => `${proto}//${host}:${port}`;
  const local = /^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)$/.test(host) || /^(10|192\.168)\./.test(host);
  /* the hosted copies: the console on aran-console, and Aran Cloud and the banks on their own front doors (deploy/vercel) */
  const HOSTED = { console: 'https://aran-console.vercel.app', cloud: 'https://aran-cloud.vercel.app', bankA: 'https://aran-bank-a.vercel.app', bankB: 'https://aran-bank-b.vercel.app' };
  const hosted = Object.values(HOSTED).some((u) => u.slice(8) === host);
  const links = Object.assign({ console: at(8000), cloud: at(8100), bankA: at(9001), bankB: at(9002) }, hosted ? HOSTED : {}, window.ARAN_LINKS || {});
  const hasApps = !!window.ARAN_LINKS || local || hosted;

  /* [id, label, app, path]  app = which server; path is a hash route for the console */
  const GROUPS = [
    { id: 'start', label: 'Start', pages: [
      ['overview', 'Overview', 'console', '#overview'],
      ['tour', 'Guided tour', 'console', '#tour'],
      ['about', 'How it works', 'console', '#about'],
    ] },
    { id: 'firewall', label: 'Firewall console', pages: [
      ['traffic', 'Live traffic', 'console', '#traffic'],
      ['customers', 'Customers & erasure', 'console', '#customers'],
      ['trace', 'Leak trace', 'console', '#trace'],
      ['immune', 'Immune layer', 'console', '#immune'],
      ['results', 'Results & tests', 'console', '#results'],
    ] },
    { id: 'demos', label: 'Try it live', pages: [
      ['versus', 'With / without Aran', 'console', '#versus'],
      ['arena-live', 'Beat the firewall', 'console', '#arena-live'],
      ['ledger', 'Leakage ledger', 'console', '#ledger'],
      ['scan', 'Card photo scan', 'console', '#scan'],
      ['quantum', 'Post-quantum', 'console', '#quantum'],
      ['me', 'My data', 'console', '#me'],
      ['arena', 'Beat the firewall · phone', 'console', '#arena'],
    ] },
    { id: 'banks', label: 'Banks', local: true, pages: [
      ['compare', 'Side by side', 'bankB', '/compare'],
      ['bankA', 'Bank A · legacy', 'bankA', '/'],
      ['bankB', 'Bank B · with Aran', 'bankB', '/'],
    ] },
    { id: 'cloud', label: 'Aran Cloud', local: true, pages: [
      ['cloud', 'Get started', 'cloud', '/'],
      ['connect', 'Quick connect', 'cloud', '/connect'],
      ['dashboard', 'Workspace dashboard', 'cloud', '/dashboard'],
    ] },
    { id: 'design', label: 'Design review', pages: [
      ['components', 'Components board', 'console', '#components'],
      ['states', 'States board', 'console', '#states'],
    ] },
  ];

  const onConsole = () => !!document.getElementById('view') && !!window.ARAN.pages; /* the console defines A.pages */
  const href = (app, path) => {
    if (app === 'console') return onConsole() ? path : links.console + '/' + path;
    return links[app] + path;
  };
  const groups = () => GROUPS.filter((g) => !g.local || hasApps).map((g) => Object.assign({}, g, { pages: g.pages.map(([id, label, app, path]) => ({ id, label, app, path, href: href(app, path) })) }));
  let n = 0;
  const numbered = () => { n = 0; return groups().map((g) => Object.assign(g, { pages: g.pages.map((p) => Object.assign(p, { n: ++n })) })); };
  const find = (id) => { for (const g of numbered()) for (const p of g.pages) if (p.id === id) return { group: g, page: p }; return null; };

  /* the full-screen menu, drawn the same way in every app: a search box, then one column per
     group with numbered pages; the current page and its group are marked */
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const menuHTML = (cur, o) => {
    o = o || {}; const t = o.t || ((x) => x), roll = o.roll || esc;
    const gs = numbered(), total = gs.reduce((a, g) => a + g.pages.length, 0);
    return `<div class="menu-grid wide"><div class="menu-head"><label class="menu-search"><span class="label">${esc(t('Find a page'))}</span><input type="search" id="menu-q" autocomplete="off" placeholder="${esc(t('Type to filter'))} · ${total} ${esc(t('pages'))}"></label><span class="label menu-count" id="menu-n"></span></div>
      <nav class="menu-cols" aria-label="${esc(t('All pages'))}">${gs.map((g) => `<section class="menu-group ${g.pages.some((p) => p.id === cur) ? 'here' : ''}" data-g="${g.id}"><div class="label"><span>${esc(t(g.label))}</span><span class="rng">${String(g.pages[0].n).padStart(2, '0')}–${String(g.pages[g.pages.length - 1].n).padStart(2, '0')}</span></div>${g.pages.map((p) => `<a class="menu-link rollhost ${p.id === cur ? 'cur' : ''}" href="${p.href}" data-id="${p.id}" data-q="${esc((p.label + ' ' + t(p.label) + ' ' + g.label + ' ' + t(g.label)).toLowerCase())}" ${p.id === cur ? 'aria-current="page"' : ''}><span class="n">${String(p.n).padStart(2, '0')}</span>${roll(t(p.label))}${p.id === 'immune' ? '<span class="badge" id="al-badge" hidden></span>' : ''}${p.app !== 'console' ? '<span class="ext" aria-hidden="true">↗</span>' : ''}</a>`).join('')}</section>`).join('')}</nav>
      <aside class="menu-foot">${o.side || ''}<div><div class="label">${esc(t('Links'))}</div><p><a href="https://github.com/itzz-inbathamizhans/aran" target="_blank" rel="noreferrer">${esc(t('Source on GitHub'))} ↗</a><span class="muted">Team Iravora Void · KARE · Banking &amp; FinTech</span></p></div></aside></div>`;
  };
  /* search: filter as you type, Enter opens the first match, focus lands in the box when the menu opens */
  const wireMenu = (menu) => {
    const q = menu.querySelector('#menu-q'), n = menu.querySelector('#menu-n'); if (!q) return;
    const run = () => { const v = q.value.trim().toLowerCase(); let shown = 0;
      menu.querySelectorAll('.menu-group').forEach((g) => { let any = 0; g.querySelectorAll('.menu-link').forEach((a) => { const ok = !v || a.dataset.q.includes(v); a.hidden = !ok; if (ok) { any++; shown++; } }); g.hidden = !any; });
      n.textContent = v ? `${shown} / ${menu.querySelectorAll('.menu-link').length}` : ''; };
    q.oninput = run;
    q.onkeydown = (e) => { if (e.key === 'Enter') { const a = menu.querySelector('.menu-link:not([hidden])'); if (a) { e.preventDefault(); a.click(); } } };
    new MutationObserver(() => { if (menu.classList.contains('open')) { q.value = ''; run(); if (matchMedia('(pointer: fine)').matches) setTimeout(() => q.focus({ preventScroll: true }), 30); } }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  };

  /* previous / next page in site order, at the foot of every page, so the site reads as one path */
  const pagerHTML = (id, o) => {
    o = o || {}; const t = o.t || ((x) => x);
    const all = numbered().flatMap((g) => g.pages.map((p) => Object.assign({ group: g.label }, p)));
    const i = all.findIndex((p) => p.id === id); if (i < 0) return '';
    const link = (p, cls, arrow) => (p ? `<a class="pager-${cls}" href="${p.href}"><span class="label">${cls === 'prev' ? '← ' : ''}${esc(t(cls === 'prev' ? 'Previous' : 'Next'))} · ${String(p.n).padStart(2, '0')} · ${esc(t(p.group))}${cls === 'next' ? ' →' : ''}</span><b>${esc(t(p.label))}</b></a>` : '<span></span>');
    return `<nav class="pager" aria-label="${esc(t('Previous and next page'))}">${link(all[i - 1], 'prev')}${link(all[i + 1], 'next')}</nav>`;
  };

  /* while the menu is open, everything behind it is inert (no Tab, no clicks), so focus stays in
     the top bar and the menu; closing it gives focus back to the Menu button */
  const menuFocus = (menu, open) => {
    [...document.body.children].forEach((el) => { if (el !== menu && el.id !== 'topbar' && el.tagName !== 'SCRIPT') el.inert = open; });
    const btn = document.getElementById('menubtn');
    const a = document.activeElement;
    if (!open && btn && (!a || a === document.body || menu.contains(a))) btn.focus({ preventScroll: true });
  };
  A.site = { menuHTML, wireMenu, menuFocus, pagerHTML, links, local, hasApps, groups: numbered, find, consolePages: () => GROUPS.filter((g) => g.pages.every((p) => p[2] === 'console')).flatMap((g) => g.pages.map(([id, label]) => [id, label])), first: 'overview' };
})(window.ARAN);
