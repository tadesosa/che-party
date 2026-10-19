// Che Party — pantalla principal (tele). Dibuja el tablero y los minijuegos en 3D.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { makeCharacter, animateChar, makeCopa, makeChancla, makeLabel } from './models.js';
import { makeBus, makeTaxi, makeCloud } from './props.js';
import { buildBoard3D } from './board3d.js';
import { makeOcclusion } from './occlusion.js';
import { loadKit } from './kit.js';
import { portraitURL } from './portrait.js';
import { sfx, music, unlockAudio, audioReady, setMuted, isMuted } from './audio.js';
import { createHostStage } from './host3d.js';
import sumo from './mg/sumo.js';
import globo from './mg/globo.js';
import alfajores from './mg/alfajores.js';
import penales from './mg/penales.js';
import carrera from './mg/carrera.js';
import sillas from './mg/sillas.js';
import asado from './mg/asado.js';
import cruce from './mg/cruce.js';
import tango from './mg/tango.js';
import pelota from './mg/pelota.js';
import empanadas from './mg/empanadas.js';
import matecaliente from './mg/matecaliente.js';
import glaciar from './mg/glaciar.js';
import bolita from './mg/bolita.js';
import cinchada from './mg/cinchada.js';
import mancha from './mg/mancha.js';
import picadito from './mg/picadito.js';
import desenfunde from './mg/desenfunde.js';
import cebada from './mg/cebada.js';
import taba from './mg/taba.js';
import sortija from './mg/sortija.js';
import billete from './mg/billete.js';
import embolsados from './mg/embolsados.js';
import bombuchas from './mg/bombuchas.js';
import fila from './mg/fila.js';
import espuma from './mg/espuma.js';
import lazo from './mg/lazo.js';
import rayuela from './mg/rayuela.js';
import truco from './mg/truco.js';
import choripan from './mg/choripan.js';
import payada from './mg/payada.js';
import murga from './mg/murga.js';
import baldosa from './mg/baldosa.js';
import futtenis from './mg/futtenis.js';
import pato from './mg/pato.js';
import metegol from './mg/metegol.js';
import escondida from './mg/escondida.js';
import cortedeluz from './mg/cortedeluz.js';
import feria from './mg/feria.js';
import muzza from './mg/muzza.js';
import timbre from './mg/timbre.js';
import obelisco from './mg/obelisco.js';
import palomas from './mg/palomas.js';
import subte from './mg/subte.js';
import fileteado from './mg/fileteado.js';
import caminito from './mg/caminito.js';
import delivery from './mg/delivery.js';
import hinchada from './mg/hinchada.js';
import pisada from './mg/pisada.js';
import corchos from './mg/corchos.js';
import barricas from './mg/barricas.js';
import mulas from './mg/mulas.js';
import carroza from './mg/carroza.js';
import cosecha from './mg/cosecha.js';
import zondaviento from './mg/zondaviento.js';
import aconcagua from './mg/aconcagua.js';
import rafting from './mg/rafting.js';
import granizo from './mg/granizo.js';
import castillo from './mg/castillo.js';
import barrenador from './mg/barrenador.js';
import tejo from './mg/tejo.js';
import pesca from './mg/pesca.js';
import paleta from './mg/paleta.js';
import churros from './mg/churros.js';
import lobos from './mg/lobos.js';
import sombrilla from './mg/sombrilla.js';
import aguavivas from './mg/aguavivas.js';
import gaviotas from './mg/gaviotas.js';
import ski from './mg/ski.js';
import chocolate from './mg/chocolate.js';
import nieve from './mg/nieve.js';
import bolanieve from './mg/bolanieve.js';
import aerosilla from './mg/aerosilla.js';
import ovnis from './mg/ovnis.js';
import jineteada from './mg/jineteada.js';
import dique from './mg/dique.js';
import parapente from './mg/parapente.js';
import abduccion from './mg/abduccion.js';
import pinguinos from './mg/pinguinos.js';
import tobogan from './mg/tobogan.js';
import tren from './mg/tren.js';
import centolla from './mg/centolla.js';
import iglu from './mg/iglu.js';
import vizcachas from './mg/vizcachas.js';
import nubes from './mg/nubes.js';
import repulgue from './mg/repulgue.js';
import ofrenda from './mg/ofrenda.js';
import bombo from './mg/bombo.js';

const SCENES = { sumo, globo, alfajores, penales, carrera, sillas, asado, cruce, tango, pelota, empanadas, matecaliente, glaciar, bolita, cinchada, mancha, picadito, desenfunde, cebada, taba, sortija, billete, embolsados, bombuchas, fila, espuma, lazo, rayuela, truco, choripan, payada, murga, baldosa, futtenis, pato, metegol, escondida, cortedeluz, feria, muzza, timbre, obelisco, palomas, subte, fileteado, caminito, delivery, hinchada, pisada, corchos, barricas, mulas, carroza, cosecha, zondaviento, aconcagua, rafting, granizo, castillo, barrenador, tejo, pesca, paleta, churros, lobos, sombrilla, aguavivas, gaviotas, ski, chocolate, nieve, bolanieve, aerosilla, ovnis, jineteada, dique, parapente, abduccion, pinguinos, tobogan, tren, centolla, iglu, vizcachas, nubes, repulgue, ofrenda, bombo };
const $ = (id) => document.getElementById(id);
const BOARD_PHASES = ['intro', 'order', 'turn', 'rolling', 'moving', 'path', 'copa', 'land', 'shop', 'item', 'duelAsk', 'bonus', 'copaMove', 'news', 'gift'];
const TEAM_COLORS = ['#2f86e0', '#e14b3c'];
const MG_PHASES = ['mgIntro', 'minigame', 'mgResults'];

// Modelos 3D de Kenney: se cargan antes de armar el primer tablero
await loadKit();

// ---------- Escena ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(1.75, window.devicePixelRatio);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const HORIZON = new THREE.Color('#d6efff');
scene.fog = new THREE.Fog(HORIZON, 70, 170);
// Reflejos suaves en los materiales brillantes (personajes, casillas)
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
camera.position.set(0, 40, 32);
const camTarget = new THREE.Vector3(0, 40, 32);
const camLook = new THREE.Vector3();

// Cielo con degradé y nubes
const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#3d8fd6') }, bottom: { value: HORIZON } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.02, 0.45, h)), 1.0); }',
}));
scene.add(sky);
const clouds = [];
for (let i = 0; i < 12; i++) {
  const c = makeCloud();
  c.position.set(-110 + Math.random() * 220, 32 + Math.random() * 16, -70 - Math.random() * 60);
  c.scale.setScalar(1.6 + Math.random() * 1.6);
  c.userData.v = 0.6 + Math.random() * 0.8;
  scene.add(c); clouds.push(c);
}

// Luz de cielo (azulada desde arriba, rebote verde desde el pasto) y sol cálido que marca bien las sombras
scene.add(new THREE.HemisphereLight('#d4ebff', '#4f6e3a', 0.6));
const sun = new THREE.DirectionalLight('#ffe2b8', 3.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 100 });
scene.add(sun, sun.target);

// Postproceso: brillo suave en luces y la Copa
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// Oclusión ambiental: sombrita suave donde las cosas se tocan (pies en el piso, casas contra el pasto). Da mucha profundidad.
const gtao = new GTAOPass(scene, camera, 512, 512, undefined,
  { radius: 0.7, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1 },
  { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
gtao.blendIntensity = 0.85;
if (/[?&]noao/.test(location.search)) gtao.enabled = false; // para comparar con y sin
// Lo transparente (árboles que se desvanecen, carteles, papelitos) no hace sombra
const gtaoHide = gtao.overrideVisibility.bind(gtao);
gtao.overrideVisibility = () => {
  gtaoHide();
  scene.traverse((o) => {
    if (o.isSprite) o.visible = false;
    else if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.transparent && o.material.opacity < 0.7) o.visible = false;
  });
};
// A media resolución: la sombrita es suave, no se nota y pesa la cuarta parte
const gtaoSize = gtao.setSize.bind(gtao);
gtao.setSize = (w, h) => gtaoSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.25, 0.55, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// Corrección de color final: un poco más de saturación y contraste, y viñeta suave en los bordes
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, saturation: { value: 1.16 }, contrast: { value: 1.07 }, vignette: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float saturation, contrast, vignette; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, saturation);
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
    }`,
});
composer.addPass(grade);
let useComposer = true;
window.__lp = { renderer, scene, camera, gtao }; // para diagnosticar desde la consola

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const boardGroup = new THREE.Group();
const mgGroup = new THREE.Group();
scene.add(boardGroup, mgGroup);

// ---------- Estado ----------
let S = null;
let CH = {};
let lastFx = 0;
let B = null; // tablero 3D
let occ = null; // lo que tapa a la cámara se vuelve transparente
const pieces = new Map();
let copaMesh = null;
let copaFly = null; // { from, to, t, dur }: la Copa volando a su casilla nueva

const portrait = (p) => portraitURL(p.char, CH[p.char].color);
const faceImg = (p, cls = 'pt') => `<img class="${cls}" src="${portrait(p)}" alt="">`;

function ensureBoard() {
  if (B && B.key === S.board.key) return;
  if (B) {
    boardGroup.remove(B.root); boardGroup.remove(copaMesh);
    for (const m of trapMeshes.values()) boardGroup.remove(m);
    trapMeshes.clear();
    for (const pc of pieces.values()) boardGroup.remove(pc.g);
    pieces.clear();
  }
  buildBoard();
}

function buildBoard() {
  B = buildBoard3D(boardGroup, S.board);
  occ = makeOcclusion(B.root);
  window.__lp.occ = occ;
  copaMesh = makeCopa();
  copaMesh.scale.setScalar(1.0);
  const glow = new THREE.PointLight('#ffd34d', 10, 8);
  glow.position.y = 1; copaMesh.add(glow);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe680', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 6; copaMesh.add(beam);
  copaMesh.traverse((m) => { if (m.isMesh && m.material.color && m !== beam) { m.material = m.material.clone(); m.material.emissive = new THREE.Color('#5a4200'); } });
  boardGroup.add(copaMesh);
}

// ---------- Podio del final: un escenario entre las nubes, con los tres primeros ----------
const PODIUM = new THREE.Vector3(0, 44, -24);
const PODIUM_STEPS = [[0, 2.1], [-2.7, 1.45], [2.7, 0.95]]; // [x, alto] del 1°, 2° y 3°
let podium = null, podiumConfetti = 0;
function makePodium() {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 6.2, 1.4, 48), new THREE.MeshStandardMaterial({ color: '#5aa83f', roughness: 0.9 }));
  grass.position.y = -0.7; grass.receiveShadow = true; g.add(grass);
  const dirt = new THREE.Mesh(new THREE.ConeGeometry(6.2, 4.5, 48), new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 1 }));
  dirt.rotation.x = Math.PI; dirt.position.y = -3.65; g.add(dirt);
  const colors = ['#f6b40e', '#d5dde8', '#d38b4f'];
  PODIUM_STEPS.forEach(([x, h], i) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.5, h, 2.5), new THREE.MeshPhysicalMaterial({ color: colors[i], roughness: 0.35, metalness: 0.25, clearcoat: 0.6 }));
    block.position.set(x, h / 2, 0); block.castShadow = block.receiveShadow = true; g.add(block);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.6), new THREE.MeshStandardMaterial({ color: '#1b2a4a' }));
    trim.position.set(x, h, 0); g.add(trim);
    const n = makeLabel(String(i + 1), { size: 0.75, bg: colors[i] });
    n.position.set(x, h / 2, 1.4); g.add(n);
  });
  g.position.copy(PODIUM);
  return g;
}
// Dónde para cada uno en el final: los tres primeros en el podio, el resto abajo, adelante
function podiumSpot(place) {
  if (place < 3) { const [x, h] = PODIUM_STEPS[place]; return new THREE.Vector3(PODIUM.x + x, PODIUM.y + h, PODIUM.z); }
  // Del 4° en adelante, al costado del podio (sin tapar los escalones)
  const [x, z] = [[-5.4, 0.4], [5.4, 0.4], [-4.6, 2.8], [4.6, 2.8]][(place - 3) % 4];
  return new THREE.Vector3(PODIUM.x + x, PODIUM.y, PODIUM.z + z);
}

// Baches (trampas de los jugadores) en las casillas
const trapMeshes = new Map();
function makeBache() {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), new THREE.MeshBasicMaterial({ color: '#141018' }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.36; g.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.09, 6, 20), new THREE.MeshStandardMaterial({ color: '#6b5a48', roughness: 0.9 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.37; g.add(rim);
  // Conito naranja al costado, como los de la calle
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 12), new THREE.MeshStandardMaterial({ color: '#ff7a1a' }));
  cone.position.set(0.75, 0.62, 0.3); g.add(cone);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.08, 12), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
  band.position.set(0.75, 0.66, 0.3); g.add(band);
  return g;
}
function syncTraps(traps) {
  const want = new Set(traps.map((t) => t.pos));
  for (const [pos, m] of trapMeshes) if (!want.has(pos)) { boardGroup.remove(m); trapMeshes.delete(pos); }
  for (const pos of want) {
    if (trapMeshes.has(pos) || !B) continue;
    const m = makeBache(); const p = B.pos(pos); m.position.set(p.x, p.y - 0.36, p.z);
    boardGroup.add(m); trapMeshes.set(pos, m);
  }
}

function addLabel(g, name) {
  const label = makeLabel(name, { size: 0.42 }); label.position.y = (g.userData.top || 1.8) + 0.45; g.add(label);
  return label;
}

function ensurePiece(p) {
  let pc = pieces.get(p.id);
  if (pc && pc.char === p.char) return pc;
  if (pc) boardGroup.remove(pc.g);
  const g = makeCharacter(p.char, CH[p.char].color);
  const label = addLabel(g, p.name);
  label.userData.baseY = label.position.y;
  const start = B.pos(p.pos);
  g.position.copy(start);
  boardGroup.add(g);
  pc = { g, label, char: p.char, from: start.clone(), to: start.clone(), t: 1, land: 0, hidden: false, cheer: 0 };
  pieces.set(p.id, pc);
  return pc;
}

function updatePieceTargets() {
  const byPos = new Map();
  const mover = S.players[S.turn];
  for (const p of S.players) {
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos).push(p);
  }
  for (const p of S.players) {
    const pc = ensurePiece(p);
    const group = byPos.get(p.pos);
    const base = B.pos(p.pos);
    const isMover = BOARD_PHASES.includes(S.phase) && mover && mover.id === p.id && !['intro', 'order'].includes(S.phase);
    const place = S.phase === 'end' && S.standings ? S.standings.findIndex((r) => r.id === p.id) : -1;
    if (place >= 0) {
      base.copy(podiumSpot(place));
      pc.fly = null; pc.hidden = false; pc.label.position.y = pc.label.userData.baseY;
      if (base.distanceTo(pc.to) > 0.01) { pc.from.copy(base); pc.to.copy(base); pc.t = 1; pc.g.position.copy(base); }
      continue;
    }
    if (group.length > 1 && !isMover) {
      const k = group.indexOf(p);
      const a = (k / group.length) * Math.PI * 2 + 0.6;
      base.x += Math.cos(a) * 0.9; base.z += Math.sin(a) * 0.9;
    }
    // Si comparten casilla, cada nombre a otra altura para que no se pisen
    pc.label.position.y = pc.label.userData.baseY + (group.length > 1 ? group.indexOf(p) * 0.55 : 0);
    if (pc.fly) { pc.to.copy(base); continue; }
    if (base.distanceTo(pc.to) > 0.01) {
      const far = base.distanceTo(pc.g.position) > 4.2;
      pc.from.copy(far ? base : pc.g.position);
      pc.to.copy(base);
      pc.t = far ? 1 : 0;
      if (far) pc.g.position.copy(base);
    }
  }
  for (const id of [...pieces.keys()]) {
    if (!S.players.some((p) => p.id === id)) { boardGroup.remove(pieces.get(id).g); pieces.delete(id); }
  }
}

// ---------- Dado 3D arriba de la cabeza y contador de pasos ----------
const diceCanvas = document.createElement('canvas'); diceCanvas.width = diceCanvas.height = 128;
const diceTex = new THREE.CanvasTexture(diceCanvas); diceTex.colorSpace = THREE.SRGBColorSpace;
let diceText = null;
function drawDice(text) {
  if (text === diceText) return;
  diceText = text;
  const x = diceCanvas.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#2f86e0'; x.lineWidth = 14; x.strokeRect(7, 7, 114, 114);
  x.fillStyle = '#1b2a4a'; x.font = 'bold 76px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 64, 70);
  diceTex.needsUpdate = true;
}
drawDice('?');
const diceBlock = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshPhysicalMaterial({ map: diceTex, roughness: 0.3, clearcoat: 1 }));
diceBlock.castShadow = true; diceBlock.visible = false;
boardGroup.add(diceBlock);
let stepsLabel = null, stepsShown = null;
function setSteps(n) {
  if (n === stepsShown) return;
  stepsShown = n;
  if (stepsLabel) { boardGroup.remove(stepsLabel); stepsLabel = null; }
  if (n == null) return;
  stepsLabel = makeLabel(String(n), { size: 1.3, bg: null, color: '#ffffff', border: '#1b2a4a' });
  boardGroup.add(stepsLabel);
}

// ---------- Viajes (colectivo, remís), cambio de lugar y chancletazo ----------
const rides = [];
// Color y cartel del transporte de cada tablero
const RIDE = { baires: ['#ef8a17', '152'], mendoza: ['#2f86e0', 'MZA'], costa: ['#2e9e48', '221'], bariloche: ['#d63a2f', '⛷'], cordoba: ['#7b4fc0', 'CBA'], sur: ['#c0392b', 'TREN'], norte: ['#e8a33a', 'TREN'] };
function startRide(kind, playerId, pts, board) {
  const vehicle = kind === 'bus' ? makeBus(...(RIDE[board] || RIDE.baires)) : makeTaxi();
  vehicle.position.copy(pts[0]);
  boardGroup.add(vehicle);
  const pc = pieces.get(playerId);
  if (pc) pc.hidden = true;
  rides.push({ vehicle, pts, t: -0.5, dur: kind === 'bus' ? 2.6 : 1.9, playerId });
  sfx('horn');
}
function updateRides(dt) {
  for (let i = rides.length - 1; i >= 0; i--) {
    const r = rides[i];
    r.t += dt;
    const u = Math.max(0, Math.min(1, r.t / r.dur));
    const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    const f = e * (r.pts.length - 1), k = Math.min(Math.floor(f), r.pts.length - 2), a = r.pts[Math.max(0, k)], b = r.pts[Math.min(k + 1, r.pts.length - 1)];
    r.vehicle.position.lerpVectors(a, b, Math.min(1, f - k));
    r.vehicle.position.y += (r.t < 0 ? Math.max(0, -r.t * 6) : Math.abs(Math.sin(r.t * 25)) * 0.04) - 0.36;
    const dir = b.clone().sub(a);
    if (dir.lengthSq() > 1e-6) r.vehicle.rotation.y = Math.atan2(-dir.z, dir.x);
    if (r.t > r.dur + 0.4) {
      boardGroup.remove(r.vehicle);
      const pc = pieces.get(r.playerId);
      if (pc) { pc.hidden = false; pc.land = 1; dust(pc.g.position); }
      rides.splice(i, 1);
    }
  }
}
const flyers = [];
function throwChancla(fromId, toId) {
  const a = pieces.get(fromId), b = pieces.get(toId);
  if (!a || !b) return;
  const m = makeChancla(); m.scale.setScalar(1.4);
  boardGroup.add(m);
  flyers.push({ m, from: a.g.position.clone().add(new THREE.Vector3(0, 1.5, 0)), to: b.g.position.clone().add(new THREE.Vector3(0, 1.2, 0)), t: 0, target: b });
  sfx('swoosh');
}
function updateFlyers(dt) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.t += dt / 0.8;
    const u = Math.min(1, f.t);
    f.m.position.lerpVectors(f.from, f.to, u);
    f.m.position.y += Math.sin(u * Math.PI) * 4;
    f.m.rotation.x += dt * 18;
    if (f.t >= 1) {
      boardGroup.remove(f.m); flyers.splice(i, 1);
      sfx('bonk'); f.target.land = 1.4;
      burst(f.to.clone(), 25, 4);
    }
  }
}

// ---------- Efectos ----------
const floaters = [];
function floatText(text, pos, color = '#1d8a3a') {
  const l = makeLabel(text, { size: 0.7, color, bg: '#ffffff', border: color });
  l.position.copy(pos);
  const parent = mgKey ? mgGroup : boardGroup;
  parent.add(l);
  floaters.push({ l, life: 1.6, parent });
}

const particles = [];
const CONF_COLORS = ['#74acdf', '#ffffff', '#f6b40e', '#74acdf', '#ffffff'];
const confGeo = new THREE.PlaneGeometry(0.18, 0.28);
const confMats = CONF_COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
function addParticle(m, data) { m.userData = data; scene.add(m); particles.push(m); }
function burst(pos, count = 120, power = 7) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(confGeo, confMats[i % confMats.length]);
    m.position.copy(pos);
    const a = Math.random() * Math.PI * 2, up = 0.5 + Math.random();
    addParticle(m, { v: new THREE.Vector3(Math.cos(a) * power * Math.random(), up * power * 1.2, Math.sin(a) * power * Math.random()),
      r: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0), life: 2.5 + Math.random(), g: 12, drag: 1.5 });
  }
}
const dustGeo = new THREE.SphereGeometry(0.16, 6, 5);
function dust(pos, count = 7) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: '#f1e9da', transparent: true, opacity: 0.8 }));
    m.position.set(pos.x, 0.45, pos.z);
    const a = (i / count) * Math.PI * 2;
    addParticle(m, { v: new THREE.Vector3(Math.cos(a) * 2.2, 0.6, Math.sin(a) * 2.2), r: new THREE.Vector3(), life: 0.45, g: 0, drag: 5, grow: 2.5 });
  }
}
function splash(pos) {
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: '#d9f1ff', transparent: true, opacity: 0.9 }));
    m.position.copy(pos);
    const a = Math.random() * Math.PI * 2;
    addParticle(m, { v: new THREE.Vector3(Math.cos(a) * 2.5, 5 + Math.random() * 3, Math.sin(a) * 2.5), r: new THREE.Vector3(), life: 1, g: 14, drag: 0.5 });
  }
}
// Monedas de oro que saltan (ganás) o se caen (perdés), como en los party games
const coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 18);
const coinMat = new THREE.MeshPhysicalMaterial({ color: '#f5c518', metalness: 0.9, roughness: 0.25, emissive: '#5a4200', clearcoat: 1 });
function coins(pos, amount) {
  const n = Math.min(10, Math.abs(amount));
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(coinGeo, coinMat);
    const gain = amount > 0;
    m.position.set(pos.x, gain ? pos.y + 0.5 : pos.y + 2.4, pos.z);
    m.rotation.x = Math.PI / 2;
    const a = Math.random() * Math.PI * 2, sp = gain ? 0.6 : 2.2;
    addParticle(m, { v: new THREE.Vector3(Math.cos(a) * sp, gain ? 6 + i * 0.5 : 3, Math.sin(a) * sp), r: new THREE.Vector3(0, 12, 0), life: gain ? 1.0 + i * 0.05 : 1.2, g: gain ? 9 : 14, drag: 0.4, delay: i * 0.06 });
  }
}
function snowPuff(pos) {
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95 }));
    m.position.set(pos.x, pos.y + 0.4, pos.z);
    const a = Math.random() * Math.PI * 2;
    addParticle(m, { v: new THREE.Vector3(Math.cos(a) * 3.5, 2 + Math.random() * 3, Math.sin(a) * 3.5), r: new THREE.Vector3(), life: 0.9, g: 8, drag: 2, grow: 1.5 });
  }
}
// Plato volador para los ovnis de Córdoba
function makeUfo() {
  const g = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({ color: '#b8c4d0', metalness: 0.8, roughness: 0.25, clearcoat: 1 });
  const disc = new THREE.Mesh(new THREE.SphereGeometry(1.6, 28, 12), metal); disc.scale.y = 0.25; g.add(disc);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#7dffb0', transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1 }));
  dome.position.y = 0.2; g.add(dome);
  for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffe680' : '#7dffb0' })); const a = (i / 8) * Math.PI * 2; l.position.set(Math.cos(a) * 1.35, -0.05, Math.sin(a) * 1.35); g.add(l); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.3, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#b6ffcf', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = -3; g.add(beam);
  return g;
}
function poof(pos) {
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }));
    m.position.set(pos.x, 1, pos.z);
    const a = Math.random() * Math.PI * 2;
    addParticle(m, { v: new THREE.Vector3(Math.cos(a) * 3, Math.random() * 3, Math.sin(a) * 3), r: new THREE.Vector3(), life: 0.6, g: 0, drag: 3, grow: 3 });
  }
}

function playerWorldPos(id) {
  const pc = mgChars.get(id) || pieces.get(id)?.g;
  const v = new THREE.Vector3();
  if (pc) pc.getWorldPosition(v);
  return v;
}

// Cara y postura según lo que le pasó: triste si perdió mangos, contento si ganó
// En el podio, el último está triste
const lastPlace = (id) => S.phase === 'end' && S.standings && S.standings.length > 2 && S.standings[S.standings.length - 1].id === id;
function moodFor(id, amount) {
  const pc = pieces.get(id); if (!pc || !amount) return;
  if (amount < 0) { pc.sad = 2.8; pc.joy = 0; } else { pc.joy = 1.8; pc.sad = 0; }
}
function handleFx(fx) {
  if (!fx || fx.id === lastFx) return;
  const first = lastFx === 0;
  lastFx = fx.id;
  if (first) return;
  if (fx.type === 'coins') {
    const base = playerWorldPos(fx.playerId);
    floatText((fx.amount >= 0 ? '+' : '') + fx.amount + ' mangos', base.clone().add(new THREE.Vector3(0, 3, 0)), fx.amount >= 0 ? '#1d8a3a' : '#c0392b');
    coins(base, fx.amount); moodFor(fx.playerId, fx.amount);
    sfx(fx.amount >= 0 ? 'coin' : 'lose');
  } else if (fx.type === 'event') {
    if (fx.item === 'chancla') throwChancla(fx.from, fx.to);
    else sfx('event');
    fx.deltas.forEach((d, i) => setTimeout(() => {
      const base = playerWorldPos(d.playerId);
      floatText((d.amount >= 0 ? '+' : '') + d.amount, base.clone().add(new THREE.Vector3(0, 3, 0)), d.amount >= 0 ? '#1d8a3a' : '#c0392b');
      coins(base, d.amount); moodFor(d.playerId, d.amount);
    }, fx.item ? 800 : i * 120));
  } else if (fx.type === 'copa') {
    const pos = playerWorldPos(fx.playerId);
    burst(pos.clone().add(new THREE.Vector3(0, 1.5, 0)));
    floatText('+1 COPA', pos.add(new THREE.Vector3(0, 3.2, 0)), '#b8860b');
    const pc = pieces.get(fx.playerId); if (pc) pc.cheer = 3;
    sfx('copa');
  } else if (fx.type === 'copaMove') {
    const to = B.pos(fx.to);
    const from = fx.from >= 0 ? B.pos(fx.from) : to.clone().add(new THREE.Vector3(0, 14, 0));
    copaFly = { from: new THREE.Vector3(from.x, fx.from >= 0 ? from.y + 1.44 : 16, from.z), to: new THREE.Vector3(to.x, to.y + 1.44, to.z), t: 0, dur: fx.from >= 0 ? 1.8 : 1.3 };
    if (copaMesh) copaMesh.position.copy(copaFly.from);
    sfx('swoosh');
  } else if (fx.type === 'win') {
    burst(new THREE.Vector3(0, 6, 0), 300, 11);
    for (const pc of pieces.values()) pc.cheer = 0;
    const pc = pieces.get(fx.playerId); if (pc) pc.cheer = 99;
    sfx('win');
  } else if (fx.type === 'bus') {
    startRide('bus', fx.playerId, [B.pos(fx.from), B.pos(fx.to)], fx.board);
  } else if (fx.type === 'remis') {
    startRide('remis', fx.playerId, (fx.path || []).map((id) => B.pos(id)));
  } else if (fx.type === 'zonda') {
    const pc = pieces.get(fx.playerId);
    if (pc) { pc.fly = { from: B.pos(fx.from), to: B.pos(fx.to), t: -0.4, dur: 2.4 }; }
    sfx('swoosh'); setTimeout(() => sfx('swoosh'), 400);
  } else if (fx.type === 'ovni') {
    // Un plato volador baja, lo levanta con el rayo y se lo lleva
    const pc = pieces.get(fx.playerId);
    if (pc) { pc.fly = { from: B.pos(fx.from), to: B.pos(fx.to), t: -1.0, dur: 2.6, ufo: makeUfo(), high: 7 }; boardGroup.add(pc.fly.ufo); }
    sfx('ufo');
  } else if (fx.type === 'avalancha') {
    const pc = pieces.get(fx.playerId);
    if (pc) { pc.fly = { from: B.pos(fx.from), to: B.pos(fx.to), t: -0.2, dur: 1.5, low: true, snow: true }; }
    for (let i = 0; i < 4; i++) setTimeout(() => { if (pc) snowPuff(pc.g.position.clone()); }, i * 250);
    sfx('swoosh'); setTimeout(() => sfx('bonk'), 1500);
    if (fx.lost) setTimeout(() => { const base = playerWorldPos(fx.playerId); floatText('-' + fx.lost + ' mangos', base.clone().add(new THREE.Vector3(0, 3, 0)), '#c0392b'); coins(base, -fx.lost); moodFor(fx.playerId, -fx.lost); }, 1600);
  } else if (fx.type === 'pinguino') {
    const pc = pieces.get(fx.playerId);
    if (pc) { snowPuff(pc.g.position.clone()); pc.surf = 2.6; pc.snowSurf = true; }
    sfx('swoosh');
  } else if (fx.type === 'trap') {
    poof(B.pos(fx.pos)); sfx('bonk');
  } else if (fx.type === 'trapHit') {
    const p = B.pos(fx.pos); burst(p.clone().add(new THREE.Vector3(0, 1, 0)), 40, 5); sfx('lose');
    const pc = pieces.get(fx.playerId); if (pc) pc.land = 1.6;
  } else if (fx.type === 'shuffle') {
    for (const pc of pieces.values()) poof(pc.g.position);
    sfx('swoosh'); setTimeout(() => sfx('swoosh'), 300);
  } else if (fx.type === 'drumroll') {
    sfx('drumroll');
  } else if (fx.type === 'news') {
    sfx('news');
  } else if (fx.type === 'gift') {
    sfx('event');
  } else if (fx.type === 'giftOpen') {
    sfx('chest');
    const base = playerWorldPos(fx.playerId); burst(base.clone().add(new THREE.Vector3(0, 2, 0)), 90, 6);
  } else if (fx.type === 'ola') {
    const pc = pieces.get(fx.playerId);
    if (pc) { splash(pc.g.position.clone()); pc.surf = 3.2; }
    sfx('swoosh');
  } else if (fx.type === 'lastRounds') {
    bigBanner('⏰', '¡ÚLTIMAS 3 RONDAS!');
    burst(new THREE.Vector3(0, 6, 0), 160, 9);
    sfx('copa');
  } else if (fx.type === 'bonus') {
    for (const id of fx.ids) { const pc = pieces.get(id); if (pc) { pc.cheer = 4; burst(pc.g.position.clone().add(new THREE.Vector3(0, 2, 0)), 80, 6); } }
    sfx('copa');
  } else if (fx.type === 'swap') {
    for (const id of [fx.a, fx.b]) { const pc = pieces.get(id); if (pc) poof(pc.g.position); }
    sfx('swoosh');
  }
}

// ---------- Minijuegos ----------
let mgKey = null;
let mgScene = null, mgState = null;
let mgSnap = null;
const mgChars = new Map();
const seenEvents = new Set();
let lastCount = null;
let mgCam = null;
let evSoundAt = 0;

const mgCtx = {
  THREE, group: mgGroup, chars: mgChars,
  get players() { return S.mg && S.mg.players ? S.players.filter((p) => S.mg.players.includes(p.id)) : S.players; },
  get CH() { return CH; },
  addChar(p, x, z, scale = 1) {
    const g = makeCharacter(p.char, CH[p.char].color);
    addLabel(g, p.name);
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    const team = S.mg && S.mg.teams ? S.mg.teams.findIndex((t) => t.includes(p.id)) : -1;
    if (team >= 0) g.userData.ring.material.color.set(TEAM_COLORS[team]);
    g.userData.team = team;
    mgGroup.add(g); mgChars.set(p.id, g);
    return g;
  },
  label(text, color = '#ffffff', size = 0.8) { const l = makeLabel(text, { size, bg: null, color }); l.material.transparent = true; return l; },
  floatText: (t, p, c) => floatText(t, p, c),
  burst: (p, n, pw) => burst(p, n, pw),
  splash: (p) => splash(p),
  sfx: (n) => sfx(n),
  music: (m) => { mgCtx.musicOwned = true; music(m); },
  setCamera(pos, look) { mgCam = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) }; },
};

// Libera de la placa de video todo lo que armó la escena del minijuego (si no, en una partida larga se acumula).
// Si algo se vuelve a usar después (texturas compartidas con el tablero), three lo vuelve a cargar solo.
function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
  });
}
function clearMg() {
  disposeTree(mgGroup);
  while (mgGroup.children.length) mgGroup.remove(mgGroup.children[0]);
  mgChars.clear();
  seenEvents.clear();
  mgSnap = null; mgKey = null; mgScene = null; mgState = null; lastCount = null; mgCam = null;
  mgCtx.musicOwned = false;
}

function buildMg(key) {
  clearMg();
  mgKey = key;
  mgScene = SCENES[key];
  if (!mgScene) return;
  mgState = mgScene.build(mgCtx);
  const cam = typeof mgScene.camera === 'function' ? mgScene.camera(S.players.length) : mgScene.camera;
  mgCam = { pos: new THREE.Vector3(...cam.pos), look: new THREE.Vector3(...cam.look) };
  camera.position.copy(mgCam.pos).add(new THREE.Vector3(0, 3, 4));
  camLook.copy(mgCam.look);
}

function updateMg(dt, time) {
  const s = mgSnap;
  // En la presentación y los resultados los personajes saludan / festejan
  if (S.phase === 'mgIntro' || S.phase === 'mgResults') {
    const winners = new Set((S.results || []).filter((r) => r.place === 1).map((r) => r.id));
    for (const [id, g] of mgChars) { animateChar(g, time, { wave: S.phase === 'mgIntro', cheer: winners.has(id), phase: g.id }); blink(g, time); }
  }
  if (!s || s.key !== mgKey || !mgScene) return;
  mgScene.update(mgCtx, mgState, s, dt, time);
  for (const ev of s.events || []) {
    if (seenEvents.has(ev.key)) continue;
    seenEvents.add(ev.key);
    const pos = playerWorldPos(ev.id).add(new THREE.Vector3(0, 2.9, 0));
    floatText(ev.text, pos, ev.kind === 'bad' ? '#c0392b' : ev.kind === 'gold' ? '#b8860b' : '#1d8a3a');
    if (time - evSoundAt > 0.08) { sfx(ev.kind); evSoundAt = time; }
  }
  for (const g of mgChars.values()) blink(g, time);
}

function updateMgHud() {
  const s = mgSnap;
  if (!s || s.key !== mgKey) return;
  $('mgTime').classList.toggle('hidden-time', s.timeLeft == null);
  if (s.timeLeft != null) $('mgTime').textContent = Math.ceil(s.timeLeft) + 's';
  const cd = Math.ceil(s.countdown);
  const el = $('countdown');
  if (s.countdown > 0) { if (lastCount !== cd) sfx('count'); lastCount = cd; }
  else if (lastCount !== 0) { lastCount = 0; updateMgHud.goAt = performance.now(); sfx('go'); }
  const label = s.countdown > 0 ? String(cd) : performance.now() - (updateMgHud.goAt || 0) < 900 ? '¡YA!' : '';
  if (el.textContent !== label) {
    el.textContent = label;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  el.classList.toggle('hidden', !label);

  const html = s.ents.map((e) => {
    const p = S.players.find((o) => o.id === e.id); if (!p) return '';
    const c = CH[p.char];
    return `<div class="card"><div class="em" style="background:${c.color}">${faceImg(p)}</div><div><div class="nm">${esc(p.name)}</div><div class="st">${esc(e.st || '')}</div></div></div>`;
  }).join('');
  if ($('mgScores').dataset.html !== html) { $('mgScores').dataset.html = html; $('mgScores').innerHTML = html; }
}

// Parpadeo cada tanto
function blink(g, time) {
  const eyes = g.userData.eyes;
  if (!eyes || !eyes.length) return;
  if (time > g.userData.blinkAt + 0.14) g.userData.blinkAt = time + 2 + Math.random() * 4;
  const closed = time > g.userData.blinkAt && time < g.userData.blinkAt + 0.14;
  for (const e of eyes) e.scale.y = closed ? 0.12 : 1;
}

// ---------- HUD / paneles ----------
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function setHtml(id, html) { const el = $(id); if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; } }
let lastTurnKey = '';
let lastBanner = '';

function renderHud() {
  const ph = S.phase;
  const inMgView = currentScene !== 'board';
  show('lobby', ph === 'lobby');
  show('hud', BOARD_PHASES.includes(ph) && !inMgView);
  show('banner', BOARD_PHASES.includes(ph) && !!S.message && !inMgView && ph !== 'order');
  show('dice', !!S.dice && S.dice.detail && BOARD_PHASES.includes(ph));
  show('orderPanel', ph === 'order' && !!S.orderRolls);
  show('mgIntro', ph === 'mgIntro');
  show('mgHud', ph === 'minigame');
  if (ph !== 'minigame') show('countdown', false);
  show('results', ph === 'mgResults');
  show('end', ph === 'end');
  show('pause', !!S.paused);
  show('bonusPanel', ph === 'bonus' && !!S.bonus);
  show('newsPanel', ph === 'news' && !!S.news);
  show('giftPanel', ph === 'gift' && !!S.gift);
  show('pickPanel', ph === 'mgPick');
  if (ph === 'lobby') { $('host').classList.add('hidden'); hostVisible = false; }

  if (ph === 'lobby') renderLobby();

  if (!renderHud.seenRolls || ph !== 'order') renderHud.seenRolls = new Set();
  if (ph === 'order' && S.orderRolls) {
    setHtml('orderList', S.players.map((p) => {
      const r = S.orderRolls[p.id];
      const fresh = r != null && !renderHud.seenRolls.has(p.id);
      if (r != null) renderHud.seenRolls.add(p.id);
      return `<div class="oc"><span class="lp" style="background:${CH[p.char].color}">${faceImg(p)}</span><div class="nm">${esc(p.name)}</div><div class="roll ${r == null ? 'wait' : fresh ? 'new' : ''}">${r == null ? '🎲' : r}</div></div>`;
    }).join(''));
  }

  $('round').textContent = (S.mode === 'rondas' ? `Ronda ${Math.min(S.round, S.rounds)} de ${S.rounds}` : `Ronda ${S.round} · Meta: ${S.copasToWin} 🏆`) + (S.lastRounds ? ' · ⏰ ¡Últimas!' : '') + (S.bank ? ` · 🏦 ${S.bank}` : '');
  setHtml('cards', S.players.map((p, i) => {
    const c = CH[p.char];
    const active = i === S.turn && BOARD_PHASES.includes(ph) && !['intro', 'order', 'bonus'].includes(ph);
    const bag = (p.items || []).map((k) => S.items[k].emoji).join('');
    return `<div class="card ${active ? 'active' : ''} ${p.connected ? '' : 'off'}"><div class="em" style="background:${c.color}">${faceImg(p)}</div>
      <div><div class="nm"><span class="tdot" style="background:${p.color === 'roja' ? TEAM_COLORS[1] : TEAM_COLORS[0]}"></span>${esc(p.name)}<span class="items">${bag}</span></div><div class="st">💰 ${p.mangos} &nbsp; 🏆 ${p.copas}${S.mode === 'copas' ? '/' + S.copasToWin : ''}</div></div></div>`;
  }).join(''));
  if (S.message !== lastBanner) {
    lastBanner = S.message;
    $('banner').textContent = S.message;
    $('banner').classList.remove('bump'); void $('banner').offsetWidth; $('banner').classList.add('bump');
  }

  // Cartel grande "¡Turno de …!"
  const turnKey = ph === 'turn' ? `${S.round}-${S.turn}` : null;
  if (turnKey && turnKey !== lastTurnKey) {
    lastTurnKey = turnKey;
    const p = S.players[S.turn];
    if (p) {
      const tb = $('turnBanner');
      tb.querySelector('.em').innerHTML = faceImg(p, 'tbp');
      tb.querySelector('.txt').textContent = `¡Turno de ${p.name}!`;
      tb.classList.remove('hidden', 'show'); void tb.offsetWidth; tb.classList.add('show');
      sfx('swoosh');
    }
  }

  if (S.dice && S.dice.detail) {
    const d = $('dice');
    d.querySelector('.face').textContent = S.dice.value ?? '';
    d.querySelector('.left').textContent = S.dice.detail.join(' + ');
  }

  if (ph === 'mgIntro' && S.mg) {
    $('mgTitle').textContent = S.mg.title;
    $('mgInstr').textContent = S.mg.instructions;
    $('mgControl').textContent = {
      mash: '📱 En el celu: un botón gigante para apretar rápido',
      lr: '📱 En el celu: botones ◀ ▶',
      buttons: '📱 En el celu: ' + (S.mg.buttons || []).map((b) => b.label).join('  '),
      joystick: '📱 En el celu: joystick' + (S.mg.action ? ' + botón ' + S.mg.action : ''),
    }[S.mg.control] || '';
    const mgPlayers = S.players.filter((p) => S.mg.players.includes(p.id));
    const chip = (p) => `<span class="${S.mg.ready.includes(p.id) ? 'on' : ''}" style="background:${CH[p.char].color}" title="${esc(p.name)}">${faceImg(p)}</span>`;
    const modeLabel = { ffa: 'Todos contra todos', duel: S.mg.bet ? `⚔️ DUELO por ${S.mg.bet} mangos` : '⚔️ DUELO', '2v2': '2 contra 2', '1v3': '1 contra 3' }[S.mg.mode] || '';
    $('mgMode').textContent = modeLabel;
    $('mgMode').className = 'mg-mode ' + S.mg.mode;
    if (S.mg.teams) {
      setHtml('mgReady', S.mg.teams.map((t, i) => `<div class="team t${i}">${t.map((id) => chip(S.players.find((p) => p.id === id))).join('')}</div>`).join('<div class="vs">VS</div>'));
    } else setHtml('mgReady', mgPlayers.map(chip).join(''));
  }

  if (ph === 'mgResults' && S.results) {
    $('resTitle').textContent = S.mg ? S.mg.title : 'Resultados';
    setHtml('resList', S.results.map((r) => {
      const p = S.players.find((o) => o.id === r.id); if (!p) return '';
      const tag = r.team != null && S.mg && S.mg.mode !== 'duel' ? `<span class="tdot" style="background:${TEAM_COLORS[r.team]}"></span>` : '';
      return `<li class="${r.reward < 0 ? 'lost' : ''}"><span class="pl">${r.place === 1 ? '🏆' : r.place + '°'}</span><span class="lp" style="background:${CH[p.char].color}">${faceImg(p)}</span>${tag}${esc(p.name)}<span class="rw">${r.reward >= 0 ? '+' : ''}${r.reward} 💰</span></li>`;
    }).join(''));
  }

  if (ph === 'mgPick' && S.mgPick) {
    const n = S.mgPick.played;
    $('pickInfo').textContent = (n ? `Van ${n} minijuego${n === 1 ? '' : 's'}. ` : '') + 'Cada victoria suma una Copa.';
    setHtml('pickScores', [...S.players].sort((a, b) => b.copas - a.copas).map((p) => `<div class="oc"><span class="lp" style="background:${CH[p.char].color}">${faceImg(p)}</span><div class="nm">${esc(p.name)}</div><div class="roll">🏆 ${p.copas}</div></div>`).join(''));
    const ML = { ffa: 'Todos', duel: 'Duelo', '2v2': '2 vs 2', '1v3': '1 vs 3' };
    setHtml('pickList', S.mgPick.options.map((o) => `<div class="pick-card"><b>${esc(o.title)}</b>${o.board ? ` <small>📍${esc(o.board)}</small>` : ''}<div>${o.modes.map((m) => `<button data-pick="${o.key}" data-mode="${m}">${ML[m] || m}</button>`).join('')}</div></div>`).join(''));
  }

  if (ph === 'bonus' && S.bonus) renderBonus();
  if (ph === 'news' && S.news) renderNews();
  if (ph === 'gift' && S.gift) renderGift();

  if (ph === 'end' && S.standings) {
    $('endTitle').textContent = S.message;
    setHtml('endList', S.standings.map((r, i) => {
      const p = S.players.find((o) => o.id === r.id); if (!p) return '';
      return `<li><span class="pl">${i + 1}°</span><span class="lp" style="background:${CH[p.char].color}">${faceImg(p)}</span>${esc(p.name)}<span class="rw">🏆 ${r.copas} · 💰 ${r.mangos}</span></li>`;
    }).join(''));
  }
}

// ---------- Sala de espera: acá se eligen el tablero, el modo, los bots y se arranca ----------
const sendHost = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
function renderLobby() {
  $('joinUrl').textContent = S.joinUrl.replace('http://', '');
  $('lobbyCount').textContent = `(${S.players.length}/6)`;
  const items = S.players.map((p) => {
    const c = CH[p.char];
    const tag = p.bot ? '<span class="badge">BOT</span>' : !p.connected ? '<span class="badge off">sin señal</span>' : p.ready ? '<span class="badge ok">✓ LISTO</span>' : '<span class="badge wait">eligiendo…</span>';
    return `<li><span class="lp" style="background:${c.color}">${faceImg(p)}</span><span class="nm">${esc(p.name)}<small>${esc(c.name)}</small></span>${tag}<button class="kick" data-kick="${p.id}" title="Sacar a ${esc(p.name)}">✕</button></li>`;
  });
  for (let i = S.players.length; i < Math.max(3, S.players.length); i++) items.push('<li class="empty">Esperando jugador…</li>');
  setHtml('lobbyList', items.join(''));
  setHtml('tvBoards', S.boards.map((b) => `<button data-board="${b.key}" class="${b.key === S.board.key ? 'on' : ''}"><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></button>`).join(''));
  for (const b of document.querySelectorAll('#tvModes button')) b.classList.toggle('on', b.dataset.mode === S.mode);
  const nums = S.mode === 'rondas' ? S.roundOptions : S.mode === 'copas' ? S.goalOptions : [];
  const cur = S.mode === 'rondas' ? S.rounds : S.copasToWin;
  setHtml('tvNums', nums.length ? `<span>${S.mode === 'rondas' ? 'Rondas:' : 'Copas para ganar:'}</span>` + nums.map((n) => `<button data-n="${n}" class="${n === cur ? 'on' : ''}">${n}</button>`).join('') : '');
  $('tvModeHint').textContent = S.mode === 'minis' ? 'Sin tablero: se elige cualquier minijuego desde acá. Cada victoria suma una Copa.'
    : S.mode === 'rondas' ? 'Gana el que tiene más Copas al final. ¡Al cierre hay premios sorpresa!' : 'Gana el primero que junta las Copas.';
  const humans = S.players.filter((p) => !p.bot && p.connected);
  const waiting = humans.filter((p) => !p.ready);
  $('tvBotAdd').disabled = S.players.length >= 6;
  $('tvBotDel').disabled = !S.players.some((p) => p.bot);
  $('tvStart').classList.toggle('waiting', S.players.length < 2 || waiting.length > 0);
  $('tvStartHint').textContent = S.players.length < 2 ? 'Hacen falta al menos 2 jugadores (podés sumar bots).'
    : waiting.length ? `Falta que toquen LISTO: ${waiting.map((p) => p.name).join(', ')}` : '¡Están todos listos!';
}
// Un solo manejador para todos los botones de la tele (las listas se redibujan seguido)
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !S) return;
  sfx('select');
  if (b.dataset.kick) { const p = S.players.find((o) => o.id === b.dataset.kick); if (p && (p.bot || confirm(`¿Sacar a ${p.name} de la partida?`))) sendHost({ t: 'kick', id: p.id }); }
  else if (b.dataset.board) sendHost({ t: 'board', key: b.dataset.board });
  else if (b.dataset.mode && b.closest('#tvModes')) sendHost({ t: 'mode', mode: b.dataset.mode });
  else if (b.dataset.n) sendHost({ t: S.mode === 'rondas' ? 'rounds' : 'goal', n: +b.dataset.n });
  else if (b.dataset.pick) sendHost({ t: 'pickMg', key: b.dataset.pick, mode: b.dataset.mode });
  else if (b.id === 'tvBotAdd') sendHost({ t: 'addBot' });
  else if (b.id === 'tvBotDel') sendHost({ t: 'removeBot' });
  else if (b.id === 'tvStart') {
    if (S.players.length >= 2) goFullscreen();
    const waiting = S.players.filter((p) => !p.bot && p.connected && !p.ready);
    if (waiting.length && S.players.length >= 2 && confirm(`${waiting.map((p) => p.name).join(', ')} todavía no tocó LISTO. ¿Empezar igual?`)) sendHost({ t: 'start', force: true });
    else sendHost({ t: 'start' });
  }
  else if (b.id === 'tvAgain') sendHost({ t: 'again' });
  else if (b.id === 'tvPickRandom') sendHost({ t: 'pickMg', random: true });
  else if (b.id === 'tvPickEnd') { if (confirm('¿Terminar y ver quién ganó?')) sendHost({ t: 'endMinis' }); }
});
let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text; el.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ---------- Premios sorpresa: barras de cada jugador, redoble y después el ganador ----------
function renderBonus() {
  const b = S.bonus;
  $('bonusIcon').textContent = b.icon;
  $('bonusTitle').textContent = b.title;
  $('bonusDesc').textContent = b.desc;
  $('bonusCount').textContent = `Premio ${b.n} de ${b.of}`;
  const vals = b.values.map((v) => v.v);
  const max = Math.max(...vals, 0.0001), min = Math.min(...vals);
  const revealed = !!b.winners;
  $('bonusPanel').classList.toggle('revealed', revealed);
  setHtml('bonusBars', b.values.map((v) => {
    const p = S.players.find((o) => o.id === v.id); if (!p) return '';
    const win = revealed && b.winners.includes(v.id);
    // En "La Tortuga" gana el más bajo: la barra muestra lo lejos que está del más alto
    const pct = b.low ? (max === min ? 100 : 20 + 80 * (max - v.v) / (max - min)) : Math.max(4, (v.v / max) * 100);
    return `<div class="bar-row ${win ? 'win' : revealed ? 'lose' : ''}"><span class="lp" style="background:${CH[p.char].color}">${faceImg(p)}</span><span class="nm">${esc(p.name)}</span>
      <div class="bar"><div class="fill" style="--w:${pct.toFixed(0)}%;background:${CH[p.char].color}"></div></div><span class="val">${v.v}</span>${win ? '<span class="plus">+1 🏆</span>' : ''}</div>`;
  }).join(''));
}

// ---------- Noticias de último momento ----------
function renderNews() {
  const n = S.news;
  $('newsIcon').textContent = n.icon;
  $('newsTitle').textContent = n.title;
  $('newsText').textContent = n.text;
  $('newsResult').textContent = n.result || '';
  $('newsResult').classList.toggle('hidden', !n.result);
  $('newsTicker').textContent = `CHE NOTICIAS • ${n.title.toUpperCase()} • ${S.board.name.toUpperCase()} • RONDA ${S.round} • ${S.players.map((p) => `${p.name.toUpperCase()} ${p.copas}🏆 ${p.mangos}💰`).join(' • ')} • `.repeat(3);
}

// ---------- Regalo de Sifón: tres cajas ----------
function renderGift() {
  const g = S.gift;
  const p = S.players.find((o) => o.id === g.playerId);
  $('giftWho').innerHTML = p ? `${faceImg(p, 'gp')} <span>Regalo para <b>${esc(p.name)}</b></span>` : '';
  setHtml('giftBoxes', Array.from({ length: g.n }, (_, i) => {
    const c = g.contents && g.contents[i];
    const cls = g.opened == null ? 'idle' : i === g.opened ? (c ? 'open ' + (c.good ? 'good' : 'bad') : 'shake') : c ? 'other' : 'dim';
    return `<div class="box ${cls}"><div class="lid">🎁</div>${c ? `<div class="prize"><span class="em">${c.emoji}</span><span class="lb">${esc(c.label)}</span></div>` : `<div class="num">${i + 1}</div>`}</div>`;
  }).join(''));
}

function bigBanner(icon, text) {
  const tb = $('turnBanner');
  tb.querySelector('.em').innerHTML = `<span class="bigicon">${icon}</span>`;
  tb.querySelector('.txt').textContent = text;
  tb.classList.remove('hidden', 'show'); void tb.offsetWidth; tb.classList.add('show');
}

// ---------- Anfitrión: Don Sifón ----------
// Aparece en 3D (con su propio mini escenario) y habla con burbujitas. En los momentos importantes sale grande.
const hostStage = createHostStage($('hostCanvas'));
if (!hostStage) $('host').classList.add('flat');
let hostShown = 0, hostTimer = null, typeTimer = null, hostVisible = false;
function showHost(h) {
  if (!h || h.id === hostShown) return;
  const first = hostShown === 0;
  hostShown = h.id;
  if (first && S.phase === 'lobby') return;
  const el = $('host');
  if (!hostStage) $('hostImg').src = portraitURL('sifon', '#74acdf');
  el.classList.toggle('big', !!h.big);
  el.classList.remove('hidden', 'out'); void el.offsetWidth; el.classList.add('in');
  hostVisible = true;
  if (hostStage) { hostStage.setMood(h.mood); hostStage.setTalking(true); }
  // Texto que se va escribiendo, con la "voz" de Sifón
  clearInterval(typeTimer);
  let i = 0;
  $('hostText').textContent = '';
  typeTimer = setInterval(() => {
    i += 2; $('hostText').textContent = h.text.slice(0, i);
    if (i % 4 === 0 && h.text[i] !== ' ') sfx('blip');
    if (i >= h.text.length) { clearInterval(typeTimer); if (hostStage) hostStage.setTalking(false); }
  }, 32);
  clearTimeout(hostTimer);
  hostTimer = setTimeout(hideHost, Math.max(h.big ? 6000 : 4500, h.text.length * (h.big ? 80 : 70)));
  hostTurn = S.turn; hostAt = performance.now();
}
let hostTurn = -1, hostAt = 0;
function hideHost() {
  clearTimeout(hostTimer);
  const el = $('host');
  if (!hostVisible || el.classList.contains('out')) return;
  el.classList.add('out');
  setTimeout(() => { if (el.classList.contains('out')) hostVisible = false; }, 450);
}
// En pantallas chicas la burbuja de Sifón pisa los carteles del medio: el cartel se corre (a la derecha o para arriba)
const DODGE = ['results', 'mgIntro', 'bonusPanel', 'end', 'giftPanel', 'orderPanel'];
let dodgeT = 0;
function dodgeHost(dt) {
  dodgeT -= dt;
  if (dodgeT > 0) return;
  dodgeT = 0.2;
  const host = $('host'), bubble = host.querySelector('.bubble');
  const talking = hostVisible && !host.classList.contains('hidden') && !host.classList.contains('out');
  // Sin transformaciones (la burbuja entra deslizándose): dónde va a quedar
  const b = { left: host.offsetLeft + bubble.offsetLeft, top: host.offsetTop + bubble.offsetTop };
  b.right = b.left + bubble.offsetWidth; b.bottom = b.top + bubble.offsetHeight;
  const news = $('newsPanel').querySelector('.news-box');
  for (const el of [...DODGE.map($), news]) {
    const shown = el === news ? !$('newsPanel').classList.contains('hidden') : !el.classList.contains('hidden');
    const [sx, sy] = (el.style.translate || '0px 0px').split(' ').map((v) => parseFloat(v) || 0);
    let dx = 0, dy = 0;
    if (shown && talking) {
      // Lo que está corrido ahora mismo (a mitad de la transición también), para saber dónde estaría sin correrse
      const [cx, cy] = (getComputedStyle(el).translate.replace('none', '0px') + ' 0px').split(' ').map((v) => parseFloat(v) || 0);
      const r = el.getBoundingClientRect();
      const o = { left: r.left - cx, right: r.right - cx, top: r.top - cy, bottom: r.bottom - cy };
      if (b.right > o.left && b.left < o.right && b.bottom > o.top && b.top < o.bottom) {
        const roomX = innerWidth - 12 - o.right;
        const needX = b.right + 16 - o.left;
        if (needX <= roomX) dx = needX;
        else dy = -Math.min(o.bottom - b.top + 16, o.top - 8);
      }
    }
    const want = `${Math.round(dx)}px ${Math.round(dy)}px`;
    if (Math.abs(dx - sx) > 2 || Math.abs(dy - sy) > 2) el.style.translate = want;
  }
}

// Si ya le toca a otro, lo que decía Sifón del turno anterior ya no corresponde
function staleHost() {
  if (hostVisible && S.turn !== hostTurn && performance.now() - hostAt > 1800 && BOARD_PHASES.includes(S.phase)) hideHost();
}

// ---------- Cambio de escena con transición ----------
let currentScene = 'board';
let switching = false;
function wantedScene() {
  return MG_PHASES.includes(S.phase) && S.mg ? 'mg:' + S.mg.key : 'board';
}
function applyScene(target) {
  if (target === 'board') { if (mgKey) clearMg(); }
  else buildMg(target.slice(3));
  currentScene = target;
  boardGroup.visible = target === 'board';
  mgGroup.visible = target !== 'board';
}
function syncScene() {
  const target = wantedScene();
  if (target === currentScene || switching) return;
  if (!B) { applyScene(target); return; }
  switching = true;
  const wipe = $('wipe');
  wipe.classList.remove('out'); wipe.classList.add('in');
  sfx('swoosh');
  setTimeout(() => {
    applyScene(wantedScene());
    renderHud();
    wipe.classList.remove('in'); wipe.classList.add('out');
    setTimeout(() => { wipe.classList.remove('out'); switching = false; syncScene(); }, 560);
  }, 470);
}

function updateMusic() {
  if (!S) return;
  const ph = S.phase;
  if (ph === 'lobby') music('lobby');
  else if (ph === 'minigame') { if (!mgCtx.musicOwned) music('mg'); }
  else if (ph === 'mgIntro' || ph === 'end') music(null);
  else music('board');
}

let lastPhase = null;
function applyState(st) {
  S = st;
  CH = Object.fromEntries(st.characters.map((c) => [c.key, c]));
  ensureBoard();
  syncScene();
  updatePieceTargets();
  renderHud();
  handleFx(st.fx);
  showHost(st.host);
  staleHost();
  B.showChoices(st.phase === 'path' && st.decision && st.decision.kind === 'path' ? st.decision.at : null);
  syncTraps(st.traps || []);
  B.setBank(st.bank || 0);
  if (st.phase !== lastPhase) {
    if (st.phase === 'rolling') sfx('dice');
    if (st.phase === 'mgIntro') sfx('whistle');
    if (st.phase === 'mgResults') sfx('gold');
    if (st.phase === 'shop' || st.phase === 'path') sfx('select');
    lastPhase = st.phase;
  }
  if (st.dice && st.dice.value != null && !applyState.diceShown) {
    applyState.diceShown = true;
    sfx('diceStop');
    drawDice(String(st.dice.value));
    diceHit = 1;
  }
  if (!st.dice || st.dice.value == null) applyState.diceShown = false;
  updateMusic();
}

// ---------- Sonido: se activa con el primer toque ----------
function wake() {
  unlockAudio();
  setTimeout(() => { if (audioReady()) $('soundHint').classList.add('off'); updateMusic(); }, 100);
}
window.addEventListener('pointerdown', wake);
window.addEventListener('keydown', wake);

// ---------- Tele: pantalla completa, pantalla siempre prendida y silencio ----------
// Se juega con los celus, así que la compu no recibe ni mouse ni teclado: sin esto Windows apaga la pantalla a mitad de partida
let wakeLock = null;
async function keepScreenOn() {
  try { if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch { /* no se pudo */ }
}
keepScreenOn();
window.addEventListener('pointerdown', keepScreenOn);
document.addEventListener('visibilitychange', keepScreenOn);
function goFullscreen() {
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch { /* nada */ }
}
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if (e.key === 'm' || e.key === 'M') { const on = !isMuted(); setMuted(on); toast(on ? '🔇 Sonido apagado (M para prenderlo)' : '🔊 Sonido prendido'); }
  else if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else goFullscreen(); }
  else if ((e.key === 'p' || e.key === 'P') && S && S.phase !== 'lobby' && S.phase !== 'end') sendHost({ t: 'pause' });
});
$('pause').addEventListener('click', () => sendHost({ t: 'pause' }));

// ---------- Conexión ----------
let ws = null;
let lastMsg = 0;
let retryTimer = null;
function connect() {
  clearTimeout(retryTimer);
  if (ws) { ws.onclose = null; ws.onmessage = null; try { ws.close(); } catch { /* nada */ } }
  const sock = new WebSocket(`ws://${location.host}`);
  ws = sock;
  lastMsg = Date.now();
  sock.onopen = () => { show('offline', false); sock.send(JSON.stringify({ t: 'hello', role: 'host' })); };
  sock.onmessage = (ev) => {
    lastMsg = Date.now();
    const msg = JSON.parse(ev.data);
    if (msg.t === 'state') {
      // Si el servidor es otro (se cerró y se volvió a abrir el juego), recargamos para tener la versión nueva
      if (msg.build && window.lpBuild && msg.build !== window.lpBuild) { location.reload(); return; }
      window.lpBuild = msg.build;
      applyState(msg);
    }
    else if (msg.t === 'mg') mgSnap = msg;
    else if (msg.t === 'error') toast(msg.msg);
  };
  sock.onclose = () => {
    if (ws !== sock) return;
    show('offline', true);
    retryTimer = setTimeout(connect, 1000);
  };
}
connect();
setInterval(() => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'ping' }));
  if (Date.now() - lastMsg > 6000) { show('offline', true); connect(); }
}, 2000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') connect(); });

// ---------- Loop ----------
const clock = new THREE.Clock();
let diceSpinT = 0;
let diceHit = 0;
const tmpV = new THREE.Vector3();
const UP1 = new THREE.Vector3(0, 1, 0);

function updateBoard(dt, time) {
  const ph = S.phase;
  const mover = S.players[S.turn];
  for (const [id, pc] of pieces) {
    const g = pc.g;
    g.visible = !pc.hidden;
    if (pc.fly) {
      const f = pc.fly;
      f.t += dt;
      const u = Math.max(0, Math.min(1, f.t / f.dur));
      g.position.lerpVectors(f.from, f.to, u);
      if (f.ufo) {
        // Primero sube despacio con el rayo, viaja y baja
        const lift = f.t < 0 ? Math.max(0, 1 + f.t) * 4 : 4 + Math.sin(u * Math.PI) * 3;
        g.position.y += lift; g.rotation.y += dt * 6;
        const groundY = f.from.y + (f.to.y - f.from.y) * u;
        f.ufo.position.set(g.position.x, groundY + f.high + Math.max(0, -f.t) * 8 + Math.sin(time * 3) * 0.2, g.position.z);
        f.ufo.rotation.y += dt * 4;
      } else if (f.low) {
        g.position.y += Math.abs(Math.sin(u * Math.PI * 3)) * 0.8;
        g.rotation.x += dt * 12;
        if (f.snow && Math.random() < dt * 25) snowPuff(g.position.clone());
      } else {
        g.position.y += Math.sin(u * Math.PI) * 9 + (f.t < 0 ? -f.t * 2 : 0);
        g.rotation.y += dt * 14; g.rotation.z = Math.sin(time * 9) * 0.5;
        if (Math.random() < dt * 20) dust(g.position);
      }
      if (f.t >= f.dur) {
        if (f.ufo) { const u2 = f.ufo; boardGroup.remove(u2); }
        pc.fly = null; g.rotation.z = 0; g.rotation.x = 0; pc.from.copy(pc.to); pc.t = 1; pc.land = 1.2; dust(g.position, 12); sfx('bonk');
      }
      continue;
    }
    if (pc.surf > 0) { pc.surf -= dt; if (Math.random() < dt * 10) (pc.snowSurf ? snowPuff : splash)(g.position.clone()); } else pc.snowSurf = false;
    const wasMoving = pc.t < 1;
    pc.t = Math.min(1, pc.t + dt / 0.28);
    const e = pc.t < 0.5 ? 2 * pc.t * pc.t : 1 - (-2 * pc.t + 2) ** 2 / 2;
    g.position.lerpVectors(pc.from, pc.to, e);
    const hop = Math.sin(Math.PI * pc.t);
    g.position.y = pc.to.y + hop * 1.0;
    if (wasMoving && pc.t >= 1) { pc.land = 1; dust(g.position); sfx('step'); }
    pc.land = Math.max(0, pc.land - dt * 5);
    pc.cheer = Math.max(0, pc.cheer - dt);
    // Estirado en el aire, aplastado al caer
    const body = g.userData.body;
    const stretch = pc.t < 1 ? 1 + hop * 0.18 : 1 - Math.sin(pc.land * Math.PI) * 0.25;
    body.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    g.userData.blob.position.y = 0.02 - (g.position.y - pc.to.y);
    g.userData.blob.scale.setScalar(1 - hop * 0.4);
    const dir = tmpV.copy(pc.to).sub(pc.from);
    const isMover = mover && mover.id === id && BOARD_PHASES.includes(ph) && !['intro', 'order'].includes(ph);
    let targetRot;
    if (pc.t < 1 && dir.lengthSq() > 0.01) targetRot = Math.atan2(dir.x, dir.z);
    else targetRot = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
    let da = targetRot - g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    g.rotation.y += da * (1 - Math.exp(-12 * dt));
    if (pc.t >= 1 && pc.land <= 0) body.position.y = isMover && ph === 'turn' ? Math.abs(Math.sin(time * 6)) * 0.3 : Math.abs(Math.sin(time * 2 + id.length)) * 0.04;
    else body.position.y = 0;
    const won = ph === 'end' && S.standings && S.standings[0] && S.standings[0].id === id;
    pc.sad = Math.max(0, (pc.sad || 0) - dt); pc.joy = Math.max(0, (pc.joy || 0) - dt);
    animateChar(g, time, { walk: pc.t < 1 ? 1 : 0, cheer: pc.cheer > 0 || won, wave: isMover && ph === 'turn', phase: id.length, mood: pc.sad > 0 || lastPlace(id) ? 'sad' : pc.joy > 0 ? 'happy' : null });
    blink(g, time);
  }

  // Dado arriba de la cabeza del que tira
  const mp = mover && pieces.get(mover.id);
  const showDice = mp && (ph === 'turn' || ph === 'rolling' || (S.dice && S.dice.value != null && diceHit > 0));
  diceBlock.visible = !!showDice && !(S.dice && S.dice.value != null && diceHit <= 0);
  if (diceBlock.visible) {
    const top = (mp.g.userData.top || 1.8) + 1.0;
    diceBlock.position.set(mp.g.position.x, mp.g.position.y + top + Math.sin(time * 3) * 0.1, mp.g.position.z);
    if (ph === 'turn') { drawDice('?'); diceBlock.rotation.y = time * 1.5; diceBlock.rotation.x = 0.2; }
    else if (ph === 'rolling' && (!S.dice || S.dice.value == null)) {
      diceBlock.rotation.y += dt * 12; diceBlock.rotation.x = Math.sin(time * 9) * 0.4;
      diceSpinT -= dt;
      if (diceSpinT <= 0) { diceSpinT = 0.06; drawDice(String(1 + Math.floor(Math.random() * 10))); }
    } else {
      // Golpe: el personaje salta y el dado sale disparado hacia arriba
      diceHit = Math.max(0, diceHit - dt * 1.6);
      diceBlock.rotation.y += (0 - diceBlock.rotation.y) * 0.3;
      diceBlock.rotation.x += (0 - diceBlock.rotation.x) * 0.3;
      diceBlock.position.y += (1 - diceHit) * 1.2;
      diceBlock.scale.setScalar(1 + (1 - diceHit) * 0.3);
      mp.g.userData.body.position.y = Math.max(0, Math.sin(diceHit * Math.PI)) * 0.9;
      if (diceHit <= 0.05) { burst(diceBlock.position.clone(), 30, 4); diceHit = 0; }
    }
  } else diceBlock.scale.setScalar(1);
  // Número de pasos que le quedan, flotando arriba
  if (mp && S.dice && S.dice.value != null && S.dice.left > 0 && ['moving', 'path', 'copa', 'land', 'rolling'].includes(ph) && diceHit <= 0) {
    setSteps(S.dice.left);
    stepsLabel.position.set(mp.g.position.x, mp.g.position.y + (mp.g.userData.top || 1.8) + 1.4, mp.g.position.z);
  } else setSteps(null);

  if (copaMesh && S.copaSpace >= 0) {
    const p = B.pos(S.copaSpace);
    const target = tmpV.set(p.x, p.y + 1.44 + Math.sin(time * 2) * 0.2, p.z);
    // En el final, la Copa flota arriba del ganador
    const champ = ph === 'end' && S.standings && S.standings[0] && pieces.get(S.standings[0].id);
    if (champ) target.set(champ.g.position.x, champ.g.position.y + (champ.g.userData.top || 1.8) + 1.5 + Math.sin(time * 2) * 0.15, champ.g.position.z);
    if (copaFly) {
      copaFly.t += dt;
      const u = Math.min(1, copaFly.t / copaFly.dur);
      const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      copaMesh.position.lerpVectors(copaFly.from, copaFly.to, e);
      copaMesh.position.y += Math.sin(u * Math.PI) * Math.min(10, 3 + copaFly.from.distanceTo(copaFly.to) * 0.3);
      if (u >= 1) { copaFly = null; burst(copaMesh.position.clone(), 90, 6); sfx('copa'); }
    } else {
      if (copaMesh.position.distanceTo(target) > 10) copaMesh.position.copy(target);
      copaMesh.position.lerp(target, 1 - Math.exp(-3 * dt));
    }
    copaMesh.rotation.y = time * 1.5;
    copaMesh.visible = ph !== 'lobby' && ph !== 'mgPick';
  }
  // Final: podio con papelitos sobre el ganador
  if (ph === 'end' && !podium) { podium = makePodium(); scene.add(podium); }
  if (podium) podium.visible = ph === 'end';
  if (ph === 'end' && S.standings && S.standings[0]) {
    podiumConfetti -= dt;
    const w = pieces.get(S.standings[0].id);
    if (podiumConfetti <= 0 && w) { podiumConfetti = 1.1; burst(w.g.position.clone().add(tmpV.set((Math.random() - 0.5) * 6, 5, 0)), 45, 4); }
  }
  B.update(dt, time);
  updateRides(dt);
  updateFlyers(dt);
}

function updateCamera(dt, time) {
  const ph = S.phase;
  const inMg = currentScene !== 'board';
  // Vista general: cada tablero dice desde dónde se lo ve entero
  const view = (S.board && S.board.view) || { pos: [0, 40, 32], look: [0, 0, -1] };
  if (location.hash === '#vista' && !inMg) { // vista de todo el mapa, para revisar el tablero
    camTarget.set(...view.pos); camLook.lerp(tmpV.set(...view.look), 0.2);
  } else if (inMg && mgCam) {
    camTarget.copy(mgCam.pos); camLook.lerp(mgCam.look, 1 - Math.exp(-4 * dt));
    if (ph === 'mgIntro') camTarget.add(tmpV.set(Math.sin(time * 0.4) * 4, 2, 2));
  } else if (ph === 'lobby') {
    const a = time * 0.05;
    const r = Math.max(42, view.pos[2] + 6);
    camTarget.set(Math.sin(a) * r, 26, Math.cos(a) * r); camLook.lerp(tmpV.set(0, 2, 0), 0.05);
  } else if (ph === 'end' && podium) {
    // El podio queda a la izquierda: a la derecha va el cartel con la tabla
    camTarget.set(PODIUM.x + 4.6, PODIUM.y + 5.2, PODIUM.z + 15); camLook.lerp(tmpV.set(PODIUM.x + 4.6, PODIUM.y + 1.9, PODIUM.z), 1 - Math.exp(-3 * dt));
  } else if (ph === 'copaMove' && copaMesh) {
    const c = copaMesh.position;
    camTarget.set(c.x * 0.9, c.y + 11.5, c.z * 0.9 + 12); camLook.lerp(tmpV.set(c.x, c.y - 0.5, c.z), 1 - Math.exp(-4 * dt));
  } else if (rides.length) {
    const v = rides[0].vehicle.position;
    camTarget.set(v.x, v.y + 17, v.z + 11); camLook.lerp(v, 1 - Math.exp(-4 * dt));
  } else if (ph === 'bonus' || (ph === 'intro' && S.lastRounds && S.round > 1)) {
    camTarget.set(view.pos[0], view.pos[1] * 0.85, view.pos[2] * 0.85); camLook.lerp(tmpV.set(...view.look), 1 - Math.exp(-3 * dt));
  } else if (ph === 'path' && S.decision && S.decision.at != null) {
    const p = B.pos(S.decision.at);
    camTarget.set(p.x, p.y + 11, p.z + 10); camLook.lerp(p, 1 - Math.exp(-4 * dt));
  } else if (BOARD_PHASES.includes(ph) && !['intro', 'order'].includes(ph) && S.players[S.turn] && pieces.get(S.players[S.turn].id)) {
    const g = pieces.get(S.players[S.turn].id).g;
    const fp = tmpV.set(g.position.x, pieces.get(S.players[S.turn].id).to.y - 0.36, g.position.z);
    camTarget.set(fp.x * 0.9, fp.y + 14.5, fp.z * 0.95 + 11.5); // bien de arriba, para que los edificios no tapen
    camLook.lerp(fp, 1 - Math.exp(-4 * dt));
  } else if (ph === 'order') {
    const p = B.pos(S.board.start);
    camTarget.set(p.x, p.y + 7, p.z + 9); camLook.lerp(tmpV.set(p.x, p.y + 1.2, p.z), 1 - Math.exp(-3 * dt));
  } else {
    camTarget.set(...view.pos); camLook.lerp(tmpV.set(...view.look), 1 - Math.exp(-3 * dt));
  }
  camera.position.lerp(camTarget, 1 - Math.exp(-2.5 * dt));
  camera.lookAt(camLook);
  if (occ) {
    if (inMg || ph === 'lobby' || ph === 'end' || location.hash === '#vista') occ.reset();
    else {
      const mover = S.players[S.turn];
      const others = [];
      for (const [id, pc] of pieces) others.push({ o: pc.g, skip: !!mover && id === mover.id });
      occ.update(dt, camera.position, tmpV.copy(camLook).add(UP1), others);
    }
  }
  sky.position.copy(camera.position);
  // La luz del sol sigue a la cámara para que las sombras se vean nítidas donde se mira
  sun.target.position.copy(camLook);
  sun.position.copy(camLook).add(tmpV.set(16, 34, 18));
  const reach = camera.position.y > 30 ? 52 : 26;
  if (sun.shadow.camera.right !== reach) {
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, far: reach > 26 ? 140 : 100 });
    sun.shadow.camera.updateProjectionMatrix();
  }
}

// Si la compu es lenta, apagamos el brillo y bajamos la resolución
let perfT = 0, perfFrames = 0, perfChecked = false, perfLast = 0;
function checkPerf() {
  // Medimos con el reloj de verdad (el dt del juego viene recortado) y solo con la ventana a la vista
  const now = performance.now(), real = (now - perfLast) / 1000;
  perfLast = now;
  if (perfChecked || document.visibilityState !== 'visible' || real > 1) return;
  perfT += real; perfFrames++;
  if (perfT < 6) return;
  const fps = perfFrames / perfT;
  // Primer escalón: sin oclusión ambiental (es lo que más pesa) y volvemos a medir
  if (fps < 50 && gtao.enabled) {
    gtao.enabled = false;
    perfT = 0; perfFrames = 0;
    console.log('Che Party: sin oclusión ambiental (' + fps.toFixed(0) + ' fps)');
    return;
  }
  perfChecked = true;
  if (fps < 40) {
    useComposer = false;
    pixelRatio = 1;
    renderer.setPixelRatio(1);
    sun.shadow.mapSize.set(1024, 1024);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
    console.log('Che Party: modo liviano activado (' + fps.toFixed(0) + ' fps)');
  }
}

function frame() {
  requestAnimationFrame(frame);
  // dt recortado para la física; la cámara usa el tiempo real (así alcanza a los jugadores aunque la compu ande lenta)
  const raw = clock.getDelta(), dt = Math.min(0.05, raw);
  const time = clock.elapsedTime;

  if (S && B) {
    if (currentScene === 'board') updateBoard(dt, time);
    updateCamera(Math.min(0.5, raw), time);
    if (mgKey) updateMg(Math.min(0.25, raw), time);
    if (S.phase === 'minigame') updateMgHud();
    dodgeHost(raw);
  }
  for (const c of clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 120) c.position.x = -120; }

  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt; f.l.position.y += dt * 1.2;
    f.l.material.opacity = Math.min(1, f.life * 2);
    if (f.life <= 0 || !f.l.parent) { f.parent.remove(f.l); floaters.splice(i, 1); }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const m = particles[i], u = m.userData;
    if (u.delay > 0) { u.delay -= dt; m.visible = false; continue; }
    m.visible = true;
    u.v.y -= u.g * dt; u.v.multiplyScalar(1 - u.drag * dt);
    m.position.addScaledVector(u.v, dt);
    m.rotation.x += u.r.x * dt; m.rotation.y += u.r.y * dt;
    if (u.grow) { m.scale.multiplyScalar(1 + u.grow * dt); m.material.opacity = Math.max(0, u.life * 1.6); }
    u.life -= dt;
    if (u.life <= 0 || m.position.y < -3) { scene.remove(m); particles.splice(i, 1); }
  }
  checkPerf();
  if (useComposer) composer.render(); else renderer.render(scene, camera);
  if (hostStage && hostVisible) hostStage.render(time, dt);
}
frame();
