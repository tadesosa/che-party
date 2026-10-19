// Escena: La Muzza Perfecta — una pizzería con una muzza por jugador y el cortapizza que va y viene.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, makeMeter, setNeedle } from './util.js';

const GAP = 3.2;

function makePizza() {
  const g = new THREE.Group();
  const crust = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.14, 32), std({ color: '#d99a4e' })); g.add(crust);
  const cheese = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.05, 32), std({ color: '#f6d36b', roughness: 0.5 })); cheese.position.y = 0.09; g.add(cheese);
  for (let i = 0; i < 6; i++) {
    const olive = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std({ color: '#2a5a2a' }));
    const a = i * 1.1, r = 0.3 + (i % 3) * 0.22; olive.position.set(Math.cos(a) * r, 0.13, Math.sin(a) * r); g.add(olive);
  }
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 6 + w * 0.2, 5 + w * 0.45], look: [0, 1.2, -0.3] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 50, std({ map: tex.baldosa([30, 20]) })));
    const counter = new THREE.Mesh(new THREE.BoxGeometry(n * GAP + 1, 1, 2.6), std({ color: '#f4efe2' })); counter.position.set(0, 0.5, 0); group.add(counter);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(n * GAP + 8, 6, 0.3), std({ color: '#2e7d4f' })); wall.position.set(0, 3, -3.5); group.add(wall);
    const oven = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#b5543a' })); oven.position.set(n * GAP / 2 + 2.5, 0, -2.2); group.add(oven);
    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const pizza = makePizza(); pizza.position.set(x, 1.08, 0.2); group.add(pizza);
      const knife = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 20), std({ color: '#d0d0d0', metalness: 0.8, roughness: 0.2 })); blade.rotation.z = Math.PI / 2; knife.add(blade);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.8), std({ color: '#c0392b' })); handle.position.z = 0.55; knife.add(handle);
      knife.position.set(x, 1.45, 0.2); group.add(knife);
      const cuts = new THREE.Group(); cuts.position.set(x, 1.22, 0.2); group.add(cuts);
      const meter = makeMeter([0.36, 0.64, 0.46, 0.54], 2.2); meter.position.set(x, 3.2, 0); group.add(meter);
      ctx.addChar(p, x, -1.6);
      slots.set(p.id, { x, knife, cuts, meter, n: 0 });
    });
    return { slots };
  },
  update(ctx, st, s, dt) {
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const g = ctx.chars.get(e.id); g.rotation.y = 0;
      sl.meter.visible = e.v != null;
      if (e.v != null) {
        setNeedle(sl.meter, e.v, Math.min(1, dt * 25));
        sl.knife.position.x = sl.x + (e.v - 0.5) * 2;
      }
      // Cada corte deja una raya sobre la pizza, más o menos centrada según cómo salió
      if (e.hist.length > sl.n) {
        const q = e.hist[e.hist.length - 1];
        const off = q === 'justa' ? 0 : q === 'bien' ? 0.15 : q === 'finita' ? -0.45 : 0.45;
        const cut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 2.1), new THREE.MeshBasicMaterial({ color: '#7a4a1e' }));
        cut.rotation.y = (sl.n * Math.PI) / 4; cut.position.x = off * Math.cos(cut.rotation.y); cut.position.z = -off * Math.sin(cut.rotation.y);
        sl.cuts.add(cut); sl.n = e.hist.length;
        ctx.sfx(q === 'justa' ? 'gold' : q === 'bien' ? 'good' : 'bad');
      }
    }
  },
};
