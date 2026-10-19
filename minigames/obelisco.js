// Subí al Obelisco: trepás alternando ◀ y ▶. Desde arriba caen cosas por un lado:
// el último botón que apretaste dice de qué lado estás, así que esquivás cambiando el ritmo.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Subí al Obelisco',
  instructions: 'Trepá alternando ◀ y ▶. ¡Cuidado! Desde arriba caen macetas y palomas por la izquierda o la derecha (se marca antes). El último botón que apretaste dice de qué lado estás: si te va a caer algo, quedate del otro lado. El primero arriba gana.',
  control: 'lr',
  modes: ['ffa', 'duel'],
  board: 'baires',
};

const TOP = 30, STEP = 0.75;

class Obelisco extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40; this.order = [];
    this.drops = []; this.dropId = 0; this.nextDrop = 3 + 2;
    this.ents = players.map((p) => ({ id: p.id, h: 0, side: 0, prevX: 0, lastT: -9, hitT: -9, fin: 0, botNext: 0, botGap: rand(0.24, 0.32) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'input') return;
    const x = clamp(num(m.x), -1, 1);
    const s = x < -0.5 ? -1 : x > 0.5 ? 1 : 0;
    if (s !== 0 && s !== e.prevX) this.climb(e, s);
    e.prevX = s;
  }
  climb(e, s) {
    if (!this.started || e.fin || this.done || this.t - e.hitT < 0.9) return;
    const alternate = s !== e.side;
    e.side = s;
    if (!alternate || this.t - e.lastT < 0.12) return; // hay que alternar
    e.lastT = this.t;
    e.h = Math.min(TOP, e.h + STEP);
    if (e.h >= TOP) {
      this.order.push(e.id); e.fin = this.order.length;
      this.event(e.id, e.fin === 1 ? '¡LLEGÓ A LA PUNTA!' : `¡${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
      this.cue(e.id, { text: `🗼 ¡Llegaste ${e.fin}°!`, buzz: 200 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || e.fin || this.t < e.botNext) return;
    e.botNext = this.t + e.botGap * rand(0.85, 1.2);
    // Si viene algo de su lado y está cerca, se queda del otro lado (a veces no se da cuenta)
    const danger = this.drops.find((d) => d.for === e.id && d.y - e.h < 4 && d.y > e.h - 0.5);
    if (danger && Math.random() < 0.7) { if (e.side === danger.side) this.climb(e, -danger.side); return; }
    this.climb(e, e.side === 1 ? -1 : 1);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.ents.every((e) => e.fin) || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1) this.done = true;
      return;
    }
    // Cada tanto cae algo sobre cada trepador, con aviso
    if (this.t >= this.nextDrop) {
      this.nextDrop = this.t + rand(1.2, 2.2);
      for (const e of this.ents) {
        if (e.fin || Math.random() < 0.35) continue;
        this.drops.push({ id: ++this.dropId, for: e.id, side: Math.random() < 0.5 ? -1 : 1, y: e.h + 9, kind: Math.random() < 0.5 ? 'maceta' : 'paloma' });
      }
    }
    for (const d of this.drops) {
      d.y -= 7.5 * dt;
      const e = this.get(d.for);
      if (!d.hit && d.y <= e.h + 1 && d.y > e.h - 0.5) {
        d.hit = true;
        if (e.side === d.side && !e.fin) {
          e.h = Math.max(0, e.h - 3); e.hitT = this.t;
          this.event(e.id, d.kind === 'maceta' ? '¡Macetazo!' : '¡Paloma!', 'bad');
          this.cue(e.id, { text: '🤕 ¡Te pegó! Bajaste un poco', buzz: 350 });
        }
      }
    }
    this.drops = this.drops.filter((d) => d.y > -2 && d.y > this.get(d.for).h - 3);
  }
  snapshot() {
    return {
      ...this.base(), top: TOP,
      drops: this.drops.map((d) => ({ id: d.id, for: d.for, side: d.side, y: r2(d.y), kind: d.kind })),
      ents: this.ents.map((e) => ({ id: e.id, h: r2(e.h), side: e.side, hit: this.t - e.hitT < 0.9, fin: e.fin, st: e.fin ? `🗼 ${e.fin}°` : `🧗 ${Math.round((e.h / TOP) * 100)}%` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.h })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Obelisco };
