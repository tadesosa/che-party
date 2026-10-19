// Escena: Torre de Chocolate — una chocolatería de Bariloche con una torre de barras por jugador.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, fitSpan } from './util.js';
import { makeChalet } from '../decor2.js';

const GAP = 4.4, H = 0.42;
const COLORS = ['#5a2e14', '#7a4220', '#3e1e0c', '#8a5a34']; // negro, con leche, amargo, blanco tostado

// Textura de barra de chocolate (cuadraditos)
let barTex = null;
function chocoTex() {
  if (barTex) return barTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 32);
  x.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 8; i++) x.fillRect(i * 16, 0, 2, 32);
  x.fillRect(0, 15, 128, 2);
  barTex = new THREE.CanvasTexture(c); barTex.colorSpace = THREE.SRGBColorSpace; barTex.wrapS = THREE.RepeatWrapping;
  return barTex;
}
const mats = COLORS.map((c) => new THREE.MeshPhysicalMaterial({ color: c, map: chocoTex(), roughness: 0.35, clearcoat: 0.6 }));
function bar(w, k) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, 1.6), mats[k % mats.length]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5, 10 + w * 0.45], look: [0, 3, 0] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(120, 80, std({ map: tex.wood([20, 14]), color: '#c9a27a' })));
    // Fondo: la chocolatería de madera
    for (let i = -2; i <= 2; i++) { const c = makeChalet('#7a4a2b', '#5a2a18', 5, 4); c.position.set(i * 9, 0, -12); group.add(c); }
    const towers = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.5, 24), std({ color: CH[p.char].color })); base.position.set(x, 0.25, 0); group.add(base);
      const stack = new THREE.Group(); stack.position.set(x, 0.5, 0); group.add(stack);
      const moving = bar(2, 0); group.add(moving);
      const falling = bar(1, 1); falling.visible = false; group.add(falling);
      const g = ctx.addChar(p, x + 2, 1.2, 0.8);
      towers.set(p.id, { x, stack, moving, falling, g, count: 0 });
    });
    return { towers };
  },
  update(ctx, st, s, dt, time) {
    let lo = Infinity, hi = -Infinity;
    for (const e of s.ents) {
      const t = st.towers.get(e.id); if (!t) continue;
      // Agregar las barras nuevas (las de abajo no cambian)
      while (t.count < e.blocks.length) {
        const [bx, bw] = e.blocks[t.count];
        const m = bar(bw, t.count); m.position.set(bx, t.count * H + H / 2, 0); t.stack.add(m);
        if (t.count > 0) ctx.sfx('hit');
        t.count++;
      }
      const top = e.blocks.length * H + 0.5;
      t.moving.visible = !e.over;
      if (!e.over) {
        t.moving.scale.x = e.cur[1] / 2;
        t.moving.position.set(t.x + e.cur[0], top + H / 2 + 0.05, 0);
        t.moving.material = mats[e.blocks.length % mats.length];
      }
      // El pedacito que se cortó cae girando
      if (e.cut) {
        const [cx, cw, u] = e.cut;
        t.falling.visible = true; t.falling.scale.x = cw;
        t.falling.material = mats[(e.blocks.length - (e.over ? 0 : 1)) % mats.length];
        t.falling.position.set(t.x + cx + Math.sign(cx - (e.blocks[e.blocks.length - 1][0])) * u * 1.5, top - u * u * 9, 0);
        t.falling.rotation.z = u * 4 * Math.sign(cx || 1);
      } else t.falling.visible = false;
      // El chocolatero mira su torre y festeja cada tanto
      t.g.position.y = 0;
      t.g.rotation.y = -0.6;
      lo = Math.min(lo, top); hi = Math.max(hi, top);
    }
    const f = fitSpan(st, Math.max(0, lo - 2), hi + 1.5, dt, { base: 12, margin: 1.5, per: 0.85, minC: 3 });
    ctx.setCamera([0, f.c + 2, 10 + 12 * (f.z - 1) + st.towers.size * 2], [0, f.c, 0]);
  },
};
