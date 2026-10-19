// La Silla de la Abuela: sillas musicales. Cuando para la música, sentate en una silla libre.
const { Minigame, moveEnt, joyInput, collide, clamp, rand, r2 } = require('./common');

const meta = {
  title: 'La Silla de la Abuela',
  instructions: 'Caminá alrededor de las sillas mientras suena la música. Cuando se corta, ¡corré a sentarte! El que queda parado, afuera. Hay una silla menos que jugadores.',
  control: 'joystick',
};

const ARENA = 9;

class Sillas extends Minigame {
  constructor(players) {
    super(players);
    this.out = [];
    this.round = 0;
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 5.5, z: Math.sin(a) * 5.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, alive: true, seat: null, react: 0, botT: 0 };
    });
    this.phase = 'wait';
    this.chairs = [];
  }
  get alive() { return this.ents.filter((e) => e.alive); }
  newRound() {
    this.round++;
    const c = Math.max(1, this.alive.length - 1);
    this.R = 1.3 + c * 0.32;
    this.chairs = [];
    for (let i = 0; i < c; i++) {
      const a = (i / c) * Math.PI * 2 + this.round;
      this.chairs.push({ x: Math.cos(a) * this.R, z: Math.sin(a) * this.R, a, taken: null });
    }
    for (const e of this.ents) e.seat = null;
    this.phase = 'music';
    this.phaseEnd = this.t + rand(4, 8.5);
    this.cue('*', { text: '🎵 ¡Caminá alrededor!' });
  }
  input(id, m) {
    const e = this.get(id);
    if (e && e.alive && e.seat == null) joyInput(e, m);
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !e.alive || e.seat != null) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.1;
    const d = Math.hypot(e.x, e.z) || 1;
    if (this.phase === 'music') {
      // Da vueltas alrededor, a una distancia prudente
      const want = this.R + 1.9;
      e.ix = -e.z / d + (want - d) * 0.6 * (e.x / d);
      e.iz = e.x / d + (want - d) * 0.6 * (e.z / d);
      e.react = this.t + rand(0.25, 0.7);
    } else if (this.phase === 'scramble' && this.t >= e.react) {
      let best = null, bd = 1e9;
      for (const c of this.chairs) {
        if (c.taken) continue;
        const dd = Math.hypot(c.x - e.x, c.z - e.z);
        if (dd < bd) { bd = dd; best = c; }
      }
      if (best) { e.ix = (best.x - e.x) / bd; e.iz = (best.z - e.z) / bd; } else { e.ix = 0; e.iz = 0; }
    } else { e.ix = 0; e.iz = 0; }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'wait') this.newRound();

    const movers = this.alive.filter((e) => e.seat == null);
    for (const e of movers) moveEnt(e, dt, { accel: 40, friction: 6 });
    collide(this.alive, 0.6);
    for (const e of this.alive) {
      const d = Math.hypot(e.x, e.z) || 1e-6;
      if (d > ARENA) { e.x *= ARENA / d; e.z *= ARENA / d; }
      // Con música no se puede pisar el círculo de sillas
      if (this.phase === 'music' && d < this.R + 1.0) { e.x *= (this.R + 1.0) / d; e.z *= (this.R + 1.0) / d; }
      if (e.seat != null) { const c = this.chairs[e.seat]; e.x = c.x; e.z = c.z; e.ang = Math.atan2(c.x, c.z); }
    }

    if (this.phase === 'music' && this.t >= this.phaseEnd) {
      this.phase = 'scramble';
      this.phaseEnd = this.t + 3.5;
      this.cue('*', { text: '🪑 ¡SENTATE!', buzz: 300 });
    } else if (this.phase === 'scramble') {
      for (const e of movers) {
        for (let i = 0; i < this.chairs.length; i++) {
          const c = this.chairs[i];
          if (c.taken || Math.hypot(c.x - e.x, c.z - e.z) > 0.95) continue;
          c.taken = e.id; e.seat = i; e.vx = e.vz = 0;
          this.event(e.id, '¡Sentado!', 'good');
          this.cue(e.id, { text: '😌 ¡Te sentaste!', buzz: 60 });
          break;
        }
      }
      if (this.chairs.every((c) => c.taken) || this.t >= this.phaseEnd) {
        for (const e of this.alive) {
          if (e.seat != null) continue;
          e.alive = false; this.out.push(e.id);
          this.event(e.id, '¡Quedó parado!', 'bad');
          this.cue(e.id, { text: '😵 ¡Te quedaste parado!', buzz: 400 });
        }
        this.phase = 'reveal';
        this.phaseEnd = this.t + 1.8;
      }
    } else if (this.phase === 'reveal' && this.t >= this.phaseEnd) {
      if (this.alive.length <= 1 || this.n === 1) {
        this.done = true;
        for (const e of this.alive) this.cue(e.id, { text: '👑 ¡Ganaste!' });
      } else this.newRound();
    }
  }
  snapshot() {
    return {
      ...this.base(), phase: this.phase, round: this.round, R: r2(this.R || 2),
      chairs: this.chairs.map((c) => ({ x: r2(c.x), z: r2(c.z), a: r2(c.a), taken: !!c.taken })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), alive: e.alive, seat: e.seat != null,
        st: !e.alive ? '😵 Afuera' : e.seat != null ? '🪑 Sentado' : '🚶 En juego' })),
    };
  }
  ranking() {
    const res = this.alive.map((e) => ({ id: e.id, score: this.n }));
    [...this.out].reverse().forEach((id, i) => res.push({ id, score: this.n - this.alive.length - i }));
    return res.sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Sillas };
