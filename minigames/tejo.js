// Tejo en la Arena: tirás el tejo con la fuerza del medidor. El que queda más cerca del bochín suma.
const { MeterGame } = require('./medidor');
const { rand } = require('./common');

const meta = {
  title: 'Tejo en la Arena',
  instructions: 'Clásico de playa: tirá el tejo para que quede lo más cerca posible del bochín. La aguja marca la fuerza: apretá ¡TIRAR! en la zona verde. Corto o largo, queda lejos. Tres tiros, cada uno con el bochín en otro lugar.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🥏 ¡TIRAR!' }],
  layout: 'single',
  meter: true,
  modes: ['ffa', 'duel'],
  board: 'costa',
};

class Tejo extends MeterGame {
  constructor(players) {
    // El bochín cambia de lugar en cada tiro: la zona buena se corre
    const targets = [rand(0.35, 0.5), rand(0.55, 0.7), rand(0.72, 0.85)];
    super(players, {
      tries: 3, icon: '🥏', labels: ['Corto', 'Bochín', 'Largo'],
      zone: [targets[0] - 0.12, targets[0] + 0.12, targets[0] - 0.035, targets[0] + 0.035],
      speed: (i) => 0.6 + i * 0.14 + rand(0, 0.06),
      grade: (v) => {
        const tgt = this.targets[Math.min(2, this.tryN)];
        const d = Math.abs(v - tgt);
        const cm = Math.round(d * 400);
        if (d <= 0.035) return { pts: 3, q: 'pegado', text: `¡${cm} cm! +3`, kind: 'gold', cue: `🤩 ¡Pegado al bochín! ${cm} cm` };
        if (d <= 0.12) return { pts: 1, q: 'cerca', text: `${cm} cm +1`, kind: 'good', cue: `👍 A ${cm} cm` };
        return { pts: 0, q: v < tgt ? 'corto' : 'largo', text: v < tgt ? '¡Corto!' : '¡Largo!', kind: 'bad', cue: `😬 A ${cm} cm` };
      },
    });
    this.targets = targets;
  }
  get tryN() { return this.cur ? this.cur.i : 0; }
  newTry(e) {
    const t = this.targets[e.i];
    this.cfg.zone = [t - 0.12, t + 0.12, t - 0.035, t + 0.035];
    super.newTry(e);
  }
  press(e, v) { this.cur = e; super.press(e, v); }
  snapshot() {
    const s = super.snapshot();
    s.targets = this.targets.map((x) => Math.round(x * 100) / 100);
    return s;
  }
}

module.exports = { meta, Game: Tejo };
