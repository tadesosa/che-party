// Paleta Playera: la pelotita va de uno a otro en ronda. Cuando te llega, pegale justo: muy temprano o muy tarde, se cae.
// Cada vez va más rápido. El que deja caer la pelotita pierde una vida.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Paleta Playera',
  instructions: 'Están todos en ronda con paletas. La pelotita viaja de uno a otro: cuando llega a vos (se marca con tu color), apretá PEGAR justo cuando baja. Muy temprano o muy tarde, se te cae y perdés una vida. ¡Cada vez va más rápido! El último con vidas gana.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🏓 ¡PEGAR!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

const LIVES = 3, WIN = 0.22, LAG = 0.06;

class Paleta extends Minigame {
  constructor(players) {
    super(players);
    this.ents = players.map((p) => ({ id: p.id, lives: LIVES, hits: 0, outAt: 0, missT: -9, skill: rand(0.78, 0.92) }));
    this.speed = 1;
    this.ball = null; this.pause = 3 + 1;
    this.order = [];
  }
  get alive() { return this.ents.filter((e) => e.lives > 0); }
  // Lanza la pelotita desde un jugador a otro (al azar entre los vivos)
  launch(fromId) {
    const opts = this.alive.filter((e) => e.id !== fromId);
    if (!opts.length) return;
    const to = opts[Math.floor(Math.random() * opts.length)];
    const T = Math.max(0.55, 1.5 / this.speed);
    this.ball = { from: fromId, to: to.id, t0: this.t, T, done: false };
    this.cue(to.id, { text: '🏓 ¡Va para vos!', buzz: 40 });
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action') this.hit(e, this.t - LAG); }
  hit(e, t) {
    const b = this.ball;
    if (!b || b.to !== e.id || b.done || e.lives <= 0) return;
    const d = t - (b.t0 + b.T);
    if (Math.abs(d) <= WIN) {
      b.done = true; e.hits++;
      this.event(e.id, Math.abs(d) < 0.08 ? '¡Justo!' : '¡Toc!', Math.abs(d) < 0.08 ? 'gold' : 'good');
      this.speed += 0.1;
      this.launch(e.id);
    } else if (d < -WIN) { b.early = true; this.drop(e, '¡Muy temprano!'); }
  }
  drop(e, why) {
    if (this.ball) this.ball.done = true;
    e.lives--; e.missT = this.t;
    if (e.lives <= 0) { e.outAt = this.t; this.order.push(e.id); }
    this.event(e.id, why, 'bad');
    this.cue(e.id, { text: e.lives > 0 ? `💔 ${why} Te quedan ${e.lives}` : '😵 ¡Quedaste afuera!', buzz: 350 });
    this.ball = null; this.pause = this.t + 1.2; this.next = e.lives > 0 ? e.id : null;
  }
  bot(id) {
    const e = this.get(id); const b = this.ball;
    if (!e || !b || b.to !== id || b.done) return;
    if (!b.botAt) b.botAt = b.t0 + b.T + (Math.random() < e.skill ? rand(-0.12, 0.12) : rand(0.25, 0.4) * (Math.random() < 0.5 ? -1 : 1));
    if (this.t >= b.botAt) this.hit(e, this.t);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    // A los 40 segundos termina igual (gana el que tiene más vidas)
    if (this.tt > 40) { this.over = true; this.endAt = this.t; this.ball = null; return; }
    const b = this.ball;
    if (!b && this.t >= this.pause) {
      if (this.alive.length <= 1) { this.over = true; this.endAt = this.t; return; }
      const from = this.next && this.get(this.next).lives > 0 ? this.next : this.alive[Math.floor(Math.random() * this.alive.length)].id;
      this.launch(from);
    } else if (b && !b.done && this.t > b.t0 + b.T + WIN + LAG) this.drop(this.get(b.to), '¡Se cayó!');
  }
  snapshot() {
    const b = this.ball;
    return {
      ...this.base(), ball: b && !b.done ? { from: b.from, to: b.to, k: r2(Math.min(1.2, (this.t - b.t0) / b.T)) } : null,
      ents: this.ents.map((e) => ({ id: e.id, lives: e.lives, miss: this.t - e.missT < 0.8, st: e.lives > 0 ? `${'❤️'.repeat(e.lives)}` : '😵 Afuera' })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: (e.lives > 0 ? 1000 + e.lives * 10 : e.outAt) + e.hits * 0.01 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Paleta };
