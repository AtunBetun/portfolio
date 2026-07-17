import * as THREE from 'three'
import Game from '../Game.js'
import { toonFlat } from '../Rendering/ToonMaterials.js'
import type { LandInfo } from '../Player.js'

const POOL_SIZE = 6
const LIFETIME = 0.35

export default class DustPuff {
  game: Game
  group: THREE.Group
  pool: THREE.Mesh[] = []

  constructor(group: THREE.Group) {
    this.game = Game.getInstance()
    this.group = group

    const geo = new THREE.RingGeometry(0.1, 0.3, 12)
    const mat = toonFlat('stone', { transparent: true, opacity: 0.7 })

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone())
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      mesh.userData.age = 0
      mesh.userData.active = false
      group.add(mesh)
      this.pool.push(mesh)
    }

    this.game.player!.events.on('player:land', (data) => this.spawn(data))
    this.game.ticker.events.on('tick', (delta) => this.update(delta), 8)
  }

  spawn(data: LandInfo): void {
    const puff = this.pool.find((p) => !p.userData.active)
    if (!puff) return
    puff.position.set(data.position.x, data.position.y + 0.02, data.position.z)
    puff.scale.set(0.3, 0.3, 0.3)
    ;(puff.material as THREE.MeshToonMaterial).opacity = 0.7
    puff.visible = true
    puff.userData.active = true
    puff.userData.age = 0
  }

  update(delta: number): void {
    for (const puff of this.pool) {
      if (!puff.userData.active) continue
      puff.userData.age += delta
      const t = (puff.userData.age as number) / LIFETIME
      if (t >= 1) {
        puff.visible = false
        puff.userData.active = false
        continue
      }
      const s = 0.3 + (1.2 - 0.3) * t
      puff.scale.set(s, s, s)
      ;(puff.material as THREE.MeshToonMaterial).opacity = 0.7 * (1 - t)
    }
  }
}
