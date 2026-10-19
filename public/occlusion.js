// Lo que se mete entre la cámara y el jugador (árboles, casas, otros personajes) se vuelve transparente,
// así siempre se ve a quién le toca.
import * as THREE from 'three';

const box = new THREE.Box3();
const size = new THREE.Vector3();
const ray = new THREE.Ray();
const hit = new THREE.Vector3();
const dir = new THREE.Vector3();

// Materiales propios para poder hacerlo transparente sin tocar a los demás que comparten el material
function own(o) {
  if (o.userData.fadeMats) return o.userData.fadeMats;
  const mats = [];
  o.traverse((m) => {
    if (!m.isMesh && !m.isSprite) return;
    const list = Array.isArray(m.material) ? m.material : [m.material];
    const cloned = list.map((mat) => {
      const c = mat.clone();
      c.userData.baseOpacity = mat.opacity;
      c.userData.baseTransparent = mat.transparent;
      c.userData.baseDepthWrite = mat.depthWrite;
      mats.push(c);
      return c;
    });
    m.material = Array.isArray(m.material) ? cloned : cloned[0];
  });
  o.userData.fadeMats = mats;
  return mats;
}

function setFade(o, k) {
  const mats = own(o);
  for (const m of mats) {
    const faded = k < 0.99;
    m.transparent = faded || m.userData.baseTransparent;
    m.depthWrite = faded ? false : m.userData.baseDepthWrite;
    m.opacity = m.userData.baseOpacity * k;
  }
}

// root: el grupo del tablero. Solo se tienen en cuenta las cosas altas y no muy grandes (no el piso ni el agua).
export function makeOcclusion(root) {
  const items = [];
  root.updateMatrixWorld(true);
  for (const o of root.children) {
    if (o.isInstancedMesh || o.isSprite) continue;
    box.setFromObject(o);
    if (box.isEmpty()) continue;
    box.getSize(size);
    if (size.y < 1.3 || Math.max(size.x, size.z) > 16) continue;
    items.push({ o, box: box.clone(), k: 1, want: 1 });
  }
  const dyn = []; // personajes: se mueven, se miden cada vez
  let t = 0;
  return {
    items,
    // cam: posición de la cámara; target: el punto que no se tiene que tapar; others: [{ o, skip }]
    update(dt, cam, target, others = []) {
      t -= dt;
      if (t <= 0) {
        t = 0.12;
        dir.copy(target).sub(cam);
        const dist = dir.length();
        dir.normalize();
        ray.set(cam, dir);
        for (const it of items) {
          const b = it.box;
          // Un poco más grande para que no aparezca de golpe en el borde
          box.copy(b).expandByScalar(0.35);
          it.want = ray.intersectBox(box, hit) && hit.distanceTo(cam) < dist - 1.2 ? 0.18 : 1;
        }
        dyn.length = 0;
        for (const { o, skip } of others) {
          if (skip) { dyn.push({ o, want: 1 }); continue; }
          box.setFromObject(o).expandByScalar(0.1);
          dyn.push({ o, want: ray.intersectBox(box, hit) && hit.distanceTo(cam) < dist - 0.8 ? 0.25 : 1 });
        }
      }
      const a = 1 - Math.exp(-8 * dt);
      for (const it of items) {
        if (Math.abs(it.k - it.want) < 0.005) continue;
        it.k += (it.want - it.k) * a;
        if (Math.abs(it.k - it.want) < 0.01) it.k = it.want;
        setFade(it.o, it.k);
      }
      for (const d of dyn) {
        const k0 = d.o.userData.fadeK ?? 1;
        if (Math.abs(k0 - d.want) < 0.005) continue;
        let k = k0 + (d.want - k0) * a;
        if (Math.abs(k - d.want) < 0.01) k = d.want;
        d.o.userData.fadeK = k;
        setFade(d.o, k);
      }
    },
    // Todo vuelve a verse (al salir del tablero)
    reset() {
      for (const it of items) if (it.k !== 1) { it.k = it.want = 1; setFade(it.o, 1); }
    },
  };
}
