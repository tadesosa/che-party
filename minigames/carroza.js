// La Carroza de la Vendimia: dos carrozas compiten por la calle. Cada equipo tira de la suya apretando rápido.
// Si los del equipo aprietan parejo, la carroza agarra más envión.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'La Carroza de la Vendimia',
  instructions: '¡Desfile de la Vendimia! Cada equipo tira de su carroza apretando el botón lo más rápido que pueda. Si apretan todos parejo, la carroza agarra envión. Si estás solo contra tres, tu carroza es más liviana. ¡La primera que llega al palco gana!',
  control: 'mash',
  modes: ['2v2', '1v3'],
  board: 'mendoza',
};

const GOAL = 40;

class Carroza extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 25;
    this.teams = teams;
    this.pos = [0, 0]; this.vel = [0, 0];
    // El que está solo tiene una carroza más liviana
    this.power = teams.map((t) => (t.length === 1 ? 3.3 : 1));
    this.ents = players.map((p) => ({ id: p.id, team: teams.findIndex((t) => t.includes(p.id)), taps: 0, recent: 0, last: 0, acc: 0, rate: rand(5.5, 8) }));
  }
  tap(e) {
    if (!this.started || this.over) return;
    e.taps++; e.recent += 1;
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'mash' || this.t - e.last < 0.04) return;
    e.last = this.t; this.tap(e);
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || !this.started) return;
    e.acc += dt * e.rate * rand(0.8, 1.2);
    while (e.acc >= 1) { e.acc--; this.tap(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    for (let t = 0; t < 2; t++) {
      const members = this.ents.filter((e) => e.team === t);
      // Ritmo de cada uno (toques por segundo, suavizado) para ver si van parejos
      for (const e of members) e.ema = (e.ema || 0) + (e.recent / dt - (e.ema || 0)) * Math.min(1, dt * 1.5);
      const rates = members.map((e) => e.ema);
      const sum = members.reduce((a, e) => a + e.recent, 0);
      // Parejo: cuanto más se parecen los ritmos, más envión (de x1 a x1,3)
      const even = members.length > 1 && sum > 0 ? 1 + 0.3 * (Math.min(...rates) / Math.max(...rates)) : 1.15;
      this.vel[t] += sum * 0.25 * this.power[t] * even;
      this.vel[t] *= Math.exp(-2.2 * dt);
      this.pos[t] += this.vel[t] * dt;
      for (const e of members) e.recent = 0;
    }
    const w = this.pos.findIndex((p) => p >= GOAL);
    if (w >= 0 || this.tt >= this.duration) {
      this.over = true; this.endAt = this.t;
      this.win = w >= 0 ? w : Math.abs(this.pos[0] - this.pos[1]) < 0.5 ? null : this.pos[0] > this.pos[1] ? 0 : 1;
      for (const e of this.ents) this.cue(e.id, { text: this.win == null ? '🤝 Empate' : e.team === this.win ? '🍇 ¡Ganaron el desfile!' : '😩 Perdieron', buzz: 200 });
    }
  }
  snapshot() {
    return {
      ...this.base(), pos: this.pos.map(r2), goal: GOAL, teams: this.teams,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, taps: e.taps, st: `💪 ${e.taps}` })),
    };
  }
  winnerTeam() { return this.win ?? null; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: (e.team === this.win ? 1000 : 0) + e.taps })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Carroza };
