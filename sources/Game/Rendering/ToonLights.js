import * as THREE from 'three'
import { PALETTE } from './Palette.js'

export function createToonLights(scene) {
  const hemisphere = new THREE.HemisphereLight(PALETTE.sky, PALETTE.grass, 0.5)
  scene.add(hemisphere)

  const sun = new THREE.DirectionalLight(PALETTE.skyHorizon, 1.2)
  sun.position.set(8, 15, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 0.1
  sun.shadow.camera.far = 80
  sun.shadow.camera.left = -30
  sun.shadow.camera.right = 30
  sun.shadow.camera.top = 30
  sun.shadow.camera.bottom = -30
  scene.add(sun)

  const rim = new THREE.DirectionalLight(0xbbdefb, 0.3)
  rim.position.set(-5, 8, -10)
  scene.add(rim)

  return { hemisphere, sun, rim }
}
