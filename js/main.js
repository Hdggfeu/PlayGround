import { World, TILE, T, B_SPAWN } from './world/world.js'
import { WorldRenderer, drawPokemon, drawTrainer, drawProp, drawBuilding, drawLight, preload, getImage } from './render/sprites.js'
import { GameState } from './core/state.js'
import { Battle } from './battle/battle.js'
import { UI } from './ui/ui.js'
import { audio } from './core/audio.js'
import { POKEDEX, DEX_BY_ID } from './data/pokedex.js'
import { GYMS, CHAMPION } from './data/gyms.js'
import { TYPE_COLORS, movesFor, expForLevel } from './data/moves.js'
import { createMon, maxHp, healMon } from './core/state.js'
import { clamp, lerp, hash2, mulberry32, timeString, fmt } from './core/utils.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const $ = (id) => document.getElementById(id)

const TRAINER_NAMES = ['Nova', 'Mika', 'Rook', 'Sable', 'Juniper', 'Kai', 'Aria', 'Tomo', 'Luna', 'Bolt', 'Mochi', 'Vee', 'Pixel', 'Rae', 'Sol', 'Iris', 'Finn', 'Nyx']
const GUILDS = ['Verdant', 'Aurora', 'Ember', 'Tide', 'Storm', 'Mythic', 'Wayfarer']
const PLAYER_COLORS = [
  { shirt:'#e05a4a', hat:'#e05a4a' }, { shirt:'#4f8fe8', hat:'#4f8fe8' }, { shirt:'#57b94c', hat:'#57b94c' },
  { shirt:'#f2c744', hat:'#f2c744' }, { shirt:'#a45bd6', hat:'#a45bd6' }, { shirt:'#e08cc0', hat:'#e08cc0' },
  { shirt:'#2b2b38', hat:'#d4af37' }, { shirt:'#63cfd4', hat:'#63cfd4' }, { shirt:'#ef7d32', hat:'#ef7d32' },
]

class Multiplayer {
  constructor (app) {
    this.app = app
    this.id = app.state.playerId
    this.peers = new Map()
    this.peerCount = 0
    try {
      this.ch = new BroadcastChannel('pokeverse-world')
      this.ch.onmessage = (e) => this.receive(e.data)
      this.interval = setInterval(() => this.broadcast(), 350)
      window.addEventListener('beforeunload', () => this.leave())
    } catch { this.ch = null }
  }
  send (msg) { try { this.ch?.postMessage(msg) } catch {} }
  hello () {
    this.send({ type: 'hello', id: this.id, seed: this.app.state.seed, name: this.app.state.name })
  }
  broadcast () {
    if (!this.ch || !this.app.started) return
    const st = this.app.state
    this.send({ type: 'state', id: this.id, seed: st.seed, name: st.name, level: st.party[0]?.level || 1, colors: st.colors, x: st.pos.x, y: st.pos.y, dir: this.app.player?.dir || 'down', zone: this.app.world?.zoneName(Math.floor(st.pos.x), Math.floor(st.pos.y)), t: Date.now() })
    for (const [id, p] of this.peers) if (Date.now() - p.t > 5000) this.peers.delete(id)
    this.peerCount = this.peers.size
  }
  receive (msg) {
    if (!msg || msg.id === this.id) return
    if (msg.type === 'hello') { this.broadcast(); return }
    if (msg.type === 'leave') { this.peers.delete(msg.id); this.peerCount = this.peers.size; return }
    if (msg.type === 'chat') { this.app.ui?.addChat(msg.name, msg.text); return }
    if (msg.type === 'state' && msg.seed === this.app.state.seed) {
      this.peers.set(msg.id, { ...msg, t: Date.now() })
      this.peerCount = this.peers.size
    }
  }
  sendChat (text) { this.send({ type: 'chat', id: this.id, name: this.app.state.name, text }) }
  leave () { this.send({ type: 'leave', id: this.id }) }
}

class App {
  constructor () {
    this.audio = audio
    this.state = new GameState()
    this.battle = new Battle(this)
    this.player = { x: 0, y: 0, dir: 'down', frame: 0, walk: 0, moving: false, speed: 148 }
    this.keys = new Set()
    this.touch = { x: 0, y: 0 }
    this.camera = { x: 0, y: 0, vw: 640, vh: 400, scale: 2 }
    this.time = 0
    this.last = performance.now()
    this.wilds = []
    this.ambient = []
    this.spawnTimer = 0
    this.encounterCooldown = 0
    this.weather = { type: 'clear', timer: 100 }
    this.inBattle = false
    this.dialogueOpen = false
    this.chatFocused = false
    this.started = false
    this.currentInteract = null
    this.pendingRift = null
    this.saveTimer = 0
    this.lastQuestStep = -1
    this.notifiedSide = new Set()
    this.questToastCooldown = 0
    this.multiplayer = new Multiplayer(this)
    this.bound = false
  }

  async boot () {
    this.canvas = $('world')
    this.ctx = this.canvas.getContext('2d')
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.bindTitle()
    this.bindInput()
    this.drawTitleFireflies()
    requestAnimationFrame((t) => this.loop(t))
    this.checkSave()
  }

  checkSave () {
    try {
      const raw = localStorage.getItem('pokeverse.save.v1')
      if (raw) {
        const s = JSON.parse(raw)
        if (s?.started) {
          $('btn-continue').classList.remove('hidden')
          $('btn-continue').textContent = `Continue — ${s.name} · Lv ${s.party?.[0]?.level || 1}`
          $('trainer-name').value = s.name || ''
          const seedLabel = $('title-seed-label')
          if (seedLabel) seedLabel.textContent = `Saved world · seed ${s.seed}`
        }
      }
    } catch {}
  }

  drawTitleFireflies () {
    const box = $('fireflies')
    if (!box) return
    box.innerHTML = ''
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('i')
      d.style.left = Math.random() * 100 + '%'
      d.style.top = (40 + Math.random() * 55) + '%'
      d.style.animationDelay = (-Math.random() * 9) + 's'
      d.style.animationDuration = (6 + Math.random() * 8) + 's'
      box.appendChild(d)
    }
  }

  bindTitle () {
    let chosenColors = { shirt: '#e05a4a', hat: '#e05a4a' }
    for (const b of document.querySelectorAll('#title-swatches .swatch')) {
      b.onclick = () => {
        document.querySelectorAll('#title-swatches .swatch').forEach(x => x.classList.remove('active'))
        b.classList.add('active')
        chosenColors = { shirt: b.dataset.shirt, hat: b.dataset.hat }
        audio.init(); audio.sfx('click')
      }
    }
    $('btn-new').onclick = () => {
      audio.init(); audio.resume(); audio.sfx('select')
      const name = ($('trainer-name').value || '').trim() || TRAINER_NAMES[Math.floor(Math.random() * TRAINER_NAMES.length)]
      this.startNew(name, chosenColors)
    }
    $('btn-continue').onclick = () => {
      audio.init(); audio.resume(); audio.sfx('select')
      this.continueGame()
    }
    $('trainer-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-new').click() })
  }

  async startNew (name, colors) {
    $('title-screen').classList.add('hidden')
    $('loading').classList.remove('hidden')
    this.setLoading(6, 'Waking up the world engine…')
    await sleep(240)
    const seed = Math.floor(Math.random() * 900000000) + 1000
    this.setLoading(22, 'Raising continents, rivers and mountain ranges…')
    await sleep(200)
    this.world = new World(seed)
    this.setLoading(52, 'Planting forests, scattering flowers, paving roads…')
    await sleep(200)
    this.setLoading(68, 'Stocking tall grass with 1,025 species…')
    this.renderer = new WorldRenderer(this.world)
    await sleep(180)
    this.setLoading(82, 'Opening the Poké Mart and polishing gym badges…')
    await sleep(180)
    this.state = new GameState()
    this.ui = new UI(this)
    this.state.playerId = 'p' + Math.random().toString(36).slice(2, 9)
    this.multiplayer.id = this.state.playerId
    this.setLoading(94, 'Connecting to 12,847 trainers…')
    await sleep(160)
    this.setLoading(100, 'Ready!')
    await sleep(180)
    $('loading').classList.add('hidden')
    const starter = await this.ui.askStarter()
    this.state.newGame(name, { ...colors, skin: '#f0c8a0', hair: '#2b2b38', pants: '#2f3550', bag: '#7a5a3a' }, starter, seed)
    this.state.colors = { ...this.state.colors, ...colors }
    this.finishStart(true)
  }

  async continueGame () {
    $('title-screen').classList.add('hidden')
    $('loading').classList.remove('hidden')
    this.setLoading(10, 'Loading your journey…')
    const ok = this.state.load()
    if (!ok) { $('loading').classList.add('hidden'); $('title-screen').classList.remove('hidden'); return this.ui?.toast?.('Save could not be loaded.', '⚠', 'red') }
    await sleep(200)
    this.setLoading(36, 'Rebuilding your world…')
    this.world = new World(this.state.seed)
    this.setLoading(70, 'Restoring your party and Pokédex…')
    this.renderer = new WorldRenderer(this.world)
    await sleep(200)
    this.setLoading(92, 'Finding your last camp…')
    await sleep(160)
    this.multiplayer.id = this.state.playerId
    this.ui = new UI(this)
    this.setLoading(100, 'Welcome back!')
    await sleep(160)
    $('loading').classList.add('hidden')
    this.finishStart(false)
  }

  setLoading (p, tip) {
    const f = $('loading-fill'); if (f) f.style.width = p + '%'
    const t = $('loading-tip'); if (t && tip) t.textContent = tip
  }

  finishStart (isNew) {
    this.started = true
    const st = this.state
    // find a safe spawn
    let px = st.pos.x * TILE, py = st.pos.y * TILE
    if (!this.world.canWalkPx(px, py, 10)) {
      const t = this.world.towns.find(t => t.id === (st.lastTown || 'willowbrook')) || this.world.towns[0]
      px = (t.x + .5) * TILE; py = (t.y + 3.5) * TILE
      st.pos = { x: px / TILE, y: py / TILE }
    }
    this.player.x = px; this.player.y = py; this.player.dir = st.dir || 'down'
    this.snapCamera()
    preload(st.party.map(m => m.id))
    preload([1, 4, 7, 25, 133])
    this.ui.refreshHUD()
    $('hud').classList.remove('hidden')
    this.applySettings()
    audio.startMusic('world')
    this.multiplayer.hello()
    this.spawnAmbient()
    this.seedWilds()
    this.lastQuestStep = st.questStep
    st.save()
    this.weather = { type: this.pickWeather(), timer: 80 + Math.random() * 80 }
    if (isNew) {
      setTimeout(() => this.introDialogue(), 700)
    } else {
      this.ui.toast(`Welcome back, ${st.name}!`, '✦', 'gold')
      if (st.questStep > 0) setTimeout(() => this.ui.toast(`Main quest: ${st.quest.title}`, '◆'), 1400)
    }
  }

  applySettings () {
    const s = this.state.settings
    audio.setVolumes(s.music, s.sfx, s.muted)
  }

  introDialogue () {
    this.ui.showDialogue({
      name: 'Professor Willow', colors: { shirt:'#8b6fd6', hair:'#e8e8ee', skin:'#f0c8a0' },
      text: `Welcome to the Pokéverse, ${this.state.name}! This whole world is alive — every one of the 1,025 Pokémon from all nine generations lives somewhere out there. Choose your path, catch what calls to you, and when you're ready, take on the six Gyms and Champion Aster.`,
      choices: [
        { label: 'I\'m ready!', primary: true, action: () => this.tutorial() },
        { label: 'Where should I start?', action: () => this.ui.showDialogue({ name: 'Professor Willow', colors: { shirt:'#8b6fd6', hair:'#e8e8ee', skin:'#f0c8a0' }, text: 'Head south from the plaza into the tall grass to meet your first wild Pokémon. Catch three to fill a page of your Pokédex, then follow the west road to Goldleaf Village and challenge Rosa. Take your time — the world is yours.', choices: [{ label: 'Thanks!', primary: true, action: () => this.tutorial() }] }) },
      ],
    })
  }

  tutorial () {
    const tips = [
      ['Move with WASD, arrows, or the on-screen joystick.', '🕹', ''],
      ['Press E (or A on touch) to talk, read, heal and challenge Gyms.', '⌨', ''],
      ['Walk into a wild Pokémon — or rustle tall grass — to battle.', '⚔', ''],
      ['Press 3 or tap Dex to browse all 1,025 species.', '▤', ''],
    ]
    tips.forEach(([text, icon, type], i) => setTimeout(() => this.ui.toast(text, icon, type), i * 1800))
  }

  resize () {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.dpr = dpr
    const w = window.innerWidth, h = window.innerHeight
    this.canvas.width = Math.floor(w * dpr)
    this.canvas.height = Math.floor(h * dpr)
    this.camera.vw = w
    this.camera.vh = h
    this.camera.scale = clamp(Math.min(w / 720, h / 480), 1.42, 2.35)
    if (this.started) this.snapCamera()
  }

  snapCamera () {
    const { vw, vh, scale } = this.camera
    this.camera.x = this.player.x - vw / 2 / scale
    this.camera.y = this.player.y - vh / 2 / scale
    this.clampCamera()
  }

  clampCamera () {
    const w = this.world ? this.world.w * TILE : 6000, h = this.world ? this.world.h * TILE : 6000
    const vw = this.camera.vw / this.camera.scale, vh = this.camera.vh / this.camera.scale
    this.camera.x = clamp(this.camera.x, 0, Math.max(0, w - vw))
    this.camera.y = clamp(this.camera.y, 0, Math.max(0, h - vh))
  }

  bindInput () {
    if (this.bound) return
    this.bound = true
    const down = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault()
      if (this.inBattle) return
      if (this.ui?.modalLayer && !this.ui.modalLayer.classList.contains('hidden')) return
      this.keys.add(k)
      if (e.repeat) return
      if (k === 'e' || k === ' ') this.interact()
      if (k === '1') this.ui?.openParty()
      if (k === '2') this.ui?.openBag()
      if (k === '3') this.ui?.openDex()
      if (k === 'm') this.ui?.openMap()
      if (k === 'q') this.ui?.openQuests()
      if (k === 'escape') this.ui?.openSettings()
      if (k === 'c') $('chat-text')?.focus()
    }
    const up = (e) => { this.keys.delete(e.key.toLowerCase()) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', () => this.keys.clear())
    // touch joystick
    const joy = $('joystick'), stick = $('stick')
    if (joy) {
      let id = null, cx = 0, cy = 0
      const start = (e) => {
        if (this.inBattle || this.ui?.modalLayer && !this.ui.modalLayer.classList.contains('hidden')) return
        id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2
        joy.setPointerCapture(id); move(e)
      }
      const move = (e) => {
        if (e.pointerId !== id) return
        let dx = e.clientX - cx, dy = e.clientY - cy
        const len = Math.hypot(dx, dy), max = 40
        if (len > max) { dx = dx / len * max; dy = dy / len * max }
        stick.style.transform = `translate(${dx}px, ${dy}px)`
        this.touch.x = dx / max; this.touch.y = dy / max
      }
      const end = (e) => { if (e.pointerId !== id) return; id = null; this.touch.x = 0; this.touch.y = 0; stick.style.transform = '' }
      joy.addEventListener('pointerdown', start)
      joy.addEventListener('pointermove', move)
      joy.addEventListener('pointerup', end)
      joy.addEventListener('pointercancel', end)
    }
    $('touch-a')?.addEventListener('click', () => this.interact())
    $('touch-run')?.addEventListener('click', () => { this.touchRun = !this.touchRun; $('touch-run').style.background = this.touchRun ? 'rgba(244,201,93,.35)' : '' })
    $('touch-menu')?.addEventListener('click', () => this.ui?.openSettings())
    if (matchMedia('(pointer: coarse)').matches) $('touch-ui')?.classList.remove('hidden')
  }

  // ---------------- loop ----------------
  loop (t) {
    requestAnimationFrame((tt) => this.loop(tt))
    const dt = Math.min(.05, (t - this.last) / 1000 || 0)
    this.last = t
    if (!this.started) return
    this.time += dt
    this.update(dt)
    this.render(dt)
  }

  update (dt) {
    const st = this.state
    st.playTime += dt
    st.clock = (st.clock + dt * 1.5) % 1440
    this.encounterCooldown = Math.max(0, this.encounterCooldown - dt)
    this.questToastCooldown = Math.max(0, this.questToastCooldown - dt)
    this.updateWeather(dt)
    this.world.update(dt)
    const blocked = this.inBattle || this.dialogueOpen || this.chatFocused || (this.ui?.modalLayer && !this.ui.modalLayer.classList.contains('hidden'))
    if (!blocked) this.updatePlayer(dt)
    else this.player.moving = false
    this.updateCamera(dt)
    this.updateWilds(dt)
    this.updateAmbient(dt)
    this.updateInteractPrompt()
    // quest change detection
    if (st.questStep !== this.lastQuestStep) {
      this.lastQuestStep = st.questStep
      if (this.questToastCooldown <= 0) {
        this.questToastCooldown = 3
        this.ui.toast(`Main quest updated: ${st.quest.title}`, '◆', 'gold')
        audio.sfx('quest')
        this.ui.refreshHUD()
      }
    }
    // autosave
    this.saveTimer += dt
    if (this.saveTimer > 18) { this.saveTimer = 0; st.pos = { x: this.player.x / TILE, y: this.player.y / TILE }; st.dir = this.player.dir; st.save() }
    if (Math.random() < dt * .05) this.ui.drawMinimap()
  }

  updateWeather (dt) {
    if (!this.state.settings.weather) { this.weather.type = 'clear'; return }
    this.weather.timer -= dt
    if (this.weather.timer <= 0) {
      const biome = this.world.biomeAt(Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE))
      this.weather = { type: this.pickWeather(biome), timer: 90 + Math.random() * 110 }
      const names = { rain: ['Rain began to fall.', '🌧'], storm: ['Thunder rumbles overhead.', '⛈'], snow: ['Snow drifts down.', '❄'], ash: ['Ash falls from the caldera.', '🌋'], fog: ['A thick fog rolls in.', '🌫'], clear: ['The sky clears.', '☀'] }
      if (names[this.weather.type]) this.ui.toast(...names[this.weather.type])
    }
  }

  pickWeather (biome) {
    if (!biome) {
      const t = this.world.tile(Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE))
      biome = t === T.SNOW || t === T.ICE ? 'snow' : t === T.ASH || t === T.LAVA ? 'volcano' : t === T.MARSH ? 'marsh' : this.world.biomeAt(Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE))
    }
    const r = Math.random()
    if (biome === 'snow') return r < .6 ? 'snow' : 'clear'
    if (biome === 'volcano') return r < .45 ? 'ash' : 'clear'
    if (biome === 'marsh') return r < .5 ? 'rain' : r < .65 ? 'fog' : 'clear'
    if (biome === 'lake') return r < .3 ? 'rain' : r < .4 ? 'fog' : 'clear'
    if (biome === 'forest') return r < .25 ? 'fog' : r < .4 ? 'rain' : 'clear'
    return r < .15 ? 'rain' : r < .2 ? 'storm' : 'clear'
  }

  updatePlayer (dt) {
    const k = this.keys
    let dx = 0, dy = 0
    if (k.has('w') || k.has('arrowup')) dy -= 1
    if (k.has('s') || k.has('arrowdown')) dy += 1
    if (k.has('a') || k.has('arrowleft')) dx -= 1
    if (k.has('d') || k.has('arrowright')) dx += 1
    if (Math.abs(this.touch.x) > .15 || Math.abs(this.touch.y) > .15) { dx = this.touch.x; dy = this.touch.y }
    const len = Math.hypot(dx, dy)
    this.player.moving = len > .05
    if (!this.player.moving) return
    dx /= len; dy /= len
    const sprint = k.has('shift') || this.touchRun
    const speed = this.player.speed * (sprint ? 1.55 : 1)
    const step = speed * dt
    if (Math.abs(dx) > Math.abs(dy)) this.player.dir = dx > 0 ? 'right' : 'left'
    else this.player.dir = dy > 0 ? 'down' : 'up'
    const nx = this.player.x + dx * step
    if (this.world.canWalkPx(nx, this.player.y, 9)) this.player.x = nx
    const ny = this.player.y + dy * step
    if (this.world.canWalkPx(this.player.x, ny, 9)) this.player.y = ny
    this.player.walk += dt * (sprint ? 11 : 8)
    this.player.frame = Math.floor(this.player.walk) % 4
    this.state.stats.steps += step / TILE
    this.state.pos = { x: this.player.x / TILE, y: this.player.y / TILE }
    this.state.dir = this.player.dir
    // town visit
    const town = this.world.townAt(Math.floor(this.state.pos.x), Math.floor(this.state.pos.y))
    if (town && this.state.lastTown !== town.id) this.state.visitTown(town.id)
    // tall grass encounter
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE)
    if (this.world.tile(tx, ty) === T.TALL && this.encounterCooldown <= 0 && Math.random() < dt * .12) {
      const biome = this.world.biomeAt(tx, ty)
      const s = this.world.spawnFor(biome, tx, ty)
      this.startWild(s.n, s.level)
    }
  }

  updateCamera (dt) {
    const targetX = this.player.x - this.camera.vw / 2 / this.camera.scale
    const targetY = this.player.y - this.camera.vh / 2 / this.camera.scale
    this.camera.x = lerp(this.camera.x, targetX, clamp(dt * 9, 0, 1))
    this.camera.y = lerp(this.camera.y, targetY, clamp(dt * 9, 0, 1))
    this.clampCamera()
  }

  // ---------------- wild & ambient ----------------
  seedWilds () {
    this.wilds = []
    for (let i = 0; i < 8; i++) this.trySpawnWild(true)
  }

  trySpawnWild (force = false) {
    if (this.wilds.length >= 13) return
    const angle = Math.random() * Math.PI * 2
    const radius = (5 + Math.random() * 11) * TILE
    const x = this.player.x + Math.cos(angle) * radius
    const y = this.player.y + Math.sin(angle) * radius
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE)
    if (!this.world.inBounds(tx, ty)) return
    if (this.world.townAt(tx, ty)) return
    const t = this.world.tile(tx, ty)
    if ([T.DEEP, T.WATER, T.LAVA, T.PLAZA, T.PATH, T.BRIDGE].includes(t)) return
    if (this.world.solidAt(tx, ty)) return
    if (this.wilds.some(w => Math.hypot(w.x - x, w.y - y) < TILE * 1.6)) return
    const biome = this.world.biomeAt(tx, ty)
    const s = this.world.spawnFor(biome, tx, ty)
    this.wilds.push({
      id: 'w' + Math.random().toString(36).slice(2, 8), n: s.n, level: s.level,
      x, y, homeX: x, homeY: y, dir: ['down','up','left','right'][Math.floor(Math.random() * 4)],
      timer: Math.random() * 2, frame: 0, shiny: Math.random() < 1 / 512, biome, alpha: 0,
    })
  }

  updateWilds (dt) {
    if (this.inBattle) return
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) { this.spawnTimer = 1.6; this.trySpawnWild() }
    for (let i = this.wilds.length - 1; i >= 0; i--) {
      const w = this.wilds[i]
      const d = Math.hypot(w.x - this.player.x, w.y - this.player.y)
      if (d > 24 * TILE) { this.wilds.splice(i, 1); continue }
      w.alpha = Math.min(1, (w.alpha || 0) + dt * 3)
      w.timer -= dt
      if (w.timer <= 0) {
        w.timer = 1.2 + Math.random() * 3
        if (Math.random() < .6) {
          w.dir = ['down','up','left','right'][Math.floor(Math.random() * 4)]
          w.moving = true
          w.moveTime = .5 + Math.random() * .8
        } else w.moving = false
      }
      if (w.moving) {
        w.moveTime -= dt
        const sp = 13 * dt
        const nx = w.x + (w.dir === 'right' ? sp : w.dir === 'left' ? -sp : 0)
        const ny = w.y + (w.dir === 'down' ? sp : w.dir === 'up' ? -sp : 0)
        if (Math.hypot(nx - w.homeX, ny - w.homeY) < 4 * TILE && this.world.canWalkPx(nx, ny, 7)) { w.x = nx; w.y = ny }
        else w.moving = false
        if (w.moveTime <= 0) w.moving = false
        w.frame = Math.floor(this.time * 4) % 2
      }
      if (d < 17 && this.encounterCooldown <= 0 && !this.dialogueOpen && this.ui?.modalLayer.classList.contains('hidden')) {
        this.wilds.splice(i, 1)
        this.startWild(w.n, w.level, { shiny: w.shiny })
        return
      }
    }
  }

  updateAmbient (dt) {
    for (const a of this.ambient) {
      const d = Math.hypot(a.x - this.player.x, a.y - this.player.y)
      if (d > 26 * TILE) {
        const ang = Math.random() * Math.PI * 2, rad = (8 + Math.random() * 8) * TILE
        a.x = this.player.x + Math.cos(ang) * rad; a.y = this.player.y + Math.sin(ang) * rad
        if (!this.world.canWalkPx(a.x, a.y, 8)) { a.x = this.player.x + TILE * 2; a.y = this.player.y + TILE * 2 }
        continue
      }
      a.timer -= dt
      if (a.timer <= 0) {
        a.timer = 1 + Math.random() * 4
        a.moving = Math.random() < .6
        a.dir = ['down','up','left','right'][Math.floor(Math.random() * 4)]
      }
      if (a.moving) {
        const sp = 38 * dt
        const nx = a.x + (a.dir === 'right' ? sp : a.dir === 'left' ? -sp : 0)
        const ny = a.y + (a.dir === 'down' ? sp : a.dir === 'up' ? -sp : 0)
        if (this.world.canWalkPx(nx, ny, 8)) { a.x = nx; a.y = ny; a.walk += dt * 7 }
        else a.dir = ['down','up','left','right'][Math.floor(Math.random() * 4)]
        a.frame = Math.floor(a.walk) % 4
      }
      a.bubbleTimer -= dt
      if (a.bubbleTimer <= 0) {
        a.bubbleTimer = 14 + Math.random() * 22
        a.bubble = a.bubbleLines[Math.floor(Math.random() * a.bubbleLines.length)]
        a.bubbleT = 4
      }
      if (a.bubbleT > 0) { a.bubbleT -= dt; if (a.bubbleT <= 0) a.bubble = null }
    }
  }

  spawnAmbient () {
    this.ambient = []
    const bubbleLines = ['nice catch!', 'anyone up for a raid?', 'shiny hunting…', 'this view 😍', 'gg!', 'where is the gym?', 'my Eevee evolved!', 'love this world']
    for (let i = 0; i < 9; i++) {
      const ang = Math.random() * Math.PI * 2, rad = (5 + Math.random() * 12) * TILE
      let x = this.player.x + Math.cos(ang) * rad, y = this.player.y + Math.sin(ang) * rad
      if (!this.world.canWalkPx(x, y, 8)) { x = (B_SPAWN.x + 1.5) * TILE; y = (B_SPAWN.y + 2) * TILE }
      const c = PLAYER_COLORS[i % PLAYER_COLORS.length]
      this.ambient.push({
        id: 'a' + i, name: TRAINER_NAMES[(i + 3) % TRAINER_NAMES.length], level: 6 + Math.floor(Math.random() * 46),
        guild: GUILDS[i % GUILDS.length], x, y, dir: 'down', moving: false, timer: Math.random() * 3, walk: 0, frame: 0,
        colors: { ...c, skin: ['#f0c8a0','#e8b890','#c98f65','#8d5524'][i % 4], hair: ['#2b2b38','#5a3b2e','#e8e8ee','#b5651d'][i % 4], pants:'#2f3550', bag:'#7a5a3a' },
        bubble: null, bubbleT: 0, bubbleTimer: 6 + Math.random() * 14, bubbleLines,
      })
    }
  }

  // ---------------- interaction ----------------
  updateInteractPrompt () {
    if (this.inBattle || this.dialogueOpen || (this.ui?.modalLayer && !this.ui.modalLayer.classList.contains('hidden'))) { this.ui.hideInteract(); this.currentInteract = null; return }
    const it = this.world.interactableNear(this.player.x, this.player.y)
    this.currentInteract = it
    if (!it) { this.ui.hideInteract(); return }
    let text = ''
    if (it.kind === 'npc') {
      const n = it.npc
      if (n.role === 'leader') text = `Challenge ${n.name}`
      else if (n.role === 'nurse') text = 'Heal your party'
      else if (n.role === 'clerk') text = 'Browse the Poké Mart'
      else if (n.role === 'champion') text = 'Challenge Champion Aster'
      else if (n.role === 'trainer') text = `Battle ${n.name}`
      else text = `Talk to ${n.name}`
    }
    if (it.kind === 'door') {
      const b = it.building
      text = b.type === 'center' ? 'Enter Pokémon Center' : b.type === 'mart' ? 'Enter Poké Mart' : b.type === 'gym' ? `Challenge ${b.leader} Gym` : b.type === 'tower' ? 'Enter Champion Tower' : b.type === 'lab' ? 'Enter Willow Lab' : 'Knock on the door'
    }
    if (it.kind === 'sign') text = 'Read sign'
    if (it.kind === 'chest') text = 'Open chest'
    if (it.kind === 'rift') text = 'Touch the rift'
    if (it.kind === 'berry') text = 'Pick berries'
    this.ui.showInteract(text)
  }

  interact () {
    if (this.inBattle || this.dialogueOpen || this.chatFocused) return
    if (this.ui?.modalLayer && !this.ui.modalLayer.classList.contains('hidden')) return
    const it = this.currentInteract
    if (!it) return
    audio.sfx('select')
    if (it.kind === 'npc') this.talkNpc(it.npc)
    else if (it.kind === 'door') this.enterBuilding(it.building)
    else if (it.kind === 'sign') this.ui.showDialogue({ name: 'Signpost', text: it.sign.text, colors: { shirt:'#b68a55', hair:'#5a3b2e', skin:'#d9b98c' } })
    else if (it.kind === 'chest') this.openChest(it.chest)
    else if (it.kind === 'rift') this.enterRift(it.rift)
    else if (it.kind === 'berry') this.pickBerry(it.berry)
  }

  talkNpc (npc) {
    const st = this.state
    if (npc.role === 'nurse') {
      healParty(st.party); st.save(); this.ui.refreshHUD(); audio.sfx('heal')
      this.ui.showDialogue({ name: 'Nurse Joy', colors: npc.colors, text: 'Welcome! Your Pokémon are fully rested and ready for adventure. Come back any time!', choices: [{ label: 'Thank you!', primary: true }] })
      return
    }
    if (npc.role === 'clerk') {
      this.ui.showDialogue({ name: 'Clerk', colors: npc.colors, text: 'Welcome to the Poké Mart! We stock everything a trainer needs — balls, potions, and the occasional Evolution Stone.', choices: [{ label: 'Show me the goods', primary: true, action: () => this.ui.openShop() }, { label: 'Just browsing' }] })
      return
    }
    if (npc.role === 'professor') {
      const q = st.quest
      const extra = st.caught.size >= 3 ? 'Your Pokédex is coming along beautifully! Keep catching — every species tells a story.' : 'Start with three catches. The tall grass south of town is full of friendly Pokémon.'
      this.ui.showDialogue({ name: 'Prof. Willow', colors: npc.colors, text: `${q.desc} ${extra}`, choices: [{ label: 'Show Pokédex', action: () => this.ui.openDex() }, { label: 'I\'ll be going' }] })
      return
    }
    if (npc.role === 'leader') return this.challengeGym(npc.gym)
    if (npc.role === 'champion') return this.challengeChampion()
    if (npc.role === 'trainer') return this.startTrainerBattle(npc)
    const lines = npc.lines || ['What a beautiful day in the Pokéverse!']
    this.ui.showDialogue({ name: npc.name, colors: npc.colors, text: lines[Math.floor(Math.random() * lines.length)] })
  }

  enterBuilding (b) {
    const st = this.state
    if (b.type === 'center') {
      healParty(st.party); st.save(); this.ui.refreshHUD(); audio.sfx('heal')
      this.ui.showDialogue({ name: 'Pokémon Center', colors: { shirt:'#ff8fa8', hair:'#f27c9b', skin:'#f3d0b0' }, text: 'Your party has been restored to full health. The nurse waves as you head back out.', choices: [{ label: 'Back to the world', primary: true }] })
      return
    }
    if (b.type === 'mart') return this.ui.openShop()
    if (b.type === 'lab') {
      this.ui.showDialogue({ name: 'Willow Lab', colors: { shirt:'#8b6fd6', hair:'#e8e8ee', skin:'#f0c8a0' }, text: `The lab hums with machines mapping every habitat in the region. Professor Willow looks up and smiles. "${st.caught.size} species recorded so far — the Pokéverse is vast, isn't it?"`, choices: [{ label: 'View Pokédex', action: () => this.ui.openDex() }, { label: 'Leave' }] })
      return
    }
    if (b.type === 'tower') return this.challengeChampion()
    if (b.type === 'gym') {
      const g = GYMS.find(g => g.id === b.gymId)
      if (g) return this.challengeGym(g)
    }
    this.ui.showDialogue({ name: 'A cozy home', text: 'A warm fire crackles inside. A note on the door reads: "Out catching Pokémon — back soon!"', colors: { shirt:'#b06a48', hair:'#5a3b2e', skin:'#e8b890' } })
  }

  challengeGym (gym) {
    if (!gym) return
    const st = this.state
    if (st.badges.includes(gym.badge)) {
      const badge = BADGES.find(b => b.id === gym.badge)
      this.ui.showDialogue({ name: gym.leader, colors: { shirt: gym.color, hair: gym.hair, skin: gym.skin }, text: `You've already earned the ${badge?.name || 'Gym Badge'}, champion. But I'd be glad to battle again sometime. Keep growing!`, choices: [{ label: 'See you around' }] })
      return
    }
    const rec = gym.level
    const under = st.party.every(m => m.level < rec - 8)
    this.ui.showDialogue({
      name: gym.leader, colors: { shirt: gym.color, hair: gym.hair, skin: gym.skin },
      text: `${gym.intro}${under ? ' (Your team looks a little underleveled — maybe train in the nearby wilds first.)' : ''}`,
      choices: [
        { label: `Battle ${gym.leader}!`, primary: true, action: () => this.startGymBattle(gym) },
        { label: 'Not yet' },
      ],
    })
  }

  challengeChampion () {
    const st = this.state
    if (st.champion) {
      this.ui.showDialogue({ name: 'Aster', colors: { shirt:'#d4af37', hair:'#2b2b38', skin:'#c98f65' }, text: 'The Champion\'s seat suits you. The world is still full of Pokémon to meet — go write the rest of your story.', choices: [{ label: 'I will' }] })
      return
    }
    if (st.badges.length < 6) {
      this.ui.showDialogue({ name: 'Tower Guardian', colors: { shirt:'#d4af37', hair:'#2b2b38', skin:'#c98f65' }, text: `The Champion Tower recognizes strength. You carry ${st.badges.length} of 6 badges. Return when the full set is yours.`, choices: [{ label: 'Understood' }] })
      return
    }
    this.ui.showDialogue({ name: 'Champion Aster', colors: { shirt:'#d4af37', hair:'#2b2b38', skin:'#c98f65' }, text: CHAMPION.intro, choices: [{ label: 'Challenge the Champion!', primary: true, action: () => this.startChampionBattle() }, { label: 'I need to prepare' }] })
  }

  // ---------------- battles ----------------
  ensureBattleReady () {
    if (!this.state.party.some(m => m.hp > 0)) { this.ui.toast('All your Pokémon have fainted. Visit a Pokémon Center!', '⚠', 'red'); return false }
    return true
  }

  startWild (id, level, opts = {}) {
    if (!this.ensureBattleReady() || this.inBattle) return
    this.inBattle = true
    this.ui.hideInteract()
    this.state.recordSeen(id)
    const mon = createMon(id, level, { shiny: opts.shiny })
    audio.sfx('encounter')
    const biome = this.world.biomeAt(Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE))
    this.battle.start({ type: 'wild', enemyParty: [mon], biome, trainerName: 'Wild' })
    this.pendingRift = opts.rift || null
    if (opts.rift) this.pendingRift = opts.rift
  }

  startTrainerBattle (npc) {
    if (!this.ensureBattleReady() || this.inBattle) return
    this.inBattle = true
    this.ui.hideInteract()
    const level = npc.trainer.level
    const party = []
    const biome = this.world.biomeAt(npc.x, npc.y)
    const used = new Set()
    for (let i = 0; i < npc.trainer.count; i++) {
      let s = this.world.spawnFor(biome, npc.x, npc.y)
      let guard = 0
      while (used.has(s.n) && guard++ < 12) s = this.world.spawnFor(biome, npc.x, npc.y)
      used.add(s.n)
      const m = createMon(s.n, Math.max(3, level - (npc.trainer.count - 1 - i) * 2))
      party.push(m)
    }
    this.battle.start({
      type: 'trainer', enemyParty: party, biome, trainerName: npc.name,
      intro: npc.lines?.[0] || 'Let\'s battle!', reward: npc.trainer.reward,
    })
    this.pendingRift = null
  }

  startGymBattle (gym) {
    if (!this.ensureBattleReady() || this.inBattle) return
    this.inBattle = true
    this.ui.hideInteract()
    const party = gym.party.map(p => createMon(p.n, p.level))
    const biome = this.world.biomeAt(gym.town === 'frosthollow' ? 92 : 50, gym.town === 'frosthollow' ? 26 : 50)
    this.battle.start({
      type: 'gym', enemyParty: party, biome, trainerName: `${gym.leader} (${gym.type} Gym)`,
      intro: gym.intro, reward: gym.reward, items: gym.items, badgeId: gym.badge,
    })
    this.pendingRift = null
  }

  startChampionBattle () {
    if (!this.ensureBattleReady() || this.inBattle) return
    this.inBattle = true
    this.ui.hideInteract()
    const party = CHAMPION.party.map(p => createMon(p.n, p.level))
    this.battle.start({
      type: 'champion', enemyParty: party, biome: 'town', trainerName: 'Champion Aster',
      intro: CHAMPION.intro, reward: CHAMPION.reward, items: CHAMPION.items,
    })
    this.pendingRift = null
  }

  endBattle (result) {
    this.inBattle = false
    this.encounterCooldown = 2.4
    this.ui.hideInteract()
    this.ui.refreshHUD()
    this.applySettings()
    audio.startMusic('world')
    if (this.pendingRift) {
      this.pendingRift.ready = false
      this.pendingRift.timer = 180
      this.pendingRift = null
    }
    if (result.result === 'win') {
      const step = this.state.questStep
      if (step === 2 && this.state.badges.includes('bloom')) this.ui.toast('The road east and north opens. Frost and Blaze await!', '◆', 'gold')
      if (step === 3) this.ui.toast('Two more badges down. Tidecrest and Stormwatch are calling!', '◆', 'gold')
      if (step === 6 && this.state.champion) this.ui.toast('You are the Champion of the Pokéverse!', '🏆', 'gold')
    }
    this.state.save()
    this.seedWilds()
  }

  openChest (chest) {
    if (chest.opened) return
    chest.opened = true
    const loot = chest.loot
    this.state.addItem(loot.item, loot.n)
    this.state.stats.chests++
    this.state.save()
    audio.sfx('quest')
    this.ui.toast(`Found ${loot.n}× ${loot.item.replace(/-/g, ' ')}!`, '🎁', 'gold')
    this.ui.refreshHUD()
  }

  pickBerry (berry) {
    berry.ready = false; berry.timer = 90
    this.state.addItem('oran-berry', 2)
    audio.sfx('heal')
    this.ui.toast('Picked 2× Oran Berry!', '🍒', 'green')
    this.state.save()
  }

  enterRift (rift) {
    if (!rift.ready) return
    const sp = DEX_BY_ID.get(rift.species)
    this.ui.showDialogue({
      name: 'Mythic Rift', colors: { shirt:'#a97bff', hair:'#e8e8ee', skin:'#e0c8ff' },
      text: `The air hums with ancient power. A rift shimmers, and the silhouette of ${sp.name} — a ${sp.le ? 'Legendary' : 'Mythical'} Pokémon — moves beyond it. Step through?`,
      choices: [
        { label: 'Enter the rift', primary: true, action: () => { rift.ready = false; rift.timer = 180; this.startWild(rift.species, rift.level, { shiny: Math.random() < 1 / 64, rift }); this.pendingRift = rift } },
        { label: 'Step back' },
      ],
    })
  }

  // ---------------- render ----------------
  render (dt) {
    const ctx = this.ctx
    const { vw, vh, scale } = this.camera
    const dpr = this.dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, vw, vh)
    const camX = Math.round(this.camera.x), camY = Math.round(this.camera.y)
    ctx.save()
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * scale * dpr, -camY * scale * dpr)
    ctx.imageSmoothingEnabled = false
    const world = this.world
    const viewW = vw / scale, viewH = vh / scale
    const cw = 16 * TILE
    const cx0 = Math.floor(camX / cw), cy0 = Math.floor(camY / cw)
    const cx1 = Math.floor((camX + viewW) / cw), cy1 = Math.floor((camY + viewH) / cw)
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const chunk = this.renderer.getChunk(cx, cy)
      ctx.drawImage(chunk, cx * cw, cy * cw)
    }
    this.drawAnimatedTiles(ctx, camX, camY, viewW, viewH)
    this.drawDynamicProps(ctx)
    // entities sorted by y
    const ents = []
    for (const n of world.npcs) ents.push({ kind: 'npc', y: n.y * TILE + TILE, data: n })
    for (const w of this.wilds) ents.push({ kind: 'wild', y: w.y, data: w })
    for (const a of this.ambient) ents.push({ kind: 'ambient', y: a.y, data: a })
    for (const p of this.multiplayer.peers.values()) ents.push({ kind: 'peer', y: p.y * TILE, data: p })
    ents.push({ kind: 'player', y: this.player.y, data: this.player })
    ents.sort((a, b) => a.y - b.y)
    for (const e of ents) {
      if (e.kind === 'npc') this.drawNpc(ctx, e.data)
      if (e.kind === 'wild') this.drawWild(ctx, e.data)
      if (e.kind === 'ambient') this.drawAmbient(ctx, e.data)
      if (e.kind === 'peer') this.drawPeer(ctx, e.data)
      if (e.kind === 'player') this.drawPlayer(ctx)
    }
    ctx.restore()
    this.drawWeather(ctx)
    this.drawLighting(ctx, camX, camY)
    this.drawWaypoint(ctx)
  }

  drawAnimatedTiles (ctx, camX, camY, viewW, viewH) {
    const t = this.time
    const x0 = Math.floor(camX / TILE) - 1, y0 = Math.floor(camY / TILE) - 1
    const x1 = Math.ceil((camX + viewW) / TILE) + 1, y1 = Math.ceil((camY + viewH) / TILE) + 1
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = this.world.tile(tx, ty)
        if (tile === T.WATER || tile === T.DEEP) {
          const h = hash2(tx, ty, 9)
          const yy = ty * TILE + 8 + Math.sin(t * 1.4 + h * 8 + tx * .5) * 2
          ctx.fillStyle = 'rgba(210,240,255,.22)'
          ctx.fillRect(tx * TILE + 4 + h * 12, yy, 9, 2)
          if (tile === T.WATER && Math.sin(t + h * 10) > .75) {
            ctx.fillStyle = 'rgba(255,255,255,.4)'
            ctx.fillRect(tx * TILE + 10, yy + 8, 5, 1.5)
          }
        } else if (tile === T.LAVA) {
          const h = hash2(tx, ty, 4)
          const g = .5 + Math.sin(t * 1.8 + h * 9) * .3
          ctx.fillStyle = `rgba(255,190,80,${.15 + g * .2})`
          ctx.beginPath(); ctx.arc(tx * TILE + 16, ty * TILE + 16, 11, 0, 7); ctx.fill()
        } else if (tile === T.TALL) {
          const h = hash2(tx, ty, 7)
          const sway = Math.sin(t * 2 + h * 9 + tx * .7) * 1.5
          ctx.fillStyle = 'rgba(45,110,45,.55)'
          ctx.fillRect(tx * TILE + 8 + sway, ty * TILE + 18, 2, 7)
          ctx.fillRect(tx * TILE + 15 - sway, ty * TILE + 16, 2, 9)
          ctx.fillRect(tx * TILE + 22 + sway * .5, ty * TILE + 19, 2, 6)
        } else if (tile === T.FLOWER && Math.sin(t * 2 + tx) > .92) {
          ctx.fillStyle = 'rgba(255,255,255,.5)'
          ctx.fillRect(tx * TILE + 12, ty * TILE + 8, 2, 2)
        }
      }
    }
  }

  drawDynamicProps (ctx) {
    const w = this.world
    for (const c of w.chests) {
      drawProp(ctx, { ...c, type: 'chest' }, this.time)
      if (c.opened) {
        ctx.fillStyle = 'rgba(30,20,10,.5)'
        ctx.fillRect(c.x * TILE + 10, c.y * TILE + 14, 12, 4)
      }
    }
    for (const b of w.berries) drawProp(ctx, { ...b, type: 'berry', ready: b.ready }, this.time)
    for (const r of w.rifts) drawProp(ctx, { ...r, type: 'rift' }, this.time)
  }

  drawPlayer (ctx) {
    const p = this.player
    drawTrainer(ctx, p.x, p.y + 8, p.dir, p.frame, this.state.colors, { walking: p.moving, time: this.time, scale: 1.45 })
    // sparkle for shiny party lead? no
  }

  drawNpc (ctx, n) {
    const px = n.x * TILE + TILE / 2, py = n.y * TILE + TILE + 6
    drawTrainer(ctx, px, py, 'down', 0, n.colors || { shirt:'#8b6fd6' }, { time: this.time + n.x, scale: 1.4 })
    const d = Math.hypot(n.x + .5 - this.player.x / TILE, n.y + .5 - this.player.y / TILE)
    if (d < 7) {
      const label = n.role === 'leader' ? `${n.name} · Gym Leader` : n.role === 'nurse' ? 'Nurse Joy' : n.role === 'clerk' ? 'Poké Mart' : n.role === 'professor' ? 'Prof. Willow' : n.role === 'champion' ? 'Aster · Champion' : n.name
      this.tag(ctx, label, px, py - 40, n.role === 'leader' ? '#f4c95d' : '#e8eefc', n.role === 'leader')
    }
  }

  drawWild (ctx, w) {
    const sp = DEX_BY_ID.get(w.n)
    if (!sp) return
    const bob = Math.sin(this.time * 3 + w.x * .05) * 2
    ctx.fillStyle = 'rgba(15,30,15,.25)'
    ctx.beginPath(); ctx.ellipse(w.x, w.y + 4, 11, 4, 0, 0, 7); ctx.fill()
    ctx.globalAlpha = w.alpha ?? 1
    drawPokemon(ctx, w.n, w.x, w.y + 4 + bob, 32, { shiny: w.shiny })
    ctx.globalAlpha = 1
    if (w.shiny) {
      for (let i = 0; i < 3; i++) {
        const a = this.time * 2 + i * 2.1
        ctx.fillStyle = 'rgba(255,240,170,.9)'
        ctx.fillRect(w.x + Math.cos(a) * 14 - 1, w.y - 20 + Math.sin(a * 1.3) * 10, 2, 2)
      }
    }
    const d = Math.hypot(w.x - this.player.x, w.y - this.player.y)
    if (d < 4 * TILE) {
      this.tag(ctx, `${sp.name}${w.shiny ? ' ✦' : ''} Lv${w.level}`, w.x, w.y - 32, TYPE_COLORS[sp.t[0]], false, 8)
    }
  }

  drawAmbient (ctx, a) {
    drawTrainer(ctx, a.x, a.y + 8, a.dir, a.frame, a.colors, { walking: a.moving, time: this.time + a.x * .01, scale: 1.38 })
    this.tag(ctx, `${a.name} · Lv${a.level}`, a.x, a.y - 42, '#9fe8ff', false, 8)
    if (a.bubble) this.bubble(ctx, a.bubble, a.x, a.y - 58)
  }

  drawPeer (ctx, p) {
    const px = p.x * TILE, py = p.y * TILE
    drawTrainer(ctx, px, py + 8, p.dir || 'down', 0, { ...p.colors, skin: p.colors?.skin || '#f0c8a0' }, { walking: false, time: this.time, scale: 1.38 })
    this.tag(ctx, `${p.name} · Lv${p.level}`, px, py - 42, '#8ff5c4', false, 8)
  }

  tag (ctx, text, x, y, color = '#fff', highlight = false, size = 9) {
    ctx.save()
    ctx.font = `800 ${size}px Nunito, sans-serif`
    const w = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(8,12,23,.78)'
    this.roundRect(ctx, x - w / 2 - 5, y - size - 4, w + 10, size + 8, 4)
    ctx.fill()
    if (highlight) { ctx.strokeStyle = 'rgba(244,201,93,.5)'; ctx.lineWidth = 1; ctx.stroke() }
    ctx.fillStyle = color
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  bubble (ctx, text, x, y) {
    ctx.save()
    ctx.font = '700 9px Nunito, sans-serif'
    const w = Math.min(150, ctx.measureText(text).width + 14)
    ctx.fillStyle = 'rgba(255,255,255,.94)'
    this.roundRect(ctx, x - w / 2, y - 16, w, 18, 8); ctx.fill()
    ctx.fillStyle = '#1b2438'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text.length > 26 ? text.slice(0, 25) + '…' : text, x, y - 7)
    ctx.restore()
  }

  roundRect (ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }

  drawWeather (ctx) {
    if (!this.state.settings.weather || this.weather.type === 'clear') return
    const w = this.camera.vw, h = this.camera.vh, t = this.time
    ctx.save()
    if (this.weather.type === 'rain' || this.weather.type === 'storm') {
      ctx.strokeStyle = 'rgba(180,210,255,.35)'; ctx.lineWidth = 1
      for (let i = 0; i < 100; i++) {
        const x = ((i * 137 + t * 420) % (w + 80)) - 40
        const y = ((i * 83 + t * 620) % (h + 80)) - 40
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13); ctx.stroke()
      }
      if (this.weather.type === 'storm' && Math.sin(t * .7) > .97) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, 0, w, h) }
    } else if (this.weather.type === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,.75)'
      for (let i = 0; i < 80; i++) {
        const x = ((i * 151 + Math.sin(t * .6 + i) * 40 + t * 22) % (w + 40)) - 20
        const y = ((i * 97 + t * 34) % (h + 40)) - 20
        ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * .7, 0, 7); ctx.fill()
      }
    } else if (this.weather.type === 'ash') {
      for (let i = 0; i < 55; i++) {
        const x = ((i * 173 + Math.sin(t + i) * 20 + t * 12) % (w + 40)) - 20
        const y = (h - ((i * 71 + t * 24) % (h + 40))) - 20
        ctx.fillStyle = i % 3 ? 'rgba(120,110,105,.5)' : 'rgba(255,130,60,.6)'
        ctx.fillRect(x, y, 1.6, 1.6)
      }
    } else if (this.weather.type === 'fog') {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, 'rgba(200,215,230,.16)'); g.addColorStop(.6, 'rgba(190,205,220,.08)'); g.addColorStop(1, 'rgba(190,205,220,.02)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    }
    ctx.restore()
  }

  drawLighting (ctx, camX, camY) {
    const hour = this.state.clock / 60
    let dark = 0
    if (hour < 5) dark = .58
    else if (hour < 7) dark = lerp(.58, 0, (hour - 5) / 2)
    else if (hour < 17.5) dark = 0
    else if (hour < 20) dark = lerp(0, .58, (hour - 17.5) / 2.5)
    else dark = .58
    if (dark <= 0.01) return
    const w = this.camera.vw, h = this.camera.vh, scale = this.camera.scale
    const dusk = hour > 16.5 && hour < 19.5
    ctx.save()
    ctx.fillStyle = dusk ? `rgba(90,40,70,${dark * .55})` : `rgba(8,14,42,${dark})`
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'lighter'
    // world lamps & rifts
    for (const p of this.world.props) {
      if (p.type !== 'lamp') continue
      const sx = (p.x * TILE + 16 - camX) * scale, sy = (p.y * TILE + 8 - camY) * scale
      if (sx < -100 || sy < -100 || sx > w + 100 || sy > h + 100) continue
      drawLight(ctx, sx, sy, 78 * scale / 2, '#ffcf7a', dark * .9)
    }
    for (const r of this.world.rifts) {
      if (!r.ready) continue
      const sx = (r.x * TILE + 16 - camX) * scale, sy = (r.y * TILE + 14 - camY) * scale
      if (sx < -150 || sy < -150 || sx > w + 150 || sy > h + 150) continue
      drawLight(ctx, sx, sy, 90 * scale / 2, '#b57bff', .7)
    }
    // building windows
    for (const b of this.world.buildings) {
      const sx = (b.x * TILE + b.w * TILE / 2 - camX) * scale
      const sy = (b.y * TILE + 20 - camY) * scale
      if (sx < -150 || sy < -150 || sx > w + 150 || sy > h + 150) continue
      drawLight(ctx, sx, sy, 64 * scale / 2, '#ffd98a', .5)
    }
    // player lantern
    drawLight(ctx, (this.player.x - camX) * scale, (this.player.y - camY) * scale, 110 * scale / 2, '#ffe0a0', .45)
    ctx.globalCompositeOperation = 'source-over'
    // fireflies
    if (hour > 19.5 || hour < 5) {
      const biome = this.world.biomeAt(Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE))
      if (biome === 'meadow' || biome === 'forest' || biome === 'marsh') {
        for (let i = 0; i < 18; i++) {
          const x = ((i * 173 + Math.sin(this.time * .4 + i) * 60) % w + w) % w
          const y = ((i * 97 + Math.cos(this.time * .3 + i * 2) * 40) % h + h) % h
          ctx.fillStyle = `rgba(255,235,150,${.25 + Math.sin(this.time * 2 + i) * .25})`
          ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill()
        }
      }
    }
    ctx.restore()
  }

  drawWaypoint (ctx) {
    if (!this.ui?.waypoint) return
    const { x, y } = this.ui.waypoint
    const dx = x * TILE - this.player.x, dy = y * TILE - this.player.y
    const d = Math.hypot(dx, dy)
    if (d < TILE * 2) return
    const sx = this.camera.vw / 2 + dx / d * Math.min(this.camera.vw, this.camera.vh) * .34
    const sy = this.camera.vh / 2 + dy / d * Math.min(this.camera.vw, this.camera.vh) * .34
    const a = Math.atan2(dy, dx)
    ctx.save()
    ctx.translate(sx, sy); ctx.rotate(a)
    ctx.fillStyle = 'rgba(244,201,93,.9)'
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -6); ctx.lineTo(-2, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill()
    ctx.restore()
    ctx.save(); ctx.font = '800 10px Nunito'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.8)'
    ctx.fillText(`${Math.round(d / TILE)} tiles`, sx, sy + 20); ctx.restore()
  }

  // ---------------- save on hide ----------------
  saveNow () {
    if (!this.started) return
    this.state.pos = { x: this.player.x / TILE, y: this.player.y / TILE }
    this.state.dir = this.player.dir
    this.state.save()
  }
}

const app = new App()
window.__pokeverse = app
document.addEventListener('visibilitychange', () => { if (document.hidden) app.saveNow() })
window.addEventListener('beforeunload', () => app.saveNow())
app.boot()
