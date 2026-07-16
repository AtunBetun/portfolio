import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../Rendering/Palette.js'
import { sampleHeight } from '../../../../data/terrain.js'

export function buildHubProps(group, physics) {
  const dynamicProps = []
  const bushes = []
  const grid = physics ? physics.heightGrid : null

  buildCenterPlatform(group, physics, grid)
  buildTrees(group, physics, grid)
  buildBushes(group, bushes, grid)
  buildRocks(group, physics, grid)
  buildCrates(group, physics, dynamicProps, grid)
  buildAmbientParticles(group, grid)

  return { dynamicProps, bushes }
}

function getY(grid, x, z, offset) {
  if (!grid) return offset
  return sampleHeight(grid, x, z) + offset
}

function buildCenterPlatform(group, physics, grid) {
  const y = getY(grid, 0, 0, 0.1)
  const baseGeo = new THREE.CylinderGeometry(4, 4.3, 0.2, 16)
  const base = new THREE.Mesh(baseGeo, toon('stone'))
  base.position.y = y
  base.receiveShadow = true
  group.add(base)

  const ringGeo = new THREE.TorusGeometry(4.2, 0.08, 8, 32)
  const ring = new THREE.Mesh(ringGeo, toon('wood'))
  ring.rotation.x = -Math.PI / 2
  ring.position.y = y + 0.11
  group.add(ring)

  if (physics) {
    const body = physics.createStaticBody(0, y, 0)
    const desc = physics.RAPIER.ColliderDesc.cylinder(0.1, 4.15).setFriction(0.8)
    physics.createCollider(desc, body)
  }
}

function buildTrees(group, physics, grid) {
  const positions = [
    [-10, 6],
    [10, 6],
    [-8, -8],
    [8, -8],
    [-14, 0],
    [14, 0],
    [-12, 10],
    [12, -10]
  ]

  for (const [x, z] of positions) {
    const groundY = getY(grid, x, z, 0)
    const tree = createTree()
    tree.position.set(x, groundY, z)
    tree.rotation.y = x * z * 0.1
    group.add(tree)

    if (physics) {
      const body = physics.createStaticBody(x, groundY + 0.75, z)
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
  const leaves = new THREE.Mesh(leavesGeo, toon('grassDark'))
  leaves.position.y = 2.0
  leaves.scale.y = 0.8
  leaves.castShadow = true
  tree.add(leaves)

  const topGeo = new THREE.SphereGeometry(0.6, 5, 4)
  const top = new THREE.Mesh(topGeo, toon('grass'))
  top.position.y = 2.6
  tree.add(top)

  return tree
}

function buildBushes(group, bushes, grid) {
  const positions = [
    [-6, 4],
    [6, 4],
    [-5, -5],
    [5, -5],
    [-3, 8],
    [3, -8],
    [7, 2],
    [-7, -2]
  ]

  for (const [x, z] of positions) {
    const r = 0.5 + hashFloat(x, z) * 0.3
    const groundY = getY(grid, x, z, 0.3)
    const bushGeo = new THREE.SphereGeometry(r, 6, 5)
    const bush = new THREE.Mesh(bushGeo, toon('grassDark'))
    bush.position.set(x, groundY, z)
    bush.scale.y = 0.7
    bush.castShadow = true
    group.add(bush)

    bushes.push({ x, z, r })

    if (hashFloat(x + 7, z + 3) > 0.5) {
      const flowerGeo = new THREE.SphereGeometry(0.08, 5, 4)
      const flowerColors = [PALETTE.accent, PALETTE.letterColor, PALETTE.letterAlt]
      const flower = new THREE.Mesh(
        flowerGeo,
        toon(flowerColors[Math.floor(hashFloat(x + 1, z + 1) * 3)])
      )
      flower.position.set(x + 0.3, groundY + 0.25, z + 0.2)
      group.add(flower)
    }
  }
}

function buildRocks(group, physics, grid) {
  const positions = [
    [-4, 10],
    [4, 10],
    [-11, -5],
    [11, -5],
    [-9, 8],
    [9, -8],
    [0, -12],
    [13, 3]
  ]

  const rockGeo = new THREE.IcosahedronGeometry(0.4, 0)

  for (const [x, z] of positions) {
    const groundY = getY(grid, x, z, -0.15)
    const rock = new THREE.Mesh(rockGeo, toon('stone'))
    rock.position.set(x, groundY + 0.35, z)
    rock.rotation.set(x * 0.5, z * 0.3, x * z * 0.1)
    rock.castShadow = true
    group.add(rock)

    if (physics) {
      const body = physics.createStaticBody(x, groundY + 0.35, z)
      const desc = physics.RAPIER.ColliderDesc.ball(0.45).setFriction(0.8)
      physics.createCollider(desc, body)
    }
  }
}

function buildCrates(group, physics, dynamicProps, grid) {
  const positions = [
    [-2, 6],
    [2, 6],
    [-3, -4],
    [3, -4],
    [0, 8]
  ]

  const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)

  for (const [x, z] of positions) {
    const groundY = getY(grid, x, z, 0.4)
    const crate = new THREE.Mesh(crateGeo, toon('wood'))
    crate.position.set(x, groundY, z)
    crate.castShadow = true
    group.add(crate)

    if (physics) {
      const body = physics.createDynamicBody(x, groundY, z, {
        linearDamping: 1.2,
        angularDamping: 1.5
      })
      const desc = physics.RAPIER.ColliderDesc.cuboid(0.4, 0.4, 0.4)
        .setMass(0.5)
        .setRestitution(0.25)
        .setFriction(0.3)
      physics.createCollider(desc, body)

      crate.userData.body = body
      crate.userData.spawn = { x, y: groundY, z }
      dynamicProps.push({ body, mesh: crate })
    }
  }
}

function buildAmbientParticles(group, grid) {
  const colors = [PALETTE.accent, PALETTE.letterColor, PALETTE.letterAlt]
  const particleGeo = new THREE.SphereGeometry(0.04, 4, 3)

  for (let i = 0; i < 30; i++) {
    const x = (hashFloat(i * 7, i * 13) - 0.5) * 20
    const z = (hashFloat(i * 17, i * 23) - 0.5) * 20
    const baseOffset = 0.8 + hashFloat(i * 31, i * 37) * 3
    const groundY = getY(grid, x, z, 0)
    const y = groundY + baseOffset
    const mat = toon(colors[i % 3])
    const particle = new THREE.Mesh(particleGeo, mat)
    particle.position.set(x, y, z)
    particle.userData.baseY = y
    particle.userData.phase = hashFloat(i * 41, i * 43) * Math.PI * 2
    group.add(particle)
  }
}

function hashFloat(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0
  h = ((h ^ (h >>> 13)) * 1274126177) | 0
  h = h ^ (h >>> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}
