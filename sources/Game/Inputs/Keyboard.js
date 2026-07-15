import Game from '../Game.js'

export default class Keyboard {
  constructor() {
    this.game = Game.getInstance()
    this.keys = {}
    this.locked = false

    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  onKeyDown(e) {
    if (this.locked) return
    this.keys[e.code] = true
  }

  onKeyUp(e) {
    this.keys[e.code] = false
  }

  isDown(code) {
    return !!this.keys[code]
  }

  get up() {
    return this.isDown('KeyW') || this.isDown('ArrowUp')
  }

  get down() {
    return this.isDown('KeyS') || this.isDown('ArrowDown')
  }

  get left() {
    return this.isDown('KeyA') || this.isDown('ArrowLeft')
  }

  get right() {
    return this.isDown('KeyD') || this.isDown('ArrowRight')
  }

  get jump() {
    return this.isDown('Space')
  }

  get sprint() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight')
  }

  lock() {
    this.locked = true
    this.keys = {}
  }

  unlock() {
    this.locked = false
  }
}
