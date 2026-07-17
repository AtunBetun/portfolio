import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'
import ActTrack from '../../sources/Game/Minigames/CayucoRace/logic/ActTrack.js'

class CourseProgress {
  constructor() {
    this.courseLength = RACE_CONFIG.courseLength
    this.progress = 0
    this.finished = false
  }

  updateProgress(boatZ) {
    this.progress = Math.min(1, Math.max(0, -boatZ / this.courseLength))
    if (this.progress >= 1.0) this.finished = true
  }

  reset() {
    this.progress = 0
    this.finished = false
  }
}

describe('CourseProgress', () => {
  describe('progress tracking', () => {
    it('starts with progress at 0', () => {
      const course = new CourseProgress()
      expect(course.progress).toBe(0)
    })

    it('reaches progress 1.0 when boatZ equals -courseLength', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength)
      expect(course.progress).toBe(1)
    })

    it('clamps progress to 0 for positive boatZ', () => {
      const course = new CourseProgress()
      course.updateProgress(50)
      expect(course.progress).toBe(0)
    })

    it('clamps progress to 1.0 for boatZ beyond -courseLength', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 2)
      expect(course.progress).toBe(1)
    })
  })

  describe('finish detection', () => {
    it('starts with finished flag false', () => {
      const course = new CourseProgress()
      expect(course.finished).toBe(false)
    })

    it('sets finished flag when progress reaches 1.0', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength)
      expect(course.finished).toBe(true)
    })

    it('keeps finished flag false before the finish line', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 0.99)
      expect(course.finished).toBe(false)
    })
  })

  describe('sea phases via acts', () => {
    it('is calm sea (phase 0) at the start', () => {
      const track = new ActTrack(RACE_CONFIG.acts)
      expect(track.getActAt(0).seaPhase).toBe(0)
    })

    it('builds (phase 1) in the wave act', () => {
      const track = new ActTrack(RACE_CONFIG.acts)
      const waves = RACE_CONFIG.acts.find((a) => a.id === 'waves')
      expect(track.getActAt((waves.start + waves.end) / 2).seaPhase).toBe(1)
    })

    it('is rough (phase 2) at the finish', () => {
      const track = new ActTrack(RACE_CONFIG.acts)
      expect(track.getActAt(1).seaPhase).toBe(2)
    })

    it('sea phases never regress along the course', () => {
      const track = new ActTrack(RACE_CONFIG.acts)
      let last = -1
      for (let p = 0; p <= 1; p += 0.01) {
        const phase = track.getActAt(p).seaPhase
        expect(phase).toBeGreaterThanOrEqual(last)
        last = phase
      }
    })
  })

  describe('surf schedule', () => {
    it('places all swells inside the wave act', () => {
      const waves = RACE_CONFIG.acts.find((a) => a.id === 'waves')
      for (const mark of waves.surf.schedule) {
        expect(mark).toBeGreaterThanOrEqual(waves.start)
        expect(mark).toBeLessThan(waves.end)
      }
    })

    it('spaces swells far enough apart to resolve each one', () => {
      const waves = RACE_CONFIG.acts.find((a) => a.id === 'waves')
      const schedule = waves.surf.schedule
      // A swell needs catch + surf time before the next one spawns;
      // ~0.05 progress at cruise speeds is roughly 5-6 seconds
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i] - schedule[i - 1]).toBeGreaterThanOrEqual(0.05)
      }
    })
  })

  describe('reset', () => {
    it('clears progress and finished flag', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength)
      expect(course.progress).toBe(1)
      expect(course.finished).toBe(true)
      course.reset()
      expect(course.progress).toBe(0)
      expect(course.finished).toBe(false)
    })
  })

  describe('medal thresholds', () => {
    it('gold time implies achievable average speed below maxSpeed', () => {
      const goldSpeed = RACE_CONFIG.courseLength / RACE_CONFIG.medals.gold
      expect(goldSpeed).toBeLessThan(RACE_CONFIG.maxSpeed)
      expect(goldSpeed).toBeGreaterThan(0)
    })
  })
})
