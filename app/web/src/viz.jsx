import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api, fmt, pct } from './api.js'
import { TYPE_LABEL, Marked, Tokens } from './components.jsx'

/* Animated scenes for the guided tour. Every scene replays a real server response:
   nothing here invents a number. See docs/learning/13-animation-and-visual-explainers.md. */

// ------------------------------------------------------------------ hooks
export function useStepper(total, ms = 450) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    if (i >= total) { setPlaying(false); return }
    const t = setTimeout(() => setI(i + 1), ms)
    return () => clearTimeout(t)
  }, [playing, i, total, ms])
  return {
    i, playing, total, done: i >= total,
    play: () => { setI(0); setPlaying(true) },
    resume: () => setPlaying(true),
    pause: () => setPlaying(false),
    step: () => { setPlaying(false); setI(x => Math.min(x + 1, total)) },
    back: () => { setPlaying(false); setI(x => Math.max(x - 1, 0)) },
    end: () => { setPlaying(false); setI(total) },
  }
}

function useNow(active) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!active) return
    let raf
    const f = () => { setNow(performance.now()); raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return now
}

export function CountUp({ to, ms = 1100, format = fmt }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (to == null) return
    let raf; const t0 = performance.now()
    const f = t => { const k = Math.min(1, (t - t0) / ms); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return <>{format(Math.round(v))}</>
}

export function Controls({ s, playLabel = 'Play' }) {
  return (
    <div className="ctl">
      {s.playing ? <button className="secondary" onClick={s.pause}>❚❚ Pause</button>
        : <button onClick={s.done || s.i === 0 ? s.play : s.resume}>{s.done ? '↺ Replay' : s.i === 0 ? '▶ ' + playLabel : '▶ Continue'}</button>}
      <button className="secondary" onClick={s.back} disabled={s.i === 0}>‹</button>
      <button className="secondary" onClick={s.step} disabled={s.done}>›</button>
      <button className="ghost" onClick={s.end} disabled={s.done}>Skip to end</button>
      <span className="ctl-n mono">{Math.min(s.i, s.total)}/{s.total}</span>
    </div>
  )
}

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
}

// ------------------------------------------------------------------ 1. packets through the firewall
const SOURCES = [['console', 'You'], ['loan-origination', 'Loan app'], ['onboarding', 'Onboarding'], ['call-centre', 'Call centre'],
  ['upi-switch', 'UPI switch'], ['mobile-app', 'Mobile app'], ['employee-desktop', 'Staff desktop']]
const SINKS = [['log-platform', 'Log platform'], ['crm-notes', 'CRM notes'], ['loan-vendor', 'Loan vendor'],
  ['llm-gateway', 'AI chatbot'], ['marketing-cloud', 'Marketing'], ['kyc-archive', 'KYC archive']]
const PW = 900, ROW = 48, TOP = 26
const srcY = i => TOP + i * ROW + 17
const sinkY = i => TOP + (i + 0.5) * ROW + 17
const SH = { x: 450, y: TOP + 3.5 * ROW }
const PH = { in: 1100, scan: 450, out: 1100, rest: 700 }
const PT = PH.in + PH.scan + PH.out + PH.rest

function laneIn(i) { const y = srcY(i); return [[172, y], [300, y], [330, SH.y], [SH.x - 58, SH.y]] }
function laneOut(j) { const y = sinkY(j); return [[SH.x + 58, SH.y], [570, SH.y], [600, y], [728, y]] }
const pathOf = p => `M ${p[0][0]} ${p[0][1]} C ${p[1][0]} ${p[1][1]}, ${p[2][0]} ${p[2][1]}, ${p[3][0]} ${p[3][1]}`

function Chip({ x, y, kind, text }) {
  const w = Math.max(70, text.length * 7.4 + 22)
  return (
    <g transform={`translate(${x},${y})`} className={'chip-' + kind}>
      <rect x={-w / 2} y={-13} width={w} height={26} rx={13} />
      <text x={0} y={4.5} textAnchor="middle">{text}</text>
    </g>
  )
}

export function Pipeline({ autoplay = true, showInput = true }) {
  const [packets, setPackets] = useState([])
  const [latest, setLatest] = useState(null)
  const [auto, setAuto] = useState(autoplay)
  const [sent, setSent] = useState(0)
  const [prot, setProt] = useState(0)
  const [hits, setHits] = useState({})
  const [text, setText] = useState('')
  const [sink, setSink] = useState('llm-gateway')
  const [err, setErr] = useState(null)
  const now = useNow(packets.length > 0)
  const busy = useRef(false)

  const launch = ev => {
    const si = Math.max(0, SOURCES.findIndex(s => s[0] === ev.source))
    const sj = Math.max(0, SINKS.findIndex(s => s[0] === ev.sink))
    const types = [...new Set(ev.findings.filter(f => f.protected).map(f => TYPE_LABEL[f.type] || f.type))]
    const p = { id: ev.id, si, sj, t0: performance.now(), raw: types.length ? types.slice(0, 3).join(' · ') : 'no secrets', n: types.length,
      tok: ev.findings.some(f => f.protected) ? `${ev.findings.filter(f => f.protected).length} tokens` : 'passed clean' }
    setPackets(ps => [...ps.filter(q => performance.now() - q.t0 < PT), p])
    setLatest(ev); setSent(n => n + 1); setProt(n => n + ev.findings.filter(f => f.protected).length)
    setTimeout(() => setHits(h => ({ ...h, [ev.sink]: (h[ev.sink] || 0) + 1 })), PH.in + PH.scan + PH.out)
    setTimeout(() => setPackets(ps => ps.filter(q => q.id !== p.id)), PT)
  }
  const send = async () => {
    if (busy.current) return
    busy.current = true; setErr(null)
    try { launch(await api('/tour/packet', {})) } catch (e) { setErr(e.message) }
    busy.current = false
  }
  const sendOwn = async () => {
    setErr(null)
    try { launch(await api('/process', { text, source: 'console', sink })) } catch (e) { setErr(e.message) }
  }
  useEffect(() => {
    if (!auto) return
    send()
    let n = 0
    const t = setInterval(() => { if (++n >= 14) setAuto(false); send() }, 2600)
    return () => clearInterval(t)
  }, [auto])

  const active = new Set(), activeOut = new Set()
  let scanning = false
  const chips = packets.map(p => {
    const t = now - p.t0
    if (t < PH.in) { active.add(p.si); const [x, y] = bez(...laneIn(p.si), ease(t / PH.in)); return <Chip key={p.id} x={x} y={y} kind="raw" text={p.raw} /> }
    if (t < PH.in + PH.scan) { scanning = true; return <Chip key={p.id} x={SH.x} y={SH.y + 78} kind="scan" text="checking…" /> }
    if (t < PH.in + PH.scan + PH.out) { activeOut.add(p.sj); const [x, y] = bez(...laneOut(p.sj), ease((t - PH.in - PH.scan) / PH.out)); return <Chip key={p.id} x={x} y={y} kind={p.n ? 'tok' : 'clean'} text={p.tok} /> }
    return null
  })

  return (
    <div className="scene">
      <div className="scene-scroll">
        <svg viewBox={`0 0 ${PW} ${TOP * 2 + ROW * 7}`} className="pipe" role="img" aria-label="Requests flow from bank systems through Aran to the systems that store them">
          {SOURCES.map((s, i) => <path key={s[0]} d={pathOf(laneIn(i))} className={'lane' + (active.has(i) ? ' on' : '')} />)}
          {SINKS.map((s, j) => <path key={s[0]} d={pathOf(laneOut(j))} className={'lane out' + (activeOut.has(j) ? ' on' : '')} />)}
          {SOURCES.map((s, i) => (
            <g key={s[0]} className={'node' + (active.has(i) ? ' on' : '')} transform={`translate(22,${srcY(i) - 17})`}>
              <rect width="150" height="34" rx="8" /><text x="75" y="22" textAnchor="middle">{s[1]}</text></g>))}
          {SINKS.map((s, j) => (
            <g key={s[0]} className={'node sink' + (activeOut.has(j) ? ' on' : '')} transform={`translate(728,${sinkY(j) - 17})`}>
              <rect width="150" height="34" rx="8" /><text x="75" y="22" textAnchor="middle">{s[1]}</text>
              {hits[s[0]] ? <g className="badge"><circle cx="146" cy="2" r="11" /><text x="146" y="6.5" textAnchor="middle">{hits[s[0]]}</text></g> : null}
            </g>))}
          <g className={'shield' + (scanning ? ' scanning' : '')} transform={`translate(${SH.x},${SH.y})`}>
            <circle r="74" className="ring r2" /><circle r="64" className="ring" />
            <path d="M0 -50 L40 -34 L40 6 C40 30 22 44 0 54 C-22 44 -40 30 -40 6 L-40 -34 Z" className="sh" />
            <text y="2" textAnchor="middle" className="sh-t">ARAN</text>
            <text y="20" textAnchor="middle" className="sh-s">அரண்</text>
          </g>
          {chips}
          <text x="97" y="14" textAnchor="middle" className="cap">BANK SYSTEMS SEND</text>
          <text x="803" y="14" textAnchor="middle" className="cap">SYSTEMS THAT STORE IT</text>
        </svg>
      </div>
      <div className="legend"><span className="lg raw" /> real customer data <span className="lg tok" /> Aran tokens <span className="lg clean" /> nothing sensitive
        <span className="grow" />
        <span className="mono small">{fmt(sent)} requests · {fmt(prot)} values protected</span></div>
      <div className="row">
        <button onClick={send}>Send a real request</button>
        <button className="secondary" onClick={() => setAuto(!auto)}>{auto ? '❚❚ Stop the stream' : '▶ Stream requests'}</button>
      </div>
      {showInput && <div className="own">
        <input className="grow mono" value={text} onChange={e => setText(e.target.value)} placeholder="Or type your own message, e.g. my card is 4111 1111 1111 1111, OTP 482913" />
        <select value={sink} onChange={e => setSink(e.target.value)} aria-label="Send to">{SINKS.map(s => <option key={s[0]} value={s[0]}>to {s[1]}</option>)}</select>
        <button onClick={sendOwn} disabled={!text.trim()}>Send</button>
      </div>}
      {err && <div className="err">{err}</div>}
      {latest && <div className="ba" key={latest.id}>
        <div><div className="ba-h raw">Sent by {latest.source}</div><Marked text={latest.before} findings={latest.findings} /></div>
        <div className="ba-arrow">→</div>
        <div><div className="ba-h tok">Stored by {latest.sink} · {latest.latency_ms} ms</div><Tokens text={latest.after} findings={latest.findings} /></div>
      </div>}
    </div>
  )
}

// ------------------------------------------------------------------ 2. false-alarm rain
export function AlarmGrids({ r }) {
  const max = Math.max(1, ...r.cells.map(c => c[0]))
  return (
    <div className="grids">
      {[['Plain pattern search', 0, 'danger'], ['Aran', 1, 'calm']].map(([t, k, tone]) => (
        <div key={t} className={'grid-card ' + tone}>
          <div className="gc-h"><b>{t}</b><span className="gc-n mono"><CountUp to={k ? r.aran_total : r.naive_total} ms={1600} /></span></div>
          <div className="gc-sub small muted">false alarms in {r.lines} real log lines</div>
          <div className="cellgrid" role="img" aria-label={`${t}: ${k ? r.aran_total : r.naive_total} false alarms`}>
            {r.cells.map((c, i) => <span key={i} style={{ animationDelay: `${i * 5}ms`, '--a': c[k] ? 0.35 + 0.65 * Math.min(1, c[k] / max) : 0 }} className={c[k] ? 'hit' : ''} />)}
          </div>
        </div>))}
    </div>
  )
}

// ------------------------------------------------------------------ 3. check-digit maths
export function ChecksumAnim({ r }) {
  const steps = r.steps
  const s = useStepper(steps.length, 520)
  useEffect(() => { s.play() }, [r])
  const n = r.digits.length
  const cur = s.i > 0 ? steps[Math.min(s.i, steps.length) - 1] : null
  const verhoeff = r.kind.startsWith('Aadhaar')
  const sum = verhoeff ? null : steps.slice(0, s.i).reduce((a, x) => a + x.value, 0)
  return (
    <div className="scene">
      <div className="digits">
        {r.digits.split('').map((d, k) => {
          const pos = k + 1
          const idx = steps.findIndex(x => x.position === pos)
          const st = idx < s.i - 1 ? 'done' : idx === s.i - 1 ? 'now' : ''
          const step = steps[idx]
          return (
            <div key={k} className={'dg ' + st + (k === n - 1 ? ' chk' : '')}>
              <span className="mono">{d}</span>
              {!verhoeff && step.doubled && <em>×2</em>}
              {!verhoeff && idx < s.i && <i className="mono">{step.value}</i>}
              {verhoeff && idx < s.i && <i className="mono">{step.after}</i>}
            </div>)
        })}
      </div>
      <div className="calc">
        {verhoeff ? <>
          <Dial value={cur ? cur.after : 0} />
          <div className="calc-t">
            {cur ? <><div className="small muted">digit at position {cur.position}</div>
              <div className="mono big2">{cur.digit} <span className="muted">shuffled to</span> {cur.permuted}</div>
              <div className="mono big2">{cur.before} <span className="muted">combined</span> → <b className="accent">{cur.after}</b></div></>
              : <div className="muted">Press play to run the Verhoeff check from the last digit</div>}
          </div>
        </> : <>
          <div className="sumbar"><div className="sb-fill" style={{ width: `${Math.min(100, (sum / (Math.ceil(Math.max(r.total, 10) / 10) * 10 + 10)) * 100)}%` }} />
            {Array.from({ length: Math.ceil(Math.max(r.total, 10) / 10) + 1 }, (_, t) => <span key={t} className="tick" style={{ left: `${((t + 1) * 10 / (Math.ceil(Math.max(r.total, 10) / 10) * 10 + 10)) * 100}%` }}>{(t + 1) * 10}</span>)}
          </div>
          <div className="calc-t">
            {cur ? <><div className="small muted">digit at position {cur.position}{cur.doubled ? ', doubled' : ''}</div>
              <div className="mono big2">{cur.digit}{cur.doubled ? <> ×2 → {cur.value}</> : null} <span className="muted">running total</span> <b className="accent">{sum}</b></div></>
              : <div className="muted">Press play to run the Luhn check from the last digit</div>}
          </div>
        </>}
      </div>
      {s.done && <div className={'verdict ' + (r.valid ? 'ok' : 'bad')} key={r.digits}>
        {r.valid ? <>✓ Ends at {verhoeff ? '0' : `${r.total}, a multiple of 10`}: <b>could be a real number</b></>
          : <>✗ Ends at {verhoeff ? r.final : r.total}: <b>cannot be real</b> · the last digit should be {r.correct_check_digit}</>}
      </div>}
      <Controls s={s} playLabel="Run the check" />
    </div>
  )
}

function Dial({ value }) {
  // Verhoeff's running value lives in a group of 10 elements (the symmetries of a pentagon).
  return (
    <svg viewBox="-60 -60 120 120" className="dial" role="img" aria-label={`running value ${value}`}>
      <polygon points={[0, 1, 2, 3, 4].map(k => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return `${32 * Math.cos(a)},${32 * Math.sin(a)}` }).join(' ')} className="penta" />
      {Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 10; return (
        <g key={k} className={'dn' + (k === value ? ' on' : '') + (k === 0 ? ' zero' : '')}>
          <circle cx={48 * Math.cos(a)} cy={48 * Math.sin(a)} r="9" /><text x={48 * Math.cos(a)} y={48 * Math.sin(a) + 3.5} textAnchor="middle">{k}</text></g>) })}
      <line x1="0" y1="0" x2="0" y2="-36" className="needle" style={{ transform: `rotate(${value * 36}deg)` }} />
    </svg>
  )
}

// ------------------------------------------------------------------ 4. building a token
export function TokenForge({ r }) {
  // frames: 0 real · 1 split · 2..11 FF1 rounds · 12 correct check · 13 add offset · 14 final
  const s = useStepper(15, 700)
  useEffect(() => { s.play() }, [r])
  const f = s.i
  const round = f >= 2 && f <= 11 ? r.rounds[f - 2] : f > 11 ? r.rounds[9] : null
  const body = round ? round.left + round.right : r.body
  const leftLen = round ? round.left.length : 5
  const bad = String((Number(r.right_check) + r.offset) % 10)
  const label = f === 0 ? 'A real (generated) Aadhaar: the last digit passes Verhoeff'
    : f === 1 ? 'Keep the first 11 digits; set the check digit aside'
      : f <= 11 ? `Encryption round ${f - 1} of 10: one half is mixed with an AES fingerprint of the other, then they swap`
        : f === 12 ? `The correct check digit for the new digits would be ${r.right_check}`
          : f === 13 ? `Add this system's secret offset (+${r.offset}): ${r.right_check} + ${r.offset} → ${bad}`
            : 'The token: same length, same look, guaranteed to fail Verhoeff'
  return (
    <div className="scene forge">
      <div className="forge-row">
        <div className={'cells big mono' + (f >= 2 && f <= 11 ? ' rolling' : '')} key={'b' + f}>
          {body.split('').map((d, k) => <span key={k} className={(f >= 2 && f <= 11 && k < leftLen ? 'half-a' : f >= 2 && f <= 11 ? 'half-b' : '') + (f >= 14 ? ' tokc' : '')} style={{ animationDelay: `${k * 25}ms` }}>{d}</span>)}
          <span className={'chk ' + (f === 0 ? 'real' : f >= 13 ? 'bad' : f === 12 ? 'real ghost' : 'off')}>
            {f === 0 ? r.check : f === 12 ? r.right_check : f >= 13 ? bad : '·'}</span>
        </div>
      </div>
      <div className="forge-cap">{label}</div>
      {f >= 2 && f <= 11 && <div className="aes mono small" key={'a' + f}>AES → {round.aes}… <span className="muted">tweak "{r.sink}"</span></div>}
      <div className="rounds">{r.rounds.map((x, k) => <span key={k} className={k + 2 < f ? 'done' : k + 2 === f ? 'now' : ''} />)}</div>
      {f >= 14 && <div className="forge-out">
        <div className="cmp"><span className="lbl">Real</span><span className="mono">{r.aadhaar}</span><span className="pill ok">✓ passes</span></div>
        <div className="cmp"><span className="lbl">Token</span><span className="mono tok-t">{r.token}</span><span className="pill danger">✗ fails</span></div>
        <div className={'cmp small ' + (r.matches ? 'ok-t' : 'danger-t')}>{r.matches ? '✓ The live firewall issued exactly this token when the Aadhaar was sent to ' + r.sink : '✗ The live firewall issued ' + r.firewall_token}</div>
      </div>}
      <Controls s={s} playLabel="Build the token" />
    </div>
  )
}

// ------------------------------------------------------------------ 5. detection: scan, clues, gauge
const CLUE = {
  checksum: 'check digit passes', iin: 'card-issuer prefix', len16: '16 digits', kw: 'keyword nearby', plus91: 'starts with +91',
  keyfield: 'phone-like field name', sendto: '"called from" / "sent to"', idword: 'looks like an order ID', ner: 'AI name/address model',
  ntok: 'length', digit: 'contains digits', calendar: 'looks like a date', title: 'capitalised', deva: 'Devanagari script', cue: 'context word',
  pin: 'PIN code', comma: 'commas', ctx: 'context model', otp_ctx: 'OTP context model', upi_ctx: 'UPI context model', handle: 'UPI handle',
}
const AGAINST = new Set(['idword', 'calendar'])
const squash = (k, v) => (k === 'ner' ? 1 / (1 + Math.exp(-v)) : Math.max(0, Math.min(1, v)))

export function Gauge({ p, threshold = 0.5 }) {
  const a = -90 + p * 180, ta = (-90 + threshold * 180) * Math.PI / 180
  return (
    <svg viewBox="-70 -66 140 80" className="gauge" role="img" aria-label={`probability ${pct(p)}, threshold ${pct(threshold)}`}>
      <path d="M -56 0 A 56 56 0 0 1 56 0" className="g-bg" />
      <path d="M -56 0 A 56 56 0 0 1 56 0" className="g-fg" style={{ strokeDasharray: `${p * 176} 176` }} />
      <line x1={50 * Math.sin(ta)} y1={-50 * Math.cos(ta)} x2={64 * Math.sin(ta)} y2={-64 * Math.cos(ta)} className="g-thr" />
      <line x1="0" y1="0" x2="0" y2="-46" className="g-needle" style={{ transform: `rotate(${a}deg)` }} />
      <circle r="4" className="g-hub" />
      <text y="-14" textAnchor="middle" className="g-t">{pct(p)}</text>
    </svg>
  )
}

export function DetectScene({ ev }) {
  const [pick, setPick] = useState(ev.findings[0] || null)
  useEffect(() => setPick(ev.findings[0] || null), [ev])
  return (
    <div className="scene">
      <div className="scanbox" key={ev.id}><Marked text={ev.before} findings={ev.findings} active={pick} onPick={setPick} /></div>
      <div className="small muted">Tap any highlighted value.</div>
      <div className="chips">{ev.findings.map((f, i) => <button key={i} className={'chip' + (f === pick ? ' on' : '')} onClick={() => setPick(f)}>{TYPE_LABEL[f.type] || f.type} {pct(f.p)}</button>)}</div>
      {pick && <div className="clues" key={pick.start}>
        <div className="clue-g"><Gauge p={pick.p} /><div className="small muted">replaced at or above the mark</div></div>
        <div className="clue-list">
          <b>{TYPE_LABEL[pick.type] || pick.type}: <span className="mono">{ev.before.slice(pick.start, pick.end)}</span></b>
          {Object.entries(pick.evidence).map(([k, v], i) => (
            <div key={k} className={'clue' + (AGAINST.has(k) ? ' against' : '')} style={{ animationDelay: `${i * 90}ms` }}>
              <span>{CLUE[k] || k}</span><div className="cbar"><div style={{ width: `${squash(k, v) * 100}%`, transitionDelay: `${i * 90}ms` }} /></div></div>))}
          {pick.registry && <div className="clue reg"><span>bank's own customer list</span><b>{pick.registry === 'hit' ? '✓ match' : pick.registry}</b></div>}
        </div>
      </div>}
      <div className="ba">
        <div><div className="ba-h tok">What was stored · {ev.latency_ms} ms</div><Tokens text={ev.after} findings={ev.findings} /></div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ 6. disguises
export function EvasionCards({ r }) {
  const s = useStepper(r.rows.length, 330)
  useEffect(() => { s.play() }, [r])
  const caught = r.rows.slice(0, s.i).filter(x => x.caught).length
  return (
    <div className="scene">
      <div className="ev-head"><span className="big3 mono">{caught}<span className="muted">/{r.rows.length}</span></span> disguises caught</div>
      <div className="evgrid">
        {r.rows.map((x, k) => (
          <div key={x.trick} className={'evc' + (k < s.i ? (x.caught ? ' caught' : ' missed') : '')}>
            <div className="evc-t">{x.trick}</div>
            <div className="evc-in mono">{x.before.replace('customer update ', '')}</div>
            {k < s.i && <div className="evc-out mono">{x.after.replace('customer update ', '')}</div>}
            {k < s.i && <div className="evc-badge">{x.caught ? '✓' : '✗'}</div>}
          </div>))}
      </div>
      <Controls s={s} playLabel="Unmask them" />
    </div>
  )
}

// ------------------------------------------------------------------ 7. leak trace
const TSINK = [['log-platform', 'Log platform'], ['crm-notes', 'CRM notes'], ['loan-vendor', 'Loan vendor'], ['marketing-cloud', 'Marketing']]
export function TraceMap({ t, onLeak }) {
  const [leak, setLeak] = useState(null) // {sink, t0, res}
  const now = useNow(leak && performance.now() - leak.t0 < 4200)
  const W = 860, ty = i => 44 + i * 82, CX = 110, CY = 167, SX = 430, DX = 760, DY = 167
  const go = async sink => {
    const at = performance.now()
    setLeak({ sink, t0: at, res: null })
    const res = await onLeak(sink)
    setLeak(l => l && l.sink === sink ? { ...l, res } : l)
  }
  const el = leak ? now - leak.t0 : 0
  const li = leak ? TSINK.findIndex(s => s[0] === leak.sink) : -1
  const found = leak && leak.res && leak.res.top ? TSINK.findIndex(s => s[0] === leak.res.top.sink) : -1
  let doc = null
  if (leak && el < 1100) { const k = ease(el / 1100); doc = [SX + 75 + (DX - 40 - SX - 75) * k, ty(li) + (DY - ty(li)) * k] }
  const beam = leak && leak.res && el > 1700
  const done = leak && leak.res && el > 2900
  return (
    <div className="scene">
      <div className="scene-scroll">
        <svg viewBox={`0 0 ${W} 340`} className="tmap" role="img" aria-label="One customer's Aadhaar went to four systems; each got a different token">
          {TSINK.map((s, i) => <path key={s[0]} d={`M ${CX + 70} ${CY} C ${CX + 160} ${CY}, ${SX - 90} ${ty(i)}, ${SX} ${ty(i)}`} className="lane on-soft" />)}
          <g className="node cust" transform={`translate(${CX - 70},${CY - 34})`}><rect width="140" height="68" rx="10" />
            <text x="70" y="28" textAnchor="middle">{t.name}</text><text x="70" y="48" textAnchor="middle" className="mono sm">{t.aadhaar}</text></g>
          {t.sinks.map((s, i) => (
            <g key={s.sink} className={'node sink' + (i === li ? ' leaked' : '') + (done && i === found ? ' found' : '')} transform={`translate(${SX},${ty(i) - 30})`}>
              <rect width="200" height="60" rx="10" /><text x="100" y="24" textAnchor="middle">{TSINK[i][1]}</text>
              <text x="100" y="44" textAnchor="middle" className="mono sm tokfill">{s.aadhaar_token}</text></g>))}
          <g className={'node dark' + (leak ? ' on' : '')} transform={`translate(${DX - 60},${DY - 36})`}><rect width="120" height="72" rx="10" />
            <text x="60" y="30" textAnchor="middle">Dark web</text><text x="60" y="50" textAnchor="middle" className="sm">leaked file</text></g>
          {doc && <g transform={`translate(${doc[0]},${doc[1]})`} className="doc"><rect x="-14" y="-18" width="28" height="36" rx="3" /><path d="M -8 -8 H 8 M -8 0 H 8 M -8 8 H 4" /></g>}
          {beam && found >= 0 && <path key={leak.t0} d={`M ${DX - 60} ${DY} C ${DX - 140} ${DY}, ${SX + 290} ${ty(found)}, ${SX + 200} ${ty(found)}`} className="beam" />}
        </svg>
      </div>
      <div className="row">{TSINK.map(s => <button key={s[0]} className="secondary" onClick={() => go(s[0])}>Leak {s[1]}</button>)}</div>
      {done && <div className={'verdict ' + (found === li ? 'ok' : 'bad')}>
        {found === li ? <>✓ From the leaked text alone, Aran named <b>{leak.res.top.sink}</b> ({leak.res.matched} matching token{leak.res.matched === 1 ? '' : 's'})</>
          : <>Aran named {leak.res.top ? leak.res.top.sink : 'no system'}</>}</div>}
    </div>
  )
}

// ------------------------------------------------------------------ 8. erasure: keys, shatter, receipt
function KeyIcon({ state }) {
  return (
    <svg viewBox="0 0 64 40" className={'key ' + state} aria-hidden="true">
      {state === 'gone' ? [0, 1, 2, 3, 4].map(k => <path key={k} className="shard" style={{ '--dx': `${(k - 2) * 14}px`, '--dy': `${(k % 2 ? -1 : 1) * 16}px`, '--r': `${(k - 2) * 40}deg` }} d={['M4 12h14v16H4z', 'M18 16h12v8H18z', 'M30 16h12v8H30z', 'M42 16h12v8H42z', 'M50 24h6v8h-6z'][k]} />) : <>
        <circle cx="14" cy="20" r="11" /><circle cx="14" cy="20" r="4" className="hole" />
        <path d="M25 17h33v6H25z" /><path d="M48 23h5v8h-5zM40 23h4v6h-4z" /></>}
    </svg>
  )
}

const enc = new TextEncoder()
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0))
const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('')
async function sha(...parts) {
  const n = parts.reduce((a, p) => a + p.length, 0), buf = new Uint8Array(n)
  let o = 0; for (const p of parts) { buf.set(p, o); o += p.length }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
}
function canon(v, k) {
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(x => JSON.stringify(x) + ':' + canon(v[x], x)).join(',') + '}'
  if (typeof v === 'number' && k === 'at' && Number.isInteger(v)) return v + '.0' // Python writes floats as 1.0
  return JSON.stringify(v)
}
// RFC 9162 inclusion check, recomputed in this browser, keeping every intermediate hash.
export async function browserInclusion(rc) {
  let r = await sha(new Uint8Array([0]), enc.encode(canon(rc.event)))
  const chain = [hex(r)]
  let fn = rc.leaf_index, sn = rc.tree_size - 1
  for (const p of rc.proof.map(b64)) {
    if (sn === 0) return { chain, ok: false }
    if (fn % 2 === 1 || fn === sn) {
      r = await sha(new Uint8Array([1]), p, r)
      if (fn % 2 === 0) while (fn % 2 === 0 && fn !== 0) { fn >>= 1; sn >>= 1 }
    } else r = await sha(new Uint8Array([1]), r, p)
    fn >>= 1; sn >>= 1
    chain.push(hex(r))
  }
  return { chain, ok: sn === 0 && hex(r) === hex(b64(rc.root)) }
}

export function MerkleChain({ receipt, result }) {
  const [bi, setBi] = useState(null)
  useEffect(() => { browserInclusion(receipt).then(setBi).catch(() => setBi({ chain: [], ok: null })) }, [receipt])
  const s = useStepper(bi ? bi.chain.length : 0, 380)
  useEffect(() => { if (bi && bi.chain.length) s.play() }, [bi])
  if (!bi) return null
  return (
    <div className="merkle">
      <div className="small muted">Your browser re-checks the receipt itself: {bi.chain.length - 1} hashes from this erasure up to the log's signed root.</div>
      <div className="mchain">
        {bi.chain.map((h, k) => <div key={k} className={'mh mono' + (k < s.i ? ' on' : '')}><span>{k === 0 ? 'erasure' : k === bi.chain.length - 1 ? 'root' : 'level ' + k}</span>{h.slice(0, 10)}…</div>)}
      </div>
      {s.done && <div className="chips">
        <span className={'chip ' + (bi.ok ? 'okc' : 'badc')}>{bi.ok ? '✓ in the log (checked in your browser)' : bi.ok === null ? 'browser check unavailable' : '✗ not in the log'}</span>
        <span className={'chip ' + (result.signature_valid ? 'okc' : 'badc')}>{result.signature_valid ? (result.post_quantum_valid ? '✓ Ed25519 + ML-DSA-65 signatures valid' : '✓ Ed25519 signature valid') : '✗ signature invalid'}</span>
      </div>}
    </div>
  )
}

export function ErasureScene() {
  const [st, setSt] = useState({})
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const step = async fn => { setBusy(true); setErr(null); try { await fn() } catch (e) { setErr(e.message) } setBusy(false) }
  const enrol = () => step(async () => { const c = await api('/customers', {}); setSt({ cust: await api('/customers/' + c.ref) }) })
  const send = () => step(async () => {
    const ev = await api('/tour/customer-loan', { customer_ref: st.cust.ref })
    const tok = ev.findings.find(f => f.type === 'AADHAAR' && f.token)
    const read = await api('/detokenise', { token: tok.token, caller: 'loan-vendor' })
    setSt(s => ({ ...s, token: tok.token, read }))
  })
  const erase = () => step(async () => {
    const receipt = await api('/erase', { customer_ref: st.cust.ref, purpose: 'Loans' })
    const read2 = await api('/detokenise', { token: st.token, caller: 'loan-vendor' })
    const check = await api('/receipts/verify', receipt)
    const bad = JSON.parse(JSON.stringify(receipt)); bad.event.tokens_unreadable += 1
    const tamper = await api('/receipts/verify', bad)
    setSt(s => ({ ...s, receipt, read2, check, tamper }))
  })
  const kyc = () => step(async () => {
    try { await api('/erase', { customer_ref: st.cust.ref, purpose: 'KYC' }); setSt(s => ({ ...s, kyc: 'erased' })) }
    catch (e) { setSt(s => ({ ...s, kyc: e.message })) }
  })
  const keys = ['KYC', 'Loans', 'Service', 'Marketing']
  const stage = st.receipt ? 3 : st.read ? 2 : st.cust ? 1 : 0
  return (
    <div className="scene erase">
      <div className="estages">{['Enrol', 'Send a loan', 'Erase Loans'].map((x, k) => <span key={x} className={k < stage ? 'done' : k === stage ? 'now' : ''}>{k + 1}. {x}</span>)}</div>
      <div className="vault">
        <div className="vcust">{st.cust ? <><b>{st.cust.name}</b><div className="mono small muted">{st.cust.ref} · {st.cust.masked.AADHAAR}</div></> : <span className="muted">No customer yet</span>}</div>
        <div className="keys">{keys.map(k => {
          const state = !st.cust ? 'none' : k === 'Loans' && st.receipt ? 'gone' : k === 'KYC' ? 'locked' : 'alive'
          return <div key={k + (state === 'gone' ? 'x' : '')} className={'keybox ' + state + (k === 'KYC' && st.kyc && st.kyc !== 'erased' ? ' shake' : '')}>
            <KeyIcon state={state === 'none' ? 'ghost' : state} />{state === 'locked' && <span className="padlock" title="retention lock">🔒</span>}<span>{k}</span>
            {state === 'gone' && <span className="small danger-t">destroyed</span>}{state === 'locked' && <span className="small muted">locked 5 yrs</span>}</div>
        })}</div>
        <div className="vendor">
          <div className="small muted">Loan vendor's database</div>
          {st.token ? <div className={'vtok mono' + (st.read2 ? ' dead' : '')}>{st.token}</div> : <div className="vtok empty">empty</div>}
          {st.read && <div className="small">Bank reads it: {st.read2 ? <span className="danger-t">unreadable, key destroyed</span> : <span className="ok-t mono">{st.read.value}</span>}</div>}
        </div>
      </div>
      <div className="row">
        <button onClick={enrol} disabled={busy}>{st.cust ? 'Enrol another' : '1. Enrol a customer'}</button>
        <button onClick={send} disabled={busy || !st.cust || !!st.read}>2. Send their loan application</button>
        <button className="danger" onClick={erase} disabled={busy || !st.read || !!st.receipt}>3. Erase Loans</button>
        <button className="secondary" onClick={kyc} disabled={busy || !st.cust}>Try erasing KYC</button>
      </div>
      {st.kyc && <div className={st.kyc === 'erased' ? 'ok' : 'err'}>{st.kyc === 'erased' ? 'KYC erased' : '🔒 Refused: ' + st.kyc}</div>}
      {err && <div className="err">{err}</div>}
      {st.receipt && <div className="receipt">
        <div className="rc-h"><b>Signed erasure receipt</b><span className="mono small muted">entry {st.receipt.leaf_index + 1} of {st.receipt.tree_size}</span></div>
        <div className="small">{st.receipt.event.tokens_unreadable} token(s) made unreadable everywhere.</div>
        <MerkleChain receipt={st.receipt} result={st.check} />
        <div className="chips"><span className={'chip ' + (st.tamper.valid ? 'badc' : 'okc')}>{st.tamper.valid ? '✗ edited copy still passed' : '✓ an edited copy of the receipt fails the check'}</span></div>
      </div>}
    </div>
  )
}

// ------------------------------------------------------------------ 9. immune radar
const FEAT = { volume_z: 'volume', raw_frac_z: 'left raw', hour_distance: 'odd hour', pair_novel: 'new route', class_novel: 'new data type', detok_log: 'read-backs', cust_ratio: 'customers' }
export function Radar({ names, windows }) {
  const R = 118, n = names.length
  const pt = (k, v) => { const a = -Math.PI / 2 + k * 2 * Math.PI / n; const r = R * Math.min(1, Math.max(0, v)); return [r * Math.cos(a), r * Math.sin(a)] }
  const ring = v => names.map((_, k) => pt(k, v).join(',')).join(' ')
  return (
    <svg viewBox="-190 -150 380 300" className="radar" role="img" aria-label="Recent traffic windows against the normal range learned by the immune layer">
      <polygon points={ring(0.7)} className="band" /><polygon points={ring(0.1)} className="band-in" />
      {[0.25, 0.5, 0.75, 1].map(v => <polygon key={v} points={ring(v)} className="grid" />)}
      {names.map((nm, k) => { const [x, y] = pt(k, 1.12); return <g key={nm}><line x1="0" y1="0" x2={pt(k, 1)[0]} y2={pt(k, 1)[1]} className="grid" />
        <text x={x} y={y + 4} textAnchor={Math.abs(x) < 10 ? 'middle' : x > 0 ? 'start' : 'end'} className="ax">{FEAT[nm] || nm}</text></g> })}
      {[...windows].reverse().map((w, i) => <polygon key={w.at + w.src + w.sink} points={w.z.map((v, k) => pt(k, v).join(',')).join(' ')}
        className={'win' + (w.alert ? ' alert' : '') + (i === windows.length - 1 ? ' newest' : '')} />)}
    </svg>
  )
}

export function ImmuneScene({ go }) {
  const [r, setR] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [err, setErr] = useState(null)
  const [drill, setDrill] = useState(null)
  useEffect(() => {
    let live = true
    const f = async () => { try { const x = await api('/tour/immune-radar'); if (live) setR(x); if (x.mode === 'watching') { const im = await api('/immune'); if (live) setAlerts(im.alerts.slice(0, 3)) } } catch (e) { live && setErr(e.message) } }
    f(); const t = setInterval(f, 2000)
    return () => { live = false; clearInterval(t) }
  }, [])
  if (!r) return <div className="muted">loading…</div>
  const learn = async () => { setErr(null); try { await api('/immune/learn', { seconds: 360 }) } catch (e) { setErr(e.message) } }
  const run = async k => { setErr(null); try { await api('/drills/' + k, {}); setDrill({ k, at: Date.now() }) } catch (e) { setErr(e.message) } }
  const left = r.learn_left ?? 0
  return (
    <div className="scene immune">
      {r.mode === 'idle' && <div className="learn-card">
        <div className="pulse-ring"><span>?</span></div>
        <div><b>Not trained yet.</b> It must first watch 6 minutes of normal traffic (real production logs replayed through the firewall).
          {r.state.error && <div className="small danger-t">{r.state.error}</div>}
          <div className="row"><button onClick={learn}>Learn normal traffic</button></div></div>
      </div>}
      {r.mode === 'learning' && <div className="learn-card">
        <svg viewBox="-50 -50 100 100" className="prog"><circle r="42" className="p-bg" /><circle r="42" className="p-fg" style={{ strokeDasharray: `${(1 - left / 360) * 264} 264` }} /><text y="6" textAnchor="middle">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</text></svg>
        <div><b>Learning what "normal" looks like…</b><div className="small muted">Real log lines are flowing through the firewall right now. You can explore other chapters and come back.</div></div>
      </div>}
      {r.mode === 'watching' && <>
        <div className="radar-wrap">
          <Radar names={r.names} windows={r.windows.slice(0, 8)} />
          <div className="radar-side">
            <div className="legend col"><span><i className="lg band" /> normal range it learned</span><span><i className="lg win" /> a 30-second traffic window</span><span><i className="lg alert" /> outside normal: alert</span></div>
            <div className="small muted">Next check in <b className="mono">{Math.ceil(r.next_window_in)}s</b> · {r.state.detectors} detectors</div>
            <div className="drills">{[['new-sink', 'Send data to an unknown site'], ['bulk-export', 'Bulk export'], ['detok-spike', 'Insider reads many numbers'], ['bypass', 'Switch the firewall off']].map(([k, l]) =>
              <button key={k} className="secondary" onClick={() => run(k)}>⚡ {l}</button>)}</div>
            {drill && <div className="small">Drill "{drill.k}" sent. Watch the radar at the next check.</div>}
          </div>
        </div>
        {alerts.map(a => <div key={a.id} className="alert pop"><b>⚠ {a.src} → {a.sink}</b><ul>{a.reasons.map(x => <li key={x}>{x}</li>)}</ul></div>)}
      </>}
      {err && <div className="err">{err}</div>}
      <button className="ghost" onClick={() => go('immune')}>Open the full immune console →</button>
    </div>
  )
}

// ------------------------------------------------------------------ 10. AI gateway
const ROLES = [['customer-care', 'Customer care'], ['kyc-officer', 'KYC officer'], ['analyst', 'Analyst']]
const PH_RX = /(<(?:AADHAAR|CARD|MOBILE|PAN|OTP|UPI|PER|ADDR)_\d+>)/g
const Ph = ({ text }) => <>{text.split(PH_RX).map((p, i) => /^<[A-Z]+_\d+>$/.test(p) ? <mark key={i} className="m-token">{p}</mark> : p)}</>

export function GatewayScene() {
  const [text, setText] = useState('')
  const [role, setRole] = useState('customer-care')
  const [res, setRes] = useState(null)
  const [all, setAll] = useState(null)
  const [err, setErr] = useState(null)
  const s = useStepper(4, 900)
  useEffect(() => {
    api('/tour/generate').then(g => {
      const mob = '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
      setText(`Customer Meena Iyer, mobile ${mob}, says card ${g.card} was charged twice. Her Aadhaar is ${g.aadhaar}. Draft a polite reply.`)
    }).catch(() => {})
  }, [])
  const ask = async () => { setErr(null); setAll(null); try { setRes(await api('/tour/gateway', { role, text })); s.play() } catch (e) { setErr(e.message) } }
  const compare = async () => { setErr(null); try { setAll(await Promise.all(ROLES.map(([r]) => api('/tour/gateway', { role: r, text })))) } catch (e) { setErr(e.message) } }
  return (
    <div className="scene gw">
      <div className="chips">{ROLES.map(([k, l]) => <button key={k} className={'chip' + (role === k ? ' on' : '')} onClick={() => setRole(k)}>{l}</button>)}</div>
      <textarea rows="3" value={text} onChange={e => setText(e.target.value)} aria-label="Message to the AI assistant" />
      <div className="row"><button onClick={ask} disabled={!text.trim()}>Ask the AI through Aran</button><button className="secondary" onClick={compare} disabled={!text.trim()}>Compare all three roles</button></div>
      {err && <div className="err">{err}</div>}
      {res && <div className="gwflow">
        <div className={'bub staff' + (s.i >= 1 ? ' show' : '')}><div className="who">Staff ({ROLES.find(r => r[0] === res.role)[1]})</div>{text}</div>
        <div className={'gwshield' + (s.i >= 2 ? ' show' : '')}>ARAN · {res.findings_in_prompt} values replaced · {res.ms.tokenise} ms</div>
        <div className={'bub prov' + (s.i >= 2 ? ' show' : '')}><div className="who">What the AI provider saw</div><Ph text={res.provider_saw[0].content} /></div>
        <div className={'bub prov r' + (s.i >= 3 ? ' show' : '')}><div className="who">AI reply ({res.provider})</div><Ph text={res.provider_reply} /></div>
        <div className={'bub staff r' + (s.i >= 4 ? ' show' : '')}><div className="who">What the staff member sees</div>{res.reply}
          {res.audit_last && <div className="small muted">shown {Object.entries(res.audit_last.shown).map(([k, v]) => `${TYPE_LABEL[k] || k} ${v}`).join(', ') || 'none'} · masked {res.audit_last.masked} · audit chain {res.audit_ok ? '✓ intact' : '✗ broken'}</div>}</div>
      </div>}
      {all && <div className="roles3">{all.map(x => <div key={x.role} className="card"><div className="who">{ROLES.find(r => r[0] === x.role)[1]} sees</div><div className="small">{x.reply}</div></div>)}</div>}
    </div>
  )
}

// ------------------------------------------------------------------ breaches timeline
export const BREACHES = [
  ['2016', '3.2 M debit cards', 'Malware at a payment processor', 'Leaks start at partners'],
  ['2019', 'SBI SMS logs', 'Server logs left open, balances visible', 'Log files leak'],
  ['2020', '35 M masked cards', 'Juspay records sold months later', 'First sign is a dump outside'],
  ['2023', 'Code in ChatGPT', 'Samsung staff pasted secrets into AI', 'AI is a new exit'],
  ['2024', '31 M Star Health', 'Records sold through Telegram bots', '"Who leaked it?"'],
]
export function Timeline() {
  const [i, setI] = useState(4)
  return (
    <div className="tl">
      <div className="tl-line">{BREACHES.map((b, k) => <button key={b[0]} className={'tl-dot' + (k === i ? ' on' : '')} onClick={() => setI(k)} style={{ animationDelay: `${k * 120}ms` }}><span className="mono">{b[0]}</span><b>{b[1]}</b></button>)}</div>
      <div className="tl-card" key={i}><b>{BREACHES[i][2]}</b><span className="pill danger">{BREACHES[i][3]}</span></div>
    </div>
  )
}
