// Parapente en las Sierras: volás siempre para adelante y con el joystick doblás. Vas bajando de a poco:
// las térmicas (remolinos de aire caliente) te suben. Pasá por los aros dorados para sumar puntos.
const { Minigame, clamp, num, rand, r2 } = require('./common');

const meta = {
  title: 'Parapente en las Sierras',
  instructions: 'Volás en parapente: siempre vas para adelante y con el joystick doblás hacia donde quieras. Vas bajando de a poco: metete en las térmicas (remolinos) para subir. Pasá por los aros dorados para sumar puntos. Si llegás al piso, aterrizás y no sumás más. ¡Gana el que junta más aros!',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'cordoba',
};

const W = 15, D = 10, SPEED = 5.2, TURN = 2.4;

class Parapente extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 35;
    this.rings = []; this.therms = []; this.rId = 0;
    for (let i = 0; i < 4; i++) this.addRing();
    for (let i = 0; i < 3; i++) this.addThermal();
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 4, z: Math.sin(a) * 3, hd: a + Math.PI / 2, alt: 6, ix: 0, iz: 0, rings: 0, landed: 0, lift: false, botT: 0, gx: 0, gz: 0 };
    });
  }
  addRing() { this.rings.push({ id: ++this.rId, x: rand(-W + 2, W - 2), z: rand(-D + 2, D - 2), alt: rand(2.5, 6), gold: Math.random() < 0.2 }); }
  addThermal() { this.therms.push({ x: rand(-W + 3, W - 3), z: rand(-D + 3, D - 3), r: rand(1.8, 2.6), life: rand(6, 10), vx: rand(-0.6, 0.6), vz: rand(-0.4, 0.4) }); }
  input(id, m) { const e = this.get(id); if (e && m.t === 'input') { e.ix = clamp(num(m.x), -1, 1); e.iz = clamp(num(m.y), -1, 1); } }
  bot(id, dt) {
    const e = this.get(id); if (!e || e.landed) return;
    if ((e.botT -= dt) <= 0) {
      e.botT = 0.4;
      const near = (list) => list.slice().sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
      const goal = e.alt < 2.6 ? near(this.therms) : near(this.rings.filter((r) => Math.abs(r.alt - e.alt) < 3)) || near(this.therms);
      if (goal) { e.gx = goal.x + rand(-0.6, 0.6); e.gz = goal.z + rand(-0.6, 0.6); }
    }
    const dx = e.gx - e.x, dz = e.gz - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d; e.iz = dz / d;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration || this.ents.every((e) => e.landed)) { this.endT = this.endT ?? this.t; if (this.t - this.endT > 1) this.done = true; return; }
    for (const th of this.therms) { th.life -= dt; th.x += th.vx * dt; th.z += th.vz * dt; }
    this.therms = this.therms.filter((th) => th.life > 0);
    while (this.therms.length < 3) this.addThermal();
    for (const e of this.ents) {
      if (e.landed) continue;
      // Doblar hacia donde apunta el joystick (de a poco, como un parapente)
      if (Math.hypot(e.ix, e.iz) > 0.25) {
        const want = Math.atan2(e.ix, e.iz);
        let d = want - e.hd; d = Math.atan2(Math.sin(d), Math.cos(d));
        e.hd += clamp(d, -TURN * dt, TURN * dt);
      }
      e.x += Math.sin(e.hd) * SPEED * dt; e.z += Math.cos(e.hd) * SPEED * dt;
      // Contra los bordes, el viento te da vuelta
      if (Math.abs(e.x) > W) { e.x = Math.sign(e.x) * W; e.hd = -e.hd; }
      if (Math.abs(e.z) > D) { e.z = Math.sign(e.z) * D; e.hd = Math.PI - e.hd; }
      const th = this.therms.find((k) => Math.hypot(k.x - e.x, k.z - e.z) < k.r);
      e.lift = !!th;
      e.alt = clamp(e.alt + (th ? 2.6 : -0.42) * dt, 0, 9);
      if (e.alt <= 0) { e.landed = 1; this.event(e.id, '¡Aterrizó!', 'bad'); this.cue(e.id, { text: '🪂 Aterrizaste. ¡Buen vuelo!', buzz: 200 }); continue; }
      for (const r of this.rings) {
        if (r.taken) continue;
        if (Math.hypot(r.x - e.x, r.z - e.z) < 1.3 && Math.abs(r.alt - e.alt) < 1.4) {
          r.taken = true; e.rings += r.gold ? 3 : 1;
          this.event(e.id, r.gold ? '¡Aro de oro! +3' : '+1', r.gold ? 'gold' : 'good');
          this.cue(e.id, { buzz: 40 });
        }
      }
    }
    this.rings = this.rings.filter((r) => !r.taken);
    while (this.rings.length < 4) this.addRing();
  }
  snapshot() {
    return {
      ...this.base(), w: W, d: D,
      rings: this.rings.map((r) => ({ id: r.id, x: r2(r.x), z: r2(r.z), alt: r2(r.alt), gold: r.gold })),
      therms: this.therms.map((k) => ({ x: r2(k.x), z: r2(k.z), r: r2(k.r) })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), hd: r2(e.hd), alt: r2(e.alt), landed: e.landed, lift: e.lift,
        st: `${e.landed ? '🪂' : '⬆️ ' + Math.round(e.alt * 10) + 'm'} · ⭕ ${e.rings}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.rings * 100 + (e.landed ? 0 : Math.round(e.alt)) })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Parapente };
