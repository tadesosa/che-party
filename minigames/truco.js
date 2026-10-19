// Truco Relámpago: en el medio hay una carta. Cada uno tiene 3 cartas en el celu y tiene que ganarle
// con la más baja que alcance (como un buen truquero, sin gastar el ancho de espadas al pedo).
const { Minigame, rand, pick } = require('./common');

const meta = {
  title: 'Truco Relámpago',
  instructions: 'En la tele hay una carta en el medio y en tu celu tenés 3 cartas. Tirá la que le gana… ¡pero la más baja que le gane! Ganarle justo suma 2, ganarle gastando de más suma 1. Si ninguna le gana, tirá la más baja y sumás 2 igual.',
  control: 'buttons',
  buttons: [{ id: '0', label: '🂠' }, { id: '1', label: '🂠' }, { id: '2', label: '🂠' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
};

const SUITS = { e: '🗡️', b: '🪵', o: '🪙', c: '🏆' };
// Jerarquía del truco: número más alto = carta más fuerte
function power(c) {
  const { n, s } = c;
  if (n === 1 && s === 'e') return 14;
  if (n === 1 && s === 'b') return 13;
  if (n === 7 && s === 'e') return 12;
  if (n === 7 && s === 'o') return 11;
  return { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 }[n];
}
const DECK = [];
for (const s of Object.keys(SUITS)) for (const n of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]) DECK.push({ n, s });
const label = (c) => `${c.n} ${SUITS[c.s]}`;
const HANDS = 6, LIMIT = 6;

class Truco extends Minigame {
  constructor(players) {
    super(players);
    this.hand = 0; this.phase = 'wait'; this.phaseEnd = 3.4;
    this.ents = players.map((p) => ({ id: p.id, score: 0, cards: [], played: null, res: null, botAt: 0, botSkill: rand(0.55, 0.85) }));
  }
  deal() {
    this.hand++;
    const deck = [...DECK].sort(() => Math.random() - 0.5);
    // La del medio, del montón del medio para que haya de todo
    this.center = deck.find((c) => power(c) >= 3 && power(c) <= 11);
    const rest = deck.filter((c) => c !== this.center);
    let k = 0;
    for (const e of this.ents) {
      e.cards = rest.slice(k, k + 3); k += 3;
      e.played = null; e.res = null; e.botAt = this.t + rand(1.4, 4.5);
      this.cue(e.id, { labels: e.cards.map(label), text: `🃏 Mano ${this.hand}: ganale al ${label(this.center)}` });
    }
    this.phase = 'play'; this.phaseEnd = this.t + LIMIT;
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action' && ['0', '1', '2'].includes(m.b)) this.play(e, +m.b);
  }
  // La mejor jugada: la más baja que gana; si ninguna gana, la más baja de todas
  best(cards) {
    const cp = power(this.center);
    const win = cards.filter((c) => power(c) > cp).sort((a, b) => power(a) - power(b));
    return win.length ? win[0] : [...cards].sort((a, b) => power(a) - power(b))[0];
  }
  play(e, i) {
    if (this.phase !== 'play' || e.played || !e.cards[i]) return;
    const c = e.cards[i], b = this.best(e.cards);
    const cp = power(this.center);
    e.played = c;
    let pts, text, kind;
    if (power(c) === power(b)) { pts = 2; text = power(c) > cp ? '¡Justa! +2' : '¡Bien al mazo! +2'; kind = 'gold'; }
    else if (power(c) > cp) { pts = 1; text = 'Le ganó +1'; kind = 'good'; }
    else { pts = 0; text = '¡Perdió!'; kind = 'bad'; }
    e.score += pts; e.res = pts;
    this.event(e.id, text, kind);
    this.cue(e.id, { labels: e.cards.map((x, k) => (k === i ? `✔ ${label(x)}` : '')), text: pts === 2 ? '🤩 ¡Esa era!' : pts ? '👍 Le ganaste' : '😩 No le ganaba', buzz: pts ? 60 : 250 });
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'play' || e.played || this.t < e.botAt) return;
    const b = this.best(e.cards);
    this.play(e, e.cards.indexOf(Math.random() < e.botSkill ? b : pick(e.cards)));
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'wait' && this.t >= this.phaseEnd) {
      if (this.hand >= HANDS) { this.done = true; return; }
      this.deal();
    } else if (this.phase === 'play' && (this.t >= this.phaseEnd || this.ents.every((e) => e.played))) {
      for (const e of this.ents) if (!e.played) { e.res = 0; this.event(e.id, '¡Se durmió!', 'bad'); this.cue(e.id, { labels: ['', '', ''] }); }
      this.phase = 'show'; this.phaseEnd = this.t + 2;
    } else if (this.phase === 'show' && this.t >= this.phaseEnd) {
      this.phase = 'wait'; this.phaseEnd = this.t + 0.6;
      for (const e of this.ents) this.cue(e.id, { labels: ['🂠', '🂠', '🂠'] });
    }
  }
  snapshot() {
    return {
      ...this.base(), hand: this.hand, hands: HANDS, phase: this.phase,
      center: this.center && this.phase !== 'wait' ? this.center : null,
      ents: this.ents.map((e) => ({ id: e.id, played: e.played, res: e.res, st: `🃏 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Truco, power };
