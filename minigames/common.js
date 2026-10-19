// Piezas compartidas por todos los minijuegos.
// Cada minijuego es una clase con: input(id, msg), bot(id, dt), step(dt), snapshot(), ranking(), done.
// Puede mandar "cues" a los celus (texto grande, vibración, medidor) con this.cue(destino, datos).

const COUNTDOWN = 3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

class Minigame {
  constructor(players) {
    this.t = 0;
    this.done = false;
    this.duration = null; // null = sin reloj (termina por otra regla)
    this.cueOut = [];
    this.events = [];
    this.evId = 0;
    this.n = players.length;
  }
  // Cartel flotante sobre un jugador en la tele. kind: 'good' | 'bad' | 'gold'
  event(id, text, kind = 'good') { this.events.push({ key: ++this.evId, id, text, kind, t: this.t }); }
  get started() { return this.t >= COUNTDOWN; }
  get tt() { return Math.max(0, this.t - COUNTDOWN); } // tiempo de juego
  get(id) { return this.ents.find((e) => e.id === id); }
  // to: id de jugador o '*' para todos
  cue(to, data) { this.cueOut.push({ to, cue: data }); }
  takeCues() { const c = this.cueOut; this.cueOut = []; return c; }
  base() {
    this.events = this.events.filter((ev) => this.t - ev.t < 1);
    return {
      events: this.events.map(({ key, id, text, kind }) => ({ key, id, text, kind })),
      countdown: Math.max(0, COUNTDOWN - this.t),
      timeLeft: this.duration == null ? null : Math.max(0, this.duration - this.tt),
    };
  }
}

// Movimiento con joystick: acelera rápido y frena enseguida (se siente directo).
function moveEnt(e, dt, { accel = 46, friction = 5.5, slow = 1 } = {}) {
  const len = Math.hypot(e.ix, e.iz);
  if (len > 0.12) {
    const k = Math.min(1, len) * slow;
    e.vx += (e.ix / len) * k * accel * dt;
    e.vz += (e.iz / len) * k * accel * dt;
    e.ang = Math.atan2(e.ix, e.iz);
  }
  const f = Math.exp(-friction * dt);
  e.vx *= f; e.vz *= f;
  e.x += e.vx * dt; e.z += e.vz * dt;
}

// Separa a los que se superponen. bounce > 0 además los hace rebotar.
function collide(list, radius = 0.8, bounce = 0) {
  const minD = radius * 2;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    let dx = b.x - a.x, dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    if (d >= minD || d === 0) continue;
    dx /= d; dz /= d;
    const o = (minD - d) / 2;
    a.x -= dx * o; a.z -= dz * o; b.x += dx * o; b.z += dz * o;
    if (bounce) {
      const va = a.vx * dx + a.vz * dz, vb = b.vx * dx + b.vz * dz;
      if (va - vb > 0) {
        a.vx += (vb - va) * dx * bounce; a.vz += (vb - va) * dz * bounce;
        b.vx += (va - vb) * dx * bounce; b.vz += (va - vb) * dz * bounce;
      }
    }
  }
}

function joyInput(e, m) {
  if (m.t === 'input') { e.ix = clamp(num(m.x), -1, 1); e.iz = clamp(num(m.y), -1, 1); }
}

// Ordena de mayor a menor puntaje (el servidor reparte los premios según el orden)
const byScore = (ents, f) => ents.map((e) => ({ id: e.id, score: f(e) })).sort((a, b) => b.score - a.score);

const r2 = (v) => Math.round(v * 100) / 100;

module.exports = { COUNTDOWN, Minigame, clamp, num, rand, pick, moveEnt, collide, joyInput, byScore, r2 };
