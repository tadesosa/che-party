// Escena: El Pato — una cancha de tierra con un aro alto en cada punta y el pato (pelota con manijas).
import * as THREE from 'three';
import { makeTree, makeFlag } from '../models.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makeHoop(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 8), std({ color: '#ddd' })); pole.position.y = 1.6; g.add(pole);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 8, 24), std({ color })); ring.position.y = 3.2; ring.rotation.y = Math.PI / 2; g.add(ring);
  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.4, 1, 12, 3, true), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.6 }));
  net.rotation.z = Math.PI / 2; net.position.set(0, 3.2, 0); net.rotation.x = Math.PI / 2; g.add(net);
  return g;
}
function makePato() {
  const g = new THREE.Group();
  const leather = std({ color: '#8a4f2a', roughness: 0.6 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), leather));
  for (let i = 0; i < 6; i++) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 12), std({ color: '#5a3018' }));
    const a = (i / 6) * Math.PI * 2;
    h.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36); h.rotation.y = -a; g.add(h);
  }
  return g;
}

export default {
  camera: { pos: [0, 13, 13], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(100, 70, std({ map: tex.dryGrass([24, 18]) })));
    group.add(plane(20, 12, std({ map: tex.dirt([8, 5]) }), { y: 0.02 }));
    const lime = std({ color: '#f4efe2' });
    group.add(plane(0.12, 11, lime, { y: 0.03 }));
    for (const z of [-6, 6]) group.add(plane(20, 0.12, lime, { y: 0.03, z }));
    const h0 = makeHoop('#e14b3c'); h0.position.set(8.2, 0, 0); group.add(h0); // al que tiran los celestes
    const h1 = makeHoop('#2f86e0'); h1.position.set(-8.2, 0, 0); group.add(h1);
    for (const [x, z] of [[-14, -9], [14, -9], [-16, 5], [16, 5]]) { const t = makeTree(false); t.position.set(x, 0, z); group.add(t); }
    const flag = makeFlag(); flag.position.set(0, 0, -8); group.add(flag);
    for (const p of players) ctx.addChar(p, 0, 0);
    const pato = makePato(); group.add(pato);
    return { pato, lastGoal: null };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.userData.body.scale.z += ((e.dash ? 0.7 : 1) - g.userData.body.scale.z) * k;
      g.userData.body.rotation.z = e.stun ? Math.sin(time * 25) * 0.2 : 0;
    }
    st.pato.position.set(s.ball.x, s.ball.y, s.ball.z);
    st.pato.rotation.y += dt * 4;
    if (s.lastGoal != null && st.lastGoal == null) {
      ctx.burst(new THREE.Vector3(s.lastGoal === 0 ? 8.2 : -8.2, 3.2, 0), 80, 6);
      ctx.sfx('gold');
    }
    st.lastGoal = s.lastGoal;
  },
};
