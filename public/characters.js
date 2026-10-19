// Personajes de Che Party, estilo "juguete" (como los party games de consola):
// cuerpo liso y brillante, texturas propias de cada comida, ojos con brillo, guantes blancos y zapatitos,
// y un contorno oscuro que los hace resaltar en la tele.
import * as THREE from 'three';

// ---------- Materiales ----------
const toy = (color, opts = {}) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.35, ...opts,
});
const flat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts });

// Contorno tipo dibujo animado: una copia del objeto "inflada" por la normal y pintada por dentro
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#22162b', side: THREE.BackSide });
OUTLINE.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.022;');
};
OUTLINE.customProgramCacheKey = () => 'lp-outline';

function part(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s, outline = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (s) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
  m.castShadow = true; m.receiveShadow = true;
  if (outline) { const o = new THREE.Mesh(geo, OUTLINE); o.castShadow = false; m.add(o); }
  return m;
}

// ---------- Texturas dibujadas ----------
const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}
const dots = (x, w, h, colors, n, rMin, rMax, alpha = 1) => {
  x.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    x.fillStyle = colors[i % colors.length];
    x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, rMin + Math.random() * (rMax - rMin), rMin + Math.random() * (rMax - rMin) * 0.7, Math.random() * 3, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
};
const TX = {
  gourd: () => canvasTex('gourd', 256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6e8f3a'); g.addColorStop(0.5, '#4f7a2c'); g.addColorStop(1, '#3a5c22');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(30,50,15,.35)'; x.lineWidth = 2;
    for (let i = 0; i < 18; i++) { x.beginPath(); x.moveTo((i / 18) * w, 0); x.bezierCurveTo((i / 18) * w + 10, h * 0.3, (i / 18) * w - 10, h * 0.7, (i / 18) * w, h); x.stroke(); }
    dots(x, w, h, ['#86a64c', '#2f4a1b'], 120, 1, 3, 0.4);
  }),
  leather: () => canvasTex('leather', 256, 64, (x, w, h) => {
    x.fillStyle = '#7a4a26'; x.fillRect(0, 0, w, h);
    dots(x, w, h, ['#6a3d1e', '#8d5a31'], 200, 1, 3, 0.5);
    x.strokeStyle = '#f1e2c2'; x.lineWidth = 3; x.setLineDash([8, 6]);
    for (const y of [10, h - 10]) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  }),
  crust: () => canvasTex('crust', 256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w * 0.5, h * 0.4, 10, w * 0.5, h * 0.5, w * 0.7);
    g.addColorStop(0, '#f6c46a'); g.addColorStop(1, '#d68a2c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    dots(x, w, h, ['#b8681e', '#c97a2a', '#fbe0a0'], 260, 2, 7, 0.45);
  }),
  choco: () => canvasTex('choco', 256, 256, (x, w, h) => {
    x.fillStyle = '#3b2216'; x.fillRect(0, 0, w, h);
    dots(x, w, h, ['#4a2b1c', '#2f1a10'], 160, 3, 9, 0.5);
    x.strokeStyle = '#f6efe4'; x.lineWidth = 5; x.lineCap = 'round';
    for (let i = 0; i < 6; i++) { // hilos de chocolate blanco
      x.beginPath(); x.moveTo(-10, 30 + i * 40);
      for (let k = 0; k <= 8; k++) x.lineTo(k * 34, 30 + i * 40 + Math.sin(k * 1.7 + i) * 12);
      x.stroke();
    }
  }),
  croissant: () => canvasTex('croissant', 256, 128, (x, w, h) => {
    x.fillStyle = '#e8a23c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const g = x.createLinearGradient(0, (i / 14) * h, 0, ((i + 1) / 14) * h);
      g.addColorStop(0, '#f6c66b'); g.addColorStop(0.7, '#d98a2a'); g.addColorStop(1, '#a8601b');
      x.fillStyle = g; x.fillRect(0, (i / 14) * h, w, h / 14 + 1);
    }
    dots(x, w, h, ['#fde6b0'], 60, 1, 3, 0.6);
  }),
  bread: () => canvasTex('bread', 256, 256, (x, w, h) => {
    x.fillStyle = '#e2b77a'; x.fillRect(0, 0, w, h);
    dots(x, w, h, ['#c9954f', '#f3dcae', '#fff5e0'], 300, 1, 5, 0.5);
  }),
  chorizo: () => canvasTex('chorizo', 256, 256, (x, w, h) => {
    x.fillStyle = '#8f2a1c'; x.fillRect(0, 0, w, h);
    dots(x, w, h, ['#e9b9a4', '#b4402a', '#6e1d12'], 240, 2, 6, 0.6);
    dots(x, w, h, ['#2f7d32', '#4caf50', '#1b5e20'], 120, 2, 5, 0.9); // chimichurri
  }),
  label: () => canvasTex('label', 512, 128, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#74acdf'; x.fillRect(0, 0, w, 26); x.fillRect(0, h - 26, w, 26);
    x.fillStyle = '#5a3418'; x.font = 'italic bold 44px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('Dulce de Leche', w * 0.25, h / 2); x.fillText('Dulce de Leche', w * 0.75, h / 2);
  }),
  kernels: () => canvasTex('kernels', 256, 256, (x, w, h) => {
    x.fillStyle = '#c98f12'; x.fillRect(0, 0, w, h);
    const cw = w / 12, ch = h / 16;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 16; j++) {
      const g = x.createRadialGradient(i * cw + cw * 0.4, j * ch + ch * 0.35, 1, i * cw + cw / 2, j * ch + ch / 2, cw * 0.6);
      g.addColorStop(0, '#fff3a6'); g.addColorStop(0.6, '#f6c834'); g.addColorStop(1, '#d99a12');
      x.fillStyle = g; x.beginPath(); x.ellipse(i * cw + cw / 2, j * ch + ch / 2, cw * 0.44, ch * 0.42, 0, 0, 7); x.fill();
    }
  }),
  membrillo: () => canvasTex('membrillo', 256, 256, (x, w, h) => {
    x.fillStyle = '#8e1f2c'; x.fillRect(0, 0, w, h);
    dots(x, w, h, ['#a62a39', '#741622'], 120, 3, 9, 0.5);
    x.strokeStyle = '#e3a857'; x.lineWidth = 22; x.lineCap = 'round';
    for (let i = -2; i < 6; i++) {
      x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64 + 256, 256); x.stroke();
      x.beginPath(); x.moveTo(i * 64 + 256, 0); x.lineTo(i * 64, 256); x.stroke();
    }
  }),
  sugar: () => canvasTex('sugar', 256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, '#f2c27a'); g.addColorStop(1, '#c98f3a');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    dots(x, w, h, ['#b07a2e', '#e0a85a'], 140, 3, 8, 0.4);
    dots(x, w, h, ['#ffffff', '#fffbe8'], 500, 1, 2.2, 0.9);
  }),
  check: () => canvasTex('check', 128, 64, (x, w, h) => {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#d63a2f' : '#ffffff'; x.fillRect(i * 8, j * 8, 8, 8); }
  }),
};

// ---------- Cara ----------
function face(body, { y, z, spread = 0.19, size = 0.13, iris = '#3b2414', mouth = 0.17, brow = true }) {
  body.userData.eyes = [];
  const white = toy('#ffffff', { clearcoat: 1 });
  const irisM = toy(iris, { clearcoat: 1 });
  const black = toy('#0d0d12', { clearcoat: 1 });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * spread, y, z);
    eye.add(part(new THREE.SphereGeometry(size, 20, 16), white, { s: [0.9, 1.15, 0.55] }));
    eye.add(part(new THREE.SphereGeometry(size * 0.62, 16, 12), irisM, { y: -0.015, z: size * 0.32, s: [1, 1.1, 0.5], outline: false }));
    eye.add(part(new THREE.SphereGeometry(size * 0.36, 12, 10), black, { y: -0.015, z: size * 0.42, s: [1, 1.1, 0.5], outline: false }));
    eye.add(part(new THREE.SphereGeometry(size * 0.16, 8, 6), shine, { x: -size * 0.22, y: size * 0.25, z: size * 0.5, outline: false }));
    body.add(eye);
    body.userData.eyes.push(eye);
    if (brow) body.add(part(new THREE.CapsuleGeometry(0.025, size * 1.1, 4, 8), flat('#2b1a12'), { x: sx * spread, y: y + size * 1.45, z: z + 0.01, rz: Math.PI / 2 - sx * 0.22, outline: false }));
    // Cachetes
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(size * 0.55, 16), new THREE.MeshBasicMaterial({ color: '#ff7b8a', transparent: true, opacity: 0.55, depthWrite: false }));
    cheek.position.set(sx * (spread + size * 0.9), y - size * 1.2, z - 0.01); cheek.scale.y = 0.6;
    body.add(cheek);
  }
  // Boca abierta sonriendo
  const sh = new THREE.Shape();
  sh.moveTo(-mouth / 2, 0); sh.lineTo(mouth / 2, 0);
  sh.absarc(0, 0, mouth / 2, 0, -Math.PI, true);
  const mouthG = new THREE.Group();
  mouthG.add(part(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 16 }), flat('#5a1420'), { outline: false }));
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(mouth * 0.26, 14), flat('#ff7b8a'));
  tongue.position.set(0, -mouth * 0.32, 0.035); tongue.scale.x = 1.5; mouthG.add(tongue);
  const teeth = new THREE.Mesh(new THREE.PlaneGeometry(mouth * 0.7, mouth * 0.14), flat('#ffffff'));
  teeth.position.set(0, -mouth * 0.07, 0.034); mouthG.add(teeth);
  mouthG.position.set(0, y - size * 1.35, z - 0.005);
  body.add(mouthG);
  body.userData.mouth = mouthG;
}

// ---------- Brazos y piernas ----------
function arm(side, { x, y, color, len = 0.26 }) {
  const pivot = new THREE.Group();
  pivot.position.set(side * x, y, 0);
  const upper = part(new THREE.CapsuleGeometry(0.06, len, 4, 10), toy(color), { y: -len / 2 - 0.03 });
  pivot.add(upper);
  const glove = new THREE.Group();
  glove.position.y = -len - 0.1;
  glove.add(part(new THREE.SphereGeometry(0.12, 16, 12), toy('#ffffff'), { s: [1, 0.95, 0.9] }));
  glove.add(part(new THREE.SphereGeometry(0.05, 10, 8), toy('#ffffff'), { x: -side * 0.09, y: 0.05, z: 0.06 }));
  glove.add(part(new THREE.TorusGeometry(0.1, 0.03, 6, 14), toy('#ffffff'), { y: 0.09, rx: Math.PI / 2, outline: false }));
  pivot.add(glove);
  pivot.rotation.z = side * 0.45;
  pivot.userData.side = side;
  return pivot;
}
function leg(side, { color, shoe }) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.19, 0.24, 0);
  pivot.add(part(new THREE.CapsuleGeometry(0.065, 0.1, 4, 8), toy(color), { y: -0.08 }));
  pivot.add(part(new THREE.SphereGeometry(0.14, 16, 12), toy(shoe, { clearcoat: 0.9 }), { y: -0.18, z: 0.05, s: [0.9, 0.62, 1.35] }));
  return pivot;
}

// ---------- Cada personaje ----------
// Devuelve la info para armar brazos y piernas.
const BUILD = {
  mate(body) {
    const pts = [[0.02, 0], [0.26, 0.02], [0.46, 0.12], [0.58, 0.32], [0.62, 0.55], [0.58, 0.8], [0.49, 1.0], [0.4, 1.14], [0.36, 1.25]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    body.add(part(new THREE.LatheGeometry(pts, 40), toy('#ffffff', { map: TX.gourd(), clearcoat: 0.5 })));
    body.add(part(new THREE.CylinderGeometry(0.63, 0.6, 0.2, 40, 1, true), toy('#ffffff', { map: TX.leather(), side: THREE.DoubleSide }), { y: 0.3 }));
    body.add(part(new THREE.TorusGeometry(0.37, 0.05, 10, 32), toy('#d9dde2', { metalness: 0.9, roughness: 0.2 }), { y: 1.26, rx: Math.PI / 2 }));
    body.add(part(new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toy('#7a9a2a', { roughness: 0.9, clearcoat: 0 }), { y: 1.2, s: [1, 0.45, 1] }));
    const bomb = new THREE.Group();
    bomb.add(part(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 10), toy('#d9dde2', { metalness: 0.9, roughness: 0.2 }), { y: 0.45 }));
    bomb.add(part(new THREE.CylinderGeometry(0.05, 0.035, 0.08, 10), toy('#e8b923', { metalness: 0.9, roughness: 0.2 }), { y: 0.95 }));
    bomb.position.set(0.12, 1.15, -0.05); bomb.rotation.z = -0.38;
    body.add(bomb);
    face(body, { y: 0.78, z: 0.53, spread: 0.2, size: 0.13 });
    return { arms: { x: 0.6, y: 0.62, color: '#3a5c22' }, legs: { color: '#3a5c22', shoe: '#6b3a1e' }, top: 1.9 };
  },
  empanada(body) {
    const sh = new THREE.Shape();
    sh.moveTo(-0.78, 0); sh.absarc(0, 0, 0.78, Math.PI, 0, true); sh.lineTo(-0.78, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.17, bevelSize: 0.13, bevelSegments: 8, curveSegments: 40 });
    geo.translate(0, 0.13, -0.15);
    // UV simples para la textura de masa
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) * 0.6 + 0.5, pos.getY(i) * 0.6 + pos.getZ(i) * 0.3);
    body.add(part(geo, toy('#ffffff', { map: TX.crust(), clearcoat: 0.8 })));
    // Repulgue trenzado
    const rep = toy('#d98a2c', { map: TX.crust() });
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI - (i / 18) * Math.PI;
      body.add(part(new THREE.CapsuleGeometry(0.07, 0.12, 4, 8), rep, { x: Math.cos(a) * 0.97, y: 0.13 + Math.sin(a) * 0.97, z: 0, rz: a + 0.6, rx: 0.5, outline: i % 2 === 0 }));
    }
    face(body, { y: 0.55, z: 0.31, spread: 0.2, size: 0.13 });
    return { arms: { x: 0.86, y: 0.3, color: '#c97a2a' }, legs: { color: '#c97a2a', shoe: '#2d6cdf' }, top: 1.35 };
  },
  alfajor(body) {
    const choco = toy('#ffffff', { map: TX.choco(), clearcoat: 1, clearcoatRoughness: 0.15 });
    const ddl = toy('#f1d7a8', { roughness: 0.6, clearcoat: 0.2 });
    for (const z of [-0.18, 0.18]) {
      body.add(part(new THREE.CylinderGeometry(0.66, 0.66, 0.18, 48), choco, { y: 0.78, z, rx: Math.PI / 2 }));
      body.add(part(new THREE.TorusGeometry(0.62, 0.09, 12, 48), choco, { y: 0.78, z, outline: false }));
    }
    body.add(part(new THREE.CylinderGeometry(0.63, 0.63, 0.2, 48), ddl, { y: 0.78, rx: Math.PI / 2 }));
    face(body, { y: 0.92, z: 0.28, spread: 0.21, size: 0.14 });
    return { arms: { x: 0.66, y: 0.72, color: '#3b2216' }, legs: { color: '#3b2216', shoe: '#e14b3c' }, top: 1.6 };
  },
  medialuna(body) {
    const m = toy('#ffffff', { map: TX.croissant(), clearcoat: 0.9, clearcoatRoughness: 0.2 });
    const N = 9;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const a = Math.PI + 0.32 - t * (Math.PI + 0.64);
      const r = 0.16 + 0.24 * Math.sin(Math.PI * t);
      body.add(part(new THREE.SphereGeometry(r, 24, 18), m, { x: Math.cos(a) * 0.6, y: 0.48 + Math.sin(a) * 0.62, rz: a, s: [0.9, 1.1, 0.95] }));
    }
    face(body, { y: 1.05, z: 0.36, spread: 0.17, size: 0.12, mouth: 0.15 });
    return { arms: { x: 0.62, y: 0.78, color: '#c97a2a', len: 0.22 }, legs: null, top: 1.6 };
  },
  chori(body) {
    body.add(part(new THREE.CapsuleGeometry(0.4, 0.7, 10, 24), toy('#ffffff', { map: TX.bread(), clearcoat: 0.3 }), { y: 0.78, z: -0.12, s: [1.25, 1, 0.8] }));
    body.add(part(new THREE.CapsuleGeometry(0.28, 0.82, 10, 24), toy('#ffffff', { map: TX.chorizo(), clearcoat: 0.8, clearcoatRoughness: 0.2 }), { y: 0.84, z: 0.1 }));
    face(body, { y: 1.02, z: 0.36, spread: 0.14, size: 0.11, mouth: 0.14 });
    return { arms: { x: 0.52, y: 0.75, color: '#c9954f' }, legs: { color: '#c9954f', shoe: '#1b2a4a' }, top: 1.75 };
  },
  dulce(body) {
    body.add(part(new THREE.CylinderGeometry(0.45, 0.45, 0.85, 40), toy('#9a5a24', { clearcoat: 1, clearcoatRoughness: 0.1 }), { y: 0.5, outline: false }));
    body.add(part(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.28, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), { y: 0.55 }));
    body.add(part(new THREE.CylinderGeometry(0.505, 0.505, 0.36, 40, 1, true), toy('#ffffff', { map: TX.label() }), { y: 0.36, outline: false }));
    body.add(part(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 40), toy('#ffffff', { map: TX.check() }), { y: 1.14 }));
    body.add(part(new THREE.CylinderGeometry(0.5, 0.55, 0.06, 40), toy('#ffffff', { map: TX.check() }), { y: 1.28 }));
    face(body, { y: 0.84, z: 0.49, spread: 0.18, size: 0.12 });
    return { arms: { x: 0.52, y: 0.75, color: '#9a5a24' }, legs: { color: '#9a5a24', shoe: '#2e9e48' }, top: 1.75 };
  },
  choclo(body) {
    body.add(part(new THREE.CapsuleGeometry(0.42, 0.8, 12, 28), toy('#ffffff', { map: TX.kernels(), clearcoat: 0.7 }), { y: 0.82 }));
    // Chalas (hojas) abrazando el choclo desde abajo
    const leaf = toy('#6aa84f', { side: THREE.DoubleSide, clearcoat: 0.3 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      body.add(part(new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 0.55, 0, Math.PI * 0.62), leaf, { y: 0.32, ry: a, s: [1, 1.6, 1] }));
    }
    body.add(part(new THREE.ConeGeometry(0.12, 0.35, 8), toy('#c9a227'), { y: 1.75, rz: 0.3 }));
    face(body, { y: 1.02, z: 0.4, spread: 0.16, size: 0.12, mouth: 0.15 });
    return { arms: { x: 0.46, y: 0.85, color: '#6aa84f' }, legs: { color: '#6aa84f', shoe: '#7b4a2d' }, top: 1.9 };
  },
  pastafrola(body) {
    const crust = toy('#e3a857', { clearcoat: 0.4 });
    body.add(part(new THREE.BoxGeometry(1.25, 1.25, 0.32), crust, { y: 0.82 }));
    body.add(part(new THREE.BoxGeometry(1.08, 1.08, 0.06), toy('#ffffff', { map: TX.membrillo(), clearcoat: 0.9, clearcoatRoughness: 0.2 }), { y: 0.82, z: 0.17, outline: false }));
    for (const [x, y, w, h] of [[0, 1.41, 1.3, 0.14], [0, 0.23, 1.3, 0.14], [-0.6, 0.82, 0.14, 1.3], [0.6, 0.82, 0.14, 1.3]]) {
      body.add(part(new THREE.CapsuleGeometry(0.08, Math.max(w, h) - 0.16, 4, 10), crust, { x, y, z: 0.12, rz: w > h ? Math.PI / 2 : 0, outline: false }));
    }
    face(body, { y: 0.95, z: 0.23, spread: 0.22, size: 0.14 });
    return { arms: { x: 0.66, y: 0.75, color: '#c98f3a' }, legs: { color: '#c98f3a', shoe: '#8e1f2c' }, top: 1.6 };
  },
  tortafrita(body) {
    const geo = new THREE.CylinderGeometry(0.66, 0.68, 0.24, 36);
    // Bordes irregulares, como masa frita de verdad
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
      if (r > 0.3) { const k = 1 + Math.sin(Math.atan2(z, x) * 5) * 0.05; pos.setX(i, x * k); pos.setZ(i, z * k); }
    }
    geo.computeVertexNormals();
    body.add(part(geo, toy('#ffffff', { map: TX.sugar(), clearcoat: 0.5 }), { y: 0.78, rx: Math.PI / 2 }));
    body.add(part(new THREE.CapsuleGeometry(0.04, 0.22, 4, 8), flat('#7a4a1e'), { y: 0.5, z: 0.14, rz: Math.PI / 2, outline: false }));
    face(body, { y: 0.92, z: 0.16, spread: 0.21, size: 0.14 });
    return { arms: { x: 0.68, y: 0.72, color: '#b07a2e' }, legs: { color: '#b07a2e', shoe: '#2f86e0' }, top: 1.55 };
  },
  // El anfitrión: un sifón de soda con moño y bigote
  sifon(body) {
    const glass = new THREE.MeshPhysicalMaterial({ color: '#7fc8ff', transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1, metalness: 0.1 });
    body.add(part(new THREE.CylinderGeometry(0.42, 0.44, 1.2, 36), glass, { y: 0.62 }));
    for (let i = 0; i < 6; i++) body.add(part(new THREE.TorusGeometry(0.435, 0.025, 6, 30), toy('#b9e3ff'), { y: 0.15 + i * 0.2, rx: Math.PI / 2, outline: false }));
    const metal = toy('#d9dde2', { metalness: 0.9, roughness: 0.2 });
    body.add(part(new THREE.CylinderGeometry(0.3, 0.4, 0.36, 24), metal, { y: 1.38 }));
    body.add(part(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 10), metal, { y: 1.5, z: 0.28, rx: 1.1 }));
    body.add(part(new THREE.BoxGeometry(0.12, 0.06, 0.55), metal, { y: 1.68, z: -0.05, rx: -0.25 }));
    const red = toy('#d63a2f');
    body.add(part(new THREE.ConeGeometry(0.11, 0.22, 10), red, { x: -0.12, y: 1.12, z: 0.42, rz: -Math.PI / 2 }));
    body.add(part(new THREE.ConeGeometry(0.11, 0.22, 10), red, { x: 0.12, y: 1.12, z: 0.42, rz: Math.PI / 2 }));
    body.add(part(new THREE.SphereGeometry(0.06, 10, 8), red, { y: 1.12, z: 0.45 }));
    face(body, { y: 0.78, z: 0.42, spread: 0.17, size: 0.12, mouth: 0.13 });
    const must = flat('#3b2414');
    for (const sx of [-1, 1]) body.add(part(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), must, { x: sx * 0.09, y: 0.6, z: 0.45, rz: Math.PI / 2 + sx * 0.35, outline: false }));
    return { arms: { x: 0.46, y: 0.8, color: '#9fd8ff' }, legs: { color: '#c0c6cc', shoe: '#1b1b1b' }, top: 1.85 };
  },
};

// Cada personaje mide ~1.6 de alto y mira hacia +z.
export function makeCharacter(key, uiColor) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  // "lift" sube el cuerpo arriba de las piernas; así body.position.y queda libre para saltitos
  const lift = new THREE.Group();
  g.add(lift); lift.add(body);
  const info = (BUILD[key] || BUILD.mate)(body);
  const hasLegs = !!info.legs;
  lift.position.y = hasLegs ? 0.18 : 0;
  g.userData.legs = hasLegs ? [leg(-1, info.legs), leg(1, info.legs)] : [];
  g.userData.legs.forEach((l) => g.add(l));
  g.userData.arms = [arm(-1, info.arms), arm(1, info.arms)];
  g.userData.arms.forEach((a) => body.add(a));

  // Aro de color del jugador en el piso
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 32), new THREE.MeshBasicMaterial({ color: uiColor, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  g.add(ring);
  // Sombra redonda suave
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.renderOrder = 1;
  g.add(blob);

  g.userData.body = body;
  g.userData.ring = ring;
  g.userData.blob = blob;
  g.userData.eyes = body.userData.eyes || [];
  g.userData.blinkAt = Math.random() * 4;
  g.userData.top = info.top;
  return g;
}

// Animación de brazos y piernas.
// walk: 0..1 (qué tan rápido camina) · cheer: brazos arriba festejando · wave: saluda con un brazo
export function animateChar(g, time, { walk = 0, cheer = false, wave = false, phase = 0 } = {}) {
  const arms = g.userData.arms, legs = g.userData.legs;
  if (!arms) return;
  const sw = Math.sin(time * 11 + phase) * walk;
  arms.forEach((a, i) => {
    const side = a.userData.side;
    let rz = side * (0.45 + Math.sin(time * 2 + phase) * 0.04), rx = (i ? 1 : -1) * sw * 0.9;
    if (cheer) { rz = side * (2.5 + Math.sin(time * 10 + i) * 0.25); rx = 0; }
    else if (wave && i === 1) { rz = side * (2.4 + Math.sin(time * 9) * 0.35); rx = 0; }
    a.rotation.z += (rz - a.rotation.z) * 0.3;
    a.rotation.x += (rx - a.rotation.x) * 0.3;
  });
  legs.forEach((l, i) => { l.rotation.x = (i ? -1 : 1) * sw * 0.8; });
}
