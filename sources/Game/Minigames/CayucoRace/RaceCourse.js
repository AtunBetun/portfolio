import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'

const LANE_MARKER_SPACING = 20
const LANE_HALF_WIDTH = 6

export default class RaceCourse {
  constructor(group) {
    this.group = group
    this.courseLength = RACE_CONFIG.courseLength
    this.progress = 0
    this.finished = false
    this.meshes = []

    this.path = this.createPath()
    this.createLaneMarkers()
    this.startLine = this.createLine(0, 'sand')
    this.finishLine = this.createLine(-this.courseLength, 'accent')
  }

  createPath() {
    const length = this.courseLength
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -length * 0.2),
      new THREE.Vector3(20, 0, -length * 0.35),
      new THREE.Vector3(20, 0, -length * 0.5),
      new THREE.Vector3(-15, 0, -length * 0.7),
      new THREE.Vector3(-15, 0, -length * 0.85),
      new THREE.Vector3(0, 0, -length)
    ]
    return new THREE.CatmullRomCurve3(points)
  }

  createLaneMarkers() {
    const markerGeometry = new THREE.BoxGeometry(0.3, 0.15, 2)
    const markerMaterial = toon('sand', { transparent: true, opacity: 0.5 })
    const count = Math.floor(this.courseLength / LANE_MARKER_SPACING) + 1

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      const center = this.path.getPoint(t)
      const tangent = this.path.getTangent(t)
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()

      for (const direction of [-1, 1]) {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial)
        marker.position.copy(center).addScaledVector(side, LANE_HALF_WIDTH * direction)
        marker.position.y = 0.1
        marker.lookAt(marker.position.clone().add(tangent))
        this.group.add(marker)
        this.meshes.push(marker)
      }
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

  getProgress() {
    return this.progress
  }

  isFinished() {
    return this.finished
  }

  getPhase() {
    if (this.progress < 0.33) return 0
    if (this.progress < 0.67) return 1
    return 2
  }

  getCourseDirection(progress) {
    return this.path.getTangent(THREE.MathUtils.clamp(progress, 0, 1)).normalize()
  }

  reset() {
    this.progress = 0
    this.finished = false
  }

  dispose() {
    for (const mesh of this.meshes) {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    this.meshes = []
  }
}
