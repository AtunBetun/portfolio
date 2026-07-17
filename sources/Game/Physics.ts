import type RAPIER_NS from '@dimforge/rapier3d'
import Game from './Game.js'
import { TERRAIN, buildHeightGrid } from '../../data/terrain.js'

export const GRAVITY = 22

interface DynamicBodyOpts {
  linearDamping?: number
  angularDamping?: number
  lockRotations?: boolean
}

interface Vec3 {
  x: number
  y: number
  z: number
}

export default class Physics {
  game: Game
  RAPIER: typeof RAPIER_NS
  world: RAPIER_NS.World
  characterController: RAPIER_NS.KinematicCharacterController
  heightGrid: Float32Array | null = null

  constructor(RAPIER: typeof RAPIER_NS) {
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

    this.buildTerrain()
    this.game.ticker.events.on('tick', () => this.update(), 3)
  }

  update(): void {
    this.world.step()
  }

  buildTerrain(): void {
    this.heightGrid = buildHeightGrid()
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
    const body = this.world.createRigidBody(bodyDesc)

    const nrows = TERRAIN.res
    const ncols = TERRAIN.res
    const scale = { x: TERRAIN.size, y: 1, z: TERRAIN.size }

    const colliderDesc = this.RAPIER.ColliderDesc.heightfield(
      nrows,
      ncols,
      this.heightGrid,
      scale,
      this.RAPIER.HeightFieldFlags.FIX_INTERNAL_EDGES
    )

    colliderDesc.setFriction(0.8).setRestitution(0)
    this.world.createCollider(colliderDesc, body)
  }

  createDynamicBody(
    x: number,
    y: number,
    z: number,
    opts: DynamicBodyOpts = {}
  ): RAPIER_NS.RigidBody {
    const desc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(opts.linearDamping ?? 0.5)
      .setAngularDamping(opts.angularDamping ?? 0.5)
    if (opts.lockRotations) desc.lockRotations()
    return this.world.createRigidBody(desc)
  }

  createKinematicBody(x: number, y: number, z: number): RAPIER_NS.RigidBody {
    const desc = this.RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z)
    return this.world.createRigidBody(desc)
  }

  createStaticBody(x: number, y: number, z: number): RAPIER_NS.RigidBody {
    const desc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z)
    return this.world.createRigidBody(desc)
  }

  createCollider(desc: RAPIER_NS.ColliderDesc, body?: RAPIER_NS.RigidBody): RAPIER_NS.Collider {
    if (body) return this.world.createCollider(desc, body)
    return this.world.createCollider(desc)
  }

  createRigidBody(desc: RAPIER_NS.RigidBodyDesc): RAPIER_NS.RigidBody {
    return this.world.createRigidBody(desc)
  }

  castRay(
    origin: Vec3,
    direction: Vec3,
    maxToi: number,
    excludeCollider?: RAPIER_NS.Collider | null
  ): RAPIER_NS.RayColliderHit | null {
    const ray = new this.RAPIER.Ray(origin, direction)
    const hit = this.world.castRay(
      ray,
      maxToi,
      true,
      undefined,
      undefined,
      excludeCollider ?? undefined
    )
    return hit
  }
}
