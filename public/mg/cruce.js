// Escena: Cruzá la 9 de Julio — avenida con bondis y taxis.
import * as THREE from 'three';
import { makeObelisco, makeTree } from '../models.js';
import { makeBus, makeTaxi, makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

const LANES_Z = [6.2, 4.4, 2.6, -2.6, -4.4, -6.2];

export default {
  camera: { pos: [0, 18, 13], look: [0, 0, 1] },
  build(ctx) {
    const { group, players } = ctx;
    // Asfalto en dos manos, cantero verde al medio y veredas
    group.add(plane(60, 6, std({ map: tex.asphalt([12, 1.2]) }), { z: 4.4 }));
    group.add(plane(60, 6, std({ map: tex.asphalt([12, 1.2]) }), { z: -4.4 }));
    group.add(plane(60, 2.6, std({ map: tex.grass([12, 1]) }), { y: 0.02, z: 0 }));
    group.add(plane(60, 3, std({ map: tex.baldosa([15, 1]) }), { y: 0.03, z: 8.9 }));
    group.add(plane(60, 3, std({ map: tex.baldosa([15, 1]) }), { y: 0.03, z: -8.9 }));
    group.add(plane(80, 30, std({ map: tex.grass([20, 8]) }), { y: -0.01, z: -24 }));
    // Líneas de carril
    for (const z of [5.3, 3.5, -3.5, -5.3]) for (let x = -30; x < 30; x += 2.5) group.add(plane(1.3, 0.1, std({ color: '#ffffff' }), { x, y: 0.02, z }));
    // Sendas peatonales de llegada
    for (let x = -9; x <= 9; x += 0.9) { group.add(plane(0.45, 0.8, std({ color: '#f2f2f2' }), { x, y: 0.021, z: 7.5 })); group.add(plane(0.45, 0.8, std({ color: '#f2f2f2' }), { x, y: 0.021, z: -7.5 })); }
    const obe = makeObelisco(); obe.scale.setScalar(0.9); obe.position.set(14, 0, -16); group.add(obe);
    for (let x = -22; x <= 22; x += 6) {
      const f = makeFarol(); f.position.set(x, 0, 0.9); group.add(f);
      const t = makeTree(x % 4 === 0); t.position.set(x + 3, 0, -0.6); t.scale.setScalar(0.7); group.add(t);
    }
    // Banderines de llegada
    const goal = new THREE.Mesh(new THREE.BoxGeometry(19, 0.15, 0.15), std({ color: '#f6b40e' }));
    goal.position.set(0, 2.6, -8.6); group.add(goal);
    const n = players.length;
    players.forEach((p, i) => ctx.addChar(p, n === 1 ? 0 : -6 + (12 * i) / (n - 1), 8.6));
    return { vehicles: [] };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    if (!st.vehicles.length) {
      st.vehicles = s.vehicles.map((v) => {
        const m = v.k === 'bondi' ? makeBus(v.color) : makeTaxi();
        if (v.k === 'bondi') m.scale.setScalar(0.85);
        m.rotation.y = v.dir > 0 ? 0 : Math.PI;
        ctx.group.add(m);
        return m;
      });
    }
    s.vehicles.forEach((v, i) => {
      const m = st.vehicles[i]; if (!m) return;
      // Cuando da la vuelta al borde, salta directo
      if (Math.abs(m.position.x - v.x) > 6) m.position.x = v.x; else m.position.x += (v.x - m.position.x) * k;
      m.position.z = v.z;
      m.position.y = Math.abs(Math.sin(time * 18 + i)) * 0.03;
    });
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      // Si vuelve a la salida, aparece directo
      if (Math.abs(g.position.z - e.z) > 5) { g.position.z = e.z; g.position.x = e.x; }
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      const sp = speedOf(g, dt);
      g.userData.body.scale.y += ((e.stun ? 0.25 : 1) - g.userData.body.scale.y) * k;
      if (!e.stun) walkAnim(g, time, sp / 5, g.id);
    }
  },
};
