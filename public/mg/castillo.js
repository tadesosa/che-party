// Escena: Castillo de Arena — la playa con un castillo por jugador que va creciendo y el mar que avanza con cada ola.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const GAP = 3.2;

function makeCastle() {
  const g = new THREE.Group();
  const sand = std({ color: '#e6cf98', roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1, 8), sand); body.position.y = 0.5; g.add(body);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1, 8), sand); g.add(tower);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), std({ color: '#e14b3c', side: THREE.DoubleSide })); g.add(flag);
  g.userData = { body, tower, flag };
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5 + w * 0.2, 7 + w * 0.5], look: [0, 1.5, -1] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(90, 60, std({ map: tex.sand([20, 14]) })));
    const sea = plane(90, 30, std({ map: tex.water([20, 8]), color: '#3d86b8', roughness: 0.1, transparent: true, opacity: 0.92 }), { y: 0.05, z: -19 }); group.add(sea);
    const foam = plane(90, 0.6, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }), { y: 0.07, z: -4 }); group.add(foam);
    const castles = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const c = makeCastle(); c.position.set(x, 0, -1.5); group.add(c);
      const wall = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.25, 6, 16, Math.PI), std({ color: '#d9bf85' })); wall.rotation.x = -Math.PI / 2; wall.rotation.z = Math.PI; wall.position.set(x, 0.1, -1.5); wall.visible = false; group.add(wall);
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.4, 10), std({ color: ['#e14b3c', '#2f86e0', '#f2c230', '#2e9e48', '#b06ab3', '#ef8a17'][i % 6] })); bucket.position.set(x + 1, 0.2, 0.3); group.add(bucket);
      ctx.addChar(p, x, 0.9);
      castles.set(p.id, { x, c, wall, h: 0 });
    });
    return { castles, sea, foam, waveK: 0, wave: 'calm' };
  },
  update(ctx, st, s, dt, time) {
    // El mar: en aviso se retira, en la ola avanza hasta los castillos
    const target = s.wave === 'warn' ? -0.6 : s.wave === 'hit' ? 1 : 0;
    st.waveK += (target - st.waveK) * Math.min(1, dt * (s.wave === 'hit' ? 6 : 2));
    st.sea.position.z = -19 + st.waveK * 4 + Math.sin(time) * 0.2;
    st.foam.position.z = -4 + st.waveK * 4 + Math.sin(time) * 0.2;
    if (s.wave !== st.wave) { st.wave = s.wave; if (s.wave === 'warn') ctx.sfx('horn'); if (s.wave === 'hit') ctx.sfx('swoosh'); }
    for (const e of s.ents) {
      const c = st.castles.get(e.id); if (!c) continue;
      c.h += (e.h - c.h) * Math.min(1, dt * 8);
      const H = 0.6 + c.h * 0.12;
      const u = c.c.userData;
      u.body.scale.y = H; u.body.position.y = H / 2;
      u.tower.position.y = H + 0.5; u.flag.position.set(0.2, H + 1.15, 0);
      c.wall.visible = e.wall;
      if (e.hit && !c.hitShown) { c.hitShown = true; ctx.splash(c.c.position.clone().add(new THREE.Vector3(0, H / 2, 0))); }
      if (!e.hit) c.hitShown = false;
      const g = ctx.chars.get(e.id); g.rotation.y = Math.PI;
      g.userData.body.position.y = Math.abs(Math.sin(time * 9 + c.x)) * 0.1;
    }
  },
};
