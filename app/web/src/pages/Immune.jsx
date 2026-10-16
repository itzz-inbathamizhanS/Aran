import React, { useState } from 'react'
import { api, usePoll, fmt, ago } from '../api.js'
import { Eyebrow, ErrorNote, Stat } from '../components.jsx'

export default function Immune() {
  const [config] = usePoll('/config', 0)
  const [im, , reload] = usePoll('/immune', 2000)
  const [st] = usePoll('/stats', 3000)
  const [secs, setSecs] = useState(360)
  const [rate, setRate] = useState(1)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const act = async p => { setErr(null); try { const r = await p; if (r && r.done) setMsg(r.done); reload() } catch (e) { setErr(e.message) } }
  if (!im || !config || !st) return null
  const s = im.state
  const left = s.learn_until ? Math.max(0, Math.round(s.learn_until - Date.now() / 1000)) : 0
  return (
    <>
      <Eyebrow>ARTIFICIAL IMMUNE SYSTEM</Eyebrow>
      <h1>Learns what normal looks like, then flags what is not.</h1>
      <p className="lede">Every {s.window_seconds} seconds the firewall closes one flow record per source and sink: how many messages carried sensitive values, how many left raw, which data classes, how often tokens were read back. The immune layer learns "self" from this server's own traffic, then scores every new record with negative selection.</p>

      <div className="grid4">
        <Stat label="Mode" value={s.mode} note={s.mode === 'learning' ? `${left}s left` : s.mode === 'watching' ? `learned from ${fmt(s.learned_records)} records` : 'not trained yet'} />
        <Stat label="Detectors" value={fmt(s.detectors)} note={s.self_radius ? `self radius ${s.self_radius}` : '–'} />
        <Stat label="Held-out false alarms" value={s.val_fpr === null ? '–' : (s.val_fpr * 100).toFixed(1) + '%'} note="on normal windows it did not train on" />
        <Stat label="Flow windows" value={fmt(im.closed_windows)} note={`${im.open_windows} open now`} />
      </div>

      <div className="two">
        <section className="card">
          <h3>1. Normal traffic</h3>
          <p className="small muted">Replays real production log lines (Loghub, {st.replay.log_systems} systems) through the firewall as the bank's everyday traffic. About one line in ten carries a bank event for an enrolled customer.</p>
          <div className="row">
            <label>Lines per second per flow <input type="number" min="0.2" max="5" step="0.2" value={rate} onChange={e => setRate(e.target.value)} /></label>
            {st.replay.running ? <button className="secondary" onClick={() => act(api('/replay/stop', {}))}>Stop replay</button>
              : <button onClick={() => act(api('/replay/start', { rate: Number(rate) }))}>Start replay</button>}
          </div>
          <div className="small muted">{st.replay.running ? 'Running' : 'Stopped'} · {fmt(st.replay.lines_sent)} lines sent · flows: {st.replay.flows.join(', ')}</div>
        </section>
        <section className="card">
          <h3>2. Learn self</h3>
          <p className="small muted">Starts the replay if needed, collects flow records for the chosen time, then fits the detectors with the self radius tuned on held-out windows.</p>
          <div className="row">
            <label>Seconds <input type="number" min="30" max="1800" value={secs} onChange={e => setSecs(e.target.value)} /></label>
            <button disabled={s.mode === 'learning'} onClick={() => act(api('/immune/learn', { seconds: Number(secs) }))}>{s.mode === 'watching' ? 'Re-learn' : 'Learn normal traffic'}</button>
          </div>
          {s.error && <div className="err">{s.error}</div>}
          {s.pairs && <div className="small muted">Self covers: {s.pairs.join(', ')}</div>}
        </section>
      </div>

      <section className="card">
        <h3>3. Run a drill</h3>
        <p className="small muted">Each drill performs a real action on the live firewall. The immune layer is not told about it; it has to notice the flow window on its own when the window closes (up to {s.window_seconds}s).</p>
        <div className="btn-grid">
          {Object.entries(config.drills).map(([k, label]) => (
            <button key={k} className="secondary" disabled={s.mode !== 'watching'} onClick={() => act(api('/drills/' + k, {}))}>{label}</button>))}
        </div>
        {s.mode !== 'watching' && <div className="small muted">Available once the immune layer has learned normal traffic.</div>}
        {msg && <div className="ok">{msg} Watch the alerts below.</div>}
        <ErrorNote error={err} />
      </section>

      <section className="card">
        <h3>Alerts</h3>
        {im.alerts.length === 0 ? <p className="muted">No alerts.</p> : im.alerts.map(a => (
          <div key={a.id} className="alert">
            <div className="row-between">
              <b>{a.src} → {a.sink}</b>
              <span className="small muted">{ago(a.at)} · score <span className="mono">{a.score}</span></span>
            </div>
            <ul className="small">{a.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <div className="small muted mono">n={a.n} raw={a.raw_frac} detok={a.detok_rate} classes={a.classes.join(',')}</div>
            {a.label ? <span className={'pill ' + (a.label === 'attack' ? 'danger' : 'ok')}>{a.label === 'attack' ? 'confirmed attack (memory cells added)' : 'marked normal (detectors removed)'}</span> : (
              <div className="row">
                <button className="danger" onClick={() => act(api(`/immune/alerts/${a.id}/label`, { label: 'attack' }))}>Confirm attack</button>
                <button className="ghost" onClick={() => act(api(`/immune/alerts/${a.id}/label`, { label: 'normal' }))}>Mark as normal</button>
              </div>)}
          </div>))}
      </section>
    </>
  )
}
