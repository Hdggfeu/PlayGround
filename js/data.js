// Static game data for Pixel Forge.
// All balance numbers live here so the simulation stays easy to tune.

export const KEYS = ['g', 'a', 's', 't'];
export const DISC = {
  g: { name: 'Gameplay', short: 'G', color: '#5eead4', dim: 'rgba(94,234,212,.16)' },
  a: { name: 'Graphics', short: 'A', color: '#a78bfa', dim: 'rgba(167,139,250,.16)' },
  s: { name: 'Sound', short: 'S', color: '#f472b6', dim: 'rgba(244,114,182,.16)' },
  t: { name: 'Story', short: 'T', color: '#fbbf24', dim: 'rgba(251,191,36,.16)' },
};

export const GENRES = {
  action: {
    name: 'Action', mono: 'AC', color: ['#fb7185', '#f59e0b'],
    ideal: { g: 0.42, a: 0.25, s: 0.18, t: 0.15 },
    blurb: 'Fast, loud and explosive. Players want tight controls and spectacle.',
    likes: ['cyberpunk', 'zombies', 'ninja', 'modern', 'apocalypse'],
    dislikes: ['cute', 'history'],
  },
  rpg: {
    name: 'RPG', mono: 'RP', color: ['#a78bfa', '#6366f1'],
    ideal: { g: 0.28, a: 0.18, s: 0.16, t: 0.38 },
    blurb: 'Deep stories and endless progression. Writing carries the day.',
    likes: ['fantasy', 'scifi', 'cyberpunk', 'space', 'mystery'],
    dislikes: ['sports', 'modern'],
  },
  sim: {
    name: 'Simulation', mono: 'SM', color: ['#38bdf8', '#0ea5e9'],
    ideal: { g: 0.46, a: 0.2, s: 0.14, t: 0.2 },
    blurb: 'Systems on systems. Players forgive jank for depth and detail.',
    likes: ['modern', 'space', 'history', 'apocalypse'],
    dislikes: ['horror', 'ninja'],
  },
  strategy: {
    name: 'Strategy', mono: 'ST', color: ['#fbbf24', '#f59e0b'],
    ideal: { g: 0.4, a: 0.18, s: 0.14, t: 0.28 },
    blurb: 'Think three moves ahead. Balance and clarity beat flash.',
    likes: ['history', 'space', 'scifi', 'fantasy'],
    dislikes: ['cute', 'zombies'],
  },
  adventure: {
    name: 'Adventure', mono: 'AD', color: ['#34d399', '#10b981'],
    ideal: { g: 0.24, a: 0.22, s: 0.16, t: 0.38 },
    blurb: 'Atmosphere, characters and wonder. Story and art do the lifting.',
    likes: ['fantasy', 'mystery', 'space', 'history', 'cute'],
    dislikes: ['sports', 'zombies'],
  },
  puzzle: {
    name: 'Puzzle', mono: 'PZ', color: ['#f472b6', '#ec4899'],
    ideal: { g: 0.52, a: 0.2, s: 0.12, t: 0.16 },
    blurb: 'One more try. Just one more. Elegant mechanics are everything.',
    likes: ['cute', 'mystery', 'modern', 'space'],
    dislikes: ['horror', 'zombies'],
  },
  horror: {
    name: 'Horror', mono: 'HR', color: ['#ef4444', '#7f1d1d'],
    ideal: { g: 0.3, a: 0.2, s: 0.32, t: 0.18 },
    blurb: 'Dread you can hear. Sound design is half the scare.',
    likes: ['zombies', 'apocalypse', 'mystery', 'history'],
    dislikes: ['cute', 'sports'],
  },
  racing: {
    name: 'Racing', mono: 'RC', color: ['#22d3ee', '#3b82f6'],
    ideal: { g: 0.34, a: 0.36, s: 0.2, t: 0.1 },
    blurb: 'Speed, feel and shiny paint. Graphics and handling sell it.',
    likes: ['modern', 'cyberpunk', 'sports', 'apocalypse'],
    dislikes: ['fantasy', 'mystery'],
  },
};

export const GENRE_IDS = Object.keys(GENRES);

export const THEMES = {
  fantasy: { name: 'Fantasy', mono: 'FA', color: ['#7c5cff', '#b39dff'], words: ['Crystal', 'Ember', 'Rune', 'Dragon', 'Thorn', 'Silver'] },
  scifi: { name: 'Sci-Fi', mono: 'SF', color: ['#22d3ee', '#67e8f9'], words: ['Nova', 'Orbit', 'Plasma', 'Vector', 'Ion', 'Astra'] },
  cyberpunk: { name: 'Cyberpunk', mono: 'CY', color: ['#f43f8e', '#a855f7'], words: ['Neon', 'Chrome', 'Static', 'Ghost', 'Zero', 'Synth'] },
  space: { name: 'Space', mono: 'SP', color: ['#6366f1', '#38bdf8'], words: ['Starfall', 'Void', 'Comet', 'Eclipse', 'Nebula', 'Drift'] },
  modern: { name: 'Modern', mono: 'MO', color: ['#94a3b8', '#e2e8f0'], words: ['City', 'Concrete', 'Rush', 'Metro', 'Midnight', 'Signal'] },
  history: { name: 'Historical', mono: 'HI', color: ['#b45309', '#fbbf24'], words: ['Empire', 'Crown', 'Legion', 'Dynasty', 'Relic', 'Siege'] },
  apocalypse: { name: 'Post-Apoc', mono: 'AP', color: ['#b91c1c', '#f97316'], words: ['Ash', 'Rust', 'Fallow', 'Cinder', 'Waste', 'Last'] },
  mystery: { name: 'Mystery', mono: 'MY', color: ['#8b5cf6', '#d8b4fe'], words: ['Hollow', 'Whisper', 'Veil', 'Cipher', 'Moth', 'Echo'] },
  cute: { name: 'Cute', mono: 'CU', color: ['#fb7185', '#fda4af'], words: ['Bubble', 'Mochi', 'Sprout', 'Puff', 'Honey', 'Pebble'] },
  zombies: { name: 'Zombies', mono: 'ZO', color: ['#65a30d', '#a3e635'], words: ['Rot', 'Horde', 'Dead', 'Fever', 'Grave', 'Outbreak'] },
  ninja: { name: 'Ninja', mono: 'NI', color: ['#1e293b', '#94a3b8'], words: ['Shadow', 'Silent', 'Blade', 'Crimson', 'Stealth', 'Ronin'] },
  sports: { name: 'Sports', mono: 'SR', color: ['#059669', '#34d399'], words: ['Turbo', 'Final', 'Arena', 'Victory', 'Sprint', 'Champion'] },
};

export const THEME_IDS = Object.keys(THEMES);

export const TITLE_SUFFIX = {
  action: ['Strike', 'Fury', 'Protocol', 'Assault', 'Overdrive'],
  rpg: ['Saga', 'Chronicles', 'Legends', 'Quest', 'Prophecy'],
  sim: ['Tycoon', 'Manager', 'Simulator', 'Empire', 'Colony'],
  strategy: ['Command', 'Tactics', 'Dominion', 'Warfront', 'Frontier'],
  adventure: ['Journey', 'Tales', 'Expedition', 'Mystery', 'Odyssey'],
  puzzle: ['Blocks', 'Shift', 'Cascade', 'Logic', 'Loop'],
  horror: ['Nightmare', 'Descent', 'Haunting', 'Dread', 'Ritual'],
  racing: ['Racing', 'Drift', 'Speedway', 'Circuit', 'Grand Prix'],
};

export const PLATFORMS = {
  pc: {
    name: 'PC', mono: 'PC', audience: 'core', power: 66, share: 26,
    cost: 0, rp: 0, color: ['#38bdf8', '#6366f1'],
    note: 'The dependable home of core games.',
  },
  mobile: {
    name: 'Mobile', mono: 'MO', audience: 'casual', power: 31, share: 41,
    cost: 0, rp: 0, color: ['#34d399', '#22d3ee'],
    note: 'Huge audience, low technical ceiling.',
  },
  retro: {
    name: 'RetroBox', mono: 'RB', audience: 'family', power: 39, share: 9,
    cost: 24000, rp: 8, color: ['#fbbf24', '#fb7185'],
    note: 'Nostalgia machine for family nights.',
  },
  vortex: {
    name: 'Vortex One', mono: 'VO', audience: 'core', power: 81, share: 15,
    cost: 90000, rp: 24, color: ['#a78bfa', '#6366f1'],
    note: 'The living-room powerhouse.',
  },
  nebula: {
    name: 'Nebula X', mono: 'NX', audience: 'hardcore', power: 96, share: 7,
    cost: 220000, rp: 48, color: ['#f472b6', '#8b5cf6'],
    note: 'Bleeding-edge hardware for hardcore fans.',
  },
  vr: {
    name: 'VR Nexus', mono: 'VR', audience: 'hardcore', power: 100, share: 3,
    cost: 380000, rp: 70, color: ['#5eead4', '#38bdf8'],
    note: 'Tiny market. Infinite bragging rights.',
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS);

export const AUDIENCE = {
  core: { action: 1.1, rpg: 1.1, strategy: 1.05, sim: 1.0, adventure: 1.0, puzzle: 0.92, horror: 1.0, racing: 1.0 },
  casual: { action: 0.95, rpg: 0.85, strategy: 0.8, sim: 1.05, adventure: 1.0, puzzle: 1.15, horror: 0.72, racing: 1.0 },
  family: { action: 1.0, rpg: 0.9, strategy: 0.85, sim: 1.0, adventure: 1.08, puzzle: 1.15, horror: 0.6, racing: 1.1 },
  hardcore: { action: 1.05, rpg: 1.15, strategy: 1.1, sim: 1.0, adventure: 1.0, puzzle: 0.9, horror: 1.08, racing: 0.95 },
};

export const ENGINES = {
  basement: { name: 'Basement Engine', output: 1.0, craft: 0, cost: 0, rp: 0, note: 'It compiles. Mostly.' },
  forge: { name: 'Forge 2D', output: 1.08, craft: 0.2, cost: 30000, rp: 8, note: 'A tidy 2D pipeline.' },
  aurora: { name: 'Aurora 3D', output: 1.16, craft: 0.45, cost: 120000, rp: 28, note: 'Real-time lighting, real-time crunch.' },
  quantum: { name: 'Quantum Core', output: 1.26, craft: 0.75, cost: 350000, rp: 60, note: 'In-house tech wizardry.' },
};

export const ENGINE_IDS = Object.keys(ENGINES);

export const SCOPES = {
  small: { name: 'Small', work: 600, sales: 0.72, price: 14, bugs: 0.15, desc: 'A tight 6–10 week project. Low risk.' },
  medium: { name: 'Medium', work: 1350, sales: 1.15, price: 19, bugs: 0.3, desc: 'The bread and butter of a growing studio.' },
  large: { name: 'Large', work: 2800, sales: 1.9, price: 26, bugs: 0.5, desc: 'A flagship. Bigger team, bigger payoff.' },
  epic: { name: 'Epic', work: 5200, sales: 2.9, price: 34, bugs: 0.7, desc: 'A decade-defining gamble.' },
};

export const SCOPE_IDS = Object.keys(SCOPES);

export const OFFICES = {
  garage: { name: 'Garage', capacity: 3, cost: 0, desc: 'Two desks, one dream, questionable wiring.' },
  loft: { name: 'Studio Loft', capacity: 5, cost: 60000, desc: 'Brick walls, good coffee, room to grow.' },
  hq: { name: 'Downtown HQ', capacity: 8, cost: 220000, desc: 'A real studio. Visitors get impressed.' },
};

export const OFFICE_IDS = Object.keys(OFFICES);

export const UPGRADES = {
  coffee: { name: 'Espresso Machine', cost: 9000, desc: 'Halves weekly morale decay.', tag: 'Morale' },
  desks: { name: 'Standing Desks', cost: 28000, desc: '+8% team output.', tag: 'Output' },
  arcade: { name: 'Arcade Corner', cost: 45000, desc: 'Restores 1.5 morale each week.', tag: 'Morale' },
  render: { name: 'Render Farm', cost: 75000, desc: '+10% output and +0.2 craft.', tag: 'Output' },
  mocap: { name: 'Motion Capture Rig', cost: 160000, desc: '+0.35 craft quality.', tag: 'Quality' },
  pr: { name: 'PR Agency Retainer', cost: 60000, desc: 'Marketing pushes are cheaper and stronger.', tag: 'Marketing' },
};

export const UPGRADE_IDS = Object.keys(UPGRADES);

export const ROLES = {
  programmer: { name: 'Programmer', mono: 'PR', color: '#5eead4', affinity: { g: 1.0, a: 0.35, s: 0.25, t: 0.35 }, base: 200 },
  artist: { name: 'Artist', mono: 'AR', color: '#a78bfa', affinity: { g: 0.25, a: 1.0, s: 0.2, t: 0.3 }, base: 180 },
  designer: { name: 'Designer', mono: 'DE', color: '#fbbf24', affinity: { g: 0.75, a: 0.25, s: 0.15, t: 0.85 }, base: 220 },
  composer: { name: 'Composer', mono: 'CO', color: '#f472b6', affinity: { g: 0.15, a: 0.2, s: 1.0, t: 0.3 }, base: 160 },
};

export const ROLE_IDS = Object.keys(ROLES);

export const CRITICS = [
  { name: 'Polygon Pulse', short: 'PP', bias: 0.18 },
  { name: 'Indie Byte', short: 'IB', bias: -0.12 },
  { name: 'The Controller', short: 'TC', bias: 0.04 },
];

export const QUOTES = [
  { min: 9.3, text: 'An instant classic. This one will be studied for years.' },
  { min: 8.6, text: 'A confident, polished hit that rarely puts a foot wrong.' },
  { min: 7.8, text: 'Genuinely great. A few rough edges, but the good stuff shines.' },
  { min: 6.9, text: 'Solid fun with a strong core. It just needed a little more time.' },
  { min: 6.0, text: 'Charming in bursts, though it will not convert the skeptics.' },
  { min: 5.0, text: 'Mediocre. The ideas are there; the execution is not.' },
  { min: 0.0, text: 'A buggy, unfocused mess. Patch it and maybe we will talk.' },
];

export const FIRST_NAMES = ['Mika', 'Ravi', 'June', 'Tomas', 'Ines', 'Kofi', 'Sasha', 'Noa', 'Rin', 'Oscar', 'Lena', 'Yuki', 'Marco', 'Ada', 'Theo', 'Priya', 'Sam', 'Nadia', 'Eli', 'Zoe', 'Hugo', 'Mae', 'Ilya', 'Bea'];
export const LAST_NAMES = ['Sato', 'Kapoor', 'Okafor', 'Silva', 'Novak', 'Haddad', 'Lindqvist', 'Moreau', 'Tanaka', 'Reyes', 'Kowalski', 'Bauer', 'Chen', 'Mensah', 'Ivanov', 'Rossi', 'Dubois', 'Park', 'Fischer', 'Nakamura', 'Costa', 'Adeyemi'];

export const STUDIO_NAMES = ['Neon Otter Games', 'Tiny Comet Studio', 'Pixel Alchemy', 'Lucky Glitch', 'Moonbase Games', 'Third Coffee', 'Paper Rocket', 'Velvet Byte', 'Wildcard Works', 'Bit Orchard'];

export const EVENT_POOL = [
  { id: 'viral', kind: 'good', text: 'Your devlog went viral. Wishlists are climbing.', apply: s => { if (s.project) s.project.hype = Math.min(100, s.project.hype + 13); } },
  { id: 'fanmail', kind: 'good', text: 'A fan made fan art. The team is weirdly motivated.', apply: s => { s.staff.forEach(m => m.morale = Math.min(100, m.morale + 6)); } },
  { id: 'streamer', kind: 'good', text: 'A big streamer mentioned your last game. Sales tick up.', apply: s => { s.cash += 4000 + s.fans * 0.25; } },
  { id: 'outage', kind: 'bad', text: 'A power outage wiped a day of work. Bugs slipped in.', apply: s => { if (s.project) s.project.bugs += 4; } },
  { id: 'poach', kind: 'bad', text: 'A rival studio is poaching talent. Morale took a hit.', apply: s => { s.staff.forEach(m => m.morale = Math.max(5, m.morale - 9)); } },
  { id: 'leak', kind: 'warn', text: 'Screenshots leaked. The buzz is real, the discourse is not.', apply: s => { if (s.project) { s.project.hype = Math.min(100, s.project.hype + 8); s.rep = Math.max(0, s.rep - 1); } } },
  { id: 'rebate', kind: 'good', text: 'An unexpected tax rebate landed in the studio account.', apply: s => { s.cash += 7500; } },
  { id: 'bugreport', kind: 'warn', text: 'Playtesters found a nasty reproducible crash.', apply: s => { if (s.project) s.project.bugs += 3; } },
  { id: 'awardnod', kind: 'good', text: 'A critic called your studio "one to watch". Reputation up.', apply: s => { s.rep = Math.min(100, s.rep + 3); } },
  { id: 'rent', kind: 'bad', text: 'The landlord raised the rent. Ouch.', apply: s => { s.cash -= 2600; } },
];
