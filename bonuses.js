// Premios sorpresa del final (modo por rondas). Hay 21 y en cada partida salen 5 al azar.
// Cada premio mira una estadística de los jugadores (p.stats) y se lo lleva el que tiene más
// (o menos, si low: true). Si están todos empatados o nadie hizo nada, ese premio no sale.
const BONUSES = [
  { key: 'mgWon', icon: '🎮', title: 'Rey del Minijuego', desc: 'El que más mangos ganó en los minijuegos', unit: 'mangos' },
  { key: 'mgFirst', icon: '🥇', title: 'Campeón de Minijuegos', desc: 'El que más minijuegos ganó', unit: 'ganados' },
  { key: 'mgPodium', icon: '🥉', title: 'Siempre en el Podio', desc: 'El que más veces quedó entre los tres primeros', unit: 'podios' },
  { key: 'mgLast', icon: '🫠', title: 'El Pechofrío', desc: 'El que más veces salió último en un minijuego', unit: 'veces' },
  { key: 'maxMangos', icon: '💰', title: 'El Millonario', desc: 'El que llegó a tener más mangos en la mano', unit: 'mangos' },
  { key: 'redLands', icon: '😩', title: 'Mala Leche', desc: 'El que más veces cayó en casillas malas', unit: 'veces' },
  { key: 'blueLands', icon: '🔵', title: 'Celeste de Corazón', desc: 'El que más veces cayó en casillas celestes', unit: 'veces' },
  { key: 'steps', icon: '👟', title: 'El Caminante', desc: 'El que más casillas caminó', unit: 'pasos' },
  { key: 'spent', icon: '🛍️', title: 'Comprador Compulsivo', desc: 'El que más mangos gastó en el kiosco', unit: 'mangos' },
  { key: 'itemsUsed', icon: '🧰', title: 'El Mañoso', desc: 'El que más ítems usó', unit: 'ítems' },
  { key: 'gifts', icon: '🎁', title: 'El Regalón', desc: 'El que más regalos de Sifón abrió', unit: 'regalos' },
  { key: 'diceAvg', icon: '🎲', title: 'Dado de Oro', desc: 'El que sacó los números más altos con el dado', unit: 'promedio' },
  { key: 'diceAvg', icon: '🐢', title: 'La Tortuga', desc: 'El que sacó los números más bajos con el dado', unit: 'promedio', low: true },
  { key: 'duelsWon', icon: '⚔️', title: 'El Duelista', desc: 'El que más duelos ganó', unit: 'duelos' },
  { key: 'duelsStarted', icon: '🥊', title: 'El Pendenciero', desc: 'El que más veces desafió a duelo', unit: 'desafíos' },
  { key: 'rides', icon: '🚌', title: 'El Turista', desc: 'El que más viajó (colectivos, vientos, olas y compañía)', unit: 'viajes' },
  { key: 'bankWon', icon: '🏦', title: 'El Banquero', desc: 'El que más mangos se llevó del Banco', unit: 'mangos' },
  { key: 'taxPaid', icon: '🧾', title: 'Buen Contribuyente', desc: 'El que más pagó en impuestos y casillas rojas', unit: 'mangos' },
  { key: 'eventLands', icon: '❓', title: 'Imán de Sorpresas', desc: 'El que más veces cayó en casillas de evento', unit: 'veces' },
  { key: 'stolen', icon: '🦹', title: 'El Chorro', desc: 'El que más mangos les sacó a los demás', unit: 'mangos' },
  { key: 'mangos', icon: '🐷', title: 'El Ahorrista', desc: 'El que termina con más mangos', unit: 'mangos' },
];

// Valor de la estadística de un jugador para un premio
function statOf(p, key) {
  if (key === 'mangos') return p.mangos;
  if (key === 'diceAvg') return p.stats.rolls ? Math.round((p.stats.diceTotal / p.stats.rolls) * 10) / 10 : null;
  return p.stats[key] || 0;
}

// Elige n premios al azar entre los que tienen un ganador claro (no todos empatados)
function drawBonuses(players, n = 5) {
  const valid = [];
  for (const b of BONUSES) {
    const vals = players.map((p) => ({ id: p.id, v: statOf(p, b.key) })).filter((x) => x.v != null);
    if (vals.length < 2) continue;
    const best = b.low ? Math.min(...vals.map((x) => x.v)) : Math.max(...vals.map((x) => x.v));
    if (!b.low && best <= 0) continue;
    const winners = vals.filter((x) => x.v === best).map((x) => x.id);
    if (winners.length === players.length) continue;
    valid.push({ ...b, values: players.map((p) => ({ id: p.id, v: statOf(p, b.key) ?? 0 })), winners });
  }
  // Mezclar y no repetir la misma estadística dos veces (Dado de Oro y La Tortuga no salen juntos)
  const out = [], used = new Set();
  for (const b of valid.sort(() => Math.random() - 0.5)) {
    if (used.has(b.key)) continue;
    used.add(b.key); out.push(b);
    if (out.length >= n) break;
  }
  return out;
}

module.exports = { BONUSES, drawBonuses };
