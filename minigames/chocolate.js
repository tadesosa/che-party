// Torre de Chocolate: una barra de chocolate va y viene arriba de tu torre. Apretá SOLTAR para dejarla caer:
// lo que sobresale se corta y la torre se va achicando. Si la soltás afuera, se terminó tu torre.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Torre de Chocolate',
  instructions: 'Arriba de tu torre va y viene una barra de chocolate. Apretá SOLTAR cuando esté justo encima: lo que sobresale se corta y la próxima barra es más chica. Si cae del todo afuera, tu torre termina. ¡Gana la torre más alta!',
  control: 'buttons',
  buttons: [{ id: 'drop', label: '🍫 ¡SOLTAR!' }],
  layout: 'single',
  modes: ['ffa', 'duel'],
  board: 'bariloche',
};

const W0 = 2.4, PERFECT = 0.09;

class Chocolate extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.ents = players.map((p, i) => ({ id: p.id, blocks: [{ x: 0, w: W0 }], cur: { x: 0, w: W0 }, ph: i * 0.7, over: false, cutT: -9, cut: null, perfect: 0,
      botSkill: rand(0.12, 0.3), botWait: 0 }));
  }
  speed(e) { return 2.0 + e.blocks.length * 0.11; }
  amp(e) { return e.cur.w + 1.2; }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action') this.drop(e);
  }
  drop(e) {
    if (!this.started || e.over || this.done || this.t - e.cutT < 0.35) return;
    const top = e.blocks[e.blocks.length - 1];
    const x = e.cur.x, w = e.cur.w;
    let dx = x - top.x;
    if (Math.abs(dx) <= PERFECT) {
      // ¡Perfecto! queda alineada y no se achica
      dx = 0; e.perfect++;
      e.blocks.push({ x: top.x, w });
      this.event(e.id, '¡Perfecto!', 'gold');
      this.cue(e.id, { buzz: 40 });
    } else {
      const overlap = w - Math.abs(dx);
      if (overlap <= 0.05) {
        e.over = true; e.cut = { x, w }; e.cutT = this.t;
        this.event(e.id, '¡Se cayó!', 'bad');
        this.cue(e.id, { text: '🍫 ¡Se cayó la barra! Tu torre terminó', buzz: 400 });
        return;
      }
      const nx = top.x + dx / 2;
      // El pedazo que sobresale se cae
      e.cut = { x: dx > 0 ? nx + overlap / 2 + Math.abs(dx) / 2 : nx - overlap / 2 - Math.abs(dx) / 2, w: Math.abs(dx) };
      e.blocks.push({ x: nx, w: overlap });
    }
    e.cutT = this.t;
    const nt = e.blocks[e.blocks.length - 1];
    e.cur = { x: nt.x, w: nt.w };
    e.ph = rand(0, Math.PI * 2);
    if (e.blocks.length % 5 === 1) this.event(e.id, `${e.blocks.length - 1} barras`, 'good');
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !this.started || e.over) return;
    const top = e.blocks[e.blocks.length - 1];
    // Suelta cuando está cerca del centro (con un poco de error)
    if (Math.abs(e.cur.x - top.x) < e.botSkill * e.cur.w && Math.random() < dt * 8) this.drop(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.ents.every((e) => e.over) || this.tt >= this.duration) { this.endT = this.endT ?? this.t; if (this.t - this.endT > 1) this.done = true; return; }
    for (const e of this.ents) {
      if (e.over) continue;
      const top = e.blocks[e.blocks.length - 1];
      e.ph += dt * this.speed(e);
      e.cur.x = top.x + Math.sin(e.ph) * this.amp(e);
    }
  }
  snapshot() {
    return {
      ...this.base(), w0: W0,
      ents: this.ents.map((e) => ({ id: e.id, blocks: e.blocks.map((b) => [r2(b.x), r2(b.w)]), cur: [r2(e.cur.x), r2(e.cur.w)], over: e.over,
        cut: this.t - e.cutT < 1.2 && e.cut ? [r2(e.cut.x), r2(e.cut.w), Math.round((this.t - e.cutT) * 100) / 100] : null,
        st: `🍫 ${e.blocks.length - 1}${e.over ? ' (cayó)' : ''}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: (e.blocks.length - 1) * 10 + e.perfect })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Chocolate };
