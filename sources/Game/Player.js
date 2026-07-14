import * as THREE from 'three'
import Game from './Game.js'

export default class Player {
  constructor() {
    this.game = Game.getInstance()
    this.speed = 5
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

    this.game.ticker.events.on('tick', (delta) => this.update(delta), 1)
  }

  createMesh() {
    const geometry = new THREE.OctahedronGeometry(0.3, 0)
    const material = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      flatShading: true,
      emissive: 0x00ff41,
      emissiveIntensity: 0.1
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, 0.3, 0)
    mesh.castShadow = true
    return mesh
  }

  createTrail() {
    const light = new THREE.PointLight(0x00ff41, 1, 3)
    light.position.copy(this.mesh.position)
    light.position.y = 0.1
    return light
  }

  setupPhysics() {
    const RAPIER = this.game.physics.RAPIER
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z
    )
    this.body = this.game.physics.createRigidBody(bodyDesc)

    const colliderDesc = RAPIER.ColliderDesc.ball(0.3)
    this.collider = this.game.physics.createCollider(colliderDesc, this.body)
  }

  update(delta) {
    const kb = this.game.keyboard
    this.velocity.set(0, 0, 0)

    if (kb.up) this.velocity.z -= 1
    if (kb.down) this.velocity.z += 1
    if (kb.left) this.velocity.x -= 1
    if (kb.right) this.velocity.x += 1

    if (this.velocity.lengthSq() > 0) {
      this.velocity.normalize().multiplyScalar(this.speed * delta)
      this.direction.copy(this.velocity).normalize()
      this.mesh.position.add(this.velocity)

      const angle = Math.atan2(this.direction.x, this.direction.z)
      this.mesh.rotation.y = angle
    }

    if (this.body) {
      this.body.setNextKinematicTranslation({
        x: this.mesh.position.x,
        y: this.mesh.position.y,
        z: this.mesh.position.z
      })
    }

    this.trail.position.set(this.mesh.position.x, 0.1, this.mesh.position.z)
    this.game.camera.follow(this.mesh.position)
  }
}
