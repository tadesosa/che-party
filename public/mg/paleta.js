// Escena: Paleta Playera — todos en ronda en la arena; la pelotita viaja en arco de uno a otro.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std } from './util.js';

const R = 4.5;

export default {
  camera: { pos: [0, 11, 11], look: [0, 0.5, 0] },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(90, 70, std({ map: tex.sand([22, 18]) })));
    group.add(plane(90, 30, std({ map: tex.water([20, 8]), color: '#3d86b8' }), { y: 0.03, z: -24 }));
    // Sombrilla en el medio
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), std({ color: '#ddd' })); pole.position.y = 1.3; group.add(pole);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 12), std({ color: '#e14b3c' })); umb.position.y = 2.6; group.add(umb);
    const spots = new Map();
    players.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.sin(a) * R, 0, Math.cos(a) * R);
      const g = ctx.addChar(p, pos.x, pos.z);
      g.rotation.y = a + Math.PI;
      const paddle = new THREE.Group();
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), std({ color: CH[p.char].color })); head.rotation.x = Math.PI / 2; head.position.y = 0.45; paddle.add(head);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), std({ color: '#5a3a22' })); paddle.add(handle);
      paddle.position.set(0.55, 1.2, 0.2); g.add(paddle);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 24), new THREE.MeshBasicMaterial({ color: CH[p.char].color, transparent: true, opacity: 0.8 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.05, pos.z); ring.visible = false; group.add(ring);
      spots.set(p.id, { pos, g, paddle, ring, swing: 0 });
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), std({ color: '#f2f2f2' })); group.add(ball);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3 })); shadow.rotation.x = -Math.PI / 2; group.add(shadow);
    return { spots, ball, shadow, lastTo: null };
  },
  update(ctx, st, s, dt, time) {
    const b = s.ball;
    st.ball.visible = st.shadow.visible = !!b;
    for (const [id, sp] of st.spots) sp.ring.visible = !!b && b.to === id;
    if (b) {
      const A = st.spots.get(b.from), B = st.spots.get(b.to);
      if (A && B) {
        const k = Math.min(1, b.k);
        const p = A.pos.clone().lerp(B.pos, k);
        st.ball.position.set(p.x, 1.4 + Math.sin(k * Math.PI) * 3, p.z);
        st.shadow.position.set(p.x, 0.04, p.z);
        B.ring.material.opacity = 0.4 + k * 0.6;
      }
      if (b.from !== st.lastFrom) { st.lastFrom = b.from; const sp = st.spots.get(b.from); if (sp) sp.swing = 1; ctx.sfx('hit'); }
    }
    for (const e of s.ents) {
      const sp = st.spots.get(e.id); if (!sp) continue;
      sp.swing = Math.max(0, sp.swing - dt * 5);
      sp.paddle.rotation.z = -sp.swing * 1.2;
      sp.g.visible = e.lives > 0 || Math.sin(time * 10) > 0;
      sp.g.userData.body.rotation.z = e.miss ? Math.sin(time * 25) * 0.3 : 0;
      if (e.lives <= 0) sp.g.position.y = -0.4;
    }
  },
};
