import * as THREE from 'three'
import Game from './Game.js'

export default class Camera {
  constructor() {
    this.game = Game.getInstance()
    this.target = new THREE.Vector3(0, 0, 0)
    this.lookTarget = new THREE.Vector3(0, 0, 0)
    this.currentPos = new THREE.Vector3(0, 5, 10)
    this.posLerp = 0.06
    this.lookLerp = 0.1

    this.distance = 10
    this.height = 5
    this.lookAhead = 2

    this.instance = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    )
    this.instance.position.copy(this.currentPos)
    this.instance.lookAt(0, 0, 0)

    this.game.ticker.events.on('tick', () => this.update(), 7)
    window.addEventListener('resize', () => this.resize())
  }

  update() {
    const desired = new THREE.Vector3(
      this.target.x - this.direction.x * this.distance,
      this.target.y + this.height,
      this.target.z - this.direction.z * this.distance
    )

    this.currentPos.lerp(desired, this.posLerp)
    this.instance.position.copy(this.currentPos)

    const lookAt = new THREE.Vector3(
      this.target.x + this.direction.x * this.lookAhead,
      this.target.y + 1,
      this.target.z + this.direction.z * this.lookAhead
    )
    this.lookTarget.lerp(lookAt, this.lookLerp)
    this.instance.lookAt(this.lookTarget)
  }

  follow(position, direction) {
    this.target.copy(position)
    if (direction && direction.lengthSq() > 0.01) {
      this.direction = direction.clone().normalize()
    }
  }

  get direction() {
    return this._direction || new THREE.Vector3(0, 0, -1)
  }

  set direction(val) {
    this._direction = val
  }

  resize() {
    this.instance.aspect = window.innerWidth / window.innerHeight
    this.instance.updateProjectionMatrix()
  }
}
