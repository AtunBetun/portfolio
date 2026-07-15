import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'

export default class ToonRenderPass extends Pass {
  constructor(renderer, scene, camera) {
    super()
    this.scene = scene
    this.camera = camera
    this.outlineEffect = new OutlineEffect(renderer, {
      defaultThickness: 0.003,
      defaultColor: [0, 0, 0],
      defaultAlpha: 1.0
    })
  }

  setScene(scene, camera) {
    this.scene = scene
    this.camera = camera
  }

  render(renderer, writeBuffer) {
    if (!this.scene || !this.camera) return

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
      this.outlineEffect.render(this.scene, this.camera)
    } else {
      renderer.setRenderTarget(writeBuffer)
      this.outlineEffect.render(this.scene, this.camera)
    }
  }

  setSize(width, height) {
    this.outlineEffect.setSize(width, height)
  }
}
