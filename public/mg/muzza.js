// Escena: La Muzza Perfecta — una pizzería con una muzza por jugador y el cortapizza que va y viene.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, makeMeter, setNeedle, tbox, canvasPlane } from './util.js';

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
    group.add(plane(80, 50, std({ map: tex.marmol([40, 25]), color: '#d8d2c6' })));
    // Mostrador de madera con tapa de mármol
    const W = n * GAP + 1;
    group.add(tbox(W, 0.92, 2.5, std({ map: tex.boiserie(), color: '#8a5530', roughness: 0.6 }), 1.2, { y: 0.46 }));
    group.add(tbox(W + 0.2, 0.1, 2.7, std({ map: tex.granito(), color: '#f2efe8', roughness: 0.35 }), 1.5, { y: 0.97 }));
    // Pared de azulejos verdes y blancos, guarda y cartel
    const WW = n * GAP + 8;
    group.add(tbox(WW, 2.4, 0.3, std({ map: tex.azulejos(), color: '#7fbf95', roughness: 0.3 }), 1.2, { y: 1.2, z: -3.5 }));
    group.add(tbox(WW, 3.6, 0.3, std({ map: tex.revoque(), color: '#f1e6cc' }), 1.6, { y: 4.2, z: -3.5 }));
    group.add(tbox(WW + 0.1, 0.18, 0.4, std({ color: '#2e7d4f' }), 1, { y: 2.45, z: -3.45 }));
    const sign = canvasPlane(7, 1.3, (x, w, h) => {
      x.fillStyle = '#1f5a3a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#f6d36b'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20);
      x.fillStyle = '#f6d36b'; x.font = `bold ${h * 0.5}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('PIZZERÍA LA MUZZA', w / 2, h / 2 + 3);
    }, 512);
    sign.material.transparent = false; sign.position.set(0, 4.6, -3.33); group.add(sign);
    // Horno de barro y ladrillo con la boca encendida
    const ox = n * GAP / 2 + 2.6;
    const oven = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ map: tex.ladrillo([4, 2]), roughness: 0.9 }));
    oven.position.set(ox, 0.6, -2.2); group.add(oven);
    group.add(tbox(4.4, 0.6, 4.4, std({ map: tex.piedra(), color: '#e6dccb' }), 1, { x: ox, y: 0.3, z: -2.2 }));
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff9a3a' }));
    mouth.position.set(ox - 0.5, 0.62, -0.25); mouth.rotation.y = -0.25; group.add(mouth);
    // Estante con latas de tomate y botellas en la pared
    group.add(tbox(5, 0.08, 0.45, std({ map: tex.madera(), color: '#8a5530' }), 1, { x: -2, y: 3.1, z: -3.15 }));
    const CANS = ['#c0392b', '#2e7d4f', '#f2c230', '#c0392b', '#1b2a4a'];
    for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, i % 3 ? 0.36 : 0.6, 10), std({ color: CANS[i % 5], roughness: 0.4, metalness: 0.2 })); c.position.set(-4.1 + i * 0.5, 3.14 + (i % 3 ? 0.18 : 0.3), -3.15); group.add(c); }
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
