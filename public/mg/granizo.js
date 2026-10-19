// Escena: Malla Antigranizo — un viñedo con racimos sueltos, sombras donde cae el granizo y una malla verde de refugio.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 16, 12], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.dryGrass([22, 18]), color: '#b8b8a0' })));
    group.add(plane(17, 17, std({ map: tex.dirt([6, 6]) }), { y: 0.01 }));
    for (const p of players) ctx.addChar(p, 0, 0);
    const grapeGeo = new THREE.SphereGeometry(0.28, 10, 8);
    return { net: null, grapes: new Map(), hail: new Map(), grapeGeo };
  },
  update(ctx, st, s, dt, time) {
    if (!st.net) {
      const n = s.net;
      st.net = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(n.w, n.d, 12, 6), new THREE.MeshBasicMaterial({ color: '#2e9e48', wireframe: true }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = 2.4; st.net.add(mesh);
      const shade = plane(n.w, n.d, new THREE.MeshBasicMaterial({ color: '#2e9e48', transparent: true, opacity: 0.25 }), { y: 0.03 }); st.net.add(shade);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), std({ color: '#6b4a2b' })); p.position.set(x * n.w / 2, 1.2, z * n.d / 2); st.net.add(p); }
      st.net.position.set(n.x, 0, n.z); ctx.group.add(st.net);
    }
    // Racimos
    const live = new Set();
    for (const g of s.grapes) {
      live.add(g.id);
      if (!st.grapes.has(g.id)) {
        const grp = new THREE.Group();
        for (const [x, y] of [[0, 0.5], [-0.2, 0.3], [0.2, 0.3], [0, 0.12]]) { const b = new THREE.Mesh(st.grapeGeo, std({ color: '#5b2a6e', roughness: 0.3 })); b.position.set(x, y, 0); grp.add(b); }
        grp.position.set(g.x, 0, g.z); ctx.group.add(grp); st.grapes.set(g.id, grp);
      }
    }
    for (const [id, m] of st.grapes) if (!live.has(id)) { ctx.group.remove(m); st.grapes.delete(id); }
    // Granizo: sombra que crece y la piedra que cae
    const hl = new Set();
    for (const h of s.hail) {
      hl.add(h.id);
      let o = st.hail.get(h.id);
      if (!o) {
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35 })); shadow.rotation.x = -Math.PI / 2;
        const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), std({ color: '#dff3ff', roughness: 0.1 }));
        ctx.group.add(shadow, stone); o = { shadow, stone, hit: false }; st.hail.set(h.id, o);
      }
      o.shadow.position.set(h.x, 0.04, h.z); o.shadow.scale.setScalar(0.4 + h.k * 0.6);
      o.stone.position.set(h.x, 12 * (1 - h.k), h.z); o.stone.visible = !h.hit;
      if (h.hit && !o.hit) { o.hit = true; ctx.sfx('hit'); ctx.burst(new THREE.Vector3(h.x, 0.3, h.z), 12, 3); }
    }
    for (const [id, o] of st.hail) if (!hl.has(id)) { ctx.group.remove(o.shadow, o.stone); st.hail.delete(id); }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.userData.body.rotation.z = e.hit ? Math.sin(time * 25) * 0.25 : 0;
    }
  },
};
