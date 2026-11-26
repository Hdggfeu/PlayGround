// Remappable keyboard bindings. Each action owns an array of keys so the
// default layout can keep both WASD and the arrow keys.
export const DEFAULT_CONTROLS = {
  moveUp: ['w', 'arrowup'],
  moveDown: ['s', 'arrowdown'],
  moveLeft: ['a', 'arrowleft'],
  moveRight: ['d', 'arrowright'],
  sprint: ['shift'],
  interact: ['e', ' '],
  party: ['1'],
  bag: ['2'],
  dex: ['3'],
  map: ['m'],
  quests: ['q'],
  menu: ['escape'],
  battleBag: ['b'],
  battleParty: ['p'],
  battleRun: ['r'],
}

export const CONTROL_GROUPS = [
  { title: 'Movement', actions: ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'sprint', 'interact'] },
  { title: 'Menus', actions: ['party', 'bag', 'dex', 'map', 'quests', 'menu'] },
  { title: 'Battle', actions: ['battleBag', 'battleParty', 'battleRun'] },
]

export function cloneControls (src = DEFAULT_CONTROLS) {
  const out = {}
  for (const [action, keys] of Object.entries(src)) out[action] = [...keys]
  return out
}

export function normalizeControls (src) {
  const out = cloneControls(DEFAULT_CONTROLS)
  if (src && typeof src === 'object') {
    for (const [action, keys] of Object.entries(src)) {
      if (!(action in DEFAULT_CONTROLS)) continue
      const list = Array.isArray(keys) ? keys : [keys]
      const clean = list.map(k => String(k).toLowerCase()).filter(Boolean)
      if (clean.length) out[action] = [...new Set(clean)]
    }
  }
  return out
}

export function actionFor (controls, key) {
  const k = String(key || '').toLowerCase()
  for (const [action, keys] of Object.entries(controls || DEFAULT_CONTROLS)) {
    if (keys.includes(k)) return action
  }
  return null
}

export function isHeld (controls, keys, action) {
  const bound = controls?.[action] || DEFAULT_CONTROLS[action] || []
  return bound.some(k => keys.has(k))
}

export function bindingText (keys) {
  if (!keys?.length) return '—'
  return keys.map(key => {
    const map = {
      arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
      ' ': 'Space', shift: 'Shift', escape: 'Esc', enter: 'Enter',
    }
    return map[key] || (key.length === 1 ? key.toUpperCase() : key)
  }).join(' / ')
}

export function resetControls (state) {
  state.settings.controls = cloneControls(DEFAULT_CONTROLS)
  state.save?.()
  return state.settings.controls
}
