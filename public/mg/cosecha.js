// Escena: La Cosecha — un viñedo con hileras de parras, racimos para juntar y un tacho de cada color.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makeBunch() {
  const g = new THREE.Group();
  const m = std({ color: '#5b2a6e', roughness: 0.3 });
  [[0, 0.5], [-0.12, 0.38], [0.12, 0.38], [0, 0.26], [-0.08, 0.15], [0.08, 0.15], [0, 0.04]].forEach(([x, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), m); b.position.set(x, y + 0.1, 0); g.add(b); });
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 5), std({ color: '#3f8a3a' })); leaf.position.y = 0.72; g.add(leaf);
  return g;
}

export default {
  camera: { pos: [0, 16, 12], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players, CH } = ctx;
    group.add(plane(90, 70, std({ map: tex.dryGrass([22, 18]) })));
    // Hileras de parras (espalderas)
    for (const z of [-4.5, 0, 4.5]) {
      group.add(plane(20, 0.6, std({ map: tex.dirt([8, 1]) }), { y: 0.02, z }));
      for (let x = -9; x <= 9; x += 1.5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), std({ color: '#6b4a2b' })); post.position.set(x, 0.7, z); group.add(post);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), std({ color: '#4f9a3a', flatShading: true })); leaves.position.set(x + 0.75, 1.1, z); leaves.scale.set(1.4, 0.6, 0.6); group.add(leaves);
      }
    }
    for (const p of players) {
      const g = ctx.addChar(p, 0, 0);
      const basket = new THREE.Group(); basket.position.y = (g.userData.top || 1.8) + 0.1; g.add(basket); g.userData.basket = basket;
    }
    return { bunches: new Map(), bins: new Map(), bunchMesh: makeBunch() };
  },
  update(ctx, st, s, dt, time) {
    const live = new Set();
    for (const b of s.bunches) {
      live.add(b.id);
      if (!st.bunches.has(b.id)) { const m = st.bunchMesh.clone(); m.position.set(b.x, 0.3, b.z); m.scale.setScalar(1.5); ctx.group.add(m); st.bunches.set(b.id, m); }
      st.bunches.get(b.id).rotation.y = Math.sin(time * 2 + b.id) * 0.3;
    }
    for (const [id, m] of st.bunches) if (!live.has(id)) { ctx.group.remove(m); st.bunches.delete(id); }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      if (!st.bins.has(e.id)) {
        const p = ctx.players.find((o) => o.id === e.id);
        const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 0.9, 16), std({ color: ctx.CH[p.char].color }));
        bin.position.set(e.bin.x, 0.45, e.bin.z); ctx.group.add(bin); st.bins.set(e.id, bin);
      }
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      const bk = g.userData.basket;
      while (bk.children.length < e.carry) { const m = st.bunchMesh.clone(); m.position.x = (bk.children.length - 1) * 0.3; bk.add(m); }
      while (bk.children.length > e.carry) bk.remove(bk.children[bk.children.length - 1]);
    }
  },
};
