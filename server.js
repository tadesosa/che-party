// Che Party — servidor del juego.
// Corre en la PC conectada a la tele. Los celus se conectan por el wifi local (no hace falta internet).
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = Number(process.env.PORT) || 3000;
// Solo para pruebas: LP_SPEED=10 acelera todo el juego.
const SPEED = Math.max(1, Number(process.env.LP_SPEED) || 1);

function lanIP() {
  const candidates = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      let score = 0;
      if (a.address.startsWith('192.168.')) score += 3;
      else if (a.address.startsWith('10.')) score += 2;
      else if (a.address.startsWith('172.')) score += 1;
      if (/vmware|virtual|vbox|hyper-v|wsl|docker|vethernet/i.test(name)) score -= 5;
      candidates.push({ address: a.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length ? candidates[0].address : 'localhost';
}

const JOIN_URL = `http://${lanIP()}:${PORT}/`;

// ---------- Servidor de archivos ----------
// Funciona de dos formas: desde la carpeta (npm start / .bat) o empaquetado en CheParty.exe,
// donde los archivos de public/ viajan adentro del ejecutable.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
};
let sea = null;
try { sea = require('node:sea'); if (!sea.isSea()) sea = null; } catch { sea = null; }
const IS_EXE = !!sea;
const PUBLIC = path.join(__dirname, 'public');
const THREE_FILE = path.join(__dirname, 'node_modules', 'three', 'build', 'three.module.js');
const ADDONS = path.join(__dirname, 'node_modules', 'three', 'examples', 'jsm');

// rel: ruta dentro de public/ con barras normales, ej. "tv.html" o "lib/three.module.js"
function readStatic(rel) {
  if (IS_EXE) {
    try { return Promise.resolve(Buffer.from(sea.getAsset(rel))); } catch { return Promise.resolve(null); }
  }
  let file;
  if (rel === 'lib/three.module.js') file = THREE_FILE;
  else if (rel.startsWith('lib/addons/')) { file = path.normalize(path.join(ADDONS, rel.slice('lib/addons/'.length))); if (!file.startsWith(ADDONS)) return Promise.resolve(null); }
  else { file = path.normalize(path.join(PUBLIC, rel)); if (!file.startsWith(PUBLIC)) return Promise.resolve(null); }
  return fs.promises.readFile(file).catch(() => null);
}

async function sendStatic(res, rel) {
  const data = await readStatic(rel);
  if (!data) { res.writeHead(404); res.end('No encontrado'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = decodeURIComponent((req.url || '/').split('?')[0]); } catch { res.writeHead(400); return res.end(); }
  if (url === '/' || url === '/play') return sendStatic(res, 'play.html');
  if (url === '/tv') return sendStatic(res, 'tv.html');
  if (url === '/qr.svg') {
    const svg = await QRCode.toString(JOIN_URL, { type: 'svg', margin: 1, color: { dark: '#1b2a4a', light: '#ffffff' } });
    res.writeHead(200, { 'Content-Type': MIME['.svg'] });
    return res.end(svg);
  }
  if (url === '/info') {
    res.writeHead(200, { 'Content-Type': MIME['.json'] });
    return res.end(JSON.stringify({ joinUrl: JOIN_URL }));
  }
  const rel = url.replace(/^\/+/, '');
  if (rel.includes('..')) { res.writeHead(403); return res.end(); }
  sendStatic(res, rel);
});

// ---------- Juego ----------
// Toda la lógica de la partida vive en game.js
const { createGame } = require('./game');
const game = createGame({ joinUrl: JOIN_URL, speed: SPEED, env: process.env });

const wss = new WebSocketServer({ server });
// Latido: los celus con la pantalla apagada a veces cortan la conexión sin avisar.
// Cada 4 s mandamos un ping; si no contesta, damos la conexión por muerta.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* ya cerrada */ }
  }
}, 4000);

wss.on('connection', (ws) => {
  game.sockets.add(ws);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    try { game.handle(ws, msg); } catch (e) { console.error(e); }
  });
  ws.on('close', () => game.onClose(ws));
});

function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}
const AUTO_OPEN = (IS_EXE || process.env.LP_OPEN === '1') && process.env.LP_NO_OPEN !== '1';

// El servidor de los celus repite los errores del servidor web; los atiende el de abajo (si no, el programa se cierra de golpe)
wss.on('error', () => {});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // ¿Lo que ocupa el puerto es otro Che Party? Entonces abrimos ese. Si es otro programa, avisamos.
    http.get(`http://localhost:${PORT}/info`, (res) => {
      res.resume();
      console.log('');
      if (res.statusCode === 200) {
        console.log(`  ⚠️  Che Party ya está abierto (el puerto ${PORT} está ocupado).`);
        console.log(`      Abro la pantalla del juego que ya está corriendo.`);
        if (AUTO_OPEN) openBrowser(`http://localhost:${PORT}/tv`);
        setTimeout(() => process.exit(0), 4000);
      } else portTaken();
    }).on('error', portTaken);
    return;
  }
  console.error(err);
  setTimeout(() => process.exit(1), 30000);
});
function portTaken() {
  console.log('');
  console.log(`  ❌  Otro programa está usando el puerto ${PORT} y Che Party no puede arrancar.`);
  console.log('      Cerrá ese programa (o reiniciá la PC) y volvé a abrir Che Party.');
  console.log('      Esta ventana se cierra sola en 30 segundos.');
  setTimeout(() => process.exit(1), 30000);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  🧉  CHE PARTY está corriendo');
  console.log('');
  console.log(`  📺  Pantalla de la tele:   http://localhost:${PORT}/tv`);
  console.log(`  📱  Los celus entran a:     ${JOIN_URL}   (o escanean el QR de la tele)`);
  console.log('');
  console.log('  Todos tienen que estar en el mismo wifi.');
  console.log('  NO cierres esta ventana mientras juegan. Para terminar, cerrala o apretá Ctrl + C.');
  console.log('');
  if (AUTO_OPEN) openBrowser(`http://localhost:${PORT}/tv`);
});
