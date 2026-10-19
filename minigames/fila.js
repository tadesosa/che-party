// La Fila del Banco: avanzá hasta la ventanilla mientras el guardia no mira. Si te ve moviéndote, ¡a la cola!
const { COUNTDOWN, Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'La Fila del Banco',
  instructions: 'Empujá el joystick para adelante para avanzar en la fila. Cuando el guardia se da vuelta, ¡quedate quieto! Si te agarra moviéndote, te manda al fondo. El primero en llegar a la ventanilla gana.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
};

const GOAL = 20, SPEED = 3.4;

class Fila extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 45; this.order = [];
    this.guard = 'away'; // away (se puede avanzar) | turning (ojo) | look (quietos)
    this.next = COUNTDOWN + rand(2, 3.5);
    this.ents = players.map((p) => ({ id: p.id, d: 0, iz: 0, moving: 0, fin: 0, caughtT: -9, react: rand(0.18, 0.45), greed: rand(0, 0.12) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'input') e.iz = clamp(-num(m.y), 0, 1); // hacia arriba en el celu = avanzar
  }
  bot(id) {
    const e = this.get(id); if (!e || !this.started) return;
    const since = this.t - this.changedAt;
    if (this.guard === 'away') e.iz = since > e.react ? 1 : 0;
    // Algunos se arriesgan y siguen un toque cuando el guardia ya se está dando vuelta
    else if (this.guard === 'turning') e.iz = since < e.greed * 3 ? 1 : 0;
    else e.iz = 0;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) { this.changedAt = this.t; return; }
    if (this.t >= this.next) {
      if (this.guard === 'away') { this.guard = 'turning'; this.next = this.t + 0.55; }
      else if (this.guard === 'turning') { this.guard = 'look'; this.next = this.t + rand(1.3, 2.6); }
      else { this.guard = 'away'; this.next = this.t + rand(1.2, 3.8); }
      this.changedAt = this.t;
    }
    for (const e of this.ents) {
      if (e.fin) continue;
      e.moving = e.iz > 0.2 ? e.iz : 0;
      if (this.guard === 'look' && e.moving && this.t - this.changedAt > 0.12) {
        e.d = Math.max(0, e.d - 7); e.caughtT = this.t; e.iz = 0;
        this.event(e.id, '¡A la cola!', 'bad');
        this.cue(e.id, { text: '👮 ¡Te vio! Al fondo', buzz: 400 });
        continue;
      }
      if (this.t - e.caughtT < 0.8) continue;
      e.d = Math.min(GOAL, e.d + e.moving * SPEED * dt);
      if (e.d >= GOAL) {
        this.order.push(e.id); e.fin = this.order.length;
        this.event(e.id, e.fin === 1 ? '¡PRIMERO!' : `¡${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
        this.cue(e.id, { text: `🏦 ¡Llegaste ${e.fin}°!`, buzz: 200 });
      }
    }
    if (this.order.length >= Math.min(this.n, 3) || this.ents.every((e) => e.fin) || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1) this.done = true;
    }
  }
  snapshot() {
    return {
      ...this.base(), guard: this.guard, goal: GOAL,
      ents: this.ents.map((e) => ({ id: e.id, d: r2(e.d), mv: e.moving > 0, caught: this.t - e.caughtT < 0.8, fin: e.fin,
        st: e.fin ? `🏦 ${e.fin}°` : `🚶 ${Math.round((e.d / GOAL) * 100)}%` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : r2(e.d) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Fila };
