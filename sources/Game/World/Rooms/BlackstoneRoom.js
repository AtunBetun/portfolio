import * as THREE from 'three'

const BLACKSTONE_TEAL = 0x1b4d4d

export function buildBlackstoneProps(group) {
  const serverGeo = new THREE.BoxGeometry(0.6, 2, 0.6)
  const serverMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    flatShading: true
  })

  for (let i = 0; i < 3; i++) {
    const server = new THREE.Mesh(serverGeo, serverMat)
    server.position.set(-2.5 + i * 0.8, 1, -2)
    server.castShadow = true
    group.add(server)

    const ledGeo = new THREE.BoxGeometry(0.1, 0.1, 0.01)
    const ledMat = new THREE.MeshStandardMaterial({
      color: BLACKSTONE_TEAL,
      emissive: BLACKSTONE_TEAL,
      emissiveIntensity: 0.8,
      flatShading: true
    })
    const led = new THREE.Mesh(ledGeo, ledMat)
    led.position.set(-2.5 + i * 0.8, 1.5, -1.69)
    group.add(led)
  }

  const pipelineGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6)
  const pipelineMat = new THREE.MeshStandardMaterial({
    color: BLACKSTONE_TEAL,
    emissive: BLACKSTONE_TEAL,
    emissiveIntensity: 0.3,
    flatShading: true
  })
  const pipeline = new THREE.Mesh(pipelineGeo, pipelineMat)
  pipeline.rotation.z = Math.PI / 2
  pipeline.position.set(0, 0.5, 2)
  group.add(pipeline)

  const nodeGeo = new THREE.SphereGeometry(0.15, 6, 4)
  const nodeMat = new THREE.MeshStandardMaterial({
    color: BLACKSTONE_TEAL,
    emissive: BLACKSTONE_TEAL,
    emissiveIntensity: 0.5,
    flatShading: true
  })
  for (let i = 0; i < 4; i++) {
    const node = new THREE.Mesh(nodeGeo, nodeMat)
    node.position.set(-1.5 + i, 0.5, 2)
    node.castShadow = true
    group.add(node)
  }
}

export function getBlackstoneCollectibles() {
  return [
    { id: 'bs-react-app', x: 2.5, z: 0, color: BLACKSTONE_TEAL },
    { id: 'bs-data-pipeline', x: -1, z: 2, color: BLACKSTONE_TEAL }
  ]
}
