import * as THREE from 'three'

export default class Door {
  constructor(config, _room) {
    this.config = config
    this.id = config.id
    this.target = config.target
    this.locked = config.locked || false
    this.triggerRadius = 0.8
    this.group = new THREE.Group()

    this.buildVisual()
  }

  buildVisual() {
    const { x, z } = this.config.position

    const frameGeo = new THREE.BoxGeometry(1.2, 1.8, 0.15)
    const frameMat = new THREE.MeshStandardMaterial({
      color: this.locked ? 0x333333 : 0x00ff41,
      emissive: this.locked ? 0x111111 : 0x00ff41,
      emissiveIntensity: this.locked ? 0.1 : 0.3,
      flatShading: true
    })
    const frame = new THREE.Mesh(frameGeo, frameMat)
    frame.position.set(x, 0.9, z)
    frame.castShadow = true
    this.group.add(frame)

    if (this.config.label) {
      const light = new THREE.PointLight(this.locked ? 0x333333 : 0x00ff41, 0.5, 2)
      light.position.set(x, 2, z)
      this.group.add(light)
    }

    this.position = new THREE.Vector3(x, 0, z)
  }

  isPlayerNear(playerPos) {
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    return Math.sqrt(dx * dx + dz * dz) < this.triggerRadius
  }
}
