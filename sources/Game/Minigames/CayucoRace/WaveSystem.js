import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../Rendering/Palette.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'

const PHASE_AMPLITUDES = [0.2, 0.4, 0.7]
const EVENT_WAVE_SPEED = 8
const EVENT_WAVE_SPAWN_AHEAD = 40
const EVENT_WAVE_TRIGGER_DISTANCE = 3
const EVENT_WAVE_DESPAWN_BEHIND = 15

export default class WaveSystem {
  constructor(group) {
    this.group = group

    this.eventWaves = []
    this.nextEventTime = this.rollNextEventTime(0)
    this.phase = 0
    this.elapsed = 0
    this.amplitude = PHASE_AMPLITUDES[0]

    this.mesh = this.createOcean()
    this.group.add(this.mesh)
  }

  createOcean() {
    const geo = new THREE.PlaneGeometry(60, 60, 30, 30)
    geo.rotateX(-Math.PI / 2)

    this.basePositions = new Float32Array(geo.attributes.position.array)

    const mat = new THREE.MeshToonMaterial({
      color: PALETTE.ocean,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = -0.4
    mesh.receiveShadow = true
    return mesh
  }

  update(delta, boatZ) {
    this.elapsed += delta

    // Keep the ocean plane centered on the boat so it never runs out
    this.mesh.position.z = boatZ

    // Ambient deformation — more pronounced than the hub water
    const positions = this.mesh.geometry.attributes.position.array
    const base = this.basePositions
    const t = this.elapsed
    const amp = this.amplitude

    for (let i = 0; i < positions.length; i += 3) {
      const bx = base[i]
      const bz = base[i + 2] + boatZ
      positions[i + 1] =
        Math.sin(bx * 0.4 + t * 1.8) * amp +
        Math.cos(bz * 0.3 + t * 1.4) * amp * 0.7 +
        Math.sin((bx + bz) * 0.2 + t * 2.2) * amp * 0.4
    }

    this.mesh.geometry.attributes.position.needsUpdate = true

    // Spawn event waves on the rolled interval
    if (this.elapsed >= this.nextEventTime) {
      this.spawnEventWave(boatZ)
      this.nextEventTime = this.rollNextEventTime(this.elapsed)
    }

    // Move event waves toward the boat (negative Z)
    for (const wave of this.eventWaves) {
      if (!wave.active) continue

      wave.position.z -= EVENT_WAVE_SPEED * delta
      wave.mesh.position.z = wave.position.z
      wave.mesh.position.y = this.getHeightAt(wave.position.x, wave.position.z) + 0.15
      wave.crest.rotation.z = Math.sin(this.elapsed * 6) * 0.1

      // Deactivate once well behind the boat
      if (wave.position.z < boatZ - EVENT_WAVE_DESPAWN_BEHIND) {
        this.removeEventWave(wave)
      }
    }

    this.eventWaves = this.eventWaves.filter((wave) => wave.active)
  }

  getHeightAt(x, z) {
    const t = this.elapsed
    const amp = this.amplitude
    return (
      Math.sin(x * 0.4 + t * 1.8) * amp +
      Math.cos(z * 0.3 + t * 1.4) * amp * 0.7 +
      Math.sin((x + z) * 0.2 + t * 2.2) * amp * 0.4
    )
  }

  getAmbientDrift(elapsed) {
    const phaseMultiplier = 1 + this.phase * 0.5
    return Math.sin(elapsed * 0.7) * RACE_CONFIG.drift.ambient * phaseMultiplier
  }

  spawnEventWave(boatZ = 0) {
    const waveGroup = new THREE.Group()

    // Swell body — stretched sphere spanning the course laterally
    const swellGeometry = new THREE.SphereGeometry(1, 12, 8)
    const swell = new THREE.Mesh(swellGeometry, toon('ocean', { transparent: true, opacity: 0.9 }))
    swell.scale.set(5, 0.8, 1.2)
    waveGroup.add(swell)

    // Foam crest on top — white, visually distinct
    const crestGeometry = new THREE.SphereGeometry(1, 12, 8)
    const crest = new THREE.Mesh(crestGeometry, toon('white'))
    crest.scale.set(4.6, 0.35, 0.7)
    crest.position.y = 0.6
    waveGroup.add(crest)

    const position = new THREE.Vector3(0, 0, boatZ + EVENT_WAVE_SPAWN_AHEAD)
    waveGroup.position.copy(position)

    const wave = {
      time: this.elapsed,
      position,
      active: true,
      mesh: waveGroup,
      crest
    }

    this.group.add(waveGroup)
    this.eventWaves.push(wave)
    return wave
  }

  checkEventWaveNear(boatZ) {
    let nearest = null
    let nearestDistance = Infinity

    for (const wave of this.eventWaves) {
      if (!wave.active) continue
      const distance = wave.position.z - boatZ
      if (distance >= 0 && distance <= EVENT_WAVE_TRIGGER_DISTANCE && distance < nearestDistance) {
        nearest = wave
        nearestDistance = distance
      }
    }

    return nearest
  }

  setPhase(phase) {
    this.phase = THREE.MathUtils.clamp(Math.floor(phase), 0, PHASE_AMPLITUDES.length - 1)
    this.amplitude = PHASE_AMPLITUDES[this.phase]
  }

  rollNextEventTime(from) {
    const [min, max] = RACE_CONFIG.waveInterval
    return from + min + Math.random() * (max - min)
  }

  removeEventWave(wave) {
    wave.active = false
    this.group.remove(wave.mesh)
    wave.mesh.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose()
        child.material.dispose()
      }
    })
  }

  reset() {
    for (const wave of this.eventWaves) {
      this.removeEventWave(wave)
    }
    this.eventWaves = []
    this.elapsed = 0
    this.nextEventTime = this.rollNextEventTime(0)
    this.setPhase(0)
    this.mesh.position.z = 0
  }

  dispose() {
    this.reset()
    this.group.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
