// Sonido sintetizado con WebAudio: efectos y música (sin archivos de audio).
// El navegador no deja sonar nada hasta que alguien toca la pantalla o una tecla.

let ctx = null, master = null, musicGain = null, sfxGain = null;
let musicMode = null, nextNote = 0, step = 0, timer = null;

export function audioReady() { return !!ctx && ctx.state === 'running'; }

// Tecla M en la tele: silencio (se recuerda para la próxima)
let muted = false;
try { muted = localStorage.getItem('lp_muted') === '1'; } catch { /* sin storage */ }
export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('lp_muted', m ? '1' : '0'); } catch { /* sin storage */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
  }
  if (ctx.state !== 'running') ctx.resume();
  if (!timer) timer = setInterval(schedule, 50);
}

const noiseBuf = () => {
  if (noiseBuf.b) return noiseBuf.b;
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuf.b = b);
};

function tone(freq, t, dur, { type = 'square', vol = 0.3, to = null, out = sfxGain, attack = 0.005 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(t, dur, { vol = 0.3, freq = 2000, q = 1, type = 'bandpass', out = sfxGain } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf();
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t); s.stop(t + dur + 0.02);
}

const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // número MIDI → Hz

const SFX = {
  step: (t) => tone(N(72 + Math.floor(Math.random() * 3)), t, 0.08, { type: 'triangle', vol: 0.25 }),
  dice: (t) => { for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.04, { freq: 3000 + Math.random() * 2000, vol: 0.25, q: 4 }); },
  diceStop: (t) => { tone(N(76), t, 0.1, { type: 'square', vol: 0.15 }); tone(N(83), t + 0.08, 0.18, { type: 'square', vol: 0.15 }); },
  coin: (t) => { tone(N(83), t, 0.08, { type: 'square', vol: 0.15 }); tone(N(88), t + 0.07, 0.25, { type: 'square', vol: 0.15 }); },
  lose: (t) => { tone(N(64), t, 0.15, { type: 'sawtooth', vol: 0.12 }); tone(N(58), t + 0.14, 0.3, { type: 'sawtooth', vol: 0.12 }); },
  event: (t) => [72, 76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.07, 0.15, { type: 'triangle', vol: 0.2 })),
  copa: (t) => [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.5], [84, 0.62]].forEach(([n, d]) => {
    tone(N(n), t + d, 0.3, { type: 'square', vol: 0.14 }); tone(N(n - 12), t + d, 0.3, { type: 'triangle', vol: 0.18 });
  }),
  win: (t) => [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.11, 0.4, { type: 'square', vol: 0.12 })),
  count: (t) => tone(N(69), t, 0.15, { type: 'square', vol: 0.2 }),
  go: (t) => { tone(N(81), t, 0.4, { type: 'square', vol: 0.2 }); tone(N(76), t, 0.4, { type: 'triangle', vol: 0.2 }); },
  whistle: (t) => tone(N(96), t, 0.5, { type: 'sine', vol: 0.25, to: N(98) }),
  pop: (t) => { noise(t, 0.2, { freq: 800, vol: 0.7, q: 0.5, type: 'lowpass' }); tone(200, t, 0.15, { type: 'sine', vol: 0.4, to: 60 }); },
  hit: (t) => { noise(t, 0.12, { freq: 600, vol: 0.6, q: 0.8, type: 'lowpass' }); tone(140, t, 0.12, { type: 'square', vol: 0.15, to: 70 }); },
  bonk: (t) => { tone(500, t, 0.12, { type: 'square', vol: 0.18, to: 150 }); },
  good: (t) => { tone(N(79), t, 0.08, { type: 'square', vol: 0.12 }); tone(N(84), t + 0.06, 0.12, { type: 'square', vol: 0.12 }); },
  gold: (t) => [84, 88, 91, 96].forEach((n, i) => tone(N(n), t + i * 0.05, 0.15, { type: 'square', vol: 0.1 })),
  bad: (t) => tone(N(52), t, 0.3, { type: 'sawtooth', vol: 0.14, to: N(45) }),
  horn: (t) => { tone(N(57), t, 0.35, { type: 'sawtooth', vol: 0.12 }); tone(N(61), t, 0.35, { type: 'sawtooth', vol: 0.1 }); },
  swoosh: (t) => noise(t, 0.35, { freq: 1200, vol: 0.35, q: 0.7 }),
  select: (t) => tone(N(79), t, 0.06, { type: 'square', vol: 0.12 }),
  kick: (t) => tone(150, t, 0.15, { type: 'sine', vol: 0.6, to: 45 }),
  // La "voz" de Don Sifón: burbujitas cortas, como un sifón de soda que habla
  blip: (t) => { const f = 520 + Math.random() * 260; tone(f, t, 0.05, { type: 'sine', vol: 0.09, to: f * 1.5 }); },
  drumroll: (t) => { for (let i = 0; i < 34; i++) noise(t + i * 0.06, 0.05, { freq: 900 + (i % 2) * 150, vol: 0.12 + i * 0.006, q: 0.9 }); },
  cymbal: (t) => { noise(t, 1.2, { freq: 7000, vol: 0.35, q: 0.4, type: 'highpass' }); tone(N(84), t, 0.5, { type: 'square', vol: 0.1 }); },
  // Cortina de noticiero: tres golpes y una nota larga
  news: (t) => { [[76, 0], [76, 0.14], [83, 0.28]].forEach(([n, d]) => tone(N(n), t + d, 0.12, { type: 'square', vol: 0.16 })); tone(N(88), t + 0.44, 0.7, { type: 'sawtooth', vol: 0.12 }); tone(N(76), t + 0.44, 0.7, { type: 'square', vol: 0.08 }); },
  chest: (t) => { noise(t, 0.25, { freq: 400, vol: 0.4, q: 0.6, type: 'lowpass' }); [79, 83, 86, 91].forEach((n, i) => tone(N(n), t + 0.12 + i * 0.07, 0.25, { type: 'triangle', vol: 0.16 })); },
  ufo: (t) => tone(300, t, 1.6, { type: 'sine', vol: 0.18, to: 1400 }),
};

export function sfx(name, delay = 0) {
  if (!audioReady() || !SFX[name]) return;
  SFX[name](ctx.currentTime + 0.01 + delay);
}

// ---------- Música ----------
// Un ritmo de cumbia simple: bombo, güiro (ruido), bajo y una melodía que se repite.
const SONGS = {
  lobby: { bpm: 96, bass: [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0], mel: [69, 0, 72, 74, 76, 0, 74, 72, 67, 0, 69, 71, 72, 0, 0, 0] },
  board: { bpm: 104, bass: [45, 0, 52, 0, 48, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0], mel: [76, 0, 76, 74, 72, 0, 69, 0, 72, 74, 76, 0, 79, 0, 76, 0] },
  mg: { bpm: 132, bass: [45, 45, 52, 45, 48, 48, 55, 48, 41, 41, 48, 41, 43, 43, 50, 43], mel: [81, 79, 76, 79, 81, 0, 84, 0, 79, 76, 74, 76, 79, 0, 76, 0] },
};

export function music(mode) {
  if (mode === musicMode) return;
  musicMode = mode;
  step = 0;
  if (ctx) nextNote = ctx.currentTime + 0.1;
}

function schedule() {
  if (!audioReady() || !musicMode) return;
  const song = SONGS[musicMode];
  const sp = 60 / song.bpm / 2; // corcheas
  while (nextNote < ctx.currentTime + 0.15) {
    const i = step % 16, t = nextNote;
    if (i % 4 === 0) tone(150, t, 0.14, { type: 'sine', vol: 0.5, to: 50, out: musicGain });
    noise(t, 0.05, { freq: 5500, vol: i % 2 ? 0.12 : 0.2, q: 2, out: musicGain }); // güiro
    if (i % 4 === 2) noise(t, 0.09, { freq: 1800, vol: 0.25, q: 0.8, out: musicGain }); // tambor
    const b = song.bass[i];
    if (b) tone(N(b), t, sp * 1.6, { type: 'triangle', vol: 0.32, out: musicGain });
    const m = song.mel[(i + Math.floor(step / 16) * 0) % 16];
    if (m && (Math.floor(step / 16) % 2 === 0 || i < 8)) tone(N(m), t, sp * 0.9, { type: 'square', vol: 0.07, out: musicGain, attack: 0.01 });
    nextNote += sp; step++;
  }
}
