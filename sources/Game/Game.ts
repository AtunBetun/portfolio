import * as THREE from 'three'
import Ticker from './Ticker.js'
import Rendering from './Rendering.js'
import Camera from './Camera.js'
import Keyboard from './Inputs/Keyboard.js'
import Touch from './Inputs/Touch.js'
import Physics from './Physics.js'
import Player from './Player.js'
import World from './World/World.js'
import HUD from './UI/HUD.js'
import Panel from './UI/Panel.js'
import Tracker from './UI/Tracker.js'
import Controls from './UI/Controls.js'
import Loading from './UI/Loading.js'
import Debug from './Debug.js'
import { createToonLights, type ToonLights } from './Rendering/ToonLights.js'
import { createSkyDome } from './Rendering/SkyDome.js'
import Clouds from './Rendering/Clouds.js'

import * as bg from '@dimforge/rapier3d/rapier_wasm3d_bg.js'
import wasmUrl from '@dimforge/rapier3d/rapier_wasm3d_bg.wasm?url'

async function loadRapier(): Promise<typeof import('@dimforge/rapier3d')> {
  const wasmModule = await WebAssembly.compileStreaming(fetch(wasmUrl))
  const instance = await WebAssembly.instantiate(wasmModule, {
    './rapier_wasm3d_bg.js': bg
  })
  bg.__wbg_set_wasm(instance.exports)
  const RAPIER = await import('@dimforge/rapier3d')
  return RAPIER
}

export default class Game {
  static instance: Game | null = null

  static getInstance(): Game {
    return Game.instance!
  }

  loadState: 'loading' | 'ready' = 'loading'
  canvas!: HTMLCanvasElement
  scene!: THREE.Scene
  ticker!: Ticker
  debug!: Debug
  keyboard!: Keyboard
  camera!: Camera
  rendering!: Rendering
  physics: Physics | null = null
  touch!: Touch
  loading!: Loading
  hud!: HUD
  panel!: Panel
  tracker!: Tracker
  controls!: Controls
  lights: ToonLights | null = null
  clouds: Clouds | null = null
  player: Player | null = null
  world: World | null = null

  constructor() {
    if (Game.instance) return Game.instance
    Game.instance = this

    this.canvas = document.querySelector('.js-canvas') as HTMLCanvasElement
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xffe8c8)
    this.scene.fog = new THREE.FogExp2(0xffe8c8, 0.008)
  }

  async init(): Promise<void> {
    this.ticker = new Ticker()
    this.debug = new Debug()
    this.keyboard = new Keyboard()
    this.camera = new Camera()
    this.rendering = new Rendering()

    await this.rendering.init()

    this.setupLighting()

    try {
      const RAPIER = await loadRapier()
      this.physics = new Physics(RAPIER)
    } catch (err) {
      console.warn('Rapier WASM failed to load, running without physics:', (err as Error).message)
      this.physics = null
    }

    this.touch = new Touch()
    this.loading = new Loading()
    this.hud = new HUD()
    this.panel = new Panel()
    this.tracker = new Tracker()
    this.controls = new Controls()

    this.player = new Player()
    this.world = new World()

    this.hud.show()
    this.loading.hide()

    this.loadState = 'ready'
    this.debug.expose()
    this.debug.emitLoadComplete()
  }

  setupLighting(): void {
    this.lights = createToonLights(this.scene)
    const skyDome = createSkyDome()
    this.scene.add(skyDome)
    this.clouds = new Clouds()
  }
}
