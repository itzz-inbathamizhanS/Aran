/* Design review boards (spec section 15 checklist):
   #components : every component C1 to C33 in every state
   #states     : whole-app states (starting, load failed, 503) and per-page empty/error states */
window.ARAN = window.ARAN || {};
(function (A) {
  const U = A.ui, H = A.helpers, $ = U.$;
  const sec = (t, body, note) => `<div class="cb-board"><h3>${t}</h3><div class="card plus">${body}${note ? `<p class="caption muted" style="margin-top:12px">${note}</p>` : ''}</div></div>`;
  const row = (...x) => `<div class="row" style="align-items:center">${x.join('')}</div>`;
  const ev = A.process('customer Meena Iyer card 4111111111111111 otp 482913', 'console', 'log-platform');

  A.pages.components = {
    eyebrow: 'DESIGN BOARD', title: 'Components, every state', lede: 'C1 to C33 from the spec. Toggle the theme in the top bar to review both.',
    view() {
      const a = H.mkAadhaar();
      return [
        sec('C1 Button', row('<button class="btn"><span>Primary</span><span class="arr">→</span></button>', '<button class="btn secondary">Secondary</button>', '<button class="btn ghost">Ghost</button>', '<button class="btn danger">Danger</button>', '<button class="btn" disabled>Disabled</button>', '<button class="btn busy"><span>Scanning…</span></button>'), 'States: default, hover (invert), focus (ring), pressed (scale .97), disabled, busy.'),
        sec('C2 Card, C3 Stat tile', `<div class="grid g4">${U.stat('Default', '1,284', 'a note')}${U.stat('Danger tone', '3', 'open alerts', { tone: 'danger' })}${U.stat('No data', '–', 'no requests yet')}${U.stat('Loading', '', '', { loading: true })}</div>`),
        sec('C4 Eyebrow, C5 Pill, C6 Chip', row('<span class="eyebrow" style="margin:0">Eyebrow</span>', U.pill('alive', 'ok'), U.pill('destroyed', 'danger'), U.pill('learning', 'warn'), U.pill('neutral'), U.chip('static'), U.chip('selectable', { btn: true }), U.chip('selected', { btn: true, on: true }), U.chip('✓ ok result', { cls: 'ok' }), U.chip('✗ bad result', { cls: 'bad' }), U.chip('4829 3301 7745', { cls: 'mono' }))),
        sec('C7 Tabs, C8 Segmented radio', `<div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true">On</button><button class="tab" role="tab" aria-selected="false">Off</button><button class="tab" role="tab" aria-selected="false">Focus me</button></div><div class="seg"><label><input type="radio" name="b1" checked><span>Selected</span></label><label><input type="radio" name="b1"><span>Unselected</span></label></div>`),
        sec('C9 Fields', `<div class="row"><label class="field">Default<input placeholder="Placeholder"></label><label class="field">Focused (click)<input value="Type here"></label><label class="field">Disabled<input disabled value="Disabled"></label><label class="field">Error<input class="invalid" value="bad value"></label><label class="field">Mono<input class="mono" value="4111 1111 1111 1111"></label><label class="field">Select<select><option>log-platform (Service)</option></select></label></div><textarea class="mono" rows="3" placeholder="Textarea"></textarea>`),
        sec('C10 Table', `<div class="scroll"><table class="tbl"><thead><tr><th>Header on surface-2</th><th class="num">Numeric</th></tr></thead><tbody><tr class="click"><td>Clickable row (hover)</td><td class="num mono">1,00,000</td></tr><tr><td>Plain row</td><td class="num mono">42</td></tr></tbody></table></div>`),
        sec('C11 to C13 Log line, marked text, token text', `${U.marked(ev.before, ev.findings, 0)}<div style="height:8px"></div>${U.tokenText(ev.after, ev.findings)}`, 'Real value = amber mark, token = teal mark, raw (below threshold) = red mark.'),
        sec('C14 ID strip', `<div class="grid g2">${U.idStrip(a, 'real', 'passes Verhoeff · real (generated customer)')}${U.idStrip(H.tokenFrom(a, 'AADHAAR'), 'token', 'fails Verhoeff · protected Aran token')}</div>`),
        sec('C15 Confidence bar, C16 Gauge, C17 Rank rows', `<div class="grid g3"><div>${U.bar(0.98, 0.5)}<div class="caption muted">confidence 98%, threshold 0.5</div></div><div>${U.gauge(0.87, 0.5)}</div><div>${U.rankRow('loan-vendor', 0.8, '12 · 80%', 0)}${U.rankRow('crm-notes', 0.2, '3 · 20%', 1)}</div></div>`),
        sec('C18 Alert box', `${A.alerts[0] ? `<div class="alert"><div class="between"><b>⚠ employee-desktop → paste-site.example</b><span class="small muted">40s ago · score <span class="mono">4.2</span></span></div><ul><li>a route never seen while learning</li></ul><div class="row"><button class="btn danger sm">Confirm attack</button><button class="btn ghost sm">Mark as normal</button></div></div>` : ''}<div class="alert confirmed"><b>core-banking → log-platform</b><div style="margin-top:8px">${U.pill('confirmed attack (memory cells added)', 'danger')}</div></div><div class="alert normal"><b>mobile-app → crm-notes</b><div style="margin-top:8px">${U.pill('marked normal (detectors removed)', 'ok')}</div></div>`),
        sec('C19 Inline notes, C20 Skeleton, C21 Spinner', `${U.note('ok', 'Receipt verifies.')}${U.note('err', 'sink names are lower-case letters, digits, dots and dashes')}${U.note('info', 'Detokenisation is logged per caller.')}<div class="grid g2" style="margin-top:16px">${U.skeleton(100)}<div style="padding-top:20px"><div class="spinner"></div></div></div>`),
        sec('C22 Disclosure, C25 Verdict banner', `${U.hood('Theory, measured result and code path live here.')}${U.verdict(true, 'Ends at 0: <b>could be a real number</b>')}${U.verdict(false, 'Ends at 7: <b>cannot be real</b>')}`),
        sec('C23 Step controls, C24 Count-up', `${U.controls('Run the check')}<div class="stat" style="margin-top:16px"><div class="v"><span data-count="1284">0</span></div></div>`, 'Reduced motion: final frame immediately, count-ups show the final value.'),
        sec('C26 Receipt card, C27 Merkle chain', `<div class="mchain">${['erasure', 'level 1', 'level 2', 'root'].map((l, i) => `<div class="mh ${i < 3 ? 'on' : ''}"><span>${l}</span>${H.digits(10)}</div>`).join('')}</div>`),
        sec('C28 Key icon', `<div class="keys">${['alive', 'locked', 'gone', 'ghost'].map((s) => `<div class="keybox ${s}">${U.keyIcon(s === 'gone' ? 'gone' : 'k')}<b>${{ alive: 'Loans', locked: 'KYC', gone: 'Loans', ghost: 'Service' }[s]}</b><span class="caption">${{ alive: 'alive', locked: 'locked 5 yrs', gone: 'destroyed', ghost: '' }[s]}</span></div>`).join('')}</div>`),
        sec('C29 Radar chart', `<div style="max-width:420px">${A.radarSVG(A.radarWindows(8, 6))}</div>`),
        sec('C30 Chat bubble', `<div class="bub staff show"><div class="who">Staff</div>Draft a reply for &lt;PER_1&gt;.</div><div class="bub prov show" style="margin-top:8px"><div class="who">Provider</div>Dear <mark class="m-token">&lt;PER_1&gt;</mark>, sorry about the charge.</div>`),
        sec('C31 Confirm dialog, C33 Tooltip, toast', row('<button class="btn danger" id="cb-dlg">Open confirm dialog</button>', '<button class="btn secondary" id="cb-toast">Show toast</button>', '<span class="pill" data-tip="Aadhaar · 98%" tabindex="0">Hover or focus me</span>')),
        sec('C32 Member card', `<div class="team">${U.member('IS', 'Inbathamizhan S', 'Team lead · Cybersecurity')}${U.member('SA', 'SN Arun Vijay', 'AI/ML')}</div>`),
      ].join('');
    },
    mount(root) { U.runCounts(root); $('#cb-dlg', root).onclick = () => U.confirm({ title: 'Destroy C0007’s Loans key?', body: 'Every Loans token for this customer becomes permanently unreadable.', confirmLabel: 'Destroy key' }); $('#cb-toast', root).onclick = () => U.toast('Copied'); return () => {}; },
  };

  A.pages.states = {
    eyebrow: 'DESIGN BOARD', title: 'States, empty and failing', lede: 'Whole-app and per-page states from spec 2.4 and the section 15 checklist. Open the app with <code>?state=starting</code>, <code>?state=failed</code> or <code>?state=offline</code> to see them full screen.',
    view() {
      const start = (t, p, c) => `<div class="card plus" style="text-align:center;padding:48px 24px"><div class="spinner"></div><h3>${t}</h3><p class="${c || 'muted'} small" style="max-width:480px;margin:8px auto 0">${p}</p></div>`;
      return [
        sec('Starting (health.ready = false)', start('Starting Aran', 'Loading the trained detector, NER and context models, and enrolling customers. This takes a few seconds after a cold start.')),
        sec('Load failed (health.error set)', start('Starting Aran', 'Load failed: ModuleNotFoundError("No module named \'sklearn_crfsuite\'")', 't-leak')),
        sec('Endpoint 503', U.note('err', 'Aran is loading its models, try again in a few seconds.')),
        sec('Overview, empty server', `<div class="card plus" style="display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap"><p>No traffic yet on this server. Send a first request to see Aran work.</p><a class="btn" href="#traffic"><span>Send a request</span><span class="arr">→</span></a></div><div class="grid g4" style="margin-top:16px">${U.stat('Requests protected', '0', '25 enrolled customers')}${U.stat('Values tokenised', '0', '0 passed raw')}${U.stat('Added latency p95', '–', 'no requests yet')}${U.stat('Immune alerts', '0', '0 open · mode: idle')}</div>`),
        sec('Live traffic: passed raw and monitor-only', `<div class="between" style="margin-bottom:12px"><span><b>employee-desktop</b> → <b>llm-gateway</b> ${U.pill('monitor-only', 'danger')}</span><span class="mono small muted">2 found · 3.1 ms · 4s ago</span></div><table class="tbl"><thead><tr><th>Type</th><th>Value</th><th>Became</th><th class="num">Confidence</th></tr></thead><tbody><tr><td>Mobile</td><td class="mono">9876543210</td><td>${U.pill('passed raw', 'danger')}</td><td class="num mono">41%</td></tr></tbody></table>`),
        sec('Customers: no selection, KYC refused, detokenise', `<div class="card muted">Pick a customer to see their keys and erase a purpose. Send some bank requests first so they have tokens in the sinks.</div>${U.note('err', '🔒 Refused: KYC records are under a retention lock until 16/10/2031 (PMLA, 5 years).')}${U.note('ok', 'Value: <code>482933107745</code>')}${U.note('err', 'This token’s key was destroyed. The value can never be read again.')}${U.note('err', 'Not a vault token. Vaultless FF1 tokens are reversed only inside the bank’s key boundary.')}`),
        sec('Leak trace', `${U.note('err', 'crm-notes has not received anything yet. Send some traffic to it first.')}<div class="card" style="margin-top:12px"><h3>No Aran tokens found</h3><p class="small muted">0 of 9 candidate values matched a token issued by this server. <b class="t-leak">4 raw identifiers</b> in the dump were never tokenised, so they leaked before Aran or through a bypass.</p></div>`),
        sec('Results: job states, missing file', `<div class="grid g3"><div class="card"><b>Never run</b><p class="small muted">Button: Run now</p></div><div class="card"><b class="t-ok">✓ Passed in 38s</b></div><div class="card"><b class="t-leak">✗ Exit code 1</b></div></div><p class="muted small" style="margin-top:12px">No result file yet. Run the experiment to create it.</p>`),
        sec('Immune: idle, learning, watching', '<p class="small muted">Use the radio switch on the Immune layer page or tour chapter 10 to review each state, and the drill / alert states below it.</p>'),
      ].join('');
    },
    mount: () => () => {},
  };
})(window.ARAN);
