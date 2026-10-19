// Escena: Rafting en el Río Mendoza — dos carriles de río marrón con piedras y una balsa por equipo.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, fitSpan } from './util.js';

const TEAM = ['#2f86e0', '#e14b3c'];
const SC = 0.6; // metros del río -> unidades

function makeRaft(color) {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.35, 10, 24), std({ color, roughness: 0.5 })); tube.rotation.x = Math.PI / 2; tube.scale.set(1.4, 1, 1); g.add(tube);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), std({ color: '#333' })); floor.rotation.x = -Math.PI / 2; floor.scale.set(1.4, 1, 1); floor.position.y = -0.1; g.add(floor);
  return g;
}

export default {
  camera: { pos: [-8, 9, 13], look: [-4, 0, 0] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(160, 60, std({ map: tex.dryGrass([30, 14]) })));
    const LANE = 6;
    for (const z of [-LANE / 2 - 0.2, LANE / 2 + 0.2]) {
      const river = plane(60 * SC + 30, LANE, std({ map: tex.water([20, 3]), color: '#a08060', roughness: 0.2 }), { y: 0.02, z, x: 60 * SC / 2 });
      group.add(river);
    }
    // Paredones del cañón
    for (const z of [-LANE - 1.5, LANE + 1.5]) for (let x = -10; x < 60 * SC + 15; x += 4) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), std({ color: '#8a7355', flatShading: true })); r.position.set(x, 0.8, z + (Math.random() - 0.5)); group.add(r);
    }
    const rafts = [makeRaft(TEAM[0]), makeRaft(TEAM[1])];
    rafts.forEach((r, i) => { r.position.set(0, 0.25, i ? LANE / 2 + 0.2 : -LANE / 2 - 0.2); group.add(r); });
    const crew = [[], []];
    for (const p of players) { const g = ctx.addChar(p, 0, 0, 0.75); crew[g.userData.team === 1 ? 1 : 0].push(g); }
    return { rafts, crew, rocks: null, LANE, camX: 0, finish: null };
  },
  update(ctx, st, s, dt, time) {
    if (!st.rocks) {
      st.rocks = true;
      for (const k of s.rocks) for (const lz of [-st.LANE / 2 - 0.2, st.LANE / 2 + 0.2]) {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), std({ color: '#6b6b6b', flatShading: true }));
        r.position.set(k.d * SC, 0.2, lz + (k.z / s.half) * (st.LANE / 2 - 0.4)); ctx.group.add(r);
      }
      const fin = plane(0.5, st.LANE * 2 + 0.4, std({ color: '#ffffff' }), { x: s.len * SC, y: 0.05 }); ctx.group.add(fin);
    }
    let lead = 0, last = Infinity;
    s.rafts.forEach((r, i) => {
      const raft = st.rafts[i];
      const lz = i ? st.LANE / 2 + 0.2 : -st.LANE / 2 - 0.2;
      const x = r.d * SC, z = lz + (r.z / s.half) * (st.LANE / 2 - 0.4);
      raft.position.x += (x - raft.position.x) * Math.min(1, dt * 10);
      raft.position.z += (z - raft.position.z) * Math.min(1, dt * 10);
      raft.position.y = 0.25 + Math.sin(time * 4 + i) * 0.08;
      raft.rotation.y = -r.vz * 0.08 + (r.bump ? Math.sin(time * 30) * 0.15 : 0);
      lead = Math.max(lead, raft.position.x); last = Math.min(last, raft.position.x);
      st.crew[i].forEach((g, k) => {
        const side = k === 0 ? -1 : 1;
        g.position.set(raft.position.x + (k > 1 ? -0.6 : 0.2), raft.position.y + 0.1, raft.position.z + side * 0.6);
        g.rotation.y = Math.PI / 2;
        g.userData.body.rotation.z = Math.sin(time * 10 + k) * 0.25;
      });
    });
    // Encuadra los dos gomones
    const f = fitSpan(st, last, lead, dt, { base: 15, maxC: s.len * SC - 4 });
    ctx.setCamera([f.c - 6, 9 * f.z, 13 * f.z], [f.c, 0, 0]);
  },
};
