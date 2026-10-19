// Escena: Lobos Marinos — el muelle del puerto con baldes de pescado; uno es el lobo marino y los otros, pescadores.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makeSealSuit() { // traje de lobo marino arriba del personaje: cuerpo gris y bigotes
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), std({ color: '#5d5048', roughness: 0.4 })); body.scale.set(1, 0.7, 1.4); body.position.y = 0.45; g.add(body);
  for (const x of [-0.6, 0.6]) { const flip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.3), std({ color: '#4a3f38' })); flip.position.set(x, 0.2, 0.3); flip.rotation.z = x * 0.6; g.add(flip); }
  return g;
}

export default {
  camera: { pos: [0, 16, 12], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(120, 80, std({ map: tex.water([30, 20]), color: '#3d86b8' }), { y: -0.4 }));
    const dock = new THREE.Mesh(new THREE.BoxGeometry(19, 0.4, 18), std({ map: tex.wood([8, 8]) })); dock.position.y = -0.2; group.add(dock);
    for (const [x, z] of [[-9.3, -8.8], [9.3, -8.8], [-9.3, 8.8], [9.3, 8.8], [0, -8.8], [0, 8.8]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.4, 8), std({ color: '#6b4a2b' })); p.position.set(x, 0.3, z); group.add(p); }
    let lobo = null;
    for (const p of players) {
      const g = ctx.addChar(p, 0, 0);
      if (g.userData.team === 0) { const suit = makeSealSuit(); g.add(suit); g.userData.body.visible = true; lobo = g; }
    }
    return { buckets: null, lobo };
  },
  update(ctx, st, s, dt, time) {
    if (!st.buckets) {
      st.buckets = s.buckets.map((b) => {
        const g = new THREE.Group();
        const pail = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.7, 14), std({ color: '#2f86e0' })); pail.position.y = 0.35; g.add(pail);
        const fish = [];
        for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.35, 4, 6), std({ color: '#c0c8d0' })); f.position.set(-0.2 + i * 0.2, 0.75, 0); f.rotation.z = 0.3 - i * 0.3; g.add(f); fish.push(f); }
        g.position.set(b.x, 0, b.z); ctx.group.add(g);
        return { g, fish };
      });
    }
    s.buckets.forEach((b, i) => st.buckets[i].fish.forEach((f, k) => { f.visible = k < b.fish; }));
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.userData.body.scale.z += ((e.dash ? 0.7 : 1) - g.userData.body.scale.z) * k;
      g.userData.body.rotation.z = e.stun ? Math.sin(time * 25) * 0.3 : 0;
      if (e.team === 0 && e.eat > 0) g.userData.body.rotation.x = Math.sin(time * 18) * 0.15 * e.eat;
    }
  },
};
