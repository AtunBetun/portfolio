import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../Rendering/Palette.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'

const OCEAN_WIDTH = 70
const OCEAN_LENGTH = 100
const OCEAN_SEGMENTS_X = 40
const OCEAN_SEGMENTS_Z = 56
const EVENT_WAVE_SPAWN_AHEAD = 40
const EVENT_WAVE_DESPAWN_BEHIND = 15
const FOAM_BLOBS_PER_WAVE = 5
const FOAM_POOL_SIZE = 30

export default class WaveSystem {
  constructor(group) {
    this.group = group

    this.eventWaves = []
    this.phase = 0
    this.elapsed = 0
    this.wind = { strength: RACE_CONFIG.phases[0].wind, gust: 0 }

    this.currentParams = { ...RACE_CONFIG.phases[0] }
    this.targetParams = null
    this.transitionProgress = 1

    // Pre-created colors to avoid per-frame allocation
    this.colorOcean = new THREE.Color(PALETTE.ocean)
    this.colorDeep = new THREE.Color(PALETTE.oceanDeep)
    this.colorFoam = new THREE.Color(PALETTE.white)
    this.colorBase = new THREE.Color(PALETTE.ocean)
    this.colorScratch = new THREE.Color()

    this.mesh = this.createOcean()
    this.group.add(this.mesh)

    this.foamPool = this.createFoamPool()
  }

  createOcean() {
    const geo = new THREE.PlaneGeometry(
      OCEAN_WIDTH,
      OCEAN_LENGTH,
      OCEAN_SEGMENTS_X,
      OCEAN_SEGMENTS_Z
    )
    geo.rotateX(-Math.PI / 2)

    this.basePositions = new Float32Array(geo.attributes.position.array)

    const count = geo.attributes.position.count
    const colors = new Float32Array(count * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Vertex colors multiply against white — opaque cel-shaded look
    const mat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      vertexColors: true,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = -0.4
    mesh.receiveShadow = true
    return mesh
  }

  createFoamPool() {
    const pool = []
    const foamGeometry = new THREE.SphereGeometry(0.35, 8, 6)
    this.foamGeometry = foamGeometry
    this.foamMaterial = toon('white')

    for (let i = 0; i < FOAM_POOL_SIZE; i++) {
      const blob = new THREE.Mesh(foamGeometry, this.foamMaterial)
      blob.scale.set(1.4, 0.5, 1)
      blob.visible = false
      this.group.add(blob)
      pool.push(blob)
    }
    return pool
  }

  // THE height function — pure, shared by vertex displacement and gameplay queries.
  // Both must sample this so the boat and the water never desync.
  getHeightAt(x, z) {
    const { swellAmp, chopAmp, crestPower, swellFreq, swellSpeed } = this.currentParams
    const t = this.elapsed

    // Primary swell with crest sharpening: flat troughs, sharp peaks
    const s = Math.sin(z * swellFreq + t * swellSpeed)
    const shaped = Math.pow((s + 1) * 0.5, crestPower) * 2 - 1
    let y = shaped * swellAmp

    // Cross-chop
    y += Math.sin(x * 0.45 + t * 1.6) * chopAmp
    y += Math.sin((x + z) * 0.7 + t * 2.4) * chopAmp * 0.4

    // Event wave ridges — Gaussian bumps baked into the same field
    const sigma = RACE_CONFIG.waves.sigma
    const twoSigmaSq = 2 * sigma * sigma
    for (const wave of this.eventWaves) {
      if (!wave.active) continue
      const dz = z - wave.z
      y += wave.amp * Math.exp(-(dz * dz) / twoSigmaSq)
    }

    return y
  }

  update(delta, boatZ) {
    this.elapsed += delta

    // Wind gust — a slow beating oscillation the boat actually feels
    this.wind.gust =
      this.wind.strength *
      (0.6 + 0.4 * Math.sin(this.elapsed * 0.9) * Math.sin(this.elapsed * 0.23))

    // Phase transition — lerp the active params toward the target
    if (this.transitionProgress < 1 && this.targetParams) {
      const step = Math.min(delta / 2.5, 1 - this.transitionProgress)
      this.transitionProgress += step
      const a = this.transitionProgress
      const from = this.currentParams
      const to = this.targetParams
      const blend = step / Math.max(1 - (a - step), 0.0001)
      for (const key in to) {
        from[key] = THREE.MathUtils.lerp(from[key], to[key], blend)
      }
      if (this.transitionProgress >= 1) {
        Object.assign(this.currentParams, this.targetParams)
        this.targetParams = null
      }
    }

    // Move event waves toward the boat before deforming so vertices see fresh positions
    const waveSpeed = RACE_CONFIG.waves.speed * (1 + this.wind.strength * 0.3)
    for (const wave of this.eventWaves) {
      if (!wave.active) continue
      wave.z -= waveSpeed * delta
      if (wave.z < boatZ - EVENT_WAVE_DESPAWN_BEHIND) {
        this.releaseEventWave(wave)
      }
    }
    this.eventWaves = this.eventWaves.filter((wave) => wave.active)

    // Keep the ocean centered on the boat so it never runs out
    this.mesh.position.z = boatZ

    // Deform vertices and paint two-tone water + foam caps
    const { swellAmp, foamThreshold, tintToDeep } = this.currentParams
    const positions = this.mesh.geometry.attributes.position
    const colors = this.mesh.geometry.attributes.color
    const posArray = positions.array
    const base = this.basePositions

    // Base water tint deepens in late phases
    this.colorBase.copy(this.colorOcean).lerp(this.colorDeep, tintToDeep)

    const foamStart = foamThreshold * swellAmp
    const foamRange = Math.max(swellAmp - foamStart, 0.0001)
    const depthRange = Math.max(swellAmp, 0.0001)
    const scratch = this.colorScratch

    for (let i = 0, v = 0; i < posArray.length; i += 3, v++) {
      const bx = base[i]
      const bz = base[i + 2] + boatZ
      const h = this.getHeightAt(bx, bz)
      posArray[i + 1] = h

      scratch.copy(this.colorBase)
      if (h < 0) {
        // Troughs sink toward deep ocean
        const depth = Math.min(-h / depthRange, 1)
        scratch.lerp(this.colorDeep, depth)
      } else if (h > foamStart) {
        // Crests break into foam
        const foam = Math.min((h - foamStart) / foamRange, 1)
        scratch.lerp(this.colorFoam, foam)
      }
      colors.setXYZ(v, scratch.r, scratch.g, scratch.b)
    }

    positions.needsUpdate = true
    colors.needsUpdate = true

    // Ride foam blobs along each active ridge crest
    for (const wave of this.eventWaves) {
      if (!wave.active) continue
      for (let i = 0; i < wave.foam.length; i++) {
        const blob = wave.foam[i]
        const bob = Math.sin(this.elapsed * 5 + i * 1.7) * 0.06
        blob.position.set(
          wave.foamOffsets[i].x,
          this.mesh.position.y + this.getHeightAt(wave.foamOffsets[i].x, wave.z) + 0.1 + bob,
          wave.z + wave.foamOffsets[i].z
        )
      }
    }
  }

  spawnEventWave(boatZ) {
    const wave = {
      z: boatZ + EVENT_WAVE_SPAWN_AHEAD,
      amp: RACE_CONFIG.waves.ampByPhase[this.phase],
      active: true,
      ringTriggered: false,
      foam: [],
      foamOffsets: []
    }

    // Claim foam blobs from the pool to ride the ridge crest
    for (let i = 0; i < FOAM_BLOBS_PER_WAVE; i++) {
      const blob = this.foamPool.find((b) => !b.visible)
      if (!blob) break
      blob.visible = true
      wave.foam.push(blob)
      wave.foamOffsets.push({
        x: (i / (FOAM_BLOBS_PER_WAVE - 1) - 0.5) * 10 + (Math.random() - 0.5) * 1.5,
        z: (Math.random() - 0.5) * 1.2
      })
    }

    this.eventWaves.push(wave)
    return wave
  }

  checkEventWaveNear(boatZ) {
    let nearest = null
    let nearestDistance = Infinity

    for (const wave of this.eventWaves) {
      if (!wave.active) continue
      const distance = wave.z - boatZ
      if (
        distance >= 0 &&
        distance <= RACE_CONFIG.waves.triggerDistance &&
        distance < nearestDistance
      ) {
        nearest = wave
        nearestDistance = distance
      }
    }

    return nearest
  }

  setPhase(phaseIndex) {
    const clamped = THREE.MathUtils.clamp(Math.floor(phaseIndex), 0, RACE_CONFIG.phases.length - 1)
    if (clamped === this.phase && this.transitionProgress >= 1) return

    this.phase = clamped
    this.targetParams = { ...RACE_CONFIG.phases[clamped] }
    this.transitionProgress = 0
    this.wind.strength = this.targetParams.wind
  }

  getWindDrift() {
    return this.wind.gust * RACE_CONFIG.drift.ambient
  }

  releaseEventWave(wave) {
    wave.active = false
    for (const blob of wave.foam) {
      blob.visible = false
    }
    wave.foam.length = 0
    wave.foamOffsets.length = 0
  }

  reset() {
    for (const wave of this.eventWaves) {
      this.releaseEventWave(wave)
    }
    this.eventWaves = []

    this.elapsed = 0
    this.phase = 0
    this.currentParams = { ...RACE_CONFIG.phases[0] }
    this.targetParams = null
    this.transitionProgress = 1
    this.wind.strength = RACE_CONFIG.phases[0].wind
    this.wind.gust = 0
    this.mesh.position.z = 0
  }

  dispose() {
    this.reset()

    this.group.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()

    for (const blob of this.foamPool) {
      this.group.remove(blob)
    }
    this.foamGeometry.dispose()
    this.foamMaterial.dispose()
    this.foamPool = []
  }
}
