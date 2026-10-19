// Escena: Aguavivas — la orilla abajo, el mar con aguavivas flotando y la boya naranja al fondo.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, plane, std } from './util.js';

function makeJelly() {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#d58ff0', transparent: true, opacity: 0.7, roughness: 0.1 }));
  g.add(bell);
  for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.6, 4), new THREE.MeshBasicMaterial({ color: '#e9b8ff' })); const a = (i / 5) * Math.PI * 2; t.position.set(Math.cos(a) * 0.25, -0.3, Math.sin(a) * 0.25); g.add(t); }
  return g;
}

export default {
  camera: { pos: [0, 15, 14], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    const sea = plane(120, 80, std({ map: tex.water([30, 20]), color: '#3d86b8', roughness: 0.1 }), { y: 0 }); group.add(sea);
    group.add(plane(120, 30, std({ map: tex.sand([30, 8]) }), { y: 0.02, z: 7.5 + 15 }));
    const shoreLine = plane(40, 0.4, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }), { y: 0.04, z: 7.5 }); group.add(shoreLine);
    const buoy = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), std({ color: '#ef8a17' })); buoy.add(ball);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 20, 6), std({ color: '#ef8a17' })); line.rotation.z = Math.PI / 2; line.position.y = -0.3; buoy.add(line);
    buoy.position.set(0, 0.3, -7); group.add(buoy);
    for (const p of players) ctx.addChar(p, 0, 0);
    return { sea, buoy, jelly: [] };
  },
  update(ctx, st, s, dt, time) {
    st.sea.material.map.offset.y = time * 0.03;
    st.buoy.position.y = 0.3 + Math.sin(time * 2) * 0.1;
    while (st.jelly.length < s.jelly.length) { const j = makeJelly(); ctx.group.add(j); st.jelly.push(j); }
    s.jelly.forEach(([x, z], i) => { const j = st.jelly[i]; j.position.x += (x - j.position.x) * Math.min(1, dt * 10); j.position.z += (z - j.position.z) * Math.min(1, dt * 10); j.position.y = 0.2 + Math.sin(time * 3 + i) * 0.1; j.scale.y = 1 + Math.sin(time * 4 + i) * 0.15; });
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      const inWater = e.z < s.shore - 0.5;
      follow(g, e.x, e.z, k, inWater ? -0.7 : 0);
      face(g, e.ang, k);
      g.userData.body.rotation.x = inWater ? 0.6 : 0; // nadando
      g.userData.body.position.y = inWater ? Math.sin(time * 8 + g.id) * 0.08 : 0;
      g.userData.body.rotation.z = e.sting ? Math.sin(time * 25) * 0.3 : 0;
      g.userData.ring.visible = !inWater; g.userData.blob.visible = !inWater;
      if (e.sting && !g.userData.stung) { g.userData.stung = true; ctx.splash(g.position.clone().add(new THREE.Vector3(0, 0.5, 0))); }
      if (!e.sting) g.userData.stung = false;
    }
  },
};
