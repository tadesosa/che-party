// Tapá el Dique: cada equipo tiene su dique con agujeros. Se abren pérdidas de agua (a los dos equipos igual);
// corré hasta la pérdida y apretá TAPAR. El agua que se escapa se junta: pierde el equipo que se inunda más.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Tapá el Dique',
  instructions: 'Celestes contra rojos, cada equipo cuida su dique del San Roque. Cuando se abre una pérdida (sale un chorro de agua), corré hasta ahí y apretá TAPAR. Mientras esté abierta, se junta agua de tu lado. ¡Gana el equipo que menos se inunda! Si estás solo contra tres, corrés mucho más rápido, tapás desde más lejos y tu dique pierde menos agua.',
  control: 'joystick',
  action: '🧱 ¡TAPAR!',
  modes: ['2v2', '1v3'],
  board: 'cordoba',
};

const HOLES = 6, W = 9, REACH = 1.3;

class Dique extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 35;
    this.teams = teams;
    this.solo = teams[0].length === 1 ? 0 : teams[1].length === 1 ? 1 : -1;
    // Agujeros: x dentro de cada mitad; los dos diques tienen los mismos agujeros (espejados)
    this.holeX = Array.from({ length: HOLES }, (_, i) => 1.4 + i * ((W - 2) / (HOLES - 1)));
    this.leaks = [new Array(HOLES).fill(0), new Array(HOLES).fill(0)]; // 0 cerrado, si no: cuándo se abrió
    this.water = [0, 0];
    this.next = 3 + 1;
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id);
      const side = team ? 1 : -1;
      return { id: p.id, team, side, x: side * (2.5 + k * 2.5), z: 2, vx: 0, vz: 0, ix: 0, iz: 0, ang: Math.PI, plugs: 0, plugT: -9, botT: 0 };
    });
  }
  holePos(team, i) { return { x: (team ? 1 : -1) * this.holeX[i], z: -1.2 }; }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.plug(e);
  }
  plug(e) {
    if (!this.started || this.done || this.t - e.plugT < 0.3) return;
    e.plugT = this.t;
    const reach = e.team === this.solo ? REACH * 1.6 : REACH;
    let best = -1, bd = Infinity;
    this.leaks[e.team].forEach((open, i) => {
      if (!open) return;
      const h = this.holePos(e.team, i), d = Math.hypot(h.x - e.x, h.z - e.z);
      if (d < reach && d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { this.leaks[e.team][best] = 0; e.plugs++; this.event(e.id, '¡Tapado!', 'good'); this.cue(e.id, { buzz: 40 }); }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.25;
    // Va a la pérdida abierta más cercana que no tenga un compañero más cerca
    const mates = this.ents.filter((o) => o.team === e.team && o !== e);
    let goal = null, gd = Infinity;
    this.leaks[e.team].forEach((open, i) => {
      if (!open) return;
      const h = this.holePos(e.team, i), d = Math.hypot(h.x - e.x, h.z - e.z);
      if (mates.some((o) => Math.hypot(h.x - o.x, h.z - o.z) < d - 0.5)) return;
      if (d < gd) { gd = d; goal = h; }
    });
    if (!goal) goal = { x: e.side * (W / 2), z: 1 };
    const dx = goal.x - e.x, dz = goal.z + 0.6 - e.z, d = Math.hypot(dx, dz);
    e.ix = d > 0.4 ? dx / d : 0; e.iz = d > 0.4 ? dz / d : 0;
    if (gd < REACH * 0.9 && Math.random() < 0.7) this.plug(e);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    // Se abre una pérdida en el mismo agujero de los dos diques
    if (this.t >= this.next) {
      this.next = this.t + Math.max(0.55, 1.6 - this.tt * 0.03) * rand(0.8, 1.2);
      const closed = this.leaks[0].map((v, i) => (!v && !this.leaks[1][i] ? i : -1)).filter((i) => i >= 0);
      if (closed.length) { const i = closed[Math.floor(Math.random() * closed.length)]; this.leaks[0][i] = this.t; this.leaks[1][i] = this.t; }
    }
    for (let t = 0; t < 2; t++) for (const open of this.leaks[t]) if (open) this.water[t] += dt * (1 + Math.min(2, (this.t - open) * 0.25)) * (t === this.solo ? 0.45 : 1);
    for (const e of this.ents) {
      moveEnt(e, dt, { slow: e.team === this.solo ? 1.55 : 1 });
      e.x = e.team ? Math.max(0.6, Math.min(W, e.x)) : Math.max(-W, Math.min(-0.6, e.x));
      e.z = Math.max(-0.6, Math.min(4.5, e.z));
    }
    collide(this.ents, 0.5, 0.3);
  }
  snapshot() {
    return {
      ...this.base(), holeX: this.holeX, water: this.water.map(r2),
      leaks: this.leaks.map((l) => l.map((v) => (v ? 1 : 0)).join('')),
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), plugging: this.t - e.plugT < 0.3,
        st: `💧 ${Math.round(this.water[e.team])} · 🧱 ${e.plugs}` })),
    };
  }
  winnerTeam() { const [a, b] = this.water; return Math.abs(a - b) < 0.5 ? null : a < b ? 0 : 1; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.plugs })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Dique };
