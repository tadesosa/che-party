// Arreá los Pingüinos: los pingüinos andan sueltos y se escapan de los jugadores. Cada uno tiene su corral
// de su color: arrealos (acercate del lado de atrás) para que entren. El que tiene más pingüinos en su corral gana.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Arreá los Pingüinos',
  instructions: 'Los pingüinos se escapan cuando te acercás. Cada uno tiene su corral (el círculo de su color en el borde): poné al pingüino entre vos y tu corral y empujalo para que entre. Los que entran quedan adentro. ¡Gana el que junta más pingüinos!',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'sur',
};

const R = 9.5, PEN = 1.9, SCARE = 2.6;

class Pinguinos extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35;
    this.pens = players.map((p, i) => { const a = (i / this.n) * Math.PI * 2 + Math.PI / 2; return { id: p.id, x: Math.cos(a) * (R + 0.6), z: Math.sin(a) * (R * 0.75 + 0.6) }; });
    this.pens.forEach((pen) => { pen.x *= 0.9; pen.z *= 0.9; });
    this.pgs = []; this.pId = 0;
    for (let i = 0; i < 6 + this.n * 2; i++) this.spawn();
    this.next = 3 + 4;
    this.ents = players.map((p, i) => { const pen = this.pens[i]; return { id: p.id, x: pen.x * 0.6, z: pen.z * 0.6, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, got: 0, pen, botT: 0, target: null }; });
  }
  spawn() { const a = rand(0, Math.PI * 2), r = rand(0, 3); this.pgs.push({ id: ++this.pId, x: Math.cos(a) * r, z: Math.sin(a) * r, vx: 0, vz: 0, wander: rand(0, 6.3), owner: null }); }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) <= 0) {
      e.botT = 0.3;
      // Elige el pingüino suelto más cercano a su corral
      const free = this.pgs.filter((p) => !p.owner);
      e.target = free.sort((a, b) => Math.hypot(a.x - e.pen.x, a.z - e.pen.z) - Math.hypot(b.x - e.pen.x, b.z - e.pen.z))[0] || null;
    }
    const p = e.target;
    if (!p || p.owner) { e.ix = 0; e.iz = 0; return; }
    // Se pone del otro lado del pingüino (mirando al corral) y empuja
    const dx = e.pen.x - p.x, dz = e.pen.z - p.z, d = Math.hypot(dx, dz) || 1;
    const behind = { x: p.x - (dx / d) * 1.6, z: p.z - (dz / d) * 1.6 };
    const far = Math.hypot(behind.x - e.x, behind.z - e.z) > 0.8;
    const gx = far ? behind.x : p.x, gz = far ? behind.z : p.z;
    const mx = gx - e.x, mz = gz - e.z, md = Math.hypot(mx, mz) || 1;
    e.ix = mx / md; e.iz = mz / md;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    if (this.t >= this.next) { this.next = this.t + 2.5; if (this.pgs.filter((p) => !p.owner).length < 8) this.spawn(); }
    for (const e of this.ents) {
      moveEnt(e, dt, { slow: 0.9 });
      const k = Math.hypot(e.x / R, e.z / (R * 0.75));
      if (k > 1) { e.x /= k; e.z /= k; }
    }
    collide(this.ents, 0.55, 0.4);
    for (const p of this.pgs) {
      if (p.owner) continue;
      // Se escapa de los jugadores cercanos; si no, camina tranquilo
      let fx = 0, fz = 0;
      for (const e of this.ents) {
        const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
        if (d < SCARE && d > 0.01) { fx += (dx / d) * (SCARE - d); fz += (dz / d) * (SCARE - d); }
      }
      p.wander += rand(-1, 1) * dt * 3;
      fx += Math.cos(p.wander) * 0.3; fz += Math.sin(p.wander) * 0.3;
      p.vx += (fx * 3.2 - p.vx) * Math.min(1, dt * 4); p.vz += (fz * 3.2 - p.vz) * Math.min(1, dt * 4);
      const sp = Math.hypot(p.vx, p.vz); if (sp > 4.2) { p.vx *= 4.2 / sp; p.vz *= 4.2 / sp; }
      p.x += p.vx * dt; p.z += p.vz * dt;
      const k = Math.hypot(p.x / R, p.z / (R * 0.75));
      if (k > 1) { p.x /= k; p.z /= k; p.vx *= -0.5; p.vz *= -0.5; }
      // ¿Entró a un corral?
      const pen = this.pens.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < PEN);
      if (pen) {
        p.owner = pen.id; const e = this.get(pen.id);
        if (e) { e.got++; this.event(e.id, '¡Adentro!', 'good'); this.cue(e.id, { buzz: 40 }); }
      }
    }
    collide(this.pgs.filter((p) => !p.owner), 0.3, 0.2);
    // Los que ya están en un corral se acomodan adentro
    for (const p of this.pgs) if (p.owner) { const pen = this.pens.find((q) => q.id === p.owner); const i = this.pgs.filter((o) => o.owner === p.owner).indexOf(p); const a = i * 2.4; p.x = pen.x + Math.cos(a) * 0.35 * Math.sqrt(i); p.z = pen.z + Math.sin(a) * 0.35 * Math.sqrt(i); }
  }
  snapshot() {
    return {
      ...this.base(), r: R, pen: PEN, pens: this.pens.map((p) => ({ id: p.id, x: r2(p.x), z: r2(p.z) })),
      pgs: this.pgs.map((p) => ({ id: p.id, x: r2(p.x), z: r2(p.z), a: r2(Math.atan2(p.vx, p.vz)), in: !!p.owner })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), st: `🐧 ${e.got}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.got })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Pinguinos };
