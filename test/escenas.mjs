// Prueba las escenas 3D de los minijuegos sin navegador: arma cada escena y la actualiza cuadro por cuadro con
// las fotos reales de una partida de bots. Sirve para encontrar errores de las escenas sin abrir la tele.
// Uso: node test/escenas.mjs [clave1 clave2 ...]   (sin claves prueba todas)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ---------- Un "navegador" mínimo: canvas que no dibuja nada ----------
const ctx2d = new Proxy({}, {
  get: (t, k) => {
    if (k in t) return t[k];
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => {};
  },
  set: (t, k, v) => { t[k] = v; return true; },
});
globalThis.document = { createElement: () => ({ width: 1, height: 1, style: {}, getContext: () => ctx2d, toDataURL: () => '' }) };

const THREE = await import('three');
const { makeCharacter, makeLabel } = await import('../public/models.js');
const { MINIGAMES, createMinigame } = require('../minigames');
const { CHARACTERS } = require('../game');

const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MINIGAMES);
const CASES = { ffa: 4, duel: 2, '2v2': 4, '1v3': 4 };
let fail = 0;
for (const key of keys) {
  let scene;
  try { scene = (await import(`../public/mg/${key}.js`)).default; } catch (e) { console.log(key.padEnd(13), 'NO CARGA:', e.message); fail++; continue; }
  const out = [];
  for (const mode of MINIGAMES[key].modes) {
    const n = CASES[mode];
    const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'J' + i, char: CHARACTERS[i].key }));
    const ids = players.map((p) => p.id);
    const teams = mode === '2v2' ? [ids.slice(0, 2), ids.slice(2)] : mode === '1v3' ? [ids.slice(0, 1), ids.slice(1)] : mode === 'duel' ? [[ids[0]], [ids[1]]] : null;
    const CH = Object.fromEntries(CHARACTERS.map((c) => [c.key, c]));
    const group = new THREE.Group();
    let cam = null;
    const ctx = {
      THREE, group, chars: new Map(), players, CH,
      addChar(p, x, z, scale = 1) {
        const g = makeCharacter(p.char, CH[p.char].color);
        g.position.set(x, 0, z); g.scale.setScalar(scale);
        g.userData.team = teams ? teams.findIndex((t) => t.includes(p.id)) : -1;
        group.add(g); this.chars.set(p.id, g); return g;
      },
      label(text, color = '#ffffff', size = 0.8) { const l = makeLabel(text, { size, bg: null, color }); l.material.transparent = true; return l; },
      floatText() {}, burst() {}, splash() {}, sfx() {}, music() {},
      setCamera(pos, look) { cam = { pos, look }; },
    };
    try {
      const c0 = typeof scene.camera === 'function' ? scene.camera(n) : scene.camera;
      if (!c0 || c0.pos.length !== 3) throw new Error('cámara inicial rara');
      const st = scene.build(ctx);
      const g = createMinigame(key, players, { mode, teams });
      let t = 0, frames = 0;
      while (!g.done && t < 120) {
        for (const p of players) g.bot(p.id, 1 / 30);
        g.step(1 / 30); g.takeCues(); t += 1 / 30;
        const snap = JSON.parse(JSON.stringify({ key, ...g.snapshot() }));
        scene.update(ctx, st, snap, 1 / 30, t);
        frames++;
        if (cam && cam.pos.some((v) => !Number.isFinite(v))) throw new Error('la cámara quedó en NaN (cuadro ' + frames + ')');
      }
      let bad = 0;
      group.traverse((o) => { if (o.position && [o.position.x, o.position.y, o.position.z].some((v) => !Number.isFinite(v))) bad++; });
      if (bad) throw new Error(`${bad} objetos con posición NaN`);
      out.push(`${mode} ok (${frames} cuadros, ${group.children.length} objetos)`);
    } catch (e) { fail++; out.push(`${mode} ERROR ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  }
  console.log(key.padEnd(13), out.join(' · '));
}
process.exit(fail ? 1 : 0);
