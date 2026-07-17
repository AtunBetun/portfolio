import * as THREE from 'three'
import Events from './Events.js'

export interface TickerEvents {
  tick: (delta: number, elapsed: number) => void
}

export default class Ticker {
  events: Events<TickerEvents> = new Events<TickerEvents>()
  elapsed: number = 0
  delta: number = 0
  lastTime: number = 0
  maxDelta: number = 1 / 30
  running: boolean = false

  start(renderer: THREE.WebGLRenderer): void {
    this.running = true
    renderer.setAnimationLoop((time) => this.update(time))
  }

  update(time: number): void {
    const timeSeconds = time / 1000
    this.delta = Math.min(timeSeconds - this.lastTime, this.maxDelta)
    this.lastTime = timeSeconds
    this.elapsed = timeSeconds
    this.events.trigger('tick', this.delta, this.elapsed)
  }

  stop(): void {
    this.running = false
  }
}
