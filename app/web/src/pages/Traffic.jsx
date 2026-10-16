import React, { useEffect, useState } from 'react'
import { api, usePoll, pct, ago } from '../api.js'
import { Eyebrow, Marked, Tokens, Bar, TYPE_LABEL, ErrorNote } from '../components.jsx'

const EVIDENCE_LABEL = {
  checksum: 'Checksum passes (Verhoeff / Luhn)', kw: 'Type word nearby', iin: 'Card issuer prefix', len16: '16 digits',
  plus91: '+91 prefix', ctx: 'Context model score (logit)', registry: 'Handle in UPI registry', hdot: 'Dot in handle',
  ner: 'NER score (logit)', ntok: 'Span length', digit: 'Contains digits', calendar: 'Looks like a date',
  title: 'Title case', deva: 'Devanagari script', cue: 'Cue word before', pin: 'PIN code inside', comma: 'Comma separated',
}

function Detail({ f, sink, config }) {
  const thr = (config.sinks.find(s => s.name === sink) || {}).threshold ?? 0.5
  return (
    <div className="card detail">
      <h3>Why the detector flagged this {TYPE_LABEL[f.type] || f.type}</h3>
      <div className="row-between"><span>Calibrated probability</span><b className="mono">{pct(f.p)}</b></div>
      <Bar p={f.p} threshold={thr} />
      <div className="muted small">Marker = this sink's threshold ({thr}). At or above it the value is replaced.</div>
      <table className="tbl small"><tbody>
        {Object.entries(f.evidence).map(([k, v]) => <tr key={k}><td>{EVIDENCE_LABEL[k] || k}</td><td className="num mono">{v}</td></tr>)}
        {f.registry && <tr><td>Own-customer / OTP registry</td><td className="num mono">{f.registry}</td></tr>}
        {f.repaired && <tr><td>Typo repaired to a registered customer</td><td className="num mono">yes</td></tr>}
      </tbody></table>
      <div className="muted small">Result: {f.protected ? <>replaced by <code className="mono">{f.token || 'a token'}</code></> : 'below threshold, passed raw'}</div>
    </div>
  )
}

export default function Traffic() {
  const [config] = usePoll('/config', 0)
  const [events, , reload] = usePoll('/events?limit=15', 4000)
  const [ev, setEv] = useState(null)
  const [pick, setPick] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [who, setWho] = useState('customer')
  const [mode, setMode] = useState('sample')
  const [text, setText] = useState('')
  const [sink, setSink] = useState('log-platform')
  const [source, setSource] = useState('my-app')

  useEffect(() => { if (!ev && events && events.length) setEv(events[0]) }, [events])

  const run = async (p) => {
    setBusy(true); setErr(null)
    try { const r = await p; setEv(r); setPick(null); reload() } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  if (!config) return null
  return (
    <>
      <Eyebrow>LIVE TRAFFIC</Eyebrow>
      <h1>Send a request through Aran</h1>
      <p className="lede">Pick a bank request or paste your own text. Aran detects every sensitive value, replaces it before it reaches the sink, and shows its reasoning.</p>

      <div className="card">
        <div className="tabs">
          <button className={mode === 'sample' ? 'tab on' : 'tab'} onClick={() => setMode('sample')}>Bank requests</button>
          <button className={mode === 'own' ? 'tab on' : 'tab'} onClick={() => setMode('own')}>Your own text</button>
        </div>
        {mode === 'sample' ? (
          <>
            <div className="seg">
              <label><input type="radio" checked={who === 'customer'} onChange={() => setWho('customer')} /> Enrolled customer (registry knows them)</label>
              <label><input type="radio" checked={who === 'stranger'} onChange={() => setWho('stranger')} /> Stranger (not in the registry)</label>
            </div>
            <div className="btn-grid">
              {Object.entries(config.samples).map(([k, label]) => (
                <button key={k} disabled={busy} className="secondary" onClick={() => run(api('/sample', { kind: k, who }))}>
                  {label}<span className="small muted block">{config.sample_sources[k]} → {config.sample_sinks[k]}</span>
                </button>))}
            </div>
          </>
        ) : (
          <>
            <textarea className="mono" rows={5} value={text} onChange={e => setText(e.target.value)}
              placeholder="Paste a log line, JSON body or chat prompt. Use generated test numbers only, never a real person's." />
            <div className="row">
              <label>Source <input value={source} onChange={e => setSource(e.target.value)} /></label>
              <label>Sink <select value={sink} onChange={e => setSink(e.target.value)}>
                {config.sinks.map(s => <option key={s.name} value={s.name}>{s.name} ({s.purpose})</option>)}
              </select></label>
              <button disabled={busy || !text.trim()} onClick={() => run(api('/process', { text, source, sink }))}>Protect</button>
            </div>
          </>
        )}
        <ErrorNote error={err} />
      </div>

      {ev && (
        <>
          <div className="row-between meta">
            <span><b>{ev.source}</b> → <b>{ev.sink}</b>{ev.bypass && <span className="pill danger">monitor-only</span>}</span>
            <span className="mono">{ev.findings.length} found · {ev.latency_ms} ms · {ago(ev.at)}</span>
          </div>
          <div className="two">
            <section className="card"><h3>Before (what the app sent)</h3><Marked text={ev.before} findings={ev.findings} active={pick} onPick={setPick} />
              <div className="small muted">Click a highlighted value to see why it was caught.</div></section>
            <section className="card"><h3>After (what {ev.sink} stored)</h3><Tokens text={ev.after} findings={ev.findings} /></section>
          </div>
          {pick && <Detail f={pick} sink={ev.sink} config={config} />}
          <section className="card">
            <h3>Findings</h3>
            {ev.findings.length === 0 ? <p className="muted">Nothing sensitive found.</p> : (
              <div className="scroll"><table className="tbl">
                <thead><tr><th>Type</th><th>Value</th><th>Became</th><th className="num">Confidence</th><th>Registry</th></tr></thead>
                <tbody>{ev.findings.map((f, i) => (
                  <tr key={i} className="click" onClick={() => setPick(f)}>
                    <td>{TYPE_LABEL[f.type] || f.type}</td>
                    <td className="mono">{ev.before.slice(f.start, f.end)}</td>
                    <td className="mono">{f.protected ? (f.token || '–') : <span className="pill danger">passed raw</span>}</td>
                    <td className="num mono">{pct(f.p)}</td><td>{f.registry || '–'}</td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </section>
        </>
      )}

      <section className="card">
        <h3>Recent traffic on this server</h3>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>When</th><th>Flow</th><th className="num">Found</th><th className="num">Latency</th></tr></thead>
          <tbody>{(events || []).map(e => (
            <tr key={e.id} className="click" onClick={() => { setEv(e); setPick(null) }}>
              <td className="muted">{ago(e.at)}</td><td>{e.source} → {e.sink}</td>
              <td className="num mono">{e.findings.length}</td><td className="num mono">{e.latency_ms} ms</td></tr>))}</tbody>
        </table></div>
      </section>
    </>
  )
}
