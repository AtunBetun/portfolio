import { describe, it, expect } from 'bun:test'
import { RACE_CONFIG } from '../../data/race-config.js'

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

class FlowState {
  constructor(config = RACE_CONFIG.flow) {
    this.config = config
    this.flow = 0
    this.lastSide = null
  }

  onStroke(interval, side = null) {
    const [min, max] = this.config.band
    const alternated = this.lastSide !== null && side !== this.lastSide
    if (alternated && interval >= min && interval <= max) {
      this.flow = Math.min(1, this.flow + this.config.gain)
    } else if (interval > max) {
      this.flow = Math.max(0, this.flow - this.config.loss)
    }
    this.lastSide = side
  }

  flowMultiplier() {
    return 1 + this.flow * this.config.maxBonus
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

describe('FlowState', () => {
  const { band, gain, loss, maxBonus } = RACE_CONFIG.flow
  const inBandInterval = (band[0] + band[1]) / 2
  const outOfBandInterval = band[1] + 0.5

  it('starts at 0 flow', () => {
    const flow = new FlowState()
    expect(flow.flow).toBe(0)
  })

  it('increases flow for alternating strokes within the cadence band', () => {
    const flow = new FlowState()
    flow.onStroke(inBandInterval, 'left')
    flow.onStroke(inBandInterval, 'right')
    expect(flow.flow).toBeCloseTo(gain)
  })

  it('does not change flow for same-side strokes within band', () => {
    const flow = new FlowState()
    flow.onStroke(inBandInterval, 'left')
    flow.onStroke(inBandInterval, 'left')
    expect(flow.flow).toBe(0)
  })

  it('decreases flow for strokes too slow (outside band max)', () => {
    const flow = new FlowState()
    flow.onStroke(inBandInterval, 'left')
    flow.onStroke(inBandInterval, 'right')
    const before = flow.flow
    flow.onStroke(outOfBandInterval, 'left')
    expect(flow.flow).toBeCloseTo(Math.max(0, before - loss))
  })

  it('clamps flow to a maximum of 1', () => {
    const flow = new FlowState()
    const sides = ['left', 'right']
    for (let i = 0; i < 100; i++) flow.onStroke(inBandInterval, sides[i % 2])
    expect(flow.flow).toBe(1)
  })

  it('clamps flow to a minimum of 0', () => {
    const flow = new FlowState()
    for (let i = 0; i < 100; i++) flow.onStroke(outOfBandInterval, 'left')
    expect(flow.flow).toBe(0)
  })

  it('computes flowMultiplier as 1 + flow * maxBonus', () => {
    const flow = new FlowState()
    expect(flow.flowMultiplier()).toBe(1)
    flow.onStroke(inBandInterval, 'left')
    flow.onStroke(inBandInterval, 'right')
    expect(flow.flowMultiplier()).toBeCloseTo(1 + gain * maxBonus)
    const sides = ['left', 'right']
    for (let i = 0; i < 100; i++) flow.onStroke(inBandInterval, sides[i % 2])
    expect(flow.flowMultiplier()).toBeCloseTo(1 + maxBonus)
  })
})
