import React from 'react'
import { usePoll, fmt, ago } from '../api.js'
import { Stat, Eyebrow, IdStrip, TYPE_LABEL } from '../components.jsx'

export default function Overview({ go }) {
  const [s] = usePoll('/stats', 3000)
  const [ev] = usePoll('/events?limit=6', 3000)
  const [im] = usePoll('/immune', 4000)
  if (!s) return null
  const sample = (ev || []).flatMap(e => e.findings.filter(f => f.type === 'AADHAAR' && f.token && /^\d{12}$/.test(f.token)).map(f => ({ real: e.before.slice(f.start, f.end).replace(/\D/g, ''), token: f.token })))[0]
  return (
    <>
      <Eyebrow>DATA-FLOW FIREWALL FOR INDIAN BANKS</Eyebrow>
      <h1>Real numbers pass the checksum. Aran's tokens never do.</h1>
      <p className="lede">This console runs Aran's actual code. Send a request, watch it get protected, trace a leak, erase a customer, and see every number update from the live server.</p>

      {sample ? (
        <div className="card hero-pair">
          <div className="muted small">Latest Aadhaar this server protected</div>
          <IdStrip digits={sample.real} kind="real" label="passes Verhoeff · real (generated customer)" />
          <div className="arrow">↓ tokenised before it left the API</div>
          <IdStrip digits={sample.token} kind="token" label="fails Verhoeff · protected Aran token" />
        </div>
      ) : (
        <div className="card cta-card">
          <p>No traffic yet on this server. Send a first request to see Aran work.</p>
          <button onClick={() => go('traffic')}>Send a request</button>
        </div>
      )}

      <div className="grid4">
        <Stat label="Requests protected" value={fmt(s.requests)} note={`${fmt(s.customers)} enrolled customers`} />
        <Stat label="Values tokenised" value={fmt(s.values_protected)} note={`${fmt(s.values_passed_raw)} passed raw`} />
        <Stat label="Added latency p95" value={s.p95_ms === null ? '–' : `${s.p95_ms} ms`} note={s.p50_ms === null ? 'no requests yet' : `median ${s.p50_ms} ms`} />
        <Stat label="Immune alerts" value={fmt(s.alerts)} note={`${fmt(s.open_alerts)} open · mode: ${s.immune.mode}`} tone={s.open_alerts ? 'danger' : ''} />
      </div>
      <div className="grid4">
        <Stat label="Tokens issued" value={fmt(s.tokens_issued)} note={`${fmt(s.vault_tokens)} purpose-bound`} />
        <Stat label="Keys destroyed" value={fmt(s.keys_destroyed)} note={`Merkle log: ${fmt(s.merkle_size)} entries`} />
        <Stat label="Normal traffic replay" value={s.replay.running ? 'On' : 'Off'} note={`${fmt(s.replay.lines_sent)} real log lines sent`} />
        <Stat label="Server uptime" value={`${Math.floor(s.uptime_s / 60)} min`} note={`models loaded in ${s.model_load_seconds}s`} />
      </div>

      <div className="two">
        <section className="card">
          <h3>Values found by type</h3>
          {Object.keys(s.by_type).length === 0 ? <p className="muted">Nothing yet.</p> : (
            <table className="tbl"><tbody>
              {Object.entries(s.by_type).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <tr key={t}><td>{TYPE_LABEL[t] || t}</td><td className="num mono">{fmt(n)}</td></tr>))}
            </tbody></table>
          )}
        </section>
        <section className="card">
          <h3>Latest requests</h3>
          {(ev || []).length === 0 ? <p className="muted">Nothing yet.</p> : (
            <table className="tbl"><tbody>
              {ev.map(e => (
                <tr key={e.id}><td>{e.source} → {e.sink}</td><td className="num mono">{e.findings.length} found</td><td className="num muted">{ago(e.at)}</td></tr>))}
            </tbody></table>
          )}
          <button className="ghost" onClick={() => go('traffic')}>Open live traffic →</button>
        </section>
      </div>
      {im && im.alerts.length > 0 && (
        <section className="card">
          <h3>Latest immune alerts</h3>
          {im.alerts.slice(0, 3).map(a => <div key={a.id} className="alert-row"><span className="dot danger" />{a.src} → {a.sink}: {a.reasons[0]}</div>)}
          <button className="ghost" onClick={() => go('immune')}>Open immune layer →</button>
        </section>
      )}
    </>
  )
}
