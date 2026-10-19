// Las Vizcachas: nueve cuevas en el campo (como los nueve botones del celu). Las vizcachas asoman la cabeza:
// apretá el número de esa cueva antes que los demás. La dorada vale 3; si asoma un zorrino, ¡no lo toques!
const { Minigame, rand, pick } = require('./common');

const meta = {
  title: 'Las Vizcachas',
  instructions: 'Hay nueve cuevas, igual que los nueve botones del celu. Cuando una vizcacha asoma, apretá el botón de esa cueva: el primero que la toca se la lleva (1 punto; la dorada, 3). Si asoma un zorrino, no lo toques (-2). Si apretás una cueva vacía, perdés un ratito.',
  control: 'buttons',
  buttons: Array.from({ length: 9 }, (_, i) => ({ id: String(i), label: String(i + 1) })),
  layout: 'grid3',
  modes: ['ffa', 'duel'],
  board: 'norte',
};

class Vizcachas extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 32;
    this.pops = []; this.pId = 0; this.next = 3 + 0.8;
    this.ents = players.map((p) => ({ id: p.id, pts: 0, hits: 0, lockT: -9, react: rand(0.45, 0.8), acc: rand(0.82, 0.93), plan: new Map() }));
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action') this.whack(e, +m.b); }
  whack(e, hole) {
    if (!this.started || this.done || this.t - e.lockT < 0.5 || !(hole >= 0 && hole < 9)) return;
    const p = this.pops.find((o) => o.hole === hole && !o.by && this.t < o.end);
    if (!p) {
      e.lockT = this.t;
      this.event(e.id, '¡Vacía!', 'bad'); this.cue(e.id, { text: '🕳️ Esa cueva está vacía', buzz: 150 });
      return;
    }
    p.by = e.id; p.hitT = this.t;
    if (p.kind === 'zorrino') {
      e.pts -= 2; e.lockT = this.t + 0.6;
      this.event(e.id, '¡Zorrino! -2', 'bad'); this.cue(e.id, { text: '🦨 ¡Puaj! ¡Era un zorrino! -2', buzz: 400 });
    } else {
      const add = p.kind === 'dorada' ? 3 : 1;
      e.pts += add; e.hits++;
      this.event(e.id, add === 3 ? '¡Dorada! +3' : '+1', add === 3 ? 'gold' : 'good'); this.cue(e.id, { buzz: 30 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started) return;
    for (const p of this.pops) {
      if (p.by || this.t > p.end) continue;
      if (!e.plan.has(p.id)) {
        // Al zorrino a veces lo toca igual (se confunde)
        const skip = p.kind === 'zorrino' && Math.random() < 0.8;
        e.plan.set(p.id, skip ? Infinity : p.start + e.react * rand(0.8, 1.4));
      }
      if (this.t >= e.plan.get(p.id)) { e.plan.set(p.id, Infinity); this.whack(e, Math.random() < e.acc ? p.hole : Math.floor(Math.random() * 9)); }
    }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    this.pops = this.pops.filter((p) => this.t < (p.by ? p.hitT + 0.5 : p.end + 0.3));
    if (this.t >= this.next) {
      this.next = this.t + Math.max(0.35, 0.95 - this.tt * 0.015) * rand(0.7, 1.3);
      const busy = new Set(this.pops.map((p) => p.hole));
      const free = Array.from({ length: 9 }, (_, i) => i).filter((i) => !busy.has(i));
      if (free.length) {
        const r = Math.random(), kind = r < 0.12 ? 'dorada' : r < 0.27 ? 'zorrino' : 'vizcacha';
        const dur = rand(0.9, 1.4) * (kind === 'dorada' ? 0.8 : 1);
        this.pops.push({ id: ++this.pId, hole: pick(free), kind, start: this.t, end: this.t + dur, by: null });
      }
    }
  }
  snapshot() {
    return {
      ...this.base(),
      pops: this.pops.map((p) => ({ id: p.id, hole: p.hole, kind: p.kind, by: p.by, u: Math.min(1, (this.t - p.start) / (p.end - p.start)), gone: this.t > p.end })),
      ents: this.ents.map((e) => ({ id: e.id, pts: e.pts, lock: this.t - e.lockT < 0.5, st: `🐹 ${e.pts}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.pts * 100 + e.hits })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Vizcachas };
