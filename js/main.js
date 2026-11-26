// Pokémon Templier — bootstrap, intro, menus and game flow.
import {
  BADGES, LEADERS, LOCATIONS, SPECIES, STARTERS, ONLINE_RANKS, AI_NAMES,
  TYPE_COLORS, TYPE_ICONS
} from './data.js'
import {
  G, newGame, loadSave, persist, resetSave, createMonster, toast, escapeHTML,
  objective, rankInfo, nextRank, healTeam, maxTeamLevel, formatPlaytime,
  saveTimeAgo, addFriend, locationUnlocked, statsOf, displaySpecies
} from './state.js'
import { World } from './world.js'
import { startBattle } from './battle.js'
import {
  Dialog, openModal, closeModal, showWorldMap, showPlayerCard, showTeam, showBag,
  showFriends, showOnline, showSettings, showHelp, paintThumbs
} from './ui.js'
import { professorSVG, playerAvatarSVG, drawCreature } from './art.js'
import { setSoundEnabled, initAudioOnGesture, sfx } from './audio.js'

const $ = sel => document.querySelector(sel)
const $$ = sel => [...document.querySelectorAll(sel)]

let world = null
let titleParticlesStarted = false
let introStep = 0
let introProfile = { gender: 'garcon', age: 14, name: '' }
let introStarter = 'sablion'
let gameActive = false

const NON_LEGEND_SPECIES = Object.keys(SPECIES).filter(id => !['latias', 'latios', 'rayquaza'].includes(id))
const TRAINER_LOOKS = [
  { skin: '#e8c39e', hair: '#3a2418', style: 'short', outfit: '#2f5f9e', accent: '#f0c96b' },
  { skin: '#d9a47a', hair: '#6b3f2a', style: 'long', outfit: '#8a4a6a', accent: '#f4a6c8' },
  { skin: '#c98a5a', hair: '#2b2118', style: 'spiky', outfit: '#3f8a4a', accent: '#55b85f' },
  { skin: '#8a5a3b', hair: '#241b45', style: 'hood', outfit: '#3b2f5e', accent: '#b9a8e8' },
  { skin: '#e0b48a', hair: '#1d5c9e', style: 'wavy', outfit: '#2a6f9e', accent: '#8ecae6' }
]

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function showScreen(id) {
  $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === id))
}

function setGamePaused(paused) {
  gameActive = !paused
  G.paused = paused
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------
function refreshTitle() {
  const save = loadSave()
  const continueBtn = $('#btn-continue')
  const saveLine = $('#title-save')
  if (save) {
    continueBtn.disabled = false
    continueBtn.textContent = `Continuer · ${save.profile.name}`
    saveLine.textContent = `${save.profile.name} · ${save.badges.length}/8 badges · ${saveTimeAgo(save.lastSaved)}`
  } else {
    continueBtn.disabled = true
    continueBtn.textContent = 'Continuer'
    saveLine.textContent = 'Aucune sauvegarde détectée'
  }
}

function maintenanceCountdown() {
  const now = new Date()
  let target = new Date(now.getFullYear(), 11, 9, 10, 0, 0)
  if (target < now) target = new Date(now.getFullYear() + 1, 11, 9, 10, 0, 0)
  const diff = Math.max(0, target - now)
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000)
  }
}

function showTitleOnline() {
  const c = maintenanceCountdown()
  openModal({
    title: 'Poke Online MMO', icon: '🌐', className: 'online-modal',
    content: `<div class="maintenance-banner"><span class="maint-dot"></span><div><strong>Multijoueur en maintenance</strong><small>Réouverture prévue le 9 décembre · ${c.d}j ${String(c.h).padStart(2, '0')}h ${String(c.m).padStart(2, '0')}m</small></div><span class="maint-lock">🔧</span></div>
      <div class="locked-feature"><div class="lock-orb">🌐</div><h3>Le monde se prépare</h3>
        <p>Poke Online MMO ouvrira ses portes le <strong>9 décembre</strong>. Les ligues, le chat et les échanges seront alors disponibles. En attendant, tu peux commencer l’aventure hors-ligne : les combats de Ligue utilisent déjà une IA de secours.</p></div>
      <div class="help-tip"><strong>Professeur Sable :</strong> « Le sable n’attend pas. Commence ton histoire, et le online te rejoindra. »</div>`
  })
}

function toggleSound() {
  const save = G.save
  const current = save ? save.settings.sound : true
  const next = !current
  if (save) {
    save.settings.sound = next
    persist()
  }
  setSoundEnabled(next)
  updateSoundButton(next)
  if (next) sfx('click')
}

function updateSoundButton(enabled) {
  $$('#btn-sound').forEach(btn => {
    btn.textContent = enabled ? '🔊' : '🔇'
    btn.setAttribute('aria-label', enabled ? 'Couper le son' : 'Activer le son')
  })
}

// ---------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------
const INTRO_STEPS = [
  {
    eyebrow: 'Le monde de Templier',
    speaker: 'Professeur Sable',
    role: 'Chercheur de sable',
    text: `<p>Bienvenue, jeune dresseur. Je suis le <span class="hl">Professeur Sable</span>, et voici Templier : huit villages, huit arènes, deux îles, et un serment plus vieux que les dunes.</p>
      <p>Il y a mille ans, Templier n’était qu’une mer de sable. Les premiers colons ont planté une graine au bord d’une oasis. Autour de cette graine sont nées Sablonville, puis Oubar, puis les autres villages.</p>
      <div class="lore-quote">« Avant les villes, il n’y avait que du sable. Et dans le sable, un rêve. »</div>
      <p>Ce rêve, c’est Poke Online MMO : un réseau où les dresseurs du monde entier partagent leurs combats. Il est en maintenance jusqu’au <span class="hl">9 décembre</span>, mais l’aventure locale, elle, commence maintenant.</p>`
  },
  {
    eyebrow: 'Le serment des arènes',
    speaker: 'Professeur Sable',
    role: 'Chercheur de sable',
    text: `<p>Huit villages, huit Champions, huit badges. Chaque badge est une promesse : celle de protéger les routes, les Pokémon et les gens qui les empruntent.</p>
      <p>À <span class="hl">Oubar</span>, tu croiseras Blue et Red. Ils entraînent les dresseurs sans relâche. Blue teste ta stratégie ; Red teste ta volonté. N’aie pas peur d’y retourner : l’entraînement ne trahit jamais.</p>
      <p>Au <span class="hl">quatrième badge</span>, ton Bracelet Templier s’éveillera. Il réveillera aussi Latias, Latios et Rayquaza, gardiens du Sanctuaire des Vents.</p>
      <p>Les deux îles ? Elles restent fermées jusqu’à la fin du jeu. L’Île des Épreuves cache huit arènes supplémentaires. L’Île de la Ligue attend le Maître.</p>`
  }
]

function renderIntroArt() {
  const art = $('#intro-art')
  if (!art) return
  if (introStep === 2) art.innerHTML = playerAvatarSVG(introProfile.gender, 280)
  else art.innerHTML = professorSVG()
}

function typeRow(types) {
  return `<div class="type-row">${types.map(t => `<span class="type-chip small" style="--tc:${TYPE_COLORS[t] || '#a8a29e'}">${TYPE_ICONS[t] || ''} ${escapeHTML(t)}</span>`).join('')}</div>`
}

function renderIntro() {
  const total = 5
  $('#intro-step').textContent = String(Math.min(introStep + 1, total)).padStart(2, '0')
  renderIntroArt()
  const form = $('#intro-form')
  const actions = $('#intro-actions')
  form.innerHTML = ''
  actions.innerHTML = ''

  if (introStep < 2) {
    const step = INTRO_STEPS[introStep]
    $('#intro-eyebrow').textContent = step.eyebrow
    $('#intro-speaker').textContent = step.speaker
    $('#intro-role').textContent = step.role
    $('#intro-text').innerHTML = step.text
    actions.innerHTML = `<button class="btn gold" id="intro-next">Écouter la suite ▸</button>`
    $('#intro-next').addEventListener('click', () => { sfx('click'); introStep++; renderIntro() })
    return
  }

  if (introStep === 2) {
    $('#intro-eyebrow').textContent = 'Ton profil de dresseur'
    $('#intro-speaker').textContent = 'Professeur Sable'
    $('#intro-role').textContent = 'Avant le grand départ'
    $('#intro-text').innerHTML = `<p>Avant de te confier un Pokémon, j’ai besoin de trois choses. Rien de bien compliqué : qui tu es, quel âge tu as, et le nom que le monde retiendra.</p>`
    form.innerHTML = `<div class="form-grid">
      <div class="form-row">
        <label>Sexe</label>
        <div class="gender-row">
          <button class="gender-card ${introProfile.gender === 'garcon' ? 'active' : ''}" data-gender="garcon"><span class="g-ico">🧢</span><span><strong>Garçon</strong><small>Dresseur</small></span></button>
          <button class="gender-card ${introProfile.gender === 'fille' ? 'active' : ''}" data-gender="fille"><span class="g-ico">🎀</span><span><strong>Fille</strong><small>Dresseuse</small></span></button>
        </div>
      </div>
      <div class="form-row">
        <label for="intro-age">Âge</label>
        <input id="intro-age" type="number" min="10" max="99" inputmode="numeric" value="${introProfile.age}" placeholder="14">
        <small>Entre 10 et 99 ans. Le désert ne juge pas, mais il compte.</small>
      </div>
      <div class="form-row">
        <label for="intro-name">Nom d’utilisateur</label>
        <input id="intro-name" type="text" maxlength="16" autocomplete="nickname" value="${escapeHTML(introProfile.name)}" placeholder="Ex. SableVif">
        <small>2 à 16 caractères. Ce pseudo apparaîtra sur ta carte de dresseur et dans Poke Online MMO.</small>
      </div>
    </div>`
    form.querySelectorAll('[data-gender]').forEach(btn => btn.addEventListener('click', () => {
      introProfile.gender = btn.dataset.gender
      renderIntro()
    }))
    const nameInput = $('#intro-name')
    const ageInput = $('#intro-age')
    nameInput?.addEventListener('input', ev => { introProfile.name = ev.target.value })
    ageInput?.addEventListener('input', ev => { introProfile.age = ev.target.value })
    actions.innerHTML = `<button class="btn ghost" id="intro-back">◂ Retour</button><button class="btn gold" id="intro-next">Choisir mon Pokémon ▸</button>`
    $('#intro-back').addEventListener('click', () => { introStep = 1; renderIntro() })
    $('#intro-next').addEventListener('click', () => {
      const age = Number($('#intro-age').value)
      const name = $('#intro-name').value.trim()
      if (!Number.isFinite(age) || age < 10 || age > 99) { toast('Choisis un âge entre 10 et 99 ans.', '⚠️'); $('#intro-age').focus(); return }
      if (name.length < 2) { toast('Ton nom doit contenir au moins 2 caractères.', '⚠️'); $('#intro-name').focus(); return }
      introProfile.age = Math.floor(age)
      introProfile.name = name
      sfx('click')
      introStep = 3
      renderIntro()
    })
    return
  }

  if (introStep === 3) {
    $('#intro-eyebrow').textContent = 'Ton premier compagnon'
    $('#intro-speaker').textContent = 'Professeur Sable'
    $('#intro-role').textContent = 'Le choix du serment'
    $('#intro-text').innerHTML = `<p>Trois Pokémon sont nés dans mon laboratoire. Chacun porte une part de Templier. Choisis celui qui marchera à tes côtés.</p>`
    form.innerHTML = `<div class="starter-grid">${STARTERS.map(st => {
      const sp = SPECIES[st.id]
      return `<button class="starter-card ${introStarter === st.id ? 'active' : ''}" data-starter="${st.id}">
        <span class="starter-art"><canvas width="150" height="130" style="width:75px;height:65px" data-species="${st.id}"></canvas></span>
        <strong>${escapeHTML(st.label)}</strong>
        ${typeRow(sp.types)}
        <span class="starter-tag">${escapeHTML(st.tagline)}</span>
        <small>${escapeHTML(st.desc)}</small>
      </button>`
    }).join('')}</div>`
    paintThumbs(form)
    form.querySelectorAll('[data-starter]').forEach(btn => btn.addEventListener('click', () => {
      introStarter = btn.dataset.starter
      renderIntro()
    }))
    actions.innerHTML = `<button class="btn ghost" id="intro-back">◂ Retour</button><button class="btn gold" id="intro-next">Choisir ${escapeHTML(SPECIES[introStarter].name)} ▸</button>`
    $('#intro-back').addEventListener('click', () => { introStep = 2; renderIntro() })
    $('#intro-next').addEventListener('click', () => { sfx('click'); introStep = 4; renderIntro() })
    return
  }

  const starter = SPECIES[introStarter]
  $('#intro-eyebrow').textContent = 'Le serment commence'
  $('#intro-speaker').textContent = 'Professeur Sable'
  $('#intro-role').textContent = 'Prêt pour les sables'
  $('#intro-text').innerHTML = `<p>Tout est prêt. Voici la carte de dresseur qui t’accompagnera. Garde-la : elle se souviendra de tes badges, de tes amis et de chaque page de ton histoire.</p>`
  form.innerHTML = `<div class="intro-summary">
    <div class="summary-card"><span class="s-icon">${introProfile.gender === 'fille' ? '🎀' : '🧢'}</span><span><strong>${escapeHTML(introProfile.name)}</strong><small>${introProfile.age} ans · ${introProfile.gender === 'fille' ? 'Dresseuse' : 'Dresseur'}</small></span></div>
    <div class="summary-card"><span class="s-icon">🐾</span><span><strong>${escapeHTML(starter.name)}</strong><small>Niveau 5 · ${starter.types.join(' / ')}</small></span></div>
    <div class="summary-card"><span class="s-icon">⚜</span><span><strong>Sablonville</strong><small>Première étape : l’arène de Dame Néra</small></span></div>
  </div>`
  actions.innerHTML = `<button class="btn ghost" id="intro-back">◂ Retour</button><button class="btn gold big" id="intro-start">⚜ Commencer l’aventure</button>`
  $('#intro-back').addEventListener('click', () => { introStep = 3; renderIntro() })
  $('#intro-start').addEventListener('click', beginAdventure)
}

function startIntro() {
  introStep = 0
  introProfile = { gender: 'garcon', age: 14, name: '' }
  introStarter = 'sablion'
  showScreen('screen-intro')
  renderIntro()
}

function skipIntro() {
  if (introStep < 2) {
    introStep = 2
    renderIntro()
    return
  }
  if (introStep === 2) {
    if (!introProfile.name) introProfile.name = 'Dresseur'
    if (!introProfile.age) introProfile.age = 14
    introStep = 3
    renderIntro()
    return
  }
  if (introStep === 3) {
    introStep = 4
    renderIntro()
    return
  }
  beginAdventure()
}

async function beginAdventure() {
  const name = (introProfile.name || '').trim() || 'Dresseur'
  const age = Math.min(99, Math.max(10, Number(introProfile.age) || 14))
  const save = newGame({ name, age, gender: introProfile.gender }, introStarter)
  resetSave()
  G.save = save
  persist()
  setSoundEnabled(save.settings.sound)
  updateSoundButton(save.settings.sound)
  sfx('badge')
  await startGame({ firstTime: true })
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
async function startGame({ firstTime = false } = {}) {
  if (!G.save) return
  Dialog.close()
  closeModal()
  showScreen('screen-game')
  setGamePaused(false)
  setSoundEnabled(G.save.settings.sound)
  updateSoundButton(G.save.settings.sound)
  document.body.classList.toggle('reduced-motion', !!G.save.settings.reducedMotion)

  const canvas = $('#world')
  if (!world) {
    world = new World(canvas, {
      onMenu: handleMenuKey,
      onPrompt: updatePrompt,
      onHUD: updateHUD,
      onLocation: () => updateHUD(),
      onBanner: showLocationBanner
    })
    window.__travelTo = id => { world.travelTo(id); updateHUD() }
  }

  requestAnimationFrame(() => {
    world.resize()
    world.travelTo(G.save.location || 'sablonville', { spawn: 'bottom', force: true, banner: !firstTime })
    updateHUD()
  })

  if (firstTime) {
    setTimeout(async () => {
      await Dialog.show([
        {
          speaker: 'Professeur Sable', portrait: professorSVG(),
          text: `Bienvenue à Sablonville, ${G.save.profile.name}. Ton ${SPECIES[introStarter].name} a déjà l’air de te faire confiance.`
        },
        {
          speaker: 'Professeur Sable', portrait: professorSVG(),
          text: 'Commence par l’arène au nord. Dame Néra t’y attend. Et n’oublie pas : les herbes hautes cachent des Pokémon sauvages.'
        },
        {
          speaker: 'Professeur Sable', portrait: professorSVG(),
          text: 'Flèches ou ZQSD pour marcher, E pour interagir, M pour la carte. Sur mobile, utilise le pavé tactile. Le désert est à toi.'
        }
      ])
    }, 900)
  }
}

function updateHUD() {
  if (!G.save) return
  const loc = LOCATIONS[G.save.location] || LOCATIONS.sablonville
  $('#hud-region').textContent = loc.island ? 'Îles de Templier' : loc.legendary ? 'Lieux sacrés' : 'Région de Templier'
  $('#hud-loc').textContent = loc.name
  $('#hud-sub').textContent = loc.subtitle
  $('#hud-objective').textContent = objective()
  const badgeRoot = $('#hud-badges')
  badgeRoot.innerHTML = BADGES.map(b => {
    const earned = G.save.badges.includes(b.id)
    return `<span class="badge-medal ${earned ? 'earned' : 'locked'}" style="--badge:${b.color};width:22px;height:22px" title="${escapeHTML(b.name)}${earned ? ' — obtenu' : ' — verrouillé'}"><span class="badge-glyph" style="font-size:10px">${b.glyph}</span></span>`
  }).join('')
  renderTeamStrip()
}

function renderTeamStrip() {
  const strip = $('#team-strip')
  if (!strip || !G.save) return
  strip.innerHTML = G.save.team.map(mon => {
    const max = statsOf(mon).maxHp
    const pct = Math.max(0, Math.min(100, (mon.hp / max) * 100))
    const color = pct > 50 ? 'var(--green)' : pct > 22 ? '#f2c53d' : 'var(--red)'
    return `<div class="team-pip ${mon.hp <= 0 ? 'fainted' : ''}" title="${escapeHTML(displaySpecies(mon).name)} · Nv. ${mon.level} · ${mon.hp}/${max} PV">
      <span class="pip-lvl">${mon.level}</span>
      <canvas width="84" height="84" style="width:42px;height:42px" data-species="${mon.species}" data-mega="${mon.mega ? 1 : 0}"></canvas>
      <div class="pip-hp"><i style="width:${pct}%;background:${color}"></i></div>
    </div>`
  }).join('')
  paintThumbs(strip)
}

function updatePrompt(text, key = 'E') {
  const prompt = $('#world-prompt')
  const hint = $('#hint-text')
  const hintKey = $('.hint-key')
  if (!prompt) return
  if (text) {
    prompt.innerHTML = `<span class="key">${escapeHTML(key || 'E')}</span><span>${escapeHTML(text)}</span>`
    prompt.classList.add('show')
    if (hint) hint.textContent = text
    if (hintKey) hintKey.textContent = key || 'E'
  } else {
    prompt.classList.remove('show')
    prompt.innerHTML = ''
    if (hint) hint.textContent = 'Approche-toi d’un personnage ou d’un bâtiment.'
    if (hintKey) hintKey.textContent = 'E'
  }
}

function showLocationBanner(loc) {
  const banner = $('#location-banner')
  if (!banner) return
  banner.innerHTML = `<span class="lb-region">${loc.island ? 'Îles de Templier' : loc.legendary ? 'Lieu sacré' : 'Région de Templier'}</span><h2>${escapeHTML(loc.name)}</h2><p>${escapeHTML(loc.subtitle)}</p>`
  banner.classList.add('show')
  clearTimeout(showLocationBanner._timer)
  showLocationBanner._timer = setTimeout(() => banner.classList.remove('show'), 2800)
}

function travelTo(id) {
  if (!world) return
  world.travelTo(id)
  updateHUD()
}

function handleMenuKey(key) {
  if (!G.save || !gameActive) return
  if (key === 'm') { sfx('open'); showWorldMap(travelTo) }
  else if (key === 'c') { sfx('open'); showPlayerCard() }
  else if (key === 'f') { sfx('open'); showFriends(friendBattle) }
  else if (key === 'o') { sfx('open'); showOnline({ onLeagueBattle: leagueBattle }) }
  else if (key === 'b') { sfx('open'); showBag() }
  else if (key === 'h') { sfx('open'); showHelp() }
  else if (key === 'escape' || key === 'p') openPauseMenu()
}

function openPauseMenu() {
  if (!G.save) return
  sfx('open')
  const save = G.save
  const modal = openModal({
    title: 'Menu', icon: '☰', className: 'pause-modal',
    content: `<div class="pause-head">
        <div class="pause-avatar">${playerAvatarSVG(save.profile.gender, 92)}</div>
        <div><span class="eyebrow">${save.profile.gender === 'fille' ? 'Dresseuse' : 'Dresseur'}</span><h3>${escapeHTML(save.profile.name)}</h3>
        <p class="muted">${escapeHTML(objective())}</p></div>
      </div>
      <div class="pause-grid">
        <button class="pause-action" data-act="resume"><span>▶</span><strong>Reprendre</strong><small>Retour au monde</small></button>
        <button class="pause-action" data-act="team"><span>🐾</span><strong>Équipe</strong><small>${save.team.length} Pokémon</small></button>
        <button class="pause-action" data-act="bag"><span>🎒</span><strong>Sac</strong><small>${save.money.toLocaleString('fr-FR')} ₽</small></button>
        <button class="pause-action" data-act="map"><span>🗺</span><strong>Carte</strong><small>${save.badges.length}/8 badges</small></button>
        <button class="pause-action" data-act="friends"><span>🤝</span><strong>Amis</strong><small>${save.friends.length} amis</small></button>
        <button class="pause-action" data-act="online"><span>🌐</span><strong>Online</strong><small>${rankInfo().name}</small></button>
        <button class="pause-action" data-act="help"><span>❔</span><strong>Aide</strong><small>Commandes</small></button>
        <button class="pause-action" data-act="settings"><span>⚙️</span><strong>Options</strong><small>Son & sauvegarde</small></button>
      </div>
      <div class="pause-foot">
        <button class="btn" data-act="save">💾 Sauvegarder</button>
        <button class="btn danger" data-act="title">🏰 Retour au titre</button>
      </div>
      <p class="save-note">Dernière sauvegarde : ${saveTimeAgo(save.lastSaved)} · Temps de jeu : ${formatPlaytime(save.playtime)}</p>`,
    onMount: wrap => {
      wrap.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
        const act = btn.dataset.act
        if (act === 'resume') { sfx('close'); closeModal() }
        else if (act === 'team') { closeModal(); setTimeout(showTeam, 150) }
        else if (act === 'bag') { closeModal(); setTimeout(showBag, 150) }
        else if (act === 'map') { closeModal(); setTimeout(() => showWorldMap(travelTo), 150) }
        else if (act === 'friends') { closeModal(); setTimeout(() => showFriends(friendBattle), 150) }
        else if (act === 'online') { closeModal(); setTimeout(() => showOnline({ onLeagueBattle: leagueBattle }), 150) }
        else if (act === 'help') { closeModal(); setTimeout(showHelp, 150) }
        else if (act === 'settings') { closeModal(); setTimeout(() => showSettings({ onReset: resetGame, onSoundChange: s => { updateSoundButton(s); document.body.classList.toggle('reduced-motion', !!G.save.settings.reducedMotion) } }), 150) }
        else if (act === 'save') { persist(false); updatePauseNote(wrap) }
        else if (act === 'title') returnToTitle()
      }))
    }
  })
  return modal
}

function updatePauseNote(wrap) {
  const note = wrap.querySelector('.save-note')
  if (note && G.save) note.textContent = `Dernière sauvegarde : ${saveTimeAgo(G.save.lastSaved)} · Temps de jeu : ${formatPlaytime(G.save.playtime)}`
}

function returnToTitle() {
  closeModal()
  Dialog.close()
  if (G.save) persist()
  setGamePaused(true)
  showScreen('screen-title')
  refreshTitle()
}

async function resetGame() {
  resetSave()
  G.save = null
  closeModal()
  Dialog.close()
  setGamePaused(true)
  showScreen('screen-title')
  refreshTitle()
  toast('Sauvegarde effacée. Une nouvelle histoire peut commencer.', '⚜')
}

// ---------------------------------------------------------------------------
// Friend and online battles
// ---------------------------------------------------------------------------
function currentTheme() {
  return world?.locId || 'sand'
}

async function friendBattle(friend) {
  if (!G.save || !friend) return
  const level = Math.max(8, maxTeamLevel())
  let team = []
  const leader = friend.leaderId && LEADERS[friend.leaderId]
  if (leader) {
    team = leader.team.map(m => createMonster(m.species, Math.max(level - 2, m.level)))
  } else {
    const size = 3
    for (let i = 0; i < size; i++) {
      const species = NON_LEGEND_SPECIES[Math.floor(Math.random() * NON_LEGEND_SPECIES.length)]
      team.push(createMonster(species, Math.max(5, level + (i === size - 1 ? 1 : 0))))
    }
  }
  const res = await startBattle({
    kind: 'trainer',
    trainer: {
      name: friend.name,
      title: friend.role || 'Combat amical',
      color: friend.color || '#f0c96b',
      avatar: friend.avatar || TRAINER_LOOKS[friend.name.length % TRAINER_LOOKS.length]
    },
    team,
    theme: currentTheme(),
    palette: world?.loc?.palette || LOCATIONS.sablonville.palette,
    rewardMoney: 300 + level * 12,
    canCatch: false
  })
  if (!res) return
  if (res.outcome === 'win') {
    friend.bond = Math.min(5, (friend.bond || 1) + 1)
    toast(`Tu as battu ${friend.name}. Votre amitié grandit !`, '🤝')
  }
  persist()
  updateHUD()
}

async function leagueBattle() {
  if (!G.save) return
  const rank = rankInfo()
  const level = Math.max(8, rank.level)
  const size = Math.max(1, rank.teamSize)
  const team = []
  for (let i = 0; i < size; i++) {
    const species = NON_LEGEND_SPECIES[Math.floor(Math.random() * NON_LEGEND_SPECIES.length)]
    team.push(createMonster(species, Math.max(5, level + (i === size - 1 ? 1 : 0))))
  }
  const name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)]
  const res = await startBattle({
    kind: 'trainer',
    trainer: {
      name,
      title: `Ligue ${rank.name} · IA de secours`,
      color: rank.color,
      avatar: TRAINER_LOOKS[Math.floor(Math.random() * TRAINER_LOOKS.length)]
    },
    team,
    theme: 'league',
    palette: LOCATIONS.ile_ligue.palette,
    rewardMoney: 250 + rank.level * 10,
    canCatch: false
  })
  if (!res) return
  if (res.outcome === 'win') {
    G.save.online.points += 1
    G.save.online.wins += 1
    const nowRank = rankInfo()
    if (nowRank.id !== rank.id) toast(`Nouveau rang de Ligue : ${nowRank.name} !`, '🏅')
    else toast('Victoire en Ligue · +1 point', '⚔')
  } else if (res.outcome === 'loss') {
    G.save.online.losses += 1
    toast('Défaite en Ligue. L’IA note ta progression.', '🌐')
  }
  persist()
  updateHUD()
}

// ---------------------------------------------------------------------------
// Title particles
// ---------------------------------------------------------------------------
function startTitleParticles() {
  if (titleParticlesStarted) return
  const canvas = $('#title-particles')
  if (!canvas) return
  titleParticlesStarted = true
  const ctx = canvas.getContext('2d')
  let w = 0, h = 0, raf = 0
  const motes = Array.from({ length: 46 }, () => ({
    x: Math.random(), y: Math.random(), s: .4 + Math.random() * 1.6,
    vx: .00008 + Math.random() * .00018, vy: -.00004 - Math.random() * .00012,
    a: .15 + Math.random() * .45
  }))
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    w = canvas.clientWidth || window.innerWidth
    h = canvas.clientHeight || window.innerHeight
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)
  const loop = () => {
    raf = requestAnimationFrame(loop)
    ctx.clearRect(0, 0, w, h)
    for (const m of motes) {
      m.x = (m.x + m.vx) % 1
      m.y = (m.y + m.vy + 1) % 1
      ctx.globalAlpha = m.a
      ctx.fillStyle = '#f5d79b'
      ctx.beginPath()
      ctx.arc(m.x * w, m.y * h, m.s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  raf = requestAnimationFrame(loop)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf)
    else { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop) }
  })
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function bindUI() {
  $('#btn-new').addEventListener('click', async () => {
    sfx('click')
    const save = loadSave()
    if (save) {
      const choice = await Dialog.show({
        speaker: 'Professeur Sable', portrait: professorSVG(),
        text: `Une sauvegarde de ${save.profile.name} existe déjà. Commencer une nouvelle aventure effacera cette histoire. Continuer quand même ?`,
        choices: [{ label: 'Nouvelle aventure', value: 'yes', sub: 'Efface la sauvegarde' }, { label: 'Non, garder ma partie', value: 'no' }]
      })
      if (choice !== 'yes') return
    }
    startIntro()
  })

  $('#btn-continue').addEventListener('click', () => {
    const save = loadSave()
    if (!save) { refreshTitle(); toast('Aucune sauvegarde valide.', '⚠️'); return }
    sfx('click')
    G.save = save
    startGame()
  })

  $('#btn-online-title').addEventListener('click', () => { sfx('open'); showTitleOnline() })
  $('#btn-sound').addEventListener('click', toggleSound)
  $('#intro-skip').addEventListener('click', skipIntro)

  $$('#hud [data-menu]').forEach(btn => btn.addEventListener('click', () => {
    const menu = btn.dataset.menu
    if (menu === 'team') { sfx('open'); showTeam() }
    else if (menu === 'pause') openPauseMenu()
    else if (menu === 'map') handleMenuKey('m')
    else if (menu === 'card') handleMenuKey('c')
    else if (menu === 'friends') handleMenuKey('f')
    else if (menu === 'online') handleMenuKey('o')
    else if (menu === 'bag') handleMenuKey('b')
  }))

  window.addEventListener('beforeunload', () => { if (G.save) persist() })
  setInterval(() => {
    if (G.save && gameActive && !document.hidden) persist()
  }, 45000)
}

async function boot() {
  initAudioOnGesture()
  bindUI()
  startTitleParticles()
  refreshTitle()
  const save = loadSave()
  const sound = save ? save.settings.sound : true
  setSoundEnabled(sound)
  updateSoundButton(sound)
  setTimeout(() => $('#boot')?.classList.add('hide'), 650)
}

boot().catch(err => {
  console.error('Pokémon Templier failed to boot:', err)
  const bootEl = $('#boot')
  if (bootEl) {
    bootEl.innerHTML = `<div class="boot-mark">⚠</div><div class="boot-title">ERREUR DE CHARGEMENT</div><div class="boot-sub">${escapeHTML(err?.message || 'Erreur inconnue')}</div>`
  }
})
