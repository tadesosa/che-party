// Escena: La Fila del Banco — el hall de un banco, una fila por jugador y el guardia que se da vuelta.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, walkAnim, canvasPlane } from './util.js';

const GAP = 2.2, START = 9, END = -9; // la ventanilla queda al fondo (z negativa)

function makeGuard() {
  const g = new THREE.Group();
  const blue = std({ color: '#1f3b73' }), skin = std({ color: '#e8b98a' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 6, 12), blue); body.position.y = 1.2; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), skin); head.position.y = 2.5; g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.25, 16), blue); cap.position.y = 2.85; g.add(cap);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.35), std({ color: '#111' })); visor.position.set(0, 2.75, 0.4); g.add(visor);
  for (const x of [-0.16, 0.16]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std({ color: '#111' })); eye.position.set(x, 2.55, 0.4); g.add(eye); }
  const mous = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.06), std({ color: '#3a2a1a' })); mous.position.set(0, 2.38, 0.43); g.add(mous);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), std({ color: '#f6b40e', metalness: 0.6 })); badge.position.set(0.25, 1.7, 0.56); g.add(badge);
  return g;
}

export default {
  camera(n) { const w = Math.max(3, n) * GAP; return { pos: [w * 0.45 + 6, 9, START + 7], look: [0, 0.5, -1] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length, w = Math.max(3, n) * GAP + 4;
    group.add(plane(w + 30, 40, std({ map: tex.baldosa([12, 14]) })));
    // Mostrador con ventanillas
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, 1), std({ map: tex.wood([4, 1]) })); counter.position.set(0, 0.7, END - 1.2); group.add(counter);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, 0.06), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.35, roughness: 0.05 })); glass.position.set(0, 2.2, END - 1.2); group.add(glass);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w + 30, 7, 0.4), std({ color: '#e9e2d0' })); wall.position.set(0, 3.5, END - 4); group.add(wall);
    const sign = canvasPlane(6, 1.1, (x, cw, ch) => {
      x.fillStyle = '#1b2a4a'; x.fillRect(0, 0, cw, ch);
      x.fillStyle = '#f6b40e'; x.font = `bold ${ch * 0.55}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🏦 BANCO CHE', cw / 2, ch / 2 + 2);
    }, 512);
    sign.position.set(0, 5.3, END - 3.75); group.add(sign);
    // Cintas de la fila y postes
    for (let i = 0; i <= n; i++) {
      const x = rowX(i, n + 1, GAP);
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, START - END), std({ color: '#c0392b' })); tape.position.set(x, 0.95, (START + END) / 2); group.add(tape);
      for (const z of [START, (START + END) / 2, END]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1, 8), std({ color: '#c9a227', metalness: 0.7, roughness: 0.3 })); post.position.set(x, 0.5, z); group.add(post); }
    }
    const guard = makeGuard(); guard.position.set(0, 0, END - 2.6); group.add(guard);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), new THREE.MeshBasicMaterial({ color: '#2e9e48' })); light.position.set(w / 2 - 1, 4.2, END - 3.7); group.add(light);
    const lanes = new Map();
    players.forEach((p, i) => { const x = rowX(i, n, GAP); const g = ctx.addChar(p, x, START); g.rotation.y = Math.PI; lanes.set(p.id, { x, g, z: START }); });
    return { guard, light, lanes, rot: Math.PI };
  },
  update(ctx, st, s, dt, time) {
    // El guardia: de espaldas (mirando la pared) o de frente a la fila
    const target = s.guard === 'away' ? Math.PI : s.guard === 'turning' ? Math.PI * 0.5 : 0;
    st.rot += (target - st.rot) * Math.min(1, dt * 10);
    st.guard.rotation.y = st.rot;
    st.light.material.color.set(s.guard === 'away' ? '#2e9e48' : s.guard === 'turning' ? '#f2c230' : '#e14b3c');
    if (s.guard !== st.lastGuard) { if (s.guard === 'look') ctx.sfx('whistle'); st.lastGuard = s.guard; }
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      const tz = START + (END - START) * (e.d / s.goal);
      l.z += (tz - l.z) * Math.min(1, dt * (e.caught ? 4 : 10));
      l.g.position.set(l.x, 0, l.z);
      l.g.rotation.y = Math.PI;
      walkAnim(l.g, time, e.mv ? 1 : 0, l.x);
      if (e.caught && !l.shown) { l.shown = true; ctx.sfx('bad'); }
      if (!e.caught) l.shown = false;
    }
  },
};
