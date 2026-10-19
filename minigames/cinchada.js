// La Cinchada: tirar de la soga apretando rápido. Equipo contra equipo (2 vs 2 o 1 vs 3).
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'La Cinchada',
  instructions: '¡Tiren de la soga! Apretá el botón lo más rápido que puedas con tu equipo. Si estás solo contra tres, cada toque tuyo vale el triple.',
  control: 'mash',
  modes: ['2v2', '1v3'],
};

const LIMIT = 4;

class Cinchada extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 20;
    this.teams = teams;
    this.rope = 0; // negativo: gana el equipo 0, positivo: el equipo 1
    this.weight = teams.map((t, i) => (teams[0].length === 1 && i === 0 ? 2.85 : 1));
    this.ents = players.map((p) => ({ id: p.id, team: teams.findIndex((t) => t.includes(p.id)), taps: 0, last: 0, acc: 0, rate: rand(5.5, 8) }));
    this.win = undefined;
  }
  tap(e) {
    if (!this.started || this.done || this.win !== undefined) return;
    e.taps++;
    this.rope += (e.team === 0 ? -1 : 1) * 0.035 * this.weight[e.team];
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
    if (!this.started || this.win !== undefined) { if (this.win !== undefined && this.t - this.endAt > 1.5) this.done = true; return; }
    if (Math.abs(this.rope) >= LIMIT || this.tt >= this.duration) {
      this.win = Math.abs(this.rope) < 0.2 ? null : this.rope < 0 ? 0 : 1;
      this.endAt = this.t;
      for (const e of this.ents) {
        if (this.win == null) this.cue(e.id, { text: '🤝 ¡Empate!' });
        else if (e.team === this.win) { this.cue(e.id, { text: '💪 ¡Ganaron!', buzz: 200 }); this.event(e.id, '¡GANÓ!', 'gold'); }
        else { this.cue(e.id, { text: '😵 Perdieron', buzz: 400 }); this.event(e.id, '¡Al barro!', 'bad'); }
      }
    }
  }
  snapshot() {
    return {
      ...this.base(), rope: r2(this.rope), limit: LIMIT, teams: this.teams, win: this.win ?? null, over: this.win !== undefined,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, taps: e.taps, st: `💪 ${e.taps}` })),
    };
  }
  winnerTeam() { return this.win ?? null; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.team === this.win ? 1 : 0 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Cinchada };
