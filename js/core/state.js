import { POKEDEX, DEX_BY_ID } from '../data/pokedex.js'
import { ITEMS, MOVES, movesFor, statsAt, expForLevel, levelFromExp, BADGES } from '../data/moves.js'
import { clamp, mulberry32 } from '../core/utils.js'
import { cloneControls, normalizeControls } from './controls.js'

const SAVE_KEY = 'pokeverse.save.v1' // legacy single-save key
const SLOT_PREFIX = 'pokeverse.save.v2.slot'
const LAST_SLOT_KEY = 'pokeverse.slot.v1'
export const SAVE_SLOTS = [1, 2]
let uidCounter = 1

export const slotKey = (slot) => `${SLOT_PREFIX}${slot}`
export const lastSlot = () => {
  try { const n = +(localStorage.getItem(LAST_SLOT_KEY) || 1); return SAVE_SLOTS.includes(n) ? n : 1 } catch { return 1 }
}
export const setLastSlot = (slot) => { try { localStorage.setItem(LAST_SLOT_KEY, String(slot)) } catch {} }

// Migrate the original single save into file 1 once, without destroying it.
export function migrateSaves () {
  try {
    const legacy = localStorage.getItem(SAVE_KEY)
    if (legacy && !localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), legacy)
  } catch {}
}

export function readSlot (slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot))
    if (!raw) return null
    const s = JSON.parse(raw)
    return s?.started ? s : null
  } catch { return null }
}

export function slotSummary (slot) {
  const s = readSlot(slot)
  if (!s) return { slot, empty: true, name: '', level: 1, badges: 0, caught: 0, playTime: 0, seed: 0 }
  return {
    slot, empty: false, name: s.name || 'Trainer', level: s.party?.[0]?.level || 1,
    badges: s.badges?.length || 0, caught: s.caught?.length || 0, playTime: s.playTime || 0,
    seed: s.seed || 0, starter: s.starter, updated: s.updated || 0,
  }
}

export function deleteSlot (slot) {
  try { localStorage.removeItem(slotKey(slot)) } catch {}
}

export function speciesOf (mon) { return DEX_BY_ID.get(mon.id) }

export function createMon (id, level = 5, opts = {}) {
  const sp = DEX_BY_ID.get(id)
  if (!sp) throw new Error('Unknown species ' + id)
  const rng = opts.rng || Math.random
  const ivs = Array.from({ length: 6 }, () => opts.perfect ? 31 : Math.floor(rng() * 32))
  const mon = {
    uid: 'm' + (uidCounter++) + '_' + Math.floor(Math.random() * 1e6),
    id, level, exp: expForLevel(level), ivs,
    hp: 0, status: null, statusTurns: 0, shiny: opts.shiny ?? (rng() < 1 / 512),
    moves: [], nickname: opts.nickname || '', met: opts.met || 'the wilds',
  }
  const stats = statsAt(sp, level, ivs)
  mon.hp = stats.hp
  mon.moves = movesFor(mon).map(m => ({ n: m.name, pp: m.pp, max: m.pp }))
  return mon
}

export function monStats (mon) { return statsAt(speciesOf(mon), mon.level, mon.ivs) }
export function maxHp (mon) { return monStats(mon).hp }
export function healMon (mon) {
  mon.hp = maxHp(mon); mon.status = null; mon.statusTurns = 0
  for (const m of mon.moves) m.pp = m.max
}
export function healParty (party) { for (const m of party) healMon(m) }

export function syncMoves (mon) {
  const learned = movesFor(mon)
  const names = new Set(mon.moves.map(m => m.n))
  const added = []
  for (const mv of learned) {
    if (names.has(mv.name)) continue
    const entry = { n: mv.name, pp: mv.pp, max: mv.pp }
    if (mon.moves.length < 4) { mon.moves.push(entry); names.add(mv.name); added.push(mv.name) }
    else {
      // replace the oldest move that isn't the same type (keep STAB coverage)
      let idx = 0
      for (let i = 0; i < mon.moves.length; i++) { const old = MOVES[mon.moves[i].n]; if (!old || old.power < (MOVES[mon.moves[idx].n]?.power || 0)) idx = i }
      if (idx >= 0) { mon.moves[idx] = entry; names.add(mv.name); added.push(mv.name) }
    }
  }
  return added
}

export function gainExp (mon, amount) {
  const before = mon.level
  mon.exp += amount
  const newLevel = Math.min(100, levelFromExp(mon.exp))
  const result = { levels: 0, moves: [], evolved: null }
  if (newLevel > before) {
    mon.level = newLevel
    result.levels = newLevel - before
    const stats = monStats(mon)
    mon.hp = Math.min(stats.hp, mon.hp + (stats.hp - monStats({ ...mon, level: before }).hp))
    result.moves = syncMoves(mon)
  }
  return result
}

export function evolutionOptions (mon) {
  const sp = speciesOf(mon)
  if (!sp?.evo) return []
  return sp.evo.filter(e => {
    if (e.lvl && mon.level >= e.lvl) return true
    if (e.item && false) return true
    if (!e.lvl && !e.item && mon.level >= 40) return true
    return false
  })
}

export function evolveMon (mon, targetId) {
  const oldSp = speciesOf(mon)
  const newSp = DEX_BY_ID.get(targetId)
  if (!newSp) return null
  mon.id = targetId
  mon.moves = mon.moves.map(m => ({ ...m }))
  syncMoves(mon)
  const stats = monStats(mon)
  mon.hp = stats.hp
  return { from: oldSp, to: newSp }
}

export function expToNext (mon) {
  if (mon.level >= 100) return 0
  return expForLevel(mon.level + 1) - expForLevel(mon.level)
}
export function expProgress (mon) {
  const base = expForLevel(mon.level), next = expForLevel(mon.level + 1)
  return clamp((mon.exp - base) / Math.max(1, next - base), 0, 1)
}

export const SIDE_QUESTS = [
  { id:'collector', title:'Field Notes', desc:'Catch 15 different Pokémon.', check:s => s.caughtCount >= 15, reward:{money:2500, items:{'great-ball':5}} },
  { id:'explorer', title:'Wanderer', desc:'Visit all nine towns.', check:s => s.visitedTowns.length >= 9, reward:{money:4000, items:{'evolution-stone':1}} },
  { id:'treasure', title:'Treasure Hunter', desc:'Open 5 hidden chests.', check:s => s.stats.chests >= 5, reward:{money:3000, items:{'ultra-ball':5}} },
  { id:'veteran', title:'Veteran Trainer', desc:'Win 25 battles.', check:s => s.stats.wins >= 25, reward:{money:6000, items:{'rare-candy':3}} },
]

export class GameState {
  constructor () {
    this.v = 1
    this.slot = 1
    this.name = 'Trainer'
    this.playerId = 'p' + Math.random().toString(36).slice(2, 9)
    this.colors = { skin:'#f0c8a0', hair:'#2b2b38', shirt:'#e05a4a', pants:'#2f3550', hat:'#e05a4a', bag:'#7a5a3a' }
    this.seed = 20261126
    this.party = []
    this.box = []
    this.bag = {}
    this.seen = new Set()
    this.caught = new Set()
    this.badges = []
    this.money = 3000
    this.starter = null
    this.pos = { x: 96.5, y: 105.5 }
    this.dir = 'down'
    this.clock = 8 * 60 + 20
    this.playTime = 0
    this.started = false
    this.champion = false
    this.leagueMaster = false
    this.lastTown = 'willowbrook'
    this.visitedTowns = []
    this.sideClaims = []
    this.settings = { music: .55, sfx: .6, muted: false, weather: true, controls: cloneControls() }
    this.stats = { catches: 0, battles: 0, wins: 0, chests: 0, steps: 0, shinies: 0, evolutions: 0 }
    this.weather = { type: 'clear', timer: 120 }
    this.tutorialStep = 0
    this.dexFilters = { gen: 0, type: '', caughtOnly: false, search: '' }
  }

  get caughtCount () { return this.caught.size }
  get questStep () {
    if (!this.started) return 0
    if (this.leagueMaster) return 10
    if (this.champion) return 9
    if (this.caught.size < 3) return 1
    if (!this.badges.includes('bloom')) return 2
    if (!this.badges.includes('frost') || !this.badges.includes('ember')) return 3
    if (!this.badges.includes('moon')) return 4
    if (!this.badges.includes('tide') || !this.badges.includes('spark')) return 5
    if (!this.badges.includes('terra')) return 6
    if (!this.badges.includes('iron')) return 7
    return 8
  }

  get quest () {
    const steps = [
      { title:'A New Beginning', desc:'Choose your first partner in Black Lab.', hint:'Talk to Professor Black.' },
      { title:'Field Research', desc:'Catch 3 different Pokémon to fill the Pokédex.', hint:`Caught ${this.caught.size}/3` },
      { title:'The Bloom Badge', desc:'Defeat Rosa at the Goldleaf Gym (west).', hint:'Recommended Lv. 12+' },
      { title:'Frost & Flame', desc:'Defeat Frost in Frosthollow and Blaze in Emberfall.', hint:`${this.badges.includes('frost') ? '✓' : '○'} Frost   ${this.badges.includes('ember') ? '✓' : '○'} Blaze` },
      { title:'The Moonlit Trial', desc:'Defeat Luna at the Moonvale Gym.', hint:`${this.badges.includes('moon') ? '✓' : '○'} Moon   · Recommended Lv. 26+` },
      { title:'Tides & Sparks', desc:'Defeat Marina in Tidecrest and Volt in Stormwatch.', hint:`${this.badges.includes('tide') ? '✓' : '○'} Tide   ${this.badges.includes('spark') ? '✓' : '○'} Spark` },
      { title:'The Bedrock Trial', desc:'Defeat Terra at the Dunebloom Gym.', hint:'Recommended Lv. 42+' },
      { title:'The Iron Will', desc:'Defeat Magnus at the Ironhold Gym.', hint:`${this.badges.includes('iron') ? '✓' : '○'} Iron   · Recommended Lv. 46+` },
      { title:'Champion of the Pokéverse', desc:'Climb Champion Tower and defeat Aster.', hint:'All eight badges required.' },
      { title:'Master League', desc:'Defeat League Master Kael beside Champion Tower.', hint:'The final battle. Recommended Lv. 60+' },
      { title:'Pokéverse Legend', desc:'The world is yours. Complete your Pokédex and hunt the mythic rifts!', hint:`${this.caught.size}/1025 caught` },
    ]
    return steps[this.questStep]
  }

  newGame (name, colors, starterId, seed) {
    this.name = name || 'Trainer'
    this.colors = { ...this.colors, ...colors }
    this.seed = seed || (Math.floor(Math.random() * 1e9) + 1)
    this.party = []; this.box = []; this.bag = { 'poke-ball': 10, 'potion': 5, 'oran-berry': 2 }
    this.seen = new Set(); this.caught = new Set(); this.badges = []
    this.money = 3000; this.starter = starterId; this.champion = false; this.leagueMaster = false
    this.pos = { x: 96.5, y: 105.5 }; this.dir = 'up'
    this.clock = 8 * 60 + 20; this.playTime = 0; this.started = true
    this.visitedTowns = ['willowbrook']; this.sideClaims = []
    this.stats = { catches: 0, battles: 0, wins: 0, chests: 0, steps: 0, shinies: 0, evolutions: 0 }
    this.tutorialStep = 0
    const mon = createMon(starterId, 5, { perfect: true, met: 'Willow Lab' })
    mon.nickname = ''
    this.party.push(mon)
    this.recordCaught(starterId)
    this.save()
  }

  recordSeen (id) { if (!this.seen.has(id)) { this.seen.add(id); this.save() } }
  recordCaught (id, mon) {
    this.seen.add(id)
    const isNew = !this.caught.has(id)
    this.caught.add(id)
    if (mon?.shiny) this.stats.shinies++
    this.save()
    return isNew
  }
  addMon (mon) {
    if (this.party.length < 6) this.party.push(mon)
    else this.box.push(mon)
    this.recordCaught(mon.id, mon)
    this.stats.catches++
    return this.party.includes(mon)
  }
  removeFromParty (uid) {
    const i = this.party.findIndex(m => m.uid === uid)
    if (i < 0) return null
    if (this.party.length <= 1) return null
    const [mon] = this.party.splice(i, 1)
    this.box.push(mon)
    return mon
  }
  withdraw (uid) {
    const i = this.box.findIndex(m => m.uid === uid)
    if (i < 0 || this.party.length >= 6) return null
    const [mon] = this.box.splice(i, 1)
    this.party.push(mon)
    return mon
  }
  swapParty (i, j) { const t = this.party[i]; this.party[i] = this.party[j]; this.party[j] = t }
  firstHealthy () { return this.party.find(m => m.hp > 0) }

  addItem (id, n = 1) { this.bag[id] = (this.bag[id] || 0) + n; this.save() }
  useItem (id, n = 1) {
    if ((this.bag[id] || 0) < n) return false
    this.bag[id] -= n
    if (this.bag[id] <= 0) delete this.bag[id]
    this.save()
    return true
  }
  addBadge (id) {
    if (!this.badges.includes(id)) { this.badges.push(id); this.save(); return true }
    return false
  }
  visitTown (id) {
    if (!this.visitedTowns.includes(id)) { this.visitedTowns.push(id); this.save() }
    this.lastTown = id
  }
  hasSave (slot = this.slot) { try { return !!localStorage.getItem(slotKey(slot)) } catch { return false } }

  serialize () {
    return {
      v: 2, slot: this.slot, updated: Date.now(),
      name: this.name, playerId: this.playerId, colors: this.colors, seed: this.seed,
      party: this.party, box: this.box, bag: this.bag, seen: [...this.seen], caught: [...this.caught],
      badges: this.badges, money: this.money, starter: this.starter, pos: this.pos, dir: this.dir,
      clock: this.clock, playTime: this.playTime, started: this.started, champion: this.champion, leagueMaster: this.leagueMaster,
      lastTown: this.lastTown, visitedTowns: this.visitedTowns, sideClaims: this.sideClaims,
      settings: this.settings, stats: this.stats, tutorialStep: this.tutorialStep, weather: this.weather,
    }
  }

  save () {
    try {
      if (!this.started) return
      if (!SAVE_SLOTS.includes(this.slot)) this.slot = 1
      localStorage.setItem(slotKey(this.slot), JSON.stringify(this.serialize()))
      setLastSlot(this.slot)
    } catch (e) { console.warn('save failed', e) }
  }

  load (slot = this.slot) {
    try {
      migrateSaves()
      if (!SAVE_SLOTS.includes(slot)) slot = 1
      const raw = localStorage.getItem(slotKey(slot))
      if (!raw) return false
      const s = JSON.parse(raw)
      if (!s || !s.started) return false
      this.slot = slot
      Object.assign(this, {
        name: s.name, playerId: s.playerId || this.playerId, colors: { ...this.colors, ...s.colors }, seed: s.seed,
        party: s.party || [], box: s.box || [], bag: s.bag || {}, badges: s.badges || [], money: s.money || 0,
        starter: s.starter, pos: s.pos || this.pos, dir: s.dir || 'down', clock: s.clock ?? this.clock,
        playTime: s.playTime || 0, started: true, champion: !!s.champion, leagueMaster: !!s.leagueMaster, lastTown: s.lastTown || 'willowbrook',
        visitedTowns: s.visitedTowns || ['willowbrook'], sideClaims: s.sideClaims || [],
        settings: { ...this.settings, ...s.settings, controls: normalizeControls(s.settings?.controls) },
        stats: { ...this.stats, ...s.stats }, tutorialStep: s.tutorialStep || 0, weather: s.weather || this.weather,
      })
      this.seen = new Set(s.seen || []); this.caught = new Set(s.caught || [])
      // repair old monsters
      for (const m of [...this.party, ...this.box]) {
        if (!m.ivs) m.ivs = [15,15,15,15,15,15]
        if (!m.moves?.length) m.moves = movesFor(m).map(x => ({ n: x.name, pp: x.pp, max: x.pp }))
        m.hp = Math.min(m.hp ?? maxHp(m), maxHp(m))
        if (!m.uid) m.uid = 'm' + (uidCounter++) + '_' + Math.floor(Math.random() * 1e6)
      }
      setLastSlot(slot)
      return true
    } catch (e) { console.warn('load failed', e); return false }
  }

  wipe (slot = this.slot) { try { localStorage.removeItem(slotKey(slot)) } catch {} }
}

export { SAVE_KEY, SLOT_PREFIX, LAST_SLOT_KEY }
