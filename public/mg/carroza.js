// Escena: La Carroza de la Vendimia — dos carrozas con racimos gigantes avanzan por la avenida, tiradas por cada equipo.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, fitSpan } from './util.js';

const START = -14, LEN = 28;
const TEAM = ['#2f86e0', '#e14b3c'];

function makeFloat(color) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 2), std({ color })); base.position.y = 0.8; g.add(base);
  for (const [x, z] of [[-1.2, -1], [1.2, -1], [-1.2, 1], [1.2, 1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16), std({ color: '#3a3a3a' })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.4, z); g.add(w); }
  // Racimo gigante arriba
  const grape = std({ color: '#5b2a6e', roughness: 0.3 });
  [[0, 2.4], [-0.45, 2.0], [0.45, 2.0], [-0.25, 1.6], [0.25, 1.6], [0, 1.25], [-0.7, 2.4], [0.7, 2.4]].forEach(([x, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), grape); b.position.set(x, y, 0); g.add(b); });
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 5), std({ color: '#3f8a3a' })); leaf.position.set(0, 2.85, 0); g.add(leaf);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4, 6), std({ color: '#c9a66b' })); rope.rotation.z = Math.PI / 2; rope.position.set(3.6, 0.9, 0); g.add(rope);
  return g;
}

export default {
  camera: { pos: [-4, 9, 15], look: [-2, 1, 0] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(120, 70, std({ map: tex.dryGrass([30, 18]) })));
    group.add(plane(LEN + 16, 9, std({ map: tex.asphalt([14, 3]) }), { y: 0.01, x: 2 }));
    for (let x = -18; x < 22; x += 5) { const t = makeTree(false); t.position.set(x, 0, -7); group.add(t); }
    // El palco al final
    const palco = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 9), std({ color: '#f4efe2' })); palco.position.set(START + LEN + 5, 1.5, 0); group.add(palco);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 9.5), std({ color: '#5b2a6e' })); roof.position.set(START + LEN + 5, 3.2, 0); group.add(roof);
    group.add(plane(0.4, 9, std({ color: '#ffffff' }), { x: START + LEN, y: 0.03 }));
    const floats = [makeFloat(TEAM[0]), makeFloat(TEAM[1])];
    floats[0].position.set(START, 0, -2.2); floats[1].position.set(START, 0, 2.2);
    floats.forEach((f) => group.add(f));
    const pullers = [[], []];
    for (const p of players) { const g = ctx.addChar(p, 0, 0); pullers[g.userData.team === 1 ? 1 : 0].push(g); g.rotation.y = Math.PI / 2; }
    return { floats, pullers, camX: START };
  },
  update(ctx, st, s, dt, time) {
    let lead = START, last = Infinity;
    for (let t = 0; t < 2; t++) {
      const x = START + Math.min(1, s.pos[t] / s.goal) * LEN;
      const f = st.floats[t];
      f.position.x += (x - f.position.x) * Math.min(1, dt * 8);
      lead = Math.max(lead, f.position.x); last = Math.min(last, f.position.x);
      st.pullers[t].forEach((g, i) => {
        g.position.set(f.position.x + 4.2 + i * 1.1, 0, f.position.z + (i % 2 ? 0.4 : -0.4));
        g.rotation.y = Math.PI / 2;
        g.userData.body.rotation.x = 0.35 + Math.sin(time * 14 + i) * 0.08;
        g.userData.body.position.y = Math.abs(Math.sin(time * 12 + i)) * 0.1;
      });
    }
    // Encuadra las dos carrozas (los que tiran van adelante de cada una)
    const f = fitSpan(st, last, lead + 6, dt, { base: 15, minC: START + 3, maxC: START + LEN });
    ctx.setCamera([f.c - 2, 9 * f.z, 15 * f.z], [f.c + 2, 1, 0]);
  },
};
