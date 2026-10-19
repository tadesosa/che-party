// Escena: Empujón en la Plaza
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeFarol, makeBench } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 14, 13], look: [0, 0, 2] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    const water = plane(140, 140, std({ map: tex.water([30, 30]), roughness: 0.15, metalness: 0.15 }), { y: -1.5 });
    group.add(water);
    const plat = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.0, 1.4, 48), std({ color: '#f4efe2' }));
    rim.position.y = -0.72; rim.receiveShadow = true; rim.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.035, 1.035, 0.3, 48), std({ color: '#74acdf' }));
    band.position.y = -0.6;
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.1, 48), std({ map: tex.grass([6, 6]) }));
    grass.position.y = -0.03; grass.receiveShadow = true;
    const sol = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), std({ color: '#f6b40e', emissive: '#f6b40e', emissiveIntensity: 0.2 }));
    sol.rotation.x = -Math.PI / 2; sol.position.y = 0.025;
    plat.add(rim, band, grass, sol);
    plat.scale.set(9, 1, 9);
    group.add(plat);
    // Orilla con árboles, faroles y bancos
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const t = makeTree(i % 2); t.position.set(Math.cos(a) * 21, -1.5, Math.sin(a) * 21 - 4); group.add(t);
      if (i % 2) { const f = makeFarol(); f.position.set(Math.cos(a + 0.3) * 19, -1.5, Math.sin(a + 0.3) * 19 - 4); group.add(f); }
      else { const b = makeBench(); b.position.set(Math.cos(a + 0.3) * 19, -1.5, Math.sin(a + 0.3) * 19 - 4); b.rotation.y = -a - Math.PI / 2; group.add(b); }
    }
    const ground = plane(140, 40, std({ map: tex.grass([30, 8]) }), { y: -1.49, z: -42 });
    group.add(ground);
    players.forEach((p, i) => { const a = (i / n) * Math.PI * 2; ctx.addChar(p, Math.cos(a) * 5, Math.sin(a) * 5, 1.5); });
    return { plat, water, falling: new Set() };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    st.plat.scale.x += (s.R - st.plat.scale.x) * k; st.plat.scale.z = st.plat.scale.x;
    st.water.material.map.offset.x = time * 0.01;
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k, e.y);
      face(g, e.ang, k);
      const sp = speedOf(g, dt);
      if (e.alive) walkAnim(g, time, sp / 6, g.id);
      const body = g.userData.body;
      body.scale.z += ((e.dash ? 0.7 : 1) - body.scale.z) * k;
      g.userData.ring.visible = e.alive;
      g.userData.blob.visible = e.alive;
      if (!e.alive && !st.falling.has(e.id)) {
        st.falling.add(e.id);
        ctx.sfx('pop');
        ctx.splash(new THREE.Vector3(e.x, -1.4, e.z));
      }
      if (!e.alive) g.rotation.x += dt * 4;
    }
  },
};
