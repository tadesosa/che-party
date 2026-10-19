// Escena: Lluvia de Alfajores
import * as THREE from 'three';
import { makeHouse, makeAlfajorItem, makeChancla, makeTree } from '../models.js';
import { tex } from '../textures.js';
import { follow, walkAnim, plane, std } from './util.js';

export default {
  camera: { pos: [0, 5.5, 16], look: [0, 4.2, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 40, std({ map: tex.grass([20, 10]) })));
    const walk = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 3.5), std({ map: tex.baldosa([10, 2]) }));
    walk.position.y = 0.1; walk.receiveShadow = true; group.add(walk);
    ['#3b8fe0', '#e14b3c', '#f2c230', '#2e9e48', '#b06ab3', '#ef8a17'].forEach((c, i) => {
      const h = makeHouse(c, '#1b2a4a', 3.6, 5 + (i % 2)); h.position.set(-11.25 + i * 4.5, 0, -5); group.add(h);
    });
    for (const x of [-13, 13]) { const t = makeTree(x > 0); t.position.set(x, 0, -1); group.add(t); }
    players.forEach((p, i) => ctx.addChar(p, 0, (i - (n - 1) / 2) * 0.25));
    return { items: new Map() };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, g.position.z, k, 0.2);
      const targetRot = e.stun ? g.rotation.y + dt * 14 : e.moving * 0.7;
      g.rotation.y += (targetRot - g.rotation.y) * (e.stun ? 1 : k);
      walkAnim(g, time, e.moving ? 1 : 0, g.id);
    }
    const alive = new Set();
    for (const it of s.items) {
      alive.add(it.id);
      let m = st.items.get(it.id);
      if (!m) {
        m = it.k === 'chancla' ? makeChancla() : makeAlfajorItem(it.k === 'dorado');
        if (it.k === 'dorado') m.scale.setScalar(1.3);
        m.position.set(it.x, it.y, 0);
        m.userData.spin = Math.random() * 6;
        st.items.set(it.id, m); ctx.group.add(m);
      }
      m.position.x = it.x;
      m.position.y += (it.y - m.position.y) * k;
      m.rotation.x = time * 2 + m.userData.spin; m.rotation.z = time * 1.3;
    }
    for (const [id, m] of st.items) if (!alive.has(id)) { ctx.group.remove(m); st.items.delete(id); }
  },
};
