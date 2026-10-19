// Pisada de Uvas: en la tina, pisá alternando ◀ y ▶ lo más rápido que puedas. Si pisás dos veces con el mismo pie, te resbalás.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Pisada de Uvas',
  instructions: '¡Vendimia! Cada uno en su tina: pisá las uvas alternando ◀ y ▶ lo más rápido que puedas para llenar tu jarra de jugo. Si pisás dos veces con el mismo pie, te resbalás y perdés un segundo. ¡El primero que llena la jarra gana!',
  control: 'lr',
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

const FULL = 60;

class Pisada extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 25; this.order = [];
    this.ents = players.map((p) => ({ id: p.id, juice: 0, side: 0, prevX: 0, lastT: 0, slipT: -9, fin: 0, rate: rand(6.5, 9), acc: 0 }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'input') return;
    const x = clamp(num(m.x), -1, 1);
    const s = x < -0.5 ? -1 : x > 0.5 ? 1 : 0;
    if (s !== 0 && s !== e.prevX) this.stomp(e, s);
    e.prevX = s;
  }
  stomp(e, s) {
    if (!this.started || e.fin || this.done || this.t - e.slipT < 1 || this.t - e.lastT < 0.04) return;
    if (s === e.side) {
      e.slipT = this.t; e.side = 0;
      this.event(e.id, '¡Resbalón!', 'bad');
      this.cue(e.id, { text: '🍇 ¡Te resbalaste! Alterná los pies', buzz: 300 });
      return;
    }
    e.side = s; e.lastT = this.t;
    e.juice = Math.min(FULL, e.juice + 1);
    if (e.juice >= FULL) {
      this.order.push(e.id); e.fin = this.order.length;
      this.event(e.id, e.fin === 1 ? '¡JARRA LLENA!' : `¡${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
      this.cue(e.id, { text: `🍷 ¡Llenaste la jarra ${e.fin}°!`, buzz: 200 });
    }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || !this.started) return;
    e.acc += dt * e.rate * rand(0.8, 1.2);
    while (e.acc >= 1) { e.acc--; this.stomp(e, Math.random() < 0.02 ? e.side || 1 : e.side === 1 ? -1 : 1); }
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
      ...this.base(), full: FULL,
      ents: this.ents.map((e) => ({ id: e.id, juice: e.juice, side: e.side, slip: this.t - e.slipT < 1, fin: e.fin, st: e.fin ? `🍷 ${e.fin}°` : `🍇 ${Math.round((e.juice / FULL) * 100)}%` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.juice })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Pisada };
