// Escena: Subte en Hora Pico — el interior de un vagón de la línea A, con asientos de madera a los costados.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { follow, face, walkAnim, speedOf, plane, std, canvasPlane, tbox } from './util.js';

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
    // El túnel alrededor: piso de piedra oscura y paredes de ladrillo
    group.add(plane(60, 40, std({ map: tex.granito([20, 14]), color: '#5a5a60' })));
    group.add(tbox(60, 6, 0.4, std({ map: tex.ladrilloClaro(), color: '#4a4640' }), 1.4, { y: 3, z: -(LZ + 4) }));
    group.add(plane(LX * 2 + 1, LZ * 2 + 2.4, std({ map: tex.wood([8, 2]), color: '#c9a77a' }), { y: 0.02 }));
    // El vagón de La Brugeoise: madera abajo, crema arriba, ventanas con marco de bronce
    const wood = std({ map: tex.boiserie(), color: '#9a6236', roughness: 0.55 }), cream = std({ map: tex.revoque(), color: '#efe2c0' });
    const brass = std({ color: '#c9a227', metalness: 0.7, roughness: 0.3 });
    group.add(tbox(LX * 2 + 1, 1.3, 0.15, wood, 1.1, { y: 0.65, z: LZ + 1.25 }));
    group.add(tbox(LX * 2 + 1.4, 0.08, 0.3, brass, 1, { y: 1.34, z: LZ + 1.25 }));
    group.add(tbox(LX * 2 + 1, 1.6, 0.15, wood, 1.1, { y: 0.8, z: -(LZ + 1.25) }));
    group.add(tbox(LX * 2 + 1, 2.4, 0.15, cream, 1.4, { y: 2.8, z: -(LZ + 1.25) }));
    group.add(tbox(LX * 2 + 1.2, 0.12, 0.3, brass, 1, { y: 1.62, z: -(LZ + 1.15) }));
    group.add(tbox(LX * 2 + 1.2, 0.2, 0.25, wood, 1, { y: 4.05, z: -(LZ + 1.15) }));
    // Puertas corredizas en las puntas
    const doorGlass = new THREE.MeshPhysicalMaterial({ color: '#9fc4dc', transparent: true, opacity: 0.45, roughness: 0.05 });
    for (const sx of [-1, 1]) {
      group.add(tbox(0.15, 4, LZ * 2 + 2.5, wood, 1.1, { x: sx * (LX + 0.6), y: 2, z: 0 }));
      const door = tbox(0.05, 2.4, 1.2, doorGlass, 1, { x: sx * (LX + 0.5), y: 2.2, z: -0.4 }); door.castShadow = false; group.add(door);
    }
    const windows = [], frameGeo = new THREE.BoxGeometry(2.0, 1.4, 0.05);
    for (let i = 0; i < 6; i++) {
      const fr = new THREE.Mesh(frameGeo, brass); fr.position.set(-6.5 + i * 2.6, 2.6, -(LZ + 1.17)); group.add(fr);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshBasicMaterial({ color: '#141824' }));
      win.position.set(-6.5 + i * 2.6, 2.6, -(LZ + 1.14)); group.add(win); windows.push(win);
    }
    // Publicidades entre las ventanas
    const ADS = [['¡TOMÁ MATE!', '#2e7d4f', '#f6d36b'], ['ALFAJORES', '#5a2a18', '#ffffff'], ['DULCE DE LECHE', '#f4efe2', '#7a4a2b'], ['VOTE A SIFÓN', '#1b2a4a', '#f6b40e'], ['FERNET', '#2a140a', '#ffffff']];
    ADS.forEach(([t, bg, fg], i) => {
      const ad = canvasPlane(0.55, 0.95, (x, w, h) => {
        x.fillStyle = bg; x.fillRect(0, 0, w, h);
        x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
        x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
        const words = t.split(' ');
        words.forEach((wd, k) => { x.font = `bold ${Math.min(46, Math.floor(w / (wd.length * 0.62)))}px "Trebuchet MS", sans-serif`; x.fillText(wd, w / 2, h * (0.5 + (k - (words.length - 1) / 2) * 0.17)); });
      }, 256);
      ad.material.transparent = false;
      ad.position.set(-5.2 + i * 2.6, 2.75, -(LZ + 1.16)); group.add(ad);
    });
    // Caño para agarrarse y agarraderas colgando
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, LX * 2, 8), std({ color: '#d9dde2', metalness: 0.8, roughness: 0.25 }));
    bar.rotation.z = Math.PI / 2; bar.position.set(0, 3.55, 0); group.add(bar);
    const ring = std({ color: '#f2f2f2', roughness: 0.4 }), strap = std({ color: '#3a3a3a' }), ringGeo = new THREE.TorusGeometry(0.12, 0.03, 6, 12), strapGeo = new THREE.BoxGeometry(0.04, 0.3, 0.02);
    for (let i = 0; i < 8; i++) {
      const h = new THREE.Mesh(ringGeo, ring); h.position.set(-7 + i * 2, 3.15, 0); group.add(h);
      const s = new THREE.Mesh(strapGeo, strap); s.position.set(-7 + i * 2, 3.4, 0); group.add(s);
    }
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
