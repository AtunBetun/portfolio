import * as THREE from 'three'

const ACCENT = 0x00ff41

export function buildHubProps(group) {
  const platformGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 8)
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    emissive: ACCENT,
    emissiveIntensity: 0.05,
    flatShading: true
  })
  const platform = new THREE.Mesh(platformGeo, platformMat)
  platform.position.set(0, 0.05, 0)
  group.add(platform)

  const ringGeo = new THREE.TorusGeometry(1.6, 0.03, 8, 32)
  const ringMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.6,
    flatShading: true
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.12
  group.add(ring)

  const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 2, 6)
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    flatShading: true
  })
  const positions = [
    [-3, 0, -3],
    [3, 0, -3],
    [-3, 0, 3],
    [3, 0, 3]
  ]
  for (const [x, , z] of positions) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat)
    pillar.position.set(x, 1, z)
    pillar.castShadow = true
    group.add(pillar)

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshStandardMaterial({
        color: ACCENT,
        emissive: ACCENT,
        emissiveIntensity: 0.4,
        flatShading: true
      })
    )
    orb.position.set(x, 2.1, z)
    group.add(orb)
  }
}
