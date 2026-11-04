/* Bank pages: Home (with branch deposits), Send money, Transactions, Fraud desk, Back office.
   Nothing here makes payments up: every row comes from someone using the bank.
   Loaded by index.html after the shared Aran UI kit. No inline handlers (the site CSP is script-src 'self'). */
(function (A) {
  'use strict';
  const K = A.kit, U = A.ui, $ = U.$, $$ = U.$$, esc = K.esc;
  const VIEWS = ['home', 'send', 'txns', 'fraud', 'back', 'kyc'];
  let aran = false, rails = {}, accts = [], cust = '', view = '', booted = false;
  let txLimit = 25, txTotal = 0, openTxn = '', lastPay = null, sendRail = 'UPI', held = {};

  /* ---------------------------------------------------------------- small helpers */
  const inr = (p) => { p = Number(p || 0); const neg = p < 0; p = Math.abs(p); return (neg ? '-' : '') + '₹' + U.fmt(Math.floor(p / 100)) + '.' + String(p % 100).padStart(2, '0'); };
  const toPaise = (s) => { s = String(s).trim().replace(/,/g, ''); if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null; const [r, f = ''] = s.split('.'); return Number(r) * 100 + Number((f + '00').slice(0, 2)); };
  const store = { get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'k-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
  const maskTxt = (s) => String(s == null ? '' : s)
    .replace(/\b[A-Za-z0-9._\-]{2,64}@([A-Za-z][A-Za-z0-9]{1,30})\b/g, 'XXXXXX@$1')
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, (m) => 'XXXXXX' + m.slice(-4))
    .replace(/\d{9,19}/g, (m) => 'X'.repeat(m.length - 4) + m.slice(-4));
  const groupAcct = (n) => String(n || '').replace(/(\d{4})(?=\d)/g, '$1 ');

  /* a stored value drawn with its meaning: token (teal), masked (amber, last 4 only), real identifier (red-orange) */
  const RX = /(&lt;[A-Za-z0-9_:\-]+&gt;)|(X{3,}[A-Za-z0-9@.]*)|([A-Za-z0-9._\-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30})|(\b[A-Z]{5}\d{4}[A-Z]\b)|(\d{9,19})/g;
  const fv = (text) => esc(text == null ? '' : String(text)).replace(RX, (m, tok, mask, vpa, pan) =>
    tok ? `<mark class="m-token">${tok}</mark>` : mask ? `<span class="bk-mask">${mask}</span>` : (vpa || pan) ? `<mark class="m-raw">${m}</mark>` : `<mark class="${aran ? 'm-token' : 'm-raw'}">${m}</mark>`);
  window.ARAN.bankFv = fv;

  const stPill = (s) => { const m = { success: ['ok', 'success'], failed: ['leak', 'failed'], held: ['real', 'held for fraud'], reversed: ['info', 'reversed'] }[s] || ['', s]; return `<span class="pill ${m[0]}">${esc(m[1])}</span>`; };
  const statePill = (s) => ({ raw: '<span class="pill leak">raw</span>', protected: '<span class="pill tok">tokens</span>', guarded: '<span class="pill tok">tokens, guard masked a value</span>',
    masked: '<span class="pill real">masked, waiting in outbox</span>', plain: '<span class="pill">no identifiers</span>' }[s] || `<span class="pill">${esc(s)}</span>`);
  const empty = (msg) => `<p class="muted small" style="padding:8px 0">${msg}</p>`;
  const api = (u, o) => K.api(u, o);
  const toast = (m) => U.toast(m);

  const STEP = {
    initiated: ['Payment created', ''], authorised: ['Balance and limits checked', 'ok'], held: ['Held by the fraud score', 'warn'],
    approved: ['Fraud desk approved', 'ok'], declined: ['Fraud desk declined', 'bad'], success: ['Money moved', 'ok'],
    failed: ['Payment failed', 'bad'], reversed: ['Payment reversed', 'warn'], copies: ['', 'tok'], outbox: ['Outbox retry', 'tok'],
  };
  const stepLabel = (e) => (e.step === 'copies' ? (aran ? 'Copies sent through Aran' : 'Copies written') : (STEP[e.step] || [e.step])[0]);
  const stepClass = (e) => (e.step === 'copies' && /masked/.test(e.detail || '') ? 'warn' : (STEP[e.step] || ['', ''])[1]);
  const stepsHTML = (events, animate) => (events || []).map((e, i) =>
    `<li class="${stepClass(e)} ${animate ? 'in' : ''}" style="${animate ? `animation-delay:${i * 280}ms` : ''}"><b>${esc(stepLabel(e))}</b><span class="t">${esc(e.at)} · ${fv(e.detail || '')}</span></li>`).join('');

  /* ---------------------------------------------------------------- accounts and the customer switch */
  async function loadAccounts() {
    accts = await api('/api/accounts');
    const sel = $('#bk-cust'), keep = cust || store.get('bank-cust-' + (aran ? 'b' : 'a'));
    const live = accts.filter((a) => a.name !== null || aran);
    sel.innerHTML = live.length ? live.map((a) => `<option value="${esc(a.customer_ref)}">${esc(a.customer_ref)}${aran || !a.name ? '' : ' · ' + esc(a.name)}</option>`).join('') : '<option value="">No customers yet</option>';
    cust = live.some((a) => a.customer_ref === keep) ? keep : (live[0] ? live[0].customer_ref : '');
    sel.value = cust;
    return live;
  }
  const mine = () => accts.find((a) => a.customer_ref === cust);

  /* ---------------------------------------------------------------- routing */
  function route(initial) {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
    view = v;
    VIEWS.forEach((n) => { const s = $('#v-' + n); if (s) s.hidden = n !== v; });
    $$('.bk-link').forEach((a) => { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (!initial) { const h = $('#v-' + v + ' h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: false }); } }
    refresh();
  }
  const refresh = () => { const f = { home, send: sendInit, txns: txns, fraud, back }[view]; if (f) f().catch(() => {}); };

  /* ---------------------------------------------------------------- 1 Home */
  async function home() {
    const a = mine();
    if (!a) {
      U.patch($('#home-acct'), '<span class="label">No account yet</span><h3 class="h3" style="margin:8px 0">Open the first account</h3><p class="muted small">This bank only has the customers people open. Sign one up with a test identity and an opening deposit; it appears here at once.</p><a class="btn" href="#kyc"><span>Open an account</span><span class="arr">→</span></a>');
      U.patch($('#home-recent'), empty('No payments yet. Open an account, then press <b>Send money</b>.'));
      try { const st = await api('/api/txn-stats'); U.patch($('#home-stats'), `<div><b>${U.fmt(st.transactions)}</b><span>payments in this bank</span></div><div><b>${U.fmt(st.held)}</b><span>held for fraud</span></div><div><b>${st.ledger.balanced ? '0 ✓' : '≠ 0'}</b><span>ledger debits minus credits</span></div>`); } catch (e) { /* shown on the next refresh */ }
      return;
    }
    const [one, recent, st] = await Promise.all([api('/api/accounts?customer_ref=' + encodeURIComponent(cust)), api('/api/transactions?limit=6&customer_ref=' + encodeURIComponent(cust)), api('/api/txn-stats')]);
    const ac = one[0];
    U.patch($('#home-acct'), `<span class="label">Savings account${aran ? '' : ' · ' + esc(ac.name || '')}</span><div class="bk-money" aria-label="Balance">${inr(ac.balance_paise)}</div>
      <dl class="bk-kv"><dt>Account</dt><dd class="mono">${esc(groupAcct(ac.number))}</dd><dt>IFSC</dt><dd class="mono">${esc(ac.ifsc)}</dd><dt>Customer</dt><dd class="mono">${esc(ac.customer_ref)}</dd></dl>
      ${String(ac.number).startsWith('ERASED') ? '<p class="small muted">This customer’s data was erased, so the account is closed.</p>' : `<form class="kit-inline kit-gap-s" id="dep-form"><label class="field">Pay in at the branch (₹)<input id="dep-amt" class="mono" inputmode="decimal" autocomplete="off" placeholder="e.g. 5000"></label><button class="btn secondary sm" type="submit"><span>Deposit</span></button></form>`}`);
    $('#home-hint').textContent = aran ? 'Every copy of a payment (log line, fraud-desk row, analytics row, SMS) goes through Aran Cloud before it is stored. The money moves first.' : 'Every copy of a payment (log line, fraud-desk row, analytics row, SMS) is written with the real numbers.';
    U.patch($('#home-stats'), `<div><b>${U.fmt(st.transactions)}</b><span>payments in this bank</span></div><div><b>${U.fmt(st.held)}</b><span>held for fraud</span></div><div><b>${st.ledger.balanced ? '0 ✓' : '≠ 0'}</b><span>ledger debits minus credits</span></div>`);
    U.patch($('#home-recent'), recent.items.length ? txTable(recent.items) : empty('No payments yet. Press <b>Send money</b> to make the first one.'));
  }

  /* ---------------------------------------------------------------- 2 Send money */
  const SAMPLE_BANKS = ['okaxis', 'oksbi', 'ybl', 'paytm', 'unionbank'], SAMPLE_NAMES = ['rekha', 'suresh', 'anita', 'farhan', 'divya', 'karthik'];
  const rnd = (n) => Math.floor(Math.random() * n), digits = (n) => Array.from({ length: n }, () => rnd(10)).join('');
  const luhnFill = (p) => { for (let c = 0; c < 10; c++) { const s = p + c; let t = 0, alt = false; for (let i = s.length - 1; i >= 0; i--) { let d = +s[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } t += d; alt = !alt; } if (t % 10 === 0) return s; } return p; };
  const pick = (a) => a[rnd(a.length)];
  const lim = (r) => { const x = rails[r] || {}; return (x.max_paise ? 'Up to ' + inr(x.max_paise) : 'No upper limit') + (x.min_paise > 1 ? ', at least ' + inr(x.min_paise) : ''); };
  const PAYEE = { UPI: '<label class="field">UPI id of the payee<input id="p-payee" class="mono" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="name@bank"></label>',
    CARD: '<label class="field">Card number · 16 digits, Luhn<input id="p-payee" class="mono" required inputmode="numeric" autocomplete="off" placeholder="4111 1111 1111 1111"></label>',
    ACC: '<div class="grid g2"><label class="field">Payee account number<input id="p-payee" class="mono" required inputmode="numeric" autocomplete="off" placeholder="9 to 18 digits"></label><label class="field">Payee IFSC<input id="p-ifsc" class="mono" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="HDFC0001234" maxlength="11"></label></div>' };

  function drawRails() {
    const names = Object.keys(rails).length ? Object.keys(rails) : ['UPI', 'IMPS', 'NEFT', 'RTGS', 'CARD'];
    $('#rails').innerHTML = names.map((r) => `<label><input type="radio" name="rail" value="${r}" ${r === sendRail ? 'checked' : ''}><span>${r}<small>${r === 'UPI' ? '₹1 lakh' : r === 'IMPS' ? '₹5 lakh' : r === 'RTGS' ? 'from ₹2 lakh' : r === 'NEFT' ? 'no limit' : '16-digit card'}</small></span></label>`).join('');
    drawPayee();
  }
  function drawPayee(keep) {
    const old = keep ? { p: ($('#p-payee') || {}).value, i: ($('#p-ifsc') || {}).value } : {};
    $('#payee-block').innerHTML = PAYEE[sendRail === 'UPI' ? 'UPI' : sendRail === 'CARD' ? 'CARD' : 'ACC'];
    if (old.p && $('#p-payee')) $('#p-payee').value = old.p;
    if (old.i && $('#p-ifsc')) $('#p-ifsc').value = old.i;
    const own = (accts.find((x) => x.customer_ref !== cust) || accts[0] || {}).ifsc;
    $('#rail-hint').textContent = lim(sendRail) + '.' + (/IMPS|NEFT|RTGS/.test(sendRail) && own ? ` To pay another customer of this bank, use their account number and IFSC ${own}; the money lands in their account.` : '');
  }
  let sendReady = false;
  async function sendInit() {
    if (!sendReady) {
      sendReady = true; drawRails(); newKey();
      $('#rails').addEventListener('change', (e) => { if (e.target.name === 'rail') { sendRail = e.target.value; drawPayee(true); } });
      $('#pay-sample').addEventListener('click', () => {
        const p = $('#p-payee'); if (!p) return;
        if (sendRail === 'UPI') p.value = pick(SAMPLE_NAMES) + (100 + rnd(900)) + '@' + pick(SAMPLE_BANKS);
        else if (sendRail === 'CARD') p.value = luhnFill('4' + digits(14));
        else { p.value = digits(12); $('#p-ifsc').value = pick(['HDFC0001234', 'SBIN0004321', 'ICIC0000987']); }
        $('#p-amount').value = sendRail === 'RTGS' ? '250000.00' : sendRail === 'UPI' ? '2450.00' : '12500.00';
        $('#p-remarks').value = 'Rent Nov, PAN ' + Array.from({ length: 5 }, () => pick([...'ABCDEFGHJKLMNPRSTUVWXY'])).join('') + digits(4) + pick([...'ABCDEFGHJKLMNPRSTUVWXY']) + ', call ' + pick(['9', '8', '7', '6']) + digits(9);
        newKey();
      });
      $('#pay-form').addEventListener('submit', (e) => { e.preventDefault(); K.busy($('#pay-go'), pay); });
      ['#p-amount', '#p-remarks'].forEach((s) => $(s).addEventListener('input', newKey));
    }
  }
  function newKey() { $('#idem-show').textContent = (lastKey = uuid()); }
  let lastKey = '';

  async function pay() {
    const err = $('#pay-err'); err.innerHTML = '';
    if (!cust) { err.innerHTML = U.note('err', 'Choose a customer first.'); return; }
    const paise = toPaise($('#p-amount').value);
    if (paise === null || paise <= 0) { err.innerHTML = U.note('err', 'Type the amount in rupees, with at most 2 decimals, for example 2450.50.'); $('#p-amount').focus(); return; }
    const body = { customer_ref: cust, rail: sendRail, payee: $('#p-payee').value.trim(), amount_paise: paise, remarks: $('#p-remarks').value.trim(), to_support_chat: $('#p-chat').checked };
    if (sendRail !== 'UPI' && sendRail !== 'CARD') body.ifsc = $('#p-ifsc').value.trim().toUpperCase();
    lastPay = { body, key: lastKey };
    $('#pay-steps').innerHTML = '<li class="idle">Sending…</li>'; $('#pay-after').innerHTML = ''; $('#pay-status').hidden = true;
    let d;
    try { d = await api('/api/transactions', { body, headers: { 'Idempotency-Key': lastKey } }); }
    catch (e) { $('#pay-steps').innerHTML = '<li class="idle">Nothing was sent.</li>'; err.innerHTML = U.note('err', esc(e.message)); return; }
    showPayment(d, true);
    newKey(); loadAccounts().then(() => { if (view === 'home') home(); });
  }
  function showPayment(d, animate) {
    const steps = $('#pay-steps'), fast = U.reduced();
    steps.innerHTML = stepsHTML(d.timeline, animate && !fast);
    const pill = $('#pay-status'); pill.hidden = false; pill.className = 'pill ' + ({ success: 'ok', failed: 'leak', held: 'real' }[d.status] || ''); pill.textContent = d.status === 'held' ? 'held for fraud' : d.status;
    const cs = d.copies_summary || {}, sinks = d.copies || [], bad = sinks.filter((c) => c.state === 'masked').length;
    $('#pay-after').innerHTML = `<dl class="bk-kv kit-gap-s"><dt>Transaction</dt><dd class="mono">${esc(d.txn_id)}</dd><dt>Amount</dt><dd>${inr(d.amount_paise)} via ${esc(d.rail)}</dd>${d.fail_reason ? `<dt>Why it failed</dt><dd>${esc(d.fail_reason)}</dd>` : ''}${d.status === 'held' ? `<dt>Fraud score</dt><dd>${d.risk}: ${esc((d.risk_reasons || []).join(', '))}</dd>` : ''}<dt>Copies</dt><dd>${sinks.length} stored · ${aran ? (bad ? `${bad} masked and waiting in the outbox (Aran did not answer in time)` : 'all through Aran' + (cs.aran_ms != null ? ` in ${cs.aran_ms} ms` : '')) : 'written raw'}</dd></dl>
      <div class="kit-row kit-gap-s"><button class="btn secondary" id="pay-again" type="button"><span>Press send again, same key</span></button><button class="btn ghost" id="pay-view" type="button"><span>Open in Transactions</span></button>${d.status === 'held' ? '<a class="btn ghost" href="#fraud"><span>Go to the fraud desk</span></a>' : ''}</div><div id="pay-replay" role="status" aria-live="polite"></div>`;
    $('#pay-again').addEventListener('click', async (e) => K.busy(e.currentTarget, async () => {
      try { const r = await api('/api/transactions', { body: lastPay.body, headers: { 'Idempotency-Key': lastPay.key } });
        $('#pay-replay').innerHTML = U.note('ok', `Same key, so the bank returned the first result (<span class="mono">${esc(r.txn_id)}</span>, replay: ${r.idempotent_replay}). The money moved once.`);
      } catch (er) { $('#pay-replay').innerHTML = U.note('err', esc(er.message)); }
    }));
    $('#pay-view').addEventListener('click', () => { openTxn = d.txn_id; location.hash = '#txns'; });
    if (d.status === 'held') toast('Held for the fraud desk');
  }

  /* ---------------------------------------------------------------- 3 Transactions */
  const shownPayee = (t) => (aran ? maskTxt(t.payee) : t.payee);
  function txTable(items) {
    return `<table class="tbl dense"><thead><tr><th>Time</th><th>Transaction</th><th>Customer</th><th>Rail</th><th>Payee</th><th class="num">Amount</th><th>Status</th><th class="num">Risk</th></tr></thead><tbody>${items.map((t) =>
      `<tr><td class="mono">${esc(t.created_at.slice(5, 16))}</td><td><button type="button" class="bk-linkbtn" data-txn="${esc(t.txn_id)}" aria-label="Open ${esc(t.txn_id)}">${esc(t.txn_id)}</button></td><td class="mono">${esc(t.customer_ref)}</td><td>${esc(t.rail)}</td><td>${fv(shownPayee(t))}</td><td class="num mono">${inr(t.amount_paise)}</td><td>${stPill(t.status)}</td><td class="num mono">${t.risk || 0}</td></tr>`).join('')}</tbody></table>`;
  }
  const txQuery = () => { const q = new URLSearchParams({ limit: txLimit }); [['f-rail', 'rail'], ['f-status', 'status'], ['f-q', 'q']].forEach(([id, k]) => { const v = $('#' + id).value.trim(); if (v) q.set(k, v); }); if ($('#f-who').value === 'me' && cust) q.set('customer_ref', cust); return q.toString(); };
  let txWired = false;
  async function txns() {
    if (!txWired) {
      txWired = true;
      ['f-rail', 'f-status', 'f-who'].forEach((id) => $('#' + id).addEventListener('change', () => { txLimit = 25; txns(); }));
      $('#f-q').addEventListener('input', () => { txLimit = 25; txns(); });
      $('#tx-filters').addEventListener('submit', (e) => e.preventDefault());
      $('#tx-more').addEventListener('click', () => { txLimit += 25; txns(); });
      $('#tx-table').addEventListener('click', (e) => { const b = e.target.closest('[data-txn]'); if (b) { openTxn = b.dataset.txn; detail(true); } });
    }
    const d = await api('/api/transactions?' + txQuery());
    txTotal = d.total;
    U.patch($('#tx-table'), d.items.length ? txTable(d.items) : empty('No payments match. Change the filters, or make a payment in <b>Send money</b>.'));
    $('#tx-count').textContent = `Showing ${d.items.length} of ${U.fmt(d.total)} payments`;
    $('#tx-more').hidden = d.items.length >= d.total;
    $('#tx-fresh').textContent = 'updated ' + new Date().toLocaleTimeString();
    if (openTxn) detail(false);
  }
  async function detail(focus) {
    const box = $('#tx-detail'); let d;
    try { d = await api('/api/transactions/' + encodeURIComponent(openTxn)); } catch (e) { box.hidden = true; return; }
    const led = d.ledger.length ? `<table class="tbl dense"><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th>Kind</th></tr></thead><tbody>${d.ledger.map((l) => `<tr><td class="mono">${esc(l.account)}</td><td class="num mono">${l.debit_paise ? inr(l.debit_paise) : '–'}</td><td class="num mono">${l.credit_paise ? inr(l.credit_paise) : '–'}</td><td>${esc(l.kind)}</td></tr>`).join('')}</tbody></table>` : empty('No ledger lines: no money has moved.');
    const cps = d.copies.length ? d.copies.map((c) => `<tr><td>${esc(c.label)}</td><td>${statePill(c.state)}</td></tr>`).join('') : '';
    const acts = [d.status === 'success' ? '<button class="btn danger sm" type="button" data-do="reverse"><span>Reverse this payment</span></button>' : '', d.status === 'held' ? '<a class="btn sm" href="#fraud"><span>Open the fraud desk</span></a>' : ''].join('');
    U.patch(box, `<div class="between"><h3 class="h3">${esc(d.txn_id)} ${stPill(d.status)}</h3><button class="btn ghost sm" type="button" data-do="close"><span>Close</span></button></div>
      <div class="bk-cols"><div><dl class="bk-kv"><dt>Customer</dt><dd class="mono">${esc(d.customer_ref)}</dd><dt>Rail</dt><dd>${esc(d.rail)}</dd><dt>Amount</dt><dd class="mono">${inr(d.amount_paise)}</dd><dt>From account</dt><dd class="mono">${fv(d.payer_account)}</dd><dt>To</dt><dd>${fv(d.payee)}${d.payee_ifsc ? ' <span class="mono small muted">' + esc(d.payee_ifsc) + '</span>' : ''}</dd><dt>Remarks</dt><dd>${fv(d.remarks) || '<span class="muted">–</span>'}</dd><dt>Fraud score</dt><dd>${d.risk}${d.risk_reasons.length ? ' · ' + esc(d.risk_reasons.join(', ')) : ''}</dd>${d.fail_reason ? `<dt>Reason</dt><dd>${esc(d.fail_reason)}</dd>` : ''}<dt>Idempotency key</dt><dd class="mono small">${esc(d.idem_key)}</dd></dl>${aran ? '<p class="small muted">Bank B keeps the account master and payee details sealed in the core; the copies hold tokens.</p>' : ''}<div class="kit-row kit-gap-s">${acts}</div></div>
      <div><h4 class="h4">Timeline</h4><ol class="bk-steps">${stepsHTML(d.timeline, false)}</ol></div></div>
      <h4 class="h4 kit-gap-s">Ledger lines</h4><div class="kit-scroll">${led}</div>
      ${cps ? `<h4 class="h4 kit-gap-s">Copies of this payment</h4><div class="kit-scroll"><table class="tbl dense"><thead><tr><th>Where</th><th>Stored as</th></tr></thead><tbody>${cps}</tbody></table></div><p class="small muted">Field by field: <a href="#back">Back office</a>.</p>` : ''}`);
    box.hidden = false;
    if (focus) { box.scrollIntoView({ behavior: U.reduced() ? 'auto' : 'smooth', block: 'start' }); }
  }
  $('#tx-detail').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-do]'); if (!b) return;
    if (b.dataset.do === 'close') { openTxn = ''; $('#tx-detail').hidden = true; $('#tx-detail').__h = ''; return; }
    if (b.dataset.do === 'reverse') {
      if (!(await U.confirm({ title: `Reverse ${esc(openTxn)}?`, body: 'The bank credits the amount back and writes the opposite pair of ledger lines. The original lines stay.', confirmLabel: 'Reverse' }))) return;
      try { await api(`/api/transactions/${encodeURIComponent(openTxn)}/reverse`, { body: { reason: 'reversed from the transactions page' } }); toast('Reversed'); await loadAccounts(); txns(); } catch (er) { toast(er.message); }
    }
  });

  /* ---------------------------------------------------------------- 4 Fraud desk */
  async function fraud() {
    const q = await api('/api/fraud/queue');
    const n = $('#bk-fraud-n'); n.textContent = q.count; n.classList.toggle('hidden', !q.count);
    $('#fraud-hint').textContent = (aran ? 'Bank B’s fraud desk sees tokens, not names or numbers. The same payee always has the same token, so repeats are still counted.' : 'Bank A’s fraud desk sees the real payer account and payee.') + ` A payment is held at a score of ${q.threshold} or more (new payee 30, 23:00 to 05:00 20, over ₹50,000 30, many payments in 10 minutes 25).`;
    held = {}; q.items.forEach((r) => (held[r.txn_id] = r));
    U.patch($('#fraud-list'), q.items.length ? q.items.map((r) => `<article class="card" aria-label="${esc(r.txn_id)}">
      <div class="between"><h3 class="h3">${esc(r.txn_id)}</h3>${stPill(r.status)}</div>
      <div class="between"><b class="mono">${inr(r.amount_paise)}</b><span class="pill">${esc(r.rail)}</span></div>
      <div class="bk-score"><span class="small muted">Score</span>${U.bar(Math.min(1, r.risk / 100), q.threshold / 100)}<b class="mono">${r.risk}</b></div>
      <div class="kit-row">${(r.risk_reasons || []).map((x) => `<span class="pill real">${esc(x)}</span>`).join('')}</div>
      <dl class="bk-kv kit-gap-s"><dt>Payer</dt><dd>${fv(r.desk_payer)}</dd><dt>Payee</dt><dd>${fv(r.desk_payee)} <span class="pill ${r.payee_seen > 1 ? 'leak' : ''}">seen ${r.payee_seen}×</span></dd><dt>Customer</dt><dd class="mono">${esc(r.customer_ref)}</dd></dl>
      <div class="bk-actions"><button class="btn" type="button" data-fraud="approve" data-id="${esc(r.txn_id)}"><span>Approve</span></button><button class="btn danger" type="button" data-fraud="decline" data-id="${esc(r.txn_id)}"><span>Decline</span></button></div></article>`).join('')
      : `<div class="card kit-empty"><h3 class="h3">Nothing is held</h3><p class="muted">Payments with a fraud score below ${q.threshold} go straight through. A payment is held when it looks risky: a large amount, a new payee, a burst of payments or a night-time transfer.</p></div>`);
    U.patch($('#fraud-done'), q.decided.length ? `<table class="tbl dense"><thead><tr><th>Transaction</th><th>Payee on the desk</th><th class="num">Amount</th><th>Outcome</th></tr></thead><tbody>${q.decided.map((r) => `<tr><td class="mono">${esc(r.txn_id)}</td><td>${fv(r.desk_payee)}</td><td class="num mono">${inr(r.amount_paise)}</td><td>${stPill(r.status)}</td></tr>`).join('')}</tbody></table>` : empty('No decisions yet.'));
  }
  $('#fraud-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fraud]'); if (!b) return;
    K.busy(b, async () => {
      try { const d = await api(`/api/fraud/${encodeURIComponent(b.dataset.id)}/${b.dataset.fraud}`, { method: 'POST' }); toast(`${b.dataset.id}: ${d.status}`); await loadAccounts(); fraud(); }
      catch (er) { toast(er.message); fraud(); }
    });
  });

  /* ---------------------------------------------------------------- 5 Back office */
  let boWired = false;
  const copyFields = (f) => `<ul class="bk-fieldlist">${Object.entries(f).map(([k, v]) => `<li><span class="k">${esc(k)}</span><span>${typeof v === 'number' ? esc(v) : Array.isArray(v) ? esc(v.join(', ') || '–') : fv(v)}</span></li>`).join('')}</ul>`;
  async function back() {
    if (!boWired) {
      boWired = true;
      $('#bo-txn').addEventListener('change', sinksFor);
      $('#bo-flush').addEventListener('click', (e) => K.busy(e.currentTarget, async () => {
        try { const r = await api('/api/outbox/flush', { method: 'POST' });
          $('#bo-flush-out').innerHTML = r.error && !r.sent ? U.note('err', `Aran is still not answering (${esc(r.error)}). ${r.pending} copies wait in the outbox.`) : U.note('ok', `Sent ${r.sent} of ${r.attempted} copies through Aran. ${r.pending} still waiting.`);
          back(); } catch (er) { $('#bo-flush-out').innerHTML = U.note('err', esc(er.message)); }
      }));
      $('#bo-breach').addEventListener('click', (e) => K.busy(e.currentTarget, async () => {
        const d = await api('/api/breach'); $('#bo-dump').value = d.dump;
        const vpas = (d.dump.match(/[A-Za-z0-9._\-]{2,64}@(?:okaxis|oksbi|ybl|paytm|unionbank|icici|[a-z]{3,12})\b/g) || []).filter((x) => !/^X+@/.test(x)).length;
        const pans = (d.dump.match(/\b[A-Z]{5}\d{4}[A-Z]\b/g) || []).length, accs = aran ? 0 : (d.dump.match(/\b\d{14}\b/g) || []).length;
        $('#bo-verdict').innerHTML = (vpas + pans + accs) ? U.verdict(false, `<b>${vpas + pans + accs} real identifiers</b> are readable in ${U.fmt(d.transaction_count)} transactions and ${U.fmt(d.sink_copy_count)} copies: ${accs} account numbers, ${vpas} UPI ids, ${pans} PANs.`)
          : U.verdict(true, `No UPI id, PAN or account number is readable. ${U.fmt(d.transaction_count)} transactions are sealed in the core and ${U.fmt(d.sink_copy_count)} copies hold tokens or masked text.`);
      }));
    }
    $('#bo-who').textContent = aran ? 'Bank B stores tokens (teal) or, when Aran did not answer, masked text with the last 4 digits (amber).' : 'Bank A stores the real identifiers (red-orange) in every copy.';
    const [st, ob, list] = await Promise.all([api('/api/txn-stats'), api('/api/outbox'), api('/api/transactions?limit=30')]);
    U.patch($('#bo-tiles'), U.stat('Payments', '', 'in this bank', { count: st.transactions }) + U.stat('Money moved', inr(st.success_volume_paise), 'successful payments') + U.stat('Held for fraud', '', 'waiting for the desk', { count: st.held }) + U.stat('Waiting in outbox', '', aran ? 'copies Aran has not stored yet' : 'Bank A has no Aran', { count: ob.pending, tone: ob.pending ? 'danger' : '' }));
    U.setCounts($('#bo-tiles'));
    const sel = $('#bo-txn'), keep = sel.value;
    const opts = list.items.map((t) => `<option value="${esc(t.txn_id)}">${esc(t.txn_id)} · ${esc(t.rail)} · ${inr(t.amount_paise)} · ${esc(t.status)}</option>`).join('') || '<option value="">No payments yet</option>';
    if (sel.__h !== opts) { sel.__h = opts; sel.innerHTML = opts; if ([...sel.options].some((o) => o.value === keep)) sel.value = keep; }
    sinksFor();
    U.patch($('#bo-outbox'), ob.items.length ? `<table class="tbl dense"><thead><tr><th>Transaction</th><th>Sink</th><th>Tries</th><th>State</th><th>Masked copy</th></tr></thead><tbody>${ob.items.slice(0, 15).map((o) => `<tr><td class="mono">${esc(o.txn_id)}</td><td>${esc(o.sink)}</td><td class="num mono">${o.tries}</td><td>${o.retry ? '<span class="pill real">will retry</span>' : '<span class="pill ok">sent</span>'}${o.last_error && o.retry ? `<div class="small muted">${esc(o.last_error)}</div>` : ''}</td><td>${fv(o.payload.line || o.payload.text || JSON.stringify(o.payload))}</td></tr>`).join('')}</tbody></table>` : empty(aran ? 'The outbox is empty: every copy was stored through Aran.' : 'Bank A has no Aran in front of its copies, so it has no outbox.'));
    $('#bo-outbox-note').textContent = aran ? 'If Aran does not answer in about 1.5 seconds the payment still completes. The copies are stored masked (last 4 digits only) and retried.' + (ob.circuit_open ? ' Aran is not answering right now; new copies go straight to the outbox for a few seconds.' : '') : '';
    $('#bo-flush').disabled = !aran;
    const lc = st.ledger; $('#bo-sink-note').textContent = `Ledger: debits minus credits = ${lc.sum} paise ${lc.balanced ? '✓' : '✗'}`;
  }
  async function sinksFor() {
    const id = $('#bo-txn').value;
    if (!id) { U.patch($('#bo-sinks'), empty('Make a payment first.')); return; }
    const d = await api('/api/sinks?txn_id=' + encodeURIComponent(id));
    U.patch($('#bo-sinks'), `<table class="tbl dense"><thead><tr><th>Where</th><th>Stored as</th><th>What is in it</th></tr></thead><tbody>${d.items.map((c) => `<tr><td>${esc(c.label)}<div class="small muted mono">${esc(c.at)}</div></td><td>${statePill(c.state)}</td><td>${copyFields(c.fields)}</td></tr>`).join('')}</tbody></table>`);
  }

  /* ---------------------------------------------------------------- branch deposit (Home) */
  document.addEventListener('submit', (e) => {
    if (!e.target.matches || !e.target.matches('#dep-form')) return;
    e.preventDefault();
    const btn = $('button', e.target), paise = toPaise($('#dep-amt').value);
    if (paise === null || paise <= 0) { toast('Type the amount in rupees, for example 5000.'); return; }
    K.busy(btn, async () => {
      try { const a = await api('/api/accounts/' + encodeURIComponent(cust) + '/deposit', { body: { amount_paise: paise } }); toast(`${inr(paise)} paid in · balance ${inr(a.balance_paise)}`); await loadAccounts(); refresh(); }
      catch (er) { toast('Could not deposit: ' + er.message); }
    });
  });
  A.bank = { reload: (ref) => { if (ref) { cust = ref; store.set('bank-cust-' + (aran ? 'b' : 'a'), ref); } return loadAccounts().then(refresh).catch(() => {}); } };
  $('#bk-cust').addEventListener('change', (e) => { cust = e.target.value; store.set('bank-cust-' + (aran ? 'b' : 'a'), cust); refresh(); });

  /* ---------------------------------------------------------------- start */
  async function boot() {
    const C = await api('/api/config'); aran = C.bank_mode === 'aran';
    try { rails = (await api('/api/rails')).rails; } catch (e) {}
    await loadAccounts(); booted = true;
    route(true);
    window.addEventListener('hashchange', () => route(false));
    setInterval(() => { if (!document.hidden && booted && view !== 'send' && view !== 'kyc') refresh(); }, 4000);
    setInterval(() => { if (!document.hidden && !cust) loadAccounts().then(refresh).catch(() => {}); }, 3000);
    api('/api/fraud/queue').then((q) => { const n = $('#bk-fraud-n'); n.textContent = q.count; n.classList.toggle('hidden', !q.count); }).catch(() => {});
  }
  boot().catch((err) => { $('#bank-msg').textContent = 'Could not reach this bank: ' + err.message; });
})(window.ARAN);
