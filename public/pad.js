// Che Party — controles táctiles nuevos del celu, todos sobre un mismo lienzo:
//   sling  · gomera: tirás para atrás y soltás (dirección + fuerza en un solo gesto)
//   slider · deslizador: el dedo marca la posición exacta de tu paleta
//   crank  · manivela: girás el dedo en círculos (cuenta la velocidad y el sentido)
//   draw   · pizarrón: dibujás con el dedo, o elegís la respuesta si dibuja otro
// Usa $, send, buzz, S, myId y practicing de play.js. El minijuego manda su estado con el cue { pad: {...} }.
const PAD_CONTROLS = ['sling', 'slider', 'crank', 'draw'];
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
  padRenderUi();
};
window.padResetAll = function padResetAll() { pad.ctl = null; pad.key = null; pad.cfg = {}; pad.cfgSig = ''; };

function padReset() {
  sling.aim = 0; sling.pow = 0;
  slider.pos = 0;
  crank.vel = 0; crank.acc = 0; crank.ang = -Math.PI / 2; crank.last = null; crank.head = null; crank.trail = [];
  draw.strokes = []; draw.cur = null; draw.guessed = null; draw.sent = 0;
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
  return pad.cfg.on !== false;
}

function padRenderUi() {
  const c = pad.cfg;
  const hints = {
    sling: padActive() ? (c.hint || '👇 Tirá para atrás y soltá') : (c.hint || '⏳ Esperá tu turno'),
    slider: c.hint || (c.axis === 'v' ? '👆 Deslizá arriba y abajo' : '👉 Deslizá a los costados'),
    crank: c.hint || '🔄 Girá el dedo en círculos',
    draw: practicing ? '✏️ Práctica: dibujá algo' : c.mode === 'draw' ? `✏️ Dibujá: <b>${esc(c.word || '')}</b>` : c.mode === 'guess' ? (c.hint || '🤔 ¿Qué está dibujando?') : (c.hint || '📺 Mirá la tele'),
  };
  $('padHint').innerHTML = hints[pad.ctl] || '';
  $('sPad').classList.toggle('pad-off', !padActive());
  // Pizarrón: botones de respuesta para los que adivinan, "borrar" para el que dibuja
  const guessing = pad.ctl === 'draw' && !practicing && c.mode === 'guess';
  $('padOpts').classList.toggle('hidden', !guessing);
  $('padTools').classList.toggle('hidden', !(pad.ctl === 'draw' && (practicing || c.mode === 'draw')));
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
  if (pad.down || !padActive()) return;
  e.preventDefault();
  try { padEl.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
  const p = padPoint(e);
  pad.down = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y };
  buzz(8);
  HANDLERS[pad.ctl] && HANDLERS[pad.ctl].down(p);
});
padEl.addEventListener('pointermove', (e) => {
  if (!pad.down || e.pointerId !== pad.down.id) return;
  const p = padPoint(e);
  pad.down.x = p.x; pad.down.y = p.y;
  HANDLERS[pad.ctl] && HANDLERS[pad.ctl].move(p);
});
function padUp(e) {
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
};
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
  }
}
requestAnimationFrame(padFrame);
