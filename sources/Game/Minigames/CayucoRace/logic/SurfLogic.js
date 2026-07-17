// Per-swell surge-to-surf state machine. Pure logic — no three.js/DOM.
//
// approach → window (crest within catchHalfWidth) → surfing | done(missed).
// The catch requires the player's rolling BPM to sit in the surge zone
// while the crest is under the boat — anticipation, not a timing tap.

export default class SurfLogic {
  constructor(cfg = {}, surgeZone = [118, 148]) {
    this.cfg = {
      telegraphDistance: 30,
      catchHalfWidth: 3.0,
      surfDuration: 4.0,
      ...cfg
    }
    this.surgeZone = surgeZone
    this.state = 'approach'
    this.result = null
    this.surfTimeLeft = 0
  }

  // waveDistance = wave.z - boat.z (shrinks toward 0 as the crest arrives)
  update(dt, { waveDistance, bpm }) {
    switch (this.state) {
      case 'approach':
        if (Math.abs(waveDistance) <= this.cfg.catchHalfWidth) {
          this.state = 'window'
          this.checkCatch(bpm)
        } else if (waveDistance < -this.cfg.catchHalfWidth) {
          this.miss()
        }
        break
      case 'window':
        if (waveDistance < -this.cfg.catchHalfWidth) {
          this.miss()
        } else {
          this.checkCatch(bpm)
        }
        break
      case 'surfing':
        this.surfTimeLeft -= dt
        if (this.surfTimeLeft <= 0) {
          this.state = 'done'
        }
        break
      default:
        break
    }
    return this.state
  }

  checkCatch(bpm) {
    const [lo, hi] = this.surgeZone
    if (bpm >= lo && bpm <= hi) {
      this.state = 'surfing'
      this.result = 'caught'
      this.surfTimeLeft = this.cfg.surfDuration
    }
  }

  miss() {
    this.state = 'done'
    this.result = 'missed'
  }

  get telegraphActive() {
    return this.state === 'approach' || this.state === 'window'
  }

  get surfing() {
    return this.state === 'surfing'
  }

  get done() {
    return this.state === 'done'
  }
}
