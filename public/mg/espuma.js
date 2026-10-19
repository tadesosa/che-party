// Escena: Carnaval de Espuma — una plaza cuadrada que se va llenando de espuma celeste y roja.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

const TEAM = ['#5fb3ff', '#ff6b5e'];

export default {
  camera: { pos: [0, 17, 13], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.grass([22, 18]) })));
    group.add(plane(17, 17, std({ map: tex.baldosa([8, 8]) }), { y: 0.01 }));
    for (const [x, z] of [[-12, -8], [12, -8], [-12, 6], [12, 6], [0, -12]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) { const f = makeFarol(); f.position.set(x, 0, z); group.add(f); }
    // La espuma: una textura de la grilla que se repinta cuando cambia
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.LinearFilter;
    const foam = plane(16, 16, new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.6 }), { y: 0.05 });
    group.add(foam);
    for (const p of players) ctx.addChar(p, 0, 0);
    return { c, texture, last: '' };
  },
  update(ctx, st, s, dt, time) {
    if (s.grid !== st.last) {
      st.last = s.grid;
      const x = st.c.getContext('2d'), n = s.n, cs = st.c.width / n;
      x.clearRect(0, 0, st.c.width, st.c.height);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const v = s.grid.charCodeAt(j * n + i) - 48;
        if (!v) continue;
        x.fillStyle = TEAM[v - 1];
        x.beginPath(); x.arc((i + 0.5) * cs, (j + 0.5) * cs, cs * 0.78, 0, 7); x.fill();
      }
      st.texture.needsUpdate = true;
    }
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      if (e.spray && Math.random() < dt * 30) {
        const d = 1 + Math.random() * 3.5;
        ctx.splash(new THREE.Vector3(e.x + Math.sin(e.ang) * d, 0.3, e.z + Math.cos(e.ang) * d));
      }
    }
  },
};
