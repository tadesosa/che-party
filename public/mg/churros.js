// Escena: Churros en la Playa — la arena llena de sombrillas, el carrito de churros en el medio y clientes que levantan la mano.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

const COLORS = ['#e14b3c', '#2f86e0', '#f2c230', '#2e9e48', '#b06ab3', '#ef8a17'];

function makeUmbrella(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), std({ color: '#ddd' })); pole.position.y = 1.2; g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 10), std({ color })); top.position.y = 2.4; g.add(top);
  const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), std({ color: '#f4efe2' })); towel.rotation.x = -Math.PI / 2; towel.position.set(0.3, 0.03, 0.5); g.add(towel);
  // Cliente que levanta la mano
  const hand = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), std({ color: '#e8b98a' })); arm.position.y = 0.45; hand.add(arm);
  const sign = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: '#f6b40e' })); sign.position.y = 1.0; hand.add(sign);
  hand.position.set(0.4, 0.3, 0.5); g.add(hand);
  g.userData.hand = hand;
  return g;
}

export default {
  camera: { pos: [0, 16, 12], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.sand([22, 18]) })));
    group.add(plane(90, 30, std({ map: tex.water([20, 8]), color: '#3d86b8' }), { y: 0.03, z: -24 }));
    const cart = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1), std({ color: '#ffffff' })); box.position.y = 0.9; cart.add(box);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.25, 1.02), std({ color: '#e14b3c' })); stripe.position.y = 1.2; cart.add(stripe);
    for (const x of [-0.6, 0.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14), std({ color: '#333' })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.3, 0.55); cart.add(w); }
    group.add(cart);
    for (const p of players) {
      const g = ctx.addChar(p, 0, 0);
      const pack = new THREE.Group(); pack.position.y = (g.userData.top || 1.8) + 0.1; g.add(pack); g.userData.pack = pack;
    }
    return { umbrellas: null };
  },
  update(ctx, st, s, dt, time) {
    if (!st.umbrellas) st.umbrellas = s.umbrellas.map((u, i) => { const m = makeUmbrella(COLORS[i % 6]); m.position.set(u.x, 0, u.z); ctx.group.add(m); return m; });
    const calling = new Map(s.calls.map((c) => [c.u, c.left]));
    st.umbrellas.forEach((m, i) => {
      const left = calling.get(i);
      m.userData.hand.visible = left != null;
      if (left != null) m.userData.hand.rotation.z = Math.sin(time * (left < 2.5 ? 16 : 8) + i) * 0.4;
    });
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      const pk = g.userData.pack;
      while (pk.children.length < e.carry) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), std({ color: '#d99a4e' })); c.rotation.z = Math.PI / 2; c.position.y = pk.children.length * 0.15; pk.add(c); }
      while (pk.children.length > e.carry) pk.remove(pk.children[pk.children.length - 1]);
    }
  },
};
