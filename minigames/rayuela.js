// Rayuela: cada casillero dice cómo saltar (pie izquierdo, pie derecho o los dos). Si le errás, volvés al principio del tramo.
const { Minigame, rand, pick } = require('./common');

const meta = {
  title: 'Rayuela',
  instructions: 'Cada casillero de tu rayuela tiene un color: apretá el botón de ese color en el celu (ROJO, AMARILLO o AZUL). El color que sigue también flota arriba de tu cabeza. Si le errás, volvés al principio. ¡Tres rayuelas y llegás al Cielo!',
  control: 'buttons',
  buttons: [{ id: 'L', label: 'ROJO', color: '#e14b3c' }, { id: 'B', label: 'AMARILLO', color: '#f6b40e' }, { id: 'R', label: 'AZUL', color: '#2f86e0' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
};

const LEN = 9, RUNS = 3;
const KINDS = ['L', 'B', 'R'];

class Rayuela extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40; this.order = [];
    // Todos juegan las mismas rayuelas (así es justo)
    this.seqs = Array.from({ length: RUNS }, () => Array.from({ length: LEN }, () => pick(KINDS)));
    this.ents = players.map((p) => ({ id: p.id, run: 0, pos: 0, fallT: -9, fin: 0, total: 0, botNext: 0, botErr: rand(0.06, 0.15), botGap: rand(0.33, 0.5) }));
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action' && KINDS.includes(m.b)) this.hop(e, m.b);
  }
  hop(e, b) {
    if (!this.started || e.fin || this.done || this.t - e.fallT < 0.7) return;
    const want = this.seqs[e.run][e.pos];
    if (b !== want) {
      e.fallT = this.t; e.pos = 0;
      this.event(e.id, '¡Pisó la línea!', 'bad');
      this.cue(e.id, { text: '😵 ¡Le erraste! De nuevo', buzz: 300 });
      return;
    }
    e.pos++; e.total++;
    if (e.pos >= LEN) {
      e.run++; e.pos = 0;
      if (e.run >= RUNS) {
        this.order.push(e.id); e.fin = this.order.length;
        this.event(e.id, e.fin === 1 ? '¡AL CIELO!' : `¡${e.fin}°!`, e.fin === 1 ? 'gold' : 'good');
        this.cue(e.id, { text: `☁️ ¡Llegaste al Cielo ${e.fin}°!`, buzz: 200 });
      } else {
        this.event(e.id, `Rayuela ${e.run}/${RUNS}`, 'good');
        this.cue(e.id, { text: `👍 ¡Rayuela ${e.run} de ${RUNS}!`, buzz: 60 });
      }
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || e.fin || this.t < e.botNext) return;
    e.botNext = this.t + e.botGap * rand(0.85, 1.3);
    const want = this.seqs[e.run][e.pos];
    this.hop(e, Math.random() < e.botErr ? pick(KINDS.filter((k) => k !== want)) : want);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.ents.every((e) => e.fin) || this.tt >= this.duration) {
      this.endT = this.endT ?? this.t;
      if (this.t - this.endT > 1) this.done = true;
    }
  }
  snapshot() {
    return {
      ...this.base(), seqs: this.seqs, len: LEN, runs: RUNS,
      ents: this.ents.map((e) => ({ id: e.id, run: e.run, pos: e.pos, fin: e.fin, fall: this.t - e.fallT < 0.7,
        st: e.fin ? `☁️ ${e.fin}°` : `🪨 ${e.run * LEN + e.pos}/${RUNS * LEN}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 1000 - e.fin : e.run * LEN + e.pos })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Rayuela };
