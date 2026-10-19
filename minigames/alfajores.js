// Lluvia de Alfajores: agarrá alfajores, esquivá la chancleta de la abuela.
const { Minigame, clamp, num, r2 } = require('./common');

const meta = {
  title: 'Lluvia de Alfajores',
  instructions: 'Movete a los costados para agarrar alfajores (+1, el dorado +3). ¡Esquivá la chancleta de la abuela!',
  control: 'lr',
};

class Alfajores extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 30; this.W = 8.5;
    this.items = []; this.nextItem = 0; this.spawnT = 0;
    const n = this.n;
    this.ents = players.map((p, i) => ({ id: p.id, x: n === 1 ? 0 : -6 + (12 * i) / (n - 1), ix: 0, score: 0, stun: 0, botT: 0 }));
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'input') e.ix = clamp(num(m.x), -1, 1);
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.12 + Math.random() * 0.1;
    let best = null, bs = -1e9;
    for (const it of this.items) {
      if (it.y < 0.5 || it.k === 'chancla') continue;
      const tReach = Math.abs(it.x - e.x) / 9.5, tFall = (it.y - 1) / -it.vy;
      if (tReach > tFall + 0.1) continue;
      const s = (it.k === 'dorado' ? 3 : 1) - tFall * 0.5;
      if (s > bs) { bs = s; best = it; }
    }
    let target = best ? best.x : e.x;
    for (const it of this.items) {
      if (it.k === 'chancla' && it.y < 5 && Math.abs(it.x - e.x) < 1.6) target = e.x + (e.x > it.x ? 3 : -3);
    }
    const d = target - e.x;
    e.ix = Math.abs(d) < 0.3 ? 0 : Math.sign(d) * Math.min(1, Math.abs(d) / 1.5);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    const tt = this.tt;
    if (tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      e.stun = Math.max(0, e.stun - dt);
      if (e.stun > 0) continue;
      e.x = clamp(e.x + e.ix * 9.5 * dt, -this.W, this.W);
    }
    if ((this.spawnT -= dt) <= 0) {
      // Llueve más rápido a medida que pasa el tiempo
      this.spawnT = Math.max(0.16, 0.42 - tt * 0.008) * (0.5 + 0.6 / Math.max(1, this.n / 2));
      const r = Math.random();
      const k = r < 0.22 ? 'chancla' : r < 0.28 ? 'dorado' : 'alfajor';
      this.items.push({ id: this.nextItem++, x: (Math.random() * 2 - 1) * this.W, y: 12, vy: -(4.5 + Math.random() * 3 + tt * 0.08), k });
    }
    for (const it of this.items) {
      it.y += it.vy * dt;
      if (it.y < 1.8 && it.y > 0.3 && !it.gone) {
        for (const e of this.ents) {
          if (Math.abs(it.x - e.x) >= 1.05) continue;
          if (it.k === 'chancla') {
            if (e.stun > 0) continue;
            e.score = Math.max(0, e.score - 2); e.stun = 1.3;
            this.event(e.id, '¡CHANCLAZO! -2', 'bad');
            this.cue(e.id, { buzz: 250 });
          } else {
            const d = it.k === 'dorado' ? 3 : 1;
            e.score += d;
            this.event(e.id, '+' + d, d > 1 ? 'gold' : 'good');
            this.cue(e.id, { buzz: 20 });
          }
          it.gone = true;
          break;
        }
      }
    }
    this.items = this.items.filter((it) => !it.gone && it.y > -1);
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), stun: e.stun > 0, moving: Math.abs(e.ix) > 0.1 ? Math.sign(e.ix) : 0, st: `🍪 ${e.score}` })),
      items: this.items.map((it) => ({ id: it.id, x: r2(it.x), y: r2(it.y), k: it.k })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Alfajores };
