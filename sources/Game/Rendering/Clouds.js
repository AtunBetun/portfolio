import * as THREE from 'three'
import Game from '../Game.js'
import { PALETTE } from './Palette.js'

export default class Clouds {
  constructor() {
    this.game = Game.getInstance()
    this.group = new THREE.Group()
    this.clouds = []

    this.createOverheadClouds()
    this.createHorizonBand()
    this.game.scene.add(this.group)

    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 4)
  }

  createOverheadClouds() {
    const positions = [
      { x: -15, y: 18, z: -20 },
      { x: 10, y: 20, z: -25 },
      { x: 20, y: 16, z: -10 },
      { x: -20, y: 19, z: 10 },
      { x: 5, y: 17, z: 15 }
    ]

    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.white, fog: false })

    for (const pos of positions) {
      const cloud = this.createPancakeCluster(mat)
      cloud.position.set(pos.x, pos.y, pos.z)
      const s = 0.8 + Math.random() * 0.6
      cloud.scale.set(s, s, s)
      this.group.add(cloud)
      this.clouds.push({ mesh: cloud, baseX: pos.x, speed: 0.15 + Math.random() * 0.2 })
    }
  }

  createHorizonBand() {
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.white, fog: false })
    const count = 10
    const radius = 55

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = 10 + Math.random() * 2

      const cloud = this.createPancakeCluster(mat)
      cloud.position.set(x, y, z)
      cloud.scale.set(2.5 + Math.random(), 1.2, 2.0 + Math.random() * 0.5)
      cloud.lookAt(0, y, 0)
      this.group.add(cloud)
      this.clouds.push({ mesh: cloud, baseX: x, speed: 0.05 + Math.random() * 0.05 })
    }
  }

  createPancakeCluster(mat) {
    const cluster = new THREE.Group()
    const sphereGeo = new THREE.SphereGeometry(1, 6, 5)

    const puffs = [
      { x: 0, y: 0, z: 0, sx: 1.0, sy: 0.3, sz: 0.8 },
      { x: 1.2, y: 0.05, z: 0, sx: 0.9, sy: 0.25, sz: 0.7 },
      { x: -1.1, y: 0.03, z: 0.3, sx: 0.95, sy: 0.28, sz: 0.75 },
      { x: 0.5, y: 0.08, z: -0.3, sx: 0.7, sy: 0.22, sz: 0.6 }
    ]

    for (const puff of puffs) {
      const mesh = new THREE.Mesh(sphereGeo, mat)
      mesh.position.set(puff.x, puff.y, puff.z)
      mesh.scale.set(puff.sx, puff.sy, puff.sz)
      cluster.add(mesh)
    }

    return cluster
  }

  update(elapsed) {
    for (const cloud of this.clouds) {
      cloud.mesh.position.x = cloud.baseX + Math.sin(elapsed * cloud.speed) * 2
    }
  }
}
