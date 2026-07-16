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

class WaveSpawner {
  constructor(config = RACE_CONFIG.waves) {
    this.progressMarks = config.progressMarks
    this.nextMarkIndex = 0
  }

  update(progress) {
    const spawned = []
    while (
      this.nextMarkIndex < this.progressMarks.length &&
      progress >= this.progressMarks[this.nextMarkIndex]
    ) {
      spawned.push(this.progressMarks[this.nextMarkIndex])
      this.nextMarkIndex++
    }
    return spawned
  }

  reset() {
    this.nextMarkIndex = 0
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

  describe('wave spawning', () => {
    it('spawns no waves before the first progress mark', () => {
      const spawner = new WaveSpawner()
      const firstMark = RACE_CONFIG.waves.progressMarks[0]
      expect(spawner.update(firstMark - 0.01)).toEqual([])
    })

    it('spawns a wave exactly at each progress mark', () => {
      const spawner = new WaveSpawner()
      for (const mark of RACE_CONFIG.waves.progressMarks) {
        expect(spawner.update(mark)).toEqual([mark])
      }
    })

    it('spawns each wave only once', () => {
      const spawner = new WaveSpawner()
      const firstMark = RACE_CONFIG.waves.progressMarks[0]
      expect(spawner.update(firstMark)).toEqual([firstMark])
      expect(spawner.update(firstMark)).toEqual([])
    })

    it('spawns all remaining waves when progress jumps past several marks', () => {
      const spawner = new WaveSpawner()
      expect(spawner.update(1)).toEqual(RACE_CONFIG.waves.progressMarks)
      expect(spawner.update(1)).toEqual([])
    })

    it('spawns waves again after reset', () => {
      const spawner = new WaveSpawner()
      spawner.update(1)
      spawner.reset()
      expect(spawner.update(1)).toEqual(RACE_CONFIG.waves.progressMarks)
    })
  })

  describe('phase thresholds', () => {
    it('returns phase 0 just below 0.33, phase 1 at 0.33', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 0.329)
      expect(course.getPhase()).toBe(0)
      course.updateProgress(-RACE_CONFIG.courseLength * 0.33)
      expect(course.getPhase()).toBe(1)
    })

    it('returns phase 1 just below 0.67, phase 2 at 0.67', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength * 0.669)
      expect(course.getPhase()).toBe(1)
      course.updateProgress(-RACE_CONFIG.courseLength * 0.67)
      expect(course.getPhase()).toBe(2)
    })

    it('returns phase 2 at the finish', () => {
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength)
      expect(course.getPhase()).toBe(2)
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
      const course = new CourseProgress()
      course.updateProgress(-RACE_CONFIG.courseLength)
      expect(course.progress).toBe(1)
      expect(course.finished).toBe(true)
    })
  })
})
