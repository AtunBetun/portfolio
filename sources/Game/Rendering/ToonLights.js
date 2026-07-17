import * as THREE from 'three'

export function createToonLights(scene) {
  const hemisphere = new THREE.HemisphereLight(0xfff2dd, 0x6b7fae, 0.45)
  scene.add(hemisphere)

  const sun = new THREE.DirectionalLight(0xffe0b0, 2.2)
  sun.position.set(-40, 25, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 0.1
  sun.shadow.camera.far = 120
  sun.shadow.camera.left = -70
  sun.shadow.camera.right = 70
  sun.shadow.camera.top = 50
  sun.shadow.camera.bottom = -50
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.02
  scene.add(sun)
  scene.add(sun.target)

  const fill = new THREE.DirectionalLight(0x8fa8d8, 0.5)
  fill.position.set(30, 15, -25)
  fill.castShadow = false
  scene.add(fill)

  return { hemisphere, sun, fill }
}
