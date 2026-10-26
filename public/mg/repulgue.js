// Escena: Repulgue en Equipo — dos mesas de cocina (celeste y roja) con la empanada que se está cerrando
// (los pliegues aparecen de a uno) y una fuente donde se apilan las terminadas.
import * as THREE from 'three';
import { plane, std, tbox, canvasPlane } from './util.js';
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
    group.add(plane(120, 90, std({ map: tex.baldosa([20, 15]), color: '#d99a6e' })));
    // Cocina del norte: pared de adobe con vigas, una ventanita, estantes con vasijas y ristras de ajíes
    group.add(tbox(40, 8, 0.5, std({ map: tex.adobe(), color: '#d6a77a' }), 1.6, { y: 4, z: -6 }));
    group.add(tbox(40, 0.9, 0.55, std({ map: tex.azulejos(), color: '#7fa8c9', roughness: 0.35 }), 0.9, { y: 2.2, z: -5.95 }));
    const beam = std({ map: tex.madera(), color: '#6b4a2b' });
    for (let x = -18; x <= 18; x += 3) group.add(tbox(0.25, 0.25, 1.4, beam, 1, { x, y: 7.2, z: -5.2 }));
    group.add(tbox(40, 0.3, 0.3, beam, 1, { y: 7.45, z: -5.6 }));
    const win = canvasPlane(1.8, 1.6, (x, w, h) => {
      x.fillStyle = '#6b4a2b'; x.fillRect(0, 0, w, h);
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fc6ee'); g.addColorStop(1, '#d9eefa'); x.fillStyle = g; x.fillRect(16, 16, w - 32, h - 32);
      x.fillStyle = '#c96a3a'; x.beginPath(); x.moveTo(16, h - 16); x.lineTo(w * 0.4, h * 0.45); x.lineTo(w * 0.7, h * 0.7); x.lineTo(w - 16, h * 0.5); x.lineTo(w - 16, h - 16); x.fill(); // los cerros de afuera
      x.fillStyle = '#6b4a2b'; x.fillRect(w / 2 - 6, 0, 12, h); x.fillRect(0, h / 2 - 6, w, 12);
    }, 256);
    win.material.transparent = false; win.position.set(0, 4.6, -5.74); group.add(win);
    const shelf = std({ map: tex.madera(), color: '#7a4a2b' }), clay = std({ color: '#b5603a', roughness: 0.75 }), clay2 = std({ color: '#d98a50', roughness: 0.75 });
    for (const sx of [-1, 1]) {
      group.add(tbox(4.5, 0.12, 0.6, shelf, 1, { x: sx * 9, y: 4.2, z: -5.45 }));
      for (let k = 0; k < 4; k++) {
        const pot = new THREE.Mesh(new THREE.SphereGeometry(0.32 + (k % 2) * 0.1, 12, 10), k % 2 ? clay : clay2); pot.scale.y = 1.1;
        pot.position.set(sx * 9 - 1.6 + k * 1.05, 4.6 + (k % 2) * 0.08, -5.45); group.add(pot);
      }
    }
    const aji = std({ color: '#c0392b', roughness: 0.45 }), ajiGeo = new THREE.SphereGeometry(0.11, 8, 6);
    const ajis = new THREE.InstancedMesh(ajiGeo, aji, 7 * 9), o = new THREE.Object3D(); // una sola pieza para todos
    let n = 0;
    for (let i = 0; i < 8; i++) {
      if (Math.abs(-14 + i * 4) < 2) continue;
      for (let k = 0; k < 9; k++) { o.scale.set(0.8, 1.6, 0.8); o.position.set(-14 + i * 4 + Math.sin(k * 2.4) * 0.12, 6.4 - k * 0.2, -5.6 + Math.cos(k * 2.4) * 0.1); o.updateMatrix(); ajis.setMatrixAt(n++, o.matrix); }
    }
    ajis.castShadow = true; group.add(ajis);
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
