// El Gaucho y el Lazo: uno solo, a caballo, tira el lazo. Los otros tres escapan por el corral.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'El Gaucho y el Lazo',
  instructions: 'El que está solo es el gaucho: mirá hacia alguien y apretá LAZO para enlazarlo. Los otros tres escapan por el corral. Si el gaucho enlaza a dos (o a todos) gana; si al final quedan dos sueltos, ganan los tres.',
  control: 'joystick',
  action: '🪢 ¡LAZO!',
  modes: ['1v3'],
};

const FIELD = 9, REACH = 3.6, RING = 1.4, FLY = 0.4;

class Lazo extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 35;
    this.teams = teams;
    this.gaucho = teams[0][0];
    this.lasso = null; // { x, z, ang, t }
    this.ents = players.map((p, i) => {
      const isG = p.id === this.gaucho;
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, team: isG ? 0 : 1, x: isG ? 0 : Math.cos(a) * 6, z: isG ? 0 : Math.sin(a) * 6, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0,
        caught: false, caughtAt: 0, cd: 0, botT: 0, survived: 0 };
    });
  }
  get runners() { return this.ents.filter((e) => e.team === 1); }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action' && e.id === this.gaucho) this.throw(e);
  }
  // El lazo vuela un ratito y cae adelante: el que está en la argolla queda enlazado (se puede esquivar)
  throw(g) {
    if (!this.started || g.cd > 0 || this.done) return;
    g.cd = 1.2;
    this.lasso = { x: g.x, z: g.z, ang: g.ang, t: this.t, tx: g.x + Math.sin(g.ang) * REACH, tz: g.z + Math.cos(g.ang) * REACH, landed: false };
  }
  landLasso(L) {
    L.landed = true;
    let best = null, bd = RING;
    for (const r of this.runners) {
      if (r.caught) continue;
      const d = Math.hypot(r.x - L.tx, r.z - L.tz);
      if (d < bd) { bd = d; best = r; }
    }
    const g = this.get(this.gaucho);
    if (best) {
      best.caught = true; best.caughtAt = this.t; best.survived = this.tt;
      L.hit = best.id;
      this.event(g.id, '¡ENLAZADO!', 'gold');
      this.event(best.id, '¡Me agarró!', 'bad');
      this.cue(best.id, { text: '🪢 ¡Te enlazaron!', buzz: 400 });
      this.cue(g.id, { text: '🤠 ¡Uno menos!', buzz: 100 });
    }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || e.caught) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.13;
    if (e.id === this.gaucho) {
      const free = this.runners.filter((r) => !r.caught);
      if (!free.length) { e.ix = e.iz = 0; return; }
      const t = free.reduce((a, b) => (Math.hypot(a.x - e.x, a.z - e.z) < Math.hypot(b.x - e.x, b.z - e.z) ? a : b));
      const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz) || 1;
      const k = d > REACH ? 1 : d < REACH - 1 ? -0.5 : 0.2;
      e.ix = (dx / d) * k; e.iz = (dz / d) * k;
      if (d < REACH + 1.2 && d > REACH - 1.4 && Math.random() < 0.4) { e.ang = Math.atan2(t.x + t.vx * FLY - e.x, t.z + t.vz * FLY - e.z) + rand(-0.25, 0.25); this.throw(e); }
      return;
    }
    const g = this.get(this.gaucho);
    let fx = -e.x * 0.12, fz = -e.z * 0.12;
    const dx = e.x - g.x, dz = e.z - g.z, d = Math.hypot(dx, dz) || 1;
    fx += (dx / d) * (6 / d); fz += (dz / d) * (6 / d);
    fx += Math.sin(this.t + e.x) * 0.4;
    const L = this.lasso;
    if (L && !L.landed && Math.random() < 0.2) { const ax = e.x - L.tx, az = e.z - L.tz, ad = Math.hypot(ax, az) || 1; if (ad < RING + 1) { fx += (ax / ad) * 4; fz += (az / ad) * 4; } }
    const l = Math.hypot(fx, fz) || 1;
    e.ix = fx / l * rand(0.7, 1); e.iz = fz / l * rand(0.7, 1);
  }
  step(dt) {
    this.t += dt;
    if (!this.started || this.over) { if (this.over && this.t - this.endAt > 1.5) this.done = true; return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt);
      if (e.caught) { e.vx = e.vz = 0; continue; }
      moveEnt(e, dt, { slow: e.id === this.gaucho ? 1.05 : 1 });
      const d = Math.hypot(e.x, e.z);
      if (d > FIELD) { e.x *= FIELD / d; e.z *= FIELD / d; }
    }
    collide(this.ents.filter((e) => !e.caught), 0.7);
    if (this.lasso && !this.lasso.landed && this.t - this.lasso.t >= FLY) this.landLasso(this.lasso);
    if (this.lasso && this.t - this.lasso.t > FLY + 0.5) this.lasso = null;
    const free = this.runners.filter((r) => !r.caught);
    const need = Math.max(1, this.runners.length - 1); // enlazados que necesita el gaucho
    if (this.runners.length - free.length >= need || this.tt >= this.duration) {
      this.over = true; this.endAt = this.t;
      this.win = this.runners.length - free.length >= need ? 0 : 1;
      for (const r of free) r.survived = this.duration;
      for (const e of this.ents) this.cue(e.id, { text: e.team === this.win ? '🎉 ¡Ganaron!' : '😩 Perdieron', buzz: 200 });
    }
  }
  snapshot() {
    const L = this.lasso;
    return {
      ...this.base(), gaucho: this.gaucho,
      lasso: L ? { x: r2(L.x), z: r2(L.z), tx: r2(L.tx), tz: r2(L.tz), hit: L.hit || null, k: r2(Math.min(1, (this.t - L.t) / FLY)), ring: RING } : null,
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), caught: e.caught, g: e.id === this.gaucho,
        st: e.id === this.gaucho ? `🤠 ${this.runners.filter((r) => r.caught).length}/${Math.max(1, this.runners.length - 1)}` : e.caught ? '🪢 Enlazado' : '🏃 Suelto' })),
    };
  }
  winnerTeam() { return this.win ?? null; }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.team === this.win ? 100 + e.survived : e.survived })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Lazo };
