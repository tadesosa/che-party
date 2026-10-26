// Revolvé el Dulce de Leche: girás el dedo en círculos sobre el celu, como la cuchara en la olla.
// Hay que mantener la velocidad que pide la abuela (ni muy lento, que se pega; ni muy rápido, que salpica)
// y cambiar el sentido cuando grita "¡al revés!".
const { Minigame, clamp, num, rand, pick, r2 } = require('./common');

const meta = {
  title: 'Revolvé el Dulce de Leche',
  instructions: 'Girá el dedo en círculos sobre el celu para revolver tu olla. Al lado de cada olla hay un medidor: mantené la aguja en la franja verde. Si revolvés muy lento, se pega; si vas muy rápido, salpica. Cuando la abuela grita "¡AL REVÉS!", cambiá el sentido. ¡El que hace más dulce gana!',
  control: 'crank',
  modes: ['ffa', 'duel'],
};

const DURATION = 38;
const TOP = 3.4;      // vueltas por segundo que entran en el medidor
const BAND = 0.42;    // medio ancho de la franja buena

class Dulce extends Minigame {
  constructor(players) {
    super(players);
    this.duration = DURATION;
    this.ents = players.map((p) => ({ id: p.id, v: 0, raw: 0, dulce: 0, burn: 0, splashT: -9, stickT: -9, state: 'ok', skill: rand(0.6, 0.9), botV: 0, lagT: 0 }));
    this.target = 1.2; this.dir = 1;
    this.nextChange = 3 + 4;
    this.changes = 0;
    this.lastPad = 0;
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'input') e.raw = clamp(num(m.x), -6, 6);
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e) return;
    // Tarda un poquito en darse cuenta de los cambios, y la mano tiembla
    if (this.t < e.lagT) { e.raw = e.botV; return; }
    const want = this.target * this.dir + Math.sin(this.t * (1.3 + e.skill) + e.skill * 9) * (1 - e.skill) * 0.9;
    e.botV += (want - e.botV) * Math.min(1, dt * 3);
    e.raw = e.botV;
  }
  change() {
    this.changes++;
    const flip = this.changes % 3 === 0 || (this.changes > 1 && Math.random() < 0.3);
    const old = this.target;
    const opts = [0.9, 1.4, 1.9, 2.5].filter((v) => Math.abs(v - old) > 0.3);
    this.target = pick(opts);
    let text = this.target > old ? '⏫ ¡Más rápido, que se pega!' : '⏬ ¡Más despacio, que salpica!';
    if (flip) { this.dir = -this.dir; text = this.dir > 0 ? '↻ ¡AL REVÉS! Como el reloj' : '↺ ¡AL REVÉS! Contra el reloj'; }
    this.said = { t: this.t, text: flip ? '¡AL REVÉS!' : this.target > old ? '¡MÁS RÁPIDO!' : '¡MÁS DESPACIO!' };
    this.cue('*', { text, buzz: flip ? [80, 50, 80] : 60, pad: { dir: this.dir } });
    for (const e of this.ents) e.lagT = this.t + rand(0.35, 0.9) * (flip ? 1.5 : 1);
    this.nextChange = this.t + rand(4, 6);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= DURATION) { this.done = true; return; }
    if (!this.begun) { this.begun = true; this.cue('*', { text: '↻ ¡A revolver! Como el reloj', buzz: 60, pad: { dir: 1 } }); }
    if (this.t >= this.nextChange) this.change();
    if (this.t - this.lastPad > 2) { this.lastPad = this.t; this.cue('*', { pad: { dir: this.dir } }); }
    for (const e of this.ents) {
      e.v += (e.raw - e.v) * Math.min(1, dt * 6);
      const eff = e.v * this.dir; // al revés cuenta como quieto
      const d = eff - this.target;
      if (Math.abs(d) <= BAND) {
        e.dulce += dt * (1 - (Math.abs(d) / BAND) * 0.4);
        e.state = 'ok';
      } else if (d < 0) {
        e.state = eff < -0.3 ? 'reves' : 'pega';
        e.burn = Math.min(1, e.burn + dt * 0.12);
        if (this.t - e.stickT > 3.5) { e.stickT = this.t; this.event(e.id, eff < -0.3 ? '¡Al revés!' : '¡Se pega!', 'bad'); }
      } else {
        e.state = 'salpica';
        e.dulce = Math.max(0, e.dulce - dt * 0.35);
        if (this.t - e.splashT > 2.5) { e.splashT = this.t; this.event(e.id, '¡Salpica!', 'bad'); }
      }
      if (e.state === 'ok') e.burn = Math.max(0, e.burn - dt * 0.05);
    }
  }
  snapshot() {
    return {
      ...this.base(),
      target: r2(this.target / TOP), band: r2(BAND / TOP), dir: this.dir,
      said: this.said && this.t - this.said.t < 1.8 ? this.said.text : null,
      ents: this.ents.map((e) => ({ id: e.id, v: r2(clamp(e.v * this.dir / TOP, -0.15, 1.1)), spin: r2(e.v), state: e.state, burn: r2(e.burn), lvl: r2(Math.min(1, e.dulce / 26)), st: `🍯 ${Math.floor(e.dulce * 10)}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: Math.floor(e.dulce * 10) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Dulce };
