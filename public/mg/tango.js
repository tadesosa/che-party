// Escena: Pasos de Tango — escenario con farol, flechas gigantes y bailarines.
import * as THREE from 'three';
import { makeFarol, makeArrow } from '../props.js';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const ROT = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
const LEAN = { up: [0, -0.35], down: [0, 0.35], left: [0.35, 0], right: [-0.35, 0] };

export default {
  camera: { pos: [0, 4.5, 12], look: [0, 2.2, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(60, 40, std({ map: tex.cobble([12, 8]) })));
    const stage = new THREE.Mesh(new THREE.BoxGeometry(Math.max(10, n * 2.6 + 3), 0.5, 6), std({ map: tex.wood([3, 2]) }));
    stage.position.set(0, 0.25, 0); stage.receiveShadow = true; stage.castShadow = true; group.add(stage);
    // Telón rojo de fondo
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(Math.max(12, n * 2.6 + 5), 7, 0.3), std({ color: '#9b1c2c' }));
    curtain.position.set(0, 3.5, -3.3); group.add(curtain);
    for (let i = -6; i <= 6; i++) {
      const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), std({ color: '#7d1523' }));
      fold.position.set(i * 1.0, 3.5, -3.1); group.add(fold);
    }
    for (const x of [-Math.max(6, n * 1.3 + 2), Math.max(6, n * 1.3 + 2)]) { const f = makeFarol(); f.position.set(x, 0.5, 1.5); group.add(f); }
    const arrow = makeArrow('#f6b40e'); arrow.scale.setScalar(2.2); arrow.position.set(0, 5.2, -2.5); arrow.visible = false; group.add(arrow);
    const q = ctx.label('?', '#ffffff', 2.4); q.position.set(0, 5, -2.5); q.visible = false; group.add(q);
    const spot = new THREE.SpotLight('#fff1c9', 40, 20, 0.6, 0.5); spot.position.set(0, 9, 5); spot.target.position.set(0, 0, 0);
    group.add(spot, spot.target);
    const dancers = new Map();
    players.forEach((p, i) => {
      const g = ctx.addChar(p, rowX(i, n, 2.6), 0.6);
      g.position.y = 0.5;
      dancers.set(p.id, { g, lastProg: 0, lean: [0, 0], wasAlive: true });
    });
    return { arrow, q, dancers, seq: [], lastIdx: -1, round: 0 };
  },
  update(ctx, st, s, dt, time) {
    if (s.round !== st.round) { st.round = s.round; st.seq = []; st.lastIdx = -1; }
    // Mientras muestran los pasos
    if (s.phase === 'show' && s.step) {
      if (s.showIdx !== st.lastIdx) { st.lastIdx = s.showIdx; st.seq[s.showIdx] = s.step; ctx.sfx('select'); for (const d of st.dancers.values()) d.lean = LEAN[s.step]; }
      st.arrow.visible = true;
      st.arrow.rotation.z = ROT[s.step];
      const pop = Math.min(1, s.stepP * 4) * (s.stepP < 0.85 ? 1 : (1 - s.stepP) / 0.15);
      st.arrow.scale.setScalar(2.2 * pop);
    } else st.arrow.visible = false;
    st.q.visible = s.phase === 'input';
    if (!st.q.userData.base) st.q.userData.base = st.q.scale.clone();
    if (st.q.visible) st.q.scale.copy(st.q.userData.base).multiplyScalar(1 + Math.sin(time * 6) * 0.08);
    for (const e of s.ents) {
      const d = st.dancers.get(e.id); if (!d) continue;
      const { g } = d;
      // Cada paso acertado, el bailarín lo marca
      if (e.prog > d.lastProg && st.seq[e.prog - 1]) { d.lean = LEAN[st.seq[e.prog - 1]]; }
      d.lastProg = e.prog;
      if (s.phase === 'show' && !s.step) d.lean = [0, 0];
      const body = g.userData.body;
      body.rotation.z += (d.lean[0] - body.rotation.z) * Math.min(1, dt * 10);
      body.rotation.x += (d.lean[1] - body.rotation.x) * Math.min(1, dt * 10);
      d.lean = [d.lean[0] * (1 - dt * 2), d.lean[1] * (1 - dt * 2)];
      if (e.ok) { body.position.y = Math.abs(Math.sin(time * 8)) * 0.3; g.rotation.y += dt * 6; }
      else { body.position.y = 0; g.rotation.y += (0 - g.rotation.y) * Math.min(1, dt * 6); }
      if (!e.alive) {
        if (d.wasAlive) { d.wasAlive = false; ctx.sfx('bad'); }
        g.position.z += (2.8 - g.position.z) * dt * 2; g.position.y += (0 - g.position.y) * dt * 3;
        g.scale.setScalar(Math.max(0.7, g.scale.x - dt));
      }
    }
  },
};
