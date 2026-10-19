// Arma dist/CheParty.exe: un solo archivo con Node, el servidor y toda la carpeta public/ adentro.
// Uso: npm run exe
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const BUILD = path.join(DIST, 'build');
const EXE = path.join(DIST, 'CheParty.exe');

fs.mkdirSync(BUILD, { recursive: true });

console.log('1/4  Empaquetando el servidor en un solo archivo…');
require('esbuild').buildSync({
  entryPoints: [path.join(ROOT, 'server.js')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: path.join(BUILD, 'server.bundle.js'),
  external: ['node:sea', 'bufferutil', 'utf-8-validate'],
  logLevel: 'warning',
});

console.log('2/4  Juntando los archivos de la pantalla y el celu…');
const assets = {};
const walk = (dir, prefix = '') => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    const rel = prefix + f.name;
    if (f.isDirectory()) walk(full, rel + '/');
    else assets[rel] = full;
  }
};
walk(path.join(ROOT, 'public'));
assets['lib/three.module.js'] = path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.js');
// Complementos de three que usa la tele (brillo, reflejos)
for (const dir of ['postprocessing', 'shaders', 'environments', 'utils', 'loaders', 'geometries', 'math']) walk(path.join(ROOT, 'node_modules', 'three', 'examples', 'jsm', dir), 'lib/addons/' + dir + '/');
// Windows no puede leer rutas de más de 260 caracteres: copiamos todo a una carpeta temporal corta
const STAGE = path.join(require('os').tmpdir(), 'laprevia-build');
fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
Object.keys(assets).forEach((rel, i) => {
  const dest = path.join(STAGE, i + path.extname(rel));
  fs.copyFileSync(assets[rel], dest);
  assets[rel] = dest;
});
fs.copyFileSync(path.join(BUILD, 'server.bundle.js'), path.join(STAGE, 'server.bundle.js'));
const config = {
  main: path.join(STAGE, 'server.bundle.js'),
  output: path.join(STAGE, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useCodeCache: false,
  assets,
};
fs.writeFileSync(path.join(STAGE, 'sea-config.json'), JSON.stringify(config, null, 2));
execFileSync(process.execPath, ['--experimental-sea-config', path.join(STAGE, 'sea-config.json')], { stdio: 'inherit' });

console.log('3/4  Copiando Node…');
try { fs.unlinkSync(EXE); } catch { /* no existía */ }
fs.copyFileSync(process.execPath, EXE);

console.log('4/4  Metiendo el juego adentro del .exe…');
execFileSync(process.execPath, [
  require.resolve('postject/dist/cli.js'), EXE, 'NODE_SEA_BLOB', path.join(STAGE, 'sea-prep.blob'),
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
], { stdio: 'inherit' });

const mb = (fs.statSync(EXE).size / 1024 / 1024).toFixed(0);
console.log(`\nListo: ${EXE} (${mb} MB, ${Object.keys(assets).length} archivos adentro)`);
