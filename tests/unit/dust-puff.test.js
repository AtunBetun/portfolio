import { describe, it, expect } from 'bun:test'

const POOL_SIZE = 6
const LIFETIME = 0.35

function createPool() {
  return Array.from({ length: POOL_SIZE }, () => ({
    active: false,
    age: 0,
    opacity: 0.7,
    scale: 0.3,
    visible: false
  }))
}

function spawn(pool, data) {
  const puff = pool.find((p) => !p.active)
  if (!puff) return false
  puff.scale = 0.3
  puff.opacity = 0.7
  puff.visible = true
  puff.active = true
  puff.age = 0
  return true
}

function update(pool, delta) {
  for (const puff of pool) {
    if (!puff.active) continue
    puff.age += delta
    const t = puff.age / LIFETIME
    if (t >= 1) {
      puff.visible = false
      puff.active = false
      continue
    }
    puff.scale = 0.3 + (1.2 - 0.3) * t
    puff.opacity = 0.7 * (1 - t)
  }
}

describe('DustPuff pool lifecycle', () => {
  it('starts with all puffs inactive', () => {
    const pool = createPool()
    expect(pool.every((p) => !p.active)).toBe(true)
    expect(pool.every((p) => !p.visible)).toBe(true)
  })

  it('spawn activates one puff', () => {
    const pool = createPool()
    spawn(pool, { position: { x: 0, y: 0, z: 0 } })
    expect(pool.filter((p) => p.active).length).toBe(1)
    expect(pool[0].visible).toBe(true)
  })

  it('can spawn up to POOL_SIZE puffs', () => {
    const pool = createPool()
    for (let i = 0; i < POOL_SIZE; i++) {
      expect(spawn(pool, {})).toBe(true)
    }
    expect(pool.filter((p) => p.active).length).toBe(POOL_SIZE)
  })

  it('returns false when pool is exhausted', () => {
    const pool = createPool()
    for (let i = 0; i < POOL_SIZE; i++) spawn(pool, {})
    expect(spawn(pool, {})).toBe(false)
  })

  it('puff deactivates after LIFETIME', () => {
    const pool = createPool()
    spawn(pool, {})
    update(pool, LIFETIME)
    expect(pool[0].active).toBe(false)
    expect(pool[0].visible).toBe(false)
  })

  it('puff grows from 0.3 to 1.2 scale over lifetime', () => {
    const pool = createPool()
    spawn(pool, {})
    update(pool, LIFETIME * 0.5)
    expect(pool[0].scale).toBeCloseTo(0.3 + (1.2 - 0.3) * 0.5)
  })

  it('puff fades from 0.7 to 0 opacity over lifetime', () => {
    const pool = createPool()
    spawn(pool, {})
    update(pool, LIFETIME * 0.5)
    expect(pool[0].opacity).toBeCloseTo(0.7 * 0.5)
  })

  it('deactivated puff can be reused', () => {
    const pool = createPool()
    spawn(pool, {})
    update(pool, LIFETIME)
    expect(pool[0].active).toBe(false)
    spawn(pool, {})
    expect(pool[0].active).toBe(true)
    expect(pool[0].age).toBe(0)
  })

  it('multiple simultaneous puffs update independently', () => {
    const pool = createPool()
    spawn(pool, {})
    update(pool, LIFETIME * 0.25)
    spawn(pool, {})
    update(pool, LIFETIME * 0.25)

    expect(pool[0].age).toBeCloseTo(LIFETIME * 0.5)
    expect(pool[1].age).toBeCloseTo(LIFETIME * 0.25)
  })
})
