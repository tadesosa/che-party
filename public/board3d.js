// Tablero 3D: mapa de Buenos Aires con calles, casillas de distintas formas y barrios decorados.
import * as THREE from 'three';
import { makeTree, makeHouse, makeObelisco, makeFlag, makeLabel } from './models.js';
import { makeKiosk, makeCasaRosada, makeFarol, makeBench, makeFountain, makeBusStop, makeArrow } from './props.js';
import { tex } from './textures.js';
import { scatterNature } from './nature.js';
import { decorMendoza, decorCosta, placer, cityBlock, rng } from './decor.js';
import { decorBariloche, decorCordoba, decorSur, decorNorte } from './decor2.js';
import { kit, repaint } from './kit.js';
import { heightAt } from './terrain.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.75, ...opts });
const toy = (color, opts = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, ...opts });
function shadowed(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function box(w, h, d, material, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m; }
function flatPlane(w, h, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m;
}

// ---------- Formas de casilla ----------
function polygonShape(n, r, rot = 0) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}
function starShape(r, inner = 0.5, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const a = Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * inner : r;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return s;
}
function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const circleShape = (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };

// Cómo se ve cada tipo de casilla
const SPACE = {
  inicio:    { shape: () => roundRectShape(2.3, 2.3, 0.35), color: '#ffffff', rim: '#1b2a4a', icon: 'SALIDA', size: 2.0 },
  azul:      { shape: () => circleShape(0.92), color: '#2f86e0', rim: '#123a6b', icon: '+3', size: 1.4 },
  roja:      { shape: () => circleShape(0.92), color: '#e0453a', rim: '#6b1612', icon: '−3', size: 1.4 },
  evento:    { shape: () => starShape(1.25, 0.55), color: '#2eb85c', rim: '#145c2b', icon: '?', size: 1.3 },
  kiosco:    { shape: () => roundRectShape(1.8, 1.8, 0.3), color: '#f2c230', rim: '#7a5b08', icon: '🏪', size: 1.4 },
  colectivo: { shape: () => roundRectShape(2.3, 1.45, 0.4), color: '#ef8a17', rim: '#7a3f05', icon: '🚌', size: 1.3 },
  banco:     { shape: () => polygonShape(6, 1.12, Math.PI / 6), color: '#f5c518', rim: '#7a5b08', icon: '🏦', size: 1.45 },
  impuesto:  { shape: () => polygonShape(8, 1.05, Math.PI / 8), color: '#5b3a8c', rim: '#24133d', icon: '🧾', size: 1.4 },
  suerte:    { shape: () => circleShape(1.0), color: '#ffffff', rim: '#2e9e48', icon: '🍀', size: 1.45, rainbow: true },
  cruce:     { shape: () => polygonShape(4, 0.85, 0), color: '#e8e2d2', rim: '#6f6a63', icon: '⇆', size: 1.0 },
  zonda:     { shape: () => polygonShape(3, 1.25, Math.PI / 2), color: '#a88b6a', rim: '#4a3a28', icon: '🌪️', size: 1.3 },
  ola:       { shape: () => starShape(1.15, 0.78, 8), color: '#1fb5c9', rim: '#0b5560', icon: '🌊', size: 1.35 },
  avalancha: { shape: () => polygonShape(3, 1.25, -Math.PI / 2), color: '#e8f2ff', rim: '#5b7a9c', icon: '🏔️', size: 1.3 },
  ovni:      { shape: () => polygonShape(6, 1.12, 0), color: '#3fd17a', rim: '#14532f', icon: '🛸', size: 1.35 },
  pinguino:  { shape: () => starShape(1.15, 0.78, 8), color: '#9fd3f5', rim: '#2a5a7a', icon: '🐧', size: 1.35 },
  pachamama: { shape: () => polygonShape(8, 1.08, Math.PI / 8), color: '#d9792b', rim: '#6b3510', icon: '🌄', size: 1.4 },
};

const iconCache = new Map();
function iconTexture(type) {
  if (iconCache.has(type)) return iconCache.get(type);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const sp = SPACE[type];
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (type === 'inicio') {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#74acdf' : '#ffffff'; x.fillRect(i * 32, j * 32, 32, 32); }
    x.fillStyle = '#1b2a4a'; x.fillRect(0, 96, 256, 64);
    x.fillStyle = '#ffffff'; x.font = 'bold 54px "Trebuchet MS", sans-serif'; x.fillText('SALIDA', 128, 130);
  } else if (sp.rainbow) {
    ['#e14b3c', '#ef8a17', '#f2c230', '#2e9e48', '#2f86e0', '#7b4fc0'].forEach((col, i) => { x.strokeStyle = col; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 122 - i * 10, 0, 7); x.stroke(); });
    x.font = '110px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; x.fillText(sp.icon, 128, 136);
  } else if (/^[+−?⇆]/.test(sp.icon)) {
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.arc(128, 128, 96, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 7; x.setLineDash([16, 10]); x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke(); x.setLineDash([]);
    x.lineWidth = 14; x.strokeStyle = 'rgba(0,0,0,.25)'; x.font = 'bold 120px "Trebuchet MS", sans-serif';
    x.strokeText(sp.icon, 128, 138);
    x.fillStyle = '#ffffff'; x.fillText(sp.icon, 128, 138);
  } else {
    x.font = '130px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; x.fillText(sp.icon, 128, 140);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  iconCache.set(type, t);
  return t;
}

const blobMat = new THREE.MeshBasicMaterial({ map: tex.blob(), transparent: true, depthWrite: false, opacity: 0.6 });
function makeSpace(type) {
  const sp = SPACE[type] || SPACE.azul;
  const g = new THREE.Group();
  const shape = sp.shape();
  const rimGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.08, bevelSegments: 3, curveSegments: 24 });
  rimGeo.rotateX(-Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, toy(sp.rim));
  rim.position.y = 0.04;
  g.add(rim);
  const topGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2, curveSegments: 24 });
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, toy(sp.color, { clearcoat: 0.9 }));
  top.scale.set(0.86, 1, 0.86); top.position.y = 0.22;
  g.add(top);
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(sp.size, sp.size), new THREE.MeshBasicMaterial({ map: iconTexture(type), transparent: true, depthWrite: false }));
  icon.rotation.x = -Math.PI / 2; icon.position.y = 0.335;
  icon.castShadow = false;
  if (type === 'inicio') { icon.material = new THREE.MeshStandardMaterial({ map: iconTexture(type) }); icon.scale.setScalar(1); }
  g.add(icon);
  shadowed(g);
  icon.castShadow = false; top.castShadow = false;
  // Sombra de contacto: oscurece apenas el piso alrededor para que la casilla "apoye"
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat);
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.05; blob.scale.setScalar(sp.size * 1.9 + 0.6); blob.renderOrder = -1;
  g.add(blob);
  g.userData.top = top;
  return g;
}

// ---------- Modelos de Kenney (si no cargaron, quedan los dibujados por código) ----------
const TREE_KINDS = ['nature/tree_detailed', 'nature/tree_oak'];
const LEAF_GREENS = ['#4fae4a', '#3f9c45', '#5cb850'];
const leafMats = new Map();
function kTree(i, purple) {
  const t = kit(TREE_KINDS[i % TREE_KINDS.length], 3.3 + (i % 3) * 0.45);
  if (!t) return makeTree(purple);
  const color = purple ? '#9a6ad8' : LEAF_GREENS[i % 3];
  t.traverse((o) => {
    if (o.isMesh && /wood|bark/i.test(o.material.name)) { if (!leafMats.has('bark')) { const m = o.material.clone(); m.color.set('#7a5232'); leafMats.set('bark', m); } o.material = leafMats.get('bark'); }
    if (!o.isMesh || !/leaf/i.test(o.material.name)) return;
    if (!leafMats.has(color)) { const m = o.material.clone(); m.color.set(color); leafMats.set(color, m); }
    o.material = leafMats.get(color);
  });
  return t;
}
// Casitas de Caminito: casas de Kenney con las paredes y el techo de chapa repintados
const HOUSES = ['suburban/building-type-a', 'suburban/building-type-c', 'suburban/building-type-f', 'suburban/building-type-h', 'suburban/building-type-k', 'suburban/building-type-o'];
function kHouse(i, color, roof, w, h) {
  const k = kit(HOUSES[i % HOUSES.length], 3.4, 'width');
  return k ? repaint(k, { wall: color, roof }) : makeHouse(color, roof, w, h);
}
// Kiosco: el puestito de siempre con la kiosquera y los exhibidores de Kenney adelante
function kKiosk() {
  const g = makeKiosk();
  const parts = [
    ['market/character-employee', 1.15, 'height', 0, 0, 1.15],
    ['market/display-fruit', 0.95, 'width', -1.45, 0, 0.75],
    ['market/display-bread', 0.95, 'width', 1.45, 0, 0.75],
  ];
  for (const [name, size, fit, x, y, z] of parts) { const o = kit(name, size, fit); if (o) { o.position.set(x, y, z); g.add(o); } }
  return g;
}

// ---------- Decorado de barrios ----------
function makeWarehouse() { // Docks de ladrillo de Puerto Madero
  const g = new THREE.Group();
  const brick = std({ color: '#a8492f' }), dark = std({ color: '#5a2418' }), win = std({ color: '#1b2a4a' });
  g.add(box(7, 3.6, 4, brick, 0, 1.8, 0));
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 4.1, 3), dark); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.position.set(-2.3 + i * 2.3, 3.6, 0); g.add(r); }
  for (let i = 0; i < 5; i++) g.add(box(0.7, 1.2, 0.05, win, -2.6 + i * 1.3, 2, 2.03));
  return shadowed(g);
}
function makeTower(h, color = '#7fb7d9') {
  const g = new THREE.Group();
  const glass = toy(color, { roughness: 0.1, metalness: 0.3, clearcoat: 1 });
  g.add(box(3.2, h, 3.2, glass, 0, h / 2, 0));
  for (let y = 1; y < h; y += 1.2) g.add(box(3.25, 0.08, 3.25, std({ color: '#e8eef2' }), 0, y, 0));
  g.add(box(2.4, 0.6, 2.4, std({ color: '#d8dde2' }), 0, h + 0.3, 0));
  return shadowed(g);
}
function makePuenteMujer() { // puente peatonal blanco con mástil inclinado
  const g = new THREE.Group();
  const white = toy('#f4f6f8');
  g.add(box(12, 0.35, 1.6, white, 0, 1.2, 0));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 9, 10), white);
  mast.position.set(-1, 4.6, 0); mast.rotation.z = -0.65; g.add(mast);
  const top = new THREE.Vector3(-1 + Math.sin(0.65) * 4.5, 4.6 + Math.cos(0.65) * 4.5, 0);
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Vector3(-0.5 + i * 1.0, 1.35, 0);
    const len = a.distanceTo(top);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 5), std({ color: '#cfd6dc' }));
    cable.position.copy(a).add(top).multiplyScalar(0.5);
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(a).normalize());
    g.add(cable);
  }
  for (const x of [-5.5, 5.5]) g.add(box(0.6, 1.2, 1.2, white, x, 0.6, 0));
  return shadowed(g);
}
function makePlanetario() {
  const g = new THREE.Group();
  const white = toy('#f1f1f1'), grey = std({ color: '#8a9099' });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 20), white); dome.position.y = 3.6; g.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.12, 8, 40), grey); ring.rotation.x = Math.PI / 2; ring.position.y = 3.3; g.add(ring);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const legM = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 3.4, 8), grey);
    legM.position.set(Math.cos(a) * 1.5, 1.6, Math.sin(a) * 1.5); legM.rotation.z = Math.cos(a) * 0.25; legM.rotation.x = -Math.sin(a) * 0.25;
    g.add(legM);
  }
  g.add(box(4.5, 0.4, 4.5, std({ color: '#c9c3b5' }), 0, 0.2, 0));
  return shadowed(g);
}
function makeStadium() { // estadio azul y amarillo
  const g = new THREE.Group();
  const blue = toy('#1f4fb5'), yellow = toy('#f2c230');
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(6, 5.4, 4, 32, 1, true), blue);
  shell.material.side = THREE.DoubleSide; shell.position.y = 2; g.add(shell);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(6.05, 6.05, 0.8, 32, 1, true), yellow); band.position.y = 3.2; g.add(band);
  const pitch = new THREE.Mesh(new THREE.CircleGeometry(5.3, 32), std({ color: '#3f9b46' })); pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.05; g.add(pitch);
  return shadowed(g);
}
function makeCafeTable(color) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 16), std({ color: '#f4f1e8' })));
  g.children[0].position.y = 0.75;
  const legM = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), std({ color: '#2a3340' })); legM.position.y = 0.375; g.add(legM);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), std({ color: '#2a3340' })); pole.position.y = 1.1; g.add(pole);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8), toy(color)); umb.position.y = 2.25; g.add(umb);
  return shadowed(g);
}
function makePiramide() {
  const g = new THREE.Group();
  const white = toy('#f4f1e8');
  g.add(box(1.6, 0.5, 1.6, std({ color: '#cfc6b0' }), 0, 0.25, 0));
  const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 3.2, 4), white); ob.rotation.y = Math.PI / 4; ob.position.y = 2.1; g.add(ob);
  const statue = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 4, 8), toy('#f4f1e8')); statue.position.y = 4.05; g.add(statue);
  return shadowed(g);
}
function makeBoat(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.4, 12, 1, false, 0, Math.PI), toy(color));
  hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2; hull.scale.set(1, 2.4, 1); g.add(hull);
  return shadowed(g);
}

// Cartel de cruce con flechas a cada barrio
function makeSignpost(node, board) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), std({ color: '#5a3a22' }));
  post.position.y = 1.3; g.add(post);
  node.options.forEach((o, i) => {
    const to = board.nodes[o.to];
    const ang = Math.atan2(-(to.z - node.z), to.x - node.x);
    const arm = new THREE.Group();
    arm.position.y = 2.25 - i * 0.55; arm.rotation.y = ang;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.08), toy(i ? '#74acdf' : '#f6b40e'));
    plank.position.x = 0.8; arm.add(plank);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 3), plank.material);
    tip.rotation.z = -Math.PI / 2; tip.position.x = 1.75; tip.rotation.x = Math.PI / 2; arm.add(tip);
    g.add(arm);
  });
  return shadowed(g);
}

function makeTorreMonumental() { // la torre del reloj de Retiro
  const g = new THREE.Group();
  const brick = std({ color: '#b5583c' }), white = std({ color: '#f1ead8' });
  g.add(box(2.4, 0.6, 2.4, white, 0, 0.3, 0));
  g.add(box(1.8, 7.5, 1.8, brick, 0, 4.2, 0));
  g.add(box(2.1, 0.3, 2.1, white, 0, 8.1, 0));
  for (let i = 0; i < 4; i++) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), white);
    face.position.set(Math.sin(i * Math.PI / 2) * 0.92, 7.2, Math.cos(i * Math.PI / 2) * 0.92); face.rotation.y = i * Math.PI / 2; g.add(face);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2, 4), std({ color: '#3f6b5a' })); roof.position.y = 9.25; roof.rotation.y = Math.PI / 4; g.add(roof);
  return shadowed(g);
}

// ---------- Decorado de Buenos Aires ----------
// Cuadrícula de 3 x 2 manzanas: esquinas en x = -24, -8, 8, 24 y z = -15, 0, 15
function decorBaires(group, anim, nodes) {
  const place = placer(group, nodes, null);
  const rand = rng(1810);
  // Piso: pasto grande
  const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 64), std({ map: tex.grass([60, 60]), roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.userData.grass = '#4f9a3a'; group.add(ground);

  // Río de la Plata y Puerto Madero, a la derecha: docks de ladrillo, el Puente de la Mujer y las torres
  const water = new THREE.Mesh(new THREE.PlaneGeometry(26, 140), toy('#3d86b8', { map: tex.water([6, 28]), roughness: 0.12, clearcoat: 1, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2; water.position.set(46, 0.03, 0); group.add(water); anim.water.push(water);
  group.add(flatPlane(1.6, 140, std({ color: '#cfc6b0' }), 32.6, 0.05, 0)); // costanera de piedra
  for (let z = -20; z <= 20; z += 6) { const w = makeWarehouse(); w.scale.setScalar(0.7); w.name = 'dock'; place(w, 30, z, 4.9, 2.8, -Math.PI / 2); }
  const puente = makePuenteMujer(); puente.position.set(40, 0, -3); group.add(puente);
  [[52, -18, 14], [55, -8, 18], [51, 4, 12], [56, 13, 20], [52, 24, 10]].forEach(([x, z, h], i) => { const t = makeTower(h, i % 2 ? '#7fb7d9' : '#9cc9e3'); t.position.set(x, 0, z); group.add(t); });
  const torre = makeTorreMonumental(); torre.name = 'Torre Monumental'; place(torre, 26.8, -20.6, 2.4, 2.4);

  // Palermo, arriba: lago con botes, árboles y el Rosedal
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 40), toy('#4a9ac9', { map: tex.water([3, 3]), roughness: 0.1, clearcoat: 1 }));
  lake.rotation.x = -Math.PI / 2; lake.scale.set(7, 3.4, 1); lake.position.set(-1, 0.04, -24.5); group.add(lake); anim.water.push(lake);
  ['#e14b3c', '#f2c230', '#2f86e0'].forEach((c, i) => { const b = makeBoat(c); b.position.set(-4 + i * 3, 0.15, -24.5 + (i - 1) * 1.2); b.userData.baseX = -1; group.add(b); anim.boats.push(b); });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; place.try(() => makeBench(), 11 + Math.cos(a) * 3.4, -25 + Math.sin(a) * 2.2, 1.6, 0.6, -a + Math.PI / 2); }
  const fl = new THREE.Mesh(new THREE.CircleGeometry(1, 32), std({ color: '#e88aa8' })); fl.rotation.x = -Math.PI / 2; fl.scale.set(2.4, 1.4, 1); fl.position.set(11, 0.03, -25); group.add(fl);
  const flag = makeFlag(); flag.name = 'bandera'; place(flag, -15, -21, 0.6, 0.6); anim.flags.push(flag.userData.flag);

  // Manzana de arriba al medio: el Planetario
  const plan = makePlanetario(); plan.scale.setScalar(0.85); plan.name = 'Planetario'; place(plan, 0, -7.5, 3.9, 3.9);
  for (const [x, z] of [[-4.2, -11.4], [4.2, -11.4], [-4.2, -3.6], [4.2, -3.6]]) place.try(() => kTree(Math.floor(rand() * 9), false), x, z, 1.6, 1.6, rand() * 6);
  // Manzana de arriba a la derecha: el Obelisco en la esquina de Corrientes y 9 de Julio, y torres
  const obePlaza = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32), std({ map: tex.baldosa([3, 3]) }));
  obePlaza.rotation.x = -Math.PI / 2; obePlaza.position.set(12, 0.03, -3.8); obePlaza.receiveShadow = true; group.add(obePlaza);
  const obe = makeObelisco(); obe.scale.setScalar(0.9); obe.name = 'Obelisco'; place(obe, 12, -3.8, 2.7, 2.7);
  cityBlock(place, 8, -15, 24, 0, rand, { maxH: 9 });
  // Manzana de arriba a la izquierda (Recoleta): edificios
  cityBlock(place, -24, -15, -8, 0, rand, { maxH: 8 });
  // Árboles en el patio de cada manzana con edificios
  for (const [cx, cz] of [[-16, -7.5], [16, -7.5]]) for (const [dx, dz] of [[-2.2, -1.2], [2.2, 1.2], [0, 0], [2.4, -1.4], [-2.4, 1.4]]) place.try(() => kTree(Math.floor(rand() * 9), false), cx + dx, cz + dz, 1.4, 1.4, rand() * 6);

  // San Telmo, abajo a la izquierda: plaza empedrada con fuente, mesitas con sombrilla y casas bajas
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(1, 40), std({ map: tex.cobble([4, 4]) }));
  plaza.rotation.x = -Math.PI / 2; plaza.scale.set(3.6, 3, 1); plaza.position.set(-16, 0.03, 7.5); plaza.receiveShadow = true; group.add(plaza);
  const fountain = makeFountain(); fountain.scale.setScalar(0.7); fountain.name = 'fuente'; place(fountain, -16, 7.5, 2.2, 2.2); anim.fountains.push(fountain);
  ['#e14b3c', '#2f86e0', '#2e9e48', '#f2c230'].forEach((c, i) => place.try(() => makeCafeTable(c), -18.6 + (i % 2) * 5.2, 5.6 + Math.floor(i / 2) * 3.8, 1, 1));
  cityBlock(place, -24, 0, -8, 15, rand, { maxH: 5, colors: ['#e9c9a0', '#d6a77a', '#f0dfc4', '#c98f6f', '#e2cfae'] });

  // Plaza de Mayo, abajo al medio: la Pirámide y la Casa Rosada de espaldas a la salida
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 8.4), std({ map: tex.baldosa([6, 5]) }));
  pm.rotation.x = -Math.PI / 2; pm.position.set(0, 0.03, 7.5); pm.receiveShadow = true; group.add(pm);
  const rosada = makeCasaRosada(); rosada.scale.setScalar(0.75); rosada.name = 'Casa Rosada'; place(rosada, 0, 10.6, 7.8, 2.6, Math.PI);
  const piramide = makePiramide(); piramide.scale.setScalar(0.8); piramide.name = 'Pirámide'; place(piramide, 0, 5.2, 1.4, 1.4);
  for (const [x, z, r] of [[-3.4, 5.2, Math.PI / 2], [3.4, 5.2, -Math.PI / 2]]) place.try(() => makeBench(), x, z, 1.6, 0.6, r);

  // La Boca, abajo a la derecha: las casitas de colores de Caminito alrededor de la manzana
  const colors = ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#ef8a17', '#b06ab3'];
  let i = 0;
  cityBlock(place, 8, 0, 24, 15, rand, { step: 3.5, depth: 3, colors, make: (w, h, d, c) => { const k = i++; return kHouse(k, c, colors[(k + 3) % 6], 3.2, 3 + (k % 3) * 0.6); } });

  // A la izquierda: la cancha y casas de barrio (Almagro y Boedo)
  const stadium = makeStadium(); stadium.scale.setScalar(0.75); stadium.name = 'cancha'; place(stadium, -38, -5, 9, 9);
  for (let z = -22; z <= 22; z += 3.8) place.try(() => kHouse(i++, ['#e8d5b5', '#d9c7a8', '#f0e2c6', '#cbb898'][i % 4], '#a8492f', 3.2, 3.4), -30.5, z, 3.4, 3, Math.PI / 2);

  // Árboles por todos lados, lejos de las calles
  for (let k = 0; k < 70; k++) {
    const x = -50 + rand() * 80, z = -32 + rand() * 60;
    if (x > -26 && x < 26 && z > -17 && z < 17) continue; // adentro de la cuadrícula ya hay manzanas
    place.try(() => { const t = kTree(k, k % 2); t.scale.setScalar(1 + (k % 3) * 0.15); return t; }, x, z, 2, 2, rand() * 6);
  }
}

const DECOR = { baires: decorBaires, mendoza: decorMendoza, costa: decorCosta, bariloche: decorBariloche, cordoba: decorCordoba, sur: decorSur, norte: decorNorte };

// ---------- Armado del tablero ----------
export function buildBoard3D(group, board) {
  // Todo el tablero va en su propio grupo (así podemos congelarlo sin tocar a los personajes)
  const parentGroup = group;
  group = new THREE.Group();
  parentGroup.add(group);
  const nodes = board.nodes;
  const T = board.terrain;
  const hAt = (x, z) => heightAt(T, x, z);
  const P = (id) => new THREE.Vector3(nodes[id].x, 0, nodes[id].z);
  // tick: funciones que mueven cosas propias de cada tablero (aerosillas, ballenas); live: lo que esas funciones mueven
  const anim = { water: [], fountains: [], flags: [], boats: [], spin: [], bob: [], tick: [], live: [] };

  (DECOR[board.key] || decorBaires)(group, anim, nodes, T);

  // ---------- Calles ----------
  // Cada tramo se arma por separado y después se junta todo en una sola pieza (mucho más liviano)
  const roadGeos = [], edgeGeos = [], jointGeos = [], jointRoadGeos = [];
  const Y = new THREE.Vector3(0, 1, 0);
  // En la montaña cada punto de la calle se apoya en el piso
  const placed = (geo, x, y, z, ang) => {
    const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationAxis(Y, ang)).setPosition(x, y, z);
    geo.applyMatrix4(m);
    if (T) { const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, y + hAt(pos.getX(i), pos.getZ(i))); }
    return geo;
  };
  const segs = (len) => (T ? Math.ceil(len / 0.7) : 1);
  const seen = new Set();
  for (const n of nodes) {
    for (const nx of n.next) {
      const key = n.id + '-' + nx; if (seen.has(key)) continue; seen.add(key);
      const a = P(n.id), b = P(nx);
      const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
      const ang = Math.atan2(b.x - a.x, b.z - a.z);
      edgeGeos.push(placed(new THREE.PlaneGeometry(2.3, len, 1, segs(len)), mid.x, 0.035, mid.z, ang));
      const road = new THREE.PlaneGeometry(1.8, len, 1, segs(len));
      const uv = road.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 2.2);
      roadGeos.push(placed(road, mid.x, 0.045, mid.z, ang));
    }
    jointGeos.push(placed(new THREE.CircleGeometry(1.15, 24), n.x, 0.036, n.z, 0));
    const jr = new THREE.CircleGeometry(0.9, 24);
    const uv = jr.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.8, uv.getY(i) * 0.8);
    jointRoadGeos.push(placed(jr, n.x, 0.046, n.z, 0));
  }
  const roadMat = std({ map: tex.cobble([1, 1]), roughness: 0.9 });
  const edgeMat = std({ color: '#d9cdb2', roughness: 0.85 });
  for (const [geos, mat] of [[edgeGeos, edgeMat], [jointGeos, edgeMat], [roadGeos, roadMat], [jointRoadGeos, roadMat]]) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.receiveShadow = true;
    group.add(m);
  }

  // ---------- Casillas ----------
  const bankLabels = [];
  const spaceMeshes = new Map();
  for (const n of nodes) {
    const s = makeSpace(n.type);
    s.position.set(n.x, n.y, n.z);
    group.add(s);
    spaceMeshes.set(n.id, s);
    // Hacia afuera del camino, para poner cosas al costado
    const nx = n.next[0] != null ? nodes[n.next[0]] : n;
    const dir = new THREE.Vector3(nx.x - n.x, 0, nx.z - n.z).normalize();
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    const beside = (o, d) => { const x = n.x + side.x * d, z = n.z + side.z * d; o.position.set(x, hAt(x, z), z); group.add(o); return o; };
    if (n.type === 'kiosco') { const k = beside(kKiosk(), 2.6); k.lookAt(n.x, k.position.y, n.z); }
    if (n.type === 'colectivo') beside(makeBusStop(), 1.9);
    if (n.type === 'banco') {
      const l = makeLabel('🏦 0', { size: 0.5, bg: '#fff6c4', border: '#7a5b08' }); l.position.set(n.x, n.y + 2.1, n.z); group.add(l); bankLabels.push(l);
    }
    if (n.type === 'cruce' && n.options) beside(makeSignpost(n, board), -1.6);
    if (n.type === 'azul' && n.id % 4 === 0) beside(makeFarol(), 1.9);
  }

  // Flechas grandes para elegir camino
  const choice = new THREE.Group(); group.add(choice);
  let choiceFor = null;
  function showChoices(nodeId) {
    if (nodeId === choiceFor) return;
    choiceFor = nodeId;
    while (choice.children.length) choice.remove(choice.children[0]);
    if (nodeId == null) return;
    const n = nodes[nodeId];
    (n.options || []).forEach((o, i) => {
      const to = nodes[o.to];
      const dir = new THREE.Vector3(to.x - n.x, 0, to.z - n.z).normalize();
      const a = makeArrow(i ? '#74acdf' : '#f6b40e');
      // Acostada en el piso y apuntando hacia la próxima casilla
      a.rotation.set(-Math.PI / 2, 0, 0);
      a.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.atan2(-dir.x, -dir.z));
      a.position.set(n.x + dir.x * 1.9, n.y + 0.9, n.z + dir.z * 1.9);
      a.scale.setScalar(0.9);
      a.userData.base = a.position.clone(); a.userData.dir = dir;
      choice.add(a);
      const l = makeLabel(o.label, { size: 0.5, bg: i ? '#d6ecff' : '#fff1c2' });
      l.position.set(n.x + dir.x * 3.4, n.y + 1.6, n.z + dir.z * 3.4);
      choice.add(l);
    });
  }

  // Pasto, flores, piedras y arbustos sueltos por el pasto (sin pisar caminos, agua ni edificios)
  scatterNature(group, nodes);

  // Lo que no se mueve no necesita recalcularse en cada cuadro
  const moving = new Set([...anim.boats, ...anim.water, ...anim.spin, ...anim.bob, ...anim.live, choice]);
  anim.fountains.forEach((f) => moving.add(f.userData.jet));
  group.traverse((o) => {
    if (o === group || moving.has(o)) return;
    let p = o; while (p && p !== group) { if (moving.has(p)) return; p = p.parent; }
    o.updateMatrix(); o.matrixAutoUpdate = false;
  });

  return {
    root: group,
    key: board.key,
    pos: (id) => new THREE.Vector3(nodes[id].x, nodes[id].y + 0.36, nodes[id].z),
    spaceMeshes,
    showChoices,
    setBank(amount) { for (const l of bankLabels) { if (l.userData.amount === amount) continue; l.userData.amount = amount; const nl = makeLabel('🏦 ' + amount, { size: 0.5, bg: '#fff6c4', border: '#7a5b08' }); l.material.map = nl.material.map; l.scale.copy(nl.scale); l.material.needsUpdate = true; } },
    update(dt, time) {
      for (const w of anim.water) { const m = w.material.map; if (m) { m.offset.y = time * 0.02; m.offset.x = Math.sin(time * 0.3) * 0.02; } }
      for (const f of anim.fountains) f.userData.jet.scale.y = 1 + Math.sin(time * 5) * 0.15;
      for (const fl of anim.flags) {
        const pos = fl.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin(x * 2.5 - time * 4) * 0.12 * (x + 1.2)); }
        pos.needsUpdate = true;
      }
      for (const o of anim.spin) o.rotation[o.userData.axis || 'y'] += dt * (o.userData.speed || 1);
      anim.bob.forEach((o, i) => { o.position.y = o.userData.baseY + Math.sin(time * (o.userData.speed || 1.5) + i) * (o.userData.amp || 0.1); });
      for (const f of anim.tick) f(dt, time);
      anim.boats.forEach((b, i) => { b.position.x = b.userData.baseX + Math.sin(time * 0.3 + i * 2) * 3.5; b.position.y = 0.15 + Math.sin(time * 2 + i) * 0.04; b.rotation.y = Math.cos(time * 0.3 + i * 2) > 0 ? 0 : Math.PI; });
      choice.children.forEach((c) => { if (c.userData.base) { const k = (Math.sin(time * 6) + 1) * 0.25; c.position.copy(c.userData.base).addScaledVector(c.userData.dir, k); } });
    },
  };
}
