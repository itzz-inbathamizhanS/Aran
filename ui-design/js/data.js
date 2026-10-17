/* ==========================================================================
   Mock data layer. Everything here is generated in the browser so the design
   works with NO backend. Each function notes the real endpoint it stands in for
   (see ui-design/README.md for the full binding table).
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

  /* ---- a mock customer pool (GET /api/customers) ---- */
  const NAMES = ['Meena Iyer', 'Arjun Nair', 'Kavya Reddy', 'Rohan Mehta', 'Divya Menon', 'Sanjay Rao', 'Ananya Das', 'Vikram Shah', 'Lakshmi Pillai', 'Imran Qureshi', 'Pooja Verma', 'Karthik Subramanian'];
  A.customers = NAMES.map((name, i) => {
    const a = mkAadhaar(), c = mkCard(), m = mkMobile(), p = mkPan();
    return {
      ref: 'C' + String(i + 1).padStart(4, '0'), name, aadhaar: a, card: c, mobile: m, pan: p,
      masked: { AADHAAR: 'XXXX XXXX ' + a.slice(8), CARD: 'XXXX XXXX XXXX ' + c.slice(12), MOBILE: 'XXXXXX' + m.slice(6), PAN: p.slice(0, 2) + 'XXXXXX' + p.slice(8) },
      keys: ['KYC', 'Loans', 'Service', 'Marketing'].map((purpose) => ({ purpose, alive: true, tokens: purpose === 'KYC' ? 2 + rnd(3) : rnd(7), locked_until: purpose === 'KYC' ? Date.now() / 1000 + 5 * 365 * 86400 : null, receipt: null })),
      tokens: [],
    };
  });
  A.customers.forEach((c) => { for (let i = 0; i < 4 + rnd(4); i++) c.tokens.push({ token: tokenFrom(c.aadhaar, 'AADHAAR'), sink: pick(A.SINKS).name, purpose: pick(['Loans', 'Service', 'Marketing']), type: 'AADHAAR', at: Date.now() / 1000 - rnd(3000) }); });

  /* ---- detection of a text (POST /api/process) ---- */
  A.process = function (text, source, sink) {
    const t0 = performance.now();
    const found = [];
    const add = (type, m, p, evidence, protectedFlag, extra) => found.push(Object.assign({ type, start: m.index, end: m.index + m[0].length, p, protected: protectedFlag !== false, evidence, registry: null, repaired: false }, extra || {}));
    let m; const rxA = /\b(\d{4}[ -]?\d{4}[ -]?\d{4})\b/g;
    while ((m = rxA.exec(text))) { const d = m[1].replace(/\D/g, ''); if (verhoeffValid(d)) add('AADHAAR', m, 0.99, { checksum: 1, kw: /aadhaar|uid/i.test(text) ? 1 : 0.1, ctx: 2.4 }, true, { _real: d }); }
    const rxC = /\b(\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4})\b/g;
    while ((m = rxC.exec(text))) { const d = m[1].replace(/\D/g, ''); if (luhnValid(d)) add('CARD', m, 0.98, { checksum: 1, iin: 1, len16: 1, ctx: 1.8 }, true, { _real: d }); }
    const rxM = /(?:\+91[ -]?)?\b[6-9]\d{9}\b/g;
    while ((m = rxM.exec(text))) add('MOBILE', m, 0.93, { plus91: m[0].startsWith('+91') ? 1 : 0, keyfield: /mobile|phone|call/i.test(text) ? 1 : 0, ctx: 1.6 }, true, { _real: m[0].replace(/\D/g, '').slice(-10) });
    const rxP = /\b[A-Z]{5}\d{4}[A-Z]\b/g; while ((m = rxP.exec(text))) add('PAN', m, 0.97, { checksum: 1, kw: /pan/i.test(text) ? 1 : 0.2 }, true, { _real: m[0] });
    const rxO = /(otp|code)[^\d]{0,12}(\d{4,6})/gi; while ((m = rxO.exec(text))) { const q = { index: m.index + m[0].length - m[2].length, 0: m[2] }; add('OTP', q, 0.96, { otp_ctx: 2.9, cue: 1 }, true, { registry: 'hit' }); }
    const rxU = /\b[\w.-]{2,}@(?:oksbi|okhdfc|ybl|paytm|upi|okicici|axl)\b/gi; while ((m = rxU.exec(text))) add('UPI', m, 0.95, { handle: 1, upi_ctx: 1.7, registry: 1, hdot: m[0].includes('.') ? 1 : 0 }, true, { registry: 'hit' });
    const nm = A.customers.map((c) => c.name).concat(['Meena Iyer', 'Ravi Kumar']); [...new Set(nm)].forEach((n) => { const i = text.indexOf(n); if (i >= 0) add('PER', { index: i, 0: n }, 0.87, { ner: 2.1, title: 1, ntok: 2, cue: /customer|mr|ms|dear/i.test(text) ? 1 : 0 }, true); });
    const thr = (A.SINKS.find((s) => s.name === sink) || { threshold: 0.5 }).threshold;
    found.sort((a, b) => a.start - b.start);
    let out = '', last = 0;
    found.forEach((f) => {
      const raw = text.slice(f.start, f.end);
      f.protected = f.p >= thr;
      f.token = f.protected ? (f.type === 'OTP' ? '<OTP:destroyed>' : f.type === 'PER' ? '<PER_' + (1 + rnd(3)) + '>' : f.type === 'UPI' ? raw.replace(/^[^@]+/, 'u' + digits(3) + 'k' + rnd(9) + 'x') : f.type === 'PAN' ? raw.replace(/\d{4}/, digits(4)) : f.type === 'CARD' ? group(tokenFrom(f._real, 'CARD'), 4) : f.type === 'MOBILE' ? (raw.startsWith('+91') ? '+91 ' : '') + String(6 + rnd(4)) + digits(9) : (/\s|-/.test(raw) ? group(tokenFrom(f._real, 'AADHAAR'), 4) : tokenFrom(f._real, 'AADHAAR'))) : null;
      out += text.slice(last, f.start) + (f.protected ? f.token : raw); last = f.end;
    });
    out += text.slice(last);
    // recompute spans in `after` is not needed by the design; the Tokens() helper searches by token string
    return { id: 'E' + Date.now() + rnd(99), at: Date.now() / 1000, source, sink, before: text, after: out, latency_ms: +(performance.now() - t0 + 1.4 + Math.random() * 2).toFixed(1), bypass: false, trace_id: 't' + digits(5), findings: found };
  };
  A.sample = function (kind, who) {
    const c = who === 'stranger' ? { name: 'Ravi Kumar', aadhaar: mkAadhaar(), card: mkCard(), mobile: mkMobile(), pan: mkPan() } : pick(A.customers);
    const T = {
      loan: `{"applicant":"${c.name}","aadhaar":"${group(c.aadhaar, 4)}","pan":"${c.pan}","mobile":"+91 ${c.mobile}","amount":450000,"tenure_months":36}`,
      kyc: `KYC upload ref ${digits(6)} for ${c.name}; aadhaar ${c.aadhaar}; PAN ${c.pan}; doc=passport.pdf`,
      callnote: `Customer ${c.name} called from ${c.mobile}, card ${group(c.card, 4)} was charged twice. Told her to expect a refund in 3 days.`,
      payment: `upi callback ok payer=${c.name.split(' ')[0].toLowerCase()}.${digits(2)}@oksbi amount=1249.00 ref=${digits(8)}`,
      otp: `login attempt user=${c.name.split(' ')[0].toLowerCase()} otp ${digits(6)} sent to ${c.mobile}`,
      chatbot: `Customer ${c.name}, mobile ${c.mobile}, says card ${group(c.card, 4)} was charged twice. Her Aadhaar is ${group(c.aadhaar, 4)}. Draft a polite reply.`,
    };
    const s = A.SAMPLES[kind];
    return A.process(T[kind], s[1], s[2]);
  };
  A.events = [];
  ['loan', 'callnote', 'payment', 'kyc', 'otp', 'chatbot'].forEach((k) => { const e = A.sample(k, 'customer'); e.at -= 30 + rnd(900); A.events.push(e); });
  A.events.sort((a, b) => b.at - a.at);

  /* ---- statistics (GET /api/stats) ---- */
  A.stats = { requests: 1284, values_protected: 4912, values_passed_raw: 3, by_type: { AADHAAR: 1190, MOBILE: 1104, PER: 902, CARD: 611, OTP: 488, UPI: 321, PAN: 296 }, p50_ms: 3.1, p95_ms: 7.4, alerts: 3, open_alerts: 2, customers: 25, tokens_issued: 4912, vault_tokens: 1873, keys_destroyed: 2, merkle_size: 14, uptime_s: 5460, immune: { mode: 'watching' }, replay: { running: true, lines_sent: 18420, flows: ['core-banking -> log-platform', 'mobile-app -> crm-notes'], log_systems: 16 }, model_load_seconds: 6.4 };

  /* ---- false alarms (POST /api/tour/false-alarms) ---- */
  A.falseAlarms = function () {
    const cells = Array.from({ length: 300 }, () => { const n = Math.random() < 0.34 ? 1 + rnd(3) : 0; return [n, Math.random() < 0.012 ? 1 : 0]; });
    return { lines: 300, systems: 16, naive_total: cells.reduce((s, c) => s + c[0], 0), aran_total: cells.reduce((s, c) => s + c[1], 0), cells, seconds: 1.1,
      examples: [['Dec 10 07:31:44 combo sshd[21310]: Failed password port 50010', ['OTP-shaped: 50010'], []], ['blk_-1608999687919862906 size 67108864', ['Aadhaar-shaped: 160899968791'], []], ['Verification code 482913 expires in 10 min', ['OTP-shaped: 482913'], ['OTP']], ['PacketResponder 4235 for block terminating', ['OTP-shaped: 4235'], []], ['request id 4111111111111111 cached', ['Card-shaped: 4111111111111111'], ['Card']], ['uid=1000 gid=1000 pid=29883', ['OTP-shaped: 29883'], []]].map(([line, naive, aran]) => ({ line, naive, aran })) };
  };

  /* ---- checksum steps (POST /api/tour/checksum) ---- */
  A.checksum = function (raw) {
    const d = raw.replace(/\D/g, '');
    if (d.length !== 12 && d.length !== 16) throw new Error('enter 12 digits (Aadhaar) or 16 digits (card)');
    if (d.length === 12) {
      let c = 0; const steps = [];
      [...d].reverse().forEach((ch, i) => { const permuted = P[i % 8][+ch]; const after = D[c][permuted]; steps.push({ position: d.length - i, digit: +ch, permuted, before: c, after }); c = after; });
      return { kind: 'Aadhaar (Verhoeff)', digits: d, valid: c === 0, steps, final: c, correct_check_digit: verhoeffCheck(d.slice(0, -1)) };
    }
    let total = 0; const steps = [];
    [...d].reverse().forEach((ch, i) => { let v = +ch; const dbl = i % 2 === 1; if (dbl) { v *= 2; if (v > 9) v -= 9; } total += v; steps.push({ position: d.length - i, digit: +ch, doubled: dbl, value: v, total }); });
    return { kind: 'Card (Luhn)', digits: d, valid: total % 10 === 0, steps, total, correct_check_digit: luhnCheck(d.slice(0, -1)) };
  };

  /* ---- token forge (POST /api/tour/build-token) ---- */
  A.buildToken = function (sink, aadhaar) {
    const a = aadhaar || mkAadhaar(); const body = a.slice(0, 11); const enc = digits(11); const rc = verhoeffCheck(enc); const off = 1 + rnd(9); const bad = (rc + off) % 10;
    return { aadhaar: a, body, check: a[11], sink, rounds: Array.from({ length: 10 }, (_, i) => ({ round: i + 1, left: digits(5), right: digits(6), aes: Array.from({ length: 12 }, () => rnd(16).toString(16)).join('') })), encrypted: enc, right_check: rc, offset: off, token: enc + bad, token_valid: false, real_valid: true, firewall_token: enc + bad, matches: true };
  };

  /* ---- 12 disguises (POST /api/tour/evasion) ---- */
  A.evasion = function () {
    const a = mkAadhaar(), g = group(a, 4), tok = () => tokenFrom(a, 'AADHAAR');
    const rows = [['Plain number', a], ['Tamil digits', a.replace(/\d/g, (x) => '௦௧௨௩௪௫௬௭௮௯'[x])], ['Devanagari digits', a.replace(/\d/g, (x) => '०१२३४५६७८९'[x])], ['Full-width digits', a.replace(/\d/g, (x) => String.fromCharCode(0xff10 + +x))], ['URL percent-encoding', a.replace(/\d/g, (x) => '%3' + x)], ['JSON \\u escapes', a.replace(/\d/g, (x) => '\\u003' + x)], ['HTML entities', a.replace(/\d/g, (x) => '&#' + (48 + +x) + ';')], ['Dots between groups', a.replace(/(.{4})(.{4})(.{4})/, '$1.$2.$3')], ['Space between every digit', [...a].join(' ')], ['Zero-width space inside', a.slice(0, 6) + '​' + a.slice(6)], ['Split into three fields', '{"a":"' + a.slice(0, 4) + '","b":"' + a.slice(4, 8) + '","c":"' + a.slice(8) + '"}'], ['Whole line in base64', btoa('aadhaar ' + a)]];
    return { customer: pick(A.customers).ref, aadhaar: a, caught: rows.length - (Math.random() < 0.25 ? 0 : 0), rows: rows.map(([trick, before]) => ({ trick, before, after: trick.startsWith('Whole') ? btoa('aadhaar ' + tok()) : before.replace(/[\d०-९௦-௯０-９]{1}/g, (x) => x === ' ' ? x : String(rnd(10))), caught: true, latency_ms: +(2 + Math.random() * 5).toFixed(1) })) };
  };

  /* ---- four sinks, four different tokens (POST /api/tour/tokens) ---- */
  A.tokens = function () {
    const c = pick(A.customers);
    return { customer: c.ref, name: c.name, aadhaar: c.aadhaar, card: c.card, aadhaar_valid: true, card_valid: true,
      sinks: ['log-platform', 'crm-notes', 'loan-vendor', 'marketing-cloud'].map((s) => ({ sink: s, purpose: A.SINKS.find((x) => x.name === s).purpose, aadhaar_token: tokenFrom(c.aadhaar, 'AADHAAR'), card_token: tokenFrom(c.card, 'CARD'), aadhaar_token_passes: false, card_token_passes: false })) };
  };

  /* ---- immune radar (GET /api/tour/immune-radar) ---- */
  A.radarWindows = function (n, alertAt) {
    return Array.from({ length: n }, (_, i) => { const alert = alertAt != null && i === alertAt; return { at: Date.now() / 1000 - (n - i) * 30, src: 'core-banking', sink: 'log-platform', n: 6 + rnd(30), score: alert ? 3.8 : +(Math.random() * 0.9).toFixed(2), alert, z: Array.from({ length: 7 }, (_, k) => alert && (k === 0 || k === 3 || k === 4) ? 0.88 + Math.random() * 0.1 : 0.22 + Math.random() * 0.32) }; });
  };
  A.alerts = [
    { id: 'A3', at: Date.now() / 1000 - 40, src: 'employee-desktop', sink: 'paste-site.example', score: 4.2, n: 11, raw_frac: 0.82, detok_rate: 0, classes: ['AADHAAR', 'CARD', 'PER'], reasons: ['a route never seen while learning (employee-desktop → paste-site.example)', 'most values left raw (82%)', 'a data type new to this route (CARD)'], label: null },
    { id: 'A2', at: Date.now() / 1000 - 420, src: 'loan-origination', sink: 'loan-vendor', score: 3.6, n: 250, raw_frac: 0.0, detok_rate: 0.01, classes: ['AADHAAR', 'MOBILE', 'PER'], reasons: ['volume 40× the learned normal (250 messages in one window)'], label: null },
    { id: 'A1', at: Date.now() / 1000 - 1500, src: 'core-banking', sink: 'log-platform', score: 2.9, n: 18, raw_frac: 0.0, detok_rate: 0.7, classes: ['AADHAAR'], reasons: ['tokens read back 70% of the time (normal is under 2%)'], label: 'attack' },
  ];

  /* ---- results (GET /api/results) ---- */
  A.results = {
    core: { file: 'research/results.json', modified: Date.now() / 1000 - 86400 * 2, e1: { lines: 32000, otp_regex: 67481, otp_context: 6, card_regex: 6086, card_luhn_iin: 81, aadhaar_regex: 366, aadhaar_verhoeff: 4 }, e2: { injected: 20000, token_flagged: 0 }, e3: { sinks: 40, dump_1_accuracy: 1.0 }, e4: [{ mask: 'First 6 + last 4 of a card', candidates: 10000, bits_left: 13.3 }, { mask: 'Last 4 of an Aadhaar', candidates: 10000000, bits_left: 23.3 }, { mask: 'Last 4 of a mobile', candidates: 1000000, bits_left: 19.9 }, { mask: 'Aran token', candidates: 'all 10^11', bits_left: 0 }] },
    ai: { file: 'research/results_ai.json', modified: Date.now() / 1000 - 86400, e9: { lines: 4000, prototype_regex_recall: 0.412, leak_recall: 0.964, prototype_clean_lines_flagged: 212, clean_real_lines_changed: 3, tokens_redetected_as_real_ids: 0 }, e8: { ais: { tpr: 1.0, fpr: 0.006 }, static: { tpr: 0.9, fpr: 0.031 }, iforest: { tpr: 0.2, fpr: 0.012 } } },
    reg: { file: 'research/results_registry.json', modified: Date.now() / 1000 - 3600 * 9, conditions: ['No normaliser', 'Normaliser', 'Normaliser + registry'], tricks: ['Plain number', 'Tamil digits', 'Devanagari digits', 'Full-width digits', 'URL percent-encoding', 'JSON \\u escapes', 'HTML entities', 'Dots between groups', 'Space between every digit', 'Zero-width space inside', 'Split into three fields', 'Whole line in base64'], rate: [[1, 0, 0, 0, 0, 0, 0, 0.02, 0.01, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]] },
  };
  A.merkle = { size: 14, root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', recent: [{ event: 'KEY_DESTROYED', customer: 'C0007', purpose: 'Loans', at: Date.now() / 1000 - 320 }, { event: 'ENROLLED', customer: 'C0025', purpose: '–', at: Date.now() / 1000 - 900 }, { event: 'KEY_DESTROYED', customer: 'C0003', purpose: 'Marketing', at: Date.now() / 1000 - 2400 }, { event: 'ENROLLED', customer: 'C0024', purpose: '–', at: Date.now() / 1000 - 3000 }] };

  /* ---- AI gateway (POST /api/tour/gateway) ---- */
  A.gateway = function (role, text) {
    let i = 0; const map = {}; const prompt = text.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}(?:[ -]?\d{4})?\b/g, (m) => { const t = m.replace(/\D/g, '').length === 16 ? 'CARD' : 'AADHAAR'; map[m] = '<' + t + '_' + (++i) + '>'; return map[m]; }).replace(/\b[6-9]\d{9}\b/g, (m) => '<MOBILE_' + (++i) + '>').replace(/Meena Iyer/g, '<PER_' + (++i) + '>');
    const seen = { 'customer-care': 'Mobile 1, Name 1', 'kyc-officer': 'Aadhaar 1, Card 1, Mobile 1, Name 1', analyst: 'nothing (all masked)' }[role];
    const reply = { 'customer-care': 'Dear Meena Iyer, we are sorry about the double charge on your card ending ' + text.replace(/\D/g, '').slice(-8, -4) + '. A refund will reach you in 3 working days.', 'kyc-officer': 'Dear Meena Iyer (Aadhaar ' + group(mkAadhaar(), 4) + '), the double charge on card ' + group(mkCard(), 4) + ' will be refunded in 3 working days.', analyst: 'Dear customer, we are sorry about the double charge on your card. A refund will reach you in 3 working days.' }[role];
    return { role, reply, provider_saw: [{ content: prompt }], provider_reply: 'Draft reply for ' + prompt.split('says')[0], findings_in_prompt: i, findings_in_reply: 2, ms: { tokenise: 2.4, provider: 0.4 }, provider: 'echo stand-in (no external AI call)', audit_ok: true, audit_size: 9, audit_last: { shown: { MOBILE: 1 }, masked: 3 }, seen };
  };

  A.helpers = { rnd, pick, digits, group, verhoeffValid, luhnValid, mkAadhaar, mkCard, tokenFrom };
})(window.ARAN);
