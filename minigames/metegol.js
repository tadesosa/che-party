// Metegol: dos contra dos en el metegol del club. Uno maneja el arquero y la defensa, el otro los delanteros.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Metegol',
  instructions: 'Celestes contra rojos en el metegol. Con ◀ ▶ movés tus barras para arriba y abajo, y con PATEAR los muñequitos patean si la pelota está cerca. El primero de cada equipo maneja arquero y defensa; el segundo, los delanteros. ¡A 3 goles!',
  control: 'joystick',
  action: '🦵 ¡PATEAR!',
  modes: ['2v2'],
};

const LX = 7, LZ = 3.6, GOAL = 1.55, TO_WIN = 3;
// Barras de cada equipo: x (para el equipo 0; el equipo 1 está espejado), cantidad de muñecos y separación
const RODS = [{ x: -6.2, n: 1, gap: 0 }, { x: -3.6, n: 2, gap: 2.4 }, { x: 1.2, n: 3, gap: 2.1 }];
const OWNER = [0, 0, 1]; // qué jugador del equipo maneja cada barra

class Metegol extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 50;
    this.teams = teams;
    this.goals = [0, 0];
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      return { id: p.id, team, role: teams[team].indexOf(p.id), off: 0, ix: 0, kickT: -9, botT: 0, botAim: 0 };
    });
    this.resetBall(3.4);
  }
  resetBall(wait = 1.2) { this.ball = { x: 0, z: rand(-1, 1), vx: 0, vz: 0, wait }; }
  // Barras con sus muñecos en este momento: [{ team, x, zs[], ent }]
  rods() {
    const out = [];
    for (const e of this.ents) RODS.forEach((r, i) => {
      // Si el equipo tiene un solo jugador, maneja todas las barras
      if (OWNER[i] !== e.role && this.teams[e.team].length > 1) return;
      const x = e.team ? -r.x : r.x;
      const zs = Array.from({ length: r.n }, (_, k) => (k - (r.n - 1) / 2) * r.gap + e.off);
      out.push({ team: e.team, x, zs, ent: e, i });
    });
    return out;
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    if (m.t === 'input') e.ix = clamp(num(m.x), -1, 1);
    if (m.t === 'action') this.kick(e);
  }
  kick(e) {
    if (!this.started || this.over || this.t - e.kickT < 0.35) return;
    e.kickT = this.t;
    const b = this.ball;
    for (const r of this.rods()) {
      if (r.ent !== e || Math.abs(b.x - r.x) > 0.75) continue;
      for (const z of r.zs) {
        if (Math.abs(b.z - z) > 0.6) continue;
        const dir = e.team ? -1 : 1;
        b.vx = dir * rand(11, 15); b.vz = (b.z - z) * 6 + rand(-2, 2);
        b.x = r.x + dir * 0.8;
        return;
      }
    }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.1;
    const b = this.ball;
    // Alinea el muñeco más cercano con la pelota (con algo de error) y patea cuando la tiene
    const mine = this.rods().filter((r) => r.ent === e);
    let best = null, bd = 99;
    for (const r of mine) for (const z of r.zs) { const d = Math.abs(r.x - b.x) + Math.abs(z - b.z) * 0.3; if (d < bd) { bd = d; best = { r, z }; } }
    if (!best) return;
    if (Math.random() < 0.2) e.botAim = rand(-0.9, 0.9);
    const dz = b.z + b.vz * 0.15 + e.botAim - best.z;
    e.ix = Math.abs(dz) < 0.15 ? 0 : Math.sign(dz) * Math.min(1, Math.abs(dz));
    if (Math.abs(b.x - best.r.x) < 0.7 && Math.abs(b.z - best.z) < 0.6 && Math.random() < 0.4) this.kick(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    if (this.tt >= this.duration) { this.over = true; this.endAt = this.t; return; }
    for (const e of this.ents) e.off = clamp(e.off + e.ix * 6 * dt, -1.6, 1.6);
    const b = this.ball;
    if (b.wait > 0) { b.wait -= dt; if (b.wait <= 0) { b.vx = rand(-4, 4) || 3; b.vz = rand(-3, 3); } return; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    b.vx *= Math.exp(-0.25 * dt); b.vz *= Math.exp(-0.25 * dt);
    if (Math.abs(b.z) > LZ) { b.z = Math.sign(b.z) * LZ; b.vz *= -0.9; }
    if (Math.abs(b.x) > LX) {
      if (Math.abs(b.z) < GOAL) {
        const team = b.x > 0 ? 0 : 1; // gol en el arco derecho = punto del equipo 0
        this.goals[team]++;
        this.lastGoal = { team, at: this.t };
        for (const e of this.ents) this.cue(e.id, { text: e.team === team ? '⚽ ¡GOOOL!' : '😩 Gol de ellos', buzz: e.team === team ? 150 : 300 });
        if (this.goals[team] >= TO_WIN) { this.over = true; this.endAt = this.t; return; }
        this.resetBall();
        return;
      }
      b.x = Math.sign(b.x) * LX; b.vx *= -0.9;
    }
    // Choque con los muñecos: rebota
    for (const r of this.rods()) {
      if (Math.abs(b.x - r.x) > 0.35) continue;
      for (const z of r.zs) {
        if (Math.abs(b.z - z) > 0.4) continue;
        b.x = r.x + Math.sign(b.x - r.x || (r.team ? -1 : 1)) * 0.36;
        b.vx = -b.vx * 0.7 + (r.team ? -1 : 1) * 0.5; b.vz += (b.z - z) * 3;
      }
    }
    // Que nunca quede quieta
    if (Math.hypot(b.vx, b.vz) < 1.2) { b.vx += Math.sign(b.vx || 1) * 1.5 * dt * 10; }
  }
  snapshot() {
    const b = this.ball;
    return {
      ...this.base(), goals: this.goals, lx: LX, lz: LZ, goal: GOAL,
      ball: { x: r2(b.x), z: r2(b.z) },
      rods: this.rods().map((r) => ({ team: r.team, x: r.x, zs: r.zs.map(r2), kick: this.t - r.ent.kickT < 0.2, n: r.zs.length })),
      lastGoal: this.lastGoal && this.t - this.lastGoal.at < 1.2 ? this.lastGoal.team : null,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, role: e.role, st: `⚽ ${this.goals[e.team]}-${this.goals[1 - e.team]}` })),
    };
  }
  winnerTeam() { return this.goals[0] === this.goals[1] ? null : this.goals[0] > this.goals[1] ? 0 : 1; }
  ranking() { const w = this.winnerTeam(); return this.ents.map((e) => ({ id: e.id, score: e.team === w ? 1 : 0 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Metegol };
