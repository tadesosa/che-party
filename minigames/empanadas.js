// Contá las Empanadas: pasan empanadas (y alguna medialuna para confundir). ¿Cuántas empanadas pasaron?
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Contá las Empanadas',
  instructions: 'Van a pasar empanadas volando (y alguna medialuna para confundirte). Contá SOLO las empanadas y marcá el número en el celu. ¡Gana el que más se acerca!',
  control: 'counter',
  modes: ['ffa', 'duel'],
};

const SHOW = 9; // segundos de desfile
const ANSWER = 9;

class Empanadas extends Minigame {
  constructor(players) {
    super(players);
    this.items = [];
    const total = Math.floor(rand(10, 19));
    let t = 0.4;
    for (let i = 0; i < total + Math.floor(rand(4, 8)); i++) {
      t += rand(0.12, 0.55);
      this.items.push({ id: i, t, y: rand(0.8, 4.6), speed: rand(7, 12), dir: Math.random() < 0.5 ? 1 : -1, k: i < total ? 'empanada' : 'medialuna' });
    }
    // Mezclar el orden de aparición
    const times = this.items.map((it) => it.t).sort(() => Math.random() - 0.5);
    this.items.forEach((it, i) => { it.t = Math.min(SHOW - 1.6, times[i]); });
    this.total = total;
    this.phase = 'show';
    this.ents = players.map((p) => ({ id: p.id, answer: null, at: 0, guess: Math.round(total + rand(-2.6, 2.6)) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || m.b !== 'set' || this.phase !== 'answer' || e.answer != null) return;
    e.answer = clamp(Math.round(num(m.v)), 0, 99); e.at = this.t;
    this.cue(id, { text: `✅ Marcaste ${e.answer}` });
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'answer' || e.answer != null || this.t < this.answerStart + rand(1.5, 5)) return;
    e.answer = Math.max(0, e.guess); e.at = this.t;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    const tt = this.tt;
    if (this.phase === 'show' && tt >= SHOW) {
      this.phase = 'answer'; this.answerStart = this.t;
      this.cue('*', { text: '🤔 ¿Cuántas empanadas pasaron?', buzz: 120, counter: true });
    } else if (this.phase === 'answer' && (tt >= SHOW + ANSWER || this.ents.every((e) => e.answer != null))) {
      for (const e of this.ents) if (e.answer == null) { e.answer = 0; e.at = this.t; }
      this.phase = 'reveal'; this.revealAt = this.t;
      for (const e of this.ents) {
        const d = Math.abs(e.answer - this.total);
        this.event(e.id, d === 0 ? '¡EXACTO!' : `${e.answer} (${d > 0 ? '±' + d : ''})`, d === 0 ? 'gold' : d <= 2 ? 'good' : 'bad');
      }
      this.cue('*', { text: `Eran ${this.total} empanadas`, counter: false });
    } else if (this.phase === 'reveal' && this.t - this.revealAt > 3) this.done = true;
  }
  snapshot() {
    const tt = this.tt;
    const items = this.phase === 'show' ? this.items.filter((it) => tt >= it.t && tt - it.t < 26 / it.speed).map((it) => ({
      id: it.id, k: it.k, y: it.y, x: r2(-it.dir * 13 + it.dir * (tt - it.t) * it.speed),
    })) : [];
    return {
      ...this.base(), phase: this.phase, items, total: this.phase === 'reveal' ? this.total : null,
      timeLeft: this.phase === 'answer' ? Math.max(0, SHOW + ANSWER - tt) : null,
      ents: this.ents.map((e) => ({ id: e.id, answered: e.answer != null, answer: this.phase === 'reveal' ? e.answer : null,
        st: this.phase === 'reveal' ? `🥟 ${e.answer}` : e.answer != null ? '✅ Listo' : this.phase === 'answer' ? '🤔 Pensando' : '👀 Contando' })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: -Math.abs(e.answer - this.total) * 100 - e.at * 0.01 }))
      .sort((a, b) => b.score - a.score)
      .map((r) => ({ id: r.id, score: Math.round(r.score / 100) }));
  }
}

module.exports = { meta, Game: Empanadas };
