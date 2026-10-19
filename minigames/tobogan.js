// Tobogán Pingüino: cada uno baja de panza por su tobogán de hielo, solo. Vienen grietas y lobos marinos:
// apretá SALTAR para pasarlos por arriba. Si te chocás, te frenás. El que llega más lejos gana.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Tobogán Pingüino',
  instructions: 'Bajás de panza por un tobogán de hielo, solo y cada vez más rápido. Cuando venga una grieta o un lobo marino, apretá SALTAR para pasarlo por arriba (no saltes muy temprano, que caés encima). Si te chocás, te frenás. ¡Gana el que llega más lejos!',
  control: 'buttons',
  buttons: [{ id: 'jump', label: '🐧 ¡SALTAR!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
  board: 'sur',
};

const JUMP = 0.62;

class Tobogan extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 32;
    // Obstáculos iguales para todos
    this.obs = []; let x = 16;
    while (x < 600) { this.obs.push({ x, kind: Math.random() < 0.55 ? 'grieta' : 'lobo' }); x += rand(7, 15); }
    this.ents = players.map((p) => ({ id: p.id, x: 0, v: 6, jumpT: -9, hitT: -9, hits: 0, next: 0, react: rand(0.12, 0.3), botDist: null }));
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action') this.jump(e); }
  jump(e) {
    if (!this.started || this.done || this.t - e.jumpT < JUMP + 0.08) return;
    e.jumpT = this.t;
  }
  air(e) { return this.t - e.jumpT < JUMP; }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started) return;
    const o = this.obs[e.next];
    if (!o) return;
    if (e.botDist == null || e.botFor !== e.next) { e.botFor = e.next; e.botDist = e.v * (JUMP * 0.5 + rand(-0.12, 0.16)) + 0.4; }
    if (o.x - e.x < e.botDist && !this.air(e)) this.jump(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const e of this.ents) {
      const stunned = this.t - e.hitT < 0.9;
      e.v = stunned ? 2 : Math.min(17, e.v + dt * 0.45);
      e.x += e.v * dt;
      const o = this.obs[e.next];
      if (o && e.x >= o.x - 0.3) {
        if (e.x <= o.x + 0.6 && !this.air(e)) {
          e.hitT = this.t; e.hits++; e.v = 2;
          this.event(e.id, o.kind === 'grieta' ? '¡Grieta!' : '¡Lobo marino!', 'bad');
          this.cue(e.id, { text: o.kind === 'grieta' ? '🧊 ¡Te caíste en la grieta!' : '🦭 ¡Te chocaste un lobo marino!', buzz: 300 });
          e.next++;
        } else if (e.x > o.x + 0.6) e.next++;
      }
    }
  }
  snapshot() {
    const min = Math.min(...this.ents.map((e) => e.x)) - 8, max = Math.max(...this.ents.map((e) => e.x)) + 45;
    return {
      ...this.base(), obs: this.obs.filter((o) => o.x > min && o.x < max).map((o) => ({ x: o.x, kind: o.kind })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), air: this.air(e), jt: r2((this.t - e.jumpT) / JUMP), hit: this.t - e.hitT < 0.9, st: `🐧 ${Math.round(e.x)} m` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: Math.round(e.x) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Tobogan };
