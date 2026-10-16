import React, { useEffect, useState } from 'react'
import { api } from './api.js'
import Tour from './pages/Tour.jsx'
import Overview from './pages/Overview.jsx'
import Traffic from './pages/Traffic.jsx'
import Customers from './pages/Customers.jsx'
import Trace from './pages/Trace.jsx'
import Immune from './pages/Immune.jsx'
import Results from './pages/Results.jsx'
import About from './pages/About.jsx'

const PAGES = [
  ['tour', 'Guided tour', Tour],
  ['overview', 'Overview', Overview],
  ['traffic', 'Live traffic', Traffic],
  ['customers', 'Customers & erasure', Customers],
  ['trace', 'Leak trace', Trace],
  ['immune', 'Immune layer', Immune],
  ['results', 'Results & tests', Results],
  ['about', 'How it works', About],
]

function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="var(--brand-fill)" />
      <path d="M6 24V12h4v-4h4v4h4v-4h4v4h4v12z" fill="var(--accent)" />
      <rect x="21" y="18" width="5" height="6" fill="var(--token)" />
    </svg>
  )
}

export default function App() {
  const [page, setPage] = useState(() => location.hash.slice(1).split('/')[0] || 'tour')
  const [health, setHealth] = useState(null)
  const [menu, setMenu] = useState(false)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('aran-theme') || 'dark' } catch { return 'dark' } })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('aran-theme', theme) } catch {}
  }, [theme])
  useEffect(() => {
    const f = () => setPage(location.hash.slice(1).split('/')[0] || 'tour')
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  useEffect(() => {
    let t
    const poll = () => api('/health').then(h => { setHealth(h); if (!h.ready) t = setTimeout(poll, 2000) }).catch(() => (t = setTimeout(poll, 2000)))
    poll()
    return () => clearTimeout(t)
  }, [])

  const go = id => { location.hash = id; setMenu(false) }
  const Page = (PAGES.find(p => p[0] === page) || PAGES[0])[2]

  return (
    <div className="shell">
      <aside className={'side' + (menu ? ' open' : '')}>
        <div className="brand"><Mark /><div><b>Aran</b><span className="tamil">அரண்</span></div></div>
        <nav>
          {PAGES.map(([id, label]) => (
            <a key={id} href={'#' + id} className={page === id ? 'on' : ''} onClick={() => go(id)}>{label}</a>
          ))}
        </nav>
        <div className="side-foot">
          <a href="https://github.com/itzz-inbathamizhans/aran" target="_blank" rel="noreferrer">Source on GitHub</a>
          <span>KARE · Banking & FinTech</span>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <button className="ghost menu-btn" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
          <span className="env">LIVE · every value computed by Aran's code · identifiers are generated, never real people</span>
          <button className="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
        </header>
        <main className="content">
          {health && health.ready ? <Page go={go} /> : (
            <div className="loading card">
              <div className="spinner" />
              <h2>Starting Aran</h2>
              <p className="muted">{health && health.error ? 'Load failed: ' + health.error : 'Loading the trained detector, NER and context models, and enrolling customers. This takes a few seconds after a cold start.'}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
