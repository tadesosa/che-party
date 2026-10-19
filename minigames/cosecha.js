// La Cosecha: en el viñedo aparecen racimos. Agarralos (hasta 3) y llevalos a tu tacho.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'La Cosecha',
  instructions: 'Vendimia en el viñedo: parate al lado de un racimo y apretá AGARRAR (podés llevar hasta 3, pero con más peso caminás más lento). Llevalos a tu tacho, que tiene tu color. ¡El que cosecha más racimos gana!',
  control: 'joystick',
  action: '🍇 ¡AGARRAR!',
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

const FIELD = 9, ROWS = [-4.5, 0, 4.5], MAXC = 3;

class Cosecha extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.bunches = []; this.bId = 0;
    for (let k = 0; k < 8; k++) this.spawn();
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2 + Math.PI / 4;
      const bx = Math.cos(a) * 9.2, bz = Math.sin(a) * 6.8;
      return { id: p.id, x: bx * 0.8, z: bz * 0.8, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, carry: 0, score: 0, bin: { x: r2(bx), z: r2(bz) }, cd: 0, botT: 0 };
    });
  }
  spawn() {
    const row = ROWS[Math.floor(Math.random() * ROWS.length)];
    this.bunches.push({ id: ++this.bId, x: rand(-FIELD + 1.5, FIELD - 1.5), z: row + (Math.random() < 0.5 ? -0.9 : 0.9) });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.grab(e);
  }
  grab(e) {
    if (!this.started || this.done || e.cd > 0 || e.carry >= MAXC) return;
    e.cd = 0.25;
    const b = this.bunches.find((b) => Math.hypot(b.x - e.x, b.z - e.z) < 1.3);
    if (!b) return;
    this.bunches = this.bunches.filter((x) => x !== b);
    e.carry++;
    this.spawn();
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    let g;
    if (e.carry >= (e.want || (e.want = 1 + Math.floor(Math.random() * MAXC)))) g = e.bin;
    else g = this.bunches.reduce((a, b) => (Math.hypot(b.x - e.x, b.z - e.z) < Math.hypot(a.x - e.x, a.z - e.z) ? b : a), this.bunches[0]);
    const dx = g.x - e.x, dz = g.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d; e.iz = dz / d;
    if (g !== e.bin && d < 1.2) this.grab(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt);
      moveEnt(e, dt, { slow: 1 - e.carry * 0.15 });
      e.x = Math.max(-FIELD - 1, Math.min(FIELD + 1, e.x)); e.z = Math.max(-7.5, Math.min(7.5, e.z));
      if (e.carry && Math.hypot(e.bin.x - e.x, e.bin.z - e.z) < 1.4) {
        e.score += e.carry;
        this.event(e.id, `+${e.carry}`, e.carry === MAXC ? 'gold' : 'good');
        e.carry = 0; e.want = 0;
      }
    }
    collide(this.ents, 0.6, 0.5);
  }
  snapshot() {
    return {
      ...this.base(), rows: ROWS,
      bunches: this.bunches.map((b) => ({ id: b.id, x: r2(b.x), z: r2(b.z) })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), carry: e.carry, bin: e.bin, st: `🍇 ${e.score}${e.carry ? ` (+${e.carry})` : ''}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Cosecha };
