// Decorado de los tableros Mendoza y La Costa, y lo que comparten los tres: el acomodador (que no deja
// poner nada encima de los caminos) y las manzanas de edificios.
import * as THREE from 'three';
import { makeTree, makeFlag } from './models.js';
import { makeFountain, makeFarol, makeBench } from './props.js';
import { tex, uvBox, uvScale } from './textures.js';
import { edificioPorteno, casaAdobe, bodega, hotelLadrillo, chaletPiedra } from './buildings.js';
import { heightAt, makeTerrain } from './terrain.js';

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...opts });
const toy = (color, opts = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, ...opts });
function shadowed(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function box(w, h, d, material, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m; }
function ground(group, w, d, material, x = 0, z = 0, y = 0.01) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m;
}
function ellipse(group, rx, rz, material, x, z, y = 0.02) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), material);
  m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m;
}
// Números al azar pero siempre iguales (así el mapa sale igual cada vez)
export function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// ---------- Acomodador ----------
// Pone cada cosa en el piso (a la altura que corresponda) y se fija que su base (un rectángulo w x d)
// no pise calles, casillas ni lo que board3d pone al costado (kioscos, paradas, faroles, carteles).
// place(obj, x, z, w, d, ry) la pone igual y avisa en la consola si pisa algo;
// place.try(...) solo la pone si entra.
const SIDE = { kiosco: 2.6, colectivo: 1.9, cruce: -1.6 }; // igual que en board3d.js
export function placer(group, nodes, terrain) {
  const segs = [], pts = [];
  for (const n of nodes) {
    pts.push([n.x, n.z, 1.35]);
    for (const id of n.next) segs.push([n, nodes[id]]);
    const nx = nodes[n.next[0]];
    const l = Math.hypot(nx.x - n.x, nx.z - n.z) || 1, sx = (nx.z - n.z) / l, sz = -(nx.x - n.x) / l;
    const d = SIDE[n.type] ?? (n.type === 'azul' && n.id % 4 === 0 ? 1.9 : null);
    if (d != null) pts.push([n.x + sx * d, n.z + sz * d, { kiosco: 2, colectivo: 1.2, cruce: 0.7 }[n.type] || 0.45]);
  }
  const taken = []; // bases de lo que ya se puso: [x, z, medio ancho, medio largo, cos, sin]
  const roadDist = (x, z) => {
    let best = Infinity;
    for (const [a, b] of segs) {
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    }
    return best;
  };
  const clear = (x, z) => roadDist(x, z) >= 1.35 && pts.every(([px, pz, r]) => Math.hypot(x - px, z - pz) >= r)
    && taken.every(([tx, tz, hw, hd, c, s]) => { const lx = (x - tx) * c - (z - tz) * s, lz = (x - tx) * s + (z - tz) * c; return Math.abs(lx) > hw || Math.abs(lz) > hd; });
  const fits = (x, z, w, d, ry) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    const nw = Math.max(1, Math.ceil(w / 0.7)), nd = Math.max(1, Math.ceil(d / 0.7));
    for (let i = 0; i <= nw; i++) for (let j = 0; j <= nd; j++) {
      const lx = (i / nw - 0.5) * w, lz = (j / nd - 0.5) * d;
      if (!clear(x + lx * c + lz * s, z - lx * s + lz * c)) return false;
    }
    return true;
  };
  const put = (obj, x, z, w, d, ry) => {
    obj.position.set(x, heightAt(terrain, x, z), z);
    obj.rotation.y = ry;
    group.add(obj);
    taken.push([x, z, w / 2, d / 2, Math.cos(ry), Math.sin(ry)]);
    return obj;
  };
  const place = (obj, x, z, w = 1, d = w, ry = 0) => {
    if (!fits(x, z, w, d, ry)) console.warn('Decorado pisando un camino:', obj.name || '(sin nombre)', x, z);
    return put(obj, x, z, w, d, ry);
  };
  place.try = (make, x, z, w = 1, d = w, ry = 0) => (fits(x, z, w, d, ry) ? put(make(), x, z, w, d, ry) : null);
  place.fits = fits;
  place.roadDist = roadDist;
  place.h = (x, z) => heightAt(terrain, x, z);
  return place;
}

// ---------- Edificios ----------
// Edificio porteño: revoque o ladrillo, ventanas con postigos, balcones, local con toldo abajo y tanque arriba.
// Es una sola pieza con el material compartido de las fachadas (ver buildings.js).
export function makeEdificio(w, h, d, color) {
  const g = new THREE.Group();
  g.add(edificioPorteno(w, h, d, color));
  return g;
}
// Piedra compartida (con las coordenadas en unidades del mundo: ver uvBox)
const stoneBox = (w, h, d, x, y, z, mat, size = 1.2) => { const m = new THREE.Mesh(uvBox(new THREE.BoxGeometry(w, h, d), size), mat); m.position.set(x, y, z); return m; };
const FACADES = ['#e8dcc4', '#d9c7a8', '#efe6d3', '#cdb9a0', '#c98f6f', '#b8b3a8', '#e2cfae', '#a9b4bd'];
// Manzana: un anillo de edificios mirando a las cuatro calles y un patio en el medio.
// La cámara sigue al jugador desde abajo (z más grande), así que lo que puede taparlo es lo que queda
// justo abajo de su calle: el borde de arriba de cada manzana. Ahí los edificios van bajitos.
export function cityBlock(place, x0, z0, x1, z1, rand, { maxH = 8, lowH = 3.4, colors = FACADES, step = 2.5, inset = 2.6, depth = 3, make = makeEdificio } = {}) {
  const ax = x0 + inset, bx = x1 - inset, az = z0 + inset, bz = z1 - inset;
  const spots = [];
  for (let x = ax + step / 2; x <= bx - step / 2 + 0.01; x += step) { spots.push([x, az + depth / 2, 0, 'n']); spots.push([x, bz - depth / 2, Math.PI, 's']); }
  for (let z = az + depth + step / 2; z <= bz - depth - step / 2 + 0.01; z += step) { spots.push([ax + depth / 2, z, -Math.PI / 2, 'w']); spots.push([bx - depth / 2, z, Math.PI / 2, 'e']); }
  for (const [x, z, ry, edge] of spots) {
    const h = edge === 'n' ? 2.6 + rand() * (lowH - 2.6) : 3 + rand() * (maxH - 3);
    const w = step - 0.15;
    const color = colors[Math.floor(rand() * colors.length)];
    place.try(() => make(w, h, depth, color), x, z, w, depth, ry);
  }
}

// ---------- Mendoza ----------
function makeMountain(r, h, snow = true) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), std({ color: '#8a7560', flatShading: true }));
  rock.position.y = h / 2; g.add(rock);
  if (snow) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.34, h * 0.34, 7, 1), std({ color: '#f7f9fc', flatShading: true }));
    cap.position.y = h - h * 0.17 + 0.05; g.add(cap);
  }
  return shadowed(g);
}
function makeVineRow(len) {
  const g = new THREE.Group();
  const leaf = std({ color: '#4f8a2b', flatShading: true });
  g.add(box(0.5, 0.8, len, leaf, 0, 0.6, 0));
  for (let z = -len / 2; z <= len / 2; z += 2) g.add(box(0.08, 1.1, 0.08, std({ color: '#6b4a2b' }), 0, 0.55, z));
  // Racimos de uva
  for (let z = -len / 2 + 0.5; z < len / 2; z += 1.1) {
    const grape = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), toy('#5b2a6e'));
    grape.position.set((Math.random() < 0.5 ? -1 : 1) * 0.28, 0.45, z); grape.scale.y = 1.4; g.add(grape);
  }
  return shadowed(g);
}
const BARREL = { wood: std({ map: tex.madera([3, 1]), color: '#9a6538', roughness: 0.7 }), hoop: std({ color: '#3a3a3a', metalness: 0.5, roughness: 0.4 }) };
function makeBodega() {
  const g = new THREE.Group();
  g.add(bodega(7, 4, 3.2));
  // Barriles
  const bGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.9, 14), hGeo = new THREE.TorusGeometry(0.43, 0.03, 6, 16);
  for (let i = 0; i < 4; i++) {
    const barrel = new THREE.Mesh(bGeo, BARREL.wood);
    barrel.rotation.z = Math.PI / 2; barrel.position.set(-1.8 + i * 1.1, 0.45, 2.9); g.add(barrel);
    for (const dx of [-0.3, 0.3]) { const hoop = new THREE.Mesh(hGeo, BARREL.hoop); hoop.rotation.y = Math.PI / 2; hoop.position.set(-1.8 + i * 1.1 + dx, 0.45, 2.9); g.add(hoop); }
  }
  return shadowed(g);
}
function makeCerroGloria() {
  const g = new THREE.Group();
  const hill = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#9c8a5a', flatShading: true }));
  hill.scale.y = 0.55; g.add(hill);
  g.add(stoneBox(2.4, 1.6, 2.4, 0, 3.9, 0, std({ map: tex.piedra(), color: '#efe6d6', roughness: 0.9 })));
  const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 2.2, 8), toy('#6f7f63', { metalness: 0.6 }));
  statue.position.y = 5.8; g.add(statue);
  const wing = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), toy('#6f7f63', { metalness: 0.6 }));
  wing.position.set(0, 7.3, 0); g.add(wing);
  return shadowed(g);
}
function makeCristo() { // Cristo Redentor de los Andes, en la cumbre
  const g = new THREE.Group();
  const stone = std({ map: tex.piedra(), color: '#d8d0c4', roughness: 0.9 }), bronze = toy('#7d8a6a', { metalness: 0.6 });
  g.add(stoneBox(2, 1.2, 2, 0, 0.6, 0, stone));
  const ped = new THREE.Mesh(uvScale(new THREE.CylinderGeometry(0.5, 0.8, 2.6, 8), 3, 2), stone); ped.position.y = 2.5; g.add(ped);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 2.2, 10), bronze); body.position.y = 4.9; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), bronze); head.position.y = 6.25; g.add(head);
  g.add(box(0.15, 1.9, 0.15, bronze, 0.75, 5.5, 0)); // la cruz
  g.add(box(0.15, 0.15, 1, bronze, 0.75, 5.9, 0));
  return shadowed(g);
}
function makePortones() { // Portones del Parque San Martín
  const g = new THREE.Group();
  const stone = std({ map: tex.piedra(), color: '#f4eee2', roughness: 0.9 }), iron = toy('#2a3340');
  for (const x of [-2.2, 2.2]) { g.add(stoneBox(0.8, 3.6, 0.8, x, 1.8, 0, stone, 0.9)); const top = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), toy('#c9a227', { metalness: 0.7 })); top.position.set(x, 3.9, 0); g.add(top); }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 6, 24, Math.PI), iron); arch.position.y = 3.2; g.add(arch);
  for (let i = -6; i <= 6; i++) g.add(box(0.05, 2.6, 0.05, iron, i * 0.3, 1.3, 0));
  return shadowed(g);
}
function makeOlive() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.4, 6), std({ color: '#6b5a44' }));
  trunk.position.y = 0.7; g.add(trunk);
  const leaf = std({ color: '#8fa27a', flatShading: true });
  for (const [x, y, z, r] of [[0, 1.8, 0, 0.9], [0.6, 1.6, 0.2, 0.6], [-0.5, 1.7, -0.2, 0.6]]) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leaf); c.position.set(x, y, z); g.add(c);
  }
  return shadowed(g);
}
function makeAlamo() { // álamo: alto y finito, como los de las acequias
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.2, 6), std({ color: '#7a6248' })); trunk.position.y = 0.6; g.add(trunk);
  const top = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 3.2, 4, 8), std({ color: '#6f9a3a', flatShading: true })); top.material.userData.foliage = true; top.position.y = 3; g.add(top);
  return shadowed(g);
}
export function makeAdobe(color) { // casita baja de adobe con techo plano y vigas
  const g = new THREE.Group();
  g.add(casaAdobe(color, 2.6, 2.2, 2));
  return g;
}
function makeRockPile(n, seed) {
  const g = new THREE.Group();
  const r = rng(seed);
  const mat = std({ color: '#8a7a68', flatShading: true });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + r() * 0.45, 0), mat);
    m.position.set((r() - 0.5) * 1.6, 0.2, (r() - 0.5) * 1.6); m.rotation.set(r(), r(), 0); m.scale.y = 0.7;
    g.add(m);
  }
  return shadowed(g);
}
function makeDust() { // remolino del Zonda
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#d8c3a0', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.3 + i * 0.25, 0.06, 6, 20), mat);
    t.rotation.x = Math.PI / 2; t.position.y = 0.5 + i * 0.7; g.add(t);
  }
  return g;
}

export function decorMendoza(group, anim, nodes, terrain) {
  const place = placer(group, nodes, terrain);
  const rand = rng(4242);
  ground(group, 280, 280, std({ map: tex.dryGrass([60, 60]) })).userData.grass = '#8a8a45';
  // La montaña: el piso sube hacia el fondo por donde van los Caracoles
  const mountain = makeTerrain(terrain, std({ map: tex.dryGrass([30, 18]), color: '#c7b28e', roughness: 0.95 }), { x: 0, z: -41, w: 120, d: 70 });
  mountain.userData.grass = '#8a8a45';
  group.add(mountain);
  const top = place.h(0, -40);
  // Nieve arriba de todo y la Cordillera al fondo (el Aconcagua es el más alto)
  ellipse(group, 26, 13, std({ color: '#dfe5ec', roughness: 1 }), 0, -48, top + 0.03);
  [[-24, -60, 14, 30], [-2, -66, 12, 22], [17, -61, 13, 24], [34, -54, 10, 16], [-40, -52, 11, 18], [-48, -30, 12, 22], [-50, -8, 10, 16], [48, -30, 11, 18], [50, -8, 9, 14], [8, -58, 8, 12]]
    .forEach(([x, z, r, h]) => { const m = makeMountain(r, h); m.position.set(x, place.h(x, z) - 0.5, z); group.add(m); });
  const aconcagua = makeLabelish('Aconcagua'); aconcagua.position.set(-24, top + 33, -60); group.add(aconcagua);
  const cristo = makeCristo(); cristo.name = 'Cristo Redentor'; place(cristo, -3, -30.6, 2, 2, 0.4);
  // Piedras y matas entre las vueltas de los Caracoles
  for (let i = 0; i < 40; i++) {
    const x = -30 + rand() * 60, z = -34 + rand() * 26, s = i;
    place.try(() => makeRockPile(3 + (i % 3), s + 7), x, z, 1.8, 1.8, rand() * 6);
  }
  // Remolinos de viento Zonda en la bajada
  [[-28, -20], [-13, -17], [13, -21], [28, -14]].forEach(([x, z], i) => { const d = makeDust(); d.position.set(x, place.h(x, z), z); d.userData.speed = 2 + i; anim.spin.push(d); group.add(d); });

  // Viñedos a la derecha y bodega
  for (let x = 28.5; x <= 40; x += 1.6) place.try(() => makeVineRow(16), x, 10, 0.6, 16);
  for (let x = 8; x <= 18; x += 5) place.try(() => { const r = makeVineRow(4.2); return r; }, x, -8.4, 0.6, 4.2, Math.PI / 2);
  const bodega = makeBodega(); bodega.name = 'bodega'; place(bodega, 34, -4.5, 7.4, 5.4, -0.25);
  // Acequia (canal de agua) a lo largo de la Plaza Independencia, y álamos
  const acequia = ground(group, 22, 0.6, toy('#5aa6d6', { map: tex.water([20, 1]), roughness: 0.1 }), 0, 14.4, 0.03);
  anim.water.push(acequia);
  for (let x = -26; x <= 26; x += 3.2) place.try(makeAlamo, x, -1.4, 1.1, 1.1);
  for (let z = -2; z <= 20; z += 3.2) { place.try(makeAlamo, 27.5, z, 1.1, 1.1); place.try(makeAlamo, -31, z, 1.1, 1.1); }

  // Plaza Independencia en el medio de la ciudad
  ellipse(group, 6.5, 4.6, std({ map: tex.baldosa([6, 5]), color: '#d8ccb4' }), 3, 6.4, 0.03);
  const fountain = makeFountain(); fountain.scale.setScalar(0.85); fountain.name = 'fuente'; place(fountain, 3, 6.4, 2.6, 2.6); anim.fountains.push(fountain);
  for (const [x, z, r] of [[-0.6, 9.4, 0], [6.6, 3.4, Math.PI], [7.4, 8.8, Math.PI / 2], [-1.4, 3.6, -Math.PI / 2]]) place.try(makeBench, x, z, 1.6, 0.6, r);
  const flag = makeFlag(); flag.name = 'bandera'; place(flag, 7.6, 5.6, 0.6, 0.6); anim.flags.push(flag.userData.flag);
  // Casitas de adobe alrededor de la plaza
  const adobes = ['#e8d2b0', '#dcb98f', '#f0dfc4', '#d6a77a', '#e9c9a0'];
  for (let x = -10; x <= 20; x += 3.3) for (let z = 1.8; z <= 12.5; z += 3.2) {
    if (Math.hypot((x - 3) / 8, (z - 6.4) / 6) < 1 || rand() < 0.4) continue;
    const c = adobes[Math.floor(rand() * adobes.length)];
    place.try(() => makeAdobe(c), x + (rand() - 0.5) * 0.8, z + (rand() - 0.5) * 0.6, 2.9, 2.5, rand() < 0.5 ? 0 : Math.PI);
  }

  // Parque San Martín: lago, portones y el Cerro de la Gloria
  const lake = ellipse(group, 2.2, 3.4, toy('#4a9ac9', { map: tex.water([2, 4]), roughness: 0.1, clearcoat: 1 }), -20.4, 8.4, 0.04);
  anim.water.push(lake);
  const port = makePortones(); port.scale.setScalar(0.75); port.name = 'portones'; place(port, -20.6, 13.6, 3.8, 0.8, 0.15);
  const cerro = makeCerroGloria(); cerro.scale.setScalar(0.8); cerro.name = 'Cerro de la Gloria'; place(cerro, -38, 4, 9, 9);
  // Olivos sueltos
  for (let i = 0; i < 46; i++) place.try(makeOlive, -44 + rand() * 88, -8 + rand() * 32, 1.8, 1.8, rand() * 6);
}

// Cartel de texto grande flotando (para el Aconcagua)
function makeLabelish(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const x = c.getContext('2d');
  x.font = 'bold 60px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 10; x.strokeStyle = '#1b2a4a'; x.strokeText(text, 256, 50);
  x.fillStyle = '#ffffff'; x.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  sp.scale.set(14, 2.6, 1);
  return sp;
}

// ---------- La Costa ----------
function makeTorreon() { // el Torreón del Monje: piedra, almenas, ventanas angostas y techo cónico de tejas
  const g = new THREE.Group();
  const stone = std({ map: tex.piedra(), color: '#f0e4d0', roughness: 0.9 }), roof = std({ map: tex.tejas(), color: '#c0603f', roughness: 0.7 });
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), std({ color: '#7d7468', flatShading: true }));
  rock.scale.set(1.4, 0.6, 1.1); rock.position.y = 0.8; g.add(rock);
  g.add(stoneBox(4.5, 3, 3, 0, 3.6, 0, stone));
  const tower = new THREE.Mesh(uvScale(new THREE.CylinderGeometry(1.1, 1.2, 6, 14), 6, 5), stone); tower.position.set(1.6, 5, 0); g.add(tower);
  const cone = new THREE.Mesh(uvScale(new THREE.ConeGeometry(1.4, 2, 14), 6, 2), roof); cone.position.set(1.6, 9, 0); g.add(cone);
  for (let i = 0; i < 6; i++) g.add(stoneBox(0.5, 0.5, 0.5, -2 + i * 0.6, 5.35, 1.3, stone));
  const win = std({ color: '#1b2638', roughness: 0.3 });
  for (const a of [0, 1.2, -1.2]) { const w = box(0.22, 0.6, 0.06, win, 1.6 + Math.sin(a) * 1.14, 6.4, Math.cos(a) * 1.14); w.rotation.y = a; g.add(w); }
  for (const x of [-1.4, -0.2]) g.add(box(0.5, 0.8, 0.06, win, x, 3.8, 1.52));
  return shadowed(g);
}
function makeLighthouse() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.9 - i * 0.07, 0.95 - i * 0.07, 1.6, 14), toy(i % 2 ? '#ffffff' : '#d63a2f'));
    seg.position.y = 0.8 + i * 1.6; g.add(seg);
  }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 12), new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: '#ffe680', emissiveIntensity: 1.2 }));
  lamp.position.y = 10.1; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.8, 12), toy('#1b2a4a')); cap.position.y = 10.95; g.add(cap);
  return shadowed(g);
}
function makeSeaLion() { // Lobo marino de la Rambla
  const g = new THREE.Group();
  const stone = toy('#9a9488', { roughness: 0.6 });
  g.add(box(1.6, 1.4, 2.6, std({ color: '#d9d2c3' }), 0, 0.7, 0));
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.2, 6, 12), stone); body.rotation.x = -0.9; body.position.set(0, 2.0, 0.1); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), stone); head.position.set(0, 2.85, 0.65); g.add(head);
  return shadowed(g);
}
function makeLiveSeaLion() { // lobo marino de verdad, tirado en las rocas del Puerto
  const g = new THREE.Group();
  const skin = toy('#6b5544', { roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1, 6, 10), skin); body.rotation.z = Math.PI / 2; body.position.y = 0.35; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin); head.position.set(0.75, 0.65, 0); g.add(head);
  return shadowed(g);
}
function makeUmbrella(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), std({ color: '#f4f1e8' })); pole.position.y = 1.1; g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.55, 10), toy(color)); top.position.y = 2.2; g.add(top);
  const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.7), std({ color: color === '#ffffff' ? '#e14b3c' : '#ffffff', side: THREE.DoubleSide }));
  towel.rotation.x = -Math.PI / 2; towel.position.set(0.9, 0.03, 0.2); g.add(towel);
  return shadowed(g);
}
function makeCarpa(color) { // carpa de balneario a rayas
  const g = new THREE.Group();
  const stripes = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : color; x.fillRect(i * 8, 0, 8, 8); } return c; })());
  stripes.colorSpace = THREE.SRGBColorSpace;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2), std({ map: stripes })); body.position.y = 0.8; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.8, 4), toy(color)); roof.rotation.y = Math.PI / 4; roof.position.y = 2; g.add(roof);
  return shadowed(g);
}
function makeHotel(color = '#d9c7a8') { // el Casino y el Hotel Provincial, de ladrillo y piedra con techo de pizarra
  const g = new THREE.Group();
  g.add(hotelLadrillo(color, 9, 4, 5));
  return g;
}
function makeChaletPiedra(color, roof, w, h) { const g = new THREE.Group(); g.add(chaletPiedra(color, roof, w, h)); return g; }
function makeRocks(n, seed) {
  const g = new THREE.Group();
  const r = rng(seed);
  const mat = std({ color: '#6f6a63', flatShading: true });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + r() * 0.4, 0), mat);
    m.position.set((r() - 0.5) * 0.8, 0.1, -i * 1.1); m.rotation.set(r(), r(), 0);
    g.add(m);
  }
  return shadowed(g);
}
function makeSailboat(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.9), toy('#ffffff')); hull.position.y = 0.25; g.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), std({ color: '#7a4a2b' })); mast.position.y = 1.5; g.add(mast);
  const sailShape = new THREE.Shape(); sailShape.moveTo(0, 0); sailShape.lineTo(1, 0); sailShape.lineTo(0, 2); sailShape.lineTo(0, 0);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), toy(color, { side: THREE.DoubleSide })); sail.position.set(0.05, 0.55, 0); g.add(sail);
  return shadowed(g);
}
function makeLancha() { // las lanchitas amarillas del puerto de Mar del Plata
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.1), toy('#f2c230')); hull.position.y = 0.2; g.add(hull);
  g.add(box(2.45, 0.12, 1.15, toy('#d63a2f'), 0, 0.5, 0));
  g.add(box(0.8, 0.7, 0.8, toy('#ffffff'), -0.3, 0.85, 0));
  return shadowed(g);
}

export function decorCosta(group, anim, nodes) {
  const place = placer(group, nodes, null);
  const rand = rng(777);
  const SHORE = -16;
  // Tierra (pasto) hasta la orilla, arena entre la Rambla y el mar, y el mar más abajo
  ground(group, 280, 160, std({ map: tex.grass([60, 34]) }), 0, SHORE + 80).userData.grass = '#4f9a3a';
  ground(group, 140, 8.6, std({ map: tex.sand([28, 2]) }), 0, SHORE + 4.3, 0.012);
  const sea = ground(group, 280, 140, toy('#2f8fc4', { map: tex.water([40, 20]), roughness: 0.1, clearcoat: 1, metalness: 0.1 }), 0, SHORE - 70, -0.3);
  anim.water.push(sea);
  ground(group, 140, 8.6, std({ map: tex.sand([28, 2]), color: '#cdb98f' }), 0, SHORE - 4.2, -0.32); // fondo de arena bajo el agua
  const foam = ground(group, 280, 1.2, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), 0, SHORE - 0.4, -0.26);
  foam.userData = { baseY: -0.26, speed: 1.2, amp: 0.01 }; anim.bob.push(foam);

  // El Muelle de pescadores: entra al mar y vuelve. Tablones, barandas y faroles en el medio
  const wood = std({ map: tex.wood([4, 10]), color: '#b08a5a' });
  // Arriba queda a 0.022: sobre la arena y abajo de las calles
  const deck = box(9.6, 0.5, 23.6, wood, -5, -0.228, -20.2); deck.receiveShadow = true; group.add(deck);
  const rail = std({ color: '#f4f1e8' });
  for (const x of [-9.6, -0.4]) {
    group.add(box(0.1, 0.1, 22.6, rail, x, 0.85, -20.7));
    for (let z = -9.5; z >= -31.5; z -= 2) group.add(box(0.12, 0.85, 0.12, rail, x, 0.42, z));
  }
  group.add(box(9.3, 0.1, 0.1, rail, -5, 0.85, -31.95));
  for (let z = -31.2; z <= -8.6; z += 2.4) { const p = box(0.4, 1.4, 0.4, std({ color: '#5a3a22' }), -9.9, -0.6, z); group.add(p); const q = p.clone(); q.position.x = -0.1; group.add(q); }
  for (const z of [-14, -21, -28]) { const f = makeFarol(); f.position.set(-5, 0.022, z); f.scale.setScalar(0.8); group.add(f); }

  // El Puerto: la escollera de piedra por donde va el camino, con las lanchitas y los lobos marinos adentro
  const stone = std({ color: '#9a958c', flatShading: true });
  for (const n of nodes) for (const id of n.next) {
    const b = nodes[id];
    if (n.seg !== 'puerto' || (n.z > SHORE + 2 && b.z > SHORE + 2)) continue;
    const len = Math.hypot(b.x - n.x, b.z - n.z) + 2;
    const m = box(3.6, 0.6, len, stone, (n.x + b.x) / 2, -0.3, (n.z + b.z) / 2);
    m.rotation.y = Math.atan2(b.x - n.x, b.z - n.z); m.receiveShadow = true; group.add(m);
  }
  const rocksOut = makeRocks(9, 3); rocksOut.position.set(44, -0.2, -14); group.add(rocksOut);
  const rocksOut2 = makeRocks(7, 5); rocksOut2.position.set(33, -0.2, -25.4); rocksOut2.rotation.y = Math.PI / 2; group.add(rocksOut2);
  [[36.5, -18.6, 0.3], [35.4, -20.6, 1.2], [38.4, -17.4, 2.2]].forEach(([x, z, r], i) => { const l = makeLancha(); l.position.set(x, -0.3, z); l.rotation.y = r; l.userData = { baseY: -0.3, speed: 1.3 + i * 0.4, amp: 0.06 }; anim.bob.push(l); group.add(l); });
  [[43.6, -18, 0.4], [44, -9, 2.5], [37, -25.5, 3.6]].forEach(([x, z, r]) => { const l = makeLiveSeaLion(); l.position.set(x, 0.2, z); l.rotation.y = r; group.add(l); });
  const faro = makeLighthouse(); faro.name = 'faro'; place(faro, 34.6, -5, 2, 2);

  // El Torreón del Monje, sobre las rocas en el agua
  const torreon = makeTorreon(); torreon.name = 'Torreón'; torreon.rotation.y = 0.2; torreon.position.set(-29, -0.3, -19.5); group.add(torreon);
  const esc = makeRocks(10, 9); esc.position.set(-44, -0.2, -15.5); group.add(esc);
  ['#e14b3c', '#2f86e0', '#f2c230', '#ffffff', '#2e9e48'].forEach((c, i) => { const b = makeSailboat(c); b.position.set(-44 + i * 20, -0.25, -34 - (i % 2) * 7); b.userData = { baseY: -0.25, speed: 1 + i * 0.3, amp: 0.15 }; anim.bob.push(b); group.add(b); });

  // Lobos marinos de la Rambla, frente al Casino
  for (const x of [-20.5, -14.5]) { const l = makeSeaLion(); l.name = 'lobo marino'; place(l, x, -10.6, 1.6, 2.6, 0); }
  // Sombrillas y carpas en la arena, donde no haya caminos
  const colors = ['#e14b3c', '#2f86e0', '#f2c230', '#2e9e48', '#ef8a17', '#ffffff'];
  let k = 0;
  for (let x = -46; x <= 46; x += 3.2) for (const z of [-14.2, -11.4]) {
    if (rand() < 0.3) continue;
    const c = colors[k % 6], carpa = k % 4 === 0;
    if (place.try(() => (carpa ? makeCarpa(c) : makeUmbrella(c)), x + rand() * 0.8, z + rand() * 0.5, carpa ? 2.2 : 2, carpa ? 2.2 : 2)) k++;
  }

  // La ciudad: el Casino y el Hotel Provincial, edificios contra la Avenida y casas bajas cerca del mar
  const casino = makeHotel('#d9c7a8'); casino.scale.setScalar(0.8); casino.name = 'Casino'; place(casino, -10.5, 7.4, 7.4, 3.4, Math.PI);
  const hotel = makeHotel('#cdb9a0'); hotel.scale.setScalar(0.8); hotel.name = 'Hotel Provincial'; place(hotel, 0, 7.4, 7.4, 3.4, Math.PI);
  // La plaza entre los dos, con la fuente
  ellipse(group, 2.6, 2.2, std({ map: tex.baldosa([3, 3]) }), -5.2, 6.8, 0.03);
  const fuente = makeFountain(); fuente.scale.setScalar(0.6); fuente.name = 'fuente'; place(fuente, -5.2, 6.8, 1.8, 1.8); anim.fountains.push(fuente);
  for (let x = 8; x <= 22; x += 2.7) place.try(() => makeEdificio(2.5, 4 + rand() * 4.5, 2.6, FACADES[Math.floor(rand() * FACADES.length)]), x, 8.6, 2.5, 2.6, Math.PI);
  const houses = ['#e8d5b5', '#d9c7a8', '#f0e2c6', '#cbb898', '#e9d3c0'];
  // Chalets de piedra y tejas cerca de la Rambla, salteados, con árboles en el medio
  for (let x = -36; x <= 26; x += 3.6) for (const z of [-1.6, 2.4]) {
    if ((x > -19 && x < 6) || rand() < 0.4) continue;
    const c = houses[Math.floor(rand() * houses.length)], tree = rand() < 0.3;
    place.try(() => (tree ? makeTree(false) : makeChaletPiedra(c, ['#b5583c', '#8a4a3a', '#5e6b7a'][Math.floor(rand() * 3)], 2.6, 2.4 + rand() * 0.6)), x + (rand() - 0.5), z, 3, 2.8, Math.PI + (rand() - 0.5) * 0.3);
  }
  for (let x = -34; x <= -22; x += 3) place.try(() => makeEdificio(2.6, 4 + rand() * 3, 2.6, FACADES[Math.floor(rand() * FACADES.length)]), x, 8.6, 2.6, 2.6, Math.PI);
  for (let x = -16; x <= 22; x += 6) place.try(makeFarol, x, 15.2, 0.5, 0.5);
  // Punta Mogotes: balneario con carpas adentro de la curva
  ellipse(group, 3, 3.6, std({ map: tex.sand([3, 3]) }), 29, 6.2, 0.015);
  for (const [x, z] of [[28, 5], [30.2, 7.4], [28.4, 8]]) place.try(() => makeCarpa(colors[k++ % 6]), x, z, 2.2, 2.2);
  // Árboles y casas lejos, a los costados
  for (let i = 0; i < 40; i++) {
    const x = (rand() < 0.5 ? -1 : 1) * (42 + rand() * 14), z = -12 + rand() * 34;
    place.try(() => (i % 3 ? makeTree(false) : makeChaletPiedra(houses[i % 5], '#b5583c', 3.2, 3.2)), x, z, 3, 3, rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
  }
  for (let i = 0; i < 18; i++) place.try(() => makeTree(false), -40 + rand() * 80, 18 + rand() * 10, 2.2, 2.2);
  const flag = makeFlag(); flag.name = 'bandera'; place(flag, 26, -2.4, 0.6, 0.6); anim.flags.push(flag.userData.flag);
}
