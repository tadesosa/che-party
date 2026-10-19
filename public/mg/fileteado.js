// Escena: Fileteado Porteño — un cartel negro por jugador donde el pincel sigue la línea dorada del filete.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std } from './util.js';

const W = 16, ROW = 2.6;

export default {
  camera(n) { const h = Math.max(2, n) * ROW; return { pos: [0, 6 + h * 0.9, 4 + h * 0.35], look: [0, 0, -0.2] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(80, 60, std({ map: tex.wood([16, 12]) })));
    const rows = new Map();
    players.forEach((p, i) => {
      const z = (i - (n - 1) / 2) * ROW;
      // El cartel: un canvas que se va pintando
      const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
      const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
      const board = plane(W, ROW * 0.9, new THREE.MeshBasicMaterial({ map: texture }), { y: 0.05, z });
      group.add(board);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.08, ROW * 0.9 + 0.3), std({ color: '#c9a227', metalness: 0.5 })); frame.position.set(0, 0.0, z); group.add(frame);
      const g = ctx.addChar(p, -W / 2 - 1.4, z, 0.8);
      g.rotation.y = Math.PI / 2;
      const brush = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), std({ color: '#8a5a33' })); handle.position.y = 0.6; brush.add(handle);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 8), std({ color: CH[p.char].color })); tip.rotation.x = Math.PI; tip.position.y = 0.1; brush.add(tip);
      group.add(brush);
      rows.set(p.id, { z, c, texture, brush, sig: '' });
    });
    return { rows };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const r = st.rows.get(e.id); if (!r) continue;
      const sig = `${s.stroke}-${e.trail.length}-${s.phase}`;
      if (sig !== r.sig) {
        r.sig = sig;
        const x = r.c.getContext('2d'), cw = r.c.width, ch = r.c.height;
        const toX = (v) => (v / s.len) * cw, toY = (z) => ch / 2 + (z / 2.2) * (ch / 2);
        x.fillStyle = '#141414'; x.fillRect(0, 0, cw, ch);
        if (s.line) {
          // La guía: la línea del filete (ancho = tolerancia)
          x.strokeStyle = 'rgba(201,162,39,0.35)'; x.lineWidth = (s.tol / 2.2) * ch; x.lineCap = 'round'; x.beginPath();
          s.line.forEach((z, i) => { const px = (i / (s.line.length - 1)) * cw; i ? x.lineTo(px, toY(z)) : x.moveTo(px, toY(z)); }); x.stroke();
          x.strokeStyle = '#e8c547'; x.lineWidth = 3; x.stroke();
          // Lo que pintó el jugador
          x.strokeStyle = '#ffffff'; x.lineWidth = 7; x.beginPath();
          e.trail.forEach(([tx, tz], i) => (i ? x.lineTo(toX(tx), toY(tz)) : x.moveTo(toX(tx), toY(tz)))); x.stroke();
        }
        r.texture.needsUpdate = true;
      }
      const bx = -W / 2 + Math.min(s.x, s.len) / s.len * W;
      r.brush.visible = s.phase === 'paint';
      r.brush.position.set(bx, 0.1, r.z + (e.z / 2.2) * (ROW * 0.45));
      r.brush.rotation.z = Math.sin(time * 10) * 0.1;
    }
  },
};
