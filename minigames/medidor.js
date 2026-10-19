// Base para los minijuegos de "apretá con la aguja en la zona justa" (Cebá el Mate, Tirá la Taba…).
// Cada jugador hace varios intentos; el celu muestra la aguja y manda dónde la vio al apretar.
const { Minigame, clamp, num, rand, r2 } = require('./common');

// Aguja: va de 0 a 1 y vuelve (onda triangular). Si rising, solo sube y al llegar a 1 se pasa.
const needle = (m, t) => {
  const x = ((t - m.start) * m.speed + m.phase) % 1;
  return x < 0.5 ? x * 2 : 2 - x * 2;
};

class MeterGame extends Minigame {
  // cfg: { tries, zone: [g0, g1, p0, p1], labels, rising, speed(i), grade(v) -> { pts, text, kind, q, cue } }
  constructor(players, cfg) {
    super(players);
    this.cfg = cfg;
    this.ents = players.map((p) => ({ id: p.id, i: 0, score: 0, m: null, wait: 3.6 + rand(0, 0.5), last: null, hist: [] }));
  }
  newTry(e) {
    const { cfg } = this;
    e.m = { start: this.t, speed: cfg.speed(e.i), phase: cfg.rising ? 0 : rand(0, 1) };
    const [g0, g1, p0, p1] = cfg.zone;
    e.botTarget = Math.random() < 0.35 ? rand(p0, p1) : Math.random() < 0.7 ? rand(g0, g1) : rand(0.2, 1);
    e.botMin = this.t + rand(0.3, 1.2);
    this.cue(e.id, { meter: { speed: e.m.speed, phase: e.m.phase, zone: cfg.zone, labels: cfg.labels }, text: `${cfg.icon} ${e.i + 1} de ${cfg.tries}` });
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || !e.m) return;
    // El celu manda lo que vio en su pantalla (así la demora de la red no te perjudica)
    const v = Number.isFinite(+m.v) ? clamp(num(m.v), 0, 1) : needle(e.m, this.t);
    this.press(e, v);
  }
  press(e, v) {
    const r = this.cfg.grade(v);
    e.score += r.pts;
    e.last = { q: r.q, v, at: this.t };
    e.hist.push(r.q);
    this.event(e.id, r.text, r.kind);
    this.cue(e.id, { meter: null, text: r.cue || r.text, buzz: r.pts ? 60 : 200 });
    e.m = null; e.i++; e.wait = this.t + 1.2;
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !e.m || this.t < e.botMin) return;
    const v = needle(e.m, this.t);
    if (Math.abs(v - e.botTarget) < 0.03) this.press(e, v);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    for (const e of this.ents) {
      if (!e.m && e.i < this.cfg.tries && this.t >= e.wait) this.newTry(e);
      if (!e.m) continue;
      // Si sube sola y llegó arriba, se pasó; si no, a los 6 s se cuenta como el peor tiro
      if (this.cfg.rising && this.t - e.m.start >= 0.5 / e.m.speed) this.press(e, 1);
      else if (this.t - e.m.start > 6) this.press(e, this.cfg.rising ? 1 : 0);
    }
    const lastAt = Math.max(0, ...this.ents.map((e) => (e.last ? e.last.at : 0)));
    if (this.ents.every((e) => e.i >= this.cfg.tries) && this.t - lastAt > 1.3) this.done = true;
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => ({ id: e.id, i: e.i, v: e.m ? r2(needle(e.m, this.t)) : null,
        last: e.last && this.t - e.last.at < 1.2 ? e.last.q : null, lastV: e.last ? r2(e.last.v) : null, hist: e.hist, st: `${this.cfg.icon} ${e.score} pts` })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { MeterGame, needle };
