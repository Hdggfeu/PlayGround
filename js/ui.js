import { POKEDEX } from './pokedata.js'
import {
  state, saveGame, clearSave, healMon, healTeam, addToTeam, monName, species,
  ITEMS, SHOP_STOCK, audio, expNeeded
} from './core.js'
import {
  t, applyStaticI18n, typeName, typeColor, moveName, formatTime, getLanguage, setLanguage,
  LANGUAGES
} from './i18n.js'

export const $ = id => document.getElementById(id)

export const uiHooks = {
  getWorld: () => null,
  fastTravel: () => {},
  useItemOutside: () => false,
  buyItem: () => false,
  save: () => {},
  goTitle: () => {},
  retry: () => {},
  newRun: () => {},
  languageChanged: () => {},
  updateModeBlurb: () => {}
}

export function isModalOpen() {
  const el = $('modalRoot')
  return !!el && !el.classList.contains('hidden')
}

export function toast(message, icon = '✿') {
  const layer = $('toastLayer')
  if (!layer) return
  const el = document.createElement('div')
  el.className = 'toast'
  el.innerHTML = `<span class="toast-ico">${icon}</span><span></span>`
  el.lastElementChild.textContent = message
  layer.appendChild(el)
  setTimeout(() => {
    el.classList.add('leaving')
    setTimeout(() => el.remove(), 320)
  }, 3200)
}

export function showAreaBanner(zoneKey) {
  const banner = $('areaBanner')
  const name = $('areaBannerName')
  if (!banner || !name) return
  name.textContent = t(zoneKey)
  banner.classList.remove('hidden')
  banner.style.animation = 'none'
  void banner.offsetWidth
  banner.style.animation = ''
  clearTimeout(showAreaBanner._timer)
  showAreaBanner._timer = setTimeout(() => banner.classList.add('hidden'), 3400)
}

function badgeCount() {
  return state ? Object.values(state.badges || {}).filter(Boolean).length : 0
}

function nextArenaName() {
  if (!state) return ''
  const order = ['rose', 'lake', 'greenhouse', 'fireflies']
  const next = order.find(id => !state.arenas[id])
  if (!next) return ''
  return t({ rose: 'arenaRose', lake: 'arenaLake', greenhouse: 'arenaGreenhouse', fireflies: 'arenaFireflies' }[next])
}

export function updateHUD() {
  if (!state) return
  const nameEl = $('hudName')
  if (nameEl) nameEl.textContent = state.player?.name || 'Noé'
  const petals = $('hudPetals')
  if (petals) petals.textContent = state.petals ?? 0

  const badgeRow = $('hudBadges')
  if (badgeRow) {
    badgeRow.innerHTML = ['rose', 'lake', 'greenhouse', 'fireflies']
      .map(id => `<span class="badge-dot ${state.badges[id] ? 'on' : ''}"></span>`).join('')
  }

  const zone = state.zone || 'village'
  const zoneKey = { village: 'zoneVillage', rose: 'zoneRose', lake: 'zoneLake', greenhouse: 'zoneGreenhouse', fireflies: 'zoneFireflies', heart: 'zoneHeart' }[zone] || 'zoneVillage'
  const area = $('hudArea')
  if (area) area.textContent = t(zoneKey)
  const obj = $('hudObjective')
  if (obj) {
    if (state.bossDefeated) obj.textContent = t('hudObjectiveAll')
    else if (badgeCount() >= 4) obj.textContent = t('hudObjectiveBoss')
    else if (badgeCount() === 0) obj.textContent = t('hudObjectiveStart')
    else obj.textContent = t('hudObjectiveNext', { name: nextArenaName() })
  }
  const mmBadges = $('minimapBadges')
  if (mmBadges) mmBadges.textContent = `${badgeCount()}/4`
  const mmZone = $('minimapZone')
  if (mmZone) mmZone.textContent = t(zoneKey)

  const world = uiHooks.getWorld()
  const canvas = $('minimap')
  if (world && canvas) {
    const ctx = canvas.getContext('2d')
    try {
      world.drawMinimap(ctx, canvas.width, canvas.height, {
        player: state.player,
        arenas: state.arenas,
        discovered: new Set(state.discovered || [])
      })
    } catch {}
  }
}

export function refreshLanguageUI() {
  applyStaticI18n(document)
  const langSelect = $('langSelect')
  if (langSelect) {
    langSelect.innerHTML = LANGUAGES.map(l => `<option value="${l.code}">${l.label}</option>`).join('')
    langSelect.value = getLanguage()
  }
  const title = document.querySelector('title')
  if (title) title.textContent = `${t('logoTitle')} — ${t('openWorld')}`
  document.documentElement.lang = getLanguage()
  document.body.dir = getLanguage() === 'ar' ? 'rtl' : 'ltr'
  uiHooks.updateModeBlurb()
  updateHUD()
}

function typeChips(types = []) {
  return types.map(type => `<span class="type-chip" style="background:${typeColor(type)}">${typeName(type)}</span>`).join('')
}

export function openModal(inner, narrow = false) {
  const root = $('modalRoot')
  if (!root) return
  root.classList.remove('hidden')
  root.innerHTML = `<div class="modal-card paper ${narrow ? 'narrow' : ''}"><button class="modal-close" aria-label="${t('close')}">×</button>${inner}</div>`
  const close = root.querySelector('.modal-close')
  if (close) close.addEventListener('click', () => { audio.sfx('select'); closeModal() })
  root.onclick = event => { if (event.target === root) closeModal() }
}

export function closeModal() {
  const root = $('modalRoot')
  if (!root) return
  root.classList.add('hidden')
  root.innerHTML = ''
}

function modalHead(kicker, title, subtitle = '') {
  return `<div class="modal-head"><div>${kicker ? `<span class="kicker">${kicker}</span>` : ''}<h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div>`
}

function hpBar(mon) {
  const pct = Math.max(0, Math.min(100, (mon.hp / mon.maxHp) * 100))
  const color = pct <= 22 ? '#e05252' : pct <= 50 ? '#f5c451' : '#51a66a'
  return `<div class="mini-hp"><i style="width:${pct}%;background:${color}"></i></div>`
}

function teamRowHTML(mon, index, where, active = false) {
  const sp = species(mon.id)
  const types = sp ? typeChips(sp.types) : ''
  const dead = mon.lost || mon.hp <= 0
  return `<div class="team-row ${active ? 'active' : ''}" data-mon="${where}:${index}">
    <img src="${sp?.sprite || ''}" alt="">
    <div class="tm">
      <strong>${monName(mon)} ${dead ? `<span style="color:var(--danger);font-size:9px">${mon.lost ? t('teamDead') : t('teamFainted')}</span>` : ''}</strong>
      <small>${t('teamLevel', { level: mon.level })} · ${mon.hp}/${mon.maxHp} HP</small>
      ${hpBar(mon)}
      <div class="type-row" style="margin-top:3px">${types}</div>
    </div>
    <span class="lvl">${mon.status ? t({ poison: 'battleStatusPoison', burn: 'battleStatusBurn', paralysis: 'battleStatusParalysis', sleep: 'battleStatusSleep' }[mon.status] || '') : ''}</span>
  </div>`
}

export function panelTeam() {
  if (!state) return
  const party = state.team.map((mon, i) => teamRowHTML(mon, i, 'team', i === 0)).join('') || `<p class="confirm-text">${t('teamEmpty')}</p>`
  const reserve = state.reserve.length
    ? state.reserve.map((mon, i) => teamRowHTML(mon, i, 'reserve')).join('')
    : `<p class="confirm-text">${t('teamEmpty')}</p>`
  const badges = ['rose', 'lake', 'greenhouse', 'fireflies'].map(id => {
    const on = !!state.badges[id]
    const badgeKey = { rose: 'badgeRose', lake: 'badgeLake', greenhouse: 'badgeGreenhouse', fireflies: 'badgeFireflies' }[id]
    const arenaKey = { rose: 'arenaRose', lake: 'arenaLake', greenhouse: 'arenaGreenhouse', fireflies: 'arenaFireflies' }[id]
    const icon = { rose: '✿', lake: '≈', greenhouse: '♨', fireflies: '✦' }[id]
    return `<div class="badge-card ${on ? 'on' : ''}"><div class="badge-medal">${icon}</div><strong>${t(badgeKey)}</strong><small>${t(arenaKey)}</small></div>`
  }).join('')

  openModal(`${modalHead(t('teamParty'), t('teamTitle'), t('teamReserveNote'))}
    <div class="panel-grid">
      <div>
        <div class="rules-title"><span>${t('teamParty')}</span><span class="rule-line"></span></div>
        <div class="team-list">${party}</div>
      </div>
      <div>
        <div class="rules-title"><span>${t('teamReserve')}</span><span class="rule-line"></span></div>
        <div class="team-list">${reserve}</div>
      </div>
    </div>
    <div class="rules-title" style="margin-top:16px"><span>${t('journalBadges')}</span><span class="rule-line"></span></div>
    <div class="badge-grid">${badges}</div>
    <p class="confirm-text" style="margin-top:12px;font-size:11px">${t('teamSwapHint')}</p>`)

  document.querySelectorAll('[data-mon]').forEach(row => {
    row.addEventListener('click', () => {
      audio.sfx('select')
      const [where, idx] = row.dataset.mon.split(':')
      const mon = where === 'team' ? state.team[Number(idx)] : state.reserve[Number(idx)]
      if (mon) openMonDetail(mon, Number(idx), where)
    })
  })
}

function statBox(label, value, max = 200) {
  return `<div class="stat-box"><span>${label}</span><b>${value}</b><i style="--v:${Math.min(100, Math.round(value / max * 100))}%"></i></div>`
}

export function openMonDetail(mon, index, where) {
  const sp = species(mon.id)
  if (!sp) return
  const moves = mon.moves.map(slot => {
    const md = POKEDEX.moves[slot.id]
    const type = md ? (state?.options?.moves ? typeName(md.type) : typeName(md.type)) : ''
    return `<div class="move-pill"><span class="type-chip" style="background:${typeColor(md?.type || 'normal')}">${type}</span><span>${moveName(slot.id)}</span><small>${md?.power ? md.power : '—'} · ${slot.pp}/${slot.maxPp}</small></div>`
  }).join('')
  const expPct = Math.min(100, Math.round((mon.exp / expNeeded(mon.level)) * 100))
  const action = where === 'reserve'
    ? `<button class="btn btn-small btn-primary" data-detail="add">${t('teamSelect')}</button>`
    : index > 0 ? `<button class="btn btn-small btn-primary" data-detail="lead">${t('teamLead')}</button>` : ''
  openModal(`${modalHead(t('teamDetail'), monName(mon), `${t('teamLevel', { level: mon.level })} · ${sp.genus || ''}`)}
    <div class="detail-hero">
      <img src="${sp.sprite}" alt="">
      <div style="flex:1">
        <h3>${monName(mon)}</h3>
        <div class="type-row">${typeChips(sp.types)}</div>
        <p>${mon.hp}/${mon.maxHp} HP · ${mon.status ? t({ poison: 'battleStatusPoison', burn: 'battleStatusBurn', paralysis: 'battleStatusParalysis', sleep: 'battleStatusSleep' }[mon.status]) : '—'}</p>
        <div class="hp-track" style="margin-top:6px"><div class="hp-fill ${mon.hp / mon.maxHp <= .22 ? 'low' : mon.hp / mon.maxHp <= .5 ? 'mid' : ''}" style="width:${mon.hp / mon.maxHp * 100}%"></div></div>
        <p style="margin-top:4px">${t('battleExpShort', { exp: mon.exp })} · ${expPct}%</p>
      </div>
    </div>
    <div class="rules-title" style="margin-top:14px"><span>${t('teamStats')}</span><span class="rule-line"></span></div>
    <div class="stat-grid">
      ${statBox(t('teamHp'), mon.stats.hp, 220)}
      ${statBox(t('teamAtk'), mon.stats.atk, 200)}
      ${statBox(t('teamDef'), mon.stats.def, 200)}
      ${statBox(t('teamSpa'), mon.stats.spa, 200)}
      ${statBox(t('teamSpd'), mon.stats.spd, 200)}
      ${statBox(t('teamSpe'), mon.stats.spe, 200)}
    </div>
    <div class="rules-title" style="margin-top:14px"><span>${t('teamMoves')}</span><span class="rule-line"></span></div>
    <div class="move-list">${moves}</div>
    <div class="confirm-actions" style="margin-top:16px">
      <button class="btn btn-small btn-ghost" data-detail="back">${t('back')}</button>
      ${action}
    </div>`, true)

  document.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.detail
      if (act === 'back') { audio.sfx('select'); panelTeam(); return }
      if (act === 'lead') {
        const [m] = state.team.splice(index, 1)
        state.team.unshift(m)
        saveGame()
        audio.sfx('confirm')
        toast(t('toastSaved'), '◉')
        panelTeam()
      }
      if (act === 'add') {
        if (state.team.length >= 6) {
          audio.sfx('error')
          toast(t('teamFull'), '▣')
          return
        }
        const [m] = state.reserve.splice(index, 1)
        state.team.push(m)
        saveGame()
        audio.sfx('confirm')
        panelTeam()
      }
    })
  })
}

export function panelBag() {
  if (!state) return
  const entries = Object.entries(state.bag).filter(([, n]) => n > 0)
  const cards = entries.map(([key, count]) => {
    const item = ITEMS[key]
    if (!item) return ''
    return `<div class="item-card">
      <div class="item-ico">${item.icon}</div>
      <div style="flex:1"><strong>${t(item.key)}</strong><small>${t(item.desc)}</small></div>
      <b>×${count}</b>
      ${item.kind === 'ball' ? '' : `<button class="btn btn-small btn-primary" data-use="${key}">${t('use')}</button>`}
    </div>`
  }).join('')
  openModal(`${modalHead(t('btnBag'), t('bagTitle'), t('bagHint', { name: state.team[0] ? monName(state.team[0]) : '' }))}
    <div class="bag-grid">${cards || `<p class="confirm-text">${t('bagEmpty')}</p>`}</div>
    ${state.mode === 'hardcore' ? `<p class="confirm-text" style="margin-top:12px">${t('battleNoItems')}</p>` : ''}`)
  document.querySelectorAll('[data-use]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ok = uiHooks.useItemOutside(btn.dataset.use)
      if (ok) panelBag()
    })
  })
}

export function panelMap() {
  if (!state) return
  const world = uiHooks.getWorld()
  const arenaDefs = [
    { id: 'rose', name: t('arenaRose'), icon: '✿', color: '#ff8fa3' },
    { id: 'lake', name: t('arenaLake'), icon: '≈', color: '#72c7dc' },
    { id: 'greenhouse', name: t('arenaGreenhouse'), icon: '♨', color: '#ff9a62' },
    { id: 'fireflies', name: t('arenaFireflies'), icon: '✦', color: '#a78bfa' }
  ]
  const legend = arenaDefs.map(a => `<span><i class="legend-dot" style="background:${state.arenas[a.id] ? '#f5c451' : a.color}"></i>${a.name}${state.arenas[a.id] ? ` · ${t('mapArenaDefeated')}` : ''}</span>`).join('')
  openModal(`${modalHead(t('btnMap'), t('mapTitle'), t('mapHint'))}
    <div class="map-canvas-wrap"><canvas id="fullMap" width="840" height="660"></canvas></div>
    <div class="map-legend">${legend}<span><i class="legend-dot" style="background:#143d2b"></i>${t('mapHeart')}</span><span><i class="legend-dot" style="background:#fff;border:1px solid #143d2b"></i>${t('mapYou')}</span></div>
    <p class="confirm-text" style="margin-top:10px;font-size:11px">${t('mapFastTravelHint')}</p>`)
  const canvas = $('fullMap')
  if (world && canvas) {
    const ctx = canvas.getContext('2d')
    try {
      world.drawFullMap(ctx, canvas.width, canvas.height, {
        player: state.player,
        arenas: state.arenas,
        discovered: new Set(state.discovered || [])
      })
    } catch {}
    canvas.addEventListener('click', event => {
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 840 / (840 / 140)
      const y = ((event.clientY - rect.top) / rect.height) * 660 / (660 / 110)
      const spots = world.arenas.map(a => ({ ...a, kind: 'arena' }))
      spots.push({ x: 70, y: 57, id: 'heart', kind: 'heart' })
      let best = null
      let bestDist = 12
      for (const spot of spots) {
        const d = Math.hypot(spot.x - x, spot.y - y)
        if (d < bestDist) { bestDist = d; best = spot }
      }
      if (!best) return
      if (best.kind === 'heart') {
        if (badgeCount() < 4) { toast(t('heartLocked'), '◈'); return }
        closeModal()
        uiHooks.fastTravel({ kind: 'heart', x: 70, y: 60 })
        return
      }
      if (!state.discovered.includes(best.zone)) { toast(t('mapCannotTravel'), '▣'); return }
      closeModal()
      uiHooks.fastTravel(best)
    })
  }
}

export function panelJournal() {
  if (!state) return
  const caught = Object.keys(state.caught || {}).length
  const total = Object.keys(POKEDEX.species).length
  const badges = badgeCount()
  const trainers = (state.defeatedTrainers || []).length
  const modeName = { adventure: 'modeAdventure', random: 'modeRandom', hardcore: 'modeHardcore', nuzlocke: 'modeNuzlocke' }[state.mode]
  const rules = []
  rules.push(t(`modeRules${state.mode[0].toUpperCase()}${state.mode.slice(1)}`))
  if (state.mode === 'hardcore') rules.push(t('ruleNoItems'))
  if (state.mode === 'hardcore' || state.mode === 'nuzlocke') rules.push(t('rulePermadeath'))
  if (state.mode === 'nuzlocke') rules.push(t('ruleOneCatch'))
  if (state.options?.trainers) rules.push(t('optTrainersDesc'))
  if (state.options?.wild) rules.push(t('optWildDesc'))
  if (state.options?.moves) rules.push(t('optMovesDesc'))
  if (state.options?.starter) rules.push(t('optStarterDesc'))
  const areaKeys = { village: 'zoneVillage', rose: 'zoneRose', lake: 'zoneLake', greenhouse: 'zoneGreenhouse', fireflies: 'zoneFireflies', heart: 'zoneHeart' }
  const areas = (state.discovered || []).map(id => `<span class="seed-chip" style="margin:2px">${t(areaKeys[id] || id)}</span>`).join('')
  const arenaList = ['rose', 'lake', 'greenhouse', 'fireflies'].map(id => {
    const nameKey = { rose: 'arenaRose', lake: 'arenaLake', greenhouse: 'arenaGreenhouse', fireflies: 'arenaFireflies' }[id]
    return `<span class="seed-chip" style="margin:2px">${t(nameKey)} · ${state.arenas[id] ? t('journalDefeated') : t('journalOpen')}</span>`
  }).join('')

  openModal(`${modalHead(t('btnJournal'), t('journalTitle'), `${t('journalMode')}: ${t(modeName)}`)}
    <div class="journal-grid">
      <div class="journal-box"><span>${t('journalBadges')}</span><b>${badges}/4</b><p>${arenaList}</p></div>
      <div class="journal-box"><span>${t('journalCaught')}</span><b>${caught}</b><p>${t('journalProgress', { caught, total })}</p></div>
      <div class="journal-box"><span>${t('journalTrainers')}</span><b>${trainers}</b><p>${t('journalSeed')}: ${state.seed}</p></div>
      <div class="journal-box"><span>${t('journalPlaytime')}</span><b>${formatTime(state.playtime || 0)}</b><p>${t('journalAreas')}: ${(state.discovered || []).length}</p></div>
    </div>
    <div class="rules-title" style="margin-top:16px"><span>${t('journalRules')}</span><span class="rule-line"></span></div>
    <div class="rules-list">${rules.map(r => `<div class="rule-item"><span>✦</span><span>${r}</span></div>`).join('')}</div>
    <div class="rules-title" style="margin-top:14px"><span>${t('journalAreas')}</span><span class="rule-line"></span></div>
    <div>${areas || t('journalNoBadges')}</div>`, true)
}

export function panelShop() {
  if (!state) return
  const rows = SHOP_STOCK.map(key => {
    const item = ITEMS[key]
    if (!item) return ''
    return `<div class="shop-row">
      <div class="item-ico">${item.icon}</div>
      <div><strong>${t(item.key)}</strong><small>${t(item.desc)}</small></div>
      <span class="price">${t('shopPrice', { n: item.price })}</span>
      <button data-buy="${key}" ${state.petals < item.price ? 'disabled' : ''}>${t('shopBuy')}</button>
    </div>`
  }).join('')
  openModal(`${modalHead(t('shopTitle'), t('shopTitle'), t('shopHint'))}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="seed-chip">✿ ${state.petals} ${t('shopPetals')}</span>
    </div>
    <div class="shop-list">${rows}</div>`, true)
  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ok = uiHooks.buyItem(btn.dataset.buy)
      if (ok) panelShop()
    })
  })
}

export function panelSettings() {
  if (!state) return
  openModal(`${modalHead(t('settingsTitle'), t('settingsTitle'))}
    <div class="settings-row"><label>${t('settingsLanguage')}</label>
      <select id="settingsLang">${LANGUAGES.map(l => `<option value="${l.code}" ${l.code === getLanguage() ? 'selected' : ''}>${l.label}</option>`).join('')}</select>
    </div>
    <div class="settings-row"><label>${t('settingsMusic')}</label><button class="switch ${state.settings.music ? 'on' : ''}" data-setting="music" aria-label="${t('settingsMusic')}"></button></div>
    <div class="settings-row"><label>${t('settingsSfx')}</label><button class="switch ${state.settings.sfx ? 'on' : ''}" data-setting="sfx" aria-label="${t('settingsSfx')}"></button></div>
    <div class="settings-row"><label>${t('settingsControls')}</label><small style="max-width:55%;text-align:right;font-size:10px;color:var(--muted);font-weight:700">${t('settingsControlsText')}</small></div>
    <div class="settings-actions">
      <button class="btn btn-small btn-primary" data-settings="save">${t('settingsSave')}</button>
      <button class="btn btn-small btn-ghost" data-settings="how">${t('howTo')}</button>
      <button class="btn btn-small danger-btn" data-settings="reset">${t('settingsReset')}</button>
    </div>
    <p class="confirm-text" style="margin-top:12px;font-size:10px">${t('settingsAutosave')}</p>`, true)

  const lang = $('settingsLang')
  if (lang) lang.addEventListener('change', () => {
    const code = lang.value
    setLanguage(code)
    refreshLanguageUI()
    uiHooks.languageChanged(code)
    panelSettings()
  })
  document.querySelectorAll('[data-setting]').forEach(sw => {
    sw.addEventListener('click', () => {
      const key = sw.dataset.setting
      state.settings[key] = !state.settings[key]
      if (key === 'music') {
        if (state.settings.music) audio.startMusic()
        else audio.stopMusic()
      }
      sw.classList.toggle('on', state.settings[key])
      audio.sfx('select')
      saveGame()
    })
  })
  document.querySelectorAll('[data-settings]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.settings
      if (act === 'save') {
        uiHooks.save()
        toast(t('settingsSaved'), '◉')
      } else if (act === 'how') {
        openHow()
      } else if (act === 'reset') {
        confirmAction(t('settingsReset'), t('settingsResetConfirm'), t('settingsResetYes'), () => {
          clearSave()
          closeModal()
          uiHooks.goTitle()
        })
      }
    })
  })
}

export function panelPause() {
  if (!state) return
  openModal(`${modalHead(t('pauseTitle'), t('pauseTitle'))}
    <div class="settings-actions" style="flex-direction:column;align-items:stretch">
      <button class="btn btn-primary" data-pause="resume">${t('resume')}</button>
      <button class="btn btn-ghost" data-pause="savequit">${t('saveAndQuit')}</button>
      <button class="btn btn-ghost" data-pause="settings">${t('settingsTitle')}</button>
      <button class="btn btn-ghost" data-pause="how">${t('howTo')}</button>
      <button class="btn btn-ghost" data-pause="title">${t('quitNoSave')}</button>
    </div>`, true)
  document.querySelectorAll('[data-pause]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.pause
      if (act === 'resume') closeModal()
      else if (act === 'savequit') { uiHooks.save(); uiHooks.goTitle() }
      else if (act === 'settings') panelSettings()
      else if (act === 'how') openHow()
      else if (act === 'title') { closeModal(); uiHooks.goTitle() }
    })
  })
}

export function openHow() {
  const steps = ['howIntro', 'howMove', 'howInteract', 'howBattle', 'howCatch', 'howArena', 'howLanguage']
  openModal(`${modalHead(t('howTo'), t('howTitle'))}
    <div class="rules-list">${steps.map(k => `<div class="rule-item"><span>✦</span><span>${t(k)}</span></div>`).join('')}</div>
    <div class="confirm-actions"><button class="btn btn-small btn-primary" data-close-how>${t('howClose')}</button></div>`, true)
  const btn = document.querySelector('[data-close-how]')
  if (btn) btn.addEventListener('click', closeModal)
}

export function openCredits() {
  openModal(`${modalHead(t('credits'), t('creditsTitle'))}
    <p class="confirm-text">${t('creditsText')}</p>
    <div class="confirm-actions"><button class="btn btn-small btn-primary" data-close-credits>${t('creditsClose')}</button></div>`, true)
  const btn = document.querySelector('[data-close-credits]')
  if (btn) btn.addEventListener('click', closeModal)
}

export function confirmAction(title, text, yesLabel, onYes) {
  openModal(`${modalHead('', title)}<p class="confirm-text">${text}</p>
    <div class="confirm-actions">
      <button class="btn btn-small btn-ghost" data-confirm="no">${t('no')}</button>
      <button class="btn btn-small btn-primary" data-confirm="yes">${yesLabel || t('yes')}</button>
    </div>`, true)
  document.querySelectorAll('[data-confirm]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.confirm === 'yes') onYes()
      else closeModal()
    })
  })
}

export function showGameOver() {
  openModal(`${modalHead(t('gameOverKicker'), t('gameOverTitle'))}
    <p class="confirm-text">${t('gameOverText')}</p>
    <div class="confirm-actions">
      <button class="btn btn-small btn-ghost" data-gameover="new">${t('gameOverNew')}</button>
      <button class="btn btn-small btn-primary" data-gameover="retry">${t('gameOverRetry')}</button>
    </div>`, true)
  document.querySelectorAll('[data-gameover]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal()
      if (btn.dataset.gameover === 'retry') uiHooks.retry()
      else uiHooks.newRun()
    })
  })
}

let endingRaf = 0
export function showEnding() {
  if (!state) return
  $('gameScreen')?.classList.add('hidden')
  $('battleScreen')?.classList.add('hidden')
  $('endingScreen')?.classList.remove('hidden')
  closeModal()
  audio.setScene('ending')
  const stats = $('endingStats')
  if (stats) {
    const badges = badgeCount()
    const caught = Object.keys(state.caught || {}).length
    const trainers = (state.defeatedTrainers || []).length
    stats.innerHTML = `
      <div class="ending-stat"><b>${badges}</b>${t('endingStatBadges')}</div>
      <div class="ending-stat"><b>${caught}</b>${t('endingStatCaught')}</div>
      <div class="ending-stat"><b>${trainers}</b>${t('endingStatTrainers')}</div>
      <div class="ending-stat"><b>${formatTime(state.playtime || 0)}</b>${t('endingStatTime')}</div>`
  }
  const play = $('playAgainBtn')
  if (play) play.onclick = () => uiHooks.newRun()
  startEndingScene()
}

function startEndingScene() {
  cancelAnimationFrame(endingRaf)
  const canvas = $('endingCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const petals = Array.from({ length: 46 }, (_, i) => ({
    x: Math.random(), y: Math.random(), s: 2 + Math.random() * 5,
    vy: 0.02 + Math.random() * 0.05, vx: (Math.random() - .5) * 0.03,
    a: Math.random() * 7, spin: (Math.random() - .5) * .04, color: i % 3 ? '#b7e26b' : '#ffb7c5'
  }))
  function frame(ts) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = window.innerWidth, h = window.innerHeight
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#0f3222'); g.addColorStop(.6, '#164a30'); g.addColorStop(1, '#0b2418')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(183,226,107,.08)'
    ctx.beginPath(); ctx.arc(w * .5, h * .34, Math.min(w, h) * .34, 0, 7); ctx.fill()
    for (const p of petals) {
      p.y += p.vy * 0.01; p.x += p.vx * 0.01; p.a += p.spin
      if (p.y > 1.1) { p.y = -0.1; p.x = Math.random() }
      if (p.x > 1.1) p.x = -0.1
      if (p.x < -0.1) p.x = 1.1
      ctx.save()
      ctx.translate(p.x * w, p.y * h)
      ctx.rotate(p.a)
      ctx.fillStyle = p.color
      ctx.globalAlpha = .55
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .45, 0, 0, 7); ctx.fill()
      ctx.restore()
    }
    endingRaf = requestAnimationFrame(frame)
  }
  endingRaf = requestAnimationFrame(frame)
}

let titleRaf = 0
export function startTitleScene() {
  stopTitleScene()
  const canvas = $('titleCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const petals = Array.from({ length: 40 }, (_, i) => ({
    x: Math.random(), y: Math.random(), s: 2 + Math.random() * 6,
    vy: .006 + Math.random() * .014, vx: (Math.random() - .5) * .01,
    a: Math.random() * 7, spin: (Math.random() - .5) * .02,
    color: i % 4 === 0 ? '#ffb7c5' : i % 4 === 1 ? '#fff6e6' : '#d8f29b'
  }))
  let t0 = 0
  function frame(ts) {
    const dt = t0 ? Math.min(40, ts - t0) : 16
    t0 = ts
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = window.innerWidth, h = window.innerHeight
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#8fd3e8'); sky.addColorStop(.48, '#c9eedd'); sky.addColorStop(.7, '#eaf4c8'); sky.addColorStop(1, '#8fbf6a')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
    const sun = ctx.createRadialGradient(w * .18, h * .16, 4, w * .18, h * .16, Math.min(w, h) * .28)
    sun.addColorStop(0, 'rgba(255,250,214,.95)'); sun.addColorStop(.4, 'rgba(255,232,156,.45)'); sun.addColorStop(1, 'rgba(255,232,156,0)')
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,.42)'
    for (let i = 0; i < 4; i++) {
      const cx = ((ts * .004 + i * 330) % (w + 260)) - 130
      const cy = h * (.12 + i * .035)
      ctx.beginPath(); ctx.ellipse(cx, cy, 90, 22, 0, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx + 60, cy + 6, 60, 16, 0, 0, 7); ctx.fill()
    }
    ctx.fillStyle = '#7fae6b'
    ctx.beginPath(); ctx.moveTo(0, h * .64)
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * .64 - Math.sin(x * .006 + 1) * 26 - 12)
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#6a9f5c'
    ctx.beginPath(); ctx.moveTo(0, h * .74)
    for (let x = 0; x <= w; x += 30) ctx.lineTo(x, h * .74 - Math.sin(x * .009 + 2) * 18 - 8)
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
    for (const p of petals) {
      p.y += p.vy * dt * .06; p.x += p.vx * dt * .06; p.a += p.spin * dt * .06
      if (p.y > 1.08) { p.y = -0.08; p.x = Math.random() }
      if (p.x > 1.08) p.x = -0.08
      if (p.x < -0.08) p.x = 1.08
      ctx.save()
      ctx.translate(p.x * w, p.y * h)
      ctx.rotate(p.a)
      ctx.fillStyle = p.color
      ctx.globalAlpha = .7
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .5, 0, 0, 7); ctx.fill()
      ctx.restore()
    }
    titleRaf = requestAnimationFrame(frame)
  }
  titleRaf = requestAnimationFrame(frame)
}

export function stopTitleScene() {
  cancelAnimationFrame(titleRaf)
  titleRaf = 0
}

export function setTitleContinue(show) {
  const btn = $('continueBtn')
  if (btn) btn.classList.toggle('hidden', !show)
}
