/* Presenter mode (?present=1): a fixed 3-minute path through the live console with a
   clicker-friendly bar. Open the site a minute before presenting so the free server is awake. */
window.ARAN = window.ARAN || {};
(function (A) {
  const qs = new URLSearchParams(location.search);
  if (!qs.get('present')) return;
  const KEY = 'aran-recording', MAX = 400000;
  const PATH = [
    ['tour/0', 'A firewall for data', 20], ['versus', 'Without Aran / with Aran', 30], ['arena-live', 'Judges try to beat it', 35],
    ['tour/6', 'Disguises do not work', 15], ['ledger', 'Two safe masks make one leak', 25], ['me', 'The customer erases their data', 25],
    ['quantum', 'Harvest now, decrypt later', 20], ['tour/11', 'The evidence', 10],
  ];
  /* Every answer comes from the live server. If it is asleep or unreachable, the page says so
     (the normal waking and reconnecting screens); nothing saved earlier is shown in its place. */
  try { localStorage.removeItem('aran-recording'); } catch (e) { /* storage blocked */ }

  /* ---- the bar ---- */
  const t = A.t || ((x) => x);
  let i = Math.max(0, PATH.findIndex(([h]) => location.hash.slice(1) === h)), started = null, timer = null;
  const total = PATH.reduce((a, p) => a + p[2], 0);
  const bar = document.createElement('div');
  bar.className = 'present-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Presenter controls');
  bar.innerHTML = `<button class="btn secondary sm" data-p="prev" aria-label="Previous step">‹</button><span class="dotsm">${PATH.map(() => '<i></i>').join('')}</span><span class="ttl" id="pr-ttl"></span><span class="clock" id="pr-clock"></span><button class="btn sm" data-p="next" aria-label="Next step"><span>Next</span></button><a class="btn ghost sm" href="${location.pathname}#tour/0" aria-label="Leave presenter mode">✕</a>`;
  const go = (n) => { i = Math.max(0, Math.min(PATH.length - 1, n)); if (!started) { started = Date.now(); timer = setInterval(clock, 500); } location.hash = PATH[i][0]; draw(); };
  const clock = () => { const left = total - (started ? (Date.now() - started) / 1000 : 0), el = document.getElementById('pr-clock'); el.textContent = (left < 0 ? '+' : '') + Math.floor(Math.abs(left) / 60) + ':' + String(Math.floor(Math.abs(left)) % 60).padStart(2, '0'); el.classList.toggle('late', left < 0); };
  const draw = () => { bar.querySelectorAll('.dotsm i').forEach((d, k) => d.classList.toggle('on', k <= i)); document.getElementById('pr-ttl').textContent = `${i + 1}/${PATH.length} · ${t(PATH[i][1])} (${PATH[i][2]}s)`; clock(); };
  bar.onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) go(i + (b.dataset.p === 'next' ? 1 : -1)); };
  // presentation clickers send PageDown / PageUp; N and B work on a keyboard
  document.addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('input, textarea, select')) return; if (e.key === 'PageDown' || e.key === 'n' || e.key === 'N') { e.preventDefault(); go(i + 1); } if (e.key === 'PageUp' || e.key === 'b' || e.key === 'B') { e.preventDefault(); go(i - 1); } });
  window.addEventListener('hashchange', () => { const k = PATH.findIndex(([h]) => location.hash.slice(1) === h); if (k >= 0 && k !== i) { i = k; draw(); } });
  const mount = () => { document.body.appendChild(bar); draw(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
  A.present = { path: PATH };
})(window.ARAN);
