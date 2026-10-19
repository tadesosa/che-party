// Escena: La Baldosa Floja — una vereda porteña de baldosas. Las flojas se marcan en rojo y después salpican.
import * as THREE from 'three';
import { makeHouse, makeTree } from '../models.js';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 15, 11], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.asphalt([22, 18]) })));
    const N = 5, CELL = 2.4, HALF = (N * CELL) / 2;
    const tiles = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.08, 0.2, CELL - 0.08), std({ map: tex.baldosa([1, 1]), color: '#ffffff' }));
      t.position.set(-HALF + (i + 0.5) * CELL, 0.1, -HALF + (j + 0.5) * CELL); t.receiveShadow = true;
      group.add(t); tiles.push(t);
    }
    const curb = new THREE.Mesh(new THREE.BoxGeometry(N * CELL + 0.6, 0.25, N * CELL + 0.6), std({ color: '#cfc6b0' })); curb.position.y = 0.05; group.add(curb);
    ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#b06ab3'].forEach((c, i) => { const h = makeHouse(c, '#1b2a4a', 4, 4.8); h.position.set(-12 + i * 6, 0, -11); group.add(h); });
    for (const [x, z] of [[-10, 2], [10, 2]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    for (const x of [-8, 8]) { const f = makeFarol(); f.position.set(x, 0, -7.5); group.add(f); }
    for (const p of players) ctx.addChar(p, 0, 0);
    return { tiles, phase: '', drops: [] };
  },
  update(ctx, st, s, dt, time) {
    const loose = new Set(s.loose);
    st.tiles.forEach((t, i) => {
      const red = s.phase === 'show' && loose.has(i);
      const splash = s.phase === 'splash' && loose.has(i);
      t.material.color.set(red ? '#ff7a6b' : splash ? '#9fd3ff' : '#ffffff');
      t.position.y = 0.1 + (red ? Math.abs(Math.sin(time * 14 + i)) * 0.06 : 0) + (splash ? -0.05 : 0);
      t.rotation.z = red ? Math.sin(time * 20 + i) * 0.03 : 0;
    });
    if (s.phase !== st.phase) {
      st.phase = s.phase;
      if (s.phase === 'show') ctx.sfx('select');
      if (s.phase === 'hide') ctx.sfx('count');
      if (s.phase === 'splash') {
        ctx.sfx('whistle');
        for (const i of loose) ctx.splash(st.tiles[i].position.clone().add(new THREE.Vector3(0, 0.3, 0)));
      }
    }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k, 0.2);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      if (e.wet) { g.userData.body.rotation.z = Math.sin(time * 25) * 0.15; if (Math.random() < dt * 8) ctx.splash(g.position.clone().add(new THREE.Vector3(0, 1.3, 0))); }
    }
  },
};
