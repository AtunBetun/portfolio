import * as THREE from 'three'
import { PALETTE } from './Palette.js'

let gradientMap = null

function getGradientMap() {
  if (gradientMap) return gradientMap
  const colors = new Uint8Array([90, 160, 255])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  gradientMap = texture
  return gradientMap
}

export function toon(colorKey, opts = {}) {
  const color = typeof colorKey === 'number' ? colorKey : PALETTE[colorKey]
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    ...opts
  })
}

export function toonFlat(colorKey, opts = {}) {
  const color = typeof colorKey === 'number' ? colorKey : PALETTE[colorKey]
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    side: THREE.DoubleSide,
    ...opts
  })
}
