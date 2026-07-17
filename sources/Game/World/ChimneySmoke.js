import * as THREE from 'three'
import Game from '../Game.js'
import { toon } from '../Rendering/ToonMaterials.js'

const POOL_SIZE = 4
const SPAWN_INTERVAL = 0.9
const LIFETIME = 2.2
const RISE = 1.4
const DRIFT_X = 0.3
const SCALE_START = 0.5
const SCALE_END = 1.6
const OPACITY_START = 0.55
const OPACITY_END = 0

export default class ChimneySmoke {
  constructor(group, chimneyTop) {
    this.game = Game.getInstance()
    this.group = group
    this.origin = chimneyTop
    this.pool = []
    this.timer = 0

    const geo = new THREE.SphereGeometry(0.14, 6, 5)
    const mat = toon('cascoWhite', { outline: false, transparent: true })

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone())
      mesh.visible = false
      mesh.userData.active = false
      mesh.userData.age = 0
      group.add(mesh)
      this.pool.push(mesh)
    }

    this.game.ticker.events.on('tick', (delta, elapsed) => this.update(delta, elapsed), 8)
  }

  spawn() {
    const puff = this.pool.find((p) => !p.userData.active)
    if (!puff) return

    puff.position.copy(this.origin)
    puff.scale.setScalar(SCALE_START)
    puff.material.opacity = OPACITY_START
    puff.visible = true
    puff.userData.active = true
    puff.userData.age = 0
  }

  update(delta, elapsed) {
    this.timer += delta
    if (this.timer >= SPAWN_INTERVAL) {
      this.timer -= SPAWN_INTERVAL
      this.spawn()
    }

    for (const puff of this.pool) {
      if (!puff.userData.active) continue

      puff.userData.age += delta
      const t = puff.userData.age / LIFETIME

      if (t >= 1) {
        puff.visible = false
        puff.userData.active = false
        continue
      }

      puff.position.y = this.origin.y + t * RISE
      puff.position.x = this.origin.x + Math.sin(elapsed * 2 + puff.userData.age * 3) * DRIFT_X * t

      const scale = SCALE_START + (SCALE_END - SCALE_START) * t
      puff.scale.setScalar(scale)
      puff.material.opacity = OPACITY_START + (OPACITY_END - OPACITY_START) * t
    }
  }
}
