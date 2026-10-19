// La Hinchada: alentá en la tribuna al ritmo del bombo. Apretar justo en el golpe suma mucho aliento; a lo loco, casi nada.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'La Hinchada',
  instructions: '¡A alentar! El bombo marca el ritmo en la tele. Apretá el botón JUSTO en cada golpe del bombo: así sumás aliento y combo. Si apretás a lo loco, se te corta el combo. ¡La hinchada que más alienta gana!',
  control: 'mash',
  modes: ['ffa', 'duel'],
  board: 'baires',
};

const BPM = 104, LAG = 0.07, WIN = 0.13;
const BEAT = 60 / BPM;

class Hinchada extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 26;
    this.ents = players.map((p) => ({ id: p.id, score: 0, combo: 0, best: 0, lastBeat: -1, lastT: 0, last: null, skill: rand(0.7, 0.9), botBeat: -1 }));
  }
  beatAt(t) { return Math.round((t - 3) / BEAT); }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'mash' || this.t - e.lastT < 0.05) return;
    e.lastT = this.t;
    this.press(e, this.t - LAG);
  }
  press(e, t) {
    if (!this.started || this.done) return;
    const b = this.beatAt(t), off = Math.abs(t - (3 + b * BEAT));
    if (off < WIN && b !== e.lastBeat) {
      e.lastBeat = b; e.combo++; e.best = Math.max(e.best, e.combo);
      const pts = 2 + Math.min(4, Math.floor(e.combo / 8));
      e.score += pts; e.last = { ok: true, at: this.t };
      if (e.combo % 16 === 0) { this.event(e.id, `¡Combo ${e.combo}!`, 'gold'); this.cue(e.id, { text: `📣 ¡Combo ${e.combo}!`, buzz: 60 }); }
    } else {
      // A destiempo: corta el combo
      if (e.combo >= 8) this.event(e.id, '¡Se cortó!', 'bad');
      e.combo = 0; e.last = { ok: false, at: this.t };
    }
  }
  bot(id) {
    const e = this.get(id); if (!e || !this.started) return;
    const b = this.beatAt(this.t);
    if (b === e.botBeat) return;
    const at = 3 + b * BEAT + (e.botErr ?? (e.botErr = rand(-0.1, 0.1) * (Math.random() < e.skill ? 1 : 2.5)));
    if (this.t >= at) { e.botBeat = b; e.botErr = undefined; this.press(e, this.t); }
  }
  step(dt) {
    this.t += dt;
    if (this.started && this.tt >= this.duration) this.done = true;
  }
  snapshot() {
    const phase = ((this.t - 3) / BEAT) % 1;
    return {
      ...this.base(), beat: r2(phase < 0 ? 0 : phase), beatN: this.beatAt(this.t),
      ents: this.ents.map((e) => ({ id: e.id, combo: e.combo, ok: e.last && this.t - e.last.at < 0.2 ? e.last.ok : null, st: `📣 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Hinchada };
