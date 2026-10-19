// La Muzza Perfecta: el cuchillo gira sobre la pizza. Cortá justo sobre la marca para que las porciones salgan iguales.
const { MeterGame } = require('./medidor');
const { rand } = require('./common');

const meta = {
  title: 'La Muzza Perfecta',
  instructions: 'El cortapizza va y viene sobre tu muzza. Apretá ¡CORTAR! cuando esté sobre la marca del medio (verde) para que las porciones salgan iguales. Cuatro cortes: justo suma 3, cerca suma 1. ¡Nadie quiere la porción finita!',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🍕 ¡CORTAR!' }],
  layout: 'single',
  meter: true,
  modes: ['ffa', 'duel'],
  board: 'baires',
};

class Muzza extends MeterGame {
  constructor(players) {
    super(players, {
      tries: 4, icon: '🍕',
      zone: [0.36, 0.64, 0.46, 0.54], labels: ['Finita', 'Justa', 'Gorda'],
      speed: (i) => 0.65 + i * 0.17 + rand(0, 0.08),
      grade(v) {
        const d = Math.abs(v - 0.5);
        if (d <= 0.04) return { pts: 3, q: 'justa', text: '¡Porción justa! +3', kind: 'gold', cue: '🤩 ¡Corte perfecto!' };
        if (d <= 0.14) return { pts: 1, q: 'bien', text: 'Casi +1', kind: 'good', cue: '👍 Casi justa' };
        return { pts: 0, q: v < 0.5 ? 'finita' : 'gorda', text: v < 0.5 ? '¡Muy finita!' : '¡Muy gorda!', kind: 'bad', cue: '😬 Porción despareja' };
      },
    });
  }
}

module.exports = { meta, Game: Muzza };
