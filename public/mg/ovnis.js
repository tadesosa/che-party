// Escena: Cazadores de Ovnis — de noche en las Sierras, cuatro cerros de colores (como los botones del celu)
// y un ovni (o un avión, o un cóndor) que aparece arriba de uno.
import * as THREE from 'three';
import { plane, std, rowX } from './util.js';
import { makeUfo } from '../decor2.js';

// Los cerros quedan como los botones del celu: arriba rojo y amarillo, abajo verde y azul
const POS = { r: [-6, -9], y: [6, -9], g: [-6, -1], b: [6, -1] };

function makePlane() {
  const g = new THREE.Group();
  const white = std({ color: '#e8eef2' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 2.4, 6, 10), white); body.rotation.z = Math.PI / 2; g.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 3.4), white); g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.08), white); tail.position.set(-1.4, 0.4, 0); g.add(tail);
  for (const z of [-1.6, 1.6]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), new THREE.MeshBasicMaterial({ color: z > 0 ? '#2ecc5a' : '#e14b3c' })); l.position.set(0, 0, z); g.add(l); }
  return g;
}
function makeCondor() {
  const g = new THREE.Group();
  const black = std({ color: '#1b1b1b' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.7, 4, 8), black); body.rotation.z = Math.PI / 2; g.add(body);
  const ruff = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 6, 12), std({ color: '#ffffff' })); ruff.rotation.y = Math.PI / 2; ruff.position.x = 0.45; g.add(ruff);
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 1.8), black); w.position.z = s * 0.95; g.add(w); wings.push(w); }
  g.userData.wings = wings;
  return g;
}

export default {
  camera: { pos: [0, 14, 21], look: [0, 2, -4] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    // Noche: una cúpula oscura con estrellas
    const dome = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), new THREE.MeshBasicMaterial({ color: '#0b1430', side: THREE.BackSide, fog: false }));
    group.add(dome);
    const starGeo = new THREE.BufferGeometry(); const pts = [];
    for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.2 + 0.1, r = 85; pts.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r); }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.6, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff6d6', fog: false })); moon.position.set(-30, 34, -60); group.add(moon);
    group.add(plane(140, 90, std({ color: '#1f3322' })));
    const glow = new THREE.PointLight('#9fd8ff', 40, 60); glow.position.set(0, 14, 4); group.add(glow);
    const hills = {};
    for (const h of s0hills()) {
      const [x, z] = POS[h.id];
      const hill = new THREE.Mesh(new THREE.SphereGeometry(2.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: h.color, flatShading: true, emissive: h.color, emissiveIntensity: 0.25 }));
      hill.scale.y = 0.7; hill.position.set(x, 0, z); group.add(hill);
      hills[h.id] = hill;
    }
    const ufo = makeUfo(); ufo.visible = false; group.add(ufo);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#b6ffcf', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = -3; ufo.add(beam);
    const avion = makePlane(); avion.visible = false; group.add(avion);
    const condor = makeCondor(); condor.visible = false; group.add(condor);
    // Los fotógrafos, adelante, mirando a los cerros
    players.forEach((p, i) => { const g = ctx.addChar(p, rowX(i, n, 2.4), 7); g.rotation.y = Math.PI; });
    return { hills, ufo, avion, condor, shownId: 0, flash: 0 };
  },
  update(ctx, st, s, dt, time) {
    const sg = s.sight;
    for (const o of [st.ufo, st.avion, st.condor]) o.visible = false;
    if (sg && !sg.gone) {
      const [x, z] = POS[sg.hill];
      const o = sg.fake === 'avion' ? st.avion : sg.fake === 'condor' ? st.condor : st.ufo;
      o.visible = true;
      const u = sg.u;
      if (o === st.ufo) { o.position.set(x + Math.sin(time * 3) * 0.3, 7.5 - Math.sin(Math.min(1, u * 3) * Math.PI / 2) * 1.5, z); o.rotation.y += dt * 4; }
      else { o.position.set(x - 6 + u * 12, 7 + Math.sin(time * 2) * 0.3, z); o.rotation.y = 0; if (o.userData.wings) o.userData.wings.forEach((w, k) => { w.rotation.x = Math.sin(time * 6) * 0.4 * (k ? 1 : -1); }); }
      if (sg.id !== st.shownId) { st.shownId = sg.id; ctx.sfx(sg.fake ? 'swoosh' : 'ufo'); }
      // Flash de la cámara cuando alguien saca la foto
      if (sg.got.length !== st.lastGot) { st.lastGot = sg.got.length; if (sg.got.length) { st.flash = 1; ctx.sfx('pop'); } }
    } else st.lastGot = 0;
    st.flash = Math.max(0, st.flash - dt * 4);
    for (const [id, h] of Object.entries(st.hills)) h.material.emissiveIntensity = 0.25 + (sg && !sg.gone && sg.hill === id ? 0.35 + Math.sin(time * 10) * 0.1 : 0) + st.flash * 0.6;
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      g.rotation.z = e.lock ? Math.sin(time * 20) * 0.2 : 0;
    }
  },
};

// Colores de los cerros (iguales a los botones)
function s0hills() {
  return [{ id: 'r', color: '#e14b3c' }, { id: 'y', color: '#f6b40e' }, { id: 'g', color: '#2e9e48' }, { id: 'b', color: '#2f86e0' }];
}
