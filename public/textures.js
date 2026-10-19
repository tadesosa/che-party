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
      x.fillStyle = (i + j) % 2 ? '#e6dcc6' : '#ddd1b8'; x.fillRect(i * w, j * w, w, w);
      x.fillStyle = 'rgba(0,0,0,.08)';
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { x.beginPath(); x.arc(i * w + (a + 1) * w / 4, j * w + (b + 1) * w / 4, 3, 0, 7); x.fill(); }
      x.strokeStyle = '#b9ad94'; x.lineWidth = 2; x.strokeRect(i * w, j * w, w, w);
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
