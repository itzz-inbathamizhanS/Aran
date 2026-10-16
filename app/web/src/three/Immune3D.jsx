import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { mount, col, label } from './common.js'

/* The immune layer's real feature space in 3D. Pick three of the seven features; every
   other feature is dropped (an orthogonal projection). The green box is the normal zone
   (0.1 to 0.7 on each axis after scaling), green dots are the traffic windows it learned
   from, red spheres are the exact shadows of its detectors, and blue / red dots are the
   latest windows it scored (red = alert). */

const NAMES = { volume_z: 'volume', raw_frac_z: 'left raw', hour_distance: 'odd hour', pair_novel: 'new route', class_novel: 'new data type', detok_log: 'read-backs', cust_ratio: 'customers' }
const S = 7 // cube edge in scene units; feature value v maps to (v - 0.5) * S

export default function Immune3D({ height = 440 }) {
  const el = useRef(null)
  const scn = useRef(null)
  const [axes, setAxes] = useState([0, 1, 3])
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let live = true
    const f = () => api('/tour/immune-space?axes=' + axes.join(',')).then(d => live && setData(d)).catch(e => live && setErr(e.message))
    f(); const t = setInterval(f, 3000)
    return () => { live = false; clearInterval(t) }
  }, [axes.join(',')])

  useEffect(() => {
    let THREE, scene, groups = {}, C, labels = [], t0 = 0
    const k = el.current.clientWidth < 520 ? 1.5 : 1 // step back on phones so the axis labels fit
    const dispose = mount(el.current, {
      camPos: [9 * k, 6 * k, 11 * k], fov: 42,
      build: ctx => {
        ({ THREE, scene } = ctx)
        C = { real: col('--real'), leak: col('--leak'), info: col('--info'), border: col('--border'), text2: col('--text-2'), mem: col('--token') }
        const cube = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S, S, S)), new THREE.LineBasicMaterial({ color: C.border }))
        const zone = new THREE.Mesh(new THREE.BoxGeometry(S * 0.6, S * 0.6, S * 0.6), new THREE.MeshBasicMaterial({ color: C.real, transparent: true, opacity: 0.1, depthWrite: false }))
        const zoneEdge = new THREE.LineSegments(new THREE.EdgesGeometry(zone.geometry), new THREE.LineBasicMaterial({ color: C.real }))
        const off = (0.4 - 0.5) * S // centre of [0.1, 0.7] is 0.4
        zone.position.setScalar(off); zoneEdge.position.setScalar(off)
        scene.add(cube, zone, zoneEdge)
        const zl = label('normal zone', 'ok'); zl.position.set(off, off + S * 0.32, off); scene.add(zl)
        ;['self', 'det', 'mem', 'win'].forEach(k => { groups[k] = new THREE.Group(); scene.add(groups[k]) })
      },
      tick: t => {
        t0 = t
        groups.win && groups.win.children.forEach((m, i) => { if (m.userData.newest) m.scale.setScalar(1 + 0.35 * Math.sin(t * 5)) })
      },
    })
    const pos = p => new THREE.Vector3(...p.map(v => (v - 0.5) * S))
    // the feature space is the unit cube, so detector balls are cut at its faces
    const clip = () => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(n => new THREE.Plane(new THREE.Vector3(...n), S / 2))
    const clear = g => { while (g.children.length) { const o = g.children.pop(); o.geometry && o.geometry.dispose(); o.material && o.material.dispose() } }
    scn.current = {
      update: d => {
        if (!THREE) return
        labels.forEach(l => { scene.remove(l); l.element.remove() }); labels = []
        d.axes.forEach((a, k) => {
          const p = [-S / 2, -S / 2, -S / 2]; p[k] = S / 2 + 0.6
          const l = label((['x', 'y', 'z'][k]) + ': ' + (NAMES[d.names[a]] || d.names[a]), 'axis'); l.position.set(...p); scene.add(l); labels.push(l)
        })
        Object.values(groups).forEach(clear)
        if (!d.self_pts) return
        const dot = new THREE.SphereGeometry(0.07, 8, 6)
        d.self_pts.forEach(p => { const m = new THREE.Mesh(dot.clone(), new THREE.MeshBasicMaterial({ color: C.real })); m.position.copy(pos(p)); groups.self.add(m) })
        d.detectors.forEach(x => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.02, x.r * S), 14, 10), new THREE.MeshBasicMaterial({ color: C.leak, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: clip() }))
          m.position.copy(pos(x.c)); groups.det.add(m)
        })
        d.memory.forEach(x => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.02, x.r * S), 12, 8), new THREE.MeshBasicMaterial({ color: C.mem, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: clip() }))
          m.position.copy(pos(x.c)); groups.mem.add(m)
        })
        d.windows.forEach((w, i) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(w.alert ? 0.2 : 0.13, 14, 10), new THREE.MeshBasicMaterial({ color: w.alert ? C.leak : C.info }))
          m.position.copy(pos(w.p)); m.userData.newest = i === 0; groups.win.add(m)
        })
      },
    }
    return () => { scn.current = null; dispose() }
  }, [])

  useEffect(() => { if (data && scn.current) scn.current.update(data) }, [data])

  const names = data ? data.names : Object.keys(NAMES)
  return (
    <div className="im3d">
      <div className="row tight">{['x', 'y', 'z'].map((k, i) => (
        <label key={k} className="ax-pick">{k}
          <select value={axes[i]} onChange={e => { const v = Number(e.target.value); if (axes.includes(v)) return; const a = [...axes]; a[i] = v; setAxes(a) }}>
            {names.map((n, j) => <option key={n} value={j} disabled={axes.includes(j) && axes[i] !== j}>{NAMES[n] || n}</option>)}
          </select></label>))}
      </div>
      <div ref={el} className="three-box" style={{ height }} role="img" aria-label="3D view of the immune layer's feature space; drag to rotate" />
      <div className="legend"><span><i className="lg band" /> normal zone</span><span><i className="lg sdot" /> learned normal traffic</span>
        <span><i className="lg det" /> detectors{data && data.detectors_total ? ` (${data.detectors.length} of ${data.detectors_total} shown)` : ''}</span>
        <span><i className="lg win" /> latest windows</span><span><i className="lg alert" /> alert</span><span className="small muted">drag to turn · scroll to zoom</span></div>
      {err && <div className="err">{err}</div>}
    </div>
  )
}
