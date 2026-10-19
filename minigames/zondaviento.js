// Aguantá el Zonda: arriba de un cerro pelado, el viento Zonda sopla en ráfagas. Hacé fuerza para el otro lado o te vuela.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Aguantá el Zonda',
  instructions: '¡Viene el Zonda! Antes de cada ráfaga se ve para dónde va a soplar (flechas y tierra volando). Empujá el joystick para el lado contrario y aguantá arriba del cerro. Si te vuela al vacío, quedás afuera. ¡Gana el último que queda!',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

const R = 7.5;

class ZondaViento extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 45;
    this.wind = { phase: 'calm', ang: 0, power: 0, until: 3 + 2.5 };
    this.out = [];
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 2.5, z: Math.sin(a) * 2.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, alive: true, y: 0, vy: 0, outT: 0, botT: 0, react: rand(0.2, 0.6) };
    });
  }
  input(id, m) { const e = this.get(id); if (e && e.alive) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e || !e.alive) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.12;
    const w = this.wind;
    // Vuelve al centro; si sopla (o está por soplar y ya reaccionó), empuja contra el viento
    let fx = -e.x * 0.25, fz = -e.z * 0.25;
    if (w.phase === 'blow' || (w.phase === 'warn' && this.t - w.at > e.react)) { fx -= Math.sin(w.ang) * 1.2; fz -= Math.cos(w.ang) * 1.2; }
    const l = Math.hypot(fx, fz);
    e.ix = l > 0.1 ? fx / Math.max(1, l) : 0; e.iz = l > 0.1 ? fz / Math.max(1, l) : 0;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    const w = this.wind;
    const level = 1 + this.tt / 20; // cada vez sopla más fuerte
    if (this.t >= w.until) {
      if (w.phase === 'calm') { w.phase = 'warn'; w.ang = rand(0, Math.PI * 2); w.at = this.t; w.until = this.t + 1.3; this.cue('*', { text: '🌪️ ¡Se viene el Zonda!', buzz: [80, 40, 80] }); }
      else if (w.phase === 'warn') { w.phase = 'blow'; w.power = rand(26, 34) * level; w.until = this.t + rand(1.6, 2.6); }
      else { w.phase = 'calm'; w.power = 0; w.until = this.t + rand(1.2, 2.4); }
    }
    for (const e of this.ents) {
      if (!e.alive) {
        e.vy -= 25 * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.z += e.vz * dt; e.vx *= 1.01;
        continue;
      }
      if (w.phase === 'blow') { e.vx += Math.sin(w.ang) * w.power * dt; e.vz += Math.cos(w.ang) * w.power * dt; }
      moveEnt(e, dt, { accel: 52 });
      if (Math.hypot(e.x, e.z) > R) {
        e.alive = false; e.vy = 4; this.out.push(e.id); e.outT = this.tt;
        e.vx += Math.sin(w.ang) * 6; e.vz += Math.cos(w.ang) * 6;
        this.event(e.id, '¡Voló!', 'bad');
        this.cue(e.id, { text: '🌪️ ¡Te llevó el Zonda!', buzz: 400 });
      }
    }
    collide(this.ents.filter((e) => e.alive), 0.65, 0.6);
    const alive = this.ents.filter((e) => e.alive);
    if (alive.length <= (this.n > 1 ? 1 : 0) || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1.2) this.done = true;
    }
  }
  snapshot() {
    const w = this.wind;
    return {
      ...this.base(), r: R, wind: { phase: w.phase, ang: r2(w.ang) },
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), y: r2(e.y), ang: r2(e.ang), alive: e.alive, st: e.alive ? '🧍 En pie' : '🌪️ Voló' })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.alive ? 1000 : this.out.indexOf(e.id) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: ZondaViento };
