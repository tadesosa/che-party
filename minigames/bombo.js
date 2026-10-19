// El Bombo Legüero: el bombista toca un ritmo; después cuenta "1, 2, 3" y cada uno tiene que repetirlo
// con el botón, al mismo tiempo. Cada golpe justo suma; los golpes de más restan. Cuatro ritmos, cada vez más difíciles.
const { Minigame, rand } = require('./common');

const meta = {
  title: 'El Bombo Legüero',
  instructions: 'Escuchá (y mirá) el ritmo que toca el bombista. Después cuenta "1, 2, 3" y tenés que repetirlo con el botón, al mismo ritmo. Golpe justo suma 3, cerca suma 1, y cada golpe de más resta 1. ¡Cuatro ritmos, cada uno más difícil!',
  control: 'buttons',
  buttons: [{ id: 'bum', label: '🥁 ¡BUM!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
  board: 'norte',
};

const SLOT = 0.3, SLOTS = 8, COUNT = 0.9, TAIL = 0.4;
const LISTEN = COUNT + SLOT * SLOTS + TAIL, PLAY = COUNT + SLOT * SLOTS + TAIL, SCORE = 1.8;
// Ritmos (en qué octavos golpea), de fácil a difícil
const PATTERNS = [[0, 2, 4, 6], [0, 2, 3, 4, 6], [0, 1, 3, 4, 6, 7], [0, 3, 4, 5, 7], [0, 1, 2, 4, 5, 7]];

class Bombo extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0; this.phase = 'listen'; this.ps = 3;
    this.patterns = [PATTERNS[0], PATTERNS[1], PATTERNS[2 + Math.floor(Math.random() * 2)], PATTERNS[4]];
    this.ents = players.map((p) => ({ id: p.id, pts: 0, taps: [], roundPts: 0, last: [], err: rand(0.05, 0.12), miss: rand(0.05, 0.15), plan: null }));
  }
  beats() { return this.patterns[Math.min(this.round, this.patterns.length - 1)].map((s) => s * SLOT); }
  get pt() { return this.t - this.ps; }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || !this.started || this.phase !== 'play') return;
    const x = this.pt - COUNT;
    if (x < -0.25 || x > SLOT * SLOTS + TAIL) return;
    e.taps.push(x);
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || this.phase !== 'play') return;
    if (!e.plan) e.plan = this.beats().filter(() => Math.random() > e.miss).map((b) => b + (Math.random() - 0.5) * 2 * e.err);
    while (e.plan.length && this.pt - COUNT >= e.plan[0]) { e.taps.push(e.plan.shift()); }
  }
  score(e) {
    const want = this.beats(), used = new Set();
    let pts = 0;
    for (const tap of e.taps) {
      let best = -1, bd = Infinity;
      want.forEach((b, i) => { if (!used.has(i) && Math.abs(b - tap) < bd) { bd = Math.abs(b - tap); best = i; } });
      if (best >= 0 && bd <= 0.12) { used.add(best); pts += 3; }
      else if (best >= 0 && bd <= 0.25) { used.add(best); pts += 1; }
      else pts -= 1;
    }
    return pts;
  }
  step(dt) {
    this.t += dt;
    if (!this.started || this.done) return;
    if (this.phase === 'listen' && this.pt >= LISTEN) { this.phase = 'play'; this.ps = this.t; for (const e of this.ents) { e.taps = []; e.plan = null; } this.cue('*', { text: '🥁 ¡Tu turno! 1, 2, 3…', buzz: 60 }); }
    else if (this.phase === 'play' && this.pt >= PLAY) {
      for (const e of this.ents) {
        e.roundPts = this.score(e); e.pts += e.roundPts; e.last = e.taps.slice();
        this.event(e.id, e.roundPts > 0 ? `+${e.roundPts}` : `${e.roundPts}`, e.roundPts >= this.beats().length * 3 - 1 ? 'gold' : e.roundPts > 0 ? 'good' : 'bad');
      }
      this.phase = 'score'; this.ps = this.t;
    } else if (this.phase === 'score' && this.pt >= SCORE) {
      this.round++;
      if (this.round >= this.patterns.length) { this.done = true; return; }
      this.phase = 'listen'; this.ps = this.t;
      this.cue('*', { text: '👂 Escuchá el ritmo…' });
    }
  }
  snapshot() {
    return {
      ...this.base(), round: this.round, rounds: this.patterns.length, phase: this.phase, pt: Math.round(this.pt * 1000) / 1000,
      slot: SLOT, slots: SLOTS, count: COUNT, beats: this.beats(),
      ents: this.ents.map((e) => ({ id: e.id, pts: e.pts, taps: this.phase === 'score' ? e.last.map((x) => Math.round(x * 100) / 100) : [], n: e.taps.length, rp: e.roundPts,
        st: `🥁 ${e.pts}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.pts })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Bombo };
