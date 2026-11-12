// Paper-puppet rigs: an image is cut into parts with clip-path, each part turns around its own joint.
// The base layer has holes where the parts sit, so a turning limb never leaves a ghost behind it.

export const RIGS = {
  hero: {
    src: 'media/img/odysseus.webp',
    parts: {
      head:   { rect: [0.24, 0.0, 0.72, 0.265], pivot: [0.46, 0.265] },
      shield: { rect: [0.47, 0.30, 0.88, 0.68], pivot: [0.52, 0.36] }
    }
  },
  mast: {
    src: 'media/img/mast.webp',
    parts: {
      head: { rect: [0.30, 0.12, 0.63, 0.335], pivot: [0.50, 0.33] }
    }
  },
  penelope: {
    src: 'media/img/penelope.webp',
    parts: {
      arm: { rect: [0.27, 0.42, 0.40, 0.60], pivot: [0.27, 0.45] }
    }
  },
  beggar: {
    src: 'media/img/suitors.webp',
    parts: {
      body: { rect: [0.855, 0.33, 0.965, 0.96], pivot: [0.91, 0.96] }
    }
  }
};

const pct = v => `${(v * 100).toFixed(2)}%`;
const rectPoly = ([x1, y1, x2, y2]) => `${pct(x1)} ${pct(y1)}, ${pct(x2)} ${pct(y1)}, ${pct(x2)} ${pct(y2)}, ${pct(x1)} ${pct(y2)}`;

export function buildRig(el, name) {
  const cfg = RIGS[name];
  el.innerHTML = '';
  const url = `url("${cfg.src}")`;

  // outer square, then each hole, bridged back to the origin; evenodd punches the holes
  const holes = Object.values(cfg.parts)
    .map(p => `${rectPoly(p.rect)}, ${pct(p.rect[0])} ${pct(p.rect[1])}, 0% 0%`)
    .join(', ');
  const base = document.createElement('div');
  base.className = 'rig__base';
  base.style.backgroundImage = url;
  base.style.clipPath = `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${holes})`;
  el.appendChild(base);

  const parts = {};
  for (const [key, p] of Object.entries(cfg.parts)) {
    const d = document.createElement('div');
    d.className = `rig__part rig__part--${key}`;
    d.style.backgroundImage = url;
    // the part keeps a 1.5% bleed so its edge overlaps the hole and seams stay closed while turning
    const b = 0.015;
    d.style.clipPath = `polygon(${rectPoly([p.rect[0] - b, p.rect[1] - b, p.rect[2] + b, p.rect[3] + b])})`;
    d.style.transformOrigin = `${pct(p.pivot[0])} ${pct(p.pivot[1])}`;
    el.appendChild(d);
    parts[key] = d;
  }
  return { el, parts };
}
