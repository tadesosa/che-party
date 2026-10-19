// Escena: Subí al Obelisco — una cara del Obelisco por jugador, con macetas y palomas que caen de arriba.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, fitSpan } from './util.js';

const GAP = 2.8, SCALE = 0.55; // metros del juego -> unidades de la escena

export default {
  camera: { pos: [0, 4, 14], look: [0, 4, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(90, 60, std({ map: tex.asphalt([20, 14]) })));
    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      // Una franja del obelisco (alta y blanca) detrás de cada trepador
      const col = new THREE.Mesh(new THREE.BoxGeometry(2.1, 30 * SCALE + 3, 0.6), std({ color: '#efe9da' }));
      col.position.set(x, (30 * SCALE + 3) / 2, -0.6); group.add(col);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2, 4), std({ color: '#efe9da' })); tip.rotation.y = Math.PI / 4; tip.position.set(x, 30 * SCALE + 4, -0.6); group.add(tip);
      // Una línea en el medio para ver de qué lado está cada uno
      const mid = new THREE.Mesh(new THREE.BoxGeometry(0.04, 30 * SCALE + 3, 0.02), std({ color: '#c9bfa8' })); mid.position.set(x, (30 * SCALE + 3) / 2, -0.29); group.add(mid);
      const g = ctx.addChar(p, x, 0, 0.8);
      slots.set(p.id, { x, g, drops: new Map(), warn: [-1, 1].map((sd) => { const w = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 3), new THREE.MeshBasicMaterial({ color: '#e14b3c', transparent: true, opacity: 0.8 })); w.rotation.x = Math.PI; w.position.x = x + sd * 0.5; w.visible = false; group.add(w); return w; }) });
    });
    return { slots, camY: 4 };
  },
  update(ctx, st, s, dt, time) {
    let maxH = 0, minH = Infinity;
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const g = sl.g;
      const y = e.h * SCALE;
      g.position.x += (sl.x + e.side * 0.45 - g.position.x) * Math.min(1, dt * 14);
      g.position.y += (y - g.position.y) * Math.min(1, dt * 10);
      g.position.z = 0;
      g.rotation.y = Math.PI;
      g.userData.body.rotation.z = e.hit ? Math.sin(time * 25) * 0.3 : e.side * 0.15;
      maxH = Math.max(maxH, y); minH = Math.min(minH, y);
      // Lo que cae sobre este trepador
      const live = new Set();
      for (const d of s.drops) {
        if (d.for !== e.id) continue;
        live.add(d.id);
        let m = sl.drops.get(d.id);
        if (!m) {
          m = d.kind === 'maceta'
            ? new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.4, 10), std({ color: '#b5543a' }))
            : new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), std({ color: '#8a8f99' }));
          ctx.group.add(m); sl.drops.set(d.id, m);
        }
        m.position.set(sl.x + d.side * 0.5, d.y * SCALE + 0.8, 0.2);
        m.rotation.z += dt * 6;
      }
      for (const [id, m] of sl.drops) if (!live.has(id)) { ctx.group.remove(m); sl.drops.delete(id); }
      // Flechita roja de aviso del lado por donde viene algo
      const sides = new Set(s.drops.filter((d) => d.for === e.id && d.y - e.h < 7).map((d) => d.side));
      sl.warn.forEach((w, k) => { w.visible = sides.has(k ? 1 : -1); w.position.y = y + 3 + Math.sin(time * 10) * 0.1; });
      if (e.hit && !sl.hitShown) { sl.hitShown = true; ctx.sfx('bonk'); }
      if (!e.hit) sl.hitShown = false;
    }
    // La cámara encuadra del más bajo al más alto (si se separan mucho, se aleja): nadie queda afuera
    const f = fitSpan(st, minH, maxH + 2, dt, { base: 14, margin: 2.5, per: 0.85, minC: 4 });
    st.camY = f.c;
    ctx.setCamera([0, f.c + 1, 14 * f.z], [0, f.c, 0]);
  },
};
