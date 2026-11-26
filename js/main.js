// Pokémon Templier — bootstrap, intro, menus and game flow.
import {
  BADGES, LEADERS, LOCATIONS, SPECIES, STARTERS, ONLINE_RANKS, AI_NAMES,
  TYPE_COLORS, TYPE_ICONS
} from './data.js'
import {
  G, newGame, loadSave, persist, resetSave, createMonster, toast, escapeHTML,
  objective, rankInfo, nextRank, healTeam, maxTeamLevel, formatPlaytime,
  saveTimeAgo, addFriend, locationUnlocked, statsOf, displaySpecies, hasOnlineAccess
} from './state.js'
import { World } from './world.js'
import { startBattle } from './battle.js'
import {
  Dialog, openModal, closeModal, showWorldMap, showPlayerCard, showTeam, showBag,
  showFriends, showOnline, showSettings, showHelp, showDex, paintThumbs
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

function showTitleOnline() {
  const save = loadSave()
  const badges = save?.badges.length || 0
  const access = !!save && badges >= 1
  const rank = save ? rankInfo(save.online.points) : null
  openModal({
    title: 'Poke Online MMO · alpha 1.0', icon: '🌐', wide: true, className: 'online-modal',
    content: `<div class="alpha-banner">
        <div class="ab-icon">🌐</div>
        <div><strong>Serveurs alpha 1.0 ouverts</strong><small>Ligue, chat et échanges entre dresseurs. Accès débloqué dès le premier badge.</small></div>
        <span class="alpha-badge">alpha 1.0</span>
      </div>
      ${access ? `
        <div class="online-title-grid">
          <div class="info-tile"><span>Dresseur</span><strong>${escapeHTML(save.profile.name)}</strong><small>${badges}/8 badges</small></div>
          <div class="info-tile"><span>Rang de Ligue</span><strong style="color:${rank.color}">${rank.name}</strong><small>${save.online.points} points</small></div>
          <div class="info-tile"><span>Amis</span><strong>${save.friends.length}</strong><small>Connectés à l’alpha</small></div>
        </div>
        <button class="btn gold full big" id="title-online-enter">🌐 Entrer dans l’alpha</button>
        <p class="muted small">Ta carte de dresseur, tes badges et tes amis sont visibles. Les combats de Ligue et les échanges sont simulés localement pour cette alpha.</p>`
      : `
        <div class="online-locked">
          <div class="lock-orb">🌐</div>
          <h3>L’alpha t’attend</h3>
          <p>Poke Online MMO alpha 1.0 ouvre dès que tu décroches ton <strong>premier badge</strong>. Les Champions de Templier te donnent accès à la Ligue, au chat et aux échanges.</p>
          <div class="online-badge-req"><span class="req-dot ${badges >= 1 ? 'ok' : ''}"></span>${badges}/1 badge ${badges >= 1 ? '· accès ouvert' : '· accès verrouillé'}</div>
        </div>
        <button class="btn gold full big" id="title-online-start">⚜ ${save ? 'Continuer l’aventure' : 'Commencer l’aventure'}</button>
        <p class="muted small">Le Professeur Sable : « Un badge suffit pour que le monde te voie. Le reste, c’est ton histoire. »</p>`}
    `,
    onMount: wrap => {
      wrap.querySelector('#title-online-enter')?.addEventListener('click', () => {
        if (!save) return
        G.save = save
        closeModal()
        startGame()
        setTimeout(() => showOnline({ onLeagueBattle: leagueBattle }), 900)
      })
      wrap.querySelector('#title-online-start')?.addEventListener('click', () => {
        closeModal()
        if (save) { G.save = save; startGame() }
        else startIntro()
      })
    }
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
      <p>Ce rêve, c’est <span class="hl">Poke Online MMO alpha 1.0</span> : un réseau où les dresseurs partagent leurs combats, leurs cartes et leurs échanges. Il s’ouvrira pour toi dès ton <span class="hl">premier badge</span>.</p>
      <p>Autour de toi, les herbes cachent des Pokémon venus des neuf générations connues. Chaque heure, une génération différente vient visiter Templier. Tu les reconnaîtras à leur sprite et à leur badge de génération dans le Pokédex.</p>`
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
// Hourly updates & codes
// ---------------------------------------------------------------------------
const HOURLY_UPDATES = [
  {
    icon: '⚜', tag: 'UPGRADE', title: 'Méga-Évolution : nouvelles auras',
    text: 'Les Méga-Évolutions de Templion et des gardiens gagnent des auras dorées, des particules renforcées et un éclat de cristal au moment du changement.'
  },
  {
    icon: '🌐', tag: 'MAJ', title: 'Ligue en ligne : IA de secours',
    text: 'La Ligue ajuste désormais la taille et le niveau de ses équipes à ton rang. Si peu de joueurs sont connectés, l’IA prend le relais sans temps d’attente.'
  },
  {
    icon: '🎟', tag: 'CODE', title: 'Code Templier de cette heure', code: true,
    text: 'Un code cadeau est publié chaque heure. Il est annoncé sur notre compte officiel, ou tu peux me le demander directement pour obtenir celui de l’heure en cours.'
  },
  {
    icon: '🏛', tag: 'UPGRADE', title: 'Tour des Huit Arènes',
    text: 'Chaque victoire dans la Tour soigne ton équipe. Les huit Champions de l’Île des Épreuves montent désormais en puissance à chaque étage.'
  },
  {
    icon: '🐾', tag: 'MAJ', title: 'Rencontres sauvages enrichies',
    text: 'Les herbes hautes de Templier accueillent des Pokémon plus variés selon le village et l’heure. Les légendes restent réservées au Sanctuaire des Vents.'
  },
  {
    icon: '💾', tag: 'UPGRADE', title: 'Sauvegarde renforcée',
    text: 'La sauvegarde locale est consolidée : export JSON, reprise automatique, protection contre les parties corrompues et sauvegarde à la fermeture.'
  },
  {
    icon: '🤝', tag: 'MAJ', title: 'Amis & cadeaux',
    text: 'Les amis offrent un cadeau par jour. Parle-leur, renforce vos liens et débloque des défis amicaux dans chaque village.'
  },
  {
    icon: '✨', tag: 'UPGRADE', title: 'Sanctuaire des Vents',
    text: 'Latias, Latios et Rayquaza brillent davantage sur leurs autels. Le quatrième badge reste la clé qui réveille le sanctuaire.'
  }
]

let hourlyTimer = null
let lastHourlyIndex = -1

function hourStart(ts = Date.now()) {
  const d = new Date(ts)
  d.setMinutes(0, 0, 0)
  return d
}

function hourLabel(ts = Date.now()) {
  return `${String(new Date(ts).getHours()).padStart(2, '0')}:00`
}

function nextHourText(ts = Date.now()) {
  const next = hourStart(ts).getTime() + 3600000
  const diff = Math.max(0, next - ts)
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function currentHourlyUpdate(ts = Date.now()) {
  const index = Math.floor(ts / 3600000) % HOURLY_UPDATES.length
  return { index, item: HOURLY_UPDATES[index] }
}

function renderHourlyUpdate(flash = false) {
  const root = $('#intro-update')
  if (!root) return
  const { index, item } = currentHourlyUpdate()
  const label = $('#iu-label')
  const title = $('#iu-title')
  const icon = $('#iu-icon')
  const timer = $('#iu-timer')
  if (label) label.textContent = item.code ? `Code horaire · ${hourLabel()}` : `Mise à jour horaire · ${hourLabel()}`
  if (title) title.textContent = item.title
  if (icon) icon.textContent = item.icon
  if (timer) timer.textContent = `dans ${nextHourText()}`
  root.classList.toggle('is-code', !!item.code)
  if (flash || index !== lastHourlyIndex) {
    root.classList.remove('flash')
    void root.offsetWidth
    root.classList.add('flash')
  }
  lastHourlyIndex = index
}

function startHourlyTicker() {
  if (hourlyTimer) return
  renderHourlyUpdate()
  hourlyTimer = setInterval(() => {
    renderHourlyUpdate()
    if (document.hidden) return
  }, 1000)
}

function showHourlyUpdateModal() {
  const now = Date.now()
  const { index, item } = currentHourlyUpdate(now)
  const upcoming = []
  for (let i = 1; i <= 4; i++) {
    const slot = hourStart(now).getTime() + i * 3600000
    const entry = HOURLY_UPDATES[(index + i) % HOURLY_UPDATES.length]
    upcoming.push({ entry, slot })
  }
  const modal = openModal({
    title: 'Mises à jour horaires', icon: '⟳', className: 'hourly-modal',
    content: `<div class="hourly-current ${item.code ? 'code' : ''}">
        <div class="hc-icon">${item.icon}</div>
        <div>
          <span class="hourly-badge ${item.code ? 'code' : ''}">${item.code ? 'CODE' : item.tag} · ${hourLabel(now)}</span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.text)}</p>
        </div>
      </div>
      <div class="hourly-list">
        ${upcoming.map(({ entry, slot }) => `<div class="hourly-row">
          <span class="hr-icon">${entry.icon}</span>
          <span><strong>${escapeHTML(entry.title)}</strong><small>${entry.code ? 'Code cadeau · annoncé sur notre compte ou sur demande' : entry.text}</small></span>
          <span class="hr-time">${hourLabel(slot)}</span>
        </div>`).join('')}
      </div>
      <div class="hourly-note"><strong>Codes Templier :</strong> un nouvel emplacement de code est révélé chaque heure. Les codes sont annoncés sur notre compte officiel, et tu peux aussi me demander directement celui de l’heure en cours. Aucun code n’est inventé par le jeu.</div>
      <div class="pause-foot" style="margin-top:12px">
        <button class="btn" id="hourly-close">Fermer</button>
        <button class="btn gold" id="hourly-ask">🎟 Demander le code</button>
      </div>`,
    onMount: wrap => {
      wrap.querySelector('#hourly-close').addEventListener('click', closeModal)
      wrap.querySelector('#hourly-ask').addEventListener('click', async () => {
        closeModal()
        await Dialog.show({
          speaker: 'Professeur Sable', portrait: professorSVG(),
          text: 'Les codes de Templier sont publiés chaque heure sur notre compte officiel. Si tu veux celui de l’heure en cours, demande-le-moi directement : je te le communiquerai dès qu’il sera annoncé. Le jeu, lui, ne fabrique jamais de faux code.'
        })
      })
    }
  })
  return modal
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
      onBanner: showLocationBanner,
      onEvent: handleWorldEvent
    })
    window.__travelTo = id => { world.travelTo(id); updateHUD() }
  }

  requestAnimationFrame(() => {
    world.resize()
    world.travelTo(G.save.location || 'sablonville', { spawn: 'bottom', force: true, banner: !firstTime })
    updateHUD()
    renderTutorial()
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
          text: 'Commence par l’arène au nord. Dame Néra t’y attend. Et n’oublie pas : les herbes hautes cachent des Pokémon sauvages, dont des visiteurs des neuf générations.'
        },
        {
          speaker: 'Professeur Sable', portrait: professorSVG(),
          text: 'Un petit tutoriel t’accompagne à gauche. Flèches ou ZQSD pour marcher, E pour interagir, M pour la carte, K pour le Pokédex, O pour Online. Le désert est à toi.'
        }
      ])
      startTutorial()
    }, 900)
  } else {
    setTimeout(() => { if (!G.save.flags.tutorialDone) startTutorial() }, 600)
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

// ---------------------------------------------------------------------------
// Guided tutorial
// ---------------------------------------------------------------------------
const TUTORIAL_STEPS = [
  { icon: '👣', title: 'Marcher dans le désert', key: 'Flèches', event: 'move', text: 'Utilise les flèches, ZQSD/WASD ou le joystick tactile pour explorer Sablonville.' },
  { icon: '💬', title: 'Parler et interagir', key: 'E', event: 'interact', text: 'Approche-toi d’un personnage, d’une porte ou d’un autel, puis appuie sur E (ou le bouton A).' },
  { icon: '🌿', title: 'Les herbes hautes', key: 'Herbes', event: 'encounter', text: 'Marche dans les herbes : un Pokémon sauvage peut apparaître. Les visiteurs 1G → 9G s’y cachent aussi !' },
  { icon: '🗺️', title: 'La carte du monde', key: 'M', event: 'map', text: 'Ouvre la carte avec M. Les villages se débloquent au fil de tes badges, et les îles attendent la fin du jeu.' },
  { icon: '⚔️', title: 'Décroche un badge', key: 'Arène', event: 'badge', text: 'Entre dans l’arène au nord et bats Dame Néra. Ton premier badge ouvre Poke Online alpha 1.0.' },
  { icon: '🌐', title: 'Poke Online alpha 1.0', key: 'O', event: 'online', text: 'Avec un badge, ouvre Online avec O : Ligue, chat et échanges entre dresseurs t’attendent.' },
  { icon: '📘', title: 'Pokédex 1G → 9G', key: 'K', event: 'dex', text: 'Ouvre le Pokédex avec K pour admirer les sprites des neuf générations et suivre tes captures.' }
]

function tutorialStepIndex() {
  return Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, G.save?.flags.tutorialStep || 0))
}

function renderTutorial() {
  const card = $('#tutorial-card')
  if (!card) return
  const visible = !!G.save && gameActive && !G.save.flags.tutorialDone
  card.classList.toggle('hidden', !visible)
  if (!visible) return
  const i = tutorialStepIndex()
  const step = TUTORIAL_STEPS[i]
  $('#tut-icon').textContent = step.icon
  $('#tut-eyebrow').textContent = `Tutoriel · ${i + 1}/${TUTORIAL_STEPS.length}`
  $('#tut-title').textContent = step.title
  $('#tut-text').textContent = step.text
  $('#tut-key').textContent = step.key
  $('#tut-dots').innerHTML = TUTORIAL_STEPS.map((_, idx) => `<span class="tut-dot ${idx < i ? 'done' : idx === i ? 'active' : ''}"></span>`).join('')
  $('#tut-next').textContent = i === TUTORIAL_STEPS.length - 1 ? 'Terminer ✓' : 'C’est fait ✓'
}

function finishTutorial(silent = false) {
  if (!G.save) return
  G.save.flags.tutorialStep = TUTORIAL_STEPS.length
  G.save.flags.tutorialDone = true
  persist()
  renderTutorial()
  if (!silent) toast('Tutoriel terminé · bonne route !', '⚜')
}

function advanceTutorial(event = null) {
  if (!G.save || G.save.flags.tutorialDone) return false
  const i = tutorialStepIndex()
  const step = TUTORIAL_STEPS[i]
  if (event && step.event !== event) return false
  if (i >= TUTORIAL_STEPS.length - 1) { finishTutorial(); return true }
  G.save.flags.tutorialStep = i + 1
  persist()
  sfx('click')
  renderTutorial()
  return true
}

function startTutorial(force = false) {
  if (!G.save) return
  if (force) {
    G.save.flags.tutorialDone = false
    G.save.flags.tutorialStep = 0
    persist()
  }
  renderTutorial()
}

function handleWorldEvent(type, data = {}) {
  if (!G.save) return
  if (type === 'badge') {
    if (data.count === 1) toast('Premier badge ! Poke Online alpha 1.0 est débloqué.', '🌐')
    advanceTutorial('badge')
  } else if (['move', 'interact', 'encounter'].includes(type)) {
    advanceTutorial(type)
  }
}

function handleMenuKey(key) {
  if (!G.save || !gameActive) return
  if (key === 'm') { sfx('open'); showWorldMap(travelTo); advanceTutorial('map') }
  else if (key === 'c') { sfx('open'); showPlayerCard() }
  else if (key === 'f') { sfx('open'); showFriends(friendBattle) }
  else if (key === 'o') { sfx('open'); showOnline({ onLeagueBattle: leagueBattle }); advanceTutorial('online') }
  else if (key === 'k') { sfx('open'); showDex(); advanceTutorial('dex') }
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
        <button class="pause-action" data-act="online"><span>🌐</span><strong>Online</strong><small>${hasOnlineAccess() ? 'Alpha 1.0' : '1 badge requis'}</small></button>
        <button class="pause-action" data-act="dex"><span>📘</span><strong>Pokédex</strong><small>${Object.keys(save.caught).length} capturés</small></button>
        <button class="pause-action" data-act="tutorial"><span>👣</span><strong>Tutoriel</strong><small>Revoir les bases</small></button>
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
        else if (act === 'online') { closeModal(); setTimeout(() => { showOnline({ onLeagueBattle: leagueBattle }); advanceTutorial('online') }, 150) }
        else if (act === 'dex') { closeModal(); setTimeout(() => { showDex(); advanceTutorial('dex') }, 150) }
        else if (act === 'tutorial') { closeModal(); setTimeout(() => startTutorial(true), 150) }
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
  $('#tutorial-card')?.classList.add('hidden')
  showScreen('screen-title')
  refreshTitle()
}

async function resetGame() {
  resetSave()
  G.save = null
  closeModal()
  Dialog.close()
  setGamePaused(true)
  $('#tutorial-card')?.classList.add('hidden')
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
  $('#intro-update').addEventListener('click', () => { sfx('open'); showHourlyUpdateModal() })
  $('#tut-next')?.addEventListener('click', () => advanceTutorial(null))
  $('#tut-skip')?.addEventListener('click', () => { finishTutorial(true); toast('Tutoriel passé. Relance-le depuis le menu quand tu veux.', '👣') })

  $$('#hud [data-menu]').forEach(btn => btn.addEventListener('click', () => {
    const menu = btn.dataset.menu
    if (menu === 'team') { sfx('open'); showTeam() }
    else if (menu === 'pause') openPauseMenu()
    else if (menu === 'map') handleMenuKey('m')
    else if (menu === 'card') handleMenuKey('c')
    else if (menu === 'friends') handleMenuKey('f')
    else if (menu === 'online') handleMenuKey('o')
    else if (menu === 'dex') handleMenuKey('k')
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
  startHourlyTicker()
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
