// Escena: La Bola de Nieve — un claro nevado entre pinos. Donde ya pasó una bola queda el pasto a la vista.
import * as THREE from 'three';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';
import { makeSnowPine } from '../decor2.js';

export default {
  camera: { pos: [0, 19, 15], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players, CH } = ctx;
    group.add(plane(120, 90, std({ color: '#c9d3df', roughness: 1 })));
    group.add(plane(23, 23, std({ color: '#7a8a5a' }), { y: 0.01 }));
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; const t = makeSnowPine(3 + (i % 3) * 0.6); t.position.set(Math.cos(a) * 15.5, 0, Math.sin(a) * 13.5); group.add(t); }
    const c = document.createElement('canvas'); c.width = c.height = 192;
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    const snow = plane(22, 22, new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.9 }), { y: 0.03 });
    group.add(snow);
    const balls = new Map();
    for (const p of players) {
      ctx.addChar(p, 0, 0);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), std({ color: '#ffffff', roughness: 0.85, flatShading: true }));
      b.castShadow = true; group.add(b);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.05, 6, 30), new THREE.MeshBasicMaterial({ color: CH[p.char].color }));
      ring.rotation.x = Math.PI / 2; group.add(ring);
      balls.set(p.id, { b, ring, rot: 0 });
    }
    const flake = new THREE.Group(); group.add(flake);
    for (let i = 0; i < 60; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); flake.add(f); }
    return { c, texture, last: '', balls, flake };
  },
  update(ctx, st, s, dt, time) {
    if (s.snow !== st.last) {
      st.last = s.snow;
      const x = st.c.getContext('2d'), n = s.n, cs = st.c.width / n;
      x.clearRect(0, 0, st.c.width, st.c.height);
      x.fillStyle = '#dfe7f0';
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (s.snow.charCodeAt(j * n + i) === 49) { x.beginPath(); x.arc((i + 0.5) * cs, (j + 0.5) * cs, cs * 0.75, 0, 7); x.fill(); }
      st.texture.needsUpdate = true;
    }
    // Copos cayendo donde nieva
    st.flake.visible = !!s.fall;
    if (s.fall) st.flake.children.forEach((f, i) => { const a = i * 2.4; f.position.set(s.fall.x + Math.cos(a) * (i % 7) * 0.45, 6 - ((time * 3 + i * 0.37) % 6), s.fall.z + Math.sin(a) * (i % 7) * 0.45); });
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.userData.body.rotation.x = 0.3;
      const bl = st.balls.get(e.id);
      const sp = Math.hypot(e.bx - bl.b.position.x, e.bz - bl.b.position.z);
      bl.rot += sp / Math.max(0.3, e.r);
      bl.b.position.set(e.bx, e.r, e.bz);
      bl.b.scale.setScalar(e.r);
      bl.b.rotation.set(bl.rot * Math.cos(e.ang), 0, -bl.rot * Math.sin(e.ang));
      bl.ring.position.set(e.bx, 0.05, e.bz); bl.ring.scale.setScalar(e.r);
      if (e.hit && !bl.hitShown) { bl.hitShown = true; ctx.burst(new THREE.Vector3(e.bx, e.r, e.bz), 30, 4); ctx.sfx('hit'); }
      if (!e.hit) bl.hitShown = false;
    }
  },
};
