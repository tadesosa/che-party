// ¿Peso o Dólar?: en la tele aparece un billete. Si es un dólar verdadero, ¡apretá rápido! Si es un peso o un dólar trucho, no toques.
const { Minigame, rand, pick } = require('./common');

const meta = {
  title: '¿Peso o Dólar?',
  instructions: 'Mirá la tele: cuando aparece un DÓLAR verde, ¡apretá AGARRAR lo más rápido que puedas! El primero suma 2, los demás que lleguen suman 1. Si es un peso o un dólar trucho (tiene cara de payaso), no toques: te resta 1.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '💵 ¡AGARRAR!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
};

const ROUNDS = 10;
const OPEN = 1.4; // segundos que el billete queda en pantalla

class Billete extends Minigame {
  constructor(players) {
    super(players);
    this.round = 0;
    this.bill = null; // { kind: 'dolar' | 'peso' | 'trucho', at, first }
    this.next = 4.2;
    this.ents = players.map((p) => ({ id: p.id, score: 0, done: -1, react: 0, fool: rand(0.08, 0.2), last: null }));
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action') this.press(e);
  }
  press(e) {
    const b = this.bill;
    if (!b || e.done === this.round) return;
    e.done = this.round;
    if (b.kind === 'dolar') {
      const pts = b.first ? 1 : 2;
      if (!b.first) b.first = e.id;
      e.score += pts; e.last = { ok: true, at: this.t };
      this.event(e.id, pts === 2 ? '¡PRIMERO! +2' : '+1', pts === 2 ? 'gold' : 'good');
      this.cue(e.id, { text: pts === 2 ? '💵 ¡Primero!' : '💵 +1', buzz: 60 });
    } else {
      e.score = Math.max(0, e.score - 1); e.last = { ok: false, at: this.t };
      this.event(e.id, b.kind === 'trucho' ? '¡Era trucho! −1' : '¡Era un peso! −1', 'bad');
      this.cue(e.id, { text: '🤡 ¡Te lo vendieron!', buzz: 300 });
    }
  }
  bot(id) {
    const e = this.get(id);
    const b = this.bill;
    if (!e || !b || e.done === this.round) return;
    if (e.react === 0) e.react = b.kind === 'dolar' ? rand(0.32, 0.85) : (Math.random() < e.fool ? rand(0.3, 0.6) : 99);
    if (this.t - b.at > e.react) { e.react = 0; this.press(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.bill && this.t - this.bill.at > OPEN) {
      this.bill = null;
      for (const e of this.ents) e.react = 0;
      this.next = this.t + rand(0.9, 2.2);
      if (this.round >= ROUNDS) this.endAt = this.t;
    }
    if (this.endAt != null) { if (this.t - this.endAt > 1) this.done = true; return; }
    if (!this.bill && this.t >= this.next) {
      this.round++;
      // Los primeros son más fáciles; después aparecen más trampas
      const kind = Math.random() < (this.round < 3 ? 0.75 : 0.5) ? 'dolar' : pick(['peso', 'trucho']);
      this.bill = { kind, at: this.t, first: null };
    }
  }
  snapshot() {
    const b = this.bill;
    return {
      ...this.base(), round: this.round, rounds: ROUNDS, bill: b ? { kind: b.kind, n: this.round, first: b.first } : null,
      ents: this.ents.map((e) => ({ id: e.id, ok: e.last && this.t - e.last.at < 0.8 ? e.last.ok : null, st: `💵 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Billete };
