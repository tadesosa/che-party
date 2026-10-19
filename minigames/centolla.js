// La Garra de la Centolla: como la máquina de los peluches, pero en la pecera del puerto de Ushuaia.
// Movés tu garra con el joystick y apretás BAJAR: si agarra una centolla, suma (las grandes valen más).
const { Minigame, joyInput, rand, clamp, r2 } = require('./common');

const meta = {
  title: 'La Garra de la Centolla',
  instructions: 'Cada uno tiene una garra arriba de la pecera. Movela con el joystick y apretá BAJAR cuando esté justo encima de una centolla. Las chiquitas valen 1, las medianas 2 y la reina dorada 5. Las centollas caminan de costado, ¡calculá bien! Gana el que junta más puntos.',
  control: 'joystick',
  action: '🦀 ¡BAJAR!',
  modes: ['ffa', 'duel'],
  board: 'sur',
};

const W = 9, D = 5.5, DOWN = 0.55, UP = 0.55;

class Centolla extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35;
    this.crabs = []; this.cId = 0;
    for (let i = 0; i < 9; i++) this.addCrab();
    this.ents = players.map((p, i) => ({ id: p.id, x: -W + 1.5 + (i / Math.max(1, this.n - 1)) * (2 * W - 3), z: -D + 1.5, ix: 0, iz: 0, drop: -9, grabbed: null, pts: 0, botT: 0, tgt: null }));
  }
  addCrab() {
    const r = Math.random(), size = r < 0.1 ? 3 : r < 0.45 ? 2 : 1;
    this.crabs.push({ id: ++this.cId, x: rand(-W + 1, W - 1), z: rand(-D + 1, D - 1), dir: Math.random() < 0.5 ? -1 : 1, speed: size === 3 ? 2.6 : rand(0.8, 1.8), size, turn: rand(1, 3) });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.down(e);
  }
  busy(e) { return this.t - e.drop < DOWN + UP + 0.2; }
  down(e) { if (!this.started || this.done || this.busy(e)) return; e.drop = this.t; e.grabbed = null; e.checked = false; }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) <= 0) {
      e.botT = 0.3;
      // Prefiere las grandes y cercanas
      e.tgt = this.crabs.filter((c) => !c.held).sort((a, b) => (Math.hypot(a.x - e.x, a.z - e.z) - a.size * 2.5) - (Math.hypot(b.x - e.x, b.z - e.z) - b.size * 2.5))[0] || null;
    }
    const c = e.tgt;
    if (!c || c.held) { e.ix = 0; e.iz = 0; return; }
    const px = c.x + c.dir * c.speed * DOWN, dx = px - e.x, dz = c.z - e.z, d = Math.hypot(dx, dz);
    e.ix = d > 0.15 ? clamp(dx * 1.5, -1, 1) : 0; e.iz = d > 0.15 ? clamp(dz * 1.5, -1, 1) : 0;
    if (d < 0.45 + rand(0, 0.2) && !this.busy(e)) this.down(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const c of this.crabs) {
      if (c.held) continue;
      c.turn -= dt;
      if (c.turn <= 0 || Math.abs(c.x) > W - 0.5) { c.dir = c.x > W - 0.5 ? -1 : c.x < -W + 0.5 ? 1 : -c.dir; c.turn = rand(1, 3); }
      c.x += c.dir * c.speed * dt;
      c.z = clamp(c.z + Math.sin(this.t * 0.7 + c.id) * 0.25 * dt, -D + 0.8, D - 0.8);
    }
    for (const e of this.ents) {
      const busy = this.busy(e);
      if (!busy) {
        e.x = clamp(e.x + e.ix * 6 * dt, -W + 0.5, W - 0.5);
        e.z = clamp(e.z + e.iz * 6 * dt, -D + 0.5, D - 0.5);
      }
      // Al llegar abajo, agarra la centolla más grande que esté debajo
      if (busy && !e.checked && this.t - e.drop >= DOWN) {
        e.checked = true;
        const under = this.crabs.filter((c) => !c.held && Math.hypot(c.x - e.x, c.z - e.z) < 0.55 + c.size * 0.12).sort((a, b) => b.size - a.size)[0];
        if (under) {
          under.held = e.id; e.grabbed = under.id;
          const pts = under.size === 3 ? 5 : under.size;
          e.pts += pts;
          this.event(e.id, under.size === 3 ? '¡LA REINA! +5' : `+${pts}`, under.size === 3 ? 'gold' : 'good');
          this.cue(e.id, { buzz: 60 });
        } else { this.event(e.id, 'Nada…', 'bad'); }
      }
      // Cuando la garra vuelve a subir, la centolla agarrada se va y aparece otra
      if (e.grabbed && !busy) {
        this.crabs = this.crabs.filter((c) => c.id !== e.grabbed);
        e.grabbed = null; this.addCrab();
      }
    }
    // Las garras no se pisan entre sí
    for (let i = 0; i < this.ents.length; i++) for (let j = i + 1; j < this.ents.length; j++) {
      const a = this.ents[i], b = this.ents[j], d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d < 1 && d > 0) { const k = (1 - d) / 2, nx = (b.x - a.x) / d, nz = (b.z - a.z) / d; a.x -= nx * k; a.z -= nz * k; b.x += nx * k; b.z += nz * k; }
    }
  }
  snapshot() {
    return {
      ...this.base(), w: W, d: D,
      crabs: this.crabs.map((c) => ({ id: c.id, x: r2(c.x), z: r2(c.z), size: c.size, dir: c.dir, held: c.held || null })),
      ents: this.ents.map((e) => {
        const u = this.t - e.drop;
        const h = u < DOWN ? u / DOWN : u < DOWN + UP ? 1 - (u - DOWN) / UP : 0;
        return { id: e.id, x: r2(e.x), z: r2(e.z), h: r2(Math.max(0, h)), grabbed: e.grabbed, st: `🦀 ${e.pts}` };
      }),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.pts })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Centolla };
