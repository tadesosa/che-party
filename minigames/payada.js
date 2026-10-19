// La Payada: en la tele aparece un verso al que le falta la última palabra. Elegí la que rima, ¡rápido!
const { Minigame, rand } = require('./common');

const meta = {
  title: 'La Payada',
  instructions: 'Contrapunto de payadores: en la tele aparece un verso sin la última palabra. En tu celu tenés 3 palabras: tocá la que RIMA. El primero que acierta suma 2, los demás que aciertan suman 1. Si le errás, perdés ese verso.',
  control: 'buttons',
  buttons: [{ id: '0', label: '…' }, { id: '1', label: '…' }, { id: '2', label: '…' }],
  layout: 'row',
  modes: ['duel', 'ffa'],
};

// [primer verso, segundo verso sin la última palabra, la que rima, dos que no]
const VERSES = [
  ['Me tomé un mate amargo', 'y me dio un sueño', 'largo', 'corto', 'fuerte'],
  ['Con la guitarra en la mano', 'le canto a mi', 'hermano', 'primo', 'perro'],
  ['En el fondo de la casa', 'la abuela amasa la', 'masa', 'pizza', 'harina'],
  ['Si me invitás a un asado', 'llevo el vino y el', 'helado', 'pan', 'carbón'],
  ['Al gaucho no lo apura', 'ni el viento ni la', 'llanura', 'lluvia', 'noche'],
  ['Mi caballo es un rayo', 'corre más que el mes de', 'mayo', 'julio', 'enero'],
  ['La vaca come pasto verde', 'y el que se duerme', 'pierde', 'gana', 'sueña'],
  ['Mi abuela hace empanadas', 'y las sirve bien', 'doradas', 'frías', 'chicas'],
  ['Con el poncho y la bombilla', 'me siento en la', 'silla', 'mesa', 'cama'],
  ['Una noche de verano', 'te agarré la', 'mano', 'cara', 'puerta'],
  ['Si el asado está bien hecho', 'se te llena el', 'pecho', 'plato', 'alma'],
  ['En la plaza hay una fuente', 'donde juega mucha', 'gente', 'chico', 'perro'],
  ['Si el mate está bien cebado', 'no lo dejes', 'olvidado', 'solo', 'frío'],
  ['Con dulce de leche todo', 'sale rico de algún', 'modo', 'lado', 'sabor'],
  ['Me fui a la costa en enero', 'y me olvidé el', 'sombrero', 'gorro', 'abrigo'],
  ['El colectivo venía lleno', 'y el chofer clavó el', 'freno', 'motor', 'volante'],
  ['Por la ruta cuarenta', 'el viento sopla y', 'revienta', 'silba', 'vuela'],
  ['En la cancha del potrero', 'el más chico es el', 'primero', 'último', 'mejor'],
  ['La pastafrola de membrillo', 'tiene un dulce que da', 'brillo', 'gusto', 'hambre'],
  ['Cuando canta el hornero', 'se despierta el', 'pueblo entero', 'gallo', 'vecino'],
];
const ROUNDS = 7, LIMIT = 5.5;

class Payada extends Minigame {
  constructor(players) {
    super(players);
    this.list = [...VERSES].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    this.round = 0; this.phase = 'wait'; this.phaseEnd = 3.6;
    this.ents = players.map((p) => ({ id: p.id, score: 0, ans: null, botAt: 0, botOk: rand(0.65, 0.9) }));
  }
  next() {
    const v = this.list[this.round++];
    const opts = [v[2], v[3], v[4]].sort(() => Math.random() - 0.5);
    this.cur = { a: v[0], b: v[1], opts, right: opts.indexOf(v[2]), first: null };
    for (const e of this.ents) { e.ans = null; e.botAt = this.t + rand(1.6, 4.2); this.cue(e.id, { labels: opts, text: '🎸 ¿Cuál rima?' }); }
    this.phase = 'ask'; this.phaseEnd = this.t + LIMIT;
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action' && ['0', '1', '2'].includes(m.b)) this.answer(e, +m.b);
  }
  answer(e, i) {
    if (this.phase !== 'ask' || e.ans != null) return;
    e.ans = i;
    const c = this.cur;
    if (i === c.right) {
      const pts = c.first ? 1 : 2;
      if (!c.first) c.first = e.id;
      e.score += pts;
      this.event(e.id, pts === 2 ? '¡Primero! +2' : '+1', pts === 2 ? 'gold' : 'good');
      this.cue(e.id, { labels: c.opts.map((o, k) => (k === i ? '✔ ' + o : '')), text: '🎶 ¡Rima!', buzz: 60 });
    } else {
      this.event(e.id, '¡No rima!', 'bad');
      this.cue(e.id, { labels: c.opts.map((o, k) => (k === i ? '✘ ' + o : '')), text: '😬 No rimaba', buzz: 250 });
    }
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'ask' || e.ans != null || this.t < e.botAt) return;
    const c = this.cur;
    this.answer(e, Math.random() < e.botOk ? c.right : (c.right + 1 + Math.floor(Math.random() * 2)) % 3);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'wait' && this.t >= this.phaseEnd) {
      if (this.round >= ROUNDS) { this.done = true; return; }
      this.next();
    } else if (this.phase === 'ask' && (this.t >= this.phaseEnd || this.ents.every((e) => e.ans != null))) {
      this.phase = 'show'; this.phaseEnd = this.t + 2.2;
    } else if (this.phase === 'show' && this.t >= this.phaseEnd) {
      this.phase = 'wait'; this.phaseEnd = this.t + 0.5;
      for (const e of this.ents) this.cue(e.id, { labels: ['…', '…', '…'] });
    }
  }
  snapshot() {
    const c = this.cur;
    return {
      ...this.base(), phase: this.phase, round: this.round, rounds: ROUNDS,
      verse: c && this.phase !== 'wait' ? { a: c.a, b: c.b, opts: c.opts, right: this.phase === 'show' ? c.right : null } : null,
      ents: this.ents.map((e) => ({ id: e.id, ans: e.ans, ok: c && e.ans != null ? e.ans === c.right : null, st: `🎸 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Payada };
