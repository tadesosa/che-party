// Escena: Las Barricas — una bodega con cinco barricas que ruedan para mezclarse. Una tiene el racimo dorado.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane } from './util.js';

const N = 5, GAP = 2.4;

function makeBarrel() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.6, 18), std({ map: tex.wood([3, 1]), color: '#9a6a3a' }));
  body.rotation.z = Math.PI / 2; body.position.y = 0.85; g.add(body);
  for (const x of [-0.55, 0.55]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.05, 6, 24), std({ color: '#3a3a3a' })); hoop.rotation.y = Math.PI / 2; hoop.position.set(x, 0.85, 0); g.add(hoop); }
  return g;
}
function makeGold() {
  const g = new THREE.Group();
  const m = std({ color: '#f2c230', metalness: 0.6, roughness: 0.25, emissive: '#7a5b00', emissiveIntensity: 0.4 });
  [[0, 0], [-0.15, -0.2], [0.15, -0.2], [0, -0.4], [-0.3, 0], [0.3, 0]].forEach(([x, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), m); b.position.set(x, y, 0); g.add(b); });
  return g;
}

export default {
  camera: { pos: [0, 6, 11], look: [0, 1, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(60, 40, std({ map: tex.cobble([20, 14]) })));
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 7, 0.4), std({ color: '#b9a585' })); wall.position.set(0, 3.5, -4); group.add(wall);
    // Arcos de la bodega
    for (let i = 0; i < 4; i++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.25, 6, 16, Math.PI), std({ color: '#8a7355' })); arch.position.set(-7.5 + i * 5, 3.5, -3.75); group.add(arch); }
    const barrels = [];
    for (let i = 0; i < N; i++) {
      const b = makeBarrel(); b.position.set(rowX(i, N, GAP), 0, 0); group.add(b); barrels.push(b);
      const num = canvasPlane(0.7, 0.7, (x, w, h) => { x.fillStyle = '#f4efe2'; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 4, 0, 7); x.fill(); x.fillStyle = '#1b2a4a'; x.font = `bold ${h * 0.6}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), w / 2, h / 2 + 2); }, 128);
      num.position.set(rowX(i, N, GAP), 0.3, 1.6); num.rotation.x = -0.6; group.add(num);
    }
    const gold = makeGold(); group.add(gold);
    players.forEach((p, i) => { const g = ctx.addChar(p, rowX(i, n, Math.min(2.2, 11 / Math.max(1, n - 1))), 3.4, 0.9); g.rotation.y = Math.PI; });
    return { barrels, gold };
  },
  update(ctx, st, s, dt, time) {
    if (!s.slots) return;
    // Posición de cada barrica: la de su lugar, o rodando hacia el otro en un cambio
    const target = new Map();
    s.slots.forEach((b, pos) => target.set(b, rowX(pos, N, GAP)));
    st.barrels.forEach((b, i) => {
      let x = target.get(i), z = 0;
      if (s.swap) {
        const [pa, pb] = s.swap.pair, ba = s.slots[pa], bb = s.slots[pb];
        if (i === ba || i === bb) {
          const from = rowX(i === ba ? pa : pb, N, GAP), to = rowX(i === ba ? pb : pa, N, GAP);
          x = from + (to - from) * s.swap.k; z = Math.sin(s.swap.k * Math.PI) * (i === ba ? 1.3 : -1.3);
          b.rotation.x = s.swap.k * Math.PI * 2 * (i === ba ? 1 : -1);
        }
      }
      b.position.x += (x - b.position.x) * Math.min(1, dt * 20); b.position.z = z;
    });
    // El racimo se ve al principio y al final, arriba de su barrica
    const show = s.phase === 'show' || s.phase === 'reveal';
    st.gold.visible = show && s.gold != null;
    if (st.gold.visible) { const b = st.barrels[s.gold]; st.gold.position.set(b.position.x, 2.4 + Math.sin(time * 4) * 0.1, 0); }
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      g.rotation.y = Math.PI;
      g.userData.body.position.y = s.phase === 'reveal' && e.pick === s.slots.indexOf(s.gold) ? Math.abs(Math.sin(time * 12)) * 0.3 : 0;
    }
  },
};
