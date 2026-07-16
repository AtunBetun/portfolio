import * as THREE from 'three'
import Game from './Game.js'
import { toon } from './Rendering/ToonMaterials.js'
import { PALETTE } from './Rendering/Palette.js'
import { WORLD_LAYOUT } from '../../data/rooms.js'

export default class Player {
  constructor() {
    this.game = Game.getInstance()
    this.speed = 8
    this.jumpImpulse = 7
    this.airControl = 0.3
    this.velocity = new THREE.Vector3()
    this.direction = new THREE.Vector3(0, 0, -1)
    this.verticalVelocity = 0
    this.grounded = false
    this.elapsed = 0

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

    if (this.body) {
      const controller = this.game.physics.characterController
      const control = this.grounded ? 1 : this.airControl
      const moveX = input.x * this.speed * control * delta
      const moveZ = input.z * this.speed * control * delta

      this.verticalVelocity -= 15 * delta
      const jumpPressed = kb.jump || (touch && touch.jumpPressed)
      if (this.grounded && jumpPressed) {
        this.verticalVelocity = this.jumpImpulse
      }
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

      this.grounded = controller.computedGrounded()
      if (this.grounded && this.verticalVelocity < 0) {
        this.verticalVelocity = 0
      }

      this.mesh.position.set(newPos.x, newPos.y, newPos.z)

      if (newPos.y < WORLD_LAYOUT.killPlaneY) {
        const spawn = WORLD_LAYOUT.playerSpawn
        this.teleport(spawn.x, spawn.y, spawn.z)
      }
    } else {
      if (input.lengthSq() > 0) {
        this.mesh.position.x += input.x * this.speed * delta
        this.mesh.position.z += input.z * this.speed * delta
      }
    }

    if (input.lengthSq() > 0) {
      this.direction.copy(input).normalize()
    }

    if (this.direction.lengthSq() > 0) {
      const angle = Math.atan2(this.direction.x, this.direction.z)
      this.mesh.rotation.y = angle
    }

    this.animateLegs(input.lengthSq() > 0, delta)

    this.trail.position.set(this.mesh.position.x, 0.1, this.mesh.position.z)
    this.game.camera.follow(this.mesh.position, input.lengthSq() > 0 ? this.direction : null)
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
  }
}
