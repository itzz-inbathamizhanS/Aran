import React, { useState } from 'react'
import { api, usePoll, fmt } from '../api.js'
import { Eyebrow, ErrorNote } from '../components.jsx'

export default function Trace() {
  const [config] = usePoll('/config', 0)
  const [dump, setDump] = useState('')
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [from, setFrom] = useState('log-platform')

  const load = async () => {
    setErr(null)
    const d = await api(`/leaked-dump?sink=${encodeURIComponent(from)}&lines=20`)
    if (!d.dump) setErr(`${from} has not received anything yet. Send some traffic to it first.`)
    setDump(d.dump); setRes(null)
  }
  const trace = async () => { setBusy(true); setErr(null); try { setRes(await api('/trace', { dump })) } catch (e) { setErr(e.message) } setBusy(false) }
  if (!config) return null
  return (
    <>
      <Eyebrow>LEAK ATTRIBUTION (M3)</Eyebrow>
      <h1>A leaked token names the system that leaked it.</h1>
      <p className="lede">Every sink receives different tokens for the same customer. Paste a leaked file and Aran tells you which sink it came from, with the evidence.</p>
      <div className="card">
        <div className="row">
          <label>Take what this sink really stored <select value={from} onChange={e => setFrom(e.target.value)}>
            {config.sinks.map(s => <option key={s.name}>{s.name}</option>)}
          </select></label>
          <button className="secondary" onClick={load}>Load its last 20 lines</button>
        </div>
        <textarea className="mono" rows={8} value={dump} onChange={e => setDump(e.target.value)} placeholder="Paste a leaked dump, or load one from a sink above. You can mix lines from several sinks." />
        <button disabled={busy || !dump.trim()} onClick={trace}>Trace the leak</button>
        <ErrorNote error={err} />
      </div>
      {res && (
        <div className="two">
          <section className="card">
            <h3>{res.top ? <>Most likely source: <span className="accent">{res.top.sink}</span></> : 'No Aran tokens found'}</h3>
            <p className="muted small">{fmt(res.matched)} of {fmt(res.candidates)} candidate values matched a token issued by this server.
              {res.raw_identifiers_in_dump > 0 && <> <b className="danger-t">{res.raw_identifiers_in_dump} raw identifiers</b> in the dump were never tokenised, so they leaked before Aran or through a bypass.</>}</p>
            {res.ranking.map(r => (
              <div key={r.sink} className="rank">
                <span>{r.sink}</span>
                <div className="bar"><div className="bar-fill" style={{ width: `${r.share * 100}%` }} /></div>
                <span className="mono">{r.tokens} · {(r.share * 100).toFixed(0)}%</span>
              </div>))}
          </section>
          <section className="card">
            <h3>Evidence per value</h3>
            <div className="scroll"><table className="tbl small">
              <thead><tr><th>Value</th><th>Sink</th><th>How</th></tr></thead>
              <tbody>{res.items.slice(0, 60).map((x, i) => (
                <tr key={i}><td className="mono">{x.value}</td><td>{x.sink || <span className="muted">no match</span>}</td><td className="muted">{x.how || '–'}</td></tr>))}</tbody>
            </table></div>
          </section>
        </div>
      )}
    </>
  )
}
