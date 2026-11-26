import { POKEDEX } from './pokedata.js'
import {
  state, makeMon, monName, species, effectiveness, moveTypeFor, expGain, addExp,
  learnMoves, tryEvolve, healMon, healTeam, permadeath, oneCatchPerZone, noBattleItems,
  canCatchHere, audio, hooks, saveGame, removeLostFromTeam, stageMultiplier,
  applyStatChange, statLabelKey, ITEMS, clamp
} from './core.js'
import { t, moveName, typeName, typeColor } from './i18n.js'

const $ = id => document.getElementById(id)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const STRUGGLE = {
  id: 'struggle', type: 'normal', class: 'physical', power: 50, accuracy: 100,
  pp: 1, priority: 0, drain: 0, healing: 0, crit: 0, flinch: 0,
  ailment: '', ailmentChance: 0, statChance: 0, stats: [], target: 'selected-pokemon'
}

const BADGE_KEYS = { rose: 'badgeRose', lake: 'badgeLake', greenhouse: 'badgeGreenhouse', fireflies: 'badgeFireflies' }
const STATUS_KEYS = { poison: 'battleStatusPoison', burn: 'battleStatusBurn', paralysis: 'battleStatusParalysis', sleep: 'battleStatusSleep' }

let battle = null

export function isBattleOpen() { return !!battle }

function moveData(moveId) {
  return POKEDEX.moves[moveId] || (moveId === 'struggle' ? STRUGGLE : null)
}

function displayMove(moveId) {
  return moveId === 'struggle' ? t('moveStruggle') : moveName(moveId)
}

function statusLabel(status) {
  return t(STATUS_KEYS[status] || status)
}

function enemyMon() {
  return battle?.enemyTeam[battle.enemyIndex] || null
}

function allyMon() {
  return state?.team[battle?.playerIndex] || null
}

function animate(el, anim, dur = 400) {
  if (!el) return
  el.style.animation = 'none'
  void el.offsetWidth
  el.style.animation = `${anim} ${dur}ms ease`
  setTimeout(() => { if (el) el.style.animation = '' }, dur + 30)
}

function setMessage(text) {
  const el = $('battleMessage')
  if (el) el.textContent = text
}

async function say(text, ms = 780) {
  setMessage(text)
  await sleep(ms)
}

function hpClass(mon) {
  const ratio = mon.hp / mon.maxHp
  if (ratio <= 0.22) return 'low'
  if (ratio <= 0.5) return 'mid'
  return ''
}

function typeChips(types) {
  return types.map(type => `<span class="type-chip" style="background:${typeColor(type)}">${typeName(type)}</span>`).join('')
}

function renderBattleUI() {
  if (!battle) return
  const em = enemyMon()
  const pm = allyMon()
  if (em) {
    const sp = species(em.id)
    $('enemyName').textContent = monName(em)
    $('enemyLevel').textContent = t('teamLevel', { level: em.level })
    $('enemyTypes').innerHTML = typeChips(sp?.types || [])
    const bar = $('enemyHp')
    bar.style.width = `${Math.max(0, (em.hp / em.maxHp) * 100)}%`
    bar.className = `hp-fill ${hpClass(em)}`
    $('enemyHpText').textContent = `${em.hp}/${em.maxHp}`
    $('enemyStatus').textContent = em.status ? statusLabel(em.status) : ''
    $('enemySprite').src = sp?.sprite || ''
    $('enemySprite').style.opacity = '1'
    $('enemySprite').style.display = ''
  }
  if (pm) {
    const sp = species(pm.id)
    $('allyName').textContent = monName(pm)
    $('allyLevel').textContent = t('teamLevel', { level: pm.level })
    $('allyTypes').innerHTML = typeChips(sp?.types || [])
    const bar = $('allyHp')
    bar.style.width = `${Math.max(0, (pm.hp / pm.maxHp) * 100)}%`
    bar.className = `hp-fill ${hpClass(pm)}`
    $('allyHpText').textContent = `${pm.hp}/${pm.maxHp}`
    $('allyStatus').textContent = pm.status ? statusLabel(pm.status) : ''
    $('playerSprite').src = sp?.back || sp?.sprite || ''
    $('playerSprite').style.opacity = '1'
    $('playerSprite').style.display = ''
  }
  const chip = $('battleModeChip')
  chip.textContent = battle.kind === 'wild' ? 'WILD' : battle.kind === 'boss' ? 'HEART' : battle.kind === 'leader' ? 'ARENA' : 'TRAINER'
  const sky = $('battleSky')
  sky.className = 'battle-sky'
  const firstType = species(em?.id)?.types?.[0]
  if (['fire', 'water', 'electric', 'dark', 'grass', 'psychic'].includes(firstType)) sky.classList.add(`theme-${firstType}`)
}

function actionButton(act, icon, label, extra = '') {
  return `<button class="battle-action ${extra}" data-act="${act}"><span class="ba-ico">${icon}</span><span>${label}</span></button>`
}

function renderActions(view = 'main') {
  if (!battle) return
  const root = $('battleActions')
  if (!root) return
  if (battle.over) { root.innerHTML = ''; return }
  if (battle.busy) {
    root.innerHTML = `<div class="battle-back" style="grid-column:1/-1">…</div>`
    return
  }
  const pm = allyMon()
  if (!pm) { root.innerHTML = ''; return }

  if (view === 'fight') {
    const moves = pm.moves.map((slot, i) => {
      const md = moveData(slot.id)
      const type = moveTypeFor(slot.id)
      const pp = slot.pp
      return `<button class="battle-action move" data-move="${i}" ${pp <= 0 ? 'disabled' : ''}>
        <span class="move-top"><span class="move-name">${displayMove(slot.id)}</span><span class="move-type" style="background:${typeColor(type)}">${typeName(type)}</span></span>
        <span class="move-meta">${md?.power ? `PWR ${md.power}` : t('battleStatusMove')} · PP ${pp}/${slot.maxPp}</span>
      </button>`
    }).join('')
    const allEmpty = pm.moves.every(m => m.pp <= 0)
    root.innerHTML = `<div class="battle-menu-grid">${moves}${allEmpty ? `<button class="battle-action move" data-move="struggle"><span class="move-name">${t('moveStruggle')}</span><span class="move-meta">PP —</span></button>` : ''}</div>
      <button class="battle-back" data-act="back">← ${t('battleCancel')}</button>`
  } else if (view === 'bag') {
    if (noBattleItems()) {
      root.innerHTML = `<div class="battle-back" style="grid-column:1/-1">${t('battleNoItems')}</div><button class="battle-back" data-act="back">← ${t('battleCancel')}</button>`
    } else {
      const entries = Object.entries(state.bag).filter(([, n]) => n > 0)
      const rows = entries.map(([key, n]) => {
        const item = ITEMS[key]
        if (!item) return ''
        if (item.kind === 'ball' && !battle.isWild) return ''
        return `<div class="battle-item-row"><span>${item.icon} ${t(item.key)} <small>×${n}</small></span><button data-item="${key}">${t('use')}</button></div>`
      }).join('')
      root.innerHTML = `<div style="grid-column:1/-1;display:grid;gap:5px">${rows || `<div class="battle-item-row">${t('bagEmpty')}</div>`}</div>
        <button class="battle-back" data-act="back">← ${t('battleCancel')}</button>`
    }
  } else if (view === 'team') {
    const rows = state.team.map((mon, i) => {
      const alive = mon.hp > 0 && !mon.lost
      const active = i === battle.playerIndex
      return `<button class="battle-action" data-switch="${i}" ${(!alive || active) ? 'disabled' : ''}>
        <span class="ba-ico">◉</span>
        <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px">
          <span>${monName(mon)}</span>
          <small style="font-size:9px;color:var(--muted)">${t('teamLevel', { level: mon.level })} · ${mon.hp}/${mon.maxHp} HP</small>
        </span>
      </button>`
    }).join('')
    root.innerHTML = `<div class="battle-menu-grid">${rows}</div><button class="battle-back" data-act="back">← ${t('battleCancel')}</button>`
  } else {
    const canRun = battle.isWild
    root.innerHTML = `
      ${actionButton('fight', '⚔', t('battleAttack'))}
      ${actionButton('bag', '▣', t('battleBag'))}
      ${actionButton('team', '◉', t('battleTeam'))}
      ${actionButton('run', '↩', t('battleRun'), canRun ? '' : 'is-disabled')}
    `
  }

  root.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act
      if (act === 'fight' || act === 'bag' || act === 'team') {
        audio.sfx('select')
        renderActions(act)
      } else if (act === 'back') {
        audio.sfx('select')
        renderActions('main')
      } else if (act === 'run') {
        tryRun()
      }
    })
  })
  root.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.move
      if (val === 'struggle') playerMove('struggle')
      else playerMove(Number(val))
    })
  })
  root.querySelectorAll('[data-item]').forEach(btn => {
    btn.addEventListener('click', () => useBattleItem(btn.dataset.item))
  })
  root.querySelectorAll('[data-switch]').forEach(btn => {
    btn.addEventListener('click', () => switchPartner(Number(btn.dataset.switch)))
  })
}

function speedOf(mon) {
  if (!mon) return 0
  const base = mon.stats.spe * stageMultiplier(mon.stages.spe)
  return mon.status === 'paralysis' ? base * 0.5 : base
}

function chooseEnemyMove() {
  const em = enemyMon()
  if (!em) return 'struggle'
  const usable = em.moves.filter(m => m.pp > 0)
  if (!usable.length) return 'struggle'
  const target = allyMon()
  const defTypes = species(target?.id)?.types || []
  let best = usable[0]
  let bestScore = -1
  for (const slot of usable) {
    const md = moveData(slot.id)
    if (!md) continue
    const type = moveTypeFor(slot.id)
    const eff = effectiveness(type, defTypes)
    const stab = species(em.id)?.types.includes(type) ? 1.5 : 1
    let score = (md.power || 0) * eff * stab
    if (!md.power) score = 12 + (target?.status ? -8 : 0) + Math.random() * 8
    score += Math.random() * 10
    if (score > bestScore) { bestScore = score; best = slot }
  }
  return best.id
}

function playerFirst(pMoveId, eMoveId) {
  const pd = moveData(pMoveId)
  const ed = moveData(eMoveId)
  const pp = pd?.priority || 0
  const ep = ed?.priority || 0
  if (pp !== ep) return pp > ep
  const ps = speedOf(allyMon())
  const es = speedOf(enemyMon())
  if (ps === es) return Math.random() < 0.5
  return ps > es
}

async function playerMove(index) {
  if (!battle || battle.busy || battle.over) return
  const pm = allyMon()
  if (!pm) return
  let slot
  if (index === 'struggle') {
    slot = { id: 'struggle', pp: 1, maxPp: 1 }
  } else {
    slot = pm.moves[index]
    if (!slot) return
    if (slot.pp <= 0) {
      audio.sfx('error')
      await say(t('battleNoPP', { move: displayMove(slot.id) }), 650)
      renderActions('fight')
      return
    }
  }
  battle.busy = true
  renderActions()
  const eMove = chooseEnemyMove()
  const first = playerFirst(slot.id, eMove)
  if (first) {
    await performMove(pm, enemyMon(), slot, true)
    if (!battle.over && enemyMon()?.hp > 0) await performMove(enemyMon(), allyMon(), eMove, false)
  } else {
    await performMove(enemyMon(), allyMon(), eMove, false)
    if (!battle.over && allyMon()?.hp > 0) await performMove(allyMon(), enemyMon(), slot, true)
  }
  if (!battle.over) await endOfTurn()
  if (battle && !battle.over) {
    battle.busy = false
    renderActions('main')
  }
}

async function performMove(attacker, defender, slot, isPlayer) {
  if (!battle || battle.over || !attacker || !defender) return
  if (attacker.hp <= 0 || defender.hp <= 0) return
  if (attacker.flinched) {
    attacker.flinched = false
    await say(t('battleFlinch', { name: monName(attacker) }), 600)
    return
  }
  if (attacker.status === 'sleep') {
    if (attacker.sleepTurns > 0) {
      attacker.sleepTurns--
      await say(t('battleSleep', { name: monName(attacker) }), 650)
      if (attacker.sleepTurns <= 0) {
        attacker.status = ''
        await say(t('battleStatusFree', { name: monName(attacker), status: statusLabel('sleep') }), 650)
      }
      return
    }
    attacker.status = ''
  }
  if (attacker.status === 'paralysis' && Math.random() < 0.25) {
    await say(t('battleParalyzed', { name: monName(attacker) }), 650)
    return
  }
  const md = moveData(slot.id)
  if (!md) return
  if (slot.id !== 'struggle' && typeof slot.pp === 'number') slot.pp = Math.max(0, slot.pp - 1)
  const type = moveTypeFor(slot.id)
  await say(t('battleUsed', { name: monName(attacker), move: displayMove(slot.id) }), 620)
  if (defender.protected) {
    defender.protected = false
    await say(t('battleProtected', { name: monName(defender) }), 650)
    return
  }
  const acc = md.accuracy == null ? 100 : md.accuracy
  if (Math.random() * 100 >= acc) {
    await say(t('battleMiss', { name: monName(attacker) }), 620)
    return
  }
  let dealt = 0
  if ((md.power || 0) > 0) {
    const defTypes = species(defender.id)?.types || []
    const eff = effectiveness(type, defTypes)
    if (eff === 0) {
      await say(t('battleNoEffect', { name: monName(defender) }), 650)
      return
    }
    const physical = md.class !== 'special'
    const atkStat = physical ? 'atk' : 'spa'
    const defStat = physical ? 'def' : 'spd'
    let atk = attacker.stats[atkStat] * stageMultiplier(attacker.stages[atkStat])
    let def = defender.stats[defStat] * stageMultiplier(defender.stages[defStat])
    if (physical && attacker.status === 'burn') atk *= 0.5
    const crit = Math.random() < (md.crit ? 0.12 : 1 / 16)
    const stab = species(attacker.id)?.types.includes(type) ? 1.5 : 1
    const rand = 0.85 + Math.random() * 0.15
    let dmg = (((2 * attacker.level / 5 + 2) * md.power * atk / Math.max(1, def)) / 50 + 2) * stab * eff * rand
    if (crit) dmg *= 1.5
    dmg = Math.max(1, Math.floor(dmg))
    dealt = Math.min(defender.hp, dmg)
    defender.hp = Math.max(0, defender.hp - dmg)
    if (isPlayer) animate($('enemySprite'), 'shake', 380)
    else animate($('playerSprite'), 'shake', 380)
    if (crit) await say(t('battleCrit'), 380)
    if (eff > 1.05) { audio.sfx('super'); await say(t('battleSuper'), 480) }
    else if (eff < 0.95) await say(t('battleNotVery'), 480)
    audio.sfx('hit')
    renderBattleUI()
    if ((md.drain || 0) > 0) {
      const heal = Math.max(1, Math.floor(dealt * md.drain / 100))
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal)
      await say(t('battleRestored', { name: monName(attacker), hp: heal }), 520)
      renderBattleUI()
    }
    if (defender.hp <= 0) {
      await faint(defender)
      return
    }
  }
  if ((md.healing || 0) > 0 && attacker.hp < attacker.maxHp) {
    const heal = Math.max(1, Math.floor(attacker.maxHp * md.healing / 100))
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal)
    await say(t('battleRestored', { name: monName(attacker), hp: heal }), 600)
    renderBattleUI()
  }
  if (md.ailment === 'protect') {
    attacker.protected = true
    await say(t('battleProtected', { name: monName(attacker) }), 550)
  } else if (md.ailment) {
    const chance = md.ailmentChance || (md.power ? 0 : 100)
    if (Math.random() * 100 < chance) await applyAilment(defender, md.ailment)
  }
  if (Array.isArray(md.stats) && md.stats.length) {
    const target = md.target === 'user' ? attacker : defender
    for (const change of md.stats) {
      const result = applyStatChange(target, change.stat, change.change)
      if (result === 'up') await say(t('battleStatUp', { name: monName(target), stat: t(statLabelKey(change.stat)) }), 520)
      else if (result === 'down') await say(t('battleStatDown', { name: monName(target), stat: t(statLabelKey(change.stat)) }), 520)
      else if (result == null && target.stages[change.stat] != null) {
        await say(t(change.change > 0 ? 'battleStatMax' : 'battleStatMin', { name: monName(target), stat: t(statLabelKey(change.stat)) }), 520)
      }
    }
    renderBattleUI()
  }
  if (md.flinch && Math.random() * 100 < md.flinch) defender.flinched = true
}

async function applyAilment(target, ailment) {
  if (!target || target.hp <= 0) return
  if (target.status) {
    await say(t('battleStatusAlready', { name: monName(target), status: statusLabel(target.status) }), 520)
    return
  }
  const types = species(target.id)?.types || []
  if (ailment === 'burn' && types.includes('fire')) return
  if (ailment === 'poison' && (types.includes('poison') || types.includes('steel'))) return
  if (ailment === 'paralysis' && types.includes('electric')) return
  if (ailment === 'sleep' || ailment === 'freeze') {
    target.status = 'sleep'
    target.sleepTurns = 2 + Math.floor(Math.random() * 3)
    await say(t('battleStatusInflicted', { name: monName(target), status: statusLabel('sleep') }), 600)
  } else if (['burn', 'poison', 'paralysis'].includes(ailment)) {
    target.status = ailment
    await say(t('battleStatusInflicted', { name: monName(target), status: statusLabel(ailment) }), 600)
  }
  renderBattleUI()
}

async function endOfTurn() {
  if (!battle || battle.over) return
  for (const mon of [enemyMon(), allyMon()]) {
    if (!mon || mon.hp <= 0) continue
    if (mon.status === 'burn' || mon.status === 'poison') {
      const dmg = Math.max(1, Math.floor(mon.maxHp / (mon.status === 'burn' ? 16 : 8)))
      mon.hp = Math.max(0, mon.hp - dmg)
      audio.sfx('hit')
      await say(t('battleStatusHurt', { name: monName(mon), status: statusLabel(mon.status) }), 600)
      renderBattleUI()
      if (mon.hp <= 0) { await faint(mon); return }
    }
    mon.protected = false
    mon.flinched = false
  }
}

async function faint(mon) {
  if (!battle || battle.over) return
  const isEnemy = battle.enemyTeam.includes(mon)
  if (isEnemy) {
    animate($('enemySprite'), 'faint', 600)
    audio.sfx('faint')
    audio.cry(mon.id)
  } else {
    animate($('playerSprite'), 'faint', 600)
    audio.sfx('faint')
  }
  await say(t('battleFaint', { name: monName(mon) }), 800)
  if (isEnemy) {
    const ally = allyMon()
    if (ally && ally.hp > 0 && !ally.lost) {
      const gain = expGain(mon, battle.kind)
      const result = addExp(ally, gain)
      await say(t('battleExp', { name: monName(ally), exp: gain }), 620)
      if (result.levels > 0) {
        await say(t('battleLevelUp', { name: monName(ally), level: ally.level }), 780)
        audio.sfx('badge')
        const learned = learnMoves(ally)
        for (const move of learned) {
          await say(t('battleLearned', { name: monName(ally), move: displayMove(move) }), 680)
        }
        const evo = tryEvolve(ally)
        if (evo) {
          await say(t('toastEvolution', { name: evo.oldName, evo: evo.newName }), 900)
          hooks.toast(t('toastEvolution', { name: evo.oldName, evo: evo.newName }), '✿')
          renderBattleUI()
        }
      }
      renderBattleUI()
    }
    const next = battle.enemyTeam.findIndex((m, i) => i > battle.enemyIndex && m.hp > 0)
    if (next >= 0) {
      battle.enemyIndex = next
      battle.enemyTeam[next].stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
      await say(t('battleTrainerNext', { trainer: battle.trainerName, name: monName(battle.enemyTeam[next]) }), 780)
      audio.cry(battle.enemyTeam[next].id)
      renderBattleUI()
    } else {
      await winBattle()
    }
  } else {
    if (permadeath()) mon.lost = true
    const next = state.team.findIndex(m => !m.lost && m.hp > 0)
    if (next >= 0) {
      battle.playerIndex = next
      renderBattleUI()
      await say(t('battleGo', { name: monName(state.team[next]) }), 650)
      audio.cry(state.team[next].id)
    } else {
      await loseBattle()
    }
  }
}

async function winBattle() {
  if (!battle || battle.over) return
  battle.over = true
  battle.busy = true
  renderActions()
  if (battle.kind !== 'wild') {
    await say(t('battleTrainerDefeat', { trainer: battle.trainerName }), 850)
    const reward = battle.reward || 0
    if (reward) {
      state.petals += reward
      await say(t('battleReward', { n: reward }), 720)
    }
    if (battle.arenaId) {
      const id = battle.arenaId
      state.arenas[id] = true
      state.badges[id] = true
      const badgeName = t(BADGE_KEYS[id] || 'hudBadges')
      audio.sfx('badge')
      await say(t('battleBadge', { badge: badgeName }), 1000)
      hooks.toast(t('toastBadge', { badge: badgeName }), '✿')
      if (Object.values(state.badges).every(Boolean)) {
        hooks.toast(t('toastUnlockedHeart'), '◈')
      }
    }
    if (battle.trainerId && !state.defeatedTrainers.includes(battle.trainerId)) {
      state.defeatedTrainers.push(battle.trainerId)
    }
    if (battle.kind === 'boss') {
      state.bossDefeated = true
      await say(t('npcBossDefeat'), 1100)
    }
  } else {
    await say(t('battleVictory'), 650)
  }
  if (!permadeath()) {
    state.team.forEach(m => { if (m.hp <= 0 && !m.lost) m.hp = Math.max(1, Math.floor(m.maxHp / 2)) })
  } else {
    removeLostFromTeam()
  }
  hooks.refresh()
  saveGame()
  const result = battle.kind === 'boss' ? 'boss' : 'win'
  await sleep(650)
  closeBattle(result)
}

async function loseBattle() {
  if (!battle || battle.over) return
  battle.over = true
  battle.busy = true
  renderActions()
  await say(t('battleFaintedAll'), 900)
  if (permadeath()) {
    await say(t('battleDefeat'), 850)
    removeLostFromTeam()
    hooks.refresh()
    await sleep(500)
    closeBattle('lose')
  } else {
    healTeam()
    state.player.x = 74 * 32
    state.player.y = 94 * 32
    state.petals = Math.max(0, state.petals - 40)
    hooks.refresh()
    saveGame()
    await say(t('battleWhiteout'), 900)
    await sleep(400)
    closeBattle('whiteout')
  }
}

async function enemyFreeAttack() {
  if (!battle || battle.over) return
  const em = enemyMon()
  const pm = allyMon()
  if (!em || !pm || em.hp <= 0 || pm.hp <= 0) return
  await performMove(em, pm, chooseEnemyMove(), false)
  if (!battle.over) await endOfTurn()
  if (battle && !battle.over) {
    battle.busy = false
    renderActions('main')
  }
}

async function tryRun() {
  if (!battle || battle.busy || battle.over) return
  if (!battle.isWild) {
    audio.sfx('error')
    await say(t('battleCantRun'), 700)
    renderActions('main')
    return
  }
  battle.busy = true
  renderActions()
  const pm = allyMon()
  const em = enemyMon()
  const chance = clamp(0.55 + (speedOf(pm) - speedOf(em)) / 220, 0.25, 0.95)
  if (Math.random() < chance) {
    await say(t('battleRan'), 700)
    closeBattle('run')
  } else {
    await say(t('battleRunFail'), 650)
    await enemyFreeAttack()
  }
}

async function useBattleItem(key) {
  if (!battle || battle.busy || battle.over) return
  if (noBattleItems()) { await say(t('battleNoItems'), 700); renderActions('main'); return }
  const item = ITEMS[key]
  if (!item || (state.bag[key] || 0) <= 0) { await say(t('noItem', { item: t(item?.key || key) }), 650); renderActions('bag'); return }
  if (item.kind === 'ball') { await throwBall(key); return }
  const pm = allyMon()
  if (!pm) return
  battle.busy = true
  renderActions()
  if (item.kind === 'heal') {
    if (pm.hp >= pm.maxHp) {
      await say(t('notNeeded'), 550)
      battle.busy = false
      renderActions('bag')
      return
    }
    state.bag[key]--
    const heal = Math.min(item.value, pm.maxHp - pm.hp)
    pm.hp += heal
    audio.sfx('heal')
    await say(t('battleItemHeal', { item: t(item.key), name: monName(pm), hp: heal }), 750)
  } else if (item.kind === 'cure') {
    if (pm.status !== 'poison') {
      await say(t('notNeeded'), 550)
      battle.busy = false
      renderActions('bag')
      return
    }
    state.bag[key]--
    pm.status = ''
    audio.sfx('heal')
    await say(t('battleItemCure', { item: t(item.key), name: monName(pm) }), 700)
  } else if (item.kind === 'revive') {
    const target = state.team.find(m => m.hp <= 0 && !m.lost)
    if (!target) {
      await say(t('notNeeded'), 550)
      battle.busy = false
      renderActions('bag')
      return
    }
    state.bag[key]--
    target.hp = Math.max(1, Math.floor(target.maxHp / 2))
    target.status = ''
    audio.sfx('heal')
    await say(t('battleRevive', { name: monName(target) }), 750)
  }
  renderBattleUI()
  hooks.refresh()
  await enemyFreeAttack()
}

async function throwBall(key) {
  if (!battle || !battle.isWild) { await say(t('battleCatchBlocked'), 700); renderActions('main'); return }
  if (!canCatchHere(state.zone)) { await say(t('toastCatchLocked'), 800); renderActions('main'); return }
  if ((state.bag[key] || 0) <= 0) { await say(t('battleNoBalls'), 650); renderActions('main'); return }
  battle.busy = true
  renderActions()
  state.bag[key]--
  const item = ITEMS[key]
  const em = enemyMon()
  audio.sfx('select')
  await say(t('battleBall', { ball: t(item.key) }), 650)
  animate($('enemySprite'), 'faint', 400)
  await say(t('battleWiggle', { name: monName(em) }), 650)
  await say(t('battleWiggle', { name: monName(em) }), 550)
  const hpFactor = 1 - em.hp / em.maxHp
  const statusBonus = em.status ? 0.12 : 0
  const chance = clamp(0.14 + hpFactor * 0.62 + (item.rate - 1) * 0.22 + statusBonus, 0.08, 0.96)
  if (Math.random() < chance) {
    audio.sfx('catch')
    const caught = makeMon(em.id, em.level, { origin: state.zone })
    caught.hp = Math.max(1, em.hp)
    caught.status = em.status
    const where = state.team.length < 6 ? 'team' : 'reserve'
    if (where === 'team') state.team.push(caught)
    else state.reserve.push(caught)
    state.caught[em.id] = (state.caught[em.id] || 0) + 1
    state.seen[em.id] = true
    if (oneCatchPerZone()) state.nuzlockeCaught[state.zone] = true
    hooks.refresh()
    saveGame()
    await say(t('battleCaught', { name: monName(caught) }), 900)
    if (where === 'reserve') hooks.toast(t('toastSent', { name: monName(caught) }), '✿')
    await sleep(500)
    closeBattle('caught')
  } else {
    audio.sfx('error')
    $('enemySprite').style.opacity = '1'
    $('enemySprite').style.animation = ''
    await say(t('battleCatchFail', { name: monName(em) }), 800)
    await enemyFreeAttack()
  }
}

async function switchPartner(index) {
  if (!battle || battle.busy || battle.over) return
  const mon = state.team[index]
  if (!mon || mon.hp <= 0 || mon.lost || index === battle.playerIndex) return
  battle.busy = true
  renderActions()
  await say(t('battleSwitchOut', { name: monName(allyMon()) }), 550)
  battle.playerIndex = index
  renderBattleUI()
  audio.cry(mon.id)
  await say(t('battleGo', { name: monName(mon) }), 620)
  await enemyFreeAttack()
}

export function startBattle(opts) {
  if (battle) return
  const enemyTeam = (opts.enemyTeam || []).map(entry => entry.hp != null ? entry : makeMon(entry.id, entry.level, { origin: 'enemy' }))
  if (!enemyTeam.length) return
  const playerIndex = state.team.findIndex(m => !m.lost && m.hp > 0)
  if (playerIndex < 0) return
  battle = {
    kind: opts.kind || 'wild',
    trainerName: opts.trainerName || '',
    trainerId: opts.trainerId || '',
    arenaId: opts.arenaId || '',
    reward: opts.reward || 0,
    zone: opts.zone || state.zone,
    enemyTeam,
    enemyIndex: 0,
    playerIndex,
    busy: true,
    over: false,
    isWild: (opts.kind || 'wild') === 'wild',
    returnScreen: 'game'
  }
  const game = $('gameScreen')
  const battleScreen = $('battleScreen')
  if (game) game.classList.add('hidden')
  if (battleScreen) battleScreen.classList.remove('hidden')
  audio.setScene('battle')
  renderBattleUI()
  renderActions()
  audio.cry(enemyTeam[0].id)
  ;(async () => {
    const em = enemyMon()
    if (battle.kind === 'wild') await say(t('battleWild', { name: monName(em) }), 1000)
    else if (battle.kind === 'boss') await say(t('battleBoss'), 1000)
    else await say(t('battleTrainer', { trainer: battle.trainerName }), 1000)
    if (battle.kind !== 'wild') await say(t('battleSend', { trainer: battle.trainerName, name: monName(em) }), 850)
    await say(t('battleGo', { name: monName(allyMon()) }), 650)
    if (battle) {
      battle.busy = false
      renderActions('main')
    }
  })()
}

function closeBattle(result) {
  const b = battle
  battle = null
  const game = $('gameScreen')
  const battleScreen = $('battleScreen')
  if (battleScreen) battleScreen.classList.add('hidden')
  if (game) game.classList.remove('hidden')
  audio.setScene('world')
  if (hooks.onBattleEnd) hooks.onBattleEnd(result, b)
}
