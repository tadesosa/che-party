// Escena: Pesca en la Escollera — las piedras de la escollera con cada pescador, su caña y el corcho en el agua.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, rowX } from './util.js';

const GAP = 2.8;
const FISH = { mojarrita: ['#c0c8d0', 0.6], pejerrey: ['#9fb8c8', 0.9], corvina: ['#b59a6a', 1.3] };

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 5 + w * 0.15, 7 + w * 0.45], look: [0, 0.5, -2] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(120, 80, std({ map: tex.water([30, 20]), color: '#3d86b8', roughness: 0.1 }), { y: -0.3 }));
    // La escollera: piedrones en fila
    for (let i = -12; i <= 12; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 0), std({ color: '#7a7a7a', flatShading: true }));
      r.position.set(i * 1.6, 0, 1.2 + (i % 2) * 0.4); r.rotation.set(i, i * 2, 0); group.add(r);
    }
    const spots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const g = ctx.addChar(p, x, 1.2); g.position.y = 1;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 3, 6), std({ color: '#5a3a22' }));
      rod.position.set(x + 0.4, 2.2, 0); rod.rotation.x = -0.9; group.add(rod);
      const floatM = new THREE.Group();
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), std({ color: '#e14b3c' })); top.position.y = 0.08; floatM.add(top);
      const bot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), std({ color: '#ffffff' })); bot.position.y = -0.08; floatM.add(bot);
      floatM.position.set(x + 0.4, -0.25, -2.6); group.add(floatM);
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 4), std({ color: '#eeeeee' })); group.add(line);
      const fish = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.5, 4, 8), std({ color: '#c0c8d0' })); fish.rotation.z = Math.PI / 2; fish.visible = false; group.add(fish);
      spots.set(p.id, { x, g, rod, floatM, line, fish, flyT: 0, gotKey: null });
    });
    return { spots };
  },
  update(ctx, st, s, dt, time) {
    for (const e of s.ents) {
      const sp = st.spots.get(e.id); if (!sp) continue;
      const bite = e.state === 'bite';
      sp.floatM.position.y = bite ? -0.55 + Math.sin(time * 25) * 0.08 : -0.25 + Math.sin(time * 2 + sp.x) * 0.05;
      if (bite && !sp.bitShown) { sp.bitShown = true; ctx.sfx('select'); ctx.splash(sp.floatM.position.clone()); }
      if (!bite) sp.bitShown = false;
      // Línea desde la punta de la caña hasta el corcho
      const tip = new THREE.Vector3(sp.x + 0.4, 2.2 + Math.cos(0.9) * 1.5, -Math.sin(0.9) * 1.5);
      const f = sp.floatM.position;
      sp.line.position.copy(tip).add(f).multiplyScalar(0.5); sp.line.scale.y = tip.distanceTo(f);
      sp.line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.clone().sub(tip).normalize());
      sp.rod.rotation.x = bite ? -0.7 + Math.sin(time * 20) * 0.05 : -0.9;
      // Pez sacado: vuela hacia el pescador
      if (e.got && e.got + e.n !== sp.gotKey) {
        sp.gotKey = e.got + e.n; sp.flyT = 1;
        const [col, size] = FISH[e.got] || FISH.mojarrita;
        sp.fish.material.color.set(col); sp.fish.scale.setScalar(size);
        ctx.sfx(e.got === 'corvina' ? 'gold' : 'good');
      }
      sp.flyT = Math.max(0, sp.flyT - dt * 1.2);
      sp.fish.visible = sp.flyT > 0;
      if (sp.fish.visible) { const k = 1 - sp.flyT; sp.fish.position.set(sp.x + 0.4, 0 + Math.sin(k * Math.PI) * 3, -2.6 + k * 3.6); sp.fish.rotation.y += dt * 10; }
      sp.g.rotation.y = Math.PI;
      sp.g.userData.body.rotation.z = e.scare ? Math.sin(time * 20) * 0.2 : 0;
    }
  },
};
