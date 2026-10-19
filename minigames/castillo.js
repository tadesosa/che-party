// Castillo de Arena: con el balde subís el castillo; con la muralla lo protegés de las olas.
// Cuando llega una ola, si no tenés muralla, se te lleva un pedazo.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Castillo de Arena',
  instructions: 'Apretá 🪣 BALDE para hacer más alto tu castillo. Cuando se ve venir una ola, apretá 🛡️ MURALLA para protegerlo (la muralla se gasta con cada ola). Si la ola te agarra sin muralla, se lleva un pedazo. ¡El castillo más alto al final gana!',
  control: 'buttons',
  buttons: [{ id: 'b', label: '🪣 BALDE' }, { id: 'm', label: '🛡️ MURALLA' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

class Castillo extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35;
    this.wave = { phase: 'calm', until: 3 + rand(4, 6) };
    this.ents = players.map((p) => ({ id: p.id, h: 0, wall: false, last: 0, hitT: -9, botNext: 0, botGap: rand(0.17, 0.26), react: rand(0.3, 1.2), lazy: rand(0, 0.3) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action') return;
    if (m.b === 'b') this.bucket(e); else if (m.b === 'm') this.build(e);
  }
  bucket(e) {
    if (!this.started || this.done || this.t - e.last < 0.08) return;
    e.last = this.t;
    e.h += 0.12;
  }
  build(e) {
    if (!this.started || this.done || e.wall) return;
    e.wall = true;
    this.cue(e.id, { text: '🛡️ Muralla lista' });
  }
  bot(id) {
    const e = this.get(id); if (!e || !this.started) return;
    if (this.wave.phase === 'warn' && !e.wall && this.t - this.wave.at > e.react && Math.random() > e.lazy) { this.build(e); return; }
    if (this.t < e.botNext) return;
    e.botNext = this.t + e.botGap * rand(0.8, 1.2);
    this.bucket(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    const w = this.wave;
    if (this.t >= w.until) {
      if (w.phase === 'calm') { w.phase = 'warn'; w.at = this.t; w.until = this.t + rand(1.8, 2.6); this.cue('*', { text: '🌊 ¡Viene una ola!', buzz: [80, 40, 80] }); }
      else if (w.phase === 'warn') {
        w.phase = 'hit'; w.until = this.t + 1;
        for (const e of this.ents) {
          if (e.wall) { e.wall = false; this.event(e.id, '¡Aguantó!', 'good'); continue; }
          const lost = Math.round(e.h * 0.45 * 10) / 10;
          e.h -= lost; e.hitT = this.t;
          this.event(e.id, '¡Se lo llevó la ola!', 'bad');
          this.cue(e.id, { text: '🌊 ¡La ola te rompió el castillo!', buzz: 400 });
        }
      } else { w.phase = 'calm'; w.until = this.t + rand(3, 5.5); }
    }
  }
  snapshot() {
    return {
      ...this.base(), wave: this.wave.phase,
      ents: this.ents.map((e) => ({ id: e.id, h: r2(e.h), wall: e.wall, hit: this.t - e.hitT < 1, st: `🏰 ${e.h.toFixed(1)}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: r2(e.h) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Castillo };
