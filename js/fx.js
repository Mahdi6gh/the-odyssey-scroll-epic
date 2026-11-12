// Weather: painted sea, driving rain and Zeus' lightning — 2D canvas, drawn only while visible.
const { gsap } = window;

// deep Aegean blues; the foam is a thin ivory line, nothing more
const PALETTE = {
  light: { layers: ['rgba(43,76,126,.18)', 'rgba(43,76,126,.38)', 'rgba(31,42,90,.82)'], foam: 'rgba(251,248,242,.7)' },
  dark:  { layers: ['rgba(23,42,74,.55)', 'rgba(28,54,96,.75)', 'rgba(17,30,56,.96)'], foam: 'rgba(160,190,230,.35)' }
};

/* ---------------- SEA ---------------- */
class Sea {
  constructor(host, { tone = 'light', amp = 1, height = 0.28 } = {}) {
    this.c = document.createElement('canvas');
    this.c.className = 'sea';
    this.c.setAttribute('aria-hidden', 'true');
    this.c.style.height = `${height * 100}vh`;
    host.appendChild(this.c);
    this.g = this.c.getContext('2d');
    this.tone = tone; this.amp = amp; this.storm = 0; this.visible = false;
    this.resize();
    new IntersectionObserver(([e]) => (this.visible = e.isIntersecting), { rootMargin: '100px' }).observe(this.c);
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.25);
    const r = this.c.getBoundingClientRect();
    this.w = this.c.width = Math.max(1, r.width * dpr);
    this.h = this.c.height = Math.max(1, r.height * dpr);
    this.s = dpr;
  }
  // long, low swells: a few broad sines, no chop
  wave(x, t, k, layer) {
    const a = this.h * (0.045 + layer * 0.015) * (this.amp + this.storm * 1.1);
    return Math.sin(x * k + t) * a + Math.sin(x * k * 0.52 - t * 0.7 + layer * 1.7) * a * 0.55;
  }
  draw(time) {
    if (!this.visible) return;
    const { g, w, h } = this, p = PALETTE[this.tone];
    g.clearRect(0, 0, w, h);
    const speed = 0.16 + this.storm * 0.45;
    p.layers.forEach((col, i) => {
      const base = h * (0.38 + i * 0.18), k = (0.0022 + i * 0.0009) / this.s, t = time * speed * (0.7 + i * 0.25) + i * 2.3;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, base + this.wave(x, t, k, i));
      g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill();
      if (i === p.layers.length - 1) {
        g.beginPath();
        for (let x = 0; x <= w; x += 8) { const y = base + this.wave(x, t, k, i); x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = p.foam; g.lineWidth = this.s; g.stroke();
      }
    });
  }
}

/* ---------------- STORM + LIGHTNING (one fixed canvas) ---------------- */
class Storm {
  constructor() {
    this.c = document.createElement('canvas');
    this.c.id = 'storm';
    this.c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.c);
    this.g = this.c.getContext('2d');
    this.level = 0; this.bolts = []; this.drops = [];
    this.resize();
    for (let i = 0; i < 320; i++) this.drops.push(this.drop(true));
  }
  resize() {
    this.w = this.c.width = window.innerWidth;
    this.h = this.c.height = window.innerHeight;
  }
  drop(scatter) {
    return { x: Math.random() * (this.w + 400) - 200, y: scatter ? Math.random() * this.h : -40 - Math.random() * 200, l: 14 + Math.random() * 30, v: 14 + Math.random() * 16, o: 0.15 + Math.random() * 0.4 };
  }
  // midpoint displacement: a jagged trunk that throws off branches
  bolt(x1, y1, x2, y2, spread, depth, out) {
    if (depth === 0) { out.push([x1, y1, x2, y2]); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * spread, my = (y1 + y2) / 2 + (Math.random() - 0.5) * spread * 0.3;
    this.bolt(x1, y1, mx, my, spread / 2, depth - 1, out);
    this.bolt(mx, my, x2, y2, spread / 2, depth - 1, out);
    if (depth > 3 && Math.random() < 0.38) {
      const a = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.4, len = Math.hypot(x2 - x1, y2 - y1) * 0.5;
      out.branches = out.branches || [];
      const b = []; this.bolt(mx, my, mx + Math.cos(a) * len, my + Math.sin(a) * len, spread / 2, depth - 2, b);
      out.branches.push(b);
    }
  }
  strike(x = this.w * (0.3 + Math.random() * 0.4), toY = this.h * (0.7 + Math.random() * 0.3)) {
    const segs = [];
    this.bolt(x + (Math.random() - 0.5) * 200, -20, x, toY, this.w * 0.18, 8, segs);
    this.bolts.push({ segs, life: 1, flicker: 0 });
  }
  render() {
    const { g, w, h } = this;
    if (this.level < 0.01 && !this.bolts.length) { if (this.dirty) { g.clearRect(0, 0, w, h); this.dirty = false; } return; }
    this.dirty = true;
    g.clearRect(0, 0, w, h);
    // rain, slanted by the wind
    if (this.level > 0.01) {
      const n = Math.floor(this.drops.length * this.level);
      g.strokeStyle = 'rgba(243,234,216,1)'; g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const d = this.drops[i];
        d.x += d.v * 0.32; d.y += d.v;
        if (d.y > h + 40) Object.assign(d, this.drop(false));
        g.moveTo(d.x, d.y); g.lineTo(d.x - d.l * 0.32, d.y - d.l);
      }
      g.globalAlpha = 0.28 * this.level; g.stroke(); g.globalAlpha = 1;
    }
    // lightning: wide soft glow, then a white-hot core
    this.bolts = this.bolts.filter(b => b.life > 0);
    this.bolts.forEach(b => {
      b.life -= 0.035;
      const on = b.life > 0.6 || Math.random() > 0.45;
      if (!on) return;
      const paths = [b.segs, ...(b.segs.branches || [])];
      [[14, 'rgba(242,140,30,.18)'], [6, 'rgba(255,214,140,.45)'], [2, 'rgba(255,251,240,1)']].forEach(([lw, col], j) => {
        g.lineWidth = lw * (j === 2 ? 1 : b.life); g.strokeStyle = col; g.lineCap = 'round';
        paths.forEach((segs, k) => {
          g.globalAlpha = Math.max(0, b.life) * (k ? 0.6 : 1);
          g.beginPath(); segs.forEach(([a, c, d, e]) => { g.moveTo(a, c); g.lineTo(d, e); }); g.stroke();
        });
      });
      g.globalAlpha = 1;
    });
  }
}

/* ---------------- PUBLIC ---------------- */
export function createFX({ onStrike } = {}) {
  const storm = new Storm();
  const seas = [];
  const add = (sel, opts) => { const host = document.querySelector(sel); if (host) seas.push(new Sea(host, opts)); };
  // the sea appears only where the story is at sea and in danger
  add('.sirens__stage', { tone: 'dark', amp: 0.8, height: 0.16 });
  add('.chapter--zeus', { tone: 'dark', amp: 1, height: 0.18 });

  window.addEventListener('resize', () => { storm.resize(); seas.forEach(s => s.resize()); });

  let auto = null;
  const api = {
    seas,
    render(time) { seas.forEach(s => s.draw(time)); storm.render(); },
    strike(x, y) { storm.strike(x, y); onStrike && onStrike(); },
    storm(level, { lightning = false } = {}) {
      gsap.to(storm, { level, duration: 1.4, ease: 'power2.inOut', overwrite: true });
      seas.forEach(s => gsap.to(s, { storm: level, duration: 2, overwrite: true }));
      if (auto) { auto.kill(); auto = null; }
      if (lightning) {
        const loop = () => { api.strike(); auto = gsap.delayedCall(2 + Math.random() * 4, loop); };
        auto = gsap.delayedCall(1.2, loop);
      }
    },
    gust(seconds = 2.5) { // a short burst — the bag of winds
      api.storm(0.8);
      gsap.delayedCall(seconds, () => api.storm(0));
    }
  };
  return api;
}
