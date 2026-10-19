// Duelo Criollo: a ver quién desenfunda primero. Si apretás antes de tiempo, perdés la mano.
const { Minigame, rand } = require('./common');

const meta = {
  title: 'Duelo Criollo',
  instructions: 'Esperá… esperá… ¡y cuando aparezca "¡YA!" apretá lo más rápido que puedas! Si apretás antes, perdés esa mano. Al mejor de 3.',
  control: 'buttons',
  buttons: [{ id: 'bang', label: '💥 ¡YA!' }],
  layout: 'single',
  modes: ['duel', 'ffa'],
};

class Desenfunde extends Minigame {
  constructor(players) {
    super(players);
    this.need = 2; this.handsPlayed = 0;
    this.ents = players.map((p) => ({ id: p.id, wins: 0, react: rand(0.24, 0.42) }));
  }
  newHand() {
    this.phase = 'wait';
    this.goAt = this.t + rand(1.8, 5);
    this.handWinner = null; this.fouls = new Set();
    this.cue('*', { text: '🤠 Esperá…' });
  }
  press(e) {
    if (this.phase === 'wait') {
      if (this.fouls.has(e.id)) return;
      this.fouls.add(e.id);
      this.event(e.id, '¡FALTA!', 'bad');
      this.cue(e.id, { text: '🙈 ¡Muy temprano! Perdés esta mano', buzz: 300 });
      // Si todos menos uno hicieron falta, gana el que quedó
      const clean = this.ents.filter((o) => !this.fouls.has(o.id));
      if (clean.length === 1) this.winHand(clean[0]);
      else if (!clean.length) { this.phase = 'result'; this.resultAt = this.t; }
    } else if (this.phase === 'go' && !this.fouls.has(e.id)) this.winHand(e);
  }
  winHand(e) {
    if (this.phase === 'result') return;
    e.wins++; this.handWinner = e.id; this.handsPlayed++;
    this.phase = 'result'; this.resultAt = this.t;
    this.event(e.id, '¡BANG!', 'gold');
    this.cue(e.id, { text: '🤠 ¡Ganaste la mano!', buzz: 120 });
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action' && m.b === 'bang') this.press(e); }
  bot(id) {
    const e = this.get(id);
    if (!e) return;
    if (this.phase === 'go' && this.t >= this.goAt + e.react) this.press(e);
    if (this.phase === 'wait' && Math.random() < 0.0006) this.press(e); // a veces se apura
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (!this.phase) this.newHand();
    if (this.phase === 'wait' && this.t >= this.goAt) {
      this.phase = 'go';
      this.cue('*', { text: '💥 ¡YA!', buzz: 200 });
      for (const e of this.ents) e.react = rand(0.24, 0.45);
    } else if (this.phase === 'go' && this.t - this.goAt > 3) { this.phase = 'result'; this.resultAt = this.t; }
    else if (this.phase === 'result' && this.t - this.resultAt > 2) {
      const best = Math.max(...this.ents.map((e) => e.wins));
      if (best >= this.need || this.handsPlayed >= 5) this.done = true; else this.newHand();
    }
  }
  snapshot() {
    return {
      ...this.base(), phase: this.phase || 'wait', handWinner: this.handWinner, go: this.phase === 'go',
      ents: this.ents.map((e) => ({ id: e.id, wins: e.wins, foul: this.fouls ? this.fouls.has(e.id) : false, st: `🤠 ${e.wins} ${e.wins === 1 ? 'mano' : 'manos'}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.wins })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Desenfunde };
