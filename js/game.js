import {
  state, setState, hooks, createState, loadGame, saveGame, hasSave, clearSave,
  makeMon, randomStarterIds, rngFor, pick, MODE_INFO, audio, healTeam,
  addToTeam, removeLostFromTeam, species, monName, bossTeam
} from './core.js'
import {
  $, uiHooks, toast, updateHUD, refreshLanguageUI, showAreaBanner,
  isModalOpen, panelTeam, panelBag, panelMap, panelJournal, panelShop,
  panelPause, openHow, openCredits, showGameOver, showEnding,
  startTitleScene, stopTitleScene, setTitleContinue
} from './ui.js'
import { GardenWorld, TILE, WORLD_W, WORLD_H, encounterPool } from './world.js'
import { startBattle } from './battle.js'
import { t, speciesName, applyStaticI18n, LANGUAGES, detectLanguage, setLanguage, getLanguage } from './i18n.js'

let world = null
let selectedMode = 'adventure'
let setupOptions = { ...MODE_INFO.adventure.options }
let keys = new Set()
let raf = 0
let lastFrame = 0
let dialog = null
let nearby = null
let encounterCooldown = 0
let joystick = { active: false, dx: 0, dy: 0 }

function showScreen(id) {
  for (const el of document.querySelectorAll('.screen, .ending, .battle')) el.classList.add('hidden')
  const target = $(id)
  if (target) target.classList.remove('hidden')
}

function setupLanguage() {
  setLanguage(detectLanguage())
  const select = $('langSelect')
  if (select) {
    select.innerHTML = LANGUAGES.map(l => `<option value="${l.code}">${l.label}</option>`).join('')
    select.value = getLanguage()
    select.addEventListener('change', () => {
      setLanguage(select.value)
      refreshLanguageUI()
      uiHooks.languageChanged()
    })
  }
  applyStaticI18n()
}

function updateModeBlurb() {
  const el = $('modeBlurb')
  if (!el) return
  const info = MODE_INFO[selectedMode]
  el.textContent = info ? t(`mode${selectedMode[0].toUpperCase()}${selectedMode.slice(1)}`) : ''
}

function openSetup() {
  $('titleScreen')?.classList.add('hidden')
  $('setupScreen')?.classList.remove('hidden')
  stopTitleScene()
  const info = MODE_INFO[selectedMode]
  const modeKey = `mode${selectedMode[0].toUpperCase()}${selectedMode.slice(1)}`
  if ($('setupModeName')) $('setupModeName').textContent = t(modeKey)
  if ($('setupModeDesc')) $('setupModeDesc').textContent = t(`${modeKey}Tag`)
  if ($('setupDifficulty')) $('setupDifficulty').textContent = t(info.difficulty)
  if ($('setupLives')) $('setupLives').textContent = t(info.lives)
  if ($('setupCatch')) $('setupCatch').textContent = t(info.catchRule)
  if ($('setupModeIcon')) $('setupModeIcon').textContent = { adventure: '❧', random: '✦', hardcore: '♨', nuzlocke: '⌁' }[selectedMode]
  const locked = selectedMode === 'adventure'
  $('baseLockedNote')?.classList.toggle('hidden', !locked)
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    const key = btn.dataset.toggle
    btn.classList.toggle('on', !!setupOptions[key])
    btn.classList.toggle('disabled', locked)
  })
  if ($('seedInput') && !$('seedInput').value) $('seedInput').value = randomSeed()
}

function randomSeed() {
  const words = ['rose', 'clover', 'fern', 'moss', 'petal', 'sun', 'leaf', 'lily']
  return `${pick(words)}-${Math.floor(1000 + Math.random() * 9000)}`
}

function beginState() {
  const seed = $('seedInput')?.value.trim() || randomSeed()
  const options = selectedMode === 'adventure'
    ? { trainers: false, wild: false, moves: false, starter: false }
    : setupOptions
  setState(createState(selectedMode, seed, options))
  world = new GardenWorld(seed, state.options)
  return seed
}

function beginNewGame() {
  const seed = beginState()
  const rng = rngFor(`${seed}:starter`)
  const ids = state.options.starter
    ? randomStarterIds(rng, 3)
    : [1, 4, 7]
  $('starterGrid').innerHTML = ids.map(id => {
    const sp = species(id)
    if (!sp) return ''
    return `<button class="starter-card" data-starter="${id}"><img src="assets/pokemon/${id}.png" alt="${speciesName(id)}"><strong>${speciesName(id)}</strong><span>${sp.types.map(t).join(' · ')}</span></button>`
  }).join('')
  document.querySelectorAll('[data-starter]').forEach(btn => btn.addEventListener('click', () => {
    const mon = makeMon(Number(btn.dataset.starter), 5, { origin: 'starter' })
    addToTeam(mon)
    state.introSeen = true
    saveGame()
    enterGame()
  }))
  if ($('starterSeed')) $('starterSeed').textContent = seed
  showScreen('starterScreen')
}

function enterGame() {
  showScreen('gameScreen')
  $('loading')?.classList.add('hidden')
  resizeCanvas()
  updateHUD()
  saveGame()
  lastFrame = performance.now()
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(frame)
}

function resizeCanvas() {
  const canvas = $('gameCanvas')
  if (!canvas) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.floor(window.innerWidth * dpr)
  canvas.height = Math.floor(window.innerHeight * dpr)
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
}

function movePlayer(dt) {
  if (!state?.player || isModalOpen() || dialog) return
  let dx = 0, dy = 0
  if (keys.has('arrowleft') || keys.has('a')) dx--
  if (keys.has('arrowright') || keys.has('d')) dx++
  if (keys.has('arrowup') || keys.has('w')) dy--
  if (keys.has('arrowdown') || keys.has('s')) dy++
  dx += joystick.dx; dy += joystick.dy
  const len = Math.hypot(dx, dy)
  if (!len) return
  dx /= len; dy /= len
  const sprint = keys.has('shift')
  const speed = sprint ? 205 : 135
  const nx = state.player.x + dx * speed * dt
  const ny = state.player.y + dy * speed * dt
  if (!world.isSolid(nx, state.player.y, 9)) state.player.x = clampWorld(nx, 16, WORLD_W - 16)
  if (!world.isSolid(state.player.x, ny, 9)) state.player.y = clampWorld(ny, 16, WORLD_H - 16)
  if (Math.abs(dx) > Math.abs(dy)) state.player.dir = dx < 0 ? 'left' : 'right'
  else state.player.dir = dy < 0 ? 'up' : 'down'
}

function clampWorld(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function updateWorld(dt) {
  if (!world || !state?.player) return
  const zone = world.zoneAt(state.player.x, state.player.y)
  if (zone && state.zone !== zone.id) {
    state.zone = zone.id
    if (!state.discovered.includes(zone.id)) state.discovered.push(zone.id)
    showAreaBanner(zone.id)
    updateHUD()
  }
  nearby = findNearby()
  const prompt = $('interactPrompt')
  if (prompt) {
    prompt.classList.toggle('hidden', !nearby)
    if (nearby) $('interactText').textContent = nearby.label
  }
  if (world.isTall(state.player.x, state.player.y) && encounterCooldown <= 0) {
    if (Math.random() < dt * .09) {
      encounterCooldown = 8
      triggerWildEncounter()
    }
  }
  encounterCooldown = Math.max(0, encounterCooldown - dt)
}

function findNearby() {
  let best = null
  let dist = 48
  for (const npc of world.npcs) {
    const d = Math.hypot(npc.x - state.player.x, npc.y - state.player.y)
    if (d < dist) { dist = d; best = { kind: 'npc', data: npc, label: t('interactTalk') } }
  }
  for (const arena of world.arenas) {
    const d = Math.hypot(arena.px - state.player.x, arena.py - state.player.y)
    if (d < dist) { dist = d; best = { kind: 'arena', data: arena, label: t('interactArena') } }
  }
  const heart = world.heart
  if (heart) {
    const d = Math.hypot(heart.x * TILE - state.player.x, heart.y * TILE - state.player.y)
    if (d < dist) {
      best = { kind: 'heart', data: heart, label: t(Object.values(state.badges).every(Boolean) ? 'heartPrompt' : 'lockedPrompt') }
    }
  }
  return best
}

function interact() {
  if (dialog) { advanceDialog(); return }
  if (!nearby) return
  if (nearby.kind === 'npc') interactNpc(nearby.data)
  if (nearby.kind === 'arena') interactArena(nearby.data)
  if (nearby.kind === 'heart') interactHeart()
}

function interactNpc(npc) {
  if (npc.kind === 'shop') { panelShop(); return }
  if (npc.kind === 'healer') {
    healTeam(state.team)
    toast(t('healedTeam'), '✿')
    saveGame(); updateHUD(); return
  }
  if (npc.kind === 'trainer' || npc.kind === 'leader') {
    if (npc.kind === 'leader') {
      const arena = world.arenas.find(item => item.id === npc.arenaId)
      if (arena) { interactArena(arena); return }
    }
    if (state.defeatedTrainers.includes(npc.id)) { toast(t('arenaCleared'), '✓'); return }
    let team = npc.team || []
    if (state.options.trainers) {
      const pool = encounterPool(npc.zone || state.zone, true)
      const rng = rngFor(`${state.seed}:${npc.id}:team`)
      team = team.map((member, index) => ({ id: pick(pool, rng), level: member.level }))
    }
    startBattle({
      kind: 'trainer', trainerName: npc.name, trainerId: npc.id,
      enemyTeam: team, reward: npc.reward, zone: npc.zone || state.zone
    })
    return
  }
  let text = t(npc.dialogue || 'npcHello')
  openDialog(t(npc.nameKey || 'npcName'), text)
}

function interactArena(arena) {
  if (state.arenas[arena.id]) { toast(t('arenaCleared'), '✓'); return }
  const enemies = arena.team.map(member => makeMon(member.id, member.level, { origin: 'enemy' }))
  startBattle({
    kind: 'leader', trainerName: arena.leader, trainerId: `leader-${arena.id}`,
    arenaId: arena.id, enemyTeam: enemies, reward: arena.reward, zone: arena.zone
  })
}

function interactHeart() {
  if (!Object.values(state.badges).every(Boolean)) {
    toast(t('heartLocked'), '◈')
    return
  }
  if (state.bossDefeated) {
    showEnding()
    return
  }
  startBattle({
    kind: 'boss', trainerName: t('bossPrompt'), trainerId: 'shadow-gardener',
    enemyTeam: bossTeam(), zone: 'heart'
  })
}

function triggerWildEncounter() {
  const pool = encounterPool(state.zone, state.options.wild)
  const rng = rngFor(`${state.seed}:${state.zone}:${Math.floor(state.playtime)}`)
  const id = pick(pool, rng)
  const level = 4 + Math.floor(Math.random() * 5)
  startBattle({ kind: 'wild', enemyTeam: [{ id, level }], zone: state.zone })
}

function openDialog(name, text) {
  dialog = { name, text }
  $('dialogName').textContent = name
  $('dialogText').textContent = text
  $('dialogBox')?.classList.remove('hidden')
}

function advanceDialog() {
  dialog = null
  $('dialogBox')?.classList.add('hidden')
}

function drawGame() {
  const canvas = $('gameCanvas')
  if (!canvas || !world || !state) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const cam = { x: state.player.x, y: state.player.y, vw: window.innerWidth, vh: window.innerHeight, zoom: 1 }
  const time = performance.now() / 1000
  ctx.save()
  ctx.translate(window.innerWidth / 2 - cam.x, window.innerHeight / 2 - cam.y)
  world.drawGround(ctx, cam, time)
  for (const prop of world.getDrawables(cam)) world.drawProp(ctx, prop, time)
  ctx.restore()
  for (const npc of world.npcs) {
    if (Math.abs(npc.x - cam.x) < cam.vw / 2 + 40 && Math.abs(npc.y - cam.y) < cam.vh / 2 + 40) drawActor(ctx, cam, npc)
  }
  for (const arena of world.arenas) drawArena(ctx, cam, arena)
  drawActor(ctx, cam, { kind: 'player', x: state.player.x, y: state.player.y, dir: state.player.dir })
  const mini = $('minimap')
  if (mini) {
    const mctx = mini.getContext('2d')
    world.drawMinimap(mctx, mini.width, mini.height, { ...state, discovered: new Set(state.discovered) })
  }
}

function worldPoint(cam, x, y) {
  return { x: x - cam.x + cam.vw / 2, y: y - cam.y + cam.vh / 2 }
}

function drawActor(ctx, cam, actor) {
  const p = worldPoint(cam, actor.x, actor.y)
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.fillStyle = 'rgba(20,61,43,.18)'
  ctx.beginPath(); ctx.ellipse(0, 8, 13, 5, 0, 0, 7); ctx.fill()
  ctx.fillStyle = actor.kind === 'player' ? '#f2c38a' : (actor.palette || '#e7869d')
  ctx.beginPath(); ctx.arc(0, -8, 8, 0, 7); ctx.fill()
  ctx.fillStyle = '#315642'; ctx.fillRect(-7, 0, 14, 12)
  ctx.restore()
}

function drawArena(ctx, cam, arena) {
  const p = worldPoint(cam, arena.px, arena.py)
  ctx.save(); ctx.translate(p.x, p.y)
  ctx.fillStyle = state.arenas?.[arena.id] ? '#f5c451' : (arena.color || '#ffffff')
  ctx.beginPath(); ctx.arc(0, -10, 18, 0, 7); ctx.fill()
  ctx.strokeStyle = '#fff8e8'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
}

function frame(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000 || 0)
  lastFrame = now
  if (state) {
    state.playtime += dt
    movePlayer(dt)
    updateWorld(dt)
    drawGame()
  }
  raf = requestAnimationFrame(frame)
}

function setUpControls() {
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase()
    if (['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d','shift','e',' ','1','2','3','4','escape'].includes(k)) e.preventDefault()
    keys.add(k)
    if (k === 'e' || k === ' ') interact()
    if (k === 'escape') panelPause()
    if (k === '1') panelTeam()
    if (k === '2') panelBag()
    if (k === '3') panelMap()
    if (k === '4') panelJournal()
  })
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))
  window.addEventListener('resize', resizeCanvas)

  $('dialogNext')?.addEventListener('click', advanceDialog)
  $('touchInteract')?.addEventListener('click', interact)
  $('touchMenu')?.addEventListener('click', panelPause)
  $('menuBtn')?.addEventListener('click', panelPause)
  document.querySelectorAll('[data-panel]').forEach(btn => btn.addEventListener('click', () => {
    ({ team: panelTeam, bag: panelBag, map: panelMap, journal: panelJournal })[btn.dataset.panel]?.()
  }))

  const joy = $('joystick')
  const knob = $('joystickKnob')
  if (joy && knob) {
    let rect
    const move = ev => {
      const touch = ev.touches?.[0] || ev
      rect ||= joy.getBoundingRect?.() || joy.getBoundingClientRect()
      const dx = touch.clientX - (rect.left + rect.width / 2)
      const dy = touch.clientY - (rect.top + rect.height / 2)
      const len = Math.hypot(dx, dy) || 1
      const max = rect.width * .34
      joystick.dx = dx / len * Math.min(max, len) / max
      joystick.dy = dy / len * Math.min(max, len) / max
      knob.style.transform = `translate(${joystick.dx * max}px,${joystick.dy * max}px)`
    }
    joy.addEventListener('pointerdown', ev => { joystick.active = true; rect = joy.getBoundingClientRect(); joy.setPointerCapture(ev.pointerId); move(ev) })
    joy.addEventListener('pointermove', ev => { if (joystick.active) move(ev) })
    const stop = () => { joystick.active = false; joystick.dx = joystick.dy = 0; knob.style.transform = '' }
    joy.addEventListener('pointerup', stop); joy.addEventListener('pointercancel', stop)
  }

  if ('ontouchstart' in window) {
    $('joystick')?.classList.remove('hidden')
    $('touchActions')?.classList.remove('hidden')
  }
}

function setupTitle() {
  setTitleContinue(hasSave())
  document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode
    setupOptions = { ...MODE_INFO[selectedMode].options }
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('selected', b === btn))
    updateModeBlurb()
  }))
  $('newGameBtn')?.addEventListener('click', openSetup)
  $('continueBtn')?.addEventListener('click', () => {
    const saved = loadGame()
    if (!saved) return
    setState(saved)
    world = new GardenWorld(state.seed, state.options)
    enterGame()
  })
  $('howBtn')?.addEventListener('click', openHow)
  $('creditsBtn')?.addEventListener('click', openCredits)
  $('soundToggle')?.addEventListener('click', () => audio.toggle?.())
  $('rerollBtn')?.addEventListener('click', () => { if ($('seedInput')) $('seedInput').value = randomSeed() })
  $('startGameBtn')?.addEventListener('click', beginNewGame)
  $('starterBackBtn')?.addEventListener('click', () => showScreen('setupScreen'))
  document.querySelectorAll('[data-close="setup"]').forEach(btn => btn.addEventListener('click', () => showScreen('titleScreen')))
  document.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', () => {
    if (selectedMode === 'adventure') return
    const key = btn.dataset.toggle
    setupOptions[key] = !setupOptions[key]
    btn.classList.toggle('on', setupOptions[key])
  }))
}

hooks.toast = (message, icon) => toast(message, icon)
hooks.refresh = () => { updateHUD(); saveGame() }
hooks.onBattleEnd = (result, battle) => {
  removeLostFromTeam()
  $('battleScreen')?.classList.add('hidden')
  if (result === 'lose') {
    saveGame()
    showGameOver()
    return
  }
  $('gameScreen')?.classList.remove('hidden')
  updateHUD()
  saveGame()
  if (result === 'boss' && battle?.kind === 'boss') hooks.onEnding()
}
hooks.onEnding = () => showEnding()

uiHooks.getWorld = () => world
uiHooks.fastTravel = (target) => {
  if (!world || !state?.player) return false
  if (target?.kind === 'heart') {
    state.player.x = target.x * TILE
    state.player.y = target.y * TILE
  } else {
    const zoneId = typeof target === 'string' ? target : target?.zone || target?.id
    const zone = world.zones.find(item => item.id === zoneId)
    if (!zone) return false
    state.player.x = zone.x * TILE
    state.player.y = zone.y * TILE
  }
  saveGame(); enterGame(); return true
}
uiHooks.useItemOutside = () => false
uiHooks.buyItem = () => false
uiHooks.save = () => saveGame()
uiHooks.goTitle = () => {
  cancelAnimationFrame(raf)
  showScreen('titleScreen')
  setTitleContinue(hasSave())
  startTitleScene()
}
uiHooks.retry = () => {
  clearSave()
  uiHooks.goTitle()
}
uiHooks.newRun = () => {
  clearSave()
  showScreen('titleScreen')
  setTitleContinue(false)
  startTitleScene()
}
uiHooks.languageChanged = () => refreshLanguageUI()
uiHooks.updateModeBlurb = updateModeBlurb

setupLanguage()
setupTitle()
setUpControls()
startTitleScene()
updateModeBlurb()
window.Jardin = { beginNewGame, enterGame, getWorld: () => world, getState: () => state }
