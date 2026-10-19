// Che Party — lógica de la partida: lobby, tablero, turnos, ítems, regalos, noticias, minijuegos, duelos y premios.
// server.js se encarga de la red; acá vive todo lo que pasa en el juego.
const { MINIGAMES, createMinigame } = require('./minigames');
const { BOARDS, BOARD_LIST, distances, pathTo } = require('./board');
const { line } = require('./host');
const { drawBonuses } = require('./bonuses');

const CHARACTERS = [
  { key: 'mate', name: 'El Mate', emoji: '🧉', color: '#2e9e48' },
  { key: 'empanada', name: 'La Empanada', emoji: '🥟', color: '#ef8a17' },
  { key: 'alfajor', name: 'El Alfajor', emoji: '🍪', color: '#7b4a2d' },
  { key: 'medialuna', name: 'La Medialuna', emoji: '🥐', color: '#e8c12e' },
  { key: 'chori', name: 'El Choripán', emoji: '🌭', color: '#d63a2f' },
  { key: 'dulce', name: 'El Dulce de Leche', emoji: '🍯', color: '#4aa8e0' },
  { key: 'choclo', name: 'El Choclo', emoji: '🌽', color: '#9bc53d' },
  { key: 'pastafrola', name: 'La Pastafrola', emoji: '🥧', color: '#b5446e' },
  { key: 'tortafrita', name: 'La Torta Frita', emoji: '🫓', color: '#c98f3a' },
];
const MAX_PLAYERS = 6;
// Cambia cada vez que arranca el servidor: si la tele o un celu tienen abierta una página de antes, se recargan solos
const BUILD = String(Date.now());
const BOT_NAMES = ['Cacho', 'Pocha', 'Tito', 'Chiche', 'Beto', 'Mirta'];

const COPA_PRICE = 15;
const GOAL_OPTIONS = [1, 2, 3, 5, 7, 10];
const ROUND_OPTIONS = [8, 12, 16, 20, 30, 40, 50];
const MAX_ROUNDS = 60; // tope de seguridad en modo Copas
const START_MANGOS = 10;
const MG_REWARDS = [10, 6, 3, 1, 0, 0];
const MAX_ITEMS = 3;

// Ítems del kiosco. "use" es lo que dice el botón grande del celu; "passive" se usa solo (no se elige al tirar).
const ITEMS = {
  doble: { key: 'doble', name: 'Dado Doble', emoji: '🎲', price: 6, desc: 'Tirás dos dados y sumás', use: 'TIRAR DOS' },
  triple: { key: 'triple', name: 'Dado Triple', emoji: '🎰', price: 12, desc: 'Tirás tres dados y sumás', use: 'TIRAR TRES' },
  mate: { key: 'mate', name: 'Mate Cebado', emoji: '🧉', price: 4, desc: '+4 pasos en tu tirada', use: 'TIRAR +4' },
  trucho: { key: 'trucho', name: 'Dado Trucho', emoji: '🎯', price: 9, desc: 'Elegís qué número sale (del 1 al 10)', use: 'ELEGIR NÚMERO' },
  chancla: { key: 'chancla', name: 'Chancleta', emoji: '🩴', price: 5, desc: 'Elegís a quién: le sacás 6 mangos', use: 'REVOLEAR' },
  cambiazo: { key: 'cambiazo', name: 'Cambiazo', emoji: '🔄', price: 10, desc: 'Cambiás de lugar con quien elijas', use: 'CAMBIAR' },
  bache: { key: 'bache', name: 'Bache', emoji: '🕳️', price: 6, desc: 'Trampa en tu casilla: el que caiga ahí te paga 8', use: 'PONER BACHE' },
  paraguas: { key: 'paraguas', name: 'Paraguas', emoji: '☂️', price: 5, desc: 'Te cubre solo del próximo robo, chancleta o bache', passive: true },
  remis: { key: 'remis', name: 'Remís', emoji: '🚕', price: 50, desc: 'Te lleva directo a la Copa', use: '¡A LA COPA!' },
};

// Color de equipo según la casilla donde caíste (como en los party games: celestes contra rojos)
const BLUE_SPACES = ['azul', 'inicio', 'banco', 'suerte', 'kiosco', 'pinguino', 'pachamama'];
const RED_SPACES = ['roja', 'impuesto', 'zonda', 'avalancha', 'ovni'];
// Cómo se llama el transporte de cada tablero (las casillas de colectivo te llevan a la próxima parada)
const VEHICLE = { baires: 'el colectivo', mendoza: 'el micro', costa: 'el micro', bariloche: 'la aerosilla', cordoba: 'el micro', sur: 'el Tren del Fin del Mundo', norte: 'el Tren a las Nubes' };

const EVENTS = [
  (p) => { p.mangos += 5; return `¡Asado en lo de tu tío! ${p.name} se lleva 5 mangos de sobremesa.`; },
  (p) => { const n = Math.min(p.mangos, 2); p.mangos -= n; return `Te cobraron el bondi dos veces. ${p.name} pierde ${n} mangos.`; },
  (p) => { p.mangos += 4; return `${p.name} encontró un billete en la campera del invierno pasado: +4 mangos.`; },
  (p) => { p.mangos += 8; return `¡Cayó el aguinaldo! ${p.name} suma 8 mangos.`; },
  (p) => { p.mangos += 6; return `${p.name} ganó el prode de la oficina: +6 mangos.`; },
  (p, all) => { for (const o of all) o.mangos = Math.floor(o.mangos * 0.85); return '¡Inflación! Todos pierden el 15% de sus mangos.'; },
  (p, all) => {
    const others = all.filter((o) => o !== p && o.mangos > 0);
    if (!others.length) { p.mangos += 3; return `${p.name} quiso pedir fiado pero no había a quién. Igual le dan 3 mangos de lástima.`; }
    const o = others[Math.floor(Math.random() * others.length)];
    const n = Math.min(o.mangos, 5); o.mangos -= n; p.mangos += n;
    return `${o.name} le debía plata a ${p.name}. ¡Le devuelve ${n} mangos!`;
  },
  (p) => { const n = Math.min(p.mangos, 4); p.mangos -= n; return `Se cortó la luz y se pudrió todo en la heladera. ${p.name} pierde ${n} mangos.`; },
  (p, all) => { for (const o of all) o.mangos += 2; return '¡Ganó la Selección! Festejo en todos lados: todos suman 2 mangos.'; },
  (p) => {
    if (p.items.length < MAX_ITEMS) { p.items.push('mate'); return `La vecina le convidó un mate a ${p.name}: ¡ganó un Mate Cebado!`; }
    p.mangos += 3; return `La vecina le convidó un mate a ${p.name}, pero ya no tiene lugar. +3 mangos.`;
  },
  (p) => { const n = Math.min(p.mangos, 3); p.mangos -= n; return `${p.name} pisó un caca de perro con las zapatillas nuevas. Lavarlas sale ${n} mangos.`; },
  (p) => { p.mangos += 7; return `¡${p.name} vendió la bici vieja por Marketplace! +7 mangos.`; },
  (p, all) => { const n = Math.min(p.mangos, all.length - 1); p.mangos -= n; for (const o of all) if (o !== p) o.mangos += n ? 1 : 0; return `${p.name} invita una ronda de facturas: le sale ${n} mangos y cada uno recibe 1.`; },
  (p) => { p.mangos += 3; return `A ${p.name} le dieron mal el vuelto... a favor. +3 mangos.`; },
  (p) => { const n = Math.min(p.mangos, 5); p.mangos -= n; return `Multa por estacionar en doble fila: ${p.name} paga ${n} mangos.`; },
];

// Regalos de Sifón (casillas 🍀): se ofrecen tres cajas y el jugador elige una.
// good: si es de las buenas (para que Sifón festeje o se burle). w: qué tan seguido sale.
const GIFTS = [
  { k: 'm10', emoji: '💰', label: '+10 mangos', good: true, w: 4 },
  { k: 'm5', emoji: '🪙', label: '+5 mangos', good: true, w: 5 },
  { k: 'item', emoji: '🎁', label: 'Un ítem sorpresa', good: true, w: 4 },
  { k: 'triple', emoji: '🎰', label: 'Dado Triple', good: true, w: 2 },
  { k: 'paraguas', emoji: '☂️', label: 'Paraguas', good: true, w: 2 },
  { k: 'cumple', emoji: '🎂', label: '¡Cumpleaños! Cada uno te da 3', good: true, w: 3 },
  { k: 'remis', emoji: '🚕', label: 'Remís a la Copa', good: true, w: 1 },
  { k: 'copa', emoji: '🏆', label: '¡UNA COPA!', good: true, w: 0.6 },
  { k: 'menos5', emoji: '💸', label: '-5 mangos', good: false, w: 4 },
  { k: 'nada', emoji: '🤡', label: '¡Nada! Una cargada', good: false, w: 4 },
  { k: 'regalo', emoji: '🫴', label: 'Le regalás 5 al último', good: false, w: 2 },
];

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weighted = (arr) => { let r = Math.random() * arr.reduce((a, x) => a + x.w, 0); for (const x of arr) { r -= x.w; if (r <= 0) return x; } return arr[arr.length - 1]; };

function createGame({ joinUrl, speed = 1, env = {} }) {
  const SPEED = speed;
  const sockets = new Set();
  const hosts = new Set();
  let game = freshGame();
  let runId = 0;
  let pending = null;
  let mgSim = null, mgTimer = null, mgQueue = [];
  let fxId = 0, hostId = 0;
  const ABORT = new Error('abort');

  function freshGame() {
    return {
      phase: 'lobby', players: [], turn: 0, round: 0,
      mode: 'rondas', copasToWin: 2, rounds: 12, boardKey: 'baires', board: BOARDS.baires,
      bank: 0, orderRolls: null, lastRounds: false, copaPrice: COPA_PRICE, traps: [],
      copaSpace: -1, dice: null, message: '', decision: null, news: null, gift: null,
      mg: null, results: null, standings: null, fx: null, host: null, bonus: null, mgPick: null,
    };
  }

  // ---------- Red ----------
  function publicState() {
    for (const p of game.players) p.stats.maxMangos = Math.max(p.stats.maxMangos, p.mangos);
    return {
      t: 'state', joinUrl, build: BUILD,
      phase: game.phase,
      players: game.players.map((p) => ({
        id: p.id, name: p.name, char: p.char, mangos: p.mangos, copas: p.copas,
        pos: p.pos, connected: p.bot || p.connected, bot: p.bot, items: p.items, color: p.color, ready: !!p.ready,
      })),
      turn: game.turn, round: game.round, mode: game.mode, copasToWin: game.copasToWin, rounds: game.rounds,
      maxRounds: game.mode === 'rondas' ? game.rounds : MAX_ROUNDS, lastRounds: game.lastRounds,
      copaSpace: game.copaSpace, dice: game.dice, message: game.message, traps: game.traps,
      paused: !!game.paused, decision: game.decision, mg: game.mg, mgPick: game.mgPick, results: game.results, bonus: game.bonus,
      news: game.news, gift: game.gift,
      standings: game.standings, fx: game.fx, host: game.host, bank: game.bank, orderRolls: game.orderRolls,
      board: game.board, boards: BOARD_LIST, characters: CHARACTERS, copaPrice: game.copaPrice, items: ITEMS,
      goalOptions: GOAL_OPTIONS, roundOptions: ROUND_OPTIONS,
    };
  }
  function send(ws, msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
  function broadcast() {
    const s = JSON.stringify(publicState());
    for (const ws of sockets) if (ws.readyState === 1) ws.send(s);
  }
  const fx = (obj) => { game.fx = { id: ++fxId, ...obj }; };
  // Lo que dice Don Sifón. mood: cómo lo dice (talk, happy, sad, shock); big: aparece grande en el medio
  const say = (text, mood = 'talk', big = false) => { if (text) game.host = { id: ++hostId, text, mood, big }; };
  // Algunas frases salen solo a veces, para que Sifón no hable todo el tiempo
  const maybeSay = (prob, text, mood) => { if (Math.random() < prob) say(text, mood); };

  // Reloj del juego: no corre mientras está en pausa (tecla P en la compu)
  let pausedAt = 0, pausedTotal = 0;
  const gameNow = () => (game.paused ? pausedAt : Date.now()) - pausedTotal;
  function setPaused(on) {
    if (!!game.paused === on || game.phase === 'lobby' || game.phase === 'end') return;
    if (on) pausedAt = Date.now(); else pausedTotal += Date.now() - pausedAt;
    game.paused = on;
    broadcast();
  }

  function sleep(ms) {
    const id = runId, end = gameNow() + ms / SPEED;
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (id !== runId) return reject(ABORT);
        const left = end - gameNow();
        if (left <= 0) return resolve();
        setTimeout(tick, game.paused ? 200 : Math.min(left, 250));
      };
      setTimeout(tick, Math.min(ms / SPEED, 250));
    });
  }

  // Espera la decisión de un jugador. Bots y jugadores desconectados deciden solos.
  function ask(player, kind, auto, timeoutMs, extra = {}) {
    return new Promise((resolve, reject) => {
      const id = runId;
      const p = { playerId: player.id, kind, offline: 0 };
      p.done = (v) => {
        if (pending !== p) return;
        pending = null;
        clearTimeout(p.timer); clearInterval(p.check);
        game.decision = null;
        id === runId ? resolve(v) : reject(ABORT);
      };
      pending = p;
      const t0 = gameNow(), limit = (player.bot ? 1100 : timeoutMs) / SPEED;
      let ticks = 0;
      p.check = setInterval(() => {
        if (game.paused) return;
        if (gameNow() - t0 >= limit) { p.done(auto()); return; }
        if (++ticks % 5 === 0 && !player.bot && !player.connected && ++p.offline >= 8) p.done(auto());
      }, 100);
      game.decision = { playerId: player.id, kind, ...extra };
      broadcast();
    });
  }

  const B = () => game.board;
  const node = (id) => B().nodes[id];
  const distTo = (from, to) => { const d = distances(B(), from).get(to); return d == null ? 99 : d; };
  const byId = (id) => game.players.find((p) => p.id === id);
  // Quién va ganando y quién va último (por Copas y después por mangos)
  const ranked = () => [...game.players].sort((a, b) => b.copas - a.copas || b.mangos - a.mangos);
  const leaderText = () => {
    const r = ranked();
    if (!r[0].copas) return `Todavía nadie tiene Copas. ¡Está todo abierto!`;
    const tied = r.filter((p) => p.copas === r[0].copas);
    return tied.length > 1 ? `${tied.map((p) => p.name).join(' y ')} van empatados con ${r[0].copas} ${r[0].copas === 1 ? 'Copa' : 'Copas'}.` : `${r[0].name} va primero con ${r[0].copas} ${r[0].copas === 1 ? 'Copa' : 'Copas'}.`;
  };
  let lastLeader = null;
  function checkLeader() {
    const r = ranked();
    if (!r[0].copas || (r[1] && r[1].copas === r[0].copas)) return;
    if (lastLeader && lastLeader !== r[0].id) say(line('leadChange', r[0]), 'shock');
    lastLeader = r[0].id;
  }

  function pickCopaSpace(fromPos = B().start) {
    const dist = distances(B(), fromPos);
    const azules = B().nodes.filter((n) => n.type === 'azul');
    let options = azules.filter((n) => (dist.get(n.id) ?? 99) >= 5 && !game.players.some((p) => p.pos === n.id));
    if (!options.length) options = azules;
    return options[Math.floor(Math.random() * options.length)].id;
  }

  const isOver = () => (game.mode === 'copas' ? !!champion() : false);
  function champion() { return game.mode === 'copas' ? game.players.find((p) => p.copas >= game.copasToWin) : null; }
  const lastRoundCount = () => (game.mode === 'rondas' ? game.rounds : MAX_ROUNDS);
  const mult = () => (game.lastRounds ? 2 : 1);

  // ---------- Partida ----------
  async function runGame() {
    const id = ++runId;
    try {
      for (const p of game.players) resetPlayer(p);
      Object.assign(game, { round: 1, turn: 0, results: null, standings: null, bank: 0, lastRounds: false, bonus: null, traps: [], copaPrice: COPA_PRICE, news: null, gift: null });
      game.copaSpace = -1;
      mgQueue = []; lastLeader = null;
      if (game.mode === 'minis') { await runMinis(); return; }
      game.phase = 'intro';
      game.message = `¡Arranca Che Party en ${game.board.name}!`;
      const goal = game.mode === 'rondas' ? `Son ${game.rounds} rondas y gana el que tenga más Copas.` : `El primero en juntar ${game.copasToWin} ${game.copasToWin === 1 ? 'Copa' : 'Copas'} se lleva todo.`;
      say(line('intro', game, goal), 'happy', true);
      broadcast();
      await sleep(6500);
      if (env.LP_SKIP_BOARD !== '1') await rollOrder();
      await revealCopa(pickCopaSpace(B().start), 'start');

      while (!isOver() && game.round <= lastRoundCount()) {
        game.copaPrice = COPA_PRICE;
        if (game.mode === 'rondas' && game.round === game.rounds - 2 && game.rounds >= 6) await lastRoundsEvent();
        else if (game.round > 1) await roundStart();
        for (let i = 0; i < game.players.length && !isOver() && env.LP_SKIP_BOARD !== '1'; i++) {
          game.turn = i;
          await playTurn(game.players[i]);
        }
        if (isOver()) break;
        await roundMinigame();
        game.round++;
      }
      if (game.mode === 'rondas') await bonusAwards();
      finishGame();
    } catch (e) {
      if (e !== ABORT) console.error(e);
    }
    if (id !== runId) return;
  }

  function resetPlayer(p) {
    Object.assign(p, { mangos: START_MANGOS, copas: 0, pos: B().start, items: [], color: Math.random() < 0.5 ? 'azul' : 'roja', trail: [],
      stats: { mgWon: 0, maxMangos: START_MANGOS, redLands: 0, blueLands: 0, steps: 0, spent: 0, itemsUsed: 0, gifts: 0, diceTotal: 0, rolls: 0,
        duelsWon: 0, duelsStarted: 0, rides: 0, bankWon: 0, taxPaid: 0, eventLands: 0, stolen: 0, mgFirst: 0, mgPodium: 0, mgLast: 0 } });
  }

  async function rollOrder() {
    game.phase = 'order';
    game.orderRolls = {};
    game.message = '¡Tiren el dado para ver quién arranca!';
    broadcast();
    const t0 = gameNow();
    const roll = (p) => { game.orderRolls[p.id] = 1 + Math.floor(Math.random() * 10); broadcast(); };
    for (;;) {
      await sleep(250);
      const waited = (gameNow() - t0) * SPEED;
      game.players.forEach((p, i) => { if ((p.bot || !p.connected) && !(p.id in game.orderRolls) && waited > 1500 + i * 600) roll(p); });
      if (game.players.every((p) => p.id in game.orderRolls)) break;
      if (waited > 15000) { game.players.forEach((p) => { if (!(p.id in game.orderRolls)) roll(p); }); break; }
    }
    await sleep(1500);
    const tie = new Map(game.players.map((p) => [p.id, Math.random()]));
    game.players.sort((a, b) => game.orderRolls[b.id] - game.orderRolls[a.id] || tie.get(a.id) - tie.get(b.id));
    game.message = 'Orden de juego: ' + game.players.map((p, i) => `${i + 1}° ${p.name}`).join(' · ');
    say(line('order', game.players[0].name, game.players.slice(1).map((p) => p.name).join(', ')), 'happy');
    broadcast();
    await sleep(3500);
    game.orderRolls = null;
  }

  // Al empezar cada ronda: Sifón cuenta cómo viene la cosa y, a veces, trae una noticia que cambia todo
  async function roundStart() {
    const half = game.mode === 'rondas' && game.round === Math.ceil(game.rounds / 2) + 1;
    const newsChance = env.LP_NEWS ? Number(env.LP_NEWS) : 0.4;
    if (Math.random() < newsChance) { await roundNews(); return; }
    if (half) say(line('half', leaderText()), 'talk');
    else maybeSay(0.5, line('round', game.round, leaderText()));
  }

  async function lastRoundsEvent() {
    game.lastRounds = true;
    const last = [...game.players].sort((a, b) => a.copas - b.copas || a.mangos - b.mangos)[0];
    last.mangos += 10;
    game.phase = 'intro';
    game.message = '¡ÚLTIMAS 3 RONDAS! Las casillas celestes y rojas valen el doble.';
    say(line('last', last.name), 'shock', true);
    fx({ type: 'lastRounds', playerId: last.id });
    broadcast();
    await sleep(7000);
  }

  // ---------- Noticias de último momento: pasan cosas en el tablero ----------
  // Cada noticia tiene un texto general y, a veces, uno propio de cada tablero.
  const NEWS = [
    { key: 'lluvia', icon: '💸', title: '¡Lluvia de mangos!',
      text: { _: 'Se rompió un camión de caudales y llueve plata para todos.', baires: 'Se trabó un cajero del Microcentro y escupe billetes.', mendoza: '¡Vendimia récord! Hay mangos para todos.', costa: 'La marea trajo una valija llena de billetes.', bariloche: 'Un turista dejó la billetera en la aerosilla.', cordoba: '¡Se ganó el Quini en Carlos Paz y el ganador reparte!', sur: 'Un crucero dejó propina en el puerto.', norte: '¡La Pachamama está generosa hoy!' },
      run() { const d = game.players.map((p) => { const n = 2 + Math.floor(Math.random() * 7); p.mangos += n; return { playerId: p.id, amount: n }; }); fx({ type: 'event', deltas: d }); } },
    { key: 'robin', icon: '🏹', title: 'Robin Hood anda suelto',
      text: { _: 'Le saca al que más tiene y le da al que menos tiene.' },
      ok: () => { const r = [...game.players].sort((a, b) => b.mangos - a.mangos); return r[0].mangos >= 6 && r[0] !== r[r.length - 1]; },
      run() {
        const r = [...game.players].sort((a, b) => b.mangos - a.mangos);
        const rich = r[0], poor = r[r.length - 1], n = Math.min(12, Math.max(3, Math.floor(rich.mangos / 3)));
        if (shielded(rich)) return `${rich.name} sacó el paraguas y Robin Hood se fue con las manos vacías.`;
        rich.mangos -= n; poor.mangos += n;
        fx({ type: 'event', deltas: [{ playerId: rich.id, amount: -n }, { playerId: poor.id, amount: n }] });
        return `${rich.name} le da ${n} mangos a ${poor.name}.`;
      } },
    { key: 'inflacion', icon: '📈', title: '¡Inflación!',
      text: { _: 'Los precios se fueron a las nubes: todos pierden el 20% de sus mangos.' },
      run() { const d = game.players.map((p) => { const n = Math.floor(p.mangos * 0.2); p.mangos -= n; return { playerId: p.id, amount: -n }; }).filter((x) => x.amount); fx({ type: 'event', deltas: d }); } },
    { key: 'mudanza', icon: '🏆', title: '¡La Copa se muda!',
      text: { _: 'Alguien se llevó la Copa a otro lado. ¡A correr!' },
      async after() { await revealCopa(pickCopaSpace(game.copaSpace), 'move'); } },
    { key: 'oferta', icon: '🏷️', title: 'Oferta en Copas',
      text: { _: 'Por esta ronda, la Copa cuesta 10 mangos en vez de 15. ¡Aprovechen!' },
      run() { game.copaPrice = 10; } },
    { key: 'remate', icon: '💎', title: 'La Copa está carísima',
      text: { _: 'Por esta ronda, la Copa cuesta 20 mangos. ¡Qué país!' },
      run() { game.copaPrice = 20; } },
    { key: 'sorteo', icon: '🎟️', title: 'Sorteo en el barrio',
      text: { _: 'Sifón sortea un ítem entre todos los jugadores...' },
      run() {
        const can = game.players.filter((p) => p.items.length < MAX_ITEMS);
        if (!can.length) { for (const p of game.players) p.mangos += 3; return 'Nadie tenía lugar en los bolsillos: 3 mangos para cada uno.'; }
        const p = pickOne(can), k = pickOne(['doble', 'triple', 'chancla', 'cambiazo', 'paraguas', 'trucho']);
        p.items.push(k);
        return `¡Ganó ${p.name}! Se lleva ${ITEMS[k].emoji} ${ITEMS[k].name}.`;
      } },
    { key: 'revoleo', icon: '🌀', title: '¡Revoleo general!',
      text: { _: 'Un remolino levantó a todos y los dejó en otro lugar.', baires: '¡Se cortó el subte! Todos se bajan donde pueden.', mendoza: '¡Viento Zonda para todos! Nadie queda en su lugar.', costa: '¡Una ola gigante revolcó a todos!', bariloche: '¡Avalancha! Todos ruedan a otro lugar.', cordoba: '¡Los ovnis del Uritorco abdujeron a todos!', sur: '¡El viento patagónico se llevó a todos!', norte: '¡El carnaval de Humahuaca arrastró a todos!' },
      ok: () => game.players.length > 1,
      run() {
        const pos = game.players.map((p) => p.pos);
        game.players.forEach((p, i) => { p.pos = pos[(i + 1) % pos.length]; p.trail = []; });
        fx({ type: 'shuffle' });
      } },
    { key: 'impuestazo', icon: '🧾', title: 'Impuesto a la riqueza',
      text: { _: 'El que va primero paga el 30% de sus mangos. Van al Banco.' },
      ok: () => ranked()[0].mangos >= 5,
      run() {
        const p = ranked()[0], n = Math.floor(p.mangos * 0.3);
        if (shielded(p)) return `${p.name} se escondió abajo del paraguas y no pagó nada.`;
        p.mangos -= n; game.bank += n; p.stats.taxPaid += n;
        fx({ type: 'coins', playerId: p.id, amount: -n });
        return `${p.name} paga ${n} mangos. ¡El Banco ahora tiene ${game.bank}!`;
      } },
    { key: 'duelo', icon: '⚔️', title: 'Duelo del puntero',
      text: { _: 'El primero y el último se juegan 10 mangos mano a mano. ¡Ahora!' },
      ok: () => { const r = ranked(); return game.players.length >= 3 && r[0].mangos >= 3 && r[r.length - 1].mangos >= 3; },
      async after() {
        const r = ranked(), a = r[r.length - 1], b = r[0], bet = Math.min(10, a.mangos, b.mangos);
        say(line('duel', a.name, b.name, bet), 'shock');
        await playMinigame({ participants: [a, b], mode: 'duel', teams: [[a.id], [b.id]], bet });
      } },
    { key: 'feriado', icon: '🧉', title: '¡Feriado largo!',
      text: { _: 'Todos se toman unos mates: Mate Cebado para cada uno.' },
      run() { for (const p of game.players) { if (p.items.length < MAX_ITEMS) p.items.push('mate'); else p.mangos += 3; } } },
    { key: 'apagon', icon: '🔌', title: '¡Apagón!',
      text: { _: 'Se cortó la luz y en la oscuridad cada uno pierde un ítem.' },
      ok: () => game.players.some((p) => p.items.length),
      run() { for (const p of game.players) if (p.items.length) p.items.splice(Math.floor(Math.random() * p.items.length), 1); } },
  ];

  async function roundNews() {
    const forced = env.LP_NEWS_KEY && NEWS.find((n) => n.key === env.LP_NEWS_KEY);
    const n = forced || pickOne(NEWS.filter((x) => !x.ok || x.ok()));
    game.phase = 'news';
    game.news = { icon: n.icon, title: n.title, text: n.text[game.boardKey] || n.text._, result: null };
    game.message = `${n.icon} ${n.title}`;
    say(line('news'), 'shock', true);
    fx({ type: 'news' });
    broadcast();
    await sleep(4200);
    const result = n.run ? n.run() : null;
    if (result) game.news = { ...game.news, result };
    broadcast();
    await sleep(result ? 4200 : 2600);
    game.news = null;
    if (n.after) await n.after();
  }

  // ---------- Turno ----------
  function botItem(p) {
    const has = (k) => p.items.includes(k);
    const d = distTo(p.pos, game.copaSpace);
    if (has('remis') && p.mangos >= game.copaPrice && d > 8) return 'remis';
    if (has('trucho') && d <= 10 && p.mangos >= game.copaPrice) return 'trucho';
    if (has('chancla') && game.players.some((o) => o !== p && o.mangos >= 8)) return 'chancla';
    if (has('cambiazo') && game.players.some((o) => o !== p && distTo(o.pos, game.copaSpace) + 4 < d)) return 'cambiazo';
    if (has('bache') && Math.random() < 0.5) return 'bache';
    if (has('triple') && d > 8) return 'triple';
    if (has('doble')) return 'doble';
    if (has('mate') && d > 5) return 'mate';
    return null;
  }

  // Si tiene un paraguas, se cubre (y lo gasta)
  function shielded(p) {
    const i = p.items.indexOf('paraguas');
    if (i < 0) return false;
    p.items.splice(i, 1);
    say(line('paraguas', p), 'shock');
    return true;
  }

  // Elegir a otro jugador desde el celu (para la chancleta y el cambiazo)
  function askTarget(p, why, auto) {
    const others = game.players.filter((o) => o !== p);
    return ask(p, 'target', auto, 15000, { why, options: others.map((o) => ({ id: o.id, name: o.name, char: o.char, mangos: o.mangos, copas: o.copas })) })
      .then((id) => others.find((o) => o.id === id) || auto());
  }

  async function playTurn(p) {
    game.phase = 'turn';
    game.dice = null;
    game.message = `Le toca a ${p.name}`;
    const r = ranked();
    if (game.round > 1 && r.length > 2 && r[0] === p && p.copas > 0) maybeSay(0.35, line('turnLeader', p));
    else if (game.round > 2 && r[r.length - 1] === p) maybeSay(0.3, line('turnLast', p));
    else maybeSay(0.15, line('turn', p));
    const choice = await ask(p, 'roll', () => ({ item: p.bot ? botItem(p) : null }), 25000);
    let item = choice && choice.item && p.items.includes(choice.item) && !ITEMS[choice.item].passive ? choice.item : null;
    if (item) { p.items.splice(p.items.indexOf(item), 1); p.stats.itemsUsed++; }

    if (item === 'chancla') {
      const target = await askTarget(p, 'chancla', () => game.players.filter((o) => o !== p).sort((a, b) => b.mangos - a.mangos)[0]);
      game.phase = 'item';
      if (shielded(target)) {
        game.message = `🩴 ${p.name} le tiró la chancleta a ${target.name}... ¡pero se cubrió con el paraguas! ☂️`;
        fx({ type: 'event', deltas: [], item: 'chancla', from: p.id, to: target.id });
      } else {
        const n = Math.min(6, target.mangos);
        target.mangos -= n; p.mangos += n; p.stats.stolen += n;
        game.message = `🩴 ¡${p.name} le tiró la chancleta a ${target.name} y le sacó ${n} mangos!`;
        say(line('chancla', p, target), 'shock');
        fx({ type: 'event', deltas: [{ playerId: p.id, amount: n }, { playerId: target.id, amount: -n }], item: 'chancla', from: p.id, to: target.id });
      }
      broadcast();
      await sleep(2800);
      item = null;
    } else if (item === 'cambiazo') {
      const target = await askTarget(p, 'cambiazo', () => game.players.filter((o) => o !== p).sort((a, b) => distTo(a.pos, game.copaSpace) - distTo(b.pos, game.copaSpace))[0]);
      const a = p.pos; p.pos = target.pos; target.pos = a; p.trail = []; target.trail = [];
      game.phase = 'item';
      game.message = `🔄 ¡Cambiazo! ${p.name} y ${target.name} cambian de lugar.`;
      say(line('cambiazo', p, target), 'shock');
      fx({ type: 'swap', a: p.id, b: target.id });
      broadcast();
      await sleep(2600);
      item = null;
    } else if (item === 'bache') {
      game.traps = game.traps.filter((t) => t.pos !== p.pos);
      if (node(p.pos).type !== 'inicio') game.traps.push({ pos: p.pos, owner: p.id });
      game.phase = 'item';
      game.message = `🕳️ ${p.name} dejó un bache en su casilla. ¡El que caiga ahí le paga 8 mangos!`;
      say(line('bache', p), 'talk');
      fx({ type: 'trap', pos: p.pos });
      broadcast();
      await sleep(2200);
      item = null;
    }

    if (item === 'remis') {
      game.phase = 'item';
      game.message = `🚕 ¡${p.name} se tomó un remís directo a la Copa!`;
      p.stats.rides++;
      fx({ type: 'remis', playerId: p.id, path: pathTo(B(), p.pos, game.copaSpace) });
      broadcast();
      await sleep(1400);
      p.pos = game.copaSpace; p.trail = [];
      game.phase = 'moving';
      broadcast();
      await sleep(900);
      await copaStop(p);
      if (isOver()) return;
      await afterMove(p);
      return;
    }

    let n, detail = null;
    if (item === 'trucho') {
      const auto = () => Math.max(1, Math.min(10, distTo(p.pos, game.copaSpace)));
      say(line('trucho', p), 'talk');
      n = await ask(p, 'number', auto, 15000, { max: 10 });
      n = Math.max(1, Math.min(10, Math.round(Number(n)) || auto()));
    } else {
      const count = item === 'triple' ? 3 : item === 'doble' ? 2 : 1;
      const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 10));
      n = rolls.reduce((a, b) => a + b, 0);
      p.stats.diceTotal += n; p.stats.rolls += count;
      if (count > 1) detail = rolls;
      if (item === 'mate') { detail = [n, 4]; n += 4; }
    }
    game.phase = 'rolling';
    game.dice = { value: null, left: null, item };
    game.message = item ? `${p.name} usa ${ITEMS[item].emoji} ${ITEMS[item].name} y tira…` : `${p.name} tira el dado...`;
    broadcast();
    await sleep(1400);
    game.dice = { value: n, left: n, item, detail };
    game.message = detail ? `¡${p.name} sacó ${detail.join(' + ')} = ${n}!` : `¡${p.name} sacó ${n}!`;
    if (!item && n >= 9) maybeSay(0.5, line('rollHigh', p, n), 'happy');
    else if (!item && n <= 2) maybeSay(0.5, line('rollLow', p, n), 'sad');
    broadcast();
    await sleep(900);

    game.phase = 'moving';
    if (await walk(p, n, { stopAtCopa: true })) return;
    game.dice = null;
    await afterMove(p);
  }

  // Camina n pasos. Devuelve true si la partida terminó en el camino (alguien llegó a la meta de Copas).
  async function walk(p, n, { stopAtCopa = true, autoPath = false } = {}) {
    let left = n;
    while (left > 0) {
      const here = node(p.pos);
      let nextId;
      if (here.next.length > 1) nextId = autoPath ? pickOne(here.next) : await choosePath(p, here);
      else nextId = here.next[0];
      p.pos = nextId;
      const nn = node(nextId);
      if (nn.type !== 'cruce') { left--; p.stats.steps++; p.trail.push(nextId); if (p.trail.length > 12) p.trail.shift(); }
      if (game.dice) game.dice.left = left;
      broadcast();
      await sleep(340);
      if (nn.type === 'cruce') continue;
      if (stopAtCopa && p.pos === game.copaSpace) {
        await copaStop(p);
        if (isOver()) { game.dice = null; return true; }
      }
      if (nn.type === 'banco' && left > 0) await bankPass(p);
    }
    return false;
  }

  async function choosePath(p, here) {
    game.phase = 'path';
    game.message = `${p.name} llegó a un cruce: ¿por dónde sigue?`;
    const auto = () => {
      if (Math.random() < 0.25) return pickOne(here.options).to;
      return [...here.options].sort((a, b) => distTo(a.to, game.copaSpace) - distTo(b.to, game.copaSpace))[0].to;
    };
    let to = await ask(p, 'path', auto, 15000, { options: here.options, at: here.id });
    if (!here.next.includes(to)) to = auto();
    const opt = here.options.find((o) => o.to === to);
    game.phase = 'moving';
    game.message = `${p.name} va ${opt.label.toLowerCase()}.`;
    broadcast();
    return to;
  }

  async function bankPass(p) {
    const n = Math.min(2, p.mangos);
    if (!n) return;
    p.mangos -= n; game.bank += n;
    game.phase = 'land';
    game.message = `🏦 ${p.name} pasó por el Banco y depositó ${n} mangos (hay ${game.bank} guardados).`;
    fx({ type: 'coins', playerId: p.id, amount: -n });
    broadcast();
    await sleep(1300);
    game.phase = 'moving';
  }

  async function copaStop(p) {
    game.phase = 'copa';
    const price = game.copaPrice;
    if (p.mangos >= price) {
      game.message = `${p.name} llegó a la Copa. ¿La compra por ${price} mangos?`;
      const buy = await ask(p, 'copa', () => true, 15000, { price });
      if (buy) {
        p.mangos -= price; p.copas++;
        game.message = game.mode === 'copas'
          ? (p.copas >= game.copasToWin ? `¡${p.name} levantó su Copa número ${p.copas}! 🏆🏆🏆` : `¡${p.name} levantó la Copa! 🏆 Tiene ${p.copas} de ${game.copasToWin}.`)
          : `¡${p.name} levantó la Copa! 🏆 Ya tiene ${p.copas}.`;
        say(line('copa', p), 'happy', true);
        fx({ type: 'copa', playerId: p.id });
        broadcast();
        await sleep(3400);
        checkLeader();
        if (!isOver()) await revealCopa(pickCopaSpace(p.pos), 'move');
        game.phase = 'moving';
        return;
      } else { game.message = `${p.name} pasó de largo. ¡Qué amarrete!`; say(line('pass', p), 'shock'); }
    } else {
      game.message = `${p.name} llegó a la Copa pero no le alcanza (necesita ${price} mangos).`;
      say(line('noMoney', p), 'sad');
    }
    broadcast();
    await sleep(2400);
    game.phase = 'moving';
  }

  // La Copa aparece en una casilla nueva: la cámara va hasta ahí para que todos vean dónde quedó
  async function revealCopa(to, why) {
    const from = game.copaSpace;
    game.copaSpace = to;
    game.phase = 'copaMove';
    const zone = node(to).zone;
    game.message = why === 'start'
      ? `🏆 ¡La Copa arranca${zone ? ' en ' + zone : ''}!`
      : `🏆 ¡La Copa se mudó${zone ? ' a ' + zone : ''}!`.replace(' a el ', ' al ');
    if (why !== 'start') maybeSay(0.4, line('copaMove'));
    fx({ type: 'copaMove', from, to });
    broadcast();
    await sleep(3400);
  }

  async function shopStop(p) {
    if (p.items.length >= MAX_ITEMS) {
      game.message = `${p.name} pasó por el kiosco, pero ya tiene los bolsillos llenos.`;
      broadcast();
      await sleep(2000);
      return;
    }
    game.phase = 'shop';
    game.message = `🏪 ${p.name} entró al kiosco. ¿Qué se compra?`;
    maybeSay(0.3, line('shop', p));
    // El kiosco no tiene todo siempre: cinco ítems al azar (el remís casi siempre está)
    const keys = Object.keys(ITEMS).filter((k) => k !== 'remis').sort(() => Math.random() - 0.5).slice(0, 4);
    const offer = [...keys, 'remis'];
    const botBuy = () => {
      if (!p.bot) return null;
      const afford = offer.filter((k) => p.mangos - ITEMS[k].price >= 10);
      if (afford.includes('remis') && p.mangos >= ITEMS.remis.price + game.copaPrice) return 'remis';
      return afford.length ? pickOne(afford) : null;
    };
    const k = await ask(p, 'shop', botBuy, 20000, { offer });
    if (k && ITEMS[k] && offer.includes(k) && p.mangos >= ITEMS[k].price && p.items.length < MAX_ITEMS) {
      p.mangos -= ITEMS[k].price; p.items.push(k); p.stats.spent += ITEMS[k].price;
      game.message = `${p.name} se compró ${ITEMS[k].emoji} ${ITEMS[k].name}.`;
      fx({ type: 'coins', playerId: p.id, amount: -ITEMS[k].price });
    } else game.message = `${p.name} miró todo y no compró nada.`;
    game.phase = 'land';
    broadcast();
    await sleep(1800);
  }

  // ---------- Regalo de Sifón: tres cajas, elegís una ----------
  function applyGift(p, g) {
    const giveItem = (k) => { if (p.items.length < MAX_ITEMS) { p.items.push(k); return true; } p.mangos += 5; return false; };
    switch (g.k) {
      case 'm10': p.mangos += 10; fx({ type: 'coins', playerId: p.id, amount: 10 }); return `${p.name} se lleva 10 mangos.`;
      case 'm5': p.mangos += 5; fx({ type: 'coins', playerId: p.id, amount: 5 }); return `${p.name} se lleva 5 mangos.`;
      case 'item': { const k = pickOne(['doble', 'triple', 'mate', 'trucho', 'chancla', 'cambiazo', 'bache', 'paraguas']); return giveItem(k) ? `¡${p.name} ganó ${ITEMS[k].emoji} ${ITEMS[k].name}!` : `${p.name} no tenía lugar para el ítem: +5 mangos.`; }
      case 'triple': case 'paraguas': case 'remis': return giveItem(g.k) ? `¡${p.name} ganó ${ITEMS[g.k].emoji} ${ITEMS[g.k].name}!` : `${p.name} no tenía lugar: +5 mangos.`;
      case 'cumple': {
        const deltas = [];
        for (const o of game.players) { if (o === p) continue; const n = Math.min(3, o.mangos); o.mangos -= n; p.mangos += n; deltas.push({ playerId: o.id, amount: -n }); }
        deltas.push({ playerId: p.id, amount: -deltas.reduce((a, d) => a + d.amount, 0) });
        fx({ type: 'event', deltas });
        return `¡Feliz cumple, ${p.name}! Cada uno le regala 3 mangos.`;
      }
      case 'copa': p.copas++; fx({ type: 'copa', playerId: p.id }); checkLeader(); return `¡NO LO PUEDO CREER! ¡${p.name} se lleva una COPA de regalo!`;
      case 'menos5': { const n = Math.min(5, p.mangos); p.mangos -= n; fx({ type: 'coins', playerId: p.id, amount: -n }); return `${p.name} pierde ${n} mangos.`; }
      case 'nada': return `La caja estaba vacía. ¡${p.name} se la comió!`;
      case 'regalo': {
        const poor = [...game.players].filter((o) => o !== p).sort((a, b) => a.mangos - b.mangos)[0];
        const n = Math.min(5, p.mangos);
        if (!poor || !n) return 'No había nada para regalar. ¡Zafaste!';
        p.mangos -= n; poor.mangos += n;
        fx({ type: 'event', deltas: [{ playerId: p.id, amount: -n }, { playerId: poor.id, amount: n }] });
        return `${p.name} le regala ${n} mangos a ${poor.name}. ¡Qué corazón!`;
      }
    }
    return '';
  }

  async function giftStop(p, text) {
    // Una caja buena, una mala y una cualquiera, mezcladas
    const good = GIFTS.filter((g) => g.good), bad = GIFTS.filter((g) => !g.good);
    const a = weighted(good), b = weighted(bad);
    let c = weighted(GIFTS); for (let i = 0; i < 6 && (c === a || c === b); i++) c = weighted(GIFTS);
    const boxes = [a, b, c].sort(() => Math.random() - 0.5);
    p.stats.gifts++;
    game.phase = 'gift';
    game.gift = { playerId: p.id, n: boxes.length, opened: null, contents: null };
    game.message = text || `🎁 ¡Regalo de Sifón para ${p.name}! Elegí una caja.`;
    say(line('gift', p), 'happy', true);
    fx({ type: 'gift' });
    const auto = () => Math.floor(Math.random() * boxes.length);
    let i = await ask(p, 'gift', auto, 20000, { boxes: boxes.length, text: 'Sifón te trae tres cajas. ¿Cuál abrís?' });
    i = Number.isInteger(i) && i >= 0 && i < boxes.length ? i : auto();
    const g = boxes[i];
    game.gift = { ...game.gift, opened: i };
    game.message = `${p.name} eligió la caja ${i + 1}... 🥁`;
    fx({ type: 'drumroll' });
    broadcast();
    await sleep(2200);
    const msg = applyGift(p, g);
    game.gift = { ...game.gift, contents: boxes.map((x) => ({ emoji: x.emoji, label: x.label, good: x.good })) };
    game.message = `${g.emoji} ${g.label}: ${msg}`;
    say(line(g.good ? 'giftGood' : 'giftBad'), g.good ? 'happy' : 'sad');
    if (g.good) fx({ type: 'giftOpen', playerId: p.id, good: true });
    broadcast();
    await sleep(4400);
    game.gift = null;
  }

  // Después de moverse: si hay alguien en la misma casilla, puede retarlo a duelo; si hay un bache, paga;
  // después, el efecto de la casilla
  async function afterMove(p) {
    const here = node(p.pos);
    const rivals = game.players.filter((o) => o !== p && o.pos === p.pos);
    if (rivals.length && here.type !== 'inicio') await maybeDuel(p, pickOne(rivals));
    await trapCheck(p);
    await landOn(p);
  }

  async function trapCheck(p) {
    const t = game.traps.find((x) => x.pos === p.pos && x.owner !== p.id);
    if (!t) return;
    game.traps = game.traps.filter((x) => x !== t);
    const owner = byId(t.owner);
    game.phase = 'land';
    fx({ type: 'trapHit', playerId: p.id, pos: p.pos });
    if (!owner) return;
    if (shielded(p)) { game.message = `🕳️ ${p.name} cayó en el bache de ${owner.name}, ¡pero el paraguas lo salvó! ☂️`; }
    else {
      const n = Math.min(8, p.mangos);
      p.mangos -= n; owner.mangos += n; owner.stats.stolen += n;
      game.message = `🕳️ ¡${p.name} cayó en el bache de ${owner.name} y le paga ${n} mangos!`;
      say(line('trap', p, owner), 'happy');
      fx({ type: 'event', deltas: [{ playerId: p.id, amount: -n }, { playerId: owner.id, amount: n }] });
    }
    broadcast();
    await sleep(2600);
  }

  async function maybeDuel(p, rival) {
    const bet = Math.min(10, p.mangos, rival.mangos);
    if (bet < 2) return;
    game.phase = 'duelAsk';
    game.message = `${p.name} cayó donde está ${rival.name}. ¿Lo reta a duelo por ${bet} mangos?`;
    const yes = await ask(p, 'duel', () => (p.bot ? Math.random() < 0.4 : false), 15000, { rival: rival.id, bet });
    if (!yes) { game.message = `${p.name} no se animó al duelo.`; maybeSay(0.5, line('noDuel', p)); broadcast(); await sleep(1400); return; }
    p.stats.duelsStarted++;
    say(line('duel', p.name, rival.name, bet), 'shock');
    await playMinigame({ participants: [p, rival], mode: 'duel', teams: [[p.id], [rival.id]], bet });
  }

  // Te lleva para atrás n casillas por donde viniste (avalancha, viento)
  function backSteps(p, n) {
    const tr = p.trail.filter((id) => node(id).type !== 'cruce');
    const k = Math.max(0, tr.length - 1 - n);
    return tr.length > 1 ? tr[k] : p.pos;
  }

  async function landOn(p) {
    const type = node(p.pos).type;
    game.phase = 'land';
    if (BLUE_SPACES.includes(type)) p.color = 'azul';
    else if (RED_SPACES.includes(type)) p.color = 'roja';
    else p.color = Math.random() < 0.5 ? 'azul' : 'roja';
    const m = mult();
    if (type === 'azul' || type === 'inicio') {
      p.mangos += 3 * m; p.stats.blueLands++;
      game.message = `${p.name} cayó en casilla celeste: +${3 * m} mangos.`;
      fx({ type: 'coins', playerId: p.id, amount: 3 * m });
      maybeSay(0.12, line('blue', p), 'happy');
    } else if (type === 'roja') {
      const n = Math.min(p.mangos, 3 * m);
      p.mangos -= n; p.stats.redLands++; p.stats.taxPaid += n;
      game.message = `${p.name} cayó en casilla roja: -${n} mangos.`;
      fx({ type: 'coins', playerId: p.id, amount: -n });
      maybeSay(0.3, line('red', p), 'sad');
    } else if (type === 'kiosco') {
      return shopStop(p);
    } else if (type === 'banco') {
      const had = game.bank, n = had || 3;
      p.mangos += n; game.bank = 0; p.stats.bankWon += n;
      game.message = had ? `🏦 ¡${p.name} cayó en el Banco y se lleva todo lo guardado: ${n} mangos!` : `🏦 El Banco estaba vacío: a ${p.name} le dan 3 mangos de cortesía.`;
      fx({ type: 'coins', playerId: p.id, amount: n });
      if (had >= 10) say(line('bank', p, n), 'shock');
    } else if (type === 'impuesto') {
      const n = Math.min(p.mangos, Math.max(3, Math.floor(p.mangos * 0.3)));
      p.mangos -= n; game.bank += n; p.stats.redLands++; p.stats.taxPaid += n;
      game.message = `🧾 ¡Impuestazo! A ${p.name} le cobran ${n} mangos. Van al Banco.`;
      fx({ type: 'coins', playerId: p.id, amount: -n });
      maybeSay(0.5, line('tax', p), 'sad');
    } else if (type === 'suerte') {
      return giftStop(p);
    } else if (type === 'pachamama') {
      // Norte: le ofrecés unos mangos a la Pachamama y ella te devuelve un regalo
      const n = Math.min(3, p.mangos);
      p.mangos -= n;
      if (n) fx({ type: 'coins', playerId: p.id, amount: -n });
      return giftStop(p, `🌄 ${p.name} le ofrece ${n} mangos a la Pachamama... ¡y ella le trae un regalo!`);
    } else if (type === 'zonda' || type === 'ovni') {
      // Mendoza: el viento Zonda te levanta. Córdoba: un ovni del Uritorco te abduce. Caés en cualquier casilla celeste.
      const options = B().nodes.filter((n) => n.type === 'azul' && n.id !== p.pos);
      const to = pickOne(options).id;
      p.stats.redLands++; p.stats.rides++;
      game.message = type === 'ovni'
        ? `🛸 ¡Un ovni del Uritorco abdujo a ${p.name}! Lo dejan en ${node(to).zone || 'otro lado'}.`
        : `🌪️ ¡Viento Zonda! ${p.name} sale volando y cae en ${node(to).zone || 'otro lado'}.`;
      maybeSay(0.4, line('special', p), 'shock');
      fx({ type, playerId: p.id, from: p.pos, to });
      broadcast();
      await sleep(type === 'ovni' ? 2200 : 1700);
      p.pos = to; p.trail = [];
      game.phase = 'moving';
      broadcast();
      await sleep(1600);
      return;
    } else if (type === 'ola' || type === 'pinguino') {
      // La Costa: la ola te empuja 4 para adelante. Sur: los pingüinos te llevan en trineo 3 para adelante.
      const n = type === 'ola' ? 4 : 3;
      p.stats.rides++;
      game.message = type === 'ola' ? `🌊 ¡Se vino una ola! ${p.name} surfea 4 casillas para adelante.` : `🐧 ¡Los pingüinos llevan a ${p.name} en trineo 3 casillas para adelante!`;
      fx({ type, playerId: p.id });
      broadcast();
      await sleep(1200);
      game.phase = 'moving';
      if (await walk(p, n, { autoPath: true })) return;
      await landOn(p);
      return;
    } else if (type === 'avalancha') {
      // Bariloche: la avalancha te arrastra 3 casillas para atrás y perdés 2 mangos
      const to = backSteps(p, 3);
      const n = Math.min(2, p.mangos);
      p.mangos -= n; p.stats.redLands++; p.stats.rides++;
      game.message = `🏔️ ¡Avalancha! ${p.name} rueda 3 casillas para atrás${n ? ` y pierde ${n} mangos` : ''}.`;
      maybeSay(0.4, line('special', p), 'shock');
      fx({ type: 'avalancha', playerId: p.id, from: p.pos, to, lost: n });
      broadcast();
      await sleep(1500);
      p.pos = to; p.trail = [];
      game.phase = 'moving';
      broadcast();
      await sleep(1400);
      return;
    } else if (type === 'colectivo') {
      const to = node(p.pos).warp;
      const vehicle = VEHICLE[game.boardKey] || 'el micro';
      p.stats.rides++;
      game.message = `🚌 ${p.name} se tomó ${vehicle}: ¡se va directo a ${node(to).zone}!`;
      fx({ type: 'bus', playerId: p.id, from: p.pos, to, board: game.boardKey });
      broadcast();
      await sleep(1600);
      p.pos = to; p.trail = [];
      game.phase = 'moving';
      broadcast();
      await sleep(1500);
      game.phase = 'land';
      game.message = `${p.name} se bajó. (En ${vehicle} no se para en la Copa)`;
      broadcast();
      await sleep(1600);
      return;
    } else {
      p.stats.eventLands++;
      const before = new Map(game.players.map((o) => [o.id, o.mangos]));
      game.message = '❓ ' + pickOne(EVENTS)(p, game.players);
      const deltas = game.players.map((o) => ({ playerId: o.id, amount: o.mangos - before.get(o.id) })).filter((d) => d.amount);
      fx({ type: 'event', deltas });
    }
    broadcast();
    await sleep(type === 'evento' ? 3800 : 2000);
  }

  // ---------- Minijuegos ----------
  // Equipos según el color de cada uno (solo con 4 jugadores, como en el original)
  function pickMode() {
    const ps = game.players;
    // La mitad de las veces se juega todos contra todos igual (hay más minijuegos de ese tipo)
    if (ps.length !== 4 || Math.random() < 0.5) return { mode: 'ffa', teams: null };
    const az = ps.filter((p) => p.color === 'azul'), ro = ps.filter((p) => p.color === 'roja');
    if (az.length === 2) return { mode: '2v2', teams: [az.map((p) => p.id), ro.map((p) => p.id)] };
    if (az.length === 1 || ro.length === 1) {
      const solo = az.length === 1 ? az : ro, rest = az.length === 1 ? ro : az;
      return { mode: '1v3', teams: [solo.map((p) => p.id), rest.map((p) => p.id)] };
    }
    return { mode: 'ffa', teams: null };
  }

  function nextMinigameKey(mode) {
    const forced = (env.LP_MINIGAME || '').split(',').filter((k) => MINIGAMES[k]);
    if (forced.length) { nextMinigameKey.i = ((nextMinigameKey.i ?? -1) + 1) % forced.length; return forced[nextMinigameKey.i]; }
    // Los minijuegos de un mapa (meta.board) solo salen en ese mapa, y salen el doble de seguido
    const keys = Object.keys(MINIGAMES).filter((k) => MINIGAMES[k].modes.includes(mode) && (!MINIGAMES[k].board || MINIGAMES[k].board === game.boardKey));
    const local = keys.filter((k) => MINIGAMES[k].board);
    if (mode !== 'ffa') return pickOne([...keys, ...local]);
    const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
    // Primero todos mezclados, y al final otra vuelta de los del mapa (así no se repiten enseguida)
    if (!mgQueue.length) mgQueue = [...shuffle(keys), ...shuffle(local)];
    return mgQueue.shift();
  }

  async function roundMinigame() {
    let { mode, teams } = pickMode();
    const forced = (env.LP_MINIGAME || '').split(',').filter((k) => MINIGAMES[k]);
    let key = nextMinigameKey(mode);
    if (forced.length && !MINIGAMES[key].modes.includes(mode)) {
      // En pruebas: si el minijuego forzado es por equipos, armamos los equipos a mano
      mode = MINIGAMES[key].modes[0];
      const ids = game.players.map((p) => p.id);
      teams = mode === '2v2' ? [ids.slice(0, 2), ids.slice(2)] : mode === '1v3' || mode === 'duel' ? [ids.slice(0, 1), ids.slice(1, mode === 'duel' ? 2 : 4)] : null;
    }
    const participants = mode === 'duel' ? game.players.filter((p) => teams.flat().includes(p.id)) : game.players;
    if (mode === '2v2') say(line('team2'));
    else if (mode === '1v3') say(line('team1', byId(teams[0][0]).name));
    else say(line('ffa'), 'happy');
    await playMinigame({ participants, mode, teams, key });
  }

  function sendCue(p, cue) { if (!p.bot) send(p.ws, { t: 'cue', ...cue }); }

  async function playMinigame({ participants, mode, teams, key, bet = 0, onResults = null }) {
    key = key || nextMinigameKey(mode);
    const meta = MINIGAMES[key];
    game.phase = 'mgIntro';
    game.mg = { key, ...meta, mode, teams, bet, players: participants.map((p) => p.id),
      ready: participants.filter((p) => p.bot).map((p) => p.id) };
    game.results = null;
    game.message = `Minijuego: ${meta.title}`;
    broadcast();
    const t0 = gameNow();
    for (;;) {
      await sleep(250);
      const waited = (gameNow() - t0) * SPEED;
      const humans = participants.filter((p) => !p.bot && p.connected);
      const allReady = humans.every((p) => game.mg.ready.includes(p.id));
      if ((allReady && waited > 2500) || waited > 20000) break;
    }

    mgSim = createMinigame(key, participants, { mode, teams });
    game.phase = 'minigame';
    for (const p of participants) sendCue(p, { reset: true });
    broadcast();
    const id = runId;
    await new Promise((resolve, reject) => {
      let last = Date.now();
      mgTimer = setInterval(() => {
        if (id !== runId) { clearInterval(mgTimer); reject(ABORT); return; }
        const now = Date.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (game.paused) return; // en pausa el minijuego queda congelado
        for (let k = 0; k < SPEED && !mgSim.done; k++) {
          for (const p of participants) if (p.bot || !p.connected) mgSim.bot(p.id, dt);
          mgSim.step(dt);
        }
        for (const c of mgSim.takeCues()) {
          if (c.to === '*') participants.forEach((p) => sendCue(p, c.cue));
          else { const p = participants.find((o) => o.id === c.to); if (p) sendCue(p, c.cue); }
        }
        const snap = JSON.stringify({ t: 'mg', key, ...mgSim.snapshot() });
        for (const ws of hosts) if (ws.readyState === 1) ws.send(snap);
        if (mgSim.done) { clearInterval(mgTimer); resolve(); }
      }, 1000 / 30);
    });
    await sleep(1200);

    game.results = scoreMinigame(mgSim, participants, mode, teams, bet);
    for (const r of game.results) {
      const p = byId(r.id);
      p.mangos = Math.max(0, p.mangos + r.reward);
      if (r.reward > 0) p.stats.mgWon += r.reward;
    }
    mgStats(game.results, mode);
    if (onResults) onResults(game.results);
    mgSim = null;
    game.phase = 'mgResults';
    game.message = mode === 'duel' ? 'Resultado del duelo' : 'Resultados del minijuego';
    const winners = game.results.filter((r) => r.place === 1).map((r) => byId(r.id).name);
    if (game.results.every((r) => r.place === 1)) say(line('mgTie'), 'sad');
    else if (winners.length === 1) say(line('mgWin', winners[0], meta.title), 'happy');
    else say(line('mgTeam', winners.join(' y ')), 'happy');
    broadcast();
    await sleep(6000);
    game.mg = null;
    game.results = null;
  }

  // Estadísticas de minijuegos para los premios del final
  function mgStats(results, mode) {
    const n = results.length;
    const worst = Math.max(...results.map((r) => r.place));
    for (const r of results) {
      const p = byId(r.id); if (!p) continue;
      if (r.place === 1 && worst > 1) { p.stats.mgFirst++; if (mode === 'duel') p.stats.duelsWon++; }
      if (mode === 'ffa' && n >= 4 && r.place <= 3) p.stats.mgPodium++;
      if (mode === 'ffa' && n >= 3 && r.place === worst && worst > 1) p.stats.mgLast++;
    }
  }

  // Premios según el modo del minijuego
  function scoreMinigame(sim, participants, mode, teams, bet) {
    if (mode === 'ffa') {
      const ranking = sim.ranking();
      let place = 0;
      return ranking.map((r, i) => {
        if (i === 0 || r.score !== ranking[i - 1].score) place = i;
        return { id: r.id, place: place + 1, score: r.score, reward: MG_REWARDS[place] || 0 };
      });
    }
    // Por equipos y duelos: gana un equipo (0 o 1) o empatan (null)
    let win = typeof sim.winnerTeam === 'function' ? sim.winnerTeam() : undefined;
    if (win === undefined) {
      // Minijuegos individuales usados como duelo: gana el mejor del ranking
      const r = sim.ranking();
      win = r.length > 1 && r[0].score === r[1].score ? null : teams.findIndex((t) => t.includes(r[0].id));
    }
    return participants.map((p) => {
      const team = teams.findIndex((t) => t.includes(p.id));
      let reward = 0;
      if (win == null) reward = mode === 'duel' ? 0 : 3;
      else if (mode === 'duel') reward = team === win ? bet : -bet;
      else if (mode === '2v2') reward = team === win ? 10 : 0;
      else if (mode === '1v3') reward = team === win ? (team === 0 ? 15 : 5) : 0;
      return { id: p.id, place: win == null ? 1 : team === win ? 1 : 2, team, reward };
    }).sort((a, b) => a.place - b.place);
  }

  // ---------- Modo "Solo minijuegos" (sin tablero, para probar los juegos) ----------
  // Desde la compu se elige qué minijuego y en qué modo. El que gana cada uno suma una Copa.
  let pickWait = null;
  function minisOptions() {
    const n = game.players.length;
    return Object.entries(MINIGAMES).map(([key, m]) => ({
      key, title: m.title, board: m.board ? BOARDS[m.board].name : null,
      modes: m.modes.filter((md) => md === 'ffa' || md === 'duel' || (n === 4 && (md === '2v2' || md === '1v3'))),
    })).filter((o) => o.modes.length);
  }
  function randomPick() {
    const opts = minisOptions();
    const o = pickOne(opts);
    return { key: o.key, mode: o.modes.includes('ffa') ? 'ffa' : pickOne(o.modes) };
  }
  function waitPick() {
    return new Promise((resolve, reject) => {
      const id = runId, t0 = gameNow();
      const t = setInterval(() => {
        if (id !== runId) { clearInterval(t); pickWait = null; reject(ABORT); return; }
        // Si no queda nadie con el celu conectado ni la compu abierta, siguen solos los bots
        const humans = game.players.some((p) => !p.bot && p.connected);
        if (!humans && !hosts.size && (gameNow() - t0) * SPEED > 6000) pickWait(randomPick());
      }, 500);
      pickWait = (v) => { clearInterval(t); pickWait = null; resolve(v); };
    });
  }
  async function runMinis() {
    for (const p of game.players) p.mangos = 0;
    say(line('minis'), 'happy');
    let played = 0;
    for (;;) {
      game.phase = 'mgPick';
      game.mgPick = { options: minisOptions(), played };
      game.message = 'Elegí un minijuego en la compu';
      broadcast();
      const pick = await waitPick();
      game.mgPick = null;
      if (pick.end) break;
      const ids = game.players.map((p) => p.id).sort(() => Math.random() - 0.5);
      let participants = game.players, teams = null;
      if (pick.mode === 'duel') {
        const a = ids[0], b = ids[1];
        participants = [byId(a), byId(b)]; teams = [[a], [b]];
      } else if (pick.mode === '2v2') teams = [ids.slice(0, 2), ids.slice(2)];
      else if (pick.mode === '1v3') teams = [ids.slice(0, 1), ids.slice(1)];
      await playMinigame({ participants, mode: pick.mode, teams, key: pick.key, bet: pick.mode === 'duel' ? 5 : 0, onResults: (res) => {
        if (res.some((r) => r.place !== 1)) for (const r of res) if (r.place === 1) byId(r.id).copas++;
      } });
      played++;
    }
    finishGame();
  }

  // ---------- Final: premios sorpresa ----------
  // Salen 5 premios al azar entre 21. Primero se muestra cuánto hizo cada uno (con redoble) y después quién gana.
  async function bonusAwards() {
    const list = drawBonuses(game.players, 5);
    if (!list.length) return;
    game.phase = 'bonus';
    game.bonus = null;
    game.message = '¡Premios sorpresa!';
    say(line('bonus'), 'happy', true);
    broadcast();
    await sleep(5000);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      game.bonus = { n: i + 1, of: list.length, title: a.title, desc: a.desc, icon: a.icon, unit: a.unit, low: !!a.low, values: a.values, winners: null };
      say(line('bonusWho', a.title), 'talk');
      fx({ type: 'drumroll' });
      broadcast();
      await sleep(4200);
      const ws = a.winners.map(byId).filter(Boolean);
      for (const w of ws) w.copas++;
      game.bonus = { ...game.bonus, winners: a.winners };
      say(line('bonusWin', ws.map((w) => w.name).join(' y ')), 'happy');
      fx({ type: 'bonus', ids: a.winners });
      broadcast();
      await sleep(4600);
    }
    game.bonus = null;
  }

  function finishGame() {
    const champ = champion();
    const sorted = [...game.players].sort((a, b) => (b === champ) - (a === champ) || b.copas - a.copas || b.mangos - a.mangos);
    game.standings = sorted.map((p) => ({ id: p.id, copas: p.copas, mangos: p.mangos }));
    game.phase = 'end';
    const w = sorted[0];
    game.message = game.mode === 'copas' && champ
      ? `¡${w.name} juntó ${w.copas} ${w.copas === 1 ? 'Copa' : 'Copas'} y es el campeón de Che Party!`
      : `¡${w.name} gana Che Party con ${w.copas} ${w.copas === 1 ? 'Copa' : 'Copas'}!`;
    say(line('end', w), 'happy', true);
    fx({ type: 'win', playerId: w.id });
    broadcast();
  }

  function backToLobby() {
    runId++;
    if (mgTimer) clearInterval(mgTimer);
    if (pending) { clearTimeout(pending.timer); clearInterval(pending.check); pending = null; }
    pickWait = null;
    mgSim = null;
    game.phase = 'lobby';
    game.paused = false;
    game.players = game.players.filter((p) => p.bot || p.connected);
    for (const p of game.players) { resetPlayer(p); p.ready = false; }
    Object.assign(game, { bank: 0, orderRolls: null, turn: 0, round: 0, dice: null, message: '', decision: null, mg: null,
      results: null, standings: null, fx: null, host: null, bonus: null, lastRounds: false, mgPick: null, news: null, gift: null, traps: [], copaPrice: COPA_PRICE });
    broadcast();
  }

  // ---------- Jugadores ----------
  let nextId = 1;
  const freeChar = () => CHARACTERS.find((c) => !game.players.some((p) => p.char === c.key));
  function newPlayer(name, bot) {
    const c = freeChar();
    const p = { id: (bot ? 'b' : 'p') + (nextId++) + Math.random().toString(36).slice(2, 7), name: name.slice(0, 14), char: c.key, bot, connected: !bot, ws: null };
    resetPlayer(p);
    game.players.push(p);
    return p;
  }

  function handle(ws, msg) {
    const me = ws.playerId && game.players.find((p) => p.id === ws.playerId);
    const answer = (kind, value) => { if (me && pending && pending.playerId === me.id && pending.kind === kind) pending.done(value); };
    const lobby = me && game.phase === 'lobby';
    // Las opciones de la partida se eligen en la compu (la pantalla de la tele); el celu solo elige personaje y dice LISTO
    const host = hosts.has(ws);
    const hostLobby = host && game.phase === 'lobby';
    switch (msg.t) {
      case 'ping': ws.isAlive = true; send(ws, { t: 'pong' }); break;
      case 'hello': if (msg.role === 'host') { hosts.add(ws); send(ws, publicState()); } break;
      case 'join': {
        let p = msg.id && game.players.find((o) => o.id === msg.id && !o.bot);
        if (!p) {
          const name = String(msg.name || '').trim();
          if (!name) { send(ws, { t: 'needName' }); return; }
          if (game.phase !== 'lobby') { send(ws, { t: 'error', msg: 'La partida ya empezó. Entrás en la próxima.' }); return; }
          if (game.players.length >= MAX_PLAYERS) {
            const bot = game.players.find((o) => o.bot);
            if (!bot) { send(ws, { t: 'error', msg: 'Ya hay 6 jugadores. ¡Esperá la próxima!' }); return; }
            game.players.splice(game.players.indexOf(bot), 1);
          }
          p = newPlayer(name, false);
        }
        if (p.ws && p.ws !== ws) p.ws.playerId = null;
        p.ws = ws; p.connected = true; clearTimeout(p.dropTimer);
        ws.playerId = p.id;
        send(ws, { t: 'you', id: p.id });
        broadcast();
        break;
      }
      case 'char':
        if (lobby && CHARACTERS.some((c) => c.key === msg.key) && !game.players.some((o) => o !== me && o.char === msg.key)) { me.char = msg.key; broadcast(); }
        break;
      case 'lobbyReady': if (lobby) { me.ready = !me.ready; broadcast(); } break;
      case 'rename': if (lobby && String(msg.name || '').trim()) { me.name = String(msg.name).trim().slice(0, 14); broadcast(); } break;
      case 'addBot':
        if (hostLobby && game.players.length < MAX_PLAYERS) {
          const used = new Set(game.players.map((p) => p.name));
          newPlayer(BOT_NAMES.find((n) => !used.has(n)) || 'Bot', true);
          broadcast();
        }
        break;
      case 'removeBot':
        if (hostLobby) { const i = game.players.map((p) => p.bot).lastIndexOf(true); if (i >= 0) { game.players.splice(i, 1); broadcast(); } }
        break;
      // Sacar jugadores desde la compu: en la sala de espera, o entre minijuegos en Solo minijuegos
      case 'kick':
        if (hostLobby || (host && game.phase === 'mgPick' && game.players.length > 2)) { const p = game.players.find((o) => o.id === msg.id); if (p) { removePlayer(p); broadcast(); } }
        break;
      case 'mode': if (hostLobby && ['copas', 'rondas', 'minis'].includes(msg.mode)) { game.mode = msg.mode; broadcast(); } break;
      case 'goal': if (hostLobby && GOAL_OPTIONS.includes(msg.n)) { game.copasToWin = msg.n; broadcast(); } break;
      case 'rounds': if (hostLobby && ROUND_OPTIONS.includes(msg.n)) { game.rounds = msg.n; broadcast(); } break;
      case 'board':
        if (hostLobby && BOARDS[msg.key]) {
          game.boardKey = msg.key; game.board = BOARDS[msg.key];
          for (const p of game.players) p.pos = game.board.start;
          broadcast();
        }
        break;
      case 'start':
        if (hostLobby) {
          if (game.players.length < 2) { send(ws, { t: 'error', msg: 'Se necesitan al menos 2 jugadores (podés sumar bots).' }); return; }
          const notReady = game.players.filter((p) => !p.bot && p.connected && !p.ready);
          if (notReady.length && !msg.force) { send(ws, { t: 'error', msg: `Falta que toquen LISTO: ${notReady.map((p) => p.name).join(', ')}` }); return; }
          runGame();
        }
        break;
      case 'roll': answer('roll', { item: msg.item || null }); break;
      case 'path': answer('path', Number(msg.to)); break;
      case 'shop': answer('shop', msg.item || null); break;
      case 'copa': answer('copa', !!msg.buy); break;
      case 'duel': answer('duel', !!msg.yes); break;
      case 'target': answer('target', String(msg.id || '')); break;
      case 'number': answer('number', Number(msg.n)); break;
      case 'gift': answer('gift', Number(msg.i)); break;
      case 'orderRoll':
        if (me && game.phase === 'order' && game.orderRolls && !(me.id in game.orderRolls)) {
          game.orderRolls[me.id] = 1 + Math.floor(Math.random() * 10);
          broadcast();
        }
        break;
      case 'ready':
        if (me && game.phase === 'mgIntro' && game.mg && game.mg.players.includes(me.id) && !game.mg.ready.includes(me.id)) { game.mg.ready.push(me.id); broadcast(); }
        break;
      case 'input': case 'action': case 'mash':
        if (me && mgSim && game.mg && game.mg.players.includes(me.id)) mgSim.input(me.id, msg);
        break;
      case 'pickMg':
        if (host && game.phase === 'mgPick' && pickWait) {
          if (msg.random) { pickWait(randomPick()); break; }
          const o = game.mgPick.options.find((x) => x.key === msg.key);
          if (o && o.modes.includes(msg.mode)) pickWait({ key: o.key, mode: msg.mode });
        }
        break;
      case 'endMinis': if (host && game.phase === 'mgPick' && pickWait) pickWait({ end: true }); break;
      case 'again': if (host && game.phase === 'end') backToLobby(); break;
      case 'pause': if (host) setPaused(!game.paused); break;
    }
  }

  // Saca a un jugador de la sala; si tiene el celu conectado, le avisamos para que vuelva a la pantalla de entrar
  function removePlayer(p) {
    game.players = game.players.filter((o) => o !== p);
    clearTimeout(p.dropTimer);
    if (p.ws) { send(p.ws, { t: 'kicked' }); p.ws.playerId = null; p.ws = null; }
  }

  function onClose(ws) {
    sockets.delete(ws); hosts.delete(ws);
    const p = ws.playerId && game.players.find((o) => o.id === ws.playerId);
    if (p && p.ws === ws) {
      p.connected = false; p.ws = null;
      if (game.phase === 'lobby') {
        p.dropTimer = setTimeout(() => {
          if (!p.connected && game.phase === 'lobby') { game.players = game.players.filter((o) => o !== p); broadcast(); }
        }, 30000);
      }
      broadcast();
    }
  }

  return { sockets, hosts, handle, onClose };
}

module.exports = { createGame, CHARACTERS };
