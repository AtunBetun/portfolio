import * as THREE from 'three'
import { PALETTE } from '../Rendering/Palette.js'

const BASE_SCALE = 0.5
const MAX_HEIGHT = 5
const geometry = new THREE.CircleGeometry(1, 16)
const material = new THREE.MeshBasicMaterial({
  color: PALETTE.black,
  transparent: true,
  opacity: 0.3,
  depthWrite: false
})

export default class BlobShadow {
  constructor(target) {
    this.target = target
    this.mesh = new THREE.Mesh(geometry, material.clone())
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.renderOrder = 1
  }

  update() {
    const pos = this.target.position ?? this.target
    const height = Math.max(0, pos.y)
    const t = Math.min(height / MAX_HEIGHT, 1)

    this.mesh.position.set(pos.x, 0.01, pos.z)
    const scale = BASE_SCALE * (1 - t * 0.6)
    this.mesh.scale.set(scale, scale, 1)
    this.mesh.material.opacity = 0.3 * (1 - t)
  }
}
