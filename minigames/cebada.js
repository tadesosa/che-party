// Cebá el Mate: el agua sube sola. Apretá cuando el mate está lleno, pero sin que rebalse.
const { MeterGame } = require('./medidor');
const { rand } = require('./common');

const meta = {
  title: 'Cebá el Mate',
  instructions: 'Vas a cebar 4 mates. El agua sube sola: apretá CORTAR cuando esté llena, en la zona verde. ¡Si rebalsa, no vale! Perfecto suma 3, bien suma 1.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🫖 ¡CORTAR!' }],
  layout: 'single',
  meter: true,
  modes: ['ffa', 'duel'],
};

class Cebada extends MeterGame {
  constructor(players) {
    super(players, {
      tries: 4, icon: '🧉', rising: true,
      zone: [0.7, 0.95, 0.83, 0.93], labels: ['Vacío', 'Lleno', 'Rebalsa'],
      speed: (i) => 0.24 + i * 0.06 + rand(0, 0.04),
      grade(v) {
        if (v > 0.95) return { pts: 0, q: 'rebalsa', text: '¡Rebalsó!', kind: 'bad', cue: '💦 ¡Rebalsó!' };
        if (v >= 0.83 && v <= 0.93) return { pts: 3, q: 'perfecto', text: '¡Espumita! +3', kind: 'gold', cue: '🤩 ¡Perfecto!' };
        if (v >= 0.7) return { pts: 1, q: 'bien', text: 'Bien +1', kind: 'good', cue: '👍 Bien cebado' };
        return { pts: 0, q: 'poco', text: 'Le falta…', kind: 'bad', cue: '😕 Le faltó agua' };
      },
    });
  }
}

module.exports = { meta, Game: Cebada };
