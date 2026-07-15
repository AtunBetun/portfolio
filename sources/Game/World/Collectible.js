import * as THREE from 'three'
import Game from '../Game.js'
import { toon } from '../Rendering/ToonMaterials.js'

export default class Collectible {
  constructor(config) {
    this.game = Game.getInstance()
    this.id = config.id
    this.color = config.color || 0x00ff41
    this.collected = false
    this.position = new THREE.Vector3(config.x, 0.5, config.z)
    this.triggerRadius = 0.7

    this.group = new THREE.Group()
    this.buildVisual()
  }

  buildVisual() {
    const geo = new THREE.IcosahedronGeometry(0.2, 0)
    const mat = toon(this.color)
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.copy(this.position)
    this.mesh.castShadow = true
    this.group.add(this.mesh)

    const light = new THREE.PointLight(this.color, 0.4, 2)
    light.position.copy(this.position)
    this.light = light
    this.group.add(light)
  }

  update(elapsed) {
    if (this.collected) return
    this.mesh.rotation.y = elapsed * 2
    this.mesh.position.y = 0.5 + Math.sin(elapsed * 3) * 0.1
  }

  checkPickup(playerPos) {
    if (this.collected) return false
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    if (Math.sqrt(dx * dx + dz * dz) < this.triggerRadius) {
      this.collect()
      return true
    }
    return false
  }

  collect() {
    this.collected = true
    this.group.visible = false
    this.game.tracker.increment()
  }
}
