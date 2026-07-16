import { describe, it, expect } from 'bun:test'
import { WORLD_LAYOUT } from '../../data/rooms.js'

function shouldRespawn(posY, killPlaneY) {
  return posY < killPlaneY
}

function respawnBody(pos, spawn) {
  return {
    translation: { ...spawn },
    linvel: { x: 0, y: 0, z: 0 },
    angvel: { x: 0, y: 0, z: 0 }
  }
}

describe('kill-plane respawn logic', () => {
  it('triggers respawn below killPlaneY', () => {
    expect(shouldRespawn(-11, WORLD_LAYOUT.killPlaneY)).toBe(true)
  })

  it('does not trigger respawn above killPlaneY', () => {
    expect(shouldRespawn(-9, WORLD_LAYOUT.killPlaneY)).toBe(false)
  })

  it('does not trigger at exactly killPlaneY', () => {
    expect(shouldRespawn(WORLD_LAYOUT.killPlaneY, WORLD_LAYOUT.killPlaneY)).toBe(false)
  })

  it('respawns to original spawn position', () => {
    const spawn = { x: 2, y: 5, z: 3 }
    const result = respawnBody({ x: 0, y: -15, z: 0 }, spawn)
    expect(result.translation).toEqual(spawn)
  })

  it('zeroes velocity on respawn', () => {
    const spawn = { x: 0, y: 5, z: 0 }
    const result = respawnBody({ x: 0, y: -15, z: 0 }, spawn)
    expect(result.linvel).toEqual({ x: 0, y: 0, z: 0 })
    expect(result.angvel).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('player spawn is above kill plane', () => {
    expect(WORLD_LAYOUT.playerSpawn.y).toBeGreaterThan(WORLD_LAYOUT.killPlaneY)
  })

  it('kill plane has sufficient margin below terrain', () => {
    expect(WORLD_LAYOUT.killPlaneY).toBeLessThan(-5)
  })
})
