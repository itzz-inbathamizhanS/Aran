import React, { useEffect, useState } from 'react'
import { api, usePoll, fmt, pct } from '../api.js'
import { Eyebrow, IdStrip, Marked, Tokens, Bar, TYPE_LABEL, ErrorNote } from '../components.jsx'

/* A guided tour for reviewers who know nothing about Aran. Every chapter explains one
   idea in plain words and then runs it live against the server. Nothing on these pages
   is pre-recorded: each "Run it" button calls Aran's real code. */

function Run({ label, onRun, children, busyLabel = 'Running…' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const go = async () => { setBusy(true); setErr(null); try { await onRun() } catch (e) { setErr(e.message) } setBusy(false) }
  return (
    <div className="card try">
      <div className="row-between"><div className="eyebrow">TRY IT · LIVE</div>
        <button onClick={go} disabled={busy}>{busy ? busyLabel : label}</button></div>
      {children}
      <ErrorNote error={err} />
    </div>
  )
}

function Happened({ children }) { return <div className="happened"><div className="hdr">What just happened</div><div>{children}</div></div> }

function Hood({ children }) {
  return <details className="hood"><summary>Under the hood (for technical reviewers)</summary><div className="small">{children}</div></details>
}

function Plain({ children }) { return <p className="plain">{children}</p> }

/* ------------------------------------------------------------------ chapters */

function Start({ next }) {
  return (
    <>
      <h1>Aran in one minute</h1>
      <Plain>Banks pass customers' Aadhaar numbers, card numbers, PAN, phone numbers and one-time passwords between hundreds of computer systems every second. Some of those systems write everything into log files, send it to outside vendors, or paste it into AI chatbots. That is how most real data leaks happen.</Plain>
      <Plain><b>Aran is a firewall for data, not for networks.</b> It sits on the paths data travels, finds sensitive values, and swaps them for safe stand-ins called <i>tokens</i> before anything is stored or shared. Its trick: Aran's tokens are built so that anyone can prove they are not real numbers, and every system gets its own tokens, so if a file ever leaks, the tokens inside it name the system that leaked it.</Plain>
      <div className="grid3">
        <div className="card"><div className="big">1</div><b>Find</b><p className="small muted">Spot sensitive values, even hidden or misspelt ones, with a measured confidence.</p></div>
        <div className="card"><div className="big">2</div><b>Protect</b><p className="small muted">Replace them with tokens that look like the original but can never pass as real.</p></div>
        <div className="card"><div className="big">3</div><b>Prove</b><p className="small muted">Trace any leak to its source, spot unusual data flows, and erase a customer with a signed receipt.</p></div>
      </div>
      <div className="card note">
        <b>How to use this tour.</b> Each chapter explains one idea in everyday words, then has a <b>Try it</b> box. Pressing its button runs Aran's real code on this server right now, and the result is explained underneath. Technical reviewers can open <i>Under the hood</i> for the theory and the source file. It takes about 15 minutes.
        <div className="small muted">All customer numbers here are generated: they pass the official checks but belong to no real person.</div>
      </div>
      <button onClick={next}>Start the tour →</button>
    </>
  )
}

function Problem() {
  return (
    <>
      <h1>The problem: data leaks through the side doors</h1>
      <Plain>When people think of a bank breach they imagine a hacker breaking into the main database. In practice, most leaks come from copies: debug logs that recorded a full customer record, a vendor that received a spreadsheet, a support ticket, or an employee pasting a complaint into an AI chatbot. Each copy is one more place a leak can start.</Plain>
      <div className="grid3">
        <div className="card stat danger"><div className="stat-v mono">₹40.9 cr</div><div className="stat-l">average cost of one breach in Indian financial services</div><div className="stat-n">IBM Cost of a Data Breach, 2026</div></div>
        <div className="card stat danger"><div className="stat-v mono">₹250 cr</div><div className="stat-l">maximum DPDP Act penalty for failing to protect personal data</div><div className="stat-n">Digital Personal Data Protection Act, 2023</div></div>
        <div className="card stat danger"><div className="stat-v mono">35 million</div><div className="stat-l">masked card records sold from one payment company</div><div className="stat-n">Juspay, 2020: masked data still sells</div></div>
      </div>
      <h3>Real Indian and global leaks, and what each teaches</h3>
      <div className="scroll"><table className="tbl">
        <thead><tr><th>Year</th><th>What happened</th><th>Lesson</th></tr></thead>
        <tbody>
          <tr><td>2016</td><td>About 3.2 million Indian debit cards exposed through malware at a payment processor</td><td>Leaks happen outside the bank, at partners</td></tr>
          <tr><td>2019</td><td>SBI's SMS service logs left on an open server showed balances and transactions</td><td>Log files leak, not just databases</td></tr>
          <tr><td>2020</td><td>35 million masked card records from Juspay sold on the dark web months later</td><td>The first sign is often a dump found outside</td></tr>
          <tr><td>2023</td><td>Samsung staff pasted source code and meeting notes into ChatGPT</td><td>AI tools are a new exit path old tools do not watch</td></tr>
          <tr><td>2024</td><td>Records of 31 million Star Health customers sold through Telegram bots</td><td>The first question is always "which system leaked it?"</td></tr>
        </tbody></table></div>
      <Plain>Today a bank usually cannot answer four questions: <b>Where</b> are each customer's numbers right now? <b>Which</b> copies are protected? <b>Who</b> leaked this file? <b>Can we prove</b> a customer's data is erased everywhere, as the DPDP Act requires? Aran is designed to answer all four.</Plain>
      <Hood>Full problem analysis, threat model, and sources: <code>docs/research/aran-research.md</code> sections 1 and 3.2.</Hood>
    </>
  )
}

function FalseAlarms() {
  const [r, setR] = useState(null)
  return (
    <>
      <h1>Why simple search-and-hide fails</h1>
      <Plain>The obvious fix is to search every message for anything shaped like an Aadhaar (12 digits), a card (16 digits) or an OTP (4 to 8 digits) and hide it. The trouble is that computer logs are full of numbers that only look like these: timestamps, process IDs, order numbers, storage block IDs. A filter that cries wolf thousands of times a day gets switched off, and then real leaks pass through.</Plain>
      <Run label="Scan 300 real log lines" busyLabel="Scanning…" onRun={async () => setR(await api('/tour/false-alarms', {}))}>
        <p className="small muted">Picks 300 random lines from real production logs of 16 systems (the public Loghub dataset). These logs contain no Indian identifiers at all, so every hit is a false alarm.</p>
        {r && <>
          <div className="two">
            <div className="card stat danger"><div className="stat-v mono">{fmt(r.naive_total)}</div><div className="stat-l">false alarms from plain patterns</div>
              <div className="stat-n">{Object.entries(r.naive).map(([k, v]) => `${k} ${v}`).join(' · ')}</div></div>
            <div className="card stat"><div className="stat-v mono">{fmt(r.aran_total)}</div><div className="stat-l">false alarms from Aran</div>
              <div className="stat-n">{r.aran_total ? Object.entries(r.aran).map(([k, v]) => `${TYPE_LABEL[k] || k} ${v}`).join(' · ') : 'none'} · {r.seconds}s for {r.lines} lines</div></div>
          </div>
          <div className="scroll"><table className="tbl small"><thead><tr><th>Real log line</th><th>Plain pattern saw</th><th>Aran saw</th></tr></thead>
            <tbody>{r.examples.map((e, i) => <tr key={i}><td className="mono">{e.line}</td><td className="danger-t">{e.naive.join(', ')}</td><td>{e.aran.length ? e.aran.join(', ') : 'nothing'}</td></tr>)}</tbody></table></div>
          <Happened>Plain patterns flagged {fmt(r.naive_total)} harmless numbers in just {r.lines} lines. Aran flagged {fmt(r.aran_total)}, because it does not judge a number by its length alone: it checks the built-in check digit, reads the words around it, and asks whether the bank actually issued it. The next chapters show each of these.</Happened>
        </>}
      </Run>
      <Hood>On all 32,000 Loghub lines (experiment E1): plain OTP pattern 67,481 false alarms vs 6 for Aran's context rules; cards 6,086 vs 81; Aadhaar 366 vs 4. Code: <code>research/experiment.py</code>, results in <code>research/results.json</code>.</Hood>
    </>
  )
}

function Checksum() {
  const [d, setD] = useState('')
  const [r, setR] = useState(null)
  const [err, setErr] = useState(null)
  const check = async v => { setErr(null); try { setR(await api('/tour/checksum', { digits: v })) } catch (e) { setR(null); setErr(e.message) } }
  const gen = async () => { const g = await api('/tour/generate'); setD(g.aadhaar); check(g.aadhaar) }
  const typo = () => {
    const i = 4; const c = String((Number(d[i]) + 3) % 10)
    const v = d.slice(0, i) + c + d.slice(i + 1); setD(v); check(v)
  }
  const swap = () => { const v = d.slice(0, 2) + d[3] + d[2] + d.slice(4); setD(v); check(v) }
  return (
    <>
      <h1>Every Aadhaar and card carries a built-in check</h1>
      <Plain>The last digit of every Aadhaar number and every bank card is not random. It is a <b>check digit</b>, calculated from all the other digits. If someone mistypes one digit, the calculation no longer matches, and the number is rejected. Aadhaar uses a method called <b>Verhoeff</b>; cards use one called <b>Luhn</b>. Real numbers always pass. That fact is the foundation of Aran.</Plain>
      <div className="card try">
        <div className="eyebrow">TRY IT · LIVE</div>
        <div className="row">
          <input className="mono grow" value={d} onChange={e => setD(e.target.value.replace(/[^0-9 ]/g, ''))} placeholder="12-digit Aadhaar or 16-digit card" />
          <button className="secondary" onClick={() => check(d)} disabled={!d}>Check it</button>
          <button className="secondary" onClick={gen}>Generate a test Aadhaar</button>
        </div>
        {d.replace(/\D/g, '').length === 12 && <div className="row">
          <button className="ghost" onClick={typo}>Change one digit</button>
          <button className="ghost" onClick={swap}>Swap two neighbouring digits</button>
        </div>}
        <ErrorNote error={err} />
        {r && <>
          <IdStrip digits={r.digits} kind={r.valid ? 'real' : 'token'} label={r.valid ? `passes ${r.kind.split('(')[1].replace(')', '')} · could be real` : `fails ${r.kind.split('(')[1].replace(')', '')} · the last digit should be ${r.correct_check_digit}`} />
          <Happened>{r.valid
            ? <>The server ran the {r.kind.split('(')[1].replace(')', '')} calculation over all {r.digits.length} digits and it came out {r.kind.startsWith('Aadhaar') ? 'to 0' : 'to a multiple of 10'}, so this number is internally consistent. Now press "Change one digit" or "Swap two neighbouring digits".</>
            : <>The calculation no longer comes out right, so this cannot be a real {r.kind.startsWith('Aadhaar') ? 'Aadhaar' : 'card'} number. Verhoeff catches every single mistyped digit and every swap of two neighbours, which are the most common typing mistakes.</>}</Happened>
          <Hood>
            {r.kind.startsWith('Aadhaar') ? <>Verhoeff works in the dihedral group D5 (the symmetries of a pentagon). Each digit is shuffled by a position-dependent permutation P, then combined with a running value through the group table D. A valid number ends at 0.
              <div className="scroll"><table className="tbl small"><thead><tr><th>Position</th><th>Digit</th><th>After permutation P</th><th>Running value</th></tr></thead>
                <tbody>{r.steps.map(s => <tr key={s.position}><td>{s.position}</td><td className="mono">{s.digit}</td><td className="mono">{s.permuted}</td><td className="mono">{s.before} → {s.after}</td></tr>)}</tbody></table></div>
              Final value {r.final}. Code: <code>research/aran_core.py</code> (verhoeff_valid).</>
              : <>Luhn doubles every second digit from the right (subtracting 9 if the result is over 9) and adds everything up. Total {r.total}; valid if divisible by 10. Code: <code>research/aran_core.py</code> (luhn_valid).</>}
          </Hood>
        </>}
      </div>
    </>
  )
}

function CoreIdea() {
  const [r, setR] = useState(null)
  return (
    <>
      <h1>The core idea: tokens that can never pass as real</h1>
      <Plain>Ordinary protection replaces a number with another random number of the same shape, so old systems keep working. But then nobody can tell a protected number from a leaked real one, and every alert becomes a guessing game.</Plain>
      <Plain><b>Aran's tokens keep the same length and look, but their last digit is deliberately wrong.</b> A real Aadhaar always passes the Verhoeff check; an Aran token never does. So any scanner, anywhere, can prove in microseconds whether a number it finds is a real customer's (a leak) or an Aran token (safe).</Plain>
      <Run label="Protect a customer's Aadhaar and card" onRun={async () => setR(await api('/tour/tokens', {}))}>
        {r && <>
          <div className="two">
            <div><div className="small muted">{r.customer} · {r.name} · real (generated) Aadhaar</div><IdStrip digits={r.aadhaar} kind="real" label="passes Verhoeff · real" /></div>
            <div><div className="small muted">What the log platform stored instead</div><IdStrip digits={r.sinks[0].aadhaar_token} kind="token" label={r.sinks[0].aadhaar_token_passes ? 'passes (unexpected)' : 'fails Verhoeff · Aran token'} /></div>
          </div>
          <div className="two">
            <div><div className="small muted">Real (generated) card</div><IdStrip digits={r.card} kind="real" label="passes Luhn · real" /></div>
            <div><div className="small muted">Card token</div><IdStrip digits={r.sinks[0].card_token} kind="token" label={r.sinks[0].card_token_passes ? 'passes (unexpected)' : 'fails Luhn · Aran token'} /></div>
          </div>
          <Happened>The server sent this customer's Aadhaar and card through the firewall. Both came out as numbers of exactly the same length, but each fails its check digit, so no scanner will ever mistake them for real numbers. Only the bank, holding the key, can turn a token back into the real number.</Happened>
        </>}
      </Run>
      <Hood>Theorem 1 (perfect separability): no Aran token passes Verhoeff or Luhn, and every real identifier does. The body is encrypted with NIST SP 800-38G FF1 (format-preserving encryption) or, for customers in DPDP scope, drawn at random and stored encrypted in a vault; the check digit is the correct one plus a keyed non-zero offset. Tested on 20,000 tokens: 0 flagged as real (E2). Code: <code>research/aran_core.py</code>, <code>research/firewall/aran_firewall.py</code>, <code>research/firewall/shredder.py</code>.</Hood>
    </>
  )
}

function Detect() {
  const [ev, setEv] = useState(null)
  const [pick, setPick] = useState(null)
  return (
    <>
      <h1>Finding what is sensitive, with a confidence you can trust</h1>
      <Plain>Not everything sensitive has a check digit. Names, addresses, phone numbers, UPI IDs and one-time passwords have none, and they hide inside free text, sometimes in Hindi or Hinglish. Aran's detector weighs several clues and gives every value a probability, like a doctor combining test results:</Plain>
      <ul className="plain">
        <li><b>The check digit</b> for Aadhaar and cards (chapter 3).</li>
        <li><b>The words around it</b>: "OTP", "mobile", "Aadhaar". A small AI model learned which nearby words matter.</li>
        <li><b>A name-and-address finder</b>: an AI model trained on English, Hindi and Hinglish text.</li>
        <li><b>The bank's own records</b>: is this the phone number of an actual customer? Was this exact OTP just sent on this request? This is checked against a scrambled list, so the list itself reveals nothing.</li>
      </ul>
      <Run label="Send a Hinglish call-centre note" onRun={async () => { const e = await api('/sample', { kind: 'callnote' }); setEv(e); setPick(e.findings[0] || null) }}>
        {ev && <>
          <div className="two">
            <div><div className="small muted">What the call-centre app sent (click a highlight)</div><Marked text={ev.before} findings={ev.findings} active={pick} onPick={setPick} /></div>
            <div><div className="small muted">What the CRM actually stored</div><Tokens text={ev.after} findings={ev.findings} /></div>
          </div>
          {pick && <div className="card detail">
            <b>{TYPE_LABEL[pick.type] || pick.type}: probability {pct(pick.p)}</b>
            <Bar p={pick.p} threshold={0.5} />
            <div className="small muted">The marker is the line this system draws: at or above it, the value is replaced.</div>
            <div className="chips">{Object.entries(pick.evidence).map(([k, v]) => <span key={k} className="chip mono">{k} {v}</span>)}{pick.registry && <span className="chip mono">registry {pick.registry}</span>}</div>
          </div>}
          <Happened>Aran found {ev.findings.length} sensitive values in {ev.latency_ms} ms and replaced each one before the note reached the CRM. Click any highlighted value to see the clues and the probability behind the decision.</Happened>
        </>}
      </Run>
      <Hood>Evidence is fused per type by a logistic stacker and calibrated with isotonic regression, so "90%" really means right about 9 times in 10 (calibration error 0.015, E7). Names: CRF model, F1 0.85 English, 0.76 Hindi, 0.69 Hinglish (E5). Own-customer registry: HMAC entries in a cuckoo filter; OTPs are matched to the trace ID that issued them. Code: <code>research/ai/</code>, <code>research/firewall/registry.py</code>.</Hood>
    </>
  )
}

function Evasion() {
  const [r, setR] = useState(null)
  return (
    <>
      <h1>Catching numbers people try to hide</h1>
      <Plain>A careless developer, or a dishonest insider, can slip a number past a simple filter by writing it differently: in Tamil or Hindi digits, with dots or spaces in between, encoded for a web address, or wrapped in base64 (a common computer encoding). Aran first undoes all of these, then checks the result.</Plain>
      <Run label="Hide one Aadhaar 12 different ways" busyLabel="Sending 12 requests…" onRun={async () => setR(await api('/tour/evasion', {}))}>
        {r && <>
          <div className="scroll"><table className="tbl small">
            <thead><tr><th>Trick</th><th>What was sent</th><th>What was stored</th><th>Caught</th></tr></thead>
            <tbody>{r.rows.map(x => <tr key={x.trick}><td>{x.trick}</td><td className="mono">{x.before}</td><td className="mono">{x.after}</td>
              <td>{x.caught ? <span className="pill ok">yes</span> : <span className="pill danger">no</span>}</td></tr>)}</tbody></table></div>
          <Happened>The same customer's Aadhaar was disguised {r.rows.length} ways and each version went through the live firewall. Aran caught {r.caught} of {r.rows.length}. Notice that it replaces the value <i>in the same disguise</i>: split fields stay split, and the base64 line is decoded, cleaned and re-encoded, so the receiving system still works.</Happened>
        </>}
      </Run>
      <Hood>The normaliser keeps a map from the cleaned text back to the original characters, so replacement happens in place. It also repairs single-digit typos by checking the 108 one-digit edits and 11 neighbour swaps against the own-customer registry. Measured (E10): hidden identifiers removed 8.3% before, 100% after; typo'd identifiers 0% before, 99.2% after (E12). Code: <code>research/firewall/normalise.py</code>.</Hood>
    </>
  )
}

function Trace() {
  const [t, setT] = useState(null)
  const [res, setRes] = useState(null)
  const [leaker, setLeaker] = useState(null)
  return (
    <>
      <h1>A leaked file names the system that leaked it</h1>
      <Plain>When a stolen file turns up on the dark web, the first question is "which of our systems or vendors did this come from?" Today that takes weeks of digging through access logs. With Aran, <b>every system receives different tokens for the same customer</b>. The tokens in a leaked file therefore point straight back to the one system that received them.</Plain>
      <Run label="Send one customer to four systems" onRun={async () => { setT(await api('/tour/tokens', {})); setRes(null); setLeaker(null) }}>
        {t && <>
          <div className="small muted">{t.customer} · {t.name} · real (generated) Aadhaar <span className="mono">{t.aadhaar}</span></div>
          <div className="scroll"><table className="tbl">
            <thead><tr><th>System that received it</th><th>Purpose</th><th>Aadhaar token it got</th><th>Card token it got</th><th></th></tr></thead>
            <tbody>{t.sinks.map(s => <tr key={s.sink}><td>{s.sink}</td><td>{s.purpose}</td><td className="mono">{s.aadhaar_token}</td><td className="mono">{s.card_token}</td>
              <td><button className="secondary" onClick={async () => { setLeaker(s.sink); setRes(await api('/trace', { dump: s.after })) }}>Pretend this one leaked</button></td></tr>)}</tbody></table></div>
          {res && <Happened>Aran was given only the leaked text from <b>{leaker}</b>. It matched {res.matched} token{res.matched === 1 ? '' : 's'} and named <b>{res.top ? res.top.sink : 'no system'}</b> as the source{res.top && res.top.sink === leaker ? ', which is correct' : ''}. No access logs were needed: the evidence is in the leaked data itself.</Happened>}
        </>}
      </Run>
      <Hood>Theorem 2: tokens are drawn from a different pseudorandom permutation per sink (FF1 tweak = sink name, or a fresh vault token per sink), so the chance two sinks share a token is negligible (birthday bound), and the maximum-likelihood source of a dump is the sink whose tokens it contains. Measured (E3): 100% correct attribution across 40 sinks, even from a single leaked token. The full Leak trace page lets you paste any dump. Code: <code>app/server/engine.py</code> (trace).</Hood>
    </>
  )
}

function Erase() {
  return (
    <>
      <h1>Erasing a customer everywhere, with proof</h1>
      <Plain>India's DPDP Act gives customers the right to have their data erased. But a bank cannot go into every old log file, backup tape and vendor database to delete one person's numbers. Aran solves this with keys: each customer's tokens for each purpose (loans, service, marketing) are locked with that customer's own key. <b>Destroy the key, and every one of those tokens, in every copy anywhere, becomes meaningless forever.</b> The bank gets a tamper-proof receipt as evidence.</Plain>
      <ErasureDemo />
      <Hood>Each (customer, purpose) has its own AES-256-GCM key; vault tokens store only ciphertext. Erasure overwrites and drops the key, appends a KEY_DESTROYED event to an RFC 6962 Merkle log, and signs the event, the tree root and the inclusion proof with Ed25519 and the post-quantum ML-DSA-65 together, so the receipt stays unforgeable after quantum computers arrive. KYC records are retention-locked for 5 years (PMLA rules), so that erasure is refused until then. Theorem 3 argues tokens become anonymous once the key is gone; whether that counts as DPDP erasure still needs legal confirmation. Code: <code>research/firewall/shredder.py</code>, tests in <code>research/test_shredder.py</code>.</Hood>
    </>
  )
}

function ErasureDemo() {
  const [st, setSt] = useState({})
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const step = async fn => { setBusy(true); setErr(null); try { await fn() } catch (e) { setErr(e.message) } setBusy(false) }
  const s1 = () => step(async () => {
    const cust = await api('/customers', {})
    const full = await api('/customers/' + cust.ref)
    setSt({ cust: full })
  })
  const s2 = () => step(async () => {
    const ev = await api('/tour/customer-loan', { customer_ref: st.cust.ref })
    const tok = ev.findings.find(f => f.type === 'AADHAAR' && f.token)
    const read = await api('/detokenise', { token: tok.token, caller: 'loan-vendor' })
    setSt({ ...st, ev, token: tok.token, read })
  })
  const s3 = () => step(async () => {
    const receipt = await api('/erase', { customer_ref: st.cust.ref, purpose: 'Loans' })
    const read2 = await api('/detokenise', { token: st.token, caller: 'loan-vendor' })
    const check = await api('/receipts/verify', receipt)
    const bad = JSON.parse(JSON.stringify(receipt)); bad.event.tokens_unreadable += 1
    const tamper = await api('/receipts/verify', bad)
    setSt({ ...st, receipt, read2, check, tamper })
  })
  return (
    <div className="card try">
      <div className="eyebrow">TRY IT · LIVE, IN THREE STEPS</div>
      <div className="steps">
        <div className={'stepbox' + (st.cust ? ' done' : '')}>
          <b>1. Enrol a new customer</b>
          <button disabled={busy} onClick={s1}>Enrol</button>
          {st.cust && <div className="small">{st.cust.ref} · {st.cust.name}<br /><span className="muted">Aadhaar {st.cust.masked.AADHAAR}</span><br /><span className="muted">4 keys created: KYC, Loans, Service, Marketing</span></div>}
        </div>
        <div className={'stepbox' + (st.read ? ' done' : '')}>
          <b>2. Send their loan application to the loan vendor</b>
          <button disabled={busy || !st.cust} onClick={s2}>Send</button>
          {st.read && <div className="small">Vendor stored token <span className="mono">{st.token}</span><br />Bank reads it back: <span className="ok-t mono">{st.read.value}</span></div>}
        </div>
        <div className={'stepbox' + (st.receipt ? ' done' : '')}>
          <b>3. Customer asks to be erased from Loans</b>
          <button className="danger" disabled={busy || !st.read} onClick={s3}>Erase Loans</button>
          {st.receipt && <div className="small">Key destroyed · {st.receipt.event.tokens_unreadable} token(s) now unreadable<br />Reading the token again: <span className="danger-t">{st.read2.status}</span></div>}
        </div>
      </div>
      <ErrorNote error={err} />
      {st.receipt && <Happened>
        The vendor still has the token in its database, but it now means nothing: the only key that could decrypt it was destroyed, so even the bank cannot read it back. The bank received a signed receipt; checking it gives <b>{st.check.valid ? 'valid' : 'invalid'}</b>, and when we changed just one number in it, the check gave <b>{st.tamper.valid ? 'valid (unexpected)' : 'invalid'}</b>, so the receipt cannot be quietly edited later. The customer's KYC records stay, because the law requires banks to keep them for 5 years.
      </Happened>}
    </div>
  )
}

function Immune({ go }) {
  const [im] = usePoll('/immune', 4000)
  return (
    <>
      <h1>An immune system for data flows</h1>
      <Plain>Some leaks are not one bad value but an unusual <i>pattern</i>: a sudden bulk export at 2 a.m., customer data going to a website never seen before, an employee reading back hundreds of customers' real numbers. Aran borrows an idea from the human immune system: first learn what "self" (normal traffic) looks like, then raise an alarm for anything that is "not self", without needing a list of known attacks.</Plain>
      <div className="card">
        <b>Right now on this server</b>
        {im ? <div className="small">Mode: <b>{im.state.mode}</b>{im.state.mode === 'watching' && <> · learned from {im.state.learned_records} traffic windows · {im.state.detectors} detectors · {im.alerts.length} alerts</>}
          {im.state.mode === 'idle' && <> · it has not learned normal traffic yet</>}</div> : <div className="small muted">loading…</div>}
        <p className="small">To see it work: open the Immune layer page, press <b>Learn normal traffic</b> (it replays real production logs for 6 minutes), then run a drill such as "send customer records to a site never seen before". The alert appears within 30 seconds.</p>
        <button onClick={() => go('immune')}>Open the immune layer →</button>
      </div>
      <Hood>Negative selection with variable-radius detectors (V-detector) over 7 features per (source, sink, time window): volume z-score, raw fraction, hour distance, new pair, new data classes, detokenisation rate and customer ratio. Confirming an attack adds memory detectors; marking a false alarm removes detectors that cover it. Measured on six exfiltration scenarios (E8): 100% caught at 0.6% false alarms, vs 90% for static rules and 20% for Isolation Forest. Code: <code>research/immune/</code>.</Hood>
    </>
  )
}

function Evidence({ go }) {
  const [r] = usePoll('/results', 0)
  const core = r && r['E1-E4 core'] && r['E1-E4 core'].data
  const ai = r && r['E5-E9 AI and immune'] && r['E5-E9 AI and immune'].data
  return (
    <>
      <h1>The evidence, and the honest limits</h1>
      <Plain>Every claim in this tour is backed by an experiment that anyone can re-run. The headline numbers below are read from the result files the experiment scripts wrote.</Plain>
      {core && ai && <div className="grid3">
        <div className="card stat"><div className="stat-v mono">{fmt(core.e1_total.otp_regex)} → {fmt(core.e1_total.otp_context)}</div><div className="stat-l">OTP false alarms on {fmt(core.e1_total.lines)} real log lines</div></div>
        <div className="card stat"><div className="stat-v mono">{core.e2.token_flagged} / {fmt(core.e2.injected)}</div><div className="stat-l">tokens wrongly taken for real numbers</div></div>
        <div className="card stat"><div className="stat-v mono">{(core.e3.dump_1_accuracy * 100).toFixed(0)}%</div><div className="stat-l">leaks traced to the right one of {core.e3.sinks} systems</div></div>
        <div className="card stat"><div className="stat-v mono">{(ai.e9_firewall.prototype_regex_recall * 100).toFixed(0)}% → {(ai.e9_firewall.leak_recall * 100).toFixed(0)}%</div><div className="stat-l">sensitive values removed, simple rules vs Aran with AI</div></div>
        <div className="card stat"><div className="stat-v mono">{(ai.e8_immune.ais.tpr * 100).toFixed(0)}%</div><div className="stat-l">simulated data-flow attacks caught by the immune layer</div></div>
        <div className="card stat"><div className="stat-v mono">{ai.e9_firewall.tokens_redetected_as_real_ids}</div><div className="stat-l">tokens re-detected as real IDs after the firewall</div></div>
      </div>}
      <button className="secondary" onClick={() => go('results')}>See all results and run the tests →</button>
      <h3>What is not finished yet</h3>
      <ul className="plain">
        <li>Names and addresses in free text: 74% and 90% are caught. Some, such as names in capital letters after "customer=", are still missed.</li>
        <li>The leakage ledger (M4), which caps how much any group of systems learns about one customer, is designed but not yet running in this console.</li>
        <li>Speed: about 300 lines per second per processor core in Python. A bank needs a faster core (planned in Rust).</li>
        <li>Whether destroying a key legally counts as "erasure" under the DPDP Act needs a lawyer's confirmation.</li>
        <li>This demo keeps keys in memory. A bank would hold them in a hardware security module (HSM).</li>
      </ul>
      <h3>Laws and rules it is designed around</h3>
      <div className="chips">{['DPDP Act 2023 and Rules 2025', 'CERT-In Directions 2022', 'UIDAI Aadhaar Data Vault', 'RBI card tokenisation', 'RBI FREE-AI framework', 'PCI DSS', 'PMLA record retention'].map(x => <span key={x} className="chip">{x}</span>)}</div>
    </>
  )
}

const GLOSSARY = [
  ['Token', 'A safe stand-in for a sensitive value. Looks similar, but reveals nothing without the bank\'s key.'],
  ['Check digit', 'The last digit of an Aadhaar or card, calculated from the others to catch typing mistakes.'],
  ['Verhoeff / Luhn', 'The two check-digit methods: Verhoeff for Aadhaar, Luhn for cards.'],
  ['Sink', 'Any system that receives data: a log platform, CRM, vendor, AI chatbot.'],
  ['False alarm', 'Flagging something harmless as sensitive. Too many and people stop listening.'],
  ['Calibrated probability', 'A confidence score that means what it says: 90% is right about 9 times in 10.'],
  ['NER', 'Named-entity recognition: an AI model that finds names and addresses in text.'],
  ['Registry', 'A scrambled list of the bank\'s own customers\' numbers and recently sent OTPs, used as evidence.'],
  ['Normaliser', 'The step that undoes disguises (other scripts, encodings, splits) before checking.'],
  ['Crypto-shredding', 'Erasing data by destroying the key that unlocks it, instead of finding every copy.'],
  ['Merkle log / receipt', 'An append-only record whose fingerprint changes if anything in it is edited; the receipt proves an erasure was recorded.'],
  ['Immune layer', 'A detector that learns normal data flows and flags anything that does not fit.'],
  ['DPDP Act', 'India\'s Digital Personal Data Protection Act, 2023: duties to protect, report breaches and erase on request.'],
]

function Glossary() {
  return (
    <>
      <h1>Glossary and team</h1>
      <div className="scroll"><table className="tbl"><tbody>{GLOSSARY.map(([t, d]) => <tr key={t}><td><b>{t}</b></td><td>{d}</td></tr>)}</tbody></table></div>
      <h3>Built at KARE (Kalasalingam Academy of Research and Education)</h3>
      <div className="team">{[['IS', 'Inbathamizhan S', 'Team lead · Cybersecurity'], ['AA', 'Aasif Ahmed A', 'Cybersecurity'], ['SA', 'SN Arun Vijay', 'AI/ML'], ['BM', 'Bharadhwaj M', 'AI/ML']].map(([i, n, r]) => (
        <div key={n} className="member"><span className="avatar">{i}</span><div><b>{n}</b><div className="small muted">{r}</div></div></div>))}</div>
      <p className="small muted">Domain: Banking, Financial Services and FinTech · Problem statement: Prevent Sensitive Data Leakage · Source: github.com/itzz-inbathamizhans/aran</p>
    </>
  )
}

const CHAPTERS = [
  ['Aran in one minute', Start],
  ['The problem', Problem],
  ['Why simple filters fail', FalseAlarms],
  ['Check digits', Checksum],
  ['The core idea', CoreIdea],
  ['Finding sensitive data', Detect],
  ['Hidden numbers', Evasion],
  ['Tracing a leak', Trace],
  ['Erasure with proof', Erase],
  ['Immune system', Immune],
  ['Evidence and limits', Evidence],
  ['Glossary and team', Glossary],
]

export default function Tour({ go }) {
  const fromHash = () => { const m = location.hash.match(/^#tour\/(\d+)/); return m ? Math.min(Number(m[1]), CHAPTERS.length - 1) : 0 }
  const [i, setI] = useState(fromHash)
  useEffect(() => { const f = () => setI(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const to = n => { location.hash = 'tour/' + n; window.scrollTo(0, 0) }
  const C = CHAPTERS[i][1]
  return (
    <div className="tour">
      <Eyebrow>GUIDED TOUR · CHAPTER {i + 1} OF {CHAPTERS.length}</Eyebrow>
      <div className="progress"><div style={{ width: `${((i + 1) / CHAPTERS.length) * 100}%` }} /></div>
      <nav className="chapters">{CHAPTERS.map(([t], n) => (
        <button key={t} className={'chap' + (n === i ? ' on' : n < i ? ' seen' : '')} onClick={() => to(n)}>{n + 1}. {t}</button>))}</nav>
      <select className="chap-select" value={i} onChange={e => to(Number(e.target.value))} aria-label="Chapter">
        {CHAPTERS.map(([t], n) => <option key={t} value={n}>{n + 1}. {t}</option>)}</select>
      <article className="chapter"><C go={go} next={() => to(i + 1)} /></article>
      <div className="row-between tour-nav">
        <button className="secondary" disabled={i === 0} onClick={() => to(i - 1)}>← {i > 0 ? CHAPTERS[i - 1][0] : 'Back'}</button>
        {i < CHAPTERS.length - 1 ? <button onClick={() => to(i + 1)}>{CHAPTERS[i + 1][0]} →</button>
          : <button onClick={() => go('traffic')}>Try the full console →</button>}
      </div>
    </div>
  )
}
