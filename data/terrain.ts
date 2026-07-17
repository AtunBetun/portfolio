export interface TerrainConfig {
  size: number
  res: number
  heightScale: number
  plateauR: number
  hillsIn: number
  hillsInFull: number
  hillsOutStart: number
  hillsOut: number
  beachStart: number
  beachEnd: number
  beachDrop: number
  rimStart: number
  rimEnd: number
  seaFloorY: number
  waterY: number
  head: { x: number; z: number; R: number; H: number }
  canal: { halfWidth: number; edgeSmooth: number; bedY: number; zEnd: number }
}

export const TERRAIN: TerrainConfig = {
  size: 50,
  res: 64,
  heightScale: 1,
  plateauR: 10,
  hillsIn: 10,
  hillsInFull: 12.5,
  hillsOutStart: 14.5,
  hillsOut: 16.5,
  beachStart: 16.5,
  beachEnd: 21.5,
  beachDrop: 0.9,
  rimStart: 22.5,
  rimEnd: 25,
  seaFloorY: -12,
  waterY: -0.45,
  head: { x: -12.5, z: -12.5, R: 7, H: 3.0 },
  canal: { halfWidth: 2.5, edgeSmooth: 1.8, bedY: -1.2, zEnd: 20 }
}

const S = (a: number, b: number, x: number): number => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  const T = TERRAIN

  const beach = -T.beachDrop * S(T.beachStart, T.beachEnd, r)

  const rim = (T.seaFloorY + T.beachDrop) * S(T.rimStart, T.rimEnd, r)

  const d = Math.hypot(x - T.head.x, z - T.head.z)
  const band = S(T.hillsIn, T.hillsInFull, r) * (1 - S(T.hillsOutStart, T.hillsOut, r))
  const corridor = S(2.5, 5, Math.abs(z))
  const headGate = S(7, 9.5, d)
  const bankEdge = T.canal.halfWidth + T.canal.edgeSmooth
  const canalGate = S(bankEdge, bankEdge + 2, Math.abs(x))
  const hills =
    band *
    corridor *
    headGate *
    canalGate *
    (0.3 * Math.sin(0.35 * x + 1.7) * Math.cos(0.31 * z - 0.6) +
      0.16 * Math.sin(0.71 * x - 2.1) * Math.cos(0.67 * z + 1.3) +
      0.07 * Math.sin(1.31 * x + 0.5) * Math.cos(1.23 * z))

  const bump = d < T.head.R ? T.head.H * (0.5 + 0.5 * Math.cos((Math.PI * d) / T.head.R)) : 0

  const base = beach + rim + hills + bump

  const C = T.canal
  const across = 1 - S(C.halfWidth, C.halfWidth + C.edgeSmooth, Math.abs(x))
  const along = 1 - S(C.zEnd, C.zEnd + 2, Math.abs(z))
  const canalMask = across * along
  return base + (Math.min(C.bedY, base) - base) * canalMask
}

export function buildHeightGrid(): Float32Array {
  const { size, res } = TERRAIN
  const heights = new Float32Array((res + 1) * (res + 1))
  for (let col = 0; col <= res; col++) {
    for (let row = 0; row <= res; row++) {
      const x = (col / res - 0.5) * size
      const z = (row / res - 0.5) * size
      heights[col * (res + 1) + row] = terrainHeight(x, z)
    }
  }
  return heights
}

export function sampleHeight(heights: Float32Array, x: number, z: number): number {
  const { size, res } = TERRAIN
  const fx = (x / size + 0.5) * res
  const fz = (z / size + 0.5) * res
  const cx = Math.min(Math.max(Math.floor(fx), 0), res - 1)
  const cz = Math.min(Math.max(Math.floor(fz), 0), res - 1)
  const u = fx - cx
  const v = fz - cz
  const H = (col: number, row: number): number => heights[col * (res + 1) + row]
  const h00 = H(cx, cz)
  const h10 = H(cx + 1, cz)
  const h01 = H(cx, cz + 1)
  const h11 = H(cx + 1, cz + 1)
  return u + v <= 1
    ? h00 + (h10 - h00) * u + (h01 - h00) * v
    : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v)
}
