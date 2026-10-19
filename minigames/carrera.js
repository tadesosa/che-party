// Alcanzá el Bondi: carrera apretando IZQ y DER alternados.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Alcanzá el Bondi',
  instructions: '¡Se te va el colectivo! Apretá IZQ y DER alternados para correr. Si apretás dos veces el mismo, no avanzás.',
  control: 'buttons',
  buttons: [{ id: 'L', label: '👟 IZQ' }, { id: 'R', label: 'DER 👟' }],
  layout: 'row',
};

const TARGET = 40;

class Carrera extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 25; this.order = [];
    this.ents = players.map((p) => ({ id: p.id, dist: 0, last: null, lastT: 0, rate: rand(6, 8.2), acc: 0 }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || (m.b !== 'L' && m.b !== 'R')) return;
    this.stepFoot(e, m.b);
  }
  stepFoot(e, b) {
    if (!this.started || e.fin || this.done) return;
    if (b === e.last) { e.trip = this.t; return; } // mismo pie: tropieza
    if (this.t - e.lastT < 0.03) return;
    e.last = b; e.lastT = this.t;
    e.dist = Math.min(TARGET, e.dist + 0.55);
    if (e.dist >= TARGET) {
      this.order.push(e.id); e.fin = this.order.length;
      this.event(e.id, e.fin === 1 ? '¡SUBIÓ PRIMERO!' : `¡Llegó ${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
      this.cue(e.id, { text: `🚌 ¡Llegaste ${e.fin}°!`, buzz: 200 });
    }
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !this.started) return;
    e.acc += dt * e.rate * rand(0.75, 1.2);
    while (e.acc >= 1) { e.acc--; this.stepFoot(e, e.last === 'L' ? 'R' : 'L'); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    const allIn = this.ents.every((e) => e.fin);
    if (allIn || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1) this.done = true;
    }
  }
  snapshot() {
    return {
      ...this.base(), target: TARGET,
      ents: this.ents.map((e) => ({ id: e.id, d: r2(e.dist), fin: e.fin || 0, trip: e.trip && this.t - e.trip < 0.3,
        st: e.fin ? `🚌 ${e.fin}°` : `🏃 ${Math.round((e.dist / TARGET) * 100)}%` })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.dist })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Carrera };
