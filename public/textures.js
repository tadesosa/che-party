// Texturas dibujadas por código (sin archivos de imagen): pasto, adoquines, asfalto, baldosas, madera, tierra.
import * as THREE from 'three';

const cache = new Map();

function canvasTex(key, size, draw, repeat = [1, 1]) {
  const k = key + repeat.join('x');
  if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  draw(x, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  cache.set(k, t);
  return t;
}

// Ruido simple para variar el color
function speckle(x, size, colors, n, rMin = 1, rMax = 3, alpha = 1) {
  x.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    x.fillStyle = colors[i % colors.length];
    const r = rMin + Math.random() * (rMax - rMin);
    x.beginPath(); x.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
}

// Manchas grandes y suaves que se repiten sin costura (cada mancha se dibuja también del otro lado del borde)
function blotches(x, size, colors, n, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    const px = Math.random() * size, py = Math.random() * size, r = rMin + Math.random() * (rMax - rMin);
    const col = colors[i % colors.length];
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const cx = px + ox, cy = py + oy;
      if (cx + r < 0 || cx - r > size || cy + r < 0 || cy - r > size) continue;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalAlpha = alpha; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
  x.globalAlpha = 1;
}

// Hojitas de pasto: trazos finos, unos oscuros y otros con luz
function blades(x, size, n, dark, light) {
  x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const px = Math.random() * size, py = Math.random() * size, h = 5 + Math.random() * 7, lean = (Math.random() - 0.5) * 5;
    x.lineWidth = 1 + Math.random() * 1.2;
    x.strokeStyle = Math.random() < 0.55 ? dark : light;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + lean * 0.3, py - h * 0.6, px + lean, py - h); x.stroke();
  }
}

export const tex = {
  grass: (rep = [12, 12]) => canvasTex('grass', 512, (x, s) => {
    x.fillStyle = '#5daa45'; x.fillRect(0, 0, s, s);
    blotches(x, s, ['#4f9a3a', '#72bd52', '#5aa443', '#80c45c'], 26, 50, 130, 0.55);
    speckle(x, s, ['#4b9136', '#6fb84f', '#82c95d', '#3f8530'], 2600, 0.6, 2.2, 0.55);
    blades(x, s, 1500, 'rgba(40,95,30,.55)', 'rgba(170,225,120,.45)');
    speckle(x, s, ['#fff7d6', '#ffd84a', '#f6f2ff'], 40, 1.2, 2, 0.9); // florcitas sueltas
  }, rep),

  // Pasto seco de zona árida (Mendoza): verde oliva con manchones pajizos
  dryGrass: (rep = [12, 12]) => canvasTex('dryGrass', 512, (x, s) => {
    x.fillStyle = '#9a9a55'; x.fillRect(0, 0, s, s);
    blotches(x, s, ['#c2b06a', '#7f8a44', '#b5a463', '#8e9a4c', '#c9b37a'], 30, 40, 120, 0.6);
    speckle(x, s, ['#7c8040', '#b8ab6a', '#a39a58', '#6f7a3a'], 2600, 0.6, 2.2, 0.55);
    blades(x, s, 1300, 'rgba(85,90,40,.5)', 'rgba(225,210,140,.45)');
  }, rep),

  cobble: (rep = [1, 1]) => canvasTex('cobble', 512, (x, s) => {
    x.fillStyle = '#5b5148'; x.fillRect(0, 0, s, s); // juntas
    const rows = 8, h = s / rows, w = s / 6;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * w / 2;
      for (let c = -1; c < 7; c++) {
        const px = c * w + off + 3, py = r * h + 3, pw = w - 6, ph = h - 6;
        const base = 170 + Math.floor(Math.random() * 35), warm = Math.floor(Math.random() * 14);
        const g = x.createLinearGradient(px, py, px, py + ph);
        g.addColorStop(0, `rgb(${base + 18},${base + 10 - warm / 2},${base - 6 - warm})`);
        g.addColorStop(1, `rgb(${base - 30},${base - 38},${base - 52})`);
        x.fillStyle = g;
        x.beginPath(); x.roundRect(px, py, pw, ph, 9); x.fill();
        x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.roundRect(px + 5, py + 3, pw - 14, 4, 2); x.fill();
        x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.roundRect(px + 4, py + ph - 5, pw - 8, 4, 2); x.fill();
      }
    }
    speckle(x, s, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.2)'], 1600, 0.4, 1.3, 0.6);
    blotches(x, s, ['rgba(70,110,40,.9)'], 6, 10, 26, 0.25); // un poco de musgo
  }, rep),

  asphalt: (rep = [1, 1]) => canvasTex('asphalt', 256, (x, s) => {
    x.fillStyle = '#3d4148'; x.fillRect(0, 0, s, s);
    speckle(x, s, ['#474c54', '#343840', '#52575f'], 1400, 0.5, 1.6, 0.8);
  }, rep),

  baldosa: (rep = [1, 1]) => canvasTex('baldosa', 256, (x, s) => {
    // Baldosa vainilla de vereda porteña
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      x.fillStyle = (i + j) % 2 ? '#d6cab2' : '#cbbea3'; x.fillRect(i * w, j * w, w, w);
      x.fillStyle = 'rgba(0,0,0,.1)';
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { x.beginPath(); x.arc(i * w + (a + 1) * w / 4, j * w + (b + 1) * w / 4, 3, 0, 7); x.fill(); }
      x.strokeStyle = '#a89c84'; x.lineWidth = 2; x.strokeRect(i * w, j * w, w, w);
    }
  }, rep),

  wood: (rep = [1, 1]) => canvasTex('wood', 256, (x, s) => {
    const planks = 6, h = s / planks;
    for (let i = 0; i < planks; i++) {
      x.fillStyle = ['#b9824f', '#a8733f', '#c48d58', '#9e6a3a'][i % 4]; x.fillRect(0, i * h, s, h);
      x.strokeStyle = 'rgba(70,40,20,.25)';
      for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(0, i * h + Math.random() * h); x.bezierCurveTo(s / 3, i * h + Math.random() * h, s / 2, i * h + Math.random() * h, s, i * h + Math.random() * h); x.stroke(); }
      x.fillStyle = 'rgba(40,20,10,.5)'; x.fillRect(0, i * h, s, 2);
    }
  }, rep),

  dirt: (rep = [6, 6]) => canvasTex('dirt', 512, (x, s) => {
    x.fillStyle = '#b08455'; x.fillRect(0, 0, s, s);
    blotches(x, s, ['#9c7246', '#c49a6a', '#a57b4d', '#cfa676'], 24, 40, 110, 0.5);
    speckle(x, s, ['#8e663e', '#c49a6a', '#7d5935', '#d8b285'], 3200, 0.6, 2.6, 0.6);
    speckle(x, s, ['#6e6258', '#9b8f84', '#cfc4b8'], 160, 2, 4.5, 0.8); // piedritas
  }, rep),

  sand: (rep = [8, 8]) => canvasTex('sand', 512, (x, s) => {
    x.fillStyle = '#ecd29a'; x.fillRect(0, 0, s, s);
    blotches(x, s, ['#e0c286', '#f6e3b4', '#d8b878'], 20, 50, 120, 0.5);
    x.strokeStyle = 'rgba(160,120,60,.16)'; x.lineWidth = 2; // ondas que deja el viento
    for (let i = 0; i < 46; i++) {
      const py = Math.random() * s, px = Math.random() * s, len = 40 + Math.random() * 80;
      x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + len * 0.3, py - 6, px + len * 0.7, py + 6, px + len, py); x.stroke();
    }
    speckle(x, s, ['#d4b273', '#fff4d8', '#c9a463', '#ffffff'], 3800, 0.4, 1.4, 0.7);
  }, rep),

  water: (rep = [8, 8]) => canvasTex('water', 256, (x, s) => {
    x.fillStyle = '#3d86b8'; x.fillRect(0, 0, s, s);
    blotches(x, s, ['#2f74a6', '#4f9ccc'], 14, 30, 80, 0.5);
    x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 2;
    for (let i = 0; i < 55; i++) {
      const px = Math.random() * s, py = Math.random() * s;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 8, py - 4, px + 16, py); x.stroke();
    }
  }, rep),

  // Sombra suave y redonda para apoyar cosas en el piso (sombra de contacto)
  blob: () => canvasTex('blob', 128, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.55, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  }),
};

// ---------- Materiales de construcción ----------
// Cada dibujo llena un cuadrado de lado s y se repite sin costura. Los "claros" (revoque, chapa, madera, tejas)
// van en grises para teñirlos con el color de cada casa; los "naturales" (ladrillo, piedra) ya traen su color.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function wrapRect(x, s, px, py, w, h, fn) { // dibuja también del otro lado del borde para que repita bien
  for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) {
    if (px + ox + w < 0 || px + ox > s || py + oy + h < 0 || py + oy > s) continue;
    fn(px + ox, py + oy);
  }
}
function bricks(x, s, mortar, colors, rows = 10, cols = 4) {
  x.fillStyle = mortar; x.fillRect(0, 0, s, s);
  const h = s / rows, w = s / cols, gap = Math.max(1, s / 90);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const px = c * w + (r % 2) * w / 2;
    const col = pick(colors);
    wrapRect(x, s, px, r * h, w, h, (ax, ay) => {
      const g = x.createLinearGradient(0, ay, 0, ay + h);
      g.addColorStop(0, col); g.addColorStop(1, shade(col, -18));
      x.fillStyle = g; x.fillRect(ax + gap, ay + gap, w - gap * 2, h - gap * 2);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(ax + gap, ay + gap, w - gap * 2, gap);
    });
  }
  speckle(x, s, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.18)'], s * 6, s / 300, s / 110, 0.5);
}
// Aclara u oscurece un color #rrggbb
function shade(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + d));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
// Chapa acanalada: franjas verticales de luz y sombra
function corrugated(x, s, ribs = 8, lo = 150, hi = 240) {
  for (let i = 0; i < s; i++) {
    const k = 0.5 + 0.5 * Math.sin((i / s) * ribs * Math.PI * 2);
    const v = Math.round(lo + (hi - lo) * k);
    x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1, s);
  }
}

export const draw = {
  revoque: (x, s) => {
    x.fillStyle = '#ececea'; x.fillRect(0, 0, s, s);
    blotches(x, s, ['#f4f4f2', '#e4e4e0', '#e9e7e1'], 8, s * 0.2, s * 0.45, 0.18);
    speckle(x, s, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.5)'], s * 5, s / 400, s / 150, 0.6);
    x.strokeStyle = 'rgba(0,0,0,.035)'; x.lineWidth = s / 60;
    for (let i = 0; i < 5; i++) { const px = Math.random() * s; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (Math.random() - 0.5) * 4, s); x.stroke(); }
  },
  ladrillo: (x, s) => bricks(x, s, '#cdbfae', ['#a5482f', '#b5583c', '#9a4128', '#b9644a', '#8e3b25', '#a85236']),
  ladrilloClaro: (x, s) => bricks(x, s, '#bdbdbd', ['#f0f0f0', '#e4e4e4', '#dadada', '#ebebeb']),
  chapa: (x, s) => {
    corrugated(x, s);
    x.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc((i + 0.5) * s / 8, s * 0.06, s / 110, 0, 7); x.fill(); }
    blotches(x, s, ['rgba(120,90,60,.5)'], 3, s * 0.05, s * 0.14, 0.18); // un poco de óxido
  },
  madera: (x, s) => {
    const n = 6, h = s / n;
    for (let i = 0; i < n; i++) {
      const v = 214 + Math.floor(Math.random() * 30);
      x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, i * h, s, h);
      x.strokeStyle = 'rgba(0,0,0,.07)'; x.lineWidth = 1;
      for (let k = 0; k < 4; k++) { const y = i * h + Math.random() * h; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(s / 3, y + 2, s * 0.6, y - 2, s, y); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, i * h, s, h * 0.1);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, (i + 1) * h - h * 0.14, s, h * 0.14);
    }
  },
  troncos: (x, s) => {
    const n = 5, h = s / n;
    for (let i = 0; i < n; i++) {
      const g = x.createLinearGradient(0, i * h, 0, (i + 1) * h);
      g.addColorStop(0, '#8a8a8a'); g.addColorStop(0.3, '#f0f0f0'); g.addColorStop(0.65, '#d8d8d8'); g.addColorStop(1, '#6a6a6a');
      x.fillStyle = g; x.fillRect(0, i * h, s, h);
      x.strokeStyle = 'rgba(60,40,20,.12)'; x.lineWidth = 1;
      for (let k = 0; k < 3; k++) { const y = i * h + h * (0.3 + Math.random() * 0.4); x.beginPath(); x.moveTo(0, y); x.lineTo(s, y + (Math.random() - 0.5) * 3); x.stroke(); }
    }
  },
  piedra: (x, s) => {
    x.fillStyle = '#5f5850'; x.fillRect(0, 0, s, s);
    const rows = 5, h = s / rows, gap = s / 64;
    for (let r = 0; r < rows; r++) {
      const ws = []; let tot = 0;
      while (tot < s) { const w = s * (0.22 + Math.random() * 0.2); ws.push(w); tot += w; }
      const k = s / tot, off = Math.random() * s;
      let px = off;
      for (const w0 of ws) {
        const w = w0 * k, col = pick(['#a8a196', '#8f877b', '#b9b2a5', '#9c9283', '#7f786d', '#b0a48f']);
        const jy = (Math.random() - 0.5) * h * 0.15;
        wrapRect(x, s, px, r * h, w, h, (ax, ay) => {
          const g = x.createLinearGradient(ax, ay, ax, ay + h);
          g.addColorStop(0, shade(col, 22)); g.addColorStop(1, shade(col, -22));
          x.fillStyle = g; x.beginPath(); x.roundRect(ax + gap, ay + gap + jy, w - gap * 2, h - gap * 2, s / 24); x.fill();
        });
        px = (px + w) % s;
      }
    }
    speckle(x, s, ['rgba(0,0,0,.2)', 'rgba(255,255,255,.2)'], s * 5, s / 300, s / 100, 0.6);
  },
  adobe: (x, s) => {
    x.fillStyle = '#ede5d9'; x.fillRect(0, 0, s, s);
    blotches(x, s, ['#f6f0e6', '#d9cdbb', '#e2d6c4'], 12, s * 0.1, s * 0.3, 0.55);
    x.strokeStyle = 'rgba(150,120,70,.35)'; x.lineWidth = Math.max(1, s / 200);
    for (let i = 0; i < s / 2; i++) { const px = Math.random() * s, py = Math.random() * s, a = Math.random() * 6.3, l = s / 40; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    speckle(x, s, ['rgba(0,0,0,.12)'], s * 3, s / 300, s / 120, 0.6);
  },
  tejas: (x, s) => {
    x.fillStyle = '#5a5a5a'; x.fillRect(0, 0, s, s);
    const rows = 6, cols = 6, h = s / rows, w = s / cols;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const v = 200 + Math.floor(Math.random() * 45);
      wrapRect(x, s, c * w + (r % 2) * w / 2, r * h, w, h, (ax, ay) => {
        const g = x.createLinearGradient(ax, 0, ax + w, 0);
        g.addColorStop(0, `rgb(${v - 90},${v - 90},${v - 90})`); g.addColorStop(0.45, `rgb(${v},${v},${v})`); g.addColorStop(1, `rgb(${v - 70},${v - 70},${v - 70})`);
        x.fillStyle = g; x.beginPath(); x.roundRect(ax + 1, ay, w - 2, h * 1.08, [0, 0, w / 2, w / 2]); x.fill();
      });
    }
    // La sombra de cada fila sobre la de abajo
    for (let r = 0; r < rows; r++) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, r * h, s, h * 0.12); }
  },
  tejuela: (x, s) => {
    x.fillStyle = '#4a4a4a'; x.fillRect(0, 0, s, s);
    const rows = 6, h = s / rows;
    for (let r = 0; r < rows; r++) {
      let px = (r % 2) * s / 10;
      while (px < s + s / 10) {
        const w = s * (0.1 + Math.random() * 0.08), v = 175 + Math.floor(Math.random() * 60);
        wrapRect(x, s, px, r * h, w, h, (ax, ay) => { x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(ax + 1, ay, w - 2, h - 2); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(ax + 1, ay + h - h * 0.2, w - 2, h * 0.2); });
        px += w;
      }
    }
  },
  azotea: (x, s) => {
    x.fillStyle = '#8f8a83'; x.fillRect(0, 0, s, s);
    speckle(x, s, ['#8e8880', '#b8b2a8', '#7a756e', '#c9c3b8'], s * 14, s / 400, s / 120, 0.7);
    x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = s / 100; x.strokeRect(0, 0, s, s);
  },
  azulejos: (x, s) => { // azulejos biselados (subte, cocina, pizzería), claros para teñirlos
    x.fillStyle = '#b8b8b8'; x.fillRect(0, 0, s, s);
    const rows = 8, cols = 4, h = s / rows, w = s / cols, g = s / 128;
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
      const px = c * w + (r % 2) * w / 2, v = 238 + Math.floor(Math.random() * 14);
      const gr = x.createLinearGradient(0, r * h, 0, r * h + h);
      gr.addColorStop(0, `rgb(${v},${v},${v})`); gr.addColorStop(1, `rgb(${v - 30},${v - 30},${v - 30})`);
      x.fillStyle = gr; x.beginPath(); x.roundRect(px + g * 1.5, r * h + g * 1.5, w - g * 3, h - g * 3, g * 3); x.fill();
      x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(px + g * 4, r * h + g * 3, w * 0.5, g * 1.5);
    }
  },
  marmol: (x, s) => { // piso de mármol en damero (bancos, confiterías)
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      x.fillStyle = (i + j) % 2 ? '#3a3d42' : '#e9e4da'; x.fillRect(i * s / 2, j * s / 2, s / 2, s / 2);
      x.strokeStyle = (i + j) % 2 ? 'rgba(255,255,255,.12)' : 'rgba(80,70,60,.18)'; x.lineWidth = s / 200;
      for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(i * s / 2, j * s / 2 + Math.random() * s / 2); x.bezierCurveTo(i * s / 2 + s / 6, j * s / 2 + Math.random() * s / 2, i * s / 2 + s / 3, j * s / 2 + Math.random() * s / 2, i * s / 2 + s / 2, j * s / 2 + Math.random() * s / 2); x.stroke(); }
    }
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = s / 160; x.strokeRect(0, 0, s, s); x.beginPath(); x.moveTo(s / 2, 0); x.lineTo(s / 2, s); x.moveTo(0, s / 2); x.lineTo(s, s / 2); x.stroke();
  },
  boiserie: (x, s) => { // revestimiento de madera con paneles (claro, para teñir)
    x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, s, s);
    const m = s * 0.08;
    x.fillStyle = '#e6e6e6'; x.fillRect(m, m, s - m * 2, s - m * 2);
    x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(m, m, s - m * 2, s / 64); x.fillRect(m, m, s / 64, s - m * 2);
    x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(m, s - m - s / 64, s - m * 2, s / 64); x.fillRect(s - m - s / 64, m, s / 64, s - m * 2);
    x.strokeStyle = 'rgba(60,40,20,.12)'; x.lineWidth = 1;
    for (let k = 0; k < 10; k++) { const y = Math.random() * s; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(s / 3, y + 3, s * 0.6, y - 3, s, y + 1); x.stroke(); }
  },
  empapelado: (x, s) => { // papel de pared de la abuela: rayas y florcitas (claro, para teñir)
    x.fillStyle = '#ececec'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i * s / 4, 0, s / 10, s); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = (i + 0.5 + (j % 2) * 0.5) * s / 4 % s, cy = (j + 0.5) * s / 4, r = s / 40;
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; x.fillStyle = 'rgba(150,60,70,.45)'; x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.8, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(220,170,60,.7)'; x.beginPath(); x.arc(cx, cy, r * 0.6, 0, 7); x.fill();
      x.strokeStyle = 'rgba(70,120,60,.4)'; x.lineWidth = s / 160; x.beginPath(); x.moveTo(cx, cy + r); x.quadraticCurveTo(cx + r * 2, cy + r * 3, cx + r, cy + r * 4); x.stroke();
    }
  },
  granito: (x, s) => {
    x.fillStyle = '#76726c'; x.fillRect(0, 0, s, s);
    speckle(x, s, ['#5a5752', '#8f8a83', '#a39e96', '#45423e'], s * 12, s / 400, s / 130, 0.8);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, s, s / 40); x.fillRect(0, 0, s / 40, s);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, s / 40, s, s / 40);
  },
};

// Texturas sueltas que se repiten (para cajas de minijuegos y props). Medida: 1 repetición = 1 unidad;
// usar uvBox/uvScale para que la geometría tenga las coordenadas en unidades del mundo.
for (const k of Object.keys(draw)) tex[k] = (rep = [1, 1]) => canvasTex('b-' + k, 256, draw[k], rep);

// Coordenadas de textura en unidades del mundo para cualquier geometría de caras planas (cajas, prismas):
// cada cara se proyecta sobre el plano que más mira. `size` = cuántas unidades ocupa una repetición.
export function uvBox(geo, size = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) uv.setXY(i, x / size, z / size);
    else if (ax >= az) uv.setXY(i, z * Math.sign(n.getX(i)) * -1 / size, y / size);
    else uv.setXY(i, x * Math.sign(n.getZ(i)) / size, y / size);
  }
  uv.needsUpdate = true;
  return geo;
}
// Estira las coordenadas de textura (para cilindros y conos: su = vueltas, sv = alto en repeticiones)
export function uvScale(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}

// Ícono dibujado arriba de cada casilla del tablero
export function spaceIcon(type) {
  return canvasTex('space-' + type, 128, (x, s) => {
    const c = s / 2;
    const colors = { inicio: '#ffffff', azul: '#3b8fe0', roja: '#e14b3c', evento: '#f2c230', kiosco: '#2e9e48', colectivo: '#ef8a17' };
    x.fillStyle = colors[type] || '#999'; x.beginPath(); x.arc(c, c, c, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 6; x.beginPath(); x.arc(c, c, c - 10, 0, 7); x.stroke();
    x.fillStyle = type === 'inicio' ? '#1b2a4a' : '#ffffff';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 56px "Trebuchet MS", sans-serif';
    const label = { azul: '+3', roja: '−3', evento: '?', kiosco: '🏪', colectivo: '🚌', inicio: '★' }[type] || '';
    if (type === 'kiosco' || type === 'colectivo') x.font = '52px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    x.fillText(label, c, c + 4);
  });
}
