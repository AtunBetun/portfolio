import Game from '../Game.js'

export default class Keyboard {
  game: Game
  keys: Record<string, boolean> = {}
  locked: boolean = false

  constructor() {
    this.game = Game.getInstance()

    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  onKeyDown(e: KeyboardEvent): void {
    if (this.locked) return
    this.keys[e.code] = true
  }

  onKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false
  }

  isDown(code: string): boolean {
    return !!this.keys[code]
  }

  get up(): boolean {
    return this.isDown('KeyW') || this.isDown('ArrowUp')
  }

  get down(): boolean {
    return this.isDown('KeyS') || this.isDown('ArrowDown')
  }

  get left(): boolean {
    return this.isDown('KeyA') || this.isDown('ArrowLeft')
  }

  get right(): boolean {
    return this.isDown('KeyD') || this.isDown('ArrowRight')
  }

  get jump(): boolean {
    return this.isDown('Space')
  }

  get sprint(): boolean {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight')
  }

  lock(): void {
    this.locked = true
    this.keys = {}
  }

  unlock(): void {
    this.locked = false
  }
}
