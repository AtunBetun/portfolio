import Game from './Game.js'

export default class Physics {
  constructor(RAPIER) {
    this.game = Game.getInstance()
    this.RAPIER = RAPIER
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 })
    this.world.timestep = 1 / 60

    this.game.ticker.events.on('tick', () => this.update(), 3)
  }

  update() {
    this.world.step()
  }

  createCollider(desc, body) {
    if (body) {
      return this.world.createCollider(desc, body)
    }
    return this.world.createCollider(desc)
  }

  createRigidBody(desc) {
    return this.world.createRigidBody(desc)
  }

  createWall(x, z, width, depth) {
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.3, z)
    const body = this.world.createRigidBody(bodyDesc)
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(width / 2, 1, depth / 2)
    this.world.createCollider(colliderDesc, body)
    return body
  }
}
