// Sound: the Göransson theme on an <audio> element, plus every effect synthesized with Web Audio.
const theme = document.getElementById('theme');
let ctx, master, themeGain, sirenBus, sirenFilter, shepard, wind;
let enabled = false;
let themeLevel = 0.75;

function noiseBuffer(seconds = 2) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const src = ctx.createMediaElementSource(theme);
  themeGain = ctx.createGain();
  themeGain.gain.value = 0;
  src.connect(themeGain).connect(master);
}

function env(g, t, a, peak, d) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

export const audio = {
  get on() { return enabled; },

  async enable() {
    init();
    await ctx.resume();
    enabled = true;
    theme.volume = 1;
    try { await theme.play(); } catch (e) { /* autoplay refused until another gesture */ }
    themeGain.gain.setTargetAtTime(themeLevel, ctx.currentTime, 1.2);
  },

  disable() {
    if (!ctx) return;
    enabled = false;
    themeGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    this.sirens(0);
    this.shepard(false);
    setTimeout(() => { if (!enabled) theme.pause(); }, 900);
  },

  toggle() { return enabled ? (this.disable(), false) : (this.enable(), true); },

  // 0..1 — chapters duck the score under their own sound design
  themeLevel(v) {
    themeLevel = v;
    if (enabled) themeGain.gain.setTargetAtTime(v, ctx.currentTime, 0.8);
  },

  creak(amount) { // wood and gut under tension, amount 0..1
    if (!enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(38 + amount * 70, t);
    f.type = 'bandpass'; f.frequency.value = 500 + amount * 900; f.Q.value = 8;
    o.connect(f).connect(g).connect(master);
    env(g, t, 0.01, 0.05 + amount * 0.06, 0.12);
    o.start(t); o.stop(t + 0.2);
  },

  twang() { // the bowstring: plucked resonance + low body thump
    if (!enabled) return;
    const t = ctx.currentTime;
    [98, 196, 293].forEach((fr, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(fr * 1.04, t);
      o.frequency.exponentialRampToValueAtTime(fr, t + 0.15);
      o.connect(g).connect(master);
      env(g, t, 0.003, 0.5 / (i + 1), 1.6 - i * 0.4);
      o.start(t); o.stop(t + 2);
    });
    const n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = noiseBuffer(0.3); nf.type = 'highpass'; nf.frequency.value = 2500;
    n.connect(nf).connect(ng).connect(master);
    env(ng, t, 0.002, 0.35, 0.08);
    n.start(t);
    this.whoosh(0.15);
  },

  whoosh(delay = 0) {
    if (!enabled) return;
    const t = ctx.currentTime + delay;
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuffer(1);
    f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.45);
    n.connect(f).connect(g).connect(master);
    env(g, t, 0.05, 0.4, 0.5);
    n.start(t); n.stop(t + 0.7);
  },

  thunder() {
    if (!enabled) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuffer(4);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(90, t + 3);
    n.connect(f).connect(g).connect(master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    n.start(t); n.stop(t + 4);
  },

  tick() {
    if (!enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 2200;
    o.connect(g).connect(master);
    env(g, t, 0.001, 0.05, 0.03);
    o.start(t); o.stop(t + 0.05);
  },

  thud() { // wax pressed, knot tied, ship sunk
    if (!enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    o.connect(g).connect(master);
    env(g, t, 0.005, 0.6, 0.3);
    o.start(t); o.stop(t + 0.4);
  },

  wind(level) { // continuous wind bed for Aeolus and the storms, 0 = off
    if (!enabled && level > 0) return;
    if (!ctx) return;
    if (!wind) {
      const n = ctx.createBufferSource(); n.buffer = noiseBuffer(3); n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.value = 600;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.18; lg.gain.value = 420; lfo.connect(lg).connect(f.frequency); lfo.start();
      const g = ctx.createGain(); g.gain.value = 0;
      n.connect(f).connect(g).connect(master); n.start();
      wind = g;
    }
    wind.gain.setTargetAtTime(level * 0.5, ctx.currentTime, 0.6);
  },

  // The Sirens: a wordless two-voice chant; filtered more with every ear sealed (0 = silent, 1 = full)
  sirens(level, muffle = 0) {
    if (!ctx) return;
    if (!sirenBus) {
      sirenBus = ctx.createGain(); sirenBus.gain.value = 0;
      sirenFilter = ctx.createBiquadFilter(); sirenFilter.type = 'lowpass'; sirenFilter.frequency.value = 6000;
      sirenBus.connect(sirenFilter).connect(master);
      [[440, 0], [554.37, 0.5], [659.25, 0.25]].forEach(([fr, ph]) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
        const vib = ctx.createOscillator(), vg = ctx.createGain();
        vib.frequency.value = 5.2 + ph; vg.gain.value = 6; vib.connect(vg).connect(o.frequency); vib.start();
        const glide = ctx.createOscillator(), gg = ctx.createGain();
        glide.frequency.value = 0.07 + ph * 0.05; gg.gain.value = fr * 0.12; glide.connect(gg).connect(o.frequency); glide.start();
        const formant = ctx.createBiquadFilter(); formant.type = 'bandpass'; formant.frequency.value = 900 + ph * 700; formant.Q.value = 6;
        const vg2 = ctx.createGain(); vg2.gain.value = 0.22;
        o.connect(formant).connect(vg2).connect(sirenBus); o.start();
      });
    }
    const on = enabled ? level : 0;
    sirenBus.gain.setTargetAtTime(on * 0.55, ctx.currentTime, 0.7);
    sirenFilter.frequency.setTargetAtTime(6000 * Math.pow(1 - muffle, 2.2) + 180, ctx.currentTime, 0.4);
  },

  // Shepard tone: an endless rise for the strait and the storm
  shepard(on) {
    if (!ctx) return;
    if (on && enabled && !shepard) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const voices = [];
      for (let i = 0; i < 6; i++) {
        const o = ctx.createOscillator(), vg = ctx.createGain();
        o.type = 'sine'; o.connect(vg).connect(g); o.start(); voices.push({ o, vg, k: i / 6 });
      }
      let raf; const start = performance.now();
      const step = () => {
        const t = (performance.now() - start) / 9000;
        voices.forEach(v => {
          const p = (v.k + t) % 1;
          v.o.frequency.value = 55 * Math.pow(2, p * 6);
          v.vg.gain.value = Math.exp(-Math.pow((p - 0.5) * 3.2, 2)) * 0.12;
        });
        raf = requestAnimationFrame(step);
      };
      step();
      g.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);
      shepard = { g, voices, stop: () => cancelAnimationFrame(raf) };
    } else if (!on && shepard) {
      const s = shepard; shepard = null;
      s.g.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      setTimeout(() => { s.stop(); s.voices.forEach(v => v.o.stop()); }, 2500);
    }
  }
};
