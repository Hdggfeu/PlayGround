import en from './lang/en.js'
import fr from './lang/fr.js'
import es from './lang/es.js'
import de from './lang/de.js'
import it from './lang/it.js'
import pt from './lang/pt.js'
import ja from './lang/ja.js'
import ko from './lang/ko.js'
import zh from './lang/zh.js'
import ar from './lang/ar.js'
import { POKEDEX } from './pokedata.js'

export const DICTS = { en, fr, es, de, it, pt, ja, ko, zh, ar }
export const LANGUAGES = Object.values(DICTS).map(d => ({ code: d.code, label: d.label, dir: d.dir }))
let current = 'en'

const TYPE_OVERRIDES = {
  pt: {
    normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta', ice: 'Gelo',
    fighting: 'Lutador', poison: 'Veneno', ground: 'Terra', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto',
    rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio', steel: 'Aço', fairy: 'Fada'
  },
  ar: {
    normal: 'عادي', fire: 'نار', water: 'ماء', electric: 'كهرباء', grass: 'نبات', ice: 'ثلج',
    fighting: 'قتال', poison: 'سم', ground: 'أرض', flying: 'طيران', psychic: 'نفسي', bug: 'حشرة',
    rock: 'صخر', ghost: 'شبح', dragon: 'تنين', dark: 'ظلام', steel: 'فولاذ', fairy: 'جنية'
  },
  ru: {
    normal: 'Обычный', fire: 'Огонь', water: 'Вода', electric: 'Электро', grass: 'Трава', ice: 'Лёд',
    fighting: 'Боевой', poison: 'Яд', ground: 'Земля', flying: 'Летящий', psychic: 'Психо', bug: 'Жук',
    rock: 'Камень', ghost: 'Призрак', dragon: 'Дракон', dark: 'Тёмный', steel: 'Сталь', fairy: 'Фея'
  }
}

export function detectLanguage() {
  try {
    const saved = localStorage.getItem('jardin.lang')
    if (saved && DICTS[saved]) return saved
  } catch {}
  const nav = (navigator.languages || [navigator.language || 'en']).map(x => String(x).toLowerCase())
  for (const raw of nav) {
    const code = raw.split('-')[0]
    if (DICTS[code]) return code
  }
  return 'en'
}

export function setLanguage(code) {
  current = DICTS[code] ? code : 'en'
  document.documentElement.lang = current
  document.body.dir = DICTS[current].dir || 'ltr'
  try { localStorage.setItem('jardin.lang', current) } catch {}
  return current
}

export function getLanguage() { return current }
export function getDir() { return DICTS[current].dir || 'ltr' }
export function languageLabel(code) { return DICTS[code]?.label || code }

export function t(key, vars = {}) {
  let value = DICTS[current]?.[key]
  if (value == null) value = DICTS.en[key]
  if (value == null) return key
  return String(value).replace(/\{(\w+)\}/g, (m, k) => vars[k] == null ? m : String(vars[k]))
}

export function speciesName(id) {
  const s = POKEDEX.species[id]
  if (!s) return String(id)
  return s.name[current] || s.name.en || String(id)
}

export function moveName(moveId) {
  const m = POKEDEX.moves[moveId]
  if (!m) return moveId
  return m.name[current] || m.name.en || moveId
}

export function typeName(type) {
  if (TYPE_OVERRIDES[current]?.[type]) return TYPE_OVERRIDES[current][type]
  return POKEDEX.types[type]?.name?.[current] || POKEDEX.types[type]?.name?.en || type
}

export function typeColor(type) {
  return {
    normal: '#9a9a78', fire: '#f08030', water: '#5b8fd6', electric: '#e9c33c', grass: '#69b84e',
    ice: '#76cfc7', fighting: '#c44a3d', poison: '#a35aa7', ground: '#d3a94c', flying: '#8f9fe8',
    psychic: '#ec6f9b', bug: '#9db52f', rock: '#b3a05a', ghost: '#6d609c', dragon: '#6f58d8',
    dark: '#5b4b43', steel: '#8e9aa5', fairy: '#e58fc3'
  }[type] || '#7c9a77'
}

export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    const value = t(key)
    if (value !== key) el.textContent = value
  })
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'))
  })
}

export function formatNumber(n) {
  try { return new Intl.NumberFormat(current).format(n) } catch { return String(n) }
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(sec).padStart(2, '0')}s`
}
