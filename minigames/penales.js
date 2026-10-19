// Atajá el Penal: te patean 8 penales. Tirate al lado correcto antes de que llegue la pelota.
const { Minigame, rand } = require('./common');

const SHOTS = 8;
const meta = {
  title: 'Atajá el Penal',
  instructions: 'Te van a patear 8 penales. Mirá para dónde va la pelota y tirate a ese lado (izquierda, centro o derecha). ¡Cada vez patean más fuerte!',
  control: 'buttons',
  buttons: [{ id: '0', label: '⬅️' }, { id: '1', label: '⬆️' }, { id: '2', label: '➡️' }],
  layout: 'row',
};

class Penales extends Minigame {
  constructor(players) {
    super(players);
    this.ents = players.map((p) => ({ id: p.id, pos: 1, saves: 0, idx: 0, shot: null, next: 3.8 + rand(0, 0.8), last: null, plan: null }));
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || !['0', '1', '2'].includes(m.b)) return;
    e.pos = +m.b;
  }
  bot(id) {
    const e = this.get(id);
    if (!e || !e.shot) return;
    if (!e.plan) e.plan = { at: e.shot.start + rand(0.25, 0.6), pos: Math.random() < 0.78 ? e.shot.dir : Math.floor(rand(0, 3)) };
    if (this.t >= e.plan.at) e.pos = e.plan.pos;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    let lastAt = 0;
    for (const e of this.ents) {
      if (!e.shot && e.idx < SHOTS && this.t >= e.next) {
        // La pelota tarda menos en llegar a medida que avanzan los tiros
        e.shot = { dir: Math.floor(rand(0, 3)), start: this.t, travel: Math.max(0.6, 1.25 - e.idx * 0.09) };
        e.plan = null;
      }
      if (e.shot && this.t >= e.shot.start + e.shot.travel) {
        const saved = e.pos === e.shot.dir;
        if (saved) { e.saves++; this.event(e.id, '¡ATAJÓ!', 'gold'); this.cue(e.id, { text: '🧤 ¡Atajaste!', buzz: 80 }); }
        else { this.event(e.id, 'GOOOL', 'bad'); this.cue(e.id, { text: '⚽ Gol…', buzz: 200 }); }
        e.last = { saved, dir: e.shot.dir, at: this.t };
        e.shot = null; e.idx++;
        e.next = this.t + rand(1.0, 1.6);
      }
      if (e.last) lastAt = Math.max(lastAt, e.last.at);
    }
    if (this.ents.every((e) => e.idx >= SHOTS) && this.t - lastAt > 1.2) this.done = true;
  }
  snapshot() {
    return {
      ...this.base(),
      ents: this.ents.map((e) => ({
        id: e.id, pos: e.pos, idx: e.idx,
        shot: e.shot ? { dir: e.shot.dir, p: Math.min(1, (this.t - e.shot.start) / e.shot.travel), n: e.idx } : null,
        last: e.last && this.t - e.last.at < 0.9 ? { saved: e.last.saved, dir: e.last.dir } : null,
        st: `🧤 ${e.saves}/${e.idx}`,
      })),
    };
  }
  ranking() {
    return this.ents.map((e) => ({ id: e.id, score: e.saves })).sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Penales };
