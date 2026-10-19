// Escena: Gaviotas Ladronas — cada uno sentado en su lona frente al mar. Las gaviotas llegan por la
// izquierda, por el mar o por la derecha; una flecha en la arena avisa el lado y se pone verde cuando se puede espantar.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const GAP = 4.4;
const DIR = { left: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0) };
const FACE = { left: -Math.PI / 2, up: Math.PI, right: Math.PI / 2 };

function makeGull() {
  const g = new THREE.Group();
  const white = std({ color: '#f4f4f4' });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), white); body.scale.set(0.8, 0.7, 1.4); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), white); head.position.set(0, 0.12, 0.32); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 5), std({ color: '#f2c230' })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.1, 0.48); g.add(beak);
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.3), std({ color: '#c9ced4' })); w.position.set(s * 0.4, 0.05, 0); g.add(w); wings.push(w); }
  g.userData.wings = wings;
  return g;
}

// Flecha acostada en la arena que apunta hacia la lona
function makeArrow() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.55); s.lineTo(0.5, 0); s.lineTo(0.2, 0); s.lineTo(0.2, -0.55); s.lineTo(-0.2, -0.55); s.lineTo(-0.2, 0); s.lineTo(-0.5, 0); s.lineTo(0, 0.55);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: '#f6b40e', transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group(); holder.add(m);
  holder.userData.mat = m.material;
  return holder;
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 9 + w * 0.3, 9 + w * 0.32], look: [0, 0, -1] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    group.add(plane(100, 70, std({ map: tex.sand([24, 18]) })));
    const sea = plane(100, 40, std({ map: tex.water([22, 9]), color: '#3d86b8' }), { y: 0.03, z: -26 }); group.add(sea);
    group.add(plane(100, 0.8, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), { y: 0.04, z: -6.2 }));
    const seats = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const towel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), std({ color: CH[p.char].color })); towel.rotation.x = -Math.PI / 2; towel.position.set(x, 0.03, 0.4); group.add(towel);
      const sand = new THREE.Group();
      const bread = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), std({ color: '#d9a35a' })); bread.position.y = 0.13; sand.add(bread);
      const mila = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.07, 0.42), std({ color: '#a8692e' })); mila.position.y = 0.22; sand.add(mila);
      sand.position.set(x, 0.03, -0.55); group.add(sand);
      const g = ctx.addChar(p, x, 0.6);
      // Una flecha por lado, cerca de la lona
      const arrows = {};
      for (const [d, v] of Object.entries(DIR)) {
        const a = makeArrow();
        a.position.set(x + v.x * 1.55, 0.06, 0.2 + v.z * 1.55);
        a.rotation.y = Math.atan2(v.x, v.z); // apunta hacia la lona (de donde viene, para adentro)
        a.visible = false; group.add(a); arrows[d] = a;
      }
      seats.set(p.id, { x, g, sand, arrows, gulls: new Map() });
    });
    return { seats };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const se = st.seats.get(e.id); if (!se) continue;
      se.sand.scale.x = Math.max(0.05, e.bites / s.bites);
      se.sand.visible = e.bites > 0;
      // Flechas: amarilla si viene una gaviota por ese lado, verde (y titilando) si ya se la puede espantar
      const want = {};
      for (const gl of e.gulls) if (!gl.gone) want[gl.dir] = want[gl.dir] === 'zone' || gl.zone ? 'zone' : 'far';
      for (const [d, a] of Object.entries(se.arrows)) {
        a.visible = !!want[d];
        if (!want[d]) continue;
        const z = want[d] === 'zone';
        a.userData.mat.color.set(z ? '#2ecc5a' : '#f6b40e');
        a.scale.setScalar(z ? 1.25 + Math.sin(time * 14) * 0.12 : 0.9);
        a.userData.mat.opacity = z ? 1 : 0.75;
      }
      // Gaviotas: llegan en picada desde su lado; si las espantás, salen volando para arriba
      const live = new Set();
      for (const gl of e.gulls) {
        live.add(gl.id);
        let m = se.gulls.get(gl.id);
        if (!m) { m = makeGull(); m.scale.setScalar(1.3); ctx.group.add(m); se.gulls.set(gl.id, m); }
        const v = DIR[gl.dir];
        if (gl.gone) {
          if (m.userData.goneAt == null) {
            m.userData.goneAt = time;
            if (gl.gone === 'flee') { ctx.sfx('swoosh'); ctx.burst(m.position.clone(), 14, 3); }
          }
          const u = time - m.userData.goneAt;
          const out = gl.gone === 'flee' ? v : v.clone().multiplyScalar(-1).add(new THREE.Vector3(0, 0, -1)).normalize();
          m.position.x += out.x * 9 * dt; m.position.z += out.z * 9 * dt; m.position.y += 5 * dt;
          m.rotation.y = Math.atan2(out.x, out.z);
          m.visible = u < 1.6;
        } else {
          const p = gl.p;
          const far = 8 * (1 - p);
          m.position.set(se.x + v.x * (0.4 + far), 0.6 + 5 * (1 - p) * (1 - p), 0.1 + v.z * (0.4 + far));
          m.rotation.y = Math.atan2(-v.x, -v.z);
        }
        m.userData.wings.forEach((w, k) => { w.rotation.z = Math.sin(time * 18 + gl.id) * 0.6 * (k ? -1 : 1); });
      }
      for (const [id, m] of se.gulls) if (!live.has(id)) { ctx.group.remove(m); se.gulls.delete(id); }
      // El personaje mira hacia la gaviota que tiene más cerca; tiembla si se quedó quieto por apurarse
      const near = e.gulls.filter((gl) => !gl.gone).sort((a, b) => b.p - a.p)[0];
      const target = near ? FACE[near.dir] : 0;
      let da = target - se.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
      se.g.rotation.y += da * Math.min(1, dt * 10);
      se.g.userData.body.rotation.z = e.stun ? Math.sin(time * 30) * 0.25 : 0;
    }
  },
};
