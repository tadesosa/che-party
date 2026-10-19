// Empujón en la Plaza: tirá a los demás al Riachuelo. La plaza se achica.
const { Minigame, moveEnt, joyInput, r2 } = require('./common');

const meta = {
  title: 'Empujón en la Plaza',
  instructions: 'Movete con el joystick y apretá EMPUJAR para embestir. ¡El que se cae al Riachuelo queda afuera! La plaza se achica.',
  control: 'joystick',
  action: '¡EMPUJAR!',
};

class Sumo extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.R = 9; this.out = [];
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 5, z: Math.sin(a) * 5, vx: 0, vz: 0, ix: 0, iz: 0,
        ang: a + Math.PI, alive: true, y: 0, vy: 0, cd: 0, dashT: 0, botT: 0 };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e || !e.alive) return;
    joyInput(e, m);
    if (m.t === 'action') this.dash(e);
  }
  dash(e) {
    if (e.cd > 0 || !this.started) return;
    e.vx += Math.sin(e.ang) * 16; e.vz += Math.cos(e.ang) * 16; e.cd = 1.0; e.dashT = 0.3;
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || !e.alive) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    const d0 = Math.hypot(e.x, e.z);
    if (d0 > this.R - 2.6) { e.ix = -e.x / d0; e.iz = -e.z / d0; return; }
    let best = null, bd = 1e9;
    for (const o of this.ents) {
      if (o === e || !o.alive) continue;
      const d = Math.hypot(o.x - e.x, o.z - e.z);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) { e.ix = 0; e.iz = 0; return; }
    const w = 0.55 + Math.random() * 0.4;
    e.ix = ((best.x - e.x) / bd) * w; e.iz = ((best.z - e.z) / bd) * w;
    if (bd < 2.6 && Math.random() < 0.1) this.dash(e);
  }
  step(dt) {
    this.t += dt;
    for (const e of this.ents) {
      if (!e.alive) { e.vy -= 25 * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.z += e.vz * dt; continue; }
      if (!this.started) continue;
      e.cd = Math.max(0, e.cd - dt); e.dashT = Math.max(0, e.dashT - dt);
      moveEnt(e, dt);
    }
    if (!this.started) return;
    this.R = Math.max(3.6, 9 - this.tt * 0.14);

    const L = this.ents.filter((e) => e.alive);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      let dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d >= 1.6 || d === 0) continue;
      dx /= d; dz /= d;
      const overlap = 1.6 - d;
      a.x -= dx * overlap / 2; a.z -= dz * overlap / 2;
      b.x += dx * overlap / 2; b.z += dz * overlap / 2;
      const va = a.vx * dx + a.vz * dz, vb = b.vx * dx + b.vz * dz;
      if (va - vb <= 0) continue;
      // Choque con rebote extra; el que embiste empuja más.
      const boostA = a.dashT > 0 ? 1.7 : 1, boostB = b.dashT > 0 ? 1.7 : 1;
      const newVa = vb * 1.3 * boostB, newVb = va * 1.3 * boostA;
      a.vx += (newVa - va) * dx; a.vz += (newVa - va) * dz;
      b.vx += (newVb - vb) * dx; b.vz += (newVb - vb) * dz;
      if (a.dashT > 0 || b.dashT > 0) { this.cue(a.id, { buzz: 60 }); this.cue(b.id, { buzz: 60 }); }
    }
    for (const e of L) {
      if (Math.hypot(e.x, e.z) > this.R + 0.4) {
        e.alive = false; e.vy = 3; this.out.push(e.id);
        this.cue(e.id, { text: '💦 ¡Al agua!', buzz: 300 });
      }
    }
    const alive = this.ents.filter((e) => e.alive).length;
    if ((this.n > 1 && alive <= 1) || alive === 0 || this.tt >= this.duration) this.done = true;
  }
  snapshot() {
    return {
      ...this.base(), R: r2(this.R),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), y: r2(e.y), ang: r2(e.ang), alive: e.alive, dash: e.dashT > 0,
        st: e.alive ? '💪 En pie' : '💦 Afuera' })),
    };
  }
  ranking() {
    const alive = this.ents.filter((e) => e.alive).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    const res = alive.map((e) => ({ id: e.id, score: this.n }));
    // Si quedan varios vivos al final del tiempo, empatan arriba.
    [...this.out].reverse().forEach((id, i) => res.push({ id, score: this.n - alive.length - i }));
    return res.sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Sumo };
