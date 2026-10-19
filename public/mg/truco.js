// Escena: Truco Relámpago — una mesa de boliche con la carta del medio y la que tira cada uno.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane } from './util.js';

const SUITS = { e: '🗡️', b: '🪵', o: '🪙', c: '🏆' };
const SUIT_COLOR = { e: '#2f5fa8', b: '#2e7d32', o: '#c9a227', c: '#c0392b' };

function cardMesh(c, w = 1.1) {
  return canvasPlane(w, w * 1.5, (x, cw, ch) => {
    x.fillStyle = '#fffaf0'; x.beginPath(); x.roundRect(3, 3, cw - 6, ch - 6, 16); x.fill();
    x.strokeStyle = SUIT_COLOR[c.s]; x.lineWidth = 8; x.stroke();
    x.fillStyle = SUIT_COLOR[c.s]; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `bold ${ch * 0.2}px "Trebuchet MS", sans-serif`; x.fillText(String(c.n), cw * 0.22, ch * 0.14); x.fillText(String(c.n), cw * 0.78, ch * 0.86);
    x.font = `${ch * 0.32}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; x.fillText(SUITS[c.s], cw / 2, ch / 2);
  }, 192);
}
function backMesh(w = 1.1) {
  return canvasPlane(w, w * 1.5, (x, cw, ch) => {
    x.fillStyle = '#1b2a4a'; x.beginPath(); x.roundRect(3, 3, cw - 6, ch - 6, 16); x.fill();
    x.strokeStyle = '#f6b40e'; x.lineWidth = 6; x.strokeRect(18, 18, cw - 36, ch - 36);
    x.fillStyle = '#f6b40e'; x.font = `${ch * 0.25}px "Segoe UI Emoji", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🧉', cw / 2, ch / 2);
  }, 128);
}

export default {
  camera(n) { return { pos: [0, 8 + n * 0.4, 8 + n * 0.6], look: [0, 1, -0.5] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(60, 40, std({ map: tex.wood([12, 8]) })));
    // Mesa de paño verde
    const W = Math.max(8, n * 2.4 + 2);
    const table = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, 5), std({ color: '#1f6b3a', roughness: 0.95 })); table.position.set(0, 0.9, -0.5); group.add(table);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.25, 5.4), std({ map: tex.wood([4, 2]) })); rim.position.set(0, 0.78, -0.5); group.add(rim);
    const lamp = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.8, 16, 1, true), std({ color: '#2e9e48', side: THREE.DoubleSide })); lamp.position.set(0, 5.5, -0.5); group.add(lamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff5c2' })); bulb.position.set(0, 5.2, -0.5); group.add(bulb);
    const deck = backMesh(1.2); deck.rotation.x = -Math.PI / 2; deck.position.set(-W / 2 + 1.2, 1.07, -1.6); group.add(deck);
    const seats = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, 2.4);
      ctx.addChar(p, x, 2.6);
      seats.set(p.id, { x, card: null, key: '' });
    });
    return { seats, center: null, centerKey: '', W };
  },
  update(ctx, st, s, dt, time) {
    const key = s.center ? `${s.hand}-${s.center.n}${s.center.s}` : '';
    if (key !== st.centerKey) {
      st.centerKey = key;
      if (st.center) ctx.group.remove(st.center);
      st.center = null;
      if (s.center) { st.center = cardMesh(s.center, 1.6); st.center.rotation.x = -Math.PI / 3; st.center.position.set(0, 2.1, -1.4); ctx.group.add(st.center); st.pop = 1; ctx.sfx('select'); }
    }
    if (st.center) { st.pop = Math.max(0, (st.pop || 0) - dt * 3); st.center.scale.setScalar(1 + st.pop * 0.3); st.center.position.y = 2.1 + Math.sin(time * 2) * 0.05; }
    for (const e of s.ents) {
      const se = st.seats.get(e.id); if (!se) continue;
      const g = ctx.chars.get(e.id);
      g.rotation.y = Math.PI;
      const k = e.played ? `${s.hand}-${e.played.n}${e.played.s}` : '';
      if (k !== se.key) {
        se.key = k;
        if (se.card) ctx.group.remove(se.card);
        se.card = null;
        if (e.played) { se.card = cardMesh(e.played, 0.9); se.card.rotation.x = -Math.PI / 2; se.card.position.set(se.x, 1.3, 0.9); se.card.userData.t = 0; ctx.group.add(se.card); ctx.sfx('swoosh'); }
      }
      if (se.card) {
        se.card.userData.t = Math.min(1, se.card.userData.t + dt * 4);
        se.card.position.y = 1.07 + (1 - se.card.userData.t) * 0.8;
      }
      g.userData.body.position.y = e.res === 2 && s.phase !== 'play' ? Math.abs(Math.sin(time * 10)) * 0.3 : 0;
      g.userData.body.rotation.z = e.res === 0 && s.phase !== 'play' ? Math.sin(time * 6) * 0.1 : 0;
    }
  },
};
