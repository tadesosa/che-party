// Prueba: un celu que se "congela" (pantalla apagada) sin cerrar la conexión.
// El servidor tiene que detectarlo, jugar por él y, al volver, mandarle el estado actual.
const WebSocket = require('ws');
const URL = `ws://localhost:${process.env.PORT || 3000}`;
const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5) + 's', ...a);
let myId = null;

const a = new WebSocket(URL);
a.on('open', () => a.send(JSON.stringify({ t: 'join', name: 'Celu' })));
let started = false, frozen = false;
a.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.t === 'you') myId = m.id;
  if (m.t !== 'state' || !myId) return;
  if (!started) {
    started = true;
    const tv = new WebSocket(URL);
    tv.on('open', () => { tv.send(JSON.stringify({ t: 'hello', role: 'host' })); tv.send(JSON.stringify({ t: 'addBot' })); setTimeout(() => tv.send(JSON.stringify({ t: 'start', force: true })), 200); });
    return;
  }
  if (m.phase === 'turn' && m.decision && m.decision.playerId === myId && !frozen) {
    frozen = true;
    log('Le toca al celu y se congela (deja de leer la red, no cierra la conexión)');
    a._socket.pause();
    watch();
  }
});

function watch() {
  const spy = new WebSocket(URL);
  spy.on('open', () => spy.send(JSON.stringify({ t: 'hello', role: 'host' })));
  let sawOffline = false, sawAutoRoll = false;
  spy.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.t !== 'state') return;
    const me = m.players.find((p) => p.id === myId);
    if (me && !me.connected && !sawOffline) { sawOffline = true; log('Servidor detectó el celu desconectado'); }
    if (sawOffline && m.phase === 'rolling' && m.players[m.turn].id === myId && !sawAutoRoll) {
      sawAutoRoll = true; log('Servidor tiró el dado por el celu'); setTimeout(rejoin, 1500);
    }
  });
}

function rejoin() {
  log('El celu vuelve (reconecta con su id)');
  const b = new WebSocket(URL);
  b.on('open', () => b.send(JSON.stringify({ t: 'join', id: myId })));
  b.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.t === 'state') {
      const me = m.players.find((p) => p.id === myId);
      log(`Recibió estado actual: fase "${m.phase}", conectado=${me.connected}, mismo jugador=${!!me}`);
      console.log(me && me.connected ? 'OK' : 'FALLÓ'); process.exit(me && me.connected ? 0 : 1);
    }
  });
}
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
