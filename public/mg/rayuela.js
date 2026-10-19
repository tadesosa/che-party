// Escena: Rayuela — una rayuela pintada por jugador. Cada casillero es de un color (rojo, amarillo o azul)
// y es el botón de ese color el que hay que apretar. El color que sigue flota arriba de la cabeza.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane } from './util.js';

const GAP = 3.1, STEP = 2.3, Z0 = 9, TILE = 2.15;
const COLOR = { L: '#e14b3c', B: '#f6b40e', R: '#2f86e0' };
const SKY_Z = Z0 - 9.4 * STEP;

// Casillero lleno del color; el que sigue va con borde grueso y una flecha blanca
function tile(kind, n, state) {
  return canvasPlane(TILE, TILE, (x, w, h) => {
    x.globalAlpha = state === 'done' ? 0.25 : state === 'far' ? 0.75 : 1;
    x.fillStyle = COLOR[kind]; x.fillRect(0, 0, w, h);
    x.globalAlpha = 1;
    x.strokeStyle = state === 'hot' ? '#ffffff' : 'rgba(255,255,255,0.7)'; x.lineWidth = state === 'hot' ? 18 : 7;
    x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, w - x.lineWidth, h - x.lineWidth);
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = `bold ${h * 0.26}px "Trebuchet MS", sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), w / 2, h / 2 + 4);
  }, 128);
}

export default {
  // Desde bien arriba, para que se vean todos los casilleros de todos
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 24 + w * 0.35, Z0 + 6 + w * 0.12], look: [0, 0, -2.5] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(110, 80, std({ map: tex.grass([26, 18]) })));
    group.add(plane(n * GAP + 2, 28, std({ map: tex.asphalt([n * 2, 9]) }), { y: 0.01, z: -3 }));
    for (const [x, z] of [[-n * GAP / 2 - 4, -10], [n * GAP / 2 + 4, -10], [-n * GAP / 2 - 3, 4], [n * GAP / 2 + 3, 6]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    const lanes = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const sky = canvasPlane(2.4, 1.6, (c, w, h) => { c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 6, h / 2 - 6, 0, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 7; c.stroke(); c.fillStyle = '#fff'; c.font = `bold ${h * 0.3}px "Trebuchet MS", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CIELO', w / 2, h / 2); }, 128);
      sky.rotation.x = -Math.PI / 2; sky.position.set(x, 0.03, SKY_Z); group.add(sky);
      const tiles = new THREE.Group(); group.add(tiles);
      const g = ctx.addChar(p, x, Z0 + 1.6);
      // Bola del color que sigue, arriba de la cabeza
      const next = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: '#1b2a4a' }));
      next.add(rim); group.add(next);
      lanes.set(p.id, { x, g, tiles, next, sig: '', pos: -1, cur: Z0 + 1.6, color: CH[p.char].color });
    });
    return { lanes };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      const run = Math.min(e.run, s.runs - 1);
      const sig = `${run}-${e.pos}-${e.fin}`;
      if (sig !== l.sig) {
        // Se redibuja la rayuela de este jugador: lo pisado se apaga, el que sigue se marca
        l.sig = sig;
        while (l.tiles.children.length) l.tiles.remove(l.tiles.children[0]);
        if (!e.fin) s.seqs[run].forEach((kind, j) => {
          const state = j < e.pos ? 'done' : j === e.pos ? 'hot' : j > e.pos + 2 ? 'far' : 'near';
          const t = tile(kind, j + 1, state);
          t.rotation.x = -Math.PI / 2; t.position.set(l.x, 0.03 + (state === 'hot' ? 0.02 : 0), Z0 - j * STEP);
          if (state === 'hot') { t.scale.setScalar(1.12); l.hot = t; }
          l.tiles.add(t);
        });
        if (e.pos !== l.pos) { if (e.pos > l.pos || e.run > 0) ctx.sfx('step'); l.hop = 1; }
        l.pos = e.pos;
        const want = !e.fin && s.seqs[run][e.pos];
        l.next.visible = !!want;
        if (want) { l.next.material.color.set(COLOR[want]); l.pop = 1; }
      }
      if (l.hot && l.hot.parent) l.hot.scale.setScalar(1.08 + Math.sin(time * 8) * 0.05);
      const tz = e.fin ? SKY_Z : e.pos === 0 ? Z0 + 1.6 : Z0 - (e.pos - 1) * STEP;
      l.cur += (tz - l.cur) * Math.min(1, dt * 12);
      l.hop = Math.max(0, (l.hop || 0) - dt * 4);
      l.g.position.set(l.x, Math.sin(l.hop * Math.PI) * 0.8, l.cur);
      l.g.rotation.y = Math.PI;
      l.g.rotation.z = e.fall ? Math.sin(time * 20) * 0.3 : 0;
      l.pop = Math.max(0, (l.pop || 0) - dt * 3);
      l.next.position.set(l.x, l.g.position.y + 3.6 + Math.sin(time * 4) * 0.12, l.cur);
      l.next.scale.setScalar(1 + l.pop * 0.5);
    }
  },
};
