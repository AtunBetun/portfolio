import * as THREE from 'three'
import Game from './Game.js'

export default class Camera {
  constructor() {
    this.game = Game.getInstance()
    this.target = new THREE.Vector3(0, 0, 0)
    this.lookTarget = new THREE.Vector3(0, 0, 0)
    this.currentPos = new THREE.Vector3(0, 4, 12)
    this.posLerp = 0.03
    this.lookLerp = 0.06

    this.distance = 12
    this.height = 4
    this.lookAhead = 2

    this.idleSettleLerp = 0.01
    this.elapsed = 0
    this.playerMoving = false

    this.instance = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    )
    this.instance.position.copy(this.currentPos)
    this.instance.lookAt(0, 0, 0)

    this.game.ticker.events.on('tick', (delta) => this.update(delta), 7)
    window.addEventListener('resize', () => this.resize())
  }

  update(delta) {
    this.elapsed += delta

    const dir = this.direction
    const desired = new THREE.Vector3(
      this.target.x - dir.x * this.distance,
      this.target.y + this.height + Math.sin(this.elapsed * 1.2) * 0.05,
      this.target.z - dir.z * this.distance
    )

    const lerpSpeed = this.playerMoving ? this.posLerp : this.posLerp * 0.6
    this.currentPos.lerp(desired, lerpSpeed)
    this.instance.position.copy(this.currentPos)

    const lookAt = new THREE.Vector3(
      this.target.x + dir.x * this.lookAhead,
      this.target.y + 1.2,
      this.target.z + dir.z * this.lookAhead
    )
    this.lookTarget.lerp(lookAt, this.lookLerp)
    this.instance.lookAt(this.lookTarget)
  }

  follow(position, direction) {
    this.target.copy(position)
    if (direction && direction.lengthSq() > 0.01) {
      this.playerMoving = true
      this.direction = direction.clone().normalize()
    } else {
      this.playerMoving = false
    }
  }

  get direction() {
    return this._direction || new THREE.Vector3(0, 0, -1)
  }

  set direction(val) {
    if (!this._direction) {
      this._direction = val
      return
    }
    this._direction.lerp(val, this.playerMoving ? 0.04 : this.idleSettleLerp)
    this._direction.normalize()
  }

  resize() {
    this.instance.aspect = window.innerWidth / window.innerHeight
    this.instance.updateProjectionMatrix()
  }
}
