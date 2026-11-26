import { TILE, T } from '../world/world.js'
import { hash2, shade, hexAlpha } from '../core/utils.js'

// ---------- sprite loading ----------
const images = new Map()
const shinyCache = new Map()
const pending = new Set()

export function spriteUrl (id) { return `assets/sprites/${id}.png` }

export function getImage (id) {
  if (images.has(id)) return images.get(id)
  const img = new Image()
  img.decoding = 'async'
  img.src = spriteUrl(id)
  img.onload = () => { img.loaded = true; pending.delete(id) }
  img.onerror = () => { img.failed = true; pending.delete(id) }
  images.set(id, img)
  pending.add(id)
  return img
}

export function preload (ids) { for (const id of ids) getImage(id) }

function shinyImage (img) {
  if (shinyCache.has(img)) return shinyCache.get(img)
  const c = document.createElement('canvas')
  c.width = img.naturalWidth || 96; c.height = img.naturalHeight || 96
  const x = c.getContext('2d')
  x.filter = 'hue-rotate(145deg) saturate(1.8) brightness(1.08)'
  x.drawImage(img, 0, 0)
  shinyCache.set(img, c)
  return c
}

export function drawPokemon (ctx, id, x, y, size, opts = {}) {
  const img = getImage(id)
  const ratio = 96 / 96
  const w = size, h = size * ratio
  ctx.save()
  ctx.translate(x, y)
  if (opts.flip) ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = false
  if (img.loaded) {
    const src = opts.shiny ? shinyImage(img) : img
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha
    ctx.drawImage(src, -w / 2, -h, w, h)
  } else {
    // placeholder silhouette while loading
    ctx.fillStyle = 'rgba(0,0,0,.25)'
    ctx.beginPath(); ctx.ellipse(0, -h * 0.35, w * 0.28, h * 0.32, 0, 0, 7); ctx.fill()
  }
  ctx.restore()
}

// ---------- trainer sprites ----------
export function drawTrainer (ctx, x, y, dir, frame, colors = {}, opts = {}) {
  const c = {
    skin: colors.skin || '#f0c8a0', hair: colors.hair || '#2b2b38',
    shirt: colors.shirt || '#d94b4b', pants: colors.pants || '#2f3550',
    shoe: colors.shoe || '#22242f', hat: colors.hat || null, bag: colors.bag || '#8a5a2b',
    accent: colors.accent || '#ffffff',
  }
  const s = opts.scale || 1.35
  const t = opts.time || 0
  const walking = opts.walking
  const bob = walking ? (frame === 1 || frame === 3 ? -1 : 0) : Math.sin(t * 2) * 0.4
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.scale(s, s)
  ctx.imageSmoothingEnabled = false
  const R = (rx, ry, rw, rh, col) => { ctx.fillStyle = col; ctx.fillRect(rx, ry + bob, rw, rh) }
  // shadow
  ctx.fillStyle = 'rgba(20,30,20,.28)'
  ctx.beginPath(); ctx.ellipse(0, -0.5, 8, 3.2, 0, 0, 7); ctx.fill()
  const flip = dir === 'left'
  if (flip) { ctx.scale(-1, 1) }
  const side = dir === 'left' || dir === 'right'
  const up = dir === 'up'
  const down = dir === 'down'
  const legA = walking ? [0, 2, 0, -2][frame] : 0
  const legB = -legA
  // legs
  R(-5, -8, 4, 6 + legA, c.pants); R(1, -8, 4, 6 + legB, c.pants)
  R(-5, -3 + legA, 4, 3, c.shoe); R(1, -3 + legB, 4, 3, c.shoe)
  // body outline
  R(-7, -18, 14, 11, '#20222c')
  R(-6, -17, 12, 9, c.shirt)
  R(-6, -17, 12, 2, shade(c.shirt, 16))
  R(-6, -9, 12, 1, shade(c.shirt, -22))
  // belt / bag
  if (!up) {
    R(-6, -12, 12, 1.5, '#3b2a20')
    R(-7.5, -15, 2, 4, c.bag)
  } else {
    R(-5, -16, 10, 8, c.bag)
    R(-4, -15, 8, 6, shade(c.bag, 16))
  }
  // arms
  if (side) {
    R(4, -16, 3, 8 + legA * .5, c.skin)
    R(3, -17, 3, 3, shade(c.shirt, -8))
  } else {
    R(-9, -16, 3, 8, c.shirt); R(-9, -9, 3, 2.5, c.skin)
    R(6, -16, 3, 8, c.shirt); R(6, -9, 3, 2.5, c.skin)
  }
  // head
  R(-5, -25, 10, 9, '#20222c')
  R(-4.5, -24, 9, 8, c.skin)
  // hair
  if (up) {
    R(-5, -25, 10, 7, c.hair)
    R(-4, -19, 8, 2, shade(c.hair, 10))
  } else if (side) {
    R(-5, -25, 9, 4, c.hair)
    R(-5, -22, 3, 4, c.hair)
    R(2, -25, 3, 2, c.hair)
  } else {
    R(-5, -25, 10, 3.5, c.hair)
    R(-5, -22.5, 2, 3, c.hair)
    R(3, -22.5, 2, 3, c.hair)
  }
  // hat
  if (c.hat) {
    R(-5.5, -26.5, 11, 3.5, c.hat)
    R(-7, -24, 14, 2, shade(c.hat, -14))
    R(-4, -27.5, 8, 2, shade(c.hat, 10))
    R(-2, -25.8, 4, 1.2, c.accent)
  }
  // face
  if (!up) {
    if (side) {
      R(2, -21, 1.4, 2, '#20222c')
      R(3.5, -18.5, 1.5, 1, '#c96b6b')
    } else {
      R(-2.6, -21, 1.4, 2, '#20222c'); R(1.4, -21, 1.4, 2, '#20222c')
      R(-1.4, -18, 2.8, 1, '#b35c5c')
      R(-3, -19, 1.5, .8, 'rgba(240,120,120,.35)'); R(1.8, -19, 1.5, .8, 'rgba(240,120,120,.35)')
    }
  }
  ctx.restore()
}

// ---------- tile art ----------
const COL = {
  [T.DEEP]: '#15476c', [T.WATER]: '#2b709e', [T.SAND]: '#dcc98d', [T.GRASS]: '#6cae54',
  [T.TALL]: '#4c8f3e', [T.FLOWER]: '#78b95c', [T.FOREST]: '#497a45', [T.SNOW]: '#eaf3f6',
  [T.ICE]: '#b7e0e8', [T.ASH]: '#5b4f4d', [T.LAVA]: '#d9502a', [T.PATH]: '#cbb488',
  [T.PLAZA]: '#ddcda6', [T.BRIDGE]: '#9a7a4e', [T.ROCKY]: '#8b8478', [T.MARSH]: '#59744f', [T.DIRT]: '#a88a63',
}

export function drawTile (ctx, tx, ty, t, seed = 0) {
  const x = tx * TILE, y = ty * TILE
  const h = hash2(tx, ty, seed)
  const h2 = hash2(tx, ty, seed + 7)
  ctx.fillStyle = COL[t] || COL[T.GRASS]
  ctx.fillRect(x, y, TILE, TILE)
  const px = (ox, oy, w, hh, col) => { ctx.fillStyle = col; ctx.fillRect(x + ox, y + oy, w, hh) }

  switch (t) {
    case T.DEEP:
      px(0, 0, 32, 32, '#123f61')
      for (let i = 0; i < 3; i++) { const yy = 5 + ((h * 20 + i * 9) % 24); px(3 + ((i * 7 + h2 * 8) % 20), yy, 6, 2, 'rgba(70,140,190,.25)') }
      break
    case T.WATER:
      px(0, 0, 32, 32, '#2b709e')
      px(0, 0, 32, 3, 'rgba(255,255,255,.05)')
      for (let i = 0; i < 3; i++) {
        const yy = 6 + ((h * 26 + i * 8) % 22), xx = (h2 * 24 + i * 11) % 20
        px(xx, yy, 7, 2, 'rgba(160,220,245,.28)')
        px(xx + 2, yy + 2, 4, 1, 'rgba(160,220,245,.14)')
      }
      break
    case T.SAND:
      for (let i = 0; i < 6; i++) px((h * 31 + i * 7) % 30, (h2 * 31 + i * 11) % 30, 1.5, 1.5, i % 2 ? 'rgba(255,255,255,.25)' : 'rgba(160,130,70,.25)')
      if (h > .93) { px(22, 22, 4, 2, '#f4ead0'); px(23, 20, 2, 2, '#e8d9b4') }
      break
    case T.GRASS:
      px(0, 0, 32, 32, h > .5 ? '#6cae54' : '#66a850')
      for (let i = 0; i < 5; i++) {
        const xx = (h * 31 + i * 6) % 29, yy = (h2 * 31 + i * 9) % 28
        px(xx, yy, 1.5, 3, 'rgba(48,110,48,.5)')
        if (i % 2) px(xx + 2, yy + 1, 1.5, 2, 'rgba(130,190,90,.5)')
      }
      if (h > .86) { px(14 + h * 8, 10 + h2 * 10, 2, 2, h2 > .5 ? '#f5e06a' : '#f7f7f7') }
      break
    case T.TALL:
      px(0, 0, 32, 32, h > .5 ? '#4c8f3e' : '#458638')
      for (let i = 0; i < 7; i++) {
        const xx = (h * 28 + i * 4.3) % 29, yy = 12 + ((h2 * 16 + i * 5) % 16)
        px(xx, yy, 2, 8, i % 2 ? '#3d7a32' : '#579a45')
        px(xx + 2, yy + 3, 1.5, 5, '#3f8034')
      }
      break
    case T.FLOWER:
      px(0, 0, 32, 32, '#78b95c')
      for (let i = 0; i < 4; i++) {
        const xx = (h * 26 + i * 7) % 27 + 2, yy = (h2 * 26 + i * 8) % 26 + 3
        const col = ['#f7d55c', '#f78fb8', '#f7f7f7', '#c79bf0'][(i + Math.floor(h * 8)) % 4]
        px(xx, yy + 2, 1.5, 3, '#3e7f36'); px(xx - 1, yy, 3, 2.5, col); px(xx, yy + .5, 1.5, 1.5, '#fff8d0')
      }
      break
    case T.FOREST:
      px(0, 0, 32, 32, h > .5 ? '#497a45' : '#416f3d')
      for (let i = 0; i < 4; i++) px((h * 30 + i * 8) % 28, (h2 * 30 + i * 7) % 28, 3, 2, i % 2 ? 'rgba(40,70,35,.4)' : 'rgba(120,150,70,.25)')
      break
    case T.SNOW:
      px(0, 0, 32, 32, h > .5 ? '#eaf3f6' : '#e3eef3')
      for (let i = 0; i < 5; i++) px((h * 30 + i * 7) % 30, (h2 * 30 + i * 6) % 30, 2, 2, 'rgba(170,200,220,.4)')
      if (h > .8) px(20, 20, 3, 3, '#ffffff')
      break
    case T.ICE:
      px(0, 0, 32, 32, '#b7e0e8')
      px(3, 8, 18, 1.5, 'rgba(255,255,255,.55)'); px(12, 8, 1.5, 12, 'rgba(255,255,255,.4)')
      px(18, 21, 10, 1.5, 'rgba(255,255,255,.35)')
      break
    case T.ASH:
      px(0, 0, 32, 32, h > .5 ? '#5b4f4d' : '#544947')
      for (let i = 0; i < 5; i++) px((h * 30 + i * 6) % 30, (h2 * 30 + i * 8) % 30, 2, 2, i % 3 ? 'rgba(30,25,25,.5)' : 'rgba(220,90,40,.6)')
      break
    case T.LAVA:
      px(0, 0, 32, 32, '#d9502a')
      px(0, 0, 32, 32, 'rgba(255,150,40,.35)')
      px(4 + h * 10, 6, 12, 3, '#ffb03a'); px(10, 18 + h2 * 8, 16, 3, '#ff8a2a')
      px(6, 24, 8, 2, '#8c2a18'); px(22, 10, 6, 2, '#8c2a18')
      break
    case T.PATH:
      px(0, 0, 32, 32, '#cbb488')
      for (let i = 0; i < 4; i++) px((h * 28 + i * 8) % 28, (h2 * 28 + i * 9) % 28, 3, 2, 'rgba(150,120,70,.3)')
      px(0, 0, 32, 1, 'rgba(255,255,255,.14)'); px(0, 31, 32, 1, 'rgba(120,95,55,.25)')
      break
    case T.PLAZA:
      px(0, 0, 32, 32, '#ddcda6')
      px(0, 15.5, 32, 1.5, 'rgba(150,130,90,.28)'); px(15.5, 0, 1.5, 32, 'rgba(150,130,90,.22)')
      px(2, 2, 12, 12, 'rgba(255,250,230,.14)'); px(18, 18, 12, 12, 'rgba(255,250,230,.1)')
      break
    case T.BRIDGE:
      px(0, 0, 32, 32, '#7ba5b8')
      px(1, 0, 30, 32, '#9a7a4e')
      for (let i = 0; i < 4; i++) px(1, i * 8 + 1, 30, 1.5, '#6f5636')
      px(0, 0, 2, 32, '#6f5636'); px(30, 0, 2, 32, '#6f5636')
      px(5, 4, 1.5, 1.5, '#d9c49a'); px(26, 12, 1.5, 1.5, '#d9c49a')
      break
    case T.ROCKY:
      px(0, 0, 32, 32, h > .5 ? '#8b8478' : '#827b70')
      px(4, 5, 10, 2, 'rgba(60,55,50,.35)'); px(16, 14, 1.5, 9, 'rgba(60,55,50,.3)')
      px(8, 24, 12, 2, 'rgba(190,185,170,.2)')
      break
    case T.MARSH:
      px(0, 0, 32, 32, '#59744f')
      px(4 + h * 8, 6 + h2 * 8, 12, 5, 'rgba(60,110,100,.55)')
      px(6 + h * 8, 7 + h2 * 8, 5, 2, 'rgba(160,210,190,.3)')
      px(18, 20, 9, 4, 'rgba(50,80,50,.5)')
      break
    case T.DIRT:
      px(0, 0, 32, 32, '#a88a63')
      for (let i = 0; i < 4; i++) px((h * 28 + i * 8) % 28, (h2 * 28 + i * 7) % 28, 3, 2, 'rgba(120,90,60,.35)')
      break
  }
}

export function drawProp (ctx, p, time = 0, night = 0) {
  const x = p.x * TILE, y = p.y * TILE
  const h = p.seed
  const cx = x + 16
  ctx.save()
  const shadow = (w, hh) => { ctx.fillStyle = 'rgba(20,30,20,.22)'; ctx.beginPath(); ctx.ellipse(x + 16, y + 26, w, hh, 0, 0, 7); ctx.fill() }
  switch (p.type) {
    case 'tree': {
      shadow(12, 4)
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(cx - 3, y + 8, 6, 20)
      ctx.fillStyle = '#543a25'; ctx.fillRect(cx - 3, y + 8, 2, 20)
      const sway = Math.sin(time * .8 + h * 6) * 1.2
      const blobs = [[0, -8, 17, 15], [-10, 2, 13, 12], [10, 1, 13, 12], [-2, 10, 15, 11]]
      for (const [ox, oy, w, hh] of blobs) {
        ctx.fillStyle = h > .5 ? '#356b38' : '#2f6334'
        ctx.beginPath(); ctx.ellipse(cx + ox + sway, y + 6 + oy, w, hh, 0, 0, 7); ctx.fill()
      }
      ctx.fillStyle = 'rgba(120,190,100,.35)'
      ctx.beginPath(); ctx.ellipse(cx - 4 + sway, y - 6, 8, 6, 0, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(20,50,25,.3)'
      ctx.beginPath(); ctx.ellipse(cx + 6 + sway, y + 12, 10, 7, 0, 0, 7); ctx.fill()
      break
    }
    case 'pine': {
      shadow(10, 3.5)
      ctx.fillStyle = '#5a3f2c'; ctx.fillRect(cx - 2, y + 16, 4, 13)
      for (let i = 0; i < 3; i++) {
        const w = 17 - i * 4, yy = y + 2 + i * 10
        ctx.fillStyle = i === 0 ? '#2e6b55' : i === 1 ? '#2a604c' : '#255744'
        ctx.beginPath(); ctx.moveTo(cx, yy - 12); ctx.lineTo(cx - w, yy + 8); ctx.lineTo(cx + w, yy + 8); ctx.closePath(); ctx.fill()
        ctx.fillStyle = 'rgba(240,250,255,.7)'
        ctx.beginPath(); ctx.moveTo(cx, yy - 12); ctx.lineTo(cx - w * .5, yy + 1); ctx.lineTo(cx + w * .1, yy - 1); ctx.closePath(); ctx.fill()
      }
      break
    }
    case 'palm': {
      shadow(11, 3.5)
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, y + 29); ctx.quadraticCurveTo(cx + 5, y + 12, cx + 2, y - 2); ctx.stroke()
      ctx.fillStyle = '#3e8a4a'
      for (let i = 0; i < 5; i++) {
        const a = -2.7 + i * .55
        ctx.beginPath(); ctx.ellipse(cx + 2 + Math.cos(a) * 12, y - 4 + Math.sin(a) * 7, 11, 3.4, a, 0, 7); ctx.fill()
      }
      ctx.fillStyle = '#c98a3b'; ctx.beginPath(); ctx.arc(cx + 2, y + 2, 3, 0, 7); ctx.fill()
      break
    }
    case 'rock': case 'boulder': {
      const sz = p.type === 'boulder' ? 1.4 : 1
      shadow(10 * sz, 3.5)
      ctx.fillStyle = '#77726a'; ctx.beginPath(); ctx.ellipse(cx, y + 20, 10 * sz, 8 * sz, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#918b80'; ctx.beginPath(); ctx.ellipse(cx - 2, y + 17, 8 * sz, 6.5 * sz, 0, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cx - 4, y + 15, 3.5 * sz, 2.5 * sz, 0, 0, 7); ctx.fill()
      break
    }
    case 'cactus': {
      shadow(7, 2.5)
      ctx.fillStyle = '#3f7d45'; ctx.fillRect(cx - 4, y + 6, 8, 23); ctx.fillRect(cx - 10, y + 13, 6, 5); ctx.fillRect(cx - 10, y + 7, 4, 9)
      ctx.fillRect(cx + 5, y + 17, 6, 4); ctx.fillRect(cx + 8, y + 11, 4, 9)
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx - 2, y + 8, 2, 19)
      ctx.fillStyle = '#d9c49a'; for (let i = 0; i < 4; i++) { ctx.fillRect(cx - 5, y + 10 + i * 5, 1, 2); ctx.fillRect(cx + 4, y + 12 + i * 5, 1, 2) }
      break
    }
    case 'deadtree': {
      shadow(8, 2.5)
      ctx.strokeStyle = '#4a3a32'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, y + 30); ctx.lineTo(cx - 1, y + 8); ctx.stroke()
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(cx - 1, y + 16); ctx.lineTo(cx - 9, y + 7); ctx.moveTo(cx, y + 12); ctx.lineTo(cx + 8, y + 3); ctx.stroke()
      break
    }
    case 'stump': {
      shadow(8, 2.5)
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(cx - 7, y + 16, 14, 12)
      ctx.fillStyle = '#9a744a'; ctx.beginPath(); ctx.ellipse(cx, y + 16, 7, 3, 0, 0, 7); ctx.fill()
      ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, y + 16, 4, 1.6, 0, 0, 7); ctx.stroke()
      break
    }
    case 'mushroom': {
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx - 1, y + 20, 3, 7)
      ctx.fillStyle = h > .5 ? '#d94848' : '#c9743a'; ctx.beginPath(); ctx.ellipse(cx, y + 18, 7, 5, 0, Math.PI, 0); ctx.fill()
      ctx.fillStyle = '#fff3e0'; ctx.fillRect(cx - 4, y + 16, 2, 2); ctx.fillRect(cx + 2, y + 15, 2, 2)
      break
    }
    case 'flower': {
      ctx.fillStyle = '#3e7f36'; ctx.fillRect(cx, y + 20, 1.5, 8)
      const cols = ['#f7d55c', '#f78fb8', '#f7f7f7', '#c79bf0', '#f7a34c']
      const col = cols[Math.floor(h * cols.length) % cols.length]
      ctx.fillStyle = col
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i * 1.57) * 3, y + 19 + Math.sin(i * 1.57) * 3, 2.2, 0, 7); ctx.fill() }
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(cx, y + 19, 1.5, 0, 7); ctx.fill()
      break
    }
    case 'bush': {
      shadow(9, 3)
      ctx.fillStyle = '#397a3c'; ctx.beginPath(); ctx.ellipse(cx, y + 21, 10, 8, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#4f9448'; ctx.beginPath(); ctx.ellipse(cx - 3, y + 18, 7, 5.5, 0, 0, 7); ctx.fill()
      if (h > .6) { ctx.fillStyle = '#e05a6a'; ctx.beginPath(); ctx.arc(cx + 3, y + 20, 1.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx - 4, y + 22, 1.4, 0, 7); ctx.fill() }
      break
    }
    case 'reed': {
      ctx.strokeStyle = '#5f7a3a'; ctx.lineWidth = 1.5
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 5 + i * 3, y + 30); ctx.lineTo(cx - 6 + i * 3 + (i % 2), y + 8 + i * 2); ctx.stroke() }
      ctx.fillStyle = '#7a5a32'; ctx.fillRect(cx - 6, y + 10, 2.5, 5); ctx.fillRect(cx + 3, y + 13, 2.5, 5)
      break
    }
    case 'lamp': {
      shadow(5, 2)
      ctx.fillStyle = '#2f3542'; ctx.fillRect(cx - 1.5, y + 6, 3, 24)
      ctx.fillRect(cx - 5, y + 28, 10, 2)
      ctx.fillStyle = '#f7d774'; ctx.beginPath(); ctx.arc(cx, y + 4, 4, 0, 7); ctx.fill()
      ctx.strokeStyle = '#2f3542'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, y + 4, 5, 0, 7); ctx.stroke()
      break
    }
    case 'sign': {
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(cx - 1.5, y + 16, 3, 13)
      ctx.fillStyle = '#b68a55'; ctx.fillRect(cx - 9, y + 6, 18, 11)
      ctx.fillStyle = '#8a6136'; ctx.fillRect(cx - 9, y + 15, 18, 2)
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - 6, y + 9, 12, 1.5); ctx.fillRect(cx - 6, y + 12, 8, 1.5)
      break
    }
    case 'chest': {
      shadow(9, 3)
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(cx - 8, y + 16, 16, 12)
      ctx.fillStyle = '#8a6136'; ctx.fillRect(cx - 8, y + 14, 16, 5)
      ctx.fillStyle = '#d4af37'; ctx.fillRect(cx - 8, y + 19, 16, 2); ctx.fillRect(cx - 2, y + 18, 4, 6)
      break
    }
    case 'rift': {
      const t = time * 1.6 + h * 8
      ctx.save()
      ctx.translate(cx, y + 14)
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26)
      glow.addColorStop(0, 'rgba(190,120,255,.55)'); glow.addColorStop(1, 'rgba(120,60,220,0)')
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill()
      ctx.rotate(t * .2)
      ctx.strokeStyle = 'rgba(220,170,255,.9)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 15, 0, 0, 7); ctx.stroke()
      ctx.strokeStyle = 'rgba(150,90,255,.8)'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 12, 1, 0, 7); ctx.stroke()
      ctx.rotate(-t * .5)
      for (let i = 0; i < 4; i++) {
        const a = i * 1.57 + t * .2
        ctx.fillStyle = '#c79bf0'; ctx.fillRect(Math.cos(a) * 13 - 1.5, Math.sin(a) * 13 - 1.5, 3, 3)
      }
      ctx.restore()
      break
    }
    case 'berry': {
      shadow(8, 2.5)
      const b = p.ready !== false
      ctx.fillStyle = b ? '#397a3c' : '#5b6e3c'; ctx.beginPath(); ctx.ellipse(cx, y + 21, 9, 7, 0, 0, 7); ctx.fill()
      ctx.fillStyle = b ? '#4f9448' : '#72824c'; ctx.beginPath(); ctx.ellipse(cx - 3, y + 18, 6, 5, 0, 0, 7); ctx.fill()
      if (b) { ctx.fillStyle = '#e0556a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx - 4 + i * 4, y + 20 + (i % 2) * 3, 1.8, 0, 7); ctx.fill() } }
      break
    }
  }
  ctx.restore()
}

// ---------- buildings ----------
export function drawBuilding (ctx, b, time = 0) {
  const x = b.x * TILE, y = b.y * TILE
  const w = b.w * TILE, h = b.h * TILE
  const roofH = Math.min(44, h * 0.52)
  ctx.save()
  // shadow
  ctx.fillStyle = 'rgba(20,25,35,.22)'
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 2, w * .52, 9, 0, 0, 7); ctx.fill()
  // walls
  ctx.fillStyle = b.wall; ctx.fillRect(x + 3, y + roofH - 4, w - 6, h - roofH + 4)
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 3, y + roofH - 4, w - 6, 4)
  // plank / brick texture
  ctx.fillStyle = 'rgba(120,100,80,.16)'
  for (let yy = y + roofH + 6; yy < y + h - 6; yy += 10) ctx.fillRect(x + 5, yy, w - 10, 1.5)
  // door
  const dx = b.door.x * TILE - x, dy = b.door.y * TILE - y
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(dx + 5, y + h - 30, 22, 30)
  ctx.fillStyle = '#5a3f2c'; ctx.fillRect(dx + 7, y + h - 28, 18, 28)
  ctx.fillStyle = '#8a6136'; ctx.fillRect(dx + 7, y + h - 28, 18, 3)
  ctx.fillStyle = '#e8c45a'; ctx.fillRect(dx + 20, y + h - 15, 2.5, 2.5)
  ctx.fillStyle = 'rgba(255,220,140,.35)'; ctx.fillRect(dx + 9, y + h - 25, 14, 11)
  // windows
  const winY = y + roofH + 8
  for (let i = 0; i < Math.max(1, Math.floor(b.w / 2) - 1); i++) {
    const wx = x + 16 + i * 40
    if (Math.abs(wx + 8 - (x + dx + 16)) < 26) continue
    if (wx + 18 > x + w - 8) break
    ctx.fillStyle = '#3b4a5e'; ctx.fillRect(wx, winY, 16, 15)
    ctx.fillStyle = '#a9d4e8'; ctx.fillRect(wx + 2, winY + 2, 12, 11)
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(wx + 3, winY + 3, 4, 4)
    ctx.fillStyle = '#6b5a45'; ctx.fillRect(wx + 7, winY + 2, 1.5, 11)
  }
  // roof
  const rh = roofH + 10
  ctx.fillStyle = shade(b.roof, -30)
  ctx.beginPath()
  ctx.moveTo(x - 8, y + rh)
  ctx.lineTo(x + w * .5, y - 12)
  ctx.lineTo(x + w + 8, y + rh)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = b.roof
  ctx.beginPath()
  ctx.moveTo(x - 4, y + rh - 3)
  ctx.lineTo(x + w * .5, y - 8)
  ctx.lineTo(x + w + 4, y + rh - 3)
  ctx.closePath(); ctx.fill()
  // shingles
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - 4, y + rh - 3); ctx.lineTo(x + w * .5, y - 8); ctx.lineTo(x + w + 4, y + rh - 3); ctx.closePath(); ctx.clip()
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1.5
  for (let yy = y + 6; yy < y + rh; yy += 9) { ctx.beginPath(); ctx.moveTo(x - 6, yy); ctx.lineTo(x + w + 6, yy); ctx.stroke() }
  for (let xx = x - 8; xx < x + w + 8; xx += 16) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + rh); ctx.stroke() }
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,.22)'
  ctx.beginPath(); ctx.moveTo(x + 2, y + rh - 4); ctx.lineTo(x + w * .5, y - 6); ctx.lineTo(x + w * .52, y - 2); ctx.lineTo(x + 12, y + rh - 4); ctx.closePath(); ctx.fill()
  // roof ridge
  ctx.strokeStyle = shade(b.roof, -45); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(x + w * .5, y - 8); ctx.lineTo(x + w * .5, y + rh); ctx.stroke()
  // sign
  if (b.name) {
    const sw = Math.min(w - 20, 96)
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(x + w / 2 - sw / 2, y + rh - 1, sw, 18)
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1; ctx.strokeRect(x + w / 2 - sw / 2 + 1, y + rh, sw - 2, 16)
    ctx.fillStyle = '#f5e6b8'; ctx.font = 'bold 9px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(b.name, x + w / 2, y + rh + 9)
  }
  // emblem
  if (b.type !== 'house' && b.type !== 'shack') {
    const icon = { center: '✚', mart: '◓', lab: '⚗', gym: '⚔', tower: '♛' }[b.type] || '★'
    ctx.fillStyle = b.type === 'center' ? '#ff6b6b' : b.type === 'mart' ? '#6ba8ff' : b.type === 'tower' ? '#d4af37' : '#f5e6b8'
    ctx.font = 'bold 18px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(icon, x + w / 2, y + roofH - 2)
  }
  // chimney
  if (b.type === 'house' || b.type === 'lab' || b.type === 'tower') {
    ctx.fillStyle = '#8a5a4a'; ctx.fillRect(x + w * .7, y + 4, 10, 16)
    ctx.fillStyle = '#6b4034'; ctx.fillRect(x + w * .7, y + 4, 10, 3)
  }
  ctx.restore()
}

// ---------- chunk renderer ----------
export class WorldRenderer {
  constructor (world) {
    this.world = world
    this.chunks = new Map()
    this.CHUNK = 16
    this.propChunks = new Map()
    for (const p of world.props) {
      if (['chest','rift','berry'].includes(p.type)) continue
      const k = this.key(Math.floor(p.x / 16), Math.floor(p.y / 16))
      if (!this.propChunks.has(k)) this.propChunks.set(k, [])
      this.propChunks.get(k).push(p)
    }
    this.buildChunks = new Map()
    for (const b of world.buildings) {
      const x0 = Math.floor((b.x - 1) / 16), x1 = Math.floor((b.x + b.w + 1) / 16)
      const y0 = Math.floor((b.y - 1) / 16), y1 = Math.floor((b.y + b.h + 1) / 16)
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const k = this.key(cx, cy); if (!this.buildChunks.has(k)) this.buildChunks.set(k, []); this.buildChunks.get(k).push(b)
      }
    }
  }

  key (cx, cy) { return cx + ',' + cy }

  getChunk (cx, cy) {
    const k = this.key(cx, cy)
    if (this.chunks.has(k)) return this.chunks.get(k)
    const S = this.CHUNK * TILE
    const c = document.createElement('canvas')
    c.width = S; c.height = S
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.save(); ctx.translate(-cx * S, -cy * S)
    const w = this.world
    for (let ty = cy * this.CHUNK; ty < (cy + 1) * this.CHUNK; ty++) {
      for (let tx = cx * this.CHUNK; tx < (cx + 1) * this.CHUNK; tx++) {
        if (tx < 0 || ty < 0 || tx >= w.w || ty >= w.h) continue
        drawTile(ctx, tx, ty, w.tile(tx, ty), w.seed)
      }
    }
    // buildings then props, sorted by y
    const items = [...(this.buildChunks.get(k) || []), ...(this.propChunks.get(k) || [])]
    items.sort((a, b) => (a.y + (a.h || 1)) - (b.y + (b.h || 1)))
    for (const it of items) {
      if (it.w) drawBuilding(ctx, it)
      else drawProp(ctx, it)
    }
    ctx.restore()
    if (this.chunks.size > 90) {
      const first = this.chunks.keys().next().value
      this.chunks.delete(first)
    }
    this.chunks.set(k, c)
    return c
  }
}

// ---------- lighting helpers ----------
export function drawLight (ctx, x, y, radius, color, strength = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, hexAlpha(color, 0.55 * strength))
  g.addColorStop(0.45, hexAlpha(color, 0.22 * strength))
  g.addColorStop(1, hexAlpha(color, 0))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill()
}
