// Escena: Parapente en las Sierras — vista de arriba del valle; cada parapente con su vela de color,
// su sombra en el piso (para ver la altura), térmicas que suben y aros dorados flotando.
import * as THREE from 'three';
import { plane, std } from './util.js';
import { tex } from '../textures.js';
import { makeSierra } from '../decor2.js';

function makeCanopy(color) {
  const g = new THREE.Group();
  const sail = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 8, 0, Math.PI * 2, 0, Math.PI / 5), new THREE.MeshPhysicalMaterial({ color, side: THREE.DoubleSide, roughness: 0.5, clearcoat: 0.4 }));
  sail.scale.set(1.4, 0.7, 0.55); sail.position.y = 0.4; g.add(sail);
  const line = std({ color: '#3a3a3a' });
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.9, 4), line); l.position.set(sx * 0.7, -0.5, 0); l.rotation.z = sx * 0.35; g.add(l); }
  return g;
}

export default {
  camera: { pos: [0, 24, 17], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players, CH } = ctx;
    group.add(plane(140, 100, std({ map: tex.grass([30, 22]), color: '#cfe0a8' })));
    // Ríos y sierras abajo
    const river = plane(4, 90, new THREE.MeshPhysicalMaterial({ color: '#3d86b8', map: tex.water([1, 20]), roughness: 0.1, clearcoat: 1 }), { y: 0.02, x: -8 }); river.rotation.z = 0.5; group.add(river);
    for (const [x, z, r] of [[-26, -16, 8], [24, -18, 9], [-24, 14, 7], [26, 12, 8], [0, -26, 11]]) { const s = makeSierra(r, r * 0.55, '#5f8f3c'); s.position.set(x, 0, z); group.add(s); }
    const gliders = new Map();
    for (const p of players) {
      const g = ctx.addChar(p, 0, 0, 0.8);
      const canopy = makeCanopy(CH[p.char].color); group.add(canopy);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; group.add(shadow);
      gliders.set(p.id, { g, canopy, shadow });
    }
    return { gliders, rings: new Map(), therms: [] };
  },
  update(ctx, st, s, dt, time) {
    // Térmicas: columnas de aire transparente que giran
    while (st.therms.length < s.therms.length) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 10, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      ctx.group.add(m); st.therms.push(m);
    }
    st.therms.forEach((m, i) => {
      const th = s.therms[i];
      m.visible = !!th;
      if (th) { m.position.set(th.x, 5, th.z); m.scale.set(th.r, 1, th.r); m.rotation.y += dt * 2; }
    });
    const live = new Set();
    for (const r of s.rings) {
      live.add(r.id);
      let m = st.rings.get(r.id);
      if (!m) {
        m = new THREE.Group();
        const torus = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.18, 10, 28), new THREE.MeshStandardMaterial({ color: r.gold ? '#ffd23f' : '#f6b40e', emissive: r.gold ? '#7a5a00' : '#3a2a00', metalness: 0.6, roughness: 0.3 }));
        m.add(torus);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 }));
        m.add(pole); m.userData.pole = pole; m.userData.torus = torus;
        ctx.group.add(m); st.rings.set(r.id, m);
      }
      const y = r.alt + 1;
      m.position.set(r.x, y, r.z);
      m.userData.torus.rotation.y = time * 1.5;
      m.userData.pole.scale.y = y; m.userData.pole.position.y = -y / 2;
    }
    for (const [id, m] of st.rings) if (!live.has(id)) { ctx.burst(m.position.clone(), 30, 4); ctx.sfx('coin'); ctx.group.remove(m); st.rings.delete(id); }
    for (const e of s.ents) {
      const gl = st.gliders.get(e.id); if (!gl) continue;
      const y = e.landed ? 0 : e.alt + 1;
      gl.g.position.x += (e.x - gl.g.position.x) * Math.min(1, dt * 12);
      gl.g.position.z += (e.z - gl.g.position.z) * Math.min(1, dt * 12);
      gl.g.position.y += (y - gl.g.position.y) * Math.min(1, dt * 6);
      gl.g.rotation.y = e.hd;
      gl.canopy.visible = !e.landed;
      gl.canopy.position.set(gl.g.position.x, gl.g.position.y + 2.6, gl.g.position.z);
      gl.canopy.rotation.y = e.hd;
      gl.canopy.rotation.z = Math.sin(time * 2 + e.x) * 0.08;
      gl.shadow.position.set(gl.g.position.x, 0.05, gl.g.position.z);
      gl.shadow.scale.setScalar(0.6 + y * 0.05);
      gl.g.userData.arms.forEach((a) => { a.rotation.z = a.userData.side * 2.6; });
      if (e.lift && Math.random() < dt * 6) ctx.burst(gl.g.position.clone().add(new THREE.Vector3(0, -0.5, 0)), 3, 1);
    }
  },
};
