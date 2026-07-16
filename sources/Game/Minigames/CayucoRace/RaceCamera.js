import * as THREE from 'three'
import Game from '../../Game.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

export default class RaceCamera {
  constructor() {
    this.game = Game.getInstance()
    this.camera = this.game.camera.instance

    this.active = false
    this.elapsed = 0

    // Additive effects — all decay frame-rate-independently
    this.fovKick = 0
    this.fovKickDecay = 0.2
    this.shake = 0
    this.rollOffset = 0

    // Phase camera params (lerped toward targets)
    const phase0 = RACE_CONFIG.camera.phaseOffsets[0]
    this.currentDistance = phase0.distance
    this.currentHeight = phase0.height
    this.currentLookAhead = phase0.lookAhead
    this.currentSwayMult = phase0.swayMult
    this.targetDistance = phase0.distance
    this.targetHeight = phase0.height
    this.targetLookAhead = phase0.lookAhead
    this.targetSwayMult = phase0.swayMult
    this.phaseLerp = 0.03

    // Countdown fly-in
    this.countdownMode = false
    this.countdownProgress = 0
    this.countdownStart = { distance: 14, height: 6, angleOffset: 0.5 }

    // Finish orbit
    this.finishMode = false
    this.finishElapsed = 0
    this.finishOrbitAngle = 0
    this.finishDistance = phase0.distance

    // Base camera state
    this.currentPos = new THREE.Vector3()
    this.lookTarget = new THREE.Vector3()
    this.originalSettings = {}
    this.swaySpeed = 1.8
    this.baseSway = 0.15
    this.posLerp = 0.05
    this.lookLerp = 0.08
  }

  activate() {
    const hubCamera = this.game.camera
    this.originalSettings = {
      distance: hubCamera.distance,
      height: hubCamera.height,
      lookAhead: hubCamera.lookAhead,
      fov: this.camera.fov
    }

    this.active = true
    this.reset()
    this.setPhase(0)
    this.countdownMode = true
    this.countdownProgress = 0
  }

  deactivate() {
    const hubCamera = this.game.camera
    hubCamera.distance = this.originalSettings.distance
    hubCamera.height = this.originalSettings.height
    hubCamera.lookAhead = this.originalSettings.lookAhead
    if (this.originalSettings.fov !== undefined) {
      this.camera.fov = this.originalSettings.fov
      this.camera.updateProjectionMatrix()
    }

    this.active = false
  }

  update(delta, boatPosition, boatHeading, waveHeight, speed = 0) {
    if (!this.active) return

    this.elapsed += delta

    const config = RACE_CONFIG.camera
    const forwardX = Math.sin(boatHeading)
    const forwardZ = Math.cos(boatHeading)
    const rightX = Math.cos(boatHeading)
    const rightZ = -Math.sin(boatHeading)

    if (this.countdownMode) {
      this.countdownProgress += delta / 3.0
      if (this.countdownProgress >= 1) {
        this.countdownMode = false
        this.countdownProgress = 1
      }

      const t = smoothstep(this.countdownProgress)
      const phase0 = config.phaseOffsets[0]
      const distance = THREE.MathUtils.lerp(this.countdownStart.distance, phase0.distance, t)
      const height = THREE.MathUtils.lerp(this.countdownStart.height, phase0.height, t)
      const angleOffset = THREE.MathUtils.lerp(this.countdownStart.angleOffset, 0, t)

      const angle = boatHeading + angleOffset
      this.currentPos.set(
        boatPosition.x - Math.sin(angle) * distance,
        boatPosition.y + height,
        boatPosition.z - Math.cos(angle) * distance
      )
      this.lookTarget.set(boatPosition.x, boatPosition.y + 0.5, boatPosition.z)

      this.camera.position.copy(this.currentPos)
      this.camera.lookAt(this.lookTarget)
      return
    }

    if (this.finishMode) {
      this.finishElapsed += delta

      if (this.finishElapsed <= 1.8) {
        this.finishOrbitAngle += delta * 1.3
        this.finishDistance += delta * 2

        const angle = boatHeading + this.finishOrbitAngle
        this.currentPos.set(
          boatPosition.x - Math.sin(angle) * this.finishDistance,
          boatPosition.y + this.currentHeight,
          boatPosition.z - Math.cos(angle) * this.finishDistance
        )
        this.lookTarget.set(boatPosition.x, boatPosition.y + 0.5, boatPosition.z)

        this.camera.position.copy(this.currentPos)
        this.camera.lookAt(this.lookTarget)
      }
      return
    }

    // Decay effects — frame-rate-independent exponential falloff
    this.fovKick *= Math.pow(0.001, delta / this.fovKickDecay)
    if (Math.abs(this.fovKick) < 0.01) this.fovKick = 0
    this.shake *= Math.pow(0.001, delta / config.shakeDuration)
    if (this.shake < 0.01) this.shake = 0

    // Lerp phase camera params toward current phase target
    this.currentDistance = THREE.MathUtils.lerp(
      this.currentDistance,
      this.targetDistance,
      this.phaseLerp
    )
    this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, this.targetHeight, this.phaseLerp)
    this.currentLookAhead = THREE.MathUtils.lerp(
      this.currentLookAhead,
      this.targetLookAhead,
      this.phaseLerp
    )
    this.currentSwayMult = THREE.MathUtils.lerp(
      this.currentSwayMult,
      this.targetSwayMult,
      this.phaseLerp
    )

    // Wave-synced sway — lateral drift plus a gentler vertical bob
    const lateralSway =
      Math.sin(this.elapsed * this.swaySpeed) * this.baseSway * this.currentSwayMult
    const verticalSway =
      Math.sin(this.elapsed * this.swaySpeed * 0.7) * this.baseSway * 0.5 * this.currentSwayMult +
      waveHeight * 0.3

    // Wind gust — slow irregular lateral bias
    const windSway =
      (Math.sin(this.elapsed * 0.31) * 0.6 + Math.sin(this.elapsed * 0.73) * 0.4) *
      this.baseSway *
      this.currentSwayMult *
      0.5
    const lateral = lateralSway + windSway

    const desired = new THREE.Vector3(
      boatPosition.x - forwardX * this.currentDistance + rightX * lateral,
      boatPosition.y + this.currentHeight + verticalSway,
      boatPosition.z - forwardZ * this.currentDistance + rightZ * lateral
    )
    this.currentPos.lerp(desired, this.posLerp)

    const lookAt = new THREE.Vector3(
      boatPosition.x + forwardX * this.currentLookAhead,
      boatPosition.y + 0.5,
      boatPosition.z + forwardZ * this.currentLookAhead
    )
    this.lookTarget.lerp(lookAt, this.lookLerp)

    // Shake — incommensurate frequencies applied post-position
    this.camera.position.copy(this.currentPos)
    if (this.shake > 0) {
      this.camera.position.x += Math.sin(this.elapsed * 47) * this.shake
      this.camera.position.y += Math.sin(this.elapsed * 39) * this.shake * 0.7
      this.camera.position.z += Math.sin(this.elapsed * 53) * this.shake
    }
    this.camera.lookAt(this.lookTarget)

    // Roll from wind, applied after lookAt overwrites rotation
    if (this.rollOffset !== 0) {
      this.camera.rotation.z += this.rollOffset * (Math.PI / 180)
    }

    // FOV speed coupling plus additive kicks
    const targetFov =
      config.baseFov + config.speedFovRange * (speed / RACE_CONFIG.maxSpeed) + this.fovKick
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = targetFov
      this.camera.updateProjectionMatrix()
    }
  }

  setPhase(phaseIndex) {
    const offsets = RACE_CONFIG.camera.phaseOffsets
    const phase = offsets[Math.min(phaseIndex, offsets.length - 1)]
    this.targetDistance = phase.distance
    this.targetHeight = phase.height
    this.targetLookAhead = phase.lookAhead
    this.targetSwayMult = phase.swayMult
  }

  kick(type) {
    const config = RACE_CONFIG.camera
    if (type === 'stroke') {
      this.fovKick += config.strokeKick
      this.fovKickDecay = 0.2
    } else if (type === 'perfect') {
      this.fovKick += config.perfectKick
      this.fovKickDecay = 0.45
    } else if (type === 'bad') {
      this.fovKick += config.badKick
      this.fovKickDecay = 0.3
      this.shake = config.shakeIntensity
    }
  }

  startFinish() {
    this.finishMode = true
    this.finishElapsed = 0
    this.finishOrbitAngle = 0
    this.finishDistance = this.currentDistance
  }

  reset() {
    this.elapsed = 0
    this.fovKick = 0
    this.fovKickDecay = 0.2
    this.shake = 0
    this.rollOffset = 0
    this.countdownMode = false
    this.countdownProgress = 0
    this.finishMode = false
    this.finishElapsed = 0
    this.finishOrbitAngle = 0

    this.setPhase(0)
    const phase0 = RACE_CONFIG.camera.phaseOffsets[0]
    this.currentDistance = phase0.distance
    this.currentHeight = phase0.height
    this.currentLookAhead = phase0.lookAhead
    this.currentSwayMult = phase0.swayMult
    this.finishDistance = phase0.distance

    this.currentPos.set(0, this.currentHeight, -this.currentDistance)
    this.lookTarget.set(0, 0.5, this.currentLookAhead)
  }
}
