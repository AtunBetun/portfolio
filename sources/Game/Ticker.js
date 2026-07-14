import Events from './Events.js'

export default class Ticker {
  constructor() {
    this.events = new Events()
    this.elapsed = 0
    this.delta = 0
    this.lastTime = 0
    this.maxDelta = 1 / 30
    this.running = false
  }

  start(renderer) {
    this.running = true
    renderer.setAnimationLoop((time) => this.update(time))
  }

  update(time) {
    const timeSeconds = time / 1000
    this.delta = Math.min(timeSeconds - this.lastTime, this.maxDelta)
    this.lastTime = timeSeconds
    this.elapsed = timeSeconds
    this.events.trigger('tick', this.delta, this.elapsed)
  }

  stop() {
    this.running = false
  }
}
