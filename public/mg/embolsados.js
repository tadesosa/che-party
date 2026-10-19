// Escena: Carrera de Embolsados — carriles de pasto en una kermesse, cada uno saltando metido en su bolsa.
import * as THREE from 'three';
import { makeTree, makeFlag } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, fitSpan } from './util.js';

const START = -13, LANE = 1.7;

export default {
  camera: { pos: [-8, 7, 13], look: [-6, 0.5, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    const w = n * LANE + 2;
    group.add(plane(100, 60, std({ map: tex.grass([24, 14]) })));
    for (let i = 0; i <= n; i++) group.add(plane(32, 0.08, std({ color: '#ffffff' }), { x: 2, y: 0.02, z: -w / 2 + 1 + i * LANE - LANE / 2 }));
    // Llegada con banderines
    const goalX = START + 26;
    group.add(plane(0.4, w, std({ color: '#ffffff' }), { x: goalX, y: 0.03 }));
    for (const z of [-w / 2, w / 2]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), std({ color: '#ffffff' })); pole.position.set(goalX, 1.5, z); group.add(pole); }
    const colors = ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48'];
    for (let i = 0; i < 12; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 3), std({ color: colors[i % 4] }));
      f.rotation.x = Math.PI; f.position.set(goalX, 2.7, -w / 2 + (i + 0.5) * (w / 12)); group.add(f);
    }
    const flag = makeFlag(); flag.position.set(goalX + 2, 0, -w / 2 - 2); group.add(flag);
    for (let x = -20; x < 26; x += 6) { const t = makeTree(x % 4 === 0); t.position.set(x, 0, -w / 2 - 6); group.add(t); }
    const runners = new Map();
    players.forEach((p, i) => {
      const z = -w / 2 + 1 + i * LANE;
      const g = ctx.addChar(p, START, z);
      g.rotation.y = Math.PI / 2;
      // La bolsa de arpillera, de la cintura para abajo
      const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 0.55, 14, 1, true), std({ color: '#b08a55', side: THREE.DoubleSide }));
      sack.position.y = 0.27; g.add(sack);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 16), std({ color: '#6b4a2b' })); tie.rotation.x = Math.PI / 2; tie.position.y = 0.55; tie.scale.setScalar(0.94); g.add(tie);
      runners.set(p.id, { g, z, x: START, fallShown: false });
    });
    return { runners, camX: START, w };
  },
  update(ctx, st, s, dt) {
    let lead = START, last = Infinity;
    for (const e of s.ents) {
      const r = st.runners.get(e.id); if (!r) continue;
      const g = r.g;
      const tx = START + e.d;
      r.x += (tx - r.x) * Math.min(1, dt * 10);
      lead = Math.max(lead, r.x); last = Math.min(last, r.x);
      g.position.set(r.x, Math.sin(e.jump * Math.PI) * 0.9, r.z);
      if (e.down) {
        g.rotation.z += (-Math.PI / 2 - g.rotation.z) * Math.min(1, dt * 12);
        if (!r.fallShown) { r.fallShown = true; ctx.sfx('bonk'); }
      } else { g.rotation.z *= 0.8; r.fallShown = false; }
      const body = g.userData.body;
      body.scale.y = 1 + e.jump * 0.15;
    }
    // Encuadra del último al primero
    const f = fitSpan(st, last, lead, dt, { base: st.w / 2 + 10, minC: START + 3, maxC: START + 22 });
    ctx.setCamera([f.c - 2, 7 * f.z, (st.w / 2 + 10) * f.z], [f.c + 1, 0.5, 0]);
  },
};
