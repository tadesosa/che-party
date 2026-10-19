// Escena: Metegol — el metegol del club visto desde arriba, con las barras y los muñequitos de cada equipo.
import * as THREE from 'three';
import { makeBall } from '../props.js';
import { tex } from '../textures.js';
import { plane, std } from './util.js';

const TEAM = ['#2f86e0', '#e14b3c'];

function makeFigure(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.25), std({ color })); body.position.y = 0.1; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), std({ color: '#f1c27d' })); head.position.y = 0.65; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.2), std({ color: '#1b2a4a' })); legs.position.y = -0.55; g.add(legs);
  return g;
}

export default {
  camera: { pos: [0, 12, 8.5], look: [0, 0, 0.3] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(80, 60, std({ map: tex.wood([16, 12]) })));
    const LX = 7, LZ = 3.6;
    const box = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 + 1.2, 1.2, LZ * 2 + 1.2), std({ map: tex.wood([4, 2]) })); box.position.y = 0.4; group.add(box);
    const field = plane(LX * 2, LZ * 2, std({ color: '#3f9b46' }), { y: 1.02 }); group.add(field);
    const white = std({ color: '#ffffff' });
    group.add(plane(0.08, LZ * 2, white, { y: 1.03 }));
    const circle = new THREE.Mesh(new THREE.RingGeometry(1, 1.08, 32), white); circle.rotation.x = -Math.PI / 2; circle.position.y = 1.03; group.add(circle);
    for (const [x, c] of [[-LX, TEAM[0]], [LX, TEAM[1]]]) {
      const goal = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.55 * 2), std({ color: '#222' })); goal.position.set(x + Math.sign(x) * 0.3, 1.1, 0); group.add(goal);
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.55 * 2), std({ color: c })); mark.position.set(x, 1.1, 0); group.add(mark);
    }
    // Los jugadores miran desde los costados del metegol
    players.forEach((p, i) => {
      const g = ctx.addChar(p, 0, 0);
      const team = g.userData.team;
      const side = team === 1 ? 1 : -1;
      const idx = i % 2;
      g.position.set(side * (3 + idx * 3), 0, LZ + 2.2);
      g.rotation.y = Math.PI;
    });
    const ball = makeBall(0.25); group.add(ball);
    return { ball, rods: [], LX, LZ, lastGoal: null };
  },
  update(ctx, st, s, dt) {
    // Barras: se arman la primera vez con los datos del servidor
    if (!st.rods.length) {
      for (const r of s.rods) {
        const rod = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, st.LZ * 2 + 2.5, 8), std({ color: '#c0c0c0', metalness: 0.7, roughness: 0.3 }));
        bar.rotation.x = Math.PI / 2; bar.position.y = 1.6; rod.add(bar);
        const figs = [];
        for (let i = 0; i < r.n; i++) { const f = makeFigure(TEAM[r.team]); f.position.y = 1.6; rod.add(f); figs.push(f); }
        rod.position.x = r.x; ctx.group.add(rod);
        st.rods.push({ rod, figs, kick: 0 });
      }
    }
    s.rods.forEach((r, i) => {
      const R = st.rods[i]; if (!R) return;
      r.zs.forEach((z, k) => { if (R.figs[k]) R.figs[k].position.z += (z - R.figs[k].position.z) * Math.min(1, dt * 20); });
      R.kick = r.kick ? 1 : Math.max(0, R.kick - dt * 5);
      const dir = r.team ? -1 : 1;
      for (const f of R.figs) f.rotation.z = -dir * R.kick * 1.2;
    });
    st.ball.position.set(s.ball.x, 1.27, s.ball.z);
    st.ball.rotation.z -= dt * 6;
    if (s.lastGoal != null && st.lastGoal == null) { ctx.burst(new THREE.Vector3(s.lastGoal === 0 ? st.LX : -st.LX, 1.6, 0), 80, 5); ctx.sfx('gold'); }
    st.lastGoal = s.lastGoal;
    for (const e of s.ents) { const g = ctx.chars.get(e.id); if (g) g.userData.body.position.y = Math.abs(Math.sin(performance.now() / 150 + e.role)) * 0.05; }
  },
};
