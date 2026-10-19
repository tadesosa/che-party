// Asado a Punto: la aguja va y viene. Apretá cuando está en el centro (punto justo).
const { Minigame, clamp, num, rand, r2 } = require('./common');

const STEAKS = 5;
const meta = {
  title: 'Asado a Punto',
  instructions: 'Vas a hacer 5 cortes. Mirá la aguja en tu celu y apretá DAR VUELTA cuando esté en el centro verde. ¡Perfecto suma 3, bien suma 1!',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🔥 ¡DAR VUELTA!' }],
  layout: 'single',
  meter: true,
};

// Aguja: va de 0 a 1 y vuelve (onda triangular)
const needle = (m, t) => {
  const x = ((t - m.start) * m.speed + m.phase) % 1;
  return x < 0.5 ? x * 2 : 2 - x * 2;
};

class Asado extends Minigame {
  constructor(players) {
    super(players);
    this.ents = players.map((p) => ({ id: p.id, i: 0, score: 0, m: null, wait: 3.6 + rand(0, 0.5), last: null, botTarget: 0.5 }));
  }
  newSteak(e) {
    e.m = { start: this.t, speed: 0.55 + e.i * 0.16 + rand(0, 0.08), phase: rand(0, 1) };
    e.botTarget = 0.5 + rand(-0.13, 0.13);
    e.botMin = this.t + rand(0.5, 1.4);
    this.cue(e.id, { meter: { speed: e.m.speed, phase: e.m.phase }, text: `🥩 Corte ${e.i + 1} de ${STEAKS}` });
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || m.b !== 'go' || !e.m) return;
    // El celu manda lo que vio en su pantalla (así la demora de la red no te perjudica)
    const v = Number.isFinite(+m.v) ? clamp(num(m.v), 0, 1) : needle(e.m, this.t);
    this.flip(e, v);
  }
  flip(e, v) {
    const d = Math.abs(v - 0.5);
    let q, pts, text, kind;
    if (d < 0.06) { q = 'perfecto'; pts = 3; text = '¡PERFECTO! +3'; kind = 'gold'; }
    else if (d < 0.17) { q = 'bien'; pts = 1; text = 'Bien +1'; kind = 'good'; }
    else { q = v < 0.5 ? 'crudo' : 'quemado'; pts = 0; text = v < 0.5 ? 'Crudo…' : '¡Quemado!'; kind = 'bad'; }
    e.score += pts;
    e.last = { q, v, at: this.t };
    this.event(e.id, text, kind);
    this.cue(e.id, { meter: null, text: q === 'perfecto' ? '🤩 ¡Perfecto!' : q === 'bien' ? '👍 Bien' : q === 'crudo' ? '🥩 Crudo' : '🔥 Quemado', buzz: pts ? 60 : 200 });
    e.m = null; e.i++; e.wait = this.t + 1.1;
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !e.m || this.t < e.botMin) return;
    const v = needle(e.m, this.t);
    if (Math.abs(v - e.botTarget) < 0.03) this.flip(e, v);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    for (const e of this.ents) {
      if (!e.m && e.i < STEAKS && this.t >= e.wait) this.newSteak(e);
      if (e.m && this.t - e.m.start > 6) this.flip(e, 1); // se pasó el tiempo: quemado
    }
    const lastAt = Math.max(0, ...this.ents.map((e) => (e.last ? e.last.at : 0)));
    if (this.ents.every((e) => e.i >= STEAKS) && this.t - lastAt > 1.2) this.done = true;
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => ({ id: e.id, i: e.i, v: e.m ? r2(needle(e.m, this.t)) : null,
        last: e.last && this.t - e.last.at < 1 ? e.last.q : null, st: `🥩 ${e.score} pts` })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Asado, needle };
