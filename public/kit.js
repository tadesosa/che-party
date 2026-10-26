// Modelos 3D de Kenney (kenney.nl, licencia CC0): árboles y el kiosco.
// Se cargan una sola vez al abrir la pantalla; después se clonan al instante.
// Si algún archivo falta, el tablero usa los modelos dibujados por código.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const LIST = [
  'nature/tree_oak', 'nature/tree_detailed',
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
