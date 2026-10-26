// Escena: La Silla de la Abuela — sillas musicales en el salón.
import * as THREE from 'three';
import { makeChair, makeLamp } from './sillas-props.js';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std, tbox, canvasPlane } from './util.js';

export default {
  camera: { pos: [0, 15, 13.5], look: [0, 0, 2] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(26, 26, std({ map: tex.wood([4, 4]) })));
    // Paredes del salón: empapelado arriba, boiserie abajo y la guarda celeste en el medio
    const paper = std({ map: tex.empapelado(), color: '#f3dfc0' }), wood = std({ map: tex.boiserie(), color: '#8a5a34', roughness: 0.6 }), band = std({ color: '#74acdf' });
    for (const [x, z, ry] of [[0, -13, 0], [-13, 0, Math.PI / 2], [13, 0, -Math.PI / 2]]) {
      const w = tbox(26, 4.8, 0.4, paper, 1.6, { y: 3.6 }), low = tbox(26, 1.2, 0.44, wood, 1.2, { y: 0.6 }), b = tbox(26, 0.25, 0.48, band, 1, { y: 1.25 });
      for (const m of [w, low, b]) { m.position.x += x; m.position.z += z; m.rotation.y = ry; group.add(m); }
    }
    // Ventana con cortinas y cuadros en las paredes
    const win = canvasPlane(3, 2.4, (x, w, h) => {
      x.fillStyle = '#f4efe2'; x.fillRect(0, 0, w, h);
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7fbde8'); g.addColorStop(1, '#d6eefa'); x.fillStyle = g; x.fillRect(14, 14, w - 28, h - 28);
      x.fillStyle = '#5aa04a'; x.beginPath(); x.ellipse(w * 0.3, h * 0.85, w * 0.3, h * 0.2, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(w * 0.8, h * 0.9, w * 0.3, h * 0.25, 0, 0, 7); x.fill();
      x.fillStyle = '#f4efe2'; x.fillRect(w / 2 - 5, 0, 10, h); x.fillRect(0, h * 0.45, w, 10);
    }, 256);
    win.material.transparent = false; win.position.set(4, 3.6, -12.78); group.add(win);
    const curtain = std({ color: '#b5303a', roughness: 0.8 });
    for (const sx of [-1, 1]) group.add(tbox(0.7, 3.2, 0.12, curtain, 1, { x: 4 + sx * 1.75, y: 3.5, z: -12.7 }));
    group.add(tbox(4.4, 0.35, 0.2, curtain, 1, { x: 4, y: 5.1, z: -12.68 }));
    const frame = std({ color: '#c9a227', metalness: 0.6, roughness: 0.35 });
    [[-4, 3.8, '#e9b46a'], [-9, 4, '#8fc0e0']].forEach(([x, y, sky]) => {
      group.add(tbox(1.9, 1.5, 0.08, frame, 1, { x, y, z: -12.76 }));
      const pic = canvasPlane(1.6, 1.2, (c, w, h) => { c.fillStyle = sky; c.fillRect(0, 0, w, h); c.fillStyle = '#7a6a5a'; c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.35, h * 0.3); c.lineTo(w * 0.6, h * 0.65); c.lineTo(w * 0.8, h * 0.4); c.lineTo(w, h); c.fill(); c.fillStyle = '#4f8a3a'; c.fillRect(0, h * 0.82, w, h * 0.18); }, 128);
      pic.material.transparent = false; pic.position.set(x, y, -12.7); group.add(pic);
    });
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
