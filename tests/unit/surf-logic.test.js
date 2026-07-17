import { describe, it, expect } from 'bun:test'
import SurfLogic from '../../sources/Game/Minigames/CayucoRace/logic/SurfLogic.js'
import { RACE_CONFIG } from '../../data/race-config.js'

const SURGE = [118, 148]
const DT = 1 / 60

function makeSurf() {
  return new SurfLogic(RACE_CONFIG.surf, SURGE)
}

describe('SurfLogic', () => {
  it('starts in approach with telegraph active', () => {
    const surf = makeSurf()
    expect(surf.state).toBe('approach')
    expect(surf.telegraphActive).toBe(true)
  })

  it('enters window when crest is within catchHalfWidth', () => {
    const surf = makeSurf()
    surf.update(DT, { waveDistance: 20, bpm: 90 })
    expect(surf.state).toBe('approach')
    surf.update(DT, { waveDistance: 2, bpm: 90 })
    expect(surf.state).toBe('window')
  })

  it('catches only when bpm is in the surge zone during the window', () => {
    const slow = makeSurf()
    slow.update(DT, { waveDistance: 2, bpm: 90 })
    expect(slow.state).toBe('window')

    const surging = makeSurf()
    surging.update(DT, { waveDistance: 2, bpm: 130 })
    expect(surging.state).toBe('surfing')
    expect(surging.result).toBe('caught')
  })

  it('catches if the player surges mid-window', () => {
    const surf = makeSurf()
    surf.update(DT, { waveDistance: 2, bpm: 90 })
    surf.update(DT, { waveDistance: 0, bpm: 125 })
    expect(surf.state).toBe('surfing')
  })

  it('misses when the crest passes without a surge', () => {
    const surf = makeSurf()
    surf.update(DT, { waveDistance: 2, bpm: 90 })
    surf.update(DT, { waveDistance: -4, bpm: 90 })
    expect(surf.state).toBe('done')
    expect(surf.result).toBe('missed')
    expect(surf.telegraphActive).toBe(false)
  })

  it('surfing ends after surfDuration', () => {
    const surf = makeSurf()
    surf.update(DT, { waveDistance: 0, bpm: 130 })
    expect(surf.surfing).toBe(true)

    let elapsed = 0
    while (surf.surfing && elapsed < 10) {
      surf.update(DT, { waveDistance: -10, bpm: 90 })
      elapsed += DT
    }
    expect(surf.done).toBe(true)
    expect(surf.result).toBe('caught')
    expect(elapsed).toBeGreaterThan(RACE_CONFIG.surf.surfDuration - 0.1)
    expect(elapsed).toBeLessThan(RACE_CONFIG.surf.surfDuration + 0.1)
  })

  it('does not double-catch or revive after done', () => {
    const surf = makeSurf()
    surf.update(DT, { waveDistance: 2, bpm: 90 })
    surf.update(DT, { waveDistance: -5, bpm: 130 })
    expect(surf.state).toBe('done')
    surf.update(DT, { waveDistance: 0, bpm: 130 })
    expect(surf.state).toBe('done')
    expect(surf.result).toBe('missed')
  })
})
