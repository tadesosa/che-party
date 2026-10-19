// Escena: Las Vizcachas — un campo de tierra en la Quebrada con nueve cuevas numeradas en una grilla de 3 x 3,
// igual que los botones del celu (1 2 3 arriba, 7 8 9 adelante).
import * as THREE from 'three';
import { plane, std, rowX, canvasPlane } from './util.js';
import { tex } from '../textures.js';
import { makeCardon, makeSevenColors } from '../decor2.js';

const holePos = (i) => [((i % 3) - 1) * 4.2, (Math.floor(i / 3) - 1) * 3.4 - 1];

function makeVizcacha(kind) {
  const g = new THREE.Group();
  const fur = new THREE.MeshPhysicalMaterial({ color: kind === 'dorada' ? '#f2c230' : kind === 'zorrino' ? '#1b1b1b' : '#8a8478', roughness: 0.7, metalness: kind === 'dorada' ? 0.4 : 0 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 6, 12), fur); body.position.y = 0.55; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 10), fur); head.position.y = 1.2; g.add(head);
  if (kind === 'zorrino') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.8), std({ color: '#ffffff' })); stripe.position.set(0, 0.95, -0.05); g.add(stripe);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), fur); tail.scale.set(0.8, 1.4, 0.8); tail.position.set(0, 1.1, -0.5); g.add(tail);
  } else {
    // La vizcacha tiene la cara con rayas blancas y negras
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.1), std({ color: '#ffffff' })); band.position.set(0, 1.18, 0.33); g.add(band);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.1), std({ color: '#1b1b1b' })); band2.position.set(0, 1.07, 0.33); g.add(band2);
  }
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), fur); ear.scale.set(0.8, 1.4, 0.5); ear.position.set(sx * 0.25, 1.55, 0); g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std({ color: '#111' })); eye.position.set(sx * 0.14, 1.28, 0.33); g.add(eye);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export default {
  camera: { pos: [0, 13, 11], look: [0, 0, -1] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(140, 100, std({ map: tex.dirt([24, 18]), color: '#d9a983' })));
    for (const [x, z, r, h] of [[-22, -30, 12, 18], [6, -36, 14, 22], [28, -28, 11, 16]]) { const m = makeSevenColors(r, h); m.position.set(x, 0, z); group.add(m); }
    for (const [x, z] of [[-11, -6], [11, -5], [-12, 3], [12, 4], [-7, -9], [8, -9]]) { const c = makeCardon(2.6); c.position.set(x, 0, z); group.add(c); }
    const holes = [];
    for (let i = 0; i < 9; i++) {
      const [x, z] = holePos(i);
      const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.35, 18), std({ color: '#a8764a' })); mound.position.set(x, 0.17, z); group.add(mound);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.7, 18), new THREE.MeshBasicMaterial({ color: '#2a160a' })); hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.36, z); group.add(hole);
      const num = canvasPlane(0.9, 0.9, (c, w, h) => { c.fillStyle = '#1b2a4a'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `bold ${h * 0.62}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), w / 2, h / 2 + 3); }, 96);
      num.rotation.x = -Math.PI / 2.6; num.position.set(x + 1.15, 0.45, z + 1.05); group.add(num);
      holes.push({ x, z });
    }
    // Los jugadores miran desde adelante
    players.forEach((p, i) => { const g = ctx.addChar(p, rowX(i, n, 2.2), 5.6); g.rotation.y = Math.PI; });
    return { holes, pops: new Map() };
  },
  update(ctx, st, s, dt, time) {
    const live = new Set();
    for (const p of s.pops) {
      live.add(p.id);
      let m = st.pops.get(p.id);
      if (!m) { m = makeVizcacha(p.kind); const h = st.holes[p.hole]; m.position.set(h.x, -1, h.z); ctx.group.add(m); st.pops.set(p.id, m); if (p.kind === 'dorada') ctx.sfx('gold'); }
      // Asoma, se queda y se vuelve a meter; si la tocaron, salta y se va
      const up = p.by ? 1 : p.gone ? 0 : Math.min(1, p.u * 6, (1 - p.u) * 6 + 0.2);
      const target = -1.2 + up * 1.2;
      m.position.y += (target - m.position.y) * Math.min(1, dt * 14);
      if (p.by && !m.userData.hit) { m.userData.hit = true; ctx.sfx(p.kind === 'zorrino' ? 'bad' : 'bonk'); ctx.burst(m.position.clone().add(new THREE.Vector3(0, 1.4, 0)), p.kind === 'dorada' ? 60 : 20, 4); }
      if (p.by) { m.rotation.z += dt * 12; m.scale.y = Math.max(0.3, m.scale.y - dt * 2); }
    }
    for (const [id, m] of st.pops) if (!live.has(id)) { ctx.group.remove(m); st.pops.delete(id); }
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      g.rotation.z = e.lock ? Math.sin(time * 20) * 0.2 : 0;
    }
  },
};
