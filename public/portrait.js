// Retratos de los personajes: saca una "foto" del modelo 3D y la devuelve como imagen (dataURL).
// Se usan en la tele (tarjetas, lobby, resultados) y en el celu.
import * as THREE from 'three';
import { makeCharacter } from './characters.js';

let renderer = null, scene = null, camera = null;
const cache = new Map();

function setup() {
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(256, 256, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a6a', 1.6));
  const key = new THREE.DirectionalLight('#fff4e0', 2.4); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.4); rim.position.set(-3, 2, -2); scene.add(rim);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
}

export function portraitURL(key, color) {
  const k = key + color;
  if (cache.has(k)) return cache.get(k);
  if (!renderer) setup();
  const g = makeCharacter(key, color);
  g.userData.ring.visible = false; g.userData.blob.visible = false;
  g.rotation.y = -0.35;
  scene.add(g);
  const top = g.userData.top || 1.6;
  camera.position.set(0.55, top * 0.62, 3.6);
  camera.lookAt(0, top * 0.5, 0);
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(g);
  cache.set(k, url);
  return url;
}
