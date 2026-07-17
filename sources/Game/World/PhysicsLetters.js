import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import Game from '../Game.js'
import { toon } from '../Rendering/ToonMaterials.js'
import { PALETTE } from '../Rendering/Palette.js'
import { WORLD_LAYOUT } from '../../../data/rooms.js'

export default class PhysicsLetters {
  constructor(group) {
    this.game = Game.getInstance()
    this.group = group
    this.letters = []
    this.bodies = []
    this.loaded = false
  }

  async load() {
    const loader = new FontLoader()
    const fontUrl = new URL('three/examples/fonts/helvetiker_bold.typeface.json', import.meta.url)
      .href

    return new Promise((resolve) => {
      loader.load(fontUrl, (font) => {
        this.buildLetters(font)
        this.loaded = true
        resolve()
      })
    })
  }

  buildLetters(font) {
    const text = 'ALBERTO DE SAINT MALO'
    const size = 1.0
    const depth = 0.35
    const spacing = 0.15
    const colors = [PALETTE.letterColor, PALETTE.letterAlt]

    const tempGeos = []
    let totalWidth = 0
    for (const char of text) {
      if (char === ' ') {
        tempGeos.push(null)
        totalWidth += size * 0.5
        continue
      }
      const geo = new TextGeometry(char, {
        font,
        size,
        depth,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 2,
        curveSegments: 4
      })
      geo.computeBoundingBox()
      const w = geo.boundingBox.max.x - geo.boundingBox.min.x
      tempGeos.push({ geo, width: w })
      totalWidth += w + spacing
    }

    let x = -totalWidth / 2
    let colorIdx = 0

    for (const entry of tempGeos) {
      if (!entry) {
        x += size * 0.5
        continue
      }

      const { geo, width } = entry
      const mat = toon(colors[colorIdx % 2])
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true

      const dropHeight = 3 + Math.random() * 2
      mesh.position.set(x, dropHeight, 0)
      this.group.add(mesh)

      if (this.game.physics) {
        this.createLetterBody(geo, mesh, x, dropHeight, colorIdx)
      }

      this.letters.push(mesh)
      x += width + spacing
      colorIdx++
    }
  }

  createLetterBody(geo, mesh, x, y) {
    const physics = this.game.physics
    const RAPIER = physics.RAPIER

    const body = physics.createDynamicBody(x, y, 0, {
      linearDamping: 2.5,
      angularDamping: 2.0
    })

    const positions = geo.attributes.position.array
    const points = new Float32Array(positions.length)
    for (let i = 0; i < positions.length; i++) {
      points[i] = positions[i]
    }

    let colliderDesc = RAPIER.ColliderDesc.convexHull(points)
    if (!colliderDesc) {
      geo.computeBoundingBox()
      const bb = geo.boundingBox
      const hx = (bb.max.x - bb.min.x) / 2
      const hy = (bb.max.y - bb.min.y) / 2
      const hz = (bb.max.z - bb.min.z) / 2
      colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
    }

    colliderDesc.setMass(2.0).setRestitution(0.2).setFriction(0.6)
    physics.createCollider(colliderDesc, body)

    mesh.userData.spawn = { x, y, z: 0 }
    this.bodies.push({ body, mesh })
  }

  update() {
    for (const { body, mesh } of this.bodies) {
      const pos = body.translation()
      const rot = body.rotation()
      mesh.position.set(pos.x, pos.y, pos.z)
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
      if (pos.y < WORLD_LAYOUT.killPlaneY) {
        body.setTranslation(mesh.userData.spawn, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }
  }
}
