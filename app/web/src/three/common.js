import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

/* Shared setup for the tour's 3D scenes (docs/learning/15-3d-graphics-with-threejs.md). */

export const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888'
export const col = name => new THREE.Color(css(name))
export const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export function label(text, cls = '') {
  const d = document.createElement('div')
  d.className = 'l3d ' + cls
  d.textContent = text
  return new CSS2DObject(d)
}

let halo
export function haloTexture() {
  if (halo) return halo
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  halo = new THREE.CanvasTexture(c)
  return halo
}

// Builds scene, camera, WebGL + label renderers and orbit controls inside `el`,
// runs `tick(t, dt)` every frame, and returns a dispose function.
export function mount(el, { camPos = [0, 4, 16], target = [0, 0, 0], fov = 45, autoRotate = true, tick, build }) {
  const w = el.clientWidth, h = el.clientHeight
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 200)
  camera.position.set(...camPos)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setSize(w, h)
  renderer.localClippingEnabled = true
  el.appendChild(renderer.domElement)
  const labels = new CSS2DRenderer()
  labels.setSize(w, h)
  labels.domElement.className = 'l3d-layer'
  el.appendChild(labels.domElement)
  const controls = new OrbitControls(camera, labels.domElement)
  controls.target.set(...target)
  controls.enableDamping = true
  controls.autoRotate = autoRotate && !reducedMotion()
  controls.autoRotateSpeed = 0.5
  controls.maxDistance = 40; controls.minDistance = 4
  controls.addEventListener('start', () => { controls.autoRotate = false })
  scene.add(new THREE.AmbientLight(0xffffff, 0.75))
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(5, 10, 8); scene.add(key)
  const ctx = { scene, camera, renderer, controls, THREE }
  build && build(ctx)
  const clock = new THREE.Clock()
  let raf, last = 0
  const frame = () => {
    raf = requestAnimationFrame(frame)
    if (document.hidden) return
    const t = clock.getElapsedTime(), dt = t - last; last = t
    tick && tick(t, dt, ctx)
    controls.update()
    renderer.render(scene, camera)
    labels.render(scene, camera)
  }
  frame()
  const ro = new ResizeObserver(() => {
    const W = el.clientWidth, H = el.clientHeight
    if (!W || !H) return
    camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); labels.setSize(W, H)
  })
  ro.observe(el)
  return () => {
    cancelAnimationFrame(raf); ro.disconnect(); controls.dispose()
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose())
      if (o.isCSS2DObject && o.element.parentNode) o.element.parentNode.removeChild(o.element)
    })
    renderer.dispose()
    el.innerHTML = ''
  }
}
