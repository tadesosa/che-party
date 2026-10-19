// Sombrilla Voladora: el viento se llevó una sombrilla que rebota por la playa. El que la agarra suma y sale otra.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Sombrilla Voladora',
  instructions: '¡El viento se llevó la sombrilla! Corré y tocala para agarrarla (solo se puede cuando está baja, cerca del piso). Cada sombrilla atrapada suma un punto y el viento se lleva otra. ¡El que junta más gana!',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

const FIELD = 9;

class Sombrilla extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.n2 = 0;
    this.newUmbrella();
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 6, z: Math.sin(a) * 6, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, score: 0, botT: 0, err: rand(0.3, 1) };
    });
  }
  newUmbrella() {
    this.u = { x: rand(-5, 5), z: rand(-5, 5), y: 3, vx: rand(-4, 4), vz: rand(-4, 4), vy: 0, n: ++this.n2, spin: 0 };
    this.gust = 0;
  }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    // Apunta a donde va a estar la sombrilla (con más o menos puntería)
    const u = this.u, ahead = 0.5 * e.err;
    const tx = u.x + u.vx * ahead, tz = u.z + u.vz * ahead;
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d; e.iz = dz / d;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    const u = this.u;
    // Ráfagas: cada tanto el viento la levanta y le cambia el rumbo
    if ((this.gust -= dt) <= 0) { this.gust = rand(0.9, 1.8); u.vy = rand(4, 7); u.vx += rand(-5, 5); u.vz += rand(-5, 5); }
    u.vy -= 9 * dt; u.y += u.vy * dt;
    if (u.y < 0.4) { u.y = 0.4; u.vy = Math.abs(u.vy) * 0.3; }
    const sp = Math.hypot(u.vx, u.vz), max = 7;
    if (sp > max) { u.vx *= max / sp; u.vz *= max / sp; }
    u.x += u.vx * dt; u.z += u.vz * dt; u.spin += dt * (4 + sp);
    if (Math.abs(u.x) > FIELD) { u.x = Math.sign(u.x) * FIELD; u.vx *= -0.8; }
    if (Math.abs(u.z) > FIELD) { u.z = Math.sign(u.z) * FIELD; u.vz *= -0.8; }
    for (const e of this.ents) {
      moveEnt(e, dt);
      e.x = Math.max(-FIELD, Math.min(FIELD, e.x)); e.z = Math.max(-FIELD, Math.min(FIELD, e.z));
    }
    collide(this.ents, 0.6, 0.6);
    // La agarra el que está más cerca (si está baja)
    const e = u.y > 1.6 ? null : this.ents.filter((o) => Math.hypot(u.x - o.x, u.z - o.z) <= 1.1).sort((a, b) => Math.hypot(u.x - a.x, u.z - a.z) - Math.hypot(u.x - b.x, u.z - b.z))[0];
    if (e) {
      e.score++;
      this.event(e.id, '¡Atrapada! +1', 'gold');
      this.cue(e.id, { text: '⛱️ ¡La agarraste!', buzz: 100 });
      this.lastCatch = { id: e.id, at: this.t, x: u.x, z: u.z };
      this.newUmbrella();
    }
  }
  snapshot() {
    const u = this.u;
    return {
      ...this.base(), u: { x: r2(u.x), z: r2(u.z), y: r2(u.y), spin: r2(u.spin), n: u.n },
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), st: `⛱️ ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Sombrilla };
