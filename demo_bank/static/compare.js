(function (A) {
  const K = A.kit, U = A.ui, $ = U.$, esc = K.esc, L = K.links;
  K.shell({ app: 'compare', brand: 'Aran', env: 'Side by side · Bank A legacy and Bank B protected by Aran Cloud' });
  K.reveal(document);
  $('#frame-a').src = L.bankA + '/?embed=1'; $('#frame-b').src = L.bankB + '/?embed=1';
  $('#a-addr').textContent = L.bankA.replace(/^https?:\/\//, ''); $('#b-addr').textContent = L.bankB.replace(/^https?:\/\//, '');
  $('#dash').href = L.cloud + '/dashboard';
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-reload]'); if (b) { const f = $('#' + b.dataset.reload); f.src = f.src; } });

  let first = true;
  const tiles = async () => {
    try {
      const s = await K.api(L.bankB + '/api/aran-summary');
      if (!s.available) { $('#tiles-note').textContent = s.reason || 'Bank B has no Aran Cloud workspace.'; return; }
      const m = s.metrics, types = Object.entries(m.by_type || {}).map(([k, v]) => `${k} ${v}`).join(' · ');
      $('#tiles').innerHTML = U.stat('Identifiers protected', '', types || 'tokenised by Bank B', { count: m.identifiers_protected }) + U.stat('Requests', '', `${m.usage_percent}% of the plan`, { count: m.requests_this_month }) + U.stat('Latency p50 / p95', `<span>${m.p50_ms}</span><span class="small muted"> / ${m.p95_ms} ms</span>`, 'through Aran Cloud') + U.stat('Erasure receipts', '', 'signed, post-quantum', { count: m.receipts_count });
      first ? U.runCounts($('#tiles')) : U.setCounts($('#tiles')); first = false;
      $('#tiles-note').textContent = `Live from Bank B’s Aran Cloud workspace “${s.tenant.name}”.`;
    } catch (e) { $('#tiles-note').textContent = 'Bank B is not reachable at ' + L.bankB + '.'; }
  };
  tiles(); setInterval(() => !document.hidden && tiles(), 3000);

  $('#sample').onclick = async () => { try { const s = await K.api(L.bankB + '/api/sample-customer'); $('#s-name').value = s.name; $('#s-mobile').value = s.mobile; $('#s-aadhaar').value = s.aadhaar; $('#s-card').value = s.card; } catch (e) { U.toast('Could not make a test identity'); } };
  $('#both').onsubmit = (e) => { e.preventDefault(); K.busy($('#send'), async () => {
    const ref = 'CUST-SBS-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const body = { name: $('#s-name').value.trim(), mobile: $('#s-mobile').value.trim(), aadhaar: $('#s-aadhaar').value.trim(), card: $('#s-card').value.trim(), customer_ref: ref };
    const [a, b] = await Promise.allSettled([K.api(L.bankA + '/api/customers', { body }), K.api(L.bankB + '/api/customers', { body })]);
    const line = (r, n) => (r.status === 'fulfilled' ? `${n}: <b class="mono">${esc(r.value.customer_ref)}</b> opened` : `${n}: <span class="t-leak">${esc(r.reason.message)}</span>`);
    if (a.status !== 'fulfilled' || b.status !== 'fulfilled') { $('#both-out').innerHTML = U.note('err', `${line(a, 'Bank A')} · ${line(b, 'Bank B')}`); return; }
    /* what each bank actually wrote to its database, field by field, next to what was typed */
    const F = [['name', 'Name'], ['mobile', 'Mobile'], ['aadhaar', 'Aadhaar'], ['card', 'Card']], A_ = a.value, B_ = b.value;
    const raw = (r) => F.filter(([k]) => String(r[k]) === body[k]).length;
    const cellv = (v, typed) => (String(v) === typed ? `<mark class="m-raw">${esc(v)}</mark>` : `<mark class="m-token">${esc(v)}</mark>`);
    $('#both-out').innerHTML = `<div class="kit-gap-s">${U.note('ok', `${line(a, 'Bank A')} · ${line(b, 'Bank B')}`)}</div>
      <div class="kit-cmp kit-gap-s"><div class="kit-cmp-v"><span class="label">Bank A · readable in its database</span><b class="t-leak">${raw(A_)} of ${F.length}</b></div><div class="kit-cmp-v"><span class="label">Bank B · readable in its database</span><b class="t-token">${raw(B_)} of ${F.length}</b></div></div>
      <div class="kit-scroll kit-gap-s"><table class="tbl dense"><thead><tr><th>Field</th><th>Typed</th><th>Bank A stored</th><th>Bank B stored</th></tr></thead><tbody>${F.map(([k, n]) => `<tr><td>${n}</td><td class="mono">${esc(body[k])}</td><td>${cellv(A_[k], body[k])}</td><td>${cellv(B_[k], body[k])}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted" style="margin-top:8px">Red is the real value, readable by anyone who gets the database. Teal is an Aran token: useless on its own, and unreadable for good once the customer is erased.</p>`;
    A.sbsRef = ref; try { sessionStorage.setItem('aran-sbs-ref', ref); } catch (e2) { /* storage blocked */ }
    ['frame-a', 'frame-b'].forEach((id) => { const f = $('#' + id); f.src = f.src; }); tiles();
  }); };
})(window.ARAN);
