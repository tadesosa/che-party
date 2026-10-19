// Escena: Abducción en el Uritorco — un campamento de noche al pie del cerro. El ovni flota arriba con su rayo
// verde; donde abducen a alguien queda su carpa con un cartel de SOS para que lo rescaten.
import * as THREE from 'three';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';
import { makeUfo, makePeak, makePine } from '../decor2.js';

function makeTent(color) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.ConeGeometry(1, 1.3, 4), new THREE.MeshPhysicalMaterial({ color, roughness: 0.6 }));
  t.rotation.y = Math.PI / 4; t.position.y = 0.65; g.add(t);
  const sos = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.05), new THREE.MeshBasicMaterial({ color: '#ffe680' }));
  sos.position.set(0, 1.8, 0); g.add(sos);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4), std({ color: '#5a3a22' })); pole.position.y = 1.3; g.add(pole);
  return g;
}

export default {
  camera: { pos: [0, 17, 15], look: [0, 0, 0] },
  build(ctx) {
    const { group, players, CH } = ctx;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), new THREE.MeshBasicMaterial({ color: '#0d1838', side: THREE.BackSide, fog: false }));
    group.add(dome);
    group.add(plane(140, 100, std({ color: '#26402a' })));
    group.add(plane(23, 16, std({ color: '#3a5a34' }), { y: 0.01 }));
    const uri = makePeak(14, 18, { color: '#3a3a30', snow: 0, seg: 9 }); uri.position.set(0, 0, -30); group.add(uri);
    for (let i = 0; i < 18; i++) { const t = makePine(3.4); const a = (i / 18) * Math.PI * 2; t.position.set(Math.cos(a) * 15, 0, Math.sin(a) * 11); group.add(t); }
    const fire = new THREE.PointLight('#ffb050', 25, 18); fire.position.set(0, 1.5, 5.5); group.add(fire);
    const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8), std({ color: '#5a3a22' })); logs.position.set(0, 0.15, 5.5); group.add(logs);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshBasicMaterial({ color: '#ff9a2a' })); flame.position.set(0, 0.7, 5.5); group.add(flame);
    const ufo = makeUfo(); group.add(ufo);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#7dffb0', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    group.add(beam);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#7dffb0', transparent: true, opacity: 0.35, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2; spot.position.y = 0.04; group.add(spot);
    const glow = new THREE.PointLight('#7dffb0', 30, 12); group.add(glow);
    const tents = new Map();
    for (const p of players) ctx.addChar(p, 0, 0);
    return { ufo, beam, spot, glow, flame, tents, CH };
  },
  update(ctx, st, s, dt, time) {
    const b = s.beam;
    st.ufo.position.x += (b.x - st.ufo.position.x) * Math.min(1, dt * 10);
    st.ufo.position.z += (b.z - st.ufo.position.z) * Math.min(1, dt * 10);
    st.ufo.position.y = 6.5 + Math.sin(time * 2) * 0.2;
    st.ufo.rotation.y += dt * 3;
    st.beam.position.set(st.ufo.position.x, 3.3, st.ufo.position.z); st.beam.scale.set(b.r, 1, b.r);
    st.spot.position.set(st.ufo.position.x, 0.04, st.ufo.position.z); st.spot.scale.setScalar(b.r);
    st.glow.position.set(st.ufo.position.x, 1, st.ufo.position.z);
    st.flame.scale.y = 1 + Math.sin(time * 15) * 0.15;
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      if (e.ufo) {
        // El del ovni va arriba, en la cúpula
        g.position.set(st.ufo.position.x, st.ufo.position.y + 0.1, st.ufo.position.z); g.scale.setScalar(0.45); g.rotation.y = time;
        continue;
      }
      // Carpa con SOS donde lo abdujeron
      let tent = st.tents.get(e.id);
      if (e.tent && !tent) { tent = makeTent(st.CH[ctx.players.find((p) => p.id === e.id).char].color); tent.position.set(e.tent.x, 0, e.tent.z); ctx.group.add(tent); st.tents.set(e.id, tent); ctx.sfx('ufo'); }
      if (!e.tent && tent) { ctx.group.remove(tent); st.tents.delete(e.id); ctx.burst(new THREE.Vector3(e.x, 1, e.z), 50, 5); ctx.sfx('gold'); }
      if (tent) tent.children[1].visible = Math.sin(time * 8) > 0;
      if (e.out) {
        // Sube por el rayo y desaparece en el ovni
        g.position.y = Math.min(g.position.y + dt * 6, 7);
        g.visible = g.position.y < 6.5;
        g.rotation.y += dt * 8;
        continue;
      }
      g.visible = true;
      follow(g, e.x, e.z, k, e.under * 1.2);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
      g.rotation.z = e.under > 0 ? Math.sin(time * 25) * 0.25 * e.under : 0;
    }
  },
};
