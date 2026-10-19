// Escena: Palomas de Plaza de Mayo — la plaza con la Pirámide, palomas por todos lados y migas en el piso.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makePigeon() {
  const g = new THREE.Group();
  const grey = std({ color: '#8a8f99' });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), grey); body.scale.set(0.9, 0.8, 1.3); body.position.y = 0.25; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), std({ color: '#5d6470' })); head.position.set(0, 0.42, 0.22); g.add(head);
  const neck = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), std({ color: '#5a8a7a', metalness: 0.4 })); neck.position.set(0, 0.34, 0.16); g.add(neck);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), std({ color: '#e0a060' })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.42, 0.35); g.add(beak);
  return g;
}

export default {
  camera: { pos: [0, 15, 13], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.baldosa([30, 24]) })));
    // La Pirámide de Mayo al fondo
    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 2), std({ color: '#cfc6b0' })); base.position.set(0, 0.3, -11); group.add(base);
    const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 4, 4), std({ color: '#f4f1e8' })); ob.rotation.y = Math.PI / 4; ob.position.set(0, 2.6, -11); group.add(ob);
    for (const [x, z] of [[-12, -8], [12, -8], [-12, 6], [12, 6]]) { const t = makeTree(false); t.position.set(x, 0, z); group.add(t); }
    for (const [x, z] of [[-10, -10], [10, -10]]) { const f = makeFarol(); f.position.set(x, 0, z); group.add(f); }
    for (const p of players) ctx.addChar(p, 0, 0);
    return { birds: [], crumbs: new Map() };
  },
  update(ctx, st, s, dt, time) {
    while (st.birds.length < s.birds.length) { const b = makePigeon(); b.scale.setScalar(1.4); ctx.group.add(b); st.birds.push(b); }
    s.birds.forEach(([x, z, a], i) => {
      const b = st.birds[i];
      const moved = Math.hypot(b.position.x - x, b.position.z - z);
      b.position.x += (x - b.position.x) * Math.min(1, dt * 12);
      b.position.z += (z - b.position.z) * Math.min(1, dt * 12);
      b.rotation.y = a;
      // Saltito al caminar y picoteo cuando está quieta
      b.position.y = moved > 0.02 ? Math.abs(Math.sin(time * 18 + i)) * 0.08 : 0;
      b.children[1].position.y = moved > 0.02 ? 0.42 : 0.42 - Math.max(0, Math.sin(time * 8 + i * 1.7)) * 0.15;
    });
    const live = new Set();
    for (const c of s.crumbs) {
      live.add(c.id);
      if (!st.crumbs.has(c.id)) {
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), std({ color: '#e8c48a' }));
        m.position.set(c.x, 0.08, c.z); ctx.group.add(m); st.crumbs.set(c.id, m);
      }
    }
    for (const [id, m] of st.crumbs) if (!live.has(id)) { ctx.group.remove(m); st.crumbs.delete(id); }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
    }
  },
};
