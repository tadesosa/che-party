// Las Barricas: en la bodega esconden un racimo dorado en una de cinco barricas y las mezclan rodando.
const { Minigame, rand } = require('./common');

const meta = {
  title: 'Las Barricas',
  instructions: 'En la bodega meten un racimo dorado en una barrica y las mezclan rodando. Seguila con la vista y después elegí la barrica en el celu (del 1 al 5, de izquierda a derecha). El primero que acierta suma 2, los demás que aciertan suman 1.',
  control: 'buttons',
  buttons: [{ id: '0', label: '1' }, { id: '1', label: '2' }, { id: '2', label: '3' }, { id: '3', label: '4' }, { id: '4', label: '5' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

const N = 5, ROUNDS = 4;

class Barricas extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0;
    this.slots = [0, 1, 2, 3, 4]; // slots[posición] = barrica
    this.ents = players.map((p) => ({ id: p.id, score: 0, pick: null, at: 0, skill: rand(0.55, 0.85) }));
  }
  newRound() {
    this.round++;
    this.gold = Math.floor(rand(0, N));
    this.phase = 'show'; this.phaseEnd = this.t + 1.8;
    this.swapDur = Math.max(0.28, 0.65 - this.round * 0.09);
    this.swaps = Array.from({ length: 3 + this.round * 2 }, () => { const a = Math.floor(rand(0, N)); let b = Math.floor(rand(0, N - 1)); if (b >= a) b++; return [a, b]; });
    this.first = null;
    for (const e of this.ents) { e.pick = null; e.botAt = 0; }
    this.cue('*', { text: `🍇 Ronda ${this.round}: mirá dónde va el racimo` });
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action' && /^[0-4]$/.test(m.b)) this.choose(e, +m.b);
  }
  choose(e, pos) {
    if (this.phase !== 'pick' || e.pick != null) return;
    e.pick = pos; e.at = this.t;
    this.cue(e.id, { text: `Elegiste la barrica ${pos + 1}` });
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'pick' || e.pick != null) return;
    if (!e.botAt) e.botAt = this.t + rand(0.8, 3);
    if (this.t < e.botAt) return;
    const right = this.slots.indexOf(this.gold);
    this.choose(e, Math.random() < e.skill - this.round * 0.06 ? right : Math.floor(rand(0, N)));
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (!this.phase) this.newRound();
    if (this.phase === 'show' && this.t >= this.phaseEnd) { this.phase = 'shuffle'; this.swapIdx = 0; this.swapStart = this.t; }
    else if (this.phase === 'shuffle') {
      while (this.swapIdx < this.swaps.length && this.t - this.swapStart >= this.swapDur) {
        const [a, b] = this.swaps[this.swapIdx];
        [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]];
        this.swapIdx++; this.swapStart += this.swapDur;
      }
      if (this.swapIdx >= this.swaps.length) { this.phase = 'pick'; this.phaseEnd = this.t + 6; this.cue('*', { text: '🤔 ¿En cuál está el racimo?', buzz: 60 }); }
    } else if (this.phase === 'pick' && (this.t >= this.phaseEnd || this.ents.every((e) => e.pick != null))) {
      const right = this.slots.indexOf(this.gold);
      const winners = this.ents.filter((e) => e.pick === right).sort((a, b) => a.at - b.at);
      winners.forEach((e, i) => { const pts = i === 0 ? 2 : 1; e.score += pts; this.event(e.id, i === 0 ? '¡Primero! +2' : '+1', i === 0 ? 'gold' : 'good'); });
      for (const e of this.ents) if (e.pick !== right) this.event(e.id, 'Nada…', 'bad');
      this.phase = 'reveal'; this.phaseEnd = this.t + 2.2;
    } else if (this.phase === 'reveal' && this.t >= this.phaseEnd) {
      if (this.round >= ROUNDS) this.done = true; else this.newRound();
    }
  }
  snapshot() {
    const sw = this.phase === 'shuffle' && this.swapIdx < this.swaps.length ? { pair: this.swaps[this.swapIdx], k: Math.min(1, (this.t - this.swapStart) / this.swapDur) } : null;
    return {
      ...this.base(), phase: this.phase || 'wait', round: this.round, slots: this.slots, gold: this.gold, swap: sw,
      ents: this.ents.map((e) => ({ id: e.id, pick: this.phase === 'reveal' ? e.pick : null, st: `🍇 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Barricas };
