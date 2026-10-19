// Escena: Carrera de Mulas — un sendero de montaña con la Cordillera de fondo; cada uno arriba de su mula.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, fitSpan } from './util.js';

const START = -14, LEN = 28, LANE = 2;

function makeMule() {
  const g = new THREE.Group();
  const fur = std({ color: '#7a5a3a' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.1, 6, 12), fur); body.rotation.z = Math.PI / 2; body.position.y = 1; g.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), fur); neck.position.set(0.75, 1.4, 0); neck.rotation.z = -0.7; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.3), fur); head.position.set(1.05, 1.65, 0); g.add(head);
  for (const z of [-0.08, 0.08]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 6), fur); ear.position.set(0.9, 2.0, z); g.add(ear); }
  const legs = [];
  for (const [x, z] of [[-0.5, -0.2], [-0.5, 0.2], [0.5, -0.2], [0.5, 0.2]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.8, 6), fur); l.position.set(x, 0.4, z); g.add(l); legs.push(l); }
  g.userData.legs = legs;
  return g;
}

export default {
  camera: { pos: [-6, 7, 14], look: [-4, 1, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length, w = n * LANE + 2;
    group.add(plane(120, 70, std({ map: tex.dryGrass([30, 18]) })));
    group.add(plane(LEN + 10, w, std({ map: tex.dirt([10, 2]) }), { y: 0.01 }));
    // La Cordillera al fondo
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(5 + (i % 3), 9 + (i % 4) * 2, 6), std({ color: '#7d6a5a', flatShading: true }));
      m.position.set(-24 + i * 7, 4, -w / 2 - 12); group.add(m);
      const snow = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 6), std({ color: '#f7f9fc', flatShading: true })); snow.position.set(-24 + i * 7, 7.5 + (i % 4), -w / 2 - 12); group.add(snow);
    }
    const goal = START + LEN;
    group.add(plane(0.4, w, std({ color: '#ffffff' }), { x: goal, y: 0.03 }));
    const riders = new Map();
    players.forEach((p, i) => {
      const z = -w / 2 + 1 + i * LANE + LANE / 2 - 0.5;
      const mule = makeMule(); mule.position.set(START, 0, z); group.add(mule);
      const g = ctx.addChar(p, START, z, 0.7);
      g.rotation.y = Math.PI / 2;
      riders.set(p.id, { mule, g, z, x: START });
    });
    return { riders, camX: START };
  },
  update(ctx, st, s, dt, time) {
    let lead = START, last = Infinity;
    for (const e of s.ents) {
      const r = st.riders.get(e.id); if (!r) continue;
      const tx = START + (e.d / s.target) * LEN;
      r.x += (tx - r.x) * Math.min(1, dt * 8);
      lead = Math.max(lead, r.x); last = Math.min(last, r.x);
      const bob = e.trot * Math.abs(Math.sin(time * 18)) * 0.15;
      r.mule.position.set(r.x, bob, r.z);
      r.mule.userData.legs.forEach((l, k) => { l.rotation.z = e.trot * Math.sin(time * 18 + k * Math.PI) * 0.5; });
      // Empacada: la mula se planta con la cabeza para abajo y patalea
      r.mule.rotation.z = e.stuck ? -0.15 + Math.sin(time * 10) * 0.05 : 0;
      r.g.position.set(r.x - 0.1, 1.35 + bob, r.z);
      r.g.rotation.y = Math.PI / 2;
      r.g.userData.body.rotation.x = e.stuck ? -0.4 * Math.min(1, e.pull + 0.3) : 0;
    }
    // Encuadra del último al primero
    const f = fitSpan(st, last, lead, dt, { base: 14, minC: START + 3, maxC: START + LEN - 4 });
    ctx.setCamera([f.c - 2, 7 * f.z, 14 * f.z], [f.c + 1, 1, 0]);
  },
};
