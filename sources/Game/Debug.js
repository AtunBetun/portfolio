import Game from './Game.js'

export default class Debug {
  constructor() {
    this.game = Game.getInstance()
    this.active = window.location.hash.includes('debug')
    this.spawnRoom = this.getHashParam('room')
  }

  getHashParam(key) {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    return params.get(key)
  }

  expose() {
    window.__game = {
      debug: {},
      get loadState() {
        return Game.getInstance().loadState
      },
      get playerPosition() {
        const p = Game.getInstance().player
        if (!p) return null
        return { x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z }
      },
      get activeRoom() {
        const w = Game.getInstance().world
        return w ? w.activeRoomId : null
      },
      get collectibles() {
        const w = Game.getInstance().world
        return w ? w.collectiblesCollected : 0
      },
      teleportPlayer(x, y, z) {
        const p = Game.getInstance().player
        if (p) p.teleport(x, y, z)
      },
      enterRoom(roomId) {
        const w = Game.getInstance().world
        if (w) w.enterRoom(roomId)
      }
    }
  }

  emitLoadComplete() {
    document.dispatchEvent(new Event('load-complete'))
  }
}
