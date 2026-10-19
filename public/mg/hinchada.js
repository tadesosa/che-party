// Escena: La Hinchada — una tribuna con banderas y un bombo gigante que marca el ritmo.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const TEAM = ['#2f86e0', '#f2c230', '#e14b3c', '#2e9e48', '#b06ab3', '#ef8a17'];

export default {
  camera(n) { return { pos: [0, 5, 12 + n * 0.3], look: [0, 2.5, 0] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 60, std({ color: '#3f9b46' })));
    // Gradas
    for (let i = 0; i < 4; i++) { const step = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 1.4), std({ color: '#b8b8b8' })); step.position.set(0, 0.3 + i * 0.6, -i * 1.4); group.add(step); }
    // Banderas colgando del alambrado
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), std({ color: TEAM[i % 6], side: THREE.DoubleSide }));
      f.position.set(-7.5 + i * 3, 4.8, -5.6); group.add(f);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.35), std({ color: '#ffffff', side: THREE.DoubleSide })); stripe.position.set(-7.5 + i * 3, 4.8, -5.58); group.add(stripe);
    }
    // El bombo gigante en el centro, adelante
    const bombo = new THREE.Group();
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 24), std({ color: '#1b2a4a' })); drum.rotation.x = Math.PI / 2; bombo.add(drum);
    const head = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), std({ color: '#f4efe2' })); head.position.z = 0.46; bombo.add(head);
    bombo.position.set(-Math.max(4, n * 1.4) - 1.5, 1.6, 1.5); bombo.rotation.y = 0.5; group.add(bombo);
    const tribuna = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, Math.min(2.6, 15 / Math.max(1, n - 1)));
      const row = i % 2;
      const g = ctx.addChar(p, x, -row * 1.4); g.position.y = 0.6 + row * 0.6;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), std({ color: TEAM[i % 6], side: THREE.DoubleSide })); flag.position.set(0.45, (g.userData.top || 1.8) + 0.6, 0); g.add(flag);
      tribuna.set(p.id, { g, flag, baseY: 0.6 + row * 0.6, jump: 0 });
    });
    return { bombo, head, tribuna, lastBeat: -1 };
  },
  update(ctx, st, s, dt, time) {
    if (s.beatN !== st.lastBeat && s.countdown <= 0) { st.lastBeat = s.beatN; ctx.sfx('kick'); }
    // El bombo late con cada golpe
    const pulse = Math.max(0, 1 - s.beat * 4);
    st.bombo.scale.setScalar(1 + pulse * 0.12);
    st.head.material.color.setRGB(0.96, 0.94 - pulse * 0.3, 0.89 - pulse * 0.5);
    for (const e of s.ents) {
      const t = st.tribuna.get(e.id); if (!t) continue;
      if (e.ok === true) t.jump = 1;
      t.jump = Math.max(0, t.jump - dt * 5);
      t.g.position.y = t.baseY + Math.sin(t.jump * Math.PI) * 0.5;
      t.g.rotation.y = 0;
      t.flag.rotation.z = Math.sin(time * 6 + t.baseY) * 0.3 + (e.combo > 8 ? Math.sin(time * 14) * 0.3 : 0);
      t.g.userData.body.rotation.z = e.ok === false ? 0.2 : 0;
    }
  },
};
