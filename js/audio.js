// Tiny procedural sound engine. No assets, no autoplay until a user gesture.
let ac = null
let master = null
let enabled = true

function ensure() {
  if (typeof window === 'undefined') return null
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)()
      master = ac.createGain()
      master.gain.value = .16
      master.connect(ac.destination)
    } catch { return null }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {})
  return ac
}

export function setSoundEnabled(v) { enabled = !!v }

function tone(freq, dur = .12, type = 'sine', vol = .5, delay = 0, slide = 0) {
  if (!enabled) return
  const a = ensure()
  if (!a) return
  const t0 = a.currentTime + delay
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + .012)
  g.gain.exponentialRampToValueAtTime(.0001, t0 + dur)
  osc.connect(g); g.connect(master)
  osc.start(t0); osc.stop(t0 + dur + .03)
}

function noise(dur = .12, vol = .3, delay = 0, filterFreq = 1200) {
  if (!enabled) return
  const a = ensure()
  if (!a) return
  const t0 = a.currentTime + delay
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = a.createBufferSource(); src.buffer = buf
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq
  const g = a.createGain(); g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(master); src.start(t0)
}

const SOUNDS = {
  click() { tone(620, .05, 'triangle', .22) },
  hover() { tone(880, .035, 'sine', .08) },
  open() { tone(420, .08, 'triangle', .18); tone(640, .09, 'triangle', .14, .05) },
  close() { tone(500, .06, 'sine', .14); tone(320, .08, 'sine', .12, .04) },
  move() { tone(300, .08, 'square', .1); noise(.08, .1, 0, 900) },
  hit() { noise(.14, .32, 0, 900); tone(120, .12, 'sawtooth', .16, 0, -60) },
  superHit() { noise(.22, .4, 0, 1400); tone(90, .2, 'sawtooth', .2, 0, -50); tone(220, .1, 'square', .12, .03) },
  heal() { tone(520, .1, 'sine', .2); tone(660, .12, 'sine', .18, .08); tone(880, .16, 'sine', .14, .16) },
  status() { tone(240, .14, 'triangle', .16); tone(180, .18, 'triangle', .12, .1) },
  faint() { tone(220, .25, 'sawtooth', .16, 0, -140); noise(.2, .2, 0, 500) },
  switch() { tone(440, .07, 'square', .14); tone(660, .1, 'square', .12, .06) },
  ball() { tone(700, .08, 'triangle', .2); tone(520, .08, 'triangle', .16, .08); tone(880, .1, 'sine', .14, .16) },
  catch() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', .2, i * .1)) },
  win() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .18, i * .12)); tone(1319, .4, 'sine', .12, .6) },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .28, 'sine', .16, i * .16)) },
  battleStart() { noise(.3, .18, 0, 600); [196, 262, 330, 392].forEach((f, i) => tone(f, .18, 'square', .12, i * .09)) },
  badge() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .3, 'triangle', .18, i * .13)) },
  mega() { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'sawtooth', .12, i * .06)); noise(.5, .15, .2, 1600) },
  level() { [660, 880, 1100].forEach((f, i) => tone(f, .12, 'sine', .15, i * .07)) },
  step() { tone(160, .03, 'triangle', .04) }
}

export function sfx(name) {
  const play = SOUNDS[name]
  if (typeof play === 'function') play()
}

export function initAudioOnGesture() {
  const unlock = () => {
    ensure()
    document.removeEventListener('pointerdown', unlock)
    document.removeEventListener('keydown', unlock)
  }
  document.addEventListener('pointerdown', unlock, { passive: true })
  document.addEventListener('keydown', unlock)
}
