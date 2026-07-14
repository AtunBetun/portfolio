import * as THREE from 'three'
import Game from '../Game.js'
import Door from './Door.js'

export default class Room {
  constructor(config) {
    this.game = Game.getInstance()
    this.config = config
    this.id = config.id
    this.name = config.name
    this.group = new THREE.Group()
    this.doors = []
    this.collectibles = []
    this.interactives = []

    this.buildGeometry()
    this.buildDoors()
  }

  buildGeometry() {
    const { width, depth } = this.config.size

    const floorGeo = new THREE.PlaneGeometry(width, depth)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.group.add(floor)

    this.buildWalls(width, depth)
  }

  buildWalls(width, depth) {
    const wallHeight = 1.5
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      flatShading: true
    })

    const walls = [
      { pos: [0, wallHeight / 2, -depth / 2], size: [width, wallHeight, 0.2] },
      { pos: [0, wallHeight / 2, depth / 2], size: [width, wallHeight, 0.2] },
      { pos: [-width / 2, wallHeight / 2, 0], size: [0.2, wallHeight, depth] },
      { pos: [width / 2, wallHeight / 2, 0], size: [0.2, wallHeight, depth] }
    ]

    for (const w of walls) {
      const geo = new THREE.BoxGeometry(...w.size)
      const mesh = new THREE.Mesh(geo, wallMat)
      mesh.position.set(...w.pos)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.group.add(mesh)
    }
  }

  buildDoors() {
    for (const doorConfig of this.config.doors) {
      const door = new Door(doorConfig, this)
      this.doors.push(door)
      this.group.add(door.group)
    }
  }

  show() {
    this.game.scene.add(this.group)
  }

  hide() {
    this.game.scene.remove(this.group)
  }

  getSpawn() {
    return this.config.spawn
  }

  checkDoorCollisions(playerPos) {
    for (const door of this.doors) {
      if (door.isPlayerNear(playerPos)) {
        return door
      }
    }
    return null
  }
}
