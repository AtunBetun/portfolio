import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../Rendering/Palette.js'

export function buildHubProps(group) {
  buildCenterPlatform(group)
  buildPathways(group)
  buildNamePlate(group)
  buildCornerDecor(group)
  buildAmbientParticles(group)
}

function buildCenterPlatform(group) {
  const baseGeo = new THREE.CylinderGeometry(2, 2.2, 0.15, 12)
  const base = new THREE.Mesh(baseGeo, toon('stone'))
  base.position.y = 0.08
  base.receiveShadow = true
  group.add(base)

  const ringGeo = new THREE.TorusGeometry(2.1, 0.06, 8, 24)
  const ring = new THREE.Mesh(ringGeo, toon('wood'))
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.16
  group.add(ring)

  const innerRingGeo = new THREE.TorusGeometry(1.2, 0.03, 8, 20)
  const innerRing = new THREE.Mesh(innerRingGeo, toon('woodDark'))
  innerRing.rotation.x = -Math.PI / 2
  innerRing.position.y = 0.17
  group.add(innerRing)
}

function buildPathways(group) {
  const pathMat = toon('path')

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

    const stripGeo = new THREE.BoxGeometry(0.6, 0.03, length)
    const strip = new THREE.Mesh(stripGeo, pathMat)
    strip.position.set((path.from[0] + path.to[0]) / 2, 0.02, (path.from[1] + path.to[1]) / 2)
    strip.rotation.y = angle
    group.add(strip)

    const dotCount = Math.floor(length / 1.0)
    const dotGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8)
    const dotMat = toon('pathDark')
    for (let i = 1; i <= dotCount; i++) {
      const t = i / (dotCount + 1)
      const dot = new THREE.Mesh(dotGeo, dotMat)
      dot.position.set(path.from[0] + dx * t, 0.04, path.from[1] + dz * t)
      group.add(dot)
    }
  }
}

function buildNamePlate(group) {
  const plateGeo = new THREE.BoxGeometry(3, 0.1, 1.2)
  const plate = new THREE.Mesh(plateGeo, toon('wood'))
  plate.position.set(0, 0.05, 3)
  plate.castShadow = true
  group.add(plate)

  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6)
  const postMat = toon('woodDark')
  const leftPost = new THREE.Mesh(postGeo, postMat)
  leftPost.position.set(-1.3, 0.3, 3)
  group.add(leftPost)
  const rightPost = new THREE.Mesh(postGeo, postMat)
  rightPost.position.set(1.3, 0.3, 3)
  group.add(rightPost)
}

function buildCornerDecor(group) {
  const positions = [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4]
  ]

  for (const [x, z] of positions) {
    const bushGeo = new THREE.SphereGeometry(0.5, 6, 5)
    const bush = new THREE.Mesh(bushGeo, toon('grassDark'))
    bush.position.set(x, 0.3, z)
    bush.scale.y = 0.7
    bush.castShadow = true
    group.add(bush)

    const flowerGeo = new THREE.SphereGeometry(0.1, 5, 4)
    const flowerColors = [PALETTE.passionsPink, PALETTE.accent, PALETTE.pgBlue]
    const flower = new THREE.Mesh(flowerGeo, toon(flowerColors[Math.floor(Math.abs(x + z)) % 3]))
    flower.position.set(x + 0.3, 0.6, z + 0.2)
    group.add(flower)
  }

  const rockGeo = new THREE.IcosahedronGeometry(0.3, 0)
  const rockMat = toon('stone')
  const rockPositions = [
    [-3.5, 2],
    [3.5, 2],
    [-3.5, -2],
    [3.5, -2],
    [-2, 3.5],
    [2, 3.5],
    [-2, -3.5],
    [2, -3.5]
  ]
  for (const [x, z] of rockPositions) {
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.set(x, 0.15, z)
    rock.rotation.y = (x * 7 + z * 13) % 6
    rock.castShadow = true
    group.add(rock)
  }
}

function buildAmbientParticles(group) {
  const colors = [PALETTE.accent, PALETTE.passionsPink, PALETTE.pgBlue]
  const particleGeo = new THREE.SphereGeometry(0.04, 4, 3)

  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 8
    const z = (Math.random() - 0.5) * 8
    const y = 0.5 + Math.random() * 2
    const mat = toon(colors[i % 3])
    const particle = new THREE.Mesh(particleGeo, mat)
    particle.position.set(x, y, z)
    group.add(particle)
  }
}
