import * as THREE from 'three'
import { PALETTE } from './Palette.js'

export function createToonLights(scene) {
  const hemisphere = new THREE.HemisphereLight(PALETTE.sky, PALETTE.grass, 0.6)
  scene.add(hemisphere)

  const sun = new THREE.DirectionalLight(PALETTE.sunlight, 1.6)
  sun.position.set(10, 12, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  sun.shadow.camera.near = 0.1
  sun.shadow.camera.far = 80
  sun.shadow.camera.left = -25
  sun.shadow.camera.right = 25
  sun.shadow.camera.top = 25
  sun.shadow.camera.bottom = -25
  sun.shadow.bias = -0.001
  scene.add(sun)

  const rim = new THREE.DirectionalLight(0x99ccff, 0.3)
  rim.position.set(-5, 8, -10)
  scene.add(rim)

  return { hemisphere, sun, rim }
}
