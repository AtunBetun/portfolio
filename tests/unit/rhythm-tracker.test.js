import { describe, it, expect } from 'bun:test'
import RhythmTracker from '../../sources/Game/Minigames/CayucoRace/logic/RhythmTracker.js'

describe('RhythmTracker', () => {
  it('reads 0 BPM before the second stroke', () => {
    const tracker = new RhythmTracker()
    expect(tracker.bpm).toBe(0)
    tracker.recordStroke(0, 'left')
    expect(tracker.bpm).toBe(0)
  })

  it('converges to 150 BPM for steady 0.4s alternating strokes', () => {
    const tracker = new RhythmTracker()
    const sides = ['left', 'right']
    for (let i = 0; i < 12; i++) {
      tracker.recordStroke(i * 0.4, sides[i % 2])
    }
    expect(tracker.bpm).toBeGreaterThan(140)
    expect(tracker.bpm).toBeLessThan(160)
  })

  it('median rejects a single flubbed interval', () => {
    const tracker = new RhythmTracker()
    const sides = ['left', 'right']
    let t = 0
    for (let i = 0; i < 8; i++) {
      tracker.recordStroke(t, sides[i % 2])
      t += 0.5 // 120 BPM
    }
    const before = tracker.bpm
    // One rushed stroke (0.2s gap) then back to 0.5s
    tracker.recordStroke(t + 0.2, 'left')
    tracker.recordStroke(t + 0.7, 'right')
    // Median of window still ~0.5 so BPM stays near 120
    expect(Math.abs(tracker.bpm - before)).toBeLessThan(15)
  })

  it('clears the window after a stop longer than maxInterval', () => {
    const tracker = new RhythmTracker({ maxInterval: 1.6 })
    tracker.recordStroke(0, 'left')
    tracker.recordStroke(0.5, 'right')
    tracker.recordStroke(1.0, 'left')
    expect(tracker.bpm).toBeGreaterThan(0)
    // Long pause — the next stroke starts a fresh run with no intervals
    const { instantBpm } = tracker.recordStroke(5.0, 'right')
    expect(instantBpm).toBe(0)
  })

  it('sags the displayed BPM while the player rests', () => {
    const tracker = new RhythmTracker()
    const sides = ['left', 'right']
    for (let i = 0; i < 6; i++) tracker.recordStroke(i * 0.5, sides[i % 2])
    const active = tracker.bpm
    // A frame update 1.2s after the last stroke: 60/1.2 = 50 BPM ceiling
    tracker.update(2.5 + 1.2)
    expect(tracker.bpm).toBeLessThan(active)
    expect(tracker.bpm).toBeLessThanOrEqual(60 / 1.2 + 0.001)
  })

  it('drops to 0 BPM after resting past maxInterval', () => {
    const tracker = new RhythmTracker({ maxInterval: 1.6 })
    tracker.recordStroke(0, 'left')
    tracker.recordStroke(0.5, 'right')
    tracker.update(0.5 + 2.0)
    expect(tracker.bpm).toBe(0)
  })

  it('flags alternation correctly', () => {
    const tracker = new RhythmTracker()
    expect(tracker.recordStroke(0, 'left').alternated).toBe(true) // first stroke counts
    expect(tracker.recordStroke(0.4, 'right').alternated).toBe(true)
    expect(tracker.recordStroke(0.8, 'right').alternated).toBe(false)
  })

  it('reset returns to initial state', () => {
    const tracker = new RhythmTracker()
    tracker.recordStroke(0, 'left')
    tracker.recordStroke(0.4, 'right')
    tracker.reset()
    expect(tracker.bpm).toBe(0)
    expect(tracker.strokeCount).toBe(0)
  })
})
