// Tejo del Fichín: el tejo de aire de los fichines, pero con un arco por jugador alrededor de la mesa.
// El dedo en el celu marca la posición exacta de tu paleta (no es un joystick: va justo donde está el dedo).
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Tejo del Fichín',
  instructions: 'Cada uno cuida su arco en la mesa de tejo. En el celu, deslizá el dedo: tu paleta va justo adonde está el dedo (no hace falta mantener apretado). Si el tejo te entra en el arco, perdés una vida; si te quedás sin vidas, tu arco se cierra. ¡El último que queda gana!',
  control: 'slider',
  modes: ['ffa', 'duel'],
};

const R = 6.2;              // radio de la mesa (hasta las esquinas)
const PR = 0.36, MR = 0.62; // radio del tejo y de la paleta
const INSET = 0.9;          // la paleta está un poco adelante del arco
const MAXV = 15;            // velocidad máxima de la paleta
const GOAL = 0.72;          // parte del lado que es arco
const DURATION = 70;

class Fichin extends Minigame {
  constructor(players) {
    super(players);
    const n = players.length;
    const S = Math.max(4, n);
    this.S = S;
    // Lado 0 abajo (cerca de la cámara). Con 2 o 3, se sientan enfrentados y el resto son paredes.
    const seats = n === 2 ? [0, 2] : n === 3 ? [0, 1, 3] : players.map((_, i) => i);
    const ap = R * Math.cos(Math.PI / S), hl = R * Math.sin(Math.PI / S);
    this.ap = ap; this.hl = hl;
    this.sides = Array.from({ length: S }, (_, i) => {
      const phi = (2 * Math.PI * i) / S;
      const nx = Math.sin(phi), nz = Math.cos(phi); // hacia afuera
      let tx = nz, tz = -nx;                         // a lo largo del lado
      let axis = 'h';
      if (Math.abs(tx) >= Math.abs(tz)) { if (tx < 0) { tx = -tx; tz = -tz; } } else { axis = 'v'; if (tz > 0) { tx = -tx; tz = -tz; } }
      return { i, nx, nz, tx, tz, axis, owner: null };
    });
    this.lives0 = n <= 2 ? 5 : 4;
    this.ents = players.map((p, k) => {
      const side = this.sides[seats[k]]; side.owner = p.id;
      return { id: p.id, side: seats[k], u: 0, tu: 0, vu: 0, lives: this.lives0, goals: 0, outAt: 0, hitT: -9, skill: rand(0.6, 0.85), react: rand(0.12, 0.22), seen: null, seenT: -9, botErr: 0 };
    });
    this.maxU = hl * GOAL - MR * 0.4;
    this.pucks = [];
    this.serveAt = 3 + 0.8;
    this.speed = 5.2;
    this.lastPad = 0;
    this.over = false;
  }
  mallet(e) {
    const s = this.sides[e.side];
    const d = this.ap - INSET;
    return { x: s.nx * d + s.tx * e.u * this.maxU, z: s.nz * d + s.tz * e.u * this.maxU };
  }
  alive() { return this.ents.filter((e) => e.lives > 0); }
  serve() {
    // Sale del medio hacia alguno que siga vivo
    const targets = this.alive();
    const e = targets[Math.floor(Math.random() * targets.length)];
    const s = this.sides[e.side];
    const a = Math.atan2(s.nx, s.nz) + rand(-0.5, 0.5);
    this.pucks.push({ x: 0, z: 0, vx: Math.sin(a) * this.speed * 0.8, vz: Math.cos(a) * this.speed * 0.8, last: null, id: (this.pid = (this.pid || 0) + 1) });
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'input') e.tu = clamp(num(m.x), -1, 1);
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || e.lives <= 0) return;
    // Mira el tejo con un poco de retraso y calcula por dónde va a llegar a su lado
    if (this.t - e.seenT > e.react) {
      e.seenT = this.t;
      const s = this.sides[e.side];
      let best = null;
      for (const p of this.pucks) {
        const vn = p.vx * s.nx + p.vz * s.nz;
        if (vn <= 0.2) continue;
        const tt = (this.ap - INSET - (p.x * s.nx + p.z * s.nz)) / vn;
        if (tt < 0 || (best && tt > best.tt)) continue;
        // Proyecta sobre el lado, rebotando en las paredes de los costados como un espejo
        let u = ((p.x + p.vx * tt) * s.tx + (p.z + p.vz * tt) * s.tz) / this.maxU;
        const lim = this.hl / this.maxU;
        while (Math.abs(u) > lim) u = Math.sign(u) * 2 * lim - u;
        best = { tt, u, p };
      }
      if (best) {
        // Cada vez que el tejo viene de nuevo decide qué tan bien lo lee (más rápido, más se equivoca)
        const sig = best.p.id + ':' + best.p.hitT;
        if (e.botSig !== sig) {
          e.botSig = sig;
          const miss = (1 - e.skill) * 0.5 + (this.speed - 5) / 14;
          e.botErr = Math.random() < miss ? (Math.random() < 0.5 ? -1 : 1) * rand(0.55, 1) : rand(-0.15, 0.15);
        }
        e.tu = clamp(best.u + e.botErr, -1, 1);
      } else e.tu *= 0.7;
    }
  }
  loseLife(e, puck) {
    e.lives--; e.hitT = this.t;
    const by = puck.last && puck.last !== e.id ? this.get(puck.last) : null;
    if (by) { by.goals++; this.event(by.id, '¡GOOOL!', 'gold'); }
    this.event(e.id, e.lives > 0 ? `¡Te entró! Quedan ${e.lives}` : '¡Arco cerrado!', 'bad');
    this.cue(e.id, { text: e.lives > 0 ? `💔 ¡Te hicieron un gol! Te quedan ${e.lives}` : '😵 ¡Te quedaste sin vidas!', buzz: 400 });
    if (e.lives <= 0) { e.outAt = this.t; this.sides[e.side].owner = null; }
    this.goalFx = { t: this.t, side: e.side };
  }
  stepPuck(p, dt) {
    p.x += p.vx * dt; p.z += p.vz * dt;
    // Paletas (no se mueven por el choque: son "pesadas")
    for (const e of this.ents) {
      if (e.lives <= 0) continue;
      const m = this.mallet(e);
      let dx = p.x - m.x, dz = p.z - m.z;
      const d = Math.hypot(dx, dz);
      if (d >= PR + MR || d === 0) continue;
      dx /= d; dz /= d;
      p.x = m.x + dx * (PR + MR); p.z = m.z + dz * (PR + MR);
      const s = this.sides[e.side];
      const mvx = s.tx * e.vu * this.maxU, mvz = s.tz * e.vu * this.maxU;
      let rx = p.vx - mvx, rz = p.vz - mvz;
      const rn = rx * dx + rz * dz;
      if (rn < 0) { rx -= 2 * rn * dx; rz -= 2 * rn * dz; }
      p.vx = rx + mvx * 0.6; p.vz = rz + mvz * 0.6;
      // Nunca vuelve para el arco propio, ni sale tan de costado que quede rebotando entre paredes
      const sp = Math.hypot(p.vx, p.vz), want = clamp(sp, this.speed, this.speed * 1.45);
      let vn = p.vx * s.nx + p.vz * s.nz, vt = p.vx * s.tx + p.vz * s.tz;
      vn = Math.min(vn, -0.4 * want);
      vt = Math.sign(vt || 1) * Math.sqrt(Math.max(0, want * want - vn * vn));
      p.vx = vn * s.nx + vt * s.tx; p.vz = vn * s.nz + vt * s.tz;
      if (p.last !== e.id || this.t - (p.hitT || 0) > 0.15) { this.hitFx = { t: this.t, x: r2(p.x), z: r2(p.z) }; }
      p.last = e.id; p.hitT = this.t;
    }
    // Lados: arco (si tiene dueño y entra por el medio) o pared
    for (const s of this.sides) {
      const pn = p.x * s.nx + p.z * s.nz;
      if (pn <= this.ap - PR) continue;
      const vn = p.vx * s.nx + p.vz * s.nz;
      const along = p.x * s.tx + p.z * s.tz;
      const owner = s.owner && this.get(s.owner);
      if (owner && Math.abs(along) < this.hl * GOAL - PR * 0.3) {
        if (pn > this.ap + PR) { p.dead = true; this.loseLife(owner, p); return; }
        continue; // está entrando al arco
      }
      if (vn > 0) {
        p.x -= (pn - (this.ap - PR)) * s.nx; p.z -= (pn - (this.ap - PR)) * s.nz;
        p.vx -= 2 * vn * s.nx; p.vz -= 2 * vn * s.nz;
        this.wallFx = this.t;
      }
    }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.t - this.lastPad > 2) {
      this.lastPad = this.t;
      for (const e of this.ents) this.cue(e.id, { pad: { axis: this.sides[e.side].axis, on: e.lives > 0, hint: e.lives > 0 ? (this.sides[e.side].axis === 'v' ? '👆 Tu arco está al costado: deslizá arriba y abajo' : '👉 Deslizá a los costados') : '😵 Quedaste afuera: mirá la tele' } });
    }
    if (this.over) { if (this.t - this.endAt > 1.8) this.done = true; return; }
    // Paletas: van hacia donde está el dedo, rapidísimo pero sin teletransportarse
    for (const e of this.ents) {
      const max = MAXV / this.maxU;
      const du = clamp(e.tu - e.u, -max * dt, max * dt);
      e.vu = du / dt; e.u += du;
    }
    this.speed = Math.min(10.5, 5.2 + this.tt * 0.075);
    const want = this.alive().length >= 3 && this.tt > 22 ? 2 : 1;
    if (this.pucks.length < want && this.t >= this.serveAt) { this.serve(); this.serveAt = this.t + 0.8; if (want === 2 && !this.twoSaid) { this.twoSaid = true; this.cue('*', { text: '😱 ¡Segundo tejo!', buzz: 80 }); } }
    const n = Math.ceil(dt / (1 / 240));
    for (const p of this.pucks) {
      for (let i = 0; i < n && !p.dead; i++) this.stepPuck(p, dt / n);
      // Si nadie lo toca por un rato (quedó rebotando entre paredes), se vuelve a sacar del medio
      p.free = (p.free || 0) + dt;
      if (p.hitT && this.t - p.hitT < dt * 2) p.free = 0;
      if (p.free > 8) { p.dead = true; this.cue('*', { text: '🔄 ¡Saque de nuevo!' }); }
    }
    if (this.pucks.some((p) => p.dead)) { this.pucks = this.pucks.filter((p) => !p.dead); this.serveAt = this.t + 1.2; }
    if (this.alive().length <= 1 || this.tt >= DURATION) { this.over = true; this.endAt = this.t; this.pucks = []; }
  }
  snapshot() {
    return {
      ...this.base(),
      timeLeft: Math.max(0, DURATION - this.tt),
      S: this.S,
      sides: this.sides.map((s) => s.owner),
      pucks: this.pucks.map((p) => ({ k: p.id, x: r2(p.x), z: r2(p.z) })),
      hit: this.hitFx && this.t - this.hitFx.t < 0.12 ? this.hitFx : null,
      wall: this.wallFx != null && this.t - this.wallFx < 0.1,
      goal: this.goalFx && this.t - this.goalFx.t < 1.2 ? this.goalFx.side : null,
      ents: this.ents.map((e) => {
        const m = this.mallet(e);
        return { id: e.id, side: e.side, x: r2(m.x), z: r2(m.z), lives: e.lives, hurt: this.t - e.hitT < 0.9, st: e.lives > 0 ? '❤️'.repeat(e.lives) + (e.goals ? ` ⚽${e.goals}` : '') : '😵 Afuera' };
      }),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: (e.lives > 0 ? 10000 + e.lives * 100 : e.outAt) + e.goals * 0.01 })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Fichin };
