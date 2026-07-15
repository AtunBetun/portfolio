import { describe, it, expect } from 'bun:test'

const VALID_TRANSITIONS = {
  idle: ['countdown'],
  countdown: ['racing'],
  racing: ['results'],
  results: ['countdown', 'idle']
}

class RaceStateMachine {
  constructor() {
    this.state = 'idle'
    this.paddleEnabled = false
    this.countdownSkippable = false
  }

  transition(to) {
    if (!VALID_TRANSITIONS[this.state]?.includes(to)) return false
    this.state = to
    this.paddleEnabled = to === 'racing'
    return true
  }

  canPaddle() {
    return this.paddleEnabled
  }

  reset() {
    this.state = 'idle'
    this.paddleEnabled = false
  }
}

describe('RaceStateMachine', () => {
  describe('initial state', () => {
    it('starts in idle', () => {
      const sm = new RaceStateMachine()
      expect(sm.state).toBe('idle')
    })
  })

  describe('valid transitions', () => {
    it('transitions idle -> countdown', () => {
      const sm = new RaceStateMachine()
      expect(sm.transition('countdown')).toBe(true)
      expect(sm.state).toBe('countdown')
    })

    it('transitions countdown -> racing', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      expect(sm.transition('racing')).toBe(true)
      expect(sm.state).toBe('racing')
    })

    it('transitions racing -> results', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      sm.transition('racing')
      expect(sm.transition('results')).toBe(true)
      expect(sm.state).toBe('results')
    })

    it('transitions results -> countdown (retry)', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      sm.transition('racing')
      sm.transition('results')
      expect(sm.transition('countdown')).toBe(true)
      expect(sm.state).toBe('countdown')
    })

    it('transitions results -> idle (exit)', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      sm.transition('racing')
      sm.transition('results')
      expect(sm.transition('idle')).toBe(true)
      expect(sm.state).toBe('idle')
    })
  })

  describe('invalid transitions', () => {
    it('cannot transition idle -> racing (must go through countdown)', () => {
      const sm = new RaceStateMachine()
      expect(sm.transition('racing')).toBe(false)
      expect(sm.state).toBe('idle')
    })

    it('cannot transition countdown -> results (must go through racing)', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      expect(sm.transition('results')).toBe(false)
      expect(sm.state).toBe('countdown')
    })
  })

  describe('paddle gating', () => {
    it('cannot paddle during idle', () => {
      const sm = new RaceStateMachine()
      expect(sm.canPaddle()).toBe(false)
    })

    it('cannot paddle during countdown', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      expect(sm.canPaddle()).toBe(false)
    })

    it('can paddle during racing', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      sm.transition('racing')
      expect(sm.canPaddle()).toBe(true)
    })

    it('cannot paddle during results', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      sm.transition('racing')
      sm.transition('results')
      expect(sm.canPaddle()).toBe(false)
    })
  })

  describe('retry and reset', () => {
    it('retry from results returns to countdown with paddling disabled', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      sm.transition('racing')
      sm.transition('results')
      sm.transition('countdown')
      expect(sm.state).toBe('countdown')
      expect(sm.canPaddle()).toBe(false)
    })

    it('reset returns to idle state', () => {
      const sm = new RaceStateMachine()
      sm.transition('countdown')
      sm.transition('racing')
      sm.reset()
      expect(sm.state).toBe('idle')
      expect(sm.canPaddle()).toBe(false)
    })
  })
})
