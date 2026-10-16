import React from 'react'
import { Eyebrow } from '../components.jsx'

const M = [
  ['M1', 'Checksum-complement tokens', 'Tokens keep the 12 or 16 digit shape but always fail Verhoeff or Luhn, so any scanner can tell a token from a real number.', ['Dihedral group D5', 'FF1 (NIST SP 800-38G)']],
  ['M2', 'Evidence-fusion detector', 'A calibrated probability per value from the checksum, the context, NER, the own-customer registry and the trace-bound OTP registry.', ['Bayes\' rule', 'Isotonic calibration', 'Cuckoo filter']],
  ['M3', 'Per-sink tokens', 'Every destination gets different tokens, so a leaked token names the system that leaked it.', ['PRP families', 'Maximum likelihood']],
  ['M4', 'Leakage ledger', 'Caps how many bits any group of destinations can learn about one customer. Designed; runtime ledger not built yet.', ['Min-entropy']],
  ['M5', 'Purpose-bound crypto-shredding', 'One key per customer per purpose; destroying it erases every copy everywhere, with a signed Merkle receipt.', ['AES-256-GCM', 'Ed25519 + ML-DSA-65', 'RFC 6962 Merkle log']],
]
const TEAM = [['IS', 'Inbathamizhan S', 'Team lead · Cybersecurity'], ['AA', 'Aasif Ahmed A', 'Cybersecurity'], ['SA', 'SN Arun Vijay', 'AI/ML'], ['BM', 'Bharadhwaj M', 'AI/ML']]

export default function About() {
  return (
    <>
      <Eyebrow>HOW IT WORKS</Eyebrow>
      <h1>Five mechanisms, each built on a named theory.</h1>
      <div className="mech">{M.map(([c, t, d, chips]) => (
        <div key={c} className="card"><div className="eyebrow">{c}</div><h3>{t}</h3><p className="small">{d}</p>
          <div className="chips">{chips.map(x => <span key={x} className="chip">{x}</span>)}</div></div>))}</div>
      <section className="card">
        <h3>What runs behind this console</h3>
        <ul className="small">
          <li>The detector, NER and context models are trained by <code>app/server/build_models.py</code> on public corpora (CoNLL-2003, HiNER, Hinglish tweets, UCI SMS, Loghub), the same training as experiment E7.</li>
          <li>Every request goes through <code>research/firewall</code>: normaliser, registries, typo repair, then per-sink tokens or purpose-bound vault tokens.</li>
          <li>Keys live in memory only and the server forgets everything on restart, so no state survives a redeploy.</li>
          <li>Customers are generated: their identifiers pass Verhoeff and Luhn but belong to no real person.</li>
          <li>Honest note: treating crypto-shredding as DPDP erasure still needs legal confirmation.</li>
        </ul>
      </section>
      <section className="card">
        <h3>Team · Kalasalingam Academy of Research and Education</h3>
        <div className="team">{TEAM.map(([i, n, r]) => <div key={n} className="member"><span className="avatar">{i}</span><div><b>{n}</b><div className="small muted">{r}</div></div></div>)}</div>
      </section>
    </>
  )
}
