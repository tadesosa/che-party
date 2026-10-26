// Escena: Remate en la Feria — una tarima en la Feria de Mataderos con toldos a rayas y guirnaldas. El rematador
// muestra cada cosa en un pedestal; los jugadores, en fila adelante, levantan su cartel con la oferta cuando se revela.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, tbox, rowX, canvasPlane } from './util.js';

const GAP = 2.4;

function emojiTex(em) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.font = '200px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(em, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Cartel de texto que se puede volver a pintar
function board(w, h, px = 512) {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  m.userData.paint = (fn) => { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); fn(x, c.width, c.height); t.needsUpdate = true; };
  return m;
}

function makeStall(color, w = 3) {
  const g = new THREE.Group();
  g.add(tbox(w, 0.9, 1.1, std({ map: tex.madera(), color: '#9a6a3a' }), 1, { y: 0.45 }));
  for (const sx of [-1, 1]) g.add(tbox(0.08, 2.6, 0.08, std({ color: '#555' }), 1, { x: sx * w / 2, y: 1.3, z: 0.5 }));
  const c = document.createElement('canvas'); c.width = 128; c.height = 16;
  const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : color; x.fillRect(i * 16, 0, 16, 16); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.4, 1.4), std({ map: t, side: THREE.DoubleSide }));
  awn.position.set(0, 2.5, 0.2); awn.rotation.x = -1.1; g.add(awn);
  const goods = ['#c0392b', '#f2c230', '#2e7d4f', '#7a4a26', '#3d8bd9'];
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), std({ color: goods[(i * 3 + w * 7) % 5 | 0] })); b.position.set(-w / 2 + 0.5 + i * (w - 1) / 4, 1.05, 0); g.add(b); }
  return g;
}

export default {
  camera(n) { const w = Math.max(3, n) * GAP; return { pos: [0, 4.6 + w * 0.12, 8.5 + w * 0.4], look: [0, 2.1, -1.5] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(80, 50, std({ map: tex.cobble([16, 10]), color: '#b9ad9c' })));
    // Tarima de madera con telón y el cartel de la feria
    group.add(tbox(9, 0.7, 3.4, std({ map: tex.madera(), color: '#8a5530' }), 1, { y: 0.35, z: -3.4 }));
    group.add(tbox(9.4, 5.8, 0.2, std({ color: '#8e1f2b', roughness: 0.95 }), 1, { y: 3.6, z: -5.1 }));
    const sign = canvasPlane(7.5, 1.3, (x, w, h) => {
      x.fillStyle = '#f6d36b'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#8e1f2b'; x.lineWidth = 10; x.strokeRect(10, 10, w - 20, h - 20);
      x.fillStyle = '#8e1f2b'; x.font = `bold ${h * 0.34}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('FERIA DE MATADEROS · REMATE', w / 2, h / 2 + 2);
    }, 768);
    sign.material.transparent = false; sign.position.set(0, 5.75, -4.98); group.add(sign);
    // Pedestal con lo que se remata, y el cartelito con el precio estimado
    group.add(tbox(1.2, 1.1, 1.2, std({ map: tex.marmol(), color: '#eee' }), 1.2, { y: 1.25, z: -3.2 }));
    const item = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex('🎁'), transparent: true }));
    item.scale.setScalar(1.9); item.position.set(0, 2.85, -3.2); group.add(item);
    const est = board(4.2, 1.05); est.position.set(0, 4.15, -3.1); group.add(est);
    // El rematador con su martillo, a un costado del pedestal (uno de los personajes que no juega)
    const used = new Set(players.map((p) => p.char));
    const free = Object.keys(CH).filter((k) => !used.has(k));
    let auctioneer = null, hammer = null;
    if (free.length) {
      auctioneer = ctx.addChar({ id: '__rematador', name: 'Rematador', char: free[0] }, 2.6, -3.4);
      auctioneer.position.y = 0.7; auctioneer.rotation.y = -0.4;
      ctx.chars.delete('__rematador');
      group.add(tbox(0.9, 1.1, 0.6, std({ map: tex.madera(), color: '#6b3f22' }), 1, { x: 2.6, y: 1.25, z: -2.75 }));
      hammer = new THREE.Group();
      const hh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 10), std({ color: '#6b3f22' })); hh.rotation.z = Math.PI / 2; hh.position.y = 0.45; hammer.add(hh);
      const hs = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), std({ color: '#c8935a' })); hs.position.y = 0.2; hammer.add(hs);
      hammer.position.set(2.6, 1.8, -2.6); group.add(hammer);
    }
    // Puestos de la feria a los costados y guirnalda de banderines
    const SC = ['#c0392b', '#2e7d4f', '#1b3a6b', '#e08a1e'];
    for (let i = 0; i < 4; i++) { const st = makeStall(SC[i], 3); const s = i < 2 ? -1 : 1; st.position.set(s * (7.5 + (i % 2) * 3.6), 0, -3.5 + (i % 2) * 0.6); st.rotation.y = -s * 0.25; group.add(st); }
    const flags = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const f = new THREE.Mesh(new THREE.CircleGeometry(0.22, 3), new THREE.MeshBasicMaterial({ color: ['#74acdf', '#ffffff', '#f6b40e'][i % 3], side: THREE.DoubleSide }));
      f.position.set(-11 + i * 1.05, 7 - Math.sin(i / 21 * Math.PI) * 0.6, -2); f.rotation.z = -Math.PI / 2; flags.add(f);
    }
    group.add(flags);

    // Jugadores en fila adelante, con su cartel de oferta
    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const g = ctx.addChar(p, x, 1.4);
      // Cartel que tiene en las manos, adelante
      const paddle = board(1.3, 0.65, 256); paddle.position.set(x, 1.15, 2.05); paddle.visible = false; group.add(paddle);
      slots.set(p.id, { x, g, paddle, color: CH[p.char].color, sig: '' });
    });
    return { item, est, slots, hammer, auctioneer, lotSig: '', resSig: '', fly: null, bang: 0 };
  },
  update(ctx, st, s, dt, time) {
    // Cambio de lote: nueva cosa en el pedestal
    const l = s.lot;
    const lotSig = l ? l.name : '';
    if (lotSig !== st.lotSig) {
      st.lotSig = lotSig;
      if (l) {
        st.item.material.map = emojiTex(l.em); st.item.material.needsUpdate = true;
        st.item.position.set(0, 2.85, -3.2); st.item.scale.setScalar(0.1); st.fly = null;
        ctx.sfx('chest');
      }
      st.est.userData.paint((x, w, h) => {
        if (!l) return;
        x.fillStyle = 'rgba(16,20,38,.88)'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 26); x.fill();
        x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = `bold ${h * 0.3}px "Trebuchet MS", sans-serif`; x.fillText(l.name, w / 2, h * 0.32);
        x.fillStyle = '#ffc23d'; x.font = `bold ${h * 0.26}px "Trebuchet MS", sans-serif`; x.fillText(`Vale entre $${l.lo} y $${l.hi}`, w / 2, h * 0.7);
      });
    }
    if (st.item.scale.x < 1.9 && !st.fly) st.item.scale.setScalar(Math.min(1.9, st.item.scale.x + dt * 6));
    st.item.position.y = st.fly ? st.item.position.y : 2.85 + Math.sin(time * 2) * 0.08;
    st.item.visible = !!l;

    // Revelación: el rematador golpea, se ven las ofertas y la cosa vuela al que ganó
    const r = s.result;
    const resSig = r ? s.round + '' : '';
    if (resSig !== st.resSig) {
      st.resSig = resSig;
      if (r) {
        st.bang = 1; ctx.sfx('hit');
        const w = r.winner && st.slots.get(r.winner);
        if (w) st.fly = { from: st.item.position.clone(), to: new THREE.Vector3(w.x, 3.9, 1.4), t: 0 };
        const label = r.kind === 'trucho' ? `¡TRUCHO! Valía $${r.value}` : r.kind === 'joya' ? `¡UNA JOYA! Vale $${r.value}` : `Valía $${r.value}`;
        ctx.floatText(r.winner ? label : '¡Nadie ofertó!', new THREE.Vector3(0, 4.9, -2.6), r.kind === 'trucho' ? '#c0392b' : r.kind === 'joya' ? '#b8860b' : '#1d8a3a');
        if (r.kind === 'joya') ctx.burst(new THREE.Vector3(0, 3, -3), 60, 5);
      }
    }
    if (st.fly) {
      st.fly.t = Math.min(1, st.fly.t + dt * 1.4);
      const k = st.fly.t;
      st.item.position.lerpVectors(st.fly.from, st.fly.to, k); st.item.position.y += Math.sin(k * Math.PI) * 1.5;
      st.item.scale.setScalar(1.9 - k * 1.2);
    }
    st.bang = Math.max(0, st.bang - dt * 3);
    if (st.hammer) st.hammer.rotation.z = Math.sin(st.bang * Math.PI) * 1.2;
    if (st.auctioneer) st.auctioneer.userData.body.rotation.z = Math.sin(time * 3) * 0.05;

    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const g = sl.g; g.rotation.y = 0;
      // Cartel con la oferta: en secreto mientras ofertan ("🤫"), con el número cuando se revela
      const bid = r ? (r.bids.find((b) => b.id === e.id) || {}).v : null;
      const won = r && r.winner === e.id;
      const sig = r ? `${bid}|${won}` : e.done ? 'listo' : '';
      if (sig !== sl.sig) {
        sl.sig = sig;
        sl.paddle.visible = !!sig;
        sl.paddle.userData.paint((x, w, h) => {
          x.fillStyle = won ? '#ffc23d' : '#ffffff'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 22); x.fill();
          x.strokeStyle = sl.color; x.lineWidth = 10; x.stroke();
          x.fillStyle = '#1b2a4a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${h * 0.5}px "Trebuchet MS", sans-serif`;
          x.fillText(r ? `$${bid || 0}` : '🤫', w / 2, h / 2 + 3);
        });
        if (r) ctx.sfx(won ? 'coin' : 'select');
      }
      sl.paddle.position.y = 1.15 + (won ? Math.abs(Math.sin(time * 6)) * 0.35 : 0);
      g.userData.body.rotation.z = won ? Math.sin(time * 10) * 0.12 : 0;
    }
  },
};
