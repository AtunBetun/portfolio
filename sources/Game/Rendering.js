import * as THREE from 'three'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import Game from './Game.js'

export default class Rendering {
  constructor() {
    this.game = Game.getInstance()
    this.canvas = this.game.canvas
    this.scene = this.game.scene
    this.renderer = null
    this.outlineEffect = null
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    this.outlineEffect = new OutlineEffect(this.renderer, {
      defaultThickness: 0.003,
      defaultColor: [0, 0, 0],
      defaultAlpha: 1.0
    })

    this.game.ticker.events.on(
      'tick',
      () => {
        this.outlineEffect.render(this.scene, this.game.camera.instance)
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
