// Escena: Corte de Luz — el living de una casa a oscuras. Solo se ve lo que alumbran las linternas.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std } from './util.js';

function makeFuseBox() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.4), std({ color: '#c9c9c9', metalness: 0.4, roughness: 0.4 })); box.position.y = 0.55; g.add(box);
  const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 3), new THREE.MeshBasicMaterial({ color: '#ffd84a' })); bolt.position.set(0, 0.6, 0.22); bolt.rotation.z = Math.PI; g.add(bolt);
  return g;
}

export default {
  camera: { pos: [0, 17, 12], look: [0, 0, 0.5] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(90, 70, std({ map: tex.wood([22, 18]) })));
    const F = 9;
    // Muebles para que no sea un piso vacío
    const furn = [[-5, -5, 3, 1.2, '#7b4a2d'], [5, 4, 2.5, 1.5, '#4a6fa5'], [-4, 5, 1.6, 1.6, '#a05a5a'], [4, -4, 1.4, 1, '#6b8e4e']];
    for (const [x, z, w, d, c] of furn) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), std({ color: c })); m.position.set(x, 0.4, z); group.add(m); }
    for (const [x, z, w, d] of [[0, -F - 0.2, F * 2, 0.4], [0, F + 0.2, F * 2, 0.4], [-F - 0.2, 0, 0.4, F * 2], [F + 0.2, 0, 0.4, F * 2]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), std({ color: '#d9cdb2' })); wall.position.set(x, 0.6, z); group.add(wall);
    }
    for (const p of players) ctx.addChar(p, 0, 0);
    const fuse = makeFuseBox(); group.add(fuse);
    // La oscuridad: un techo negro con agujeros donde alumbran las linternas
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const texture = new THREE.CanvasTexture(c);
    const dark = plane(F * 2 + 1, F * 2 + 1, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), { y: 2.6 });
    dark.renderOrder = 10; group.add(dark);
    return { c, texture, fuse, F: F + 0.5, fuseN: 0, flash: 0 };
  },
  update(ctx, st, s, dt, time) {
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k);
      face(g, e.ang, k);
      walkAnim(g, time, speedOf(g, dt) / 6, g.id);
    }
    if (s.fuse.n !== st.fuseN) {
      if (st.fuseN) { st.flash = 1; ctx.sfx('gold'); }
      st.fuseN = s.fuse.n;
    }
    st.fuse.position.set(s.fuse.x, 0, s.fuse.z);
    st.fuse.children[1].material.color.setHSL(0.14, 1, 0.5 + Math.sin(time * 8) * 0.2);
    st.flash = Math.max(0, st.flash - dt * 2);
    // Repintar la oscuridad: negro casi total menos los círculos de luz (y un flash cuando vuelve la luz)
    const x = st.c.getContext('2d'), W = st.c.width, sc = W / (st.F * 2);
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, W, W);
    x.fillStyle = `rgba(8,10,25,${0.93 - st.flash * 0.8})`; x.fillRect(0, 0, W, W);
    x.globalCompositeOperation = 'destination-out';
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      const cx = (g.position.x + st.F) * sc, cy = (g.position.z + st.F) * sc, r = s.light * sc;
      const grad = x.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = grad; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
    st.texture.needsUpdate = true;
  },
};
