import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'

const LANE_HALF_WIDTH = 6
const BUOY_SPACING = 25
const BUOY_BASE_X = -7 // player's right (heading PI → screen-right is world -X)
const BUOY_MEANDER_AMP = 2
const BUOY_MEANDER_WAVELENGTH = 150
const BUOY_VISIBLE_RANGE = 160 // only bob buoys near the boat

// The right-hand boundary line. Gentle sine meander so it isn't a ruler-straight
// wall — the buoys mark where the player must stay left of (elimination later).
function buoyX(z) {
  return BUOY_BASE_X + Math.sin(z / BUOY_MEANDER_WAVELENGTH * Math.PI * 2) * BUOY_MEANDER_AMP
}

export default class RaceCourse {
  constructor(group) {
    this.group = group
    this.courseLength = RACE_CONFIG.courseLength
    this.progress = 0
    this.finished = false
    this.meshes = []
    this.buoys = []

    this.createBuoys()
    this.startLine = this.createLine(0, 'sand')
    this.finishLine = this.createLine(-this.courseLength, 'accent')
  }

  createBuoys() {
    // Shared geometry/material across all buoys — one draw setup, cheap
    const floatGeo = new THREE.SphereGeometry(0.35, 8, 6)
    const tipGeo = new THREE.ConeGeometry(0.18, 0.3, 6)
    const mat = toon('accent')
    this.buoyMat = mat
    this.buoyGeos = [floatGeo, tipGeo]

    const count = Math.floor(this.courseLength / BUOY_SPACING) + 1
    for (let i = 0; i < count; i++) {
      const z = -i * BUOY_SPACING
      const x = buoyX(z)

      const buoy = new THREE.Group()
      const float = new THREE.Mesh(floatGeo, mat)
      float.scale.set(1, 0.8, 1)
      buoy.add(float)
      const tip = new THREE.Mesh(tipGeo, mat)
      tip.position.y = 0.32
      buoy.add(tip)

      buoy.position.set(x, 0, z)
      this.group.add(buoy)
      this.buoys.push(buoy)
      this.meshes.push(buoy)
    }
  }

  createLine(z, colorKey) {
    const geometry = new THREE.PlaneGeometry(LANE_HALF_WIDTH * 2, 1.5)
    const material = toon(colorKey, {
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    const line = new THREE.Mesh(geometry, material)
    line.rotation.x = -Math.PI / 2
    line.position.set(0, 0.05, z)
    this.group.add(line)
    this.meshes.push(line)
    return line
  }

  updateProgress(boatPosition) {
    this.progress = THREE.MathUtils.clamp(boatPosition.z / -this.courseLength, 0, 1)
    if (this.progress >= 1.0) {
      this.finished = true
    }
  }

  // Bob buoys on the water surface — only those near the boat, to stay cheap.
  updateBuoys(boatZ, getHeightAt) {
    for (const buoy of this.buoys) {
      if (Math.abs(buoy.position.z - boatZ) > BUOY_VISIBLE_RANGE) continue
      buoy.position.y = getHeightAt(buoy.position.x, buoy.position.z)
    }
  }

  getProgress() {
    return this.progress
  }

  isFinished() {
    return this.finished
  }

  reset() {
    this.progress = 0
    this.finished = false
  }

  dispose() {
    for (const mesh of this.meshes) {
      this.group.remove(mesh)
    }
    for (const geo of this.buoyGeos) geo.dispose()
    this.buoyMat.dispose()
    this.startLine.geometry.dispose()
    this.startLine.material.dispose()
    this.finishLine.geometry.dispose()
    this.finishLine.material.dispose()
    this.meshes = []
    this.buoys = []
  }
}
