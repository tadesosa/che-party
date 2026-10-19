// La Caldera del Tren: cada uno maneja la locomotora del Tren del Fin del Mundo. Apretá para echarle carbón:
// la presión tiene que quedar en la zona verde para que el tren avance rápido. Si se pasa, salta la válvula y frenás.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'La Caldera del Tren',
  instructions: 'Manejás el Tren del Fin del Mundo. Cada vez que apretás, le echás carbón y sube la presión (mirá el reloj arriba de tu tren en la tele). Con la aguja en la zona VERDE el tren va rápido; si baja, va lento. ¡Pero si llega a la zona roja salta la válvula y te quedás parado! En las subidas la presión baja más rápido. Gana el que llega más lejos.',
  control: 'mash',
  modes: ['ffa', 'duel'],
  board: 'sur',
};

const LOW = 0.55, HIGH = 0.82, BOOM = 0.97;

class Tren extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 30;
    // Tramos en subida (iguales para todos): ahí la presión baja más rápido
    this.hills = []; let x = 20;
    while (x < 500) { const len = rand(14, 26); this.hills.push([x, x + len]); x += len + rand(18, 32); }
    this.ents = players.map((p) => ({ id: p.id, p: 0.3, x: 0, boomT: -9, booms: 0, last: 0, acc: 0, rate: rand(4.5, 6), aim: rand(0.64, 0.74) }));
  }
  uphill(x) { return this.hills.some(([a, b]) => x >= a && x <= b); }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'mash' || !this.started || this.done) return;
    if (this.t - e.last < 0.045) return;
    e.last = this.t;
    this.coal(e);
  }
  coal(e) {
    if (this.t - e.boomT < 2) return;
    e.p = Math.min(1, e.p + 0.045);
    if (e.p >= BOOM) {
      e.boomT = this.t; e.booms++; e.p = 0.25;
      this.event(e.id, '¡PSSSHH!', 'bad');
      this.cue(e.id, { text: '💨 ¡Saltó la válvula! Esperá…', buzz: 500 });
    }
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !this.started) return;
    // Echa carbón cuando la presión está por debajo de lo que busca (con algo de torpeza)
    const want = e.p < e.aim + rand(-0.06, 0.06);
    e.acc += dt * e.rate * (want ? 1 : 0.08);
    while (e.acc >= 1) { e.acc--; this.coal(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      const up = this.uphill(e.x);
      e.p = Math.max(0, e.p - dt * (up ? 0.2 : 0.11));
      const stalled = this.t - e.boomT < 2;
      const sp = stalled ? 0 : e.p >= LOW && e.p <= HIGH ? 9 : e.p > HIGH ? 6 : 2.5 + e.p * 4;
      e.x += sp * (up ? 0.8 : 1) * dt;
      // Aviso al celu cuando la presión cambia de zona
      const zone = e.p < LOW ? 'low' : e.p > HIGH ? 'high' : 'ok';
      if (!stalled && zone !== e.zone) { e.zone = zone; this.cue(e.id, { text: zone === 'low' ? '🔥 ¡Más carbón!' : zone === 'high' ? '⚠️ ¡Mucha presión!' : '✅ ¡Así va bien!' }); }
    }
  }
  snapshot() {
    return {
      ...this.base(), low: LOW, high: HIGH, boom: BOOM, hills: this.hills,
      ents: this.ents.map((e) => ({ id: e.id, p: r2(e.p), x: r2(e.x), stall: this.t - e.boomT < 2, up: this.uphill(e.x), st: `🚂 ${Math.round(e.x)} m` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: Math.round(e.x * 10) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Tren };
