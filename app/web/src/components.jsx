import React from 'react'
import { pct } from './api.js'

export const TYPE_LABEL = { AADHAAR: 'Aadhaar', CARD: 'Card', MOBILE: 'Mobile', PAN: 'PAN', OTP: 'OTP', UPI: 'UPI ID', PER: 'Name', ADDR: 'Address' }

export function Stat({ label, value, note, tone }) {
  return (
    <div className={'stat card ' + (tone || '')}>
      <div className="stat-v mono">{value}</div>
      <div className="stat-l">{label}</div>
      {note && <div className="stat-n">{note}</div>}
    </div>
  )
}

export function Eyebrow({ children }) { return <div className="eyebrow">{children}</div> }

// Monospace digit cells with the check digit highlighted.
export function IdStrip({ digits, kind, label }) {
  const cells = digits.split('')
  return (
    <div className={'idstrip ' + kind}>
      <div className="cells mono">
        {cells.map((c, i) => <span key={i} className={i === cells.length - 1 ? 'chk' : ''}>{c}</span>)}
      </div>
      <div className="idlabel">{kind === 'real' ? '✓ ' : kind === 'token' ? '⊘ ' : '! '}{label}</div>
    </div>
  )
}

// Before text with each finding marked by its span.
export function Marked({ text, findings, active, onPick }) {
  const parts = []
  let last = 0
  ;[...findings].sort((a, b) => a.start - b.start).forEach((f, i) => {
    if (f.start < last) return
    parts.push(text.slice(last, f.start))
    parts.push(
      <mark key={i} className={(f.protected ? 'm-real' : 'm-raw') + (active === f ? ' act' : '')}
        title={`${TYPE_LABEL[f.type] || f.type} · ${pct(f.p)}`} onClick={() => onPick && onPick(f)}>
        {text.slice(f.start, f.end)}
      </mark>)
    last = f.end
  })
  parts.push(text.slice(last))
  return <pre className="logline mono">{parts}</pre>
}

// After text with every issued token marked.
export function Tokens({ text, findings }) {
  const toks = [...new Set(findings.map(f => f.token).filter(Boolean)), '<OTP:destroyed>']
  const withheld = /<[A-Z]+:withheld-erased>/g
  if (!toks.length) return <pre className="logline mono">{text}</pre>
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rx = new RegExp('(' + toks.map(esc).join('|') + '|<[A-Z]+:withheld-erased>)', 'g')
  const parts = text.split(rx)
  return (
    <pre className="logline mono">
      {parts.map((p, i) => (toks.includes(p) || withheld.test(p)) ? <mark key={i} className="m-token">{p}</mark> : p)}
    </pre>
  )
}

export function Bar({ p, threshold }) {
  return (
    <div className="bar" role="img" aria-label={`confidence ${pct(p)}`}>
      <div className="bar-fill" style={{ width: `${Math.max(1, p * 100)}%` }} />
      {threshold !== undefined && <div className="bar-thr" style={{ left: `${threshold * 100}%` }} title={`threshold ${threshold}`} />}
    </div>
  )
}

export function ErrorNote({ error }) { return error ? <div className="err">{error}</div> : null }
