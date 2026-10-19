// Slalom en el Catedral: cada uno baja por su pista esquivando pinos y pasando entre las banderas.
// Todos tienen la misma pista (así es justo). Cada bandera que te salteás suma 2 segundos.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Slalom en el Catedral',
  instructions: 'Bajás esquiando solo: con ◀ y ▶ te movés para los costados. Pasá ENTRE las dos banderas de cada puerta (si te salteás una, son 2 segundos más) y no te choques los pinos ni las piedras. ¡Gana el que llega abajo con mejor tiempo!',
  control: 'lr',
  modes: ['ffa', 'duel'],
  board: 'bariloche',
};

const LEN = 140, HALF = 2.6, PENALTY = 2;

class Ski extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40; this.order = [];
    // Puertas cada 9 metros y obstáculos entre medio, iguales para todos
    this.gates = []; this.obs = [];
    for (let z = 12; z < LEN - 6; z += 9) {
      const x = rand(-1.5, 1.5);
      this.gates.push({ z, x });
      const oz = z + 4.5;
      if (oz < LEN - 6) this.obs.push({ z: oz, x: clamp(-x + rand(-0.8, 0.8), -2, 2), kind: Math.random() < 0.7 ? 'pino' : 'piedra' });
    }
    this.ents = players.map((p) => ({ id: p.id, x: 0, z: 0, v: 0, ix: 0, gate: 0, passed: 0, missed: 0, crashT: -9, fin: 0, time: 0, botErr: rand(0.2, 0.5), botT: 0, aim: 0 }));
  }
  input(id, m) {
    const e = this.get(id);
    if (e && m.t === 'input') e.ix = clamp(num(m.x), -1, 1);
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e || !this.started || e.fin) return;
    if ((e.botT -= dt) <= 0) {
      e.botT = 0.25;
      // Apunta a la próxima puerta; si hay un obstáculo más cerca en su línea, lo esquiva
      const g = this.gates.find((o) => o.z > e.z + 0.5);
      const o = this.obs.find((k) => k.z > e.z && k.z - e.z < 6);
      let aim = g ? g.x + rand(-e.botErr, e.botErr) : 0;
      if (o && (!g || o.z < g.z) && Math.abs(o.x - aim) < 1) aim = o.x + (o.x > 0 ? -1.4 : 1.4);
      e.aim = aim;
    }
    const d = e.aim - e.x;
    e.ix = Math.abs(d) < 0.15 ? 0 : Math.sign(d);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    const over = this.ents.every((e) => e.fin) || this.tt >= this.duration;
    if (over) { this.endT = this.endT ?? this.t; if (this.t - this.endT > 1) this.done = true; return; }
    for (const e of this.ents) {
      if (e.fin) continue;
      e.time = this.tt;
      const crashed = this.t - e.crashT < 1;
      e.v = crashed ? 0 : Math.min(12, e.v + dt * 6);
      const z0 = e.z;
      e.z += e.v * dt;
      if (!crashed) e.x = clamp(e.x + e.ix * 5.5 * dt, -HALF, HALF);
      // Puertas: al cruzar la línea, ¿pasó entre las banderas?
      while (e.gate < this.gates.length && this.gates[e.gate].z <= e.z) {
        const g = this.gates[e.gate++];
        if (Math.abs(e.x - g.x) <= 0.95) { e.passed++; this.event(e.id, '¡Bien!', 'good'); }
        else { e.missed++; this.event(e.id, `+${PENALTY}s`, 'bad'); this.cue(e.id, { text: '🚩 ¡Te salteaste una puerta! +2 s', buzz: 120 }); }
      }
      for (const o of this.obs) {
        if (o.z > z0 && o.z <= e.z + 0.3 && Math.abs(o.x - e.x) < 0.7 && !crashed) {
          e.crashT = this.t; e.v = 0;
          this.event(e.id, '¡PUM!', 'bad');
          this.cue(e.id, { text: o.kind === 'pino' ? '🌲 ¡Te comiste un pino!' : '🪨 ¡Piedra!', buzz: 300 });
        }
      }
      if (e.z >= LEN) {
        e.z = LEN; e.fin = this.order.push(e.id);
        e.final = e.time + e.missed * PENALTY;
        this.event(e.id, `¡${e.final.toFixed(1)} s!`, 'gold');
        this.cue(e.id, { text: `⛷️ ¡Llegaste! ${e.final.toFixed(1)} s`, buzz: 200 });
      }
    }
  }
  snapshot() {
    return {
      ...this.base(), len: LEN, half: HALF, gates: this.gates, obs: this.obs,
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), crash: this.t - e.crashT < 1, fin: e.fin,
        st: e.fin ? `⏱️ ${e.final.toFixed(1)} s` : `🚩 ${e.passed}/${this.gates.length}` })),
    };
  }
  // Los que llegaron, por tiempo final; después los que no, por cuánto bajaron
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.fin ? 100000 - Math.round(e.final * 100) : Math.round(e.z) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Ski };
