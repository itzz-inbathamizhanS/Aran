import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { mount, col, label, haloTexture } from './common.js'

/* 3D firewall: bank systems on the left, the Aran shield in the middle, the systems that
   store data on the right. Each packet is a real /api/tour/packet (or /api/process)
   response: it flies in red, and at the shield splits into one amber token per value
   the firewall protected (grey if nothing was sensitive). */

const SOURCES = [['console', 'You'], ['loan-origination', 'Loan app'], ['onboarding', 'Onboarding'], ['call-centre', 'Call centre'],
  ['upi-switch', 'UPI switch'], ['mobile-app', 'Mobile app'], ['employee-desktop', 'Staff desktop']]
const SINKS = [['log-platform', 'Log platform'], ['crm-notes', 'CRM notes'], ['loan-vendor', 'Loan vendor'],
  ['llm-gateway', 'AI chatbot'], ['marketing-cloud', 'Marketing'], ['kyc-archive', 'KYC archive']]
const T_IN = 1.3, T_SCAN = 0.45, T_OUT = 1.3

const Firewall3D = forwardRef(function Firewall3D({ height = 460 }, ref) {
  const el = useRef(null)
  const api = useRef({})
  useImperativeHandle(ref, () => ({ launch: ev => api.current.launch && api.current.launch(ev) }), [])

  useEffect(() => {
    const flights = []
    let THREE, scene, shield, shell, ring, pulse, srcPos = [], sinkPos = [], srcMesh = [], sinkMesh = [], laneIn = [], laneOut = [], C
    const k = Math.max(1, 2 / (el.current.clientWidth / el.current.clientHeight)) // narrow screens: step back so every system fits
    const dispose = mount(el.current, {
      camPos: [0, 3.5 * k, 17 * k],
      build: ctx => {
        ({ THREE, scene } = ctx)
        C = { accent: col('--accent'), leak: col('--leak'), token: col('--token'), node: col('--surface-2'), border: col('--border'), brand: col('--brand-fill'), text2: col('--text-2') }
        // shield: faceted core, wire shell, orbit ring
        shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 1),
          new THREE.MeshStandardMaterial({ color: C.brand, emissive: C.accent, emissiveIntensity: 0.35, flatShading: true, metalness: 0.3, roughness: 0.4 }))
        shell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.15, 1), new THREE.MeshBasicMaterial({ color: C.accent, wireframe: true, transparent: true, opacity: 0.35 }))
        ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.6 }))
        ring.rotation.x = Math.PI / 2.4
        pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0 }))
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: C.accent, transparent: true, opacity: 0.5, depthWrite: false }))
        glow.scale.set(7, 7, 1)
        const light = new THREE.PointLight(C.accent, 30, 12)
        scene.add(shield, shell, ring, pulse, glow, light)
        const sl = label('ARAN', 'brand'); sl.position.set(0, -2.9, 0); scene.add(sl)
        // nodes on two gentle arcs
        const node = (x, y, z, name, list, mesh) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.62, 0.62), new THREE.MeshStandardMaterial({ color: C.node, emissive: C.border, emissiveIntensity: 0.15, roughness: 0.6 }))
          m.position.set(x, y, z); scene.add(m)
          const l = label(name); l.position.set(x, y, z + 0.4); scene.add(l)
          list.push(m.position.clone()); mesh.push(m)
        }
        SOURCES.forEach(([, n], i) => { const y = 3.6 - i * 1.2; node(-9, y, -Math.abs(y) * 0.6, n, srcPos, srcMesh) })
        SINKS.forEach(([, n], i) => { const y = 3 - i * 1.2; node(9, y, -Math.abs(y) * 0.6, n, sinkPos, sinkMesh) })
        // lanes
        const lane = (a, b, list) => {
          const mid = a.clone().lerp(b, 0.5); mid.z += 1.2
          const curve = new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()])
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
            new THREE.LineDashedMaterial({ color: C.border, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.9 }))
          line.computeLineDistances(); scene.add(line)
          list.push({ curve, line })
        }
        const inL = new THREE.Vector3(-1.9, 0, 0), outR = new THREE.Vector3(1.9, 0, 0)
        srcPos.forEach(p => lane(p.clone().add(new THREE.Vector3(1.1, 0, 0)), inL, laneIn))
        sinkPos.forEach(p => lane(outR, p.clone().add(new THREE.Vector3(-1.1, 0, 0)), laneOut))
      },
      tick: (t, dt) => {
        shield.rotation.y += dt * 0.35; shield.rotation.x = Math.sin(t * 0.4) * 0.15
        shell.rotation.y -= dt * 0.15; ring.rotation.z += dt * 0.5
        laneIn.forEach(l => { l.line.material.color.copy(C.border) }); laneOut.forEach(l => { l.line.material.color.copy(C.border) })
        srcMesh.forEach(m => m.material.emissive.copy(C.border)); sinkMesh.forEach(m => m.material.emissive.copy(C.border))
        let scanning = 0
        for (let i = flights.length - 1; i >= 0; i--) {
          const f = flights[i], e = t - f.t0
          if (f.t0 < 0) f.t0 = t
          if (e < T_IN) {
            const k = e / T_IN, p = laneIn[f.si].curve.getPointAt(k * k * (3 - 2 * k))
            f.raw.position.copy(p); laneIn[f.si].line.material.color.copy(C.leak); srcMesh[f.si].material.emissive.copy(C.leak)
          } else if (e < T_IN + T_SCAN) {
            scanning = Math.max(scanning, 1 - (e - T_IN) / T_SCAN)
            f.raw.visible = false
          } else if (e < T_IN + T_SCAN + T_OUT) {
            const k = (e - T_IN - T_SCAN) / T_OUT, s = k * k * (3 - 2 * k)
            f.toks.forEach((o, j) => {
              o.visible = true
              const p = laneOut[f.sj].curve.getPointAt(Math.max(0, Math.min(1, s - j * 0.06)))
              o.position.copy(p).add(new THREE.Vector3(0, Math.sin((s + j) * 9) * 0.12 * (1 - s), 0))
            })
            laneOut[f.sj].line.material.color.copy(f.n ? C.token : C.text2); sinkMesh[f.sj].material.emissive.copy(f.n ? C.token : C.text2)
          } else {
            [f.raw, ...f.toks].forEach(o => { scene.remove(o); o.traverse(x => { x.geometry && x.geometry.dispose(); x.material && x.material.dispose() }) })
            flights.splice(i, 1)
          }
        }
        pulse.material.opacity = scanning * 0.35; pulse.scale.setScalar(1.6 + (1 - scanning) * 1.6)
        shield.material.emissiveIntensity = 0.35 + scanning * 0.9
      },
    })
    const orb = (color, r) => {
      const g = new THREE.Group()
      g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color })))
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity: 0.85, depthWrite: false }))
      s.scale.set(r * 6, r * 6, 1); g.add(s)
      return g
    }
    api.current.launch = ev => {
      const si = Math.max(0, SOURCES.findIndex(s => s[0] === ev.source))
      const sj = Math.max(0, SINKS.findIndex(s => s[0] === ev.sink))
      const n = ev.findings.filter(f => f.protected).length
      const raw = orb(ev.findings.length ? C.leak : C.text2, 0.24); scene.add(raw)
      const toks = Array.from({ length: Math.max(1, Math.min(n, 6)) }, () => { const o = orb(n ? C.token : C.text2, 0.15); o.visible = false; scene.add(o); return o })
      flights.push({ si, sj, n, raw, toks, t0: -1 })
    }
    return () => { api.current.launch = null; dispose() }
  }, [])

  return <div ref={el} className="three-box" style={{ height: typeof window !== 'undefined' && window.innerWidth < 520 ? 340 : height }} role="img" aria-label="3D view: requests fly from bank systems into the Aran shield and leave as tokens; drag to rotate" />
})

export default Firewall3D
