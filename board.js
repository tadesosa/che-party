// Tableros de Che Party. Cada tablero es un mapa con caminos que se separan y se vuelven a juntar.
// Cada casilla es un nodo con su posición (x, z), su altura (y), su tipo y a qué casillas sigue (next).
// En los cruces (tipo 'cruce') el jugador elige por dónde seguir; los cruces no cuentan como paso.
// Cada mapa tiene su forma: Buenos Aires es una cuadrícula de calles de mano única, Mendoza sube
// a la Cordillera y baja, y La Costa es larga junto al mar con un muelle que entra y vuelve.

// Los n puntos de una cuadra, sin las esquinas (para la cuadrícula de Buenos Aires)
const cuadra = (a, b, n = 4) => [[a[0] + (b[0] - a[0]) / (n + 1), a[1] + (b[1] - a[1]) / (n + 1)], [a[0] + (b[0] - a[0]) * n / (n + 1), a[1] + (b[1] - a[1]) * n / (n + 1)]];
// Esquinas de Buenos Aires: columnas x = -24, -8, 8, 24 y filas z = -15, 0, 15
const BA = (i, j) => [[-24, -8, 8, 24][i], [-15, 0, 15][j]];

const DEFS = {
  // Cuadrícula de 3 x 2 manzanas con calles de mano única: en cada esquina con dos salidas se elige.
  // Se puede dar la vuelta a la manzana, cortar por Corrientes o seguir por el borde del mapa.
  baires: {
    name: 'Buenos Aires',
    desc: 'Calles de mano única entre Palermo y La Boca. Tres colectivos te llevan de punta a punta y el Banco guarda la plata.',
    view: { pos: [0, 50, 40], look: [0, 0, -1] },
    segments: [
      { key: 'salida', name: 'Plaza de Mayo', pts: cuadra(BA(1, 2), BA(2, 2)), types: ['inicio', 'azul', 'evento', 'azul'] },
      { key: 'e22', name: 'el Microcentro', pts: [BA(2, 2)], types: ['azul'] },
      { key: 'boca', name: 'La Boca', pts: cuadra(BA(2, 2), BA(3, 2)), types: ['azul', 'kiosco', 'roja', 'azul'] },
      { key: 'e32', name: 'Caminito', pts: [BA(3, 2)], types: ['evento'] },
      { key: 'madero', name: 'Puerto Madero', pts: cuadra(BA(3, 2), BA(3, 1)), types: ['azul', 'suerte', 'azul', 'roja'] },
      { key: 'e31', name: 'el Puente de la Mujer', pts: [BA(3, 1)], types: ['banco'] },
      { key: 'costanera', name: 'la Costanera', pts: cuadra(BA(3, 1), BA(3, 0)), types: ['evento', 'azul', 'roja', 'azul'] },
      { key: 'e30', name: 'la Torre Monumental', pts: [BA(3, 0)], types: ['roja'] },
      { key: 'retiro', name: 'Retiro', pts: cuadra(BA(3, 0), BA(2, 0)), types: ['azul', 'colectivo', 'azul', 'evento'] },
      { key: 'e20', pts: [BA(2, 0)], types: ['cruce'] },
      { key: 'palermo', name: 'Palermo', pts: cuadra(BA(2, 0), BA(1, 0)), types: ['azul', 'roja', 'suerte', 'azul'] },
      { key: 'e10', name: 'el Planetario', pts: [BA(1, 0)], types: ['azul'] },
      { key: 'recoleta', name: 'Recoleta', pts: cuadra(BA(1, 0), BA(0, 0)), types: ['roja', 'azul', 'kiosco', 'azul'] },
      { key: 'e00', name: 'el Cementerio de la Recoleta', pts: [BA(0, 0)], types: ['evento'] },
      { key: 'almagro', name: 'Almagro', pts: cuadra(BA(0, 0), BA(0, 1)), types: ['azul', 'colectivo', 'roja', 'azul'] },
      { key: 'e01', pts: [BA(0, 1)], types: ['cruce'] },
      { key: 'boedo', name: 'Boedo', pts: cuadra(BA(0, 1), BA(0, 2)), types: ['evento', 'azul', 'impuesto', 'azul'] },
      { key: 'e02', name: 'Parque Patricios', pts: [BA(0, 2)], types: ['azul'] },
      { key: 'telmo', name: 'San Telmo', pts: cuadra(BA(0, 2), BA(1, 2)), types: ['roja', 'azul', 'evento', 'azul'] },
      { key: 'e12', pts: [BA(1, 2)], types: ['cruce'] },
      { key: 'abasto', name: 'el Abasto', pts: cuadra(BA(0, 1), BA(1, 1)), types: ['azul', 'evento', 'azul', 'roja'] },
      { key: 'e11', pts: [BA(1, 1)], types: ['cruce'] },
      { key: 'corrientes', name: 'Av. Corrientes', pts: cuadra(BA(1, 1), BA(2, 1)), types: ['azul', 'banco', 'evento', 'azul'] },
      { key: 'e21', pts: [BA(2, 1)], types: ['cruce'] },
      { key: 'bajo', name: 'el Bajo', pts: cuadra(BA(2, 1), BA(3, 1)), types: ['roja', 'azul', 'impuesto', 'azul'] },
      { key: 'congreso', name: 'el Congreso', pts: cuadra(BA(1, 2), BA(1, 1)), types: ['azul', 'roja', 'evento', 'azul'] },
      { key: 'callao', name: 'Av. Callao', pts: cuadra(BA(1, 1), BA(1, 0)), types: ['evento', 'azul', 'roja', 'azul'] },
      { key: 'nueve', name: 'la 9 de Julio', pts: cuadra(BA(2, 0), BA(2, 1)), types: ['azul', 'evento', 'azul', 'roja'] },
      { key: 'micro', name: 'el Obelisco', pts: cuadra(BA(2, 1), BA(2, 2)), types: ['azul', 'colectivo', 'suerte', 'azul'] },
    ],
    // Filas: arriba van para la izquierda, Corrientes y abajo para la derecha.
    // Columnas: la Costanera y Callao suben, Almagro y la 9 de Julio bajan.
    links: { salida: ['e22'], e22: ['boca'], boca: ['e32'], e32: ['madero'], madero: ['e31'], e31: ['costanera'], costanera: ['e30'],
      e30: ['retiro'], retiro: ['e20'], e20: ['palermo', 'nueve'], palermo: ['e10'], e10: ['recoleta'], recoleta: ['e00'], e00: ['almagro'],
      almagro: ['e01'], e01: ['boedo', 'abasto'], boedo: ['e02'], e02: ['telmo'], telmo: ['e12'], e12: ['salida', 'congreso'],
      abasto: ['e11'], e11: ['corrientes', 'callao'], corrientes: ['e21'], e21: ['bajo', 'micro'], bajo: ['e31'],
      congreso: ['e11'], callao: ['e10'], nueve: ['e21'], micro: ['e22'] },
  },

  // De la ciudad se sube a la Cordillera por los Caracoles (en zigzag, cada vuelta más alta) hasta el
  // Cristo Redentor, y se baja con el Zonda por el otro lado. O se queda abajo por la Ruta del Vino.
  mendoza: {
    name: 'Mendoza',
    desc: 'Subí la Cordillera por los Caracoles hasta el Cristo Redentor y bajá con el Zonda, o quedate en los viñedos.',
    view: { pos: [0, 54, 40], look: [0, 0, -7] },
    // La montaña: el piso sube hacia el fondo (z negativo) y baja otra vez a los costados
    terrain: { h: 6, z0: -7, z1: -28, x0: 30, x1: 42 },
    segments: [
      { key: 'salida', name: 'la Plaza Independencia', pts: [[-12, 17], [12, 17]], types: ['inicio', 'azul', 'evento', 'azul', 'roja', 'azul', 'kiosco', 'azul', 'evento'] },
      { key: 'vinedos', name: 'los Viñedos', pts: [[15.5, 16], [21, 12], [23.5, 5], [23.5, -2]], types: ['azul', 'banco', 'azul', 'roja', 'suerte', 'azul', 'evento'] },
      { key: 'cruce1', pts: [[22.5, -5.5]], types: ['cruce'] },
      { key: 'ruta', name: 'la Ruta del Vino', pts: [[19, -6], [10, -4.5], [0, -4], [-10, -4.5], [-17, -5]],
        types: ['azul', 'roja', 'azul', 'evento', 'kiosco', 'azul', 'roja', 'azul', 'impuesto', 'azul', 'evento', 'roja'] },
      { key: 'caracoles', name: 'los Caracoles', pts: [[24, -9.5], [23, -12], [8, -12], [5, -14.5], [6, -17.5], [19, -18.5], [21, -21], [19, -24], [4, -25]],
        types: ['azul', 'evento', 'azul', 'zonda', 'azul', 'suerte', 'azul', 'roja', 'evento', 'azul', 'banco', 'azul', 'zonda', 'roja', 'azul', 'evento', 'azul', 'suerte', 'azul', 'azul'] },
      { key: 'cumbre', name: 'el Cristo Redentor', pts: [[0.5, -26.5], [-6, -27]], types: ['evento', 'colectivo', 'azul'] },
      { key: 'bajada', name: 'la Bajada del Zonda', pts: [[-9.5, -26], [-17, -22], [-21, -16], [-21, -9]], types: ['zonda', 'azul', 'roja', 'evento', 'zonda', 'azul', 'azul', 'roja'] },
      { key: 'canal', name: 'el Canal Cacique Guaymallén', pts: [[-21, -5.5]], types: ['azul'] },
      { key: 'cruce2', pts: [[-21, -2.5]], types: ['cruce'] },
      { key: 'parque', name: 'el Parque San Martín', pts: [[-24, 0.5], [-27, 6], [-25, 12], [-20.5, 16], [-15, 17.3]], types: ['azul', 'evento', 'azul', 'suerte', 'roja', 'azul', 'banco', 'azul'] },
      { key: 'peatonal', name: 'la Peatonal Sarmiento', pts: [[-18, 0.5], [-15.5, 5.5], [-13.5, 10.5], [-12.5, 14]], types: ['azul', 'colectivo', 'roja', 'impuesto', 'azul', 'evento'] },
    ],
    links: { salida: ['vinedos'], vinedos: ['cruce1'], cruce1: ['ruta', 'caracoles'], ruta: ['canal'], caracoles: ['cumbre'], cumbre: ['bajada'],
      bajada: ['canal'], canal: ['cruce2'], cruce2: ['parque', 'peatonal'], parque: ['salida'], peatonal: ['salida'] },
  },

  // Larga y finita junto al mar: la Rambla va para un lado y la Avenida vuelve por el otro.
  // El Muelle entra al mar y vuelve (no lleva a ningún lado, pero tiene premios), y el Puerto es la vuelta larga.
  costa: {
    name: 'La Costa',
    desc: 'Mar del Plata de punta a punta. Las olas te empujan para adelante, el Muelle entra al mar y vuelve, y el Puerto es la vuelta larga.',
    view: { pos: [0, 58, 42], look: [0, 0, -7] },
    segments: [
      { key: 'salida', name: 'la Rambla', pts: [[-36, -6], [-21.5, -6]], types: ['inicio', 'azul', 'evento', 'ola', 'azul', 'roja'] },
      { key: 'casino', name: 'el Casino', pts: [[-18, -6], [-8, -6]], types: ['azul', 'impuesto', 'ola', 'azul'] },
      { key: 'cruce1', pts: [[-5, -6]], types: ['cruce'] },
      { key: 'muelle', name: 'el Muelle', pts: [[-7.5, -9.5], [-7.5, -30], [-2.5, -30], [-2.5, -9.5]],
        types: ['azul', 'roja', 'ola', 'azul', 'evento', 'roja', 'kiosco', 'suerte', 'banco', 'roja', 'azul', 'ola', 'evento', 'roja', 'azul'] },
      { key: 'playa', name: 'la Playa Grande', pts: [[-1.5, -6], [25, -6]], types: ['azul', 'evento', 'azul', 'ola', 'roja', 'azul', 'kiosco', 'azul', 'evento', 'azul'] },
      { key: 'cruce2', pts: [[28.5, -6]], types: ['cruce'] },
      { key: 'puerto', name: 'el Puerto', pts: [[31, -9.5], [32.5, -22], [40, -23], [41.5, -12], [37.5, -0.5]],
        types: ['azul', 'ola', 'azul', 'suerte', 'evento', 'azul', 'ola', 'colectivo', 'roja', 'azul', 'evento', 'azul', 'roja', 'azul'] },
      { key: 'faro', name: 'el Faro', pts: [[30.5, -2.5], [32, 0.5]], types: ['roja', 'azul'] },
      { key: 'mogotes', name: 'Punta Mogotes', pts: [[35, 3], [34.5, 9], [30, 12.5], [24, 13]], types: ['azul', 'evento', 'azul', 'roja', 'impuesto', 'azul'] },
      { key: 'centro', name: 'el Centro', pts: [[21, 13], [-15, 13]], types: ['azul', 'banco', 'azul', 'evento', 'roja', 'azul', 'colectivo', 'azul', 'suerte', 'roja', 'azul', 'evento', 'azul'] },
      { key: 'cruce3', pts: [[-18, 13]], types: ['cruce'] },
      { key: 'torreon', name: 'el Torreón', pts: [[-21, 13], [-33, 13], [-38, 9], [-39.5, 2], [-38.5, -3]],
        types: ['azul', 'roja', 'evento', 'azul', 'kiosco', 'azul', 'roja', 'suerte', 'azul', 'evento', 'azul'] },
      { key: 'peatonal', name: 'la Peatonal San Martín', pts: [[-18, 10], [-18, -2.5]], types: ['azul', 'roja', 'evento', 'azul', 'roja'] },
    ],
    links: { salida: ['casino'], casino: ['cruce1'], cruce1: ['muelle', 'playa'], muelle: ['playa'], playa: ['cruce2'], cruce2: ['puerto', 'faro'],
      puerto: ['mogotes'], faro: ['mogotes'], mogotes: ['centro'], centro: ['cruce3'], cruce3: ['torreon', 'peatonal'], torreon: ['salida'], peatonal: ['casino'] },
  },

  // Una vuelta alrededor del lago Nahuel Huapi. Atrás se sube al Cerro Catedral (con avalanchas) o se sigue
  // por la Costanera; el catamarán cruza el lago de una orilla a la otra.
  bariloche: {
    name: 'Bariloche',
    desc: 'Una vuelta al lago Nahuel Huapi. Subí al Cerro Catedral (¡ojo con las avalanchas!) o cruzá el lago en catamarán.',
    view: { pos: [0, 56, 40], look: [0, 0, -6] },
    terrain: { h: 6, z0: -15, z1: -27, x0: 30, x1: 42 },
    segments: [
      { key: 'salida', name: 'el Centro Cívico', pts: [[-10, 13], [10, 13]], types: ['inicio', 'azul', 'evento', 'azul', 'colectivo', 'kiosco', 'azul', 'roja'] },
      { key: 'mitre', name: 'la calle Mitre', pts: [[13.5, 12.5], [20, 9], [22.5, 3], [22.5, -4]], types: ['azul', 'evento', 'azul', 'roja', 'suerte', 'azul', 'banco', 'azul'] },
      { key: 'cruce1', pts: [[22, -7.5]], types: ['cruce'] },
      { key: 'catedral', name: 'el Cerro Catedral', pts: [[24, -11], [22.5, -15], [9, -15.5], [6, -19], [19, -21], [18.5, -25], [5, -26.5]],
        types: ['azul', 'evento', 'avalancha', 'azul', 'suerte', 'azul', 'roja', 'azul', 'avalancha', 'banco', 'azul', 'evento', 'azul', 'avalancha', 'azul', 'suerte', 'azul'] },
      { key: 'refugio', name: 'el Refugio Lynch', pts: [[0.5, -28], [-6, -27.5]], types: ['evento', 'kiosco', 'azul'] },
      { key: 'bajada', name: 'la bajada del Catedral', pts: [[-10, -26], [-17, -22], [-21, -15], [-22, -10.5]], types: ['avalancha', 'azul', 'roja', 'evento', 'azul', 'avalancha', 'azul'] },
      { key: 'costanera', name: 'la Costanera del lago', pts: [[18.5, -10], [8, -12.5], [-8, -12.5], [-18, -10]],
        types: ['azul', 'roja', 'evento', 'azul', 'colectivo', 'impuesto', 'azul', 'roja', 'evento', 'azul'] },
      { key: 'cruce2', pts: [[-22.5, -7]], types: ['cruce'] },
      { key: 'colonia', name: 'Colonia Suiza', pts: [[-26, -4], [-32.5, -1], [-34, 6], [-29, 11.5], [-22, 14.2], [-13.5, 13.6]],
        types: ['azul', 'evento', 'azul', 'suerte', 'roja', 'azul', 'kiosco', 'azul', 'evento', 'azul'] },
      { key: 'llaollao', name: 'el Llao Llao', pts: [[-20.5, -3], [-18.5, 3.5], [-13, 9.8]], types: ['azul', 'impuesto', 'evento', 'roja', 'azul'] },
    ],
    links: { salida: ['mitre'], mitre: ['cruce1'], cruce1: ['catedral', 'costanera'], catedral: ['refugio'], refugio: ['bajada'], bajada: ['cruce2'],
      costanera: ['cruce2'], cruce2: ['colonia', 'llaollao'], colonia: ['salida'], llaollao: ['salida'] },
  },

  // Un ocho: del centro se sube por Güemes, se da la vuelta larga por Carlos Paz y el Uritorco (con ovnis)
  // o se corta en diagonal por La Cañada; después, las Estancias Jesuíticas o Alta Gracia.
  cordoba: {
    name: 'Córdoba',
    desc: 'Las Sierras: vuelta larga por Carlos Paz y el Uritorco (¡los ovnis te abducen!) o atajo por La Cañada.',
    view: { pos: [0, 56, 41], look: [0, 0, -5] },
    segments: [
      { key: 'salida', name: 'la Plaza San Martín', pts: [[-9, 14], [9, 14]], types: ['inicio', 'azul', 'evento', 'azul', 'kiosco', 'azul', 'roja', 'colectivo'] },
      { key: 'guemes', name: 'el Barrio Güemes', pts: [[12.5, 13], [18, 8], [19.5, 1.5]], types: ['azul', 'evento', 'roja', 'azul', 'suerte', 'azul'] },
      { key: 'cruce1', pts: [[19, -2]], types: ['cruce'] },
      { key: 'sanroque', name: 'Villa Carlos Paz', pts: [[22.5, -4], [30, -6], [33, -13], [29, -20], [21, -22.5]],
        types: ['azul', 'evento', 'azul', 'banco', 'azul', 'roja', 'suerte', 'azul', 'evento', 'kiosco', 'azul', 'azul'] },
      { key: 'uritorco', name: 'el Cerro Uritorco', pts: [[17, -25], [8, -27.5], [-4, -27.5], [-13.5, -24]],
        types: ['ovni', 'azul', 'evento', 'azul', 'suerte', 'ovni', 'azul', 'roja', 'azul', 'evento', 'ovni'] },
      { key: 'canada', name: 'La Cañada', pts: [[15.5, -4], [6, -7.5], [-3, -12], [-12, -17.5]], types: ['roja', 'azul', 'impuesto', 'evento', 'colectivo', 'azul', 'roja', 'ovni', 'azul'] },
      { key: 'cruce2', pts: [[-16, -20]], types: ['cruce'] },
      { key: 'estancias', name: 'las Estancias Jesuíticas', pts: [[-20.5, -21.5], [-30, -17], [-34, -7], [-32, 3], [-25, 10], [-13, 14.5]],
        types: ['azul', 'evento', 'azul', 'kiosco', 'azul', 'suerte', 'roja', 'azul', 'banco', 'azul', 'evento', 'azul', 'roja'] },
      { key: 'altagracia', name: 'Alta Gracia', pts: [[-18.5, -15.8], [-19, -6], [-16, 4], [-12.5, 10.5]], types: ['azul', 'roja', 'evento', 'azul', 'impuesto', 'azul', 'ovni'] },
    ],
    links: { salida: ['guemes'], guemes: ['cruce1'], cruce1: ['sanroque', 'canada'], sanroque: ['uritorco'], uritorco: ['cruce2'], canada: ['cruce2'],
      cruce2: ['estancias', 'altagracia'], estancias: ['salida'], altagracia: ['salida'] },
  },

  // Ushuaia, el fin del mundo: el Canal Beagle adelante, la pingüinera a la derecha, el Cerro Martial atrás
  // y el Glaciar a la izquierda. Los pingüinos te llevan en trineo; el Tren del Fin del Mundo es el atajo.
  sur: {
    name: 'Sur (Ushuaia)',
    desc: 'El fin del mundo: los pingüinos te llevan en trineo, el Glaciar es la vuelta larga y el Tren del Fin del Mundo te salva.',
    view: { pos: [0, 56, 42], look: [0, 0, -5] },
    segments: [
      { key: 'salida', name: 'el puerto de Ushuaia', pts: [[-12, 13], [12, 13]], types: ['inicio', 'azul', 'evento', 'azul', 'colectivo', 'roja', 'kiosco', 'azul', 'evento'] },
      { key: 'beagle', name: 'el Canal Beagle', pts: [[15.5, 12.5], [23, 9], [27, 2]], types: ['azul', 'pinguino', 'azul', 'roja', 'evento', 'azul'] },
      { key: 'cruce1', pts: [[27.5, -1.5]], types: ['cruce'] },
      { key: 'pinguinera', name: 'la Isla de los Pingüinos', pts: [[31.5, -3.5], [37.5, -7], [38, -14.5], [30.5, -20]],
        types: ['pinguino', 'azul', 'suerte', 'pinguino', 'azul', 'evento', 'banco', 'pinguino', 'azul'] },
      { key: 'tren', name: 'el Tren del Fin del Mundo', pts: [[25.5, -5.5], [25.8, -17.8]], types: ['azul', 'colectivo', 'roja', 'azul'] },
      { key: 'martial', name: 'el Cerro Martial', pts: [[26.5, -22], [11, -24.5], [-4, -24.5], [-16, -21]],
        types: ['azul', 'evento', 'azul', 'roja', 'suerte', 'azul', 'kiosco', 'impuesto', 'azul', 'evento', 'roja', 'azul', 'pinguino'] },
      { key: 'cruce2', pts: [[-20, -19]], types: ['cruce'] },
      { key: 'glaciar', name: 'el Glaciar', pts: [[-25, -21], [-33, -16], [-36, -7], [-33, 1], [-29.5, 3.5]],
        types: ['azul', 'evento', 'suerte', 'azul', 'roja', 'pinguino', 'azul', 'banco', 'azul', 'evento'] },
      { key: 'bosque', name: 'el Parque Nacional', pts: [[-21, -14], [-22, -6], [-24, 2]], types: ['roja', 'azul', 'impuesto', 'evento', 'azul'] },
      { key: 'lapataia', name: 'la Bahía Lapataia', pts: [[-26, 5.5], [-21, 11], [-15.5, 13]], types: ['azul', 'kiosco', 'azul', 'roja', 'azul'] },
    ],
    links: { salida: ['beagle'], beagle: ['cruce1'], cruce1: ['pinguinera', 'tren'], pinguinera: ['martial'], tren: ['martial'], martial: ['cruce2'],
      cruce2: ['glaciar', 'bosque'], glaciar: ['lapataia'], bosque: ['lapataia'], lapataia: ['salida'] },
  },

  // Salta y Jujuy: de la plaza se sube en zigzag por la Cuesta de Lipán hasta el altiplano. Arriba, las
  // Salinas Grandes o el viaducto del Tren a las Nubes; se baja por Humahuaca o por Purmamarca.
  norte: {
    name: 'Norte (Salta y Jujuy)',
    desc: 'Zigzag por la Cuesta de Lipán hasta las Salinas Grandes. La Pachamama te hace regalos y el Tren a las Nubes es el atajo.',
    view: { pos: [0, 57, 41], look: [0, 0, -5] },
    terrain: { h: 4, z0: 3, z1: -10, x0: 32, x1: 44 },
    segments: [
      { key: 'salida', name: 'la Plaza 9 de Julio', pts: [[-10, 15], [10, 15]], types: ['inicio', 'azul', 'evento', 'azul', 'colectivo', 'kiosco', 'azul', 'roja'] },
      { key: 'lipan', name: 'la Cuesta de Lipán', pts: [[13, 15], [21, 14.5], [23.5, 12], [21, 9.5], [12, 9], [9.5, 6.5], [12, 4], [21, 3.5], [23.5, 1]],
        types: ['azul', 'evento', 'azul', 'pachamama', 'roja', 'azul', 'evento', 'banco', 'azul', 'roja', 'suerte', 'azul', 'pachamama'] },
      { key: 'cruce1', pts: [[23.5, -3]], types: ['cruce'] },
      { key: 'salinas', name: 'las Salinas Grandes', pts: [[23, -7], [17, -14], [4, -16.5], [-8, -14.5], [-14.5, -9.5]],
        types: ['azul', 'suerte', 'azul', 'evento', 'azul', 'pachamama', 'roja', 'azul', 'kiosco', 'azul', 'evento', 'azul', 'suerte'] },
      { key: 'tren', name: 'el viaducto La Polvorilla', pts: [[19.5, -6], [6, -6.5], [-6, -6.5], [-13, -5.5]], types: ['roja', 'azul', 'impuesto', 'colectivo', 'azul', 'evento', 'roja', 'azul'] },
      { key: 'cruce2', pts: [[-17.5, -6.5]], types: ['cruce'] },
      { key: 'humahuaca', name: 'la Quebrada de Humahuaca', pts: [[-21.5, -8.5], [-29.5, -5], [-33, 2], [-29, 9.5], [-20, 14.5], [-13.5, 15.2]],
        types: ['azul', 'evento', 'pachamama', 'azul', 'roja', 'azul', 'suerte', 'azul', 'kiosco', 'evento', 'azul', 'roja', 'azul'] },
      { key: 'purmamarca', name: 'Purmamarca', pts: [[-17.5, -2.5], [-16.5, 4.5], [-12.5, 12]], types: ['azul', 'impuesto', 'evento', 'pachamama', 'azul'] },
    ],
    links: { salida: ['lipan'], lipan: ['cruce1'], cruce1: ['salinas', 'tren'], salinas: ['cruce2'], tren: ['cruce2'], cruce2: ['humahuaca', 'purmamarca'],
      humahuaca: ['salida'], purmamarca: ['salida'] },
  },
};

// Reparte n puntos parejos a lo largo de una línea quebrada
function spread(pts, n) {
  if (pts.length === 1) return [{ x: pts[0][0], z: pts[0][1] }];
  const segLen = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segLen.push(l); total += l;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    let d = n === 1 ? 0 : (k / (n - 1)) * total;
    let i = 0;
    while (i < segLen.length - 1 && d > segLen[i]) { d -= segLen[i]; i++; }
    const t = Math.min(1, d / segLen[i]);
    out.push({ x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t });
  }
  return out;
}

// Altura del piso en (x, z). Solo Mendoza tiene montaña; tv usa la misma cuenta (board3d.js) para el terreno.
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function heightAt(terrain, x, z) {
  if (!terrain) return 0;
  const { h, z0, z1, x0, x1 } = terrain;
  return h * smooth((z0 - z) / (z0 - z1)) * (1 - smooth((Math.abs(x) - x0) / (x1 - x0)));
}

function buildBoard(key) {
  const def = DEFS[key];
  const nodes = [];
  const first = {}, last = {};
  for (const seg of def.segments) {
    const ps = spread(seg.pts, seg.types.length);
    seg.types.forEach((type, i) => {
      const id = nodes.length;
      nodes.push({ id, x: +ps[i].x.toFixed(2), y: +heightAt(def.terrain, ps[i].x, ps[i].z).toFixed(2), z: +ps[i].z.toFixed(2), type, next: [], seg: seg.key, zone: seg.name || null });
      if (i === 0) first[seg.key] = id;
      if (i > 0) nodes[id - 1].next.push(id);
      last[seg.key] = id;
    });
  }
  for (const [from, tos] of Object.entries(def.links)) for (const to of tos) nodes[last[from]].next.push(first[to]);
  // En los cruces, cada salida lleva el nombre de la zona y una flecha según dónde queda en la tele
  for (const n of nodes) {
    if (n.type !== 'cruce') continue;
    n.options = n.next.map((id) => {
      const dx = nodes[id].x - n.x, dz = nodes[id].z - n.z;
      const arrow = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? '➡️' : '⬅️') : (dz < 0 ? '⬆️' : '⬇️');
      return { to: id, label: `Por ${def.segments.find((s) => s.key === nodes[id].seg).name}`, arrow };
    });
  }
  // Las paradas de colectivo forman una línea circular: cada una te lleva a la siguiente (atajo)
  const stops = nodes.filter((n) => n.type === 'colectivo');
  if (stops.length > 1) stops.forEach((n, i) => { n.warp = stops[(i + 1) % stops.length].id; });
  return { key, name: def.name, desc: def.desc, nodes, start: first.salida, view: def.view, terrain: def.terrain || null };
}

const BOARDS = Object.fromEntries(Object.keys(DEFS).map((k) => [k, buildBoard(k)]));
const BOARD_LIST = Object.values(BOARDS).map((b) => ({ key: b.key, name: b.name, desc: b.desc }));

// Distancia en pasos (los cruces no cuentan) desde una casilla a todas las demás
function distances(board, from) {
  const dist = new Map([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift();
    for (const nx of board.nodes[id].next) {
      const d = dist.get(id) + (board.nodes[nx].type === 'cruce' ? 0 : 1);
      if (!dist.has(nx) || d < dist.get(nx)) { dist.set(nx, d); queue.push(nx); }
    }
  }
  return dist;
}

// Camino más corto (lista de casillas) entre dos casillas
function pathTo(board, from, to) {
  const prev = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift();
    if (id === to) break;
    for (const nx of board.nodes[id].next) if (!prev.has(nx)) { prev.set(nx, id); queue.push(nx); }
  }
  if (!prev.has(to)) return [from];
  const path = [];
  for (let c = to; c != null; c = prev.get(c)) path.unshift(c);
  return path;
}

module.exports = { BOARDS, BOARD_LIST, distances, pathTo };
