import { DEX_BY_ID } from './pokedex.js'

export const TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']

export const TYPE_COLORS = {
  Normal:'#9fa19f', Fire:'#ef7d32', Water:'#4f8fe8', Electric:'#f2c744', Grass:'#57b94c', Ice:'#63cfd4',
  Fighting:'#c93636', Poison:'#a44ba5', Ground:'#c9a54a', Flying:'#8e9ef0', Psychic:'#ee5d8c', Bug:'#8fae20',
  Rock:'#b0a044', Ghost:'#6c5b9e', Dragon:'#6a3ce0', Dark:'#5c5149', Steel:'#8f9bb0', Fairy:'#e08cc0',
}

export const TYPE_ICONS = {
  Normal:'✦', Fire:'🔥', Water:'💧', Electric:'⚡', Grass:'🌿', Ice:'❄', Fighting:'🥊', Poison:'☠', Ground:'⛰',
  Flying:'🪶', Psychic:'🔮', Bug:'🐛', Rock:'🪨', Ghost:'👻', Dragon:'🐉', Dark:'🌙', Steel:'⚙', Fairy:'✧',
}

// attacking type -> defending type -> multiplier
const CHART = {
  Normal:   { Rock:.5, Ghost:0, Steel:.5 },
  Fire:     { Fire:.5, Water:.5, Grass:2, Ice:2, Bug:2, Rock:.5, Dragon:.5, Steel:2 },
  Water:    { Fire:2, Water:.5, Grass:.5, Ground:2, Rock:2, Dragon:.5 },
  Electric: { Water:2, Electric:.5, Grass:.5, Ground:0, Flying:2, Dragon:.5 },
  Grass:    { Fire:.5, Water:2, Grass:.5, Poison:.5, Ground:2, Flying:.5, Bug:.5, Rock:2, Dragon:.5, Steel:.5 },
  Ice:      { Fire:.5, Water:.5, Grass:2, Ice:.5, Ground:2, Flying:2, Dragon:2, Steel:.5 },
  Fighting: { Normal:2, Ice:2, Poison:.5, Flying:.5, Psychic:.5, Bug:.5, Rock:2, Ghost:0, Dark:2, Steel:2, Fairy:.5 },
  Poison:   { Grass:2, Poison:.5, Ground:.5, Rock:.5, Ghost:.5, Steel:0, Fairy:2 },
  Ground:   { Fire:2, Electric:2, Grass:.5, Poison:2, Flying:0, Bug:.5, Rock:2, Steel:2 },
  Flying:   { Electric:.5, Grass:2, Fighting:2, Bug:2, Rock:.5, Steel:.5 },
  Psychic:  { Fighting:2, Poison:2, Psychic:.5, Dark:0, Steel:.5 },
  Bug:      { Fire:.5, Grass:2, Fighting:.5, Poison:.5, Flying:.5, Psychic:2, Ghost:.5, Dark:2, Steel:.5, Fairy:.5 },
  Rock:     { Fire:2, Ice:2, Fighting:.5, Ground:.5, Flying:2, Bug:2, Steel:.5 },
  Ghost:    { Normal:0, Psychic:2, Ghost:2, Dark:.5 },
  Dragon:   { Dragon:2, Steel:.5, Fairy:0 },
  Dark:     { Fighting:.5, Psychic:2, Ghost:2, Dark:.5, Fairy:.5 },
  Steel:    { Fire:.5, Water:.5, Electric:.5, Ice:2, Rock:2, Steel:.5, Fairy:2 },
  Fairy:    { Fire:.5, Fighting:2, Poison:.5, Dragon:2, Dark:2, Steel:.5 },
}

export function effectiveness (moveType, defenderTypes) {
  let m = 1
  for (const t of defenderTypes) m *= CHART[moveType]?.[t] ?? 1
  return m
}

export function effLabel (m) {
  if (m === 0) return { text: 'No effect', color: '#8a8a8a' }
  if (m >= 4) return { text: 'Devastating!', color: '#ff5d5d' }
  if (m > 1) return { text: 'Super effective!', color: '#ff8a3d' }
  if (m < 1) return { text: 'Not very effective…', color: '#8f9bb0' }
  return null
}

// ---- Move pools: [tier1, tier2, tier3, tier4] per type, split by damage class ----
const M = (name, type, cat, power, acc, pp, extra = {}) => ({ name, type, cat, power, acc, pp, ...extra })

export const MOVES = {}
const add = (...ms) => ms.forEach(m => { MOVES[m.name] = m })

add(
  M('Tackle','Normal','Physical',40,100,35),
  M('Quick Attack','Normal','Physical',40,100,30,{ priority:1 }),
  M('Headbutt','Normal','Physical',70,100,15,{ flinch:.3 }),
  M('Body Slam','Normal','Physical',85,100,15,{ status:'Paralysis', chance:.3 }),
  M('Swift','Normal','Special',60,999,20),
  M('Hyper Voice','Normal','Special',90,100,10),
  M('Boomburst','Normal','Special',120,100,10,{ recharge:true }),
  M('Growl','Normal','Status',0,100,40,{ stat:'atk', stages:-1, target:'foe' }),
  M('Leer','Normal','Status',0,100,30,{ stat:'def', stages:-1, target:'foe' }),
  M('Swords Dance','Normal','Status',0,999,20,{ stat:'atk', stages:2, target:'self' }),
  M('Recover','Normal','Status',0,999,10,{ heal:.5 }),
  M('Protect','Normal','Status',0,999,10,{ protect:true, priority:3 }),

  M('Ember','Fire','Special',40,100,25,{ status:'Burn', chance:.1 }),
  M('Fire Fang','Fire','Physical',65,95,15,{ status:'Burn', chance:.1 }),
  M('Flamethrower','Fire','Special',90,100,15,{ status:'Burn', chance:.1 }),
  M('Flare Blitz','Fire','Physical',120,100,10,{ recoil:.33, status:'Burn', chance:.1 }),
  M('Will-O-Wisp','Fire','Status',0,85,15,{ status:'Burn', chance:1 }),

  M('Water Gun','Water','Special',40,100,25),
  M('Aqua Jet','Water','Physical',40,100,20,{ priority:1 }),
  M('Surf','Water','Special',90,100,15),
  M('Wave Crash','Water','Physical',110,100,10,{ recoil:.25 }),
  M('Aqua Ring','Water','Status',0,999,20,{ heal:.25 }),

  M('Thunder Shock','Electric','Special',40,100,30,{ status:'Paralysis', chance:.1 }),
  M('Spark','Electric','Physical',65,100,20,{ status:'Paralysis', chance:.3 }),
  M('Thunderbolt','Electric','Special',90,100,15,{ status:'Paralysis', chance:.1 }),
  M('Wild Charge','Electric','Physical',110,100,10,{ recoil:.25 }),
  M('Thunder Wave','Electric','Status',0,90,20,{ status:'Paralysis', chance:1 }),

  M('Vine Whip','Grass','Physical',45,100,25),
  M('Razor Leaf','Grass','Physical',55,95,25,{ crit:1 }),
  M('Energy Ball','Grass','Special',90,100,10,{ stat:'spd', stages:-1, target:'foe', chance:.1 }),
  M('Power Whip','Grass','Physical',120,85,10),
  M('Sleep Powder','Grass','Status',0,75,15,{ status:'Sleep', chance:1 }),

  M('Ice Shard','Ice','Physical',40,100,30,{ priority:1 }),
  M('Icy Wind','Ice','Special',55,95,15,{ stat:'spe', stages:-1, target:'foe', chance:1 }),
  M('Ice Beam','Ice','Special',90,100,10,{ status:'Freeze', chance:.1 }),
  M('Icicle Crash','Ice','Physical',110,90,10,{ flinch:.3 }),

  M('Karate Chop','Fighting','Physical',50,100,25,{ crit:1 }),
  M('Low Sweep','Fighting','Physical',65,100,20,{ stat:'spe', stages:-1, target:'foe', chance:1 }),
  M('Close Combat','Fighting','Physical',120,100,5,{ selfStat:'def', stages:-1 }),
  M('Aura Sphere','Fighting','Special',80,999,20),
  M('Bulk Up','Fighting','Status',0,999,20,{ stat:'atk', stages:1, target:'self', also:'def' }),

  M('Poison Sting','Poison','Physical',15,100,35,{ status:'Poison', chance:.3 }),
  M('Acid','Poison','Special',40,100,30,{ stat:'spd', stages:-1, target:'foe', chance:.1 }),
  M('Sludge Bomb','Poison','Special',90,100,10,{ status:'Poison', chance:.3 }),
  M('Gunk Shot','Poison','Physical',120,80,5,{ status:'Poison', chance:.3 }),
  M('Toxic','Poison','Status',0,90,10,{ status:'Poison', chance:1, toxic:true }),

  M('Mud-Slap','Ground','Special',20,100,10,{ stat:'acc', stages:-1, target:'foe', chance:1 }),
  M('Bulldoze','Ground','Physical',60,100,20,{ stat:'spe', stages:-1, target:'foe', chance:1 }),
  M('Earthquake','Ground','Physical',100,100,10),
  M('Earth Power','Ground','Special',90,100,10,{ stat:'spd', stages:-1, target:'foe', chance:.1 }),

  M('Gust','Flying','Special',40,100,35),
  M('Wing Attack','Flying','Physical',60,100,35),
  M('Air Slash','Flying','Special',75,95,15,{ flinch:.3 }),
  M('Brave Bird','Flying','Physical',120,100,15,{ recoil:.33 }),
  M('Roost','Flying','Status',0,999,10,{ heal:.5 }),

  M('Confusion','Psychic','Special',50,100,25),
  M('Psybeam','Psychic','Special',65,100,20,{ status:'Confusion', chance:.1 }),
  M('Psychic','Psychic','Special',90,100,10,{ stat:'spd', stages:-1, target:'foe', chance:.1 }),
  M('Psyshock','Psychic','Special',80,100,10),
  M('Calm Mind','Psychic','Status',0,999,20,{ stat:'spa', stages:1, target:'self', also:'spd' }),

  M('Bug Bite','Bug','Physical',60,100,20),
  M('Struggle Bug','Bug','Special',50,100,20,{ stat:'spa', stages:-1, target:'foe', chance:1 }),
  M('X-Scissor','Bug','Physical',80,100,15,{ crit:1 }),
  M('Bug Buzz','Bug','Special',90,100,10,{ stat:'spd', stages:-1, target:'foe', chance:.1 }),

  M('Rock Throw','Rock','Physical',50,90,15),
  M('Rock Slide','Rock','Physical',75,90,10,{ flinch:.3 }),
  M('Stone Edge','Rock','Physical',100,80,5,{ crit:1 }),
  M('Power Gem','Rock','Special',80,100,20),
  M('Iron Defense','Rock','Status',0,999,15,{ stat:'def', stages:2, target:'self' }),

  M('Lick','Ghost','Physical',30,100,30,{ status:'Paralysis', chance:.3 }),
  M('Shadow Sneak','Ghost','Physical',40,100,30,{ priority:1 }),
  M('Shadow Ball','Ghost','Special',80,100,15,{ stat:'spd', stages:-1, target:'foe', chance:.2 }),
  M('Phantom Force','Ghost','Physical',90,100,10),
  M('Hex','Ghost','Special',65,100,10),

  M('Dragon Breath','Dragon','Special',60,100,20,{ status:'Paralysis', chance:.3 }),
  M('Dragon Claw','Dragon','Physical',80,100,15),
  M('Dragon Pulse','Dragon','Special',85,100,10),
  M('Outrage','Dragon','Physical',120,100,10,{ selfStat:'spa', stages:-1 }),
  M('Dragon Dance','Dragon','Status',0,999,20,{ stat:'atk', stages:1, target:'self', also:'spe' }),

  M('Bite','Dark','Physical',60,100,25,{ flinch:.3 }),
  M('Feint Attack','Dark','Physical',60,999,20),
  M('Crunch','Dark','Physical',80,100,15,{ stat:'def', stages:-1, target:'foe', chance:.2 }),
  M('Dark Pulse','Dark','Special',80,100,15,{ flinch:.2 }),
  M('Nasty Plot','Dark','Status',0,999,20,{ stat:'spa', stages:2, target:'self' }),

  M('Metal Claw','Steel','Physical',50,95,35,{ stat:'atk', stages:1, target:'self', chance:.1 }),
  M('Iron Head','Steel','Physical',80,100,15,{ flinch:.3 }),
  M('Flash Cannon','Steel','Special',80,100,10,{ stat:'spd', stages:-1, target:'foe', chance:.1 }),
  M('Meteor Mash','Steel','Physical',90,90,10,{ stat:'atk', stages:1, target:'self', chance:.2 }),

  M('Fairy Wind','Fairy','Special',40,100,30),
  M('Draining Kiss','Fairy','Special',50,100,15,{ drain:.75 }),
  M('Dazzling Gleam','Fairy','Special',80,100,10),
  M('Play Rough','Fairy','Physical',90,90,10,{ stat:'atk', stages:-1, target:'foe', chance:.1 }),
  M('Moonblast','Fairy','Special',95,100,15,{ stat:'spa', stages:-1, target:'foe', chance:.3 }),
)

const POOL = {
  Normal:{ phys:['Tackle','Headbutt','Body Slam','Boomburst'], spec:['Swift','Hyper Voice','Boomburst','Swift'] },
  Fire:{ phys:['Fire Fang','Fire Fang','Flare Blitz','Flare Blitz'], spec:['Ember','Flamethrower','Flamethrower','Boomburst'] },
  Water:{ phys:['Aqua Jet','Aqua Jet','Wave Crash','Wave Crash'], spec:['Water Gun','Surf','Surf','Hydro Pump'] },
  Electric:{ phys:['Spark','Spark','Wild Charge','Wild Charge'], spec:['Thunder Shock','Thunderbolt','Thunderbolt','Thunder Wave'] },
  Grass:{ phys:['Vine Whip','Razor Leaf','Power Whip','Power Whip'], spec:['Vine Whip','Razor Leaf','Energy Ball','Energy Ball'] },
  Ice:{ phys:['Ice Shard','Ice Shard','Icicle Crash','Icicle Crash'], spec:['Ice Shard','Icy Wind','Ice Beam','Blizzard'] },
  Fighting:{ phys:['Karate Chop','Low Sweep','Close Combat','Close Combat'], spec:['Karate Chop','Aura Sphere','Aura Sphere','Focus Blast'] },
  Poison:{ phys:['Poison Sting','Poison Sting','Gunk Shot','Gunk Shot'], spec:['Acid','Acid','Sludge Bomb','Sludge Bomb'] },
  Ground:{ phys:['Mud-Slap','Bulldoze','Earthquake','Earthquake'], spec:['Mud-Slap','Bulldoze','Earth Power','Earth Power'] },
  Flying:{ phys:['Gust','Wing Attack','Brave Bird','Brave Bird'], spec:['Gust','Air Slash','Air Slash','Hurricane'] },
  Psychic:{ phys:['Confusion','Psybeam','Psyshock','Psyshock'], spec:['Confusion','Psybeam','Psychic','Psyshock'] },
  Bug:{ phys:['Bug Bite','Bug Bite','X-Scissor','X-Scissor'], spec:['Struggle Bug','Struggle Bug','Bug Buzz','Bug Buzz'] },
  Rock:{ phys:['Rock Throw','Rock Slide','Stone Edge','Stone Edge'], spec:['Rock Throw','Power Gem','Power Gem','Power Gem'] },
  Ghost:{ phys:['Lick','Shadow Sneak','Phantom Force','Phantom Force'], spec:['Lick','Hex','Shadow Ball','Shadow Ball'] },
  Dragon:{ phys:['Dragon Breath','Dragon Claw','Dragon Claw','Outrage'], spec:['Dragon Breath','Dragon Breath','Dragon Pulse','Dragon Pulse'] },
  Dark:{ phys:['Bite','Feint Attack','Crunch','Crunch'], spec:['Bite','Feint Attack','Dark Pulse','Dark Pulse'] },
  Steel:{ phys:['Metal Claw','Metal Claw','Iron Head','Meteor Mash'], spec:['Metal Claw','Flash Cannon','Flash Cannon','Flash Cannon'] },
  Fairy:{ phys:['Fairy Wind','Play Rough','Play Rough','Play Rough'], spec:['Fairy Wind','Draining Kiss','Dazzling Gleam','Moonblast'] },
}
// missing pool entries fall back sensibly
POOL.Fire.spec[3] = 'Fire Blast'
POOL.Water.spec[3] = 'Hydro Pump'
POOL.Electric.spec[3] = 'Thunder'
POOL.Grass.spec[3] = 'Solar Beam'
POOL.Ice.spec[3] = 'Blizzard'
POOL.Fighting.spec[3] = 'Focus Blast'
POOL.Flying.spec[3] = 'Hurricane'
POOL.Normal.spec[2] = 'Hyper Voice'

add(
  M('Fire Blast','Fire','Special',110,85,5,{ status:'Burn', chance:.1 }),
  M('Hydro Pump','Water','Special',110,80,5),
  M('Thunder','Electric','Special',110,70,10,{ status:'Paralysis', chance:.3 }),
  M('Solar Beam','Grass','Special',120,100,10,{ recharge:true }),
  M('Blizzard','Ice','Special',110,70,5,{ status:'Freeze', chance:.1 }),
  M('Focus Blast','Fighting','Special',120,70,5,{ stat:'spd', stages:-1, target:'foe', chance:.1 }),
  M('Hurricane','Flying','Special',110,70,5,{ status:'Confusion', chance:.3 }),
)

const STATUS_MOVES = {
  Normal:['Growl','Swords Dance'],
  Fire:['Will-O-Wisp','Growl'],
  Water:['Aqua Ring','Leer'],
  Electric:['Thunder Wave','Leer'],
  Grass:['Sleep Powder','Growl'],
  Ice:['Icy Wind','Leer'],
  Fighting:['Bulk Up','Leer'],
  Poison:['Toxic','Leer'],
  Ground:['Leer','Swords Dance'],
  Flying:['Roost','Growl'],
  Psychic:['Calm Mind','Leer'],
  Bug:['Struggle Bug','Growl'],
  Rock:['Iron Defense','Leer'],
  Ghost:['Will-O-Wisp','Leer'],
  Dragon:['Dragon Dance','Leer'],
  Dark:['Nasty Plot','Leer'],
  Steel:['Iron Defense','Leer'],
  Fairy:['Calm Mind','Growl'],
}

const LEVELS = [1, 14, 27, 40]

export function movesFor (mon) {
  const sp = mon.species || DEX_BY_ID.get(mon.id)
  if (!sp) return []
  const phys = sp.s[1] >= sp.s[3]
  const learned = []
  const t1 = sp.t[0], t2 = sp.t[1]
  const pick = (type, tier) => POOL[type]?.[phys ? 'phys' : 'spec']?.[tier] || 'Tackle'
  learned.push({ n: pick(t1, 0), lv: 1 })
  learned.push({ n: pick('Normal', 0), lv: 1 })
  if (t2) learned.push({ n: pick(t2, 0), lv: 6 })
  learned.push({ n: STATUS_MOVES[t1]?.[0] || 'Growl', lv: 9 })
  learned.push({ n: pick(t1, 1), lv: LEVELS[1] })
  if (t2) learned.push({ n: pick(t2, 1), lv: 18 })
  learned.push({ n: STATUS_MOVES[t1]?.[1] || 'Leer', lv: 22 })
  learned.push({ n: pick(t1, 2), lv: LEVELS[2] })
  if (t2) learned.push({ n: pick(t2, 2), lv: 31 })
  learned.push({ n: pick(t1, 3), lv: LEVELS[3] })
  if (t2) learned.push({ n: pick(t2, 3), lv: 46 })
  const avail = learned.filter(m => m.lv <= mon.level)
  const seen = new Set()
  const uniq = avail.filter(m => !seen.has(m.n) && seen.add(m.n))
  return uniq.slice(-4).map(m => MOVES[m.n]).filter(Boolean)
}

export function movesAtLevel (sp, level) {
  return movesFor({ species: sp, level })
}

// ---- Items ----
export const ITEMS = {
  'poke-ball':      { name:'Poké Ball', icon:'◓', price:200, sell:100, kind:'ball', ball:1, desc:'A basic device for catching wild Pokémon.' },
  'great-ball':     { name:'Great Ball', icon:'◓', price:600, sell:300, kind:'ball', ball:1.5, desc:'A good Ball with a higher catch rate than a Poké Ball.' },
  'ultra-ball':     { name:'Ultra Ball', icon:'◓', price:1200, sell:600, kind:'ball', ball:2, desc:'An ultra-performance Ball with a high catch rate.' },
  'master-ball':    { name:'Master Ball', icon:'◓', price:0, sell:0, kind:'ball', ball:255, desc:'The best Ball. It never fails to catch a wild Pokémon.' },
  'potion':         { name:'Potion', icon:'🧪', price:300, sell:150, kind:'heal', heal:25, desc:'Restores 25 HP to a Pokémon.' },
  'super-potion':   { name:'Super Potion', icon:'🧪', price:700, sell:350, kind:'heal', heal:60, desc:'Restores 60 HP to a Pokémon.' },
  'hyper-potion':   { name:'Hyper Potion', icon:'🧪', price:1500, sell:750, kind:'heal', heal:150, desc:'Restores 150 HP to a Pokémon.' },
  'full-restore':   { name:'Full Restore', icon:'💠', price:3000, sell:1500, kind:'heal', heal:9999, cure:true, desc:'Fully restores HP and cures status conditions.' },
  'revive':         { name:'Revive', icon:'✚', price:1500, sell:750, kind:'revive', desc:'Revives a fainted Pokémon with half its HP.' },
  'evolution-stone':{ name:'Evolution Stone', icon:'💎', price:3000, sell:1500, kind:'evolve', desc:'A mysterious stone that triggers certain evolutions.' },
  'oran-berry':     { name:'Oran Berry', icon:'🍒', price:100, sell:50, kind:'heal', heal:15, desc:'A berry that restores 15 HP.' },
  'rare-candy':     { name:'Rare Candy', icon:'🍬', price:0, sell:2500, kind:'candy', desc:'Raises a Pokémon one level instantly.' },
}

export const BADGES = [
  { id:'bloom', name:'Bloom Badge', color:'#57b94c', icon:'❀', leader:'Rosa', town:'Goldleaf Village' },
  { id:'frost', name:'Frost Badge', color:'#63cfd4', icon:'❄', leader:'Frost', town:'Frosthollow' },
  { id:'ember', name:'Ember Badge', color:'#ef7d32', icon:'🔥', leader:'Blaze', town:'Emberfall' },
  { id:'moon', name:'Moon Badge', color:'#e08cc0', icon:'☾', leader:'Luna', town:'Moonvale' },
  { id:'tide', name:'Tide Badge', color:'#4f8fe8', icon:'🌊', leader:'Marina', town:'Tidecrest' },
  { id:'spark', name:'Spark Badge', color:'#f2c744', icon:'⚡', leader:'Volt', town:'Stormwatch' },
  { id:'terra', name:'Terra Badge', color:'#b0a044', icon:'⛰', leader:'Terra', town:'Dunebloom' },
  { id:'iron', name:'Iron Badge', color:'#8fa3b8', icon:'⚙', leader:'Magnus', town:'Ironhold' },
]

export function statsAt (sp, level, ivs = [15,15,15,15,15,15]) {
  const hp = Math.floor(((2 * sp.s[0] + ivs[0]) * level) / 100) + level + 10
  const calc = (i) => Math.floor(((2 * sp.s[i] + ivs[i]) * level) / 100) + 5
  return { hp, atk: calc(1), def: calc(2), spa: calc(3), spd: calc(4), spe: calc(5) }
}

export function expForLevel (level) { return Math.floor(Math.pow(level, 3) * 0.35) }
export function levelFromExp (exp) {
  let l = 1
  while (l < 100 && expForLevel(l + 1) <= exp) l++
  return l
}

export function typeGradient (types) {
  const a = TYPE_COLORS[types[0]] || '#888', b = TYPE_COLORS[types[1]] || a
  return `linear-gradient(135deg, ${a}, ${b})`
}
