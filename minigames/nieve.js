// Guerra de Bolas de Nieve: celestes contra rojos, cada equipo en su mitad, detrás de sus murallitas de nieve.
// Cada bola que pega suma un punto para tu equipo y deja al otro congelado un ratito.
const { Minigame, moveEnt, joyInput, collide, rand, clamp, r2 } = require('./common');

const meta = {
  title: 'Guerra de Bolas de Nieve',
  instructions: 'Celestes contra rojos, cada equipo en su mitad. Movete con el joystick y apretá TIRAR para revolear una bola de nieve hacia adelante. Si le pegás a uno del otro equipo, suma un punto y se queda congelado un ratito. ¡Escondete atrás de las murallitas! Si estás solo contra tres, tirás un poco más rápido, pero cada bola que te pegan vale doble.',
  control: 'joystick',
  action: '❄️ ¡TIRAR!',
  modes: ['2v2', '1v3'],
  board: 'bariloche',
};

const W = 11, D = 6.5;          // medio ancho y medio largo de la cancha
const SPEED = 13, RANGE = 17;
// Murallitas de nieve: [x, z, medio largo]
const WALLS = [[-4, -3, 1.3], [-4, 3, 1.3], [4, -3, 1.3], [4, 3, 1.3], [-8, 0, 1], [8, 0, 1]];

class Nieve extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 35;
    this.teams = teams;
    this.solo = teams[0].length === 1 ? 0 : teams[1].length === 1 ? 1 : -1;
    this.balls = []; this.bId = 0;
    this.score = [0, 0];
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id), m = teams[team].length;
      const dir = team ? -1 : 1; // el equipo 0 tira para la derecha (+x)
      return { id: p.id, team, dir, x: -dir * 9.5, z: (k - (m - 1) / 2) * 3 + (m === 1 ? 2 : 0), vx: 0, vz: 0, ix: 0, iz: 0, ang: dir > 0 ? Math.PI / 2 : -Math.PI / 2,
        cd: 0, frozenT: -9, hits: 0, throwT: -9, botT: 0, goal: null };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.throw(e);
  }
  frozen(e) { return this.t - e.frozenT < 1.3; }
  throw(e) {
    if (!this.started || this.done || e.cd > 0 || this.frozen(e)) return;
    e.cd = e.team === this.solo ? 0.5 : 0.8; e.throwT = this.t;
    // Para adelante (hacia el otro equipo), con un poco del ángulo del joystick
    const aim = clamp(e.iz, -0.6, 0.6);
    const len = Math.hypot(1, aim);
    this.balls.push({ id: ++this.bId, from: e.id, team: e.team, x: e.x + e.dir * 0.6, z: e.z, vx: (e.dir / len) * SPEED, vz: (aim / len) * SPEED, dist: 0, r: 0.5 });
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.3;
    const foes = this.ents.filter((o) => o.team !== e.team && !this.frozen(o));
    const target = foes.sort((a, b) => Math.abs(a.z - e.z) - Math.abs(b.z - e.z))[0];
    // Esquivar bolas que vienen hacia mí
    const danger = this.balls.find((b) => b.team !== e.team && Math.sign(e.x - b.x) === Math.sign(b.vx) && Math.abs(b.z - e.z) < 1 && Math.abs(b.x - e.x) < 6);
    // Esquiva a veces (como una persona: no ve todas las bolas)
    if (danger && Math.random() < 0.35) { e.ix = 0; e.iz = e.z > danger.z ? 1 : -1; return; }
    if (!e.goal || Math.random() < 0.15) e.goal = { x: -e.dir * rand(2.5, 9), z: target ? target.z + rand(-1, 1) : rand(-5, 5) };
    const dx = e.goal.x - e.x, dz = e.goal.z - e.z, d = Math.hypot(dx, dz);
    e.ix = d > 0.5 ? dx / d : 0; e.iz = d > 0.5 ? dz / d : 0;
    if (target && Math.abs(target.z - e.z) < 1.2 && Math.random() < 0.6) { e.iz = clamp((target.z - e.z) / 3, -0.6, 0.6); this.throw(e); }
  }
  blocked(x, z) { return WALLS.some(([wx, wz, h]) => Math.abs(x - wx) < 0.45 && Math.abs(z - wz) < h); }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt);
      if (this.frozen(e)) { e.vx = 0; e.vz = 0; continue; }
      const ox = e.x, oz = e.z;
      moveEnt(e, dt, { slow: e.team === this.solo ? 1.15 : 1 });
      // Cada equipo queda en su mitad
      e.x = e.team ? clamp(e.x, 1, W) : clamp(e.x, -W, -1);
      e.z = clamp(e.z, -D, D);
      // Contra una murallita: no la atraviesa, se desliza hacia la punta más cercana para rodearla
      const w = WALLS.find(([wx, wz, h]) => Math.abs(e.x - wx) < 0.45 && Math.abs(e.z - wz) < h);
      if (w) { e.x = ox; if (Math.abs(e.ix) > 0.2) e.z += Math.sign(e.z - w[1] || 1) * 4 * dt; }
    }
    collide(this.ents, 0.55, 0.3);
    for (const b of this.balls) {
      b.x += b.vx * dt; b.z += b.vz * dt; b.dist += SPEED * dt;
      // Las murallitas frenan las bolas del otro equipo (las propias pasan por arriba)
      if (WALLS.some(([wx, wz, h]) => (b.team === 0 ? wx > 0 : wx < 0) && Math.abs(b.x - wx) < 0.45 && Math.abs(b.z - wz) < h)) { b.dead = true; continue; }
      for (const o of this.ents) {
        if (o.team === b.team || this.frozen(o)) continue;
        if (Math.hypot(o.x - b.x, o.z - b.z) < b.r + 0.4) {
          b.dead = true; o.frozenT = this.t;
          const thrower = this.get(b.from);
          if (thrower) thrower.hits++;
          this.score[b.team] += o.team === this.solo ? 2 : 1;
          this.event(o.id, '¡Congelado!', 'bad');
          this.cue(o.id, { text: '🥶 ¡Te dieron!', buzz: 250 });
          if (thrower) this.event(thrower.id, '¡Le di!', 'good');
          break;
        }
      }
      if (b.dist > RANGE || Math.abs(b.z) > D + 2) b.dead = true;
    }
    this.balls = this.balls.filter((b) => !b.dead);
  }
  snapshot() {
    return {
      ...this.base(), score: this.score, walls: WALLS, w: W, d: D,
      balls: this.balls.map((b) => ({ id: b.id, x: r2(b.x), z: r2(b.z), r: b.r, team: b.team })),
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), frozen: this.frozen(e), throwing: this.t - e.throwT < 0.3,
        st: `❄️ ${this.score[e.team]} · ${e.hits} míos` })),
    };
  }
  winnerTeam() { return this.score[0] === this.score[1] ? null : this.score[0] > this.score[1] ? 0 : 1; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.hits })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Nieve };
