// Remando en el Tigre: carrera de canoas por un río del Delta que va doblando. Cada pulgar es un remo:
// remar de un lado empuja y hace girar la canoa para el otro; con los dos a la vez va derecho.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Remando en el Tigre',
  instructions: 'Carrera de canoas por el Delta. En el celu, cada mitad de la pantalla es un remo: deslizá el pulgar para abajo para remar de ese lado. Remar con la IZQUIERDA te hace doblar a la derecha, y al revés; con los dos a la vez vas derecho. El río dobla: si te vas a la orilla o chocás un camalote, frenás. ¡El primero en llegar al muelle gana!',
  control: 'oars',
  modes: ['ffa', 'duel'],
};

const LENGTH = 110;     // metros hasta el muelle
const HALF = 1.25;      // medio ancho de tu carril en el río
const DURATION = 60;
const LANE = 2.6;       // separación de los carriles

// El río: el centro se corre de costado con dos ondas (la tele usa la misma cuenta)
function riverX(z, k) { return Math.sin(z * k[0] + k[1]) * k[2] + Math.sin(z * k[3] + k[4]) * k[5]; }
function riverSlope(z, k) { return Math.cos(z * k[0] + k[1]) * k[0] * k[2] + Math.cos(z * k[3] + k[4]) * k[3] * k[5]; }

class Remo extends Minigame {
  constructor(players) {
    super(players);
    const n = players.length;
    this.k = [rand(0.035, 0.05), rand(0, 6), rand(5, 7), rand(0.08, 0.11), rand(0, 6), rand(1.2, 2)];
    this.ents = players.map((p, i) => ({
      id: p.id, lane: (i - (n - 1) / 2) * LANE, d: 0, x: 0, h: 0, v: 0, fin: 0, bumpT: -9, strokeL: -9, strokeR: -9,
      botNext: 0, botSide: -1, rate: rand(1.7, 2.3), skill: rand(0.6, 0.9),
    }));
    // Camalotes en cada carril
    this.logs = [];
    for (const e of this.ents) for (let d = 25; d < LENGTH - 10; d += rand(18, 30)) this.logs.push({ id: e.id, d, x: rand(-0.7, 0.7) });
    this.order = 0;
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || m.b !== 'oar' || !this.started || e.fin) return;
    this.stroke(e, num(m.s) < 0 ? -1 : 1, clamp(num(m.p), 0, 1));
  }
  // Remada: empuja para adelante y gira para el lado contrario del remo
  stroke(e, side, p) {
    const now = this.t;
    const both = side < 0 ? now - e.strokeR < 0.25 : now - e.strokeL < 0.25;
    e.v = Math.min(9, e.v + 1.5 * (0.4 + p * 0.6));
    e.h = clamp(e.h + (both ? 0 : -side * 0.17 * (0.5 + p * 0.5)), -0.9, 0.9);
    if (both) e.h *= 0.6; // con los dos remos se endereza
    if (side < 0) e.strokeL = now; else e.strokeR = now;
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || e.fin || !this.started || this.t < e.botNext) return;
    // Mira adelante: dónde va a estar el centro de su carril y cuánto se tiene que torcer
    const ahead = riverSlope(e.d + 8, this.k);
    const want = clamp(ahead * 0.9 - e.x * 0.25 + rand(-0.15, 0.15) * (1 - e.skill), -0.7, 0.7);
    const err = want - e.h;
    const side = Math.abs(err) < 0.06 ? -e.botSide : err > 0 ? -1 : 1;
    e.botSide = side;
    this.stroke(e, side, rand(0.6, 1) * (0.7 + e.skill * 0.3));
    e.botNext = this.t + 1 / (e.rate * (0.8 + e.skill * 0.3)) + rand(0, 0.12);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 2) this.done = true; return; }
    for (const e of this.ents) {
      if (e.fin) continue;
      e.v *= Math.exp(-0.55 * dt);
      e.h *= Math.exp(-0.25 * dt);
      e.d += Math.cos(e.h) * e.v * dt;
      // Si el río dobla y vos no, te vas hacia la orilla
      e.x += (Math.sin(e.h) - riverSlope(e.d, this.k)) * e.v * dt;
      if (Math.abs(e.x) > HALF) {
        // La orilla te frena y te endereza para el lado del río (así no quedás trabado)
        const sx = Math.sign(e.x);
        e.x = sx * (HALF - 0.05); e.v *= 0.45;
        e.h = Math.asin(clamp(riverSlope(e.d, this.k), -0.8, 0.8)) - sx * 0.15;
        if (this.t - e.bumpT > 1.2) { e.bumpT = this.t; this.event(e.id, '¡A la orilla!', 'bad'); this.cue(e.id, { text: '🌿 ¡Te fuiste a la orilla!', buzz: 200 }); }
      }
      for (const l of this.logs) {
        if (l.id !== e.id || l.hit || Math.abs(l.d - e.d) > 0.9 || Math.abs(l.x - e.x) > 0.6) continue;
        l.hit = true; e.v *= 0.25; e.bumpT = this.t;
        this.event(e.id, '¡Camalote!', 'bad'); this.cue(e.id, { text: '🌱 ¡Te enredaste en un camalote!', buzz: 250 });
      }
      if (e.d >= LENGTH) {
        e.fin = ++this.order; e.finT = this.tt; e.d = LENGTH;
        this.event(e.id, e.fin === 1 ? '¡Primero al muelle!' : `¡Llegó ${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
      }
    }
    if (this.order && this.firstAt == null) this.firstAt = this.tt;
    if (this.ents.every((e) => e.fin) || this.tt >= DURATION || (this.order && this.tt - this.firstAt > 12)) { this.over = true; this.endAt = this.t; }
  }
  snapshot() {
    return {
      ...this.base(),
      timeLeft: Math.max(0, DURATION - this.tt),
      k: this.k.map((v) => Math.round(v * 10000) / 10000), len: LENGTH, half: HALF,
      logs: this.logs.map((l) => ({ id: l.id, d: r2(l.d), x: r2(l.x), hit: !!l.hit })),
      ents: this.ents.map((e) => ({
        id: e.id, lane: e.lane, d: r2(e.d), x: r2(e.x), h: r2(e.h), v: r2(e.v),
        sl: this.t - e.strokeL < 0.35, sr: this.t - e.strokeR < 0.35, bump: this.t - e.bumpT < 0.8, fin: e.fin,
        st: e.fin ? `🏁 ${e.fin}°` : `${Math.round(e.d)} / ${LENGTH} m`,
      })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.d / 1000 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Remo, riverX, riverSlope };
