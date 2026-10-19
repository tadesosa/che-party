// La Bola de Nieve: cada uno empuja su bola por la nieve y la bola crece donde hay nieve nueva.
// Si chocás tu bola contra una más chica, le sacás un pedazo. Cada tanto nieva en algún lado.
const { Minigame, moveEnt, joyInput, rand, r2 } = require('./common');

const meta = {
  title: 'La Bola de Nieve',
  instructions: 'Empujá tu bola de nieve con el joystick: donde hay nieve nueva, la bola crece (donde ya pasó alguien, no). Cuanto más grande, más lenta. Si chocás contra una bola más chica, se le rompe un pedazo y queda nieve desparramada. Cada tanto nieva en algún lado: ¡corré para allá! Gana la bola más grande.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'bariloche',
};

const N = 24, SIZE = 22, CELL = SIZE / N;

class BolaNieve extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 32;
    this.snow = new Array(N * N).fill(1);
    this.nextFall = 3 + 6; this.fall = null;
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 6, z: Math.sin(a) * 4.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: a + Math.PI, snow: 4, bx: 0, bz: 0, hitT: -9, botT: 0, goal: null };
    });
    for (const e of this.ents) this.placeBall(e);
  }
  radius(e) { return 0.35 + Math.sqrt(e.snow) * 0.11; }
  // La nieve se pega solo donde la bola apoya: una franja que crece poco con el tamaño (si no, la grande se come todo)
  grab(e) { return Math.min(0.75, 0.45 + this.radius(e) * 0.15); }
  placeBall(e) { const r = this.radius(e) + 0.45; e.bx = e.x + Math.sin(e.ang) * r; e.bz = e.z + Math.cos(e.ang) * r; }
  cell(x, z) { const i = Math.floor((x + SIZE / 2) / CELL), j = Math.floor((z + SIZE / 2) / CELL); return i >= 0 && j >= 0 && i < N && j < N ? j * N + i : -1; }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.35;
    // Busca nieve nueva cerca (o la nevada), y a veces embiste a una bola más chica
    const prey = this.ents.find((o) => o !== e && o.snow < e.snow * 0.8 && Math.hypot(o.bx - e.bx, o.bz - e.bz) < 4);
    if (prey && Math.random() < 0.3) e.goal = { x: prey.bx, z: prey.bz };
    else if (this.fall && Math.random() < 0.6) e.goal = { x: this.fall.x, z: this.fall.z };
    else if (!e.goal || Math.hypot(e.goal.x - e.bx, e.goal.z - e.bz) < 1 || !this.snow[this.cell(e.goal.x, e.goal.z)]) {
      let best = null, bs = -Infinity;
      for (let k = 0; k < 16; k++) {
        const x = rand(-SIZE / 2 + 1, SIZE / 2 - 1), z = rand(-SIZE / 2 + 1, SIZE / 2 - 1);
        const s = (this.snow[this.cell(x, z)] ? 3 : 0) - Math.hypot(x - e.bx, z - e.bz) * 0.25;
        if (s > bs) { bs = s; best = { x, z }; }
      }
      e.goal = best;
    }
    const dx = e.goal.x - e.x, dz = e.goal.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d; e.iz = dz / d;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    // Nevada: rellena un círculo de la cancha
    if (this.t >= this.nextFall) {
      this.nextFall = this.t + rand(5, 7);
      const x = rand(-7, 7), z = rand(-6, 6);
      this.fall = { x, z, t: this.t };
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const cx = -SIZE / 2 + (i + 0.5) * CELL, cz = -SIZE / 2 + (j + 0.5) * CELL;
        if (Math.hypot(cx - x, cz - z) < 3.2) this.snow[j * N + i] = 1;
      }
    }
    if (this.fall && this.t - this.fall.t > 3) this.fall = null;
    for (const e of this.ents) {
      const r = this.radius(e);
      moveEnt(e, dt, { slow: Math.max(0.4, 1.2 - r * 0.38), accel: 38 });
      const L = SIZE / 2 - 0.6;
      e.x = Math.max(-L, Math.min(L, e.x)); e.z = Math.max(-L, Math.min(L, e.z));
      this.placeBall(e);
      // La bola junta la nieve nueva que pisa
      const gr = this.grab(e);
      for (let dx = -gr; dx <= gr; dx += CELL * 0.6) for (let dz = -gr; dz <= gr; dz += CELL * 0.6) {
        if (dx * dx + dz * dz > gr * gr) continue;
        const c = this.cell(e.bx + dx, e.bz + dz);
        if (c >= 0 && this.snow[c]) { this.snow[c] = 0; e.snow += 0.32; }
      }
    }
    // Choques entre bolas: la más grande le saca un pedazo a la más chica
    for (let i = 0; i < this.ents.length; i++) for (let j = i + 1; j < this.ents.length; j++) {
      const a = this.ents[i], b = this.ents[j];
      const d = Math.hypot(a.bx - b.bx, a.bz - b.bz), min = this.radius(a) + this.radius(b);
      if (d >= min || d === 0) continue;
      const nx = (b.bx - a.bx) / d, nz = (b.bz - a.bz) / d, push = (min - d) / 2 + 0.05;
      a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
      const [big, small] = a.snow >= b.snow ? [a, b] : [b, a];
      if (this.t - small.hitT > 1.2 && Math.hypot(big.vx, big.vz) > 1.5) {
        small.hitT = this.t;
        // Se le cae un pedazo a la chica y queda desparramado como nieve nueva alrededor (no se lo lleva la grande)
        const n = Math.min(small.snow - 2, small.snow * 0.1 + 1);
        if (n > 0) {
          small.snow -= n;
          let k = Math.round(n / 0.32);
          for (let tries = 0; tries < 80 && k > 0; tries++) { const c = this.cell(small.bx + rand(-2.2, 2.2), small.bz + rand(-2.2, 2.2)); if (c >= 0 && !this.snow[c]) { this.snow[c] = 1; k--; } }
          this.event(small.id, '¡Crack!', 'bad'); this.cue(small.id, { text: '💥 ¡Te rompieron la bola!', buzz: 200 });
        }
      }
    }
  }
  snapshot() {
    return {
      ...this.base(), n: N, size: SIZE, snow: this.snow.join(''), fall: this.fall,
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), bx: r2(e.bx), bz: r2(e.bz), r: r2(this.radius(e)), hit: this.t - e.hitT < 0.5,
        st: `☃️ ${Math.round(e.snow)}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: Math.round(e.snow * 10) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: BolaNieve };
