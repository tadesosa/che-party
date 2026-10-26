// Escena: Twister de Dedos — un living con una alfombra de twister por jugador. En cada alfombra están los mismos
// círculos que el jugador ve en su celu: los que tiene apretados brillan, el que soltó titila en rojo.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, tbox, rowX, canvasPlane } from './util.js';

const MW = 2.5, MH = 3.4, GAP = 3.3;

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 6.5 + w * 0.2, 6.2 + w * 0.32], look: [0, 0.2, -0.6] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length;
    const W = n * GAP + 6;
    group.add(plane(80, 50, std({ map: tex.wood([30, 18]), color: '#b8875a' })));
    // Living: empapelado, zócalo, sillón, lámpara y un cuadro
    group.add(tbox(W + 10, 6, 0.3, std({ map: tex.empapelado(), color: '#cfe0d4' }), 1.6, { y: 3, z: -4.2 }));
    group.add(tbox(W + 10, 0.3, 0.36, std({ color: '#7a4a26' }), 1, { y: 0.15, z: -4.02 }));
    const sofaMat = std({ color: '#8e3b46', roughness: 0.9 });
    const sx = W / 2 + 1.2;
    group.add(tbox(3.2, 0.6, 1.2, sofaMat, 1, { x: sx, y: 0.45, z: -3.2 }));
    group.add(tbox(3.2, 0.9, 0.35, sofaMat, 1, { x: sx, y: 1.1, z: -3.7 }));
    for (const s of [-1, 1]) group.add(tbox(0.3, 0.8, 1.2, sofaMat, 1, { x: sx + s * 1.6, y: 0.6, z: -3.2 }));
    const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.6, 16, 1, true), std({ color: '#f2e2b8', side: THREE.DoubleSide, emissive: '#ffe7a3', emissiveIntensity: 0.4 }));
    lamp.position.set(-W / 2 - 1.2, 2.3, -3.5); group.add(lamp);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 8), std({ color: '#333' })); stick.position.set(-W / 2 - 1.2, 1, -3.5); group.add(stick);
    const pic = canvasPlane(2.2, 1.4, (x, w, h) => {
      x.fillStyle = '#6b4a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#9ec8e8'; x.fillRect(12, 12, w - 24, h - 24);
      x.fillStyle = '#6aa84f'; x.beginPath(); x.moveTo(12, h - 12); x.lineTo(w * 0.35, h * 0.4); x.lineTo(w * 0.6, h * 0.7); x.lineTo(w * 0.8, h * 0.35); x.lineTo(w - 12, h - 12); x.fill();
    }, 256);
    pic.material.transparent = false; pic.position.set(0, 3.6, -4.03); group.add(pic);

    const slots = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), std({ color: '#f6f4ee', roughness: 0.7 }));
      mat.rotation.x = -Math.PI / 2; mat.position.set(x, 0.02, 0); group.add(mat);
      const border = tbox(MW + 0.2, 0.02, MH + 0.2, std({ color: CH[p.char].color }), 1, { x, y: 0 }); group.add(border);
      // El jugador atrás de su alfombra, inclinado sobre los círculos
      const g = ctx.addChar(p, x, -MH / 2 - 0.55);
      slots.set(p.id, { x, g, dots: new Map(), lean: 0, fall: 0 });
    });
    return { slots, dotGeo: new THREE.CircleGeometry(0.3, 28), ringGeo: new THREE.RingGeometry(0.34, 0.42, 28) };
  },
  update(ctx, st, s, dt, time) {
    const live = new Set(s.dots.map((d) => d.k));
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      // Círculos nuevos y los que se fueron
      for (const d of s.dots) {
        if (sl.dots.has(d.k)) continue;
        const m = new THREE.Mesh(st.dotGeo, new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.5 }));
        m.rotation.x = -Math.PI / 2; m.position.set(sl.x + (d.x - 0.5) * MW, 0.04, (d.y - 0.5) * MH);
        const ring = new THREE.Mesh(st.ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }));
        ring.rotation.x = -Math.PI / 2; ring.position.copy(m.position).y = 0.05;
        ctx.group.add(m, ring);
        sl.dots.set(d.k, { m, ring, born: time });
      }
      for (const [k, o] of sl.dots) if (!live.has(k)) { ctx.group.remove(o.m, o.ring); sl.dots.delete(k); }
      const held = new Set(e.held);
      for (const d of s.dots) {
        const o = sl.dots.get(d.k);
        const on = held.has(d.k);
        const pop = Math.min(1, (time - o.born) * 4);
        o.m.scale.setScalar(pop * (d.fresh && !on ? 1 + Math.sin(time * 12) * 0.12 : 1));
        o.ring.visible = on && e.lives > 0;
        // Si ya tendría que estar apretado y no lo está, titila en rojo
        const warn = !on && !d.fresh && e.lives > 0;
        o.m.material.emissive.set(warn && Math.sin(time * 20) > 0 ? '#ff0000' : on ? d.c : '#000000');
        o.m.material.emissiveIntensity = on ? 0.35 : 0.8;
        if (e.lives <= 0) o.m.material.color.set('#999999');
      }
      // El personaje se va torciendo con cada dedo; si se resbala, se tambalea; si se cae, queda acostado
      const g = sl.g;
      const want = Math.min(0.75, e.held.length * 0.11);
      sl.lean += (want - sl.lean) * Math.min(1, dt * 3);
      sl.fall += ((e.lives <= 0 ? 1 : 0) - sl.fall) * Math.min(1, dt * 4);
      const body = g.userData.body;
      body.rotation.z = Math.sin(time * 1.3 + sl.x) * sl.lean + (e.slip ? Math.sin(time * 30) * 0.25 : 0);
      body.rotation.x = sl.lean * 0.5 + sl.fall * 1.3;
      g.position.y = -sl.fall * 0.3;
      g.rotation.y = 0;
    }
  },
};
