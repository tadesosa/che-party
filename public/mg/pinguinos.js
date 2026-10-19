// Escena: Arreá los Pingüinos — una playa de piedras y nieve en el Beagle, con un corral de hielo por jugador.
import * as THREE from 'three';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';
import { tex } from '../textures.js';
import { makePenguin, makePeak } from '../decor2.js';

export default {
  camera: { pos: [0, 18, 15], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players, CH } = ctx;
    group.add(plane(140, 100, new THREE.MeshPhysicalMaterial({ color: '#2a6f9a', map: tex.water([30, 20]), roughness: 0.1, clearcoat: 1 }), { y: -0.2 }));
    const ice = new THREE.Mesh(new THREE.CircleGeometry(1, 48), std({ color: '#cdd7e2', roughness: 1 }));
    ice.rotation.x = -Math.PI / 2; ice.scale.set(10.6, 8.2, 1); ice.position.y = 0.01; group.add(ice);
    for (const [x, z, r, h] of [[-22, -30, 12, 20], [6, -36, 14, 26], [30, -28, 11, 18]]) { const m = makePeak(r, h, { color: '#5d6168', snow: 0.5 }); m.position.set(x, -0.2, z); group.add(m); }
    for (const p of players) ctx.addChar(p, 0, 0);
    return { pens: false, pgs: new Map(), CH };
  },
  update(ctx, st, s, dt, time) {
    if (!st.pens) {
      st.pens = true;
      for (const pen of s.pens) {
        const color = st.CH[ctx.players.find((p) => p.id === pen.id).char].color;
        const floor = new THREE.Mesh(new THREE.CircleGeometry(s.pen, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
        floor.rotation.x = -Math.PI / 2; floor.position.set(pen.x, 0.03, pen.z); ctx.group.add(floor);
        // Paredcita de bloques de hielo (con una entrada)
        for (let i = 0; i < 10; i++) {
          const a = (i / 12) * Math.PI * 2 + Math.atan2(pen.z, pen.x) + Math.PI / 6;
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.35), new THREE.MeshPhysicalMaterial({ color: '#d6efff', roughness: 0.2, clearcoat: 1 }));
          b.position.set(pen.x + Math.cos(a) * (s.pen + 0.2), 0.23, pen.z + Math.sin(a) * (s.pen + 0.2)); b.rotation.y = -a; ctx.group.add(b);
        }
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
        flag.position.set(pen.x * 1.1, 1.6, pen.z * 1.1); ctx.group.add(flag);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 5), std({ color: '#ffffff' })); pole.position.set(pen.x * 1.1 - 0.35, 0.95, pen.z * 1.1); ctx.group.add(pole);
      }
    }
    for (const p of s.pgs) {
      let m = st.pgs.get(p.id);
      if (!m) { m = makePenguin(); m.scale.setScalar(1.25); ctx.group.add(m); st.pgs.set(p.id, m); }
      const moved = Math.hypot(p.x - m.position.x, p.z - m.position.z);
      m.position.x += (p.x - m.position.x) * Math.min(1, dt * 12);
      m.position.z += (p.z - m.position.z) * Math.min(1, dt * 12);
      if (moved > 0.02) m.rotation.y = p.a;
      // Caminan bamboleándose; adentro del corral saltan contentos
      m.rotation.z = Math.sin(time * 14 + p.id) * Math.min(0.25, moved * 3);
      m.position.y = p.in ? Math.abs(Math.sin(time * 6 + p.id)) * 0.2 : 0;
      if (p.in && !m.userData.in) { m.userData.in = true; ctx.sfx('good'); }
    }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
    }
  },
};
