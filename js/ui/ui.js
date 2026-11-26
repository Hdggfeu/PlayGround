import { POKEDEX, DEX_BY_ID, GEN_RANGES } from '../data/pokedex.js'
import { TYPES, TYPE_COLORS, ITEMS, MOVES, BADGES, statsAt, expForLevel, movesFor, typeGradient } from '../data/moves.js'
import { GYMS, CHAMPION } from '../data/gyms.js'
import { monStats, maxHp, healMon, healParty, createMon, gainExp, syncMoves, evolutionOptions, evolveMon, expToNext, expProgress, SAVE_SLOTS, slotSummary, deleteSlot } from '../core/state.js'
import { drawTrainer } from '../render/sprites.js'
import { clamp, fmt, timeString, niceTime, hexAlpha } from '../core/utils.js'
import { t, tr, getLang, setLang, localizeDom, timeLabel, moveName, typeName, statusName, applyStatic } from '../core/i18n.js'
import { DEFAULT_CONTROLS, CONTROL_GROUPS, normalizeControls, resetControls, bindingText, actionFor, cloneControls } from '../core/controls.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function cloneControlsForRebind (controls, action, key) {
  const next = cloneControls(controls)
  for (const [other, keys] of Object.entries(next)) {
    if (other === action) continue
    next[other] = keys.filter(k => k !== key)
    if (!next[other].length) next[other] = [...DEFAULT_CONTROLS[other]]
  }
  next[action] = [key]
  return next
}

const $ = (id) => document.getElementById(id)
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }

const CHAT_NAMES = ['Nova','MistyWaves','PikaPete','Luna','Draco','GreenThumb','ShinyHunter','Kai','Mochi','RangerRae','Tomo','Vee','BlazeRunner','Sable','Aria','Bolt','Juniper','Rook','Pixel','Sol']
const CHAT_LINES = [
  'anyone know where Dratini spawns? been looking for an hour 😅',
  'SHINY PIDGEY IN THE MEADOW!!',
  'the rift near Tidecrest is glowing again',
  'just beat Terra, champion here I come',
  'this world is huge, I keep getting lost in the marsh',
  'LFG caldera raid, need one more',
  'pro tip: check the chest behind the lab 👀',
  'my Gardevoir just learned Moonblast, she is unstoppable',
  'anyone got spare ultra balls? I keep breaking them',
  'the snow route music is so good',
  'caught a Lapras at the north shore!!',
  'does anyone else name their Pokémon after food',
  'the gym leaders do NOT mess around',
  'found a master ball in a chest, no way',
  'who wants to race to the top of Champion Tower',
  'I love that every gen is here. gen 3 forever',
  'the day/night cycle is gorgeous',
  'trading? I have a spare Eevee',
  'level 40 and still no shiny… the grind continues',
  'Rosa\'s Breloom swept my whole team lol',
  'anyone seen the fireflies near Goldleaf?',
  'pokedex at 412! going for all 1025',
]
const NPC_REPLIES = [
  'welcome to the Pokéverse!',
  'good luck out there!',
  'nice! add me to your friend list',
  'the Champion Tower is no joke',
  'I saw that too!',
  'let\'s battle sometime ⚡',
  'did you check the tall grass?',
  'that\'s a great catch!',
]

export class UI {
  constructor (app) {
    this.app = app
    this.state = app.state
    this.modalLayer = $('modal-layer')
    this.dialogueEl = $('dialogue')
    this.dexLimit = 120
    this.dexScroll = 0
    this.chatCount = 0
    this.lastMinimap = 0
    this.waypoint = null
    this.simTimer = 0
    this.lastQuestKey = ''
    this.bind()
    this.initChat()
    this.refreshHUD()
    this.tick()
    setInterval(() => this.tick(), 500)
    this.startChatSim()
    if (matchMedia('(pointer: coarse)').matches) $('chat-panel')?.classList.add('collapsed')
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.modalLayer.classList.contains('hidden')) { this.closeModal(); e.preventDefault() }
        else if (!this.dialogueEl.classList.contains('hidden')) { this.hideDialogue(); e.preventDefault() }
      }
    })
    this.refreshControlHints()
  }

  refreshControlHints () {
    const c = this.state.settings.controls || DEFAULT_CONTROLS
    const set = (sel, action) => { const el = document.querySelector(sel); if (el) el.textContent = bindingText(c[action]) }
    set('#kbd-party', 'party'); set('#kbd-bag', 'bag'); set('#kbd-dex', 'dex')
    set('#kbd-map', 'map'); set('#kbd-quests', 'quests'); set('#kbd-menu', 'menu')
    set('#kbd-bag-battle', 'battleBag'); set('#kbd-party-battle', 'battleParty'); set('#kbd-run-battle', 'battleRun')
  }

  bind () {
    for (const b of document.querySelectorAll('.hot-btn')) {
      b.addEventListener('click', () => {
        const ui = b.dataset.ui
        this.app.audio.sfx('click')
        if (ui === 'party') this.openParty()
        if (ui === 'bag') this.openBag()
        if (ui === 'dex') this.openDex()
        if (ui === 'map') this.openMap()
        if (ui === 'quests') this.openQuests()
        if (ui === 'settings') this.openSettings()
      })
    }
    $('btn-map-quick')?.addEventListener('click', () => this.openMap())
    $('quest-toggle')?.addEventListener('click', () => {
      $('quest-card').classList.toggle('collapsed')
      $('quest-toggle').textContent = $('quest-card').classList.contains('collapsed') ? '+' : '–'
    })
    $('chat-collapse')?.addEventListener('click', () => {
      $('chat-panel').classList.toggle('collapsed')
      $('chat-collapse').textContent = $('chat-panel').classList.contains('collapsed') ? '▴' : '▾'
    })
    $('chat-head')?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return
      if (matchMedia('(pointer: coarse)').matches) {
        $('chat-panel').classList.toggle('collapsed')
        $('chat-collapse').textContent = $('chat-panel').classList.contains('collapsed') ? '▴' : '▾'
      }
    })
    $('chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault()
      const input = $('chat-text')
      const text = input.value.trim()
      if (!text) return
      input.value = ''
      this.addChat(this.state.name, text, true)
      this.app.multiplayer?.sendChat(text)
      setTimeout(() => this.addChat(CHAT_NAMES[Math.floor(Math.random() * CHAT_NAMES.length)], NPC_REPLIES[Math.floor(Math.random() * NPC_REPLIES.length)], false), 900 + Math.random() * 1600)
    })
    $('touch-menu')?.addEventListener('click', () => { this.app.audio.sfx('click'); this.openSettings() })
    $('chat-text')?.addEventListener('focus', () => { this.app.chatFocused = true })
    $('chat-text')?.addEventListener('blur', () => { this.app.chatFocused = false })
  }

  initChat () {
    const feed = $('chat-feed')
    if (!feed) return
    feed.innerHTML = ''
    this.addChat(null, tr('Welcome to Pokéverse Online — every Pokémon, one world.'), false, 'system')
    this.addChat(null, tr('Tip: talk to Professor Black by the lab to begin your journey.'), false, 'system')
    setTimeout(() => this.addChat('Nova', tr('new trainer just spawned in Willowbrook! say hi 👋')), 2500)
    setTimeout(() => this.addChat('ShinyHunter', tr('the global chat is live, all 1025 mons are in the wild')), 6000)
  }

  addChat (name, text, self = false, type = '') {
    const feed = $('chat-feed')
    if (!feed) return
    const line = el('div', 'chat-line ' + type)
    if (type === 'system') line.textContent = text
    else line.innerHTML = `<b>${this.esc(name)}</b>${self ? ' <span class="ch-tag">you</span>' : ''} ${this.esc(text)}`
    feed.appendChild(line)
    while (feed.children.length > 40) feed.removeChild(feed.firstChild)
    feed.scrollTop = feed.scrollHeight
  }

  startChatSim () {
    const loop = () => {
      const delay = 7000 + Math.random() * 14000
      setTimeout(() => {
        if (this.app.inBattle) { loop(); return }
        const r = Math.random()
        const name = CHAT_NAMES[Math.floor(Math.random() * CHAT_NAMES.length)]
        if (r < .08) this.addChat(null, tr(`${name} joined the world`), false, 'system')
        else if (r < .13) this.addChat(null, tr(`A shiny Pokémon was spotted in ${['Verdant Meadows','Frostpeak','Ember Caldera','Sunstone Desert'][Math.floor(Math.random() * 4)]}!`), false, 'system')
        else this.addChat(name, tr(CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)]))
        loop()
      }, delay)
    }
    loop()
  }

  esc (s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }

  tick () {
    const st = this.state
    if (!st.started) return
    const clockEl = $('hud-time'); if (clockEl) clockEl.textContent = timeLabel(st.clock)
    const weather = this.app.weather
    const w = $('hud-weather')
    if (w && weather) {
      const map = { clear:'☀ Clear', rain:'🌧 Rain', storm:'⛈ Storm', snow:'❄ Snow', ash:'🌋 Ashfall', fog:'🌫 Fog' }
      w.textContent = tr(map[weather.type] || '☀ Clear')
    }
    const online = 12840 + Math.floor(Math.sin(Date.now() / 60000) * 180) + (this.app.multiplayer?.peerCount || 0) * 3
    if ($('online-count')) $('online-count').textContent = fmt(online)
    if ($('chat-online')) $('chat-online').textContent = tr(fmt(online) + ' online')
    const zone = tr(this.app.world?.zoneName(Math.floor(st.pos.x), Math.floor(st.pos.y)) || 'Willowbrook Town')
    if ($('hud-zone')) $('hud-zone').textContent = zone
    if ($('hud-region')) $('hud-region').textContent = zone
    this.drawMinimap()
    this.updateQuestCard()
  }

  refreshHUD () {
    const st = this.state
    const lead = st.party[0]
    const leadSp = lead ? DEX_BY_ID.get(lead.id) : null
    if ($('hud-name')) $('hud-name').textContent = st.name
    if ($('hud-level')) $('hud-level').textContent = lead ? t('hud.level') + ' ' + lead.level : '—'
    if ($('hud-money')) $('hud-money').textContent = fmt(st.money)
    if ($('hud-xp')) $('hud-xp').style.width = lead ? expProgress(lead) * 100 + '%' : '0%'
    const badges = $('hud-badges')
    if (badges) badges.innerHTML = BADGES.map(b => `<span class="badge-dot ${st.badges.includes(b.id) ? 'earned' : ''}" style="--bc:${b.color}" title="${tr(b.name)}">${b.icon}</span>`).join('')
    this.drawAvatar()
    this.updateQuestCard()
    this.drawMinimap()
  }

  updateQuestCard () {
    const st = this.state
    const q = st.quest
    if (!q) return
    const key = st.questStep + '|' + st.caught.size + '|' + st.badges.join(',')
    if ($('quest-title')) $('quest-title').textContent = tr(q.title)
    if ($('quest-desc')) $('quest-desc').textContent = tr(q.desc)
    if ($('quest-hint')) $('quest-hint').textContent = tr(q.hint)
    let p = 0
    const step = st.questStep
    if (step === 0) p = 0
    else if (step === 1) p = st.caught.size / 3
    else if (step === 2) p = st.badges.includes('bloom') ? 1 : 0
    else if (step === 3) p = ((st.badges.includes('frost') ? 1 : 0) + (st.badges.includes('ember') ? 1 : 0)) / 2
    else if (step === 4) p = st.badges.includes('moon') ? 1 : 0
    else if (step === 5) p = ((st.badges.includes('tide') ? 1 : 0) + (st.badges.includes('spark') ? 1 : 0)) / 2
    else if (step === 6) p = st.badges.includes('terra') ? 1 : 0
    else if (step === 7) p = st.badges.includes('iron') ? 1 : 0
    else if (step === 8) p = 0
    else if (step === 9) p = st.leagueMaster ? 1 : 0
    else if (step === 10) p = st.caught.size / 1025
    if ($('quest-progress')) $('quest-progress').style.width = clamp(p, 0, 1) * 100 + '%'
  }

  drawAvatar () {
    const c = $('hud-avatar')
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = 'rgba(255,255,255,.04)'
    ctx.fillRect(0, 0, c.width, c.height)
    drawTrainer(ctx, c.width / 2, c.height - 4, 'down', 0, this.state.colors, { scale: 2.2, time: performance.now() / 1000 })
  }

  drawMinimap () {
    const c = $('minimap')
    const world = this.app.world
    if (!c || !world) return
    const now = performance.now()
    if (now - this.lastMinimap < 220) return
    this.lastMinimap = now
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(world.minimap, 0, 0, c.width, c.height)
    const sx = c.width / world.w, sy = c.height / world.h
    for (const t of world.towns) {
      ctx.fillStyle = '#ffd777'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(t.x * sx, t.y * sy, 3.2, 0, 7); ctx.fill(); ctx.stroke()
    }
    for (const r of world.rifts) if (r.ready) {
      ctx.fillStyle = '#c79bf0'; ctx.beginPath(); ctx.arc(r.x * sx, r.y * sy, 2, 0, 7); ctx.fill()
    }
    if (this.waypoint) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(this.waypoint.x * sx, this.waypoint.y * sy, 4, 0, 7); ctx.stroke()
    }
    const px = this.state.pos.x * sx, py = this.state.pos.y * sy
    const pulse = 2.5 + Math.sin(now / 260) * 1.2
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(px, py, pulse + 1.5, 0, 7); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#f4c95d'; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1
    const vw = (this.app.camera?.vw || 400) / 2 * sx, vh = (this.app.camera?.vh || 300) / 2 * sy
    ctx.strokeRect(px - vw, py - vh, vw * 2, vh * 2)
  }

  toast (text, icon = '✦', type = '') {
    const stack = $('toast-stack')
    if (!stack) return
    const t = el('div', 'toast ' + type, `<span class="t-icon">${icon}</span><span>${tr(text)}</span>`)
    stack.appendChild(t)
    while (stack.children.length > 4) stack.firstChild.remove()
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320) }, 3200)
  }

  popText (text, sx, sy, color = '#ffe08a') {
    const layer = $('pop-layer')
    if (!layer) return
    const d = el('div', 'pop-text', text)
    d.style.left = sx + 'px'; d.style.top = sy + 'px'; d.style.color = color
    layer.appendChild(d)
    setTimeout(() => d.remove(), 1150)
  }

  fadeOut (cb) {
    const f = $('fade')
    if (!f) { cb?.(); return }
    f.classList.remove('hidden'); requestAnimationFrame(() => f.classList.add('on'))
    setTimeout(() => cb?.(), 560)
  }
  fadeIn () {
    const f = $('fade')
    if (!f) return
    f.classList.remove('on')
    setTimeout(() => f.classList.add('hidden'), 520)
  }

  showInteract (text) {
    const p = $('interact-prompt')
    if (!p) return
    p.classList.remove('hidden')
    $('interact-text').textContent = tr(text)
  }
  hideInteract () { $('interact-prompt')?.classList.add('hidden') }

  openModal ({ title, sub = '', body = '', footer = '', size = '', tabs = null, onClose = null }) {
    this.app.audio.sfx('open')
    this.modalLayer.classList.remove('hidden')
    this.modalLayer.innerHTML = `<div class="modal-card ${size}">
      <div class="modal-head"><div><div class="modal-title">${title}</div>${sub ? `<div class="modal-sub">${sub}</div>` : ''}</div><button class="modal-close" id="modal-x">✕</button></div>
      ${tabs ? `<div class="tabs">${tabs.map((t, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${i}">${t}</button>`).join('')}</div>` : ''}
      <div class="modal-body" id="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`
    $('modal-x').onclick = () => this.closeModal(onClose)
    this.modalLayer.onclick = (e) => { if (e.target === this.modalLayer) this.closeModal(onClose) }
    this.currentModal = { onClose }
    localizeDom(this.modalLayer)
    return $('modal-body')
  }

  closeModal (cb) {
    this.modalLayer.classList.add('hidden')
    this.modalLayer.innerHTML = ''
    if (typeof cb === 'function') cb()
    this.app.audio.sfx('close')
    this.currentModal = null
    this.app.save?.()
  }

  // ---------------- PARTY ----------------
  openParty () {
    const st = this.state
    const body = this.openModal({
      title: 'YOUR PARTY', sub: `${st.party.length}/6 Pokémon · ${st.box.length} in PC box`,
      size: '', footer: `<span>Lead: <b>${st.party[0] ? DEX_BY_ID.get(st.party[0].id).name : '—'}</b></span><div class="row"><button class="btn btn-sm btn-ghost" id="party-pc">PC Box (${st.box.length})</button><button class="btn btn-sm btn-ghost" id="party-heal">Heal at Center</button></div>`,
    })
    this.renderParty(body)
    $('party-pc').onclick = () => { this.closeModal(); setTimeout(() => this.openPC(), 180) }
    $('party-heal').onclick = () => {
      const town = this.app.world.townAt(Math.floor(st.pos.x), Math.floor(st.pos.y))
      if (!town) return this.toast('You must be inside a town to heal.', '✚', 'red')
      healParty(st.party); st.save(); this.app.audio.sfx('heal'); this.toast('Your party is fully healed!', '✚', 'green'); this.refreshHUD(); this.renderParty($('modal-body'))
    }
  }

  renderParty (body) {
    const st = this.state
    body.innerHTML = `<div class="party-grid" id="party-grid"></div><div class="section-title">PC Box · ${st.box.length} stored</div><div id="box-preview" class="dex-grid"></div>`
    const grid = $('party-grid')
    st.party.forEach((m, i) => {
      const sp = DEX_BY_ID.get(m.id)
      const pct = m.hp / maxHp(m)
      const card = el('div', 'party-card ' + (m.hp <= 0 ? 'fainted' : ''))
      card.style.setProperty('--tg', typeGradient(sp.t))
      card.innerHTML = `<img class="pc-sprite" src="assets/sprites/${m.id}.png" alt="" />
        <div class="pc-body">
          <div class="pc-top"><span class="pc-mon-name">${m.nickname || sp.name}${m.shiny ? ' ✦' : ''}</span><span class="pc-mon-lv">Lv ${m.level}</span></div>
          <div class="pc-types">${sp.t.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('')}${m.status ? `<span class="type-chip" style="background:#555">${m.status}</span>` : ''}</div>
          <div class="pc-hp"><span class="${pct <= .5 ? 'mid' : ''} ${pct <= .22 ? 'low' : ''}" style="width:${pct * 100}%"></span></div>
          <div class="pc-hpnum"><span>${Math.max(0, Math.round(m.hp))}/${maxHp(m)} HP</span><span>${i === 0 ? '★ Lead' : ''}</span></div>
          <div class="pc-actions"><button data-lead="${i}">Set Lead</button><button data-item="${m.uid}">Use Item</button>${i > 0 ? `<button data-box="${m.uid}">To Box</button>` : ''}</div>
        </div>`
      grid.appendChild(card)
    })
    for (let i = st.party.length; i < 6; i++) grid.appendChild(el('div', 'empty-slot', 'Empty slot'))
    for (const b of grid.querySelectorAll('[data-lead]')) b.onclick = () => {
      const i = +b.dataset.lead
      if (i === 0) return
      st.swapParty(0, i); st.save(); this.app.audio.sfx('select'); this.refreshHUD(); this.renderParty($('modal-body')); this.toast(`${DEX_BY_ID.get(st.party[0].id).name} is now your lead!`, '★')
    }
    for (const b of grid.querySelectorAll('[data-box]')) b.onclick = () => {
      const mon = st.removeFromParty(b.dataset.box)
      if (!mon) return this.toast('You need at least one Pokémon in your party.', '⚠', 'red')
      st.save(); this.refreshHUD(); this.renderParty($('modal-body')); this.toast(`${DEX_BY_ID.get(mon.id).name} was sent to the PC box.`, '▤')
    }
    for (const b of grid.querySelectorAll('[data-item]')) b.onclick = () => this.pickItemForMon(st.party.find(m => m.uid === b.dataset.item), () => this.renderParty($('modal-body')))
    const box = $('box-preview')
    const stored = st.box.slice(0, 24)
    box.innerHTML = stored.length ? stored.map(m => {
      const sp = DEX_BY_ID.get(m.id)
      return `<button class="dex-entry caught" data-boxmon="${m.uid}"><span class="dex-num">Lv${m.level}</span><img src="assets/sprites/${m.id}.png" alt=""><div class="dex-name">${sp.name}</div></button>`
    }).join('') : '<div class="empty-note" style="grid-column:1/-1">Your PC box is empty.</div>'
    for (const b of box.querySelectorAll('[data-boxmon]')) b.onclick = () => {
      if (st.party.length >= 6) return this.toast('Your party is full. Send one to the box first.', '⚠', 'red')
      const mon = st.withdraw(b.dataset.boxmon)
      if (mon) { st.save(); this.refreshHUD(); this.renderParty($('modal-body')); this.toast(`${DEX_BY_ID.get(mon.id).name} joined your party!`, '◉', 'green') }
    }
    localizeDom($('modal-body'))
  }

  openPC () {
    const st = this.state
    const body = this.openModal({
      title: 'PC STORAGE', sub: `${st.box.length} Pokémon stored · click to withdraw`,
      footer: `<span>Party ${st.party.length}/6</span><button class="btn btn-sm btn-ghost" id="pc-party">View Party</button>`,
    })
    const render = () => {
      const b = $('modal-body')
      b.innerHTML = `<div class="dex-grid">${st.box.map(m => {
        const sp = DEX_BY_ID.get(m.id)
        return `<button class="dex-entry caught" data-withdraw="${m.uid}"><span class="dex-num">Lv${m.level}</span>${m.shiny ? '<span class="dex-star">✦</span>' : ''}<img src="assets/sprites/${m.id}.png" alt=""><div class="dex-name">${sp.name}</div></button>`
      }).join('') || '<div class="empty-note" style="grid-column:1/-1">No Pokémon in storage. Catch more!</div>'}</div>`
      for (const btn of b.querySelectorAll('[data-withdraw]')) btn.onclick = () => {
        if (st.party.length >= 6) return this.toast('Party is full.', '⚠', 'red')
        const mon = st.withdraw(btn.dataset.withdraw)
        if (mon) { st.save(); this.app.audio.sfx('select'); this.refreshHUD(); render(); this.toast(`${DEX_BY_ID.get(mon.id).name} joined your party!`, '◉', 'green') }
      }
      localizeDom(b)
    }
    render()
    $('pc-party').onclick = () => { this.closeModal(); setTimeout(() => this.openParty(), 160) }
  }

  pickItemForMon (mon, after) {
    if (!mon) return
    const usable = Object.entries(this.state.bag).filter(([id, n]) => n > 0 && ITEMS[id] && ['heal','revive','candy','evolve'].includes(ITEMS[id].kind))
    if (!usable.length) return this.toast('You have no usable items.', '🎒', 'red')
    this.openModal({
      title: `USE ITEM ON ${DEX_BY_ID.get(mon.id).name.toUpperCase()}`, sub: `${Math.round(mon.hp)}/${maxHp(mon)} HP${mon.status ? ' · ' + mon.status : ''}`,
      body: `<div class="bag-grid">${usable.map(([id, n]) => { const it = ITEMS[id]; return `<button class="item-card" data-use="${id}"><span class="item-icon">${it.icon}</span><div class="item-body"><div class="item-name">${it.name} <span class="item-count">×${n}</span></div><div class="item-desc">${it.desc}</div></div></button>` }).join('')}</div>`,
    })
    localizeDom($('modal-body'))
    for (const b of $('modal-body').querySelectorAll('[data-use]')) b.onclick = () => {
      const id = b.dataset.use
      const ok = this.useItemOn(id, mon)
      if (ok) { this.closeModal(); after?.(); this.refreshHUD() }
    }
  }

  useItemOn (id, mon) {
    const it = ITEMS[id]
    const st = this.state
    if (!it || !st.bag[id]) return false
    if (it.kind === 'heal') {
      if (mon.hp >= maxHp(mon)) return this.toast(`${DEX_BY_ID.get(mon.id).name} is already at full HP.`, '⚠', 'red'), false
      st.useItem(id); mon.hp = Math.min(maxHp(mon), mon.hp + it.heal); if (it.cure) mon.status = null
      this.app.audio.sfx('heal'); this.toast(`${DEX_BY_ID.get(mon.id).name} recovered HP!`, '🧪', 'green'); st.save(); return true
    }
    if (it.kind === 'revive') {
      if (mon.hp > 0) return this.toast('That Pokémon is not fainted.', '⚠', 'red'), false
      st.useItem(id); mon.hp = Math.floor(maxHp(mon) / 2); mon.status = null
      this.app.audio.sfx('heal'); this.toast(`${DEX_BY_ID.get(mon.id).name} was revived!`, '✚', 'green'); st.save(); return true
    }
    if (it.kind === 'candy') {
      if (mon.level >= 100) return this.toast('Already at max level.', '⚠', 'red'), false
      st.useItem(id); mon.exp = expForLevel(mon.level + 1); mon.level++; const moves = syncMoves(mon); mon.hp = Math.min(mon.hp + 10, maxHp(mon))
      this.app.audio.sfx('level'); this.toast(`${DEX_BY_ID.get(mon.id).name} grew to Lv ${mon.level}!`, '🍬', 'gold')
      if (moves.length) this.toast(`Learned ${moves.join(', ')}!`, '✦')
      st.save(); return true
    }
    if (it.kind === 'evolve') {
      const opts = (DEX_BY_ID.get(mon.id).evo || []).filter(e => e.item)
      if (!opts.length) return this.toast(`${DEX_BY_ID.get(mon.id).name} cannot use an Evolution Stone.`, '⚠', 'red'), false
      st.useItem(id)
      this.closeModal()
      this.evolutionAnimation(mon, opts[0].id)
      return true
    }
    return false
  }

  // ---------------- BAG ----------------
  openBag () {
    const st = this.state
    const body = this.openModal({
      title: 'TRAINER BAG', sub: `${fmt(st.money)} PokéDollars · ${Object.keys(st.bag).length} item types`,
      footer: `<span>Balls and potions are usable in battle.</span><button class="btn btn-sm btn-ghost" id="bag-shop">Poké Mart</button>`,
    })
    const render = () => {
      const b = $('modal-body')
      const entries = Object.entries(st.bag).filter(([id, n]) => n > 0 && ITEMS[id])
      b.innerHTML = entries.length ? `<div class="bag-grid">${entries.map(([id, n]) => {
        const it = ITEMS[id]
        return `<button class="item-card" data-bag="${id}"><span class="item-icon">${it.icon}</span><div class="item-body"><div class="item-name">${it.name} <span class="item-count">×${n}</span></div><div class="item-desc">${it.desc}</div></div></button>`
      }).join('')}</div>` : '<div class="empty-note">Your bag is empty. Visit the Poké Mart!</div>'
      for (const btn of b.querySelectorAll('[data-bag]')) btn.onclick = () => {
        const id = btn.dataset.bag, it = ITEMS[id]
        if (it.kind === 'ball') return this.toast('Poké Balls are used during wild battles.', '◓')
        if (['heal','revive','candy','evolve'].includes(it.kind)) {
          this.openModal({ title: `USE ${it.name.toUpperCase()}`, sub: 'Choose a Pokémon', body: this.partyPickerHTML(), })
          for (const pb of $('modal-body').querySelectorAll('[data-pick]')) pb.onclick = () => {
            const mon = st.party.find(m => m.uid === pb.dataset.pick)
            const ok = this.useItemOn(id, mon)
            if (ok) { this.closeModal(); setTimeout(() => this.openBag(), 160) }
          }
          return
        }
      }
      localizeDom(b)
    }
    render()
    $('bag-shop').onclick = () => { this.closeModal(); setTimeout(() => this.openShop(), 150) }
  }

  partyPickerHTML (filter = () => true) {
    return `<div class="party-grid">${this.state.party.filter(filter).map(m => {
      const sp = DEX_BY_ID.get(m.id)
      const pct = m.hp / maxHp(m)
      return `<button class="party-card" data-pick="${m.uid}" style="--tg:${typeGradient(sp.t)}"><img class="pc-sprite" src="assets/sprites/${m.id}.png" alt=""><div class="pc-body"><div class="pc-top"><span class="pc-mon-name">${m.nickname || sp.name}</span><span class="pc-mon-lv">Lv ${m.level}</span></div><div class="pc-types">${sp.t.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('')}</div><div class="pc-hp"><span style="width:${pct * 100}%"></span></div><div class="pc-hpnum"><span>${Math.round(m.hp)}/${maxHp(m)} HP</span><span>${m.status || ''}</span></div></div></button>`
    }).join('')}</div>`
  }

  // ---------------- DEX ----------------
  openDex (presetId = null) {
    const st = this.state
    const body = this.openModal({
      title: 'POKÉDEX', sub: `${st.caught.size} caught · ${st.seen.size} seen · 1,025 species`,
      size: 'wide',
      footer: `<span id="dex-count-label">${st.caught.size} / 1025 registered</span><div class="row"><button class="btn btn-sm btn-ghost" id="dex-prev">◀</button><button class="btn btn-sm btn-ghost" id="dex-next">▶</button></div>`,
    })
    this.dexLimit = 120
    this.dexFilter = { gen: 0, type: '', caughtOnly: false, search: '' }
    body.innerHTML = `
      <div class="dex-toolbar" id="dex-toolbar">
        <input type="search" id="dex-search" placeholder="Search by name or number…" />
        <button class="gen-pill active" data-gen="0">All</button>
        ${Object.keys(GEN_RANGES).map(g => `<button class="gen-pill" data-gen="${g}">Gen ${g}</button>`).join('')}
        <select id="dex-type" class="gen-pill" style="padding:6px 8px"><option value="">All types</option>${TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
        <button class="gen-pill" id="dex-caught">Caught only</button>
        <span class="dex-progress"><b>${st.caught.size}</b> / 1025</span>
      </div>
      <div class="dex-grid" id="dex-grid"></div>
      <div class="dex-loading hidden" id="dex-loading">Loading…</div>
      <button class="btn btn-sm btn-ghost dex-more" id="dex-more">Load more</button>`
    localizeDom(body)
    this.renderDex()
    $('dex-search').oninput = (e) => { this.dexFilter.search = e.target.value.toLowerCase(); this.dexLimit = 120; this.renderDex() }
    $('dex-type').onchange = (e) => { this.dexFilter.type = e.target.value; this.dexLimit = 120; this.renderDex() }
    $('dex-caught').onclick = () => { this.dexFilter.caughtOnly = !this.dexFilter.caughtOnly; $('dex-caught').classList.toggle('active', this.dexFilter.caughtOnly); this.dexLimit = 120; this.renderDex() }
    for (const b of body.querySelectorAll('[data-gen]')) b.onclick = () => {
      this.dexFilter.gen = +b.dataset.gen; this.dexLimit = 120
      body.querySelectorAll('[data-gen]').forEach(x => x.classList.remove('active')); b.classList.add('active'); this.renderDex()
    }
    $('dex-more').onclick = () => { this.dexLimit += 180; this.renderDex() }
    $('dex-prev').onclick = () => { this.dexLimit = Math.max(120, this.dexLimit - 180); this.renderDex() }
    $('dex-next').onclick = () => { this.dexLimit += 180; this.renderDex() }
    if (presetId) setTimeout(() => this.openDexDetail(presetId), 120)
  }

  filteredDex () {
    const st = this.state, f = this.dexFilter
    return POKEDEX.filter(p => {
      if (f.gen && p.g !== f.gen) return false
      if (f.type && !p.t.includes(f.type)) return false
      if (f.caughtOnly && !st.caught.has(p.n)) return false
      if (f.search) {
        const q = f.search.replace(/^#/, '')
        if (!p.name.toLowerCase().includes(q) && !String(p.n).includes(q)) return false
      }
      return true
    })
  }

  renderDex () {
    const grid = $('dex-grid')
    if (!grid) return
    const list = this.filteredDex()
    const slice = list.slice(0, this.dexLimit)
    grid.innerHTML = slice.map(p => {
      const caught = this.state.caught.has(p.n), seen = this.state.seen.has(p.n)
      return `<button class="dex-entry ${caught ? 'caught' : ''} ${seen ? 'seen' : 'unseen'}" data-dex="${p.n}">
        <span class="dex-num">#${String(p.n).padStart(4, '0')}</span>${caught ? '<span class="dex-star">●</span>' : ''}
        <img src="assets/sprites/${p.n}.png" loading="lazy" alt="" />
        <div class="dex-name">${p.name}</div></button>`
    }).join('') || '<div class="empty-note" style="grid-column:1/-1">No Pokémon match those filters.</div>'
    for (const b of grid.querySelectorAll('[data-dex]')) b.onclick = () => this.openDexDetail(+b.dataset.dex)
    const more = $('dex-more')
    if (more) more.style.display = list.length > this.dexLimit ? '' : 'none'
    if ($('dex-count-label')) $('dex-count-label').textContent = tr(`${this.state.caught.size} / 1025 registered`)
    localizeDom($('modal-body'))
  }

  openDexDetail (id) {
    const p = DEX_BY_ID.get(id)
    if (!p) return
    const st = this.state
    const caught = st.caught.has(id), seen = st.seen.has(id)
    const bst = p.s.reduce((a, b) => a + b, 0)
    const labels = ['HP','ATK','DEF','SPA','SPD','SPE']
    const evo = p.evo || []
    const body = this.openModal({
      title: `#${String(id).padStart(4, '0')} ${p.name.toUpperCase()}`, sub: `${p.cat} · Gen ${p.g} · ${caught ? 'CAUGHT' : seen ? 'SEEN' : 'UNKNOWN'}`,
      size: 'narrow',
      body: `<div class="dex-detail">
        <img src="assets/sprites/${id}.png" alt="" style="${!seen ? 'filter:brightness(0) opacity(.25)' : ''}" />
        <div class="dex-detail-info">
          <div class="row" style="gap:5px;margin-bottom:4px">${p.t.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('')}${p.le ? '<span class="pill" style="color:#f4c95d">LEGENDARY</span>' : ''}${p.my ? '<span class="pill" style="color:#c79bf0">MYTHICAL</span>' : ''}</div>
          <div class="dex-detail-cat">${p.h} m · ${p.w} kg · Base stat total ${bst}</div>
          <div class="dex-stats">${p.s.map((v, i) => `<div class="stat-row"><span>${labels[i]}</span><div class="stat-bar"><i style="width:${clamp(v / 180, 0, 1) * 100}%"></i></div><b style="width:24px;text-align:right;font-size:10px">${v}</b></div>`).join('')}</div>
        </div>
      </div>
      <div class="dex-flavor">${seen ? (p.fl || 'No data yet.') : 'Catch this Pokémon to record its field notes.'}</div>
      ${evo.length ? `<div class="section-title">Evolution</div><div class="row" style="flex-wrap:wrap;gap:8px">${evo.map(e => { const t = DEX_BY_ID.get(e.id); return `<button class="pill" data-evo="${e.id}" style="display:flex;align-items:center;gap:6px;padding:5px 10px"><img src="assets/sprites/${e.id}.png" style="width:30px;height:30px;image-rendering:pixelated"> ${t.name} ${e.lvl ? `<span style="color:var(--muted)">Lv ${e.lvl}</span>` : e.item ? `<span style="color:var(--muted)">${e.item}</span>` : '<span style="color:var(--muted)">special</span>'}</button>` }).join('')}</div>` : ''}
      <div class="row" style="margin-top:14px"><span class="pill">Capture rate ${p.cr}</span><span class="pill">${caught ? 'Registered ✓' : 'Not caught'}</span></div>`,
    })
    localizeDom(b)
    for (const e of b.querySelectorAll('[data-evo]')) e.onclick = () => this.openDexDetail(+e.dataset.evo)
  }

  // ---------------- MAP ----------------
  openMap () {
    const st = this.state, world = this.app.world
    const body = this.openModal({
      title: 'WORLD MAP', sub: `${world.zoneName(Math.floor(st.pos.x), Math.floor(st.pos.y))} · seed ${world.seed}`, size: 'wide',
      footer: `<span>Click the map to set a waypoint.</span><div class="row"><button class="btn btn-sm btn-ghost" id="map-clear">Clear Waypoint</button><button class="btn btn-sm btn-ghost" id="map-close2">Close</button></div>`,
    })
    body.innerHTML = `<div class="map-modal-wrap"><div class="map-canvas-wrap"><canvas id="map-canvas" width="768" height="768"></canvas></div>
      <div class="map-side"><div class="map-legend"><div><span class="legend-dot" style="background:#ffd777"></span>Towns & Centers</div><div><span class="legend-dot" style="background:#c79bf0"></span>Mythic rifts</div><div><span class="legend-dot" style="background:#ffffff"></span>You</div><div><span class="legend-dot" style="background:#f4c95d"></span>Gym</div><div><span class="legend-dot" style="background:#e8c45a"></span>Unopened chest</div></div>
      <div class="section-title">Destinations</div><div class="map-town-list">${world.towns.map(t => {
        const g = GYMS.find(g => g.town === t.id)
        return `<div class="map-town-row" data-town="${t.id}"><span class="badge-mini" style="background:${t.color}"></span>${t.name}<small>${g ? g.type + ' Gym' : 'Hub'}</small></div>`
      }).join('')}</div>
      <div class="section-title">Badges</div><div class="row" style="flex-wrap:wrap;gap:5px">${BADGES.map(b => `<span class="badge-dot ${st.badges.includes(b.id) ? 'earned' : ''}" style="--bc:${b.color};width:22px;height:22px;font-size:11px" title="${tr(b.name)}">${b.icon}</span>`).join('')}</div></div></div>`
    localizeDom(body)
    this.drawFullMap()
    $('map-clear').onclick = () => { this.waypoint = null; this.drawFullMap(); this.toast('Waypoint cleared.', '⌖'); this.tick() }
    $('map-close2').onclick = () => this.closeModal()
    const canvas = $('map-canvas')
    canvas.onclick = (e) => {
      const r = canvas.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * world.w, y = (e.clientY - r.top) / r.height * world.h
      this.waypoint = { x: Math.round(x), y: Math.round(y) }
      this.drawFullMap()
      this.toast(`Waypoint set: ${world.zoneName(Math.round(x), Math.round(y))}`, '⌖', 'gold')
      this.tick()
    }
    for (const row of body.querySelectorAll('[data-town]')) row.onclick = () => {
      const t = world.towns.find(x => x.id === row.dataset.town)
      if (t) { this.waypoint = { x: t.x, y: t.y }; this.drawFullMap(); this.toast(`Waypoint set: ${t.name}`, '⌖', 'gold') }
    }
  }

  drawFullMap () {
    const c = $('map-canvas')
    if (!c) return
    const world = this.app.world
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(world.minimap, 0, 0, c.width, c.height)
    const sx = c.width / world.w, sy = c.height / world.h
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * c.width / 4, 0); ctx.lineTo(i * c.width / 4, c.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * c.height / 4); ctx.lineTo(c.width, i * c.height / 4); ctx.stroke() }
    // chests
    for (const ch of world.chests) if (!ch.opened) { ctx.fillStyle = 'rgba(232,196,90,.8)'; ctx.fillRect(ch.x * sx - 1.5, ch.y * sy - 1.5, 3, 3) }
    // rifts
    for (const r of world.rifts) {
      ctx.fillStyle = r.ready ? '#c79bf0' : 'rgba(120,90,160,.4)'
      ctx.beginPath(); ctx.arc(r.x * sx, r.y * sy, r.ready ? 3.5 : 2, 0, 7); ctx.fill()
      if (r.ready) { ctx.strokeStyle = 'rgba(220,180,255,.6)'; ctx.beginPath(); ctx.arc(r.x * sx, r.y * sy, 6, 0, 7); ctx.stroke() }
    }
    // towns
    for (const t of world.towns) {
      const x = t.x * sx, y = t.y * sy
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill()
      ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill()
      ctx.strokeStyle = '#fff8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke()
      ctx.font = 'bold 13px Nunito, sans-serif'; ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(0,0,0,.7)'; const w = ctx.measureText(t.name).width
      ctx.fillRect(x - w / 2 - 5, y + 9, w + 10, 17)
      ctx.fillStyle = '#fff'; ctx.fillText(t.name, x, y + 21)
      const gym = GYMS.find(g => g.town === t.id)
      if (gym) { ctx.fillStyle = gym.color; ctx.beginPath(); ctx.arc(x + 12, y - 10, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#0006'; ctx.stroke() }
    }
    // player
    const px = this.state.pos.x * sx, py = this.state.pos.y * sy
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(px, py, 16, 0, 7); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#f4c95d'; ctx.beginPath(); ctx.arc(px, py, 2, 0, 7); ctx.fill()
    if (this.waypoint) {
      const wx = this.waypoint.x * sx, wy = this.waypoint.y * sy
      ctx.strokeStyle = '#f4c95d'; ctx.lineWidth = 2; ctx.setLineDash([5, 5])
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(wx, wy); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#f4c95d'; ctx.beginPath(); ctx.arc(wx, wy, 5, 0, 7); ctx.fill()
    }
  }

  // ---------------- QUESTS ----------------
  openQuests () {
    const st = this.state
    const steps = [
      'Choose your first partner at Black Lab.',
      'Catch 3 different Pokémon.',
      'Defeat Rosa at the Goldleaf Gym.',
      'Defeat Frost and Blaze.',
      'Defeat Luna at the Moonvale Gym.',
      'Defeat Marina and Volt.',
      'Defeat Terra at Dunebloom.',
      'Defeat Magnus at the Ironhold Gym.',
      'Defeat Champion Aster atop Champion Tower.',
      'Defeat League Master Kael beside the tower.',
      'Complete your Pokédex and explore the mythic rifts.',
    ]
    const body = this.openModal({
      title: 'JOURNAL', sub: `Main quest · ${st.quest.title}`, size: '',
      footer: `<span>${st.badges.length}/8 badges · ${st.caught.size} caught</span><button class="btn btn-sm btn-ghost" id="q-close">Close</button>`,
    })
    const step = st.questStep
    body.innerHTML = `
      <div class="quest-list">
        <div class="quest-item main"><div class="quest-icon">◆</div><div class="quest-body"><div class="quest-title">${st.quest.title}</div><div class="quest-desc">${st.quest.desc}</div><div class="quest-reward">${st.quest.hint}</div></div></div>
        ${steps.map((s, i) => `<div class="quest-item" style="${i < step ? 'opacity:.6' : i === step ? 'border-color:rgba(244,201,93,.35)' : 'opacity:.5'}"><div class="quest-icon">${i < step ? '✓' : i === step ? '▶' : '○'}</div><div class="quest-body"><div class="quest-title">Step ${i + 1}: ${['A New Beginning','Field Research','The Bloom Badge','Frost & Flame','The Moonlit Trial','Tides & Sparks','The Bedrock Trial','The Iron Will','Champion of the Pokéverse','Master League','Pokéverse Legend'][i]}</div><div class="quest-desc">${s}</div></div></div>`).join('')}
      </div>
      <div class="section-title">Side Quests</div>
      <div class="quest-list">${SIDE_QUESTS.map(q => {
        const done = q.check(st), claimed = st.sideClaims.includes(q.id)
        return `<div class="quest-item"><div class="quest-icon">${claimed ? '✓' : done ? '!' : '◇'}</div><div class="quest-body"><div class="quest-title">${q.title}</div><div class="quest-desc">${q.desc}</div><div class="quest-reward">Reward: ₽${q.reward.money.toLocaleString()}${Object.entries(q.reward.items || {}).map(([id, n]) => ` · ${ITEMS[id]?.name} ×${n}`).join('')}</div></div>${claimed ? '<span class="quest-done">Claimed</span>' : done ? `<button class="quest-claim" data-claim="${q.id}">Claim</button>` : ''}</div>`
      }).join('')}</div>
      <div class="section-title">Badge Case</div>
      <div class="row" style="flex-wrap:wrap;gap:8px">${BADGES.map(b => `<div class="pill" style="display:flex;align-items:center;gap:6px;${st.badges.includes(b.id) ? `border-color:${b.color};color:${b.color}` : 'opacity:.45'}"><span style="font-size:15px">${b.icon}</span>${tr(b.name)}</div>`).join('')}</div>`
    localizeDom(body)
    $('q-close').onclick = () => this.closeModal()
    for (const b of body.querySelectorAll('[data-claim]')) b.onclick = () => {
      const q = SIDE_QUESTS.find(x => x.id === b.dataset.claim)
      if (!q || st.sideClaims.includes(q.id) || !q.check(st)) return
      st.sideClaims.push(q.id); st.money += q.reward.money
      for (const [id, n] of Object.entries(q.reward.items || {})) st.addItem(id, n)
      st.save(); this.app.audio.sfx('quest'); this.toast(`Quest complete: ${q.title}!`, '◆', 'gold')
      this.refreshHUD(); this.openQuests()
    }
  }

  // ---------------- SHOP ----------------
  openShop () {
    const st = this.state
    const stock = ['poke-ball','great-ball','ultra-ball','potion','super-potion','hyper-potion','full-restore','revive','evolution-stone','oran-berry']
    const body = this.openModal({
      title: 'POKÉ MART', sub: 'Everything a trainer needs', size: '',
      footer: `<span>Your money: <b class="money-line">₽${fmt(st.money)}</b></span><button class="btn btn-sm btn-ghost" id="shop-close">Leave</button>`,
    })
    const render = () => {
      $('modal-body').innerHTML = `<div class="section-title">Poké Balls & Medicine</div>${stock.map(id => {
        const it = ITEMS[id]
        return `<div class="shop-row"><span class="item-icon">${it.icon}</span><div class="item-body"><div class="item-name">${it.name} <span class="item-price">₽${fmt(it.price)}</span></div><div class="item-desc">${it.desc}</div></div><span class="pill">×${st.bag[id] || 0}</span><button class="shop-buy" data-buy="${id}">Buy</button><button class="shop-buy" data-buy5="${id}">×5</button></div>`
      }).join('')}`
      for (const b of $('modal-body').querySelectorAll('[data-buy]')) b.onclick = () => this.buy(b.dataset.buy, 1, render)
      for (const b of $('modal-body').querySelectorAll('[data-buy5]')) b.onclick = () => this.buy(b.dataset.buy5, 5, render)
      localizeDom($('modal-body'))
    }
    render()
    $('shop-close').onclick = () => this.closeModal()
  }

  buy (id, n, render) {
    const it = ITEMS[id], st = this.state
    const cost = it.price * n
    if (st.money < cost) { this.app.audio.sfx('error'); return this.toast('Not enough money.', '₽', 'red') }
    st.money -= cost; st.addItem(id, n); st.save(); this.app.audio.sfx('select')
    this.toast(`Bought ${n}× ${it.name} for ₽${fmt(cost)}`, it.icon, 'gold')
    if ($('modal-foot')) $('modal-foot').querySelector('.money-line').textContent = '₽' + fmt(st.money)
    this.refreshHUD(); render()
  }

  // ---------------- SETTINGS ----------------
  openSettings () {
    const st = this.state
    const s = st.settings
    const controls = s.controls || DEFAULT_CONTROLS
    const group = (g) => `
      <div class="control-group-title">${tr(g.title)}</div>
      <div class="controls-grid">${g.actions.map(action => `
        <button class="control-row rebind" data-rebind="${action}">
          <span class="control-name">${t('control.' + action)}</span>
          <kbd>${bindingText(controls[action])}</kbd>
        </button>`).join('')}</div>`
    const body = this.openModal({
      title: t('settings.title'), sub: `${st.name} · ${tr(`${niceTime(st.playTime)} played`)}`, size: 'narrow',
      footer: `<span>${tr(`World seed ${st.seed}`)}</span><div class="row"><button class="btn btn-sm btn-danger" id="reset-save">${t('settings.reset')}</button><button class="btn btn-sm btn-ghost" id="set-close">${t('settings.resume')}</button></div>`,
    })
    body.innerHTML = `
      <div class="settings-row"><div><div class="settings-label">${t('settings.language')}</div><div class="settings-desc">${t('settings.languageDesc')}</div></div><div class="lang-picker" id="set-lang"><button data-setlang="en" class="${getLang() === 'en' ? 'active' : ''}">English</button><button data-setlang="fr" class="${getLang() === 'fr' ? 'active' : ''}">Français</button></div></div>
      <div class="settings-row"><div><div class="settings-label">${t('settings.saveFile')}</div><div class="settings-desc">${t('settings.saveFileDesc')}</div></div><div class="row"><span class="pill">${t('title.file')} ${st.slot || 1}</span><button class="btn btn-sm btn-ghost" id="set-switch-slot">${t('settings.switchSave')}</button></div></div>
      <div class="settings-row"><div><div class="settings-label">${t('settings.replayIntro')}</div><div class="settings-desc">${t('settings.controlsDesc')}</div></div><button class="btn btn-sm btn-ghost" id="set-replay-intro">${t('settings.replayIntro')}</button></div>
      <div class="settings-row"><div><div class="settings-label">${t('settings.music')}</div><div class="settings-desc">${t('settings.musicDesc')}</div></div><input type="range" id="set-music" min="0" max="1" step=".05" value="${s.music}" /></div>
      <div class="settings-row"><div><div class="settings-label">${t('settings.sfx')}</div><div class="settings-desc">${t('settings.sfxDesc')}</div></div><input type="range" id="set-sfx" min="0" max="1" step=".05" value="${s.sfx}" /></div>
      <div class="settings-row"><div><div class="settings-label">${t('settings.mute')}</div><div class="settings-desc">${t('settings.muteDesc')}</div></div><button class="switch ${s.muted ? 'on' : ''}" id="set-mute"></button></div>
      <div class="settings-row"><div><div class="settings-label">${t('settings.weather')}</div><div class="settings-desc">${t('settings.weatherDesc')}</div></div><button class="switch ${s.weather !== false ? 'on' : ''}" id="set-weather"></button></div>
      <div class="section-title">${t('settings.controls')}</div>
      <div class="settings-desc" style="margin:-4px 0 6px">${t('settings.controlsDesc')}</div>
      <div id="control-groups">${CONTROL_GROUPS.map(group).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn btn-sm btn-ghost" id="set-reset-controls">${t('settings.resetControls')}</button></div>
      <div class="section-title">${t('settings.stats')}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill">${fmt(st.stats.wins)} ${t('settings.wins')}</span><span class="pill">${fmt(st.stats.catches)} ${t('settings.catches')}</span><span class="pill">${fmt(st.stats.evolutions)} ${t('settings.evolutions')}</span><span class="pill">${fmt(st.stats.chests)} ${t('settings.chests')}</span><span class="pill">${fmt(st.stats.shinies)} ${t('settings.shiny')}</span><span class="pill">${fmt(st.stats.steps)} ${t('settings.steps')}</span></div>
      <div class="section-title">${t('settings.about')}</div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6">${t('settings.aboutText')}</div>`
    localizeDom(body)
    const rebind = (action) => {
      const app = this.app
      app.rebinding = true
      const buttons = body.querySelectorAll('[data-rebind]')
      const btn = body.querySelector(`[data-rebind="${action}"]`)
      const old = btn.innerHTML
      btn.classList.add('listening')
      btn.innerHTML = `<span class="control-name">${t('control.' + action)}</span><kbd>${t('settings.pressKey')}</kbd>`
      const done = (e) => {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        window.removeEventListener('keydown', onKey, true)
        app.rebinding = false
        btn.classList.remove('listening')
        if (e && e.key !== 'Escape') {
          const key = e.key.toLowerCase()
          const next = cloneControlsForRebind(controls, action, key)
          st.settings.controls = next
          st.save()
          this.refreshControlHints()
          this.app.audio.sfx('select')
          this.openSettings()
        } else {
          btn.innerHTML = old
        }
      }
      const onKey = (e) => done(e)
      window.addEventListener('keydown', onKey, true)
      btn.onclick = (e) => { e.stopPropagation() }
    }
    for (const b of body.querySelectorAll('[data-rebind]')) b.onclick = (e) => { e.preventDefault(); rebind(b.dataset.rebind) }
    for (const b of body.querySelectorAll('[data-setlang]')) b.onclick = () => {
      setLang(b.dataset.setlang)
      st.save()
      this.refreshControlHints()
      this.refreshHUD()
      this.openSettings()
      this.toast(t('lang.changed'), '🌐')
    }
    $('set-switch-slot').onclick = async () => {
      if (await this.confirm(t('settings.switchSave'), t('save.switch'), t('settings.switchSave'))) {
        st.save()
        location.reload()
      }
    }
    $('set-replay-intro').onclick = async () => {
      this.closeModal()
      await sleep(120)
      await this.playIntro(st.name)
    }
    $('set-music').oninput = (e) => { s.music = +e.target.value; this.app.audio.setVolumes(s.music, s.sfx, s.muted); st.save() }
    $('set-sfx').oninput = (e) => { s.sfx = +e.target.value; this.app.audio.setVolumes(s.music, s.sfx, s.muted); st.save() }
    $('set-mute').onclick = (e) => { s.muted = !s.muted; e.target.classList.toggle('on', s.muted); this.app.audio.setVolumes(s.music, s.sfx, s.muted); st.save() }
    $('set-weather').onclick = (e) => { s.weather = s.weather === false; e.target.classList.toggle('on', s.weather !== false); st.save() }
    $('set-reset-controls').onclick = () => {
      resetControls(st)
      this.refreshControlHints()
      this.app.audio.sfx('select')
      this.openSettings()
    }
    $('set-close').onclick = () => this.closeModal()
    $('reset-save').onclick = async () => {
      if (await this.confirm(t('settings.reset'), t('save.delete'), t('settings.reset'))) {
        st.wipe(); location.reload()
      }
    }
  }

  confirm (title, text, yes = 'Yes, reset') {
    return new Promise(resolve => {
      this.openModal({
        title, sub: text, size: 'narrow',
        body: `<div class="empty-note">This cannot be undone.</div>`,
        footer: `<button class="btn btn-sm btn-ghost" id="cf-no">Cancel</button><button class="btn btn-sm btn-danger" id="cf-yes">${yes}</button>`,
      })
      localizeDom(this.modalLayer)
      $('cf-no').onclick = () => { this.closeModal(); resolve(false) }
      $('cf-yes').onclick = () => { this.closeModal(); resolve(true) }
    })
  }

  // ---------------- DIALOGUE ----------------
  showDialogue ({ name, text, choices = [], colors = null, onClose = null }) {
    name = tr(name)
    text = tr(text)
    choices = choices.map(c => ({ ...c, label: tr(c.label) }))
    this.dialogueEl.classList.remove('hidden')
    $('chat-panel')?.classList.add('dimmed')
    $('dlg-name').textContent = name
    $('dlg-text').textContent = ''
    const portrait = $('dlg-portrait')
    portrait.innerHTML = '<canvas width="74" height="82"></canvas>'
    const ctx = portrait.querySelector('canvas').getContext('2d')
    ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(0, 0, 74, 82)
    drawTrainer(ctx, 37, 78, 'down', 0, colors || { shirt:'#8b6fd6', hair:'#e8e8ee', skin:'#f0c8a0' }, { scale: 2.4 })
    let i = 0
    const chars = [...text]
    clearInterval(this._dlgTimer)
    this._dlgTimer = setInterval(() => {
      if (i >= chars.length) { clearInterval(this._dlgTimer); return }
      $('dlg-text').textContent += chars[i++]
    }, 16)
    const choicesEl = $('dlg-choices')
    choicesEl.innerHTML = ''
    const addChoices = () => {
      choicesEl.innerHTML = ''
      for (const c of choices) {
        const b = el('button', 'dlg-choice ' + (c.primary ? 'primary' : ''), c.label)
        b.onclick = () => { this.app.audio.sfx('select'); this.hideDialogue(); c.action?.() }
        choicesEl.appendChild(b)
      }
      if (!choices.length) {
        const b = el('button', 'dlg-choice', t('modal.continue'))
        b.onclick = () => { this.hideDialogue(); onClose?.() }
        choicesEl.appendChild(b)
      }
    }
    $('dlg-text').onclick = () => { $('dlg-text').textContent = text; clearInterval(this._dlgTimer); addChoices() }
    setTimeout(() => { if (this.dialogueEl.classList.contains('hidden')) return; if ($('dlg-text').textContent.length < text.length) { $('dlg-text').textContent = text; clearInterval(this._dlgTimer) } addChoices() }, Math.min(1600, 400 + chars.length * 16))
    this.app.dialogueOpen = true
    this.currentDialogue = { onClose }
  }

  hideDialogue () {
    clearInterval(this._dlgTimer)
    this.dialogueEl.classList.add('hidden')
    $('chat-panel')?.classList.remove('dimmed')
    this.app.dialogueOpen = false
    const cb = this.currentDialogue?.onClose
    this.currentDialogue = null
    if (typeof cb === 'function') cb()
  }

  // ---------------- EVOLUTION ----------------
  askEvolution (mon, opts) {
    return new Promise(resolve => {
      const body = this.openModal({
        title: 'EVOLUTION!', sub: `${mon.nickname || DEX_BY_ID.get(mon.id).name} is ready to evolve. Choose its path.`, size: 'narrow',
        body: `<div class="starter-picker">${opts.map(o => { const sp = DEX_BY_ID.get(o.id); return `<button class="starter-card" data-evo-pick="${o.id}"><img src="assets/sprites/${o.id}.png" alt=""><div class="starter-name">${sp.name}</div>${sp.t.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${t}</span>`).join(' ')}<div class="starter-desc">${sp.cat}</div></button>` }).join('')}</div>`,
        footer: `<span>This choice is permanent.</span><button class="btn btn-sm btn-ghost" id="evo-cancel">Not now</button>`,
      })
      localizeDom(this.modalLayer)
      for (const b of body.querySelectorAll('[data-evo-pick]')) b.onclick = () => { const id = +b.dataset.evoPick; this.closeModal(); resolve(id) }
      $('evo-cancel').onclick = () => { this.closeModal(); resolve(null) }
    })
  }

  async evolutionAnimation (mon, targetId) {
    const oldSp = DEX_BY_ID.get(mon.id)
    const newSp = DEX_BY_ID.get(targetId)
    const ov = el('div', 'evo-overlay', `<div class="evo-stage"><img class="evo-sprite" id="evo-img" src="assets/sprites/${mon.id}.png" alt=""><div class="evo-text" id="evo-text">${tr("What's happening?")}</div><div class="evo-sub" id="evo-sub">${tr(`${oldSp.name} is evolving…`)}</div></div>`)
    document.body.appendChild(ov)
    this.app.audio.sfx('evolve')
    await new Promise(r => setTimeout(r, 1600))
    const info = evolveMon(mon, targetId)
    mon.hp = maxHp(mon)
    this.state.stats.evolutions = (this.state.stats.evolutions || 0) + 1
    this.state.recordCaught(targetId, mon)
    const img = document.getElementById('evo-img')
    if (img) img.src = `assets/sprites/${targetId}.png`
    const txt = document.getElementById('evo-text'); if (txt) txt.textContent = tr('Congratulations!')
    const sub = document.getElementById('evo-sub'); if (sub) sub.textContent = tr(`${oldSp.name} evolved into ${newSp.name}!`)
    this.app.audio.sfx('level')
    this.state.save(); this.refreshHUD()
    await new Promise(r => setTimeout(r, 2200))
    ov.remove()
    this.toast(`${newSp.name} joined your Pokédex!`, '✦', 'gold')
    return info
  }

  // ---------------- CELEBRATIONS ----------------
  badgeCelebration (badge) {
    const ov = el('div', 'evo-overlay', `<div class="evo-stage"><div style="font-size:80px;filter:drop-shadow(0 0 30px ${badge.color})">${badge.icon}</div><div class="evo-text" style="color:${badge.color}">${tr(`${badge.name} earned!`)}</div><div class="evo-sub">${badge.leader} · ${tr(badge.town)}</div></div>`)
    ov.style.background = `radial-gradient(circle, ${hexAlpha(badge.color, .3)}, rgba(4,6,14,.94))`
    ov.style.pointerEvents = 'none'
    document.body.appendChild(ov)
    this.app.audio.sfx('badge')
    this.toast(`${badge.name} earned!`, badge.icon, 'gold')
    setTimeout(() => { ov.style.transition = 'opacity .5s'; ov.style.opacity = '0'; setTimeout(() => ov.remove(), 520) }, 2600)
  }

  championCelebration () {
    const st = this.state
    this.openModal({
      title: 'POKÉVERSE CHAMPION', sub: 'You have conquered the eight Gyms', size: 'narrow',
      body: `<div class="center"><div style="font-size:80px;filter:drop-shadow(0 0 40px #f4c95d)">🏆</div><h2 style="margin:8px 0 4px;color:var(--gold)">${st.name} is the Champion!</h2><p style="color:var(--muted);font-size:12px;line-height:1.6">Eight badges. 1,025 species waiting in the wild. One final challenger remains: League Master Kael waits beside the tower.<br>Your team, your story, your legend.</p><div class="row" style="justify-content:center;flex-wrap:wrap;gap:6px;margin-top:12px"><span class="pill">${st.caught.size} caught</span><span class="pill">${st.stats.wins} wins</span><span class="pill">${niceTime(st.playTime)} played</span></div></div>`,
      footer: `<span>Keep exploring — the Master League awaits.</span><button class="btn btn-sm btn-primary" id="champ-close">Continue</button>`,
    })
    localizeDom(this.modalLayer)
    $('champ-close').onclick = () => this.closeModal()
  }

  masterCelebration () {
    const st = this.state
    this.openModal({
      title: 'LEAGUE MASTER', sub: 'The final wall has fallen', size: 'narrow',
      body: `<div class="center"><div style="font-size:80px;filter:drop-shadow(0 0 40px #7ee0c8)">👑</div><h2 style="margin:8px 0 4px;color:#7ee0c8">${st.name} is the League Master!</h2><p style="color:var(--muted);font-size:12px;line-height:1.6">Eight Gyms, the Champion, and the Master League — all conquered. Every region, every species, every story is yours to explore.<br>The Pokéverse will remember your name.</p><div class="row" style="justify-content:center;flex-wrap:wrap;gap:6px;margin-top:12px"><span class="pill">${st.badges.length} badges</span><span class="pill">${st.caught.size} caught</span><span class="pill">${st.stats.wins} wins</span><span class="pill">${niceTime(st.playTime)} played</span></div></div>`,
      footer: `<span>New Game+? Your save file keeps everything.</span><button class="btn btn-sm btn-primary" id="master-close">Continue</button>`,
    })
    localizeDom(this.modalLayer)
    $('master-close').onclick = () => this.closeModal()
  }

  dexNew (id) {
    const sp = DEX_BY_ID.get(id)
    if (!sp) return
    this.toast(`New Pokédex entry: #${String(id).padStart(4, '0')} ${sp.name}!`, '▤', 'gold')
  }

  // ---------------- INTRO ----------------
  playIntro (name = 'Trainer') {
    return new Promise(resolve => {
      const screen = $('intro')
      if (!screen) return resolve()
      const textEl = $('intro-text'), dotsEl = $('intro-dots'), nextBtn = $('intro-next'), skipBtn = $('intro-skip')
      const slides = [t('intro.slide1'), t('intro.slide2'), t('intro.slide3'), t('intro.slide4', { name })]
      let index = 0, timer = null, typing = false, full = '', done = false
      screen.classList.remove('hidden')
      requestAnimationFrame(() => screen.classList.add('on'))
      this.app.audio.sfx('open')
      const paintDots = () => { dotsEl.innerHTML = slides.map((_, i) => `<i class="${i === index ? 'on' : ''}"></i>`).join('') }
      const type = () => {
        full = slides[index]
        textEl.textContent = ''
        typing = true
        let i = 0
        clearInterval(timer)
        timer = setInterval(() => {
          textEl.textContent = full.slice(0, ++i)
          if (i >= full.length) { clearInterval(timer); typing = false }
        }, 22)
        paintDots()
        nextBtn.textContent = index === slides.length - 1 ? t('intro.start') : t('intro.next')
        skipBtn.textContent = t('intro.skip')
      }
      const finish = () => {
        if (done) return
        done = true
        clearInterval(timer)
        window.removeEventListener('keydown', onKey)
        screen.classList.remove('on')
        setTimeout(() => { screen.classList.add('hidden'); resolve() }, 420)
      }
      const next = () => {
        if (typing) { clearInterval(timer); textEl.textContent = full; typing = false; return }
        if (index < slides.length - 1) { index++; this.app.audio.sfx('click'); type() }
        else finish()
      }
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); finish() }
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next() }
      }
      nextBtn.onclick = next
      skipBtn.onclick = finish
      textEl.onclick = next
      window.addEventListener('keydown', onKey)
      type()
    })
  }

  // ---------------- STARTER ----------------
  askStarter () {
    return new Promise(resolve => {
      const picks = [1, 4, 7]
      let selected = 1
      const descs = {
        1: 'A calm, sturdy partner. Grass / Poison — grows into a blooming powerhouse.',
        4: 'Bold and fiery. Fire — a scrappy attacker with devastating special moves.',
        7: 'Playful and dependable. Water — balanced stats and a shell built for battle.',
      }
      this.openModal({
        title: 'CHOOSE YOUR PARTNER', sub: 'Every legend starts with a first friend', size: '',
        body: `<div class="starter-picker" id="starter-picker">${picks.map(id => {
          const sp = DEX_BY_ID.get(id)
          return `<button class="starter-card ${id === selected ? 'selected' : ''}" data-starter="${id}"><span class="starter-check">✓</span><img src="assets/sprites/${id}.png" alt=""><div class="starter-name">${sp.name}</div><div>${sp.t.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${t}</span>`).join(' ')}</div><div class="starter-desc">${descs[id]}</div><div class="starter-stats">${sp.s.map(v => `<i class="${v >= 60 ? 'on' : ''}"></i>`).join('')}</div></button>`
        }).join('')}</div>`,
        footer: `<span>You can catch all 1,025 species in the wild.</span><button class="btn btn-primary" id="starter-go">${t('starter.go')}</button>`,
      })
      localizeDom(this.modalLayer)
      const sel = (id) => {
        selected = id
        for (const b of document.querySelectorAll('[data-starter]')) b.classList.toggle('selected', +b.dataset.starter === id)
        this.app.audio.sfx('select')
      }
      for (const b of document.querySelectorAll('[data-starter]')) b.onclick = () => sel(+b.dataset.starter)
      $('starter-go').onclick = () => { this.closeModal(); resolve(selected) }
    })
  }
}

import { SIDE_QUESTS } from '../core/state.js'
