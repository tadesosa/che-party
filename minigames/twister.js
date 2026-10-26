// Twister de Dedos: en el celu aparecen círculos de colores y hay que mantener un dedo apoyado en cada uno.
// Cada tanto aparece otro (y a veces uno se va y aparece en otro lado). Si levantás un dedo de un círculo, te resbalás.
const { Minigame, rand, pick, r2 } = require('./common');

const meta = {
  title: 'Twister de Dedos',
  instructions: 'Apoyá el celu en la mesa. Van a aparecer círculos de colores: poné un dedo en cada uno y NO los levantes. Cada pocos segundos aparece otro (y a veces uno se va y sale en otro lado: ese sí lo podés soltar). Si soltás un círculo, te resbalás: a la segunda, quedás afuera. ¡Gana el último que aguanta!',
  control: 'fingers',
  modes: ['ffa', 'duel'],
};

const COLORS = ['#e5243b', '#3d8bff', '#f2c230', '#2e9e48'];
const NAMES = { '#e5243b': 'ROJO', '#3d8bff': 'AZUL', '#f2c230': 'AMARILLO', '#2e9e48': 'VERDE' };
const GRACE = 2.4;    // segundos para poner el dedo en un círculo nuevo
const SLIP = 0.45;    // cuánto aguanta un círculo suelto antes de resbalarte
const LIVES = 2;
const DURATION = 75;

class Twister extends Minigame {
  constructor(players) {
    super(players);
    this.ents = players.map((p) => ({ id: p.id, held: new Set(), lives: LIVES, outAt: 0, loose: 0, safeUntil: 0, slipT: -9, botDelay: rand(0.5, 1.1), botFailK: rand(0.6, 1.3), botMiss: new Set() }));
    this.dots = [];
    this.kn = 0;
    this.nextAt = 3 + 0.3;
    this.step_ = 0;
    this.lastPad = 0;
    this.over = false;
  }
  alive() { return this.ents.filter((e) => e.lives > 0); }
  // Lugar libre para un círculo nuevo (lejos de los otros y de los bordes)
  spot() {
    for (let tries = 0; tries < 60; tries++) {
      const x = rand(0.14, 0.86), y = rand(0.12, 0.88);
      if (this.dots.every((d) => Math.hypot(d.x - x, (d.y - y) * 1.6) > 0.27)) return { x, y };
    }
    return { x: rand(0.14, 0.86), y: rand(0.12, 0.88) };
  }
  addDot() {
    const { x, y } = this.spot();
    const c = COLORS[this.kn % COLORS.length];
    const d = { k: 'd' + (++this.kn), x, y, c, born: this.t };
    this.dots.push(d);
    return d;
  }
  advance() {
    this.step_++;
    let text;
    // Con 4 o más, a veces se va uno y aparece otro (hay que mover un dedo)
    if (this.dots.length >= 4 && (this.step_ % 2 === 0 || this.dots.length >= 6)) {
      const gone = pick(this.dots);
      this.dots = this.dots.filter((d) => d !== gone);
      const d = this.addDot();
      text = `🔄 Soltá el ${NAMES[gone.c]}… ¡y poné un dedo en el ${NAMES[d.c]} nuevo!`;
      this.moved = { t: this.t, from: gone.k, to: d.k };
    } else {
      const d = this.addDot();
      text = `☝️ ¡Otro dedo en el ${NAMES[d.c]}!`;
    }
    this.cue('*', { text, buzz: 70 });
    this.sendPads();
    const gap = Math.max(2.6, 4.2 - this.step_ * 0.12);
    this.nextAt = this.t + gap;
  }
  sendPads() {
    this.lastPad = this.t;
    const dots = this.dots.map((d) => ({ k: d.k, x: r2(d.x), y: r2(d.y), c: d.c, isNew: this.t - d.born < GRACE }));
    for (const e of this.ents) this.cue(e.id, { pad: { dots, on: e.lives > 0, hint: e.lives > 0 ? undefined : '😵 Te caíste: mirá la tele' } });
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'input' && Array.isArray(m.held)) e.held = new Set(m.held.slice(0, 12).map(String));
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || e.lives <= 0) return;
    // Pone el dedo un ratito después de que aparece; con muchos círculos a veces no llega
    for (const d of this.dots) {
      if (e.held.has(d.k) || e.botMiss.has(d.k)) continue;
      if (this.t - d.born < e.botDelay) continue;
      const hard = Math.max(0, this.dots.length - 2) * 0.09 * e.botFailK;
      if (!d.botTry) d.botTry = {};
      if (d.botTry[id] == null) d.botTry[id] = Math.random() < hard;
      if (d.botTry[id]) { e.botMiss.add(d.k); continue; }
      e.held.add(d.k);
    }
    for (const k of [...e.held]) if (!this.dots.some((d) => d.k === k)) e.held.delete(k);
  }
  slip(e) {
    e.lives--; e.slipT = this.t; e.loose = 0;
    e.safeUntil = this.t + 1.6;
    e.botMiss.clear();
    if (e.lives <= 0) {
      e.outAt = this.t;
      this.event(e.id, '¡Se cayó!', 'bad');
      this.cue(e.id, { text: '😵 ¡Te caíste! Quedaste afuera', buzz: 500 });
    } else {
      this.event(e.id, '¡Se resbaló!', 'bad');
      this.cue(e.id, { text: '😬 ¡Te resbalaste! Una más y quedás afuera', buzz: 300 });
    }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.8) this.done = true; return; }
    if (this.t >= this.nextAt) this.advance();
    else if (this.t - this.lastPad > 2) this.sendPads();
    for (const e of this.ents) {
      if (e.lives <= 0) continue;
      // Los círculos que ya tendrían que estar apretados
      const need = this.dots.filter((d) => this.t - d.born >= GRACE);
      const missing = need.some((d) => !e.held.has(d.k));
      if (missing && this.t > e.safeUntil) { e.loose += dt; if (e.loose > SLIP) this.slip(e); }
      else e.loose = 0;
    }
    const n = this.ents.length;
    if ((n > 1 && this.alive().length <= 1) || (n === 1 && !this.alive().length) || this.tt >= DURATION) { this.over = true; this.endAt = this.t; }
  }
  snapshot() {
    return {
      ...this.base(),
      timeLeft: Math.max(0, DURATION - this.tt),
      dots: this.dots.map((d) => ({ k: d.k, x: r2(d.x), y: r2(d.y), c: d.c, fresh: this.t - d.born < GRACE })),
      ents: this.ents.map((e) => ({
        id: e.id, held: this.dots.filter((d) => e.held.has(d.k)).map((d) => d.k), lives: e.lives, slip: this.t - e.slipT < 0.9,
        loose: e.loose > 0.05,
        st: e.lives > 0 ? `${'❤️'.repeat(e.lives)} ☝️${this.dots.filter((d) => e.held.has(d.k)).length}` : '😵 Afuera',
      })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.lives > 0 ? 10000 + e.lives * 100 : e.outAt })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Twister };
