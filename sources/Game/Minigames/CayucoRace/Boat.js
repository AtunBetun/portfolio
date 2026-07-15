import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'

const PADDLE_SWING_DURATION = 0.3
const PADDLE_HEADING_NUDGE = 0.03
const LATERAL_LIMIT = 3

export default class Boat {
  constructor(group) {
    this.group = group

    this.position = new THREE.Vector3()
    this.heading = 0
    this.speed = 0
    this.lateralOffset = 0

    this.paddlePhase = 0
    this.paddleSide = 0

    this.mesh = this.buildMesh()
    this.group.add(this.mesh)
  }

  buildMesh() {
    const boat = new THREE.Group()

    // Hull — long narrow capsule laid along Z, squashed to a dugout shape
    const hullGeometry = new THREE.CapsuleGeometry(0.45, 3, 6, 12)
    const hull = new THREE.Mesh(hullGeometry, toon('wood'))
    hull.rotation.x = Math.PI / 2
    hull.scale.set(1, 1, 0.6)
    hull.position.y = 0.1
    boat.add(hull)

    // Interior — slightly darker inset
    const interiorGeometry = new THREE.BoxGeometry(0.55, 0.12, 3)
    const interior = new THREE.Mesh(interiorGeometry, toon('woodDark'))
    interior.position.y = 0.32
    boat.add(interior)

    // Paddle — pivot group so it swings around its grip point
    this.paddlePivot = new THREE.Group()
    this.paddlePivot.position.set(0.5, 0.7, 0.4)

    const shaftGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6)
    const shaft = new THREE.Mesh(shaftGeometry, toon('wood'))
    shaft.position.y = -0.5
    this.paddlePivot.add(shaft)

    const bladeGeometry = new THREE.BoxGeometry(0.06, 0.5, 0.24)
    const blade = new THREE.Mesh(bladeGeometry, toon('sand'))
    blade.position.y = -1.35
    this.paddlePivot.add(blade)

    boat.add(this.paddlePivot)
    return boat
  }

  update(delta, waveHeight) {
    // Move forward along heading
    this.position.x += Math.sin(this.heading) * this.speed * delta
    this.position.z += Math.cos(this.heading) * this.speed * delta

    // Bob on the wave
    this.position.y = waveHeight

    // Paddle swing animation — sweeps out and returns over ~0.3s
    if (this.paddlePhase > 0) {
      this.paddlePhase = Math.max(0, this.paddlePhase - delta / PADDLE_SWING_DURATION)
      const swing = Math.sin(this.paddlePhase * Math.PI)
      this.paddlePivot.rotation.z = this.paddleSide * swing * 0.9
      this.paddlePivot.rotation.x = swing * 0.5
      this.paddlePivot.position.x = this.paddleSide * 0.5
    } else {
      this.paddlePivot.rotation.z = 0
      this.paddlePivot.rotation.x = 0
    }

    // Apply to mesh, including lateral drift perpendicular to heading
    this.mesh.position.set(
      this.position.x + Math.cos(this.heading) * this.lateralOffset,
      this.position.y,
      this.position.z - Math.sin(this.heading) * this.lateralOffset
    )
    this.mesh.rotation.y = this.heading
    this.mesh.rotation.z = Math.sin(waveHeight * 2) * 0.08
  }

  paddle(side) {
    // Paddling on one side drifts the boat the other way
    this.paddleSide = side === 'left' ? -1 : 1
    this.paddlePhase = 1
    this.heading += side === 'left' ? PADDLE_HEADING_NUDGE : -PADDLE_HEADING_NUDGE
    return true
  }

  applyDrift(amount, delta) {
    this.lateralOffset = THREE.MathUtils.clamp(
      this.lateralOffset + amount * delta,
      -LATERAL_LIMIT,
      LATERAL_LIMIT
    )
  }

  applySpeedMultiplier(mult) {
    this.speed *= mult
  }

  reset() {
    this.position.set(0, 0, 0)
    this.heading = 0
    this.speed = 0
    this.lateralOffset = 0
    this.paddlePhase = 0
    this.mesh.position.set(0, 0, 0)
    this.mesh.rotation.set(0, 0, 0)
  }

  getWorldPosition() {
    return this.mesh.getWorldPosition(new THREE.Vector3())
  }
}
