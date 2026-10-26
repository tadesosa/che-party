// Escena: La Payada — un escenario de peña con guitarras y un pizarrón donde aparece el verso.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane, tbox } from './util.js';

function verseBoard(v) {
  return canvasPlane(8, 3.2, (x, w, h) => {
    x.fillStyle = '#2a3b2a'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#8a5a33'; x.lineWidth = 18; x.strokeRect(0, 0, w, h);
    x.fillStyle = '#f4f1e8'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `italic bold ${h * 0.13}px Georgia, serif`;
    x.fillText(v.a, w / 2, h * 0.22);
    x.fillText(v.b + ' …', w / 2, h * 0.42);
    const cw = w / 3;
    v.opts.forEach((o, i) => {
      const ok = v.right === i, shown = v.right != null;
      x.fillStyle = shown ? (ok ? '#2e9e48' : 'rgba(255,255,255,0.12)') : 'rgba(255,255,255,0.18)';
      x.beginPath(); x.roundRect(i * cw + 18, h * 0.6, cw - 36, h * 0.28, 18); x.fill();
      x.fillStyle = '#ffffff'; x.font = `bold ${h * 0.11}px "Trebuchet MS", sans-serif`;
      x.fillText(o, i * cw + cw / 2, h * 0.745);
    });
  }, 1024);
}
function makeGuitar() {
  const g = new THREE.Group();
  const wood = std({ color: '#b5763c' });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 20), wood); body.rotation.x = Math.PI / 2; g.add(body);
  const body2 = body.clone(); body2.scale.setScalar(0.8); body2.position.y = 0.4; g.add(body2);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.06), std({ color: '#4a2c17' })); neck.position.y = 0.95; g.add(neck);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), std({ color: '#222' })); hole.position.set(0, 0.2, 0.07); g.add(hole);
  return g;
}

export default {
  camera(n) { return { pos: [0, 4.6, 11 + n * 0.3], look: [0, 3, 0] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(60, 40, std({ map: tex.wood([14, 10]) })));
    const stage = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 6), std({ map: tex.wood([6, 2]) })); stage.position.set(0, 0.25, 0); group.add(stage);
    group.add(tbox(16.2, 0.12, 0.2, std({ map: tex.madera(), color: '#5a3a22' }), 1, { y: 0.48, z: 3 }));
    // Peña: pared de ladrillo con zócalo de madera, telones rojos, guirnalda de lamparitas y la bandera
    group.add(tbox(18, 8, 0.3, std({ map: tex.ladrillo(), color: '#e8c9b8' }), 1.2, { y: 4, z: -3.5 }));
    group.add(tbox(18, 1.6, 0.36, std({ map: tex.boiserie(), color: '#6b3a22', roughness: 0.6 }), 1.1, { y: 1.3, z: -3.5 }));
    const velvet = std({ color: '#8a1f2b', roughness: 0.75 }), foldGeo = new THREE.CylinderGeometry(0.28, 0.32, 8, 10);
    for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(foldGeo, velvet); f.position.set(sx * (8.6 - k * 0.42), 4, -3.15 + (k % 2) * 0.1); group.add(f); }
    group.add(tbox(18.4, 0.9, 0.5, velvet, 1, { y: 7.6, z: -3.05 }));
    const BULBS = ['#ffd27a', '#ff8a6a', '#fff2c2', '#9fd3ff'].map((c) => new THREE.Color(c));
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial(), 29), o = new THREE.Object3D();
    for (let i = 0; i <= 28; i++) { const t = i / 28; o.position.set(-7 + t * 14, 6.9 - Math.sin(t * Math.PI * 3) ** 2 * 0.45, -3.1); o.updateMatrix(); bulbs.setMatrixAt(i, o.matrix); bulbs.setColorAt(i, BULBS[i % 4]); }
    group.add(bulbs);
    const flag = canvasPlane(3, 1.8, (x, w, h) => {
      x.fillStyle = '#74acdf'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.fillRect(0, h / 3, w, h / 3);
      x.fillStyle = '#f6b40e'; x.beginPath(); x.arc(w / 2, h / 2, h * 0.1, 0, 7); x.fill();
      x.strokeStyle = '#f6b40e'; x.lineWidth = 3; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; x.beginPath(); x.moveTo(w / 2 + Math.cos(a) * h * 0.1, h / 2 + Math.sin(a) * h * 0.1); x.lineTo(w / 2 + Math.cos(a) * h * 0.16, h / 2 + Math.sin(a) * h * 0.16); x.stroke(); }
    }, 256);
    flag.material.transparent = false; flag.position.set(-5.6, 6, -3.3); group.add(flag);
    // Un poncho salteño colgado del otro lado
    const poncho = canvasPlane(2.2, 2.6, (x, w, h) => {
      x.fillStyle = '#9a1f24'; x.fillRect(0, 0, w, h); x.fillStyle = '#141414'; x.fillRect(0, h * 0.82, w, h * 0.1); x.fillRect(w * 0.1, 0, w * 0.05, h * 0.8); x.fillRect(w * 0.85, 0, w * 0.05, h * 0.8);
      x.fillStyle = '#e8d8b0'; for (let i = 0; i < 14; i++) x.fillRect(i * w / 14 + 3, h * 0.94, 3, h * 0.06);
    }, 256);
    poncho.material.transparent = false; poncho.position.set(5.8, 5.3, -3.3); group.add(poncho);
    const players3d = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, Math.min(2.6, 12 / Math.max(1, n - 1)));
      const g = ctx.addChar(p, x, 1.4); g.position.y = 0.5;
      const gt = makeGuitar(); gt.position.set(0.35, 0.9, 0.5); gt.rotation.z = -0.9; gt.scale.setScalar(0.8); g.add(gt);
      players3d.set(p.id, { g, x });
    });
    return { players3d, board: null, sig: '' };
  },
  update(ctx, st, s, dt, time) {
    const v = s.verse;
    const sig = v ? v.a + v.right : '';
    if (sig !== st.sig) {
      st.sig = sig;
      if (st.board) ctx.group.remove(st.board);
      st.board = null;
      if (v) { st.board = verseBoard(v); st.board.position.set(0, 4.6, -3.2); ctx.group.add(st.board); ctx.sfx(v.right != null ? 'gold' : 'select'); }
    }
    for (const e of s.ents) {
      const pl = st.players3d.get(e.id); if (!pl) continue;
      const g = pl.g;
      g.position.y = 0.5;
      g.rotation.y = 0;
      const body = g.userData.body;
      // Rasguea mientras piensa; festeja si acertó
      body.rotation.z = Math.sin(time * 8 + pl.x) * 0.05;
      body.position.y = e.ok === true ? Math.abs(Math.sin(time * 10)) * 0.3 : 0;
      if (e.ok === false) body.rotation.z = Math.sin(time * 20) * 0.12;
    }
  },
};
