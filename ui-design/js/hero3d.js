/* WebGL hero: an interactive line field you can touch and blast.
   Three.js (loaded lazily from a CDN) + custom GLSL, GSAP for the charge and
   shake, procedural sound hooks. Hover pushes the lines, press-and-hold pulls
   them in while a ring charges, release (or a full ring) fires a shockwave and
   a particle burst. Pauses off-screen, honours prefers-reduced-motion. */
window.ARAN = window.ARAN || {};
(function (A) {
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb);

  A.mountHero = async function (host) {
    const canvas = host.querySelector('canvas'), ring = host.querySelector('.charge'), ringFill = host.querySelector('.charge .fl');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let THREE;
    try { THREE = await import(THREE_URL); } catch (e) { console.warn('three.js failed to load', e); return () => {}; }
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return () => {}; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100); camera.position.z = 9;
    const size = new THREE.Vector2(1, 1);               // half extents of the visible plane, world units
    const mouse = new THREE.Vector2(9999, 9999), mouseT = new THREE.Vector2(9999, 9999);

    // ---- geometry: two families of long polylines (rows and columns) --------
    const ROWS = 46, COLS = 74, SR = 150, SC = 96;
    const pos = [];
    for (let r = 0; r < ROWS; r++) { const y = (r / (ROWS - 1)) * 2 - 1; for (let s = 0; s < SR; s++) { pos.push((s / SR) * 2 - 1, y, 0, ((s + 1) / SR) * 2 - 1, y, 0); } }
    for (let c = 0; c < COLS; c++) { const x = (c / (COLS - 1)) * 2 - 1; for (let s = 0; s < SC; s++) { pos.push(x, (s / SC) * 2 - 1, 0, x, ((s + 1) / SC) * 2 - 1, 0); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

    const inkC = new THREE.Color(cssVar('--hero-ink-color', '#0b0c10')), hotC = new THREE.Color(cssVar('--leak-color', '#ee5a3f'));
    const U = {
      uTime: { value: 0 }, uSize: { value: size }, uMouse: { value: mouse }, uCharge: { value: 0 }, uIntro: { value: 0 },
      uBlastO: { value: new THREE.Vector2() }, uBlastT: { value: -1 }, uBlastP: { value: 0 }, uInk: { value: inkC }, uHot: { value: hotC }, uCalm: { value: reduced ? 0.2 : 1 },
    };
    const lineMat = new THREE.ShaderMaterial({
      transparent: true, uniforms: U,
      vertexShader: `
        uniform float uTime, uCharge, uIntro, uBlastT, uBlastP, uCalm; uniform vec2 uSize, uMouse, uBlastO;
        varying float vHot, vA;
        void main(){
          vec2 p0 = position.xy * uSize; vec2 p = p0;
          float rad = uSize.y * 0.34;
          float d = distance(p0, uMouse); float inf = exp(-(d*d)/(rad*rad));
          vec2 dir = (p0 - uMouse) / max(d, 0.001);
          float k = mix(0.50, -0.95, uCharge);
          p += dir * inf * k * rad * 0.55;
          float z = inf * (0.30 + uCharge * 1.1) * rad * 0.55;
          z += (sin(p0.x * 1.7 + uTime * 0.55) * cos(p0.y * 1.3 + uTime * 0.42)) * 0.11 * uSize.y * uCalm;
          float bd = distance(p0, uBlastO); vec2 bdir = (p0 - uBlastO) / max(bd, 0.001);
          float r = uBlastT * uSize.y * 2.4; float w = uSize.y * 0.17;
          float ring = uBlastT < 0.0 ? 0.0 : exp(-pow((bd - r) / w, 2.0)) * exp(-uBlastT * 1.35) * uBlastP;
          p += bdir * ring * uSize.y * 0.36; z += ring * uSize.y * 0.5;
          float edge = smoothstep(1.0, 0.82, abs(position.x)) * smoothstep(1.0, 0.82, abs(position.y));
          float intro = smoothstep(0.0, 1.0, uIntro * 1.6 - (position.x * 0.5 + 0.5) * 0.6);
          vHot = clamp(inf * 1.1 + ring * 1.3, 0.0, 1.0);
          vA = (0.42 + vHot * 0.55) * edge * intro;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, z, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uInk, uHot; varying float vHot, vA;
        void main(){ gl_FragColor = vec4(mix(uInk, uHot, vHot), vA); }`,
    });
    const lines = new THREE.LineSegments(geo, lineMat); scene.add(lines);

    // ---- particles for the blast ------------------------------------------
    const N = reduced ? 0 : 900, seeds = new Float32Array(N * 4), pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { seeds[i * 4] = Math.random() * Math.PI * 2; seeds[i * 4 + 1] = 0.25 + Math.pow(Math.random(), 1.6) * 1.0; seeds[i * 4 + 2] = 0.8 + Math.random() * 2.4; seeds[i * 4 + 3] = 0.5 + Math.random() * 0.9; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const pm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: Object.assign({ uPx: { value: Math.min(devicePixelRatio || 1, 2) } }, U),
      vertexShader: `
        attribute vec4 aSeed; uniform float uBlastT, uBlastP, uPx; uniform vec2 uSize, uBlastO; varying float vL;
        void main(){
          float t = uBlastT; float life = aSeed.w;
          if (t < 0.0 || t > life * 1.6) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vL = 0.0; return; }
          vec2 dir = vec2(cos(aSeed.x), sin(aSeed.x));
          float sp = aSeed.y * uSize.y * 2.2 * uBlastP;
          vec2 p = uBlastO + dir * sp * (1.0 - exp(-t * 2.6)) / 2.6 * 2.0 + vec2(0.0, -t * t * uSize.y * 0.25);
          vL = clamp(1.0 - t / (life * 1.6), 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.3, 1.0);
          gl_PointSize = aSeed.z * 3.2 * uPx * vL + 0.5;
        }`,
      fragmentShader: `
        uniform vec3 uInk, uHot; varying float vL;
        void main(){ vec2 c = gl_PointCoord - 0.5; if (length(c) > 0.5) discard; gl_FragColor = vec4(mix(uInk, uHot, 0.75), vL); }`,
    });
    const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; scene.add(pts);

    // ---- sizing ------------------------------------------------------------
    function resize() {
      const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      const hh = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z; size.set(hh * camera.aspect * 1.08, hh * 1.08);
    }
    resize(); const ro = new ResizeObserver(resize); ro.observe(host);
    const toWorld = (e) => { const r = host.getBoundingClientRect(); return [((e.clientX - r.left) / r.width * 2 - 1) * size.x, -((e.clientY - r.top) / r.height * 2 - 1) * size.y]; };

    // ---- interaction ---------------------------------------------------------
    let holding = false, chargeTween = null, visible = true, raf = 0, clock = 0, blastClock = -1, shake = 0;
    const cs = { v: 0 };
    function moveRing(e) { const r = host.getBoundingClientRect(); ring.style.left = e.clientX - r.left + 'px'; ring.style.top = e.clientY - r.top + 'px'; }
    function onMove(e) { const [x, y] = toWorld(e); mouseT.set(x, y); if (holding) moveRing(e); if (Math.random() < 0.06) A.sound.tick(); }
    function onLeave() { if (!holding) mouseT.set(9999, 9999); }
    function startHold(e) {
      if (e.button > 0) return; holding = true; try { host.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers have nothing to capture */ } moveRing(e);
      gsap.to(ring, { opacity: 1, duration: 0.2 }); A.sound.chargeStart();
      chargeTween && chargeTween.kill(); cs.v = U.uCharge.value;
      chargeTween = gsap.to(cs, { v: 1, duration: reduced ? 0.8 : 1.5, ease: 'power1.in', onUpdate() { U.uCharge.value = cs.v; ringFill.style.strokeDashoffset = 276.5 * (1 - cs.v); A.sound.chargeSet(cs.v); host.dispatchEvent(new CustomEvent('charge', { detail: cs.v })); }, onComplete: () => release(true) });
    }
    function release(auto) {
      if (!holding) return; holding = false; chargeTween && chargeTween.kill(); A.sound.chargeStop();
      const p = cs.v; gsap.to(ring, { opacity: 0, duration: 0.25 }); gsap.to(cs, { v: 0, duration: 0.5, ease: 'power3.out', onUpdate() { U.uCharge.value = cs.v; ringFill.style.strokeDashoffset = 276.5 * (1 - cs.v); } });
      if (p > 0.12) blast(p, mouse.x < 9000 ? mouse : new THREE.Vector2(0, 0));
    }
    function blast(power, at) {
      U.uBlastO.value.copy(at); U.uBlastP.value = 0.45 + power * 0.85; blastClock = 0; A.sound.blast(power);
      if (!reduced) { shake = power; gsap.to({ s: power }, { s: 0, duration: 0.7, ease: 'power3.out', onUpdate() { shake = this.targets()[0].s; } }); }
      host.dispatchEvent(new CustomEvent('blast', { detail: power }));
    }
    host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerdown', startHold); host.addEventListener('pointerup', () => release(false)); host.addEventListener('pointercancel', () => release(false));
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) loop(); }, { threshold: 0 }); io.observe(host);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) loop(); });
    A.heroBlast = (p) => blast(p || 1, new THREE.Vector2(0, 0));
    A.heroSeek = (t) => { blastClock = t; };   // design review: jump the shockwave to t seconds

    gsap.to(U.uIntro, { value: 1, duration: reduced ? 0.1 : 2.2, ease: 'power2.out', delay: 0.2 });
    // idle: a gentle wandering touch so the field looks alive before anyone moves the mouse
    const idle = { t: 0 };

    function loop() {
      raf = 0; if (!visible || document.hidden) return;
      const dt = Math.min(clock ? (performance.now() - clock) / 1000 : 0.016, 0.05); clock = performance.now();
      U.uTime.value += dt;
      if (mouseT.x > 9000 && !reduced) { idle.t += dt * 0.35; mouse.lerp(new THREE.Vector2(Math.sin(idle.t * 1.3) * size.x * 0.45, Math.cos(idle.t * 0.9) * size.y * 0.3), 0.04); }
      else mouse.lerp(mouseT, mouseT.x > 9000 ? 1 : 0.14);
      if (blastClock >= 0) { blastClock += dt; U.uBlastT.value = blastClock; if (blastClock > 3) { blastClock = -1; U.uBlastT.value = -1; } }
      lines.position.set((Math.random() - 0.5) * shake * 0.22, (Math.random() - 0.5) * shake * 0.22, 0); pts.position.copy(lines.position);
      lines.rotation.y += (((mouse.x < 9000 ? mouse.x / size.x : 0) * 0.07) - lines.rotation.y) * 0.05; lines.rotation.x += (((mouse.y < 9000 ? -mouse.y / size.y : 0) * 0.05) - lines.rotation.x) * 0.05; pts.rotation.copy(lines.rotation);
      renderer.render(scene, camera); raf = requestAnimationFrame(loop);
    }
    loop();
    // theme switch recolours the ink
    const mo = new MutationObserver(() => { inkC.set(cssVar('--hero-ink-color', '#0b0c10')); hotC.set(cssVar('--leak-color', '#ee5a3f')); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return function destroy() {
      cancelAnimationFrame(raf); raf = 0; visible = false; ro.disconnect(); io.disconnect(); mo.disconnect(); A.sound.chargeStop(true);
      geo.dispose(); lineMat.dispose(); pg.dispose(); pm.dispose(); renderer.dispose(); delete A.heroBlast; delete A.heroSeek;
    };
  };
})(window.ARAN);
