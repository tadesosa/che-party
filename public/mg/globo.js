// Escena: Inflá el Globo
import * as THREE from 'three';
import { makeHouse } from '../models.js';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

export default {
  camera: { pos: [0, 4, 13], look: [0, 2.6, 0] },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(80, 40, std({ map: tex.baldosa([20, 10]) })));
    ['#e14b3c', '#f2c230', '#3b8fe0', '#2e9e48', '#ef8a17', '#b06ab3'].forEach((c, i) => {
      const h = makeHouse(c, '#1b2a4a', 3.6, 4.5 + (i % 2)); h.position.set(-11.25 + i * 4.5, 0, -6); group.add(h);
    });
    for (const x of [-9, 9]) { const f = makeFarol(); f.position.set(x, 0, -2); group.add(f); }
    const balloons = new Map();
    const spacing = Math.min(3, 14 / Math.max(1, n - 1));
    players.forEach((p, i) => {
      const x = rowX(i, n, spacing);
      ctx.addChar(p, x, 0);
      const mat = new THREE.MeshStandardMaterial({ color: CH[p.char].color, roughness: 0.2, metalness: 0.05 });
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat);
      b.scale.set(1, 1.15, 1);
      b.castShadow = true;
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }));
      shine.position.set(-0.4, 0.45, 0.75); b.add(shine);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 8), mat); knot.rotation.x = Math.PI; knot.position.y = -1.05;
      b.add(knot);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), new THREE.MeshBasicMaterial({ color: '#333' }));
      group.add(b, string);
      balloons.set(p.id, { b, string, x, popped: false, lastTaps: 0, punch: 0 });
    });
    return { balloons };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const bl = st.balloons.get(e.id); if (!bl) continue;
      const g = ctx.chars.get(e.id);
      if (e.taps > bl.lastTaps) { bl.punch = 1; bl.lastTaps = e.taps; }
      bl.punch = Math.max(0, bl.punch - dt * 6);
      const size = 0.35 + (e.taps / s.target) * 1.35;
      if (s.popped.includes(e.id)) {
        if (!bl.popped) {
          bl.popped = true; bl.b.visible = false; bl.string.visible = false;
          ctx.burst(bl.b.position.clone(), 90, 6);
          ctx.sfx('pop');
          ctx.floatText('¡PUM!', bl.b.position.clone().add(new THREE.Vector3(0, 1, 0)), '#c0392b');
        }
      } else {
        // Cerca de reventar, tiembla
        const shake = e.taps / s.target > 0.8 ? Math.sin(time * 60) * 0.05 : 0;
        bl.b.scale.set(size * (1 + bl.punch * 0.06), size * 1.15 * (1 + bl.punch * 0.06), size);
        bl.b.position.set(bl.x + Math.sin(time * 2 + bl.x) * 0.1 + shake, 2.4 + size * 1.15, 0);
        const top = bl.b.position.y - size * 1.15, bottom = 1.4;
        bl.string.position.set(bl.x, (top + bottom) / 2, 0);
        bl.string.scale.y = Math.max(0.01, top - bottom);
      }
      g.userData.body.position.y = bl.punch * 0.15;
      g.userData.body.scale.y = 1 - bl.punch * 0.1;
    }
  },
};
