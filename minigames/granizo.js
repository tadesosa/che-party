// Malla Antigranizo: juntá racimos por el viñedo mientras cae granizo. Donde aparece la sombra, va a caer una piedra.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Malla Antigranizo',
  instructions: 'Se largó el granizo en el viñedo. Caminá para juntar los racimos (se agarran solos) y esquivá las sombras: ahí va a caer una piedra de hielo. Si te pega, se te caen 2 racimos. También podés meterte abajo de la malla (la parte verde): ahí no te pega nada, pero no hay racimos.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

const FIELD = 8.5, NET = { x: 0, z: -7, w: 6, d: 2.4 };

class Granizo extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35;
    this.grapes = []; this.gId = 0;
    this.hail = []; this.hId = 0; this.nextHail = 3.5;
    for (let k = 0; k < 7; k++) this.spawnGrape();
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 3, z: Math.sin(a) * 3, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, score: 0, hitT: -9, botT: 0 };
    });
  }
  underNet(x, z) { return Math.abs(x - NET.x) < NET.w / 2 && Math.abs(z - NET.z) < NET.d / 2; }
  spawnGrape() {
    let x, z;
    do { x = rand(-FIELD + 1, FIELD - 1); z = rand(-FIELD + 1, FIELD - 1); } while (this.underNet(x, z));
    this.grapes.push({ id: ++this.gId, x, z });
  }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    const g = this.grapes.reduce((a, b) => (Math.hypot(b.x - e.x, b.z - e.z) < Math.hypot(a.x - e.x, a.z - e.z) ? b : a), this.grapes[0]);
    let fx = g.x - e.x, fz = g.z - e.z;
    const d = Math.hypot(fx, fz) || 1; fx /= d; fz /= d;
    // Se corre de las sombras que van a caer pronto (a veces no las ve)
    for (const h of this.hail) {
      const hd = Math.hypot(e.x - h.x, e.z - h.z);
      if (hd < 1.8 && h.t - this.t < 0.9 && Math.random() < 0.75) { fx += (e.x - h.x) / hd * 2; fz += (e.z - h.z) / hd * 2; }
    }
    const l = Math.hypot(fx, fz) || 1;
    e.ix = fx / l; e.iz = fz / l;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    // Cada vez cae más seguido
    if (this.t >= this.nextHail) {
      this.nextHail = this.t + Math.max(0.12, 0.5 - this.tt * 0.01);
      const target = Math.random() < 0.5 ? this.ents[Math.floor(Math.random() * this.n)] : null;
      const x = target ? target.x + rand(-1.5, 1.5) : rand(-FIELD, FIELD), z = target ? target.z + rand(-1.5, 1.5) : rand(-FIELD, FIELD);
      if (!this.underNet(x, z)) this.hail.push({ id: ++this.hId, x, z, t: this.t + 1.2 });
    }
    for (const e of this.ents) {
      moveEnt(e, dt, { slow: this.t - e.hitT < 0.8 ? 0.3 : 1 });
      e.x = Math.max(-FIELD, Math.min(FIELD, e.x)); e.z = Math.max(-FIELD, Math.min(FIELD, e.z));
      const g = this.grapes.find((g) => Math.hypot(g.x - e.x, g.z - e.z) < 0.9);
      if (g) { e.score++; this.grapes = this.grapes.filter((x) => x !== g); this.spawnGrape(); this.event(e.id, '+1', 'good'); }
    }
    collide(this.ents, 0.6, 0.5);
    for (const h of this.hail) {
      if (h.done || this.t < h.t) continue;
      h.done = true;
      for (const e of this.ents) {
        if (Math.hypot(e.x - h.x, e.z - h.z) > 0.95 || this.t - e.hitT < 0.8) continue;
        const lost = Math.min(2, e.score); e.score -= lost; e.hitT = this.t;
        this.event(e.id, lost ? `¡Piedrazo! −${lost}` : '¡Piedrazo!', 'bad');
        this.cue(e.id, { text: '🧊 ¡Te pegó el granizo!', buzz: 300 });
      }
    }
    this.hail = this.hail.filter((h) => this.t - h.t < 0.4);
  }
  snapshot() {
    return {
      ...this.base(), net: NET,
      grapes: this.grapes.map((g) => ({ id: g.id, x: r2(g.x), z: r2(g.z) })),
      hail: this.hail.map((h) => ({ id: h.id, x: r2(h.x), z: r2(h.z), k: r2(Math.max(0, Math.min(1, 1 - (h.t - this.t) / 1.2))), hit: !!h.done })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), hit: this.t - e.hitT < 0.8, st: `🍇 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Granizo };
