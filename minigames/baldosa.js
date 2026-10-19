// La Baldosa Floja: algunas baldosas se marcan un ratito. Después se ven todas iguales…
// cuando suena el silbato, las flojas salpican. Memorizá y parate en una firme.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'La Baldosa Floja',
  instructions: 'Mirá bien: algunas baldosas se marcan en rojo (¡están flojas!). Después se ven todas iguales. Antes del silbato, parate en una baldosa firme. Si quedás arriba de una floja, te salpica todo. Cada ronda que zafás suma un punto.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
};

const N = 5, CELL = 2.4, HALF = (N * CELL) / 2;
const ROUNDS = 6;

class Baldosa extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0; this.phase = 'wait'; this.phaseEnd = 3.4;
    this.loose = new Set();
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 2.5, z: Math.sin(a) * 2.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, score: 0, wetT: -9, botGoal: null, memory: rand(0.6, 0.92), botT: 0 };
    });
  }
  cellOf(x, z) {
    const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
    return i >= 0 && j >= 0 && i < N && j < N ? j * N + i : -1;
  }
  center(c) { return { x: -HALF + ((c % N) + 0.5) * CELL, z: -HALF + (Math.floor(c / N) + 0.5) * CELL }; }
  newRound() {
    this.round++;
    const count = Math.min(N * N - 4, 7 + this.round * 2);
    const cells = Array.from({ length: N * N }, (_, i) => i).sort(() => Math.random() - 0.5);
    this.loose = new Set(cells.slice(0, count));
    this.phase = 'show'; this.phaseEnd = this.t + 2.4;
    for (const e of this.ents) e.botGoal = null;
  }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.2;
    if (this.phase === 'hide' || this.phase === 'show') {
      if (!e.botGoal) {
        // Recuerda bien las flojas con cierta probabilidad; si no, elige una cualquiera
        const remember = Math.random() < e.memory;
        const opts = [];
        for (let c = 0; c < N * N; c++) if (!remember || !this.loose.has(c)) opts.push(c);
        opts.sort((a, b) => { const A = this.center(a), Bc = this.center(b); return Math.hypot(A.x - e.x, A.z - e.z) - Math.hypot(Bc.x - e.x, Bc.z - e.z); });
        e.botGoal = this.center(opts[Math.floor(Math.random() * Math.min(3, opts.length))]);
      }
      const dx = e.botGoal.x - e.x, dz = e.botGoal.z - e.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { e.ix = e.iz = 0; return; }
      e.ix = dx / d * Math.min(1, d); e.iz = dz / d * Math.min(1, d);
    } else { e.ix = e.iz = 0; }
  }
  step(dt) {
    this.t += dt;
    for (const e of this.ents) {
      moveEnt(e, dt, { slow: this.phase === 'splash' ? 0.2 : 0.8 });
      e.x = Math.max(-HALF + 0.3, Math.min(HALF - 0.3, e.x)); e.z = Math.max(-HALF + 0.3, Math.min(HALF - 0.3, e.z));
    }
    collide(this.ents, 0.55);
    if (!this.started || this.t < this.phaseEnd) return;
    if (this.phase === 'wait') {
      if (this.round >= ROUNDS) { this.done = true; return; }
      this.newRound();
    } else if (this.phase === 'show') { this.phase = 'hide'; this.phaseEnd = this.t + 3.2; }
    else if (this.phase === 'hide') {
      this.phase = 'splash'; this.phaseEnd = this.t + 1.8;
      for (const e of this.ents) {
        if (this.loose.has(this.cellOf(e.x, e.z))) {
          e.wetT = this.t;
          this.event(e.id, '¡Splash!', 'bad');
          this.cue(e.id, { text: '💦 ¡Baldosa floja!', buzz: 400 });
        } else {
          e.score++;
          this.event(e.id, '+1', 'good');
        }
      }
    } else if (this.phase === 'splash') { this.phase = 'wait'; this.phaseEnd = this.t + 0.6; }
  }
  snapshot() {
    return {
      ...this.base(), phase: this.phase, round: this.round, rounds: ROUNDS, n: N, cell: CELL,
      loose: this.phase === 'show' || this.phase === 'splash' ? [...this.loose] : [],
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), wet: this.t - e.wetT < 1.5, st: `🧱 ${e.score}/${this.round}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Baldosa };
