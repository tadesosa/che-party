// Subite a la Aerosilla: las sillitas pasan por el andén. Apretá SALTAR justo cuando la silla está en la zona
// marcada para subirte y avanzar un tramo. Si saltás a destiempo, te caés y perdés un ratito.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Subite a la Aerosilla',
  instructions: 'Las sillas de la aerosilla pasan por tu andén. Apretá SALTAR justo cuando la silla está arriba de la zona verde para subirte: así subís un tramo del cerro. Si saltás antes o después, te caés en la nieve. Cada tramo las sillas van más rápido. ¡El primero en llegar a la cumbre (8 tramos) gana!',
  control: 'buttons',
  buttons: [{ id: 'jump', label: '🚡 ¡SALTAR!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
  board: 'bariloche',
};

const STAGES = 8, SPACING = 4.2, WINDOW = 0.55;

class Aerosilla extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 45; this.order = [];
    // Separación entre sillas de cada tramo: igual para todos (algunas sillas faltan, para que no sea un ritmo fijo)
    this.gaps = Array.from({ length: STAGES }, () => Array.from({ length: 40 }, () => (Math.random() < 0.25 ? 2 : 1)));
    this.ents = players.map((p) => ({ id: p.id, stage: 0, t0: 3, fallT: -9, rideT: -9, fin: 0, botAt: null }));
  }
  speed(e) { return 3.2 + e.stage * 0.55; }
  // Posición de las sillas de este tramo: van de izquierda (-) a derecha (+); el andén está en 0
  chairs(e) {
    const s = (this.t - e.t0) * this.speed(e);
    // La primera silla arranca en -8 y las demás vienen atrás, separadas según el tramo
    let lead = -8 + s;
    const all = [];
    for (const g of this.gaps[e.stage]) { if (lead < 10 && lead > -16) all.push(lead); lead -= g * SPACING; if (lead < -16) break; }
    return all;
  }
  riding(e) { return this.t - e.rideT < 1.2; }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action') this.jump(e); }
  jump(e) {
    if (!this.started || this.done || e.fin || this.riding(e) || this.t - e.fallT < 1.1) return;
    const near = this.chairs(e).find((x) => Math.abs(x) < WINDOW);
    if (near != null) {
      e.stage++; e.rideT = this.t; e.t0 = this.t + 1.2; e.botAt = null;
      if (e.stage >= STAGES) {
        e.fin = this.order.push(e.id);
        this.event(e.id, e.fin === 1 ? '¡CUMBRE!' : `¡${e.fin}°!`, 'gold');
        this.cue(e.id, { text: `🏔️ ¡Llegaste a la cumbre ${e.fin}°!`, buzz: 200 });
      } else { this.event(e.id, `Tramo ${e.stage}`, 'good'); this.cue(e.id, { buzz: 50 }); }
    } else {
      e.fallT = this.t;
      this.event(e.id, '¡Al piso!', 'bad');
      this.cue(e.id, { text: '😵 ¡Saltaste a destiempo!', buzz: 300 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || e.fin || this.riding(e) || this.t - e.fallT < 1.1) return;
    // Elige cuándo saltar mirando la silla que viene, con un error de tiempo
    if (e.botAt == null) {
      const next = this.chairs(e).filter((x) => x < -WINDOW * 0.5).sort((a, b) => b - a)[0];
      if (next == null) return;
      e.botAt = this.t + (-next) / this.speed(e) + rand(-0.2, 0.2);
    }
    if (this.t >= e.botAt) { e.botAt = null; this.jump(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.ents.every((e) => e.fin) || this.tt >= this.duration) { this.endT = this.endT ?? this.t; if (this.t - this.endT > 1) this.done = true; }
  }
  snapshot() {
    return {
      ...this.base(), stages: STAGES, win: WINDOW,
      ents: this.ents.map((e) => ({ id: e.id, stage: e.stage, fin: e.fin, ride: this.riding(e), fall: this.t - e.fallT < 1.1,
        chairs: e.fin ? [] : this.chairs(e).map(r2), st: e.fin ? `🏔️ ${e.fin}°` : `🚡 ${e.stage}/${STAGES}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.stage })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Aerosilla };
