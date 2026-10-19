// Escena: El Gaucho y el Lazo — un corral de campo con tranqueras; el gaucho revolea el lazo.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makeFence(len) {
  const g = new THREE.Group();
  const wood = std({ color: '#8a5a33' });
  for (let x = -len / 2; x <= len / 2 + 1e-6; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.2), wood); p.position.set(x, 0.65, 0); g.add(p); }
  for (const y of [0.5, 1.05]) { const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.08), wood); r.position.y = y; g.add(r); }
  return g;
}
function makeHat() { // sombrero de gaucho
  const g = new THREE.Group();
  const m = std({ color: '#2b2118' });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 20), m); g.add(brim);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.4, 20), m); top.position.y = 0.22; g.add(top);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.455, 0.455, 0.08, 20), std({ color: '#c0392b' })); band.position.y = 0.08; g.add(band);
  return g;
}

export default {
  camera: { pos: [0, 16, 14], look: [0, 0, 1] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(100, 80, std({ map: tex.dryGrass([24, 20]) })));
    const corral = new THREE.Mesh(new THREE.CircleGeometry(9.3, 40), std({ map: tex.dirt([6, 6]) })); corral.rotation.x = -Math.PI / 2; corral.position.y = 0.02; group.add(corral);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const f = makeFence(5.6); f.position.set(Math.sin(a) * 9.8, 0, Math.cos(a) * 9.8); f.rotation.y = a + Math.PI / 2; group.add(f);
    }
    for (const [x, z] of [[-15, -8], [15, -8], [-11, -14], [12, -15]]) { const t = makeTree(false); t.position.set(x, 0, z); group.add(t); }
    let gaucho = null;
    for (const p of players) {
      const g = ctx.addChar(p, 0, 0);
      if (g.userData.team === 0) { const h = makeHat(); h.position.y = (g.userData.top || 1.8) + 0.05; g.add(h); gaucho = g; }
    }
    // El lazo: un aro que vuela hasta donde cae, y la soga desde la mano del gaucho
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 28), std({ color: '#c9a66b' })); ring.rotation.x = Math.PI / 2; ring.visible = false; group.add(ring);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 5), std({ color: '#c9a66b' })); rope.visible = false; group.add(rope);
    // Lazo revoleando arriba de la cabeza mientras no tira
    const spin = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 20), std({ color: '#c9a66b' })); spin.rotation.x = Math.PI / 2; group.add(spin);
    return { ring, rope, spin, gaucho, lastHit: null };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      if (e.caught) {
        g.rotation.z += (0.25 - g.rotation.z) * k;
        g.userData.body.position.y = 0;
        continue;
      }
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
    }
    const g = st.gaucho;
    const L = s.lasso;
    st.spin.visible = !!g && !L;
    if (g && !L) { st.spin.position.set(g.position.x, (g.userData.top || 1.8) + 0.8, g.position.z); st.spin.rotation.z = time * 8; st.spin.position.x += Math.cos(time * 8) * 0.15; }
    st.ring.visible = st.rope.visible = !!L;
    if (L) {
      const x = L.x + (L.tx - L.x) * L.k, z = L.z + (L.tz - L.z) * L.k;
      st.ring.position.set(x, 0.3 + Math.sin(L.k * Math.PI) * 2.2, z);
      st.ring.scale.setScalar(L.ring * (0.6 + L.k * 0.4));
      const a = new THREE.Vector3(L.x, 1.3, L.z), b = st.ring.position;
      st.rope.position.copy(a).add(b).multiplyScalar(0.5);
      st.rope.scale.y = a.distanceTo(b);
      st.rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      if (L.hit && L.hit !== st.lastHit) { st.lastHit = L.hit; ctx.sfx('hit'); ctx.burst(b.clone(), 30, 3); }
      if (L.k < 0.1 && !st.thrown) { st.thrown = true; ctx.sfx('swoosh'); }
    } else st.thrown = false;
  },
};
