// Escena: Tocá el Timbre del Bondi — el colectivo avanza por la avenida hacia el cartel de la parada.
import * as THREE from 'three';
import { makeHouse, makeTree } from '../models.js';
import { makeBus, makeBusStop } from '../props.js';
import { tex } from '../textures.js';
import { plane, std, canvasPlane } from './util.js';

const FRONT = 2.15; // x de la trompa del colectivo (mide 4,3 de largo)

function stopSign(name) {
  return canvasPlane(3.6, 0.9, (x, w, h) => {
    x.fillStyle = '#1b2a4a'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 14); x.fill();
    x.fillStyle = '#ffffff'; x.font = `bold ${h * 0.5}px "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🚏 ' + name, w / 2, h / 2 + 2);
  }, 384);
}

export default {
  camera: { pos: [-4, 9, 14], look: [0, 0.8, 0] },
  build(ctx) {
    const { group, players } = ctx;
    group.add(plane(140, 60, std({ map: tex.grass([30, 14]) })));
    const road = plane(140, 7, std({ map: tex.asphalt([40, 2]) }), { y: 0.01 }); group.add(road);
    group.add(plane(140, 3, std({ map: tex.baldosa([60, 1]) }), { y: 0.02, z: -5 }));
    const houses = new THREE.Group(); group.add(houses);
    ['#e14b3c', '#f2c230', '#2f86e0', '#2e9e48', '#b06ab3', '#ef8a17', '#e14b3c', '#2f86e0', '#f2c230', '#2e9e48'].forEach((c, i) => {
      const h = makeHouse(c, '#1b2a4a', 4, 4.5 + (i % 3)); h.position.set(-40 + i * 8, 0, -9); houses.add(h);
      const t = makeTree(i % 2); t.position.set(-36 + i * 8, 0, -5.5); houses.add(t);
    });
    // La franja buena antes de la parada (se mueve con el piso)
    const band = plane(2, 7, new THREE.MeshBasicMaterial({ color: '#f6b40e', transparent: true, opacity: 0.35 }), { y: 0.03 }); group.add(band);
    const best = plane(0.8, 7, new THREE.MeshBasicMaterial({ color: '#2e9e48', transparent: true, opacity: 0.4 }), { y: 0.035 }); group.add(best);
    const stopPost = makeBusStop(); stopPost.position.set(FRONT + 30, 0, -4.2); group.add(stopPost);
    const bus = makeBus('#2d6cdf', '60'); bus.position.set(0, 0, 0.8); group.add(bus);
    // Los pasajeros asoman en las ventanas: los ponemos arriba del colectivo, en fila
    players.forEach((p, i) => { const g = ctx.addChar(p, -2.2 + i * 1.2, 2.2, 0.6); g.userData.slot = i; });
    return { houses, band, best, stopPost, bus, sign: null, stopName: '', scroll: 0 };
  },
  update(ctx, st, s, dt, time) {
    if (s.stop && s.stop !== st.stopName) {
      st.stopName = s.stop;
      if (st.sign) ctx.group.remove(st.sign);
      st.sign = stopSign(s.stop); ctx.group.add(st.sign);
    }
    // El colectivo queda quieto y lo que se mueve es la calle: la parada está a "dist" metros de la trompa
    const stopX = FRONT + s.dist;
    st.stopPost.position.x = stopX;
    if (st.sign) st.sign.position.set(stopX, 3.6, -4.2);
    // La franja marca dónde tiene que estar la trompa cuando tocás el timbre
    st.band.position.x = stopX - (s.zone[0] + s.zone[1]) / 2; st.band.scale.x = (s.zone[0] - s.zone[1]) / 2;
    st.best.position.x = stopX - (s.perfect[0] + s.perfect[1]) / 2; st.best.scale.x = (s.perfect[0] - s.perfect[1]) / 0.8;
    if (s.phase === 'ride') { st.scroll += dt * 6; st.houses.position.x = -((st.scroll * 1.5) % 16); }
    st.bus.position.y = s.phase === 'ride' ? Math.abs(Math.sin(time * 9)) * 0.05 : 0;
    for (const e of s.ents) {
      const g = ctx.chars.get(e.id); if (!g) continue;
      g.position.set(-1.8 + (g.userData.slot % 4) * 1.2, 2.25 + st.bus.position.y, g.userData.slot < 4 ? 0.2 : -0.6);
      g.rotation.y = 0;
      g.userData.body.position.y = e.res === 3 ? Math.abs(Math.sin(time * 12)) * 0.3 : 0;
      if (e.rang != null && !g.userData.rung) { g.userData.rung = true; ctx.sfx('select'); }
      if (e.rang == null) g.userData.rung = false;
    }
  },
};
