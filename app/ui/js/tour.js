/* Page 1: Guided tour (13 chapters). Spec section 5.
   Each chapter = { name, title, tag, view(i) -> html, mount(root) -> cleanup, hood }.
   Every scene replays a real server response (A.* in data.js calls /api); the
   `data-api` attribute on each scene names the endpoint that feeds it. */
window.ARAN = window.ARAN || {};
(function (A) {
  const U = A.ui, H = A.helpers, $ = U.$, $$ = U.$$;
  const T = (A.tour = {});

  /* ---- shared bits ------------------------------------------------------- */
  const skeletonThen = (root, sel, ms, fn) => { const box = $(sel, root); const skel = U.html(U.skeleton(220)); box.hidden = true; box.before(skel); const t = setTimeout(() => { skel.remove(); box.hidden = false; fn && fn(); }, U.reduced() ? 0 : ms); return () => clearTimeout(t); };
  const live = (root, btn, label, fn) => { const b = $(btn, root); const orig = b.innerHTML; b.onclick = async () => { b.classList.add('busy'); b.innerHTML = '<span>' + label + '</span>'; b.disabled = true; try { await fn(); } catch (e) { U.toast(e.message); } b.classList.remove('busy'); b.innerHTML = orig; b.disabled = false; }; };
  /* run an async server call; show its error inside `box` instead of failing silently */
  const guard = async (box, fn) => { try { box && (box.innerHTML = ''); return await fn(); } catch (e) { if (box) box.innerHTML = U.note('err', U.esc(e.message)); else U.toast(e.message); A.sound.error(); return null; } };

  /* ======================================================== 1 Start */
  const SINK_LIST = A.SINKS.map((s) => [s.name, s.label.replace(' (AI gateway)', '')]);
  const PW = 900, SRC_Y = (i) => 28 + i * 52, SNK_Y = (j) => 40 + j * 58;
  function pipelineSVG() {
    const lanesIn = A.SOURCES.map((s, i) => `<path class="lane in" data-s="${s[0]}" d="M170,${SRC_Y(i) + 17} C300,${SRC_Y(i) + 17} 330,210 400,210"/>`).join('');
    const lanesOut = SINK_LIST.map((s, j) => `<path class="lane out" data-k="${s[0]}" d="M500,210 C570,210 600,${SNK_Y(j) + 17} 730,${SNK_Y(j) + 17}"/>`).join('');
    const src = A.SOURCES.map((s, i) => `<g class="node" data-s="${s[0]}" transform="translate(20 ${SRC_Y(i)})"><rect width="150" height="34"/><text x="14" y="21">${s[1]}</text></g>`).join('');
    const snk = SINK_LIST.map((s, j) => `<g class="node sink" data-k="${s[0]}" transform="translate(730 ${SNK_Y(j)})"><rect width="150" height="34"/><text x="14" y="21">${s[1]}</text><g class="badge" transform="translate(136 0)" opacity="0"><circle r="10"/><text y="3.5">0</text></g></g>`).join('');
    return `<svg class="pipe" viewBox="0 0 ${PW} 420" role="img" aria-label="Requests flow from bank systems through Aran to the systems that store them."><text class="cap" x="20" y="14">Bank systems send</text><text class="cap" x="880" y="14" text-anchor="end">Systems that store it</text>${lanesIn}${lanesOut}${src}${snk}<g transform="translate(450 214)"><circle class="ring" r="70"/><circle class="ring" r="86" stroke-dasharray="3 6"/></g><path class="shield-sh" d="M450 160 L492 176 V212 C492 240 474 258 450 268 C426 258 408 240 408 212 V176 Z"/><text class="shield-t" x="450" y="212">ARAN</text><text class="shield-s" x="450" y="232">அரண்</text><g class="scanchip" transform="translate(450 288)" opacity="0">${U.svgChip('scan', 'checking…', 90)}</g><g id="packets"></g></svg>`;
  }
  function mountPipeline(root) {
    const svg = $('.pipe', root), packets = $('#packets', svg), counts = {}; let total = 0, prot = 0, streamTimer = null, streaming = false, n = 0;
    const lane = (sel) => $(sel, svg);
    function follow(path, g, dur, done) {
      const len = path.getTotalLength(), o = { p: 0 };
      gsap.to(o, { p: 1, duration: dur, ease: 'power2.inOut', onUpdate() { const pt = path.getPointAtLength(len * o.p); g.setAttribute('transform', `translate(${pt.x} ${pt.y})`); }, onComplete: done });
    }
    function send(ev) {
      const types = [...new Set(ev.findings.map((f) => A.TYPE[f.type]))].slice(0, 3);
      const rawLabel = types.length ? types.join(' · ') : 'no secrets', tokLabel = ev.findings.length ? ev.findings.filter((f) => f.protected).length + ' tokens' : 'passed clean';
      const sIn = lane(`.lane.in[data-s="${ev.source}"]`) || $$('.lane.in', svg)[0], sOut = lane(`.lane.out[data-k="${ev.sink}"]`) || $$('.lane.out', svg)[3];
      const nodeS = $(`.node[data-s="${ev.source}"]`, svg), nodeK = $(`.node.sink[data-k="${ev.sink}"]`, svg);
      const g = U.html(`<svg><g>${U.svgChip(ev.findings.length ? 'raw' : 'clean', rawLabel, Math.max(76, rawLabel.length * 7 + 20))}</g></svg>`).firstElementChild; packets.appendChild(g);
      if (U.reduced()) { done(); return; }
      nodeS && nodeS.classList.add('on'); sIn.classList.add('on');
      follow(sIn, g, 1.1, () => {
        $('.scanchip', svg).setAttribute('opacity', 1); $$('.ring', svg).forEach((r) => { r.classList.remove('pulse'); void r.getBoundingClientRect(); r.classList.add('pulse'); }); A.sound.tick(1100);
        g.innerHTML = U.svgChip(ev.findings.length ? 'tok' : 'clean', tokLabel, 84);
        setTimeout(() => { $('.scanchip', svg).setAttribute('opacity', 0); sOut.classList.add('on'); nodeK && nodeK.classList.add('on'); follow(sOut, g, 1.1, () => { g.remove(); done(); sIn.classList.remove('on'); sOut.classList.remove('on'); nodeS && nodeS.classList.remove('on'); setTimeout(() => nodeK && nodeK.classList.remove('on'), 700); }); }, 450);
      });
      function done() {
        counts[ev.sink] = (counts[ev.sink] || 0) + 1; total++; prot += ev.findings.filter((f) => f.protected).length;
        const b = $('.badge', nodeK); b.setAttribute('opacity', 1); $('text', b).textContent = counts[ev.sink]; $('#pipe-count', root).textContent = `${total} requests · ${prot} values protected`;
        if (U.reduced()) { $('.badge', nodeK).setAttribute('opacity', 1); }
      }
    }
    function showBA(ev) { $('#ba', root).innerHTML = `<div class="ba"><div><h4 class="raw">Sent by ${ev.source}</h4>${U.marked(ev.before, ev.findings)}</div><div class="arrow">→</div><div><h4 class="tok">Stored by ${ev.sink} · ${ev.latency_ms} ms</h4>${U.tokenText(ev.after, ev.findings)}</div></div>`; }
    const clean = () => A.process('GET /health 200 12ms upstream=core-banking', 'core-banking', 'log-platform');
    const nextEv = () => { n++; return n % 5 === 0 ? clean() : A.packet(); };
    let alive = true;
    const fire = async (p) => { const ev = await guard($('#ba', root), () => p || nextEv()); if (!ev || !alive) return; send(ev); showBA(ev); A.sound.click(); A.refresh('stats', 'events'); };
    $('#send-one', root).onclick = () => fire();
    const st = $('#stream', root);
    const setStream = (on) => { streaming = on; st.innerHTML = '<span>' + (on ? '❚❚ Stop the stream' : '▶ Stream requests') + '</span>'; clearInterval(streamTimer); if (on) { let k = 0; fire(); streamTimer = setInterval(() => { if (++k >= 14) return setStream(false); fire(); }, 2600); } };
    st.onclick = () => setStream(!streaming);
    $('#own-send', root).onclick = () => { const t = $('#own-text', root).value.trim(); if (!t) return; fire(A.process(t, 'console', $('#own-sink', root).value)); };
    $('#own-text', root).oninput = (e) => ($('#own-send', root).disabled = !e.target.value.trim());
    const first = setTimeout(() => fire(A.packet('callnote')), 900);
    return () => { alive = false; clearTimeout(first); clearInterval(streamTimer); gsap.killTweensOf('*'); };
  }

  /* ======================================================== 2 Problem */
  T.BREACHES = [
    ['2016', '3.2 M debit cards', 'Malware at a payment processor', 'Leaks start at partners'], ['2019', 'SBI SMS logs', 'Server logs left open, balances visible', 'Log files leak'],
    ['2020', '35 M masked cards', 'Juspay records sold months later', 'First sign is a dump outside'], ['2023', 'Code in ChatGPT', 'Samsung staff pasted secrets into AI', 'AI is a new exit'],
    ['2024', '31 M Star Health', 'Records sold through Telegram bots', '“Who leaked it?”'],
  ];

  /* ======================================================== chapters */
  const hoodTxt = {
    3: 'Lines from Loghub (16 systems). On all 32,000 lines (E1): OTP pattern 67,481 false alarms vs 6 for Aran; cards 6,086 vs 81; Aadhaar 366 vs 4. Code: <code>research/experiment.py</code>.',
    5: 'Theorem 1 (perfect separability): every real identifier passes Verhoeff or Luhn; no Aran token does. The body is encrypted with NIST SP 800-38G FF1 (format-preserving AES, ten Feistel rounds, tweak = the receiving system’s name); the check digit is the correct one plus a keyed offset from 1 to 9. Customers enrolled in DPDP scope get random vault tokens instead. Tested on 20,000 tokens: 0 taken for real (E2). Code: <code>research/aran_core.py</code>, <code>app/server/engine.py</code>.',
    6: 'Evidence is fused per type by a logistic stacker and calibrated with isotonic regression, so 90% is right about 9 times in 10 (calibration error 0.015, E7). Names: CRF model, F1 0.85 English, 0.76 Hindi, 0.69 Hinglish (E5). The bank’s own customers and recently sent OTPs are matched through HMAC entries in a cuckoo filter. Code: <code>research/ai/</code>, <code>research/firewall/registry.py</code>.',
    7: 'The normaliser keeps a map from cleaned text back to original characters, so the token is written back in the same disguise. It also repairs one-digit typos against the customer registry. Measured: hidden identifiers removed 8.3% before, 100% after (E10); typo’d identifiers 0% before, 99.2% after (E12). Code: <code>research/firewall/normalise.py</code>.',
    8: 'Theorem 2: each system’s tokens come from a different pseudorandom permutation, so two systems sharing a token is negligible and the most likely source of a dump is the system whose tokens it holds. Measured (E3): 100% correct across 40 systems, even from a single token.',
    9: 'Each (customer, purpose) has its own AES-256-GCM key; vault tokens store only ciphertext. Erasure drops the key, appends KEY_DESTROYED to an RFC 6962 Merkle log, and signs the event, root and proof with Ed25519 and ML-DSA-65 together. Your browser re-runs the inclusion proof with WebCrypto. KYC is retention-locked for 5 years (PMLA). Whether key destruction counts as DPDP erasure still needs legal confirmation.',
    10: 'Negative selection with variable-radius detectors (V-detector) over 7 features per (source, sink, 30-second window). Each feature is scaled so the range seen while learning sits between 0.1 and 0.7: the green band on the radar. Measured on six exfiltration scenarios (E8): 100% caught at 0.6% false alarms, vs 90% for static rules and 20% for Isolation Forest.',
    11: 'Same value, same placeholder within a conversation, so the model can still reason. The reply is scanned again; placeholders resolve only for the caller’s own conversation and role, and every resolution is appended to a hash-chained audit log. Without <code>ARAN_LLM_URL</code> the provider is an echo stand-in.',
  };

  T.chapters = [
    /* ---------------------------------------------------------------- 0 */
    { name: 'Start', title: 'A firewall for data', tag: 'Aran swaps customer numbers for safe tokens before any system stores them. Watch real requests flow through it.', hero: true,
      view: () => `<section class="scene" data-api="POST /api/tour/packet → event; POST /api/process"><div class="scene-scroll">${pipelineSVG()}</div>
        <div class="legend"><span><i class="sw" style="background:var(--real-data-color)"></i>Real customer data</span><span><i class="sw" style="background:var(--token-color)"></i>Aran tokens</span><span><i class="sw" style="background:var(--clean-color)"></i>Nothing sensitive</span><span style="margin-left:auto" class="mono" id="pipe-count">0 requests · 0 values protected</span></div>
        <div class="ctl"><button class="btn" id="send-one"><span>Send a real request</span><span class="arr">→</span></button><button class="btn secondary" id="stream"><span>▶ Stream requests</span></button></div>
        <div class="row"><label class="field grow">Or type your own message<input class="mono" id="own-text" placeholder="e.g. my card is 4111 1111 1111 1111, OTP 482913"></label><label class="field">To<select id="own-sink">${A.SINKS.map((s) => `<option value="${s.name}" ${s.name === 'llm-gateway' ? 'selected' : ''}>to ${s.label}</option>`).join('')}</select></label><button class="btn secondary" id="own-send" disabled>Send</button></div>
        <div id="ba"></div></section>
        <div class="pillars"><div class="pillar" data-reveal><span class="ic">🔍</span><b>Find</b><span class="muted">even hidden or misspelt values</span></div><div class="pillar" data-reveal><span class="ic">🛡</span><b>Protect</b><span class="muted">tokens that can never pass as real</span></div><div class="pillar" data-reveal><span class="ic">🧾</span><b>Prove</b><span class="muted">trace leaks, erase with a receipt</span></div></div>
        <button class="btn" data-go-next><span>Start the tour</span><span class="arr">→</span></button>`,
      mount: (root) => mountPipeline(root) },

    /* ---------------------------------------------------------------- 1 */
    { name: 'The problem', title: 'Leaks come through side doors', tag: 'Not the main database: logs, vendors, tickets and AI chatbots.',
      view: () => `<div class="grid g3">${U.stat('average cost of one breach, Indian finance', '', 'IBM, 2026', { tone: 'danger', count: 40.9, fmt: 'dec1', unit: ' cr' }).replace('class="v">', 'class="v">₹')}${U.stat('maximum DPDP Act penalty', '', 'DPDP Act, 2023', { tone: 'danger', count: 250, unit: ' cr' }).replace('class="v">', 'class="v">₹')}${U.stat('masked card records sold from one firm', '', 'Juspay, 2020', { tone: 'danger', count: 35, unit: ' M' })}</div>
        <div class="tl" id="tl"><div class="line">${T.BREACHES.map((b, k) => `<button data-k="${k}" class="${k === 4 ? 'on' : ''}" style="animation-delay:${k * 120}ms"><span>${b[0]}</span><b>${b[1]}</b></button>`).join('')}</div><div class="tlcard" id="tlcard"></div></div>
        <div class="qs">${["Where is each customer's data now?", 'Which copies are protected?', 'Who leaked this file?', 'Can we prove erasure?'].map((q, k) => `<div class="q" style="animation-delay:${k * 150}ms"><i>?</i><span>${q}</span></div>`).join('')}</div>
        <p class="lede" style="color:var(--text-color)">Banks cannot answer these four today. Aran answers all four.</p>`,
      hood: 'Problem analysis, threat model and sources: <code>docs/research/aran-research.md</code> sections 1 and 3.2.',
      mount(root) { U.runCounts(root); const show = (k) => { $$('#tl button', root).forEach((b) => b.classList.toggle('on', +b.dataset.k === k)); const b = T.BREACHES[k]; $('#tlcard', root).innerHTML = `<span>${b[2]}</span>${U.pill(b[3], 'danger')}`; }; show(4); $$('#tl button', root).forEach((b) => (b.onclick = () => show(+b.dataset.k))); } },

    /* ---------------------------------------------------------------- 2 */
    { name: 'Simple filters fail', title: 'Why simple search fails', tag: 'Every red square is a harmless number a plain filter would block. These are 300 real production log lines with no customer data at all.',
      view: () => `<div id="fa-wrap" data-api="POST /api/tour/false-alarms"><div class="grids" id="fa"></div></div><div class="ctl"><button class="btn secondary" id="fa-new"><span>↻ 300 new lines</span></button></div><div id="fa-ex"></div>`,
      mount(root) {
        const draw = async () => { const r = await A.falseAlarms(); const cell = (v, k, mode) => `<span class="${v ? 'hit' : ''}" style="--a:${Math.min(1, 0.45 + v * 0.2)};animation-delay:${k * 5}ms"></span>`;
          $('#fa', root).innerHTML = `<div class="card gc danger plus"><div class="between"><span class="label">Plain pattern search</span></div><div class="n" id="fa-n1">0</div><div class="muted small">false alarms in ${r.lines} real log lines</div><div class="cellgrid">${r.cells.map((c, k) => cell(c[0], k)).join('')}</div></div><div class="card gc calm plus"><div class="between"><span class="label">Aran</span></div><div class="n" id="fa-n2">0</div><div class="muted small">false alarms in the same lines</div><div class="cellgrid">${r.cells.map((c, k) => cell(c[1], k)).join('')}</div></div>`;
          U.countUp($('#fa-n1', root), r.naive_total, { ms: 1.6 }); U.countUp($('#fa-n2', root), r.aran_total, { ms: 1.6 });
          $('#fa-ex', root).innerHTML = U.hood(`<div class="scroll"><table class="tbl dense"><thead><tr><th>Real log line</th><th>Plain pattern saw</th><th>Aran</th></tr></thead><tbody>${r.examples.map((e) => `<tr><td class="mono">${U.esc(e.line)}</td><td class="t-leak">${U.esc(e.naive.join(', '))}</td><td>${e.aran.length ? e.aran.join(', ') : 'nothing'}</td></tr>`).join('')}</tbody></table></div><p style="margin-top:12px">${hoodTxt[3]}</p>`); };
        const c = skeletonThen(root, '#fa-wrap', 0, () => guard($('#fa', root), draw)); live(root, '#fa-new', 'Scanning…', draw); return c; } },

    /* ---------------------------------------------------------------- 3 */
    { name: 'Check digits', title: 'The last digit is a lock', tag: 'Every Aadhaar and card ends in a check digit computed from the others. Real numbers always pass. Watch the maths.',
      view: () => `<div class="row"><label class="field grow">Number to check<input class="mono" id="cs-in" inputmode="numeric" placeholder="12-digit Aadhaar or 16-digit card"></label><button class="btn secondary" id="cs-check">Check</button><button class="btn secondary" id="cs-aad">New Aadhaar</button><button class="btn secondary" id="cs-card">New card</button></div><div class="row hidden" id="cs-tweak" style="margin-top:-4px"><button class="btn ghost sm" id="cs-typo">✎ Mistype one digit</button><button class="btn ghost sm" id="cs-swap">⇄ Swap two neighbours</button></div><div id="cs-err"></div><section class="scene" id="cs-scene" data-api="POST /api/tour/checksum · GET /api/tour/generate"></section>`,
      mount(root) {
        const inp = $('#cs-in', root); let st = null;
        const run = async (v) => {
          if (st) st.destroy(); const sc = $('#cs-scene', root); $('#cs-err', root).innerHTML = '';
          let r; try { r = await A.checksum(v); } catch (e) { sc.innerHTML = ''; $('#cs-err', root).innerHTML = U.note('err', U.esc(e.message)); return; }
          const clean = r.digits; $('#cs-tweak', root).classList.toggle('hidden', !(clean.length === 12 || clean.length === 16));
          const isV = r.kind.startsWith('Aadhaar'), n = r.steps.length;
          sc.innerHTML = `<div class="digits" id="cs-d"></div><div class="calc" id="cs-calc"></div><div id="cs-verdict"></div>${U.controls('Run the check')}`;
          const draw = (i) => {
            const done = i;  // steps are processed from the last digit to the first
            $('#cs-d', sc).innerHTML = [...clean].map((c, k) => { const stepIdx = n - 1 - k; const isDone = stepIdx < done, isNow = done > 0 && stepIdx === done - 1; const s = r.steps[stepIdx]; const under = isDone ? (isV ? `<i>${s.after}</i>` : `<i>${s.doubled ? '×2' : ''}${s.value}</i>`) : ''; return `<div class="dg ${isDone ? 'done' : ''} ${isNow ? 'now' : ''} ${k === n - 1 ? 'chk' : ''}"><span>${c}</span>${!isV && isDone && s.doubled ? '<em>×2</em>' : ''}${under}</div>`; }).join('');
            const cur = r.steps[Math.min(done, n) - 1]; const calc = $('#cs-calc', sc);
            if (isV) { const val = cur ? cur.after : 0; calc.innerHTML = `<svg class="dial" viewBox="-85 -85 170 170" role="img" aria-label="Verhoeff dial"><polygon class="pent" points="0,-38 36,-12 22,31 -22,31 -36,-12"/>${Array.from({ length: 10 }, (_, k) => { const a = (k * 36 - 90) * Math.PI / 180; return `<g class="dn ${k === 0 ? 'zero' : ''} ${k === val && cur ? 'on' : ''}" transform="translate(${(Math.cos(a) * 68).toFixed(1)} ${(Math.sin(a) * 68).toFixed(1)})"><circle r="11"/><text y="3">${k}</text></g>`; }).join('')}<line class="needle" x1="0" y1="0" x2="0" y2="-52" style="transform:rotate(${val * 36}deg)"/></svg><div class="grow"><div class="mono" style="font-size:1.1rem">${cur ? `digit at position ${cur.position}` : 'Press play to run the Verhoeff check from the last digit'}</div>${cur ? `<div class="muted" style="margin-top:8px">${cur.digit} shuffled to ${cur.permuted}</div><div style="margin-top:4px">${cur.before} combined → <b class="t-accent">${cur.after}</b></div>` : ''}</div>`; }
            else { const tot = cur ? cur.total : 0, mx = Math.max(90, Math.ceil(r.total / 10) * 10); calc.innerHTML = `<div class="sumbar"><div class="f" style="width:${(tot / mx) * 100}%"></div>${Array.from({ length: mx / 10 + 1 }, (_, k) => `<span class="tk" style="left:${((k * 10) / mx) * 100}%">${k * 10}</span>`).join('')}</div><div class="grow mono">${cur ? `${cur.digit}${cur.doubled ? ' ×2 → ' + cur.value : ''} running total <b class="t-accent">${cur.total}</b>` : 'Press play to run the Luhn check from the last digit'}</div>`; }
            $('#cs-verdict', sc).innerHTML = i >= n ? (r.valid ? U.verdict(true, `Ends at ${isV ? '0' : r.total + ' (a multiple of 10)'}: <b>could be a real number</b>`) : U.verdict(false, `Ends at ${isV ? r.final : r.total}: <b>cannot be real</b> · the last digit should be ${r.correct_check_digit}`)) : '';
          };
          st = U.stepper(sc, n + 1, 520, (i) => draw(Math.min(i, n)), { label: 'Run the check' });
        };
        const set = (v) => { inp.value = v; run(v); };
        const gen = async (k) => { const g = await guard($('#cs-err', root), A.generate); if (g) set(k === 'card' ? g.card : g.aadhaar); };
        $('#cs-check', root).onclick = () => run(inp.value); $('#cs-aad', root).onclick = () => gen('aad'); $('#cs-card', root).onclick = () => gen('card');
        inp.oninput = () => (inp.value = inp.value.replace(/[^0-9 ]/g, ''));
        $('#cs-typo', root).onclick = () => { const c = inp.value.replace(/\D/g, ''); set(c.slice(0, 4) + ((+c[4] + 3) % 10) + c.slice(5)); };
        $('#cs-swap', root).onclick = () => { const c = inp.value.replace(/\D/g, ''); set(c.slice(0, 2) + c[3] + c[2] + c.slice(4)); };
        gen('aad'); return () => st && st.destroy(); },
      hood: 'Verhoeff works in the dihedral group D5 (symmetries of a pentagon, 10 elements, the dial above). Each digit is shuffled by a position-dependent permutation, then combined with the running value through the group table. Valid numbers end at 0. It catches every single-digit typo and every swap of neighbours. Luhn doubles every second digit from the right (subtracting 9 if over 9) and adds everything; valid totals are multiples of 10. Code: <code>research/aran_core.py</code>.' },

    /* ---------------------------------------------------------------- 4 */
    { name: 'Building a token', title: 'Building a token', tag: 'Same length, same look, but the last digit is wrong on purpose, so no scanner can ever mistake it for a real number.',
      view: () => `<div class="chips" id="tk-sinks">${[['log-platform', 'Log platform'], ['crm-notes', 'CRM notes'], ['loan-vendor', 'Loan vendor'], ['marketing-cloud', 'Marketing']].map(([k, l], i) => U.chip('for ' + l, { btn: true, on: i === 0, attrs: `data-k="${k}"` })).join('')}</div><section class="scene" id="tk-scene" data-api="POST /api/tour/build-token"></section><div class="row"><button class="btn ghost" id="tk-new">↻ Another Aadhaar</button></div><p class="muted small">Pick another system: the same Aadhaar becomes a different token for each one. That is what makes leaks traceable (chapter 8).</p>`,
      hood: hoodTxt[5],
      mount(root) {
        let sink = 'log-platform', r = null, st = null;
        const cells = (arr, cls) => `<div class="cells">${arr.map(([c, k]) => `<span class="${k || ''} ${cls || ''}">${c}</span>`).join('')}</div>`;
        function build() {
          if (st) st.destroy(); const sc = $('#tk-scene', root);
          sc.innerHTML = `<div id="tk-f"></div>${U.controls('Build the token')}`;
          const body = [...r.body], enc = [...r.encrypted];
          st = U.stepper(sc, 15, 700, (f) => {
            let html = '', cap = '';
            const real = body.map((c) => [c, '']).concat([[r.check, 'chk good']]);
            if (f === 0) { html = cells(real); cap = 'A real (generated) Aadhaar: the last digit passes Verhoeff'; }
            else if (f === 1) { html = cells(body.map((c) => [c, '']).concat([['·', 'chk off']])); cap = 'Keep the first 11 digits; set the check digit aside'; }
            else if (f <= 11) { const k = f - 2, ro = r.rounds[k], d = (ro.left + ro.right).split(''); html = cells(d.map((c, i) => [c, (i < 5 ? 'a' : 'b') + ' roll']).concat([['·', 'chk off']])); cap = `Encryption round ${k + 1} of 10: one half is mixed with an AES fingerprint of the other, then they swap`; html += `<div class="mono t-accent" style="text-align:center;margin-top:12px;font-size:.8125rem">AES → ${ro.aes}… tweak “${sink}”</div><div class="rounds">${Array.from({ length: 10 }, (_, i) => `<i class="${i < k ? 'done' : i === k ? 'now' : ''}"></i>`).join('')}</div>`; }
            else if (f === 12) { html = cells(enc.map((c) => [c, '']).concat([[r.right_check, 'chk ghostc']])); cap = `The correct check digit for the new digits would be ${r.right_check}`; }
            else if (f === 13) { const bad = r.token.slice(-1); html = cells(enc.map((c) => [c, '']).concat([[bad, 'chk bad']])); cap = `Add this system’s secret offset (+${r.offset}): ${r.right_check} + ${r.offset} → ${bad}`; }
            else { html = cells([...r.token].map((c, i) => [c, i === 11 ? 'tk chk bad' : 'tk'])); cap = 'The token: same length, same look, guaranteed to fail Verhoeff'; html += `<div class="cmpbox"><div class="cmprow"><span class="lbl">Real</span><span class="mono">${r.aadhaar}</span>${U.pill('✓ passes', 'ok')}</div><div class="cmprow"><span class="lbl">Token</span><span class="mono t-token">${r.token}</span>${U.pill('✗ fails', 'danger')}</div>${r.matches ? `<div class="small t-ok">✓ The live firewall issued exactly this token when the Aadhaar was sent to ${sink}</div>` : `<div class="small t-leak">The live firewall issued ${U.esc(r.firewall_token || '–')} for this Aadhaar</div>`}</div>`; }
            $('#tk-f', sc).innerHTML = html + `<div class="forgecap">${cap}</div>`;
          }, { label: 'Build the token' });
        }
        $$('#tk-sinks .chip', root).forEach((b) => (b.onclick = () => { sink = b.dataset.k; $$('#tk-sinks .chip', root).forEach((x) => x.classList.toggle('on', x === b)); load(r && r.aadhaar); }));
        const load = async (aad) => { const x = await guard(null, () => A.buildToken(sink, aad)); if (x) { r = x; build(); } };
        $('#tk-new', root).onclick = () => load(); load(); return () => st && st.destroy(); } },

    /* ---------------------------------------------------------------- 5 */
    { name: 'Finding data', title: 'Finding what is sensitive', tag: 'Names, phones, OTPs and UPI IDs have no check digit. Aran weighs clues and gives each value a measured probability.',
      view: () => `<div class="chips" id="dt-kinds">${[['callnote', 'Hinglish call note'], ['loan', 'Loan application'], ['chatbot', 'Chatbot prompt'], ['payment', 'UPI payment log'], ['otp', 'OTP log'], ['kyc', 'KYC record']].map(([k, l]) => U.chip(l, { btn: true, on: k === 'callnote', attrs: `data-k="${k}"` })).join('')}</div><section class="scene" id="dt-scene" data-api="POST /api/sample"></section>`,
      hood: hoodTxt[6],
      mount(root) {
        let ev, pick = 0; const sc = $('#dt-scene', root);
        const draw = () => {
          if (!ev.findings.length) { sc.innerHTML = U.note('info', 'Nothing sensitive found in this request.'); return; }
          const f = ev.findings[pick], thr = (A.SINKS.find((s) => s.name === ev.sink) || {}).threshold || 0.5;
          const clue = Object.entries(f.evidence).map(([k, v], i) => { const val = Math.max(0, Math.min(1, Math.abs(v) > 1 ? 1 / (1 + Math.exp(-v)) : v)); return `<div class="clue ${A.AGAINST.has(k) ? 'against' : ''}" style="animation-delay:${i * 90}ms"><span class="lab">${A.EVIDENCE[k] || k}</span><div class="cb"><i style="width:${Math.max(4, val * 100)}%;animation-delay:${i * 90}ms"></i></div></div>`; }).join('') + (f.registry ? `<div class="clue"><span class="lab">bank’s own customer list</span><b class="t-ok">✓ match</b></div>` : '');
          sc.innerHTML = `<div class="scan">${U.marked(ev.before, ev.findings, pick)}</div><div class="small muted">Tap any highlighted value.</div><div class="chips">${ev.findings.map((x, i) => U.chip(`${A.TYPE[x.type]} ${U.pct(x.p)}`, { btn: true, on: i === pick, attrs: `data-i="${i}"` })).join('')}</div><div class="clues"><div>${U.gauge(f.p, thr)}<div class="caption muted" style="text-align:center;margin-top:8px">replaced at or above the mark</div></div><div><div class="mono small" style="margin-bottom:12px"><b>${A.TYPE[f.type]}</b> · ${U.esc(ev.before.slice(f.start, f.end))}</div>${clue}</div></div><div class="ba"><div></div><div></div><div><h4 class="tok">What was stored · ${ev.latency_ms} ms</h4>${U.tokenText(ev.after, ev.findings)}</div></div>`;
          $$('mark[data-i], .chip[data-i]', sc).forEach((m) => (m.onclick = () => { pick = +m.dataset.i; draw(); }));
        };
        const load = async (k) => { const x = await guard(sc, () => A.sample(k, 'customer')); if (x) { ev = x; pick = 0; draw(); A.refresh('stats', 'events'); } };
        $$('#dt-kinds .chip', root).forEach((b) => (b.onclick = () => { $$('#dt-kinds .chip', root).forEach((x) => x.classList.toggle('on', x === b)); load(b.dataset.k); }));
        return skeletonThen(root, '#dt-scene', 0, () => load('callnote')); } },

    /* ---------------------------------------------------------------- 6 */
    { name: 'Disguises', title: 'Disguises do not work', tag: 'One Aadhaar hidden 12 ways, each sent through the live firewall. Aran undoes the disguise, then checks.',
      view: () => `<section class="scene" data-api="POST /api/tour/evasion"><div class="between" style="margin-bottom:16px"><div class="mono" style="font-size:clamp(1.5rem,3vw,2.5rem);letter-spacing:-.06em"><span id="ev-n">0</span>/12 <span class="muted" style="font-size:.5em;letter-spacing:0">disguises caught</span></div></div><div class="evgrid" id="ev-grid"></div>${U.controls('Unmask them')}</section><div class="row"><button class="btn secondary" id="ev-new">↻ Another customer</button></div>`,
      hood: hoodTxt[7],
      mount(root) { let st = null, r; const build = async () => { const x = await guard($('#ev-grid', root), A.evasion); if (!x) return; if (st) st.destroy(); r = x; st = U.stepper($('.scene', root), 13, 330, (i) => { $('#ev-n', root).textContent = Math.min(i, 12); $('#ev-grid', root).innerHTML = r.rows.map((row, k) => `<div class="evc ${k < i ? 'caught' : ''}"><div class="tt">${row.trick}</div><div class="in">${U.esc(row.before.slice(0, 64))}</div>${k < i ? `<div class="out">${U.esc(row.after.slice(0, 64))}</div><span class="bd">✓</span>` : ''}</div>`).join(''); }, { label: 'Unmask them' }); }; $('#ev-new', root).onclick = build; build(); return () => st && st.destroy(); } },

    /* ---------------------------------------------------------------- 7 */
    { name: 'Tracing a leak', title: 'A leaked file names its source', tag: 'Each system received a different token for the same customer. Leak one and watch Aran trace it back.',
      view: () => `<section class="scene"><div class="scene-scroll" id="tm" data-api="POST /api/tour/tokens → POST /api/trace"></div><div class="ctl" id="tm-btns"></div><div id="tm-v"></div></section><div class="row"><button class="btn ghost" id="tm-new">↻ Another customer</button></div>`,
      hood: hoodTxt[8],
      mount(root) {
        let t; const timers = [];
        const svg = () => `<svg class="tmap" viewBox="0 0 860 340" role="img" aria-label="A customer’s four tokens, one per system, and a leaked file traced back to its source."><g class="nd cust" transform="translate(10 120)"><rect width="190" height="100"/><text x="14" y="26">${t.name}</text><text class="sm" x="14" y="46">${t.customer} · real Aadhaar</text><text x="14" y="76" class="mono" style="font:400 13px var(--font-mono);fill:var(--real-data-color)">${H.group(t.aadhaar, 4)}</text></g>${t.sinks.map((s, i) => `<path class="lane" d="M200,170 C300,170 330,${55 + i * 76} 400,${55 + i * 76}"/><g class="nd" data-k="${s.sink}" transform="translate(400 ${i * 76 + 20})"><rect width="250" height="62"/><text x="14" y="22">${A.sinkLabel(s.sink)}</text><text class="tk" x="14" y="46">${s.aadhaar_token}</text></g>`).join('')}<path class="lane" id="to-dark" d="M650,170 C700,170 700,170 730,170"/><g class="nd dark" id="dark" transform="translate(730 120)"><rect width="120" height="100"/><text x="14" y="42">Dark web</text><text class="sm" x="14" y="62">leaked file</text></g><path class="beam" id="beam" d="" opacity="0"/><g id="doc" opacity="0"><rect x="-10" y="-13" width="20" height="26" rx="2" fill="var(--surface-color)" stroke="var(--leak-color)" stroke-width="2"/></g></svg>`;
        const build = async () => { timers.forEach(clearTimeout); const x = await guard($('#tm-v', root), A.tokens); if (!x) return; t = x; $('#tm', root).innerHTML = svg(); $('#tm-v', root).innerHTML = ''; $('#tm-btns', root).innerHTML = t.sinks.map((s) => `<button class="btn secondary sm" data-k="${s.sink}">Leak ${A.sinkLabel(s.sink)}</button>`).join(''); $$('#tm-btns button', root).forEach((b) => (b.onclick = () => leak(b.dataset.k))); };
        function leak(k) {
          timers.forEach(clearTimeout); const s = $('#tm', root); $$('.nd', s).forEach((n) => n.classList.remove('leaked', 'found', 'on')); $('#beam', s).setAttribute('opacity', 0); $('#tm-v', root).innerHTML = '';
          const node = $(`.nd[data-k="${k}"]`, s), idx = t.sinks.findIndex((x) => x.sink === k), y = 51 + idx * 76; node.classList.add('leaked'); A.sound.whoosh(0.6);
          const res = A.trace(t.sinks[idx].after); // the leaked file is exactly what that sink stored
          const doc = $('#doc', s), ox = 650, oy = y, o = { p: 0 }; doc.setAttribute('opacity', 1);
          if (U.reduced()) { doc.setAttribute('opacity', 0); $('#dark', s).classList.add('on'); finish(); return; }
          gsap.to(o, { p: 1, duration: 1.1, ease: 'power2.inOut', onUpdate() { doc.setAttribute('transform', `translate(${ox + (790 - ox) * o.p} ${oy + (170 - oy) * o.p})`); }, onComplete() { doc.setAttribute('opacity', 0); $('#dark', s).classList.add('on'); } });
          timers.push(setTimeout(() => { const b = $('#beam', s); b.setAttribute('d', `M790,220 C790,320 520,330 ${525},${y + 32}`); b.setAttribute('opacity', 1); A.sound.tick(900); }, 1700));
          timers.push(setTimeout(finish, 2900));
          async function finish() {
            const r = await guard($('#tm-v', root), () => res); if (!r) return; const top = r.top && r.top.sink, ok = top === k;
            node.classList.remove('leaked'); if (ok) node.classList.add('found'); else { const f = top && $(`.nd[data-k="${top}"]`, s); f && f.classList.add('found'); }
            ok ? A.sound.chime() : A.sound.error();
            $('#tm-v', root).innerHTML = U.verdict(ok, ok ? `From the leaked text alone, Aran named <b>${A.sinkLabel(k)}</b> (${r.matched} matching token${r.matched === 1 ? '' : 's'})` : `Aran named <b>${top ? A.sinkLabel(top) : 'no system'}</b>`);
          }
        }
        $('#tm-new', root).onclick = build; build(); return () => timers.forEach(clearTimeout); } },

    /* ---------------------------------------------------------------- 8 */
    { name: 'Erasure', title: 'Erase everywhere, with proof', tag: 'Each customer’s tokens are locked by their own key per purpose. Destroy the key and every copy, anywhere, becomes meaningless.',
      view: () => `<section class="scene" data-api="POST /api/customers · /tour/customer-loan · /detokenise · /erase · /receipts/verify"><div class="estages" id="er-st"></div><div class="vault"><div class="vbox" id="er-c"></div><div class="keys" id="er-k"></div><div class="vbox" id="er-v"></div></div><div class="ctl"><button class="btn" id="er-1">1. Enrol a customer</button><button class="btn secondary" id="er-2" disabled>2. Send their loan application</button><button class="btn danger" id="er-3" disabled>3. Erase Loans</button><button class="btn secondary" id="er-kyc" disabled>Try erasing KYC</button></div><div id="er-msg"></div><div id="er-rc"></div></section>`,
      hood: hoodTxt[9],
      mount(root) {
        let c = null, tok = null, stage = 0, erased = false, readBack = null, kycUntil = null; const KEYS = ['KYC', 'Loans', 'Service', 'Marketing'];
        const msg = $('#er-msg', root), busy = (on) => $$('.ctl button', root).forEach((b) => (b.dataset.busy = on ? '1' : '', b.classList.toggle('busy', on)));
        const draw = (shake) => {
          $('#er-st', root).innerHTML = ['1. Enrol', '2. Send a loan', '3. Erase Loans'].map((s, i) => `<span class="${i < stage ? 'done' : i === stage ? 'now' : ''}">${s}</span>`).join('');
          $('#er-c', root).innerHTML = c ? `<b>${U.esc(c.name)}</b><span class="mono small">${c.ref}</span><span class="mono small muted">Aadhaar ${c.masked.AADHAAR}</span>` : '<span class="muted">No customer yet</span>';
          $('#er-k', root).innerHTML = KEYS.map((k) => { const key = c && c.keys.find((x) => x.purpose === k); const cls = !c ? 'ghost' : key && !key.alive ? 'gone' : key && key.locked_until ? 'locked' : 'alive'; return `<div class="keybox ${cls} ${shake && k === 'KYC' ? 'shake' : ''}">${U.keyIcon(cls === 'gone' ? 'gone' : 'k')}<b>${k}</b><span class="caption">${!c ? '' : cls === 'gone' ? 'destroyed' : cls === 'locked' ? 'locked 5 yrs' : 'alive'}</span>${cls === 'locked' ? '<span class="lock">🔒</span>' : ''}</div>`; }).join('');
          $('#er-v', root).innerHTML = `<span class="label">Loan vendor’s database</span><div class="vtok ${!tok ? 'empty' : erased ? 'dead' : ''}">${tok || 'empty'}</div>${tok && readBack ? (readBack.status === 'ok' ? `<span class="small t-ok mono">Bank reads it: ${U.esc(readBack.value)}</span>` : `<span class="small t-leak">Bank reads it: unreadable, ${U.esc(readBack.reason || 'key destroyed')}</span>`) : ''}`;
          $('#er-2', root).disabled = !(c && !tok); $('#er-3', root).disabled = !(tok && !erased); $('#er-kyc', root).disabled = !c; $('#er-1', root).textContent = c ? 'Enrol another' : '1. Enrol a customer';
        };
        const step = async (fn) => { busy(true); await guard(msg, fn); busy(false); draw(); };
        $('#er-1', root).onclick = () => step(async () => { const n = await A.addCustomer(); c = await A.customer(n.ref); tok = null; readBack = null; erased = false; stage = 1; $('#er-rc', root).innerHTML = ''; A.sound.click(); A.refresh('customers', 'merkle'); });
        $('#er-2', root).onclick = () => step(async () => { const ev = await A.customerLoan(c.ref); const f = ev.findings.find((x) => x.type === 'AADHAAR' && x.token); if (!f) throw new Error('the loan application carried no Aadhaar token'); tok = f.token; readBack = await A.detokenise(tok); stage = 2; A.sound.tick(1200); });
        $('#er-kyc', root).onclick = async () => { try { await A.erase(c.ref, 'KYC'); msg.innerHTML = U.note('err', 'KYC key was erased (no retention lock on this server).'); } catch (e) { draw(true); A.sound.error(); msg.innerHTML = U.note('err', '🔒 Refused: ' + U.esc(e.message) + ' (PMLA, 5 years).'); } };
        $('#er-3', root).onclick = () => step(async () => {
          const rc = await A.erase(c.ref, 'Loans'); erased = true; stage = 3; c = await A.customer(c.ref); readBack = await A.detokenise(tok); A.sound.shatter(); A.refresh('customers', 'merkle', 'stats');
          const [v, bi] = await Promise.all([A.verify(rc), A.browserInclusion(rc).catch(() => ({ chain: [], ok: null }))]);
          const chain = bi.chain.map((h, i) => ({ l: i === 0 ? 'erasure' : i === bi.chain.length - 1 ? 'root' : 'level ' + i, h }));
          $('#er-rc', root).innerHTML = `<div class="card receipt plus" style="margin-top:16px"><div class="between"><h3>Signed erasure receipt</h3><span class="mono small muted">entry ${rc.leaf_index + 1} of ${rc.tree_size}</span></div><p class="small">${rc.event.tokens_unreadable} token${rc.event.tokens_unreadable === 1 ? '' : 's'} made unreadable everywhere.</p><div class="mchain">${chain.map((x) => `<div class="mh"><span>${x.l}</span>${x.h.slice(0, 10)}</div>`).join('')}</div><p class="small muted">Your browser re-checks the receipt itself: ${Math.max(0, chain.length - 1)} hashes from this erasure up to the log’s signed root (SHA-256 via WebCrypto).</p><div class="chips" id="er-chips"></div></div>`;
          const mh = $$('.mh', root); mh.forEach((m, i) => setTimeout(() => m.classList.add('on'), U.reduced() ? 0 : 380 * (i + 1)));
          const tampered = JSON.parse(JSON.stringify(rc)); tampered.event.tokens_unreadable += 1; const tv = await A.verify(tampered).catch(() => ({ valid: false }));
          setTimeout(() => { const ch = $('#er-chips', root); if (ch) ch.innerHTML = U.chip(bi.ok ? '✓ in the log (checked in your browser)' : bi.ok === null ? 'browser check unavailable' : '✗ not in the log', { cls: bi.ok ? 'ok' : 'danger' }) + U.chip(v.signature_valid ? (v.post_quantum_valid ? '✓ Ed25519 + ML-DSA-65 signatures valid' : '✓ Ed25519 signature valid') : '✗ signature invalid', { cls: v.signature_valid ? 'ok' : 'danger' }) + U.chip(!tv.valid ? '✓ an edited copy of the receipt fails the check' : '✗ an edited copy still passed', { cls: !tv.valid ? 'ok' : 'danger' }); }, U.reduced() ? 0 : 380 * (mh.length + 1));
        });
        draw(); return () => {}; } },

    /* ---------------------------------------------------------------- 9 */
    { name: 'Immune system', title: 'An immune system for data flows', tag: 'It learns what normal traffic looks like, then flags anything outside it, with no list of known attacks.',
      view: () => `<section class="scene" id="im" data-api="GET /api/tour/immune-radar (poll 2 s) · POST /api/immune/learn · POST /api/drills/{kind}"></section><div id="im-alerts"></div><a class="btn secondary" href="#immune"><span>Open the full immune console</span><span class="arr">→</span></a>`,
      hood: hoodTxt[10],
      mount(root) { return A.mountImmune(root, 'im', 'im-alerts'); } },

    /* ---------------------------------------------------------------- 10 */
    { name: 'AI chatbots', title: 'Safe AI chatbots', tag: 'Staff can ask an AI about a customer. The AI only ever sees placeholders, and each role sees only what it is allowed to.',
      view: () => `<div class="chips" id="gw-roles">${[['customer-care', 'Customer care'], ['kyc-officer', 'KYC officer'], ['analyst', 'Analyst']].map(([k, l], i) => U.chip(l, { btn: true, on: i === 0, attrs: `data-k="${k}"` })).join('')}</div><label class="field">Prompt<textarea id="gw-t" class="mono" rows="3"></textarea></label><div class="row"><button class="btn" id="gw-ask"><span>Ask the AI through Aran</span><span class="arr">→</span></button><button class="btn secondary" id="gw-cmp">Compare all three roles</button></div><section class="scene hidden" id="gw-scene" data-api="POST /api/tour/gateway"></section><div id="gw-cmpbox"></div>`,
      hood: hoodTxt[11],
      mount(root) {
        let role = 'customer-care', st = null;
        A.generate().then((g) => { const t = $('#gw-t', root); if (t && !t.value) t.value = `Customer Meena Iyer, mobile 9${H.digits(9)}, says card ${H.group(g.card, 4)} was charged twice. Her Aadhaar is ${H.group(g.aadhaar, 4)}. Draft a polite reply.`; }).catch(() => {});
        const seen = (r) => { const s = (r.audit_last && r.audit_last.shown) || {}; const e = Object.entries(s); return e.length ? e.map(([k, n]) => `${A.TYPE[k] || k} ${n}`).join(', ') : 'nothing (all masked)'; };
        $$('#gw-roles .chip', root).forEach((b) => (b.onclick = () => { role = b.dataset.k; $$('#gw-roles .chip', root).forEach((x) => x.classList.toggle('on', x === b)); }));
        $('#gw-ask', root).onclick = async () => {
          const sc = $('#gw-scene', root), r = await guard($('#gw-cmpbox', root), () => A.gateway(role, $('#gw-t', root).value)); if (!r) return; sc.classList.remove('hidden'); $('#gw-cmpbox', root).innerHTML = ''; if (st) st.destroy();
          const ph = (s) => U.esc(s).replace(/(&lt;[A-Z]+_\d+&gt;)/g, '<mark class="m-token">$1</mark>');
          sc.innerHTML = `<div class="stack" style="display:flex;flex-direction:column;gap:12px"><div class="bub staff" id="b0"><div class="who">Staff (${role.replace('-', ' ')})</div>${U.esc($('#gw-t', root).value)}</div><div class="gwshield" id="b1s">ARAN · ${r.findings_in_prompt} values replaced · ${r.ms.tokenise} ms</div><div class="bub prov" id="b1"><div class="who">What the AI provider saw</div>${ph(r.provider_saw[0].content)}</div><div class="bub prov" id="b2"><div class="who">AI reply (${r.provider})</div>${ph(r.provider_reply)}</div><div class="bub staff final" id="b3"><div class="who">What the staff member sees</div>${U.esc(r.reply)}<div class="caption muted" style="margin-top:8px">shown ${seen(r)} · masked ${r.audit_last ? r.audit_last.masked : 0} · audit chain ${r.audit_ok === false ? '✗ broken' : '✓ intact'}</div></div></div>${U.controls('Replay')}`;
          st = U.stepper(sc, 4, 900, (i) => { ['b0', 'b1', 'b2', 'b3'].forEach((id, k) => $('#' + id, sc).classList.toggle('show', k <= i)); $('#b1s', sc).classList.toggle('show', i >= 1); }, { label: 'Replay' }); };
        $('#gw-cmp', root).onclick = async () => { const roles = ['customer-care', 'kyc-officer', 'analyst'], rs = await guard($('#gw-cmpbox', root), () => Promise.all(roles.map((rl) => A.gateway(rl, $('#gw-t', root).value)))); if (!rs) return; $('#gw-scene', root).classList.add('hidden'); $('#gw-cmpbox', root).innerHTML = `<div class="grid g3" style="margin-top:16px">${roles.map((rl, i) => { const r = rs[i]; return `<div class="card plus" style="animation:pop .3s both"><span class="label">${rl.replace('-', ' ')} sees</span><p class="small">${U.esc(r.reply)}</p></div>`; }).join('')}</div>`; };
        return () => st && st.destroy(); } },

    /* ---------------------------------------------------------------- 11 */
    { name: 'Evidence', title: 'The evidence', tag: 'Read live from the result files the experiments wrote. Anyone can re-run them.',
      view: () => { const R = A.results; if (!R || !R.core || !R.ai) return U.note('info', 'No result files on this server yet. Run the experiments (see Results) to fill this chapter.'); return `<div class="grid g3" data-api="GET /api/results">${U.stat('tokens mistaken for real', `${R.core.e2.token_flagged} <span class="muted" style="font-size:.5em">/ 20,000</span>`)}${U.stat('leaks traced to the right one of ' + R.core.e3.sinks + ' systems', '', '', { count: R.core.e3.dump_1_accuracy * 100, fmt: 'pct' })}${U.stat('data-flow attacks caught', '', '', { count: R.ai.e8.ais.tpr * 100, fmt: 'pct' })}</div>
        ${[['OTP false alarms on real logs', R.core.e1.otp_regex, R.core.e1.otp_context, 'fewer is better'], ['Sensitive values removed (%)', Math.round(R.ai.e9.prototype_regex_recall * 100), Math.round(R.ai.e9.leak_recall * 100), 'more is better']].map(([t, a, b, n]) => { const m = Math.max(a, b); return `<div class="vs"><div class="between"><b>${t}</b><span class="small muted">${n}</span></div><div class="vsrow"><span>Simple rules</span><div class="vsbar bad"><i style="width:${(a / m) * 100}%"></i></div><span class="mono">${U.fmt(a)}</span></div><div class="vsrow"><span>Aran</span><div class="vsbar good"><i style="width:${Math.max(0.5, (b / m) * 100)}%"></i></div><span class="mono">${U.fmt(b)}</span></div></div>`; }).join('')}
        <a class="btn secondary" href="#results"><span>All results and live test runs</span><span class="arr">→</span></a>
        <div class="sechead" style="margin-top:48px"><h3>Not finished yet</h3></div><div class="limits">${[['Names and addresses', '74% and 90% caught'], ['Speed', '~300 lines/s per core; Rust core planned'], ['Erasure in law', 'needs a lawyer’s confirmation'], ['Keys', 'in memory here; an HSM in a bank']].map(([a, b]) => `<div class="lim"><b>${a}</b><span class="small muted">${b}</span></div>`).join('')}</div>
        <div class="chips" style="margin-top:24px">${['DPDP Act 2023 and Rules 2025', 'CERT-In 2022', 'UIDAI Data Vault', 'RBI tokenisation', 'RBI FREE-AI', 'PCI DSS', 'PMLA retention'].map((x) => U.chip(x)).join('')}</div>`; },
      mount(root) { U.runCounts(root); } },

    /* ---------------------------------------------------------------- 12 */
    { name: 'Glossary', title: 'Glossary and team', tag: '', last: true,
      view: () => `<div class="gloss">${[['Token', 'A safe stand-in for a sensitive value.'], ['Check digit', 'Last digit of an Aadhaar or card, computed from the others.'], ['Verhoeff / Luhn', 'The check-digit methods for Aadhaar and cards.'], ['Sink', 'Any system that receives data: logs, CRM, vendor, AI chatbot.'], ['False alarm', 'Flagging something harmless as sensitive.'], ['Calibrated probability', '90% means right about 9 times in 10.'], ['Normaliser', 'Undoes disguises before checking.'], ['Crypto-shredding', 'Erasing by destroying the key, not every copy.'], ['Merkle log', 'An append-only record whose fingerprint changes if edited.'], ['Immune layer', 'Learns normal data flows and flags the rest.'], ['DPDP Act', 'India’s Digital Personal Data Protection Act, 2023.']].map(([t, d]) => `<div class="gl" data-reveal><b>${t}</b><span class="small muted">${d}</span></div>`).join('')}</div>
        <div class="sechead" style="margin-top:56px"><h3>Built at KARE by Team Iravora Void</h3></div><div class="team">${U.member('IS', 'Inbathamizhan S', 'Team lead · Cybersecurity')}${U.member('AA', 'Aasif Ahmed A', 'Cybersecurity')}${U.member('SA', 'SN Arun Vijay', 'AI/ML')}${U.member('BM', 'Bharadhwaj M', 'AI/ML')}</div>
        <p class="small muted" style="margin-top:32px">Team Iravora Void · Banking, Financial Services and FinTech · Prevent Sensitive Data Leakage · github.com/itzz-inbathamizhans/aran</p>` },
  ];

  /* ---- tour frame: dots, header, body, under the hood, bottom nav -------- */
  T.render = (i) => {
    const C = T.chapters[i];
    const dots = `<nav class="dots" aria-label="Chapters">${T.chapters.map((c, n) => `<button class="dotb rollhost ${n === i ? 'cur' : n < i || T.seen.has(n) ? 'seen' : ''}" data-n="${n}" aria-label="${n + 1}. ${c.name}" ${n === i ? 'aria-current="step"' : ''}><span class="n">${String(n + 1).padStart(2, '0')}</span><span class="t">${c.name}</span></button>`).join('')}</nav><select class="chap-select" aria-label="Chapter">${T.chapters.map((c, n) => `<option value="${n}" ${n === i ? 'selected' : ''}>${n + 1}. ${c.name}</option>`).join('')}</select>`;
    const prev = i > 0 ? T.chapters[i - 1].name : null, next = i < T.chapters.length - 1 ? T.chapters[i + 1].name : null;
    const nav = `<div class="tournav"><button class="btn secondary" data-n="${i - 1}" ${i === 0 ? 'disabled' : ''}>← ${prev || 'Back'}</button><span class="caption muted">← → keys work too</span>${next ? `<button class="btn" data-n="${i + 1}"><span>${next}</span><span class="arr">→</span></button>` : `<a class="btn" href="#traffic"><span>Open the full console</span><span class="arr">→</span></a>`}</div>`;
    const hero = C.hero ? `<section class="hero" id="hero"><canvas aria-hidden="true"></canvas><div class="hero-meta"><span>Aran அரண் · data-flow firewall</span><span>Team Iravora Void · KARE · Banking &amp; FinTech</span></div><div class="hero-copy"><div class="eyebrow">Data-flow firewall for Indian banks</div><h1 id="hero-h">A firewall for data</h1><p class="lede">${C.tag}</p></div><div class="hero-hint"><span>Hold to blast</span><span>Dare <b>⚡</b> to touch the lines</span></div><div class="charge" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="tr" cx="50" cy="50" r="44"/><circle class="fl" cx="50" cy="50" r="44"/></svg></div><div class="scrollcue"><span>Scroll</span><i></i></div></section>` : '';
    const head = C.hero ? '' : `<header class="chead"><div class="eyebrow">Chapter ${String(i + 1).padStart(2, '0')} / 13</div><h1 data-split>${C.title}</h1>${C.tag ? `<p class="tag">${C.tag}</p>` : ''}</header>`;
    const body = `${head}<article class="chapter">${C.view(i)}</article>${C.hood ? U.hood(C.hood) : ''}`;
    return `${hero}<div class="page ${C.hero ? 'tourpage' : ''}">${dots}${body}${nav}</div>`;
  };
  T.seen = new Set();
})(window.ARAN);
