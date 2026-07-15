import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'

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

  getPhase() {
    if (this.progress < 0.33) return 0
    if (this.progress < 0.67) return 1
    return 2
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

  describe('phases', () => {
    it('is phase 0 (calm) at start', () => {
      const course = new CourseProgress()
      course.updateProgress(0)
      expect(course.getPhase()).toBe(0)
    })

    it('is phase 1 (building) at mid-course', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 0.5)
      expect(course.getPhase()).toBe(1)
    })

    it('is phase 2 (rough) near the end', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 0.9)
      expect(course.getPhase()).toBe(2)
    })

    it('transitions from phase 0 to 1 at progress 0.33', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 0.32)
      expect(course.getPhase()).toBe(0)
      course.updateProgress(-RACE_CONFIG.courseLength * 0.33)
      expect(course.getPhase()).toBe(1)
    })

    it('transitions from phase 1 to 2 at progress 0.67', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 0.66)
      expect(course.getPhase()).toBe(1)
      course.updateProgress(-RACE_CONFIG.courseLength * 0.67)
      expect(course.getPhase()).toBe(2)
    })
  })

  describe('speed modifiers', () => {
    it('increases effective position change with perfect boost', () => {
      const base = new CourseProgress()
      const boosted = new CourseProgress()
      const dt = 1
      const baseDelta = RACE_CONFIG.paddleBaseSpeed * dt
      const boostedDelta = RACE_CONFIG.paddleBaseSpeed * RACE_CONFIG.perfectBoost * dt
      base.updateProgress(-baseDelta)
      boosted.updateProgress(-boostedDelta)
      expect(boostedDelta).toBeGreaterThan(baseDelta)
      expect(boosted.progress).toBeGreaterThan(base.progress)
    })

    it('reduces effective position change with bad timing penalty', () => {
      const base = new CourseProgress()
      const penalized = new CourseProgress()
      const dt = 1
      const baseDelta = RACE_CONFIG.paddleBaseSpeed * dt
      const penalizedDelta = RACE_CONFIG.paddleBaseSpeed * RACE_CONFIG.badPenalty * dt
      base.updateProgress(-baseDelta)
      penalized.updateProgress(-penalizedDelta)
      expect(penalizedDelta).toBeLessThan(baseDelta)
      expect(penalized.progress).toBeLessThan(base.progress)
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
    it('gold time implies average speed of courseLength / gold seconds', () => {
      const goldSpeed = RACE_CONFIG.courseLength / RACE_CONFIG.medals.gold
      expect(RACE_CONFIG.medals.gold).toBe(28)
      expect(goldSpeed).toBeCloseTo(RACE_CONFIG.courseLength / 28)
      const course = new CourseProgress()
      course.updateProgress(-goldSpeed * RACE_CONFIG.medals.gold)
      expect(course.progress).toBe(1)
      expect(course.finished).toBe(true)
    })
  })
})
