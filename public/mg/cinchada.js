// Escena: La Cinchada — dos equipos tiran de una soga sobre un charco de barro.
import * as THREE from 'three';
import { makeTree, animateChar } from '../models.js';
import { tex } from '../textures.js';
import { plane, std } from './util.js';

export default {
  camera: { pos: [0, 5.5, 13.5], look: [0, 1.2, 0] },
  build(ctx) {
    const { group } = ctx;
    group.add(plane(80, 50, std({ map: tex.grass([20, 12]) })));
    const mud = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshPhysicalMaterial({ color: '#5b3a1e', roughness: 0.3, clearcoat: 0.8 }));
    mud.rotation.x = -Math.PI / 2; mud.scale.set(2.2, 1.6, 1); mud.position.y = 0.02; group.add(mud);
    for (const [x, z] of [[-14, -8], [14, -8], [-9, -12], [9, -12], [0, -14]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    // La soga
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 18, 8), std({ color: '#c9a66b' }));
    rope.rotation.z = Math.PI / 2; rope.position.y = 1.0; rope.castShadow = true; group.add(rope);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ color: '#e14b3c', side: THREE.DoubleSide }));
    flag.position.y = 0.6; group.add(flag);
    // Marcas de cada lado
    for (const [x, c] of [[-4, '#2f86e0'], [4, '#e14b3c']]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3), std({ color: c }));
      line.rotation.x = -Math.PI / 2; line.position.set(x, 0.03, 0); group.add(line);
    }
    const sides = [[], []];
    for (const p of ctx.players) {
      const g = ctx.addChar(p, 0, 0);
      sides[g.userData.team === 1 ? 1 : 0].push(g);
    }
    sides.forEach((list, side) => list.forEach((g, i) => {
      g.userData.slot = (side === 0 ? -1 : 1) * (2.2 + i * 1.4);
      g.rotation.y = side === 0 ? Math.PI / 2 : -Math.PI / 2;
    }));
    return { rope, flag, sides, over: false };
  },
  update(ctx, st, s, dt, time) {
    const shift = s.rope * 1.2; // la soga se corre hacia el equipo que va ganando
    st.rope.position.x = shift;
    st.flag.position.x = shift;
    st.flag.rotation.y = Math.sin(time * 6) * 0.3;
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      const lost = s.over && s.win != null && e.team !== s.win;
      const tx = g.userData.slot + shift;
      g.position.x += (tx - g.position.x) * Math.min(1, dt * 10);
      // Inclinados hacia atrás tirando
      g.userData.body.rotation.x = -(0.35 + Math.sin(time * 14 + g.id) * 0.06);
      if (lost) { g.position.y = Math.max(-0.4, g.position.y - dt); g.userData.body.rotation.x = 0.9; }
      animateChar(g, time, { walk: s.over ? 0 : 0.6, cheer: s.over && s.win === e.team, phase: g.id });
    }
    if (s.over && !st.over) { st.over = true; ctx.sfx('whistle'); ctx.burst(new THREE.Vector3(0, 0.5, 0), 40, 5); }
  },
};
