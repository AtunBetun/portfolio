import * as THREE from 'three'
import type RAPIER_NS from '@dimforge/rapier3d'
import Game from '../Game.js'
import PhysicsLetters from './PhysicsLetters.js'
import Water from './Water.js'
import DustPuff from './DustPuff.js'
import Collectible from './Collectible.js'
import { WORLD_LAYOUT } from '../../../data/rooms.js'
import { buildPanamaHub } from './Rooms/PanamaHub.js'
import { createCanalWater } from '../Rendering/CanalWater.js'
import { TERRAIN, terrainHeight } from '../../../data/terrain.js'
import { PALETTE } from '../Rendering/Palette.js'
import type { BushEntry } from '../Player.js'

interface DynamicProp {
  body: RAPIER_NS.RigidBody
  mesh: THREE.Mesh
}

export default class World {
  game: Game
  group: THREE.Group = new THREE.Group()
  collectibles: Collectible[] = []
  activeRoomId: string = 'hub'
  collectiblesCollected: number = 0
  totalCollectibles: number = 0
  dynamicProps: DynamicProp[] = []
  bushes: BushEntry[] = []
  physicsLetters: PhysicsLetters
  water: Water
  dustPuff: DustPuff
  canalWaterMaterial!: THREE.ShaderMaterial

  constructor() {
    this.game = Game.getInstance()

    this.buildTerrain()
    buildPanamaHub(this.group, this.game.physics)

    this.physicsLetters = new PhysicsLetters(this.group)
    this.physicsLetters.load()

    this.water = new Water(this.group)
    this.buildCanalWater()
    this.dustPuff = new DustPuff(this.group)

    this.game.scene.add(this.group)
    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 5)
  }

  buildTerrain(): void {
    const size = TERRAIN.size
    const res = TERRAIN.res
    const geo = new THREE.PlaneGeometry(size, size, res, res)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      positions[i + 1] = terrainHeight(x, z)
    }
    geo.attributes.position.needsUpdate = true

    const nonIndexed = geo.toNonIndexed()
    nonIndexed.computeVertexNormals()

    const normals = nonIndexed.attributes.normal.array as Float32Array
    const verts = nonIndexed.attributes.position.array as Float32Array
    const vertCount = verts.length / 3
    const colors = new Float32Array(vertCount * 3)

    const grassCol = new THREE.Color(PALETTE.grass)
    const grassDarkCol = new THREE.Color(PALETTE.grassDark)
    const sandCol = new THREE.Color(PALETTE.sand)
    const oceanDeepCol = new THREE.Color(PALETTE.oceanDeep)
    const stoneDarkCol = new THREE.Color(PALETTE.stoneDark)
    const cobbleCol = new THREE.Color(PALETTE.cascoCobble)
    const cosThreshold = Math.cos((22 * Math.PI) / 180)
    const canal = TERRAIN.canal
    const bankEdge = canal.halfWidth + canal.edgeSmooth

    for (let i = 0; i < vertCount; i++) {
      const x = verts[i * 3]
      const h = verts[i * 3 + 1]
      const z = verts[i * 3 + 2]
      const ny = normals[i * 3 + 1]
      const inCanalStrip = Math.abs(z) < canal.zEnd + 2
      let col: THREE.Color

      if (inCanalStrip && Math.abs(x) < canal.halfWidth && h <= canal.bedY + 0.15) {
        col = stoneDarkCol
      } else if (inCanalStrip && Math.abs(x) < bankEdge + 1 && h > -0.15) {
        col = cobbleCol
      } else if (h <= -1.2) {
        col = oceanDeepCol
      } else if (h > -0.15) {
        col = ny > cosThreshold ? grassCol : grassDarkCol
      } else {
        col = sandCol
      }

      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }

    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.MeshToonMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(nonIndexed, mat)
    mesh.receiveShadow = true
    this.group.add(mesh)
  }

  buildCanalWater(): void {
    const canal = TERRAIN.canal
    const { mesh, material } = createCanalWater(
      -canal.halfWidth,
      canal.halfWidth,
      -canal.zEnd,
      canal.zEnd,
      TERRAIN.waterY + 0.08
    )
    this.canalWaterMaterial = material
    this.group.add(mesh)
  }

  enterRoom(roomId: string): void {
    if (roomId === 'hub') {
      const spawn = WORLD_LAYOUT.playerSpawn
      this.game.player!.teleport(spawn.x, spawn.y, spawn.z)
      this.activeRoomId = 'hub'
    }
  }

  update(elapsed: number): void {
    const playerPos = this.game.player!.mesh.position

    for (const c of this.collectibles) {
      c.update(elapsed)
      c.checkPickup(playerPos)
    }

    for (const { body, mesh } of this.dynamicProps) {
      const p = body.translation()
      const q = body.rotation()
      mesh.position.set(p.x, p.y, p.z)
      mesh.quaternion.set(q.x, q.y, q.z, q.w)
      if (p.y < WORLD_LAYOUT.killPlaneY) {
        body.setTranslation(mesh.userData.spawn, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }

    if (this.physicsLetters.loaded) {
      this.physicsLetters.update()
    }

    this.water.update(elapsed)
    this.canalWaterMaterial.uniforms.uTime.value = elapsed
  }
}
