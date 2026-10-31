/* App shell, router, smooth scroll (Lenis), GSAP, theme and sound toggles. */
(function (A) {
  const U = A.ui, T = A.tour, $ = U.$, $$ = U.$$;
  const NAV = A.site.consolePages(), FIRST = A.site.first; /* one order for every Aran app: kit/sitemap.js */
  const t = A.t || ((x) => x), TITLES = Object.fromEntries(NAV.map(([id, l]) => [id, t(l)]).concat([['arena', t('Beat the firewall')]]));
  const view = $('#view'), menu = $('#menu'), qs = new URLSearchParams(location.search);
  let cleanup = [], current = null, lenis = null;
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}

  /* ---- smooth scroll ---- */
  if (!U.reduced() && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true }); window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }

  /* ---- chrome: top bar and menu ---- */
  const mark = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="var(--brand-fill-color)"/><path d="M6 24V12h4v-4h4v4h4v-4h4v4h4v12z" fill="var(--background-color)"/><rect x="21" y="18" width="5" height="6" fill="var(--token-color)"/></svg>`;
  $('#topbar').innerHTML = `<a class="logo" href="#${FIRST}" aria-label="Aran, home">${mark}<span>Aran</span><span class="tamil">அரண்</span></a><div class="env"><span class="long"><b>LIVE</b> · ${t('every value computed by Aran’s code · identifiers are generated, never real people')}</span><span class="short"><b>LIVE</b> · ${t('generated IDs only')}</span></div><div class="tools"><select class="langsel" id="lang" aria-label="Language">${Object.entries(A.LANGS || { en: 'English' }).map(([c, n]) => `<option value="${c}" ${A.lang && A.lang() === c ? 'selected' : ''}>${n}</option>`).join('')}</select><a class="pillbtn" id="present" href="?present=1#tour/0" title="Presenter mode: a fixed 3-minute path, offline replay"><span class="txt">▶ ${t('Present')}</span></a><button class="pillbtn sound" id="sound" aria-pressed="false" aria-label="Toggle sound"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="txt" id="sound-t">${t('Sound off')}</span></button><button class="pillbtn" id="theme" aria-label="Toggle theme"><span id="theme-i" aria-hidden="true"></span><span class="txt" id="theme-t"></span></button><button class="pillbtn solid menubtn rollhost" id="menubtn" aria-expanded="false" aria-controls="menu"><span class="ln" aria-hidden="true"></span>${U.roll(t('Menu'))}</button></div>`;
  $('#menu').innerHTML = A.site.menuHTML(parse0(), { t, roll: U.roll, side: `<div><div class="label">${t('Environment')}</div><p>${t('Every number is live. Identifiers are generated and belong to no one.')}</p></div><div><div class="label">${t('Previews')}</div><p><a href="?state=starting">${t('Starting screen')} →</a><a href="?state=failed">${t('Load failed')} →</a><a href="?present=1#tour/0">${t('Presenter mode')} →</a></p></div>` });
  A.site.wireMenu($('#menu'));

  function parse0() { return location.hash.slice(1).split('/')[0] || FIRST; }
  const setMenu = (open) => { menu.classList.toggle('open', open); $('#menubtn').setAttribute('aria-expanded', open); lenis && (open ? lenis.stop() : lenis.start()); document.body.style.overflow = open ? 'hidden' : ''; };
  $('#menubtn').onclick = () => { setMenu(!menu.classList.contains('open')); A.sound.click(); };
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

  /* ---- theme (remembered under aran-theme) ---- */
  const setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem('aran-theme', t); } catch (e) {} $('#theme-i').textContent = t === 'dark' ? '☀' : '☾'; $('#theme-t').textContent = A.t ? A.t(t === 'dark' ? 'Light' : 'Dark') : t === 'dark' ? 'Light' : 'Dark'; };
  let th = 'dark'; try { th = localStorage.getItem('aran-theme') || 'dark'; } catch (e) {} setTheme(th);
  $('#theme').onclick = () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); A.sound.click(); };

  /* ---- sound ---- */
  $('#sound').onclick = () => { const on = A.sound.toggle(); $('#sound').setAttribute('aria-pressed', on); $('#sound-t').textContent = t(on ? 'Sound on' : 'Sound off'); };
  $('#lang').onchange = (e) => A.setLang && A.setLang(e.target.value);
  /* on a phone the language picker shows a short name (EN, த, हि) so it is never cut off */
  const SHORT = { en: 'EN', ta: 'த', hi: 'हि' }, narrow = matchMedia('(max-width: 760px)');
  const langLabels = () => [...$('#lang').options].forEach((o) => { o.textContent = narrow.matches ? (SHORT[o.value] || o.value.toUpperCase()) : (A.LANGS || { en: 'English' })[o.value]; });
  langLabels(); narrow.addEventListener ? narrow.addEventListener('change', langLabels) : narrow.addListener(langLabels);
  if (qs.get('present')) $('#present').hidden = true;
  document.addEventListener('pointerover', (e) => { const t = e.target.closest && e.target.closest('a, button, .li, tr.click'); if (t && !t.contains(e.relatedTarget)) A.sound.tick(); }, true);
  document.addEventListener('click', (e) => { if (e.target.closest('.btn, .chip, .tab')) A.sound.click(); });

  /* ---- routing ---- */
  const parse = () => { const [p, n] = location.hash.slice(1).split('/'); return { page: p || FIRST, n: Math.max(0, Math.min(12, parseInt(n, 10) || 0)) }; };
  function startScreen(kind, err) {
    const failed = kind === 'failed';
    return `<div class="page"><div class="card plus startcard" role="status"><div class="spinner"></div><h2>Starting Aran</h2><p class="muted" style="max-width:480px;margin:12px auto 0">${failed ? `<span class="t-leak">Load failed: ${U.esc(err || 'unknown error')}</span>` : 'Loading the trained detector, NER and context models, and enrolling customers. This takes a few seconds after a cold start.'}</p>${kind === 'offline' ? '<p class="small muted" style="margin-top:12px">Server unreachable. Retrying every 2 s.</p>' : ''}${qs.get('state') ? `<p class="small" style="margin-top:24px"><a class="btn ghost" href="${location.pathname}">Leave this preview</a></p>` : ''}</div></div>`;
  }
  function destroy() { cleanup.forEach((f) => { try { typeof f === 'function' && f(); } catch (e) {} }); cleanup = []; ScrollTrigger.getAll().forEach((s) => s.kill()); gsap.killTweensOf('*'); }
  function render() {
    const { page, n } = parse(); destroy();
    if (current && current.page === 'tour' && current.n !== n) T.seen.add(current.n);
    current = { page, n }; menu.classList.contains('open') && setMenu(false);
    $$('.menu-link').forEach((a) => { const on = a.dataset.id === page; a.classList.toggle('cur', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); }); $$('.menu-group').forEach((g) => g.classList.toggle('here', !!g.querySelector('.menu-link.cur')));
    document.title = (TITLES[page] || (page === 'components' ? 'Components' : page === 'states' ? 'States' : 'Aran')) + ' · Aran';
    lenis ? lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0);
    if (qs.get('state')) { view.innerHTML = startScreen(qs.get('state')); return; }
    const pg = page === 'tour' ? null : A.pages[page];
    if (page === 'tour') {
      view.innerHTML = T.render(n); const C = T.chapters[n];
      if (C.hero) { const h = $('#hero-h'); U.revealHeading(h, 0.25); A.mountHero($('#hero')).then((c) => cleanup.push(c)); const hint = $('.hero-hint'); } else U.revealHeading($('h1[data-split]', view));
      const c = C.mount && C.mount($('.chapter', view)); c && cleanup.push(c); U.runCounts(view); U.reveal(view);
      $$('[data-n]', view).forEach((b) => (b.onclick = () => { const t = +b.dataset.n; if (t >= 0 && t < 13) location.hash = 'tour/' + t; }));
      $$('[data-go-next]', view).forEach((b) => (b.onclick = () => (location.hash = 'tour/1')));
      const sel = $('.chap-select', view); sel && (sel.onchange = () => (location.hash = 'tour/' + sel.value));
    } else if (pg) {
      view.innerHTML = `<div class="page">${U.phead(t(pg.eyebrow), t(pg.title), t(pg.lede))}<div class="pagebody">${pg.view()}</div>${A.site.pagerHTML(page, { t })}</div>`;
      U.revealHeading($('h1[data-split]', view)); const c = pg.mount && pg.mount($('.pagebody', view)); c && cleanup.push(c); U.reveal(view);
    } else { view.innerHTML = `<div class="page"><div class="card plus startcard"><h2>Page not found</h2><p class="muted" style="margin-top:12px">Pick a page from the menu.</p></div></div>`; }
    ScrollTrigger.refresh(); syncBar();
  }
  /* the top bar switches to dark ink while it sits over the light hero panel */
  const syncBar = () => { const h = $('#hero'); $('#topbar').classList.toggle('on-light', !!h && window.scrollY < h.offsetHeight - 70); };
  window.addEventListener('scroll', syncBar, { passive: true }); window.addEventListener('resize', syncBar);
  window.addEventListener('hashchange', render);
  document.addEventListener('keydown', (e) => { if (current && current.page === 'tour' && !e.target.closest('input, textarea, select') && !menu.classList.contains('open') && !$('.dialog-back.open')) { if (e.key === 'ArrowRight' && current.n < 12) location.hash = 'tour/' + (current.n + 1); if (e.key === 'ArrowLeft' && current.n > 0) location.hash = 'tour/' + (current.n - 1); } });
  /* live: the alert badge in the menu follows GET /api/stats */
  const badge = () => { const b = $('#al-badge'), n = A.stats.open_alerts || 0; if (!b) return; b.hidden = !n; b.textContent = n; b.setAttribute('aria-label', n + ' open alerts'); };
  A.on('stats', badge);
  if (qs.get('state')) render();
  else {
    view.innerHTML = startScreen('starting');
    A.boot((st, err) => { view.innerHTML = startScreen(st, err); }).then(() => { badge(); A.poll(); render(); });
  }
})(window.ARAN);
