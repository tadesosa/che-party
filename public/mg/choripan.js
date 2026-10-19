// Escena: Choripán al Paso — un puesto de choris por jugador, con el pedido del cliente arriba.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeGrill } from '../props.js';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane } from './util.js';

const GAP = 3.4;
const EMO = { pan: '🥖', chori: '🌭', chimi: '🌿', criolla: '🍅' };
const COL = { pan: '#e6b46a', chori: '#a8402a', chimi: '#3f8f3a', criolla: '#d84a3a' };

function orderSign(order, pos) {
  return canvasPlane(2.8, 0.9, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 20); x.fill();
    x.strokeStyle = '#1b2a4a'; x.lineWidth = 6; x.stroke();
    const cw = (w - 30) / order.length;
    x.font = `${h * 0.55}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    order.forEach((k, i) => {
      x.globalAlpha = i < pos ? 0.25 : 1;
      if (i === pos) { x.fillStyle = '#f6b40e'; x.fillRect(15 + i * cw + 4, 12, cw - 8, h - 24); }
      x.fillText(EMO[k], 15 + (i + 0.5) * cw, h / 2 + 4);
    });
    x.globalAlpha = 1;
  }, 384);
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5 + w * 0.18, 6 + w * 0.5], look: [0, 2, -0.5] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 50, std({ map: tex.grass([20, 12]) })));
    group.add(plane(n * GAP + 4, 6, std({ map: tex.cobble([n * 2, 3]) }), { y: 0.01 }));
    for (const x of [-n * GAP / 2 - 4, n * GAP / 2 + 4]) { const t = makeTree(x > 0); t.position.set(x, 0, -3); group.add(t); }
    const stands = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const grill = makeGrill(); grill.position.set(x, 0, 0.4); group.add(grill);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.8), std({ color: i % 2 ? '#e14b3c' : '#2f86e0' })); roof.position.set(x, 3.4, 0.3); group.add(roof);
      for (const dx of [-1.2, 1.2]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), std({ color: '#ddd' })); pole.position.set(x + dx, 1.7, -0.5); group.add(pole); }
      ctx.addChar(p, x, -0.9);
      // El sánguche que se va armando sobre la parrilla
      const sand = new THREE.Group(); sand.position.set(x, 1.25, 0.9); group.add(sand);
      stands.set(p.id, { x, sand, sign: null, sig: '', sold: 0 });
    });
    return { stands };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const sd = st.stands.get(e.id); if (!sd) continue;
      const g = ctx.chars.get(e.id); g.rotation.y = 0;
      const sig = e.order.join() + e.pos + e.sold;
      if (sig !== sd.sig) {
        sd.sig = sig;
        if (sd.sign) ctx.group.remove(sd.sign);
        sd.sign = orderSign(e.order, e.pos); sd.sign.position.set(sd.x, 4.3, 0.3); ctx.group.add(sd.sign);
        while (sd.sand.children.length) sd.sand.remove(sd.sand.children[0]);
        e.order.slice(0, e.pos).forEach((k, i) => {
          const m = new THREE.Mesh(k === 'chori' ? new THREE.CapsuleGeometry(0.12, 0.7, 4, 8) : new THREE.BoxGeometry(k === 'pan' ? 1 : 0.8, 0.12, 0.3), std({ color: COL[k] }));
          if (k === 'chori') m.rotation.z = Math.PI / 2;
          m.position.y = i * 0.13; sd.sand.add(m);
        });
        if (e.sold > sd.sold) { sd.sold = e.sold; ctx.burst(new THREE.Vector3(sd.x, 2, 0.9), 25, 3); ctx.sfx('coin'); }
        else if (e.pos > 0) ctx.sfx('select');
      }
      if (e.drop && !sd.dropShown) { sd.dropShown = true; ctx.sfx('bad'); }
      if (!e.drop) sd.dropShown = false;
      g.userData.body.rotation.x = Math.sin(time * 9 + sd.x) * 0.06;
    }
  },
};
