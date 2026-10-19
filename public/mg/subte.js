// Escena: Subte en Hora Pico — el interior de un vagón de la línea A, con asientos de madera a los costados.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std, canvasPlane } from './util.js';

const LX = 8, LZ = 1.6;

function stationSign(name) {
  return canvasPlane(5, 0.8, (x, w, h) => {
    x.fillStyle = '#1b2a4a'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffffff'; x.font = `bold ${h * 0.55}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Ⓐ ' + name.toUpperCase(), w / 2, h / 2 + 2);
  }, 512);
}

export default {
  camera: { pos: [0, 10, 9], look: [0, 0, 0] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(60, 40, std({ color: '#2a2a30' })));
    group.add(plane(LX * 2 + 1, LZ * 2 + 2.4, std({ map: tex.wood([8, 2]), color: '#c9a77a' }), { y: 0.02 }));
    // Paredes bajas del vagón (no tapan la vista) con ventanas
    const wall = std({ color: '#d9c9a3' });
    for (const z of [-(LZ + 1.25), LZ + 1.25]) { const w = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 + 1, 1.3, 0.15), wall); w.position.set(0, 0.65, z); group.add(w); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 + 1, 4, 0.15), wall); back.position.set(0, 2, -(LZ + 1.25)); group.add(back);
    const windows = [];
    for (let i = 0; i < 6; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshBasicMaterial({ color: '#141824' }));
      win.position.set(-6.5 + i * 2.6, 2.6, -(LZ + 1.16)); group.add(win); windows.push(win);
    }
    // Agarraderas colgando
    for (let i = 0; i < 8; i++) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), std({ color: '#f2f2f2' })); h.position.set(-7 + i * 2, 3.3, 0); group.add(h); }
    for (const p of players) ctx.addChar(p, 0, 0);
    return { seats: [], windows, sign: null, signName: '', tunnel: 0 };
  },
  update(ctx, st, s, dt, time) {
    if (!st.seats.length) {
      st.seats = s.seats.map((se) => {
        const g = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.7), std({ map: tex.wood([1, 1]), color: '#a0703c' })); seat.position.y = 0.55; g.add(seat);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.8), new THREE.MeshBasicMaterial({ color: '#f6b40e', transparent: true, opacity: 0.8 })); glow.position.y = 0.66; g.add(glow);
        g.position.set(se.x, 0, se.z); g.userData.glow = glow;
        ctx.group.add(g); return g;
      });
    }
    s.seats.forEach((se, i) => { const g = st.seats[i]; g.userData.glow.visible = se.free; g.userData.glow.material.opacity = 0.5 + Math.sin(time * 8) * 0.3; });
    if (s.phase === 'station' && s.name !== st.signName) {
      st.signName = s.name;
      if (st.sign) ctx.group.remove(st.sign);
      st.sign = stationSign(s.name); st.sign.position.set(0, 4.3, -(LZ + 1.1)); ctx.group.add(st.sign);
      ctx.sfx('whistle');
    }
    // Ventanas: luces del túnel pasando mientras anda; andén iluminado en la estación
    st.tunnel += dt;
    st.windows.forEach((w, i) => w.material.color.set(s.phase === 'station' ? '#e8dcb5' : Math.sin(st.tunnel * 12 + i) > 0.85 ? '#f2e3a0' : '#141824'));
    const sway = s.phase === 'ride' ? Math.sin(time * 1.7) * 0.03 : 0;
    ctx.group.rotation.z = sway * 0.3;
    const k = 1 - Math.exp(-22 * dt);
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      follow(g, e.x, e.z, k, e.sit ? 0.45 : 0);
      if (e.sit) g.rotation.y = e.z < 0 ? 0 : Math.PI; else face(g, e.ang, k);
      walkAnim(g, time, e.sit ? 0 : speedOf(g, dt) / 6, g.id);
    }
  },
};
