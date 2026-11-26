import {
  LOCATIONS, LOCATION_ORDER, LEADERS, MASTER, RED_TRAINING, BLUE_TRAINING, ISLAND_TOWER,
  BADGES, SPECIES, TYPE_COLORS, TYPE_ICONS, ITEMS
} from './data.js'
import {
  G, persist, addBadge, hasBadge, addItem, healTeam, healOne, createMonster, addMonster,
  isFriend, addFriend, toast, escapeHTML, statsOf, displaySpecies, locationUnlocked,
  registerCaught, maxTeamLevel, objective, formatPlaytime
} from './state.js'
import { drawTrainer, drawCreature, leaderAvatarSVG, professorSVG, badgeSVG, ballSVG } from './art.js'
import { Dialog, showShop, openModal, closeModal } from './ui.js'
import { startBattle } from './battle.js'
import { sfx } from './audio.js'

const TS = 56
const MW = 30
const MH = 20

const THEME = {
  sablonville: 'sand', oubar: 'canyon', verdazur: 'oasis', cendrelac: 'volcano',
  aquacorde: 'ocean', voltaria: 'storm', noctemport: 'night', cimesacree: 'snow',
  sanctuaire: 'sacred', ile_epreuves: 'sacred', ile_ligue: 'league'
}

const BLOCKED = new Set([2, 3, 4, 8, 9, 10])

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

function npcAvatar(npc) {
  const styles = ['short', 'long', 'spiky', 'cap', 'bun', 'wavy']
  const hairs = ['#3a2418', '#6b3f2a', '#7a4a22', '#2b2118', '#d9d4f0', '#8a4a2a']
  const skins = ['#e8c39e', '#d9a47a', '#c98a5a', '#8a5a3b', '#6b4b3b', '#e8b48a']
  const h = hashStr(npc.id)
  let style = styles[h % styles.length]
  if (npc.role === 'champion') style = 'cap'
  if (npc.role === 'child') style = 'short'
  return {
    skin: skins[(h >> 3) % skins.length],
    hair: hairs[(h >> 5) % hairs.length],
    style,
    outfit: npc.color || '#3a86ff',
    accent: '#f0c96b'
  }
}

function buildingsFor(loc) {
  if (loc.id === 'sanctuaire') return []
  const list = [
    { id: 'arena', kind: loc.id === 'ile_epreuves' ? 'tower' : loc.id === 'ile_ligue' ? 'league' : 'arena', x: 12, y: 1, w: 6, h: 4, door: { x: 15, y: 5 }, label: loc.id === 'ile_epreuves' ? 'Tour des Huit Arènes' : loc.id === 'ile_ligue' ? 'Ligue Templier' : 'Arène' },
    { id: 'center', kind: 'center', x: 4, y: 6, w: 4, h: 3, door: { x: 6, y: 9 }, label: 'Centre Pokémon' },
    { id: 'shop', kind: 'shop', x: 22, y: 6, w: 4, h: 3, door: { x: 24, y: 9 }, label: 'Boutique' }
  ]
  if (loc.id === 'sablonville') list.push({ id: 'lab', kind: 'lab', x: 4, y: 12, w: 4, h: 3, door: { x: 6, y: 15 }, label: 'Laboratoire Sable' })
  else if (loc.id !== 'ile_ligue') list.push({ id: 'house', kind: 'house', x: 22, y: 12, w: 4, h: 3, door: { x: 24, y: 15 }, label: 'Maison' })
  return list
}

function altarsFor(loc) {
  if (loc.id !== 'sanctuaire') return []
  return [
    { id: 'latias', name: 'Latias', x: 8, y: 8, color: '#e4572e', level: 30, title: 'L’esprit des vents du sud', lore: 'Une lueur écarlate glisse entre les colonnes. Latias t’observe, curieuse et prudente.' },
    { id: 'latios', name: 'Latios', x: 15, y: 6, color: '#3a86ff', level: 30, title: 'Le cœur de cristal', lore: 'L’air vibre d’un chant cristallin. Latios descend des nuages, les yeux brillants.' },
    { id: 'rayquaza', name: 'Rayquaza', x: 22, y: 8, color: '#3fae6a', level: 38, title: 'Le serpent du ciel', lore: 'Le ciel se fend. Rayquaza, gardien des serments, juge ta détermination.' }
  ]
}

export class World {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.opts = opts
    this.keys = new Set()
    this.touch = { x: 0, y: 0 }
    this.locId = null
    this.loc = null
    this.player = { x: 0, y: 0, r: 12, speed: 170, dir: 'down', walk: 0, moving: false }
    this.cam = { x: 0, y: 0 }
    this.prompt = null
    this.lastPromptText = ''
    this.raf = 0
    this.lastTime = 0
    this.dust = []
    this.encounterCooldown = 0
    this.grassDistance = 0
    this.busy = false
    this.sand = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), s: .4 + Math.random() }))
    this.bind()
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  bind() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'z', 'q'].includes(k)) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') e.preventDefault()
      }
      if (e.repeat) return
      this.keys.add(k)
      if (k === 'e' || k === ' ') this.interact()
      if (['m', 'c', 'p', 'f', 'o', 'b', 'escape', 'h'].includes(k) && !this.isPaused()) {
        this.opts.onMenu?.(k)
      }
    })
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()))
    window.addEventListener('blur', () => { this.keys.clear(); this.touch.x = this.touch.y = 0 })

    const controls = document.getElementById('touch-controls')
    if (controls) {
      controls.addEventListener('pointerdown', e => {
        const btn = e.target.closest('[data-dir]')
        if (btn) {
          e.preventDefault()
          const d = btn.dataset.dir
          this.touch.x = d === 'left' ? -1 : d === 'right' ? 1 : 0
          this.touch.y = d === 'up' ? -1 : d === 'down' ? 1 : 0
          btn.classList.add('pressed')
        }
      })
      const clear = e => {
        const btn = e.target.closest('[data-dir]')
        if (btn) btn.classList.remove('pressed')
        if (!e.buttons) { this.touch.x = 0; this.touch.y = 0 }
      }
      controls.addEventListener('pointerup', e => { if (e.target.closest('[data-dir]')) { this.touch.x = 0; this.touch.y = 0 } })
      controls.addEventListener('pointercancel', () => { this.touch.x = 0; this.touch.y = 0 })
      controls.addEventListener('pointerleave', () => { this.touch.x = 0; this.touch.y = 0 })
      controls.addEventListener('click', e => {
        if (e.target.closest('#touch-a')) this.interact()
        if (e.target.closest('#touch-b')) this.opts.onMenu?.('escape')
      })
    }
    this.canvas.addEventListener('click', () => { if (this.prompt && !this.isPaused()) this.interact() })
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.dpr = dpr
    this.viewW = Math.max(320, rect.width)
    this.viewH = Math.max(240, rect.height)
    this.canvas.width = Math.floor(this.viewW * dpr)
    this.canvas.height = Math.floor(this.viewH * dpr)
  }

  isPaused() {
    if (G.paused) return true
    if (this.busy) return true
    return !!document.querySelector('.modal-layer.open, .dialog-layer, .battle-screen, .intro-layer')
  }

  travelTo(id, opts = {}) {
    const loc = LOCATIONS[id]
    if (!loc) return
    if (!locationUnlocked(id) && !opts.force) {
      toast('Ce lieu est encore verrouillé.', '🔒')
      return
    }
    this.locId = id
    this.loc = loc
    this.buildings = buildingsFor(loc)
    this.altars = altarsFor(loc)
    this.generateMap()
    this.refreshNPCs()
    const spawn = opts.spawn || 'bottom'
    if (spawn === 'center') {
      const center = this.buildings.find(b => b.kind === 'center')
      this.player.x = center ? (center.door.x + .5) * TS : 15.5 * TS
      this.player.y = center ? (center.door.y + 1.3) * TS : 17.5 * TS
    } else if (spawn === 'arena') {
      this.player.x = 15.5 * TS
      this.player.y = 7.2 * TS
    } else {
      this.player.x = 15.5 * TS
      this.player.y = 18.1 * TS
    }
    this.player.dir = 'up'
    this.cam.x = clamp(this.player.x - this.viewW / 2, 0, Math.max(0, MW * TS - this.viewW))
    this.cam.y = clamp(this.player.y - this.viewH / 2, 0, Math.max(0, MH * TS - this.viewH))
    this.dust = []
    this.encounterCooldown = 1.2
    if (G.save) {
      G.save.location = id
      G.save.visited ||= {}
      const first = !G.save.visited[id]
      G.save.visited[id] = true
      persist()
      if (first) G.save.log.push({ at: Date.now(), text: `Découverte de ${loc.name}.` })
    }
    this.opts.onLocation?.(loc, opts)
    this.updatePrompt(true)
    if (opts.banner !== false) this.opts.onBanner?.(loc)
  }

  generateMap() {
    const loc = this.loc
    const rng = mulberry32(hashStr(loc.id))
    const tiles = Array.from({ length: MH }, () => Array(MW).fill(0))
    const variant = Array.from({ length: MH }, () => Array.from({ length: MW }, () => Math.floor(rng() * 3)))
    const set = (x, y, v) => { if (x >= 0 && x < MW && y >= 0 && y < MH) tiles[y][x] = v }
    const rect = (x, y, w, h, v) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, v) }

    // border
    for (let x = 0; x < MW; x++) { set(x, 0, 3); set(x, 1, rng() < .55 ? 3 : 4); set(x, MH - 1, 3); set(x, MH - 2, rng() < .5 ? 3 : 4) }
    for (let y = 0; y < MH; y++) { set(0, y, 3); set(1, y, rng() < .5 ? 3 : 4); set(MW - 1, y, 3); set(MW - 2, y, rng() < .5 ? 3 : 4) }
    // bottom gate
    for (let x = 13; x <= 17; x++) { set(x, MH - 1, 1); set(x, MH - 2, 1) }

    if (loc.id === 'sanctuaire') {
      rect(14, 5, 3, 14, 1)
      rect(7, 8, 17, 3, 1)
      rect(7, 5, 3, 4, 1)
      rect(21, 5, 3, 4, 1)
      // pillars
      for (const [x, y] of [[4, 3], [25, 3], [4, 16], [25, 16], [10, 3], [19, 3], [10, 16], [19, 16]]) set(x, y, 4)
    } else {
      rect(14, 5, 3, 14, 1)
      rect(5, 9, 21, 3, 1)
      rect(5, 11, 3, 5, 1)
      rect(23, 11, 3, 5, 1)
      rect(11, 5, 9, 3, 1)
    }

    // water / lava / ice feature
    const waterType = loc.id === 'cendrelac' ? 8 : (loc.id === 'cimesacree' ? 9 : 2)
    const ponds = loc.id === 'sanctuaire' ? [[3, 9, 2, 4], [26, 9, 2, 4]] : [[2, 5, 2, 3], [27, 10, 2, 3], [9, 15, 3, 2]]
    for (const [x, y, w, h] of ponds) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (tiles[yy]?.[xx] === 0) set(xx, yy, waterType)
      }
    }

    // grass patches
    if (loc.id !== 'sanctuaire' && loc.id !== 'ile_ligue') {
      const zones = [[2, 3, 3, 3], [25, 3, 3, 3], [2, 16, 4, 2], [24, 16, 4, 2], [8, 3, 3, 2], [19, 3, 3, 2], [9, 13, 3, 2], [19, 13, 3, 2]]
      for (const [x, y, w, h] of zones) {
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
          if (tiles[yy]?.[xx] === 0) set(xx, yy, 6)
        }
      }
    }

    // decor flowers / rocks / trees
    for (let y = 2; y < MH - 2; y++) {
      for (let x = 2; x < MW - 2; x++) {
        if (tiles[y][x] !== 0) continue
        const r = rng()
        if (r < .035) set(x, y, 3)
        else if (r < .06) set(x, y, 4)
        else if (r < .12) set(x, y, 5)
      }
    }

    // building blocked areas
    for (const b of this.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(x, y, 10)
    }
    // altar blocked
    for (const a of this.altars) set(a.x, a.y, 10)

    this.tiles = tiles
    this.variant = variant
    this.renderBackground()
  }

  renderBackground() {
    const loc = this.loc
    const pal = loc.palette
    const c = document.createElement('canvas')
    c.width = MW * TS
    c.height = MH * TS
    const ctx = c.getContext('2d')
    const rng = mulberry32(hashStr(loc.id + 'bg'))
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const t = this.tiles[y][x]
        const v = this.variant[y][x]
        const px = x * TS, py = y * TS
        // base ground
        ctx.fillStyle = t === 1 ? pal.path : t === 6 ? pal.ground : t === 8 ? pal.water : t === 9 ? '#dfe8f0' : pal.ground
        ctx.fillRect(px, py, TS, TS)
        if (t === 0) {
          ctx.fillStyle = v === 1 ? pal.ground2 : pal.ground
          ctx.globalAlpha = .45; ctx.fillRect(px, py, TS, TS); ctx.globalAlpha = 1
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = v === 2 ? pal.ground2 : pal.accent
            ctx.globalAlpha = .18
            ctx.fillRect(px + (rng() * TS) | 0, py + (rng() * TS) | 0, 2, 2)
            ctx.globalAlpha = 1
          }
        } else if (t === 1) {
          ctx.fillStyle = pal.path2; ctx.globalAlpha = .5
          ctx.fillRect(px, py, TS, 2); ctx.fillRect(px, py, 2, TS)
          ctx.globalAlpha = 1
          if (rng() < .28) { ctx.fillStyle = pal.accent; ctx.globalAlpha = .18; ctx.fillRect(px + 10 + rng() * 30, py + 10 + rng() * 30, 4, 3); ctx.globalAlpha = 1 }
        } else if (t === 2 || t === 8 || t === 9) {
          const grad = ctx.createLinearGradient(px, py, px, py + TS)
          grad.addColorStop(0, pal.water); grad.addColorStop(1, pal.water2)
          ctx.fillStyle = grad; ctx.fillRect(px, py, TS, TS)
          ctx.strokeStyle = t === 8 ? 'rgba(255,220,150,.35)' : 'rgba(220,250,255,.3)'
          ctx.lineWidth = 2
          for (let i = 0; i < 2; i++) {
            ctx.beginPath(); ctx.moveTo(px + 8 + i * 22, py + 16 + i * 18)
            ctx.quadraticCurveTo(px + 18 + i * 22, py + 10 + i * 18, px + 28 + i * 22, py + 16 + i * 18)
            ctx.stroke()
          }
          if (t === 8) {
            ctx.fillStyle = 'rgba(255,180,80,.5)'
            ctx.beginPath(); ctx.arc(px + 18 + rng() * 20, py + 16 + rng() * 20, 2 + rng() * 3, 0, Math.PI * 2); ctx.fill()
          }
        } else if (t === 3) {
          // tree
          ctx.fillStyle = 'rgba(20,16,10,.18)'
          ctx.beginPath(); ctx.ellipse(px + 28, py + 48, 24, 8, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = pal.tree2
          ctx.fillRect(px + 24, py + 26, 8, 24)
          const g = ctx.createRadialGradient(px + 22, py + 14, 4, px + 28, py + 26, 30)
          g.addColorStop(0, pal.tree); g.addColorStop(1, pal.tree2)
          ctx.fillStyle = g
          ctx.beginPath(); ctx.arc(px + 28, py + 22, 25, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,.12)'
          ctx.beginPath(); ctx.arc(px + 20, py + 14, 10, 0, Math.PI * 2); ctx.fill()
        } else if (t === 4) {
          ctx.fillStyle = 'rgba(20,16,10,.18)'
          ctx.beginPath(); ctx.ellipse(px + 28, py + 46, 22, 7, 0, 0, Math.PI * 2); ctx.fill()
          const g = ctx.createLinearGradient(px, py + 20, px + 56, py + 50)
          g.addColorStop(0, pal.rock); g.addColorStop(1, pal.tree2)
          ctx.fillStyle = g
          ctx.beginPath(); ctx.moveTo(px + 10, py + 46); ctx.lineTo(px + 18, py + 20); ctx.lineTo(px + 34, py + 14); ctx.lineTo(px + 48, py + 30); ctx.lineTo(px + 44, py + 46); ctx.closePath(); ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2; ctx.stroke()
        } else if (t === 5) {
          ctx.strokeStyle = pal.tree2; ctx.lineWidth = 2
          for (let i = 0; i < 3; i++) {
            const fx = px + 12 + i * 15 + rng() * 6, fy = py + 28 + rng() * 12
            ctx.beginPath(); ctx.moveTo(fx, fy + 10); ctx.lineTo(fx, fy); ctx.stroke()
            ctx.fillStyle = i % 2 ? '#f4a6c8' : '#f0c96b'
            ctx.beginPath(); ctx.arc(fx, fy - 2, 5, 0, Math.PI * 2); ctx.fill()
            ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(fx, fy - 2, 2, 0, Math.PI * 2); ctx.fill()
          }
        } else if (t === 6) {
          ctx.fillStyle = pal.ground
          ctx.fillRect(px, py, TS, TS)
          ctx.strokeStyle = pal.tree; ctx.lineWidth = 2
          for (let i = 0; i < 9; i++) {
            const gx = px + 6 + (i % 5) * 11, gy = py + 30 + (i % 3) * 9
            ctx.beginPath(); ctx.moveTo(gx, gy + 12); ctx.quadraticCurveTo(gx + 3, gy + 3, gx + (i % 2 ? 6 : -4), gy - 4); ctx.stroke()
          }
          ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(px, py, TS, TS)
        } else if (t === 10) {
          ctx.fillStyle = pal.ground2; ctx.fillRect(px, py, TS, TS)
          ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(px, py, TS, TS)
        }
      }
    }
    // draw buildings
    for (const b of this.buildings) this.drawBuilding(ctx, b)
    // sanctuary arch decor
    if (loc.id === 'sanctuaire') {
      ctx.strokeStyle = 'rgba(240,201,107,.5)'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(15.5 * TS, 5 * TS, 70, Math.PI, Math.PI * 2); ctx.stroke()
    }
    this.bg = c
  }

  drawBuilding(ctx, b) {
    const loc = this.loc
    const pal = loc.palette
    const px = b.x * TS, py = b.y * TS, w = b.w * TS, h = b.h * TS
    const accent = TYPE_COLORS[loc.type] || pal.accent
    ctx.save()
    // shadow
    ctx.fillStyle = 'rgba(20,16,10,.22)'
    ctx.beginPath(); ctx.ellipse(px + w / 2, py + h + 10, w * .52, 18, 0, 0, Math.PI * 2); ctx.fill()
    if (b.kind === 'arena') this.drawArena(ctx, px, py, w, h, pal, accent)
    else if (b.kind === 'tower') this.drawTower(ctx, px, py, w, h, pal, accent)
    else if (b.kind === 'league') this.drawLeague(ctx, px, py, w, h, pal, accent)
    else if (b.kind === 'center') this.drawCenter(ctx, px, py, w, h, pal)
    else if (b.kind === 'shop') this.drawShop(ctx, px, py, w, h, pal)
    else if (b.kind === 'lab') this.drawLab(ctx, px, py, w, h, pal)
    else this.drawHouse(ctx, px, py, w, h, pal)
    // label
    const doorX = (b.door.x + .5) * TS, doorY = (b.door.y + .35) * TS
    ctx.font = '700 11px "Trebuchet MS",sans-serif'
    ctx.textAlign = 'center'
    const label = b.label.toUpperCase()
    const tw = ctx.measureText(label).width + 18
    ctx.fillStyle = 'rgba(11,17,32,.82)'
    ctx.beginPath(); ctx.roundRect(doorX - tw / 2, doorY + 20, tw, 18, 9); ctx.fill()
    ctx.strokeStyle = 'rgba(240,201,107,.45)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = '#f2e3c2'; ctx.fillText(label, doorX, doorY + 33)
    ctx.restore()
  }

  drawArena(ctx, x, y, w, h, pal, accent) {
    const cx = x + w / 2
    ctx.fillStyle = pal.rock
    ctx.beginPath(); ctx.roundRect(x + 10, y + h * .38, w - 20, h * .6, 8); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.1)'
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 24 + i * 76, y + h * .48, 52, 5)
    // arches
    for (let i = 0; i < 3; i++) {
      const ax = x + w * .22 + i * w * .28
      ctx.fillStyle = '#1a1420'
      ctx.beginPath(); ctx.arc(ax, y + h * .68, 20, Math.PI, Math.PI * 2); ctx.lineTo(ax + 20, y + h * .86); ctx.lineTo(ax - 20, y + h * .86); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(240,201,107,.55)'; ctx.lineWidth = 3; ctx.stroke()
    }
    // dome
    const g = ctx.createLinearGradient(0, y, 0, y + h * .5)
    g.addColorStop(0, shadeLocal(accent, 30)); g.addColorStop(1, shadeLocal(accent, -40))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(cx, y + h * .34, w * .36, h * .32, 0, Math.PI, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(240,201,107,.6)'; ctx.lineWidth = 4; ctx.stroke()
    // roof ring
    ctx.fillStyle = '#c9a45a'
    ctx.fillRect(x + w * .12, y + h * .32, w * .76, 8)
    // flags
    for (let i = 0; i < 4; i++) {
      const fx = x + w * .18 + i * w * .21
      ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(fx, y + h * .3); ctx.lineTo(fx, y + h * .08); ctx.stroke()
      ctx.fillStyle = i % 2 ? accent : '#f0c96b'
      ctx.beginPath(); ctx.moveTo(fx, y + h * .08); ctx.lineTo(fx + 20, y + h * .12); ctx.lineTo(fx, y + h * .18); ctx.closePath(); ctx.fill()
    }
    // door
    const dx = cx - 24, dy = y + h * .7
    ctx.fillStyle = '#2b1e16'; ctx.beginPath(); ctx.roundRect(dx, dy, 48, h * .28, 4); ctx.fill()
    ctx.strokeStyle = '#f0c96b'; ctx.lineWidth = 3; ctx.stroke()
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, dy + 18, 6, 0, Math.PI * 2); ctx.fill()
  }

  drawTower(ctx, x, y, w, h, pal, accent) {
    const cx = x + w / 2
    ctx.fillStyle = pal.rock
    ctx.beginPath(); ctx.roundRect(x + 40, y - 40, w - 80, h + 80, 10); ctx.fill()
    ctx.strokeStyle = '#c9a45a'; ctx.lineWidth = 4; ctx.stroke()
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#1a1420' : '#2b1e16'
      ctx.beginPath(); ctx.roundRect(x + 60 + i * (w - 120) / 3, y + 10, 28, h * .5, 4); ctx.fill()
    }
    for (let i = 0; i < 8; i++) {
      const fx = x + 28 + i * (w - 56) / 7
      ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(fx, y - 40); ctx.lineTo(fx, y - 84); ctx.stroke()
      ctx.fillStyle = i < (G.save.flags.towerProgress || 0) ? '#f0c96b' : accent
      ctx.beginPath(); ctx.moveTo(fx, y - 84); ctx.lineTo(fx + 14, y - 78); ctx.lineTo(fx, y - 72); ctx.closePath(); ctx.fill()
    }
    ctx.fillStyle = '#2b1e16'
    ctx.beginPath(); ctx.roundRect(cx - 30, y + h - 46, 60, 46, 5); ctx.fill()
    ctx.strokeStyle = '#f0c96b'; ctx.lineWidth = 3; ctx.stroke()
    ctx.font = '700 14px Georgia,serif'; ctx.fillStyle = '#f0c96b'; ctx.textAlign = 'center'
    ctx.fillText('VIII', cx, y + h - 16)
  }

  drawLeague(ctx, x, y, w, h, pal, accent) {
    const cx = x + w / 2
    ctx.fillStyle = '#2a2a3e'
    ctx.beginPath(); ctx.roundRect(x + 20, y + h * .2, w - 40, h * .8, 6); ctx.fill()
    // spires
    for (let i = 0; i < 5; i++) {
      const sx = x + w * .18 + i * w * .16
      const sh = i === 2 ? h * .75 : h * .5
      ctx.fillStyle = i % 2 ? '#3a3550' : '#2a2a3e'
      ctx.beginPath(); ctx.moveTo(sx - 14, y + h * .45); ctx.lineTo(sx, y + h * .45 - sh); ctx.lineTo(sx + 14, y + h * .45); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(240,201,107,.5)'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = '#f0c96b'; ctx.beginPath(); ctx.arc(sx, y + h * .45 - sh - 4, 4, 0, Math.PI * 2); ctx.fill()
    }
    // central rose window
    ctx.fillStyle = '#f0c96b'; ctx.beginPath(); ctx.arc(cx, y + h * .52, 22, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#7df9ff'; ctx.beginPath(); ctx.arc(cx, y + h * .52, 14, 0, Math.PI * 2); ctx.fill()
    // door
    ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.roundRect(cx - 28, y + h * .72, 56, h * .28, 6); ctx.fill()
    ctx.strokeStyle = '#f0c96b'; ctx.lineWidth = 3; ctx.stroke()
    ctx.font = '700 15px Georgia,serif'; ctx.fillStyle = '#f0c96b'; ctx.textAlign = 'center'
    ctx.fillText('LIGUE', cx, y + h - 18)
  }

  drawCenter(ctx, x, y, w, h, pal) {
    ctx.fillStyle = '#f0e6d2'
    ctx.beginPath(); ctx.roundRect(x + 12, y + h * .35, w - 24, h * .62, 6); ctx.fill()
    ctx.fillStyle = '#c94a4a'
    ctx.beginPath(); ctx.moveTo(x + 6, y + h * .38); ctx.lineTo(x + w / 2, y + 8); ctx.lineTo(x + w - 6, y + h * .38); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#8a2e2e'; ctx.lineWidth = 3; ctx.stroke()
    // cross
    ctx.fillStyle = '#fff'; ctx.fillRect(x + w / 2 - 7, y + h * .5, 14, 42); ctx.fillRect(x + w / 2 - 21, y + h * .56, 42, 14)
    // door
    ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.roundRect(x + w / 2 - 18, y + h * .72, 36, h * .26, 4); ctx.fill()
  }

  drawShop(ctx, x, y, w, h, pal) {
    ctx.fillStyle = '#e8d8b8'
    ctx.beginPath(); ctx.roundRect(x + 12, y + h * .35, w - 24, h * .62, 5); ctx.fill()
    ctx.fillStyle = '#3a6a8a'
    ctx.beginPath(); ctx.moveTo(x + 6, y + h * .38); ctx.lineTo(x + w / 2, y + 10); ctx.lineTo(x + w - 6, y + h * .38); ctx.closePath(); ctx.fill()
    // awning
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#f0c96b' : '#e8e0d0'
      ctx.beginPath(); ctx.moveTo(x + 16 + i * (w - 32) / 6, y + h * .4); ctx.lineTo(x + 16 + (i + 1) * (w - 32) / 6, y + h * .4); ctx.lineTo(x + 12 + (i + 1) * (w - 32) / 6, y + h * .48); ctx.lineTo(x + 12 + i * (w - 32) / 6, y + h * .48); ctx.closePath(); ctx.fill()
    }
    // crates
    ctx.fillStyle = '#8a5b2e'; ctx.fillRect(x + 20, y + h * .75, 28, 26); ctx.fillRect(x + w - 48, y + h * .75, 28, 26)
    ctx.strokeStyle = '#5c3a1a'; ctx.lineWidth = 2; ctx.strokeRect(x + 20, y + h * .75, 28, 26)
    // door
    ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.roundRect(x + w / 2 - 16, y + h * .72, 32, h * .26, 4); ctx.fill()
  }

  drawLab(ctx, x, y, w, h, pal) {
    const cx = x + w / 2
    ctx.fillStyle = '#d8c8a8'
    ctx.beginPath(); ctx.roundRect(x + 12, y + h * .4, w - 24, h * .57, 6); ctx.fill()
    // dome
    const g = ctx.createLinearGradient(0, y, 0, y + h * .5)
    g.addColorStop(0, '#f0e2c4'); g.addColorStop(1, '#b8a888')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(cx, y + h * .4, w * .34, h * .3, 0, Math.PI, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.stroke()
    // telescope
    ctx.strokeStyle = '#5c4a2e'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(cx + 40, y + 28); ctx.lineTo(cx + 66, y - 8); ctx.stroke()
    ctx.fillStyle = '#7df9ff'; ctx.beginPath(); ctx.arc(cx + 68, y - 10, 7, 0, Math.PI * 2); ctx.fill()
    // sign
    ctx.fillStyle = 'rgba(11,17,32,.85)'; ctx.beginPath(); ctx.roundRect(cx - 44, y + h * .52, 88, 22, 5); ctx.fill()
    ctx.fillStyle = '#f0c96b'; ctx.font = '700 11px Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('LABO SABLE', cx, y + h * .52 + 15)
    // door
    ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.roundRect(cx - 18, y + h * .72, 36, h * .26, 4); ctx.fill()
  }

  drawHouse(ctx, x, y, w, h, pal) {
    ctx.fillStyle = '#d8c8a8'
    ctx.beginPath(); ctx.roundRect(x + 12, y + h * .38, w - 24, h * .58, 5); ctx.fill()
    ctx.fillStyle = '#8a4a3a'
    ctx.beginPath(); ctx.moveTo(x + 6, y + h * .42); ctx.lineTo(x + w / 2, y + 8); ctx.lineTo(x + w - 6, y + h * .42); ctx.closePath(); ctx.fill()
    // windows
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = '#7dc8e8'; ctx.fillRect(x + 28 + i * 62, y + h * .55, 22, 20)
      ctx.strokeStyle = '#5c3a1a'; ctx.lineWidth = 2; ctx.strokeRect(x + 28 + i * 62, y + h * .55, 22, 20)
    }
    // door
    ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.roundRect(x + w / 2 - 16, y + h * .72, 32, h * .26, 4); ctx.fill()
  }

  drawAltars(ctx, t) {
    for (const a of this.altars) {
      const x = (a.x + .5) * TS, y = (a.y + .5) * TS
      const captured = G.save.legends[a.id]
      ctx.save()
      // beam
      const g = ctx.createLinearGradient(x, y - 180, x, y)
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, a.color + '55')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x - 6, y - 180); ctx.lineTo(x + 6, y - 180); ctx.lineTo(x + 24, y); ctx.closePath(); ctx.fill()
      // base
      ctx.fillStyle = '#6b5a42'
      ctx.beginPath(); ctx.roundRect(x - 34, y + 6, 68, 20, 4); ctx.fill()
      ctx.fillStyle = '#8a7a5a'; ctx.fillRect(x - 26, y - 6, 52, 14)
      ctx.strokeStyle = '#f0c96b'; ctx.lineWidth = 2; ctx.strokeRect(x - 26, y - 6, 52, 14)
      // orb
      ctx.globalAlpha = captured ? .35 : .9
      const orb = ctx.createRadialGradient(x - 4, y - 32, 2, x, y - 26, 20)
      orb.addColorStop(0, '#fff'); orb.addColorStop(.35, a.color); orb.addColorStop(1, a.color + '00')
      ctx.fillStyle = orb
      ctx.beginPath(); ctx.arc(x, y - 26, 20 + Math.sin(t * 2 + a.x) * 2, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1
      // runes
      ctx.fillStyle = captured ? '#8a8a8a' : '#f0c96b'
      ctx.font = '700 12px Georgia,serif'; ctx.textAlign = 'center'
      ctx.fillText(captured ? '✦' : '◇', x, y + 20)
      ctx.restore()
    }
  }

  updatePrompt(force = false) {
    if (this.isPaused()) {
      if (this.lastPromptText) { this.lastPromptText = ''; this.opts.onPrompt?.('', '') }
      return
    }
    const p = this.player
    let best = null, bestD = Infinity
    for (const npc of this.npcs || []) {
      const d = Math.hypot(npc.px - p.x, npc.py - p.y)
      if (d < 70 && d < bestD) { bestD = d; best = { type: 'npc', data: npc, label: `Parler à ${npc.name}` } }
    }
    for (const b of this.buildings) {
      const dx = (b.door.x + .5) * TS, dy = (b.door.y + .5) * TS
      const d = Math.hypot(dx - p.x, dy - p.y)
      if (d < 92 && d < bestD) {
        bestD = d
        const label = b.kind === 'arena' ? `Défier ${LEADERS[this.loc.arena]?.name || 'le Champion'}` :
          b.kind === 'tower' ? 'Entrer dans la Tour des Huit Arènes' :
          b.kind === 'league' ? 'Affronter le Maître de la Ligue' :
          b.kind === 'center' ? 'Soigner ton équipe' :
          b.kind === 'shop' ? 'Ouvrir la boutique' :
          b.kind === 'lab' ? 'Voir le Professeur Sable' : 'Frapper à la porte'
        best = { type: 'building', data: b, label }
      }
    }
    for (const a of this.altars) {
      const d = Math.hypot((a.x + .5) * TS - p.x, (a.y + .5) * TS - p.y)
      if (d < 94 && d < bestD) { bestD = d; best = { type: 'altar', data: a, label: `Approcher l’autel de ${a.name}` } }
    }
    this.prompt = best
    const text = best ? best.label : ''
    if (force || text !== this.lastPromptText) {
      this.lastPromptText = text
      this.opts.onPrompt?.(text, 'E')
    }
  }

  async interact() {
    if (this.isPaused()) return
    this.updatePrompt()
    if (!this.prompt) return
    const p = this.prompt
    this.busy = true
    try {
      if (p.type === 'npc') await this.talkNpc(p.data)
      else if (p.type === 'building') await this.enterBuilding(p.data)
      else if (p.type === 'altar') await this.altarEncounter(p.data)
    } catch (e) { console.error(e) }
    this.busy = false
    this.encounterCooldown = Math.max(this.encounterCooldown, .8)
    this.updatePrompt(true)
  }

  npcPortrait(npc) {
    return leaderAvatarSVG(npcAvatar(npc), 112, npc.color || '#f0c96b')
  }

  async talkNpc(npc) {
    const lines = (npc.dialog || ['...']).map(text => ({ speaker: npc.name, text, avatar: npcAvatar(npc), color: npc.color }))
    await Dialog.show(lines)
    if (npc.trainer === 'red') {
      if (G.save.badges.length < 2) {
        await Dialog.show({ speaker: 'Red', avatar: npcAvatar(npc), color: '#e4572e', text: '... Bats Blue d’abord. Après, on s’entraîne.' })
      } else {
        const choice = await Dialog.show({
          speaker: 'Red', avatar: npcAvatar(npc), color: '#e4572e',
          text: '... Tu veux t’entraîner ? Mon équipe s’adapte à la tienne. Ça va faire mal.',
          choices: [{ label: 'Oui, entraîne-moi', value: 'yes', sub: 'Combat d’entraînement' }, { label: 'Pas maintenant', value: 'no' }]
        })
        if (choice === 'yes') await this.trainWithRed()
      }
    }
    if (npc.friendable && !isFriend(npc.id)) {
      const choice = await Dialog.show({
        speaker: npc.name, avatar: npcAvatar(npc), color: npc.color,
        text: `Tu es quelqu’un de bien. Veux-tu devenir mon ami ? On pourra s’écrire quand le online rouvrira.`,
        choices: [{ label: 'Oui, devenons amis', value: 'yes', sub: '+1 ami' }, { label: 'Plus tard', value: 'no' }]
      })
      if (choice === 'yes') {
        addFriend({ id: npc.id, name: npc.name, role: `Ami de ${this.loc.name}`, metAt: this.loc.name, color: npc.color, avatar: npcAvatar(npc), bond: 1, quote: 'Les amis rendent la route plus courte.' })
        toast(`${npc.name} est maintenant ton ami !`, '🤝')
        sfx('level')
        this.opts.onHUD?.()
      }
    }
  }

  async trainWithRed() {
    const lvl = maxTeamLevel()
    const team = [
      createMonster('drakonar', Math.max(18, lvl + 1)),
      createMonster('pharaos', Math.max(18, lvl + 1)),
      createMonster('cendragon', Math.max(19, lvl + 2)),
      createMonster('abyssal', Math.max(19, lvl + 2))
    ]
    await Dialog.show({ speaker: 'Red', avatar: npcAvatar(RED_TRAINING), color: '#e4572e', text: '... Commence.' })
    const res = await startBattle({
      kind: 'trainer', trainer: RED_TRAINING, team, theme: 'canyon', palette: this.loc.palette,
      rewardMoney: 600 + lvl * 20, canCatch: false
    })
    await this.afterBattle(res, { kind: 'training', trainer: RED_TRAINING })
  }

  async enterBuilding(b) {
    if (b.kind === 'arena') await this.challengeArena()
    else if (b.kind === 'tower') await this.challengeTower()
    else if (b.kind === 'league') await this.challengeLeague()
    else if (b.kind === 'center') await this.useCenter()
    else if (b.kind === 'shop') await this.useShop()
    else if (b.kind === 'lab') await this.talkProfessor()
    else {
      await Dialog.show({ speaker: 'Habitant', text: ['Personne ne répond. Une petite note est accrochée : « Parti chercher des baies. Reviens plus tard ! »', 'Tu entends un Ronflex ronfler à l’intérieur.'][Math.floor(Math.random() * 2)] })
    }
  }

  async useCenter() {
    const choice = await Dialog.show({
      speaker: 'Infirmière Joyeuse', text: 'Bienvenue au Centre Pokémon de Templier. Veux-tu soigner ton équipe ?',
      choices: [{ label: 'Oui, soigne tout', value: 'yes' }, { label: 'Non merci', value: 'no' }]
    })
    if (choice === 'yes') {
      healTeam()
      sfx('heal')
      toast('Ton équipe est en pleine forme !', '💚')
      await Dialog.show({ speaker: 'Infirmière Joyeuse', text: 'Et voilà ! Tes Pokémon sont en pleine forme. Bonne route, dresseur.' })
      this.opts.onHUD?.()
    }
  }

  async useShop() {
    await Dialog.show({ speaker: 'Marchand', text: 'Bienvenue ! Potions, balls et souvenirs du désert. Regarde donc.' })
    showShop()
  }

  async talkProfessor() {
    const s = G.save
    if (!s.flags.talkedToProfessor) {
      s.flags.talkedToProfessor = true
      addItem('sable_ball', 5); addItem('potion', 3)
      persist()
      await Dialog.show([
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Ah, te voilà enfin ! Bienvenue dans mon laboratoire. Ici, tout a commencé : le sable, les serments, et Poke Online MMO.' },
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Prends ces cinq Sable Balls et trois Potions. La route des huit villages t’attend. Commence par l’arène de Sablonville, au nord.' },
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Et n’oublie pas : au quatrième badge, le Bracelet Templier réveillera quelque chose de très ancien. J’ai hâte de voir ça.' }
      ])
      this.opts.onHUD?.()
      return
    }
    if (s.badges.length >= 4 && !s.flags.megaUnlocked) {
      s.flags.megaUnlocked = true
      s.flags.sanctuaryUnlocked = true
      s.flags.templionGift = true
      addItem('templier_ball', 3)
      const mon = createMonster('templion', 20)
      const res = addMonster(mon)
      persist()
      sfx('mega')
      await Dialog.show([
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Tu l’as fait ! Le quatrième badge a réveillé le Bracelet Templier. Regarde comme il brille...' },
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Voici Templion, le gardien forgé dans le sable et l’or. Il est à toi. Et avec le Bracelet, il peut révéler sa Méga-Évolution : Méga-Templion !' },
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: `Il rejoint ${res.boxed ? 'ta boîte de stockage' : 'ton équipe'}. En combat, appuie sur « Méga » quand Templion est actif. Une fois par combat, pas plus !` },
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Les légendes aussi se sont réveillées. Au Sanctuaire des Vents, Latias, Latios et Rayquaza t’attendent. Prends ces trois Templier Balls. Sois patient : une légende ne se capture pas comme un Rocaille.' },
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Le Sanctuaire est maintenant sur ta carte du monde. Va leur parler. Ou plutôt... va les défier.' }
      ])
      toast('Bracelet Templier obtenu · Sanctuaire des Vents débloqué !', '⚜')
      this.opts.onHUD?.()
      return
    }
    if (s.flags.champion) {
      await Dialog.show([
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Champion de Templier... Tu réalises ? Mille ans de sable, et c’est ton nom que le désert retient aujourd’hui.' },
        { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Poke Online MMO rouvrira bientôt. Le monde entier pourra voir ta carte de dresseur. Je suis fier de toi, mon ami.' }
      ])
      healTeam()
      return
    }
    healTeam()
    const lines = [
      { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Le sable se souvient de tout, mon jeune ami. Chaque badge que tu portes est une page de ton histoire.' },
      { speaker: 'Professeur Sable', portrait: professorSVG(), text: s.badges.length >= 8 ? 'Les huit badges sont réunis ! Les îles s’ouvrent : l’Île des Épreuves, puis l’Île de la Ligue. Le Maître t’attend.' : 'Continue ta route. Les arènes de Templier ne se donnent pas, elles se méritent. Et n’oublie pas de revenir me voir.' }
    ]
    if (s.flags.legendsDone) lines.push({ speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Latias, Latios et Rayquaza t’ont reconnu. Tu portes désormais le serment des anciens. Ce n’est pas rien.' })
    lines.push({ speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Tiens, j’ai soigné ton équipe pendant que tu rêvassais. C’est ma petite amélioration personnelle. Très fière, vraiment.' })
    await Dialog.show(lines)
    this.opts.onHUD?.()
  }

  async challengeArena() {
    const loc = this.loc
    const leader = LEADERS[loc.arena]
    if (!leader) return
    const badge = loc.badge
    const already = hasBadge(badge)
    if (G.save.badges.length < loc.order) {
      await Dialog.show({ speaker: 'Gardien de l’arène', text: 'Les portes ne s’ouvrent qu’aux dresseurs qui ont prouvé leur valeur dans les villages précédents.' })
      return
    }
    if (already) {
      const choice = await Dialog.show({
        speaker: leader.name, avatar: leader.avatar, color: leader.color,
        text: `${leader.quote || 'Tu es revenu.'} Tu veux une revanche ? Mon équipe est plus forte maintenant.`,
        choices: [{ label: 'Oui, revanche !', value: 'yes' }, { label: 'Non, juste te saluer', value: 'no' }]
      })
      if (choice !== 'yes') return
    } else {
      const choice = await Dialog.show({
        speaker: leader.name, avatar: leader.avatar, color: leader.color,
        text: leader.intro,
        choices: [{ label: 'Combattre', value: 'yes', sub: `Badge : ${BADGES.find(b => b.id === badge)?.name}` }, { label: 'Plus tard', value: 'no' }]
      })
      if (choice !== 'yes') return
    }
    const scale = already ? 1.22 : 1
    const team = leader.team.map(m => createMonster(m.species, Math.max(3, Math.round(m.level * scale))))
    const res = await startBattle({
      kind: 'trainer', trainer: leader, team, theme: THEME[loc.id], palette: loc.palette,
      rewardMoney: already ? 900 + loc.order * 100 : 400 + loc.order * 220, canCatch: false
    })
    if (!res) return
    if (res.outcome === 'win') {
      if (!already) {
        addBadge(badge)
        const b = BADGES.find(x => x.id === badge)
        G.save.money += 500 + loc.order * 250
        sfx('badge')
        await Dialog.show([
          { speaker: leader.name, avatar: leader.avatar, color: leader.color, text: leader.defeat },
          { speaker: 'Badge obtenu', portrait: `<div class="dialog-badge">${badgeSVG(b.color, b.glyph, 74)}</div>`, text: `${b.name} ! ${G.save.badges.length} badge${G.save.badges.length > 1 ? 's' : ''} sur 8.` }
        ])
        if (G.save.badges.length === 4 && !G.save.flags.fourthBadgeSeen) {
          G.save.flags.fourthBadgeSeen = true
          G.save.flags.sanctuaryUnlocked = true
          await Dialog.show([
            { speaker: 'Bracelet Templier', text: 'Ton bracelet se met à vibrer. Une chaleur dorée remonte le long de ton bras...' },
            { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Viens me voir au laboratoire de Sablonville, vite ! Le quatrième badge a réveillé le Bracelet Templier. Templion et les légendes t’attendent.' }
          ])
        }
        if (G.save.badges.length === 8 && !G.save.flags.islandsUnlocked) {
          G.save.flags.islandsUnlocked = true
          await Dialog.show([
            { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Huit badges ! Les huit serments sont réunis. Les îles s’ouvrent : l’Île des Épreuves et l’Île de la Ligue.' },
            { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Sur l’Île des Épreuves, les huit Champions t’attendent pour un dernier tour. Et au-delà... le Maître de la Ligue.' }
          ])
        }
        persist()
        this.opts.onHUD?.()
      } else {
        await Dialog.show({ speaker: leader.name, avatar: leader.avatar, color: leader.color, text: 'Belle revanche. Tu progresses, l’ami.' })
      }
      await this.askFriendLeader(leader)
    } else if (res.outcome === 'loss') {
      await this.onLoss()
    }
  }

  async askFriendLeader(leader) {
    if (isFriend(leader.id)) return
    const choice = await Dialog.show({
      speaker: leader.name, avatar: leader.avatar, color: leader.color,
      text: 'Tu as gagné mon respect. Veux-tu devenir mon ami ? Les Champions aussi ont besoin de rivaux.',
      choices: [{ label: 'Oui, avec honneur', value: 'yes' }, { label: 'Une autre fois', value: 'no' }]
    })
    if (choice === 'yes') {
      addFriend({ id: leader.id, name: leader.name, role: `Champion · ${leader.title}`, metAt: this.loc.name, color: leader.color, avatar: leader.avatar, leaderId: leader.id, bond: 2, quote: leader.quote })
      toast(`${leader.name} est maintenant ton ami !`, '🤝')
      sfx('level')
      this.opts.onHUD?.()
    }
  }

  async challengeTower() {
    const s = G.save
    if (!s.flags.islandsUnlocked && s.badges.length < 8) {
      await Dialog.show({ speaker: 'Gardien de la Tour', text: 'Huit badges sont nécessaires pour fouler les arènes de l’île.' })
      return
    }
    if (s.flags.towerDone) {
      await Dialog.show({ speaker: 'Gardien de la Tour', text: 'Les huit arènes sont derrière toi. L’Île de la Ligue t’attend, au-delà de la mer.' })
      return
    }
    const start = s.flags.towerProgress || 0
    const choice = await Dialog.show({
      speaker: 'Gardien de la Tour', avatar: { skin: '#c98a5a', hair: '#d8d0c0', style: 'hood', outfit: '#6b5b95', accent: '#f0c96b' }, color: '#f0c96b',
      text: `Bienvenue dans la Tour des Huit Arènes. Tu as déjà triomphé de ${start} arène${start > 1 ? 's' : ''}. Chaque victoire soigne ton équipe, mais les Champions sont plus forts. Prêt ?`,
      choices: [{ label: start ? 'Reprendre l’ascension' : 'Commencer l’ascension', value: 'yes' }, { label: 'Pas encore', value: 'no' }]
    })
    if (choice !== 'yes') return
    for (let i = start; i < 8; i++) {
      const leaderId = ISLAND_TOWER[i]
      const leader = LEADERS[leaderId]
      const lvlBase = 52 + i * 2
      const team = leader.team.map((m, idx) => createMonster(m.species, lvlBase + Math.floor(idx / 2)))
      await Dialog.show({ speaker: leader.name, avatar: leader.avatar, color: leader.color, text: `Arène ${i + 1} sur 8. ${leader.quote}` })
      const res = await startBattle({
        kind: 'trainer', trainer: { ...leader, title: `Tour des Huit Arènes · ${i + 1}/8` }, team,
        theme: 'sacred', palette: LOCATIONS.ile_epreuves.palette, rewardMoney: 1200, canCatch: false
      })
      if (!res || res.outcome !== 'win') {
        if (res?.outcome === 'loss') await this.onLoss()
        return
      }
      s.flags.towerProgress = i + 1
      persist()
      healTeam()
      await Dialog.show({ speaker: 'Gardien de la Tour', text: `Arène ${i + 1} vaincue. Ton équipe est soignée. ${i + 1 < 8 ? 'La suivante t’attend.' : 'Les huit arènes sont à toi !'}` })
      this.opts.onHUD?.()
      if (i + 1 >= 8) {
        s.flags.towerDone = true
        s.flags.islandsUnlocked = true
        G.save.money += 6000
        addItem('templier_ball', 3)
        persist()
        sfx('badge')
        await Dialog.show([
          { speaker: 'Gardien de la Tour', text: 'Huit arènes. Huit Champions. Tu as accompli l’impossible.' },
          { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'L’Île de la Ligue est ouverte. Le Maître Aurélien t’attend. Va écrire la dernière page, mon ami.' }
        ])
        toast('Sceau des Huit obtenu · Île de la Ligue débloquée !', '🏛')
        this.opts.onHUD?.()
      }
    }
  }

  async challengeLeague() {
    const s = G.save
    if (!s.flags.towerDone) {
      await Dialog.show({ speaker: 'Gardien de la Ligue', text: 'Le Maître ne reçoit que les dresseurs qui ont triomphé des huit arènes de l’Île des Épreuves.' })
      return
    }
    if (s.flags.champion) {
      const choice = await Dialog.show({
        speaker: MASTER.name, avatar: MASTER.avatar, color: MASTER.color,
        text: 'Revanche ? Mon équipe a étudié tes huit arènes. Cette fois, je ne retiendrai rien.',
        choices: [{ label: 'Revanche !', value: 'yes' }, { label: 'Plus tard', value: 'no' }]
      })
      if (choice !== 'yes') return
    } else {
      const choice = await Dialog.show({
        speaker: MASTER.name, avatar: MASTER.avatar, color: MASTER.color,
        text: MASTER.intro,
        choices: [{ label: 'Défier le Maître', value: 'yes', sub: 'Combat final' }, { label: 'Pas encore prêt', value: 'no' }]
      })
      if (choice !== 'yes') return
    }
    const team = MASTER.team.map(m => createMonster(m.species, m.level))
    const res = await startBattle({
      kind: 'trainer', trainer: MASTER, team, theme: 'league', palette: LOCATIONS.ile_ligue.palette,
      rewardMoney: 12000, canCatch: false
    })
    if (!res) return
    if (res.outcome === 'win') {
      if (!s.flags.champion) {
        s.flags.champion = true
        s.flags.endingSeen = true
        G.save.money += 20000
        persist()
        sfx('badge')
        await this.showEnding()
      } else {
        await Dialog.show({ speaker: MASTER.name, avatar: MASTER.avatar, color: MASTER.color, text: 'Encore toi. Le sable se souviendra de cette revanche aussi.' })
      }
    } else if (res.outcome === 'loss') {
      await this.onLoss()
    }
  }

  async showEnding() {
    const s = G.save
    await Dialog.show([
      { speaker: MASTER.name, avatar: MASTER.avatar, color: MASTER.color, text: MASTER.defeat },
      { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Tu l’as fait. Champion de Templier. Mille ans de sable, et te voilà.' },
      { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Tu sais, avant les villes, avant les arènes, il n’y avait que du sable. J’y ai trouvé une graine. Puis une idée. Puis toi, et tous les autres.' },
      { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Poke Online MMO rouvrira le 9 décembre. Le monde verra ta carte de dresseur, tes badges, tes amis. Et moi, je verrai mon rêve marcher.' },
      { speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Bonne chance, Champion. Le désert est à toi.' }
    ])
    const modal = openModal({
      title: 'Champion de Templier', icon: '👑', className: 'ending-modal', closable: true,
      content: `<div class="ending">
        <div class="ending-crown">♛</div>
        <span class="eyebrow">Générique</span>
        <h2>${escapeHTML(s.profile.name)}</h2>
        <p class="ending-title">Champion de la Ligue Templier</p>
        <div class="ending-badges">${BADGES.map(b => badgeSVG(b.color, b.glyph, 46, s.badges.includes(b.id))).join('')}</div>
        <div class="ending-stats">
          <div><span>Badges</span><strong>${s.badges.length}/8</strong></div>
          <div><span>Pokémon capturés</span><strong>${Object.keys(s.caught).length}</strong></div>
          <div><span>Amis</span><strong>${s.friends.length}</strong></div>
          <div><span>Victoires</span><strong>${s.stats.wins}</strong></div>
          <div><span>Temps de jeu</span><strong>${formatPlaytime(s.playtime)}</strong></div>
        </div>
        <p class="ending-lore">« Avant les villes, il n’y avait que du sable. Et dans le sable, un rêve. »<br><em>— Professeur Sable</em></p>
        <button class="btn gold full big" id="ending-continue">Continuer l’exploration</button>
      </div>`
    })
    modal.el.querySelector('#ending-continue').addEventListener('click', () => closeModal())
  }

  async altarEncounter(a) {
    const s = G.save
    if (s.legends[a.id]) {
      await Dialog.show({ speaker: `Autel de ${a.name}`, text: `L’autel est silencieux. ${a.name} t’a déjà reconnu. Une plume de lumière flotte au-dessus de la pierre.` })
      return
    }
    if (s.badges.length < 4) {
      await Dialog.show({ speaker: `Autel de ${a.name}`, text: 'L’autel est froid. Un quatrième badge est nécessaire pour réveiller les vents.' })
      return
    }
    const choice = await Dialog.show({
      speaker: `Autel de ${a.name}`, color: a.color,
      text: `${a.lore} Veux-tu l’approcher ?`,
      choices: [{ label: `Défier ${a.name}`, value: 'yes', sub: `Niveau ${a.level} · Capturable` }, { label: 'Reculer doucement', value: 'no' }]
    })
    if (choice !== 'yes') return
    const res = await startBattle({
      kind: 'legendary', wild: { species: a.id, level: a.level }, theme: 'sacred', palette: this.loc.palette,
      rewardMoney: 2500, canCatch: true
    })
    if (!res) return
    if (res.outcome === 'caught') {
      s.legends[a.id] = true
      const all = Object.values(s.legends).every(Boolean)
      if (all) {
        s.flags.legendsDone = true
        persist()
        await Dialog.show({ speaker: 'Professeur Sable', portrait: professorSVG(), text: 'Latias, Latios et Rayquaza... Tu as réuni les trois gardiens. Le ciel de Templier ne sera plus jamais seul.' })
      } else persist()
      toast(`${a.name} rejoint ton équipe !`, '✨')
      this.opts.onHUD?.()
    } else if (res.outcome === 'win') {
      await Dialog.show({ speaker: `Autel de ${a.name}`, text: `${a.name} s’est rendormi. Il faudra une Sable Ball pour le garder auprès de toi. Reviens quand tu seras prêt.` })
    } else if (res.outcome === 'loss') {
      await this.onLoss()
    }
  }

  async onLoss() {
    const loc = this.loc
    const hasCenter = this.buildings.some(b => b.kind === 'center')
    const target = hasCenter ? loc.id : 'sablonville'
    healTeam()
    await Dialog.show({ speaker: 'Infirmière Joyeuse', text: 'Ton équipe est soignée. Repose-toi, puis retourne sur le terrain. Le sable n’oublie pas les courageux.' })
    this.travelTo(target, { spawn: 'center', force: true })
    this.opts.onHUD?.()
  }

  async afterBattle(res, meta = {}) {
    if (!res) return
    if (res.outcome === 'loss') await this.onLoss()
    else if (res.outcome === 'win') {
      if (meta.kind === 'training') {
        await Dialog.show({ speaker: meta.trainer?.name || 'Red', avatar: meta.trainer?.avatar, color: meta.trainer?.color, text: '... Bien. Reviens quand tu veux. La prochaine fois, je donnerai tout.' })
      }
    }
    this.opts.onHUD?.()
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------
  loop(ts) {
    const dt = Math.min(.05, (ts - (this.lastTime || ts)) / 1000)
    this.lastTime = ts
    if (!this.loc) { this.raf = requestAnimationFrame(this.loop); return }
    if (!this.isPaused()) this.update(dt)
    this.render(ts / 1000)
    this.raf = requestAnimationFrame(this.loop)
  }

  update(dt) {
    const p = this.player
    let dx = 0, dy = 0
    if (this.keys.has('arrowleft') || this.keys.has('a') || this.keys.has('q')) dx -= 1
    if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1
    if (this.keys.has('arrowup') || this.keys.has('w') || this.keys.has('z')) dy -= 1
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1
    dx += this.touch.x; dy += this.touch.y
    const len = Math.hypot(dx, dy)
    if (len > 1) { dx /= len; dy /= len }
    p.moving = len > .05
    if (p.moving) {
      if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right'
      else p.dir = dy < 0 ? 'up' : 'down'
      const nx = p.x + dx * p.speed * dt
      const ny = p.y + dy * p.speed * dt
      if (this.canStand(nx, p.y)) p.x = nx
      if (this.canStand(p.x, ny)) p.y = ny
      p.walk += dt * 1.7
      this.grassDistance += p.speed * dt
      if (Math.random() < dt * 6) this.dust.push({ x: p.x + (Math.random() - .5) * 10, y: p.y + 6, vx: (Math.random() - .5) * 16, vy: -10 - Math.random() * 12, life: .55, max: .55, c: this.loc.palette.accent })
      if (this.grassDistance > 40) {
        this.grassDistance = 0
        this.checkEncounter()
      }
    } else p.walk += dt * .5
    this.encounterCooldown = Math.max(0, this.encounterCooldown - dt)
    // dust
    for (const d of this.dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 30 * dt; d.life -= dt }
    this.dust = this.dust.filter(d => d.life > 0)
    // camera
    const targetX = clamp(p.x - this.viewW / 2, 0, Math.max(0, MW * TS - this.viewW))
    const targetY = clamp(p.y - this.viewH / 2, 0, Math.max(0, MH * TS - this.viewH))
    this.cam.x += (targetX - this.cam.x) * Math.min(1, dt * 7)
    this.cam.y += (targetY - this.cam.y) * Math.min(1, dt * 7)
    if (G.save) G.save.playtime += dt * 1000
    this.updatePrompt()
  }

  canStand(px, py) {
    const r = this.player.r
    for (const [ox, oy] of [[0, 0], [-r, 0], [r, 0], [0, -r], [0, r], [-r * .7, -r * .7], [r * .7, -r * .7], [-r * .7, r * .7], [r * .7, r * .7]]) {
      const x = px + ox, y = py + oy
      if (x < 2 || y < 2 || x > MW * TS - 2 || y > MH * TS - 2) return false
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS)
      if (ty < 0 || ty >= MH || tx < 0 || tx >= MW) return false
      if (BLOCKED.has(this.tiles[ty][tx])) return false
      if (this.tiles[ty][tx] === 10) return false
    }
    for (const a of this.altars || []) {
      if (Math.hypot((a.x + .5) * TS - px, (a.y + .5) * TS - py) < 34) return false
    }
    return true
  }

  checkEncounter() {
    if (this.encounterCooldown > 0 || this.isPaused() || !this.loc.wild?.length) return
    const tx = Math.floor(this.player.x / TS), ty = Math.floor(this.player.y / TS)
    if (this.tiles[ty]?.[tx] !== 6) return
    if (Math.random() > .12) return
    const entry = this.loc.wild[Math.floor(Math.random() * this.loc.wild.length)]
    const [species, min, max] = entry
    const level = min + Math.floor(Math.random() * (max - min + 1))
    this.startWildEncounter(species, level)
  }

  async startWildEncounter(species, level) {
    this.busy = true
    this.encounterCooldown = 3
    const res = await startBattle({
      kind: 'wild', wild: { species, level }, theme: THEME[this.loc.id], palette: this.loc.palette,
      rewardMoney: 20 + level * 4, canCatch: true
    })
    this.busy = false
    if (res?.outcome === 'loss') await this.onLoss()
    this.opts.onHUD?.()
  }

  render(t) {
    if (!this.bg) return
    const ctx = this.ctx
    const dpr = this.dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, this.viewW, this.viewH)
    ctx.save()
    ctx.translate(-this.cam.x, -this.cam.y)
    ctx.drawImage(this.bg, 0, 0)
    this.drawAltars(ctx, t)
    // door glows
    for (const b of this.buildings) {
      const x = (b.door.x + .5) * TS, y = (b.door.y + .5) * TS
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 40)
      glow.addColorStop(0, `rgba(240,201,107,${.18 + .08 * Math.sin(t * 3 + b.x)})`)
      glow.addColorStop(1, 'rgba(240,201,107,0)')
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill()
    }
    // entities sorted
    const ents = [...(this.npcs || []).map(n => ({ y: n.py, draw: () => this.drawNpc(n, t) })), { y: this.player.y, draw: () => this.drawPlayer(t) }]
    ents.sort((a, b) => a.y - b.y)
    for (const e of ents) e.draw()
    // dust
    for (const d of this.dust) {
      ctx.globalAlpha = Math.max(0, d.life / d.max) * .5
      ctx.fillStyle = d.c
      ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    // ambient motes
    ctx.fillStyle = 'rgba(255,240,190,.35)'
    for (const s of this.sand) {
      const x = ((s.x + t * .012 * s.s) % 1) * MW * TS
      const y = ((s.y + Math.sin(t * .3 + s.x * 8) * .01) % 1) * MH * TS
      ctx.fillRect(x, y, 2 * s.s, 2 * s.s)
    }
    // prompt ring
    if (this.prompt && this.prompt.type !== 'building') {
      let x, y
      if (this.prompt.type === 'npc') { x = this.prompt.data.px; y = this.prompt.data.py }
      else { x = (this.prompt.data.x + .5) * TS; y = (this.prompt.data.y + .5) * TS }
      ctx.strokeStyle = `rgba(240,201,107,${.5 + .3 * Math.sin(t * 4)})`; ctx.lineWidth = 3
      ctx.beginPath(); ctx.ellipse(x, y + 8, 26, 12, 0, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
    // vignette
    const vg = ctx.createRadialGradient(this.viewW / 2, this.viewH / 2, Math.min(this.viewW, this.viewH) * .35, this.viewW / 2, this.viewH / 2, Math.max(this.viewW, this.viewH) * .75)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,8,16,.35)')
    ctx.fillStyle = vg; ctx.fillRect(0, 0, this.viewW, this.viewH)
  }

  drawPlayer(t) {
    const p = this.player
    drawTrainer(this.ctx, p.x, p.y + 8, 1.18, {
      skin: G.save.profile.gender === 'fille' ? '#e8b48a' : '#d9a47a',
      hair: G.save.profile.gender === 'fille' ? '#6b3f2a' : '#3a2418',
      outfit: G.save.profile.gender === 'fille' ? '#c96b8a' : '#2f5f9e',
      accent: '#f0c96b', hat: 'cap', walk: p.moving ? p.walk : 0, flip: p.dir === 'left', t
    })
  }

  drawNpc(npc, t) {
    const ctx = this.ctx
    drawTrainer(ctx, npc.px, npc.py + 8, npc.role === 'child' ? 1.0 : 1.12, {
      ...npc.avatar, walk: Math.sin(t * 1.5 + npc.px) * .15, flip: this.player.x < npc.px, t
    })
    const near = Math.hypot(npc.px - this.player.x, npc.py - this.player.y) < 150
    if (near) {
      ctx.font = '700 10px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'
      const w = ctx.measureText(npc.name).width + 14
      ctx.fillStyle = 'rgba(11,17,32,.82)'
      ctx.beginPath(); ctx.roundRect(npc.px - w / 2, npc.py - 56, w, 17, 8); ctx.fill()
      ctx.strokeStyle = 'rgba(240,201,107,.4)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = '#f2e3c2'; ctx.fillText(npc.name, npc.px, npc.py - 44)
    }
    if (npc.friendable && !isFriend(npc.id)) {
      const bob = Math.sin(t * 3 + npc.px) * 3
      ctx.fillStyle = '#f0c96b'
      ctx.beginPath(); ctx.arc(npc.px + 18, npc.py - 54 + bob, 8, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#2b2118'; ctx.font = '700 12px Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('!', npc.px + 18, npc.py - 50 + bob)
    }
  }

  refreshNPCs() {
    if (!this.loc) return
    this.npcs = (this.loc.npcs || []).map(npc => {
      const spot = this.findFreeSpot(npc.x, npc.y)
      return { ...npc, ...spot, avatar: npcAvatar(npc) }
    })
  }

  findFreeSpot(tx, ty) {
    for (let r = 0; r < 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = tx + dx, y = ty + dy
          if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) continue
          const t = this.tiles[y][x]
          if (t === 0 || t === 1 || t === 5 || t === 6) {
            if (!this.buildings.some(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return { px: (x + .5) * TS, py: (y + .7) * TS }
          }
        }
      }
    }
    return { px: tx * TS, py: ty * TS }
  }
}

function shadeLocal(hex, amt) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt))
  const b = Math.max(0, Math.min(255, (n & 255) + amt))
  return `rgb(${r},${g},${b})`
}
