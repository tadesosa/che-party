// Escena: Tapá el Dique — dos paredones de hormigón (uno por equipo) con chorros de agua que salen de los agujeros
// abiertos, y el agua juntándose adelante de cada uno.
import * as THREE from 'three';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';
import { tex } from '../textures.js';
import { makeSierra } from '../decor2.js';

const TEAM = ['#5fb3ff', '#ff6b5e'];

export default {
  camera: { pos: [0, 11, 15], look: [0, 1, 0] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(120, 90, std({ map: tex.grass([24, 18]) })));
    group.add(plane(20, 7, std({ color: '#b8b0a0' }), { y: 0.01, z: 1.8 }));
    for (const [x, z, r] of [[-22, -18, 10], [0, -24, 12], [22, -18, 10]]) { const s = makeSierra(r, r * 0.6, '#5a8a3a'); s.position.set(x, 0, z); group.add(s); }
    // Agua del lago atrás de los diques
    const lake = plane(40, 14, new THREE.MeshPhysicalMaterial({ color: '#3d86b8', map: tex.water([8, 3]), roughness: 0.1, clearcoat: 1 }), { y: 1.6, z: -9 });
    group.add(lake);
    const walls = [];
    for (let t = 0; t < 2; t++) {
      const side = t ? 1 : -1;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.4, 1.2), std({ color: '#c9c3b5' })); wall.position.set(side * 5, 1.7, -2); wall.castShadow = true; group.add(wall);
      const top = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.3, 1.4), std({ color: TEAM[t] })); top.position.set(side * 5, 3.5, -2); group.add(top);
      // Charco que crece con el agua juntada
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshPhysicalMaterial({ color: '#4aa6e0', transparent: true, opacity: 0.75, roughness: 0.05, clearcoat: 1 }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(side * 5, 0.04, 1.5); group.add(pool);
      walls.push({ wall, pool });
    }
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 1.6), std({ color: '#8a8478' })); mid.position.set(0, 1.8, -2); group.add(mid);
    for (const p of players) ctx.addChar(p, 0, 0);
    return { walls, holes: null, jets: [] };
  },
  update(ctx, st, s, dt, time) {
    if (!st.holes) {
      // Agujeros y chorros (uno por agujero en cada dique)
      st.holes = [];
      for (let t = 0; t < 2; t++) for (let i = 0; i < s.holeX.length; i++) {
        const x = (t ? 1 : -1) * s.holeX[i];
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), std({ color: '#3a3a3a' })); hole.position.set(x, 1.2, -1.39); ctx.group.add(hole);
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.6, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
        jet.rotation.x = Math.PI / 2 + 0.6; jet.position.set(x, 0.85, -0.7); ctx.group.add(jet);
        st.holes.push({ t, i, jet, x });
      }
    }
    for (const h of st.holes) {
      const open = s.leaks[h.t][h.i] === '1';
      h.jet.visible = open;
      if (open) { h.jet.scale.set(1 + Math.sin(time * 20 + h.x) * 0.1, 1, 1); if (Math.random() < dt * 8) ctx.splash(new THREE.Vector3(h.x, 0.2, 0.2)); }
    }
    st.walls.forEach((w, t) => { const r = 0.6 + Math.sqrt(s.water[t]) * 0.45; w.pool.scale.set(Math.min(5.5, r * 1.3), Math.min(4, r), 1); });
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.plugging ? Math.PI : e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      if (e.plugging) g.userData.arms.forEach((a) => { a.rotation.x = -1.6; });
    }
  },
};
