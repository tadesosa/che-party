// La Mancha: uno contra tres. El que está solo es "la mancha" y tiene que tocar a los otros tres antes de que se acabe el tiempo.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'La Mancha',
  instructions: 'El que juega solo es LA MANCHA: tiene que tocar a los otros tres (con EMBESTIR va más rápido). Los otros tres: ¡que no los toquen durante 25 segundos!',
  control: 'joystick',
  action: '¡EMBESTIR!',
  modes: ['1v3'],
};

const ARENA = 10;

class Mancha extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 25;
    this.teams = teams;
    this.chaser = teams[0][0];
    this.ents = players.map((p, i) => {
      const isChaser = p.id === this.chaser;
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: isChaser ? 0 : Math.cos(a) * 6.5, z: isChaser ? 0 : Math.sin(a) * 6.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0,
        chaser: isChaser, caught: false, cd: 0, dashT: 0, botT: 0 };
    });
    this.win = undefined;
  }
  input(id, m) {
    const e = this.get(id); if (!e || e.caught) return;
    joyInput(e, m);
    if (m.t === 'action') this.dash(e);
  }
  dash(e) {
    if (e.cd > 0 || !this.started) return;
    e.vx += Math.sin(e.ang) * 13; e.vz += Math.cos(e.ang) * 13; e.cd = e.chaser ? 2 : 1.4; e.dashT = 0.3;
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || e.caught) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.12;
    if (e.chaser) {
      let best = null, bd = 1e9;
      for (const o of this.ents) { if (o.chaser || o.caught) continue; const d = Math.hypot(o.x - e.x, o.z - e.z); if (d < bd) { bd = d; best = o; } }
      if (!best) return;
      e.ix = (best.x - e.x) / bd; e.iz = (best.z - e.z) / bd;
      if (bd < 3 && Math.random() < 0.15) this.dash(e);
    } else {
      const c = this.get(this.chaser);
      const wall = Math.hypot(e.x, e.z) / ARENA;
      let fx = -e.x * 0.12 * (1 + wall * 3), fz = -e.z * 0.12 * (1 + wall * 3);
      const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz) || 1;
      fx += (dx / d) * (5 / d); fz += (dz / d) * (5 / d);
      fx += rand(-0.3, 0.3); fz += rand(-0.3, 0.3);
      const l = Math.hypot(fx, fz) || 1;
      e.ix = fx / l; e.iz = fz / l;
    }
  }
  step(dt) {
    this.t += dt;
    if (this.win !== undefined) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    if (!this.started) return;
    for (const e of this.ents) {
      if (e.caught) continue;
      e.cd = Math.max(0, e.cd - dt); e.dashT = Math.max(0, e.dashT - dt);
      moveEnt(e, dt, { accel: e.chaser ? 42 : 42, friction: 5.5 });
      const d = Math.hypot(e.x, e.z);
      if (d > ARENA) { e.x *= ARENA / d; e.z *= ARENA / d; }
    }
    collide(this.ents.filter((e) => !e.caught), 0.6);
    const c = this.get(this.chaser);
    for (const e of this.ents) {
      if (e.chaser || e.caught) continue;
      if (Math.hypot(e.x - c.x, e.z - c.z) < 1.3) {
        e.caught = true;
        this.event(e.id, '¡MANCHA!', 'bad');
        this.cue(e.id, { text: '😵 ¡Te mancharon!', buzz: 400 });
        this.cue(c.id, { text: '😈 ¡Uno menos!', buzz: 80 });
      }
    }
    const free = this.ents.filter((e) => !e.chaser && !e.caught).length;
    if (free === 0 || this.tt >= this.duration) {
      this.win = free === 0 ? 0 : 1; this.endAt = this.t;
      this.cue('*', { text: this.win === 0 ? '😈 ¡Ganó la mancha!' : '🏃 ¡Se salvaron!' });
    }
  }
  snapshot() {
    return {
      ...this.base(), chaser: this.chaser, over: this.win !== undefined,
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), chaser: e.chaser, caught: e.caught, dash: e.dashT > 0,
        st: e.chaser ? '😈 La mancha' : e.caught ? '😵 Manchado' : '🏃 Libre' })),
    };
  }
  winnerTeam() { return this.win ?? null; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: (e.chaser ? 0 : 1) === this.win ? 1 : 0 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Mancha };
