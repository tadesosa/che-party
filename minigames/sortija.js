// La Sortija de la Calesita: la calesita gira y la sortija cuelga adelante. Apretá justo cuando pasás por abajo.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'La Sortija de la Calesita',
  instructions: 'Cada uno va en su caballito. Cuando tu caballito pasa por abajo de la sortija, ¡apretá AGARRAR! Si le errás, perdés esa vuelta. La calesita va cada vez más rápido.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '💍 ¡AGARRAR!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
};

const WINDOW = 0.2; // radianes a cada lado de la sortija
const TAU = Math.PI * 2;

class Sortija extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 30;
    this.rot = 0;
    this.ents = players.map((p, i) => ({ id: p.id, off: (i / this.n) * TAU, score: 0, lap: -1, tried: -1, grabT: -9, missT: -9, botLap: -1, botSkill: rand(0.55, 0.8) }));
  }
  get speed() { return 0.9 + (this.tt / this.duration) * 1.1; }
  // Ángulo del caballito respecto de la sortija (0 = justo abajo) y número de vuelta
  rel(e) {
    const a = this.rot + e.off;
    const lap = Math.floor((a + Math.PI) / TAU);
    const d = a - lap * TAU;
    return { d, lap };
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action') this.grab(e);
  }
  grab(e) {
    if (!this.started || this.done) return;
    const { d, lap } = this.rel(e);
    if (e.tried === lap) return; // un intento por vuelta
    e.tried = lap;
    if (Math.abs(d) < WINDOW) {
      e.score++; e.grabT = this.t;
      this.event(e.id, '¡SORTIJA!', 'gold');
      this.cue(e.id, { text: '💍 ¡La sacaste!', buzz: 120 });
    } else {
      e.missT = this.t;
      this.event(e.id, '¡Uy!', 'bad');
      this.cue(e.id, { text: d < 0 ? '😅 ¡Muy temprano!' : '😅 ¡Muy tarde!', buzz: 200 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started) return;
    const { d, lap } = this.rel(e);
    if (e.botLap !== lap) { e.botLap = lap; e.botAim = Math.random() < e.botSkill ? rand(-0.12, 0.12) : rand(0.25, 0.5) * (Math.random() < 0.5 ? -1 : 1); }
    if (e.tried !== lap && d > e.botAim) this.grab(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    this.rot += this.speed * dt;
  }
  snapshot() {
    return {
      ...this.base(), rot: r2(this.rot),
      ents: this.ents.map((e) => ({ id: e.id, off: r2(e.off), got: this.t - e.grabT < 0.8, miss: this.t - e.missT < 0.6, st: `💍 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Sortija };
