// Subte en Hora Pico: en cada estación se liberan unos asientos. Sentate antes que los demás.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Subte en Hora Pico',
  instructions: 'Vamos en la línea A en hora pico. En cada estación se levanta gente y quedan asientos libres (brillan). ¡Corré y sentate antes que los demás! Cada estación que viajás sentado suma un punto.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'baires',
};

const LX = 8, LZ = 1.6, SEATS_PER_SIDE = 7, STATIONS = 6;
const STATION_NAMES = ['Perú', 'Piedras', 'Lima', 'Sáenz Peña', 'Congreso', 'Pasco', 'Alberti', 'Plaza Miserere'];

class Subte extends Minigame {
  constructor(players) {
    super(players);
    // Asientos a los dos costados del vagón
    this.seats = [];
    for (const side of [-1, 1]) for (let i = 0; i < SEATS_PER_SIDE; i++) this.seats.push({ x: -LX + 1.2 + i * ((2 * LX - 2.4) / (SEATS_PER_SIDE - 1)), z: side * (LZ + 0.3), free: false, by: null });
    this.station = 0; this.phase = 'ride'; this.phaseEnd = 3 + 2.5;
    this.names = [...STATION_NAMES].sort(() => Math.random() - 0.5);
    this.ents = players.map((p, i) => ({ id: p.id, x: -3 + i * 1.3, z: 0, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, seat: -1, score: 0, botT: 0 }));
  }
  input(id, m) { const e = this.get(id); if (e && e.seat < 0) joyInput(e, m); }
  openSeats() {
    this.station++;
    for (const s of this.seats) { s.free = false; s.by = null; }
    for (const e of this.ents) e.seat = -1;
    // Quedan libres menos asientos que jugadores (como las sillas, pero sin eliminar a nadie)
    const free = Math.max(1, this.n - 1);
    const idx = this.seats.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, free);
    for (const i of idx) this.seats[i].free = true;
    this.phase = 'station'; this.phaseEnd = this.t + 4;
    for (const e of this.ents) this.cue(e.id, { text: `🚇 ¡${this.names[this.station - 1]}! Asientos libres`, buzz: 80 });
  }
  bot(id, dt) {
    const e = this.get(id); if (!e || e.seat >= 0) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    if (this.phase !== 'station') { e.ix = -e.x * 0.05; e.iz = -e.z * 0.3; return; }
    let best = null, bd = 99;
    this.seats.forEach((s) => { if (!s.free || s.by) return; const d = Math.hypot(s.x - e.x, s.z - e.z) + rand(0, 1.5); if (d < bd) { bd = d; best = s; } });
    if (!best) { e.ix = e.iz = 0; return; }
    const dx = best.x - e.x, dz = best.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d; e.iz = dz / d;
  }
  step(dt) {
    this.t += dt;
    for (const e of this.ents) {
      if (e.seat >= 0) { const s = this.seats[e.seat]; e.x = s.x; e.z = s.z * 0.85; e.vx = e.vz = 0; continue; }
      // Mientras el vagón anda, se tambalean
      if (this.phase === 'ride' && this.started) e.vx += Math.sin(this.t * 1.7) * 2 * dt;
      moveEnt(e, dt, { slow: 0.75 });
      e.x = Math.max(-LX + 0.4, Math.min(LX - 0.4, e.x)); e.z = Math.max(-LZ - 0.3, Math.min(LZ + 0.3, e.z));
    }
    collide(this.ents.filter((e) => e.seat < 0), 0.55, 0.6);
    if (!this.started) return;
    if (this.phase === 'station') {
      for (const e of this.ents) {
        if (e.seat >= 0) continue;
        const i = this.seats.findIndex((s) => s.free && !s.by && Math.hypot(s.x - e.x, s.z - e.z) < 0.85);
        if (i >= 0) {
          this.seats[i].by = e.id; e.seat = i;
          this.event(e.id, '¡Sentado!', 'good');
          this.cue(e.id, { text: '💺 ¡Conseguiste asiento!', buzz: 60 });
        }
      }
      if (this.t >= this.phaseEnd || this.seats.every((s) => !s.free || s.by)) {
        for (const e of this.ents) if (e.seat >= 0) e.score++; else this.event(e.id, '¡Parado!', 'bad');
        this.phase = 'ride'; this.phaseEnd = this.t + 2.6;
      }
    } else if (this.t >= this.phaseEnd) {
      if (this.station >= STATIONS) { this.done = true; return; }
      this.openSeats();
    }
  }
  snapshot() {
    return {
      ...this.base(), phase: this.phase, station: this.station, stations: STATIONS, name: this.names[Math.max(0, this.station - 1)],
      seats: this.seats.map((s) => ({ x: r2(s.x), z: r2(s.z), free: s.free && !s.by })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), sit: e.seat >= 0, st: `💺 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Subte };
