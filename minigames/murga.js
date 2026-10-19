// Ritmo de Murga: los golpes vienen por la pista de la tele. Apretá BOMBO o PLATILLO justo cuando llegan a la línea.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Ritmo de Murga',
  instructions: 'Por la pista de la tele bajan golpes de BOMBO (rojos) y de PLATILLO (amarillos). Apretá el botón que corresponde justo cuando el golpe pisa la línea. ¡Justo suma 2, cerca suma 1!',
  control: 'buttons',
  buttons: [{ id: 'b', label: '🥁 BOMBO' }, { id: 'p', label: 'PLATILLO 🔔' }],
  layout: 'row',
  modes: ['ffa', 'duel'],
};

const LAG = 0.07;            // demora típica de la red, se descuenta
const PERFECT = 0.1, GOOD = 0.22;
const BEAT = 60 / 112;

// Patrón de murga: compases de 4 tiempos con algunas corcheas; 12 compases
function makeSong(t0) {
  const notes = [];
  const bars = [
    ['b', null, 'b', null, 'p', null, 'b', 'b'], ['b', null, 'p', null, 'b', 'b', 'p', null], ['b', 'b', 'p', null, 'b', null, 'p', 'p'],
  ];
  for (let bar = 0; bar < 12; bar++) {
    const pat = bars[bar < 4 ? 0 : bar < 8 ? 1 : 2];
    pat.forEach((k, i) => { if (k) notes.push({ id: notes.length + 1, k, t: t0 + bar * 4 * BEAT + i * (BEAT / 2) }); });
  }
  return notes;
}

class Murga extends Minigame {
  constructor(players) {
    super(players);
    this.notes = makeSong(3 + 2.2);
    this.end = this.notes[this.notes.length - 1].t + 1.5;
    this.ents = players.map((p) => ({ id: p.id, score: 0, hit: {}, last: null, combo: 0, best: 0, skill: rand(0.7, 0.92), botDone: {} }));
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'action' && (m.b === 'b' || m.b === 'p')) this.press(e, m.b, this.t - LAG);
  }
  press(e, k, t) {
    if (!this.started || this.done) return;
    // El golpe más cercano de ese tipo que no se haya tocado
    let best = null, bd = 9;
    for (const n of this.notes) {
      if (n.k !== k || e.hit[n.id]) continue;
      const d = Math.abs(n.t - t);
      if (d < bd) { bd = d; best = n; }
      if (n.t > t + 1) break;
    }
    if (!best || bd > GOOD) { e.combo = 0; e.last = { q: 'miss', at: this.t }; return; }
    const pts = bd < PERFECT ? 2 : 1;
    e.hit[best.id] = pts; e.score += pts; e.combo++; e.best = Math.max(e.best, e.combo);
    e.last = { q: pts === 2 ? 'perfecto' : 'bien', at: this.t, k };
    if (e.combo > 0 && e.combo % 10 === 0) this.event(e.id, `¡Combo ${e.combo}!`, 'gold');
  }
  bot(id) {
    const e = this.get(id); if (!e || !this.started) return;
    for (const n of this.notes) {
      if (n.t > this.t + 0.3) break;
      if (e.botDone[n.id]) continue;
      if (this.t >= n.t + (e.botErr ?? (e.botErr = rand(-0.12, 0.12)))) {
        e.botDone[n.id] = true; e.botErr = undefined;
        if (Math.random() < e.skill) this.press(e, n.k, this.t);
      }
    }
  }
  step(dt) {
    this.t += dt;
    if (this.t >= this.end) this.done = true;
  }
  snapshot() {
    const now = this.t;
    return {
      ...this.base(), song: r2(now),
      notes: this.notes.filter((n) => n.t > now - 0.3 && n.t < now + 2.6).map((n) => ({ id: n.id, k: n.k, dt: r2(n.t - now) })),
      ents: this.ents.map((e) => ({ id: e.id, last: e.last && now - e.last.at < 0.35 ? e.last.q : null, k: e.last && e.last.k, combo: e.combo, st: `🥁 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Murga };
