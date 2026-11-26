import { DEX_BY_ID } from '../data/pokedex.js'
import { MOVES, ITEMS, TYPE_COLORS, effectiveness, effLabel, typeGradient, statsAt, expForLevel } from '../data/moves.js'
import { createMon, monStats, maxHp, gainExp, evolutionOptions, evolveMon, expToNext, healMon, syncMoves, expProgress } from '../core/state.js'
import { clamp } from '../core/utils.js'
import { drawTrainer } from '../render/sprites.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const STAGE_MULT = [0.33, 0.4, 0.5, 0.66, 0.8, 1, 1.25, 1.4, 1.5, 1.66, 1.8, 2, 2.2, 2.4, 2.66, 3]
const stageMul = (s) => STAGE_MULT[clamp(s + 5, 0, 15)]

export class Battle {
  constructor (app) {
    this.app = app
    this.$ = (id) => document.getElementById(id)
    this.el = {
      screen: this.$('battle'), bg: this.$('battle-bg'), mode: this.$('battle-mode'),
      enemyName: this.$('enemy-name'), enemyLevel: this.$('enemy-level'), enemyTypes: this.$('enemy-types'),
      enemyHp: this.$('enemy-hp'), enemyStatus: this.$('enemy-status'), enemyPanel: this.$('enemy-panel'),
      allyName: this.$('ally-name'), allyLevel: this.$('ally-level'), allyTypes: this.$('ally-types'),
      allyHp: this.$('ally-hp'), allyHpNum: this.$('ally-hpnum'), allyStatus: this.$('ally-status'), allyXp: this.$('ally-xp'),
      enemySprite: this.$('enemy-sprite'), allySprite: this.$('ally-sprite'),
      text: this.$('battle-text'), history: this.$('battle-history'), moves: this.$('move-grid'),
      submenu: this.$('battle-submenu'), commands: this.$('battle-commands'), fx: this.$('fx-layer'),
      catchAnim: this.$('catch-anim'), flash: this.$('battle-flash'), particles: this.$('battle-particles'),
    }
    this.busy = false
    this.ended = true
    this.skipSay = false
    this.el.text?.addEventListener('click', () => { this.skipSay = true })
    this.$('btn-run')?.addEventListener('click', () => this.tryRun())
    this.$('btn-bag')?.addEventListener('click', () => this.openBag())
    this.$('btn-switch')?.addEventListener('click', () => this.openSwitch())
    this.$('battle-help')?.addEventListener('click', () => this.app.ui.toast('Tip: match move types to the enemy\'s weaknesses. ▲ marks super-effective moves.', '💡'))
    this.bindKeys = (e) => {
      if (this.ended) return
      if (e.key === 'b' || e.key === 'B') this.openBag()
      if (e.key === 'p' || e.key === 'P') this.openSwitch()
      if (e.key === 'r' || e.key === 'R') this.tryRun()
      if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        const i = +e.key - 1
        const btn = this.el.moves.querySelectorAll('.move-btn')[i]
        if (btn && !btn.disabled) btn.click()
      }
    }
  }

  async start (config) {
    this.config = config
    this.state = this.app.state
    this.ended = false
    this.busy = true
    this.skipSay = false
    this.stages = { ally: this.blankStages(), enemy: this.blankStages() }
    this.volatile = { ally: {}, enemy: {} }
    this.turn = 0
    this.faintedEnemies = 0
    this.allyIndex = Math.max(0, this.state.party.findIndex(m => m.hp > 0))
    this.enemyParty = config.enemyParty.map(m => ({ ...m, moves: m.moves?.length ? m.moves : [] }))
    for (const m of this.enemyParty) if (!m.moves.length) { const tmp = createMon(m.id, m.level); m.moves = tmp.moves; m.ivs = m.ivs || tmp.ivs; if (!m.maxHp) m.hp = maxHp(m) }
    this.enemyIndex = 0
    this.isWild = config.type === 'wild'
    this.el.screen.classList.remove('hidden')
    this.el.submenu.classList.add('hidden')
    this.el.catchAnim.classList.add('hidden')
    this.setArena(config.biome)
    this.el.mode.textContent = this.isWild ? 'WILD BATTLE' : config.type === 'gym' ? 'GYM BATTLE' : config.type === 'champion' ? 'CHAMPION BATTLE' : 'TRAINER BATTLE'
    this.el.enemySprite.style.display = ''
    this.el.allySprite.style.display = ''
    this.el.enemySprite.className = 'battle-sprite enemy-sprite enter-enemy'
    this.el.allySprite.className = 'battle-sprite ally-sprite enter-ally'
    this.el.enemySprite.src = `assets/sprites/${this.enemy.id}.png`
    this.el.allySprite.src = `assets/sprites/${this.ally.id}.png`
    this.renderAll()
    this.app.audio.startMusic('battle')
    this.app.audio.sfx('encounter')
    this.spawnBattleParticles()
    await sleep(420)
    if (this.isWild) {
      await this.say(`A wild ${this.enemyNickname()} appeared!`)
    } else {
      await this.say(`${config.trainerName} wants to battle!`)
      if (config.intro) await this.say(config.intro)
    }
    await this.say(`Go! ${this.allyNickname()}!`)
    this.busy = false
    this.renderMoves()
    this.updatePrompt()
    window.addEventListener('keydown', this.bindKeys)
  }

  setArena (biome = 'meadow') {
    const themes = {
      meadow: 'linear-gradient(180deg,#244a5e 0%,#3b7a57 48%,#4f8c48 65%,#2e5a35 100%)',
      forest: 'linear-gradient(180deg,#172e2a 0%,#2a4d38 48%,#3c6440 65%,#223f2a 100%)',
      lake: 'linear-gradient(180deg,#173a5e 0%,#2b5f7e 48%,#3e7d78 65%,#23565a 100%)',
      snow: 'linear-gradient(180deg,#3a5878 0%,#6d8fa8 48%,#c7dce4 65%,#7c9aad 100%)',
      volcano: 'linear-gradient(180deg,#2b1a1e 0%,#5a2a24 48%,#8a3b28 65%,#4a201c 100%)',
      desert: 'linear-gradient(180deg,#4a3a52 0%,#8a6a52 48%,#c9a46a 65%,#8a6a44 100%)',
      marsh: 'linear-gradient(180deg,#1f2c2a 0%,#3b5140 48%,#5d7452 65%,#334636 100%)',
      mountain: 'linear-gradient(180deg,#263247 0%,#4a5a70 48%,#7c8a94 65%,#4a5563 100%)',
      town: 'linear-gradient(180deg,#2b3f68 0%,#4a6a8e 48%,#6a8f6a 65%,#3f5a48 100%)',
    }
    this.el.bg.style.background = themes[biome] || themes.meadow
    this.el.bg.style.backgroundSize = 'cover'
  }

  spawnBattleParticles () {
    const el = this.el.particles
    el.innerHTML = ''
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('div')
      d.style.cssText = `position:absolute;left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${2 + Math.random() * 4}px;height:${2 + Math.random() * 4}px;border-radius:50%;background:rgba(255,255,255,${.08 + Math.random() * .18});animation:fly ${6 + Math.random() * 8}s ease-in-out ${-Math.random() * 10}s infinite`
      el.appendChild(d)
    }
  }

  get ally () { return this.state.party[this.allyIndex] }
  get enemy () { return this.enemyParty[this.enemyIndex] }
  allyNickname () { return this.ally?.nickname || this.allySp?.name || 'Partner' }
  enemyNickname () { return this.enemy?.nickname || this.enemySp?.name || 'Pokémon' }
  get allySp () { return DEX_BY_ID.get(this.ally?.id) }
  get enemySp () { return DEX_BY_ID.get(this.enemy?.id) }

  blankStages () { return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 } }

  renderAll () {
    this.renderPanels()
    this.renderMoves()
  }

  renderPanels () {
    const a = this.ally, e = this.enemy, asp = this.allySp, esp = this.enemySp
    if (!a || !e) return
    this.el.enemyName.textContent = (this.isWild ? 'Wild ' : '') + this.enemyNickname()
    this.el.enemyLevel.textContent = 'Lv ' + e.level
    this.el.enemyTypes.innerHTML = esp.t.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('')
    this.el.allyName.textContent = this.allyNickname()
    this.el.allyLevel.textContent = 'Lv ' + a.level
    this.el.allyTypes.innerHTML = asp.t.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('')
    this.setHp('enemy', e.hp / maxHp(e))
    this.setHp('ally', a.hp / maxHp(a))
    this.el.allyHpNum.textContent = `${Math.max(0, Math.round(a.hp))}/${maxHp(a)}`
    this.el.enemyStatus.innerHTML = this.statusChip(e.status)
    this.el.allyStatus.innerHTML = this.statusChip(a.status) + (this.volatile.ally.confused ? this.statusChip('Confusion') : '')
    this.el.allyXp.style.width = (expProgress(a) * 100) + '%'
    this.el.enemySprite.src = `assets/sprites/${e.id}.png`
    this.el.allySprite.src = `assets/sprites/${a.id}.png`
  }

  statusChip (s) {
    if (!s) return ''
    const map = { Poison:'st-poison', Burn:'st-burn', Paralysis:'st-paralysis', Sleep:'st-sleep', Freeze:'st-freeze', Confusion:'st-confusion' }
    return `<span class="status-chip ${map[s] || ''}">${s}</span>`
  }

  setHp (side, frac) {
    const bar = side === 'enemy' ? this.el.enemyHp : this.el.allyHp
    const pct = clamp(frac, 0, 1) * 100
    bar.style.width = pct + '%'
    bar.classList.toggle('mid', pct <= 50 && pct > 22)
    bar.classList.toggle('low', pct <= 22)
  }

  updatePrompt () {
    if (this.busy || this.ended) return
    this.el.text.textContent = `What will ${this.allyNickname()} do?`
  }

  renderMoves () {
    const grid = this.el.moves
    grid.innerHTML = ''
    if (!this.ally) return
    const moves = this.ally.moves.length ? this.ally.moves : syncMoves(this.ally) || []
    for (const mv of moves) {
      const def = MOVES[mv.n]
      if (!def) continue
      const eff = def.power ? effectiveness(def.type, this.enemySp.t) : 1
      const label = def.power ? (eff > 1 ? '▲ ' + (eff >= 4 ? '4×' : eff >= 2 ? '2×' : '') : eff === 0 ? '✕ 0×' : eff < 1 ? '▽' : '') : ''
      const btn = document.createElement('button')
      btn.className = 'move-btn'
      btn.style.setProperty('--mt', TYPE_COLORS[def.type])
      btn.innerHTML = `<div class="mv-name"><span>${def.name}</span><span class="mv-eff">${label}</span></div>
        <div class="mv-meta"><span class="mv-type" style="background:${TYPE_COLORS[def.type]}">${def.type}</span>
        <span>${def.cat === 'Status' ? 'Status' : def.power + ' PWR'}</span><span class="mv-pp">${mv.pp}/${mv.max} PP</span></div>`
      btn.disabled = this.busy || mv.pp <= 0
      btn.addEventListener('click', () => this.playerMove(mv))
      grid.appendChild(btn)
    }
    if (!moves.length) grid.innerHTML = '<div class="empty-note">No moves! Use Struggle.</div>'
    for (const btn of grid.querySelectorAll('.move-btn')) if (this.busy) btn.disabled = true
  }

  async say (text, hold = 380) {
    this.skipSay = false
    this.el.history.textContent = this.el.text.textContent
    this.el.text.textContent = ''
    const chars = [...text]
    for (let i = 0; i < chars.length; i++) {
      if (this.skipSay) { this.el.text.textContent = text; break }
      this.el.text.textContent += chars[i]
      if (i % 2 === 0) await sleep(9)
    }
    await sleep(this.skipSay ? 60 : hold)
  }

  async playerMove (moveSlot) {
    if (this.busy || this.ended) return
    const def = MOVES[moveSlot.n]
    if (!def || moveSlot.pp <= 0) return
    this.busy = true
    this.renderMoves()
    moveSlot.pp--
    this.turn++
    this.el.submenu.classList.add('hidden')
    // status checks
    if (await this.preTurn('ally')) { await this.endTurn(); return }
    await this.attack('ally', def)
    if (this.enemy.hp <= 0) { await this.handleEnemyFaint(); return }
    await this.enemyTurn()
    if (this.ally.hp <= 0) { await this.handleAllyFaint(); return }
    await this.endTurn()
  }

  async preTurn (side) {
    const mon = side === 'ally' ? this.ally : this.enemy
    const vol = this.volatile[side]
    if (this.recharge?.[side]) { this.recharge[side] = false; await this.say(`${this.nick(side)} must recharge!`); return true }
    if (mon.status === 'Sleep') {
      mon.statusTurns = (mon.statusTurns || 0) - 1
      if (mon.statusTurns <= 0) { mon.status = null; await this.say(`${this.nick(side)} woke up!`) }
      else { await this.say(`${this.nick(side)} is fast asleep…`); return true }
    }
    if (mon.status === 'Freeze') {
      if (Math.random() < 0.25) { mon.status = null; await this.say(`${this.nick(side)} thawed out!`) }
      else { await this.say(`${this.nick(side)} is frozen solid!`); return true }
    }
    if (mon.status === 'Paralysis' && Math.random() < 0.25) { await this.say(`${this.nick(side)} is paralyzed! It can't move!`); return true }
    if (vol.confused) {
      vol.confuseTurns--
      if (vol.confuseTurns <= 0) { vol.confused = false; await this.say(`${this.nick(side)} snapped out of confusion!`) }
      else if (Math.random() < 0.33) {
        const dmg = Math.max(1, Math.floor(maxHp(mon) / 12))
        mon.hp = Math.max(0, mon.hp - dmg)
        await this.say(`${this.nick(side)} is confused and hurt itself!`)
        await this.hitAnim(side === 'ally' ? 'ally' : 'enemy')
        this.renderPanels()
        return true
      }
    }
    if (vol.flinch) { vol.flinch = false; await this.say(`${this.nick(side)} flinched and couldn't move!`); return true }
    if (vol.protect) { vol.protect = false }
    return false
  }

  nick (side) { return side === 'ally' ? this.allyNickname() : this.enemyNickname() }

  async attack (side, move) {
    const attacker = side === 'ally' ? this.ally : this.enemy
    const defender = side === 'ally' ? this.enemy : this.ally
    const attackerSp = side === 'ally' ? this.allySp : this.enemySp
    const defenderSp = side === 'ally' ? this.enemySp : this.allySp
    const atkStages = this.stages[side], defStages = this.stages[side === 'ally' ? 'enemy' : 'ally']
    const vol = this.volatile[side === 'ally' ? 'enemy' : 'ally']
    if (vol.protect) { await this.say(`${this.nick(side === 'ally' ? 'enemy' : 'ally')} protected itself!`); return }
    await this.say(`${this.nick(side)} used ${move.name}!`, 180)
    // accuracy
    if (move.acc < 999) {
      const accMul = stageMul(atkStages.acc - defStages.eva)
      if (Math.random() * 100 > move.acc * accMul) {
        await this.say(`${this.nick(side)}'s attack missed!`)
        this.app.audio.sfx('weak')
        return
      }
    }
    if (side === 'ally') { this.el.allySprite.classList.add('attack-ally'); await sleep(180); this.el.allySprite.classList.remove('attack-ally') }
    else { this.el.enemySprite.classList.add('attack-enemy'); await sleep(180); this.el.enemySprite.classList.remove('attack-enemy') }
    if (move.cat === 'Status') {
      await this.applyStatusMove(side, move)
      this.renderPanels()
      return
    }
    if (move.heal) {
      const amt = Math.floor(maxHp(attacker) * move.heal)
      attacker.hp = Math.min(maxHp(attacker), attacker.hp + amt)
      this.app.audio.sfx('heal')
      await this.say(`${this.nick(side)} restored its health!`)
      this.renderPanels()
      return
    }
    const result = this.calcDamage(side, move)
    if (result.damage <= 0) {
      await this.say(`It doesn't affect ${this.nick(side === 'ally' ? 'enemy' : 'ally')}…`)
      this.app.audio.sfx('weak')
      return
    }
    defender.hp = Math.max(0, defender.hp - result.damage)
    this.app.audio.sfx(result.eff > 1 ? 'super' : result.eff < 1 ? 'weak' : 'hit')
    if (result.eff > 1) this.el.flash.classList.add('on'), setTimeout(() => this.el.flash.classList.remove('on'), 250)
    await this.hitAnim(side === 'ally' ? 'enemy' : 'ally')
    this.renderPanels()
    await sleep(260)
    if (result.crit) await this.say('A critical hit!', 220)
    const label = effLabel(result.eff)
    if (label) await this.say(label.text, 260)
    if (move.drain) {
      const amt = Math.max(1, Math.floor(result.damage * move.drain))
      attacker.hp = Math.min(maxHp(attacker), attacker.hp + amt)
      await this.say(`${this.nick(side)} drained energy!`, 200)
      this.renderPanels()
    }
    if (move.recoil) {
      const amt = Math.max(1, Math.floor(result.damage * move.recoil))
      attacker.hp = Math.max(0, attacker.hp - amt)
      await this.say(`${this.nick(side)} is hit with recoil!`, 200)
      this.renderPanels()
    }
    if (move.selfStat) {
      const st = this.stages[side]
      st[move.selfStat] = clamp(st[move.selfStat] + move.stages, -6, 6)
      await this.say(`${this.nick(side)}'s ${move.selfStat.toUpperCase()} fell!`, 200)
    }
    if (move.recharge) this.recharge = { ...(this.recharge || {}), [side]: true }
    if (move.flinch && Math.random() < move.flinch) this.volatile[side === 'ally' ? 'enemy' : 'ally'].flinch = true
    if (move.status && Math.random() < (move.chance ?? 1)) await this.tryStatus(side === 'ally' ? 'enemy' : 'ally', move.status, move.toxic)
    // extra stat drop on foe
    if (move.stat && move.target === 'foe' && Math.random() < (move.chance ?? 1)) {
      const st = this.stages[side === 'ally' ? 'enemy' : 'ally']
      st[move.stat] = clamp(st[move.stat] + move.stages, -6, 6)
      await this.say(`${this.nick(side === 'ally' ? 'enemy' : 'ally')}'s ${move.stat.toUpperCase()} fell!`, 200)
    }
    this.renderPanels()
  }

  async applyStatusMove (side, move) {
    const foe = side === 'ally' ? 'enemy' : 'ally'
    if (move.protect) { this.volatile[side].protect = true; await this.say(`${this.nick(side)} protected itself!`); return }
    if (move.heal) {
      const amt = Math.floor(maxHp(side === 'ally' ? this.ally : this.enemy) * move.heal)
      const mon = side === 'ally' ? this.ally : this.enemy
      mon.hp = Math.min(maxHp(mon), mon.hp + amt)
      this.app.audio.sfx('heal')
      await this.say(`${this.nick(side)} restored its health!`)
      return
    }
    if (move.status) { await this.tryStatus(foe, move.status, move.toxic); return }
    if (move.stat) {
      const targetSide = move.target === 'self' ? side : foe
      const st = this.stages[targetSide]
      st[move.stat] = clamp(st[move.stat] + move.stages, -6, 6)
      if (move.also) st[move.also] = clamp(st[move.also] + move.stages, -6, 6)
      await this.say(`${this.nick(targetSide)}'s ${move.stat.toUpperCase()} ${move.stages > 0 ? 'rose' : 'fell'}!`)
      if (move.also) await this.say(`${this.nick(targetSide)}'s ${move.also.toUpperCase()} ${move.stages > 0 ? 'rose' : 'fell'}!`)
    }
  }

  async tryStatus (targetSide, status, toxic) {
    const mon = targetSide === 'ally' ? this.ally : this.enemy
    const sp = targetSide === 'ally' ? this.allySp : this.enemySp
    if (mon.status) { await this.say(`${this.nick(targetSide)} is already affected!`, 200); return }
    if (status === 'Burn' && sp.t.includes('Fire')) { await this.say(`It doesn't affect ${this.nick(targetSide)}…`, 200); return }
    if (status === 'Paralysis' && sp.t.includes('Electric')) { await this.say(`It doesn't affect ${this.nick(targetSide)}…`, 200); return }
    if (status === 'Poison' && (sp.t.includes('Poison') || sp.t.includes('Steel'))) { await this.say(`It doesn't affect ${this.nick(targetSide)}…`, 200); return }
    if (status === 'Freeze' && sp.t.includes('Ice')) { await this.say(`It doesn't affect ${this.nick(targetSide)}…`, 200); return }
    if (status === 'Confusion') {
      this.volatile[targetSide].confused = true
      this.volatile[targetSide].confuseTurns = 2 + Math.floor(Math.random() * 3)
      await this.say(`${this.nick(targetSide)} became confused!`)
      return
    }
    mon.status = status
    if (status === 'Sleep') mon.statusTurns = 1 + Math.floor(Math.random() * 3)
    if (toxic) mon.toxic = true
    this.app.audio.sfx('weak')
    await this.say(`${this.nick(targetSide)} was ${status === 'Paralysis' ? 'paralyzed' : status === 'Burn' ? 'burned' : status === 'Poison' ? 'poisoned' : status === 'Freeze' ? 'frozen' : 'put to sleep'}!`)
  }

  calcDamage (side, move) {
    const attacker = side === 'ally' ? this.ally : this.enemy
    const defender = side === 'ally' ? this.enemy : this.ally
    const aSp = side === 'ally' ? this.allySp : this.enemySp
    const dSp = side === 'ally' ? this.enemySp : this.allySp
    const aSt = this.stages[side], dSt = this.stages[side === 'ally' ? 'enemy' : 'ally']
    const aStats = monStats(attacker), dStats = monStats(defender)
    let A = move.cat === 'Physical' ? aStats.atk : aStats.spa
    let D = move.cat === 'Physical' ? dStats.def : dStats.spd
    const statKey = move.cat === 'Physical' ? 'atk' : 'spa'
    const defKey = move.cat === 'Physical' ? 'def' : 'spd'
    A *= stageMul(aSt[statKey]); D *= stageMul(dSt[defKey])
    if (attacker.status === 'Burn' && move.cat === 'Physical') A *= .5
    let dmg = Math.floor((((2 * attacker.level / 5 + 2) * move.power * A / Math.max(1, D)) / 50 + 2))
    if (aSp.t.includes(move.type)) dmg = Math.floor(dmg * 1.5)
    const eff = effectiveness(move.type, dSp.t)
    dmg = Math.floor(dmg * eff)
    const crit = Math.random() < (move.crit ? 1 / 8 : 1 / 24)
    if (crit) dmg = Math.floor(dmg * 1.5)
    dmg = Math.floor(dmg * (0.86 + Math.random() * 0.14))
    return { damage: Math.max(eff === 0 ? 0 : 1, dmg), eff, crit }
  }

  async hitAnim (side) {
    const sprite = side === 'enemy' ? this.el.enemySprite : this.el.allySprite
    sprite.classList.add('hit')
    this.burst(side)
    await sleep(340)
    sprite.classList.remove('hit')
  }

  burst (side) {
    const count = 12
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div')
      d.className = 'fx-burst'
      d.style.left = (side === 'enemy' ? 66 : 26) + (Math.random() * 14 - 7) + '%'
      d.style.top = (side === 'enemy' ? 30 : 64) + (Math.random() * 12 - 6) + '%'
      d.style.background = ['#fff3b0', '#ffd777', '#ff8a5b', '#ffffff'][i % 4]
      d.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px')
      d.style.setProperty('--dy', (Math.random() * 90 - 45) + 'px')
      d.style.animationDelay = (Math.random() * .08) + 's'
      this.el.fx.appendChild(d)
      setTimeout(() => d.remove(), 900)
    }
  }

  async enemyTurn () {
    if (this.enemy.hp <= 0 || this.ended) return
    if (await this.preTurn('enemy')) return
    const move = this.chooseEnemyMove()
    await this.attack('enemy', move)
    this.renderPanels()
  }

  chooseEnemyMove () {
    const e = this.enemy
    const options = e.moves.filter(m => m.pp > 0).map(m => MOVES[m.n]).filter(Boolean)
    if (!options.length) return { name:'Struggle', type:'Normal', cat:'Physical', power:50, acc:999, pp:1 }
    let best = options[0], bestScore = -1
    for (const mv of options) {
      let score = mv.cat === 'Status' ? 24 : mv.power * effectiveness(mv.type, this.allySp.t) * (this.enemySp.t.includes(mv.type) ? 1.5 : 1)
      if (mv.heal && this.enemy.hp < maxHp(this.enemy) * .4) score = 200
      if (mv.status && !this.ally.status) score += 25
      score *= 0.8 + Math.random() * .4
      if (score > bestScore) { bestScore = score; best = mv }
    }
    const slot = e.moves.find(m => m.n === best.name)
    if (slot) slot.pp--
    return best
  }

  async endTurn () {
    for (const side of ['ally', 'enemy']) {
      const mon = side === 'ally' ? this.ally : this.enemy
      if (!mon || mon.hp <= 0) continue
      if (mon.status === 'Burn') {
        const dmg = Math.max(1, Math.floor(maxHp(mon) / 16))
        mon.hp = Math.max(0, mon.hp - dmg)
        await this.say(`${this.nick(side)} is hurt by its burn!`, 200)
        this.renderPanels()
        await sleep(250)
      } else if (mon.status === 'Poison') {
        const dmg = Math.max(1, Math.floor(maxHp(mon) / (mon.toxic ? 8 : 12)))
        mon.hp = Math.max(0, mon.hp - dmg)
        await this.say(`${this.nick(side)} is hurt by poison!`, 200)
        this.renderPanels()
        await sleep(250)
      }
    }
    this.renderPanels()
    if (this.enemy.hp <= 0) { await this.handleEnemyFaint(); return }
    if (this.ally.hp <= 0) { await this.handleAllyFaint(); return }
    this.busy = false
    this.renderMoves()
    this.updatePrompt()
  }

  async handleEnemyFaint () {
    this.el.enemySprite.classList.add('faint')
    this.app.audio.sfx('faint')
    await this.say(`${this.isWild ? 'The wild' : 'The foe\'s'} ${this.enemyNickname()} fainted!`)
    this.faintedEnemies++
    await sleep(500)
    this.el.enemySprite.classList.remove('faint')
    if (this.enemyIndex < this.enemyParty.length - 1) {
      this.enemyIndex++
      this.stages.enemy = this.blankStages()
      this.volatile.enemy = {}
      this.el.enemySprite.className = 'battle-sprite enemy-sprite enter-enemy'
      this.el.enemySprite.src = `assets/sprites/${this.enemy.id}.png`
      this.renderPanels()
      if (this.config.type === 'wild') await this.say(`A wild ${this.enemyNickname()} appeared!`)
      else await this.say(`${this.config.trainerName} sent out ${this.enemyNickname()}!`)
      this.busy = false
      this.renderMoves()
      this.updatePrompt()
      return
    }
    await this.victory()
  }

  async handleAllyFaint () {
    this.el.allySprite.classList.add('faint')
    this.app.audio.sfx('faint')
    await this.say(`${this.allyNickname()} fainted!`)
    await sleep(500)
    this.el.allySprite.classList.remove('faint')
    const next = this.state.party.findIndex(m => m.hp > 0)
    if (next >= 0) {
      this.busy = false
      this.el.text.textContent = 'Choose your next Pokémon!'
      this.openSwitch(true)
      return
    }
    await this.whiteout()
  }

  async whiteout () {
    await this.say('You have no Pokémon left…', 500)
    await this.say('You scurried back to the last Pokémon Center.', 600)
    this.state.money = Math.max(0, Math.floor(this.state.money * 0.9))
    for (const m of this.state.party) { healMon(m) }
    this.app.ui.fadeOut(async () => {
      this.state.pos = this.app.world.towns.find(t => t.id === this.state.lastTown) ? { x: this.app.world.towns.find(t => t.id === this.state.lastTown).x + .5, y: this.app.world.towns.find(t => t.id === this.state.lastTown).y + 3.5 } : { x: 96.5, y: 105.5 }
      this.state.save()
      this.app.ui.fadeIn()
    })
    this.finish({ result: 'whiteout' })
  }

  async victory () {
    this.busy = true
    this.el.moves.innerHTML = ''
    this.el.text.textContent = 'Victory!'
    this.app.audio.stopMusic()
    this.app.audio.sfx('badge')
    this.app.audio.startMusic('victory')
    const gained = []
    const xpBase = this.enemyParty.reduce((sum, m) => {
      const sp = DEX_BY_ID.get(m.id)
      const bst = sp.s.reduce((a, b) => a + b, 0)
      return sum + Math.floor((bst / 6 + 18) * m.level * 0.55)
    }, 0)
    const xp = Math.floor(xpBase * (this.isWild ? 1 : 1.5))
    const lvlBefore = this.ally.level
    const res = gainExp(this.ally, xp)
    gained.push({ mon: this.ally, xp, levels: res.levels, moves: res.moves })
    await this.say(`${this.allyNickname()} gained ${xp} EXP!`)
    this.renderPanels()
    if (res.levels > 0) {
      this.app.audio.sfx('level')
      await this.say(`${this.allyNickname()} grew to Lv ${this.ally.level}!`)
      this.renderPanels()
      for (const mv of res.moves) await this.say(`${this.allyNickname()} learned ${mv}!`)
    }
    // small XP for party
    for (const m of this.state.party) if (m !== this.ally && m.hp > 0) gainExp(m, Math.floor(xp * .2))
    if (this.config.type === 'wild') {
      const money = this.enemyParty[0].level * 18
      this.state.money += money
      this.app.ui.toast(`+₽${money} from the wild`, '💰')
    } else {
      this.state.money += this.config.reward || 0
      await this.say(`You received ₽${(this.config.reward || 0).toLocaleString()}!`)
    }
    this.state.stats.wins++
    this.state.save()
    if (this.config.type === 'gym') {
      const badge = this.app.badges.find(b => b.id === this.config.badgeId)
      if (badge) {
        this.state.addBadge(badge.id)
        await this.say(`You earned the ${badge.name}!`, 500)
        this.app.ui.badgeCelebration(badge)
      }
      if (this.config.items) for (const [it, n] of Object.entries(this.config.items)) this.state.addItem(it, n)
    }
    if (this.config.type === 'champion') {
      this.state.champion = true
      this.app.ui.championCelebration()
    }
    this.state.save()
    this.app.ui.refreshHUD()
    // evolutions
    await this.checkEvolutions()
    this.app.ui.fadeOut(async () => {
      this.app.ui.fadeIn()
      this.finish({ result: 'win' })
    })
  }

  async checkEvolutions () {
    for (const mon of this.state.party) {
      const opts = evolutionOptions(mon)
      if (!opts.length) continue
      let target = opts[0].id
      if (opts.length > 1) {
        target = await this.app.ui.askEvolution(mon, opts) || opts[0].id
      }
      if (!target) continue
      const oldName = mon.nickname || DEX_BY_ID.get(mon.id).name
      this.el.screen.classList.add('hidden')
      await this.app.ui.evolutionAnimation(mon, target)
      this.el.screen.classList.remove('hidden')
      this.app.audio.sfx('evolve')
      await this.say(`Congratulations! ${oldName} evolved into ${DEX_BY_ID.get(mon.id).name}!`, 600)
      this.state.stats.evolutions++
      this.state.recordCaught(mon.id, mon)
      this.renderPanels()
    }
  }

  async tryRun () {
    if (this.busy || this.ended) return
    if (!this.isWild) { this.app.audio.sfx('error'); await this.say("You can't run from a trainer battle!"); return }
    this.busy = true
    this.renderMoves()
    if (Math.random() < .8) {
      await this.say('Got away safely!')
      this.finish({ result: 'run' })
    } else {
      await this.say("Couldn't escape!")
      await this.enemyTurn()
      await this.endTurn()
    }
  }

  openBag () {
    if (this.busy || this.ended) return
    this.app.audio.sfx('open')
    const sub = this.el.submenu
    sub.classList.remove('hidden')
    const items = Object.entries(this.state.bag).filter(([id, n]) => n > 0 && ITEMS[id])
    const usable = items.filter(([id]) => {
      const it = ITEMS[id]
      if (it.kind === 'ball') return this.isWild
      if (it.kind === 'heal') return this.ally.hp < maxHp(this.ally) || (this.ally.status && it.cure)
      if (it.kind === 'revive') return this.state.party.some(m => m.hp <= 0)
      return false
    })
    sub.innerHTML = `<div class="sub-head"><span>🎒 Bag</span><button class="mini-btn" id="sub-close">✕ Close</button></div>
      <div class="sub-list">${usable.length ? usable.map(([id, n]) => {
        const it = ITEMS[id]
        return `<button class="sub-item" data-item="${id}"><span class="si-icon">${it.icon}</span><span><span>${it.name}</span><br><span class="si-sub">×${n} · ${it.desc}</span></span></button>`
      }).join('') : '<div class="empty-note">No usable items here. Visit a Poké Mart!</div>'}</div>`
    sub.querySelector('#sub-close').onclick = () => { sub.classList.add('hidden'); this.app.audio.sfx('close') }
    for (const b of sub.querySelectorAll('[data-item]')) b.onclick = () => this.useBattleItem(b.dataset.item)
  }

  async useBattleItem (id) {
    const it = ITEMS[id]
    if (!it || !this.state.bag[id]) return
    this.el.submenu.classList.add('hidden')
    this.busy = true
    this.renderMoves()
    if (it.kind === 'ball') {
      if (!this.isWild) { this.busy = false; this.updatePrompt(); return }
      this.state.useItem(id)
      this.app.audio.sfx('throw')
      this.el.catchAnim.classList.remove('hidden', 'shake')
      this.el.catchAnim.querySelector('.catch-stars').style.opacity = '0'
      await sleep(1100)
      const catchRate = this.enemySp.cr / 255
      const hpFactor = (3 * maxHp(this.enemy) - 2 * this.enemy.hp) / (3 * maxHp(this.enemy))
      let chance = clamp(catchRate * hpFactor * (it.ball || 1) * (this.enemy.status ? 1.5 : 1), 0.03, 0.97)
      if (it.ball >= 255) chance = 1
      const shakes = chance > .75 ? 3 : chance > .45 ? 2 : chance > .2 ? 1 : 0
      for (let i = 0; i < 3; i++) {
        if (i < shakes) {
          this.el.catchAnim.classList.add('shake')
          this.app.audio.sfx('shake')
          await sleep(550)
          this.el.catchAnim.classList.remove('shake')
          await sleep(250)
        }
      }
      if (Math.random() < chance) {
        this.app.audio.sfx('catch')
        this.el.catchAnim.querySelector('.catch-stars').style.opacity = '1'
        await sleep(600)
        this.el.catchAnim.classList.add('hidden')
        await this.say(`Gotcha! ${this.enemyNickname()} was caught!`, 500)
        const isNew = !this.state.caught.has(this.enemy.id)
        const caught = createMon(this.enemy.id, this.enemy.level, { shiny: this.enemy.shiny, met: this.config.biome || 'the wilds' })
        caught.hp = Math.max(1, this.enemy.hp)
        const added = this.state.addMon(caught)
        this.state.recordCaught(caught.id, caught)
        this.app.ui.toast(`${this.enemySp.name} added to your ${added ? 'party' : 'PC box'}!`, '◓', 'gold')
        if (isNew) this.app.ui.dexNew(caught.id)
        this.app.ui.refreshHUD()
        this.app.ui.save()
        this.finish({ result: 'caught' })
      } else {
        this.el.catchAnim.classList.add('hidden')
        await this.say(`Oh no! ${this.enemyNickname()} broke free!`)
        await this.enemyTurn()
        await this.endTurn()
      }
      return
    }
    if (it.kind === 'heal') {
      this.state.useItem(id)
      const amt = Math.min(it.heal, maxHp(this.ally) - this.ally.hp)
      this.ally.hp += amt
      if (it.cure) this.ally.status = null
      this.app.audio.sfx('heal')
      this.renderPanels()
      await this.say(`${this.allyNickname()} recovered ${amt} HP!`)
      await this.enemyTurn()
      await this.endTurn()
      return
    }
    if (it.kind === 'revive') {
      const target = this.state.party.find(m => m.hp <= 0)
      if (!target) { this.busy = false; this.updatePrompt(); return }
      this.state.useItem(id)
      target.hp = Math.floor(maxHp(target) / 2)
      target.status = null
      this.app.audio.sfx('heal')
      await this.say(`${target.nickname || DEX_BY_ID.get(target.id).name} was revived!`)
      await this.enemyTurn()
      await this.endTurn()
    }
  }

  openSwitch (forced = false) {
    if (this.busy && !forced) return
    this.app.audio.sfx('open')
    const sub = this.el.submenu
    sub.classList.remove('hidden')
    sub.innerHTML = `<div class="sub-head"><span>◉ Choose a Pokémon${forced ? ' — your partner fainted!' : ''}</span>${forced ? '' : '<button class="mini-btn" id="sub-close">✕ Close</button>'}</div>
      <div class="sub-list">${this.state.party.map((m, i) => {
        const sp = DEX_BY_ID.get(m.id)
        const hpPct = m.hp / maxHp(m)
        return `<button class="sub-item" data-switch="${i}" ${m.hp <= 0 || i === this.allyIndex ? 'disabled' : ''}>
          <img src="assets/sprites/${m.id}.png" style="width:34px;height:34px;image-rendering:pixelated" />
          <span><span>${m.nickname || sp.name} ${i === this.allyIndex ? '(active)' : ''}</span><br><span class="si-sub">Lv ${m.level} · ${Math.round(hpPct * 100)}% HP ${m.status ? '· ' + m.status : ''}</span></span></button>`
      }).join('')}</div>`
    if (!forced) sub.querySelector('#sub-close').onclick = () => { sub.classList.add('hidden'); this.app.audio.sfx('close') }
    for (const b of sub.querySelectorAll('[data-switch]')) b.onclick = () => this.doSwitch(+b.dataset.switch)
  }

  async doSwitch (index) {
    if (index === this.allyIndex || this.state.party[index].hp <= 0) return
    const forced = this.ally.hp <= 0
    this.el.submenu.classList.add('hidden')
    this.busy = true
    this.renderMoves()
    this.allyIndex = index
    this.stages.ally = this.blankStages()
    this.volatile.ally = {}
    this.el.allySprite.className = 'battle-sprite ally-sprite enter-ally'
    this.el.allySprite.src = `assets/sprites/${this.ally.id}.png`
    this.renderPanels()
    this.app.audio.sfx('select')
    await this.say(`Go! ${this.allyNickname()}!`)
    if (!forced) {
      await this.enemyTurn()
      if (this.ally.hp <= 0) { await this.handleAllyFaint(); return }
      await this.endTurn()
    } else {
      this.busy = false
      this.renderMoves()
      this.updatePrompt()
    }
  }

  finish (result) {
    if (this.ended) return
    this.ended = true
    this.busy = true
    window.removeEventListener('keydown', this.bindKeys)
    this.el.screen.classList.add('hidden')
    this.el.submenu.classList.add('hidden')
    this.app.audio.stopMusic()
    this.app.audio.startMusic('world')
    this.state.save()
    this.app.endBattle(result)
  }
}

export { sleep }
