import { describe, it, expect } from 'bun:test'
import ActTrack, { validateActs } from '../../sources/Game/Minigames/CayucoRace/logic/ActTrack.js'
import { RACE_CONFIG } from '../../data/race-config.js'

describe('validateActs', () => {
  it('accepts the configured acts', () => {
    expect(validateActs(RACE_CONFIG.acts)).toBe(true)
  })

  it('rejects a gap between acts', () => {
    const acts = [
      { id: 'a', start: 0, end: 0.4, bpmZone: [80, 100] },
      { id: 'b', start: 0.5, end: 1, bpmZone: [80, 100] }
    ]
    expect(() => validateActs(acts)).toThrow(/gap or overlap/)
  })

  it('rejects an overlap between acts', () => {
    const acts = [
      { id: 'a', start: 0, end: 0.6, bpmZone: [80, 100] },
      { id: 'b', start: 0.5, end: 1, bpmZone: [80, 100] }
    ]
    expect(() => validateActs(acts)).toThrow(/gap or overlap/)
  })

  it('rejects acts not covering 0 to 1', () => {
    expect(() =>
      validateActs([{ id: 'a', start: 0.1, end: 1, bpmZone: [80, 100] }])
    ).toThrow(/start at 0/)
    expect(() =>
      validateActs([{ id: 'a', start: 0, end: 0.9, bpmZone: [80, 100] }])
    ).toThrow(/end at 1/)
  })

  it('rejects inverted bpm zones', () => {
    expect(() =>
      validateActs([{ id: 'a', start: 0, end: 1, bpmZone: [100, 80] }])
    ).toThrow(/inverted bpmZone/)
  })

  it('rejects surf marks outside their act', () => {
    const acts = [
      { id: 'a', start: 0, end: 0.5, bpmZone: [80, 100], surf: { schedule: [0.6], surgeZone: [110, 140] } },
      { id: 'b', start: 0.5, end: 1, bpmZone: [80, 100] }
    ]
    expect(() => validateActs(acts)).toThrow(/surf mark/)
  })
})

describe('ActTrack', () => {
  it('resolves boundary progress to the later act', () => {
    const track = new ActTrack(RACE_CONFIG.acts)
    expect(track.getActAt(0).id).toBe('launch')
    expect(track.getActAt(0.15).id).toBe('cruise')
    expect(track.getActAt(0.149).id).toBe('launch')
    expect(track.getActAt(1).id).toBe('sprint')
  })

  it('fires changed exactly once per transition', () => {
    const track = new ActTrack(RACE_CONFIG.acts)
    expect(track.update(0.05).changed).toBe(false) // still in launch (initial)
    expect(track.update(0.16).changed).toBe(true) // into cruise
    expect(track.update(0.2).changed).toBe(false)
    expect(track.update(0.41).changed).toBe(true) // into waves
  })

  it('reset returns to the first act', () => {
    const track = new ActTrack(RACE_CONFIG.acts)
    track.update(0.9)
    track.reset()
    expect(track.current.id).toBe('launch')
  })
})
