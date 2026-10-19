// Escena: Mate Caliente — ronda en el patio, el mate pasa de mano en mano y se va calentando.
import * as THREE from 'three';
import { makeTree, animateChar } from '../models.js';
import { makeBench } from '../props.js';
import { tex } from '../textures.js';
import { face, plane, std } from './util.js';

function makeMateCup() {
  const g = new THREE.Group();
  const pts = [[0.02, 0], [0.18, 0.02], [0.3, 0.12], [0.34, 0.3], [0.3, 0.48], [0.22, 0.58], [0.2, 0.62]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshPhysicalMaterial({ color: '#4f7a2c', roughness: 0.4, clearcoat: 0.6, emissive: '#000000' }));
  g.add(body);
  const bomb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 0.9, roughness: 0.2 }));
  bomb.position.set(0.06, 0.75, 0); bomb.rotation.z = -0.3; g.add(bomb);
  g.userData.body = body;
  return g;
}

export default {
  camera: { pos: [0, 9, 10.5], look: [0, 1, 0] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(60, 40, std({ map: tex.baldosa([14, 10]) })));
    const rug = new THREE.Mesh(new THREE.CircleGeometry(5.6, 40), std({ color: '#c0392b' }));
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01; group.add(rug);
    for (const [x, z, r] of [[-8, -4, 0.5], [8, -4, -0.5]]) { const b = makeBench(); b.position.set(x, 0, z); b.rotation.y = r; group.add(b); }
    for (const [x, z] of [[-11, -7], [11, -7], [0, -10]]) { const t = makeTree(x > 0); t.position.set(x, 0, z); group.add(t); }
    const R = 3.8;
    const spots = new Map();
    players.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2;
      const g = ctx.addChar(p, Math.cos(a) * R, Math.sin(a) * R);
      g.rotation.y = Math.atan2(-g.position.x, -g.position.z);
      spots.set(p.id, g.position.clone());
    });
    const mate = makeMateCup(); mate.scale.setScalar(1.9); mate.visible = false; group.add(mate);
    const steam = [];
    return { mate, spots, holder: null, fly: null, steam, burned: null };
  },
  update(ctx, st, s, dt, time) {
    const above = (id) => { const g = ctx.chars.get(id); return g.position.clone().add(new THREE.Vector3(0, (g.userData.top || 1.8) + 0.4, 0)); };
    // El mate vuela al nuevo dueño
    if (s.holder && s.holder !== st.holder) {
      st.fly = st.holder ? { from: above(st.holder), t: 0 } : null;
      st.holder = s.holder;
      ctx.sfx('swoosh');
    }
    st.mate.visible = !!s.holder;
    if (s.holder) {
      const to = above(s.holder);
      if (st.fly) {
        st.fly.t += dt / 0.35;
        const u = Math.min(1, st.fly.t);
        st.mate.position.lerpVectors(st.fly.from, to, u);
        st.mate.position.y += Math.sin(u * Math.PI) * 2;
        st.mate.rotation.z = u * Math.PI * 2;
        if (u >= 1) st.fly = null;
      } else {
        st.mate.position.copy(to);
        st.mate.rotation.z = Math.sin(time * 20) * 0.15 * (0.3 + s.heat);
      }
      // Se pone rojo y humea a medida que se calienta
      const heat = Math.max(0, Math.min(1, s.heat));
      st.mate.userData.body.material.emissive.setRGB(heat * 0.8, heat * 0.15, 0);
      if (Math.random() < dt * (4 + heat * 20)) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
        p.position.copy(st.mate.position).add(new THREE.Vector3(0, 0.9, 0));
        ctx.group.add(p); st.steam.push({ m: p, life: 1 });
      }
    }
    for (let i = st.steam.length - 1; i >= 0; i--) {
      const sm = st.steam[i]; sm.life -= dt;
      sm.m.position.y += dt * 1.6; sm.m.scale.setScalar(1 + (1 - sm.life) * 2); sm.m.material.opacity = sm.life * 0.7;
      if (sm.life <= 0) { ctx.group.remove(sm.m); st.steam.splice(i, 1); }
    }
    if (s.burned && s.burned !== st.burned) {
      st.burned = s.burned;
      const g = ctx.chars.get(s.burned);
      ctx.burst(g.position.clone().add(new THREE.Vector3(0, 2, 0)), 60, 6);
      ctx.sfx('pop');
    }
    if (!s.burned) st.burned = null;
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      const base = st.spots.get(e.id);
      if (!e.alive) {
        // El que se quemó se va para atrás, chiquito
        g.position.x += (base.x * 1.5 - g.position.x) * dt * 2; g.position.z += (base.z * 1.5 - g.position.z) * dt * 2;
        g.scale.setScalar(Math.max(0.65, g.scale.x - dt));
        g.userData.body.rotation.x = 0.4;
        continue;
      }
      const has = s.holder === e.id;
      face(g, Math.atan2(-g.position.x, -g.position.z), Math.min(1, dt * 8));
      g.userData.body.position.y = has ? Math.abs(Math.sin(time * 18)) * 0.15 : 0;
      animateChar(g, time, { cheer: has, phase: g.id });
    }
  },
};
