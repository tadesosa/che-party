// Escena: ¿Peso o Dólar? — una casa de cambio con un cartel gigante donde aparecen los billetes.
import * as THREE from 'three';
import { makeHouse } from '../models.js';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane } from './util.js';

function drawBill(kind) {
  return (x, w, h) => {
    const green = kind !== 'peso';
    x.fillStyle = green ? '#cfe3c0' : '#d9c7e8'; x.fillRect(0, 0, w, h);
    x.strokeStyle = green ? '#2f6b34' : '#6a3d8f'; x.lineWidth = 14; x.strokeRect(10, 10, w - 20, h - 20);
    x.fillStyle = green ? '#2f6b34' : '#6a3d8f';
    x.font = `bold ${h * 0.22}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(green ? '100' : '1000', w * 0.17, h * 0.25); x.fillText(green ? '100' : '1000', w * 0.83, h * 0.75);
    x.font = `bold ${h * 0.13}px "Trebuchet MS", sans-serif`;
    x.fillText(green ? 'DÓLARES' : 'PESOS', w * 0.5, h * 0.85);
    // El retrato del medio: en el trucho es un payaso
    x.beginPath(); x.ellipse(w * 0.5, h * 0.45, h * 0.24, h * 0.28, 0, 0, 7); x.fillStyle = green ? '#9fc28a' : '#bda3d4'; x.fill();
    x.font = `${h * 0.36}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    x.fillText(kind === 'trucho' ? '🤡' : kind === 'peso' ? '🌞' : '🧔', w * 0.5, h * 0.47);
  };
}

export default {
  camera: { pos: [0, 4.8, 14], look: [0, 3, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(80, 40, std({ map: tex.baldosa([20, 10]) })));
    ['#f2c230', '#2f86e0', '#e14b3c', '#2e9e48'].forEach((c, i) => { const h = makeHouse(c, '#1b2a4a', 4, 5); h.position.set(-13 + i * 8.6, 0, -9); group.add(h); });
    // Cartel de la "casa de cambio"
    const board = new THREE.Mesh(new THREE.BoxGeometry(7.4, 4.2, 0.3), std({ color: '#1b2a4a' })); board.position.set(0, 4.4, -3); group.add(board);
    const title = canvasPlane(7.2, 0.8, (x, w, h) => {
      x.fillStyle = '#f6b40e'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#1b2a4a'; x.font = `bold ${h * 0.6}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CAMBIO · CAMBIO · CAMBIO', w / 2, h / 2 + 2);
    }, 512);
    title.position.set(0, 6.9, -2.8); group.add(title);
    for (const x of [-3.3, 3.3]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8), std({ color: '#1b2a4a' })); leg.position.set(x, 1.2, -3); group.add(leg); }
    const bills = {};
    for (const k of ['dolar', 'peso', 'trucho']) { const b = canvasPlane(6.4, 3.2, drawBill(k), 512); b.position.set(0, 4.4, -2.8); b.visible = false; group.add(b); bills[k] = b; }
    const spacing = Math.min(2.6, 13 / Math.max(1, n - 1));
    players.forEach((p, i) => { const g = ctx.addChar(p, rowX(i, n, spacing), 2.5); g.rotation.y = Math.PI; });
    return { bills, shownN: -1, pop: 0 };
  },
  update(ctx, st, s, dt, time) {
    const b = s.bill;
    for (const [k, m] of Object.entries(st.bills)) m.visible = !!b && b.kind === k;
    if (b && b.n !== st.shownN) { st.shownN = b.n; st.pop = 1; ctx.sfx('select'); }
    st.pop = Math.max(0, st.pop - dt * 4);
    if (b) st.bills[b.kind].scale.setScalar(1 + st.pop * 0.25);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      g.rotation.y = Math.PI;
      const body = g.userData.body;
      if (e.ok === true) { body.position.y = Math.abs(Math.sin(time * 14)) * 0.5; if (!g.userData.cashed) { g.userData.cashed = true; ctx.burst(g.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 20, 3); } }
      else if (e.ok === false) { body.position.y = 0; body.rotation.z = Math.sin(time * 18) * 0.15; }
      else { body.position.y *= 0.8; body.rotation.z *= 0.8; g.userData.cashed = false; }
    }
  },
};
