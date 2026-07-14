import * as THREE from 'three'
import Game from './Game.js'

export default class Camera {
  constructor() {
    this.game = Game.getInstance()
    this.target = new THREE.Vector3(0, 0, 0)
    this.lerpFactor = 0.08
    this.offset = new THREE.Vector3(0, 12, 8)

    const aspect = window.innerWidth / window.innerHeight
    const frustum = 10
    this.instance = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      100
    )
    this.instance.position.copy(this.offset)
    this.instance.lookAt(0, 0, 0)

    this.game.ticker.events.on('tick', () => this.update(), 7)
    window.addEventListener('resize', () => this.resize())
  }

  update() {
    const desired = this.target.clone().add(this.offset)
    this.instance.position.lerp(desired, this.lerpFactor)
    this.instance.lookAt(this.target)
  }

  follow(position) {
    this.target.copy(position)
  }

  resize() {
    const aspect = window.innerWidth / window.innerHeight
    const frustum = 10
    this.instance.left = (-frustum * aspect) / 2
    this.instance.right = (frustum * aspect) / 2
    this.instance.top = frustum / 2
    this.instance.bottom = -frustum / 2
    this.instance.updateProjectionMatrix()
  }
}
