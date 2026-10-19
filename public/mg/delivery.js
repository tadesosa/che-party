// Escena: Delivery en Moto — una manzana de Buenos Aires con la pizzería en el medio, casas alrededor y autos cruzando.
import * as THREE from 'three';
import { makeHouse } from '../models.js';
import { makeTaxi } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, plane, std } from './util.js';

const COLORS = ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#b06ab3', '#ef8a17'];

export default {
  camera: { pos: [0, 19, 13], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.baldosa([30, 24]) })));
    for (const v of [-5, 5]) {
      group.add(plane(30, 2.2, std({ map: tex.asphalt([10, 1]) }), { y: 0.02, z: v }));
      group.add(plane(2.2, 30, std({ map: tex.asphalt([1, 10]) }), { y: 0.021, x: v }));
    }
    // Pizzería en el centro
    const shop = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 1.6, 16), std({ color: '#e14b3c' })); shop.position.y = 0.8; group.add(shop);
    const sign = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 16), std({ color: '#f6d36b' })); sign.position.y = 1.9; group.add(sign);
    // Casas en los bordes
    const doors = [];
    for (const x of [-8.5, -2, 2, 8.5]) for (const z of [-8.5, 8.5]) doors.push([x, z]);
    for (const z of [-2, 2]) for (const x of [-8.5, 8.5]) doors.push([x, z]);
    doors.forEach(([x, z], i) => {
      const h = makeHouse(COLORS[i % 6], '#1b2a4a', 2.4, 2.6);
      h.position.set(x + Math.sign(x) * (Math.abs(x) > 8 ? 1.6 : 0), 0, z + Math.sign(z) * (Math.abs(z) > 8 ? 1.6 : 0));
      h.rotation.y = Math.abs(z) > 8 ? (z > 0 ? Math.PI : 0) : (x > 0 ? -Math.PI / 2 : Math.PI / 2);
      h.scale.setScalar(0.8); group.add(h);
    });
    for (const p of players) {
      const g = ctx.addChar(p, 0, 0);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), std({ color: '#c99a5a' })); box.position.y = (g.userData.top || 1.8) + 0.15; box.visible = false; g.add(box);
      g.userData.pizzaBox = box;
    }
    return { pins: [], cars: new Map() };
  },
  update(ctx, st, s, dt, time) {
    while (st.pins.length < s.orders.length) {
      const pin = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshBasicMaterial({ color: '#e14b3c' })); head.position.y = 2.2; pin.add(head);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 12), new THREE.MeshBasicMaterial({ color: '#e14b3c' })); tip.rotation.x = Math.PI; tip.position.y = 1.7; pin.add(tip);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 24), new THREE.MeshBasicMaterial({ color: '#f6b40e' })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; pin.add(ring);
      ctx.group.add(pin); st.pins.push(pin);
    }
    s.orders.forEach((o, i) => { st.pins[i].position.set(o.x, Math.sin(time * 4 + i) * 0.15, o.z); });
    const live = new Set();
    for (const c of s.cars) {
      live.add(c.id);
      let m = st.cars.get(c.id);
      if (!m) { m = makeTaxi(); ctx.group.add(m); st.cars.set(c.id, m); }
      m.position.set(c.x, 0, c.z);
      m.rotation.y = c.horiz ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
    }
    for (const [id, m] of st.cars) if (!live.has(id)) { ctx.group.remove(m); st.cars.delete(id); }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      g.userData.pizzaBox.visible = e.pizza;
      g.userData.body.rotation.z = e.stun ? Math.sin(time * 25) * 0.25 : 0;
      g.userData.body.position.y = Math.abs(Math.sin(time * 14)) * 0.05;
    }
  },
};
