export const GYMS = [
  {
    id: 'bloom', leader: 'Rosa', title: 'Petal Whisperer', type: 'Grass', badge: 'bloom',
    town: 'goldleaf', color: '#57b94c', hair: '#7a4a2b', skin: '#f0c8a0', level: 13,
    intro: 'The garden answers only to those who listen. Show me your bond with Pokémon!',
    defeat: 'Your roots run deep, trainer. The Bloom Badge is yours!',
    party: [
      { n: 43, level: 12 },   // Oddish
      { n: 315, level: 13 },  // Roselia
      { n: 286, level: 14 },  // Breloom
    ],
    reward: 2400, items: { 'super-potion': 2, 'great-ball': 3 },
  },
  {
    id: 'frost', leader: 'Frost', title: 'Glacier Sentinel', type: 'Ice', badge: 'frost',
    town: 'frosthollow', color: '#63cfd4', hair: '#dfe9f5', skin: '#e8c0a8', level: 19,
    intro: 'The mountain does not yield. Neither do I. Let the cold decide your worth.',
    defeat: 'A fire burns in you that no blizzard can touch. Take the Frost Badge.',
    party: [
      { n: 361, level: 18 },  // Snorunt
      { n: 362, level: 19 },  // Glalie
      { n: 131, level: 20 },  // Lapras
    ],
    reward: 4200, items: { 'hyper-potion': 2, 'ultra-ball': 2 },
  },
  {
    id: 'ember', leader: 'Blaze', title: 'Cinder Dancer', type: 'Fire', badge: 'ember',
    town: 'emberfall', color: '#ef7d32', hair: '#3a1f18', skin: '#c98f65', level: 25,
    intro: 'Every step you take leaves ash. Let us see if your spirit can withstand the forge!',
    defeat: 'Ha! A brilliant flame. The Ember Badge belongs to you.',
    party: [
      { n: 58, level: 24 },   // Growlithe
      { n: 126, level: 25 },  // Magmar
      { n: 6, level: 26 },    // Charizard
    ],
    reward: 6000, items: { 'full-restore': 1, 'evolution-stone': 1 },
  },
  {
    id: 'moon', leader: 'Luna', title: 'Moonlit Weaver', type: 'Fairy', badge: 'moon',
    town: 'moonvale', color: '#e08cc0', hair: '#e8e8ee', skin: '#f0c8a0', level: 28,
    intro: 'The moon sees every heart. Let its light reveal the bond you share with your Pokémon.',
    defeat: 'A bond that shines brighter than the full moon. The Moon Badge is yours.',
    party: [
      { n: 35, level: 27 },   // Clefairy
      { n: 700, level: 28 },  // Sylveon
      { n: 282, level: 29 },  // Gardevoir
    ],
    reward: 7200, items: { 'hyper-potion': 3, 'great-ball': 5 },
  },
  {
    id: 'tide', leader: 'Marina', title: 'Tidal Song', type: 'Water', badge: 'tide',
    town: 'tidecrest', color: '#4f8fe8', hair: '#2b6c8f', skin: '#e8b890', level: 31,
    intro: 'The tide is patient, and it always returns. Can your resolve do the same?',
    defeat: 'You flow like a river finding the sea. The Tide Badge is yours.',
    party: [
      { n: 8, level: 30 },    // Wartortle
      { n: 130, level: 31 },  // Gyarados
      { n: 350, level: 32 },  // Milotic
    ],
    reward: 8000, items: { 'full-restore': 2, 'rare-candy': 1 },
  },
  {
    id: 'spark', leader: 'Volt', title: 'Storm Chaser', type: 'Electric', badge: 'spark',
    town: 'stormwatch', color: '#f2c744', hair: '#2b2b38', skin: '#8d5524', level: 37,
    intro: 'I have raced thunder across these peaks. Try to keep up!',
    defeat: 'You move like lightning! The Spark Badge is yours, with my respect.',
    party: [
      { n: 26, level: 36 },   // Raichu
      { n: 466, level: 37 },  // Electivire
      { n: 479, level: 38 },  // Rotom
    ],
    reward: 10500, items: { 'ultra-ball': 5, 'rare-candy': 2 },
  },
  {
    id: 'terra', leader: 'Terra', title: 'Bedrock Titan', type: 'Rock', badge: 'terra',
    town: 'dunebloom', color: '#b0a044', hair: '#3b2a1e', skin: '#8d5524', level: 43,
    intro: 'The desert has buried armies. It has never buried me. Stand firm, challenger!',
    defeat: 'Unbreakable! You have earned the Terra Badge. The road to the League is almost open.',
    party: [
      { n: 76, level: 42 },   // Golem
      { n: 142, level: 43 },  // Aerodactyl
      { n: 248, level: 44 },  // Tyranitar
    ],
    reward: 14000, items: { 'master-ball': 1, 'full-restore': 3 },
  },
  {
    id: 'iron', leader: 'Magnus', title: 'Forgemaster', type: 'Steel', badge: 'iron',
    town: 'ironhold', color: '#8fa3b8', hair: '#3b3b46', skin: '#c98f65', level: 47,
    intro: 'Steel is not born strong. It is hammered into strength. Show me the shape of your resolve!',
    defeat: 'Tempered to perfection. The Iron Badge is yours — and the League gates open.',
    party: [
      { n: 208, level: 46 },  // Steelix
      { n: 823, level: 47 },  // Corviknight
      { n: 376, level: 48 },  // Metagross
    ],
    reward: 16000, items: { 'ultra-ball': 6, 'rare-candy': 3 },
  },
]

export const CHAMPION = {
  id: 'champion', leader: 'Aster', title: 'Champion of the Pokéverse', type: 'Dragon',
  color: '#d4af37', hair: '#2b2b38', skin: '#c98f65', level: 51, town: 'willowbrook',
  intro: 'Every road in this world leads here. Show me the trainer you have become!',
  defeat: 'Magnificent. The Pokéverse has a new Champion — and its name is yours.',
  party: [
    { n: 149, level: 48 },  // Dragonite
    { n: 376, level: 49 },  // Metagross
    { n: 635, level: 50 },  // Hydreigon
    { n: 282, level: 50 },  // Gardevoir
    { n: 445, level: 51 },  // Garchomp
    { n: 6, level: 52 },    // Charizard
  ],
  reward: 30000, items: { 'master-ball': 1, 'rare-candy': 5, 'evolution-stone': 2 },
}

export const MASTER = {
  id: 'league-master', leader: 'Kael', title: 'League Master', type: 'Dragon',
  color: '#7ee0c8', hair: '#1f2b3a', skin: '#c98f65', level: 62, town: 'willowbrook',
  intro: 'You have conquered eight Gyms and the Champion. Now face the League Master — the final wall between you and legend.',
  defeat: 'At last. The League bows to a true master. Your name will be sung across every region.',
  party: [
    { n: 887, level: 60 },  // Dragapult
    { n: 445, level: 61 },  // Garchomp
    { n: 373, level: 62 },  // Salamence
    { n: 635, level: 62 },  // Hydreigon
    { n: 998, level: 63 },  // Baxcalibur
    { n: 384, level: 65 },  // Rayquaza
  ],
  reward: 60000, items: { 'master-ball': 2, 'rare-candy': 8, 'evolution-stone': 3 },
}

export const BADGE_GYM = Object.fromEntries(GYMS.map(g => [g.badge, g]))
