import * as THREE from 'three'
import Game from '../../Game.js'
import Events from '../../Events.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'
import Boat from './Boat.js'
import WaveSystem from './WaveSystem.js'
import TimingRing from './TimingRing.js'
import RaceCourse from './RaceCourse.js'
import RaceHUD from './RaceHUD.js'
import RaceCamera from './RaceCamera.js'

const TICK_ORDER = 8
const COUNTDOWN_SECONDS = 3
const GO_DISPLAY_DURATION = 0.6
const COURSE_HEADING = Math.PI
const RACE_GROUP_POSITION = new THREE.Vector3(0, -0.4, -25)
const PACE_TIME = 34
const BEHIND_PACE_DRAG_MULT = 1.2
const MIS_STROKE_SPEED_FACTOR = 0.96
const MIS_STROKE_SHAKE = 0.1
const PERFECT_FLOW_BONUS = 0.3
const SLOWMO_SCALE = 0.25
const SLOWMO_DURATION = 0.6
const FINISH_DELAY = 1.8
const PHASE_BANNERS = [null, 'THE SEA WAKES', 'THE TEETH']

export class CayucoRace {
  constructor(game) {
    this.game = game || Game.getInstance()
    this.events = new Events()

    this.state = 'idle'
    this.group = new THREE.Group()

    this.boat = null
    this.waveSystem = null
    this.timingRing = null
    this.raceCourse = null
    this.hud = null
    this.raceCamera = null

    this.raceTime = 0
    this.finishTime = 0

    // Momentum — the controller owns the physics, the boat just moves
    this.speed = 0

    // Flow state — rhythm quality drives a stroke-impulse bonus
    this.flow = 0
    this.lastStrokeTime = null
    this.combo = 0

    // Input
    this.lastPaddleSide = 'right'
    this.paddleCooldown = 0
    this.bufferedInput = null

    // Phase + event waves
    this.currentPhase = 0
    this.nextWaveIndex = 0
    this.activeWave = null

    this.timeScale = 1

    this.countdownElapsed = 0
    this.lastCountdownNumber = null

    this.finishSequenceActive = false
    this.finishDelay = 0

    this.tickHandler = null
    this.keyHandler = null
    this.touchHandler = null
  }

  on(event, callback) {
    this.events.on(event, callback)
  }

  getBoatWorldPos() {
    return this.boat.position.clone().add(this.group.position)
  }

  start() {
    if (this.state !== 'idle') return

    this.boat = new Boat(this.group)
    this.waveSystem = new WaveSystem(this.group)
    this.timingRing = new TimingRing()
    this.raceCourse = new RaceCourse(this.group)
    this.hud = new RaceHUD()
    this.raceCamera = new RaceCamera()

    this.hud.onRetry = () => this.retry()
    this.hud.onExit = () => this.exit()

    // Out over the ocean, not the hub origin
    this.group.position.copy(RACE_GROUP_POSITION)
    this.game.scene.add(this.group)

    this.tickHandler = (delta) => this.tick(delta)
    this.game.ticker.events.on('tick', this.tickHandler, TICK_ORDER)

    this.keyHandler = (event) => this.onKeyDown(event)
    window.addEventListener('keydown', this.keyHandler)

    this.touchHandler = (event) => this.onPointerDown(event)
    window.addEventListener('pointerdown', this.touchHandler)

    // Camera enters countdown fly-in mode on activation
    this.raceCamera.activate()

    this.game.hud.hide()
    this.hud.show()

    this.resetRaceState()
    this.state = 'countdown'
  }

  resetRaceState() {
    this.boat.reset()
    this.boat.heading = COURSE_HEADING
    this.boat.speed = 0
    this.waveSystem.reset()
    this.raceCourse.reset()
    this.raceCamera.reset()
    this.timingRing.hide()

    this.raceTime = 0
    this.finishTime = 0
    this.speed = 0

    this.flow = 0
    this.lastStrokeTime = null
    this.combo = 0

    this.lastPaddleSide = 'right'
    this.paddleCooldown = 0
    this.bufferedInput = null

    this.currentPhase = 0
    this.nextWaveIndex = 0
    this.activeWave = null

    this.timeScale = 1

    this.countdownElapsed = 0
    this.lastCountdownNumber = null

    this.finishSequenceActive = false
    this.finishDelay = 0
    this.controlsHidden = false

    this.hud.updateTimer(0)
    this.hud.updateProgress(0)
    this.hud.updateFlow(0)
  }

  tick(delta) {
    switch (this.state) {
      case 'countdown':
        this.updateCountdown(delta)
        break
      case 'racing':
        this.updateRacing(delta)
        break
      default:
        break
    }
  }

  updateCountdown(delta) {
    this.countdownElapsed += delta

    const number = COUNTDOWN_SECONDS - Math.floor(this.countdownElapsed)

    if (number !== this.lastCountdownNumber) {
      this.lastCountdownNumber = number

      if (number > 0) {
        this.hud.showCountdown(number)
        this.events.trigger('countdown', number)
      } else {
        this.hud.showCountdown(0)
        this.events.trigger('countdown', 0)
        this.state = 'racing'
        // Player must paddle to move — no free speed at the gun
        this.speed = 0
      }
    }

    // Water rolls and the camera flies in while the numbers tick down
    this.waveSystem.update(delta, this.boat.position.z)
    const waveHeight = this.waveSystem.getHeightAt(this.boat.position.x, this.boat.position.z)
    this.boat.update(0, (x, z) => this.waveSystem.getHeightAt(x, z))
    this.raceCamera.update(delta, this.getBoatWorldPos(), this.boat.heading, waveHeight, 0)
  }

  updateRacing(delta) {
    // Slow-motion finish scales the simulation, not the wall clock
    const dt = delta * this.timeScale

    if (!this.finishSequenceActive) {
      this.raceTime += dt

      // Hide the GO! banner shortly after the race begins
      if (this.raceTime > GO_DISPLAY_DURATION && this.lastCountdownNumber !== null) {
        this.hud.hideCountdown()
        this.lastCountdownNumber = null
      }

      // Fade out controls hint after 3 seconds
      if (this.raceTime > 3 && !this.controlsHidden) {
        this.controlsHidden = true
        this.hud.hideControls()
      }
    }

    // Drag — exponential decay, softened when the player falls behind pace
    let dragHalfLife = RACE_CONFIG.dragHalfLife
    if (this.raceCourse.getProgress() < this.raceTime / PACE_TIME) {
      dragHalfLife *= BEHIND_PACE_DRAG_MULT
    }
    this.speed *= Math.pow(0.5, dt / dragHalfLife)
    this.speed = THREE.MathUtils.clamp(this.speed, 0, RACE_CONFIG.maxSpeed)

    // The boat moves at whatever speed the controller decides
    this.boat.speed = this.speed
    this.boat.applyDrift(this.waveSystem.getWindDrift(), dt)
    this.boat.update(dt, (x, z) => this.waveSystem.getHeightAt(x, z))

    this.waveSystem.update(dt, this.boat.position.z)

    this.raceCourse.updateProgress(this.boat.position)
    const progress = this.raceCourse.getProgress()

    // Phase transitions — sea state, camera framing, and a HUD announcement
    const phase = this.raceCourse.getPhase()
    if (phase !== this.currentPhase) {
      this.currentPhase = phase
      this.waveSystem.setPhase(phase)
      this.raceCamera.setPhase(phase)
      if (PHASE_BANNERS[phase]) {
        this.hud.showPhaseBanner(PHASE_BANNERS[phase])
      }
      this.events.trigger('phase-change', phase)
    }

    // Deterministic event waves at fixed progress marks
    const marks = RACE_CONFIG.waves.progressMarks
    if (this.nextWaveIndex < marks.length && progress >= marks[this.nextWaveIndex]) {
      this.waveSystem.spawnEventWave(this.boat.position.z)
      this.nextWaveIndex += 1
    }

    // Arm the timing ring when a wave closes within trigger distance
    const nearWave = this.waveSystem.checkEventWaveNear(this.boat.position.z)
    if (nearWave && !nearWave.ringTriggered && !this.timingRing.active) {
      nearWave.ringTriggered = true
      this.activeWave = nearWave
      this.timingRing.show((quality) => this.processWaveResult(quality))
    }

    // The ring tracks the wave's physical distance, not elapsed time
    if (this.timingRing.active && this.activeWave) {
      const distance = this.activeWave.z - this.boat.position.z
      this.timingRing.update(distance)
    }
    if (!this.timingRing.active) {
      this.activeWave = null
    }

    const waveHeight = this.waveSystem.getHeightAt(this.boat.position.x, this.boat.position.z)
    this.raceCamera.update(dt, this.getBoatWorldPos(), this.boat.heading, waveHeight, this.speed)

    this.hud.updateTimer(this.finishSequenceActive ? this.finishTime : this.raceTime)
    this.hud.updateProgress(progress)
    this.hud.updateFlow(this.flow)

    // Cooldown + buffered input — a stroke queued near the cooldown's end
    // fires the frame the cooldown expires
    this.paddleCooldown = Math.max(0, this.paddleCooldown - dt)
    if (this.paddleCooldown === 0 && this.bufferedInput) {
      const side = this.bufferedInput
      this.bufferedInput = null
      this.handleInput(side)
    }

    if (this.finishSequenceActive) {
      this.updateFinishSequence(delta)
    } else if (this.raceCourse.isFinished()) {
      this.finish()
    }
  }

  handleInput(side) {
    if (this.state !== 'racing' || this.finishSequenceActive) return

    // Same-side paddling is a mis-stroke — it costs you
    if (side === this.lastPaddleSide) {
      this.misStroke(side)
      return
    }

    if (this.paddleCooldown > 0) {
      // Buffer inputs landing just before the cooldown expires
      if (this.paddleCooldown < RACE_CONFIG.inputBuffer) {
        this.bufferedInput = side
      }
      return
    }

    this.boat.paddle(side)

    // Flow amplifies each stroke's impulse
    this.speed += RACE_CONFIG.strokeImpulse * (1 + this.flow * RACE_CONFIG.flow.maxBonus)
    this.speed = Math.min(this.speed, RACE_CONFIG.maxSpeed)

    // Rhythm check — inter-stroke gap inside the band builds flow
    if (this.lastStrokeTime !== null) {
      const gap = this.raceTime - this.lastStrokeTime
      const [bandMin, bandMax] = RACE_CONFIG.flow.band
      if (gap >= bandMin && gap <= bandMax) {
        this.flow = Math.min(1, this.flow + RACE_CONFIG.flow.gain)
      } else {
        this.flow = Math.max(0, this.flow - RACE_CONFIG.flow.loss)
      }
    }

    this.lastStrokeTime = this.raceTime
    this.lastPaddleSide = side
    this.paddleCooldown = RACE_CONFIG.paddleCooldown

    this.raceCamera.kick('stroke')

    if (this.timingRing.active) {
      this.timingRing.judge()
    }
  }

  misStroke(side) {
    this.boat.misStroke(side)
    this.speed *= MIS_STROKE_SPEED_FACTOR
    this.flow = Math.max(0, this.flow - RACE_CONFIG.flow.loss)
    this.raceCamera.kick('bad', MIS_STROKE_SHAKE)
  }

  handleTimingInput() {
    if (this.state !== 'racing' || this.finishSequenceActive) return
    if (this.timingRing.active) {
      this.timingRing.judge()
    }
  }

  processWaveResult(quality) {
    this.events.trigger('wave-result', quality)
    this.activeWave = null

    if (quality === 'perfect') {
      this.speed += RACE_CONFIG.waves.rideImpulse + RACE_CONFIG.waves.comboStep * this.combo
      this.speed = Math.min(this.speed, RACE_CONFIG.maxSpeed)
      this.combo = Math.min(this.combo + 1, RACE_CONFIG.waves.comboCap)
      this.flow = Math.min(1, this.flow + PERFECT_FLOW_BONUS)
      this.raceCamera.kick('perfect')
      this.hud.flashPerfect()
      this.hud.popCombo(this.combo)
    } else if (quality === 'good') {
      // Combo preserved, no increment — the ride simply doesn't punish you
      this.raceCamera.kick('stroke')
    } else {
      // Swamped
      this.speed *= RACE_CONFIG.waves.swampFactor
      this.flow = 0
      this.combo = 0
      const direction = Math.random() < 0.5 ? -1 : 1
      this.boat.applyDrift(RACE_CONFIG.drift.event * direction, 1)
      this.raceCamera.kick('bad')
      this.hud.showVignette()
    }
  }

  finish() {
    this.finishSequenceActive = true
    this.finishDelay = 0
    this.finishTime = this.raceTime
    this.timeScale = SLOWMO_SCALE

    this.timingRing.hide()
    this.activeWave = null
    this.hud.hideCountdown()

    // Slow-motion camera orbit around the boat before the results card
    this.raceCamera.startFinish()
  }

  updateFinishSequence(delta) {
    // Real (unscaled) time drives the cinematic pacing
    this.finishDelay += delta

    if (this.finishDelay >= SLOWMO_DURATION && this.timeScale !== 1) {
      this.timeScale = 1
    }

    if (this.finishDelay >= FINISH_DELAY) {
      this.showResults()
    }
  }

  showResults() {
    this.state = 'results'

    const medal = this.getMedal(this.finishTime)
    this.events.trigger('finish', { time: this.finishTime, medal })
    this.hud.showResults(this.finishTime, medal)
  }

  getMedal(time) {
    const { gold, silver, bronze } = RACE_CONFIG.medals
    if (time <= gold) return 'gold'
    if (time <= silver) return 'silver'
    if (time <= bronze) return 'bronze'
    return null
  }

  retry() {
    if (this.state !== 'results') return

    this.events.trigger('retry')

    this.hud.hideResults()
    this.raceCamera.activate()
    this.resetRaceState()
    this.state = 'countdown'
  }

  exit() {
    if (this.state !== 'results') return

    this.events.trigger('exit')
    this.dispose()
  }

  onKeyDown(event) {
    if (this.state !== 'racing') return

    switch (event.key) {
      case 'a':
      case 'A':
      case 'ArrowLeft':
        this.handleInput('left')
        break
      case 'd':
      case 'D':
      case 'ArrowRight':
        this.handleInput('right')
        break
      case ' ':
      case 'Enter':
        // Stop the page from scrolling / re-triggering focused buttons
        event.preventDefault()
        this.handleTimingInput()
        break
      default:
        break
    }
  }

  onPointerDown(event) {
    if (this.state !== 'racing') return

    // While the ring is up, any tap judges the wave
    if (this.timingRing.active) {
      this.handleTimingInput()
      return
    }

    const side = event.clientX < window.innerWidth / 2 ? 'left' : 'right'
    this.handleInput(side)
  }

  dispose() {
    if (this.tickHandler) {
      this.game.ticker.events.off('tick', this.tickHandler)
      this.tickHandler = null
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler)
      this.keyHandler = null
    }
    if (this.touchHandler) {
      window.removeEventListener('pointerdown', this.touchHandler)
      this.touchHandler = null
    }

    if (this.timingRing) {
      this.timingRing.dispose()
      this.timingRing = null
    }
    if (this.hud) {
      this.hud.dispose()
      this.hud = null
    }
    if (this.waveSystem) {
      this.waveSystem.dispose()
      this.waveSystem = null
    }
    if (this.raceCourse) {
      this.raceCourse.dispose()
      this.raceCourse = null
    }
    if (this.raceCamera) {
      this.raceCamera.deactivate()
      this.raceCamera = null
    }
    this.boat = null
    this.activeWave = null

    this.game.scene.remove(this.group)
    this.group.clear()
    this.group.position.set(0, 0, 0)

    this.game.hud.show()

    this.state = 'idle'
  }
}
