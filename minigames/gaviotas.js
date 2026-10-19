// Gaviotas Ladronas: cada uno está sentado en su lona con un sánguche. Las gaviotas vienen por la izquierda,
// por el mar (de frente) o por la derecha: cuando están cerca, apretás el botón de ese lado para espantarlas.
// Todos reciben las mismas gaviotas al mismo tiempo, así es justo.
const { Minigame, rand, pick } = require('./common');

const meta = {
  title: 'Gaviotas Ladronas',
  instructions: 'Estás en tu lona con un sánguche de milanesa y las gaviotas vienen a robártelo: por la izquierda, por el mar (de frente) o por la derecha. Una flecha te avisa por dónde viene cada una. Cuando la flecha se pone VERDE, apretá ese botón para espantarla. Si te apurás o le errás al lado, te quedás quieto un ratito. ¡Gana el que termina con más sánguche!',
  control: 'buttons',
  buttons: [{ id: 'left', label: '⬅️' }, { id: 'up', label: '⬆️ MAR' }, { id: 'right', label: '➡️' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
  board: 'costa',
};

const BITES = 8, FLY = 2.6, ZONE = 1.3, STUN = 0.5;
const DIRS = ['left', 'up', 'right'];

class Gaviotas extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    // Las mismas gaviotas para todos: cada una sale en t0 y llega a la lona en t0 + FLY
    this.plan = [];
    let t = 3 + 1.2, id = 0;
    while (t < 3 + this.duration - FLY) {
      const tt = t - 3;
      const dir = pick(DIRS);
      this.plan.push({ id: ++id, dir, t0: t });
      // Más adelante a veces vienen de a dos, por lados distintos
      if (tt > 14 && Math.random() < Math.min(0.45, (tt - 14) * 0.03)) this.plan.push({ id: ++id, dir: pick(DIRS.filter((d) => d !== dir)), t0: t + rand(0.15, 0.5) });
      t += Math.max(0.9, 2 - tt * 0.03) * rand(0.85, 1.15);
    }
    this.ents = players.map((p) => ({ id: p.id, bites: BITES, scared: 0, stun: 0, gone: new Map(), botAt: new Map(), botSkill: rand(0.8, 0.92) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action' && DIRS.includes(m.b)) this.shoo(e, m.b);
  }
  // Gaviotas de este jugador que siguen volando, de la más próxima a la más lejana
  flying(e) { return this.plan.filter((g) => this.t >= g.t0 && !e.gone.has(g.id)).sort((a, b) => a.t0 - b.t0); }
  shoo(e, dir) {
    if (!this.started || this.done || this.t < e.stun || !e.bites) return;
    const g = this.flying(e).find((o) => o.dir === dir && this.t >= o.t0 + FLY - ZONE);
    if (g) {
      e.gone.set(g.id, 'flee'); e.scared++;
      this.event(e.id, '¡Fuera!', 'good');
      this.cue(e.id, { buzz: 40 });
      return;
    }
    e.stun = this.t + STUN;
    const early = this.flying(e).some((o) => o.dir === dir);
    this.event(e.id, early ? '¡Muy temprano!' : '¡Para el otro lado!', 'bad');
    this.cue(e.id, { text: early ? '⏳ ¡Esperá que se acerque!' : '🙃 ¡No venía por ahí!', buzz: 150 });
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || this.t < e.stun) return;
    for (const g of this.flying(e)) {
      if (this.t < g.t0 + FLY - ZONE) continue;
      if (!e.botAt.has(g.id)) e.botAt.set(g.id, g.t0 + FLY - ZONE + rand(0.15, 0.95));
      if (this.t >= e.botAt.get(g.id)) {
        const ok = Math.random() < e.botSkill;
        e.botAt.set(g.id, Infinity);
        this.shoo(e, ok ? g.dir : pick(DIRS.filter((d) => d !== g.dir)));
        return;
      }
    }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      for (const g of this.flying(e)) {
        if (this.t < g.t0 + FLY) continue;
        e.gone.set(g.id, 'ate');
        if (e.bites > 0) {
          e.bites--;
          this.event(e.id, '¡Mordisco!', 'bad');
          this.cue(e.id, { text: e.bites ? `🐦 ¡Te robaron! Te quedan ${e.bites}` : '🐦 ¡Se comieron todo!', buzz: 300 });
        }
      }
    }
  }
  snapshot() {
    return {
      ...this.base(), bites: BITES,
      ents: this.ents.map((e) => ({
        id: e.id, bites: e.bites, stun: this.t < e.stun,
        // Cada gaviota: lado, cuánto avanzó (0 a 1), si ya se puede espantar, y si se fue (huyendo o con el mordisco)
        gulls: this.plan.filter((g) => this.t >= g.t0 && (!e.gone.has(g.id) || this.t < g.t0 + FLY + 1.6)).map((g) => ({
          id: g.id, dir: g.dir, p: Math.min(1, (this.t - g.t0) / FLY), zone: this.t >= g.t0 + FLY - ZONE, gone: e.gone.get(g.id) || null,
        })),
        st: `🥪 ${e.bites}/${BITES}`,
      })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.bites * 100 + e.scared })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Gaviotas };
