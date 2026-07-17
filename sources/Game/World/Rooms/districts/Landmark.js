import * as THREE from 'three'
import { toon } from '../../../Rendering/ToonMaterials.js'
import { sampleHeight } from '../../../../../data/terrain.js'

export function buildLandmark(group, physics, grid) {
  const landmark = new THREE.Group()
  landmark.name = 'landmark'

  buildLighthouse(landmark, physics, grid)
  buildDock(landmark, physics, grid)

  group.add(landmark)
}

function groundAt(grid, x, z) {
  return grid ? sampleHeight(grid, x, z) : 0
}

function buildLighthouse(group, physics, grid) {
  const x = 8
  const z = -5
  const y = groundAt(grid, x, z)

  const towerGeo = new THREE.CylinderGeometry(0.5, 0.7, 2.5, 8)
  const tower = new THREE.Mesh(towerGeo, toon('cascoWhite'))
  tower.position.set(x, y + 1.25, z)
  tower.castShadow = true
  group.add(tower)

  const capGeo = new THREE.ConeGeometry(0.75, 0.9, 8)
  const cap = new THREE.Mesh(capGeo, toon('cascoRoof'))
  cap.position.set(x, y + 2.95, z)
  cap.castShadow = true
  group.add(cap)

  if (physics) {
    const body = physics.createStaticBody(x, y + 1.25, z)
    const desc = physics.RAPIER.ColliderDesc.cylinder(1.25, 0.7).setFriction(0.5)
    physics.createCollider(desc, body)
  }
}

// Three planks jutting west over the canal edge from the east bank
function buildDock(group, physics, grid) {
  const bankX = 4.6
  const z = 6
  const y = groundAt(grid, bankX, z) + 0.12
  const plankLen = 2.6
  const centerX = bankX - plankLen / 2

  const plankGeo = new THREE.BoxGeometry(plankLen, 0.1, 0.5)

  for (let i = -1; i <= 1; i++) {
    const plank = new THREE.Mesh(plankGeo, toon(i === 0 ? 'wood' : 'woodDark'))
    plank.position.set(centerX, y + i * 0.015, z + i * 0.55)
    plank.rotation.z = i * 0.01
    plank.castShadow = true
    plank.receiveShadow = true
    group.add(plank)
  }

  if (physics) {
    const body = physics.createStaticBody(centerX, y, z)
    const desc = physics.RAPIER.ColliderDesc.cuboid(plankLen / 2, 0.06, 0.85).setFriction(0.8)
    physics.createCollider(desc, body)
  }
}
