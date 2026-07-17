import * as THREE from 'three'
import { PALETTE } from './Palette.js'
import { patchToonShader } from './ToonShaderPatch.js'

let gradientMap = null

function getGradientMap() {
  if (gradientMap) return gradientMap
  const colors = new Uint8Array([64, 128, 190, 255])
  const texture = new THREE.DataTexture(colors, 4, 1, THREE.RedFormat)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  gradientMap = texture
  return gradientMap
}

function darkenAndShiftToInk(hex, amount) {
  const c = new THREE.Color(hex)
  const ink = new THREE.Color(PALETTE.inkBlue)
  c.multiplyScalar(1 - amount)
  c.lerp(ink, 0.35)
  return c
}

const THICKNESS_TIERS = {
  character: 0.006,
  hero: 0.005,
  architecture: 0.003,
  foliage: 0.0015,
  none: 0
}

export function toon(colorKey, opts = {}) {
  const color = typeof colorKey === 'number' ? colorKey : PALETTE[colorKey]
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    ...opts
  })

  patchToonShader(mat, { specular: opts.specular || false })

  if (opts.outline !== false) {
    const tier = opts.outlineTier || 'architecture'
    const thickness = THICKNESS_TIERS[tier] || THICKNESS_TIERS.architecture
    const outlineColor = darkenAndShiftToInk(color, 0.5)
    mat.userData.outlineParameters = {
      thickness: opts.outlineThickness || thickness,
      color: opts.outlineColor
        ? [opts.outlineColor.r, opts.outlineColor.g, opts.outlineColor.b]
        : [outlineColor.r, outlineColor.g, outlineColor.b],
      alpha: opts.outlineAlpha !== undefined ? opts.outlineAlpha : 0.9
    }
  }

  return mat
}

export function toonFlat(colorKey, opts = {}) {
  const color = typeof colorKey === 'number' ? colorKey : PALETTE[colorKey]
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    side: THREE.DoubleSide,
    ...opts
  })

  patchToonShader(mat, { specular: opts.specular || false })

  if (opts.outline !== false) {
    const tier = opts.outlineTier || 'architecture'
    const thickness = THICKNESS_TIERS[tier] || THICKNESS_TIERS.architecture
    const outlineColor = darkenAndShiftToInk(color, 0.5)
    mat.userData.outlineParameters = {
      thickness: opts.outlineThickness || thickness,
      color: [outlineColor.r, outlineColor.g, outlineColor.b],
      alpha: 0.9
    }
  }

  return mat
}

export function toonWater(colorKey, opts = {}) {
  const color = typeof colorKey === 'number' ? colorKey : PALETTE[colorKey]
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    transparent: true,
    opacity: 0.9,
    ...opts
  })
  patchToonShader(mat, { specular: true })
  mat.userData.outlineParameters = { thickness: 0, color: [0, 0, 0], alpha: 0 }
  return mat
}
