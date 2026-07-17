import * as THREE from 'three'
import { toon } from '../../../Rendering/ToonMaterials.js'
import { PALETTE } from '../../../Rendering/Palette.js'
import { CAREER_CONTENT } from '../../../../../data/content-map.js'
import { sampleHeight } from '../../../../../data/terrain.js'

export function buildCareerBank(group, physics, grid) {
  const bank = new THREE.Group()
  bank.name = 'career-bank'

  const chimneyTop = buildPG(bank, physics, grid)
  buildBlackstone(bank, physics, grid)
  const flagCloth = buildAmazon(bank, physics, grid)

  group.add(bank)
  return { chimneyTop, flagCloth }
}

function groundAt(grid, x, z) {
  return grid ? sampleHeight(grid, x, z) : 0
}

function brandColor(key) {
  return parseInt(CAREER_CONTENT[key].color.slice(1), 16)
}

function addBoxCollider(physics, x, y, z, hx, hy, hz) {
  if (!physics) return
  const body = physics.createStaticBody(x, y, z)
  const desc = physics.RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.5)
  physics.createCollider(desc, body)
}

const windowPaneMat = toon(0xfff3c4, {
  emissive: 0xffdf8a,
  emissiveIntensity: 0.55,
  outline: false
})
const windowFrameMat = toon('cascoCream')

function addWindow(group, wx, wy, wz, rotY = 0) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.08), windowFrameMat)
  frame.position.set(wx, wy, wz)
  frame.rotation.y = rotY
  group.add(frame)

  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.06), windowPaneMat)
  const offset = new THREE.Vector3(0, 0, 0.03).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  pane.position.set(wx + offset.x, wy, wz + offset.z)
  pane.rotation.y = rotY
  group.add(pane)
}

function addShutters(group, wx, wy, wz, rotY = 0, color = 'cascoBlue') {
  const shutterGeo = new THREE.BoxGeometry(0.12, 0.66, 0.05)
  const mat = toon(color)

  for (const side of [-1, 1]) {
    const shutter = new THREE.Mesh(shutterGeo, mat)
    const lateral = new THREE.Vector3(side * 0.36, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotY
    )
    shutter.position.set(wx + lateral.x, wy, wz + lateral.z)
    shutter.rotation.y = rotY + side * 0.25
    group.add(shutter)
  }
}

function addAwning(group, dx, dy, dz, rotY = 0, accentColor = 'cascoTerracotta') {
  const stripeW = 0.22
  const colors = ['cascoWhite', accentColor, 'cascoWhite', accentColor]

  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(stripeW, 0.05, 0.5),
      toon(colors[i], { outline: false })
    )
    const localX = (i - 1.5) * stripeW
    const offset = new THREE.Vector3(localX, 0, 0.28).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotY
    )
    stripe.position.set(dx + offset.x, dy, dz + offset.z)
    stripe.rotation.y = rotY
    stripe.rotation.x = (15 * Math.PI) / 180
    group.add(stripe)
  }
}

function addTrimBand(group, bx, by, bz, w, d, rotY = 0) {
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.18, d + 0.06), toon('cascoCream'))
  trim.position.set(bx, by, bz)
  trim.rotation.y = rotY
  group.add(trim)
}

// P&G: tall narrow tower, tapered body, oversized tilted peak roof, chunky chimney
function buildPG(group, physics, grid) {
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

  addWindow(group, x + 0.92, y + 1.2, z, Math.PI / 2)
  addWindow(group, x + 0.92, y + 2.2, z, Math.PI / 2)
  addWindow(group, x + 0.92, y + 3.0, z, Math.PI / 2)

  addAwning(group, x, y + 1.65, z + 0.92, 0, 'cascoBlue')
  addTrimBand(group, x, y + 0.35, z, 1.8, 1.8)

  addBoxCollider(physics, x, y + h / 2, z, 0.9, h / 2, 0.9)

  return new THREE.Vector3(x + 0.7, y + h + 0.95, z + 0.4)
}

// Blackstone: squat wide slab, flat roof with parapet, settled 5° lean
function buildBlackstone(group, physics, grid) {
  const x = -6
  const z = 4
  const y = groundAt(grid, x, z)
  const h = 2.2
  const lean = (5 * Math.PI) / 180

  const bldg = new THREE.Group()
  bldg.position.set(x, 0, z)
  bldg.rotation.y = lean

  const bodyGeo = new THREE.BoxGeometry(3, h, 2.5)
  const body = new THREE.Mesh(bodyGeo, toon(brandColor('blackstone')))
  body.position.set(0, y + h / 2, 0)
  body.castShadow = true
  body.receiveShadow = true
  bldg.add(body)

  const parapetGeo = new THREE.BoxGeometry(3.3, 0.15, 2.8)
  const parapet = new THREE.Mesh(parapetGeo, toon('cascoCream'))
  parapet.position.set(0, y + h + 0.075, 0)
  parapet.castShadow = true
  bldg.add(parapet)

  const doorGeo = new THREE.BoxGeometry(0.8, 1.3, 0.1)
  const door = new THREE.Mesh(doorGeo, toon('woodDark'))
  door.position.set(0, y + 0.65, 1.28)
  bldg.add(door)

  addWindow(bldg, 1.52, y + 1.2, 0, Math.PI / 2)
  addWindow(bldg, 1.52, y + 1.2, 0.8, Math.PI / 2)
  addShutters(bldg, 1.52, y + 1.2, 0, Math.PI / 2, 'cascoMint')
  addShutters(bldg, 1.52, y + 1.2, 0.8, Math.PI / 2, 'cascoMint')
  addAwning(bldg, 0, y + 1.65, 1.28, 0, 'cascoMint')
  addTrimBand(bldg, 0, y + 0.35, 0, 3, 2.5)

  group.add(bldg)
  addBoxCollider(physics, x, y + h / 2, z, 1.6, h / 2, 1.45)
}

// Amazon: chunky medium cube, oversized hip roof, tiny flag on top
function buildAmazon(group, physics, grid) {
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

  addWindow(group, x, y + 1.3, z + 1.12, 0)
  addWindow(group, x + 0.55, y + 1.3, z + 1.12, 0)
  addShutters(group, x, y + 1.3, z + 1.12, 0, 'cascoYellow')
  addShutters(group, x + 0.55, y + 1.3, z + 1.12, 0, 'cascoYellow')
  addAwning(group, x + 1.12, y + 1.65, z, Math.PI / 2, 'cascoTerracotta')
  addTrimBand(group, x, y + 0.35, z, 2.2, 2.2)

  const { flag, cloth } = buildFlag()
  flag.position.set(x, y + h + 1.4, z)
  group.add(flag)

  addBoxCollider(physics, x, y + h / 2, z, 1.1, h / 2, 1.1)

  return cloth
}

function buildFlag() {
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

  return { flag, cloth }
}

function taperTop(boxGeo, scale) {
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
