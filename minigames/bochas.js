// Bochas en el Club: con la gomera del celu (tirás para atrás y soltás) elegís dirección y fuerza en un solo gesto.
// Como en las bochas de verdad, tira el que está más lejos del bochín. Se puede "bochar" (pegarle a la bocha del otro).
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Bochas en el Club',
  instructions: 'Cuando te toca, en el celu tirá la bocha para atrás con el dedo (como una gomera) y soltá: para dónde apuntás es la dirección, y cuanto más tirás, más fuerte sale. Gana el que deja una bocha más cerca del bochín. Ojo: siempre tira el que está más lejos, y podés sacar de lugar las bochas de los demás… ¡o el bochín!',
  control: 'sling',
  modes: ['ffa', 'duel'],
};

const L = 18.4, HW = 2.1;        // largo de la cancha (z de 0 a -L) y medio ancho
const BR = 0.22, KR = 0.12;       // radio de la bocha y del bochín
const DEC = 3.4;                  // frenado de la arena (m/s²)
const AIM_T = 12;                 // segundos para tirar
const MAX_ANG = 0.17;             // puntería máxima (rad)

// Fuerza 0..1 → distancia que recorre en el piso parejo: de 3 a 20 metros, en línea recta
const speedFor = (p) => Math.sqrt(2 * DEC * (3 + clamp(p, 0, 1) * 17));

class Bochas extends Minigame {
  constructor(players) {
    super(players);
    const per = players.length <= 2 ? 4 : players.length === 3 ? 3 : 2;
    this.ents = players.map((p) => ({ id: p.id, left: per, skill: rand(0.55, 0.85), aim: 0, pow: 0, drag: false }));
    this.kin = { x: rand(-0.9, 0.9), z: -rand(11, 14), vx: 0, vz: 0, r: KR, m: 0.35 };
    this.balls = [];
    this.turn = null;        // id del que tira
    this.phase = 'wait';     // wait → aim → roll → (wait) … → over
    this.phaseT = 3 + 1.2;   // cuándo empieza la fase siguiente
    this.lastCue = 0;
  }
  dist(b) { return Math.hypot(b.x - this.kin.x, b.z - this.kin.z); }
  best(id) {
    const ds = this.balls.filter((b) => b.o === id).map((b) => this.dist(b)).sort((a, b) => a - b);
    return ds.length ? ds : null;
  }
  // Tira el que tiene bochas y está más lejos (el que todavía no tiró cuenta como el más lejos)
  nextThrower() {
    const can = this.ents.filter((e) => e.left > 0);
    if (!can.length) return null;
    const far = (e) => { const b = this.best(e.id); return b ? b[0] : 1e9; };
    can.sort((a, b) => far(b) - far(a) || b.left - a.left || Math.random() - 0.5);
    return can[0];
  }
  startTurn() {
    const e = this.nextThrower();
    if (!e) { this.phase = 'over'; this.phaseT = this.t + 2.5; return; }
    this.turn = e.id; this.phase = 'aim'; this.phaseT = this.t + AIM_T;
    e.aim = 0; e.pow = 0; e.drag = false;
    e.botAt = this.t + rand(1.2, 2.4);
    this.sendPads(true);
  }
  sendPads(loud) {
    this.lastCue = this.t;
    const cur = this.get(this.turn);
    for (const e of this.ents) {
      const mine = this.phase === 'aim' && e.id === this.turn;
      const c = { pad: { on: mine, hint: mine ? '🎯 ¡Te toca! Tirá para atrás y soltá' : e.left > 0 ? '⏳ Tira otro… mirá la tele' : '👀 Ya tiraste todas' } };
      if (loud && mine) { c.text = `🎯 ¡Te toca! Te quedan ${e.left}`; c.buzz = [60, 40, 60]; }
      this.cue(e.id, c);
    }
    return cur;
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || this.phase !== 'aim' || this.turn !== id) return;
    if (m.t === 'input') { e.aim = clamp(num(m.x), -1, 1); e.pow = clamp(num(m.y), 0, 1); e.drag = !!m.drag; }
    else if (m.t === 'action' && m.b === 'throw') this.throwBall(e, clamp(num(m.x), -1, 1), clamp(num(m.y), 0, 1));
  }
  throwBall(e, aim, pow) {
    const v = speedFor(pow), a = aim * MAX_ANG;
    this.balls.push({ o: e.id, x: 0, z: -0.4, vx: Math.sin(a) * v, vz: -Math.cos(a) * v, r: BR, m: 1 });
    e.left--; e.drag = false; e.pow = 0;
    this.phase = 'roll'; this.phaseT = this.t + 12;
    this.lastThrow = { id: e.id, pow };
    this.sendPads(false);
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'aim' || this.turn !== id) return;
    // Apunta al bochín; a veces, si otro está pegado, trata de bocharlo
    let tx = this.kin.x, tz = this.kin.z, extra = -0.25;
    const rivals = this.balls.filter((b) => b.o !== id).sort((a, b) => this.dist(a) - this.dist(b));
    const mine = this.best(id);
    if (rivals.length && this.dist(rivals[0]) < 0.6 && (!mine || mine[0] > this.dist(rivals[0])) && Math.random() < 0.5) { tx = rivals[0].x; tz = rivals[0].z; extra = 2.5; }
    const d = Math.hypot(tx, tz + 0.4) + extra;
    const pow = (d - 3) / 17;
    const err = 1 - e.skill;
    e.aim = clamp(Math.atan2(tx, -(tz + 0.4)) / MAX_ANG, -1, 1); e.pow = pow; e.drag = true;
    if (this.t >= e.botAt) this.throwBall(e, clamp(e.aim + rand(-1, 1) * err * 0.5, -1, 1), clamp(pow + rand(-1, 1) * err * 0.11, 0, 1));
  }
  physics(dt) {
    const all = [...this.balls, this.kin];
    let moving = false;
    for (const b of all) {
      const sp = Math.hypot(b.vx, b.vz);
      if (sp < 1e-3) { b.vx = b.vz = 0; continue; }
      moving = true;
      const ns = Math.max(0, sp - DEC * (b === this.kin ? 1.3 : 1) * dt);
      b.vx *= ns / sp; b.vz *= ns / sp;
      b.x += b.vx * dt; b.z += b.vz * dt;
      // Tablas de los costados y del fondo
      if (b.x > HW - b.r) { b.x = HW - b.r; b.vx = -Math.abs(b.vx) * 0.5; this.thud = this.t; }
      if (b.x < -HW + b.r) { b.x = -HW + b.r; b.vx = Math.abs(b.vx) * 0.5; this.thud = this.t; }
      if (b.z < -L + b.r) { b.z = -L + b.r; b.vz = Math.abs(b.vz) * 0.3; this.thud = this.t; }
      if (b.z > -b.r) { b.z = -b.r; b.vz = -Math.abs(b.vz) * 0.3; }
    }
    // Choques entre bochas
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      let dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz), min = a.r + b.r;
      if (d >= min || d === 0) continue;
      dx /= d; dz /= d;
      const o = (min - d), wa = b.m / (a.m + b.m), wb = a.m / (a.m + b.m);
      a.x -= dx * o * wa; a.z -= dz * o * wa; b.x += dx * o * wb; b.z += dz * o * wb;
      const rel = (a.vx - b.vx) * dx + (a.vz - b.vz) * dz;
      if (rel <= 0) continue;
      const jimp = (1 + 0.85) * rel / (1 / a.m + 1 / b.m);
      a.vx -= jimp / a.m * dx; a.vz -= jimp / a.m * dz;
      b.vx += jimp / b.m * dx; b.vz += jimp / b.m * dz;
      if (rel > 0.6) { this.clack = { t: this.t, x: r2((a.x + b.x) / 2), z: r2((a.z + b.z) / 2), k: r2(Math.min(1, rel / 6)) }; if (b === this.kin || a === this.kin) this.kinHit = this.t; }
    }
    return moving;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'over') { if (this.t >= this.phaseT) this.done = true; return; }
    if (this.phase === 'wait') { if (this.t >= this.phaseT) this.startTurn(); return; }
    if (this.phase === 'aim') {
      if (this.t - this.lastCue > 2) this.sendPads(false);
      if (this.t >= this.phaseT) {
        const e = this.get(this.turn);
        e.left--; this.event(e.id, '¡Se le pasó el tiempo!', 'bad');
        this.cue(e.id, { text: '⌛ ¡Se te pasó el tiempo! Perdiste esa bocha', buzz: 300 });
        this.phase = 'wait'; this.phaseT = this.t + 1;
      }
      return;
    }
    // Rodando: pasos chiquitos para que los choques salgan bien
    let moving = false;
    const n = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < n; i++) moving = this.physics(dt / n) || moving;
    if (!moving || this.t > this.phaseT) {
      for (const b of [...this.balls, this.kin]) b.vx = b.vz = 0;
      const th = this.lastThrow && this.get(this.lastThrow.id);
      if (th) {
        const mine = this.best(th.id);
        const closest = this.balls.length ? this.balls.reduce((a, b) => (this.dist(a) < this.dist(b) ? a : b)) : null;
        const cm = mine ? Math.round(mine[0] * 100) : null;
        if (closest && closest.o === th.id) this.event(th.id, cm < 15 ? `¡Pegadita! ${cm} cm` : `¡Mano! ${cm} cm`, cm < 15 ? 'gold' : 'good');
        else if (cm != null) this.event(th.id, `${cm} cm`, 'bad');
      }
      this.lastThrow = null;
      this.phase = 'wait'; this.phaseT = this.t + 0.9;
    }
  }
  snapshot() {
    const cur = this.get(this.turn);
    const closest = this.balls.length ? this.balls.reduce((a, b) => (this.dist(a) < this.dist(b) ? a : b)) : null;
    const s = {
      ...this.base(),
      phase: this.phase, turn: this.turn,
      timeLeft: this.phase === 'aim' ? Math.max(0, this.phaseT - this.t) : null,
      aim: this.phase === 'aim' && cur ? { a: r2(cur.aim), p: r2(cur.pow), d: cur.drag } : null,
      kin: { x: r2(this.kin.x), z: r2(this.kin.z) },
      balls: this.balls.map((b) => ({ o: b.o, x: r2(b.x), z: r2(b.z), vx: r2(b.vx), vz: r2(b.vz) })),
      lead: closest ? closest.o : null,
      clack: this.clack && this.t - this.clack.t < 0.2 ? this.clack : null,
      thud: this.thud != null && this.t - this.thud < 0.15,
      ents: this.ents.map((e) => {
        const b = this.best(e.id);
        return { id: e.id, left: e.left, st: `${'⚫'.repeat(e.left)}${b ? ` ${Math.round(b[0] * 100)} cm` : ''}${closest && closest.o === e.id ? ' 👑' : ''}` };
      }),
    };
    return s;
  }
  ranking() {
    return this.ents.map((e) => {
      const b = this.best(e.id);
      return { id: e.id, score: b ? -Math.round(b[0] * 100) - (b[1] != null ? Math.min(99, b[1] * 100) / 1000 : 0.099) : -99999 };
    }).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Bochas };
