// Escena: La Sortija de la Calesita — una calesita que gira con un caballito por jugador y la sortija colgando adelante.
import * as THREE from 'three';
import { makeTree } from '../models.js';
import { makeFarol } from '../props.js';
import { tex } from '../textures.js';
import { plane, std } from './util.js';

const R = 4.2;
const toy = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.6 });

function makeHorse(color) {
  const g = new THREE.Group();
  const m = toy(color);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 6, 12), m); body.rotation.z = Math.PI / 2; g.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.4, 4, 8), m); neck.position.set(0.55, 0.35, 0); neck.rotation.z = -0.6; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.24), m); head.position.set(0.8, 0.6, 0); g.add(head);
  for (const [x, z] of [[-0.35, -0.15], [-0.35, 0.15], [0.35, -0.15], [0.35, 0.15]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 6), m); leg.position.set(x, -0.4, z); g.add(leg);
  }
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.06), toy('#f6f2e8')); mane.position.set(0.55, 0.55, 0); mane.rotation.z = -0.6; g.add(mane);
  return g;
}

export default {
  camera: { pos: [0, 7.5, 17.5], look: [0, 2.6, 0] },
  build(ctx) {
    const { group, players, CH } = ctx;
    group.add(plane(90, 60, std({ map: tex.baldosa([30, 20]) })));
    for (const [x, z] of [[-12, -6], [12, -6], [-9, -11], [9, -11]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    for (const x of [-8, 8]) { const f = makeFarol(); f.position.set(x, 0, 3); group.add(f); }
    const spin = new THREE.Group(); group.add(spin);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.8, R + 0.9, 0.4, 40), toy('#e14b3c')); base.position.y = 0.2; spin.add(base);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.75, R + 0.75, 0.05, 40), std({ map: tex.wood([4, 4]) })); floor.position.y = 0.42; spin.add(floor);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5.6, 16), toy('#f2c230')); pole.position.y = 3; spin.add(pole);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(R + 1.4, 2, 24), toy('#2f86e0')); roof.position.y = 6.6; spin.add(roof);
    const stripes = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.4, R + 1.4, 0.5, 24, 1, true), toy('#ffffff')); stripes.material.side = THREE.DoubleSide; stripes.position.y = 5.4; spin.add(stripes);
    const horses = new Map();
    players.forEach((p) => {
      const arm = new THREE.Group(); spin.add(arm);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 8), std({ color: '#c9a227', metalness: 0.7, roughness: 0.3 })); rod.position.set(0, 3, R); arm.add(rod);
      const h = makeHorse(CH[p.char].color); h.position.set(0, 1.4, R); h.rotation.y = Math.PI / 2; arm.add(h);
      const g = ctx.addChar(p, 0, 0, 0.8);
      horses.set(p.id, { arm, h, g });
    });
    // La sortija: un aro dorado colgando adelante, a la altura del jinete
    const sortija = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 10, 28), std({ color: '#ffd84a', metalness: 0.8, roughness: 0.2, emissive: '#7a5b00', emissiveIntensity: 0.4 }));
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), std({ color: '#333' })); string.position.y = 1.2;
    sortija.add(ring, string);
    sortija.position.set(0, 3.6, R + 0.2); group.add(sortija);
    return { spin, horses, sortija, rot: 0 };
  },
  update(ctx, st, s, dt, time) {
    // Seguimos el giro del servidor suavizado
    let d = s.rot - st.rot; if (Math.abs(d) > 1) st.rot = s.rot; else st.rot += d * Math.min(1, dt * 12);
    for (const e of s.ents) {
      const hs = st.horses.get(e.id); if (!hs) continue;
      const a = st.rot + e.off;
      hs.arm.rotation.y = a;
      const bob = Math.sin(time * 5 + e.off * 3) * 0.25;
      hs.h.position.y = 1.4 + bob;
      hs.g.position.set(Math.sin(a) * R, 1.75 + bob, Math.cos(a) * R);
      hs.g.rotation.y = a + Math.PI / 2;
      hs.g.userData.ring.visible = false; hs.g.userData.blob.visible = false;
      if (e.got && !hs.gotShown) { hs.gotShown = true; ctx.burst(hs.g.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 50, 4); ctx.sfx('gold'); }
      if (!e.got) hs.gotShown = false;
      hs.g.userData.body.rotation.z = e.got ? Math.sin(time * 20) * 0.2 : e.miss ? -0.3 : 0;
    }
    st.sortija.rotation.y = time * 2;
    st.sortija.position.y = 3.6 + Math.sin(time * 1.5) * 0.08;
  },
};
