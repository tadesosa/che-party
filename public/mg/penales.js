// Escena: Atajá el Penal — un arco por jugador, la pelota viene desde el punto penal.
import * as THREE from 'three';
import { makeGoal, makeBall } from '../props.js';
import { tex } from '../textures.js';
import { follow, plane, std, rowX } from './util.js';

const GAP = 4.4;

export default {
  camera(n) { const w = Math.max(1, n) * GAP; return { pos: [0, 3.2 + w * 0.12, 5 + w * 0.55], look: [0, 1, 0] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(90, 60, std({ map: tex.grass([22, 15]) })));
    // Franjas de césped cortado
    for (let i = -6; i <= 6; i++) group.add(plane(90, 2, std({ color: i % 2 ? '#6db35c' : '#7cc46b', transparent: true, opacity: 0.5 }), { y: 0.005, z: i * 2 }));
    const line = std({ color: '#ffffff' });
    group.add(plane(n * GAP + 4, 0.1, line, { y: 0.01, z: 0.05 }));
    const goals = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const goal = makeGoal(3.2, 1.8); goal.position.set(x, 0, 0); group.add(goal);
      group.add(plane(0.3, 0.3, line, { x, y: 0.011, z: 6 })); // punto penal
      const g = ctx.addChar(p, x, 0.4);
      g.rotation.y = 0;
      const ball = makeBall(0.28); ball.visible = false; group.add(ball);
      goals.set(p.id, { x, g, ball, lastPos: 1, dive: 0, lastShotN: -1 });
    });
    // Tribuna de fondo
    const stand = new THREE.Mesh(new THREE.BoxGeometry(n * GAP + 16, 4, 3), std({ color: '#74acdf' }));
    stand.position.set(0, 2, -8); group.add(stand);
    for (let i = 0; i < 40; i++) {
      const fan = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), std({ color: ['#ffffff', '#74acdf', '#f6b40e', '#e14b3c'][i % 4] }));
      fan.position.set((Math.random() - 0.5) * (n * GAP + 14), 4.3 + Math.random() * 0.4, -8 + (Math.random() - 0.5) * 2);
      fan.userData.ph = Math.random() * 6;
      group.add(fan);
    }
    return { goals };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-20 * dt);
    for (const e of s.ents) {
      const gl = st.goals.get(e.id); if (!gl) continue;
      const { g, ball } = gl;
      // Arquero se tira al lado elegido
      if (e.pos !== gl.lastPos) { gl.dive = 1; gl.diveDir = Math.sign(e.pos - gl.lastPos); gl.lastPos = e.pos; }
      gl.dive = Math.max(0, gl.dive - dt * 3);
      follow(g, gl.x + (e.pos - 1) * 1.15, 0.4, k);
      g.rotation.z = -(gl.diveDir || 0) * Math.sin(gl.dive * Math.PI) * 0.9;
      g.userData.body.position.y = Math.sin(gl.dive * Math.PI) * 0.4;
      // Pelota
      if (e.shot) {
        if (e.shot.n !== gl.lastShotN) { gl.lastShotN = e.shot.n; ctx.sfx('kick'); }
        const p = e.shot.p;
        const tx = gl.x + (e.shot.dir - 1) * 1.15;
        // Arranca recta y dobla al final: hay que leerla rápido
        ball.position.set(gl.x + (tx - gl.x) * p * p, 0.3 + Math.sin(p * Math.PI) * 0.8 + p * 0.3, 6 - 5.6 * p);
        ball.rotation.x -= dt * 12;
        ball.visible = true;
      } else if (e.last) {
        const tx = gl.x + (e.last.dir - 1) * 1.15;
        if (e.last.saved) { ball.position.x += (tx + (e.last.dir - 1) * 2 - ball.position.x) * dt * 4; ball.position.z += dt * 6; ball.position.y = Math.max(0.3, ball.position.y - dt); }
        else { ball.position.set(tx, 0.6, -0.6); }
        ball.visible = true;
      } else ball.visible = false;
    }
    for (const m of ctx.group.children) if (m.userData.ph != null) m.position.y = 4.3 + Math.abs(Math.sin(time * 6 + m.userData.ph)) * 0.3;
  },
};
