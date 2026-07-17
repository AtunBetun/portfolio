import * as THREE from 'three'
import Game from '../Game.js'
import { toon } from '../Rendering/ToonMaterials.js'
import { PALETTE } from '../Rendering/Palette.js'
import { sampleHeight } from '../../../data/terrain.js'

const BUTTERFLIES = [
  { anchor: [-7, 0], rx: 2.5, rz: 1.8, speed: 0.7, color: PALETTE.bougainvillea },
  { anchor: [8, -5], rx: 2, rz: 2, speed: 0.55, color: PALETTE.cascoYellow },
  { anchor: [5, 6], rx: 1.5, rz: 2.2, speed: 0.65, color: PALETTE.canalTeal }
]

export default class Critters {
  constructor(group, grid) {
    this.game = Game.getInstance()
    this.group = group
    this.grid = grid
    this.butterflies = []

    for (let i = 0; i < BUTTERFLIES.length; i++) {
      const cfg = BUTTERFLIES[i]
      const butterfly = this.createButterfly(cfg.color)
      group.add(butterfly.group)
      this.butterflies.push({ ...cfg, ...butterfly, phase: i * 2.1 })
    }

    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 8)
  }

  createButterfly(color) {
    const group = new THREE.Group()

    const bodyGeo = new THREE.SphereGeometry(0.03, 4, 3)
    const body = new THREE.Mesh(bodyGeo, toon('black', { outline: false }))
    group.add(body)

    const wingGeo = new THREE.PlaneGeometry(0.12, 0.16)
    const wingMat = toon(color, { outline: false, side: THREE.DoubleSide })

    const leftWing = new THREE.Mesh(wingGeo, wingMat)
    leftWing.position.x = -0.07
    group.add(leftWing)

    const rightWing = new THREE.Mesh(wingGeo, wingMat)
    rightWing.position.x = 0.07
    group.add(rightWing)

    return { group, leftWing, rightWing }
  }

  update(elapsed) {
    for (const b of this.butterflies) {
      const t = elapsed * b.speed + b.phase
      const ax = b.anchor[0]
      const az = b.anchor[1]

      const x = ax + Math.sin(t) * b.rx
      const z = az + Math.sin(2 * t) * b.rz
      const baseY = this.grid ? sampleHeight(this.grid, x, z) : 0
      const y = baseY + 1.5 + Math.sin(t * 2.3) * 0.25

      b.group.position.set(x, y, z)

      const nextT = t + 0.05
      const nx = ax + Math.sin(nextT) * b.rx
      const nz = az + Math.sin(2 * nextT) * b.rz
      b.group.lookAt(nx, y, nz)

      const flap = 0.5 + Math.sin(elapsed * 18 + b.phase) * 0.8
      b.leftWing.rotation.y = flap
      b.rightWing.rotation.y = -flap
    }
  }
}
