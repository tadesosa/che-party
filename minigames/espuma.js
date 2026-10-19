// Carnaval de Espuma: dos equipos pintan el piso con espuma. Gana el equipo que cubre más.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Carnaval de Espuma',
  instructions: 'Celestes contra rojos. Al caminar dejás espuma de tu color en el piso, y con ROCIAR tirás un chorro grande para adelante. ¡Gana el equipo que tenga más piso pintado al final! Si estás solo contra tres, pintás más grande y tu espuma vale una vez y media.',
  control: 'joystick',
  action: '🫧 ¡ROCIAR!',
  modes: ['2v2', '1v3'],
};

const N = 18;          // grilla de N x N
const SIZE = 16;       // lado de la plaza
const CELL = SIZE / N;

class Espuma extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 35;
    this.teams = teams;
    this.grid = new Array(N * N).fill(0); // 0 nada, 1 equipo 0, 2 equipo 1
    // El que está solo pinta más grande para emparejar
    this.solo = teams[0].length === 1 ? 0 : -1;
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id);
      return { id: p.id, team, x: (team ? 1 : -1) * 6, z: (k - (teams[team].length - 1) / 2) * 2.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: team ? -Math.PI / 2 : Math.PI / 2, cd: 0, sprayT: 0, painted: 0, botT: 0, goal: null };
    });
  }
  cellAt(x, z) {
    const i = Math.floor((x + SIZE / 2) / CELL), j = Math.floor((z + SIZE / 2) / CELL);
    return i >= 0 && j >= 0 && i < N && j < N ? j * N + i : -1;
  }
  paint(e, x, z, r) {
    const v = e.team + 1;
    for (let dx = -r; dx <= r + 1e-6; dx += CELL * 0.5) for (let dz = -r; dz <= r + 1e-6; dz += CELL * 0.5) {
      if (dx * dx + dz * dz > r * r) continue;
      const c = this.cellAt(x + dx, z + dz);
      if (c >= 0 && this.grid[c] !== v) { this.grid[c] = v; e.painted++; }
    }
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.spray(e);
  }
  spray(e) {
    if (!this.started || e.cd > 0 || this.done) return;
    e.cd = e.team === this.solo ? 1.0 : 1.6; e.sprayT = 0.45;
    const big = e.team === this.solo ? 2 : 1;
    for (let d = 1; d <= 4.5; d += 0.7) this.paint(e, e.x + Math.sin(e.ang) * d, e.z + Math.cos(e.ang) * d, (0.7 + d * 0.15) * big);
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.4;
    // Busca una zona que no sea de su color, cerca
    if (!e.goal || Math.hypot(e.goal.x - e.x, e.goal.z - e.z) < 1 || this.grid[this.cellAt(e.goal.x, e.goal.z)] === e.team + 1) {
      let best = null, bs = -Infinity;
      for (let k = 0; k < 14; k++) {
        const x = rand(-SIZE / 2 + 1, SIZE / 2 - 1), z = rand(-SIZE / 2 + 1, SIZE / 2 - 1);
        const c = this.grid[this.cellAt(x, z)];
        const s = (c === e.team + 1 ? 0 : c === 0 ? 2 : 3) - Math.hypot(x - e.x, z - e.z) * 0.15;
        if (s > bs) { bs = s; best = { x, z }; }
      }
      e.goal = best;
    }
    const dx = e.goal.x - e.x, dz = e.goal.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d; e.iz = dz / d;
    if (Math.random() < 0.35) this.spray(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt); e.sprayT = Math.max(0, e.sprayT - dt);
      moveEnt(e, dt, { slow: e.team === this.solo ? 1.2 : 1 });
      const L = SIZE / 2 - 0.4;
      e.x = Math.max(-L, Math.min(L, e.x)); e.z = Math.max(-L, Math.min(L, e.z));
      this.paint(e, e.x, e.z, e.team === this.solo ? 1.15 : 0.6);
    }
    collide(this.ents, 0.7, 0.5);
  }
  counts() { const c = [0, 0]; for (const v of this.grid) if (v) c[v - 1]++; return c; }
  // Puntaje de cada equipo: el que está solo vale x1,5
  points() { const c = this.counts(); return c.map((v, i) => Math.round((i === this.solo ? 1.5 : 1) * (v / (N * N)) * 100)); }
  snapshot() {
    const c = this.counts(), pts = this.points();
    return {
      ...this.base(), grid: this.grid.join(''), n: N, size: SIZE, counts: c, pts, teams: this.teams,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), spray: e.sprayT > 0,
        st: `🫧 ${pts[e.team]} pts` })),
    };
  }
  winnerTeam() { const c = this.points(); return c[0] === c[1] ? null : c[0] > c[1] ? 0 : 1; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.painted })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Espuma };
