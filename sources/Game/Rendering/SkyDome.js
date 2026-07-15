import * as THREE from 'three'
import { PALETTE } from './Palette.js'

export function createSkyDome() {
  const geometry = new THREE.SphereGeometry(80, 32, 16)
  const vertexCount = geometry.attributes.position.count
  const colors = new Float32Array(vertexCount * 3)
  const topColor = new THREE.Color(PALETTE.sky)
  const bottomColor = new THREE.Color(PALETTE.skyHorizon)

  for (let i = 0; i < vertexCount; i++) {
    const y = geometry.attributes.position.getY(i)
    const t = Math.max(0, y / 80)
    const color = bottomColor.clone().lerp(topColor, t)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false
  })

  const dome = new THREE.Mesh(geometry, material)
  dome.renderOrder = -1
  return dome
}
