// Che Party — controles táctiles nuevos del celu, todos sobre un mismo lienzo:
//   sling  · gomera: tirás para atrás y soltás (dirección + fuerza en un solo gesto)
//   slider · deslizador: el dedo marca la posición exacta de tu paleta
//   crank  · manivela: girás el dedo en círculos (cuenta la velocidad y el sentido)
//   draw   · pizarrón: dibujás con el dedo, o elegís la respuesta si dibuja otro
//   fingers· twister: un dedo apoyado en cada círculo, varios a la vez
//   oars   · remos: cada pulgar rema de su lado deslizando para abajo
//   bid    · oferta: elegís un número deslizando y confirmás
//   swipe  · patada: deslizás para adelante; la curva del dedo es la comba
// Usa $, send, buzz, S, myId y practicing de play.js. El minijuego manda su estado con el cue { pad: {...} }.
const PAD_CONTROLS = ['sling', 'slider', 'crank', 'draw', 'fingers', 'oars', 'bid', 'swipe'];
const pad = { ctl: null, cfg: {}, cfgSig: '', down: null, cvs: null, g: null, w: 0, h: 0, dpr: 1 };

function padColor() { return getComputedStyle(document.body).getPropertyValue('--me').trim() || '#6c7cff'; }

// La pantalla del minijuego se muestra con el control que corresponda
window.padShow = function padShow(mg) {
  if (pad.ctl !== mg.control || pad.key !== mg.key) {
    pad.ctl = mg.control; pad.key = mg.key;
    pad.cfg = {}; pad.cfgSig = ''; pad.down = null;
    padReset();
  }
  showScreen('sPad');
  $('sPad').className = 'screen ctrl-pad pad-' + pad.ctl;
  padResize();
  padRenderUi();
};
// Lo que manda el minijuego (de quién es el turno, qué palabra dibujar, para qué lado girar…)
window.padCue = function padCue(cfg) {
  const sig = JSON.stringify(cfg || {});
  if (sig === pad.cfgSig) return;
  const prev = pad.cfg;
  pad.cfg = cfg || {}; pad.cfgSig = sig;
  if (pad.ctl === 'draw' && (prev.round !== pad.cfg.round || prev.mode !== pad.cfg.mode)) { draw.strokes = []; draw.cur = null; draw.guessed = null; }
  if (pad.ctl === 'bid' && prev.round !== pad.cfg.round) { bid.sent = false; bid.v = Math.min(bid.v, pad.cfg.max || 0); }
  if (pad.ctl === 'swipe' && prev.round !== pad.cfg.round) swipe.sent = false;
  padRenderUi();
};
window.padResetAll = function padResetAll() { pad.ctl = null; pad.key = null; pad.cfg = {}; pad.cfgSig = ''; };

function padReset() {
  sling.aim = 0; sling.pow = 0;
  slider.pos = 0;
  crank.vel = 0; crank.acc = 0; crank.ang = -Math.PI / 2; crank.last = null; crank.head = null; crank.trail = [];
  draw.strokes = []; draw.cur = null; draw.guessed = null; draw.sent = 0;
  fingers.ptrs.clear(); fingers.sent = '';
  oars.ptrs.clear(); oars.flash = [0, 0];
  bid.v = 0; bid.sent = false;
  swipe.path = null; swipe.sent = false; swipe.last = null;
}

function padResize() {
  const cvs = $('padCanvas');
  pad.cvs = cvs; pad.g = cvs.getContext('2d');
  const r = cvs.getBoundingClientRect();
  pad.dpr = Math.min(2, window.devicePixelRatio || 1);
  pad.w = r.width; pad.h = r.height;
  cvs.width = Math.max(1, Math.round(r.width * pad.dpr)); cvs.height = Math.max(1, Math.round(r.height * pad.dpr));
}
window.addEventListener('resize', () => { if (pad.ctl && !$('sPad').classList.contains('hidden')) padResize(); });

// Activo = le toca jugar con el lienzo (en la práctica, siempre)
function padActive() {
  if (practicing) return true;
  if (pad.ctl === 'sling') return !!pad.cfg.on;
  if (pad.ctl === 'draw') return pad.cfg.mode === 'draw';
  if (pad.ctl === 'bid') return pad.cfg.mode === 'bid' && !bid.sent;
  if (pad.ctl === 'swipe') return !!pad.cfg.on && !swipe.sent;
  return pad.cfg.on !== false;
}

function padRenderUi() {
  const c = pad.cfg;
  const hints = {
    sling: padActive() ? (c.hint || '👇 Tirá para atrás y soltá') : (c.hint || '⏳ Esperá tu turno'),
    slider: c.hint || (c.axis === 'v' ? '👆 Deslizá arriba y abajo' : '👉 Deslizá a los costados'),
    crank: c.hint || '🔄 Girá el dedo en círculos',
    draw: practicing ? '✏️ Práctica: dibujá algo' : c.mode === 'draw' ? `✏️ Dibujá: <b>${esc(c.word || '')}</b>` : c.mode === 'guess' ? (c.hint || '🤔 ¿Qué está dibujando?') : (c.hint || '📺 Mirá la tele'),
    fingers: c.hint || '☝️ Un dedo en cada círculo… ¡y no los levantes!',
    oars: c.hint || '🚣 Deslizá para abajo con cada pulgar',
    bid: practicing ? '💰 Práctica: deslizá para elegir cuánto' : c.mode === 'bid' ? (bid.sent ? `✅ Ofreciste $${bid.v}. Esperá…` : (c.hint || '💰 ¿Cuánto ofrecés?')) : (c.hint || '📺 Mirá la tele'),
    swipe: practicing ? '⚽ Práctica: deslizá para arriba' : swipe.sent ? '⚽ ¡Pateaste! Mirá la tele' : c.on ? (c.hint || '⚽ Deslizá para arriba: la curva es la comba') : (c.hint || '⏳ Esperá…'),
  };
  $('padHint').innerHTML = hints[pad.ctl] || '';
  $('sPad').classList.toggle('pad-off', !padActive());
  // Pizarrón: botones de respuesta para los que adivinan, "borrar" para el que dibuja
  const guessing = pad.ctl === 'draw' && !practicing && c.mode === 'guess';
  $('padOpts').classList.toggle('hidden', !guessing);
  const tools = (pad.ctl === 'draw' && (practicing || c.mode === 'draw')) || (pad.ctl === 'bid' && (practicing || c.mode === 'bid'));
  $('padTools').classList.toggle('hidden', !tools);
  $('padClear').classList.toggle('hidden', pad.ctl !== 'draw');
  $('padOk').classList.toggle('hidden', pad.ctl !== 'bid');
  $('padOk').disabled = pad.ctl === 'bid' && (bid.sent || practicing);
  if (pad.ctl === 'bid') $('padOk').textContent = bid.sent ? `✅ $${bid.v}` : `🔨 OFRECER $${bid.v}`;
  $('padWrap').classList.toggle('hidden', guessing);
  if (guessing) {
    const opts = c.opts || [];
    const sig = c.round + '|' + opts.join(',') + '|' + draw.guessed + '|' + c.locked;
    if ($('padOpts').dataset.sig !== sig) {
      $('padOpts').dataset.sig = sig;
      $('padOpts').innerHTML = opts.map((o, i) => `<button data-i="${i}" class="${draw.guessed === i ? 'on' : ''}" ${draw.guessed != null || c.locked ? 'disabled' : ''}>${esc(o)}</button>`).join('');
      for (const b of $('padOpts').querySelectorAll('button')) {
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (draw.guessed != null || pad.cfg.locked) return;
          draw.guessed = +b.dataset.i;
          send({ t: 'action', b: 'guess', i: draw.guessed }); buzz(30);
          padRenderUi();
        });
      }
    }
  }
}

// ---------- Gestos ----------
function padPoint(e) { const r = pad.cvs.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
const padEl = $('padCanvas');
padEl.addEventListener('pointerdown', (e) => {
  if (MULTI[pad.ctl]) { e.preventDefault(); if (padActive()) { try { padEl.setPointerCapture(e.pointerId); } catch { /* sin captura */ } MULTI[pad.ctl].down(e.pointerId, padPoint(e)); } return; }
  if (pad.down || !padActive()) return;
  e.preventDefault();
  try { padEl.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
  const p = padPoint(e);
  pad.down = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y };
  buzz(8);
  HANDLERS[pad.ctl] && HANDLERS[pad.ctl].down(p);
});
padEl.addEventListener('pointermove', (e) => {
  if (MULTI[pad.ctl]) { MULTI[pad.ctl].move(e.pointerId, padPoint(e)); return; }
  if (!pad.down || e.pointerId !== pad.down.id) return;
  const p = padPoint(e);
  pad.down.x = p.x; pad.down.y = p.y;
  HANDLERS[pad.ctl] && HANDLERS[pad.ctl].move(p);
});
function padUp(e) {
  if (MULTI[pad.ctl]) { MULTI[pad.ctl].up(e.pointerId, padPoint(e)); return; }
  if (!pad.down || e.pointerId !== pad.down.id) return;
  // Vale el último punto por el que pasó el dedo (algunos navegadores mandan el "soltar" en otro lugar)
  const p = { x: pad.down.x, y: pad.down.y };
  HANDLERS[pad.ctl] && HANDLERS[pad.ctl].up(p, e.type === 'pointercancel');
  pad.down = null;
}
padEl.addEventListener('pointerup', padUp);
padEl.addEventListener('pointercancel', padUp);

// --- Gomera ---
const sling = { aim: 0, pow: 0, lastSent: 0 };
const SLING_ANG = 0.75; // ángulo máximo de puntería (rad) en el celu
function slingRead(p) {
  const d = pad.down;
  const dx = d.x0 - p.x, dy = d.y0 - p.y; // para dónde sale: al revés de donde tirás
  const len = Math.hypot(dx, dy);
  const maxLen = Math.min(pad.h * 0.55, pad.w * 0.8);
  sling.pow = Math.min(1, len / maxLen);
  sling.aim = dy < -4 ? Math.max(-1, Math.min(1, Math.atan2(dx, -dy) / SLING_ANG)) : 0;
  if (dy >= -4) sling.pow = 0; // si tirás para adelante no vale
}
function slingSend(force, drag = 1) {
  const now = performance.now();
  if (!force && now - sling.lastSent < 50) return;
  sling.lastSent = now;
  send({ t: 'input', x: +sling.aim.toFixed(3), y: +sling.pow.toFixed(3), drag });
}
// --- Deslizador ---
const slider = { pos: 0, lastSent: 0, sentPos: 9 };
function sliderRead(p) {
  const v = pad.cfg.axis === 'v';
  const m = 26; // margen: llegar a la punta sin salirse de la pantalla
  const k = v ? 1 - (p.y - m) / Math.max(1, pad.h - m * 2) : (p.x - m) / Math.max(1, pad.w - m * 2);
  slider.pos = Math.max(-1, Math.min(1, k * 2 - 1));
  sliderSend(false);
}
function sliderSend(force) {
  const now = performance.now();
  if (!force && (Math.abs(slider.pos - slider.sentPos) < 0.01 || now - slider.lastSent < 30)) return;
  slider.lastSent = now; slider.sentPos = slider.pos;
  send({ t: 'input', x: +slider.pos.toFixed(3) });
}
// --- Manivela ---
// Cuenta cuánto gira la dirección del movimiento del dedo: así vale girar en cualquier parte de la pantalla
// (no hace falta rodear el centro). En el dibujo, la bolita da vueltas con ese mismo ángulo.
const crank = { vel: 0, acc: 0, ang: -Math.PI / 2, last: null, head: null, trail: [] };
setInterval(() => {
  if (pad.ctl !== 'crank' || $('sPad').classList.contains('hidden')) return;
  const inst = crank.acc / (Math.PI * 2) / 0.08; // vueltas por segundo (+ = como el reloj)
  crank.acc = 0;
  crank.vel += (inst - crank.vel) * 0.45;
  if (Math.abs(crank.vel) < 0.03) crank.vel = 0;
  send({ t: 'input', x: +crank.vel.toFixed(2) });
}, 80);
// --- Pizarrón ---
// Los puntos van de 0 a 1000 sobre un pizarrón de 4:3 (el mismo de la tele)
const draw = { strokes: [], cur: null, guessed: null, sent: 0, box: null };
function drawBox() {
  const ar = 4 / 3;
  let w = pad.w - 8, h = w / ar;
  if (h > pad.h - 8) { h = pad.h - 8; w = h * ar; }
  return { x: (pad.w - w) / 2, y: (pad.h - h) / 2, w, h };
}
function drawPt(p) {
  const b = draw.box || drawBox();
  return [Math.round(Math.max(0, Math.min(1, (p.x - b.x) / b.w)) * 1000), Math.round(Math.max(0, Math.min(1, (p.y - b.y) / b.h)) * 1000)];
}
function drawFlush() {
  const s = draw.cur;
  if (!s || practicing) return;
  if (s.pts.length > s.sent) {
    send({ t: 'action', b: 'ink', s: s.i, p: s.pts.slice(Math.max(0, s.sent - 2)), from: Math.max(0, s.sent - 2) });
    s.sent = s.pts.length;
  }
}
setInterval(() => { if (pad.ctl === 'draw') drawFlush(); }, 90);

const HANDLERS = {
  sling: {
    down() { sling.pow = 0; sling.aim = 0; },
    move(p) { slingRead(p); slingSend(false); },
    up(p, cancel) {
      slingRead(p);
      if (!cancel && sling.pow > 0.06) { send({ t: 'action', b: 'throw', x: +sling.aim.toFixed(3), y: +sling.pow.toFixed(3) }); buzz(40); }
      sling.pow = 0; slingSend(true, 0);
    },
  },
  slider: { down(p) { sliderRead(p); }, move(p) { sliderRead(p); }, up() { sliderSend(true); } },
  crank: {
    down(p) { crank.last = p; crank.head = null; },
    move(p) {
      const l = crank.last;
      if (Math.hypot(p.x - l.x, p.y - l.y) < 7) return; // pasos muy cortos tiemblan
      const h = Math.atan2(p.y - l.y, p.x - l.x);
      if (crank.head != null) {
        const d = Math.atan2(Math.sin(h - crank.head), Math.cos(h - crank.head));
        if (Math.abs(d) < 1.3) { crank.acc += d; crank.ang += d; } // un zigzag brusco no es girar
      }
      crank.head = h; crank.last = p;
      crank.trail.push({ a: crank.ang, t: performance.now() });
    },
    up() { crank.last = null; crank.head = null; },
  },
  draw: {
    down(p) {
      draw.box = drawBox();
      draw.cur = { i: draw.strokes.length, pts: [...drawPt(p)], sent: 0 };
      draw.strokes.push(draw.cur);
    },
    move(p) {
      const s = draw.cur; if (!s) return;
      const [x, y] = drawPt(p);
      const lx = s.pts[s.pts.length - 2], ly = s.pts[s.pts.length - 1];
      if (Math.hypot(x - lx, y - ly) < 9) return; // puntos muy juntos no suman
      s.pts.push(x, y);
    },
    up() { drawFlush(); draw.cur = null; },
  },
  bid: {
    down(p) { bidRead(p); }, move(p) { bidRead(p); }, up() { padRenderUi(); },
  },
  swipe: {
    down(p) { swipe.path = [{ ...p, t: performance.now() }]; },
    move(p) { if (swipe.path) swipe.path.push({ ...p, t: performance.now() }); },
    up(p, cancel) { if (!cancel) swipeKick(); swipe.path = null; },
  },
};

// --- Twister: los círculos vienen del minijuego (x, y de 0 a 1). Un círculo cuenta si hay un dedo adentro. ---
const fingers = { ptrs: new Map(), sent: '', lastSent: 0 };
function fingerR() { return Math.max(30, Math.min(pad.w, pad.h) * 0.095); }
function fingerDots() {
  if (practicing && !(pad.cfg.dots || []).length) return [{ k: 'a', x: 0.3, y: 0.35, c: '#e5243b' }, { k: 'b', x: 0.7, y: 0.6, c: '#3d8bff' }];
  return pad.cfg.dots || [];
}
function fingerHeld() {
  const R = fingerR(), held = [];
  for (const d of fingerDots()) {
    const x = d.x * pad.w, y = d.y * pad.h;
    for (const p of fingers.ptrs.values()) if (Math.hypot(p.x - x, p.y - y) < R * 1.25) { held.push(d.k); break; }
  }
  return held;
}
function fingerSend(force) {
  const held = fingerHeld(), sig = held.join(',');
  const now = performance.now();
  if (!force && sig === fingers.sent && now - fingers.lastSent < 300) return;
  if (held.length > fingers.sent.split(',').filter(Boolean).length) buzz(15);
  fingers.sent = sig; fingers.lastSent = now;
  if (!practicing) send({ t: 'input', held });
}
setInterval(() => { if (pad.ctl === 'fingers' && lastScreen === 'sPad') fingerSend(false); }, 100);
// --- Remos: cada mitad de la pantalla es un remo. Una remada = bajar el dedo (más fuerte cuanto más baja). ---
const oars = { ptrs: new Map(), flash: [0, 0] };
function oarFire(o) {
  const len = o.bottom - o.top;
  if (len < pad.h * 0.12) return;
  const p = Math.min(1, len / (pad.h * 0.45));
  oars.flash[o.side > 0 ? 1 : 0] = performance.now();
  buzz(12);
  if (!practicing) send({ t: 'action', b: 'oar', s: o.side, p: +p.toFixed(2) });
}
const MULTI = {
  fingers: {
    down(id, p) { fingers.ptrs.set(id, p); fingerSend(true); },
    move(id, p) { if (fingers.ptrs.has(id)) { fingers.ptrs.set(id, p); fingerSend(false); } },
    up(id) { fingers.ptrs.delete(id); fingerSend(true); },
  },
  oars: {
    down(id, p) { oars.ptrs.set(id, { side: p.x < pad.w / 2 ? -1 : 1, top: p.y, bottom: p.y, x: p.x, y: p.y }); },
    move(id, p) {
      const o = oars.ptrs.get(id); if (!o) return;
      o.x = p.x; o.y = p.y;
      if (p.y < o.top && o.bottom - o.top < pad.h * 0.05) { o.top = o.bottom = p.y; return; } // todavía subiendo
      if (p.y > o.bottom) o.bottom = p.y;
      // Si vuelve a subir después de bajar, terminó la remada
      if (p.y < o.bottom - pad.h * 0.06) { oarFire(o); o.top = o.bottom = p.y; }
    },
    up(id) { const o = oars.ptrs.get(id); if (o) oarFire(o); oars.ptrs.delete(id); },
  },
};
// --- Oferta ---
const bid = { v: 0, sent: false };
function bidRead(p) {
  const m = 30, max = practicing ? 100 : (pad.cfg.max || 0);
  const k = Math.max(0, Math.min(1, (p.x - m) / Math.max(1, pad.w - m * 2)));
  const v = Math.round(k * max);
  if (v !== bid.v) { bid.v = v; if (v % 5 === 0) buzz(5); padRenderUi(); }
}
$('padOk').addEventListener('click', () => {
  if (pad.ctl !== 'bid' || bid.sent || practicing || pad.cfg.mode !== 'bid') return;
  bid.sent = true; buzz(40);
  send({ t: 'action', b: 'bid', v: bid.v, r: pad.cfg.round });
  padRenderUi();
});
// --- Patada con comba ---
// Dirección = del principio al final del dedo; fuerza = qué tan rápido termina; comba = cuánto se curva el dedo en el medio.
const swipe = { path: null, sent: false, last: null };
function swipeKick() {
  const P = swipe.path;
  if (!P || P.length < 3) return;
  const a = P[0], b = P[P.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (dy > -pad.h * 0.12) return; // tiene que ir para arriba
  // Rapidez de la parte final del gesto (los últimos 120 ms)
  let k = P.length - 1;
  while (k > 0 && b.t - P[k].t < 120) k--;
  const sp = Math.hypot(b.x - P[k].x, b.y - P[k].y) / Math.max(16, b.t - P[k].t); // px por ms
  const pow = Math.max(0, Math.min(1, (sp - 0.3) / 4.5)); // un deslizón normal (~2 px/ms) queda en la mitad
  // Comba: la mayor separación del dedo respecto de la recta, con signo (+ = panza a la derecha)
  let dev = 0;
  for (const q of P) { const d = ((q.x - a.x) * dy - (q.y - a.y) * dx) / len; if (Math.abs(d) > Math.abs(dev)) dev = d; }
  const curve = Math.max(-1, Math.min(1, -dev / (len * 0.28)));
  const aim = Math.max(-1, Math.min(1, Math.atan2(dx, -dy) / 0.6));
  swipe.last = { P: P.slice(), t: performance.now(), aim, pow, curve };
  buzz(40);
  if (practicing) return;
  swipe.sent = true;
  send({ t: 'action', b: 'kick', a: +aim.toFixed(3), p: +pow.toFixed(3), c: +curve.toFixed(3), r: pad.cfg.round });
  padRenderUi();
}
$('padClear').addEventListener('click', () => {
  draw.strokes = []; draw.cur = null; buzz(20);
  if (!practicing) send({ t: 'action', b: 'clear' });
});

// Teclado (para probar desde la compu): en el deslizador, flechas
window.addEventListener('keydown', (e) => {
  if (lastScreen !== 'sPad' || e.repeat) return;
  if (pad.ctl === 'slider' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.2 : 0.2;
    slider.pos = Math.max(-1, Math.min(1, slider.pos + d)); sliderSend(true);
  }
});

// ---------- Dibujo del lienzo ----------
function padFrame(now) {
  requestAnimationFrame(padFrame);
  if (!pad.ctl || lastScreen !== 'sPad' || !pad.g) return;
  const g = pad.g, W = pad.w, H = pad.h, me = padColor();
  g.setTransform(pad.dpr, 0, 0, pad.dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const on = padActive();
  if (pad.ctl === 'sling') {
    const bx = W / 2, by = H * 0.62;
    const pull = pad.down ? Math.min(1, sling.pow) : 0;
    const ang = sling.aim * SLING_ANG;
    // Horqueta
    g.lineCap = 'round'; g.lineWidth = 12; g.strokeStyle = '#7a4a26';
    g.beginPath(); g.moveTo(bx, H * 0.95); g.lineTo(bx, by + 50); g.lineTo(bx - 70, by - 10); g.moveTo(bx, by + 50); g.lineTo(bx + 70, by - 10); g.stroke();
    const px = bx - Math.sin(ang) * pull * H * 0.28, py = by + Math.cos(ang) * pull * H * 0.28;
    g.lineWidth = 5; g.strokeStyle = on ? '#e9c38a' : '#555';
    g.beginPath(); g.moveTo(bx - 70, by - 10); g.lineTo(px, py); g.lineTo(bx + 70, by - 10); g.stroke();
    // Flecha de para dónde sale
    if (pull > 0.02) {
      const len = 40 + pull * H * 0.45;
      const tx = bx + Math.sin(ang) * len, ty = by - Math.cos(ang) * len;
      g.setLineDash([10, 10]); g.lineWidth = 6;
      g.strokeStyle = pull > 0.85 ? '#ff5a64' : pull > 0.5 ? '#ffc23d' : '#20d39b';
      g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]);
      g.font = '900 22px system-ui'; g.fillStyle = '#fff'; g.textAlign = 'center';
      g.fillText(Math.round(pull * 100) + '%', tx, ty - 14);
    }
    g.fillStyle = on ? me : '#444';
    g.beginPath(); g.arc(px, py, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(px - 8, py - 9, 8, 0, Math.PI * 2); g.fill();
  } else if (pad.ctl === 'slider') {
    const v = pad.cfg.axis === 'v', m = 26;
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
    const k = (slider.pos + 1) / 2;
    // Riel y la paleta del tejo vista desde arriba (va justo donde está el dedo)
    let x = W / 2, y = H / 2;
    if (v) { g.fillRect(W / 2 - 10, m, 20, H - m * 2); y = H - m - k * (H - m * 2); }
    else { g.fillRect(m, H / 2 - 10, W - m * 2, 20); x = m + k * (W - m * 2); }
    const r = Math.min(46, Math.min(W, H) * 0.14);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(x + 4, y + 7, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = me; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * 0.08, y - r * 0.1, r * 0.36, 0, Math.PI * 2); g.fill();
  } else if (pad.ctl === 'crank') {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
    g.lineWidth = 34; g.strokeStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    // Estela del dedo
    crank.trail = crank.trail.filter((t) => now - t.t < 350);
    for (const t of crank.trail) {
      const k = 1 - (now - t.t) / 350;
      g.fillStyle = `rgba(255,255,255,${0.25 * k})`;
      g.beginPath(); g.arc(cx + Math.cos(t.a) * R, cy + Math.sin(t.a) * R, 17 * k, 0, Math.PI * 2); g.fill();
    }
    // Sentido pedido (flechas que giran solas)
    const dir = pad.cfg.dir || 0;
    if (dir) {
      g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '900 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(dir > 0 ? '↻' : '↺', cx, cy);
    }
    const a = crank.ang;
    g.fillStyle = me; g.beginPath(); g.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 26, 0, Math.PI * 2); g.fill();
    g.font = '900 20px system-ui'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(Math.abs(crank.vel).toFixed(1) + ' vueltas/s', cx, cy + R + 52 > H ? cy + 40 : cy + R + 52);
  } else if (pad.ctl === 'draw') {
    const b = drawBox();
    draw.box = b;
    g.fillStyle = on ? '#fbfaf3' : '#3a3f55';
    g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 14); g.fill();
    g.lineCap = g.lineJoin = 'round'; g.lineWidth = Math.max(4, b.w * 0.012); g.strokeStyle = '#1d2233';
    for (const s of draw.strokes) {
      g.beginPath();
      for (let i = 0; i < s.pts.length; i += 2) {
        const x = b.x + s.pts[i] / 1000 * b.w, y = b.y + s.pts[i + 1] / 1000 * b.h;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      if (s.pts.length === 2) g.lineTo(b.x + s.pts[0] / 1000 * b.w + 0.1, b.y + s.pts[1] / 1000 * b.h);
      g.stroke();
    }
  } else if (pad.ctl === 'fingers') {
    const R = fingerR();
    const held = new Set(fingerHeld());
    for (const d of fingerDots()) {
      const x = d.x * W, y = d.y * H, isOn = held.has(d.k);
      const pulse = d.isNew ? 1 + Math.sin(now / 90) * 0.12 : 1;
      g.fillStyle = d.c; g.globalAlpha = isOn ? 1 : 0.55;
      g.beginPath(); g.arc(x, y, R * pulse, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      if (isOn) { g.lineWidth = 6; g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y, R + 6, 0, Math.PI * 2); g.stroke(); }
      else if (d.isNew) { g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('☝️', x, y); }
    }
    for (const p of fingers.ptrs.values()) { g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(p.x, p.y, 22, 0, Math.PI * 2); g.fill(); }
  } else if (pad.ctl === 'oars') {
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(W / 2 - 1, 0, 2, H);
    for (const side of [-1, 1]) {
      const cx = side < 0 ? W / 4 : W * 3 / 4;
      const fl = Math.max(0, 1 - (now - oars.flash[side > 0 ? 1 : 0]) / 300);
      const o = [...oars.ptrs.values()].find((q) => q.side === side);
      const y = o ? o.y : H * 0.3;
      g.fillStyle = `rgba(32,211,155,${0.08 + fl * 0.35})`; g.fillRect(side < 0 ? 0 : W / 2, 0, W / 2, H);
      // Remo: palo y pala que siguen al dedo
      g.lineCap = 'round'; g.lineWidth = 10; g.strokeStyle = '#b07a45';
      g.beginPath(); g.moveTo(cx, y - 90); g.lineTo(cx, y + 30); g.stroke();
      g.fillStyle = o ? me : '#555'; g.beginPath(); g.ellipse(cx, y + 60, 26, 46, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '900 40px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('⬇', cx, H * 0.88);
    }
  } else if (pad.ctl === 'bid') {
    const m = 30, max = practicing ? 100 : (pad.cfg.max || 0);
    const k = max ? bid.v / max : 0;
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.roundRect(m, H * 0.62, W - m * 2, 26, 13); g.fill();
    g.fillStyle = on ? '#ffc23d' : '#666'; g.beginPath(); g.roundRect(m, H * 0.62, Math.max(26, (W - m * 2) * k), 26, 13); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(m + (W - m * 2) * k, H * 0.62 + 13, 22, 0, Math.PI * 2); g.fill();
    g.font = '900 72px system-ui'; g.fillStyle = on ? '#fff' : '#888'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('$' + bid.v, W / 2, H * 0.38);
    g.font = '800 18px system-ui'; g.fillStyle = '#8f97bb';
    if (pad.cfg.item && !practicing) g.fillText(pad.cfg.item, W / 2, H * 0.18);
    g.fillText(`Tenés $${max}`, W / 2, H * 0.78);
  } else if (pad.ctl === 'swipe') {
    // Arco arriba, pelota abajo; se ve el recorrido del dedo
    const bx = W / 2, by = H * 0.82;
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 4; g.strokeRect(W * 0.2, H * 0.06, W * 0.6, H * 0.12);
    const P = swipe.path || (swipe.last && now - swipe.last.t < 1500 ? swipe.last.P : null);
    if (P && P.length > 1) {
      g.strokeStyle = me; g.lineWidth = 8; g.lineCap = g.lineJoin = 'round';
      g.beginPath(); P.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
    }
    g.font = '64px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = on ? 1 : 0.4;
    g.fillText('⚽', bx, by); g.globalAlpha = 1;
    if (swipe.last && now - swipe.last.t < 1500) {
      g.font = '800 18px system-ui'; g.fillStyle = '#fff';
      g.fillText(`Fuerza ${Math.round(swipe.last.pow * 100)}% · comba ${swipe.last.curve > 0.15 ? '↪' : swipe.last.curve < -0.15 ? '↩' : 'recta'}`, W / 2, H * 0.5);
    }
  }
}
requestAnimationFrame(padFrame);
