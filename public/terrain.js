// Altura del piso de cada tablero. Es la misma cuenta que heightAt() de board.js (el servidor la usa
// para la altura de las casillas); si se cambia una hay que cambiar la otra.
import * as THREE from 'three';

const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function heightAt(terrain, x, z) {
  if (!terrain) return 0;
  const { h, z0, z1, x0, x1 } = terrain;
  return h * smooth((z0 - z) / (z0 - z1)) * (1 - smooth((Math.abs(x) - x0) / (x1 - x0)));
}

// Apoya un objeto sobre el piso en (x, z)
export function onGround(terrain, o, x, z) { o.position.set(x, heightAt(terrain, x, z), z); return o; }

// Malla de la montaña: un plano con los vértices levantados según heightAt
export function makeTerrain(terrain, material, { x = 0, z = -30, w = 110, d = 70, seg = 1 } = {}) {
  const geo = new THREE.PlaneGeometry(w, d, Math.round(w / seg), Math.round(d / seg));
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, 0, z);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(terrain, pos.getX(i), pos.getZ(i)) + 0.015);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}
