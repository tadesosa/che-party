// Mate Caliente: la papa caliente con un mate. Si te explota (se te pasa el agua) en la mano, quedás afuera.
const { Minigame, rand, pick } = require('./common');

const meta = {
  title: 'Mate Caliente',
  instructions: 'El mate pasa de mano en mano. Cuando lo tengas, apretá PASALO para dárselo a otro. ¡Si se te hierve el agua en la mano, quedás afuera!',
  control: 'buttons',
  buttons: [{ id: 'pass', label: '🧉 ¡PASALO!' }],
  layout: 'single',
  modes: ['ffa'],
};

class MateCaliente extends Minigame {
  constructor(players) {
    super(players);
    this.out = [];
    this.round = 0;
    this.ents = players.map((p) => ({ id: p.id, alive: true, botAt: 0 }));
    this.holder = null; this.boom = 0; this.gotAt = 0;
  }
  get alive() { return this.ents.filter((e) => e.alive); }
  newRound() {
    this.round++;
    this.boom = this.t + rand(5, 11);
    this.give(pick(this.alive).id, true);
    this.phase = 'play';
  }
  give(id, first = false) {
    this.holder = id; this.gotAt = this.t;
    const e = this.get(id);
    e.botAt = this.t + rand(0.5, 2.2);
    this.cue(id, { text: '🔥 ¡Tenés el mate! ¡Pasalo!', buzz: [80, 40, 80] });
    if (!first) this.event(id, '¡Tomá!', 'good');
  }
  pass(e) {
    if (this.phase !== 'play' || this.holder !== e.id || this.t - this.gotAt < 0.45) return;
    const others = this.alive.filter((o) => o.id !== e.id);
    if (!others.length) return;
    this.lastFrom = e.id;
    this.cue(e.id, { text: '😅 Lo pasaste', buzz: 20 });
    this.give(pick(others).id);
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action' && m.b === 'pass') this.pass(e); }
  bot(id) { const e = this.get(id); if (e && this.holder === id && this.t >= e.botAt) this.pass(e); }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (!this.phase) this.newRound();
    if (this.phase === 'play' && this.t >= this.boom) {
      const e = this.get(this.holder);
      e.alive = false; this.out.push(e.id);
      this.event(e.id, '¡SE QUEMÓ!', 'bad');
      this.cue(e.id, { text: '🥵 ¡Se te hirvió el agua! Afuera', buzz: 500 });
      this.phase = 'boom'; this.boomAt = this.t; this.burned = e.id; this.holder = null;
    } else if (this.phase === 'boom' && this.t - this.boomAt > 2) {
      if (this.alive.length <= 1) this.done = true; else this.newRound();
    }
  }
  snapshot() {
    return {
      ...this.base(), phase: this.phase || 'wait', holder: this.holder, burned: this.phase === 'boom' ? this.burned : null,
      heat: this.phase === 'play' ? Math.min(1, (this.t - (this.boom - 11)) / 11) : 0, from: this.lastFrom || null,
      ents: this.ents.map((e) => ({ id: e.id, alive: e.alive, st: !e.alive ? '🥵 Afuera' : this.holder === e.id ? '🔥 ¡Lo tiene!' : '😬 En juego' })),
    };
  }
  ranking() {
    const res = this.alive.map((e) => ({ id: e.id, score: this.n }));
    [...this.out].reverse().forEach((id, i) => res.push({ id, score: this.n - this.alive.length - i }));
    return res.sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: MateCaliente };
