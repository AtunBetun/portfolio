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
import { createToonLights } from './Rendering/ToonLights.js'
import { createSkyDome } from './Rendering/SkyDome.js'
import Clouds from './Rendering/Clouds.js'

export default class Game {
  static instance = null

  static getInstance() {
    return Game.instance
  }

  constructor() {
    if (Game.instance) return Game.instance
    Game.instance = this

    this.loadState = 'loading'
    this.canvas = document.querySelector('.js-canvas')
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x6ec6ff)
    this.scene.fog = new THREE.Fog(0x6ec6ff, 30, 80)

    this.player = null
    this.world = null
  }

  async init() {
    this.ticker = new Ticker()
    this.debug = new Debug()
    this.keyboard = new Keyboard()
    this.camera = new Camera()
    this.rendering = new Rendering()

    await this.rendering.init()

    this.setupLighting()

    try {
      const RAPIER = await import('@dimforge/rapier3d')
      await RAPIER.init()
      this.physics = new Physics(RAPIER)
    } catch (err) {
      console.warn('Rapier WASM failed to load, running without physics:', err.message)
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

  setupLighting() {
    this.lights = createToonLights(this.scene)
    const skyDome = createSkyDome()
    this.scene.add(skyDome)
    this.clouds = new Clouds()
  }
}
