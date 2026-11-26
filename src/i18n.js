/* Terraverse localization layer.
   English is the source language; French is a full translation of the
   interface, story, tutorial, quests, dialogue, items and battle text. */

const LS_KEY = 'terraverse_lang';
let current = 'en';
try {
  const saved = localStorage.getItem(LS_KEY);
  if (saved === 'fr' || saved === 'en') current = saved;
} catch {}

export const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'fr', label: 'Français', short: 'FR' }
];

export function getLang() { return current; }
export function isFr() { return current === 'fr'; }

export function setLang(lang) {
  current = lang === 'fr' ? 'fr' : 'en';
  try { localStorage.setItem(LS_KEY, current); } catch {}
  try { document.documentElement.lang = current; } catch {}
  return current;
}

export function t(key, vars = {}) {
  const dict = DICT[current] || DICT.en;
  let str = dict[key];
  if (str === undefined) str = DICT.en[key];
  if (str === undefined) return key;
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? vars[k] : ''));
}

export function lv(n) { return t('misc.lv', { n }); }

export function speciesName(base) {
  if (!base) return '';
  return current === 'fr' && base.fr ? base.fr : base.name;
}

export function typeName(type) { return current === 'fr' ? (FR_TYPES[type] || type) : type; }
export function moveName(name) { return current === 'fr' ? (FR_MOVES[name] || name) : name; }
export function natureName(name) { return current === 'fr' ? (FR_NATURES[name] || name) : name; }
export function trainerTitle(title) { return current === 'fr' ? (FR_TITLES[title] || title) : title; }
export function itemName(key) { return current === 'fr' ? (FR_ITEMS[key]?.name || key) : (EN_ITEMS[key]?.name || key); }
export function itemDesc(key) { return current === 'fr' ? (FR_ITEMS[key]?.desc || '') : (EN_ITEMS[key]?.desc || ''); }
export function zoneName(z) { return current === 'fr' ? (FR_ZONES[z?.id]?.name || z?.name || '') : (z?.name || ''); }
export function zoneSubtitle(z) { return current === 'fr' ? (FR_ZONES[z?.id]?.subtitle || z?.subtitle || '') : (z?.subtitle || ''); }
export function zoneDesc(z) { return current === 'fr' ? (FR_ZONES[z?.id]?.desc || z?.desc || '') : (z?.desc || ''); }
export function zoneTip(id) { return current === 'fr' ? (FR_ZONE_TIPS[id] || '') : (EN_ZONE_TIPS[id] || ''); }
export function npcName(npc) { return current === 'fr' ? (FR_NPCS[npc?.id]?.name || npc?.name || '') : (npc?.name || ''); }
export function npcRole(npc) { return current === 'fr' ? (FR_NPCS[npc?.id]?.role || npc?.role || '') : (npc?.role || ''); }
export function npcLines(npc) { return current === 'fr' ? (FR_NPCS[npc?.id]?.lines || npc?.lines || []) : (npc?.lines || []); }
export function questText(id) {
  if (current === 'fr' && FR_QUESTS[id]) return FR_QUESTS[id];
  return EN_QUESTS[id];
}
export function buildingName(kind, fallback) {
  return current === 'fr' ? (FR_BUILDINGS[kind] || fallback || '') : (fallback || '');
}
export function signText(label) {
  if (current !== 'fr') return label;
  return FR_SIGNS[label] || label;
}
export function biomeName(biome) {
  return current === 'fr' ? (FR_BIOMES[biome] || biome) : biome;
}
export function botLines() { return current === 'fr' ? FR_BOT_LINES : EN_BOT_LINES; }
export function chatSeeds() { return current === 'fr' ? FR_CHAT_SEEDS : EN_CHAT_SEEDS; }
export function emoteName(name) { return current === 'fr' ? (FR_EMOTES[name] || name) : name; }

export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    let args = {};
    if (el.dataset.i18nArgs) { try { args = JSON.parse(el.dataset.i18nArgs); } catch {} }
    el.textContent = t(el.dataset.i18n, args);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  try {
    document.title = t('app.title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = t('app.description');
  } catch {}
}

/* ------------------------------------------------------------------ */
/* Data translations                                                   */
/* ------------------------------------------------------------------ */

const EN_ITEMS = {
  pokeball: { name: 'Poké Ball', desc: 'A reliable ball for catching wild Pokémon.' },
  greatball: { name: 'Great Ball', desc: 'A high-performance ball with a better catch rate.' },
  ultraball: { name: 'Ultra Ball', desc: 'An advanced ball with an exceptional catch rate.' },
  potion: { name: 'Potion', desc: 'Restores 30 HP to a party Pokémon.' },
  superpotion: { name: 'Super Potion', desc: 'Restores 80 HP to a party Pokémon.' },
  revive: { name: 'Revive', desc: 'Revives a fainted Pokémon with half HP.' },
  berry: { name: 'Oran Berry', desc: 'A sweet berry that restores 20 HP.' },
  lure: { name: 'Wild Lure', desc: 'Draws rarer Pokémon out of hiding for 10 minutes.' }
};

const FR_ITEMS = {
  pokeball: { name: 'Poké Ball', desc: 'Une ball fiable pour capturer les Pokémon sauvages.' },
  greatball: { name: 'Super Ball', desc: 'Une ball haute performance avec un meilleur taux de capture.' },
  ultraball: { name: 'Hyper Ball', desc: 'Une ball avancée avec un taux de capture exceptionnel.' },
  potion: { name: 'Potion', desc: 'Restaure 30 PV à un Pokémon de l’équipe.' },
  superpotion: { name: 'Super Potion', desc: 'Restaure 80 PV à un Pokémon de l’équipe.' },
  revive: { name: 'Rappel', desc: 'Ranime un Pokémon K.O. avec la moitié de ses PV.' },
  berry: { name: 'Baie Oran', desc: 'Une baie sucrée qui restaure 20 PV.' },
  lure: { name: 'Leurre sauvage', desc: 'Attire les Pokémon rares hors de leur cachette pendant 10 minutes.' }
};

const FR_TYPES = {
  normal: 'Normal', fire: 'Feu', water: 'Eau', electric: 'Électrik', grass: 'Plante',
  ice: 'Glace', fighting: 'Combat', poison: 'Poison', ground: 'Sol', flying: 'Vol',
  psychic: 'Psy', bug: 'Insecte', rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon',
  dark: 'Ténèbres', steel: 'Acier', fairy: 'Fée'
};

const FR_MOVES = {
  'Tackle': 'Charge', 'Quick Attack': 'Vive-Attaque', 'Headbutt': 'Coup d’Boule', 'Body Slam': 'Plaquage',
  'Ember': 'Flammèche', 'Flame Wheel': 'Roue de Feu', 'Fire Fang': 'Crocs Feu', 'Flamethrower': 'Lance-Flammes',
  'Water Gun': 'Pistolet à O', 'Aqua Jet': 'Aqua-Jet', 'Brine': 'Saumure', 'Surf': 'Surf',
  'Vine Whip': 'Fouet Lianes', 'Razor Leaf': 'Tranch’Herbe', 'Seed Bomb': 'Canon Graine', 'Energy Ball': 'Éco-Sphère',
  'Thunder Shock': 'Éclair', 'Spark': 'Étincelle', 'Thunder Fang': 'Crocs Éclair', 'Thunderbolt': 'Tonnerre',
  'Powder Snow': 'Poudreuse', 'Icy Wind': 'Vent Glace', 'Ice Fang': 'Crocs Givre', 'Ice Beam': 'Laser Glace',
  'Rock Smash': 'Éclate-Roc', 'Low Sweep': 'Balayette', 'Brick Break': 'Casse-Brique', 'Close Combat': 'Close Combat',
  'Poison Sting': 'Dard-Venin', 'Acid': 'Acide', 'Poison Jab': 'Direct Toxik', 'Sludge Bomb': 'Bombe Beurk',
  'Mud-Slap': 'Coud’Boue', 'Bulldoze': 'Piétisol', 'Dig': 'Tunnel', 'Earthquake': 'Séisme',
  'Gust': 'Tornade', 'Wing Attack': 'Cru-Ailes', 'Aerial Ace': 'Aéropique', 'Air Slash': 'Lame d’Air',
  'Confusion': 'Choc Mental', 'Psybeam': 'Rafale Psy', 'Zen Headbutt': 'Psykoud’Boul', 'Psychic': 'Psyko',
  'Bug Bite': 'Piqûre', 'Struggle Bug': 'Survinsecte', 'X-Scissor': 'Plaie Croix', 'Bug Buzz': 'Bourdon',
  'Rock Throw': 'Jet-Pierres', 'Rock Tomb': 'Tomberoche', 'Smack Down': 'Anti-Air', 'Stone Edge': 'Lame de Roc',
  'Lick': 'Léchouille', 'Shadow Sneak': 'Ombre Portée', 'Shadow Claw': 'Griffe Ombre', 'Shadow Ball': 'Ball’Ombre',
  'Twister': 'Ouragan', 'Dragon Breath': 'Draco-Souffle', 'Dragon Claw': 'Draco-Griffe', 'Dragon Pulse': 'Draco-Choc',
  'Bite': 'Morsure', 'Feint Attack': 'Feinte', 'Crunch': 'Mâchouille', 'Dark Pulse': 'Vibrobscur',
  'Metal Claw': 'Griffe Acier', 'Bullet Punch': 'Pisto-Poing', 'Iron Head': 'Tête de Fer', 'Flash Cannon': 'Luminocanon',
  'Fairy Wind': 'Vent Féérique', 'Draining Kiss': 'Vampibaiser', 'Play Rough': 'Câlinerie', 'Moonblast': 'Pouvoir Lunaire'
};

const FR_NATURES = {
  Bold: 'Assuré', Brave: 'Brave', Calm: 'Calme', Careful: 'Prudent', Hasty: 'Pressé',
  Impish: 'Malin', Jolly: 'Jovial', Lax: 'Lâche', Lonely: 'Solo', Mild: 'Doux',
  Modest: 'Modeste', Naive: 'Naïf', Naughty: 'Mauvais', Quiet: 'Discret', Rash: 'Foufou',
  Relaxed: 'Relax', Sassy: 'Malpoli', Serious: 'Sérieux', Timid: 'Timide'
};

const FR_TITLES = {
  Ranger: 'Ranger', Collector: 'Collectionneur', Explorer: 'Explorateur', Breeder: 'Éleveur',
  'Ace Trainer': 'Dresseur d’élite', Wanderer: 'Vagabond', Researcher: 'Chercheur', 'Gym Challenger': 'Challenger d’Arène'
};

const FR_ZONES = {
  hollow: {
    name: 'Creux Verdoyant', subtitle: 'Là où commence chaque voyage',
    desc: 'Un havre baigné de soleil, fait de ruelles pavées, de jardins fleuris et d’un parfum de pain frais.'
  },
  meadow: {
    name: 'Prairies de Pétalesoleil', subtitle: 'Des champs vibrants d’ailes',
    desc: 'Des prairies de fleurs sauvages sans fin où les jeunes dresseurs poursuivent leur première capture.'
  },
  forest: {
    name: 'Bois Murmurants', subtitle: 'Les vieux arbres se souviennent de tout',
    desc: 'Un labyrinthe de branches anciennes, de pierres moussues et d’esprits forestiers timides.'
  },
  lake: {
    name: 'Lac Miroir', subtitle: 'Eau calme, secrets lumineux',
    desc: 'Un lac de verre entouré de roseaux et de pierres anciennes, où dort la légende d’un serpent.'
  },
  volcano: {
    name: 'Crête de Braise', subtitle: 'La montagne respire le feu',
    desc: 'Des falaises de basalte et des rivières d’or lent. Seuls les plus audacieux traversent la brume de chaleur.'
  },
  snow: {
    name: 'Étendue de Givrelac', subtitle: 'Silence, neige et lumière des étoiles',
    desc: 'Un monde alpin de glace bleue, de neige dérivante et de silence gelé.'
  },
  coast: {
    name: 'Côte des Tempêtes', subtitle: 'Là où le ciel rencontre la mer',
    desc: 'Embruns, falaises noires et un phare qui fend la tempête.'
  },
  swamp: {
    name: 'Marais de Sombrefen', subtitle: 'Écoute — les roseaux murmurent',
    desc: 'Une zone humide noyée de brume, aux arbres tordus et au sol doux et trompeur.'
  },
  peak: {
    name: 'Pic de la Victoire', subtitle: 'Seules les légendes atteignent le sommet',
    desc: 'De la pierre balayée par le vent au-dessus des nuages. L’air lui-même semble électrique.'
  }
};

const FR_ZONE_TIPS = {
  hollow: 'Un havre sûr. Visitez le Centre Pokémon pour soigner votre équipe, ou le marché pour des provisions.',
  meadow: 'Les hautes herbes cachent des Pokémon sauvages. Approchez-vous et appuyez sur E pour engager le combat.',
  forest: 'Les types Insecte et Plante prospèrent ici. Les types Feu ont l’avantage.',
  lake: 'Les types Eau se rassemblent sur la rive. Emportez des Super Balls pour les rencontres rares.',
  volcano: 'Les types Feu rôdent sur la crête. Les capacités Eau et Roche infligent des dégâts supplémentaires.',
  snow: 'Les types Glace sont courants dans les congères. Surveillez la neige scintillante — les chromatiques s’y cachent.',
  coast: 'Les tempêtes arrivent vite. Les types Électrik adorent l’air chargé.',
  swamp: 'Les types Poison et Spectre rôdent dans la brume. Les Potions sont essentielles.',
  peak: 'La dernière frontière. Des Pokémon légendaires ont été aperçus au sommet.'
};

const EN_ZONE_TIPS = {
  hollow: 'A safe haven. Visit the Pokémon Center to heal, or the market for supplies.',
  meadow: 'Tall grass hides wild Pokémon. Walk close and press E to engage.',
  forest: 'Bug and Grass-types thrive here. Fire-types have an edge.',
  lake: 'Water-types gather at the shore. Bring Great Balls for rare encounters.',
  volcano: 'Fire-types roam the ridge. Water and Rock moves deal extra damage.',
  snow: 'Ice-types are common in the drifts. Watch for sparkling snow — shinies hide there.',
  coast: 'Storms roll in fast. Electric-types love the charged air.',
  swamp: 'Poison and Ghost-types lurk in the fog. Potions are essential.',
  peak: 'The final frontier. Legendary Pokémon have been sighted at the summit.'
};

const FR_NPCS = {
  alder: {
    name: 'Professeur Alder', role: 'Professeur Pokémon', lines: [
      'Ah, Nova ! Juste à l’heure. La nature est agitée — je le sens dans le vent.',
      'Prends ces Poké Balls. Les créatures au-delà de la porte sont curieuses, mais elles s’effraient vite.',
      'Capture trois Pokémon sauvages et rapporte-moi tes notes de terrain. Il se passe quelque chose de remarquable au Pic de la Victoire.'
    ]
  },
  joy: {
    name: 'Infirmière Joy', role: 'Centre Pokémon', lines: [
      'Bienvenue au Centre Pokémon du Creux Verdoyant !',
      'Laisse-moi m’occuper de ton équipe. Ils travaillent si dur dehors.'
    ]
  },
  mara: {
    name: 'Mara', role: 'Marchande itinérante', lines: [
      'Stock frais de la Côte des Tempêtes ! Balls, potions, et quelques objets tombés d’un bateau.',
      'Aucun remboursement. Surtout pas sur les œufs mystérieux.'
    ]
  },
  kai: {
    name: 'Kai le rival', role: 'Dresseur d’élite', lines: [
      'Tu en as mis du temps. J’ai déjà capturé une équipe complète pendant que tu faisais la sieste.',
      'Voyons si la confiance du professeur en toi était méritée.'
    ]
  },
  mira: {
    name: 'Éclaireuse Mira', role: 'Corps des Rangers', lines: [
      'Les Bois Murmurants sont magnifiques en cette saison — et complètement remplis d’Insectes.',
      'Si tu entends un bruissement derrière toi, ne va pas voir seul.'
    ]
  },
  fen: {
    name: 'Vieux Fen', role: 'Ermite du marais', lines: [
      'Le marais garde ses secrets. Mais il aime les visiteurs qui apportent des baies.',
      'Quelque chose d’ancien a bougé sous l’eau la nuit dernière. Quelque chose avec trop d’yeux.'
    ]
  },
  tobin: {
    name: 'Tobin', role: 'Dresseur', lines: [
      'Mon Ronflex et moi parcourons cette route depuis des années. Surtout en marchant. Parfois en dormant.'
    ]
  },
  sena: {
    name: 'Sena', role: 'Observatrice du ciel', lines: [
      'Rayquaza tourne depuis trois jours. La tempête n’a pas cessé depuis.',
      'Si tu montes au sommet, prends une veste. Et peut-être un dragon.'
    ]
  },
  ivo: {
    name: 'Ivo', role: 'Guide de montagne', lines: [
      'La Crête de Braise n’est pas un endroit pour les sandales. Le sol se souvient de chaque pas.',
      'Là-haut, il y a des Pokémon Feu qui mangent du charbon au petit-déjeuner. Emporte de l’eau. Beaucoup d’eau.'
    ]
  }
};

const EN_QUESTS = {
  main: {
    title: 'A New Journey', chapter: '01',
    desc: 'Professor Alder is waiting by the lab. Something is stirring in the Verdant Wilds.',
    objectives: [
      { id: 'talk', label: 'Speak with Professor Alder', target: 1 },
      { id: 'catch', label: 'Catch 3 wild Pokémon', target: 3 },
      { id: 'level', label: 'Reach trainer level 15', target: 15 }
    ]
  },
  side1: {
    title: 'A Shy Sprigatito', chapter: 'SIDE',
    desc: 'Scout Mira spotted a frightened Sprigatito near the Whispering Woods. It keeps hiding in the tall grass.',
    objectives: [{ id: 'sprig', label: 'Catch a Sprigatito', target: 1 }]
  },
  side2: {
    title: 'The Lighthouse Keeper', chapter: 'SIDE',
    desc: 'The Storm Coast lighthouse has gone dark. Find out what is scaring the keeper.',
    objectives: [{ id: 'coast', label: 'Visit Storm Coast', target: 1 }]
  },
  raid: {
    title: 'Sky Serpent Sighting', chapter: 'RAID',
    desc: 'Rayquaza has descended on Victory Peak. Trainers are gathering for a once-in-a-generation encounter.',
    objectives: [{ id: 'raid', label: 'Defeat the sky serpent', target: 1 }]
  }
};

const FR_QUESTS = {
  main: {
    title: 'Un nouveau voyage', chapter: '01',
    desc: 'Le professeur Alder attend près du laboratoire. Quelque chose s’agite dans les terres sauvages verdoyantes.',
    objectives: [
      { id: 'talk', label: 'Parler au professeur Alder', target: 1 },
      { id: 'catch', label: 'Capturer 3 Pokémon sauvages', target: 3 },
      { id: 'level', label: 'Atteindre le niveau de dresseur 15', target: 15 }
    ]
  },
  side1: {
    title: 'Un Poussacha timide', chapter: 'ANNEXE',
    desc: 'L’éclaireuse Mira a repéré un Poussacha effrayé près des Bois Murmurants. Il n’arrête pas de se cacher dans les hautes herbes.',
    objectives: [{ id: 'sprig', label: 'Capturer un Poussacha', target: 1 }]
  },
  side2: {
    title: 'Le gardien du phare', chapter: 'ANNEXE',
    desc: 'Le phare de la Côte des Tempêtes s’est éteint. Découvre ce qui effraie son gardien.',
    objectives: [{ id: 'coast', label: 'Visiter la Côte des Tempêtes', target: 1 }]
  },
  raid: {
    title: 'Apparition du serpent céleste', chapter: 'RAID',
    desc: 'Rayquaza est descendu au Pic de la Victoire. Les dresseurs se rassemblent pour une rencontre unique en une génération.',
    objectives: [{ id: 'raid', label: 'Vaincre le serpent céleste', target: 1 }]
  }
};

const FR_BUILDINGS = {
  center: 'CENTRE POKÉMON', market: 'MARCHÉ WILDWIND', lab: 'LABO ALDER',
  house: 'MAISON DE NOVA', inn: 'LE FENN AU REPOS', lighthouse: 'GUET DES TEMPÊTES'
};

const FR_SIGNS = {
  'SOUTH · SUNPETAL MEADOWS': 'SUD · PRAIRIES DE PÉTALESOLEIL',
  'WEST · WHISPERING WOODS': 'OUEST · BOIS MURMURANTS',
  'EAST · MIRROR LAKE': 'EST · LAC MIROIR',
  'NORTH · VICTORY PEAK': 'NORD · PIC DE LA VICTOIRE',
  'WHISPERING WOODS': 'BOIS MURMURANTS',
  'MIRROR LAKE': 'LAC MIROIR',
  'SHADOWFEN MARSH': 'MARAIS DE SOMBREFEN',
  'EMBER RIDGE': 'CRÊTE DE BRAISE',
  'STORM COAST': 'CÔTE DES TEMPÊTES',
  'VICTORY PEAK': 'PIC DE LA VICTOIRE',
  'TRAIL': 'SENTIER', 'FIELD NOTES': 'NOTES DE TERRAIN'
};

const FR_BIOMES = {
  town: 'ville', meadow: 'prairie', forest: 'forêt', lake: 'lac', volcano: 'volcan',
  snow: 'neige', coast: 'côte', swamp: 'marais', peak: 'sommet'
};

const EN_BOT_LINES = [
  'Anyone seen a shiny Ralts near the lake? 👀',
  'The Rayquaza raid is filling up — 47/50!',
  'Just caught my first Sprigatito 🌱',
  'Selling a spare Moon Stone in Verdant Hollow.',
  'Frostpeak is gorgeous at sunrise. Worth the climb.',
  'Anyone want to run the Ember Ridge route? Need a water type.',
  'The new migration rotation brought a Milotic to Mirror Lake!',
  'LFG for Victory Peak. Level 24+, bring potions.',
  'Tip: great balls work way better when the wild mon is low HP.',
  'Who else is still awake? The fireflies in Shadowfen are unreal.',
  'My Ceruledge just hit level 40. The grind is real.',
  'The shop restocked ultra balls!! Go go go',
  'I swear there’s a legendary in the fog at the coast.',
  'New player here. How do I get to Sunpetal Meadows?',
  'The music in Whispering Woods is so good.',
  'Anyone up for a friendly battle in the plaza?',
  'Caught a shiny Magikarp after 200 tries. Never again.',
  'The professor gives free pokeballs btw, talk to him first!',
  'Raid starts in 12 minutes. Meet at the north gate!',
  'Just saw a pack of Eevee near the flower fields 🥹'
];

const FR_BOT_LINES = [
  'Quelqu’un a vu un Ralts chromatique près du lac ? 👀',
  'Le raid Rayquaza se remplit — 47/50 !',
  'Je viens de capturer mon premier Poussacha 🌱',
  'Je vends une Pierre Lune en trop au Creux Verdoyant.',
  'Givrelac est magnifique au lever du soleil. Ça vaut la montée.',
  'Quelqu’un veut faire la route de la Crête de Braise ? Il me faut un type Eau.',
  'La nouvelle rotation de migration a amené un Milobellus au Lac Miroir !',
  'Cherche groupe pour le Pic de la Victoire. Niveau 24+, apportez des potions.',
  'Astuce : les Super Balls marchent bien mieux quand le Pokémon sauvage a peu de PV.',
  'Qui d’autre est encore réveillé ? Les lucioles de Sombrefen sont irréelles.',
  'Mon Malvalame vient d’atteindre le niveau 40. Le farm est réel.',
  'Le magasin a réapprovisionné les Hyper Balls !! Allez allez allez',
  'Je jure qu’il y a un légendaire dans la brume sur la côte.',
  'Nouveau joueur ici. Comment aller aux Prairies de Pétalesoleil ?',
  'La musique des Bois Murmurants est trop bonne.',
  'Quelqu’un pour un combat amical sur la place ?',
  'J’ai capturé un Magicarpe chromatique après 200 essais. Plus jamais.',
  'Le professeur donne des Poké Balls gratuites, parlez-lui d’abord !',
  'Le raid commence dans 12 minutes. Rendez-vous à la porte nord !',
  'Je viens de voir une horde d’Évoli près des champs de fleurs 🥹'
];

const EN_CHAT_SEEDS = {
  global: [
    ['Kai', 'Anyone seen a shiny Ralts near the lake? 👀'],
    ['Luna', 'The Rayquaza raid is filling up — 47/50!'],
    ['Moss', 'Just caught my first Sprigatito 🌱'],
    ['Ivy', 'Frostpeak is gorgeous at sunrise. Worth the climb.'],
    ['Rook', 'LFG for Victory Peak. Level 24+, bring potions.'],
    ['Nia', 'Tip: Great Balls work way better when the wild mon is low HP.'],
    ['Sora', 'Who else is still awake? The fireflies in Shadowfen are unreal.'],
    ['Juno', 'The shop restocked Ultra Balls!! Go go go']
  ],
  local: [
    ['Mira', 'Welcome to Verdant Hollow, Nova! The woods are lively today.', 'RANGER'],
    ['Mara', 'Market’s open. I’ve got a fresh shipment of Great Balls.', 'MERCHANT']
  ],
  party: ['Party chat is shared with your shard. Invite a friend to explore together.']
};

const FR_CHAT_SEEDS = {
  global: [
    ['Kai', 'Quelqu’un a vu un Ralts chromatique près du lac ? 👀'],
    ['Luna', 'Le raid Rayquaza se remplit — 47/50 !'],
    ['Moss', 'Je viens de capturer mon premier Poussacha 🌱'],
    ['Ivy', 'Givrelac est magnifique au lever du soleil. Ça vaut la montée.'],
    ['Rook', 'Cherche groupe pour le Pic de la Victoire. Niveau 24+, apportez des potions.'],
    ['Nia', 'Astuce : les Super Balls marchent bien mieux quand le Pokémon sauvage a peu de PV.'],
    ['Sora', 'Qui d’autre est encore réveillé ? Les lucioles de Sombrefen sont irréelles.'],
    ['Juno', 'Le magasin a réapprovisionné les Hyper Balls !! Allez allez allez']
  ],
  local: [
    ['Mira', 'Bienvenue au Creux Verdoyant, Nova ! Les bois sont animés aujourd’hui.', 'RANGER'],
    ['Mara', 'Le marché est ouvert. J’ai une livraison fraîche de Super Balls.', 'MARCHANDE']
  ],
  party: ['Le chat d’équipe est partagé avec votre fragment. Invitez un ami à explorer avec vous.']
};

const FR_EMOTES = {
  Wave: 'Salut', Cheer: 'Bravo', Dance: 'Danse', Sparkle: 'Étincelle', Heart: 'Cœur', Flex: 'Muscle'
};

/* ------------------------------------------------------------------ */
/* UI strings                                                          */
/* ------------------------------------------------------------------ */

const EN = {
  'app.title': 'Terraverse — Open World Creature MMORPG',
  'app.description': 'Terraverse — a living open-world creature MMORPG. Explore, catch, battle and adventure with trainers around the world.',
  'boot.sub': 'Waking up the wild...',
  'boot.error': 'The wilds could not be reached.',
  'brand.tagline': 'OPEN WORLD MMORPG',
  'hud.exploring': 'YOU ARE EXPLORING',
  'hud.online': 'online',
  'hud.you': 'You',
  'hud.trainers': 'Trainers',
  'hud.wild': 'Wild',
  'hud.profileOnline': '● Online',
  'hud.coinsTitle': 'Trainer coins',
  'nav.social': 'Trainers nearby',
  'nav.map': 'World map',
  'nav.sound': 'Toggle sound',
  'nav.settings': 'Settings',
  'nav.language': 'Change language',
  'rank.ranger': 'RANGER',
  'quest.main': 'MAIN QUEST',
  'quest.chapter': 'CH. 01',
  'quest.title': 'A New Journey',
  'quest.desc': 'Professor Alder is waiting by the lab. Something is stirring in the Verdant Wilds.',
  'quest.objTalk': 'Speak with Professor Alder',
  'quest.objCatch': 'Catch 3 wild Pokémon',
  'quest.objLevel': 'Reach trainer level 15',
  'quest.rewards': 'REWARDS',
  'event.kicker': 'WORLD EVENT',
  'event.title': 'Sky Serpent Sighting',
  'event.desc': 'Rayquaza circles Victory Peak. Join 47 trainers at the summit.',
  'event.join': 'Join raid',
  'event.trainers': '{n} trainers',
  'event.live': 'LIVE NOW',
  'mm.local': 'LOCAL MAP',
  'party.title': 'YOUR PARTY',
  'party.manage': 'Manage',
  'party.key': 'party',
  'chat.global': 'GLOBAL',
  'chat.local': 'LOCAL',
  'chat.party': 'PARTY',
  'chat.shard': 'SHARD 07',
  'chat.placeholder': 'Say something to the world...',
  'chat.send': 'SEND',
  'hotbar.ball': 'Poké Ball',
  'hotbar.great': 'Great Ball',
  'hotbar.potion': 'Potion',
  'hotbar.bag': 'Bag (B)',
  'hotbar.party': 'Party (P)',
  'hotbar.dex': 'Pokédex (D)',
  'hotbar.map': 'World map (M)',
  'hotbar.emote': 'Emote wheel',
  'hotbar.emoteLabel': 'Emote',
  'hint.move': 'move',
  'hint.sprint': 'sprint',
  'hint.interact': 'interact',
  'touch.interact': 'Interact',
  'touch.catch': 'Catch',
  'touch.bag': 'Bag',
  'touch.party': 'Party',
  'touch.dex': 'Dex',
  'touch.map': 'Map',
  'touch.quests': 'Quests',
  'touch.chat': 'Chat',
  'zone.entering': 'ENTERING',
  'interact.engage': 'Engage {name} · Lv.{level}',
  'interact.talk': 'Talk to {name}',
  'misc.lv': 'Lv.{n}',
  'misc.lead': 'LEAD',
  'misc.emptySlot': 'Empty slot',
  'misc.online': 'Online',
  'misc.explorer': 'Explorer',
  'misc.fieldNotes': 'FIELD NOTES',
  'misc.open': 'OPEN',
  'misc.fieldResearch': 'FIELD RESEARCH',
  'misc.trail': 'TRAIL',
  'misc.you': 'YOU',
  'misc.close': 'Close',
  'misc.level': 'LEVEL',
  'misc.hp': 'HP',
  'misc.nextLevel': 'NEXT LEVEL',
  'misc.nature': '{nature} NATURE',
  'misc.legendaryDesc': 'A legendary Pokémon. Its presence changes the air around it.',
  'misc.regularDesc': 'Caught in the wilds of Terraverse. It trusts you more with every battle.',

  'toast.welcomeTitle': 'Welcome to Terraverse',
  'toast.welcomeBody': 'WASD to move · E to interact · Shift to sprint',
  'toast.dailyTitle': 'Daily field bonus',
  'toast.dailyBody': '+3 Poké Balls added to your bag.',
  'toast.soundOnTitle': 'Sound on',
  'toast.soundOnBody': 'The wilds have a soundtrack again.',
  'toast.soundOffTitle': 'Sound muted',
  'toast.soundOffBody': 'You can still hear your own thoughts.',
  'toast.helpTitle': 'Verdant Hollow',
  'toast.helpBody': 'Walk close to a trainer or wild Pokémon, then press E.',
  'toast.noWildTitle': 'No wild Pokémon nearby',
  'toast.noWildBody': 'Move closer to a wild creature to engage it.',
  'toast.languageTitle': 'Language changed',
  'toast.languageBody': 'Terraverse is now in English.',
  'toast.leadChangedTitle': 'Lead Pokémon changed',
  'toast.leadChangedBody': '{name} now follows you in the overworld.',
  'toast.healedTitle': '{name} healed',
  'toast.healedBody': '+{hp} HP · {cur}/{max}',
  'toast.fullHpTitle': 'Already at full HP',
  'toast.fullHpBody': '{name} doesn’t need healing right now.',
  'toast.noHealingTitle': 'No healing items',
  'toast.noHealingBody': 'Visit the Wildwind Market for Potions.',
  'toast.outOfStockTitle': 'Out of stock',
  'toast.outOfStockBody': 'You have no {name}s left.',
  'toast.ballReadyTitle': '{name} ready',
  'toast.ballReadyBody': '{count} in bag · engage a wild Pokémon to use it.',
  'toast.itemActivatedTitle': '{name} activated',
  'toast.itemActivatedBody': 'Keep exploring — this item will find its moment.',
  'toast.lureBody': 'Rare wild Pokémon are drawn to your scent for 10 minutes.',
  'toast.boughtTitle': 'Bought {name}',
  'toast.boughtBody': '−{price} coins · ×{count} in bag',
  'toast.notEnoughTitle': 'Not enough coins',
  'toast.notEnoughBody': 'You need {amount} more.',
  'toast.inviteCopiedTitle': 'Invite copied',
  'toast.inviteCopiedBody': 'Share the shard code with a friend.',
  'toast.emoteSentTitle': 'Emote sent',
  'toast.emoteSentBody': '{name}!',
  'toast.fieldSuppliesTitle': 'Field supplies received',
  'toast.fieldSuppliesBody': '+10 Poké Balls · quest updated',
  'toast.teamHealedTitle': 'Team healed',
  'toast.teamHealedBody': 'All Pokémon are at full HP.',
  'toast.nurseHealedTitle': 'Your team is fully healed',
  'toast.nurseHealedBody': 'Nurse Joy gives you a warm smile.',
  'toast.arrivedTitle': 'Arrived at {name}',
  'toast.arrivedBody': '{subtitle}',
  'toast.waveTitle': 'Emote sent',
  'toast.waveBody': 'You wave at {name}.',

  'level.trainerTitle': 'Trainer level {level}!',
  'level.trainerBody': 'New field rank unlocked. Your team feels inspired.',
  'level.monTitle': '{name} reached {lv}!',
  'level.monBody': '+{n} level{s} · stats increased',
  'level.evolveTitle': '{from} evolved!',
  'level.evolveBody': 'Say hello to {to}.',
  'quest.completeTitle': 'Main quest complete',
  'quest.completeBody': '+800 coins · +10 Poké Balls',
  'quest.side1Title': 'Side quest complete',
  'quest.side1Body': 'A Shy Sprigatito · +450 coins · +3 Great Balls',
  'quest.side2Title': 'Side quest complete',
  'quest.side2Body': 'The Lighthouse Keeper · +650 coins · +2 Super Potions',
  'quest.raidTitle': 'Raid complete',
  'quest.raidBody': 'Sky Serpent Sighting · +2,500 coins · +5 Ultra Balls',
  'quest.claimedTitle': 'A New Journey',
  'quest.claimedDesc': 'Chapter complete. The road to Victory Peak is open — and something waits at the summit.',
  'battle.rivalTitle': 'Rival defeated',
  'battle.rivalBody': 'Kai storms off toward Victory Peak. Something tells you this isn’t over.',
  'battle.trainerWinTitle': '{name} defeated',
  'battle.trainerWinBody': '+{prize} coins · your team grows stronger.',
  'battle.raidWinTitle': 'Rayquaza retreats!',
  'battle.raidWinBody': 'The sky clears over Victory Peak. Raid rewards delivered.',
  'battle.defeatTitle': 'Returned to safety',
  'battle.defeatBody': 'Nurse Joy healed your team. You lost {loss} coins.',
  'chat.joinedShard': 'joined the shard.',
  'chat.sameShard': 'is exploring the same shard.',

  'weather.snow': 'Snow flurries',
  'weather.volcano': 'Ash haze',
  'weather.coast': 'Sea breeze',
  'weather.swamp': 'Low mist',
  'weather.forest': 'Dappled sun',
  'weather.lake': 'Clear skies',
  'weather.default': 'Sunlit',

  'chat.title': 'Shard Chat',
  'chat.subtitle': '{count} trainers online · shard 07',
  'chat.placeholderShort': 'Say something...',
  'chat.footer': 'Chat syncs across tabs on this shard.',
  'chat.closeHint': 'close',
  'chat.modalSend': 'SEND',

  'dex.title': 'Pokédex',
  'dex.subtitle': '{caught} caught · {seen} seen · {total} species registered',
  'dex.search': 'Search by name or number...',
  'dex.all': 'ALL',
  'dex.gen': 'GEN {n}',
  'dex.caught': 'CAUGHT',
  'dex.seen': 'SEEN',
  'dex.completion': 'COMPLETION',
  'dex.migration': 'MIGRATION',
  'dex.allGen': 'ALL GEN',
  'dex.tip': 'Tip: every species can appear through the rotating wild migration.',
  'dex.detailSubtitle': 'National Dex #{num} · Generation {gen}',
  'dex.unknown': 'Unknown Pokémon',
  'dex.unknownHint': 'Register this Pokémon in the Pokédex to reveal its field notes.',
  'dex.desc': '{name} is a {types}-type Pokémon first documented in Generation {gen}. {extra}',
  'dex.legendaryExtra': 'A legendary presence said to appear only during great shifts in the wild.',
  'dex.mythicalExtra': 'A mythical Pokémon spoken of in fragments of old field journals.',
  'dex.regularExtra': 'It has adapted to the wild migrations of the Terraverse and can be found across several biomes.',
  'dex.catchRate': 'Catch rate',
  'dex.legendary': 'Legendary',
  'dex.mythical': 'Mythical',
  'dex.evolvesAt': 'Evolves at Lv.{level} → {name}',
  'dex.evolvesFrom': 'Evolves from {name}',
  'dex.caughtStatus': 'Caught ✓',
  'dex.seenStatus': 'Seen in the wild',
  'dex.notSeenStatus': 'Not yet encountered',
  'dex.back': 'Back to Pokédex',
  'dex.statHp': 'HP',
  'dex.statAtk': 'ATTACK',
  'dex.statDef': 'DEFENSE',
  'dex.statSpa': 'SP. ATK',
  'dex.statSpd': 'SP. DEF',
  'dex.statSpe': 'SPEED',

  'party.title': 'Your Party',
  'party.subtitle': '{count} of 6 slots filled · {box} in reserve',
  'party.footer': 'Lead Pokémon follows you in the overworld.',
  'party.setLead': 'Set as lead',
  'party.hp': 'HP',
  'party.lead': 'LEAD',
  'party.empty': 'Empty slot',

  'bag.title': 'Field Bag',
  'bag.subtitle': '{count} items · {coins} coins',
  'bag.notesTitle': 'FIELD NOTES',
  'bag.notes': '<b>Poké Balls</b> are consumed when you throw them in battle. Weaken a wild Pokémon first to improve your odds.<br><br><b>Potions</b> can be used here or from the hotbar to heal your lead Pokémon.<br><br>Your bag is shared across the shard and saved automatically.',
  'bag.footer': 'Click an item to use or ready it.',
  'bag.visitMarket': 'Visit market',

  'map.title': 'World Map',
  'map.subtitle': 'Terraverse · Shard 07 · all regions charted',
  'map.fastTravel': 'FAST TRAVEL',
  'map.travel': 'TRAVEL',
  'map.openWorld': '<b>Open world:</b> {tip}',
  'map.footer': 'Fast travel is free during the Sky Festival.',
  'map.levels': 'Lv. {min}–{max} · {biome}',

  'quests.title': 'Quest Journal',
  'quests.subtitle': 'Main story, field requests and world events',
  'quests.claimed': '✓ Rewards claimed',
  'quests.rewards': 'REWARDS · {rewards}',
  'quests.claim': 'Claim',
  'quests.footer': 'Quests update automatically as you explore.',
  'quests.closeHint': 'close',

  'shop.title': 'Wildwind Market',
  'shop.subtitle': 'Mara’s trail-worn counter of useful things',
  'shop.today': 'TODAY’S SPECIAL',
  'shop.eeveeTitle': 'Eevee Field Kit',
  'shop.eeveeDesc': 'Great Ball ×3 · Potion ×2 · Oran Berry ×2',
  'shop.rangerTitle': 'Ranger Starter Pack',
  'shop.rangerDesc': 'Poké Ball ×10 · Super Potion ×1',
  'shop.maraNote': 'Mara buys nothing, but she’s happy to tell you where she found it.',
  'shop.coins': 'Your coins: <b style="color:#ffb254">{coins}</b>',
  'shop.priceCoins': '{amount} coins',
  'shop.delivery': 'Items are delivered instantly.',
  'shop.buy': 'BUY',

  'social.title': 'Trainers Nearby',
  'social.subtitle': '{count} online · shard 07 · {zone}',
  'social.realTrainer': 'REAL TRAINER',
  'social.sameShard': 'Same shard',
  'social.nearby': 'Nearby',
  'social.wave': 'Wave',
  'social.shardStatus': 'SHARD STATUS',
  'social.online': 'Online trainers',
  'social.inZone': 'In {zone}',
  'social.parties': 'Parties forming',
  'social.uptime': 'Uptime',
  'social.inviteTitle': 'SHARD INVITE CODE',
  'social.inviteDesc': 'Open Terraverse in another tab to see your friends appear in real time.',
  'social.copy': 'Copy invite',
  'social.note': 'Realtime presence and chat sync across browser tabs on this shard via BroadcastChannel.',
  'social.footer': 'Wave at nearby trainers to say hello.',
  'social.closeHint': 'close',
  'social.waveChat': 'waves at {name} 👋',

  'settings.title': 'Settings',
  'settings.subtitle': 'Make Terraverse feel like home',
  'settings.language': 'Language',
  'settings.languageDesc': 'Interface, story, tutorial, quests and dialogue.',
  'settings.sound': 'Sound & music',
  'settings.soundDesc': 'Ambient field music, battle themes and effects.',
  'settings.particles': 'Ambient particles',
  'settings.particlesDesc': 'Pollen, snow, embers and fireflies.',
  'settings.dayNight': 'Day / night tint',
  'settings.dayNightDesc': 'Warm evenings and deep blue nights.',
  'settings.profile': 'Trainer profile',
  'settings.profileDesc': '{name} · Level {level} · {id}',
  'settings.guide': 'Story & tutorial',
  'settings.guideDesc': 'Replay the opening chapter and the field guide.',
  'settings.guideButton': 'Open guide',
  'settings.reset': 'Reset adventure',
  'settings.resetDesc': 'Erase this save and begin again in Verdant Hollow.',
  'settings.resetButton': 'Reset',
  'settings.resetConfirm': 'Really reset?',
  'settings.footer': 'Terraverse v1.0 · Shard 07 · {zone}',
  'settings.autosaved': 'Autosaved',

  'emotes.title': 'Emotes',
  'emotes.subtitle': 'A little personality goes a long way',
  'emotes.footer': 'Emotes appear in local chat.',
  'emotes.closeHint': 'close',
  'emote.Wave': 'Wave', 'emote.Cheer': 'Cheer', 'emote.Dance': 'Dance',
  'emote.Sparkle': 'Sparkle', 'emote.Heart': 'Heart', 'emote.Flex': 'Flex',

  'raid.title': 'Sky Serpent Sighting',
  'raid.subtitle': 'World event · Victory Peak · 47 trainers gathered',
  'raid.level': 'LEGENDARY RAID · Lv. {level}',
  'raid.desc': 'Rayquaza has descended through the cloudbreak above Victory Peak. The air crackles with dragon energy. Join the gathered trainers and drive the sky serpent back into the stratosphere.',
  'raid.trainers': 'TRAINERS',
  'raid.timeLeft': 'TIME LEFT',
  'raid.reward': 'REWARD',
  'raid.join': 'Join the raid',
  'raid.cleared': 'Raid already cleared',
  'raid.note': 'Your team will be healed after the encounter. Raid battles cannot be fled.',
  'raid.footer': 'Sky Festival world event',
  'raid.closeHint': 'close',

  'dialogue.continue': 'Continue',
  'dialogue.close': 'Close',
  'dialogue.heal': 'Heal my team',
  'dialogue.browse': 'Browse wares',
  'dialogue.battle': 'Battle',
  'dialogue.dex': 'View Pokédex',

  'tutorial.title': 'Field Guide',
  'tutorial.subtitle': 'Chapter 1 · A New Journey',
  'tutorial.storyTitle': 'The wind has changed',
  'tutorial.story': 'For three days the wind over Verdant Hollow has carried a strange electric charge. Professor Alder believes the wild migrations are shifting — and that something ancient is waking above Victory Peak. Your journey begins at the lab, with a handful of Poké Balls and a team that trusts you.',
  'tutorial.stepMoveTitle': 'Explore the world',
  'tutorial.stepMove': 'Use WASD or the arrow keys to move. Hold Shift to sprint. On mobile, use the joystick.',
  'tutorial.stepInteractTitle': 'Talk and engage',
  'tutorial.stepInteract': 'Press E near a trainer to talk, or near a wild Pokémon to start a battle. Clicking a creature works too.',
  'tutorial.stepCatchTitle': 'Catch new friends',
  'tutorial.stepCatch': 'Weaken a wild Pokémon, then throw a Poké Ball. Lower HP and status conditions improve your catch rate.',
  'tutorial.stepBattleTitle': 'Win battles',
  'tutorial.stepBattle': 'Type matchups decide the fight. Super-effective moves deal double damage. Switch Pokémon when your lead is in danger.',
  'tutorial.stepGrowTitle': 'Grow your legend',
  'tutorial.stepGrow': 'Complete quests, level up your team, and challenge the Sky Serpent raid at Victory Peak.',
  'tutorial.controls': 'WASD move · Shift sprint · E interact · P party · D Pokédex · M map · B bag · J quests',
  'tutorial.start': 'Start exploring',
  'tutorial.reopen': 'You can reopen this guide from Settings at any time.',

  'result.continue': 'Continue exploring',
  'result.level': 'LEVEL',
  'result.dex': 'DEX',
  'result.hp': 'HP',
  'result.xp': 'XP',
  'result.levelUp': 'LEVEL UP',
  'result.coins': 'COINS',
  'result.return': 'RETURN',
  'battle.trainerMode': 'TRAINER BATTLE',
  'battle.raidMode': 'RAID BATTLE',
  'battle.wildMode': 'WILD ENCOUNTER',
  'battle.exit': 'Leave battle',
  'battle.wildStatus': 'WILD',
  'battle.trainerStatus': 'TRAINER',
  'battle.raidStatus': 'RAID BOSS',
  'battle.shinyStatus': '✦ SHINY',
  'battle.ready': 'READY',
  'battle.actions': 'BATTLE ACTIONS',
  'battle.catch': 'Catch Pokémon',
  'battle.switch': 'Switch',
  'battle.bag': 'Bag',
  'battle.run': 'Run away',
  'battle.hint': 'Type matchups decide the battle. Use super-effective moves!',
  'battle.throwBall': 'Throw a ball',
  'battle.useItem': 'Use an item',
  'battle.catchHint': 'Lower HP and status conditions improve your catch rate.',
  'battle.itemHint': '{name} has {hp} / {max} HP.',
  'battle.noItems': 'No items left. Visit the market.',
  'battle.back': 'Back',
  'battle.switchTitle': 'Switch Pokémon',
  'battle.switchHint': 'Choose a healthy teammate.',
  'battle.chooseMove': 'Choose your move!',
  'battle.whatDo': 'What will you do?',
  'battle.challenge': '{name} challenges you!',
  'battle.wildAppeared': 'A wild {name} appeared!',
  'battle.used': '{name} used {move}!',
  'battle.missed': '{name}’s attack missed!',
  'battle.noEffect': 'It had no effect...',
  'battle.crit': 'A critical hit! {dmg} damage.',
  'battle.super': 'It’s super effective! {dmg} damage.',
  'battle.notVery': 'It’s not very effective... {dmg} damage.',
  'battle.tookDamage': '{name} took {dmg} damage.',
  'battle.superTook': 'It’s super effective! {name} took {dmg} damage.',
  'battle.notVeryTook': 'It’s not very effective... {dmg} damage.',
  'battle.comeBackGo': 'Come back, {old}! Go, {new}!',
  'battle.sentOut': '{trainer} sent out {name}!',
  'battle.cantCatchTrainer': 'You can’t catch another trainer’s Pokémon!',
  'battle.raidBarrier': 'The raid Pokémon is protected by a barrier of wild energy!',
  'battle.restored': '{name} restored {hp} HP!',
  'battle.threw': 'You threw a {ball}!',
  'battle.gotcha': 'Gotcha! {name} was caught!',
  'battle.brokeFree': 'Oh no! {name} broke free!',
  'battle.caughtTitle': '{name} was caught!',
  'battle.caughtDescParty': 'A new friend joined your party. The Pokédex has been updated.',
  'battle.caughtDescBox': 'Your party is full, so your new friend was sent to the reserve box.',
  'battle.victory': 'Victory!',
  'battle.trainerDefeated': '{name} defeated!',
  'battle.earnedTrainer': 'You earned {coins} coins and {xp} XP.',
  'battle.earnedWild': '{name} earned {xp} XP. The wilds grow quiet again.',
  'battle.faintedChoose': '{name} fainted! Choose another Pokémon.',
  'battle.teamExhausted': 'Your team is exhausted...',
  'battle.teamExhaustedDesc': 'You hurried back to the Verdant Hollow Pokémon Center. Your team has been fully healed.',
  'battle.noRunTrainer': 'There’s no running from a trainer battle!',
  'battle.ran': 'Got away safely!',
  'battle.couldntRun': 'Couldn’t get away!',
  'battle.exhaustedTitle': 'Your team is exhausted',
  'battle.exhaustedBody': 'Visit the Pokémon Center first.',
  'battle.effSuper': ' · super effective',
  'battle.effNone': ' · no effect',
  'battle.effResisted': ' · resisted',
  'battle.pwr': 'PWR',
  'battle.acc': 'ACC',
  'battle.pp': 'PP',
  'battle.hp': 'HP',
  'battle.raidName': 'Rayquaza',
  'battle.returnVerdant': 'Verdant Hollow'
};

const FR = {
  'app.title': 'Terraverse — MMORPG de créatures en monde ouvert',
  'app.description': 'Terraverse — un MMORPG de créatures en monde ouvert. Explorez, capturez, combattez et vivez l’aventure avec des dresseurs du monde entier.',
  'boot.sub': 'Réveil de la nature sauvage...',
  'boot.error': 'Les terres sauvages sont inaccessibles.',
  'brand.tagline': 'MMORPG MONDE OUVERT',
  'hud.exploring': 'VOUS EXPLOREZ',
  'hud.online': 'en ligne',
  'hud.you': 'Vous',
  'hud.trainers': 'Dresseurs',
  'hud.wild': 'Sauvages',
  'hud.profileOnline': '● En ligne',
  'hud.coinsTitle': 'Pièces de dresseur',
  'nav.social': 'Dresseurs à proximité',
  'nav.map': 'Carte du monde',
  'nav.sound': 'Activer/désactiver le son',
  'nav.settings': 'Paramètres',
  'nav.language': 'Changer de langue',
  'rank.ranger': 'RANGER',
  'quest.main': 'QUÊTE PRINCIPALE',
  'quest.chapter': 'CH. 01',
  'quest.title': 'Un nouveau voyage',
  'quest.desc': 'Le professeur Alder attend près du laboratoire. Quelque chose s’agite dans les terres sauvages verdoyantes.',
  'quest.objTalk': 'Parler au professeur Alder',
  'quest.objCatch': 'Capturer 3 Pokémon sauvages',
  'quest.objLevel': 'Atteindre le niveau de dresseur 15',
  'quest.rewards': 'RÉCOMPENSES',
  'event.kicker': 'ÉVÉNEMENT MONDIAL',
  'event.title': 'Apparition du serpent céleste',
  'event.desc': 'Rayquaza tournoie au-dessus du Pic de la Victoire. Rejoignez 47 dresseurs au sommet.',
  'event.join': 'Rejoindre le raid',
  'event.trainers': '{n} dresseurs',
  'event.live': 'EN DIRECT',
  'mm.local': 'CARTE LOCALE',
  'party.title': 'VOTRE ÉQUIPE',
  'party.manage': 'Gérer',
  'party.key': 'équipe',
  'chat.global': 'MONDIAL',
  'chat.local': 'LOCAL',
  'chat.party': 'ÉQUIPE',
  'chat.shard': 'FRAGMENT 07',
  'chat.placeholder': 'Dites quelque chose au monde...',
  'chat.send': 'ENVOYER',
  'hotbar.ball': 'Poké Ball',
  'hotbar.great': 'Super Ball',
  'hotbar.potion': 'Potion',
  'hotbar.bag': 'Sac (B)',
  'hotbar.party': 'Équipe (P)',
  'hotbar.dex': 'Pokédex (D)',
  'hotbar.map': 'Carte du monde (M)',
  'hotbar.emote': 'Roue d’émotes',
  'hotbar.emoteLabel': 'Émote',
  'hint.move': 'déplacer',
  'hint.sprint': 'sprinter',
  'hint.interact': 'interagir',
  'touch.interact': 'Interagir',
  'touch.catch': 'Capturer',
  'touch.bag': 'Sac',
  'touch.party': 'Équipe',
  'touch.dex': 'Dex',
  'touch.map': 'Carte',
  'touch.quests': 'Quêtes',
  'touch.chat': 'Chat',
  'zone.entering': 'ENTRÉE DANS',
  'interact.engage': 'Affronter {name} · Niv. {level}',
  'interact.talk': 'Parler à {name}',
  'misc.lv': 'Niv. {n}',
  'misc.lead': 'TÊTE',
  'misc.emptySlot': 'Emplacement vide',
  'misc.online': 'En ligne',
  'misc.explorer': 'Explorateur',
  'misc.fieldNotes': 'NOTES DE TERRAIN',
  'misc.open': 'OUVERT',
  'misc.fieldResearch': 'RECHERCHE DE TERRAIN',
  'misc.trail': 'SENTIER',
  'misc.you': 'VOUS',
  'misc.close': 'Fermer',
  'misc.level': 'NIVEAU',
  'misc.hp': 'PV',
  'misc.nextLevel': 'PROCHAIN NIVEAU',
  'misc.nature': 'NATURE {nature}',
  'misc.legendaryDesc': 'Un Pokémon légendaire. Sa présence transforme l’air autour de lui.',
  'misc.regularDesc': 'Capturé dans les terres sauvages de Terraverse. Il vous fait confiance un peu plus à chaque combat.',

  'toast.welcomeTitle': 'Bienvenue dans Terraverse',
  'toast.welcomeBody': 'ZQSD pour bouger · E pour interagir · Maj pour sprinter',
  'toast.dailyTitle': 'Bonus quotidien de terrain',
  'toast.dailyBody': '+3 Poké Balls ajoutées à votre sac.',
  'toast.soundOnTitle': 'Son activé',
  'toast.soundOnBody': 'La nature sauvage a de nouveau une bande-son.',
  'toast.soundOffTitle': 'Son coupé',
  'toast.soundOffBody': 'Vous pouvez toujours entendre vos propres pensées.',
  'toast.helpTitle': 'Creux Verdoyant',
  'toast.helpBody': 'Approchez-vous d’un dresseur ou d’un Pokémon sauvage, puis appuyez sur E.',
  'toast.noWildTitle': 'Aucun Pokémon sauvage à proximité',
  'toast.noWildBody': 'Approchez-vous d’une créature sauvage pour l’affronter.',
  'toast.languageTitle': 'Langue changée',
  'toast.languageBody': 'Terraverse est maintenant en français.',
  'toast.leadChangedTitle': 'Pokémon de tête changé',
  'toast.leadChangedBody': '{name} vous suit désormais dans le monde.',
  'toast.healedTitle': '{name} soigné',
  'toast.healedBody': '+{hp} PV · {cur}/{max}',
  'toast.fullHpTitle': 'Déjà au maximum de PV',
  'toast.fullHpBody': '{name} n’a pas besoin de soins pour le moment.',
  'toast.noHealingTitle': 'Aucun objet de soin',
  'toast.noHealingBody': 'Visitez le Marché Wildwind pour des Potions.',
  'toast.outOfStockTitle': 'Rupture de stock',
  'toast.outOfStockBody': 'Vous n’avez plus de {name}.',
  'toast.ballReadyTitle': '{name} prête',
  'toast.ballReadyBody': '{count} dans le sac · engagez un Pokémon sauvage pour l’utiliser.',
  'toast.itemActivatedTitle': '{name} activé',
  'toast.itemActivatedBody': 'Continuez d’explorer — cet objet trouvera son moment.',
  'toast.lureBody': 'Les Pokémon sauvages rares sont attirés par votre odeur pendant 10 minutes.',
  'toast.boughtTitle': '{name} acheté',
  'toast.boughtBody': '−{price} pièces · ×{count} dans le sac',
  'toast.notEnoughTitle': 'Pas assez de pièces',
  'toast.notEnoughBody': 'Il vous manque {amount}.',
  'toast.inviteCopiedTitle': 'Invitation copiée',
  'toast.inviteCopiedBody': 'Partagez le code du fragment avec un ami.',
  'toast.emoteSentTitle': 'Émote envoyée',
  'toast.emoteSentBody': '{name} !',
  'toast.fieldSuppliesTitle': 'Provisions de terrain reçues',
  'toast.fieldSuppliesBody': '+10 Poké Balls · quête mise à jour',
  'toast.teamHealedTitle': 'Équipe soignée',
  'toast.teamHealedBody': 'Tous les Pokémon ont leurs PV au maximum.',
  'toast.nurseHealedTitle': 'Votre équipe est entièrement soignée',
  'toast.nurseHealedBody': 'L’infirmière Joy vous adresse un sourire chaleureux.',
  'toast.arrivedTitle': 'Arrivée à {name}',
  'toast.arrivedBody': '{subtitle}',
  'toast.waveTitle': 'Émote envoyée',
  'toast.waveBody': 'Vous saluez {name}.',

  'level.trainerTitle': 'Niveau de dresseur {level} !',
  'level.trainerBody': 'Nouveau rang de terrain débloqué. Votre équipe se sent inspirée.',
  'level.monTitle': '{name} atteint {lv} !',
  'level.monBody': '+{n} niveau{s} · statistiques augmentées',
  'level.evolveTitle': '{from} a évolué !',
  'level.evolveBody': 'Dites bonjour à {to}.',
  'quest.completeTitle': 'Quête principale terminée',
  'quest.completeBody': '+800 pièces · +10 Poké Balls',
  'quest.side1Title': 'Quête annexe terminée',
  'quest.side1Body': 'Un Poussacha timide · +450 pièces · +3 Super Balls',
  'quest.side2Title': 'Quête annexe terminée',
  'quest.side2Body': 'Le gardien du phare · +650 pièces · +2 Super Potions',
  'quest.raidTitle': 'Raid terminé',
  'quest.raidBody': 'Apparition du serpent céleste · +2 500 pièces · +5 Hyper Balls',
  'quest.claimedTitle': 'Un nouveau voyage',
  'quest.claimedDesc': 'Chapitre terminé. La route du Pic de la Victoire est ouverte — et quelque chose attend au sommet.',
  'battle.rivalTitle': 'Rival vaincu',
  'battle.rivalBody': 'Kai s’éloigne vers le Pic de la Victoire. Quelque chose vous dit que ce n’est pas fini.',
  'battle.trainerWinTitle': 'Victoire contre {name} !',
  'battle.trainerWinBody': '+{prize} pièces · votre équipe devient plus forte.',
  'battle.raidWinTitle': 'Rayquaza bat en retraite !',
  'battle.raidWinBody': 'Le ciel se dégage au-dessus du Pic de la Victoire. Récompenses du raid livrées.',
  'battle.defeatTitle': 'Retour en sécurité',
  'battle.defeatBody': 'L’infirmière Joy a soigné votre équipe. Vous avez perdu {loss} pièces.',
  'chat.joinedShard': 'a rejoint le fragment.',
  'chat.sameShard': 'explore le même fragment.',

  'weather.snow': 'Averses de neige',
  'weather.volcano': 'Brume de cendres',
  'weather.coast': 'Brise marine',
  'weather.swamp': 'Brume basse',
  'weather.forest': 'Soleil filtré',
  'weather.lake': 'Ciel dégagé',
  'weather.default': 'Ensoleillé',

  'chat.title': 'Chat du fragment',
  'chat.subtitle': '{count} dresseurs en ligne · fragment 07',
  'chat.placeholderShort': 'Dites quelque chose...',
  'chat.footer': 'Le chat se synchronise entre les onglets de ce fragment.',
  'chat.closeHint': 'fermer',
  'chat.modalSend': 'ENVOYER',

  'dex.title': 'Pokédex',
  'dex.subtitle': '{caught} capturés · {seen} vus · {total} espèces enregistrées',
  'dex.search': 'Rechercher par nom ou numéro...',
  'dex.all': 'TOUT',
  'dex.gen': 'GÉN {n}',
  'dex.caught': 'CAPTURÉS',
  'dex.seen': 'VUS',
  'dex.completion': 'COMPLÉTION',
  'dex.migration': 'MIGRATION',
  'dex.allGen': 'TOUTES GÉN',
  'dex.tip': 'Astuce : chaque espèce peut apparaître grâce à la migration sauvage rotative.',
  'dex.detailSubtitle': 'Dex national #{num} · Génération {gen}',
  'dex.unknown': 'Pokémon inconnu',
  'dex.unknownHint': 'Enregistrez ce Pokémon dans le Pokédex pour révéler ses notes de terrain.',
  'dex.desc': '{name} est un Pokémon de type {types}, documenté pour la première fois à la génération {gen}. {extra}',
  'dex.legendaryExtra': 'Une présence légendaire qui n’apparaîtrait que lors des grands bouleversements sauvages.',
  'dex.mythicalExtra': 'Un Pokémon mythique évoqué dans des fragments de vieux carnets de terrain.',
  'dex.regularExtra': 'Il s’est adapté aux migrations sauvages de Terraverse et peut être trouvé dans plusieurs biomes.',
  'dex.catchRate': 'Taux de capture',
  'dex.legendary': 'Légendaire',
  'dex.mythical': 'Fabuleux',
  'dex.evolvesAt': 'Évolue au niveau {level} → {name}',
  'dex.evolvesFrom': 'Évolue de {name}',
  'dex.caughtStatus': 'Capturé ✓',
  'dex.seenStatus': 'Vu dans la nature',
  'dex.notSeenStatus': 'Pas encore rencontré',
  'dex.back': 'Retour au Pokédex',
  'dex.statHp': 'PV',
  'dex.statAtk': 'ATTAQUE',
  'dex.statDef': 'DÉFENSE',
  'dex.statSpa': 'ATT. SPÉ',
  'dex.statSpd': 'DÉF. SPÉ',
  'dex.statSpe': 'VITESSE',

  'party.title': 'Votre équipe',
  'party.subtitle': '{count} emplacements sur 6 occupés · {box} en réserve',
  'party.footer': 'Le Pokémon de tête vous suit dans le monde.',
  'party.setLead': 'Mettre en tête',
  'party.hp': 'PV',
  'party.lead': 'TÊTE',
  'party.empty': 'Emplacement vide',

  'bag.title': 'Sac de terrain',
  'bag.subtitle': '{count} objets · {coins} pièces',
  'bag.notesTitle': 'NOTES DE TERRAIN',
  'bag.notes': 'Les <b>Poké Balls</b> sont consommées lorsque vous les lancez en combat. Affaiblissez d’abord un Pokémon sauvage pour augmenter vos chances.<br><br>Les <b>Potions</b> peuvent être utilisées ici ou depuis la barre rapide pour soigner votre Pokémon de tête.<br><br>Votre sac est partagé sur le fragment et sauvegardé automatiquement.',
  'bag.footer': 'Cliquez sur un objet pour l’utiliser ou le préparer.',
  'bag.visitMarket': 'Visiter le marché',

  'map.title': 'Carte du monde',
  'map.subtitle': 'Terraverse · Fragment 07 · toutes les régions cartographiées',
  'map.fastTravel': 'VOYAGE RAPIDE',
  'map.travel': 'VOYAGER',
  'map.openWorld': '<b>Monde ouvert :</b> {tip}',
  'map.footer': 'Le voyage rapide est gratuit pendant le Festival du Ciel.',
  'map.levels': 'Niv. {min}–{max} · {biome}',

  'quests.title': 'Journal de quêtes',
  'quests.subtitle': 'Histoire principale, demandes de terrain et événements mondiaux',
  'quests.claimed': '✓ Récompenses récupérées',
  'quests.rewards': 'RÉCOMPENSES · {rewards}',
  'quests.claim': 'Récupérer',
  'quests.footer': 'Les quêtes se mettent à jour automatiquement pendant l’exploration.',
  'quests.closeHint': 'fermer',

  'shop.title': 'Marché Wildwind',
  'shop.subtitle': 'Le comptoir usé par les chemins de Mara',
  'shop.today': 'SPÉCIALITÉ DU JOUR',
  'shop.eeveeTitle': 'Kit de terrain Évoli',
  'shop.eeveeDesc': 'Super Ball ×3 · Potion ×2 · Baie Oran ×2',
  'shop.rangerTitle': 'Pack de départ Ranger',
  'shop.rangerDesc': 'Poké Ball ×10 · Super Potion ×1',
  'shop.maraNote': 'Mara n’achète rien, mais elle raconte volontiers où elle a trouvé ses trouvailles.',
  'shop.coins': 'Vos pièces : <b style="color:#ffb254">{coins}</b>',
  'shop.priceCoins': '{amount} pièces',
  'shop.delivery': 'Les objets sont livrés instantanément.',
  'shop.buy': 'ACHETER',

  'social.title': 'Dresseurs à proximité',
  'social.subtitle': '{count} en ligne · fragment 07 · {zone}',
  'social.realTrainer': 'VRAI DRESSEUR',
  'social.sameShard': 'Même fragment',
  'social.nearby': 'À proximité',
  'social.wave': 'Saluer',
  'social.shardStatus': 'ÉTAT DU FRAGMENT',
  'social.online': 'Dresseurs en ligne',
  'social.inZone': 'À {zone}',
  'social.parties': 'Groupes en formation',
  'social.uptime': 'Disponibilité',
  'social.inviteTitle': 'CODE D’INVITATION DU FRAGMENT',
  'social.inviteDesc': 'Ouvrez Terraverse dans un autre onglet pour voir vos amis apparaître en temps réel.',
  'social.copy': 'Copier l’invitation',
  'social.note': 'La présence et le chat en temps réel se synchronisent entre les onglets de ce fragment via BroadcastChannel.',
  'social.footer': 'Saluez les dresseurs proches pour dire bonjour.',
  'social.closeHint': 'fermer',
  'social.waveChat': 'salue {name} 👋',

  'settings.title': 'Paramètres',
  'settings.subtitle': 'Faites de Terraverse votre chez-vous',
  'settings.language': 'Langue',
  'settings.languageDesc': 'Interface, histoire, tutoriel, quêtes et dialogues.',
  'settings.sound': 'Son et musique',
  'settings.soundDesc': 'Musique d’ambiance, thèmes de combat et effets.',
  'settings.particles': 'Particules d’ambiance',
  'settings.particlesDesc': 'Pollen, neige, braises et lucioles.',
  'settings.dayNight': 'Teinte jour / nuit',
  'settings.dayNightDesc': 'Soirées chaleureuses et nuits bleu profond.',
  'settings.profile': 'Profil de dresseur',
  'settings.profileDesc': '{name} · Niveau {level} · {id}',
  'settings.guide': 'Histoire et tutoriel',
  'settings.guideDesc': 'Rejouez le chapitre d’ouverture et le guide de terrain.',
  'settings.guideButton': 'Ouvrir le guide',
  'settings.reset': 'Réinitialiser l’aventure',
  'settings.resetDesc': 'Effacez cette sauvegarde et recommencez au Creux Verdoyant.',
  'settings.resetButton': 'Réinitialiser',
  'settings.resetConfirm': 'Vraiment réinitialiser ?',
  'settings.footer': 'Terraverse v1.0 · Fragment 07 · {zone}',
  'settings.autosaved': 'Sauvegarde auto',

  'emotes.title': 'Émotes',
  'emotes.subtitle': 'Un peu de personnalité fait toute la différence',
  'emotes.footer': 'Les émotes apparaissent dans le chat local.',
  'emotes.closeHint': 'fermer',
  'emote.Wave': 'Salut', 'emote.Cheer': 'Bravo', 'emote.Dance': 'Danse',
  'emote.Sparkle': 'Étincelle', 'emote.Heart': 'Cœur', 'emote.Flex': 'Muscle',

  'raid.title': 'Apparition du serpent céleste',
  'raid.subtitle': 'Événement mondial · Pic de la Victoire · 47 dresseurs rassemblés',
  'raid.level': 'RAID LÉGENDAIRE · Niv. {level}',
  'raid.desc': 'Rayquaza est descendu à travers la trouée nuageuse au-dessus du Pic de la Victoire. L’air crépite d’énergie draconique. Rejoignez les dresseurs rassemblés et repoussez le serpent céleste dans la stratosphère.',
  'raid.trainers': 'DRESSEURS',
  'raid.timeLeft': 'TEMPS RESTANT',
  'raid.reward': 'RÉCOMPENSE',
  'raid.join': 'Rejoindre le raid',
  'raid.cleared': 'Raid déjà terminé',
  'raid.note': 'Votre équipe sera soignée après la rencontre. Impossible de fuir un raid.',
  'raid.footer': 'Événement mondial du Festival du Ciel',
  'raid.closeHint': 'fermer',

  'dialogue.continue': 'Continuer',
  'dialogue.close': 'Fermer',
  'dialogue.heal': 'Soigner mon équipe',
  'dialogue.browse': 'Voir les marchandises',
  'dialogue.battle': 'Combattre',
  'dialogue.dex': 'Voir le Pokédex',

  'tutorial.title': 'Guide de terrain',
  'tutorial.subtitle': 'Chapitre 1 · Un nouveau voyage',
  'tutorial.storyTitle': 'Le vent a changé',
  'tutorial.story': 'Depuis trois jours, le vent au-dessus du Creux Verdoyant porte une étrange charge électrique. Le professeur Alder pense que les migrations sauvages se déplacent — et que quelque chose d’ancien s’éveille au-dessus du Pic de la Victoire. Votre voyage commence au laboratoire, avec une poignée de Poké Balls et une équipe qui vous fait confiance.',
  'tutorial.stepMoveTitle': 'Explorez le monde',
  'tutorial.stepMove': 'Utilisez ZQSD ou les flèches pour vous déplacer. Maintenez Maj pour sprinter. Sur mobile, utilisez le joystick.',
  'tutorial.stepInteractTitle': 'Parlez et engagez',
  'tutorial.stepInteract': 'Appuyez sur E près d’un dresseur pour parler, ou près d’un Pokémon sauvage pour lancer un combat. Cliquer sur une créature fonctionne aussi.',
  'tutorial.stepCatchTitle': 'Capturez de nouveaux amis',
  'tutorial.stepCatch': 'Affaiblissez un Pokémon sauvage, puis lancez une Poké Ball. Moins il a de PV et plus son état est altéré, plus vos chances augmentent.',
  'tutorial.stepBattleTitle': 'Gagnez les combats',
  'tutorial.stepBattle': 'Les affinités de type décident du combat. Les capacités super efficaces infligent des dégâts doublés. Changez de Pokémon si votre tête est en danger.',
  'tutorial.stepGrowTitle': 'Faites grandir votre légende',
  'tutorial.stepGrow': 'Terminez des quêtes, faites monter votre équipe de niveau et affrontez le raid du serpent céleste au Pic de la Victoire.',
  'tutorial.controls': 'ZQSD déplacer · Maj sprinter · E interagir · P équipe · D Pokédex · M carte · B sac · J quêtes',
  'tutorial.start': 'Commencer l’exploration',
  'tutorial.reopen': 'Vous pouvez rouvrir ce guide depuis les Paramètres à tout moment.',

  'result.continue': 'Continuer l’exploration',
  'result.level': 'NIVEAU',
  'result.dex': 'DEX',
  'result.hp': 'PV',
  'result.xp': 'XP',
  'result.levelUp': 'NIVEAU +',
  'result.coins': 'PIÈCES',
  'result.return': 'RETOUR',
  'battle.trainerMode': 'COMBAT DE DRESSEUR',
  'battle.raidMode': 'COMBAT DE RAID',
  'battle.wildMode': 'RENCONTRE SAUVAGE',
  'battle.exit': 'Quitter le combat',
  'battle.wildStatus': 'SAUVAGE',
  'battle.trainerStatus': 'DRESSEUR',
  'battle.raidStatus': 'BOSS DE RAID',
  'battle.shinyStatus': '✦ CHROMATIQUE',
  'battle.ready': 'PRÊT',
  'battle.actions': 'ACTIONS DE COMBAT',
  'battle.catch': 'Capturer un Pokémon',
  'battle.switch': 'Changer',
  'battle.bag': 'Sac',
  'battle.run': 'Fuir',
  'battle.hint': 'Les affinités de type décident du combat. Utilisez des capacités super efficaces !',
  'battle.throwBall': 'Lancer une ball',
  'battle.useItem': 'Utiliser un objet',
  'battle.catchHint': 'Moins de PV et un état altéré améliorent votre taux de capture.',
  'battle.itemHint': '{name} a {hp} / {max} PV.',
  'battle.noItems': 'Plus d’objets. Visitez le marché.',
  'battle.back': 'Retour',
  'battle.switchTitle': 'Changer de Pokémon',
  'battle.switchHint': 'Choisissez un coéquipier en bonne santé.',
  'battle.chooseMove': 'Choisissez votre capacité !',
  'battle.whatDo': 'Que voulez-vous faire ?',
  'battle.challenge': '{name} vous défie !',
  'battle.wildAppeared': 'Un Pokémon sauvage apparaît : {name} !',
  'battle.used': '{name} utilise {move} !',
  'battle.missed': 'L’attaque de {name} a raté !',
  'battle.noEffect': 'Cela n’a aucun effet...',
  'battle.crit': 'Coup critique ! {dmg} dégâts.',
  'battle.super': 'C’est super efficace ! {dmg} dégâts.',
  'battle.notVery': 'Ce n’est pas très efficace... {dmg} dégâts.',
  'battle.tookDamage': '{name} subit {dmg} dégâts.',
  'battle.superTook': 'C’est super efficace ! {name} subit {dmg} dégâts.',
  'battle.notVeryTook': 'Ce n’est pas très efficace... {dmg} dégâts.',
  'battle.comeBackGo': 'Reviens, {old} ! Vas-y, {new} !',
  'battle.sentOut': '{trainer} envoie {name} !',
  'battle.cantCatchTrainer': 'Vous ne pouvez pas capturer le Pokémon d’un autre dresseur !',
  'battle.raidBarrier': 'Le Pokémon de raid est protégé par une barrière d’énergie sauvage !',
  'battle.restored': '{name} récupère {hp} PV !',
  'battle.threw': 'Vous lancez une {ball} !',
  'battle.gotcha': 'Et voilà ! Capture réussie : {name} !',
  'battle.brokeFree': 'Oh non ! {name} s’échappe de la Ball !',
  'battle.caughtTitle': 'Capture réussie : {name} !',
  'battle.caughtDescParty': 'Un nouvel ami rejoint votre équipe. Le Pokédex a été mis à jour.',
  'battle.caughtDescBox': 'Votre équipe est complète : votre nouvel ami a été envoyé dans la boîte de réserve.',
  'battle.victory': 'Victoire !',
  'battle.trainerDefeated': 'Victoire contre {name} !',
  'battle.earnedTrainer': 'Vous gagnez {coins} pièces et {xp} XP.',
  'battle.earnedWild': '{name} gagne {xp} XP. La nature retrouve son calme.',
  'battle.faintedChoose': '{name} est K.O. ! Choisissez un autre Pokémon.',
  'battle.teamExhausted': 'Votre équipe est épuisée...',
  'battle.teamExhaustedDesc': 'Vous êtes rentré en hâte au Centre Pokémon du Creux Verdoyant. Votre équipe a été entièrement soignée.',
  'battle.noRunTrainer': 'Impossible de fuir un combat de dresseur !',
  'battle.ran': 'Vous vous êtes échappé !',
  'battle.couldntRun': 'Impossible de s’échapper !',
  'battle.exhaustedTitle': 'Votre équipe est épuisée',
  'battle.exhaustedBody': 'Visitez d’abord le Centre Pokémon.',
  'battle.effSuper': ' · super efficace',
  'battle.effNone': ' · aucun effet',
  'battle.effResisted': ' · résisté',
  'battle.pwr': 'PUIS',
  'battle.acc': 'PRÉC',
  'battle.pp': 'PP',
  'battle.hp': 'PV',
  'battle.raidName': 'Rayquaza',
  'battle.returnVerdant': 'Creux Verdoyant'
};

const DICT = { en: EN, fr: FR };
