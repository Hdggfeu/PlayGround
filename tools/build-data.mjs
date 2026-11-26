import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'js', 'pokedata.js')
const ASSETS = join(ROOT, 'assets')
mkdirSync(join(ASSETS, 'pokemon'), { recursive: true })
mkdirSync(join(ASSETS, 'cries'), { recursive: true })

const SPECIES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  152, 153, 154, 155, 156, 157, 158, 159, 160,
  252, 253, 254, 255, 256, 257, 258, 259, 260,
  387, 388, 389, 390, 391, 392, 393, 394, 395,
  495, 496, 497, 498, 499, 500, 501, 502, 503,
  25, 26, 133, 134, 135, 136, 470,
  315, 407, 282, 448, 468, 182, 547, 549,
  12, 130, 143, 465, 123, 214, 212
]

const STARTERS = [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501]

const MOVES = [
  'tackle','quick-attack','body-slam','growl','rest','protect','swift','hyper-beam',
  'vine-whip','razor-leaf','giga-drain','sleep-powder','growth','leech-seed','energy-ball','petal-dance',
  'ember','flamethrower','will-o-wisp','sunny-day','fire-blast','flame-wheel',
  'water-gun','surf','aqua-jet','rain-dance','hydro-pump','bubble-beam',
  'thunder-shock','thunderbolt','thunder-wave','discharge',
  'ice-beam','icy-wind','blizzard',
  'confusion','psychic','calm-mind','psybeam',
  'fairy-wind','moonblast','charm','dazzling-gleam',
  'bite','dark-pulse','nasty-plot','crunch',
  'karate-chop','close-combat','swords-dance','aura-sphere',
  'poison-sting','sludge-bomb','toxic','acid',
  'bug-bite','x-scissor','bug-buzz',
  'gust','air-slash','hurricane',
  'mud-slap','earthquake','bulldoze',
  'rock-throw','rock-slide','stone-edge',
  'lick','shadow-ball','shadow-claw',
  'metal-claw','iron-head','flash-cannon',
  'dragon-breath','dragon-claw','dragon-pulse',
  'synthesis','aromatherapy','helping-hand','double-team','recover','soft-boiled'
]

const LANGS = ['en','fr','de','es','it','ja','ko','zh','pt','ru','nl','pl','tr','ar']
const API_LANGS = { en:'en', fr:'fr', de:'de', es:'es', it:'it', ja:'ja', ko:'ko', zh:'zh-Hans' }

const cache = new Map()
async function getJSON(url) {
  if (cache.has(url)) return cache.get(url)
  const promise = (async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(url, { headers: { 'user-agent': 'jardin-game-builder/1.0' } })
      if (res.ok) return res.json()
      if (res.status === 404) throw new Error(`404 ${url}`)
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
    }
    throw new Error(`Failed ${url}`)
  })()
  cache.set(url, promise)
  return promise
}

function langMap(names, key = 'name') {
  const out = {}
  for (const lang of LANGS) out[lang] = ''
  for (const n of names || []) {
    const code = API_LANGS[n.language.name]
    if (code && !out[code]) out[code] = n[key] || n.name
  }
  const en = out.en || (names?.[0]?.[key] || '')
  for (const lang of LANGS) if (!out[lang]) out[lang] = en
  return out
}

async function download(url, file) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status}`)
      await pipeline(Readable.fromWeb(res.body), createWriteStream(file))
      return
    } catch (e) {
      if (attempt === 3) throw e
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

async function mapLimit(items, limit, fn) {
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const index = i++
      await fn(items[index], index)
    }
  })
  await Promise.all(workers)
}

console.log('Fetching moves…')
const moves = {}
await mapLimit(MOVES, 6, async slug => {
  const d = await getJSON(`https://pokeapi.co/api/v2/move/${slug}`)
  const meta = d.meta || {}
  moves[slug] = {
    id: d.id,
    name: langMap(d.names),
    type: d.type.name,
    class: d.damage_class?.name || 'status',
    power: d.power || 0,
    accuracy: d.accuracy ?? 100,
    pp: d.pp || 10,
    priority: d.priority || 0,
    drain: meta.drain || 0,
    healing: meta.healing || 0,
    crit: meta.crit_rate || 0,
    flinch: meta.flinch_chance || 0,
    ailment: meta.ailment?.name && meta.ailment.name !== 'none' ? meta.ailment.name : '',
    ailmentChance: meta.ailment_chance || 0,
    statChance: meta.stat_chance || 0,
    stats: (d.stat_changes || []).map(s => ({ stat: s.stat.name, change: s.change })),
    target: d.target?.name || '',
    desc: d.effect_entries?.find(e => e.language.name === 'en')?.short_effect || ''
  }
})

console.log('Fetching types…')
const typeIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]
const types = {}
await mapLimit(typeIds, 6, async id => {
  const d = await getJSON(`https://pokeapi.co/api/v2/type/${id}`)
  types[d.name] = { id, name: langMap(d.names) }
})

console.log('Fetching species…')
const species = {}
const evoChains = new Map()
await mapLimit(SPECIES, 5, async id => {
  const [p, s] = await Promise.all([
    getJSON(`https://pokeapi.co/api/v2/pokemon/${id}`),
    getJSON(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
  ])
  const stats = {}
  for (const st of p.stats) {
    const k = { hp:'hp', attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe' }[st.stat.name]
    if (k) stats[k] = st.base_stat
  }
  const local = langMap(s.names)
  species[id] = {
    id,
    name: local,
    genus: s.genera?.find(g => g.language.name === 'en')?.genus || 'Garden Pokémon',
    types: p.types.sort((a,b)=>a.slot-b.slot).map(t => t.type.name),
    stats,
    height: p.height,
    weight: p.weight,
    color: s.color?.name || 'green',
    habitat: s.habitat?.name || 'grassland',
    legendary: !!s.is_legendary || !!s.is_mythical,
    sprite: `assets/pokemon/${id}.png`,
    back: `assets/pokemon/${id}-back.png`,
    cry: `assets/cries/${id}.ogg`,
    evolvesTo: null,
    evolveLevel: 0,
    chainUrl: s.evolution_chain?.url || ''
  }
  const front = p.sprites.front_default
  const back = p.sprites.back_default
  const cry = p.cries?.latest
  await Promise.all([
    front ? download(front, join(ASSETS, 'pokemon', `${id}.png`)) : null,
    back ? download(back, join(ASSETS, 'pokemon', `${id}-back.png`)) : null,
    cry ? download(cry, join(ASSETS, 'cries', `${id}.ogg`)) : null
  ])
  if (s.evolution_chain?.url) evoChains.set(s.evolution_chain.url, null)
  process.stdout.write('.')
})

console.log('\nFetching evolution chains…')
await mapLimit([...evoChains.keys()], 4, async url => {
  const d = await getJSON(url)
  evoChains.set(url, d.chain)
})

function findNode(node, id) {
  if (Number(node.species.url.split('/').filter(Boolean).pop()) === id) return node
  for (const child of node.evolves_to || []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

for (const s of Object.values(species)) {
  if (!s.chainUrl) continue
  const chain = evoChains.get(s.chainUrl)
  if (!chain) continue
  const node = findNode(chain, s.id)
  if (!node) continue
  const children = node.evolves_to || []
  if (children.length === 1) {
    const child = children[0]
    const nextId = Number(child.species.url.split('/').filter(Boolean).pop())
    if (species[nextId]) {
      s.evolvesTo = nextId
      const detail = child.evolution_details?.find(x => x.min_level) || child.evolution_details?.[0]
      s.evolveLevel = detail?.min_level || 0
    }
  }
}

// Move pools used to build sensible level-up movesets.
const POOLS = {
  normal: ['tackle','quick-attack','body-slam','swift','growl','protect','double-team'],
  grass: ['vine-whip','razor-leaf','giga-drain','sleep-powder','growth','leech-seed','energy-ball','petal-dance'],
  fire: ['ember','flame-wheel','flamethrower','will-o-wisp','sunny-day','fire-blast'],
  water: ['water-gun','bubble-beam','aqua-jet','surf','rain-dance','hydro-pump'],
  electric: ['thunder-shock','thunder-wave','thunderbolt','discharge'],
  ice: ['icy-wind','ice-beam','blizzard'],
  psychic: ['confusion','psybeam','calm-mind','psychic'],
  fairy: ['fairy-wind','charm','dazzling-gleam','moonblast'],
  dark: ['bite','nasty-plot','dark-pulse','crunch'],
  fighting: ['karate-chop','swords-dance','aura-sphere','close-combat'],
  poison: ['poison-sting','acid','toxic','sludge-bomb'],
  bug: ['bug-bite','bug-buzz','x-scissor'],
  flying: ['gust','air-slash','hurricane'],
  ground: ['mud-slap','bulldoze','earthquake'],
  rock: ['rock-throw','rock-slide','stone-edge'],
  ghost: ['lick','shadow-claw','shadow-ball'],
  steel: ['metal-claw','iron-head','flash-cannon'],
  dragon: ['dragon-breath','dragon-claw','dragon-pulse']
}
const STATUS_POOL = ['growl','sleep-powder','will-o-wisp','thunder-wave','charm','toxic','calm-mind','nasty-plot','swords-dance','growth','protect','rest','synthesis','aromatherapy','recover','double-team','leech-seed','rain-dance','sunny-day']

function buildLearnset(s) {
  const primary = s.types[0]
  const secondary = s.types[1]
  const p = POOLS[primary] || POOLS.normal
  const sec = secondary ? (POOLS[secondary] || []) : []
  const status = STATUS_POOL.find(m => moves[m] && (moves[m].type === primary || moves[m].type === secondary || moves[m].type === 'normal')) || 'growl'
  const base = [p[0], 'tackle', p[1] || 'quick-attack', status]
  const extras = []
  if (p[2]) extras.push(p[2])
  if (sec[0]) extras.push(sec[0])
  if (p[3]) extras.push(p[3])
  if (sec[1]) extras.push(sec[1])
  if (p[4]) extras.push(p[4])
  extras.push('body-slam')
  const unique = [...new Set([...base, ...extras])].filter(m => moves[m]).slice(0, 10)
  return unique.map((m, i) => ({ move: m, level: i < 4 ? 1 : i === 4 ? 8 : i === 5 ? 13 : i === 6 ? 18 : i === 7 ? 24 : i === 8 ? 30 : 36 }))
}

for (const s of Object.values(species)) {
  s.learnset = buildLearnset(s)
  s.rarity = s.legendary ? 4 : s.evolvesTo ? 2 : 1
}

const data = {
  generatedAt: new Date().toISOString(),
  languages: LANGS,
  species,
  moves,
  types,
  starters: STARTERS,
  firstStage: STARTERS
}

const out = `// Generated from PokeAPI data. Sprites and cries remain the property of their respective owners.\nexport const POKEDEX = ${JSON.stringify(data, null, 2)}\n`
writeFileSync(OUT, out)
console.log(`\nWrote ${OUT} (${(out.length/1024/1024).toFixed(2)} MB)`)
