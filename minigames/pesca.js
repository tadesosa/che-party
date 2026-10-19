// Pesca en la Escollera: cada uno con su caña. Cuando el corcho se hunde, ¡recogé! Si apretás antes, espantás al pez.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Pesca en la Escollera',
  instructions: 'Mirá tu corcho en la tele. Cuando se hunde (¡PICA!), apretá RECOGER rápido. Si apretás antes de que pique, espantás al pez y tenés que esperar otro. Los peces grandes valen más pero se escapan más rápido. ¡El que saca más gana!',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🎣 ¡RECOGER!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

const FISH = [
  { k: 'mojarrita', pts: 1, win: 1.0, w: 0.5 },
  { k: 'pejerrey', pts: 2, win: 0.75, w: 0.35 },
  { k: 'corvina', pts: 4, win: 0.5, w: 0.15 },
];
const pickFish = () => { let r = Math.random(); for (const f of FISH) { if ((r -= f.w) <= 0) return f; } return FISH[0]; };

class Pesca extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35;
    this.ents = players.map((p) => ({ id: p.id, score: 0, state: 'wait', at: 3 + rand(1.5, 4), fish: null, caught: [], scareT: -9, gotT: -9, react: rand(0.28, 0.55), jumpy: rand(0.03, 0.08) }));
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action') this.reel(e); }
  reel(e) {
    if (!this.started || this.done) return;
    if (e.state === 'bite') {
      e.score += e.fish.pts; e.caught.push(e.fish.k); e.gotT = this.t; e.state = 'wait'; e.at = this.t + rand(1.5, 4);
      this.event(e.id, `¡${e.fish.k}! +${e.fish.pts}`, e.fish.pts >= 4 ? 'gold' : 'good');
      this.cue(e.id, { text: `🐟 ¡Sacaste un${e.fish.k === 'corvina' ? 'a' : ''} ${e.fish.k}!`, buzz: 120 });
    } else if (e.state === 'wait' && this.t - e.scareT > 0.6) {
      e.scareT = this.t; e.at = this.t + rand(2, 3.5);
      this.event(e.id, '¡Lo espantaste!', 'bad');
      this.cue(e.id, { text: '😬 ¡Muy temprano! Lo espantaste', buzz: 250 });
    }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || !this.started) return;
    if (e.state === 'bite' && this.t - e.biteAt > e.react) this.reel(e);
    else if (e.state === 'wait' && Math.random() < e.jumpy * dt) this.reel(e); // a veces se apura
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      if (e.state === 'wait' && this.t >= e.at) {
        e.state = 'bite'; e.fish = pickFish(); e.biteAt = this.t;
        this.cue(e.id, { text: '❗ ¡PICA!', buzz: [60, 30, 60] });
      } else if (e.state === 'bite' && this.t - e.biteAt > e.fish.win) {
        e.state = 'wait'; e.at = this.t + rand(1.5, 3.5);
        this.event(e.id, 'Se escapó…', 'bad');
      }
    }
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => ({ id: e.id, state: e.state, fish: e.state === 'bite' ? e.fish.k : null, got: this.t - e.gotT < 1 ? e.caught[e.caught.length - 1] : null, scare: this.t - e.scareT < 0.6, n: e.caught.length, st: `🐟 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Pesca };
