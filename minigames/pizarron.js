// Dibujito en el Pizarrón: por turno, uno dibuja con el dedo en el celu una palabra secreta y aparece con tiza
// en el pizarrón de la tele. Los demás eligen en el celu qué es, entre seis opciones. Es el único que no es de reflejos.
const { Minigame, clamp, num, rand, pick } = require('./common');

const meta = {
  title: 'Dibujito en el Pizarrón',
  instructions: 'Por turnos, a uno le toca dibujar: en su celu aparece una palabra secreta y la dibuja con el dedo (¡sin escribir letras!). El dibujo sale con tiza en el pizarrón de la tele. Los demás eligen en el celu qué es: el primero que acierta suma 3, el segundo 2, los demás 1, y si le errás restás 1 (tenés una sola oportunidad). El que dibuja suma 1 por cada uno que acierta.',
  control: 'draw',
  modes: ['ffa', 'duel'],
};

const SHOW_T = 3, DRAW_T = 24, REVEAL_T = 3.5;

// ---------- Dibujos de la compu (puntos de 0 a 1000 sobre un pizarrón de 4:3) ----------
const AR = 4 / 3; // un círculo de radio r en x mide r·4/3 en y
const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2, ry = r * AR) => {
  const n = Math.max(8, Math.round(Math.abs(a1 - a0) * r / 22)), pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * ry); }
  return pts;
};
const poly = (...xy) => {
  const pts = [];
  for (let i = 0; i < xy.length - 2; i += 2) {
    const [x0, y0, x1, y1] = [xy[i], xy[i + 1], xy[i + 2], xy[i + 3]];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22));
    for (let k = 0; k < n; k++) pts.push(x0 + (x1 - x0) * (k / n), y0 + (y1 - y0) * (k / n));
  }
  pts.push(xy[xy.length - 2], xy[xy.length - 1]);
  return pts;
};
const rays = (cx, cy, r0, r1, n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return poly(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * AR, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * AR); });
const zig = (x0, y0, x1, n, h) => { const xy = []; for (let i = 0; i <= n; i++) xy.push(x0 + (x1 - x0) * (i / n), y0 + (i % 2 ? -h : 0)); return poly(...xy); };

const DRAWINGS = {
  SOL: () => [circ(500, 480, 120), ...rays(500, 480, 160, 240, 10)],
  CASA: () => [poly(300, 820, 300, 470, 700, 470, 700, 820, 300, 820), poly(260, 490, 500, 200, 740, 490), poly(450, 820, 450, 640, 550, 640, 550, 820), poly(590, 540, 660, 540, 660, 600, 590, 600, 590, 540)],
  'ÁRBOL': () => [poly(460, 880, 460, 600, 540, 600, 540, 880), circ(500, 420, 200), circ(430, 470, 70), circ(580, 380, 60)],
  PELOTA: () => [circ(500, 500, 220), poly(500, 400, 570, 455, 545, 550, 455, 550, 430, 455, 500, 400), poly(500, 400, 500, 210), poly(570, 455, 700, 400), poly(545, 550, 620, 700), poly(455, 550, 380, 700), poly(430, 455, 300, 400)],
  AUTO: () => [poly(150, 650, 150, 520, 300, 500, 380, 360, 640, 360, 720, 500, 860, 520, 860, 650, 150, 650), circ(300, 660, 70), circ(710, 660, 70), poly(410, 390, 500, 390, 500, 500, 340, 500, 410, 390), poly(540, 390, 620, 390, 680, 500, 540, 500, 540, 390)],
  PESCADO: () => [circ(450, 500, 250, 0, Math.PI * 2, 200), poly(690, 500, 880, 330, 880, 670, 690, 500), circ(330, 450, 22), circ(330, 450, 8), circ(200, 560, 30, 0, Math.PI)],
  LUNA: () => [circ(500, 500, 230, Math.PI * 0.35, Math.PI * 1.65), circ(610, 500, 190, Math.PI * 0.62, Math.PI * 1.38), ...[[760, 260], [800, 700]].map(([x, y]) => poly(x - 25, y, x + 25, y, x, y, x, y - 33, x, y + 33))],
  'MONTAÑA': () => [poly(100, 820, 380, 300, 560, 600, 680, 420, 900, 820, 100, 820), zig(300, 450, 460, 6, -35), circ(800, 220, 70)],
  PARAGUAS: () => [circ(500, 480, 300, Math.PI, Math.PI * 2, 260), zig(200, 480, 800, 6, -50), poly(500, 220, 500, 800), circ(560, 800, 60, 0, Math.PI)],
  HELADO: () => [poly(380, 520, 500, 900, 620, 520, 380, 520), circ(450, 430, 90), circ(560, 430, 90), circ(505, 300, 90), poly(420, 600, 560, 720), poly(580, 600, 450, 720)],
  BANDERA: () => [poly(180, 900, 180, 120), poly(180, 160, 820, 160, 820, 640, 180, 640), poly(180, 320, 820, 320), poly(180, 480, 820, 480), circ(500, 400, 45), ...rays(500, 400, 60, 90, 8)],
  GLOBO: () => [circ(500, 360, 190, 0, Math.PI * 2, 260), poly(480, 700, 520, 700, 500, 660, 480, 700), poly(500, 700, 470, 760, 530, 820, 470, 880, 500, 940)],
  MATE: () => [poly(360, 400, 340, 600, 380, 760, 470, 830, 560, 830, 650, 760, 690, 600, 670, 400), circ(515, 400, 155, 0, Math.PI * 2, 45), poly(560, 420, 720, 120), poly(700, 125, 760, 135)],
  EMPANADA: () => [circ(500, 620, 330, Math.PI, Math.PI * 2, 380), poly(170, 620, 830, 620), zig(190, 620, 810, 22, -40)],
  OBELISCO: () => [poly(440, 880, 460, 260, 500, 140, 540, 260, 560, 880), poly(460, 260, 540, 260), poly(200, 880, 800, 880), poly(495, 420, 505, 420)],
  FLOR: () => [circ(500, 330, 55), ...[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return circ(500 + Math.cos(a) * 120, 330 + Math.sin(a) * 160, 70); }), poly(500, 430, 500, 900), circ(570, 700, 70, Math.PI, Math.PI * 2, 50)],
  ESTRELLA: () => [(() => { const xy = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 130 : 320; xy.push(500 + Math.cos(a) * r, 520 + Math.sin(a) * r * AR); } return poly(...xy); })()],
  'CORAZÓN': () => [(() => { const xy = []; for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI * 2; xy.push(500 + 16 * Math.pow(Math.sin(t), 3) * 17, 470 - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 22); } return poly(...xy); })()],
  TAZA: () => [poly(300, 450, 340, 820, 620, 820, 660, 450, 300, 450), circ(690, 600, 80, -Math.PI / 2, Math.PI / 2), poly(250, 860, 710, 860), poly(420, 380, 400, 300, 440, 220), poly(530, 380, 510, 300, 550, 220)],
  BARCO: () => [poly(180, 620, 820, 620, 700, 780, 300, 780, 180, 620), poly(500, 620, 500, 150), poly(510, 170, 760, 560, 510, 560), zig(80, 860, 920, 14, -30)],
  ANTEOJOS: () => [circ(330, 500, 130), circ(670, 500, 130), circ(500, 480, 40, Math.PI, Math.PI * 2), poly(200, 470, 90, 400), poly(800, 470, 910, 400)],
  BICICLETA: () => [circ(260, 650, 150), circ(740, 650, 150), poly(260, 650, 430, 420, 650, 420, 740, 650), poly(430, 420, 500, 650, 260, 650), poly(500, 650, 650, 420), poly(400, 360, 480, 360), poly(650, 420, 640, 330, 720, 320)],
  GUITARRA: () => [circ(440, 680, 170), circ(440, 470, 120), circ(440, 650, 50), poly(500, 360, 760, 110), poly(740, 90, 800, 140)],
  BOTELLA: () => [poly(440, 120, 440, 300, 360, 420, 360, 880, 640, 880, 640, 420, 560, 300, 560, 120, 440, 120), poly(360, 560, 640, 560), poly(360, 720, 640, 720)],
  COLECTIVO: () => [poly(80, 700, 80, 300, 900, 300, 920, 700, 80, 700), ...[0, 1, 2, 3].map((i) => poly(130 + i * 170, 360, 260 + i * 170, 360, 260 + i * 170, 480, 130 + i * 170, 480, 130 + i * 170, 360)), poly(820, 360, 880, 360, 880, 620, 820, 620, 820, 360), circ(260, 710, 70), circ(720, 710, 70)],
  'CARACOL': () => [(() => { const xy = []; for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 5, r = 20 + i * 3.4; xy.push(520 + Math.cos(a) * r, 480 + Math.sin(a) * r * AR); } return poly(...xy); })(), poly(320, 760, 860, 760), poly(330, 760, 240, 640, 260, 520), poly(250, 560, 200, 420), poly(265, 545, 300, 410)],
  PIZZA: () => [poly(500, 850, 200, 230, 800, 230, 500, 850), circ(500, 230, 300, Math.PI, Math.PI * 2, 60), circ(470, 380, 45), circ(580, 430, 40), circ(500, 600, 40)],
};
// Palabras que solo dibujan las personas (para que no sean siempre las mismas)
const EXTRA = ['ALFAJOR', 'CHORIPÁN', 'VACA', 'PINGÜINO', 'CABALLO', 'TERMO', 'ARAÑA', 'SERPIENTE', 'CASTILLO', 'COHETE', 'RELOJ', 'LLAVE', 'ZAPATILLA', 'TIJERA', 'GATO', 'PERRO', 'NUBE', 'DINOSAURIO', 'AVIÓN', 'TORTA', 'OJO', 'MANO', 'TELE', 'CELULAR', 'PARRILLA', 'BOMBILLA', 'CAMA', 'ESCALERA', 'TREN', 'FANTASMA'];
const WORDS = [...Object.keys(DRAWINGS), ...EXTRA];

class Pizarron extends Minigame {
  constructor(players) {
    super(players);
    const n = players.length;
    this.ents = players.map((p) => ({ id: p.id, pts: 0, hits: 0, guess: null, botAt: 0, skill: rand(0.65, 0.92) }));
    // Turnos de dibujar: con 2, dos cada uno; con más, uno cada uno (hasta 4)
    const order = [...players.map((p) => p.id)].sort(() => Math.random() - 0.5);
    this.order = n <= 2 ? [order[0], order[1], order[0], order[1]] : order.slice(0, Math.min(n, 4));
    this.used = new Set();
    this.round = -1;
    this.phase = 'wait'; this.phaseT = 3 + 0.5;
    this.strokes = []; this.inkV = 0; this.snapN = 0; this.sentInk = -1;
    this.lastPad = 0;
  }
  get drawer() { return this.order[this.round]; }
  newRound() {
    this.round++;
    if (this.round >= this.order.length) { this.phase = 'over'; this.phaseT = this.t + 1.5; return; }
    // La palabra: si dibuja alguien que juega con la compu (o se fue), una que la compu sabe dibujar
    const pool = WORDS.filter((w) => !this.used.has(w));
    this.word = pick(pool); this.used.add(this.word);
    this.botWord = pick(Object.keys(DRAWINGS).filter((w) => !this.used.has(w) || w === this.word));
    const others = WORDS.filter((w) => w !== this.word).sort(() => Math.random() - 0.5).slice(0, 5);
    this.opts = [this.word, ...others].sort(() => Math.random() - 0.5);
    this.strokes = []; this.inkV++;
    this.botInk = null; this.botProg = 0; this.botSeen = false;
    this.guesses = [];
    for (const e of this.ents) { e.guess = null; e.botAt = rand(4, 11) / (0.6 + e.skill * 0.5); }
    this.phase = 'show'; this.phaseT = this.t + SHOW_T;
    this.sendPads(true);
  }
  // Si el que dibuja es la compu, cambia la palabra por una que sabe dibujar (se decide al empezar a dibujar)
  useBotDrawing() {
    if (this.botInk) return;
    if (!DRAWINGS[this.word]) {
      this.word = this.botWord;
      const others = WORDS.filter((w) => w !== this.word).sort(() => Math.random() - 0.5).slice(0, 5);
      this.opts = [this.word, ...others].sort(() => Math.random() - 0.5);
      this.sendPads(false);
    }
    // Un poco de temblor de la mano para que parezca dibujado
    this.botInk = DRAWINGS[this.word]().map((s) => s.map((v) => Math.round(clamp(v + rand(-6, 6), 0, 1000))));
    this.botTotal = this.botInk.reduce((a, s) => a + s.length, 0);
  }
  sendPads(loud) {
    this.lastPad = this.t;
    const dname = this.drawer;
    for (const e of this.ents) {
      let pad;
      if (e.id === dname) pad = { mode: 'draw', word: this.word, round: this.round };
      else pad = { mode: 'guess', round: this.round, opts: this.opts, locked: this.phase !== 'draw' || e.guess != null, hint: this.phase === 'show' ? '⏳ Ya empieza a dibujar…' : this.phase === 'reveal' ? `Era: ${this.word}` : e.guess != null ? (e.guess.ok ? '✅ ¡Acertaste! Esperá a los demás' : '❌ Le erraste… esperá') : '🤔 ¿Qué está dibujando?' };
      const c = { pad };
      if (loud && e.id === dname) { c.text = `✏️ ¡Te toca dibujar! ${this.word}`; c.buzz = [80, 50, 80]; }
      this.cue(e.id, c);
    }
  }
  input(id, m) {
    const e = this.get(id);
    if (!e || m.t !== 'action') return;
    if (id === this.drawer && (this.phase === 'draw' || this.phase === 'show')) {
      if (m.b === 'clear') { this.strokes = []; this.inkV++; this.humanDrew = true; }
      if (m.b === 'ink' && Array.isArray(m.p)) {
        const s = Math.floor(num(m.s)), from = Math.max(0, Math.floor(num(m.from)));
        if (s < 0 || s > this.strokes.length || s >= 80) return;
        const total = this.strokes.reduce((a, x) => a + x.length, 0);
        if (total > 6000) return;
        const pts = m.p.slice(0, 400).map((v) => Math.round(clamp(num(v), 0, 1000)));
        const cur = this.strokes[s] || [];
        this.strokes[s] = cur.slice(0, from).concat(pts);
        this.inkV++; this.humanDrew = true;
      }
      return;
    }
    if (m.b === 'guess' && this.phase === 'draw' && id !== this.drawer && e.guess == null) this.guess(e, Math.floor(num(m.i)));
  }
  guess(e, i) {
    const ok = this.opts[i] === this.word;
    const rank = this.guesses.filter((g) => g.ok).length;
    e.guess = { ok, t: this.t - (this.phaseT - DRAW_T) };
    this.guesses.push({ id: e.id, ok });
    if (ok) {
      const p = Math.max(1, 3 - rank);
      e.pts += p; e.hits++;
      const d = this.get(this.drawer);
      if (d && this.guesses.filter((g) => g.ok).length <= 3) d.pts += 1;
      this.event(e.id, `¡${this.word}! +${p}`, rank === 0 ? 'gold' : 'good');
      this.cue(e.id, { text: `✅ ¡Bien! +${p}`, buzz: 60 });
    } else {
      e.pts -= 1;
      this.event(e.id, `${this.opts[i] || '¿?'}… ¡No!`, 'bad');
      this.cue(e.id, { text: '❌ ¡Era otra cosa! −1', buzz: 300 });
    }
    this.sendPads(false);
  }
  bot(id, dt) {
    const e = this.get(id);
    if (!e) return;
    if (id === this.drawer) {
      if (this.phase !== 'draw') return;
      this.useBotDrawing();
      // Dibuja de a poco: termina en unos 9 segundos
      this.botProg += dt * this.botTotal / 9;
      let left = Math.floor(this.botProg);
      const out = [];
      for (const s of this.botInk) { if (left <= 0) break; const k = Math.min(s.length, left - (left % 2)); out.push(s.slice(0, Math.max(2, k))); left -= s.length; }
      if (out.length !== this.strokes.length || (out.length && out[out.length - 1].length !== this.strokes[this.strokes.length - 1].length)) { this.strokes = out; this.inkV++; }
      return;
    }
    if (this.phase !== 'draw' || e.guess != null) return;
    // Adivina cuando hay bastante dibujado
    const ink = this.strokes.reduce((a, s) => a + s.length, 0);
    const since = this.t - (this.phaseT - DRAW_T);
    if (since < e.botAt || ink < 60) return;
    const right = Math.random() < (this.humanDrew ? 0.55 : 0.82) * (0.7 + e.skill * 0.35);
    const i = right ? this.opts.indexOf(this.word) : pick(this.opts.map((_, k) => k).filter((k) => this.opts[k] !== this.word));
    this.guess(e, i);
  }
  step(dt) {
    this.t += dt;
    if (!this.started) return;
    if (this.phase === 'over') { if (this.t >= this.phaseT) this.done = true; return; }
    if (this.t - this.lastPad > 2) this.sendPads(false);
    if (this.phase === 'wait') { if (this.t >= this.phaseT) this.newRound(); return; }
    if (this.phase === 'show' && this.t >= this.phaseT) {
      this.phase = 'draw'; this.phaseT = this.t + DRAW_T; this.humanDrew = false;
      this.sendPads(false);
      this.cue(this.drawer, { text: `✏️ ¡Dibujá! ${this.word}`, buzz: 60 });
      return;
    }
    if (this.phase === 'draw') {
      const guessers = this.ents.filter((e) => e.id !== this.drawer);
      if (this.t >= this.phaseT || guessers.every((e) => e.guess != null)) {
        this.phase = 'reveal'; this.phaseT = this.t + REVEAL_T;
        if (!this.guesses.some((g) => g.ok)) this.event(this.drawer, '¡Nadie lo sacó!', 'bad');
        this.sendPads(false);
      }
      return;
    }
    if (this.phase === 'reveal' && this.t >= this.phaseT) this.newRound();
  }
  snapshot() {
    // El dibujo completo va solo cuando cambia (y cada tanto, por si la tele se recargó)
    this.snapN++;
    const sendInk = this.sentInk !== this.inkV || this.snapN % 20 === 0;
    if (sendInk) this.sentInk = this.inkV;
    const dr = this.drawer;
    return {
      ...this.base(),
      phase: this.phase, round: this.round, rounds: this.order.length, drawer: this.phase === 'over' ? null : dr,
      timeLeft: this.phase === 'draw' ? Math.max(0, this.phaseT - this.t) : null,
      opts: this.phase === 'draw' || this.phase === 'reveal' ? this.opts : null,
      word: this.phase === 'reveal' ? this.word : null,
      ink: sendInk ? { v: this.inkV, s: this.strokes } : null,
      ents: this.ents.map((e) => ({ id: e.id, pts: e.pts, g: e.guess ? (e.guess.ok ? 1 : -1) : 0, st: `✏️ ${e.pts}${e.id === dr && this.phase !== 'over' ? ' · dibuja' : e.guess ? (e.guess.ok ? ' ✅' : ' ❌') : ''}` })),
    };
  }
  ranking() { return this.ents.map((e) => ({ id: e.id, score: e.pts + e.hits * 0.01 })).sort((a, b) => b.score - a.score); }
}

module.exports = { meta, Game: Pizarron, WORDS, DRAWINGS };
