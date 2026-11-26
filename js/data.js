export const GRID = 20;
export const SAVE_KEY = "snox-kingdom-save-v1";
export const BUILDERS = 2;

export const RESOURCE_LABELS = {
  gold: "Or",
  elixir: "Élixir",
  gems: "Gemmes",
};

export const BUILDINGS = {
  townhall: {
    name: "Hôtel du Royaume",
    short: "Hôtel du Royaume",
    eyebrow: "CŒUR DU ROYAUME",
    size: [3, 3],
    maxLevel: 8,
    hp: 820,
    desc: "Le cœur de ton royaume. Son niveau débloque les améliorations et attire les chefs les plus vaillants.",
    category: "core",
    unique: true,
    buildCost: null,
    upgradeGold: 1300,
    upgradeElixir: 0,
    upgradeScale: 1.72,
    buildSeconds: 0,
    upgradeSeconds: 18,
    accent: "#ffd15d",
  },
  goldmine: {
    name: "Mine d'or",
    short: "Mine d'or",
    eyebrow: "PRODUCTION",
    size: [2, 2],
    maxLevel: 8,
    hp: 420,
    desc: "Une veine dorée au cœur de la roche. Produit de l'or en continu, même quand tu es hors ligne.",
    category: "resource",
    resource: "gold",
    rate: 0.75,
    capacity: 340,
    buildCost: { gold: 380 },
    upgradeGold: 420,
    upgradeElixir: 0,
    upgradeScale: 1.62,
    buildSeconds: 8,
    upgradeSeconds: 10,
    limit: 4,
    accent: "#ffd15d",
  },
  elixirpump: {
    name: "Pompe à élixir",
    short: "Pompe à élixir",
    eyebrow: "PRODUCTION",
    size: [2, 2],
    maxLevel: 8,
    hp: 380,
    desc: "Aspire l'élixir rose des profondeurs. Une ressource précieuse pour entraîner ton armée.",
    category: "resource",
    resource: "elixir",
    rate: 0.62,
    capacity: 320,
    buildCost: { gold: 380 },
    upgradeGold: 420,
    upgradeElixir: 0,
    upgradeScale: 1.62,
    buildSeconds: 8,
    upgradeSeconds: 10,
    limit: 4,
    accent: "#e47fff",
  },
  vault: {
    name: "Coffre du royaume",
    short: "Coffre du royaume",
    eyebrow: "STOCKAGE",
    size: [2, 2],
    maxLevel: 8,
    hp: 600,
    desc: "Un coffre blindé qui protège ton or et augmente la capacité de stockage du royaume.",
    category: "resource",
    buildCost: { gold: 700 },
    upgradeGold: 720,
    upgradeElixir: 0,
    upgradeScale: 1.7,
    buildSeconds: 12,
    upgradeSeconds: 14,
    limit: 2,
    accent: "#ffd15d",
  },
  elixirstore: {
    name: "Réserve d'élixir",
    short: "Réserve d'élixir",
    eyebrow: "STOCKAGE",
    size: [2, 2],
    maxLevel: 8,
    hp: 560,
    desc: "Une cuve cristalline qui conserve ton élixir et repousse les pillards.",
    category: "resource",
    buildCost: { gold: 700 },
    upgradeGold: 720,
    upgradeElixir: 0,
    upgradeScale: 1.7,
    buildSeconds: 12,
    upgradeSeconds: 14,
    limit: 2,
    accent: "#e47fff",
  },
  barracks: {
    name: "Caserne",
    short: "Caserne",
    eyebrow: "ARMÉE",
    size: [2, 2],
    maxLevel: 8,
    hp: 460,
    desc: "Le quartier des troupes. Entraîne tes combattants et prépare la prochaine expédition.",
    category: "army",
    buildCost: { elixir: 450 },
    upgradeGold: 0,
    upgradeElixir: 540,
    upgradeScale: 1.66,
    buildSeconds: 10,
    upgradeSeconds: 12,
    limit: 2,
    accent: "#ff9a6c",
  },
  camp: {
    name: "Camp d'armée",
    short: "Camp d'armée",
    eyebrow: "ARMÉE",
    size: [2, 2],
    maxLevel: 8,
    hp: 350,
    desc: "Tes troupes y montent la garde. Chaque camp augmente la capacité de ton armée.",
    category: "army",
    buildCost: { elixir: 400 },
    upgradeGold: 0,
    upgradeElixir: 480,
    upgradeScale: 1.66,
    buildSeconds: 9,
    upgradeSeconds: 11,
    limit: 3,
    accent: "#ffb06f",
  },
  cannon: {
    name: "Canon de pierre",
    short: "Canon de pierre",
    eyebrow: "DÉFENSE",
    size: [2, 2],
    maxLevel: 8,
    hp: 440,
    damage: 18,
    range: 3.4,
    buildCost: { gold: 650 },
    upgradeGold: 620,
    upgradeElixir: 0,
    upgradeScale: 1.67,
    buildSeconds: 11,
    upgradeSeconds: 12,
    limit: 4,
    accent: "#ffb466",
  },
  tower: {
    name: "Tour de guet",
    short: "Tour de guet",
    eyebrow: "DÉFENSE",
    size: [2, 2],
    maxLevel: 8,
    hp: 510,
    damage: 14,
    range: 4.3,
    buildCost: { gold: 950 },
    upgradeGold: 880,
    upgradeElixir: 0,
    upgradeScale: 1.68,
    buildSeconds: 15,
    upgradeSeconds: 16,
    limit: 3,
    accent: "#74e5ef",
  },
  wall: {
    name: "Mur de pierre",
    short: "Mur de pierre",
    eyebrow: "DÉFENSE",
    size: [1, 1],
    maxLevel: 6,
    hp: 260,
    damage: 0,
    range: 0,
    buildCost: { gold: 120 },
    upgradeGold: 130,
    upgradeElixir: 0,
    upgradeScale: 1.55,
    buildSeconds: 2,
    upgradeSeconds: 3,
    limit: 48,
    accent: "#a9b9c9",
  },
  hut: {
    name: "Cabane d'artisan",
    short: "Cabane d'artisan",
    eyebrow: "ROYAUME",
    size: [1, 1],
    maxLevel: 1,
    hp: 260,
    desc: "Un artisan fidèle vit ici. Chaque cabane ajoute un ouvrier à ton royaume.",
    category: "special",
    buildCost: { gold: 500 },
    upgradeGold: 0,
    upgradeElixir: 0,
    upgradeScale: 1,
    buildSeconds: 9,
    upgradeSeconds: 0,
    limit: 2,
    accent: "#8ce89c",
  },
  portal: {
    name: "Portail des alliés",
    short: "Portail des alliés",
    eyebrow: "ALLIANCE",
    size: [2, 2],
    maxLevel: 5,
    hp: 620,
    desc: "Un ancien portail qui relie ton royaume à ton alliance. Les renforts arrivent par ici.",
    category: "special",
    buildCost: { elixir: 800 },
    upgradeGold: 0,
    upgradeElixir: 900,
    upgradeScale: 1.7,
    buildSeconds: 14,
    upgradeSeconds: 18,
    limit: 1,
    accent: "#7ceaf3",
  },
  amberTree: {
    name: "Arbre d'ambre",
    short: "Arbre d'ambre",
    eyebrow: "DÉCORATION",
    size: [1, 1],
    maxLevel: 1,
    hp: 0,
    desc: "Un arbre lumineux qui donne un peu de magie à ton royaume.",
    category: "decor",
    buildCost: { gold: 180 },
    upgradeGold: 0,
    upgradeElixir: 0,
    buildSeconds: 1,
    limit: 12,
    accent: "#ffc15e",
  },
  snoxTotem: {
    name: "Totem Snox",
    short: "Totem Snox",
    eyebrow: "DÉCORATION",
    size: [1, 1],
    maxLevel: 1,
    hp: 0,
    desc: "Le totem des fondateurs. Un symbole de ton Snox ID, visible de tous.",
    category: "decor",
    buildCost: { gems: 15 },
    upgradeGold: 0,
    upgradeElixir: 0,
    buildSeconds: 1,
    limit: 4,
    accent: "#6decc3",
  },
};

export const SHOP_CATEGORIES = [
  { id: "resource", label: "Ressources" },
  { id: "defense", label: "Défenses" },
  { id: "army", label: "Armée" },
  { id: "special", label: "Spécial" },
  { id: "decor", label: "Déco" },
];

export const TROOPS = {
  ronce: {
    name: "Ronce",
    role: "Briseur",
    desc: "Un combattant fougueux qui fonce sur tout ce qui bouge. Parfait pour ouvrir la voie.",
    cost: 25,
    housing: 1,
    hp: 92,
    dps: 17,
    speed: 2.5,
    range: 0.55,
    color: "#ff8b55",
    accent: "#ffd36b",
    favorite: "any",
  },
  plume: {
    name: "Plume",
    role: "Tireuse",
    desc: "Rapide et précise, elle harcèle les défenses à distance. Fragile, mais redoutable en nombre.",
    cost: 42,
    housing: 1,
    hp: 58,
    dps: 14,
    speed: 2.9,
    range: 3.2,
    color: "#64e5df",
    accent: "#ffe178",
    favorite: "any",
  },
  colosse: {
    name: "Colosse",
    role: "Tank",
    desc: "Une montagne de muscles qui adore casser les canons. Envoie-le en premier.",
    cost: 240,
    housing: 5,
    hp: 560,
    dps: 27,
    speed: 1.35,
    range: 0.8,
    color: "#c98bff",
    accent: "#ffd15f",
    favorite: "defense",
  },
};

export const TROOP_ORDER = ["ronce", "plume", "colosse"];

export const MISSIONS = [
  { id: "collect", title: "Récolter 500 or", hint: "Touche une mine pour collecter", target: 500, reward: 15, icon: "coin" },
  { id: "upgrade", title: "Améliorer un bâtiment", hint: "Ouvre un bâtiment puis améliore-le", target: 1, reward: 20, icon: "hammer" },
  { id: "battle", title: "Gagner une bataille", hint: "Attaque un royaume voisin", target: 1, reward: 30, icon: "swords" },
];

export const OPPONENT_NAMES = [
  "Dame Kora", "Chef Malvo", "Nyx la Rusée", "Barbe-de-Fer", "Sylva",
  "Rok Poing-Lourd", "Mira des Brumes", "Le Borgne", "Tao l'Éclair", "Vesper",
  "Grim le Rouge", "Aurore", "Kael", "Brume", "Titan", "Onyx",
];

export const CLAN_MEMBERS = [
  { name: "Aurore", role: "Cheffe", msg: "Le portail est ouvert ! Qui part en expédition ce soir ?", color: "#ffcf65" },
  { name: "Rok", role: "Vétéran", msg: "J'ai repéré une base avec 900 or et personne aux canons.", color: "#7fe6ee" },
  { name: "Mira", role: "Archère", msg: "Je garde le flanc nord. Personne ne passe. 😌", color: "#e49bff" },
];

export const MISSION_ICONS = {
  coin: "i-coin",
  hammer: "i-hammer",
  swords: "i-swords",
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function formatNumber(value) {
  const n = Math.floor(Number(value) || 0);
  return n.toLocaleString("fr-FR").replace(/\u202f/g, " ");
}

export function formatCompact(value) {
  const n = Number(value) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(".", ",") + " M";
  if (n >= 10000) return Math.round(n / 1000) + " k";
  return formatNumber(n);
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m} min ${r} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function buildingUpgradeCost(type, level) {
  const def = BUILDINGS[type];
  if (!def || !def.upgradeScale) return { gold: 0, elixir: 0, gems: 0 };
  const scale = Math.pow(def.upgradeScale, Math.max(0, level - 1));
  return {
    gold: Math.round((def.upgradeGold || 0) * scale / 10) * 10,
    elixir: Math.round((def.upgradeElixir || 0) * scale / 10) * 10,
    gems: 0,
  };
}

export function upgradeSeconds(type, level) {
  const def = BUILDINGS[type];
  if (!def) return 0;
  return Math.max(3, Math.round(def.upgradeSeconds * Math.pow(1.26, Math.max(0, level - 1))));
}

export function buildSeconds(type) {
  return BUILDINGS[type]?.buildSeconds || 4;
}

export function getStorageCaps(state) {
  const th = state.buildings.find((b) => b.type === "townhall");
  const level = th?.level || 1;
  const vaults = state.buildings.filter((b) => b.type === "vault" && b.built !== false);
  const stores = state.buildings.filter((b) => b.type === "elixirstore" && b.built !== false);
  return {
    gold: 6500 + level * 900 + vaults.reduce((sum, b) => sum + 1300 * b.level, 0),
    elixir: 6500 + level * 900 + stores.reduce((sum, b) => sum + 1300 * b.level, 0),
  };
}

export function getArmyCap(state) {
  const camps = state.buildings.filter((b) => b.type === "camp" && b.built !== false);
  return 18 + camps.reduce((sum, b) => sum + 8 * b.level, 0);
}

export function armyHousing(state) {
  return TROOP_ORDER.reduce((sum, id) => sum + (state.army[id] || 0) * TROOPS[id].housing, 0);
}

export function xpForLevel(level) {
  return 90 + level * 55;
}

export function makeSnoxId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `SNOX-${part()}-${part()}`;
}

export function seededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeDefaultState() {
  const buildings = [];
  let id = 0;
  const add = (type, x, y, level = 1, extra = {}) => {
    buildings.push({ id: `b${++id}`, type, x, y, level, built: true, ...extra });
  };
  add("townhall", 8, 8, 3);
  add("goldmine", 4, 8, 2, { stored: 185, lastTick: Date.now() });
  add("goldmine", 12, 8, 2, { stored: 120, lastTick: Date.now() });
  add("goldmine", 8, 12, 2, { stored: 90, lastTick: Date.now() });
  add("elixirpump", 8, 4, 2, { stored: 150, lastTick: Date.now() });
  add("elixirpump", 12, 12, 2, { stored: 110, lastTick: Date.now() });
  add("barracks", 4, 4, 2);
  add("camp", 4, 13, 2);
  add("cannon", 13, 4, 2);
  add("tower", 4, 11, 2);
  add("hut", 15, 7, 1);
  add("vault", 14, 11, 2);
  // A stone ring around the heart of the village, with two gates.
  const ring = [];
  for (let x = 6; x <= 13; x++) {
    if (x !== 8 && x !== 11) ring.push([x, 6], [x, 13]);
  }
  for (let y = 7; y <= 12; y++) {
    if (y !== 9 && y !== 10) ring.push([6, y], [13, y]);
  }
  ring.forEach(([x, y]) => add("wall", x, y, 1));

  const now = Date.now();
  return {
    version: 1,
    createdAt: now,
    lastSaved: now,
    profile: {
      name: "Chef Nova",
      snoxId: makeSnoxId(),
      avatar: 0,
      level: 3,
      xp: 34,
      realm: "Nova",
      clan: "Lames d'Aurore",
      trophies: 128,
    },
    resources: { gold: 2450, elixir: 2180, gems: 120 },
    army: { ronce: 6, plume: 4, colosse: 1 },
    buildings,
    missions: { collect: 0, upgrade: 0, battle: 0, claimed: [] },
    builders: 2,
    sound: true,
    stats: { battlesWon: 0, battlesLost: 0, destroyed: 0, goldLooted: 0 },
    chat: [],
    nextId: id + 1,
  };
}

export function ensureStateShape(raw) {
  const state = raw && typeof raw === "object" ? raw : makeDefaultState();
  const fallback = makeDefaultState();
  state.profile = { ...fallback.profile, ...(state.profile || {}) };
  state.resources = { ...fallback.resources, ...(state.resources || {}) };
  state.army = { ...fallback.army, ...(state.army || {}) };
  state.stats = { ...fallback.stats, ...(state.stats || {}) };
  state.missions = { ...fallback.missions, ...(state.missions || {}), claimed: Array.isArray(state.missions?.claimed) ? state.missions.claimed : [] };
  if (!Array.isArray(state.buildings) || !state.buildings.length) state.buildings = fallback.buildings;
  state.buildings = state.buildings.filter((b) => b && BUILDINGS[b.type]).map((b) => {
    const def = BUILDINGS[b.type];
    return {
      ...b,
      id: b.id || `b${Math.random().toString(36).slice(2)}`,
      level: Math.max(1, Math.min(def.maxLevel, Number(b.level) || 1)),
      built: b.built !== false,
    };
  });
  state.builders = Math.max(2, Number(state.builders) || 2);
  state.nextId = Math.max(Number(state.nextId) || 1, state.buildings.length + 1);
  state.chat = Array.isArray(state.chat) ? state.chat.slice(-30) : [];
  return state;
}
