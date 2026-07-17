// The tuning harness: scripted players run the REAL formulas (tracker,
// efficiency, stamina, surf, act-scaled impulse/drag) at 60 Hz. These tests
// pin courseLength / impulseMult / medals numerically — if tuning constants
// change, the assertions here say whether the race still lands near 90 s.

import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'
import RhythmTracker from '../../sources/Game/Minigames/CayucoRace/logic/RhythmTracker.js'
import { efficiency, rampFactor } from '../../sources/Game/Minigames/CayucoRace/logic/PaddleModel.js'
import StaminaModel from '../../sources/Game/Minigames/CayucoRace/logic/StaminaModel.js'
import ActTrack from '../../sources/Game/Minigames/CayucoRace/logic/ActTrack.js'

const DT = 1 / 60
const MAX_SIM_TIME = 300

// bpmFor(act) decides the stroke tempo the scripted player holds per act.
// catchesWaves grants the surf speed boost for surfDuration per scheduled swell.
// holdDuty is the fraction of the stroke period the player holds the paddle
// down; neverRelease models a player who just mashes the key and holds forever.
function simulateRace({ bpmFor, catchesWaves, holdDuty = 0.6, neverRelease = false }) {
  const cfg = RACE_CONFIG
  const s = cfg.stroke
  const tracker = new RhythmTracker(cfg.rhythm)
  const stamina = new StaminaModel(cfg.stamina)
  const actTrack = new ActTrack(cfg.acts)

  let time = 0
  let z = 0
  let speed = 0
  let side = 'left'
  let nextCatchAt = 0
  let nextSurfIndex = 0
  let surfTimeLeft = 0
  let wavesCaught = 0

  // Hold-based stroke state
  let holding = false
  let holdT = 0
  let holdFor = 0
  let mult = 0

  while (z > -cfg.courseLength && time < MAX_SIM_TIME) {
    const progress = Math.min(-z / cfg.courseLength, 1)
    const { act } = actTrack.update(progress)

    // Surf: when a scheduled swell arrives and the player catches it,
    // the wave carries the boat for surfDuration
    if (
      catchesWaves &&
      act.surf &&
      nextSurfIndex < act.surf.schedule.length &&
      progress >= act.surf.schedule[nextSurfIndex]
    ) {
      nextSurfIndex += 1
      surfTimeLeft = cfg.surf.surfDuration
      wavesCaught += 1
    }

    const surfing = surfTimeLeft > 0

    tracker.update(time)
    stamina.update(DT, tracker.bpm, act.bpmZone)

    // Catch — plant the paddle at the scripted tempo, sample power once
    if (!holding && time >= nextCatchAt) {
      const targetBpm = bpmFor(act, surfing)
      const period = 60 / targetBpm
      const { alternated } = tracker.recordStroke(time, side)
      stamina.onStroke({ alternated })
      side = side === 'left' ? 'right' : 'left'
      nextCatchAt = time + period

      const graced = tracker.strokeCount <= cfg.rhythm.graceStrokes
      const eff = graced ? 1 : efficiency(tracker.bpm, act.bpmZone, cfg.rhythm)
      mult = act.impulseMult * eff * stamina.strokeFactor()

      speed += s.biteImpulse * mult
      holdFor = neverRelease
        ? Infinity
        : Math.max(s.rampTime, Math.min(holdDuty * period, s.stallStart))
      holdT = 0
      holding = true
    }

    // Drive — thrust while held, then release (clean bonus inside the window)
    if (holding) {
      speed += s.thrustPerSec * rampFactor(holdT, s) * mult * DT
      holdT += DT
      if (holdT >= holdFor || holdT >= s.maxHold) {
        holding = false
        if (holdT >= s.cleanWindow[0] && holdT <= s.cleanWindow[1]) {
          speed += s.cleanBonus * mult
        }
      }
    }
    speed = Math.min(speed, surfing ? cfg.surf.surfMaxSpeed : cfg.maxSpeed)

    if (surfing) {
      surfTimeLeft -= DT
      // THREE.MathUtils.damp equivalent: exp decay toward surfSpeed
      const t = 1 - Math.exp(-cfg.surf.damp * DT)
      speed += (cfg.surf.surfSpeed - speed) * t
      speed = Math.min(Math.max(speed, 0), cfg.surf.surfMaxSpeed)
    } else {
      speed *= Math.pow(0.5, DT / (cfg.dragHalfLife * act.dragMult))
      speed = Math.min(Math.max(speed, 0), cfg.maxSpeed)
    }

    z -= speed * DT
    time += DT
  }

  return { time, wavesCaught, stamina: stamina.value }
}

describe('race pace simulation', () => {
  it('a perfect player finishes near 2 minutes and earns gold', () => {
    const result = simulateRace({
      bpmFor: (act, surfing) => {
        if (surfing) return (act.bpmZone[0] + act.bpmZone[1]) / 2
        if (act.surf) {
          // In the wave act, live near the top of cruise so surges are quick
          return act.bpmZone[1] - 4
        }
        return (act.bpmZone[0] + act.bpmZone[1]) / 2
      },
      catchesWaves: true
    })

    expect(result.wavesCaught).toBe(3)
    expect(result.time).toBeGreaterThan(105)
    expect(result.time).toBeLessThan(125)
    expect(result.time).toBeLessThanOrEqual(RACE_CONFIG.medals.gold)
  })

  it('a player who never releases (mashes and holds) is far slower — the stall bites', () => {
    const perfect = simulateRace({
      bpmFor: (act) => (act.bpmZone[0] + act.bpmZone[1]) / 2,
      catchesWaves: false
    })
    const holder = simulateRace({
      bpmFor: (act) => (act.bpmZone[0] + act.bpmZone[1]) / 2,
      catchesWaves: false,
      neverRelease: true
    })

    expect(holder.time).toBeGreaterThan(perfect.time * 1.3)
  })

  it('a sloppy player (wobbling tempo, misses waves) lands between gold and bronze', () => {
    // Oscillates ±28 BPM around zone center — drifting in and out of the
    // zone the way a real unfocused player does
    let stroke = 0
    const result = simulateRace({
      bpmFor: (act) => {
        stroke += 1
        const center = (act.bpmZone[0] + act.bpmZone[1]) / 2
        return center + Math.sin(stroke * 0.35) * 28
      },
      catchesWaves: false
    })

    expect(result.time).toBeGreaterThan(RACE_CONFIG.medals.gold)
    expect(result.time).toBeLessThanOrEqual(RACE_CONFIG.medals.bronze)
  })

  it('sustained overpacing collapses — far slower than holding the zone', () => {
    const perfect = simulateRace({
      bpmFor: (act) => (act.bpmZone[0] + act.bpmZone[1]) / 2,
      catchesWaves: false
    })
    const overpacer = simulateRace({
      bpmFor: (act) => act.bpmZone[1] + 20,
      catchesWaves: false
    })
    const masher = simulateRace({
      bpmFor: () => 200,
      catchesWaves: false
    })

    expect(overpacer.time).toBeGreaterThan(perfect.time * 1.5)
    expect(masher.time).toBeGreaterThan(perfect.time * 1.5)
  })

  it('catching waves is meaningfully faster than skipping them', () => {
    const zoneBpm = (act, surfing) =>
      surfing || !act.surf ? (act.bpmZone[0] + act.bpmZone[1]) / 2 : act.bpmZone[1] - 4
    const withWaves = simulateRace({ bpmFor: zoneBpm, catchesWaves: true })
    const withoutWaves = simulateRace({ bpmFor: zoneBpm, catchesWaves: false })

    expect(withoutWaves.time - withWaves.time).toBeGreaterThan(4)
  })
})
