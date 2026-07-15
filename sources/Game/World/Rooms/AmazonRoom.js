import * as THREE from 'three'

const AMAZON_ORANGE = 0xff9900

export function buildAmazonProps(group) {
  const rackGeo = new THREE.BoxGeometry(0.4, 2.5, 0.4)
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true })

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const rack = new THREE.Mesh(rackGeo, rackMat)
      rack.position.set(-2.5 + col * 1.2, 1.25, -2 + row * 1.5)
      rack.castShadow = true
      group.add(rack)
    }
  }

  const archGeo = new THREE.TorusGeometry(1, 0.05, 8, 20, Math.PI)
  const archMat = new THREE.MeshStandardMaterial({
    color: AMAZON_ORANGE,
    emissive: AMAZON_ORANGE,
    emissiveIntensity: 0.5,
    flatShading: true
  })
  const arch = new THREE.Mesh(archGeo, archMat)
  arch.position.set(2, 1.5, 0)
  arch.rotation.x = Math.PI / 2
  group.add(arch)

  const connectionMat = new THREE.MeshStandardMaterial({
    color: AMAZON_ORANGE,
    emissive: AMAZON_ORANGE,
    emissiveIntensity: 0.3,
    flatShading: true
  })
  const positions = [
    [-1.5, 0.3, 1.5],
    [0, 0.3, 2.5],
    [1.5, 0.3, 1.5]
  ]
  const lineGeo = new THREE.CylinderGeometry(0.03, 0.03, 2, 4)
  for (let i = 0; i < positions.length - 1; i++) {
    const line = new THREE.Mesh(lineGeo, connectionMat)
    const start = positions[i]
    const end = positions[i + 1]
    line.position.set((start[0] + end[0]) / 2, 0.3, (start[2] + end[2]) / 2)
    line.rotation.z = Math.PI / 2
    line.rotation.y = Math.atan2(end[2] - start[2], end[0] - start[0])
    group.add(line)
  }

  const hubGeo = new THREE.DodecahedronGeometry(0.25, 0)
  for (const pos of positions) {
    const hub = new THREE.Mesh(hubGeo, connectionMat)
    hub.position.set(...pos)
    hub.castShadow = true
    group.add(hub)
  }
}

export function getAmazonCollectibles() {
  return [
    { id: 'amz-microservice', x: 2, z: -1, color: AMAZON_ORANGE },
    { id: 'amz-architecture', x: -2, z: 2, color: AMAZON_ORANGE }
  ]
}
