import Game from '../Game.js'

export default class HUD {
  constructor() {
    this.game = Game.getInstance()
    this.element = document.querySelector('.js-hud')
    this.visible = false
  }

  show() {
    this.visible = true
    this.element.style.display = ''
  }

  hide() {
    this.visible = false
    this.element.style.display = 'none'
  }
}
