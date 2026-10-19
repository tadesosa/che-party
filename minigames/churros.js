// Churros en la Playa: cargá churros en el carrito y llevalos a las sombrillas que levantan la mano.
const { Minigame, moveEnt, joyInput, collide, rand, pick, r2 } = require('./common');

const meta = {
  title: 'Churros en la Playa',
  instructions: '¡Churros, churros! Pasá por el carrito para cargar churros (hasta 3). Llevalos a las sombrillas donde alguien levanta la mano 🙋: cada entrega suma un punto. Si tardás mucho, el cliente se cansa y baja la mano.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

const FIELD = 9, CART = { x: 0, z: 0 }, MAXC = 3;
const UMBRELLAS = [];
for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; UMBRELLAS.push({ x: r2(Math.cos(a) * 7), z: r2(Math.sin(a) * 6.2) }); }

class Churros extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.calls = []; // { u, until }
    for (let k = 0; k < 4; k++) this.newCall();
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 2, z: Math.sin(a) * 2, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, carry: 0, score: 0, botT: 0 };
    });
  }
  newCall() {
    const free = UMBRELLAS.map((_, i) => i).filter((i) => !this.calls.some((c) => c.u === i));
    this.calls.push({ u: pick(free), until: this.t + rand(7, 11) });
  }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    let g = CART;
    if (e.carry && this.calls.length) {
      const c = this.calls.reduce((a, b) => { const A = UMBRELLAS[a.u], B = UMBRELLAS[b.u]; return Math.hypot(B.x - e.x, B.z - e.z) < Math.hypot(A.x - e.x, A.z - e.z) ? b : a; });
      g = UMBRELLAS[c.u];
    }
    const dx = g.x - e.x, dz = g.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d * rand(0.8, 1); e.iz = dz / d * rand(0.8, 1);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    const before = this.calls.length;
    this.calls = this.calls.filter((c) => this.t < c.until);
    for (let k = this.calls.length; k < before; k++) this.newCall();
    for (const e of this.ents) {
      moveEnt(e, dt, { slow: 0.9 });
      e.x = Math.max(-FIELD, Math.min(FIELD, e.x)); e.z = Math.max(-FIELD + 1, Math.min(FIELD - 1, e.z));
      if (e.carry < MAXC && Math.hypot(e.x - CART.x, e.z - CART.z) < 1.5) e.carry = MAXC;
      if (!e.carry) continue;
      const c = this.calls.find((c) => Math.hypot(UMBRELLAS[c.u].x - e.x, UMBRELLAS[c.u].z - e.z) < 1.4);
      if (c) {
        e.carry--; e.score++;
        this.calls = this.calls.filter((x) => x !== c); this.newCall();
        this.event(e.id, '¡Churro! +1', 'good');
      }
    }
    collide(this.ents, 0.6, 0.5);
  }
  snapshot() {
    return {
      ...this.base(), umbrellas: UMBRELLAS, cart: CART,
      calls: this.calls.map((c) => ({ u: c.u, left: r2(c.until - this.t) })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), carry: e.carry, st: `🥖 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Churros };
