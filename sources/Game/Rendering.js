import * as THREE from 'three'
import Game from './Game.js'

export default class Rendering {
  constructor() {
    this.game = Game.getInstance()
    this.canvas = this.game.canvas
    this.scene = this.game.scene
    this.renderer = null
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.game.ticker.events.on(
      'tick',
      () => {
        this.renderer.render(this.scene, this.game.camera.instance)
      },
      998
    )

    window.addEventListener('resize', () => this.resize())

    this.game.ticker.start(this.renderer)
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }
}
