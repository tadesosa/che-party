// Escena: La Caldera del Tren — vías paralelas por la estepa fueguina, una locomotora a vapor por jugador
// con su manómetro arriba (zona verde y roja). Las subidas se marcan con lomas.
import * as THREE from 'three';
import { plane, std, rowX, fitSpan } from './util.js';
import { tex } from '../textures.js';
import { makeTrain, makePine, makePeak } from '../decor2.js';

const LANE = 3.6;

function gauge(low, high, boom) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ color: '#fffaf0' })); g.add(face);
  const arc = (a0, a1, color) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 24, 1, a0, a1 - a0), new THREE.MeshBasicMaterial({ color })); m.position.z = 0.01; g.add(m); };
  // De 0 (izquierda, 210°) a 1 (derecha, -30°)
  const ang = (v) => Math.PI * 7 / 6 - v * (Math.PI * 4 / 3);
  arc(ang(high), ang(low), '#2ecc5a'); arc(ang(1), ang(boom), '#e14b3c');
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: '#1b2a4a' })); g.add(rim);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.02), new THREE.MeshBasicMaterial({ color: '#1b2a4a' })); needle.geometry.translate(0, 0.28, 0); needle.position.z = 0.03; g.add(needle);
  g.userData.needle = needle; g.userData.ang = ang;
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * LANE; return { pos: [-5, 7 + w * 0.2, 10 + w * 0.6], look: [6, 1, 0] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(1400, 200, std({ map: tex.dryGrass([200, 30]), color: '#c9d6a8' }), { x: 500, z: -30 }));
    for (let x = 0; x < 1200; x += 70) { const m = makePeak(16, 24, { color: '#5d6168', snow: 0.5 }); m.position.set(x, 0, -55); group.add(m); }
    for (let x = -10; x < 1200; x += 11) { const t = makePine(3, '#3a5a32'); t.position.set(x, 0, -n * LANE / 2 - 3.5 - (x % 3)); group.add(t); }
    const trains = new Map();
    players.forEach((p, i) => {
      const z = rowX(i, n, LANE);
      // Vías: dos rieles y durmientes
      for (const sz of [-0.55, 0.55]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1200, 0.08, 0.08), std({ color: '#5a5a5a', metalness: 0.6 })); r.position.set(580, 0.1, z + sz); group.add(r); }
      const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.08, 1.6), std({ color: '#5a3a22' }), 900);
      const m4 = new THREE.Matrix4(); for (let k = 0; k < 900; k++) { m4.makeTranslation(-20 + k * 1.3, 0.05, z); ties.setMatrixAt(k, m4); } group.add(ties);
      const train = makeTrain(); train.scale.setScalar(0.8); train.position.set(0, 0, z); group.add(train);
      const ga = gauge(0.55, 0.82, 0.97); ga.position.set(0, 3.4, z); group.add(ga);
      const g = ctx.addChar(p, 0, z, 0.7);
      trains.set(p.id, { z, train, ga, g, built: false });
    });
    return { trains, hillsBuilt: false };
  },
  update(ctx, st, s, dt, time) {
    if (!st.hillsBuilt) {
      st.hillsBuilt = true;
      for (const [a, b] of s.hills) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#9aa87a' }));
        m.scale.set((b - a) / 2, 1.2, 3); m.position.set((a + b) / 2, 0, -st.trains.size * LANE / 2 - 1.2); ctx.group.add(m);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: '#f6b40e' })); sign.position.set(a, 1.6, -st.trains.size * LANE / 2 - 0.4); ctx.group.add(sign);
      }
    }
    let lo = Infinity, hi = -Infinity;
    for (const e of s.ents) {
      const t = st.trains.get(e.id); if (!t) continue;
      t.train.position.x += (e.x - t.train.position.x) * Math.min(1, dt * 10);
      t.train.position.y = e.up ? 0.15 : 0;
      t.train.rotation.z = e.up ? 0.05 : 0;
      t.ga.position.x = t.train.position.x;
      const n = t.ga.userData.needle;
      n.rotation.z = t.ga.userData.ang(e.p) - Math.PI / 2;
      t.ga.rotation.z = e.stall ? Math.sin(time * 30) * 0.08 : 0;
      // El maquinista en la cabina
      t.g.position.set(t.train.position.x - 1.05, 0.9, t.z);
      t.g.rotation.y = Math.PI / 2;
      // Humo: blanco si va bien, mucho vapor si saltó la válvula
      const ok = e.p >= s.low && e.p <= s.high;
      if (Math.random() < dt * (e.stall ? 30 : ok ? 10 : 3)) ctx.splash(new THREE.Vector3(t.train.position.x + 0.6, 2, t.z));
      if (e.stall && !t.boomShown) { t.boomShown = true; ctx.sfx('swoosh'); ctx.burst(new THREE.Vector3(t.train.position.x, 2.5, t.z), 40, 4); }
      if (!e.stall) t.boomShown = false;
      lo = Math.min(lo, e.x); hi = Math.max(hi, e.x);
    }
    const f = fitSpan(st, lo, hi + 5, dt, { base: 15, margin: 4 });
    const n = st.trains.size;
    ctx.setCamera([f.c - 5, (6 + n * 0.8) * f.z, (10 + n * 2.2) * f.z], [f.c + 2, 1, 0]);
  },
};
