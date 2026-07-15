import * as THREE from 'three'

export function createToonLights(scene) {
  const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x4caf50, 0.4)
  scene.add(hemisphere)

  const sun = new THREE.DirectionalLight(0xfff8e1, 1.0)
  sun.position.set(8, 15, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 0.1
  sun.shadow.camera.far = 60
  sun.shadow.camera.left = -25
  sun.shadow.camera.right = 25
  sun.shadow.camera.top = 25
  sun.shadow.camera.bottom = -25
  scene.add(sun)

  const rim = new THREE.DirectionalLight(0xbbdefb, 0.3)
  rim.position.set(-5, 8, -10)
  scene.add(rim)

  return { hemisphere, sun, rim }
}
