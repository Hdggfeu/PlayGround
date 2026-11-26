import {
  BADGES, ITEMS, LOCATIONS, LOCATION_ORDER, ONLINE_RANKS, SPECIES, TYPE_COLORS, TYPE_ICONS, AI_NAMES, MOVES,
  GENERATIONS
} from './data.js'
import {
  G, persist, escapeHTML, statsOf, displaySpecies, toast, objective, locationUnlocked,
  rankInfo, nextRank, formatPlaytime, addItem, takeItem, healOne, healTeam, itemCount, allItems,
  saveTimeAgo, isFriend, addFriend, maxTeamLevel, createMonster, hasOnlineAccess
} from './state.js'
import { drawCreature, playerAvatarSVG, leaderAvatarSVG, professorSVG, badgeSVG, ballSVG } from './art.js'

// ---------------------------------------------------------------------------
// Dialogue
// ---------------------------------------------------------------------------
class DialogEngine {
  constructor() {
    this.root = null
    this.busy = false
    this.keyHandler = null
  }

  async show(lines, opts = {}) {
    const arr = Array.isArray(lines) ? lines : [lines]
    this.busy = true
    for (const raw of arr) {
      const line = typeof raw === 'string' ? { text: raw } : { ...raw }
      const choice = await this.showLine(line, opts)
      if (line.choices && choice != null) { this.busy = false; return choice }
      if (choice === '__escape__') { this.busy = false; return null }
    }
    this.busy = false
    return null
  }

  showLine(line, opts = {}) {
    return new Promise(resolve => {
      this.root?.remove()
      const root = document.createElement('div')
      root.className = 'dialog-layer' + (line.className ? ' ' + line.className : '')
      const portrait = line.portrait || (line.avatar ? leaderAvatarSVG(line.avatar, 112, line.color) : '')
      const medallion = !portrait && line.speaker
        ? `<div class="dialog-medallion" style="--c:${line.color || '#f0c96b'}">${escapeHTML((line.speaker || '?')[0])}</div>`
        : ''
      root.innerHTML = `
        <div class="dialog-box" role="dialog" aria-live="polite">
          <div class="dialog-portrait ${portrait ? 'has-art' : ''}">${portrait || medallion}</div>
          <div class="dialog-main">
            <div class="dialog-topline">
              <span class="dialog-name">${escapeHTML(line.speaker || 'Templier')}</span>
              ${line.tag ? `<span class="dialog-tag">${escapeHTML(line.tag)}</span>` : ''}
            </div>
            <div class="dialog-text" id="dialog-text"></div>
            <div class="dialog-choices" id="dialog-choices"></div>
            <div class="dialog-footer">
              <span class="dialog-hint">${opts.allowEscape ? 'Échap pour fermer' : 'Clique / Espace pour continuer'}</span>
              <button class="dialog-next" aria-label="Continuer">▼</button>
            </div>
          </div>
        </div>`
      document.getElementById('dialog-root').appendChild(root)
      this.root = root
      const textEl = root.querySelector('#dialog-text')
      const choicesEl = root.querySelector('#dialog-choices')
      const nextBtn = root.querySelector('.dialog-next')
      const text = String(line.text || '')
      let shown = 0, typing = true, done = false, timer = null

      const finish = value => {
        if (done) return
        done = true
        clearInterval(timer)
        cleanup()
        root.classList.add('leaving')
        setTimeout(() => { root.remove(); if (this.root === root) this.root = null }, 140)
        resolve(value)
      }
      const cleanup = () => {
        if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler)
        this.keyHandler = null
      }
      const showChoices = () => {
        if (!line.choices || !line.choices.length) return
        choicesEl.innerHTML = line.choices.map((c, i) =>
          `<button class="choice-btn" data-i="${i}"><span>${escapeHTML(c.label)}</span>${c.sub ? `<small>${escapeHTML(c.sub)}</small>` : ''}</button>`
        ).join('')
        choicesEl.querySelectorAll('.choice-btn').forEach(btn => {
          btn.addEventListener('click', ev => {
            ev.stopPropagation()
            const c = line.choices[Number(btn.dataset.i)]
            finish(c.value != null ? c.value : c.label)
          })
        })
        nextBtn.style.display = 'none'
      }
      const complete = () => {
        if (!typing) return
        typing = false
        clearInterval(timer)
        textEl.textContent = text
        textEl.classList.add('complete')
        if (line.choices?.length) showChoices()
        else nextBtn.classList.add('ready')
      }
      const advance = () => {
        if (typing) { complete(); return }
        if (line.choices?.length) return
        finish('__next__')
      }
      timer = setInterval(() => {
        shown += 1
        textEl.textContent = text.slice(0, shown)
        if (shown >= text.length) { complete() }
      }, line.slow ? 24 : 13)
      // allow immediate reveal if text is empty
      if (!text) complete()
      const box = root.querySelector('.dialog-box')
      box.addEventListener('click', ev => {
        if (ev.target.closest('.choice-btn')) return
        advance()
      })
      nextBtn.addEventListener('click', ev => { ev.stopPropagation(); advance() })
      this.keyHandler = ev => {
        if (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'e' || ev.key === 'E' || ev.key === 'ArrowDown') {
          ev.preventDefault(); advance()
        } else if (ev.key === 'Escape' && opts.allowEscape) {
          ev.preventDefault(); finish('__escape__')
        }
      }
      document.addEventListener('keydown', this.keyHandler)
    })
  }

  close() {
    if (this.root) { this.root.remove(); this.root = null }
    this.busy = false
  }
}

export const Dialog = new DialogEngine()

// ---------------------------------------------------------------------------
// Modal helpers
// ---------------------------------------------------------------------------
let currentModal = null

export function openModal({ title = '', icon = '', content = '', wide = false, className = '', onMount = null, closable = true }) {
  closeModal()
  const root = document.getElementById('modal-root')
  const wrap = document.createElement('div')
  wrap.className = 'modal-layer'
  wrap.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal panel ${wide ? 'modal-wide' : ''} ${className}" role="dialog" aria-modal="true">
      <div class="modal-ornament top"></div>
      <header class="modal-head">
        <div class="modal-title"><span class="modal-icon">${icon}</span><h2>${escapeHTML(title)}</h2></div>
        ${closable ? '<button class="modal-close" aria-label="Fermer">✕</button>' : ''}
      </header>
      <div class="modal-body">${content}</div>
      <div class="modal-ornament bottom"></div>
    </div>`
  root.appendChild(wrap)
  currentModal = wrap
  const close = () => closeModal()
  if (closable) {
    wrap.querySelector('.modal-close').addEventListener('click', close)
    wrap.querySelector('.modal-backdrop').addEventListener('click', close)
    const key = ev => { if (ev.key === 'Escape') { document.removeEventListener('keydown', key); close() } }
    document.addEventListener('keydown', key)
    wrap._escKey = key
  }
  requestAnimationFrame(() => { wrap.classList.add('open'); if (onMount) onMount(wrap) })
  return { el: wrap, close }
}

export function closeModal() {
  if (!currentModal) return
  const el = currentModal
  currentModal = null
  if (el._escKey) document.removeEventListener('keydown', el._escKey)
  el.classList.remove('open')
  setTimeout(() => el.remove(), 180)
}

export function typeChip(type, small = false) {
  const c = TYPE_COLORS[type] || '#a8a29e'
  return `<span class="type-chip ${small ? 'small' : ''}" style="--tc:${c}">${TYPE_ICONS[type] || ''} ${escapeHTML(type)}</span>`
}

export function hpBar(mon, showText = true) {
  const max = statsOf(mon).maxHp
  const pct = Math.max(0, Math.min(100, (mon.hp / max) * 100))
  const cls = pct > 50 ? 'ok' : pct > 22 ? 'warn' : 'danger'
  return `<div class="hp-line ${cls}"><div class="hp-track"><div class="hp-fill" style="width:${pct}%"></div></div>${showText ? `<span class="hp-text">${mon.hp}/${max}</span>` : ''}</div>`
}

export function paintThumbs(root = document) {
  root.querySelectorAll('canvas[data-species]').forEach(canvas => {
    const sp = SPECIES[canvas.dataset.species]
    if (!sp) return
    const w = canvas.width, h = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    const mega = canvas.dataset.mega === '1'
    drawCreature(ctx, sp, w / 2, h * 0.79, h / 330, { t: 0, mega, flip: canvas.dataset.flip === '1' })
  })
}

function monThumb(mon, size = 62, flip = false, mega = false) {
  return `<canvas width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px" data-species="${mon.species}" data-flip="${flip ? 1 : 0}" data-mega="${mega ? 1 : 0}"></canvas>`
}

function friendAvatar(friend, size = 56) {
  if (friend.kind === 'professor') {
    return `<div class="friend-avatar professor" title="Professeur Sable"><span>S</span></div>`
  }
  if (friend.avatar) return `<div class="friend-avatar">${leaderAvatarSVG(friend.avatar, size, friend.color || '#f0c96b')}</div>`
  return `<div class="friend-avatar generic" style="--c:${friend.color || '#8ecae6'}"><span>${escapeHTML((friend.name || '?')[0])}</span></div>`
}

export function hearts(n = 1, max = 5) {
  let s = ''
  for (let i = 0; i < max; i++) s += `<span class="${i < n ? 'on' : ''}">♥</span>`
  return `<span class="hearts">${s}</span>`
}

// ---------------------------------------------------------------------------
// World map
// ---------------------------------------------------------------------------
const MAP_NODES = {
  sablonville: { x: 175, y: 515, icon: '⛱', short: 'Sablonville' },
  oubar: { x: 300, y: 405, icon: '⚔', short: 'Oubar' },
  verdazur: { x: 420, y: 480, icon: '🌿', short: 'Verdazur' },
  cendrelac: { x: 552, y: 372, icon: '🔥', short: 'Cendrelac' },
  aquacorde: { x: 686, y: 452, icon: '🌊', short: 'Aquacorde' },
  voltaria: { x: 808, y: 338, icon: '⚡', short: 'Voltaria' },
  noctemport: { x: 872, y: 520, icon: '🌙', short: 'Noctemport' },
  cimesacree: { x: 712, y: 228, icon: '✧', short: 'Cimesacrée' },
  sanctuaire: { x: 392, y: 250, icon: '🌀', short: 'Sanctuaire' },
  ile_epreuves: { x: 258, y: 668, icon: '🏛', short: 'Île des Épreuves' },
  ile_ligue: { x: 790, y: 672, icon: '♛', short: 'Île de la Ligue' }
}

const MAP_ROUTES = [
  ['sablonville', 'oubar'], ['oubar', 'verdazur'], ['verdazur', 'cendrelac'],
  ['cendrelac', 'aquacorde'], ['aquacorde', 'voltaria'], ['voltaria', 'noctemport'],
  ['noctemport', 'cimesacree'], ['cendrelac', 'sanctuaire'], ['voltaria', 'sanctuaire'],
  ['sablonville', 'ile_epreuves'], ['noctemport', 'ile_ligue']
]

function routePath(a, b) {
  const A = MAP_NODES[a], B = MAP_NODES[b]
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - 18
  return `M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`
}

function mapDecor() {
  let s = ''
  // mountains
  const mountains = [[620, 180], [655, 165], [690, 180], [735, 168], [770, 190], [560, 210], [515, 235], [790, 250]]
  for (const [x, y] of mountains) {
    s += `<path d="M${x - 24} ${y + 18} L${x} ${y - 18} L${x + 24} ${y + 18} Z" fill="#8a7a6a" opacity=".75"/>
      <path d="M${x} ${y - 18} L${x + 10} ${y - 1} L${x - 8} ${y + 2} Z" fill="#e8e0d0" opacity=".8"/>`
  }
  // trees
  const trees = [[340, 500], [365, 512], [390, 498], [440, 515], [465, 500], [490, 522], [610, 430], [635, 445], [660, 425], [720, 500], [745, 512], [770, 498], [180, 470], [205, 485]]
  for (const [x, y] of trees) {
    s += `<circle cx="${x}" cy="${y}" r="11" fill="#4f7a42" opacity=".8"/><circle cx="${x - 6}" cy="${y + 4}" r="8" fill="#3f6635" opacity=".8"/><rect x="${x - 1}" y="${y + 8}" width="2" height="6" fill="#5c4228"/>`
  }
  // dunes
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 32, y = 560 - (i % 2) * 14
    s += `<path d="M${x} ${y} q18 -10 36 0" stroke="#a8844f" stroke-width="2" fill="none" opacity=".5"/>`
  }
  // waves
  for (let i = 0; i < 14; i++) {
    const x = 90 + (i * 137) % 820, y = 600 + (i * 73) % 110
    s += `<path d="M${x} ${y} q8 -5 16 0 t16 0" stroke="#e8f6ff" stroke-width="2" fill="none" opacity=".25"/>`
  }
  // central citadel (decor)
  s += `<g transform="translate(520 320)" opacity=".85">
    <path d="M-34 18 L-28 -18 L-14 -4 L0 -38 L14 -4 L28 -18 L34 18 Z" fill="#8a7a6a" stroke="#4a3a2a" stroke-width="2"/>
    <rect x="-6" y="-8" width="12" height="26" fill="#4a3a2a"/>
    <path d="M0 -38 L0 -52" stroke="#f0c96b" stroke-width="2"/><path d="M0 -52 l16 5 -16 5z" fill="#f0c96b"/>
  </g>`
  // compass
  s += `<g transform="translate(905 120)" opacity=".9">
    <circle r="36" fill="#1a2136" stroke="#f0c96b" stroke-width="2"/>
    <path d="M0 -28 L7 0 L0 28 L-7 0 Z" fill="#f0c96b"/>
    <path d="M-28 0 L0 6 L28 0 L0 -6 Z" fill="#c9a45a"/>
    <text y="-42" text-anchor="middle" fill="#f0c96b" font-size="13" font-family="Georgia,serif">N</text>
  </g>`
  return s
}

export function worldMapSVG() {
  const s = G.save
  const cur = s?.location
  const nodes = Object.entries(MAP_NODES).map(([id, n]) => {
    const loc = LOCATIONS[id]
    const unlocked = locationUnlocked(id)
    const isCurrent = cur === id
    const typeColor = loc?.type ? (TYPE_COLORS[loc.type] || '#f0c96b') : '#f0c96b'
    return `<g class="map-node ${unlocked ? '' : 'locked'} ${isCurrent ? 'current' : ''}" data-loc="${id}" transform="translate(${n.x} ${n.y})" tabindex="0" role="button" aria-label="${escapeHTML(loc?.name || id)}">
      ${isCurrent ? `<circle r="38" class="map-pulse" fill="none" stroke="#f0c96b" stroke-width="2"/>` : ''}
      <circle r="27" fill="#111a2c" stroke="${unlocked ? typeColor : '#5a6478'}" stroke-width="3"/>
      <circle r="20" fill="${unlocked ? typeColor : '#3a4256'}" opacity=".22"/>
      <text y="7" text-anchor="middle" font-size="20" fill="${unlocked ? '#fff3c4' : '#8a93a6'}">${n.icon}</text>
      ${unlocked ? '' : '<text y="9" x="17" font-size="12">🔒</text>'}
      <rect x="-58" y="32" width="116" height="21" rx="10" fill="#0b1120" stroke="${unlocked ? 'rgba(240,201,107,.45)' : 'rgba(120,130,150,.25)'}"/>
      <text y="47" text-anchor="middle" font-size="10.5" letter-spacing=".5" fill="${unlocked ? '#f2e3c2' : '#7d8799'}" font-family="Trebuchet MS,sans-serif">${escapeHTML(n.short)}</text>
      ${isCurrent ? '<text y="-42" text-anchor="middle" font-size="9" letter-spacing="2" fill="#f0c96b">VOUS</text>' : ''}
    </g>`
  }).join('')

  const routes = MAP_ROUTES.map(([a, b]) => {
    const unlocked = locationUnlocked(a) && locationUnlocked(b)
    return `<path d="${routePath(a, b)}" fill="none" stroke="${unlocked ? '#f0c96b' : '#8a93a6'}" stroke-width="${unlocked ? 2.2 : 1.4}" stroke-dasharray="${unlocked ? '3 7' : '2 9'}" opacity="${unlocked ? .6 : .28}"/>`
  }).join('')

  return `<svg class="world-map" viewBox="0 0 1000 760" role="img" aria-label="Carte du monde de Pokémon Templier">
    <defs>
      <radialGradient id="sea" cx="50%" cy="45%" r="72%">
        <stop offset="0" stop-color="#1d4760"/><stop offset=".6" stop-color="#143448"/><stop offset="1" stop-color="#0b2030"/>
      </radialGradient>
      <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d8b87a"/><stop offset="1" stop-color="#b89258"/>
      </linearGradient>
      <linearGradient id="island1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e0c890"/><stop offset="1" stop-color="#b89a62"/>
      </linearGradient>
      <linearGradient id="island2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d8d0c0"/><stop offset="1" stop-color="#a89f90"/>
      </linearGradient>
      <pattern id="map-grain" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r=".7" fill="#fff" opacity=".1"/>
      </pattern>
      <filter id="map-shadow"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity=".45"/></filter>
    </defs>
    <rect width="1000" height="760" fill="url(#sea)"/>
    <rect width="1000" height="760" fill="url(#map-grain)"/>
    <g opacity=".22" stroke="#9ed8e8" fill="none" stroke-width="1">
      <path d="M20 70 Q80 50 140 70 T260 70 T380 70"/>
      <path d="M620 60 Q680 40 740 60 T860 60"/>
      <path d="M40 700 Q100 680 160 700 T280 700"/>
    </g>
    <g filter="url(#map-shadow)">
      <path d="M95 470 C70 410 105 340 160 300 C200 270 210 210 270 190 C330 170 350 120 430 130 C500 138 540 100 610 120 C680 140 700 190 770 200 C850 212 900 260 905 330 C912 400 870 450 820 480 C760 515 730 570 650 575 C580 580 540 620 460 610 C390 600 340 560 280 560 C210 560 140 535 95 470 Z" fill="url(#land)" stroke="#6b4e2a" stroke-width="3"/>
      <path d="M160 300 C200 270 210 210 270 190 C330 170 350 120 430 130 C500 138 540 100 610 120 C680 140 700 190 770 200 C850 212 900 260 905 330 C880 300 840 290 800 270 C760 250 720 220 680 230 C620 248 560 220 500 240 C430 264 380 250 330 290 C290 322 250 330 210 350 C185 362 165 340 160 300 Z" fill="#b8a888" opacity=".5"/>
      <ellipse cx="430" cy="475" rx="170" ry="120" fill="#7fae6a" opacity=".72"/>
      <ellipse cx="700" cy="390" rx="145" ry="115" fill="#8a6a52" opacity=".55"/>
      <ellipse cx="835" cy="495" rx="100" ry="82" fill="#5a4a72" opacity=".55"/>
      <ellipse cx="650" cy="245" rx="190" ry="100" fill="#b8b0c8" opacity=".5"/>
      <path d="M300 560 C340 520 390 520 420 548 C450 576 430 600 380 604 C330 608 280 594 300 560Z" fill="#3d8ed6" opacity=".7"/>
      <path d="M560 480 C590 460 620 470 630 490 C640 512 610 528 585 516 C560 504 545 492 560 480Z" fill="#3d8ed6" opacity=".6"/>
      <path d="M740 530 C760 510 790 512 805 530 C820 548 800 566 775 560 C750 554 730 544 740 530Z" fill="#3d8ed6" opacity=".55"/>
      <path d="M120 600 C170 570 220 570 260 600 C300 630 280 670 230 675 C180 680 120 660 120 600Z" fill="url(#island1)" stroke="#6b4e2a" stroke-width="3"/>
      <path d="M720 610 C760 585 830 585 870 610 C910 635 900 690 850 705 C800 720 740 700 720 665 C710 645 710 625 720 610Z" fill="url(#island2)" stroke="#6b6a5a" stroke-width="3"/>
    </g>
    ${mapDecor()}
    ${routes}
    ${nodes}
    <g transform="translate(30 715)">
      <rect width="280" height="30" rx="8" fill="#0b1120" opacity=".85" stroke="rgba(240,201,107,.3)"/>
      <text x="12" y="19" font-size="10" fill="#c9d3e4" font-family="Trebuchet MS,sans-serif">Clique sur un lieu débloqué pour voyager</text>
    </g>
    <text x="970" y="742" text-anchor="end" font-size="11" fill="#8a93a6" font-family="Georgia,serif" letter-spacing="2">POKÉMON TEMPLIER · CARTE DU MONDE</text>
  </svg>`
}

function lockReason(id) {
  const loc = LOCATIONS[id]
  if (!loc) return 'Lieu inconnu.'
  if (id === 'sanctuaire') return 'Atteins le 4e badge pour réveiller le Sanctuaire des Vents.'
  if (id === 'ile_epreuves') return 'Obtiens les 8 badges pour ouvrir les îles.'
  if (id === 'ile_ligue') return 'Triomphe d’abord des huit arènes de l’Île des Épreuves.'
  if (loc.order >= 0) return `Obtiens le badge de ${LOCATIONS[LOCATION_ORDER[Math.max(0, loc.order - 1)]]?.name || 'la région précédente'}.`
  return 'Ce lieu n’est pas encore accessible.'
}

export function showWorldMap(onTravel) {
  const s = G.save
  const modal = openModal({
    title: 'Carte du Monde', icon: '🗺', wide: true, className: 'map-modal',
    content: `<div class="map-layout">
      <div class="map-canvas">${worldMapSVG()}</div>
      <aside class="map-side">
        <div class="map-side-head">
          <span class="eyebrow">Région de Templier</span>
          <h3>${s.badges.length} / 8 badges</h3>
          <p class="muted">${escapeHTML(objective())}</p>
        </div>
        <div class="badge-row">${BADGES.map(b => badgeSVG(b.color, b.glyph, 34, s.badges.includes(b.id))).join('')}</div>
        <div id="map-detail"></div>
        <div class="map-legend">
          <span><i class="dot current"></i> Position</span>
          <span><i class="dot open"></i> Accessible</span>
          <span><i class="dot locked"></i> Verrouillé</span>
        </div>
      </aside>
    </div>`,
    onMount: wrap => {
      const detail = wrap.querySelector('#map-detail')
      let selected = s.location
      const select = id => {
        selected = id
        wrap.querySelectorAll('.map-node').forEach(n => n.classList.toggle('selected', n.dataset.loc === id))
        const loc = LOCATIONS[id]
        const unlocked = locationUnlocked(id)
        const current = id === s.location
        const arena = loc?.arena ? `<div class="detail-line"><span>Arène</span><strong>${escapeHTML(loc.arena === 'master' ? 'Maître de la Ligue' : loc.arena === null ? '—' : loc.arena)}</strong></div>` : ''
        detail.innerHTML = `
          <div class="map-detail-card ${unlocked ? '' : 'locked'}">
            <div class="detail-title"><span class="detail-icon">${MAP_NODES[id]?.icon || '•'}</span><div><h3>${escapeHTML(loc?.name || id)}</h3><small>${escapeHTML(loc?.subtitle || '')}</small></div></div>
            ${unlocked ? `<p>${escapeHTML(loc?.legendary ? 'Un lieu sacré où les vents murmurent les noms des légendes.' : loc?.island ? 'Une île oubliée, ouverte aux dresseurs qui ont prouvé leur valeur.' : 'Un village de la route des sables.')}</p>
            <div class="detail-line"><span>Type</span><strong>${escapeHTML(loc?.type || '—')}</strong></div>
            ${arena}
            <div class="detail-line"><span>Badges requis</span><strong>${loc?.order >= 0 && loc?.order < 8 ? loc.order : '—'}</strong></div>
            ${current ? '<div class="current-tag">Tu es ici</div>' : `<button class="btn gold full" id="travel-btn">Voyager vers ${escapeHTML(loc?.name || id)}</button>`}`
            : `<div class="lock-note">🔒 ${escapeHTML(lockReason(id))}</div>`}
          </div>`
        const travel = detail.querySelector('#travel-btn')
        if (travel) travel.addEventListener('click', () => {
          closeModal()
          onTravel(id)
        })
      }
      wrap.querySelectorAll('.map-node').forEach(node => {
        node.addEventListener('click', () => select(node.dataset.loc))
        node.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(node.dataset.loc) } })
      })
      select(selected)
    }
  })
  return modal
}

// ---------------------------------------------------------------------------
// Player card
// ---------------------------------------------------------------------------
export function showPlayerCard() {
  const s = G.save
  const rank = rankInfo()
  const teamHTML = s.team.map(mon => {
    const sp = displaySpecies(mon)
    return `<div class="card-mon">
      <div class="card-mon-art">${monThumb(mon, 66)}</div>
      <div class="card-mon-info"><strong>${escapeHTML(sp.name)}</strong><span>Nv. ${mon.level}</span>${hpBar(mon, false)}</div>
    </div>`
  }).join('')
  openModal({
    title: 'Carte de Dresseur', icon: '🎴', wide: true, className: 'card-modal',
    content: `<div class="trainer-card-wrap">
      <div class="trainer-card">
        <div class="tc-shine"></div>
        <div class="tc-top"><span>POKÉMON TEMPLIER</span><span class="tc-id">N° ${String(s.createdAt).slice(-6)}</span></div>
        <div class="tc-main">
          <div class="tc-avatar">${playerAvatarSVG(s.profile.gender, 118)}</div>
          <div class="tc-identity">
            <span class="eyebrow">Dresseur ${s.profile.gender === 'fille' ? '· Dresseuse' : ''}</span>
            <h2>${escapeHTML(s.profile.name)}</h2>
            <div class="tc-meta"><span>${s.profile.age} ans</span><span>${s.profile.gender === 'fille' ? 'Fille' : 'Garçon'}</span><span>${escapeHTML(LOCATIONS[s.location]?.name || 'Templier')}</span></div>
            <div class="tc-rank">Ligue : <strong style="color:${rank.color}">${rank.name}</strong></div>
          </div>
        </div>
        <div class="tc-badges">${BADGES.map(b => badgeSVG(b.color, b.glyph, 42, s.badges.includes(b.id))).join('')}</div>
        <div class="tc-stats">
          <div><span>Badges</span><strong>${s.badges.length}/8</strong></div>
          <div><span>Pokémon</span><strong>${s.team.length + s.box.length}</strong></div>
          <div><span>Amis</span><strong>${s.friends.length}</strong></div>
          <div><span>Victoires</span><strong>${s.stats.wins}</strong></div>
        </div>
        <div class="tc-footer"><span>${escapeHTML(objective())}</span><span>${formatPlaytime(s.playtime)}</span></div>
      </div>
      <div class="card-side">
        <h3>Équipe</h3>
        <div class="card-team">${teamHTML || '<p class="muted">Aucun Pokémon.</p>'}</div>
        <div class="card-actions">
          <button class="btn" id="pc-world">🗺 Carte du monde</button>
          <button class="btn" id="pc-team">🐾 Gérer l’équipe</button>
          <button class="btn gold" id="pc-save">💾 Sauvegarder</button>
        </div>
        <p class="save-note">Dernière sauvegarde : ${saveTimeAgo(s.lastSaved)}</p>
      </div>
    </div>`,
    onMount: wrap => {
      paintThumbs(wrap)
      wrap.querySelector('#pc-world').addEventListener('click', () => { closeModal(); setTimeout(() => showWorldMap(id => window.__travelTo?.(id)), 180) })
      wrap.querySelector('#pc-team').addEventListener('click', () => { closeModal(); setTimeout(showTeam, 180) })
      wrap.querySelector('#pc-save').addEventListener('click', () => { persist(false) })
    }
  })
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
export function showTeam() {
  const s = G.save
  let selected = s.team[0]?.uid || null
  const render = () => {
    const mon = s.team.find(m => m.uid === selected) || s.team[0]
    if (mon) selected = mon.uid
    const team = s.team.map((m, i) => {
      const sp = displaySpecies(m)
      return `<button class="team-slot ${m.uid === selected ? 'active' : ''} ${m.hp <= 0 ? 'fainted' : ''}" data-uid="${m.uid}">
        <span class="slot-index">${i + 1}</span>
        <span class="slot-art">${monThumb(m, 54)}</span>
        <span class="slot-main"><strong>${escapeHTML(sp.name)}</strong><small>Nv. ${m.level} · ${m.hp}/${statsOf(m).maxHp} PV</small>${hpBar(m, false)}</span>
        ${m.status ? `<span class="status-dot ${m.status}">${m.status[0].toUpperCase()}</span>` : ''}
      </button>`
    }).join('')
    const box = s.box.map((m, i) => {
      const sp = displaySpecies(m)
      return `<div class="box-slot"><span class="slot-art">${monThumb(m, 42)}</span><span><strong>${escapeHTML(sp.name)}</strong><small>Nv. ${m.level}</small></span><button class="mini-btn" data-add="${m.uid}">Ajouter</button></div>`
    }).join('')
    const detail = mon ? (() => {
      const sp = displaySpecies(mon)
      const st = statsOf(mon)
      const items = allItems().filter(it => it.heal || it.revive || it.cure)
      return `<div class="team-detail">
        <div class="td-head"><div class="td-art">${monThumb(mon, 100)}</div><div><span class="eyebrow">${sp.types.map(t => typeChip(t, true)).join(' ')}</span><h3>${escapeHTML(sp.name)}</h3><p class="muted">${escapeHTML(sp.desc)}</p></div></div>
        <div class="td-stats"><span>PV <b>${mon.hp}/${st.maxHp}</b></span><span>ATQ <b>${st.atk}</b></span><span>DÉF <b>${st.def}</b></span><span>ATQ SP <b>${st.spa}</b></span><span>DÉF SP <b>${st.spd}</b></span><span>VIT <b>${st.spe}</b></span></div>
        <div class="xp-row"><span>XP</span><div class="xp-track"><div class="xp-fill" style="width:${Math.min(100, mon.xp / (24 * mon.level + 14 * Math.pow(mon.level, 1.55)) * 100)}%"></div></div><small>${mon.xp} / ${Math.floor(24 * mon.level + 14 * Math.pow(mon.level, 1.55))}</small></div>
        <div class="move-grid">${mon.moves.map(mv => `<div class="move-mini">${typeChip(MOVES[mv.id]?.type || 'Normal', true)}<strong>${escapeHTML(MOVES[mv.id]?.name || mv.id)}</strong><small>${mv.pp}/${mv.maxPp} PP</small></div>`).join('')}</div>
        <div class="td-actions">
          <button class="btn" data-lead="${mon.uid}">Mettre en tête</button>
          ${items.map(it => `<button class="btn small" data-use="${it.id}">${it.icon} ${it.name} (${itemCount(it.id)})</button>`).join('')}
          <button class="btn danger small" data-release="${mon.uid}" ${s.team.length <= 1 ? 'disabled' : ''}>Envoyer dans la boîte</button>
        </div>
      </div>`
    })() : '<p class="muted">Ton équipe est vide.</p>'
    const wrap = document.querySelector('.team-modal .modal-body')
    if (!wrap) return
    wrap.innerHTML = `<div class="team-layout"><div class="team-list">${team}</div><div class="team-detail-wrap">${detail}</div></div>
      <div class="box-section"><div class="section-title"><h3>Boîte de stockage</h3><span>${s.box.length} Pokémon</span></div>
      <div class="box-grid">${box || '<p class="muted small">Aucun Pokémon dans la boîte.</p>'}</div></div>`
    paintThumbs(wrap)
    wrap.querySelectorAll('.team-slot').forEach(el => el.addEventListener('click', () => { selected = el.dataset.uid; render() }))
    wrap.querySelectorAll('[data-add]').forEach(el => el.addEventListener('click', () => {
      const m = s.box.find(x => x.uid === el.dataset.add)
      if (!m) return
      if (s.team.length >= 6) { toast('Ton équipe est pleine.', '⚠️'); return }
      s.box = s.box.filter(x => x.uid !== m.uid); s.team.push(m); selected = m.uid; persist(); render()
    }))
    wrap.querySelectorAll('[data-lead]').forEach(el => el.addEventListener('click', () => {
      const i = s.team.findIndex(x => x.uid === el.dataset.lead)
      if (i > 0) { const [m] = s.team.splice(i, 1); s.team.unshift(m); persist(); toast('Pokémon placé en tête.', '⭐'); render() }
    }))
    wrap.querySelectorAll('[data-release]').forEach(el => el.addEventListener('click', () => {
      if (s.team.length <= 1) return
      const i = s.team.findIndex(x => x.uid === el.dataset.release)
      if (i < 0) return
      const [m] = s.team.splice(i, 1); s.box.push(m); selected = s.team[0]?.uid; persist(); toast('Pokémon envoyé dans la boîte.', '📦'); render()
    }))
    wrap.querySelectorAll('[data-use]').forEach(el => el.addEventListener('click', () => {
      const item = ITEMS[el.dataset.use]; const m = s.team.find(x => x.uid === selected)
      if (!m || !item) return
      if (!takeItem(el.dataset.use)) { toast('Tu n’en as plus.', '⚠️'); return }
      if (item.heal) {
        const max = statsOf(m).maxHp
        if (m.hp <= 0) { toast('Il faut un Rappel pour un Pokémon K.O.', '⚠️'); addItem(el.dataset.use); return }
        m.hp = Math.min(max, m.hp + item.heal); toast(`${item.name} utilisé sur ${displaySpecies(m).name}.`, '💚')
      } else if (item.revive) {
        if (m.hp > 0) { toast('Ce Pokémon n’est pas K.O.', '⚠️'); addItem(el.dataset.use); return }
        m.hp = Math.floor(statsOf(m).maxHp * item.revive); toast(`${displaySpecies(m).name} est ranimé !`, '🪶')
      } else if (item.cure) {
        m.status = null; toast('Statut soigné.', '💊')
      }
      persist(); render()
    }))
  }
  openModal({
    title: 'Équipe & Boîte', icon: '🐾', wide: true, className: 'team-modal',
    content: '<div class="team-layout"><div class="team-list"></div><div class="team-detail-wrap"></div></div>',
    onMount: render
  })
}

// ---------------------------------------------------------------------------
// Bag
// ---------------------------------------------------------------------------
export function showBag() {
  const s = G.save
  const render = () => {
    const wrap = document.querySelector('.bag-modal .modal-body')
    if (!wrap) return
    const items = allItems()
    const rows = items.map(it => `<div class="item-row">
      <span class="item-icon">${it.icon}</span>
      <span class="item-main"><strong>${escapeHTML(it.name)}</strong><small>${escapeHTML(it.desc)}</small></span>
      <span class="item-count">×${it.n}</span>
      ${(it.heal || it.revive || it.cure) ? `<button class="mini-btn" data-use="${it.id}">Utiliser</button>` : ''}
    </div>`).join('')
    wrap.innerHTML = `<div class="bag-head"><div><span class="eyebrow">Sac de dresseur</span><h3>${s.money.toLocaleString('fr-FR')} ₽</h3></div><span class="bag-count">${items.reduce((a, b) => a + b.n, 0)} objets</span></div>
      <div class="item-list">${rows || '<p class="muted">Ton sac est vide.</p>'}</div>
      <div class="bag-team"><h3>Soigner un Pokémon</h3>${s.team.map(m => {
        const sp = displaySpecies(m)
        return `<div class="bag-mon"><span class="slot-art">${monThumb(m, 44)}</span><span><strong>${escapeHTML(sp.name)}</strong><small>${m.hp}/${statsOf(m).maxHp} PV ${m.status ? '· ' + m.status : ''}</small></span>${hpBar(m, false)}</div>`
      }).join('')}</div>`
    paintThumbs(wrap)
    wrap.querySelectorAll('[data-use]').forEach(el => el.addEventListener('click', () => {
      const item = ITEMS[el.dataset.use]
      const target = s.team.find(m => m.hp > 0 && m.hp < statsOf(m).maxHp) || s.team.find(m => m.hp <= 0)
      if (!target) { toast('Tous tes Pokémon sont en pleine forme.', '✨'); return }
      if (!takeItem(el.dataset.use)) return
      if (item.heal) {
        if (target.hp <= 0) { addItem(el.dataset.use); toast('Utilise un Rappel pour un K.O.', '⚠️'); return }
        target.hp = Math.min(statsOf(target).maxHp, target.hp + item.heal)
      } else if (item.revive) {
        if (target.hp > 0) { addItem(el.dataset.use); toast('Aucun Pokémon K.O.', '⚠️'); return }
        target.hp = Math.floor(statsOf(target).maxHp * item.revive)
      } else if (item.cure) target.status = null
      toast(`${item.name} utilisé sur ${displaySpecies(target).name}.`, '💚')
      persist(); render()
    }))
  }
  openModal({
    title: 'Sac', icon: '🎒', className: 'bag-modal',
    content: '<div class="bag-head"></div>', onMount: render
  })
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
export function showShop() {
  const s = G.save
  const stock = ['potion', 'super_potion', 'hyper_potion', 'rappel', 'antidote', 'sable_ball', 'grande_ball', 'templier_ball']
  const render = () => {
    const wrap = document.querySelector('.shop-modal .modal-body')
    if (!wrap) return
    wrap.innerHTML = `<div class="shop-head"><div><span class="eyebrow">Boutique de Templier</span><h3>${s.money.toLocaleString('fr-FR')} ₽</h3></div><span class="shop-badge">Prix amis</span></div>
      <div class="shop-grid">${stock.map(id => {
        const it = ITEMS[id]
        return `<div class="shop-item"><span class="item-icon">${it.icon}</span><span class="item-main"><strong>${escapeHTML(it.name)}</strong><small>${escapeHTML(it.desc)}</small><span class="price">${it.price} ₽</span></span><button class="mini-btn gold" data-buy="${id}" ${s.money < it.price ? 'disabled' : ''}>Acheter</button></div>`
      }).join('')}</div>
      <p class="muted small">Le marchand accepte les pièces de Templier. Les prix sont fixes, même pour les amis.</p>`
    wrap.querySelectorAll('[data-buy]').forEach(el => el.addEventListener('click', () => {
      const it = ITEMS[el.dataset.buy]
      if (s.money < it.price) { toast('Pas assez de pièces.', '⚠️'); return }
      s.money -= it.price; addItem(el.dataset.buy); persist(); toast(`${it.name} acheté.`, it.icon); render()
    }))
  }
  openModal({ title: 'Boutique', icon: '🛒', className: 'shop-modal', content: '', onMount: render })
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------
export function showFriends(onFriendBattle) {
  const s = G.save
  const render = () => {
    const wrap = document.querySelector('.friends-modal .modal-body')
    if (!wrap) return
    const cards = s.friends.map(f => {
      const bond = Math.min(5, f.bond || 1)
      return `<div class="friend-card">
        ${friendAvatar(f, 58)}
        <div class="friend-main"><strong>${escapeHTML(f.name)}</strong><small>${escapeHTML(f.role || 'Ami de route')}</small><span class="friend-meta">Rencontré à ${escapeHTML(f.metAt || 'Templier')} · ${hearts(bond)}</span></div>
        <div class="friend-actions">
          <button class="mini-btn" data-talk="${f.id}">Parler</button>
          <button class="mini-btn" data-gift="${f.id}">Cadeau</button>
          ${(f.leaderId || f.trainerId) ? `<button class="mini-btn gold" data-battle="${f.id}">Défier</button>` : ''}
        </div>
      </div>`
    }).join('')
    wrap.innerHTML = `<div class="friends-head"><div><span class="eyebrow">Cercle d’amis</span><h3>${s.friends.length} ami${s.friends.length > 1 ? 's' : ''}</h3><p class="muted">L’amitié se cultive : parle, offre des cadeaux, et affronte tes amis.</p></div><div class="friend-count-big">${s.friends.length}</div></div>
      <div class="friend-list">${cards}</div>
      <p class="muted small">Les demandes d’amis arrivent en explorant les villages et en battant les Champions d’arène.</p>`
    wrap.querySelectorAll('[data-talk]').forEach(el => el.addEventListener('click', async () => {
      const f = s.friends.find(x => x.id === el.dataset.talk)
      f.bond = Math.min(5, (f.bond || 1) + 1)
      persist()
      await Dialog.show({
        speaker: f.name, color: f.color, portrait: f.kind === 'professor' ? professorSVG() : (f.avatar ? leaderAvatarSVG(f.avatar, 112, f.color) : ''),
        text: f.kind === 'professor'
          ? 'Le sable garde la mémoire de ceux qui prennent soin des autres. Continue, mon jeune ami. Le monde de Templier a besoin de toi.'
          : f.quote || 'Un dresseur qui écoute ses Pokémon n’est jamais seul. Reviens quand tu veux, l’ami.'
      })
      render()
    }))
    wrap.querySelectorAll('[data-gift]').forEach(el => el.addEventListener('click', () => {
      const f = s.friends.find(x => x.id === el.dataset.gift)
      const today = new Date().toISOString().slice(0, 10)
      s.friendGifts ||= {}
      if (s.friendGifts[f.id] === today) { toast('Tu as déjà reçu un cadeau aujourd’hui.', '🎁'); return }
      s.friendGifts[f.id] = today
      f.bond = Math.min(5, (f.bond || 1) + 1)
      const pool = ['potion', 'super_potion', 'sable_ball', 'grande_ball', 'antidote']
      const item = pool[Math.floor(Math.random() * pool.length)]
      addItem(item, item.includes('ball') ? 2 : 1)
      persist(); toast(`${f.name} t’offre ${ITEMS[item].name} !`, '🎁'); render()
    }))
    wrap.querySelectorAll('[data-battle]').forEach(el => el.addEventListener('click', () => {
      const f = s.friends.find(x => x.id === el.dataset.battle)
      if (onFriendBattle) { closeModal(); onFriendBattle(f) }
      else toast('Ce défi n’est pas disponible ici.', '⚠️')
    }))
  }
  openModal({ title: 'Amis', icon: '🤝', className: 'friends-modal', content: '', onMount: render })
}

// ---------------------------------------------------------------------------
// Pokédex 1G → 9G
// ---------------------------------------------------------------------------
export function showDex() {
  const s = G.save
  if (!s) return
  let active = 'all'
  const all = Object.values(SPECIES)
  const render = () => {
    const wrap = document.querySelector('.dex-modal .modal-body')
    if (!wrap) return
    const list = all
      .filter(sp => active === 'all' || (active === 'templier' ? !sp.gen : sp.gen === Number(active)))
      .sort((a, b) => (a.gen || 0) - (b.gen || 0) || a.name.localeCompare(b.name, 'fr'))
    const seenCount = all.filter(sp => s.seen[sp.id]).length
    const caughtCount = all.filter(sp => s.caught[sp.id]).length
    const tabs = [{ id: 'all', label: 'Tous' }, { id: 'templier', label: 'Templier' }, ...GENERATIONS.map(g => ({ id: String(g.gen), label: `${g.label} · ${g.region}` }))]
    wrap.innerHTML = `
      <div class="dex-toolbar">
        <div class="dex-tabs">${tabs.map(t => `<button class="dex-tab ${active === t.id ? 'active' : ''}" data-dex-tab="${t.id}">${t.label}</button>`).join('')}</div>
        <span class="dex-count"><b>${seenCount}</b> vus · <b>${caughtCount}</b> capturés · ${all.length} espèces</span>
      </div>
      <div class="dex-grid">
        ${list.map(sp => {
          const seen = !!s.seen[sp.id]
          const caught = !!s.caught[sp.id]
          const gen = sp.gen ? `${sp.gen}G · ${sp.region}` : 'Templier'
          return `<div class="dex-card ${caught ? 'caught' : seen ? 'seen' : 'unseen'}" title="${escapeHTML(seen ? sp.name : 'Pokémon non rencontré')}">
            <span class="dex-art"><canvas width="108" height="108" style="width:54px;height:54px" data-species="${sp.id}"></canvas></span>
            <span class="dex-info">
              <strong>${seen ? escapeHTML(sp.name) : '???'}</strong>
              <small>${gen}</small>
              ${seen ? `<span class="type-row">${sp.types.map(t => `<span class="type-chip" style="--tc:${TYPE_COLORS[t]}">${TYPE_ICONS[t] || ''} ${escapeHTML(t)}</span>`).join('')}</span>` : '<small>Rencontre-le dans les herbes.</small>'}
            </span>
            <span class="dex-status">${caught ? '✓' : seen ? '👁' : '·'}</span>
          </div>`
        }).join('')}
      </div>
      <p class="dex-note"><strong>Visiteurs des 9 générations :</strong> les Pokémon venus de Kanto à Paldea apparaissent dans les herbes de Templier. La génération à l’honneur change chaque heure, et chaque village a ses favoris. Les sprites sont dessinés en procédural, sans asset externe.</p>`
    paintThumbs(wrap)
    wrap.querySelectorAll('[data-dex-tab]').forEach(el => el.addEventListener('click', () => {
      active = el.dataset.dexTab
      render()
    }))
  }
  openModal({
    title: 'Pokédex de Templier · 1G → 9G', icon: '📘', wide: true, className: 'dex-modal',
    content: '', onMount: render
  })
}

// ---------------------------------------------------------------------------
// Online / league — alpha 1.0, unlocked with the first badge
// ---------------------------------------------------------------------------
export function showOnline({ onLeagueBattle }) {
  const s = G.save
  if (!s) return
  const access = hasOnlineAccess()

  if (!access) {
    openModal({
      title: 'Poke Online MMO · alpha 1.0', icon: '🌐', wide: true, className: 'online-modal',
      content: `<div class="alpha-banner">
          <div class="ab-icon">🌐</div>
          <div><strong>Alpha 1.0 prête à s’ouvrir</strong><small>Ligue, chat et échanges. Un seul badge suffit.</small></div>
          <span class="alpha-badge">alpha 1.0</span>
        </div>
        <div class="online-locked">
          <div class="lock-orb">🔒</div>
          <h3>Un badge, et le monde te voit</h3>
          <p>Poke Online MMO alpha 1.0 se déverrouille dès ton <strong>premier badge</strong>. Bats le Champion de Sablonville, puis reviens ici avec <strong>O</strong>.</p>
          <div class="online-badge-req"><span class="req-dot"></span>${s.badges.length}/1 badge · accès verrouillé</div>
        </div>
        <p class="muted small">Le Professeur Sable : « Le sable garde les secrets, mais un badge ouvre toutes les portes. »</p>`
    })
    return
  }

  const rank = rankInfo()
  const next = nextRank()
  const friends = s.friends.filter(f => f.kind !== 'professor')
  const chat = [
    { who: 'Système', text: `Bienvenue dans l’alpha 1.0, ${s.profile.name}. Salon « Place de Sablonville ».`, system: true },
    ...friends.slice(0, 3).map(f => ({ who: f.name, text: f.quote || 'Content de te voir connecté !' }))
  ]
  const replies = [
    'Bien joué pour ton badge ! On se croise bientôt sur la route.',
    'Tu as vu les visiteurs 9G dans les herbes ? Ils sont incroyables.',
    'Je t’attends pour un échange dès que tu veux.',
    'La Ligue alpha est rude aujourd’hui. Entraîne-toi avant de lancer un combat.',
    'Le Professeur Sable dit que le sable se souvient de tout. Même de nos défaites.'
  ]
  let tradeMon = s.team[0]?.uid || null
  let tradeFriend = friends[0]?.id || null
  const tradePool = Object.keys(SPECIES).filter(id => !['latias', 'latios', 'rayquaza'].includes(id))

  const render = (active = 'league') => {
    const wrap = document.querySelector('.online-modal .modal-body')
    if (!wrap) return
    const rankIndex = ONLINE_RANKS.findIndex(r => r.id === rank.id)
    const prev = ONLINE_RANKS[rankIndex]
    const span = next ? next.min - prev.min : 1
    const prog = next ? Math.min(100, ((s.online.points - prev.min) / span) * 100) : 100
    const tabs = `<div class="tab-row">
      <button class="tab ${active === 'league' ? 'active' : ''}" data-tab="league">⚔ Ligue</button>
      <button class="tab ${active === 'chat' ? 'active' : ''}" data-tab="chat">💬 Chat</button>
      <button class="tab ${active === 'trade' ? 'active' : ''}" data-tab="trade">🔄 Échange</button>
    </div>`
    let body = ''
    if (active === 'league') {
      body = `<div class="online-rank">
          <div class="rank-emblem" style="--rc:${rank.color}">${rank.name[0]}</div>
          <div class="rank-main"><span class="eyebrow">Rang actuel</span><h3 style="color:${rank.color}">${rank.name}</h3>
          <div class="rank-progress"><div style="width:${prog}%;background:${rank.color}"></div></div>
          <small>${s.online.points} points ${next ? `· ${next.min - s.online.points} avant ${next.name}` : '· rang maximal'}</small></div>
          <div class="rank-record"><span><b>${s.online.wins}</b> victoires</span><span><b>${s.online.losses}</b> défaites</span></div>
        </div>
        <div class="league-info">
          <div class="info-tile"><span>Adversaire</span><strong>Dresseur alpha</strong><small>IA locale de secours</small></div>
          <div class="info-tile"><span>Format</span><strong>${rank.teamSize} contre ${rank.teamSize}</strong><small>Niveau ~${rank.level}</small></div>
          <div class="info-tile"><span>Récompense</span><strong>+1 point</strong><small>et des pièces</small></div>
        </div>
        <button class="btn gold full big" id="league-fight">Chercher un combat de Ligue</button>
        <p class="muted small">Alpha 1.0 : les adversaires sont simulés localement, sans serveur. Ton pseudo <strong>${escapeHTML(s.profile.name)}</strong> et tes badges sont visibles dans le salon.</p>`
    } else if (active === 'chat') {
      body = `<div class="alpha-banner compact">
          <div class="ab-icon">💬</div>
          <div><strong>Salon « Place de Sablonville »</strong><small>${friends.length + 1} dresseurs connectés · alpha 1.0</small></div>
        </div>
        <div class="chat-log">${chat.map(m => `<div class="chat-line ${m.me ? 'me' : ''} ${m.system ? 'system' : ''}"><b>${escapeHTML(m.who)}</b><span>${escapeHTML(m.text)}</span></div>`).join('')}</div>
        <div class="chat-compose">
          <input id="chat-input" maxlength="120" placeholder="Écrire un message…" autocomplete="off">
          <button class="btn gold" id="chat-send">Envoyer</button>
        </div>
        <p class="muted small">Les réponses des amis sont simulées. Le chat réel arrivera dans une prochaine alpha.</p>`
    } else {
      const mon = s.team.find(m => m.uid === tradeMon)
      const friend = friends.find(f => f.id === tradeFriend)
      body = `<div class="alpha-banner compact">
          <div class="ab-icon">🔄</div>
          <div><strong>Échange sécurisé</strong><small>Choisis un Pokémon et un ami. L’échange est simulé localement.</small></div>
        </div>
        <div class="trade-live">
          <div class="trade-col">
            <span class="eyebrow">Ton Pokémon</span>
            ${s.team.map(m => `<button class="trade-mon ${m.uid === tradeMon ? 'active' : ''}" data-trade-mon="${m.uid}">${monThumb(m, 38)}<span><strong>${escapeHTML(displaySpecies(m).name)}</strong><small>Nv. ${m.level}</small></span></button>`).join('')}
          </div>
          <div class="trade-swap">⇄</div>
          <div class="trade-col">
            <span class="eyebrow">Ami</span>
            ${friends.length ? friends.map(f => `<button class="trade-mon ${f.id === tradeFriend ? 'active' : ''}" data-trade-friend="${f.id}"><span class="friend-avatar generic" style="--c:${f.color || '#8ecae6'}"><span>${escapeHTML((f.name || '?')[0])}</span></span><span><strong>${escapeHTML(f.name)}</strong><small>${escapeHTML(f.role || 'Ami')}</small></span></button>`).join('') : '<p class="muted small">Rencontre des habitants et deviens leur ami pour échanger.</p>'}
          </div>
        </div>
        <button class="btn gold full big" id="trade-go" ${s.team.length < 2 || !friend || !mon ? 'disabled' : ''}>Proposer l’échange${mon ? ` · ${escapeHTML(displaySpecies(mon).name)}` : ''}</button>
        <p class="muted small">${s.team.length < 2 ? 'Il te faut au moins deux Pokémon dans ton équipe.' : friend ? `L’échange se fera avec ${escapeHTML(friend.name)}. Ton Pokémon sera remplacé par une espèce de niveau équivalent.` : 'Choisis un ami pour continuer.'}</p>`
    }
    wrap.innerHTML = `<div class="alpha-banner">
        <div class="ab-icon">🌐</div>
        <div><strong>Poke Online MMO · alpha 1.0</strong><small>Serveurs simulés localement · accès débloqué par ${s.badges.length} badge${s.badges.length > 1 ? 's' : ''}</small></div>
        <span class="alpha-badge">alpha 1.0</span>
      </div>
      ${tabs}${body}
      <div class="online-footer"><span>Pseudo visible : <b>${escapeHTML(s.profile.name)}</b></span><span>${s.badges.length}/8 badges · ${friends.length} amis</span></div>`

    wrap.querySelectorAll('[data-tab]').forEach(el => el.addEventListener('click', () => render(el.dataset.tab)))
    wrap.querySelector('#league-fight')?.addEventListener('click', () => {
      closeModal()
      onLeagueBattle?.()
    })

    if (active === 'chat') {
      const input = wrap.querySelector('#chat-input')
      const send = () => {
        const text = input.value.trim()
        if (!text) return
        chat.push({ who: s.profile.name, text, me: true })
        input.value = ''
        render('chat')
        setTimeout(() => {
          if (!document.querySelector('.online-modal')) return
          const friend = friends[Math.floor(Math.random() * Math.max(1, friends.length))]
          chat.push({ who: friend?.name || 'DresseurAlpha', text: replies[Math.floor(Math.random() * replies.length)] })
          render('chat')
        }, 650)
      }
      wrap.querySelector('#chat-send')?.addEventListener('click', send)
      input?.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); send() } })
      const log = wrap.querySelector('.chat-log')
      if (log) log.scrollTop = log.scrollHeight
      input?.focus()
    }

    if (active === 'trade') {
      wrap.querySelectorAll('[data-trade-mon]').forEach(el => el.addEventListener('click', () => { tradeMon = el.dataset.tradeMon; render('trade') }))
      wrap.querySelectorAll('[data-trade-friend]').forEach(el => el.addEventListener('click', () => { tradeFriend = el.dataset.tradeFriend; render('trade') }))
      wrap.querySelector('#trade-go')?.addEventListener('click', async () => {
        const mon = s.team.find(m => m.uid === tradeMon)
        const friend = friends.find(f => f.id === tradeFriend)
        if (!mon || !friend || s.team.length < 2) return
        const choice = await Dialog.show({
          speaker: friend.name, color: friend.color || '#f0c96b',
          text: `Tu me proposes ${displaySpecies(mon).name} (Nv. ${mon.level}) ? En échange, je te confie un Pokémon de niveau équivalent. D’accord ?`,
          choices: [{ label: 'Oui, échanger', value: 'yes', sub: 'Échange alpha simulé' }, { label: 'Non, annuler', value: 'no' }]
        })
        if (choice !== 'yes') return
        const newId = tradePool[Math.floor(Math.random() * tradePool.length)]
        const idx = s.team.findIndex(m => m.uid === mon.uid)
        const replacement = createMonster(newId, mon.level)
        s.team[idx] = replacement
        s.seen[newId] = true
        s.caught[newId] = true
        tradeMon = replacement.uid
        persist()
        toast(`Échange réussi : ${displaySpecies(replacement).name} rejoint ton équipe !`, '🔄')
        render('trade')
      })
    }
  }

  openModal({
    title: 'Poke Online MMO · alpha 1.0', icon: '🌐', wide: true, className: 'online-modal',
    content: '', onMount: () => render()
  })
}

// ---------------------------------------------------------------------------
// Settings / help
// ---------------------------------------------------------------------------
export function showSettings({ onReset, onSoundChange } = {}) {
  const s = G.save
  const render = () => {
    const wrap = document.querySelector('.settings-modal .modal-body')
    if (!wrap) return
    wrap.innerHTML = `<div class="setting-row"><div><strong>Effets sonores</strong><small>Petits sons d’interface et de combat.</small></div><button class="toggle ${s.settings.sound ? 'on' : ''}" id="set-sound"><span></span></button></div>
      <div class="setting-row"><div><strong>Animations réduites</strong><small>Moins de particules et de secousses.</small></div><button class="toggle ${s.settings.reducedMotion ? 'on' : ''}" id="set-motion"><span></span></button></div>
      <div class="setting-row"><div><strong>Texte plus grand</strong><small>Dialogue, aide et tutoriel plus lisibles. Idéal dès 7 ans.</small></div><button class="toggle ${s.settings.largeText ? 'on' : ''}" id="set-large"><span></span></button></div>
      <div class="setting-row"><div><strong>Sauvegarder maintenant</strong><small>Ta progression est aussi sauvegardée automatiquement.</small></div><button class="btn" id="set-save">💾 Sauver</button></div>
      <div class="setting-row"><div><strong>Exporter la sauvegarde</strong><small>Télécharge un fichier JSON de secours.</small></div><button class="btn" id="set-export">⬇ Exporter</button></div>
      <div class="setting-row danger-row"><div><strong>Recommencer l’aventure</strong><small>Efface la sauvegarde locale. Action irréversible.</small></div><button class="btn danger" id="set-reset">Réinitialiser</button></div>
      <div class="credits-box"><strong>Pokémon Templier</strong><span>Fan game jouable, création originale. Aucune affiliation avec Nintendo, Game Freak ou The Pokémon Company.</span><span>Professeur Sable, région de Templier, créatures et musiques procédurales.</span></div>`
    wrap.querySelector('#set-sound').addEventListener('click', () => { s.settings.sound = !s.settings.sound; persist(); onSoundChange?.(s.settings.sound); render() })
    wrap.querySelector('#set-motion').addEventListener('click', () => { s.settings.reducedMotion = !s.settings.reducedMotion; document.body.classList.toggle('reduced-motion', s.settings.reducedMotion); persist(); render() })
    wrap.querySelector('#set-large').addEventListener('click', () => { s.settings.largeText = !s.settings.largeText; document.body.classList.toggle('large-text', s.settings.largeText); persist(); render() })
    wrap.querySelector('#set-save').addEventListener('click', () => persist(false))
    wrap.querySelector('#set-export').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pokemon-templier-${s.profile.name}.json`; a.click(); URL.revokeObjectURL(a.href)
      toast('Sauvegarde exportée.', '⬇')
    })
    wrap.querySelector('#set-reset').addEventListener('click', async () => {
      const choice = await Dialog.show({ speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Effacer une sauvegarde, c’est effacer une histoire. Es-tu sûr de vouloir recommencer ?', choices: [{ label: 'Oui, recommencer', value: 'yes', sub: 'Efface la partie' }, { label: 'Non, garder ma partie', value: 'no' }] })
      if (choice === 'yes') { onReset?.() }
    })
  }
  openModal({ title: 'Options', icon: '⚙️', className: 'settings-modal', content: '', onMount: render })
}

export function showHelp() {
  const s = G.save
  openModal({
    title: 'Aide & Objectif', icon: '❔', className: 'help-modal',
    content: `<div class="help-objective"><span class="eyebrow">Objectif actuel</span><h3>${escapeHTML(objective())}</h3></div>
      <div class="help-grid">
        <div class="help-card"><h4>Se déplacer</h4><p>Flèches / ZQSD / WASD, ou le pavé tactile. Sur mobile, utilise le joystick.</p></div>
        <div class="help-card"><h4>Interagir</h4><p>E / Espace / bouton A. Parle aux PNJ, entre dans les bâtiments et examine les autels.</p></div>
        <div class="help-card"><h4>Menus</h4><p>M : carte · C : dresseur · F : amis · O : online · K : Pokédex · B : sac · Échap : menu.</p></div>
        <div class="help-card"><h4>Combat</h4><p>Choisis une capacité. Les types comptent : regarde les couleurs. Change de Pokémon ou utilise un objet si ça tourne mal.</p></div>
        <div class="help-card"><h4>Herbes hautes</h4><p>Marche dans les herbes pour rencontrer des Pokémon sauvages des 9 générations. Les Sable Balls servent à les capturer.</p></div>
        <div class="help-card"><h4>Progression</h4><p>8 villages, 8 arènes. Dès 1 badge : Poke Online alpha 1.0. Au 4e badge : Bracelet Templier, Méga-Templion et Sanctuaire des Vents. Les îles s’ouvrent après les 8 badges.</p></div>
        <div class="help-card"><h4>Tutoriel</h4><p>Le tutoriel guidé suit tes premières actions. Tu peux le passer avec ✕ ou le relancer depuis le menu (Tutoriel).</p></div>
        <div class="help-card"><h4>Accessible dès 7 ans</h4><p>Textes simples, tutoriel guidé, introduction passable et option « Texte plus grand » dans les réglages. Aucun achat, aucune donnée envoyée.</p></div>
      </div>
      <div class="help-tip"><strong>Astuce du Professeur Sable :</strong> à Oubar, Blue et Red t’entraînent sans limite. Un bon dresseur sait quand il faut retourner s’entraîner.</div>`
  })
}
