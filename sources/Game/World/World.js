import * as THREE from 'three'
import Game from '../Game.js'
import PhysicsLetters from './PhysicsLetters.js'
import Water from './Water.js'
import { WORLD_LAYOUT } from '../../../data/rooms.js'
import { buildHubProps } from './Rooms/HubRoom.js'
import { toonFlat } from '../Rendering/ToonMaterials.js'

export default class World {
  constructor() {
    this.game = Game.getInstance()
    this.group = new THREE.Group()
    this.collectibles = []
    this.activeRoomId = 'hub'
    this.collectiblesCollected = 0
    this.totalCollectibles = 0
    this.dynamicProps = []
    this.bushes = []

    this.buildFloor()
    const hubData = buildHubProps(this.group, this.game.physics)
    if (hubData) {
      this.dynamicProps = hubData.dynamicProps || []
      this.bushes = hubData.bushes || []
    }

    this.physicsLetters = new PhysicsLetters(this.group)
    this.physicsLetters.load()

    this.water = new Water(this.group)

    this.game.scene.add(this.group)
    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 5)
  }

  buildFloor() {
    const size = WORLD_LAYOUT.floorSize
    const floorGeo = new THREE.PlaneGeometry(size, size, 1, 1)
    const floorMat = toonFlat('grass')
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    floor.receiveShadow = true
    this.group.add(floor)
  }

  enterRoom(roomId) {
    if (roomId === 'hub') {
      const spawn = WORLD_LAYOUT.playerSpawn
      this.game.player.teleport(spawn.x, spawn.y, spawn.z)
      this.activeRoomId = 'hub'
    }
  }

  update(elapsed) {
    const playerPos = this.game.player.mesh.position

    for (const c of this.collectibles) {
      c.update(elapsed)
      c.checkPickup(playerPos)
    }

    for (const { body, mesh } of this.dynamicProps) {
      const p = body.translation()
      const q = body.rotation()
      mesh.position.set(p.x, p.y, p.z)
      mesh.quaternion.set(q.x, q.y, q.z, q.w)
      if (p.y < WORLD_LAYOUT.killPlaneY) {
        body.setTranslation(mesh.userData.spawn, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }

    if (this.physicsLetters.loaded) {
      this.physicsLetters.update()
    }

    this.water.update(elapsed)
  }
}
