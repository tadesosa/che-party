// Batalla de Bombuchas: carnaval en la vereda. Tirá bombuchas para mojar a los demás.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Batalla de Bombuchas',
  instructions: '¡Carnaval! Movete con el joystick y apretá TIRAR para largar una bombucha hacia donde mirás. Cada vez que mojás a alguien sumás un punto. El mojado queda un ratito chorreando.',
  control: 'joystick',
  action: '💦 ¡TIRAR!',
  modes: ['ffa', 'duel'],
};

const FIELD = 8;
const SPEED = 11, RANGE = 8, HIT = 1.15;

class Bombuchas extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.balls = []; this.splashes = []; this.ballId = 0;
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 5.5, z: Math.sin(a) * 5.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: a + Math.PI, cd: 0, wet: 0, score: 0, botT: 0 };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.throw(e);
  }
  throw(e) {
    if (!this.started || e.cd > 0 || e.wet > 0 || this.done) return;
    e.cd = 0.65;
    this.balls.push({ id: ++this.ballId, from: e.id, x: e.x + Math.sin(e.ang) * 0.7, z: e.z + Math.cos(e.ang) * 0.7, dx: Math.sin(e.ang), dz: Math.cos(e.ang), d: 0 });
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    let best = null, bd = 99;
    for (const o of this.ents) { if (o === e || o.wet > 0) continue; const d = Math.hypot(o.x - e.x, o.z - e.z); if (d < bd) { bd = d; best = o; } }
    if (!best) { e.ix = -e.x * 0.1; e.iz = -e.z * 0.1; return; }
    const dx = best.x - e.x, dz = best.z - e.z, d = bd || 1;
    // Se acerca a distancia de tiro y se mueve de costado para esquivar
    const side = Math.sin(this.t * 1.3 + e.x) > 0 ? 1 : -1;
    const k = d > 5 ? 1 : d < 3 ? -0.6 : 0;
    e.ix = (dx / d) * k + (-dz / d) * 0.6 * side; e.iz = (dz / d) * k + (dx / d) * 0.6 * side;
    const aim = Math.atan2(dx, dz);
    let da = aim - e.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (d < 7 && Math.abs(da) < 0.5 && Math.random() < 0.5) { e.ang = aim + rand(-0.15, 0.15); this.throw(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt);
      if (e.wet > 0) { e.wet -= dt; e.vx *= 0.85; e.vz *= 0.85; e.x += e.vx * dt; e.z += e.vz * dt; }
      else moveEnt(e, dt);
      const d = Math.hypot(e.x, e.z);
      if (d > FIELD) { e.x *= FIELD / d; e.z *= FIELD / d; }
    }
    collide(this.ents, 0.7);
    for (const b of this.balls) {
      b.x += b.dx * SPEED * dt; b.z += b.dz * SPEED * dt; b.d += SPEED * dt;
      for (const o of this.ents) {
        if (o.id === b.from || o.wet > 0 || Math.hypot(o.x - b.x, o.z - b.z) > HIT) continue;
        const from = this.get(b.from);
        from.score++; o.wet = 1.1; o.vx += b.dx * 6; o.vz += b.dz * 6;
        this.event(from.id, '+1', 'good');
        this.event(o.id, '¡Mojado!', 'bad');
        this.cue(o.id, { text: '💦 ¡Te mojaron!', buzz: 250 });
        this.cue(from.id, { text: '🎯 ¡Le diste!', buzz: 50 });
        b.d = RANGE; break;
      }
      if (b.d >= RANGE) this.splashes.push({ x: b.x, z: b.z, t: this.t, id: b.id });
    }
    this.balls = this.balls.filter((b) => b.d < RANGE);
    this.splashes = this.splashes.filter((s) => this.t - s.t < 0.5);
  }
  snapshot() {
    return {
      ...this.base(),
      balls: this.balls.map((b) => ({ id: b.id, x: r2(b.x), z: r2(b.z) })),
      splashes: this.splashes.map((s) => ({ id: s.id, x: r2(s.x), z: r2(s.z) })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), wet: e.wet > 0, st: `💦 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Bombuchas };
