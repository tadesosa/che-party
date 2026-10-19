// Escena: Asado a Punto — una parrilla por jugador, con un medidor arriba.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeGrill, makeSteak } from '../props.js';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const GAP = 3.4;
const COLORS = { crudo: '#c0392b', bien: '#8a4b2a', perfecto: '#6b3a1e', quemado: '#1e1410' };

function makeMeter() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 0.08), new THREE.MeshBasicMaterial({ color: '#fff3d6' }));
  const good = new THREE.Mesh(new THREE.BoxGeometry(2.4 * 0.34, 0.33, 0.09), new THREE.MeshBasicMaterial({ color: '#7fd18c' }));
  const perf = new THREE.Mesh(new THREE.BoxGeometry(2.4 * 0.12, 0.34, 0.1), new THREE.MeshBasicMaterial({ color: '#2e9e48' }));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.46, 0.06), new THREE.MeshBasicMaterial({ color: '#1b2a4a' }));
  frame.position.z = -0.03;
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.12), new THREE.MeshBasicMaterial({ color: '#1b2a4a' }));
  g.add(frame, bg, good, perf, needle);
  g.userData.needle = needle;
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 6.5 + w * 0.2, 6 + w * 0.55], look: [0, 1.4, -0.6] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 50, std({ map: tex.grass([20, 12]) })));
    group.add(plane(n * GAP + 6, 7, std({ map: tex.baldosa([n * 2, 3]) }), { y: 0.01, z: 0 }));
    for (const x of [-n * GAP / 2 - 5, n * GAP / 2 + 5]) { const t = makeTree(x > 0); t.position.set(x, 0, -3); group.add(t); }
    // Mesa larga con mantel a cuadros de fondo
    const table = new THREE.Mesh(new THREE.BoxGeometry(n * GAP + 2, 0.15, 1.6), std({ color: '#e14b3c' }));
    table.position.set(0, 1.0, -4.5); group.add(table);
    const grills = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const grill = makeGrill(); grill.position.set(x, 0, 0); group.add(grill);
      const steak = makeSteak(); steak.position.set(x, 1.15, 0); group.add(steak);
      const meter = makeMeter(); meter.position.set(x, 3.6, 0); group.add(meter);
      ctx.addChar(p, x, -1.4);
      grills.set(p.id, { x, steak, meter, flip: 0, lastQ: null, smoke: [] });
    });
    return { grills };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const gr = st.grills.get(e.id); if (!gr) continue;
      const g = ctx.chars.get(e.id);
      g.rotation.y = 0;
      gr.meter.visible = e.v != null;
      if (e.v != null) {
        const nx = (e.v - 0.5) * 2.4;
        const nd = gr.meter.userData.needle;
        nd.position.x += (nx - nd.position.x) * Math.min(1, dt * 25);
      }
      // Vuelta y vuelta
      if (e.last && e.last !== gr.lastQ) {
        gr.lastQ = e.last; gr.flip = 1;
        gr.steak.userData.meat.color.set(COLORS[e.last]);
        if (e.last === 'quemado') ctx.sfx('bad');
      }
      if (!e.last) gr.lastQ = null;
      if (gr.flip > 0) {
        gr.flip = Math.max(0, gr.flip - dt * 2.2);
        gr.steak.position.y = 1.15 + Math.sin(gr.flip * Math.PI) * 1.2;
        gr.steak.rotation.x = (1 - gr.flip) * Math.PI * 2;
        g.userData.body.rotation.x = -Math.sin(gr.flip * Math.PI) * 0.3;
      } else if (e.v != null) {
        // Carne nueva: color crudo y chisporroteo
        gr.steak.userData.meat.color.lerp(new THREE.Color('#b5423a'), dt * 2);
        g.userData.body.position.y = Math.abs(Math.sin(time * 3 + gr.x)) * 0.05;
      }
      // Humo
      if (Math.random() < dt * 5) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), new THREE.MeshBasicMaterial({ color: '#d9d9d9', transparent: true, opacity: 0.6 }));
        puff.position.set(gr.x + (Math.random() - 0.5) * 1.2, 1.3, (Math.random() - 0.5) * 0.6);
        ctx.group.add(puff); gr.smoke.push({ m: puff, life: 1.6 });
      }
      for (let i = gr.smoke.length - 1; i >= 0; i--) {
        const sm = gr.smoke[i]; sm.life -= dt;
        sm.m.position.y += dt * 1.3; sm.m.scale.setScalar(1 + (1.6 - sm.life));
        sm.m.material.opacity = Math.max(0, sm.life / 2.6);
        if (sm.life <= 0) { ctx.group.remove(sm.m); gr.smoke.splice(i, 1); }
      }
    }
  },
};
