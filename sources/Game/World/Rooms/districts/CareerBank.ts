import * as THREE from 'three'
import type Physics from '../../../Physics.js'
import { toon } from '../../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../../Rendering/Palette.js'
import { CAREER_CONTENT } from '../../../../../data/content-map.js'
import { sampleHeight } from '../../../../../data/terrain.js'

export function buildCareerBank(
  group: THREE.Group,
  physics: Physics | null,
  grid: Float32Array | null
): void {
  const bank = new THREE.Group()
  bank.name = 'career-bank'

  buildPG(bank, physics, grid)
  buildBlackstone(bank, physics, grid)
  buildAmazon(bank, physics, grid)

  group.add(bank)
}

function groundAt(grid: Float32Array | null, x: number, z: number): number {
  return grid ? sampleHeight(grid, x, z) : 0
}

function brandColor(key: string): number {
  return parseInt(CAREER_CONTENT[key].color.slice(1), 16)
}

function addBoxCollider(
  physics: Physics | null,
  x: number,
  y: number,
  z: number,
  hx: number,
  hy: number,
  hz: number
): void {
  if (!physics) return
  const body = physics.createStaticBody(x, y, z)
  const desc = physics.RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.5)
  physics.createCollider(desc, body)
}

// P&G: tall narrow tower, tapered body, oversized tilted peak roof, chunky chimney
function buildPG(group: THREE.Group, physics: Physics | null, grid: Float32Array | null): void {
  const x = -8
  const z = -3
  const y = groundAt(grid, x, z)
  const h = 3.5

  const bodyGeo = new THREE.BoxGeometry(1.8, h, 1.8)
  taperTop(bodyGeo, 0.9)
  const body = new THREE.Mesh(bodyGeo, toon(brandColor('pg')))
  body.position.set(x, y + h / 2, z)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const roofGeo = new THREE.ConeGeometry(1.6, 1.2, 4)
  const roof = new THREE.Mesh(roofGeo, toon('cascoRoof'))
  roof.position.set(x, y + h + 0.55, z)
  roof.rotation.y = Math.PI / 4
  roof.rotation.z = (3 * Math.PI) / 180
  roof.castShadow = true
  group.add(roof)

  const chimneyGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.9, 6)
  const chimney = new THREE.Mesh(chimneyGeo, toon('cascoRoofDark'))
  chimney.position.set(x + 0.7, y + h + 0.5, z + 0.4)
  chimney.castShadow = true
  group.add(chimney)

  addBoxCollider(physics, x, y + h / 2, z, 0.9, h / 2, 0.9)
}

// Blackstone: squat wide slab, flat roof with parapet, settled 5 deg lean
function buildBlackstone(
  group: THREE.Group,
  physics: Physics | null,
  grid: Float32Array | null
): void {
  const x = -6
  const z = 4
  const y = groundAt(grid, x, z)
  const h = 2.2
  const lean = (5 * Math.PI) / 180

  const bodyGeo = new THREE.BoxGeometry(3, h, 2.5)
  const body = new THREE.Mesh(bodyGeo, toon(brandColor('blackstone')))
  body.position.set(x, y + h / 2, z)
  body.rotation.y = lean
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const parapetGeo = new THREE.BoxGeometry(3.3, 0.15, 2.8)
  const parapet = new THREE.Mesh(parapetGeo, toon('cascoCream'))
  parapet.position.set(x, y + h + 0.075, z)
  parapet.rotation.y = lean
  parapet.castShadow = true
  group.add(parapet)

  const doorGeo = new THREE.BoxGeometry(0.8, 1.3, 0.1)
  const door = new THREE.Mesh(doorGeo, toon('woodDark'))
  door.position.set(x, y + 0.65, z + 1.28)
  door.rotation.y = lean
  group.add(door)

  addBoxCollider(physics, x, y + h / 2, z, 1.6, h / 2, 1.45)
}

// Amazon: chunky medium cube, oversized hip roof, tiny flag on top
function buildAmazon(group: THREE.Group, physics: Physics | null, grid: Float32Array | null): void {
  const x = -10
  const z = 6
  const y = groundAt(grid, x, z)
  const h = 2.8

  const bodyGeo = new THREE.BoxGeometry(2.2, h, 2.2)
  const body = new THREE.Mesh(bodyGeo, toon(brandColor('amazon')))
  body.position.set(x, y + h / 2, z)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const roofGeo = new THREE.ConeGeometry(2, 1.5, 4)
  const roof = new THREE.Mesh(roofGeo, toon('cascoRoofDark'))
  roof.position.set(x, y + h + 0.7, z)
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  group.add(roof)

  const flag = buildFlag()
  flag.position.set(x, y + h + 1.4, z)
  group.add(flag)

  addBoxCollider(physics, x, y + h / 2, z, 1.1, h / 2, 1.1)
}

function buildFlag(): THREE.Group {
  const flag = new THREE.Group()

  const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5)
  const pole = new THREE.Mesh(poleGeo, toon('cascoIron', { outline: false }))
  pole.position.y = 0.45
  flag.add(pole)

  const clothGeo = new THREE.PlaneGeometry(0.3, 0.2)
  const cloth = new THREE.Mesh(
    clothGeo,
    toon(PALETTE.bougainvillea, { outline: false, side: THREE.DoubleSide })
  )
  cloth.position.set(0.18, 0.75, 0)
  flag.add(cloth)

  return flag
}

function taperTop(boxGeo: THREE.BoxGeometry, scale: number): void {
  const pos = boxGeo.attributes.position
  const halfH = boxGeo.parameters.height / 2
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > halfH - 0.01) {
      pos.setX(i, pos.getX(i) * scale)
      pos.setZ(i, pos.getZ(i) * scale)
    }
  }
  boxGeo.computeVertexNormals()
}
