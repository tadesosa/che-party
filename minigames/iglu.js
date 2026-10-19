// Armá el Iglú (equipos): aparecen bloques de hielo por la cancha. Agarrás uno caminando encima y lo llevás a
// tu iglú. Con EMPUJAR le hacés soltar el bloque a uno del otro equipo. Gana el equipo con el iglú más alto.
const { Minigame, moveEnt, joyInput, collide, rand, clamp, r2 } = require('./common');

const meta = {
  title: 'Armá el Iglú',
  instructions: 'Celestes contra rojos. Pasá por arriba de un bloque de hielo para agarrarlo y llevalo hasta el iglú de tu equipo. Con EMPUJAR le hacés soltar el bloque a uno del otro equipo. ¡Gana el equipo que pone más bloques! Si estás solo contra tres, llevás dos bloques a la vez, corrés más rápido y cada bloque tuyo vale uno y medio.',
  control: 'joystick',
  action: '💥 ¡EMPUJAR!',
  modes: ['2v2', '1v3'],
  board: 'sur',
};

const W = 11, D = 7, IGLU = [{ x: -9, z: 0 }, { x: 9, z: 0 }];

class Iglu extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 35;
    this.teams = teams;
    this.solo = teams[0].length === 1 ? 0 : teams[1].length === 1 ? 1 : -1;
    this.blocks = []; this.bId = 0;
    for (let i = 0; i < 7; i++) this.addBlock();
    this.built = [0, 0];
    this.ents = players.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      const k = teams[team].indexOf(p.id);
      return { id: p.id, team, x: IGLU[team].x * 0.6, z: (k - (teams[team].length - 1) / 2) * 2.5, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0, carry: 0, cd: 0, pushT: -9, stunT: -9, put: 0, botT: 0, goal: null };
    });
  }
  addBlock() { this.blocks.push({ id: ++this.bId, x: rand(-5.5, 5.5), z: rand(-D + 1, D - 1) }); }
  cap(e) { return e.team === this.solo ? 2 : 1; }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    joyInput(e, m);
    if (m.t === 'action') this.push(e);
  }
  push(e) {
    if (!this.started || this.done || e.cd > 0 || this.t - e.stunT < 0.8) return;
    e.cd = 1; e.pushT = this.t;
    // Empuja al rival más cercano adelante suyo: si llevaba bloques, se le caen
    for (const o of this.ents) {
      if (o.team === e.team) continue;
      if (Math.hypot(o.x - e.x, o.z - e.z) > 1.6) continue;
      o.stunT = this.t;
      const d = Math.hypot(o.x - e.x, o.z - e.z) || 1;
      o.vx += ((o.x - e.x) / d) * 9; o.vz += ((o.z - e.z) / d) * 9;
      if (o.carry) {
        for (let i = 0; i < o.carry; i++) this.blocks.push({ id: ++this.bId, x: clamp(o.x + rand(-1, 1), -W + 1, W - 1), z: clamp(o.z + rand(-1, 1), -D + 1, D - 1) });
        o.carry = 0;
        this.event(o.id, '¡Se le cayó!', 'bad'); this.event(e.id, '¡Afanado!', 'good');
        this.cue(o.id, { text: '💥 ¡Te hicieron soltar el bloque!', buzz: 300 });
      }
    }
  }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.3;
    const foe = this.ents.find((o) => o.team !== e.team && o.carry && Math.hypot(o.x - e.x, o.z - e.z) < 3);
    if (foe && Math.random() < 0.5) { e.goal = { x: foe.x, z: foe.z }; if (Math.hypot(foe.x - e.x, foe.z - e.z) < 1.4) this.push(e); }
    else if (e.carry >= this.cap(e) || (e.carry && !this.blocks.length)) e.goal = IGLU[e.team];
    else {
      const b = this.blocks.slice().sort((a, c) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(c.x - e.x, c.z - e.z))[0];
      e.goal = b ? { x: b.x, z: b.z } : IGLU[e.team];
    }
    const dx = e.goal.x - e.x, dz = e.goal.z - e.z, d = Math.hypot(dx, dz) || 1;
    e.ix = dx / d; e.iz = dz / d;
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.tt >= this.duration) { this.done = true; return; }
    while (this.blocks.length < 6) this.addBlock();
    for (const e of this.ents) {
      e.cd = Math.max(0, e.cd - dt);
      if (this.t - e.stunT < 0.8) { e.ix *= 0; e.iz *= 0; }
      moveEnt(e, dt, { slow: (e.team === this.solo ? 1.2 : 1) * (e.carry ? 0.85 : 1) });
      e.x = clamp(e.x, -W, W); e.z = clamp(e.z, -D, D);
      if (e.carry < this.cap(e)) {
        const b = this.blocks.find((k) => Math.hypot(k.x - e.x, k.z - e.z) < 0.9);
        if (b) { this.blocks = this.blocks.filter((k) => k !== b); e.carry++; }
      }
      const ig = IGLU[e.team];
      if (e.carry && Math.hypot(ig.x - e.x, ig.z - e.z) < 2) {
        // Los bloques del que está solo valen uno y medio (es uno contra tres)
        this.built[e.team] += e.carry * (e.team === this.solo ? 1.5 : 1); e.put += e.carry;
        this.event(e.id, `+${e.carry} 🧊`, 'good'); this.cue(e.id, { buzz: 50 });
        e.carry = 0;
      }
    }
    collide(this.ents, 0.55, 0.4);
  }
  snapshot() {
    return {
      ...this.base(), built: this.built.map(Math.floor), iglu: IGLU,
      blocks: this.blocks.map((b) => ({ id: b.id, x: r2(b.x), z: r2(b.z) })),
      ents: this.ents.map((e) => ({ id: e.id, team: e.team, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), carry: e.carry, push: this.t - e.pushT < 0.3, stun: this.t - e.stunT < 0.8,
        st: `🧊 ${Math.floor(this.built[e.team])} · ${e.put} míos` })),
    };
  }
  winnerTeam() { return this.built[0] === this.built[1] ? null : this.built[0] > this.built[1] ? 0 : 1; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.put })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Iglu };
