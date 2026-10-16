/* Presenter mode (?present=1): a fixed 3-minute demo path with a clicker-friendly bar,
   and a demo-safe fallback. While presenting, every successful API answer is saved in
   this browser; if the server or the hall Wi-Fi fails, the console replays the last saved
   answer for that endpoint and says so on screen. Rehearse once with the server on. */
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
  let rec = {};
  try { rec = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { rec = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* storage full: keep what fits */ } const el = document.getElementById('pr-rec'); if (el) el.textContent = `${Object.keys(rec).length} answers saved for offline`; };
  const keyOf = (path, method) => (method || 'GET') + ' ' + path.replace(/([?&])(t|_)=\d+/g, '$1');

  /* ---- record and replay around A.api ---- */
  const live = A.api;
  let replaying = false;
  const banner = (on) => { let b = document.querySelector('.replay-banner'); if (on && !b) { b = document.createElement('div'); b.className = 'replay-banner'; b.setAttribute('role', 'status'); b.textContent = 'Offline replay: showing the last answers recorded from the live server'; document.body.appendChild(b); } if (!on && b) b.remove(); };
  A.api = async function (path, body, method) {
    const m = method || (body === undefined ? 'GET' : 'POST'), k = keyOf(path, m);
    try {
      const d = await live(path, body, method);
      if (path !== '/health' || (d && d.ready)) { const s = JSON.stringify(d); if (s.length < MAX) { rec[k] = d; save(); } }
      if (replaying) { replaying = false; banner(false); }
      return d;
    } catch (e) {
      const offline = /unreachable|HTTP 5\d\d|loading its models/.test(e.message);
      if (offline && rec[k] !== undefined) { replaying = true; banner(true); return JSON.parse(JSON.stringify(rec[k])); }
      throw e;
    }
  };

  /* ---- the bar ---- */
  const t = A.t || ((x) => x);
  let i = Math.max(0, PATH.findIndex(([h]) => location.hash.slice(1) === h)), started = null, timer = null;
  const total = PATH.reduce((a, p) => a + p[2], 0);
  const bar = document.createElement('div');
  bar.className = 'present-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Presenter controls');
  bar.innerHTML = `<button class="btn secondary sm" data-p="prev" aria-label="Previous step">‹</button><span class="dotsm">${PATH.map(() => '<i></i>').join('')}</span><span class="ttl" id="pr-ttl"></span><span class="clock" id="pr-clock"></span><span class="small muted" id="pr-rec"></span><button class="btn sm" data-p="next" aria-label="Next step"><span>Next</span></button><a class="btn ghost sm" href="${location.pathname}#tour/0" aria-label="Leave presenter mode">✕</a>`;
  const go = (n) => { i = Math.max(0, Math.min(PATH.length - 1, n)); if (!started) { started = Date.now(); timer = setInterval(clock, 500); } location.hash = PATH[i][0]; draw(); };
  const clock = () => { const left = total - (started ? (Date.now() - started) / 1000 : 0), el = document.getElementById('pr-clock'); el.textContent = (left < 0 ? '+' : '') + Math.floor(Math.abs(left) / 60) + ':' + String(Math.floor(Math.abs(left)) % 60).padStart(2, '0'); el.classList.toggle('late', left < 0); };
  const draw = () => { bar.querySelectorAll('.dotsm i').forEach((d, k) => d.classList.toggle('on', k <= i)); document.getElementById('pr-ttl').textContent = `${i + 1}/${PATH.length} · ${t(PATH[i][1])} (${PATH[i][2]}s)`; document.getElementById('pr-rec').textContent = `${Object.keys(rec).length} answers saved for offline`; clock(); };
  bar.onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) go(i + (b.dataset.p === 'next' ? 1 : -1)); };
  // presentation clickers send PageDown / PageUp; N and B work on a keyboard
  document.addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('input, textarea, select')) return; if (e.key === 'PageDown' || e.key === 'n' || e.key === 'N') { e.preventDefault(); go(i + 1); } if (e.key === 'PageUp' || e.key === 'b' || e.key === 'B') { e.preventDefault(); go(i - 1); } });
  window.addEventListener('hashchange', () => { const k = PATH.findIndex(([h]) => location.hash.slice(1) === h); if (k >= 0 && k !== i) { i = k; draw(); } });
  const mount = () => { document.body.appendChild(bar); draw(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => {});
  A.present = { path: PATH, clear: () => { rec = {}; save(); draw(); } };
})(window.ARAN);
