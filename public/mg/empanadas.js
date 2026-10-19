// Escena: Contá las Empanadas — pasan volando empanadas y medialunas por el cielo.
import * as THREE from 'three';
import { makeHouse, animateChar } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const toy = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.6 });

function makeEmpanada() {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.absarc(0, 0, 0.5, Math.PI, 0, true); sh.lineTo(-0.5, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 4, curveSegments: 20 });
  geo.translate(0, -0.2, -0.09);
  g.add(new THREE.Mesh(geo, toy('#e8a64a')));
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI;
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toy('#c97f2a'));
    k.position.set(Math.cos(a) * 0.6, -0.2 + Math.sin(a) * 0.6, 0); g.add(k);
  }
  return g;
}
function makeMedialuna() {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const t = i / 6, a = Math.PI + 0.3 - t * (Math.PI + 0.6), r = 0.1 + 0.16 * Math.sin(Math.PI * t);
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), toy('#e9a83a'));
    s.position.set(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0); g.add(s);
  }
  return g;
}

export default {
  camera: { pos: [0, 3.8, 13], look: [0, 2.6, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 40, std({ map: tex.baldosa([20, 10]) })));
    ['#e14b3c', '#f2c230', '#3b8fe0', '#2e9e48', '#ef8a17', '#b06ab3'].forEach((c, i) => {
      const h = makeHouse(c, '#1b2a4a', 3.6, 6 + (i % 2)); h.position.set(-11.25 + i * 4.5, 0, -7); group.add(h);
    });
    // Cartel de la fonda
    const sign = ctx.label('🥟 Fonda Che Party', '#ffffff', 0.9); sign.position.set(0, 7.6, -5); group.add(sign);
    const spacing = Math.min(2.6, 12 / Math.max(1, n - 1));
    players.forEach((p, i) => ctx.addChar(p, rowX(i, n, spacing), 3.2));
    const q = ctx.label('?', '#ffffff', 3); q.position.set(0, 4, -1); q.visible = false; group.add(q);
    return { items: new Map(), q, total: null };
  },
  update(ctx, st, s, dt, time) {
    const alive = new Set();
    for (const it of s.items) {
      alive.add(it.id);
      let m = st.items.get(it.id);
      if (!m) { m = it.k === 'empanada' ? makeEmpanada() : makeMedialuna(); m.scale.setScalar(1.7); m.position.set(it.x, it.y, -1); st.items.set(it.id, m); ctx.group.add(m); ctx.sfx('swoosh'); }
      m.position.x += (it.x - m.position.x) * Math.min(1, dt * 20);
      m.rotation.z = time * 3; m.rotation.y = Math.sin(time * 2 + it.id) * 0.5;
    }
    for (const [id, m] of st.items) if (!alive.has(id)) { ctx.group.remove(m); st.items.delete(id); }
    st.q.visible = s.phase === 'answer';
    if (s.total != null && st.total == null) {
      st.total = s.total;
      const l = ctx.label(`Eran ${s.total} 🥟`, '#ffffff', 1.6); l.position.set(0, 4.5, -1); ctx.group.add(l);
      ctx.sfx('gold');
    }
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      g.rotation.y = 0;
      // Mientras pasan, miran para arriba siguiendo las empanadas
      g.userData.body.rotation.x = s.phase === 'show' ? -0.15 : 0;
      animateChar(g, time, { wave: e.answered && s.phase === 'answer', phase: g.id });
    }
  },
};
