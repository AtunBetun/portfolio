import Game from '../Game.js'
import Room from './Room.js'
import { ROOM_GRAPH } from '../../../data/rooms.js'
import { CAREER_CONTENT } from '../../../data/content-map.js'
import { buildPGProps, getPGCollectibles } from './Rooms/PGRoom.js'
import { buildBlackstoneProps, getBlackstoneCollectibles } from './Rooms/BlackstoneRoom.js'
import { buildAmazonProps, getAmazonCollectibles } from './Rooms/AmazonRoom.js'

const ROOM_BUILDERS = {
  'career-pg': { buildProps: buildPGProps, collectibles: getPGCollectibles() },
  'career-blackstone': {
    buildProps: buildBlackstoneProps,
    collectibles: getBlackstoneCollectibles()
  },
  'career-amazon': { buildProps: buildAmazonProps, collectibles: getAmazonCollectibles() }
}

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
    this.countCollectibles()

    const startRoom = this.game.debug.spawnRoom || 'hub'
    this.enterRoom(startRoom)

    this.game.ticker.events.on('tick', (delta, elapsed) => this.update(delta, elapsed), 5)
  }

  buildRooms() {
    for (const [id, config] of Object.entries(ROOM_GRAPH)) {
      const options = ROOM_BUILDERS[id] || {}
      this.rooms[id] = new Room(config, options)
    }
  }

  countCollectibles() {
    let total = 0
    for (const room of Object.values(this.rooms)) {
      total += room.collectibles.length
    }
    this.totalCollectibles = total
    this.game.tracker.setTotal(total)
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

  update(_delta, elapsed) {
    if (!this.activeRoom || this.transitioning) return

    const playerPos = this.game.player.mesh.position
    this.activeRoom.update(elapsed, playerPos)

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
