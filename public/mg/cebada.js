// Escena: Cebá el Mate — una mesita por jugador con su mate, el termo y el agua que sube.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, rowX, makeMeter, setNeedle } from './util.js';

const GAP = 3.2;

function makeMate() {
  const g = new THREE.Group();
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18, 0, Math.PI * 2, 0.55, Math.PI - 0.55), new THREE.MeshPhysicalMaterial({ color: '#7a4a24', roughness: 0.5, clearcoat: 0.6, side: THREE.DoubleSide }));
  gourd.position.y = 0.5; gourd.scale.y = 1.1; g.add(gourd);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.05, 8, 24), std({ color: '#c9a227', metalness: 0.6, roughness: 0.3 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 1.01; g.add(rim);
  // Yerba y agua: un disco que sube
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.05, 20), new THREE.MeshPhysicalMaterial({ color: '#6f8f3a', roughness: 0.2, clearcoat: 1 }));
  water.position.y = 0.55; g.add(water);
  const bombilla = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), std({ color: '#d9d9d9', metalness: 0.8, roughness: 0.2 }));
  bombilla.position.set(0.12, 1.15, 0); bombilla.rotation.z = -0.25; g.add(bombilla);
  g.userData.water = water;
  return g;
}
function makeTermo() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16), std({ color: '#2e9e48', metalness: 0.3, roughness: 0.4 })));
  g.children[0].position.y = 0.75;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 16), std({ color: '#1b2a4a' })); cap.position.y = 1.65; g.add(cap);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), std({ color: '#1b2a4a' })); spout.rotation.z = Math.PI / 2; spout.position.set(-0.3, 1.6, 0); g.add(spout);
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5 + w * 0.15, 5.5 + w * 0.5], look: [0, 1.6, -0.5] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 50, std({ map: tex.grass([20, 12]) })));
    group.add(plane(n * GAP + 6, 6, std({ map: tex.wood([n * 2, 3]) }), { y: 0.01 }));
    for (const x of [-n * GAP / 2 - 4, n * GAP / 2 + 4]) { const t = makeTree(x > 0); t.position.set(x, 0, -3); group.add(t); }
    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 20), std({ color: '#f4efe2' })); table.position.set(x + 0.55, 0.9, 0.4); group.add(table);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), std({ color: '#6b4a2b' })); leg.position.set(x + 0.55, 0.45, 0.4); group.add(leg);
      const mate = makeMate(); mate.position.set(x + 0.35, 0.95, 0.6); mate.scale.setScalar(0.8); group.add(mate);
      const termo = makeTermo(); termo.position.set(x + 1.05, 0.95, 0.2); termo.scale.setScalar(0.7); group.add(termo);
      const meter = makeMeter([0.7, 0.95, 0.83, 0.93]); meter.position.set(x, 3.4, 0); group.add(meter);
      ctx.addChar(p, x - 0.8, 0.3);
      slots.set(p.id, { x, mate, termo, meter, lastQ: null, drops: [] });
    });
    return { slots };
  },
  update(ctx, st, s, dt) {
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const g = ctx.chars.get(e.id);
      g.rotation.y = 0;
      const w = sl.mate.userData.water;
      sl.meter.visible = e.v != null;
      if (e.v != null) {
        setNeedle(sl.meter, e.v, Math.min(1, dt * 25));
        w.position.y = 0.55 + e.v * 0.45;
        sl.termo.rotation.z = 0.9; // sirviendo
        if (Math.random() < dt * 12) {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: '#bfe3ff' }));
          d.position.set(sl.x + 0.5, 1.9, 0.5); ctx.group.add(d); sl.drops.push({ m: d, v: 0 });
        }
      } else sl.termo.rotation.z *= 0.85;
      if (e.last && e.last !== sl.lastQ) {
        sl.lastQ = e.last;
        if (e.last === 'rebalsa') { ctx.splash(sl.mate.position.clone().add(new THREE.Vector3(0, 1, 0))); ctx.sfx('bad'); }
        if (e.last === 'perfecto') ctx.burst(sl.mate.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 30, 3);
      }
      if (!e.last) { sl.lastQ = null; if (e.v == null) w.position.y += (0.55 - w.position.y) * dt * 3; }
      for (let i = sl.drops.length - 1; i >= 0; i--) {
        const d = sl.drops[i]; d.v += dt * 12; d.m.position.y -= d.v * dt;
        if (d.m.position.y < w.position.y * 0.8 + 0.95) { ctx.group.remove(d.m); sl.drops.splice(i, 1); }
      }
      g.userData.body.rotation.x = e.v != null ? 0.15 : 0;
    }
  },
};
