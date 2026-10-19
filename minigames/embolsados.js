// Carrera de Embolsados: saltás alternando ◀ y ▶ con ritmo. Si vas demasiado rápido, te caés.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Carrera de Embolsados',
  instructions: 'Metido en la bolsa, saltá apretando ◀ y ▶ alternados. ¡Con ritmo! Si apurás los saltos te vas al piso y perdés tiempo. El primero en llegar gana.',
  control: 'lr',
  modes: ['ffa', 'duel'],
};

const TARGET = 26;
const MIN_GAP = 0.24; // saltar más rápido que esto te tira al piso
const JUMP = 1.0;

class Embolsados extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35; this.order = [];
    this.ents = players.map((p) => ({ id: p.id, dist: 0, side: 0, prevX: 0, lastT: -9, fall: 0, fallT: -9, jumpT: -9, fin: 0,
      botGap: rand(0.27, 0.36), botNext: 0, botSide: 1 }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'input') return;
    const x = clamp(num(m.x), -1, 1);
    const s = x < -0.5 ? -1 : x > 0.5 ? 1 : 0;
    if (s !== 0 && s !== e.prevX) this.hop(e, s);
    e.prevX = s;
  }
  hop(e, s) {
    if (!this.started || e.fin || this.done || this.t < e.fall) return;
    if (s === e.side) return; // hay que alternar
    if (this.t - e.lastT < MIN_GAP) {
      e.fall = this.t + 1.3; e.fallT = this.t; e.side = 0;
      this.event(e.id, '¡Al piso!', 'bad');
      this.cue(e.id, { text: '🤕 ¡Muy apurado! Te caíste', buzz: 400 });
      return;
    }
    e.side = s; e.lastT = this.t; e.jumpT = this.t;
    e.dist = Math.min(TARGET, e.dist + JUMP);
    if (e.dist >= TARGET) {
      this.order.push(e.id); e.fin = this.order.length;
      this.event(e.id, e.fin === 1 ? '¡GANÓ!' : `¡Llegó ${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
      this.cue(e.id, { text: `🏁 ¡Llegaste ${e.fin}°!`, buzz: 200 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || e.fin || this.t < e.botNext) return;
    // A veces se apura de más y se cae
    e.botNext = this.t + (Math.random() < 0.06 ? 0.12 : e.botGap * rand(0.9, 1.15));
    e.botSide = -e.botSide;
    this.hop(e, e.botSide);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.ents.every((e) => e.fin) || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1) this.done = true;
    }
  }
  snapshot() {
    return {
      ...this.base(), target: TARGET,
      ents: this.ents.map((e) => ({ id: e.id, d: r2(e.dist), fin: e.fin, down: this.t < e.fall, jump: r2(Math.max(0, 1 - (this.t - e.jumpT) / 0.22)),
        st: e.fin ? `🏁 ${e.fin}°` : `🛍️ ${Math.round((e.dist / TARGET) * 100)}%` })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.dist })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Embolsados };
