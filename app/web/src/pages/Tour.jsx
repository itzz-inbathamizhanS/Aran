import React, { useEffect, useState } from 'react'
import { api, usePoll, fmt } from '../api.js'
import { ErrorNote } from '../components.jsx'
import {
  Pipeline, AlarmGrids, ChecksumAnim, TokenForge, DetectScene, EvasionCards, TraceMap, ErasureScene,
  ImmuneScene, GatewayScene, Timeline, CountUp,
} from '../viz.jsx'

/* The guided tour: one idea per chapter, shown as a moving picture of a real server
   response. Words are kept to a headline and one line; the theory sits under "Under the hood". */

function Head({ title, line }) {
  return <header className="chead"><h1>{title}</h1>{line && <p className="tagline">{line}</p>}</header>
}

function Hood({ children }) {
  return <details className="hood"><summary>Under the hood</summary><div className="small">{children}</div></details>
}

// Runs a request once when the chapter opens, and again on demand.
function useLive(fn, auto = true) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = async (...a) => { setBusy(true); setErr(null); try { setData(await fn(...a)) } catch (e) { setErr(e.message) } setBusy(false) }
  useEffect(() => { if (auto) run() }, [])
  return { data, err, busy, run }
}

/* ------------------------------------------------------------------ chapters */

function Start({ next }) {
  return (
    <>
      <Head title="A firewall for data" line="Aran swaps customer numbers for safe tokens before any system stores them. Watch real requests flow through it." />
      <Pipeline />
      <div className="pillars">
        {[['🔍', 'Find', 'even hidden or misspelt values'], ['🛡', 'Protect', 'tokens that can never pass as real'], ['🧾', 'Prove', 'trace leaks, erase with a receipt']].map(([i, t, d], k) => (
          <div key={t} className="pillar" style={{ animationDelay: `${k * 120}ms` }}><span className="pi">{i}</span><b>{t}</b><span className="small muted">{d}</span></div>))}
      </div>
      <button onClick={next}>Start the tour →</button>
    </>
  )
}

function Problem() {
  return (
    <>
      <Head title="Leaks come through side doors" line="Not the main database: logs, vendors, tickets and AI chatbots." />
      <div className="grid3">
        <div className="card stat danger"><div className="stat-v mono">₹<CountUp to={40.9 * 10} format={v => (v / 10).toFixed(1)} /> cr</div><div className="stat-l">average cost of one breach, Indian finance</div><div className="stat-n">IBM, 2026</div></div>
        <div className="card stat danger"><div className="stat-v mono">₹<CountUp to={250} /> cr</div><div className="stat-l">maximum DPDP Act penalty</div><div className="stat-n">DPDP Act, 2023</div></div>
        <div className="card stat danger"><div className="stat-v mono"><CountUp to={35} /> M</div><div className="stat-l">masked card records sold from one firm</div><div className="stat-n">Juspay, 2020</div></div>
      </div>
      <Timeline />
      <div className="qs">{['Where is each customer\'s data now?', 'Which copies are protected?', 'Who leaked this file?', 'Can we prove erasure?'].map((q, k) =>
        <div key={q} className="q" style={{ animationDelay: `${k * 150}ms` }}><span>?</span>{q}</div>)}</div>
      <p className="tagline">Banks cannot answer these four today. Aran answers all four.</p>
      <Hood>Problem analysis, threat model and sources: <code>docs/research/aran-research.md</code> sections 1 and 3.2.</Hood>
    </>
  )
}

function FalseAlarms() {
  const L = useLive(() => api('/tour/false-alarms', {}))
  return (
    <>
      <Head title="Why simple search fails" line="Every red square is a harmless number a plain filter would block. These are 300 real production log lines with no customer data at all." />
      {L.data ? <AlarmGrids r={L.data} key={L.data.seconds + L.data.naive_total} /> : <div className="skeleton" />}
      <div className="row"><button className="secondary" onClick={() => L.run()} disabled={L.busy}>{L.busy ? 'Scanning…' : '↻ 300 new lines'}</button></div>
      <ErrorNote error={L.err} />
      {L.data && <Hood>
        <div className="scroll"><table className="tbl small"><thead><tr><th>Real log line</th><th>Plain pattern saw</th><th>Aran</th></tr></thead>
          <tbody>{L.data.examples.map((e, i) => <tr key={i}><td className="mono">{e.line}</td><td className="danger-t">{e.naive.join(', ')}</td><td>{e.aran.length ? e.aran.join(', ') : 'nothing'}</td></tr>)}</tbody></table></div>
        Lines from Loghub (16 systems). On all 32,000 lines (E1): OTP pattern 67,481 false alarms vs 6 for Aran; cards 6,086 vs 81; Aadhaar 366 vs 4. Code: <code>research/experiment.py</code>.
      </Hood>}
    </>
  )
}

function Checksum() {
  const [d, setD] = useState('')
  const [r, setR] = useState(null)
  const [err, setErr] = useState(null)
  const check = async v => { setErr(null); try { setR(await api('/tour/checksum', { digits: v })) } catch (e) { setR(null); setErr(e.message) } }
  const gen = async kind => { const g = await api('/tour/generate'); const v = kind === 'card' ? g.card : g.aadhaar; setD(v); check(v) }
  useEffect(() => { gen('aadhaar') }, [])
  const clean = d.replace(/\D/g, '')
  const typo = () => { const i = 4; const v = clean.slice(0, i) + String((Number(clean[i]) + 3) % 10) + clean.slice(i + 1); setD(v); check(v) }
  const swap = () => { const v = clean.slice(0, 2) + clean[3] + clean[2] + clean.slice(4); setD(v); check(v) }
  return (
    <>
      <Head title="The last digit is a lock" line="Every Aadhaar and card ends in a check digit computed from the others. Real numbers always pass. Watch the maths." />
      <div className="row">
        <input className="mono grow" value={d} onChange={e => setD(e.target.value.replace(/[^0-9 ]/g, ''))} placeholder="12-digit Aadhaar or 16-digit card" aria-label="Number to check" />
        <button className="secondary" onClick={() => check(d)} disabled={!d}>Check</button>
        <button className="secondary" onClick={() => gen('aadhaar')}>New Aadhaar</button>
        <button className="secondary" onClick={() => gen('card')}>New card</button>
      </div>
      {(clean.length === 12 || clean.length === 16) && <div className="row tight">
        <button className="ghost" onClick={typo}>✎ Mistype one digit</button>
        <button className="ghost" onClick={swap}>⇄ Swap two neighbours</button>
      </div>}
      <ErrorNote error={err} />
      {r && <ChecksumAnim r={r} key={r.digits} />}
      <Hood>{r && r.kind.startsWith('Aadhaar')
        ? <>Verhoeff works in the dihedral group D5 (symmetries of a pentagon, 10 elements, the dial above). Each digit is shuffled by a position-dependent permutation, then combined with the running value through the group table. Valid numbers end at 0. It catches every single-digit typo and every swap of neighbours. Code: <code>research/aran_core.py</code>.</>
        : <>Luhn doubles every second digit from the right (subtracting 9 if over 9) and adds everything; valid totals are multiples of 10. Code: <code>research/aran_core.py</code>.</>}</Hood>
    </>
  )
}

const FSINKS = [['log-platform', 'Log platform'], ['crm-notes', 'CRM notes'], ['loan-vendor', 'Loan vendor'], ['marketing-cloud', 'Marketing']]
function CoreIdea() {
  const [sink, setSink] = useState('log-platform')
  const L = useLive((s, a) => api('/tour/build-token', { sink: s || sink, aadhaar: a }))
  const pick = s => { setSink(s); L.run(s, L.data && L.data.aadhaar) }
  return (
    <>
      <Head title="Building a token" line="Same length, same look, but the last digit is wrong on purpose, so no scanner can ever mistake it for a real number." />
      <div className="chips">{FSINKS.map(([k, l]) => <button key={k} className={'chip' + (sink === k ? ' on' : '')} onClick={() => pick(k)}>for {l}</button>)}</div>
      {L.data ? <TokenForge r={L.data} key={L.data.token} /> : <div className="skeleton" />}
      <div className="row"><button className="ghost" onClick={() => L.run(sink)} disabled={L.busy}>↻ Another Aadhaar</button></div>
      <ErrorNote error={L.err} />
      <p className="small muted">Pick another system: the same Aadhaar becomes a different token for each one. That is what makes leaks traceable (chapter 8).</p>
      <Hood>Theorem 1 (perfect separability): every real identifier passes Verhoeff or Luhn; no Aran token does. The body is encrypted with NIST SP 800-38G FF1 (format-preserving AES, ten Feistel rounds, tweak = the receiving system's name); the check digit is the correct one plus a keyed offset from 1 to 9. Customers enrolled in DPDP scope get random vault tokens instead, built the same way. Tested on 20,000 tokens: 0 taken for real (E2). Code: <code>research/aran_core.py</code>, <code>app/server/engine.py</code> (tour_build_token).</Hood>
    </>
  )
}

const KINDS = [['callnote', 'Hinglish call note'], ['loan', 'Loan application'], ['chatbot', 'Chatbot prompt'], ['payment', 'UPI payment log'], ['otp', 'OTP log'], ['kyc', 'KYC record']]
function Detect() {
  const [kind, setKind] = useState('callnote')
  const L = useLive(k => api('/sample', { kind: k || kind }))
  const pick = k => { setKind(k); L.run(k) }
  return (
    <>
      <Head title="Finding what is sensitive" line="Names, phones, OTPs and UPI IDs have no check digit. Aran weighs clues and gives each value a measured probability." />
      <div className="chips">{KINDS.map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => pick(k)}>{l}</button>)}</div>
      {L.data ? <DetectScene ev={L.data} /> : <div className="skeleton" />}
      <ErrorNote error={L.err} />
      <Hood>Evidence is fused per type by a logistic stacker and calibrated with isotonic regression, so 90% is right about 9 times in 10 (calibration error 0.015, E7). Names: CRF model, F1 0.85 English, 0.76 Hindi, 0.69 Hinglish (E5). The bank's own customers and recently sent OTPs are matched through HMAC entries in a cuckoo filter, so the list itself reveals nothing. Code: <code>research/ai/</code>, <code>research/firewall/registry.py</code>.</Hood>
    </>
  )
}

function Evasion() {
  const L = useLive(() => api('/tour/evasion', {}))
  return (
    <>
      <Head title="Disguises do not work" line="One Aadhaar hidden 12 ways, each sent through the live firewall. Aran undoes the disguise, then checks." />
      {L.data ? <EvasionCards r={L.data} key={L.data.aadhaar} /> : <div className="skeleton" />}
      <div className="row"><button className="secondary" onClick={() => L.run()} disabled={L.busy}>↻ Another customer</button></div>
      <ErrorNote error={L.err} />
      <Hood>The normaliser keeps a map from cleaned text back to original characters, so the token is written back in the same disguise: split fields stay split, base64 is decoded, cleaned and re-encoded. It also repairs one-digit typos against the customer registry. Measured: hidden identifiers removed 8.3% before, 100% after (E10); typo'd identifiers 0% before, 99.2% after (E12). Code: <code>research/firewall/normalise.py</code>.</Hood>
    </>
  )
}

function Trace() {
  const L = useLive(() => api('/tour/tokens', {}))
  const leak = async sink => api('/trace', { dump: L.data.sinks.find(s => s.sink === sink).after })
  return (
    <>
      <Head title="A leaked file names its source" line="Each system received a different token for the same customer. Leak one and watch Aran trace it back." />
      {L.data ? <TraceMap t={L.data} onLeak={leak} key={L.data.aadhaar} /> : <div className="skeleton" />}
      <div className="row"><button className="ghost" onClick={() => L.run()} disabled={L.busy}>↻ Another customer</button></div>
      <ErrorNote error={L.err} />
      <Hood>Theorem 2: each system's tokens come from a different pseudorandom permutation (FF1 tweak = system name, or a fresh vault token per system), so two systems sharing a token is negligible, and the most likely source of a dump is the system whose tokens it holds. Measured (E3): 100% correct across 40 systems, even from a single token. Paste any dump on the Leak trace page. Code: <code>app/server/engine.py</code> (trace).</Hood>
    </>
  )
}

function Erase() {
  return (
    <>
      <Head title="Erase everywhere, with proof" line="Each customer's tokens are locked by their own key per purpose. Destroy the key and every copy, anywhere, becomes meaningless." />
      <ErasureScene />
      <Hood>Each (customer, purpose) has its own AES-256-GCM key; vault tokens store only ciphertext. Erasure overwrites and drops the key, appends a KEY_DESTROYED event to an RFC 6962 Merkle log, and signs the event, root and inclusion proof with Ed25519 and the post-quantum ML-DSA-65 together, so the receipt stays unforgeable after quantum computers arrive. Your browser re-runs the inclusion proof with WebCrypto. KYC is retention-locked for 5 years under PMLA rules. Whether key destruction counts as DPDP erasure still needs legal confirmation. Code: <code>research/firewall/shredder.py</code>.</Hood>
    </>
  )
}

function Immune({ go }) {
  return (
    <>
      <Head title="An immune system for data flows" line="It learns what normal traffic looks like, then flags anything outside it, with no list of known attacks." />
      <ImmuneScene go={go} />
      <Hood>Negative selection with variable-radius detectors (V-detector) over 7 features per (source, sink, 30-second window). Each feature is scaled so the range seen while learning sits between 0.1 and 0.7: the green band on the radar. Confirming an attack adds memory detectors; marking a false alarm removes the ones covering it. Measured on six exfiltration scenarios (E8): 100% caught at 0.6% false alarms, vs 90% for static rules and 20% for Isolation Forest. Code: <code>research/immune/</code>.</Hood>
    </>
  )
}

function Gateway() {
  return (
    <>
      <Head title="Safe AI chatbots" line="Staff can ask an AI about a customer. The AI only ever sees placeholders, and each role sees only what it is allowed to." />
      <GatewayScene />
      <Hood>Same value, same placeholder within a conversation, so the model can still reason. The reply is scanned again; placeholders resolve only for the caller's own conversation and role, and every resolution is appended to a hash-chained audit log. Without <code>ARAN_LLM_URL</code> the provider is the echo stand-in from the gateway's tests, which repeats the prompt back (the hardest case). Code: <code>research/gateway/ai_gateway.py</code>.</Hood>
    </>
  )
}

function Evidence({ go }) {
  const [r] = usePoll('/results', 0)
  const core = r && r['E1-E4 core'] && r['E1-E4 core'].data
  const ai = r && r['E5-E9 AI and immune'] && r['E5-E9 AI and immune'].data
  const bars = core && ai ? [
    ['OTP false alarms on real logs', core.e1_total.otp_regex, core.e1_total.otp_context, 'fewer is better'],
    ['Sensitive values removed (%)', Math.round(ai.e9_firewall.prototype_regex_recall * 100), Math.round(ai.e9_firewall.leak_recall * 100), 'more is better'],
  ] : []
  return (
    <>
      <Head title="The evidence" line="Read live from the result files the experiments wrote. Anyone can re-run them." />
      {core && ai && <>
        <div className="grid3">
          <div className="card stat"><div className="stat-v mono">{core.e2.token_flagged}<span className="muted"> / <CountUp to={core.e2.injected} /></span></div><div className="stat-l">tokens mistaken for real</div></div>
          <div className="card stat"><div className="stat-v mono"><CountUp to={core.e3.dump_1_accuracy * 100} />%</div><div className="stat-l">leaks traced to the right one of {core.e3.sinks} systems</div></div>
          <div className="card stat"><div className="stat-v mono"><CountUp to={ai.e8_immune.ais.tpr * 100} />%</div><div className="stat-l">data-flow attacks caught</div></div>
        </div>
        {bars.map(([t, a, b, n]) => { const m = Math.max(a, b); return (
          <div key={t} className="vs">
            <div className="vs-h"><b>{t}</b><span className="small muted">{n}</span></div>
            <div className="vs-row"><span>Simple rules</span><div className="vs-bar bad"><div style={{ width: `${(a / m) * 100}%` }} /></div><span className="mono"><CountUp to={a} /></span></div>
            <div className="vs-row"><span>Aran</span><div className="vs-bar good"><div style={{ width: `${Math.max(0.5, (b / m) * 100)}%` }} /></div><span className="mono"><CountUp to={b} /></span></div>
          </div>) })}
      </>}
      <button className="secondary" onClick={() => go('results')}>All results and live test runs →</button>
      <h3>Not finished yet</h3>
      <div className="limits">{[['Names and addresses', '74% and 90% caught'], ['Speed', '~300 lines/s per core; Rust core planned'], ['Erasure in law', 'needs a lawyer\'s confirmation'], ['Keys', 'in memory here; an HSM in a bank']].map(([a, b]) =>
        <div key={a} className="lim"><b>{a}</b><span className="small muted">{b}</span></div>)}</div>
      <div className="chips">{['DPDP Act 2023 and Rules 2025', 'CERT-In 2022', 'UIDAI Data Vault', 'RBI tokenisation', 'RBI FREE-AI', 'PCI DSS', 'PMLA retention'].map(x => <span key={x} className="chip">{x}</span>)}</div>
    </>
  )
}

const GLOSSARY = [
  ['Token', 'A safe stand-in for a sensitive value.'],
  ['Check digit', 'Last digit of an Aadhaar or card, computed from the others.'],
  ['Verhoeff / Luhn', 'The check-digit methods for Aadhaar and cards.'],
  ['Sink', 'Any system that receives data: logs, CRM, vendor, AI chatbot.'],
  ['False alarm', 'Flagging something harmless as sensitive.'],
  ['Calibrated probability', '90% means right about 9 times in 10.'],
  ['Normaliser', 'Undoes disguises before checking.'],
  ['Crypto-shredding', 'Erasing by destroying the key, not every copy.'],
  ['Merkle log', 'An append-only record whose fingerprint changes if edited.'],
  ['Immune layer', 'Learns normal data flows and flags the rest.'],
  ['DPDP Act', 'India\'s Digital Personal Data Protection Act, 2023.'],
]

function Glossary() {
  return (
    <>
      <Head title="Glossary and team" />
      <div className="gloss">{GLOSSARY.map(([t, d]) => <div key={t} className="gl"><b>{t}</b><span className="small muted">{d}</span></div>)}</div>
      <h3>Built at KARE</h3>
      <div className="team">{[['IS', 'Inbathamizhan S', 'Team lead · Cybersecurity'], ['AA', 'Aasif Ahmed A', 'Cybersecurity'], ['SA', 'SN Arun Vijay', 'AI/ML'], ['BM', 'Bharadhwaj M', 'AI/ML']].map(([i, n, r]) => (
        <div key={n} className="member"><span className="avatar">{i}</span><div><b>{n}</b><div className="small muted">{r}</div></div></div>))}</div>
      <p className="small muted">Banking, Financial Services and FinTech · Prevent Sensitive Data Leakage · github.com/itzz-inbathamizhans/aran</p>
    </>
  )
}

const CHAPTERS = [
  ['Start', Start],
  ['The problem', Problem],
  ['Simple filters fail', FalseAlarms],
  ['Check digits', Checksum],
  ['Building a token', CoreIdea],
  ['Finding data', Detect],
  ['Disguises', Evasion],
  ['Tracing a leak', Trace],
  ['Erasure', Erase],
  ['Immune system', Immune],
  ['AI chatbots', Gateway],
  ['Evidence', Evidence],
  ['Glossary', Glossary],
]

export default function Tour({ go }) {
  const fromHash = () => { const m = location.hash.match(/^#tour\/(\d+)/); return m ? Math.min(Number(m[1]), CHAPTERS.length - 1) : 0 }
  const [i, setI] = useState(fromHash)
  useEffect(() => { const f = () => setI(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  useEffect(() => {
    const k = e => { if (e.target.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight' && i < CHAPTERS.length - 1) to(i + 1)
      if (e.key === 'ArrowLeft' && i > 0) to(i - 1) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [i])
  const to = n => { location.hash = 'tour/' + n; window.scrollTo(0, 0) }
  const C = CHAPTERS[i][1]
  return (
    <div className="tour">
      <nav className="dots" aria-label="Chapters">{CHAPTERS.map(([t], n) => (
        <button key={t} className={'dotb' + (n === i ? ' on' : n < i ? ' seen' : '')} onClick={() => to(n)} title={t} aria-label={`${n + 1}. ${t}`}>
          <span className="dn">{n + 1}</span><span className="dt">{t}</span></button>))}</nav>
      <select className="chap-select" value={i} onChange={e => to(Number(e.target.value))} aria-label="Chapter">
        {CHAPTERS.map(([t], n) => <option key={t} value={n}>{n + 1}. {t}</option>)}</select>
      <article className="chapter" key={i}><C go={go} next={() => to(i + 1)} /></article>
      <div className="row-between tour-nav">
        <button className="secondary" disabled={i === 0} onClick={() => to(i - 1)}>← {i > 0 ? CHAPTERS[i - 1][0] : 'Back'}</button>
        <span className="small muted">← → keys work too</span>
        {i < CHAPTERS.length - 1 ? <button onClick={() => to(i + 1)}>{CHAPTERS[i + 1][0]} →</button>
          : <button onClick={() => go('traffic')}>Open the full console →</button>}
      </div>
    </div>
  )
}
