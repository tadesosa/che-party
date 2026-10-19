// Escena: Duelo Criollo — en la pampa, al atardecer, con molino y ombú. ¡A desenfundar!
import * as THREE from 'three';
import { makeTree, animateChar } from '../models.js';
import { tex } from '../textures.js';
import { plane, std } from './util.js';

function makeMolino() {
  const g = new THREE.Group();
  const iron = std({ color: '#5a6470' });
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7, 5), iron);
    leg.position.set(x * 0.6, 3.5, z * 0.6); leg.rotation.set(z * 0.08, 0, -x * 0.08); g.add(leg);
  }
  const rotor = new THREE.Group(); rotor.position.set(0, 7, 0.4);
  for (let i = 0; i < 12; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.4, 0.03), std({ color: '#c9ced4' }));
    blade.position.y = 0.8; const arm = new THREE.Group(); arm.rotation.z = (i / 12) * Math.PI * 2; arm.add(blade); rotor.add(arm);
  }
  g.add(rotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 1.6), std({ color: '#c9ced4' })); tail.position.set(0, 7, -0.9); g.add(tail);
  g.userData.rotor = rotor;
  return g;
}

export default {
  camera: { pos: [0, 3.2, 11], look: [0, 1.6, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(140, 80, std({ map: tex.grass([30, 20]), color: '#e6c27a' })));
    // Sol del atardecer grande al fondo
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ color: '#ffb347', fog: false }));
    sunDisc.position.set(6, 6, -50); group.add(sunDisc);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(11, 40), new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.35, fog: false }));
    glow.position.set(6, 6, -50.1); group.add(glow);
    const molino = makeMolino(); molino.position.set(-12, 0, -14); group.add(molino);
    const ombu = makeTree(false); ombu.scale.set(2.2, 1.5, 2.2); ombu.position.set(13, 0, -12); group.add(ombu);
    // Alambrado
    for (let x = -30; x <= 30; x += 3) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5), std({ color: '#7a5a3a' })); post.position.set(x, 0.6, -8); group.add(post);
    }
    for (const y of [0.5, 0.9]) { const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 60, 3), std({ color: '#888' })); wire.rotation.z = Math.PI / 2; wire.position.set(0, y, -8); group.add(wire); }
    // Los duelistas, enfrentados
    players.forEach((p, i) => {
      let x, z, ry;
      if (n === 2) { x = i ? 3.4 : -3.4; z = 0; ry = i ? -Math.PI / 2 : Math.PI / 2; }
      else { const a = (i / n) * Math.PI * 2; x = Math.cos(a) * 3.5; z = Math.sin(a) * 2; ry = Math.atan2(-x, -z); }
      const g = ctx.addChar(p, x, z); g.rotation.y = ry;
    });
    const ya = ctx.label('¡YA!', '#ffffff', 3); ya.position.set(0, 4.2, 0); ya.visible = false; group.add(ya);
    return { molino, ya, lastWinner: null, phase: null };
  },
  update(ctx, st, s, dt, time) {
    st.molino.userData.rotor.rotation.z += dt * 2;
    st.ya.visible = s.go;
    if (s.go) st.ya.scale.multiplyScalar(1 + Math.sin(time * 20) * 0.01);
    if (s.phase !== st.phase) {
      if (s.phase === 'go') ctx.sfx('go');
      if (s.phase === 'wait') { st.lastWinner = null; for (const g of ctx.chars.values()) g.userData.body.rotation.x = 0; }
      st.phase = s.phase;
    }
    if (s.handWinner && s.handWinner !== st.lastWinner) {
      st.lastWinner = s.handWinner;
      ctx.sfx('pop');
      const w = ctx.chars.get(s.handWinner);
      ctx.burst(w.position.clone().add(new THREE.Vector3(0, 2, 0)), 50, 5);
    }
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      const won = s.phase === 'result' && s.handWinner === e.id;
      const lost = s.phase === 'result' && s.handWinner && s.handWinner !== e.id;
      if (lost) g.userData.body.rotation.x += (-0.6 - g.userData.body.rotation.x) * Math.min(1, dt * 6);
      // Tensión: tiemblan esperando
      g.userData.body.position.y = s.phase === 'wait' ? Math.abs(Math.sin(time * 30 + g.id)) * 0.02 : 0;
      animateChar(g, time, { cheer: won, wave: e.foul, phase: g.id });
    }
  },
};
