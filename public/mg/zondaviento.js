// Escena: Aguantá el Zonda — la cima pelada de un cerro, con el precipicio alrededor y tierra que vuela con el viento.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 15, 13], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    // El valle muy abajo
    group.add(plane(140, 140, std({ map: tex.dryGrass([30, 30]) }), { y: -14 }));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.ConeGeometry(6, 16, 6), std({ color: '#7d6a5a', flatShading: true })); m.position.set(Math.cos(a) * 28, -8, Math.sin(a) * 28 - 6); group.add(m);
    }
    // La cima: un cilindro de roca con la parte de arriba de tierra
    const peak = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 4, 14, 24, 1), std({ color: '#8a7355', flatShading: true })); peak.position.y = -7; group.add(peak);
    const top = new THREE.Mesh(new THREE.CircleGeometry(7.6, 32), std({ map: tex.dirt([5, 5]) })); top.rotation.x = -Math.PI / 2; top.position.y = 0.01; group.add(top);
    // Flechas de viento
    const arrows = new THREE.Group(); group.add(arrows);
    for (let i = 0; i < 5; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 3), new THREE.MeshBasicMaterial({ color: '#f2c230', transparent: true, opacity: 0.85 }));
      a.rotation.x = Math.PI / 2; a.position.set((i - 2) * 2.5, 2.5, 0); arrows.add(a);
    }
    for (const p of players) ctx.addChar(p, 0, 0);
    return { arrows, dust: [], falling: new Set() };
  },
  update(ctx, st, s, dt, time) {
    const w = s.wind;
    st.arrows.visible = w.phase !== 'calm';
    st.arrows.rotation.y = w.ang;
    st.arrows.children.forEach((a, i) => { a.material.color.set(w.phase === 'blow' ? '#e14b3c' : '#f2c230'); a.position.z = ((time * (w.phase === 'blow' ? 8 : 3) + i * 3) % 10) - 5; });
    // Tierra volando mientras sopla
    if (w.phase === 'blow' && Math.random() < dt * 40) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshBasicMaterial({ color: '#c2a878' }));
      d.position.set((Math.random() - 0.5) * 14 - Math.sin(w.ang) * 8, Math.random() * 2, (Math.random() - 0.5) * 14 - Math.cos(w.ang) * 8);
      ctx.group.add(d); st.dust.push({ m: d, life: 1.2 });
    }
    for (let i = st.dust.length - 1; i >= 0; i--) {
      const p = st.dust[i]; p.life -= dt;
      p.m.position.x += Math.sin(w.ang) * 14 * dt; p.m.position.z += Math.cos(w.ang) * 14 * dt;
      if (p.life <= 0) { ctx.group.remove(p.m); st.dust.splice(i, 1); }
    }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k, e.y);
      if (e.alive) {
        face(g, e.ang, k);
        walkAnim(g, time, speedOf(g, dt) / 6, g.id);
        // Inclinado contra el viento
        g.userData.body.rotation.x = w.phase === 'blow' ? -0.25 : 0;
      } else {
        g.rotation.x += dt * 5;
        if (!st.falling.has(e.id)) { st.falling.add(e.id); ctx.sfx('swoosh'); }
      }
      g.userData.ring.visible = e.alive; g.userData.blob.visible = e.alive;
    }
  },
};
