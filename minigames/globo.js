// Inflá el Globo: apretá rápido. El primero que lo revienta gana.
const { Minigame } = require('./common');

const meta = {
  title: 'Inflá el Globo',
  instructions: '¡Apretá el botón lo más rápido que puedas! El primero que revienta su globo gana.',
  control: 'mash',
};

class Globo extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 20; this.target = 70; this.popped = [];
    this.ents = players.map((p) => ({ id: p.id, taps: 0, last: 0, rate: 5.5 + Math.random() * 2.5, acc: 0 }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'mash' || !this.started || this.done) return;
    if (this.t - e.last < 0.04) return; // más de 25 toques por segundo es trampa
    e.last = this.t;
    this.tap(e);
  }
  tap(e) {
    if (e.taps >= this.target) return;
    e.taps++;
    if (e.taps >= this.target) { this.popped.push(e.id); this.cue(e.id, { text: '🎈 ¡PUM!', buzz: 250 }); }
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !this.started) return;
    e.acc += dt * e.rate * (0.8 + Math.random() * 0.4);
    while (e.acc >= 1) { e.acc--; this.tap(e); }
  }
  step(dt) {
    this.t += dt;
    if (this.popped.length || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 0.6) this.done = true;
    }
  }
  snapshot() {
    return {
      ...this.base(), target: this.target, popped: this.popped,
      ents: this.ents.map((e) => ({ id: e.id, taps: e.taps,
        st: this.popped.includes(e.id) ? '🎈 ¡Reventó!' : `🎈 ${e.taps}/${this.target}` })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.taps + (this.popped.includes(e.id) ? 1000 - this.popped.indexOf(e.id) : 0) }))
      .sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Globo };
