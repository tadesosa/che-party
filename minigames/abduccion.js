// Abducción en el Uritorco (1 contra 3): uno maneja el ovni y su rayo; los otros tres son campistas.
// Si un campista se queda debajo del rayo un ratito, lo abducen; un compañero puede rescatarlo tocando el lugar donde lo
// levantaron (su carpa). Gana el ovni si abduce a los tres; si no, ganan los campistas.
const { Minigame, moveEnt, joyInput, collide, rand, clamp, r2 } = require('./common');

const meta = {
  title: 'Abducción en el Uritorco',
  instructions: 'Uno contra tres. El que está solo maneja el OVNI: mové el rayo y quedate encima de un campista hasta que lo abducís. Los otros tres son campistas: ¡escapen del rayo! Si un compañero fue abducido, tocá su carpa para rescatarlo. Gana el ovni si se lleva a los tres antes de que termine el tiempo; si no, ganan los campistas.',
  control: 'joystick',
  modes: ['1v3'],
  board: 'cordoba',
};

const W = 11, D = 7.5, BEAM = 1.65, CATCH = 1.0;

class Abduccion extends Minigame {
  constructor(players, { teams }) {
    super(players);
    this.duration = 35;
    this.teams = teams;
    this.ufoId = teams[0][0];
    this.beam = { x: 0, z: -3, vx: 0, vz: 0, ix: 0, iz: 0, ang: 0 };
    this.tents = [];
    this.ents = players.map((p, i) => {
      const ufo = p.id === this.ufoId;
      const k = teams[1].indexOf(p.id);
      return { id: p.id, ufo, x: ufo ? 0 : -6 + k * 6, z: ufo ? -3 : 4, vx: 0, vz: 0, ix: 0, iz: 0, ang: Math.PI, under: 0, out: false, tent: null, saved: 0, botT: 0, gx: 0, gz: 0 };
    });
  }
  input(id, m) {
    const e = this.get(id); if (!e) return;
    if (e.ufo) joyInput(this.beam, m); else joyInput(e, m);
  }
  campers() { return this.ents.filter((e) => !e.ufo); }
  bot(id, dt) {
    const e = this.get(id); if (!e) return;
    if ((e.botT -= dt) > 0) return;
    e.botT = 0.2;
    if (e.ufo) {
      // Persigue al campista libre más cercano, adelantándose un poco
      const prey = this.campers().filter((c) => !c.out).sort((a, b) => Math.hypot(a.x - this.beam.x, a.z - this.beam.z) - Math.hypot(b.x - this.beam.x, b.z - this.beam.z))[0];
      if (!prey) { this.beam.ix = 0; this.beam.iz = 0; return; }
      const dx = prey.x + prey.vx * 0.3 - this.beam.x, dz = prey.z + prey.vz * 0.3 - this.beam.z, d = Math.hypot(dx, dz) || 1;
      this.beam.ix = d > 0.3 ? dx / d : 0; this.beam.iz = d > 0.3 ? dz / d : 0;
      return;
    }
    if (e.out) { e.ix = 0; e.iz = 0; return; }
    // Rescatar a un compañero si el rayo está lejos; si no, escapar del rayo
    const b = this.beam, db = Math.hypot(e.x - b.x, e.z - b.z);
    const tent = this.campers().find((c) => c.out && c.tent && Math.hypot(c.tent.x - b.x, c.tent.z - b.z) > 4);
    if (db < 4.5 || !tent) {
      let fx = e.x - b.x, fz = e.z - b.z; const d = Math.hypot(fx, fz) || 1;
      fx /= d; fz /= d;
      // Los bordes empujan para adentro
      fx += (e.x < -W + 2 ? 1 : e.x > W - 2 ? -1 : 0) * 1.2; fz += (e.z < -D + 2 ? 1 : e.z > D - 2 ? -1 : 0) * 1.2;
      const m = Math.hypot(fx, fz) || 1;
      e.ix = fx / m + rand(-0.4, 0.4); e.iz = fz / m + rand(-0.4, 0.4);
    } else {
      const dx = tent.tent.x - e.x, dz = tent.tent.z - e.z, d = Math.hypot(dx, dz) || 1;
      e.ix = dx / d; e.iz = dz / d;
    }
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    const free = this.campers().filter((c) => !c.out);
    if (this.tt >= this.duration || !free.length) { this.endT = this.endT ?? this.t; if (this.t - this.endT > 1.2) this.done = true; return; }
    const b = this.beam;
    moveEnt(b, dt, { slow: 1.0 });
    b.x = clamp(b.x, -W, W); b.z = clamp(b.z, -D, D);
    const ufo = this.get(this.ufoId);
    if (ufo) { ufo.x = b.x; ufo.z = b.z; }
    for (const e of free) {
      moveEnt(e, dt);
      e.x = clamp(e.x, -W, W); e.z = clamp(e.z, -D, D);
      if (Math.hypot(e.x - b.x, e.z - b.z) < BEAM) {
        e.under += dt;
        if (e.under >= CATCH) {
          e.out = true; e.under = 0; e.tent = { x: e.x, z: e.z };
          this.event(e.id, '¡ABDUCIDO!', 'bad');
          this.cue(e.id, { text: '🛸 ¡Te abdujeron! Esperá que te rescaten', buzz: 400 });
          if (ufo) this.event(ufo.id, '¡Uno menos!', 'gold');
        }
      } else e.under = Math.max(0, e.under - dt * 1.5);
    }
    collide(free, 0.5, 0.3);
    // Rescate: un campista libre toca el lugar donde se llevaron a otro (si el rayo no está encima)
    for (const c of this.campers()) {
      if (!c.out || !c.tent) continue;
      const rescuer = free.find((f) => Math.hypot(f.x - c.tent.x, f.z - c.tent.z) < 1.1);
      if (rescuer && Math.hypot(b.x - c.tent.x, b.z - c.tent.z) > BEAM + 0.5) {
        c.out = false; c.x = c.tent.x; c.z = c.tent.z; c.tent = null; rescuer.saved++;
        this.event(c.id, '¡Rescatado!', 'good'); this.event(rescuer.id, '¡Lo salvé!', 'gold');
        this.cue(c.id, { text: '🙌 ¡Te rescataron!', buzz: 120 });
      }
    }
  }
  snapshot() {
    return {
      ...this.base(), beam: { x: r2(this.beam.x), z: r2(this.beam.z), r: BEAM }, ufoId: this.ufoId, w: W, d: D,
      ents: this.ents.map((e) => ({ id: e.id, ufo: e.ufo, x: r2(e.x), z: r2(e.z), ang: r2(e.ang), out: e.out, under: r2(e.under / CATCH), tent: e.tent,
        st: e.ufo ? `🛸 ${this.campers().filter((c) => c.out).length}/3` : e.out ? '🛸 abducido' : `🏕️ libre${e.saved ? ' · 🙌' + e.saved : ''}` })),
    };
  }
  winnerTeam() { return this.campers().every((c) => c.out) ? 0 : 1; }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.ufo ? this.campers().filter((c) => c.out).length : (e.out ? 0 : 5) + e.saved })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Abduccion };
