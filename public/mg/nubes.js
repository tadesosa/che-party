// Escena: Equilibrio en el Tren a las Nubes — los vagones rojos del tren sobre el viaducto, entre nubes,
// con cada jugador parado en el techo de su vagón haciendo equilibrio con una bandeja de empanadas.
import * as THREE from 'three';
import { std, rowX } from './util.js';
import { makeSevenColors } from '../decor2.js';
import { makeCloud } from '../props.js';

const GAP = 4.4;

function makeWagon(first) {
  const g = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: first ? '#c0392b' : '#e8e2d2', roughness: 0.4, clearcoat: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.8, 1.8), red); body.position.y = 1.4; g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.2, 1.9), std({ color: '#c0392b' })); roof.position.y = 2.4; g.add(roof);
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.5), std({ color: '#1b2a4a' })); w.position.set(-1.35 + i * 0.9, 1.6, 0.91); g.add(w); }
  for (const x of [-1.2, 1.2]) for (const z of [-0.7, 0.7]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 12), std({ color: '#222' })); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.35, z); g.add(wh); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function makeTray() {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 20), std({ color: '#c9ced4', metalness: 0.7, roughness: 0.3 })); g.add(tray);
  const dough = std({ color: '#e0a85a' });
  for (let i = 0; i < 5; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), dough); e.scale.set(1.3, 0.8, 0.8); const a = (i / 5) * Math.PI * 2; e.position.set(Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32); e.rotation.y = a; g.add(e); }
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 6.5, 8 + w * 0.5], look: [0, 3.2, 0] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    // El viaducto: vigas de acero cruzadas abajo, en el aire
    const steel = std({ color: '#7a7a7a', metalness: 0.6 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(n * GAP + 16, 0.4, 2.6), steel); deck.position.y = 0; group.add(deck);
    for (let x = -n * GAP / 2 - 8; x <= n * GAP / 2 + 8; x += 4) {
      for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 14, 0.25), steel); b.position.set(x, -7, 0); b.rotation.z = sx * 0.28; group.add(b); }
    }
    // Nubes y cerros de colores abajo, a lo lejos
    for (let i = 0; i < 14; i++) { const c = makeCloud(); c.scale.setScalar(2 + Math.random() * 2); c.position.set(-40 + i * 6, -4 + Math.random() * 3, -6 - Math.random() * 18); group.add(c); }
    for (const [x, z] of [[-30, -45], [0, -55], [30, -45]]) { const m = makeSevenColors(14, 20); m.position.set(x, -14, z); group.add(m); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), std({ color: '#c9946a' })); floor.rotation.x = -Math.PI / 2; floor.position.y = -14; group.add(floor);
    const train = new THREE.Group(); group.add(train);
    const lanes = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const w = makeWagon(i === 0); w.position.x = x; train.add(w);
      const g = ctx.addChar(p, x, 0, 0.9);
      const tray = makeTray(); group.add(tray);
      lanes.set(p.id, { x, g, tray, drop: 0 });
    });
    return { lanes, train };
  },
  update(ctx, st, s, dt, time) {
    // El tren se sacude un poco
    st.train.rotation.z = s.sway * 0.4;
    st.train.position.y = Math.abs(Math.sin(time * 9)) * 0.03;
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      const g = l.g;
      g.position.set(l.x, 2.5 + st.train.position.y, 0);
      // El cuerpo se inclina con la bandeja; la bandeja va arriba de la cabeza con su inclinación
      g.rotation.z = -e.th * 0.35 + s.sway * 0.4;
      g.userData.arms.forEach((a) => { a.rotation.z = a.userData.side * 2.9; a.rotation.x = 0; });
      const top = (g.userData.top || 1.8) * 0.9 + 2.5 + 0.35;
      if (e.fallen) {
        l.drop = Math.min(1, l.drop + dt * 2);
        l.tray.position.set(l.x + Math.sign(e.th || 1) * l.drop * 2.5, top - l.drop * l.drop * 6, 0.3);
        l.tray.rotation.z += dt * 10;
        if (!l.fallShown) { l.fallShown = true; ctx.sfx('lose'); }
      } else {
        l.drop = 0; l.fallShown = false;
        l.tray.position.set(l.x - Math.sin(e.th) * 0.4, top, 0.3);
        l.tray.rotation.set(0, 0, -e.th);
        // Verde si está derechita, rojo si está por caerse
        l.tray.children[0].material.color.set(Math.abs(e.th) < s.good ? '#9ad9a8' : Math.abs(e.th) > 0.7 ? '#e88a80' : '#c9ced4');
      }
    }
  },
};
