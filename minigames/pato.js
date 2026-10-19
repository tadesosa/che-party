// El Pato: el deporte nacional. Agarrá la pelota con manijas y embocala en el aro del otro equipo.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'El Pato',
  instructions: 'Celestes contra rojos. Agarrá el pato (la pelota con manijas) tocándolo. Con el pato, LANZAR tira al aro si estás cerca o se la pasa a tu compañero. Sin el pato, LANZAR es un empujón para robarlo. ¡El que mete más gana! Si estás solo contra tres, corrés más rápido y cada gol tuyo vale doble.',
  control: 'joystick',
  action: '🦆 ¡LANZAR!',
  modes: ['2v2', '1v3'],
};

const FX = 9, FZ = 5, HOOP = 8.2;

class Pato extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 45;
    this.teams = teams;
    this.goals = [0, 0];
    this.solo = teams[0].length === 1 ? 0 : -1;
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id), m = teams[team].length;
      return { id: p.id, team, x: (team ? 1 : -1) * 4, z: m === 1 ? 0 : (k - (m - 1) / 2) * 3, vx: 0, vz: 0, ix: 0, iz: 0, ang: team ? -Math.PI / 2 : Math.PI / 2, cd: 0, dashT: 0, stun: 0, scored: 0, botT: 0 };
    });
    this.resetBall();
  }
  resetBall() { this.ball = { x: 0, z: 0, y: 0.5, vx: 0, vz: 0, vy: 0, fly: null }; this.owner = null; this.grace = 0.5; }
  hoopX(team) { return team ? -HOOP : HOOP; } // cada equipo tira al aro del otro lado
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.act(e);
  }
  act(e) {
    if (!this.started || this.over || e.cd > 0 || e.stun > 0) return;
    e.cd = 0.7;
    if (this.owner === e.id) {
      const hx = this.hoopX(e.team), d = Math.hypot(hx - e.x, e.z);
      if (d < 6.5) {
        // Tiro al aro: más cerca, más fácil
        const p = d < 3 ? 0.85 : d < 4.5 ? 0.6 : 0.35;
        const solo = e.team === this.solo ? 0.15 : 0;
        this.shoot(e, hx, Math.random() < p + solo);
      } else {
        const mate = this.ents.filter((o) => o.team === e.team && o !== e).sort((a, b) => Math.abs(a.x - hx) - Math.abs(b.x - hx))[0];
        if (mate) this.pass(e, mate);
        else this.shoot(e, hx, Math.random() < 0.15);
      }
    } else { e.vx += Math.sin(e.ang) * 14; e.vz += Math.cos(e.ang) * 14; e.dashT = 0.3; }
  }
  shoot(e, hx, good) {
    const tz = good ? 0 : rand(0.9, 1.6) * (Math.random() < 0.5 ? -1 : 1);
    this.owner = null;
    this.ball.fly = { from: { x: e.x, z: e.z }, to: { x: hx, z: tz }, t: 0, T: 0.7, good, by: e.id, team: e.team, shot: true };
  }
  pass(e, mate) {
    this.owner = null;
    this.ball.fly = { from: { x: e.x, z: e.z }, to: { x: mate.x + mate.vx * 0.3, z: mate.z + mate.vz * 0.3 }, t: 0, T: 0.55, by: e.id, team: e.team };
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.12;
    const b = this.ball;
    const hx = this.hoopX(e.team);
    if (this.owner === e.id) {
      const dx = hx - e.x, dz = -e.z, d = Math.hypot(dx, dz) || 1;
      e.ix = dx / d; e.iz = dz / d + Math.sin(this.t * 2 + e.x) * 0.4;
      if (d < rand(2.5, 4.8)) this.act(e);
      return;
    }
    const owner = this.owner && this.get(this.owner);
    let tx, tz;
    if (owner && owner.team === e.team) { tx = hx - (e.team ? -3 : 3); tz = owner.z > 0 ? -2 : 2; } // se desmarca adelante
    else { tx = owner ? owner.x : b.x; tz = owner ? owner.z : b.z; }
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d * rand(0.75, 1); e.iz = dz / d * rand(0.75, 1);
    if (owner && owner.team !== e.team && d < 2 && Math.random() < 0.3) { e.ang = Math.atan2(dx, dz); this.act(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    if (this.tt >= this.duration) { this.over = true; this.endAt = this.t; return; }
    this.grace = Math.max(0, this.grace - dt);
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt); e.dashT = Math.max(0, e.dashT - dt);
      if (e.stun > 0) { e.stun -= dt; e.vx *= 0.9; e.vz *= 0.9; e.x += e.vx * dt; e.z += e.vz * dt; }
      else moveEnt(e, dt, { slow: (e.id === this.owner ? 0.85 : 1) * (e.team === this.solo ? 1.2 : 1) });
      e.x = Math.max(-FX, Math.min(FX, e.x)); e.z = Math.max(-FZ, Math.min(FZ, e.z));
    }
    collide(this.ents, 0.65);
    const b = this.ball;
    if (b.fly) {
      const f = b.fly; f.t += dt;
      const u = Math.min(1, f.t / f.T);
      b.x = f.from.x + (f.to.x - f.from.x) * u; b.z = f.from.z + (f.to.z - f.from.z) * u;
      b.y = 0.8 + Math.sin(u * Math.PI) * (f.shot ? 2.6 : 1.4) + (f.shot ? u * 1.4 : 0);
      if (u >= 1) {
        b.fly = null;
        if (f.shot && f.good) {
          this.goals[f.team] += f.team === this.solo ? 2 : 1;
          const shooter = this.get(f.by); shooter.scored++;
          this.event(f.by, '¡GOL DE PATO!', 'gold');
          for (const e of this.ents) this.cue(e.id, { text: e.team === f.team ? '🦆 ¡Adentro!' : '😬 Nos metieron uno', buzz: 120 });
          this.lastGoal = { team: f.team, at: this.t };
          this.resetBall();
          return;
        }
        if (f.shot) this.event(f.by, '¡Afuera!', 'bad');
        b.y = 0.5; b.vx = rand(-2, 2); b.vz = rand(-2, 2);
      }
    } else if (this.owner) {
      const o = this.get(this.owner);
      b.x = o.x + Math.sin(o.ang) * 0.7; b.z = o.z + Math.cos(o.ang) * 0.7; b.y = 1;
      if (this.grace <= 0) for (const e of this.ents) {
        if (e.team === o.team || e.dashT <= 0 || Math.hypot(e.x - o.x, e.z - o.z) > 1.6) continue;
        this.owner = e.id; this.grace = 0.8; o.stun = 0.5;
        this.event(e.id, '¡ROBO!', 'good');
        break;
      }
    } else {
      b.vx *= Math.exp(-2 * dt); b.vz *= Math.exp(-2 * dt);
      b.x = Math.max(-FX, Math.min(FX, b.x + b.vx * dt)); b.z = Math.max(-FZ, Math.min(FZ, b.z + b.vz * dt)); b.y = 0.5;
      if (this.grace <= 0) for (const e of this.ents) {
        if (e.stun > 0 || Math.hypot(e.x - b.x, e.z - b.z) > 1.0) continue;
        this.owner = e.id; this.grace = 0.6;
        this.cue(e.id, { text: '🦆 ¡Tenés el pato!', buzz: 60 });
        break;
      }
    }
  }
  snapshot() {
    const b = this.ball;
    return {
      ...this.base(), goals: this.goals, hoop: HOOP, fx: FX, fz: FZ, owner: this.owner,
      ball: { x: r2(b.x), z: r2(b.z), y: r2(b.y) },
      lastGoal: this.lastGoal && this.t - this.lastGoal.at < 1.2 ? this.lastGoal.team : null,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), dash: e.dashT > 0, stun: e.stun > 0, st: `🦆 ${this.goals[e.team]}-${this.goals[1 - e.team]}` })),
    };
  }
  winnerTeam() { return this.goals[0] === this.goals[1] ? null : this.goals[0] > this.goals[1] ? 0 : 1; }
  ranking() { const w = this.winnerTeam(); return this.ents.map((e) => ({ id: e.id, score: (e.team === w ? 100 : 0) + e.scored })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Pato };
