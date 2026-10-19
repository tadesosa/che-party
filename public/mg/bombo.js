// Escena: El Bombo Legüero — una peña al aire libre con el bombista en el medio. Arriba, una barra de ritmo:
// los golpes se marcan como bombos; al repetir, una aguja recorre la barra; al final se ven los golpes de cada uno.
import * as THREE from 'three';
import { plane, std, rowX } from './util.js';
import { tex } from '../textures.js';
import { makeCardon, makeSevenColors } from '../decor2.js';

const BAR = 12; // ancho de la barra de ritmo

function makeDrum(scale = 1) {
  const g = new THREE.Group();
  // Parado con el parche mirando a la tele, con aros y cuerdas como el legüero
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.9, 20), new THREE.MeshPhysicalMaterial({ color: '#8a5a34', roughness: 0.6 }));
  shell.rotation.x = Math.PI / 2; g.add(shell);
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), std({ color: '#efe2c4' })); head.position.z = 0.46; g.add(head);
  for (const sz of [-0.42, 0.42]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 24), std({ color: '#5a3a22' })); hoop.position.z = sz; g.add(hoop); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.86, 4), std({ color: '#efe2c4' })); rope.rotation.x = Math.PI / 2; rope.position.set(Math.cos(a) * 0.61, Math.sin(a) * 0.61, 0); g.add(rope); }
  g.scale.setScalar(scale);
  return g;
}

export default {
  camera: { pos: [0, 6.5, 15.5], look: [0, 3.4, 0] },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(140, 100, std({ map: tex.dirt([24, 18]), color: '#d9a983' })));
    for (const [x, z] of [[-24, -30], [2, -38], [26, -30]]) { const m = makeSevenColors(12, 17); m.position.set(x, 0, z); group.add(m); }
    for (const [x, z] of [[-9, -3], [9, -3], [-12, 4], [12, 4]]) { const c = makeCardon(2.8); c.position.set(x, 0, z); group.add(c); }
    // El bombista (Sifón no: un bombo gigante con palillo)
    const drum = makeDrum(1.6); drum.position.set(0, 1.2, -2.5); group.add(drum);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), std({ color: '#5a3a22' })); stick.position.set(0.9, 2.4, -2.2); group.add(stick);
    // Barra de ritmo con 8 casilleros
    const bar = new THREE.Group(); bar.position.set(0, 5.6, -1); group.add(bar);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(BAR + 0.6, 1.4), new THREE.MeshBasicMaterial({ color: '#1b2a4a' })); bar.add(bg);
    const slots = [];
    for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(BAR / 8 - 0.15, 1.1), new THREE.MeshBasicMaterial({ color: i % 2 ? '#2a3d63' : '#33507f' })); s.position.set(-BAR / 2 + (i + 0.5) * (BAR / 8), 0, 0.01); bar.add(s); slots.push(s); }
    const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.6), new THREE.MeshBasicMaterial({ color: '#f6b40e' })); needle.position.z = 0.03; bar.add(needle);
    const beatMarks = new THREE.Group(); bar.add(beatMarks);
    const tapMarks = new THREE.Group(); bar.add(tapMarks);
    const lanes = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, 2.6);
      const d = makeDrum(0.6); d.position.set(x + 0.7, 0.45, 2.2); group.add(d);
      const g = ctx.addChar(p, x, 1.8);
      lanes.set(p.id, { g, d, n: 0, hit: 0, color: CH[p.char].color, row: i });
    });
    return { bar, needle, slots, beatMarks, tapMarks, lanes, drum, stick, played: new Set(), key: '' };
  },
  update(ctx, st, s, dt, time) {
    const xOf = (sec) => -BAR / 2 + (sec / (s.slot * s.slots)) * BAR + (BAR / 16) * 0;
    const key = s.round + s.phase;
    if (key !== st.key) {
      st.key = key; st.played.clear(); st.counted = -1;
      while (st.beatMarks.children.length) st.beatMarks.remove(st.beatMarks.children[0]);
      while (st.tapMarks.children.length) st.tapMarks.remove(st.tapMarks.children[0]);
      // Escuchando: se ven los golpes del ritmo. Repitiendo: se esconden (¡hay que acordarse!)
      if (s.phase !== 'play') for (const b of s.beats) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: '#f6b40e' })); m.position.set(xOf(b), 0, 0.02); st.beatMarks.add(m); }
      // Al final: los golpes de cada jugador en filitas de su color
      if (s.phase === 'score') s.ents.forEach((e, row) => {
        const color = st.lanes.get(e.id)?.color || '#fff';
        for (const t of e.taps) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), new THREE.MeshBasicMaterial({ color })); m.position.set(xOf(t), -0.45 + row * 0.16, 0.04); st.tapMarks.add(m); }
      });
    }
    const local = s.pt - s.count;
    st.needle.visible = s.phase !== 'score' && local >= 0;
    st.needle.position.x = xOf(Math.max(0, local));
    // Cuenta "1, 2, 3" y golpes del bombista cuando escuchamos
    const tick = Math.floor(s.pt / (s.count / 3));
    if (s.pt < s.count && tick !== st.counted && s.phase !== 'score') { st.counted = tick; ctx.sfx('count'); }
    if (s.phase === 'listen') for (const b of s.beats) if (local >= b && !st.played.has(b)) { st.played.add(b); ctx.sfx('kick'); st.hitT = time; }
    const hit = Math.max(0, 1 - (time - (st.hitT || -9)) * 6);
    st.drum.scale.setScalar(1.6 * (1 + hit * 0.08));
    st.stick.rotation.z = -hit * 0.8;
    st.slots.forEach((sl, i) => { sl.material.color.set(local >= i * s.slot && local < (i + 1) * s.slot && s.phase !== 'score' ? '#4f7fc4' : i % 2 ? '#2a3d63' : '#33507f'); });
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      // Cada golpe del jugador hace sonar su bombito (en la tele no se escucha, para no ayudar a los demás)
      if (e.n > l.n) l.hit = 1;
      l.n = e.n;
      l.hit = Math.max(0, l.hit - dt * 6);
      l.d.scale.setScalar(0.6 * (1 + l.hit * 0.15));
      l.g.userData.arms[1].rotation.x = -0.6 - l.hit * 1.2;
      l.g.rotation.y = 0;
    }
  },
};
