// Pintá Caminito: celestes contra rojos pintan las casitas de La Boca. Gana el equipo con más casas de su color.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Pintá Caminito',
  instructions: 'Celestes contra rojos en Caminito. Parate en la puerta de una casita y apretá PINTAR varias veces hasta que quede de tu color. Se pueden repintar las del otro equipo. ¡Al final gana el equipo con más casas pintadas! En 1 contra 3 lo pintado no se tapa, y el que está solo pinta y corre más rápido.',
  control: 'joystick',
  action: '🖌️ ¡PINTAR!',
  modes: ['2v2', '1v3'],
  board: 'baires',
};

const HOUSES = 10, REACH = 1.4, COATS = 8;

class Caminito extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 40;
    this.teams = teams;
    this.solo = teams[0].length === 1 ? 0 : -1;
    // Dos filas de casitas enfrentadas, con la calle en el medio
    this.houses = Array.from({ length: HOUSES }, (_, i) => ({ x: -8 + (i % 5) * 4, z: i < 5 ? -3.6 : 3.6, owner: -1, paint: 0, by: -1 }));
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id);
      return { id: p.id, team, x: (team ? 1 : -1) * 9, z: (k - 1) * 1.2, vx: 0, vz: 0, ix: 0, iz: 0, ang: team ? -Math.PI / 2 : Math.PI / 2, cd: 0, brushT: 0, painted: 0, botT: 0, goal: null };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.brush(e);
  }
  brush(e) {
    if (!this.started || this.done || e.cd > 0) return;
    e.cd = 0.18; e.brushT = 0.2;
    const h = this.houses.find((h) => Math.hypot(h.x - e.x, h.z * 0.75 - e.z) < REACH + 0.6);
    // En 1 contra 3, lo que ya está pintado no se tapa: es una carrera por las casas
    if (!h || h.owner === e.team || (this.solo >= 0 && h.owner >= 0)) return;
    // Si otro equipo la venía pintando, primero hay que taparla
    if (h.by !== e.team) { h.by = e.team; h.paint = 0; }
    // El que está solo pinta un poco más rápido
    h.paint += e.team === this.solo ? 4.5 : 1;
    if (h.paint >= COATS) {
      h.owner = e.team; h.paint = 0; h.by = -1; e.painted++;
      this.event(e.id, '¡Pintada!', 'good');
    }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.17;
    if (!e.goal || e.goal.owner === e.team) {
      const opts = this.houses.filter((h) => h.owner !== e.team && !(this.solo >= 0 && h.owner >= 0)).sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z));
      e.goal = opts[Math.floor(Math.random() * Math.min(3, opts.length))] || null;
    }
    if (!e.goal) { e.ix = e.iz = 0; return; }
    const gx = e.goal.x, gz = e.goal.z * 0.75;
    const dx = gx - e.x, dz = gz - e.z, d = Math.hypot(dx, dz) || 1;
    if (d > REACH) { e.ix = dx / d; e.iz = dz / d; }
    else { e.ix = e.iz = 0; if (Math.random() < 0.75) this.brush(e); }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    // Se termina al acabarse el tiempo, o en 1 contra 3 cuando ya no queda casa sin pintar
    if (this.tt >= this.duration || (this.solo >= 0 && this.houses.every((h) => h.owner >= 0))) { this.endAt = this.endAt ?? this.t; if (this.t - this.endAt > 1.2) this.done = true; return; }
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt); e.brushT = Math.max(0, e.brushT - dt);
      moveEnt(e, dt, { slow: e.team === this.solo ? 1.45 : 1 });
      e.x = Math.max(-10, Math.min(10, e.x)); e.z = Math.max(-2.6, Math.min(2.6, e.z));
    }
    collide(this.ents, 0.6, 0.4);
  }
  counts() { const c = [0, 0]; for (const h of this.houses) if (h.owner >= 0) c[h.owner]++; return c; }
  points() { return this.counts(); }
  snapshot() {
    const c = this.counts();
    return {
      ...this.base(), counts: c,
      houses: this.houses.map((h) => ({ x: h.x, z: h.z, owner: h.owner, paint: h.paint / COATS, by: h.by })),
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), brush: e.brushT > 0, st: `🏠 ${c[e.team]}` })),
    };
  }
  winnerTeam() { const c = this.points(); return c[0] === c[1] ? null : c[0] > c[1] ? 0 : 1; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.painted })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Caminito };
