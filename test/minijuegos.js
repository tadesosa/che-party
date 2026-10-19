// Prueba cada minijuego en todos sus modos con bots (y un jugador quieto) para ver que termina y reparte bien.
const { MINIGAMES, createMinigame } = require('../minigames');
let fail = 0;
const CASES = { ffa: [2, 4, 6], duel: [2], '2v2': [4], '1v3': [4] };
for (const key of Object.keys(MINIGAMES)) {
  const out = [];
  for (const mode of MINIGAMES[key].modes) {
    for (const n of CASES[mode]) {
      const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i }));
      const ids = players.map((p) => p.id);
      const teams = mode === '2v2' ? [ids.slice(0, 2), ids.slice(2)] : mode === '1v3' ? [ids.slice(0, 1), ids.slice(1)] : mode === 'duel' ? [[ids[0]], [ids[1]]] : null;
      let t = 0, maxSnap = 0;
      try {
        const g = createMinigame(key, players, { mode, teams });
        while (!g.done && t < 150) {
          for (const p of players.slice(1)) g.bot(p.id, 1 / 30); // p0 queda quieto
          g.step(1 / 30); t += 1 / 30;
          maxSnap = Math.max(maxSnap, JSON.stringify(g.snapshot()).length);
          g.takeCues();
        }
        const r = g.ranking();
        const win = typeof g.winnerTeam === 'function' ? g.winnerTeam() : '-';
        const ok = g.done && r.length === n && new Set(r.map((x) => x.id)).size === n;
        if (!ok) fail++;
        out.push(`${mode} ${n}j: ${t.toFixed(0)}s${ok ? '' : ' ❌'} ${(maxSnap / 1024).toFixed(1)}KB${win !== '-' ? ' gana eq.' + win : ''}`);
      } catch (e) { fail++; out.push(`${mode} ${n}j: ERROR ${e.stack.split('\n').slice(0, 2).join(' ')}`); }
    }
  }
  console.log(key.padEnd(13), out.join(' | '));
}
process.exit(fail ? 1 : 0);
