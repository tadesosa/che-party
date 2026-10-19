// Aguavivas: nadá hasta la boya y volvé a la orilla esquivando las aguavivas. Cada ida y vuelta suma.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Aguavivas',
  instructions: 'Nadá hasta la boya 🟠, tocala y volvé a la orilla: cada ida y vuelta suma un punto. ¡Ojo con las aguavivas! Si te pica una, te quedás quieto un ratito gritando. El que hace más vueltas gana.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

const SHORE = 7, BUOY = -7, HALFW = 9;

class Aguavivas extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.jelly = Array.from({ length: 9 }, (_, i) => ({ id: i, x: rand(-HALFW, HALFW), z: rand(BUOY + 1.5, SHORE - 2), vx: rand(-1.5, 1.5), vz: rand(-0.8, 0.8) }));
    this.ents = players.map((p, i) => {
      const x = (i - (this.n - 1) / 2) * 2.2;
      return { id: p.id, x, z: SHORE, vx: 0, vz: 0, ix: 0, iz: 0, ang: Math.PI, dir: -1, laps: 0, sting: 0, botT: 0, lane: x };
    });
  }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    const tz = e.dir < 0 ? BUOY : SHORE;
    let fx = (e.lane - e.x) * 0.3, fz = Math.sign(tz - e.z);
    for (const j of this.jelly) {
      const d = Math.hypot(j.x - e.x, j.z - e.z);
      if (d < 2.2 && Math.random() < 0.8) { fx += (e.x - j.x) / d * 1.6; fz += (e.z - j.z) / d * 0.6; }
    }
    const l = Math.hypot(fx, fz) || 1;
    e.ix = fx / l; e.iz = fz / l;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const j of this.jelly) {
      j.x += j.vx * dt; j.z += j.vz * dt;
      if (Math.abs(j.x) > HALFW) j.vx *= -1;
      if (j.z < BUOY + 1.2 || j.z > SHORE - 1.5) j.vz *= -1;
    }
    for (const e of this.ents) {
      if (e.sting > 0) { e.sting -= dt; e.vx *= 0.9; e.vz *= 0.9; continue; }
      moveEnt(e, dt, { slow: 0.62 }); // en el agua se nada lento
      e.x = Math.max(-HALFW - 1, Math.min(HALFW + 1, e.x)); e.z = Math.max(BUOY - 1, Math.min(SHORE + 0.5, e.z));
      if (e.dir < 0 && Math.abs(e.z - BUOY) < 0.9) { e.dir = 1; this.cue(e.id, { text: '🟠 ¡Boya! Ahora a la orilla' }); }
      else if (e.dir > 0 && e.z > SHORE - 0.4) { e.dir = -1; e.laps++; this.event(e.id, '¡Vuelta! +1', 'gold'); }
      for (const j of this.jelly) {
        if (Math.hypot(j.x - e.x, j.z - e.z) > 0.85) continue;
        e.sting = 1.3;
        this.event(e.id, '¡Me picó!', 'bad');
        this.cue(e.id, { text: '🪼 ¡Te picó una aguaviva!', buzz: 400 });
        break;
      }
    }
    collide(this.ents, 0.55, 0.4);
  }
  snapshot() {
    return {
      ...this.base(), shore: SHORE, buoy: BUOY,
      jelly: this.jelly.map((j) => [r2(j.x), r2(j.z)]),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), dir: e.dir, sting: e.sting > 0, st: `🏊 ${e.laps}` })),
    };
  }
  // Desempate: el que está más cerca de terminar la vuelta
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.laps * 100 + Math.round(e.dir < 0 ? (SHORE - e.z) : 14 + (e.z - BUOY)) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Aguavivas };
