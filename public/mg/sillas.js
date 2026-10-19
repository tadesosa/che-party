// Escena: La Silla de la Abuela — sillas musicales en el salón.
import * as THREE from 'three';
import { makeChair, makeLamp } from './sillas-props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

export default {
  camera: { pos: [0, 15, 13.5], look: [0, 0, 2] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(26, 26, std({ map: tex.wood([4, 4]) })));
    // Paredes del salón con guarda
    const wall = std({ color: '#f3e3c3' });
    for (const [x, z, ry] of [[0, -13, 0], [-13, 0, Math.PI / 2], [13, 0, -Math.PI / 2]]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 0.4), wall);
      w.position.set(x, 3, z); w.rotation.y = ry; w.receiveShadow = true; group.add(w);
      const band = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 0.45), std({ color: '#74acdf' }));
      band.position.set(x, 1.2, z); band.rotation.y = ry; group.add(band);
    }
    // Alfombra redonda
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), std({ color: '#c0392b' }));
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01; rug.receiveShadow = true; group.add(rug);
    const rug2 = new THREE.Mesh(new THREE.RingGeometry(3.8, 4.1, 40), std({ color: '#f6b40e' }));
    rug2.rotation.x = -Math.PI / 2; rug2.position.y = 0.015; group.add(rug2);
    // El tocadiscos de la abuela
    const lamp = makeLamp(); lamp.position.set(-9, 0, -10); group.add(lamp);
    players.forEach((p, i) => { const a = (i / n) * Math.PI * 2; ctx.addChar(p, Math.cos(a) * 5.5, Math.sin(a) * 5.5); });
    return { chairs: [], round: -1, phase: null, notes: [], record: lamp.userData.record };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-20 * dt);
    // Sillas nuevas en cada ronda
    if (s.round !== st.round) {
      st.round = s.round;
      for (const c of st.chairs) ctx.group.remove(c);
      st.chairs = s.chairs.map((c) => {
        const m = makeChair(); m.scale.setScalar(1.25); m.position.set(c.x, 0, c.z); m.rotation.y = Math.atan2(c.x, c.z); // respaldo hacia el centro
        ctx.group.add(m); return m;
      });
    }
    if (s.phase !== st.phase) {
      if (s.phase === 'music') ctx.music('mg');
      else ctx.music(null);
      if (s.phase === 'scramble') ctx.sfx('whistle');
      st.phase = s.phase;
    }
    st.record.rotation.y += dt * (s.phase === 'music' ? 6 : 0);
    // Notitas flotando mientras suena la música
    if (s.phase === 'music' && Math.random() < dt * 4) {
      const note = ctx.label('♪', '#1b2a4a');
      note.position.set(-9 + Math.random(), 2.5, -10); ctx.group.add(note);
      st.notes.push({ m: note, life: 2.5, vx: (Math.random() - 0.3) * 1.5 });
    }
    for (let i = st.notes.length - 1; i >= 0; i--) {
      const nn = st.notes[i]; nn.life -= dt; nn.m.position.y += dt * 1.2; nn.m.position.x += nn.vx * dt;
      nn.m.material.opacity = Math.min(1, nn.life);
      if (nn.life <= 0) { ctx.group.remove(nn.m); st.notes.splice(i, 1); }
    }
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k, e.seat ? 0.5 : 0);
      if (e.seat) face(g, Math.atan2(e.x, e.z), k);
      else face(g, e.ang, k * 0.6);
      const sp = speedOf(g, dt);
      if (e.alive && !e.seat) walkAnim(g, time, sp / 5 + (s.phase === 'music' ? 0.3 : 0), g.id);
      else { g.userData.body.position.y = 0; g.userData.body.rotation.z = 0; }
      // Los que quedaron afuera se achican y se van al costado
      const target = e.alive ? 1 : 0.6;
      g.scale.setScalar(g.scale.x + (target - g.scale.x) * k * 0.3);
      if (!e.alive) g.userData.body.rotation.x = 0.4;
    }
  },
};
