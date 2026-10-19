// Glaciar Perito Moreno: el hielo se agrieta y se cae al lago. El último que queda parado gana.
const { Minigame, moveEnt, joyInput, collide, rand, r2 } = require('./common');

const meta = {
  title: 'Glaciar Perito Moreno',
  instructions: 'El hielo se agrieta (se pone celeste oscuro) y después se cae al agua. Movete con el joystick para no caerte. ¡El último que queda arriba gana!',
  control: 'joystick',
  modes: ['ffa', 'duel'],
};

const N = 8, SIZE = 1.9; // grilla de 8x8 bloques

class Glaciar extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 45;
    this.tiles = new Array(N * N).fill(0); // 0 firme, 1 agrietado, 2 caído
    this.crackAt = new Array(N * N).fill(0);
    this.nextCrack = 0; this.out = [];
    const half = ((N - 1) * SIZE) / 2;
    this.half = half;
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 4, z: Math.sin(a) * 4, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, alive: true, y: 0, vy: 0, botT: 0 };
    });
  }
  tileAt(x, z) {
    const i = Math.round((x + this.half) / SIZE), j = Math.round((z + this.half) / SIZE);
    if (i < 0 || j < 0 || i >= N || j >= N) return -1;
    return j * N + i;
  }
  tilePos(k) { return { x: (k % N) * SIZE - this.half, z: Math.floor(k / N) * SIZE - this.half }; }
  input(id, m) { const e = this.get(id); if (e && e.alive) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e || !e.alive) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = rand(0.15, 0.35);
    const here = this.tileAt(e.x, e.z);
    if (here >= 0 && this.tiles[here] === 0 && Math.random() < 0.6) { e.ix = 0; e.iz = 0; return; }
    // Buscar el bloque firme más cercano
    let best = null, bd = 1e9;
    this.tiles.forEach((s, k) => {
      if (s !== 0) return;
      const p = this.tilePos(k), d = Math.hypot(p.x - e.x, p.z - e.z) + Math.random() * 1.5;
      if (d < bd) { bd = d; best = p; }
    });
    if (!best) return;
    const d = Math.hypot(best.x - e.x, best.z - e.z) || 1;
    e.ix = (best.x - e.x) / d; e.iz = (best.z - e.z) / d;
  }
  step(dt) {
    this.t += dt;
    for (const e of this.ents) if (!e.alive) { e.vy -= 25 * dt; e.y += e.vy * dt; }
    if (!this.started) return;
    const tt = this.tt;
    // Cada vez se agrietan más bloques
    if (this.t >= this.nextCrack) {
      this.nextCrack = this.t + Math.max(0.35, 1.3 - tt * 0.03);
      const firm = this.tiles.map((s, k) => (s === 0 ? k : -1)).filter((k) => k >= 0);
      const count = tt > 20 ? 2 : 1;
      for (let c = 0; c < count && firm.length; c++) {
        const k = firm.splice(Math.floor(Math.random() * firm.length), 1)[0];
        this.tiles[k] = 1; this.crackAt[k] = this.t;
      }
    }
    this.tiles.forEach((s, k) => { if (s === 1 && this.t - this.crackAt[k] > 1.4) this.tiles[k] = 2; });
    const live = this.ents.filter((e) => e.alive);
    for (const e of live) moveEnt(e, dt, { accel: 38, friction: 5 });
    collide(live, 0.55, 0.6);
    for (const e of live) {
      const k = this.tileAt(e.x, e.z);
      if (k < 0 || this.tiles[k] === 2) {
        e.alive = false; e.vy = 2; this.out.push(e.id);
        this.event(e.id, '¡AL AGUA!', 'bad');
        this.cue(e.id, { text: '🥶 ¡Te caíste al lago!', buzz: 400 });
      }
    }
    const alive = this.ents.filter((e) => e.alive).length;
    if ((this.n > 1 && alive <= 1) || alive === 0 || tt >= this.duration) this.done = true;
  }
  snapshot() {
    return {
      ...this.base(), tiles: this.tiles.join(''), n: N, size: SIZE,
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), y: r2(e.y), ang: r2(e.ang), alive: e.alive, st: e.alive ? '🧊 Arriba' : '🥶 Al agua' })),
    };
  }
  ranking() {
    const alive = this.ents.filter((e) => e.alive);
    const res = alive.map((e) => ({ id: e.id, score: this.n }));
    [...this.out].reverse().forEach((id, i) => res.push({ id, score: this.n - alive.length - i }));
    return res.sort((a, b) => b.score - a.score);
  }
}

module.exports = { meta, Game: Glaciar };
