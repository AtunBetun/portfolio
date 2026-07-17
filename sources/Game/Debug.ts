import Game from './Game.js'

interface DebugApi {
  debug: Record<string, unknown>
  readonly loadState: string
  readonly playerPosition: { x: number; y: number; z: number } | null
  readonly activeRoom: string | null
  readonly collectibles: number
  teleportPlayer(x: number, y: number, z: number): void
  enterRoom(roomId: string): void
}

declare global {
  interface Window {
    __game?: DebugApi
  }
}

export default class Debug {
  game: Game
  active: boolean
  spawnRoom: string | null

  constructor() {
    this.game = Game.getInstance()
    this.active = window.location.hash.includes('debug')
    this.spawnRoom = this.getHashParam('room')
  }

  getHashParam(key: string): string | null {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    return params.get(key)
  }

  expose(): void {
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
      teleportPlayer(x: number, y: number, z: number) {
        const p = Game.getInstance().player
        if (p) p.teleport(x, y, z)
      },
      enterRoom(roomId: string) {
        const w = Game.getInstance().world
        if (w) w.enterRoom(roomId)
      }
    }
  }

  emitLoadComplete(): void {
    document.dispatchEvent(new Event('load-complete'))
  }
}
