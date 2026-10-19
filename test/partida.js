// Prueba automática: juega una partida completa (1 jugador + 3 bots) contra el servidor.
// Uso: LP_SPEED=10 PORT=3001 node server.js   y en otra terminal:   PORT=3001 node test/partida.js
const WebSocket = require('ws');
const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}`);
// Las opciones y el arranque se eligen desde la compu (la tele): abrimos también esa conexión
const tv = new WebSocket(`ws://localhost:${process.env.PORT || 3000}`);
tv.on('open', () => tv.send(JSON.stringify({ t: 'hello', role: 'host' })));
tv.on('message', (d) => { const m = JSON.parse(d); if (m.t === 'error') console.log('ERROR TELE:', m.msg); });
let me = null, lastPhase = null, setup = false, again = false, lastPick = -1;
const send = (m) => ws.send(JSON.stringify(m));
// Si la conexión de la compu todavía no abrió, el mensaje sale apenas abra
const host = (m) => (tv.readyState === 1 ? tv.send(JSON.stringify(m)) : tv.once('open', () => tv.send(JSON.stringify(m))));
const t0 = Date.now();
ws.on('open', () => send({ t: 'join', name: 'Tester' }));
ws.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.t === 'you') me = m.id;
  if (m.t === 'error') console.log('ERROR:', m.msg);
  if (m.t !== 'state' || !me) return;
  if (m.phase !== lastPhase) {
    lastPhase = m.phase;
    console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's', m.phase.padEnd(10), 'ronda', m.round, '|', m.message);
    if (m.phase === 'mgIntro') console.log('        minijuego:', m.mg.key, m.mg.mode, m.mg.teams ? JSON.stringify(m.mg.teams.map((tm) => tm.map((id) => m.players.find((p) => p.id === id).name))) : '');
    if (m.phase === 'bonus' && m.host) console.log('        premio:', m.host.text);
    if (m.phase === 'mgResults') console.log('        resultados:', m.results.map((r) => `${m.players.find((p) => p.id === r.id).name} ${r.place}° ${r.reward >= 0 ? '+' : ''}${r.reward}`).join(', '));
  }
  if (m.phase === 'lobby' && !setup) {
    setup = true;
    for (let i = 0; i < 3; i++) host({ t: 'addBot' });
    host({ t: 'board', key: process.env.BOARD || 'baires' });
    host({ t: 'mode', mode: process.env.MODE || 'rondas' });
    host({ t: 'rounds', n: 8 });
    host({ t: 'goal', n: 2 });
    send({ t: 'lobbyReady' });
    setTimeout(() => host({ t: 'start' }), 300);
  }
  if (m.decision && m.decision.playerId === me) {
    const mine = m.players.find((p) => p.id === me);
    if (m.decision.kind === 'roll') send({ t: 'roll', item: mine.items[0] || null });
    else if (m.decision.kind === 'path') send({ t: 'path', to: m.decision.options[Math.floor(Math.random() * m.decision.options.length)].to });
    else if (m.decision.kind === 'duel') send({ t: 'duel', yes: true });
    else if (m.decision.kind === 'shop') send({ t: 'shop', item: mine.mangos >= 10 ? 'doble' : null });
    else send({ t: 'copa', buy: true });
  }
  // Modo solo minijuegos: tres al azar y después terminar
  if (m.phase === 'mgPick' && m.mgPick && m.mgPick.played !== lastPick) { lastPick = m.mgPick.played; host(m.mgPick.played < 3 ? { t: 'pickMg', random: true } : { t: 'endMinis' }); }
  if (m.phase === 'mgIntro' && !m.mg.ready.includes(me)) send({ t: 'ready' });
  if (m.phase === 'order' && m.orderRolls && !(me in m.orderRolls)) send({ t: 'orderRoll' });
  if (m.phase === 'minigame') send({ t: 'mash' });
  if (m.phase === 'end' && !again) {
    again = true;
    console.log('        final:', m.standings.map((r) => `${m.players.find((p) => p.id === r.id).name} 🏆${r.copas} 💰${r.mangos}`).join(', '));
    setTimeout(() => host({ t: 'again' }), 300);
  }
  if (m.phase === 'lobby' && again) { console.log('Volvió al lobby con', m.players.length, 'jugadores. OK'); process.exit(0); }
});
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
