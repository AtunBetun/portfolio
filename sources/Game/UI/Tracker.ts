import Game from '../Game.js'

export default class Tracker {
  game: Game
  countEl: HTMLElement
  totalEl: HTMLElement
  collected: number = 0
  total: number = 0

  constructor() {
    this.game = Game.getInstance()
    this.countEl = document.querySelector('.js-tracker-count') as HTMLElement
    this.totalEl = document.querySelector('.js-tracker-total') as HTMLElement
  }

  setTotal(n: number): void {
    this.total = n
    this.totalEl.textContent = String(n)
  }

  increment(): void {
    this.collected++
    this.countEl.textContent = String(this.collected)
    this.game.world!.collectiblesCollected = this.collected
  }

  reset(): void {
    this.collected = 0
    this.countEl.textContent = '0'
  }
}
