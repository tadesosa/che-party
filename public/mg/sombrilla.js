// Escena: Sombrilla Voladora — la playa con viento; una sombrilla da vueltas por el aire y todos corren a agarrarla.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makeFlyingUmbrella() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), std({ color: '#ddd' })); g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.45, 10), std({ color: '#e14b3c' })); top.position.y = 1; g.add(top);
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(1.12, 0.46, 10, 1, true, (i / 5) * Math.PI * 2, Math.PI / 5), std({ color: '#ffffff', side: THREE.DoubleSide })); s.position.y = 1; g.add(s); }
  return g;
}

export default {
  camera: { pos: [0, 16, 13], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.sand([22, 18]) })));
    group.add(plane(90, 30, std({ map: tex.water([20, 8]), color: '#3d86b8' }), { y: 0.03, z: -24 }));
    for (const p of players) ctx.addChar(p, 0, 0);
    const umb = makeFlyingUmbrella(); group.add(umb);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25 })); shadow.rotation.x = -Math.PI / 2; group.add(shadow);
    return { umb, shadow, n: 1 };
  },
  update(ctx, st, s, dt, time) {
    const u = s.u;
    if (u.n !== st.n) { if (st.n) { ctx.burst(st.umb.position.clone(), 40, 4); ctx.sfx('gold'); } st.n = u.n; st.umb.position.set(u.x, u.y, u.z); }
    st.umb.position.lerp(new THREE.Vector3(u.x, u.y + 0.6, u.z), Math.min(1, dt * 15));
    st.umb.rotation.set(Math.sin(u.spin) * 0.8, u.spin * 2, Math.cos(u.spin * 0.7) * 0.6);
    st.shadow.position.set(u.x, 0.04, u.z);
    st.shadow.material.opacity = u.y < 1.6 ? 0.45 : 0.2;
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
    }
  },
};
