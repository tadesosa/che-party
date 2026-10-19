// Choripán al Paso: el cliente pide y vos armás el sánguche en el orden justo. El que vende más choris gana.
const { Minigame, rand, pick } = require('./common');

const ING = ['pan', 'chori', 'chimi', 'criolla'];
const EMO = { pan: '🥖', chori: '🌭', chimi: '🌿', criolla: '🍅' };
const meta = {
  title: 'Choripán al Paso',
  instructions: 'El cliente te pide un choripán en un orden (lo ves en la tele y en tu celu). Apretá los ingredientes en ese orden: siempre empieza con el pan. Si le errás, se te cae y empezás de nuevo. ¡El que vende más choris gana!',
  control: 'buttons',
  buttons: [{ id: 'pan', label: '🥖 PAN' }, { id: 'chori', label: '🌭 CHORI' }, { id: 'chimi', label: '🌿 CHIMI' }, { id: 'criolla', label: '🍅 CRIOLLA' }],
  layout: 'grid2',
  modes: ['ffa', 'duel'],
};

// Pedidos: siempre pan primero; los primeros son cortos
function makeOrder(i) {
  const len = Math.min(5, 3 + Math.floor(i / 2));
  const o = ['pan'];
  while (o.length < len) o.push(pick(ING.slice(1).concat(o.length === 1 ? ['chori', 'chori'] : [])));
  return o;
}

class Choripan extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.orders = Array.from({ length: 30 }, (_, i) => makeOrder(i));
    this.ents = players.map((p) => ({ id: p.id, k: 0, pos: 0, sold: 0, dropT: -9, botNext: 0, botGap: rand(0.35, 0.55), botErr: rand(0.05, 0.12) }));
  }
  orderOf(e) { return this.orders[e.k % this.orders.length]; }
  sendOrder(e) { this.cue(e.id, { text: '🧑‍🍳 ' + this.orderOf(e).map((x) => EMO[x]).join(' ') }); }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action' && ING.includes(m.b)) this.add(e, m.b);
  }
  add(e, ing) {
    if (!this.started || this.done || this.t - e.dropT < 0.6) return;
    const o = this.orderOf(e);
    if (o[e.pos] !== ing) {
      e.pos = 0; e.dropT = this.t;
      this.event(e.id, '¡Se cayó!', 'bad');
      this.cue(e.id, { text: '😵 ¡Le erraste! De nuevo: ' + o.map((x) => EMO[x]).join(' '), buzz: 250 });
      return;
    }
    e.pos++;
    if (e.pos >= o.length) {
      e.sold++; e.k++; e.pos = 0;
      this.event(e.id, '¡Sale chori! +1', 'gold');
      this.sendOrder(e);
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !this.started || this.t < e.botNext) return;
    e.botNext = this.t + e.botGap * rand(0.8, 1.3);
    const want = this.orderOf(e)[e.pos];
    this.add(e, Math.random() < e.botErr ? pick(ING.filter((x) => x !== want)) : want);
  }
  step(dt) {
    const was = this.started;
    this.t += dt;
    if (!was && this.started) for (const e of this.ents) this.sendOrder(e);
    if (this.started && this.tt >= this.duration) this.done = true;
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => ({ id: e.id, order: this.orderOf(e), pos: e.pos, sold: e.sold, drop: this.t - e.dropT < 0.6, st: `🌭 ${e.sold}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.sold * 10 + e.pos })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Choripan };
