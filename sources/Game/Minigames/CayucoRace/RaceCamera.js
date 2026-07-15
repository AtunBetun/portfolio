import * as THREE from 'three'
import Game from '../../Game.js'

export default class RaceCamera {
  constructor() {
    this.game = Game.getInstance()
    this.camera = this.game.camera.instance

    this.distance = 8
    this.height = 2.5
    this.lookAhead = 4
    this.swayAmount = 0.15
    this.swaySpeed = 1.8
    this.posLerp = 0.05
    this.lookLerp = 0.08

    this.currentPos = new THREE.Vector3()
    this.lookTarget = new THREE.Vector3()
    this.originalSettings = {}
    this.active = false
    this.elapsed = 0
  }

  activate() {
    const hubCamera = this.game.camera
    this.originalSettings = {
      distance: hubCamera.distance,
      height: hubCamera.height,
      lookAhead: hubCamera.lookAhead
    }

    this.active = true
    this.reset()
    this.camera.position.copy(this.currentPos)
    this.camera.lookAt(this.lookTarget)
  }

  deactivate() {
    const hubCamera = this.game.camera
    hubCamera.distance = this.originalSettings.distance
    hubCamera.height = this.originalSettings.height
    hubCamera.lookAhead = this.originalSettings.lookAhead

    this.active = false
  }

  update(delta, boatPosition, boatHeading, waveHeight) {
    if (!this.active) return

    this.elapsed += delta

    const forwardX = Math.sin(boatHeading)
    const forwardZ = Math.cos(boatHeading)
    const rightX = Math.cos(boatHeading)
    const rightZ = -Math.sin(boatHeading)

    // Wave-synced sway — lateral sine drift plus a gentler vertical bob
    const lateralSway = Math.sin(this.elapsed * this.swaySpeed) * this.swayAmount
    const verticalSway =
      Math.sin(this.elapsed * this.swaySpeed * 0.7) * this.swayAmount * 0.5 + waveHeight * 0.3

    const desired = new THREE.Vector3(
      boatPosition.x - forwardX * this.distance + rightX * lateralSway,
      boatPosition.y + this.height + verticalSway,
      boatPosition.z - forwardZ * this.distance + rightZ * lateralSway
    )
    this.currentPos.lerp(desired, this.posLerp)
    this.camera.position.copy(this.currentPos)

    const lookAt = new THREE.Vector3(
      boatPosition.x + forwardX * this.lookAhead,
      boatPosition.y + 0.5,
      boatPosition.z + forwardZ * this.lookAhead
    )
    this.lookTarget.lerp(lookAt, this.lookLerp)
    this.camera.lookAt(this.lookTarget)
  }

  reset() {
    this.elapsed = 0
    this.currentPos.set(0, this.height, -this.distance)
    this.lookTarget.set(0, 0.5, this.lookAhead)
  }
}
