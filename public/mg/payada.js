// Escena: La Payada — un escenario de peña con guitarras y un pizarrón donde aparece el verso.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX, canvasPlane } from './util.js';

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
    const back = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 0.3), std({ color: '#7a1f2b' })); back.position.set(0, 4, -3.5); group.add(back);
    const flagS = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.8), std({ color: '#74acdf', side: THREE.DoubleSide })); flagS.position.set(-6.5, 6, -3.3); group.add(flagS);
    const flagW = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.6), std({ color: '#ffffff', side: THREE.DoubleSide })); flagW.position.set(-6.5, 6, -3.28); group.add(flagW);
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
