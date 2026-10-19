// Escena: Armá el Iglú — un campo nevado con dos iglúes (celeste y rojo) que se van armando de a anillos
// a medida que llegan los bloques de hielo.
import * as THREE from 'three';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';
import { makeSnowPine, makePeak } from '../decor2.js';

const TEAM = ['#5fb3ff', '#ff6b5e'];
const iceMat = new THREE.MeshPhysicalMaterial({ color: '#dff3ff', roughness: 0.15, clearcoat: 1 });

// Iglú de n bloques: anillos que se achican hacia arriba (24 bloques lo completan; después sigue creciendo un poco)
function iglooBlocks(group, cx, n, team) {
  while (group.children.length) group.remove(group.children[0]);
  const rings = [10, 9, 7, 5, 3, 1];
  let left = n, y = 0.25;
  rings.forEach((count, r) => {
    const rad = 2 * Math.cos((r / rings.length) * Math.PI / 2.1);
    for (let i = 0; i < count && left > 0; i++, left--) {
      const a = (i / count) * Math.PI * 2 + r * 0.3;
      const b = new THREE.Mesh(new THREE.BoxGeometry(count === 1 ? 0.9 : 0.85, 0.5, 0.5), iceMat);
      b.position.set(cx + Math.cos(a) * rad, y, Math.sin(a) * rad); b.rotation.y = -a; b.castShadow = true; group.add(b);
    }
    y += 0.5;
  });
  // Bandera del equipo arriba
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5), std({ color: '#ffffff' })); pole.position.set(cx, y + 0.5, 0); group.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: TEAM[team], side: THREE.DoubleSide })); flag.position.set(cx + 0.4, y + 1, 0); group.add(flag);
}

export default {
  camera: { pos: [0, 19, 17], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(140, 100, std({ color: '#c9d3df', roughness: 1 })));
    for (const [x, z, r, h] of [[-24, -30, 12, 20], [4, -36, 14, 26], [28, -30, 11, 18]]) { const m = makePeak(r, h, { color: '#5d6168', snow: 0.5 }); m.position.set(x, 0, z); group.add(m); }
    for (let i = 0; i < 14; i++) { const t = makeSnowPine(3 + (i % 3) * 0.5); t.position.set(-24 + i * 3.7, 0, -10.5 - (i % 2) * 2); group.add(t); }
    const igloos = [new THREE.Group(), new THREE.Group()];
    igloos.forEach((g, t) => {
      group.add(g);
      const ring = new THREE.Mesh(new THREE.RingGeometry(2, 2.3, 32), new THREE.MeshBasicMaterial({ color: TEAM[t], side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(t ? 9 : -9, 0.03, 0); group.add(ring);
    });
    for (const p of players) ctx.addChar(p, 0, 0);
    return { igloos, built: [-1, -1], blocks: new Map(), carried: new Map() };
  },
  update(ctx, st, s, dt, time) {
    for (let t = 0; t < 2; t++) if (s.built[t] !== st.built[t]) {
      if (st.built[t] >= 0) ctx.sfx('good');
      st.built[t] = s.built[t];
      iglooBlocks(st.igloos[t], t ? 9 : -9, s.built[t], t);
    }
    const live = new Set();
    for (const b of s.blocks) {
      live.add(b.id);
      let m = st.blocks.get(b.id);
      if (!m) { m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.45), iceMat); m.castShadow = true; ctx.group.add(m); st.blocks.set(b.id, m); }
      m.position.set(b.x, 0.25 + Math.abs(Math.sin(time * 2 + b.id)) * 0.08, b.z);
      m.rotation.y = b.id;
    }
    for (const [id, m] of st.blocks) if (!live.has(id)) { ctx.group.remove(m); st.blocks.delete(id); }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.rotation.z = e.stun ? Math.sin(time * 25) * 0.3 : 0;
      // Bloques en la mano, arriba de la cabeza
      let c = st.carried.get(e.id);
      if (!c) { c = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.4), iceMat); ctx.group.add(m); return m; }); st.carried.set(e.id, c); }
      c.forEach((m, i) => { m.visible = i < e.carry; m.position.set(g.position.x, 2.3 + i * 0.45, g.position.z); });
      if (e.carry) g.userData.arms.forEach((a) => { a.rotation.z = a.userData.side * 2.7; });
      if (e.push) g.userData.arms.forEach((a) => { a.rotation.x = -1.5; });
    }
  },
};
