// Barrenador: arriba de la tabla, la ola te inclina para un lado y para el otro. Mantené el equilibrio con ◀ ▶.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Barrenador',
  instructions: 'Estás arriba de la tabla y la ola te va inclinando. Mantené apretado ◀ o ▶ para enderezarte (para el lado contrario de donde te caés). Si te inclinás demasiado, te caés y tenés que nadar de vuelta. ¡El que surfea más metros gana!',
  control: 'lr',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

const LIMIT = 1;

class Barrenador extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 30;
    this.ents = players.map((p) => ({ id: p.id, tilt: 0, vt: 0, x: 0, dist: 0, fallT: -9, push: rand(-1, 1), pushT: 0, react: rand(0.12, 0.3), botSeen: 0 }));
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'input') e.x = clamp(num(m.x), -1, 1); }
  bot(id, dt) {
    const e = this.get(id); if (!e || !this.started) return;
    // Corrige mirando cómo estaba hace un ratito (reacción) y con algo de torpeza
    e.botSeen += (e.tilt + e.vt * 0.3 - e.botSeen) * Math.min(1, dt / e.react);
    e.x = clamp(-e.botSeen * 2.2 + rand(-0.3, 0.3), -1, 1);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    const level = 1 + this.tt / 15;
    for (const e of this.ents) {
      if (this.t - e.fallT < 2) continue; // nadando de vuelta
      // La ola empuja con fuerza que cambia cada tanto, y cuanto más inclinado más se cae (inestable)
      if ((e.pushT -= dt) <= 0) { e.push = rand(-1, 1) * level; e.pushT = rand(0.6, 1.4); }
      e.vt += (e.push * 0.9 + e.tilt * 1.6 - e.x * 2.4) * dt;
      e.vt *= Math.exp(-1.2 * dt);
      e.tilt += e.vt * dt;
      if (Math.abs(e.tilt) > LIMIT) {
        e.fallT = this.t; e.tilt = 0; e.vt = 0;
        this.event(e.id, '¡Al agua!', 'bad');
        this.cue(e.id, { text: '🌊 ¡Te caíste! Nadando de vuelta…', buzz: 400 });
        continue;
      }
      e.dist += dt * (3 + (1 - Math.abs(e.tilt)) * 2);
    }
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => ({ id: e.id, tilt: r2(e.tilt), dist: r2(e.dist), swim: this.t - e.fallT < 2, st: `🏄 ${Math.round(e.dist)} m` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: Math.round(e.dist) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Barrenador };
