// Escena: Remando en el Tigre — un río del Delta que va doblando, con orillas de pasto, sauces, casas sobre pilotes,
// camalotes en cada carril y el muelle de llegada. La cámara va atrás de las canoas.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { std, tbox, canvasPlane, fitSpan } from './util.js';

const LANE = 2.6;
const riverX = (z, k) => Math.sin(z * k[0] + k[1]) * k[2] + Math.sin(z * k[3] + k[4]) * k[5];
const riverSlope = (z, k) => Math.cos(z * k[0] + k[1]) * k[0] * k[2] + Math.cos(z * k[3] + k[4]) * k[3] * k[5];

// Cinta que sigue al río: de lado a lado entre a y b (medidos desde el centro), de d0 a d1
function ribbon(k, a, b, d0, d1, y, material, step = 1) {
  const pos = [], idx = [], uv = [];
  let row = 0;
  for (let d = d0; d <= d1; d += step, row++) {
    const cx = riverX(d, k);
    pos.push(cx + a, y, -d, cx + b, y, -d);
    uv.push(a / 4, d / 4, b / 4, d / 4);
    if (row) { const i = (row - 1) * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material); m.receiveShadow = true;
  return m;
}

function makeCanoe(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std({ color, roughness: 0.5, side: THREE.DoubleSide }));
  hull.scale.set(0.55, 0.38, 1.7); hull.position.y = 0.3; g.add(hull);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 30), std({ color: '#f4efe2' }));
  rim.rotation.x = Math.PI / 2; rim.scale.set(0.55, 1.7, 1); rim.position.y = 0.3; g.add(rim);
  const oars = [];
  for (const s of [-1, 1]) {
    const oar = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2, 6), std({ color: '#c8935a' })); stick.rotation.z = Math.PI / 2; stick.position.x = s * 0.8; oar.add(stick);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.25), std({ color: '#c8935a' })); blade.position.x = s * 1.75; oar.add(blade);
    oar.position.set(0, 0.75, 0.1); oar.rotation.z = s * 0.35; g.add(oar);
    oars.push(oar);
  }
  return { g, oars };
}

function makeWillow(rnd) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2.4, 7), std({ color: '#5a3d24' })); trunk.position.y = 1.2; g.add(trunk);
  const leaf = std({ color: rnd > 0.5 ? '#6f9a3a' : '#7da846', roughness: 0.9 });
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), leaf); crown.position.y = 2.6; crown.scale.y = 1.5; g.add(crown);
  return g;
}

function makeStiltHouse(color) {
  const g = new THREE.Group();
  const wood = std({ map: tex.madera(), color, roughness: 0.8 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(tbox(0.15, 1.3, 0.15, std({ color: '#4a3424' }), 1, { x: sx * 1.2, y: 0.65, z: sz * 1 }));
  g.add(tbox(2.8, 1.7, 2.4, wood, 0.8, { y: 2.15 }));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.2, 4), std({ color: '#8a3a2a' })); roof.rotation.y = Math.PI / 4; roof.position.y = 3.6; g.add(roof);
  g.add(tbox(2.9, 0.08, 1, std({ color: '#7a5a3a' }), 1, { y: 1.3, z: 1.6 }));
  return g;
}

export default {
  camera: { pos: [0, 6, 9], look: [0, 0, -8] },
  build(ctx) {
    return { built: false, boats: new Map(), logs: [], n: ctx.players.length };
  },
  // El río se arma con el primer cuadro (la forma viene del servidor)
  buildRiver(ctx, st, s) {
    const { group, players, CH } = ctx;
    const k = s.k, L = s.len;
    const half = (st.n * LANE) / 2 + 0.9;
    st.half = half;
    group.add(ribbon(k, -half - 1.5, half + 1.5, -20, L + 40, 0, std({ map: tex.water([4, 40]), color: '#6b8f86', roughness: 0.25, metalness: 0.1 })));
    // Orillas: barro y pasto
    for (const s2 of [-1, 1]) {
      const a = s2 < 0 ? -half - 30 : half + 1.2, b = s2 < 0 ? -half - 1.2 : half + 30;
      group.add(ribbon(k, a, b, -20, L + 40, 0.12, std({ map: tex.grass([12, 60]), color: '#7aa356' })));
      const ea = s2 < 0 ? -half - 1.8 : half + 0.9, eb = s2 < 0 ? -half - 0.9 : half + 1.8;
      group.add(ribbon(k, ea, eb, -20, L + 40, 0.07, std({ map: tex.dirt([2, 30]), color: '#8a6f4f' })));
    }
    // Sauces y casas sobre pilotes en las orillas
    const HC = ['#c94f3d', '#3d7ec9', '#e0b43a', '#4fa36b', '#e8e2d0'];
    let h = 0;
    for (let d = -10; d < L + 30; d += 7 + (d * 13 % 5)) {
      for (const s2 of [-1, 1]) {
        const r = Math.abs(Math.sin(d * 12.9 + s2 * 3.1));
        const off = half + 3 + r * 5;
        const x = riverX(d, k) + s2 * off;
        if (r > 0.72) { const hs = makeStiltHouse(HC[h++ % HC.length]); hs.position.set(x + s2 * 1.5, 0, -d); hs.rotation.y = s2 > 0 ? -Math.PI / 2 : Math.PI / 2; group.add(hs); }
        else { const t = makeWillow(r); t.position.set(x, 0, -d); t.scale.setScalar(0.9 + r * 0.6); group.add(t); }
      }
    }
    // Muelle de llegada con cartel
    const cxL = riverX(L, k);
    group.add(tbox(half * 2 + 4, 0.2, 1.6, std({ map: tex.madera(), color: '#8a6440' }), 1, { x: cxL, y: 1.6, z: -L - 1 }));
    for (const sx of [-1, 1]) group.add(tbox(0.25, 3.8, 0.25, std({ color: '#4a3424' }), 1, { x: cxL + sx * (half + 1.6), y: 1.9, z: -L - 1 }));
    const banner = canvasPlane(half * 2 + 3, 0.9, (x, w, hh) => {
      x.fillStyle = '#1b3a6b'; x.fillRect(0, 0, w, hh);
      for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#fff' : '#111'; x.fillRect(i * w / 12, 0, w / 12, hh * 0.18); x.fillRect(((i + 1) % 12) * w / 12, hh * 0.82, w / 12, hh * 0.18); }
      x.fillStyle = '#fff'; x.font = `bold ${hh * 0.5}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('🏁 MUELLE DE LLEGADA 🏁', w / 2, hh / 2);
    }, 1024);
    banner.material.transparent = false; banner.position.set(cxL, 3.5, -L - 1); group.add(banner);
    // Camalotes
    const camMat = std({ color: '#3f7a2e', roughness: 0.9 });
    const flowerMat = std({ color: '#b98fe0' });
    const laneOf = new Map(s.ents.map((e) => [e.id, e.lane]));
    for (const l of s.logs) {
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), camMat); leaf.scale.y = 0.35; leaf.position.set(Math.cos(i * 1.7) * 0.25, 0.08, Math.sin(i * 1.7) * 0.25); g.add(leaf); }
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), flowerMat); fl.position.y = 0.25; g.add(fl);
      g.position.set(riverX(l.d, k) + laneOf.get(l.id) + l.x, 0, -l.d); group.add(g);
      st.logs.push({ g, l });
    }
    // Canoas con el jugador adentro
    for (const e of s.ents) {
      const p = players.find((o) => o.id === e.id);
      const c = makeCanoe(CH[p.char].color);
      const ch = ctx.addChar(p, 0, 0, 0.8);
      ctx.group.remove(ch); c.g.add(ch); ch.position.set(0, 0.25, 0); ch.rotation.y = Math.PI;
      group.add(c.g);
      st.boats.set(e.id, { ...c, ch, swing: [0, 0] });
    }
    st.built = true;
  },
  update(ctx, st, s, dt, time) {
    if (!st.built) this.buildRiver(ctx, st, s);
    const k = s.k;
    let lo = Infinity, hi = -Infinity;
    for (const e of s.ents) {
      const b = st.boats.get(e.id); if (!b) continue;
      const x = riverX(e.d, k) + e.lane + e.x;
      b.g.position.x += (x - b.g.position.x) * Math.min(1, dt * 12);
      b.g.position.z += (-e.d - b.g.position.z) * Math.min(1, dt * 12);
      b.g.position.y = Math.sin(time * 2 + e.lane) * 0.05;
      // Mira para donde va: la dirección del río más lo que está torcida
      const ang = Math.atan(riverSlope(e.d, k)) + e.h;
      b.g.rotation.y = -ang;
      b.g.rotation.z = e.bump ? Math.sin(time * 30) * 0.08 : 0;
      // Remos: el que acaba de remar barre para atrás
      b.swing[0] += ((e.sl ? 1 : 0) - b.swing[0]) * Math.min(1, dt * 10);
      b.swing[1] += ((e.sr ? 1 : 0) - b.swing[1]) * Math.min(1, dt * 10);
      b.oars[0].rotation.y = -0.6 + b.swing[0] * 1.2; b.oars[1].rotation.y = 0.6 - b.swing[1] * 1.2;
      if (e.sl && !b.l) ctx.sfx('swoosh'); if (e.sr && !b.r) ctx.sfx('swoosh');
      b.l = e.sl; b.r = e.sr;
      if (e.bump && !b.bumped) ctx.sfx('bonk');
      b.bumped = e.bump;
      lo = Math.min(lo, e.d); hi = Math.max(hi, e.d);
    }
    for (const o of st.logs) o.g.visible = !o.l.hit || Math.sin(time * 8) > 0;
    const f = fitSpan(st, lo, hi, dt, { base: 9, margin: 5, per: 0.85, maxC: s.len });
    const c = f.c;
    const back = c - 7.5 * f.z;
    ctx.setCamera([riverX(back, k), 5.3 * f.z, -back], [riverX(c + 6, k), 0, -(c + 6)]);
  },
};
