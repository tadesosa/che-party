// Fileteado Porteño: el pincel avanza solo. Con el joystick lo subís y bajás para seguir la línea del filete.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Fileteado Porteño',
  instructions: 'El pincel avanza solo por tu cartel. Mové el joystick para arriba y abajo y seguí la línea dorada del filete. ¡Cuanto más tiempo pintes arriba de la línea, más puntos! Son tres trazos, cada uno más enrulado.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'baires',
};

const LEN = 16, STROKES = 3, SPEED = 3.2, TOL = 0.38;

// La línea: suma de ondas, más enrulada en cada trazo
function makeLine(k) {
  const waves = Array.from({ length: 2 + k }, (_, i) => ({ a: rand(0.3, 0.9) / (i + 1) * (1 + k * 0.3), f: rand(0.25, 0.5) * (i + 1), p: rand(0, 6) }));
  return (x) => Math.max(-1.6, Math.min(1.6, waves.reduce((s, w) => s + w.a * Math.sin(x * w.f + w.p), 0)));
}

class Fileteado extends Minigame {
  constructor(players) {
    super(players);
    this.stroke = 0; this.phase = 'wait'; this.phaseEnd = 3.6;
    this.ents = players.map((p) => ({ id: p.id, z: 0, iz: 0, on: 0, total: 0, score: 0, trail: [], botLag: rand(0.15, 0.35), botNoise: rand(0.1, 0.3) }));
  }
  newStroke() {
    this.stroke++;
    this.lineFn = makeLine(this.stroke - 1);
    this.line = Array.from({ length: 33 }, (_, i) => r2(this.lineFn((i / 32) * LEN)));
    this.x = 0; this.phase = 'paint';
    for (const e of this.ents) { e.z = this.lineFn(0); e.trail = []; e.on = 0; e.total = 0; }
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'input') e.iz = clamp(-num(m.y), -1, 1); }
  bot(id) {
    const e = this.get(id); if (!e || this.phase !== 'paint') return;
    const target = this.lineFn(Math.min(LEN, this.x + e.botLag * SPEED)) + Math.sin(this.t * 3 + e.botLag * 20) * e.botNoise;
    e.iz = clamp((target - e.z) * 2.5, -1, 1);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'paint') {
      this.x += SPEED * dt;
      const want = this.lineFn(Math.min(this.x, LEN));
      for (const e of this.ents) {
        e.z = clamp(e.z + e.iz * 2.8 * dt, -2, 2);
        e.total += dt;
        if (Math.abs(e.z - want) < TOL) e.on += dt;
        if (!e.trail.length || this.x - e.trail[e.trail.length - 1][0] > 0.35) e.trail.push([r2(this.x), r2(e.z)]);
      }
      if (this.x >= LEN) {
        for (const e of this.ents) {
          const pct = Math.round((e.on / e.total) * 100);
          e.score += pct; e.last = pct;
          this.event(e.id, `${pct}%`, pct > 75 ? 'gold' : pct > 50 ? 'good' : 'bad');
          this.cue(e.id, { text: `🖌️ Trazo ${this.stroke}: ${pct}% sobre la línea` });
        }
        this.phase = 'show'; this.phaseEnd = this.t + 1.8;
      }
    } else if (this.t >= this.phaseEnd) {
      if (this.phase === 'show') { this.phase = 'wait'; this.phaseEnd = this.t + 0.6; }
      else { if (this.stroke >= STROKES) { this.done = true; return; } this.newStroke(); }
    }
  }
  snapshot() {
    return {
      ...this.base(), phase: this.phase, stroke: this.stroke, strokes: STROKES, len: LEN, tol: TOL,
      x: r2(this.x || 0), line: this.line || null,
      ents: this.ents.map((e) => ({ id: e.id, z: r2(e.z), trail: e.trail, st: `🖌️ ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Fileteado };
