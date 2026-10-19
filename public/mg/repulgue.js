// Escena: Repulgue en Equipo — dos mesas de cocina (celeste y roja) con la empanada que se está cerrando
// (los pliegues aparecen de a uno) y una fuente donde se apilan las terminadas.
import * as THREE from 'three';
import { plane, std } from './util.js';
import { tex } from '../textures.js';

const TEAM = ['#5fb3ff', '#ff6b5e'];
const dough = new THREE.MeshPhysicalMaterial({ color: '#e8b56a', roughness: 0.6, clearcoat: 0.2 });
const baked = new THREE.MeshPhysicalMaterial({ color: '#c98a3a', roughness: 0.5, clearcoat: 0.3 });

function makeEmpanada(mat) {
  const g = new THREE.Group();
  // Media esfera aplastada: forma de D, con el borde curvo hacia adelante (ahí va el repulgue)
  const half = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 10, 0, Math.PI), mat); half.scale.set(1, 0.45, 1); g.add(half);
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20, 0, Math.PI), mat); base.rotation.x = Math.PI / 2; g.add(base);
  return g;
}

export default {
  camera: { pos: [0, 9, 11], look: [0, 1, 0] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(120, 90, std({ map: tex.baldosa([20, 15]), color: '#e8d8c0' })));
    // Pared de adobe con ristras de ajíes al fondo
    const wall = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 0.5), std({ color: '#d6a77a' })); wall.position.set(0, 4, -6); group.add(wall);
    for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 1.6, 6), std({ color: '#c0392b' })); r.position.set(-14 + i * 4, 5, -5.6); group.add(r); }
    const tables = [];
    for (let t = 0; t < 2; t++) {
      const x = t ? 5 : -5;
      const top = new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 3.4), std({ map: tex.wood([2, 1]), color: '#b08a5a' })); top.position.set(x, 1.4, 0); group.add(top);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), std({ color: '#6b4a2b' })); leg.position.set(x + sx * 2.7, 0.7, sz * 1.5); group.add(leg); }
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.05, 0.6), std({ color: TEAM[t] })); cloth.position.set(x, 1.55, 1.5); group.add(cloth);
      // Empanada que se arma: base + pliegues
      const emp = makeEmpanada(dough); emp.position.set(x - 0.9, 1.55, 0); emp.scale.setScalar(1.3); group.add(emp);
      const pleats = [];
      for (let k = 0; k < 8; k++) {
        const a = Math.PI * (0.06 + 0.88 * (k / 7));
        const p = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 6, 10, Math.PI), dough);
        p.position.set(x - 0.9 - Math.cos(a) * 0.9, 1.6, Math.sin(a) * 0.9); p.rotation.set(Math.PI / 2, 0, -a); p.visible = false; group.add(p); pleats.push(p);
      }
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 24), std({ color: '#c9ced4', metalness: 0.6 })); tray.position.set(x + 1.6, 1.57, 0); group.add(tray);
      tables.push({ x, emp, pleats, made: [], tray });
    }
    // Cocineros detrás de su mesa
    for (const p of players) ctx.addChar(p, 0, 0);
    return { tables, slots: new Map() };
  },
  update(ctx, st, s, dt, time) {
    s.made.forEach((n, t) => {
      const tb = st.tables[t];
      // Pliegues de la empanada en curso
      const k = Math.round(s.part[t] * 8);
      tb.pleats.forEach((p, i) => { p.visible = i < k; });
      // Empanadas terminadas, apiladas en la fuente
      while (tb.made.length < n) {
        const m = makeEmpanada(baked); const i = tb.made.length;
        m.position.set(tb.x + 1.6 + ((i % 3) - 1) * 0.55, 1.65 + Math.floor(i / 3) * 0.28, ((i % 2) - 0.5) * 0.4); m.rotation.y = i; ctx.group.add(m); tb.made.push(m);
        ctx.sfx('coin'); ctx.burst(m.position.clone(), 20, 3);
      }
    });
    const counts = [0, 0];
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      if (!st.slots.has(e.id)) st.slots.set(e.id, counts[e.team]);
      counts[e.team]++;
      const tb = st.tables[e.team], k = st.slots.get(e.id);
      const n = s.ents.filter((o) => o.team === e.team).length;
      // A los costados de la mesa (el tercero, atrás), para que se vean
      g.position.set(tb.x + (k % 2 ? 3.7 : -3.7), 0, k >= 2 ? -2.4 : 0.4);
      g.rotation.y = k >= 2 ? 0 : k % 2 ? -0.6 : 0.6;
      // El que hizo el último pliegue levanta las manos (el otro tiene que apretar)
      const tapAnim = e.taps !== (g.userData.lastTaps ?? e.taps);
      g.userData.lastTaps = e.taps;
      if (tapAnim) g.userData.pump = 1;
      g.userData.pump = Math.max(0, (g.userData.pump || 0) - dt * 6);
      g.userData.arms.forEach((a) => { a.rotation.x = -0.9 - g.userData.pump * 0.8; a.rotation.z = a.userData.side * 0.3; });
      g.userData.body.position.y = e.mine ? 0.15 : 0;
    }
  },
};
