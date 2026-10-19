// Pasos de Tango: mirá la secuencia de pasos en la tele y repetila en el celu. Cada ronda es más larga.
const { Minigame, rand, pick } = require('./common');

const DIRS = ['up', 'down', 'left', 'right'];
const meta = {
  title: 'Pasos de Tango',
  instructions: 'En la tele bailan una secuencia de pasos. Cuando te toca, repetila con las flechas del celu. Si le errás, quedás afuera. ¡Cada ronda tiene un paso más!',
  control: 'buttons',
  buttons: [{ id: 'up', label: '⬆️' }, { id: 'left', label: '⬅️' }, { id: 'right', label: '➡️' }, { id: 'down', label: '⬇️' }],
  layout: 'cross',
};

const STEP_T = 0.75;
const MAX_ROUNDS = 7;

class Tango extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0; this.out = [];
    this.ents = players.map((p) => ({ id: p.id, alive: true, prog: 0, ok: false, okAt: 0, total: 0, botNext: 0 }));
  }
  get alive() { return this.ents.filter((e) => e.alive); }
  eliminate(e) { e.alive = false; e.outScore = this.round * 100 + e.prog; this.out.push(e.id); }
  newRound() {
    this.round++;
    const len = 2 + this.round;
    this.seq = Array.from({ length: len }, () => pick(DIRS));
    this.phase = 'show';
    this.phaseStart = this.t;
    this.phaseEnd = this.t + len * STEP_T + 0.5;
    for (const e of this.alive) { e.prog = 0; e.ok = false; }
    this.cue('*', { text: `👀 Ronda ${this.round}: mirá los ${len} pasos` });
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || !DIRS.includes(m.b)) return;
    this.press(e, m.b);
  }
  press(e, b) {
    if (this.phase !== 'input' || !e.alive || e.ok) return;
    if (b === this.seq[e.prog]) {
      e.prog++;
      if (e.prog >= this.seq.length) {
        e.ok = true; e.okAt = this.t; e.total += this.t - this.phaseStart;
        this.event(e.id, '¡Olé!', 'gold');
        this.cue(e.id, { text: '✅ ¡Bien bailado!', buzz: 80 });
      } else this.cue(e.id, { text: `💃 ${e.prog} de ${this.seq.length}`, buzz: 15 });
    } else {
      this.eliminate(e);
      this.event(e.id, '¡Pisotón!', 'bad');
      this.cue(e.id, { text: '❌ Le pifiaste al paso', buzz: 400 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'input' || !e.alive || e.ok || this.t < e.botNext) return;
    e.botNext = this.t + rand(0.3, 0.6);
    const len = this.seq.length;
    const right = Math.random() < 0.985 - 0.028 * len;
    this.press(e, right ? this.seq[e.prog] : pick(DIRS.filter((d) => d !== this.seq[e.prog])));
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (!this.phase) this.newRound();
    if (this.phase === 'show' && this.t >= this.phaseEnd) {
      this.phase = 'input';
      this.phaseStart = this.t;
      this.phaseEnd = this.t + this.seq.length * 0.9 + 3;
      for (const e of this.alive) e.botNext = this.t + rand(0.4, 0.9);
      this.cue('*', { text: '💃 ¡Tu turno! Repetí los pasos', buzz: 120 });
    } else if (this.phase === 'input') {
      const pending = this.alive.filter((e) => !e.ok);
      if (!pending.length || this.t >= this.phaseEnd) {
        for (const e of pending) {
          this.eliminate(e);
          this.event(e.id, '¡Se quedó!', 'bad');
          this.cue(e.id, { text: '⌛ Se te acabó el tiempo', buzz: 400 });
        }
        this.phase = 'judge'; this.phaseEnd = this.t + 1.5;
      }
    } else if (this.phase === 'judge' && this.t >= this.phaseEnd) {
      const a = this.alive.length;
      if (a === 0 || (this.n > 1 && a === 1) || this.round >= MAX_ROUNDS) this.done = true;
      else this.newRound();
    }
  }
  snapshot() {
    let showIdx = -1;
    if (this.phase === 'show') showIdx = Math.floor((this.t - this.phaseStart) / STEP_T);
    const showing = this.phase === 'show' && showIdx < (this.seq || []).length;
    return {
      ...this.base(), phase: this.phase || 'wait', round: this.round, len: this.seq ? this.seq.length : 0,
      step: showing ? this.seq[showIdx] : null, showIdx, stepP: showing ? ((this.t - this.phaseStart) / STEP_T) % 1 : 0,
      inputLeft: this.phase === 'input' ? Math.max(0, this.phaseEnd - this.t) : null,
      ents: this.ents.map((e) => ({ id: e.id, alive: e.alive, prog: e.prog, ok: e.ok,
        st: !e.alive ? '❌ Afuera' : e.ok ? '✅ ¡Bien!' : this.phase === 'input' ? `💃 ${e.prog}/${this.seq.length}` : '👀 Mirando' })),
    };
  }
  ranking() {
    // Los que siguen en pie ganan (más rápidos primero); después, los que aguantaron más rondas
    const alive = this.alive.sort((a, b) => a.total - b.total).map((e, i) => ({ id: e.id, score: 1000 - i }));
    const out = this.ents.filter((e) => !e.alive).map((e) => ({ id: e.id, score: e.outScore })).sort((a, b) => b.score - a.score);
    return [...alive, ...out];
  }
}

module.exports = { meta, Game: Tango };
