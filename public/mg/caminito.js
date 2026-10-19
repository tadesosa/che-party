// Escena: Pintá Caminito — dos filas de casitas de chapa que se van pintando de celeste o rojo.
import * as THREE from 'three';
import { makeHouse } from '../models.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

const TEAM = ['#2f86e0', '#e14b3c'];
const PLAIN = '#d9d2c3';

export default {
  camera: { pos: [0, 14, 12], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.cobble([30, 24]) })));
    group.add(plane(22, 5.4, std({ map: tex.cobble([10, 3]), color: '#cfc6b0' }), { y: 0.02 }));
    for (const p of players) ctx.addChar(p, 0, 0);
    return { houses: null };
  },
  update(ctx, st, s, dt, time) {
    if (!st.houses) {
      st.houses = s.houses.map((h) => {
        const g = makeHouse(PLAIN, '#7a7a7a', 3.2, 3.4);
        g.position.set(h.x, 0, h.z + (h.z < 0 ? -0.8 : 0.8)); g.rotation.y = h.z < 0 ? 0 : Math.PI;
        g.children[0].material = g.children[0].material.clone();
        ctx.group.add(g);
        // Barra de progreso arriba
        const bar = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        bar.position.set(h.x, 4.6, h.z); ctx.group.add(bar);
        return { g, bar, owner: -2 };
      });
    }
    s.houses.forEach((h, i) => {
      const H = st.houses[i];
      if (h.owner !== H.owner) {
        H.owner = h.owner;
        const col = h.owner >= 0 ? TEAM[h.owner] : PLAIN;
        H.g.children[0].material.color.set(col); // las paredes
        if (h.owner >= 0) { ctx.burst(new THREE.Vector3(h.x, 2, h.z), 30, 3); ctx.sfx('good'); }
      }
      H.bar.visible = h.paint > 0;
      H.bar.scale.x = Math.max(0.05, h.paint);
      if (h.by >= 0) H.bar.material.color.set(TEAM[h.by]);
    });
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.userData.body.rotation.x = e.brush ? -0.3 : 0;
    }
  },
};
