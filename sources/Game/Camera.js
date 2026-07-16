import * as THREE from 'three'
import Game from './Game.js'

const CAM = {
  posKMoving: 4,
  posKIdle: 2.5,
  lookK: 6,
  dirK: 3,
  distance: 12,
  height: 4,
  lookAhead: 2,
  occlusionRecover: 2,
  fallFramingK: 8,
  fallThreshold: -8
}

export default class Camera {
  constructor() {
    this.game = Game.getInstance()
    this.target = new THREE.Vector3(0, 0, 0)
    this.lookTarget = new THREE.Vector3(0, 0, 0)
    this.currentPos = new THREE.Vector3(0, CAM.height, CAM.distance)
    this.occlusionDist = CAM.distance

    this.elapsed = 0
    this.playerMoving = false
    this.playerVy = 0

    this._direction = new THREE.Vector3(0, 0, -1)
    this.__dirTarget = new THREE.Vector3(0, 0, -1)

    this._desired = new THREE.Vector3()
    this._lookAt = new THREE.Vector3()
    this._lookOrigin = new THREE.Vector3()
    this._toDesired = new THREE.Vector3()
    this._dirNorm = new THREE.Vector3()

    this.instance = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    )
    this.instance.position.copy(this.currentPos)
    this.instance.lookAt(0, 0, 0)

    this.game.ticker.events.on('tick', (delta) => this.update(delta), 7)
    window.addEventListener('resize', () => this.resize())
  }

  update(delta) {
    this.elapsed += delta

    const dir = this.direction
    const breathe = Math.sin(this.elapsed * 1.2) * 0.05

    const desired = this._desired.set(
      this.target.x - dir.x * CAM.distance,
      this.target.y + CAM.height + breathe,
      this.target.z - dir.z * CAM.distance
    )

    const posK =
      this.playerVy < CAM.fallThreshold
        ? CAM.fallFramingK
        : this.playerMoving
          ? CAM.posKMoving
          : CAM.posKIdle
    const posT = 1 - Math.exp(-posK * delta)
    this.currentPos.lerp(desired, posT)

    this.applyOcclusion(delta, desired)

    this.instance.position.copy(this.currentPos)

    const lookAt = this._lookAt.set(
      this.target.x + dir.x * CAM.lookAhead,
      this.target.y + 1.2,
      this.target.z + dir.z * CAM.lookAhead
    )
    const lookT = 1 - Math.exp(-CAM.lookK * delta)
    this.lookTarget.lerp(lookAt, lookT)
    this.instance.lookAt(this.lookTarget)
  }

  applyOcclusion(delta, desired) {
    if (!this.game.physics) return

    const lookOrigin = this._lookOrigin.set(this.target.x, this.target.y + 1.2, this.target.z)
    const toDesired = this._toDesired.subVectors(desired, lookOrigin)
    const fullDist = toDesired.length()
    if (fullDist < 0.1) return
    const dirNorm = this._dirNorm.copy(toDesired).divideScalar(fullDist)

    const origin = { x: lookOrigin.x, y: lookOrigin.y, z: lookOrigin.z }
    const direction = { x: dirNorm.x, y: dirNorm.y, z: dirNorm.z }

    const playerCollider = this.game.player ? this.game.player.collider : null
    const hit = this.game.physics.castRay(origin, direction, fullDist, playerCollider)

    if (hit && hit.timeOfImpact < fullDist) {
      const pullDist = hit.timeOfImpact * 0.9
      this.occlusionDist = pullDist
    } else {
      this.occlusionDist += CAM.occlusionRecover * delta
      if (this.occlusionDist > fullDist) this.occlusionDist = fullDist
    }

    if (this.occlusionDist < fullDist) {
      this.currentPos.copy(lookOrigin).addScaledVector(dirNorm, this.occlusionDist)
    }
  }

  follow(position, direction, verticalVelocity) {
    this.target.copy(position)
    this.playerVy = verticalVelocity || 0
    if (direction && direction.lengthSq() > 0.01) {
      this.playerMoving = true
      this._dirTarget = direction.clone().normalize()
    } else {
      this.playerMoving = false
    }
  }

  get direction() {
    return this._direction
  }

  set direction(_val) {
    /* handled via _dirTarget + follow */
  }

  get _dirTarget() {
    return this.__dirTarget
  }

  set _dirTarget(val) {
    this.__dirTarget = val
    const t = 1 - Math.exp(-CAM.dirK * (this.game.ticker?.delta || 1 / 60))
    this._direction.lerp(val, t)
    this._direction.normalize()
  }

  resize() {
    this.instance.aspect = window.innerWidth / window.innerHeight
    this.instance.updateProjectionMatrix()
  }
}
