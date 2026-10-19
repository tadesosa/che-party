// Escena: Glaciar Perito Moreno — bloques de hielo que se agrietan y se hunden en el lago.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, std } from './util.js';

export default {
  camera: { pos: [0, 15, 14], look: [0, 0, 1.8] },
  build(ctx) {
    const { group, players } = ctx;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhysicalMaterial({ color: '#3a7fa8', map: tex.water([40, 40]), roughness: 0.1, clearcoat: 1 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.6; group.add(water);
    // Pared del glaciar al fondo
    const iceMat = new THREE.MeshPhysicalMaterial({ color: '#cfeeff', roughness: 0.25, clearcoat: 1, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, 6 + Math.random() * 6, 4), iceMat);
      b.position.set(-28 + i * 3.7, 2, -18 - Math.random() * 3); b.rotation.y = Math.random() * 0.4 - 0.2; b.castShadow = true; group.add(b);
    }
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(9, 16, 6), std({ color: '#7d8a99', flatShading: true }));
      m.position.set(-40 + i * 16, 6, -34); group.add(m);
      const snow = new THREE.Mesh(new THREE.ConeGeometry(3.4, 6, 6), std({ color: '#ffffff', flatShading: true }));
      snow.position.set(-40 + i * 16, 12, -34); group.add(snow);
    }
    // Témpanos flotando
    for (let i = 0; i < 8; i++) {
      const t = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random(), 0), iceMat);
      t.position.set((Math.random() - 0.5) * 40, -0.4, 10 + Math.random() * 8); group.add(t);
    }
    players.forEach((p) => ctx.addChar(p, 0, 0, 1.3));
    return { tiles: null, water, falling: new Set() };
  },
  update(ctx, st, s, dt, time) {
    if (!st.tiles) {
      st.tiles = [];
      const half = ((s.n - 1) * s.size) / 2;
      for (let k = 0; k < s.n * s.n; k++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(s.size - 0.08, 0.8, s.size - 0.08), new THREE.MeshPhysicalMaterial({ color: '#eaf8ff', roughness: 0.2, clearcoat: 1 }));
        m.position.set((k % s.n) * s.size - half, -0.4, Math.floor(k / s.n) * s.size - half);
        m.receiveShadow = true; m.castShadow = true;
        ctx.group.add(m); st.tiles.push({ m, state: 0, vy: 0 });
      }
    }
    st.water.material.map.offset.x = time * 0.01;
    for (let k = 0; k < st.tiles.length; k++) {
      const tl = st.tiles[k], state = +s.tiles[k];
      if (state === 1) {
        if (tl.state !== 1) { tl.state = 1; tl.m.material.color.set('#7cc6ea'); }
        tl.m.position.x += Math.sin(time * 50 + k) * 0.01;
      } else if (state === 2) {
        if (tl.state !== 2) { tl.state = 2; ctx.splash(tl.m.position.clone().setY(-0.3)); if (Math.random() < 0.3) ctx.sfx('pop'); }
        tl.vy -= 12 * dt; tl.m.position.y += tl.vy * dt; tl.m.rotation.x += dt;
        tl.m.visible = tl.m.position.y > -6;
      }
    }
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, Math.min(1, dt * 20), e.y);
      face(g, e.ang, Math.min(1, dt * 20));
      if (e.alive) walkAnim(g, time, speedOf(g, dt) / 5, g.id);
      else if (!st.falling.has(e.id)) { st.falling.add(e.id); ctx.splash(new THREE.Vector3(e.x, -0.5, e.z)); }
      g.userData.ring.visible = e.alive; g.userData.blob.visible = e.alive;
    }
  },
};
