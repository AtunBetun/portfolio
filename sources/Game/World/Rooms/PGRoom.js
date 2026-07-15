import * as THREE from 'three'

const PG_BLUE = 0x003da5

export function buildPGProps(group) {
  const deskGeo = new THREE.BoxGeometry(2, 0.8, 1)
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, flatShading: true })
  const desk = new THREE.Mesh(deskGeo, deskMat)
  desk.position.set(-2, 0.4, -1)
  desk.castShadow = true
  group.add(desk)

  const monitorGeo = new THREE.BoxGeometry(1.2, 0.8, 0.05)
  const monitorMat = new THREE.MeshStandardMaterial({
    color: PG_BLUE,
    emissive: PG_BLUE,
    emissiveIntensity: 0.3,
    flatShading: true
  })
  const monitor = new THREE.Mesh(monitorGeo, monitorMat)
  monitor.position.set(-2, 1.2, -1)
  monitor.castShadow = true
  group.add(monitor)

  const chartGeo = new THREE.BoxGeometry(0.05, 1.5, 1)
  const chartMat = new THREE.MeshStandardMaterial({
    color: PG_BLUE,
    emissive: PG_BLUE,
    emissiveIntensity: 0.2,
    flatShading: true
  })
  const chart = new THREE.Mesh(chartGeo, chartMat)
  chart.position.set(2.5, 0.75, 0)
  group.add(chart)

  const bars = [0.6, 1.0, 0.8, 1.3]
  bars.forEach((h, i) => {
    const barGeo = new THREE.BoxGeometry(0.15, h, 0.15)
    const barMat = new THREE.MeshStandardMaterial({
      color: PG_BLUE,
      emissive: PG_BLUE,
      emissiveIntensity: 0.4,
      flatShading: true
    })
    const bar = new THREE.Mesh(barGeo, barMat)
    bar.position.set(2 + i * 0.3, h / 2, 2)
    bar.castShadow = true
    group.add(bar)
  })
}

export function getPGCollectibles() {
  return [
    { id: 'pg-spreadsheet', x: 2, z: -2, color: PG_BLUE },
    { id: 'pg-automation', x: -2, z: 2, color: PG_BLUE }
  ]
}
