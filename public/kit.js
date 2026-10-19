// Modelos 3D de Kenney (kenney.nl, licencia CC0): árboles, casas de Caminito y el kiosco.
// Se cargan una sola vez al abrir la pantalla; después se clonan al instante.
// Si algún archivo falta, el tablero usa los modelos dibujados por código.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const LIST = [
  'nature/tree_oak', 'nature/tree_detailed',
  'suburban/building-type-a', 'suburban/building-type-c', 'suburban/building-type-f', 'suburban/building-type-h', 'suburban/building-type-k', 'suburban/building-type-o',
  'market/display-fruit', 'market/display-bread', 'market/character-employee',
];

const store = new Map();
let ready = false;

export async function loadKit() {
  const loader = new GLTFLoader();
  const results = await Promise.allSettled(LIST.map((name) => loader.loadAsync('/models/' + name + '.glb').then((g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (o.material.map) o.material.map.anisotropy = 4;
    });
    store.set(name, g.scene);
  })));
  ready = results.every((r) => r.status === 'fulfilled');
  if (!ready) console.warn('Che Party: faltan modelos de Kenney, uso los dibujados por código');
  return ready;
}

export const kitReady = () => ready;

// Copia del modelo, apoyada en el piso y centrada; `size` = alto (o ancho con fit: 'width')
export function kit(name, size = 1, fit = 'height') {
  const src = store.get(name);
  if (!src) return null;
  const o = cloneSkinned(src); // los personajes tienen esqueleto: una copia común los deja invisibles
  const box = new THREE.Box3().setFromObject(o), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = size / (fit === 'width' ? Math.max(s.x, s.z) : s.y);
  // El tamaño va en un grupo de adentro, así quien lo use puede escalarlo de nuevo sin perderlo
  const inner = new THREE.Group(), g = new THREE.Group();
  o.position.set(-c.x, -box.min.y, -c.z);
  inner.add(o); inner.scale.setScalar(k); g.add(inner);
  return g;
}

// ---------- Repintar la paleta de Kenney ----------
// Los modelos de ciudad toman el color de una imagen con franjas (colormap.png).
// Pintando otra vez algunas franjas sacamos casas de Caminito de todos los colores.
const SWATCH = { roof: [0, 128], wall: [192, 256] }; // esquina (x, y) de cada franja de 64x128 en la imagen de 512
const paletteCache = new Map();
function repaintedMap(map, colors) {
  const key = map.uuid + JSON.stringify(colors);
  if (paletteCache.has(key)) return paletteCache.get(key);
  const img = map.image, c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const sc = img.width / 512;
  for (const [part, col] of Object.entries(colors)) {
    const [sx, sy] = SWATCH[part];
    const base = new THREE.Color(col), dark = base.clone().multiplyScalar(0.78);
    const g = x.createLinearGradient(0, sy * sc, 0, (sy + 128) * sc);
    g.addColorStop(0, '#' + base.getHexString()); g.addColorStop(1, '#' + dark.getHexString());
    x.fillStyle = g; x.fillRect(sx * sc, sy * sc, 64 * sc, 128 * sc);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = map.flipY; t.magFilter = map.magFilter; t.minFilter = map.minFilter; t.anisotropy = 4;
  paletteCache.set(key, t);
  return t;
}
export function repaint(obj, colors) {
  obj.traverse((o) => {
    if (!o.isMesh || !o.material.map) return;
    o.material = o.material.clone();
    o.material.map = repaintedMap(o.material.map, colors);
  });
  return obj;
}
