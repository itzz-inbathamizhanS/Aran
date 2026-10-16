import React, { useEffect, useState } from 'react'
import { api, usePoll, fmt } from '../api.js'
import { Eyebrow } from '../components.jsx'

function Job({ name, label, note }) {
  const [job, setJob] = useState(null)
  useEffect(() => { api('/jobs/' + name).then(setJob).catch(() => {}) }, [name])
  useEffect(() => {
    if (!job || job.finished) return
    const t = setInterval(() => api('/jobs/' + name).then(setJob), 2000)
    return () => clearInterval(t)
  }, [job, name])
  const running = job && !job.finished
  return (
    <div className="card">
      <div className="row-between"><h3>{label}</h3>
        <button disabled={running} onClick={() => api('/jobs/' + name, {}).then(setJob)}>{running ? 'Running…' : job ? 'Run again' : 'Run now'}</button></div>
      <div className="small muted">{note}</div>
      {job && <>
        <div className="small">{running ? `Started ${Math.round(Date.now() / 1000 - job.started)}s ago` :
          job.returncode === 0 ? <span className="ok-t">✓ Passed in {Math.round(job.finished - job.started)}s</span> : <span className="danger-t">✗ Exit code {job.returncode}</span>}</div>
        {job.output && <pre className="logline mono out">{job.output.slice(-4000)}</pre>}
      </>}
    </div>
  )
}

const n = v => (typeof v === 'number' ? fmt(v) : v)

export default function Results() {
  const [r] = usePoll('/results', 0)
  if (!r) return null
  const core = r['E1-E4 core'] && r['E1-E4 core'].data
  const ai = r['E5-E9 AI and immune'] && r['E5-E9 AI and immune'].data
  const reg = r['E10-E12 normaliser and registries'] && r['E10-E12 normaliser and registries'].data
  return (
    <>
      <Eyebrow>EVIDENCE</Eyebrow>
      <h1>Results from the experiment scripts, not from slides</h1>
      <p className="lede">These tables are read from the result files the experiment scripts wrote. Run the test suite or re-run E1 to E4 on this server and watch the output.</p>
      <div className="two">
        <Job name="tests" label="Run the test suite" note="pytest: NIST FF1 vectors, Verhoeff and Luhn, token invariants, normaliser, registries, crypto-shredding and Merkle receipts." />
        <Job name="e1-e4" label="Re-run experiments E1 to E4" note="False alarms on 32,000 real Loghub lines, token separability, leak attribution, mask leakage. Takes a few minutes; the table below updates when it finishes." />
      </div>
      {core && <section className="card">
        <h3>E1 to E3 on {fmt(core.e1_total.lines)} real production log lines <span className="small muted">({r['E1-E4 core'].file}, written {new Date(r['E1-E4 core'].modified * 1000).toLocaleString()})</span></h3>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Test</th><th className="num">Plain pattern matching</th><th className="num">Aran</th></tr></thead>
          <tbody>
            <tr><td>OTP false alarms</td><td className="num mono">{n(core.e1_total.otp_regex)}</td><td className="num mono">{n(core.e1_total.otp_context)}</td></tr>
            <tr><td>Card false alarms (Luhn + issuer prefix)</td><td className="num mono">{n(core.e1_total.card_regex)}</td><td className="num mono">{n(core.e1_total.card_luhn_iin)}</td></tr>
            <tr><td>Aadhaar false alarms (Verhoeff)</td><td className="num mono">{n(core.e1_total.aadhaar_regex)}</td><td className="num mono">{n(core.e1_total.aadhaar_verhoeff)}</td></tr>
            <tr><td>Tokens wrongly flagged as real (of {n(core.e2.injected)})</td><td className="num">not separable</td><td className="num mono">{n(core.e2.token_flagged)}</td></tr>
            <tr><td>Leaked dumps traced to the right sink ({core.e3.sinks} sinks, 1 token)</td><td className="num">access logs only</td><td className="num mono">{(core.e3.dump_1_accuracy * 100).toFixed(0)}%</td></tr>
          </tbody></table></div>
        <h3>E4: what common masks still leave</h3>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Mask</th><th className="num">Candidates left</th><th className="num">Bits left</th></tr></thead>
          <tbody>{core.e4.map(m => <tr key={m.mask}><td>{m.mask}</td><td className="num mono">{n(m.candidates)}</td><td className="num mono">{m.bits_left}</td></tr>)}</tbody>
        </table></div>
      </section>}
      {ai && <section className="card">
        <h3>E9: the wired firewall on {n(ai.e9_firewall.lines)} real lines of unseen systems</h3>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Test</th><th className="num">Prototype regex</th><th className="num">Aran with AI layers</th></tr></thead>
          <tbody>
            <tr><td>Sensitive values removed</td><td className="num mono">{(ai.e9_firewall.prototype_regex_recall * 100).toFixed(1)}%</td><td className="num mono">{(ai.e9_firewall.leak_recall * 100).toFixed(1)}%</td></tr>
            <tr><td>Clean real lines wrongly changed</td><td className="num mono">{ai.e9_firewall.prototype_clean_lines_flagged}</td><td className="num mono">{ai.e9_firewall.clean_real_lines_changed}</td></tr>
            <tr><td>Tokens re-detected as real IDs</td><td className="num">–</td><td className="num mono">{ai.e9_firewall.tokens_redetected_as_real_ids}</td></tr>
          </tbody></table></div>
        <h3>E8: immune layer on six exfiltration scenarios</h3>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Method</th><th className="num">Attacks caught</th><th className="num">False alarms</th></tr></thead>
          <tbody>
            <tr><td>Immune layer (negative selection)</td><td className="num mono">{(ai.e8_immune.ais.tpr * 100).toFixed(0)}%</td><td className="num mono">{(ai.e8_immune.ais.fpr * 100).toFixed(1)}%</td></tr>
            <tr><td>Static rules</td><td className="num mono">{(ai.e8_immune.static_rules.tpr * 100).toFixed(0)}%</td><td className="num mono">{(ai.e8_immune.static_rules.fpr * 100).toFixed(1)}%</td></tr>
            <tr><td>Isolation Forest</td><td className="num mono">{(ai.e8_immune.isolation_forest.tpr * 100).toFixed(0)}%</td><td className="num mono">{(ai.e8_immune.isolation_forest.fpr * 100).toFixed(1)}%</td></tr>
          </tbody></table></div>
      </section>}
      {reg && <section className="card">
        <h3>E10: hidden identifiers removed, by evasion trick</h3>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>Trick</th>{Object.keys(reg.e10_evasion.conditions).map(c => <th key={c} className="num">{c}</th>)}</tr></thead>
          <tbody>{Object.keys(Object.values(reg.e10_evasion.conditions)[0].by_trick).map(t => (
            <tr key={t}><td>{t}</td>{Object.values(reg.e10_evasion.conditions).map((c, i) => <td key={i} className="num mono">{(c.by_trick[t].rate * 100).toFixed(0)}%</td>)}</tr>))}</tbody>
        </table></div>
      </section>}
    </>
  )
}
