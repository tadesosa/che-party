// Corchos Voladores: agitá la botella de jugo de uva y descorchá con la fuerza justa. El corcho que llega más lejos gana.
const { MeterGame } = require('./medidor');
const { rand } = require('./common');

const meta = {
  title: 'Corchos Voladores',
  instructions: 'La presión de la botella sube y baja. Apretá ¡DESCORCHAR! con la aguja bien arriba (verde) para que el corcho vuele lejos. Si te pasás del todo, la botella se te escapa y el corcho cae ahí nomás. Tres tiros: se suma la distancia.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🍾 ¡DESCORCHAR!' }],
  layout: 'single',
  meter: true,
  modes: ['ffa', 'duel'],
  board: 'mendoza',
};

class Corchos extends MeterGame {
  constructor(players) {
    super(players, {
      tries: 3, icon: '🍾',
      zone: [0.7, 0.94, 0.84, 0.92], labels: ['Flojo', 'Fuerte', '¡Se escapa!'],
      speed: (i) => 0.6 + i * 0.18 + rand(0, 0.08),
      grade(v) {
        // Metros: crece con la fuerza, pero si te pasás de 0,94 se escapa
        const m = v > 0.94 ? 2 : Math.round(v * v * 25);
        if (v > 0.94) return { pts: m, q: 'escapa', text: '¡Se escapó! 2 m', kind: 'bad', cue: '😵 ¡Se te escapó la botella!' };
        if (v >= 0.84) return { pts: m, q: 'lejos', text: `¡${m} metros!`, kind: 'gold', cue: `🚀 ¡${m} metros!` };
        return { pts: m, q: v >= 0.7 ? 'medio' : 'corto', text: `${m} m`, kind: v >= 0.7 ? 'good' : 'bad', cue: `🍾 ${m} metros` };
      },
    });
    this.cfg.icon = '🍾';
  }
  snapshot() {
    const s = super.snapshot();
    for (const e of s.ents) e.st = `🍾 ${this.get(e.id).score} m`;
    return s;
  }
}

module.exports = { meta, Game: Corchos };
