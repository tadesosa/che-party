// Escena: Tobogán Pingüino — toboganes de hielo paralelos (uno por jugador) que van hacia la derecha,
// con grietas oscuras y lobos marinos. Cada uno baja de panza.
import * as THREE from 'three';
import { plane, std, rowX, fitSpan } from './util.js';
import { makeSnowPine, makePeak } from '../decor2.js';

const LANE = 3.2;

function makeSeal() {
  const g = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: '#6b5544', roughness: 0.5, clearcoat: 0.4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 6, 10), skin); body.rotation.z = Math.PI / 2; body.position.y = 0.35; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin); head.position.set(-0.5, 0.75, 0); g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std({ color: '#1b1b1b' })); nose.position.set(-0.75, 0.75, 0); g.add(nose);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function makeCrack() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, LANE - 0.4), new THREE.MeshBasicMaterial({ color: '#0d2a40' }));
  m.position.y = 0.06;
  const g = new THREE.Group(); g.add(m);
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * LANE; return { pos: [-4, 7 + w * 0.2, 9 + w * 0.6], look: [6, 0, 0] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(1600, 200, std({ color: '#c9d3df', roughness: 1 }), { x: 600, z: -40 }));
    const lanes = new Map();
    players.forEach((p, i) => {
      const z = rowX(i, n, LANE);
      const chute = plane(1400, LANE - 0.2, new THREE.MeshPhysicalMaterial({ color: '#9fd3f5', roughness: 0.08, clearcoat: 1 }), { x: 680, y: 0.02, z });
      group.add(chute);
      for (const sz of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(1400, 0.35, 0.15), std({ color: '#ffffff' })); rail.position.set(680, 0.17, z + sz * (LANE / 2 - 0.05)); group.add(rail); }
      const g = ctx.addChar(p, 0, z);
      lanes.set(p.id, { z, g, obs: new Map() });
    });
    for (let x = -20; x < 1300; x += 9) { const t = makeSnowPine(3 + (x % 3)); t.position.set(x, 0, -n * LANE / 2 - 3 - (x % 2) * 2); group.add(t); }
    for (let x = 0; x < 1300; x += 60) { const m = makePeak(14, 22, { color: '#5d6168', snow: 0.5 }); m.position.set(x, 0, -45); group.add(m); }
    // Carteles de distancia cada 50 metros
    for (let x = 50; x < 1300; x += 50) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const t = c.getContext('2d');
      t.fillStyle = '#1b2a4a'; t.fillRect(0, 0, 128, 64); t.fillStyle = '#fff'; t.font = 'bold 40px sans-serif'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillText(x + ' m', 64, 34);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: tx })); s.position.set(x, 2.2, -n * LANE / 2 - 1); group.add(s);
    }
    return { lanes };
  },
  update(ctx, st, s, dt, time) {
    let lo = Infinity, hi = -Infinity;
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      // Obstáculos cercanos de este carril
      const want = new Set(s.obs.map((o) => o.x));
      for (const o of s.obs) if (!l.obs.has(o.x)) { const m = o.kind === 'lobo' ? makeSeal() : makeCrack(); m.position.set(o.x, 0, l.z); ctx.group.add(m); l.obs.set(o.x, m); }
      for (const [x, m] of l.obs) if (!want.has(x)) { ctx.group.remove(m); l.obs.delete(x); }
      const g = l.g;
      g.position.x += (e.x - g.position.x) * Math.min(1, dt * 15);
      const jump = e.air ? Math.sin(Math.min(1, e.jt) * Math.PI) * 1.4 : 0;
      g.position.y = 0.15 + jump;
      g.position.z = l.z;
      g.rotation.set(0, Math.PI / 2, 0);
      g.userData.body.rotation.x = 1.25; // de panza
      g.userData.arms.forEach((a) => { a.rotation.z = a.userData.side * 2.9; });
      g.rotation.z = e.hit ? Math.sin(time * 25) * 0.3 : 0;
      if (!e.air && !e.hit && Math.random() < dt * 10) ctx.splash(new THREE.Vector3(g.position.x - 0.6, 0.2, l.z));
      if (e.hit && !l.hitShown) { l.hitShown = true; ctx.sfx('bonk'); }
      if (!e.hit) l.hitShown = false;
      if (e.air && !l.airShown) { l.airShown = true; ctx.sfx('swoosh'); }
      if (!e.air) l.airShown = false;
      lo = Math.min(lo, e.x); hi = Math.max(hi, e.x);
    }
    const f = fitSpan(st, lo, hi + 6, dt, { base: 14, margin: 4 });
    const n = st.lanes.size;
    ctx.setCamera([f.c - 4, (6 + n * 0.7) * f.z, (9 + n * 2) * f.z], [f.c + 2, 0, 0]);
  },
};
