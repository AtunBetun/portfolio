import Game from '../Game.js'
import Room from './Room.js'
import { ROOM_GRAPH } from '../../../data/rooms.js'
import { CAREER_CONTENT } from '../../../data/content-map.js'

export default class World {
  constructor() {
    this.game = Game.getInstance()
    this.rooms = {}
    this.activeRoom = null
    this.activeRoomId = null
    this.collectiblesCollected = 0
    this.totalCollectibles = 0
    this.transitioning = false

    this.buildRooms()

    const startRoom = this.game.debug.spawnRoom || 'hub'
    this.enterRoom(startRoom)

    this.game.ticker.events.on('tick', () => this.update(), 5)
  }

  buildRooms() {
    for (const [id, config] of Object.entries(ROOM_GRAPH)) {
      this.rooms[id] = new Room(config)
    }
  }

  enterRoom(roomId) {
    if (this.transitioning) return
    if (!this.rooms[roomId]) return

    if (this.activeRoom) {
      this.activeRoom.hide()
    }

    this.game.panel.hide()

    this.activeRoom = this.rooms[roomId]
    this.activeRoomId = roomId
    this.activeRoom.show()

    const spawn = this.activeRoom.getSpawn()
    this.game.player.mesh.position.set(spawn.x, 0.3, spawn.z)

    const roomConfig = ROOM_GRAPH[roomId]
    if (roomConfig.contentKey && CAREER_CONTENT[roomConfig.contentKey]) {
      setTimeout(() => {
        this.game.panel.showRoomContent(CAREER_CONTENT[roomConfig.contentKey])
      }, 400)
    }
  }

  update() {
    if (!this.activeRoom || this.transitioning) return

    const playerPos = this.game.player.mesh.position
    const door = this.activeRoom.checkDoorCollisions(playerPos)

    if (door && !door.locked && door.target) {
      this.transition(door.target)
    }
  }

  transition(targetRoomId) {
    this.transitioning = true
    this.enterRoom(targetRoomId)
    setTimeout(() => {
      this.transitioning = false
    }, 500)
  }
}
