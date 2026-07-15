import * as THREE from 'three'
import Game from './Game.js'
import { toon } from './Rendering/ToonMaterials.js'
import { PALETTE } from './Rendering/Palette.js'

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

    group.position.set(0, 2, 0)
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
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2, 0)
    this.body = this.game.physics.createRigidBody(bodyDesc)

    const colliderDesc = RAPIER.ColliderDesc.capsule(0.25, 0.2).setFriction(0).setRestitution(0)
    this.collider = this.game.physics.createCollider(colliderDesc, this.body)
  }

  update(delta) {
    const kb = this.game.keyboard
    const touch = this.game.touch
    this.elapsed += delta

    const input = new THREE.Vector3()
    if (touch && touch.active && (touch.direction.x !== 0 || touch.direction.z !== 0)) {
      input.x = touch.direction.x
      input.z = touch.direction.z
    } else {
      if (kb.up) input.z -= 1
      if (kb.down) input.z += 1
      if (kb.left) input.x -= 1
      if (kb.right) input.x += 1
    }

    if (input.lengthSq() > 0) input.normalize()

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
    this.game.camera.follow(this.mesh.position, this.direction)
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
      this.body.setNextKinematicTranslation({ x, y, z })
    }
    this.verticalVelocity = 0
  }
}
