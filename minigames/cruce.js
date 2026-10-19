// Cruzá la 9 de Julio: cruzá la avenida esquivando bondis y taxis. Cada cruce suma.
const { Minigame, joyInput, clamp, rand, pick, r2 } = require('./common');

const meta = {
  title: 'Cruzá la 9 de Julio',
  instructions: 'Cruzá la avenida más ancha del mundo esquivando bondis y taxis. Cada vez que llegás al otro lado sumás un cruce. ¡Si te pisan, volvés al principio!',
  control: 'joystick',
};

const START_Z = 8.6, GOAL_Z = -8.6, HALF_W = 9, WRAP = 34;
// Carriles: z, sentido, velocidad. En el medio hay un cantero para descansar.
const LANES = [
  { z: 6.2, dir: 1 }, { z: 4.4, dir: 1 }, { z: 2.6, dir: 1 },
  { z: -2.6, dir: -1 }, { z: -4.4, dir: -1 }, { z: -6.2, dir: -1 },
];

class Cruce extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.vehicles = [];
    LANES.forEach((ln, li) => {
      ln.speed = rand(4.5, 8.5);
      let x = rand(0, 6);
      while (x < WRAP) {
        const k = Math.random() < 0.4 ? 'bondi' : 'taxi';
        const len = k === 'bondi' ? 4.2 : 2.2;
        this.vehicles.push({ lane: li, base: x, k, len, color: k === 'bondi' ? pick(['#d63a2f', '#2d6cdf', '#2e9e48', '#f2c230', '#ef8a17']) : '#1b1b1b' });
        x += len + rand(6, 11);
      }
    });
    const n = this.n;
    this.ents = players.map((p, i) => ({ id: p.id, x: n === 1 ? 0 : -6 + (12 * i) / (n - 1), z: START_Z, ix: 0, iz: 0, ang: Math.PI, score: 0, stun: 0, safe: 0, botT: 0 }));
  }
  vx(v, t) {
    const ln = LANES[v.lane];
    let x = (v.base + ln.dir * ln.speed * t) % WRAP;
    if (x < 0) x += WRAP;
    return x - WRAP / 2;
  }
  hits(x, z, t, pad = 0.45) {
    for (const v of this.vehicles) {
      const ln = LANES[v.lane];
      if (Math.abs(z - ln.z) > 0.75) continue;
      if (Math.abs(x - this.vx(v, t)) < v.len / 2 + pad) return true;
    }
    return false;
  }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || e.stun > 0) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.08;
    // Mira si el próximo paso hacia adelante es seguro dentro de medio segundo
    const t = this.tt, ahead = e.z - 1.2;
    const dangerAhead = this.hits(e.x, ahead, t + 0.25, 1.1) || this.hits(e.x, ahead, t + 0.5, 1.1);
    const dangerHere = this.hits(e.x, e.z, t + 0.3, 0.9);
    if (!dangerAhead) { e.ix = 0; e.iz = -1; }
    else if (dangerHere) { e.ix = 0; e.iz = 1; }
    else { e.ix = 0; e.iz = 0; }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    const t = this.tt;
    for (const e of this.ents) {
      e.safe = Math.max(0, e.safe - dt);
      if (e.stun > 0) {
        e.stun -= dt;
        if (e.stun <= 0) { e.z = START_Z; e.safe = 1; }
        continue;
      }
      const len = Math.hypot(e.ix, e.iz);
      if (len > 0.15) {
        const k = Math.min(1, len) / len;
        e.x = clamp(e.x + e.ix * k * 6 * dt, -HALF_W, HALF_W);
        e.z = clamp(e.z + e.iz * k * 6 * dt, GOAL_Z - 0.2, START_Z + 0.4);
        e.ang = Math.atan2(e.ix, e.iz);
      }
      if (!e.safe && this.hits(e.x, e.z, t)) {
        e.stun = 1.1;
        this.event(e.id, '¡PLAF!', 'bad');
        this.cue(e.id, { text: '🚌 ¡Te pisó el bondi!', buzz: 350 });
      } else if (e.z <= GOAL_Z) {
        e.score++;
        this.event(e.id, `¡Cruzó! ${e.score}`, 'gold');
        this.cue(e.id, { text: `✅ ¡Cruzaste! (${e.score})`, buzz: 80 });
        e.z = START_Z; e.safe = 0.6;
      }
    }
  }
  snapshot() {
    const t = this.tt;
    return {
      ...this.base(),
      vehicles: this.vehicles.map((v) => ({ x: r2(this.vx(v, t)), z: LANES[v.lane].z, k: v.k, dir: LANES[v.lane].dir, color: v.color })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), stun: e.stun > 0, st: `🚶 ${e.score} ${e.score === 1 ? 'cruce' : 'cruces'}` })),
    };
  }
  ranking() {
    // Desempate: el que está más cerca de terminar el cruce actual
    return this.ents.map((e) => ({ id: e.id, score: e.score * 100 + (START_Z - e.z) })).sort((a, b) => b.score - a.score)
      .map((r) => ({ id: r.id, score: Math.floor(r.score / 100) }));
  }
}

module.exports = { meta, Game: Cruce, LANES };
