// Palomas de Plaza de Mayo: tirá migas y juntá la mayor bandada. Las palomas van a la miga más cercana.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Palomas de Plaza de Mayo',
  instructions: 'Apretá MIGAS para tirar migas adelante tuyo: las palomas van a comer a la miga más cercana. Cuando se terminan las migas, la paloma se queda con el que esté más cerca. ¡Al final gana el que tenga más palomas alrededor!',
  control: 'joystick',
  action: '🍞 ¡MIGAS!',
  modes: ['ffa', 'duel'],
  board: 'baires',
};

const FIELD = 9, BIRDS = 26, NEAR = 2.6;

class Palomas extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35;
    this.crumbs = []; this.cId = 0;
    this.birds = Array.from({ length: BIRDS }, (_, i) => ({ id: i, x: rand(-FIELD, FIELD), z: rand(-FIELD, FIELD), tx: 0, tz: 0, eat: 0 }));
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 5, z: Math.sin(a) * 5, vx: 0, vz: 0, ix: 0, iz: 0, ang: a + Math.PI, cd: 0, botT: 0, bias: rand(-5, 5) };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.toss(e);
  }
  toss(e) {
    if (!this.started || e.cd > 0 || this.done) return;
    e.cd = 1.4;
    for (let k = 0; k < 3; k++) {
      const d = rand(1.2, 2.4), a = e.ang + rand(-0.5, 0.5);
      this.crumbs.push({ id: ++this.cId, x: e.x + Math.sin(a) * d, z: e.z + Math.cos(a) * d, by: e.id, left: 3 });
    }
  }
  // Cada paloma cuenta para el más cercano (si está a menos de NEAR)
  near(e) {
    return this.birds.filter((b) => {
      const d = Math.hypot(b.x - e.x, b.z - e.z);
      return d < NEAR && this.ents.every((o) => o === e || Math.hypot(b.x - o.x, b.z - o.z) >= d);
    }).length;
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.3;
    // Se acerca a donde hay más palomas sueltas y tira migas
    let best = null, bs = -1e9;
    for (const b of this.birds) {
      const c = this.birds.filter((o) => Math.hypot(o.x - b.x, o.z - b.z) < 2.5).length;
      // Prefiere bandadas cerca suyo y lejos de los otros
      const rival = Math.min(9, ...this.ents.filter((o) => o !== e).map((o) => Math.hypot(o.x - b.x, o.z - b.z)));
      const sc = c - Math.hypot(b.x - e.x, b.z - e.z) * 0.25 + rival * 0.4 + e.bias * 0.1;
      if (sc > bs) { bs = sc; best = b; }
    }
    const dx = best.x - e.x, dz = best.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = d > 2 ? dx / d : 0; e.iz = d > 2 ? dz / d : 0;
    if (d < 4) { e.ang = Math.atan2(dx, dz); if (Math.random() < 0.4) this.toss(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt);
      moveEnt(e, dt, { slow: 0.8 });
      e.x = Math.max(-FIELD, Math.min(FIELD, e.x)); e.z = Math.max(-FIELD, Math.min(FIELD, e.z));
    }
    collide(this.ents, 0.6);
    for (const b of this.birds) {
      // Busca la miga más cercana; si no hay, se queda cerca de la persona más cercana (o vuela un poco)
      let tgt = null, bd = 6;
      for (const c of this.crumbs) { const d = Math.hypot(c.x - b.x, c.z - b.z); if (d < bd) { bd = d; tgt = c; } }
      const sp = tgt ? 3.6 : 1.2;
      let tx = b.x, tz = b.z;
      if (tgt) { tx = tgt.x; tz = tgt.z; if (bd < 0.3) { b.eat += dt; if (b.eat > 0.5) { b.eat = 0; tgt.left--; } } }
      else {
        // Sin migas, picotea por ahí y se va dispersando
        if (!b.wt || this.t > b.wt) { b.wt = this.t + rand(1.5, 3.5); b.wx = b.x + rand(-2.5, 2.5); b.wz = b.z + rand(-2.5, 2.5); }
        tx = b.wx; tz = b.wz;
        // Si alguien pasa muy rápido al lado, se espanta
        for (const e of this.ents) {
          const d = Math.hypot(e.x - b.x, e.z - b.z);
          if (d < 0.9 && Math.hypot(e.vx, e.vz) > 5) { tx = b.x + (b.x - e.x) * 4; tz = b.z + (b.z - e.z) * 4; }
        }
      }
      const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const k = Math.min(d, sp * dt); b.x += (dx / d) * k; b.z += (dz / d) * k; b.ang = Math.atan2(dx, dz); }
      b.x = Math.max(-FIELD, Math.min(FIELD, b.x)); b.z = Math.max(-FIELD, Math.min(FIELD, b.z));
    }
    this.crumbs = this.crumbs.filter((c) => c.left > 0);
  }
  snapshot() {
    return {
      ...this.base(),
      birds: this.birds.map((b) => [r2(b.x), r2(b.z), r2(b.ang || 0)]),
      crumbs: this.crumbs.map((c) => ({ id: c.id, x: r2(c.x), z: r2(c.z) })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), st: `🐦 ${this.near(e)}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: this.near(e) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Palomas };
