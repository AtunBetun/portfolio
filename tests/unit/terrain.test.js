import { describe, it, expect } from 'bun:test'
import { TERRAIN, terrainHeight, buildHeightGrid, sampleHeight } from '../../data/terrain.js'

describe('terrain height function', () => {
  it('plateau center is exactly 0', () => {
    expect(terrainHeight(0, 0)).toBe(0)
  })

  it('entire plateau (r < 10) is flat at y=0', () => {
    const points = [
      [0, 0],
      [5, 0],
      [0, 5],
      [-5, -5],
      [7, 7],
      [-9, 0],
      [0, -9]
    ]
    for (const [x, z] of points) {
      if (Math.hypot(x, z) < TERRAIN.plateauR) {
        expect(terrainHeight(x, z)).toBeCloseTo(0, 5)
      }
    }
  })

  it('rim saturation reaches sea floor', () => {
    expect(terrainHeight(25, 0)).toBeCloseTo(TERRAIN.seaFloorY, 1)
    expect(terrainHeight(0, 25)).toBeCloseTo(TERRAIN.seaFloorY, 1)
    expect(terrainHeight(-25, 0)).toBeCloseTo(TERRAIN.seaFloorY, 1)
  })

  it('headland summit is near TERRAIN.head.H', () => {
    const summit = terrainHeight(TERRAIN.head.x, TERRAIN.head.z)
    expect(summit).toBeGreaterThan(2.5)
    expect(summit).toBeLessThanOrEqual(TERRAIN.head.H)
  })

  it('max walkable slope (r < 22.5) is less than 50 degrees', () => {
    const step = 0.1
    const halfSize = TERRAIN.size / 2
    let maxSlope = 0

    for (let x = -halfSize; x < halfSize; x += step) {
      for (let z = -halfSize; z < halfSize; z += step) {
        if (Math.hypot(x, z) > TERRAIN.rimStart) continue
        const h = terrainHeight(x, z)
        const hx = terrainHeight(x + step, z)
        const hz = terrainHeight(x, z + step)
        const dx = (hx - h) / step
        const dz = (hz - h) / step
        const slope = Math.atan(Math.sqrt(dx * dx + dz * dz))
        if (slope > maxSlope) maxSlope = slope
      }
    }

    expect(maxSlope).toBeLessThan((50 * Math.PI) / 180)
  })

  it('buildHeightGrid has correct length', () => {
    const grid = buildHeightGrid()
    expect(grid.length).toBe(65 * 65)
  })

  it('sampleHeight agrees with terrainHeight at grid points', () => {
    const grid = buildHeightGrid()
    const { size, res } = TERRAIN
    for (let col = 0; col <= res; col += 16) {
      for (let row = 0; row <= res; row += 16) {
        const x = (col / res - 0.5) * size
        const z = (row / res - 0.5) * size
        const sampled = sampleHeight(grid, x, z)
        const expected = terrainHeight(x, z)
        expect(Math.abs(sampled - expected)).toBeLessThan(1e-5)
      }
    }
  })
})
