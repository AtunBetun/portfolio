import * as THREE from 'three'

export default class Door {
  constructor(config, _room) {
    this.config = config
    this.id = config.id
    this.target = config.target
    this.locked = config.locked || false
    this.triggerRadius = 1.5
    this.group = new THREE.Group()
    this.playerNear = false

    this.buildVisual()
  }

  buildVisual() {
    const { x, z } = this.config.position

    const frameGeo = new THREE.BoxGeometry(1.4, 2.2, 0.2)
    const frameMat = new THREE.MeshStandardMaterial({
      color: this.locked ? 0x222222 : 0x00ff41,
      emissive: this.locked ? 0x080808 : 0x00ff41,
      emissiveIntensity: this.locked ? 0.05 : 0.4,
      flatShading: true
    })
    this.frame = new THREE.Mesh(frameGeo, frameMat)
    this.frame.position.set(x, 1.1, z)
    this.frame.castShadow = true
    this.group.add(this.frame)

    const innerGeo = new THREE.PlaneGeometry(1, 1.8)
    const innerMat = new THREE.MeshStandardMaterial({
      color: this.locked ? 0x111111 : 0x003310,
      emissive: this.locked ? 0x000000 : 0x00ff41,
      emissiveIntensity: this.locked ? 0 : 0.15,
      side: THREE.DoubleSide
    })
    const inner = new THREE.Mesh(innerGeo, innerMat)
    inner.position.set(x, 1.1, z + (z < 0 ? 0.11 : -0.11))
    this.group.add(inner)

    if (!this.locked) {
      const light = new THREE.PointLight(0x00ff41, 0.8, 3)
      light.position.set(x, 2.5, z)
      this.group.add(light)
    }

    this.position = new THREE.Vector3(x, 0, z)
  }

  isPlayerNear(playerPos) {
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    const near = Math.sqrt(dx * dx + dz * dz) < this.triggerRadius
    this.playerNear = near
    if (near && !this.locked) {
      this.frame.material.emissiveIntensity = 0.8
    } else if (!this.locked) {
      this.frame.material.emissiveIntensity = 0.4
    }
    return near
  }
}
