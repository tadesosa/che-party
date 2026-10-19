// Escena: Subí al Aconcagua — una ladera nevada por jugador con carpas de refugio y la cumbre arriba.
import * as THREE from 'three';
import { plane, std, rowX, fitSpan } from './util.js';

const GAP = 2.8, H = 0.16; // porcentaje de subida -> altura en la escena

function makeTent() {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 4), std({ color: '#ef8a17' })); t.rotation.y = Math.PI / 4; t.position.y = 0.45; g.add(t);
  return g;
}

export default {
  camera: { pos: [0, 4, 15], look: [0, 4, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(90, 60, std({ color: '#e9eef4' })));
    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      // Ladera: una rampa blanca inclinada
      const slope = new THREE.Mesh(new THREE.BoxGeometry(2.2, 100 * H + 2, 0.5), std({ color: '#f7f9fc' }));
      slope.position.set(x, (100 * H + 2) / 2, -0.7); group.add(slope);
      for (const c of [20, 40, 60, 80]) { const t = makeTent(); t.position.set(x + 0.7, c * H, -0.35); t.rotation.x = Math.PI / 2 - 0.2; group.add(t); const ledge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.6), std({ color: '#9a8a7a' })); ledge.position.set(x, c * H - 0.1, -0.3); group.add(ledge); }
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), std({ color: '#74acdf', side: THREE.DoubleSide })); flag.position.set(x + 0.4, 100 * H + 2.4, -0.4); group.add(flag);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), std({ color: '#ddd' })); pole.position.set(x, 100 * H + 2, -0.4); group.add(pole);
      // Barrita de aire arriba del personaje
      const airBg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.18), new THREE.MeshBasicMaterial({ color: '#1b2a4a' })); group.add(airBg);
      const air = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.12), new THREE.MeshBasicMaterial({ color: '#5fb3ff' })); group.add(air);
      const g = ctx.addChar(p, x, 0, 0.8);
      slots.set(p.id, { x, g, air, airBg });
    });
    // Nieve de la avalancha
    const snow = new THREE.Group(); group.add(snow);
    for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 6, 5), std({ color: '#ffffff' })); b.position.set((Math.random() - 0.5) * n * GAP, Math.random() * 6, 0.3); snow.add(b); }
    snow.visible = false;
    return { slots, snow, camY: 4, aval: 'none' };
  },
  update(ctx, st, s, dt, time) {
    let maxY = 0, minY = Infinity;
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const y = e.h * H;
      sl.g.position.y += (y - sl.g.position.y) * Math.min(1, dt * 10);
      sl.g.position.x = sl.x; sl.g.position.z = 0;
      sl.g.rotation.y = Math.PI;
      sl.g.userData.body.rotation.z = e.slip ? Math.sin(time * 20) * 0.4 : Math.sin(time * 14) * 0.08;
      maxY = Math.max(maxY, y); minY = Math.min(minY, y);
      const top = sl.g.position.y + 2.2;
      sl.airBg.position.set(sl.x, top, 0.3); sl.air.position.set(sl.x - (1 - e.air) * 0.55, top, 0.31); sl.air.scale.x = Math.max(0.01, e.air);
      sl.air.material.color.set(e.air < 0.3 ? '#e14b3c' : '#5fb3ff');
      if (e.fin && !sl.won) { sl.won = true; ctx.burst(sl.g.position.clone().add(new THREE.Vector3(0, 1, 0)), 60, 5); }
    }
    if (s.aval !== st.aval) { st.aval = s.aval; if (s.aval === 'warn') ctx.sfx('horn'); if (s.aval === 'hit') ctx.sfx('swoosh'); }
    st.snow.visible = s.aval === 'hit';
    if (st.snow.visible) st.snow.children.forEach((b, i) => { b.position.y = st.camY + 4 - ((time * 12 + i * 0.7) % 10); });
    // Encuadra del más bajo al más alto: nadie queda afuera
    const f = fitSpan(st, minY, maxY + 2.5, dt, { base: 15, margin: 2.5, per: 0.85, minC: 4 });
    st.camY = f.c;
    ctx.setCamera([0, f.c + 1, 15 * f.z], [0, f.c, 0]);
  },
};
