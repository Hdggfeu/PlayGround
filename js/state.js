import { SPECIES, MOVES, ITEMS, BADGES, LOCATIONS, LOCATION_ORDER, ONLINE_RANKS, OBJECTIVES } from './data.js'

export const SAVE_KEY = 'pokemon-templier-save-v1'
export const G = { save: null, location: null, player: null, battle: null, paused: false, startedAt: Date.now() }

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function xpToNext(level) {
  return Math.floor(24 * level + 14 * Math.pow(level, 1.55))
}

export function statsOf(mon) {
  const sp = SPECIES[mon.species]
  const b = sp.base
  const l = mon.level
  const megaBoost = mon.mega ? (sp.mega?.boost || 1.3) : 1
  const val = (base, isHp = false) => {
    let v = isHp
      ? Math.floor(base * l / 50) + l + 10
      : Math.floor(base * l / 50) + 5
    if (mon.mega) v = Math.floor(v * megaBoost)
    return v
  }
  return {
    maxHp: val(b.hp, true), atk: val(b.atk), def: val(b.def),
    spa: val(b.spa), spd: val(b.spd), spe: val(b.spe)
  }
}

export function displaySpecies(mon) {
  const sp = SPECIES[mon.species]
  if (mon.mega && sp.mega) return { ...sp, name: sp.mega.name, types: sp.mega.types, art: { ...sp.art, ...sp.mega.art } }
  return sp
}

export function movesForLevel(speciesId, level) {
  const sp = SPECIES[speciesId]
  const learned = sp.learnset.filter(([l]) => l <= level).map(([, m]) => m)
  const uniq = [...new Set(learned)]
  return uniq.slice(-4).map(id => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp }))
}

export function createMonster(speciesId, level, opts = {}) {
  const sp = SPECIES[speciesId]
  if (!sp) throw new Error('Unknown species ' + speciesId)
  const mon = {
    uid: uid(), species: speciesId, level,
    xp: 0, status: null, statusTurns: 0, mega: false,
    moves: movesForLevel(speciesId, level),
    nature: opts.nature || ['vaillant', 'calme', 'vif', 'malin', 'hardi'][Math.floor(Math.random() * 5)]
  }
  mon.hp = statsOf(mon).maxHp
  if (opts.hp != null) mon.hp = Math.min(opts.hp, mon.hp)
  return mon
}

export function newGame(profile, starterId) {
  const starter = createMonster(starterId, 5)
  const save = {
    version: 1,
    profile: { ...profile },
    createdAt: Date.now(),
    lastSaved: Date.now(),
    playtime: 0,
    money: 1500,
    badges: [],
    team: [starter],
    box: [],
    items: { sable_ball: 5, potion: 3, antidote: 1 },
    friends: [{
      id: 'professeur_sable', name: 'Professeur Sable', role: 'Chercheur de sable',
      metAt: 'Sablonville', since: Date.now(), color: '#f0c96b', kind: 'professor'
    }],
    location: 'sablonville',
    pos: null,
    flags: {
      introDone: true, professorFriend: true, megaUnlocked: false, templionGift: false,
      fourthBadgeSeen: false, legendsDone: false, islandsUnlocked: false,
      towerProgress: 0, towerDone: false, champion: false, endingSeen: false,
      sanctuaryUnlocked: false, talkedToProfessor: false, firstBattleWon: false
    },
    legends: { latias: false, latios: false, rayquaza: false },
    seen: { [starterId]: true },
    caught: { [starterId]: true },
    online: { points: 0, wins: 0, losses: 0 },
    stats: { battles: 0, wins: 0, catches: 0, steps: 0, friendsMade: 0 },
    settings: { sound: true, reducedMotion: false },
    log: [{ at: Date.now(), text: 'Le Professeur Sable t’a confié ton premier Pokémon.' }]
  }
  return save
}

export function sanitizeSave(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (!raw.profile || !Array.isArray(raw.team) || !raw.team.length) return null
  raw.flags ||= {}
  raw.legends ||= { latias: false, latios: false, rayquaza: false }
  raw.items ||= {}
  raw.friends ||= []
  raw.box ||= []
  raw.badges ||= []
  raw.seen ||= {}
  raw.caught ||= {}
  raw.online ||= { points: 0, wins: 0, losses: 0 }
  raw.stats ||= { battles: 0, wins: 0, catches: 0, steps: 0, friendsMade: 0 }
  raw.settings ||= { sound: true, reducedMotion: false }
  raw.log ||= []
  for (const mon of [...raw.team, ...raw.box]) {
    if (!SPECIES[mon.species]) return null
    if (!Array.isArray(mon.moves) || !mon.moves.length) mon.moves = movesForLevel(mon.species, mon.level)
    const max = statsOf(mon).maxHp
    if (mon.hp == null || mon.hp > max) mon.hp = max
    mon.mega = false
  }
  if (!LOCATIONS[raw.location]) raw.location = 'sablonville'
  return raw
}

export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
    return sanitizeSave(raw)
  } catch { return null }
}

export function persist(silent = true) {
  if (!G.save) return
  G.save.lastSaved = Date.now()
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)) } catch {}
  if (!silent) toast('Sauvegarde effectuée', '💾')
}

export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY) } catch {}
}

export function hasBadge(id) { return G.save?.badges.includes(id) }

export function addBadge(id) {
  if (!G.save || G.save.badges.includes(id)) return false
  G.save.badges.push(id)
  const b = BADGES.find(x => x.id === id)
  if (b) G.save.log.push({ at: Date.now(), text: `Badge obtenu : ${b.name}` })
  if (G.save.badges.length >= 4) {
    G.save.flags.sanctuaryUnlocked = true
  }
  if (G.save.badges.length >= 8) {
    G.save.flags.islandsUnlocked = true
  }
  persist()
  return true
}

export function addItem(id, qty = 1) {
  if (!G.save) return
  G.save.items[id] = (G.save.items[id] || 0) + qty
}

export function takeItem(id, qty = 1) {
  if (!G.save || (G.save.items[id] || 0) < qty) return false
  G.save.items[id] -= qty
  if (G.save.items[id] <= 0) delete G.save.items[id]
  return true
}

export function healTeam() {
  if (!G.save) return
  for (const mon of G.save.team) {
    mon.hp = statsOf(mon).maxHp
    mon.status = null
    mon.statusTurns = 0
    for (const mv of mon.moves) mv.pp = mv.maxPp
  }
  persist()
}

export function healOne(mon) {
  mon.hp = statsOf(mon).maxHp
  mon.status = null
  mon.statusTurns = 0
}

export function addFriend(friend) {
  if (!G.save) return false
  if (G.save.friends.some(f => f.id === friend.id)) return false
  G.save.friends.push({ ...friend, since: Date.now() })
  G.save.stats.friendsMade++
  persist()
  return true
}

export function isFriend(id) { return !!G.save?.friends.some(f => f.id === id) }

export function addMonster(mon, preferBox = false) {
  if (!G.save) return { boxed: false }
  G.save.seen[mon.species] = true
  if (!preferBox && G.save.team.length < 6) {
    G.save.team.push(mon)
    return { boxed: false, index: G.save.team.length - 1 }
  }
  G.save.box.push(mon)
  return { boxed: true, index: G.save.box.length - 1 }
}

export function registerSeen(speciesId) {
  if (G.save) G.save.seen[speciesId] = true
}
export function registerCaught(speciesId) {
  if (G.save) { G.save.seen[speciesId] = true; G.save.caught[speciesId] = true }
}

export function gainXp(mon, amount) {
  const events = { levels: [], learned: [], evolved: null }
  if (!mon || mon.hp <= 0) return events
  mon.xp += Math.max(1, Math.floor(amount))
  let guard = 0
  while (mon.xp >= xpToNext(mon.level) && mon.level < 100 && guard++ < 50) {
    mon.xp -= xpToNext(mon.level)
    const oldMax = statsOf(mon).maxHp
    mon.level++
    const newMax = statsOf(mon).maxHp
    mon.hp = Math.min(newMax, mon.hp + (newMax - oldMax))
    events.levels.push(mon.level)
    // learn moves at this level
    const sp = SPECIES[mon.species]
    for (const [lvl, moveId] of sp.learnset) {
      if (lvl !== mon.level) continue
      if (mon.moves.some(m => m.id === moveId)) continue
      if (mon.moves.length < 4) {
        mon.moves.push({ id: moveId, pp: MOVES[moveId].pp, maxPp: MOVES[moveId].pp })
        events.learned.push(moveId)
      } else {
        mon.moves[0] = { id: moveId, pp: MOVES[moveId].pp, maxPp: MOVES[moveId].pp }
        events.learned.push(moveId)
      }
    }
    // evolution is applied after battle by UI, but record it
    if (sp.evolve && mon.level >= sp.evolve.level && !mon.mega) {
      events.evolved = sp.evolve.to
    }
  }
  return events
}

export function evolveMonster(mon, toSpecies) {
  const oldMax = statsOf(mon).maxHp
  mon.species = toSpecies
  mon.moves = movesForLevel(toSpecies, mon.level)
  const newMax = statsOf(mon).maxHp
  mon.hp = Math.min(newMax, mon.hp + Math.max(0, newMax - oldMax))
  G.save.seen[toSpecies] = true
  G.save.caught[toSpecies] = true
}

export function rankInfo(points = G.save?.online.points || 0) {
  let rank = ONLINE_RANKS[0]
  for (const r of ONLINE_RANKS) if (points >= r.min) rank = r
  return rank
}

export function nextRank(points = G.save?.online.points || 0) {
  return ONLINE_RANKS.find(r => r.min > points) || null
}

export function objective() {
  const s = G.save
  if (!s) return ''
  const n = s.badges.length
  if (!s.flags.talkedToProfessor) return OBJECTIVES.start
  if (n === 0) return OBJECTIVES.firstBadge
  if (n >= 4 && !s.flags.megaUnlocked) return OBJECTIVES.fourth
  if (n >= 4 && n < 8) return OBJECTIVES.badges
  if (n >= 8 && !s.flags.towerDone) return OBJECTIVES.tower
  if (s.flags.towerDone && !s.flags.champion) return OBJECTIVES.league
  if (s.flags.champion) return OBJECTIVES.champion
  return OBJECTIVES.badges
}

export function locationUnlocked(locId) {
  const s = G.save
  if (!s) return false
  const loc = LOCATIONS[locId]
  if (!loc) return false
  if (locId === 'sanctuaire') return s.flags.sanctuaryUnlocked || s.badges.length >= 4
  if (locId === 'ile_epreuves') return s.flags.islandsUnlocked || s.badges.length >= 8
  if (locId === 'ile_ligue') return s.flags.towerDone
  if (loc.order >= 0 && loc.order < 8) return s.badges.length >= loc.order
  return false
}

export function formatPlaytime(ms) {
  const total = Math.floor((ms || 0) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function friendMeta(id) {
  const colors = ['#f0c96b', '#8ecae6', '#f4a6c8', '#7de0d8', '#b9a8e8', '#e8a06b']
  return { color: colors[id.length % colors.length] }
}

export function itemCount(id) { return G.save?.items[id] || 0 }
export function allItems() {
  return Object.entries(G.save?.items || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, ...ITEMS[id] })).filter(x => x.name)
}

export function totalBadgeCount() { return G.save?.badges.length || 0 }
export function maxTeamLevel() { return Math.max(...(G.save?.team.map(m => m.level) || [1])) }

export function toast(text, icon = '') {
  const root = document.getElementById('toast-root')
  if (!root) return
  const el = document.createElement('div')
  el.className = 'toast'
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHTML(text)}</span>`
  root.appendChild(el)
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400) }, 2600)
}

export function escapeHTML(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export function saveTimeAgo(ts) {
  if (!ts) return 'jamais'
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return 'à l’instant'
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`
  return `il y a ${Math.floor(d / 86400)} j`
}

// generic weighted pick
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
