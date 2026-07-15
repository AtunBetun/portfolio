import * as THREE from 'three'
import { toon } from '../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../Rendering/Palette.js'

export function buildBlackstoneProps(group) {
  const serverGeo = new THREE.BoxGeometry(0.6, 2, 0.6)
  const serverMat = toon('stoneDark')

  for (let i = 0; i < 3; i++) {
    const server = new THREE.Mesh(serverGeo, serverMat)
    server.position.set(-2.5 + i * 0.8, 1, -2)
    server.castShadow = true
    group.add(server)

    const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.01), toon('blackstoneTeal'))
    led.position.set(-2.5 + i * 0.8, 1.5, -1.69)
    group.add(led)
  }

  const pipeline = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 3, 8),
    toon('blackstoneTeal')
  )
  pipeline.rotation.z = Math.PI / 2
  pipeline.position.set(0, 0.5, 2)
  group.add(pipeline)

  const nodeGeo = new THREE.SphereGeometry(0.18, 8, 6)
  const nodeMat = toon('blackstoneTeal')
  for (let i = 0; i < 4; i++) {
    const node = new THREE.Mesh(nodeGeo, nodeMat)
    node.position.set(-1.5 + i, 0.5, 2)
    node.castShadow = true
    group.add(node)
  }
}

export function getBlackstoneCollectibles() {
  return [
    { id: 'bs-react-app', x: 2.5, z: 0, color: PALETTE.blackstoneTeal },
    { id: 'bs-data-pipeline', x: -1, z: 2, color: PALETTE.blackstoneTeal }
  ]
}
