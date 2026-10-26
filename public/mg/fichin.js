// Escena: Tejo del Fichín — un fichín oscuro con neones, máquinas alrededor y la mesa de tejo de aire con un arco por jugador.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { plane, std, tbox, canvasPlane, follow, walkAnim, speedOf } from './util.js';

const R = 6.2, PR = 0.36, MR = 0.62, GOAL = 0.72, TOPY = 0.9;

function sideGeo(S) {
  const ap = R * Math.cos(Math.PI / S), hl = R * Math.sin(Math.PI / S);
  return Array.from({ length: S }, (_, i) => {
    const phi = (2 * Math.PI * i) / S;
    return { phi, nx: Math.sin(phi), nz: Math.cos(phi), tx: Math.cos(phi), tz: -Math.sin(phi), ap, hl };
  });
}

function makeCabinet(color, seed) {
  const g = new THREE.Group();
  const body = tbox(1.3, 2.4, 1, std({ color: '#1a1a24', roughness: 0.6 }), 1, { y: 1.2 }); g.add(body);
  const side = std({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 });
  for (const sx of [-1, 1]) g.add(tbox(0.06, 2.5, 1.05, side, 1, { x: sx * 0.66, y: 1.25 }));
  const scr = canvasPlane(1, 0.8, (x, w, h) => {
    x.fillStyle = '#05050c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { x.fillStyle = ['#ff3b6b', '#3bf0ff', '#ffe23b', '#7bff3b'][(i + seed) % 4]; x.fillRect((i * 37 + seed * 50) % w, (i * 53 + seed * 31) % h, 10, 10); }
    x.fillStyle = '#ffffff'; x.font = `bold ${h * 0.16}px monospace`; x.textAlign = 'center'; x.fillText('INSERT COIN', w / 2, h * 0.85);
  }, 128);
  scr.material = new THREE.MeshBasicMaterial({ map: scr.material.map });
  scr.position.set(0, 1.75, 0.51); scr.rotation.x = -0.15; g.add(scr);
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.2), new THREE.MeshBasicMaterial({ color })); marquee.position.set(0, 2.3, 0.45); g.add(marquee);
  return g;
}

export default {
  camera(n) { return n > 4 ? { pos: [0, 18.5, 12.5], look: [0, 0, 1.2] } : { pos: [0, 16.5, 11], look: [0, 0, 1.3] }; },
  build(ctx) {
    const { group, players, CH } = ctx;
    const n = players.length, S = Math.max(4, n);
    const sides = sideGeo(S);
    // Piso alfombrado oscuro con dibujitos y paredes negras
    group.add(plane(70, 60, std({ map: tex.baldosa([30, 26]), color: '#2a2440', roughness: 0.95 })));
    // Máquinas del fichín alrededor
    const COLS = ['#ff3b6b', '#3bf0ff', '#ffe23b', '#a35bff', '#7bff3b'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.26;
      if (Math.cos(a) > 0.55) continue; // adelante no, que tapan
      const c = makeCabinet(COLS[i % COLS.length], i);
      c.position.set(Math.sin(a) * 12.5, 0, Math.cos(a) * 11); c.rotation.y = a + Math.PI; group.add(c);
    }
    const neon = canvasPlane(8, 1.6, (x, w, h) => {
      x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, w, h);
      x.shadowColor = '#ff3b6b'; x.shadowBlur = 30; x.strokeStyle = '#ff7aa0'; x.lineWidth = 10;
      x.font = `bold ${h * 0.7}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.strokeText('FICHÍN', w / 2, h / 2); x.fillStyle = '#fff0f5'; x.fillText('FICHÍN', w / 2, h / 2);
    }, 768);
    neon.position.set(0, 4.5, -11.5); group.add(neon);

    // La mesa: patas, tapa celeste con agujeritos y bordes; un arco por lado con dueño
    const shape = new THREE.Shape();
    for (let i = 0; i <= S; i++) { const a = (2 * Math.PI * i) / S + Math.PI / S; const x = Math.sin(a) * R, z = Math.cos(a) * R; if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z); }
    const topTex = tex.baldosa([8, 8]);
    const top = new THREE.Mesh(new THREE.ShapeGeometry(shape), std({ color: '#3d8bd9', roughness: 0.25, map: topTex }));
    top.rotation.x = -Math.PI / 2; top.position.y = TOPY; top.receiveShadow = true; group.add(top);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 0.9, 0.8, S, 1, false, Math.PI / S), std({ color: '#1b1b2a', roughness: 0.5 }));
    skirt.position.y = TOPY - 0.42; group.add(skirt);
    // Círculo del medio
    const mid = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.2, 40), new THREE.MeshBasicMaterial({ color: '#d6ecff' })); mid.rotation.x = -Math.PI / 2; mid.position.y = TOPY + 0.01; group.add(mid);
    const rail = std({ color: '#d8d8e0', roughness: 0.3, metalness: 0.4 });
    const owners = new Map();
    players.forEach((p, k) => owners.set(n === 2 ? [0, 2][k] : n === 3 ? [0, 1, 3][k] : k, p));
    const sideObjs = sides.map((sd, i) => {
      const g = new THREE.Group();
      g.position.set(sd.nx * sd.ap, TOPY, sd.nz * sd.ap); g.rotation.y = sd.phi;
      const owner = owners.get(i);
      const color = owner ? CH[owner.char].color : '#d8d8e0';
      const gw = sd.hl * GOAL * 2, post = sd.hl - sd.hl * GOAL;
      for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(post + 0.4, 0.3, 0.3), rail); m.position.set(sx * (sd.hl * GOAL + post / 2), 0.15, 0.1); g.add(m); }
      // Barra que cierra el arco (pared de entrada si no hay dueño, o cuando el dueño pierde)
      const bar = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.3, 0.3), rail); bar.position.set(0, 0.15, 0.1); bar.visible = !owner; g.add(bar);
      // Boca del arco con luz del color del dueño
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(gw, 0.5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      mouth.rotation.x = -Math.PI / 2; mouth.position.set(0, -0.01, 0.35); mouth.visible = !!owner; g.add(mouth);
      group.add(g);
      return { g, bar, mouth, owner: owner ? owner.id : null, sd, flash: 0 };
    });
    // Paletas y jugadores detrás de su lado
    const mallets = new Map();
    players.forEach((p, k) => {
      const si = n === 2 ? [0, 2][k] : n === 3 ? [0, 1, 3][k] : k;
      const sd = sides[si];
      const color = CH[p.char].color;
      const m = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, 0.18, 24), std({ color, roughness: 0.35 })); base.position.y = 0.09; m.add(base);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.4, 16), std({ color, roughness: 0.3 })); knob.position.y = 0.38; m.add(knob);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), std({ color: '#ffffff', roughness: 0.3 })); cap.position.y = 0.6; m.add(cap);
      m.position.set(sd.nx * (sd.ap - 0.9), TOPY, sd.nz * (sd.ap - 0.9)); group.add(m);
      const g = ctx.addChar(p, sd.nx * (sd.ap + 1.3), sd.nz * (sd.ap + 1.3));
      g.rotation.y = sd.phi + Math.PI;
      mallets.set(p.id, { m, g, sd });
    });
    const puckGeo = new THREE.CylinderGeometry(PR, PR, 0.12, 24);
    const puckMat = std({ color: '#16161c', roughness: 0.3 });
    const rimMat = new THREE.MeshBasicMaterial({ color: '#ffe23b' });
    return { sideObjs, mallets, pucks: new Map(), puckGeo, puckMat, rimMat };
  },
  update(ctx, st, s, dt, time) {
    // Tejos
    const seen = new Set();
    for (const p of s.pucks) {
      seen.add(p.k);
      let m = st.pucks.get(p.k);
      if (!m) {
        m = new THREE.Mesh(st.puckGeo, st.puckMat); m.castShadow = true;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(PR * 0.72, 0.045, 6, 24), st.rimMat); rim.rotation.x = Math.PI / 2; rim.position.y = 0.065; m.add(rim);
        m.position.set(p.x, TOPY + 0.07, p.z); ctx.group.add(m); st.pucks.set(p.k, m); ctx.sfx('whistle');
      }
      m.position.x += (p.x - m.position.x) * Math.min(1, dt * 25);
      m.position.z += (p.z - m.position.z) * Math.min(1, dt * 25);
      m.rotation.y += dt * 6;
    }
    for (const [k, m] of st.pucks) if (!seen.has(k)) { ctx.group.remove(m); st.pucks.delete(k); }
    if (s.hit) { if (st.lastHit !== s.hit.x + ',' + s.hit.z) { st.lastHit = s.hit.x + ',' + s.hit.z; ctx.sfx('hit'); } }
    if (s.wall && !st.wallOn) ctx.sfx('blip');
    st.wallOn = s.wall;
    // Arcos: se cierran cuando el dueño queda afuera; destello cuando entra un gol
    st.sideObjs.forEach((so, i) => {
      const open = !!s.sides[i];
      so.bar.visible = !open; so.mouth.visible = open;
      if (s.goal === i && !so.goalSeen) {
        so.goalSeen = true; so.flash = 1.2; ctx.sfx('bad');
        ctx.burst(new THREE.Vector3(so.sd.nx * so.sd.ap, TOPY + 0.5, so.sd.nz * so.sd.ap), 40, 4);
      } else if (s.goal !== i) so.goalSeen = false;
      so.flash = Math.max(0, so.flash - dt);
      so.mouth.material.opacity = so.flash > 0 ? 0.4 + Math.abs(Math.sin(time * 20)) * 0.6 : 0.85;
    });
    for (const e of s.ents) {
      const ml = st.mallets.get(e.id); if (!ml) continue;
      ml.m.visible = e.lives > 0;
      ml.m.position.x += (e.x - ml.m.position.x) * Math.min(1, dt * 30);
      ml.m.position.z += (e.z - ml.m.position.z) * Math.min(1, dt * 30);
      // El personaje acompaña la paleta desde afuera de la mesa
      const g = ml.g, sd = ml.sd;
      const along = e.x * sd.tx + e.z * sd.tz;
      const out = e.lives > 0 ? sd.ap + 1.3 : sd.ap + 2.4;
      follow(g, sd.nx * out + sd.tx * along, sd.nz * out + sd.tz * along, Math.min(1, dt * 12));
      const v = speedOf(g, dt);
      walkAnim(g, time, Math.min(1, v / 4), g.id);
      g.userData.body.rotation.z = e.hurt ? Math.sin(time * 25) * 0.3 : g.userData.body.rotation.z;
      if (e.lives <= 0) g.userData.body.rotation.x = 0.4;
    }
  },
};
