// Stroke efficiency vs. the act's tempo zone. Pure logic — no three.js/DOM.
//
// Flat 1.0 plateau inside [lo, hi]. Below the zone: Gaussian shoulder (gentle
// approach as you speed up). Above the zone: exponential decay — its non-zero
// slope right at the edge is what makes bpm × efficiency(bpm) peak INSIDE the
// zone, so mashing never out-runs pacing (unit-tested per act).

// Blade grip over hold time: quick ramp to full grip, plateau, then stall.
// Used by the controller (per-frame thrust) and Boat (visual sweep rate).
export function rampFactor(t, { rampTime = 0.15, stallStart = 0.6, stallTau = 0.25 } = {}) {
  if (t < rampTime) return t / rampTime
  if (t <= stallStart) return 1
  return Math.exp(-(t - stallStart) / stallTau)
}

export function efficiency(bpm, [lo, hi], { falloffLow = 25, falloffHigh = 16, floor = 0.35 } = {}) {
  if (bpm <= 0) return 1
  if (bpm >= lo && bpm <= hi) return 1
  if (bpm < lo) {
    const d = (lo - bpm) / falloffLow
    return floor + (1 - floor) * Math.exp(-d * d)
  }
  const d = (bpm - hi) / falloffHigh
  return floor + (1 - floor) * Math.exp(-d)
}
