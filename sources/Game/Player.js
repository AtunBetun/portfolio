import * as THREE from 'three'
import Game from './Game.js'
import { toon } from './Rendering/ToonMaterials.js'
import { PALETTE } from './Rendering/Palette.js'

export default class Player {
  constructor() {
    this.game = Game.getInstance()
    this.speed = 6
    this.velocity = new THREE.Vector3()
    this.direction = new THREE.Vector3(0, 0, -1)

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

    const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.3, 4, 8)
    const body = new THREE.Mesh(bodyGeo, toon('playerShirt'))
    body.position.y = 0.35
    body.castShadow = true
    group.add(body)

    const headGeo = new THREE.SphereGeometry(0.13, 8, 6)
    const head = new THREE.Mesh(headGeo, toon('skin'))
    head.position.y = 0.7
    head.castShadow = true
    group.add(head)

    const hairGeo = new THREE.SphereGeometry(0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    const hair = new THREE.Mesh(hairGeo, toon('playerHair'))
    hair.position.y = 0.72
    group.add(hair)

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6)
    const legMat = toon('playerPants')
    const leftLeg = new THREE.Mesh(legGeo, legMat)
    leftLeg.position.set(-0.08, 0.12, 0)
    group.add(leftLeg)
    const rightLeg = new THREE.Mesh(legGeo, legMat)
    rightLeg.position.set(0.08, 0.12, 0)
    group.add(rightLeg)

    group.position.set(0, 0.0, 0)
    return group
  }

  createTrail() {
    const light = new THREE.PointLight(PALETTE.accent, 0.6, 2.5)
    light.position.copy(this.mesh.position)
    light.position.y = 0.1
    return light
  }

  setupPhysics() {
    const RAPIER = this.game.physics.RAPIER
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.3, 0)
      .lockRotations()
      .setLinearDamping(10)
    this.body = this.game.physics.createRigidBody(bodyDesc)

    const colliderDesc = RAPIER.ColliderDesc.capsule(0.15, 0.25).setFriction(0).setRestitution(0)
    this.collider = this.game.physics.createCollider(colliderDesc, this.body)
  }

  update(delta) {
    const kb = this.game.keyboard
    const touch = this.game.touch
    this.velocity.set(0, 0, 0)

    if (touch && touch.active && (touch.direction.x !== 0 || touch.direction.z !== 0)) {
      this.velocity.x = touch.direction.x
      this.velocity.z = touch.direction.z
    } else {
      if (kb.up) this.velocity.z -= 1
      if (kb.down) this.velocity.z += 1
      if (kb.left) this.velocity.x -= 1
      if (kb.right) this.velocity.x += 1
    }

    if (this.body) {
      if (this.velocity.lengthSq() > 0) {
        this.velocity.normalize()
        this.direction.copy(this.velocity)
        this.body.setLinvel(
          { x: this.velocity.x * this.speed, y: 0, z: this.velocity.z * this.speed },
          true
        )
      } else {
        this.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      }

      const pos = this.body.translation()
      this.mesh.position.set(pos.x, 0.3, pos.z)
      this.body.setTranslation({ x: pos.x, y: 0.3, z: pos.z }, true)
    } else {
      if (this.velocity.lengthSq() > 0) {
        this.velocity.normalize().multiplyScalar(this.speed * delta)
        this.direction.copy(this.velocity).normalize()
        this.mesh.position.add(this.velocity)
      }
    }

    if (this.direction.lengthSq() > 0) {
      const angle = Math.atan2(this.direction.x, this.direction.z)
      this.mesh.rotation.y = angle
    }

    this.trail.position.set(this.mesh.position.x, 0.1, this.mesh.position.z)
    this.game.camera.follow(this.mesh.position)
  }
}
