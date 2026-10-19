// Escena: La Escondida — una plaza de noche con arbustos, la piedra en el medio y la linterna del que busca.
import * as THREE from 'three';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makeBush() {
  const g = new THREE.Group();
  const m = std({ color: '#2f7a35', flatShading: true });
  for (const [x, y, z, r] of [[0, 0.7, 0, 1.0], [0.6, 0.55, 0.3, 0.7], [-0.55, 0.5, -0.2, 0.75], [0.1, 1.2, -0.1, 0.65]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); g.add(b);
  }
  return g;
}

export default {
  camera: { pos: [0, 16, 13], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.grass([22, 18]), color: '#7a9a8a' })));
    const yard = new THREE.Mesh(new THREE.CircleGeometry(9.4, 40), std({ map: tex.grass([8, 8]), color: '#9ab3a2' })); yard.rotation.x = -Math.PI / 2; yard.position.y = 0.02; group.add(yard);
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), std({ color: '#9a9a9a', flatShading: true })); stone.position.y = 0.4; stone.scale.y = 0.6; group.add(stone);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.35, 32), new THREE.MeshBasicMaterial({ color: '#f6b40e' })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; group.add(ring);
    for (const [x, z] of [[-10, -8], [10, -8], [-10, 8], [10, 8]]) { const f = makeFarol(); f.position.set(x, 0, z); group.add(f); }
    for (const p of players) ctx.addChar(p, 0, 0);
    // Cono de luz de la linterna
    const cone = new THREE.Mesh(new THREE.CircleGeometry(5, 24, -0.42, 0.84), new THREE.MeshBasicMaterial({ color: '#fff6b0', transparent: true, opacity: 0.35, depthWrite: false }));
    cone.rotation.x = -Math.PI / 2; group.add(cone);
    return { bushes: null, cone, stone, counted: -1 };
  },
  update(ctx, st, s, dt, time) {
    if (!st.bushes) {
      st.bushes = s.bushes.map((b) => { const m = makeBush(); m.position.set(b.x, 0, b.z); m.scale.setScalar(1.15); ctx.group.add(m); return m; });
      st.cone.geometry.dispose();
      st.cone.geometry = new THREE.CircleGeometry(s.range, 24, Math.PI / 2 - s.cone, s.cone * 2);
    }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      if (e.state === 'free') {
        follow(g, e.x, e.z, k);
        face(g, e.ang, k);
        walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      }
      if (e.team === 0) {
        st.cone.visible = !s.counting;
        st.cone.position.set(g.position.x, 0.06, g.position.z);
        st.cone.rotation.z = g.rotation.y - Math.PI / 2;
        // Mientras cuenta, se tapa los ojos mirando la piedra
        g.userData.body.rotation.x = s.counting ? 0.35 : 0;
        if (s.counting && s.count !== st.counted) { st.counted = s.count; ctx.sfx('count'); }
      }
      if (e.state === 'found') { g.position.y = Math.abs(Math.sin(time * 6)) * 0.1; g.userData.body.rotation.z = 0.2; }
      if (e.state === 'safe') { g.position.lerp(new THREE.Vector3(Math.sin(e.id.length) * 0.9, 0, Math.cos(e.id.length) * 0.9), k); g.userData.body.position.y = Math.abs(Math.sin(time * 8)) * 0.3; }
    }
  },
};
