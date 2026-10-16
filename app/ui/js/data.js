/* ==========================================================================
   Data layer: every number and scene comes from the live Aran server (/api).
   A.boot() waits for the models to load, then fills the live store below
   (config, stats, events, customers, alerts, Merkle log, results); A.poll()
   keeps it fresh. Actions (process, checksum, erase, ...) call the server and
   return promises. Local maths (Verhoeff, Luhn) is only used to colour inputs
   while typing; the server always has the final word.
   ========================================================================== */
window.ARAN = window.ARAN || {};
(function (A) {
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const digits = (n) => Array.from({ length: n }, () => rnd(10)).join('');

  /* ---- check digits (real Verhoeff and Luhn, so the animations are honest) ---- */
  const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  const INV = [0,4,3,2,1,5,6,7,8,9];
  const verhoeffCheck = (body) => { let c = 0; [...body].reverse().forEach((ch, i) => { c = D[c][P[(i + 1) % 8][+ch]]; }); return INV[c]; };
  const verhoeffValid = (num) => { let c = 0; [...num].reverse().forEach((ch, i) => { c = D[c][P[i % 8][+ch]]; }); return c === 0; };
  const luhnCheck = (body) => { let s = 0; [...body].reverse().forEach((ch, i) => { let d = +ch; if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } s += d; }); return (10 - (s % 10)) % 10; };
  const luhnValid = (num) => { let s = 0; [...num].reverse().forEach((ch, i) => { let d = +ch; if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } s += d; }); return s % 10 === 0; };
  const mkAadhaar = () => { const b = String(2 + rnd(8)) + digits(10); return b + verhoeffCheck(b); };
  const mkCard = () => { const b = '4' + digits(14); return b + luhnCheck(b); };
  const mkMobile = () => String(6 + rnd(4)) + digits(9);
  const mkPan = () => { const L = () => String.fromCharCode(65 + rnd(26)); return L() + L() + L() + 'P' + L() + digits(4) + L(); };
  // a token has the same shape, but its check digit is deliberately wrong
  const tokenFrom = (real, kind) => {
    const body = digits(real.length - 1);
    const good = kind === 'CARD' ? luhnCheck(body) : verhoeffCheck(body);
    return body + ((good + 1 + rnd(9)) % 10);
  };
  const group = (s, n) => s.replace(new RegExp('(.{' + n + '})', 'g'), '$1 ').trim();

  /* ---- vocabularies (spec section 4) ---- */
  A.TYPE = { AADHAAR: 'Aadhaar', CARD: 'Card', MOBILE: 'Mobile', PAN: 'PAN', OTP: 'OTP', UPI: 'UPI ID', PER: 'Name', ADDR: 'Address' };
  A.SINKS = [
    { name: 'log-platform', label: 'Log platform', purpose: 'Service', threshold: 0.5 },
    { name: 'crm-notes', label: 'CRM notes', purpose: 'Service', threshold: 0.5 },
    { name: 'loan-vendor', label: 'Loan vendor', purpose: 'Loans', threshold: 0.5 },
    { name: 'llm-gateway', label: 'AI chatbot (AI gateway)', purpose: 'Service', threshold: 0.3 },
    { name: 'marketing-cloud', label: 'Marketing', purpose: 'Marketing', threshold: 0.5 },
    { name: 'kyc-archive', label: 'KYC archive', purpose: 'KYC', threshold: 0.5 },
  ];
  A.SOURCES = [['console', 'You'], ['loan-origination', 'Loan app'], ['onboarding', 'Onboarding'], ['call-centre', 'Call centre'], ['upi-switch', 'UPI switch'], ['mobile-app', 'Mobile app'], ['employee-desktop', 'Staff desktop']];
  A.SAMPLES = {
    loan: ['Loan application API', 'loan-origination', 'loan-vendor'], kyc: ['KYC upload API', 'onboarding', 'kyc-archive'],
    callnote: ['Call-centre note', 'call-centre', 'crm-notes'], payment: ['Payment callback', 'upi-switch', 'log-platform'],
    otp: ['Login with OTP', 'mobile-app', 'log-platform'], chatbot: ['Prompt to an AI assistant', 'employee-desktop', 'llm-gateway'],
  };
  A.DRILLS = { 'new-sink': 'Send customer records to a sink never seen before', 'bulk-export': 'Bulk export of loan applications in one window', 'detok-spike': 'Insider detokenises many customer tokens', bypass: 'Firewall switched to monitor-only on the log platform' };
  A.EVIDENCE = { checksum: 'Checksum passes (Verhoeff / Luhn)', kw: 'Type word nearby', iin: 'Card issuer prefix', len16: '16 digits', plus91: '+91 prefix', ctx: 'Context model score', otp_ctx: 'OTP context model', upi_ctx: 'UPI context model', registry: 'Handle in UPI registry', handle: 'UPI handle', hdot: 'Dot in handle', ner: 'AI name/address model', ntok: 'Span length', digit: 'Contains digits', calendar: 'Looks like a date', idword: 'Looks like an order ID', title: 'Title case', deva: 'Devanagari script', cue: 'Cue word before', pin: 'PIN code inside', comma: 'Comma separated', keyfield: 'Phone-like field name', sendto: '"called from" / "sent to"' };
  A.AGAINST = new Set(['calendar', 'idword']);
  A.FEATURES = ['volume', 'left raw', 'odd hour', 'new route', 'new data type', 'read-backs', 'customers'];

  /* ---- HTTP ---- */
  A.api = async function (path, body, method) {
    const opt = body === undefined ? { method: method || 'GET' } : { method: method || 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    let r;
    try { r = await fetch('/api' + path, opt); } catch (e) { throw new Error('Server unreachable. Is Aran running?'); }
    let d = null; try { d = await r.json(); } catch (e) {}
    if (!r.ok) { const det = d && d.detail; throw new Error(typeof det === 'string' ? det : Array.isArray(det) ? det.map((x) => x.msg).join('; ') : 'HTTP ' + r.status); }
    return d;
  };
  const SINK_LABEL = { 'log-platform': 'Log platform', 'crm-notes': 'CRM notes', 'loan-vendor': 'Loan vendor', 'llm-gateway': 'AI chatbot (AI gateway)', 'marketing-cloud': 'Marketing', 'kyc-archive': 'KYC archive' };
  A.sinkLabel = (n) => (A.SINKS.find((s) => s.name === n) || { label: n }).label;

  /* ---- the live store (filled by A.boot, refreshed by A.poll) ---- */
  A.stats = { requests: 0, values_protected: 0, values_passed_raw: 0, by_type: {}, alerts: 0, open_alerts: 0, immune: { mode: 'idle' }, replay: { running: false, lines_sent: 0, flows: [] } };
  A.events = []; A.customers = []; A.alerts = []; A.immune = { state: { mode: 'idle' }, alerts: [] };
  A.merkle = { size: 0, root: '', recent: [] }; A.results = null; A.config = null;
  const subs = {};
  A.on = (k, fn) => { (subs[k] = subs[k] || []).push(fn); return () => { subs[k] = subs[k].filter((f) => f !== fn); }; };
  const emit = (k) => (subs[k] || []).forEach((f) => { try { f(); } catch (e) {} });
  const load = {
    config: async () => {
      const c = await A.api('/config'); A.config = c;
      A.SINKS = c.sinks.map((s) => Object.assign({ label: SINK_LABEL[s.name] || s.name }, s));
      A.SAMPLES = {}; Object.keys(c.samples).forEach((k) => (A.SAMPLES[k] = [c.samples[k], c.sample_sources[k], c.sample_sinks[k]]));
      A.DRILLS = c.drills;
    },
    stats: async () => { A.stats = await A.api('/stats'); },
    events: async () => { A.events = await A.api('/events?limit=40'); },
    customers: async () => { A.customers = await A.api('/customers'); },
    immune: async () => { A.immune = await A.api('/immune'); A.alerts = A.immune.alerts; },
    merkle: async () => { A.merkle = await A.api('/merkle'); },
    results: async () => { A.results = mapResults(await A.api('/results')); },
  };
  A.refresh = async (...keys) => { await Promise.all(keys.map((k) => load[k]().then(() => emit(k)).catch(() => {}))); };
  /* wait until the models are loaded; onWait(state, error) is told while waiting */
  A.boot = async function (onWait) {
    for (;;) {
      let h = null; try { h = await A.api('/health'); } catch (e) { onWait('offline'); }
      if (h && h.error) { onWait('failed', h.error); } else if (h && h.ready) break; else if (h) onWait('starting');
      await new Promise((r) => setTimeout(r, 2000));
    }
    await load.config();
    await A.refresh('stats', 'events', 'customers', 'immune', 'merkle', 'results');
  };
  let pollT = [];
  A.poll = function () {
    pollT.forEach(clearInterval);
    pollT = [setInterval(() => A.refresh('stats', 'events'), 3000), setInterval(() => A.refresh('immune'), 4000), setInterval(() => A.refresh('merkle', 'customers'), 8000)];
  };

  /* ---- results files → the shape the pages draw ---- */
  function mapResults(r) {
    const C = (r['E1-E4 core'] || {}), I = (r['E5-E9 AI and immune'] || {}), G = (r['E10-E12 normaliser and registries'] || {});
    const c = C.data || {}, a = I.data || {}, g = G.data || {};
    const out = { raw: r };
    if (c.e1_total) out.core = { file: C.file, modified: C.modified, e1: c.e1_total, e2: c.e2, e3: c.e3, e4: c.e4 || [] };
    if (a.e9_firewall) {
      const e9 = a.e9_firewall, num = (v) => (typeof v === 'string' ? +v.split('/')[0] : v), e8 = a.e8_immune || {};
      out.ai = { file: I.file, modified: I.modified, e9: Object.assign({}, e9, { prototype_clean_lines_flagged: num(e9.prototype_clean_lines_flagged), clean_real_lines_changed: num(e9.clean_real_lines_changed), clean_of: typeof e9.clean_real_lines_changed === 'string' ? e9.clean_real_lines_changed.split('/')[1] : null }),
        e8: { ais: e8.ais || {}, static: e8.static_rules || {}, iforest: e8.isolation_forest || {} } };
    }
    if (g.e10_evasion) {
      const conds = g.e10_evasion.conditions, names = Object.keys(conds), tricks = Object.keys(conds[names[0]].by_trick);
      out.reg = { file: G.file, modified: G.modified, conditions: names, tricks, rate: names.map((n) => tricks.map((t) => conds[n].by_trick[t].rate)) };
    }
    return out;
  }

  /* ---- actions (all live) ---- */
  A.process = (text, source, sink) => A.api('/process', { text, source, sink });
  A.sample = (kind, who, sink) => A.api('/sample', { kind, who: who || 'customer', sink: sink || null });
  A.packet = (kind) => A.api('/tour/packet', { kind: kind || null });
  A.generate = () => A.api('/tour/generate');
  A.falseAlarms = () => A.api('/tour/false-alarms', {});
  A.checksum = (digits) => A.api('/tour/checksum', { digits });
  A.buildToken = (sink, aadhaar) => A.api('/tour/build-token', { sink, aadhaar: aadhaar || null });
  A.evasion = () => A.api('/tour/evasion', {});
  A.tokens = () => A.api('/tour/tokens', {});
  A.trace = (dump) => A.api('/trace', { dump });
  A.leakedDump = (sink, lines) => A.api('/leaked-dump?sink=' + encodeURIComponent(sink) + '&lines=' + (lines || 20));
  A.gateway = (role, text) => A.api('/tour/gateway', { role, text });
  A.radar = () => A.api('/tour/immune-radar');
  A.customer = (ref) => A.api('/customers/' + encodeURIComponent(ref));
  A.addCustomer = (name) => A.api('/customers', { name: name || null });
  A.customerLoan = (ref) => A.api('/tour/customer-loan', { customer_ref: ref });
  A.detokenise = (token) => A.api('/detokenise', { token, caller: 'console' });
  A.erase = (ref, purpose) => A.api('/erase', { customer_ref: ref, purpose });
  A.verify = (receipt) => A.api('/receipts/verify', receipt);
  A.learn = (seconds) => A.api('/immune/learn', { seconds });
  A.drill = (kind) => A.api('/drills/' + kind, {});
  A.label = (id, label) => A.api('/immune/alerts/' + id + '/label', { label });
  A.replay = (on, rate) => (on ? A.api('/replay/start', { rate: rate || 1 }) : A.api('/replay/stop', {}));
  A.job = (name, start) => (start ? A.api('/jobs/' + name, {}) : A.api('/jobs/' + name));

  /* ---- receipts: RFC 9162 inclusion proof re-run in this browser (WebCrypto) ---- */
  const enc = new TextEncoder(), b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)), hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  async function sha(...parts) { const n = parts.reduce((a, p) => a + p.length, 0), buf = new Uint8Array(n); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; } return new Uint8Array(await crypto.subtle.digest('SHA-256', buf)); }
  function canon(v, k) {
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((x) => JSON.stringify(x) + ':' + canon(v[x], x)).join(',') + '}';
    if (typeof v === 'number' && k === 'at' && Number.isInteger(v)) return v + '.0'; // Python writes floats as 1.0
    return JSON.stringify(v);
  }
  A.browserInclusion = async function (rc) {
    let r = await sha(new Uint8Array([0]), enc.encode(canon(rc.event))); const chain = [hex(r)];
    let fn = rc.leaf_index, sn = rc.tree_size - 1;
    for (const p of rc.proof.map(b64)) {
      if (sn === 0) return { chain, ok: false };
      if (fn % 2 === 1 || fn === sn) { r = await sha(new Uint8Array([1]), p, r); if (fn % 2 === 0) while (fn % 2 === 0 && fn !== 0) { fn >>= 1; sn >>= 1; } }
      else r = await sha(new Uint8Array([1]), r, p);
      fn >>= 1; sn >>= 1; chain.push(hex(r));
    }
    return { chain, ok: sn === 0 && hex(r) === hex(b64(rc.root)) };
  };
  A.b64hex = (s) => { try { return hex(b64(s)); } catch (e) { return s; } };

  A.helpers = { rnd, pick, digits, group, verhoeffValid, luhnValid, mkAadhaar, mkCard, tokenFrom };
})(window.ARAN);
