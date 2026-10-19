// Escena: La Mancha — una plaza redonda; la mancha tiene cuernitos y aura roja.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeFarol, makeBench } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 17, 15], look: [0, 0, 2.4] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.grass([22, 18]) })));
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(10.4, 48), std({ map: tex.baldosa([6, 6]) }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true; group.add(plaza);
    const border = new THREE.Mesh(new THREE.RingGeometry(10.2, 10.6, 48), std({ color: '#e8e2d2' }));
    border.rotation.x = -Math.PI / 2; border.position.y = 0.03; group.add(border);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const o = i % 2 ? makeFarol() : makeTree(i % 4 === 0);
      o.position.set(Math.cos(a) * 12, 0, Math.sin(a) * 12); group.add(o);
    }
    const bench = makeBench(); bench.position.set(0, 0, -13); group.add(bench);
    players.forEach((p) => ctx.addChar(p, 0, 0, 1.35));
    // Cuernitos para la mancha
    const horns = new THREE.Group();
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), new THREE.MeshPhysicalMaterial({ color: '#d63a2f', clearcoat: 1 }));
      h.position.set(sx * 0.22, 0, 0); h.rotation.z = -sx * 0.4; horns.add(h);
    }
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 32), new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    aura.rotation.x = -Math.PI / 2; aura.position.y = 0.05;
    return { horns, aura, placed: false, caught: new Set() };
  },
  update(ctx, st, s, dt, time) {
    if (!st.placed) {
      const g = ctx.chars.get(s.chaser);
      if (g) { st.horns.position.y = (g.userData.top || 1.8) - 0.05; g.userData.body.add(st.horns); g.add(st.aura); st.placed = true; }
    }
    st.aura.scale.setScalar(1 + Math.sin(time * 8) * 0.1);
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      if (e.caught) {
        if (!st.caught.has(e.id)) { st.caught.add(e.id); ctx.burst(g.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 30, 4); ctx.sfx('bonk'); }
        g.userData.body.rotation.x = 0.3; g.userData.body.scale.y = 0.85;
        continue;
      }
      walkAnim(g, time, speedOf(g, dt) / 5, g.id);
      g.userData.body.scale.z = e.dash ? 0.75 : 1;
    }
  },
};
