import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../Rendering/Palette.js'

export function buildPGProps(group) {
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), toon('wood'))
  desk.position.set(-2, 0.4, -1)
  desk.castShadow = true
  group.add(desk)

  const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), toon('pgBlue'))
  monitor.position.set(-2, 1.2, -1)
  monitor.castShadow = true
  group.add(monitor)

  const chartPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 1), toon('white'))
  chartPanel.position.set(2.5, 0.75, 0)
  group.add(chartPanel)

  const bars = [0.6, 1.0, 0.8, 1.3]
  bars.forEach((h, i) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, 0.15), toon('pgBlue'))
    bar.position.set(2 + i * 0.3, h / 2, 2)
    bar.castShadow = true
    group.add(bar)
  })
}

export function getPGCollectibles() {
  return [
    { id: 'pg-spreadsheet', x: 2, z: -2, color: PALETTE.pgBlue },
    { id: 'pg-automation', x: -2, z: 2, color: PALETTE.pgBlue }
  ]
}
