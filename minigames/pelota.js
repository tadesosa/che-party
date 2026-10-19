// El Dueño de la Pelota: el que tiene la pelota suma tiempo. Robala embistiendo.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'El Dueño de la Pelota',
  instructions: 'En el potrero, gana el que tenga la pelota más tiempo. Agarrala tocándola. Para robarla, embestí al que la tiene con ROBAR. ¡El dueño corre más lento!',
  control: 'joystick',
  action: '¡ROBAR!',
};

const FIELD = 8.5;

class Pelota extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.ball = { x: 0, z: 0, vx: 0, vz: 0 };
    this.owner = null; this.grace = 0;
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 6, z: Math.sin(a) * 6, vx: 0, vz: 0, ix: 0, iz: 0, ang: a + Math.PI, cd: 0, dashT: 0, stun: 0, score: 0, botT: 0 };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.dash(e);
  }
  dash(e) {
    if (e.cd > 0 || e.stun > 0 || !this.started || e.id === this.owner) return;
    e.vx += Math.sin(e.ang) * 15; e.vz += Math.cos(e.ang) * 15; e.cd = 1.1; e.dashT = 0.32;
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.12;
    if (this.owner === e.id) {
      // Escapar del rival más cercano, sin pegarse a la pared
      let fx = -e.x * 0.15, fz = -e.z * 0.15;
      for (const o of this.ents) {
        if (o === e) continue;
        const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz) || 1;
        fx += (dx / d) * (4 / d); fz += (dz / d) * (4 / d);
      }
      const l = Math.hypot(fx, fz) || 1;
      e.ix = fx / l; e.iz = fz / l;
      return;
    }
    const target = this.owner ? this.get(this.owner) : this.ball;
    const dx = target.x - e.x, dz = target.z - e.z, d = Math.hypot(dx, dz) || 1;
    const w = rand(0.75, 1);
    e.ix = (dx / d) * w; e.iz = (dz / d) * w;
    if (this.owner && d < 2.4 && Math.random() < 0.25) this.dash(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    this.grace = Math.max(0, this.grace - dt);
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt); e.dashT = Math.max(0, e.dashT - dt);
      if (e.stun > 0) { e.stun -= dt; e.vx *= 0.9; e.vz *= 0.9; e.x += e.vx * dt; e.z += e.vz * dt; continue; }
      moveEnt(e, dt, { slow: e.id === this.owner ? 0.8 : 1 });
      const d = Math.hypot(e.x, e.z);
      if (d > FIELD) { e.x *= FIELD / d; e.z *= FIELD / d; e.vx *= -0.3; e.vz *= -0.3; }
    }
    collide(this.ents, 0.7);

    const owner = this.owner && this.get(this.owner);
    if (owner) {
      owner.score += dt;
      this.ball.x = owner.x + Math.sin(owner.ang) * 0.85;
      this.ball.z = owner.z + Math.cos(owner.ang) * 0.85;
      if (this.grace <= 0) {
        for (const e of this.ents) {
          if (e === owner || e.dashT <= 0) continue;
          if (Math.hypot(e.x - owner.x, e.z - owner.z) < 1.6) {
            this.owner = e.id; this.grace = 0.9;
            owner.stun = 0.6; owner.vx = (owner.x - e.x) * 4; owner.vz = (owner.z - e.z) * 4;
            this.event(e.id, '¡ROBO!', 'gold');
            this.cue(e.id, { text: '⚽ ¡Es tuya!', buzz: 80 });
            this.cue(owner.id, { text: '😤 ¡Te la robaron!', buzz: 250 });
            break;
          }
        }
      }
    } else {
      const b = this.ball;
      b.vx *= Math.exp(-1.5 * dt); b.vz *= Math.exp(-1.5 * dt);
      b.x += b.vx * dt; b.z += b.vz * dt;
      const bd = Math.hypot(b.x, b.z);
      if (bd > FIELD) { b.x *= FIELD / bd; b.z *= FIELD / bd; b.vx *= -0.6; b.vz *= -0.6; }
      for (const e of this.ents) {
        if (e.stun > 0 || Math.hypot(e.x - b.x, e.z - b.z) > 1.0) continue;
        this.owner = e.id; this.grace = 0.9;
        this.event(e.id, '¡La tiene!', 'good');
        this.cue(e.id, { text: '⚽ ¡Es tuya! Escapate', buzz: 80 });
        break;
      }
    }
  }
  snapshot() {
    return {
      ...this.base(), ball: { x: r2(this.ball.x), z: r2(this.ball.z) }, owner: this.owner,
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), dash: e.dashT > 0, stun: e.stun > 0,
        st: `⚽ ${e.score.toFixed(1)}s` })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: Math.round(e.score * 10) / 10 })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Pelota };
