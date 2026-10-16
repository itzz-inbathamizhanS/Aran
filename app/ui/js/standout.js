/* Demo pages that make Aran stand out (artifacts/Standout frontend ideas):
   #arena (judge's phone) and #arena-live (big screen), #versus, #ledger, #scan, #quantum, #me.
   Same page shape as pages.js: { eyebrow, title, lede, view(), mount(root) -> cleanup }.
   Every value comes from the live server (app/server/standout.py and main.py). */
window.ARAN = window.ARAN || {};
(function (A) {
  const U = A.ui, $ = U.$, $$ = U.$$, P = A.pages, esc = U.esc;
  const store = { get: (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const err = (el, e) => { el.innerHTML = U.note('err', esc(e.message || e)); A.sound.error(); };
  const VERDICT = { caught: ['✓', 'Caught', 'Aran found it and the log stored a token.'], slipped: ['✗', 'Slipped through', 'The number reached the log. Tell the team how you hid it.'], unverified: ['?', 'Number not found', 'Even the strictest decoder could not find the challenge number in your message, so this try is not counted.'] };
  /* highlight exact substrings (exposed values) in a line of text */
  const hl = (text, values, cls) => { let s = esc(text); [...new Set(values)].filter(Boolean).sort((a, b) => b.length - a.length).forEach((v) => { s = s.split(esc(v)).join(`<mark class="${cls}">${esc(v)}</mark>`); }); return s; };

  /* ============================================================ arena: the judge's phone */
  P.arena = {
    eyebrow: 'BEAT THE FIREWALL', title: 'Hide the number. Aran will find it.', lede: 'Type, paste or speak a message that hides the number below in any disguise you like. It goes through the live firewall and shows up on the big screen.',
    view: () => `<div class="arena-phone stack">
      <section class="card plus" data-api="GET /api/arena/challenge"><span class="label">Your challenge</span><div id="ar-ch">${U.skeleton(90)}</div></section>
      <section class="card plus stack" data-api="POST /api/arena/try">
        <label class="field">Your name on the board<input id="ar-nick" maxlength="24" autocomplete="nickname"></label>
        <textarea id="ar-text" class="mono" maxlength="2000" rows="5" placeholder="e.g. my card is four five three two..."></textarea>
        <div class="row"><button class="btn secondary" id="ar-mic" aria-pressed="false"><span>🎤 Speak</span></button><select id="ar-lang" aria-label="Speech language"><option value="en-IN">English (India)</option><option value="ta-IN">தமிழ்</option><option value="hi-IN">हिन्दी</option></select><button class="btn" id="ar-go" disabled><span>Send through Aran</span><span class="arr">→</span></button></div>
        <div class="small muted" id="ar-mic-note"></div>
        <div class="chips">${['Spell it in words', 'Tamil digits ௧௨௩', 'Split it into parts', 'Dots or dashes', 'Base64', 'Hide it in JSON', 'Letters for digits (O for 0)'].map((t) => U.chip(t)).join('')}</div>
      </section>
      <div id="ar-res" aria-live="polite"></div></div>`,
    mount(root) {
      let ch = null, via = 'typed', rec = null;
      const nick = $('#ar-nick', root), t = $('#ar-text', root), go = $('#ar-go', root);
      nick.value = store.get('aran-nick', ''); nick.oninput = () => store.set('aran-nick', nick.value);
      const showCh = () => { $('#ar-ch', root).innerHTML = `${U.idStrip(ch.value, 'real', `${ch.label} of a generated customer · belongs to no one`, true)}<p class="small muted" style="margin-top:12px">Get this number past Aran into the log platform. Plain copies are easy to catch; be creative.</p>`; };
      const load = async () => { try { ch = await A.api('/arena/challenge'); showCh(); } catch (e) { err($('#ar-ch', root), e); } };
      t.oninput = () => { go.disabled = !t.value.trim(); if (via === 'voice' && !rec) via = 'typed'; };
      go.onclick = async () => {
        go.disabled = true; const res = $('#ar-res', root);
        try {
          const r = await A.api('/arena/try', { text: t.value, nick: nick.value || 'Judge', challenge: ch && ch.id, via });
          const [i, h, p] = VERDICT[r.verdict];
          res.innerHTML = `<section class="card plus arena-verdict ${r.verdict}"><div class="big">${i}</div><h2>${h}</h2><p class="muted">${p}</p><div class="stack" style="margin-top:16px"><span class="label">What you sent</span><pre class="logline mono">${esc(r.before)}</pre><span class="label">What the log platform stored</span>${U.tokenText(r.after, r.found.map(() => ({})))}<div class="small muted mono">${r.latency_ms} ms in the firewall</div></div></section>`;
          r.verdict === 'caught' ? A.sound.chime() : A.sound.error();
          if (r.challenge && ch && r.challenge.id !== ch.id) { ch = r.challenge; showCh(); }
        } catch (e) { if (/challenge changed/.test(e.message)) load(); err(res, e); }
        go.disabled = !t.value.trim();
      };
      /* speech: browsers allow the microphone only on https or localhost */
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('#ar-mic', root), note = $('#ar-mic-note', root);
      if (!SR || !window.isSecureContext) { mic.disabled = true; note.textContent = !window.isSecureContext ? 'Voice needs https or localhost in the browser. Use the microphone key on your phone keyboard instead; it works the same.' : 'This browser has no speech recognition. Use the microphone key on your keyboard instead.'; }
      else mic.onclick = () => {
        if (rec) { rec.stop(); return; }
        rec = new SR(); rec.lang = $('#ar-lang', root).value; rec.interimResults = true; rec.continuous = false;
        const base = t.value ? t.value + ' ' : ''; mic.setAttribute('aria-pressed', 'true'); mic.firstElementChild.textContent = '■ Stop'; note.textContent = 'Listening…';
        rec.onresult = (e) => { t.value = base + [...e.results].map((x) => x[0].transcript).join(' '); via = 'voice'; t.oninput(); via = 'voice'; };
        rec.onerror = (e) => { note.textContent = 'Microphone: ' + e.error; };
        rec.onend = () => { rec = null; mic.setAttribute('aria-pressed', 'false'); mic.firstElementChild.textContent = '🎤 Speak'; if (note.textContent === 'Listening…') note.textContent = ''; };
        rec.start();
      };
      load(); const poll = setInterval(async () => { try { const c = await A.api('/arena/challenge'); if (!ch || c.id !== ch.id) { ch = c; showCh(); } } catch (e) {} }, 5000);
      return () => { clearInterval(poll); rec && rec.abort(); };
    },
  };

  /* ============================================================ arena: the big screen */
  P['arena-live'] = {
    eyebrow: 'BEAT THE FIREWALL · LIVE BOARD', title: 'Scan the code and try to sneak a number past Aran.', lede: 'Every try from a phone runs through the real firewall. Caught means the log platform stored a token; slipped means the number got through.',
    view: () => `<div class="grid g-side arena-live"><section class="card plus stack" data-api="GET /api/arena/join · GET /api/qr"><div id="al-qr" class="qr">${U.skeleton(260)}</div><div id="al-url" class="mono small"></div><div id="al-hint"></div><div class="row"><a class="btn secondary sm" href="#arena">Try on this screen</a><button class="btn ghost sm" id="al-new">New number</button><button class="btn ghost sm" id="al-reset">Reset board</button></div></section>
      <section class="stack" data-api="GET /api/arena/board (poll 1.5 s)"><div class="grid g4" id="al-stats"></div><div class="card plus"><div class="between"><h3>Latest tries</h3><span class="small muted" id="al-ch"></span></div><div id="al-feed" class="arena-feed"></div></div></section></div>`,
    mount(root) {
      let seen = new Set(), first = true, alive = true;
      (async () => { try { const j = await A.api('/arena/join'); $('#al-qr', root).innerHTML = `<img src="/api/qr?text=${encodeURIComponent(j.url)}" alt="QR code that opens ${esc(j.url)}">`; $('#al-url', root).textContent = j.url; if (j.local_only) $('#al-hint', root).innerHTML = U.note('info', esc(j.hint)); } catch (e) { err($('#al-qr', root), e); } })();
      const draw = (b) => {
        const total = b.caught + b.slipped;
        $('#al-stats', root).innerHTML = U.stat('Caught', '', 'stored as a token', { count: b.caught, tone: 'ok' }) + U.stat('Slipped', '', 'reached the log', { count: b.slipped, tone: b.slipped ? 'danger' : '' }) + U.stat('Catch rate', total ? Math.round((b.caught / total) * 100) + '%' : '–', `${total} counted tries`) + U.stat('Players', '', `${b.unverified} tries without the number`, { count: b.players });
        U.setCounts($('#al-stats', root));
        $('#al-ch', root).textContent = `Challenge: ${b.challenge.label} ending ${b.challenge.value.slice(-4)}`;
        $('#al-feed', root).innerHTML = b.attempts.length ? b.attempts.map((a) => { const [i, h] = VERDICT[a.verdict], fresh = !seen.has(a.id) && !first; return `<div class="arena-row ${a.verdict} ${fresh ? 'fresh' : ''}"><span class="v">${i}</span><div><div class="between"><b>${esc(a.nick)}</b><span class="small muted">${a.via === 'voice' ? '🎤 ' : ''}${h} · ${U.ago(a.at)}</span></div><div class="mono small trunc">${esc(a.before)}</div><div class="mono small trunc t-token">→ ${esc(a.after)}</div></div></div>`; }).join('') : '<p class="muted">No tries yet. Scan the code with a phone.</p>';
        b.attempts.forEach((a) => { if (!seen.has(a.id)) { if (!first) a.verdict === 'caught' ? A.sound.chime() : A.sound.error(); seen.add(a.id); } }); first = false;
      };
      const tick = async () => { try { const b = await A.api('/arena/board'); alive && draw(b); } catch (e) {} };
      $('#al-new', root).onclick = async () => { await A.api('/arena/challenge', {}); tick(); };
      $('#al-reset', root).onclick = async () => { if (await U.confirm({ title: 'Reset the board?', body: 'All tries and scores are cleared and a new number is issued.', confirmLabel: 'Reset' })) { await A.api('/arena/reset', {}); seen = new Set(); first = true; tick(); } };
      tick(); const t = setInterval(tick, 1500); return () => { alive = false; clearInterval(t); };
    },
  };

  /* ============================================================ without / with Aran */
  P.versus = {
    eyebrow: 'WITHOUT ARAN / WITH ARAN', title: 'Same traffic. Two endings.', lede: 'Real bank requests from this server play twice. On the left they go straight to the systems that store them. On the right they pass through Aran first. Then one system is breached.',
    view: () => `<div class="card plus between" data-api="POST /api/versus/run"><p class="muted" style="margin:0">Each request is a real call to the live firewall, filled with generated customers.</p><button class="btn" id="vs-go"><span>▶ Play 12 bank requests</span></button></div><div id="vs-err"></div>
      <div class="grid g2 versus" style="margin-top:16px"><section class="card plus side bad"><div class="between"><h3>Without Aran</h3>${U.pill('raw data', 'danger')}</div><div class="vs-count"><b id="vs-l-n">0</b><span>customer identifiers stored in plain text</span></div><div class="vs-stream" id="vs-l"></div><div id="vs-l-end"></div></section>
      <section class="card plus side good"><div class="between"><h3>With Aran</h3>${U.pill('tokens', 'ok')}</div><div class="vs-count"><b id="vs-r-n">0</b><span>values replaced by tokens before storage</span></div><div class="vs-stream" id="vs-r"></div><div id="vs-r-end"></div></section></div>`,
    mount(root) {
      let timer = null;
      $('#vs-go', root).onclick = async () => {
        const b = $('#vs-go', root); b.disabled = true; clearInterval(timer); ['#vs-l', '#vs-r', '#vs-l-end', '#vs-r-end', '#vs-err'].forEach((s) => ($(s, root).innerHTML = '')); $('#vs-l-n', root).textContent = '0'; $('#vs-r-n', root).textContent = '0';
        let d; try { d = await A.api('/versus/run', { n: 12 }); } catch (e) { err($('#vs-err', root), e); b.disabled = false; return; }
        let i = 0, nl = 0, nr = 0; const step = U.reduced() ? 0 : 650;
        const add = () => {
          const it = d.items[i++]; nl += it.exposed.length; nr += it.protected;
          const head = `<div class="small muted">${esc(it.label)} · ${esc(it.source)} → <b>${esc(A.sinkLabel(it.sink))}</b></div>`;
          $('#vs-l', root).insertAdjacentHTML('afterbegin', `<div class="vs-item">${head}<pre class="logline mono">${hl(it.before, it.exposed.map((x) => x.value), 'm-raw')}</pre></div>`);
          $('#vs-r', root).insertAdjacentHTML('afterbegin', `<div class="vs-item">${head}${U.tokenText(it.after, (it.tokens || []).map((token) => ({ token })))}</div>`);
          $('#vs-l-n', root).textContent = nl; $('#vs-r-n', root).textContent = nr; A.sound.tick();
          if (i >= d.items.length) { clearInterval(timer); breach(); }
        };
        const breach = () => {
          const s = A.sinkLabel(d.leaked_sink), t = d.with_.trace, top = t.top;
          $('#vs-l-end', root).innerHTML = `<div class="breach bad"><h3>⚠ ${esc(s)} is breached</h3><p><b class="t-leak">${d.without.dump_readable}</b> customer identifiers in the stolen file are ready to use. No one can tell which system leaked it.</p><p class="small">Under India's DPDP Rules 2025, failing to take reasonable security safeguards can cost up to <b>₹${d.dpdp_max_crore} crore</b> per breach.</p></div>`;
          $('#vs-r-end', root).innerHTML = `<div class="breach good"><h3>⚠ ${esc(s)} is breached</h3><p><b>${d.with_.dump_readable}</b> usable identifiers in the stolen file. ${d.with_.checksum_valid_ids} of its numbers pass a checksum, so none can be mistaken for real ones.</p><p class="small">Trace: ${top ? `${t.matched} of ${t.candidates} tokens point to <b>${esc(A.sinkLabel(top.sink))}</b> (${U.pct(top.share)}), so the bank knows exactly where it leaked.` : 'no tokens matched.'} Median added time ${d.p50_ms} ms.</p></div>`;
          A.sound.blast && A.sound.blast(); b.disabled = false; b.firstElementChild.textContent = '↺ Play again';
        };
        if (!step) { while (i < d.items.length) add(); } else { add(); timer = setInterval(add, step); }
      };
      return () => clearInterval(timer);
    },
  };

  /* ============================================================ leakage ledger */
  const SINK_DOMAIN = [['acme-crm', 'Acme Ltd · CRM'], ['acme-collections', 'Acme Ltd · collections'], ['acme-analytics', 'Acme Ltd · analytics'], ['loan-vendor', 'Lenders · loan vendor'], ['partner-bank', 'Lenders · partner bank']];
  P.ledger = {
    eyebrow: 'LEAKAGE LEDGER (M4)', title: 'Two safe masks can make one leak.', lede: 'Showing the first 6 digits of a card to one system and the last 4 to another looks safe field by field. If both systems belong to the same vendor, together they leave a few seconds of guessing. The ledger counts exactly what each vendor has seen and refuses the disclosure that crosses the line.',
    view: () => `<div class="card plus" data-api="POST /api/ledger/disclose · GET /api/ledger/state"><div class="row"><label class="field">Customer<select id="lg-c"></select></label><label class="field">Identifier<select id="lg-t"><option value="CARD">Card (16 digits)</option><option value="AADHAAR">Aadhaar (12 digits)</option><option value="MOBILE">Mobile (10 digits)</option></select></label><button class="btn" id="lg-play"><span>▶ Play the vendor attack</span></button><button class="btn ghost sm" id="lg-reset">Reset ledger</button></div>
      <div class="row" style="margin-top:12px"><label class="field">Send to<select id="lg-s">${SINK_DOMAIN.map(([s, l]) => `<option value="${s}">${l}</option>`).join('')}</select></label><label class="field">Mask asked for<select id="lg-m"></select></label><button class="btn secondary" id="lg-go"><span>Ask the ledger</span></button></div><div id="lg-err"></div></div>
      <div id="lg-dec" style="margin-top:16px"></div><div class="grid g2" id="lg-dom" style="margin-top:16px"></div>
      <section class="card plus" style="margin-top:16px"><h3>Decisions for this customer</h3><div class="scroll"><table class="tbl dense"><thead><tr><th>Sink</th><th>Asked</th><th>Granted</th><th class="num">Bits left</th></tr></thead><tbody id="lg-log"></tbody></table></div><p class="small muted">Bits left = log2 of how many valid numbers still fit what the vendor saw (checksum counted exactly). The ledger keeps at least 20 bits (about a million guesses) for cards and Aadhaar, 16 for mobiles. It stores only keyed hashes and digit positions, never the numbers.</p></section>`,
    mount(root) {
      const c = $('#lg-c', root), ty = $('#lg-t', root); let st = null;
      c.innerHTML = A.customers.map((x) => `<option value="${x.ref}">${x.ref} ${esc(x.name)}</option>`).join('');
      const bitsBar = (bits, full, tau) => `<div class="bar ledger-bar ${bits < tau ? 'low' : ''}" role="img" aria-label="${bits} bits left"><i style="width:${Math.max(1, (bits / full) * 100)}%"></i><span class="thr" style="left:${(tau / full) * 100}%" data-tip="ledger minimum ${tau} bits"></span></div>`;
      const cells = (s) => `<div class="lcells" role="img" aria-label="${s.replace(/X/g, '•')}">${[...s].map((ch) => `<span class="${ch === 'X' ? 'hid' : 'shown'}">${ch === 'X' ? '•' : ch}</span>`).join('')}</div>`;
      const guess = (n) => { const s = n / 1000; return s < 60 ? s.toFixed(1) + ' s' : s < 3600 ? (s / 60).toFixed(1) + ' min' : s < 86400 ? (s / 3600).toFixed(1) + ' h' : s < 31557600 ? (s / 86400).toFixed(1) + ' days' : (s / 31557600).toFixed(1) + ' years'; };
      const domCard = (d) => `<section class="card plus ${d.naive_bits < d.tau ? 'danger' : ''}"><div class="between"><h3>${d.sinks.length > 1 ? 'Vendor ' + esc(d.domain) + ' (all its systems joined)' : esc(d.domain) + ' alone'}</h3><span class="small muted">${esc(d.sinks.join(', '))}</span></div>
        <div class="grid g2" style="margin-top:12px"><div><span class="label">Per-field masking only</span>${cells(d.naive_sees)}${bitsBar(d.naive_bits, st.full_bits, d.tau)}<div class="small"><b class="${d.naive_bits < d.tau ? 't-leak' : ''}">${U.fmt(d.naive_candidates)}</b> numbers left · cracked in ${guess(d.naive_candidates)} at 1,000 guesses/s</div></div>
        <div><span class="label">With Aran's ledger</span>${cells(d.sees)}${bitsBar(d.bits, st.full_bits, d.tau)}<div class="small"><b>${U.fmt(d.candidates)}</b> numbers left · ${guess(d.candidates)} at 1,000 guesses/s</div></div></div></section>`;
      const load = async () => { try { st = await A.api(`/ledger/state?customer_ref=${c.value}&type=${ty.value}`); $('#lg-m', root).innerHTML = ['last4', 'first6', 'first4', 'first6last4', 'first4last4', 'last2', 'full', 'token'].filter((m) => !/^first8/.test(m) || st.length > 12).map((m) => `<option>${m}</option>`).join(''); $('#lg-dom', root).innerHTML = st.domains.filter((d) => d.sinks.length > 1).map(domCard).join(''); $('#lg-log', root).innerHTML = st.log.map((r) => `<tr><td>${esc(r.sink)}</td><td class="mono">${r.requested}</td><td class="mono ${r.refused ? 't-leak' : ''}">${r.granted}${r.refused ? ' (smaller)' : ''}</td><td class="num mono">${r.bits_after}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No disclosures yet.</td></tr>'; } catch (e) { err($('#lg-err', root), e); } };
      const ask = async (sink, mask) => {
        $('#lg-err', root).innerHTML = '';
        try {
          const r = await A.api('/ledger/disclose', { customer_ref: c.value, type: ty.value, sink, mask });
          $('#lg-dec', root).innerHTML = `<section class="card plus ${r.refused ? 'danger' : ''}" style="animation:pop .35s both">${U.verdict(!r.refused, r.refused ? `<b>${esc(sink)}</b> asked for <code>${mask}</code>. Granting it would leave the vendor ${r.bits_if_granted} bits (${U.fmt(Math.round(2 ** r.bits_if_granted))} numbers), below the ${r.tau}-bit minimum. The ledger gave <code>${r.granted}</code> instead.` : `<b>${esc(sink)}</b> gets <code>${r.granted}</code>; ${r.bits_after} bits are still left in every domain it belongs to.`)}<div style="margin-top:12px"><span class="label">What ${esc(sink)} receives</span>${cells(r.sink_sees)}</div><div class="small muted mono">decided in ${r.ms} ms</div></section>`;
          r.refused ? A.sound.error() : A.sound.click();
        } catch (e) { err($('#lg-err', root), e); }
        await load();
      };
      $('#lg-go', root).onclick = () => ask($('#lg-s', root).value, $('#lg-m', root).value);
      $('#lg-play', root).onclick = async () => { await A.api('/ledger/reset', {}); await load(); await ask('acme-crm', 'first6'); await U.sleep(U.reduced() ? 0 : 1400); await ask('acme-collections', 'last4'); };
      $('#lg-reset', root).onclick = async () => { await A.api('/ledger/reset', {}); $('#lg-dec', root).innerHTML = ''; load(); };
      c.onchange = ty.onchange = load; load();
    },
  };

  /* ============================================================ card photo scan */
  const NAMES = ['Priya Raman', 'Arjun Kumar', 'Kavya Iyer', 'Rahul Sharma', 'Meena Selvam', 'Vikram Nair'];
  P.scan = {
    eyebrow: 'CARD PHOTO SCAN', title: 'A photo of an ID card is data too.', lede: 'KYC scans, chat screenshots and photos of cards leak numbers just like text. Aran reads the picture inside the bank (Tesseract OCR, no cloud), then the live firewall replaces every identifier on it.',
    view: () => `<div class="card plus" data-api="POST /api/ocr"><div class="row"><button class="btn" id="sc-sample"><span>Make a sample card</span></button><label class="btn secondary" style="cursor:pointer"><span>Upload a picture</span><input type="file" id="sc-file" accept="image/*" capture="environment" hidden></label><button class="btn secondary" id="sc-cam"><span>Use the webcam</span></button><button class="btn ghost" id="sc-snap" hidden><span>📸 Take photo</span></button></div><p class="small muted">Use the generated sample card or a printed sample. Never scan a real person's card.</p><video id="sc-video" playsinline muted hidden></video><div id="sc-err"></div></div>
      <div class="grid g2" style="margin-top:16px"><section class="card plus"><h3>The picture, as stored</h3><div class="scan-wrap"><canvas id="sc-canvas" width="900" height="560" aria-label="Scanned picture with identifiers covered"></canvas></div><div class="small muted" id="sc-meta"></div></section><section class="card plus"><h3>Text Aran read, then protected</h3><div id="sc-text" class="stack"><p class="muted">Make a sample card or upload a picture.</p></div></section></div>`,
    mount(root) {
      const cv = $('#sc-canvas', root), cx = cv.getContext('2d'), video = $('#sc-video', root); let stream = null;
      const send = async (dataUrl, img) => {
        $('#sc-err', root).innerHTML = ''; $('#sc-text', root).innerHTML = U.skeleton(160);
        cv.width = img.width; cv.height = img.height; cx.drawImage(img, 0, 0);
        let r; try { r = await A.api('/ocr', { image: dataUrl }); } catch (e) { err($('#sc-err', root), e); $('#sc-text', root).innerHTML = ''; return; }
        const k = img.width / r.width;
        const cover = (m, t) => { const [x, y, w, h] = m.box.map((v) => v * k); cx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(m.protected ? '--token-bg-color' : '--leak-bg-color') || '#cfe'; cx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(m.protected ? '--token-color' : '--leak-color'); cx.lineWidth = 3 * k; cx.globalAlpha = t; const fill = cx.fillStyle; cx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background-color') || '#000'; cx.fillRect(x - 4, y - 4, w + 8, h + 8); cx.fillStyle = fill; cx.fillRect(x - 4, y - 4, w + 8, h + 8); cx.globalAlpha = 1; cx.strokeRect(x - 4, y - 4, w + 8, h + 8); if (t >= 1 && m.token) { cx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--token-color'); cx.font = `${Math.max(12, h * 0.8)}px Martian Mono, monospace`; cx.textBaseline = 'middle'; cx.fillText(m.token.length > 20 ? m.token.slice(0, 20) + '…' : m.token, x, y + h / 2, w + 120 * k); } };
        const steps = U.reduced() ? [1] : [0.3, 0.6, 1];
        for (const t of steps) { cx.drawImage(img, 0, 0); r.marks.forEach((m) => cover(m, t)); await U.sleep(160); }
        $('#sc-meta', root).textContent = `${r.words} words read in ${r.ocr_ms} ms · firewall ${r.firewall_ms} ms · stored in ${r.sink}`;
        $('#sc-text', root).innerHTML = `<span class="label">OCR text</span><pre class="logline mono">${hl(r.text, r.marks.map((m) => m.value), 'm-real')}</pre><span class="label">Stored after Aran</span>${U.tokenText(r.after, r.marks)}<table class="tbl dense"><tbody>${r.marks.map((m) => `<tr><td>${A.TYPE[m.type] || m.type}</td><td class="mono">${esc(m.value)}</td><td class="mono">${m.protected ? esc(m.token || '') : U.pill('passed raw', 'danger')}</td><td class="num mono">${U.pct(m.p)}</td></tr>`).join('') || '<tr><td class="muted">Nothing sensitive found on this picture.</td></tr>'}</tbody></table>`;
        A.sound.chime();
      };
      const fromUrl = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = url; });
      $('#sc-sample', root).onclick = async () => {
        let g; try { g = await A.generate(); } catch (e) { err($('#sc-err', root), e); return; }
        const c = document.createElement('canvas'); c.width = 900; c.height = 560; const x = c.getContext('2d'), a = g.aadhaar, name = NAMES[Math.floor(Math.random() * NAMES.length)];
        x.fillStyle = '#fbfbf7'; x.fillRect(0, 0, 900, 560); x.fillStyle = '#1d5c4a'; x.fillRect(0, 0, 900, 70); x.fillStyle = '#fff'; x.font = '600 30px Familjen Grotesk, sans-serif'; x.fillText('SAMPLE ID CARD - NOT REAL', 30, 46);
        x.fillStyle = '#d9d9d0'; x.fillRect(30, 110, 170, 210); x.fillStyle = '#111'; x.font = '34px Familjen Grotesk, sans-serif';
        [`Name: ${name}`, `Aadhaar: ${a.slice(0, 4)} ${a.slice(4, 8)} ${a.slice(8)}`, `Mobile: +91 ${g.mobile}`, `Card: ${g.card.replace(/(\d{4})(?=\d)/g, '$1 ')}`].forEach((t, i) => x.fillText(t, 230, 150 + i * 70));
        x.font = '20px Familjen Grotesk, sans-serif'; x.fillStyle = '#666'; x.fillText('Generated by Aran for the demo. These numbers belong to no one.', 30, 520);
        const url = c.toDataURL('image/png'); send(url, await fromUrl(url));
      };
      $('#sc-file', root).onchange = (e) => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = async () => send(fr.result, await fromUrl(fr.result)); fr.readAsDataURL(f); };
      $('#sc-cam', root).onclick = async () => { try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); video.srcObject = stream; video.hidden = false; $('#sc-snap', root).hidden = false; await video.play(); } catch (e) { err($('#sc-err', root), new Error('Camera not available: ' + e.message + (window.isSecureContext ? '' : ' (browsers allow the camera only on https or localhost)'))); } };
      $('#sc-snap', root).onclick = async () => { const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext('2d').drawImage(video, 0, 0); const url = c.toDataURL('image/jpeg', 0.92); send(url, await fromUrl(url)); };
      return () => { stream && stream.getTracks().forEach((t) => t.stop()); };
    },
  };

  /* ============================================================ post-quantum */
  P.quantum = {
    eyebrow: 'POST-QUANTUM UPGRADE', title: 'Harvest now, decrypt later.', lede: 'An attacker can record encrypted bank traffic today and open it once a quantum computer exists. Aran wraps keys with X25519 plus ML-KEM-768 (FIPS 203) and signs receipts with Ed25519 plus ML-DSA-65 (FIPS 204), so they stay closed even then.',
    view: () => `<section class="card plus" data-api="POST /api/pqc/harvest"><div class="between"><h3>The attack, step by step</h3><button class="btn" id="pq-go"><span>▶ Run it on a live key backup</span></button></div><div id="pq-steps" class="pq-steps"></div><div id="pq-err"></div></section>
      <div class="grid g2" style="margin-top:16px"><section class="card plus" data-api="GET /api/pqc/mosca"><h3>Is our data already at risk? (Mosca's rule)</h3><p class="small muted">Data is exposed if it must stay secret longer than the time left before a quantum computer, minus the time the migration takes.</p>${[['shelf', 'Data must stay secret for (years)', 10, 0, 30], ['migration', 'Migration to post-quantum takes (years)', 3, 0, 15], ['crqc', 'Years until a quantum computer can break X25519', 10, 1, 30]].map(([k, l, v, a, b]) => `<label class="field" style="display:block;margin-top:12px">${l}: <b id="pq-${k}-v">${v}</b><input type="range" id="pq-${k}" min="${a}" max="${b}" value="${v}" style="width:100%"></label>`).join('')}<div id="pq-mosca" style="margin-top:16px"></div></section>
      <section class="card plus" data-api="GET /api/pqc/receipt"><h3>Erasure receipts are signed twice</h3><div id="pq-rc">${U.skeleton(120)}</div></section></div>
      <section class="card plus" style="margin-top:16px" data-api="GET /api/pqc/cbom"><h3>Crypto inventory (CBOM)</h3><p class="small muted">Every algorithm in Aran's code, found by scanning the repository (research/pqc/cbom.py), in the CycloneDX format banks use for audits.</p><div class="scroll"><table class="tbl dense"><thead><tr><th>Algorithm</th><th>Kind</th><th>Against a quantum computer</th><th>Where in the code</th></tr></thead><tbody id="pq-cbom"></tbody></table></div></section>`,
    mount(root) {
      const box = (h, ok, body) => `<div class="pq-box ${ok ? 'good' : 'bad'}"><b>${h}</b>${body}</div>`;
      $('#pq-go', root).onclick = async () => {
        const b = $('#pq-go', root), s = $('#pq-steps', root); b.disabled = true; s.innerHTML = '';
        let d; try { d = await A.api('/pqc/harvest', {}); } catch (e) { err($('#pq-err', root), e); b.disabled = false; return; }
        const C = d.classical, H = d.hybrid, steps = [
          ['Today', 'The bank backs up the purpose keys of ' + esc(d.customer) + ' (' + d.purposes.join(', ') + ') to its disaster-recovery site, wrapped two ways.', box('Classical: ' + C.alg, true, `<span class="small mono">public key ${C.public_key_bytes} B · ciphertext ${C.ciphertext_bytes} B · ${C.wrap_ms} ms</span>`) + box('Aran: ' + H.alg, true, `<span class="small mono">public key ${H.public_key_bytes} B · ciphertext ${H.ciphertext_bytes} B · ${H.wrap_ms} ms</span>`)],
          ['Today', 'An attacker on the network records both encrypted backups. Neither can be opened yet.', `<pre class="logline mono small">${esc(JSON.stringify(C.header))}\n${esc(JSON.stringify(H.header))}</pre>`],
          ['Some year later', 'A quantum computer runs Shor’s algorithm on the recorded X25519 public keys (simulated here by handing the attacker the X25519 private key, which is exactly what Shor outputs).', ''],
          ['Result', 'The attacker tries to open both backups with what the quantum computer gave them.', box('Classical X25519', !C.quantum_attacker_opens, C.quantum_attacker_opens ? '<span class="t-leak">Opened. All three purpose keys are exposed, so every token made with them can be reversed.</span>' : 'Stayed closed.') + box('X25519 + ML-KEM-768', !H.quantum_attacker_opens, H.quantum_attacker_opens ? '<span class="t-leak">Opened.</span>' : 'Stayed closed. The ML-KEM half is not broken by any known quantum attack, so the key is still unknown.') + `<p class="small muted">The real owner opened both: classical ${C.owner_opens ? '✓' : '✗'}, hybrid ${H.owner_opens ? '✓' : '✗'}.</p>`],
        ];
        for (const [when, txt, extra] of steps) { s.insertAdjacentHTML('beforeend', `<div class="pq-step"><span class="eyebrow">${when}</span><p>${txt}</p>${extra}</div>`); A.sound.tick(); await U.sleep(U.reduced() ? 0 : 900); }
        H.quantum_attacker_opens ? A.sound.error() : A.sound.chime(); b.disabled = false;
      };
      const mosca = async () => { const v = (k) => +$('#pq-' + k, root).value; ['shelf', 'migration', 'crqc'].forEach((k) => ($('#pq-' + k + '-v', root).textContent = v(k))); try { const m = await A.api(`/pqc/mosca?shelf=${v('shelf')}&migration=${v('migration')}&crqc=${v('crqc')}`); $('#pq-mosca', root).innerHTML = m.exposed_years > 0 ? U.verdict(false, `Exposed for <b>${m.exposed_years} years</b>: data recorded today can be read while it still matters. Start the migration now.`) : U.verdict(true, `Safe by ${-m.exposed_years} years, if the migration starts now.`); } catch (e) { err($('#pq-mosca', root), e); } };
      ['shelf', 'migration', 'crqc'].forEach((k) => ($('#pq-' + k, root).oninput = mosca)); mosca();
      (async () => { try { const r = await A.api('/pqc/receipt'); $('#pq-rc', root).innerHTML = r.receipt ? `<table class="tbl dense"><tbody><tr><td>Customer, purpose</td><td class="mono">${esc(r.receipt.customer)} · ${esc(r.receipt.purpose)}</td></tr><tr><td>Algorithm</td><td class="mono">${esc(r.receipt.alg)}</td></tr><tr><td>Ed25519 signature</td><td class="num mono">${r.receipt.ed25519_sig_bytes} B</td></tr><tr><td>ML-DSA-65 signature</td><td class="num mono">${U.fmt(r.receipt.ml_dsa_sig_bytes)} B</td></tr><tr><td>ML-DSA-65 public key</td><td class="num mono">${U.fmt(r.receipt.ml_dsa_pub_bytes)} B</td></tr></tbody></table>${U.verdict(r.verify.valid, r.verify.valid ? 'Both signatures verify and the receipt is in the Merkle log.' : 'Receipt did not verify.')}` : `<p class="muted">No erasure yet. <a href="#me">Erase a customer’s data</a> and come back to see its receipt.</p>`; } catch (e) { err($('#pq-rc', root), e); } })();
      (async () => { try { const c = await A.api('/pqc/cbom'); $('#pq-cbom', root).innerHTML = c.components.map((x) => `<tr><td>${esc(x.name)}</td><td class="mono small">${esc(x.primitive || '')}</td><td>${/^safe$/.test(x.quantum) ? U.pill('safe', 'ok') : /PQ half/.test(x.quantum) ? U.pill(esc(x.quantum), 'ok') : U.pill(esc(x.quantum || ''), '')}</td><td class="mono small">${x.where.slice(0, 2).map(esc).join('<br>')}${x.where.length > 2 ? ` +${x.where.length - 2}` : ''}</td></tr>`).join(''); } catch (e) { err($('#pq-cbom', root), e); } })();
    },
  };

  /* ============================================================ the customer's own view */
  const PURPOSE_TXT = { KYC: 'Identity checks (KYC)', Loans: 'Loans', Service: 'Customer service', Marketing: 'Marketing' };
  P.me = {
    eyebrow: 'MY DATA · THE CUSTOMER’S VIEW', title: 'Where did my data go?', lede: 'India’s DPDP Act gives every customer the right to know what is done with their data and to have it erased. This is what that could look like in a bank app, running on the live vault.',
    view: () => `<div class="me-wrap"><label class="field">View as<select id="me-c"></select></label><div class="phone-frame"><div class="phone-screen" id="me-s">${U.skeleton(400)}</div></div></div>`,
    mount(root) {
      const sel = $('#me-c', root); let cur = null, msg = '';
      sel.innerHTML = A.customers.map((x) => `<option value="${x.ref}">${x.ref} ${esc(x.name)}</option>`).join('');
      const draw = () => {
        const c = cur, by = {}; c.tokens.forEach((t) => { (by[t.sink] = by[t.sink] || { purpose: t.purpose, n: 0, types: new Set() }).n++; by[t.sink].types.add(A.TYPE[t.type] || t.type); });
        $('#me-s', root).innerHTML = `<div class="me-head"><span class="small muted">Hello</span><h3>${esc(c.name)}</h3><div class="mono small muted">Aadhaar ${esc(c.masked.AADHAAR)} · Card ${esc(c.masked.CARD.slice(-9))}</div></div>
          <span class="label">Systems holding my data (as tokens)</span>${Object.keys(by).length ? Object.entries(by).map(([s, v]) => `<div class="me-row"><b>${esc(A.sinkLabel(s))}</b><span class="small muted">${[...v.types].join(', ')} · for ${PURPOSE_TXT[v.purpose] || v.purpose} · ${v.n} token${v.n > 1 ? 's' : ''}</span></div>`).join('') : '<p class="small muted">No system holds your data yet. Send a request on Live traffic first.</p>'}
          <span class="label" style="margin-top:16px;display:block">My consent, by purpose</span>${c.keys.map((k) => `<div class="me-row between"><span><b>${PURPOSE_TXT[k.purpose]}</b><br><span class="small muted">${k.alive ? `${k.tokens} tokens readable by the bank` : 'Erased · every copy unreadable'}</span></span>${k.alive ? (k.locked_until ? `<span class="pill" title="Kept by law until ${new Date(k.locked_until * 1000).getFullYear()}">🔒 kept by law</span>` : `<button class="btn danger sm" data-erase="${k.purpose}">Erase</button>`) : `<button class="btn ghost sm" data-rc="${k.purpose}">Receipt</button>`}</div>`).join('')}<div id="me-msg">${msg}</div>`;
        $$('[data-erase]', root).forEach((b) => (b.onclick = async () => { const p = b.dataset.erase; if (!(await U.confirm({ title: `Erase my data for ${PURPOSE_TXT[p]}?`, body: 'The key for this purpose is destroyed. Every token made with it, in every system, can never be read again.', confirmLabel: 'Erase' }))) return; try { const r = await A.erase(cur.ref, p); A.sound.blast && A.sound.blast(); await check(r); await load(); } catch (e) { msg = U.note('err', esc(e.message)); draw(); } }));
        $$('[data-rc]', root).forEach((b) => (b.onclick = async () => { const k = cur.keys.find((x) => x.purpose === b.dataset.rc); if (k && k.receipt) { await check(k.receipt); draw(); } }));
      };
      const check = async (rc) => { const [srv, mine] = await Promise.all([A.verify(rc).catch(() => null), A.browserInclusion(rc).catch(() => null)]); msg = `<div class="me-receipt">${U.verdict(srv && srv.valid, `Receipt for ${PURPOSE_TXT[rc.event.purpose] || rc.event.purpose}: ${srv && srv.valid ? 'signed by the bank (Ed25519 + ML-DSA-65)' : 'signature check failed'}`)}${U.verdict(mine && mine.ok, `${mine && mine.ok ? 'This phone re-checked' : 'Could not re-check'} that the erasure is in the public log (${rc.tree_size} entries).`)}</div>`; };
      const load = async () => { try { cur = await A.customer(sel.value); draw(); } catch (e) { $('#me-s', root).innerHTML = U.note('err', esc(e.message)); } };
      sel.onchange = () => { msg = ''; load(); }; load();
    },
  };
})(window.ARAN);
