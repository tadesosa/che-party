// Escena: Tejo en la Arena — una cancha de arena por jugador con el bochín, y los tejos que caen más cerca o más lejos.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, makeMeter, setNeedle } from './util.js';

const GAP = 2.8, LEN = 12; // la aguja (0 a 1) se mapea a 0..LEN de distancia

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 7 + w * 0.25, 6 + w * 0.3], look: [0, 0, -5] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(90, 70, std({ map: tex.sand([20, 16]) })));
    group.add(plane(90, 30, std({ map: tex.water([20, 8]), color: '#3d86b8' }), { y: 0.03, z: -30 }));
    const lanes = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      for (const sx of [-1, 1]) group.add(plane(0.06, LEN + 1, std({ color: '#c9a66b' }), { x: x + sx * 1.2, y: 0.02, z: -LEN / 2 }));
      const bochin = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), std({ color: '#ffffff' })); bochin.position.y = 0.18; group.add(bochin);
      const meter = makeMeter([0.4, 0.6, 0.47, 0.53], 2.2); meter.position.set(x, 2.8, 1.2); group.add(meter);
      ctx.addChar(p, x, 1.2);
      lanes.set(p.id, { x, bochin, meter, n: 0, tejos: [], color: CH[p.char].color, fly: null });
    });
    return { lanes };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      const g = ctx.chars.get(e.id); g.rotation.y = Math.PI;
      const ti = Math.min(2, e.i);
      const tgt = s.targets[ti];
      l.bochin.position.set(l.x, 0.18, -tgt * LEN);
      l.meter.visible = e.v != null;
      if (e.v != null) {
        // Rearmar la zona del medidor si cambió el bochín
        if (l.zoneFor !== ti) { l.zoneFor = ti; ctx.group.remove(l.meter); l.meter = makeMeter([tgt - 0.12, tgt + 0.12, tgt - 0.035, tgt + 0.035], 2.2); l.meter.position.set(l.x, 2.8, 1.2); ctx.group.add(l.meter); }
        setNeedle(l.meter, e.v, Math.min(1, dt * 25));
      }
      if (e.hist.length > l.n) {
        l.n = e.hist.length;
        const tejo = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), std({ color: l.color, metalness: 0.4 }));
        ctx.group.add(tejo); l.tejos.push(tejo);
        l.fly = { m: tejo, t: 0, to: -(e.lastV ?? 0.5) * LEN };
        ctx.sfx('swoosh');
      }
      if (l.fly) {
        const f = l.fly; f.t = Math.min(1, f.t + dt * 1.3);
        f.m.position.set(l.x, 0.1 + Math.sin(f.t * Math.PI) * 2.5, 0.8 + (f.to - 0.8) * f.t);
        f.m.rotation.x += dt * 10;
        if (f.t >= 1) { f.m.rotation.x = 0; ctx.sfx('bonk'); l.fly = null; }
      }
      // Los tejos de tiros anteriores quedan más transparentes
      l.tejos.forEach((t, k) => { if (k < l.tejos.length - 1 && !t.material.transparent) { t.material.transparent = true; t.material.opacity = 0.35; } });
    }
  },
};
