// La Ofrenda a la Pachamama: un juego de animarse. Cada ronda la Pachamama decide: si sale sol ☀️, la ofrenda
// de los que siguen crece; si sale tormenta ⛈️, los que siguen pierden todo. Antes de cada ronda elegís:
// SEGUIR o ME PLANTO (te guardás lo que tenés). Cada ronda la tormenta es más probable.
const { Minigame, rand } = require('./common');

const meta = {
  title: 'La Ofrenda a la Pachamama',
  instructions: 'Todos arrancan con una ofrenda chiquita. Antes de cada ronda elegí SEGUIR o ME PLANTO. Si seguís y la Pachamama manda sol ☀️, tu ofrenda crece; si manda tormenta ⛈️, la perdés toda. Si te plantás, te guardás lo que tenés y mirás desde afuera. Cada ronda la tormenta es más probable… ¿hasta dónde te animás?',
  control: 'buttons',
  buttons: [{ id: 'seguir', label: '🙏 SEGUIR', color: '#2e9e48' }, { id: 'plantar', label: '✋ ME PLANTO', color: '#e14b3c' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
  board: 'norte',
};

const STORM = [0.12, 0.22, 0.32, 0.42, 0.55, 0.68], DECIDE = 4.2, SHOW = 2.8;

class Ofrenda extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0; this.phase = 'decide'; this.phaseT = 3; this.result = null; this.history = [];
    this.ents = players.map((p) => ({ id: p.id, pot: 3, banked: 0, state: 'in', choice: null, greed: rand(6, 18), nerve: rand(0.25, 0.45) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || !this.started || this.phase !== 'decide' || e.state !== 'in') return;
    if (m.b === 'plantar') { e.choice = 'plantar'; this.cue(e.id, { text: `✋ Te plantás con ${e.pot}`, labels: ['', '✅ PLANTADO'] }); }
    else if (m.b === 'seguir') { e.choice = 'seguir'; this.cue(e.id, { text: '🙏 ¡Seguís!', buzz: 30 }); }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || this.phase !== 'decide' || e.state !== 'in' || e.choice) return;
    if (this.t - this.phaseT < rand(0.5, 3)) return;
    const risk = STORM[this.round] || 1;
    e.choice = e.pot >= e.greed || risk > e.nerve + Math.random() * 0.15 ? 'plantar' : 'seguir';
  }
  step(dt) {
    this.t += dt;
    if (!this.started || this.done) return;
    if (this.phase === 'end') { if (this.t >= this.doneAt) this.done = true; return; }
    if (this.phase === 'decide' && this.t - this.phaseT >= DECIDE) {
      // Los que se plantan guardan; los demás quedan para la tirada (si no eligieron, siguen)
      for (const e of this.ents) if (e.state === 'in' && e.choice === 'plantar') { e.state = 'banked'; e.banked = e.pot; this.event(e.id, `Guarda ${e.pot}`, 'gold'); }
      const inPlay = this.ents.filter((e) => e.state === 'in');
      if (!inPlay.length) { this.finish(); return; }
      const storm = Math.random() < (STORM[this.round] ?? 1);
      this.result = storm ? 'tormenta' : 'sol';
      this.history.push(this.result);
      for (const e of inPlay) {
        if (storm) { e.state = 'lost'; this.event(e.id, '¡Perdió todo!', 'bad'); this.cue(e.id, { text: '⛈️ ¡Tormenta! Perdiste la ofrenda', buzz: 500, labels: ['', ''] }); e.pot = 0; }
        else { const add = 3 + this.round * 2; e.pot += add; this.event(e.id, `+${add}`, 'good'); this.cue(e.id, { text: `☀️ ¡Sol! Ahora tenés ${e.pot}`, buzz: 60 }); }
      }
      this.phase = 'show'; this.phaseT = this.t;
    } else if (this.phase === 'show' && this.t - this.phaseT >= SHOW) {
      this.round++;
      const inPlay = this.ents.filter((e) => e.state === 'in');
      if (!inPlay.length || this.round >= STORM.length) { for (const e of inPlay) { e.state = 'banked'; e.banked = e.pot; } this.finish(); return; }
      for (const e of this.ents) e.choice = null;
      this.result = null; this.phase = 'decide'; this.phaseT = this.t;
      for (const e of inPlay) this.cue(e.id, { text: `¿Seguís o te plantás? Tenés ${e.pot}`, labels: ['🙏 SEGUIR', '✋ ME PLANTO'] });
    }
  }
  finish() { this.phase = 'end'; this.doneAt = this.t + 1.8; }
  snapshot() {
    return {
      ...this.base(), round: this.round, rounds: STORM.length, risk: STORM[this.round] ?? 1, phase: this.phase, result: this.result, history: this.history,
      left: this.phase === 'decide' ? Math.max(0, DECIDE - (this.t - this.phaseT)) : 0,
      timeLeft: null,
      ents: this.ents.map((e) => ({ id: e.id, pot: e.pot, banked: e.banked, state: e.state, chose: !!e.choice,
        st: e.state === 'banked' ? `✋ ${e.banked}` : e.state === 'lost' ? '⛈️ 0' : `🙏 ${e.pot}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.banked })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Ofrenda };
