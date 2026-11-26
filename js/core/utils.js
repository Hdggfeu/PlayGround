export const clamp = (v, a, b) => v < a ? a : v > b ? b : v
export const lerp = (a, b, t) => a + (b - a) * t
export const smooth = (t) => t * t * (3 - 2 * t)
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
export const dist2 = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2
export const fmt = (n) => n.toLocaleString('en-US')
export const pad = (n, w = 3) => String(n).padStart(w, '0')

export function mulberry32 (a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function hash2 (x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function hashStr (s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function valueNoise (x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = smooth(x - xi), yf = smooth(y - yi)
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed)
  return lerp(lerp(a, b, xf), lerp(c, d, xf), yf)
}

export function fbm (x, y, seed = 0, oct = 4) {
  let v = 0, amp = .5, f = 1, tot = 0
  for (let i = 0; i < oct; i++) { v += valueNoise(x * f, y * f, seed + i * 131) * amp; tot += amp; amp *= .5; f *= 2 }
  return v / tot
}

export function shade (hex, amt) {
  const c = hex.replace('#', '')
  const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = clamp(Math.round(r + amt), 0, 255); g = clamp(Math.round(g + amt), 0, 255); b = clamp(Math.round(b + amt), 0, 255)
  return `rgb(${r},${g},${b})`
}

export function hexAlpha (hex, a) {
  const c = hex.replace('#', '')
  const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export function pickWeighted (list, rng = Math.random) {
  let total = 0
  for (const it of list) total += it.w ?? 1
  let r = rng() * total
  for (const it of list) { r -= it.w ?? 1; if (r <= 0) return it }
  return list[list.length - 1]
}

export function shuffle (arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

export function titleCase (s) { return s.replace(/\b\w/g, c => c.toUpperCase()) }

export function timeString (minutes) {
  const h = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60)
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`
}

export function niceTime (sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
