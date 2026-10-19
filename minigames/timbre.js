// Tocá el Timbre del Bondi: el colectivo va por la avenida. Tocá el timbre justo antes de tu parada:
// muy temprano te deja en la anterior, muy tarde te pasás.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Tocá el Timbre del Bondi',
  instructions: 'Vas en el colectivo por la avenida. En la tele se marca tu parada. Tocá el TIMBRE cuando el bondi esté llegando (en la franja amarilla antes del cartel). Muy temprano o muy tarde, no vale. Cinco paradas: justo suma 3, cerca suma 1.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🔔 ¡TIMBRE!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
  board: 'baires',
};

const ROUNDS = 5;
const STOPS = ['Corrientes', 'Callao', 'Córdoba', 'Santa Fe', 'Pueyrredón', 'Rivadavia', 'Belgrano', 'Independencia', 'San Juan'];
const ZONE = [2.6, 0.6]; // la franja buena: entre 2,6 y 0,6 metros antes del cartel
const PERFECT = [1.9, 1.1];

class Timbre extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0; this.phase = 'wait'; this.phaseEnd = 3.4;
    this.names = [...STOPS].sort(() => Math.random() - 0.5);
    this.ents = players.map((p) => ({ id: p.id, score: 0, rang: null, res: null, botAt: 0 }));
  }
  newRound() {
    this.round++;
    this.speed = 5 + this.round * 1.1 + rand(0, 1);
    this.dist = rand(26, 34); // metros hasta la parada
    this.stop = this.names[this.round - 1];
    this.phase = 'ride';
    for (const e of this.ents) {
      e.rang = null; e.res = null;
      // Los bots apuntan a la franja con error
      e.botAt = rand(PERFECT[1] - 0.6, PERFECT[0] + 1.2) + (Math.random() < 0.2 ? rand(-2, 3) : 0);
      this.cue(e.id, { text: `🚌 Bajate en ${this.stop}` });
    }
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action') this.ring(e); }
  ring(e) {
    if (this.phase !== 'ride' || e.rang != null) return;
    const d = this.dist;
    e.rang = d;
    let pts, text, kind;
    if (d <= PERFECT[0] && d >= PERFECT[1]) { pts = 3; text = '¡Justo! +3'; kind = 'gold'; }
    else if (d <= ZONE[0] && d >= ZONE[1]) { pts = 1; text = 'Bien +1'; kind = 'good'; }
    else { pts = 0; text = d > ZONE[0] ? '¡Muy temprano!' : '¡Muy tarde!'; kind = 'bad'; }
    e.score += pts; e.res = pts;
    this.event(e.id, text, kind);
    this.cue(e.id, { text: pts === 3 ? '🔔 ¡Justo en la parada!' : pts ? '🔔 Bien' : d > ZONE[0] ? '😅 Te bajaste antes' : '😅 Te pasaste', buzz: pts ? 60 : 250 });
  }
  bot(id) {
    const e = this.get(id);
    if (e && this.phase === 'ride' && e.rang == null && this.dist <= e.botAt) this.ring(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'ride') {
      this.dist -= this.speed * dt;
      if (this.dist <= -3) {
        for (const e of this.ents) if (e.rang == null) { e.rang = -3; e.res = 0; this.event(e.id, '¡Se pasó!', 'bad'); }
        this.phase = 'stop'; this.phaseEnd = this.t + 1.6;
      }
    } else if (this.t >= this.phaseEnd) {
      if (this.phase === 'stop') { this.phase = 'wait'; this.phaseEnd = this.t + 0.8; }
      else if (this.phase === 'wait') { if (this.round >= ROUNDS) { this.done = true; return; } this.newRound(); }
    }
  }
  snapshot() {
    return {
      ...this.base(), phase: this.phase, round: this.round, rounds: ROUNDS, stop: this.stop, dist: r2(this.dist ?? 30), zone: ZONE, perfect: PERFECT,
      ents: this.ents.map((e) => ({ id: e.id, rang: e.rang == null ? null : r2(e.rang), res: e.res, st: `🔔 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Timbre };
