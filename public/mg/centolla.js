// Escena: La Garra de la Centolla — una pecera grande en el puerto, con una garra de color por jugador colgando
// de un riel arriba, y centollas rojas caminando de costado.
import * as THREE from 'three';
import { plane, std } from './util.js';
import { tex } from '../textures.js';

const TOP = 4.2;

function makeCrab(size) {
  const g = new THREE.Group();
  const shell = new THREE.MeshPhysicalMaterial({ color: size === 3 ? '#f2c230' : '#d63a2f', roughness: 0.4, clearcoat: 0.8, metalness: size === 3 ? 0.4 : 0 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), shell); body.scale.set(1.2, 0.45, 1); body.position.y = 0.35; g.add(body);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.75, 5), shell);
    leg.position.set(sx * 0.5, 0.2, -0.2 + i * 0.2); leg.rotation.z = sx * 1.1; g.add(leg);
  }
  for (const sx of [-1, 1]) { const claw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), shell); claw.scale.set(1, 0.7, 1.5); claw.position.set(sx * 0.3, 0.4, 0.5); g.add(claw); }
  for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), std({ color: '#111' })); eye.position.set(sx * 0.1, 0.6, 0.3); g.add(eye); }
  g.scale.setScalar(size === 1 ? 0.8 : size === 2 ? 1.1 : 1.35);
  return g;
}
function makeClaw(color) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: 0.8, roughness: 0.3 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.35, 12), new THREE.MeshPhysicalMaterial({ color, clearcoat: 0.6 })); g.add(head);
  const fingers = [];
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group(); pivot.rotation.y = (i / 3) * Math.PI * 2; pivot.position.y = -0.15;
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.08), metal); f.position.set(0, -0.3, 0.22); f.rotation.x = 0.35;
    pivot.add(f); g.add(pivot); fingers.push(f);
  }
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), std({ color: '#333' })); cable.geometry.translate(0, 0.5, 0); g.add(cable);
  g.userData.fingers = fingers; g.userData.cable = cable;
  return g;
}

export default {
  camera: { pos: [0, 13, 13], look: [0, 0.8, 0] },
  build(ctx) {
    const { group, players, CH } = ctx;
    group.add(plane(120, 90, std({ map: tex.wood([20, 14]), color: '#a8845a' })));
    // La pecera: piso de arena, agua celeste transparente y vidrios
    group.add(plane(19, 12, std({ map: tex.sand([6, 4]), color: '#d9c9a0' }), { y: 0.02 }));
    const water = new THREE.Mesh(new THREE.BoxGeometry(19, 2.2, 12), new THREE.MeshPhysicalMaterial({ color: '#5fb3e0', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }));
    water.position.y = 1.1; group.add(water);
    const frame = std({ color: '#2a3340' });
    for (const [x, z] of [[-9.5, -6], [9.5, -6], [-9.5, 6], [9.5, 6]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, TOP + 0.4, 0.2), frame); p.position.set(x, (TOP + 0.4) / 2, z); group.add(p); }
    for (const z of [-6, 6]) { const r = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.2, 0.2), frame); r.position.set(0, TOP + 0.4, z); group.add(r); }
    for (let i = 0; i < 12; i++) { const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (i % 3) * 0.15, 0), std({ color: '#7d7468', flatShading: true })); rock.position.set(-8.5 + (i * 1.6) % 17, 0.2, i % 2 ? -5 : 5.2); group.add(rock); }
    for (let i = 0; i < 8; i++) { const weed = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 5), std({ color: '#2e7a3a' })); weed.position.set(-8 + i * 2.3, 0.6, i % 2 ? -5.3 : 5.4); group.add(weed); }
    const claws = new Map();
    for (const p of players) {
      const c = makeClaw(CH[p.char].color); group.add(c);
      // El jugador mira desde afuera, abajo de la pecera
      const g = ctx.addChar(p, 0, 7.2, 0.8);
      claws.set(p.id, { c, g });
    }
    return { claws, crabs: new Map() };
  },
  update(ctx, st, s, dt, time) {
    const live = new Set();
    for (const c of s.crabs) {
      live.add(c.id);
      let m = st.crabs.get(c.id);
      if (!m) { m = makeCrab(c.size); ctx.group.add(m); st.crabs.set(c.id, m); }
      if (c.held) {
        const cl = st.claws.get(c.held);
        if (cl) { m.position.set(cl.c.position.x, cl.c.position.y - 0.85, cl.c.position.z); m.rotation.y += dt * 3; }
      } else {
        m.position.x += (c.x - m.position.x) * Math.min(1, dt * 10);
        m.position.z += (c.z - m.position.z) * Math.min(1, dt * 10);
        m.position.y = 0.05;
        m.rotation.y = 0;
        m.rotation.z = Math.sin(time * 12 + c.id) * 0.08;
      }
    }
    for (const [id, m] of st.crabs) if (!live.has(id)) { ctx.group.remove(m); st.crabs.delete(id); }
    const players = ctx.players;
    s.ents.forEach((e, i) => {
      const cl = st.claws.get(e.id); if (!cl) return;
      const y = TOP - e.h * (TOP - 1.2);
      cl.c.position.set(e.x, y, e.z);
      cl.c.userData.cable.scale.y = TOP + 0.4 - y;
      // Los dedos se cierran abajo
      const close = e.h > 0.9 || e.grabbed ? 0.05 : 0.45;
      cl.c.userData.fingers.forEach((f) => { f.rotation.x += (close - f.rotation.x) * Math.min(1, dt * 10); });
      cl.g.position.set(-7 + (i / Math.max(1, players.length - 1)) * 14, 0, 7.2);
      cl.g.rotation.y = Math.PI;
      if (e.h > 0.95 && !cl.down) { cl.down = true; ctx.sfx('pop'); }
      if (e.h < 0.5) cl.down = false;
    });
  },
};
