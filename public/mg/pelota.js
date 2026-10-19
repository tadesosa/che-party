// Escena: El Dueño de la Pelota — potrero de tierra con gomas alrededor.
import * as THREE from 'three';
import { makeTree, makeHouse } from '../models.js';
import { makeGoal, makeBall } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 17, 14.5], look: [0, 0, 2.4] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(80, 60, std({ map: tex.grass([20, 15]) })));
    const field = new THREE.Mesh(new THREE.CircleGeometry(9.2, 48), std({ map: tex.dirt([5, 5]) }));
    field.rotation.x = -Math.PI / 2; field.position.y = 0.01; field.receiveShadow = true; group.add(field);
    // Gomas de auto como borde
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.16, 6, 12), std({ color: i % 2 ? '#222' : '#e8e8e8' }));
      tire.position.set(Math.cos(a) * 9.4, 0.25, Math.sin(a) * 9.4); tire.rotation.y = -a; tire.castShadow = true; group.add(tire);
    }
    for (const z of [-1, 1]) { const goal = makeGoal(2.4, 1.3); goal.position.set(0, 0, z * 9.6); goal.rotation.y = z > 0 ? Math.PI : 0; group.add(goal); }
    ['#e14b3c', '#f2c230', '#3b8fe0', '#2e9e48'].forEach((c, i) => { const h = makeHouse(c, '#1b2a4a', 3.6, 4); h.position.set(-7 + i * 4.6, 0, -14); group.add(h); });
    for (const [x, z] of [[-13, -4], [13, -4], [-12, 6], [12, 6]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    const ball = makeBall(0.32); ball.position.y = 0.32; group.add(ball);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.05, 28), new THREE.MeshBasicMaterial({ color: '#f6b40e', transparent: true, opacity: 0.9 }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; halo.visible = false; group.add(halo);
    const n = players.length;
    players.forEach((p, i) => { const a = (i / n) * Math.PI * 2; ctx.addChar(p, Math.cos(a) * 6, Math.sin(a) * 6, 1.2); });
    return { ball, halo, lastBall: new THREE.Vector3() };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      if (e.stun) g.rotation.y += dt * 15; else face(g, e.ang, k);
      const sp = speedOf(g, dt);
      walkAnim(g, time, sp / 6, g.id);
      const body = g.userData.body;
      body.scale.z += ((e.dash ? 0.7 : 1) - body.scale.z) * k;
    }
    const b = st.ball;
    const prev = b.position.clone();
    b.position.x += (s.ball.x - b.position.x) * k;
    b.position.z += (s.ball.z - b.position.z) * k;
    const mv = b.position.clone().sub(prev);
    if (mv.lengthSq() > 1e-6) b.rotateOnWorldAxis(new THREE.Vector3(mv.z, 0, -mv.x).normalize(), mv.length() / 0.32);
    const owner = s.owner && ctx.chars.get(s.owner);
    st.halo.visible = !!owner;
    if (owner) { st.halo.position.x = owner.position.x; st.halo.position.z = owner.position.z; st.halo.rotation.z = time * 2; }
  },
};
