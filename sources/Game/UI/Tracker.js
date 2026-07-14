import Game from '../Game.js'

export default class Tracker {
  constructor() {
    this.game = Game.getInstance()
    this.countEl = document.querySelector('.js-tracker-count')
    this.totalEl = document.querySelector('.js-tracker-total')
    this.collected = 0
    this.total = 0
  }

  setTotal(n) {
    this.total = n
    this.totalEl.textContent = n
  }

  increment() {
    this.collected++
    this.countEl.textContent = this.collected
    this.game.world.collectiblesCollected = this.collected
  }

  reset() {
    this.collected = 0
    this.countEl.textContent = '0'
  }
}
