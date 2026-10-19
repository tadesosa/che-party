// Escena: ¿Dónde está la bolita? — Don Sifón hace de trilero con tres vasos sobre una mesa.
import * as THREE from 'three';
import { makeCharacter, animateChar } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const SLOT_X = (slot) => (slot - 1) * 2.2;

export default {
  camera: { pos: [0, 5.2, 8.6], look: [0, 1.4, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(60, 40, std({ map: tex.cobble([12, 8]) })));
    // Mesa con mantel verde
    const top = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 3), std({ color: '#2e7d4a' }));
    top.position.y = 1.0; top.receiveShadow = true; top.castShadow = true; group.add(top);
    for (const x of [-3.6, 3.6]) for (const z of [-1.2, 1.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), std({ color: '#5a3a22' })); leg.position.set(x, 0.5, z); group.add(leg);
    }
    // El trilero
    const host = makeCharacter('sifon', '#74acdf'); host.position.set(0, 0.4, -2.4); host.scale.setScalar(1.45); host.userData.ring.visible = false; group.add(host);
    const cups = [0, 1, 2].map((i) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 1.1, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: '#c0392b', roughness: 0.4, clearcoat: 0.7, side: THREE.DoubleSide }));
      const lid = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), c.material); lid.rotation.x = -Math.PI / 2; lid.position.y = 0.55; c.add(lid);
      c.castShadow = true; c.position.set(SLOT_X(i), 1.65, 0.3); group.add(c);
      const num = ctx.label(String(i + 1), '#ffffff', 0.6); num.position.set(SLOT_X(i), 1.25, 1.55); group.add(num);
      return c;
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#f2c230', roughness: 0.2, clearcoat: 1 }));
    ball.position.set(0, 1.32, 0.3); group.add(ball);
    const spacing = Math.min(2.2, 10 / Math.max(1, n - 1));
    players.forEach((p, i) => { const g = ctx.addChar(p, rowX(i, n, spacing), 3.4); g.rotation.y = Math.PI; g.scale.setScalar(0.85); });
    return { cups, ball, host, round: 0, revealed: false };
  },
  update(ctx, st, s, dt, time) {
    // Posición de cada vaso según su lugar (y el intercambio en curso, con un arquito)
    st.cups.forEach((c, cup) => {
      let x = SLOT_X(s.slots[cup]), z = 0.3;
      if (s.swap && (s.swap.a === cup || s.swap.b === cup)) {
        const other = s.swap.a === cup ? s.swap.b : s.swap.a;
        const from = SLOT_X(s.slots[cup]), to = SLOT_X(s.slots[other]);
        x = from + (to - from) * s.swap.p;
        z = 0.3 + Math.sin(s.swap.p * Math.PI) * (s.swap.a === cup ? 0.9 : -0.9);
      }
      c.position.x += (x - c.position.x) * Math.min(1, dt * 30);
      c.position.z = z;
      const lift = s.ball === cup ? 0.9 : 0;
      c.position.y += (1.65 + lift - c.position.y) * Math.min(1, dt * 10);
    });
    if (s.ball != null) { st.ball.visible = true; st.ball.position.x = st.cups[s.ball].position.x; st.ball.position.z = 0.3; }
    else st.ball.visible = false;
    if (s.swap && Math.random() < dt * 8) ctx.sfx('select');
    animateChar(st.host, time, { walk: s.swap ? 1 : 0, wave: s.phase === 'show', phase: 1 });
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      animateChar(g, time, { wave: e.picked && s.phase === 'pick', phase: g.id });
    }
    if (s.phase === 'reveal' && !st.revealed) {
      st.revealed = true;
      for (const e of s.ents) {
        if (e.pick == null) continue;
        const g = ctx.chars.get(e.id);
        ctx.floatText(`Vaso ${e.pick + 1}`, g.position.clone().add(new THREE.Vector3(0, 2.6, 0)), '#1b2a4a');
      }
    }
    if (s.phase !== 'reveal') st.revealed = false;
  },
};
