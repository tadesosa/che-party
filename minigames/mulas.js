// Carrera de Mulas en la Cordillera: la mula avanza si alternás ◀ y ▶. Cada tanto se empaca:
// ahí hay que mantener apretado para un solo lado hasta que arranque.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Carrera de Mulas',
  instructions: 'Arreá tu mula por la Cordillera alternando ◀ y ▶. ¡Ojo! Cada tanto la mula se empaca (aparece 😤): ahí dejá de alternar y mantené apretado ▶ hasta que vuelva a andar. El primero que cruza el paso gana.',
  control: 'lr',
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

const TARGET = 34, STEP = 0.7, PULL = 1.2;

class Mulas extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40; this.order = [];
    this.ents = players.map((p) => ({ id: p.id, d: 0, side: 0, x: 0, prevX: 0, lastT: 0, stuck: false, pull: 0, nextStuck: 3 + rand(2.5, 5), fin: 0,
      botNext: 0, botGap: rand(0.17, 0.24), botReact: rand(0.25, 0.6) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'input') return;
    e.x = clamp(num(m.x), -1, 1);
    const s = e.x < -0.5 ? -1 : e.x > 0.5 ? 1 : 0;
    if (s !== 0 && s !== e.prevX) this.trot(e, s);
    e.prevX = s;
  }
  trot(e, s) {
    if (!this.started || e.fin || this.done || e.stuck || s === e.side || this.t - e.lastT < 0.08) { e.side = s; return; }
    e.side = s; e.lastT = this.t;
    e.d = Math.min(TARGET, e.d + STEP);
    if (e.d >= TARGET) {
      this.order.push(e.id); e.fin = this.order.length;
      this.event(e.id, e.fin === 1 ? '¡CRUZÓ PRIMERO!' : `¡${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
      this.cue(e.id, { text: `🫏 ¡Llegaste ${e.fin}°!`, buzz: 200 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || e.fin) return;
    if (e.stuck) { e.x = this.t - e.stuckAt > e.botReact ? 1 : -1; return; }
    if (this.t < e.botNext) return;
    e.botNext = this.t + e.botGap * rand(0.85, 1.2);
    this.trot(e, e.side === 1 ? -1 : 1);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    for (const e of this.ents) {
      if (e.fin) continue;
      if (!e.stuck && this.t >= e.nextStuck) {
        e.stuck = true; e.stuckAt = this.t; e.pull = 0;
        this.event(e.id, '¡Se empacó!', 'bad');
        this.cue(e.id, { text: '😤 ¡Se empacó! Mantené ▶', buzz: [100, 50, 100] });
      }
      if (e.stuck) {
        e.pull = e.x > 0.5 ? e.pull + dt : Math.max(0, e.pull - dt * 0.5);
        if (e.pull >= PULL) { e.stuck = false; e.nextStuck = this.t + rand(3, 6); this.cue(e.id, { text: '🫏 ¡Arrancó!' }); }
      }
    }
    if (this.ents.every((e) => e.fin) || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1) this.done = true;
    }
  }
  snapshot() {
    return {
      ...this.base(), target: TARGET,
      ents: this.ents.map((e) => ({ id: e.id, d: r2(e.d), stuck: e.stuck, pull: r2(e.pull / PULL), trot: r2(Math.max(0, 1 - (this.t - e.lastT) / 0.25)), fin: e.fin,
        st: e.fin ? `🫏 ${e.fin}°` : e.stuck ? '😤 ¡Empacada!' : `🫏 ${Math.round((e.d / TARGET) * 100)}%` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.d })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Mulas };
