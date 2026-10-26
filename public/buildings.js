// Edificios con detalle: paredes de revoque, ladrillo, chapa o madera, ventanas con marco y postigos,
// puertas, vidrieras, zócalo, cornisa, balcones y techos de tejas o chapa.
// Todo sale de una sola imagen (atlas) dibujada en canvas y cada edificio es UNA pieza con UN material
// compartido: el color de cada casa va en los vértices, así cien casas distintas no pesan más que una.
import * as THREE from 'three';
import { draw } from './textures.js';

// ---------- Atlas ----------
const CELL = 128, N = 8, SIZE = CELL * N;
const GLASS = (x, x0, y0, w, h, warm = false) => { // vidrio con reflejo
  const g = x.createLinearGradient(x0, y0, x0 + w * 0.6, y0 + h);
  if (warm) { g.addColorStop(0, '#ffe7a8'); g.addColorStop(1, '#f0a850'); }
  else { g.addColorStop(0, '#5d7898'); g.addColorStop(0.5, '#2a3d58'); g.addColorStop(1, '#1b2638'); }
  x.fillStyle = g; x.fillRect(x0, y0, w, h);
  x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip();
  x.fillStyle = warm ? 'rgba(255,255,255,.25)' : 'rgba(200,225,255,.22)';
  x.beginPath(); x.moveTo(x0 + w * 0.15, y0 + h); x.lineTo(x0 + w * 0.55, y0); x.lineTo(x0 + w * 0.75, y0); x.lineTo(x0 + w * 0.35, y0 + h); x.fill();
  x.restore();
};
const FRAME = (x, x0, y0, w, h, color, t) => { x.fillStyle = color; x.fillRect(x0, y0, w, t); x.fillRect(x0, y0 + h - t, w, t); x.fillRect(x0, y0, t, h); x.fillRect(x0 + w - t, y0, t, h); };
const INSET = (x, x0, y0, w, h, k = 0.35) => { // sombra adentro del marco (da profundidad)
  x.fillStyle = `rgba(0,0,0,${k})`; x.fillRect(x0, y0, w, h * 0.08); x.fillRect(x0, y0, w * 0.06, h);
};
function louvers(x, x0, y0, w, h, color) { // postigo de librillo
  x.fillStyle = color; x.fillRect(x0, y0, w, h);
  x.fillStyle = 'rgba(0,0,0,.28)';
  for (let y = y0 + 6; y < y0 + h - 4; y += 6) x.fillRect(x0 + 3, y, w - 6, 2);
  x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(x0, y0, 2, h);
  FRAME(x, x0, y0, w, h, 'rgba(0,0,0,.3)', 2);
}
function porteno(shutter, closed = false) {
  return (x, s) => {
    louvers(x, 0, 0, 24, s, shutter); louvers(x, s - 24, 0, 24, s, shutter);
    x.fillStyle = '#efe9dc'; x.fillRect(24, 0, s - 48, s);
    GLASS(x, 32, 8, s - 64, s - 16);
    if (closed) { louvers(x, 32, 8, s - 64, (s - 16) * 0.62, shutter); }
    x.fillStyle = '#efe9dc'; x.fillRect(s / 2 - 3, 8, 6, s - 16); x.fillRect(32, s * 0.3, s - 64, 5);
    INSET(x, 32, 8, s - 64, s - 16);
  };
}
function shopSign(x, s, bg, text, fg = '#ffffff') {
  x.fillStyle = bg; x.fillRect(0, 0, s, s * 0.24);
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, s, 3);
  x.fillStyle = fg; x.font = `bold ${Math.round(s * 0.13)}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, s / 2, s * 0.125);
}
function shop(bg, text, goods) {
  return (x, s) => {
    x.fillStyle = '#3a3330'; x.fillRect(0, 0, s, s);
    shopSign(x, s, bg, text);
    GLASS(x, 6, s * 0.28, s * 0.58, s * 0.66);
    // Mercadería en los estantes de la vidriera
    for (let r = 0; r < 3; r++) {
      const y = s * 0.42 + r * s * 0.17;
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(8, y + s * 0.09, s * 0.56, 2);
      for (let i = 0; i < 6; i++) { x.fillStyle = goods[(i + r) % goods.length]; x.fillRect(12 + i * s * 0.085, y + s * 0.09 - (8 + (i * 7 + r * 3) % 9), s * 0.06, 8 + (i * 7 + r * 3) % 9); }
    }
    // La puerta vidriada al costado
    x.fillStyle = '#6b4528'; x.fillRect(s * 0.68, s * 0.28, s * 0.28, s * 0.72);
    GLASS(x, s * 0.72, s * 0.32, s * 0.2, s * 0.4);
    x.fillStyle = '#d9b44a'; x.fillRect(s * 0.71, s * 0.66, 4, 10);
    FRAME(x, 4, s * 0.26, s - 8, s * 0.74, '#2a2420', 4);
  };
}

const CELLS = {
  // paredes (claras, se tiñen) y materiales naturales
  revoque: draw.revoque, ladrillo: draw.ladrillo, ladrilloClaro: draw.ladrilloClaro, chapa: draw.chapa,
  madera: draw.madera, troncos: draw.troncos, piedra: draw.piedra, adobe: draw.adobe,
  tejas: draw.tejas, tejuela: draw.tejuela, azotea: draw.azotea, granito: draw.granito,
  vidrio: (x, s) => { // muro cortina de las torres
    x.fillStyle = '#c9d2da'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) GLASS(x, 4 + i * s / 2, 4 + j * s / 2, s / 2 - 8, s / 2 - 8);
  },
  cornisa: (x, s) => {
    const b = [['#fafafa', 0.18], ['#9a9a9a', 0.06], ['#e8e8e8', 0.16], ['#bdbdbd', 0.08], ['#f2f2f2', 0.22], ['#a8a8a8', 0.1], ['#dedede', 0.2]];
    let y = 0; for (const [c, h] of b) { x.fillStyle = c; x.fillRect(0, y, s, h * s + 1); y += h * s; }
    x.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 8; i++) x.fillRect(i * s / 8 + 3, s * 0.42, s / 16, s * 0.2); // dentículos
  },
  // ventanas
  ventanaVerde: porteno('#2f5d3a'), ventanaMarron: porteno('#6b4528'), ventanaAzul: porteno('#2f5a7a'),
  ventanaCerrada: porteno('#2f5d3a', true), ventanaCerradaMarron: porteno('#7a5232', true),
  ventanaSimple: (x, s) => {
    x.fillStyle = '#c4c9cc'; x.fillRect(0, 0, s, s);
    GLASS(x, 8, 8, s - 16, s - 16);
    x.fillStyle = 'rgba(245,240,225,.85)'; x.beginPath(); x.moveTo(10, 10); x.lineTo(s * 0.38, 10); x.quadraticCurveTo(s * 0.26, s * 0.5, s * 0.34, s - 10); x.lineTo(10, s - 10); x.fill(); // cortina
    x.fillStyle = '#c4c9cc'; x.fillRect(s / 2 - 3, 8, 6, s - 16);
    INSET(x, 8, 8, s - 16, s - 16, 0.25);
  },
  ventanaLuz: (x, s) => { // ventana de chalet con luz adentro y macetero con flores
    x.fillStyle = '#5a3a22'; x.fillRect(0, 0, s, s);
    GLASS(x, 10, 10, s - 20, s * 0.66, true);
    x.fillStyle = '#5a3a22'; x.fillRect(s / 2 - 4, 10, 8, s * 0.66); x.fillRect(10, s * 0.36, s - 20, 6);
    INSET(x, 10, 10, s - 20, s * 0.66, 0.3);
    x.fillStyle = '#7a4a2b'; x.fillRect(4, s * 0.8, s - 8, s * 0.2);
    x.fillStyle = '#3f7a35'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(10 + i * (s - 20) / 11, s * 0.8, 6, 0, 7); x.fill(); }
    for (let i = 0; i < 9; i++) { x.fillStyle = ['#e14b3c', '#ff7aa8', '#f2c230'][i % 3]; x.beginPath(); x.arc(14 + i * (s - 28) / 8, s * 0.77 - (i % 2) * 4, 5, 0, 7); x.fill(); }
  },
  ventanaArco: (x, s) => { // colonial: arco de medio punto con reja
    x.fillStyle = '#f1ead8'; x.fillRect(0, 0, s, s);
    const r = (s - 32) / 2;
    x.save(); x.beginPath(); x.moveTo(16, s - 8); x.lineTo(16, 8 + r); x.arc(s / 2, 8 + r, r, Math.PI, 0); x.lineTo(s - 16, s - 8); x.closePath(); x.clip();
    GLASS(x, 16, 8, s - 32, s - 16); INSET(x, 16, 8, s - 32, s - 16, 0.4);
    x.fillStyle = '#1b1b1b'; for (let i = 1; i < 6; i++) x.fillRect(16 + i * (s - 32) / 6 - 2, 0, 4, s);
    x.fillRect(0, s * 0.55, s, 4);
    x.restore();
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 4; x.beginPath(); x.moveTo(16, s - 8); x.lineTo(16, 8 + r); x.arc(s / 2, 8 + r, r, Math.PI, 0); x.lineTo(s - 16, s - 8); x.stroke();
  },
  ventanita: (x, s) => { // de adobe: marco grueso de madera y dintel
    x.fillStyle = '#6b4a2b'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#4a3020'; x.fillRect(0, 0, s, 16);
    GLASS(x, 16, 24, s - 32, s - 40); INSET(x, 16, 24, s - 32, s - 40, 0.4);
    x.fillStyle = '#6b4a2b'; x.fillRect(s / 2 - 4, 24, 8, s - 40);
  },
  ventanaBalcon: (x, s) => { // puerta-ventana alta de balcón francés, con la persiana a medio bajar
    x.fillStyle = '#efe9dc'; x.fillRect(0, 0, s, s);
    GLASS(x, 12, 6, s - 24, s - 10);
    louvers(x, 12, 6, s - 24, s * 0.3, '#7a5232');
    x.fillStyle = '#efe9dc'; x.fillRect(s / 2 - 3, 6, 6, s); INSET(x, 12, 6, s - 24, s - 10);
  },
  // puertas y planta baja
  puerta: (x, s) => { // puerta porteña de madera con banderola
    x.fillStyle = '#d9d2c3'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#4a2a18'; x.fillRect(12, 8, s - 24, s - 8);
    x.save(); x.beginPath(); x.rect(16, 12, s - 32, s * 0.22); x.clip(); GLASS(x, 16, 12, s - 32, s * 0.22);
    x.strokeStyle = '#1b1b1b'; x.lineWidth = 3; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(s / 2, 12 + s * 0.22, 8 + i * 12, Math.PI, 0); x.stroke(); }
    x.restore();
    for (const px of [16, s / 2 + 3]) for (const [py, ph] of [[s * 0.34, s * 0.28], [s * 0.66, s * 0.28]]) {
      x.fillStyle = '#5d3822'; x.fillRect(px + 3, py, s / 2 - 22, ph);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 3, py, s / 2 - 22, 3); x.fillRect(px + 3, py, 3, ph);
    }
    x.fillStyle = '#2a170c'; x.fillRect(s / 2 - 1, s * 0.32, 2, s);
    x.fillStyle = '#e0b84a'; x.beginPath(); x.arc(s / 2 - 8, s * 0.62, 4, 0, 7); x.fill(); x.beginPath(); x.arc(s / 2 + 8, s * 0.62, 4, 0, 7); x.fill();
  },
  puertaRustica: (x, s) => {
    x.fillStyle = '#3a2414'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 5; i++) { x.fillStyle = ['#7a4e2c', '#6b4426', '#835632'][i % 3]; x.fillRect(10 + i * (s - 20) / 5, 10, (s - 20) / 5 - 2, s - 10); }
    x.fillStyle = '#1b1b1b'; x.fillRect(12, s * 0.25, s * 0.5, 6); x.fillRect(12, s * 0.75, s * 0.5, 6);
    x.beginPath(); x.arc(s * 0.78, s * 0.55, 5, 0, 7); x.fill();
  },
  puertaIglesia: (x, s) => {
    x.fillStyle = '#f1ead8'; x.fillRect(0, 0, s, s);
    const r = (s - 24) / 2;
    x.fillStyle = '#4a2a18'; x.beginPath(); x.moveTo(12, s); x.lineTo(12, 8 + r); x.arc(s / 2, 8 + r, r, Math.PI, 0); x.lineTo(s - 12, s); x.fill();
    x.fillStyle = '#c9a227'; for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(24 + i * (s - 48) / 3, s * 0.45 + j * s * 0.1, 2.5, 0, 7); x.fill(); }
    x.fillStyle = '#2a170c'; x.fillRect(s / 2 - 1.5, 8, 3, s);
  },
  porton: (x, s) => {
    x.fillStyle = '#5a5550'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#8d8880' : '#9c968e'; x.fillRect(8, 8 + i * (s - 8) / 10, s - 16, (s - 8) / 10); }
  },
  persiana: (x, s) => { // local cerrado con la persiana metálica
    x.fillStyle = '#3a3330'; x.fillRect(0, 0, s, s);
    shopSign(x, s, '#1b2a4a', 'CERRADO');
    for (let y = s * 0.28; y < s; y += 6) { x.fillStyle = '#9ba1a6'; x.fillRect(6, y, s - 12, 4); x.fillStyle = '#6d7378'; x.fillRect(6, y + 4, s - 12, 2); }
  },
  almacen: shop('#2e7d4f', 'ALMACÉN', ['#e14b3c', '#f2c230', '#f4f1e8', '#2f86e0', '#7a4a2b']),
  kiosco: shop('#c0392b', 'KIOSCO', ['#f2c230', '#2f86e0', '#ef8a17', '#ff7aa8']),
  panaderia: shop('#b5803a', 'PANADERÍA', ['#e0b06a', '#c98a40', '#f4dca8']),
  farmacia: shop('#1f8a4c', '✚ FARMACIA', ['#ffffff', '#cfe3f5', '#2f86e0']),
  bar: shop('#1b2a4a', 'BAR · CAFÉ', ['#6b3a1a', '#f4f1e8', '#c0392b']),
  chocolates: shop('#5a2a18', 'CHOCOLATES', ['#4a2512', '#6b3a1a', '#c9a27a', '#e14b3c']),
  pizzeria: shop('#c0392b', 'PIZZERÍA', ['#f6d36b', '#d99a4e', '#2e7d4f', '#f4f1e8']),
  // toldos a rayas
  toldoRojo: (x, s) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f4f1e8' : '#d63a2f'; x.fillRect(i * s / 8, 0, s / 8, s); } },
  toldoVerde: (x, s) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f4f1e8' : '#2e7d4f'; x.fillRect(i * s / 8, 0, s / 8, s); } },
  toldoAzul: (x, s) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f4f1e8' : '#2f5a9a'; x.fillRect(i * s / 8, 0, s / 8, s); } },
  // reja de balcón (tiene partes transparentes)
  reja: (x, s) => {
    x.clearRect(0, 0, s, s);
    x.fillStyle = '#1e1e22';
    x.fillRect(0, 0, s, 10); x.fillRect(0, s - 8, s, 8);
    for (let i = 0; i < 8; i++) x.fillRect(i * s / 8 + s / 16 - 3, 0, 6, s);
    x.lineWidth = 4; x.strokeStyle = '#1e1e22';
    for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(i * s / 4 + s / 8, s * 0.5, s / 12, 0, 7); x.stroke(); }
  },
  arco: (x, s) => { // arcada abierta (cabildos): arco de medio punto con sombra adentro
    x.fillStyle = '#f1ead8'; x.fillRect(0, 0, s, s);
    const r = (s - 24) / 2;
    const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#3a3128'); g.addColorStop(1, '#6b5d4c');
    x.fillStyle = g; x.beginPath(); x.moveTo(12, s); x.lineTo(12, 10 + r); x.arc(s / 2, 10 + r, r, Math.PI, 0); x.lineTo(s - 12, s); x.fill();
    x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(12, 10 + r, 6, s);
  },
  blanco: (x, s) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s); },
};

const SLOT = {};
let atlas = null, material = null;
function getMaterial() {
  if (material) return material;
  const c = document.createElement('canvas'); c.width = c.height = SIZE;
  const x = c.getContext('2d');
  Object.keys(CELLS).forEach((name, i) => {
    const col = i % N, row = Math.floor(i / N);
    SLOT[name] = [col, row];
    x.save(); x.translate(col * CELL, row * CELL); x.beginPath(); x.rect(0, 0, CELL, CELL); x.clip();
    CELLS[name](x, CELL);
    x.restore();
  });
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 8;
  atlas.minFilter = THREE.LinearMipmapLinearFilter;
  material = new THREE.MeshStandardMaterial({ map: atlas, vertexColors: true, roughness: 0.82, alphaTest: 0.5 });
  material.name = 'fachadas';
  return material;
}
export const buildingMaterial = getMaterial;
// El mismo material pero teñido (para piezas que se repintan enteras, como las paredes de Caminito)
const tinted = new Map();
export function tintedMaterial(color) {
  if (!tinted.has(color)) { const m = getMaterial().clone(); m.color.set(color); tinted.set(color, m); }
  return tinted.get(color);
}

// ---------- Armador ----------
// Cada cara es un polígono convexo en un plano (o = origen, u y v = ejes unitarios del plano).
// Se reparte en baldosas de tu x tv: cada baldosa usa la celda entera del atlas (la última, un pedazo).
const E = 1.5 / SIZE; // margen para que no se mezcle con la celda vecina
const _c = new THREE.Color();
export class Builder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; getMaterial(); }
  color(hex, jitter = 0) {
    _c.set(hex);
    if (jitter) _c.multiplyScalar(1 + (Math.random() - 0.5) * jitter);
    return [_c.r, _c.g, _c.b];
  }
  // pts: [[a, b], ...] en coordenadas del plano; cell: nombre de la celda; col: [r, g, b]
  poly(o, u, v, pts, cell, col, tu = Infinity, tv = Infinity, jitter = 0) {
    const [cx, cy] = SLOT[cell];
    const nrm = new THREE.Vector3().crossVectors(u, v).normalize();
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [a, b] of pts) { a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    if (tu === Infinity) tu = a1 - a0;
    if (tv === Infinity) tv = b1 - b0;
    const nu = Math.max(1, Math.ceil((a1 - a0) / tu - 1e-4)), nv = Math.max(1, Math.ceil((b1 - b0) / tv - 1e-4));
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const ta = a0 + i * tu, tb = b0 + j * tv;
      let poly = [[ta, tb], [Math.min(ta + tu, a1), tb], [Math.min(ta + tu, a1), Math.min(tb + tv, b1)], [ta, Math.min(tb + tv, b1)]];
      if (pts.length !== 4 || pts.some(([a, b]) => (a !== a0 && a !== a1) || (b !== b0 && b !== b1))) poly = clip(poly, pts);
      if (poly.length < 3) continue;
      const k = jitter ? 1 + (Math.random() - 0.5) * jitter : 1;
      for (let t = 1; t < poly.length - 1; t++) for (const q of [poly[0], poly[t], poly[t + 1]]) {
        const P = o.clone().addScaledVector(u, q[0]).addScaledVector(v, q[1]);
        this.p.push(P.x, P.y, P.z); this.n.push(nrm.x, nrm.y, nrm.z);
        const fu = (q[0] - ta) / tu, fv = (q[1] - tb) / tv;
        this.uv.push((cx + E * N + fu * (1 - 2 * E * N)) / N, 1 - (cy + 1 - E * N - fv * (1 - 2 * E * N)) / N);
        this.c.push(col[0] * k, col[1] * k, col[2] * k);
      }
    }
  }
  // Rectángulo vertical u horizontal: o = esquina, u y v = vectores con largo
  rect(o, u, v, cell, col, tu, tv, jitter) {
    const lu = u.length(), lv = v.length();
    this.poly(o, u.clone().divideScalar(lu), v.clone().divideScalar(lv), [[0, 0], [lu, 0], [lu, lv], [0, lv]], cell, col, tu, tv, jitter);
  }
  // Caja (sin la cara de abajo). cells: { side, top } ; tile: tamaño de la baldosa
  box(cx, cy, cz, w, h, d, cells, col, tile = Infinity, topCol = col) {
    const side = typeof cells === 'string' ? cells : cells.side, top = typeof cells === 'string' ? cells : cells.top;
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    this.rect(V(x0, y0, z1), V(w, 0, 0), V(0, h, 0), side, col, tile, tile);
    this.rect(V(x1, y0, z0), V(-w, 0, 0), V(0, h, 0), side, col, tile, tile);
    this.rect(V(x1, y0, z1), V(0, 0, -d), V(0, h, 0), side, col, tile, tile);
    this.rect(V(x0, y0, z0), V(0, 0, d), V(0, h, 0), side, col, tile, tile);
    this.rect(V(x0, y1, z1), V(w, 0, 0), V(0, 0, -d), top, topCol, tile, tile);
  }
  // Copia lo armado en otro armador, movido con la matriz m
  appendTo(B, m) {
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < this.p.length; i += 3) {
      p.fromArray(this.p, i).applyMatrix4(m); n.fromArray(this.n, i).transformDirection(m);
      B.p.push(p.x, p.y, p.z); B.n.push(n.x, n.y, n.z);
    }
    B.uv.push(...this.uv); B.c.push(...this.c);
  }
  mesh(material = getMaterial()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}
// Recorta un polígono convexo contra otro convexo (Sutherland–Hodgman)
function clip(subject, clipPts) {
  let out = subject;
  const n = clipPts.length;
  let area = 0; for (let i = 0; i < n; i++) { const [a, b] = clipPts[i], [c, d] = clipPts[(i + 1) % n]; area += a * d - c * b; }
  const s = Math.sign(area) || 1;
  for (let i = 0; i < n && out.length; i++) {
    const A = clipPts[i], B = clipPts[(i + 1) % n];
    const inside = (p) => s * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) >= -1e-9;
    const inter = (p, q) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], ex = B[0] - A[0], ey = B[1] - A[1];
      const t = (ex * (p[1] - A[1]) - ey * (p[0] - A[0])) / (ey * dx - ex * dy);
      return [p[0] + dx * t, p[1] + dy * t];
    };
    const inp = out; out = [];
    for (let k = 0; k < inp.length; k++) {
      const P = inp[k], Q = inp[(k + 1) % inp.length];
      const pi = inside(P), qi = inside(Q);
      if (pi) out.push(P);
      if (pi !== qi) out.push(inter(P, Q));
    }
  }
  return out;
}

// ---------- Edificio ----------
// Frente = +z. Opciones:
//   w, d, h: ancho, fondo y alto de las paredes · wall: celda de la pared · tint: color de la pared
//   floorH: alto de cada piso · bay: ancho de cada ventana con su pared · win: celda (o lista) de ventana
//   ground: lo que va en la planta baja del frente (y del fondo si groundBack): 'puerta', 'almacen', 'persiana'...
//   base: zócalo de granito · cornice: cornisa arriba · belt: moldura entre la planta baja y el primer piso
//   balcony: probabilidad de balcón en cada ventana de los pisos altos (frente y fondo)
//   roof: 'flat' | 'gable' (a dos aguas, cumbrera a lo largo de x) | 'gableZ' | 'shed' | 'hip' | 'none'
//   roofCell, roofTint, rise: alto del techo, over: alero · sides: 'all' | 'front' | 'frontBack'
//   awning: celda de toldo sobre la planta baja · winW, winH: tamaño de la ventana (de 0 a 1 del módulo)
//   groundCell, groundTint: otra pared para la planta baja · doorW: ancho máximo de las puertas · trim: color de molduras
//   tile: tamaño de cada baldosa de pared · jitter: cuánto varía el color de una baldosa a otra · tank: tanque de agua
//   wallB: otro armador para las paredes (si se las quiere en una pieza aparte)
export function building(o) {
  const B = new Builder();
  addBuilding(B, o);
  return B.mesh();
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function addBuilding(B, {
  w, d, h, x = 0, z = 0, y = 0, wall = 'revoque', tint = '#e8dcc4', floorH = 1.3, bay = 1.15, win = 'ventanaVerde',
  ground = null, groundBack = false, groundCell = null, groundTint = null, base = true, cornice = true, belt = true, balcony = 0,
  roof = 'flat', roofCell = 'tejas', roofTint = '#b5583c', rise = null, over = 0.22, sides = 'all', awning = null,
  winW = 0.5, winH = 0.62, tile = 1.1, jitter = 0.08, trim = null, sill = true, tank = false, wallB = B, doorW = 0.75,
}) {
  const wallCol = B.color(tint), trimCol = B.color(trim || lighten(tint, 0.35)), white = [1, 1, 1];
  const floors = Math.max(1, Math.round(h / floorH)), fh = h / floors;
  const wins = Array.isArray(win) ? win : [win];
  // Las cuatro caras: [origen, eje a lo largo, normal, largo, tipo]
  const faces = [
    [V3(x - w / 2, y, z + d / 2), V3(1, 0, 0), V3(0, 0, 1), w, 'front'],
    [V3(x + w / 2, y, z - d / 2), V3(-1, 0, 0), V3(0, 0, -1), w, 'back'],
    [V3(x + w / 2, y, z + d / 2), V3(0, 0, -1), V3(1, 0, 0), d, 'side'],
    [V3(x - w / 2, y, z - d / 2), V3(0, 0, 1), V3(-1, 0, 0), d, 'side'],
  ];
  const up = V3(0, 1, 0);
  for (const [o, along, nrm, len, kind] of faces) {
    const withWin = sides !== 'none' && (sides === 'all' || kind === 'front' || (sides === 'frontBack' && kind === 'back'));
    const groundHere = ground && (kind === 'front' || (groundBack && kind === 'back'));
    const bays = Math.max(1, Math.round(len / bay)), bw = len / bays;
    for (let f = 0; f < floors; f++) {
      const y0 = y + f * fh;
      const wc = f === 0 && groundCell ? groundCell : wall, col = f === 0 && groundTint ? B.color(groundTint) : wallCol;
      wallB.rect(o.clone().setY(y0), along.clone().multiplyScalar(len), up.clone().multiplyScalar(fh), wc, col, tile, tile, jitter);
      if (!withWin) continue;
      for (let i = 0; i < bays; i++) {
        const cx = (i + 0.5) * bw, out = nrm.clone().multiplyScalar(0.018);
        const at = (a, b) => o.clone().addScaledVector(along, a).setY(b).add(out);
        if (f === 0 && groundHere) {
          // Planta baja: puerta en el medio, locales o puertas en el resto
          const cell = Array.isArray(ground) ? ground[i % ground.length] : (i === Math.floor(bays / 2) || !/puerta/.test(ground) ? ground : wins[0]);
          const isDoor = /puerta|porton/.test(cell);
          const ww = isDoor ? Math.min(bw * (doorW > 0.8 ? 0.8 : 0.62), doorW) : (/ventana/.test(cell) ? bw * winW : bw * 0.9), wh = isDoor ? fh * 0.82 : (/ventana/.test(cell) ? fh * winH : fh * 0.86);
          const yb = /ventana/.test(cell) ? y0 + fh * 0.28 : y0;
          B.rect(at(cx - ww / 2, yb), along.clone().multiplyScalar(ww), up.clone().multiplyScalar(wh), cell, white);
          if (awning && !isDoor) addAwning(B, at(cx - ww / 2 - 0.05, y0 + fh * 0.88), along, nrm, ww + 0.1, awning);
          continue;
        }
        const cell = wins[(i * 7 + f * 3 + (kind === 'back' ? 1 : 0)) % wins.length];
        const balc = f > 0 && kind !== 'side' && Math.random() < balcony;
        const ww = bw * winW, wh = balc ? fh * 0.8 : fh * winH, yb = balc ? y0 + 0.02 : y0 + fh * 0.24;
        B.rect(at(cx - ww / 2, yb), along.clone().multiplyScalar(ww), up.clone().multiplyScalar(wh), balc ? 'ventanaBalcon' : cell, white);
        if (balc) addBalcony(B, at(cx, y0), along, nrm, Math.min(bw * 0.9, ww + 0.45), trimCol);
        else if (sill) { const c = at(cx, yb - 0.03).addScaledVector(nrm, 0.04); addSlab(B, c, along, nrm, ww + 0.12, 0.06, 0.1, 'cornisa', trimCol); }
      }
    }
    if (belt && floors > 1 && withWin) { const c = o.clone().addScaledVector(along, len / 2).setY(y + fh).addScaledVector(nrm, 0.03); addSlab(B, c, along, nrm, len + 0.06, 0.09, 0.06, 'cornisa', trimCol); }
    if (base) { const c = o.clone().addScaledVector(along, len / 2).setY(y + 0.16).addScaledVector(nrm, 0.02); addSlab(B, c, along, nrm, len + 0.04, 0.32, 0.04, 'granito', white, 0.8); }
  }
  // Cornisa y techo
  const top = y + h;
  if (roof === 'flat') {
    if (cornice) { B.box(x, top + 0.13, z, w + 0.2, 0.26, d + 0.2, { side: 'cornisa', top: 'cornisa' }, trimCol); B.rect(V3(x - w / 2, top + 0.27, z + d / 2), V3(w, 0, 0), V3(0, 0, -d), 'azotea', white, 1.4, 1.4); }
    else B.rect(V3(x - w / 2, top, z + d / 2), V3(w, 0, 0), V3(0, 0, -d), 'azotea', white, 1.5, 1.5);
    if (tank) B.box(x + w * 0.2, top + 0.6, z - d * 0.15, 0.7, 0.7, 0.7, { side: 'revoque', top: 'azotea' }, B.color('#b7b2a8'), Infinity, white);
  } else if (roof !== 'none') {
    if (cornice) B.box(x, top + 0.06, z, w + 0.08, 0.12, d + 0.08, { side: 'cornisa', top: 'cornisa' }, trimCol);
    addRoof(B, roof, x, top + (cornice ? 0.15 : 0), z, w, d, rise ?? Math.min(w, d) * 0.42, over, roofCell, B.color(roofTint), wall, wallCol, wallB);
  }
  return B;
}
export function lighten(hex, k) { _c.set(hex); const c = _c.clone().lerp(new THREE.Color('#ffffff'), k); return '#' + c.getHexString(); }

// Losa o moldura saliente: c = centro de la cara de adelante abajo... (centro de la pieza pegada a la pared)
function addSlab(B, c, along, nrm, len, hgt, dep, cell, col, tile = 1.1) {
  const o = c.clone().addScaledVector(along, -len / 2).addScaledVector(nrm, dep / 2).add(V3(0, -hgt / 2, 0));
  const up = V3(0, hgt, 0);
  B.rect(o, along.clone().multiplyScalar(len), up, cell, col, tile, Infinity); // frente
  B.rect(o.clone().add(up), along.clone().multiplyScalar(len), nrm.clone().multiplyScalar(-dep), cell, col, tile, Infinity); // arriba
  const back = o.clone().addScaledVector(nrm, -dep);
  B.rect(back, nrm.clone().multiplyScalar(dep), up, cell, col); // costado izquierdo
  B.rect(o.clone().addScaledVector(along, len), nrm.clone().multiplyScalar(-dep), up, cell, col); // costado derecho
}
function addBalcony(B, c, along, nrm, len, col) {
  const dep = 0.42;
  addSlab(B, c.clone().addScaledVector(nrm, dep / 2), along, nrm, len, 0.08, dep, 'cornisa', col);
  const ry = c.y + 0.04, rh = 0.42, white = [1, 1, 1];
  const fl = c.clone().setY(ry).addScaledVector(along, -len / 2).addScaledVector(nrm, dep);
  B.rect(fl, along.clone().multiplyScalar(len), V3(0, rh, 0), 'reja', white, 0.5, Infinity);
  B.rect(fl.clone().addScaledVector(along, len), along.clone().multiplyScalar(-len), V3(0, rh, 0), 'reja', white, 0.5, Infinity); // la reja vista desde adentro
  const sideL = c.clone().setY(ry).addScaledVector(along, -len / 2);
  B.rect(sideL, nrm.clone().multiplyScalar(dep), V3(0, rh, 0), 'reja', white, 0.5, Infinity);
  B.rect(sideL.clone().addScaledVector(nrm, dep), nrm.clone().multiplyScalar(-dep), V3(0, rh, 0), 'reja', white, 0.5, Infinity);
  const sideR = c.clone().setY(ry).addScaledVector(along, len / 2).addScaledVector(nrm, dep);
  B.rect(sideR, nrm.clone().multiplyScalar(-dep), V3(0, rh, 0), 'reja', white, 0.5, Infinity);
  B.rect(sideR.clone().addScaledVector(nrm, -dep), nrm.clone().multiplyScalar(dep), V3(0, rh, 0), 'reja', white, 0.5, Infinity);
}
// Toldo inclinado: o = esquina de arriba pegada a la pared
export function addAwning(B, o, along, nrm, len, cell, dep = 0.42, drop = 0.26) {
  const white = [1, 1, 1];
  const slope = nrm.clone().multiplyScalar(dep).add(V3(0, -drop, 0));
  B.rect(o.clone().add(slope), along.clone().multiplyScalar(len), slope.clone().negate(), cell, white, 0.6, Infinity);
  B.rect(o.clone().add(slope).add(along.clone().multiplyScalar(len)), along.clone().multiplyScalar(-len), slope.clone(), cell, white, 0.6, Infinity); // por abajo
  const lo = o.clone().add(slope).add(V3(0, -0.14, 0));
  B.rect(lo, along.clone().multiplyScalar(len), V3(0, 0.14, 0), cell, white, 0.6, Infinity); // faldón
}
// Techos inclinados. La cumbrera va a lo largo de x ('gable'), de z ('gableZ'), a un agua ('shed') o en punta ('hip')
export function addRoof(B, kind, x, y, z, w, d, rise, over, cell, col, gableCell = 'revoque', gableCol = [1, 1, 1], GB = B) {
  const tl = 0.9;
  if (kind === 'gableZ') { // misma cosa girada: armamos con w y d cambiados y rotamos los puntos
    const sub = new Builder();
    const subG = GB === B ? sub : new Builder();
    addRoof(sub, 'gable', 0, 0, 0, d, w, rise, over, cell, col, gableCell, gableCol, subG);
    const m = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(x, y, z);
    sub.appendTo(B, m); if (subG !== sub) subG.appendTo(GB, m);
    return;
  }
  const hw = w / 2 + over, hd = d / 2;
  if (kind === 'gable' || kind === 'shed') {
    const ridgeZ = kind === 'shed' ? z - hd : z, run = kind === 'shed' ? d : hd;
    const ext = over * 0.8, slopeLen = Math.hypot(run + ext, rise + ext * rise / run);
    const sides = kind === 'shed' ? [1] : [1, -1];
    for (const s of sides) {
      const eave = V3(0, y - ext * rise / run, (kind === 'shed' ? z + hd : z + s * hd) + s * ext);
      const ridge = V3(0, y + rise, ridgeZ);
      const vdir = ridge.clone().sub(eave).normalize();
      const o = eave.clone().setX(x - hw * s);
      const u = V3(s, 0, 0);
      B.poly(o, u, vdir, [[0, 0], [hw * 2, 0], [hw * 2, slopeLen], [0, slopeLen]], cell, col, tl, tl, 0.06);
      // canto del alero (grosor)
      B.rect(o.clone().add(V3(0, -0.07, 0)), u.clone().multiplyScalar(hw * 2), V3(0, 0.07, 0), cell, col.map((v) => v * 0.6), tl, Infinity);
    }
    // Hastiales (los triángulos de pared en las puntas)
    for (const s of [1, -1]) {
      const o = V3(x + s * w / 2, y, z + s * hd);
      const pts = kind === 'shed' ? (s > 0 ? [[0, 0], [d, 0], [d, rise]] : [[0, 0], [d, 0], [0, rise]]) : [[0, 0], [d, 0], [hd, rise]];
      GB.poly(o, V3(0, 0, -s), V3(0, 1, 0), pts, gableCell, gableCol, 1.1, 1.1, 0.06);
    }
    // Si es a un agua, la pared de atrás que sube hasta el techo
    if (kind === 'shed') GB.rect(V3(x + w / 2, y, z - hd), V3(-w, 0, 0), V3(0, rise, 0), gableCell, gableCol, 1.1, 1.1);
  } else if (kind === 'hip') {
    const hx = w / 2 + over, hz = d / 2 + over, ry = y + rise;
    const ridge = Math.max(0, hx - hz); // cumbrera corta si no es cuadrado
    const corners = [V3(x - hx, y - over * 0.4, z + hz), V3(x + hx, y - over * 0.4, z + hz), V3(x + hx, y - over * 0.4, z - hz), V3(x - hx, y - over * 0.4, z - hz)];
    const tops = [V3(x - ridge, ry, z), V3(x + ridge, ry, z)];
    const tri = (a, b, c, quad) => { // cara plana a-b (alero) hasta c (y quad si es trapecio)
      const u = b.clone().sub(a); const lu = u.length(); u.divideScalar(lu);
      const nrm0 = u.clone().cross(c.clone().sub(a)).normalize();
      const v = nrm0.clone().cross(u).normalize();
      const P = (p) => { const q = p.clone().sub(a); return [q.dot(u), q.dot(v)]; };
      B.poly(a, u, v, quad ? [P(a), P(b), P(quad), P(c)] : [P(a), P(b), P(c)], cell, col, tl, tl, 0.06);
    };
    tri(corners[0], corners[1], tops[0], tops[1]);
    tri(corners[2], corners[3], tops[1], tops[0]);
    tri(corners[1], corners[2], tops[1]);
    tri(corners[3], corners[0], tops[0]);
  }
}

// ---------- Recetas listas ----------
const pickR = (r, a) => a[Math.floor(r() * a.length)];
export function rnd(seed = Math.random() * 1e9) { let s = Math.floor(seed) % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// Edificio porteño de departamentos (frente +z y fondo -z con planta baja)
export function edificioPorteno(w, h, d, color, seed) {
  const r = rnd(seed ?? Math.random() * 1e9);
  const wins = pickR(r, [['ventanaVerde', 'ventanaCerrada'], ['ventanaMarron', 'ventanaCerradaMarron'], ['ventanaSimple'], ['ventanaAzul', 'ventanaSimple']]);
  const shops = pickR(r, [['almacen'], ['kiosco'], ['panaderia'], ['bar'], ['farmacia'], ['persiana'], ['puerta']]);
  return building({
    w, d, h, tint: color, wall: r() < 0.2 ? 'ladrilloClaro' : 'revoque', win: wins,
    ground: shops[0] === 'puerta' ? 'puerta' : [shops[0], 'puerta', 'persiana'], groundBack: true,
    groundCell: r() < 0.5 ? 'piedra' : null, groundTint: '#d8d0c0',
    awning: shops[0] !== 'persiana' && shops[0] !== 'puerta' && r() < 0.6 ? pickR(r, ['toldoRojo', 'toldoVerde', 'toldoAzul']) : null,
    balcony: h > 3.5 ? 0.45 : 0, tank: h > 4 && r() < 0.6, bay: 1.05,
  });
}

// Casita de chapa de Caminito. Las paredes van en una pieza aparte (children[0]) con su propio material,
// así un minijuego puede repintarlas enteras cambiando material.color
export function casitaChapa(color, roofColor, w = 3, h = 3.2, d = 2.4) {
  const g = new THREE.Group();
  const B = new Builder(), W = new Builder();
  const two = h >= 2.6;
  addBuilding(B, {
    w, d, h, wall: 'chapa', tint: '#ffffff', trim: '#f4f1e8', wallB: W, floorH: two ? h / 2 : h, bay: w / 2.2,
    win: Math.random() < 0.5 ? ['ventanaVerde', 'ventanaCerrada'] : ['ventanaMarron', 'ventanaCerradaMarron'], ground: 'puerta',
    balcony: 0.7, roof: 'shed', roofCell: 'chapa', roofTint: roofColor, rise: 0.45, over: 0.2, cornice: false, jitter: 0.12, tile: 0.95,
    winW: 0.46, winH: 0.6,
  });
  g.add(W.mesh(tintedMaterial(color)), B.mesh());
  return g;
}

// Chalet de montaña: base de piedra, paredes de troncos, tablas o chapa y techo a dos aguas con la punta al frente
export function chaletMontana(wall, roof, w = 3, h = 2.4, { style = 'troncos', roofCell = style === 'chapa' ? 'chapa' : 'tejuela', d = w * 0.8, ground = 'puertaRustica' } = {}) {
  const B = new Builder();
  const baseH = Math.min(0.8, h * 0.33);
  addBuilding(B, { w, d, h: baseH, wall: 'piedra', tint: '#ffffff', sides: 'none', roof: 'none', cornice: false, belt: false, base: false, jitter: 0.05 });
  addBuilding(B, {
    w, d, h: h - baseH, y: baseH, wall: style, tint: wall, floorH: h - baseH, bay: w / 3, win: style === 'chapa' ? 'ventanaSimple' : 'ventanaLuz',
    ground, base: false, belt: false, cornice: false, roof: 'gableZ', roofCell, roofTint: roof, rise: w * 0.42, over: 0.28,
    winW: 0.62, winH: 0.62, sill: false, trim: '#f4f1e8',
  });
  // Ventanita en el triángulo del frente y escalones de la entrada
  const ww = w * 0.24;
  B.rect(V3(-ww / 2, h + 0.12, d / 2 + 0.02), V3(ww, 0, 0), V3(0, ww * 1.1, 0), style === 'chapa' ? 'ventanaSimple' : 'ventanaLuz', [1, 1, 1]);
  B.box(0, baseH / 4, d / 2 + 0.22, w * 0.3, baseH / 2, 0.44, 'piedra', [1, 1, 1], 0.6);
  return B.mesh();
}

// Casa baja de adobe con techo plano de barro y vigas que asoman (Mendoza, Purmamarca)
export function casaAdobe(color, w = 2.6, d = 2.2, h = 2) {
  const B = new Builder();
  addBuilding(B, {
    w, d, h, wall: 'adobe', tint: color, floorH: h, bay: w / 2, win: 'ventanita', ground: 'puertaRustica', base: false, belt: false,
    cornice: false, roof: 'none', winW: 0.42, winH: 0.42, sill: false, jitter: 0.12,
  });
  B.box(0, h + 0.09, 0, w + 0.24, 0.18, d + 0.24, { side: 'adobe', top: 'azotea' }, B.color(lighten(color, -0.15)), 1.1, B.color('#f2d6ae'));
  for (let i = 0; i < 4; i++) B.box(-w / 2 + (i + 0.5) * w / 4, h - 0.1, d / 2 + 0.16, 0.1, 0.1, 0.34, 'madera', B.color('#6b4a2b'), 1.1);
  return B.mesh();
}

// Hotel o casino de ladrillo y piedra con techo de pizarra (Mar del Plata)
export function hotelLadrillo(stone = '#d9c7a8', w = 9, d = 4, h = 5) {
  return building({
    w, d, h, wall: 'ladrillo', tint: '#ffffff', groundCell: 'piedra', groundTint: '#ffffff', floorH: h / 3, bay: 1.3,
    win: ['ventanaArco', 'ventanaSimple'], ground: ['ventanaArco', 'ventanaArco', 'puertaIglesia', 'ventanaArco', 'ventanaArco'], groundBack: true,
    trim: stone, balcony: 0.35, roof: 'hip', roofCell: 'tejuela', roofTint: '#5e6b7a', rise: 1.5, over: 0.15, winW: 0.5, tile: 1.2,
  });
}

// Galpón de ladrillo con techos de chapa en serrucho (los Docks de Puerto Madero)
export function galponLadrillo(w = 7, d = 4, h = 3.6, roofColor = '#6b2a1c') {
  const B = new Builder();
  addBuilding(B, { w, d, h, wall: 'ladrillo', tint: '#ffffff', floorH: h / 2, bay: 1.35, win: 'ventanaArco', ground: ['ventanaArco', 'porton'], groundBack: true, roof: 'none', cornice: false, trim: '#efe6d3', winW: 0.55, winH: 0.66 });
  const n = 3, sw = w / n;
  for (let i = 0; i < n; i++) addRoof(B, 'gableZ', -w / 2 + (i + 0.5) * sw, h, 0, sw, d, 1.1, 0.15, 'chapa', B.color(roofColor), 'ladrillo', [1, 1, 1]);
  return B.mesh();
}

// Torre de vidrio
export function torreVidrio(h, color = '#7fb7d9', w = 3.2) {
  return building({ w, d: w, h, wall: 'vidrio', tint: lighten(color, 0.45), sides: 'none', floorH: 1.2, tile: 1.2, belt: false, base: true, trim: '#e8eef2', jitter: 0.04 });
}

// Chalet marplatense: planta baja de piedra, arriba revoque y techo de tejas
export function chaletPiedra(color, roofColor, w = 2.6, h = 2.6, d = 2.4) {
  return building({
    w, d, h, wall: 'revoque', tint: color, groundCell: 'piedra', groundTint: '#ffffff', floorH: h / 2, bay: w / 2,
    win: ['ventanaMarron', 'ventanaVerde', 'ventanaCerradaMarron'], ground: 'puerta', roof: 'gable', roofCell: 'tejas', roofTint: roofColor,
    rise: d * 0.45, over: 0.25, cornice: false, trim: '#efe6d3', winW: 0.46,
  });
}

// Bodega mendocina: paredes blancas, portones en arco y techo de tejas
export function bodega(w = 7, d = 4, h = 3.2) {
  return building({
    w, d, h, wall: 'revoque', tint: '#efe3cc', floorH: h, bay: w / 3, win: 'ventanaArco', ground: ['puertaIglesia'], doorW: 1.4,
    roof: 'gable', roofCell: 'tejas', roofTint: '#b5583c', rise: 1.5, over: 0.3, trim: '#d9c7a8', winW: 0.3, winH: 0.4,
  });
}

// Kiosco de chapa con cartel y vidriera
export function kioscoChapa(color = '#2e9e48') {
  return building({
    w: 2, d: 1.6, h: 1.8, wall: 'chapa', tint: color, floorH: 1.8, bay: 2, ground: 'kiosco', sides: 'front', trim: '#e14b3c',
    base: false, belt: false, jitter: 0.06, tile: 0.9,
  });
}

// Torre Monumental de Retiro: ladrillo, bandas de piedra y techo de cobre
export function torreMonumental() {
  const B = new Builder();
  const white = [1, 1, 1], cream = B.color('#f1ead8');
  B.box(0, 0.3, 0, 2.4, 0.6, 2.4, { side: 'piedra', top: 'granito' }, white, 0.8);
  B.box(0, 4.2, 0, 1.8, 7.5, 1.8, 'ladrillo', white, 1);
  for (const y of [2, 5.1]) B.box(0, y, 0, 1.92, 0.16, 1.92, 'cornisa', cream);
  B.box(0, 8.1, 0, 2.1, 0.3, 2.1, 'cornisa', cream);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, n = V3(Math.sin(a), 0, Math.cos(a)), along = V3(Math.cos(a), 0, -Math.sin(a));
    for (const y of [2.5, 3.8, 5.6]) B.rect(n.clone().multiplyScalar(0.92).addScaledVector(along, -0.22).setY(y), along.clone().multiplyScalar(0.44), V3(0, 0.95, 0), 'ventanaArco', white);
  }
  addRoof(B, 'hip', 0, 8.25, 0, 1.8, 1.8, 2, 0.22, 'chapa', B.color('#5f9c86'));
  return B.mesh();
}

// Casa Rosada: revoque rosa, ventanas en arco con moldura, pilastras, balcones y el cuerpo central más alto
export function casaRosada() {
  const B = new Builder();
  const ground = ['ventanaArco', 'ventanaArco', 'ventanaArco', 'ventanaArco', 'puertaIglesia', 'ventanaArco', 'ventanaArco', 'ventanaArco', 'ventanaArco'];
  addBuilding(B, { w: 10, d: 3, h: 4, wall: 'revoque', tint: '#e8a3a8', trim: '#f7dfe0', floorH: 2, bay: 10 / 9, win: 'ventanaArco', ground, groundBack: true, balcony: 0.5, winW: 0.46, winH: 0.66, jitter: 0.05 });
  addBuilding(B, { w: 3, d: 3.2, h: 1.6, y: 4.27, wall: 'revoque', tint: '#e8a3a8', trim: '#f7dfe0', floorH: 1.6, bay: 1, win: 'ventanaArco', base: false, belt: false, jitter: 0.05 });
  const pil = B.color('#f3c9cb');
  for (let k = 0; k <= 9; k++) for (const s of [1, -1]) B.box(-5 + k * 10 / 9, 2, s * 1.56, 0.16, 3.9, 0.1, 'cornisa', pil);
  return B.mesh();
}
