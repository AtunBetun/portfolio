import * as THREE from 'three'
import { PALETTE } from './Palette.js'

export function createSkyDome() {
  const geometry = new THREE.SphereGeometry(80, 32, 16)
  const vertexCount = geometry.attributes.position.count
  const colors = new Float32Array(vertexCount * 3)

  const stops = [
    { t: 0.0, color: new THREE.Color(PALETTE.skyHorizon) },
    { t: 0.25, color: new THREE.Color(PALETTE.skyMid1) },
    { t: 0.6, color: new THREE.Color(PALETTE.skyMid2) },
    { t: 1.0, color: new THREE.Color(PALETTE.skyZenith) }
  ]

  for (let i = 0; i < vertexCount; i++) {
    const y = geometry.attributes.position.getY(i)
    const t = Math.max(0, y / 80)
    const color = sampleGradient(stops, t)
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

function sampleGradient(stops, t) {
  if (t <= stops[0].t) return stops[0].color.clone()
  if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].color.clone()

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const segT = (t - stops[i].t) / (stops[i + 1].t - stops[i].t)
      return stops[i].color.clone().lerp(stops[i + 1].color, segT)
    }
  }

  return stops[stops.length - 1].color.clone()
}
