// Fútbol Tenis: dos contra dos con una red en el medio. La pelota puede picar una vez en tu lado; devolvela con PATEAR.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Fútbol Tenis',
  instructions: 'Celestes contra rojos, con la red en el medio. Ponete abajo de la pelota y apretá PATEAR para pasarla al otro lado. Puede picar UNA vez en tu cancha: si pica dos veces o la tirás afuera, punto para el otro equipo. ¡A 5 puntos!',
  control: 'joystick',
  action: '⚽ ¡PATEAR!',
  modes: ['2v2', '1v3'],
};

const LX = 8, LZ = 4.5, G = 14, REACH = 1.5, TO_WIN = 5;

class Futtenis extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 50;
    this.teams = teams;
    this.score = [0, 0];
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id), m = teams[team].length;
      return { id: p.id, team, x: (team ? 1 : -1) * (m === 1 ? 4 : 3 + (k % 2) * 2.5), z: m === 1 ? 0 : (k - (m - 1) / 2) * 3, vx: 0, vz: 0, ix: 0, iz: 0, ang: team ? -Math.PI / 2 : Math.PI / 2, kickT: -9, hits: 0, botT: 0 };
    });
    this.serve(Math.random() < 0.5 ? 0 : 1, 3.6);
  }
  side(x) { return x < 0 ? 0 : 1; }
  // La pelota cae del cielo en la cancha de un equipo, para que la saque
  serve(team, delay = 1.2) {
    this.ball = { x: (team ? 1 : -1) * 4, z: rand(-1.5, 1.5), y: 6, vx: 0, vz: 0, vy: 0, bounces: 0, side: team, wait: delay, last: null };
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.kick(e);
  }
  kick(e) {
    const b = this.ball;
    if (!this.started || this.over || b.wait > 0 || this.t - e.kickT < 0.4) return;
    e.kickT = this.t;
    if (this.side(b.x) !== e.team || b.y > 2.6 || Math.hypot(b.x - e.x, b.z - e.z) > REACH) return;
    // Al otro lado, a un lugar al azar (a veces se va un poco larga)
    const dir = e.team ? -1 : 1;
    const tx = dir * rand(1.5, LX + (Math.random() < 0.1 ? 1.5 : -0.6));
    const tz = rand(-LZ + 0.4, LZ - 0.4) * (Math.random() < 0.08 ? 1.3 : 1);
    const T = rand(1.05, 1.35);
    b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (G * T) / 2 - b.y / T;
    b.bounces = 0; b.last = e.team; b.side = 1 - e.team; b.n = (b.n || 0) + 1;
    e.hits++;
    this.event(e.id, '¡Toque!', 'good');
  }
  point(team, why) {
    this.score[team]++;
    for (const e of this.ents) this.cue(e.id, { text: e.team === team ? `🎉 ¡Punto! ${why}` : `😬 ${why}`, buzz: e.team === team ? 80 : 250 });
    this.lastPoint = { team, why, at: this.t };
    if (this.score[team] >= TO_WIN) { this.over = true; this.endAt = this.t; return; }
    this.serve(1 - team);
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.1;
    const b = this.ball;
    // Va adonde va a caer la pelota si viene para su lado; si no, vuelve a su posición
    let gx = e.team ? 4 : -4, gz = 0;
    const mates = this.ents.filter((o) => o.team === e.team);
    const mine = mates.length < 2 || mates.reduce((a, c) => (Math.hypot(a.x - b.x, a.z - b.z) < Math.hypot(c.x - b.x, c.z - b.z) ? a : c)) === e;
    if (b.side === e.team && mine) {
      const tLand = b.vy > 0 || b.y > 0.5 ? (b.vy + Math.sqrt(Math.max(0, b.vy * b.vy + 2 * G * b.y))) / G : 0;
      gx = b.x + b.vx * Math.min(tLand, 0.8); gz = b.z + b.vz * Math.min(tLand, 0.8);
    } else if (mates.length > 1) gz = (mates.indexOf(e) - 0.5) * 3;
    const dx = gx - e.x, dz = gz - e.z, d = Math.hypot(dx, dz);
    e.ix = d > 0.3 ? dx / d : 0; e.iz = d > 0.3 ? dz / d : 0;
    // Cada pelota que viene, el bot decide si la va a poder devolver (no son perfectos)
    if (e.ballN !== b.n) { e.ballN = b.n; e.flub = Math.random() < 0.25; }
    if (!e.flub && Math.hypot(b.x - e.x, b.z - e.z) < REACH * 0.9 && b.y < 2.4 && Math.random() < 0.55) this.kick(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    if (this.tt >= this.duration) { this.over = true; this.endAt = this.t; return; }
    for (const e of this.ents) {
      moveEnt(e, dt);
      const minX = e.team ? 0.5 : -LX - 1.5, maxX = e.team ? LX + 1.5 : -0.5;
      e.x = Math.max(minX, Math.min(maxX, e.x)); e.z = Math.max(-LZ - 1, Math.min(LZ + 1, e.z));
    }
    collide(this.ents, 0.6);
    const b = this.ball;
    if (b.wait > 0) { b.wait -= dt; return; }
    b.vy -= G * dt;
    b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    if (b.y <= 0.25) {
      b.y = 0.25;
      const out = Math.abs(b.x) > LX || Math.abs(b.z) > LZ;
      if (out) { this.point(b.last == null ? 1 - this.side(b.x) : 1 - b.last, '¡Afuera!'); return; }
      const s = this.side(b.x);
      b.bounces++;
      if (b.bounces >= 2) { this.point(1 - s, '¡Picó dos veces!'); return; }
      b.vy = Math.abs(b.vy) * 0.62; b.vx *= 0.7; b.vz *= 0.7;
    }
  }
  snapshot() {
    const b = this.ball;
    return {
      ...this.base(), score: this.score, lx: LX, lz: LZ, toWin: TO_WIN,
      ball: { x: r2(b.x), z: r2(b.z), y: r2(b.y), wait: b.wait > 0 },
      lastPoint: this.lastPoint && this.t - this.lastPoint.at < 1.2 ? this.lastPoint : null,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), kick: this.t - e.kickT < 0.25, st: `⚽ ${this.score[e.team]}-${this.score[1 - e.team]}` })),
    };
  }
  winnerTeam() { return this.score[0] === this.score[1] ? null : this.score[0] > this.score[1] ? 0 : 1; }
  ranking() { const w = this.winnerTeam(); return this.ents.map((e) => ({ id: e.id, score: (e.team === w ? 100 : 0) + e.hits })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Futtenis };
