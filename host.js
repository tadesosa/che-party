// Frases del anfitrión, Don Sifón. Cada clave tiene varias versiones y se elige una al azar,
// así no repite siempre lo mismo. line('clave', ...datos) devuelve el texto.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const copas = (n) => `${n} ${n === 1 ? 'Copa' : 'Copas'}`;

const LINES = {
  intro: [
    (g, goal) => `¡Buenas buenas! Soy Don Sifón y esto es Che Party en ${g.board.name}. ${goal} ¡Que empiece el bardo!`,
    (g, goal) => `¡Bienvenidos, bienvenidas! Hoy jugamos en ${g.board.name}. ${goal} ¡Pónganse cómodos que esto viene picante!`,
    (g, goal) => `¡Llegó el momento! ${g.board.name} nos espera. ${goal} Y acuérdense: el que se enoja pierde.`,
    (g, goal) => `¡Hola, hola! Acá Don Sifón, burbujeante como siempre. Hoy: ${g.board.name}. ${goal}`,
  ],
  order: [
    (first, rest) => `¡Arranca ${first}! Después ${rest}. ¡Suerte, que la van a necesitar!`,
    (first, rest) => `${first} sale primero. ${rest}, a esperar el turno como en el banco.`,
    (first) => `¡${first} tiene la mano! El resto, a mirar y sufrir.`,
  ],
  turnLeader: [
    (p) => `${p.name} va primero. ¿Se le subirán los humos?`,
    (p) => `Ojo con ${p.name}, que viene puntero y agrandado.`,
    (p) => `${p.name}, el que va arriba. Todos te quieren bajar, eh.`,
  ],
  turnLast: [
    (p) => `${p.name} viene último... ¡Dale que todavía se puede!`,
    (p) => `A ver si ${p.name} levanta, que viene en el fondo de la tabla.`,
    (p) => `${p.name}, la remontada empieza ahora. O no. Veremos.`,
  ],
  turn: [
    (p) => `¡Dale, ${p.name}, que no tenemos toda la noche!`,
    (p) => `A ver qué hacés, ${p.name}...`,
    (p) => `${p.name} agarra el dado... ¡qué nervios!`,
    (p) => `Le toca a ${p.name}. Soplale al dado, que trae suerte.`,
  ],
  rollHigh: [
    (p, n) => `¡${n}! ¡Qué tirada, ${p.name}! ¡Volás!`,
    (p, n) => `¡${n}! ¿Le pusiste plomo al dado, ${p.name}?`,
    (p, n) => `¡Uff, ${n}! Eso es tener buena mano.`,
  ],
  rollLow: [
    (p, n) => `¿${n}? Uh, ${p.name}... ni para ir al kiosco.`,
    (p, n) => `${n} pasito${n === 1 ? '' : 's'}. Despacito y buena letra, ${p.name}.`,
    (p, n) => `¡${n}! Con esa tirada llegás para el año que viene.`,
  ],
  blue: [
    (p) => `¡Celeste! Como el cielo y la camiseta.`,
    (p) => `Casilla celeste, mangos para ${p.name}. ¡Así da gusto!`,
  ],
  red: [
    (p) => `¡Uh, roja! Eso duele, ${p.name}.`,
    (p) => `¡Casilla roja! Pagá y no llores, ${p.name}.`,
    (p) => `Roja... ${p.name}, hoy no es tu día.`,
  ],
  copa: [
    (p) => `¡Qué Copa, ${p.name}! ¡Se la merece!`,
    (p) => `¡${p.name} la levanta! ¡Dale campeón, dale campeón!`,
    (p) => `¡Y la Copa es para... ${p.name}! ¡Qué momento!`,
    (p) => `¡Copa para ${p.name}! Los demás miran con envidia.`,
    (p) => `¡${p.name} se lleva la Copa! Que alguien le avise a la familia.`,
  ],
  noMoney: [
    (p) => `Uh, ${p.name}... sin mangos no hay Copa, querido.`,
    (p) => `¡Faltan mangos, ${p.name}! Andá a juntar.`,
    (p) => `${p.name} llegó a la Copa con los bolsillos vacíos. Un clásico.`,
  ],
  pass: [
    (p) => `${p.name} no la quiso comprar... ¿Estás bien de la cabeza?`,
    (p) => `¿No la comprás, ${p.name}? Bueno, vos sabrás.`,
  ],
  copaMove: [
    () => `¡La Copa se mudó! ¡Corran, corran!`,
    () => `¡Ahí está la Copa nueva! Vayan para allá, que no espera.`,
    () => `La Copa cambió de lugar. ¿Quién llega primero?`,
  ],
  shop: [
    (p) => `Bienvenido al kiosco, ${p.name}. Sin fiado, eh.`,
    (p) => `${p.name} entró al kiosco. Gastá, gastá, que la plata va y viene.`,
  ],
  bank: [
    (p, n) => `¡${p.name} vació el Banco: ${n} mangos! ¡Eso es un golpe comando!`,
    (p, n) => `¡${n} mangos del Banco para ${p.name}! Hoy cobra, mañana no sabemos.`,
  ],
  tax: [
    (p) => `¡Impuestazo! Así es la vida, ${p.name}.`,
    (p) => `${p.name} pagó impuestos. Por lo menos alguien los paga.`,
  ],
  special: [
    (p) => `¡Agarrate, ${p.name}!`,
    (p) => `¡Uy, uy, uy! ¿Qué le pasa a ${p.name}?`,
  ],
  duel: [
    (a, b, bet) => `¡Duelo! ${a} desafía a ${b} por ${bet} mangos. ¡Que no se diga que es cagón!`,
    (a, b, bet) => `¡${a} contra ${b}, mano a mano, por ${bet} mangos! ¡Esto se pone bueno!`,
    (a, b, bet) => `¡Se pudrió todo! ${a} y ${b} se juegan ${bet} mangos.`,
  ],
  noDuel: [
    (p) => `${p.name} no se animó al duelo. Pollito.`,
    (p) => `${p.name} prefirió la paz. Muy maduro... y muy aburrido.`,
  ],
  team2: [
    () => 'Hoy se juega ¡2 contra 2! Celestes contra rojos, según la última casilla.',
    () => '¡Por equipos! Celestes de un lado, rojos del otro. A ponerse de acuerdo.',
  ],
  team1: [
    (solo) => `¡${solo} solito contra los otros tres! A ver si se la banca.`,
    (solo) => `¡Uno contra tres! ${solo}, demostrá de qué estás hecho.`,
  ],
  ffa: [
    () => 'Minijuego de todos contra todos. ¡Que gane el mejor!',
    () => '¡Minijuego! Acá no hay amigos, eh.',
    () => '¡A jugar! Celus en mano y ojos en la tele.',
  ],
  mgWin: [
    (w, title) => `¡${w} ganó ${title}! ¡Un fenómeno!`,
    (w) => `¡Aplausos para ${w}! Los demás, a practicar.`,
    (w) => `¡${w} se lleva el minijuego! Qué manos, por favor.`,
  ],
  mgTeam: [
    (names) => `¡Ganaron ${names}! Trabajo en equipo, señores.`,
    (names) => `¡Victoria para ${names}! Así se juega en equipo.`,
  ],
  mgTie: [() => '¡Empate! Nadie gana, nadie pierde... qué aburrido.'],
  round: [
    (r, lead) => `¡Ronda ${r}! ${lead}`,
    (r, lead) => `Arranca la ronda ${r}. ${lead}`,
  ],
  half: [(lead) => `¡Ya vamos por la mitad! ${lead}`],
  leadChange: [
    (p) => `¡Cambio de punta! ${p.name} pasa al frente.`,
    (p) => `¡Atención! ${p.name} es el nuevo puntero.`,
  ],
  last: [
    (who) => `¡Atención, últimas 3 rondas! Las casillas valen el doble y ${who}, que viene último, recibe 10 mangos de ayuda.`,
    (who) => `¡Se viene el final! Tres rondas, casillas al doble, y una ayudita de 10 mangos para ${who}, que la viene pasando mal.`,
  ],
  news: [
    () => '¡Interrumpimos la partida para dar una noticia!',
    () => '¡Atención, atención! Último momento...',
    () => '¡Paren todo! Me acaban de avisar algo.',
  ],
  gift: [
    (p) => `¡Un regalo para ${p.name}! Elegí bien, eh...`,
    (p) => `${p.name}, te traje tres cajas. Una es buena... creo.`,
    (p) => `¡Regalo de Sifón para ${p.name}! ¿Cuál abrís?`,
  ],
  giftGood: [() => '¡Mirá lo que te tocó! ¡Qué suerte!', () => '¡Esa caja era la buena! ¡Bien ahí!'],
  giftBad: [() => 'Jajaja, ¡te la comiste!', () => 'Uh... esa caja no era. ¡La próxima!'],
  chancla: [
    (p, t) => `¡Chancletazo de ${p.name} a ${t.name}! ¡Eso no se hace!`,
    (p, t) => `¡Voló la chancleta! ${t.name} no la vio venir.`,
  ],
  cambiazo: [(p, t) => `¡Cambiazo! ${p.name} y ${t.name} cambian de lugar. ¿Quién te conoce?`],
  bache: [(p) => `${p.name} dejó un bache... ¡Cuidado donde pisan!`],
  trap: [(v, o) => `¡${v.name} cayó en el bache de ${o.name}! ¡Pagá, pagá!`],
  paraguas: [(p) => `¡Paraguas! ${p.name} se cubrió justo.`],
  trucho: [(p) => `¿Dado trucho? Yo no vi nada...`, (p) => `${p.name} elige el número. Esto no es muy legal, eh.`],
  bonus: [
    () => '¡Llegó el momento de los premios sorpresa! Cada premio vale una Copa... ¡y esto puede dar vuelta todo!',
    () => '¡Pará, pará, que esto no terminó! Se vienen los premios sorpresa: una Copa cada uno.',
  ],
  bonusWho: [(title) => `Y el premio ${title} es para...`, (title) => `${title}... redoble, por favor...`],
  bonusWin: [(names) => `¡${names}! ¡Una Copa más!`, (names) => `¡Para ${names}! ¡Tomá, una Copita!`],
  end: [
    (p) => `¡${p.name} es el gran campeón de Che Party! ¡Aplausos para todos!`,
    (p) => `¡${p.name} gana! Los demás, a lavar los platos.`,
    (p) => `¡Campeón ${p.name}! Fue un placer, soy Don Sifón y los espero en la revancha.`,
  ],
  minis: [() => '¡Modo Solo Minijuegos! Elijan cualquier juego en la compu y a darle.'],
};

function line(key, ...args) {
  const l = LINES[key];
  if (!l) return '';
  return pick(l)(...args);
}

module.exports = { line, copas };
