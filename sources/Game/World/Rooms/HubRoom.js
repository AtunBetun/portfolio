import * as THREE from 'three'

const ACCENT = 0x00ff41
const DARK = 0x111111
const MID = 0x222222

export function buildHubProps(group) {
  buildCenterPlatform(group)
  buildFloorGrid(group)
  buildPathways(group)
  buildNamePlate(group)
  buildCornerDecor(group)
  buildAmbientParticles(group)
}

function buildCenterPlatform(group) {
  const baseGeo = new THREE.CylinderGeometry(2, 2.2, 0.15, 12)
  const baseMat = new THREE.MeshStandardMaterial({
    color: MID,
    emissive: ACCENT,
    emissiveIntensity: 0.03,
    flatShading: true
  })
  const base = new THREE.Mesh(baseGeo, baseMat)
  base.position.y = 0.08
  base.receiveShadow = true
  group.add(base)

  const ringGeo = new THREE.TorusGeometry(2.1, 0.04, 6, 24)
  const ringMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.6
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.16
  group.add(ring)

  const innerRingGeo = new THREE.TorusGeometry(1.2, 0.02, 6, 20)
  const innerRing = new THREE.Mesh(innerRingGeo, ringMat.clone())
  innerRing.material.emissiveIntensity = 0.3
  innerRing.rotation.x = -Math.PI / 2
  innerRing.position.y = 0.17
  group.add(innerRing)
}

function buildFloorGrid(group) {
  const lineMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.4
  })

  for (let i = -4; i <= 4; i += 1) {
    const hGeo = new THREE.BoxGeometry(10, 0.01, 0.02)
    const hLine = new THREE.Mesh(hGeo, lineMat)
    hLine.position.set(0, 0.01, i)
    group.add(hLine)

    const vGeo = new THREE.BoxGeometry(0.02, 0.01, 10)
    const vLine = new THREE.Mesh(vGeo, lineMat)
    vLine.position.set(i, 0.01, 0)
    group.add(vLine)
  }
}

function buildPathways(group) {
  const pathMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.6
  })

  const paths = [
    { from: [0, 0], to: [0, -4], label: 'CAREER' },
    { from: [0, 0], to: [-4, 0], label: 'STORY' },
    { from: [0, 0], to: [4, 0], label: 'PASSIONS' }
  ]

  for (const path of paths) {
    const dx = path.to[0] - path.from[0]
    const dz = path.to[1] - path.from[1]
    const length = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dx, dz)

    const stripGeo = new THREE.BoxGeometry(0.3, 0.02, length)
    const strip = new THREE.Mesh(stripGeo, pathMat)
    strip.position.set(
      (path.from[0] + path.to[0]) / 2,
      0.02,
      (path.from[1] + path.to[1]) / 2
    )
    strip.rotation.y = angle
    group.add(strip)

    const dotCount = Math.floor(length / 0.8)
    for (let i = 1; i <= dotCount; i++) {
      const t = i / (dotCount + 1)
      const dotGeo = new THREE.SphereGeometry(0.05, 6, 4)
      const dot = new THREE.Mesh(dotGeo, pathMat)
      dot.position.set(
        path.from[0] + dx * t,
        0.05,
        path.from[1] + dz * t
      )
      group.add(dot)
    }
  }
}

function buildNamePlate(group) {
  const plateGeo = new THREE.BoxGeometry(3, 0.05, 1.2)
  const plateMat = new THREE.MeshStandardMaterial({
    color: DARK,
    emissive: ACCENT,
    emissiveIntensity: 0.05,
    flatShading: true
  })
  const plate = new THREE.Mesh(plateGeo, plateMat)
  plate.position.set(0, 0.03, 3)
  group.add(plate)

  const borderGeo = new THREE.BoxGeometry(3.1, 0.06, 0.03)
  const borderMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.5
  })
  const topBorder = new THREE.Mesh(borderGeo, borderMat)
  topBorder.position.set(0, 0.06, 2.4)
  group.add(topBorder)
  const bottomBorder = new THREE.Mesh(borderGeo, borderMat)
  bottomBorder.position.set(0, 0.06, 3.6)
  group.add(bottomBorder)
}

function buildCornerDecor(group) {
  const positions = [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4]
  ]

  const hexMat = new THREE.MeshStandardMaterial({
    color: MID,
    emissive: ACCENT,
    emissiveIntensity: 0.1,
    flatShading: true
  })

  for (const [x, z] of positions) {
    const hexGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.08, 6)
    const hex = new THREE.Mesh(hexGeo, hexMat)
    hex.position.set(x, 0.04, z)
    group.add(hex)

    const dotGeo = new THREE.SphereGeometry(0.08, 6, 4)
    const dotMat = new THREE.MeshStandardMaterial({
      color: ACCENT,
      emissive: ACCENT,
      emissiveIntensity: 0.6
    })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(x, 0.12, z)
    group.add(dot)
  }

  const edgeMat = new THREE.MeshStandardMaterial({
    color: MID,
    flatShading: true
  })
  const crateGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6)
  const cratePositions = [
    [-3.5, 2],
    [3.5, 2],
    [-3.5, -2],
    [3.5, -2],
    [-2, 3.5],
    [2, 3.5],
    [-2, -3.5],
    [2, -3.5]
  ]
  for (const [x, z] of cratePositions) {
    const crate = new THREE.Mesh(crateGeo, edgeMat)
    crate.position.set(x, 0.3, z)
    crate.rotation.y = Math.random() * 0.5
    crate.castShadow = true
    group.add(crate)
  }
}

function buildAmbientParticles(group) {
  const particleMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6
  })
  const particleGeo = new THREE.SphereGeometry(0.03, 4, 3)

  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 8
    const z = (Math.random() - 0.5) * 8
    const y = 0.5 + Math.random() * 2
    const particle = new THREE.Mesh(particleGeo, particleMat)
    particle.position.set(x, y, z)
    group.add(particle)
  }
}
