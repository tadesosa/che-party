// Modelos 3D hechos con formas simples (sin archivos externos), estilo low-poly.
import * as THREE from 'three';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: true, ...opts });
const M = {
  white: mat('#ffffff'), black: mat('#111111', { roughness: 0.3 }),
  cheek: mat('#ff8a8a'), silver: mat('#cfd6dc', { metalness: 0.7, roughness: 0.3 }),
  gold: mat('#f5c518', { metalness: 0.8, roughness: 0.25 }), green: mat('#1f8a4c'),
};

function mesh(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (s) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Los personajes viven en characters.js
export { makeCharacter, animateChar } from './characters.js';

export function makeCopa() {
  const g = new THREE.Group();
  const pts = [
    [0.0, 0], [0.45, 0], [0.45, 0.12], [0.3, 0.2], [0.3, 0.45], [0.22, 0.5], [0.12, 0.7], [0.15, 0.95],
    [0.3, 1.15], [0.38, 1.4], [0.36, 1.6], [0.25, 1.75], [0.1, 1.82], [0, 1.84],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(mesh(new THREE.LatheGeometry(pts, 24), M.gold));
  g.add(mesh(new THREE.TorusGeometry(0.31, 0.05, 6, 20), M.green, { y: 0.25, rx: Math.PI / 2 }));
  g.add(mesh(new THREE.TorusGeometry(0.31, 0.05, 6, 20), M.green, { y: 0.38, rx: Math.PI / 2 }));
  return g;
}

const TREE = {
  trunk: mat('#6b4a2b', { roughness: 0.9 }),
  green: [mat('#2f7d3a'), mat('#3f9e45'), mat('#62bd52')],
  jacaranda: [mat('#6a45b0'), mat('#8a5fd0'), mat('#ac86e8')],
};
export function makeTree(purple) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.24, 1.5, 7), TREE.trunk, { y: 0.75 }));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.8, 5), TREE.trunk, { y: 1.4, x: 0.25, rz: -0.6 }));
  // Copa en dos tonos: abajo más oscura (sombra), arriba más clara (le da el sol)
  const [dark, mid, light] = purple ? TREE.jacaranda : TREE.green;
  g.add(mesh(new THREE.IcosahedronGeometry(1.0, 1), dark, { y: 1.85, s: [1.1, 0.85, 1.1] }));
  g.add(mesh(new THREE.IcosahedronGeometry(0.8, 1), mid, { y: 2.35, x: 0.45, z: -0.1 }));
  g.add(mesh(new THREE.IcosahedronGeometry(0.72, 1), mid, { y: 2.2, x: -0.55, z: 0.25 }));
  g.add(mesh(new THREE.IcosahedronGeometry(0.65, 1), light, { y: 2.85, x: -0.05, z: 0.1 }));
  g.add(mesh(new THREE.IcosahedronGeometry(0.5, 1), light, { y: 2.6, x: 0.3, z: 0.55 }));
  return g;
}

// Casita estilo Caminito (La Boca)
export function makeHouse(color, roofColor, w = 3, h = 3.2) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, 2.4), mat(color), { y: h / 2 }));
  g.add(mesh(new THREE.BoxGeometry(w + 0.3, 0.25, 2.8), mat(roofColor), { y: h + 0.12, rx: 0.08 }));
  const win = mat('#1b2a4a');
  for (const sx of [-0.6, 0.6]) g.add(mesh(new THREE.BoxGeometry(0.6, 0.8, 0.05), win, { x: sx * (w / 3), y: h * 0.65, z: 1.21 }));
  g.add(mesh(new THREE.BoxGeometry(0.75, 1.4, 0.05), mat('#ffffff'), { y: 0.7, z: 1.21 }));
  // balconcito
  g.add(mesh(new THREE.BoxGeometry(w * 0.6, 0.1, 0.5), mat('#2b2b2b'), { y: h * 0.45, z: 1.4 }));
  return g;
}

export function makeObelisco() {
  const g = new THREE.Group();
  const stone = mat('#f1ead8');
  g.add(mesh(new THREE.BoxGeometry(3, 0.4, 3), mat('#cfc6b0'), { y: 0.2 }));
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.85, 9, 4), stone, { y: 4.9, ry: Math.PI / 4 }));
  g.add(mesh(new THREE.ConeGeometry(0.55, 1.0, 4), stone, { y: 9.9, ry: Math.PI / 4 }));
  const win = mat('#3a3a3a');
  g.add(mesh(new THREE.BoxGeometry(0.18, 0.3, 0.05), win, { y: 8.6, z: 0.6 }));
  return g;
}

export function makeFlag() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 5, 8), M.silver, { y: 2.5 }));
  const c = document.createElement('canvas'); c.width = 240; c.height = 150;
  const x = c.getContext('2d');
  x.fillStyle = '#74acdf'; x.fillRect(0, 0, 240, 150);
  x.fillStyle = '#fff'; x.fillRect(0, 50, 240, 50);
  x.fillStyle = '#f6b40e'; x.beginPath(); x.arc(120, 75, 14, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    x.beginPath(); x.moveTo(120 + Math.cos(a) * 14, 75 + Math.sin(a) * 14); x.lineTo(120 + Math.cos(a) * 22, 75 + Math.sin(a) * 22);
    x.strokeStyle = '#f6b40e'; x.lineWidth = 3; x.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(2.4, 1.5, 12, 1);
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
  flag.position.set(1.25, 4.2, 0); flag.castShadow = true;
  g.add(flag);
  g.userData.flag = flag;
  return g;
}

export function makeAlfajorItem(golden) {
  const g = new THREE.Group();
  const choco = golden ? M.gold : mat('#4a2c1a');
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16), choco, { y: 0.1 }));
  g.add(mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.1, 16), mat('#f1dcb5')));
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16), choco, { y: -0.1 }));
  return g;
}

export function makeChancla() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.55, 0.1, 1.2), mat('#ff5fa2'), {}));
  g.add(mesh(new THREE.TorusGeometry(0.2, 0.06, 6, 12, Math.PI), mat('#2d6cdf'), { y: 0.05, z: 0.15, rx: 0 }));
  return g;
}

// Cartelito de texto que siempre mira a la cámara
export function makeLabel(text, { color = '#1b2a4a', bg = '#ffffff', size = 0.6, border = '#1b2a4a' } = {}) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  const font = 'bold 64px "Trebuchet MS", system-ui, sans-serif';
  x.font = font;
  const w = Math.ceil(x.measureText(text).width) + 50;
  c.width = w; c.height = 96;
  x.font = font;
  if (bg) {
    x.fillStyle = bg; x.strokeStyle = border; x.lineWidth = 8;
    x.beginPath(); x.roundRect(4, 4, w - 8, 88, 40); x.fill(); x.stroke();
  }
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (!bg) { x.lineWidth = 10; x.strokeStyle = border; x.strokeText(text, w / 2, 52); }
  x.fillText(text, w / 2, 52);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(size * (w / 96), size, 1);
  sp.renderOrder = 10;
  return sp;
}
