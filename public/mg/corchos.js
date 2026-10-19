// Escena: Corchos Voladores — una bodega al aire libre; cada uno descorcha y el corcho vuela por un carril con metros marcados.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, makeMeter, setNeedle } from './util.js';

const GAP = 2.8, M = 0.7; // metros -> unidades de escena

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 8 + w * 0.2, 7 + w * 0.3], look: [0, 0, -7] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(90, 80, std({ map: tex.dryGrass([22, 20]) })));
    group.add(plane(n * GAP + 2, 40, std({ map: tex.dirt([n, 12]) }), { y: 0.01, z: -16 }));
    // Marcas de metros
    for (let m = 5; m <= 25; m += 5) {
      group.add(plane(n * GAP + 2, 0.1, std({ color: '#ffffff' }), { y: 0.02, z: -m * M }));
    }
    const lanes = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const bottle = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.9, 12), std({ color: '#2a5a2a', roughness: 0.2 })); glass.position.y = 0.45; bottle.add(glass);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.4, 12), std({ color: '#2a5a2a', roughness: 0.2 })); neck.position.y = 1.1; bottle.add(neck);
      bottle.position.set(x + 0.6, 0.6, 0.5); bottle.rotation.x = -0.6; group.add(bottle);
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 10), std({ color: '#c99a5a' }));
      group.add(cork);
      const meter = makeMeter([0.7, 0.94, 0.84, 0.92], 2.2); meter.position.set(x, 3, 1); group.add(meter);
      const g = ctx.addChar(p, x, 1.2);
      lanes.set(p.id, { x, bottle, cork, meter, fly: null, lastI: 0, marks: [] });
    });
    return { lanes };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      const g = ctx.chars.get(e.id); g.rotation.y = Math.PI;
      l.meter.visible = e.v != null;
      if (e.v != null) { setNeedle(l.meter, e.v, Math.min(1, dt * 25)); l.bottle.rotation.z = Math.sin(time * 30) * e.v * 0.15; }
      if (e.i > l.lastI && e.hist.length) {
        l.lastI = e.i;
        const q = e.hist[e.hist.length - 1];
        // Los mismos metros que calcula el servidor
        const v = e.lastV ?? 0.5;
        const m = v > 0.94 ? 2 : Math.round(v * v * 25);
        l.fly = { t: 0, to: -m * M };
        ctx.sfx(q === 'escapa' ? 'bad' : 'pop');
      }
      if (l.fly) {
        const f = l.fly; f.t = Math.min(1, f.t + dt * 1.2);
        l.cork.position.set(l.x + 0.6, 1.4 + Math.sin(f.t * Math.PI) * 5 * Math.min(1, -f.to / 8), 0.3 + (f.to - 0.3) * f.t);
        l.cork.rotation.x += dt * 15;
        if (f.t >= 1) {
          const mark = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 10), std({ color: '#c99a5a' })); mark.position.copy(l.cork.position); mark.position.y = 0.12; ctx.group.add(mark);
          l.fly = null;
        }
      } else l.cork.position.set(l.x + 0.6 + 0.0, 1.4, 0.3 + 0.35);
    }
  },
};
