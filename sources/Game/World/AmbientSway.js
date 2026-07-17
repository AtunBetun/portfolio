import Game from '../Game.js'

export default class AmbientSway {
  constructor() {
    this.game = Game.getInstance()
    this.targets = []

    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 8)
  }

  register(object, { axis = 'z', amp = 0.06, freq = 1.4, phase = 0 }) {
    this.targets.push({
      object,
      axis,
      amp,
      freq,
      phase,
      base: object.rotation[axis]
    })
  }

  update(elapsed) {
    for (const t of this.targets) {
      t.object.rotation[t.axis] = t.base + Math.sin(elapsed * t.freq + t.phase) * t.amp
    }
  }
}
