// Escena: Bochas en el Club — cancha de arena con tablas, pared de ladrillo del club y guirnalda de lamparitas.
// La cámara va detrás del que tira, sigue a la bocha mientras rueda y después mira desde arriba del bochín.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, tbox, canvasPlane, follow, face, walkAnim, speedOf } from './util.js';

const L = 18.4, HW = 2.1, BR = 0.22, KR = 0.12;
const tmp = new THREE.Vector3(), axis = new THREE.Vector3();

function makeBocha(color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(BR, 20, 14), std({ color, roughness: 0.25, metalness: 0.35 }));
  // Rayitas para que se note que rueda
  const ring = new THREE.Mesh(new THREE.TorusGeometry(BR * 0.99, 0.018, 6, 24), std({ color: '#f4f1e8', roughness: 0.4 }));
  m.add(ring);
  const ring2 = ring.clone(); ring2.rotation.y = Math.PI / 2; m.add(ring2);
  m.castShadow = true;
  return m;
}

export default {
  camera: { pos: [0, 4.2, 6.5], look: [0, 0.4, -9] },
  build(ctx) {
    const { group, players, CH } = ctx;
    // Piso de baldosas del club y la cancha de arena apisonada
    group.add(plane(60, 60, std({ map: tex.baldosa([30, 30]), color: '#c9b9a0' }), { z: -6 }));
    group.add(plane(HW * 2, L, std({ map: tex.dirt([3, 14]), color: '#d8b98a' }), { y: 0.02, z: -L / 2 }));
    const wood = std({ map: tex.madera(), color: '#7a4a26', roughness: 0.7 });
    for (const sx of [-1, 1]) group.add(tbox(0.18, 0.32, L + 0.36, wood, 1, { x: sx * (HW + 0.09), y: 0.16, z: -L / 2 }));
    group.add(tbox(HW * 2 + 0.36, 0.5, 0.18, wood, 1, { y: 0.25, z: -L - 0.09 }));
    // Línea de tiro y marcas de la cancha
    for (const z of [-0.05, -L / 2]) group.add(plane(HW * 2, 0.06, new THREE.MeshBasicMaterial({ color: '#f4f1e8' }), { y: 0.03, z }));
    // Pared del club al fondo y a los costados, con el cartel
    const brick = std({ map: tex.ladrillo(), roughness: 0.9 });
    group.add(tbox(16, 5, 0.4, brick, 1.4, { y: 2.5, z: -L - 1.6 }));
    for (const sx of [-1, 1]) group.add(tbox(0.4, 4, L + 8, brick, 1.4, { x: sx * 7, y: 2, z: -L / 2 + 1 }));
    const sign = canvasPlane(9, 1.5, (x, w, h) => {
      x.fillStyle = '#1b3a6b'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#f2c230'; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24);
      x.fillStyle = '#ffffff'; x.font = `bold ${h * 0.34}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('CLUB SOCIAL Y DEPORTIVO', w / 2, h * 0.36);
      x.fillStyle = '#f2c230'; x.font = `bold ${h * 0.3}px "Trebuchet MS", sans-serif`;
      x.fillText('★ LOS BOCHÍN ★', w / 2, h * 0.7);
    }, 768);
    sign.material.transparent = false; sign.position.set(0, 3.6, -L - 1.38); group.add(sign);
    // Guirnalda de lamparitas sobre la cancha
    const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffe7a3' });
    const wireMat = new THREE.LineBasicMaterial({ color: '#222' });
    for (const sx of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 24; i++) { const z = 2 - (i / 24) * (L + 3); pts.push(new THREE.Vector3(sx * 3.2, 3.6 - Math.sin((i % 6) / 6 * Math.PI) * 0.35, z)); }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
      pts.forEach((p, i) => { if (i % 2) return; const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), bulbMat); b.position.copy(p).y -= 0.12; group.add(b); });
    }
    // Banco de madera y mesita con el sifón para los que esperan
    group.add(tbox(0.6, 0.45, 7, wood, 1, { x: 4.4, y: 0.22, z: -5.2 }));
    const siphon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), std({ color: '#3d8bd9', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }));
    siphon.position.set(-4.5, 1.05, 0.5); group.add(siphon);
    group.add(tbox(0.9, 0.8, 0.9, wood, 1, { x: -4.5, y: 0.4, z: 0.5 }));

    // Jugadores esperando al costado de la cancha, mirando
    const spots = new Map();
    players.forEach((p, i) => {
      const home = new THREE.Vector3(3.3, 0, -2.6 - i * 1.25);
      const g = ctx.addChar(p, home.x, home.z);
      g.rotation.y = -Math.PI / 2;
      spots.set(p.id, { home, g, color: CH[p.char].color, swing: 0 });
    });
    const kin = new THREE.Mesh(new THREE.SphereGeometry(KR, 16, 12), std({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.3 }));
    kin.castShadow = true; group.add(kin);
    const kinRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 32), new THREE.MeshBasicMaterial({ color: '#e5243b', transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    kinRing.rotation.x = -Math.PI / 2; group.add(kinRing);
    // Flecha de puntería: se estira con la fuerza
    const arrow = new THREE.Group();
    const shaftMat = new THREE.MeshBasicMaterial({ color: '#20d39b', transparent: true, opacity: 0.85 });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1), shaftMat); shaft.rotation.x = -Math.PI / 2; shaft.position.z = -0.5; arrow.add(shaft);
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.3, 3), shaftMat); head.rotation.x = -Math.PI / 2; head.rotation.z = Math.PI / 2; arrow.add(head);
    arrow.position.set(0, 0.05, -0.4); group.add(arrow);
    const leadRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 28), new THREE.MeshBasicMaterial({ color: '#f2c230', side: THREE.DoubleSide }));
    leadRing.rotation.x = -Math.PI / 2; group.add(leadRing);
    // Cartel de quién tira
    const turnTag = ctx.label('', '#ffffff', 0.9); turnTag.visible = false; group.add(turnTag);
    return { spots, kin, kinRing, arrow, shaft, head, shaftMat, leadRing, turnTag, turnId: null, balls: [], camP: new THREE.Vector3(0, 4.2, 6.5), camL: new THREE.Vector3(0, 0.4, -9), restT: 0 };
  },
  update(ctx, st, s, dt, time) {
    // Bochas nuevas: el que tira hace el swing
    while (st.balls.length < s.balls.length) {
      const b = s.balls[st.balls.length];
      const sp = st.spots.get(b.o);
      const m = makeBocha(sp ? sp.color : '#888'); m.position.set(b.x, BR, b.z); ctx.group.add(m);
      st.balls.push({ m, o: b.o });
      if (sp) sp.swing = 1;
      ctx.sfx('swoosh');
    }
    s.balls.forEach((b, i) => {
      const bm = st.balls[i].m;
      tmp.set(b.x, BR, b.z);
      const d = tmp.distanceTo(bm.position);
      if (d > 1e-4) {
        // Rueda: gira alrededor del eje perpendicular al movimiento
        axis.set(tmp.z - bm.position.z, 0, -(tmp.x - bm.position.x)).normalize();
        bm.rotateOnWorldAxis(axis, d / BR);
      }
      bm.position.copy(tmp);
    });
    st.kin.position.set(s.kin.x, KR, s.kin.z);
    st.kinRing.position.set(s.kin.x, 0.04, s.kin.z);
    st.kinRing.scale.setScalar(1 + Math.sin(time * 4) * 0.12);
    // Aro dorado en la bocha que va ganando
    const lead = s.lead != null ? s.balls.reduce((best, b, i) => {
      if (b.o !== s.lead) return best;
      const d = Math.hypot(b.x - s.kin.x, b.z - s.kin.z);
      return !best || d < best.d ? { d, i } : best;
    }, null) : null;
    st.leadRing.visible = !!lead && s.phase !== 'roll';
    if (lead) { const b = s.balls[lead.i]; st.leadRing.position.set(b.x, 0.04, b.z); st.leadRing.material.color.set(st.spots.get(s.lead).color); }

    // Cartel "🎯 Tira Fulano" arriba de la línea de tiro
    if (s.turn !== st.turnId) {
      st.turnId = s.turn;
      const p = ctx.players.find((o) => o.id === s.turn);
      if (p) {
        const l = ctx.label(`🎯 Tira ${p.name}`, st.spots.get(p.id).color, 0.9);
        st.turnTag.material.map = l.material.map; st.turnTag.scale.copy(l.scale); st.turnTag.material.needsUpdate = true;
      }
    }
    st.turnTag.visible = s.phase === 'aim' && !!s.turn;
    st.turnTag.position.set(0, 1.5 + Math.sin(time * 3) * 0.05, -3.2);

    // Flecha de puntería
    const aim = s.aim;
    st.arrow.visible = !!aim && aim.d && aim.p > 0.02;
    if (st.arrow.visible) {
      const len = 0.8 + aim.p * 7;
      st.arrow.rotation.y = -aim.a * 0.17;
      st.shaft.scale.y = len; st.shaft.position.z = -len / 2; st.head.position.z = -len - 0.1;
      st.shaftMat.color.set(aim.p > 0.85 ? '#ff5a64' : aim.p > 0.5 ? '#ffc23d' : '#20d39b');
    }
    if (s.clack) ctx.sfx(s.clack.k > 0.4 ? 'hit' : 'blip');
    if (s.thud) ctx.sfx('bonk');

    // Jugadores: el de turno pasa a la línea de tiro
    for (const [id, sp] of st.spots) {
      const g = sp.g;
      const throwing = s.turn === id && s.phase === 'aim';
      const tx = throwing ? -0.75 : sp.home.x, tz = throwing ? 0.5 : sp.home.z;
      follow(g, tx, tz, Math.min(1, dt * 5));
      const v = speedOf(g, dt);
      face(g, v > 0.5 ? Math.atan2(tx - g.position.x, tz - g.position.z) : throwing ? Math.PI : -Math.PI / 2, Math.min(1, dt * 8));
      walkAnim(g, time, v / 3, g.id);
      sp.swing = Math.max(0, sp.swing - dt * 2.5);
      g.userData.body.rotation.x = -Math.sin(sp.swing * Math.PI) * 0.6;
    }

    // Cámara: detrás del que tira → sigue la bocha → mira desde arriba del bochín
    const moving = s.phase === 'roll' && s.balls.length ? s.balls[s.balls.length - 1] : null;
    if (s.phase === 'aim') { st.camP.set(0.6, 4.4, 6); st.camL.set(s.kin.x * 0.3, 0, s.kin.z * 0.62); }
    else if (moving) {
      const ahead = Math.min(moving.z, -3);
      st.camP.set(moving.x * 0.4, 3.4, Math.min(5, ahead + 7)); st.camL.set(moving.x * 0.5, 0.2, ahead - 3);
    } else { st.camP.set(s.kin.x * 0.5, 7.5, s.kin.z + 6); st.camL.set(s.kin.x, 0, s.kin.z - 0.5); }
    ctx.setCamera(st.camP.toArray(), st.camL.toArray());
  },
};
