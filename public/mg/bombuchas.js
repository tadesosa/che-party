// Escena: Batalla de Bombuchas — una vereda de barrio en carnaval, con bombuchas de colores volando.
import * as THREE from 'three';
import { makeHouse, makeTree } from '../models.js';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

const COLORS = ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#b06ab3', '#ef8a17'];

export default {
  camera: { pos: [0, 15, 13], look: [0, 0, 1] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(90, 70, std({ map: tex.grass([22, 18]) })));
    const yard = new THREE.Mesh(new THREE.CircleGeometry(8.6, 40), std({ map: tex.baldosa([8, 8]) }));
    yard.rotation.x = -Math.PI / 2; yard.position.y = 0.02; yard.receiveShadow = true; group.add(yard);
    const curb = new THREE.Mesh(new THREE.TorusGeometry(8.7, 0.18, 6, 48), std({ color: '#d9d2c3' })); curb.rotation.x = Math.PI / 2; curb.position.y = 0.1; group.add(curb);
    COLORS.forEach((c, i) => { const h = makeHouse(c, '#1b2a4a', 3.8, 4.5); h.position.set(-15 + i * 6, 0, -13); group.add(h); });
    for (const [x, z] of [[-13, 2], [13, 2], [-12, -6], [12, -6]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    for (const x of [-10, 10]) { const f = makeFarol(); f.position.set(x, 0, -9); group.add(f); }
    // Guirnaldas de carnaval
    for (let i = 0; i < 18; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), std({ color: COLORS[i % 6] }));
      f.rotation.x = Math.PI; f.position.set(-12 + i * 1.4, 4.4 - Math.sin((i / 17) * Math.PI) * 0.8, -10); group.add(f);
    }
    players.forEach((p, i) => { const a = (i / n) * Math.PI * 2; ctx.addChar(p, Math.cos(a) * 5.5, Math.sin(a) * 5.5); });
    const ballGeo = new THREE.SphereGeometry(0.28, 12, 10);
    return { balls: new Map(), ballGeo, seenSplash: new Set() };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.userData.body.rotation.z = e.wet ? Math.sin(time * 25) * 0.15 : g.userData.body.rotation.z;
      if (e.wet && Math.random() < dt * 10) ctx.splash(g.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
    }
    // Bombuchas en el aire
    const live = new Set();
    for (const b of s.balls) {
      live.add(b.id);
      let m = st.balls.get(b.id);
      if (!m) { m = new THREE.Mesh(st.ballGeo, std({ color: COLORS[b.id % 6], roughness: 0.2 })); m.scale.set(1, 1.15, 1); ctx.group.add(m); st.balls.set(b.id, m); ctx.sfx('swoosh'); }
      m.position.set(b.x, 1.2 + Math.sin(time * 9 + b.id) * 0.1, b.z);
    }
    for (const [id, m] of st.balls) if (!live.has(id)) { ctx.group.remove(m); st.balls.delete(id); }
    for (const sp of s.splashes) {
      if (st.seenSplash.has(sp.id)) continue;
      st.seenSplash.add(sp.id);
      ctx.splash(new THREE.Vector3(sp.x, 0.4, sp.z)); ctx.sfx('pop');
    }
  },
};
