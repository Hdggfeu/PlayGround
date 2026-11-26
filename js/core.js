import { POKEDEX } from './pokedata.js'
import { speciesName } from './i18n.js'

export const SAVE_KEY = 'jardin.save.v1'
export const SOUND_KEY = 'jardin.sound'

export const MODE_INFO = {
  adventure: {
    difficulty: 'diffEasy', lives: 'livesClassic', catchRule: 'catchFree',
    options: { trainers: false, wild: false, moves: false, starter: false }
  },
  random: {
    difficulty: 'diffChaos', lives: 'livesClassic', catchRule: 'catchFree',
    options: { trainers: true, wild: true, moves: true, starter: true }
  },
  hardcore: {
    difficulty: 'diffBrutal', lives: 'livesPerma', catchRule: 'catchFree',
    options: { trainers: true, wild: true, moves: true, starter: true }
  },
  nuzlocke: {
    difficulty: 'diffNuzlocke', lives: 'livesPerma', catchRule: 'catchOneZone',
    options: { trainers: true, wild: true, moves: true, starter: true }
  }
}

export const TYPE_CHART = {
  normal: { rock: .5, ghost: 0, steel: .5 },
  fire: { fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2 },
  water: { fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5 },
  electric: { water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5 },
  grass: { fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5 },
  ice: { fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5 },
  fighting: { normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5 },
  poison: { grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2 },
  flying: { electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5 },
  psychic: { fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5 },
  bug: { fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5 },
  rock: { fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: .5 },
  dragon: { dragon: 2, steel: .5, fairy: 0 },
  dark: { fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5 },
  steel: { fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2 },
  fairy: { fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5 }
}

export const ITEMS = {
  potion: { key: 'itemPotion', desc: 'itemDescPotion', price: 120, kind: 'heal', value: 30, icon: '🧪' },
  superPotion: { key: 'itemSuperPotion', desc: 'itemDescSuperPotion', price: 300, kind: 'heal', value: 60, icon: '🧴' },
  hyperPotion: { key: 'itemHyperPotion', desc: 'itemDescHyperPotion', price: 620, kind: 'heal', value: 120, icon: '🫙' },
  revive: { key: 'itemRevive', desc: 'itemDescRevive', price: 520, kind: 'revive', icon: '✚' },
  antidote: { key: 'itemAntidote', desc: 'itemDescAntidote', price: 90, kind: 'cure', icon: '🌿' },
  ball: { key: 'itemBall', desc: 'itemDescBall', price: 110, kind: 'ball', rate: 1, icon: '◓' },
  greatBall: { key: 'itemGreatBall', desc: 'itemDescGreatBall', price: 320, kind: 'ball', rate: 1.45, icon: '◉' },
  ultraBall: { key: 'itemUltraBall', desc: 'itemDescUltraBall', price: 680, kind: 'ball', rate: 1.9, icon: '⬤' }
}

export const SHOP_STOCK = ['potion', 'superPotion', 'revive', 'antidote', 'ball', 'greatBall']

export const hooks = {
  toast: () => {},
  refresh: () => {},
  onBattleEnd: () => {},
  onEnding: () => {}
}

export let state = null

export function setState(next) {
  state = next
  return state
}

export function rngFor(seed) {
  let a = typeof seed === 'number' ? seed : hashString(seed)
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function pick(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)]
}

export function shuffle(list, rng = Math.random) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

export function species(id) { return POKEDEX.species[id] || null }

export function availableSpecies() {
  return Object.values(POKEDEX.species).filter(s => !s.legendary)
}

export function safeSpecies(id) {
  if (POKEDEX.species[id]) return Number(id)
  const all = availableSpecies()
  if (!all.length) return 133
  return all[hashString(String(id)) % all.length].id
}

export function defaultBag(mode) {
  if (mode === 'adventure') return { potion: 4, superPotion: 1, antidote: 1, ball: 8, greatBall: 1 }
  if (mode === 'hardcore') return { ball: 6, greatBall: 1 }
  return { potion: 2, antidote: 1, ball: 6, greatBall: 1 }
}

export function createState(mode = 'adventure', seed = 'jardin', options = {}) {
  const info = MODE_INFO[mode] || MODE_INFO.adventure
  const opts = { ...info.options, ...options }
  return {
    version: 1,
    mode,
    seed: String(seed || 'jardin'),
    options: opts,
    player: { x: 70 * 32, y: 100 * 32, dir: 'up', name: 'Noé' },
    team: [],
    reserve: [],
    bag: defaultBag(mode),
    petals: 120,
    badges: { rose: false, lake: false, greenhouse: false, fireflies: false },
    arenas: { rose: false, lake: false, greenhouse: false, fireflies: false },
    defeatedTrainers: [],
    discovered: ['village'],
    caught: {},
    seen: {},
    nuzlockeCaught: {},
    bossDefeated: false,
    introSeen: false,
    tutorialSeen: false,
    playtime: 0,
    startedAt: Date.now(),
    zone: 'village',
    settings: { music: true, sfx: true }
  }
}

export function saveGame() {
  if (!state) return false
  try {
    const copy = JSON.parse(JSON.stringify(state))
    copy.savedAt = Date.now()
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy))
    return true
  } catch {
    return false
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY) } catch { return false }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !data.mode || !Array.isArray(data.team)) return null
    const base = createState(data.mode, data.seed, data.options)
    const merged = { ...base, ...data }
    merged.options = { ...base.options, ...(data.options || {}) }
    merged.badges = { ...base.badges, ...(data.badges || {}) }
    merged.arenas = { ...base.arenas, ...(data.arenas || {}) }
    merged.bag = { ...base.bag, ...(data.bag || {}) }
    merged.settings = { ...base.settings, ...(data.settings || {}) }
    merged.discovered = Array.isArray(data.discovered) ? data.discovered : ['village']
    merged.defeatedTrainers = Array.isArray(data.defeatedTrainers) ? data.defeatedTrainers : []
    merged.caught = data.caught || {}
    merged.seen = data.seen || {}
    merged.nuzlockeCaught = data.nuzlockeCaught || {}
    merged.team = data.team.map(ensureMon).filter(Boolean)
    merged.reserve = (data.reserve || []).map(ensureMon).filter(Boolean)
    merged.player = { ...base.player, ...(data.player || {}) }
    return merged
  } catch {
    return null
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY) } catch {}
}

export function statTotal(sp) {
  if (!sp) return 300
  return Object.values(sp.stats || {}).reduce((a, b) => a + b, 0) || 300
}

export function calcStats(sp, level) {
  const b = sp.stats
  return {
    hp: Math.floor((2 * b.hp * level) / 100) + level + 10,
    atk: Math.floor((2 * b.atk * level) / 100) + 5,
    def: Math.floor((2 * b.def * level) / 100) + 5,
    spa: Math.floor((2 * b.spa * level) / 100) + 5,
    spd: Math.floor((2 * b.spd * level) / 100) + 5,
    spe: Math.floor((2 * b.spe * level) / 100) + 5
  }
}

export function expNeeded(level) {
  return 24 + level * level * 5 + level * 8
}

export function expGain(enemyMon, kind) {
  const base = statTotal(species(enemyMon.id))
  const mult = kind === 'wild' ? 1 : 1.45
  return Math.max(9, Math.floor((base / 4 + enemyMon.level * 7) * mult))
}

export function makeMon(id, level, opts = {}) {
  const sid = safeSpecies(id)
  const sp = species(sid)
  const lv = clamp(Math.round(level || 5), 1, 100)
  const st = calcStats(sp, lv)
  const learn = (sp.learnset || [])
    .filter(x => x.level <= lv && POKEDEX.moves[x.move])
    .sort((a, b) => a.level - b.level)
  const seen = new Set()
  let moveIds = []
  for (let i = learn.length - 1; i >= 0 && moveIds.length < 4; i--) {
    if (!seen.has(learn[i].move)) { seen.add(learn[i].move); moveIds.unshift(learn[i].move) }
  }
  if (!moveIds.length) moveIds = ['tackle']
  const hasDamage = moveIds.some(m => (POKEDEX.moves[m]?.power || 0) > 0)
  if (!hasDamage) moveIds[moveIds.length - 1] = 'tackle'
  const moves = moveIds.map(m => ({
    id: m,
    pp: POKEDEX.moves[m]?.pp || 10,
    maxPp: POKEDEX.moves[m]?.pp || 10
  }))
  const mon = {
    id: sid,
    level: lv,
    exp: 0,
    hp: st.hp,
    maxHp: st.hp,
    stats: st,
    moves,
    status: '',
    sleepTurns: 0,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    lost: false,
    protected: false,
    flinched: false,
    shiny: !!opts.shiny,
    origin: opts.origin || ''
  }
  return mon
}

export function ensureMon(raw) {
  if (!raw || !raw.id) return null
  const base = makeMon(raw.id, raw.level || 5)
  const mon = { ...base, ...raw }
  mon.stats = { ...base.stats, ...(raw.stats || {}) }
  mon.moves = (raw.moves || base.moves).filter(m => m && POKEDEX.moves[m.id]).map(m => ({
    id: m.id,
    pp: typeof m.pp === 'number' ? m.pp : (POKEDEX.moves[m.id]?.pp || 10),
    maxPp: m.maxPp || POKEDEX.moves[m.id]?.pp || 10
  }))
  if (!mon.moves.length) mon.moves = base.moves
  mon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, ...(raw.stages || {}) }
  mon.maxHp = Math.max(1, raw.maxHp || base.maxHp)
  mon.hp = clamp(raw.hp == null ? mon.maxHp : raw.hp, 0, mon.maxHp)
  return mon
}

export function monName(mon) {
  return mon.nickname || speciesName(mon.id)
}

export function recalcStats(mon) {
  const st = calcStats(species(mon.id), mon.level)
  const diff = st.hp - mon.maxHp
  mon.stats = st
  mon.maxHp = st.hp
  mon.hp = clamp(mon.hp + Math.max(0, diff), 1, mon.maxHp)
}

export function healMon(mon) {
  if (!mon) return
  mon.hp = mon.maxHp
  mon.status = ''
  mon.sleepTurns = 0
  mon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
  mon.protected = false
  mon.flinched = false
  mon.moves.forEach(m => { m.pp = m.maxPp })
}

export function healTeam(team = state?.team || []) {
  team.forEach(m => { if (!m.lost) healMon(m) })
}

export function aliveTeam() {
  return (state?.team || []).filter(m => !m.lost && m.hp > 0)
}

export function firstAliveIndex() {
  return (state?.team || []).findIndex(m => !m.lost && m.hp > 0)
}

export function partyFull() { return (state?.team || []).length >= 6 }

export function addToTeam(mon) {
  if (!state) return 'none'
  if (state.team.length < 6) {
    state.team.push(mon)
    return 'team'
  }
  state.reserve.push(mon)
  return 'reserve'
}

export function removeLostFromTeam() {
  if (!state) return 0
  const lost = state.team.filter(m => m.lost)
  state.team = state.team.filter(m => !m.lost)
  const dead = state.reserve.filter(m => m.lost)
  state.reserve = state.reserve.filter(m => !m.lost)
  return lost.length + dead.length
}

export function permadeath() {
  return state && (state.mode === 'hardcore' || state.mode === 'nuzlocke')
}

export function oneCatchPerZone() {
  return state && state.mode === 'nuzlocke'
}

export function noBattleItems() {
  return state && state.mode === 'hardcore'
}

export function canCatchHere(zoneId) {
  if (!state) return false
  if (!oneCatchPerZone()) return true
  return !state.nuzlockeCaught[zoneId]
}

export function moveTypeFor(moveId) {
  const move = POKEDEX.moves[moveId]
  if (!move) return 'normal'
  if (!state?.options?.moves) return move.type
  const types = Object.keys(TYPE_CHART)
  return types[hashString(`${state.seed}:${moveId}`) % types.length]
}

export function effectiveness(moveType, defenderTypes = []) {
  let mult = 1
  for (const defType of defenderTypes) {
    const row = TYPE_CHART[moveType]
    if (row && row[defType] != null) mult *= row[defType]
  }
  return mult
}

export function stageMultiplier(stage) {
  const s = clamp(stage || 0, -6, 6)
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s)
}

export function statLabelKey(stat) {
  return {
    attack: 'statAttack', defense: 'statDefense', 'special-attack': 'statSpAtk',
    'special-defense': 'statSpDef', speed: 'statSpeed',
    accuracy: 'statAccuracy', evasion: 'statEvasion'
  }[stat] || stat
}

export function stageKey(stat) {
  return {
    attack: 'atk', defense: 'def', 'special-attack': 'spa',
    'special-defense': 'spd', speed: 'spe', accuracy: 'acc', evasion: 'eva'
  }[stat] || null
}

export function applyStatChange(mon, stat, change) {
  const key = stageKey(stat)
  if (!key) return null
  const before = mon.stages[key] || 0
  const after = clamp(before + change, -6, 6)
  mon.stages[key] = after
  if (after === before) return null
  return after > before ? 'up' : 'down'
}

export function addExp(mon, amount) {
  if (!mon || mon.lost) return { levels: 0, learned: [] }
  mon.exp += amount
  let levels = 0
  while (mon.level < 100 && mon.exp >= expNeeded(mon.level)) {
    mon.exp -= expNeeded(mon.level)
    mon.level++
    levels++
    recalcStats(mon)
  }
  return { levels }
}

export function learnMoves(mon) {
  const sp = species(mon.id)
  if (!sp) return []
  const known = new Set(mon.moves.map(m => m.id))
  const candidates = (sp.learnset || [])
    .filter(x => x.level <= mon.level && POKEDEX.moves[x.move] && !known.has(x.move))
    .sort((a, b) => a.level - b.level)
  const learned = []
  for (const entry of candidates) {
    if (mon.moves.length < 4) {
      mon.moves.push({ id: entry.move, pp: POKEDEX.moves[entry.move].pp, maxPp: POKEDEX.moves[entry.move].pp })
      learned.push(entry.move)
    } else {
      const replaceIndex = mon.moves.findIndex(m => (POKEDEX.moves[m.id]?.power || 0) === 0)
      const idx = replaceIndex >= 0 ? replaceIndex : 0
      mon.moves[idx] = { id: entry.move, pp: POKEDEX.moves[entry.move].pp, maxPp: POKEDEX.moves[entry.move].pp }
      learned.push(entry.move)
    }
    known.add(entry.move)
    if (learned.length >= 2) break
  }
  return learned
}

export function tryEvolve(mon) {
  const sp = species(mon.id)
  if (!sp || !sp.evolvesTo || !sp.evolveLevel) return null
  if (mon.level < sp.evolveLevel) return null
  if (!POKEDEX.species[sp.evolvesTo]) return null
  const oldName = monName(mon)
  mon.id = sp.evolvesTo
  recalcStats(mon)
  healMon(mon)
  const newSp = species(mon.id)
  return { oldName, newName: speciesName(mon.id), species: newSp }
}

export function randomStarterIds(rng, count = 3) {
  const pool = POKEDEX.firstStage.filter(id => POKEDEX.species[id])
  const shuffled = shuffle(pool, rng)
  const chosen = []
  const usedTypes = new Set()
  for (const id of shuffled) {
    const sp = species(id)
    if (!sp) continue
    const primary = sp.types[0]
    if (usedTypes.has(primary) && chosen.length < count) continue
    chosen.push(id)
    usedTypes.add(primary)
    if (chosen.length >= count) break
  }
  if (chosen.length < count) {
    for (const id of shuffled) {
      if (!chosen.includes(id)) chosen.push(id)
      if (chosen.length >= count) break
    }
  }
  return chosen.slice(0, count)
}

export function randomTrainerTeam(level, size, rng, zonePool = null) {
  const pool = zonePool && zonePool.length
    ? zonePool.filter(id => POKEDEX.species[id])
    : availableSpecies().map(s => s.id)
  const out = []
  for (let i = 0; i < size; i++) {
    const id = pick(pool.length ? pool : [133], rng)
    out.push({ id, level: clamp(level + Math.floor(rng() * 3) - 1, 2, 100) })
  }
  return out
}

export function bossTeam() {
  return [
    { id: 448, level: 30 },
    { id: 468, level: 31 },
    { id: 282, level: 32 },
    { id: 130, level: 33 }
  ]
}

class AudioManager {
  constructor() {
    this.enabled = true
    this.ctx = null
    this.musicTimer = null
    this.scene = 'title'
    this.step = 0
    this.cryCache = new Map()
    try {
      const saved = localStorage.getItem(SOUND_KEY)
      if (saved === 'off') this.enabled = false
    } catch {}
  }

  setEnabled(on) {
    this.enabled = !!on
    try { localStorage.setItem(SOUND_KEY, this.enabled ? 'on' : 'off') } catch {}
    if (!this.enabled) this.stopMusic()
    else this.startMusic()
  }

  ensure() {
    if (!this.enabled) return null
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return null
        this.ctx = new Ctx()
      }
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return this.ctx
    } catch { return null }
  }

  tone(freq, dur = 0.12, type = 'sine', vol = 0.045, delay = 0) {
    const ctx = this.ensure()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t0 = ctx.currentTime + delay
      osc.type = type
      osc.frequency.setValueAtTime(freq, t0)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + dur + 0.02)
    } catch {}
  }

  sfx(name) {
    if (!this.enabled) return
    if (name === 'select') { this.tone(660, .07, 'triangle', .04); this.tone(880, .08, 'triangle', .035, .05) }
    else if (name === 'confirm') { this.tone(520, .08, 'triangle', .045); this.tone(780, .1, 'triangle', .04, .07) }
    else if (name === 'hit') { this.tone(160, .1, 'square', .035); this.tone(110, .14, 'sawtooth', .025, .04) }
    else if (name === 'super') { this.tone(320, .09, 'square', .04); this.tone(480, .1, 'square', .035, .06); this.tone(640, .12, 'square', .03, .12) }
    else if (name === 'faint') { this.tone(300, .16, 'sawtooth', .03); this.tone(190, .22, 'sawtooth', .025, .12) }
    else if (name === 'catch') { this.tone(660, .1, 'sine', .04); this.tone(990, .12, 'sine', .04, .1); this.tone(1320, .16, 'sine', .035, .22) }
    else if (name === 'heal') { this.tone(520, .1, 'sine', .04); this.tone(660, .1, 'sine', .04, .09); this.tone(880, .16, 'sine', .04, .18) }
    else if (name === 'badge') { this.tone(523, .12, 'triangle', .05); this.tone(659, .12, 'triangle', .05, .11); this.tone(784, .12, 'triangle', .05, .22); this.tone(1046, .22, 'triangle', .05, .33) }
    else if (name === 'step') { this.tone(220, .03, 'sine', .012) }
    else if (name === 'error') { this.tone(180, .12, 'square', .03) }
  }

  cry(id) {
    if (!this.enabled) return
    try {
      const key = String(id)
      let audio = this.cryCache.get(key)
      if (!audio) {
        audio = new Audio(`assets/cries/${key}.ogg`)
        audio.volume = 0.28
        this.cryCache.set(key, audio)
      }
      audio.currentTime = 0
      const p = audio.play()
      if (p && p.catch) p.catch(() => {})
    } catch {}
  }

  startMusic() {
    if (!this.enabled || this.musicTimer) return
    this.musicTimer = setInterval(() => this.musicTick(), 1900)
    this.musicTick()
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer)
    this.musicTimer = null
  }

  setScene(scene) {
    if (this.scene === scene) return
    this.scene = scene
    this.step = 0
  }

  musicTick() {
    if (!this.enabled) return
    const melodies = {
      title: [392, 494, 587, 494, 440, 523, 659, 523],
      world: [330, 392, 440, 392, 294, 370, 440, 370],
      battle: [392, 392, 466, 392, 349, 349, 415, 349],
      ending: [523, 659, 784, 659, 587, 698, 880, 698]
    }
    const notes = melodies[this.scene] || melodies.world
    const note = notes[this.step % notes.length]
    this.step++
    this.tone(note, .55, 'sine', .012)
    this.tone(note / 2, .8, 'triangle', .009, .04)
  }
}

export const audio = new AudioManager()

export function setBattleState(b) {
  state.battle = b
}
