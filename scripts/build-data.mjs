import { readFileSync, writeFileSync } from 'node:fs'

const read = (f) => readFileSync(new URL('./' + f + '.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(line => {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur); return out
})

const pretty = (s) => s.split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')

const pokemon = read('pokemon')
const typesRows = read('pokemon_types')
const statsRows = read('pokemon_stats')
const speciesRows = read('pokemon_species')
const evoRows = read('pokemon_evolution')
const typeRows = read('types')
const itemRows = read('items')
const namesRows = read('pokemon_species_names')
const flavorRows = read('pokemon_species_flavor_text')

const typeNames = Object.fromEntries(typeRows.map(r => [r[0], pretty(r[1])]))
const itemNames = Object.fromEntries(itemRows.map(r => [r[0], pretty(r[1])]))
const names = {}, genus = {}
for (const r of namesRows) if (r[1] === '9') { names[r[0]] = r[2]; genus[r[0]] = r[3] }
const flavors = {}
for (const r of flavorRows) {
  if (r[2] !== '9') continue
  const txt = r[3].replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (txt && !txt.includes('???') && !/^POKéMON?$/i.test(txt)) flavors[r[0]] = txt
}

const bySpecies = {}
for (const r of pokemon) {
  const [id, identifier, speciesId, height, weight, baseExp, order, isDefault] = r
  if (isDefault === '1' && !bySpecies[speciesId]) bySpecies[speciesId] = { id: +id, identifier, height: +height, weight: +weight, baseExp: +baseExp }
}
const typesBy = {}
for (const r of typesRows) (typesBy[r[0]] ||= []).push({ slot: +r[2], name: typeNames[r[1]] })
const statsBy = {}
for (const r of statsRows) (statsBy[r[0]] ||= {})[r[1]] = +r[2]

// pick one evolution condition per evolved species, preferring level conditions
const evoCond = {}
for (const r of evoRows) {
  if (r[3] !== '1' || r[4] !== '1') continue // is_default only
  const target = r[1]
  const cond = {}
  if (r[6]) cond.lvl = +r[6]
  else if (r[5]) cond.item = itemNames[r[5]] || 'Evolution Stone'
  else if (r[16]) cond.friend = true
  else if (r[2] === '2' || r[2] === '3') cond.trade = true
  else cond.special = true
  if (r[13]) cond.happy = +r[13]
  if (r[14]) cond.time = r[14]
  if (!evoCond[target] || (cond.lvl && !evoCond[target].lvl) || (cond.item && !evoCond[target].lvl && !evoCond[target].item)) evoCond[target] = cond
}

const species = {}
for (const r of speciesRows) {
  const id = +r[0]
  species[id] = { gen: +r[2], from: r[3] ? +r[3] : null, capture: +r[9], color: +r[5], shape: +r[6], legendary: r[16] === '1', mythical: r[17] === '1' }
}
const evoTo = {}
for (const [id, cond] of Object.entries(evoCond)) {
  const from = species[id]?.from
  if (!from) continue
  ;(evoTo[from] ||= []).push({ id: +id, ...cond })
}

const dex = []
for (let id = 1; id <= 1025; id++) {
  const sp = species[id]
  const pk = bySpecies[id]
  if (!sp || !pk) continue
  const stats = statsBy[pk.id] || {}
  const base = [stats['1'] || 50, stats['2'] || 50, stats['3'] || 50, stats['4'] || 50, stats['5'] || 50, stats['6'] || 50]
  const entry = {
    n: id,
    name: names[id] || pretty(pk.identifier),
    t: (typesBy[pk.id] || []).sort((a, b) => a.slot - b.slot).map(x => x.name),
    s: base,
    g: sp.gen,
    cr: sp.capture,
    h: pk.height / 10,
    w: pk.weight / 10,
    cat: genus[id] || 'Pokémon',
    fl: flavors[id] || '',
    col: sp.color,
    sh: sp.shape,
  }
  if (sp.legendary) entry.le = 1
  if (sp.mythical) entry.my = 1
  if (evoTo[id]) entry.evo = evoTo[id]
  dex.push(entry)
}

const genRanges = {}
for (const e of dex) { (genRanges[e.g] ||= [e.n, e.n]); genRanges[e.g][1] = e.n }

const out = `// Generated from PokeAPI data. ${dex.length} species.\nexport const POKEDEX = ${JSON.stringify(dex)}\nexport const GEN_RANGES = ${JSON.stringify(genRanges)}\nexport const DEX_BY_ID = new Map(POKEDEX.map(p => [p.n, p]))\nexport const DEX_BY_NAME = new Map(POKEDEX.map(p => [p.name.toLowerCase(), p]))\n`
writeFileSync(new URL('../js/data/pokedex.js', import.meta.url), out)
console.log('species', dex.length, 'bytes', out.length, 'gens', genRanges)
console.log(dex.slice(0, 2), dex[1024])
