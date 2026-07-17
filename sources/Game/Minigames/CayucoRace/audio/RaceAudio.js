// Race voices, all synthesized: the drummer's pulse at the act's target BPM,
// stroke splashes, an in-zone shimmer reward layer, and surf rumble.
//
// The drum uses the standard lookahead scheduler (a coarse JS timer schedules
// beats a short window ahead with exact AudioContext timestamps). The player
// matches TEMPO, not phase, so audio latency never affects scoring.

import AudioEngine from './AudioEngine.js'

// Pentatonic scale — semitone offsets from each act's root. Nothing here can
// clash, so any pattern sounds musical.
const SCALE = [0, 3, 5, 7, 10, 12]

// 8-step (eighth-note) marimba patterns; entries index SCALE, null = rest.
const PATTERNS = {
  calm: [0, null, 2, null, 4, null, 2, null],
  waves: [0, 2, 4, 5, 4, 2, 0, null],
  sparse: [0, null, null, null, 3, null, null, null],
  sprint: [4, 5, 4, 2, 5, 4, 2, 0]
}

// Per-act voicing, indexed by act order. Intensity grows then drops for the
// headwind grind and peaks in the sprint.
const LAYERS = [
  { shaker: false, pattern: null, root: 0 }, //   launch — drum only
  { shaker: true, pattern: PATTERNS.calm, root: 220 }, // cruise
  { shaker: true, pattern: PATTERNS.waves, root: 262 }, // waves
  { shaker: false, pattern: PATTERNS.sparse, root: 165 }, // headwind — sparse + low
  { shaker: true, pattern: PATTERNS.sprint, root: 330 } //  sprint — busy + bright
]

export default class RaceAudio {
  constructor(cfg = {}) {
    this.cfg = {
      drumGain: 0.25,
      lookahead: 0.12,
      schedulerInterval: 0.025,
      ...cfg
    }

    this.engine = new AudioEngine()

    this.drumBpm = 100
    this.drumRunning = false
    this.nextBeatTime = 0
    this.beatCount = 0 // counts eighth-notes now
    this.schedulerId = null
    this.layer = LAYERS[0] // current act's voicing

    this.shimmer = null // { gain, oscA, oscB }
    this.rumble = null // { gain, source, filter }
    this.surfState = 'off'
    this.inZone = false
  }

  get muted() {
    return this.engine.muted
  }

  unlock() {
    this.engine.unlock()
  }

  toggleMuted() {
    return this.engine.toggleMuted()
  }

  // --- Drum pulse ---

  startDrum(bpm) {
    this.drumBpm = bpm
    if (this.drumRunning) return
    this.drumRunning = true
    this.beatCount = 0
    this.nextBeatTime = null

    this.schedulerId = setInterval(() => {
      if (!this.engine.ready) return
      const ctx = this.engine.ctx
      if (this.nextBeatTime === null) {
        this.nextBeatTime = ctx.currentTime + 0.05
      }
      // Scheduler runs at eighth-note resolution so the shaker and marimba
      // can land between the drum's quarter-note pulses.
      const eighth = 30 / this.drumBpm
      while (this.nextBeatTime < ctx.currentTime + this.cfg.lookahead) {
        this.scheduleStep(this.nextBeatTime, this.beatCount)
        this.beatCount += 1
        this.nextBeatTime += eighth
      }
    }, this.cfg.schedulerInterval * 1000)
  }

  // One eighth-note step: drum on the beat, shaker offbeats, melody per pattern.
  scheduleStep(time, count) {
    const onBeat = count % 2 === 0
    const step = Math.floor(count / 2) % 4 // quarter-beat within the bar

    if (onBeat) {
      this.playDrumHit(time, step === 0)
    } else if (this.layer.shaker) {
      this.playShaker(time)
    }

    if (this.layer.pattern) {
      const degree = this.layer.pattern[count % this.layer.pattern.length]
      if (degree !== null && degree !== undefined) {
        this.playMarimba(time, this.layer.root * Math.pow(2, SCALE[degree] / 12))
      }
    }
  }

  // Offbeat shaker — a short bright noise tick
  playShaker(time) {
    const ctx = this.engine.ctx
    const noise = ctx.createBufferSource()
    noise.buffer = this.engine.getNoiseBuffer()
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 6000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(this.cfg.drumGain * 0.25, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.engine.master)
    noise.start(time, Math.random() * 0.4)
    noise.stop(time + 0.06)
  }

  // Marimba pluck — triangle with a quick percussive decay
  playMarimba(time, freq) {
    const ctx = this.engine.ctx
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(this.cfg.drumGain * 0.4, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25)
    osc.connect(gain)
    gain.connect(this.engine.master)
    osc.start(time)
    osc.stop(time + 0.3)
  }

  setAct(actIndex) {
    this.layer = LAYERS[Math.min(actIndex, LAYERS.length - 1)] || LAYERS[0]
  }

  setDrumBpm(bpm) {
    // Takes effect on the next beat — a natural tempo transition
    this.drumBpm = bpm
  }

  stopDrum() {
    this.drumRunning = false
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId)
      this.schedulerId = null
    }
  }

  playDrumHit(time, accent) {
    const ctx = this.engine.ctx
    const gainValue = this.cfg.drumGain * (accent ? 1.4 : 1)

    // Skin thump — triangle with a fast pitch drop
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(160, time)
    osc.frequency.exponentialRampToValueAtTime(55, time + 0.09)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(gainValue, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18)

    osc.connect(gain)
    gain.connect(this.engine.master)
    osc.start(time)
    osc.stop(time + 0.2)

    // Skin snap — short filtered noise burst
    const noise = ctx.createBufferSource()
    noise.buffer = this.engine.getNoiseBuffer()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(gainValue * 0.5, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03)

    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(this.engine.master)
    noise.start(time)
    noise.stop(time + 0.05)
  }

  // Two quick accent hits announcing an act change
  playStinger() {
    if (!this.engine.ready) return
    const t = this.engine.ctx.currentTime + 0.02
    this.playDrumHit(t, true)
    this.playDrumHit(t + 0.14, true)
  }

  // --- Stroke splash ---

  playSplash(weak = false) {
    if (!this.engine.ready) return
    const ctx = this.engine.ctx
    const time = ctx.currentTime

    const noise = ctx.createBufferSource()
    noise.buffer = this.engine.getNoiseBuffer()
    noise.playbackRate.value = 0.85 + Math.random() * 0.3

    const filter = ctx.createBiquadFilter()
    if (weak) {
      // Fatigued form — a dull, slappy hit
      filter.type = 'lowpass'
      filter.frequency.value = 500
    } else {
      filter.type = 'bandpass'
      filter.frequency.value = 1100
      filter.Q.value = 0.8
    }

    const duration = weak ? 0.25 : 0.12
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(weak ? 0.1 : 0.18, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.engine.master)
    noise.start(time, Math.random() * 0.5)
    noise.stop(time + duration + 0.05)
  }

  // Rising sweep when a wave is caught
  playCatch() {
    if (!this.engine.ready) return
    const ctx = this.engine.ctx
    const time = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, time)
    osc.frequency.exponentialRampToValueAtTime(900, time + 0.35)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.12, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5)

    osc.connect(gain)
    gain.connect(this.engine.master)
    osc.start(time)
    osc.stop(time + 0.55)
  }

  // --- Persistent layers (created lazily, driven by target gains) ---

  ensureShimmer() {
    if (this.shimmer || !this.engine.ready) return
    const ctx = this.engine.ctx

    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.engine.master)

    // Two close sines beat slowly against each other — a gentle glow
    const oscA = ctx.createOscillator()
    oscA.type = 'sine'
    oscA.frequency.value = 1320
    const oscB = ctx.createOscillator()
    oscB.type = 'sine'
    oscB.frequency.value = 1324
    oscA.connect(gain)
    oscB.connect(gain)
    oscA.start()
    oscB.start()

    this.shimmer = { gain, oscA, oscB }
  }

  setInZone(inZone) {
    if (inZone === this.inZone) return
    this.inZone = inZone
    this.ensureShimmer()
    if (this.shimmer) {
      const ctx = this.engine.ctx
      this.shimmer.gain.gain.setTargetAtTime(inZone ? 0.03 : 0, ctx.currentTime, 0.4)
    }
  }

  ensureRumble() {
    if (this.rumble || !this.engine.ready) return
    const ctx = this.engine.ctx

    const source = ctx.createBufferSource()
    source.buffer = this.engine.getNoiseBuffer()
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 180

    const gain = ctx.createGain()
    gain.gain.value = 0

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.engine.master)
    source.start()

    this.rumble = { gain, source, filter }
  }

  setSurfState(state) {
    if (state === this.surfState) return
    this.surfState = state
    this.ensureRumble()
    if (!this.rumble) return

    const ctx = this.engine.ctx
    const target = state === 'surfing' ? 0.25 : state === 'approach' ? 0.08 : 0
    this.rumble.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.5)
  }

  dispose() {
    this.stopDrum()
    if (this.shimmer) {
      this.shimmer.oscA.stop()
      this.shimmer.oscB.stop()
      this.shimmer = null
    }
    if (this.rumble) {
      this.rumble.source.stop()
      this.rumble = null
    }
    this.engine.dispose()
  }
}
