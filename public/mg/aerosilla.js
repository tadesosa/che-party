// Escena: Subite a la Aerosilla — un andén por jugador, escalonados como el cerro. Las sillitas pasan por arriba
// del andén y la zona verde marca cuándo saltar. Cada tramo que subís, tu andén queda más arriba.
import * as THREE from 'three';
import { plane, std, rowX, fitSpan } from './util.js';
import { makeSnowPine, makePeak } from '../decor2.js';

const GAP = 4.2, STEP_H = 1.3;

function makeChair(color) {
  const g = new THREE.Group();
  const metal = std({ color: '#4d5660', metalness: 0.5 });
  const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), metal); hang.position.y = 0.7; g.add(hang);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.7), new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.6 })); g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.1), seat.material); back.position.set(0, 0.3, -0.32); g.add(back);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 6, 11 + w * 0.4], look: [0, 3, 0] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(140, 90, std({ color: '#c9d3df', roughness: 1 })));
    for (const [x, z, r, h] of [[-26, -40, 14, 30], [4, -46, 16, 36], [30, -38, 12, 26]]) { const m = makePeak(r, h, { color: '#6f6a64', snow: 0.5 }); m.position.set(x, 0, z); group.add(m); }
    for (let i = 0; i < 16; i++) { const t = makeSnowPine(3 + (i % 3)); t.position.set(-28 + i * 3.8, 0, -10 - (i % 2) * 3); group.add(t); }
    const lanes = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const root = new THREE.Group(); root.position.x = x; group.add(root);
      // Escalera de andenes (uno por tramo) y el cable que pasa por arriba
      for (let k = 0; k <= 8; k++) {
        const pl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 2.2), std({ color: k === 8 ? '#f6b40e' : '#8a6a4a' }));
        pl.position.set(0, k * STEP_H, -k * 0.9); pl.receiveShadow = true; root.add(pl);
      }
      const zone = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), new THREE.MeshBasicMaterial({ color: '#2ecc5a', transparent: true, opacity: 0.55 }));
      zone.rotation.x = -Math.PI / 2; root.add(zone);
      // Cable propio de cada andén (no cruza a los otros) con dos postes
      const cable = new THREE.Group(); root.add(cable);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, GAP - 0.3, 6), std({ color: '#2a2a2a' })); wire.rotation.z = Math.PI / 2; cable.add(wire);
      for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), std({ color: '#5d6670' })); pole.position.set(sx * (GAP / 2 - 0.2), -1.6, -0.6); cable.add(pole); }
      const chairs = [];
      for (let k = 0; k < 8; k++) { const c = makeChair(['#e14b3c', '#f2c230', '#2f86e0'][k % 3]); c.scale.setScalar(1.35); root.add(c); chairs.push(c); }
      const g = ctx.addChar(p, x, 0.15);
      lanes.set(p.id, { x, root, zone, cable, chairs, g, y: 0, color: CH[p.char].color });
    });
    return { lanes };
  },
  update(ctx, st, s, dt, time) {
    let lo = Infinity, hi = -Infinity;
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      const target = Math.min(e.stage, 8);
      l.y += (target - l.y) * Math.min(1, dt * 4);
      const py = l.y * STEP_H, pz = -l.y * 0.9;
      // El cable y las sillas pasan a la altura del andén actual
      l.cable.position.set(0, py + 3.4, pz);
      l.zone.position.set(0, py + 0.17, pz);
      const inZone = e.chairs.some((x) => Math.abs(x) < s.win);
      l.zone.material.color.set(inZone ? '#2ecc5a' : '#f6b40e');
      l.zone.material.opacity = inZone ? 0.85 : 0.4;
      l.chairs.forEach((c, k) => {
        const x = e.chairs[k];
        c.visible = x != null && !e.fin;
        if (x != null) { c.position.set(x * 0.55, py + 1.55, pz); c.visible = c.visible && Math.abs(x * 0.55) < GAP / 2 - 0.3; }
      });
      const g = l.g;
      const jumping = e.ride ? Math.sin(Math.min(1, (performance.now() / 1000) % 1) * Math.PI) : 0;
      g.position.set(l.x, py + 0.15 + (e.ride ? 1.2 + jumping * 0.3 : 0), pz + 0.3);
      g.rotation.y = 0;
      g.rotation.z = e.fall ? Math.sin(time * 20) * 0.4 : 0;
      if (e.fall && !l.fallShown) { l.fallShown = true; ctx.sfx('bonk'); }
      if (!e.fall) l.fallShown = false;
      if (e.ride && !l.rideShown) { l.rideShown = true; ctx.sfx('good'); }
      if (!e.ride) l.rideShown = false;
      lo = Math.min(lo, py); hi = Math.max(hi, py);
    }
    const f = fitSpan(st, lo, hi + 3, dt, { base: 12, margin: 2, per: 0.85, minC: 2.5 });
    ctx.setCamera([0, f.c + 3, 4 + st.lanes.size * 1.7 + 10 * f.z - f.c * 0.6], [0, f.c, -f.c * 0.7]);
  },
};
