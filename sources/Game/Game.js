import * as THREE from 'three'
import Ticker from './Ticker.js'
import Rendering from './Rendering.js'
import Camera from './Camera.js'
import Keyboard from './Inputs/Keyboard.js'
import Physics from './Physics.js'
import Player from './Player.js'
import Debug from './Debug.js'

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
    this.scene.background = new THREE.Color(0x0a0a0a)

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

    this.player = new Player()

    this.loadState = 'ready'
    this.debug.expose()
    this.debug.emitLoadComplete()

    const loading = document.querySelector('.js-loading')
    const loadingBar = document.querySelector('.js-loading-bar')
    if (loadingBar) loadingBar.style.width = '100%'
    setTimeout(() => {
      if (loading) loading.classList.add('is-hidden')
    }, 300)
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(5, 10, 5)
    directional.castShadow = true
    directional.shadow.mapSize.set(1024, 1024)
    directional.shadow.camera.near = 0.1
    directional.shadow.camera.far = 50
    directional.shadow.camera.left = -15
    directional.shadow.camera.right = 15
    directional.shadow.camera.top = 15
    directional.shadow.camera.bottom = -15
    this.scene.add(directional)
  }
}
