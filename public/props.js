// Más modelos: vehículos, cosas de la ciudad y objetos de los minijuegos.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { kioscoChapa, casaRosada } from './buildings.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: true, ...opts });
const silver = mat('#cfd6dc', { metalness: 0.7, roughness: 0.3 });

function mesh(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (s) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Cartelito con texto dibujado (para el número de línea del colectivo)
function signTex(text, bg, fg, w = 256, h = 96) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.font = `bold ${Math.floor(h * 0.72)}px "Trebuchet MS", sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);

// Colectivo porteño (mira hacia +x). Largo ~4.3: dos colores, filete en el costado, número de línea y llantas
export function makeBus(color = '#d63a2f', line = '152') {
  const g = new THREE.Group();
  const body = mat(color, { flatShading: false, roughness: 0.45 }), cream = mat('#f4efe2', { flatShading: false, roughness: 0.5 });
  const glass = mat('#1d3550', { flatShading: false, roughness: 0.1, metalness: 0.4 }), dark = mat('#1b1b1f');
  const tire = mat('#161616', { roughness: 0.9 }), hub = mat('#d9dde2', { metalness: 0.6, roughness: 0.3, flatShading: false });
  g.add(mesh(rbox(4.3, 1.0, 1.7, 0.14), body, { y: 0.8 }));        // parte de abajo
  g.add(mesh(rbox(4.25, 0.8, 1.66, 0.14), cream, { y: 1.62 }));    // franja de ventanas
  g.add(mesh(rbox(4.15, 0.2, 1.58, 0.08), body, { y: 2.08 }));     // techo
  // Filete: línea azul con otra amarilla finita, a los dos costados
  for (const sz of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(4.0, 0.1, 0.02), mat('#1b2a4a'), { y: 1.2, z: sz * 0.86 }));
    g.add(mesh(new THREE.BoxGeometry(4.0, 0.03, 0.02), mat('#f6c431'), { y: 1.1, z: sz * 0.86 }));
    // Ventanas con parantes
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(0.62, 0.5, 0.02), glass, { x: -1.55 + i * 0.7, y: 1.66, z: sz * 0.835 }));
    // Número de línea al costado
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26), new THREE.MeshBasicMaterial({ map: signTex(line, '#ffffff', '#1b2a4a') }));
    side.position.set(-1.2, 0.85, sz * 0.86); side.rotation.y = sz > 0 ? 0 : Math.PI; g.add(side);
  }
  // Frente: parabrisas grande, cartel de línea con luz naranja, faros y paragolpes
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.85, 1.42), glass, { x: 2.15, y: 1.55 }));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.26), new THREE.MeshBasicMaterial({ map: signTex(line, '#141414', '#ffa53a') }));
  sign.position.set(2.165, 2.02, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  for (const z of [-0.6, 0.6]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.14, 0.26), mat('#fff6c8', { emissive: '#ffe680', emissiveIntensity: 0.8 }), { x: 2.16, y: 0.68, z }));
  for (const x of [-2.17, 2.17]) g.add(mesh(rbox(0.12, 0.2, 1.72, 0.05), dark, { x, y: 0.38 }));
  for (const z of [-0.6, 0.6]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.12, 0.24), mat('#d6402f', { emissive: '#ff3a2a', emissiveIntensity: 0.5 }), { x: -2.16, y: 0.68, z }));
  // Espejos
  for (const z of [-0.98, 0.98]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.28, 0.1), dark, { x: 2.12, y: 1.5, z }));
  // Ruedas con llanta plateada
  for (const x of [-1.35, 1.35]) for (const z of [-0.8, 0.8]) {
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), tire, { x, y: 0.36, z, rx: Math.PI / 2 }));
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 12), hub, { x, y: 0.36, z, rx: Math.PI / 2 }));
  }
  return g;
}

// Taxi negro y amarillo (mira hacia +x). Largo ~2.2
export function makeTaxi() {
  const g = new THREE.Group();
  const black = mat('#1d1d1d'), yellow = mat('#f2c230'), glass = mat('#9fd3f0', { roughness: 0.15 }), tire = mat('#111');
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.55, 1.1), black, { y: 0.55 }));
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.45, 1.0), yellow, { y: 1.05, x: -0.1 }));
  for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(1.0, 0.3, 0.03), glass, { y: 1.07, x: -0.1, z: sz * 0.51 }));
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.15, 0.25), mat('#ffffff'), { y: 1.35, x: -0.1 }));
  for (const x of [-0.7, 0.7]) for (const z of [-0.55, 0.55]) g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12), tire, { x, y: 0.25, z, rx: Math.PI / 2 }));
  return g;
}

export function makeChair(color = '#b9824f') {
  const g = new THREE.Group();
  const wood = mat(color);
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), wood, { y: 0.6 }));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), wood, { y: 1.05, z: -0.42 }));
  for (const x of [-0.38, 0.38]) for (const z of [-0.38, 0.38]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), wood, { x, y: 0.3, z }));
  return g;
}

// Arco de fútbol (la red queda hacia -z)
export function makeGoal(w = 3.2, h = 1.8) {
  const g = new THREE.Group();
  const post = mat('#ffffff');
  for (const x of [-w / 2, w / 2]) g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 8), post, { x, y: h / 2 }));
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, w, 8), post, { y: h, rz: Math.PI / 2 }));
  const netMat = new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.45 });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 10, 6), netMat);
  net.position.set(0, h / 2, -0.8); g.add(net);
  for (const x of [-w / 2, w / 2]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.8, h, 3, 6), netMat);
    side.position.set(x, h / 2, -0.4); side.rotation.y = Math.PI / 2; g.add(side);
  }
  return g;
}

export function makeBall(r = 0.28) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.IcosahedronGeometry(r, 1), mat('#ffffff')));
  const spots = mat('#1b1b1b');
  const ico = new THREE.IcosahedronGeometry(r * 1.01, 0);
  const pos = ico.attributes.position;
  const seen = new Set();
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const k = v.toArray().map((n) => n.toFixed(2)).join();
    if (seen.has(k)) continue;
    seen.add(k);
    const sp = mesh(new THREE.CircleGeometry(r * 0.32, 5), spots);
    sp.position.copy(v); sp.lookAt(v.clone().multiplyScalar(2));
    g.add(sp);
  }
  return g;
}

export function makeGrill() {
  const g = new THREE.Group();
  const iron = mat('#2b2b2b', { metalness: 0.5, roughness: 0.5 }), brick = mat('#b5523b');
  g.add(mesh(new THREE.BoxGeometry(1.8, 0.9, 1.2), brick, { y: 0.45 }));
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.12, 1.0), mat('#ff6a1a', { emissive: '#ff4500', emissiveIntensity: 0.9 }), { y: 0.92 }));
  for (let i = 0; i < 8; i++) g.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 1.05), iron, { x: -0.7 + i * 0.2, y: 1.05 }));
  return g;
}

export function makeSteak() {
  const g = new THREE.Group();
  const meat = mat('#b5423a');
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.42, 0.12, 9), meat, { s: [1.3, 1, 0.8] }));
  g.add(mesh(new THREE.TorusGeometry(0.42, 0.05, 4, 12), mat('#f1e3c8'), { rx: Math.PI / 2, s: [1.3, 0.8, 1] }));
  g.userData.meat = meat;
  return g;
}

const CANDY = ['#e14b3c', '#f2c230', '#3b8fe0'].map((c) => mat(c, { flatShading: false, roughness: 0.4 }));
const candyGeo = new THREE.BoxGeometry(0.2, 0.12, 0.2);
export function makeKiosk() { // kiosco de chapa con cartel, vidriera y golosinas en el mostrador
  const g = new THREE.Group();
  g.add(kioscoChapa());
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.08, 0.32), mat('#e8e2d2'), { y: 0.82, z: 0.96 }));
  for (let i = 0; i < 6; i++) g.add(mesh(candyGeo, CANDY[i % 3], { x: -0.6 + i * 0.24, y: 0.92, z: 0.96 }));
  return g;
}

export function makeCasaRosada() { // revoque rosa, ventanas en arco, pilastras, balcones y el cuerpo central
  const g = new THREE.Group();
  g.add(casaRosada());
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), silver, { y: 6.8 }));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.2, 0.02), mat('#74acdf'), { x: 0.47, y: 7.45 }));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.2, 0.02), mat('#ffffff'), { x: 0.47, y: 7.25 }));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.2, 0.02), mat('#74acdf'), { x: 0.47, y: 7.05 }));
  return g;
}

export function makeFarol() {
  const g = new THREE.Group();
  const iron = mat('#2a3340');
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.6, 8), iron, { y: 1.3 }));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.1, 6), iron, { y: 2.65 }));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.4, 6), mat('#fff2b3', { emissive: '#ffd966', emissiveIntensity: 0.7 }), { y: 2.9 }));
  g.add(mesh(new THREE.ConeGeometry(0.3, 0.25, 6), iron, { y: 3.22 }));
  return g;
}

export function makeBench() {
  const g = new THREE.Group();
  const wood = mat('#a8733f'), iron = mat('#2a3340');
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(1.8, 0.07, 0.16), wood, { y: 0.5, z: -0.2 + i * 0.2 }));
  for (let i = 0; i < 2; i++) g.add(mesh(new THREE.BoxGeometry(1.8, 0.16, 0.06), wood, { y: 0.75 + i * 0.22, z: -0.32, rx: -0.15 }));
  for (const x of [-0.75, 0.75]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.5, 0.5), iron, { x, y: 0.25 }));
  return g;
}

export function makeFountain() {
  const g = new THREE.Group();
  const stone = mat('#d8d0bd');
  g.add(mesh(new THREE.CylinderGeometry(2, 2.1, 0.5, 20), stone, { y: 0.25 }));
  g.add(mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.1, 20), mat('#6fb6e0', { roughness: 0.1, metalness: 0.2 }), { y: 0.48 }));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.2, 10), stone, { y: 1.0 }));
  g.add(mesh(new THREE.CylinderGeometry(0.8, 0.5, 0.2, 14), stone, { y: 1.6 }));
  const jet = mesh(new THREE.ConeGeometry(0.25, 0.9, 8), mat('#bfe6ff', { transparent: true, opacity: 0.7 }), { y: 2.1 });
  g.add(jet);
  g.userData.jet = jet;
  return g;
}

// Parada de colectivo: poste con el cartel de la línea a los dos lados
export function makeBusStop(line = '152') {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.3, 8), mat('#2a3340'), { y: 1.15 }));
  g.add(mesh(new THREE.BoxGeometry(0.8, 0.62, 0.06), mat('#ef8a17'), { y: 2.15 }));
  const face = new THREE.MeshBasicMaterial({ map: signTex('🚌 ' + line, '#ffffff', '#1b2a4a') });
  for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.26), face);
    p.position.set(0, 2.15, sz * 0.032); p.rotation.y = sz > 0 ? 0 : Math.PI; g.add(p);
  }
  return g;
}

export function makeCloud() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const s = 1.2 + Math.random() * 1.4;
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), m);
    c.position.set(i * 1.6 - n * 0.8, Math.random() * 0.6, Math.random() * 1.2);
    g.add(c);
  }
  return g;
}

// Flecha 3D para el tango (apunta hacia +y en su plano)
export function makeArrow(color = '#f6b40e') {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1); shape.lineTo(0.8, 0.1); shape.lineTo(0.3, 0.1); shape.lineTo(0.3, -0.9);
  shape.lineTo(-0.3, -0.9); shape.lineTo(-0.3, 0.1); shape.lineTo(-0.8, 0.1); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  geo.center();
  return mesh(geo, mat(color, { emissive: color, emissiveIntensity: 0.25 }));
}
