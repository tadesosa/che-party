// Corte de Luz: se cortó la luz en la casa. Cada uno tiene una linterna; el primero que llega a la caja de fusibles suma.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Corte de Luz',
  instructions: '¡Se cortó la luz! Está todo oscuro y cada uno tiene su linterna. Buscá la caja de fusibles ⚡ y tocala antes que los demás para volver a dar la luz. Cada fusible suma un punto y aparece otro en otro lado.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
};

const FIELD = 8.5, LIGHT = 3.2, TOUCH = 1.0;

class CorteDeLuz extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.fuseN = 0;
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 2, z: Math.sin(a) * 2, vx: 0, vz: 0, ix: 0, iz: 0, ang: a, score: 0, botT: 0, goal: null };
    });
    this.newFuse();
  }
  newFuse() {
    // Lejos de todos, para que haya que buscarla
    let best = null, bd = -1;
    for (let k = 0; k < 20; k++) {
      const x = rand(-FIELD + 1, FIELD - 1), z = rand(-FIELD + 1, FIELD - 1);
      const d = Math.min(...this.ents.map((e) => Math.hypot(e.x - x, e.z - z)));
      if (d > bd) { bd = d; best = { x, z }; }
    }
    this.fuse = { ...best, n: ++this.fuseN, at: this.t };
  }
  seen() { return this.ents.some((e) => Math.hypot(e.x - this.fuse.x, e.z - this.fuse.z) < LIGHT); }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.2;
    // Si alguien la ilumina, va derecho; si no, recorre la casa
    let g;
    if (this.seen()) g = this.fuse;
    else {
      if (!e.goal || Math.hypot(e.goal.x - e.x, e.goal.z - e.z) < 1) e.goal = { x: rand(-FIELD + 1, FIELD - 1), z: rand(-FIELD + 1, FIELD - 1) };
      g = e.goal;
    }
    const dx = g.x - e.x, dz = g.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d * rand(0.8, 1); e.iz = dz / d * rand(0.8, 1);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      moveEnt(e, dt, { slow: 0.8 });
      e.x = Math.max(-FIELD, Math.min(FIELD, e.x)); e.z = Math.max(-FIELD, Math.min(FIELD, e.z));
    }
    collide(this.ents, 0.6, 0.4);
    for (const e of this.ents) {
      if (Math.hypot(e.x - this.fuse.x, e.z - this.fuse.z) > TOUCH) continue;
      e.score++;
      this.event(e.id, '¡Volvió la luz! +1', 'gold');
      this.cue(e.id, { text: '⚡ ¡Arreglaste el fusible!', buzz: 120 });
      this.lastFix = { id: e.id, at: this.t };
      this.newFuse();
      break;
    }
  }
  snapshot() {
    return {
      ...this.base(), light: LIGHT, field: FIELD,
      fuse: { x: r2(this.fuse.x), z: r2(this.fuse.z), n: this.fuse.n },
      flash: this.lastFix && this.t - this.lastFix.at < 0.5,
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), st: `⚡ ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: CorteDeLuz };
