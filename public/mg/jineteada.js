// Escena: Jineteada — el campo del Festival de Jesús María, con tribunas, palenques y un potro por jugador.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane } from './util.js';

const GAP = 4.2;
const ROT = { up: 0, right: -Math.PI / 2, down: Math.PI, left: Math.PI / 2 };

function makeHorse(color) {
  const g = new THREE.Group();
  const hide = new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, clearcoat: 0.3 });
  const dark = std({ color: '#2a1a10' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.5, 8, 14), hide); body.rotation.z = Math.PI / 2; body.position.y = 1.5; g.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 6, 10), hide); neck.position.set(1.1, 2.1, 0); neck.rotation.z = -0.7; g.add(neck);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 10), hide); head.position.set(1.55, 2.45, 0); head.rotation.z = -1.9; g.add(head);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.12), dark); mane.position.set(1.05, 2.45, 0); mane.rotation.z = -0.7; g.add(mane);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1, 8), dark); tail.position.set(-1.25, 1.3, 0); tail.rotation.z = -0.5; g.add(tail);
  const legs = [];
  for (const [x, z] of [[0.7, 0.3], [0.7, -0.3], [-0.7, 0.3], [-0.7, -0.3]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 1.2, z);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 1.2, 8), hide); l.position.y = -0.6; pivot.add(l);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.15, 8), dark); hoof.position.y = -1.2; pivot.add(hoof);
    g.add(pivot); legs.push(pivot);
  }
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.9), std({ color: '#7a3a1a' })); saddle.position.y = 2.05; g.add(saddle);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.legs = legs;
  return g;
}
const ARROWS = {};
function arrowSprite() {
  const m = canvasPlane(1.4, 1.4, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.46, 0, 7); x.fill();
    x.strokeStyle = '#1b2a4a'; x.lineWidth = 10; x.stroke();
    x.fillStyle = '#e14b3c'; x.beginPath(); x.moveTo(w / 2, h * 0.15); x.lineTo(w * 0.8, h * 0.5); x.lineTo(w * 0.6, h * 0.5); x.lineTo(w * 0.6, h * 0.85); x.lineTo(w * 0.4, h * 0.85); x.lineTo(w * 0.4, h * 0.5); x.lineTo(w * 0.2, h * 0.5); x.closePath(); x.fill();
  }, 128);
  return m;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5.5, 9 + w * 0.42], look: [0, 2.4, 0] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(140, 90, std({ map: tex.dirt([24, 16]), color: '#c9a07a' })));
    // Tribunas y banderines de fondo
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 2.2), std({ color: ['#e8e2d2', '#cfc6b0', '#b8ae96'][i] })); t.position.set(0, 0.5 + i * 1, -12 - i * 2.2); group.add(t); }
    for (let i = 0; i < 26; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 3), std({ color: ['#2f86e0', '#ffffff', '#f6b40e'][i % 3] })); f.rotation.x = Math.PI; f.position.set(-20 + i * 1.6, 5.2, -11); group.add(f); }
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 42, 5), std({ color: '#3a3a3a' })); cable.rotation.z = Math.PI / 2; cable.position.set(0, 5.5, -11); group.add(cable);
    const rides = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const horse = makeHorse(['#7a4a2b', '#3a2a20', '#c9a27a', '#f1ead8', '#5a3a2a', '#9a6a44'][i % 6]);
      horse.position.set(x, 0, 0); group.add(horse); // de perfil, mirando a la derecha
      // El palenque (poste)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 3, 8), std({ color: '#6b4a2b' })); post.position.set(x, 1.5, -2); group.add(post);
      const g = ctx.addChar(p, x, 0, 0.85);
      const arrow = arrowSprite(); arrow.visible = false; group.add(arrow);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.85, 32, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: CH[p.char].color, side: THREE.DoubleSide })); group.add(ring);
      rides.set(p.id, { x, horse, g, arrow, ring, fall: 0 });
    });
    return { rides };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const r = st.rides.get(e.id); if (!r) continue;
      // El potro se encabrita en cada corcoveo
      const kick = e.buck ? Math.sin((performance.now() / 450) * Math.PI) : 0;
      const target = e.out ? 0 : e.buck ? 0.5 : Math.sin(time * 6 + r.x) * 0.06;
      r.horse.rotation.z += (target - r.horse.rotation.z) * Math.min(1, dt * 10);
      r.horse.position.y = e.buck ? Math.abs(Math.sin(time * 14)) * 0.5 : 0;
      r.horse.userData.legs.forEach((l, k) => { l.rotation.z = Math.sin(time * (e.out ? 4 : 10) + k * 1.5) * (e.buck ? 0.6 : 0.15); });
      const g = r.g;
      if (e.out) {
        // Tirado en el piso al costado
        r.fall = Math.min(1, r.fall + dt * 2);
        g.position.set(r.x + 1.6 * r.fall, Math.sin(r.fall * Math.PI) * 2, 1.2 * r.fall);
        g.rotation.z = -Math.PI / 2 * r.fall;
      } else {
        g.position.set(r.x - Math.sin(r.horse.rotation.z) * 0.4, 2.1 + r.horse.position.y + Math.sin(r.horse.rotation.z) * 0.3, 0);
        g.rotation.set(0, 0, r.horse.rotation.z * 0.6 + (e.slip ? Math.sin(time * 25) * 0.3 : 0));
        if (e.buck) g.userData.arms[1].rotation.z = -2.6;
      }
      // Flecha a apretar, arriba del jinete, con un aro que se achica (lo que falta para el corcoveo)
      r.arrow.visible = !!e.arrow;
      r.ring.visible = !!e.arrow;
      if (e.arrow) {
        r.arrow.position.set(r.x, 5.1, 0.3);
        r.arrow.rotation.set(0, 0, ROT[e.arrow]);
        r.ring.position.set(r.x, 5.1, 0.28);
        r.ring.scale.setScalar(1.5 - e.u * 0.55);
      }
      if (e.slip && !r.slipShown) { r.slipShown = true; ctx.sfx('bad'); }
      if (!e.slip) r.slipShown = false;
      if (e.out && !r.outShown) { r.outShown = true; ctx.sfx('bonk'); ctx.burst(new THREE.Vector3(r.x + 1.6, 0.5, 1.2), 40, 4); }
    }
  },
};
