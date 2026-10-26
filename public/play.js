// Che Party — control desde el celular.
const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin storage */ } },
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let ws = null;
let S = null;
let myId = store.get('lp_id');
let myName = store.get('lp_name') || '';
let lastScreen = null;
let mashCount = 0;
let mgActiveKey = null;
let chosenItem = null;   // ítem elegido para usar antes de tirar el dado
let builtButtons = null; // qué botones están armados en la grilla

const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* nada */ } };
const send = (msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };

// ---------- Conexión ----------
let lastMsg = 0;
let retryTimer = null;

// Abre (o reabre) la conexión. Se llama también al volver a la app, porque el celu
// puede haber dejado la conexión muerta sin avisar mientras la pantalla estaba apagada.
function connect() {
  clearTimeout(retryTimer);
  if (ws) { ws.onclose = null; ws.onmessage = null; try { ws.close(); } catch { /* nada */ } }
  const sock = new WebSocket(`ws://${location.host}`);
  ws = sock;
  lastMsg = Date.now();
  sock.onopen = () => {
    $('offline').classList.add('hidden');
    if (myId || myName) send({ t: 'join', id: myId, name: myName });
  };
  sock.onmessage = (ev) => {
    lastMsg = Date.now();
    const m = JSON.parse(ev.data);
    if (m.t === 'pong') return;
    if (m.t === 'you') { myId = m.id; store.set('lp_id', m.id); render(); }
    else if (m.t === 'needName') { myId = null; render(); }
    else if (m.t === 'kicked') {
      // Nos sacaron de la sala: olvidamos el lugar para no volver a entrar solos al reconectar
      myId = null; myName = ''; store.set('lp_id', ''); store.set('lp_name', '');
      $('name').value = ''; render();
      $('joinErr').textContent = 'Te sacaron de la partida. Poné tu nombre para volver a entrar.';
    }
    else if (m.t === 'error') { $('joinErr').textContent = m.msg; $('lobbyErr').textContent = m.msg; setTimeout(() => { $('lobbyErr').textContent = ''; }, 4000); }
    else if (m.t === 'state') {
      // Si el servidor es otro (se cerró y se volvió a abrir el juego), recargamos para tener la versión nueva
      if (m.build && window.lpBuild && m.build !== window.lpBuild) { location.reload(); return; }
      window.lpBuild = m.build;
      S = m; render();
    }
    else if (m.t === 'cue') onCue(m);
  };
  sock.onclose = () => {
    if (ws !== sock) return;
    $('offline').classList.remove('hidden');
    retryTimer = setTimeout(connect, 1000);
  };
}

// Si en 6 s no llegó nada (ni el pong), la conexión está muerta: reconectar.
setInterval(() => {
  if (ws && ws.readyState === 1) send({ t: 'ping' });
  if (Date.now() - lastMsg > 6000) { $('offline').classList.remove('hidden'); connect(); }
}, 2000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') connect(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) connect(); });
window.addEventListener('online', () => connect());

// ---------- Carteles del minijuego (cues) ----------
let cueTimer = null;
let meter = null; // { speed, phase, start }
function onCue(c) {
  if (c.reset) { setCue(''); meter = null; btnLabels = null; $('meter').classList.add('hidden'); if (window.padCue) window.padCue(null); return; }
  if ('pad' in c && window.padCue) window.padCue(c.pad);
  if (c.labels) { btnLabels = c.labels; applyLabels(); }
  if (c.text) setCue(c.text);
  if ('counter' in c) { counter.open = !!c.counter; renderCounter(); }
  if (c.buzz) buzz(c.buzz);
  if ('meter' in c) {
    meter = c.meter ? { ...c.meter, start: performance.now() } : null;
    if (c.meter) setMeterZones(c.meter.zone, c.meter.labels);
  }
}
function setCue(text) {
  clearTimeout(cueTimer);
  const el = $('cue');
  if (!text) { el.classList.add('hidden'); return; }
  $('cueText').textContent = text;
  el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop');
  cueTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}
// Cada minijuego puede mover la zona buena del medidor: zone = [buenaDesde, buenaHasta, perfectoDesde, perfectoHasta] (0 a 1)
function setMeterZones(zone = [0.33, 0.67, 0.44, 0.56], labels = ['Crudo', 'A punto', 'Quemado']) {
  const [g0, g1, p0, p1] = zone;
  const set = (el, a, b) => { el.style.left = (a * 100) + '%'; el.style.right = ((1 - b) * 100) + '%'; };
  set(document.querySelector('.meter .zone.good'), g0, g1);
  set(document.querySelector('.meter .zone.perfect'), p0, p1);
  const ls = document.querySelectorAll('.meter-labels span');
  labels.forEach((t, i) => { if (ls[i]) ls[i].textContent = t; });
}
function meterValue() {
  if (!meter) return null;
  const x = (((performance.now() - meter.start) / 1000) * meter.speed + meter.phase) % 1;
  return x < 0.5 ? x * 2 : 2 - x * 2;
}
setInterval(() => {
  const v = meterValue();
  if (v != null) $('needle').style.left = (v * 100).toFixed(1) + '%';
}, 16);

// ---------- Pantallas ----------
function showScreen(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id);
  if (id !== lastScreen) {
    // Al cambiar de pantalla, soltar cualquier control que haya quedado apretado.
    if (lastScreen === 'sJoy' && joyPointer !== null) releaseJoy();
    if (lastScreen === 'sLR' && held.size) { held.clear(); updateLR(); }
    if (['sRoll', 'sCopa', 'sShop', 'sPath', 'sOrder', 'sDuel', 'sGift', 'sTarget', 'sNumber'].includes(id)) buzz([60, 40, 60]);
    if (!['sJoy', 'sLR', 'sMash', 'sButtons', 'sCounter', 'sPad'].includes(id)) setCue('');
    lastScreen = id;
  }
}

const CONTROL_TEXT = {
  joystick: '🕹️ Joystick: apoyá el dedo y deslizá',
  lr: '◀ ▶ Mantené apretado un lado',
  mash: '👊 Un botón gigante: ¡apretá rápido!',
  counter: '🔢 Un contador con + y −',
  buttons: '🔘 Botones en pantalla',
  sling: '🎯 Gomera: tirá para atrás con el dedo y soltá',
  slider: '↔️ Deslizá el dedo: tu paleta va justo donde está el dedo',
  crank: '🔄 Girá el dedo en círculos sobre la pantalla',
  draw: '✏️ Dibujá con el dedo (o elegí la respuesta)',
  fingers: '☝️ Varios dedos a la vez: uno en cada círculo',
  oars: '🚣 Los dos pulgares: deslizá para abajo para remar',
  bid: '💰 Deslizá para elegir cuánto ofrecés y confirmá',
  swipe: '⚽ Deslizá para arriba: la curva del dedo es la comba',
};

function render() {
  if (!S) return;
  const me = S.players.find((p) => p.id === myId);
  const CH = Object.fromEntries(S.characters.map((c) => [c.key, c]));
  $('top').classList.toggle('hidden', !me);
  $('pausePhone').classList.toggle('hidden', !S.paused || !me);
  if (!me) {
    $('name').value = $('name').value || myName;
    showScreen('sJoin');
    return;
  }
  $('joinErr').textContent = '';
  const c = CH[me.char];
  // Todo el control toma el color de tu personaje
  if (document.documentElement.style.getPropertyValue('--me') !== c.color) document.documentElement.style.setProperty('--me', c.color);
  setFace($('meEmoji'), me.char, c);
  $('meName').textContent = me.name;
  const myTeam = S.mg && S.mg.teams && S.mg.mode !== 'duel' && ['mgIntro', 'minigame'].includes(S.phase) ? S.mg.teams.findIndex((t) => t.includes(myId)) : -1;
  $('top').classList.toggle('team-azul', myTeam === 0);
  $('top').classList.toggle('team-roja', myTeam === 1);
  $('meStats').innerHTML = S.phase === 'lobby' ? '<span>En la sala</span>' : `<span>💰 ${me.mangos}</span><span>🏆 ${me.copas}${S.mode === 'copas' ? '/' + S.copasToWin : ''}</span>`;
  $('meItems').innerHTML = (me.items || []).map((k) => `<span>${S.items[k].emoji}</span>`).join('');

  const myTurn = S.decision && S.decision.playerId === myId;
  const waitWith = (msg) => { $('waitMsg').textContent = msg || 'Mirá la tele 📺'; showScreen('sWait'); };
  // Decisiones que pueden aparecer en cualquier momento del turno
  if (myTurn && S.decision.kind === 'target') { renderTarget(); showScreen('sTarget'); return; }
  if (myTurn && S.decision.kind === 'number') { renderNumber(); showScreen('sNumber'); return; }
  if (myTurn && S.decision.kind === 'gift') { renderGift(); showScreen('sGift'); return; }

  switch (S.phase) {
    case 'lobby': {
      setFace($('lobbyChar'), me.char, c);
      $('lobbyCharName').textContent = c.name;
      renderCharGrid(me);
      const ready = !!me.ready;
      $('btnLobbyReady').textContent = ready ? '✓ ¡LISTO!' : 'LISTO';
      $('btnLobbyReady').classList.toggle('done', ready);
      const humans = S.players.filter((p) => !p.bot && p.connected);
      const n = humans.filter((p) => p.ready).length;
      $('lobbyInfo').textContent = ready ? `Listos ${n} de ${humans.length}. La partida se arranca desde la compu.` : 'Elegí tu personaje y tocá LISTO.';
      showScreen('sLobby');
      break;
    }
    case 'turn':
      if (myTurn && S.decision.kind === 'roll') { renderRollItems(me); showScreen('sRoll'); }
      else { chosenItem = null; waitWith(S.message); }
      break;
    case 'order': {
      const mine = S.orderRolls && S.orderRolls[myId];
      $('btnOrder').classList.toggle('hidden', mine != null);
      $('orderResult').classList.toggle('hidden', mine == null);
      $('orderResult').textContent = mine != null ? mine : '';
      const done = S.orderRolls ? Object.keys(S.orderRolls).length : 0;
      $('orderInfo').textContent = mine != null ? `Sacaste ${mine}. Esperando a los demás (${done}/${S.players.length})…` : '';
      if (!S.orderRolls) waitWith(S.message); else showScreen('sOrder');
      break;
    }
    case 'path':
      if (myTurn && S.decision.kind === 'path') { renderPaths(); showScreen('sPath'); }
      else waitWith(S.message);
      break;
    case 'duelAsk':
      if (myTurn && S.decision.kind === 'duel') {
        const rival = S.players.find((p) => p.id === S.decision.rival);
        $('duelMsg').textContent = `¡Caíste donde está ${rival ? rival.name : 'otro'}! ¿Lo retás a duelo por ${S.decision.bet} mangos? El que gana se los lleva.`;
        showScreen('sDuel');
      } else waitWith(S.message);
      break;
    case 'copa':
      if (myTurn && S.decision.kind === 'copa') {
        $('copaMsg').textContent = `¡Llegaste a la Copa! ¿La comprás por ${S.decision.price || S.copaPrice} mangos? Tenés ${me.mangos}.`;
        showScreen('sCopa');
      } else waitWith(S.message);
      break;
    case 'shop':
      if (myTurn && S.decision.kind === 'shop') { renderShop(me); showScreen('sShop'); }
      else waitWith(S.message);
      break;
    case 'mgIntro': {
      if (!S.mg.players.includes(myId)) { $('practice').classList.add('hidden'); waitWith('⚔️ ¡Duelo! Mirá la tele 📺'); break; }
      const isReady = S.mg.ready.includes(myId);
      // Antes de tocar ¡Listo! se puede probar el control
      if (!isReady && practicing) { showControl(S.mg); $('practice').classList.remove('hidden'); break; }
      $('mgTitle').textContent = S.mg.title;
      $('mgInstr').textContent = S.mg.instructions;
      $('mgCtrl').innerHTML = (CONTROL_TEXT[S.mg.control] || '') + (isReady ? '' : '<button id="btnPractice" class="btn try">🧪 Probar el control</button>');
      const bp = $('btnPractice'); if (bp) bp.onclick = () => { practicing = true; render(); };
      $('practice').classList.add('hidden');
      const team = S.mg.teams ? S.mg.teams.findIndex((t) => t.includes(myId)) : -1;
      if (team >= 0 && S.mg.mode !== 'duel') $('mgCtrl').innerHTML = `<span class="team t${team}">${team === 0 ? 'Equipo CELESTE' : 'Equipo ROJO'}</span><br>` + $('mgCtrl').innerHTML;
      const ready = S.mg.ready.includes(myId);
      $('btnReady').textContent = ready ? '✓ ¡LISTO!' : 'LISTO';
      $('btnReady').classList.toggle('done', ready);
      $('btnReady').disabled = ready;
      const humans = S.players.filter((p) => !p.bot && p.connected);
      const n = humans.filter((p) => S.mg.ready.includes(p.id)).length;
      $('readyInfo').textContent = ready ? `Esperando a los demás (${n}/${humans.length})…` : 'Tocá cuando hayas entendido';
      showScreen('sMgIntro');
      break;
    }
    case 'minigame': {
      practicing = false; $('practice').classList.add('hidden');
      if (!S.mg.players.includes(myId)) { waitWith('⚔️ ¡Duelo en la tele! Alentá 📺'); break; }
      if (mgActiveKey !== S.mg.key) { mgActiveKey = S.mg.key; mashCount = 0; $('mashCount').textContent = '0'; builtButtons = null; meter = null; window.padResetAll(); counter = { val: 0, open: false, sent: false }; renderCounter(); }
      showControl(S.mg);
      break;
    }
    case 'mgResults': {
      mgActiveKey = null; practicing = false; $('practice').classList.add('hidden');
      const r = S.results && S.results.find((o) => o.id === myId);
      $('resPlace').textContent = r ? (r.place === 1 ? '🏆' : `${r.place}°`) : '📺';
      $('resMsg').textContent = !r ? 'Mirá cómo terminó el duelo en la tele'
        : r.reward < 0 ? `Perdiste el duelo: ${r.reward} mangos 😩`
        : r.place === 1 ? `¡Ganaste! +${r.reward} mangos 🎉` : r.reward ? `+${r.reward} mangos` : 'Esta vez no sumaste. ¡La próxima!';
      showScreen('sResult');
      break;
    }
    case 'mgPick': waitWith('🎮 Elijan el minijuego en la compu'); break;
    case 'gift':
      if (myTurn && S.decision.kind === 'gift') { renderGift(); showScreen('sGift'); }
      else waitWith(S.message);
      break;
    case 'end': {
      const i = S.standings ? S.standings.findIndex((o) => o.id === myId) : -1;
      $('endPlace').textContent = i >= 0 ? `${i + 1}°` : '';
      $('endMsg').textContent = S.message;
      showScreen('sEnd');
      break;
    }
    default:
      waitWith(S.message);
  }
}

// ---------- Sala de espera: elegir personaje ----------
// Grilla con todos los personajes: los que ya eligió otro aparecen apagados con su nombre
function renderCharGrid(me) {
  const grid = $('charGrid');
  const sig = S.characters.map((c) => c.key + (S.players.find((p) => p.char === c.key) || {}).name).join() + me.id + !!window.lpPortrait;
  if (grid.dataset.sig === sig) return;
  grid.dataset.sig = sig;
  grid.innerHTML = S.characters.map((c) => {
    const owner = S.players.find((p) => p.char === c.key);
    const cls = owner ? (owner.id === me.id ? 'mine' : 'taken') : '';
    return `<button data-char="${c.key}" class="${cls}" style="background:${c.color}" ${cls === 'taken' ? 'disabled' : ''}><span class="face"></span><span class="nm">${esc(owner && owner.id !== me.id ? owner.name : c.name)}</span></button>`;
  }).join('');
  for (const el of grid.querySelectorAll('button')) {
    setFace(el.querySelector('.face'), el.dataset.char, S.characters.find((c) => c.key === el.dataset.char));
    el.onclick = () => { send({ t: 'char', key: el.dataset.char }); buzz(20); };
  }
}
$('btnLobbyReady').onclick = () => { send({ t: 'lobbyReady' }); buzz(30); };

// ---------- Elegir a otro jugador (chancleta, cambiazo) ----------
function renderTarget() {
  const d = S.decision;
  $('targetKicker').textContent = d.why === 'cambiazo' ? '🔄 Cambiazo' : '🩴 Chancleta';
  $('targetMsg').textContent = d.why === 'cambiazo' ? '¿Con quién cambiás de lugar?' : '¿A quién le revoleás la chancleta?';
  const sig = d.why + d.options.map((o) => o.id + o.mangos).join();
  if ($('targetList').dataset.sig === sig) return;
  $('targetList').dataset.sig = sig;
  $('targetList').innerHTML = d.options.map((o) => {
    const c = S.characters.find((x) => x.key === o.char);
    return `<button data-id="${o.id}"><span class="face" style="background:${c.color}"></span><span class="nm">${esc(o.name)}</span><span class="st">💰 ${o.mangos} · 🏆 ${o.copas}</span></button>`;
  }).join('');
  for (const el of $('targetList').querySelectorAll('button')) {
    const o = d.options.find((x) => x.id === el.dataset.id);
    setFace(el.querySelector('.face'), o.char, S.characters.find((x) => x.key === o.char));
    el.onclick = () => { send({ t: 'target', id: el.dataset.id }); buzz(40); };
  }
}
// ---------- Dado trucho: elegir el número ----------
function renderNumber() {
  if ($('numberGrid').children.length) return;
  $('numberGrid').innerHTML = Array.from({ length: 10 }, (_, i) => `<button data-n="${i + 1}">${i + 1}</button>`).join('');
  for (const el of $('numberGrid').querySelectorAll('button')) el.onclick = () => { send({ t: 'number', n: +el.dataset.n }); buzz(40); };
}

// ---------- Regalo de Sifón: elegir una de las cajas ----------
function renderGift() {
  const d = S.decision;
  const n = d.boxes || 3;
  $('giftMsg').textContent = d.text || 'Sifón te trae un regalo: elegí una caja.';
  const sig = S.round + '-' + S.turn + '-' + n;
  if ($('giftList').dataset.sig === sig) return;
  $('giftList').dataset.sig = sig;
  $('giftList').innerHTML = Array.from({ length: n }, (_, i) => `<button data-i="${i}">🎁<small>CAJA ${i + 1}</small></button>`).join('');
  for (const el of $('giftList').querySelectorAll('button')) el.onclick = () => { send({ t: 'gift', i: +el.dataset.i }); buzz([30, 30, 80]); };
}

// ---------- Retratos ----------
function setFace(el, key, c) {
  let url = null;
  try { url = window.lpPortrait ? window.lpPortrait(key, c.color) : null; } catch { url = null; }
  const html = url ? `<img src="${url}" alt="">` : c.emoji;
  if (el.dataset.face !== key + !!url) { el.dataset.face = key + !!url; el.innerHTML = html; }
}
window.addEventListener('lp-portrait', () => render());

// ---------- Control del minijuego (se usa también en la práctica) ----------
let practicing = false;
function showControl(mg) {
  const ctl = mg.control;
  if (ctl === 'mash') showScreen('sMash');
  else if (ctl === 'lr') showScreen('sLR');
  else if (ctl === 'buttons') { buildButtons(mg); showScreen('sButtons'); }
  else if (ctl === 'counter') { renderCounter(); showScreen('sCounter'); }
  else if (PAD_CONTROLS.includes(ctl)) window.padShow(mg);
  else {
    $('btnAction').classList.toggle('hidden', !mg.action);
    $('btnAction').textContent = mg.action || '';
    showScreen('sJoy');
  }
}
$('btnReady2').onclick = () => { send({ t: 'ready' }); practicing = false; buzz(20); render(); };

// ---------- Contador (Contá las Empanadas) ----------
let counter = { val: 0, open: false, sent: false };
function renderCounter() {
  $('counterVal').textContent = counter.val;
  const locked = !(counter.open || practicing) || counter.sent;
  $('sCounter').classList.toggle('locked', locked);
  $('counterHint').textContent = counter.sent ? `✅ Marcaste ${counter.val}. ¡Esperá el resultado!` : counter.open ? '🤔 ¿Cuántas empanadas pasaron?' : practicing ? '🧪 Práctica: tocá + y −' : '👀 Contá las empanadas en la tele';
}
$('btnPlus').onclick = () => { counter.val = Math.min(99, counter.val + 1); buzz(8); renderCounter(); };
$('btnMinus').onclick = () => { counter.val = Math.max(0, counter.val - 1); buzz(8); renderCounter(); };
$('btnCountOk').onclick = () => {
  if (practicing) return;
  send({ t: 'action', b: 'set', v: counter.val }); counter.sent = true; buzz(40); renderCounter();
};

// ---------- Cruces ----------
function renderPaths() {
  const opts = S.decision.options || [];
  $('pathList').innerHTML = opts.map((o) => `<button data-to="${o.to}"><span class="arrow">${o.arrow || '➡️'}</span>${esc(o.label)}</button>`).join('');
  for (const b of $('pathList').querySelectorAll('button')) b.onclick = () => { send({ t: 'path', to: +b.dataset.to }); buzz(30); };
}

// ---------- Ítems ----------
function renderRollItems(me) {
  const items = me.items || [];
  if (chosenItem && !items.includes(chosenItem)) chosenItem = null;
  $('rollItems').innerHTML = items.length
    ? '<p class="hint">Podés usar un ítem antes de tirar:</p>' + items.map((k) => {
      const it = S.items[k];
      return `<button data-item="${k}" class="${chosenItem === k ? 'sel' : ''}" ${it.passive ? 'disabled' : ''}><span class="ic">${it.emoji}</span><span>${esc(it.name)}<small>${esc(it.passive ? it.desc : it.desc)}${it.passive ? ' (se usa solo)' : ''}</small></span></button>`;
    }).join('')
    : '';
  for (const b of $('rollItems').querySelectorAll('button')) {
    b.onclick = () => { chosenItem = chosenItem === b.dataset.item ? null : b.dataset.item; renderRollItems(me); buzz(15); updateRollLabel(); };
  }
  updateRollLabel();
}
function updateRollLabel() {
  const it = chosenItem && S.items[chosenItem];
  const face = (ic, lbl) => `<span class="die">${ic}</span><span class="lbl">${lbl}</span>`;
  $('btnRoll').innerHTML = !it ? face('🎲', 'TIRAR') : face(it.emoji, esc(it.use || 'USAR Y TIRAR'));
}
function renderShop(me) {
  const offer = (S.decision && S.decision.offer) || Object.keys(S.items);
  $('shopList').innerHTML = offer.map((k) => {
    const it = S.items[k];
    return `<button data-item="${k}" ${me.mangos < it.price ? 'disabled' : ''}><span class="ic">${it.emoji}</span><span>${esc(it.name)}<small>${esc(it.desc)}</small></span><span class="pr">💰 ${it.price}</span></button>`;
  }).join('');
  for (const b of $('shopList').querySelectorAll('button')) b.onclick = () => { send({ t: 'shop', item: b.dataset.item }); buzz(30); };
}

// ---------- Botones genéricos (penales, carrera, tango, asado…) ----------
// Algunos minijuegos cambian el texto de los botones de cada jugador (por ejemplo, sus cartas en el Truco)
let btnLabels = null;
function applyLabels() {
  if (!btnLabels) return;
  [...$('btnGrid').querySelectorAll('button')].forEach((b, i) => { if (btnLabels[i] != null) b.textContent = btnLabels[i]; b.disabled = btnLabels[i] === ''; });
}
function buildButtons(mg) {
  const sig = mg.key + mg.layout;
  $('meter').classList.toggle('hidden', !mg.meter);
  if (builtButtons === sig) return;
  builtButtons = sig;
  const grid = $('btnGrid');
  grid.className = 'btn-grid ' + (mg.layout || 'row');
  grid.innerHTML = mg.buttons.map((b) => `<button data-b="${b.id}" class="${b.color ? 'colored' : ''}" style="grid-area:${b.id};${b.color ? `background:${b.color}` : ''}">${esc(b.label)}</button>`).join('');
  if (mg.layout !== 'cross') for (const el of grid.children) el.style.gridArea = '';
  for (const el of grid.querySelectorAll('button')) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.classList.add('pressed');
      const msg = { t: 'action', b: el.dataset.b };
      if (mg.meter) { const v = meterValue(); if (v != null) msg.v = +v.toFixed(3); }
      send(msg);
      buzz(12);
      // En penales queda marcado el lado elegido
      if (mg.key === 'penales') for (const o of grid.children) o.classList.toggle('on', o === el);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => el.classList.remove('pressed'));
  }
  applyLabels();
}

// ---------- Botones fijos ----------
function join() {
  const n = $('name').value.trim();
  if (!n) { $('joinErr').textContent = 'Poné tu nombre'; return; }
  myName = n; store.set('lp_name', n);
  send({ t: 'join', id: myId, name: n });
}
$('btnJoin').onclick = join;
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
$('btnRoll').onclick = () => { send({ t: 'roll', item: chosenItem }); chosenItem = null; buzz(30); };
$('btnOrder').onclick = () => { send({ t: 'orderRoll' }); buzz(40); };
$('btnCopaYes').onclick = () => send({ t: 'copa', buy: true });
$('btnCopaNo').onclick = () => send({ t: 'copa', buy: false });
$('btnDuelYes').onclick = () => { send({ t: 'duel', yes: true }); buzz(40); };
$('btnDuelNo').onclick = () => send({ t: 'duel', yes: false });
$('btnShopNo').onclick = () => send({ t: 'shop', item: null });
$('btnReady').onclick = () => { send({ t: 'ready' }); buzz(20); };

const press = (el, fn) => {
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('pressed'); fn(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => el.classList.remove('pressed'));
};
press($('btnAction'), () => { send({ t: 'action' }); buzz(25); });
press($('btnMash'), () => {
  send({ t: 'mash' }); buzz(8);
  mashCount++; $('mashCount').textContent = mashCount;
});

// ---------- Joystick flotante ----------
// El joystick aparece donde apoyás el dedo, así no hace falta mirar el celu.
const zone = $('joyZone'), joy = $('joy'), knob = $('knob');
const JOY_R = 60;       // recorrido máximo del dedo en píxeles
const DEAD = 0.15;      // zona muerta: roces chiquitos no mueven al personaje
let joyPointer = null, originX = 0, originY = 0;
let joyX = 0, joyY = 0, lastSent = 0, sentX = 0, sentY = 0;

function sendJoy(force) {
  const now = performance.now();
  const changed = Math.abs(joyX - sentX) > 0.04 || Math.abs(joyY - sentY) > 0.04;
  const stopped = joyX === 0 && joyY === 0 && (sentX !== 0 || sentY !== 0);
  if (!force && !stopped && (!changed || now - lastSent < 33)) return;
  lastSent = now; sentX = joyX; sentY = joyY;
  send({ t: 'input', x: +joyX.toFixed(2), y: +joyY.toFixed(2) });
}
function placeJoy(x, y) {
  const r = zone.getBoundingClientRect();
  joy.style.left = (x - r.left) + 'px';
  joy.style.top = (y - r.top) + 'px';
}
function moveJoy(e) {
  let dx = e.clientX - originX, dy = e.clientY - originY;
  const d = Math.hypot(dx, dy);
  // Si el dedo se va muy lejos, el centro lo sigue (no hace falta volver).
  if (d > JOY_R * 1.6) {
    const k = (d - JOY_R) / d;
    originX += dx * k; originY += dy * k; placeJoy(originX, originY);
    dx = e.clientX - originX; dy = e.clientY - originY;
  }
  const dd = Math.min(JOY_R, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);
  knob.style.transform = `translate(calc(-50% + ${Math.cos(ang) * dd}px), calc(-50% + ${Math.sin(ang) * dd}px))`;
  const mag = dd / JOY_R;
  const m = mag < DEAD ? 0 : (mag - DEAD) / (1 - DEAD);
  joyX = Math.cos(ang) * m; joyY = Math.sin(ang) * m;
  sendJoy(false);
}
function releaseJoy() {
  joyPointer = null; joyX = 0; joyY = 0;
  zone.classList.remove('active');
  joy.style.left = ''; joy.style.top = '';
  knob.style.transform = 'translate(-50%, -50%)';
  sendJoy(true);
}
zone.addEventListener('pointerdown', (e) => {
  if (joyPointer !== null) return;
  e.preventDefault();
  joyPointer = e.pointerId;
  try { zone.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
  originX = e.clientX; originY = e.clientY;
  placeJoy(originX, originY); zone.classList.add('active');
  buzz(10);
  moveJoy(e);
});
zone.addEventListener('pointermove', (e) => { if (e.pointerId === joyPointer) moveJoy(e); });
zone.addEventListener('pointerup', (e) => { if (e.pointerId === joyPointer) releaseJoy(); });
zone.addEventListener('pointercancel', (e) => { if (e.pointerId === joyPointer) releaseJoy(); });
setInterval(() => { if (joyPointer !== null) sendJoy(true); }, 250);

// ---------- Botones izquierda / derecha (mantener apretado) ----------
const held = new Map(); // pointerId -> -1 | 1
function updateLR() {
  // El último botón apretado manda
  const dirs = [...held.values()];
  joyX = dirs.length ? dirs[dirs.length - 1] : 0; joyY = 0;
  $('btnLeft').classList.toggle('pressed', dirs.includes(-1));
  $('btnRight').classList.toggle('pressed', dirs.includes(1));
  sendJoy(true);
}
for (const [id, dir] of [['btnLeft', -1], ['btnRight', 1]]) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* sin captura */ } held.delete(e.pointerId); held.set(e.pointerId, dir); buzz(8); updateLR(); });
  for (const ev of ['pointerup', 'pointercancel']) el.addEventListener(ev, (e) => { held.delete(e.pointerId); updateLR(); });
}
// En toda la app: evitar menú de mantener apretado
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- Teclado (para probar desde la compu) ----------
// Flechas/WASD mueven; espacio = botón principal; en botones: 1-4 o flechas.
const keys = new Set();
function keyJoy() {
  if (joyPointer !== null) return;
  joyX = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  joyY = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  sendJoy(true);
}
const KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.repeat) return;
  if (lastScreen === 'sButtons') {
    const btns = [...$('btnGrid').querySelectorAll('button')];
    const byDir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const target = btns.find((b) => b.dataset.b === byDir[e.key]) || btns[+e.key - 1] || (e.key === ' ' ? btns[0] : null);
    if (target) target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return;
  }
  if (KEYMAP[e.key] && !keys.has(KEYMAP[e.key])) { keys.add(KEYMAP[e.key]); keyJoy(); }
  if (e.key === ' ') {
    if (lastScreen === 'sMash') { send({ t: 'mash' }); mashCount++; $('mashCount').textContent = mashCount; }
    else if (lastScreen === 'sJoy') send({ t: 'action' });
    else if (lastScreen === 'sRoll') $('btnRoll').click();
    else if (lastScreen === 'sMgIntro') $('btnReady').click();
  }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) { keys.delete(KEYMAP[e.key]); keyJoy(); } });

$('name').value = myName;
connect();
