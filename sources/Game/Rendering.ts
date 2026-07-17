import * as THREE from 'three'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import Game from './Game.js'

export default class Rendering {
  game: Game
  canvas: HTMLCanvasElement
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer | null = null
  outlineEffect: OutlineEffect | null = null

  constructor() {
    this.game = Game.getInstance()
    this.canvas = this.game.canvas
    this.scene = this.game.scene
  }

  async init(): Promise<void> {
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
    this.renderer.toneMappingExposure = 1.05

    this.outlineEffect = new OutlineEffect(this.renderer, {
      defaultThickness: 0.003,
      defaultColor: [0.1, 0.12, 0.19],
      defaultAlpha: 0.9
    })

    this.game.ticker.events.on(
      'tick',
      () => {
        this.outlineEffect!.render(this.scene, this.game.camera.instance)
      },
      998
    )

    window.addEventListener('resize', () => this.resize())

    this.game.ticker.start(this.renderer)
  }

  resize(): void {
    this.renderer!.setSize(window.innerWidth, window.innerHeight)
    this.renderer!.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }
}
