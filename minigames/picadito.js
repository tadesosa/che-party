// Picadito: fútbol 2 contra 2 en el potrero. Gana el equipo con más goles.
const { Minigame, moveEnt, joyInput, collide, clamp, rand, r2 } = require('./common');

const meta = {
  title: 'Picadito 2 vs 2',
  instructions: 'Fútbol de potrero, 2 contra 2. Movete con el joystick y apretá PATEAR cerca de la pelota. ¡El equipo celeste ataca a la derecha y el rojo a la izquierda!',
  control: 'joystick',
  action: '⚽ ¡PATEAR!',
  modes: ['2v2'],
};

const W = 10, H = 6, GOAL = 2.2;

class Picadito extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 45;
    this.teams = teams;
    this.goals = [0, 0];
    this.ball = { x: 0, z: 0, vx: 0, vz: 0 };
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id);
      return { id: p.id, team, x: team === 0 ? -5 : 5, z: k ? 2 : -2, vx: 0, vz: 0, ix: 0, iz: 0, ang: team === 0 ? Math.PI / 2 : -Math.PI / 2, cd: 0, botT: 0, home: k ? 2 : -2 };
    });
    this.pause = 0;
  }
  // El equipo 0 ataca hacia +x, el 1 hacia -x
  kick(e) {
    if (e.cd > 0 || !this.started) return;
    const b = this.ball, d = Math.hypot(b.x - e.x, b.z - e.z);
    e.cd = 0.4;
    if (d > 1.5) return;
    const tx = e.team === 0 ? W : -W;
    let dx = Math.sin(e.ang), dz = Math.cos(e.ang);
    // Ayudita: si mira más o menos al arco, apunta al arco
    const gx = tx - b.x, gz = -b.z, gl = Math.hypot(gx, gz);
    if (dx * Math.sign(tx) > 0.2) { dx = dx * 0.4 + (gx / gl) * 0.6; dz = dz * 0.4 + (gz / gl) * 0.6; }
    const l = Math.hypot(dx, dz) || 1;
    b.vx = (dx / l) * 15; b.vz = (dz / l) * 15;
    this.cue(e.id, { buzz: 40 });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.kick(e);
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.12;
    const b = this.ball;
    const mate = this.ents.find((o) => o.team === e.team && o !== e);
    const closer = !mate || Math.hypot(b.x - e.x, b.z - e.z) <= Math.hypot(b.x - mate.x, b.z - mate.z);
    let tx, tz;
    if (closer) {
      // Ponerse detrás de la pelota mirando al arco rival
      const back = e.team === 0 ? -0.9 : 0.9;
      tx = b.x + back; tz = b.z;
    } else { tx = e.team === 0 ? -4 : 4; tz = e.home; }
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = d > 0.3 ? dx / d : 0; e.iz = d > 0.3 ? dz / d : 0;
    if (closer && Math.hypot(b.x - e.x, b.z - e.z) < 1.3) { e.ang = e.team === 0 ? Math.PI / 2 : -Math.PI / 2; if (Math.random() < 0.5) this.kick(e); }
  }
  reset() {
    Object.assign(this.ball, { x: 0, z: 0, vx: 0, vz: 0 });
    for (const e of this.ents) { e.x = e.team === 0 ? -5 : 5; e.z = e.home; e.vx = e.vz = 0; }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) {
      if (!this.endAt) {
        this.endAt = this.t;
        const w = this.winnerTeam();
        for (const e of this.ents) this.cue(e.id, { text: w == null ? '🤝 ¡Empate!' : e.team === w ? '🏆 ¡Ganaron!' : '😞 Perdieron' });
      }
      if (this.t - this.endAt > 1.5) this.done = true;
      return;
    }
    if (this.pause > 0) { this.pause -= dt; if (this.pause <= 0) this.reset(); return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt);
      moveEnt(e, dt, { accel: 40, friction: 5.5 });
      e.x = clamp(e.x, -W, W); e.z = clamp(e.z, -H, H);
    }
    collide(this.ents, 0.55, 0.5);
    const b = this.ball;
    // Gambeta: el que está más pegado a la pelota la empuja (si hay dos, gana el más cercano)
    let near = null, nd = 0.85;
    for (const e of this.ents) { const d = Math.hypot(b.x - e.x, b.z - e.z); if (d < nd && d > 0) { nd = d; near = e; } }
    if (near) {
      const dx = (b.x - near.x) / nd, dz = (b.z - near.z) / nd;
      b.vx += dx * 54 * dt; b.vz += dz * 54 * dt;
      b.x = near.x + dx * 0.85; b.z = near.z + dz * 0.85;
    }
    b.vx *= Math.exp(-1.2 * dt); b.vz *= Math.exp(-1.2 * dt);
    b.x += b.vx * dt; b.z += b.vz * dt;
    if (Math.abs(b.z) > H) { b.z = Math.sign(b.z) * H; b.vz *= -0.7; }
    if (Math.abs(b.x) > W) {
      if (Math.abs(b.z) < GOAL) {
        const scorer = b.x > 0 ? 0 : 1;
        this.goals[scorer]++;
        this.pause = 1.6;
        for (const e of this.ents) {
          if (e.team === scorer) { this.event(e.id, '¡GOOOL!', 'gold'); this.cue(e.id, { text: '⚽ ¡GOOOL!', buzz: [100, 50, 100] }); }
          else this.cue(e.id, { text: '😩 Gol de ellos', buzz: 200 });
        }
        b.vx = b.vz = 0;
      } else { b.x = Math.sign(b.x) * W; b.vx *= -0.7; }
    }
  }
  snapshot() {
    return {
      ...this.base(), goals: this.goals, teams: this.teams, ball: { x: r2(this.ball.x), z: r2(this.ball.z) }, w: W, h: H, goal: GOAL,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), st: `⚽ ${this.goals[e.team]} - ${this.goals[1 - e.team]}` })),
    };
  }
  winnerTeam() { return this.goals[0] === this.goals[1] ? null : this.goals[0] > this.goals[1] ? 0 : 1; }
  ranking() { const w = this.winnerTeam(); return this.ents.map((e) => ({ id: e.id, score: e.team === w ? 1 : 0 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Picadito };
