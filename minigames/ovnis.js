// Cazadores de Ovnis: de noche, en las Sierras, aparecen ovnis arriba de uno de los cuatro cerros (rojo, amarillo,
// verde o azul). Apretá el botón del color de ese cerro para sacarle la foto. A veces es un avión o un cóndor: ¡no vale!
const { Minigame, rand, pick } = require('./common');

const HILLS = [
  { id: 'r', label: 'ROJO', color: '#e14b3c' },
  { id: 'y', label: 'AMARILLO', color: '#f6b40e' },
  { id: 'g', label: 'VERDE', color: '#2e9e48' },
  { id: 'b', label: 'AZUL', color: '#2f86e0' },
];

const meta = {
  title: 'Cazadores de Ovnis',
  instructions: 'De noche, en el Uritorco, aparecen ovnis arriba de los cerros. Apretá el botón del color del cerro donde está el ovni para sacarle la foto: el primero suma 3, el segundo 2 y los demás 1. ¡Ojo! A veces es un avión o un cóndor: si le sacás foto a eso, o apretás un cerro vacío, perdés un punto.',
  control: 'buttons',
  buttons: HILLS.map((h) => ({ id: h.id, label: '📷 ' + h.label, color: h.color })),
  layout: 'grid2',
  modes: ['ffa', 'duel'],
  board: 'cordoba',
};

class Ovnis extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 32;
    this.sight = null; this.sId = 0; this.next = 3 + 1.5;
    this.ents = players.map((p) => ({ id: p.id, pts: 0, photos: 0, lockT: -9, botAt: null, botPick: null, react: rand(0.42, 0.75) }));
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'action') this.shoot(e, m.b); }
  shoot(e, hill) {
    if (!this.started || this.done || this.t - e.lockT < 0.6) return;
    const s = this.sight;
    if (s && s.hill === hill && !s.got.includes(e.id) && this.t < s.end) {
      if (s.fake) {
        e.pts = Math.max(0, e.pts - 1); e.lockT = this.t;
        this.event(e.id, s.fake === 'avion' ? '¡Era un avión!' : '¡Era un cóndor!', 'bad');
        this.cue(e.id, { text: s.fake === 'avion' ? '✈️ ¡Era un avión! -1' : '🦅 ¡Era un cóndor! -1', buzz: 250 });
        s.got.push(e.id);
        return;
      }
      s.got.push(e.id);
      const n = s.got.length, add = n === 1 ? 3 : n === 2 ? 2 : 1;
      e.pts += add; e.photos++;
      this.event(e.id, n === 1 ? '¡Primera foto! +3' : `+${add}`, n === 1 ? 'gold' : 'good');
      this.cue(e.id, { buzz: 40 });
      return;
    }
    e.pts = Math.max(0, e.pts - 1); e.lockT = this.t;
    this.event(e.id, '¡Ahí no hay nada!', 'bad');
    this.cue(e.id, { text: '📷 Ese cerro está vacío: -1', buzz: 200 });
  }
  bot(id) {
    const e = this.get(id), s = this.sight;
    if (!e || !this.started || !s || s.got.includes(e.id) || this.t > s.end) return;
    if (e.botAt == null || e.botFor !== s.id) {
      e.botFor = s.id;
      // A veces se confunde con el avión o el cóndor
      if (s.fake && Math.random() > 0.2) { e.botAt = Infinity; return; }
      e.botAt = s.start + e.react * rand(0.85, 1.3);
      e.botPick = Math.random() < 0.9 ? s.hill : pick(HILLS.map((h) => h.id));
    }
    if (this.t >= e.botAt) { e.botAt = Infinity; this.shoot(e, e.botPick); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    if (this.sight && this.t > this.sight.end + 0.4) this.sight = null;
    if (!this.sight && this.t >= this.next) {
      const fake = Math.random() < 0.22 ? pick(['avion', 'condor']) : null;
      const dur = Math.max(0.85, 1.6 - this.tt * 0.02);
      this.sight = { id: ++this.sId, hill: pick(HILLS.map((h) => h.id)), fake, start: this.t, end: this.t + dur, got: [] };
      this.next = this.sight.end + rand(0.5, 1.3);
    }
  }
  snapshot() {
    const s = this.sight;
    return {
      ...this.base(), hills: HILLS,
      sight: s ? { id: s.id, hill: s.hill, fake: s.fake, u: Math.min(1, (this.t - s.start) / (s.end - s.start)), gone: this.t > s.end, got: s.got } : null,
      ents: this.ents.map((e) => ({ id: e.id, pts: e.pts, lock: this.t - e.lockT < 0.6, st: `📷 ${e.pts} pts` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.pts * 100 + e.photos })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Ovnis };
