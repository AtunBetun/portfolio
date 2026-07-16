import { describe, it, expect } from 'bun:test'
import { WORLD_LAYOUT } from '../../data/rooms.js'

describe('world layout', () => {
  it('all zones have required fields', () => {
    for (const zone of WORLD_LAYOUT.zones) {
      expect(zone.id).toBeDefined()
      expect(zone.name).toBeDefined()
      expect(zone.position).toBeDefined()
      expect(zone.position.x).toBeDefined()
      expect(zone.position.z).toBeDefined()
      expect(zone.radius).toBeGreaterThan(0)
    }
  })

  it('has a hub zone at origin', () => {
    const hub = WORLD_LAYOUT.zones.find((z) => z.id === 'hub')
    expect(hub).toBeDefined()
    expect(hub.position.x).toBe(0)
    expect(hub.position.z).toBe(0)
  })

  it('no overlapping zones', () => {
    const zones = WORLD_LAYOUT.zones
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const a = zones[i]
        const b = zones[j]
        const dx = a.position.x - b.position.x
        const dz = a.position.z - b.position.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        const minDist = a.radius + b.radius
        expect(dist).toBeGreaterThanOrEqual(minDist * 0.8)
      }
    }
  })

  it('no duplicate zone IDs', () => {
    const ids = WORLD_LAYOUT.zones.map((z) => z.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('killPlaneY is negative', () => {
    expect(WORLD_LAYOUT.killPlaneY).toBeLessThan(0)
  })

  it('playerSpawn.y is positive', () => {
    expect(WORLD_LAYOUT.playerSpawn.y).toBeGreaterThan(0)
  })

  it('floorSize is 50', () => {
    expect(WORLD_LAYOUT.floorSize).toBe(50)
  })
})
