/* Procedural sound (Web Audio, no audio files). Off by default; the top-bar
   toggle turns it on, because browsers only allow audio after a user gesture.
   Hooks: hover tick, click, hold-to-charge whoosh, blast, success chime. */
window.ARAN = window.ARAN || {};
(function (A) {
  let ctx = null, master = null, on = false, noiseBuf = null, charge = null, lastTick = 0;
  try { on = false; } catch (e) {}

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
  function env(g, t, a, peak, r) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + r); }

  const S = {
    get on() { return on; },
    toggle() {
      on = !on;
      if (on) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); S.chime(); } else { S.chargeStop(true); }
      return on;
    },
    tick(freq) {
      if (!on || !ctx) return; const t = ctx.currentTime; if (t - lastTick < 0.045) return; lastTick = t;
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq || 1500 + Math.random() * 500;
      env(g, t, 0.003, 0.05, 0.05); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1);
    },
    click() {
      if (!on || !ctx) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.09);
      env(g, t, 0.004, 0.16, 0.1); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.16);
    },
    chime() {
      if (!on || !ctx) return; const t = ctx.currentTime;
      [880, 1318.5, 1760].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; env(g, t + i * 0.07, 0.01, 0.07, 0.5); o.connect(g); g.connect(master); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.6); });
    },
    whoosh(dur) {
      if (!on || !ctx) return; const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3200, t + (dur || 0.5)); env(g, t, (dur || 0.5) * 0.4, 0.28, (dur || 0.5) * 0.7); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + (dur || 0.5) + 0.5);
    },
    chargeStart() {
      if (!on || !ctx || charge) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.value = 70; o2.frequency.value = 140; f.type = 'lowpass'; f.frequency.value = 220; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.17, t + 0.25);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(t); o2.start(t); charge = { o, o2, f, g };
    },
    chargeSet(p) { if (!charge || !ctx) return; const t = ctx.currentTime; charge.o.frequency.setTargetAtTime(70 + p * 520, t, 0.06); charge.o2.frequency.setTargetAtTime(140 + p * 980, t, 0.06); charge.f.frequency.setTargetAtTime(220 + p * 3800, t, 0.06); },
    chargeStop(silent) { if (!charge || !ctx) return; const t = ctx.currentTime, c = charge; charge = null; c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(0.0001, t, silent ? 0.02 : 0.05); c.o.stop(t + 0.3); c.o2.stop(t + 0.3); },
    blast(power) {
      if (!on || !ctx) return; const t = ctx.currentTime, p = Math.max(0.25, power || 1);
      const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(7000, t); f.frequency.exponentialRampToValueAtTime(260, t + 1.1); env(g, t, 0.004, 0.55 * p, 1.1);
      n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 1.3);
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.7); env(og, t, 0.005, 0.7 * p, 0.8); o.connect(og); og.connect(master); o.start(t); o.stop(t + 1);
      for (let i = 0; i < 6; i++) { const c = ctx.createOscillator(), cg = ctx.createGain(); c.type = 'square'; c.frequency.value = 900 + Math.random() * 2800; env(cg, t + 0.05 + i * 0.07 + Math.random() * 0.05, 0.002, 0.04 * p, 0.05); c.connect(cg); cg.connect(master); const s = t + 0.05 + i * 0.07; c.start(s); c.stop(s + 0.1); }
    },
    shatter() { if (!on || !ctx) return; const t = ctx.currentTime; for (let i = 0; i < 9; i++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 2200 + Math.random() * 3800; env(g, t + i * 0.025, 0.002, 0.06, 0.14); o.connect(g); g.connect(master); o.start(t + i * 0.025); o.stop(t + i * 0.025 + 0.2); } },
    error() { if (!on || !ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.setValueAtTime(165, t + 0.1); env(g, t, 0.005, 0.1, 0.25); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35); },
  };
  A.sound = S;
})(window.ARAN);
