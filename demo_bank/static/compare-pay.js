/* Side by side: the same payment at Bank A and Bank B, then every copy (sink) field by field. */
(function (A) {
  'use strict';
  const K = A.kit, U = A.ui, $ = U.$, esc = K.esc, L = K.links;
  const inr = (p) => '₹' + U.fmt(Math.floor(Number(p) / 100)) + '.' + String(Number(p) % 100).padStart(2, '0');
  const toPaise = (s) => { s = String(s).trim().replace(/,/g, ''); if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null; const [r, f = ''] = s.split('.'); return Number(r) * 100 + Number((f + '00').slice(0, 2)); };
  const rnd = (n) => Math.floor(Math.random() * n), digits = (n) => Array.from({ length: n }, () => rnd(10)).join('');
  const pick = (a) => a[rnd(a.length)], LET = [...'ABCDEFGHJKLMNPRSTUVWXY'];
  const luhn = (p) => { for (let c = 0; c < 10; c++) { const s = p + c; let t = 0, alt = false; for (let i = s.length - 1; i >= 0; i--) { let d = +s[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } t += d; alt = !alt; } if (t % 10 === 0) return s; } return p; };
  const SHOWN = { payer_account: 'payer account', payee: 'payee', card: 'card', remarks: 'remarks', line: 'log line', to: 'sent to', text: 'text' };
  const LABEL = { 'txn-log': 'Transaction log', 'fraud-desk': 'Fraud-desk row', analytics: 'Analytics export row', sms: 'SMS text', 'support-chat': 'Support chat' };

  const fill = () => {
    const r = $('#c-rail').value;
    $('#c-payee').value = r === 'UPI' ? pick(['rekha', 'suresh', 'anita', 'farhan']) + (100 + rnd(900)) + '@' + pick(['okaxis', 'oksbi', 'unionbank']) : r === 'CARD' ? luhn('4' + digits(14)) : digits(12);
    $('#c-ifsc').disabled = r === 'UPI' || r === 'CARD';
    $('#c-remarks').value = 'Rent Nov, PAN ' + Array.from({ length: 5 }, () => pick(LET)).join('') + digits(4) + pick(LET) + ', call ' + pick(['9', '8', '7']) + digits(9);
  };
  fill();
  $('#c-new').addEventListener('click', fill);
  $('#c-rail').addEventListener('change', fill);

  /* a stored value, marked: real values the form contained (red-orange), tokens (teal), masked (amber) */
  const mark = (text, raws, aran) => {
    let s = esc(text == null ? '' : String(text));
    raws.filter(Boolean).sort((a, b) => b.length - a.length).forEach((rv) => { s = s.split(esc(rv)).join(`<mark class="m-raw">${esc(rv)}</mark>`); });
    return s.replace(/(<mark[^>]*>.*?<\/mark>)|(&lt;[A-Za-z0-9_:\-]+&gt;)|(X{3,}[A-Za-z0-9@.]*)|(\d{9,19})/g, (m, k, tok, mask, num) => k ? k : tok ? `<mark class="m-token">${tok}</mark>` : mask ? `<span class="bk-mask">${mask}</span>` : aran ? `<mark class="m-token">${num}</mark>` : `<mark class="m-raw">${num}</mark>`);
  };
  const countRaw = (copies, raws) => copies.reduce((n, c) => n + Object.values(c.fields).filter((v) => typeof v === 'string' && raws.some((r) => r && v.includes(r))).length, 0);

  async function payAt(base, body, key) {
    /* the customer just signed up at both banks above; otherwise this bank's newest open account */
    let ref = A.sbsRef; try { ref = ref || sessionStorage.getItem('aran-sbs-ref'); } catch (e) { /* storage blocked */ }
    const accts = (await K.api(base + '/api/accounts')).filter((x) => !String(x.number).startsWith('ERASED'));
    const a = accts.find((x) => x.customer_ref === ref) || accts[accts.length - 1];
    if (!a) throw new Error('no account yet. Sign a customer up at both banks first (the form above)');
    const d = await K.api(base + '/api/transactions', { body: Object.assign({ customer_ref: a.customer_ref, idem_key: key }, body) });
    return { d, acct: a };
  }

  $('#pay2').addEventListener('submit', (e) => { e.preventDefault(); K.busy($('#c-go'), async () => {
    const out = $('#pay2-out'), rail = $('#c-rail').value, paise = toPaise($('#c-amount').value);
    if (paise === null || paise <= 0) { out.innerHTML = U.note('err', 'Type the amount in rupees, for example 2450.50.'); return; }
    const body = { rail, payee: $('#c-payee').value.trim(), amount_paise: paise, remarks: $('#c-remarks').value.trim(), to_support_chat: $('#c-chat').checked };
    if (rail !== 'UPI' && rail !== 'CARD') body.ifsc = $('#c-ifsc').value.trim().toUpperCase();
    const key = 'cmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    out.innerHTML = '<p class="small muted">Paying at both banks…</p>';
    const [a, b] = await Promise.allSettled([payAt(L.bankA, body, key), payAt(L.bankB, body, key)]);
    const bad = (r, n) => (r.status === 'rejected' ? `${n}: ${esc(r.reason.message)}` : '');
    if (a.status !== 'fulfilled' || b.status !== 'fulfilled') { out.innerHTML = U.note('err', [bad(a, 'Bank A'), bad(b, 'Bank B')].filter(Boolean).join(' · ')); return; }
    const A_ = a.value, B_ = b.value;
    /* the real values of this payment at each bank: the typed payee and remarks identifiers, plus that bank's payer account */
    const typed = [body.payee].concat((body.remarks.match(/[A-Z]{5}\d{4}[A-Z]|[6-9]\d{9}/g) || []));
    const rawA = typed.concat([A_.acct.number]), rawB = typed.concat([B_.acct.number]);
    const ca = A_.d.copies, cb = B_.d.copies, nA = countRaw(ca, rawA), nB = countRaw(cb, rawB);
    const sinks = ['txn-log', 'fraud-desk', 'analytics', 'sms', 'support-chat'].filter((s) => ca.some((c) => c.sink === s) || cb.some((c) => c.sink === s));
    const find = (cs, s) => cs.filter((c) => c.sink === s && c.state !== 'plain')[0];
    const rows = sinks.map((s) => {
      const x = find(ca, s), y = find(cb, s), keys = [...new Set([...(x ? Object.keys(x.fields) : []), ...(y ? Object.keys(y.fields) : [])])].filter((k) => SHOWN[k] || k === 'payee');
      return `<tr class="sinkrow"><td colspan="3">${esc(LABEL[s] || s)} ${y ? (y.state === 'masked' ? '<span class="pill real">Bank B: masked, waiting in outbox</span>' : '<span class="pill tok">Bank B: tokens</span>') : ''}</td></tr>` + keys.map((k) => `<tr><td class="k">${esc(SHOWN[k] || k)}</td><td>${x && x.fields[k] != null ? mark(x.fields[k], rawA, false) : '<span class="muted">–</span>'}</td><td>${y && y.fields[k] != null ? mark(y.fields[k], rawB, true) : '<span class="muted">–</span>'}</td></tr>`).join('');
    }).join('');
    out.innerHTML = `<div class="kit-gap-s">${U.note('ok', `Bank A: <b class="mono">${esc(A_.d.txn_id)}</b> ${esc(A_.d.status)} · Bank B: <b class="mono">${esc(B_.d.txn_id)}</b> ${esc(B_.d.status)} · ${inr(paise)} via ${esc(rail)}`)}</div>
      <div class="kit-cmp kit-gap-s"><div class="kit-cmp-v"><span class="label">Bank A · copies with a real identifier</span><b class="t-leak">${nA}</b></div><div class="kit-cmp-v"><span class="label">Bank B · copies with a real identifier</span><b class="t-token">${nB}</b></div></div>
      <div class="kit-scroll kit-gap-s"><table class="tbl dense bk-cmp"><caption class="sr-only">Every copy of the payment, field by field</caption><thead><tr><th>Field</th><th>Bank A stored</th><th>Bank B stored</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="small muted" style="margin-top:8px">Red-orange is the real value. Teal is an Aran token. Amber is masked text (last 4 digits), used when Aran did not answer in time. The payment itself never waited for Aran.</p>`;
    ['frame-a', 'frame-b'].forEach((id) => { const f = $('#' + id); f.src = f.src; });
  }); });
})(window.ARAN);
