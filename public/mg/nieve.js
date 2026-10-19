// Escena: Guerra de Bolas de Nieve — una cancha nevada al pie del Catedral, con murallitas y pinos.
import * as THREE from 'three';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';
import { makeSnowPine, makePeak } from '../decor2.js';

const TEAM = ['#5fb3ff', '#ff6b5e'];

export default {
  camera: { pos: [0, 15, 14], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(120, 90, std({ color: '#c9d3df', roughness: 1 })));
    // Línea del medio y las dos mitades con un tinte del color de cada equipo
    group.add(plane(0.25, 14, std({ color: '#9fb4c8' }), { y: 0.02 }));
    group.add(plane(10, 13, new THREE.MeshBasicMaterial({ color: TEAM[0], transparent: true, opacity: 0.12 }), { x: -6, y: 0.015 }));
    group.add(plane(10, 13, new THREE.MeshBasicMaterial({ color: TEAM[1], transparent: true, opacity: 0.12 }), { x: 6, y: 0.015 }));
    for (const [x, z] of [[-14, -8], [14, -8], [-15, 5], [15, 6], [-6, -11], [6, -11], [0, -12]]) { const t = makeSnowPine(3.6); t.position.set(x, 0, z); group.add(t); }
    for (const [x, z, r, h] of [[-20, -34, 12, 18], [6, -40, 14, 24], [28, -32, 11, 16]]) { const m = makePeak(r, h, { color: '#6f6a64', snow: 0.45 }); m.position.set(x, 0, z); group.add(m); }
    for (const p of players) ctx.addChar(p, 0, 0);
    return { walls: false, balls: new Map(), ice: new Map() };
  },
  update(ctx, st, s, dt, time) {
    if (!st.walls) {
      st.walls = true;
      for (const [x, z, h] of s.walls) {
        const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, h * 2 - 0.9, 6, 12), std({ color: '#dde5ee', roughness: 1 }));
        w.rotation.x = Math.PI / 2; w.scale.y = 1; w.position.set(x, 0.45, z); w.castShadow = true; ctx.group.add(w);
      }
    }
    const live = new Set();
    for (const b of s.balls) {
      live.add(b.id);
      let m = st.balls.get(b.id);
      if (!m) { m = new THREE.Mesh(new THREE.SphereGeometry(b.r * 0.55, 12, 10), std({ color: '#ffffff' })); m.castShadow = true; ctx.group.add(m); st.balls.set(b.id, m); ctx.sfx('swoosh'); }
      m.position.set(b.x, 1.1, b.z);
    }
    for (const [id, m] of st.balls) if (!live.has(id)) { ctx.group.remove(m); st.balls.delete(id); ctx.burst(m.position.clone(), 10, 2); }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      // Siempre mirando hacia el otro equipo
      face(g, e.team ? -Math.PI / 2 : Math.PI / 2, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      // Congelado: un bloque de hielo alrededor
      let ice = st.ice.get(e.id);
      if (!ice) { ice = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 1.2), new THREE.MeshPhysicalMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.5, roughness: 0.1, clearcoat: 1 })); ctx.group.add(ice); st.ice.set(e.id, ice); }
      ice.visible = e.frozen; ice.position.set(g.position.x, 1, g.position.z);
      if (e.throwing) g.userData.arms[1].rotation.x = -2.2;
    }
  },
};
