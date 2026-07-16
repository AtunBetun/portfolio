import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'

const HULL_LENGTH = 5
const HULL_HALF = HULL_LENGTH / 2
const HULL_WIDTH = 0.8
const LATERAL_LIMIT = 4
const HEADING_NUDGE = 0.025
const MIS_STROKE_YAW = 0.05
const STROKE_ANIM_DURATION = 0.25
const PITCH_LERP = 0.1
const ROLL_LERP = 0.1
const SPLASH_COUNT = 8
const WAKE_COUNT = 12
const SPRAY_COUNT = 6
const SPRAY_SPEED_THRESHOLD = 7
const WAKE_MAX_LIFE = 1.2
const SPLASH_MAX_LIFE = 0.4

export default class Boat {
  constructor(group) {
    this.group = group

    this.position = new THREE.Vector3()
    this.heading = 0
    this.speed = 0
    this.lateralOffset = 0

    this.prevSpeed = 0
    this.accel = 0
    this.targetPitch = 0
    this.targetRoll = 0
    this.currentPitch = 0
    this.currentRoll = 0
    this.elapsed = 0

    this.paddlers = []
    this.activeStrokes = []

    this.mesh = this.buildMesh()
    this.group.add(this.mesh)

    this.splashPool = this.createParticlePool(SPLASH_COUNT, 0.12)
    this.wakePool = this.createParticlePool(WAKE_COUNT, 0.3)
    this.sprayPool = this.createParticlePool(SPRAY_COUNT, 0.06)
    this.wakeTimer = 0
  }

  buildMesh() {
    const boat = new THREE.Group()

    // Hull — a tapered cylinder laid along Z
    const hullGeo = new THREE.CylinderGeometry(0.12, 0.12, HULL_LENGTH, 8)
    const hull = new THREE.Mesh(hullGeo, toon('wood'))
    hull.rotation.x = Math.PI / 2
    hull.scale.set(HULL_WIDTH / 0.24, 0.45, 1)
    hull.position.y = 0.1
    hull.castShadow = true
    boat.add(hull)

    // Bow taper — cone at the front
    const bowGeo = new THREE.ConeGeometry(0.2, 0.8, 6)
    const bow = new THREE.Mesh(bowGeo, toon('wood'))
    bow.rotation.x = -Math.PI / 2
    bow.position.set(0, 0.12, HULL_HALF + 0.3)
    bow.scale.set(HULL_WIDTH / 0.4, 1, 0.45)
    boat.add(bow)

    // Stern taper
    const sternGeo = new THREE.ConeGeometry(0.18, 0.6, 6)
    const stern = new THREE.Mesh(sternGeo, toon('wood'))
    stern.rotation.x = Math.PI / 2
    stern.position.set(0, 0.12, -HULL_HALF - 0.2)
    stern.scale.set(HULL_WIDTH / 0.36, 1, 0.45)
    boat.add(stern)

    // Interior
    const interiorGeo = new THREE.BoxGeometry(HULL_WIDTH * 0.65, 0.06, HULL_LENGTH * 0.85)
    const interior = new THREE.Mesh(interiorGeo, toon('woodDark'))
    interior.position.y = 0.2
    boat.add(interior)

    // Gunwale rails
    const railGeo = new THREE.BoxGeometry(0.04, 0.06, HULL_LENGTH * 0.9)
    const railMat = toon('wood')
    const railL = new THREE.Mesh(railGeo, railMat)
    railL.position.set(-HULL_WIDTH * 0.33, 0.26, 0)
    boat.add(railL)
    const railR = new THREE.Mesh(railGeo, railMat)
    railR.position.set(HULL_WIDTH * 0.33, 0.26, 0)
    boat.add(railR)

    // Cross ribs
    const ribGeo = new THREE.BoxGeometry(HULL_WIDTH * 0.6, 0.03, 0.05)
    const ribMat = toon('woodDark')
    for (let i = -1; i <= 1; i++) {
      const rib = new THREE.Mesh(ribGeo, ribMat)
      rib.position.set(0, 0.19, i * 1.2)
      boat.add(rib)
    }

    // Bow ornament
    const ornGeo = new THREE.ConeGeometry(0.05, 0.2, 4)
    const orn = new THREE.Mesh(ornGeo, toon('accent'))
    orn.position.set(0, 0.3, HULL_HALF + 0.5)
    orn.rotation.x = -Math.PI / 4
    boat.add(orn)

    // 4 Paddlers — diagonal pairs
    const seats = [
      { x: -0.2, z: 1.2, side: 'left', pair: 0 },
      { x: 0.2, z: 1.2, side: 'right', pair: 1 },
      { x: -0.2, z: -1.0, side: 'left', pair: 1 },
      { x: 0.2, z: -1.0, side: 'right', pair: 0 }
    ]

    for (const seat of seats) {
      const paddler = this.createPaddler(seat)
      boat.add(paddler.group)
      this.paddlers.push(paddler)
    }

    return boat
  }

  createPaddler(seat) {
    const group = new THREE.Group()
    group.position.set(seat.x, 0.28, seat.z)

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.06, 0.16, 3, 6)
    const body = new THREE.Mesh(bodyGeo, toon('playerShirt'))
    body.position.y = 0.14
    group.add(body)

    // Head
    const headGeo = new THREE.SphereGeometry(0.06, 6, 5)
    const head = new THREE.Mesh(headGeo, toon('skin'))
    head.position.y = 0.32
    group.add(head)

    // Paddle pivot at shoulder
    const pivot = new THREE.Group()
    pivot.position.set(seat.side === 'left' ? -0.08 : 0.08, 0.24, 0)

    const shaftGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5)
    const shaft = new THREE.Mesh(shaftGeo, toon('wood'))
    shaft.position.y = -0.25
    pivot.add(shaft)

    const bladeGeo = new THREE.BoxGeometry(0.025, 0.25, 0.1)
    const blade = new THREE.Mesh(bladeGeo, toon('sand'))
    blade.position.y = -0.65
    pivot.add(blade)

    group.add(pivot)

    return {
      group,
      pivot,
      side: seat.side,
      pair: seat.pair,
      phase: 0,
      idlePhase: Math.random() * Math.PI * 2
    }
  }

  createParticlePool(count, size) {
    const pool = []
    const geo = new THREE.PlaneGeometry(size, size)
    const mat = toon('white', { transparent: true, opacity: 0.8, side: THREE.DoubleSide })

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone())
      mesh.visible = false
      this.group.add(mesh)
      pool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        active: false
      })
    }
    return pool
  }

  update(delta, getHeightAt) {
    this.elapsed += delta

    // Move forward along heading
    const fwdX = Math.sin(this.heading)
    const fwdZ = Math.cos(this.heading)
    this.position.x += fwdX * this.speed * delta
    this.position.z += fwdZ * this.speed * delta

    // 4-point height sampling for pitch/roll
    const bowX = this.position.x + fwdX * HULL_HALF
    const bowZ = this.position.z + fwdZ * HULL_HALF
    const sternX = this.position.x - fwdX * HULL_HALF
    const sternZ = this.position.z - fwdZ * HULL_HALF

    const rightX = Math.cos(this.heading)
    const rightZ = -Math.sin(this.heading)
    const portX = this.position.x - rightX * HULL_WIDTH * 0.4
    const portZ = this.position.z - rightZ * HULL_WIDTH * 0.4
    const starX = this.position.x + rightX * HULL_WIDTH * 0.4
    const starZ = this.position.z + rightZ * HULL_WIDTH * 0.4

    const bowY = getHeightAt(bowX, bowZ)
    const sternY = getHeightAt(sternX, sternZ)
    const portY = getHeightAt(portX, portZ)
    const starY = getHeightAt(starX, starZ)

    const avgY = (bowY + sternY + portY + starY) / 4
    this.position.y = avgY

    // Pitch from wave slope + acceleration kick
    this.accel = delta > 0 ? (this.speed - this.prevSpeed) / delta : 0
    this.prevSpeed = this.speed
    this.targetPitch = Math.atan2(bowY - sternY, HULL_LENGTH) - this.accel * 0.03
    this.targetRoll = Math.atan2(portY - starY, HULL_WIDTH * 0.8)

    this.currentPitch += (this.targetPitch - this.currentPitch) * PITCH_LERP
    this.currentRoll += (this.targetRoll - this.currentRoll) * ROLL_LERP

    // Apply lateral offset perpendicular to heading
    const meshX = this.position.x + rightX * this.lateralOffset
    const meshZ = this.position.z + rightZ * this.lateralOffset

    this.mesh.position.set(meshX, this.position.y, meshZ)
    this.mesh.rotation.set(this.currentPitch, this.heading, this.currentRoll)

    // Paddler idle animation — gentle lean
    for (const p of this.paddlers) {
      if (p.phase > 0) {
        // Active stroke animation
        p.phase = Math.max(0, p.phase - delta / STROKE_ANIM_DURATION)
        const swing = Math.sin(p.phase * Math.PI)
        const sign = p.side === 'left' ? -1 : 1
        p.pivot.rotation.z = sign * swing * 0.9
        p.pivot.rotation.x = swing * 0.5
      } else {
        // Idle sway
        const sway = Math.sin(this.elapsed * 1.8 + p.idlePhase) * 0.05
        p.pivot.rotation.z = sway
        p.pivot.rotation.x = Math.sin(this.elapsed * 1.2 + p.idlePhase) * 0.03
        p.group.rotation.x = Math.sin(this.elapsed * 0.9 + p.idlePhase) * 0.02
      }
    }

    // Wake emission — rate proportional to speed
    if (this.speed > 1) {
      const wakeRate = THREE.MathUtils.lerp(
        0.3,
        0.1,
        (this.speed - 1) / (RACE_CONFIG_MAX_SPEED - 1)
      )
      this.wakeTimer += delta
      if (this.wakeTimer >= wakeRate) {
        this.wakeTimer = 0
        this.spawnWake()
      }
    }

    // Bow spray at high speed
    if (this.speed > SPRAY_SPEED_THRESHOLD && Math.random() < 0.3) {
      this.spawnBowSpray(fwdX, fwdZ)
    }

    // Update particles
    this.updatePool(this.splashPool, delta)
    this.updatePool(this.wakePool, delta)
    this.updatePool(this.sprayPool, delta)
  }

  paddle(side) {
    // Trigger diagonal pair (pair 0: front-left + back-right, pair 1: front-right + back-left)
    const pairIndex = side === 'left' ? 0 : 1
    for (const p of this.paddlers) {
      if (p.pair === pairIndex) {
        p.phase = 1
      }
    }

    this.heading += side === 'left' ? HEADING_NUDGE : -HEADING_NUDGE
    this.spawnSplash(side)
    return true
  }

  misStroke(side) {
    // Fumbled stroke — shorter, jerkier animation on the wrong pair
    const pairIndex = side === 'left' ? 0 : 1
    for (const p of this.paddlers) {
      if (p.pair === pairIndex) {
        p.phase = 0.4
      }
    }
    this.heading += side === 'left' ? MIS_STROKE_YAW : -MIS_STROKE_YAW
    this.spawnSplash(side, 2)
  }

  applyDrift(amount, delta) {
    this.lateralOffset = THREE.MathUtils.clamp(
      this.lateralOffset + amount * delta,
      -LATERAL_LIMIT,
      LATERAL_LIMIT
    )
  }

  reset() {
    this.position.set(0, 0, 0)
    this.heading = 0
    this.speed = 0
    this.lateralOffset = 0
    this.prevSpeed = 0
    this.accel = 0
    this.currentPitch = 0
    this.currentRoll = 0
    this.targetPitch = 0
    this.targetRoll = 0
    this.elapsed = 0
    this.wakeTimer = 0

    this.mesh.position.set(0, 0, 0)
    this.mesh.rotation.set(0, 0, 0)

    for (const p of this.paddlers) p.phase = 0
    this.clearPool(this.splashPool)
    this.clearPool(this.wakePool)
    this.clearPool(this.sprayPool)
  }

  getWorldPosition() {
    return this.mesh.getWorldPosition(new THREE.Vector3())
  }

  // --- Particle helpers ---

  spawnSplash(side, count = 5) {
    const sign = side === 'left' ? -1 : 1
    const rightX = Math.cos(this.heading)
    const rightZ = -Math.sin(this.heading)

    for (let i = 0; i < count; i++) {
      const p = this.getInactive(this.splashPool)
      if (!p) break

      p.active = true
      p.life = 0
      p.maxLife = SPLASH_MAX_LIFE + Math.random() * 0.1
      p.mesh.visible = true
      p.mesh.material.opacity = 0.8

      const offsetZ = (Math.random() - 0.5) * 1.5
      const fwdX = Math.sin(this.heading)
      const fwdZ = Math.cos(this.heading)

      p.mesh.position.set(
        this.position.x + rightX * sign * 0.5 + fwdX * offsetZ,
        this.position.y + 0.2,
        this.position.z + rightZ * sign * 0.5 + fwdZ * offsetZ
      )

      p.velocity.set(
        rightX * sign * (1.5 + Math.random()) + (Math.random() - 0.5) * 0.5,
        2 + Math.random() * 1.5,
        rightZ * sign * (1.5 + Math.random()) + (Math.random() - 0.5) * 0.5
      )
    }
  }

  spawnWake() {
    const p = this.getInactive(this.wakePool)
    if (!p) return

    const fwdX = Math.sin(this.heading)
    const fwdZ = Math.cos(this.heading)

    p.active = true
    p.life = 0
    p.maxLife = WAKE_MAX_LIFE
    p.mesh.visible = true
    p.mesh.material.opacity = 0.6
    p.mesh.scale.set(0.3, 0.3, 0.3)

    p.mesh.position.set(
      this.position.x - fwdX * HULL_HALF,
      this.position.y + 0.05,
      this.position.z - fwdZ * HULL_HALF
    )
    p.mesh.rotation.x = -Math.PI / 2

    p.velocity.set(0, 0, 0)
  }

  spawnBowSpray(fwdX, fwdZ) {
    const p = this.getInactive(this.sprayPool)
    if (!p) return

    p.active = true
    p.life = 0
    p.maxLife = 0.3 + Math.random() * 0.2
    p.mesh.visible = true
    p.mesh.material.opacity = 0.6

    p.mesh.position.set(
      this.position.x + fwdX * HULL_HALF,
      this.position.y + 0.3,
      this.position.z + fwdZ * HULL_HALF
    )

    p.velocity.set(
      fwdX * 2 + (Math.random() - 0.5) * 1.5,
      1.5 + Math.random(),
      fwdZ * 2 + (Math.random() - 0.5) * 1.5
    )
  }

  updatePool(pool, delta) {
    for (const p of pool) {
      if (!p.active) continue

      p.life += delta
      if (p.life >= p.maxLife) {
        p.active = false
        p.mesh.visible = false
        continue
      }

      const t = p.life / p.maxLife

      // Splash/spray: gravity + motion
      if (p.velocity.lengthSq() > 0.01) {
        p.mesh.position.x += p.velocity.x * delta
        p.mesh.position.y += p.velocity.y * delta
        p.mesh.position.z += p.velocity.z * delta
        p.velocity.y -= 9.8 * delta
      } else {
        // Wake: scale up, fade out
        const scale = 0.3 + t * 1.2
        p.mesh.scale.set(scale, scale, scale)
      }

      p.mesh.material.opacity = (1 - t) * 0.8
    }
  }

  getInactive(pool) {
    return pool.find((p) => !p.active) || null
  }

  clearPool(pool) {
    for (const p of pool) {
      p.active = false
      p.mesh.visible = false
    }
  }
}

const RACE_CONFIG_MAX_SPEED = 11
