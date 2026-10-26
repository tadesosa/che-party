// Decorado de los tableros nuevos: Bariloche, Córdoba, Sur (Ushuaia) y Norte (Salta y Jujuy).
// Usa el mismo acomodador que los otros (placer), que no deja poner nada encima de los caminos.
import * as THREE from 'three';
import { makeTree, makeFlag } from './models.js';
import { makeFountain, makeFarol, makeBench } from './props.js';
import { tex, uvBox } from './textures.js';
import { makeTerrain } from './terrain.js';
import { placer, rng, makeEdificio, makeAdobe } from './decor.js';
import { Builder, addBuilding, addRoof, chaletMontana } from './buildings.js';

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...opts });
const toy = (color, opts = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, ...opts });
function shadowed(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function box(w, h, d, material, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m; }
function ground(group, w, d, material, x = 0, z = 0, y = 0.01) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m;
}
function ellipse(group, rx, rz, material, x, z, y = 0.02) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), material);
  m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m;
}
const water = (rep, color = '#3d86b8') => toy(color, { map: tex.water(rep), roughness: 0.1, clearcoat: 1, metalness: 0.1 });

// ---------- Piezas compartidas ----------
function makePeak(r, h, { snow = 0.34, color = '#7d7064', snowColor = '#e3e9f0', seg = 7 } = {}) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg, 1), std({ color, flatShading: true })); rock.position.y = h / 2; g.add(rock);
  if (snow) { const cap = new THREE.Mesh(new THREE.ConeGeometry(r * snow, h * snow, seg, 1), std({ color: snowColor, flatShading: true })); cap.position.y = h - (h * snow) / 2 + 0.05; g.add(cap); }
  return shadowed(g);
}
// Pino (coníferas de la Patagonia y de la cordillera)
function makePine(h = 3.4, color = '#2f6b3a') {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 6), std({ color: '#6b4a2b' })); trunk.position.y = 0.4; g.add(trunk);
  const leaf = std({ color, flatShading: true }); leaf.userData.foliage = true;
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.1 - i * 0.28, h * 0.42, 7), leaf); c.position.y = 0.8 + i * h * 0.24 + h * 0.18; g.add(c); }
  return shadowed(g);
}
function makeSnowPine(h = 3.4) {
  const g = makePine(h, '#2b5a36');
  const snow = std({ color: '#ffffff', flatShading: true }); snow.userData.foliage = true;
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.1 - i * 0.28) * 0.55, h * 0.16, 7), snow); c.position.y = 0.8 + i * h * 0.24 + h * 0.32; g.add(c); }
  return g;
}
// Chalet de madera y piedra (Bariloche, Ushuaia)
// style: 'troncos' (Bariloche), 'chapa' (las casitas de colores de Ushuaia) o 'madera'
function makeChalet(wall = '#8a5a3a', roof = '#2f4f3a', w = 3, h = 2.4, style = 'troncos', ground) {
  const g = new THREE.Group();
  g.add(chaletMontana(wall, roof, w, h, { style, ground }));
  return g;
}
function makeBoatSimple(color = '#ffffff', len = 3) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, len * 0.35), toy(color)); hull.position.y = 0.2; g.add(hull);
  g.add(box(len * 0.45, 0.6, len * 0.28, toy('#e8eef2'), -len * 0.1, 0.7, 0));
  g.add(box(len * 0.46, 0.08, len * 0.29, toy('#d63a2f'), -len * 0.1, 1.03, 0));
  return shadowed(g);
}
function sign(text, { w = 6, h = 1.4, bg = '#1b2a4a', fg = '#ffffff' } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg; x.font = `bold ${Math.round(c.height * 0.55)}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [std({ color: bg }), std({ color: bg }), std({ color: bg }), std({ color: bg }), new THREE.MeshStandardMaterial({ map: t }), std({ color: bg })]);
  board.position.y = h / 2 + 1.2; g.add(board);
  for (const sx of [-1, 1]) g.add(box(0.14, 1.3, 0.14, std({ color: '#5a3a22' }), sx * (w / 2 - 0.4), 0.6, 0));
  return shadowed(g);
}
function labelSprite(text, scale = 12) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const x = c.getContext('2d');
  x.font = 'bold 56px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 10; x.strokeStyle = '#1b2a4a'; x.strokeText(text, 256, 50);
  x.fillStyle = '#ffffff'; x.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  sp.scale.set(scale, scale * 0.19, 1);
  return sp;
}
// Reparte cosas al azar en un área; skip(x, z) dice dónde no (agua, plazas)
function scatter(place, rand, n, make, area, size = 1.8, skip = null) {
  const [x0, x1, z0, z1] = area;
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0), ry = rand() * 6.3;
    if (skip && skip(x, z)) continue;
    place.try(() => make(i), x, z, size, size, ry);
  }
}
const inEllipse = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 < 1;

// ---------- Bariloche ----------
const clockMat = std({ color: '#f4f1e8' }), handMat = std({ color: '#1b1b1b' });
function makeCivicTower() { // la torre del reloj del Centro Cívico, de piedra y madera
  const g = new THREE.Group();
  const B = new Builder(), white = [1, 1, 1];
  B.box(0, 3, 0, 2.2, 6, 2.2, { side: 'piedra', top: 'piedra' }, B.color('#e6e0d6'), 1.1);
  B.box(0, 6.6, 0, 2.5, 1.2, 2.5, { side: 'troncos', top: 'madera' }, B.color('#8a5a3a'), 0.9);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, n = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), along = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    for (const y of [1.6, 3.6]) B.rect(n.clone().multiplyScalar(1.12).addScaledVector(along, -0.25).setY(y), along.clone().multiplyScalar(0.5), new THREE.Vector3(0, 1, 0), 'ventanaLuz', white);
  }
  addRoof(B, 'hip', 0, 7.2, 0, 2.5, 2.5, 2.4, 0.3, 'chapa', B.color('#3f6b4a'));
  g.add(B.mesh());
  const fGeo = new THREE.CircleGeometry(0.45, 18);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(fGeo, clockMat); f.position.set(Math.sin(i * Math.PI / 2) * 1.27, 6.6, Math.cos(i * Math.PI / 2) * 1.27); f.rotation.y = i * Math.PI / 2; g.add(f);
    const hnd = box(0.05, 0.32, 0.02, handMat, 0, 0.1, 0.01); f.add(hnd);
  }
  return shadowed(g);
}
function makeStBernard() {
  const g = new THREE.Group();
  const white = toy('#f4efe6'), brown = toy('#9a5a2a');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 6, 10), white); body.rotation.z = Math.PI / 2; body.position.y = 0.75; g.add(body);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), brown); spot.scale.set(1.2, 0.8, 1.02); spot.position.set(0.05, 0.85, 0); g.add(spot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), brown); head.position.set(0.75, 1.1, 0); g.add(head);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10), toy('#7a4a2b')); barrel.rotation.x = Math.PI / 2; barrel.position.set(0.55, 0.75, 0); g.add(barrel);
  for (const [x, z] of [[-0.35, 0.18], [-0.35, -0.18], [0.35, 0.18], [0.35, -0.18]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6), white); l.position.set(x, 0.25, z); g.add(l); }
  return shadowed(g);
}
function makeChocoShop(color) { // chocolatería de troncos con vidriera y toldo
  const g = makeChalet('#8a5a3a', '#5a2a18', 2.8, 2.6, 'troncos', 'chocolates');
  const awn = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.6), toy(color)); awn.position.set(0, 2.38, 1.42); awn.rotation.x = 0.35; g.add(awn);
  return shadowed(g);
}
function makeSnowman() {
  const g = new THREE.Group();
  const snow = std({ color: '#ffffff' });
  for (const [r, y] of [[0.5, 0.45], [0.36, 1.12], [0.26, 1.6]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), snow); s.position.y = y; g.add(s); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 6), std({ color: '#ef8a17' })); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.6, 0.3); g.add(nose);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 10), std({ color: '#1b1b1b' })); hat.position.y = 1.9; g.add(hat);
  return shadowed(g);
}
function makeLlaoLlao() { // el hotel: gran chalet de madera sobre piedra, con techo verde y su torre
  const g = new THREE.Group();
  const B = new Builder();
  const o = { wall: 'madera', tint: '#e6d6b8', groundCell: 'piedra', groundTint: '#ffffff', win: 'ventanaLuz', trim: '#5a3a22', roofCell: 'chapa', roofTint: '#3f6b4a', winW: 0.55 };
  addBuilding(B, { ...o, w: 10, d: 4, h: 3.2, floorH: 1.6, bay: 1.25, ground: 'puertaRustica', groundBack: true, roof: 'gable', rise: 2, over: 0.35, cornice: false });
  addBuilding(B, { ...o, w: 2.4, d: 2.4, h: 6, x: 3.5, z: 0.6, floorH: 1.5, bay: 1.2, roof: 'hip', rise: 2.6, over: 0.25, cornice: true });
  g.add(B.mesh());
  return shadowed(g);
}

export function decorBariloche(group, anim, nodes, terrain) {
  const place = placer(group, nodes, terrain);
  const rand = rng(5140);
  ground(group, 280, 280, std({ map: tex.grass([60, 60]), color: '#cfe8c8' })).userData.grass = '#4f9a4a';
  const mountain = makeTerrain(terrain, std({ map: tex.grass([30, 18]), color: '#b9cdb3', roughness: 0.95 }), { x: 0, z: -42, w: 120, d: 70 });
  mountain.userData.grass = '#4f9a4a';
  group.add(mountain);
  const top = place.h(0, -40);
  ellipse(group, 30, 12, std({ color: '#dbe2ea', roughness: 1 }), 0, -44, top + 0.03);
  [[-26, -60, 14, 26], [-4, -66, 12, 22], [16, -60, 13, 24], [36, -52, 10, 16], [-42, -48, 11, 18], [-50, -24, 12, 18], [50, -26, 11, 16], [6, -56, 9, 14]]
    .forEach(([x, z, r, h]) => { const m = makePeak(r, h, { color: '#6f6a64', snow: 0.42 }); m.position.set(x, place.h(x, z) - 0.5, z); group.add(m); });
  const lbl = labelSprite('Cerro Catedral', 14); lbl.position.set(-4, top + 26, -66); group.add(lbl);

  // El lago Nahuel Huapi adentro de la vuelta, con la Isla Victoria y catamaranes
  const lake = ellipse(group, 16.5, 7.2, water([10, 5]), 0, -0.3, 0.04);
  anim.water.push(lake);
  ellipse(group, 17.4, 7.9, std({ map: tex.sand([6, 3]), color: '#c9b892' }), 0, -0.3, 0.03);
  ellipse(group, 3.2, 1.6, std({ map: tex.grass([2, 1]), color: '#a8d39a' }), -5, 0.2, 0.06);
  for (const [x, z] of [[-6.2, 0.2], [-4.6, -0.3], [-3.5, 0.8], [-5.6, 1.1]]) { const t = makePine(2.2); t.position.set(x, 0.06, z); group.add(t); }
  [[6, 2.6, 0.5], [-11, -3, 2.4], [9, -3.4, 1.4]].forEach(([x, z, r], i) => {
    const b = makeBoatSimple(i % 2 ? '#ffffff' : '#2f86e0', 2.6); b.position.set(x, 0.05, z); b.rotation.y = r;
    b.userData = { baseY: 0.05, speed: 1.2 + i * 0.3, amp: 0.05 }; anim.bob.push(b); group.add(b);
  });

  // Centro Cívico: torre, edificios de piedra y madera y el perro San Bernardo con su barrilito
  const tower = makeCivicTower(); tower.name = 'torre del Centro Cívico'; place(tower, -15.5, 18, 2.6, 2.6);
  for (const x of [-9, -4.5, 0, 4.5, 9]) place.try(() => makeChalet(['#8a5a3a', '#9a6a44', '#7a4a2b'][Math.floor(rand() * 3)], '#2f4f3a', 3.6, 2.6), x, 18.2, 3.8, 3, Math.PI);
  const perro = makeStBernard(); perro.name = 'San Bernardo'; place(perro, 3, 9.6, 1.6, 1);
  const flag = makeFlag(); flag.name = 'bandera'; place(flag, -2.5, 9.6, 0.6, 0.6); anim.flags.push(flag.userData.flag);
  // Chocolaterías de la calle Mitre
  ['#e14b3c', '#f2c230', '#2f86e0', '#ef8a17', '#b06ab3'].forEach((c, i) => place.try(() => makeChocoShop(c), 27, 13 - i * 4.2, 3, 3, -Math.PI / 2));
  // El Llao Llao y Colonia Suiza
  const llao = makeLlaoLlao(); llao.scale.setScalar(0.8); llao.name = 'Llao Llao'; place(llao, -42, 2, 8.5, 4, Math.PI / 2);
  for (const [x, z] of [[-27, 1], [-28.5, 6], [-24.5, 7.5]]) place.try(() => makeChalet('#b5876a', '#7a3a2a', 2.8, 2.4), x, z, 3, 2.6, Math.PI / 2);

  // Aerosilla: postes y sillitas que suben y bajan por el Catedral
  const liftA = new THREE.Vector3(29, place.h(29, -14), -14), liftB = new THREE.Vector3(10, place.h(10, -40) , -40);
  const metal = std({ color: '#5d6670', metalness: 0.5, roughness: 0.4 });
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const p = liftA.clone().lerp(liftB, i / N);
    const pole = box(0.25, 4.5, 0.25, metal, p.x, p.y + 2.25, p.z); pole.castShadow = true; group.add(pole);
    group.add(box(1.8, 0.15, 0.2, metal, p.x, p.y + 4.4, p.z));
  }
  const cableLen = liftA.distanceTo(liftB);
  for (const dx of [-0.8, 0.8]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, cableLen, 5), std({ color: '#2a2a2a' }));
    c.position.copy(liftA).lerp(liftB, 0.5); c.position.y += 4.4; c.position.x += dx;
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), liftB.clone().sub(liftA).normalize()); group.add(c);
  }
  const chairs = [];
  for (let i = 0; i < 10; i++) {
    const ch = new THREE.Group();
    ch.add(box(0.05, 0.9, 0.05, metal, 0, -0.45, 0));
    ch.add(box(0.7, 0.1, 0.5, toy(['#e14b3c', '#f2c230', '#2f86e0'][i % 3]), 0, -0.9, 0));
    ch.add(box(0.7, 0.45, 0.08, toy(['#e14b3c', '#f2c230', '#2f86e0'][i % 3]), 0, -0.7, -0.22));
    group.add(ch); chairs.push(ch); anim.live.push(ch);
  }
  anim.tick.push((dt, time) => chairs.forEach((ch, i) => {
    const u = ((time * 0.025 + i / chairs.length) % 1), up = i % 2 === 0;
    const p = liftA.clone().lerp(liftB, up ? u : 1 - u);
    ch.position.set(p.x + (up ? -0.8 : 0.8), p.y + 4.4, p.z);
  }));

  // Muñecos de nieve y pinos con nieve en la montaña; pinos verdes abajo
  for (const [x, z] of [[2, -31], [-12, -30], [14, -31]]) place.try(makeSnowman, x, z, 1.2, 1.2);
  scatter(place, rand, 60, (i) => { const t = makeSnowPine(3 + (i % 3) * 0.5); return t; }, [-34, 34, -40, -14], 1.8);
  scatter(place, rand, 70, (i) => makePine(3 + (i % 3) * 0.6), [-50, 50, -14, 24], 1.8, (x, z) => inEllipse(x, z, 0, -0.3, 19, 9));
}

// ---------- Córdoba ----------
function makeSierra(r, h, color = '#6f9a4a') { // cerro redondeado y verde
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std({ color, flatShading: true }));
  m.scale.y = h / r; g.add(m);
  return shadowed(g);
}
function makeCucu() { // el reloj cucú de Carlos Paz
  const g = new THREE.Group();
  const B = new Builder();
  addBuilding(B, { w: 3, d: 2, h: 4, wall: 'madera', tint: '#9a6236', floorH: 4, sides: 'none', base: false, belt: false, cornice: false, roof: 'gableZ', roofCell: 'tejuela', roofTint: '#6b3420', rise: 1.4, over: 0.3 });
  g.add(B.mesh());
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), std({ color: '#fff6dc' })); face.position.set(0, 2.6, 1.02); g.add(face);
  const hand1 = box(0.08, 0.7, 0.03, std({ color: '#1b1b1b' }), 0, 2.9, 1.04); g.add(hand1);
  const bird = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), toy('#f2c230')); bird.position.set(0, 4.1, 1.15); g.add(bird);
  g.add(box(0.6, 0.6, 0.05, std({ color: '#2a1608' }), 0, 4.1, 1.02));
  return shadowed(g);
}
// Cabildo colonial: arcada abajo, balcones arriba y la torre en el medio
function makeCabildo({ w = 10, d = 3, h = 3.2, tint = '#f4efe2', roof = 'flat' } = {}) {
  const g = new THREE.Group();
  const B = new Builder();
  addBuilding(B, { w, d, h, wall: 'revoque', tint, floorH: h / 2, bay: 1.4, ground: ['arco'], groundBack: true, win: 'ventanaBalcon', balcony: 0.85, trim: '#c9a07a', roof, roofCell: 'tejas', roofTint: '#b5583c', rise: 1.1, over: 0.3, winW: 0.42 });
  addBuilding(B, { w: 1.6, d: 1.6, h: 2, y: h + (roof === 'flat' ? 0.27 : 0), wall: 'revoque', tint, floorH: 2, bay: 1.6, win: 'arco', trim: '#c9a07a', base: false, belt: false, sill: false, roof: 'hip', roofCell: 'tejas', roofTint: '#b5583c', rise: 0.9, winW: 0.6, winH: 0.7 });
  g.add(B.mesh());
  return shadowed(g);
}
const DOME = toy('#e8e2d2'), CROSS = std({ color: '#3a3a3a' });
function makeChurch(color = '#f1ead8', domes = true) { // iglesia colonial / jesuítica
  const g = new THREE.Group();
  const B = new Builder();
  const o = { wall: 'revoque', tint: color, trim: '#e9dfc8', jitter: 0.06 };
  addBuilding(B, { ...o, w: 4, d: 7, h: 3.4, floorH: 3.4, bay: 4 / 3, win: 'ventanaArco', ground: ['ventanaArco', 'puertaIglesia', 'ventanaArco'], doorW: 1.1, winW: 0.38, winH: 0.5, roof: 'gableZ', roofCell: 'tejas', roofTint: '#b5583c', rise: 1.6, over: 0.25, sill: false });
  for (const sx of [-1, 1]) {
    addBuilding(B, { ...o, w: 1.3, d: 1.3, h: 4.2, x: sx * 1.6, z: 3.2, floorH: 1.4, bay: 1.3, win: 'ventanaArco', winW: 0.32, winH: 0.5, roof: 'none', cornice: true, sill: false });
    addBuilding(B, { ...o, w: 1.3, d: 1.3, h: 1.4, x: sx * 1.6, z: 3.2, y: 4.32, floorH: 1.4, bay: 1.3, win: 'arco', winW: 0.7, winH: 0.8, base: false, belt: false, sill: false, roof: domes ? 'none' : 'hip', roofCell: 'tejas', roofTint: '#b5583c', rise: 0.9, cornice: true });
    if (domes) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), DOME); d.position.set(sx * 1.6, 5.84, 3.2); g.add(d); }
  }
  g.add(B.mesh());
  g.add(box(0.1, 0.7, 0.1, CROSS, 0, 5.4, 3.55), box(0.42, 0.1, 0.1, CROSS, 0, 5.5, 3.55));
  return shadowed(g);
}
function makeUfo() {
  const g = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({ color: '#b8c4d0', metalness: 0.8, roughness: 0.25, clearcoat: 1 });
  const disc = new THREE.Mesh(new THREE.SphereGeometry(2.2, 28, 12), metal); disc.scale.y = 0.25; g.add(disc);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#7dffb0', transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1 }));
  dome.position.y = 0.25; g.add(dome);
  for (let i = 0; i < 10; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffe680' : '#7dffb0' })); const a = (i / 10) * Math.PI * 2; l.position.set(Math.cos(a) * 1.9, -0.05, Math.sin(a) * 1.9); g.add(l); }
  return g;
}
function makeFernet() { // un vaso gigante de fernet con coca, cordobés como pocos
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.8, 3, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide }));
  glass.position.y = 1.5; g.add(glass);
  const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.78, 2.4, 24), toy('#2a140a')); drink.position.y = 1.25; g.add(drink);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.92, 0.35, 24), toy('#c9a27a')); foam.position.y = 2.6; g.add(foam);
  return shadowed(g);
}

export function decorCordoba(group, anim, nodes) {
  const place = placer(group, nodes, null);
  const rand = rng(3500);
  ground(group, 280, 280, std({ map: tex.grass([60, 60]), color: '#e6efc9' })).userData.grass = '#6a9a3e';
  // Las Sierras al fondo y a los costados, con el Uritorco más alto (y un ovni dando vueltas)
  [[-30, -50, 14, 9], [-8, -56, 16, 11], [18, -52, 15, 10], [40, -42, 12, 8], [-48, -30, 12, 8], [52, -20, 10, 7], [-52, 0, 10, 6], [54, 6, 9, 6]]
    .forEach(([x, z, r, h], i) => { const s = makeSierra(r, h, ['#4f7a32', '#5a8a3a', '#466e2c'][i % 3]); s.position.set(x, 0, z); group.add(s); });
  const uri = makePeak(11, 17, { color: '#6b5a3a', snow: 0, seg: 9 }); uri.position.set(2, 0, -42); group.add(uri);
  const lbl = labelSprite('Cerro Uritorco', 13); lbl.position.set(2, 21, -42); group.add(lbl);
  const ufo = makeUfo(); ufo.position.set(2, 22, -42); group.add(ufo); anim.live.push(ufo);
  const ufo2 = makeUfo(); ufo2.scale.setScalar(0.6); group.add(ufo2); anim.live.push(ufo2);
  anim.tick.push((dt, time) => {
    ufo.position.set(2 + Math.sin(time * 0.4) * 10, 24 + Math.sin(time * 1.3) * 1.2, -40 + Math.cos(time * 0.4) * 5); ufo.rotation.y += dt * 2;
    ufo2.position.set(-20 + Math.cos(time * 0.3) * 14, 14 + Math.sin(time * 2) * 0.8, -34 + Math.sin(time * 0.3) * 4); ufo2.rotation.y -= dt * 3;
  });
  // Sierritas bajas entre los caminos
  for (const [x, z, r] of [[4, -18, 4], [-26, -6, 3.5], [10, 3, 3], [-6, 3, 3.5]]) place.try(() => makeSierra(r, r * 0.55, '#5f8f3c'), x, z, r * 2, r * 2);

  // Villa Carlos Paz: el Lago San Roque y el reloj cucú
  const lake = ellipse(group, 4.6, 6, water([3, 4]), 26.5, -12.5, 0.04); anim.water.push(lake);
  ellipse(group, 5.2, 6.6, std({ map: tex.sand([3, 3]), color: '#cbb892' }), 26.5, -12.5, 0.03);
  [[25.5, -10, 0.5], [27.5, -15, 2]].forEach(([x, z, r], i) => { const b = makeBoatSimple(i ? '#f2c230' : '#ffffff', 1.8); b.position.set(x, 0.05, z); b.rotation.y = r; b.userData = { baseY: 0.05, speed: 1.4, amp: 0.05 }; anim.bob.push(b); group.add(b); });
  const cucu = makeCucu(); cucu.name = 'reloj cucú'; place(cucu, 37.5, -2, 3.2, 2.4, -Math.PI / 2);

  // El centro: Cabildo, Catedral y la plaza
  const cab = makeCabildo({ w: 10, d: 3, h: 3.2 }); cab.scale.setScalar(0.85); cab.name = 'Cabildo'; place(cab, -1, 19, 9, 3, Math.PI);
  const cat = makeChurch('#efe2c4'); cat.scale.setScalar(0.85); cat.name = 'Catedral'; place(cat, 11.5, 19.5, 4, 6.5, Math.PI);
  ellipse(group, 5, 2.6, std({ map: tex.baldosa([4, 2]) }), 0, 9.6, 0.03);
  const fuente = makeFountain(); fuente.scale.setScalar(0.6); fuente.name = 'fuente'; place(fuente, 0, 9.6, 1.8, 1.8); anim.fountains.push(fuente);
  const flag = makeFlag(); flag.name = 'bandera'; place(flag, -4, 9.6, 0.6, 0.6); anim.flags.push(flag.userData.flag);
  // La Cañada con sus edificios, y barrios
  for (let i = 0; i < 4; i++) place.try(() => makeEdificio(2.5, 4 + rand() * 3, 2.5, ['#e8dcc4', '#d9c7a8', '#cdb9a0'][i % 3]), 2 + i * 3.2, -1, 2.5, 2.5, Math.PI);
  // Estancia jesuítica y el vaso de fernet gigante en Alta Gracia
  const est = makeChurch('#f4efe2', false); est.name = 'estancia jesuítica'; place(est, -41, -6, 4.2, 7.2, Math.PI / 2);
  const fer = makeFernet(); fer.name = 'fernet'; place(fer, -26, 3, 2.2, 2.2);
  const s1 = sign('FERNET CON COCA', { w: 5, h: 1, bg: '#2a140a' }); s1.name = 'cartel fernet'; place(s1, -26, 6.3, 5, 0.5);
  // Algarrobos y espinillos
  scatter(place, rand, 80, (i) => { const t = makeTree(false); t.scale.setScalar(0.8 + (i % 3) * 0.15); return t; }, [-50, 50, -34, 24], 2, (x, z) => inEllipse(x, z, 26.5, -12.5, 6, 7.5) || inEllipse(x, z, 0, 9.6, 6, 3.5));
}

// ---------- Sur (Ushuaia) ----------
function makePenguin() {
  const g = new THREE.Group();
  const black = toy('#1b1d24'), white = toy('#ffffff');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.38, 6, 10), black); body.position.y = 0.42; g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), white); belly.scale.set(0.9, 1.4, 0.6); belly.position.set(0, 0.4, 0.12); g.add(belly);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), toy('#f2a230')); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.68, 0.22); g.add(beak);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.14), black); w.position.set(sx * 0.24, 0.42, 0); w.rotation.z = sx * 0.3; g.add(w); }
  return shadowed(g);
}
function makeWhaleTail() {
  const g = new THREE.Group();
  const m = toy('#2d3a4a');
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 1.6, 10), m); stem.position.y = 0.8; g.add(stem);
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.6), m); f.position.set(sx * 0.65, 1.65, 0); f.rotation.z = sx * 0.35; g.add(f); }
  return g;
}
function makeLesEclaireurs() { // el faro rojo y blanco sobre una roca en el canal
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 0), std({ color: '#5d5750', flatShading: true })); rock.scale.set(1.3, 0.5, 1.1); g.add(rock);
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 1.4, 14), toy(i % 2 ? '#ffffff' : '#c8202c')); s.position.y = 1.4 + i * 1.4; g.add(s); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 12), new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: '#ffe680', emissiveIntensity: 1.2 })); lamp.position.y = 6.8; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.7, 12), toy('#1b1b1b')); cap.position.y = 7.5; g.add(cap);
  return shadowed(g);
}
function makeIceWall(len, h) { // el frente del glaciar: bloques de hielo celestes
  const g = new THREE.Group();
  const r = rng(77);
  for (let i = 0; i < len; i += 1.4) {
    const bh = h * (0.7 + r() * 0.5);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, bh, 2.2 + r()), toy(r() < 0.5 ? '#bfe6ff' : '#e6f6ff', { roughness: 0.2, clearcoat: 1, flatShading: true }));
    b.position.set((r() - 0.5) * 0.8, bh / 2, i - len / 2); b.rotation.y = (r() - 0.5) * 0.3; g.add(b);
  }
  return shadowed(g);
}
function makeTrain() { // el Tren del Fin del Mundo: locomotora a vapor verde y dos vagones
  const g = new THREE.Group();
  const green = toy('#2f5a3a'), red = toy('#8a2a20'), black = std({ color: '#1b1b1b' });
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 14), green); boiler.rotation.z = Math.PI / 2; boiler.position.set(0, 0.9, 0); g.add(boiler);
  g.add(box(1, 1.3, 1.1, green, -1.3, 1, 0));
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.6, 10), black); chim.position.set(0.7, 1.6, 0); g.add(chim);
  for (let i = 0; i < 2; i++) g.add(box(2.2, 1.2, 1.1, red, -3.2 - i * 2.4, 1, 0));
  for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), black); w.rotation.x = Math.PI / 2; w.position.set(0.6 - i * 1.4, 0.3, 0.6); g.add(w); const w2 = w.clone(); w2.position.z = -0.6; g.add(w2); }
  return shadowed(g);
}

export function decorSur(group, anim, nodes) {
  const place = placer(group, nodes, null);
  const rand = rng(5410);
  // El mar (Canal Beagle) por debajo de todo; la tierra llega hasta x = 29 y z = 16.5
  const sea = ground(group, 300, 300, water([50, 50], '#2a6f9a'), 0, 0, -0.3); anim.water.push(sea);
  ground(group, 200, 160, std({ map: tex.dryGrass([44, 36]), color: '#cfe3b5' }), -71, -63.5).userData.grass = '#6f8f4a';
  ground(group, 4, 160, std({ map: tex.sand([1, 30]), color: '#b5a88a' }), 30.6, -63.5, 0.005);
  ground(group, 200, 3, std({ map: tex.sand([30, 1]), color: '#b5a88a' }), -71, 17.8, 0.005);
  // La pingüinera: una península de piedra y nieve
  ellipse(group, 7.6, 11.6, std({ color: '#c9c3b5', flatShading: true }), 34.5, -11.5, 0.012).userData.grass = '#6f8f4a';
  for (let i = 0; i < 26; i++) {
    const p = makePenguin(); p.scale.setScalar(1.6); const a = rand() * 6.3, r = rand();
    const x = 34.5 + Math.cos(a) * 6.4 * r, z = -11.5 + Math.sin(a) * 10.5 * r;
    if (place.try(() => p, x, z, 0.5, 0.5, rand() * 6.3)) { p.userData = { baseY: p.position.y, speed: 3 + rand() * 3, amp: 0.05 }; anim.bob.push(p); }
  }
  // Faro Les Eclaireurs, barcos y ballenas
  const faro = makeLesEclaireurs(); faro.position.set(44, -0.3, 6); group.add(faro);
  const crucero = makeBoatSimple('#ffffff', 8); crucero.position.set(10, -0.25, 23); crucero.rotation.y = 0.1; crucero.userData = { baseY: -0.25, speed: 0.8, amp: 0.08 }; anim.bob.push(crucero); group.add(crucero);
  for (const [x, z] of [[-6, 21], [-14, 20.5]]) { const b = makeBoatSimple('#e14b3c', 2.4); b.position.set(x, -0.25, z); b.userData = { baseY: -0.25, speed: 1.5, amp: 0.06 }; anim.bob.push(b); group.add(b); }
  const tails = [[46, -14], [40, 22], [-30, 26]].map(([x, z], i) => { const t = makeWhaleTail(); t.position.set(x, -2, z); t.userData.phase = i * 2.1; group.add(t); anim.live.push(t); return t; });
  anim.tick.push((dt, time) => tails.forEach((t) => { const s = Math.sin(time * 0.6 + t.userData.phase); t.position.y = s > 0.6 ? -2 + (s - 0.6) * 5 : -2; t.rotation.x = Math.sin(time * 1.2 + t.userData.phase) * 0.15; }));
  // Muelle del puerto
  const wood = std({ map: tex.wood([2, 6]), color: '#a8845a' });
  group.add(box(3, 0.3, 7, wood, 0, -0.1, 20));
  // Cerro Martial y la cordillera nevada al fondo
  [[-34, -54, 13, 20], [-8, -56, 15, 24], [16, -52, 13, 19], [36, -46, 10, 15], [-58, -36, 11, 16], [-58, -10, 10, 13]]
    .forEach(([x, z, r, h]) => { const m = makePeak(r, h, { color: '#5d6168', snow: 0.5 }); m.position.set(x, 0, z); group.add(m); });
  const lbl = labelSprite('Cerro Martial', 13); lbl.position.set(-8, 28, -54); group.add(lbl);
  // El Glaciar: una pared de hielo con un lago helado y témpanos
  const lagoG = ground(group, 30, 9, water([8, 3], '#5aa8c8'), -36, -30, 0.03); anim.water.push(lagoG);
  const wall = makeIceWall(32, 7); wall.rotation.y = Math.PI / 2; wall.position.set(-36, 0, -36); group.add(wall);
  for (let i = 0; i < 9; i++) { const ice = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rand() * 0.6, 0), toy('#dff3ff', { flatShading: true })); ice.position.set(-36 + (rand() - 0.5) * 26, 0.1, -30 + (rand() - 0.5) * 6); ice.userData = { baseY: 0.1, speed: 1 + rand(), amp: 0.06 }; anim.bob.push(ice); group.add(ice); }
  const lblG = labelSprite('Glaciar Perito Moreno', 13); lblG.position.set(-36, 11, -36); group.add(lblG);
  // Ushuaia: casitas de colores, el cartel del Fin del Mundo y el trencito
  const colors = ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#ef8a17', '#b06ab3', '#e8e2d2'];
  for (let x = -16; x <= 20; x += 3.6) for (const z of [-15, -10.5, -6, -1.5, 3, 7.5]) {
    if (rand() < 0.5) continue;
    const c = colors[Math.floor(rand() * colors.length)];
    place.try(() => makeChalet(c, ['#5e6b7a', '#7a3a2a', '#2f4f3a'][Math.floor(rand() * 3)], 2.6, 2.2, 'chapa'), x + (rand() - 0.5), z + (rand() - 0.5), 2.8, 2.4, rand() < 0.5 ? 0 : Math.PI);
  }
  const fin = sign('USHUAIA · FIN DEL MUNDO', { w: 8, h: 1.3, bg: '#1b2a4a' }); fin.name = 'cartel fin del mundo'; place(fin, -2, 9.4, 8, 0.5);
  const train = makeTrain(); train.name = 'tren'; place(train, 22.2, -11, 1.4, 8, Math.PI / 2);
  // Lengas (árboles torcidos por el viento) y pinos
  scatter(place, rand, 70, (i) => { const t = i % 3 ? makePine(3 + (i % 2), '#3a5a32') : makeTree(false); t.rotation.z = 0.12; return t; }, [-38, 28, -34, 16], 2);
}

// ---------- Norte (Salta y Jujuy) ----------
function makeSevenColors(r, h) { // el Cerro de los Siete Colores: franjas de colores inclinadas
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  const bands = ['#b5523b', '#d98a4a', '#e8c47a', '#8a9a5a', '#c76a8a', '#7a5a8a', '#d9b48a', '#a8492f', '#e0a06a'];
  for (let i = 0; i < 16; i++) { x.fillStyle = bands[i % bands.length]; x.fillRect(0, i * 16, 64, 16); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9, 1), std({ map: t, flatShading: true })); m.position.y = h / 2; m.rotation.z = 0.08; g.add(m);
  return shadowed(g);
}
function makeCardon(h = 2.6) { // cardón (cactus grande)
  const g = new THREE.Group();
  const green = std({ color: '#4f7a3a', flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, h, 4, 8), green); trunk.position.y = h / 2 + 0.2; g.add(trunk);
  for (const [sx, y, l] of [[-1, h * 0.45, h * 0.35], [1, h * 0.6, h * 0.28]]) {
    const out = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.35, 4, 6), green); out.rotation.z = Math.PI / 2; out.position.set(sx * 0.35, y, 0); g.add(out);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, l, 4, 6), green); up.position.set(sx * 0.55, y + l / 2, 0); g.add(up);
  }
  return shadowed(g);
}
function makeLlama() {
  const g = new THREE.Group();
  const wool = toy(['#f1e6d2', '#c9a27a', '#8a6a4a'][Math.floor(Math.random() * 3)], { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 6, 10), wool); body.rotation.z = Math.PI / 2; body.position.y = 0.95; g.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.7, 4, 8), wool); neck.position.set(0.5, 1.45, 0); g.add(neck);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.2, 4, 8), wool); head.rotation.z = Math.PI / 2; head.position.set(0.62, 1.85, 0); g.add(head);
  for (const sz of [-0.06, 0.06]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), wool); ear.position.set(0.5, 2.02, sz); g.add(ear); }
  for (const [x, z] of [[-0.35, 0.15], [-0.35, -0.15], [0.35, 0.15], [0.35, -0.15]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 6), wool); l.position.set(x, 0.38, z); g.add(l); }
  // Pompones de colores en las orejas
  for (const sz of [-0.07, 0.07]) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), toy(['#e14b3c', '#2f86e0', '#f2c230'][Math.floor(Math.random() * 3)])); p.position.set(0.5, 2.1, sz); g.add(p); }
  return shadowed(g);
}
function makeApacheta() { // montoncito de piedras para la Pachamama
  const g = new THREE.Group();
  const r = rng(9);
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 - i * 0.02, 0), std({ color: '#8a7a68', flatShading: true })); s.position.set((r() - 0.5) * 0.4, 0.15 + i * 0.13, (r() - 0.5) * 0.4); g.add(s); }
  return shadowed(g);
}
function saltTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#f6f4ee'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(160, 170, 190, 0.6)'; x.lineWidth = 3;
  const s = 32, hgt = s * Math.sqrt(3);
  for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
    const cx = col * s * 1.5, cy = row * hgt + (col % 2 ? hgt / 2 : 0);
    x.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2; x.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

export function decorNorte(group, anim, nodes, terrain) {
  const place = placer(group, nodes, terrain);
  const rand = rng(4646);
  const dirt = std({ map: tex.dryGrass([60, 60]), color: '#d9a983' });
  ground(group, 280, 280, dirt).userData.grass = '#a8864a';
  const plateau = makeTerrain(terrain, std({ map: tex.dryGrass([30, 20]), color: '#d4a47c', roughness: 0.95 }), { x: 0, z: -24, w: 130, d: 64 });
  plateau.userData.grass = '#a8864a'; group.add(plateau);
  const top = place.h(0, -30);
  // Salinas Grandes en el altiplano, con montoncitos de sal
  const salt = new THREE.Mesh(new THREE.CircleGeometry(1, 64), std({ map: saltTex(), color: '#e2e8ef', roughness: 0.8 }));
  salt.rotation.x = -Math.PI / 2; salt.scale.set(32, 11, 1); salt.position.set(2, top + 0.03, -30); salt.receiveShadow = true; group.add(salt);
  for (let i = 0; i < 18; i++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 8), std({ color: '#ffffff' })); p.position.set(-22 + (i % 9) * 5.5, top + 0.35, -25 - Math.floor(i / 9) * 6); p.castShadow = true; group.add(p); }
  const lblS = labelSprite('Salinas Grandes', 12); lblS.position.set(2, top + 6, -34); group.add(lblS);
  // Cerro de los Siete Colores y la cordillera
  [[-34, -46, 12, 18], [-12, -52, 10, 14], [20, -50, 12, 16], [42, -38, 9, 12], [-50, -20, 9, 12]].forEach(([x, z, r, h]) => { const m = makeSevenColors(r, h); m.position.set(x, place.h(x, z) - 0.5, z); group.add(m); });
  const lbl = labelSprite('Cerro de los Siete Colores', 16); lbl.position.set(-34, top + 20, -46); group.add(lbl);
  // Cerros rojizos a los costados de la Cuesta de Lipán
  for (const [x, z, r, h] of [[34, 10, 6, 7], [36, -2, 7, 9], [-44, 10, 7, 8]]) { const m = makePeak(r, h, { color: '#b5704a', snow: 0 }); m.position.set(x, place.h(x, z), z); group.add(m); }

  // Salta: el Cabildo y la iglesia de San Francisco (roja y dorada)
  const cab = makeCabildo({ w: 11, d: 3, h: 3.4, tint: '#f6f1e4', roof: 'gable' });
  cab.name = 'Cabildo de Salta'; place(cab, -1, 20, 10, 3, Math.PI);
  const sanFran = makeChurch('#b5303a'); sanFran.scale.setScalar(0.85); sanFran.name = 'San Francisco'; place(sanFran, 12.5, 20.5, 4, 6.5, Math.PI);
  ellipse(group, 5, 2.4, std({ map: tex.baldosa([4, 2]), color: '#e8d8c0' }), 0, 10.6, 0.03);
  const flag = makeFlag(); flag.name = 'bandera'; place(flag, 3.5, 10.6, 0.6, 0.6); anim.flags.push(flag.userData.flag);
  // Purmamarca: iglesia de adobe y casitas
  const capilla = makeChurch('#e9dcc2', false); capilla.scale.setScalar(0.7); capilla.name = 'capilla de Purmamarca'; place(capilla, -9, 4, 3, 5);
  for (const [x, z] of [[-9, -1.5], [-5.5, 6], [-6, 1.5], [-24, 2]]) place.try(() => makeAdobe(['#d6a77a', '#e0b48a', '#c99a70'][Math.floor(rand() * 3)]), x, z, 2.8, 2.4, rand() < 0.5 ? 0 : Math.PI);
  // Tren a las Nubes en su estación, junto al viaducto
  const tren = new THREE.Group();
  for (let i = 0; i < 4; i++) { tren.add(box(2.2, 1.3, 1.1, toy(i ? '#e8e2d2' : '#c0392b'), -i * 2.4, 1, 0)); tren.add(box(2.25, 0.25, 1.15, toy('#c0392b'), -i * 2.4, 1.75, 0)); }
  shadowed(tren); tren.name = 'Tren a las Nubes'; place(tren, 6, -11, 9.6, 1.4);
  // Monumento a la Independencia de Humahuaca (escalinata y estatua)
  const mon = new THREE.Group();
  const monStone = std({ map: tex.piedra(), color: '#e8dccb', roughness: 0.9 });
  for (let i = 0; i < 5; i++) mon.add(new THREE.Mesh(uvBox(new THREE.BoxGeometry(6 - i * 0.9, 0.5, 4 - i * 0.6), 1.2), monStone).translateY(0.25 + i * 0.5));
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.6, 8), toy('#6f7f63', { metalness: 0.6 })); st.position.y = 3.8; mon.add(st);
  shadowed(mon); mon.name = 'Monumento a la Independencia'; place(mon, -41, -2, 6, 4, Math.PI / 2);
  // Apachetas, cardones y llamas
  for (const n of nodes) if (n.type === 'pachamama') { const a = makeApacheta(); place.try(() => a, n.x + 1.9, n.z + 1.2, 0.8, 0.8); }
  scatter(place, rand, 70, (i) => makeCardon(2 + (i % 3) * 0.6), [-48, 48, -24, 24], 1.2);
  for (let i = 0; i < 14; i++) place.try(() => makeLlama(), -40 + rand() * 80, -20 + rand() * 40, 1.6, 1, rand() * 6.3);
}

// Modelos que también usan los minijuegos de estos tableros
export { makeCabildo, makePine, makeSnowPine, makePenguin, makeChalet, makeLlama, makeCardon, makeSierra, makeUfo, makePeak, makeSevenColors, makeApacheta, makeTrain, makeStBernard };
