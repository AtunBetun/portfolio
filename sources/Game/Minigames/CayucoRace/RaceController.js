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
const PADDLE_COOLDOWN = 0.15
const COUNTDOWN_SECONDS = 3
const GO_DISPLAY_DURATION = 0.6
const COURSE_HEADING = Math.PI

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
    this.countdownElapsed = 0
    this.lastCountdownNumber = null
    this.ringElapsed = 0

    this.tickHandler = null
    this.keyHandler = null
    this.touchHandler = null

    this.lastPaddleSide = 'right'
    this.paddleCooldown = 0
  }

  on(event, callback) {
    this.events.on(event, callback)
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

    this.game.scene.add(this.group)

    this.tickHandler = (delta) => this.tick(delta)
    this.game.ticker.events.on('tick', this.tickHandler, TICK_ORDER)

    this.keyHandler = (event) => this.onKeyDown(event)
    window.addEventListener('keydown', this.keyHandler)

    this.touchHandler = (event) => this.onPointerDown(event)
    window.addEventListener('pointerdown', this.touchHandler)

    this.raceCamera.activate()
    this.game.hud.hide()
    this.hud.show()

    this.resetRaceState()
    this.state = 'countdown'
    this.countdown()
  }

  countdown() {
    this.countdownElapsed = 0
    this.lastCountdownNumber = null
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
        this.startRacing()
      }
    }

    // Keep the camera settled on the boat during the countdown
    this.raceCamera.update(
      delta,
      this.boat.position,
      this.boat.heading,
      this.waveSystem.getHeightAt(this.boat.position.x, this.boat.position.z)
    )
  }

  startRacing() {
    this.state = 'racing'
    this.raceTime = 0
    this.boat.speed = RACE_CONFIG.paddleBaseSpeed
  }

  handleInput(side) {
    if (this.state !== 'racing') return
    if (this.paddleCooldown > 0) return
    if (this.lastPaddleSide === side) return

    this.boat.paddle(side)
    this.lastPaddleSide = side
    this.paddleCooldown = PADDLE_COOLDOWN

    if (this.timingRing.active) {
      this.timingRing.judge()
    }
  }

  handleTimingInput() {
    if (this.state !== 'racing') return
    if (this.timingRing.active) {
      this.timingRing.judge()
    }
  }

  updateRacing(delta) {
    this.raceTime += delta
    this.paddleCooldown = Math.max(0, this.paddleCooldown - delta)

    // Hide the GO! banner shortly after the race begins
    if (this.raceTime > GO_DISPLAY_DURATION && this.lastCountdownNumber !== null) {
      this.hud.hideCountdown()
      this.lastCountdownNumber = null
    }

    const waveHeight = this.waveSystem.getHeightAt(this.boat.position.x, this.boat.position.z)

    this.boat.applyDrift(this.waveSystem.getAmbientDrift(this.raceTime), delta)
    this.boat.update(delta, waveHeight)

    this.waveSystem.setPhase(this.raceCourse.getPhase())
    this.waveSystem.update(delta, this.boat.position.z)

    // Show the timing ring when an event wave closes in on the boat
    const nearWave = this.waveSystem.checkEventWaveNear(this.boat.position.z)
    if (nearWave && !nearWave.ringTriggered && !this.timingRing.active) {
      nearWave.ringTriggered = true
      this.ringElapsed = 0
      this.timingRing.show((quality) => this.processWaveResult(quality))
    }

    if (this.timingRing.active) {
      this.ringElapsed += delta
      this.timingRing.update(this.ringElapsed)
    }

    this.raceCourse.updateProgress(this.boat.position)

    this.raceCamera.update(delta, this.boat.position, this.boat.heading, waveHeight)

    this.hud.updateTimer(this.raceTime)
    this.hud.updateProgress(this.raceCourse.getProgress())

    if (this.raceCourse.isFinished()) {
      this.finish()
    }
  }

  processWaveResult(quality) {
    this.events.trigger('wave-result', quality)

    let multiplier = 1.0
    if (quality === 'perfect') multiplier = RACE_CONFIG.perfectBoost
    if (quality === 'bad') multiplier = RACE_CONFIG.badPenalty

    this.boat.speed = RACE_CONFIG.paddleBaseSpeed * multiplier

    if (quality === 'bad') {
      const direction = Math.random() < 0.5 ? -1 : 1
      this.boat.applyDrift(RACE_CONFIG.drift.event * direction, 1)
    }
  }

  finish() {
    this.state = 'results'
    this.timingRing.hide()
    this.hud.hideCountdown()

    const medal = this.getMedal(this.raceTime)
    this.events.trigger('finish', { time: this.raceTime, medal })

    this.hud.showResults(this.raceTime, medal)
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
    this.resetRaceState()

    this.state = 'countdown'
    this.countdown()
  }

  exit() {
    if (this.state !== 'results') return

    this.events.trigger('exit')
    this.dispose()
  }

  resetRaceState() {
    this.boat.reset()
    this.boat.heading = COURSE_HEADING
    this.waveSystem.reset()
    this.raceCourse.reset()
    this.raceCamera.reset()
    this.timingRing.hide()

    this.raceTime = 0
    this.ringElapsed = 0
    this.lastPaddleSide = 'right'
    this.paddleCooldown = 0

    this.hud.updateTimer(0)
    this.hud.updateProgress(0)
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
        event.preventDefault()
        this.handleTimingInput()
        break
      default:
        break
    }
  }

  onPointerDown(event) {
    if (this.state !== 'racing') return

    // During a timing ring, either side of the screen judges the wave
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

    this.game.scene.remove(this.group)
    this.group.clear()

    this.game.hud.show()

    this.state = 'idle'
  }
}
