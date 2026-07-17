import * as THREE from 'three'
import { toon } from '../../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../../Rendering/Palette.js'
import { sampleHeight } from '../../../../../data/terrain.js'

const TREE_POSITIONS = [
  [-13, -1],
  [-12, 9],
  [-6, -8],
  [-14, 4],
  [12, 2],
  [7, 10],
  [13, -9],
  [10, 12],
  [-11, -11],
  [-14, -14]
]

const PALM_POSITIONS = [
  [-4.5, -6],
  [-4.8, 8],
  [4.5, -8],
  [4.8, 10],
  [5.2, 3],
  [-5, -12]
]

const BUSH_POSITIONS = [
  [-7, 0],
  [-9, -6],
  [-5, 6.5],
  [-12, 2],
  [6, 6],
  [9, -2],
  [11, 5],
  [7, -9]
]

const ROCK_POSITIONS = [
  [-6, 12],
  [10, 8],
  [-13, -5],
  [12, -4],
  [4, -13],
  [-4, 13],
  [14, 1]
]

const CRATE_POSITIONS = [
  [5.5, 5],
  [6.3, 5.8],
  [5.8, 6.8]
]

export function buildFlora(group, physics, grid) {
  const dynamicProps = []
  const bushes = []
  const palmFronds = []

  buildTrees(group, physics, grid)
  buildPalms(group, physics, grid, palmFronds)
  buildBushes(group, bushes, grid)
  buildRocks(group, physics, grid)
  buildCrates(group, physics, dynamicProps, grid)
  const sparkles = buildSparkles(group, grid)

  return { dynamicProps, bushes, palmFronds, sparkles }
}

function groundAt(grid, x, z) {
  return grid ? sampleHeight(grid, x, z) : 0
}

function hashFloat(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0
  h = ((h ^ (h >>> 13)) * 1274126177) | 0
  h = h ^ (h >>> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

function buildTrees(group, physics, grid) {
  for (const [x, z] of TREE_POSITIONS) {
    const y = groundAt(grid, x, z)
    const tree = createTree()
    tree.position.set(x, y, z)
    tree.rotation.y = hashFloat(x * 7, z * 13) * Math.PI * 2
    group.add(tree)

    if (physics) {
      const body = physics.createStaticBody(x, y + 0.75, z)
      const desc = physics.RAPIER.ColliderDesc.cylinder(0.75, 0.3).setFriction(0)
      physics.createCollider(desc, body)
    }
  }
}

function createTree() {
  const tree = new THREE.Group()

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6)
  const trunk = new THREE.Mesh(trunkGeo, toon('wood'))
  trunk.position.y = 0.75
  trunk.castShadow = true
  tree.add(trunk)

  const leavesGeo = new THREE.SphereGeometry(1.0, 6, 5)
  const leaves = new THREE.Mesh(leavesGeo, toon('grassDark', { outlineTier: 'foliage' }))
  leaves.position.y = 2.0
  leaves.scale.y = 0.8
  leaves.castShadow = true
  tree.add(leaves)

  const topGeo = new THREE.SphereGeometry(0.6, 5, 4)
  const top = new THREE.Mesh(topGeo, toon('grass', { outlineTier: 'foliage' }))
  top.position.y = 2.6
  tree.add(top)

  return tree
}

function buildPalms(group, physics, grid, palmFronds) {
  for (const [x, z] of PALM_POSITIONS) {
    const y = groundAt(grid, x, z)
    const { palm, frondGroup } = createPalm()
    palm.position.set(x, y, z)
    palm.rotation.y = hashFloat(x * 5, z * 3) * Math.PI * 2
    group.add(palm)

    palmFronds.push({ group: frondGroup, phase: hashFloat(x * 11, z * 17) * Math.PI * 2 })

    if (physics) {
      const body = physics.createStaticBody(x, y + 0.9, z)
      const desc = physics.RAPIER.ColliderDesc.cylinder(0.9, 0.22).setFriction(0)
      physics.createCollider(desc, body)
    }
  }
}

function createPalm() {
  const palm = new THREE.Group()
  const segH = 0.7
  const segments = 4
  let cumX = 0
  let cumY = 0
  const tilt = (6 * Math.PI) / 180

  for (let i = 0; i < segments; i++) {
    const rTop = 0.12 - i * 0.012
    const rBot = 0.16 - i * 0.01
    const segGeo = new THREE.CylinderGeometry(rTop, rBot, segH, 5)
    const seg = new THREE.Mesh(segGeo, toon('palmTrunk'))
    seg.castShadow = true

    cumY += segH / 2
    seg.position.set(cumX, cumY, 0)
    seg.rotation.z = tilt * i
    cumY += segH / 2
    cumX += 0.08
    palm.add(seg)
  }

  const frondGroup = new THREE.Group()
  frondGroup.position.set(cumX, cumY, 0)

  const frondCount = 5
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2
    const frondGeo = new THREE.ConeGeometry(0.09, 1.6, 4)
    const frond = new THREE.Mesh(frondGeo, toon('palmFrond', { outlineTier: 'foliage' }))
    frond.scale.set(1, 1, 0.28)
    frond.rotation.z = -Math.PI / 2 - 0.6
    frond.rotation.y = angle
    frond.castShadow = true
    frondGroup.add(frond)
  }

  const coconutGeo = new THREE.SphereGeometry(0.09, 5, 4)
  const coconutMat = toon('wood', { outline: false })
  for (let i = 0; i < 2; i++) {
    const nut = new THREE.Mesh(coconutGeo, coconutMat)
    nut.position.set(0.1 * (i === 0 ? 1 : -1), -0.15, 0.08 * (i === 0 ? 1 : -1))
    frondGroup.add(nut)
  }

  palm.add(frondGroup)
  return { palm, frondGroup }
}

function buildBushes(group, bushes, grid) {
  const flowerColors = [PALETTE.bougainvillea, PALETTE.bougainvilleaLight, PALETTE.cascoYellow]

  for (const [x, z] of BUSH_POSITIONS) {
    const r = 0.5 + hashFloat(x, z) * 0.3
    const y = groundAt(grid, x, z) + 0.3
    const bushGeo = new THREE.SphereGeometry(r, 6, 5)
    const bush = new THREE.Mesh(bushGeo, toon('grassDark', { outlineTier: 'foliage' }))
    bush.position.set(x, y, z)
    bush.scale.y = 0.7
    bush.castShadow = true
    group.add(bush)

    bushes.push({ x, z, r })

    if (hashFloat(x + 7, z + 3) > 0.4) {
      const flowerGeo = new THREE.SphereGeometry(0.08, 5, 4)
      const flower = new THREE.Mesh(
        flowerGeo,
        toon(flowerColors[Math.floor(hashFloat(x + 1, z + 1) * 3)], { outline: false })
      )
      flower.position.set(x + 0.3, y + 0.2, z + 0.2)
      group.add(flower)
    }
  }
}

function buildRocks(group, physics, grid) {
  const rockGeo = new THREE.IcosahedronGeometry(0.4, 0)

  for (const [x, z] of ROCK_POSITIONS) {
    const y = groundAt(grid, x, z)
    const rock = new THREE.Mesh(rockGeo, toon('stone'))
    rock.position.set(x, y + 0.35, z)
    rock.rotation.set(x * 0.5, z * 0.3, x * z * 0.1)
    rock.castShadow = true
    group.add(rock)

    if (physics) {
      const body = physics.createStaticBody(x, y + 0.35, z)
      const desc = physics.RAPIER.ColliderDesc.ball(0.45).setFriction(0.8)
      physics.createCollider(desc, body)
    }
  }
}

function buildCrates(group, physics, dynamicProps, grid) {
  const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)

  for (const [x, z] of CRATE_POSITIONS) {
    const y = groundAt(grid, x, z) + 0.4
    const crate = new THREE.Mesh(crateGeo, toon('wood'))
    crate.position.set(x, y, z)
    crate.castShadow = true
    group.add(crate)

    if (physics) {
      const body = physics.createDynamicBody(x, y, z, {
        linearDamping: 1.2,
        angularDamping: 1.5
      })
      const desc = physics.RAPIER.ColliderDesc.cuboid(0.4, 0.4, 0.4)
        .setMass(0.5)
        .setRestitution(0.25)
        .setFriction(0.3)
      physics.createCollider(desc, body)

      crate.userData.body = body
      crate.userData.spawn = { x, y, z }
      dynamicProps.push({ body, mesh: crate })
    }
  }
}

function buildSparkles(group, grid) {
  const colors = [PALETTE.bougainvillea, PALETTE.cascoYellow, PALETTE.canalTeal]
  const particleGeo = new THREE.SphereGeometry(0.04, 4, 3)
  const sparkles = []

  for (let i = 0; i < 24; i++) {
    const x = (hashFloat(i * 7, i * 13) - 0.5) * 28
    if (Math.abs(x) < 3) continue
    const z = (hashFloat(i * 17, i * 23) - 0.5) * 28
    const baseOffset = 0.8 + hashFloat(i * 31, i * 37) * 3
    const y = groundAt(grid, x, z) + baseOffset
    const mat = toon(colors[i % 3], { outline: false })
    const particle = new THREE.Mesh(particleGeo, mat)
    particle.position.set(x, y, z)
    group.add(particle)
    sparkles.push({ mesh: particle, phase: hashFloat(i * 41, i * 43) * Math.PI * 2 })
  }

  return sparkles
}
