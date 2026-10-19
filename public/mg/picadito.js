// Escena: Picadito 2 vs 2 — canchita de potrero con arcos chicos y tablero de goles.
import * as THREE from 'three';
import { makeTree, makeHouse } from '../models.js';
import { makeGoal, makeBall } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 16, 15], look: [0, 0, 1.8] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.grass([22, 18]) })));
    const field = new THREE.Mesh(new THREE.PlaneGeometry(21, 13), std({ map: tex.dirt([5, 3]) }));
    field.rotation.x = -Math.PI / 2; field.position.y = 0.02; field.receiveShadow = true; group.add(field);
    const white = std({ color: '#ffffff' });
    const line = (w, h, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), white); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); group.add(m); };
    line(20, 0.12, 0, -6); line(20, 0.12, 0, 6); line(0.12, 12, -10, 0); line(0.12, 12, 10, 0); line(0.12, 12, 0, 0);
    const circle = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.05, 32), white); circle.rotation.x = -Math.PI / 2; circle.position.y = 0.03; group.add(circle);
    // Arcos: el celeste defiende la izquierda, el rojo la derecha
    const gl = makeGoal(4.4, 1.6); gl.position.set(-10, 0, 0); gl.rotation.y = -Math.PI / 2; group.add(gl);
    const gr = makeGoal(4.4, 1.6); gr.position.set(10, 0, 0); gr.rotation.y = Math.PI / 2; group.add(gr);
    for (const [x, c] of [[-10.6, '#2f86e0'], [10.6, '#e14b3c']]) {
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 4.4), std({ color: c })); flag.position.set(x, 0.04, 0); group.add(flag);
    }
    ['#e14b3c', '#f2c230', '#3b8fe0', '#2e9e48', '#ef8a17'].forEach((c, i) => { const h = makeHouse(c, '#1b2a4a', 3.6, 4.4); h.position.set(-9 + i * 4.5, 0, -11); group.add(h); });
    for (const [x, z] of [[-15, -4], [15, -4], [-15, 6], [15, 6]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    const ball = makeBall(0.3); ball.position.y = 0.3; group.add(ball);
    players.forEach((p) => ctx.addChar(p, 0, 0, 1.3));
    const score = ctx.label('0 - 0', '#ffffff', 1.6); score.position.set(0, 3.6, -7.5); group.add(score);
    return { ball, score, goals: '0-0' };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k); face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 5, g.id);
    }
    const b = st.ball, prev = b.position.clone();
    if (Math.hypot(s.ball.x - b.position.x, s.ball.z - b.position.z) > 3) { b.position.x = s.ball.x; b.position.z = s.ball.z; }
    b.position.x += (s.ball.x - b.position.x) * k; b.position.z += (s.ball.z - b.position.z) * k;
    const mv = b.position.clone().sub(prev);
    if (mv.lengthSq() > 1e-6) b.rotateOnWorldAxis(new THREE.Vector3(mv.z, 0, -mv.x).normalize(), mv.length() / 0.3);
    const gs = s.goals.join('-');
    if (gs !== st.goals) {
      st.goals = gs;
      const nl = ctx.label(`${s.goals[0]} - ${s.goals[1]}`, '#ffffff', 1.6);
      st.score.material.map = nl.material.map; st.score.scale.copy(nl.scale); st.score.material.needsUpdate = true;
      ctx.burst(new THREE.Vector3(s.ball.x > 0 ? 10 : -10, 1.5, 0), 80, 6);
      ctx.sfx('whistle');
    }
  },
};
