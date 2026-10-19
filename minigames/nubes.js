// Equilibrio en el Tren a las Nubes: vas parado en el techo del vagón con una bandeja de empanadas.
// El tren dobla y se sacude (igual para todos); con ◀ y ▶ mantenés la bandeja derecha. Si se inclina mucho,
// se te caen las empanadas y tardás en volver a cargar.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Equilibrio en el Tren a las Nubes',
  instructions: 'Vas en el techo del Tren a las Nubes con una bandeja de empanadas. El tren dobla y se sacude, y la bandeja se te va para un costado: mantené apretado ◀ o ▶ para enderezarla. Mientras esté derecha sumás puntos (más si está bien derechita). Si se inclina demasiado, ¡se caen las empanadas! Gana el que más puntos junta.',
  control: 'lr',
  modes: ['ffa', 'duel'],
  board: 'norte',
};

const FALL = 1, GOOD = 0.25;

class Nubes extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 30;
    // Curvas y sacudones del tren (iguales para todos): una suma de ondas
    this.waves = Array.from({ length: 4 }, () => ({ a: rand(0.5, 1.1), f: rand(0.25, 0.9), ph: rand(0, 6.3) }));
    this.bumps = []; for (let t = 4; t < 40; t += rand(1.8, 3.5)) this.bumps.push({ t, s: rand(-2.6, 2.6) });
    this.ents = players.map((p) => ({ id: p.id, th: 0, w: 0, u: 0, pts: 0, falls: 0, fallT: -9, botU: 0, botDelay: rand(0.12, 0.25), hist: [], gain: rand(1.6, 2.4) }));
  }
  push(t) {
    // Fuerza de las curvas en el momento t (más fuerte a medida que pasa el tiempo)
    let f = 0; for (const w of this.waves) f += w.a * Math.sin(t * w.f * 2 + w.ph);
    return f * (1 + Math.max(0, t - 3) * 0.035);
  }
  input(id, m) { const e = this.get(id); if (e && m.t === 'input') e.u = clamp(num(m.x), -1, 1); }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !this.started) return;
    // Corrige mirando cómo estaba hace un ratito (reacción humana) y con ganas de más o de menos
    e.hist.push(e.th + e.w * 0.3); if (e.hist.length > Math.round(e.botDelay * 30)) { const old = e.hist.shift(); e.botU = clamp(-old * e.gain, -1, 1); }
    e.u = Math.abs(e.botU) < 0.25 ? 0 : Math.sign(e.botU);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    const f = this.push(this.tt);
    const bump = this.bumps.find((b) => Math.abs(b.t - this.tt) < dt);
    for (const e of this.ents) {
      if (this.t - e.fallT < 1.5) { e.th *= 0.9; e.w = 0; continue; }
      // Péndulo inestable: la gravedad la tira para el lado que ya está inclinada
      e.w += (e.th * 2.2 + f * 0.9 + e.u * 3.2) * dt + (bump ? bump.s * 0.5 : 0);
      e.w *= Math.exp(-1.2 * dt);
      e.th += e.w * dt;
      if (Math.abs(e.th) >= FALL) {
        e.falls++; e.fallT = this.t; e.th = 0; e.w = 0;
        this.event(e.id, '¡Se cayeron!', 'bad'); this.cue(e.id, { text: '🥟 ¡Se te cayeron las empanadas!', buzz: 400 });
        continue;
      }
      e.pts += dt * (Math.abs(e.th) < GOOD ? 2 : 1);
    }
  }
  snapshot() {
    return {
      ...this.base(), fall: FALL, good: GOOD, sway: r2(this.push(this.tt) * 0.06),
      ents: this.ents.map((e) => ({ id: e.id, th: r2(e.th), fallen: this.t - e.fallT < 1.5, st: `🥟 ${Math.floor(e.pts)}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: Math.floor(e.pts * 10) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Nubes };
