import React, { useState } from 'react'
import { api, usePoll, fmt, ago } from '../api.js'
import { Eyebrow, ErrorNote } from '../components.jsx'

function Receipt({ r }) {
  const [check, setCheck] = useState(null)
  const [tamper, setTamper] = useState(null)
  const verify = async () => setCheck(await api('/receipts/verify', r))
  const tryTamper = async () => {
    const bad = JSON.parse(JSON.stringify(r)); bad.event.tokens_unreadable += 1
    setTamper(await api('/receipts/verify', bad))
  }
  const copy = () => navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(r, null, 1))
  return (
    <div className="card receipt">
      <h3>Erasure receipt</h3>
      <table className="tbl small"><tbody>
        <tr><td>Customer</td><td className="mono">{r.event.customer}</td></tr>
        <tr><td>Purpose</td><td>{r.event.purpose}</td></tr>
        <tr><td>Tokens made unreadable</td><td className="mono">{fmt(r.event.tokens_unreadable)}</td></tr>
        <tr><td>Signed at</td><td>{new Date(r.event.at * 1000).toLocaleString()}</td></tr>
        <tr><td>Merkle leaf / tree size</td><td className="mono">{r.leaf_index} / {r.tree_size}</td></tr>
        <tr><td>Merkle root</td><td className="mono trunc">{r.root}</td></tr>
        <tr><td>Signature (Ed25519)</td><td className="mono trunc">{r.signature}</td></tr>
        {r.pq_signature && <tr><td>Post-quantum signature (ML-DSA-65)</td><td className="mono trunc">{r.pq_signature}</td></tr>}
      </tbody></table>
      <div className="row">
        <button onClick={verify}>Verify receipt</button>
        <button className="secondary" onClick={tryTamper}>Try tampering with it</button>
        <button className="ghost" onClick={copy}>Copy JSON</button>
      </div>
      {check && <div className={check.valid ? 'ok' : 'err'}>{check.valid ? '✓ ' + (check.post_quantum_valid ? 'Both signatures (Ed25519 and post-quantum ML-DSA-65) valid' : 'Signature valid') + ' and the event is included in the signed Merkle root.' : '✗ Receipt does not verify.'}</div>}
      {tamper && <div className={tamper.valid ? 'err' : 'ok'}>{tamper.valid ? 'Tampered receipt verified (unexpected).' : '✓ Changing one number (tokens made unreadable) broke it: signature ' + (tamper.signature_valid ? 'valid' : 'invalid') + ', inclusion ' + (tamper.included_in_log ? 'valid' : 'invalid') + '.'}</div>}
    </div>
  )
}

export default function Customers() {
  const [list, , reloadList] = usePoll('/customers', 0)
  const [sel, setSel] = useState(null)
  const [cust, setCust] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [err, setErr] = useState(null)
  const [tok, setTok] = useState('')
  const [detok, setDetok] = useState(null)
  const [merkle, , reloadMerkle] = usePoll('/merkle', 0)

  const open = async ref => { setSel(ref); setReceipt(null); setErr(null); setDetok(null); setCust(await api('/customers/' + ref)) }
  const erase = async p => {
    if (!confirm(`Destroy ${sel}'s ${p} key? Every ${p} token for this customer becomes permanently unreadable.`)) return
    setErr(null)
    try { setReceipt(await api('/erase', { customer_ref: sel, purpose: p })); setCust(await api('/customers/' + sel)); reloadList(); reloadMerkle() }
    catch (e) { setErr(e.message) }
  }
  const add = async () => { const c = await api('/customers', {}); reloadList(); open(c.ref) }
  const tryDetok = async t => setDetok(await api('/detokenise', { token: (t || tok).trim(), caller: 'console' }))

  return (
    <>
      <Eyebrow>PURPOSE-BOUND CRYPTO-SHREDDING (M5)</Eyebrow>
      <h1>Destroy one key. Every copy is erased, with a signed receipt.</h1>
      <p className="lede">Each customer has one key per purpose. Tokens sent to sinks are encrypted under that key. Destroy the key and every token for that purpose, in every log and vendor copy, can never be read again.</p>
      <div className="two wide-right">
        <section className="card">
          <div className="row-between"><h3>Customers</h3><button className="ghost" onClick={add}>+ Add</button></div>
          <div className="muted small">Generated identities. Identifiers are checksum-valid but belong to no one.</div>
          <div className="list">
            {(list || []).map(c => (
              <button key={c.ref} className={'list-item' + (sel === c.ref ? ' on' : '')} onClick={() => open(c.ref)}>
                <span><b className="mono">{c.ref}</b> {c.name}</span>
                <span className="small muted">{c.keys.filter(k => !k.alive).length ? `${c.keys.filter(k => !k.alive).length} erased` : `${c.keys.reduce((a, k) => a + k.tokens, 0)} tokens`}</span>
              </button>))}
          </div>
        </section>
        <section>
          {!cust ? <div className="card muted">Pick a customer to see their keys and erase a purpose. Send some bank requests first so they have tokens in the sinks.</div> : (
            <>
              <div className="card">
                <h3>{cust.ref} · {cust.name}</h3>
                <div className="chips">{Object.entries(cust.masked).map(([k, v]) => <span key={k} className="chip mono">{k} {v}</span>)}</div>
                <div className="scroll"><table className="tbl">
                  <thead><tr><th>Purpose</th><th>Key</th><th className="num">Tokens</th><th></th></tr></thead>
                  <tbody>{cust.keys.map(k => (
                    <tr key={k.purpose}>
                      <td>{k.purpose}</td>
                      <td>{k.alive ? <span className="pill ok">alive</span> : <span className="pill danger">destroyed</span>}</td>
                      <td className="num mono">{fmt(k.tokens)}</td>
                      <td className="num">{k.alive ? (k.locked_until ? <span className="small muted" title="PMLA: KYC records are kept 5 years">locked until {new Date(k.locked_until * 1000).toLocaleDateString()}</span>
                        : <button className="danger" onClick={() => erase(k.purpose)}>Erase</button>)
                        : <button className="ghost" onClick={() => setReceipt(k.receipt)}>Receipt</button>}</td>
                    </tr>))}</tbody>
                </table></div>
                <ErrorNote error={err} />
              </div>
              {receipt && <Receipt r={receipt} />}
              <div className="card">
                <h3>Try to read a token back</h3>
                <div className="muted small">Detokenisation is logged per caller. After erasure it fails for good.</div>
                {cust.tokens.length > 0 && <div className="chips">{cust.tokens.slice(-6).map(t => (
                  <button key={t.token} className="chip mono" onClick={() => { setTok(t.token); tryDetok(t.token) }}>{t.token} <span className="muted">{t.sink}</span></button>))}</div>}
                <div className="row"><input className="mono grow" value={tok} onChange={e => setTok(e.target.value)} placeholder="token" />
                  <button className="secondary" disabled={!tok.trim()} onClick={() => tryDetok()}>Detokenise</button></div>
                {detok && <div className={detok.status === 'ok' ? 'ok' : 'err'}>{detok.status === 'ok' ? <>Value: <code className="mono">{detok.value}</code></> : detok.reason}</div>}
              </div>
            </>
          )}
        </section>
      </div>
      {merkle && (
        <section className="card">
          <h3>Transparency log</h3>
          <div className="muted small">{fmt(merkle.size)} entries · root <span className="mono">{merkle.root.slice(0, 32)}…</span></div>
          <div className="scroll"><table className="tbl small">
            <thead><tr><th>Event</th><th>Customer</th><th>Purpose</th><th>When</th></tr></thead>
            <tbody>{merkle.recent.slice(0, 10).map((e, i) => (
              <tr key={i}><td className={e.event === 'KEY_DESTROYED' ? 'danger-t' : ''}>{e.event}</td><td className="mono">{e.customer}</td><td>{e.purpose}</td><td className="muted">{ago(e.at)}</td></tr>))}</tbody>
          </table></div>
        </section>
      )}
    </>
  )
}
