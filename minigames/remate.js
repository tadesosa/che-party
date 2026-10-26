// Remate en la Feria: el rematador saca cosas de a una, con lo que "dice que vale". Todos ofertan en secreto
// y el que ofrece más se la lleva y paga. Pero algunas son truchas (valen menos) y otras son una joya.
// Al final suma lo que valen tus cosas más la plata que te quedó. Es de estrategia, no de reflejos.
const { Minigame, clamp, num, rand, pick } = require('./common');

const meta = {
  title: 'Remate en la Feria',
  instructions: 'Todos arrancan con $100. El rematador muestra algo y dice entre cuánto y cuánto vale. En el celu deslizá para elegir cuánto ofrecés y tocá OFRECER (en secreto). El que ofrece más se lo lleva y lo paga; si empatan, gana el que ofreció primero. Ojo: algunas cosas son truchas y otras son una joya. Al final gana el que suma más entre lo que valen sus cosas y la plata que le quedó.',
  control: 'bid',
  modes: ['ffa', 'duel'],
};

const LOTS = [
  { name: 'Mate de alpaca', em: '🧉', lo: 20, hi: 40 },
  { name: 'Poncho salteño', em: '🧣', lo: 15, hi: 45 },
  { name: 'Guitarra criolla', em: '🎸', lo: 25, hi: 55 },
  { name: 'Sifón de vidrio', em: '🍾', lo: 10, hi: 30 },
  { name: 'Disco de Gardel', em: '💿', lo: 5, hi: 50 },
  { name: 'Camiseta firmada', em: '👕', lo: 20, hi: 60 },
  { name: 'Bici Graziella', em: '🚲', lo: 25, hi: 50 },
  { name: 'Cuadro fileteado', em: '🖼️', lo: 10, hi: 45 },
  { name: 'Radio Spica', em: '📻', lo: 10, hi: 35 },
  { name: 'Botas de gaucho', em: '👢', lo: 15, hi: 35 },
  { name: 'Reloj del abuelo', em: '⏰', lo: 10, hi: 40 },
  { name: 'Álbum de figuritas', em: '📒', lo: 5, hi: 45 },
];
const ROUNDS = 5, BID_T = 12, REVEAL_T = 5;
const START = 100;

class Remate extends Minigame {
  constructor(players) {
    super(players);
    this.ents = players.map((p) => ({ id: p.id, money: START, items: [], worth: 0, bid: null, bidAt: 0, greed: rand(0.45, 0.85), botAt: 0 }));
    this.lots = [...LOTS].sort(() => Math.random() - 0.5).slice(0, ROUNDS).map((l) => {
      // El valor de verdad: casi siempre entre lo que dice, a veces trucho (menos) o una joya (más)
      const r = Math.random();
      const kind = r < 0.17 ? 'trucho' : r > 0.85 ? 'joya' : 'normal';
      const value = kind === 'trucho' ? Math.round(rand(1, l.lo * 0.5)) : kind === 'joya' ? Math.round(rand(l.hi * 1.2, l.hi * 1.7)) : Math.round(rand(l.lo, l.hi));
      return { ...l, value, kind };
    });
    this.round = -1;
    this.phase = 'wait'; this.phaseT = 3 + 0.5;
    this.lastPad = 0;
  }
  get lot() { return this.lots[this.round]; }
  newRound() {
    this.round++;
    if (this.round >= this.lots.length) { this.phase = 'over'; this.phaseT = this.t + 2; return; }
    this.phase = 'bid'; this.phaseT = this.t + BID_T;
    for (const e of this.ents) { e.bid = null; e.botAt = this.t + rand(2, 7); }
    this.result = null;
    this.cue('*', { text: `${this.lot.em} ${this.lot.name}: entre $${this.lot.lo} y $${this.lot.hi}`, buzz: 60 });
    this.sendPads();
  }
  sendPads() {
    this.lastPad = this.t;
    const l = this.lot;
    for (const e of this.ents) {
      const pad = this.phase === 'bid' && e.bid == null
        ? { mode: 'bid', round: this.round, max: e.money, item: `${l.em} ${l.name} · vale entre $${l.lo} y $${l.hi}` }
        : { mode: this.phase === 'bid' ? 'bid' : 'wait', round: this.round, max: e.money, item: l ? `${l.em} ${l.name}` : '', hint: this.phase === 'reveal' ? '📺 ¿Quién se lo llevó?' : undefined };
      this.cue(e.id, { pad });
    }
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || m.b !== 'bid' || this.phase !== 'bid' || e.bid != null) return;
    if (m.r != null && num(m.r) !== this.round) return;
    this.placeBid(e, Math.round(clamp(num(m.v), 0, e.money)));
  }
  placeBid(e, v) {
    e.bid = v; e.bidAt = this.t;
    this.event(e.id, '🤫 ¡Ofertó!', 'good');
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'bid' || e.bid != null || this.t < e.botAt) return;
    const l = this.lot;
    const left = this.lots.length - this.round;
    // Ofrece una parte de lo que cree que vale, sin gastar todo de una
    let v = ((l.lo + l.hi) / 2) * e.greed * rand(0.7, 1.15);
    if (Math.random() < 0.15) v = 0;
    v = Math.min(v, e.money * (left > 1 ? 0.7 : 1));
    this.placeBid(e, Math.round(clamp(v, 0, e.money)));
  }
  resolve() {
    const l = this.lot;
    const bids = this.ents.filter((e) => e.bid > 0).sort((a, b) => b.bid - a.bid || a.bidAt - b.bidAt);
    const w = bids[0];
    if (w) {
      w.money -= w.bid; w.items.push({ em: l.em, value: l.value }); w.worth += l.value;
      const gain = l.value - w.bid;
      this.event(w.id, gain >= 0 ? `¡Se lo lleva! +$${gain}` : `¡Lo pagó caro! −$${-gain}`, l.kind === 'joya' ? 'gold' : gain >= 0 ? 'good' : 'bad');
      this.cue(w.id, { text: `🔨 ¡Te lo llevaste por $${w.bid}! ${l.kind === 'trucho' ? `Era TRUCHO: vale $${l.value} 😭` : l.kind === 'joya' ? `¡Era una JOYA: vale $${l.value}! 🤑` : `Vale $${l.value}`}`, buzz: 120 });
    }
    this.result = { winner: w ? w.id : null, price: w ? w.bid : 0, value: l.value, kind: l.kind, bids: this.ents.map((e) => ({ id: e.id, v: e.bid })) };
    this.phase = 'reveal'; this.phaseT = this.t + REVEAL_T;
    this.sendPads();
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'over') { if (this.t >= this.phaseT) this.done = true; return; }
    if (this.phase === 'wait') { if (this.t >= this.phaseT) this.newRound(); return; }
    if (this.t - this.lastPad > 2) this.sendPads();
    if (this.phase === 'bid') {
      // Si se acaba el tiempo, el que no ofertó ofrece $0
      if (this.t >= this.phaseT || this.ents.every((e) => e.bid != null)) {
        for (const e of this.ents) if (e.bid == null) e.bid = 0;
        this.resolve();
      }
      return;
    }
    if (this.phase === 'reveal' && this.t >= this.phaseT) this.newRound();
  }
  snapshot() {
    const l = this.lot;
    return {
      ...this.base(),
      phase: this.phase, round: this.round, rounds: this.lots.length,
      timeLeft: this.phase === 'bid' ? Math.max(0, this.phaseT - this.t) : null,
      lot: l && this.phase !== 'over' ? { name: l.name, em: l.em, lo: l.lo, hi: l.hi } : null,
      result: this.phase === 'reveal' ? this.result : null,
      ents: this.ents.map((e) => ({ id: e.id, money: e.money, items: e.items.map((i) => i.em), done: e.bid != null, st: `💵 $${e.money} · ${e.items.map((i) => i.em).join('') || '—'}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.worth + e.money + e.items.length * 0.01 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Remate };
