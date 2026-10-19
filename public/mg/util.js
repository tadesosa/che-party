// Ayudas compartidas por las escenas de minijuegos.
import * as THREE from 'three';
import { animateChar } from '../models.js';

// Acerca suavemente el personaje a la posición del servidor
export function follow(g, x, z, k, y = null) {
  g.position.x += (x - g.position.x) * k;
  g.position.z += (z - g.position.z) * k;
  if (y != null) g.position.y += (y - g.position.y) * k;
}

// Gira hacia un ángulo por el camino más corto
export function face(g, ang, k) {
  let d = ang - g.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  g.rotation.y += d * k;
}

// Saltito al caminar + estirarse/aplastarse
export function walkAnim(g, time, speed, phase = 0) {
  const body = g.userData.body;
  const moving = Math.min(1, speed);
  const s = Math.abs(Math.sin(time * 12 + phase));
  body.position.y = s * 0.18 * moving;
  body.scale.y = 1 + (s - 0.5) * 0.12 * moving;
  body.scale.x = body.scale.z = 1 - (s - 0.5) * 0.06 * moving;
  body.rotation.z = Math.sin(time * 12 + phase) * 0.08 * moving;
  animateChar(g, time, { walk: moving, phase });
}

// Velocidad aproximada a partir del movimiento entre cuadros
export function speedOf(g, dt) {
  const p = g.position;
  const last = g.userData.lastPos || p.clone();
  const v = last.distanceTo(p) / Math.max(dt, 1e-3);
  g.userData.lastPos = p.clone();
  return v;
}

export function plane(w, h, material, { x = 0, y = 0, z = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
  return m;
}

export const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...opts });

// Cámara de carrera: encuadra del último al primero, así nadie queda afuera. Si están muy separados, se aleja.
// lo / hi: posición del último y del primero sobre el eje de la carrera. base: distancia normal de la cámara.
// per: cuánto se ve por cada unidad de distancia (1.45 a lo ancho, 0.85 a lo alto).
// Devuelve el centro a mirar (c) y por cuánto multiplicar la distancia (z, 1 = normal).
export function fitSpan(st, lo, hi, dt, { base = 15, margin = 6, per = 1.45, minC = -Infinity, maxC = Infinity } = {}) {
  const mid = Math.max(minC, Math.min(maxC, (lo + hi) / 2));
  const zoom = Math.max(1, (hi - lo + margin * 2) / per / base);
  const k = Math.min(1, dt * 2.2);
  st.camC = st.camC == null ? mid : st.camC + (mid - st.camC) * k;
  st.camZ = st.camZ == null ? zoom : st.camZ + (zoom - st.camZ) * k;
  return { c: st.camC, z: st.camZ };
}

// Reparte n cosas en una fila centrada
export function rowX(i, n, spacing) {
  return n === 1 ? 0 : -((n - 1) * spacing) / 2 + i * spacing;
}

// Medidor flotante (como el del celu) con la zona buena configurable: zone = [g0, g1, p0, p1] de 0 a 1
export function makeMeter(zone = [0.33, 0.67, 0.44, 0.56], w = 2.4) {
  const g = new THREE.Group();
  const basic = (color) => new THREE.MeshBasicMaterial({ color });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.46, 0.06), basic('#1b2a4a')); frame.position.z = -0.03;
  const bg = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, 0.08), basic('#fff3d6'));
  const band = (a, b, color, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * (b - a), 0.33, d), basic(color)); m.position.x = ((a + b) / 2 - 0.5) * w; return m; };
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.12), basic('#1b2a4a'));
  g.add(frame, bg, band(zone[0], zone[1], '#7fd18c', 0.09), band(zone[2], zone[3], '#2e9e48', 0.1), needle);
  g.userData.needle = needle; g.userData.w = w;
  return g;
}
export function setNeedle(meter, v, k = 1) {
  const nd = meter.userData.needle, x = (v - 0.5) * meter.userData.w;
  nd.position.x += (x - nd.position.x) * k;
}

// Cartel de texto pintado en un canvas (para billetes, carteles, etc.)
export function canvasPlane(w, h, draw, px = 256) {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w);
  draw(c.getContext('2d'), c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}
