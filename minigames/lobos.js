// Lobos Marinos: uno es el lobo marino del puerto y quiere robar pescados de los baldes de los pescadores.
// Los tres pescadores cuidan los baldes y espantan al lobo empujándolo.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Lobos Marinos',
  instructions: 'El que está solo es el lobo marino: acercate a un balde y quedate un ratito para robar un pescado. Los otros tres son pescadores: con ESPANTAR empujan al lobo lejos. Si el lobo junta 5 pescados, gana; si no llega, ganan los pescadores.',
  control: 'joystick',
  action: '💨 ¡ESPANTAR!',
  modes: ['1v3'],
  board: 'costa',
};

const FIELD = 8.5, GOAL = 5, EAT = 0.78;

class Lobos extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 40;
    this.lobo = teams[0][0];
    this.buckets = [];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; this.buckets.push({ x: r2(Math.cos(a) * 5.5), z: r2(Math.sin(a) * 5), fish: 3 }); }
    this.stolen = 0;
    this.ents = players.map((p, i) => {
      const l = p.id === this.lobo, a = (i / this.n) * Math.PI * 2;
      return { id: p.id, team: l ? 0 : 1, x: l ? 0 : Math.cos(a) * 3, z: l ? -8 : Math.sin(a) * 3, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, cd: 0, dashT: 0, stun: 0, eat: 0, botT: 0 };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action' && e.team === 1) this.shoo(e);
  }
  shoo(e) {
    if (!this.started || e.cd > 0 || this.over) return;
    e.cd = 1.4; e.dashT = 0.3;
    e.vx += Math.sin(e.ang) * 13; e.vz += Math.cos(e.ang) * 13;
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.13;
    const L = this.get(this.lobo);
    if (e.id === this.lobo) {
      // Va al balde con pescados que tenga menos pescadores cerca
      let best = null, bs = -1e9;
      for (const b of this.buckets) {
        if (!b.fish) continue;
        const guards = this.ents.filter((o) => o.team === 1 && Math.hypot(o.x - b.x, o.z - b.z) < 2.5).length;
        const sc = -Math.hypot(b.x - e.x, b.z - e.z) * 0.4 - guards * 3 + Math.random();
        if (sc > bs) { bs = sc; best = b; }
      }
      if (!best) { e.ix = e.iz = 0; return; }
      const dx = best.x - e.x, dz = best.z - e.z, d = Math.hypot(dx, dz) || 1;
      e.ix = d > 0.6 ? dx / d : 0; e.iz = d > 0.6 ? dz / d : 0;
      return;
    }
    // Pescador: persigue al lobo si está cerca de un balde; si no, cuida el balde más cercano
    const near = this.buckets.some((b) => b.fish && Math.hypot(b.x - L.x, b.z - L.z) < 3);
    const tx = near ? L.x : this.buckets.reduce((a, b) => (Math.hypot(b.x - e.x, b.z - e.z) < Math.hypot(a.x - e.x, a.z - e.z) ? b : a)).x;
    const tz = near ? L.z : this.buckets.reduce((a, b) => (Math.hypot(b.x - e.x, b.z - e.z) < Math.hypot(a.x - e.x, a.z - e.z) ? b : a)).z;
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d * rand(0.7, 1); e.iz = dz / d * rand(0.7, 1);
    if (near && d < 2 && Math.random() < 0.3) { e.ang = Math.atan2(dx, dz); this.shoo(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    const L = this.get(this.lobo);
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt); e.dashT = Math.max(0, e.dashT - dt);
      if (e.stun > 0) { e.stun -= dt; e.vx *= 0.92; e.vz *= 0.92; e.x += e.vx * dt; e.z += e.vz * dt; }
      else moveEnt(e, dt, { slow: e === L ? 1.15 : 0.95 });
      e.x = Math.max(-FIELD, Math.min(FIELD, e.x)); e.z = Math.max(-FIELD, Math.min(FIELD, e.z));
    }
    // Un pescador embistiendo empuja lejos al lobo
    for (const e of this.ents) {
      if (e.team !== 1 || e.dashT <= 0 || L.stun > 0 || Math.hypot(e.x - L.x, e.z - L.z) > 1.4) continue;
      const dx = L.x - e.x, dz = L.z - e.z, d = Math.hypot(dx, dz) || 1;
      L.vx = (dx / d) * 12; L.vz = (dz / d) * 12; L.stun = 0.5; L.eat = 0;
      this.event(e.id, '¡Fuera!', 'good');
      this.cue(L.id, { text: '💨 ¡Te espantaron!', buzz: 250 });
    }
    collide(this.ents, 0.6);
    // El lobo come si se queda quieto al lado de un balde con pescados
    const b = this.buckets.find((b) => b.fish && Math.hypot(b.x - L.x, b.z - L.z) < 1.2);
    if (b && L.stun <= 0) {
      L.eat += dt;
      if (L.eat >= EAT) {
        L.eat = 0; b.fish--; this.stolen++;
        this.event(L.id, `¡Ñam! ${this.stolen}/${GOAL}`, 'gold');
      }
    } else L.eat = Math.max(0, L.eat - dt * 2);
    if (this.stolen >= GOAL || this.tt >= this.duration) {
      this.over = true; this.endAt = this.t; this.win = this.stolen >= GOAL ? 0 : 1;
      for (const e of this.ents) this.cue(e.id, { text: e.team === this.win ? '🎉 ¡Ganaron!' : '😩 Perdieron', buzz: 200 });
    }
  }
  snapshot() {
    return {
      ...this.base(), lobo: this.lobo, buckets: this.buckets.map((b) => ({ x: b.x, z: b.z, fish: b.fish })), stolen: this.stolen, goal: GOAL,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), dash: e.dashT > 0, stun: e.stun > 0, eat: r2(e.eat / EAT),
        st: e.team === 0 ? `🦭 ${this.stolen}/${GOAL}` : `🎣 ${this.buckets.reduce((a, b) => a + b.fish, 0)} 🐟` })),
    };
  }
  winnerTeam() { return this.win ?? null; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.team === this.win ? 1 : 0 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Lobos };
