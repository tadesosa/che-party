// Subí al Aconcagua: apretá rápido para trepar, pero cuidá el aire: si se te acaba, te resbalás.
// En los refugios podés soltar y recuperar aire. Cuando avisan avalancha, más vale estar en un refugio.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Subí al Aconcagua',
  instructions: 'Apretá el botón para trepar. Cada toque gasta aire: si se te acaba, te resbalás. En los refugios (las carpas) podés dejar de apretar y recuperás aire. Cuando avisan ¡AVALANCHA!, si no estás en un refugio, bajás hasta el anterior. ¡El primero en la cumbre gana!',
  control: 'mash',
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

const TOP = 100, CAMPS = [20, 40, 60, 80], STEP = 0.75;

class Aconcagua extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 50; this.order = [];
    this.aval = { phase: 'none', until: 3 + rand(7, 11) };
    this.ents = players.map((p) => ({ id: p.id, h: 0, air: 1, last: 0, slipT: -9, fin: 0, acc: 0, rate: rand(6, 8), resting: false, greedy: rand(0, 1) }));
  }
  camp(h) { return CAMPS.find((c) => Math.abs(h - c) < 1.6) ?? (h < 1 ? 0 : null); }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'mash' || this.t - e.last < 0.05) return;
    e.last = this.t; this.climb(e);
  }
  climb(e) {
    if (!this.started || e.fin || this.done || this.t - e.slipT < 1) return;
    e.air -= 0.034;
    if (e.air <= 0) {
      // Sin aire: se resbala un poco
      e.air = 0.35; e.slipT = this.t; e.h = Math.max(0, e.h - 6);
      this.event(e.id, '¡Sin aire!', 'bad');
      this.cue(e.id, { text: '🥵 ¡Te quedaste sin aire! Descansá en las carpas', buzz: 350 });
      return;
    }
    e.h = Math.min(TOP, e.h + STEP);
    if (e.h >= TOP) {
      this.order.push(e.id); e.fin = this.order.length;
      this.event(e.id, e.fin === 1 ? '¡HIZO CUMBRE!' : `¡${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
      this.cue(e.id, { text: `🏔️ ¡Hiciste cumbre ${e.fin}°!`, buzz: 200 });
    }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || !this.started || e.fin) return;
    const c = this.camp(e.h);
    // En un refugio descansa si le falta aire o si viene una avalancha
    if (c != null && (e.air < 0.75 + e.greedy * 0.15 || this.aval.phase === 'warn')) { e.resting = e.air < 0.98 || this.aval.phase !== 'none'; if (e.resting) return; }
    if (this.aval.phase === 'warn' && e.greedy < 0.6) { const next = CAMPS.find((x) => x > e.h); if (!next || next - e.h > 4) return; }
    e.acc += dt * e.rate * rand(0.8, 1.2);
    while (e.acc >= 1) { e.acc--; this.climb(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    for (const e of this.ents) {
      // Recupera aire de a poco; en los refugios, rápido
      const resting = this.t - e.last > 0.35;
      if (resting) e.air = Math.min(1, e.air + dt * (this.camp(e.h) != null ? 0.45 : 0.07));
    }
    const a = this.aval;
    if (this.t >= a.until) {
      if (a.phase === 'none') { a.phase = 'warn'; a.until = this.t + 2.2; this.cue('*', { text: '⚠️ ¡AVALANCHA! Andá a un refugio', buzz: [100, 50, 100, 50, 100] }); }
      else if (a.phase === 'warn') {
        a.phase = 'hit'; a.until = this.t + 1.2;
        for (const e of this.ents) {
          if (e.fin || this.camp(e.h) != null) continue;
          const prev = [0, ...CAMPS].filter((c) => c < e.h).pop() || 0;
          e.h = prev; e.slipT = this.t;
          this.event(e.id, '¡Avalancha!', 'bad');
        }
      } else { a.phase = 'none'; a.until = this.t + rand(8, 12); }
    }
    if (this.ents.every((e) => e.fin) || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1) this.done = true;
    }
  }
  snapshot() {
    return {
      ...this.base(), top: TOP, camps: CAMPS, aval: this.aval.phase,
      ents: this.ents.map((e) => ({ id: e.id, h: r2(e.h), air: r2(e.air), slip: this.t - e.slipT < 1, fin: e.fin, st: e.fin ? `🏔️ ${e.fin}°` : `⛰️ ${Math.round(e.h)}% · 💨${Math.round(e.air * 100)}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.h })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Aconcagua };
