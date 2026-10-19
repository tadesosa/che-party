// Repulgue en Equipo: cada equipo arma empanadas salteñas. Cada toque es un pliegue del repulgue, pero
// solo cuenta si lo hace un compañero distinto del último: ¡hay que turnarse! Gana el equipo con más empanadas.
const { Minigame, rand } = require('./common');

const meta = {
  title: 'Repulgue en Equipo',
  instructions: 'Celestes contra rojos, arman empanadas salteñas. Cada vez que apretás hacés un pliegue del repulgue, pero SOLO CUENTA si el último pliegue lo hizo un compañero: ¡túrnense! (si apretás dos veces seguidas, no vale). Ocho pliegues, una empanada. Si estás solo contra tres, todos tus pliegues valen y cada uno cuenta más.',
  control: 'mash',
  modes: ['2v2', '1v3'],
  board: 'norte',
};

const FOLDS = 8;

class Repulgue extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 25;
    this.teams = teams;
    this.solo = teams[0].length === 1 ? 0 : teams[1].length === 1 ? 1 : -1;
    this.folds = [0, 0]; this.lastBy = [null, null]; this.wasted = [0, 0];
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      return { id: p.id, team, taps: 0, good: 0, last: 0, acc: 0, rate: rand(5.5, 7.5), patience: rand(0.55, 0.85) };
    });
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'mash' || !this.started || this.done) return;
    if (this.t - e.last < 0.045) return;
    e.last = this.t;
    this.tap(e);
  }
  tap(e) {
    e.taps++;
    const t = e.team;
    if (t === this.solo) { this.folds[t] += 2.5; e.good++; return; }
    if (this.lastBy[t] === e.id) { this.wasted[t]++; if (this.wasted[t] % 6 === 1) this.cue(e.id, { text: '✋ ¡Turnate con tu compañero!', buzz: 80 }); return; }
    this.lastBy[t] = e.id; this.folds[t]++; e.good++;
    if (Math.floor(this.folds[t]) % FOLDS === 0) this.event(e.id, '¡Empanada!', 'good');
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !this.started) return;
    // Los bots se turnan bastante bien: si el último pliegue fue suyo, casi siempre espera
    const mine = this.lastBy[e.team] === e.id && e.team !== this.solo;
    e.acc += dt * e.rate * (mine ? 1 - e.patience : 1);
    while (e.acc >= 1) { e.acc--; this.tap(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) this.done = true;
  }
  empanadas(t) { return Math.floor(this.folds[t] / FOLDS); }
  snapshot() {
    return {
      ...this.base(), folds: FOLDS, made: [this.empanadas(0), this.empanadas(1)], part: this.folds.map((f) => (f % FOLDS) / FOLDS), lastBy: this.lastBy,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, taps: e.taps, mine: this.lastBy[e.team] === e.id, st: `🥟 ${this.empanadas(e.team)} · ${e.good} pliegues` })),
    };
  }
  winnerTeam() { const a = this.folds[0], b = this.folds[1]; return Math.abs(a - b) < 1 ? null : a > b ? 0 : 1; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.good })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Repulgue };
