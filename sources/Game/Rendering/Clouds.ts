import * as THREE from 'three'
import Game from '../Game.js'
import { PALETTE } from './Palette.js'

interface CloudEntry {
  mesh: THREE.Group
  baseX: number
  speed: number
}

export default class Clouds {
  game: Game
  group: THREE.Group = new THREE.Group()
  clouds: CloudEntry[] = []

  constructor() {
    this.game = Game.getInstance()

    this.createClouds()
    this.game.scene.add(this.group)

    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 4)
  }

  createClouds(): void {
    const positions = [
      { x: -15, y: 18, z: -20 },
      { x: 10, y: 20, z: -25 },
      { x: 20, y: 16, z: -10 },
      { x: -20, y: 19, z: 10 },
      { x: 5, y: 17, z: 15 }
    ]

    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.white, fog: false })

    for (const pos of positions) {
      const cloud = this.createCloudCluster(mat)
      cloud.position.set(pos.x, pos.y, pos.z)
      cloud.scale.setScalar(0.8 + Math.random() * 0.6)
      this.group.add(cloud)
      this.clouds.push({ mesh: cloud, baseX: pos.x, speed: 0.3 + Math.random() * 0.4 })
    }
  }

  createCloudCluster(mat: THREE.MeshBasicMaterial): THREE.Group {
    const cluster = new THREE.Group()
    const sphereGeo = new THREE.SphereGeometry(1, 6, 5)

    const puffs = [
      { x: 0, y: 0, z: 0, s: 1.5 },
      { x: 1.2, y: 0.2, z: 0, s: 1.2 },
      { x: -1.1, y: 0.1, z: 0.3, s: 1.3 },
      { x: 0.5, y: 0.4, z: -0.3, s: 1.0 },
      { x: -0.5, y: 0.3, z: 0.5, s: 0.9 }
    ]

    for (const puff of puffs) {
      const mesh = new THREE.Mesh(sphereGeo, mat)
      mesh.position.set(puff.x, puff.y, puff.z)
      mesh.scale.setScalar(puff.s)
      cluster.add(mesh)
    }

    return cluster
  }

  update(elapsed: number): void {
    for (const cloud of this.clouds) {
      cloud.mesh.position.x = cloud.baseX + Math.sin(elapsed * cloud.speed) * 3
    }
  }
}
