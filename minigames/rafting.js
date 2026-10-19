// Rafting en el Río Mendoza: cada equipo en su balsa. Cada uno rema de un lado: si reman parejo, la balsa va derecho;
// si uno rema más, la balsa dobla. Esquivá las piedras y llegá primero.
const { Minigame, rand, r2 } = require('./common');

const meta = {
  title: 'Rafting en el Río Mendoza',
  instructions: 'Celestes contra rojos, cada equipo en su balsa. El primero de cada equipo rema del lado izquierdo y el segundo del derecho: apretá el botón para remar. Si los dos reman parejo, la balsa va derecho; si uno rema más, dobla para el otro lado. ¡Esquiven las piedras y lleguen primero!',
  control: 'mash',
  modes: ['2v2'],
  board: 'mendoza',
};

const LEN = 60, HALF = 2.6; // largo del río y medio ancho de cada carril

class Rafting extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 45;
    this.teams = teams;
    // Las piedras son iguales para los dos carriles (es justo)
    this.rocks = [];
    for (let d = 8; d < LEN - 4; d += rand(4, 6.5)) this.rocks.push({ d: r2(d), z: r2(rand(-HALF + 0.5, HALF - 0.5)) });
    this.rafts = teams.map(() => ({ d: 0, z: 0, v: 0, vz: 0, bumpT: -9, fin: 0 }));
    this.order = [];
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      return { id: p.id, team, side: teams[team].indexOf(p.id) === 0 ? -1 : 1, strokes: 0, recent: 0, last: 0, acc: 0, rate: rand(5.5, 7.5) };
    });
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'mash' || this.t - e.last < 0.06) return;
    e.last = this.t; this.stroke(e);
  }
  stroke(e) { if (this.started && !this.over && !this.rafts[e.team].fin) { e.strokes++; e.recent++; } }
  bot(id, dt) {
    const e = this.get(id); if (!e || !this.started) return;
    const r = this.rafts[e.team];
    // Si hay una piedra adelante del lado contrario al suyo, rema más fuerte para doblar; si está de su lado, afloja
    const rock = this.rocks.find((k) => k.d > r.d && k.d - r.d < 6 && Math.abs(k.z - r.z) < 1.4);
    let k = 1;
    if (rock) k = (rock.z - r.z) * e.side > 0 ? 0.45 : 1.4;
    else k = 1 + (-r.z * e.side) * 0.25; // vuelve al medio
    e.acc += dt * e.rate * k * rand(0.8, 1.2);
    while (e.acc >= 1) { e.acc--; this.stroke(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.over) { if (this.t - this.endAt > 1.5) this.done = true; return; }
    this.rafts.forEach((r, t) => {
      if (r.fin) return;
      const mem = this.ents.filter((e) => e.team === t);
      const L = mem.filter((e) => e.side < 0).reduce((a, e) => a + e.recent, 0);
      const Rr = mem.filter((e) => e.side > 0).reduce((a, e) => a + e.recent, 0);
      for (const e of mem) e.recent = 0;
      // Remar del lado izquierdo empuja la balsa hacia la derecha (z+), y al revés
      r.v += (L + Rr) * 0.42; r.vz += (L - Rr) * 0.35;
      r.v *= Math.exp(-1.4 * dt); r.vz *= Math.exp(-2.5 * dt);
      if (this.t - r.bumpT < 0.8) r.v *= 0.85;
      r.d += r.v * dt; r.z += r.vz * dt;
      if (Math.abs(r.z) > HALF) { r.z = Math.sign(r.z) * HALF; r.vz *= -0.4; }
      for (const k of this.rocks) {
        if (this.t - r.bumpT < 0.8 || Math.abs(k.d - r.d) > 0.9 || Math.abs(k.z - r.z) > 1.0) continue;
        r.bumpT = this.t; r.v = 0; r.vz += (r.z > k.z ? 1 : -1) * 3;
        for (const e of mem) { this.event(e.id, '¡Piedra!', 'bad'); this.cue(e.id, { text: '🪨 ¡Chocaron una piedra!', buzz: 300 }); }
      }
      if (r.d >= LEN) { this.order.push(t); r.fin = this.order.length; }
    });
    if (this.order.length || this.tt >= this.duration) {
      this.over = true; this.endAt = this.t;
      this.win = this.order.length ? this.order[0] : Math.abs(this.rafts[0].d - this.rafts[1].d) < 0.5 ? null : this.rafts[0].d > this.rafts[1].d ? 0 : 1;
      for (const e of this.ents) this.cue(e.id, { text: this.win == null ? '🤝 Empate' : e.team === this.win ? '🛶 ¡Ganaron!' : '😩 Perdieron', buzz: 200 });
    }
  }
  snapshot() {
    return {
      ...this.base(), len: LEN, half: HALF, rocks: this.rocks,
      rafts: this.rafts.map((r) => ({ d: r2(r.d), z: r2(r.z), vz: r2(r.vz), bump: this.t - r.bumpT < 0.8 })),
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, side: e.side, strokes: e.strokes, st: `🛶 ${Math.round((this.rafts[e.team].d / LEN) * 100)}%` })),
    };
  }
  winnerTeam() { return this.win ?? null; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: (e.team === this.win ? 1000 : 0) + e.strokes })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Rafting };
