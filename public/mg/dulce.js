// Escena: Revolvé el Dulce de Leche — la cocina de la abuela: azulejos, empapelado, una cocina con una olla por jugador.
// Al lado de cada olla, un medidor con la franja verde que pide la abuela y la aguja de lo rápido que revolvés.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, tbox, rowX, canvasPlane } from './util.js';

const GAP = 3;
const LIGHT = new THREE.Color('#e9b872'), DARK = new THREE.Color('#7a3f12'), BURNT = new THREE.Color('#2b160a');

function makeGauge() {
  const g = new THREE.Group();
  const basic = (color) => new THREE.MeshBasicMaterial({ color });
  const W = 2.2;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.14, 0.44, 0.05), basic('#1b2a4a')); frame.position.z = -0.03; g.add(frame);
  const bg = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, 0.06), basic('#fff3d6')); g.add(bg);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1, 0.31, 0.07), basic('#7fd18c')); g.add(band);
  const core = new THREE.Mesh(new THREE.BoxGeometry(1, 0.31, 0.08), basic('#2e9e48')); g.add(core);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.1), basic('#1b2a4a')); g.add(needle);
  const slow = canvasPlane(0.5, 0.25, (x, w, h) => { x.font = `bold ${h * 0.8}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🐢', w / 2, h / 2); }, 64);
  slow.position.set(-W / 2 - 0.35, 0, 0); g.add(slow);
  const fast = canvasPlane(0.5, 0.25, (x, w, h) => { x.font = `bold ${h * 0.8}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🐇', w / 2, h / 2); }, 64);
  fast.position.set(W / 2 + 0.35, 0, 0); g.add(fast);
  return Object.assign(g, { band, core, needle, W });
}

function makePot() {
  const g = new THREE.Group();
  const metal = std({ color: '#c9ccd2', roughness: 0.3, metalness: 0.75 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.75, 0.9, 28, 1, true), metal); wall.position.y = 0.45; g.add(wall);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.75, 28), metal); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.02; g.add(bottom);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 6, 28), metal); lip.rotation.x = Math.PI / 2; lip.position.y = 0.9; g.add(lip);
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12, Math.PI), std({ color: '#222', roughness: 0.6 })); h.position.set(sx * 0.98, 0.8, 0); h.rotation.z = sx * Math.PI / 2; g.add(h); }
  const dulce = new THREE.Mesh(new THREE.CircleGeometry(0.8, 28), std({ color: LIGHT.clone(), roughness: 0.35 })); dulce.rotation.x = -Math.PI / 2; dulce.position.y = 0.55; g.add(dulce);
  // Remolino del dulce que gira con la cuchara
  const swirl = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.6, 24, 1, 0, Math.PI * 1.3), new THREE.MeshBasicMaterial({ color: '#fff1d0', transparent: true, opacity: 0.25 }));
  swirl.rotation.x = -Math.PI / 2; swirl.position.y = 0.56; g.add(swirl);
  // Cuchara de madera
  const spoon = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.6, 8), std({ map: tex.madera(), color: '#c8935a' })); stick.position.y = 0.7; spoon.add(stick);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), std({ color: '#c8935a' })); bowl.scale.set(1, 0.4, 1.4); bowl.position.y = -0.05; spoon.add(bowl);
  spoon.position.y = 0.5; spoon.rotation.z = 0.35;
  const pivot = new THREE.Group(); pivot.add(spoon); g.add(pivot);
  spoon.position.x = 0.35;
  return { g, dulce, swirl, pivot, spoon };
}

export default {
  camera(n) { const w = Math.max(2, n) * GAP; return { pos: [0, 3.6 + w * 0.15, 5.6 + w * 0.36], look: [0, 1.9, -0.6] }; },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    const W = n * GAP + 2;
    group.add(plane(80, 50, std({ map: tex.marmol([40, 25]), color: '#efe7d8' })));
    // Pared: azulejos hasta la mitad, empapelado arriba, y la cocina enlozada
    const WW = W + 10;
    group.add(tbox(WW, 2.2, 0.3, std({ map: tex.azulejos(), color: '#f3efe6', roughness: 0.3 }), 0.9, { y: 1.1, z: -3.2 }));
    group.add(tbox(WW, 3.6, 0.3, std({ map: tex.empapelado(), color: '#f2d9a8' }), 1.6, { y: 4, z: -3.2 }));
    group.add(tbox(WW + 0.1, 0.12, 0.38, std({ color: '#9a6a3a' }), 1, { y: 2.2, z: -3.15 }));
    group.add(tbox(W, 0.95, 1.6, std({ color: '#f4f2ec', roughness: 0.25 }), 1, { y: 0.47, z: -0.4 }));
    group.add(tbox(W + 0.1, 0.06, 1.7, std({ color: '#2a2a2e', roughness: 0.4, metalness: 0.4 }), 1, { y: 0.97, z: -0.4 }));
    // Perillas en el frente
    for (let i = 0; i < n * 2; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12), std({ color: '#222' })); k.rotation.x = Math.PI / 2; k.position.set(-W / 2 + 0.6 + i * (W - 1.2) / Math.max(1, n * 2 - 1), 0.84, 0.42); group.add(k); }
    // Repasador colgado, frascos de dulce y reloj de pared
    const clock = canvasPlane(1.1, 1.1, (x, w, h) => {
      x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.46, 0, 7); x.fill();
      x.strokeStyle = '#7a4a26'; x.lineWidth = w * 0.06; x.stroke();
      x.strokeStyle = '#222'; x.lineWidth = w * 0.03;
      x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2, h * 0.2); x.moveTo(w / 2, h / 2); x.lineTo(w * 0.72, h / 2); x.stroke();
    }, 128);
    clock.position.set(W / 2 + 1.5, 4.3, -3.03); group.add(clock);
    for (let i = 0; i < 5; i++) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.4, 12), std({ color: '#8a4a1a', roughness: 0.2, transparent: true, opacity: 0.9 }));
      jar.position.set(-W / 2 - 1.3 + (i % 3) * 0.45, 2.5 + Math.floor(i / 3) * 0.6, -2.9); group.add(jar);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), std({ color: '#d63a2f' })); lid.position.copy(jar.position).y += 0.24; group.add(lid);
    }
    group.add(tbox(1.8, 0.06, 0.4, std({ map: tex.madera(), color: '#8a5530' }), 1, { x: -W / 2 - 0.9, y: 2.27, z: -2.9 }));
    group.add(tbox(1.8, 0.06, 0.4, std({ map: tex.madera(), color: '#8a5530' }), 1, { x: -W / 2 - 0.9, y: 2.87, z: -2.9 }));

    const slots = new Map();
    players.forEach((p, i) => {
      // La olla un poco a la izquierda y el cocinero adelante a la derecha, mirando la olla
      const x = rowX(i, n, GAP) - 0.4;
      // Hornalla con fueguito
      const burner = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 20), std({ color: '#111' })); burner.rotation.x = Math.PI / 2; burner.position.set(x, 1.02, -0.4); group.add(burner);
      const flame = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 20), new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: 0.8 })); flame.rotation.x = Math.PI / 2; flame.position.set(x, 1.07, -0.4); group.add(flame);
      const pot = makePot(); pot.g.position.set(x, 1.05, -0.4); group.add(pot.g);
      const gauge = makeGauge(); gauge.position.set(x, 0.55, 0.44); gauge.scale.setScalar(0.8); group.add(gauge);
      const arrow = canvasPlane(0.7, 0.7, () => {}, 128);
      arrow.position.set(x, 2.75, -0.4); arrow.scale.setScalar(0.9); group.add(arrow);
      const g = ctx.addChar(p, x + 1.35, 0.95);
      slots.set(p.id, { x, pot, gauge, flame, arrow, g, splashT: 0, steamT: 0 });
    });
    // Flechas de sentido (se pintan una vez para cada lado)
    const arrowTex = (dir) => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      x.strokeStyle = '#ffffff'; x.lineWidth = 14; x.lineCap = 'round';
      x.beginPath(); x.arc(64, 64, 40, -Math.PI * 0.9, Math.PI * 0.6); x.stroke();
      const a = Math.PI * 0.6, ex = 64 + Math.cos(a) * 40, ey = 64 + Math.sin(a) * 40;
      x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(ex - 22, ey - 4); x.lineTo(ex + 14, ey - 18); x.lineTo(ex + 6, ey + 20); x.fill();
      if (dir < 0) { const f = document.createElement('canvas'); f.width = f.height = 128; const fx = f.getContext('2d'); fx.translate(128, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0); return f; }
      return c;
    };
    const texCw = new THREE.CanvasTexture(arrowTex(1)), texCcw = new THREE.CanvasTexture(arrowTex(-1));
    for (const sl of slots.values()) { sl.arrow.material.map = texCw; sl.arrow.material.color.set('#2e9e48'); }
    return { slots, texCw, texCcw, said: null };
  },
  update(ctx, st, s, dt, time) {
    // La abuela grita los cambios
    if (s.said && s.said !== st.said) {
      ctx.floatText(s.said, new THREE.Vector3(0, 4.6, 0), s.said.includes('REVÉS') ? '#c0392b' : '#b8860b');
      ctx.sfx(s.said.includes('REVÉS') ? 'horn' : 'whistle');
    }
    st.said = s.said;
    for (const e of s.ents) {
      const sl = st.slots.get(e.id); if (!sl) continue;
      const gz = sl.gauge, W = gz.W;
      const lo = Math.max(0, s.target - s.band), hi = Math.min(1, s.target + s.band);
      gz.band.scale.x = (hi - lo) * W; gz.band.position.x = ((lo + hi) / 2 - 0.5) * W;
      gz.core.scale.x = s.band * W; gz.core.position.x = (s.target - 0.5) * W;
      const nx = (Math.max(-0.05, Math.min(1.05, e.v)) - 0.5) * W;
      gz.needle.position.x += (nx - gz.needle.position.x) * Math.min(1, dt * 14);
      // Cuchara girando con lo que revuelve el jugador (+ = como el reloj visto desde arriba)
      sl.pot.pivot.rotation.y -= e.spin * Math.PI * 2 * dt;
      sl.pot.swirl.rotation.z -= e.spin * Math.PI * 2 * dt;
      // El dulce se oscurece a medida que se hace; si se pega, se quema
      const col = sl.pot.dulce.material.color;
      col.copy(LIGHT).lerp(DARK, e.lvl).lerp(BURNT, e.burn * 0.6);
      sl.pot.dulce.position.y = 0.5 + e.lvl * 0.2;
      sl.pot.swirl.position.y = sl.pot.dulce.position.y + 0.01;
      sl.flame.scale.setScalar(1 + Math.sin(time * 20 + sl.x) * 0.04);
      sl.arrow.material.map = s.dir > 0 ? st.texCw : st.texCcw;
      sl.arrow.material.color.set(e.state === 'reves' ? '#c0392b' : '#2e9e48');
      sl.arrow.rotation.z -= s.dir * dt * 2;
      // Salpica si va muy rápido
      sl.splashT -= dt;
      if (e.state === 'salpica' && sl.splashT <= 0) { sl.splashT = 0.35; ctx.burst(new THREE.Vector3(sl.x, 1.9, -0.4), 6, 2.5); }
      // El personaje se balancea al ritmo de la cuchara
      const g = sl.g; g.rotation.y = -0.55;
      const sw = Math.min(1, Math.abs(e.spin) / 2);
      g.userData.body.rotation.z = Math.sin(time * Math.PI * 2 * Math.abs(e.spin)) * 0.14 * sw;
      g.userData.body.rotation.x = e.state === 'salpica' ? -0.2 : e.state === 'pega' ? 0.15 : 0;
    }
  },
};
