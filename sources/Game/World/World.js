import * as THREE from 'three'
import Game from '../Game.js'
// import Collectible from './Collectible.js'
import PhysicsLetters from './PhysicsLetters.js'
import Water from './Water.js'
import { WORLD_LAYOUT } from '../../../data/rooms.js'
import { buildHubProps } from './Rooms/HubRoom.js'
import { toonFlat } from '../Rendering/ToonMaterials.js'
import { CayucoRace } from '../Minigames/CayucoRace/RaceController.js'

const CAYUCO_POS = new THREE.Vector3(-6, 0, -13)
const INTERACT_RADIUS = 2.5

export default class World {
  constructor() {
    this.game = Game.getInstance()
    this.group = new THREE.Group()
    this.collectibles = []
    this.activeRoomId = 'hub'
    this.collectiblesCollected = 0
    this.totalCollectibles = 0
    this.activeRace = null
    this.nearCayuco = false
    this.interactPrompt = null

    this.buildFloor()
    this.buildBoundaryWalls()
    buildHubProps(this.group, this.game.physics)

    this.physicsLetters = new PhysicsLetters(this.group)
    this.physicsLetters.load()

    this.water = new Water(this.group)

    this.game.scene.add(this.group)
    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 5)

    this.interactHandler = (e) => {
      if ((e.key === 'e' || e.key === 'E') && this.nearCayuco && !this.activeRace) {
        this.startMinigame('cayuco-race')
      }
    }
    window.addEventListener('keydown', this.interactHandler)
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

  buildBoundaryWalls() {
    if (!this.game.physics) return
    const half = WORLD_LAYOUT.floorSize / 2
    const thickness = 1
    this.game.physics.createWall(0, -half - thickness / 2, WORLD_LAYOUT.floorSize + 2, thickness)
    this.game.physics.createWall(0, half + thickness / 2, WORLD_LAYOUT.floorSize + 2, thickness)
    this.game.physics.createWall(-half - thickness / 2, 0, thickness, WORLD_LAYOUT.floorSize + 2)
    this.game.physics.createWall(half + thickness / 2, 0, thickness, WORLD_LAYOUT.floorSize + 2)
  }

  enterRoom(roomId) {
    if (roomId === 'hub') {
      this.game.player.teleport(0, 2, 5)
      this.activeRoomId = 'hub'
    }
  }

  startMinigame(id) {
    if (id === 'cayuco-race') {
      if (this.activeRace) return
      this.activeRace = new CayucoRace(this.game)
      this.activeRace.on('exit', () => {
        this.activeRace = null
      })
      this.activeRace.start()
    }
  }

  update(elapsed) {
    const playerPos = this.game.player.mesh.position

    for (const c of this.collectibles) {
      c.update(elapsed)
      c.checkPickup(playerPos)
    }

    if (this.physicsLetters.loaded) {
      this.physicsLetters.update()
    }

    this.water.update(elapsed)

    if (!this.activeRace) {
      const dx = playerPos.x - CAYUCO_POS.x
      const dz = playerPos.z - CAYUCO_POS.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const wasNear = this.nearCayuco
      this.nearCayuco = dist < INTERACT_RADIUS

      if (this.nearCayuco && !wasNear) this.showInteractPrompt()
      if (!this.nearCayuco && wasNear) this.hideInteractPrompt()
    }
  }

  showInteractPrompt() {
    if (this.interactPrompt) return
    this.interactPrompt = document.createElement('div')
    this.interactPrompt.textContent = 'Press E to race'
    Object.assign(this.interactPrompt.style, {
      position: 'fixed',
      bottom: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '10px 20px',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      fontFamily: 'sans-serif',
      fontSize: '18px',
      borderRadius: '8px',
      zIndex: '1000',
      pointerEvents: 'none'
    })
    document.body.appendChild(this.interactPrompt)
  }

  hideInteractPrompt() {
    if (this.interactPrompt) {
      this.interactPrompt.remove()
      this.interactPrompt = null
    }
  }
}
