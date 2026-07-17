import Game from '../Game.js'

export default class HUD {
  game: Game
  element: HTMLElement
  visible: boolean = false

  constructor() {
    this.game = Game.getInstance()
    this.element = document.querySelector('.js-hud') as HTMLElement
  }

  show(): void {
    this.visible = true
    this.element.style.display = ''
  }

  hide(): void {
    this.visible = false
    this.element.style.display = 'none'
  }
}
