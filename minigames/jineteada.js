// Jineteada (Festival de Jesús María): cada uno arriba de un potro que corcovea. Antes de cada corcoveo aparece
// una flecha: apretá esa flecha a tiempo para aguantar. Si le errás o llegás tarde, perdés agarre; a la tercera, al piso.
const { Minigame, rand, pick } = require('./common');

const DIRS = ['up', 'down', 'left', 'right'];
const ARROW = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };

const meta = {
  title: 'Jineteada',
  instructions: 'Estás arriba de un potro en el Festival de Jesús María. Cada vez que va a corcovear, aparece una flecha arriba tuyo: apretá esa flecha en el celu antes de que salte. Si te equivocás o llegás tarde, perdés agarre (tenés 3). ¡Cada vez corcovea más rápido! Gana el que más aguanta arriba.',
  control: 'buttons',
  buttons: DIRS.map((d) => ({ id: d, label: ARROW[d] })),
  layout: 'cross',
  modes: ['ffa', 'duel'],
  board: 'cordoba',
};

class Jineteada extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 45;
    // Todos los potros corcovean al mismo tiempo y para el mismo lado (así es justo)
    this.bucks = []; let t = 3 + 1.2, k = 0;
    while (t < 3 + this.duration) { const gap = Math.max(0.62, 1.5 - k * 0.035); this.bucks.push({ at: t + gap, dir: pick(DIRS), shown: t }); t += gap; k++; }
    this.ents = players.map((p) => ({ id: p.id, grip: 3, ok: 0, idx: 0, answered: false, out: 0, buckT: -9, slipT: -9, react: rand(0.32, 0.6), acc: rand(0.86, 0.95), botAt: null }));
    this.outs = 0;
  }
  current(e) { return this.bucks[e.idx]; }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action' && DIRS.includes(m.b)) this.press(e, m.b); }
  press(e, d) {
    if (!this.started || this.done || e.out) return;
    const b = this.current(e);
    if (!b || e.answered || this.t < b.shown) return;
    e.answered = true;
    if (d === b.dir) { e.ok++; this.cue(e.id, { buzz: 25 }); }
    else this.slip(e, '¡Para el otro lado!');
  }
  slip(e, why) {
    e.grip--; e.slipT = this.t;
    this.event(e.id, why, 'bad');
    if (e.grip <= 0) {
      e.out = ++this.outs; e.outT = this.t;
      this.event(e.id, '¡AL PISO!', 'bad');
      this.cue(e.id, { text: '🐴 ¡Te tiró el potro!', buzz: 500 });
    } else this.cue(e.id, { text: `😬 ¡Casi te caés! Agarre: ${e.grip}`, buzz: 250 });
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || e.out) return;
    const b = this.current(e);
    if (!b || e.answered || this.t < b.shown) return;
    if (e.botFor !== e.idx) { e.botFor = e.idx; e.botAt = b.shown + e.react * rand(0.8, 1.4); }
    if (this.t >= e.botAt) { e.botAt = Infinity; this.press(e, Math.random() < e.acc ? b.dir : pick(DIRS.filter((x) => x !== b.dir))); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    // Termina cuando se acaba el tiempo, cuando se cayeron todos, o cuando queda uno solo arriba
    const alive = this.ents.filter((e) => !e.out);
    const lastFall = Math.max(0, ...this.ents.map((e) => e.outT || 0));
    const lastStanding = this.n > 1 && alive.length === 1 && this.t - lastFall > 2.5;
    if (this.tt >= this.duration || !alive.length || lastStanding) {
      this.endT = this.endT ?? this.t; if (this.t - this.endT > 1) this.done = true; return;
    }
    for (const e of this.ents) {
      if (e.out) continue;
      const b = this.current(e);
      if (b && this.t >= b.at) {
        // Corcoveó: si no contestaste, perdés agarre
        e.buckT = this.t;
        if (!e.answered) this.slip(e, '¡Tarde!');
        e.idx++; e.answered = false;
      }
    }
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => {
        const b = this.current(e);
        return { id: e.id, grip: e.grip, out: e.out, ok: e.ok, buck: this.t - e.buckT < 0.45, slip: this.t - e.slipT < 0.6,
          arrow: !e.out && b && !e.answered && this.t >= b.shown ? b.dir : null, u: b ? Math.min(1, (this.t - b.shown) / (b.at - b.shown)) : 0,
          st: e.out ? '🐴 al piso' : `🤠 ${e.ok} · ${'❤️'.repeat(e.grip)}` };
      }),
    };
  }
  // Gana el que aguantó más corcoveos; si se cayeron, el que se cayó último
  ranking() { return this.ents.map((e) => ({ id: e.id, score: (e.out ? e.out * 1000 : 100000) + e.ok })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Jineteada };
