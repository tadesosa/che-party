// Tirá la Taba: la fuerza va y viene. Si tirás con la justa, la taba cae de "suerte".
const { MeterGame } = require('./medidor');
const { rand } = require('./common');

const meta = {
  title: 'Tirá la Taba',
  instructions: 'Tres tiros. Mirá la aguja de fuerza en el celu y apretá TIRAR cuando esté en el verde: la taba cae de SUERTE (+3). Cerca, cae de costado (+1). Si te pasás o te quedás corto… ¡cae de culo!',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🦴 ¡TIRAR!' }],
  layout: 'single',
  meter: true,
  modes: ['ffa', 'duel'],
};

class Taba extends MeterGame {
  constructor(players) {
    super(players, {
      tries: 3, icon: '🦴',
      zone: [0.55, 0.85, 0.66, 0.76], labels: ['Corto', 'Justo', 'Fuerte'],
      speed: (i) => 0.6 + i * 0.18 + rand(0, 0.08),
      grade(v) {
        if (v >= 0.66 && v <= 0.76) return { pts: 3, q: 'suerte', text: '¡SUERTE! +3', kind: 'gold', cue: '🍀 ¡Cayó de suerte!' };
        if (v >= 0.55 && v <= 0.85) return { pts: 1, q: 'costado', text: 'De costado +1', kind: 'good', cue: '👍 Cayó de costado' };
        return { pts: 0, q: 'culo', text: '¡De culo!', kind: 'bad', cue: v < 0.55 ? '😩 Muy corto' : '😩 Muy fuerte' };
      },
    });
  }
}

module.exports = { meta, Game: Taba };
