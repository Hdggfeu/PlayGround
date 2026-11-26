// Pokémon Templier — data catalogue
// A fan-made, original creature RPG set in the sand-built region of Templier.

export const TYPE_COLORS = {
  Normal: '#a8a29e', Feu: '#ef6b3b', Eau: '#4b8ef7', Plante: '#55b85f',
  'Électrik': '#f2c53d', Roche: '#b49a6a', Sol: '#d9a441', Vol: '#8ecae6',
  Psy: '#e26d9f', Ténèbres: '#6b5b95', Dragon: '#7b5cc4', Fée: '#f4a6c8',
  Acier: '#93a4b8', Combat: '#c1440e'
}

export const TYPE_ICONS = {
  Normal: '✦', Feu: '🔥', Eau: '💧', Plante: '🌿', 'Électrik': '⚡', Roche: '🪨',
  Sol: '⛱', Vol: '🪶', Psy: '🌀', Ténèbres: '🌙', Dragon: '🐉', Fée: '✿',
  Acier: '⚙', Combat: '✊'
}

// attacker type -> defender type -> multiplier
export const TYPE_CHART = {
  Feu: { Plante: 2, Acier: 2, Eau: .5, Roche: .5, Dragon: .5, Feu: .5 },
  Eau: { Feu: 2, Roche: 2, Sol: 2, Plante: .5, Eau: .5, Dragon: .5 },
  Plante: { Eau: 2, Roche: 2, Sol: 2, Feu: .5, Plante: .5, Vol: .5, Dragon: .5, Acier: .5 },
  'Électrik': { Eau: 2, Vol: 2, Plante: .5, 'Électrik': .5, Dragon: .5, Sol: 0 },
  Roche: { Feu: 2, Vol: 2, Combat: .5, Sol: .5, Acier: .5 },
  Sol: { Feu: 2, 'Électrik': 2, Roche: 2, Acier: 2, Plante: .5, Vol: 0 },
  Vol: { Plante: 2, Combat: 2, 'Électrik': .5, Roche: .5, Acier: .5 },
  Psy: { Combat: 2, Psy: .5, Ténèbres: 0, Acier: .5 },
  Ténèbres: { Psy: 2, Combat: .5, Ténèbres: .5, Fée: .5 },
  Dragon: { Dragon: 2, Acier: .5, Fée: 0 },
  Fée: { Dragon: 2, Ténèbres: 2, Combat: 2, Feu: .5, Acier: .5 },
  Acier: { Roche: 2, Fée: 2, Feu: .5, Eau: .5, 'Électrik': .5, Acier: .5 },
  Combat: { Normal: 2, Roche: 2, Acier: 2, Ténèbres: 2, Vol: .5, Psy: .5, Fée: .5 },
  Normal: { Roche: .5, Acier: .5 }
}

export const MOVES = {
  charge: { name: 'Charge', type: 'Normal', cat: 'phys', power: 40, acc: 100, pp: 35, desc: 'Une charge pleine d’élan.' },
  griffe: { name: 'Griffe', type: 'Normal', cat: 'phys', power: 45, acc: 100, pp: 35, desc: 'Lacère l’adversaire avec ses griffes.' },
  vive_attaque: { name: 'Vive-Attaque', type: 'Normal', cat: 'phys', power: 40, acc: 100, pp: 30, priority: 1, desc: 'Frappe toujours en premier.' },
  rugissement: { name: 'Rugissement', type: 'Normal', cat: 'status', power: 0, acc: 100, pp: 20, stat: 'atk', stages: -1, desc: 'Baisse l’Attaque adverse.' },
  jet_sable: { name: 'Jet de Sable', type: 'Sol', cat: 'phys', power: 45, acc: 95, pp: 25, desc: 'Projette un jet de sable brûlant.' },
  morsure: { name: 'Morsure', type: 'Ténèbres', cat: 'phys', power: 60, acc: 100, pp: 25, desc: 'Une morsure qui peut apeurer.' },
  eboulement: { name: 'Éboulement', type: 'Roche', cat: 'phys', power: 75, acc: 90, pp: 10, desc: 'Fait tomber un déluge de rochers.' },
  seisme: { name: 'Séisme', type: 'Sol', cat: 'phys', power: 90, acc: 100, pp: 10, desc: 'Secoue le sol de toute sa force.' },
  dracosouffle: { name: 'Draco-Souffle', type: 'Dragon', cat: 'spec', power: 60, acc: 100, pp: 20, desc: 'Un souffle venu des anciens dragons.' },
  draco_meteore: { name: 'Draco-Météore', type: 'Dragon', cat: 'spec', power: 100, acc: 90, pp: 5, desc: 'Appelle une pluie d’étoiles draconiques.' },
  flammeche: { name: 'Flammèche', type: 'Feu', cat: 'spec', power: 45, acc: 100, pp: 25, effect: { status: 'brulure', chance: 10 }, desc: 'Une petite flamme peut tout embraser.' },
  lance_flammes: { name: 'Lance-Flammes', type: 'Feu', cat: 'spec', power: 85, acc: 100, pp: 10, effect: { status: 'brulure', chance: 10 }, desc: 'Un torrent de feu intense.' },
  crocs_feu: { name: 'Crocs-Feu', type: 'Feu', cat: 'phys', power: 65, acc: 95, pp: 15, effect: { status: 'brulure', chance: 15 }, desc: 'Des crocs chauffés à blanc.' },
  bulles: { name: 'Bulles d’Oasis', type: 'Eau', cat: 'spec', power: 45, acc: 100, pp: 25, desc: 'Projette des bulles étincelantes.' },
  hydrocanon: { name: 'Hydrocanon', type: 'Eau', cat: 'spec', power: 90, acc: 90, pp: 5, desc: 'Un jet d’eau à haute pression.' },
  pistolet_o: { name: 'Pistolet à O', type: 'Eau', cat: 'spec', power: 40, acc: 100, pp: 30, desc: 'Un mince filet d’eau.' },
  fouet_liane: { name: 'Fouet Liane', type: 'Plante', cat: 'phys', power: 45, acc: 100, pp: 25, desc: 'Frappe avec des lianes souples.' },
  tempete_verte: { name: 'Tempête Verte', type: 'Plante', cat: 'spec', power: 85, acc: 90, pp: 10, desc: 'Un ouragan de feuilles tranchantes.' },
  vampigraine: { name: 'Vampigraine', type: 'Plante', cat: 'spec', power: 55, acc: 100, pp: 15, drain: .5, desc: 'Draine l’énergie de l’adversaire.' },
  etincelle: { name: 'Étincelle', type: 'Électrik', cat: 'phys', power: 45, acc: 100, pp: 25, effect: { status: 'paralysie', chance: 30 }, desc: 'Une décharge rapide et crépitante.' },
  tonnerre: { name: 'Tonnerre', type: 'Électrik', cat: 'spec', power: 85, acc: 90, pp: 10, effect: { status: 'paralysie', chance: 20 }, desc: 'Un éclair fracassant.' },
  cage_eclair: { name: 'Cage-Éclair', type: 'Électrik', cat: 'status', power: 0, acc: 90, pp: 20, effect: { status: 'paralysie', chance: 100 }, desc: 'Paralyse l’adversaire.' },
  tornade: { name: 'Tornade', type: 'Vol', cat: 'spec', power: 45, acc: 100, pp: 30, desc: 'Un tourbillon de vent sec.' },
  aeropique: { name: 'Aéropique', type: 'Vol', cat: 'phys', power: 80, acc: 100, pp: 15, desc: 'Frappe du haut du ciel.' },
  atterrissage: { name: 'Atterrissage', type: 'Vol', cat: 'status', power: 0, acc: 100, pp: 10, heal: .5, desc: 'Se pose et récupère des PV.' },
  choc_mental: { name: 'Choc Mental', type: 'Psy', cat: 'spec', power: 50, acc: 100, pp: 25, desc: 'Une onde mentale déstabilisante.' },
  psyko: { name: 'Psyko', type: 'Psy', cat: 'spec', power: 90, acc: 100, pp: 10, desc: 'Une pression psychique écrasante.' },
  hypnose: { name: 'Hypnose', type: 'Psy', cat: 'status', power: 0, acc: 60, pp: 15, effect: { status: 'sommeil', chance: 100 }, desc: 'Endort l’adversaire.' },
  soin: { name: 'Soin', type: 'Psy', cat: 'status', power: 0, acc: 100, pp: 10, heal: .5, desc: 'Récupère la moitié de ses PV.' },
  griffe_ombre: { name: 'Griffe Ombre', type: 'Ténèbres', cat: 'phys', power: 75, acc: 100, pp: 15, desc: 'Une griffe faite d’ombre pure.' },
  machination: { name: 'Machination', type: 'Ténèbres', cat: 'status', power: 0, acc: 100, pp: 20, stat: 'spa', stages: 1, desc: 'Augmente l’Attaque Spéciale.' },
  eclat_feerique: { name: 'Éclat Féerique', type: 'Fée', cat: 'spec', power: 70, acc: 100, pp: 15, desc: 'Une lumière féerique aveuglante.' },
  voeu: { name: 'Vœu', type: 'Fée', cat: 'status', power: 0, acc: 100, pp: 10, heal: .5, desc: 'Un vœu qui restaure des PV.' },
  queue_fer: { name: 'Queue de Fer', type: 'Acier', cat: 'phys', power: 80, acc: 90, pp: 15, desc: 'Une queue dure comme l’acier.' },
  canon_laser: { name: 'Canon Laser', type: 'Acier', cat: 'spec', power: 85, acc: 95, pp: 10, desc: 'Un rayon d’acier poli.' },
  poing_combat: { name: 'Poing Combat', type: 'Combat', cat: 'phys', power: 75, acc: 100, pp: 15, desc: 'Un direct chargé d’énergie.' },
  balayage: { name: 'Balayage', type: 'Combat', cat: 'phys', power: 55, acc: 100, pp: 20, desc: 'Un croc-en-jambe sec.' },
  danse_lames: { name: 'Danse-Lames', type: 'Normal', cat: 'status', power: 0, acc: 100, pp: 20, stat: 'atk', stages: 2, desc: 'Augmente fortement l’Attaque.' },
  abri: { name: 'Abri', type: 'Normal', cat: 'status', power: 0, acc: 100, pp: 10, protect: true, desc: 'Bloque la prochaine attaque.' },
  venin: { name: 'Venin', type: 'Ténèbres', cat: 'status', power: 0, acc: 90, pp: 15, effect: { status: 'poison', chance: 100 }, desc: 'Empoisonne l’adversaire.' }
}

export const SPECIES = {
  sablion: {
    id: 'sablion', name: 'Sablion', types: ['Sol'], catchRate: 190, xpYield: 64,
    base: { hp: 45, atk: 55, def: 44, spa: 35, spd: 40, spe: 56 },
    evolve: { level: 16, to: 'dunesire' },
    desc: 'Un lionceau de sable qui dort dans les dunes chaudes. Il ronronne comme une tempête.',
    art: { kind: 'beast', body: '#d9b46b', belly: '#f4e4b8', accent: '#8a5b2e', eye: '#2b2118', ears: 'round', tail: 'tuft', horn: 'none' },
    learnset: [[1, 'griffe'], [1, 'jet_sable'], [7, 'rugissement'], [12, 'morsure'], [18, 'eboulement'], [24, 'seisme'], [30, 'draco_meteore']]
  },
  dunesire: {
    id: 'dunesire', name: 'Dunesire', types: ['Sol'], catchRate: 90, xpYield: 142,
    base: { hp: 64, atk: 78, def: 66, spa: 50, spd: 58, spe: 72 },
    evolve: { level: 34, to: 'pharaos' },
    desc: 'Sa crinière retient les mirages. On dit qu’il guide les voyageurs perdus.',
    art: { kind: 'beast', body: '#c99a52', belly: '#f0d9a4', accent: '#6d4420', eye: '#e9b949', ears: 'pointed', tail: 'tuft', horn: 'none', mane: true },
    learnset: [[1, 'jet_sable'], [1, 'morsure'], [1, 'rugissement'], [16, 'eboulement'], [22, 'seisme'], [28, 'dracosouffle'], [36, 'draco_meteore']]
  },
  pharaos: {
    id: 'pharaos', name: 'Pharaos', types: ['Sol', 'Dragon'], catchRate: 45, xpYield: 240,
    base: { hp: 86, atk: 104, def: 88, spa: 72, spd: 80, spe: 92 },
    desc: 'Le gardien des cités ensevelies. Son rugissement fait trembler les pyramides.',
    art: { kind: 'beast', body: '#b9863f', belly: '#f2d99a', accent: '#4d2f16', eye: '#ffd166', ears: 'pointed', tail: 'tuft', horn: 'crown', mane: true, spikes: 3 },
    learnset: [[1, 'seisme'], [1, 'eboulement'], [1, 'draco_meteore'], [34, 'danse_lames'], [40, 'queue_fer'], [46, 'draco_meteore']]
  },
  flamby: {
    id: 'flamby', name: 'Flamby', types: ['Feu'], catchRate: 190, xpYield: 64,
    base: { hp: 44, atk: 52, def: 40, spa: 60, spd: 50, spe: 60 },
    evolve: { level: 16, to: 'pyrofel' },
    desc: 'Un chaton de braise. La flamme de sa queue change de couleur selon son humeur.',
    art: { kind: 'cat', body: '#e88a4b', belly: '#ffe0b2', accent: '#9e3d1e', eye: '#3d1f12', ears: 'pointed', tail: 'flame', horn: 'none' },
    learnset: [[1, 'griffe'], [1, 'flammeche'], [7, 'rugissement'], [12, 'crocs_feu'], [18, 'lance_flammes'], [24, 'machination'], [30, 'draco_meteore']]
  },
  pyrofel: {
    id: 'pyrofel', name: 'Pyrofel', types: ['Feu'], catchRate: 90, xpYield: 142,
    base: { hp: 62, atk: 70, def: 58, spa: 84, spd: 66, spe: 82 },
    evolve: { level: 34, to: 'cendragon' },
    desc: 'Ses pas laissent des traces de cendre chaude. Il veille sur les forges de Cendrelac.',
    art: { kind: 'cat', body: '#d96a32', belly: '#ffd08a', accent: '#6f2412', eye: '#ffd166', ears: 'pointed', tail: 'flame', horn: 'none', stripes: true },
    learnset: [[1, 'flammeche'], [1, 'crocs_feu'], [1, 'machination'], [16, 'lance_flammes'], [22, 'griffe_ombre'], [28, 'dracosouffle'], [36, 'draco_meteore']]
  },
  cendragon: {
    id: 'cendragon', name: 'Cendragon', types: ['Feu', 'Dragon'], catchRate: 45, xpYield: 240,
    base: { hp: 84, atk: 96, def: 78, spa: 110, spd: 84, spe: 94 },
    desc: 'Un dragon de cendre et de lave. Son souffle rallume les volcans éteints.',
    art: { kind: 'dragon', body: '#b84c2c', belly: '#ffb066', accent: '#4a160d', eye: '#ffe08a', ears: 'horned', tail: 'flame', horn: 'horns', wings: 'ember', spikes: 4 },
    learnset: [[1, 'lance_flammes'], [1, 'crocs_feu'], [1, 'draco_meteore'], [34, 'machination'], [40, 'aeropique'], [46, 'draco_meteore']]
  },
  aquilon: {
    id: 'aquilon', name: 'Aquilon', types: ['Eau'], catchRate: 190, xpYield: 64,
    base: { hp: 50, atk: 48, def: 48, spa: 58, spd: 54, spe: 52 },
    evolve: { level: 16, to: 'torrentis' },
    desc: 'Un petit esprit des oasis. Il porte une goutte d’eau pure sur son front.',
    art: { kind: 'fish', body: '#4b9ee8', belly: '#c9efff', accent: '#1d5c9e', eye: '#0b2239', ears: 'fins', tail: 'fin', horn: 'drop' },
    learnset: [[1, 'charge'], [1, 'bulles'], [7, 'rugissement'], [12, 'pistolet_o'], [18, 'hydrocanon'], [24, 'atterrissage'], [30, 'draco_meteore']]
  },
  torrentis: {
    id: 'torrentis', name: 'Torrentis', types: ['Eau'], catchRate: 90, xpYield: 142,
    base: { hp: 70, atk: 62, def: 66, spa: 82, spd: 70, spe: 72 },
    evolve: { level: 34, to: 'abyssal' },
    desc: 'Il chevauche les vagues des lagunes. Les marins le prennent pour une bénédiction.',
    art: { kind: 'fish', body: '#3d82d6', belly: '#b9e8ff', accent: '#154575', eye: '#e9fbff', ears: 'fins', tail: 'fin', horn: 'crest', fins: true },
    learnset: [[1, 'bulles'], [1, 'pistolet_o'], [1, 'atterrissage'], [16, 'hydrocanon'], [22, 'choc_mental'], [28, 'dracosouffle'], [36, 'draco_meteore']]
  },
  abyssal: {
    id: 'abyssal', name: 'Abyssal', types: ['Eau', 'Dragon'], catchRate: 45, xpYield: 240,
    base: { hp: 92, atk: 82, def: 88, spa: 104, spd: 92, spe: 84 },
    desc: 'Le seigneur des profondeurs claires. Son chant calme les tempêtes.',
    art: { kind: 'dragon', body: '#2466b8', belly: '#a9e4ff', accent: '#0b2d5c', eye: '#b8f5ff', ears: 'fins', tail: 'fin', horn: 'crest', wings: 'fin', spikes: 3 },
    learnset: [[1, 'hydrocanon'], [1, 'draco_meteore'], [1, 'atterrissage'], [34, 'psyko'], [40, 'aeropique'], [46, 'draco_meteore']]
  },
  verdillon: {
    id: 'verdillon', name: 'Verdillon', types: ['Plante'], catchRate: 170, xpYield: 66,
    base: { hp: 55, atk: 50, def: 60, spa: 62, spd: 62, spe: 38 },
    evolve: { level: 18, to: 'floramax' },
    desc: 'Une jeune pousse qui rêve de devenir un grand arbre. Elle adore la rosée.',
    art: { kind: 'plant', body: '#6fbf62', belly: '#d9f2a8', accent: '#2f6b32', eye: '#21351a', ears: 'leaf', tail: 'leaf', horn: 'sprout' },
    learnset: [[1, 'charge'], [1, 'fouet_liane'], [8, 'vampigraine'], [14, 'voeu'], [20, 'tempete_verte'], [28, 'psyko'], [36, 'draco_meteore']]
  },
  floramax: {
    id: 'floramax', name: 'Floramax', types: ['Plante', 'Fée'], catchRate: 80, xpYield: 156,
    base: { hp: 82, atk: 68, def: 84, spa: 92, spd: 92, spe: 54 },
    desc: 'Une fleur géante qui embaume toute une vallée. Ses pétales guérissent les blessures.',
    art: { kind: 'plant', body: '#5aa952', belly: '#e6f7b8', accent: '#7a3c7a', eye: '#f2e9ff', ears: 'leaf', tail: 'leaf', horn: 'bloom', bloom: true },
    learnset: [[1, 'vampigraine'], [1, 'tempete_verte'], [1, 'voeu'], [18, 'eclat_feerique'], [24, 'psyko'], [32, 'draco_meteore']]
  },
  voltiz: {
    id: 'voltiz', name: 'Voltiz', types: ['Électrik'], catchRate: 150, xpYield: 70,
    base: { hp: 45, atk: 50, def: 42, spa: 68, spd: 50, spe: 84 },
    evolve: { level: 20, to: 'orageon' },
    desc: 'Une étincelle vivante. Il se cache dans les nuages bas des plateaux.',
    art: { kind: 'orb', body: '#f2c53d', belly: '#fff3b0', accent: '#9a6a0b', eye: '#2b2118', ears: 'spark', tail: 'bolt', horn: 'bolt' },
    learnset: [[1, 'etincelle'], [1, 'vive_attaque'], [8, 'cage_eclair'], [14, 'tornade'], [20, 'tonnerre'], [28, 'aeropique'], [36, 'draco_meteore']]
  },
  orageon: {
    id: 'orageon', name: 'Orageon', types: ['Électrik', 'Vol'], catchRate: 70, xpYield: 170,
    base: { hp: 68, atk: 66, def: 58, spa: 98, spd: 72, spe: 104 },
    desc: 'Il chevauche les orages. Un battement d’ailes suffit à allumer une ville.',
    art: { kind: 'bird', body: '#e9b62f', belly: '#fff0a8', accent: '#6f4b05', eye: '#1b2230', ears: 'spark', tail: 'bolt', horn: 'bolt', wings: 'storm' },
    learnset: [[1, 'cage_eclair'], [1, 'tonnerre'], [1, 'tornade'], [20, 'aeropique'], [26, 'machination'], [34, 'draco_meteore']]
  },
  noctule: {
    id: 'noctule', name: 'Noctule', types: ['Ténèbres', 'Vol'], catchRate: 150, xpYield: 72,
    base: { hp: 50, atk: 62, def: 46, spa: 52, spd: 48, spe: 78 },
    evolve: { level: 22, to: 'nyxar' },
    desc: 'Un petit noctambule des ports. Il collectionne les reflets de lune.',
    art: { kind: 'bat', body: '#5b4b8a', belly: '#b9a8e8', accent: '#241b45', eye: '#f4d35e', ears: 'bat', tail: 'none', horn: 'none', wings: 'bat' },
    learnset: [[1, 'morsure'], [1, 'tornade'], [9, 'griffe_ombre'], [15, 'machination'], [21, 'aeropique'], [28, 'venin'], [36, 'draco_meteore']]
  },
  nyxar: {
    id: 'nyxar', name: 'Nyxar', types: ['Ténèbres', 'Vol'], catchRate: 60, xpYield: 180,
    base: { hp: 74, atk: 92, def: 64, spa: 74, spd: 66, spe: 98 },
    desc: 'Le veilleur des nuits sans lune. Son ombre a des ailes.',
    art: { kind: 'bat', body: '#43346e', belly: '#a58ad6', accent: '#160f2b', eye: '#ffd166', ears: 'bat', tail: 'none', horn: 'horns', wings: 'bat', spikes: 2 },
    learnset: [[1, 'griffe_ombre'], [1, 'aeropique'], [1, 'machination'], [22, 'venin'], [30, 'psyko'], [38, 'draco_meteore']]
  },
  rocaille: {
    id: 'rocaille', name: 'Rocaille', types: ['Roche'], catchRate: 180, xpYield: 60,
    base: { hp: 58, atk: 66, def: 82, spa: 30, spd: 44, spe: 28 },
    evolve: { level: 22, to: 'colossite' },
    desc: 'Un caillou qui roule, puis qui mord. Très susceptible quand on le prend pour un galet.',
    art: { kind: 'rock', body: '#a98e62', belly: '#d8c49a', accent: '#5c4a2e', eye: '#2b2118', ears: 'rock', tail: 'none', horn: 'rock' },
    learnset: [[1, 'charge'], [1, 'jet_sable'], [9, 'rugissement'], [15, 'eboulement'], [22, 'queue_fer'], [30, 'seisme']]
  },
  colossite: {
    id: 'colossite', name: 'Colossite', types: ['Roche', 'Acier'], catchRate: 70, xpYield: 168,
    base: { hp: 88, atk: 98, def: 122, spa: 44, spd: 70, spe: 34 },
    desc: 'Une forteresse ambulante. Les anciens Templiers gravaient leurs serments sur son dos.',
    art: { kind: 'rock', body: '#8d7a58', belly: '#c8b68c', accent: '#3d3221', eye: '#ffd166', ears: 'rock', tail: 'none', horn: 'rock', spikes: 4, armor: true },
    learnset: [[1, 'eboulement'], [1, 'queue_fer'], [1, 'rugissement'], [22, 'seisme'], [28, 'canon_laser'], [36, 'draco_meteore']]
  },
  psykor: {
    id: 'psykor', name: 'Psykor', types: ['Psy'], catchRate: 140, xpYield: 74,
    base: { hp: 52, atk: 40, def: 48, spa: 82, spd: 68, spe: 62 },
    evolve: { level: 24, to: 'oraclem' },
    desc: 'Il lit les rêves dans le sable. Ses yeux brillent quand une tempête approche.',
    art: { kind: 'orb', body: '#b07ad6', belly: '#ead6ff', accent: '#4d2b6b', eye: '#fff3b0', ears: 'none', tail: 'none', horn: 'eye', aura: '#c77dff' },
    learnset: [[1, 'choc_mental'], [1, 'voeu'], [9, 'hypnose'], [15, 'psyko'], [22, 'machination'], [30, 'draco_meteore']]
  },
  oraclem: {
    id: 'oraclem', name: 'Oraclem', types: ['Psy', 'Fée'], catchRate: 50, xpYield: 190,
    base: { hp: 76, atk: 52, def: 70, spa: 112, spd: 98, spe: 78 },
    desc: 'Un oracle flottant. Il prédit les tempêtes de sable trois lunes à l’avance.',
    art: { kind: 'orb', body: '#9a63c7', belly: '#f0ddff', accent: '#3b1e55', eye: '#ffffff', ears: 'none', tail: 'none', horn: 'eye', aura: '#e0aaff', bloom: true, spikes: 2 },
    learnset: [[1, 'psyko'], [1, 'voeu'], [1, 'hypnose'], [24, 'eclat_feerique'], [32, 'tonnerre'], [40, 'draco_meteore']]
  },
  pixie: {
    id: 'pixie', name: 'Pixie', types: ['Fée'], catchRate: 170, xpYield: 62,
    base: { hp: 48, atk: 38, def: 44, spa: 68, spd: 64, spe: 66 },
    evolve: { level: 20, to: 'sylfee' },
    desc: 'Une poussière d’étoile tombée dans une oasis. Elle rit dans le vent.',
    art: { kind: 'fairy', body: '#f4a6c8', belly: '#ffe3f0', accent: '#b44d7e', eye: '#4d1f33', ears: 'fairy', tail: 'none', horn: 'star', wings: 'fairy' },
    learnset: [[1, 'charge'], [1, 'eclat_feerique'], [9, 'voeu'], [15, 'tornade'], [21, 'psyko'], [28, 'draco_meteore']]
  },
  sylfee: {
    id: 'sylfee', name: 'Sylfée', types: ['Fée', 'Vol'], catchRate: 65, xpYield: 174,
    base: { hp: 70, atk: 52, def: 62, spa: 96, spd: 88, spe: 96 },
    desc: 'La gardienne des mirages. Ses ailes laissent une traînée de lumière rose.',
    art: { kind: 'fairy', body: '#ef8fba', belly: '#ffe3f0', accent: '#8e3160', eye: '#ffffff', ears: 'fairy', tail: 'none', horn: 'star', wings: 'fairy', bloom: true },
    learnset: [[1, 'eclat_feerique'], [1, 'voeu'], [1, 'tornade'], [20, 'psyko'], [28, 'aeropique'], [36, 'draco_meteore']]
  },
  draconis: {
    id: 'draconis', name: 'Draconis', types: ['Dragon'], catchRate: 120, xpYield: 86,
    base: { hp: 62, atk: 78, def: 62, spa: 62, spd: 58, spe: 66 },
    evolve: { level: 30, to: 'drakonar' },
    desc: 'Un dragonnet des canyons. Il apprend la patience en comptant les étoiles.',
    art: { kind: 'dragon', body: '#6f8fd6', belly: '#d6e4ff', accent: '#2b3f75', eye: '#ffe08a', ears: 'horned', tail: 'spike', horn: 'horns', wings: 'small' },
    learnset: [[1, 'griffe'], [1, 'dracosouffle'], [10, 'morsure'], [16, 'aeropique'], [24, 'poing_combat'], [32, 'draco_meteore']]
  },
  drakonar: {
    id: 'drakonar', name: 'Drakonar', types: ['Dragon', 'Combat'], catchRate: 45, xpYield: 220,
    base: { hp: 88, atk: 116, def: 84, spa: 80, spd: 74, spe: 92 },
    desc: 'Un chevalier-dragon. Il ne recule jamais, même face aux tempêtes de sable.',
    art: { kind: 'dragon', body: '#5474bf', belly: '#c9dbff', accent: '#1e2f5c', eye: '#ffd166', ears: 'horned', tail: 'spike', horn: 'horns', wings: 'small', spikes: 4, armor: true },
    learnset: [[1, 'dracosouffle'], [1, 'poing_combat'], [1, 'aeropique'], [30, 'danse_lames'], [38, 'draco_meteore'], [46, 'seisme']]
  },
  templion: {
    id: 'templion', name: 'Templion', types: ['Acier', 'Fée'], catchRate: 30, xpYield: 210,
    base: { hp: 84, atk: 92, def: 100, spa: 84, spd: 92, spe: 74 },
    desc: 'Le gardien forgé dans le sable et l’or. Il porte le serment des anciens Templiers.',
    art: { kind: 'templar', body: '#d9b45c', belly: '#f7e6b0', accent: '#6b4a18', eye: '#3ddad7', ears: 'helm', tail: 'cape', horn: 'crown', spikes: 3, armor: true, aura: '#f0c96b' },
    mega: { name: 'Méga-Templion', types: ['Acier', 'Dragon'], boost: 1.35, art: { kind: 'templar', body: '#f0c96b', belly: '#fff3c4', accent: '#7a4f12', eye: '#7df9ff', ears: 'helm', tail: 'cape', horn: 'crown', spikes: 5, armor: true, aura: '#7df9ff', wings: 'gold' }, desc: 'Le serment s’embrase. Méga-Templion devient un dragon d’or et de lumière.' },
    learnset: [[1, 'queue_fer'], [1, 'eclat_feerique'], [1, 'rugissement'], [1, 'voeu'], [20, 'canon_laser'], [28, 'poing_combat'], [36, 'draco_meteore'], [44, 'seisme']]
  },
  latias: {
    id: 'latias', name: 'Latias', types: ['Dragon', 'Psy'], catchRate: 3, xpYield: 300,
    base: { hp: 80, atk: 80, def: 90, spa: 110, spd: 130, spe: 110 },
    desc: 'L’esprit bienveillant des vents du sud. Elle se cache dans les mirages et protège les voyageurs.',
    art: { kind: 'legend', body: '#e4572e', belly: '#f7d9c4', accent: '#7a1f12', eye: '#ffd166', ears: 'fins', tail: 'fin', horn: 'crest', wings: 'jet', aura: '#ff8a65' },
    learnset: [[1, 'psyko'], [1, 'dracosouffle'], [1, 'voeu'], [1, 'aeropique'], [30, 'draco_meteore'], [40, 'tonnerre']]
  },
  latios: {
    id: 'latios', name: 'Latios', types: ['Dragon', 'Psy'], catchRate: 3, xpYield: 300,
    base: { hp: 80, atk: 90, def: 80, spa: 130, spd: 110, spe: 110 },
    desc: 'Le frère des vents. Son cœur est un cristal qui montre le chemin aux égarés.',
    art: { kind: 'legend', body: '#3a86ff', belly: '#d6e9ff', accent: '#123b75', eye: '#ffe08a', ears: 'fins', tail: 'fin', horn: 'crest', wings: 'jet', aura: '#64b5f6' },
    learnset: [[1, 'psyko'], [1, 'dracosouffle'], [1, 'machination'], [1, 'aeropique'], [30, 'draco_meteore'], [40, 'tonnerre']]
  },
  rayquaza: {
    id: 'rayquaza', name: 'Rayquaza', types: ['Dragon', 'Vol'], catchRate: 2, xpYield: 400,
    base: { hp: 105, atk: 150, def: 90, spa: 150, spd: 90, spe: 95 },
    desc: 'Le serpent du ciel. Il dort au-dessus des nuages et juge les serments des hommes.',
    art: { kind: 'legend', body: '#3fae6a', belly: '#d8f5c4', accent: '#14522e', eye: '#ffe066', ears: 'fins', tail: 'serpent', horn: 'crest', wings: 'serpent', aura: '#6ee7b7' },
    learnset: [[1, 'draco_meteore'], [1, 'aeropique'], [1, 'tonnerre'], [1, 'seisme'], [40, 'danse_lames']]
  }
}

export const STARTERS = [
  { id: 'sablion', label: 'Sablion', tagline: 'Le courage des dunes', desc: 'Équilibré et fidèle. Un compagnon qui ne recule pas.' },
  { id: 'flamby', label: 'Flamby', tagline: 'La flamme de l’oasis', desc: 'Offensif et vif. Idéal pour frapper fort et vite.' },
  { id: 'aquilon', label: 'Aquilon', tagline: 'Le souffle des mers', desc: 'Endurant et malin. Il trouve toujours une ouverture.' }
]

export const ITEMS = {
  potion: { name: 'Potion', icon: '🧪', price: 200, heal: 20, desc: 'Restaure 20 PV à un Pokémon.' },
  super_potion: { name: 'Super Potion', icon: '⚗️', price: 500, heal: 60, desc: 'Restaure 60 PV à un Pokémon.' },
  hyper_potion: { name: 'Hyper Potion', icon: '🧴', price: 1200, heal: 140, desc: 'Restaure 140 PV à un Pokémon.' },
  rappel: { name: 'Rappel', icon: '🪶', price: 900, revive: .5, desc: 'Ranime un Pokémon K.O. avec la moitié de ses PV.' },
  sable_ball: { name: 'Sable Ball', icon: '🔮', price: 150, catch: 1, desc: 'Une sphère de verre poli. Taux de capture standard.' },
  grande_ball: { name: 'Grande Sable Ball', icon: '🟡', price: 400, catch: 1.5, desc: 'Une sphère dorée. Meilleur taux de capture.' },
  templier_ball: { name: 'Templier Ball', icon: '⚜️', price: 1200, catch: 2.5, desc: 'Forgée pour les légendes. Excellent taux de capture.' },
  antidote: { name: 'Antidote', icon: '💊', price: 150, cure: true, desc: 'Soigne les altérations de statut.' }
}

export const BADGES = [
  { id: 'sable', name: 'Badge du Sable', color: '#d9a441', glyph: '◆' },
  { id: 'courage', name: 'Badge du Courage', color: '#e4572e', glyph: '✦' },
  { id: 'seve', name: 'Badge de la Sève', color: '#55b85f', glyph: '❖' },
  { id: 'braise', name: 'Badge de la Braise', color: '#ef6b3b', glyph: '🔥' },
  { id: 'maree', name: 'Badge de la Marée', color: '#4b8ef7', glyph: '≈' },
  { id: 'orage', name: 'Badge de l’Orage', color: '#f2c53d', glyph: '⚡' },
  { id: 'ombre', name: 'Badge de l’Ombre', color: '#6b5b95', glyph: '☾' },
  { id: 'cime', name: 'Badge de la Cime', color: '#b9a8e8', glyph: '✧' }
]

const mkTeam = arr => arr.map(([species, level]) => ({ species, level }))

export const LEADERS = {
  nera: {
    id: 'nera', name: 'Dame Néra', title: 'Gardienne du Sable', type: 'Roche', color: '#b49a6a',
    team: mkTeam([['rocaille', 7], ['sablion', 9]]),
    intro: 'Le sable se souvient de tous ceux qui le foulent. Montre-moi ce que tu vaux, jeune dresseur.',
    defeat: 'Tu as la patience des dunes. Ce badge est à toi.',
    quote: 'Reviens quand tu auras appris à écouter le désert.',
    avatar: { skin: '#8a5a3b', hair: '#2b2118', style: 'bun', outfit: '#8a5b2e', accent: '#d9a441' }
  },
  blue: {
    id: 'blue', name: 'Blue', title: 'Champion d’Oubar', type: 'Normal', color: '#4b8ef7',
    team: mkTeam([['aquilon', 13], ['voltiz', 13], ['draconis', 15]]),
    intro: 'Oubar n’est pas une halte, c’est une épreuve. Red et moi, on t’attend au sommet.',
    defeat: 'Pas mal. Red va vouloir tester ça. Il est derrière l’arène.',
    quote: 'La victoire, c’est bien. La surpasser, c’est mieux.',
    avatar: { skin: '#e8c39e', hair: '#7a4a22', style: 'spiky', outfit: '#2f5f9e', accent: '#f0c96b' }
  },
  flora: {
    id: 'flora', name: 'Flora', title: 'Voix de l’Oasis', type: 'Plante', color: '#55b85f',
    team: mkTeam([['verdillon', 18], ['pixie', 19], ['floramax', 20]]),
    intro: 'Chaque graine est une promesse. Voyons si la tienne peut fleurir.',
    defeat: 'Ta force a des racines profondes. Porte ce badge avec humilité.',
    quote: 'Même le sable le plus sec cache une graine.',
    avatar: { skin: '#d9a47a', hair: '#3f6b3a', style: 'long', outfit: '#3f8a4a', accent: '#f4a6c8' }
  },
  ignis: {
    id: 'ignis', name: 'Ignis', title: 'Forgeron de Cendrelac', type: 'Feu', color: '#ef6b3b',
    team: mkTeam([['flamby', 24], ['rocaille', 25], ['pyrofel', 26]]),
    intro: 'Le feu ne se dompte pas. Il se respecte. Montre-moi que ton cœur ne fond pas.',
    defeat: 'Ha ! Voilà une flamme qui mérite la forge. Ce badge est à toi.',
    quote: 'On ne forge pas l’acier sans le feu.',
    avatar: { skin: '#c98a5a', hair: '#b84c2c', style: 'short', outfit: '#7a2e1e', accent: '#f2c53d' }
  },
  marina: {
    id: 'marina', name: 'Marina', title: 'Dame des Marées', type: 'Eau', color: '#4b8ef7',
    team: mkTeam([['aquilon', 30], ['voltiz', 31], ['torrentis', 32]]),
    intro: 'La mer ne force jamais. Elle contourne, puis elle gagne. Apprends ça.',
    defeat: 'Tu as navigué sans couler. Le badge de la Marée t’appartient.',
    quote: 'Les vagues les plus douces creusent les falaises.',
    avatar: { skin: '#e0b48a', hair: '#1d5c9e', style: 'wavy', outfit: '#2a6f9e', accent: '#8ecae6' }
  },
  volt: {
    id: 'volt', name: 'Volt', title: 'Éclaireur des Cimes', type: 'Électrik', color: '#f2c53d',
    team: mkTeam([['voltiz', 36], ['rocaille', 37], ['orageon', 38]]),
    intro: 'Une seconde d’hésitation, et l’orage t’a déjà dépassé. Es-tu prêt ?',
    defeat: 'Éclairant ! Tu as su rester au sol quand le ciel grondait.',
    quote: 'La foudre ne prévient jamais.',
    avatar: { skin: '#a86b45', hair: '#f2c53d', style: 'mohawk', outfit: '#3b3f5c', accent: '#f2c53d' }
  },
  nyx: {
    id: 'nyx', name: 'Nyx', title: 'Veilleur du Port Noir', type: 'Ténèbres', color: '#6b5b95',
    team: mkTeam([['noctule', 42], ['psykor', 43], ['nyxar', 44]]),
    intro: 'Dans le noir, on ne voit pas ton badge. On voit ton cœur. Montre-le.',
    defeat: 'Tu brilles dans la nuit. L’ombre ne t’a pas avalé.',
    quote: 'La nuit n’est pas vide. Elle est pleine de ce qu’on cache.',
    avatar: { skin: '#6b4b3b', hair: '#241b45', style: 'hood', outfit: '#3b2f5e', accent: '#b9a8e8' }
  },
  aurea: {
    id: 'aurea', name: 'Auréa', title: 'Oracle de la Cime', type: 'Psy', color: '#b9a8e8',
    team: mkTeam([['psykor', 48], ['draconis', 49], ['sylfee', 50], ['oraclem', 51]]),
    intro: 'J’ai vu ce jour dans mes rêves. Mais les rêves ne disent jamais qui gagne. Allons-y.',
    defeat: 'La prophétie s’accomplit. Huit badges. Le sable t’a choisi.',
    quote: 'Le futur est une page, pas une prison.',
    avatar: { skin: '#e8c39e', hair: '#d9d4f0', style: 'long', outfit: '#6b5b95', accent: '#f0c96b' }
  }
}

export const LOCATIONS = {
  sablonville: {
    id: 'sablonville', name: 'Sablonville', subtitle: 'Berceau des Sables', order: 0,
    arena: 'nera', badge: 'sable', type: 'Roche',
    palette: { ground: '#d8bd86', ground2: '#cfb277', path: '#ead7a8', path2: '#dfc894', tree: '#8a6b3a', tree2: '#6b5128', water: '#4f9e9a', water2: '#3b8582', accent: '#c98b3a', sky: '#f5d79b', rock: '#9b8156' },
    wild: [['sablion', 3, 6], ['rocaille', 3, 6], ['pixie', 4, 6]],
    npcs: [
      { id: 'nina', name: 'Nina', x: 9, y: 12, color: '#e26d9f', role: 'child', dialog: ['Le Professeur Sable dit que le monde entier était du sable avant ! Même ma maison ?', 'Il a construit Poke Online MMO avec ses mains. Enfin… avec des câbles et du sable.'], friendable: true },
      { id: 'boris', name: 'Boris', x: 21, y: 13, color: '#4b8ef7', role: 'hiker', dialog: ['Les arènes d’Oubar sont réputées. Blue y entraîne les dresseurs avec Red.', 'Parait qu’ils ne perdent jamais. Enfin, presque.'], friendable: true },
      { id: 'mira', name: 'Mira', x: 6, y: 15, color: '#55b85f', role: 'girl', dialog: ['Tu as vu les îles, au sud de la carte ? Elles ne s’ouvrent qu’à la fin du jeu.', 'Le Professeur dit qu’elles gardent les plus beaux secrets de Templier.'], friendable: true }
    ]
  },
  oubar: {
    id: 'oubar', name: 'Oubar', subtitle: 'Village des Braves', order: 1,
    arena: 'blue', badge: 'courage', type: 'Normal',
    palette: { ground: '#c98e5a', ground2: '#bb7f4e', path: '#e0b47e', path2: '#d4a56e', tree: '#7a5a32', tree2: '#5c421f', water: '#4f8f9a', water2: '#3b7582', accent: '#e4572e', sky: '#f0b56b', rock: '#8a5a3b' },
    wild: [['rocaille', 8, 12], ['sablion', 8, 12], ['noctule', 9, 12]],
    npcs: [
      { id: 'red', name: 'Red', x: 20, y: 7, color: '#e4572e', role: 'champion', dialog: ['...', 'Tu veux t’entraîner ? Je ne parle pas beaucoup. Je frappe.'], trainer: 'red', friendable: true },
      { id: 'lila', name: 'Lila', x: 7, y: 12, color: '#f2c53d', role: 'girl', dialog: ['Blue et Red se sont entraînés ici pendant des années. Leur arène est une légende.', 'Si tu les bats, tu gagneras beaucoup d’expérience !'], friendable: true },
      { id: 'tomas', name: 'Tomas', x: 22, y: 14, color: '#6b5b95', role: 'hiker', dialog: ['L’arène d’Oubar sent la sueur et la victoire. Surtout la sueur.'], friendable: true }
    ]
  },
  verdazur: {
    id: 'verdazur', name: 'Verdazur', subtitle: 'Oasis Vivante', order: 2,
    arena: 'flora', badge: 'seve', type: 'Plante',
    palette: { ground: '#7fb36a', ground2: '#6fa65c', path: '#c9b87a', path2: '#bca96a', tree: '#3f7a3a', tree2: '#2f5c2b', water: '#3d9e9a', water2: '#2f8280', accent: '#55b85f', sky: '#bfe3a0', rock: '#7a8a5a' },
    wild: [['verdillon', 13, 17], ['pixie', 13, 17], ['aquilon', 14, 17]],
    npcs: [
      { id: 'sacha', name: 'Sacha', x: 8, y: 13, color: '#4b8ef7', role: 'boy', dialog: ['Flora parle aux plantes. Enfin, elle leur parle vraiment, et elles répondent.', 'Moi, je parle à mon sandwich. Il ne répond jamais.'], friendable: true },
      { id: 'rose', name: 'Rose', x: 21, y: 11, color: '#f4a6c8', role: 'girl', dialog: ['L’oasis de Verdazur a été plantée par les premiers Templiers. Chaque arbre a un nom.', 'Le plus vieux s’appelle « Patience ». Il a mis trois cents ans à pousser.'], friendable: true }
    ]
  },
  cendrelac: {
    id: 'cendrelac', name: 'Cendrelac', subtitle: 'Le Lac de Braise', order: 3,
    arena: 'ignis', badge: 'braise', type: 'Feu',
    palette: { ground: '#6b4a3a', ground2: '#5c3d2f', path: '#9a6a4a', path2: '#8a5b3b', tree: '#4a2e22', tree2: '#332018', water: '#e4572e', water2: '#b83a1e', accent: '#ef6b3b', sky: '#e08a5a', rock: '#7a4a3a' },
    wild: [['flamby', 18, 22], ['rocaille', 18, 22], ['draconis', 19, 22]],
    npcs: [
      { id: 'bruno', name: 'Bruno', x: 9, y: 14, color: '#e4572e', role: 'hiker', dialog: ['Le lac est fait de lave. Ne t’y baigne pas. J’ai essayé. Je déconseille.', 'Ignis forge des badges dans la lave. Le mien a fondu.'], friendable: true },
      { id: 'clara', name: 'Clara', x: 22, y: 12, color: '#f2c53d', role: 'girl', dialog: ['Au quatrième badge, le Professeur Sable débloque le Bracelet Templier. Tu le savais ?', 'Et les légendes Latias, Latios et Rayquaza se réveillent au Sanctuaire des Vents !'], friendable: true }
    ]
  },
  aquacorde: {
    id: 'aquacorde', name: 'Aquacorde', subtitle: 'Lagune des Reflets', order: 4,
    arena: 'marina', badge: 'maree', type: 'Eau',
    palette: { ground: '#7fb0a0', ground2: '#6fa090', path: '#d8c89a', path2: '#c9b88a', tree: '#3f7a6a', tree2: '#2f5c50', water: '#3d8ed6', water2: '#2f72b8', accent: '#4b8ef7', sky: '#a8d8e8', rock: '#6a8a8a' },
    wild: [['aquilon', 23, 27], ['verdillon', 23, 27], ['voltiz', 24, 27]],
    npcs: [
      { id: 'milo', name: 'Milo', x: 8, y: 12, color: '#4b8ef7', role: 'boy', dialog: ['Marina dit que la mer est une bibliothèque. Chaque vague est une page.', 'Moi, je sais juste nager. C’est déjà pas mal.'], friendable: true },
      { id: 'naia', name: 'Naïa', x: 22, y: 13, color: '#8ecae6', role: 'girl', dialog: ['Les échanges de Pokémon en ligne reprendront le 9 décembre. J’ai hâte !', 'En attendant, on peut s’entraîner contre l’IA de la Ligue. Elle ne triche pas. Trop.'], friendable: true }
    ]
  },
  voltaria: {
    id: 'voltaria', name: 'Voltaria', subtitle: 'Plateau des Orages', order: 5,
    arena: 'volt', badge: 'orage', type: 'Électrik',
    palette: { ground: '#6f7a8a', ground2: '#606a7a', path: '#9aa4b0', path2: '#8a949e', tree: '#3a4a5a', tree2: '#2a3848', water: '#4a6a9a', water2: '#3a5a8a', accent: '#f2c53d', sky: '#8a9ab0', rock: '#5a6472' },
    wild: [['voltiz', 28, 32], ['noctule', 28, 32], ['psykor', 29, 32]],
    npcs: [
      { id: 'gwen', name: 'Gwen', x: 9, y: 13, color: '#f2c53d', role: 'girl', dialog: ['Ici, les parapluies servent de paratonnerres. C’est pratique, mais ça sent le brûlé.', 'Volt a un rire qui ressemble à l’orage. Ça fait peur aux enfants.'], friendable: true },
      { id: 'axel', name: 'Axel', x: 21, y: 14, color: '#6b5b95', role: 'boy', dialog: ['Le Sanctuaire des Vents est visible depuis la cime, les jours sans nuages.', 'Il paraît que Rayquaza y dort depuis mille ans.'], friendable: true }
    ]
  },
  noctemport: {
    id: 'noctemport', name: 'Noctemport', subtitle: 'Port des Ombres', order: 6,
    arena: 'nyx', badge: 'ombre', type: 'Ténèbres',
    palette: { ground: '#3b3550', ground2: '#322c46', path: '#5a5370', path2: '#4d4662', tree: '#241f38', tree2: '#1a1628', water: '#2f4a6a', water2: '#253a55', accent: '#b9a8e8', sky: '#4a3f6a', rock: '#3a3450' },
    wild: [['noctule', 33, 37], ['psykor', 33, 37], ['draconis', 34, 37]],
    npcs: [
      { id: 'ness', name: 'Ness', x: 8, y: 12, color: '#b9a8e8', role: 'girl', dialog: ['Les lampadaires de Noctemport sont allumés par des Pokémon de nuit. Ils sont payés en baies.', 'Nyx ne dort jamais. Enfin, je crois. On ne le voit jamais dormir.'], friendable: true },
      { id: 'gaspard', name: 'Gaspard', x: 22, y: 12, color: '#6b5b95', role: 'hiker', dialog: ['La Ligue en ligne ouvrira après la maintenance. Les rangs vont de Bronze à Légende.', 'Si peu de joueurs sont connectés, l’IA prend le relais. Elle est redoutable.'], friendable: true }
    ]
  },
  cimesacree: {
    id: 'cimesacree', name: 'Cimesacrée', subtitle: 'Sanctuaire des Cimes', order: 7,
    arena: 'aurea', badge: 'cime', type: 'Psy',
    palette: { ground: '#b8b0c8', ground2: '#aaa2ba', path: '#e0d8e8', path2: '#d2cade', tree: '#7a6a8a', tree2: '#5c4d6b', water: '#7aa8c8', water2: '#6a98b8', accent: '#b9a8e8', sky: '#d8d0e8', rock: '#8a7a9a' },
    wild: [['psykor', 38, 42], ['draconis', 38, 42], ['pixie', 39, 42]],
    npcs: [
      { id: 'elio', name: 'Élio', x: 9, y: 13, color: '#b9a8e8', role: 'boy', dialog: ['On dit que la Cime touche le ciel. En vrai, elle touche surtout le froid.', 'Auréa voit l’avenir. Elle m’a dit que je glisserais aujourd’hui. Elle avait raison.'], friendable: true },
      { id: 'soraya', name: 'Soraya', x: 21, y: 13, color: '#f0c96b', role: 'girl', dialog: ['Après le huitième badge, les îles s’ouvrent. L’Île des Épreuves cache huit arènes.', 'Et au-delà, l’Île de la Ligue attend son Maître.'], friendable: true }
    ]
  },
  sanctuaire: {
    id: 'sanctuaire', name: 'Sanctuaire des Vents', subtitle: 'Là où dorment les légendes', order: 8,
    arena: null, badge: null, type: 'Dragon', legendary: true,
    palette: { ground: '#c8b890', ground2: '#baa880', path: '#e8d8b0', path2: '#dccaa0', tree: '#8a7a5a', tree2: '#6a5c42', water: '#5a9ec8', water2: '#4a8ab8', accent: '#7df9ff', sky: '#b8d8e8', rock: '#9a8a6a' },
    wild: [], npcs: []
  },
  ile_epreuves: {
    id: 'ile_epreuves', name: 'Île des Épreuves', subtitle: 'Les Huit Arènes', order: 9,
    arena: null, badge: null, type: 'Or', island: true,
    palette: { ground: '#d8c090', ground2: '#c9b080', path: '#f0e0b8', path2: '#e4d2a8', tree: '#8a7a4a', tree2: '#6a5c32', water: '#3d9ed6', water2: '#2f82b8', accent: '#f0c96b', sky: '#a8d8e8', rock: '#9a8a62' },
    wild: [['draconis', 48, 52], ['sylfee', 48, 52], ['colossite', 49, 52]], npcs: []
  },
  ile_ligue: {
    id: 'ile_ligue', name: 'Île de la Ligue', subtitle: 'Le Maître t’attend', order: 10,
    arena: 'master', badge: null, type: 'Ligue', island: true,
    palette: { ground: '#d8d0c0', ground2: '#c9c0ae', path: '#f0e8d8', path2: '#e4dac8', tree: '#8a8a7a', tree2: '#6a6a5c', water: '#4a8ed6', water2: '#3a78b8', accent: '#f0c96b', sky: '#c8e0f0', rock: '#9a9a8a' },
    wild: [], npcs: []
  }
}

export const LOCATION_ORDER = ['sablonville', 'oubar', 'verdazur', 'cendrelac', 'aquacorde', 'voltaria', 'noctemport', 'cimesacree']

export const ISLAND_TOWER = ['nera', 'blue', 'flora', 'ignis', 'marina', 'volt', 'nyx', 'aurea']

export const MASTER = {
  id: 'master', name: 'Maître Aurélien', title: 'Maître de la Ligue Templier', type: 'Ligue', color: '#f0c96b',
  team: mkTeam([['pharaos', 64], ['cendragon', 64], ['abyssal', 64], ['orageon', 65], ['drakonar', 66], ['templion', 68]]),
  intro: 'Tu as traversé le sable, les arènes et les îles. Je suis le dernier serment de Templier. Montre-moi ce que tu as appris.',
  defeat: 'Alors c’est toi, la nouvelle légende. Le sable se souviendra de ton nom.',
  quote: 'Un Maître n’est pas celui qui gagne. C’est celui qui ouvre la voie.',
  avatar: { skin: '#c98a5a', hair: '#d8d0c0', style: 'crown', outfit: '#3a3550', accent: '#f0c96b' }
}

export const RED_TRAINING = {
  id: 'red', name: 'Red', title: 'L’Entraînement d’Oubar', type: 'Normal', color: '#e4572e',
  team: mkTeam([['drakonar', 22], ['pharaos', 22], ['cendragon', 23], ['abyssal', 23], ['orageon', 24]]),
  intro: '... Prêt ?',
  defeat: '... Bien. Reviens quand tu veux.',
  quote: 'La force silencieuse est la plus lourde.',
  avatar: { skin: '#e8c39e', hair: '#2b2118', style: 'cap', outfit: '#c1440e', accent: '#ffffff' }
}

export const BLUE_TRAINING = {
  id: 'blue_training', name: 'Blue', title: 'Le Défi d’Oubar', type: 'Normal', color: '#4b8ef7',
  team: mkTeam([['orageon', 20], ['torrentis', 20], ['drakonar', 21]]),
  intro: 'Red t’a testé ? À mon tour. On ne progresse pas sans rival.',
  defeat: 'Bien joué. Reviens, on remet ça.',
  quote: 'Un bon rival vaut mille entraînements.',
  avatar: { skin: '#e8c39e', hair: '#7a4a22', style: 'spiky', outfit: '#2f5f9e', accent: '#f0c96b' }
}

export const ONLINE_RANKS = [
  { id: 'bronze', name: 'Bronze', color: '#b87333', min: 0, teamSize: 3, level: 12 },
  { id: 'argent', name: 'Argent', color: '#b8c4d0', min: 3, teamSize: 3, level: 20 },
  { id: 'or', name: 'Or', color: '#f0c96b', min: 7, teamSize: 4, level: 30 },
  { id: 'platine', name: 'Platine', color: '#7de0d8', min: 12, teamSize: 4, level: 40 },
  { id: 'diamant', name: 'Diamant', color: '#8ecae6', min: 18, teamSize: 5, level: 50 },
  { id: 'legende', name: 'Légende', color: '#f4a6c8', min: 25, teamSize: 6, level: 60 }
]

export const AI_NAMES = ['SableErrant', 'DuneNoire', 'Mirage', 'TemplierX', 'OasisBoy', 'NyxLight', 'KantoGhost', 'Sirocco', 'DuneRunner', 'SableDOr', 'VentDuSud', 'OubarAce']

export const OBJECTIVES = {
  start: 'Parle au Professeur Sable au laboratoire de Sablonville.',
  firstBadge: 'Affronte Dame Néra à l’arène de Sablonville.',
  badges: 'Obtiens les huit badges des villages de Templier.',
  fourth: 'Retourne voir le Professeur Sable : le Bracelet Templier t’attend.',
  legends: 'Explore le Sanctuaire des Vents et rencontre Latias, Latios et Rayquaza.',
  islands: 'Les îles sont ouvertes ! Direction l’Île des Épreuves.',
  tower: 'Triomphe des huit arènes de l’Île des Épreuves.',
  league: 'Affronte le Maître de la Ligue sur l’Île de la Ligue.',
  champion: 'Champion de Templier ! Le monde est à toi.'
}
