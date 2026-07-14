import Game from './Game.js'

export default class Physics {
  constructor(RAPIER) {
    this.game = Game.getInstance()
    this.RAPIER = RAPIER
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    this.world.timestep = 1 / 60

    this.game.ticker.events.on('tick', (delta) => this.update(delta), 3)
  }

  update(_delta) {
    this.world.step()
  }

  createCollider(desc) {
    return this.world.createCollider(desc)
  }

  createRigidBody(desc) {
    return this.world.createRigidBody(desc)
  }

  removeRigidBody(body) {
    this.world.removeRigidBody(body)
  }
}
