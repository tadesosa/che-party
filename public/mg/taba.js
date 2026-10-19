// Escena: Tirá la Taba — cada uno en su carril de tierra, la taba vuela y cae de suerte, de costado o de culo.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, rowX, makeMeter, setNeedle, canvasPlane } from './util.js';

const GAP = 3;
const LAND = { suerte: 5.5, costado: 4.5, culo: 3 };

function makeTabaBone() {
  const g = new THREE.Group();
  const bone = std({ color: '#efe6cf', roughness: 0.6 });
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), bone); g.add(mid);
  for (const x of [-0.3, 0.3]) { const end = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), bone); end.position.x = x; g.add(end); }
  // La cara de "suerte" tiene una marca dorada
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.18), std({ color: '#c9a227', metalness: 0.6 })); mark.position.y = 0.135; g.add(mark);
  g.castShadow = true;
  return g;
}
const sign = (text, color) => canvasPlane(1.8, 0.6, (x, w, h) => {
  x.fillStyle = color; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 18); x.fill();
  x.fillStyle = '#fff'; x.font = `bold ${h * 0.5}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2);
});

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 6 + w * 0.2, 9 + w * 0.45], look: [0, 0.8, -3] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(90, 60, std({ map: tex.dryGrass([20, 14]) })));
    group.add(plane(n * GAP + 2, 9, std({ map: tex.dirt([n, 3]) }), { y: 0.01, z: -3 }));
    for (const [x, z] of [[-12, -10], [12, -10], [-7, -13], [8, -14]]) { const t = makeTree(false); t.position.set(x, 0, z); group.add(t); }
    // Línea de "suerte" al fondo
    group.add(plane(n * GAP + 2, 0.15, std({ color: '#ffffff' }), { y: 0.02, z: -LAND.suerte - 0.6 }));
    const signs = { suerte: sign('¡SUERTE!', '#2e9e48'), costado: sign('De costado', '#f2a23a'), culo: sign('¡De culo!', '#c0392b') };
    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const bone = makeTabaBone(); bone.scale.setScalar(1.7); bone.position.set(x + 0.4, 1.2, 0.5); group.add(bone);
      const meter = makeMeter([0.55, 0.85, 0.66, 0.76], 2.2); meter.position.set(x, 3.3, 1); group.add(meter);
      const lbl = {}; for (const [k, m] of Object.entries(signs)) { lbl[k] = m.clone(); lbl[k].visible = false; lbl[k].position.set(x, 1.8, -4); group.add(lbl[k]); }
      ctx.addChar(p, x, 1);
      slots.set(p.id, { x, bone, meter, lbl, fly: null, lastQ: null });
    });
    return { slots };
  },
  update(ctx, st, s, dt) {
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const g = ctx.chars.get(e.id);
      g.rotation.y = Math.PI;
      sl.meter.visible = e.v != null;
      if (e.v != null) {
        setNeedle(sl.meter, e.v, Math.min(1, dt * 25));
        if (!sl.fly) { sl.bone.position.set(sl.x + 0.4, 1.2, 0.5); sl.bone.rotation.set(0, 0, 0); }
        for (const l of Object.values(sl.lbl)) l.visible = false;
      }
      if (e.last && e.last !== sl.lastQ) {
        sl.lastQ = e.last;
        sl.fly = { t: 0, q: e.last, to: -LAND[e.last] };
        g.userData.body.rotation.x = -0.4;
        ctx.sfx('swoosh');
      }
      if (!e.last) sl.lastQ = null;
      if (sl.fly) {
        const f = sl.fly; f.t = Math.min(1, f.t + dt * 1.4);
        sl.bone.position.set(sl.x, 0.2 + Math.sin(f.t * Math.PI) * 3, 0.5 + (f.to - 0.5) * f.t);
        sl.bone.rotation.x = f.t * 12;
        g.userData.body.rotation.x *= 0.9;
        if (f.t >= 1) {
          // Cómo queda apoyada: de suerte (marca arriba), de costado o dada vuelta
          sl.bone.rotation.set(f.q === 'culo' ? Math.PI : f.q === 'costado' ? Math.PI / 2 : 0, 0, 0);
          sl.lbl[f.q].visible = true;
          if (f.q === 'suerte') ctx.burst(sl.bone.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 50, 4);
          ctx.sfx(f.q === 'culo' ? 'bonk' : 'good');
          sl.fly = null;
        }
      }
    }
  },
};
