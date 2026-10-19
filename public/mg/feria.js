// Escena: Regateo en San Telmo — puestitos de antigüedades en la plaza Dorrego, con el precio arriba de cada uno.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { plane, std, rowX, makeMeter, setNeedle } from './util.js';

const GAP = 3.4;
const GOODS = ['#c9a227', '#8a5a33', '#b5446e', '#4a6fa5', '#2e9e48', '#c0392b'];

function makeStall(i) {
  const g = new THREE.Group();
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.2), std({ color: '#f4efe2' })); table.position.y = 0.9; g.add(table);
  for (const x of [-1.1, 1.1]) for (const z of [-0.5, 0.5]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), std({ color: '#555' })); l.position.set(x, 0.45, z); g.add(l); }
  const awn = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.6), std({ color: i % 2 ? '#e14b3c' : '#2f86e0' })); awn.position.y = 2.6; g.add(awn);
  for (const x of [-1.2, 1.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), std({ color: '#ddd' })); p.position.set(x, 1.3, -0.6); g.add(p); }
  // Chucherías: un sifón, un farol viejo y una caja
  const sifon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.6, 12), new THREE.MeshPhysicalMaterial({ color: '#5fb3ff', transparent: true, opacity: 0.7, roughness: 0.1 })); sifon.position.set(-0.7, 1.26, 0); g.add(sifon);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), std({ color: GOODS[i % 6] })); box.position.set(0.1, 1.11, 0.1); g.add(box);
  const vase = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), std({ color: GOODS[(i + 2) % 6], metalness: 0.4 })); vase.position.set(0.75, 1.18, 0); g.add(vase);
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5 + w * 0.15, 6 + w * 0.5], look: [0, 1.8, -0.5] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 50, std({ map: tex.cobble([30, 20]) })));
    for (const x of [-n * GAP / 2 - 4, n * GAP / 2 + 4]) { const t = makeTree(x > 0); t.position.set(x, 0, -3); group.add(t); const f = makeFarol(); f.position.set(x * 0.8, 0, 2); group.add(f); }
    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const stall = makeStall(i); stall.position.set(x, 0, -0.6); group.add(stall);
      const meter = makeMeter([0, 0.22, 0, 0.08], 2.4); meter.position.set(x, 3.4, -0.6); group.add(meter);
      ctx.addChar(p, x, 0.9);
      slots.set(p.id, { x, meter, lastQ: null });
    });
    return { slots };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const g = ctx.chars.get(e.id);
      g.rotation.y = Math.PI;
      sl.meter.visible = e.v != null;
      if (e.v != null) setNeedle(sl.meter, e.v, Math.min(1, dt * 25));
      if (e.last && e.last !== sl.lastQ) {
        sl.lastQ = e.last;
        if (e.last === 'regalo') ctx.burst(new THREE.Vector3(sl.x, 2, -0.6), 40, 4);
        ctx.sfx(e.last === 'caro' ? 'bad' : 'coin');
      }
      if (!e.last) sl.lastQ = null;
      g.userData.body.position.y = e.last === 'regalo' ? Math.abs(Math.sin(time * 12)) * 0.3 : 0;
    }
  },
};
