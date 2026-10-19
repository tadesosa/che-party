// Escena: Pisada de Uvas — una tina de madera por jugador en un viñedo, con la jarra que se va llenando.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const GAP = 3.2;

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5 + w * 0.15, 6 + w * 0.5], look: [0, 1.4, -0.5] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 50, std({ map: tex.dryGrass([20, 12]) })));
    // Hileras de vid al fondo
    for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
      const vine = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), std({ color: '#3f8a3a', flatShading: true }));
      vine.position.set(-16 + i * 3, 1, -6 - r * 3); vine.scale.y = 1.3; group.add(vine);
      if (i % 2) { const grape = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), std({ color: '#5b2a6e' })); grape.position.set(-16 + i * 3 + 0.4, 0.8, -5.4 - r * 3); group.add(grape); }
    }
    const tubs = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.95, 0.9, 20, 1, true), std({ map: tex.wood([4, 1]), side: THREE.DoubleSide })); tub.position.set(x, 0.45, 0); group.add(tub);
      for (const y of [0.15, 0.75]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.05 - y * 0.1, 0.04, 6, 24), std({ color: '#3a3a3a' })); hoop.rotation.x = Math.PI / 2; hoop.position.set(x, y, 0); group.add(hoop); }
      const grapes = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 20), std({ color: '#5b2a6e', roughness: 0.4 })); grapes.position.set(x, 0.75, 0); group.add(grapes);
      // Jarra de vidrio con el jugo que sube
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 14, 1, true), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide }));
      jar.position.set(x + 1.4, 0.55, 0.4); group.add(jar);
      const juice = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 14), std({ color: '#7a1f4a', roughness: 0.2 })); juice.position.set(x + 1.4, 0.05, 0.4); juice.scale.y = 0.01; group.add(juice);
      const g = ctx.addChar(p, x, 0); g.position.y = 0.8;
      tubs.set(p.id, { x, g, grapes, juice, step: 0 });
    });
    return { tubs };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const t = st.tubs.get(e.id); if (!t) continue;
      const g = t.g;
      g.rotation.y = 0;
      // Pisotón: el cuerpo se inclina al lado del pie que pisó
      t.step += ((e.side || 0) * 0.18 - t.step) * Math.min(1, dt * 18);
      g.userData.body.rotation.z = e.slip ? Math.sin(time * 20) * 0.4 : t.step;
      g.position.y = 0.8 + Math.abs(t.step) * 0.6 - (e.slip ? 0.3 : 0);
      const k = e.juice / s.full;
      t.juice.scale.y = Math.max(0.01, k * 1.05); t.juice.position.y = 0.02 + k * 0.52;
      t.grapes.position.y = 0.75 - k * 0.3;
      if (e.fin && !t.done) { t.done = true; ctx.burst(t.juice.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 40, 4); }
    }
  },
};
