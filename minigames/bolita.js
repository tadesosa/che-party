// ¿Dónde está la bolita? Tres vasos, una bolita, y el trilero los mezcla cada vez más rápido.
const { Minigame, rand } = require('./common');

const meta = {
  title: '¿Dónde está la bolita?',
  instructions: 'Mirá bajo qué vaso queda la bolita mientras los mezclan. Después elegí el vaso en el celu (1, 2 o 3). ¡Son 4 rondas y cada vez mezclan más rápido!',
  control: 'buttons',
  buttons: [{ id: '0', label: '1️⃣' }, { id: '1', label: '2️⃣' }, { id: '2', label: '3️⃣' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
};

const ROUNDS = 4;

class Bolita extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0;
    this.slots = [0, 1, 2]; // slots[vaso] = posición (0, 1, 2)
    this.ball = 0;          // vaso que tiene la bolita
    this.ents = players.map((p) => ({ id: p.id, score: 0, pick: null, skill: rand(0.55, 0.85) }));
  }
  newRound() {
    this.round++;
    this.ball = Math.floor(rand(0, 3));
    this.phase = 'show'; this.phaseEnd = this.t + 1.6;
    const swaps = 3 + this.round * 2;
    this.swapDur = Math.max(0.22, 0.6 - this.round * 0.1);
    this.swaps = [];
    for (let i = 0; i < swaps; i++) {
      const a = Math.floor(rand(0, 3)); let b = Math.floor(rand(0, 2)); if (b >= a) b++;
      this.swaps.push([a, b]);
    }
    for (const e of this.ents) e.pick = null;
    this.cue('*', { text: `👀 Ronda ${this.round}: mirá la bolita` });
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || this.phase !== 'pick' || e.pick != null || !['0', '1', '2'].includes(m.b)) return;
    e.pick = +m.b; // posición elegida
    this.cue(id, { text: `Elegiste el vaso ${e.pick + 1}` });
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'pick' || e.pick != null || this.t < this.phaseStart + rand(0.8, 3)) return;
    const right = this.slots[this.ball];
    e.pick = Math.random() < e.skill - this.round * 0.05 ? right : Math.floor(rand(0, 3));
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (!this.phase) this.newRound();
    if (this.phase === 'show' && this.t >= this.phaseEnd) {
      this.phase = 'shuffle'; this.swapIdx = 0; this.swapStart = this.t;
    } else if (this.phase === 'shuffle') {
      while (this.swapIdx < this.swaps.length && this.t - this.swapStart >= this.swapDur) {
        const [a, b] = this.swaps[this.swapIdx];
        const ca = this.slots.indexOf(a), cb = this.slots.indexOf(b);
        this.slots[ca] = b; this.slots[cb] = a;
        this.swapIdx++; this.swapStart += this.swapDur;
      }
      if (this.swapIdx >= this.swaps.length) {
        this.phase = 'pick'; this.phaseStart = this.t; this.phaseEnd = this.t + 6;
        this.cue('*', { text: '🤔 ¿Dónde está la bolita?', buzz: 100 });
      }
    } else if (this.phase === 'pick' && (this.t >= this.phaseEnd || this.ents.every((e) => e.pick != null))) {
      const right = this.slots[this.ball];
      for (const e of this.ents) {
        if (e.pick === right) { e.score++; this.event(e.id, '¡Bien!', 'gold'); this.cue(e.id, { text: '✅ ¡La encontraste!', buzz: 80 }); }
        else { this.event(e.id, 'Nop', 'bad'); this.cue(e.id, { text: '❌ No estaba ahí', buzz: 200 }); }
      }
      this.phase = 'reveal'; this.phaseEnd = this.t + 2.2;
    } else if (this.phase === 'reveal' && this.t >= this.phaseEnd) {
      if (this.round >= ROUNDS) this.done = true; else this.newRound();
    }
  }
  snapshot() {
    // Posición de cada vaso (con el movimiento del intercambio en curso)
    let swap = null;
    if (this.phase === 'shuffle' && this.swapIdx < this.swaps.length) {
      const [a, b] = this.swaps[this.swapIdx];
      swap = { a, b, p: Math.min(1, (this.t - this.swapStart) / this.swapDur) };
    }
    return {
      ...this.base(), phase: this.phase || 'wait', round: this.round, slots: [...this.slots], swap,
      ball: this.phase === 'show' || this.phase === 'reveal' ? this.ball : null,
      timeLeft: this.phase === 'pick' ? Math.max(0, this.phaseEnd - this.t) : null,
      ents: this.ents.map((e) => ({ id: e.id, pick: this.phase === 'reveal' ? e.pick : null, picked: e.pick != null, st: `🔴 ${e.score}/${this.round}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Bolita };
