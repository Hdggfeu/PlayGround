import { POKEDEX, DEX_BY_ID } from '../data/pokedex.js'
import { mulberry32, fbm, hash2, clamp, pickWeighted } from '../core/utils.js'
import { GYMS, CHAMPION } from '../data/gyms.js'

export const TILE = 32
export const MAP_W = 192
export const MAP_H = 192

export const T = {
  DEEP: 0, WATER: 1, SAND: 2, GRASS: 3, TALL: 4, FLOWER: 5, FOREST: 6, SNOW: 7, ICE: 8,
  ASH: 9, LAVA: 10, PATH: 11, PLAZA: 12, BRIDGE: 13, ROCKY: 14, MARSH: 15, DIRT: 16,
}
export const SOLID_TILES = new Set([T.DEEP, T.WATER, T.LAVA])
export const TILE_NAMES = ['Deep Water','Water','Sand','Grass','Tall Grass','Flowers','Forest','Snow','Ice','Ash','Lava','Path','Plaza','Bridge','Rocky Ground','Marsh','Dirt']

export const TOWNS = [
  { id:'willowbrook', name:'Willowbrook Town', x:96, y:96, r:11, biome:'meadow', color:'#e9c46a', desc:'The heart of the region. Professor Black\'s lab and the Champion\'s tower stand here.' },
  { id:'goldleaf', name:'Goldleaf Village', x:34, y:100, r:8, biome:'meadow', color:'#57b94c', desc:'A quiet village of gardeners and beekeepers, home of the Bloom Gym.' },
  { id:'frosthollow', name:'Frosthollow', x:92, y:26, r:8, biome:'snow', color:'#63cfd4', desc:'A snug alpine hamlet beneath the aurora, home of the Frost Gym.' },
  { id:'emberfall', name:'Emberfall', x:158, y:80, r:8, biome:'volcano', color:'#ef7d32', desc:'A forge town on the rim of the caldera, home of the Ember Gym.' },
  { id:'moonvale', name:'Moonvale', x:60, y:58, r:8, biome:'forest', color:'#e08cc0', desc:'A moonlit valley of flower shrines and fairy rings, home of the Moon Gym.' },
  { id:'tidecrest', name:'Tidecrest', x:112, y:166, r:8, biome:'lake', color:'#4f8fe8', desc:'A breezy harbor where the tide sings, home of the Tide Gym.' },
  { id:'stormwatch', name:'Stormwatch', x:158, y:34, r:8, biome:'mountain', color:'#f2c744', desc:'A wind-battered lookout above the clouds, home of the Spark Gym.' },
  { id:'dunebloom', name:'Dunebloom', x:32, y:158, r:8, biome:'desert', color:'#c9a54a', desc:'An oasis market at the desert\'s edge, home of the Terra Gym.' },
  { id:'ironhold', name:'Ironhold', x:136, y:126, r:8, biome:'mountain', color:'#8fa3b8', desc:'A fortress forge carved into the highlands, home of the Iron Gym.' },
]

const B_SPAWN = { x:96, y:105 }

const BUILDINGS = {
  center: { w:5, h:4, roof:'#d94b4b', wall:'#f3e6cf', sign:'Pokémon Center' },
  mart: { w:5, h:4, roof:'#3d7dd8', wall:'#eef1f7', sign:'Poké Mart' },
  lab: { w:6, h:4, roof:'#7a5cc4', wall:'#efe9dc', sign:'Black Lab' },
  gym: { w:7, h:5, roof:'#57b94c', wall:'#e8e1d2', sign:'Gym' },
  house: { w:4, h:3, roof:'#b06a48', wall:'#f5ead7', sign:'' },
  tower: { w:9, h:7, roof:'#d4af37', wall:'#2f3550', sign:'Champion Tower' },
  shack: { w:4, h:3, roof:'#8c7a5b', wall:'#e8dcc4', sign:'' },
}

export class World {
  constructor (seed = 20261126) {
    this.seed = seed
    this.w = MAP_W; this.h = MAP_H
    this.tiles = new Uint8Array(this.w * this.h)
    this.buildings = []
    this.props = []
    this.solidProps = new Set()
    this.npcs = []
    this.chests = []
    this.rifts = []
    this.berries = []
    this.signs = []
    this.towns = TOWNS.map(t => ({ ...t }))
    this.rng = mulberry32(seed)
    this.roads = []
    this.spawnTables = {}
    this.generateTerrain()
    this.generateRoads()
    this.generateTowns()
    this.generateProps()
    this.generateSpecial()
    this.generateNPCs()
    this.buildSpawnTables()
    this.buildMinimap()
  }

  idx (x, y) { return y * this.w + x }
  inBounds (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h }
  tile (x, y) { return this.inBounds(x, y) ? this.tiles[this.idx(x, y)] : T.DEEP }
  setTile (x, y, t) { if (this.inBounds(x, y)) this.tiles[this.idx(x, y)] = t }

  generateTerrain () {
    const s = this.seed
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const nx = x / this.w, ny = y / this.h
        const edge = Math.min(x, y, this.w - 1 - x, this.h - 1 - y) / 14
        const edgeF = clamp(edge, 0, 1)
        let e = fbm(x * 0.022, y * 0.022, s, 5) * 0.95 + 0.05
        e = e * (0.35 + 0.65 * edgeF) - (1 - edgeF) * 0.22
        const moist = fbm(x * 0.03 + 40, y * 0.03 - 20, s + 11, 4)
        const detail = fbm(x * 0.09, y * 0.09, s + 23, 3)
        let temp = ny * 1.18 - 0.04 + (fbm(x * 0.02 - 80, y * 0.02 + 30, s + 31, 3) - 0.5) * 0.28
        // caldera heat near Emberfall, dry heat near Dunebloom
        temp += 0.42 * Math.exp(-(((x - 164) ** 2 + (y - 66) ** 2) / 900))
        temp += 0.18 * Math.exp(-(((x - 30) ** 2 + (y - 160) ** 2) / 700))

        let t
        if (e < 0.335) t = T.DEEP
        else if (e < 0.405) t = T.WATER
        else if (e < 0.445) t = T.SAND
        else if (temp < 0.27 + detail * 0.05) {
          t = e > 0.66 ? T.ROCKY : T.SNOW
          if (e > 0.73) t = T.ROCKY
          if (moist > 0.62 && e < 0.58) t = T.ICE
        } else if (temp > 0.79 && moist < 0.46) {
          t = detail > 0.56 ? T.ROCKY : T.SAND
        } else if (temp > 0.72 && e > 0.6) {
          t = detail > 0.58 ? T.LAVA : T.ASH
          if (e < 0.64) t = T.ROCKY
        } else if (moist > 0.6) {
          t = e < 0.5 ? T.MARSH : T.FOREST
          if (temp > 0.6 && detail > 0.55) t = T.FOREST
        } else {
          t = T.GRASS
          if (detail > 0.62) t = T.TALL
          else if (detail < 0.36 && moist > 0.44) t = T.FLOWER
          if (moist > 0.52 && detail > 0.5) t = T.TALL
        }
        if ((t === T.GRASS || t === T.FOREST) && fbm(x * 0.14, y * 0.14, s + 77, 2) > 0.61) t = T.TALL
        this.setTile(x, y, t)
      }
    }
  }

  cost (t) {
    switch (t) {
      case T.DEEP: return 40
      case T.WATER: return 9
      case T.LAVA: return 60
      case T.MARSH: return 3.2
      case T.FOREST: return 1.8
      case T.SNOW: return 1.4
      case T.ROCKY: return 1.7
      case T.ASH: return 1.6
      case T.SAND: return 1.15
      default: return 1
    }
  }

  generateRoads () {
    const hub = this.towns[0]
    for (let i = 1; i < this.towns.length; i++) {
      const town = this.towns[i]
      const path = this.findPath(hub.x, hub.y, town.x, town.y)
      if (!path) continue
      this.roads.push(path)
      for (const [x, y] of path) {
        const t = this.tile(x, y)
        if (t === T.WATER || t === T.DEEP) this.setTile(x, y, T.BRIDGE)
        else if (t === T.LAVA) this.setTile(x, y, T.DIRT)
        else if (t !== T.PLAZA) this.setTile(x, y, T.PATH)
        // widen roads naturally
        if (hash2(x, y, this.seed + 5) > 0.55) {
          const d = hash2(x + 1, y, this.seed + 6) > 0.5 ? [1, 0] : [0, 1]
          const nx = x + d[0], ny = y + d[1]
          const nt = this.tile(nx, ny)
          if (nt !== T.WATER && nt !== T.DEEP && nt !== T.LAVA) this.setTile(nx, ny, T.PATH)
        }
      }
    }
  }

  findPath (sx, sy, tx, ty) {
    const W = this.w, H = this.h
    const open = [{ x: sx, y: sy, g: 0, f: 0 }]
    const gScore = new Float32Array(W * H).fill(Infinity)
    const came = new Int32Array(W * H).fill(-1)
    const closed = new Uint8Array(W * H)
    gScore[sy * W + sx] = 0
    const heap = []
    const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break;[heap[p], heap[i]] = [heap[i], heap[p]]; i = p } }
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; while (true) { let l = i * 2 + 1, r = l + 1, m = i; if (l < heap.length && heap[l].f < heap[m].f) m = l; if (r < heap.length && heap[r].f < heap[m].f) m = r; if (m === i) break;[heap[m], heap[i]] = [heap[i], heap[m]]; i = m } } return top }
    push(open[0])
    let guard = 0
    while (heap.length && guard++ < 120000) {
      const cur = pop()
      const ci = cur.y * W + cur.x
      if (closed[ci]) continue
      closed[ci] = 1
      if (cur.x === tx && cur.y === ty) {
        const out = []
        let k = ci
        while (k !== -1) { out.push([k % W, Math.floor(k / W)]); k = came[k] }
        return out.reverse()
      }
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nx = cur.x + dx, ny = cur.y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const ni = ny * W + nx
        if (closed[ni]) continue
        const step = this.cost(this.tile(nx, ny)) * (dx && dy ? 1.41 : 1)
        const ng = cur.g + step
        if (ng < gScore[ni]) {
          gScore[ni] = ng; came[ni] = ci
          const h = Math.abs(nx - tx) + Math.abs(ny - ty)
          push({ x: nx, y: ny, g: ng, f: ng + h })
        }
      }
    }
    return null
  }

  flattenTown (town) {
    const { x: cx, y: cy, r } = town
    for (let y = cy - r - 2; y <= cy + r + 2; y++) {
      for (let x = cx - r - 2; x <= cx + r + 2; x++) {
        if (!this.inBounds(x, y)) continue
        const d = Math.hypot(x - cx, y - cy)
        if (d > r + 2) continue
        const t = this.tile(x, y)
        if (t === T.WATER || t === T.DEEP || t === T.LAVA || t === T.MARSH) this.setTile(x, y, T.GRASS)
        if (d < r) {
          if (d < 2.2) this.setTile(x, y, T.PLAZA)
          else if (d < 3.4) this.setTile(x, y, T.PATH)
        }
      }
    }
    // spokes out of town
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      for (let i = r; i < r + 3; i++) {
        const x = cx + dx * i, y = cy + dy * i
        if (this.inBounds(x, y)) this.setTile(x, y, T.PATH)
      }
    }
  }

  addBuilding (town, type, rx, ry, opts = {}) {
    const def = BUILDINGS[type]
    const w = opts.w || def.w, h = opts.h || def.h
    const x = town.x + rx, y = town.y + ry
    if (x < 1 || y < 1 || x + w >= this.w - 1 || y + h >= this.h) return null
    const b = {
      type, x, y, w, h, town: town.id, name: opts.name || def.sign,
      roof: opts.roof || def.roof, wall: opts.wall || def.wall,
      door: { x: x + Math.floor(w / 2), y: y + h },
      solid: true, id: `${town.id}-${type}-${this.buildings.length}`,
      leader: opts.leader, gymId: opts.gymId,
    }
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.setTile(xx, yy, T.PLAZA)
    // clear the door tile and a small forecourt
    for (let xx = b.door.x - 1; xx <= b.door.x + 1; xx++) this.setTile(xx, b.door.y + 1, T.PATH)
    this.setTile(b.door.x, b.door.y, T.PATH)
    this.buildings.push(b)
    return b
  }

  generateTowns () {
    for (const town of this.towns) {
      this.flattenTown(town)
      town.buildings = []
      if (town.id === 'willowbrook') {
        town.buildings.push(this.addBuilding(town, 'lab', -8, -9, { name: 'Black Lab' }))
        town.buildings.push(this.addBuilding(town, 'center', 4, -8))
        town.buildings.push(this.addBuilding(town, 'mart', -11, -3))
        town.buildings.push(this.addBuilding(town, 'tower', 2, 3, { name: 'Champion Tower' }))
        town.buildings.push(this.addBuilding(town, 'house', -10, 4))
        town.buildings.push(this.addBuilding(town, 'house', 9, -1))
      } else {
        town.buildings.push(this.addBuilding(town, 'center', -6, -5))
        town.buildings.push(this.addBuilding(town, 'mart', 3, -4))
        const gym = GYMS.find(g => g.town === town.id)
        const b = this.addBuilding(town, 'gym', -2, 2, {
          name: `${gym?.leader || ''} Gym`, roof: gym?.color || '#57b94c', leader: gym?.leader, gymId: gym?.id,
        })
        if (b) town.buildings.push(b)
        town.buildings.push(this.addBuilding(town, 'house', -10, 2))
        town.buildings.push(this.addBuilding(town, 'house', 8, 1))
        town.buildings.push(this.addBuilding(town, 'shack', -10, -2))
      }
      // lamps & signs
      for (const [dx, dy] of [[-3,-3],[3,-3],[-3,3],[3,3],[0,-4],[0,4]]) {
        const x = town.x + dx, y = town.y + dy
        if (this.tile(x, y) === T.PLAZA || this.tile(x, y) === T.PATH) {
          this.props.push({ x, y, type: 'lamp', seed: hash2(x, y, this.seed) })
          this.solidProps.add(`${x},${y}`)
        }
      }
      const sx = town.x - 3, sy = town.y + 6
      if (!this.buildingAt(sx, sy)) {
        this.signs.push({ x: sx, y: sy, text: `${town.name}\n${town.desc}` })
        this.props.push({ x: sx, y: sy, type: 'sign', seed: hash2(sx, sy, this.seed) })
        this.solidProps.add(`${sx},${sy}`)
      }
    }
  }

  propAt (x, y) {
    return this.props.find(p => p.x === x && p.y === y)
  }

  generateProps () {
    const s = this.seed
    const townSet = new Set()
    for (const town of this.towns) {
      for (let y = town.y - town.r - 4; y <= town.y + town.r + 4; y++)
        for (let x = town.x - town.r - 4; x <= town.x + town.r + 4; x++) townSet.add(`${x},${y}`)
    }
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        const t = this.tile(x, y)
        if (t === T.DEEP || t === T.WATER || t === T.LAVA || t === T.PLAZA || t === T.PATH || t === T.BRIDGE) continue
        const h = hash2(x, y, s + 3)
        const h2 = hash2(x, y, s + 9)
        if (townSet.has(`${x},${y}`)) {
          if (h > 0.72 && (t === T.GRASS || t === T.FLOWER)) this.props.push({ x, y, type: 'flower', seed: h2 })
          continue
        }
        let type = null
        if (t === T.FOREST) type = h > 0.12 ? 'tree' : (h2 > 0.5 ? 'mushroom' : 'stump')
        else if (t === T.SNOW) type = h > 0.9 ? 'pine' : (h > 0.84 ? 'rock' : null)
        else if (t === T.ROCKY) type = h > 0.55 ? 'boulder' : (h > 0.35 ? 'rock' : null)
        else if (t === T.ASH) type = h > 0.82 ? 'deadtree' : (h > 0.7 ? 'rock' : null)
        else if (t === T.MARSH) type = h > 0.7 ? 'reed' : (h > 0.55 ? 'mushroom' : null)
        else if (t === T.SAND) type = h > 0.88 ? 'palm' : (h > 0.8 ? 'cactus' : (h > 0.72 ? 'rock' : null))
        else if (t === T.GRASS || t === T.TALL || t === T.FLOWER) {
          if (h > 0.955) type = 'tree'
          else if (h > 0.92) type = 'rock'
          else if (h > 0.9) type = 'flower'
          else if (h > 0.885) type = 'bush'
          else if (t === T.FLOWER && h > 0.5) type = 'flower'
        }
        if (type) {
          this.props.push({ x, y, type, seed: h2 })
          if (['tree','pine','palm','rock','boulder','cactus','deadtree','stump','bush','reed','lamp'].includes(type)) this.solidProps.add(`${x},${y}`)
        }
      }
    }
    // berry bushes near roads
    for (let i = 0; i < 40; i++) {
      const town = this.towns[1 + (i % (this.towns.length - 1))]
      const a = this.rng() * Math.PI * 2, r = 6 + this.rng() * 6
      const x = Math.round(town.x + Math.cos(a) * r), y = Math.round(town.y + Math.sin(a) * r)
      if (this.isFreeLand(x, y) && !this.solidProps.has(`${x},${y}`)) {
        this.props.push({ x, y, type: 'berry', seed: this.rng() })
        this.solidProps.add(`${x},${y}`)
        this.berries.push({ x, y, ready: true, timer: 0 })
      }
    }
  }

  isFreeLand (x, y) {
    const t = this.tile(x, y)
    return this.inBounds(x, y) && ![T.DEEP,T.WATER,T.LAVA,T.PLAZA,T.PATH,T.BRIDGE].includes(t) && !this.buildingAt(x, y)
  }

  buildingAt (x, y) {
    for (const b of this.buildings) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b
    return null
  }

  generateSpecial () {
    // treasure chests hidden around the world
    let tries = 0
    while (this.chests.length < 14 && tries++ < 900) {
      const x = 6 + Math.floor(this.rng() * (this.w - 12))
      const y = 6 + Math.floor(this.rng() * (this.h - 12))
      if (!this.isFreeLand(x, y) || this.solidProps.has(`${x},${y}`)) continue
      if (Math.hypot(x - 96, y - 96) < 16) continue
      if (this.chests.some(c => Math.hypot(c.x - x, c.y - y) < 8)) continue
      this.chests.push({ x, y, opened: false, loot: this.rollLoot(), id: `chest${this.chests.length}` })
      this.props.push({ x, y, type: 'chest', seed: this.rng() })
      this.solidProps.add(`${x},${y}`)
    }
    // mythic rifts: legendary encounters
    const legends = POKEDEX.filter(p => p.le || p.my)
    const spots = [[70,42],[126,48],[56,132],[146,132],[74,166],[40,62],[120,18],[168,112],[22,110],[110,60],[88,146],[150,60]]
    spots.forEach(([x, y], i) => {
      if (!this.inBounds(x, y)) return
      if (!this.isFreeLand(x, y)) {
        // find nearest land
        let found = false
        for (let r = 1; r < 10 && !found; r++) for (let dy = -r; dy <= r && !found; dy++) for (let dx = -r; dx <= r; dx++) {
          if (this.isFreeLand(x + dx, y + dy)) { x += dx; y += dy; found = true; break }
        }
      }
      const legend = legends[i % legends.length]
      this.rifts.push({ x, y, species: legend.n, level: 52 + (i % 4) * 3, ready: true, timer: 0, id: `rift${i}` })
      this.props.push({ x, y, type: 'rift', seed: this.rng() })
      this.solidProps.add(`${x},${y}`)
    })
  }

  rollLoot () {
    const r = this.rng()
    if (r < .3) return { item: 'poke-ball', n: 3 + Math.floor(this.rng() * 3) }
    if (r < .5) return { item: 'super-potion', n: 1 + Math.floor(this.rng() * 2) }
    if (r < .66) return { item: 'great-ball', n: 2 }
    if (r < .78) return { item: 'rare-candy', n: 1 }
    if (r < .9) return { item: 'evolution-stone', n: 1 }
    return { item: 'ultra-ball', n: 2 }
  }

  generateNPCs () {
    let nid = 0
    const add = (o) => { this.npcs.push({ id: 'npc' + (nid++), dir: 'down', wander: false, ...o }); return o }
    const wb = this.towns[0]
    // Professor outside lab
    const lab = this.buildings.find(b => b.type === 'lab')
    if (lab) add({ name: 'Prof. Black', role: 'professor', x: lab.door.x - 1, y: lab.door.y + 1, colors: { shirt:'#232a3d', hair:'#e8e8ee', skin:'#c98f65' }, lines: ['Every Pokémon in the world is out there, waiting to meet you.', 'Bring me field data — every species you catch is a new page in the Pokédex!'] })
    // Champion tower guard
    add({ name: 'Aster', role: 'champion', x: wb.x + 1, y: wb.y + 7, colors: { shirt:'#d4af37', hair:'#2b2b38', skin:'#c98f65' }, lines: ['The Champion Tower opens only to trainers with eight badges.'] })
    // League Master — the final challenge, unlocked after the Champion
    add({ name: 'Kael', role: 'master', x: wb.x - 1, y: wb.y + 7, colors: { shirt:'#7ee0c8', hair:'#1f2b3a', skin:'#c98f65' }, lines: ['Eight badges. One Champion. Then me.'] })
    // Town NPCs
    const gossip = [
      ['Mina', 'I saw a shiny Pokémon glittering in the tall grass last night!', { shirt:'#e08cc0', hair:'#5a3b2e', skin:'#f3d0b0' }],
      ['Tomas', 'The road north is cold, but the Pokémon there are magnificent.', { shirt:'#4f8fe8', hair:'#2b2b38', skin:'#c98f65' }],
      ['Pip', 'They say every single Pokémon from every region lives in this world. All 1,025 of them!', { shirt:'#57b94c', hair:'#c98f65', skin:'#f3d0b0' }],
      ['Sable', 'Rifts glow purple at night. Something ancient sleeps inside.', { shirt:'#6c5b9e', hair:'#e8e8ee', skin:'#e8b890' }],
      ['June', 'Press E near people and signs to chat. The world is full of stories.', { shirt:'#f2c744', hair:'#b5651d', skin:'#8d5524' }],
      ['Rook', 'Sprinting is Shift. Your Pokémon can keep up — mostly.', { shirt:'#5c5149', hair:'#2b2b38', skin:'#f0c8a0' }],
    ]
    for (const town of this.towns) {
      const center = this.buildings.find(b => b.type === 'center' && b.town === town.id)
      const mart = this.buildings.find(b => b.type === 'mart' && b.town === town.id)
      const gym = this.buildings.find(b => b.type === 'gym' && b.town === town.id)
      if (center) add({ name: 'Nurse Joy', role: 'nurse', x: center.door.x, y: center.door.y + 1, colors: { shirt:'#ff8fa8', hair:'#f27c9b', skin:'#f3d0b0' }, lines: ['Welcome! Let me take care of your Pokémon.'] })
      if (mart) add({ name: 'Clerk', role: 'clerk', x: mart.door.x, y: mart.door.y + 1, colors: { shirt:'#4f8fe8', hair:'#5a3b2e', skin:'#e8b890' }, lines: ['Welcome to the Poké Mart!'] })
      if (gym) {
        const g = GYMS.find(x => x.id === gym.gymId)
        if (g) add({ name: g.leader, role: 'leader', gym: g, x: gym.door.x, y: gym.door.y + 1, colors: { shirt: g.color, hair: g.hair || '#2b2b38', skin: g.skin || '#e8b890' }, lines: [g.intro] })
      }
      const g = gossip[(nid) % gossip.length]
      const a = this.rng() * Math.PI * 2, r = town.r * 0.55
      add({ name: g[0], role: 'villager', x: Math.round(town.x + Math.cos(a) * r), y: Math.round(town.y + Math.sin(a) * r), wander: true, colors: g[2], lines: [g[1]] })
    }
    // route trainers
    const trainerData = [
      ['Youngster Ben', 'I found a shortcut through the grass. Want to see it?', 1, 6, ['#f2c744']],
      ['Bug Catcher Ada', 'My bugs are tougher than they look!', 2, 9, ['#8fae20']],
      ['Picnicker Lia', 'A picnic is better with Pokémon!', 1, 13, ['#e08cc0']],
      ['Hiker Bram', 'These boots have walked a thousand miles.', 2, 18, ['#c9a54a']],
      ['Swimmer Kai', 'The tide brought in something rare today.', 2, 22, ['#4f8fe8']],
      ['Ace Trainer Nyx', 'You have the look of a rising star.', 3, 28, ['#6c5b9e']],
      ['Dragon Tamer Ash', 'The caldera dragons answer only to the bold.', 3, 35, ['#ef7d32']],
      ['Veteran Orin', 'Show me everything you have learned.', 3, 44, ['#5c5149']],
    ]
    let ti = 0
    for (const town of this.towns.slice(1)) {
      const a = this.rng() * Math.PI * 2
      const r = town.r + 6 + this.rng() * 5
      const x = Math.round(town.x + Math.cos(a) * r), y = Math.round(town.y + Math.sin(a) * r)
      if (!this.isFreeLand(x, y)) continue
      const td = trainerData[ti++ % trainerData.length]
      add({ name: td[0], role: 'trainer', x, y, trainer: { level: td[3], count: td[2], reward: 200 + td[3] * 40 }, colors: { shirt: td[4][0], hair: '#2b2b38', skin: '#e8b890' }, lines: [td[1]] })
    }
  }

  buildSpawnTables () {
    const prefer = {
      meadow: ['Normal','Grass','Fairy','Electric','Flying'],
      forest: ['Bug','Grass','Dark','Ghost','Poison'],
      lake: ['Water','Ice','Flying','Normal'],
      snow: ['Ice','Steel','Water','Normal'],
      volcano: ['Fire','Rock','Dragon','Ground'],
      desert: ['Ground','Rock','Fire','Fighting'],
      marsh: ['Poison','Water','Ghost','Bug'],
      mountain: ['Rock','Flying','Fighting','Dragon','Steel'],
      town: ['Normal','Fairy','Electric','Psychic'],
    }
    const all = POKEDEX.filter(p => !p.le && !p.my)
    for (const [biome, types] of Object.entries(prefer)) {
      const table = []
      for (const sp of all) {
        let match = 0
        for (const t of sp.t) if (types.includes(t)) match++
        if (!match) continue
        const bst = sp.s.reduce((a, b) => a + b, 0)
        const stageW = bst > 520 ? 1.2 : bst > 430 ? 3 : 7
        table.push({ n: sp.n, w: stageW * (1 + match * 0.5), biome })
      }
      // make sure every species is reachable somewhere
      for (const sp of all) {
        if (!Object.values(this.spawnTables).flat().some(x => x.n === sp.n) && !table.some(x => x.n === sp.n)) {
          if ((sp.n + biome.length) % 8 === 0) table.push({ n: sp.n, w: 1.5, biome })
        }
      }
      this.spawnTables[biome] = table
    }
    // fill any stragglers into meadow
    const seen = new Set()
    for (const tbl of Object.values(this.spawnTables)) for (const x of tbl) seen.add(x.n)
    for (const sp of all) if (!seen.has(sp.n)) this.spawnTables.meadow.push({ n: sp.n, w: 1.5, biome: 'meadow' })
  }

  biomeAt (x, y) {
    const t = this.tile(x, y)
    const town = this.townAt(x, y)
    if (town) return 'town'
    if (t === T.DEEP || t === T.WATER || t === T.BRIDGE) return 'lake'
    if (t === T.SAND) {
      // near water = shore, otherwise desert
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if ([T.DEEP, T.WATER].includes(this.tile(x + dx, y + dy))) return 'lake'
      }
      return 'desert'
    }
    if (t === T.SNOW || t === T.ICE) return 'snow'
    if (t === T.ASH || t === T.LAVA) return 'volcano'
    if (t === T.ROCKY) {
      if (y < this.h * 0.42) return 'snow'
      return 'mountain'
    }
    if (t === T.MARSH) return 'marsh'
    if (t === T.FOREST) return 'forest'
    return 'meadow'
  }

  zoneName (x, y) {
    const town = this.townAt(x, y)
    if (town) return town.name
    const b = this.biomeAt(x, y)
    return {
      meadow: 'Verdant Meadows', forest: 'Whispering Woods', lake: 'Azure Shore', snow: 'Frostpeak Tundra',
      volcano: 'Ember Caldera', desert: 'Sunstone Desert', marsh: 'Misty Marsh', mountain: 'Stone Highlands', town: 'Willowbrook',
    }[b] || 'Wilds'
  }

  townAt (x, y) {
    for (const t of this.towns) if (Math.hypot(x - t.x, y - t.y) <= t.r + 1) return t
    return null
  }

  spawnFor (biome, x, y, rng = Math.random) {
    const table = this.spawnTables[biome] || this.spawnTables.meadow
    const entry = pickWeighted(table, rng)
    const d = Math.hypot(x - B_SPAWN.x, y - B_SPAWN.y)
    const bonus = { snow: 4, volcano: 7, desert: 5, mountain: 4, forest: 1, marsh: 3, lake: 2, meadow: 0, town: 0 }[biome] || 0
    const level = clamp(Math.floor(4 + d * 0.34 + bonus + (rng() * 5 - 2)), 2, 64)
    return { n: entry.n, level }
  }

  buildingDoorNear (x, y) {
    for (const b of this.buildings) if (Math.abs(b.door.x - x) <= 0.9 && Math.abs(b.door.y - y) <= 0.9) return b
    return null
  }

  solidAt (x, y) {
    const t = this.tile(x, y)
    if (SOLID_TILES.has(t)) return true
    if (this.buildingAt(x, y)) return true
    return this.solidProps.has(`${x},${y}`)
  }

  canWalkPx (px, py, r = 10) {
    const pts = [[px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r], [px, py]]
    for (const [x, y] of pts) {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE)
      if (this.solidAt(tx, ty)) return false
    }
    return true
  }

  npcNear (px, py, rad = 1.7) {
    let best = null, bd = rad
    for (const n of this.npcs) {
      const d = Math.hypot(n.x + .5 - px / TILE, n.y + .5 - py / TILE)
      if (d < bd) { bd = d; best = n }
    }
    return best
  }

  interactableNear (px, py) {
    const tx = px / TILE, ty = py / TILE
    const npc = this.npcNear(px, py, 1.9)
    if (npc) return { kind: 'npc', npc }
    // door
    for (const b of this.buildings) {
      if (Math.hypot(b.door.x + .5 - tx, b.door.y + .5 - ty) < 1.5) return { kind: 'door', building: b }
    }
    for (const s of this.signs) if (Math.hypot(s.x + .5 - tx, s.y + .5 - ty) < 1.5) return { kind: 'sign', sign: s }
    for (const c of this.chests) if (!c.opened && Math.hypot(c.x + .5 - tx, c.y + .5 - ty) < 1.6) return { kind: 'chest', chest: c }
    for (const r of this.rifts) if (r.ready && Math.hypot(r.x + .5 - tx, r.y + .5 - ty) < 1.8) return { kind: 'rift', rift: r }
    for (const b of this.berries) if (b.ready && Math.hypot(b.x + .5 - tx, b.y + .5 - ty) < 1.6) return { kind: 'berry', berry: b }
    return null
  }

  update (dt) {
    for (const c of this.chests) if (c.opened) { c.timer += dt }
    for (const r of this.rifts) if (!r.ready) { r.timer -= dt; if (r.timer <= 0) r.ready = true }
    for (const b of this.berries) if (!b.ready) { b.timer -= dt; if (b.timer <= 0) b.ready = true }
  }

  buildMinimap () {
    const c = document.createElement('canvas')
    c.width = this.w; c.height = this.h
    const ctx = c.getContext('2d')
    const cols = {
      [T.DEEP]:'#1b4d78', [T.WATER]:'#2f7cb5', [T.SAND]:'#e3cf92', [T.GRASS]:'#77b95a', [T.TALL]:'#4f9a43',
      [T.FLOWER]:'#8fc96d', [T.FOREST]:'#2f6b3f', [T.SNOW]:'#e9f3f7', [T.ICE]:'#b7e4ec', [T.ASH]:'#6b5a58',
      [T.LAVA]:'#e2582f', [T.PATH]:'#d9c49a', [T.PLAZA]:'#e8d9b0', [T.BRIDGE]:'#a8895f', [T.ROCKY]:'#8e8678',
      [T.MARSH]:'#5d7a55', [T.DIRT]:'#a98d68',
    }
    const img = ctx.createImageData(this.w, this.h)
    for (let i = 0; i < this.tiles.length; i++) {
      const col = cols[this.tiles[i]] || '#77b95a'
      const n = parseInt(col.slice(1), 16)
      img.data[i * 4] = (n >> 16) & 255; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    this.minimap = c
  }
}

export { B_SPAWN }
