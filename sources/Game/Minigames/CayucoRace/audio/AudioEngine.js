// Generic WebAudio core: lazy context, autoplay-safe unlock, master gain,
// mute persistence, shared noise buffer. All voices hang off this.

const MUTE_KEY = 'cayuco-muted'

export default class AudioEngine {
  constructor() {
    this.context = null
    this.masterGain = null
    this.noiseBuffer = null
    this.muted = false
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === 'true'
    } catch {
      // storage unavailable — default to unmuted
    }
  }

  // Safe to call from every input handler — creates/resumes at most once.
  unlock() {
    if (!this.context) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      this.context = new Ctx()
      this.masterGain = this.context.createGain()
      this.masterGain.gain.value = this.muted ? 0 : 1
      this.masterGain.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {})
    }
  }

  get ready() {
    return this.context !== null && this.context.state === 'running'
  }

  get ctx() {
    return this.context
  }

  get master() {
    return this.masterGain
  }

  setMuted(muted) {
    this.muted = muted
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.02)
    }
    try {
      localStorage.setItem(MUTE_KEY, String(muted))
    } catch {
      // storage unavailable — mute state just won't persist
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted)
    return this.muted
  }

  getNoiseBuffer(seconds = 1) {
    if (!this.context) return null
    if (!this.noiseBuffer) {
      const length = Math.floor(this.context.sampleRate * seconds)
      this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1
      }
    }
    return this.noiseBuffer
  }

  dispose() {
    if (this.context) {
      this.context.close().catch(() => {})
      this.context = null
      this.masterGain = null
      this.noiseBuffer = null
    }
  }
}
