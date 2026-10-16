export async function api(path, body) {
  const res = await fetch('/api' + path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || res.statusText)
  return data
}

import { useEffect, useState, useCallback } from 'react'

// Poll an endpoint every `ms` milliseconds; returns [data, error, reload].
export function usePoll(path, ms = 3000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(() => api(path).then(d => { setData(d); setError(null) }).catch(e => setError(e.message)), [path])
  useEffect(() => {
    load()
    if (!ms) return
    const t = setInterval(load, ms)
    return () => clearInterval(t)
  }, [load, ms])
  return [data, error, load]
}

export const fmt = n => (n === null || n === undefined ? '–' : Number(n).toLocaleString('en-IN'))
export const pct = p => (p * 100).toFixed(p >= 0.995 || p <= 0.005 ? 1 : 0) + '%'
export const ago = t => {
  const s = Math.max(0, Math.round(Date.now() / 1000 - t))
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`
}
