import * as THREE from 'three'
import { toon } from '../../../Rendering/ToonMaterials.js'

const SPAN = 8
const HALF_SPAN = SPAN / 2
const WIDTH = 3
const ARCH = 1.0
const BRIDGE_Z = 0

export function buildBridge(group, physics) {
  const bridge = new THREE.Group()
  bridge.name = 'bridge'

  bridge.add(buildDeck())
  bridge.add(buildRail(-WIDTH / 2 + 0.1))
  bridge.add(buildRail(WIDTH / 2 - 0.1))

  if (physics) {
    addBridgeColliders(physics)
  }

  group.add(bridge)
}

function archAt(t) {
  return Math.sin(t * Math.PI) * ARCH
}

function buildDeck() {
  const geo = new THREE.BoxGeometry(SPAN, 0.15, WIDTH, 24, 1, 1)
  const positions = geo.attributes.position

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const t = (x + HALF_SPAN) / SPAN
    positions.setY(i, positions.getY(i) + archAt(t))
  }

  geo.computeVertexNormals()

  const mesh = new THREE.Mesh(geo, toon('wood'))
  mesh.position.set(0, 0.05, BRIDGE_Z)
  mesh.receiveShadow = true
  mesh.castShadow = true
  return mesh
}

function buildRail(zOffset) {
  const geo = new THREE.BoxGeometry(SPAN, 0.12, 0.08, 24, 1, 1)
  const positions = geo.attributes.position

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const t = (x + HALF_SPAN) / SPAN
    positions.setY(i, positions.getY(i) + archAt(t) + 0.45)
  }

  geo.computeVertexNormals()

  const mesh = new THREE.Mesh(geo, toon('woodDark'))
  mesh.position.set(0, 0.05, BRIDGE_Z + zOffset)
  return mesh
}

function addBridgeColliders(physics) {
  const segments = 8
  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments
    const x = -HALF_SPAN + t * SPAN
    const y = archAt(t) + 0.05

    const body = physics.createStaticBody(x, y, BRIDGE_Z)
    const desc = physics.RAPIER.ColliderDesc.cuboid(
      SPAN / segments / 2,
      0.1,
      WIDTH / 2
    ).setFriction(0.8)
    physics.createCollider(desc, body)
  }
}
