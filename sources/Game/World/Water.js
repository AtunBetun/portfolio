import * as THREE from 'three'
import Game from '../Game.js'
import { PALETTE } from '../Rendering/Palette.js'
import { TERRAIN } from '../../../data/terrain.js'

export default class Water {
  constructor(group) {
    this.game = Game.getInstance()
    this.group = group
    this.mesh = this.createWater()
    this.group.add(this.mesh)
  }

  createWater() {
    const geo = new THREE.PlaneGeometry(80, 80, 40, 40)
    geo.rotateX(-Math.PI / 2)

    this.basePositions = new Float32Array(geo.attributes.position.array)

    const mat = new THREE.MeshToonMaterial({
      color: PALETTE.ocean,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = TERRAIN.waterY
    mesh.receiveShadow = true
    return mesh
  }

  update(elapsed) {
    const positions = this.mesh.geometry.attributes.position.array
    const base = this.basePositions

    for (let i = 0; i < positions.length; i += 3) {
      const bx = base[i]
      const bz = base[i + 2]
      positions[i + 1] =
        Math.sin(bx * 0.3 + elapsed * 1.5) * 0.15 + Math.cos(bz * 0.25 + elapsed * 1.2) * 0.1
    }

    this.mesh.geometry.attributes.position.needsUpdate = true
  }
}
