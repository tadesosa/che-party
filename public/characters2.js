// Personajes nuevos de Che Party (segunda tanda): mismos materiales "de juguete", cara y guantes que los demás.
// characters.js les pasa sus herramientas (part, face, toy...) para no repetirlas.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function extraBuilders({ THREE, part, face, toy, flat, canvasTex, dots }) {
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const glass = (color, opts = {}) => toy(color, { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, ...opts });
  const metal = (color = '#d9dde2', opts = {}) => toy(color, { metalness: 0.85, roughness: 0.25, clearcoat: 0.4, ...opts });
  const rbox = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 4, r);
  // La boca va donde mejor queda (el hocico del caballo, la trompa del auto...)
  const moveMouth = (body, x, y, z) => body.userData.mouth.position.set(x, y, z);

  // ---------- Texturas ----------
  const TX = {
    malbec: () => canvasTex('malbec', 512, 160, (x, w, h) => {
      x.fillStyle = '#f3e6c8'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#b08a3e'; x.lineWidth = 4; x.strokeRect(w * 0.25 - 80, 14, 160, h - 28); x.strokeRect(w * 0.75 - 80, 14, 160, h - 28);
      x.fillStyle = '#6e1430'; x.font = 'bold 28px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const cx of [w * 0.25, w * 0.75]) {
        x.fillText('MALBEC', cx, h * 0.42);
        x.font = 'italic 16px Georgia, serif'; x.fillText('Mendoza · Argentina', cx, h * 0.75); x.font = 'bold 28px Georgia, serif';
      }
    }),
    fernet: () => canvasTex('fernet', 512, 200, (x, w, h) => {
      x.fillStyle = '#efe6cf'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#c9a227'; x.fillRect(0, 0, w, 18); x.fillRect(0, h - 18, w, 18);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const cx of [w * 0.25, w * 0.75]) {
        // Águila sobre el mundo (dibujada simple)
        x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(cx, h * 0.45, 26, 0, 7); x.fill();
        x.strokeStyle = '#efe6cf'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, h * 0.45, 26, 10, 0, 0, 7); x.stroke();
        x.beginPath(); x.moveTo(cx - 52, h * 0.22); x.quadraticCurveTo(cx - 20, h * 0.36, cx, h * 0.26); x.quadraticCurveTo(cx + 20, h * 0.36, cx + 52, h * 0.22);
        x.lineTo(cx + 30, h * 0.34); x.lineTo(cx, h * 0.3); x.lineTo(cx - 30, h * 0.34); x.closePath(); x.fillStyle = '#2a2a2a'; x.fill();
        x.fillStyle = '#7a1c1c'; x.font = 'bold 22px Georgia, serif'; x.fillText('FERNET', cx, h * 0.76);
      }
    }),
    quilmes: () => canvasTex('quilmes', 512, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a62c4'); g.addColorStop(1, '#173f8f');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffffff'; x.fillRect(0, h * 0.8, w, 8); x.fillStyle = '#d6262b'; x.fillRect(0, h * 0.8 + 8, w, 8); x.fillStyle = '#ffffff'; x.fillRect(0, h * 0.8 + 16, w, 8);
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const cx of [w * 0.25, w * 0.75]) {
        x.font = 'italic bold 40px Georgia, serif'; x.fillText('Quilmes', cx, h * 0.62);
        x.font = 'bold 18px sans-serif'; x.fillText('CERVEZA', cx, h * 0.94);
      }
    }),
    hammer: (color) => canvasTex('hammer' + color, 256, 256, (x, w, h) => {
      x.fillStyle = color; x.fillRect(0, 0, w, h);
      dots(x, w, h, ['rgba(255,255,255,.18)', 'rgba(0,0,0,.18)'], 500, 2, 6, 0.6);
    }),
    meat: () => canvasTex('meat', 512, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8a3a22'); g.addColorStop(0.5, '#a3472a'); g.addColorStop(1, '#6e2a18');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      dots(x, w, h, ['#c76a45', '#5a1f10', '#e8b48f'], 400, 2, 7, 0.5);
      // Vetas de grasa
      x.strokeStyle = 'rgba(245,220,190,.55)'; x.lineWidth = 5;
      for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(Math.random() * w, 0); x.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.7, Math.random() * w, h); x.stroke(); }
      // Marcas de la parrilla
      x.strokeStyle = 'rgba(30,12,6,.75)'; x.lineWidth = 12; x.lineCap = 'round';
      for (let i = -2; i < 9; i++) { x.beginPath(); x.moveTo(i * 70, 0); x.lineTo(i * 70 + 140, h); x.stroke(); }
    }),
    pure: () => canvasTex('pure', 256, 256, (x, w, h) => {
      x.fillStyle = '#f4e4b4'; x.fillRect(0, 0, w, h);
      dots(x, w, h, ['#fff4cf', '#e2cd8f', '#fffaf0'], 500, 2, 8, 0.6);
    }),
    fur: (base, a, b) => canvasTex('fur' + base, 256, 256, (x, w, h) => {
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      x.lineWidth = 2;
      for (let i = 0; i < 900; i++) {
        x.strokeStyle = i % 2 ? a : b; x.globalAlpha = 0.45;
        const px = Math.random() * w, py = Math.random() * h;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 4, py + 6 + Math.random() * 6); x.stroke();
      }
      x.globalAlpha = 1;
    }),
    enamel: () => canvasTex('enamel', 256, 256, (x, w, h) => {
      x.fillStyle = '#1c9c8c'; x.fillRect(0, 0, w, h);
      // Florcitas pintadas, como las pavas enlozadas de la abuela
      for (let i = 0; i < 14; i++) {
        const cx = Math.random() * w, cy = Math.random() * h;
        x.fillStyle = '#ffffff';
        for (let k = 0; k < 5; k++) { const a = k * 1.256; x.beginPath(); x.ellipse(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 6, 4, a, 0, 7); x.fill(); }
        x.fillStyle = '#f6c834'; x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill();
      }
    }),
    choco: () => canvasTex('chocotorta', 256, 256, (x, w, h) => {
      // Capas: galletita de chocolate y crema (de abajo para arriba)
      const n = 7;
      for (let i = 0; i < n; i++) {
        x.fillStyle = i % 2 ? '#f7ecd6' : '#3a2016';
        x.fillRect(0, (i / n) * h, w, h / n + 1);
        if (i % 2 === 0) dots(x, w, h / n, ['#4d2c1f', '#2a160f'], 40, 2, 5, 0.6);
      }
      x.globalAlpha = 0.25; x.fillStyle = '#ffffff';
      for (let i = 1; i < n; i += 2) for (let k = 0; k < 30; k++) { x.beginPath(); x.arc(Math.random() * w, (i / n) * h + Math.random() * (h / n), 3, 0, 7); x.fill(); }
      x.globalAlpha = 1;
    }),
    crumbs: () => canvasTex('crumbs', 256, 256, (x, w, h) => {
      x.fillStyle = '#3a2016'; x.fillRect(0, 0, w, h);
      dots(x, w, h, ['#5a3424', '#24120b', '#7a4a33'], 500, 2, 7, 0.8);
    }),
  };

  return {
    // 🍷 Botella de Malbec
    vino(body) {
      body.add(part(lathe([[0.02, 0], [0.37, 0.02], [0.4, 0.08], [0.4, 1.02], [0.36, 1.16], [0.22, 1.32], [0.15, 1.42], [0.14, 1.78], [0.16, 1.8], [0.16, 1.84], [0.02, 1.85]]), glass('#24361c')));
      body.add(part(new THREE.CylinderGeometry(0.405, 0.405, 0.46, 40, 1, true), toy('#ffffff', { map: TX.malbec(), clearcoat: 0.2 }), { y: 0.48, ry: -Math.PI / 2, outline: false }));
      body.add(part(new THREE.CylinderGeometry(0.155, 0.16, 0.36, 24), metal('#7b1e3a', { metalness: 0.6 }), { y: 1.66 }));
      face(body, { y: 0.98, z: 0.38, spread: 0.16, size: 0.11, mouth: 0.13 });
      moveMouth(body, 0, 0.83, 0.395);
      return { arms: { x: 0.43, y: 0.78, color: '#24361c' }, legs: { color: '#24361c', shoe: '#7b1e3a' }, top: 2.05 };
    },
    // 🥃 Botella de fernet
    fernet(body) {
      body.add(part(lathe([[0.02, 0], [0.33, 0.02], [0.36, 0.08], [0.36, 1.0], [0.3, 1.14], [0.15, 1.24], [0.12, 1.3], [0.12, 1.72], [0.14, 1.75], [0.02, 1.76]]), glass('#1a120d')));
      body.add(part(new THREE.CylinderGeometry(0.365, 0.365, 0.54, 40, 1, true), toy('#ffffff', { map: TX.fernet(), clearcoat: 0.2 }), { y: 0.5, ry: -Math.PI / 2, outline: false }));
      body.add(part(new THREE.CylinderGeometry(0.135, 0.135, 0.24, 20), toy('#b5121b'), { y: 1.68 }));
      body.add(part(new THREE.CylinderGeometry(0.37, 0.37, 0.07, 40), metal('#c9a227'), { y: 0.96, outline: false }));
      face(body, { y: 1.06, z: 0.35, spread: 0.15, size: 0.105, mouth: 0.12 });
      moveMouth(body, 0, 0.9, 0.36);
      return { arms: { x: 0.39, y: 0.8, color: '#1a120d' }, legs: { color: '#1a120d', shoe: '#c9a227' }, top: 1.95 };
    },
    // 🍺 Lata de Quilmes
    quilmes(body) {
      body.add(part(new THREE.CylinderGeometry(0.43, 0.43, 1.1, 40, 1, true), toy('#ffffff', { map: TX.quilmes(), metalness: 0.45, roughness: 0.3, clearcoat: 0.8 }), { y: 0.72, ry: -Math.PI / 2 }));
      body.add(part(lathe([[0.43, 0], [0.38, -0.08], [0.3, -0.1], [0.02, -0.1]]), metal(), { y: 0.17 }));
      body.add(part(lathe([[0.02, 0.06], [0.36, 0.06], [0.38, 0.1], [0.43, 0]]), metal(), { y: 1.27 }));
      body.add(part(new THREE.TorusGeometry(0.075, 0.022, 6, 16), metal('#c0c5cc'), { y: 1.34, z: 0.12, rx: Math.PI / 2, outline: false })); // anillito
      face(body, { y: 1.0, z: 0.42, spread: 0.17, size: 0.12, mouth: 0.14 });
      return { arms: { x: 0.46, y: 0.78, color: '#1f4fa8' }, legs: { color: '#1f4fa8', shoe: '#d6262b' }, top: 1.75 };
    },
    // ☀️ El Sol de Mayo
    sol(body) {
      const gold = toy('#ffc61a', { emissive: '#7a4a00', emissiveIntensity: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.15 });
      body.add(part(new THREE.SphereGeometry(0.52, 36, 28), gold, { y: 0.95, s: [1, 1, 0.82] }));
      // 32 rayos: rectos y flamígeros (ondulados) intercalados, como en la bandera
      const ray = new THREE.ConeGeometry(0.07, 0.42, 6);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, wavy = i % 2 === 1, r = 0.66;
        const m = part(ray, gold, { x: Math.cos(a) * r, y: 0.95 + Math.sin(a) * r, z: -0.06, rz: a - Math.PI / 2, s: wavy ? [1.2, 0.85, 0.6] : [1, 1.15, 0.6], outline: i % 2 === 0 });
        if (wavy) m.rotation.y = 0.5;
        body.add(m);
      }
      face(body, { y: 1.02, z: 0.41, spread: 0.17, size: 0.12, mouth: 0.16 });
      return { arms: { x: 0.5, y: 0.65, color: '#f2a90f' }, legs: { color: '#f2a90f', shoe: '#74acdf' }, top: 2.05 };
    },
    // 🐴 El caballo blanco de San Martín (con su bicornio de granadero)
    caballo(body) {
      const white = toy('#ffffff', { map: TX.fur('#f6f3ec', '#ffffff', '#ddd6c8'), clearcoat: 0.3 });
      body.add(part(new THREE.CapsuleGeometry(0.4, 0.5, 10, 24), white, { y: 0.66, s: [1.05, 1, 0.9] }));
      // Manta de granadero: azul con borde rojo
      body.add(part(new THREE.CylinderGeometry(0.43, 0.45, 0.3, 32, 1, true), toy('#1e3a8a', { side: THREE.DoubleSide }), { y: 0.62, outline: false }));
      body.add(part(new THREE.TorusGeometry(0.45, 0.03, 6, 32), toy('#c8102e'), { y: 0.47, rx: Math.PI / 2, outline: false }));
      // Cara larga de caballo: frente arriba, se va angostando hasta el hocico
      body.add(part(new THREE.CapsuleGeometry(0.25, 0.55, 10, 22), white, { y: 1.44, z: 0.1, rx: -0.38, s: [1, 1, 0.95] })); // cabeza
      body.add(part(new THREE.SphereGeometry(0.22, 22, 18), toy('#ece2d6', { clearcoat: 0.3 }), { y: 1.02, z: 0.36, s: [1.05, 0.85, 0.95] })); // hocico
      for (const sx of [-1, 1]) {
        body.add(part(new THREE.SphereGeometry(0.035, 8, 6), flat('#4a3c36'), { x: sx * 0.09, y: 1.04, z: 0.56, outline: false })); // narices
        body.add(part(new THREE.ConeGeometry(0.08, 0.24, 10), white, { x: sx * 0.16, y: 1.92, z: -0.02, rz: -sx * 0.25 })); // orejas
      }
      const mane = toy('#8f897f', { clearcoat: 0.2 });
      for (let i = 0; i < 7; i++) body.add(part(new THREE.SphereGeometry(0.1, 12, 10), mane, { y: 1.86 - i * 0.14, z: -0.22 - i * 0.04, s: [0.65, 1, 1] }));
      body.add(part(new THREE.CapsuleGeometry(0.08, 0.42, 6, 10), mane, { y: 0.55, z: -0.42, rx: 0.8 })); // cola
      // Bicornio negro de granadero con escarapela
      const hat = new THREE.Group();
      hat.add(part(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toy('#141414'), { s: [1.55, 0.62, 0.55] }));
      hat.add(part(new THREE.CircleGeometry(0.075, 16), toy('#74acdf'), { y: 0.1, z: 0.18, outline: false }));
      hat.add(part(new THREE.CircleGeometry(0.035, 12), toy('#ffffff'), { y: 0.1, z: 0.182, outline: false }));
      hat.position.set(0, 1.86, -0.04); hat.rotation.z = 0.08;
      body.add(hat);
      face(body, { y: 1.58, z: 0.3, spread: 0.15, size: 0.105, mouth: 0.13 });
      moveMouth(body, 0, 0.95, 0.55);
      return { arms: { x: 0.44, y: 0.85, color: '#f1ece2' }, legs: { color: '#f1ece2', shoe: '#3a3330' }, top: 2.05 };
    },
    // 🚗 Fiat Uno rojo (los ojos en el parabrisas)
    fiat(body) {
      const red = toy('#e3242b', { clearcoat: 1, clearcoatRoughness: 0.08, roughness: 0.3 });
      const black = toy('#1a1a1e', { roughness: 0.8, clearcoat: 0 });
      body.add(part(rbox(1.0, 0.42, 1.5, 0.1), red, { y: 0.5 }));
      body.add(part(rbox(0.92, 0.46, 0.92, 0.1), red, { y: 0.9, z: -0.15 }));
      const glassM = glass('#9fd3f0', { opacity: 0.85, transparent: true });
      body.add(part(new THREE.PlaneGeometry(0.78, 0.36), glassM, { y: 0.92, z: 0.315, rx: -0.12, outline: false })); // parabrisas
      for (const sx of [-1, 1]) {
        body.add(part(new THREE.PlaneGeometry(0.72, 0.3), glassM, { x: sx * 0.465, y: 0.92, z: -0.15, ry: sx * Math.PI / 2, outline: false }));
        for (const z of [0.47, -0.5]) {
          body.add(part(new THREE.CylinderGeometry(0.19, 0.19, 0.14, 24), black, { x: sx * 0.47, y: 0.22, z, rz: Math.PI / 2 }));
          body.add(part(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 16), metal(), { x: sx * 0.48, y: 0.22, z, rz: Math.PI / 2, outline: false }));
        }
        body.add(part(rbox(0.22, 0.12, 0.04, 0.02), toy('#fff6c4', { emissive: '#ffe680', emissiveIntensity: 0.6 }), { x: sx * 0.32, y: 0.58, z: 0.76, outline: false })); // faros
      }
      body.add(part(rbox(1.04, 0.1, 0.1, 0.04), black, { y: 0.32, z: 0.74 })); // paragolpes
      body.add(part(rbox(1.04, 0.1, 0.1, 0.04), black, { y: 0.32, z: -0.74 }));
      body.add(part(rbox(0.36, 0.1, 0.03, 0.02), black, { y: 0.58, z: 0.755, outline: false })); // parrilla
      face(body, { y: 0.97, z: 0.33, spread: 0.18, size: 0.11, mouth: 0.15, brow: true });
      moveMouth(body, 0, 0.47, 0.77);
      return { arms: { x: 0.55, y: 0.72, color: '#e3242b', len: 0.2 }, legs: null, top: 1.4 };
    },
    // 🧉 Termo verde de toda la vida
    termo(body) {
      const green = toy('#ffffff', { map: TX.hammer('#3f7a45'), clearcoat: 0.7, roughness: 0.35 });
      body.add(part(new THREE.CylinderGeometry(0.34, 0.36, 1.25, 36), green, { y: 0.66 }));
      body.add(part(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 36), metal(), { y: 1.33 }));
      body.add(part(new THREE.CylinderGeometry(0.3, 0.3, 0.28, 36), green, { y: 1.53 })); // tapa-vaso
      body.add(part(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 36), metal(), { y: 0.06, outline: false }));
      const handle = new THREE.TorusGeometry(0.22, 0.05, 8, 20, Math.PI);
      body.add(part(handle, metal('#c9ced4'), { x: 0.38, y: 0.9, rz: -Math.PI / 2 }));
      face(body, { y: 0.98, z: 0.35, spread: 0.15, size: 0.115, mouth: 0.14 });
      return { arms: { x: 0.36, y: 0.72, color: '#2f5c33' }, legs: { color: '#2f5c33', shoe: '#7b4a2d' }, top: 1.95 };
    },
    // 🥩 Tira de asado (con los huesitos)
    asado(body) {
      const meat = toy('#ffffff', { map: TX.meat(), clearcoat: 0.6, clearcoatRoughness: 0.3, roughness: 0.5 });
      body.add(part(rbox(1.35, 0.95, 0.24, 0.1), meat, { y: 0.82 }));
      const bone = toy('#f4ead6', { clearcoat: 0.3 });
      for (let i = 0; i < 4; i++) {
        const x = -0.48 + i * 0.32;
        body.add(part(new THREE.CylinderGeometry(0.075, 0.075, 0.27, 14), bone, { x, y: 0.5, rx: Math.PI / 2 }));
        body.add(part(new THREE.CircleGeometry(0.045, 12), flat('#d9b98c'), { x, y: 0.5, z: 0.137, outline: false }));
      }
      body.add(part(rbox(1.36, 0.1, 0.25, 0.04), toy('#f1dcc0'), { y: 1.28, outline: false })); // grasita de arriba
      face(body, { y: 0.98, z: 0.13, spread: 0.22, size: 0.13, mouth: 0.15 });
      return { arms: { x: 0.7, y: 0.78, color: '#8a3a22' }, legs: { color: '#8a3a22', shoe: '#2e9e48' }, top: 1.55 };
    },
    // 🥔 Puré de papa en su plato, con un pedacito de manteca
    pure(body) {
      const plate = toy('#ffffff', { clearcoat: 1, clearcoatRoughness: 0.1 });
      body.add(part(lathe([[0.02, 0], [0.5, 0.02], [0.62, 0.1], [0.75, 0.2], [0.73, 0.23], [0.58, 0.16], [0.02, 0.14]]), plate, { y: 0.02 }));
      body.add(part(new THREE.TorusGeometry(0.74, 0.02, 6, 40), toy('#2f86e0'), { y: 0.25, rx: Math.PI / 2, outline: false }));
      // Montaña de puré con grumos
      const geo = new THREE.SphereGeometry(0.58, 40, 30, 0, Math.PI * 2, 0, Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const k = 1 + Math.sin(x * 14) * Math.cos(z * 13) * 0.04 + Math.sin(Math.atan2(z, x) * 7 + y * 9) * 0.03 * y;
        pos.setXYZ(i, x * k, y * k * 1.35, z * k);
      }
      geo.computeVertexNormals();
      body.add(part(geo, toy('#ffffff', { map: TX.pure(), roughness: 0.7, clearcoat: 0.2 }), { y: 0.18 }));
      body.add(part(rbox(0.24, 0.1, 0.18, 0.03), toy('#fbe36b', { clearcoat: 0.9 }), { y: 0.97, ry: 0.4, rz: 0.12 })); // manteca
      face(body, { y: 0.56, z: 0.5, spread: 0.18, size: 0.12, mouth: 0.15 });
      return { arms: { x: 0.6, y: 0.48, color: '#e2cd8f' }, legs: { color: '#e2cd8f', shoe: '#2f86e0' }, top: 1.5 };
    },
    // 🦫 Carpincho, tranquilo, con su mandarina en la cabeza
    capibara(body) {
      const fur = toy('#ffffff', { map: TX.fur('#a27a52', '#b88d61', '#8a6642'), clearcoat: 0.15, roughness: 0.7 });
      body.add(part(new THREE.CapsuleGeometry(0.46, 0.4, 10, 24), fur, { y: 0.66, s: [1.05, 1, 0.95] }));
      body.add(part(rbox(0.66, 0.56, 0.74, 0.2), fur, { y: 1.36, z: 0.08 })); // cabeza cuadradota
      body.add(part(rbox(0.5, 0.26, 0.2, 0.09), toy('#6e4f34', { roughness: 0.8 }), { y: 1.22, z: 0.43 })); // hocico
      for (const sx of [-1, 1]) {
        body.add(part(new THREE.SphereGeometry(0.08, 12, 10), fur, { x: sx * 0.26, y: 1.66, z: -0.12, s: [1, 0.8, 0.6] })); // orejitas
        body.add(part(new THREE.SphereGeometry(0.03, 8, 6), flat('#2b1d14'), { x: sx * 0.08, y: 1.28, z: 0.535, outline: false }));
      }
      const orange = toy('#ff8a1e', { clearcoat: 0.7 });
      body.add(part(new THREE.SphereGeometry(0.15, 20, 16), orange, { y: 1.78, z: 0.05, s: [1, 0.85, 1] }));
      body.add(part(new THREE.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), toy('#3f8f3a'), { x: 0.04, y: 1.9, z: 0.05, s: [1.6, 0.6, 0.8], outline: false }));
      face(body, { y: 1.46, z: 0.45, spread: 0.18, size: 0.1, mouth: 0.13, brow: false });
      moveMouth(body, 0, 1.13, 0.54);
      return { arms: { x: 0.5, y: 0.78, color: '#8a6642' }, legs: { color: '#8a6642', shoe: '#5a3d26' }, top: 2.05 };
    },
    // 🫖 Pava enlozada, con florcitas
    pava(body) {
      const enamel = toy('#ffffff', { map: TX.enamel(), clearcoat: 1, clearcoatRoughness: 0.12 });
      body.add(part(lathe([[0.02, 0], [0.5, 0.02], [0.6, 0.18], [0.62, 0.42], [0.56, 0.7], [0.4, 0.88], [0.3, 0.94], [0.02, 0.95]]), enamel, { y: 0.1 }));
      body.add(part(new THREE.CylinderGeometry(0.3, 0.32, 0.08, 28), toy('#1c9c8c'), { y: 1.07 }));
      body.add(part(new THREE.SphereGeometry(0.08, 14, 10), toy('#1b2a4a'), { y: 1.15 }));
      body.add(part(new THREE.CylinderGeometry(0.05, 0.11, 0.6, 14), enamel, { x: 0.62, y: 0.6, rz: -0.85 })); // pico
      body.add(part(new THREE.TorusGeometry(0.42, 0.04, 8, 24, Math.PI), toy('#1b2a4a'), { y: 1.0, ry: Math.PI / 2 })); // manija
      face(body, { y: 0.62, z: 0.58, spread: 0.19, size: 0.12, mouth: 0.15 });
      return { arms: { x: 0.6, y: 0.5, color: '#157a6e' }, legs: { color: '#157a6e', shoe: '#1b2a4a' }, top: 1.6 };
    },
    // 🍰 Chocotorta (capas de galletita y crema)
    chocotorta(body) {
      const side = toy('#ffffff', { map: TX.choco(), clearcoat: 0.4, roughness: 0.6 });
      const top = toy('#ffffff', { map: TX.crumbs(), roughness: 0.8, clearcoat: 0.1 });
      body.add(part(new THREE.BoxGeometry(1.15, 1.0, 0.75), [side, side, top, side, side, side], { y: 0.78 }));
      for (let i = 0; i < 3; i++) body.add(part(new THREE.SphereGeometry(0.09, 12, 10), toy('#f7ecd6'), { x: -0.32 + i * 0.32, y: 1.31, z: 0.1, s: [1, 0.7, 1] }));
      body.add(part(new THREE.SphereGeometry(0.07, 12, 10), toy('#c8102e', { clearcoat: 1 }), { y: 1.42, z: 0.1 }));
      face(body, { y: 0.92, z: 0.38, spread: 0.21, size: 0.13, mouth: 0.15 });
      return { arms: { x: 0.62, y: 0.75, color: '#3a2016' }, legs: { color: '#3a2016', shoe: '#e8c12e' }, top: 1.65 };
    },
  };
}
