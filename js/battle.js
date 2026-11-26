import { MOVES, SPECIES, TYPE_CHART, TYPE_COLORS, TYPE_ICONS, ITEMS } from './data.js'
import {
  G, statsOf, displaySpecies, gainXp, evolveMonster, createMonster, addMonster,
  registerCaught, registerSeen, persist, takeItem, addItem, allItems, toast, escapeHTML,
  maxTeamLevel, clamp
} from './state.js'
import { drawCreature, drawTrainer, ballSVG } from './art.js'
import { Dialog } from './ui.js'
import { sfx } from './audio.js'

const wait = ms => new Promise(r => setTimeout(r, ms))

function stageMult(stage) {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)
}

function typeMult(moveType, defTypes) {
  let m = 1
  for (const t of defTypes) {
    const row = TYPE_CHART[moveType]
    if (row && row[t] != null) m *= row[t]
  }
  return m
}

function hpPct(mon) { return Math.max(0, mon.hp / statsOf(mon).maxHp) }

function hpClass(pct) { return pct > .5 ? 'ok' : pct > .22 ? 'warn' : 'danger' }

function statusName(s) {
  return { brulure: 'Brûlure', paralysie: 'Paralysie', sommeil: 'Sommeil', poison: 'Poison' }[s] || s
}

function movePP(move) { return move ? `${move.pp}/${move.maxPp}` : '' }

function createEnemyTeam(config) {
  if (config.team && config.team.length) return config.team
  if (config.wild) return [createMonster(config.wild.species, config.wild.level)]
  return []
}

export function startBattle(config = {}) {
  if (G.battle) return Promise.resolve(null)
  return new Promise(resolve => {
    const playerTeam = G.save.team
    const firstAlive = playerTeam.findIndex(m => m.hp > 0)
    if (firstAlive < 0) {
      toast('Ton équipe est K.O. Soigne-la avant de combattre.', '💤')
      resolve(null); return
    }
    const enemyTeam = createEnemyTeam(config)
    if (!enemyTeam.length) { resolve(null); return }
    for (const m of playerTeam) m.mega = false
    const B = {
      config, playerTeam, enemyTeam, pIndex: firstAlive, eIndex: 0,
      stages: { p: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, e: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
      busy: true, over: false, usedMega: false, participants: new Set(),
      protectSide: null, log: [], anim: { enemyShake: 0, allyShake: 0, enemyLunge: 0, allyLunge: 0, flash: 0, ball: null },
      resolve, splash: true, startedAt: performance.now(), lastTs: 0, raf: 0,
      canCatch: config.canCatch ?? (config.kind === 'wild' || config.kind === 'legendary'),
      rewardMoney: config.rewardMoney ?? (config.kind === 'wild' ? 30 : 250),
      isTrainer: !!config.trainer && config.kind !== 'wild' && config.kind !== 'legendary'
    }
    G.battle = B
    G.save.stats.battles++
    const root = document.getElementById('battle-root')
    root.innerHTML = battleHTML(B)
    B.root = root.querySelector('.battle-screen')
    B.canvas = root.querySelector('#battle-canvas')
    B.ctx = B.canvas.getContext('2d')
    B.logEl = root.querySelector('#battle-log')
    B.enemyCard = root.querySelector('#enemy-card')
    B.allyCard = root.querySelector('#ally-card')
    B.command = root.querySelector('#battle-command')
    B.subpanel = root.querySelector('#battle-subpanel')
    B.splashEl = root.querySelector('#battle-splash')
    B.resultEl = root.querySelector('#battle-result')
    B.tagEl = root.querySelector('#battle-tag')
    B.resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      B.dpr = dpr
      B.canvas.width = Math.floor(window.innerWidth * dpr)
      B.canvas.height = Math.floor(window.innerHeight * dpr)
      B.canvas.style.width = window.innerWidth + 'px'
      B.canvas.style.height = window.innerHeight + 'px'
    }
    B.resize()
    window.addEventListener('resize', B.resize)
    B.loop = ts => {
      if (!G.battle || G.battle !== B) return
      drawBattle(B, ts)
      B.raf = requestAnimationFrame(B.loop)
    }
    B.raf = requestAnimationFrame(B.loop)
    addLog(B, config.kind === 'wild' ? `Un ${SPECIES[enemyTeam[0].species].name} sauvage apparaît !` : `${config.trainer?.name || 'Un dresseur'} entre dans l’arène !`, 'important')
    registerSeen(enemyTeam[0].species)
    updateHUD(B)
    renderCommands(B)
    showSplash(B).then(() => {
      B.splash = false
      B.busy = false
      updateHUD(B)
      renderCommands(B)
    })
  })
}

function battleHTML(B) {
  const c = B.config
  const trainer = c.trainer
  return `<div class="battle-screen theme-${c.theme || 'sand'}" style="--battle-accent:${c.palette?.accent || '#f0c96b'}">
    <canvas id="battle-canvas"></canvas>
    <div class="battle-vignette"></div>
    <div class="battle-top">
      <div class="battle-log" id="battle-log"></div>
      <div class="battle-tag" id="battle-tag">${trainer ? escapeHTML(trainer.title || 'Combat de dresseur') : c.kind === 'legendary' ? 'Légende' : 'Rencontre sauvage'}</div>
    </div>
    <div class="info-card enemy-card" id="enemy-card"></div>
    <div class="info-card ally-card" id="ally-card"></div>
    <div class="battle-command panel" id="battle-command"></div>
    <div class="battle-subpanel" id="battle-subpanel"></div>
    <div class="battle-splash" id="battle-splash"></div>
    <div class="battle-result" id="battle-result"></div>
  </div>`
}

async function showSplash(B) {
  const c = B.config
  const firstSpecies = SPECIES[B.enemyTeam[0].species]
  const enemyName = c.trainer ? c.trainer.name : firstSpecies.name
  const sub = c.kind === 'wild'
    ? (firstSpecies.gen ? `Rencontre sauvage · ${firstSpecies.gen}G ${firstSpecies.region}` : 'Rencontre sauvage')
    : c.kind === 'legendary' ? 'Une légende s’éveille' : 'Combat de dresseur'
  B.splashEl.innerHTML = `<div class="splash-inner">
    <div class="splash-vs">VS</div>
    <div class="splash-names"><span>${escapeHTML(G.save.profile.name)}</span><i>✦</i><span>${escapeHTML(enemyName)}</span></div>
    <div class="splash-sub">${escapeHTML(sub)}</div>
  </div>`
  B.splashEl.classList.add('show')
  sfx('battleStart')
  await wait(1500)
  B.splashEl.classList.remove('show')
  await wait(250)
}

function addLog(B, text, cls = '') {
  B.log.push({ text, cls })
  if (B.log.length > 6) B.log.shift()
  if (!B.logEl) return
  B.logEl.innerHTML = B.log.map(l => `<div class="log-line ${l.cls}">${escapeHTML(l.text)}</div>`).join('')
}

function updateHUD(B) {
  if (!B.enemyCard) return
  const e = B.enemyTeam[B.eIndex], p = B.playerTeam[B.pIndex]
  if (!e || !p) return
  const es = displaySpecies(e), ps = displaySpecies(p)
  const emax = statsOf(e).maxHp, pmax = statsOf(p).maxHp
  const epct = Math.max(0, e.hp / emax) * 100, ppct = Math.max(0, p.hp / pmax) * 100
  B.enemyCard.innerHTML = `
    <div class="info-head"><strong>${escapeHTML(es.name)}</strong><span>Nv. ${e.level}</span></div>
    <div class="type-row">${es.types.map(t => `<span class="type-chip small" style="--tc:${TYPE_COLORS[t]}">${TYPE_ICONS[t] || ''} ${escapeHTML(t)}</span>`).join('')}${SPECIES[e.species].gen ? `<span class="gen-chip" title="Visiteur de ${escapeHTML(SPECIES[e.species].region)}">${SPECIES[e.species].gen}G</span>` : ''}</div>
    <div class="hp-line ${hpClass(epct / 100)}"><div class="hp-track"><div class="hp-fill" style="width:${epct}%"></div></div></div>
    ${e.status ? `<span class="status-chip ${e.status}">${statusName(e.status)}</span>` : ''}`
  B.allyCard.innerHTML = `
    <div class="info-head"><strong>${escapeHTML(ps.name)}</strong><span>Nv. ${p.level}</span></div>
    <div class="type-row">${ps.types.map(t => `<span class="type-chip small" style="--tc:${TYPE_COLORS[t]}">${TYPE_ICONS[t] || ''} ${escapeHTML(t)}</span>`).join('')}</div>
    <div class="hp-line ${hpClass(ppct / 100)}"><div class="hp-track"><div class="hp-fill" style="width:${ppct}%"></div></div><span class="hp-text">${p.hp}/${pmax}</span></div>
    <div class="xp-row small"><div class="xp-track"><div class="xp-fill" style="width:${Math.min(100, p.xp / (24 * p.level + 14 * Math.pow(p.level, 1.55)) * 100)}%"></div></div></div>
    ${p.status ? `<span class="status-chip ${p.status}">${statusName(p.status)}</span>` : ''}
    ${p.mega ? '<span class="mega-chip">MÉGA</span>' : ''}`
}

function renderCommands(B) {
  if (!B.command) return
  const p = B.playerTeam[B.pIndex]
  if (!p) return
  const ps = displaySpecies(p)
  const canMega = ps.id === 'templion' && G.save.flags.megaUnlocked && !B.usedMega && !p.mega
  B.command.innerHTML = `
    <div class="move-grid">
      ${p.moves.map((mv, i) => {
        const m = MOVES[mv.id]
        return `<button class="move-btn" data-move="${i}" ${mv.pp <= 0 ? 'disabled' : ''} style="--tc:${TYPE_COLORS[m.type]}">
          <span class="move-name">${escapeHTML(m.name)}</span>
          <span class="move-meta">${TYPE_ICONS[m.type] || ''} ${escapeHTML(m.type)} · ${mv.pp}/${mv.maxPp} PP${m.power ? ` · ${m.power}` : ''}</span>
        </button>`
      }).join('')}
    </div>
    <div class="action-row">
      <button class="action-btn" data-action="bag">🎒<span>Sac</span></button>
      <button class="action-btn" data-action="team">🐾<span>Équipe</span></button>
      <button class="action-btn mega ${canMega ? 'available' : ''}" data-action="mega" ${canMega ? '' : 'disabled'}>⚜<span>Méga</span></button>
      <button class="action-btn" data-action="run">🏃<span>${B.isTrainer ? 'Fuir' : 'Fuite'}</span></button>
    </div>`
  B.command.querySelectorAll('[data-move]').forEach(btn => btn.addEventListener('click', () => {
    if (B.busy || B.over) return
    const idx = Number(btn.dataset.move)
    if (p.moves[idx].pp <= 0) { toast('Plus de PP pour cette capacité.', '⚠️'); return }
    doPlayerTurn(B, { type: 'move', index: idx })
  }))
  B.command.querySelector('[data-action="bag"]').addEventListener('click', () => { if (!B.busy && !B.over) openBag(B) })
  B.command.querySelector('[data-action="team"]').addEventListener('click', () => { if (!B.busy && !B.over) openTeam(B) })
  B.command.querySelector('[data-action="mega"]').addEventListener('click', () => { if (!B.busy && !B.over && canMega) doMega(B) })
  B.command.querySelector('[data-action="run"]').addEventListener('click', () => { if (!B.busy && !B.over) doRun(B) })
  setCommandDisabled(B, B.busy || B.over)
}

function setCommandDisabled(B, disabled) {
  B.command?.querySelectorAll('button').forEach(b => {
    if (disabled) b.setAttribute('disabled', '')
    else if (!b.classList.contains('mega')) b.removeAttribute('disabled')
  })
  if (!disabled) {
    const p = B.playerTeam[B.pIndex]
    B.command?.querySelectorAll('[data-move]').forEach((b, i) => {
      if (p?.moves[i]?.pp <= 0) b.setAttribute('disabled', '')
    })
  }
}

async function doPlayerTurn(B, action) {
  if (B.busy || B.over) return
  B.busy = true
  setCommandDisabled(B, true)
  closeSubpanel(B)
  try {
    if (action.type === 'move') await resolveTurn(B, action)
    else if (action.type === 'switch') await switchPlayer(B, action.index, false)
    else if (action.type === 'item') await useItem(B, action.item)
    else if (action.type === 'run') await tryRun(B)
  } catch (err) {
    console.error(err)
  }
  if (B.over) return
  updateHUD(B)
  renderCommands(B)
  B.busy = false
  setCommandDisabled(B, false)
}

async function doMega(B) {
  const p = B.playerTeam[B.pIndex]
  const sp = SPECIES[p.species]
  if (!sp.mega) return
  B.usedMega = true
  const oldMax = statsOf(p).maxHp
  p.mega = true
  const newMax = statsOf(p).maxHp
  p.hp = Math.min(newMax, p.hp + Math.max(0, newMax - oldMax))
  addLog(B, `Le Bracelet Templier s’embrase ! ${sp.name} évolue en ${sp.mega.name} !`, 'mega')
  sfx('mega')
  B.anim.flash = 1
  updateHUD(B)
  await wait(900)
  renderCommands(B)
}

async function resolveTurn(B, action) {
  const p = B.playerTeam[B.pIndex], e = B.enemyTeam[B.eIndex]
  const pMove = MOVES[p.moves[action.index].id]
  const eMoveData = chooseEnemyMove(B, e, p)
  const eMove = eMoveData.move
  const pPrio = pMove.priority || 0, ePrio = eMove?.priority || 0
  const pSpeed = statsOf(p).spe * stageMult(B.stages.p.spe) * (p.status === 'paralysie' ? .5 : 1)
  const eSpeed = statsOf(e).spe * stageMult(B.stages.e.spe) * (e.status === 'paralysie' ? .5 : 1)
  let playerFirst = pPrio > ePrio || (pPrio === ePrio && (pSpeed > eSpeed || (pSpeed === eSpeed && Math.random() < .5)))
  B.participants.add(p.uid)

  if (playerFirst) {
    await performMove(B, 'p', p, e, pMove, action.index)
    if (e.hp > 0 && !B.over) await performMove(B, 'e', e, p, eMove, eMoveData.index)
  } else {
    await performMove(B, 'e', e, p, eMove, eMoveData.index)
    if (p.hp > 0 && !B.over) await performMove(B, 'p', p, e, pMove, action.index)
  }
  if (B.over) return
  await endOfTurn(B)
  if (B.over) return
  await checkFaints(B)
}

function chooseEnemyMove(B, e, p) {
  const options = e.moves.map((mv, index) => {
    const m = MOVES[mv.id]
    let score = 0
    if (m.cat === 'status') {
      if (m.heal) score = e.hp < statsOf(e).maxHp * .55 ? 55 : 5
      else if (m.effect?.status) score = p.status ? 4 : 32
      else if (m.stat) score = 22
      else score = 10
    } else {
      const mult = typeMult(m.type, displaySpecies(p).types)
      const stab = displaySpecies(e).types.includes(m.type) ? 1.5 : 1
      score = m.power * mult * stab * (0.85 + Math.random() * .3)
    }
    if (mv.pp <= 0) score = -1
    return { index, move: m, score }
  })
  options.sort((a, b) => b.score - a.score)
  if (Math.random() < .16 && options.length > 1) return options[1]
  return options[0]
}

async function performMove(B, side, attacker, defender, move, moveIndex) {
  if (!move || B.over) return
  const attackerName = displaySpecies(attacker).name
  const defenderName = displaySpecies(defender).name
  // status check
  if (attacker.status === 'sommeil') {
    if (attacker.statusTurns > 0) {
      attacker.statusTurns--
      addLog(B, `${attackerName} dort profondément...`)
      await wait(650)
      if (attacker.statusTurns <= 0) { attacker.status = null; addLog(B, `${attackerName} se réveille !`) }
      return
    } else attacker.status = null
  }
  if (attacker.status === 'paralysie' && Math.random() < .25) {
    addLog(B, `${attackerName} est paralysé ! Il ne peut pas attaquer.`)
    await wait(650)
    return
  }
  if (side === 'p' && attacker.moves[moveIndex]) {
    attacker.moves[moveIndex].pp = Math.max(0, attacker.moves[moveIndex].pp - 1)
  }
  addLog(B, `${attackerName} utilise ${move.name} !`, 'action')
  if (side === 'p') { B.anim.allyLunge = 1 } else { B.anim.enemyLunge = 1 }
  sfx('move')
  await wait(260)
  if (B.protectSide && B.protectSide !== side) {
    B.protectSide = null
    addLog(B, `${defenderName} est protégé par Abri !`)
    await wait(500)
    return
  }
  const acc = move.acc ?? 100
  if (Math.random() * 100 > acc) {
    addLog(B, `${attackerName} manque son attaque !`)
    await wait(600)
    return
  }
  if (move.cat === 'status') {
    if (move.heal) {
      const max = statsOf(attacker).maxHp
      const heal = Math.max(1, Math.floor(max * move.heal))
      const before = attacker.hp
      attacker.hp = Math.min(max, attacker.hp + heal)
      addLog(B, `${attackerName} récupère ${attacker.hp - before} PV.`)
      sfx('heal')
    } else if (move.stat) {
      const stages = B.stages[side]
      const key = move.stat
      const before = stages[key]
      stages[key] = clamp(stages[key] + move.stages, -6, 6)
      if (stages[key] === before) addLog(B, `Mais ${attackerName} ne peut pas aller plus loin !`)
      else addLog(B, `${attackerName} ${move.stages > 0 ? 'augmente' : 'baisse'} son ${key === 'atk' ? 'Attaque' : key === 'def' ? 'Défense' : key === 'spa' ? 'Attaque Spéciale' : key === 'spd' ? 'Défense Spéciale' : 'Vitesse'} !`)
    } else if (move.effect?.status) {
      applyStatus(B, defender, move.effect.status, defenderName)
    } else if (move.protect) {
      B.protectSide = side
      addLog(B, `${attackerName} se protège !`)
    }
    updateHUD(B)
    await wait(700)
    return
  }
  // damage
  const atkStats = statsOf(attacker), defStats = statsOf(defender)
  const atk = (move.cat === 'phys' ? atkStats.atk : atkStats.spa) * stageMult(B.stages[side][move.cat === 'phys' ? 'atk' : 'spa'])
  const def = (move.cat === 'phys' ? defStats.def : defStats.spd) * stageMult(B.stages[side === 'p' ? 'e' : 'p'][move.cat === 'phys' ? 'def' : 'spd'])
  let dmg = Math.floor((((2 * attacker.level / 5 + 2) * move.power * atk / Math.max(1, def)) / 50) + 2)
  const stab = displaySpecies(attacker).types.includes(move.type) ? 1.5 : 1
  const mult = typeMult(move.type, displaySpecies(defender).types)
  const crit = Math.random() < .0625
  dmg = Math.floor(dmg * stab * mult * (0.86 + Math.random() * .14) * (crit ? 1.5 : 1))
  if (attacker.status === 'brulure' && move.cat === 'phys') dmg = Math.floor(dmg * .5)
  dmg = Math.max(mult === 0 ? 0 : 1, dmg)
  if (mult === 0) {
    addLog(B, `Ça n’affecte pas ${defenderName}...`)
    await wait(550)
    return
  }
  if (crit) addLog(B, 'Coup critique !', 'crit')
  if (mult > 1) addLog(B, 'C’est super efficace !', 'super')
  else if (mult < 1) addLog(B, 'Ce n’est pas très efficace...', 'weak')
  defender.hp = Math.max(0, defender.hp - dmg)
  if (side === 'p') { B.anim.enemyShake = 1; B.anim.flash = .35 } else { B.anim.allyShake = 1; B.anim.flash = .35 }
  sfx(mult > 1 ? 'superHit' : 'hit')
  addLog(B, `${defenderName} perd ${dmg} PV.`)
  updateHUD(B)
  await wait(420)
  if (move.drain && dmg > 0) {
    const heal = Math.floor(dmg * move.drain)
    attacker.hp = Math.min(statsOf(attacker).maxHp, attacker.hp + heal)
    addLog(B, `${attackerName} absorbe ${heal} PV.`)
    updateHUD(B)
    await wait(400)
  }
  if (move.effect?.status && defender.hp > 0 && Math.random() * 100 < (move.effect.chance || 100)) {
    applyStatus(B, defender, move.effect.status, defenderName)
    updateHUD(B)
    await wait(450)
  }
}

function applyStatus(B, mon, status, name) {
  if (mon.status) return
  const types = displaySpecies(mon).types
  if (status === 'brulure' && types.includes('Feu')) { addLog(B, `${name} ne peut pas être brûlé !`); return }
  if (status === 'poison' && (types.includes('Acier') || types.includes('Poison'))) { addLog(B, `${name} ne peut pas être empoisonné !`); return }
  mon.status = status
  if (status === 'sommeil') mon.statusTurns = 1 + Math.floor(Math.random() * 3)
  addLog(B, `${name} est ${status === 'sommeil' ? 'endormi' : status === 'paralysie' ? 'paralysé' : status === 'brulure' ? 'brûlé' : 'empoisonné'} !`, 'status')
  sfx('status')
}

async function endOfTurn(B) {
  for (const [side, mon] of [['p', B.playerTeam[B.pIndex]], ['e', B.enemyTeam[B.eIndex]]]) {
    if (!mon || mon.hp <= 0) continue
    if (mon.status === 'brulure' || mon.status === 'poison') {
      const dmg = Math.max(1, Math.floor(statsOf(mon).maxHp / (mon.status === 'poison' ? 8 : 16)))
      mon.hp = Math.max(0, mon.hp - dmg)
      addLog(B, `${displaySpecies(mon).name} souffre de sa ${statusName(mon.status).toLowerCase()} (-${dmg} PV).`, 'status')
      updateHUD(B)
      await wait(450)
    }
  }
}

async function checkFaints(B) {
  if (B.over) return
  const e = B.enemyTeam[B.eIndex]
  if (e.hp <= 0) {
    addLog(B, `${displaySpecies(e).name} est K.O. !`, 'faint')
    sfx('faint')
    await wait(750)
    const next = B.enemyTeam.findIndex((m, i) => i > B.eIndex && m.hp > 0)
    if (next >= 0) {
      B.eIndex = next
      B.stages.e = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      B.protectSide = null
      addLog(B, `${B.config.trainer?.name || 'Le dresseur'} envoie ${displaySpecies(B.enemyTeam[B.eIndex]).name} !`, 'important')
      registerSeen(B.enemyTeam[B.eIndex].species)
      updateHUD(B)
      await wait(700)
      return
    }
    await victory(B)
    return
  }
  const p = B.playerTeam[B.pIndex]
  if (p.hp <= 0) {
    addLog(B, `${displaySpecies(p).name} est K.O. !`, 'faint')
    sfx('faint')
    await wait(700)
    const next = B.playerTeam.findIndex(m => m.hp > 0)
    if (next < 0) { await defeat(B); return }
    B.busy = true
    const idx = await openTeam(B, true)
    B.busy = false
    if (idx == null) { await defeat(B); return }
    await switchPlayer(B, idx, true)
    updateHUD(B)
  }
}

async function switchPlayer(B, index, forced = false) {
  const mon = B.playerTeam[index]
  if (!mon || mon.hp <= 0 || index === B.pIndex) return
  B.pIndex = index
  B.stages.p = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  B.protectSide = null
  addLog(B, `Go, ${displaySpecies(mon).name} !`, 'important')
  updateHUD(B)
  sfx('switch')
  await wait(500)
  if (!forced) {
    const e = B.enemyTeam[B.eIndex]
    const eMoveData = chooseEnemyMove(B, e, mon)
    await performMove(B, 'e', e, mon, eMoveData.move, eMoveData.index)
    await endOfTurn(B)
    await checkFaints(B)
  }
}

async function openTeam(B, forced = false) {
  return new Promise(resolve => {
    const p = B.playerTeam[B.pIndex]
    const list = B.playerTeam.map((m, i) => {
      const sp = displaySpecies(m)
      return `<button class="switch-row ${i === B.pIndex ? 'active' : ''}" data-switch="${i}" ${m.hp <= 0 || i === B.pIndex ? 'disabled' : ''}>
        <span class="switch-dot" style="background:${TYPE_COLORS[sp.types[0]]}"></span>
        <span class="switch-main"><strong>${escapeHTML(sp.name)}</strong><small>Nv. ${m.level} · ${m.hp}/${statsOf(m).maxHp} PV</small></span>
        <span class="switch-types">${sp.types.map(t => `<i style="background:${TYPE_COLORS[t]}">${t[0]}</i>`).join('')}</span>
      </button>`
    }).join('')
    B.subpanel.innerHTML = `<div class="subpanel-card">
      <div class="subpanel-head"><h3>${forced ? 'Choisis ton prochain Pokémon' : 'Changer de Pokémon'}</h3>${forced ? '' : '<button class="mini-btn" data-close>Annuler</button>'}</div>
      <div class="switch-list">${list}</div>
    </div>`
    B.subpanel.classList.add('open')
    const done = idx => { closeSubpanel(B); resolve(idx) }
    B.subpanel.querySelectorAll('[data-switch]').forEach(btn => btn.addEventListener('click', () => done(Number(btn.dataset.switch))))
    B.subpanel.querySelector('[data-close]')?.addEventListener('click', () => done(null))
  })
}

function closeSubpanel(B) {
  if (!B.subpanel) return
  B.subpanel.classList.remove('open')
  B.subpanel.innerHTML = ''
}

async function openBag(B) {
  if (B.busy || B.over) return
  const items = allItems()
  if (!items.length) { toast('Ton sac est vide.', '🎒'); return }
  const p = B.playerTeam[B.pIndex]
  const rows = items.map(it => `<button class="bag-row" data-item="${it.id}" ${it.catch && !B.canCatch ? 'disabled' : ''}>
    <span class="bag-icon">${it.icon}</span>
    <span class="bag-main"><strong>${escapeHTML(it.name)}</strong><small>${escapeHTML(it.desc)}</small></span>
    <span class="bag-count">×${it.n}</span>
  </button>`).join('')
  B.subpanel.innerHTML = `<div class="subpanel-card">
    <div class="subpanel-head"><h3>Sac</h3><button class="mini-btn" data-close>Annuler</button></div>
    <div class="bag-list">${rows}</div>
    <p class="muted small">${B.canCatch ? 'Les Sable Balls peuvent capturer ce Pokémon.' : 'Impossible de capturer le Pokémon d’un autre dresseur.'}</p>
  </div>`
  B.subpanel.classList.add('open')
  B.subpanel.querySelector('[data-close]').addEventListener('click', () => closeSubpanel(B))
  B.subpanel.querySelectorAll('[data-item]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.item
    if (ITEMS[id].catch && !B.canCatch) return
    closeSubpanel(B)
    doPlayerTurn(B, { type: 'item', item: id })
  }))
}

async function useItem(B, itemId) {
  const item = ITEMS[itemId]
  const p = B.playerTeam[B.pIndex]
  if (!item) return
  if (!takeItem(itemId)) { addLog(B, 'Tu n’as plus de cet objet.'); return }
  if (item.catch) {
    const e = B.enemyTeam[B.eIndex]
    addLog(B, `Tu lances une ${item.name} !`, 'action')
    await catchAttempt(B, e, item)
    if (B.over) return
    addLog(B, `${displaySpecies(e).name} s’échappe de la ball !`)
    const eMoveData = chooseEnemyMove(B, e, p)
    await performMove(B, 'e', e, p, eMoveData.move, eMoveData.index)
    await endOfTurn(B)
    await checkFaints(B)
    return
  }
  if (item.heal) {
    if (p.hp <= 0) { addLog(B, 'Ce Pokémon est K.O. Utilise un Rappel.'); addItem(itemId); return }
    const before = p.hp
    p.hp = Math.min(statsOf(p).maxHp, p.hp + item.heal)
    addLog(B, `${displaySpecies(p).name} récupère ${p.hp - before} PV.`, 'heal')
    sfx('heal')
  } else if (item.revive) {
    addLog(B, 'Impossible d’utiliser un Rappel sur le Pokémon actif.')
    addItem(itemId); return
  } else if (item.cure) {
    p.status = null
    addLog(B, `${displaySpecies(p).name} est soigné.`)
  }
  updateHUD(B)
  await wait(500)
  const e = B.enemyTeam[B.eIndex]
  const eMoveData = chooseEnemyMove(B, e, p)
  await performMove(B, 'e', e, p, eMoveData.move, eMoveData.index)
  await endOfTurn(B)
  await checkFaints(B)
}

async function catchAttempt(B, e, item) {
  const sp = SPECIES[e.species]
  const hpFactor = 1 - (e.hp / statsOf(e).maxHp) * .75
  let chance
  if (sp.catchRate <= 5) chance = hpFactor * .22 * item.catch
  else chance = (sp.catchRate / 255) * hpFactor * item.catch * 1.8
  chance = clamp(chance, .04, .95)
  const ball = document.createElement('div')
  ball.className = 'ball-throw'
  ball.innerHTML = ballSVG(item.id === 'templier_ball' ? '#f0c96b' : item.id === 'grande_ball' ? '#f2c53d' : '#d9a441', 54)
  B.root.appendChild(ball)
  sfx('ball')
  await wait(1250)
  const success = Math.random() < chance
  ball.classList.add(success ? 'caught' : 'escaped')
  await wait(900)
  ball.remove()
  if (success) {
    addLog(B, `Et… ${displaySpecies(e).name} est capturé !`, 'important')
    sfx('catch')
    registerCaught(e.species)
    G.save.stats.catches++
    const result = addMonster(e)
    persist()
    await showResult(B, {
      icon: '🔮', title: `${displaySpecies(e).name} capturé !`,
      sub: result.boxed ? 'Envoyé dans la boîte de stockage.' : 'Ajouté à ton équipe.',
      lines: [`Niveau ${e.level}`, `Ball : ${item.name}`, `Taux de capture : ${Math.round(chance * 100)}%`],
      button: 'Continuer'
    })
    finish(B, { outcome: 'caught', caught: e, item: itemId })
  }
}

async function tryRun(B) {
  if (B.isTrainer) {
    addLog(B, 'Impossible de fuir un combat de dresseur !')
    await wait(600)
    const e = B.enemyTeam[B.eIndex], p = B.playerTeam[B.pIndex]
    const eMoveData = chooseEnemyMove(B, e, p)
    await performMove(B, 'e', e, p, eMoveData.move, eMoveData.index)
    await endOfTurn(B)
    await checkFaints(B)
    return
  }
  const p = B.playerTeam[B.pIndex], e = B.enemyTeam[B.eIndex]
  const chance = clamp(.55 + (statsOf(p).spe - statsOf(e).spe) / 150, .25, .95)
  addLog(B, 'Tu prends la fuite...')
  await wait(650)
  if (Math.random() < chance) {
    addLog(B, 'Tu réussis à t’échapper !')
    await wait(500)
    finish(B, { outcome: 'flee' })
  } else {
    addLog(B, 'Impossible de s’échapper !')
    const eMoveData = chooseEnemyMove(B, e, p)
    await performMove(B, 'e', e, p, eMoveData.move, eMoveData.index)
    await endOfTurn(B)
    await checkFaints(B)
  }
}

async function victory(B) {
  if (B.over) return
  B.over = true
  B.busy = true
  sfx('win')
  const enemyXp = B.enemyTeam.reduce((sum, m) => sum + SPECIES[m.species].xpYield * m.level, 0)
  const kindFactor = B.config.kind === 'wild' ? .2 : B.config.kind === 'legendary' ? .35 : .36
  const totalXp = Math.max(8, Math.floor(enemyXp * kindFactor))
  const participants = [...B.participants].map(uid => B.playerTeam.find(m => m.uid === uid)).filter(Boolean)
  const list = participants.length ? participants : [B.playerTeam[B.pIndex]]
  const share = Math.max(1, Math.floor(totalXp / list.length))
  const lines = []
  const evolutions = []
  for (const mon of list) {
    if (mon.hp <= 0) continue
    const before = mon.level
    const ev = gainXp(mon, share)
    lines.push(`${displaySpecies(mon).name} gagne ${share} XP${ev.levels.length ? ` · Niveau ${mon.level} !` : ''}`)
    for (const mvId of ev.learned) lines.push(`Nouvelle capacité : ${MOVES[mvId].name}`)
    if (ev.evolved) evolutions.push({ mon, to: ev.evolved })
  }
  const money = B.rewardMoney + Math.floor(Math.random() * Math.max(1, B.rewardMoney * .2))
  G.save.money += money
  G.save.stats.wins++
  if (B.config.kind === 'wild' || B.config.kind === 'legendary') G.save.stats.catches += 0
  persist()
  await wait(650)
  await showResult(B, {
    icon: B.config.kind === 'legendary' ? '✨' : '🏆',
    title: B.config.kind === 'legendary' ? 'Légende apaisée !' : 'Victoire !',
    sub: B.config.trainer ? `${B.config.trainer.name} est vaincu.` : 'Le Pokémon sauvage est K.O.',
    lines: [...lines, `+${money} ₽`],
    button: 'Continuer'
  })
  for (const evo of evolutions) {
    const mon = evo.mon
    const sp = SPECIES[mon.species], target = SPECIES[evo.to]
    await Dialog.show({
      speaker: 'Évolution',
      text: `Quoi ? ${sp.name} évolue ! ${sp.name} devient ${target.name} !`,
      choices: [{ label: 'Incroyable !', value: 'ok' }]
    })
    evolveMonster(mon, evo.to)
    persist()
    await wait(300)
  }
  finish(B, { outcome: 'win', xp: totalXp, money, evolutions: evolutions.map(e => e.to) })
}

async function defeat(B) {
  if (B.over) return
  B.over = true
  B.busy = true
  sfx('lose')
  await showResult(B, {
    icon: '💤', title: 'Équipe K.O.',
    sub: 'Tu as tout donné, mais la route est encore longue.',
    lines: ['Tu retournes au Centre Pokémon le plus proche.', 'Ton équipe est soignée.', 'Tu perds un peu d’argent.'],
    button: 'Retour au Centre'
  })
  const lost = Math.min(G.save.money, 150)
  G.save.money -= lost
  for (const m of G.save.team) { m.hp = statsOf(m).maxHp; m.status = null; m.statusTurns = 0; for (const mv of m.moves) mv.pp = mv.maxPp }
  persist()
  finish(B, { outcome: 'loss', lost })
}

function showResult(B, { icon, title, sub, lines = [], button = 'Continuer' }) {
  return new Promise(resolve => {
    B.resultEl.innerHTML = `<div class="result-card">
      <div class="result-icon">${icon}</div>
      <h2>${escapeHTML(title)}</h2>
      <p class="result-sub">${escapeHTML(sub || '')}</p>
      <div class="result-lines">${lines.map(l => `<div>${escapeHTML(l)}</div>`).join('')}</div>
      <button class="btn gold full big" id="result-continue">${escapeHTML(button)}</button>
    </div>`
    B.resultEl.classList.add('show')
    B.resultEl.querySelector('#result-continue').addEventListener('click', () => {
      B.resultEl.classList.remove('show')
      setTimeout(() => { B.resultEl.innerHTML = ''; resolve() }, 150)
    })
  })
}

function finish(B, result) {
  if (B.finished) return
  B.finished = true
  B.over = true
  if (B.raf) cancelAnimationFrame(B.raf)
  window.removeEventListener('resize', B.resize)
  B.root?.classList.add('leaving')
  setTimeout(() => {
    document.getElementById('battle-root').innerHTML = ''
    if (G.battle === B) G.battle = null
    B.resolve(result)
  }, 320)
}

// ---------------------------------------------------------------------------
// Battle canvas
// ---------------------------------------------------------------------------
function drawBattle(B, ts) {
  const ctx = B.ctx, dpr = B.dpr || 1
  const w = B.canvas.width / dpr, h = B.canvas.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const t = ts / 1000
  const palette = B.config.palette || {}
  const theme = B.config.theme || 'sand'
  const p = B.playerTeam[B.pIndex], e = B.enemyTeam[B.eIndex]
  // background
  const sky = ctx.createLinearGradient(0, 0, 0, h * .72)
  if (theme === 'volcano') { sky.addColorStop(0, '#3a1a22'); sky.addColorStop(.6, '#8a3a2a'); sky.addColorStop(1, '#d9743b') }
  else if (theme === 'night') { sky.addColorStop(0, '#080b18'); sky.addColorStop(.6, '#1a1a38'); sky.addColorStop(1, '#3a3458') }
  else if (theme === 'storm') { sky.addColorStop(0, '#2a3448'); sky.addColorStop(.6, '#4a5a70'); sky.addColorStop(1, '#8a9ab0') }
  else if (theme === 'snow') { sky.addColorStop(0, '#4a5570'); sky.addColorStop(.6, '#9aa8c8'); sky.addColorStop(1, '#e0e8f0') }
  else if (theme === 'ocean') { sky.addColorStop(0, '#123a5a'); sky.addColorStop(.6, '#2a6a9a'); sky.addColorStop(1, '#8ecae6') }
  else if (theme === 'sacred') { sky.addColorStop(0, '#1a2440'); sky.addColorStop(.6, '#4a5a8a'); sky.addColorStop(1, '#b8c8e8') }
  else if (theme === 'league') { sky.addColorStop(0, '#10182e'); sky.addColorStop(.6, '#3a3550'); sky.addColorStop(1, '#c9a45a') }
  else { sky.addColorStop(0, palette.sky || '#f5d79b'); sky.addColorStop(.6, '#e8b56a'); sky.addColorStop(1, '#c98b3a') }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  // sun / moon
  const sunX = w * .78, sunY = h * .18
  const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, h * .16)
  if (theme === 'night' || theme === 'sacred') { sun.addColorStop(0, 'rgba(220,230,255,.85)'); sun.addColorStop(1, 'rgba(220,230,255,0)') }
  else { sun.addColorStop(0, 'rgba(255,243,196,.95)'); sun.addColorStop(1, 'rgba(255,200,100,0)') }
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(sunX, sunY, h * .16, 0, Math.PI * 2); ctx.fill()
  // distant hills
  ctx.fillStyle = theme === 'volcano' ? '#4a2028' : theme === 'night' ? '#15172a' : theme === 'ocean' ? '#1d4a6a' : '#b08a4f'
  ctx.globalAlpha = .55
  ctx.beginPath(); ctx.moveTo(0, h * .55)
  for (let i = 0; i <= 10; i++) {
    const x = (w / 10) * i
    const y = h * .55 - Math.sin(i * 1.7 + 1) * h * .05 - (i % 2) * h * .02
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h * .72); ctx.lineTo(0, h * .72); ctx.closePath(); ctx.fill()
  ctx.globalAlpha = 1
  // ground
  const ground = ctx.createLinearGradient(0, h * .55, 0, h)
  if (theme === 'volcano') { ground.addColorStop(0, '#5a2a22'); ground.addColorStop(1, '#2a1210') }
  else if (theme === 'night') { ground.addColorStop(0, '#24203a'); ground.addColorStop(1, '#100e1a') }
  else if (theme === 'ocean') { ground.addColorStop(0, '#2a7a8a'); ground.addColorStop(1, '#123a4a') }
  else if (theme === 'snow') { ground.addColorStop(0, '#d8e0e8'); ground.addColorStop(1, '#8a98b0') }
  else { ground.addColorStop(0, palette.ground || '#c9a45a'); ground.addColorStop(1, palette.ground2 || '#8a5b2e') }
  ctx.fillStyle = ground
  ctx.beginPath(); ctx.moveTo(0, h * .62); ctx.quadraticCurveTo(w * .5, h * .55, w, h * .62); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
  // arena platforms
  const ex = w * .72, ey = h * .43
  const ax = w * .29, ay = h * .79
  ctx.save(); ctx.translate(ex, ey); ctx.scale(1, .28)
  const pg = ctx.createRadialGradient(0, 0, 10, 0, 0, w * .16)
  pg.addColorStop(0, 'rgba(255,243,196,.3)'); pg.addColorStop(1, 'rgba(30,20,10,.18)')
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, w * .16, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.save(); ctx.translate(ax, ay); ctx.scale(1, .3)
  const pg2 = ctx.createRadialGradient(0, 0, 10, 0, 0, w * .18)
  pg2.addColorStop(0, 'rgba(255,243,196,.32)'); pg2.addColorStop(1, 'rgba(30,20,10,.2)')
  ctx.fillStyle = pg2; ctx.beginPath(); ctx.arc(0, 0, w * .18, 0, Math.PI * 2); ctx.fill(); ctx.restore()

  // trainers behind
  if (B.isTrainer && B.config.trainer?.avatar) {
    drawTrainer(ctx, w * .88, h * .36, Math.min(w, h) / 250, { ...B.config.trainer.avatar, flip: true, t })
  }
  drawTrainer(ctx, w * .1, h * .74, Math.min(w, h) / 250, {
    skin: G.save.profile.gender === 'fille' ? '#e8b48a' : '#d9a47a',
    hair: G.save.profile.gender === 'fille' ? '#6b3f2a' : '#3a2418',
    outfit: G.save.profile.gender === 'fille' ? '#c96b8a' : '#2f5f9e',
    accent: '#f0c96b', hat: 'cap', t
  })

  // sprites
  const scale = Math.max(.62, Math.min(w, h) / 540)
  const now = ts / 1000
  if (e) {
    const shake = B.anim.enemyShake > 0 ? Math.sin(now * 80) * 10 * B.anim.enemyShake : 0
    const lunge = B.anim.enemyLunge > 0 ? B.anim.enemyLunge * 18 : 0
    drawCreature(ctx, displaySpecies(e), ex - lunge + shake, ey + 12, scale * .95, { flip: true, t: now + 1.7, alpha: e.hp <= 0 ? .2 : 1, mega: e.mega })
  }
  if (p) {
    const shake = B.anim.allyShake > 0 ? Math.sin(now * 80) * 10 * B.anim.allyShake : 0
    const lunge = B.anim.allyLunge > 0 ? B.anim.allyLunge * 18 : 0
    drawCreature(ctx, displaySpecies(p), ax + lunge + shake, ay + 12, scale * 1.08, { flip: false, t: now, alpha: p.hp <= 0 ? .2 : 1, mega: p.mega })
  }
  // particles
  drawParticles(ctx, w, h, t, theme, B.config.palette)
  // flash
  if (B.anim.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${B.anim.flash * .55})`
    ctx.fillRect(0, 0, w, h)
  }
  // animate decays
  for (const k of ['enemyShake', 'allyShake', 'enemyLunge', 'allyLunge', 'flash']) {
    B.anim[k] = Math.max(0, B.anim[k] - .045)
  }
}

function drawParticles(ctx, w, h, t, theme, palette) {
  ctx.save()
  if (theme === 'volcano') {
    for (let i = 0; i < 26; i++) {
      const x = (i * 73 + t * 22) % w
      const y = h - ((i * 47 + t * 55) % (h * .7))
      ctx.fillStyle = `rgba(255,${120 + (i % 5) * 20},40,${.3 + (i % 3) * .15})`
      ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3), 0, Math.PI * 2); ctx.fill()
    }
  } else if (theme === 'night') {
    for (let i = 0; i < 30; i++) {
      const x = (i * 97) % w, y = (i * 61) % (h * .6)
      const a = .3 + .3 * Math.sin(t * 2 + i)
      ctx.fillStyle = `rgba(200,220,255,${a})`
      ctx.fillRect(x, y, 2, 2)
    }
  } else if (theme === 'storm') {
    ctx.strokeStyle = 'rgba(200,220,255,.28)'; ctx.lineWidth = 1.4
    for (let i = 0; i < 40; i++) {
      const x = (i * 83 + t * 340) % (w + 100) - 50
      const y = (i * 53 + t * 500) % h
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 18); ctx.stroke()
    }
  } else if (theme === 'snow') {
    for (let i = 0; i < 34; i++) {
      const x = (i * 71 + Math.sin(t + i) * 30) % w
      const y = (i * 59 + t * 32) % h
      ctx.fillStyle = 'rgba(255,255,255,.6)'
      ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3), 0, Math.PI * 2); ctx.fill()
    }
  } else if (theme === 'ocean') {
    for (let i = 0; i < 18; i++) {
      const x = (i * 109 + t * 30) % w, y = h * .6 + (i * 37) % (h * .35)
      ctx.strokeStyle = 'rgba(200,245,255,.2)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 4, x + 16, y); ctx.stroke()
    }
  } else if (theme === 'sacred' || theme === 'league') {
    for (let i = 0; i < 22; i++) {
      const x = (i * 113 + Math.sin(t * .7 + i) * 40) % w
      const y = (i * 79 + Math.cos(t * .5 + i) * 30) % h
      ctx.fillStyle = `rgba(240,201,107,${.15 + .25 * Math.sin(t * 2 + i)})`
      ctx.beginPath(); ctx.arc(x, y, 2 + (i % 2), 0, Math.PI * 2); ctx.fill()
    }
  } else {
    ctx.strokeStyle = 'rgba(255,230,170,.28)'; ctx.lineWidth = 1.4
    for (let i = 0; i < 34; i++) {
      const x = (i * 79 + t * 90) % (w + 100) - 50
      const y = (i * 53 + Math.sin(t + i) * 24) % h
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 2); ctx.stroke()
    }
  }
  ctx.restore()
}
