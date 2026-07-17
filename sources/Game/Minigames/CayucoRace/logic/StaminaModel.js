// Stamina drain/recovery for overpacing. Pure logic — no three.js/DOM.
//
// Sitting above the act's zone drains stamina (scaled by how far over);
// same-side spam takes an instant hit; recovery is faster at rest than
// in-zone. Fatigue uses hysteresis so presentation doesn't flicker.

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

export default class StaminaModel {
  constructor(cfg = {}) {
    this.cfg = {
      drainPerSecond: 0.12,
      overshootRef: 30,
      sameSideHit: 0.05,
      recoverPerSecond: 0.1,
      restRecoverPerSecond: 0.18,
      fatigueEnter: 0.25,
      fatigueExit: 0.45,
      minStrokeFactor: 0.45,
      ...cfg
    }
    this.reset()
  }

  reset() {
    this.value = 1
    this.fatigued = false
  }

  update(dt, bpm, [lo, hi]) {
    const c = this.cfg
    if (bpm > hi) {
      const overshoot = Math.min(Math.max((bpm - hi) / c.overshootRef, 0.25), 2)
      this.value -= c.drainPerSecond * overshoot * dt
    } else if (bpm >= lo) {
      this.value += c.recoverPerSecond * dt
    } else {
      this.value += c.restRecoverPerSecond * dt
    }
    this.value = Math.min(Math.max(this.value, 0), 1)

    if (!this.fatigued && this.value <= c.fatigueEnter) this.fatigued = true
    else if (this.fatigued && this.value >= c.fatigueExit) this.fatigued = false
  }

  onStroke({ alternated }) {
    if (!alternated) {
      this.value = Math.max(this.value - this.cfg.sameSideHit, 0)
      if (this.value <= this.cfg.fatigueEnter) this.fatigued = true
    }
  }

  // Impulse multiplier — full power above 50% stamina, degrading below
  strokeFactor() {
    return lerp(this.cfg.minStrokeFactor, 1, smoothstep(0, 0.5, this.value))
  }
}
