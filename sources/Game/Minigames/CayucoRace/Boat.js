import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'
import { rampFactor } from './logic/PaddleModel.js'

const HULL_LENGTH = 5
const HULL_HALF = HULL_LENGTH / 2
const HULL_HALF_BEAM = 0.45 // half-width at the widest station
const HULL_WIDTH = HULL_HALF_BEAM * 2
const HULL_DEPTH = 0.4
const HULL_RISE = 0.38 // how much bow/stern lift (rocker)
const GUNWALE_Y = 0.24 // top edge of the hull in local space
const LATERAL_LIMIT = 12 // open water — the buoy line is the real boundary
const HEADING_NUDGE = 0.025
const PIVOT_OUT = 0.52 // paddle pivot sits just outside the gunwale
const RELEASE_DURATION = 0.22
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

    // Hold-based paddle state — plant, drive while held, lift on release
    this.holding = false
    this.holdSide = 'left'
    this.holdT = 0
    this.holdWeak = false
    this.releaseT = 0 // counts down after release for the lift-out anim

    this.mesh = this.buildMesh()
    this.group.add(this.mesh)

    this.splashPool = this.createParticlePool(SPLASH_COUNT, 0.12)
    this.wakePool = this.createParticlePool(WAKE_COUNT, 0.3)
    this.sprayPool = this.createParticlePool(SPRAY_COUNT, 0.06)
    this.wakeTimer = 0
  }

  buildMesh() {
    const boat = new THREE.Group()

    // Smooth dugout hull — a U-section lofted along Z, tapering to upturned
    // bow/stern points (a cayuco silhouette, not a cylinder with sticks).
    const outer = this.buildHullShell(1.0, 1.0, 0, toon('wood', { side: THREE.DoubleSide }))
    outer.castShadow = true
    boat.add(outer)

    // Darker liner nested inside for the hollowed interior look
    const inner = this.buildHullShell(0.94, 0.62, 0.04, toon('woodDark', { side: THREE.DoubleSide }))
    boat.add(inner)

    // A couple of bench thwarts spanning the interior
    const benchMat = toon('woodDark')
    for (const z of [1.2, -0.6]) {
      const t = (z + HULL_HALF) / HULL_LENGTH
      const beam = HULL_HALF_BEAM * Math.pow(Math.sin(Math.PI * t), 0.6)
      const bench = new THREE.Mesh(new THREE.BoxGeometry(beam * 1.9, 0.05, 0.18), benchMat)
      bench.position.set(0, GUNWALE_Y - 0.04, z)
      boat.add(bench)
    }

    // Bow ornament riding the upturned prow
    const orn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), toon('accent'))
    orn.position.set(0, GUNWALE_Y + HULL_RISE + 0.05, HULL_HALF - 0.05)
    orn.rotation.x = -Math.PI / 5
    boat.add(orn)

    // 4 Paddlers in single file — all paddle whichever side is called
    const seats = [
      { x: 0, z: 1.5 },
      { x: 0, z: 0.5 },
      { x: 0, z: -0.5 },
      { x: 0, z: -1.5 }
    ]

    for (const seat of seats) {
      const paddler = this.createPaddler(seat)
      boat.add(paddler.group)
      this.paddlers.push(paddler)
    }

    return boat
  }

  // Loft an open U-shaped cross-section along the hull length. beamScale /
  // depthScale size the section; yShift nests the interior liner.
  buildHullShell(beamScale, depthScale, yShift, material) {
    const STATIONS = 28
    const RING = 12
    const positions = []

    for (let i = 0; i < STATIONS; i++) {
      const t = i / (STATIONS - 1) // 0 = stern, 1 = bow
      const z = -HULL_HALF + t * HULL_LENGTH
      const profile = Math.pow(Math.sin(Math.PI * t), 0.6) // full mid, pointed ends
      const beam = HULL_HALF_BEAM * beamScale * profile
      const depth = HULL_DEPTH * depthScale * (0.35 + 0.65 * profile)
      const rocker = HULL_RISE * Math.pow(Math.abs(2 * t - 1), 2.2) // ends lift

      for (let j = 0; j < RING; j++) {
        const ang = Math.PI * (j / (RING - 1)) // 0 = port gunwale → PI = starboard
        const x = -Math.cos(ang) * beam
        const y = GUNWALE_Y + yShift + rocker - Math.sin(ang) * depth
        positions.push(x, y, z)
      }
    }

    const index = []
    for (let i = 0; i < STATIONS - 1; i++) {
      for (let j = 0; j < RING - 1; j++) {
        const a = i * RING + j
        const b = a + RING
        index.push(a, b, b + 1, a, b + 1, a + 1)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(index)
    geo.computeVertexNormals()
    return new THREE.Mesh(geo, material)
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

    // Paddle pivot — sits just outside the gunwale on the stroking side.
    // With heading PI the boat faces -Z, so positive local X is screen-left.
    // Repositioned per side in plantPaddle(); rotation.x sweeps bow→stern.
    const pivot = new THREE.Group()
    pivot.position.set(PIVOT_OUT, GUNWALE_Y, 0)

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
      activeSide: 'left',
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

    // Paddle animation. All paddlers move together.
    // Sweep travels bow (rotation.x = -0.6) → stern (+0.8): the blade pulls
    // water backward, driving the boat forward. Roll sign keeps the shaft
    // outside the hull so it never clips the gunwale.
    const rollSign = this.holdSide === 'left' ? 1 : -1
    if (this.holding) {
      this.holdT += delta
      const grip = rampFactor(this.holdT, RACE_CONFIG.stroke)
      const dip = this.holdWeak ? 0.55 : 1.0
      // Blade sweeps bow→stern as grip builds, then eases at the stall
      const sweep = THREE.MathUtils.lerp(-0.6, 0.8, Math.min(this.holdT / 0.5, 1)) * dip
      for (const p of this.paddlers) {
        p.pivot.rotation.x = sweep
        p.pivot.rotation.z = rollSign * 0.15 * dip * grip
      }
    } else if (this.releaseT > 0) {
      // Lift-out — blade rolls up and out, easing back to idle carry
      this.releaseT = Math.max(0, this.releaseT - delta)
      const t = 1 - this.releaseT / RELEASE_DURATION
      for (const p of this.paddlers) {
        p.pivot.rotation.x = THREE.MathUtils.lerp(0.8, 0, t)
        p.pivot.rotation.z = this.lastRollSign * THREE.MathUtils.lerp(0.6, 0, t)
      }
    } else {
      // Idle sway
      for (const p of this.paddlers) {
        p.pivot.rotation.z = Math.sin(this.elapsed * 1.8 + p.idlePhase) * 0.05
        p.pivot.rotation.x = Math.sin(this.elapsed * 1.2 + p.idlePhase) * 0.03
        p.group.rotation.x = Math.sin(this.elapsed * 0.9 + p.idlePhase) * 0.02
      }
    }

    // Wake emission — rate proportional to speed
    if (this.speed > 1) {
      const wakeRate = THREE.MathUtils.lerp(0.3, 0.1, (this.speed - 1) / (RACE_CONFIG.maxSpeed - 1))
      this.wakeTimer += delta
      if (this.wakeTimer >= wakeRate) {
        this.wakeTimer = 0
        this.spawnWake()
      }
    }

    // Bow spray at high speed — constant while surfing
    if (this.surfing && Math.random() < 0.8) {
      this.spawnBowSpray(fwdX, fwdZ)
    } else if (this.speed > SPRAY_SPEED_THRESHOLD && Math.random() < 0.3) {
      this.spawnBowSpray(fwdX, fwdZ)
    }

    // Surfing bias — nose dips down the wave face
    if (this.surfing) {
      this.currentPitch += (-0.06 - this.currentPitch) * PITCH_LERP * 0.5
    }

    // Update particles
    this.updatePool(this.splashPool, delta)
    this.updatePool(this.wakePool, delta)
    this.updatePool(this.sprayPool, delta)
  }

  // Catch — plant the blade in the water on the called side and begin the hold.
  plantPaddle(side, { weak = false } = {}) {
    // Pivot moves to the correct screen-side, just outside the gunwale.
    // heading PI means positive local X = screen-left.
    const pivotX = side === 'left' ? PIVOT_OUT : -PIVOT_OUT
    for (const p of this.paddlers) {
      p.activeSide = side
      p.pivot.position.x = pivotX
    }

    this.holding = true
    this.holdSide = side
    this.holdT = 0
    this.holdWeak = weak
    this.releaseT = 0

    // Left paddles in water → boat turns right, and vice versa.
    // With heading PI (facing -Z), decreasing heading veers screen-right.
    this.heading += side === 'left' ? -HEADING_NUDGE : HEADING_NUDGE

    // Fatigued form reads as splashy, ineffective strokes
    this.spawnSplash(side, weak ? 8 : 5, weak)
    return true
  }

  // Release — lift the blade out; a small exit splash trails the stroke.
  releasePaddle() {
    if (!this.holding) return
    this.holding = false
    this.releaseT = RELEASE_DURATION
    this.lastRollSign = this.holdSide === 'left' ? 1 : -1
    this.spawnSplash(this.holdSide, 3, false)
  }

  setSurfing(surfing) {
    this.surfing = surfing
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
    this.surfing = false

    this.mesh.position.set(0, 0, 0)
    this.mesh.rotation.set(0, 0, 0)

    this.holding = false
    this.holdT = 0
    this.holdWeak = false
    this.releaseT = 0
    for (const p of this.paddlers) {
      p.pivot.rotation.set(0, 0, 0)
    }
    this.clearPool(this.splashPool)
    this.clearPool(this.wakePool)
    this.clearPool(this.sprayPool)
  }

  getWorldPosition() {
    return this.mesh.getWorldPosition(new THREE.Vector3())
  }

  // --- Particle helpers ---

  spawnSplash(side, count = 5, weak = false) {
    const sign = side === 'left' ? -1 : 1
    const rightX = Math.cos(this.heading)
    const rightZ = -Math.sin(this.heading)

    // Weak strokes throw more water, lower and wider — all splash, no power
    const outSpeed = weak ? 0.8 : 1.5
    const upSpeed = weak ? 1.2 : 2

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
        rightX * sign * (outSpeed + Math.random()) + (Math.random() - 0.5) * (weak ? 1.5 : 0.5),
        upSpeed + Math.random() * 1.5,
        rightZ * sign * (outSpeed + Math.random()) + (Math.random() - 0.5) * (weak ? 1.5 : 0.5)
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
