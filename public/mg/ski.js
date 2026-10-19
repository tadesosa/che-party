// Escena: Slalom en el Catedral — una pista de nieve por jugador, en bajada, con puertas de banderas y pinos.
import * as THREE from 'three';
import { plane, std, rowX, fitSpan } from './util.js';
import { makePine, makeSnowPine } from '../decor2.js';

const LANE = 6.4, SLOPE = 0.18; // la pista baja un poco a medida que avanza (z más negativo, y más bajo)

function makeFlag(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), std({ color: '#f4f4f4' })); pole.position.y = 0.8; g.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })); cloth.position.set(0.3, 1.35, 0); g.add(cloth);
  return g;
}
function makeRock() {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), std({ color: '#7d7468', flatShading: true }));
  m.scale.y = 0.7; m.position.y = 0.3; m.castShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}

export default {
  camera(n) { const w = Math.max(2, n) * LANE; return { pos: [0, 9 + w * 0.15, 10 + w * 0.3], look: [0, 0, -6] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    const lanes = new Map();
    // Nieve de fondo inclinada
    const snowMat = std({ color: '#c9d3df', roughness: 1 });
    const bg = plane(200, 220, snowMat, { y: -90 * Math.tan(SLOPE) - 0.03, z: -90 }); bg.rotation.x = -Math.PI / 2 - SLOPE; group.add(bg);
    const s = { lanes, n };
    // Las pistas se arman cuando llega la primera foto (ahí sabemos dónde están las puertas)
    players.forEach((p, i) => {
      const x = rowX(i, n, LANE);
      const g = ctx.addChar(p, x, 0);
      lanes.set(p.id, { x, g, built: false, y: 0 });
    });
    return s;
  },
  update(ctx, st, s, dt, time) {
    const yAt = (z) => -z * Math.tan(SLOPE);
    let lo = Infinity, hi = -Infinity;
    for (const e of s.ents) {
      const l = st.lanes.get(e.id); if (!l) continue;
      if (!l.built) {
        l.built = true;
        // Bordes de la pista con banderitas cada tanto, puertas y obstáculos
        for (const sx of [-1, 1]) {
          const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, s.len + 8), std({ color: sx < 0 ? '#2f86e0' : '#e14b3c' }));
          edge.position.set(l.x + sx * (s.half + 0.5), yAt(s.len / 2) + 0.12, -s.len / 2 + 2); edge.rotation.x = -SLOPE; ctx.group.add(edge);
        }
        s.gates.forEach((gt, k) => {
          const col = k % 2 ? '#e14b3c' : '#2f86e0';
          for (const sx of [-1, 1]) { const f = makeFlag(col); f.position.set(l.x + gt.x + sx * 0.95, yAt(gt.z), -gt.z); ctx.group.add(f); }
        });
        for (const o of s.obs) { const m = o.kind === 'pino' ? makeSnowPine(2) : makeRock(); m.position.set(l.x + o.x, yAt(o.z), -o.z); ctx.group.add(m); }
        const fin = new THREE.Mesh(new THREE.BoxGeometry(s.half * 2 + 1.2, 0.5, 0.2), std({ color: '#f6b40e' }));
        fin.position.set(l.x, yAt(s.len) + 2.4, -s.len); ctx.group.add(fin);
        for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), std({ color: '#1b2a4a' })); p.position.set(l.x + sx * (s.half + 0.6), yAt(s.len) + 1.3, -s.len); ctx.group.add(p); }

      }
      const g = l.g;
      g.position.x += (l.x + e.x - g.position.x) * Math.min(1, dt * 14);
      g.position.z += (-e.z - g.position.z) * Math.min(1, dt * 14);
      g.position.y = yAt(-g.position.z);
      g.rotation.y = Math.PI + (e.x - (l.lastX ?? e.x)) * -3;
      l.lastX = e.x;
      g.rotation.z = e.crash ? Math.sin(time * 20) * 0.4 : 0;
      g.userData.body.rotation.x = e.fin ? 0 : 0.35; // agachado como esquiador
      if (!e.crash && !e.fin && Math.random() < dt * 12) ctx.splash(new THREE.Vector3(g.position.x, g.position.y + 0.1, g.position.z + 0.4));
      lo = Math.min(lo, e.z); hi = Math.max(hi, e.z);
    }
    // Pinos solo afuera de todas las pistas (una vez), para que se note la velocidad sin tapar a nadie
    if (!st.trees) {
      st.trees = true;
      const edge = (st.n * LANE) / 2 + 1.5;
      for (let z = 0, k = 0; z < s.len + 30; z += 6, k++) for (const sx of [-1, 1]) { const t = makePine(3 + (k % 3) * 0.4); t.position.set(sx * (edge + (k % 2) * 1.5), yAt(z), -z); ctx.group.add(t); }
    }
    // La cámara encuadra del último al primero, bastante desde arriba
    const f = fitSpan(st, lo, hi, dt, { base: 13, margin: 4, per: 1.1, minC: 4, maxC: s.len - 4 });
    const c = -f.c;
    const w = Math.max(1, st.n * LANE / 16);
    ctx.setCamera([0, yAt(-c) + 12 * f.z * w, c + 8 * f.z * w], [0, yAt(-c), c - 3]);
  },
};
