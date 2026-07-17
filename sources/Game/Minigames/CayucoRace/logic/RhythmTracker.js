// Rolling BPM estimation from stroke timestamps. Pure logic — no three.js/DOM.
//
// Instant BPM = 60 / median(recent intervals); a per-stroke EMA smooths it.
// A gap longer than maxInterval means the player stopped — the interval
// window clears and the run restarts rather than averaging the stop in.

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export default class RhythmTracker {
  constructor({ windowSize = 4, smoothing = 0.35, maxInterval = 1.6, minInterval = 0.15 } = {}) {
    this.windowSize = windowSize
    this.smoothing = smoothing
    this.maxInterval = maxInterval
    this.minInterval = minInterval
    this.reset()
  }

  reset() {
    this.intervals = []
    this.lastStrokeTime = null
    this.lastSide = null
    this.strokeCount = 0
    this.smoothedBpm = 0
    this.displayBpm = 0
  }

  recordStroke(time, side) {
    const alternated = this.lastSide === null || side !== this.lastSide
    this.strokeCount += 1

    let instantBpm = 0
    if (this.lastStrokeTime !== null) {
      const gap = time - this.lastStrokeTime
      if (gap > this.maxInterval) {
        // A stop — restart the measurement run
        this.intervals = []
      } else {
        this.intervals.push(Math.max(gap, this.minInterval))
        if (this.intervals.length > this.windowSize) this.intervals.shift()
      }
    }

    if (this.intervals.length > 0) {
      instantBpm = 60 / median(this.intervals)
      if (this.smoothedBpm === 0) {
        this.smoothedBpm = instantBpm
      } else {
        this.smoothedBpm += this.smoothing * (instantBpm - this.smoothedBpm)
      }
    }

    this.displayBpm = this.smoothedBpm
    this.lastStrokeTime = time
    this.lastSide = side

    return { bpm: this.displayBpm, alternated, instantBpm }
  }

  // Per-frame: sag the reported BPM in real time while the player rests,
  // as if the next stroke were happening right now.
  update(time) {
    if (this.lastStrokeTime === null || this.smoothedBpm === 0) return

    const sinceLast = time - this.lastStrokeTime
    if (sinceLast > this.maxInterval) {
      this.intervals = []
      this.smoothedBpm = 0
      this.displayBpm = 0
      return
    }

    const expectedGap = 60 / this.smoothedBpm
    if (sinceLast > expectedGap) {
      this.displayBpm = Math.min(this.smoothedBpm, 60 / sinceLast)
    } else {
      this.displayBpm = this.smoothedBpm
    }
  }

  get bpm() {
    return this.displayBpm
  }
}
