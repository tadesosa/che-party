// Escena: Tiro Libre con Comba — una cancha con un arco por jugador, uno al lado del otro. Cada uno tiene su barrera
// de maniquíes amarillos de entrenamiento y su arquero. La pelota hace la misma curva que calculó el servidor.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, tbox, rowX, canvasPlane } from './util.js';
import { makeGoal, makeBall } from '../props.js';

const GW = 3.66, GH = 2.44, DIST = 21, BAR_D = 9.15, LANE = 9, BR = 0.22;
const path = (k, t) => ({ x: k.xa * t + k.c * 3.1 * Math.sin(Math.PI * t), y: k.apex * Math.sin(Math.PI * t * 0.75) });

function makeDummy(color = '#f2c230') {
  const g = new THREE.Group();
  const m = std({ color, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 4, 10), m); body.position.y = 0.95; body.scale.z = 0.45; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), m); head.position.y = 1.78; g.add(head);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), std({ color: '#333' })); foot.position.y = 0.15; g.add(foot);
  return g;
}

function makeKeeper(color) {
  const g = new THREE.Group();
  const inner = new THREE.Group(); g.add(inner);
  const shirt = std({ color, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 4, 10), shirt); body.position.y = 1.05; inner.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), std({ color: '#e0b48a' })); head.position.y = 1.8; inner.add(head);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.6, 4, 8), shirt); arm.position.set(s * 0.45, 1.45, 0); arm.rotation.z = s * 0.9; inner.add(arm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), std({ color: '#ffffff' })); glove.position.set(s * 0.75, 1.75, 0); inner.add(glove);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), std({ color: '#222' })); leg.position.set(s * 0.15, 0.35, 0); inner.add(leg);
  }
  g.userData.inner = inner;
  return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * LANE; return { pos: [0, 2.8 + w * 0.08, 4 + w * 0.42], look: [0, 1.4, -15] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    const W = n * LANE + 30;
    // Pasto a franjas, tribuna al fondo y carteles de publicidad
    group.add(plane(W + 40, 90, std({ map: tex.grass([30, 40]), color: '#5e9e48' }), { z: -10 }));
    for (let i = 0; i < 12; i++) group.add(plane(W + 40, 3.5, std({ color: i % 2 ? '#549442' : '#63a64c' }), { y: 0.005, z: 8 - i * 3.5 }));
    const AD = ['CHORI MAX', 'YERBA LA ABUELA', 'FERNET CHE', 'ALFAJORES 3x2'];
    for (let i = 0; i < Math.ceil(W / 8); i++) {
      const ad = canvasPlane(7.6, 0.9, (x, w, h) => {
        x.fillStyle = ['#c0392b', '#1b3a6b', '#2e7d4f', '#f2c230'][i % 4]; x.fillRect(0, 0, w, h);
        x.fillStyle = i % 4 === 3 ? '#1b2a4a' : '#fff'; x.font = `bold ${h * 0.55}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(AD[i % 4], w / 2, h / 2 + 2);
      }, 512);
      ad.material.transparent = false; ad.position.set(-W / 2 + 4 + i * 8, 0.45, -DIST - 4); group.add(ad);
    }
    const stand = std({ map: tex.piedra(), color: '#9a9a9a' });
    for (let r = 0; r < 4; r++) group.add(tbox(W + 10, 0.8, 1.4, stand, 1.5, { y: 0.4 + r * 0.8, z: -DIST - 6 - r * 1.4 }));
    // Hinchas en la tribuna (puntitos de colores)
    const fanGeo = new THREE.SphereGeometry(0.22, 6, 5);
    const FC = ['#74acdf', '#ffffff', '#c0392b', '#f2c230', '#1b3a6b', '#2e7d4f'];
    for (let i = 0; i < 160; i++) { const f = new THREE.Mesh(fanGeo, std({ color: FC[i % 6] })); const r = i % 4; f.position.set(-W / 2 - 4 + ((i * 37) % (W + 8)), 1.1 + r * 0.8, -DIST - 6 - r * 1.4); group.add(f); }

    const lanes = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, LANE);
      const color = CH[p.char].color;
      const goal = makeGoal(GW * 2, GH); goal.position.set(x, 0, -DIST); group.add(goal);
      // Área chica pintada
      group.add(plane(GW * 2 + 4, 0.08, new THREE.MeshBasicMaterial({ color: '#f4f4f4' }), { x, y: 0.02, z: -DIST + 5.5 }));
      for (const s of [-1, 1]) group.add(plane(0.08, 5.5, new THREE.MeshBasicMaterial({ color: '#f4f4f4' }), { x: x + s * (GW + 2), y: 0.02, z: -DIST + 2.75 }));
      const wall = new THREE.Group(); group.add(wall);
      const keeper = makeKeeper(color); keeper.position.set(x, 0, -DIST + 0.4); group.add(keeper);
      const ball = makeBall(BR); ball.position.set(x, BR, 0); group.add(ball);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(BR, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3 }));
      shadow.rotation.x = -Math.PI / 2; group.add(shadow);
      const g = ctx.addChar(p, x - 0.9, 1.1); g.rotation.y = Math.PI - 0.4;
      // Estela de la curva
      const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 30 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
      trail.visible = false; group.add(trail);
      lanes.set(p.id, { x, wall, keeper, ball, shadow, g, trail, wallSig: '', kickSig: '', fx: false });
    });
    return { lanes };
  },
  update(ctx, st, s, dt, time) {
    const su = s.setup;
    for (const e of s.ents) {
      const ln = st.lanes.get(e.id); if (!ln) continue;
      // Barrera: se rearma con cada tiro
      const wsig = su ? `${s.round}` : '';
      if (wsig !== ln.wallSig) {
        ln.wallSig = wsig;
        while (ln.wall.children.length) ln.wall.remove(ln.wall.children[0]);
        if (su) {
          const cnt = Math.max(3, Math.round(su.bw / 0.5));
          for (let i = 0; i < cnt; i++) { const d = makeDummy(); d.position.set(ln.x + su.bx - su.bw / 2 + 0.25 + i * (su.bw - 0.5) / Math.max(1, cnt - 1), 0, -BAR_D); ln.wall.add(d); }
        }
        ln.keeper.position.x = ln.x + (su ? su.kx : 0);
        ln.keeper.userData.inner.rotation.z = 0; ln.keeper.userData.inner.position.x = 0;
      }
      const k = e.kick;
      if (!k) {
        ln.ball.position.set(ln.x, BR, 0); ln.shadow.position.set(ln.x, 0.01, 0);
        ln.trail.visible = false; ln.fx = false;
        ln.g.position.x = ln.x - 0.9; ln.g.position.z = 1.1; ln.g.userData.body.rotation.x = 0;
        continue;
      }
      // Pelota en vuelo por el mismo camino del servidor, hasta donde termina el tiro
      const kk = Math.min(k.k, k.end);
      let p = path(k, Math.max(0, kk));
      let z = -DIST * Math.max(0, kk);
      if (k.r === 'barrera' && k.k > k.end) { const b = (k.k - k.end) * 4; p = { x: p.x, y: Math.max(0, p.y * (1 - b)) }; z += Math.min(2, b * 2); }
      if (k.r === 'atajo' && k.k > k.end) { const b = Math.min(1.5, (k.k - k.end) * 3); z += b * 4; p = { x: p.x, y: Math.max(0, p.y - b * 1.2) }; }
      if (k.r === 'palo' && k.k > k.end) { const b = Math.min(1.5, (k.k - k.end) * 3); z += b * 3; p = { x: p.x + Math.sign(p.x) * b, y: Math.max(0, p.y - b) }; }
      if (k.r === 'gol') z = Math.max(z, -DIST - 0.7); // la red la frena
      ln.ball.position.set(ln.x + p.x, BR + p.y, z);
      ln.ball.rotation.x -= dt * 14; ln.ball.rotation.y += k.c * dt * 20;
      ln.shadow.position.set(ln.x + p.x, 0.01, z);
      // Estela que muestra la comba
      const pts = ln.trail.geometry.attributes.position;
      for (let i = 0; i < 30; i++) { const t = Math.max(0, kk) * i / 29; const q = path(k, t); pts.setXYZ(i, ln.x + q.x, BR + q.y, -DIST * t); }
      pts.needsUpdate = true; ln.trail.visible = true;
      // El pateador hace el gesto; el arquero se tira cuando la pelota va llegando
      ln.g.userData.body.rotation.x = k.k < 0.3 ? -0.5 : 0;
      const inner = ln.keeper.userData.inner;
      if (k.k > 0.55 && k.dive) {
        const d = Math.min(1, (k.k - 0.55) * 3);
        inner.rotation.z = -k.dive * d * 1.2; inner.position.x = k.dive * d * 1.3;
      }
      // Efectos al terminar el tiro
      if (k.k >= k.end && !ln.fx) {
        ln.fx = true;
        if (k.r === 'gol') { ctx.burst(new THREE.Vector3(ln.x + p.x, 1.5, -DIST), 50, 5); ctx.sfx('gold'); }
        else if (k.r === 'palo') ctx.sfx('bonk');
        else if (k.r === 'barrera' || k.r === 'atajo') ctx.sfx('hit');
      }
      if (k.k < 0.1 && ln.kickSig !== e.kick.xa + ',' + e.kick.c) { ln.kickSig = e.kick.xa + ',' + e.kick.c; ctx.sfx('kick'); }
    }
  },
};
