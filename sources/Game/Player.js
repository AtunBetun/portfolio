import * as THREE from 'three'
import Game from './Game.js'
import { toon } from './Rendering/ToonMaterials.js'
import { PALETTE } from './Rendering/Palette.js'
import { WORLD_LAYOUT } from '../../data/rooms.js'
import Events from './Events.js'

export const TUNING = {
  speed: 8,
  accel: 55,
  decel: 80,
  airControl: 0.3,
  jumpSpeed: 8.2,
  jumpCutMultiplier: 0.45,
  gravityUp: 22,
  gravityDown: 38,
  apexHangMult: 0.55,
  apexThreshold: 1.5,
  terminalVelocity: -25,
  groundStick: -1.5,
  coyoteTime: 0.12,
  jumpBuffer: 0.12,
  turnSpeed: 12
}

export default class Player {
  constructor() {
    this.game = Game.getInstance()
    this.events = new Events()
    this.velocity = new THREE.Vector3()
    this.horizVel = new THREE.Vector2(0, 0)
    this.direction = new THREE.Vector3(0, 0, -1)
    this.verticalVelocity = 0
    this.grounded = false
    this.wasGrounded = false
    this.elapsed = 0

    this.coyoteTimer = 0
    this.bufferTimer = 0
    this.jumpHeld = false
    this.jumpPressedLastFrame = false
    this.state = 'idle'

    this.mesh = this.createMesh()
    this.game.scene.add(this.mesh)

    this.trail = this.createTrail()
    this.game.scene.add(this.trail)

    this.body = null
    this.collider = null
    if (this.game.physics) {
      this.setupPhysics()
    }

    this.game.ticker.events.on('tick', (delta) => this.update(delta), 6)
  }

  createMesh() {
    const group = new THREE.Group()

    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.4, 4, 8)
    const body = new THREE.Mesh(bodyGeo, toon('playerShirt'))
    body.position.y = 0.5
    body.castShadow = true
    group.add(body)

    const headGeo = new THREE.SphereGeometry(0.18, 8, 6)
    const head = new THREE.Mesh(headGeo, toon('skin'))
    head.position.y = 0.95
    head.castShadow = true
    group.add(head)

    const hairGeo = new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    const hair = new THREE.Mesh(hairGeo, toon('playerHair'))
    hair.position.y = 0.98
    group.add(hair)

    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6)
    const legMat = toon('playerPants')
    this.leftLeg = new THREE.Mesh(legGeo, legMat)
    this.leftLeg.position.set(-0.1, 0.15, 0)
    group.add(this.leftLeg)
    this.rightLeg = new THREE.Mesh(legGeo, legMat)
    this.rightLeg.position.set(0.1, 0.15, 0)
    group.add(this.rightLeg)

    const spawn = WORLD_LAYOUT.playerSpawn
    group.position.set(spawn.x, spawn.y, spawn.z)
    return group
  }

  createTrail() {
    const light = new THREE.PointLight(PALETTE.accent, 0.6, 3)
    light.position.copy(this.mesh.position)
    light.position.y = 0.1
    return light
  }

  setupPhysics() {
    const RAPIER = this.game.physics.RAPIER
    const spawn = WORLD_LAYOUT.playerSpawn
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      spawn.x,
      spawn.y,
      spawn.z
    )
    this.body = this.game.physics.createRigidBody(bodyDesc)

    const colliderDesc = RAPIER.ColliderDesc.capsule(0.35, 0.25)
      .setTranslation(0, 0.6, 0)
      .setFriction(0)
      .setRestitution(0)
    this.collider = this.game.physics.createCollider(colliderDesc, this.body)
  }

  update(delta) {
    const kb = this.game.keyboard
    const touch = this.game.touch
    this.elapsed += delta

    const raw = new THREE.Vector3()
    if (touch && touch.active && (touch.direction.x !== 0 || touch.direction.z !== 0)) {
      raw.x = touch.direction.x
      raw.z = touch.direction.z
    } else {
      if (kb.up) raw.z -= 1
      if (kb.down) raw.z += 1
      if (kb.left) raw.x -= 1
      if (kb.right) raw.x += 1
    }

    if (raw.lengthSq() > 0) raw.normalize()

    const camForward = new THREE.Vector3()
    this.game.camera.instance.getWorldDirection(camForward)
    camForward.y = 0
    camForward.normalize()

    const camRight = new THREE.Vector3()
    camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize()

    const input = new THREE.Vector3()
    input.addScaledVector(camRight, raw.x)
    input.addScaledVector(camForward, -raw.z)

    const inputActive = input.lengthSq() > 0.001
    const jumpPressed = kb.jump || (touch && touch.jumpPressed)
    const jumpJustPressed = jumpPressed && !this.jumpPressedLastFrame
    const jumpReleasedThisFrame = !jumpPressed && this.jumpPressedLastFrame
    this.jumpPressedLastFrame = jumpPressed

    if (this.body) {
      this.updatePhysics(delta, input, inputActive, jumpJustPressed, jumpReleasedThisFrame)
    } else {
      if (inputActive) {
        this.mesh.position.x += input.x * TUNING.speed * delta
        this.mesh.position.z += input.z * TUNING.speed * delta
      }
    }

    if (inputActive) {
      this.direction.copy(input).normalize()
    }

    if (this.direction.lengthSq() > 0) {
      const targetAngle = Math.atan2(this.direction.x, this.direction.z)
      this.mesh.rotation.y = dampAngle(
        this.mesh.rotation.y,
        targetAngle,
        1 - Math.exp(-TUNING.turnSpeed * delta)
      )
    }

    this.animateLegs(inputActive, delta)

    this.trail.position.set(this.mesh.position.x, 0.1, this.mesh.position.z)
    this.game.camera.follow(this.mesh.position, inputActive ? this.direction : null)

    this.updateState(inputActive)

    if (window.__game) {
      window.__game.debug = window.__game.debug || {}
      window.__game.debug.playerState = this.state
    }
  }

  updatePhysics(delta, input, inputActive, jumpJustPressed, jumpReleasedThisFrame) {
    const controller = this.game.physics.characterController
    const T = TUNING

    const bushMul = this.getBushSpeedMultiplier()

    const targetX = inputActive ? input.x * T.speed * bushMul : 0
    const targetZ = inputActive ? input.z * T.speed * bushMul : 0

    let rate
    if (!this.grounded && !inputActive) {
      rate = 0
    } else {
      rate = (inputActive ? T.accel : T.decel) * (this.grounded ? 1 : T.airControl)
    }

    this.horizVel.x = moveToward(this.horizVel.x, targetX, rate * delta)
    this.horizVel.y = moveToward(this.horizVel.y, targetZ, rate * delta)

    this.coyoteTimer = this.grounded ? T.coyoteTime : this.coyoteTimer - delta
    this.bufferTimer = jumpJustPressed ? T.jumpBuffer : this.bufferTimer - delta

    if (this.bufferTimer > 0 && this.coyoteTimer > 0) {
      this.verticalVelocity = T.jumpSpeed
      this.bufferTimer = 0
      this.coyoteTimer = 0
      this.events.trigger('player:jump')
    }

    if (jumpReleasedThisFrame && this.verticalVelocity > 0) {
      this.verticalVelocity *= T.jumpCutMultiplier
    }

    let g
    if (this.verticalVelocity > 0) {
      g = T.gravityUp
    } else {
      g = T.gravityDown
    }
    if (Math.abs(this.verticalVelocity) < T.apexThreshold && !this.grounded) {
      g = T.gravityUp * T.apexHangMult
    }

    this.verticalVelocity = Math.max(this.verticalVelocity - g * delta, T.terminalVelocity)

    if (this.grounded && this.verticalVelocity < 0) {
      this.verticalVelocity = T.groundStick
    }

    const moveX = this.horizVel.x * delta
    const moveZ = this.horizVel.y * delta
    const moveY = this.verticalVelocity * delta

    const movement = { x: moveX, y: moveY, z: moveZ }
    controller.computeColliderMovement(this.collider, movement)
    const computed = controller.computedMovement()

    const pos = this.body.translation()
    const newPos = {
      x: pos.x + computed.x,
      y: pos.y + computed.y,
      z: pos.z + computed.z
    }
    this.body.setNextKinematicTranslation(newPos)

    this.wasGrounded = this.grounded
    this.grounded = controller.computedGrounded()

    if (!this.grounded && this.verticalVelocity <= 0 && this.game.physics) {
      const feet = { x: newPos.x, y: newPos.y + 0.05, z: newPos.z }
      const down = { x: 0, y: -1, z: 0 }
      const hit = this.game.physics.castRay(feet, down, 0.15, this.collider)
      if (hit) this.grounded = true
    }

    if (this.grounded && this.verticalVelocity <= 0) {
      this.verticalVelocity = T.groundStick
    }

    this.mesh.position.set(newPos.x, newPos.y, newPos.z)

    if (newPos.y < WORLD_LAYOUT.killPlaneY) {
      const spawn = WORLD_LAYOUT.playerSpawn
      this.teleport(spawn.x, spawn.y, spawn.z)
    }
  }

  getBushSpeedMultiplier() {
    if (!this.game.world) return 1
    const px = this.mesh.position.x
    const pz = this.mesh.position.z
    for (const b of this.game.world.bushes) {
      if ((px - b.x) ** 2 + (pz - b.z) ** 2 < (b.r + 0.3) ** 2) {
        return 0.55
      }
    }
    return 1
  }

  updateState(inputActive) {
    const T = TUNING
    const horizSpeed = Math.sqrt(this.horizVel.x ** 2 + this.horizVel.y ** 2)

    if (!this.wasGrounded && this.grounded) {
      this.state = 'land'
    } else if (this.grounded) {
      this.state = inputActive && horizSpeed > 0.1 ? 'run' : 'idle'
    } else if (this.verticalVelocity > T.apexThreshold) {
      this.state = 'jump'
    } else if (Math.abs(this.verticalVelocity) <= T.apexThreshold) {
      this.state = 'apex'
    } else {
      this.state = 'fall'
    }
  }

  animateLegs(moving) {
    if (moving && this.grounded) {
      const swing = Math.sin(this.elapsed * 12) * 0.4
      this.leftLeg.rotation.x = swing
      this.rightLeg.rotation.x = -swing
    } else {
      this.leftLeg.rotation.x *= 0.85
      this.rightLeg.rotation.x *= 0.85
    }
  }

  teleport(x, y, z) {
    this.mesh.position.set(x, y, z)
    if (this.body) {
      this.body.setTranslation({ x, y, z }, true)
    }
    this.verticalVelocity = 0
    this.horizVel.set(0, 0)
    this.coyoteTimer = 0
    this.bufferTimer = 0
  }
}

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target
  return current + Math.sign(target - current) * maxDelta
}

function dampAngle(current, target, t) {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * t
}
