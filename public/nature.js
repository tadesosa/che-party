// Naturaleza suelta para el tablero: matas de pasto, flores, piedras y arbustos.
// Todo va en InstancedMesh (una sola pieza por tipo), así no pesa aunque haya cientos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const flat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...opts });

// Ruido suave en el shader del pasto: manchas grandes más oscuras, más claras y más amarillentas,
// así el piso no se ve como una baldosa repetida
const NOISE = `
varying vec2 vWPos;
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){ return vnoise(p) * 0.55 + vnoise(p * 2.3 + 3.1) * 0.3 + vnoise(p * 5.1 + 8.7) * 0.15; }
`;
function macroVariation(material) {
  if (material.userData.macro) return;
  material.userData.macro = true;
  material.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec2 vWPos;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = NOISE + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float nA = fbm(vWPos * 0.045);
      float nB = fbm(vWPos * 0.018 + 17.0);
      diffuseColor.rgb *= mix(0.8, 1.15, nA);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.15, 1.06, 0.7), smoothstep(0.5, 0.78, nB) * 0.55);`);
  };
  material.customProgramCacheKey = () => 'grass-macro';
  material.needsUpdate = true;
}

// ---------- Viento: el pasto y las flores se mecen (más arriba, más se mueven) ----------
export const wind = { value: 0 };
function windy(material, amount = 1) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 wBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #else
        vec3 wBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #endif
      float wH = max(position.y, 0.0);
      float wS = sin(uWind * 1.7 + wBase.x * 0.31 + wBase.z * 0.23) * 0.6 + sin(uWind * 3.3 + wBase.x * 0.9 - wBase.z * 0.7) * 0.25;
      transformed.x += wS * wH * ${(0.32 * amount).toFixed(3)};
      transformed.z += wS * wH * ${(0.14 * amount).toFixed(3)};`);
  };
  material.customProgramCacheKey = () => 'wind' + amount;
  return material;
}

// Copas de los árboles: se mueven en bloque, poquito y lento, cada árbol a su ritmo
export function windFoliage(material) {
  if (material.userData.windy) return material;
  material.userData.windy = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uWind = wind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 fBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float fS = sin(uWind * 1.3 + fBase.x * 0.21 + fBase.z * 0.17) * 0.7 + sin(uWind * 2.7 + fBase.z * 0.5) * 0.3;
      float fK = 0.05 + max(position.y, 0.0) * 0.03;
      transformed.x += fS * fK;
      transformed.z += fS * fK * 0.45;`);
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  material.customProgramCacheKey = () => key + '|foliage';
  return material;
}

// ---------- Geometrías (se arman una vez) ----------
let GEO = null;
function geos() {
  if (GEO) return GEO;
  const blades = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.ConeGeometry(0.07, 0.45 + (i % 3) * 0.12, 3);
    b.translate(0, 0.22, 0);
    b.rotateZ((i - 2) * 0.22); b.rotateY(i * 1.3);
    b.translate(Math.cos(i * 2.4) * 0.07, 0, Math.sin(i * 2.4) * 0.07);
    blades.push(b);
  }
  const tuft = mergeGeometries(blades);
  const stem = new THREE.CylinderGeometry(0.015, 0.015, 0.32, 4); stem.translate(0, 0.16, 0);
  const head = new THREE.IcosahedronGeometry(0.085, 0); head.translate(0, 0.33, 0);
  const rock = new THREE.DodecahedronGeometry(0.28, 0); rock.scale(1, 0.55, 0.85); rock.translate(0, 0.08, 0);
  const bushParts = [[0, 0.45, 0, 0.55], [0.4, 0.35, 0.1, 0.42], [-0.35, 0.32, -0.15, 0.4], [0.05, 0.75, -0.05, 0.38]]
    .map(([x, y, z, r]) => { const g = new THREE.IcosahedronGeometry(r, 1); g.translate(x, y, z); return g; });
  const bush = mergeGeometries(bushParts);
  GEO = { tuft, stem, head, rock, bush };
  return GEO;
}

// Distancia de un punto al camino más cercano (para no tapar casillas con arbustos)
function distToPath(x, z, nodes) {
  let best = Infinity;
  for (const n of nodes) for (const id of n.next) {
    const b = nodes[id], dx = b.x - n.x, dz = b.z - n.z;
    const t = Math.max(0, Math.min(1, ((x - n.x) * dx + (z - n.z) * dz) / (dx * dx + dz * dz || 1)));
    const ex = n.x + dx * t - x, ez = n.z + dz * t - z;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return Math.sqrt(best);
}

// Números al azar pero siempre iguales para el mismo tablero
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

export function scatterNature(group, nodes) {
  group.updateMatrixWorld(true);
  const grounds = [];
  group.traverse((o) => { if (o.isMesh && o.userData.grass) grounds.push(o); });
  if (!grounds.length) return;
  for (const gm of grounds) macroVariation(gm.material);
  const baseGreen = new THREE.Color(grounds[0].userData.grass);

  // Para saber si un punto cae sobre pasto: tiramos un rayo desde arriba y miramos qué toca primero
  const ray = new THREE.Raycaster();
  ray.camera = new THREE.PerspectiveCamera(); // los carteles (sprites) lo necesitan
  const down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
  const targets = group.children.filter((o) => !o.isLight);
  const onGrass = (x, z) => {
    from.set(x, 30, z); ray.set(from, down);
    const hit = ray.intersectObjects(targets, true).find((h) => h.object.visible !== false && !(h.object.material && h.object.material.depthWrite === false && h.object.material.transparent));
    return hit && hit.object.userData.grass ? hit : null;
  };

  // Puntos candidatos dentro del área que se ve
  const rand = rng(nodes.length * 7919 + 13);
  const xs = nodes.map((n) => n.x), zs = nodes.map((n) => n.z);
  const minX = Math.min(...xs) - 18, maxX = Math.max(...xs) + 18, minZ = Math.min(...zs) - 16, maxZ = Math.max(...zs) + 14;
  const picks = { tuft: [], flower: [], rock: [], bush: [] };
  // Más superficie, más plantas (la cuenta base es para un tablero de unos 80 x 55)
  const k = Math.max(1, ((maxX - minX) * (maxZ - minZ)) / 4400);
  const want = { tuft: 900 * k, flower: 260 * k, rock: 90 * k, bush: 70 * k };
  let tries = 0;
  while (tries++ < 6000 * k && Object.keys(want).some((k) => picks[k].length < want[k])) {
    const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ);
    const r = rand();
    const kind = r < 0.62 ? 'tuft' : r < 0.82 ? 'flower' : r < 0.9 ? 'rock' : 'bush';
    if (picks[kind].length >= want[kind]) continue;
    const dPath = distToPath(x, z, nodes);
    if (dPath < (kind === 'bush' ? 4.2 : kind === 'rock' ? 2.2 : 1.6)) continue;
    const hit = onGrass(x, z);
    if (!hit) continue;
    // Las flores y el pasto en grupitos, como en la vida real
    const n = kind === 'tuft' ? 3 : kind === 'flower' ? 4 : 1;
    for (let i = 0; i < n && picks[kind].length < want[kind]; i++) {
      const jx = x + (i ? (rand() - 0.5) * 1.6 : 0), jz = z + (i ? (rand() - 0.5) * 1.6 : 0);
      const h = i ? (distToPath(jx, jz, nodes) < 1.6 ? null : onGrass(jx, jz)) : hit;
      if (!h) continue;
      picks[kind].push([jx, jz, rand(), rand(), h.point.y]);
    }
  }

  const G = geos();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), col = new THREE.Color();
  const place = (mesh, i, [x, z, , , y], rot, s, sy = s, tilt = 0) => {
    pos.set(x, y + 0.005, z); e.set(tilt, rot, tilt * 0.5); q.setFromEuler(e); scl.set(s, sy, s);
    mesh.setMatrixAt(i, m4.compose(pos, q, scl));
  };
  const inst = (geo, mat, count, shadow) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
    m.count = count; m.castShadow = shadow; m.receiveShadow = true;
    group.add(m); return m;
  };

  // Pasto
  const tufts = inst(G.tuft, windy(flat('#ffffff')), picks.tuft.length, false);
  picks.tuft.forEach((p, i) => {
    const [, , a, b] = p;
    place(tufts, i, p, a * 6.3, 0.7 + b * 0.5, 0.55 + a * 0.7);
    col.copy(baseGreen).offsetHSL((b - 0.5) * 0.05, 0.05, (a - 0.5) * 0.12); tufts.setColorAt(i, col);
  });

  // Flores: tallo verde y cabecita de color
  const FLOWER = ['#fff4f0', '#ffd23f', '#ff7aa8', '#b28dff', '#ff6b3d', '#ffffff'];
  const stems = inst(G.stem, windy(flat('#3f8a33')), picks.flower.length, false);
  const heads = inst(G.head, windy(flat('#ffffff', { emissive: '#222222' })), picks.flower.length, false);
  picks.flower.forEach((p, i) => {
    const [, , a, b] = p;
    const s = 0.8 + a * 0.6;
    place(stems, i, p, b * 6.3, s); place(heads, i, p, b * 6.3, s);
    heads.setColorAt(i, col.set(FLOWER[Math.floor(a * 97) % FLOWER.length]));
  });

  // Piedras
  const rocks = inst(G.rock, flat('#ffffff', { roughness: 0.95 }), picks.rock.length, true);
  picks.rock.forEach((p, i) => {
    const [, , a, b] = p;
    place(rocks, i, p, a * 6.3, 0.6 + b * 1.1, 0.5 + a * 0.9, (b - 0.5) * 0.4);
    const g = 0.4 + a * 0.22; rocks.setColorAt(i, col.setRGB(g, g * 0.95, g * 0.88));
  });

  // Arbustos
  const bushes = inst(G.bush, flat('#ffffff'), picks.bush.length, true);
  picks.bush.forEach((p, i) => {
    const [, , a, b] = p;
    place(bushes, i, p, a * 6.3, 0.7 + b * 0.7, 0.6 + a * 0.5);
    col.copy(baseGreen).offsetHSL((a - 0.5) * 0.06, 0.08, -0.06 + (b - 0.5) * 0.1); bushes.setColorAt(i, col);
  });

  for (const m of [tufts, stems, heads, rocks, bushes]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
}
