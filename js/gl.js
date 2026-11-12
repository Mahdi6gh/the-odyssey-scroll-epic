import * as THREE from 'three';

/* ------------------------------------------------------------------
   AMPHORA — a single, real clay object with the voyage painted on its
   belly; scroll turns it. Lit like a museum vitrine.
------------------------------------------------------------------- */
function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

function meander(g, x0, y, w, h, color) {
  g.strokeStyle = color; g.lineWidth = h * 0.14; g.lineCap = 'square';
  const s = h; for (let x = x0; x < x0 + w; x += s) {
    g.beginPath();
    g.moveTo(x, y + h); g.lineTo(x, y); g.lineTo(x + s * 0.8, y); g.lineTo(x + s * 0.8, y + h * 0.7);
    g.lineTo(x + s * 0.3, y + h * 0.7); g.lineTo(x + s * 0.3, y + h * 0.35); g.lineTo(x + s * 0.55, y + h * 0.35);
    g.stroke();
  }
}

async function paintTexture() {
  const W = 4096, H = 2048;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // fired clay with uneven tone
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#b4521f'); grad.addColorStop(0.5, '#cf6a2c'); grad.addColorStop(1, '#a8481b');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,20,5' : '255,190,120'},${Math.random() * 0.06})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 10, 1 + Math.random() * 4);
  }
  // black glaze zones: shoulder and foot (V runs bottom→top, canvas y is flipped by the texture)
  g.fillStyle = '#120d0a';
  g.fillRect(0, 0, W, H * 0.17);
  g.fillRect(0, H * 0.86, W, H * 0.14);
  // frieze band
  const fy = H * 0.3, fh = H * 0.42;
  g.fillRect(0, fy, W, fh);
  meander(g, 0, fy - 70, W, 54, '#120d0a');
  meander(g, 0, fy + fh + 18, W, 54, '#120d0a');
  // tongues on the shoulder
  g.fillStyle = '#c8622a';
  for (let x = 0; x < W; x += 64) { g.beginPath(); g.ellipse(x + 32, H * 0.2, 22, 46, 0, 0, Math.PI * 2); g.fill(); }

  const scenes = await Promise.all(['ship', 'cyclops', 'giants', 'sirens'].map(n => loadImg(`media/img/${n}.webp`)));
  const slot = W / scenes.length;
  scenes.forEach((im, i) => {
    if (!im) return;
    const s = Math.min((slot * 0.96) / im.width, (fh * 0.92) / im.height);
    const w = im.width * s, h = im.height * s;
    const x = i * slot + (slot - w) / 2, y = fy + (fh - h) / 2;
    g.save(); g.globalCompositeOperation = 'lighten'; g.drawImage(im, x, y, w, h); g.restore();
  });
  // wear: lighter scratches and chips
  g.strokeStyle = 'rgba(230,170,110,.18)';
  for (let i = 0; i < 220; i++) { g.lineWidth = Math.random() * 2; g.beginPath(); const x = Math.random() * W, y = Math.random() * H; g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 60, y + (Math.random() - .5) * 18); g.stroke(); }
  return c;
}

export async function createAmphora(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.15, 9.2);

  // profile of an Attic neck-amphora (radius, height)
  const pts = [[0.0,-1.62],[0.42,-1.62],[0.46,-1.56],[0.34,-1.48],[0.3,-1.36],[0.5,-1.12],[0.86,-0.62],[1.06,-0.12],[1.08,0.18],[0.98,0.52],[0.74,0.84],[0.46,1.02],[0.36,1.16],[0.34,1.42],[0.44,1.56],[0.48,1.64],[0.42,1.66],[0.30,1.6]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 160);

  const tex = new THREE.CanvasTexture(await paintTexture());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.flipY = true;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.0 });
  const jar = new THREE.Group();
  jar.add(new THREE.Mesh(geo, mat));
  // handles: two arcs from shoulder to neck
  const hMat = new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.38 });
  [-1, 1].forEach(s => {
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(s * 0.82, 0.7, 0), new THREE.Vector3(s * 1.28, 0.95, 0),
      new THREE.Vector3(s * 1.0, 1.42, 0), new THREE.Vector3(s * 0.36, 1.32, 0));
    jar.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.06, 12), hMat));
  });
  scene.add(jar);

  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a1d0c, 0.9));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.4); key.position.set(-4, 3, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb066, 2.0); rim.position.set(5, 2, -4); scene.add(rim);
  const fill = new THREE.PointLight(0xffffff, 0.6, 20); fill.position.set(2, -2, 6); scene.add(fill);

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let progress = 0, visible = false, sway = 0;
  return {
    setProgress(p) { progress = p; },
    setVisible(v) { visible = v; },
    render(time) {
      if (!visible) return;
      sway = Math.sin(time * 0.6) * 0.03;
      jar.rotation.y = -progress * Math.PI * 2 + 0.6;
      jar.rotation.z = sway; jar.position.y = Math.sin(time * 0.8) * 0.04;
      renderer.render(scene, camera);
    }
  };
}
