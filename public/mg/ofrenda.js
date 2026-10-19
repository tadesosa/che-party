// Escena: La Ofrenda a la Pachamama — una apacheta en el altiplano, con un pozo de ofrendas por jugador.
// El cielo cambia: sol ☀️ o tormenta ⛈️ con rayos. Los que se plantaron se corren a un costado.
import * as THREE from 'three';
import { plane, std, rowX, canvasPlane } from './util.js';
import { tex } from '../textures.js';
import { makeSevenColors, makeApacheta } from '../decor2.js';
import { makeCloud } from '../props.js';

const GAP = 3.6;

function potMesh() {
  const g = new THREE.Group();
  const clay = new THREE.MeshPhysicalMaterial({ color: '#b5623b', roughness: 0.7 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.7, 16, 1, true), clay); pot.position.y = 0.35; g.add(pot);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), new THREE.MeshStandardMaterial({ color: '#f2c230', emissive: '#5a4200', metalness: 0.6 })); g.add(fill);
  g.userData.fill = fill;
  return g;
}
function bigNumber() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  m.scale.set(2.2, 1.1, 1);
  m.userData.draw = (text, color = '#1b2a4a') => {
    const x = c.getContext('2d'); x.clearRect(0, 0, 256, 128);
    x.font = 'bold 84px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 12; x.strokeStyle = '#ffffff'; x.strokeText(text, 128, 66); x.fillStyle = color; x.fillText(text, 128, 66);
    t.needsUpdate = true;
  };
  return m;
}

export default {
  camera: { pos: [0, 8, 19], look: [0, 4.5, -3] },
  build(ctx) {
    const { group, players } = ctx;
    const n = players.length;
    group.add(plane(140, 100, std({ map: tex.dryGrass([30, 22]), color: '#d4a47c' })));
    for (const [x, z] of [[-26, -34], [0, -42], [26, -34]]) { const m = makeSevenColors(13, 18); m.position.set(x, 0, z); group.add(m); }
    const ap = makeApacheta(); ap.scale.setScalar(3); ap.position.set(0, 0, -5); group.add(ap);
    // El cielo: nubes que se oscurecen con la tormenta y un sol que aparece
    const clouds = [];
    for (let i = 0; i < 8; i++) { const c = makeCloud(); c.scale.setScalar(2.5); c.position.set(-18 + i * 5, 11 + (i % 2), -12); group.add(c); clouds.push(c); }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffd23f' })); sun.position.set(0, 14, -16); group.add(sun);
    const bolt = canvasPlane(2, 6, (x, w, h) => { x.fillStyle = '#fff6a0'; x.beginPath(); x.moveTo(w * 0.6, 0); x.lineTo(w * 0.2, h * 0.55); x.lineTo(w * 0.5, h * 0.55); x.lineTo(w * 0.3, h); x.lineTo(w * 0.85, h * 0.4); x.lineTo(w * 0.55, h * 0.4); x.closePath(); x.fill(); }, 64);
    bolt.position.set(0, 7, -6); bolt.visible = false; group.add(bolt);
    const seats = new Map();
    players.forEach((p, i) => {
      const x = rowX(i, n, GAP);
      const pot = potMesh(); pot.position.set(x, 0, 1.2); group.add(pot);
      const num = bigNumber(); num.position.set(x, 3.6, 1.2); group.add(num);
      const g = ctx.addChar(p, x, 2.4);
      seats.set(p.id, { x, pot, num, g, shown: '' });
    });
    const risk = bigNumber(); risk.scale.set(4, 2, 1); risk.position.set(0, 7.5, -4); group.add(risk);
    return { seats, clouds, sun, bolt, risk, last: null };
  },
  update(ctx, st, s, dt, time) {
    const storm = s.result === 'tormenta', sunny = s.result === 'sol';
    if (s.result !== st.last) { st.last = s.result; if (storm) { ctx.sfx('bad'); ctx.sfx('hit'); } if (sunny) ctx.sfx('gold'); }
    st.sun.visible = !storm;
    st.sun.scale.setScalar(sunny ? 1.3 + Math.sin(time * 6) * 0.05 : 0.8);
    st.clouds.forEach((c, i) => { c.position.x += Math.sin(time * 0.3 + i) * dt * 0.5; c.traverse((o) => { if (o.material) o.material.color && o.material.color.set(storm ? '#5a5f6a' : '#ffffff'); }); });
    st.bolt.visible = storm && Math.sin(time * 18) > 0.2;
    // Cartel con el riesgo de tormenta de esta ronda (y la cuenta regresiva)
    const txt = s.phase === 'decide' ? `⛈️ ${Math.round(s.risk * 100)}% · ${Math.ceil(s.left)}` : s.phase === 'show' ? (storm ? '⛈️ ¡TORMENTA!' : '☀️ ¡SOL!') : '';
    if (txt !== st.riskTxt) { st.riskTxt = txt; st.risk.userData.draw(txt, storm ? '#c0392b' : '#1b2a4a'); }
    for (const e of s.ents) {
      const se = st.seats.get(e.id); if (!se) continue;
      const label = e.state === 'banked' ? `✋${e.banked}` : e.state === 'lost' ? '0' : String(e.pot);
      if (label !== se.shown) { se.shown = label; se.num.userData.draw(label, e.state === 'banked' ? '#2e9e48' : e.state === 'lost' ? '#c0392b' : '#1b2a4a'); }
      se.pot.userData.fill.position.y = 0.1 + Math.min(0.6, (e.state === 'banked' ? e.banked : e.pot) / 60);
      se.pot.userData.fill.visible = e.state !== 'lost';
      // Los que se plantaron se corren para atrás y aplauden; los que siguen rezan; los que perdieron, cabizbajos
      const g = se.g;
      const tz = e.state === 'in' ? 2.4 : 4.6;
      g.position.z += (tz - g.position.z) * Math.min(1, dt * 4);
      g.position.x = se.x;
      if (e.state === 'in') { g.userData.arms.forEach((a) => { a.rotation.z = a.userData.side * (2.4 + Math.sin(time * 4) * 0.2); }); g.userData.body.rotation.x = 0; }
      else if (e.state === 'lost') { g.userData.body.rotation.x = 0.4; }
      else { g.userData.body.position.y = Math.abs(Math.sin(time * 5)) * 0.1; }
      // Marquita de "ya eligió" mientras se decide
      g.userData.ring.material.color.set(s.phase === 'decide' && e.state === 'in' ? (e.chose ? '#2ecc5a' : '#f6b40e') : '#ffffff');
    }
  },
};
