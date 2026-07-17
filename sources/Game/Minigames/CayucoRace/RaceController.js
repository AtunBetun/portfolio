import * as THREE from 'three'
import Game from '../../Game.js'
import Events from '../../Events.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'
import Boat from './Boat.js'
import WaveSystem from './WaveSystem.js'
import RaceCourse from './RaceCourse.js'
import RaceHUD from './RaceHUD.js'
import RaceCamera from './RaceCamera.js'
import RhythmTracker from './logic/RhythmTracker.js'
import { efficiency, rampFactor } from './logic/PaddleModel.js'
import StaminaModel from './logic/StaminaModel.js'
import SurfLogic from './logic/SurfLogic.js'
import ActTrack from './logic/ActTrack.js'
import RaceAudio from './audio/RaceAudio.js'

const TICK_ORDER = 8
const COUNTDOWN_SECONDS = 3
const GO_DISPLAY_DURATION = 0.6
const COURSE_HEADING = Math.PI
const RACE_GROUP_POSITION = new THREE.Vector3(0, -0.4, -25)
const SLOWMO_SCALE = 0.25
const SLOWMO_DURATION = 0.6
const FINISH_DELAY = 1.8

export class CayucoRace {
  constructor(game) {
    this.game = game || Game.getInstance()
    this.events = new Events()

    this.state = 'idle'
    this.group = new THREE.Group()

    this.boat = null
    this.waveSystem = null
    this.raceCourse = null
    this.hud = null
    this.raceCamera = null
    this.audio = null

    this.raceTime = 0
    this.finishTime = 0

    // Momentum — the controller owns the physics, the boat just moves
    this.speed = 0

    // Tempo core — rolling BPM vs. the act's zone drives stroke power
    this.tracker = new RhythmTracker(RACE_CONFIG.rhythm)
    this.stamina = new StaminaModel(RACE_CONFIG.stamina)
    this.actTrack = new ActTrack(RACE_CONFIG.acts)

    // Surge-to-surf swells
    this.nextSurfIndex = 0
    this.activeSurf = null
    this.activeSurfWave = null

    // Input — hold-based catch-and-release. One stroke at a time.
    this.stroke = null // { side, holdT, mult, weak, pointerId }  (pointerId null = keyboard)
    this.recovery = 0
    this.bufferedCatch = null

    this.timeScale = 1

    this.countdownElapsed = 0
    this.lastCountdownNumber = null

    this.finishSequenceActive = false
    this.finishDelay = 0

    this.tickHandler = null
    this.keyHandler = null
    this.keyUpHandler = null
    this.touchHandler = null
    this.pointerUpHandler = null
    this.blurHandler = null
    this.originalFog = null
  }

  on(event, callback) {
    this.events.on(event, callback)
  }

  getBoatWorldPos() {
    return this.boat.position.clone().add(this.group.position)
  }

  get currentAct() {
    return this.actTrack.current
  }

  start() {
    if (this.state !== 'idle') return

    this.boat = new Boat(this.group)
    this.waveSystem = new WaveSystem(this.group)
    this.raceCourse = new RaceCourse(this.group)
    this.hud = new RaceHUD()
    this.raceCamera = new RaceCamera()
    this.audio = new RaceAudio(RACE_CONFIG.audio)

    this.hud.onRetry = () => this.retry()
    this.hud.onExit = () => this.exit()
    this.hud.onMuteToggle = () => this.audio.toggleMuted()
    this.hud.setMuted(this.audio.muted)

    // Out over the ocean, not the hub origin
    this.group.position.copy(RACE_GROUP_POSITION)
    this.game.scene.add(this.group)

    this.tickHandler = (delta) => this.tick(delta)
    this.game.ticker.events.on('tick', this.tickHandler, TICK_ORDER)

    this.keyHandler = (event) => this.onKeyDown(event)
    window.addEventListener('keydown', this.keyHandler)
    this.keyUpHandler = (event) => this.onKeyUp(event)
    window.addEventListener('keyup', this.keyUpHandler)

    this.touchHandler = (event) => this.onPointerDown(event)
    window.addEventListener('pointerdown', this.touchHandler)
    this.pointerUpHandler = (event) => this.onPointerUp(event)
    window.addEventListener('pointerup', this.pointerUpHandler)
    window.addEventListener('pointercancel', this.pointerUpHandler)

    // Lost focus can swallow keyup — force-release so the paddle never sticks
    this.blurHandler = () => this.onBlur()
    window.addEventListener('blur', this.blurHandler)

    // Longer view for the open ocean — restored on dispose
    const fog = this.game.scene.fog
    if (fog) {
      this.originalFog = { near: fog.near, far: fog.far }
      fog.near = 60
      fog.far = 260
    }

    // Camera enters countdown fly-in mode on activation
    this.raceCamera.activate()

    this.game.hud.hide()
    this.hud.show()

    this.resetRaceState()
    this.state = 'countdown'

    this.audio.unlock()
    this.audio.startDrum(this.currentAct.drumBpm)
  }

  resetRaceState() {
    this.boat.reset()
    this.boat.heading = COURSE_HEADING
    this.boat.speed = 0
    this.waveSystem.reset()
    this.raceCourse.reset()
    this.raceCamera.reset()

    this.raceTime = 0
    this.finishTime = 0
    this.speed = 0

    this.tracker.reset()
    this.stamina.reset()
    this.actTrack.reset()

    this.nextSurfIndex = 0
    this.activeSurf = null
    this.activeSurfWave = null

    this.stroke = null
    this.recovery = 0
    this.bufferedCatch = null

    this.timeScale = 1

    this.countdownElapsed = 0
    this.lastCountdownNumber = null

    this.finishSequenceActive = false
    this.finishDelay = 0
    this.controlsHidden = false

    const act = this.currentAct
    this.waveSystem.setPhase(act.seaPhase)
    this.raceCamera.setPhase(act.seaPhase)

    this.hud.updateTimer(0)
    this.hud.updateProgress(0)
    this.hud.updateTempo(0, act.bpmZone, false)
    this.hud.updateStamina(1, false)
    this.hud.hideTelegraph()

    if (this.audio) {
      this.audio.setDrumBpm(act.drumBpm)
      this.audio.setAct(this.actTrack.index)
      this.audio.setInZone(false)
      this.audio.setSurfState('off')
    }
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
        this.hud.showActBanner(this.currentAct.name, this.currentAct.hint)
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

      // Fade out controls hint after 4 seconds
      if (this.raceTime > 4 && !this.controlsHidden) {
        this.controlsHidden = true
        this.hud.hideControls()
      }

      // Tempo + stamina tick — gated off during the finish so warped time
      // never leaks into the BPM measurement
      this.tracker.update(this.raceTime)
      this.stamina.update(dt, this.tracker.bpm, this.staminaZone())
    }

    // Drive — while the paddle is held it pulls water: quick bite (applied at
    // catch), a ramp to full grip, then a stall so holding forever never wins.
    if (this.stroke && !this.finishSequenceActive) {
      const s = RACE_CONFIG.stroke
      this.stroke.holdT += dt
      this.speed += s.thrustPerSec * rampFactor(this.stroke.holdT, s) * this.stroke.mult * dt
      if (this.stroke.holdT >= s.maxHold) this.releaseStroke()
    }

    const surfing = this.activeSurf?.surfing === true

    if (surfing) {
      // The wave carries the boat — speed is driven toward the surf target
      const surfCfg = RACE_CONFIG.surf
      this.speed = THREE.MathUtils.damp(this.speed, surfCfg.surfSpeed, surfCfg.damp, dt)
      this.speed = THREE.MathUtils.clamp(this.speed, 0, surfCfg.surfMaxSpeed)
    } else {
      // Drag — exponential decay, act-scaled (headwind = heavier water)
      const dragHalfLife = RACE_CONFIG.dragHalfLife * this.currentAct.dragMult
      this.speed *= Math.pow(0.5, dt / dragHalfLife)
      this.speed = THREE.MathUtils.clamp(this.speed, 0, RACE_CONFIG.maxSpeed)
    }

    // The boat moves at whatever speed the controller decides
    this.boat.speed = this.speed
    this.boat.applyDrift(this.waveSystem.getWindDrift(), dt)
    this.boat.update(dt, (x, z) => this.waveSystem.getHeightAt(x, z))

    this.waveSystem.update(dt, this.boat.position.z)

    this.raceCourse.updateProgress(this.boat.position)
    this.raceCourse.updateBuoys(this.boat.position.z, (x, z) => this.waveSystem.getHeightAt(x, z))
    const progress = this.raceCourse.getProgress()

    this.updateAct(progress)
    this.updateSurf(dt, progress)

    const waveHeight = this.waveSystem.getHeightAt(this.boat.position.x, this.boat.position.z)
    this.raceCamera.setSurfing(surfing)
    this.raceCamera.update(dt, this.getBoatWorldPos(), this.boat.heading, waveHeight, this.speed)

    const act = this.currentAct
    const bpm = this.tracker.bpm
    const inZone = bpm >= act.bpmZone[0] && bpm <= act.bpmZone[1]

    this.hud.updateTimer(this.finishSequenceActive ? this.finishTime : this.raceTime)
    this.hud.updateProgress(progress)
    this.hud.updateTempo(bpm, act.bpmZone, inZone, this.stamina.fatigued)
    this.hud.updateStamina(this.stamina.value, this.stamina.fatigued)

    this.audio.setInZone(inZone && !this.finishSequenceActive)

    if (this.speed > RACE_CONFIG.maxSpeed * 0.8) {
      this.hud.showSpeedlines()
    } else {
      this.hud.hideSpeedlines()
    }

    // Post-release lockout — a catch pressed during recovery fires the frame
    // it expires (input buffer)
    if (this.recovery > 0) {
      this.recovery = Math.max(0, this.recovery - dt)
      if (this.recovery === 0 && this.bufferedCatch) {
        const side = this.bufferedCatch
        this.bufferedCatch = null
        this.beginCatch(side)
      }
    }

    if (this.finishSequenceActive) {
      this.updateFinishSequence(delta)
    } else if (this.raceCourse.isFinished()) {
      this.finish()
    }
  }

  // While a swell is inbound, surging must not be punished — the drain
  // ceiling stretches to cover the surge zone.
  staminaZone() {
    const act = this.currentAct
    if (act.surf && this.activeSurf?.telegraphActive) {
      return [act.bpmZone[0], Math.max(act.bpmZone[1], act.surf.surgeZone[1])]
    }
    return act.bpmZone
  }

  updateAct(progress) {
    const { changed, act } = this.actTrack.update(progress)
    if (!changed) return

    this.waveSystem.setPhase(act.seaPhase)
    this.raceCamera.setPhase(act.seaPhase)
    this.hud.showActBanner(act.name, act.hint)
    this.hud.moveTempoZone(act.bpmZone)
    this.audio.setDrumBpm(act.drumBpm)
    this.audio.setAct(this.actTrack.index)
    this.audio.playStinger()
    this.events.trigger('act-change', act)
  }

  updateSurf(dt, progress) {
    const act = this.currentAct

    // Spawn the next scheduled swell of the wave act
    if (act.surf && this.nextSurfIndex < act.surf.schedule.length && !this.activeSurf) {
      if (progress >= act.surf.schedule[this.nextSurfIndex] - 0.04) {
        this.nextSurfIndex += 1
        this.activeSurfWave = this.waveSystem.spawnEventWave(this.boat.position.z)
        this.activeSurf = new SurfLogic(RACE_CONFIG.surf, act.surf.surgeZone)
      }
    }

    if (!this.activeSurf) return

    const wave = this.activeSurfWave
    const waveDistance = wave && wave.active ? wave.z - this.boat.position.z : -Infinity
    const wasSurfing = this.activeSurf.surfing

    this.activeSurf.update(dt, { waveDistance, bpm: this.tracker.bpm })

    if (this.activeSurf.surfing && !wasSurfing) {
      // Caught it!
      this.raceCamera.kick('surf')
      this.hud.flashPerfect()
      this.hud.showTelegraph('surfing')
      this.boat.setSurfing(true)
      this.audio.setSurfState('surfing')
      this.audio.playCatch()
      this.events.trigger('wave-caught')
    } else if (this.activeSurf.telegraphActive) {
      const distance = Math.abs(waveDistance)
      if (distance <= RACE_CONFIG.surf.telegraphDistance) {
        this.hud.showTelegraph('incoming')
        this.audio.setSurfState('approach')
      }
    }

    if (this.activeSurf.done) {
      if (this.activeSurf.result === 'missed') {
        this.events.trigger('wave-missed')
      }
      this.boat.setSurfing(false)
      this.hud.hideTelegraph()
      this.audio.setSurfState('off')
      this.activeSurf = null
      this.activeSurfWave = null
    }
  }

  // Catch — the paddle plants in the water. This timestamp is the "stroke"
  // the rhythm tracker measures. Stroke quality (tempo × stamina) is sampled
  // once here and reused for the whole hold.
  beginCatch(side, pointerId = null) {
    if (this.state !== 'racing' || this.finishSequenceActive) return

    // Mid-hold press on the other side supersedes — fast alternation overlaps
    if (this.stroke) {
      if (this.stroke.side === side) return
      this.releaseStroke()
    }

    // Post-release lockout — buffer the catch so it fires when recovery ends
    if (this.recovery > 0) {
      this.bufferedCatch = side
      return
    }

    const { alternated } = this.tracker.recordStroke(this.raceTime, side)
    this.stamina.onStroke({ alternated })

    const weak = this.stamina.fatigued

    // Stroke power = base × act character × tempo efficiency × stamina form.
    // The first few strokes are grace — the launch is never punished.
    const act = this.currentAct
    const graced = this.tracker.strokeCount <= RACE_CONFIG.rhythm.graceStrokes
    const eff = graced ? 1 : efficiency(this.tracker.bpm, act.bpmZone, RACE_CONFIG.rhythm)
    const mult = act.impulseMult * eff * this.stamina.strokeFactor()

    this.stroke = { side, holdT: 0, mult, weak, pointerId }

    this.speed += RACE_CONFIG.stroke.biteImpulse * mult
    const cap = this.activeSurf?.surfing ? RACE_CONFIG.surf.surfMaxSpeed : RACE_CONFIG.maxSpeed
    this.speed = Math.min(this.speed, cap)

    this.boat.plantPaddle(side, { weak })
    this.raceCamera.kick('stroke')
    this.audio.playSplash(weak)
  }

  // Release — blade exits. A clean release inside the hold window earns a
  // small bonus. Safe to call anytime (no state guard) so blur/finish can use it.
  releaseStroke() {
    if (!this.stroke) return

    const s = RACE_CONFIG.stroke
    const holdT = this.stroke.holdT
    if (holdT >= s.cleanWindow[0] && holdT <= s.cleanWindow[1]) {
      this.speed += s.cleanBonus * this.stroke.mult
    }

    this.boat.releasePaddle()
    this.recovery = s.recovery
    this.stroke = null
  }

  finish() {
    this.finishSequenceActive = true
    this.finishDelay = 0
    this.finishTime = this.raceTime
    this.timeScale = SLOWMO_SCALE

    // Lift the paddle out before the cinematic
    this.releaseStroke()
    this.bufferedCatch = null

    this.hud.hideCountdown()
    this.hud.hideTelegraph()
    this.audio.stopDrum()
    this.audio.setInZone(false)
    this.audio.setSurfState('off')

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
    this.audio.startDrum(this.currentAct.drumBpm)
  }

  exit() {
    if (this.state !== 'results') return

    this.events.trigger('exit')
    this.dispose()
  }

  keySide(key) {
    if (key === 'a' || key === 'A' || key === 'ArrowLeft') return 'left'
    if (key === 'd' || key === 'D' || key === 'ArrowRight') return 'right'
    return null
  }

  onKeyDown(event) {
    if (this.state !== 'racing') return
    // Held keys auto-repeat at ~30Hz — the OS repeat is not a new catch
    if (event.repeat) return

    const side = this.keySide(event.key)
    if (!side) return

    this.audio.unlock()
    this.beginCatch(side)
  }

  onKeyUp(event) {
    const side = this.keySide(event.key)
    if (!side) return
    // Only release if this key owns the active (keyboard) stroke
    if (this.stroke && this.stroke.pointerId === null && this.stroke.side === side) {
      this.releaseStroke()
    }
  }

  onPointerDown(event) {
    if (this.state !== 'racing') return

    this.audio.unlock()

    const side = event.clientX < window.innerWidth / 2 ? 'left' : 'right'
    this.beginCatch(side, event.pointerId)
  }

  onPointerUp(event) {
    if (this.stroke && this.stroke.pointerId === event.pointerId) {
      this.releaseStroke()
    }
  }

  onBlur() {
    this.releaseStroke()
    this.bufferedCatch = null
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
    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler)
      this.keyUpHandler = null
    }
    if (this.touchHandler) {
      window.removeEventListener('pointerdown', this.touchHandler)
      this.touchHandler = null
    }
    if (this.pointerUpHandler) {
      window.removeEventListener('pointerup', this.pointerUpHandler)
      window.removeEventListener('pointercancel', this.pointerUpHandler)
      this.pointerUpHandler = null
    }
    if (this.blurHandler) {
      window.removeEventListener('blur', this.blurHandler)
      this.blurHandler = null
    }
    if (this.originalFog && this.game.scene.fog) {
      this.game.scene.fog.near = this.originalFog.near
      this.game.scene.fog.far = this.originalFog.far
      this.originalFog = null
    }

    if (this.audio) {
      this.audio.dispose()
      this.audio = null
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
    this.activeSurf = null
    this.activeSurfWave = null

    this.game.scene.remove(this.group)
    this.group.clear()
    this.group.position.set(0, 0, 0)

    this.game.hud.show()

    this.state = 'idle'
  }
}
