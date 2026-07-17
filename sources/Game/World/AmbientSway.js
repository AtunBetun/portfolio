import Game from '../Game.js'

export default class AmbientSway {
  constructor() {
    this.game = Game.getInstance()
    this.targets = []

    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 8)
  }

  register(object, { prop = 'rotation', axis = 'z', amp = 0.06, freq = 1.4, phase = 0 }) {
    this.targets.push({
      object,
      prop,
      axis,
      amp,
      freq,
      phase,
      base: object[prop][axis]
    })
  }

  update(elapsed) {
    for (const t of this.targets) {
      t.object[t.prop][t.axis] = t.base + Math.sin(elapsed * t.freq + t.phase) * t.amp
    }
  }
}
