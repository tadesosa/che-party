// Regateo en San Telmo: el precio del puestero sube y baja. Frenalo cuando está en lo más barato.
const { MeterGame } = require('./medidor');
const { rand } = require('./common');

const meta = {
  title: 'Regateo en San Telmo',
  instructions: 'En la feria de San Telmo el puestero te canta un precio que sube y baja. Apretá ¡TRATO HECHO! cuando la aguja esté en lo más barato (a la izquierda). Cuatro compras: bien barato suma 3, barato suma 1.',
  control: 'buttons',
  buttons: [{ id: 'go', label: '🤝 ¡TRATO HECHO!' }],
  layout: 'single',
  meter: true,
  modes: ['ffa', 'duel'],
  board: 'baires',
};

class Feria extends MeterGame {
  constructor(players) {
    super(players, {
      tries: 4, icon: '🏺',
      zone: [0, 0.22, 0, 0.08], labels: ['Barato', '', 'Caro'],
      speed: (i) => 0.55 + i * 0.15 + rand(0, 0.08),
      grade(v) {
        const price = Math.round(100 + v * 900);
        if (v <= 0.08) return { pts: 3, q: 'regalo', text: `¡$${price}! +3`, kind: 'gold', cue: `🤩 ¡Te lo llevás a $${price}!` };
        if (v <= 0.22) return { pts: 1, q: 'barato', text: `$${price} +1`, kind: 'good', cue: `👍 $${price}, buen precio` };
        return { pts: 0, q: 'caro', text: `¡$${price}! Caro`, kind: 'bad', cue: `😩 Pagaste $${price}` };
      },
    });
  }
}

module.exports = { meta, Game: Feria };
