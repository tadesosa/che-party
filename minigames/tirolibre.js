// Tiro Libre con Comba: cada uno tiene su arco, su barrera de maniquíes y su arquero. Deslizás el dedo para arriba:
// para dónde va el dedo es para dónde patea, lo rápido es la fuerza y la curva del dedo es la comba de la pelota.
const { Minigame, clamp, num, rand, pick, r2 } = require('./common');

const meta = {
  title: 'Tiro Libre con Comba',
  instructions: 'Tiro libre: en el celu deslizá el dedo de abajo para arriba. Para dónde va el dedo es para dónde patea; si lo hacés rápido, sale fuerte y alta (¡muy fuerte se va por arriba!). Y lo mejor: si el dedo hace una curva, la pelota también: así se le pasa a la barrera. Gol vale 3, al ángulo 4. Cuatro tiros, cada uno con la barrera y el arquero en otro lugar.',
  control: 'swipe',
  modes: ['ffa', 'duel'],
};

// Medidas de verdad (metros): arco de 7,32 x 2,44, barrera a 9,15
const GW = 3.66, GH = 2.44, DIST = 21, BAR_D = 9.15, BAR_H = 1.95;
const TRIES = 4, KICK_T = 11, SHOW_T = 3.2;

// Trayectoria de la pelota: t de 0 a 1 (de la pelota al arco). Devuelve x (costado) e y (altura).
function path(k, t) {
  return { x: k.xa * t + k.c * 3.1 * Math.sin(Math.PI * t), y: k.apex * Math.sin(Math.PI * t * 0.75) };
}

class TiroLibre extends Minigame {
  constructor(players) {
    super(players);
    this.ents = players.map((p) => ({ id: p.id, pts: 0, goals: 0, kick: null, res: null, skill: rand(0.55, 0.85), botAt: 0 }));
    this.round = -1;
    this.phase = 'wait'; this.phaseT = 3 + 0.5;
    this.lastPad = 0;
  }
  newRound() {
    this.round++;
    if (this.round >= TRIES) { this.phase = 'over'; this.phaseT = this.t + 1.5; return; }
    // Barrera de un lado y arquero del otro; la barrera es más ancha con cada tiro
    const side = pick([-1, 1]);
    this.setup = { bx: side * rand(0.6, 1.5), bw: 1.7 + this.round * 0.35, kx: -side * rand(0.9, 1.7), side };
    for (const e of this.ents) { e.kick = null; e.res = null; e.botAt = this.t + rand(1.5, 5); }
    this.phase = 'kick'; this.phaseT = this.t + KICK_T;
    this.cue('*', { text: `⚽ Tiro ${this.round + 1} de ${TRIES}: ¡deslizá para patear!`, buzz: 60 });
    this.sendPads();
  }
  sendPads() {
    this.lastPad = this.t;
    for (const e of this.ents) this.cue(e.id, { pad: { on: this.phase === 'kick' && !e.kick, round: this.round } });
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action' || m.b !== 'kick' || this.phase !== 'kick' || e.kick) return;
    if (m.r != null && num(m.r) !== this.round) return;
    this.kick(e, clamp(num(m.a), -1, 1), clamp(num(m.p), 0, 1), clamp(num(m.c), -1, 1));
  }
  // Calcula todo el tiro al patear; la tele lo anima con el mismo resultado
  kick(e, a, p, c) {
    const k = { xa: a * 6.5, c, apex: 0.4 + p * 6.2, speed: 12 + p * 18, t0: this.t };
    k.T = DIST / k.speed;
    const s = this.setup;
    const tb = BAR_D / DIST;
    const atBar = path(k, tb), atGoal = path(k, 1);
    let res;
    if (Math.abs(atBar.x - s.bx) < s.bw / 2 + 0.11 && atBar.y < BAR_H) res = { r: 'barrera', end: 0.45, text: '¡Pegó en la barrera!' };
    else if (Math.abs(atGoal.x) > GW + 0.11 || atGoal.y > GH + 0.11) res = { r: 'afuera', end: 1.15, text: atGoal.y > GH ? '¡Por arriba!' : '¡Afuera!' };
    else if (Math.abs(atGoal.x) > GW - 0.12 || atGoal.y > GH - 0.12) res = { r: 'palo', end: 1, text: '¡Palo!' };
    else {
      // El arquero se tira: llega más lejos cuanto más lenta va la pelota
      const reach = 0.7 + Math.max(0, k.T - 0.45) * 3.2;
      const dx = Math.abs(atGoal.x - s.kx);
      if (dx < reach && atGoal.y < 2.3) res = { r: 'atajo', end: 1, text: '¡Atajó el arquero!', dive: Math.sign(atGoal.x - s.kx) || 1 };
      else {
        const corner = Math.abs(atGoal.x) > GW - 0.9 && atGoal.y > GH - 0.8;
        res = { r: 'gol', end: 1.1, text: corner ? '¡GOLAZO AL ÁNGULO!' : '¡GOOOL!', pts: corner ? 4 : 3, dive: Math.sign(atGoal.x - s.kx) || 1 };
      }
    }
    e.kick = k; e.res = res; e.resShown = false;
    this.sendPads();
  }
  bot(id) {
    const e = this.get(id);
    if (!e || this.phase !== 'kick' || e.kick || this.t < e.botAt) return;
    // Apunta al palo del arquero contrario… o pasa la barrera con comba
    const s = this.setup;
    const err = 1 - e.skill;
    const curl = Math.random() < 0.6;
    const tx = curl ? s.side * 2.7 : -s.side * 2.9;
    const c = curl ? s.side * rand(0.45, 0.8) : rand(-0.15, 0.15);
    this.kick(e, clamp(tx / 6.5 + rand(-0.12, 0.12) * err * 2, -1, 1), clamp(rand(0.3, 0.6) + rand(-0.2, 0.2) * err, 0, 1), clamp(c + rand(-0.2, 0.2) * err, -1, 1));
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'over') { if (this.t >= this.phaseT) this.done = true; return; }
    if (this.phase === 'wait') { if (this.t >= this.phaseT) this.newRound(); return; }
    if (this.t - this.lastPad > 2) this.sendPads();
    // Cuando la pelota llega, se anota
    for (const e of this.ents) {
      if (!e.kick || e.resShown || this.t < e.kick.t0 + e.kick.T * e.res.end) continue;
      e.resShown = true;
      if (e.res.r === 'gol') { e.pts += e.res.pts; e.goals++; }
      this.event(e.id, e.res.text + (e.res.pts ? ` +${e.res.pts}` : ''), e.res.r === 'gol' ? (e.res.pts > 3 ? 'gold' : 'good') : 'bad');
      this.cue(e.id, { text: (e.res.r === 'gol' ? '⚽ ' : '😩 ') + e.res.text, buzz: e.res.r === 'gol' ? [60, 40, 60] : 250 });
    }
    if (this.phase === 'kick') {
      const allIn = this.ents.every((e) => e.kick && e.resShown);
      if (this.t >= this.phaseT || allIn) {
        // El que no pateó, pierde el tiro
        for (const e of this.ents) if (!e.kick) { e.res = { r: 'nada', text: '¡No pateó!' }; e.resShown = true; this.event(e.id, '¡No pateó!', 'bad'); }
        if (this.ents.every((e) => e.resShown)) { this.phase = 'show'; this.phaseT = this.t + (allIn ? 1.4 : SHOW_T); }
      }
      return;
    }
    if (this.phase === 'show' && this.t >= this.phaseT) this.newRound();
  }
  snapshot() {
    return {
      ...this.base(),
      phase: this.phase, round: this.round, tries: TRIES,
      timeLeft: this.phase === 'kick' ? Math.max(0, this.phaseT - this.t) : null,
      setup: this.setup || null,
      ents: this.ents.map((e) => ({
        id: e.id, pts: e.pts,
        kick: e.kick ? { xa: r2(e.kick.xa), c: r2(e.kick.c), apex: r2(e.kick.apex), T: r2(e.kick.T), k: r2((this.t - e.kick.t0) / e.kick.T), end: e.res.end, r: e.res.r, dive: e.res.dive || 0 } : null,
        st: `⚽ ${e.pts}${e.goals ? ` (${e.goals} gol${e.goals > 1 ? 'es' : ''})` : ''}`,
      })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.pts + e.goals * 0.01 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: TiroLibre, path, GW, GH, DIST, BAR_D, BAR_H };
