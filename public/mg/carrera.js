// Escena: Alcanzá el Bondi — carrera por la calle hasta el colectivo.
import * as THREE from 'three';
import { makeHouse, makeTree } from '../models.js';
import { makeBus, makeFarol, makeBusStop } from '../props.js';
import { tex } from '../textures.js';
import { plane, std, walkAnim, fitSpan } from './util.js';

const START = -14, END = 13, LANE = 1.5;

export default {
  camera: { pos: [-8, 7, 13], look: [-6, 0.5, 0] },
  dynamicCamera: true,
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    const w = n * LANE + 2;
    group.add(plane(90, w, std({ map: tex.asphalt([20, 2]) }), { z: 0, x: 0 }));
    group.add(plane(90, 4, std({ map: tex.baldosa([22, 1]) }), { y: 0.02, z: -w / 2 - 2 }));
    group.add(plane(90, 30, std({ map: tex.grass([20, 6]) }), { y: -0.01, z: w / 2 + 15 }));
    // Líneas de carriles
    for (let i = 1; i < n; i++) for (let x = -40; x < 40; x += 3) group.add(plane(1.5, 0.08, std({ color: '#ffffff' }), { x, y: 0.015, z: -w / 2 + 1 + i * LANE }));
    // Llegada
    group.add(plane(0.5, w, std({ color: '#ffffff' }), { x: END, y: 0.016 }));
    const bus = makeBus('#2d6cdf'); bus.position.set(END + 4, 0, -w / 2 - 1.2); group.add(bus);
    const stop = makeBusStop(); stop.position.set(END + 1, 0, -w / 2 - 1.5); group.add(stop);
    ['#e14b3c', '#f2c230', '#3b8fe0', '#2e9e48', '#b06ab3', '#ef8a17', '#e14b3c', '#3b8fe0', '#f2c230'].forEach((c, i) => {
      const h = makeHouse(c, '#1b2a4a', 3.8, 4.5 + (i % 3)); h.position.set(-30 + i * 6.5, 0, -w / 2 - 6); group.add(h);
    });
    for (let x = -26; x < 30; x += 9) { const f = makeFarol(); f.position.set(x, 0, -w / 2 - 3.6); group.add(f); }
    for (let x = -30; x < 30; x += 7) { const t = makeTree(x % 2); t.position.set(x + 3, 0, -w / 2 - 10); group.add(t); }
    const lanes = new Map();
    players.forEach((p, i) => {
      const z = -w / 2 + 1 + i * LANE + LANE / 2;
      const g = ctx.addChar(p, START, z);
      g.rotation.y = Math.PI / 2;
      lanes.set(p.id, { g, z, lastD: 0, speed: 0 });
    });
    return { lanes, bus, camX: START + 6, w };
  },
  update(ctx, st, s, dt, time) {
    let lead = START, last = Infinity;
    for (const e of s.ents) {
      const ln = st.lanes.get(e.id); if (!ln) continue;
      const x = START + (e.d / s.target) * (END - START);
      ln.speed += ((e.d - ln.lastD) / Math.max(dt, 1e-3) - ln.speed) * Math.min(1, dt * 6);
      ln.lastD = e.d;
      ln.g.position.x += (x - ln.g.position.x) * (1 - Math.exp(-15 * dt));
      ln.g.rotation.y = Math.PI / 2;
      if (e.fin) { ln.g.userData.body.position.y = Math.abs(Math.sin(time * 8)) * 0.4; ln.g.rotation.y = Math.PI / 2 + Math.sin(time * 4) * 0.5; }
      else walkAnim(ln.g, time * (0.6 + Math.min(1.5, ln.speed / 4)), Math.min(1, ln.speed / 3), ln.z);
      if (e.trip) ln.g.rotation.x = 0.5; else ln.g.rotation.x *= 0.8;
      lead = Math.max(lead, ln.g.position.x); last = Math.min(last, ln.g.position.x);
    }
    // La cámara encuadra del último al primero (si se separan, se aleja)
    const f = fitSpan(st, last, lead, dt, { base: st.w / 2 + 10, minC: START + 4, maxC: END - 3 });
    ctx.setCamera([f.c - 2, 7 * f.z, (st.w / 2 + 10) * f.z], [f.c + 1, 0.5, 0]);
    st.bus.position.y = Math.abs(Math.sin(time * 20)) * 0.03;
  },
};
