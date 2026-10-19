// La Escondida: uno cuenta con los ojos tapados y después busca con la linterna. Los otros se esconden
// atrás de los arbustos o corren a la piedra para salvarse.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'La Escondida',
  instructions: 'El que está solo cuenta hasta 5 y después busca: lo que ilumina con la linterna, lo encuentra (¡Piedra libre!). Los otros tres se esconden atrás de los arbustos, o tocan la piedra del medio para salvarse. Si el que busca encuentra a dos, gana.',
  control: 'joystick',
  modes: ['1v3'],
};

const FIELD = 9, COUNT = 5, RANGE = 5, CONE = 0.42, BASE = 1.3, BUSH = 1.25;

class Escondida extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 30 + COUNT;
    this.teams = teams;
    this.seeker = teams[0][0];
    this.bushes = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rand(-0.2, 0.2), d = rand(4.5, 7.5);
      this.bushes.push({ x: Math.cos(a) * d, z: Math.sin(a) * d });
    }
    this.ents = players.map((p, i) => {
      const s = p.id === this.seeker, a = (i / this.n) * Math.PI * 2;
      return { id: p.id, team: s ? 0 : 1, x: s ? 0 : Math.cos(a) * 1.8, z: s ? 0 : Math.sin(a) * 1.8, vx: 0, vz: 0, ix: 0, iz: 0, ang: Math.PI, state: 'free', at: 0, botT: 0, goal: null, brave: rand(0, 1) };
    });
  }
  get counting() { return this.tt < COUNT; }
  get hiders() { return this.ents.filter((e) => e.team === 1); }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  // ¿El arbusto tapa a este escondido desde donde está el que busca?
  covered(s, h) {
    const dh = Math.hypot(h.x - s.x, h.z - s.z);
    for (const b of this.bushes) {
      const db = Math.hypot(b.x - s.x, b.z - s.z);
      if (db >= dh || Math.hypot(b.x - h.x, b.z - h.z) > BUSH + 0.6) continue;
      // Distancia del arbusto a la línea entre los dos
      const ux = (h.x - s.x) / dh, uz = (h.z - s.z) / dh;
      const px = b.x - s.x, pz = b.z - s.z;
      if (Math.abs(px * uz - pz * ux) < BUSH) return true;
    }
    return false;
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || e.state !== 'free') return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    const s = this.get(this.seeker);
    if (e.id === this.seeker) {
      if (this.counting) { e.ix = e.iz = 0; return; }
      // Recorre los arbustos uno por uno
      // Va de arbusto en arbusto y le da la vuelta a cada uno
      if (!e.bushT || this.t > e.bushT) { e.bush = this.bushes[Math.floor(Math.random() * this.bushes.length)]; e.bushT = this.t + rand(2.5, 4); e.spin = Math.random() < 0.5 ? 1 : -1; }
      const a = Math.atan2(e.x - e.bush.x, e.z - e.bush.z) + e.spin * 0.9;
      e.goal = { x: e.bush.x + Math.sin(a) * 2.3, z: e.bush.z + Math.cos(a) * 2.3 };
      const free = this.hiders.filter((h) => h.state === 'free');
      const near = free.find((h) => Math.hypot(h.x - e.x, h.z - e.z) < 4 && !this.covered(e, h));
      const g = near || e.goal;
      const dx = g.x - e.x, dz = g.z - e.z, d = Math.hypot(dx, dz) || 1;
      e.ix = dx / d; e.iz = dz / d;
      return;
    }
    // Escondido: si el que busca está lejos de la piedra, a veces corre a salvarse
    const sd = Math.hypot(s.x, s.z);
    let gx, gz;
    if (!this.counting && sd > 6.5 && Math.hypot(e.x, e.z) < sd - 1 && e.brave > 0.6) { gx = 0; gz = 0; }
    else {
      // Se queda en su arbusto, siempre del otro lado del que busca; si se le acerca mucho, se cambia de arbusto
      let best = e.bush;
      if (!best || Math.hypot(best.x - s.x, best.z - s.z) < 2.2) {
        let bs = -1e9;
        for (const b of this.bushes) {
          const away = Math.hypot(b.x - s.x, b.z - s.z) - Math.hypot(b.x - e.x, b.z - e.z) * 0.6;
          if (away > bs) { bs = away; best = b; }
        }
        e.bush = best;
      }
      const ax = best.x - s.x, az = best.z - s.z, ad = Math.hypot(ax, az) || 1;
      gx = best.x + (ax / ad) * 1.1; gz = best.z + (az / ad) * 1.1;
    }
    const dx = gx - e.x, dz = gz - e.z, d = Math.hypot(dx, dz);
    e.ix = d > 0.3 ? dx / d : 0; e.iz = d > 0.3 ? dz / d : 0;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    const s = this.get(this.seeker);
    for (const e of this.ents) {
      if (e.state !== 'free' || (e === s && this.counting)) { e.vx = e.vz = 0; continue; }
      moveEnt(e, dt, { slow: e === s ? 0.95 : 1 });
      const d = Math.hypot(e.x, e.z);
      if (d > FIELD) { e.x *= FIELD / d; e.z *= FIELD / d; }
      for (const b of this.bushes) { // los arbustos no se atraviesan
        const bx = e.x - b.x, bz = e.z - b.z, bd = Math.hypot(bx, bz);
        if (bd < BUSH && bd > 0) { e.x = b.x + (bx / bd) * BUSH; e.z = b.z + (bz / bd) * BUSH; }
      }
    }
    collide(this.ents.filter((e) => e.state === 'free'), 0.6);
    if (this.counting) return;
    if (!this.goSaid) { this.goSaid = true; this.cue(s.id, { text: '🔦 ¡Salgo a buscar!', buzz: 100 }); }
    for (const h of this.hiders) {
      if (h.state !== 'free') continue;
      if (Math.hypot(h.x, h.z) < BASE) {
        h.state = 'safe'; h.at = this.t;
        this.event(h.id, '¡Me salvo!', 'gold');
        this.cue(h.id, { text: '🪨 ¡Te salvaste!', buzz: 120 });
        continue;
      }
      const dx = h.x - s.x, dz = h.z - s.z, d = Math.hypot(dx, dz);
      let da = Math.atan2(dx, dz) - s.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      if ((d < 1.1 || (d < RANGE && Math.abs(da) < CONE)) && !this.covered(s, h)) {
        h.state = 'found'; h.at = this.t;
        this.event(h.id, '¡Piedra libre!', 'bad');
        this.event(s.id, '¡Te vi!', 'gold');
        this.cue(h.id, { text: '🔦 ¡Piedra libre para vos!', buzz: 400 });
      }
    }
    const found = this.hiders.filter((h) => h.state === 'found').length;
    const free = this.hiders.filter((h) => h.state === 'free').length;
    const need = Math.max(1, this.hiders.length - 1);
    if (found >= need || found + free < need || this.tt >= this.duration) {
      this.over = true; this.endAt = this.t; this.win = found >= need ? 0 : 1;
      for (const e of this.ents) this.cue(e.id, { text: e.team === this.win ? '🎉 ¡Ganaron!' : '😩 Perdieron', buzz: 200 });
    }
  }
  snapshot() {
    return {
      ...this.base(), seeker: this.seeker, counting: this.counting, count: Math.max(0, Math.ceil(COUNT - this.tt)), bushes: this.bushes.map((b) => ({ x: r2(b.x), z: r2(b.z) })),
      range: RANGE, cone: CONE,
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), state: e.state,
        st: e.team === 0 ? `🔦 ${this.hiders.filter((h) => h.state === 'found').length}/${Math.max(1, this.hiders.length - 1)}` : e.state === 'found' ? '🔦 Encontrado' : e.state === 'safe' ? '🪨 Salvado' : '🙈 Escondido' })),
    };
  }
  winnerTeam() { return this.win ?? null; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: (e.team === this.win ? 100 : 0) + (e.state === 'safe' ? 10 : e.state === 'free' ? 5 : 0) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Escondida };
