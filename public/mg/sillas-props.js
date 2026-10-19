// Objetos del salón de la abuela.
import * as THREE from 'three';
export { makeChair } from '../props.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true, ...opts });

// Mesita con tocadiscos (el disco gira cuando suena la música)
export function makeLamp() {
  const g = new THREE.Group();
  const wood = mat('#7a4a2b');
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.4), wood); top.position.y = 1.1; g.add(top);
  for (const x of [-0.9, 0.9]) for (const z of [-0.55, 0.55]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), wood); leg.position.set(x, 0.55, z); g.add(leg);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.1), mat('#3a2418')); box.position.y = 1.32; g.add(box);
  const record = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.03, 24), mat('#111111', { roughness: 0.3 }));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.035, 16), mat('#e14b3c'));
  record.add(disc, label); record.position.set(-0.1, 1.5, 0); g.add(record);
  // Bocina tipo gramófono
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 14, 1, true), mat('#d4a017', { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }));
  horn.position.set(0.5, 2.2, 0); horn.rotation.z = -0.9; g.add(horn);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.record = record;
  return g;
}
