import { POKEDEX } from './pokedata.js'

export const TILE = 32
export const MAP_W = 140
export const MAP_H = 110
export const WORLD_W = MAP_W * TILE
export const WORLD_H = MAP_H * TILE

export const T = {
  GRASS: 0, PATH: 1, WATER: 2, TALL: 3, FLOWER: 4, STONE: 5,
  HEDGE: 6, SAND: 7, BRIDGE: 8, SOIL: 9, LILY: 10, ROCK: 11
}

export const ZONES = [
  { id: 'village', key: 'zoneVillage', x: 70, y: 96, r: 14, color: '#f5c451', icon: '⌂' },
  { id: 'rose', key: 'zoneRose', x: 24, y: 24, r: 21, color: '#ff8fa3', icon: '✿' },
  { id: 'lake', key: 'zoneLake', x: 108, y: 36, r: 23, color: '#72c7dc', icon: '≈' },
  { id: 'greenhouse', key: 'zoneGreenhouse', x: 36, y: 48, r: 19, color: '#ff9a62', icon: '♨' },
  { id: 'fireflies', key: 'zoneFireflies', x: 104, y: 90, r: 21, color: '#a78bfa', icon: '✦' },
  { id: 'heart', key: 'zoneHeart', x: 70, y: 57, r: 17, color: '#f5c451', icon: '◈' }
]

const ARENA_DEFS = [
  {
    id: 'rose', zone: 'rose', x: 24, y: 23, color: '#ff8fa3', icon: '✿',
    badgeKey: 'badgeRose', arenaKey: 'arenaRose', titleKey: 'leaderRoseTitle',
    leader: 'Rosalinde', nameKey: 'Rosalinde',
    team: [315, 182, 154].map((id, i) => ({ id, level: 8 + i * 2 })),
    reward: 70
  },
  {
    id: 'lake', zone: 'lake', x: 108, y: 35, color: '#72c7dc', icon: '≈',
    badgeKey: 'badgeLake', arenaKey: 'arenaLake', titleKey: 'leaderLakeTitle',
    leader: 'Marin', nameKey: 'Marin',
    team: [{ id: 8, level: 12 }, { id: 130, level: 13 }, { id: 395, level: 14 }],
    reward: 95
  },
  {
    id: 'greenhouse', zone: 'greenhouse', x: 35, y: 47, color: '#ff9a62', icon: '♨',
    badgeKey: 'badgeGreenhouse', arenaKey: 'arenaGreenhouse', titleKey: 'leaderGreenhouseTitle',
    leader: 'Ignis', nameKey: 'Ignis',
    team: [{ id: 5, level: 16 }, { id: 157, level: 17 }, { id: 257, level: 18 }],
    reward: 125
  },
  {
    id: 'fireflies', zone: 'fireflies', x: 104, y: 89, color: '#a78bfa', icon: '✦',
    badgeKey: 'badgeFireflies', arenaKey: 'arenaFireflies', titleKey: 'leaderFirefliesTitle',
    leader: 'Lumen', nameKey: 'Lumen',
    team: [{ id: 26, level: 21 }, { id: 135, level: 22 }, { id: 468, level: 23 }],
    reward: 160
  }
]

const TRAINER_DEFS = [
  { id: 'lina', name: 'Lina', zone: 'rose', x: 31, y: 31, palette: '#e7869d', team: [{ id: 315, level: 7 }, { id: 12, level: 7 }], dialogue: 'npcTrainer', reward: 22 },
  { id: 'theo', name: 'Théo', zone: 'rose', x: 18, y: 31, palette: '#d98b5a', team: [{ id: 43, level: 7 }, { id: 182, level: 8 }], dialogue: 'npcTrainer', reward: 24 },
  { id: 'mila', name: 'Mila', zone: 'lake', x: 100, y: 44, palette: '#6bb7d6', team: [{ id: 8, level: 11 }, { id: 134, level: 12 }], dialogue: 'npcTrainer', reward: 34 },
  { id: 'noam', name: 'Noam', zone: 'lake', x: 116, y: 40, palette: '#7b9be0', team: [{ id: 259, level: 11 }, { id: 130, level: 12 }], dialogue: 'npcTrainer', reward: 36 },
  { id: 'iris', name: 'Iris', zone: 'greenhouse', x: 42, y: 55, palette: '#e58f66', team: [{ id: 5, level: 15 }, { id: 136, level: 15 }], dialogue: 'npcTrainer', reward: 46 },
  { id: 'sacha', name: 'Sacha', zone: 'greenhouse', x: 28, y: 53, palette: '#d66b5d', team: [{ id: 256, level: 16 }, { id: 391, level: 16 }], dialogue: 'npcTrainer', reward: 50 },
  { id: 'alba', name: 'Alba', zone: 'fireflies', x: 96, y: 79, palette: '#a88be0', team: [{ id: 25, level: 20 }, { id: 135, level: 21 }], dialogue: 'npcTrainer', reward: 62 },
  { id: 'nino', name: 'Nino', zone: 'fireflies', x: 113, y: 83, palette: '#8294d8', team: [{ id: 282, level: 21 }, { id: 26, level: 22 }], dialogue: 'npcTrainer', reward: 66 }
]

const SIGN_DEFS = [
  { id: 'sign-village', x: 67, y: 97, key: 'npcSign1' },
  { id: 'sign-rose', x: 42, y: 50, key: 'npcSign2' },
  { id: 'sign-lake', x: 93, y: 49, key: 'npcSign2' },
  { id: 'sign-green', x: 50, y: 58, key: 'npcSign3' },
  { id: 'sign-heart', x: 70, y: 72, key: 'npcSign4' }
]

export function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed
  h = Math.imul(h ^ h >>> 13, 1274126177)
  return ((h ^ h >>> 16) >>> 0) / 4294967296
}

function smooth(t) { return t * t * (3 - 2 * t) }
function noise2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = smooth(x - xi), yf = smooth(y - yi)
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed)
  return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len = dx * dx + dy * dy
  let t = len ? ((px - x1) * dx + (py - y1) * dy) / len : 0
  t = Math.max(0, Math.min(1, t))
  const x = x1 + t * dx, y = y1 + t * dy
  return Math.hypot(px - x, py - y)
}

const PATHS = [
  { points: [[70, 102], [70, 90], [70, 78], [70, 66], [70, 58]], w: 2.7 },
  { points: [[70, 62], [57, 57], [46, 46], [36, 35], [26, 25]], w: 2.35 },
  { points: [[70, 62], [86, 56], [96, 47], [103, 40], [108, 36]], w: 2.3 },
  { points: [[70, 62], [59, 57], [48, 53], [39, 50], [36, 48]], w: 2.2 },
  { points: [[70, 62], [80, 69], [91, 79], [99, 86], [104, 90]], w: 2.35 },
  { points: [[26, 25], [28, 35], [31, 42], [35, 47]], w: 1.8 },
  { points: [[108, 36], [118, 50], [116, 67], [109, 79], [104, 90]], w: 1.85 },
  { points: [[70, 102], [55, 99], [44, 92], [37, 82], [35, 70]], w: 1.65 },
  { points: [[70, 102], [84, 100], [93, 96], [104, 90]], w: 1.65 },
  { points: [[57, 57], [62, 49], [70, 46], [80, 50]], w: 1.2 }
]

const WATER_SHAPES = [
  { type: 'ellipse', x: 109, y: 38, rx: 20, ry: 15 },
  { type: 'ellipse', x: 54, y: 89, rx: 7, ry: 5.5 },
  { type: 'ellipse', x: 14, y: 38, rx: 5.5, ry: 4.2 },
  { type: 'ellipse', x: 88, y: 20, rx: 4.5, ry: 3.2 },
  { type: 'river', points: [[99, 45], [92, 53], [87, 64], [82, 74]], w: 2.5 }
]

function ellipseDist(x, y, e) {
  return Math.hypot((x - e.x) / e.rx, (y - e.y) / e.ry)
}

export class GardenWorld {
  constructor(seed = 'jardin', config = {}) {
    this.seed = String(seed || 'jardin')
    this.config = config
    this.seedNum = hashSeed(this.seed)
    this.rng = mulberry32(this.seedNum)
    this.tiles = new Uint8Array(MAP_W * MAP_H)
    this.trees = []
    this.props = []
    this.npcs = []
    this.arenas = []
    this.signs = []
    this.zones = ZONES.map(z => ({ ...z }))
    this.discovered = new Set(['village'])
    this.fountain = { x: 74, y: 92 }
    this.heart = { x: 70, y: 57 }
    this.baseCanvas = null
    this.miniCanvas = null
    this.generate()
  }

  idx(x, y) { return y * MAP_W + x }
  get(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return T.HEDGE
    return this.tiles[this.idx(x, y)]
  }
  set(x, y, v) {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return
    this.tiles[this.idx(x, y)] = v
  }

  generate() {
    const rand = this.rng
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) this.set(x, y, T.GRASS)

    // Water bodies.
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        let water = false
        for (const shape of WATER_SHAPES) {
          if (shape.type === 'ellipse') {
            if (ellipseDist(x + .5, y + .5, shape) < 1) water = true
          } else {
            for (let i = 0; i < shape.points.length - 1; i++) {
              const a = shape.points[i], b = shape.points[i + 1]
              if (distToSegment(x + .5, y + .5, a[0], a[1], b[0], b[1]) < shape.w) water = true
            }
          }
        }
        if (water) this.set(x, y, T.WATER)
      }
    }
    // Arena island in the lake.
    this.carveCircle(108, 35, 7.6, T.GRASS)
    // Sandy shores.
    for (let y = 2; y < MAP_H - 2; y++) for (let x = 2; x < MAP_W - 2; x++) {
      if (this.get(x, y) !== T.GRASS) continue
      if (this.get(x + 1, y) === T.WATER || this.get(x - 1, y) === T.WATER || this.get(x, y + 1) === T.WATER || this.get(x, y - 1) === T.WATER) {
        if (rand() < .36) this.set(x, y, T.SAND)
      }
    }

    // Paths.
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        let d = 99
        for (const p of PATHS) {
          for (let i = 0; i < p.points.length - 1; i++) {
            const a = p.points[i], b = p.points[i + 1]
            d = Math.min(d, distToSegment(x + .5, y + .5, a[0], a[1], b[0], b[1]) / p.w)
          }
        }
        if (d < 1 + noise2(x * .22, y * .22, this.seedNum) * .28) {
          if (this.get(x, y) === T.WATER) this.set(x, y, T.BRIDGE)
          else if (this.get(x, y) !== T.BRIDGE) this.set(x, y, T.PATH)
        }
      }
    }

    // Plazas.
    for (const a of ARENA_DEFS) this.carveCircle(a.x, a.y, 7.2, T.STONE)
    this.carveCircle(70, 96, 8.6, T.STONE)
    this.carveCircle(70, 57, 8.8, T.STONE)
    this.carveCircle(74, 92, 2.6, T.STONE)
    this.carveCircle(35, 47, 9.5, T.SOIL)
    this.carveCircle(24, 23, 9.2, T.STONE)

    // Heart hedge ring with four gates.
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const d = Math.hypot(x - 70, y - 57)
      const ang = Math.atan2(y - 57, x - 70)
      const gate = Math.abs(Math.sin(ang * 2)) < .18
      if (d > 13.4 && d < 15.1 && !gate && this.get(x, y) !== T.STONE) this.set(x, y, T.HEDGE)
    }

    // Tall grass, flowers, hedges and soil.
    for (let y = 3; y < MAP_H - 3; y++) {
      for (let x = 3; x < MAP_W - 3; x++) {
        const t = this.get(x, y)
        if (t !== T.GRASS && t !== T.FLOWER) continue
        let pathNear = 99
        for (const p of PATHS) {
          for (let i = 0; i < p.points.length - 1; i++) {
            const a = p.points[i], b = p.points[i + 1]
            pathNear = Math.min(pathNear, distToSegment(x + .5, y + .5, a[0], a[1], b[0], b[1]))
          }
        }
        if (pathNear < 2.3) continue
        const zone = this.zoneAtTile(x, y)
        const n = noise2(x * .14, y * .14, this.seedNum + 33)
        if (['rose', 'lake', 'greenhouse', 'fireflies', 'heart'].includes(zone.id) && n > .58 && rand() < .8) {
          this.set(x, y, T.TALL)
        } else if (n > .67 && rand() < .45) {
          this.set(x, y, T.FLOWER)
        }
      }
    }
    // Guaranteed friendly meadow near the village.
    for (let y = 80; y < 88; y++) for (let x = 56; x < 66; x++) {
      if (this.get(x, y) === T.GRASS && noise2(x * .2, y * .2, this.seedNum) > .36) this.set(x, y, T.TALL)
    }
    // Hedge border.
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) this.set(x, y, T.HEDGE)
    }
    // A few hedge clusters.
    for (let i = 0; i < 22; i++) {
      const cx = 8 + Math.floor(rand() * (MAP_W - 16)), cy = 8 + Math.floor(rand() * (MAP_H - 16))
      if (this.nearPath(cx, cy, 5) || this.nearPlaza(cx, cy, 11)) continue
      const len = 2 + Math.floor(rand() * 4)
      const horiz = rand() > .5
      for (let j = 0; j < len; j++) {
        const x = cx + (horiz ? j : 0), y = cy + (horiz ? 0 : j)
        if (this.get(x, y) === T.GRASS || this.get(x, y) === T.FLOWER || this.get(x, y) === T.TALL) this.set(x, y, T.HEDGE)
      }
    }

    this.buildProps(rand)
    this.buildArenas()
    this.buildNPCs()
    this.buildBaseCanvas()
    this.buildMiniCanvas()
  }

  carveCircle(cx, cy, r, tile) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (Math.hypot(x + .5 - cx, y + .5 - cy) <= r) this.set(x, y, tile)
      }
    }
  }

  nearPath(x, y, d) {
    for (const p of PATHS) {
      for (let i = 0; i < p.points.length - 1; i++) {
        const a = p.points[i], b = p.points[i + 1]
        if (distToSegment(x + .5, y + .5, a[0], a[1], b[0], b[1]) < d) return true
      }
    }
    return false
  }

  nearPlaza(x, y, d) {
    if (Math.hypot(x - 70, y - 96) < d) return true
    if (Math.hypot(x - 70, y - 57) < d) return true
    return ARENA_DEFS.some(a => Math.hypot(x - a.x, y - a.y) < d)
  }

  zoneAtTile(x, y) {
    let best = this.zones[0], bd = 1e9
    for (const z of this.zones) {
      const d = Math.hypot(x - z.x, y - z.y) / z.r
      if (d < bd) { bd = d; best = z }
    }
    return best
  }

  zoneAt(px, py) {
    return this.zoneAtTile(px / TILE, py / TILE)
  }

  buildProps(rand) {
    const props = []
    // Trees.
    for (let y = 4; y < MAP_H - 4; y++) {
      for (let x = 4; x < MAP_W - 4; x++) {
        const tile = this.get(x, y)
        if (tile !== T.GRASS && tile !== T.FLOWER && tile !== T.TALL) continue
        if (this.nearPath(x, y, 2.6) || this.nearPlaza(x, y, 9)) continue
        const zone = this.zoneAtTile(x, y)
        let chance = .035
        if (zone.id === 'rose') chance = .065
        if (zone.id === 'lake') chance = .05
        if (zone.id === 'greenhouse') chance = .04
        if (zone.id === 'fireflies') chance = .06
        if (Math.hypot(x - 70, y - 57) > 18 && Math.hypot(x - 70, y - 57) < 26) chance = .085
        if (rand() < chance) {
          const type = zone.id === 'rose' ? (rand() < .45 ? 'blossom' : 'broad') : zone.id === 'greenhouse' ? (rand() < .35 ? 'pine' : 'broad') : zone.id === 'fireflies' ? (rand() < .3 ? 'pine' : 'broad') : 'broad'
          const scale = .78 + rand() * .5
          props.push({ kind: 'tree', x: (x + .5) * TILE + (rand() - .5) * 12, y: (y + .65) * TILE, scale, type, seed: rand() * 10, baseY: (y + .65) * TILE })
        }
      }
    }
    // Border tree line.
    for (let i = 0; i < 180; i++) {
      const side = Math.floor(rand() * 4)
      let x, y
      if (side === 0) { x = 3 + rand() * (MAP_W - 6); y = 3 + rand() * 4 }
      else if (side === 1) { x = 3 + rand() * (MAP_W - 6); y = MAP_H - 4 - rand() * 4 }
      else if (side === 2) { x = 3 + rand() * 4; y = 3 + rand() * (MAP_H - 6) }
      else { x = MAP_W - 4 - rand() * 4; y = 3 + rand() * (MAP_H - 6) }
      if (this.nearPath(x, y, 2.5)) continue
      const scale = .9 + rand() * .65
      props.push({ kind: 'tree', x: x * TILE, y: y * TILE, scale, type: rand() < .3 ? 'pine' : 'broad', seed: rand() * 10, baseY: y * TILE })
    }
    // Rocks, mushrooms, bushes.
    for (let i = 0; i < 120; i++) {
      const x = 5 + Math.floor(rand() * (MAP_W - 10)), y = 5 + Math.floor(rand() * (MAP_H - 10))
      const tile = this.get(x, y)
      if (![T.GRASS, T.FLOWER, T.TALL, T.SAND].includes(tile) || this.nearPath(x, y, 1.7) || this.nearPlaza(x, y, 8)) continue
      const r = rand()
      props.push({ kind: r < .45 ? 'rock' : r < .75 ? 'mushroom' : 'bush', x: (x + .5) * TILE, y: (y + .6) * TILE, scale: .6 + rand() * .7, seed: rand() * 10, baseY: (y + .6) * TILE })
    }
    // Lamps along the main paths.
    for (let i = 0; i < 26; i++) {
      const p = PATHS[Math.floor(rand() * 5)]
      const seg = Math.floor(rand() * (p.points.length - 1))
      const a = p.points[seg], b = p.points[seg + 1]
      const t = rand()
      const x = (a[0] + (b[0] - a[0]) * t + (rand() - .5) * 5) * TILE
      const y = (a[1] + (b[1] - a[1]) * t + (rand() - .5) * 5) * TILE
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE)
      if (this.isWalkableTile(tx, ty) && !this.nearPlaza(tx, ty, 7)) props.push({ kind: 'lamp', x, y, scale: .8 + rand() * .35, seed: rand() * 10, baseY: y })
    }
    // Benches, flower pots and market stall.
    props.push({ kind: 'stall', x: 79 * TILE, y: 98 * TILE, scale: 1, seed: 1, baseY: 98 * TILE })
    props.push({ kind: 'bench', x: 64 * TILE, y: 93 * TILE, scale: 1, seed: 2, baseY: 93 * TILE })
    props.push({ kind: 'bench', x: 72 * TILE, y: 64 * TILE, scale: 1, seed: 3, baseY: 64 * TILE })
    props.push({ kind: 'bench', x: 58 * TILE, y: 70 * TILE, scale: 1, seed: 4, baseY: 70 * TILE })
    for (const s of SIGN_DEFS) {
      props.push({ kind: 'sign', x: s.x * TILE + TILE / 2, y: s.y * TILE + TILE / 2, scale: 1, seed: 1, baseY: s.y * TILE + TILE / 2 })
    }
    for (const a of ARENA_DEFS) {
      for (let i = 0; i < 4; i++) {
        const ang = i * Math.PI / 2 + .4
        props.push({ kind: 'pot', x: (a.x + Math.cos(ang) * 6.5) * TILE, y: (a.y + Math.sin(ang) * 6.5) * TILE, scale: 1, seed: i, baseY: (a.y + Math.sin(ang) * 6.5) * TILE })
      }
    }
    // Fountain and heart.
    props.push({ kind: 'fountain', x: this.fountain.x * TILE, y: this.fountain.y * TILE, scale: 1, baseY: this.fountain.y * TILE })
    props.push({ kind: 'heart', x: this.heart.x * TILE, y: this.heart.y * TILE, scale: 1, baseY: this.heart.y * TILE })
    this.props = props
    this.trees = props.filter(p => p.kind === 'tree')
  }

  isWalkableTile(x, y) {
    const t = this.get(x, y)
    return t === T.GRASS || t === T.PATH || t === T.TALL || t === T.FLOWER || t === T.STONE || t === T.SAND || t === T.BRIDGE || t === T.SOIL || t === T.LILY
  }

  buildArenas() {
    this.arenas = ARENA_DEFS.map(def => ({
      ...def,
      px: def.x * TILE + TILE / 2,
      py: def.y * TILE + TILE / 2,
      arch: { x: (def.x + .2) * TILE, y: (def.y - 4.8) * TILE },
      cleared: false
    }))
    for (const a of this.arenas) {
      this.props.push({ kind: 'arena-arch', x: a.arch.x, y: a.arch.y, color: a.color, icon: a.icon, scale: 1, baseY: a.arch.y + 22, arenaId: a.id })
    }
  }

  buildNPCs() {
    const npcs = []
    npcs.push({ id: 'prof', kind: 'prof', name: 'Rose', x: 66 * TILE, y: 95 * TILE, palette: '#e7869d', baseY: 95 * TILE, dialogue: 'intro', nameKey: 'profName' })
    npcs.push({ id: 'healer', kind: 'healer', name: 'Lila', x: 76 * TILE, y: 92 * TILE, palette: '#7bbf9a', baseY: 92 * TILE, dialogue: 'npcHealer', nameKey: 'npcHealer' })
    npcs.push({ id: 'shop', kind: 'shop', name: 'Pétale', x: 80 * TILE, y: 98 * TILE, palette: '#e8b45c', baseY: 98 * TILE, dialogue: 'npcShop', nameKey: 'shopTitle' })
    npcs.push({ id: 'rival', kind: 'rival', name: 'Ari', x: 72 * TILE, y: 88 * TILE, palette: '#6b9bd6', baseY: 88 * TILE, dialogue: 'npcRival', nameKey: 'rival' })
    npcs.push({ id: 'villager1', kind: 'villager', name: 'Capucine', x: 62 * TILE, y: 99 * TILE, palette: '#d68b5d', baseY: 99 * TILE, dialogue: 'npcVillager1', nameKey: 'villager1' })
    npcs.push({ id: 'villager2', kind: 'villager', name: 'Basile', x: 81 * TILE, y: 93 * TILE, palette: '#8b9f68', baseY: 93 * TILE, dialogue: 'npcVillager2', nameKey: 'villager2' })
    npcs.push({ id: 'child', kind: 'child', name: 'Pom', x: 68 * TILE, y: 101 * TILE, palette: '#e7a65a', baseY: 101 * TILE, dialogue: 'npcChild', nameKey: 'child' })
    npcs.push({ id: 'elder', kind: 'elder', name: 'Sauge', x: 73 * TILE, y: 103 * TILE, palette: '#7e8f9e', baseY: 103 * TILE, dialogue: 'npcElder', nameKey: 'elder' })
    npcs.push({ id: 'villager3', kind: 'villager', name: 'Margot', x: 64 * TILE, y: 90 * TILE, palette: '#c77d9b', baseY: 90 * TILE, dialogue: 'npcVillager3', nameKey: 'villager3' })

    for (const t of TRAINER_DEFS) {
      npcs.push({
        id: t.id, kind: 'trainer', name: t.name, x: t.x * TILE, y: t.y * TILE, palette: t.palette,
        baseY: t.y * TILE, dialogue: t.dialogue, team: t.team, reward: t.reward, zone: t.zone, defeated: false,
        trainer: true, nameKey: t.name
      })
    }
    for (const a of this.arenas) {
      npcs.push({
        id: `leader-${a.id}`, kind: 'leader', name: a.leader, x: a.px, y: a.py + 8, palette: a.color,
        baseY: a.py + 8, arenaId: a.id, team: a.team, reward: a.reward, titleKey: a.titleKey, badgeKey: a.badgeKey,
        defeated: false, trainer: true, nameKey: a.leader
      })
    }
    // Sign posts are interaction objects, not NPCs.
    this.signs = SIGN_DEFS.map(s => ({ ...s, px: s.x * TILE + TILE / 2, py: s.y * TILE + TILE / 2, baseY: s.y * TILE + TILE / 2 }))
    this.npcs = npcs
  }

  buildBaseCanvas() {
    const S = 16
    const canvas = document.createElement('canvas')
    canvas.width = MAP_W * S
    canvas.height = MAP_H * S
    const ctx = canvas.getContext('2d')
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = this.get(x, y)
        const n = hash2(x, y, this.seedNum)
        let color = '#77b45b'
        if (t === T.GRASS) color = n > .5 ? '#78b75a' : '#72b056'
        else if (t === T.PATH) color = n > .5 ? '#e6cf9e' : '#dfc68f'
        else if (t === T.WATER) color = n > .5 ? '#66bed2' : '#60b6cc'
        else if (t === T.TALL) color = n > .5 ? '#5b9b49' : '#569447'
        else if (t === T.FLOWER) color = n > .5 ? '#7fbb5c' : '#78b459'
        else if (t === T.STONE) color = n > .5 ? '#d9d2b6' : '#d2caae'
        else if (t === T.HEDGE) color = n > .5 ? '#3f7a46' : '#3a7141'
        else if (t === T.SAND) color = n > .5 ? '#e6d39d' : '#dfcb94'
        else if (t === T.BRIDGE) color = n > .5 ? '#b9895f' : '#af8058'
        else if (t === T.SOIL) color = n > .5 ? '#a97450' : '#9e6a49'
        else if (t === T.ROCK) color = '#9a9a86'
        ctx.fillStyle = color
        ctx.fillRect(x * S, y * S, S, S)
        // Painterly speckles.
        if (t === T.GRASS || t === T.TALL || t === T.FLOWER) {
          ctx.fillStyle = n > .5 ? 'rgba(255,255,255,.055)' : 'rgba(20,60,30,.05)'
          ctx.fillRect(x * S + (n * 10 | 0), y * S + ((n * 31) % 10 | 0), 3, 2)
        }
        if (t === T.PATH) {
          ctx.fillStyle = 'rgba(120,85,45,.09)'
          ctx.fillRect(x * S + 3 + (n * 6 | 0), y * S + 4 + (n * 5 | 0), 2, 2)
        }
        if (t === T.WATER) {
          ctx.fillStyle = 'rgba(255,255,255,.12)'
          ctx.fillRect(x * S + 2, y * S + 3 + (n * 8 | 0), 6, 1)
        }
        if (t === T.STONE) {
          ctx.fillStyle = 'rgba(90,80,55,.09)'
          ctx.fillRect(x * S + 2, y * S + 2, 5, 1)
          ctx.fillRect(x * S + 7, y * S + 9, 5, 1)
        }
        if (t === T.HEDGE) {
          ctx.fillStyle = 'rgba(20,60,25,.16)'
          ctx.beginPath(); ctx.arc(x * S + 4, y * S + 6, 2.2, 0, 7); ctx.fill()
          ctx.beginPath(); ctx.arc(x * S + 10, y * S + 11, 2.8, 0, 7); ctx.fill()
        }
        if (t === T.SOIL) {
          ctx.fillStyle = 'rgba(70,40,20,.15)'
          ctx.fillRect(x * S + 2, y * S + 2, 11, 1)
          ctx.fillRect(x * S + 2, y * S + 8, 11, 1)
        }
        if (t === T.BRIDGE) {
          ctx.fillStyle = 'rgba(70,40,20,.18)'
          ctx.fillRect(x * S, y * S + 3, S, 1)
          ctx.fillRect(x * S, y * S + 9, S, 1)
        }
      }
    }
    // Soft path edges: overlay small grass tufts along path borders.
    for (let y = 2; y < MAP_H - 2; y++) for (let x = 2; x < MAP_W - 2; x++) {
      if (this.get(x, y) !== T.PATH) continue
      const edges = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      for (const [dx, dy] of edges) {
        if (this.get(x + dx, y + dy) === T.GRASS || this.get(x + dx, y + dy) === T.TALL) {
          ctx.fillStyle = 'rgba(67,135,55,.5)'
          const ex = (x + (dx > 0 ? 1 : 0)) * S, ey = (y + (dy > 0 ? 1 : 0)) * S
          for (let i = 0; i < 4; i++) {
            const px = ex + (dx ? 0 : (i * 4 + 1)), py = ey + (dy ? 0 : (i * 4 + 1))
            ctx.beginPath(); ctx.arc(px, py, 2.1, 0, 7); ctx.fill()
          }
        }
      }
    }
    this.baseCanvas = canvas
  }

  buildMiniCanvas() {
    const canvas = document.createElement('canvas')
    canvas.width = MAP_W * 2
    canvas.height = MAP_H * 2
    const ctx = canvas.getContext('2d')
    const colors = { 0: '#86b96a', 1: '#e3cf9f', 2: '#71c3d6', 3: '#5e9e4c', 4: '#86bb62', 5: '#d7d0b3', 6: '#3d7444', 7: '#e4d29c', 8: '#b7865c', 9: '#a16d4b', 10: '#71c3d6' }
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      ctx.fillStyle = colors[this.get(x, y)] || '#86b96a'
      ctx.fillRect(x * 2, y * 2, 2, 2)
    }
    this.miniCanvas = canvas
  }

  isSolid(px, py, radius = 9) {
    const points = [[px - radius, py - radius], [px + radius, py - radius], [px - radius, py + radius], [px + radius, py + radius]]
    for (const [x, y] of points) {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE)
      const t = this.get(tx, ty)
      if (t === T.WATER || t === T.HEDGE) return true
    }
    for (const tree of this.trees) {
      if (Math.abs(tree.x - px) > 40 || Math.abs(tree.y - py) > 40) continue
      if (Math.hypot(tree.x - px, tree.y - (py + 4)) < 9 * tree.scale + radius * .55) return true
    }
    for (const prop of this.props) {
      if (prop.kind === 'rock' && Math.hypot(prop.x - px, prop.y - py) < 10 * prop.scale + radius * .4) return true
    }
    return false
  }

  isTall(px, py) {
    return this.get(Math.floor(px / TILE), Math.floor(py / TILE)) === T.TALL
  }

  getDrawables(cam) {
    const pad = 80
    const left = cam.x - cam.vw / 2 / cam.zoom - pad
    const right = cam.x + cam.vw / 2 / cam.zoom + pad
    const top = cam.y - cam.vh / 2 / cam.zoom - pad
    const bottom = cam.y + cam.vh / 2 / cam.zoom + pad
    const out = []
    for (const p of this.props) {
      if (p.x > left && p.x < right && p.y > top && p.y < bottom) out.push(p)
    }
    return out
  }

  drawGround(ctx, cam, time) {
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.baseCanvas, 0, 0, WORLD_W, WORLD_H)
    const left = Math.max(0, Math.floor((cam.x - cam.vw / 2 / cam.zoom) / TILE) - 1)
    const right = Math.min(MAP_W - 1, Math.ceil((cam.x + cam.vw / 2 / cam.zoom) / TILE) + 1)
    const top = Math.max(0, Math.floor((cam.y - cam.vh / 2 / cam.zoom) / TILE) - 1)
    const bottom = Math.min(MAP_H - 1, Math.ceil((cam.y + cam.vh / 2 / cam.zoom) / TILE) + 1)
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const t = this.get(x, y)
        if (t === T.WATER || t === T.LILY) this.drawWater(ctx, x, y, time)
        else if (t === T.TALL) this.drawTallGrass(ctx, x, y, time)
        else if (t === T.FLOWER) this.drawFlowers(ctx, x, y, time)
        else if (t === T.HEDGE) this.drawHedge(ctx, x, y, time)
        else if (t === T.STONE) this.drawStone(ctx, x, y)
      }
    }
  }

  drawWater(ctx, x, y, time) {
    const bx = x * TILE, by = y * TILE
    const n = hash2(x, y, this.seedNum)
    ctx.fillStyle = 'rgba(255,255,255,.18)'
    for (let i = 0; i < 2; i++) {
      const ox = (Math.sin(time * .7 + x * 1.7 + i * 2.2 + n * 9) * 7) | 0
      ctx.fillRect(bx + 5 + ox, by + 8 + i * 10, 11, 1.3)
    }
    if (n > .8) {
      ctx.fillStyle = '#67a94f'
      ctx.beginPath(); ctx.ellipse(bx + 16, by + 16, 6, 3.5, .4, 0, 7); ctx.fill()
      ctx.fillStyle = '#ffc2d1'
      ctx.beginPath(); ctx.arc(bx + 17, by + 15, 2, 0, 7); ctx.fill()
    }
  }

  drawTallGrass(ctx, x, y, time) {
    const bx = x * TILE, by = y * TILE
    const n = hash2(x, y, this.seedNum)
    const sway = Math.sin(time * 2.1 + x * .7 + y * .4) * 1.5
    for (let i = 0; i < 5; i++) {
      const ox = 4 + i * 6 + (n * 4 | 0)
      const h = 10 + (hash2(x * 5 + i, y, this.seedNum) * 9)
      ctx.strokeStyle = i % 2 ? 'rgba(37,104,43,.75)' : 'rgba(63,132,53,.7)'
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(bx + ox, by + 30)
      ctx.quadraticCurveTo(bx + ox + sway, by + 30 - h * .6, bx + ox + sway * 1.7, by + 30 - h)
      ctx.stroke()
    }
    if (n > .85) {
      ctx.fillStyle = '#f4d36a'
      ctx.beginPath(); ctx.arc(bx + 22, by + 15, 1.7, 0, 7); ctx.fill()
    }
  }

  drawFlowers(ctx, x, y, time) {
    const bx = x * TILE, by = y * TILE
    const n = hash2(x, y, this.seedNum + 4)
    const colors = ['#ff8fa3', '#ffd36e', '#c8a4ff', '#fff6e6', '#ff9e7d']
    for (let i = 0; i < 3; i++) {
      const ox = 6 + i * 9 + (n * 5 | 0), oy = 18 + (hash2(x + i, y, this.seedNum) * 9 | 0)
      const sway = Math.sin(time * 1.4 + x + i) * .8
      ctx.strokeStyle = 'rgba(40,100,45,.6)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(bx + ox, by + 30); ctx.lineTo(bx + ox + sway, by + oy); ctx.stroke()
      ctx.fillStyle = colors[(i + x + y) % colors.length]
      for (let p = 0; p < 5; p++) {
        const a = p * Math.PI * .4 + time * .1
        ctx.beginPath(); ctx.arc(bx + ox + sway + Math.cos(a) * 2.2, by + oy + Math.sin(a) * 2.2, 1.8, 0, 7); ctx.fill()
      }
      ctx.fillStyle = '#f8d35e'
      ctx.beginPath(); ctx.arc(bx + ox + sway, by + oy, 1.2, 0, 7); ctx.fill()
    }
  }

  drawHedge(ctx, x, y, time) {
    const bx = x * TILE, by = y * TILE
    const n = hash2(x, y, this.seedNum + 7)
    ctx.fillStyle = '#346b3e'
    ctx.beginPath(); ctx.roundRect(bx + 1, by + 1, TILE - 2, TILE - 2, 5); ctx.fill()
    ctx.fillStyle = '#46824b'
    for (let i = 0; i < 3; i++) {
      const ox = 5 + ((n * 19 + i * 8) % 22), oy = 7 + ((n * 13 + i * 9) % 18)
      ctx.beginPath(); ctx.arc(bx + ox, by + oy, 4 + (i % 2) * 2, 0, 7); ctx.fill()
    }
    ctx.fillStyle = 'rgba(183,226,107,.28)'
    ctx.beginPath(); ctx.arc(bx + 8, by + 6, 2, 0, 7); ctx.fill()
  }

  drawStone(ctx, x, y) {
    const bx = x * TILE, by = y * TILE
    const n = hash2(x, y, this.seedNum + 11)
    ctx.strokeStyle = 'rgba(105,95,65,.13)'
    ctx.lineWidth = 1
    if (n > .5) {
      ctx.beginPath(); ctx.moveTo(bx + 3, by + 8); ctx.lineTo(bx + 13, by + 8); ctx.stroke()
    }
    if (n > .72) {
      ctx.beginPath(); ctx.arc(bx + 21, by + 20, 2.2, 0, 7); ctx.stroke()
    }
  }

  drawTree(ctx, tree, time) {
    const { x, y, scale, type } = tree
    const sway = Math.sin(time * .9 + tree.seed) * 1.6
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    ctx.fillStyle = 'rgba(18,50,28,.18)'
    ctx.beginPath(); ctx.ellipse(0, 2, 18, 7, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#8a5c3a'
    ctx.beginPath(); ctx.roundRect(-3.5, -20, 7, 23, 3); ctx.fill()
    ctx.fillStyle = '#a8784e'
    ctx.fillRect(-2, -18, 2, 18)
    if (type === 'pine') {
      const green = ['#2f6f43', '#3b8050', '#4a945b']
      for (let i = 0; i < 3; i++) {
        const yy = -20 - i * 12
        const w = 17 - i * 4
        ctx.fillStyle = green[i]
        ctx.beginPath(); ctx.moveTo(sway, yy - 22); ctx.lineTo(-w, yy + 4); ctx.lineTo(w, yy + 4); ctx.closePath(); ctx.fill()
      }
    } else if (type === 'blossom') {
      ctx.fillStyle = '#f5a9bd'
      ctx.beginPath(); ctx.arc(sway - 10, -31, 14, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(sway + 9, -30, 15, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(sway, -42, 16, 0, 7); ctx.fill()
      ctx.fillStyle = '#ffd0dc'
      ctx.beginPath(); ctx.arc(sway - 4, -39, 8, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.45)'
      for (let i = 0; i < 6; i++) {
        const a = i * 1.3 + tree.seed
        ctx.beginPath(); ctx.arc(sway + Math.cos(a) * 13, -34 + Math.sin(a) * 10, 1.6, 0, 7); ctx.fill()
      }
    } else {
      ctx.fillStyle = '#3d8451'
      ctx.beginPath(); ctx.arc(sway - 11, -29, 14, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(sway + 10, -28, 15, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(sway, -41, 16, 0, 7); ctx.fill()
      ctx.fillStyle = '#58a365'
      ctx.beginPath(); ctx.arc(sway - 7, -37, 8, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(sway + 7, -33, 6, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(220,245,150,.4)'
      ctx.beginPath(); ctx.arc(sway - 8, -44, 4, 0, 7); ctx.fill()
    }
    ctx.restore()
  }

  drawProp(ctx, prop, time) {
    const { x, y } = prop
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(prop.scale, prop.scale)
    if (prop.kind === 'rock') {
      ctx.fillStyle = 'rgba(18,50,28,.15)'
      ctx.beginPath(); ctx.ellipse(0, 2, 12, 5, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#9d9d88'
      ctx.beginPath(); ctx.roundRect(-9, -12, 18, 14, 6); ctx.fill()
      ctx.fillStyle = '#b8b8a1'
      ctx.beginPath(); ctx.roundRect(-6, -12, 8, 6, 3); ctx.fill()
    } else if (prop.kind === 'mushroom') {
      ctx.fillStyle = '#f3e6c8'
      ctx.fillRect(-1.5, -8, 3, 9)
      ctx.fillStyle = '#e06f63'
      ctx.beginPath(); ctx.ellipse(0, -8, 7, 4.5, 0, Math.PI, 0); ctx.fill()
      ctx.fillStyle = '#fff3dc'
      ctx.beginPath(); ctx.arc(-2, -10, 1.1, 0, 7); ctx.fill()
    } else if (prop.kind === 'bush') {
      ctx.fillStyle = 'rgba(18,50,28,.14)'
      ctx.beginPath(); ctx.ellipse(0, 2, 11, 4, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#4d925a'
      ctx.beginPath(); ctx.arc(-6, -5, 8, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(6, -5, 8, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(0, -10, 9, 0, 7); ctx.fill()
    } else if (prop.kind === 'lamp') {
      ctx.fillStyle = '#5e4b3a'
      ctx.fillRect(-1.5, -26, 3, 28)
      ctx.fillStyle = '#f8df8e'
      ctx.beginPath(); ctx.roundRect(-5, -34, 10, 11, 3); ctx.fill()
      ctx.fillStyle = 'rgba(255,232,145,.22)'
      ctx.beginPath(); ctx.arc(0, -29, 16, 0, 7); ctx.fill()
    } else if (prop.kind === 'bench') {
      ctx.fillStyle = 'rgba(18,50,28,.14)'
      ctx.beginPath(); ctx.ellipse(0, 2, 18, 5, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#9a6b43'
      ctx.beginPath(); ctx.roundRect(-17, -10, 34, 7, 3); ctx.fill()
      ctx.beginPath(); ctx.roundRect(-17, -20, 34, 6, 3); ctx.fill()
      ctx.fillStyle = '#7b5435'
      ctx.fillRect(-14, -4, 3, 8); ctx.fillRect(11, -4, 3, 8)
    } else if (prop.kind === 'pot') {
      ctx.fillStyle = '#b86a4c'
      ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(5, 3); ctx.lineTo(-5, 3); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#5a9d55'
      ctx.beginPath(); ctx.arc(-3, -12, 5, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.arc(4, -13, 5, 0, 7); ctx.fill()
      ctx.fillStyle = '#ffb2c4'
      ctx.beginPath(); ctx.arc(1, -16, 2.3, 0, 7); ctx.fill()
    } else if (prop.kind === 'stall') {
      ctx.fillStyle = 'rgba(18,50,28,.16)'
      ctx.beginPath(); ctx.ellipse(0, 2, 28, 7, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#8d5b3d'
      ctx.fillRect(-22, -30, 3, 34); ctx.fillRect(19, -30, 3, 34)
      ctx.fillStyle = '#d9b56d'
      ctx.beginPath(); ctx.roundRect(-24, -24, 48, 8, 2); ctx.fill()
      ctx.fillStyle = '#f5ead2'
      for (let i = 0; i < 6; i++) ctx.fillRect(-24 + i * 8, -24, 4, 8)
      ctx.fillStyle = '#e7869d'
      ctx.beginPath(); ctx.moveTo(-26, -24); ctx.lineTo(26, -24); ctx.lineTo(20, -36); ctx.lineTo(-20, -36); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#fff4dc'
      ctx.fillRect(-18, -16, 9, 6); ctx.fillRect(-5, -16, 9, 6); ctx.fillRect(8, -16, 9, 6)
    } else if (prop.kind === 'sign') {
      ctx.fillStyle = '#8a5c3a'
      ctx.fillRect(-2, -15, 4, 17)
      ctx.fillStyle = '#d9b56d'
      ctx.beginPath(); ctx.roundRect(-11, -27, 22, 14, 3); ctx.fill()
      ctx.fillStyle = 'rgba(90,60,30,.4)'
      ctx.fillRect(-7, -23, 14, 2); ctx.fillRect(-7, -19, 9, 2)
    } else if (prop.kind === 'arena-arch') {
      this.drawArenaArch(ctx, prop, time)
    } else if (prop.kind === 'fountain') {
      this.drawFountain(ctx, prop, time)
    } else if (prop.kind === 'heart') {
      this.drawHeart(ctx, prop, time)
    }
    ctx.restore()
  }

  drawArenaArch(ctx, prop, time) {
    const color = prop.color
    ctx.fillStyle = 'rgba(18,50,28,.18)'
    ctx.beginPath(); ctx.ellipse(0, 4, 48, 12, 0, 0, 7); ctx.fill()
    ctx.strokeStyle = '#e9dfc2'
    ctx.lineWidth = 9
    ctx.beginPath(); ctx.arc(0, -26, 34, Math.PI, 0); ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(0, -26, 34, Math.PI, 0); ctx.stroke()
    ctx.fillStyle = '#fff8e8'
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + i * Math.PI / 4
      ctx.beginPath(); ctx.arc(Math.cos(a) * 34, -26 + Math.sin(a) * 34, 3.5, 0, 7); ctx.fill()
    }
    ctx.fillStyle = color
    ctx.beginPath(); ctx.roundRect(-24, -84, 48, 20, 7); ctx.fill()
    ctx.fillStyle = '#fff8e8'
    ctx.font = '700 12px Fredoka, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(prop.icon, 0, -70)
    ctx.strokeStyle = '#fff8e8'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-38, -26); ctx.lineTo(-38, 0); ctx.moveTo(38, -26); ctx.lineTo(38, 0); ctx.stroke()
  }

  drawFountain(ctx, prop, time) {
    const pulse = Math.sin(time * 1.7) * 2
    ctx.fillStyle = 'rgba(18,50,28,.18)'
    ctx.beginPath(); ctx.ellipse(0, 4, 34, 11, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#c9c2a5'
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 12, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#69c7db'
    ctx.beginPath(); ctx.ellipse(0, -2, 24, 8, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#dcd6bd'
    ctx.beginPath(); ctx.roundRect(-5, -20, 10, 20, 4); ctx.fill()
    ctx.fillStyle = '#f6e6b0'
    ctx.beginPath(); ctx.arc(0, -23, 5, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.5)'
    for (let i = 0; i < 4; i++) {
      const a = time * .8 + i * 1.5
      ctx.beginPath(); ctx.arc(Math.cos(a) * 8, -24 + Math.sin(a) * 4, 1.5, 0, 7); ctx.fill()
    }
    ctx.strokeStyle = 'rgba(120,205,225,.55)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(0, -18, 11 + pulse * .2, Math.PI, 0); ctx.stroke()
  }

  drawHeart(ctx, prop, time) {
    const glow = .55 + Math.sin(time * 1.4) * .15
    ctx.fillStyle = 'rgba(18,50,28,.18)'
    ctx.beginPath(); ctx.ellipse(0, 4, 44, 12, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#d8d0b2'
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 15, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#69c7db'
    ctx.beginPath(); ctx.ellipse(0, -3, 30, 10, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#b9b092'
    ctx.beginPath(); ctx.roundRect(-7, -34, 14, 34, 4); ctx.fill()
    ctx.fillStyle = '#fff1b6'
    ctx.beginPath(); ctx.arc(0, -42, 12, 0, 7); ctx.fill()
    ctx.fillStyle = `rgba(245,196,81,${glow})`
    ctx.beginPath(); ctx.arc(0, -42, 24 + Math.sin(time * 1.4) * 3, 0, 7); ctx.fill()
    ctx.fillStyle = '#fffbdc'
    ctx.beginPath(); ctx.arc(-3, -45, 4, 0, 7); ctx.fill()
    ctx.fillStyle = '#6aa85c'
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + time * .2
      ctx.beginPath(); ctx.arc(Math.cos(a) * 20, -8 + Math.sin(a) * 6, 4, 0, 7); ctx.fill()
    }
  }

  drawMinimap(ctx, w, h, state) {
    ctx.clearRect(0, 0, w, h)
    if (!this.miniCanvas) return
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.miniCanvas, 0, 0, w, h)
    const sx = w / MAP_W, sy = h / MAP_H
    for (const z of this.zones) {
      if (!state.discovered?.has(z.id)) continue
      ctx.fillStyle = z.color + '44'
      ctx.beginPath(); ctx.arc(z.x * sx, z.y * sy, z.r * sx, 0, 7); ctx.fill()
    }
    for (const a of this.arenas) {
      ctx.fillStyle = state.arenas?.[a.id] ? '#f5c451' : a.color
      ctx.strokeStyle = '#fff8e8'
      ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(a.x * sx, a.y * sy, 3.4, 0, 7); ctx.fill(); ctx.stroke()
    }
    ctx.fillStyle = '#143d2b'
    ctx.beginPath(); ctx.arc(70 * sx, 57 * sy, 3.4, 0, 7); ctx.fill()
    if (state.player) {
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#143d2b'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(state.player.x / TILE * sx, state.player.y / TILE * sy, 3.2, 0, 7); ctx.fill(); ctx.stroke()
    }
  }

  drawFullMap(ctx, w, h, state) {
    ctx.clearRect(0, 0, w, h)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.miniCanvas, 0, 0, w, h)
    const sx = w / MAP_W, sy = h / MAP_H
    ctx.save()
    for (const z of this.zones) {
      if (!state.discovered?.has(z.id)) continue
      ctx.fillStyle = z.color + '33'
      ctx.beginPath(); ctx.arc(z.x * sx, z.y * sy, z.r * sx, 0, 7); ctx.fill()
      ctx.strokeStyle = z.color + '77'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(z.x * sx, z.y * sy, z.r * sx, 0, 7); ctx.stroke()
    }
    for (const a of this.arenas) {
      const cleared = state.arenas?.[a.id]
      ctx.fillStyle = cleared ? '#f5c451' : a.color
      ctx.strokeStyle = '#fffdf5'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(a.x * sx, a.y * sy, 6, 0, 7); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#143d2b'
      ctx.font = '700 8px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(a.icon, a.x * sx, a.y * sy + 3)
    }
    ctx.fillStyle = '#143d2b'
    ctx.beginPath(); ctx.arc(70 * sx, 57 * sy, 6, 0, 7); ctx.fill()
    ctx.fillStyle = '#f5c451'
    ctx.beginPath(); ctx.arc(70 * sx, 57 * sy, 3, 0, 7); ctx.fill()
    if (state.player) {
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#143d2b'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(state.player.x / TILE * sx, state.player.y / TILE * sy, 5, 0, 7); ctx.fill(); ctx.stroke()
    }
    ctx.restore()
  }
}

export function encounterPool(zoneId, randomize = false, rng = Math.random) {
  const groups = {
    village: [10, 13, 16, 43, 69, 133, 191, 263],
    rose: [43, 44, 45, 69, 70, 71, 114, 182, 187, 188, 189, 315, 406, 407, 547, 549, 12],
    lake: [54, 55, 60, 61, 129, 130, 194, 195, 183, 184, 134, 7, 8, 9, 258, 259, 260, 501, 502, 503, 393, 394, 395],
    greenhouse: [4, 5, 6, 37, 58, 155, 156, 157, 255, 256, 257, 390, 391, 392, 498, 499, 500, 136, 470],
    fireflies: [25, 26, 133, 135, 196, 197, 280, 281, 282, 447, 448, 468, 175, 176, 12, 123, 214, 212],
    heart: [3, 6, 9, 154, 157, 160, 254, 257, 260, 389, 392, 395, 497, 500, 503, 282, 448, 468, 143, 130]
  }
  let pool = (groups[zoneId] || groups.village).filter(id => POKEDEX.species[id])
  if (randomize) {
    const all = Object.values(POKEDEX.species).filter(s => !s.legendary)
    pool = all.map(s => s.id)
  }
  return pool.length ? pool : [133]
}
