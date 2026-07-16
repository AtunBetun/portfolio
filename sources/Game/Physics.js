import Game from './Game.js'
import { WORLD_LAYOUT } from '../../data/rooms.js'

export const GRAVITY = 22

export default class Physics {
  constructor(RAPIER) {
    this.game = Game.getInstance()
    this.RAPIER = RAPIER
    this.world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 })
    this.world.timestep = 1 / 60

    this.characterController = this.world.createCharacterController(0.03)
    this.characterController.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    this.characterController.setMinSlopeSlideAngle((55 * Math.PI) / 180)
    this.characterController.enableAutostep(0.3, 0.12, false)
    this.characterController.enableSnapToGround(0.4)
    this.characterController.setApplyImpulsesToDynamicBodies(true)
    this.characterController.setCharacterMass(3.0)
    this.characterController.setSlideEnabled(true)

    this.buildGround()
    this.game.ticker.events.on('tick', () => this.update(), 3)
  }

  update() {
    this.world.step()
  }

  buildGround() {
    const half = WORLD_LAYOUT.floorSize / 2
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)
    const body = this.world.createRigidBody(bodyDesc)
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(half, 0.5, half)
      .setFriction(0.8)
      .setRestitution(0)
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

  castRay(origin, direction, maxToi, excludeCollider) {
    const ray = new this.RAPIER.Ray(origin, direction)
    const hit = this.world.castRay(ray, maxToi, true, undefined, undefined, excludeCollider)
    return hit
  }
}
