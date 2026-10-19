// Don Sifón en 3D: un escenario chiquito aparte (con su propio canvas y fondo transparente) que se dibuja
// encima de la tele. Mueve la boca mientras habla y cambia de cara según el ánimo: talk, happy, shock o sad.
import * as THREE from 'three';
import { makeCharacter, animateChar } from './models.js';

export function createHostStage(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a7a8a', 1.6));
  const key = new THREE.DirectionalLight('#fff4e0', 2.6); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.8); rim.position.set(-3, 2, -2); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 1.15, 5.6);
  camera.lookAt(0, 0.95, 0);

  const sifon = makeCharacter('sifon', '#74acdf');
  sifon.userData.ring.visible = false;
  sifon.userData.blob.visible = false;
  scene.add(sifon);
  const body = sifon.userData.body;
  const mouth = body.userData.mouth;
  let mood = 'talk', talking = false, moodT = 0, blinkAt = 1;

  function setSize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  setSize(canvas.clientWidth || 220, canvas.clientHeight || 260);

  return {
    setSize,
    setMood(m) { mood = m || 'talk'; moodT = 0; },
    setTalking(v) { talking = v; },
    render(time, dt) {
      moodT += dt;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h && (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio()))) setSize(w, h);
      // Se balancea un poco siempre; al hablar, rebota y mueve la boca
      sifon.rotation.y = -0.2 + Math.sin(time * 0.8) * 0.18;
      body.rotation.z = Math.sin(time * 2.2) * 0.05;
      body.rotation.x = 0;
      body.position.y = 0;
      if (mouth) mouth.scale.y = talking ? 0.35 + Math.abs(Math.sin(time * 16)) * 0.9 : 1;
      body.scale.set(1, 1 + (talking ? Math.sin(time * 16) * 0.025 : 0), 1);
      let cheer = false, wave = false;
      if (mood === 'happy') { cheer = moodT < 2.2; body.position.y = Math.abs(Math.sin(time * 7)) * 0.12; }
      else if (mood === 'shock') { cheer = true; if (moodT < 0.6) body.position.y = Math.sin((moodT / 0.6) * Math.PI) * 0.45; sifon.rotation.y = Math.sin(time * 14) * 0.08; }
      else if (mood === 'sad') { body.rotation.x = 0.22; body.position.y = -0.04; }
      else wave = talking;
      animateChar(sifon, time, { cheer, wave, phase: 1 });
      if (mood === 'sad') sifon.userData.arms.forEach((a) => { a.rotation.z += (a.userData.side * 0.15 - a.rotation.z) * 0.3; });
      // Parpadeo
      const eyes = sifon.userData.eyes;
      if (time > blinkAt + 0.14) blinkAt = time + 2 + Math.random() * 3;
      const closed = time > blinkAt && time < blinkAt + 0.14;
      for (const e of eyes) e.scale.y = closed ? 0.12 : mood === 'shock' && moodT < 1.5 ? 1.25 : 1;
      renderer.render(scene, camera);
    },
  };
}
