// Escena: Barrenador — el mar con una ola por jugador; cada uno arriba de su tabla, inclinándose.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const GAP = 3;
const BOARDS = ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#b06ab3', '#ef8a17'];

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 4 + w * 0.15, 7 + w * 0.5], look: [0, 1, -1] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    const sea = plane(120, 80, std({ map: tex.water([30, 20]), color: '#3d86b8', roughness: 0.1 }), { y: 0 }); group.add(sea);
    // La ola detrás: una loma de agua con espuma arriba
    const wave = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 60, 24, 1, false, 0, Math.PI), std({ color: '#2f78a8', roughness: 0.15 }));
    wave.rotation.z = Math.PI / 2; wave.position.set(0, 0, -4); group.add(wave);
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 60, 10), std({ color: '#ffffff' })); crest.rotation.z = Math.PI / 2; crest.position.set(0, 2.5, -4); group.add(crest);
    const riders = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 2.2), std({ color: BOARDS[i % 6] })); board.position.set(x, 0.3, 0); group.add(board);
      const g = ctx.addChar(p, x, 0, 0.9); g.position.y = 0.36;
      riders.set(p.id, { x, board, g });
    });
    return { riders, sea };
  },
  update(ctx, st, s, dt, time) {
    st.sea.material.map.offset.y = time * 0.15;
    for (const e of s.ents) {
      const r = st.riders.get(e.id); if (!r) continue;
      const bob = Math.sin(time * 3 + r.x) * 0.15;
      if (e.swim) {
        r.board.position.y = 0.05; r.board.rotation.z = 0;
        r.g.position.set(r.x, -0.6 + Math.sin(time * 6) * 0.1, 0.6); r.g.rotation.z = 0;
        if (!r.splashed) { r.splashed = true; ctx.splash(new THREE.Vector3(r.x, 0.3, 0)); }
      } else {
        r.splashed = false;
        r.board.position.y = 0.3 + bob; r.board.rotation.z = e.tilt * 0.5;
        r.g.position.set(r.x - Math.sin(e.tilt * 0.6) * 0.6, 0.36 + bob, 0);
        r.g.rotation.z = -e.tilt * 0.9;
        r.g.rotation.y = 0;
        // Brazos abiertos haciendo equilibrio
        r.g.userData.body.rotation.x = Math.sin(time * 5) * 0.05;
      }
    }
  },
};
