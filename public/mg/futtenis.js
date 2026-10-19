// Escena: Fútbol Tenis — una canchita de cemento con red en el medio, celestes de un lado y rojos del otro.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeBall } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 13, 14], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.grass([22, 18]) })));
    const LX = 8, LZ = 4.5;
    group.add(plane(LX * 2 + 3, LZ * 2 + 3, std({ color: '#3f8a5a' }), { y: 0.01 }));
    group.add(plane(LX * 2, LZ * 2, std({ color: '#4fa36b' }), { y: 0.02 }));
    const white = std({ color: '#ffffff' });
    for (const z of [-LZ, LZ]) group.add(plane(LX * 2, 0.1, white, { y: 0.03, z }));
    for (const x of [-LX, LX, 0]) group.add(plane(0.1, LZ * 2, white, { y: 0.03, x }));
    // La red
    const net = new THREE.Mesh(new THREE.PlaneGeometry(LZ * 2 + 1, 1.1, 16, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.6 }));
    net.rotation.y = Math.PI / 2; net.position.set(0, 0.55, 0); group.add(net);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, LZ * 2 + 1), white); top.position.set(0, 1.1, 0); group.add(top);
    for (const z of [-LZ - 0.5, LZ + 0.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8), std({ color: '#888' })); p.position.set(0, 0.6, z); group.add(p); }
    for (const [x, z] of [[-14, -8], [14, -8], [-12, 8], [12, -12]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    for (const p of players) ctx.addChar(p, 0, 0);
    const ball = makeBall(0.3); group.add(ball);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3 }));
    shadow.rotation.x = -Math.PI / 2; group.add(shadow);
    return { ball, shadow, lastY: 0, lastPt: null };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.userData.body.rotation.x = e.kick ? -0.5 : g.userData.body.rotation.x * 0.8;
    }
    const b = s.ball;
    st.ball.position.set(b.x, b.y, b.z);
    st.ball.rotation.x += dt * 8;
    st.ball.visible = !b.wait || Math.sin(time * 20) > 0;
    st.shadow.position.set(b.x, 0.04, b.z);
    st.shadow.scale.setScalar(Math.max(0.4, 1.4 - b.y * 0.15));
    // Pique y toques
    if (b.y <= 0.3 && st.lastY > 0.35) ctx.sfx('bonk');
    st.lastY = b.y;
    if (s.lastPoint && s.lastPoint.at !== st.lastPt) {
      st.lastPt = s.lastPoint.at;
      ctx.sfx('whistle');
      ctx.floatText(s.lastPoint.why, new THREE.Vector3(0, 3.5, 0), s.lastPoint.team === 0 ? '#2f86e0' : '#e14b3c');
    }
  },
};
