import Game from './Game.js'

export default class Physics {
  constructor(RAPIER) {
    this.game = Game.getInstance()
    this.RAPIER = RAPIER
    this.world = new RAPIER.World({ x: 0, y: -15, z: 0 })
    this.world.timestep = 1 / 60

    this.characterController = this.world.createCharacterController(0.02)
    this.characterController.enableAutostep(0.3, 0.15, true)
    this.characterController.enableSnapToGround(0.3)
    this.characterController.setApplyImpulsesToDynamicBodies(true)

    this.buildGround()
    this.game.ticker.events.on('tick', () => this.update(), 3)
  }

  update() {
    this.world.step()
  }

  buildGround() {
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0)
    const body = this.world.createRigidBody(bodyDesc)
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(30, 0.05, 30).setFriction(0.8)
    this.world.createCollider(colliderDesc, body)
  }

  createDynamicBody(x, y, z, opts = {}) {
    const desc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(opts.linearDamping ?? 0.5)
      .setAngularDamping(opts.angularDamping ?? 0.5)
    if (opts.lockRotations) desc.lockRotations()
    return this.world.createRigidBody(desc)
  }

  createKinematicBody(x, y, z) {
    const desc = this.RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z)
    return this.world.createRigidBody(desc)
  }

  createStaticBody(x, y, z) {
    const desc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z)
    return this.world.createRigidBody(desc)
  }

  createCollider(desc, body) {
    if (body) return this.world.createCollider(desc, body)
    return this.world.createCollider(desc)
  }

  createRigidBody(desc) {
    return this.world.createRigidBody(desc)
  }

  createWall(x, z, width, depth) {
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, 1.5, z)
    const body = this.world.createRigidBody(bodyDesc)
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(width / 2, 3, depth / 2)
    this.world.createCollider(colliderDesc, body)
    return body
  }

  castRay(origin, direction, maxToi) {
    const ray = new this.RAPIER.Ray(origin, direction)
    return this.world.castRay(ray, maxToi, true)
  }
}
