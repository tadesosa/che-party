// Escena: Dibujito en el Pizarrón — un aula de escuela: pizarrón verde con lo que dibuja el de turno en tiza,
// las seis opciones al costado, la bandera, el reloj y los pupitres a los dos lados.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { makeFlag } from '../models.js';
import { plane, std, tbox, canvasPlane, follow, face, walkAnim, speedOf } from './util.js';

const BW = 8.4, BH = 4.8;                // tamaño del pizarrón en la escena
const CW = 1400, CH_ = 800;           // tamaño del lienzo
const DX = 30, DY = 30, DW = 1000, DH = 750; // zona del dibujo (4:3)

function chalkLine(x, pts, w, color) {
  x.strokeStyle = color; x.lineWidth = w; x.lineCap = x.lineJoin = 'round';
  x.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const px = DX + pts[i] / 1000 * DW, py = DY + pts[i + 1] / 1000 * DH;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  if (pts.length === 2) x.lineTo(DX + pts[0] / 1000 * DW + 0.5, DY + pts[1] / 1000 * DH);
  x.stroke();
}

function paintBoard(st, s, names) {
  const x = st.bx;
  x.fillStyle = '#2d4a39'; x.fillRect(0, 0, CW, CH_);
  // Manchas de tiza borrada
  for (const m of st.smudges) { x.fillStyle = `rgba(255,255,255,${m.a})`; x.beginPath(); x.ellipse(m.x, m.y, m.rx, m.ry, m.r, 0, 7); x.fill(); }
  x.setLineDash([12, 14]); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 3; x.strokeRect(DX, DY, DW, DH); x.setLineDash([]);
  // El dibujo con tiza: una pasada fuerte y otra corrida, finita, para que tenga textura
  for (const pts of st.ink) {
    chalkLine(x, pts, 10, 'rgba(244,244,232,.92)');
    const off = pts.map((v, i) => v + (i % 2 ? 2 : -2));
    chalkLine(x, off, 4, 'rgba(255,255,255,.35)');
  }
  // Columna de la derecha: quién dibuja y las opciones
  const cx = DX + DW + 30, cw = CW - cx - 20;
  x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = 'rgba(244,244,232,.9)';
  x.font = 'bold 40px "Comic Sans MS", "Trebuchet MS", sans-serif';
  const dn = names[s.drawer] || '';
  if (s.phase === 'over') x.fillText('¡Fin!', cx, 40);
  else {
    x.fillText(`Ronda ${s.round + 1}/${s.rounds}`, cx, 36);
    x.fillStyle = '#ffd86b'; x.fillText(`Dibuja: ${dn}`.slice(0, 16), cx, 84);
  }
  if (s.opts) {
    x.fillStyle = 'rgba(244,244,232,.9)'; x.font = 'bold 30px "Comic Sans MS", "Trebuchet MS", sans-serif';
    x.fillText('¿Qué es?', cx, 150);
    s.opts.forEach((o, i) => {
      const y = 200 + i * 92;
      const right = s.word && o === s.word;
      x.fillStyle = right ? '#ffd86b' : s.word ? 'rgba(244,244,232,.35)' : 'rgba(244,244,232,.92)';
      x.font = `bold ${o.length > 9 ? 34 : 44}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
      x.fillText(`${i + 1}. ${o}`, cx, y);
      if (right) { x.strokeStyle = '#ffd86b'; x.lineWidth = 5; x.beginPath(); x.ellipse(cx + cw / 2 - 8, y + 22, cw / 2 + 4, 40, -0.04, 0, 7); x.stroke(); }
    });
  } else if (s.phase === 'show') {
    x.fillStyle = 'rgba(244,244,232,.6)'; x.font = 'bold 30px "Comic Sans MS", "Trebuchet MS", sans-serif';
    x.fillText('Preparando', cx, 200); x.fillText('la tiza…', cx, 240);
  }
  st.boardTex.needsUpdate = true;
}

function makeDesk() {
  const g = new THREE.Group();
  const wood = std({ map: tex.madera(), color: '#b07a45', roughness: 0.6 });
  const iron = std({ color: '#2c2c32', roughness: 0.5, metalness: 0.5 });
  g.add(tbox(1.1, 0.07, 0.65, wood, 1, { y: 0.78 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(tbox(0.05, 0.78, 0.05, iron, 1, { x: sx * 0.48, y: 0.39, z: sz * 0.26 }));
  return g;
}

export default {
  camera(n) { return n > 4 ? { pos: [0, 4.6, 12.8], look: [0, 2.7, -2] } : { pos: [0, 4.2, 10.6], look: [0, 2.8, -2] }; },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(60, 40, std({ map: tex.wood([20, 14]), color: '#b88a5a' }), { z: -4 }));
    // Paredes del aula: celeste abajo, crema arriba, con una guarda
    group.add(tbox(30, 1.4, 0.3, std({ map: tex.revoque(), color: '#8fc3d9' }), 1.6, { y: 0.7, z: -3.6 }));
    group.add(tbox(30, 6, 0.3, std({ map: tex.revoque(), color: '#f1e6cc' }), 1.6, { y: 4.4, z: -3.6 }));
    group.add(tbox(30, 0.1, 0.36, std({ color: '#7a4a26' }), 1, { y: 1.42, z: -3.55 }));
    // Pizarrón con marco de madera y la bandejita de las tizas
    const c = document.createElement('canvas'); c.width = CW; c.height = CH_;
    const boardTex = new THREE.CanvasTexture(c); boardTex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.95 }));
    board.position.set(0, 3.25, -3.42); group.add(board);
    const frame = std({ map: tex.madera(), color: '#8a5530', roughness: 0.6 });
    group.add(tbox(BW + 0.3, 0.15, 0.12, frame, 1, { y: 3.25 + BH / 2 + 0.05, z: -3.4 }));
    group.add(tbox(BW + 0.3, 0.15, 0.12, frame, 1, { y: 3.25 - BH / 2 - 0.05, z: -3.4 }));
    for (const sx of [-1, 1]) group.add(tbox(0.15, BH + 0.25, 0.12, frame, 1, { x: sx * (BW / 2 + 0.08), y: 3.25, z: -3.4 }));
    group.add(tbox(BW, 0.06, 0.25, frame, 1, { y: 3.25 - BH / 2 - 0.12, z: -3.28 }));
    for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), std({ color: ['#ffffff', '#ffe08a', '#ffffff', '#ffb3c7'][i] })); t.rotation.z = Math.PI / 2; t.position.set(-3.2 + i * 0.35, 3.25 - BH / 2 - 0.07, -3.25); group.add(t); }
    const eraser = tbox(0.45, 0.12, 0.16, std({ color: '#3a3a8a' }), 1, { x: 3.1, y: 3.25 - BH / 2 - 0.03, z: -3.25 }); group.add(eraser);
    // Bandera, reloj y la guarda de letras
    const flag = makeFlag(); flag.position.set(6.4, 0, -3.1); flag.scale.setScalar(1.2); group.add(flag);
    const clock = canvasPlane(0.9, 0.9, (x, w, h) => {
      x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.46, 0, 7); x.fill();
      x.strokeStyle = '#222'; x.lineWidth = w * 0.05; x.stroke();
      x.lineWidth = w * 0.035; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2, h * 0.22); x.moveTo(w / 2, h / 2); x.lineTo(w * 0.7, h * 0.6); x.stroke();
    }, 128);
    clock.position.set(-6, 4.9, -3.43); group.add(clock);
    const abc = canvasPlane(BW + 4, 0.55, (x, w, h) => {
      const L = 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Ññ Oo Pp';
      x.fillStyle = '#fff6d6'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#c0392b'; x.font = `bold ${h * 0.62}px "Comic Sans MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(L, w / 2, h / 2);
    }, 1024);
    abc.material.transparent = false; abc.position.set(0, 6.2, -3.43); group.add(abc);

    // Pupitres a los dos lados: los chicos de guardapolvo… bueno, los jugadores
    const spots = new Map();
    players.forEach((p, i) => {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      const x = side * (5 + k * 0.9), z = -0.7 + k * 1.6;
      const desk = makeDesk(); desk.position.set(x, 0, z + 0.65); desk.rotation.y = -side * 0.35; group.add(desk);
      const g = ctx.addChar(p, x, z);
      const ang = -side * 0.35;
      g.rotation.y = ang;
      const mark = ctx.label('✔', '#2e9e48', 1.1); mark.position.set(0, 3.6, 0); mark.visible = false; g.add(mark);
      spots.set(p.id, { home: new THREE.Vector3(x, 0, z), ang, g, mark });
    });
    const smudges = Array.from({ length: 14 }, () => ({ x: Math.random() * CW, y: Math.random() * CH_, rx: 60 + Math.random() * 160, ry: 20 + Math.random() * 60, r: Math.random() * 3, a: 0.02 + Math.random() * 0.03 }));
    const st = { bx: c.getContext('2d'), boardTex, spots, smudges, ink: [], inkV: -1, sig: '' };
    return st;
  },
  update(ctx, st, s, dt, time) {
    const names = Object.fromEntries(ctx.players.map((p) => [p.id, p.name]));
    if (s.ink) { st.ink = s.ink.s; }
    const sig = [s.ink ? s.ink.v : st.inkV, s.phase, s.round, s.word, (s.opts || []).join()].join('|');
    if (s.ink) st.inkV = s.ink.v;
    if (sig !== st.sig) {
      if (s.word && !st.revealed) { st.revealed = true; ctx.sfx('gold'); }
      if (!s.word) st.revealed = false;
      st.sig = sig; paintBoard(st, s, names);
    }
    for (const e of s.ents) {
      const sp = st.spots.get(e.id); if (!sp) continue;
      const g = sp.g;
      const drawing = e.id === s.drawer && (s.phase === 'draw' || s.phase === 'show');
      const tx = drawing ? -4.75 : sp.home.x, tz = drawing ? -2.9 : sp.home.z;
      follow(g, tx, tz, Math.min(1, dt * 4));
      const v = speedOf(g, dt);
      face(g, v > 0.6 ? Math.atan2(tx - g.position.x, tz - g.position.z) : drawing ? 2.2 : sp.ang, Math.min(1, dt * 8));
      walkAnim(g, time, v / 3, g.id);
      // El que dibuja mueve el brazo; los que adivinan muestran ✔ o ✘
      if (drawing && v < 0.6) g.userData.body.rotation.z = Math.sin(time * 9) * 0.12;
      const show = e.g !== 0 && s.phase !== 'show';
      sp.mark.visible = show;
      if (show && sp.markG !== e.g) {
        sp.markG = e.g;
        const l = ctx.label(e.g > 0 ? '✔' : '✘', e.g > 0 ? '#2e9e48' : '#c0392b', 1.1);
        sp.mark.material.map = l.material.map; sp.mark.scale.copy(l.scale); sp.mark.material.needsUpdate = true;
      }
      if (!show) sp.markG = 0;
      sp.mark.position.y = 3.6 + Math.sin(time * 4 + g.id) * 0.08;
    }
  },
};
