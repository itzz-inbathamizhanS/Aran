(function (A) {
  const K = A.kit, U = A.ui, $ = U.$, $$ = U.$$, esc = K.esc;
  let C = {}, aran = false;

  const hl = (t) => K.hl(t, { digits: aran ? 'token' : 'raw' });
  const cell = (v) => {
    if (v == null || v === '') return '<span class="muted">–</span>';
    const s = String(v);
    if (/^<.*>$/.test(s)) return `<mark class="m-token">${esc(s)}</mark>`;
    if (/^\d{10,16}$/.test(s)) return `<mark class="${aran ? 'm-token' : 'm-raw'}">${esc(s)}</mark>`;
    return esc(s);
  };

  async function config() {
    C = await K.api('/api/config'); aran = C.bank_mode === 'aran';
    K.shell({ app: aran ? 'bankB' : 'bankA', brand: aran ? 'Bank B' : 'Bank A', env: aran ? 'Bank B · every write, log line and AI prompt goes through Aran Cloud' : 'Bank A · legacy, stores and sends raw identifiers', envShort: aran ? 'protected by Aran' : 'legacy, unprotected' });
    document.title = (aran ? 'Bank B · with Aran' : 'Bank A · legacy') + ' · Aran';
    $('#eyebrow').textContent = aran ? 'Bank B · protected by Aran' : 'Bank A · legacy';
    $('#title').textContent = aran ? 'Aran Secure Bank' : 'Legacy Bank';
    $('#lede').textContent = aran ? 'The same bank, with Aran in front of the database, the logs and the staff AI. Identifiers are stored as tokens; officers see only what their role allows.' : 'A typical bank: raw Aadhaar, card and phone numbers in the database, in plain log lines and inside prompts sent to an outside AI.';
    $('#mode').className = 'pill ' + (aran ? 'tok' : 'leak'); $('#mode').textContent = aran ? 'Aran protected' : 'legacy · unprotected';
    $('#port').textContent = 'port ' + C.port + (aran ? ' · via ' + C.aran_url : '');
    $('#ai-hint').textContent = aran ? 'Prompts go through the Aran AI gateway. The outside model sees placeholders only.' : 'Prompts go to the outside AI model exactly as typed.';
    $('#write-hint').textContent = aran ? 'The write path: identifiers are turned into tokens by Aran Cloud before the insert.' : 'The write path: identifiers are inserted exactly as typed.';
    $('#officer').classList.toggle('hidden', !aran);
    $('#lg-raw').classList.toggle('hidden', aran); $('#lg-tok').classList.toggle('hidden', !aran);
    K.reveal(document);
  }

  /* what this bank holds right now, read from its own database (GET /api/db-view) */
  let tilesFirst = true;
  const tiles = (d) => {
    const n = (x) => (x || []).length;
    $('#bank-tiles').innerHTML = U.stat('Customers', '', 'rows in the customers table', { count: n(d.customers) }) + U.stat('Log lines', '', aran ? 'cleaned by Aran before writing' : 'written exactly as logged', { count: n(d.logs) }) + U.stat('AI chats', '', aran ? 'the AI provider saw placeholders' : 'the AI provider saw the raw text', { count: n(d.chat_history) }) + U.stat('Identifiers stored as', aran ? 'Tokens' : 'Raw', aran ? 'useless if the database leaks' : 'readable if the database leaks', { tone: aran ? '' : 'danger' });
    tilesFirst ? U.runCounts($('#bank-tiles')) : U.setCounts($('#bank-tiles')); tilesFirst = false;
  };

  async function db() {
    const d = await K.api('/api/db-view'), cs = d.customers || [];
    tiles(d);
    $('#t-customers').innerHTML = cs.length ? `<table class="tbl dense"><thead><tr><th>Ref</th><th>Name</th><th>Mobile</th><th>Aadhaar</th><th>Card</th><th>Created</th></tr></thead><tbody>${cs.map((c) => `<tr><td class="mono">${esc(c.customer_ref)}</td><td>${cell(c.name)}</td><td>${cell(c.mobile)}</td><td>${cell(c.aadhaar)}</td><td>${cell(c.card)}</td><td class="mono">${esc(c.created_at)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small">No customers yet. Open an account above.</p>';
    $('#t-logs').innerHTML = (d.logs || []).length ? `<table class="tbl dense"><thead><tr><th>#</th><th>Time</th><th>Level</th><th>Message</th></tr></thead><tbody>${d.logs.map((l) => `<tr><td class="mono">${l.id}</td><td class="mono">${esc(l.created_at)}</td><td>${U.pill(esc(l.level), '')}</td><td>${hl(l.message)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small">No log lines yet.</p>';
    $('#t-chat').innerHTML = (d.chat_history || []).length ? `<table class="tbl dense"><thead><tr><th>#</th><th>Time</th><th>Staff prompt</th><th>What the AI provider saw</th><th>Reply</th></tr></thead><tbody>${d.chat_history.map((h) => `<tr><td class="mono">${h.id}</td><td class="mono">${esc(h.created_at)}</td><td>${K.hl(h.prompt)}</td><td>${hl(h.provider_saw)}</td><td>${esc(h.reply)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small">No chats yet.</p>';
    const opts = cs.map((c) => `<option value="${esc(c.customer_ref)}">${esc(c.customer_ref)}${aran ? '' : ' · ' + esc(c.name)}</option>`).join('') || '<option value="">No customers</option>';
    const keep = (sel) => { const v = sel.value; sel.innerHTML = opts; if ([...sel.options].some((o) => o.value === v)) sel.value = v; };
    keep($('#o-cust')); keep($('#e-cust'));
    /* nothing to inspect or erase until a customer exists */
    $('#o-go').disabled = !cs.length; $('#erase').disabled = !cs.length;
  }

  $('#sample').onclick = async () => { try { const s = await K.api('/api/sample-customer'); $('#f-name').value = s.name; $('#f-mobile').value = s.mobile; $('#f-aadhaar').value = s.aadhaar; $('#f-card').value = s.card; } catch (e) { U.toast('Could not load a sample'); } };
  $('#signup').onsubmit = (e) => { e.preventDefault(); K.busy($('#open'), async () => {
    const out = $('#signup-out');
    try { const d = await K.api('/api/customers', { body: { name: $('#f-name').value.trim(), mobile: $('#f-mobile').value.trim(), aadhaar: $('#f-aadhaar').value.trim(), card: $('#f-card').value.trim() } });
      out.innerHTML = U.note(aran ? 'ok' : 'err', `Account <b class="mono">${esc(d.customer_ref)}</b> opened. ${aran ? 'Identifiers were tokenised by Aran before they were stored.' : 'Identifiers were stored exactly as typed.'}`);
      $('#signup').reset(); db();
    } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
  }); };
  U.tabs($('.card .tabs').parentElement);

  $('#chat-form').onsubmit = async (e) => {
    e.preventDefault(); const p = $('#chat-in').value.trim(); if (!p) return; const box = $('#chat');
    box.insertAdjacentHTML('beforeend', `<div class="kit-bub me">${esc(p)}</div>`); $('#chat-in').value = ''; box.scrollTop = box.scrollHeight;
    try { const d = await K.api('/api/chat', { body: { prompt: p } });
      box.insertAdjacentHTML('beforeend', `<div class="kit-bub bot">${esc(d.reply)}<div class="kit-peek">${aran ? '<span class="t-token">✓ The AI provider saw</span>' : '<span class="t-leak">! The AI provider saw</span>'} ${hl(d.provider_saw)}</div></div>`);
    } catch (err) { box.insertAdjacentHTML('beforeend', `<div class="kit-bub bot"><span class="t-leak">${esc(err.message)}</span></div>`); }
    box.scrollTop = box.scrollHeight; db();
  };

  $('#o-go').onclick = (e) => K.busy(e.currentTarget, async () => {
    const out = $('#o-out'), c = $('#o-cust').value, role = $('#o-role').value; if (!c) return;
    try { const d = await K.api(`/api/officer-view/${encodeURIComponent(c)}?role=${role}`), f = d.fields;
      const show = (x) => (x.is_token ? `<mark class="m-token">${esc(x.display)}</mark>` : /^X+/.test(x.display || '') ? `<span class="mono">${esc(x.display)}</span>` : /^\d{10,16}$/.test(x.display || '') ? `<mark class="m-real">${esc(x.display)}</mark>` : esc(x.display || '–'));
      out.innerHTML = `<div class="card flat"><div class="kit-row" style="margin-bottom:12px">${U.pill(esc(d.customer_ref), 'info')}${U.pill('viewing as ' + esc(d.role), role === 'compliance' ? 'real' : role === 'developer' ? 'tok' : '')}</div><dl class="kit-kv"><dt>Name</dt><dd>${show(f.name)}</dd><dt>Mobile</dt><dd>${show(f.mobile)}</dd><dt>Aadhaar</dt><dd>${show(f.aadhaar)}</dd><dt>Card</dt><dd>${show(f.card)}</dd></dl></div>`;
    } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
  });

  $('#breach').onclick = (e) => K.busy(e.currentTarget, async () => { const d = await K.api('/api/breach'); $('#dump').value = d.dump; $('#trace').disabled = false; $('#trace-out').innerHTML = ''; });
  $('#trace').onclick = (e) => K.busy(e.currentTarget, async () => {
    const out = $('#trace-out');
    try { const d = await K.api('/api/trace-dump', { body: { dump: $('#dump').value } }), tr = d.trace || {};
      if (d.bank_mode === 'legacy') { const n = (tr.raw_matches || []).length || tr.raw_identifiers_in_dump || 0; out.innerHTML = U.verdict(false, `<b>${n} real identifiers</b> are readable in the stolen dump. Nothing was tokenised, so nothing can be traced or revoked.`); }
      else out.innerHTML = `${U.verdict(true, `No real identifiers in the dump. <b>${tr.matched || 0} tokens</b> trace back to <b>${esc(tr.top ? tr.top.sink : 'kyc-archive')}</b>.`)}${(tr.ranking || []).length ? `<div class="kit-gap-s">${tr.ranking.map((x, i) => U.rankRow(esc(x.sink), x.share, x.tokens + ' tokens', i)).join('')}</div>` : ''}`;
    } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
  });

  $('#erase').onclick = (e) => K.busy(e.currentTarget, async () => {
    const out = $('#erase-out'), c = $('#e-cust').value; if (!c) return;
    if (!(await U.confirm({ title: `Delete ${esc(c)}’s data?`, body: aran ? 'Aran shreds the KYC purpose key and signs a receipt. Every copy of the tokens becomes unreadable.' : 'The bank deletes the customer row.', confirmLabel: 'Delete data' }))) return;
    try { const d = await K.api(`/api/erase/${encodeURIComponent(c)}`, { method: 'POST' });
      if (d.bank_mode === 'legacy') out.innerHTML = U.verdict(false, 'Only the customer row was deleted. The same numbers are still in the logs and the chat history. Open those tabs to see them.');
      else { const v = d.verification || {}, a = (d.detokenise_checks || {}).aadhaar || {};
        out.innerHTML = `${U.verdict(true, 'Purpose key shredded. The signed receipt checks out.')}<dl class="kit-kv kit-gap-s"><dt>Algorithm</dt><dd class="mono">${esc(v.alg || 'Ed25519 + ML-DSA-65')}</dd><dt>Signature</dt><dd>${U.pill(v.signature_valid ? 'valid' : 'invalid', v.signature_valid ? 'ok' : 'leak')}</dd><dt>Merkle log</dt><dd>${U.pill(v.included_in_log ? 'included' : 'missing', v.included_in_log ? 'ok' : 'leak')}</dd><dt>Detokenise now</dt><dd>${U.pill(esc(a.status || '–'), 'leak')} <span class="small muted">${esc(a.reason || '')}</span></dd><dt>Receipt root</dt><dd class="mono">${esc(String((d.receipt || {}).root || '').slice(0, 32))}…</dd></dl>`; }
      db(); if (aran && $('#o-out').innerHTML) $('#o-go').click();
    } catch (err) { out.innerHTML = U.note('err', esc(err.message)); }
  });
  $('#refresh').onclick = db;

  config().then(db).catch((err) => { if (!document.querySelector('.logo')) K.shell({ app: 'bankA', brand: 'Demo bank' }); $('#lede').textContent = 'Could not reach this bank’s server: ' + err.message; });
  setInterval(() => { if (!document.hidden) db().catch(() => {}); }, 5000);
})(window.ARAN);
