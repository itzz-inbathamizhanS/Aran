/* Iravora Void: one realistic WebGL scene that changes as you scroll.
   Three.js (+ bloom) for the scene, GSAP ticker + Lenis for smooth scroll.
   Scroll position becomes a continuous chapter value u from 0 to 6:
     0 hero leaf  ->  1 leaf vortex  ->  2 leaves funnel into the cup
     3 the pour   ->  4 steam close-up  ->  5 breach the surface into the void
   Between chapters an ink-dissolve post effect hides the swap. */
(async function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const rng = (u, a, b) => clamp((u - a) / (b - a));
  const ease = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(innerWidth, innerHeight) < 620;
  const N = 6, NAMES = ['Iravora', 'The leaf', 'The fire', 'The pour', 'The steam', 'The void'];
  const loader = $('#loader');
  const ready = () => setTimeout(() => loader.classList.add('done'), 350);

  /* ---------- load three + addons ---------- */
  let THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, RoomEnvironment;
  try {
    THREE = await import('three');
    ({ EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js'));
    ({ RenderPass } = await import('three/addons/postprocessing/RenderPass.js'));
    ({ UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js'));
    ({ ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js'));
    ({ OutputPass } = await import('three/addons/postprocessing/OutputPass.js'));
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
  } catch (e) { console.warn('three.js failed to load', e); document.body.classList.add('no-gl'); setupDom(false); ready(); return; }

  const canvas = $('#gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { document.body.classList.add('no-gl'); setupDom(false); ready(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x050403, 1);

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050403); scene.fog = new THREE.FogExp2(0x050403, 0.055);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ---------- procedural textures ---------- */
  function leafTextures() {
    const W = 256, H = 512, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const c = mk(), a = mk(), g = c.getContext('2d'), ga = a.getContext('2d');
    const half = (t) => 108 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.9) * (1 + 0.045 * Math.sin(t * 95));
    const outline = (ctx) => { ctx.beginPath(); for (let i = 0; i <= 80; i++) { const t = i / 80, y = 14 + 484 * t, x = 128 + half(t); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let i = 80; i >= 0; i--) { const t = i / 80; ctx.lineTo(128 - half(t), 14 + 484 * t); } ctx.closePath(); };
    ga.fillStyle = '#000'; ga.fillRect(0, 0, W, H); ga.fillStyle = '#fff'; outline(ga); ga.fill();
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#5a4b22'); grad.addColorStop(.5, '#4a3d1a'); grad.addColorStop(1, '#2c2410');
    g.fillStyle = grad; outline(g); g.fill();
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.18)' : 'rgba(210,180,100,.12)'; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2.2, 1 + Math.random() * 3); }
    g.strokeStyle = 'rgba(214,190,120,.5)'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(128, 16); g.quadraticCurveTo(133, 250, 128, 498); g.stroke();
    g.lineWidth = 1.3; g.strokeStyle = 'rgba(214,190,120,.3)';
    for (let k = 1; k <= 16; k++) for (const s of [-1, 1]) { const t = 0.05 + 0.055 * k, y = 14 + 484 * t, ex = 128 + s * half(Math.min(.98, t + .06)) * .9, ey = y - 46; g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * 40, y - 6, ex, ey); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 12; outline(g); g.stroke();
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    return { map, alpha: new THREE.CanvasTexture(a) };
  }
  function softTexture(kind) {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    if (kind === 'dot') { const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S); }
    else { try { g.filter = 'blur(5px)'; } catch (e) {} for (let i = 0; i < 16; i++) { const x = S / 2 + (Math.random() - .5) * S * .5, y = S / 2 + (Math.random() - .5) * S * .5, rr = 14 + Math.random() * 28, r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function rippleNormal() {
    const S = 256, h = new Float32Array(S * S), waves = [];
    for (let i = 0; i < 22; i++) waves.push([Math.round((Math.random() - .5) * 18), Math.round((Math.random() - .5) * 18), Math.random() * 6.28, 1 / (1 + i * .35)]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let v = 0; for (const [fx, fy, ph, a] of waves) v += Math.sin(((x * fx + y * fy) / S) * 6.2832 + ph) * a; h[y * S + x] = v; }
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)], dy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x]; const nx = -dx * .35, ny = -dy * .35, l = Math.hypot(nx, ny, 1), i = (y * S + x) * 4; img.data[i] = (nx / l * .5 + .5) * 255; img.data[i + 1] = (ny / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 1.5); return t;
  }

  /* ---------- lights ---------- */
  const key = new THREE.SpotLight(0xffd9a6, 90, 22, 0.5, 0.85, 1.5); key.position.set(2.4, 4.6, 2.6); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x86a2ff, 0.9); rim.position.set(-3, 2.6, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x3a2c1c, 0x050403, 0.4));
  const glow = new THREE.PointLight(0xe0903a, 0, 4, 1.6); glow.position.set(0, .55, 0); scene.add(glow);

  /* ---------- hero leaf + vortex leaves ---------- */
  const { map: leafMap, alpha: leafAlpha } = leafTextures();
  const leafGeo = new THREE.PlaneGeometry(0.32, 0.64, 6, 12);
  { const p = leafGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, x * x * 2.1 + y * y * 0.4 + x * y * 0.25); } leafGeo.computeVertexNormals(); }
  const leafMat = new THREE.MeshStandardMaterial({ map: leafMap, alphaMap: leafAlpha, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.78, metalness: 0, envMapIntensity: 0.3, color: 0xb0a07c });
  const heroMat = leafMat.clone(); heroMat.transparent = true; heroMat.emissive = new THREE.Color(0x2c1a06); heroMat.envMapIntensity = 0.8;
  const hero = new THREE.Mesh(leafGeo, heroMat); hero.scale.setScalar(3.2); scene.add(hero);
  const LEAVES = small ? 120 : 210, leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAVES); leaves.frustumCulled = false; scene.add(leaves);
  const lp = Array.from({ length: LEAVES }, () => ({ th: Math.random() * 6.283, r: 0.7 + Math.pow(Math.random(), 0.8) * 2.7, h: 0.2 + Math.random() * 2.8, sp: 0.6 + Math.random() * 1.2, sx: Math.random() * 6.28, sz: Math.random() * 6.28, fx: 0.4 + Math.random() * 1.1, fz: 0.4 + Math.random() * 1.1, sc: 0.32 + Math.random() * 0.4, d: Math.random() }));
  const dummy = new THREE.Object3D();

  /* ---------- cup, saucer, liquid, pour, steam ---------- */
  const cup = new THREE.Group(); scene.add(cup);
  const glaze = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.25 });
  const V = (r, y) => new THREE.Vector2(r, y);
  const cupGeo = new THREE.LatheGeometry([V(.001, 0), V(.22, 0), V(.24, .03), V(.3, .06), V(.42, .2), V(.5, .42), V(.52, .5), V(.49, .5), V(.47, .42), V(.39, .2), V(.28, .08), V(.001, .06)], 128);
  const cupMesh = new THREE.Mesh(cupGeo, glaze); cup.add(cupMesh);
  const saucer = new THREE.Mesh(new THREE.LatheGeometry([V(.001, -.065), V(.55, -.065), V(.86, -.02), V(.92, .005), V(.9, .015), V(.82, -.005), V(.5, -.035), V(.001, -.035)], 128), glaze); cup.add(saucer);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.17, .034, 18, 44, Math.PI), glaze); handle.rotation.z = -Math.PI / 2; handle.position.set(.47, .27, 0); cup.add(handle);
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.24, envMapIntensity: 1.6 });
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(.505, .008, 12, 160), gold); rimRing.rotation.x = Math.PI / 2; rimRing.position.y = .5; cup.add(rimRing);
  const goldFoot = new THREE.Mesh(new THREE.TorusGeometry(.91, .006, 10, 160), gold); goldFoot.rotation.x = Math.PI / 2; goldFoot.position.y = .008; cup.add(goldFoot);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: softTexture('dot'), color: 0x3a2410, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.position.y = -0.066; cup.add(pool);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: softTexture('dot'), color: 0x000000, transparent: true, opacity: .75, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.062; cup.add(shadow);

  const nrm = rippleNormal();
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshPhysicalMaterial({ color: 0x4b1c06, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.7, normalMap: nrm, normalScale: new THREE.Vector2(0.25, 0.25), emissive: 0x2e0e00, emissiveIntensity: 0.55 }));
  liquid.rotation.x = -Math.PI / 2; cup.add(liquid);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 1, 18, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xa4511a, roughness: 0.02, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.88, emissive: 0x4a1d05, emissiveIntensity: 0.9, envMapIntensity: 1.6 })); cup.add(stream);
  const rings = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 72), new THREE.MeshBasicMaterial({ color: 0xe6b36e, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; cup.add(m); return m; });
  const SPL = 140, splPos = new Float32Array(SPL * 3), splG = new THREE.BufferGeometry(); splG.setAttribute('position', new THREE.BufferAttribute(splPos, 3));
  const splSeed = Array.from({ length: SPL }, () => ({ a: Math.random() * 6.283, v: 0.4 + Math.random() * 0.9, s: Math.random() }));
  const splash = new THREE.Points(splG, new THREE.PointsMaterial({ map: softTexture('dot'), color: 0xf0c890, size: 0.028, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); splash.frustumCulled = false; cup.add(splash);
  const smoke = softTexture('smoke'), STEAM = small ? 26 : 40;
  const steam = Array.from({ length: STEAM }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: smoke, color: 0xf0e2cc, transparent: true, opacity: 0, depthWrite: false, rotation: Math.random() * 6.28 })); cup.add(m); return { m, s: Math.random(), sp: 0.07 + Math.random() * 0.06, x: (Math.random() - .5) * .5, z: (Math.random() - .5) * .5, ph: Math.random() * 6.28 }; });

  /* ---------- dust + void field ---------- */
  const dotTex = softTexture('dot');
  const DUST = small ? 220 : 420, dustPos = new Float32Array(DUST * 3), dustSeed = [];
  for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (Math.random() - .5) * 9; dustPos[i * 3 + 1] = Math.random() * 5 - 0.5; dustPos[i * 3 + 2] = (Math.random() - .5) * 9; dustSeed.push(Math.random() * 6.28); }
  const dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ map: dotTex, color: 0xffd9a0, size: 0.045, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); dust.frustumCulled = false; scene.add(dust);
  const VF = small ? 700 : 1500, vfPos = new Float32Array(VF * 3);
  for (let i = 0; i < VF; i++) { const r = Math.pow(Math.random(), 0.55) * 3.4, a = Math.random() * 6.283; vfPos[i * 3] = Math.cos(a) * r; vfPos[i * 3 + 1] = -0.4 - Math.random() * 18; vfPos[i * 3 + 2] = Math.sin(a) * r; }
  const vfG = new THREE.BufferGeometry(); vfG.setAttribute('position', new THREE.BufferAttribute(vfPos, 3));
  const voidField = new THREE.Points(vfG, new THREE.PointsMaterial({ map: dotTex, color: 0xf0b060, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); voidField.frustumCulled = false; scene.add(voidField);

  /* ---------- camera path ---------- */
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const camCurve = new THREE.CatmullRomCurve3([P(0, .35, 6.2), P(2.6, 1.1, 4.4), P(0, 2.3, 3.0), P(.7, 1.25, 1.9), P(.15, .85, 1.15), P(0, .62, .45), P(0, -5, .3)], false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3([P(0, .25, 0), P(0, .7, 0), P(0, .35, 0), P(0, .45, 0), P(0, .5, 0), P(0, .3, 0), P(0, -12, 0)], false, 'centripetal');
  let breachU = 5.3; for (let k = 0; k <= 200; k++) { const uu = 5 + k / 200; if (camCurve.getPoint(uu / 6).y < 0.44) { breachU = uu; break; } }

  /* ---------- post: bloom -> output -> ink grade ---------- */
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: small ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.7, 0.82); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uWipe: { value: 0 }, uVig: { value: 0.5 }, uAb: { value: 0.006 }, uGrain: { value: 0.05 }, uWarm: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uWipe, uVig, uAb, uGrain, uWarm; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
      void main(){
        vec2 c = vUv - .5; float r2 = dot(c, c); vec2 off = c * r2 * uAb * 6.0;
        vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        col *= mix(vec3(.97, .99, 1.03), vec3(1.07, 1.0, .9), uWarm);
        float asp = uRes.x / uRes.y; float n = fbm(vec2(vUv.x * asp, vUv.y) * 2.6 + vec2(0., uTime * .03)); n = clamp((n - .18) / .64, 0., 1.);
        float cover = (1. - smoothstep(uWipe - .07, uWipe + .07, n)) * step(.001, uWipe);
        float edge = (1. - smoothstep(0., .09, abs(n - uWipe))) * step(.001, uWipe) * (1. - step(.985, uWipe));
        vec3 ink = vec3(.018, .008, .004);
        col = mix(col, ink, cover * .96); col += vec3(.95, .55, .2) * edge * .5;
        col *= 1. - uVig * smoothstep(.25, .9, length(c) * 1.25);
        col += (hash(vUv * uRes + fract(uTime) * 91.7) - .5) * uGrain;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  composer.addPass(grade);

  /* ---------- DOM: copy, rail, scroll ---------- */
  let lenis = null, copies = [], railBtns = [], spacerH = 1;
  function setupDom(withScene) {
    copies = [...document.querySelectorAll('.copy')];
    const rail = $('#rail'); rail.innerHTML = NAMES.map((n, i) => `<button data-i="${i}" aria-label="${n}"><i></i><span>${n}</span></button>`).join(''); railBtns = [...rail.children];
    const toY = (u) => (u / N) * (document.documentElement.scrollHeight - innerHeight);
    rail.onclick = (e) => { const b = e.target.closest('button'); if (b) go(toY(+b.dataset.i + (+b.dataset.i === 5 ? 0.15 : 0.02))); };
    document.querySelectorAll('[data-top]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); go(0); }));
    function go(y) { lenis ? lenis.scrollTo(y, { duration: 2.2 }) : window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' }); }
    $('#cta').onclick = (e) => { e.preventDefault(); try { sound.chime(); } catch (err) { /* sound not ready */ } };
    if (!withScene) { copies.forEach((c, i) => { c.style.position = 'static'; c.style.opacity = 1; c.style.visibility = 'visible'; c.style.transform = 'none'; c.style.margin = '90px auto'; }); $('#copy').style.position = 'static'; $('#copy').style.pointerEvents = 'auto'; $('#rail').remove(); $('#spacer').remove(); }
  }
  setupDom(true);
  if (!reduced && window.Lenis) { lenis = new Lenis({ lerp: 0.085, smoothWheel: true }); window.lenis = lenis; gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }

  /* ---------- sound (procedural, off until toggled) ---------- */
  const sound = (() => {
    let ctx, on = false, pourG, ambG, noise; const nodes = {};
    const init = () => { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; ctx = new AC(); const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
      ambG = ctx.createGain(); ambG.gain.value = 0.0001; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280; [55, 82.4, 110.3].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = i ? 0.5 : 1; o.connect(g); g.connect(lp); o.start(); }); lp.connect(ambG); ambG.connect(master);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8; pourG = ctx.createGain(); pourG.gain.value = 0.0001; noise.connect(bp); bp.connect(pourG); pourG.connect(master); noise.start(); nodes.master = master; return true; };
    return {
      get on() { return on; },
      toggle() { if (!ctx && !init()) return false; on = !on; ctx.resume(); ambG.gain.setTargetAtTime(on ? 0.07 : 0.0001, ctx.currentTime, 0.4); if (!on) pourG.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1); else this.chime(); return on; },
      pour(v) { if (ctx && on) pourG.gain.setTargetAtTime(Math.max(0.0001, v * 0.14), ctx.currentTime, 0.12); },
      chime() { if (!ctx || !on) return; const t = ctx.currentTime; [659.3, 987.8].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 1.1); o.connect(g); g.connect(nodes.master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 1.2); }); },
    };
  })();
  $('#snd').onclick = () => { const on = sound.toggle(); $('#snd').setAttribute('aria-pressed', on); $('#snd-t').textContent = on ? 'Sound on' : 'Sound off'; };

  /* ---------- sizing ---------- */
  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    bloom.resolution.set(w / 2, h / 2); grade.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  addEventListener('resize', resize); resize();
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth - .5) * 2; mouse.y = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  /* ---------- the frame ---------- */
  let u = 0, uT = 0, time = 0, lastChap = 0, force = null;
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  const pulse = (c, w) => Math.pow(clamp(1 - Math.abs(u - c) / w), 1.4);
  const surfaceR = (L) => 0.262 + L * 0.5;
  function frame(dt) {
    time += dt; const maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    uT = clamp((window.scrollY || 0) / maxS) * N; if (force !== null) { uT = force; u = force; } else u += (uT - u) * (1 - Math.exp(-dt * (reduced ? 12 : 5.2)));
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 3)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 3));
    const uu = clamp(u, 0, N - 0.0001), voidAmt = rng(u, 4.9, 5.5), below = u > breachU + 0.04;

    /* camera */
    camCurve.getPoint(uu / N, camPos); tgtCurve.getPoint(uu / N, camTgt);
    if (camera.aspect < 1) { const k = Math.pow(1 / camera.aspect, 0.55); const keep = 1 - voidAmt; camPos.x = lerp(camPos.x, camTgt.x + (camPos.x - camTgt.x) * k, keep); camPos.y = lerp(camPos.y, camTgt.y + (camPos.y - camTgt.y) * k, keep); camPos.z = lerp(camPos.z, camTgt.z + (camPos.z - camTgt.z) * k, keep); }
    camPos.x += mouse.sx * 0.22 * (1 - voidAmt) + Math.sin(time * .3) * .03; camPos.y += -mouse.sy * 0.1 * (1 - voidAmt) + Math.sin(time * .41) * .02;
    camera.position.copy(camPos); camera.lookAt(camTgt); camera.fov = lerp(36, 30, rng(u, 3.4, 4.8)) + voidAmt * 18; camera.updateProjectionMatrix();

    /* hero leaf */
    const heroA = 1 - rng(u, 0.3, 0.95); hero.visible = heroA > 0.01; heroMat.opacity = heroA;
    hero.position.set(lerp(0, -1.4, rng(u, .3, 1)), 0.3 + Math.sin(time * .8) * .06, lerp(0, 1.4, rng(u, .3, 1)));
    hero.rotation.set(0.35 + mouse.sy * 0.25 + time * .05, time * 0.35 + mouse.sx * 0.5 + u * 1.2, 0.2 + Math.sin(time * .5) * .08);
    hero.scale.setScalar((small ? 3.6 : 5.2) * (1 + rng(u, 0, 1) * 0.5));

    /* cup rises out of the dark */
    const rise = ease(rng(u, 1.05, 2.0)); cup.position.y = lerp(-3.2, 0, rise); cup.rotation.y = lerp(1.4, 0, rise) + (below ? 0 : 0); cup.visible = !below && u > 1.0;
    const cy = cup.position.y;

    /* vortex leaves */
    const show = ease(rng(u, 0.55, 1.15)) * (1 - ease(rng(u, 2.55, 3.0))), fun = rng(u, 1.9, 2.9);
    leaves.visible = show > 0.01;
    if (leaves.visible) for (let i = 0; i < LEAVES; i++) {
      const l = lp[i], t = clamp((fun - l.d * 0.45) / 0.55), te = ease(t);
      const r = lerp(l.r, 0.06 + l.d * 0.1, te * te), h = lerp(l.h, cy + 0.62 + l.d * 0.2, te), th = l.th + (u * 2.4 + time * 0.28) * (1.5 / (0.7 + r)) * (1 + te);
      dummy.position.set(Math.cos(th) * r, h + Math.sin(time * l.sp + l.sx) * 0.07, Math.sin(th) * r);
      dummy.rotation.set(l.sx + time * l.fx * 0.7, th + 1.57 + Math.sin(time * l.sp) * .4, l.sz + time * l.fz * 0.5);
      dummy.scale.setScalar(l.sc * show * (1 - te * te * te) * 0.95); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;

    /* liquid + pour */
    const L = 0.07 + 0.35 * ease(rng(u, 3.0, 3.95)); liquid.visible = u > 3.04 && !below; liquid.position.y = L; liquid.scale.setScalar(surfaceR(L));
    nrm.offset.set(time * 0.012, time * 0.009); const pourAmt = ease(rng(u, 3.0, 3.1)) * (1 - ease(rng(u, 3.9, 4.1)));
    liquid.material.normalScale.setScalar(0.18 + pourAmt * 0.5 + Math.sin(time * 1.3) * 0.02);
    const start = ease(rng(u, 2.97, 3.12)), stop = ease(rng(u, 3.88, 4.08)), top = lerp(3.6, L, stop), bottom = lerp(3.6, L, start), len = Math.max(0, top - bottom);
    stream.visible = start > 0 && len > 0.015 && !below; stream.position.y = (top + bottom) / 2; stream.scale.set((1 + Math.sin(time * 38) * 0.06) * (1 - stop * 0.5), len, (1 + Math.cos(time * 33) * 0.06) * (1 - stop * 0.5));
    rings.forEach((m, i) => { const tau = (time * 0.55 + i / 3) % 1; m.visible = pourAmt > 0.02 && !below; m.position.y = L + 0.003; m.scale.setScalar(surfaceR(L) * (0.05 + tau * 0.9)); m.material.opacity = Math.pow(1 - tau, 2) * 0.4 * pourAmt; });
    splash.visible = pourAmt > 0.02 && !below; splash.material.opacity = pourAmt * 0.9;
    if (splash.visible) for (let i = 0; i < SPL; i++) { const s = splSeed[i], tau = (time * 1.7 + s.s) % 1, sp = s.v * 0.4; splPos[i * 3] = Math.cos(s.a) * sp * tau * 0.55; splPos[i * 3 + 1] = L + (s.v * tau - 2.6 * tau * tau * 0.5) * 0.55; splPos[i * 3 + 2] = Math.sin(s.a) * sp * tau * 0.55; }
    splG.attributes.position.needsUpdate = true;
    sound.pour(pourAmt * (below ? 0 : 1));

    /* steam */
    const steamAmt = ease(rng(u, 3.55, 4.2)) * (1 - ease(rng(u, 5.05, 5.45)));
    steam.forEach((s, i) => { const tau = (time * s.sp + s.s) % 1, k = Math.sin(Math.PI * tau); s.m.visible = steamAmt > 0.01 && !below; s.m.position.set(s.x * (0.6 + tau) + Math.sin(tau * 5 + s.ph + time * 0.4) * 0.12 * tau, L + 0.04 + tau * 1.6, s.z * (0.6 + tau) + Math.cos(tau * 4 + s.ph) * 0.1 * tau); s.m.scale.setScalar(0.22 + tau * 0.95); s.m.material.opacity = Math.pow(k, 1.4) * 0.3 * steamAmt; });

    /* void field + dust */
    voidField.material.opacity = voidAmt * 0.9; voidField.visible = voidAmt > 0.01;
    dust.material.opacity = (0.55 - voidAmt * 0.35) * (1 - rng(u, 5.5, 6)); dust.position.y = Math.sin(time * 0.1) * 0.15;
    const dp = dustG.attributes.position.array; for (let i = 0; i < DUST; i++) { dp[i * 3 + 1] += Math.sin(time * 0.3 + dustSeed[i]) * 0.0007 + 0.0008; if (dp[i * 3 + 1] > 4.6) dp[i * 3 + 1] = -0.5; } dustG.attributes.position.needsUpdate = true;

    /* light, fog, grade */
    key.intensity = lerp(80, 130, rng(u, 2.8, 3.6)) * (1 - voidAmt * 0.8); glow.intensity = lerp(0, 3.2, rng(u, 3.4, 4.6)) * (below ? 0.2 : 1); glow.position.y = cy + L + 0.15;
    scene.fog.density = lerp(0.055, 0.09, voidAmt); scene.background.setHex(below ? 0x020100 : 0x050403); scene.fog.color.copy(scene.background);
    bloom.strength = lerp(0.45, 0.95, rng(u, 3.2, 4.4)) + voidAmt * 0.3;
    const wipe = Math.max(pulse(1, 0.2), pulse(2, 0.2), pulse(3, 0.2), pulse(4, 0.2), pulse(5, 0.18), pulse(breachU, 0.12)) * 0.9;
    grade.uniforms.uWipe.value = reduced ? 0 : wipe; grade.uniforms.uTime.value = time; grade.uniforms.uWarm.value = ease(rng(u, 1.8, 3.4)); grade.uniforms.uVig.value = 0.5 + voidAmt * 0.25; grade.uniforms.uAb.value = 0.005 + wipe * 0.012 + voidAmt * 0.004;
    composer.render();

    /* text + hud */
    copies.forEach((c, i) => { const t = u - i; let o = i === 0 ? 1 - ease(rng(t, 0.6, 0.9)) : ease(rng(t, 0.14, 0.34)) * (i === N - 1 ? 1 : 1 - ease(rng(t, 0.74, 0.92))); c.style.opacity = o.toFixed(3); c.classList.toggle('on', o > 0.02); c.style.transform = `translate(-50%, calc(-50% + ${((1 - o) * 26 * (t < 0.5 ? 1 : -1)).toFixed(1)}px))`; c.style.filter = o < 0.99 ? `blur(${((1 - o) * 7).toFixed(1)}px)` : 'none'; });
    const chap = Math.min(N - 1, Math.floor(u + 0.15)); if (chap !== lastChap) { lastChap = chap; sound.chime(); $('#num').textContent = String(chap + 1).padStart(2, '0'); railBtns.forEach((b, i) => b.classList.toggle('on', i === chap)); }
  }
  railBtns[0] && railBtns[0].classList.add('on');
  gsap.ticker.add((t, dt) => frame(Math.min(0.05, dt / 1000 || 0.016)));
  frame(0.016); ready();
  window.IV = { jump(v) { force = v; frame(0.016); return u; }, release() { force = null; }, get u() { return u; }, breachU };
})();
