import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../Rendering/Palette.js'

export function buildHubProps(group, physics) {
  buildCenterPlatform(group)
  buildTrees(group)
  buildBushes(group)
  buildRocks(group, physics)
  buildCrates(group, physics)
  buildAmbientParticles(group)
  buildCREBABillboard(group)
  buildDockedCayuco(group)
}

function buildCenterPlatform(group) {
  const baseGeo = new THREE.CylinderGeometry(4, 4.3, 0.2, 16)
  const base = new THREE.Mesh(baseGeo, toon('stone'))
  base.position.y = 0.1
  base.receiveShadow = true
  group.add(base)

  const ringGeo = new THREE.TorusGeometry(4.2, 0.08, 8, 32)
  const ring = new THREE.Mesh(ringGeo, toon('wood'))
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.21
  group.add(ring)
}

function buildTrees(group) {
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
    const tree = createTree()
    tree.position.set(x, 0, z)
    tree.rotation.y = x * z * 0.1
    group.add(tree)
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

function buildBushes(group) {
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
    const bushGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 6, 5)
    const bush = new THREE.Mesh(bushGeo, toon('grassDark'))
    bush.position.set(x, 0.3, z)
    bush.scale.y = 0.7
    bush.castShadow = true
    group.add(bush)

    if (Math.random() > 0.5) {
      const flowerGeo = new THREE.SphereGeometry(0.08, 5, 4)
      const flowerColors = [PALETTE.accent, PALETTE.letterColor, PALETTE.letterAlt]
      const flower = new THREE.Mesh(flowerGeo, toon(flowerColors[Math.floor(Math.random() * 3)]))
      flower.position.set(x + 0.3, 0.55, z + 0.2)
      group.add(flower)
    }
  }
}

function buildRocks(group, physics) {
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
    const rock = new THREE.Mesh(rockGeo, toon('stone'))
    rock.position.set(x, 0.2, z)
    rock.rotation.set(x * 0.5, z * 0.3, x * z * 0.1)
    rock.castShadow = true
    group.add(rock)

    if (physics) {
      const body = physics.createStaticBody(x, 0.2, z)
      const desc = physics.RAPIER.ColliderDesc.ball(0.4).setFriction(0.5)
      physics.createCollider(desc, body)
    }
  }
}

function buildCrates(group, physics) {
  const positions = [
    [-2, 6],
    [2, 6],
    [-3, -4],
    [3, -4],
    [0, 8]
  ]

  const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)

  for (const [x, z] of positions) {
    const crate = new THREE.Mesh(crateGeo, toon('wood'))
    crate.position.set(x, 0.4, z)
    crate.castShadow = true
    group.add(crate)

    if (physics) {
      const body = physics.createDynamicBody(x, 0.4, z, {
        linearDamping: 3.0,
        angularDamping: 2.0
      })
      const desc = physics.RAPIER.ColliderDesc.cuboid(0.4, 0.4, 0.4)
        .setMass(1.5)
        .setRestitution(0.1)
        .setFriction(0.7)
      physics.createCollider(desc, body)

      crate.userData.body = body
    }
  }
}

function buildCREBABillboard(group) {
  const billboard = new THREE.Group()
  billboard.position.set(-8, 0, -12)

  const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8)
  const post = new THREE.Mesh(postGeo, toon('wood'))
  post.position.y = 1
  post.castShadow = true
  billboard.add(post)

  const boardGeo = new THREE.BoxGeometry(3, 2, 0.1)
  const board = new THREE.Mesh(boardGeo, toon('white'))
  board.position.y = 3
  board.castShadow = true
  billboard.add(board)

  // TODO(portfolio-k3u): Load CREBA logo texture when hub rework merges
  const labelGeo = new THREE.PlaneGeometry(2, 0.6)
  const label = new THREE.Mesh(labelGeo, toon('accent'))
  label.position.set(0, 3, 0.06)
  billboard.add(label)

  group.add(billboard)
}

function buildDockedCayuco(group) {
  const cayuco = new THREE.Group()
  cayuco.position.set(-6, -0.2, -13)

  const hullGeo = new THREE.CapsuleGeometry(0.15, 1.5, 4, 8)
  const hull = new THREE.Mesh(hullGeo, toon('wood'))
  hull.rotation.z = Math.PI / 2
  hull.castShadow = true
  cayuco.add(hull)

  // TODO(portfolio-k3u): Wire interaction trigger to start CayucoRace when hub has proximity detection
  const indicatorGeo = new THREE.SphereGeometry(0.15, 8, 6)
  const indicator = new THREE.Mesh(
    indicatorGeo,
    toon('accent', { transparent: true, opacity: 0.6 })
  )
  indicator.position.y = 1
  cayuco.add(indicator)

  group.add(cayuco)
}

function buildAmbientParticles(group) {
  const colors = [PALETTE.accent, PALETTE.letterColor, PALETTE.letterAlt]
  const particleGeo = new THREE.SphereGeometry(0.04, 4, 3)

  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 20
    const z = (Math.random() - 0.5) * 20
    const y = 0.8 + Math.random() * 3
    const mat = toon(colors[i % 3])
    const particle = new THREE.Mesh(particleGeo, mat)
    particle.position.set(x, y, z)
    particle.userData.baseY = y
    particle.userData.phase = Math.random() * Math.PI * 2
    group.add(particle)
  }
}
