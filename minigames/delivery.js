// Delivery en Moto: agarrá una pizza en la pizzería del medio y llevala a la casa que la pidió. Ojo con los autos.
const { Minigame, moveEnt, joyInput, collide, rand, pick, r2 } = require('./common');

const meta = {
  title: 'Delivery en Moto',
  instructions: 'Pasá por la pizzería del medio para cargar una pizza y llevala a una casa que esté pidiendo (tiene un 📍). ¡Cuidado con los autos que cruzan por las calles! Si te chocan, se te cae la pizza. El que hace más entregas gana.',
  control: 'joystick',
  modes: ['ffa', 'duel'],
  board: 'baires',
};

const FIELD = 9.5;
const STREETS = [-5, 5]; // calles horizontales y verticales en x/z = ±5
const DOORS = [];
for (const x of [-8.5, -2, 2, 8.5]) for (const z of [-8.5, 8.5]) DOORS.push({ x, z });
for (const z of [-2, 2]) for (const x of [-8.5, 8.5]) DOORS.push({ x, z });

class Delivery extends Minigame {
  constructor(players) {
    super(players);
    this.duration = 40;
    this.orders = [];
    this.cars = [];
    this.carId = 0;
    for (let k = 0; k < 4; k++) this.spawnCar();
    for (let k = 0; k < 3; k++) this.newOrder();
    this.ents = players.map((p, i) => {
      const a = (i / this.n) * Math.PI * 2;
      return { id: p.id, x: Math.cos(a) * 1.8, z: Math.sin(a) * 1.8, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, pizza: false, score: 0, stun: 0, botT: 0 };
    });
  }
  newOrder() {
    const free = DOORS.filter((d) => !this.orders.some((o) => o.x === d.x && o.z === d.z));
    const d = pick(free);
    this.orders.push({ x: d.x, z: d.z, id: Math.random() });
  }
  spawnCar() {
    const horiz = Math.random() < 0.5, lane = pick(STREETS), dir = Math.random() < 0.5 ? -1 : 1;
    this.cars.push({ id: ++this.carId, horiz, x: horiz ? -dir * 13 : lane, z: horiz ? lane : -dir * 13, dir, speed: rand(5, 8) });
  }
  input(id, m) { const e = this.get(id); if (e) joyInput(e, m); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.15;
    let g = { x: 0, z: 0 };
    if (e.pizza) g = this.orders.reduce((a, o) => (Math.hypot(o.x - e.x, o.z - e.z) < Math.hypot(a.x - e.x, a.z - e.z) ? o : a), this.orders[0]);
    let dx = g.x - e.x, dz = g.z - e.z;
    const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    // Frena si viene un auto cerca por la calle que va a cruzar
    const danger = this.cars.some((c) => Math.hypot(c.x - (e.x + dx * 1.5), c.z - (e.z + dz * 1.5)) < 2.2);
    const k = danger && Math.random() < 0.7 ? 0 : 1;
    e.ix = dx * k; e.iz = dz * k;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    for (const c of this.cars) { if (c.horiz) c.x += c.dir * c.speed * dt; else c.z += c.dir * c.speed * dt; }
    const before = this.cars.length;
    this.cars = this.cars.filter((c) => Math.abs(c.x) < 14 && Math.abs(c.z) < 14);
    for (let k = this.cars.length; k < before; k++) this.spawnCar();
    for (const e of this.ents) {
      if (e.stun > 0) { e.stun -= dt; e.vx *= 0.9; e.vz *= 0.9; e.x += e.vx * dt; e.z += e.vz * dt; }
      else moveEnt(e, dt, { slow: 0.9 });
      e.x = Math.max(-FIELD, Math.min(FIELD, e.x)); e.z = Math.max(-FIELD, Math.min(FIELD, e.z));
      for (const c of this.cars) {
        if (e.stun > 0 || Math.abs(c.x - e.x) > (c.horiz ? 1.3 : 0.8) || Math.abs(c.z - e.z) > (c.horiz ? 0.8 : 1.3)) continue;
        e.stun = 1.1; e.vx = (c.horiz ? c.dir : 0) * 8; e.vz = (c.horiz ? 0 : c.dir) * 8;
        if (e.pizza) { e.pizza = false; this.event(e.id, '¡Se cayó la pizza!', 'bad'); } else this.event(e.id, '¡Bocinazo!', 'bad');
        this.cue(e.id, { text: '🚗 ¡Te chocaron!', buzz: 400 });
      }
      if (!e.pizza && e.stun <= 0 && Math.hypot(e.x, e.z) < 1.4) { e.pizza = true; this.cue(e.id, { text: '🍕 ¡Llevala a una casa con 📍!', buzz: 50 }); }
      if (e.pizza) {
        const o = this.orders.find((o) => Math.hypot(o.x - e.x, o.z - e.z) < 1.2);
        if (o) {
          e.pizza = false; e.score++;
          this.orders = this.orders.filter((x) => x !== o); this.newOrder();
          this.event(e.id, '¡Entregada! +1', 'gold');
        }
      }
    }
    collide(this.ents, 0.55, 0.5);
  }
  snapshot() {
    return {
      ...this.base(),
      orders: this.orders.map((o) => ({ x: o.x, z: o.z })),
      cars: this.cars.map((c) => ({ id: c.id, x: r2(c.x), z: r2(c.z), horiz: c.horiz, dir: c.dir })),
      ents: this.ents.map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), pizza: e.pizza, stun: e.stun > 0, st: `🍕 ${e.score}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.score })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Delivery };
