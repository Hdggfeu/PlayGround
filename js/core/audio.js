// Tiny procedural chiptune engine — no external audio assets.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12)
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]

export class AudioEngine {
  constructor () {
    this.ctx = null
    this.musicMode = 'none'
    this.enabled = false
    this.musicVol = .5
    this.sfxVol = .6
    this.muted = false
    this.timer = null
    this.nextBar = 0
    this.bar = 0
    this.tempo = 108
    this.master = null
    this.musicGain = null
    this.sfxGain = null
    this.seed = 7
  }

  init () {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol * .5; this.musicGain.connect(this.master)
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVol * .55; this.sfxGain.connect(this.master)
    this.enabled = true
    this.noiseBuf = this.makeNoise()
  }

  resume () { if (this.ctx?.state === 'suspended') this.ctx.resume() }
  setVolumes (music, sfx, muted) {
    this.musicVol = music; this.sfxVol = sfx; this.muted = muted
    if (this.master) {
      this.master.gain.value = muted ? 0 : 1
      this.musicGain.gain.value = music * .5
      this.sfxGain.gain.value = sfx * .55
    }
  }

  makeNoise () {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * .4, this.ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return b
  }

  tone (freq, start, dur, opts = {}) {
    if (!this.ctx) return
    const { type = 'triangle', vol = .12, dest = this.musicGain, attack = .01, decay = .12, detune = 0, slide = 0 } = opts
    const o = this.ctx.createOscillator(), g = this.ctx.createGain()
    o.type = type; o.frequency.setValueAtTime(freq, start)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + dur)
    if (detune) o.detune.value = detune
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(vol, start + attack)
    g.gain.exponentialRampToValueAtTime(.0001, start + dur)
    o.connect(g); g.connect(dest)
    o.start(start); o.stop(start + dur + .02)
  }

  noise (start, dur, vol = .1, filter = 2000) {
    if (!this.ctx) return
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(.0001, start + dur)
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = filter
    src.connect(f); f.connect(g); g.connect(this.sfxGain)
    src.start(start); src.stop(start + dur)
  }

  sfx (name) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime
    switch (name) {
      case 'click': this.tone(660, t, .07, { type:'square', vol:.05, dest:this.sfxGain }); break
      case 'open': this.tone(520, t, .1, { type:'triangle', vol:.08, dest:this.sfxGain }); this.tone(780, t + .06, .12, { type:'triangle', vol:.07, dest:this.sfxGain }); break
      case 'close': this.tone(420, t, .08, { type:'triangle', vol:.06, dest:this.sfxGain }); break
      case 'select': this.tone(880, t, .08, { type:'square', vol:.045, dest:this.sfxGain }); break
      case 'error': this.tone(160, t, .16, { type:'square', vol:.08, dest:this.sfxGain }); this.tone(130, t + .1, .18, { type:'square', vol:.07, dest:this.sfxGain }); break
      case 'hit': this.noise(t, .12, .16, 600); this.tone(140, t, .14, { type:'sawtooth', vol:.1, dest:this.sfxGain, slide:-60 }); break
      case 'super': this.noise(t, .22, .2, 400); this.tone(180, t, .22, { type:'sawtooth', vol:.13, dest:this.sfxGain, slide:-100 }); this.tone(90, t + .04, .2, { type:'square', vol:.1, dest:this.sfxGain }); break
      case 'weak': this.tone(220, t, .1, { type:'triangle', vol:.06, dest:this.sfxGain, slide:-80 }); break
      case 'faint': this.tone(320, t, .5, { type:'triangle', vol:.1, dest:this.sfxGain, slide:-260 }); break
      case 'heal': [523,659,784,1046].forEach((f,i) => this.tone(f, t + i*.08, .25, { type:'sine', vol:.09, dest:this.sfxGain })); break
      case 'catch': [392,523,659,784,1046].forEach((f,i) => this.tone(f, t + i*.07, .3, { type:'triangle', vol:.08, dest:this.sfxGain })); break
      case 'throw': this.tone(300, t, .18, { type:'sine', vol:.08, dest:this.sfxGain, slide:500 }); this.noise(t + .12, .06, .06, 1500); break
      case 'shake': this.tone(520, t, .05, { type:'square', vol:.05, dest:this.sfxGain }); break
      case 'run': this.noise(t, .18, .08, 800); this.tone(240, t, .16, { type:'triangle', vol:.05, dest:this.sfxGain, slide:120 }); break
      case 'level': [523,659,784,1046,1318].forEach((f,i) => this.tone(f, t + i*.06, .32, { type:'square', vol:.055, dest:this.sfxGain })); break
      case 'badge': [392,523,659,784,1046,1318,1568].forEach((f,i) => this.tone(f, t + i*.09, .45, { type:'triangle', vol:.09, dest:this.sfxGain })); break
      case 'evolve': for (let i=0;i<10;i++) this.tone(300 + i*90, t + i*.09, .3, { type:'sine', vol:.07, dest:this.sfxGain }); break
      case 'encounter': [330,392,466,392].forEach((f,i) => this.tone(f, t + i*.06, .18, { type:'square', vol:.06, dest:this.sfxGain })); this.noise(t, .25, .06, 900); break
      case 'quest': [523,659,784].forEach((f,i) => this.tone(f, t + i*.1, .4, { type:'triangle', vol:.07, dest:this.sfxGain })); break
      case 'step': break
    }
  }

  startMusic (mode = 'world') {
    if (!this.ctx) return
    this.musicMode = mode
    if (!this.timer) {
      this.nextBar = this.ctx.currentTime + .08
      this.bar = 0
      this.timer = setInterval(() => this.schedule(), 40)
    }
  }

  stopMusic () {
    this.musicMode = 'none'
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  schedule () {
    if (!this.ctx || this.musicMode === 'none') return
    const lookahead = this.ctx.currentTime + .25
    while (this.nextBar < lookahead) {
      const mode = this.musicMode
      const bpm = mode === 'battle' ? 148 : mode === 'victory' ? 132 : mode === 'town' ? 112 : 96
      const beat = 60 / bpm
      const barDur = beat * 4
      this.playBar(this.nextBar, barDur, beat, mode)
      this.nextBar += barDur
      this.bar++
    }
  }

  playBar (t, dur, beat, mode) {
    const prog = mode === 'battle' ? [45, 41, 43, 44] : mode === 'town' ? [48, 53, 55, 53] : [45, 48, 41, 43]
    const root = prog[this.bar % prog.length]
    const rnd = (i) => ((Math.sin((this.bar + 1) * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1
    // bass
    for (let i = 0; i < 4; i++) {
      this.tone(NOTE(root - 24 + (i === 2 ? 7 : 0)), t + i * beat, beat * .8, { type:'triangle', vol:.09, dest:this.musicGain })
    }
    // pad chord
    for (const iv of [0, 3, 7]) this.tone(NOTE(root + iv), t, dur * .96, { type:'sine', vol:.028, dest:this.musicGain, attack:.08 })
    // arpeggio / melody
    const pattern = mode === 'battle' ? [0, 2, 4, 7, 4, 2, 7, 9] : [0, 4, 2, 7, 4, 9, 7, 4]
    const notes = mode === 'town' ? 8 : 8
    for (let i = 0; i < notes; i++) {
      if (mode === 'world' && i % 4 === 3 && rnd(i) > .5) continue
      const sc = SCALE[pattern[(i + this.bar) % pattern.length] % SCALE.length]
      const oct = mode === 'battle' ? 12 : 12
      this.tone(NOTE(root + sc + oct), t + i * beat * .5, beat * .42, { type: mode === 'battle' ? 'square' : 'triangle', vol: mode === 'battle' ? .028 : .038, dest:this.musicGain, detune: mode === 'world' ? 3 : 0 })
    }
    // light percussion
    if (mode === 'battle' || mode === 'town') {
      for (let i = 0; i < 4; i++) {
        this.noiseAt(t + i * beat, .04, .035, 6000)
        if (i % 2 === 0) this.noiseAt(t + i * beat, .08, .05, 300)
      }
    }
  }

  noiseAt (start, dur, vol, filter) {
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(.0001, start + dur)
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = filter
    src.connect(f); f.connect(g); g.connect(this.musicGain)
    src.start(start); src.stop(start + dur + .01)
  }
}

export const audio = new AudioEngine()
