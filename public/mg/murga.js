// Escena: Ritmo de Murga — una pista de golpes que baja hacia la línea, con los murgueros tocando abajo.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const SPEED = 4.2;   // unidades por segundo que bajan los golpes
const HIT_Z = 1.2;   // la línea
const LANE = { b: -1.1, p: 1.1 };
const COLORS = { b: '#e14b3c', p: '#f2c230' };

function makeBombo(color) {
  const g = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 18), std({ color }));
  drum.rotation.z = Math.PI / 2; g.add(drum);
  for (const x of [-0.26, 0.26]) { const head = new THREE.Mesh(new THREE.CircleGeometry(0.4, 18), std({ color: '#f4efe2' })); head.position.x = x; head.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(head); }
  return g;
}

export default {
  camera(n) { return { pos: [0, 9, 10 + n * 0.5], look: [0, 0, -2] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(80, 60, std({ map: tex.asphalt([20, 14]) })));
    // La pista con sus dos carriles
    group.add(plane(4.6, 14, std({ color: '#1b2a4a' }), { y: 0.02, z: -4.5 }));
    for (const [k, x] of Object.entries(LANE)) group.add(plane(1.7, 14, std({ color: k === 'b' ? '#4a1f1f' : '#4a3f12' }), { x, y: 0.03, z: -4.5 }));
    const line = plane(4.8, 0.22, new THREE.MeshBasicMaterial({ color: '#ffffff' }), { y: 0.05, z: HIT_Z }); group.add(line);
    // Guirnaldas de murga
    const COLS = ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#b06ab3'];
    for (let i = 0; i < 22; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 3), std({ color: COLS[i % 5] }));
      f.rotation.x = Math.PI; f.position.set(-11 + i, 4.5 - Math.sin((i / 21) * Math.PI) * 0.8, -11); group.add(f);
    }
    const drummers = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, Math.min(2.4, 14 / Math.max(1, n - 1)));
      const g = ctx.addChar(p, x, 3.6);
      const bombo = makeBombo(CH[p.char].color); bombo.position.set(0, 0.9, 0.6); g.add(bombo);
      drummers.set(p.id, { g, bombo, hit: 0, x });
    });
    const noteGeo = { b: new THREE.CylinderGeometry(0.6, 0.6, 0.25, 20), p: new THREE.CylinderGeometry(0.55, 0.55, 0.12, 6) };
    return { notes: new Map(), noteGeo, drummers, line, flash: 0 };
  },
  update(ctx, st, s, dt, time) {
    const live = new Set();
    for (const n of s.notes) {
      live.add(n.id);
      let m = st.notes.get(n.id);
      if (!m) { m = new THREE.Mesh(st.noteGeo[n.k], std({ color: COLORS[n.k], emissive: COLORS[n.k], emissiveIntensity: 0.3 })); ctx.group.add(m); st.notes.set(n.id, m); }
      m.position.set(LANE[n.k], 0.2, HIT_Z - n.dt * SPEED);
      const near = Math.abs(n.dt) < 0.12;
      m.scale.setScalar(near ? 1.15 : 1);
      if (n.dt < -0.15) m.material.opacity = 0.3, m.material.transparent = true;
    }
    for (const [id, m] of st.notes) if (!live.has(id)) { ctx.group.remove(m); st.notes.delete(id); }
    let any = false;
    for (const e of s.ents) {
      const d = st.drummers.get(e.id); if (!d) continue;
      d.g.rotation.y = Math.PI;
      if (e.last === 'perfecto' || e.last === 'bien') { if (!d.shown) { d.shown = true; d.hit = 1; any = true; } }
      else d.shown = false;
      d.hit = Math.max(0, d.hit - dt * 6);
      d.bombo.scale.setScalar(1 + d.hit * 0.15);
      d.g.userData.body.position.y = d.hit * 0.25 + Math.abs(Math.sin(time * Math.PI * 112 / 60)) * 0.08;
    }
    if (any) { st.flash = 1; ctx.sfx('kick'); }
    st.flash = Math.max(0, st.flash - dt * 5);
    st.line.material.color.setRGB(1, 1 - st.flash * 0.3, 1 - st.flash * 0.8);
  },
};
